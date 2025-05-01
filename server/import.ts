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
          // Basic project info
          name: rawProjectData.Project || rawProjectData['Project Name'],
          projectNumber: rawProjectData['Proj #'] || rawProjectData['Project Number'] || rawProjectData['Project #'],
          description: rawProjectData.Description,
          notes: rawProjectData.Notes || rawProjectData.Comments,
          
          // Team and location
          pmOwnerId: null, // We'll link this to user accounts later
          team: rawProjectData.Team,
          location: rawProjectData.Location,
          
          // Important dates
          contractDate: rawProjectData['Contract Date'],
          startDate: rawProjectData['Start Date'],
          estimatedCompletionDate: rawProjectData['Completion Date'] || rawProjectData['Due Date'] || rawProjectData['Delivery'],
          chassisETA: rawProjectData['Chassis ETA'],
          fabricationStart: rawProjectData['Fabrication Start'],
          assemblyStart: rawProjectData['Assembly Start'],
          wrapDate: rawProjectData['Wrap'],
          ntcTestingDate: rawProjectData['NTC Testing'],
          qcStartDate: rawProjectData['QC START'],
          executiveReviewDate: rawProjectData['EXECUTIVE REVIEW'],
          shipDate: rawProjectData['Ship'],
          deliveryDate: rawProjectData['Delivery'],
          
          // Progress tracking
          percentComplete: typeof rawProjectData['Percent Complete'] === 'number' 
            ? rawProjectData['Percent Complete'] 
            : parseInt(rawProjectData['Percent Complete'] || '0'),
          status: (rawProjectData['Project Status'] || rawProjectData.Status || 'active').toLowerCase(),
          
          // Project specifics
          dpasRating: rawProjectData['DPAS Rating'],
          stretchShortenGears: rawProjectData['Stretch / Shorten / Gears'],
          lltsOrdered: rawProjectData['LLTs Ordered'] === 'Yes' || rawProjectData['LLTs Ordered'] === true || rawProjectData['LLTs Ordered'] === 1,
          qcDays: typeof rawProjectData['QC DAYS'] === 'number'
            ? rawProjectData['QC DAYS']
            : parseInt(rawProjectData['QC DAYS'] || '0'),
          
          // Design assignments
          meAssigned: rawProjectData['ME Assigned'],
          meDesignOrdersPercent: typeof rawProjectData['ME Design / Orders %'] === 'number'
            ? rawProjectData['ME Design / Orders %']
            : parseFloat(rawProjectData['ME Design / Orders %'] || '0'),
          
          eeAssigned: rawProjectData['EE Assigned'],
          eeDesignOrdersPercent: typeof rawProjectData['EE Design / Orders %'] === 'number'
            ? rawProjectData['EE Design / Orders %']
            : parseFloat(rawProjectData['EE Design / Orders %'] || '0'),
          
          iteAssigned: rawProjectData['ITE Assigned'],
          itDesignOrdersPercent: typeof rawProjectData['IT Design / Orders %'] === 'number'
            ? rawProjectData['IT Design / Orders %']
            : parseFloat(rawProjectData['IT Design / Orders %'] || '0'),
          
          ntcDesignOrdersPercent: typeof rawProjectData['NTC Design / Orders %'] === 'number'
            ? rawProjectData['NTC Design / Orders %']
            : parseFloat(rawProjectData['NTC Design / Orders %'] || '0'),
          
          // Flags
          hasBillingMilestones: rawProjectData['Payment Milestones'] === 'Yes' || 
                               rawProjectData['Payment Milestones'] === true || 
                               rawProjectData['Payment Milestones'] === 1,
        };

        // Normalize data
        if (!projectData.name || !projectData.projectNumber) {
          throw new Error('Project name and project number are required');
        }

        // Helper function to convert Excel dates to ISO string format
        const convertExcelDate = (excelDate: any): string | null => {
          if (!excelDate) return null;
          if (typeof excelDate === 'number') {
            const excelEpoch = new Date(1899, 11, 30);
            return new Date(excelEpoch.getTime() + excelDate * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          }
          if (typeof excelDate === 'string' && excelDate.trim()) {
            try {
              const date = new Date(excelDate);
              if (!isNaN(date.getTime())) {
                return date.toISOString().split('T')[0];
              }
            } catch (e) {
              // If date parsing fails, return the original string
            }
          }
          return excelDate;
        };
        
        // Convert all project date fields
        projectData.contractDate = convertExcelDate(projectData.contractDate);
        projectData.startDate = convertExcelDate(projectData.startDate);
        projectData.estimatedCompletionDate = convertExcelDate(projectData.estimatedCompletionDate);
        projectData.chassisETA = convertExcelDate(projectData.chassisETA);
        projectData.fabricationStart = convertExcelDate(projectData.fabricationStart);
        projectData.assemblyStart = convertExcelDate(projectData.assemblyStart);
        projectData.wrapDate = convertExcelDate(projectData.wrapDate);
        projectData.ntcTestingDate = convertExcelDate(projectData.ntcTestingDate);
        projectData.qcStartDate = convertExcelDate(projectData.qcStartDate);
        projectData.executiveReviewDate = convertExcelDate(projectData.executiveReviewDate);
        projectData.shipDate = convertExcelDate(projectData.shipDate);
        projectData.deliveryDate = convertExcelDate(projectData.deliveryDate);

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
          _projectNumber: rawMilestoneData['Proj #'] || rawMilestoneData['Project Number'] || rawMilestoneData['Project #']
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
          _projectNumber: rawScheduleData['Proj #'] || rawScheduleData['Project Number'] || rawScheduleData['Project #'],
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
        results.details.push(`Error with schedule for project ${rawScheduleData['Proj #'] || rawScheduleData['Project Number'] || rawScheduleData['Project #']} in bay ${rawScheduleData['Bay']}: ${(error as Error).message}`);
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