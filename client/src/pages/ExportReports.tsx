import React, { useState } from 'react';
import { useNavigate } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { format, subMonths, startOfYear, startOfMonth } from 'date-fns';
import { ArrowLeft, Download, FileType } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/auth';

const ExportReportsPage = () => {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [reportType, setReportType] = useState('financial');
  const [timeRange, setTimeRange] = useState('6months');
  const [isExporting, setIsExporting] = useState(false);

  const { data: projects } = useQuery({
    queryKey: ['/api/projects'],
    queryFn: () => fetch('/api/projects').then(res => res.json()),
    enabled: isAuthenticated,
  });

  // Calculate date range based on selected time range
  const getDateRangeStrings = () => {
    try {
      let startDate = '';
      const now = new Date();
      
      switch (timeRange) {
        case '3months':
          startDate = format(subMonths(now, 3), 'yyyy-MM-dd');
          break;
        case '6months':
          startDate = format(subMonths(now, 6), 'yyyy-MM-dd');
          break;
        case '12months':
          startDate = format(subMonths(now, 12), 'yyyy-MM-dd');
          break;
        case 'ytd':
          startDate = format(startOfYear(now), 'yyyy-MM-dd');
          break;
        case 'mtd':
          startDate = format(startOfMonth(now), 'yyyy-MM-dd');
          break;
        default:
          startDate = format(subMonths(now, 6), 'yyyy-MM-dd');
      }
      
      const today = format(now, 'yyyy-MM-dd');
      return { startDate, endDate: today };
    } catch (error) {
      console.error('Error calculating date strings:', error);
      // Hardcoded fallback dates as strings that are definitely valid
      return {
        startDate: '2024-11-01',
        endDate: '2025-05-01'
      };
    }
  };

  // Handle report export
  const handleExport = async (type: string) => {
    if (isExporting) return;
    
    try {
      setIsExporting(true);
      
      // Prepare the export request data
      const exportData = {
        reportType: type || reportType,
        ...getDateRangeStrings(),
      };
      
      console.log('Exporting report with data:', exportData);
      
      // Fetch the CSV data from the API
      const response = await fetch('/api/reports/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportData),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Export error response:', errorText);
        throw new Error(`Failed to export report data: ${response.status} ${response.statusText}`);
      }
      
      // Get the blob from the response
      const blob = await response.blob();
      
      // Create a download link and trigger the download
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${type || reportType}-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
      
      toast({
        title: "Export successful",
        description: "Report data has been exported to CSV",
        variant: "default",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: "Could not export report data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="container mx-auto py-6 max-w-4xl px-4 sm:px-6">
      <div className="flex items-center mb-6">
        <Button variant="ghost" className="mr-4" onClick={() => navigate('/reports')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Reports
        </Button>
        <h1 className="text-2xl font-bold">Export Reports</h1>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Report Format & Time Range</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Report Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="financial">Financial Reports</SelectItem>
                  <SelectItem value="project">Project Status</SelectItem>
                  <SelectItem value="manufacturing">Manufacturing</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Time Range</Label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Time Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3months">Last 3 Months</SelectItem>
                  <SelectItem value="6months">Last 6 Months</SelectItem>
                  <SelectItem value="12months">Last 12 Months</SelectItem>
                  <SelectItem value="ytd">Year-to-Date</SelectItem>
                  <SelectItem value="mtd">Month-to-Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <Button 
            className="w-full" 
            onClick={() => handleExport(reportType)}
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin inline-block border-2 border-current border-t-transparent text-primary rounded-full" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" /> Export Report ({reportType})
              </>
            )}
          </Button>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Financial Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              Export financial data including billing milestones, invoices, and payment status.
            </p>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => handleExport('financial')}
              disabled={isExporting}
            >
              <FileType className="mr-2 h-4 w-4" /> Export Financial Data
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Project Status</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              Export project status data including timelines, completion rates, and risk assessments.
            </p>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => handleExport('project')}
              disabled={isExporting}
            >
              <FileType className="mr-2 h-4 w-4" /> Export Project Data
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Manufacturing Data</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              Export manufacturing data including bay utilization, schedules, and production metrics.
            </p>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => handleExport('manufacturing')}
              disabled={isExporting}
            >
              <FileType className="mr-2 h-4 w-4" /> Export Manufacturing Data
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Delivery Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              Export delivery data including on-time rates, delivery tracking, and shipping metrics.
            </p>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => handleExport('delivery')}
              disabled={isExporting}
            >
              <FileType className="mr-2 h-4 w-4" /> Export Delivery Data
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ExportReportsPage;