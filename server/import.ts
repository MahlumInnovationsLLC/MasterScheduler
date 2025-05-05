import { Request, Response } from 'express';
import { storage } from './storage';
import { 
  InsertProject, 
  InsertBillingMilestone, 
  InsertManufacturingBay, 
  InsertManufacturingSchedule 
} from '@shared/schema';
import { countWorkingDays } from '@shared/utils/date-utils';

// Helper function to convert various string values to proper boolean
function convertToBoolean(value: any): boolean | null {
  if (value === undefined || value === null) return null;
  
  // If it's already a boolean, return it
  if (typeof value === 'boolean') return value;
  
  // If it's a number, 1 = true, 0 = false
  if (typeof value === 'number') return value !== 0;
  
  // Handle string values
  if (typeof value === 'string') {
    const normalized = value.toLowerCase().trim();
    
    // Empty string becomes null
    if (!normalized) return null;
    
    // True-like values
    if (['true', 'yes', 'y', '1', 'on', 'done', 'complete', 'finished'].includes(normalized)) {
      return true;
    }
    
    // False-like values
    if (['false', 'no', 'n', '0', 'off', 'incomplete', 'pending'].includes(normalized)) {
      return false;
    }
    
    // For checkboxes that might be marked with 'x' or similar
    if (['x', '✓', '✔', '*', 'checked'].includes(normalized)) {
      return true;
    }
  }
  
  // Default to null for any other unrecognized value
  return null;
}

// Helper function to safely convert various input formats to integers
function convertToInteger(value: any): number | null {
  if (value === undefined || value === null) return null;
  
  // If it's already a number, return it
  if (typeof value === 'number' && !isNaN(value)) {
    return Math.round(value); // Ensure it's an integer
  }
  
  // Handle string values
  if (typeof value === 'string') {
    const normalized = value.trim();
    
    // Empty string becomes null
    if (!normalized) return null;
    
    // Try to handle special cases first
    if (normalized.toLowerCase() === 'in qc') return null;
    if (normalized === 'QC DAYS') return null; // Column header instead of value
    
    // Remove any non-numeric characters except for decimal point
    // This handles cases like "4 days" or "100%"
    const numericPart = normalized.replace(/[^\d.-]/g, '');
    
    if (numericPart === '') return null;
    
    const parsedNumber = parseFloat(numericPart);
    if (!isNaN(parsedNumber)) {
      return Math.round(parsedNumber);
    }
  }
  
  // Default to null for any other unrecognized value
  return null;
}

// Helper function to convert various formats to decimal/float
function convertToDecimal(value: any, defaultValue: number | null = null): number | null {
  if (value === undefined || value === null) return defaultValue;
  
  // If it's already a number, return it
  if (typeof value === 'number' && !isNaN(value)) {
    return value;
  }
  
  // Handle string values
  if (typeof value === 'string') {
    const normalized = value.trim();
    
    // Empty string becomes null
    if (!normalized) return defaultValue;
    
    // Handle percentage values (e.g., "100%")
    if (normalized.endsWith('%')) {
      const percentValue = parseFloat(normalized.replace('%', ''));
      if (!isNaN(percentValue)) {
        return percentValue;
      }
    }
    
    // Remove any non-numeric characters except for decimal point
    const numericPart = normalized.replace(/[^\d.-]/g, '');
    
    if (numericPart === '') return defaultValue;
    
    const parsedNumber = parseFloat(numericPart);
    if (!isNaN(parsedNumber)) {
      return parsedNumber;
    }
  }
  
  // Default to provided default value for any other unrecognized value
  return defaultValue;
}

// Import Tier IV Projects
export async function importProjects(req: Request, res: Response) {
  try {
    const projectsData = req.body;
    console.log("Received data for import:", JSON.stringify(projectsData[0], null, 2));
    
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
        // Take ALL data directly from the client without modification
        // This ensures we preserve the exact data from the Excel file
        console.log("RAW PROJECT DATA FROM CLIENT:", JSON.stringify(rawProjectData, null, 2));
        
        // Extract the fields exactly as they are from the client
        const projectData: any = {
          // We MUST have a project number and name - use exactly what was provided
          projectNumber: rawProjectData.projectNumber || '',
          name: rawProjectData.name || '',
          
          // Take all other fields directly as they are from the client with no transformation
          // Basic project info
          description: rawProjectData.description,
          notes: rawProjectData.notes,
          
          // Team and location
          pmOwnerId: null, // We'll link this to user accounts later
          pmOwner: rawProjectData.pmOwner, // Store the PM name string directly
          team: rawProjectData.team,
          location: rawProjectData.location,
          
          // Directly use date strings exactly as provided
          contractDate: rawProjectData.contractDate,
          startDate: rawProjectData.startDate,
          estimatedCompletionDate: rawProjectData.estimatedCompletionDate,
          chassisETA: rawProjectData.chassisETA,
          fabricationStart: rawProjectData.fabricationStart,
          assemblyStart: rawProjectData.assemblyStart,
          wrapDate: rawProjectData.wrapDate,
          ntcTestingDate: rawProjectData.ntcTestingDate,
          qcStartDate: rawProjectData.qcStartDate,
          executiveReviewDate: rawProjectData.executiveReviewDate,
          shipDate: rawProjectData.shipDate,
          deliveryDate: rawProjectData.deliveryDate,
          
          // Progress tracking - convert percent strings like "100%" to proper numbers
          percentComplete: convertToDecimal(rawProjectData.percentComplete, 0),
          status: rawProjectData.status,
          
          // Project specifics
          dpasRating: rawProjectData.dpasRating,
          stretchShortenGears: rawProjectData.stretchShortenGears,
          lltsOrdered: convertToBoolean(rawProjectData.lltsOrdered),
          // QC Days field is deliberately omitted here as it will be calculated later
          hasBillingMilestones: convertToBoolean(rawProjectData.hasBillingMilestones),
          
          // Design assignments - convert to appropriate number types
          meAssigned: rawProjectData.meAssigned,
          meDesignOrdersPercent: convertToDecimal(rawProjectData.meDesignOrdersPercent),
          eeAssigned: rawProjectData.eeAssigned,
          eeDesignOrdersPercent: convertToDecimal(rawProjectData.eeDesignOrdersPercent),
          iteAssigned: rawProjectData.iteAssigned,
          itDesignOrdersPercent: convertToDecimal(rawProjectData.itDesignOrdersPercent),
          ntcDesignOrdersPercent: convertToDecimal(rawProjectData.ntcDesignOrdersPercent),
          
          // Initialize the rawData object to store ALL Excel data
          rawData: {},
        };
        
        // First, copy any existing raw data from the client's rawData field
        if (rawProjectData.rawData && typeof rawProjectData.rawData === 'object') {
          console.log("Copying raw data from client:", Object.keys(rawProjectData.rawData).length, "fields");
          projectData.rawData = {...rawProjectData.rawData};
        }
        
        // Next, copy ALL fields directly from the original source row data
        // This ensures we capture everything from the Excel file
        for (const [key, value] of Object.entries(rawProjectData)) {
          if (key !== 'rawData') { // Skip the rawData object itself to avoid recursion
            // Store the original value in rawData, even if it's null/undefined/empty
            projectData.rawData[key] = value;
          }
        }
        
        // Track what we're saving for debugging purposes
        console.log(`Raw data for ${projectData.projectNumber} contains ${Object.keys(projectData.rawData).length} fields`);
        
        // Ensure the rawData is a proper JSON object and not containing circular references
        try {
          // Test serialize to catch any potential JSON errors
          JSON.stringify(projectData.rawData);
        } catch (jsonError) {
          console.error("Error serializing rawData:", jsonError);
          // If there's a serialization error, create a clean copy of the raw data
          const cleanRawData: Record<string, any> = {};
          for (const [key, value] of Object.entries(projectData.rawData)) {
            if (typeof value !== 'function' && key !== 'toJSON') {
              // Only include primitive values and non-circular structures
              try {
                JSON.stringify(value);
                cleanRawData[key] = value;
              } catch {
                cleanRawData[key] = String(value);
              }
            }
          }
          projectData.rawData = cleanRawData;
        }

        // Normalize data
        console.log("Project Data: ", {
          name: projectData.name,
          projectNumber: projectData.projectNumber,
          nameIsUndefined: projectData.name === 'undefined' || !projectData.name,
          projectNumberIsUndefined: projectData.projectNumber === 'undefined' || !projectData.projectNumber
        });
        
        // Skip validation if either value is 'undefined' (as a string) - convert it to empty string
        if (projectData.name === 'undefined' || projectData.name === undefined || projectData.name === null) projectData.name = '';
        if (projectData.projectNumber === 'undefined' || projectData.projectNumber === undefined || projectData.projectNumber === null) projectData.projectNumber = '';
        
        // Generate placeholders for missing data
        const currentYear = new Date().getFullYear();
        const timestamp = Date.now().toString().slice(-5);
        
        // Auto-assign a project name if missing but have project number
        if ((!projectData.name || projectData.name === '') && projectData.projectNumber && projectData.projectNumber !== '') {
          projectData.name = `Project ${projectData.projectNumber}`;
          console.log("Generated project name:", projectData.name);
        }
        
        // Generate project number if missing but name exists
        if ((projectData.name && projectData.name !== '') && (!projectData.projectNumber || projectData.projectNumber === '')) {
          // Create a simple unique ID based on name
          const namePart = projectData.name.substring(0, 5).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
          projectData.projectNumber = `T4-${currentYear}-${timestamp}${namePart ? `-${namePart}` : ''}`;
          console.log("Generated project number:", projectData.projectNumber);
        }
        
        // In case both name and number are missing, generate something unique
        if ((!projectData.name || projectData.name === '') && (!projectData.projectNumber || projectData.projectNumber === '')) {
          projectData.name = `Imported Project ${timestamp}`;
          projectData.projectNumber = `T4-${currentYear}-${timestamp}`;
          console.log("Generated project name and number:", projectData.name, projectData.projectNumber);
        }
        
        // Default dates if missing
        if (!projectData.startDate) {
            projectData.startDate = new Date().toISOString().split('T')[0];
        }
        
        if (!projectData.estimatedCompletionDate) {
            // Default to 3 months from start date
            const startDate = new Date(projectData.startDate);
            const completionDate = new Date(startDate);
            completionDate.setMonth(startDate.getMonth() + 3);
            projectData.estimatedCompletionDate = completionDate.toISOString().split('T')[0];
        }

        // Helper function to convert Excel dates to ISO string format
        const convertExcelDate = (excelDate: any): string | null => {
          if (!excelDate) return null;
          
          // If it's already a date string in ISO format, just return it
          if (typeof excelDate === 'string' && excelDate.match(/^\d{4}-\d{2}-\d{2}T/)) {
            return excelDate;
          }
          
          // Handle Excel serial dates (numbers)
          if (typeof excelDate === 'number') {
            // Excel dates are number of days since 1900-01-01
            // But Excel incorrectly thinks 1900 was a leap year, so adjust for dates after Feb 28, 1900
            const date = new Date((excelDate - (excelDate > 59 ? 1 : 0) - 25569) * 86400 * 1000);
            return date.toISOString();
          }
          
          // Handle string date formats
          if (typeof excelDate === 'string' && excelDate.trim()) {
            try {
              const date = new Date(excelDate);
              if (!isNaN(date.getTime())) {
                return date.toISOString();
              }
            } catch (e) {
              console.log(`Failed to parse date: ${excelDate}`, e);
              // If date parsing fails, just pass it through
            }
          }
          
          // If all else fails, return the original value
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

        // Log the QC Days value from the import if it exists (for comparison purposes)
        if (rawProjectData.qcDays !== undefined) {
          console.log(`Ignoring imported QC Days value: ${rawProjectData.qcDays} for project ${projectData.projectNumber}`);
        }

        // Calculate QC Days based on qcStartDate and shipDate (excluding weekends and US holidays)
        if (projectData.qcStartDate && projectData.shipDate) {
          const qcDaysCount = countWorkingDays(projectData.qcStartDate, projectData.shipDate);
          projectData.qcDays = qcDaysCount;
          console.log(`Calculated QC Days for ${projectData.projectNumber}: ${qcDaysCount} working days (from ${projectData.qcStartDate} to ${projectData.shipDate})`);
        } else {
          projectData.qcDays = null;
          console.log(`Could not calculate QC Days for ${projectData.projectNumber} - missing QC Start Date or Ship Date`);
        }

        // Check if project with same project number OR (same name AND project number) already exists
        const existingProject = await storage.getProjectByNumber(projectData.projectNumber);
        
        // Check if there's a project with the same name but different number
        let existingProjectWithSameName;
        if (!existingProject && projectData.name) {
          existingProjectWithSameName = (await storage.getProjects())
            .find(p => p.name === projectData.name);
        }
        
        if (existingProject) {
          // Update existing project with same project number
          await storage.updateProject(existingProject.id, projectData);
          results.imported++;
          results.details.push(`Updated existing project: ${projectData.name} (${projectData.projectNumber})`);
        } else if (existingProjectWithSameName) {
          // Update existing project with same name but different number
          console.log(`Found project with same name '${projectData.name}' but different number. Updating...`);
          await storage.updateProject(existingProjectWithSameName.id, projectData);
          results.imported++;
          results.details.push(`Updated existing project with matching name: ${projectData.name} (${projectData.projectNumber})`);
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

        let projectNumber = milestoneData._projectNumber;
        delete milestoneData._projectNumber; // Remove temporary field
        
        // Handle projectNumber being 'undefined' as a string
        if (projectNumber === 'undefined') {
          projectNumber = '';
        }
        
        // Look up project by number if available
        if (projectNumber && projectNumber !== '') {
          const project = await storage.getProjectByNumber(projectNumber);
          if (project) {
            milestoneData.projectId = project.id;
          } else {
            // Try to find any project with matching name in the milestone description
            if (milestoneData.description) {
              const projects = await storage.getProjects();
              const matchingProject = projects.find(p => 
                milestoneData.description.includes(p.name) || 
                (p.projectNumber && milestoneData.description.includes(p.projectNumber))
              );
              
              if (matchingProject) {
                milestoneData.projectId = matchingProject.id;
                console.log(`Linked milestone to project by name match: ${milestoneData.name} -> ${matchingProject.name}`);
              } else {
                results.errors++;
                results.details.push(`Could not find project with number: ${projectNumber} for milestone: ${milestoneData.name}`);
                continue;
              }
            } else {
              results.errors++;
              results.details.push(`Could not find project with number: ${projectNumber} for milestone: ${milestoneData.name}`);
              continue;
            }
          }
        } else if (!milestoneData.projectId) {
          // If no project is specified, assign to the first project for now
          // This is a placeholder and can be manually corrected later
          const projects = await storage.getProjects();
          if (projects.length > 0) {
            milestoneData.projectId = projects[0].id;
            console.log(`No project specified for milestone: ${milestoneData.name}. Temporarily assigned to ${projects[0].name}`);
          } else {
            results.errors++;
            results.details.push(`No project specified for milestone: ${milestoneData.name} and no projects exist`);
            continue;
          }
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
        // Process boolean fields
        const processedBayData = {
          ...bayData,
          isActive: convertToBoolean(bayData.isActive)
        };

        // Check if bay with same number already exists
        const existingBays = await storage.getManufacturingBays();
        const existingBay = existingBays.find(bay => bay.bayNumber === processedBayData.bayNumber);
        
        if (existingBay) {
          // Update existing bay
          await storage.updateManufacturingBay(existingBay.id, processedBayData);
          results.imported++;
          results.details.push(`Updated manufacturing bay: ${processedBayData.name} (Bay ${processedBayData.bayNumber})`);
        } else {
          // Create new bay
          await storage.createManufacturingBay(processedBayData as InsertManufacturingBay);
          results.imported++;
          results.details.push(`Imported new manufacturing bay: ${processedBayData.name} (Bay ${processedBayData.bayNumber})`);
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

        let projectNumber = scheduleData._projectNumber;
        let bayNumber = scheduleData._bayNumber;
        
        delete scheduleData._projectNumber; // Remove temporary field
        delete scheduleData._bayNumber; // Remove temporary field
        
        // Handle 'undefined' values (as strings)
        if (projectNumber === 'undefined') projectNumber = '';
        if (bayNumber === 'undefined') bayNumber = '';
        
        // Look up project by number if provided
        if (projectNumber && projectNumber !== '') {
          const project = projects.find(p => p.projectNumber === projectNumber);
          if (project) {
            scheduleData.projectId = project.id;
          } else {
            // If no exact match, try to find a project by partial number match
            const possibleMatches = projects.filter(p => 
              projectNumber.includes(p.projectNumber) || p.projectNumber.includes(projectNumber)
            );
            
            if (possibleMatches.length > 0) {
              scheduleData.projectId = possibleMatches[0].id;
              console.log(`Found close match for project number ${projectNumber}: ${possibleMatches[0].projectNumber}`);
            } else {
              // If we have projects, assign to the first one
              if (projects.length > 0) {
                scheduleData.projectId = projects[0].id;
                console.log(`Could not find project with number: ${projectNumber}, using default project: ${projects[0].name}`);
              } else {
                results.errors++;
                results.details.push(`Could not find project with number: ${projectNumber} for schedule in bay ${bayNumber}`);
                continue;
              }
            }
          }
        } else if (projects.length > 0) {
          // Default to first project if none specified
          scheduleData.projectId = projects[0].id;
          console.log(`No project specified for schedule, using default: ${projects[0].name}`);
        } else {
          results.errors++;
          results.details.push(`No project specified and no projects exist`);
          continue;
        }
        
        // Look up bay by number
        if (bayNumber && bayNumber !== '') {
          let bayId = null;
          
          // Try as an integer first
          const bayInt = parseInt(String(bayNumber), 10);
          if (!isNaN(bayInt)) {
            const bay = bays.find(b => b.bayNumber === bayInt);
            if (bay) bayId = bay.id;
          }
          
          // If that fails, try as a string match on bay name
          if (!bayId && typeof bayNumber === 'string') {
            const bay = bays.find(b => b.name.includes(bayNumber) || String(b.bayNumber).includes(bayNumber));
            if (bay) bayId = bay.id;
          }
          
          if (bayId) {
            scheduleData.bayId = bayId;
          } else if (bays.length > 0) {
            // Default to first bay if not found
            scheduleData.bayId = bays[0].id;
            console.log(`Could not find bay with number: ${bayNumber}, using default bay: ${bays[0].name}`);
          } else {
            results.errors++;
            results.details.push(`Could not find bay with number: ${bayNumber} and no bays exist`);
            continue;
          }
        } else if (bays.length > 0) {
          // Default to first bay if none specified
          scheduleData.bayId = bays[0].id;
          console.log(`No bay specified for schedule, using default: ${bays[0].name}`);
        } else {
          results.errors++;
          results.details.push(`No bay specified and no bays exist`);
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