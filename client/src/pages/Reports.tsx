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
  AreaChart,
  Area,
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, addDays, addWeeks, addMonths, isBefore, isAfter, differenceInDays, startOfWeek, endOfWeek } from 'date-fns';
import { calculateWeeklyBayUtilization } from '@shared/utils/bay-utilization';
import { ArrowLeft, FileOutput } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Project, BillingMilestone, ManufacturingSchedule } from '@shared/schema';

const ReportsPage = () => {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [reportType, setReportType] = useState('financial');
  const [futureTimePeriod, setFutureTimePeriod] = useState('next-6-months');

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

  // Calculate real-time financial metrics
  const totalInvoiced = billingMilestones.reduce((sum, milestone) => {
    const amount = typeof milestone.amount === 'string' ? parseFloat(milestone.amount) : milestone.amount;
    return sum + (amount || 0);
  }, 0);

  const totalReceived = billingMilestones
    .filter(milestone => milestone.status === 'paid')
    .reduce((sum, milestone) => {
      const amount = typeof milestone.amount === 'string' ? parseFloat(milestone.amount) : milestone.amount;
      return sum + (amount || 0);
    }, 0);

  const totalOutstanding = totalInvoiced - totalReceived;

  const upcomingMilestones = billingMilestones
    .filter(milestone => milestone.status === 'upcoming' || milestone.status === 'invoiced')
    .sort((a, b) => new Date(a.targetInvoiceDate).getTime() - new Date(b.targetInvoiceDate).getTime())
    .slice(0, 10);

  // Prepare financial chart data
  const getFinancialData = () => {
    const months: Record<string, { month: string, invoiced: number, received: number, outstanding: number }> = {};

    // Initialize months in range
    const startDate = new Date('2024-01-01');
    const endDate = new Date();
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
    billingMilestones.forEach(milestone => {
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
    queryKey: [`/api/reports/project-status`],
    queryFn: () => fetch(`/api/reports/project-status`).then(res => res.json()),
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  // Fetch mech shop report data
  const { data: mechShopReportData, isLoading: mechShopReportLoading } = useQuery({
    queryKey: [`/api/reports/mech-shop`],
    queryFn: () => fetch(`/api/reports/mech-shop`).then(res => res.json()),
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  // Fetch actual delivered projects data from OTD module
  const { data: deliveredProjectsData, isLoading: deliveredProjectsLoading } = useQuery({
    queryKey: ['/api/delivered-projects'],
    queryFn: () => fetch('/api/delivered-projects').then(res => res.json()),
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  const manufacturingData = [];
  const isLoading = projectsLoading || milestonesLoading || schedulesLoading || baysLoading;

  const financialData = getFinancialData();

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  // Future Predictions Functions
  const getFutureBayUtilization = () => {
    return [];
  };

  const getNextAvailableBays = () => {
    return [];
  };

  const getProjectDeliveryPredictions = () => {
    return [];
  };

  const getCapacityForecast = () => {
    return [];
  };

  // Generate predictions data
  const futureBayUtilization = getFutureBayUtilization();
  const nextAvailableBays = getNextAvailableBays();
  const projectDeliveryPredictions = getProjectDeliveryPredictions();
  const capacityForecast = getCapacityForecast();

  return (
    <div className="container mx-auto py-6 max-w-7xl px-4 sm:px-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            className="mr-2"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Reports & Analytics</h1>
            <p className="text-muted-foreground">View project insights and export reports</p>
          </div>
        </div>

        {/* Export Reports Button */}
        <div className="flex items-center gap-3">
          <Button onClick={() => navigate('/export-reports')}>
            <FileOutput className="mr-2 h-4 w-4" />
            Export Reports
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Loading latest data...</span>
        </div>
      )}

      <div className="w-full">
        {/* Report Type Selector */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Report Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="financial">Financial Reports</SelectItem>
                <SelectItem value="project">Project Status</SelectItem>
                <SelectItem value="manufacturing">Manufacturing</SelectItem>
                <SelectItem value="mech-shop">Mech Shop</SelectItem>
                <SelectItem value="future-predictions">Future Predictions</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="financial" value={reportType} onValueChange={setReportType}>
          <TabsList className="grid grid-cols-6 mb-4">
            <TabsTrigger value="financial">Financial Reports</TabsTrigger>
            <TabsTrigger value="project">Project Status</TabsTrigger>
            <TabsTrigger value="manufacturing">Manufacturing</TabsTrigger>
            <TabsTrigger value="mech-shop">Mech Shop</TabsTrigger>
            <TabsTrigger value="future-predictions">Future Predictions</TabsTrigger>
            <TabsTrigger value="nomad-gcs-analytics">Nomad GCS Analytics</TabsTrigger>
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
                  <p className="text-xs text-gray-400">From {upcomingMilestones.length} milestones</p>
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
                {/* Upcoming Milestones Placeholder */}
                <div>
                  <p>Upcoming Milestones content will be displayed here.</p>
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
                  {/* Delivered Projects Placeholder */}
                  <div>
                    <p>Delivered Projects content will be displayed here.</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">In Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* In Progress Projects Placeholder */}
                  <div>
                    <p>In Progress Projects content will be displayed here.</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Scheduled</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Scheduled Projects Placeholder */}
                  <div>
                    <p>Scheduled Projects content will be displayed here.</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Unscheduled</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Unscheduled Projects Placeholder */}
                  <div>
                    <p>Unscheduled Projects content will be displayed here.</p>
                  </div>
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
                  {/* On-Time Delivery Rate Placeholder */}
                  <div>
                    <p>On-Time Delivery Rate content will be displayed here.</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Average Days Late</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Average Days Late Placeholder */}
                  <div>
                    <p>Average Days Late content will be displayed here.</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Total Projects</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Total Projects Placeholder */}
                  <div>
                    <p>Total Projects content will be displayed here.</p>
                  </div>
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
                  {/* Monthly Delivery Trends Placeholder */}
                  <div>
                    <p>Monthly Delivery Trends content will be displayed here.</p>
                  </div>
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
                  {/* Project Issue Distribution Placeholder */}
                  <div>
                    <p>Project Issue Distribution content will be displayed here.</p>
                  </div>
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
                {/* Top 20 Projects Placeholder */}
                <div>
                  <p>Top 20 Projects content will be displayed here.</p>
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
                {/* Manufacturing Schedule Overview Placeholder */}
                <div>
                  <p>Manufacturing Schedule Overview content will be displayed here.</p>
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
                  {/* Total Projects Placeholder */}
                  <div>
                    <p>Total Projects content will be displayed here.</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">With Mech Shop Date</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Projects With Mech Shop Date Placeholder */}
                  <div>
                    <p>Projects With Mech Shop Date content will be displayed here.</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Due This Week</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Projects Due This Week Placeholder */}
                  <div>
                    <p>Projects Due This Week content will be displayed here.</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Avg Days Before Production</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Average Days Before Production Placeholder */}
                  <div>
                    <p>Average Days Before Production content will be displayed here.</p>
                  </div>
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
                  {/* Monthly Mech Shop Trends Placeholder */}
                  <div>
                    <p>Monthly Mech Shop Trends content will be displayed here.</p>
                  </div>
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
                {/* Mech Shop Export Button Placeholder */}
                <div>
                  <p>Mech Shop Export Button content will be displayed here.</p>
                </div>
              </CardHeader>
              <CardContent>
                {/* Mech Shop Project List Placeholder */}
                <div>
                  <p>Mech Shop Project List content will be displayed here.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Future Predictions Tab */}
          <TabsContent value="future-predictions">
            {/* Predictions Overview Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-500" />
                    Next Available Bay
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Next Available Bay Placeholder */}
                  <div>
                    <p>Next Available Bay content will be displayed here.</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    Avg Future Utilization
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Average Future Utilization Placeholder */}
                  <div>
                    <p>Average Future Utilization content will be displayed here.</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    High Risk Projects
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* High Risk Projects Placeholder */}
                  <div>
                    <p>High Risk Projects content will be displayed here.</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-purple-500" />
                    Capacity Peak Week
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Capacity Peak Week Placeholder */}
                  <div>
                    <p>Capacity Peak Week content will be displayed here.</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Future Bay Utilization Chart */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Future Bay Utilization Predictions</CardTitle>
                    <CardDescription>Predicted bay utilization based on current schedules</CardDescription>
                  </div>
                  <Select value={futureTimePeriod} onValueChange={setFutureTimePeriod}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select time period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="this-month">This Month</SelectItem>
                      <SelectItem value="next-month">Next Month</SelectItem>
                      <SelectItem value="next-6-months">Next 6 Months</SelectItem>
                      <SelectItem value="this-quarter">This Quarter</SelectItem>
                      <SelectItem value="next-quarter">Next Quarter</SelectItem>
                      <SelectItem value="this-year">This Year</SelectItem>
                      <SelectItem value="next-year">Next Year</SelectItem>
                      <SelectItem value="next-2-years">Next 2 Years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {/* Future Bay Utilization Chart Placeholder */}
                  <div>
                    <p>Future Bay Utilization Chart content will be displayed here.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bay Availability Timeline */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Bay Availability Timeline</CardTitle>
                <CardDescription>When each manufacturing bay will become available for new projects</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Bay Availability Timeline Placeholder */}
                <div>
                  <p>Bay Availability Timeline content will be displayed here.</p>
                </div>
              </CardContent>
            </Card>

            {/* 12-Week Capacity Forecast */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>12-Week Capacity Forecast</CardTitle>
                <CardDescription>Manufacturing capacity utilization and availability over the next 12 weeks</CardDescription>
              </CardHeader>
              <CardContent>
                {/* 12-Week Capacity Forecast Placeholder */}
                <div>
                  <p>12-Week Capacity Forecast content will be displayed here.</p>
                </div>
              </CardContent>
            </Card>

            {/* Project Delivery Predictions */}
            <Card>
              <CardHeader>
                <CardTitle>Project Delivery Predictions</CardTitle>
                <CardDescription>Predicted completion and delivery dates for active projects based on current schedules</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Project Delivery Predictions Placeholder */}
                <div>
                  <p>Project Delivery Predictions content will be displayed here.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Nomad GCS Analytics Tab */}
          <TabsContent value="nomad-gcs-analytics">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Nomad GCS Internal Performance Analytics</h2>
                <Badge variant="outline" className="text-sm">
                  Performance Tracking
                </Badge>
              </div>

              <Tabs defaultValue="phase-handoffs" className="w-full">
                <TabsList className="grid grid-cols-4 mb-6">
                  <TabsTrigger value="phase-handoffs">Phase Handoff Performance</TabsTrigger>
                  <TabsTrigger value="schedule-changes">Schedule Change Control</TabsTrigger>
                  <TabsTrigger value="delivery-variance">Delivery vs Original Plan</TabsTrigger>
                  <TabsTrigger value="timeline-recovery">Timeline Recovery Analysis</TabsTrigger>
                </TabsList>

                {/* Phase Handoff Performance */}
                <TabsContent value="phase-handoffs" className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Clock className="h-5 w-5" />
                          Phase Handoff Timeline Performance
                        </CardTitle>
                        <CardDescription>
                          Tracking how well we meet internal phase transition deadlines
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {/* Phase Handoff Timeline Performance Placeholder */}
                        <div>
                          <p>Phase Handoff Timeline Performance content will be displayed here.</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5" />
                          Timeline Recovery Rate
                        </CardTitle>
                        <CardDescription>
                          Projects that recovered to original planned dates
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {/* Timeline Recovery Rate Placeholder */}
                        <div>
                          <p>Timeline Recovery Rate content will be displayed here.</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Delivered Projects with Late Handoffs (Not Recovered)</CardTitle>
                      <CardDescription>
                        Projects that were delivered despite having delayed phase handoffs that were never brought back to original schedule
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {/* Delivered Projects with Late Handoffs Placeholder */}
                      <div>
                        <p>Delivered Projects with Late Handoffs content will be displayed here.</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Schedule Change Control */}
                <TabsContent value="schedule-changes" className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5" />
                          Schedule Change Control Overview
                        </CardTitle>
                        <CardDescription>
                          Real data analysis of projects requiring schedule changes
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {/* Schedule Change Control Overview Placeholder */}
                        <div>
                          <p>Schedule Change Control Overview content will be displayed here.</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Phase Change Impact Analysis</CardTitle>
                        <CardDescription>
                          Breakdown of schedule changes by manufacturing phase
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {/* Phase Change Impact Analysis Placeholder */}
                        <div>
                          <p>Phase Change Impact Analysis content will be displayed here.</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Biggest Schedule Changes</CardTitle>
                        <CardDescription>
                          Projects with largest schedule variances requiring change control
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {/* Biggest Schedule Changes Placeholder */}
                        <div>
                          <p>Biggest Schedule Changes content will be displayed here.</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>All Projects with Schedule Changes</CardTitle>
                      <CardDescription>
                        Complete list of projects that have any schedule changes from original planned dates
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {/* All Projects with Schedule Changes Placeholder */}
                      <div>
                        <p>All Projects with Schedule Changes content will be displayed here.</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Delivery vs Original Plan */}
                <TabsContent value="delivery-variance" className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Calendar className="h-5 w-5" />
                          Delivery Performance vs Original Plan
                        </CardTitle>
                        <CardDescription>
                          Real data from On Time Delivery module comparing actual vs planned delivery dates
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {/* Delivery Performance vs Original Plan Placeholder */}
                        <div>
                          <p>Delivery Performance vs Original Plan content will be displayed here.</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Delivery Variance Analysis</CardTitle>
                        <CardDescription>
                          Statistical analysis of delivery delays and early deliveries from OTD module
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {/* Delivery Variance Analysis Placeholder */}
                        <div>
                          <p>Delivery Variance Analysis content will be displayed here.</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Worst Delivery Variances</CardTitle>
                        <CardDescription>
                          Projects with the largest delivery delays from OTD module
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {/* Worst Delivery Variances Placeholder */}
                        <div>
                          <p>Worst Delivery Variances content will be displayed here.</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Additional Analysis */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Delivery Trend Over Time</CardTitle>
                        <CardDescription>
                          Monthly on-time delivery performance
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {/* Delivery Trend Over Time Placeholder */}
                        <div>
                          <p>Delivery Trend Over Time content will be displayed here.</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Delivery Performance by Project Size</CardTitle>
                        <CardDescription>
                          On-time delivery rates by project complexity/size
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {/* Delivery Performance by Project Size Placeholder */}
                        <div>
                          <p>Delivery Performance by Project Size content will be displayed here.</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Timeline Recovery Analysis */}
                <TabsContent value="timeline-recovery" className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <RefreshCw className="h-5 w-5" />
                          Timeline Recovery Success Rate
                        </CardTitle>
                        <CardDescription>
                          Analysis of projects that successfully recovered delayed milestones back to original planned dates
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {/* Timeline Recovery Success Rate Placeholder */}
                        <div>
                          <p>Timeline Recovery Success Rate content will be displayed here.</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Recovery Performance by Phase</CardTitle>
                        <CardDescription>
                          Detailed breakdown of timeline recovery success by manufacturing phase
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {/* Recovery Performance by Phase Placeholder */}
                        <div>
                          <p>Recovery Performance by Phase content will be displayed here.</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Best Recovery Examples</CardTitle>
                      <CardDescription>
                        Projects that successfully brought milestones back to original planned dates
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {/* Best Recovery Examples Placeholder */}
                      <div>
                        <p>Best Recovery Examples content will be displayed here.</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ReportsPage;