import { Request, Response } from 'express';
import { storage } from '../storage';
import { InsertManufacturingSchedule } from '@shared/schema';

/**
 * Safely parse a date string to avoid octal literal errors with leading zeros
 * When JavaScript parses date strings with formats like "05/08/2023", 
 * the leading zero can cause the value to be interpreted as an octal literal in strict mode
 * This function safely handles those cases
 */
function parseDateSafely(dateString: string): Date {
  if (!dateString) {
    throw new Error('Date string is empty or undefined');
  }
  
  // Handle standard ISO format
  if (dateString.includes('T') || dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return new Date(dateString);
  }
  
  // Handle MM/DD/YYYY format with potential leading zeros
  if (dateString.includes('/')) {
    const parts = dateString.split('/');
    if (parts.length === 3) {
      // Extract parts ensuring no octal interpretation
      const month = parseInt(parts[0], 10);
      const day = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      
      // Validate ranges
      if (month < 1 || month > 12) throw new Error(`Invalid month: ${month}`);
      if (day < 1 || day > 31) throw new Error(`Invalid day: ${day}`);
      if (year < 2000 || year > 2100) throw new Error(`Invalid year: ${year}`);
      
      // Create date using numeric values (month is 0-based in JavaScript)
      return new Date(year, month - 1, day);
    }
  }
  
  // Last resort: try direct parsing
  const result = new Date(dateString);
  if (isNaN(result.getTime())) {
    throw new Error(`Unable to parse date: ${dateString}`);
  }
  
  return result;
}

// Interface for bay scheduling import data from the frontend
/**
 * Interface representing the data structure for bay scheduling import
 * Required fields:
 *   - projectNumber: The unique identifier for the project
 *   - endDate: The scheduled ship/completion date for the project
 * Optional fields:
 *   - productionStartDate: When production starts; will be calculated from endDate and totalHours if missing
 *   - teamNumber: The manufacturing bay/team assigned to the project; if missing, project stays unassigned
 *   - totalHours: The total labor hours for the project; updates master project data if provided
 *   - row: The specific row within the bay where the project should be placed
 */
interface BaySchedulingImportData {
  projectNumber: string;            // Must match existing project number exactly
  productionStartDate?: string;     // Optional; will be calculated from endDate if not provided
  endDate: string;                  // Required - maps to shipDate in master project data
  teamNumber?: number;              // Optional; projects without teamNumber remain unassigned
  totalHours?: number;              // Optional; updates project total hours if provided
  row?: number;                     // Optional; specific row within the bay (explicit vertical position)
}

/**
 * Handles the import of bay scheduling data from a CSV file
 * This function takes project numbers, dates, and team assignments
 * and creates manufacturing schedules with appropriate department allocations
 */
export async function importBayScheduling(req: Request, res: Response) {
  try {
    const { schedules } = req.body;
    console.log("Received bay scheduling data for import:", schedules?.length || 0, "items");
    
    if (!Array.isArray(schedules) || schedules.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid bay scheduling data. Expected an array of schedules.' 
      });
    }

    const results = {
      imported: 0,
      errors: 0,
      details: [] as string[],
      skipped: 0
    };
    
    // Helper function to format dates consistently throughout the import
    const formatDateForDB = (date: Date): string => {
      return date.toISOString().split('T')[0]; // Store only the date part (YYYY-MM-DD)
    };

    // Get all projects and bays for reference
    const allProjects = await storage.getProjects();
    const allBays = await storage.getManufacturingBays();

    // Process each schedule
    for (const scheduleData of schedules) {
      try {
        // Validate required fields
        if (!scheduleData.projectNumber || !scheduleData.endDate) {
          results.errors++;
          results.details.push(`Missing required fields for schedule: ${JSON.stringify(scheduleData)}`);
          continue;
        }
        
        // If teamNumber is missing, skip this project (leave it in the unassigned section)
        if (!scheduleData.teamNumber) {
          console.log(`Project ${scheduleData.projectNumber} has no teamNumber, keeping in unassigned section`);
          results.skipped++;
          continue;
        }

        // Find the corresponding project
        const project = allProjects.find(p => 
          p.projectNumber === scheduleData.projectNumber
        );

        if (!project) {
          results.errors++;
          results.details.push(`Project not found with number: ${scheduleData.projectNumber}`);
          continue;
        }
        
        // Find the manufacturing bay/team first
        const bay = allBays.find(b => b.bayNumber === scheduleData.teamNumber);
        if (!bay) {
          results.errors++;
          results.details.push(`Manufacturing bay/team not found with number: ${scheduleData.teamNumber}`);
          continue;
        }

        // Update project master data with information from import
        try {
          const projectUpdates: any = {};
          
          // Update totalHours if provided
          if (scheduleData.totalHours && scheduleData.totalHours > 0) {
            projectUpdates.totalHours = scheduleData.totalHours;
          }
          
          // Update team assignment based on bay number
          // Always set the team field to match the teamNumber from the import
          // This is critical for proper bay assignment display
          projectUpdates.team = `${scheduleData.teamNumber}`;
          
          console.log(`Setting project ${project.projectNumber} team to "${scheduleData.teamNumber}" based on teamNumber in import`);
          
          // Update dates:
          // - endDate maps to shipDate
          // - productionStartDate maps to assemblyStart
          // Parse dates now to ensure they're valid before updating project
          const endDate = parseDateSafely(scheduleData.endDate);
          projectUpdates.shipDate = endDate.toISOString();
          
          if (scheduleData.productionStartDate) {
            const startDate = parseDateSafely(scheduleData.productionStartDate);
            projectUpdates.assemblyStart = startDate.toISOString();
          }
          
          // Update project record with all changes
          await storage.updateProject(project.id, projectUpdates);
          console.log(`Updated project ${project.projectNumber} master data with import information`);
        } catch (error) {
          console.error(`Error updating project ${project.projectNumber} master data:`, error);
          // Continue with import even if project update fails
        }

        // Parse dates safely to avoid octal literal errors
        let startDate: Date, endDate: Date;
        
        try {
          // Parse endDate first as it's required
          endDate = parseDateSafely(scheduleData.endDate);
          
          // Handle missing productionStartDate by calculating it based on endDate and total hours
          if (!scheduleData.productionStartDate) {
            console.log(`No productionStartDate provided for project ${scheduleData.projectNumber}, calculating based on endDate`);
            
            // Get total hours (from import, project record, or default)
            const totalProjectHours = scheduleData.totalHours || project.totalHours || 1000;
            
            // Determine the bay capacity to calculate project duration
            // Try to get staff count and hours from the bay, use defaults if not available
            const assemblyStaffCount = bay.assemblyStaffCount || 4;
            const electricalStaffCount = bay.electricalStaffCount || 4;
            const hoursPerPersonPerWeek = bay.hoursPerPersonPerWeek || 32;
            
            // Calculate total hours per week for this bay (total staff × hours per week)
            const hoursPerWeek = (assemblyStaffCount + electricalStaffCount) * hoursPerPersonPerWeek;
            
            // Calculate project duration in weeks and days, ensuring we don't divide by zero
            const durationInWeeks = hoursPerWeek > 0 ? totalProjectHours / hoursPerWeek : totalProjectHours / 32;
            const durationInDays = Math.ceil(durationInWeeks * 5); // 5 working days per week
            
            // Calculate startDate by subtracting duration from endDate
            const tempStartDate = new Date(endDate);
            tempStartDate.setDate(tempStartDate.getDate() - durationInDays);
            startDate = tempStartDate;
            
            console.log(`Calculated productionStartDate for project ${scheduleData.projectNumber}:`, {
              totalHours: totalProjectHours,
              staffCount: assemblyStaffCount + electricalStaffCount,
              hoursPerWeek,
              durationInWeeks,
              durationInDays,
              startDate: startDate.toISOString()
            });
          } else {
            // Normal case where productionStartDate is provided
            startDate = parseDateSafely(scheduleData.productionStartDate);
          }
          
          // Verify that parsing was successful
          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            throw new Error("Date parsing resulted in invalid dates");
          }
        } catch (error) {
          results.errors++;
          results.details.push(`Invalid date format for project ${scheduleData.projectNumber}: ${error.message}`);
          continue;
        }

        // Clear any existing schedules for this project first
        // This ensures we fully overwrite existing schedule data on each import
        const existingSchedules = await storage.getProjectManufacturingSchedules(project.id);
        
        // Find if this project already exists in ANY bay
        const existingInAnyBay = existingSchedules.find(s => s.projectId === project.id);
        if (existingInAnyBay) {
          console.log(`Found existing schedule for project ${project.projectNumber}, will overwrite with new data`);
          // Delete existing schedule
          await storage.deleteManufacturingSchedule(existingInAnyBay.id);
          console.log(`Deleted existing schedule ${existingInAnyBay.id} for project ${project.projectNumber}`);
        }
        
        // Now create a fresh schedule for this project in the specified bay
        // Find if this project already has a specific schedule in THIS bay (unlikely after delete, but check anyway)
        const existingInBay = existingSchedules.find(s => s.bayId === bay.id && s.projectId === project.id);
        
        if (existingInBay) {
          // Calculate department dates if not already set
          let fabricationStartDate = existingInBay.fabricationStart ? new Date(existingInBay.fabricationStart) : null;
          let assemblyStartDate = existingInBay.assemblyStart ? new Date(existingInBay.assemblyStart) : null;
          let ntcTestingStartDate = existingInBay.ntcTestingStart ? new Date(existingInBay.ntcTestingStart) : null;
          let qcStartDate = existingInBay.qcStart ? new Date(existingInBay.qcStart) : null;
          
          // If any phase dates are missing, calculate them
          if (!fabricationStartDate || !assemblyStartDate || !ntcTestingStartDate || !qcStartDate) {
            // Calculate department dates based on percentages
            const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            
            // Get department percentages from the project (or use defaults)
            const fabricationPercent = project.fabricationPercent || 15;
            const assemblyPercent = project.assemblyPercent || 65;
            const testingPercent = project.testingPercent || 20;
            
            // Safe way to subtract days to avoid octal literal issues
            const subtractDays = (date: Date, days: number): Date => {
              const result = new Date(date.getTime());
              result.setDate(result.getDate() - days);
              return result;
            };
            
            const addDays = (date: Date, days: number): Date => {
              const result = new Date(date.getTime());
              result.setDate(result.getDate() + days);
              return result;
            };
            
            // Calculate department start dates if not already set
            if (!fabricationStartDate) {
              const fabricationDays = Math.ceil((totalDays * fabricationPercent) / 100);
              fabricationStartDate = subtractDays(startDate, fabricationDays);
            }
            
            if (!assemblyStartDate) {
              assemblyStartDate = new Date(startDate.getTime());
            }
            
            if (!ntcTestingStartDate) {
              const assemblyDays = Math.ceil((totalDays * assemblyPercent) / 100);
              ntcTestingStartDate = addDays(startDate, assemblyDays);
            }
            
            if (!qcStartDate) {
              const qcDays = project.qcDays || 5; // Default to 5 days if not specified
              qcStartDate = subtractDays(endDate, qcDays);
            }
          }
          
          // Update the existing schedule
          // Calculate department dates based on percentages if dates are missing
          const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          
          // Get department percentages from the project (or use defaults)
          const fabricationPercent = project.fabricationPercent || 15;
          const assemblyPercent = project.assemblyPercent || 65;
          const testingPercent = project.testingPercent || 20;
          
          // Recalculate all department dates based on the new start and end dates
          // This ensures that when a project's dates change, all department dates are properly updated
          
          // Safe way to subtract days to avoid octal literal issues
          const subtractDays = (date: Date, days: number): Date => {
            const result = new Date(date.getTime());
            result.setDate(result.getDate() - days);
            return result;
          };
          
          const addDays = (date: Date, days: number): Date => {
            const result = new Date(date.getTime());
            result.setDate(result.getDate() + days);
            return result;
          };
          
          // Calculate department start dates
          // Fabrication starts before the production start date based on its percentage
          const fabricationDays = Math.ceil((totalDays * fabricationPercent) / 100);
          const fabricationStart = subtractDays(startDate, fabricationDays);
          
          // Assembly starts at the production start date
          const assemblyStart = new Date(startDate.getTime());
          
          // Testing starts after assembly based on assembly percentage
          const assemblyDays = Math.ceil((totalDays * assemblyPercent) / 100);
          const ntcTestingStart = addDays(startDate, assemblyDays);
          
          // QC phase typically starts near the end
          const qcDays = project.qcDays || 5; // Default to 5 days if not specified
          const qcStart = subtractDays(endDate, qcDays);
            
          // Format dates for database storage (YYYY-MM-DD)
          // Convert all dates to proper string format (YYYY-MM-DD) for database
          const updateData = {
            startDate: startDate.toISOString().split('T')[0], // Store only the date part
            endDate: endDate.toISOString().split('T')[0], // Store only the date part
            // Use totalHours from import data if provided, otherwise keep existing value
            totalHours: scheduleData.totalHours || existingInBay.totalHours,
            status: existingInBay.status || 'scheduled',
            fabricationStart: fabricationStart.toISOString().split('T')[0],
            assemblyStart: assemblyStart.toISOString().split('T')[0],
            ntcTestingStart: ntcTestingStart.toISOString().split('T')[0],
            qcStart: qcStart.toISOString().split('T')[0]
          };
          
          // Only add properly formatted dates
          if (fabricationStartDate instanceof Date) {
            updateData.fabricationStart = fabricationStartDate.toISOString().split('T')[0];
          }
          
          if (assemblyStartDate instanceof Date) {
            updateData.assemblyStart = assemblyStartDate.toISOString().split('T')[0];
          }
          
          if (ntcTestingStartDate instanceof Date) {
            updateData.ntcTestingStart = ntcTestingStartDate.toISOString().split('T')[0];
          }
          
          if (qcStartDate instanceof Date) {
            updateData.qcStart = qcStartDate.toISOString().split('T')[0];
          }
          
          console.log(`Updating manufacturing schedule for project ${project.projectNumber} with:`, updateData);
          const updatedSchedule = await storage.updateManufacturingSchedule(existingInBay.id, updateData);
          
          if (updatedSchedule) {
            results.imported++;
            console.log(`Updated schedule for project ${project.projectNumber} in bay ${bay.bayNumber}`);
          } else {
            results.errors++;
            results.details.push(`Failed to update schedule for project ${project.projectNumber}`);
          }
        } else {
          // Calculate department dates based on percentages
          const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          
          // Get department percentages from the project (or use defaults)
          const fabricationPercent = project.fabricationPercent || 15;
          const assemblyPercent = project.assemblyPercent || 65;
          const testingPercent = project.testingPercent || 20;
          
          // Safe way to subtract days to avoid octal literal issues
          const subtractDays = (date: Date, days: number): Date => {
            const result = new Date(date.getTime());
            result.setDate(result.getDate() - days);
            return result;
          };
          
          const addDays = (date: Date, days: number): Date => {
            const result = new Date(date.getTime());
            result.setDate(result.getDate() + days);
            return result;
          };
          
          // Calculate department start dates
          // Fabrication starts before the production start date based on its percentage
          const fabricationDays = Math.ceil((totalDays * fabricationPercent) / 100);
          const fabricationStart = subtractDays(startDate, fabricationDays);
          
          // Assembly starts at the production start date
          const assemblyStart = new Date(startDate.getTime());
          
          // Testing starts after assembly based on assembly percentage
          const assemblyDays = Math.ceil((totalDays * assemblyPercent) / 100);
          const ntcTestingStart = addDays(startDate, assemblyDays);
          
          // QC phase typically starts near the end
          const qcDays = project.qcDays || 5; // Default to 5 days if not specified
          const qcStart = subtractDays(endDate, qcDays);
          
          // Find all existing schedules for this bay to determine available rows
          const baySchedules = await storage.getBayManufacturingSchedules(bay.id);
          
          // If the import data specifies a row, use that
          let row: number;
          
          if (typeof scheduleData.row === 'number' && scheduleData.row > 0) {
            // Use the explicitly provided row from import
            row = scheduleData.row;
            console.log(`Using explicit row ${row} from import data for project ${project.projectNumber}`);
          } else {
            // Otherwise determine row automatically
            
            // Determine which rows are already in use in this bay
            const usedRows = new Set(baySchedules
              .filter(s => s.projectId !== project.id) // Exclude this project's schedules
              .map(s => s.row)
              .filter(r => r !== null && r !== undefined));
            
            // Check if project already had a row in this bay before
            const existingRowInBay = baySchedules
              .find(s => s.projectId === project.id && s.bayId === bay.id)?.row;
            
            // If project already had a row in this bay, use the same row
            if (existingRowInBay) {
              row = existingRowInBay;
              console.log(`Using existing row ${row} for project ${project.projectNumber} in bay ${bay.bayNumber}`);
            } else {
              // Find the first available row starting from 1
              row = 1;
              while (usedRows.has(row)) {
                row++;
              }
              console.log(`Assigned row ${row} to project ${project.projectNumber} in bay ${bay.bayNumber}`);
            }
          }
          
          console.log(`Assigning project ${project.projectNumber} to bay ${bay.bayNumber} row ${row}`);
          
          
          // Create a new manufacturing schedule
          // Create an object with basic required fields first
          const newSchedule: InsertManufacturingSchedule = {
            projectId: project.id,
            bayId: bay.id,
            startDate: startDate.toISOString().split('T')[0], // Store only the date part
            endDate: endDate.toISOString().split('T')[0], // Store only the date part
            // Use totalHours from import data if provided, otherwise use project's totalHours or default
            totalHours: scheduleData.totalHours || project.totalHours || 1000,
            status: 'scheduled',
            row: row, // Assign the schedule to the first available row
          };
          
          // Only add properly formatted date fields
          if (fabricationStart instanceof Date) {
            newSchedule.fabricationStart = fabricationStart.toISOString().split('T')[0];
          }
          
          if (assemblyStart instanceof Date) {
            newSchedule.assemblyStart = assemblyStart.toISOString().split('T')[0];
          }
          
          if (ntcTestingStart instanceof Date) {
            newSchedule.ntcTestingStart = ntcTestingStart.toISOString().split('T')[0];
          }
          
          if (qcStart instanceof Date) {
            newSchedule.qcStart = qcStart.toISOString().split('T')[0];
          }
          
          console.log(`Creating manufacturing schedule for project ${project.projectNumber} in bay ${bay.bayNumber}`, newSchedule);
          
          const createdSchedule = await storage.createManufacturingSchedule(newSchedule);
          
          if (createdSchedule) {
            results.imported++;
            console.log(`Created schedule for project ${project.projectNumber} in bay ${bay.bayNumber}`);
          } else {
            results.errors++;
            results.details.push(`Failed to create schedule for project ${project.projectNumber}`);
          }
        }
      } catch (error) {
        console.error('Error processing schedule:', error);
        results.errors++;
        results.details.push(`Error importing schedule for project ${scheduleData.projectNumber || 'unknown'}: ${error.message}`);
      }
    }

    console.log(`Bay scheduling import complete: ${results.imported} imported, ${results.errors} errors, ${results.skipped} skipped`);
    res.json({ 
      success: true, 
      message: `Successfully imported ${results.imported} schedules. ${results.errors} failed.`,
      imported: results.imported,
      errors: results.errors,
      details: results.details,
      skipped: results.skipped
    });
    
  } catch (error) {
    console.error('Error in importBayScheduling:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error importing bay scheduling data', 
      error: error.message 
    });
  }
}