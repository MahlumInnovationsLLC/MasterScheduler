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
interface BaySchedulingImportData {
  projectNumber: string;
  productionStartDate: string;
  endDate: string;
  teamNumber: number;
  totalHours?: number; // New field to update project total hours
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

    // Get all projects and bays for reference
    const allProjects = await storage.getProjects();
    const allBays = await storage.getManufacturingBays();

    // Process each schedule
    for (const scheduleData of schedules) {
      try {
        // Validate required fields
        if (!scheduleData.projectNumber || !scheduleData.productionStartDate || 
            !scheduleData.endDate || !scheduleData.teamNumber) {
          results.errors++;
          results.details.push(`Missing required fields for schedule: ${JSON.stringify(scheduleData)}`);
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
        
        // Update project totalHours if provided in the import data
        if (scheduleData.totalHours && scheduleData.totalHours > 0) {
          try {
            // Update the project with the new total hours
            await storage.updateProject(project.id, {
              totalHours: scheduleData.totalHours,
              updatedAt: new Date().toISOString()
            });
            console.log(`Updated totalHours for project ${project.projectNumber} to ${scheduleData.totalHours}`);
          } catch (error) {
            console.error(`Error updating totalHours for project ${project.projectNumber}:`, error);
            // Continue with the import even if updating totalHours fails
          }
        }

        // Find the manufacturing bay/team
        const bay = allBays.find(b => b.bayNumber === scheduleData.teamNumber);
        if (!bay) {
          results.errors++;
          results.details.push(`Manufacturing bay/team not found with number: ${scheduleData.teamNumber}`);
          continue;
        }

        // Parse dates safely to avoid octal literal errors
        let startDate: Date, endDate: Date;
        
        try {
          // Safe date parsing to avoid octal literal errors with leading zeros
          startDate = parseDateSafely(scheduleData.productionStartDate);
          endDate = parseDateSafely(scheduleData.endDate);
          
          // Verify that parsing was successful
          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            throw new Error("Date parsing resulted in invalid dates");
          }
        } catch (error) {
          results.errors++;
          results.details.push(`Invalid date format for project ${scheduleData.projectNumber}: ${error.message}`);
          continue;
        }

        // Check if this project already has a schedule in this bay
        const existingSchedules = await storage.getProjectManufacturingSchedules(project.id);
        const existingInBay = existingSchedules.find(s => s.bayId === bay.id);
        
        if (existingInBay) {
          // Update the existing schedule
          const updatedSchedule = await storage.updateManufacturingSchedule(existingInBay.id, {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            // Use totalHours from import data if provided, otherwise keep existing value
            totalHours: scheduleData.totalHours || existingInBay.totalHours,
            status: existingInBay.status || 'scheduled',
            fabricationStart: existingInBay.fabricationStart,
            assemblyStart: existingInBay.assemblyStart,
            ntcTestingStart: existingInBay.ntcTestingStart,
            qcStart: existingInBay.qcStart
          });
          
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
          
          // Determine which rows are already in use
          const usedRows = new Set(baySchedules.map(s => s.row).filter(r => r !== null && r !== undefined));
          
          // Find the first available row starting from 1
          let row = 1;
          while (usedRows.has(row)) {
            row++;
          }
          
          // Create a new manufacturing schedule
          const newSchedule: InsertManufacturingSchedule = {
            projectId: project.id,
            bayId: bay.id,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            // Use totalHours from import data if provided, otherwise use project's totalHours or default
            totalHours: scheduleData.totalHours || project.totalHours || 1000,
            status: 'scheduled',
            row: row, // Assign the schedule to the first available row
            fabricationStart: fabricationStart.toISOString(),
            assemblyStart: assemblyStart.toISOString(),
            ntcTestingStart: ntcTestingStart.toISOString(),
            qcStart: qcStart.toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
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