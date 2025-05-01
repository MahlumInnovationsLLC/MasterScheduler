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

// Helper function to convert Excel data with column headers
const convertRowsWithHeaders = (
  rows: Record<string, any>[],
  headers: string[]
): Record<string, any>[] => {
  if (!rows || rows.length === 0) return [];
  
  // Clean up headers - remove undefined, null, empty strings
  const cleanHeaders = headers.filter(h => h !== undefined && h !== null && h !== '');
  console.log('Clean headers:', cleanHeaders);
  
  // If no clean headers, return empty array
  if (cleanHeaders.length === 0) {
    console.error('No valid headers found in Excel file');
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
    
    // Debug output for the first few rows
    if (rows.indexOf(row) < 3) {
      console.log(`Processed row ${rows.indexOf(row) + 1}:`, newRow);
    }
    
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
      console.log('Excel header row:', header);
      
      // Use options for more forgiving parsing
      const data = XLSX.utils.sheet_to_json(worksheet, { 
        header: "A", // Use A, B, C as headers initially
        defval: "", // Set default value for empty cells to empty string
        raw: false,   // Convert all values to strings
        blankrows: false // Skip blank rows
      });
      
      // Print the raw data for debugging
      console.log('Raw Excel data (first row):', data.length > 0 ? data[0] : 'No data found');
      
      // Check for completely empty rows (all cells empty or undefined)
      const nonEmptyData = data.filter((row: any) => {
        // Check if any value in the row is non-empty
        return Object.values(row).some(value => value !== null && value !== undefined && value !== '');
      });
      
      console.log(`Filtered out ${data.length - nonEmptyData.length} empty rows`);
      
      if (nonEmptyData.length === 0) {
        throw new Error("No valid data found in the spreadsheet. Please check the file format and try again.");
      }
      
      // Convert header-mapped data
      const headerMappedData = convertRowsWithHeaders(nonEmptyData as Record<string, any>[], header);
      console.log('Processed Excel data (first row):', headerMappedData.length > 0 ? headerMappedData[0] : 'No data mapped');
      
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
      console.log("Processing projects with these fields:", 
        data.length > 0 ? Object.keys(data[0]).join(", ") : "No data");
      
      // Clean and validate data
      const projects = data.map(row => {
        // Try to find project number in multiple possible fields
        const projNumber = row['Proj #'] || row['Project Number'] || row['Project #'] || 
                           row['Number'] || row['Project ID'] || row['ID'] || '';
        
        // Try to find project name in multiple possible fields
        const projName = row['Project'] || row['Project Name'] || row['Name'] || '';
        
        console.log(`Found project: ${projName}, ID: ${projNumber}`);
        
        return {
          name: projName,
          projectNumber: projNumber,
          startDate: parseExcelDate(row['Start Date']) || new Date().toISOString(),
          estimatedCompletionDate: parseExcelDate(row['Completion Date'] || row['Due Date'] || row['Est. Completion']),
          percentComplete: String(row['Progress'] || row['Percent Complete'] || row['Completion %'] || '0'),
          status: mapProjectStatus(row['Status']),
          pmOwnerId: null, // Will be set based on actual user data
          clientName: row['Client'] || row['Customer'] || '',
          description: row['Description'] || row['Notes'] || '',
          notes: row['Notes'] || row['Comments'] || ''
        };
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
      // Clean and validate data
      const milestones = data.map(row => {
        const projectNumber = row['Project Number'] || row['Project'] || '';
        
        return {
          name: row['Milestone'] || row['Billing Item'] || row['Description'],
          projectId: null, // Will be looked up by project number in API
          status: mapBillingStatus(row['Status'] || 'upcoming'),
          amount: String(row['Amount'] || row['Value'] || '0'),
          targetInvoiceDate: parseExcelDate(row['Target Date'] || row['Due Date'] || row['Invoice Date']),
          actualInvoiceDate: parseExcelDate(row['Actual Invoice Date'] || row['Invoice Date']),
          paymentReceivedDate: parseExcelDate(row['Payment Date'] || row['Received Date']),
          description: row['Description'] || row['Notes'] || '',
          _projectNumber: projectNumber // Temporary field to look up project
        };
      });

      // Call API to save data
      const response = await fetch('/api/import/billing-milestones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(milestones),
      });

      if (!response.ok) {
        const errorData = await response.json();
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
      
      // Handle string date format
      if (typeof excelDate === 'string') {
        const date = new Date(excelDate);
        return date.toISOString();
      }
      
      // Handle JavaScript Date object
      if (excelDate instanceof Date) {
        return excelDate.toISOString();
      }
      
      return null;
    } catch {
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
    
    status = status.toLowerCase();
    
    if (status.includes('paid')) return 'paid';
    if (status.includes('invoice')) return 'invoiced';
    if (status.includes('delay')) return 'delayed';
    if (status.includes('upcoming')) return 'upcoming';
    
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
        template = [
          { 
            'Project': 'Example Project',
            'Project Number': 'T4-2024-001',
            'Start Date': '2024-01-15', 
            'Completion Date': '2024-06-30',
            'Percent Complete': 35,
            'Status': 'Active',
            'Client': 'Acme Industries',
            'Description': 'Manufacturing automation system for customer production line',
            'Notes': 'Specialized equipment requirements',
            'Budget': 250000,
            'Team Lead': 'Jane Smith',
            'Priority': 'High',
            'Team Size': 4,
            'Dependencies': 'Material procurement from vendor XYZ',
            'Risk Level': 'Medium',
            'Project Manager': 'John Doe',
            'Contract Type': 'Fixed Price'
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
        <h1 className="text-2xl font-bold">Import Project Data</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Data Import Tool</CardTitle>
          <CardDescription>
            Import project, billing, and manufacturing data from Excel files
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="projects" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 mb-6">
              <TabsTrigger value="projects">Tier IV Projects</TabsTrigger>
              <TabsTrigger value="billing">Billing Milestones</TabsTrigger>
              <TabsTrigger value="manufacturing">Manufacturing Schedule</TabsTrigger>
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
            
            <TabsContent value="manufacturing">
              <div className="space-y-4">
                <div>
                  <h3 className="text-md font-medium mb-2">Import Manufacturing Schedule Data</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Upload your Production Forecast Excel file to import manufacturing bay and schedule data.
                    The file should contain project numbers, bay assignments, and date ranges.
                  </p>
                  
                  <div className="flex justify-between items-center gap-4">
                    <div className="flex-1">
                      <Label htmlFor="manufacturing-file" className="mb-2 block">Select Manufacturing Excel File</Label>
                      <Input 
                        id="manufacturing-file" 
                        type="file" 
                        accept=".xlsx,.xls" 
                        onChange={(e) => handleFileUpload(e, 'manufacturing')}
                        disabled={isUploading}
                        className="cursor-pointer"
                      />
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => downloadTemplate('manufacturing')}
                    >
                      <Download className="mr-2 h-4 w-4" /> Template
                    </Button>
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