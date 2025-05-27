import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  FileSpreadsheet, 
  Download, 
  AlertCircle, 
  CheckCircle,
  Info,
  FileText
} from 'lucide-react';

interface ProjectCostImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
}

export function ProjectCostImport({
  open,
  onOpenChange,
  projectId,
}: ProjectCostImportProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importResults, setImportResults] = useState<any>(null);

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', projectId.toString());
      
      const res = await apiRequest('POST', '/api/project-costs/import', formData);
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to import project costs');
      }
      return res.json();
    },
    onSuccess: (data) => {
      setImportResults(data);
      toast({
        title: "Import Complete",
        description: `Successfully imported project cost data`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/costs`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const downloadTemplateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('GET', '/api/project-costs/template');
      
      if (!res.ok) {
        throw new Error('Failed to download template');
      }
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'project-cost-template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Template Downloaded",
        description: "Project cost template downloaded successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Download Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImportResults(null);
    }
  };

  const handleImport = () => {
    if (selectedFile) {
      importMutation.mutate(selectedFile);
    }
  };

  const handleDownloadTemplate = () => {
    downloadTemplateMutation.mutate();
  };

  const resetImport = () => {
    setSelectedFile(null);
    setImportResults(null);
    setUploadProgress(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Project Costs
          </DialogTitle>
          <DialogDescription>
            Import project cost data from Excel spreadsheets
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload">Upload File</TabsTrigger>
            <TabsTrigger value="template">Template</TabsTrigger>
            <TabsTrigger value="instructions">Instructions</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            {!importResults ? (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Upload Cost Data</CardTitle>
                    <CardDescription>
                      Select an Excel file containing project cost information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="cost-file">Select Excel File</Label>
                      <Input
                        id="cost-file"
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileSelect}
                        disabled={importMutation.isPending}
                      />
                      {selectedFile && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <FileSpreadsheet className="h-4 w-4" />
                          <span>{selectedFile.name}</span>
                          <Badge variant="outline">
                            {(selectedFile.size / 1024).toFixed(1)} KB
                          </Badge>
                        </div>
                      )}
                    </div>

                    {importMutation.isPending && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Importing...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <Progress value={uploadProgress} className="w-full" />
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Expected File Format</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <p>Your Excel file should contain the following columns:</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {[
                          'Overall Cost', 'Section X', 'Section B', 'Section A',
                          'Section C', 'Section D', 'Section E', 'Section F',
                          'Section G', 'Section H', 'Section I', 'Section J',
                          'Section T', 'Section L', 'Section N', 'Section Q',
                          'Section U', 'Notes'
                        ].map((column) => (
                          <Badge key={column} variant="outline" className="text-xs">
                            {column}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-gray-500 mt-2">
                        Download the template to ensure proper formatting
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Import Results
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {importResults.success || 0}
                      </div>
                      <div className="text-sm text-green-700">Records Imported</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">
                        {importResults.warnings || 0}
                      </div>
                      <div className="text-sm text-yellow-700">Warnings</div>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">
                        {importResults.errors || 0}
                      </div>
                      <div className="text-sm text-red-700">Errors</div>
                    </div>
                  </div>

                  {importResults.details && importResults.details.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Import Details:</h4>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {importResults.details.map((detail: string, index: number) => (
                          <div key={index} className="text-sm text-gray-600 flex items-start gap-2">
                            <Info className="h-3 w-3 mt-1 flex-shrink-0" />
                            <span>{detail}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button onClick={resetImport} variant="outline">
                      Import Another File
                    </Button>
                    <Button onClick={() => onOpenChange(false)}>
                      Close
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="template" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Download Template</CardTitle>
                <CardDescription>
                  Get the Excel template with proper formatting for project costs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-8">
                  <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Excel Template</h3>
                  <p className="text-gray-500 mb-4">
                    Download the template to ensure your data is formatted correctly
                  </p>
                  <Button
                    onClick={handleDownloadTemplate}
                    disabled={downloadTemplateMutation.isPending}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {downloadTemplateMutation.isPending ? 'Downloading...' : 'Download Template'}
                  </Button>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Template Includes:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Pre-formatted columns for all cost sections</li>
                    <li>• Data validation rules</li>
                    <li>• Example data and formulas</li>
                    <li>• Instructions worksheet</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="instructions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Import Instructions</CardTitle>
                <CardDescription>
                  Follow these guidelines for successful import
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium mb-2">File Format Requirements:</h4>
                    <ul className="text-sm text-gray-600 space-y-1 ml-4">
                      <li>• Excel format (.xlsx or .xls)</li>
                      <li>• First row must contain column headers</li>
                      <li>• Numeric values for all cost sections</li>
                      <li>• Use decimal format for currency (e.g., 1234.56)</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Column Mapping:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <strong>Required Columns:</strong>
                        <ul className="text-gray-600 ml-4">
                          <li>• Overall Cost (optional if using sections)</li>
                          <li>• Section X through Section U</li>
                        </ul>
                      </div>
                      <div>
                        <strong>Optional Columns:</strong>
                        <ul className="text-gray-600 ml-4">
                          <li>• Notes</li>
                          <li>• Use Overall Cost Only (true/false)</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Section Definitions:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      <div className="space-y-1">
                        <div><Badge variant="outline">X</Badge> General/Miscellaneous</div>
                        <div><Badge variant="outline">B</Badge> Basic Components</div>
                        <div><Badge variant="outline">A</Badge> Advanced Systems</div>
                        <div><Badge variant="outline">C</Badge> Control Systems</div>
                        <div><Badge variant="outline">D</Badge> Drive Systems</div>
                        <div><Badge variant="outline">E</Badge> Electrical</div>
                        <div><Badge variant="outline">F</Badge> Fabrication</div>
                        <div><Badge variant="outline">G</Badge> Gear Systems</div>
                      </div>
                      <div className="space-y-1">
                        <div><Badge variant="outline">H</Badge> Hydraulics</div>
                        <div><Badge variant="outline">I</Badge> Installation</div>
                        <div><Badge variant="outline">J</Badge> Jigs & Fixtures</div>
                        <div><Badge variant="outline">T</Badge> Testing</div>
                        <div><Badge variant="outline">L</Badge> Labor</div>
                        <div><Badge variant="outline">N</Badge> Non-Standard</div>
                        <div><Badge variant="outline">Q</Badge> Quality Control</div>
                        <div><Badge variant="outline">U</Badge> Utilities</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                      <div className="text-sm">
                        <strong className="text-yellow-800">Important:</strong>
                        <p className="text-yellow-700">
                          Importing will overwrite existing cost data for this project. 
                          Make sure to backup your current data if needed.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {!importResults && (
            <Button
              onClick={handleImport}
              disabled={!selectedFile || importMutation.isPending}
            >
              {importMutation.isPending ? 'Importing...' : 'Import Costs'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}