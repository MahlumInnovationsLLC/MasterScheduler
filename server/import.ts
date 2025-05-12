import { Request, Response } from 'express';
import { storage } from './storage';
import { 
  InsertProject, 
  InsertBillingMilestone, 
  InsertManufacturingBay, 
  InsertManufacturingSchedule,
  InsertDeliveryTracking
} from '@shared/schema';
import { countWorkingDays } from '@shared/utils/date-utils';

// Bay Scheduling Import interface for simplified imports
interface BaySchedulingImportData {
  projectNumber: string;
  productionStartDate: string;
  endDate: string;
  teamNumber: number;
}

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

// Helper function to check if a field is marked (X, Yes, True, etc.)
function isMarked(value: any): boolean {
  if (!value) return false;
  
  if (typeof value === 'boolean') return value;
  
  if (typeof value === 'string') {
    const str = value.toLowerCase().trim();
    return str === 'x' || str === 'yes' || str === 'true' || str === '1' || str === 'y';
  }
  
  if (typeof value === 'number') {
    return value === 1;
  }
  
  return false;
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

// Helper function to convert various formats to Excel dates
function convertExcelDate(value: any): string | undefined {
  // Handle empty or null values
  if (value === undefined || value === null || value === '') return undefined;
  
  // Handle common non-date placeholder values
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['n/a', 'na', 'tbd', 'tba', 'pending', 'unknown', '-'].includes(normalized)) {
      return undefined;
    }
  }
  
  // If it's already a date string in ISO format, return it
  if (typeof value === 'string' && (
      value.match(/^\d{4}-\d{2}-\d{2}/) || // ISO date YYYY-MM-DD
      value.match(/^\d{4}\/\d{2}\/\d{2}/)  // YYYY/MM/DD format
  )) {
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        // Only take the date part without time
        const isoDate = date.toISOString().split('T')[0];
        console.log(`Converted date string '${value}' -> '${isoDate}'`);
        return isoDate;
      }
    } catch (e) {
      console.log(`Failed to parse ISO-like date: ${value}`, e);
    }
  }
  
  // Handle Excel serial dates (numbers)
  if (typeof value === 'number' && !isNaN(value) && value > 0) {
    try {
      // Excel dates are number of days since 1900-01-01
      // But Excel incorrectly thinks 1900 was a leap year, so adjust for dates after Feb 28, 1900
      let adjustedExcelDate = value;
      if (adjustedExcelDate > 60) { // Excel's leap year bug: Feb 29, 1900 doesn't exist
        adjustedExcelDate--;
      }
        
      // Convert Excel date to JavaScript date
      // Date in Javascript = (Excel date - 25569) * 86400 * 1000
      // 25569 is the number of days between Jan 1, 1900 and Jan 1, 1970
      const millisecondsPerDay = 24 * 60 * 60 * 1000;
      const date = new Date((adjustedExcelDate - 25569) * millisecondsPerDay);
        
      if (!isNaN(date.getTime())) {
        // Only take the date part without time
        const isoDate = date.toISOString().split('T')[0];
        console.log(`Converted Excel numeric date ${value} -> '${isoDate}'`);
        return isoDate;
      }
    } catch (e) {
      console.log(`Failed to convert Excel numeric date: ${value}`, e);
    }
  }
  
  // Handle various string date formats (MM/DD/YYYY, DD/MM/YYYY, etc.)
  if (typeof value === 'string' && value.trim()) {
    const normalized = value.trim();
    
    // Handle formats like "5/8/25" (common in Excel) - short format with 2-digit year
    const shortYearRegex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{1,2})$/;
    const shortYearMatch = normalized.match(shortYearRegex);
    
    if (shortYearMatch) {
      // Get the parts, assuming US format MM/DD/YY
      const month = parseInt(shortYearMatch[1], 10);
      const day = parseInt(shortYearMatch[2], 10);
      let year = parseInt(shortYearMatch[3], 10);
      
      // Handle 2-digit years
      if (year < 100) {
        year += year < 50 ? 2000 : 1900;
      }
      
      // Handle the common case where it's actually standard US format (MM/DD/YY)
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        try {
          const date = new Date(year, month - 1, day);
          if (!isNaN(date.getTime())) {
            // Only take the date part
            const isoDate = date.toISOString().split('T')[0];
            console.log(`Converted short-format date '${value}' -> '${isoDate}'`);
            return isoDate;
          }
        } catch (error) {
          console.log(`Error parsing short date format: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      // If standard US format interpretation didn't work, try DD/MM/YY
      if (day >= 1 && day <= 12 && month >= 1 && month <= 31) {
        try {
          const date = new Date(year, day - 1, month);
          if (!isNaN(date.getTime())) {
            // Only take the date part
            const isoDate = date.toISOString().split('T')[0];
            console.log(`Converted short-format date (DD/MM/YY) '${value}' -> '${isoDate}'`);
            return isoDate;
          }
        } catch (e) {
          // Ignore errors for this attempt
        }
      }
    }

    // Try to handle MM/DD/YYYY or DD/MM/YYYY format
    const dateRegex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
    const match = normalized.match(dateRegex);
    
    if (match) {
      // Get the parts - not knowing if it's MM/DD/YYYY or DD/MM/YYYY
      const part1 = parseInt(match[1], 10);
      const part2 = parseInt(match[2], 10);
      let year = parseInt(match[3], 10);
      
      // Try both MM/DD and DD/MM interpretations
      const attemptFormats = [
        { month: part1, day: part2 }, // MM/DD
        { month: part2, day: part1 }  // DD/MM
      ];
      
      for (const format of attemptFormats) {
        if (format.month >= 1 && format.month <= 12 && format.day >= 1 && format.day <= 31) {
          try {
            const date = new Date(year, format.month - 1, format.day);
            if (!isNaN(date.getTime())) {
              // Only take the date part
              const isoDate = date.toISOString().split('T')[0];
              console.log(`Converted string date '${value}' -> '${isoDate}'`);
              return isoDate;
            }
          } catch (e) {
            // Try the next format
          }
        }
      }
    }
    
    // Last resort - try standard JavaScript date parsing
    try {
      const date = new Date(normalized);
      if (!isNaN(date.getTime())) {
        // Only take the date part
        const isoDate = date.toISOString().split('T')[0];
        console.log(`Converted date string via JS Date '${value}' -> '${isoDate}'`);
        return isoDate;
      }
    } catch (e) {
      console.log(`Failed to parse any date format: ${value}`, e);
    }
  }
  
  // Store the original value in rawData but return undefined for the actual field
  console.log(`Could not convert to date, storing original: ${value}`);
  return undefined;
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

        // Using the global convertExcelDate function now
        
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
    console.log("Received billing milestones data for import:", 
      milestonesData.length > 0 ? 
        `${milestonesData.length} milestones, first item fields: ${Object.keys(milestonesData[0]).join(', ')}` :
        "Empty array");
    
    if (milestonesData.length > 0) {
      console.log("Sample milestone data:", JSON.stringify(milestonesData[0], null, 2));
    }
    
    if (!Array.isArray(milestonesData)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid billing milestone data. Expected an array.' 
      });
    }
    
    // Get all projects for lookup
    const projects = await storage.getProjects();
    console.log(`Loaded ${projects.length} projects for matching`);

    const results = {
      imported: 0,
      errors: 0,
      details: [] as string[]
    };

    // Process each milestone
    for (const rawMilestoneData of milestonesData) {
      try {
        // Create a structured milestone object that we'll build during processing
        const milestoneData: {
          projectId: number | null;
          name: string;
          amount: string | number;
          targetDate: string | null;
          invoiceDate: string | null;
          paymentReceivedDate: string | null;
          description: string;
          status: string;
        } = {
          projectId: null,
          name: '',
          amount: 0,
          targetDate: null,
          invoiceDate: null,
          paymentReceivedDate: null,
          description: '',
          status: 'upcoming'
        };
        
        // EXTRACT DATA FIELDS - with flexible column name recognition
        // 1. Project Number - try various field names that could be in the Excel file
        const projectNumber = 
          rawMilestoneData['Project Number'] || 
          rawMilestoneData['Proj #'] || 
          rawMilestoneData['Project #'] || 
          rawMilestoneData['Project'] ||
          rawMilestoneData._projectNumber || // From client-side processing
          '';
        
        if (!projectNumber) {
          console.log('Missing project number, skipping milestone:', rawMilestoneData);
          results.errors++;
          results.details.push(`Missing project number for milestone`);
          continue;
        }
        
        // 2. Milestone Name
        const milestoneName = 
          rawMilestoneData['Milestone'] || 
          rawMilestoneData['name'] || // From client-side processing
          rawMilestoneData['Milestone Name'] || 
          rawMilestoneData['Billing Item'] || 
          rawMilestoneData['Billing Milestone'] || 
          '';
        
        if (!milestoneName) {
          console.log('Missing milestone name, skipping milestone for project:', projectNumber);
          results.errors++;
          results.details.push(`Missing milestone name for project: ${projectNumber}`);
          continue;
        }
        
        // Store milestone name in our structured object
        milestoneData.name = milestoneName;
        
        // 3. Amount - handle currency formats like "$69,600"
        const amount = 
          rawMilestoneData['Amount'] || 
          rawMilestoneData['amount'] || // From client-side processing
          rawMilestoneData['Value'] || 
          rawMilestoneData['Milestone Amount'] || 
          rawMilestoneData['Billing Amount'] || 
          '0';
        
        // 4. Target Invoice Date
        const targetDate = 
          rawMilestoneData['Target Invoice Date'] || 
          rawMilestoneData['targetDate'] || // From client-side processing
          rawMilestoneData['Target Date'] || 
          rawMilestoneData['Due Date'] || 
          rawMilestoneData['Invoice Date'] || 
          '';
        
        // Parse the amount to a number
        let amountValue: number;
        if (typeof amount === 'number') {
          amountValue = amount;
        } else {
          // Remove currency symbols, commas, etc. and parse as float
          const cleanAmount = String(amount).replace(/[$,]/g, '').trim();
          amountValue = parseFloat(cleanAmount || '0');
          if (isNaN(amountValue)) {
            console.log(`Could not parse amount: "${amount}" - defaulting to 0`);
            amountValue = 0;
          } else {
            console.log(`Parsed amount: "${amount}" -> ${amountValue}`);
          }
        }
        
        if (!targetDate) {
          console.log('Missing target date, skipping milestone:', milestoneName, 'for project:', projectNumber);
          results.errors++;
          results.details.push(`Missing target invoice date for milestone: ${milestoneName}`);
          continue;
        }
        
        // Convert dates to proper format
        const targetInvoiceDate = convertExcelDate(targetDate);
        
        const invoiceDateRaw = 
          rawMilestoneData['Actual Invoice Date'] || 
          rawMilestoneData['invoiceDate'] || // From client-side processing
          rawMilestoneData['Invoice Date'] || 
          null;
        const actualInvoiceDate = invoiceDateRaw ? convertExcelDate(invoiceDateRaw) : null;
        
        const paymentDateRaw = 
          rawMilestoneData['Payment Received Date'] || 
          rawMilestoneData['paymentReceivedDate'] || // From client-side processing
          rawMilestoneData['Payment Date'] || 
          rawMilestoneData['Received Date'] || 
          null;
        const paymentReceivedDate = paymentDateRaw ? convertExcelDate(paymentDateRaw) : null;
        
        // Status and Description
        const status = (rawMilestoneData['Status'] || rawMilestoneData['status'] || 'upcoming').toLowerCase();
        const description = rawMilestoneData['Description'] || rawMilestoneData['description'] || rawMilestoneData['Notes'] || '';

        // FIND MATCHING PROJECT ID
        
        // First try direct match on project number
        let matchedProject = projects.find(p => p.projectNumber === projectNumber);
        
        // If no direct match, try without formatting (numbers only)
        if (!matchedProject) {
          const numericProjectNumber = projectNumber.replace(/\D/g, '');
          matchedProject = projects.find(p => 
            p.projectNumber && p.projectNumber.replace(/\D/g, '') === numericProjectNumber
          );
        }
        
        // Try prefix matching as a last resort
        if (!matchedProject) {
          matchedProject = projects.find(p => 
            p.projectNumber && (
              p.projectNumber.startsWith(projectNumber) || 
              projectNumber.startsWith(p.projectNumber)
            )
          );
        }
        
        // If we still don't have a match, report error and skip
        if (!matchedProject) {
          console.log(`No matching project found for number: ${projectNumber}`);
          results.errors++;
          results.details.push(`Project not found for number: ${projectNumber}`);
          continue;
        }
        
        console.log(`Found project match: ${matchedProject.projectNumber} (${matchedProject.name}) for milestone: ${milestoneName}`);

        // Save the project number from temporary field and remove it
        const milestoneProjectNumber = rawMilestoneData._projectNumber;
        delete rawMilestoneData._projectNumber; // Remove temporary field
        
        // Handle projectNumber being 'undefined' as a string
        const normalizedProjectNumber = milestoneProjectNumber === 'undefined' ? '' : milestoneProjectNumber;
        
        // Look up project by number or try to match by number in string
        if (normalizedProjectNumber && normalizedProjectNumber !== '') {
          console.log(`Looking for project with number: ${normalizedProjectNumber} for milestone: ${milestoneName}`);
          
          // First try exact match on project number
          const project = await storage.getProjectByNumber(normalizedProjectNumber);
          if (project) {
            // Store the project ID we'll use for the database insert
            const projectId = project.id;
            console.log(`Found exact project match by number: ${normalizedProjectNumber} for milestone: ${milestoneName}`);
          } else {
            // Get all projects to try different matching strategies
            const projects = await storage.getProjects();
            console.log(`No exact match found, trying fuzzy matching across ${projects.length} projects`);
            
            // Try to match project number ignoring formatting
            // (e.g., "12345" might match "12-345" or "#12345")
            const numberWithoutFormatting = normalizedProjectNumber.replace(/\D/g, '');
            console.log(`Looking for projects with numeric part: ${numberWithoutFormatting}`);
            
            const projectByNumberFormat = projects.find(p => 
              p.projectNumber && p.projectNumber.replace(/\D/g, '') === numberWithoutFormatting
            );

            if (projectByNumberFormat) {
              // Store the project ID we'll use for the database insert
              const projectId = projectByNumberFormat.id;
              console.log(`Found project by number formatting variation: ${normalizedProjectNumber} -> ${projectByNumberFormat.projectNumber} for milestone: ${milestoneName}`);
            } 
            // Enhanced: Try exact prefix match (partial beginning match)
            else {
              console.log(`No format match, trying exact prefix match`);
              const prefixMatch = projects.find(p => 
                p.projectNumber && (
                  p.projectNumber.startsWith(normalizedProjectNumber) || 
                  normalizedProjectNumber.startsWith(p.projectNumber)
                )
              );
              
              if (prefixMatch) {
                milestoneData.projectId = prefixMatch.id;
                console.log(`Found project by prefix match: ${normalizedProjectNumber} matches with ${prefixMatch.projectNumber} for milestone: ${milestoneData.name}`);
              }
              // Try to find project where the milestone description contains the project name
              else if (milestoneData.description) {
                console.log(`No prefix match, trying description match`);
                const matchingProject = projects.find(p => 
                  (p.name && milestoneData.description.includes(p.name)) || 
                  (p.projectNumber && milestoneData.description.includes(p.projectNumber))
                );
                
                if (matchingProject) {
                  milestoneData.projectId = matchingProject.id;
                  console.log(`Linked milestone to project by description match: ${milestoneData.name} -> ${matchingProject.name}`);
                } 
                // Try to find project where the milestone name contains the project number
                else {
                  console.log(`No description match, trying milestone name contains project number`);
                  const projectNumberInName = projects.find(p => 
                    p.projectNumber && milestoneData.name.includes(p.projectNumber)
                  );
                  
                  if (projectNumberInName) {
                    milestoneData.projectId = projectNumberInName.id;
                    console.log(`Linked milestone to project by name containing project number: ${milestoneData.name} -> ${projectNumberInName.projectNumber}`);
                  } else {
                    // Last resort - try to get the first few digits match
                    console.log(`Trying first digits match as last resort`);
                    const firstDigits = numberWithoutFormatting.substring(0, Math.min(6, numberWithoutFormatting.length));
                    if (firstDigits.length >= 3) {
                      const digitMatch = projects.find(p => 
                        p.projectNumber && p.projectNumber.replace(/\D/g, '').startsWith(firstDigits)
                      );
                      
                      if (digitMatch) {
                        milestoneData.projectId = digitMatch.id;
                        console.log(`Found project by first digits match: ${firstDigits} from ${normalizedProjectNumber} matches with ${digitMatch.projectNumber} for milestone: ${milestoneData.name}`);
                      } else {
                        results.errors++;
                        results.details.push(`Could not find project with number: ${normalizedProjectNumber} for milestone: ${milestoneData.name}`);
                        continue;
                      }
                    } else {
                      results.errors++;
                      results.details.push(`Could not find project with number: ${normalizedProjectNumber} for milestone: ${milestoneData.name}`);
                      continue;
                    }
                  }
                }
              } else {
                results.errors++;
                results.details.push(`Could not find project with number: ${normalizedProjectNumber} for milestone: ${milestoneData.name}`);
                continue;
              }
            }
          }
        } else {
          results.errors++;
          results.details.push(`Project Number is required for milestone: ${milestoneData.name}`);
          continue;
        }

        // Log milestone data before creating
        console.log("Final milestone data ready for import:", {
          name: milestoneData.name,
          projectId: milestoneData.projectId,
          amount: milestoneData.amount,
          targetDate: milestoneData.targetDate,
          status: milestoneData.status
        });
        
        // Convert amount to a number for database insertion
        let finalAmount: number;
        if (typeof milestoneData.amount === 'string') {
          // Remove currency symbols, commas, etc. and parse as float
          const cleanAmount = milestoneData.amount.replace(/[$,]/g, '').trim();
          finalAmount = parseFloat(cleanAmount || '0');
          if (isNaN(finalAmount)) {
            console.log(`Could not parse amount: "${milestoneData.amount}" - defaulting to 0`);
            finalAmount = 0;
          } else {
            console.log(`Parsed amount string: "${milestoneData.amount}" -> ${finalAmount}`);
          }
        } else if (typeof milestoneData.amount === 'number') {
          finalAmount = milestoneData.amount;
          console.log(`Using numeric amount: ${finalAmount}`);
        } else {
          finalAmount = 0;
          console.log(`Unknown amount type (${typeof milestoneData.amount}), defaulting to 0`);
        }
        
        // Make sure we have a valid project ID before creating the milestone
        if (!milestoneData.projectId) {
          results.errors++;
          results.details.push(`Missing project ID for milestone: ${milestoneData.name}`);
          continue;
        }
        
        // Convert status to a valid enum value
        let validStatus: 'upcoming' | 'invoiced' | 'paid' | 'delayed' = 'upcoming';
        const statusLower = milestoneData.status.toLowerCase();
        
        if (statusLower.includes('invoice') || statusLower.includes('billed')) {
          validStatus = 'invoiced';
        } else if (statusLower.includes('paid') || statusLower.includes('payment')) {
          validStatus = 'paid';
        } else if (statusLower.includes('delay') || statusLower.includes('late')) {
          validStatus = 'delayed';
        }
        
        // Make sure the data matches our schema type with proper field names
        const insertData: InsertBillingMilestone = {
          projectId: Number(milestoneData.projectId), 
          name: milestoneData.name || '',
          description: milestoneData.description || '',
            // amount must be numeric for decimal type
          amount: Number(finalAmount),
          targetInvoiceDate: milestoneData.targetDate || new Date().toISOString().split('T')[0],
          actualInvoiceDate: milestoneData.invoiceDate || null,
          paymentReceivedDate: milestoneData.paymentReceivedDate || null,
          status: validStatus
          // createdAt and updatedAt are added automatically by the database
        };
        
        try {
          // Create the billing milestone
          await storage.createBillingMilestone(insertData);
          results.imported++;
          results.details.push(`Imported billing milestone: ${milestoneData.name} for project ${normalizedProjectNumber}`);
        } catch (createError) {
          console.error('Error creating billing milestone:', createError);
          results.errors++;
          results.details.push(`Error creating milestone ${milestoneData.name}: ${(createError as Error).message}`);
        }
      } catch (error) {
        console.error('Error importing billing milestone:', rawMilestoneData, error);
        results.errors++;
        results.details.push(`Error with milestone ${rawMilestoneData['Milestone'] || 'Unknown'}: ${(error as Error).message}`);
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
// Import On Time Delivery data
export async function importDeliveryTracking(req: Request, res: Response) {
  try {
    const deliveryData = req.body;
    
    if (!Array.isArray(deliveryData)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid delivery tracking data. Expected an array.' 
      });
    }

    const results = {
      imported: 0,
      errors: 0,
      details: [] as string[]
    };

    // Using the module level isMarked function now
    
    // Process each delivery tracking entry
    for (const rawData of deliveryData) {
      try {
        // Find project by name - use only the specific column name as requested
        const projectName = rawData['Project Name'] || '';
        
        let project;
        
        // Search for project by name
        if (projectName) {
          const allProjects = await storage.getProjects();
          project = allProjects.find(p => p.name === projectName);
        }
        
        if (!project) {
          results.errors++;
          results.details.push(`Project not found: ${projectName}`);
          continue;
        }
        
        // Parse dates - use only the specific column names as requested
        const originalContractDate = convertExcelDate(rawData['Original Contract Date']);
        const extensionDate = convertExcelDate(rawData['#of Formal Extensions (Final Contract Date)']);
        const actualDeliveryDate = convertExcelDate(rawData['Actual Delivery Date']);
        
        // Determine responsibility based on the "Late Due To" field
        let delayResponsibility: 'not_applicable' | 'client_fault' | 'nomad_fault' | 'vendor_fault' = 'not_applicable';
        
        const lateDueTo = (rawData['Late Due To'] || '').toString().toLowerCase();
        
        if (lateDueTo.includes('client')) {
          delayResponsibility = 'client_fault';
        } else if (lateDueTo.includes('nomad')) {
          delayResponsibility = 'nomad_fault';
        } else if (lateDueTo.includes('vendor')) {
          delayResponsibility = 'vendor_fault';
        }
        
        // Get days late directly from the specific column
        let daysLate = convertToInteger(rawData['# of days pre/post contract']);
        
        // If days late isn't specified but we have both dates, calculate it
        if (daysLate === null && originalContractDate && actualDeliveryDate) {
          const origDate = new Date(originalContractDate);
          const actDate = new Date(actualDeliveryDate);
          daysLate = Math.floor((actDate.getTime() - origDate.getTime()) / (1000 * 60 * 60 * 24));
        }
        
        // Determine if it's actually late (negative number means early)
        if (daysLate !== null && daysLate <= 0) {
          daysLate = 0;
          delayResponsibility = 'not_applicable';
        }
        
        // If original contract date is missing, use a fallback date
        if (!originalContractDate) {
          console.error(`Missing required original contract date for project ${project.projectNumber}`);
          throw new Error(`Missing required original contract date for project ${project.projectNumber}`);
        }
        
        // Create delivery tracking entry
        const trackingData: InsertDeliveryTracking = {
          projectId: project.id,
          originalEstimatedDate: originalContractDate,
          revisedEstimatedDate: extensionDate || undefined,
          actualDeliveryDate: actualDeliveryDate || undefined,
          daysLate: daysLate || 0,
          delayResponsibility: delayResponsibility,
          delayReason: rawData['Category'] || '',
          delayNotes: rawData['Late Reasoning'] || '',
          createdById: req.user?.id
        };
        
        await storage.createDeliveryTracking(trackingData);
        results.imported++;
        
      } catch (error) {
        console.error('Error processing delivery tracking entry:', error);
        results.errors++;
        results.details.push((error as Error).message);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Successfully imported ${results.imported} delivery tracking entries with ${results.errors} errors.`,
      imported: results.imported,
      errors: results.errors,
      details: results.details
    });
  } catch (error) {
    console.error('Import delivery tracking error:', error);
    return res.status(500).json({
      success: false,
      message: (error as Error).message,
      errors: 1,
      details: [(error as Error).message]
    });
  }
}

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

        // Format dates using our enhanced converter
        scheduleData.startDate = convertExcelDate(scheduleData.startDate);
        scheduleData.endDate = convertExcelDate(scheduleData.endDate);

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