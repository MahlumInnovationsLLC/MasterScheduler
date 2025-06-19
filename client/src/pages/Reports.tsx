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
import { Download, FileText, Calendar as CalendarIcon, RefreshCw } from 'lucide-react';
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

  // Get current date range for filtering
  const getDateRange = () => {
    const now = new Date();
    let startDate;

    switch (timeRange) {
      case '3months':
        startDate = startOfMonth(subMonths(now, 3));
        break;
      case '6months':
        startDate = startOfMonth(subMonths(now, 6));
        break;
      case '12months':
        startDate = startOfMonth(subMonths(now, 12));
        break;
      case 'ytd':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = startOfMonth(subMonths(now, 6));
    }

    return {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(now, 'yyyy-MM-dd')
    };
  };

  const dateRange = getDateRange();

  // Fetch live data from API endpoints
  const { data: projects = [], isLoading: projectsLoading, refetch: refetchProjects } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    queryFn: () => fetch('/api/projects').then(res => res.json()),
    enabled: isAuthenticated,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: billingMilestones = [], isLoading: milestonesLoading, refetch: refetchMilestones } = useQuery<BillingMilestone[]>({
    queryKey: ['/api/billing-milestones'],
    queryFn: () => fetch('/api/billing-milestones').then(res => res.json()),
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  const { data: manufacturingSchedules = [], isLoading: schedulesLoading, refetch: refetchSchedules } = useQuery<ManufacturingSchedule[]>({
    queryKey: ['/api/manufacturing-schedules'],
    queryFn: () => fetch('/api/manufacturing-schedules').then(res => res.json()),
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  const { data: manufacturingBays = [], isLoading: baysLoading } = useQuery({
    queryKey: ['/api/manufacturing-bays'],
    queryFn: () => fetch('/api/manufacturing-bays').then(res => res.json()),
    enabled: isAuthenticated,
    refetchInterval: 60000,
  });

  // Manual refresh function
  const handleRefresh = () => {
    refetchProjects();
    refetchMilestones();
    refetchSchedules();
    toast({
      title: "Data refreshed",
      description: "All reports have been updated with the latest data",
    });
  };

  // Filter data based on selected criteria
  const filteredProjects = projects.filter(project => {
    if (projectFilter !== 'all' && project.id.toString() !== projectFilter) return false;

    // Filter by date range - check if project has activity in the date range
    const projectDate = new Date(project.createdAt || 0);
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);

    return projectDate >= startDate || projectDate <= endDate;
  });

  const filteredMilestones = billingMilestones.filter(milestone => {
    if (projectFilter !== 'all' && milestone.projectId.toString() !== projectFilter) return false;

    if (milestone.targetInvoiceDate) {
      const milestoneDate = new Date(milestone.targetInvoiceDate);
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      return milestoneDate >= startDate && milestoneDate <= endDate;
    }
    return true;
  });

  const filteredSchedules = manufacturingSchedules.filter(schedule => {
    if (projectFilter !== 'all' && schedule.projectId.toString() !== projectFilter) return false;

    const scheduleStart = new Date(schedule.startDate);
    const scheduleEnd = new Date(schedule.endDate);
    const rangeStart = new Date(dateRange.startDate);
    const rangeEnd = new Date(dateRange.endDate);

    return (scheduleStart <= rangeEnd && scheduleEnd >= rangeStart);
  });

  // Handle export functionality
  const handleExport = async () => {
    if (isExporting) return;

    try {
      setIsExporting(true);

      const exportData = {
        reportType,
        ...dateRange,
        projectId: projectFilter !== 'all' ? parseInt(projectFilter) : undefined
      };

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

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${reportType}-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();

      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);

      toast({
        title: "Export successful",
        description: "Report data has been exported to CSV",
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

  // Calculate real-time financial metrics
  const totalInvoiced = filteredMilestones.reduce((sum, milestone) => {
    const amount = typeof milestone.amount === 'string' ? parseFloat(milestone.amount) : milestone.amount;
    return sum + (amount || 0);
  }, 0);

  const totalReceived = filteredMilestones
    .filter(milestone => milestone.status === 'paid')
    .reduce((sum, milestone) => {
      const amount = typeof milestone.amount === 'string' ? parseFloat(milestone.amount) : milestone.amount;
      return sum + (amount || 0);
    }, 0);

  const totalOutstanding = totalInvoiced - totalReceived;

  const upcomingMilestones = filteredMilestones
    .filter(milestone => milestone.status === 'upcoming' || milestone.status === 'invoiced')
    .sort((a, b) => new Date(a.targetInvoiceDate).getTime() - new Date(b.targetInvoiceDate).getTime())
    .slice(0, 10);

  // Prepare financial chart data
  const getFinancialData = () => {
    const months: Record<string, { month: string, invoiced: number, received: number, outstanding: number }> = {};

    // Initialize months in range
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    let currentMonth = new Date(startDate);
    currentMonth.setDate(1);

    while (currentMonth <= endDate) {
      const monthKey = format(currentMonth, 'yyyy-MM');
      months[monthKey] = {
        month: format(currentMonth, 'MMM yyyy'),
        invoiced: 0,
        received: 0,
        outstanding: 0
      };
      currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    }

    // Fill in milestone data
    filteredMilestones.forEach(milestone => {
      if (!milestone.targetInvoiceDate) return;

      const invoiceDate = new Date(milestone.targetInvoiceDate);
      const monthKey = format(invoiceDate, 'yyyy-MM');

      if (months[monthKey]) {
        const amount = typeof milestone.amount === 'string' ? parseFloat(milestone.amount) : milestone.amount || 0;
        months[monthKey].invoiced += amount;

        if (milestone.status === 'paid') {
          months[monthKey].received += amount;
        } else {
          months[monthKey].outstanding += amount;
        }
      }
    });

    return Object.values(months);
  };

  // Fetch detailed project report data
  const { data: projectReportData, isLoading: projectReportLoading } = useQuery({
    queryKey: [`/api/reports/project-status?${new URLSearchParams({ 
      ...dateRange, 
      ...(projectFilter !== 'all' ? { projectId: projectFilter } : {}) 
    }).toString()}`],
    queryFn: () => fetch(`/api/reports/project-status?${new URLSearchParams({ 
      ...dateRange, 
      ...(projectFilter !== 'all' ? { projectId: projectFilter } : {}) 
    }).toString()}`).then(res => res.json()),
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  // Fetch mech shop report data
  const { data: mechShopReportData, isLoading: mechShopReportLoading } = useQuery({
    queryKey: [`/api/reports/mech-shop?${new URLSearchParams({ 
      ...dateRange, 
      ...(projectFilter !== 'all' ? { projectId: projectFilter } : {}) 
    }).toString()}`],
    queryFn: () => fetch(`/api/reports/mech-shop?${new URLSearchParams({ 
      ...dateRange, 
      ...(projectFilter !== 'all' ? { projectId: projectFilter } : {}) 
    }).toString()}`).then(res => res.json()),
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  // Prepare project status data
  const getProjectStatusData = () => {
    const statusCounts = {
      'active': 0,
      'delayed': 0,
      'completed': 0,
      'archived': 0,
      'on-track': 0,
      'at-risk': 0
    };

    filteredProjects.forEach(project => {
      const status = project.status?.toLowerCase() || 'active';
      if (statusCounts.hasOwnProperty(status)) {
        statusCounts[status as keyof typeof statusCounts]++;
      } else {
        statusCounts['active']++;
      }
    });

    return Object.entries(statusCounts)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  };

  // Query for all project label assignments to calculate issue distribution
  const { data: allProjectLabelAssignments = [] } = useQuery({
    queryKey: ['/api/all-project-label-assignments'],
    queryFn: () => fetch('/api/all-project-label-assignments').then(res => res.json()),
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  // Query for available labels
  const { data: availableLabels = [] } = useQuery({
    queryKey: ['/api/project-labels'],
    queryFn: () => fetch('/api/project-labels').then(res => res.json()),
    enabled: isAuthenticated,
  });

  // Calculate project issue distribution based on labels
  const getProjectIssueDistribution = () => {
    if (!availableLabels || !allProjectLabelAssignments || filteredProjects.length === 0) {
      return [
        { name: 'Good', value: 0 },
        { name: 'Major Issue', value: 0 },
        { name: 'Minor Issue', value: 0 }
      ];
    }

    // Find label IDs for issue types
    const majorLabel = availableLabels.find(l => l.name.toUpperCase().includes('MAJOR'));
    const minorLabel = availableLabels.find(l => l.name.toUpperCase().includes('MINOR'));
    const goodLabel = availableLabels.find(l => l.name.toUpperCase().includes('GOOD'));

    // Get project IDs in our filtered set
    const filteredProjectIds = new Set(filteredProjects.map(p => p.id));

    // Count assignments for filtered projects only
    const majorCount = majorLabel ? 
      allProjectLabelAssignments.filter(assignment => 
        filteredProjectIds.has(assignment.projectId) && 
        Number(assignment.labelId) === Number(majorLabel.id)
      ).length : 0;

    const minorCount = minorLabel ? 
      allProjectLabelAssignments.filter(assignment => 
        filteredProjectIds.has(assignment.projectId) && 
        Number(assignment.labelId) === Number(minorLabel.id)
      ).length : 0;

    const goodCount = goodLabel ? 
      allProjectLabelAssignments.filter(assignment => 
        filteredProjectIds.has(assignment.projectId) && 
        Number(assignment.labelId) === Number(goodLabel.id)
      ).length : 0;

    // Projects without any quality labels are considered "unlabeled" but we'll include them in "Good"
    const labeledProjectIds = new Set(
      allProjectLabelAssignments
        .filter(assignment => filteredProjectIds.has(assignment.projectId))
        .filter(assignment => {
          const labelId = Number(assignment.labelId);
          return (majorLabel && labelId === Number(majorLabel.id)) ||
                 (minorLabel && labelId === Number(minorLabel.id)) ||
                 (goodLabel && labelId === Number(goodLabel.id));
        })
        .map(assignment => assignment.projectId)
    );

    const unlabeledCount = filteredProjects.length - labeledProjectIds.size;
    const finalGoodCount = goodCount + unlabeledCount;

    return [
      { name: 'Good', value: finalGoodCount },
      { name: 'Major Issue', value: majorCount },
      { name: 'Minor Issue', value: minorCount }
    ].filter(item => item.value > 0);
  };

  // Prepare manufacturing data
  const getManufacturingData = () => {
    const bayUtilization: Record<string, { bay: string, scheduled: number, completed: number, utilization: number }> = {};

    // Get unique bay IDs from schedules
    const uniqueBayIds = [...new Set(filteredSchedules.map(s => s.bayId))];

    uniqueBayIds.forEach(bayId => {
      const bay = manufacturingBays.find(b => b.id === bayId);
      const bayName = bay?.name || `Bay ${bayId}`;
      const baySchedules = filteredSchedules.filter(s => s.bayId === bayId);

      const totalHours = baySchedules.reduce((sum, schedule) => sum + (schedule.totalHours || 0), 0);
      const completedHours = baySchedules
        .filter(schedule => {
          const project = projects.find(p => p.id === schedule.projectId);
          return project?.status === 'completed';
        })
        .reduce((sum, schedule) => sum + (schedule.totalHours || 0), 0);

      // Calculate utilization based on available time in date range
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const workDays = Math.ceil(totalDays * 5 / 7); // Approximate work days
      const availableHours = workDays * 8; // 8 hours per day

      const utilization = availableHours > 0 ? Math.min(100, (totalHours / availableHours) * 100) : 0;

      bayUtilization[bayName] = {
        bay: bayName,
        scheduled: totalHours,
        completed: completedHours,
        utilization: Math.round(utilization)
      };
    });

    return Object.values(bayUtilization);
  };

  const financialData = getFinancialData();
  const projectStatusData = getProjectStatusData();
  const manufacturingData = getManufacturingData();

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  // Calculate project health metrics
  const onTrackProjects = filteredProjects.filter(p => p.status === 'active' || p.status === 'on-track').length;
  const atRiskProjects = filteredProjects.filter(p => p.status === 'at-risk').length;
  const delayedProjects = filteredProjects.filter(p => p.status === 'delayed').length;
  const completedProjects = filteredProjects.filter(p => p.status === 'completed').length;

  const isLoading = projectsLoading || milestonesLoading || schedulesLoading || baysLoading;

  return (
    <div className="container mx-auto py-6 max-w-7xl px-4 sm:px-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Reports & Analytics</h1>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>

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

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Loading latest data...</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Tabs defaultValue="financial" value={reportType} onValueChange={setReportType}>
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="financial">Financial Reports</TabsTrigger>
              <TabsTrigger value="project">Project Status</TabsTrigger>
              <TabsTrigger value="manufacturing">Manufacturing</TabsTrigger>
              <TabsTrigger value="mech-shop">Mech Shop</TabsTrigger>
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
                    <p className="text-xs text-gray-400">From {filteredMilestones.length} milestones</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Total Received</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-500">{formatCurrency(totalReceived)}</div>
                    <p className="text-xs text-gray-400">
                      {totalInvoiced > 0 ? Math.round((totalReceived / totalInvoiced) * 100) : 0}% of invoiced amount
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Outstanding</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-500">{formatCurrency(totalOutstanding)}</div>
                    <p className="text-xs text-gray-400">{upcomingMilestones.length} pending milestones</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="mb-4">
                <CardHeader>
                  <CardTitle>Revenue Trend</CardTitle>
                  <CardDescription>Monthly invoiced vs received amounts (Live Data)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={financialData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, '']} />
                        <Legend />
                        <Bar dataKey="invoiced" name="Invoiced" fill="#8884d8" />
                        <Bar dataKey="received" name="Received" fill="#00C49F" />
                        <Bar dataKey="outstanding" name="Outstanding" fill="#FFBB28" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Milestones</CardTitle>
                  <CardDescription>Next due payments (Live Data)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {upcomingMilestones.map(milestone => {
                      const project = projects.find(p => p.id === milestone.projectId);
                      return (
                        <div key={milestone.id} className="flex items-center justify-between p-3 border border-gray-700 rounded-lg">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{milestone.name}</span>
                              <Badge variant="outline">{project?.projectNumber}</Badge>
                            </div>
                            <div className="text-sm text-gray-400 mt-1">
                              Due: {milestone.targetInvoiceDate ? format(new Date(milestone.targetInvoiceDate), 'MMM d, yyyy') : 'No date set'}
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
              </Card>
            </TabsContent>

            {/* Project Status Tab */}
            <TabsContent value="project">
              {/* Project Categories Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Delivered</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-500">
                      {projectReportData?.metrics?.delivered || 0}
                    </div>
                    <p className="text-xs text-gray-400">Projects delivered</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">In Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-500">
                      {projectReportData?.metrics?.inProgress || 0}
                    </div>
                    <p className="text-xs text-gray-400">Currently in manufacturing</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Scheduled</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-500">
                      {projectReportData?.metrics?.scheduled || 0}
                    </div>
                    <p className="text-xs text-gray-400">Scheduled for future</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Unscheduled</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-500">
                      {projectReportData?.metrics?.unscheduled || 0}
                    </div>
                    <p className="text-xs text-gray-400">Awaiting scheduling</p>
                  </CardContent>
                </Card>
              </div>

              {/* Delivery Performance Metrics */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">On-Time Delivery Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-500">
                      {projectReportData?.metrics?.onTimeDeliveryRate || 0}%
                    </div>
                    <p className="text-xs text-gray-400">
                      {projectReportData?.deliveryMetrics?.onTimeDeliveries || 0} of {projectReportData?.deliveryMetrics?.totalDelivered || 0} delivered on time
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Average Days Late</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-500">
                      {projectReportData?.metrics?.averageDaysLate || 0}
                    </div>
                    <p className="text-xs text-gray-400">For late deliveries</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Total Projects</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{projectReportData?.metrics?.totalProjects || 0}</div>
                    <p className="text-xs text-gray-400">In selected time range</p>
                  </CardContent>
                </Card>
              </div>

              {/* Monthly Delivery Trends */}
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle>Monthly Delivery Performance</CardTitle>
                  <CardDescription>Delivered projects and on-time performance by month (Live Data)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={projectReportData?.monthlyDeliveries || []} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="delivered" name="Total Delivered" fill="#8884d8" />
                        <Bar dataKey="onTime" name="On Time" fill="#00C49F" />
                        <Bar dataKey="late" name="Late" fill="#FF8042" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Project Issue Distribution */}
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle>Project Issue Distribution</CardTitle>
                  <CardDescription>Breakdown of projects by quality labels (Good, Major Issue, Minor Issue)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getProjectIssueDistribution()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {getProjectIssueDistribution().map((entry, index) => {
                            // Use specific colors for each category
                            const color = entry.name === 'Good' ? '#10b981' : 
                                         entry.name === 'Major Issue' ? '#ef4444' : 
                                         entry.name === 'Minor Issue' ? '#f59e0b' : 
                                         '#6b7280';
                            return <Cell key={`cell-${index}`} fill={color} />;
                          })}
                        </Pie>
                        <Tooltip formatter={(value) => [value, 'Projects']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Top 20 Projects by Ship Date */}
              <Card>
                <CardHeader>
                  <CardTitle>Top 20 Projects by Ship Date</CardTitle>
                  <CardDescription>Projects ordered by ship date with status and schedule information</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(() => {
                      // Get projects and sort by ship date
                      const sortedProjects = (filteredProjects || [])
                        .filter(project => project.status !== 'delivered') // Exclude delivered projects
                        .sort((a, b) => {
                          // Sort by ship date, with projects having ship dates first
                          const dateA = a.shipDate ? new Date(a.shipDate) : null;
                          const dateB = b.shipDate ? new Date(b.shipDate) : null;
                          
                          if (dateA && dateB) {
                            return dateA.getTime() - dateB.getTime();
                          }
                          
                          // Projects with ship dates come before those without
                          if (dateA && !dateB) return -1;
                          if (!dateA && dateB) return 1;
                          
                          // For projects without ship dates, sort by project number (most recent first)
                          const numA = parseInt(a.projectNumber?.replace(/\D/g, '') || '0') || 0;
                          const numB = parseInt(b.projectNumber?.replace(/\D/g, '') || '0') || 0;
                          return numB - numA;
                        })
                        .slice(0, 20); // Take top 20

                      return sortedProjects.map(project => {
                        // Get project schedules to determine schedule status
                        const projectSchedules = filteredSchedules.filter(s => s.projectId === project.id);
                        let scheduleStatus = 'unscheduled';
                        
                        if (projectSchedules.length > 0) {
                          const now = new Date();
                          const hasActiveSchedule = projectSchedules.some(schedule => {
                            const startDate = new Date(schedule.startDate);
                            const endDate = new Date(schedule.endDate);
                            return startDate <= now && endDate >= now;
                          });
                          scheduleStatus = hasActiveSchedule ? 'in-progress' : 'scheduled';
                        }

                        return (
                          <Card key={project.id} className="border border-gray-700 hover:border-gray-600 transition-colors">
                            <CardContent className="p-4">
                              <div className="flex flex-col space-y-3">
                                {/* Header with project number and name */}
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className="text-xs">
                                      {project.projectNumber}
                                    </Badge>
                                    <Badge className={`text-xs
                                      ${project.status === 'completed' && 'bg-green-500'} 
                                      ${project.status === 'at-risk' && 'bg-yellow-500'} 
                                      ${project.status === 'delayed' && 'bg-red-500'}
                                      ${(!project.status || project.status === 'active') && 'bg-blue-500'}
                                    `}>
                                      {project.status || 'Active'}
                                    </Badge>
                                  </div>
                                  <h3 className="font-semibold text-sm line-clamp-2 min-h-[2.5rem]">
                                    {project.name}
                                  </h3>
                                </div>

                                {/* Ship date */}
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-gray-400">Ship Date:</span>
                                  <span className={`font-medium ${project.shipDate ? 'text-white' : 'text-gray-500'}`}>
                                    {project.shipDate ? format(new Date(project.shipDate), 'MMM d, yyyy') : 'Not Set'}
                                  </span>
                                </div>

                                {/* Project Status */}
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-gray-400">Status:</span>
                                  <Badge className={`text-xs
                                    ${project.status === 'completed' && 'bg-green-500'} 
                                    ${project.status === 'at-risk' && 'bg-yellow-500'} 
                                    ${project.status === 'delayed' && 'bg-red-500'}
                                    ${(!project.status || project.status === 'active') && 'bg-blue-500'}
                                  `}>
                                    {project.status || 'Active'}
                                  </Badge>
                                </div>

                                {/* Total build hours from project data */}
                                {project.totalHours && (
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-400">Total Hours:</span>
                                    <span className="font-medium text-white">
                                      {project.totalHours}h
                                    </span>
                                  </div>
                                )}

                                {/* Customer if available */}
                                {project.customer && (
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-400">Customer:</span>
                                    <span className="font-medium text-white truncate max-w-[120px]" title={project.customer}>
                                      {project.customer}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      });
                    })()}
                    
                    {filteredProjects.filter(p => p.status !== 'delivered').length === 0 && (
                      <div className="col-span-full text-center py-6 text-gray-400">
                        No active projects found in the selected period
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Manufacturing Tab */}
            <TabsContent value="manufacturing">
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle>Bay Utilization</CardTitle>
                  <CardDescription>Current manufacturing capacity usage (Live Data)</CardDescription>
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
                        <Tooltip formatter={(value, name) => [
                          name === 'utilization' ? `${value}%` : `${value} hours`,
                          name === 'utilization' ? 'Utilization' : name === 'scheduled' ? 'Scheduled Hours' : 'Completed Hours'
                        ]} />
                        <Legend />
                        <Bar dataKey="utilization" fill="#8884d8" name="Utilization %" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Manufacturing Schedule Overview</CardTitle>
                  <CardDescription>Current schedules and capacity (Live Data)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{filteredSchedules.length}</div>
                      <p className="text-sm text-gray-400">Active Schedules</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{manufacturingBays.length}</div>
                      <p className="text-sm text-gray-400">Manufacturing Bays</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {filteredSchedules.reduce((sum, s) => sum + (s.totalHours || 0), 0)}
                      </div>
                      <p className="text-sm text-gray-400">Total Scheduled Hours</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {manufacturingData.slice(0, 5).map(bay => (
                      <div key={bay.bay} className="flex items-center justify-between p-3 border border-gray-700 rounded-lg">
                        <div>
                          <span className="font-medium">{bay.bay}</span>
                          <div className="text-sm text-gray-400 mt-1">
                            {bay.scheduled} scheduled hrs | {bay.completed} completed hrs
                          </div>
                        </div>
                        <Badge className={`
                          ${bay.utilization >= 80 && 'bg-red-500'} 
                          ${bay.utilization >= 60 && bay.utilization < 80 && 'bg-yellow-500'} 
                          ${bay.utilization < 60 && 'bg-green-500'}
                        `}>
                          {bay.utilization}% Utilized
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Mech Shop Tab */}
            <TabsContent value="mech-shop">
              {/* Mech Shop Metrics Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Total Projects</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {mechShopReportData?.metrics?.totalProjects || 0}
                    </div>
                    <p className="text-xs text-gray-400">In selected period</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">With Mech Shop Date</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-500">
                      {mechShopReportData?.metrics?.projectsWithMechShopDate || 0}
                    </div>
                    <p className="text-xs text-gray-400">
                      {mechShopReportData?.metrics?.totalProjects > 0 
                        ? Math.round((mechShopReportData?.metrics?.projectsWithMechShopDate || 0) / mechShopReportData?.metrics?.totalProjects * 100)
                        : 0}% of projects
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Due This Week</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-500">
                      {mechShopReportData?.metrics?.dueThisWeek || 0}
                    </div>
                    <p className="text-xs text-gray-400">Need attention</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Avg Days Before Production</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-500">
                      {mechShopReportData?.metrics?.averageDaysBeforeProduction || 0}
                    </div>
                    <p className="text-xs text-gray-400">Days lead time</p>
                  </CardContent>
                </Card>
              </div>

              {/* Monthly Mech Shop Trends */}
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle>Monthly Mech Shop Schedule</CardTitle>
                  <CardDescription>Scheduled vs completed mech shop work by month (Live Data)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={mechShopReportData?.monthlyData || []} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="scheduled" name="Scheduled" fill="#8884d8" />
                        <Bar dataKey="completed" name="Completed" fill="#00C49F" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Mech Shop Project List */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Mech Shop Schedule Details</CardTitle>
                    <CardDescription>All projects with mech shop dates and production timing</CardDescription>
                  </div>
                  <Button 
                    onClick={() => {
                      // Generate PDF report
                      const printWindow = window.open('', '_blank');
                      if (printWindow) {
                        const projects = mechShopReportData?.projects || [];
                        const html = `
                          <!DOCTYPE html>
                          <html>
                          <head>
                            <title>Mech Shop Report - ${format(new Date(), 'MMM d, yyyy')}</title>
                            <style>
                              body { font-family: Arial, sans-serif; margin: 20px; }
                              .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
                              .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px; }
                              .metric { border: 1px solid #ddd; padding: 15px; text-align: center; }
                              .metric-value { font-size: 24px; font-weight: bold; }
                              .metric-label { font-size: 12px; color: #666; }
                              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                              th { background-color: #f5f5f5; }
                              .status-completed { color: #10b981; }
                              .status-due { color: #f59e0b; }
                              .status-scheduled { color: #3b82f6; }
                              .status-none { color: #6b7280; }
                            </style>
                          </head>
                          <body>
                            <div class="header">
                              <h1>Mech Shop Report</h1>
                              <p>Generated on ${format(new Date(), 'MMMM d, yyyy')} | Period: ${dateRange.startDate} to ${dateRange.endDate}</p>
                            </div>
                            
                            <div class="metrics">
                              <div class="metric">
                                <div class="metric-value">${mechShopReportData?.metrics?.totalProjects || 0}</div>
                                <div class="metric-label">Total Projects</div>
                              </div>
                              <div class="metric">
                                <div class="metric-value">${mechShopReportData?.metrics?.projectsWithMechShopDate || 0}</div>
                                <div class="metric-label">With Mech Shop Date</div>
                              </div>
                              <div class="metric">
                                <div class="metric-value">${mechShopReportData?.metrics?.dueThisWeek || 0}</div>
                                <div class="metric-label">Due This Week</div>
                              </div>
                              <div class="metric">
                                <div class="metric-value">${mechShopReportData?.metrics?.averageDaysBeforeProduction || 0}</div>
                                <div class="metric-label">Avg Days Before Production</div>
                              </div>
                            </div>

                            <table>
                              <thead>
                                <tr>
                                  <th>Project Number</th>
                                  <th>Project Name</th>
                                  <th>Mech Shop Date</th>
                                  <th>Production Start</th>
                                  <th>Days Before Production</th>
                                  <th>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                ${projects.map(project => `
                                  <tr>
                                    <td>${project.projectNumber || 'N/A'}</td>
                                    <td>${project.name || 'N/A'}</td>
                                    <td>${project.mechShop ? format(new Date(project.mechShop), 'MMM d, yyyy') : 'Not Set'}</td>
                                    <td>${project.earliestProductionStart ? format(new Date(project.earliestProductionStart), 'MMM d, yyyy') : 'Not Scheduled'}</td>
                                    <td>${project.daysBeforeProduction !== null ? project.daysBeforeProduction + ' days' : 'N/A'}</td>
                                    <td class="status-${project.mechShopStatus.toLowerCase().replace(' ', '-')}">${project.mechShopStatus}</td>
                                  </tr>
                                `).join('')}
                              </tbody>
                            </table>
                          </body>
                          </html>
                        `;
                        printWindow.document.write(html);
                        printWindow.document.close();
                        printWindow.print();
                      }
                    }}
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Export PDF Report
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(mechShopReportData?.projects || []).slice(0, 20).map(project => (
                      <div key={project.id} className="flex items-center justify-between p-3 border border-gray-700 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{project.name}</span>
                            <Badge variant="outline">{project.projectNumber}</Badge>
                          </div>
                          <div className="text-sm text-gray-400 mt-1 grid grid-cols-2 gap-4">
                            <div>
                              Mech Shop: {project.mechShop ? format(new Date(project.mechShop), 'MMM d, yyyy') : 'Not Set'}
                            </div>
                            <div>
                              Production: {project.earliestProductionStart ? format(new Date(project.earliestProductionStart), 'MMM d, yyyy') : 'Not Scheduled'}
                            </div>
                          </div>
                          {project.daysBeforeProduction !== null && (
                            <div className="text-sm text-blue-400 mt-1">
                              {project.daysBeforeProduction} days before production
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Badge className={`
                            ${project.mechShopStatus === 'Completed' && 'bg-green-500'} 
                            ${project.mechShopStatus === 'Due This Week' && 'bg-yellow-500'} 
                            ${project.mechShopStatus === 'Scheduled' && 'bg-blue-500'}
                            ${project.mechShopStatus === 'No Mech Shop Date' && 'bg-gray-500'}
                          `}>
                            {project.mechShopStatus}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    
                    {(mechShopReportData?.projects || []).length === 0 && (
                      <div className="text-center py-6 text-gray-400">
                        No projects found in the selected period
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar with filters and info */}
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
                    <SelectItem value="mech-shop">Mech Shop</SelectItem>
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
                <Button variant="outline" className="w-full" onClick={handleExport} disabled={isExporting}>
                  <Download className="mr-2 h-4 w-4" /> Export to CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Live Data Status</CardTitle>
              <CardDescription>
                {dateRange.startDate} to {dateRange.endDate}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-400 mb-4">
                <div className="flex justify-between mb-2">
                  <span>Total Projects:</span>
                  <span className="font-medium text-white">{filteredProjects.length}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span>Total Milestones:</span>
                  <span className="font-medium text-white">{filteredMilestones.length}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span>Active Schedules:</span>
                  <span className="font-medium text-white">{filteredSchedules.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Updated:</span>
                  <span className="font-medium text-white">{format(new Date(), 'HH:mm:ss')}</span>
                </div>
              </div>

              <div className="border border-gray-700 p-3 rounded-lg bg-gray-800 bg-opacity-30">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarIcon className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium">Data Refresh</span>
                </div>
                <div className="text-xs text-gray-400 mb-2">
                  Reports automatically refresh every 30 seconds
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full" 
                  onClick={handleRefresh}
                  disabled={isLoading}
                >
                  <RefreshCw className={`mr-2 h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh Now
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;