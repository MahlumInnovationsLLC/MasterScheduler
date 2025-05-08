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
        const startDate = new Date(scheduleData.productionStartDate);
        const endDate = new Date(scheduleData.endDate);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          results.errors++;
          results.details.push(`Invalid date format for project ${scheduleData.projectNumber}`);
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
            // Keep other existing data
            totalHours: existingInBay.totalHours,
            scheduleStatus: existingInBay.scheduleStatus,
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
          
          // Calculate department start dates
          // Fabrication starts before the production start date based on its percentage
          const fabricationDays = Math.ceil((totalDays * fabricationPercent) / 100);
          const fabricationStart = new Date(startDate);
          fabricationStart.setDate(fabricationStart.getDate() - fabricationDays);
          
          // Assembly starts at the production start date
          const assemblyStart = new Date(startDate);
          
          // Testing starts after assembly based on assembly percentage
          const assemblyDays = Math.ceil((totalDays * assemblyPercent) / 100);
          const ntcTestingStart = new Date(startDate);
          ntcTestingStart.setDate(ntcTestingStart.getDate() + assemblyDays);
          
          // QC phase typically starts near the end
          const qcDays = project.qcDays || 5; // Default to 5 days if not specified
          const qcStart = new Date(endDate);
          qcStart.setDate(qcStart.getDate() - qcDays);
          
          // Create a new manufacturing schedule
          const newSchedule: InsertManufacturingSchedule = {
            projectId: project.id,
            bayId: bay.id,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            totalHours: project.totalHours || 1000, // Default to 1000 hours if not specified
            scheduleStatus: 'scheduled',
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