import { Request, Response } from 'express';
import { storage } from '../storage';
import { InsertManufacturingSchedule } from '@shared/schema';

// Interface for bay scheduling import data from the frontend
interface BaySchedulingImportData {
  projectNumber: string;
  productionStartDate: string;
  endDate: string;
  teamNumber: number;
}

// Department data with percentages
interface DepartmentSchedule {
  department: string;
  startDate: Date;
  endDate: Date;
  percentOfTotal: number;
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

        // Find the manufacturing bay/team
        const bay = allBays.find(b => b.bayNumber === scheduleData.teamNumber);
        if (!bay) {
          results.errors++;
          results.details.push(`Manufacturing bay/team not found with number: ${scheduleData.teamNumber}`);
          continue;
        }

        // Parse dates
        const productionStartDate = new Date(scheduleData.productionStartDate);
        const endDate = new Date(scheduleData.endDate);
        
        if (isNaN(productionStartDate.getTime()) || isNaN(endDate.getTime())) {
          results.errors++;
          results.details.push(`Invalid date format for project ${scheduleData.projectNumber}`);
          continue;
        }

        // Generate department schedules with different start dates
        const departmentSchedules = generateDepartmentSchedules(
          productionStartDate,
          endDate,
          project.departmentPercentages
        );

        // Check if this project already has a schedule in this bay
        const existingSchedules = await storage.getProjectManufacturingSchedules(project.id);
        const existingInBay = existingSchedules.find(s => s.bayId === bay.id);
        
        if (existingInBay) {
          // Find the earliest department start date (for FAB and PAINT which may start before production)
          const earliestStartDate = departmentSchedules.reduce(
            (earliest, dept) => dept.startDate < earliest ? dept.startDate : earliest, 
            productionStartDate
          );

          // Update the existing schedule
          const updatedSchedule = await storage.updateManufacturingSchedule(existingInBay.id, {
            startDate: earliestStartDate.toISOString(),
            endDate: endDate.toISOString(),
            // Keep other existing data
            totalHours: existingInBay.totalHours,
            status: existingInBay.status,
            notes: existingInBay.notes,
            equipment: existingInBay.equipment,
            staffAssigned: existingInBay.staffAssigned,
            // Add department dates
            fabricationStartDate: getDepartmentDate(departmentSchedules, 'FAB', 'start'),
            fabricationEndDate: getDepartmentDate(departmentSchedules, 'FAB', 'end'),
            assemblyStartDate: getDepartmentDate(departmentSchedules, 'ASSEMBLY', 'start'),
            assemblyEndDate: getDepartmentDate(departmentSchedules, 'ASSEMBLY', 'end'),
            testingStartDate: getDepartmentDate(departmentSchedules, 'TESTING', 'start'),
            testingEndDate: getDepartmentDate(departmentSchedules, 'TESTING', 'end'),
            qcStartDate: getDepartmentDate(departmentSchedules, 'QC', 'start'),
            qcEndDate: getDepartmentDate(departmentSchedules, 'QC', 'end'),
          });
          
          if (updatedSchedule) {
            results.imported++;
            console.log(`Updated schedule for project ${project.projectNumber} in bay ${bay.bayNumber}`);
          } else {
            results.errors++;
            results.details.push(`Failed to update schedule for project ${project.projectNumber}`);
          }
        } else {
          // Find the earliest department start date (for FAB and PAINT which may start before production)
          const earliestStartDate = departmentSchedules.reduce(
            (earliest, dept) => dept.startDate < earliest ? dept.startDate : earliest, 
            productionStartDate
          );

          // Calculate project duration for reference - using hardcoded milliseconds per day
          const msPerDay = 86400000; // 24 * 60 * 60 * 1000 hardcoded to avoid octal literals
          const totalDays = Math.ceil((endDate.getTime() - productionStartDate.getTime()) / msPerDay);
          
          // Create a new manufacturing schedule
          const newSchedule: InsertManufacturingSchedule = {
            projectId: project.id,
            bayId: bay.id,
            startDate: earliestStartDate.toISOString(),
            endDate: endDate.toISOString(),
            totalHours: project.totalHours || 1000, // Default to 1000 hours if not specified
            status: 'scheduled',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            // Add department dates
            fabricationStartDate: getDepartmentDate(departmentSchedules, 'FAB', 'start'),
            fabricationEndDate: getDepartmentDate(departmentSchedules, 'FAB', 'end'),
            assemblyStartDate: getDepartmentDate(departmentSchedules, 'ASSEMBLY', 'start'),
            assemblyEndDate: getDepartmentDate(departmentSchedules, 'ASSEMBLY', 'end'),
            testingStartDate: getDepartmentDate(departmentSchedules, 'TESTING', 'start'),
            testingEndDate: getDepartmentDate(departmentSchedules, 'TESTING', 'end'),
            qcStartDate: getDepartmentDate(departmentSchedules, 'QC', 'start'),
            qcEndDate: getDepartmentDate(departmentSchedules, 'QC', 'end'),
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
      } catch (error: any) {
        console.error('Error processing schedule:', error);
        results.errors++;
        results.details.push(`Error importing schedule for project ${scheduleData.projectNumber || 'unknown'}: ${error.message || 'Unknown error'}`);
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
    
  } catch (error: any) {
    console.error('Error in importBayScheduling:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error importing bay scheduling data', 
      error: error.message || 'Unknown error' 
    });
  }
}

/**
 * Helper function to generate department schedules with different start dates
 * FAB and PAINT departments extend to the left of the production start date
 */
function generateDepartmentSchedules(
  productionStartDate: Date, 
  endDate: Date, 
  departmentPercentages?: Record<string, number>
): DepartmentSchedule[] {
  const msPerDay = 86400000; // 24 * 60 * 60 * 1000 hardcoded to avoid octal literals
  const totalProjectDuration = endDate.getTime() - productionStartDate.getTime();
  const schedules: DepartmentSchedule[] = [];
  
  // Default percentages if not provided
  const percentages = departmentPercentages || {
    FAB: 20,
    PAINT: 10,
    ASSEMBLY: 35,
    ELECTRICAL: 15,
    TESTING: 15,
    QC: 5
  };
  
  // Calculate the offset days before production start for FAB and PAINT
  const fabOffsetDays = Math.ceil((percentages.FAB || 20) / 100 * (totalProjectDuration / msPerDay) * 0.5);
  const paintOffsetDays = Math.ceil((percentages.PAINT || 10) / 100 * (totalProjectDuration / msPerDay) * 0.3);
  
  // FAB starts before production start
  const fabStartDate = new Date(productionStartDate);
  fabStartDate.setDate(fabStartDate.getDate() - fabOffsetDays);
  
  const fabEndDate = new Date(productionStartDate);
  fabEndDate.setDate(fabEndDate.getDate() + Math.ceil((percentages.FAB || 20) / 100 * (totalProjectDuration / msPerDay) * 0.5));
  
  schedules.push({
    department: 'FAB',
    startDate: fabStartDate,
    endDate: fabEndDate,
    percentOfTotal: percentages.FAB || 20
  });
  
  // PAINT starts before production start but after FAB
  const paintStartDate = new Date(productionStartDate);
  paintStartDate.setDate(paintStartDate.getDate() - paintOffsetDays);
  
  const paintEndDate = new Date(productionStartDate);
  paintEndDate.setDate(paintEndDate.getDate() + Math.ceil((percentages.PAINT || 10) / 100 * (totalProjectDuration / msPerDay) * 0.7));
  
  schedules.push({
    department: 'PAINT',
    startDate: paintStartDate,
    endDate: paintEndDate,
    percentOfTotal: percentages.PAINT || 10
  });
  
  // ASSEMBLY starts at production start
  const assemblyDuration = (percentages.ASSEMBLY || 35) / 100 * (totalProjectDuration / msPerDay);
  const assemblyStartDate = new Date(productionStartDate);
  
  const assemblyEndDate = new Date(assemblyStartDate);
  assemblyEndDate.setDate(assemblyEndDate.getDate() + Math.ceil(assemblyDuration));
  
  schedules.push({
    department: 'ASSEMBLY',
    startDate: assemblyStartDate,
    endDate: assemblyEndDate,
    percentOfTotal: percentages.ASSEMBLY || 35
  });
  
  // ELECTRICAL runs parallel to ASSEMBLY
  const electricalDuration = (percentages.ELECTRICAL || 15) / 100 * (totalProjectDuration / msPerDay);
  const electricalStartDate = new Date(productionStartDate);
  electricalStartDate.setDate(electricalStartDate.getDate() + Math.ceil(assemblyDuration * 0.2)); // Start a bit after ASSEMBLY
  
  const electricalEndDate = new Date(electricalStartDate);
  electricalEndDate.setDate(electricalEndDate.getDate() + Math.ceil(electricalDuration));
  
  schedules.push({
    department: 'ELECTRICAL',
    startDate: electricalStartDate,
    endDate: electricalEndDate,
    percentOfTotal: percentages.ELECTRICAL || 15
  });
  
  // TESTING starts after ASSEMBLY and ELECTRICAL
  const testingStartDate = new Date(Math.max(assemblyEndDate.getTime(), electricalEndDate.getTime()));
  const testingDuration = (percentages.TESTING || 15) / 100 * (totalProjectDuration / msPerDay);
  
  const testingEndDate = new Date(testingStartDate);
  testingEndDate.setDate(testingEndDate.getDate() + Math.ceil(testingDuration));
  
  schedules.push({
    department: 'TESTING',
    startDate: testingStartDate,
    endDate: testingEndDate,
    percentOfTotal: percentages.TESTING || 15
  });
  
  // QC runs at the end of the project
  const qcDuration = (percentages.QC || 5) / 100 * (totalProjectDuration / msPerDay);
  const qcStartDate = new Date(testingEndDate);
  
  schedules.push({
    department: 'QC',
    startDate: qcStartDate,
    endDate: endDate, // End at project end
    percentOfTotal: percentages.QC || 5
  });
  
  return schedules;
}

/**
 * Helper function to get a department's start or end date
 */
function getDepartmentDate(
  departmentSchedules: DepartmentSchedule[],
  department: string,
  dateType: 'start' | 'end'
): string | undefined {
  const deptSchedule = departmentSchedules.find(d => d.department === department);
  if (!deptSchedule) return undefined;
  
  return dateType === 'start' ? 
    deptSchedule.startDate.toISOString() : 
    deptSchedule.endDate.toISOString();
}