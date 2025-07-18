import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { UploadCloud, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import BaySchedulingImport from "@/components/BaySchedulingImport";
import { ModuleHelpButton } from "@/components/ModuleHelpButton";
import { importDataHelpContent } from "@/data/moduleHelpContent";

// Helper function to convert Excel data with column headers
const convertRowsWithHeaders = (
  rows: Record<string, any>[],
  headers: string[]
): Record<string, any>[] => {
  if (!rows || rows.length === 0) return [];
  
  // Clean up headers - remove undefined, null, empty strings
  const cleanHeaders = headers.filter(h => h !== undefined && h !== null && h !== '');
  
  // If no clean headers, return empty array
  if (cleanHeaders.length === 0) {
    return [];
  }
  
  // Map letter-based keys (A, B, C) to header names
  return rows.map(row => {
    const newRow: Record<string, any> = {};
    
    // For each column header, find the corresponding value in the row
    cleanHeaders.forEach((header, index) => {
      // Convert Excel column letter (A, B, C...) to index
      const colLetter = String.fromCharCode(65 + index); // A=65, B=66, etc.
      
      // Add the value to the new row, replacing undefined or null with empty string
      const value = row[colLetter];
      newRow[header] = (value === undefined || value === null) ? '' : value;
    });
    
    // Add common column aliases for better mapping - this helps with inconsistent Excel templates
    const aliases: Record<string, string[]> = {
      'Proj #': ['Project Number', 'Project #', 'Number', 'Project ID', 'ID'],
      'Project': ['Project Name', 'Name'],
      'Start Date': ['Begin Date', 'Start'],
      'Completion Date': ['Due Date', 'Est. Completion', 'End Date'],
      'Percent Complete': ['Progress', 'Completion %'],
      'Status': ['Project Status', 'State'],
      'Client': ['Customer', 'Client Name'],
      'Notes': ['Comments', 'Description']
    };
    
    // Apply all aliases
    Object.entries(aliases).forEach(([primary, alternates]) => {
      // If primary field doesn't exist in row, check alternates
      if (!newRow[primary] || newRow[primary] === '') {
        // Try each alternate name
        for (const alt of alternates) {
          if (newRow[alt] && newRow[alt] !== '') {
            newRow[primary] = newRow[alt];
            break;
          }
        }
      }
      
      // Ensure the primary field exists even if empty
      if (newRow[primary] === undefined) {
        newRow[primary] = '';
      }
    });
    

    
    return newRow;
  });
};

const ImportDataPage = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("projects");
  const [isUploading, setIsUploading] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [importResults, setImportResults] = useState<{
    success: boolean;
    message: string;
    imported?: number;
    errors?: number;
    details?: string[];
  } | null>(null);

  // Handle file selection
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setProgressPercent(0);
    setImportResults(null);

    try {
      setProgressPercent(10);
      
      // Read file
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      
      setProgressPercent(30);
      
      // Convert to JSON
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Get the header row first to see actual column names
      const header = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0] as string[];
      
      // Use options for more forgiving parsing
      const data = XLSX.utils.sheet_to_json(worksheet, { 
        header: "A", // Use A, B, C as headers initially
        defval: "", // Set default value for empty cells to empty string
        raw: false,   // Convert all values to strings
        blankrows: false // Skip blank rows
      });
      
      // Check for completely empty rows (all cells empty or undefined)
      const nonEmptyData = data.filter((row: any) => {
        // Check if any value in the row is non-empty
        return Object.values(row).some(value => value !== null && value !== undefined && value !== '');
      });
      
      if (nonEmptyData.length === 0) {
        throw new Error("No valid data found in the spreadsheet. Please check the file format and try again.");
      }
      
      // Convert header-mapped data
      const headerMappedData = convertRowsWithHeaders(nonEmptyData as Record<string, any>[], header);
      
      setProgressPercent(50);

      // Process data based on type
      let result;
      switch (type) {
        case 'projects':
          result = await processProjectData(headerMappedData);
          break;
        case 'billing':
          result = await processBillingData(headerMappedData);
          break;
        case 'manufacturing':
          result = await processManufacturingData(headerMappedData);
          break;
        case 'delivery':
          result = await processDeliveryData(headerMappedData);
          break;
        case 'engineering':
          result = await processEngineeringData(headerMappedData);
          break;
        default:
          throw new Error('Unknown import type');
      }
      
      setProgressPercent(100);
      setImportResults(result);
      
      toast({
        title: result.success ? "Import Complete" : "Import Failed",
        description: result.message,
        variant: result.success ? "default" : "destructive"
      });
    } catch (error) {
      console.error('Import error:', error);
      setImportResults({
        success: false,
        message: 'Error processing file',
        errors: 1,
        details: [(error as Error).message]
      });
      
      toast({
        title: "Import Failed",
        description: (error as Error).message,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  // Process project data from Tier IV Project Status excel
  const processProjectData = async (data: any[]): Promise<any> => {
    try {
      // Clean and validate data
      const projects = data.map(row => {
        
        // For Tier IV projects, we need to use the actual project numbers from the first column
        // The project number is typically in format 804924_OK_LawtonFD_IC34As4
        const projNumber = row['Proj #'] || row['Project Number'] || row['Project #'] || 
                         row['Number'] || row['Project ID'] || row['ID'] || row['Location'] || '';
        
        // Extract project name exactly as in the spreadsheet
        const projName = row['Project'] || row['Project Name'] || row['Name'] || '';
        
        // Get PM owner name from spreadsheet
        const pmName = row['PM'] || row['PM Owner'] || row['Project Manager'] || '';
        
        // Extract status information
        const statusValue = row['Status'] || row['Project Status'] || 'active';
        
        // Get team information
        const teamInfo = row['Team'] || row['Teai'] || ''; // Note: 'Teai' is in the screenshot to handle typos
        
        // Get location information 
        const locationInfo = row['Location'] || '';
        

        
        // Get all the specific Tier IV fields from your spreadsheet
        // First, create the base project object with our required fields
        const projectObj = {
          projectNumber: projNumber, // Use exact project number from spreadsheet
          name: projName,            // Use exact project name from spreadsheet
          team: teamInfo,
          location: locationInfo,
          
          // Status and completion
          status: mapProjectStatus(statusValue),
          percentComplete: row['Progress'] || row['Percent Complete'] || row['%'] || '0',
          
          // PM and team details
          pmOwner: pmName,
          
          // Important dates - preserve EXACTLY as in the spreadsheet
          contractDate: parseExcelDate(row['Contract Date']),
          startDate: parseExcelDate(row['Start Date']) || new Date().toISOString(),
          estimatedCompletionDate: parseExcelDate(row['Completion Date'] || row['Due Date'] || row['Est. Completion']),
          chassisETA: parseExcelDate(row['Chassis ETA']),
          fabricationStart: parseExcelDate(row['Fabrication Start']),
          assemblyStart: parseExcelDate(row['Assembly Start']),
          wrapDate: parseExcelDate(row['Wrap']),
          ntcTestingDate: parseExcelDate(row['NTC Testing']),
          qcStartDate: parseExcelDate(row['QC START']),
          executiveReviewDate: parseExcelDate(row['EXECUTIVE REVIEW']),
          shipDate: parseExcelDate(row['Ship']),
          deliveryDate: parseExcelDate(row['Delivery']),
          
          // Design and engineering details
          meAssigned: row['ME Assigned'],
          meDesignOrdersPercent: row['ME Design / Orders %'],
          eeAssigned: row['EE Assigned'],
          eeDesignOrdersPercent: row['EE Design / Orders %'],
          iteAssigned: row['ITE Assigned'],
          itDesignOrdersPercent: row['IT Design / Orders %'],
          ntcDesignOrdersPercent: row['NTC Design / Orders %'],
          
          // Project specifics
          dpasRating: row['DPAS Rating'],
          stretchShortenGears: row['Stretch / Shorten / Gears'],
          lltsOrdered: row['LLTs Ordered'],
          qcDays: row['QC DAYS'],
          hasBillingMilestones: row['Has Billing Milestones'] || row['Payment Milestones'] !== undefined || null,
          
          // Additional information fields
          description: row['Description'] || '',
          notes: row['Notes'] || row['Comments'] || '',
          
          // Store all raw data fields for future reference
          rawData: {} as Record<string, any>
        };
        
        // Now, add ALL original fields from the Excel into rawData to ensure no data is lost
        for (const [key, value] of Object.entries(row)) {
          // Store all values including empty strings, but not null/undefined
          if (value !== null && value !== undefined) {
            projectObj.rawData[key] = value;
          }
        }
        
        // Log the raw data to help debug
        console.log(`Raw data for project ${projectObj.projectNumber}:`, projectObj.rawData);
        
        return projectObj;
      });

      // Call API to save data
      const response = await fetch('/api/import/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projects),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to import projects');
      }

      const result = await response.json();
      return {
        success: true,
        message: `Successfully imported ${result.imported} projects`,
        imported: result.imported,
        errors: result.errors,
        details: result.details
      };
    } catch (error) {
      console.error('Process project data error:', error);
      return {
        success: false,
        message: (error as Error).message,
        errors: data.length,
        details: [(error as Error).message]
      };
    }
  };

  // Process billing milestone data from Future Billing Milestones excel
  const processBillingData = async (data: any[]): Promise<any> => {
    try {
      console.log("Starting processing billing milestones with fields:", 
        data.length > 0 ? Object.keys(data[0]).join(", ") : "No data");
      
      // Clean and validate data
      const milestones = data.map(row => {
        console.log("Processing billing milestone row:", JSON.stringify(row));
        
        // Get the project number from new template format
        const projectNumber = row['Project Number'] || '';
        
        // Log available fields in this row to help debug
        console.log("Available fields in this milestone row:", Object.keys(row).join(", "));
        
        // Extract amount - handle as number since Excel gives numeric values
        let amountValue = row['Amount'] || '0';
        if (typeof amountValue === 'string') {
          // Remove currency symbols, commas, etc. and parse
          amountValue = amountValue.replace(/[$,]/g, '').trim();
          console.log(`Converted amount from "${row['Amount']}" to "${amountValue}"`);
        }
        
        // Get milestone name from new template format
        const milestoneName = row['Milestone'] || '';
        if (!milestoneName) {
          console.warn("Missing milestone name for project", projectNumber);
        }
        
        // Parse Excel date numbers to proper date format
        const parseExcelDate = (dateValue: any): string | null => {
          if (!dateValue) return null;
          
          try {
            // Handle Excel date numbers (like 45516 in the template)
            if (typeof dateValue === 'number') {
              // Excel date number conversion
              const excelDate = new Date((dateValue - 25569) * 86400 * 1000);
              return excelDate.toISOString().split('T')[0];
            }
            
            // Handle string dates
            if (typeof dateValue === 'string') {
              const parsedDate = new Date(dateValue);
              if (!isNaN(parsedDate.getTime())) {
                return parsedDate.toISOString().split('T')[0];
              }
            }
            
            // Handle Date objects
            if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
              return dateValue.toISOString().split('T')[0];
            }
            
            return null;
          } catch (error) {
            console.warn(`Failed to parse Excel date: ${dateValue}`, error);
            return null;
          }
        };
        
        // Get dates from new template format
        const targetDateValue = parseExcelDate(row['Target Invoice Date']);
        const actualInvoiceDate = parseExcelDate(row['Actual Invoice Date']);
        const paymentReceivedDate = parseExcelDate(row['Payment Received Date']);
        
        console.log(`Processing milestone: "${milestoneName}" for project: "${projectNumber}" with status: "${row['Status']}"`);
        console.log(`Raw status from Excel: "${row['Status']}" -> Mapped status: "${mapBillingStatus(row['Status'] || 'upcoming')}"`);
        console.log(`Dates - Target: ${targetDateValue}, Actual Invoice: ${actualInvoiceDate}, Payment Received: ${paymentReceivedDate}`);
        
        return {
          name: milestoneName,
          projectId: null, // Will be looked up by project number in API
          amount: String(amountValue),
          // Use parsed dates from new template format
          targetDate: targetDateValue, 
          invoiceDate: actualInvoiceDate,
          paymentReceivedDate: paymentReceivedDate,
          description: row['Description'] || '',
          // Map status from new template (handles "Billed" and "Billed." → "billed")
          status: mapBillingStatus(row['Status'] || 'upcoming'),
          // Template-specific billing milestone fields
          contractReference: row['Contract Reference'] || '',
          paymentTerms: row['Payment Terms'] || '',
          invoiceNumber: row['Invoice Number'] || '',
          percentageOfTotal: row['Percentage of Total'] || '',
          billingContact: row['Billing Contact'] || '',
          notes: row['Notes'] || '', // Include Notes column as Billing Milestone Note
          // Temporary field to look up project - keep the original project number exactly as is
          _projectNumber: projectNumber
        };
      });

      console.log(`Prepared ${milestones.length} billing milestones for import`);
      
      // Log sample data
      if (milestones.length > 0) {
        console.log('Sample billing milestone data:', milestones[0]);
        console.log('Additional fields included: contractReference, paymentTerms, invoiceNumber, percentageOfTotal, billingContact, notes');
      }
      
      // Filter out any milestone without a project number
      const validMilestones = milestones.filter(m => {
        if (!m._projectNumber) {
          console.warn('Skipping milestone with missing project number:', m.name);
          return false;
        }
        return true;
      });
      
      if (validMilestones.length === 0) {
        throw new Error('No valid billing milestones found with project numbers. Please check your Excel file.');
      }
      
      // Call API to save data
      console.log(`Sending ${validMilestones.length} valid billing milestones to server`);
      const response = await fetch('/api/import/billing-milestones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validMilestones),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server returned error for billing milestone import:', errorData);
        throw new Error(errorData.message || 'Failed to import billing milestones');
      }

      const result = await response.json();
      return {
        success: true,
        message: `Successfully imported ${result.imported} billing milestones`,
        imported: result.imported,
        errors: result.errors,
        details: result.details
      };
    } catch (error) {
      console.error('Process billing data error:', error);
      return {
        success: false,
        message: (error as Error).message,
        errors: data.length,
        details: [(error as Error).message]
      };
    }
  };

  // Process manufacturing bay data from Production Forecast excel
  const processManufacturingData = async (data: any[]): Promise<any> => {
    try {
      // First pass: extract bay information
      const bayRows = data.filter(row => row['Bay'] || row['Bay Number'] || row['Manufacturing Bay']);
      const bayNumbers: string[] = [];
      
      // Extract unique bay numbers
      bayRows.forEach(row => {
        const bayNumber = row['Bay'] || row['Bay Number'] || row['Manufacturing Bay'];
        if (bayNumber && !bayNumbers.includes(String(bayNumber))) {
          bayNumbers.push(String(bayNumber));
        }
      });
      
      // Create manufacturing bays from unique bay numbers
      const manufacturingBays = bayNumbers.map(bayNumber => ({
        name: `Manufacturing Bay ${bayNumber}`,
        bayNumber: parseInt(bayNumber),
        description: `Production bay ${bayNumber}`,
        equipment: '',
        isActive: true
      }));

      // Second pass: extract schedules
      const schedules = data.map(row => {
        const projectNumber = row['Project Number'] || row['Project'] || '';
        const bayNumber = row['Bay'] || row['Bay Number'] || row['Manufacturing Bay'];
        
        return {
          projectId: null, // Will be looked up by project number in API
          bayId: null, // Will be looked up by bay number in API
          startDate: parseExcelDate(row['Start Date'] || row['Begin Date'] || new Date().toISOString()),
          endDate: parseExcelDate(row['End Date'] || row['Completion Date']),
          status: mapManufacturingStatus(row['Status'] || 'scheduled'),
          notes: row['Notes'] || row['Comments'] || '',
          equipment: row['Equipment'] || '',
          staffAssigned: row['Staff'] || row['Team'] || '',
          _projectNumber: projectNumber, // Temporary field to look up project
          _bayNumber: bayNumber // Temporary field to look up bay
        };
      });

      // Call API to save data
      const baysResponse = await fetch('/api/import/manufacturing-bays', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(manufacturingBays),
      });

      if (!baysResponse.ok) {
        const errorData = await baysResponse.json();
        throw new Error(errorData.message || 'Failed to import manufacturing bays');
      }

      const schedulesResponse = await fetch('/api/import/manufacturing-schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(schedules),
      });

      if (!schedulesResponse.ok) {
        const errorData = await schedulesResponse.json();
        throw new Error(errorData.message || 'Failed to import manufacturing schedules');
      }

      const baysResult = await baysResponse.json();
      const schedulesResult = await schedulesResponse.json();
      
      return {
        success: true,
        message: `Successfully imported ${baysResult.imported} bays and ${schedulesResult.imported} schedules`,
        imported: baysResult.imported + schedulesResult.imported,
        errors: baysResult.errors + schedulesResult.errors,
        details: [...(baysResult.details || []), ...(schedulesResult.details || [])]
      };
    } catch (error) {
      console.error('Process manufacturing data error:', error);
      return {
        success: false,
        message: (error as Error).message,
        errors: data.length,
        details: [(error as Error).message]
      };
    }
  };
  
  // Process delivery tracking data from On Time Delivery Excel
  const processDeliveryData = async (data: any[]): Promise<any> => {
    try {
      // Clean and validate data
      const deliveryTracking = data.map(row => {
        const projectNumber = row['Project Number'] || '';
        const projectName = row['Project Name'] || '';
        
        // Determine responsibility based on 'X' markers or similar
        let delayResponsibility = 'not_applicable';
        
        if (row['Late due to: Client'] && 
            (row['Late due to: Client'] === 'X' || row['Late due to: Client'] === 'x' || row['Late due to: Client'] === true)) {
          delayResponsibility = 'client_fault';
        } else if (row['Late due to: Nomad'] && 
                  (row['Late due to: Nomad'] === 'X' || row['Late due to: Nomad'] === 'x' || row['Late due to: Nomad'] === true)) {
          delayResponsibility = 'nomad_fault';
        } else if (row['Late due to: Vendor'] && 
                  (row['Late due to: Vendor'] === 'X' || row['Late due to: Vendor'] === 'x' || row['Late due to: Vendor'] === true)) {
          delayResponsibility = 'vendor_fault';
        }
        
        // Convert days late from number to integer
        let daysLate: number | null = null;
        if (row['# of days pre/post contract'] !== undefined && row['# of days pre/post contract'] !== null) {
          daysLate = parseInt(String(row['# of days pre/post contract']));
          if (isNaN(daysLate)) daysLate = 0;
          
          // Negative number means early delivery, which is not late
          if (daysLate < 0) daysLate = 0;
        }
        
        return {
          projectId: null, // Will be looked up by project number or name in API
          originalEstimatedDate: parseExcelDate(row['Original Contract Date']),
          revisedEstimatedDate: parseExcelDate(row['# of Formal Extensions (Final Contract Date)']),
          actualDeliveryDate: parseExcelDate(row['Actual Delivery Date']),
          daysLate: daysLate,
          delayResponsibility: delayResponsibility,
          delayReason: row['Category'] || '',
          delayNotes: row['Late Reasoning'] || '',
          _projectNumber: projectNumber, // Temporary field to look up project
          _projectName: projectName     // Backup for project lookup
        };
      });

      // Call API to save data
      const response = await fetch('/api/import/delivery-tracking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deliveryTracking),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to import delivery tracking data');
      }

      const result = await response.json();
      return {
        success: true,
        message: `Successfully imported ${result.imported} delivery tracking entries`,
        imported: result.imported,
        errors: result.errors,
        details: result.details
      };
    } catch (error) {
      console.error('Process delivery tracking data error:', error);
      return {
        success: false,
        message: (error as Error).message,
        errors: data.length,
        details: [(error as Error).message]
      };
    }
  };

  // Helper function to convert values to integers
  const convertToInteger = (value: any): number | null => {
    if (value === null || value === undefined || value === '') return null;
    
    // If it's already a number, return it
    if (typeof value === 'number') return Math.floor(value);
    
    // Convert string to number
    const str = String(value).trim();
    
    // Remove percentage sign if present
    const cleanStr = str.replace('%', '').trim();
    
    // Try to parse the number
    const num = parseFloat(cleanStr);
    
    // Return null if parsing failed, otherwise return the integer
    return isNaN(num) ? null : Math.floor(num);
  };

  // Process engineering assignment data
  const processEngineeringData = async (data: any[]): Promise<any> => {
    try {
      // Clean and validate data
      const engineeringAssignments = data.map(row => {
        const projectNumber = row['Project Number'] || '';
        
        return {
          projectNumber: projectNumber,
          meEngineer: row['ME Engineer'] || row['ME Assigned'] || null,
          eeEngineer: row['EE Engineer'] || row['EE Assigned'] || null,
          iteEngineer: row['ITE Engineer'] || row['ITE Assigned'] || null,
          meCompletionPercent: convertToInteger(row['ME Completion %'] || row['ME %'] || null),
          eeCompletionPercent: convertToInteger(row['EE Completion %'] || row['EE %'] || null),
          iteCompletionPercent: convertToInteger(row['ITE Completion %'] || row['ITE %'] || null),
        };
      }).filter(row => row.projectNumber); // Only include rows with project numbers

      // Call API to save data
      const response = await fetch('/api/import/engineering', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(engineeringAssignments),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to import engineering assignments');
      }

      const result = await response.json();
      return {
        success: true,
        message: result.message || `Successfully imported ${result.imported} engineering assignments`,
        imported: result.imported,
        errors: result.errors,
        details: result.details
      };
    } catch (error) {
      console.error('Process engineering data error:', error);
      return {
        success: false,
        message: (error as Error).message,
        errors: data.length,
        details: [(error as Error).message]
      };
    }
  };

  // Helper function to convert Excel date to ISO string
  const parseExcelDate = (excelDate: any): string | null => {
    if (!excelDate) return null;
    
    try {
      // Handle Excel serial date format
      if (typeof excelDate === 'number') {
        // Excel dates are number of days since 1900-01-01
        // But Excel incorrectly thinks 1900 was a leap year, so adjust for dates after Feb 28, 1900
        const date = new Date((excelDate - (excelDate > 59 ? 1 : 0) - 25569) * 86400 * 1000);
        return date.toISOString();
      }
      
      // Handle string date format with various formats
      if (typeof excelDate === 'string') {
        // Check if it's MM/DD/YYYY format
        if (excelDate.includes('/')) {
          const parts = excelDate.split('/');
          if (parts.length === 3) {
            // Parse using explicit base 10 to avoid octal interpretation of leading zeros
            const month = parseInt(parts[0], 10);
            const day = parseInt(parts[1], 10);
            const year = parseInt(parts[2], 10);
            
            // Create date (month is 0-indexed in JS Date)
            const date = new Date(year, month - 1, day);
            return date.toISOString();
          }
        }
        
        // Check if it's YYYY-MM-DD format
        if (excelDate.includes('-')) {
          const parts = excelDate.split('-');
          if (parts.length === 3) {
            // Parse using explicit base 10 to avoid octal interpretation of leading zeros
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            const day = parseInt(parts[2], 10);
            
            // Create date (month is 0-indexed in JS Date)
            const date = new Date(year, month - 1, day);
            return date.toISOString();
          }
        }
        
        // Default date parsing fallback
        const date = new Date(excelDate);
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      }
      
      // Handle JavaScript Date object
      if (excelDate instanceof Date) {
        return excelDate.toISOString();
      }
      
      return null;
    } catch (error) {
      console.error('Error parsing date:', excelDate, error);
      return null;
    }
  };

  // Map status strings to our enum values
  const mapProjectStatus = (status: string): string => {
    if (!status) return 'active';
    
    status = status.toLowerCase();
    
    if (status.includes('complete')) return 'completed';
    if (status.includes('active')) return 'active';
    if (status.includes('delay')) return 'delayed';
    if (status.includes('critic')) return 'critical';
    if (status.includes('archive')) return 'archived';
    
    return 'active';
  };

  const mapBillingStatus = (status: string): string => {
    if (!status) return 'upcoming';
    
    // Clean the status - remove dots and normalize case
    const cleanStatus = status.toLowerCase().trim().replace('.', '');
    
    if (cleanStatus.includes('paid')) return 'paid';
    if (cleanStatus.includes('invoice')) return 'invoiced';
    if (cleanStatus === 'billed') return 'billed'; // Map "Billed" and "Billed." to "billed" status
    if (cleanStatus.includes('delay')) return 'delayed';
    if (cleanStatus.includes('upcoming')) return 'upcoming';
    
    return 'upcoming';
  };

  const mapManufacturingStatus = (status: string): string => {
    if (!status) return 'scheduled';
    
    status = status.toLowerCase();
    
    if (status.includes('complete')) return 'complete';
    if (status.includes('progress')) return 'in_progress';
    if (status.includes('maintenance')) return 'maintenance';
    if (status.includes('schedul')) return 'scheduled';
    
    return 'scheduled';
  };

  // Download template function
  const downloadTemplate = (type: string) => {
    let template: any[] = [];
    let filename = '';

    switch (type) {
      case 'projects':
        // Create a template that matches the exact format of the Excel file shown in the screenshot
        template = [
          { 
            'Location': '804924_OK_LawtonFD_IC34As4',  // This field contains the project number in the format shown in screenshot
            'Team': 'FSW',  // Team values like 'FSW', 'JC/BH', etc.
            'Project': 'Wildland/Brush/Type 6/Flatbed Replacement', // Project description
            'Project Status': 'MINOR ISSUE',  // Status like 'MINOR ISSUE', 'GOOD', etc.
            'PM': 'Matt',  // PM full name like Matt, Jason, etc.
            'Team Owner': 'Joe Smith',  // Team owner name
            'Percent Complete': 0,  // Numeric percentage
            'Number of Days': 150,  // Number of days numeric
            'Wrap': '4/24/2025',  // Date format MM/DD/YYYY for all dates
            'NTC Testing': '4/27/2025',
            'QC START': '5/1/2025',
            'QC DAYS': 4,  // Numeric value
            'EXECUTIVE REVIEW': '5/8/2025',
            'Ship': '5/12/2025',
            'Delivery': '5/13/2025',
            'Contract Date': '1/15/2024',
            'Chassis ETA': '2/28/2024',
            'ME Assigned': 'Bob Johnson',
            'ME Design / Orders %': 100,
            'EE Assigned': 'Sarah Miller',
            'EE Design / Orders %': 100,
            'ITE Assigned': 'Mark Wilson',
            'IT Design / Orders %': 90,
            'NTC Design / Orders %': 75,
            'Fabrication Start': '3/15/2024',
            'Assembly Start': '4/1/2024',
            'Start Date': '2024-01-15',
            'DPAS Rating': 'DX',
            'Stretch / Shorten / Gears': 'Yes',
            'LLTs Ordered': 'Yes'
          }
        ];
        filename = 'tier4_project_import_template.xlsx';
        break;
      case 'billing':
        template = [
          { 
            'Project Number': 'T4-2024-001', 
            'Milestone': 'Design Phase Complete', 
            'Amount': 50000, 
            'Target Invoice Date': '2024-03-15', 
            'Actual Invoice Date': '2024-03-17',
            'Payment Received Date': '2024-04-12',
            'Status': 'paid', 
            'Description': 'Initial design phase completion milestone',
            'Contract Reference': 'CON-2024-113',
            'Payment Terms': 'Net 30',
            'Invoice Number': 'INV-2024-0042',
            'Percentage of Total': 25,
            'Billing Contact': 'Jane Smith',
            'Notes': 'Client requested invoice modification before payment'
          },
          { 
            'Project Number': 'T4-2024-001', 
            'Milestone': 'Equipment Delivery', 
            'Amount': 75000, 
            'Target Invoice Date': '2024-04-30', 
            'Actual Invoice Date': '',
            'Payment Received Date': '',
            'Status': 'upcoming', 
            'Description': 'Delivery of all manufacturing equipment',
            'Contract Reference': 'CON-2024-113',
            'Payment Terms': 'Net 30',
            'Invoice Number': '',
            'Percentage of Total': 37.5,
            'Billing Contact': 'Jane Smith',
            'Notes': 'Equipment order placed with vendor'
          }
        ];
        filename = 'billing_milestones_template.xlsx';
        break;
      case 'manufacturing':
        template = [
          { 
            'Project Number': 'T4-2024-001', 
            'Bay': 3, 
            'Start Date': '2024-05-01', 
            'End Date': '2024-05-15', 
            'Status': 'scheduled', 
            'Equipment': 'CNC Mill, Robotic Arm', 
            'Staff Assigned': 'Engineering Team A',
            'Materials': 'Aluminum Alloy, Steel Components',
            'Dependencies': 'Equipment Delivery',
            'Priority': 'High',
            'Production Phase': 'Initial Assembly',
            'QA Requirements': 'ISO 9001 Standards',
            'Notes': 'Special handling required for sensitive components' 
          },
          { 
            'Project Number': 'T4-2024-001', 
            'Bay': 2, 
            'Start Date': '2024-05-16', 
            'End Date': '2024-05-30', 
            'Status': 'scheduled', 
            'Equipment': 'Testing Equipment Suite, Calibration Tools', 
            'Staff Assigned': 'QA Team B',
            'Materials': 'Test Materials',
            'Dependencies': 'Initial Assembly',
            'Priority': 'Medium',
            'Production Phase': 'Testing and Calibration',
            'QA Requirements': 'Full System Test',
            'Notes': 'Client representative will be present during final testing' 
          }
        ];
        filename = 'manufacturing_schedule_template.xlsx';
        break;
      
      case 'bay-scheduling':
        template = [
          {
            'Project Number': 'T4-2024-001',
            'Production Start Date': '5/1/2024',
            'End Date': '5/15/2024',
            'Team Number': 1
          },
          {
            'Project Number': 'T4-2024-002',
            'Production Start Date': '5/16/2024',
            'End Date': '5/30/2024',
            'Team Number': 2
          }
        ];
        filename = 'bay_scheduling_import_template.csv';
        // Generate CSV directly for this template
        const csvContent = [
          'Project Number,Production Start Date,End Date,Team Number', // CSV Header
          ...template.map(row => 
            `${row['Project Number']},${row['Production Start Date']},${row['End Date']},${row['Team Number']}`
          )
        ].join('\n');
        
        const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
        saveAs(csvBlob, filename);
        
        toast({
          title: "Template Downloaded",
          description: `The bay scheduling import template has been downloaded.`,
        });
        
        return; // Exit early as we've already handled the file saving

      case 'delivery':
        template = [
          {
            'Project Name': 'Wildland/Brush/Type 6/Flatbed Replacement',
            'Project Number': '804924_OK_LawtonFD_IC34As4',
            'Original Contract Date': '1/15/2024',
            '# of Formal Extensions (Final Contract Date)': '2/15/2024',
            'Actual Delivery Date': '2/10/2024',
            '# of days pre/post contract': -5,
            'Category': 'Vehicle Type A',
            'Late due to: Client': '',
            'Late due to: Nomad': '',
            'Late due to: Vendor': '',
            'Late Reasoning': ''
          },
          {
            'Project Name': 'Custom Command Vehicle',
            'Project Number': '805121_TX_DallasFD_Command1',
            'Original Contract Date': '2/1/2024',
            '# of Formal Extensions (Final Contract Date)': '3/1/2024',
            'Actual Delivery Date': '3/15/2024',
            '# of days pre/post contract': 14,
            'Category': 'Command Vehicle',
            'Late due to: Client': '',
            'Late due to: Nomad': 'X',
            'Late due to: Vendor': '',
            'Late Reasoning': 'Production delays due to staffing issues'
          }
        ];
        filename = 'on_time_delivery_template.xlsx';
        break;
      
      case 'engineering':
        template = [
          {
            'Project Number': '804924',
            'ME Engineer': 'John Smith',
            'EE Engineer': 'Jane Doe',
            'ITE Engineer': 'Bob Johnson',
            'ME Completion %': 75,
            'EE Completion %': 100,
            'ITE Completion %': 50
          },
          {
            'Project Number': '805040',
            'ME Engineer': 'Jason Vryhof',
            'EE Engineer': 'Sarah Williams',
            'ITE Engineer': 'Mike Brown',
            'ME Completion %': 100,
            'EE Completion %': 90,
            'ITE Completion %': 80
          }
        ];
        filename = 'engineering_assignments_template.xlsx';
        break;
    }

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(template);
    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    
    // Generate xlsx file and save
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, filename);
    
    toast({
      title: "Template Downloaded",
      description: `The ${type} import template has been downloaded.`,
    });
  };

  return (
    <div className="container mx-auto py-6 max-w-7xl px-4 sm:px-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Import Project Data</h1>
          <ModuleHelpButton moduleId="import" helpContent={importDataHelpContent} />
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Data Import Tool</CardTitle>
          <CardDescription>
            Import project, billing, and bay scheduling data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="projects" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-5 mb-6">
              <TabsTrigger value="projects">Tier IV Projects</TabsTrigger>
              <TabsTrigger value="billing">Billing Milestones</TabsTrigger>
              <TabsTrigger value="bay-scheduling">Bay Scheduling</TabsTrigger>
              <TabsTrigger value="delivery">On Time Delivery</TabsTrigger>
              <TabsTrigger value="engineering">Engineering</TabsTrigger>
            </TabsList>
            
            <TabsContent value="projects">
              <div className="space-y-4">
                <div>
                  <h3 className="text-md font-medium mb-2">Import Project Data</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Upload your Tier IV Projects Excel file to import project data.
                    The file should contain project names, numbers, dates, and status information.
                  </p>
                  
                  <div className="flex justify-between items-center gap-4">
                    <div className="flex-1">
                      <Label htmlFor="project-file" className="mb-2 block">Select Project Excel File</Label>
                      <Input 
                        id="project-file" 
                        type="file" 
                        accept=".xlsx,.xls" 
                        onChange={(e) => handleFileUpload(e, 'projects')}
                        disabled={isUploading}
                        className="cursor-pointer"
                      />
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => downloadTemplate('projects')}
                    >
                      <Download className="mr-2 h-4 w-4" /> Template
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="billing">
              <div className="space-y-4">
                <div>
                  <h3 className="text-md font-medium mb-2">Import Billing Milestone Data</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Upload your Future Billing Milestones Excel file to import billing data.
                    The file should contain project numbers, milestone descriptions, amounts, and dates.
                  </p>
                  
                  <div className="flex justify-between items-center gap-4">
                    <div className="flex-1">
                      <Label htmlFor="billing-file" className="mb-2 block">Select Billing Excel File</Label>
                      <Input 
                        id="billing-file" 
                        type="file" 
                        accept=".xlsx,.xls" 
                        onChange={(e) => handleFileUpload(e, 'billing')}
                        disabled={isUploading}
                        className="cursor-pointer"
                      />
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => downloadTemplate('billing')}
                    >
                      <Download className="mr-2 h-4 w-4" /> Template
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
            

            <TabsContent value="bay-scheduling">
              <div className="space-y-4">
                <div>
                  <h3 className="text-md font-medium mb-2">Import Bay Scheduling Data</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Upload CSV data to place projects in manufacturing bays with specific start and end dates.
                    This tool handles date formats safely and properly assigns projects to bays.
                  </p>
                  
                  {/* Integrate BaySchedulingImport component */}
                  <BaySchedulingImport />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="delivery">
              <div className="space-y-4">
                <div>
                  <h3 className="text-md font-medium mb-2">Import On Time Delivery Tracking Data</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Upload your On Time Delivery Tracking Excel file to import delivery performance data.
                    The file should contain project details, contract dates, and reasons for any delivery delays.
                  </p>
                  
                  <div className="flex justify-between items-center gap-4">
                    <div className="flex-1">
                      <Label htmlFor="delivery-file" className="mb-2 block">Select Delivery Tracking Excel File</Label>
                      <Input 
                        id="delivery-file" 
                        type="file" 
                        accept=".xlsx,.xls" 
                        onChange={(e) => handleFileUpload(e, 'delivery')}
                        disabled={isUploading}
                        className="cursor-pointer"
                      />
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => downloadTemplate('delivery')}
                    >
                      <Download className="mr-2 h-4 w-4" /> Template
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="engineering">
              <div className="space-y-4">
                <div>
                  <h3 className="text-md font-medium mb-2">Import Engineering Assignments</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Upload an Excel file containing project numbers and assigned engineers.
                    Engineers not found in the system will be automatically created and marked as OFFLINE/NOT REGISTERED.
                  </p>
                  
                  <div className="flex justify-between items-center gap-4">
                    <div className="flex-1">
                      <Label htmlFor="engineering-file" className="mb-2 block">Select Engineering Assignments Excel File</Label>
                      <Input 
                        id="engineering-file" 
                        type="file" 
                        accept=".xlsx,.xls,.csv" 
                        onChange={(e) => handleFileUpload(e, 'engineering')}
                        disabled={isUploading}
                        className="cursor-pointer"
                      />
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => downloadTemplate('engineering')}
                    >
                      <Download className="mr-2 h-4 w-4" /> Template
                    </Button>
                  </div>
                  
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <h4 className="font-medium text-sm mb-2">Expected Format:</h4>
                    <ul className="text-xs space-y-1 text-gray-600 dark:text-gray-400">
                      <li>• Project Number (required)</li>
                      <li>• ME Engineer (full name)</li>
                      <li>• EE Engineer (full name)</li>
                      <li>• ITE Engineer (full name)</li>
                      <li>• ME Completion % (optional)</li>
                      <li>• EE Completion % (optional)</li>
                      <li>• ITE Completion % (optional)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          {isUploading && (
            <div className="mt-6 space-y-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium">Importing data...</span>
                <span className="text-sm">{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
          )}
          
          {importResults && (
            <Alert className={`mt-6 ${importResults.success ? 'bg-success/20 border-success' : 'bg-destructive/20 border-destructive'}`}>
              {importResults.success ? (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ) : (
                <AlertCircle className="h-5 w-5 text-destructive" />
              )}
              <AlertTitle>{importResults.success ? 'Import Successful' : 'Import Failed'}</AlertTitle>
              <AlertDescription>
                <p>{importResults.message}</p>
                {importResults.details && importResults.details.length > 0 && (
                  <div className="mt-2">
                    <details>
                      <summary className="cursor-pointer text-sm">View Details</summary>
                      <ul className="mt-2 text-xs space-y-1 list-disc pl-4">
                        {importResults.details.map((detail, idx) => (
                          <li key={idx}>{detail}</li>
                        ))}
                      </ul>
                    </details>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="border-t p-4 flex justify-between">
          <div className="text-sm text-gray-500">
            Data will be validated and normalized during import.
            Existing items may be updated if they match by ID or project number.
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ImportDataPage;