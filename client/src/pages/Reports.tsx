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
  AreaChart,
  Area,
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, addDays, addWeeks, addMonths, isBefore, isAfter, differenceInDays, startOfWeek, endOfWeek } from 'date-fns';
import { calculateWeeklyBayUtilization } from '@shared/utils/bay-utilization';
import { Download, FileText, Calendar as CalendarIcon, RefreshCw, TrendingUp, Clock, AlertTriangle, Calendar } from 'lucide-react';
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
  const [futureTimePeriod, setFutureTimePeriod] = useState('next-6-months');
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

  // Future Predictions Functions
  const getFutureBayUtilization = () => {
    const futureMonths = [];
    // Force current date to be June 27, 2025 (today)
    const now = new Date('2025-06-27');
    
    // Determine number of months based on time period selection
    let monthsToGenerate = 6;
    switch (futureTimePeriod) {
      case 'this-month':
        monthsToGenerate = 1;
        break;
      case 'next-month':
        monthsToGenerate = 2;
        break;
      case 'this-quarter':
        monthsToGenerate = 3;
        break;
      case 'next-quarter':
        monthsToGenerate = 6;
        break;
      case 'this-year':
        monthsToGenerate = 12;
        break;
      case 'next-year':
        monthsToGenerate = 24;
        break;
      case 'next-2-years':
        monthsToGenerate = 24;
        break;
      default:
        monthsToGenerate = 6; // next-6-months
    }
    
    // Generate predictions for the specified time period
    for (let i = 0; i < monthsToGenerate; i++) {
      const futureDate = addMonths(now, i);
      const monthKey = format(futureDate, 'MMM yyyy');
      
      // Calculate future schedules that extend into this month
      const monthStart = i === 0 ? now : startOfMonth(futureDate); // Start from today for current month
      const monthEnd = endOfMonth(futureDate);
      
      // Use new phase-based weekly calculation and aggregate by month
      const weeksInMonth = Math.ceil(differenceInDays(monthEnd, monthStart) / 7);
      
      // Debug: Log the month we're calculating for
      if (i === 0) {
        console.log(`🔍 FUTURE PREDICTIONS: Calculating for month ${monthKey}, start: ${format(monthStart, 'yyyy-MM-dd')}, end: ${format(monthEnd, 'yyyy-MM-dd')}`);
      }
      
      const weeklyUtilizations = calculateWeeklyBayUtilization(
        filteredSchedules.map(schedule => ({
          id: schedule.id,
          projectId: schedule.projectId,
          bayId: schedule.bayId,
          startDate: new Date(schedule.startDate),
          endDate: new Date(schedule.endDate),
          totalHours: schedule.totalHours || 1000
        })),
        filteredProjects.map(project => ({
          id: project.id,
          name: project.name,
          projectNumber: project.projectNumber,
          totalHours: project.totalHours,
          fabPercentage: 27,
          paintPercentage: 7,
          productionPercentage: 60,
          itPercentage: 7,
          ntcPercentage: 7,
          qcPercentage: 7
        })),
        manufacturingBays.filter(bay => 
          bay.team && 
          !bay.team.toUpperCase().includes('LIBBY') &&
          !bay.name.toUpperCase().includes('LIBBY')
        ),
        monthStart,
        weeksInMonth
      );
      
      // Group by bay and calculate monthly averages
      const futureBayData: Record<string, { bay: string, utilization: number, scheduledHours: number, projects: number }> = {};
      
      manufacturingBays.forEach(bay => {
        if (bay.team?.toUpperCase() === 'LIBBY') return; // Skip LIBBY team
        
        const bayWeeklyData = weeklyUtilizations.filter(w => w.bayId === bay.id);
        const totalProjects = new Set(bayWeeklyData.flatMap(w => w.alignedPhases.map(p => p.projectId))).size;
        
        // Use the new team-based utilization calculation directly without scaling
        // The team utilization is already correctly calculated (75%, 100%, 120%)
        const avgUtilization = bayWeeklyData.length > 0 
          ? bayWeeklyData.reduce((sum, w) => sum + w.utilizationPercentage, 0) / bayWeeklyData.length
          : 0;
        
        // Debug: Log final bay utilization for first month
        if (i === 0 && totalProjects > 0) {
          console.log(`📊 CHART DATA - ${bay.name} (${bay.team}): ${totalProjects} projects = ${Math.round(avgUtilization)}% utilization`);
        }
        
        futureBayData[bay.name] = {
          bay: bay.name,
          utilization: avgUtilization,
          scheduledHours: 0, // Not directly calculated in phase-based approach
          projects: totalProjects
        };
      });
      
      // Only include bays/teams that have active projects in the average
      const activeBays = Object.values(futureBayData).filter(bay => bay.projects > 0);
      const monthlyAverage = activeBays.length > 0 
        ? Math.round(activeBays.reduce((sum, bay) => sum + bay.utilization, 0) / activeBays.length)
        : 0;
      

      

      
      futureMonths.push({
        month: monthKey,
        bays: Object.values(futureBayData),
        averageUtilization: monthlyAverage
      });
    }
    
    return futureMonths;
  };

  const getNextAvailableBays = () => {
    const now = new Date();
    const bayAvailability: Array<{
      bayId: number;
      bayName: string;
      nextAvailable: Date;
      daysUntilFree: number;
      currentProject?: string;
      currentProjectEnd?: Date;
    }> = [];
    
    manufacturingBays.forEach(bay => {
      const baySchedules = filteredSchedules
        .filter(schedule => schedule.bayId === bay.id)
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
      
      let nextAvailable = now;
      let currentProject = '';
      let currentProjectEnd: Date | undefined;
      
      // Find the latest end date for this bay
      baySchedules.forEach(schedule => {
        const scheduleEnd = new Date(schedule.endDate);
        if (scheduleEnd > nextAvailable) {
          nextAvailable = scheduleEnd;
          const project = projects.find(p => p.id === schedule.projectId);
          currentProject = project?.name || `Project ${schedule.projectId}`;
          currentProjectEnd = scheduleEnd;
        }
      });
      
      // If bay is currently free, it's available now
      const activeSchedule = baySchedules.find(schedule => {
        const start = new Date(schedule.startDate);
        const end = new Date(schedule.endDate);
        return start <= now && end >= now;
      });
      
      if (!activeSchedule) {
        nextAvailable = now;
        currentProject = '';
        currentProjectEnd = undefined;
      }
      
      bayAvailability.push({
        bayId: bay.id,
        bayName: bay.name,
        nextAvailable,
        daysUntilFree: Math.max(0, Math.ceil((nextAvailable.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))),
        currentProject: currentProject || undefined,
        currentProjectEnd
      });
    });
    
    return bayAvailability.sort((a, b) => a.daysUntilFree - b.daysUntilFree);
  };

  const getProjectDeliveryPredictions = () => {
    const now = new Date();
    const predictions = [];
    
    // Focus on active projects with schedules
    const activeProjects = filteredProjects
      .filter(project => project.status === 'active' || project.status === 'pending')
      .slice(0, 20); // Limit to top 20 for performance
    
    activeProjects.forEach(project => {
      const projectSchedules = filteredSchedules.filter(s => s.projectId === project.id);
      
      if (projectSchedules.length > 0) {
        // Find latest end date among all schedules for this project
        const latestEndDate = projectSchedules.reduce((latest, schedule) => {
          const scheduleEnd = new Date(schedule.endDate);
          return scheduleEnd > latest ? scheduleEnd : latest;
        }, new Date(0));
        
        const daysUntilCompletion = Math.ceil((latestEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const totalHours = projectSchedules.reduce((sum, s) => sum + (s.totalHours || 0), 0);
        
        // Predict delivery based on manufacturing completion + buffer time
        const predictedDelivery = addDays(latestEndDate, 7); // 7-day buffer for final assembly/QC
        
        predictions.push({
          projectId: project.id,
          projectName: project.name,
          projectNumber: project.projectNumber,
          manufacturingComplete: latestEndDate,
          predictedDelivery,
          daysUntilDelivery: Math.ceil((predictedDelivery.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
          totalHours,
          scheduledBays: projectSchedules.length,
          riskLevel: daysUntilCompletion < 0 ? 'high' : daysUntilCompletion < 30 ? 'medium' : 'low'
        });
      }
    });
    
    return predictions.sort((a, b) => a.daysUntilDelivery - b.daysUntilDelivery);
  };

  const getCapacityForecast = () => {
    const forecast = [];
    const now = new Date();
    
    // Generate 12-week forecast
    for (let week = 1; week <= 12; week++) {
      const weekStart = addWeeks(now, week);
      const weekEnd = addDays(weekStart, 6);
      const weekLabel = `Week ${week} (${format(weekStart, 'MMM d')})`;
      
      let totalCapacity = 0;
      let usedCapacity = 0;
      
      manufacturingBays.forEach(bay => {
        // Assume 40 hours per week per bay
        totalCapacity += 40;
        
        const weekSchedules = filteredSchedules.filter(schedule => {
          const scheduleStart = new Date(schedule.startDate);
          const scheduleEnd = new Date(schedule.endDate);
          return schedule.bayId === bay.id && 
                 scheduleStart <= weekEnd && 
                 scheduleEnd >= weekStart;
        });
        
        weekSchedules.forEach(schedule => {
          const scheduleStart = new Date(schedule.startDate);
          const scheduleEnd = new Date(schedule.endDate);
          
          // Calculate overlap
          const overlapStart = scheduleStart > weekStart ? scheduleStart : weekStart;
          const overlapEnd = scheduleEnd < weekEnd ? scheduleEnd : weekEnd;
          
          if (overlapStart <= overlapEnd) {
            const overlapDays = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24));
            const scheduleDays = Math.ceil((scheduleEnd.getTime() - scheduleStart.getTime()) / (1000 * 60 * 60 * 24));
            const proportionalHours = scheduleDays > 0 ? (schedule.totalHours || 0) * (overlapDays / Math.max(1, scheduleDays)) : 0;
            usedCapacity += proportionalHours;
          }
        });
      });
      
      const utilizationPercent = totalCapacity > 0 ? Math.min(100, (usedCapacity / totalCapacity) * 100) : 0;
      
      forecast.push({
        week: weekLabel,
        weekNumber: week,
        totalCapacity: Math.round(totalCapacity),
        usedCapacity: Math.round(usedCapacity),
        availableCapacity: Math.round(totalCapacity - usedCapacity),
        utilization: Math.round(utilizationPercent)
      });
    }
    
    return forecast;
  };

  // Generate predictions data
  const futureBayUtilization = getFutureBayUtilization();
  const nextAvailableBays = getNextAvailableBays();
  const projectDeliveryPredictions = getProjectDeliveryPredictions();
  const capacityForecast = getCapacityForecast();

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

                                {/* Quality Status */}
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-gray-400">Status:</span>
                                  {(() => {
                                    // Get project's quality label
                                    const projectAssignments = allProjectLabelAssignments.filter(assignment => assignment.projectId === project.id);
                                    const majorLabel = availableLabels.find(l => l.name.toUpperCase().includes('MAJOR'));
                                    const minorLabel = availableLabels.find(l => l.name.toUpperCase().includes('MINOR'));
                                    const goodLabel = availableLabels.find(l => l.name.toUpperCase().includes('GOOD'));
                                    
                                    const hasMajor = majorLabel && projectAssignments.some(a => Number(a.labelId) === Number(majorLabel.id));
                                    const hasMinor = minorLabel && projectAssignments.some(a => Number(a.labelId) === Number(minorLabel.id));
                                    const hasGood = goodLabel && projectAssignments.some(a => Number(a.labelId) === Number(goodLabel.id));
                                    
                                    let statusText = 'Good';
                                    let statusColor = 'bg-green-500';
                                    
                                    if (hasMajor) {
                                      statusText = 'Major Issue';
                                      statusColor = 'bg-red-500';
                                    } else if (hasMinor) {
                                      statusText = 'Minor Issue';
                                      statusColor = 'bg-yellow-500';
                                    } else if (hasGood) {
                                      statusText = 'Good';
                                      statusColor = 'bg-green-500';
                                    }
                                    
                                    return (
                                      <Badge className={`text-xs text-white ${statusColor}`}>
                                        {statusText}
                                      </Badge>
                                    );
                                  })()}
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
                    <div className="text-2xl font-bold text-blue-500">
                      {nextAvailableBays[0]?.daysUntilFree === 0 ? 'Available Now' : `${nextAvailableBays[0]?.daysUntilFree || 0} Days`}
                    </div>
                    <p className="text-xs text-gray-400">
                      {nextAvailableBays[0]?.bayName || 'No bays found'}
                    </p>
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
                    <div className="text-2xl font-bold text-green-500">
                      {futureBayUtilization.length > 0 
                        ? Math.round(futureBayUtilization.reduce((sum, month) => sum + month.averageUtilization, 0) / futureBayUtilization.length)
                        : 0}%
                    </div>
                    <p className="text-xs text-gray-400">Next 6 months average</p>
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
                    <div className="text-2xl font-bold text-yellow-500">
                      {projectDeliveryPredictions.filter(p => p.riskLevel === 'high').length}
                    </div>
                    <p className="text-xs text-gray-400">Projects at risk</p>
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
                    <div className="text-2xl font-bold text-purple-500">
                      {capacityForecast.length > 0 
                        ? Math.max(...capacityForecast.map(week => week.utilization))
                        : 0}%
                    </div>
                    <p className="text-xs text-gray-400">
                      Week {capacityForecast.length > 0 
                        ? capacityForecast.find(week => week.utilization === Math.max(...capacityForecast.map(w => w.utilization)))?.weekNumber || 1
                        : 1}
                    </p>
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
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={futureBayUtilization} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis 
                          tickFormatter={(value) => `${value}%`}
                          domain={[0, 120]}
                          ticks={[0, 20, 40, 60, 80, 100, 120]}
                        />
                        <Tooltip 
                          formatter={(value, name) => [`${value}%`, 'Average Utilization']}
                          labelFormatter={(label) => `Month: ${label}`}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="averageUtilization" 
                          stroke="#8884d8" 
                          fill="#8884d8" 
                          fillOpacity={0.3}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
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
                  <div className="space-y-3">
                    {nextAvailableBays.slice(0, 8).map(bay => (
                      <div key={bay.bayId} className="flex items-center justify-between p-4 border border-gray-700 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-lg">{bay.bayName}</span>
                            <Badge className={`
                              ${bay.daysUntilFree === 0 && 'bg-green-500'} 
                              ${bay.daysUntilFree > 0 && bay.daysUntilFree <= 7 && 'bg-yellow-500'} 
                              ${bay.daysUntilFree > 7 && bay.daysUntilFree <= 30 && 'bg-orange-500'}
                              ${bay.daysUntilFree > 30 && 'bg-red-500'}
                            `}>
                              {bay.daysUntilFree === 0 ? 'Available Now' : 
                               bay.daysUntilFree === 1 ? '1 Day' : 
                               `${bay.daysUntilFree} Days`}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-400 mt-2 grid grid-cols-2 gap-4">
                            <div>
                              Available: {bay.daysUntilFree === 0 ? 'Now' : format(bay.nextAvailable, 'MMM d, yyyy')}
                            </div>
                            <div>
                              Current: {bay.currentProject || 'No active project'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
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
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={capacityForecast} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="week" 
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          interval={0}
                        />
                        <YAxis />
                        <Tooltip 
                          formatter={(value, name) => [
                            name === 'utilization' ? `${value}%` : `${value} hours`,
                            name === 'utilization' ? 'Utilization' : 
                            name === 'usedCapacity' ? 'Used Hours' : 'Available Hours'
                          ]}
                        />
                        <Legend />
                        <Bar dataKey="usedCapacity" name="Used Capacity" fill="#ef4444" />
                        <Bar dataKey="availableCapacity" name="Available Capacity" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
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
                  <div className="space-y-3">
                    {projectDeliveryPredictions.slice(0, 15).map(prediction => (
                      <div key={prediction.projectId} className="flex items-center justify-between p-4 border border-gray-700 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-medium">{prediction.projectName}</span>
                            <Badge variant="outline">{prediction.projectNumber}</Badge>
                            <Badge className={`
                              ${prediction.riskLevel === 'low' && 'bg-green-500'} 
                              ${prediction.riskLevel === 'medium' && 'bg-yellow-500'} 
                              ${prediction.riskLevel === 'high' && 'bg-red-500'}
                            `}>
                              {prediction.riskLevel.toUpperCase()} RISK
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-400 grid grid-cols-3 gap-4">
                            <div>
                              Manufacturing Complete: {format(prediction.manufacturingComplete, 'MMM d, yyyy')}
                            </div>
                            <div>
                              Predicted Delivery: {format(prediction.predictedDelivery, 'MMM d, yyyy')}
                            </div>
                            <div>
                              Total Hours: {prediction.totalHours}h across {prediction.scheduledBays} bays
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">
                            {prediction.daysUntilDelivery} Days
                          </div>
                          <div className="text-xs text-gray-400">Until delivery</div>
                        </div>
                      </div>
                    ))}
                    
                    {projectDeliveryPredictions.length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        No active projects with schedules found for predictions
                      </div>
                    )}
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
                          <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                              <div className="text-center p-4 bg-green-50 rounded-lg">
                                <div className="text-2xl font-bold text-green-600">
                                  {(() => {
                                    // Count individual phase handoffs that were on-time (actual <= OP date)
                                    let onTimeHandoffs = 0;
                                    filteredProjects.forEach(p => {
                                      if (p.productionStart && p.opProductionStart && new Date(p.productionStart) <= new Date(p.opProductionStart)) onTimeHandoffs++;
                                      if (p.paintStart && p.opPaintStart && new Date(p.paintStart) <= new Date(p.opPaintStart)) onTimeHandoffs++;
                                      if (p.itStart && p.opItStart && new Date(p.itStart) <= new Date(p.opItStart)) onTimeHandoffs++;
                                    });
                                    return onTimeHandoffs;
                                  })()}
                                </div>
                                <div className="text-sm text-green-700">On-Time Handoffs</div>
                              </div>
                              <div className="text-center p-4 bg-red-50 rounded-lg">
                                <div className="text-2xl font-bold text-red-600">
                                  {(() => {
                                    // Count individual phase handoffs that were delayed (actual > OP date)
                                    let delayedHandoffs = 0;
                                    filteredProjects.forEach(p => {
                                      if (p.productionStart && p.opProductionStart && new Date(p.productionStart) > new Date(p.opProductionStart)) delayedHandoffs++;
                                      if (p.paintStart && p.opPaintStart && new Date(p.paintStart) > new Date(p.opPaintStart)) delayedHandoffs++;
                                      if (p.itStart && p.opItStart && new Date(p.itStart) > new Date(p.opItStart)) delayedHandoffs++;
                                    });
                                    return delayedHandoffs;
                                  })()}
                                </div>
                                <div className="text-sm text-red-700">Delayed Handoffs</div>
                              </div>
                              <div className="text-center p-4 bg-blue-50 rounded-lg">
                                <div className="text-2xl font-bold text-blue-600">
                                  {(() => {
                                    // Calculate overall on-time percentage based on individual handoffs
                                    let onTimeHandoffs = 0;
                                    let totalHandoffs = 0;
                                    filteredProjects.forEach(p => {
                                      if (p.productionStart && p.opProductionStart) {
                                        totalHandoffs++;
                                        if (new Date(p.productionStart) <= new Date(p.opProductionStart)) onTimeHandoffs++;
                                      }
                                      if (p.paintStart && p.opPaintStart) {
                                        totalHandoffs++;
                                        if (new Date(p.paintStart) <= new Date(p.opPaintStart)) onTimeHandoffs++;
                                      }
                                      if (p.itStart && p.opItStart) {
                                        totalHandoffs++;
                                        if (new Date(p.itStart) <= new Date(p.opItStart)) onTimeHandoffs++;
                                      }
                                    });
                                    return totalHandoffs > 0 ? Math.round((onTimeHandoffs / totalHandoffs) * 100) : 100;
                                  })()}%
                                </div>
                                <div className="text-sm text-blue-700">Overall On-Time Rate</div>
                              </div>
                            </div>
                            
                            <div className="pt-4">
                              <h4 className="font-medium mb-3">Phase Performance Breakdown</h4>
                              <div className="space-y-3">
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                  <div>
                                    <span className="text-sm font-medium">PAINT Phase Handoffs</span>
                                    <div className="text-xs text-gray-500">
                                      Avg variance: {(() => {
                                        const paintProjects = filteredProjects.filter(p => p.paintStart && p.opPaintStart);
                                        if (paintProjects.length === 0) return '0 days';
                                        const totalVariance = paintProjects.reduce((sum, p) => {
                                          const variance = Math.abs(new Date(p.paintStart!).getTime() - new Date(p.opPaintStart!).getTime()) / (1000 * 60 * 60 * 24);
                                          return sum + variance;
                                        }, 0);
                                        return `${Math.round(totalVariance / paintProjects.length)} days`;
                                      })()}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <Badge variant={
                                      filteredProjects.filter(p => p.paintStart && p.opPaintStart).length > 0 ? "default" : "secondary"
                                    }>
                                      {filteredProjects.filter(p => p.paintStart && p.opPaintStart && 
                                        new Date(p.paintStart) <= new Date(p.opPaintStart)).length}/
                                      {filteredProjects.filter(p => p.paintStart && p.opPaintStart).length} On-Time
                                    </Badge>
                                    <div className="text-xs text-gray-500 mt-1">
                                      {filteredProjects.filter(p => p.paintStart && p.opPaintStart).length > 0 ? 
                                        Math.round((filteredProjects.filter(p => p.paintStart && p.opPaintStart && 
                                          new Date(p.paintStart) <= new Date(p.opPaintStart)).length / 
                                          filteredProjects.filter(p => p.paintStart && p.opPaintStart).length) * 100) : 0}% rate
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                  <div>
                                    <span className="text-sm font-medium">Production Phase Handoffs</span>
                                    <div className="text-xs text-gray-500">
                                      Avg variance: {(() => {
                                        const prodProjects = filteredProjects.filter(p => p.productionStart && p.opProductionStart);
                                        if (prodProjects.length === 0) return '0 days';
                                        const totalVariance = prodProjects.reduce((sum, p) => {
                                          const variance = Math.abs(new Date(p.productionStart!).getTime() - new Date(p.opProductionStart!).getTime()) / (1000 * 60 * 60 * 24);
                                          return sum + variance;
                                        }, 0);
                                        return `${Math.round(totalVariance / prodProjects.length)} days`;
                                      })()}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <Badge variant={
                                      filteredProjects.filter(p => p.productionStart && p.opProductionStart).length > 0 ? "default" : "secondary"
                                    }>
                                      {filteredProjects.filter(p => p.productionStart && p.opProductionStart && 
                                        new Date(p.productionStart) <= new Date(p.opProductionStart)).length}/
                                      {filteredProjects.filter(p => p.productionStart && p.opProductionStart).length} On-Time
                                    </Badge>
                                    <div className="text-xs text-gray-500 mt-1">
                                      {filteredProjects.filter(p => p.productionStart && p.opProductionStart).length > 0 ? 
                                        Math.round((filteredProjects.filter(p => p.productionStart && p.opProductionStart && 
                                          new Date(p.productionStart) <= new Date(p.opProductionStart)).length / 
                                          filteredProjects.filter(p => p.productionStart && p.opProductionStart).length) * 100) : 0}% rate
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                  <div>
                                    <span className="text-sm font-medium">IT Phase Handoffs</span>
                                    <div className="text-xs text-gray-500">
                                      Avg variance: {(() => {
                                        const itProjects = filteredProjects.filter(p => p.itStart && p.opItStart);
                                        if (itProjects.length === 0) return '0 days';
                                        const totalVariance = itProjects.reduce((sum, p) => {
                                          const variance = Math.abs(new Date(p.itStart!).getTime() - new Date(p.opItStart!).getTime()) / (1000 * 60 * 60 * 24);
                                          return sum + variance;
                                        }, 0);
                                        return `${Math.round(totalVariance / itProjects.length)} days`;
                                      })()}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <Badge variant={
                                      filteredProjects.filter(p => p.itStart && p.opItStart).length > 0 ? "default" : "secondary"
                                    }>
                                      {filteredProjects.filter(p => p.itStart && p.opItStart && 
                                        new Date(p.itStart) <= new Date(p.opItStart)).length}/
                                      {filteredProjects.filter(p => p.itStart && p.opItStart).length} On-Time
                                    </Badge>
                                    <div className="text-xs text-gray-500 mt-1">
                                      {filteredProjects.filter(p => p.itStart && p.opItStart).length > 0 ? 
                                        Math.round((filteredProjects.filter(p => p.itStart && p.opItStart && 
                                          new Date(p.itStart) <= new Date(p.opItStart)).length / 
                                          filteredProjects.filter(p => p.itStart && p.opItStart).length) * 100) : 0}% rate
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
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
                          <div className="space-y-4">
                            <div className="text-center p-6 bg-blue-50 rounded-lg">
                              <div className="text-3xl font-bold text-blue-600">
                                {Math.round((filteredProjects.filter(p => {
                                  // Check if project recovered to original dates
                                  const recoveredProduction = p.productionStart && p.opProductionStart && 
                                    new Date(p.productionStart) === new Date(p.opProductionStart);
                                  const recoveredPaint = p.paintStart && p.opPaintStart && 
                                    new Date(p.paintStart) === new Date(p.opPaintStart);
                                  return recoveredProduction || recoveredPaint;
                                }).length / Math.max(filteredProjects.length, 1)) * 100)}%
                              </div>
                              <div className="text-sm text-blue-700 mt-2">Timeline Recovery Rate</div>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>Projects Back on Track</span>
                                <span className="font-medium">
                                  {filteredProjects.filter(p => {
                                    const recoveredProduction = p.productionStart && p.opProductionStart && 
                                      new Date(p.productionStart) === new Date(p.opProductionStart);
                                    const recoveredPaint = p.paintStart && p.opPaintStart && 
                                      new Date(p.paintStart) === new Date(p.opPaintStart);
                                    return recoveredProduction || recoveredPaint;
                                  }).length}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Still Behind Schedule</span>
                                <span className="font-medium text-orange-600">
                                  {filteredProjects.filter(p => {
                                    const behindProduction = p.productionStart && p.opProductionStart && 
                                      new Date(p.productionStart) > new Date(p.opProductionStart);
                                    const behindPaint = p.paintStart && p.opPaintStart && 
                                      new Date(p.paintStart) > new Date(p.opPaintStart);
                                    return behindProduction || behindPaint;
                                  }).length}
                                </span>
                              </div>
                            </div>
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
                        <div className="space-y-3">
                          {(() => {
                            // Find delivered projects with late handoffs that were never recovered
                            const deliveredWithLateHandoffs = filteredProjects.filter(p => {
                              if (p.status !== 'delivered') return false;
                              
                              // Check for late handoffs that were never recovered
                              const paintLateNotRecovered = p.paintStart && p.opPaintStart && 
                                new Date(p.paintStart) > new Date(p.opPaintStart);
                              const productionLateNotRecovered = p.productionStart && p.opProductionStart && 
                                new Date(p.productionStart) > new Date(p.opProductionStart);
                              const itLateNotRecovered = p.itStart && p.opItStart && 
                                new Date(p.itStart) > new Date(p.opItStart);
                              
                              return paintLateNotRecovered || productionLateNotRecovered || itLateNotRecovered;
                            }).slice(0, 10);

                            if (deliveredWithLateHandoffs.length === 0) {
                              return (
                                <div className="text-center py-6 text-gray-500">
                                  <div className="text-xl font-bold text-green-600">Excellent Performance!</div>
                                  <div className="text-sm">All delivered projects met their phase handoff deadlines</div>
                                </div>
                              );
                            }

                            return deliveredWithLateHandoffs.map(project => {
                              const latePhases = [];
                              if (project.paintStart && project.opPaintStart && new Date(project.paintStart) > new Date(project.opPaintStart)) {
                                const daysLate = Math.ceil((new Date(project.paintStart).getTime() - new Date(project.opPaintStart).getTime()) / (1000 * 60 * 60 * 24));
                                latePhases.push(`PAINT (+${daysLate}d)`);
                              }
                              if (project.productionStart && project.opProductionStart && new Date(project.productionStart) > new Date(project.opProductionStart)) {
                                const daysLate = Math.ceil((new Date(project.productionStart).getTime() - new Date(project.opProductionStart).getTime()) / (1000 * 60 * 60 * 24));
                                latePhases.push(`Production (+${daysLate}d)`);
                              }
                              if (project.itStart && project.opItStart && new Date(project.itStart) > new Date(project.opItStart)) {
                                const daysLate = Math.ceil((new Date(project.itStart).getTime() - new Date(project.opItStart).getTime()) / (1000 * 60 * 60 * 24));
                                latePhases.push(`IT (+${daysLate}d)`);
                              }

                              return (
                                <div key={project.id} className="flex justify-between items-center p-3 bg-red-50 rounded">
                                  <div>
                                    <div className="font-medium text-gray-900">{project.projectNumber}</div>
                                    <div className="text-xs text-gray-500 truncate max-w-48" title={project.name}>
                                      {project.name}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <Badge variant="outline" className="text-red-700">
                                      {latePhases.join(', ')}
                                    </Badge>
                                    <div className="text-xs text-red-500 mt-1">Delivered with delays</div>
                                  </div>
                                </div>
                              );
                            });
                          })()}
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
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-center">
                              <div className="p-4 bg-red-50 rounded-lg">
                                <div className="text-2xl font-bold text-red-600">
                                  {(() => {
                                    // Projects with any schedule changes
                                    const withChanges = filteredProjects.filter(p => {
                                      const hasProductionChange = p.productionStart && p.opProductionStart && 
                                        new Date(p.productionStart).getTime() !== new Date(p.opProductionStart).getTime();
                                      const hasPaintChange = p.paintStart && p.opPaintStart && 
                                        new Date(p.paintStart).getTime() !== new Date(p.opPaintStart).getTime();
                                      const hasItChange = p.itStart && p.opItStart && 
                                        new Date(p.itStart).getTime() !== new Date(p.opItStart).getTime();
                                      const hasDeliveryChange = p.deliveryDate && p.opDeliveryDate && 
                                        new Date(p.deliveryDate).getTime() !== new Date(p.opDeliveryDate).getTime();
                                      return hasProductionChange || hasPaintChange || hasItChange || hasDeliveryChange;
                                    }).length;
                                    return withChanges;
                                  })()}
                                </div>
                                <div className="text-sm text-red-700">Projects with Changes</div>
                              </div>
                              <div className="p-4 bg-green-50 rounded-lg">
                                <div className="text-2xl font-bold text-green-600">
                                  {(() => {
                                    // Projects with no schedule changes
                                    const withoutChanges = filteredProjects.filter(p => {
                                      const hasData = (p.productionStart && p.opProductionStart) || 
                                                    (p.paintStart && p.opPaintStart) || 
                                                    (p.itStart && p.opItStart) || 
                                                    (p.deliveryDate && p.opDeliveryDate);
                                      if (!hasData) return false;
                                      
                                      const noProductionChange = !p.productionStart || !p.opProductionStart || 
                                        new Date(p.productionStart).getTime() === new Date(p.opProductionStart).getTime();
                                      const noPaintChange = !p.paintStart || !p.opPaintStart || 
                                        new Date(p.paintStart).getTime() === new Date(p.opPaintStart).getTime();
                                      const noItChange = !p.itStart || !p.opItStart || 
                                        new Date(p.itStart).getTime() === new Date(p.opItStart).getTime();
                                      const noDeliveryChange = !p.deliveryDate || !p.opDeliveryDate || 
                                        new Date(p.deliveryDate).getTime() === new Date(p.opDeliveryDate).getTime();
                                      return noProductionChange && noPaintChange && noItChange && noDeliveryChange;
                                    }).length;
                                    return withoutChanges;
                                  })()}
                                </div>
                                <div className="text-sm text-green-700">No Changes</div>
                              </div>
                            </div>
                            
                            <div className="pt-4">
                              <div className="text-center p-4 bg-blue-50 rounded-lg">
                                <div className="text-2xl font-bold text-blue-600">
                                  {(() => {
                                    const totalWithData = filteredProjects.filter(p => 
                                      (p.productionStart && p.opProductionStart) || 
                                      (p.paintStart && p.opPaintStart) || 
                                      (p.itStart && p.opItStart) || 
                                      (p.deliveryDate && p.opDeliveryDate)
                                    ).length;
                                    const withoutChanges = filteredProjects.filter(p => {
                                      const hasData = (p.productionStart && p.opProductionStart) || 
                                                    (p.paintStart && p.opPaintStart) || 
                                                    (p.itStart && p.opItStart) || 
                                                    (p.deliveryDate && p.opDeliveryDate);
                                      if (!hasData) return false;
                                      
                                      const noProductionChange = !p.productionStart || !p.opProductionStart || 
                                        new Date(p.productionStart).getTime() === new Date(p.opProductionStart).getTime();
                                      const noPaintChange = !p.paintStart || !p.opPaintStart || 
                                        new Date(p.paintStart).getTime() === new Date(p.opPaintStart).getTime();
                                      const noItChange = !p.itStart || !p.opItStart || 
                                        new Date(p.itStart).getTime() === new Date(p.opItStart).getTime();
                                      const noDeliveryChange = !p.deliveryDate || !p.opDeliveryDate || 
                                        new Date(p.deliveryDate).getTime() === new Date(p.opDeliveryDate).getTime();
                                      return noProductionChange && noPaintChange && noItChange && noDeliveryChange;
                                    }).length;
                                    return totalWithData > 0 ? Math.round((withoutChanges / totalWithData) * 100) : 0;
                                  })()}%
                                </div>
                                <div className="text-sm text-blue-700">Schedule Stability Rate</div>
                              </div>
                            </div>
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
                          <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                              <div>
                                <span className="text-sm font-medium">Production Phase Changes</span>
                                <div className="text-xs text-gray-500">
                                  Avg impact: {(() => {
                                    const changedProjects = filteredProjects.filter(p => p.productionStart && p.opProductionStart && 
                                      new Date(p.productionStart).getTime() !== new Date(p.opProductionStart).getTime());
                                    if (changedProjects.length === 0) return '0 days';
                                    const totalImpact = changedProjects.reduce((sum, p) => {
                                      return sum + Math.abs(new Date(p.productionStart!).getTime() - new Date(p.opProductionStart!).getTime()) / (1000 * 60 * 60 * 24);
                                    }, 0);
                                    return `${Math.round(totalImpact / changedProjects.length)} days`;
                                  })()}
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge variant={
                                  filteredProjects.filter(p => p.productionStart && p.opProductionStart && 
                                    new Date(p.productionStart).getTime() !== new Date(p.opProductionStart).getTime()).length > 5 ? "destructive" : "secondary"
                                }>
                                  {filteredProjects.filter(p => p.productionStart && p.opProductionStart && 
                                    new Date(p.productionStart).getTime() !== new Date(p.opProductionStart).getTime()).length}
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                              <div>
                                <span className="text-sm font-medium">PAINT Phase Changes</span>
                                <div className="text-xs text-gray-500">
                                  Avg impact: {(() => {
                                    const changedProjects = filteredProjects.filter(p => p.paintStart && p.opPaintStart && 
                                      new Date(p.paintStart).getTime() !== new Date(p.opPaintStart).getTime());
                                    if (changedProjects.length === 0) return '0 days';
                                    const totalImpact = changedProjects.reduce((sum, p) => {
                                      return sum + Math.abs(new Date(p.paintStart!).getTime() - new Date(p.opPaintStart!).getTime()) / (1000 * 60 * 60 * 24);
                                    }, 0);
                                    return `${Math.round(totalImpact / changedProjects.length)} days`;
                                  })()}
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge variant={
                                  filteredProjects.filter(p => p.paintStart && p.opPaintStart && 
                                    new Date(p.paintStart).getTime() !== new Date(p.opPaintStart).getTime()).length > 5 ? "destructive" : "secondary"
                                }>
                                  {filteredProjects.filter(p => p.paintStart && p.opPaintStart && 
                                    new Date(p.paintStart).getTime() !== new Date(p.opPaintStart).getTime()).length}
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                              <div>
                                <span className="text-sm font-medium">IT Phase Changes</span>
                                <div className="text-xs text-gray-500">
                                  Avg impact: {(() => {
                                    const changedProjects = filteredProjects.filter(p => p.itStart && p.opItStart && 
                                      new Date(p.itStart).getTime() !== new Date(p.opItStart).getTime());
                                    if (changedProjects.length === 0) return '0 days';
                                    const totalImpact = changedProjects.reduce((sum, p) => {
                                      return sum + Math.abs(new Date(p.itStart!).getTime() - new Date(p.opItStart!).getTime()) / (1000 * 60 * 60 * 24);
                                    }, 0);
                                    return `${Math.round(totalImpact / changedProjects.length)} days`;
                                  })()}
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge variant={
                                  filteredProjects.filter(p => p.itStart && p.opItStart && 
                                    new Date(p.itStart).getTime() !== new Date(p.opItStart).getTime()).length > 5 ? "destructive" : "secondary"
                                }>
                                  {filteredProjects.filter(p => p.itStart && p.opItStart && 
                                    new Date(p.itStart).getTime() !== new Date(p.opItStart).getTime()).length}
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                              <div>
                                <span className="text-sm font-medium">Delivery Date Changes</span>
                                <div className="text-xs text-gray-500">
                                  Avg impact: {(() => {
                                    const changedProjects = filteredProjects.filter(p => p.deliveryDate && p.opDeliveryDate && 
                                      new Date(p.deliveryDate).getTime() !== new Date(p.opDeliveryDate).getTime());
                                    if (changedProjects.length === 0) return '0 days';
                                    const totalImpact = changedProjects.reduce((sum, p) => {
                                      return sum + Math.abs(new Date(p.deliveryDate!).getTime() - new Date(p.opDeliveryDate!).getTime()) / (1000 * 60 * 60 * 24);
                                    }, 0);
                                    return `${Math.round(totalImpact / changedProjects.length)} days`;
                                  })()}
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge variant={
                                  filteredProjects.filter(p => p.deliveryDate && p.opDeliveryDate && 
                                    new Date(p.deliveryDate).getTime() !== new Date(p.opDeliveryDate).getTime()).length > 10 ? "destructive" : "secondary"
                                }>
                                  {filteredProjects.filter(p => p.deliveryDate && p.opDeliveryDate && 
                                    new Date(p.deliveryDate).getTime() !== new Date(p.opDeliveryDate).getTime()).length}
                                </Badge>
                              </div>
                            </div>
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
                          <div className="space-y-3">
                            {(() => {
                              const projectsWithVariances = filteredProjects
                                .map(p => {
                                  const variances = [];
                                  if (p.productionStart && p.opProductionStart) {
                                    variances.push(Math.abs(new Date(p.productionStart).getTime() - new Date(p.opProductionStart).getTime()) / (1000 * 60 * 60 * 24));
                                  }
                                  if (p.paintStart && p.opPaintStart) {
                                    variances.push(Math.abs(new Date(p.paintStart).getTime() - new Date(p.opPaintStart).getTime()) / (1000 * 60 * 60 * 24));
                                  }
                                  if (p.itStart && p.opItStart) {
                                    variances.push(Math.abs(new Date(p.itStart).getTime() - new Date(p.opItStart).getTime()) / (1000 * 60 * 60 * 24));
                                  }
                                  if (p.deliveryDate && p.opDeliveryDate) {
                                    variances.push(Math.abs(new Date(p.deliveryDate).getTime() - new Date(p.opDeliveryDate).getTime()) / (1000 * 60 * 60 * 24));
                                  }
                                  
                                  const maxVariance = variances.length > 0 ? Math.max(...variances) : 0;
                                  return { ...p, maxVariance: Math.round(maxVariance) };
                                })
                                .filter(p => p.maxVariance > 0)
                                .sort((a, b) => b.maxVariance - a.maxVariance)
                                .slice(0, 5);

                              if (projectsWithVariances.length === 0) {
                                return (
                                  <div className="text-center py-6 text-gray-500">
                                    <div className="text-xl font-bold text-green-600">Perfect!</div>
                                    <div className="text-sm">No significant schedule changes found</div>
                                  </div>
                                );
                              }

                              return projectsWithVariances.map(project => (
                                <div key={project.id} className="flex justify-between items-center p-2 bg-yellow-50 rounded text-sm">
                                  <div>
                                    <div className="font-medium text-gray-900">{project.projectNumber}</div>
                                    <div className="text-xs text-gray-500 truncate max-w-32" title={project.name}>
                                      {project.name}
                                    </div>
                                  </div>
                                  <Badge variant="outline" className="text-yellow-700">
                                    {project.maxVariance} days
                                  </Badge>
                                </div>
                              ));
                            })()}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
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
                            Real data from delivered projects comparing actual vs planned delivery dates
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="text-center p-4 bg-green-50 rounded-lg">
                                <div className="text-2xl font-bold text-green-600">
                                  {filteredProjects.filter(p => p.status === 'delivered' && p.deliveryDate && p.opDeliveryDate && 
                                    new Date(p.deliveryDate) <= new Date(p.opDeliveryDate)).length}
                                </div>
                                <div className="text-sm text-green-700">On-Time Deliveries</div>
                              </div>
                              <div className="text-center p-4 bg-red-50 rounded-lg">
                                <div className="text-2xl font-bold text-red-600">
                                  {filteredProjects.filter(p => p.status === 'delivered' && p.deliveryDate && p.opDeliveryDate && 
                                    new Date(p.deliveryDate) > new Date(p.opDeliveryDate)).length}
                                </div>
                                <div className="text-sm text-red-700">Late Deliveries</div>
                              </div>
                            </div>
                            
                            <div className="pt-4">
                              <div className="text-center p-4 bg-blue-50 rounded-lg">
                                <div className="text-2xl font-bold text-blue-600">
                                  {(() => {
                                    const deliveredWithData = filteredProjects.filter(p => p.status === 'delivered' && p.deliveryDate && p.opDeliveryDate);
                                    const onTimeDeliveries = deliveredWithData.filter(p => new Date(p.deliveryDate!) <= new Date(p.opDeliveryDate!));
                                    return deliveredWithData.length > 0 ? Math.round((onTimeDeliveries.length / deliveredWithData.length) * 100) : 0;
                                  })()}%
                                </div>
                                <div className="text-sm text-blue-700">On-Time Delivery Rate</div>
                              </div>
                            </div>

                            <div className="pt-2 border-t">
                              <div className="text-xs text-gray-500 space-y-1">
                                <div className="flex justify-between">
                                  <span>Total Delivered:</span>
                                  <span className="font-medium">{filteredProjects.filter(p => p.status === 'delivered').length}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>With Delivery Data:</span>
                                  <span className="font-medium">{filteredProjects.filter(p => p.status === 'delivered' && p.deliveryDate && p.opDeliveryDate).length}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Delivery Variance Analysis</CardTitle>
                          <CardDescription>
                            Statistical analysis of delivery delays and early deliveries
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="text-center p-4 bg-yellow-50 rounded-lg">
                              <div className="text-2xl font-bold text-yellow-600">
                                {(() => {
                                  const deliveredWithData = filteredProjects.filter(p => p.status === 'delivered' && p.deliveryDate && p.opDeliveryDate);
                                  if (deliveredWithData.length === 0) return '0';
                                  const totalVariance = deliveredWithData.reduce((sum, p) => {
                                    const variance = Math.abs(new Date(p.deliveryDate!).getTime() - new Date(p.opDeliveryDate!).getTime()) / (1000 * 60 * 60 * 24);
                                    return sum + variance;
                                  }, 0);
                                  return Math.round(totalVariance / deliveredWithData.length);
                                })()}
                              </div>
                              <div className="text-sm text-yellow-700">Avg Days Variance</div>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                                <span>Early Deliveries:</span>
                                <Badge variant="outline" className="text-green-600">
                                  {filteredProjects.filter(p => p.status === 'delivered' && p.deliveryDate && p.opDeliveryDate && 
                                    new Date(p.deliveryDate) < new Date(p.opDeliveryDate)).length}
                                </Badge>
                              </div>
                              <div className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                                <span>Exact On-Time:</span>
                                <Badge variant="outline" className="text-blue-600">
                                  {filteredProjects.filter(p => p.status === 'delivered' && p.deliveryDate && p.opDeliveryDate && 
                                    new Date(p.deliveryDate).getTime() === new Date(p.opDeliveryDate).getTime()).length}
                                </Badge>
                              </div>
                              <div className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                                <span>Late Deliveries:</span>
                                <Badge variant="outline" className="text-red-600">
                                  {filteredProjects.filter(p => p.status === 'delivered' && p.deliveryDate && p.opDeliveryDate && 
                                    new Date(p.deliveryDate) > new Date(p.opDeliveryDate)).length}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Worst Delivery Variances</CardTitle>
                          <CardDescription>
                            Projects with the largest delivery delays
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {(() => {
                              const deliveredWithVariance = filteredProjects
                                .filter(p => p.status === 'delivered' && p.deliveryDate && p.opDeliveryDate)
                                .map(p => ({
                                  ...p,
                                  varianceDays: Math.round((new Date(p.deliveryDate!).getTime() - new Date(p.opDeliveryDate!).getTime()) / (1000 * 60 * 60 * 24))
                                }))
                                .filter(p => p.varianceDays > 0)
                                .sort((a, b) => b.varianceDays - a.varianceDays)
                                .slice(0, 5);

                              if (deliveredWithVariance.length === 0) {
                                return (
                                  <div className="text-center py-6 text-gray-500">
                                    <div className="text-2xl font-bold text-green-600">Excellent!</div>
                                    <div className="text-sm">No late deliveries found</div>
                                  </div>
                                );
                              }

                              return deliveredWithVariance.map(project => (
                                <div key={project.id} className="flex justify-between items-center p-2 bg-red-50 rounded text-sm">
                                  <div>
                                    <div className="font-medium text-gray-900">{project.projectNumber}</div>
                                    <div className="text-xs text-gray-500 truncate max-w-32" title={project.name}>
                                      {project.name}
                                    </div>
                                  </div>
                                  <Badge variant="destructive">
                                    +{project.varianceDays} days
                                  </Badge>
                                </div>
                              ));
                            })()}
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
                          <div className="h-64 flex items-center justify-center">
                            {(() => {
                              const monthlyData = {};
                              filteredProjects
                                .filter(p => p.status === 'delivered' && p.deliveryDate && p.opDeliveryDate)
                                .forEach(p => {
                                  const month = format(new Date(p.deliveryDate!), 'MMM yyyy');
                                  if (!monthlyData[month]) {
                                    monthlyData[month] = { total: 0, onTime: 0 };
                                  }
                                  monthlyData[month].total++;
                                  if (new Date(p.deliveryDate!) <= new Date(p.opDeliveryDate!)) {
                                    monthlyData[month].onTime++;
                                  }
                                });

                              const chartData = Object.entries(monthlyData).map(([month, data]) => ({
                                month,
                                onTimeRate: Math.round((data.onTime / data.total) * 100),
                                total: data.total
                              })).slice(-6);

                              if (chartData.length === 0) {
                                return <div className="text-gray-500">No delivery data available for chart</div>;
                              }

                              return (
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" />
                                    <YAxis domain={[0, 100]} />
                                    <Tooltip formatter={(value, name) => [`${value}%`, 'On-Time Rate']} />
                                    <Bar dataKey="onTimeRate" fill="#10b981" />
                                  </BarChart>
                                </ResponsiveContainer>
                              );
                            })()}
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
                          <div className="space-y-4">
                            {(() => {
                              const deliveredProjects = filteredProjects.filter(p => p.status === 'delivered' && p.deliveryDate && p.opDeliveryDate);
                              
                              // Categorize by project name patterns (rough complexity indicator)
                              const categories = {
                                'IC Projects': deliveredProjects.filter(p => p.name.includes('_IC')),
                                'CCTV/Surveillance': deliveredProjects.filter(p => p.name.includes('CCTV') || p.name.includes('surveillance')),
                                'Upgrades/Mods': deliveredProjects.filter(p => p.name.includes('Upgrade') || p.name.includes('_Mod')),
                                'Other Systems': deliveredProjects.filter(p => !p.name.includes('_IC') && !p.name.includes('CCTV') && !p.name.includes('surveillance') && !p.name.includes('Upgrade') && !p.name.includes('_Mod'))
                              };

                              return Object.entries(categories).map(([category, projects]) => {
                                if (projects.length === 0) return null;
                                
                                const onTimeCount = projects.filter(p => new Date(p.deliveryDate!) <= new Date(p.opDeliveryDate!)).length;
                                const onTimeRate = Math.round((onTimeCount / projects.length) * 100);
                                
                                return (
                                  <div key={category} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                    <div>
                                      <span className="text-sm font-medium">{category}</span>
                                      <div className="text-xs text-gray-500">{projects.length} projects</div>
                                    </div>
                                    <div className="text-right">
                                      <Badge variant={onTimeRate >= 80 ? "default" : onTimeRate >= 60 ? "secondary" : "destructive"}>
                                        {onTimeRate}%
                                      </Badge>
                                      <div className="text-xs text-gray-500">{onTimeCount}/{projects.length}</div>
                                    </div>
                                  </div>
                                );
                              }).filter(Boolean);
                            })()}
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
                          <div className="space-y-6">
                            <div className="text-center p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
                              <div className="text-3xl font-bold text-green-600">
                                {(() => {
                                  const projectsWithData = filteredProjects.filter(p => 
                                    (p.productionStart && p.opProductionStart) ||
                                    (p.paintStart && p.opPaintStart) ||
                                    (p.itStart && p.opItStart) ||
                                    (p.deliveryDate && p.opDeliveryDate)
                                  );
                                  const recoveredProjects = projectsWithData.filter(p => {
                                    // Check if any phase was perfectly recovered to original date
                                    const productionRecovered = p.productionStart && p.opProductionStart && 
                                      new Date(p.productionStart).getTime() === new Date(p.opProductionStart).getTime();
                                    const paintRecovered = p.paintStart && p.opPaintStart && 
                                      new Date(p.paintStart).getTime() === new Date(p.opPaintStart).getTime();
                                    const itRecovered = p.itStart && p.opItStart && 
                                      new Date(p.itStart).getTime() === new Date(p.opItStart).getTime();
                                    const deliveryRecovered = p.deliveryDate && p.opDeliveryDate && 
                                      new Date(p.deliveryDate).getTime() === new Date(p.opDeliveryDate).getTime();
                                    return productionRecovered || paintRecovered || itRecovered || deliveryRecovered;
                                  });
                                  return projectsWithData.length > 0 ? Math.round((recoveredProjects.length / projectsWithData.length) * 100) : 0;
                                })()}%
                              </div>
                              <div className="text-sm text-green-700 mt-2">Overall Recovery Success Rate</div>
                              <div className="text-xs text-gray-500 mt-1">
                                Projects that brought delayed phases back to original planned dates
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div className="text-center p-4 bg-green-50 rounded-lg">
                                <div className="text-xl font-bold text-green-600">
                                  {filteredProjects.filter(p => {
                                    const hasRecovery = 
                                      (p.productionStart && p.opProductionStart && new Date(p.productionStart).getTime() === new Date(p.opProductionStart).getTime()) ||
                                      (p.paintStart && p.opPaintStart && new Date(p.paintStart).getTime() === new Date(p.opPaintStart).getTime()) ||
                                      (p.itStart && p.opItStart && new Date(p.itStart).getTime() === new Date(p.opItStart).getTime()) ||
                                      (p.deliveryDate && p.opDeliveryDate && new Date(p.deliveryDate).getTime() === new Date(p.opDeliveryDate).getTime());
                                    return hasRecovery;
                                  }).length}
                                </div>
                                <div className="text-sm text-green-700">Successful Recoveries</div>
                              </div>
                              <div className="text-center p-4 bg-red-50 rounded-lg">
                                <div className="text-xl font-bold text-red-600">
                                  {(() => {
                                    const projectsWithData = filteredProjects.filter(p => 
                                      (p.productionStart && p.opProductionStart) ||
                                      (p.paintStart && p.opPaintStart) ||
                                      (p.itStart && p.opItStart) ||
                                      (p.deliveryDate && p.opDeliveryDate)
                                    );
                                    const withDelays = projectsWithData.filter(p => {
                                      const productionDelayed = p.productionStart && p.opProductionStart && 
                                        new Date(p.productionStart) > new Date(p.opProductionStart);
                                      const paintDelayed = p.paintStart && p.opPaintStart && 
                                        new Date(p.paintStart) > new Date(p.opPaintStart);
                                      const itDelayed = p.itStart && p.opItStart && 
                                        new Date(p.itStart) > new Date(p.opItStart);
                                      const deliveryDelayed = p.deliveryDate && p.opDeliveryDate && 
                                        new Date(p.deliveryDate) > new Date(p.opDeliveryDate);
                                      return productionDelayed || paintDelayed || itDelayed || deliveryDelayed;
                                    });
                                    return withDelays.length;
                                  })()}
                                </div>
                                <div className="text-sm text-red-700">Still Behind Schedule</div>
                              </div>
                            </div>
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
                          <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                              <div>
                                <span className="text-sm font-medium">Production Phase Recovery</span>
                                <div className="text-xs text-gray-500">
                                  {(() => {
                                    const total = filteredProjects.filter(p => p.productionStart && p.opProductionStart).length;
                                    const recovered = filteredProjects.filter(p => p.productionStart && p.opProductionStart && 
                                      new Date(p.productionStart).getTime() === new Date(p.opProductionStart).getTime()).length;
                                    return total > 0 ? `${Math.round((recovered / total) * 100)}% success rate` : 'No data';
                                  })()}
                                </div>
                              </div>
                              <Badge variant="outline">
                                {filteredProjects.filter(p => p.productionStart && p.opProductionStart && 
                                  new Date(p.productionStart).getTime() === new Date(p.opProductionStart).getTime()).length}/
                                {filteredProjects.filter(p => p.productionStart && p.opProductionStart).length}
                              </Badge>
                            </div>
                            
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                              <div>
                                <span className="text-sm font-medium">PAINT Phase Recovery</span>
                                <div className="text-xs text-gray-500">
                                  {(() => {
                                    const total = filteredProjects.filter(p => p.paintStart && p.opPaintStart).length;
                                    const recovered = filteredProjects.filter(p => p.paintStart && p.opPaintStart && 
                                      new Date(p.paintStart).getTime() === new Date(p.opPaintStart).getTime()).length;
                                    return total > 0 ? `${Math.round((recovered / total) * 100)}% success rate` : 'No data';
                                  })()}
                                </div>
                              </div>
                              <Badge variant="outline">
                                {filteredProjects.filter(p => p.paintStart && p.opPaintStart && 
                                  new Date(p.paintStart).getTime() === new Date(p.opPaintStart).getTime()).length}/
                                {filteredProjects.filter(p => p.paintStart && p.opPaintStart).length}
                              </Badge>
                            </div>
                            
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                              <div>
                                <span className="text-sm font-medium">IT Phase Recovery</span>
                                <div className="text-xs text-gray-500">
                                  {(() => {
                                    const total = filteredProjects.filter(p => p.itStart && p.opItStart).length;
                                    const recovered = filteredProjects.filter(p => p.itStart && p.opItStart && 
                                      new Date(p.itStart).getTime() === new Date(p.opItStart).getTime()).length;
                                    return total > 0 ? `${Math.round((recovered / total) * 100)}% success rate` : 'No data';
                                  })()}
                                </div>
                              </div>
                              <Badge variant="outline">
                                {filteredProjects.filter(p => p.itStart && p.opItStart && 
                                  new Date(p.itStart).getTime() === new Date(p.opItStart).getTime()).length}/
                                {filteredProjects.filter(p => p.itStart && p.opItStart).length}
                              </Badge>
                            </div>
                            
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                              <div>
                                <span className="text-sm font-medium">Delivery Recovery</span>
                                <div className="text-xs text-gray-500">
                                  {(() => {
                                    const total = filteredProjects.filter(p => p.deliveryDate && p.opDeliveryDate).length;
                                    const recovered = filteredProjects.filter(p => p.deliveryDate && p.opDeliveryDate && 
                                      new Date(p.deliveryDate).getTime() === new Date(p.opDeliveryDate).getTime()).length;
                                    return total > 0 ? `${Math.round((recovered / total) * 100)}% success rate` : 'No data';
                                  })()}
                                </div>
                              </div>
                              <Badge variant="outline">
                                {filteredProjects.filter(p => p.deliveryDate && p.opDeliveryDate && 
                                  new Date(p.deliveryDate).getTime() === new Date(p.opDeliveryDate).getTime()).length}/
                                {filteredProjects.filter(p => p.deliveryDate && p.opDeliveryDate).length}
                              </Badge>
                            </div>
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
                        <div className="space-y-3">
                          {(() => {
                            const recoveredProjects = filteredProjects
                              .filter(p => {
                                const productionRecovered = p.productionStart && p.opProductionStart && 
                                  new Date(p.productionStart).getTime() === new Date(p.opProductionStart).getTime();
                                const paintRecovered = p.paintStart && p.opPaintStart && 
                                  new Date(p.paintStart).getTime() === new Date(p.opPaintStart).getTime();
                                const itRecovered = p.itStart && p.opItStart && 
                                  new Date(p.itStart).getTime() === new Date(p.opItStart).getTime();
                                const deliveryRecovered = p.deliveryDate && p.opDeliveryDate && 
                                  new Date(p.deliveryDate).getTime() === new Date(p.opDeliveryDate).getTime();
                                return productionRecovered || paintRecovered || itRecovered || deliveryRecovered;
                              })
                              .slice(0, 8);

                            if (recoveredProjects.length === 0) {
                              return (
                                <div className="text-center py-6 text-gray-500">
                                  <div className="text-xl font-bold text-blue-600">Analysis in Progress</div>
                                  <div className="text-sm">No recovered projects found in current filter range</div>
                                  <div className="text-xs mt-1">Try expanding the time range to see recovery examples</div>
                                </div>
                              );
                            }

                            return recoveredProjects.map(project => {
                              const recoveredPhases = [];
                              if (project.productionStart && project.opProductionStart && 
                                  new Date(project.productionStart).getTime() === new Date(project.opProductionStart).getTime()) {
                                recoveredPhases.push('Production');
                              }
                              if (project.paintStart && project.opPaintStart && 
                                  new Date(project.paintStart).getTime() === new Date(project.opPaintStart).getTime()) {
                                recoveredPhases.push('PAINT');
                              }
                              if (project.itStart && project.opItStart && 
                                  new Date(project.itStart).getTime() === new Date(project.opItStart).getTime()) {
                                recoveredPhases.push('IT');
                              }
                              if (project.deliveryDate && project.opDeliveryDate && 
                                  new Date(project.deliveryDate).getTime() === new Date(project.opDeliveryDate).getTime()) {
                                recoveredPhases.push('Delivery');
                              }

                              return (
                                <div key={project.id} className="flex justify-between items-center p-3 bg-green-50 rounded">
                                  <div>
                                    <div className="font-medium text-gray-900">{project.projectNumber}</div>
                                    <div className="text-xs text-gray-500 truncate max-w-48" title={project.name}>
                                      {project.name}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <Badge variant="outline" className="text-green-700">
                                      {recoveredPhases.join(', ')} Recovered
                                    </Badge>
                                    <div className="text-xs text-gray-500 mt-1">
                                      {recoveredPhases.length} phase{recoveredPhases.length !== 1 ? 's' : ''}
                                    </div>
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                </Tabs>
              </div>
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
                    <SelectItem value="future-predictions">Future Predictions</SelectItem>
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