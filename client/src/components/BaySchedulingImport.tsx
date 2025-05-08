import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, FileDown, Upload, Check, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
// Inline template instead of importing CSV file
const templateCsvContent = `projectNumber,productionStartDate,endDate,teamNumber,totalHours
804205,06/01/2025,07/15/2025,1,1200
804206,,08/01/2025,2,850
804207,07/01/2025,08/15/2025,3,1500
804208,07/15/2025,09/01/2025,,2000`;

// Utility function to safely convert date string to ISO format, preventing octal literal issues
const safeDateToISOString = (dateString?: string): string | undefined => {
  // Handle empty or undefined date strings
  if (!dateString || dateString === '') {
    return undefined;
  }
  
  // Handle different date formats
  let year, month, day;
  
  // Prioritize MM/DD/YYYY format (preferred format)
  if (dateString.includes('/')) {
    const parts = dateString.split('/');
    if (parts.length !== 3) {
      throw new Error(`Invalid MM/DD/YYYY date format: ${dateString}`);
    }
    month = parseInt(parts[0], 10); // Always use base 10 to prevent octal issues
    day = parseInt(parts[1], 10);
    year = parseInt(parts[2], 10);
  } 
  // Handle YYYY-MM-DD format as fallback
  else if (dateString.includes('-')) {
    const parts = dateString.split('-');
    if (parts.length !== 3) {
      throw new Error(`Invalid YYYY-MM-DD date format: ${dateString}`);
    }
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    day = parseInt(parts[2], 10);
  } else {
    throw new Error(`Invalid date format: ${dateString}. Please use MM/DD/YYYY format.`);
  }
  
  // Validate date components
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    throw new Error(`Invalid date components: year=${year}, month=${month}, day=${day}`);
  }
  
  // Validate date ranges
  if (month < 1 || month > 12) {
    throw new Error(`Invalid month value: ${month}. Month must be between 1 and 12.`);
  }
  
  // Check days in month (accounting for leap years)
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) {
    throw new Error(`Invalid day: ${day} for month: ${month}. Day must be between 1 and ${daysInMonth}.`);
  }
  
  // JavaScript months are 0-indexed, so we subtract 1 from the month
  const date = new Date(year, month - 1, day);
  
  // Check if the date is valid by comparing the components
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error(`Invalid date: ${dateString} (parsed as ${date.toISOString()})`);
  }
  
  return date.toISOString();
};

/**
 * Interface representing the data structure for bay scheduling import
 * - projectNumber: Required - The unique identifier for the project
 * - endDate: Required - The scheduled ship/completion date for the project
 * - productionStartDate: Optional - When production starts; calculated from endDate if missing
 * - teamNumber: Optional - The bay/team assigned; projects without teamNumber stay unassigned
 * - totalHours: Optional - Total labor hours; updates master project data if provided
 */
interface ImportData {
  projectNumber: string;
  endDate: string;
  productionStartDate?: string;
  teamNumber?: number;
  totalHours?: number;
}

const BaySchedulingImport: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importResults, setImportResults] = useState<{
    success?: boolean;
    message?: string;
    imported?: number;
    errors?: number;
    details?: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Function to download the template CSV file
  const handleDownloadTemplate = () => {
    // Create a blob from our inline template
    const blob = new Blob([templateCsvContent], { type: 'text/csv;charset=utf-8' });
    
    // Create an object URL for the blob
    const url = URL.createObjectURL(blob);
    
    // Create an anchor element and trigger a download
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bay-scheduling-import-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Release the object URL
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Template downloaded',
      description: 'Use this template to prepare your bay scheduling data for import.',
    });
  };

  // Function to handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        toast({
          title: 'Invalid file type',
          description: 'Please upload a CSV file.',
          variant: 'destructive',
        });
        return;
      }
      setFile(selectedFile);
      setImportResults(null); // Clear previous results
    }
  };

  // Function to parse CSV file
  const parseCSV = async (file: File): Promise<ImportData[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const csv = event.target?.result as string;
          const lines = csv.split('\n');
          
          // Extract headers (first line)
          const headers = lines[0].split(',').map(header => header.trim());
          
          // Check required headers (only projectNumber and endDate are truly required)
          const requiredHeaders = ['projectNumber', 'endDate'];
          const optionalHeaders = ['productionStartDate', 'teamNumber', 'totalHours'];
          const missingRequiredHeaders = requiredHeaders.filter(h => !headers.includes(h));
          
          if (missingRequiredHeaders.length > 0) {
            reject(`CSV missing required headers: ${missingRequiredHeaders.join(', ')}`);
            return;
          }
          
          // Check for optional headers and log warnings if any are missing
          const missingOptionalHeaders = optionalHeaders.filter(h => !headers.includes(h));
          if (missingOptionalHeaders.length > 0) {
            console.warn(`CSV missing optional headers: ${missingOptionalHeaders.join(', ')}`);
          }
          
          // Parse data rows
          const schedules: ImportData[] = [];
          
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue; // Skip empty lines
            
            const values = line.split(',').map(value => value.trim());
            if (values.length !== headers.length) {
              continue; // Skip invalid rows
            }
            
            // Create object with properties from headers
            const schedule: any = {};
            headers.forEach((header, index) => {
              schedule[header] = values[index];
            });
            
            // Convert teamNumber to number if present (optional field)
            if (schedule.teamNumber && schedule.teamNumber.trim() !== '') {
              schedule.teamNumber = parseInt(schedule.teamNumber, 10);
              if (isNaN(schedule.teamNumber)) {
                console.warn(`Invalid teamNumber value for project ${schedule.projectNumber}: ${schedule.teamNumber}`);
                schedule.teamNumber = undefined; // Clear invalid value
              }
            } else {
              schedule.teamNumber = undefined; // Empty or missing teamNumber
            }
            
            // Convert totalHours to number if present (optional field)
            if (schedule.totalHours && schedule.totalHours.trim() !== '') {
              schedule.totalHours = parseInt(schedule.totalHours, 10);
              // Validate that totalHours is a positive number
              if (isNaN(schedule.totalHours) || schedule.totalHours <= 0) {
                console.warn(`Invalid totalHours value for project ${schedule.projectNumber}: ${schedule.totalHours}`);
                schedule.totalHours = undefined; // Clear invalid value
              }
            } else {
              schedule.totalHours = undefined; // Empty or missing totalHours
            }
            
            // Validate end date which is required
            if (!isValidDate(schedule.endDate)) {
              console.warn(`Skipping row with invalid endDate: ${schedule.projectNumber}`);
              continue; // Skip invalid endDate
            }
            
            // Validate productionStartDate which is optional
            if (schedule.productionStartDate && !isValidDate(schedule.productionStartDate)) {
              console.warn(`Invalid productionStartDate for project ${schedule.projectNumber}: ${schedule.productionStartDate}`);
              schedule.productionStartDate = undefined;
            }
            
            // Use our safe date parsing to ensure dates are in correct ISO format
            if (schedule.productionStartDate) {
              schedule.productionStartDate = safeDateToISOString(schedule.productionStartDate);
            }
            schedule.endDate = safeDateToISOString(schedule.endDate);
            
            schedules.push(schedule as ImportData);
          }
          
          resolve(schedules);
        } catch (error) {
          reject(`Failed to parse CSV: ${error instanceof Error ? error.message : String(error)}`);
        }
      };
      
      reader.onerror = () => reject('Error reading file');
      reader.readAsText(file);
    });
  };

  // Helper function to validate a date string
  const isValidDate = (dateString?: string): boolean => {
    // Empty string or undefined is valid for optional date fields
    if (!dateString || dateString === '') return true;
    
    // Check YYYY-MM-DD format
    const isoFormat = /^\d{4}-\d{2}-\d{2}$/;
    // Check MM/DD/YYYY format
    const slashFormat = /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12][0-9]|3[01])\/\d{4}$/;
    
    if (!isoFormat.test(dateString) && !slashFormat.test(dateString)) {
      console.warn(`Invalid date format: ${dateString}. Expected YYYY-MM-DD or MM/DD/YYYY`);
      return false;
    }
    
    // Safely parse the date to avoid octal literal issues
    try {
      let year, month, day;
      
      if (dateString.includes('-')) {
        [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));
      } else if (dateString.includes('/')) {
        const parts = dateString.split('/');
        month = parseInt(parts[0], 10); // Always use base 10 to prevent octal issues
        day = parseInt(parts[1], 10);
        year = parseInt(parts[2], 10);
      } else {
        return false;
      }
      
      // Validate the components
      if (month < 1 || month > 12) {
        console.warn(`Invalid month: ${month}`);
        return false;
      }
      
      // Check days in month (allowing for leap years)
      const daysInMonth = new Date(year, month, 0).getDate();
      if (day < 1 || day > daysInMonth) {
        console.warn(`Invalid day: ${day} for month: ${month}`);
        return false;
      }
      
      // JavaScript months are 0-indexed, so we subtract 1 from the month
      const date = new Date(year, month - 1, day);
      
      // Validate result by checking if the components match what we provided
      return (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
      );
    } catch (e) {
      console.error(`Error validating date ${dateString}:`, e);
      return false;
    }
  };

  // Function to handle file upload and import
  const handleImport = async () => {
    if (!file) {
      toast({
        title: 'No file selected',
        description: 'Please select a CSV file to import.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsUploading(true);
    setImportResults(null);
    
    try {
      // Parse the CSV file
      const parsedData = await parseCSV(file);
      
      // Check if we have any valid schedules
      if (parsedData.length === 0) {
        toast({
          title: 'Empty or invalid file',
          description: 'No valid schedules found in the CSV file.',
          variant: 'destructive',
        });
        setIsUploading(false);
        return;
      }
      
      // Send the data to the server
      const response = await apiRequest('POST', '/api/import/bay-scheduling', {
        schedules: parsedData
      });
      
      const result = await response.json();
      
      // Update the UI with the results
      setImportResults(result);
      
      // Show a toast notification
      if (result.success) {
        toast({
          title: 'Import successful',
          description: `Imported ${result.imported} bay schedules.`,
        });
      } else {
        toast({
          title: 'Import failed',
          description: result.message || 'An unknown error occurred.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Import error:', error);
      setImportResults({
        success: false,
        message: error instanceof Error ? error.message : String(error),
      });
      
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Function to reset the form
  const handleReset = () => {
    setFile(null);
    setImportResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle>Bay Scheduling Import</CardTitle>
        <CardDescription>
          Import bay scheduling data from a CSV file to automatically assign projects to manufacturing bays
          with proper bar lengths. Projects will be immediately placed in their respective team bays
          with correct durations based on hours. The import also updates master project dates 
          and team assignments directly from the CSV.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Template download section */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="template">Download Template</Label>
          <p className="text-sm text-muted-foreground">
            Use our template CSV file to prepare your bay scheduling data. The format includes:
            <br />• projectNumber - Required (must match existing project exactly)
            <br />• endDate - Required (ship date in MM/DD/YYYY format, example: 07/15/2025)
            <br />• productionStartDate - Optional (start date in MM/DD/YYYY format, example: 06/01/2025)
            <br />• teamNumber - Optional (numeric team ID, leave blank for unassigned projects)
            <br />• totalHours - Optional (numeric total hours, updates master project data)
          </p>
          <Button 
            variant="outline" 
            onClick={handleDownloadTemplate}
            className="gap-2 mt-2 w-fit"
          >
            <FileDown className="h-4 w-4" />
            Download Template
          </Button>
        </div>
        
        {/* File upload section */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="file">Upload CSV File</Label>
          <Input
            id="file"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={isUploading}
            ref={fileInputRef}
          />
          {file && (
            <p className="text-sm text-muted-foreground">
              Selected file: {file.name} ({Math.round(file.size / 1024)} KB)
            </p>
          )}
        </div>
        
        {/* Import results section */}
        {importResults && (
          <Alert variant={importResults.success ? "default" : "destructive"}>
            <div className="flex items-center gap-2">
              {importResults.success ? (
                <Check className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <AlertTitle>
                {importResults.success ? "Import Successful" : "Import Failed"}
              </AlertTitle>
            </div>
            <AlertDescription>
              {importResults.message}
              
              {importResults.success && importResults.imported && (
                <div className="mt-2">
                  <p>
                    <strong>Imported:</strong> {importResults.imported} schedule(s)
                    {importResults.errors && importResults.errors > 0 && (
                      <span>, <strong>Errors:</strong> {importResults.errors}</span>
                    )}
                  </p>
                </div>
              )}
              
              {/* Error details */}
              {importResults.details && importResults.details.length > 0 && (
                <div className="mt-2">
                  <p className="font-semibold">Error details:</p>
                  <ul className="list-disc pl-5 mt-1 text-sm">
                    {importResults.details.slice(0, 5).map((detail, index) => (
                      <li key={index}>{detail}</li>
                    ))}
                    {importResults.details.length > 5 && (
                      <li>...and {importResults.details.length - 5} more errors</li>
                    )}
                  </ul>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={handleReset} disabled={isUploading}>
          Reset
        </Button>
        <Button 
          onClick={handleImport} 
          disabled={!file || isUploading}
          className={cn("gap-2", isUploading && "opacity-80")}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Import Data
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default BaySchedulingImport;