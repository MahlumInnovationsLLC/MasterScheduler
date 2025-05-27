import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Download, 
  FileSpreadsheet, 
  FileText, 
  PieChart,
  BarChart3,
  FileImage
} from 'lucide-react';

interface ProjectCostExportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  projectCost: any;
}

export function ProjectCostExport({
  open,
  onOpenChange,
  projectId,
  projectCost,
}: ProjectCostExportProps) {
  const { toast } = useToast();
  const [exportFormat, setExportFormat] = useState('excel');
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeDetails, setIncludeDetails] = useState(true);
  const [includeAnalytics, setIncludeAnalytics] = useState(false);

  const exportMutation = useMutation({
    mutationFn: async (options: any) => {
      const res = await apiRequest('POST', `/api/project-costs/${projectId}/export`, options);
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to export project costs');
      }
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Set filename based on export format
      const extension = exportFormat === 'excel' ? 'xlsx' : 'pdf';
      a.download = `project-${projectId}-costs.${extension}`;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Export Complete",
        description: `Project cost report exported successfully`,
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleExport = () => {
    const options = {
      format: exportFormat,
      includeCharts,
      includeSummary,
      includeDetails,
      includeAnalytics,
    };
    
    exportMutation.mutate(options);
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num || 0);
  };

  const calculateSectionTotal = () => {
    if (!projectCost) return 0;
    
    const sections = [
      'sectionX', 'sectionB', 'sectionA', 'sectionC', 'sectionD', 'sectionE',
      'sectionF', 'sectionG', 'sectionH', 'sectionI', 'sectionJ', 'sectionT',
      'sectionL', 'sectionN', 'sectionQ', 'sectionU'
    ];
    
    return sections.reduce((total, section) => {
      const value = parseFloat(projectCost[section] || '0') || 0;
      return total + value;
    }, 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Project Costs
          </DialogTitle>
          <DialogDescription>
            Generate detailed cost reports in Excel or PDF format
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="format" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="format">Format</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="format" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Export Format</CardTitle>
                <CardDescription>
                  Choose the format for your cost report
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup value={exportFormat} onValueChange={setExportFormat}>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="excel" id="excel" />
                    <div className="flex items-center gap-3 flex-1">
                      <FileSpreadsheet className="h-5 w-5 text-green-600" />
                      <div>
                        <Label htmlFor="excel" className="font-medium">Excel Spreadsheet</Label>
                        <p className="text-sm text-gray-500">
                          Detailed spreadsheet with formulas and multiple worksheets
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="pdf" id="pdf" />
                    <div className="flex items-center gap-3 flex-1">
                      <FileText className="h-5 w-5 text-red-600" />
                      <div>
                        <Label htmlFor="pdf" className="font-medium">PDF Report</Label>
                        <p className="text-sm text-gray-500">
                          Professional report with charts and formatted layout
                        </p>
                      </div>
                    </div>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Report Content</CardTitle>
                <CardDescription>
                  Select what to include in your export
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="summary"
                      checked={includeSummary}
                      onCheckedChange={setIncludeSummary}
                    />
                    <div className="flex items-center gap-2">
                      <PieChart className="h-4 w-4 text-blue-500" />
                      <Label htmlFor="summary">Cost Summary</Label>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 ml-6">
                    Overall cost totals and high-level breakdown
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="details"
                      checked={includeDetails}
                      onCheckedChange={setIncludeDetails}
                    />
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-green-500" />
                      <Label htmlFor="details">Section Details</Label>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 ml-6">
                    Detailed breakdown by cost sections (X, B, A, C, etc.)
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="charts"
                      checked={includeCharts}
                      onCheckedChange={setIncludeCharts}
                    />
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-purple-500" />
                      <Label htmlFor="charts">Charts & Visualizations</Label>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 ml-6">
                    Cost distribution charts and visual analytics
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="analytics"
                      checked={includeAnalytics}
                      onCheckedChange={setIncludeAnalytics}
                    />
                    <div className="flex items-center gap-2">
                      <FileImage className="h-4 w-4 text-orange-500" />
                      <Label htmlFor="analytics">Advanced Analytics</Label>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 ml-6">
                    Cost trends, comparisons, and detailed analysis
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Export Preview</CardTitle>
                <CardDescription>
                  Preview of what will be included in your report
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {projectCost ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">Report Details</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Project ID:</span>
                            <span className="font-medium">{projectId}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Export Format:</span>
                            <span className="font-medium capitalize">{exportFormat}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Cost Mode:</span>
                            <span className="font-medium">
                              {projectCost.useOverallCostOnly ? 'Overall Only' : 'Section Breakdown'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-green-50 rounded-lg">
                        <h4 className="font-medium text-green-900 mb-2">Cost Summary</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Total Cost:</span>
                            <span className="font-medium">
                              {projectCost.useOverallCostOnly ? 
                                formatCurrency(projectCost.overallCost || 0) :
                                formatCurrency(calculateSectionTotal())
                              }
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Sections Used:</span>
                            <span className="font-medium">
                              {projectCost.useOverallCostOnly ? 'N/A' : '16 sections'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-2">Report Will Include:</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {includeSummary && (
                          <div className="flex items-center gap-2 text-green-600">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            Cost Summary
                          </div>
                        )}
                        {includeDetails && (
                          <div className="flex items-center gap-2 text-green-600">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            Section Details
                          </div>
                        )}
                        {includeCharts && (
                          <div className="flex items-center gap-2 text-green-600">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            Charts & Visualizations
                          </div>
                        )}
                        {includeAnalytics && (
                          <div className="flex items-center gap-2 text-green-600">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            Advanced Analytics
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No cost data available to export
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={exportMutation.isPending || !projectCost}
          >
            {exportMutation.isPending ? 'Exporting...' : `Export ${exportFormat.toUpperCase()}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}