import { Request, Response } from 'express';
import { storage } from './storage';
import { InsertBillingMilestone } from '@shared/schema';
import { convertExcelDate } from './utils';

export async function importBillingMilestones(req: Request, res: Response) {
  try {
    const milestonesData = req.body;
    if (!Array.isArray(milestonesData)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid billing milestone data. Expected an array.' 
      });
    }
    
    // Log the first milestone for debugging
    if (milestonesData.length > 0) {
      console.log("Sample billing milestone data:", JSON.stringify(milestonesData[0]));
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
        const targetDate = convertExcelDate(targetDateRaw);
        
        const invoiceDateRaw = 
          rawMilestoneData['Actual Invoice Date'] || 
          rawMilestoneData['invoiceDate'] || // From client-side processing
          rawMilestoneData['Invoice Date'] || 
          null;
        const invoiceDate = invoiceDateRaw ? convertExcelDate(invoiceDateRaw) : null;
        
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
          targetInvoiceDate: targetDate,
          actualInvoiceDate: invoiceDate,
          paymentReceivedDate: paymentReceivedDate,
          status: status,
          // Add additional fields from source data
          contractReference: rawMilestoneData['Contract Reference'] || rawMilestoneData['Contract'] || '',
          paymentTerms: rawMilestoneData['Payment Terms'] || '',
          invoiceNumber: rawMilestoneData['Invoice Number'] || rawMilestoneData['Invoice #'] || '',
          percentageOfTotal: rawMilestoneData['Percentage of Total'] || rawMilestoneData['Percentage'] || '',
          billingContact: rawMilestoneData['Billing Contact'] || rawMilestoneData['Contact'] || '',
          notes: rawMilestoneData['Notes'] || ''
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