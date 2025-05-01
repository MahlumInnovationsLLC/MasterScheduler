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
    for (const rawProjectData of projectsData) {
      try {
        // Map the Excel template fields to the database schema fields
        const projectData: any = {
          name: rawProjectData.Project || rawProjectData['Project Name'],
          projectNumber: rawProjectData['Project Number'],
          startDate: rawProjectData['Start Date'],
          estimatedCompletionDate: rawProjectData['Completion Date'] || rawProjectData['Due Date'],
          client: rawProjectData.Client,
          description: rawProjectData.Description,
          percentComplete: typeof rawProjectData['Percent Complete'] === 'number' 
            ? rawProjectData['Percent Complete'] 
            : parseInt(rawProjectData['Percent Complete'] || '0'),
          status: (rawProjectData.Status || 'active').toLowerCase(),
          notes: rawProjectData.Notes,
          budget: typeof rawProjectData.Budget === 'number'
            ? rawProjectData.Budget
            : parseInt(rawProjectData.Budget || '0'),
          pmOwnerId: null, // We'll need to link this to user accounts
          priority: rawProjectData.Priority || 'medium',
        };

        // Normalize data
        if (!projectData.name || !projectData.projectNumber) {
          throw new Error('Project name and project number are required');
        }

        // Format dates if they're in Excel format
        if (projectData.startDate && typeof projectData.startDate === 'number') {
          // Convert Excel serial date to JS date
          const excelEpoch = new Date(1899, 11, 30);
          projectData.startDate = new Date(excelEpoch.getTime() + projectData.startDate * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        }

        if (projectData.estimatedCompletionDate && typeof projectData.estimatedCompletionDate === 'number') {
          // Convert Excel serial date to JS date
          const excelEpoch = new Date(1899, 11, 30);
          projectData.estimatedCompletionDate = new Date(excelEpoch.getTime() + projectData.estimatedCompletionDate * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        }

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
        console.error('Error importing project:', rawProjectData, error);
        results.errors++;
        results.details.push(`Error with project ${rawProjectData.Project || rawProjectData['Project Name'] || rawProjectData['Project Number']}: ${(error as Error).message}`);
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
    for (const rawMilestoneData of milestonesData) {
      try {
        // Map Excel template fields to database schema
        const milestoneData: any = {
          name: rawMilestoneData['Milestone'],
          description: rawMilestoneData['Description'],
          amount: typeof rawMilestoneData['Amount'] === 'number' 
            ? rawMilestoneData['Amount'] 
            : parseFloat(rawMilestoneData['Amount'] || '0'),
          targetDate: rawMilestoneData['Target Invoice Date'] || rawMilestoneData['Target Date'],
          invoiceDate: rawMilestoneData['Actual Invoice Date'],
          paymentReceivedDate: rawMilestoneData['Payment Received Date'],
          status: (rawMilestoneData['Status'] || 'upcoming').toLowerCase(),
          notes: rawMilestoneData['Notes'],
          contractReference: rawMilestoneData['Contract Reference'],
          invoiceNumber: rawMilestoneData['Invoice Number'],
          percentageOfTotal: typeof rawMilestoneData['Percentage of Total'] === 'number'
            ? rawMilestoneData['Percentage of Total']
            : parseFloat(rawMilestoneData['Percentage of Total'] || '0'),
          paymentTerms: rawMilestoneData['Payment Terms'],
          billingContact: rawMilestoneData['Billing Contact'],
          // Store project number temporarily for lookup
          _projectNumber: rawMilestoneData['Project Number']
        };

        // Normalize data
        if (!milestoneData.name) {
          throw new Error('Milestone name is required');
        }

        // Format dates if they're in Excel format
        if (milestoneData.targetDate && typeof milestoneData.targetDate === 'number') {
          const excelEpoch = new Date(1899, 11, 30);
          milestoneData.targetDate = new Date(excelEpoch.getTime() + milestoneData.targetDate * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        }

        if (milestoneData.invoiceDate && typeof milestoneData.invoiceDate === 'number') {
          const excelEpoch = new Date(1899, 11, 30);
          milestoneData.invoiceDate = new Date(excelEpoch.getTime() + milestoneData.invoiceDate * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        }

        if (milestoneData.paymentReceivedDate && typeof milestoneData.paymentReceivedDate === 'number') {
          const excelEpoch = new Date(1899, 11, 30);
          milestoneData.paymentReceivedDate = new Date(excelEpoch.getTime() + milestoneData.paymentReceivedDate * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        }

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
        results.details.push(`Imported billing milestone: ${milestoneData.name} for project ${projectNumber}`);
      } catch (error) {
        console.error('Error importing billing milestone:', rawMilestoneData, error);
        results.errors++;
        results.details.push(`Error with milestone ${rawMilestoneData['Milestone']}: ${(error as Error).message}`);
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
    for (const rawScheduleData of schedulesData) {
      try {
        // Map Excel template fields to database schema
        const scheduleData: any = {
          startDate: rawScheduleData['Start Date'],
          endDate: rawScheduleData['End Date'],
          status: (rawScheduleData['Status'] || 'scheduled').toLowerCase(),
          equipment: rawScheduleData['Equipment'],
          staffAssigned: rawScheduleData['Staff Assigned'],
          notes: rawScheduleData['Notes'],
          materials: rawScheduleData['Materials'],
          dependencies: rawScheduleData['Dependencies'],
          priority: rawScheduleData['Priority'],
          productionPhase: rawScheduleData['Production Phase'],
          qaRequirements: rawScheduleData['QA Requirements'],
          // Store temporarily for lookup
          _projectNumber: rawScheduleData['Project Number'],
          _bayNumber: rawScheduleData['Bay']
        };

        // Normalize data
        if (!scheduleData.startDate || !scheduleData.endDate) {
          throw new Error('Start date and end date are required');
        }

        // Format dates if they're in Excel format
        if (scheduleData.startDate && typeof scheduleData.startDate === 'number') {
          const excelEpoch = new Date(1899, 11, 30);
          scheduleData.startDate = new Date(excelEpoch.getTime() + scheduleData.startDate * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        }

        if (scheduleData.endDate && typeof scheduleData.endDate === 'number') {
          const excelEpoch = new Date(1899, 11, 30);
          scheduleData.endDate = new Date(excelEpoch.getTime() + scheduleData.endDate * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        }

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
        console.error('Error importing manufacturing schedule:', rawScheduleData, error);
        results.errors++;
        results.details.push(`Error with schedule for project ${rawScheduleData['Project Number']} in bay ${rawScheduleData['Bay']}: ${(error as Error).message}`);
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