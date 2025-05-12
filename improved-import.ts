import { Request, Response } from 'express';
import { storage } from './storage';
import { InsertBillingMilestone } from '@shared/schema';

// Improved billing milestone import function
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
        
        // 3. Amount - handle currency formats like "$69,600"
        let rawAmount = 
          rawMilestoneData['Amount'] || 
          rawMilestoneData['amount'] || // From client-side processing
          rawMilestoneData['Value'] || 
          rawMilestoneData['Milestone Amount'] || 
          rawMilestoneData['Billing Amount'] || 
          '0';
        
        // Parse the amount to a number
        let amountValue: number;
        if (typeof rawAmount === 'number') {
          amountValue = rawAmount;
        } else {
          // Remove currency symbols, commas, etc. and parse as float
          const cleanAmount = String(rawAmount).replace(/[$,]/g, '').trim();
          amountValue = parseFloat(cleanAmount || '0');
          if (isNaN(amountValue)) {
            console.log(`Could not parse amount: "${rawAmount}" - defaulting to 0`);
            amountValue = 0;
          } else {
            console.log(`Parsed amount: "${rawAmount}" -> ${amountValue}`);
          }
        }
        
        // 4. Target Invoice Date
        const targetDateRaw = 
          rawMilestoneData['Target Invoice Date'] || 
          rawMilestoneData['targetDate'] || // From client-side processing
          rawMilestoneData['Target Date'] || 
          rawMilestoneData['Due Date'] || 
          rawMilestoneData['Invoice Date'] || 
          '';
        
        if (!targetDateRaw) {
          console.log('Missing target date, skipping milestone:', milestoneName, 'for project:', projectNumber);
          results.errors++;
          results.details.push(`Missing target invoice date for milestone: ${milestoneName}`);
          continue;
        }
        
        // Convert dates to proper format
        const targetInvoiceDate = convertExcelDate(targetDateRaw);
        
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
        
        // 5. Status and Description
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
        
        // BUILD INSERT DATA OBJECT
        const insertData: InsertBillingMilestone = {
          projectId: matchedProject.id,
          name: milestoneName,
          description: description,
          amount: amountValue,
          targetInvoiceDate: targetInvoiceDate || new Date().toISOString().split('T')[0],
          actualInvoiceDate: actualInvoiceDate,
          paymentReceivedDate: paymentReceivedDate,
          status: status,
          // Add additional fields from source data
          contractReference: rowMilestoneData['Contract Reference'] || rowMilestoneData['Contract'] || '',
          paymentTerms: rowMilestoneData['Payment Terms'] || '',
          invoiceNumber: rowMilestoneData['Invoice Number'] || rowMilestoneData['Invoice #'] || '',
          percentageOfTotal: rowMilestoneData['Percentage of Total'] || rowMilestoneData['Percentage'] || '',
          billingContact: rowMilestoneData['Billing Contact'] || rowMilestoneData['Contact'] || '',
          notes: rowMilestoneData['Notes'] || ''
        };
        
        // Log the data we're about to insert
        console.log('Inserting billing milestone:', {
          projectId: insertData.projectId,
          name: insertData.name,
          amount: insertData.amount,
          targetInvoiceDate: insertData.targetInvoiceDate,
          // Log additional fields
          contractReference: insertData.contractReference,
          paymentTerms: insertData.paymentTerms,
          invoiceNumber: insertData.invoiceNumber,
          percentageOfTotal: insertData.percentageOfTotal,
          billingContact: insertData.billingContact
        });
        
        // CREATE THE MILESTONE IN DATABASE
        try {
          const newMilestone = await storage.createBillingMilestone(insertData);
          results.imported++;
          results.details.push(`Imported milestone: ${milestoneName} for project ${matchedProject.projectNumber}`);
          console.log(`Successfully created milestone ${milestoneName} with ID ${newMilestone.id}`);
        } catch (createError) {
          console.error('Error creating billing milestone:', createError);
          results.errors++;
          results.details.push(`Error creating milestone ${milestoneName}: ${(createError as Error).message}`);
        }
      } catch (error) {
        console.error('Error processing milestone:', error);
        results.errors++;
        results.details.push(`Error: ${(error as Error).message}`);
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

// Helper function to convert various date formats to ISO
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
    
    // Try to parse the date using the standard Date constructor
    try {
      const date = new Date(normalized);
      if (!isNaN(date.getTime())) {
        const isoDate = date.toISOString().split('T')[0];
        console.log(`Parsed date string '${normalized}' -> '${isoDate}'`);
        return isoDate;
      }
    } catch (e) {
      console.log(`Failed to parse date string: ${normalized}`, e);
    }
    
    // Handle formats like "5/8/25" (common in Excel) - short format with 2-digit year
    const shortYearRegex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{1,2})$/;
    const shortYearMatch = normalized.match(shortYearRegex);
    
    if (shortYearMatch) {
      try {
        // Get the parts, assuming US format MM/DD/YY
        const month = parseInt(shortYearMatch[1], 10);
        const day = parseInt(shortYearMatch[2], 10);
        let year = parseInt(shortYearMatch[3], 10);
        
        // Handle 2-digit years
        if (year < 100) {
          year += year < 50 ? 2000 : 1900;
        }
        
        // Create a proper date object
        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime())) {
          const isoDate = date.toISOString().split('T')[0];
          console.log(`Converted short date '${normalized}' -> '${isoDate}'`);
          return isoDate;
        }
      } catch (e) {
        console.log(`Failed to parse short date: ${normalized}`, e);
      }
    }
  }
  
  // As a last resort, just return the original value as a string
  console.log(`Could not convert date: ${value}, returning as is`);
  if (typeof value === 'string') {
    return value;
  } else if (typeof value === 'number') {
    // Try one more conversion method for Excel dates
    try {
      const date = new Date(1900, 0, value);
      if (!isNaN(date.getTime())) {
        const isoDate = date.toISOString().split('T')[0];
        console.log(`Last-ditch Excel date conversion ${value} -> '${isoDate}'`);
        return isoDate;
      }
    } catch (e) {
      // Ignore errors in this fallback approach
    }
    return value.toString();
  }
  
  // If all else fails
  return undefined;
}