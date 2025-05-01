import { Request, Response } from 'express';
import { storage } from './storage';
import { 
  InsertProject, 
  InsertBillingMilestone, 
  InsertManufacturingBay, 
  InsertManufacturingSchedule 
} from '@shared/schema';

// Import Tier IV Projects
export async function importProjects(req: Request, res: Response) {
  try {
    const projectsData = req.body;
    if (!Array.isArray(projectsData)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid projects data. Expected an array.' 
      });
    }

    const results = {
      imported: 0,
      errors: 0,
      details: [] as string[]
    };

    // Process each project
    for (const projectData of projectsData) {
      try {
        // Check if project with same project number already exists
        const existingProject = await storage.getProjectByNumber(projectData.projectNumber);
        
        if (existingProject) {
          // Update existing project
          await storage.updateProject(existingProject.id, projectData);
          results.imported++;
          results.details.push(`Updated project: ${projectData.name} (${projectData.projectNumber})`);
        } else {
          // Create new project
          await storage.createProject(projectData as InsertProject);
          results.imported++;
          results.details.push(`Imported new project: ${projectData.name} (${projectData.projectNumber})`);
        }
      } catch (error) {
        console.error('Error importing project:', projectData, error);
        results.errors++;
        results.details.push(`Error with project ${projectData.name || projectData.projectNumber}: ${(error as Error).message}`);
      }
    }

    return res.status(200).json(results);
  } catch (error) {
    console.error('Project import error:', error);
    return res.status(500).json({ 
      success: false, 
      message: `Failed to import projects: ${(error as Error).message}` 
    });
  }
}

// Import Future Billing Milestones
export async function importBillingMilestones(req: Request, res: Response) {
  try {
    const milestonesData = req.body;
    if (!Array.isArray(milestonesData)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid billing milestone data. Expected an array.' 
      });
    }

    const results = {
      imported: 0,
      errors: 0,
      details: [] as string[]
    };

    // Process each milestone
    for (const milestoneData of milestonesData) {
      try {
        const projectNumber = milestoneData._projectNumber;
        delete milestoneData._projectNumber; // Remove temporary field
        
        // Look up project by number
        if (projectNumber) {
          const project = await storage.getProjectByNumber(projectNumber);
          if (project) {
            milestoneData.projectId = project.id;
          } else {
            results.errors++;
            results.details.push(`Could not find project with number: ${projectNumber} for milestone: ${milestoneData.name}`);
            continue;
          }
        } else if (!milestoneData.projectId) {
          results.errors++;
          results.details.push(`No project specified for milestone: ${milestoneData.name}`);
          continue;
        }

        // Create the billing milestone
        await storage.createBillingMilestone(milestoneData as InsertBillingMilestone);
        results.imported++;
        results.details.push(`Imported billing milestone: ${milestoneData.name}`);
      } catch (error) {
        console.error('Error importing billing milestone:', milestoneData, error);
        results.errors++;
        results.details.push(`Error with milestone ${milestoneData.name}: ${(error as Error).message}`);
      }
    }

    return res.status(200).json(results);
  } catch (error) {
    console.error('Billing milestone import error:', error);
    return res.status(500).json({ 
      success: false, 
      message: `Failed to import billing milestones: ${(error as Error).message}` 
    });
  }
}

// Import Manufacturing Bays
export async function importManufacturingBays(req: Request, res: Response) {
  try {
    const baysData = req.body;
    if (!Array.isArray(baysData)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid manufacturing bay data. Expected an array.' 
      });
    }

    const results = {
      imported: 0,
      errors: 0,
      details: [] as string[]
    };

    // Process each manufacturing bay
    for (const bayData of baysData) {
      try {
        // Check if bay with same number already exists
        const existingBays = await storage.getManufacturingBays();
        const existingBay = existingBays.find(bay => bay.bayNumber === bayData.bayNumber);
        
        if (existingBay) {
          // Update existing bay
          await storage.updateManufacturingBay(existingBay.id, bayData);
          results.imported++;
          results.details.push(`Updated manufacturing bay: ${bayData.name} (Bay ${bayData.bayNumber})`);
        } else {
          // Create new bay
          await storage.createManufacturingBay(bayData as InsertManufacturingBay);
          results.imported++;
          results.details.push(`Imported new manufacturing bay: ${bayData.name} (Bay ${bayData.bayNumber})`);
        }
      } catch (error) {
        console.error('Error importing manufacturing bay:', bayData, error);
        results.errors++;
        results.details.push(`Error with bay ${bayData.name || bayData.bayNumber}: ${(error as Error).message}`);
      }
    }

    return res.status(200).json(results);
  } catch (error) {
    console.error('Manufacturing bay import error:', error);
    return res.status(500).json({ 
      success: false, 
      message: `Failed to import manufacturing bays: ${(error as Error).message}` 
    });
  }
}

// Import Manufacturing Schedules
export async function importManufacturingSchedules(req: Request, res: Response) {
  try {
    const schedulesData = req.body;
    if (!Array.isArray(schedulesData)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid manufacturing schedule data. Expected an array.' 
      });
    }

    const results = {
      imported: 0,
      errors: 0,
      details: [] as string[]
    };

    // Get all bays and projects for lookup
    const bays = await storage.getManufacturingBays();
    const projects = await storage.getProjects();

    // Process each manufacturing schedule
    for (const scheduleData of schedulesData) {
      try {
        const projectNumber = scheduleData._projectNumber;
        const bayNumber = scheduleData._bayNumber;
        
        delete scheduleData._projectNumber; // Remove temporary field
        delete scheduleData._bayNumber; // Remove temporary field
        
        // Look up project by number
        if (projectNumber) {
          const project = projects.find(p => p.projectNumber === projectNumber);
          if (project) {
            scheduleData.projectId = project.id;
          } else {
            results.errors++;
            results.details.push(`Could not find project with number: ${projectNumber} for schedule in bay ${bayNumber}`);
            continue;
          }
        }
        
        // Look up bay by number
        if (bayNumber) {
          const bay = bays.find(b => b.bayNumber === parseInt(String(bayNumber)));
          if (bay) {
            scheduleData.bayId = bay.id;
          } else {
            results.errors++;
            results.details.push(`Could not find bay with number: ${bayNumber}`);
            continue;
          }
        }

        if (!scheduleData.projectId || !scheduleData.bayId) {
          results.errors++;
          results.details.push(`Missing project or bay ID for schedule`);
          continue;
        }

        // Create the manufacturing schedule
        await storage.createManufacturingSchedule(scheduleData as InsertManufacturingSchedule);
        results.imported++;
        results.details.push(`Imported manufacturing schedule for project ${projectNumber} in bay ${bayNumber}`);
      } catch (error) {
        console.error('Error importing manufacturing schedule:', scheduleData, error);
        results.errors++;
        results.details.push(`Error with schedule for project ${scheduleData._projectNumber} in bay ${scheduleData._bayNumber}: ${(error as Error).message}`);
      }
    }

    return res.status(200).json(results);
  } catch (error) {
    console.error('Manufacturing schedule import error:', error);
    return res.status(500).json({ 
      success: false, 
      message: `Failed to import manufacturing schedules: ${(error as Error).message}` 
    });
  }
}