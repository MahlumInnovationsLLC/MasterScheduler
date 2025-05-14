import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle, 
  CardFooter 
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Download, FileText, Filter, Calendar as CalendarIcon } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Project, BillingMilestone, ManufacturingSchedule } from '@shared/schema';

const ReportsPage = () => {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [reportType, setReportType] = useState('financial');
  const [timeRange, setTimeRange] = useState('6months');
  const [projectFilter, setProjectFilter] = useState('all');
  const [isExporting, setIsExporting] = useState(false);

  // Hard-code date ranges to avoid any potential date handling errors
  // These are predefined date strings in ISO format (YYYY-MM-DD)
  const getDateRangeStrings = () => {
    try {
      // Use a reliable way to get today's date as YYYY-MM-DD
      const now = new Date();
      // Format date as YYYY-MM-DD manually
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      console.log('Current date:', today);
      
      // Create date for start point calculations
      const currentDate = new Date(now);
      let startDate;
      
      switch (timeRange) {
        case '3months': {
          // Calculate 3 months ago safely
          currentDate.setDate(15); // Set to middle of month to avoid end-of-month issues
          currentDate.setMonth(currentDate.getMonth() - 3);
          startDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`;
          console.log('3 months ago date:', startDate);
          break;
        }
        case '6months': {
          // Calculate 6 months ago safely
          currentDate.setDate(15); // Set to middle of month to avoid end-of-month issues
          currentDate.setMonth(currentDate.getMonth() - 6);
          startDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`;
          console.log('6 months ago date:', startDate);
          break;
        }
        case '12months': {
          // Calculate 12 months ago safely
          currentDate.setDate(15); // Set to middle of month to avoid end-of-month issues
          currentDate.setMonth(currentDate.getMonth() - 12);
          startDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`;
          console.log('12 months ago date:', startDate);
          break;
        }
        case 'ytd': {
          // Get January 1st of current year
          startDate = `${now.getFullYear()}-01-01`;
          console.log('YTD start date:', startDate);
          break;
        }
        default: {
          // Default to 6 months ago
          currentDate.setDate(15); // Set to middle of month to avoid end-of-month issues
          currentDate.setMonth(currentDate.getMonth() - 6);
          startDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`;
          console.log('Default (6 months ago) date:', startDate);
        }
      }
      
      // Validate the dates by parsing them
      const startObj = new Date(startDate);
      const endObj = new Date(today);
      
      if (isNaN(startObj.getTime()) || isNaN(endObj.getTime())) {
        throw new Error('Invalid date calculation');
      }
      
      console.log('Using date range:', { startDate, endDate: today });
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
  
  // Handle exporting data to CSV
  const handleExport = async () => {
    if (isExporting) return;
    
    try {
      setIsExporting(true);
      
      // Prepare the export request data
      const exportData = {
        reportType,
        ...getDateRangeStrings(),
        projectId: projectFilter !== 'all' ? parseInt(projectFilter) : undefined
      };
      
      // Fetch the CSV data from the API
      const response = await fetch('/api/reports/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to export report data');
      }
      
      // Get the blob from the response
      const blob = await response.blob();
      
      // Create a download link and trigger the download
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${reportType}-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
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

  // Base date parameters for report queries
  const dateParams = {
    ...getDateRangeStrings(),
    projectId: projectFilter !== 'all' ? projectFilter : undefined
  };

  // Fetch financial report data
  const { data: financialReport, isLoading: isLoadingFinancial } = useQuery({
    queryKey: ['/api/reports/financial', dateParams],
    queryFn: () => fetch(`/api/reports/financial?startDate=${dateParams.startDate}&endDate=${dateParams.endDate}${dateParams.projectId ? `&projectId=${dateParams.projectId}` : ''}`).then(res => res.json()),
    enabled: isAuthenticated && reportType === 'financial',
  });

  // Fetch project status report data
  const { data: projectStatusReport, isLoading: isLoadingProjectStatus } = useQuery({
    queryKey: ['/api/reports/project-status', dateParams],
    queryFn: () => fetch(`/api/reports/project-status?startDate=${dateParams.startDate}&endDate=${dateParams.endDate}${dateParams.projectId ? `&projectId=${dateParams.projectId}` : ''}`).then(res => res.json()),
    enabled: isAuthenticated && reportType === 'project',
  });

  // Fetch manufacturing report data
  const { data: manufacturingReport, isLoading: isLoadingManufacturing } = useQuery({
    queryKey: ['/api/reports/manufacturing', dateParams],
    queryFn: () => fetch(`/api/reports/manufacturing?startDate=${dateParams.startDate}&endDate=${dateParams.endDate}${dateParams.projectId ? `&projectId=${dateParams.projectId}` : ''}`).then(res => res.json()),
    enabled: isAuthenticated && reportType === 'manufacturing',
  });

  // Fetch delivery report data
  const { data: deliveryReport, isLoading: isLoadingDelivery } = useQuery({
    queryKey: ['/api/reports/delivery', dateParams],
    queryFn: () => fetch(`/api/reports/delivery?startDate=${dateParams.startDate}&endDate=${dateParams.endDate}${dateParams.projectId ? `&projectId=${dateParams.projectId}` : ''}`).then(res => res.json()),
    enabled: isAuthenticated && reportType === 'delivery',
  });

  // Define empty fallback data for all reports to ensure we always have valid data structures
  const emptyFinancialReport = {
    metrics: {
      totalInvoiced: 0,
      totalPaid: 0,
      totalOutstanding: 0,
      averagePaymentTime: 0
    },
    milestones: []
  };
  
  const emptyProjectStatusReport = {
    metrics: {
      totalProjects: 0,
      onTrack: 0,
      atRisk: 0,
      delayed: 0
    },
    projects: []
  };
  
  const emptyManufacturingReport = {
    metrics: {
      bayUtilization: 0,
      averageProjectDuration: 0,
      onTimeDelivery: 0,
      averageTeamSize: 0
    },
    schedules: []
  };
  
  const emptyDeliveryReport = {
    metrics: {
      totalDeliveries: 0,
      onTimeDeliveries: 0,
      averageDelay: 0
    },
    deliveries: []
  };
  
  // Fallback to fetch all data directly if reports API fails
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    enabled: isAuthenticated && (!financialReport || !projectStatusReport),
  });

  const { data: billingMilestones = [] } = useQuery<BillingMilestone[]>({
    queryKey: ['/api/billing-milestones'],
    enabled: isAuthenticated && !financialReport,
  });

  const { data: manufacturingSchedules = [] } = useQuery<ManufacturingSchedule[]>({
    queryKey: ['/api/manufacturing-schedules'],
    enabled: isAuthenticated && !manufacturingReport,
  });

  // Use filtered data from the API response or fallback to client-side filtering with safe date handling
  // Always have a report data (either from API or fallback empty objects)
  const safeFinancialReport = financialReport || emptyFinancialReport;
  const safeProjectStatusReport = projectStatusReport || emptyProjectStatusReport;
  const safeManufacturingReport = manufacturingReport || emptyManufacturingReport;
  const safeDeliveryReport = deliveryReport || emptyDeliveryReport;
  
  // Use filtered data from the API response or fallback to client-side filtering with safe date handling
  const filteredMilestones = safeFinancialReport.milestones || billingMilestones.filter(milestone => {
    try {
      // First check for project filter which doesn't involve dates
      const passesProjectFilter = projectFilter === 'all' || milestone.projectId.toString() === projectFilter;
      if (!passesProjectFilter) return false;
      
      // Safely handle date filtering
      if (!milestone.targetInvoiceDate || !dateParams.startDate || !dateParams.endDate) {
        return false;
      }
      
      const milestoneDate = new Date(milestone.targetInvoiceDate);
      const startDate = new Date(dateParams.startDate);
      const endDate = new Date(dateParams.endDate);
      
      // Validate all dates are valid before comparison
      if (isNaN(milestoneDate.getTime()) || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return false;
      }
      
      return milestoneDate >= startDate && milestoneDate <= endDate;
    } catch (error) {
      console.error('Error filtering milestone:', error);
      return false;
    }
  });

  const filteredSchedules = safeManufacturingReport.schedules || manufacturingSchedules.filter(schedule => {
    try {
      // First check for project filter which doesn't involve dates
      const passesProjectFilter = projectFilter === 'all' || schedule.projectId.toString() === projectFilter;
      if (!passesProjectFilter) return false;
      
      // Safely handle date filtering
      if (!schedule.startDate || !dateParams.startDate || !dateParams.endDate) {
        return false;
      }
      
      const scheduleDate = new Date(schedule.startDate);
      const startDate = new Date(dateParams.startDate);
      const endDate = new Date(dateParams.endDate);
      
      // Validate all dates are valid before comparison
      if (isNaN(scheduleDate.getTime()) || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return false;
      }
      
      return scheduleDate >= startDate && scheduleDate <= endDate;
    } catch (error) {
      console.error('Error filtering schedule:', error);
      return false;
    }
  });

  // Prepare financial data for charts
  const getFinancialData = () => {
    try {
      // If we have data from the API, use it (but with our safe object)
      if (safeFinancialReport?.chartData && safeFinancialReport.chartData.length > 0) {
        return safeFinancialReport.chartData;
      }
      
      // Fallback to client-side processing
      // Create monthly buckets
      const months: Record<string, { month: string, invoiced: number, received: number, outstanding: number }> = {};
      
      try {
        // Validate dates first
        let validStartDate = new Date(dateParams.startDate);
        let validEndDate = new Date(dateParams.endDate);
        
        if (isNaN(validStartDate.getTime()) || isNaN(validEndDate.getTime())) {
          // Use fallback dates if either is invalid
          validStartDate = new Date('2024-11-01');
          validEndDate = new Date('2025-05-01');
        }
        
        // Initialize months in range with extra safety
        let currentMonth = new Date(validStartDate);
        currentMonth.setDate(1); // Set to start of month
        
        // Limited loop to avoid any potential infinite loops
        let loopLimit = 0;
        const maxLoops = 100; // Safety valve
        
        while (currentMonth <= validEndDate && loopLimit < maxLoops) {
          try {
            const monthKey = format(currentMonth, 'yyyy-MM');
            months[monthKey] = {
              month: format(currentMonth, 'MMM yyyy'),
              invoiced: 0,
              received: 0,
              outstanding: 0
            };
            
            // Advance to next month safely by creating a new date object
            const year = currentMonth.getFullYear();
            const month = currentMonth.getMonth();
            currentMonth = new Date(year, month + 1, 1);
            
            loopLimit++;
          } catch (e) {
            console.error('Error in month initialization:', e);
            break;
          }
        }
        
        // If something went wrong and no months were added, add at least one month
        if (Object.keys(months).length === 0) {
          const today = new Date();
          const monthKey = format(today, 'yyyy-MM');
          months[monthKey] = {
            month: format(today, 'MMM yyyy'),
            invoiced: 0,
            received: 0,
            outstanding: 0
          };
        }
      } catch (error) {
        console.error('Error initializing months:', error);
        // Add a default month as fallback
        const today = new Date();
        const monthKey = format(today, 'yyyy-MM');
        months[monthKey] = {
          month: format(today, 'MMM yyyy'),
          invoiced: 0,
          received: 0,
          outstanding: 0
        };
      }
      
      // Fill in milestone data with additional safety
      if (Array.isArray(filteredMilestones)) {
        filteredMilestones.forEach(milestone => {
          try {
            // Make sure milestone is valid before processing
            if (!milestone || !milestone.targetInvoiceDate) {
              return;
            }
            
            // Try to parse the date
            let invoiceDate: Date;
            try {
              invoiceDate = new Date(milestone.targetInvoiceDate);
              if (isNaN(invoiceDate.getTime())) {
                return;
              }
            } catch (e) {
              return;
            }
            
            // Format month key safely
            let monthKey: string;
            try {
              monthKey = format(invoiceDate, 'yyyy-MM');
            } catch (e) {
              return;
            }
            
            // Check if month exists in our map
            if (!months[monthKey]) {
              return;
            }
            
            // Parse amount safely
            let amount = 0;
            if (typeof milestone.amount === 'string') {
              const parsed = parseFloat(milestone.amount);
              amount = isNaN(parsed) ? 0 : parsed;
            } else if (typeof milestone.amount === 'number') {
              amount = isNaN(milestone.amount) ? 0 : milestone.amount;
            }
            
            // Increment counters
            months[monthKey].invoiced += amount;
            
            if (milestone.status === 'paid') {
              months[monthKey].received += amount;
            } else {
              months[monthKey].outstanding += amount;
            }
          } catch (error) {
            console.error('Error processing milestone for financial chart:', error);
          }
        });
      }
      
      return Object.values(months);
    } catch (error) {
      console.error('Fatal error in getFinancialData:', error);
      // Return minimal valid data as ultimate fallback
      return [
        { month: 'Current', invoiced: 0, received: 0, outstanding: 0 }
      ];
    }
  };

  // Prepare project status data for charts
  const getProjectStatusData = () => {
    try {
      // If we have data from the API, use it (with our safe object)
      if (safeProjectStatusReport?.statusDistribution && safeProjectStatusReport.statusDistribution.length > 0) {
        return safeProjectStatusReport.statusDistribution;
      }
      
      // Fallback to client-side processing with safety
      const statusCounts = {
        'active': 0,
        'delayed': 0,
        'completed': 0,
        'archived': 0,
        'critical': 0
      };

      try {
        // Filter projects with error handling
        const filteredProjects = Array.isArray(projects) ? projects.filter(project => {
          try {
            if (!project || !project.id) return false;
            return projectFilter === 'all' || project.id.toString() === projectFilter;
          } catch (error) {
            console.error('Error filtering project:', error);
            return false;
          }
        }) : [];
        
        // Count projects by status with error handling
        filteredProjects.forEach(project => {
          try {
            if (!project || !project.status) return;
            
            if (statusCounts.hasOwnProperty(project.status)) {
              statusCounts[project.status as keyof typeof statusCounts]++;
            }
          } catch (error) {
            console.error('Error processing project status:', error);
          }
        });
      } catch (error) {
        console.error('Error processing projects for status chart:', error);
      }
      
      // Convert to chart format
      return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
    } catch (error) {
      console.error('Fatal error in getProjectStatusData:', error);
      // Return minimal valid data as ultimate fallback
      return [
        { name: 'active', value: 0 },
        { name: 'delayed', value: 0 },
        { name: 'completed', value: 0 }
      ];
    }
  };

  // Prepare manufacturing data for charts
  const getManufacturingData = () => {
    try {
      // If we have data from the API, use it (with our safe object)
      if (safeManufacturingReport?.bayUtilization && safeManufacturingReport.bayUtilization.length > 0) {
        return safeManufacturingReport.bayUtilization;
      }
      
      // Fallback to client-side processing
      const bayUtilization: Record<string, { bay: string, scheduled: number, completed: number, utilization: number }> = {};
      
      try {
        // Get all unique bay IDs with safety
        let uniqueBayIds: any[] = [];
        
        if (Array.isArray(filteredSchedules)) {
          try {
            // Safely extract bay IDs
            uniqueBayIds = [...new Set(
              filteredSchedules
                .filter(schedule => schedule && schedule.bayId)
                .map(schedule => schedule.bayId)
            )];
          } catch (error) {
            console.error('Error extracting bay IDs:', error);
            uniqueBayIds = [1, 2, 3]; // Fallback to common bay IDs
          }
        } else {
          console.warn('filteredSchedules is not an array');
          uniqueBayIds = [1, 2, 3]; // Fallback to common bay IDs
        }
        
        uniqueBayIds.forEach(bayId => {
          if (!bayId) return; // Skip invalid bay IDs
          
          try {
            const baySchedules = Array.isArray(filteredSchedules) 
              ? filteredSchedules.filter(schedule => schedule && schedule.bayId === bayId) 
              : [];
            const bayName = `Bay ${bayId}`;
            
            // Calculate total days with safety
            const totalDays = baySchedules.reduce((total, schedule) => {
              try {
                if (!schedule || !schedule.startDate || !schedule.endDate) return total;
                
                const start = new Date(schedule.startDate);
                const end = new Date(schedule.endDate);
                
                if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                  console.warn('Invalid date in schedule:', schedule.id);
                  return total;
                }
                
                const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                return total + Math.max(0, days); // Ensure we don't add negative days
              } catch (error) {
                console.error('Error calculating days for schedule:', error);
                return total;
              }
            }, 0);
            
            // Calculate completed days with safety
            const completedDays = baySchedules
              .filter(schedule => schedule && schedule.status === 'complete')
              .reduce((total, schedule) => {
                try {
                  if (!schedule || !schedule.startDate || !schedule.endDate) return total;
                  
                  const start = new Date(schedule.startDate);
                  const end = new Date(schedule.endDate);
                  
                  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                    console.warn('Invalid date in completed schedule:', schedule.id);
                    return total;
                  }
                  
                  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                  return total + Math.max(0, days); // Ensure we don't add negative days
                } catch (error) {
                  console.error('Error calculating days for completed schedule:', error);
                  return total;
                }
              }, 0);
            
            // Calculate utilization as a percentage of the date range
            let utilization = 0;
            
            try {
              // Validate date parameters
              if (!dateParams || !dateParams.startDate || !dateParams.endDate) {
                console.warn('Missing date parameters for utilization calculation');
              } else {
                const startDate = new Date(dateParams.startDate);
                const endDate = new Date(dateParams.endDate);
                
                if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                  console.warn('Invalid date parameters for utilization calculation');
                } else {
                  const dateRangeDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                  utilization = dateRangeDays > 0 ? (totalDays / dateRangeDays) * 100 : 0;
                }
              }
            } catch (error) {
              console.error('Error calculating bay utilization:', error);
            }
            
            // Store the bay data
            bayUtilization[bayName] = {
              bay: bayName,
              scheduled: totalDays,
              completed: completedDays,
              utilization: Math.min(100, Math.round(utilization))
            };
          } catch (error) {
            console.error(`Error processing bay ${bayId}:`, error);
            // Add fallback for this bay
            bayUtilization[`Bay ${bayId}`] = {
              bay: `Bay ${bayId}`,
              scheduled: 0,
              completed: 0,
              utilization: 0
            };
          }
        });
      } catch (error) {
        console.error('Error processing bays:', error);
      }
      
      // Return chart data
      const result = Object.values(bayUtilization);
      
      // If no bays were processed, return default data
      if (result.length === 0) {
        return [
          { bay: 'Bay 1', scheduled: 0, completed: 0, utilization: 0 },
          { bay: 'Bay 2', scheduled: 0, completed: 0, utilization: 0 },
          { bay: 'Bay 3', scheduled: 0, completed: 0, utilization: 0 }
        ];
      }
      
      return result;
    } catch (error) {
      console.error('Fatal error in getManufacturingData:', error);
      // Return minimal valid data as ultimate fallback
      return [
        { bay: 'Bay 1', scheduled: 0, completed: 0, utilization: 0 },
        { bay: 'Bay 2', scheduled: 0, completed: 0, utilization: 0 },
        { bay: 'Bay 3', scheduled: 0, completed: 0, utilization: 0 }
      ];
    }
  };
  
  // Prepare delivery data for charts
  const getDeliveryData = () => {
    try {
      // If we have data from the API, use it (with our safe object)
      if (safeDeliveryReport?.deliveriesByMonth && safeDeliveryReport.deliveriesByMonth.length > 0) {
        return safeDeliveryReport.deliveriesByMonth;
      }
      
      // Fallback to empty data, will not be used unless delivery report is selected
      return [];
    } catch (error) {
      console.error('Error in getDeliveryData:', error);
      return [];
    }
  };

  const financialData = getFinancialData();
  const projectStatusData = getProjectStatusData();
  const manufacturingData = getManufacturingData();

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
  const STATUS_COLORS = {
    'On Track': '#00C49F',
    'At Risk': '#FFBB28',
    'Delayed': '#FF8042',
    'Completed': '#0088FE'
  };

  // Calculate summary metrics - use API data if available
  const totalInvoiced = financialReport?.metrics?.totalInvoiced || 
    filteredMilestones.reduce((sum, milestone) => {
      const amount = typeof milestone.amount === 'string' ? parseFloat(milestone.amount) : milestone.amount;
      return sum + amount;
    }, 0);

  const totalReceived = financialReport?.metrics?.totalPaid || 
    filteredMilestones
      .filter(milestone => milestone.status === 'paid')
      .reduce((sum, milestone) => {
        const amount = typeof milestone.amount === 'string' ? parseFloat(milestone.amount) : milestone.amount;
        return sum + amount;
      }, 0);

  const totalOutstanding = financialReport?.metrics?.totalOutstanding || (totalInvoiced - totalReceived);
  
  const upcomingMilestones = financialReport?.upcomingMilestones || 
    filteredMilestones
      .filter(milestone => milestone.status === 'upcoming' || milestone.status === 'invoiced')
      .sort((a, b) => new Date(a.targetInvoiceDate).getTime() - new Date(b.targetInvoiceDate).getTime());

  return (
    <div className="container mx-auto py-6 max-w-7xl px-4 sm:px-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Reports & Analytics</h1>
        
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="12months">Last 12 Months</SelectItem>
              <SelectItem value="ytd">Year-to-Date</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin inline-block border-2 border-current border-t-transparent text-primary rounded-full" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" /> Export Report
              </>
            )}
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Tabs defaultValue="financial" value={reportType} onValueChange={setReportType}>
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="financial">Financial Reports</TabsTrigger>
              <TabsTrigger value="project">Project Status</TabsTrigger>
              <TabsTrigger value="manufacturing">Manufacturing</TabsTrigger>
            </TabsList>
            
            {/* Financial Reports Tab */}
            <TabsContent value="financial">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Total Invoiced</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(totalInvoiced)}</div>
                    <p className="text-xs text-gray-400">For selected period</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Total Received</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-success">{formatCurrency(totalReceived)}</div>
                    <p className="text-xs text-gray-400">{Math.round((totalReceived / (totalInvoiced || 1)) * 100)}% of invoiced amount</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Outstanding</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-warning">{formatCurrency(totalOutstanding)}</div>
                    <p className="text-xs text-gray-400">{upcomingMilestones.length} pending milestones</p>
                  </CardContent>
                </Card>
              </div>
              
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle>Revenue Trend</CardTitle>
                  <CardDescription>Monthly invoiced vs received amounts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={financialData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis tickFormatter={(value) => `$${value / 1000}k`} />
                        <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, '']} />
                        <Legend />
                        <Bar dataKey="invoiced" stackId="a" name="Invoiced" fill="#8884d8" />
                        <Bar dataKey="received" stackId="a" name="Received" fill="#00C49F" />
                        <Bar dataKey="outstanding" stackId="a" name="Outstanding" fill="#FFBB28" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Milestones</CardTitle>
                  <CardDescription>Next due payments</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {upcomingMilestones.slice(0, 5).map(milestone => {
                      const project = projects.find(p => p.id === milestone.projectId);
                      return (
                        <div key={milestone.id} className="flex items-center justify-between p-3 border border-gray-700 rounded-lg">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{milestone.name}</span>
                              <Badge variant="outline">{project?.projectNumber}</Badge>
                            </div>
                            <div className="text-sm text-gray-400 mt-1">
                              Due: {format(new Date(milestone.dueDate), 'MMM d, yyyy')}
                            </div>
                          </div>
                          <div className="font-semibold">
                            {formatCurrency(milestone.amount)}
                          </div>
                        </div>
                      );
                    })}
                    
                    {upcomingMilestones.length === 0 && (
                      <div className="text-center py-6 text-gray-400">
                        No upcoming milestones in the selected period
                      </div>
                    )}
                  </div>
                </CardContent>
                {upcomingMilestones.length > 5 && (
                  <CardFooter>
                    <Button variant="link" className="w-full">
                      View All {upcomingMilestones.length} Milestones
                    </Button>
                  </CardFooter>
                )}
              </Card>
            </TabsContent>
            
            {/* Project Status Tab */}
            <TabsContent value="project">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Project Status Distribution</CardTitle>
                    <CardDescription>Overview of project health</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={projectStatusData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {projectStatusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS] || COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [value, 'Projects']} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Timeline Adherence</CardTitle>
                    <CardDescription>Project completion vs planned timeline</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={projects
                            .filter(project => projectFilter === 'all' || project.id.toString() === projectFilter)
                            .map(project => ({
                              name: project.name,
                              planned: 100,
                              actual: project.percentComplete,
                            }))
                            .slice(0, 5)}
                          layout="vertical"
                          margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" tickFormatter={(value) => `${value}%`} />
                          <YAxis type="category" dataKey="name" width={90} />
                          <Tooltip formatter={(value) => [`${value}%`, '']} />
                          <Legend />
                          <Bar dataKey="planned" fill="#8884d8" name="Planned" />
                          <Bar dataKey="actual" fill="#00C49F" name="Actual" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Project Health Metrics</CardTitle>
                    <CardDescription>Key performance indicators by project</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-left text-gray-400 text-xs border-b border-gray-700">
                            <th className="pb-2 font-medium">Project</th>
                            <th className="pb-2 font-medium">Status</th>
                            <th className="pb-2 font-medium">Timeline</th>
                            <th className="pb-2 font-medium">Budget</th>
                            <th className="pb-2 font-medium">Resources</th>
                            <th className="pb-2 font-medium">Health Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {projects
                            .filter(project => projectFilter === 'all' || project.id.toString() === projectFilter)
                            .map(project => {
                              // Calculate artificial health score
                              const timelineScore = project.percentComplete >= 90 ? 3 : project.percentComplete >= 70 ? 2 : 1;
                              const statusScore = project.status === 'On Track' ? 3 : project.status === 'At Risk' ? 2 : 1;
                              const healthScore = Math.round((timelineScore + statusScore) / 2 * 33.33);
                              
                              return (
                                <tr key={project.id} className="border-b border-gray-800">
                                  <td className="py-3 font-medium">{project.name}</td>
                                  <td className="py-3">
                                    <Badge className={`
                                      ${project.status === 'On Track' && 'bg-success bg-opacity-20 text-success'} 
                                      ${project.status === 'At Risk' && 'bg-warning bg-opacity-20 text-warning'} 
                                      ${project.status === 'Delayed' && 'bg-danger bg-opacity-20 text-danger'}
                                      ${project.status === 'Completed' && 'bg-primary bg-opacity-20 text-primary'}
                                    `}>
                                      {project.status}
                                    </Badge>
                                  </td>
                                  <td className="py-3">
                                    <div className="flex items-center">
                                      <div className="w-20 h-2 bg-gray-700 rounded mr-2">
                                        <div 
                                          className={`h-full rounded ${
                                            project.percentComplete >= 90 ? 'bg-success' : 
                                            project.percentComplete >= 70 ? 'bg-warning' : 'bg-danger'
                                          }`}
                                          style={{ width: `${project.percentComplete}%` }}
                                        ></div>
                                      </div>
                                      <span className="text-sm">{project.percentComplete}%</span>
                                    </div>
                                  </td>
                                  <td className="py-3">
                                    <Badge variant="outline">
                                      {project.budget ? formatCurrency(project.budget) : 'N/A'}
                                    </Badge>
                                  </td>
                                  <td className="py-3 text-sm">
                                    {project.teamSize || 'N/A'}
                                  </td>
                                  <td className="py-3">
                                    <div className="flex items-center">
                                      <div className="w-20 h-2 bg-gray-700 rounded mr-2">
                                        <div 
                                          className={`h-full rounded ${
                                            healthScore >= 90 ? 'bg-success' : 
                                            healthScore >= 60 ? 'bg-warning' : 'bg-danger'
                                          }`}
                                          style={{ width: `${healthScore}%` }}
                                        ></div>
                                      </div>
                                      <span className="text-sm">{healthScore}%</span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            {/* Manufacturing Tab */}
            <TabsContent value="manufacturing">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Bay Utilization</CardTitle>
                    <CardDescription>Production capacity usage</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={manufacturingData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="bay" />
                          <YAxis tickFormatter={(value) => `${value}%`} />
                          <Tooltip formatter={(value) => [`${value}%`, 'Utilization']} />
                          <Legend />
                          <Bar dataKey="utilization" fill="#8884d8" name="Utilization" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Scheduled vs Completed Days</CardTitle>
                    <CardDescription>Manufacturing bays productivity</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={manufacturingData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="bay" />
                          <YAxis label={{ value: 'Days', angle: -90, position: 'insideLeft' }} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="scheduled" fill="#8884d8" name="Scheduled Days" />
                          <Bar dataKey="completed" fill="#00C49F" name="Completed Days" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Manufacturing Schedule Status</CardTitle>
                    <CardDescription>Overview of production schedule adherence</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-left text-gray-400 text-xs border-b border-gray-700">
                            <th className="pb-2 font-medium">Project</th>
                            <th className="pb-2 font-medium">Bay</th>
                            <th className="pb-2 font-medium">Start Date</th>
                            <th className="pb-2 font-medium">End Date</th>
                            <th className="pb-2 font-medium">Duration</th>
                            <th className="pb-2 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredSchedules.map(schedule => {
                            const project = projects.find(p => p.id === schedule.projectId);
                            const startDate = new Date(schedule.startDate);
                            const endDate = new Date(schedule.endDate);
                            const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                            
                            return (
                              <tr key={schedule.id} className="border-b border-gray-800">
                                <td className="py-3 font-medium">{project?.name || 'Unknown'}</td>
                                <td className="py-3">Bay {schedule.bayId}</td>
                                <td className="py-3">{format(startDate, 'MMM d, yyyy')}</td>
                                <td className="py-3">{format(endDate, 'MMM d, yyyy')}</td>
                                <td className="py-3">{days} days</td>
                                <td className="py-3">
                                  <Badge className={`
                                    ${schedule.status === 'Completed' && 'bg-success bg-opacity-20 text-success'} 
                                    ${schedule.status === 'In Progress' && 'bg-primary bg-opacity-20 text-primary'} 
                                    ${schedule.status === 'Scheduled' && 'bg-gray-500 bg-opacity-20 text-gray-400'}
                                    ${schedule.status === 'Delayed' && 'bg-danger bg-opacity-20 text-danger'}
                                  `}>
                                    {schedule.status}
                                  </Badge>
                                </td>
                              </tr>
                            );
                          })}
                          
                          {filteredSchedules.length === 0 && (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-gray-400">
                                No manufacturing schedules found for the selected criteria
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        <div>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Report Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Report Type</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Report Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="financial">Financial Reports</SelectItem>
                    <SelectItem value="project">Project Status</SelectItem>
                    <SelectItem value="manufacturing">Manufacturing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Time Range</Label>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Time Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3months">Last 3 Months</SelectItem>
                    <SelectItem value="6months">Last 6 Months</SelectItem>
                    <SelectItem value="12months">Last 12 Months</SelectItem>
                    <SelectItem value="ytd">Year-to-Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Filter by Project</Label>
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.projectNumber} - {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Separator />
              
              <div className="pt-2">
                <Button variant="outline" className="w-full mb-2">
                  <FileText className="mr-2 h-4 w-4" /> Generate PDF Report
                </Button>
                <Button variant="outline" className="w-full">
                  <Download className="mr-2 h-4 w-4" /> Export to Excel
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Report Date Range</CardTitle>
              <CardDescription>
                {new Date(dateParams.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {new Date(dateParams.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-400 mb-4">
                <div className="flex justify-between mb-2">
                  <span>Projects included:</span>
                  <span className="font-medium text-white">
                    {projectFilter === 'all' ? projects.length : 1}
                  </span>
                </div>
                <div className="flex justify-between mb-2">
                  <span>Total invoiced:</span>
                  <span className="font-medium text-white">{formatCurrency(totalInvoiced)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Manufacturing schedules:</span>
                  <span className="font-medium text-white">{filteredSchedules.length}</span>
                </div>
              </div>
              
              <div className="border border-gray-700 p-3 rounded-lg bg-gray-800 bg-opacity-30">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarIcon className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium">Report Period</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-gray-400">Start Date</div>
                    <div>{new Date(dateParams.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">End Date</div>
                    <div>{new Date(dateParams.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;