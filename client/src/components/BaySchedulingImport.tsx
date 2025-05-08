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
import templateCsvPath from '@/templates/bay-scheduling-import-template.csv';

// Utility function to safely convert date string to ISO format, preventing octal literal issues
const safeDateToISOString = (dateString: string): string => {
  const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));
  // JavaScript months are 0-indexed, so we subtract 1 from the month
  const date = new Date(year, month - 1, day);
  return date.toISOString();
};

interface ImportData {
  projectNumber: string;
  productionStartDate: string;
  endDate: string;
  teamNumber: number;
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
    // Create an anchor element and trigger a download
    const link = document.createElement('a');
    link.href = templateCsvPath;
    link.download = 'bay-scheduling-import-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
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
          
          // Check required headers
          const requiredHeaders = ['projectNumber', 'productionStartDate', 'endDate', 'teamNumber'];
          const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
          
          if (missingHeaders.length > 0) {
            reject(`CSV missing required headers: ${missingHeaders.join(', ')}`);
            return;
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
            
            // Convert teamNumber to number
            schedule.teamNumber = parseInt(schedule.teamNumber, 10);
            
            // Validate dates
            if (!isValidDate(schedule.productionStartDate) || !isValidDate(schedule.endDate)) {
              console.warn(`Skipping row with invalid dates: ${schedule.projectNumber}`);
              continue; // Skip invalid dates
            }
            
            // Use our safe date parsing to ensure dates are in correct ISO format
            schedule.productionStartDate = safeDateToISOString(schedule.productionStartDate);
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
  const isValidDate = (dateString: string): boolean => {
    if (!dateString) return false;
    
    // Check format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return false;
    
    // Safely parse the date to avoid octal literal issues
    try {
      const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));
      // JavaScript months are 0-indexed, so we subtract 1 from the month
      const date = new Date(year, month - 1, day);
      
      // Validate result by checking if the components match what we provided
      return (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
      );
    } catch (e) {
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
          Import bay scheduling data from a CSV file to place projects in manufacturing bays
          with proper department allocations.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Template download section */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="template">Download Template</Label>
          <p className="text-sm text-muted-foreground">
            Use our template CSV file to prepare your bay scheduling data, then upload it below.
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