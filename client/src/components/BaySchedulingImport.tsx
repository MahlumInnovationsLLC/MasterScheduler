import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Download, Upload, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useMutation } from '@tanstack/react-query';
import baySchedulingImportTemplate from '../templates/bay-scheduling-import-template.csv';

interface ImportData {
  projectNumber: string;
  productionStartDate: string;
  endDate: string;
  teamNumber: number;
}

const BaySchedulingImport = () => {
  const [file, setFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDownloadTemplate = () => {
    const link = document.createElement('a');
    link.href = baySchedulingImportTemplate;
    link.download = 'bay-scheduling-import-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: 'Template Downloaded',
      description: 'Fill it out and upload to import your scheduling data.',
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setError(null);
    
    // Preview the file
    const reader = new FileReader();
    reader.onload = (event) => {
      if (!event.target?.result) return;
      
      try {
        const contents = event.target.result as string;
        const lines = contents.split('\n').filter(line => 
          line.trim() && !line.startsWith('#')
        );
        
        // Check if there's a header line
        if (lines.length < 2) {
          setError('File must contain a header row and at least one data row');
          return;
        }
        
        const headers = lines[0].split(',').map(h => h.trim());
        const requiredHeaders = ['project_number', 'production_start_date', 'end_date', 'team_number'];
        
        // Validate headers
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        if (missingHeaders.length > 0) {
          setError(`Missing required column headers: ${missingHeaders.join(', ')}`);
          return;
        }
        
        // Parse the data (skip header row)
        const data = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim());
          return {
            projectNumber: values[headers.indexOf('project_number')],
            productionStartDate: values[headers.indexOf('production_start_date')],
            endDate: values[headers.indexOf('end_date')],
            teamNumber: parseInt(values[headers.indexOf('team_number')]) || 0
          };
        });
        
        // Validate data
        const invalidRows = data.filter(row => 
          !row.projectNumber || 
          !row.productionStartDate || 
          !row.endDate || 
          isNaN(row.teamNumber) || 
          row.teamNumber < 1
        );
        
        if (invalidRows.length > 0) {
          setError(`File contains ${invalidRows.length} invalid rows. All fields are required and team number must be a positive number.`);
          return;
        }
        
        setImportPreview(data);
        setShowPreview(true);
      } catch (err) {
        setError('Error parsing file. Please make sure it is a valid CSV file.');
        console.error(err);
      }
    };
    
    reader.readAsText(selectedFile);
  };

  const importMutation = useMutation({
    mutationFn: async (importData: ImportData[]) => {
      const res = await apiRequest('POST', '/api/import/bay-scheduling', {
        schedules: importData
      });
      return await res.json();
    },
    onSuccess: (data) => {
      setFile(null);
      setImportPreview([]);
      setShowPreview(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      queryClient.invalidateQueries({queryKey: ['/api/manufacturing-schedules']});
      queryClient.invalidateQueries({queryKey: ['/api/manufacturing-bays']});
      
      toast({
        title: 'Import Successful',
        description: `Imported ${data.imported} project schedules successfully.`,
      });
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to import bay scheduling data');
      toast({
        title: 'Import Failed',
        description: error.message || 'An error occurred while importing the data.',
        variant: 'destructive',
      });
    }
  });

  const handleImport = () => {
    if (importPreview.length === 0) {
      setError('No valid data to import');
      return;
    }
    
    importMutation.mutate(importPreview);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Bay Scheduling Import</CardTitle>
        <CardDescription>
          Import project schedules by uploading a CSV file with project number, dates, and team assignment.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="grid w-full items-center gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="template">Template</Label>
            <Button variant="outline" onClick={handleDownloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Download CSV Template
            </Button>
          </div>
          
          <div className="flex flex-col gap-2">
            <Label htmlFor="file">Upload File</Label>
            <Input
              id="file"
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleFileChange}
              disabled={importMutation.isPending}
            />
          </div>
        </div>
        
        {showPreview && importPreview.length > 0 && (
          <div className="mt-4">
            <h3 className="text-lg font-medium mb-2">Preview ({importPreview.length} projects)</h3>
            <div className="border rounded-md">
              <div className="grid grid-cols-4 bg-secondary p-2 font-medium">
                <div>Project Number</div>
                <div>Start Date</div>
                <div>End Date</div>
                <div>Team</div>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {importPreview.slice(0, 5).map((item, index) => (
                  <div 
                    key={index} 
                    className="grid grid-cols-4 p-2 hover:bg-gray-900 border-t border-gray-800"
                  >
                    <div>{item.projectNumber}</div>
                    <div>{item.productionStartDate}</div>
                    <div>{item.endDate}</div>
                    <div>{item.teamNumber}</div>
                  </div>
                ))}
                {importPreview.length > 5 && (
                  <div className="p-2 text-center text-gray-400 border-t border-gray-800">
                    ... and {importPreview.length - 5} more items
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => {
            setFile(null);
            setImportPreview([]);
            setShowPreview(false);
            setError(null);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }}
          disabled={importMutation.isPending}
        >
          Cancel
        </Button>
        <Button
          variant="default"
          onClick={handleImport}
          disabled={importMutation.isPending || importPreview.length === 0}
        >
          {importMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Import Data
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default BaySchedulingImport;