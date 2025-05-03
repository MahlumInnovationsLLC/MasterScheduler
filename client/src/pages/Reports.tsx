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
import { Project, BillingMilestone, ManufacturingSchedule } from '@shared/schema';

const ReportsPage = () => {
  const { isAuthenticated } = useAuth();
  const [reportType, setReportType] = useState('financial');
  const [timeRange, setTimeRange] = useState('6months');
  const [projectFilter, setProjectFilter] = useState('all');

  // Calculate date ranges based on selected time range
  const now = new Date();
  const getDateRange = () => {
    switch (timeRange) {
      case '3months':
        return { start: subMonths(now, 3), end: now };
      case '6months':
        return { start: subMonths(now, 6), end: now };
      case '12months':
        return { start: subMonths(now, 12), end: now };
      case 'ytd':
        return { start: new Date(now.getFullYear(), 0, 1), end: now };
      default:
        return { start: subMonths(now, 6), end: now };
    }
  };

  const dateRange = getDateRange();

  // Fetch all projects
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    enabled: isAuthenticated,
  });

  // Fetch all billing milestones
  const { data: billingMilestones = [] } = useQuery<BillingMilestone[]>({
    queryKey: ['/api/billing-milestones'],
    enabled: isAuthenticated,
  });

  // Fetch all manufacturing schedules
  const { data: manufacturingSchedules = [] } = useQuery<ManufacturingSchedule[]>({
    queryKey: ['/api/manufacturing-schedules'],
    enabled: isAuthenticated,
  });

  // Filter data based on selected date range and project
  const filteredMilestones = billingMilestones.filter(milestone => {
    const milestoneDate = new Date(milestone.dueDate);
    const passesDateFilter = milestoneDate >= dateRange.start && milestoneDate <= dateRange.end;
    const passesProjectFilter = projectFilter === 'all' || milestone.projectId.toString() === projectFilter;
    return passesDateFilter && passesProjectFilter;
  });

  const filteredSchedules = manufacturingSchedules.filter(schedule => {
    const scheduleDate = new Date(schedule.startDate);
    const passesDateFilter = scheduleDate >= dateRange.start && scheduleDate <= dateRange.end;
    const passesProjectFilter = projectFilter === 'all' || schedule.projectId.toString() === projectFilter;
    return passesDateFilter && passesProjectFilter;
  });

  // Prepare financial data for charts
  const getFinancialData = () => {
    // Create monthly buckets
    const months: Record<string, { month: string, invoiced: number, received: number, outstanding: number }> = {};
    
    // Initialize months in range
    let currentMonth = startOfMonth(dateRange.start);
    while (currentMonth <= dateRange.end) {
      const monthKey = format(currentMonth, 'yyyy-MM');
      months[monthKey] = {
        month: format(currentMonth, 'MMM yyyy'),
        invoiced: 0,
        received: 0,
        outstanding: 0
      };
      currentMonth = startOfMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)));
    }
    
    // Fill in milestone data
    filteredMilestones.forEach(milestone => {
      const monthKey = format(new Date(milestone.dueDate), 'yyyy-MM');
      if (months[monthKey]) {
        months[monthKey].invoiced += milestone.amount;
        
        if (milestone.status === 'Paid') {
          months[monthKey].received += milestone.amount;
        } else {
          months[monthKey].outstanding += milestone.amount;
        }
      }
    });
    
    return Object.values(months);
  };

  // Prepare project status data for charts
  const getProjectStatusData = () => {
    const statusCounts = {
      'On Track': 0,
      'At Risk': 0,
      'Delayed': 0,
      'Completed': 0
    };

    const filteredProjects = projects.filter(project => 
      projectFilter === 'all' || project.id.toString() === projectFilter
    );
    
    filteredProjects.forEach(project => {
      if (statusCounts.hasOwnProperty(project.status)) {
        statusCounts[project.status as keyof typeof statusCounts]++;
      }
    });
    
    return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
  };

  // Prepare manufacturing data for charts
  const getManufacturingData = () => {
    const bayUtilization: Record<string, { bay: string, scheduled: number, completed: number, utilization: number }> = {};
    
    // Get all unique bay IDs
    const uniqueBayIds = [...new Set(filteredSchedules.map(schedule => schedule.bayId))];
    
    uniqueBayIds.forEach(bayId => {
      const baySchedules = filteredSchedules.filter(schedule => schedule.bayId === bayId);
      const bayName = `Bay ${bayId}`;
      
      const totalDays = baySchedules.reduce((total, schedule) => {
        const start = new Date(schedule.startDate);
        const end = new Date(schedule.endDate);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        return total + days;
      }, 0);
      
      const completedDays = baySchedules
        .filter(schedule => schedule.status === 'Completed')
        .reduce((total, schedule) => {
          const start = new Date(schedule.startDate);
          const end = new Date(schedule.endDate);
          const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          return total + days;
        }, 0);
      
      // Calculate utilization as a percentage of the date range
      const dateRangeDays = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
      const utilization = dateRangeDays > 0 ? (totalDays / dateRangeDays) * 100 : 0;
      
      bayUtilization[bayName] = {
        bay: bayName,
        scheduled: totalDays,
        completed: completedDays,
        utilization: Math.min(100, Math.round(utilization))
      };
    });
    
    return Object.values(bayUtilization);
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

  // Calculate summary metrics
  const totalInvoiced = filteredMilestones.reduce((sum, milestone) => sum + milestone.amount, 0);
  const totalReceived = filteredMilestones
    .filter(milestone => milestone.status === 'Paid')
    .reduce((sum, milestone) => sum + milestone.amount, 0);
  const totalOutstanding = totalInvoiced - totalReceived;
  
  const upcomingMilestones = filteredMilestones
    .filter(milestone => milestone.status === 'Pending' || milestone.status === 'Invoiced')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

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
          
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" /> Export Report
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
                {format(dateRange.start, 'MMM d, yyyy')} - {format(dateRange.end, 'MMM d, yyyy')}
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
                    <div>{format(dateRange.start, 'MMM d, yyyy')}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">End Date</div>
                    <div>{format(dateRange.end, 'MMM d, yyyy')}</div>
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