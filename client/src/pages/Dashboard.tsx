import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { 
  Folders, 
  DollarSign, 
  Building2, 
  Flag,
  LineChart,
  Banknote,
  CheckSquare,
  Calendar,
  Users,
  Plus,
  Filter,
  SortDesc,
  ArrowUpRight,
  Shield,
  LogIn,
  BarChart3,
  Eye,
  Hammer,
  Wrench,
  Clock,
  CheckCircle,
  Search,
  Factory,
  Paintbrush,
  Settings,
  Monitor,
  TestTube,
  UserCheck,
  Truck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProjectStatsCard } from '@/components/ProjectStatusCard';
import { BillingStatusCard } from '@/components/BillingStatusCard';
import { ManufacturingCard } from '@/components/ManufacturingCard';
import { ProgressBadge } from '@/components/ui/progress-badge';
import { formatDate, formatCurrency, getProjectStatusColor, getProjectScheduleState, calculateBayUtilization, getBayStatusInfo } from '@/lib/utils';
import { DashboardTable } from '@/components/ui/dashboard-table';
import { ProjectStatusBreakdownCard } from '@/components/ProjectStatusBreakdownCard';
import { HighRiskProjectsCard } from '@/components/HighRiskProjectsCard';
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import ResizableBaySchedule from '@/components/ResizableBaySchedule';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useProjectLabelStats } from "@/hooks/use-project-label-stats";
import { ModuleHelpButton } from "@/components/ModuleHelpButton";
import { dashboardHelpContent } from "@/data/moduleHelpContent";
import { safeFilter, ensureArray, safeLength } from '@/lib/array-utils';

const Dashboard = () => {
  // Move ALL hooks to the top before any conditional returns
  const { user, isLoading: authLoading } = useAuth();
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const { toast } = useToast();
  
  // Removed useState for filteredProjects - will use useMemo instead
  const [selectedMonthData, setSelectedMonthData] = useState<{
    month: number;
    year: number;
    amount: number;
    milestones: any[];
  } | null>(null);
  const [columnFilter, setColumnFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState('all');

  const { data: projects = [], isLoading: isLoadingProjects } = useQuery({
    queryKey: ['/api/projects'],
    // Removed enabled condition to prevent conditional hooks
  });

  const { data: billingMilestones = [], isLoading: isLoadingBillingMilestones } = useQuery({
    queryKey: ['/api/billing-milestones'],
    // Removed enabled condition to prevent conditional hooks
  });

  const { data: manufacturingSchedules = [], isLoading: isLoadingManufacturing } = useQuery({
    queryKey: ['/api/manufacturing-schedules'],
    // Removed enabled condition to prevent conditional hooks
  });

  const { data: manufacturingBays = [], isLoading: isLoadingBays } = useQuery({
    queryKey: ['/api/manufacturing-bays'],
    // Removed enabled condition to prevent conditional hooks
  });

  // Fetch delivered projects for analytics
  const { data: deliveredProjects = [] } = useQuery({
    queryKey: ['/api/delivered-projects'],
    staleTime: 0,
    gcTime: 0,
    // Removed enabled condition to prevent conditional hooks
  });

  // Get label statistics - moved before conditional returns
  const labelStats = useProjectLabelStats();

  // Calculate delivered projects count
  const deliveredProjectsCount = deliveredProjects?.length || 0;

  // Move all hooks to the top before conditional returns
  // Show the top 10 projects that are ready to ship next with enhanced date calculations
  const filteredProjects = React.useMemo(() => {
    if (!projects) return [];

    // Helper to get valid dates and handle null/invalid dates with UTC
    const getValidDate = (dateStr) => {
      if (!dateStr) return null;
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date;
    };

    // Calculate NTC Test and QC Start dates based on ship date using UTC
    const calculatePhaseDate = (shipDate, daysBeforeShip) => {
      if (!shipDate) return null;
      const date = new Date(shipDate);
      date.setUTCDate(date.getUTCDate() - daysBeforeShip);
      return date.toISOString();
    };

    // Ensure projects is always an array
    const safeProjects = ensureArray(projects, [], 'Dashboard.projects');
    
    // Enhance projects with calculated phase dates
    const enhancedProjects = safeProjects.map(p => {
      const shipDate = getValidDate(p.shipDate);
      return {
        ...p,
        ntcTestStart: p.ntcTestStart || calculatePhaseDate(shipDate, 14), // 2 weeks before ship
        qcStart: p.qcStart || calculatePhaseDate(shipDate, 7) // 1 week before ship
      };
    });

    // Apply date range filter
    const getDateRangeFilteredProjects = (projects) => {
      if (dateRangeFilter === 'all') return projects;

      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay()); // Start of this week (Sunday)
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // End of this week (Saturday)

      const startOfNextWeek = new Date(endOfWeek);
      startOfNextWeek.setDate(endOfWeek.getDate() + 1);
      const endOfNextWeek = new Date(startOfNextWeek);
      endOfNextWeek.setDate(startOfNextWeek.getDate() + 6);

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);

      return safeFilter(projects, project => {
        const shipDate = getValidDate(project.shipDate);
        if (!shipDate) return false;

        switch (dateRangeFilter) {
          case 'this-week':
            return shipDate >= startOfWeek && shipDate <= endOfWeek;
          case 'next-week':
            return shipDate >= startOfNextWeek && shipDate <= endOfNextWeek;
          case 'this-month':
            return shipDate >= startOfMonth && shipDate <= endOfMonth;
          case 'next-month':
            return shipDate >= startOfNextMonth && shipDate <= endOfNextMonth;
          default:
            return true;
        }
      }, 'Dashboard.dateRangeFilter');
    };

    // Apply column filter
    const getColumnFilteredProjects = (projects) => {
      if (columnFilter === 'all') return projects;

      return safeFilter(projects, project => {
        const ntcTestDate = getValidDate(project.ntcTestStart);
        const qcStartDate = getValidDate(project.qcStart);
        const execReviewDate = getValidDate(project.executiveReview);
        const shipDate = getValidDate(project.shipDate);

        switch (columnFilter) {
          case 'ntc-test':
            return ntcTestDate !== null;
          case 'qc-start':
            return qcStartDate !== null;
          case 'exec-review':
            return execReviewDate !== null;
          case 'ship-date':
            return shipDate !== null;
          default:
            return true;
        }
      }, 'Dashboard.columnFilter');
    };

    // Apply filters and sort
    const filteredByDateRange = getDateRangeFilteredProjects(enhancedProjects);
    const filteredByColumn = getColumnFilteredProjects(filteredByDateRange);

    // Sort by ship date (soonest first) and filter for non-delivered projects
    const sortedByShipDate = filteredByColumn
      .sort((a, b) => {
        const shipDateA = getValidDate(a.shipDate);
        const shipDateB = getValidDate(b.shipDate);

        // Delivered projects go to the end
        const isDeliveredA = a.status === 'delivered';
        const isDeliveredB = b.status === 'delivered';

        if (isDeliveredA && !isDeliveredB) return 1;
        if (!isDeliveredA && isDeliveredB) return -1;

        // If both are delivered, sort by project number (descending)
        if (isDeliveredA && isDeliveredB) {
          const numA = parseInt(a.projectNumber.replace(/\D/g, '')) || 0;
          const numB = parseInt(b.projectNumber.replace(/\D/g, '')) || 0;
          return numB - numA;
        }

        // Projects without ship dates go to the end
        if (!shipDateA && !shipDateB) return 0;
        if (!shipDateA) return 1;
        if (!shipDateB) return -1;

        // Sort by ship date - soonest first
        return shipDateA.getTime() - shipDateB.getTime();
      });

    // Apply different limits based on filter state
    let finalList;
    
    if (dateRangeFilter === 'all' && columnFilter === 'all') {
      // No filters applied - limit to top 10 projects
      const nonDeliveredProjects = safeFilter(sortedByShipDate, p => p.status !== 'delivered', 'Dashboard.nonDelivered');
      const deliveredProjects = safeFilter(sortedByShipDate, p => p.status === 'delivered', 'Dashboard.delivered');

      // Take top 10 non-delivered projects, then add any delivered projects at the end
      finalList = [
        ...nonDeliveredProjects.slice(0, 10),
        ...deliveredProjects
      ].slice(0, 10); // Still limit to 10 total but prioritize non-delivered
    } else {
      // Any filter is applied - show ALL matching projects (no limit)
      finalList = sortedByShipDate;
    }

    return finalList;
  }, [projects, columnFilter, dateRangeFilter]);

  // Auto-snap to today on component mount and data load (horizontal only, no vertical scroll)
  useEffect(() => {
    if (manufacturingSchedules && manufacturingBays && projects) {
      // Wait for the schedule to render, then snap to today
      const timer = setTimeout(() => {
        const todayMarker = document.querySelector('.today-marker');
        if (todayMarker) {
          // Get the parent scrollable container
          const scrollContainer = todayMarker.closest('.overflow-auto');
          if (scrollContainer) {
            const markerRect = todayMarker.getBoundingClientRect();
            const containerRect = scrollContainer.getBoundingClientRect();

            // Calculate horizontal scroll position to center the today marker
            const markerLeft = todayMarker.offsetLeft;
            const containerWidth = scrollContainer.clientWidth;
            const scrollLeft = markerLeft - (containerWidth / 2);

            // Scroll horizontally only, preserve current vertical position
            scrollContainer.scrollTo({
              left: Math.max(0, scrollLeft),
              top: scrollContainer.scrollTop, // Keep current vertical position
              behavior: 'smooth'
            });
          }
        }
      }, 1000); // Give the component time to render

      return () => clearTimeout(timer);
    }
  }, [manufacturingSchedules, manufacturingBays, projects]);

  // Calculate billing stats with revenue forecast
  const billingStats = React.useMemo(() => {
    // Ensure billingMilestones is always an array
    const safeMilestones = ensureArray(billingMilestones, [], 'Dashboard.billingMilestones');
    
    if (safeMilestones.length === 0) return null;

    const completed = safeFilter(safeMilestones, m => m.status === 'paid', 'Dashboard.completed').length;
    const inProgress = safeFilter(safeMilestones, m => m.status === 'invoiced', 'Dashboard.inProgress').length;
    const overdue = safeFilter(safeMilestones, m => m.status === 'delayed', 'Dashboard.overdue').length;
    const upcoming = safeFilter(safeMilestones, m => m.status === 'upcoming', 'Dashboard.upcoming').length;

    // Calculate total amounts
    const totalReceived = safeFilter(safeMilestones, m => m.status === 'paid', 'Dashboard.totalReceived')
      .reduce((sum, m) => sum + parseFloat(m.amount || '0'), 0);

    const totalPending = safeFilter(safeMilestones, m => m.status === 'invoiced', 'Dashboard.totalPending')
      .reduce((sum, m) => sum + parseFloat(m.amount || '0'), 0);

    const totalOverdue = safeFilter(safeMilestones, m => m.status === 'delayed', 'Dashboard.totalOverdue')
      .reduce((sum, m) => sum + parseFloat(m.amount || '0'), 0);

    // Calculate forecast for next 12 months
    const now = new Date();
    const monthlyForecast = {};
    
    // Initialize next 12 months
    for (let i = 0; i < 12; i++) {
      const month = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthKey = `${month.getFullYear()}-${(month.getMonth() + 1).toString().padStart(2, '0')}`;
      monthlyForecast[monthKey] = 0;
    }

    // Add upcoming milestones to forecast
    safeFilter(safeMilestones, m => m.status === 'upcoming' && m.targetInvoiceDate, 'Dashboard.upcomingForecast')
      .forEach(m => {
        const targetDate = new Date(m.targetInvoiceDate);
        const monthKey = `${targetDate.getFullYear()}-${(targetDate.getMonth() + 1).toString().padStart(2, '0')}`;
        if (monthlyForecast[monthKey] !== undefined) {
          monthlyForecast[monthKey] += parseFloat(m.amount || '0');
        }
      });

    // Convert monthlyForecast to forecast format expected by BillingStatusCard
    const forecast = {
      labels: Object.keys(monthlyForecast).map(key => {
        const [year, month] = key.split('-');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return monthNames[parseInt(month) - 1];
      }),
      values: Object.values(monthlyForecast)
    };

    return {
      completed,
      inProgress,
      overdue,
      upcoming,
      totalReceived,
      totalPending,
      totalOverdue,
      monthlyForecast,
      forecast
    };
  }, [billingMilestones]);

  // Calculate project stats - moved before conditional returns
  const projectStats = React.useMemo(() => {
    // Ensure projects is always an array
    const safeProjects = ensureArray(projects, [], 'Dashboard.projectStats');
    
    if (safeProjects.length === 0) return null;

    // Get projects by schedule state
    const scheduledProjects = manufacturingSchedules 
      ? safeFilter(safeProjects, p => getProjectScheduleState(manufacturingSchedules, p.id) === 'Scheduled', 'Dashboard.scheduledProjects')
      : [];
    const inProgressProjects = manufacturingSchedules
      ? safeFilter(safeProjects, p => getProjectScheduleState(manufacturingSchedules, p.id) === 'In Progress', 'Dashboard.inProgressProjects')
      : [];
    const completeProjects = safeFilter(safeProjects, p => p.status === 'completed', 'Dashboard.completeProjects');
    const unscheduledProjects = manufacturingSchedules
      ? safeFilter(safeProjects, p => {
          const scheduleState = getProjectScheduleState(manufacturingSchedules, p.id);
          const isUnscheduled = scheduleState === 'Unscheduled' && p.status !== 'completed' && p.status !== 'delivered';
          
          // Filter out Field or FSW category projects
          if (p.team === 'Field' || p.team === 'FSW') {
            return false;
          }
          
          if (isUnscheduled) {
            console.log('Found unscheduled project:', p.name, p.projectNumber, 'Schedule state:', scheduleState, 'Status:', p.status);
          }
          return isUnscheduled;
        }, 'Dashboard.unscheduledProjects')
      : [];

    // Simple project info for the popover display
    const projectLists = {
      scheduled: scheduledProjects.map(p => ({ 
        id: p.id, 
        name: p.name, 
        projectNumber: p.projectNumber 
      })),
      inProgress: inProgressProjects.map(p => ({
        id: p.id,
        name: p.name,
        projectNumber: p.projectNumber
      })),
      complete: completeProjects.map(p => ({
        id: p.id,
        name: p.name,
        projectNumber: p.projectNumber
      })),
      unscheduled: unscheduledProjects.map(p => ({
        id: p.id,
        name: p.name,
        projectNumber: p.projectNumber
      })),
      delivered: (deliveredProjects || []).map(p => ({ 
        id: p.id, 
        name: p.name || 'Unknown Project', 
        projectNumber: p.projectNumber 
      }))
    };

    console.log('Dashboard Debug - Project counts:');
    console.log('Total projects:', safeProjects.length);
    console.log('Unscheduled projects found:', unscheduledProjects.length);
    console.log('Delivered projects found:', deliveredProjectsCount);
    console.log('Project lists for hover:', {
      unscheduled: projectLists.unscheduled.length,
      scheduled: projectLists.scheduled.length,
      inProgress: projectLists.inProgress.length,
      complete: projectLists.complete.length,
      delivered: projectLists.delivered.length
    });

    return {
      total: safeProjects.length,
      major: labelStats.major,
      minor: labelStats.minor,
      good: labelStats.good,
      scheduled: scheduledProjects.length,
      inProgress: inProgressProjects.length,
      complete: completeProjects.length,
      unscheduled: unscheduledProjects.length,
      delivered: deliveredProjectsCount,
      projectLists
    };
  }, [projects, manufacturingSchedules, labelStats, deliveredProjects, deliveredProjectsCount]);

  // Calculate upcoming milestones (billing milestones due in next 30 days)
  const upcomingMilestonesData = React.useMemo(() => {
    if (!billingMilestones || !projects) return [];

    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    return safeFilter(billingMilestones, milestone => {
        if (!milestone.targetInvoiceDate) return false;
        const targetDate = new Date(milestone.targetInvoiceDate);
        return targetDate >= now && targetDate <= thirtyDaysFromNow && milestone.status !== 'paid';
      })
      .sort((a, b) => new Date(a.targetInvoiceDate).getTime() - new Date(b.targetInvoiceDate).getTime())
      .map(milestone => {
        // Find the associated project to get project name
        const project = projects.find(p => p.id === milestone.projectId);
        return {
          id: milestone.id,
          name: milestone.name,
          projectNumber: project?.projectNumber || 'Unknown',
          projectName: project?.name || 'Unknown Project',
          amount: milestone.amount?.toString() || '0',
          dueDate: milestone.targetInvoiceDate,
          targetInvoiceDate: milestone.targetInvoiceDate,
          status: milestone.status
        };
      }, 'Dashboard.upcomingMilestones');
  }, [billingMilestones, projects]);

  // Manufacturing bay stats
  const manufacturingStats = React.useMemo(() => {
    if (!manufacturingSchedules || !manufacturingBays) return null;

    // Get active bays (bays with active manufacturing schedules)
    const activeBayIds = safeFilter(manufacturingSchedules, s => s.status === 'in_progress', 'Dashboard.activeBayIds')
      .map(s => s.bayId);

    // Remove duplicates to get unique active bays
    const uniqueActiveBayIds = [...new Set(activeBayIds)];
    const active = uniqueActiveBayIds.length;

    // Get scheduled bays (bays with scheduled manufacturing but not active)
    const scheduledBayIds = safeFilter(manufacturingSchedules, s => s.status === 'scheduled', 'Dashboard.scheduledBayIds')
      .map(s => s.bayId);

    // Remove duplicates and exclude bays that are already active
    const uniqueScheduledBayIds = safeFilter([...new Set(scheduledBayIds)], 
      id => !uniqueActiveBayIds.includes(id), 'Dashboard.scheduledBayFilter');
    const scheduled = uniqueScheduledBayIds.length;

    // For display purposes, count completed and maintenance schedules
    const completed = safeFilter(manufacturingSchedules, s => s.status === 'complete', 'Dashboard.completed').length;
    const maintenance = safeFilter(manufacturingSchedules, s => s.status === 'maintenance', 'Dashboard.maintenance').length;

    // Total bays from the manufacturing bays data
    const totalBays = manufacturingBays.length;

    // Calculate utilization percentage using the standardized utility function
    const utilization = calculateBayUtilization(manufacturingBays, manufacturingSchedules);

    return {
      active,
      scheduled,
      completed,
      maintenance,
      total: totalBays,
      utilization
    };
  }, [manufacturingSchedules, manufacturingBays]);

  // Helper function to format dates for display
  const formatDateForDisplay = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'N/A';

    // Use UTC methods to avoid timezone issues
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC'
    });
  };

  // Define all project columns at the top
  const allProjectColumns = React.useMemo(() => [
    {
      accessorKey: 'projectNumber',
      header: 'Project #',
      cell: ({ row }) => (
        <Link 
          href={`/projects/${row.original.id}`}
          className="text-blue-400 hover:text-blue-300 hover:underline font-medium"
        >
          {row.original.projectNumber}
        </Link>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Project Name',
      cell: ({ row }) => <div className="text-sm">{row.original.name}</div>,
    },
    {
      accessorKey: 'mechShop',
      header: (
        <div className="text-center">
          <div>MECH Shop</div>
          <Wrench className="h-4 w-4 mx-auto mt-1 text-yellow-500" />
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-sm text-center">
          {row.original.mechShop 
            ? formatDateForDisplay(row.original.mechShop)
            : <span className="text-gray-500">TBD</span>
          }
        </div>
      ),
    },
    {
      accessorKey: 'fabricationStart',
      header: (
        <div className="text-center">
          <div>FAB Start</div>
          <Factory className="h-4 w-4 mx-auto mt-1 text-blue-500" />
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-sm text-center">
          {row.original.fabricationStart 
            ? formatDateForDisplay(row.original.fabricationStart)
            : <span className="text-gray-500">TBD</span>
          }
        </div>
      ),
    },
    {
      accessorKey: 'paintStart',
      header: (
        <div className="text-center">
          <div>PAINT Start</div>
          <Paintbrush className="h-4 w-4 mx-auto mt-1 text-red-500" />
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-sm text-center">
          {row.original.paintStart 
            ? formatDateForDisplay(row.original.paintStart)
            : <span className="text-gray-500">TBD</span>
          }
        </div>
      ),
    },
    {
      accessorKey: 'assemblyStart',
      header: (
        <div className="text-center">
          <div>Production Start</div>
          <Settings className="h-4 w-4 mx-auto mt-1 text-green-500" />
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-sm text-center">
          {row.original.assemblyStart 
            ? formatDateForDisplay(row.original.assemblyStart)
            : <span className="text-gray-500">TBD</span>
          }
        </div>
      ),
    },
    {
      accessorKey: 'itStart',
      header: (
        <div className="text-center">
          <div>IT Start</div>
          <Monitor className="h-4 w-4 mx-auto mt-1 text-purple-500" />
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-sm text-center">
          {row.original.itStart 
            ? formatDateForDisplay(row.original.itStart)
            : <span className="text-gray-500">TBD</span>
          }
        </div>
      ),
    },
    {
      accessorKey: 'ntcTestStart',
      header: (
        <div className="text-center">
          <div>NTC Test</div>
          <TestTube className="h-4 w-4 mx-auto mt-1 text-cyan-500" />
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-sm text-center">
          {row.original.ntcTestStart 
            ? formatDateForDisplay(row.original.ntcTestStart)
            : <span className="text-gray-500">TBD</span>
          }
        </div>
      ),
    },
    {
      accessorKey: 'qcStart',
      header: (
        <div className="text-center">
          <div>QC Start</div>
          <CheckCircle className="h-4 w-4 mx-auto mt-1 text-amber-500" />
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-sm text-center">
          {row.original.qcStart 
            ? formatDateForDisplay(row.original.qcStart)
            : <span className="text-gray-500">TBD</span>
          }
        </div>
      ),
    },
    {
      accessorKey: 'execReview',
      header: (
        <div className="text-center">
          <div>Exec Review</div>
          <UserCheck className="h-4 w-4 mx-auto mt-1 text-indigo-500" />
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-sm text-center">
          {row.original.executiveReview 
            ? formatDateForDisplay(row.original.executiveReview)
            : <span className="text-gray-500">TBD</span>
          }
        </div>
      ),
    },
    {
      accessorKey: 'shipDate',
      header: (
        <div className="text-center">
          <div>Ship Date</div>
          <Truck className="h-4 w-4 mx-auto mt-1 text-orange-500" />
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-sm text-center">
          {row.original.shipDate 
            ? formatDateForDisplay(row.original.shipDate)
            : <span className="text-gray-500">TBD</span>
          }
        </div>
      ),
    },
    {
      accessorKey: 'pmOwner',
      header: 'PM Owner',
      cell: ({ row }) => <div className="text-sm">{row.original.pmOwner || 'Unassigned'}</div>,
    },
    {
      accessorKey: 'percentComplete',
      header: 'Progress',
      cell: ({ row }) => {
        const percentValue = typeof row.original.percentComplete === 'string' ? parseFloat(row.original.percentComplete) : Number(row.original.percentComplete);
        return (
          <div className="flex items-center gap-2">
            <div className="w-full bg-gray-800 rounded-full h-2.5 relative overflow-hidden">
              <div 
                className="h-2.5 rounded-full bg-gradient-to-r from-green-400 via-green-500 to-green-600 relative overflow-hidden" 
                style={{ width: `${percentValue}%` }}
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
              </div>
            </div>
            <span className="text-xs font-medium">{percentValue}%</span>
          </div>
        );
      },
    },
  ], []);

  // Filter columns based on column filter - show only selected column and next column
  const projectColumns = React.useMemo(() => {
    if (columnFilter === 'all') {
      return allProjectColumns;
    }

    // Find the index of the selected column
    const selectedColumnIndex = allProjectColumns.findIndex(col => col.accessorKey === columnFilter);
    
    if (selectedColumnIndex === -1) {
      return allProjectColumns; // Fallback to all columns if not found
    }

    // Always include project number column for context
    const projectNumberColumn = allProjectColumns.find(col => col.accessorKey === 'projectNumber');
    const selectedColumn = allProjectColumns[selectedColumnIndex];
    const nextColumn = allProjectColumns[selectedColumnIndex + 1];

    // Return project number + selected column + next column (if exists)
    const filteredColumns = [projectNumberColumn, selectedColumn];
    if (nextColumn && nextColumn.accessorKey !== 'projectNumber') {
      filteredColumns.push(nextColumn);
    }

    return safeFilter(filteredColumns, Boolean, 'Dashboard.filteredColumns'); // Remove any undefined columns
  }, [columnFilter]);

  // Project scroll function - moved before conditional returns to fix React hook mismatch
  const scrollToProject = React.useCallback((searchQuery) => {
    if (!searchQuery.trim()) {
      toast({
        title: "Search Required",
        description: "Please enter a project number to search",
        variant: "destructive",
        duration: 3000
      });
      return false;
    }

    try {
      const searchTerm = searchQuery.toLowerCase().trim();

      // Find the project in data first
      const targetProject = (projects || []).find(project => 
        project.projectNumber.toLowerCase().includes(searchTerm) ||
        project.name.toLowerCase().includes(searchTerm)
      );

      if (!targetProject) {
        toast({
          title: "Project Not Found",
          description: `No project found matching "${searchQuery}"`,
          variant: "destructive",
          duration: 3000
        });
        return false;
      }

      // Find the project schedule
      const projectSchedule = (manufacturingSchedules || []).find(schedule => 
        schedule.projectId === targetProject.id
      );

      if (!projectSchedule) {
        toast({
          title: "Project Not Scheduled",
          description: `Project ${targetProject.projectNumber} is not currently scheduled in any bay`,
          variant: "destructive",
          duration: 3000
        });
        return false;
      }

      // Find the project bar in the DOM - multiple selectors to catch different structures
      const possibleSelectors = [
        '.project-bar',
        '[data-project-number]',
        '[data-project-id]',
        '.schedule-bar',
        '.manufacturing-bar',
        '.project-timeline-bar',
        '.schedule-item',
        '.bay-schedule-bar',
        '.timeline-item'
      ];

      let targetBar = null;

      for (const selector of possibleSelectors) {
        const elements = document.querySelectorAll(selector);

        for (let i = 0; i < elements.length; i++) {
          const bar = elements[i];
          const barProjectNumber = bar.getAttribute('data-project-number') || 
                                  bar.getAttribute('data-project-id') || 
                                  bar.textContent || '';
          const barProjectName = bar.getAttribute('data-project-name') || 
                                bar.getAttribute('title') || 
                                bar.textContent || '';

          if (barProjectNumber.toLowerCase().includes(searchTerm) || 
              barProjectName.toLowerCase().includes(searchTerm)) {
            targetBar = bar;
            break;
          }
        }

        if (targetBar) break;
      }

      // If still not found, try searching by visible text content
      if (!targetBar) {
        const allElements = document.querySelectorAll('*');
        for (let i = 0; i < allElements.length; i++) {
          const el = allElements[i];
          if (el.textContent && 
              el.textContent.toLowerCase().includes(searchTerm) &&
              el.childElementCount === 0) { // Only leaf nodes with text
            
            // Check if this element is part of the manufacturing schedule
            const parentSchedule = el.closest('.schedule-container, .manufacturing-schedule, .bay-schedule, .bay-schedule-container');
            if (parentSchedule) {
              targetBar = el.closest('.project-bar, .schedule-bar, [data-project-id], .schedule-item') || el;
              break;
            }
          }
        }
      }
      
      // Additional debug logging for element selection
      console.log('Element selection debug:', {
        targetProject: targetProject.projectNumber,
        targetBar: targetBar ? {
          className: targetBar.className,
          tagName: targetBar.tagName,
          textContent: targetBar.textContent?.substring(0, 50),
          offsetTop: targetBar.offsetTop,
          offsetLeft: targetBar.offsetLeft
        } : null
      });

      if (!targetBar) {
        toast({
          title: "Visual Element Not Found",
          description: `Found project ${targetProject.projectNumber} in data but couldn't locate it in the schedule view`,
          variant: "destructive",
          duration: 3000
        });
        return false;
      }

      // Find the scrollable containers - try multiple approaches
      const approaches = [
        () => document.querySelector('.bay-schedule-readonly')?.parentElement,
        () => document.querySelector('.h-\\[1200px\\]'),
        () => targetBar.closest('.overflow-auto'),
        () => targetBar.closest('[style*="overflow"]'),
        () => document.querySelector('[style*="height: 1200px"]'),
        () => document.querySelector('.manufacturing-schedule-container'),
        () => document.querySelector('.schedule-viewport')
      ];
      
      let dashboardContainer = null;
      for (const approach of approaches) {
        dashboardContainer = approach();
        if (dashboardContainer) {
          console.log('Found container using approach:', approach.toString());
          break;
        }
      }
      
      // The dashboard container handles both horizontal and vertical scrolling
      const scrollContainer = dashboardContainer;

      if (!scrollContainer) {
        toast({
          title: "Scroll Error",
          description: "Could not find scrollable container",
          variant: "destructive",
          duration: 3000
        });
        return false;
      }

      // Get the bay row that contains the target bar for vertical scrolling
      const bayRow = targetBar.closest('.bay-row') || 
                     targetBar.closest('[data-bay-id]') || 
                     targetBar.closest('.schedule-row') ||
                     targetBar.parentElement?.closest('.bay-container') ||
                     targetBar.parentElement?.closest('[data-bay-name]');
      
      // Also try to find the bay container directly using bay information
      const bay = manufacturingBays?.find(b => b.id === projectSchedule.bayId);
      const bayContainer = document.querySelector(`[data-bay-id="${projectSchedule.bayId}"]`) ||
                          document.querySelector(`[data-bay-name*="${projectSchedule.bayId}"]`) ||
                          (bay ? document.querySelector(`[data-bay-name*="${bay.name}"]`) : null);
      
      console.log('Dashboard scroll debug:', {
        scrollContainer: scrollContainer ? {
          className: scrollContainer.className,
          tagName: scrollContainer.tagName,
          scrollHeight: scrollContainer.scrollHeight,
          clientHeight: scrollContainer.clientHeight,
          scrollTop: scrollContainer.scrollTop,
          hasOverflowY: getComputedStyle(scrollContainer).overflowY
        } : null,
        targetBar: targetBar.className,
        bayRow: bayRow?.className,
        bayContainer: bayContainer?.className,
        targetBarOffsetLeft: targetBar.offsetLeft,
        targetBarOffsetTop: targetBar.offsetTop,
        bayRowOffsetTop: bayRow?.offsetTop,
        bayContainerOffsetTop: bayContainer?.offsetTop,
        projectScheduleBayId: projectSchedule.bayId
      });

      // Calculate horizontal scroll position
      const scrollLeft = targetBar.offsetLeft - (scrollContainer.clientWidth / 2) + (targetBar.offsetWidth / 2);
      
      // Calculate vertical scroll position - try multiple approaches
      let scrollTop = 0;
      
      if (bayRow) {
        scrollTop = bayRow.offsetTop - (scrollContainer.clientHeight / 2) + (bayRow.offsetHeight / 2);
        console.log('Using bayRow for vertical scroll:', scrollTop);
      } else if (bayContainer) {
        scrollTop = bayContainer.offsetTop - (scrollContainer.clientHeight / 2) + (bayContainer.offsetHeight / 2);
        console.log('Using bayContainer for vertical scroll:', scrollTop);
      } else {
        // Fallback to target bar position
        scrollTop = targetBar.offsetTop - (scrollContainer.clientHeight / 2) + (targetBar.offsetHeight / 2);
        console.log('Using targetBar for vertical scroll:', scrollTop);
      }

      // Additional debugging to understand the scrolling issue
      console.log('Scroll container details:', {
        scrollHeight: scrollContainer.scrollHeight,
        scrollTop: scrollContainer.scrollTop,
        clientHeight: scrollContainer.clientHeight,
        canScrollVertically: scrollContainer.scrollHeight > scrollContainer.clientHeight
      });

      // Get the position of the target element relative to the container
      const containerRect = scrollContainer.getBoundingClientRect();
      const targetRect = targetBar.getBoundingClientRect();
      
      // Calculate scroll positions relative to the container
      const containerScrollLeft = scrollContainer.scrollLeft;
      const containerScrollTop = scrollContainer.scrollTop;
      
      // Calculate target position relative to container's scrollable area
      const targetRelativeLeft = targetRect.left - containerRect.left + containerScrollLeft;
      const targetRelativeTop = targetRect.top - containerRect.top + containerScrollTop;
      
      // Calculate center positions within the container
      const scrollToCenterX = targetRelativeLeft - (scrollContainer.clientWidth / 2) + (targetRect.width / 2);
      const scrollToCenterY = targetRelativeTop - (scrollContainer.clientHeight / 2) + (targetRect.height / 2);
      
      console.log('Dashboard container scroll calculation:', {
        containerRect: { top: containerRect.top, left: containerRect.left, width: containerRect.width, height: containerRect.height },
        targetRect: { top: targetRect.top, left: targetRect.left, width: targetRect.width, height: targetRect.height },
        currentScroll: { left: containerScrollLeft, top: containerScrollTop },
        targetRelativePosition: { left: targetRelativeLeft, top: targetRelativeTop },
        scrollToCenter: { x: scrollToCenterX, y: scrollToCenterY },
        containerClient: { width: scrollContainer.clientWidth, height: scrollContainer.clientHeight }
      });
      
      // Scroll the container to center the target element
      scrollContainer.scrollTo({
        left: Math.max(0, scrollToCenterX),
        top: Math.max(0, scrollToCenterY),
        behavior: 'smooth'
      });

      // Highlight the found project bar with visual feedback
      targetBar.classList.add('highlight-found');
      targetBar.style.transition = 'all 0.3s ease';
      targetBar.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.8)';
      targetBar.style.border = '2px solid #3b82f6';
      targetBar.style.zIndex = '1000';

      // Remove highlight after 3 seconds
      setTimeout(() => {
        targetBar.style.boxShadow = '';
        targetBar.style.border = '';
        targetBar.style.zIndex = '';
        targetBar.classList.remove('highlight-found');
      }, 3000);

      toast({
        title: "Project Found",
        description: `Scrolled to project ${targetProject.projectNumber}`,
        duration: 2000
      });

      return true;

    } catch (error) {
      console.error('Error scrolling to project:', error);
      toast({
        title: "Scroll Error",
        description: "An error occurred while searching for the project",
        variant: "destructive",
        duration: 3000
      });
      return false;
    }
  }, [projects, manufacturingSchedules, toast]);

  // Show loading while any data is still loading
  const isLoading = authLoading || isLoadingProjects || isLoadingBillingMilestones || isLoadingManufacturing || isLoadingBays;
  
  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-sans font-bold mb-6">Dashboard</h1>
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-darkCard h-28 rounded-xl border border-gray-800"></div>
            ))}
          </div>
          <div className="bg-darkCard h-80 rounded-xl border border-gray-800"></div>
        </div>
      </div>
    );
  }

  // Authentication check - after all hooks
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="border-border bg-card backdrop-blur-sm shadow-lg">
            <CardContent className="p-8 text-center">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <Shield className="h-16 w-16 text-blue-500 opacity-20" />
                  <LogIn className="h-8 w-8 text-blue-400 absolute top-4 left-4" />
                </div>
              </div>

              <div className="mb-6">
                <div className="text-primary font-bold text-3xl font-sans mb-2">
                  <span>TIER</span>
                  <span className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text text-transparent bg-[length:200%_200%] animate-[shimmer_2s_ease-in-out_infinite]">IV</span>
                  <span className="text-xs align-top ml-1 bg-gradient-to-r from-gray-300 via-gray-100 to-gray-400 bg-clip-text text-transparent bg-[length:200%_200%] animate-[shimmer_2s_ease-in-out_infinite]">PRO</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Manufacturing Management Platform
                </p>
              </div>

              <h1 className="text-2xl font-bold mb-4 text-white dark:text-white">Login Required</h1>
              <p className="text-gray-300 dark:text-gray-300 mb-8 leading-relaxed">
                Please sign in to access your manufacturing dashboard and project management tools.
              </p>

              <div className="space-y-4">
                <Link href="/auth">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium">
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign In to Continue
                  </Button>
                </Link>

                <div className="grid grid-cols-2 gap-3 text-xs text-gray-400">
                  <div className="bg-darkBg/50 p-3 rounded border border-border/30">
                    <Building2 className="h-4 w-4 mx-auto mb-1 text-blue-400" />
                    <div className="font-medium">Project Management</div>
                  </div>
                  <div className="bg-darkBg/50 p-3 rounded border border-border/30">
                    <BarChart3 className="h-4 w-4 mx-auto mb-1 text-green-400" />
                    <div className="font-medium">Analytics & Reports</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoadingProjects || isLoadingBillingMilestones || isLoadingManufacturing || isLoadingBays) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-sans font-bold mb-6">Dashboard</h1>
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-darkCard h-28 rounded-xl border border-gray-800"></div>
            ))}
          </div>
          <div className="bg-darkCard h-80 rounded-xl border border-gray-800"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-sans font-bold">Dashboard</h1>
            <p className="text-gray-400 text-sm">Overview of project status, billing, and manufacturing</p>
          </div>
          <ModuleHelpButton 
            moduleId="dashboard" 
            helpContent={dashboardHelpContent}
          />
        </div>
        <div className="flex items-center gap-3">
          {/* Future: Add dashboard-specific actions here */}
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <ProjectStatsCard
          title="Total Projects"
          value={projectStats?.total || 0}
          icon={<Folders className="text-primary" />}
          tags={[
            { label: "Major", value: projectStats?.major || 0, status: "Critical" },
            { label: "Minor", value: projectStats?.minor || 0, status: "Delayed" },
            { label: "Good", value: projectStats?.good || 0, status: "On Track" }
          ]}
          stateBreakdown={{
            unscheduled: projectStats?.unscheduled || 0,
            scheduled: projectStats?.scheduled || 0,
            inProgress: projectStats?.inProgress || 0,
            complete: projectStats?.complete || 0,
            delivered: deliveredProjectsCount || 0
          }}
          projectLists={projectStats?.projectLists}
        />

        <ProjectStatsCard
          title="Upcoming Milestones"
          value={upcomingMilestonesData.length}
          icon={<Calendar className="text-primary" />}
          tags={[
            { label: "due in 30 days", value: upcomingMilestonesData.length, status: "Upcoming" }
          ]}
          upcomingMilestones={upcomingMilestonesData}
        />

        <BillingStatusCard
          title="Revenue Forecast"
          value={selectedMonthData ? 
            formatCurrency(selectedMonthData.amount) : 
            formatCurrency(billingStats?.forecast?.values[0] || 0)
          }
          type="forecast"
          chart={billingStats?.forecast ? {
            labels: billingStats.forecast.labels,
            values: billingStats.forecast.values
          } : {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
          }}
          onMonthSelect={(year, month) => {
            // Handle special YTD and 12-month cases
            if (month === -1) { // YTD button
              const currentYear = new Date().getFullYear();
              const ytdMilestones = safeFilter(billingMilestones || [], milestone => {
                const milestoneDate = new Date(milestone.targetInvoiceDate);
                return milestoneDate.getFullYear() === currentYear;
              }, 'Dashboard.ytdMilestones');
              const ytdAmount = ytdMilestones.reduce((sum, milestone) => sum + parseFloat(milestone.amount), 0);

              setSelectedMonthData({
                month: -1,
                year: currentYear,
                amount: ytdAmount,
                milestones: ytdMilestones
              });
              console.log(`YTD ${currentYear}: $${ytdAmount} from ${ytdMilestones.length} milestones`);
              return;
            }

            if (month === -2) { // 12-month button
              const next12Months = safeFilter(billingMilestones || [], milestone => {
                const milestoneDate = new Date(milestone.targetInvoiceDate);
                const today = new Date();
                const twelveMonthsFromNow = new Date(today.getFullYear(), today.getMonth() + 12, today.getDate());
                return milestoneDate >= today && milestoneDate <= twelveMonthsFromNow;
              }, 'Dashboard.next12Months');
              const twelveMonthAmount = next12Months.reduce((sum, milestone) => sum + parseFloat(milestone.amount), 0);

              setSelectedMonthData({
                month: -2,
                year: new Date().getFullYear(),
                amount: twelveMonthAmount,
                milestones: next12Months
              });
              console.log(`Next 12 months: $${twelveMonthAmount} from ${next12Months.length} milestones`);
              return;
            }

            // Regular month filtering - use same logic as chart forecast
            const startOfMonth = new Date(year, month, 1);
            const startOfNextMonth = new Date(year, month + 1, 1);

            const selectedMonthMilestones = safeFilter(billingMilestones || [], milestone => {
              if (!milestone.targetInvoiceDate) return false;
              const milestoneDate = new Date(milestone.targetInvoiceDate);
              return milestoneDate >= startOfMonth && milestoneDate < startOfNextMonth;
            }, 'Dashboard.selectedMonthMilestones');

            const monthlyAmount = selectedMonthMilestones.reduce((sum, milestone) => sum + parseFloat(milestone.amount), 0);

            setSelectedMonthData({
              month,
              year,
              amount: monthlyAmount,
              milestones: selectedMonthMilestones
            });

            console.log(`Month ${month + 1}/${year}: $${monthlyAmount} from ${selectedMonthMilestones.length} milestones`);
          }}
        />
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="md:col-span-3">
          <HighRiskProjectsCard projects={projects || []} />
        </div>
      </div>

      {/* Projects Table */}
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-xl font-sans font-bold">
          Next Projects Ready to Ship 
          {(dateRangeFilter === 'all' && columnFilter === 'all') ? ' (Top 10)' : ` (${filteredProjects.length})`}
        </h2>
        <Link href="/projects">
          <Button variant="outline" size="sm">
            <ArrowUpRight className="h-4 w-4 mr-2" />
            View All Projects
          </Button>
        </Link>
      </div>

      {/* Filter Controls */}
      <div className="mb-4 flex gap-4 items-center">
        <div className="flex items-center gap-2">
          <label htmlFor="columnFilter" className="text-sm font-medium text-gray-300">
            Show Column:
          </label>
          <Select value={columnFilter} onValueChange={setColumnFilter}>
            <SelectTrigger className="w-48 bg-input border-none rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-primary">
              <SelectValue placeholder="Select column" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Columns</SelectItem>
              <SelectItem value="mechShop">MECH Shop</SelectItem>
              <SelectItem value="fabricationStart">FAB Start</SelectItem>
              <SelectItem value="paintStart">Paint Start</SelectItem>
              <SelectItem value="assemblyStart">Production Start</SelectItem>
              <SelectItem value="itStart">IT Start</SelectItem>
              <SelectItem value="ntcTestStart">NTC Test</SelectItem>
              <SelectItem value="qcStart">QC Start</SelectItem>
              <SelectItem value="execReview">Exec Review</SelectItem>
              <SelectItem value="contractDate">Contract Date</SelectItem>
              <SelectItem value="shipDate">Ship Date</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="dateRangeFilter" className="text-sm font-medium text-gray-300">
            Date Range:
          </label>
          <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
            <SelectTrigger className="w-48 bg-input border-none rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-primary">
              <SelectValue placeholder="Select date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Dates</SelectItem>
              <SelectItem value="thisWeek">This Week</SelectItem>
              <SelectItem value="nextWeek">Next Week</SelectItem>
              <SelectItem value="thisMonth">This Month</SelectItem>
              <SelectItem value="nextMonth">Next Month</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(columnFilter !== 'all' || dateRangeFilter !== 'all') && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setColumnFilter('all');
              setDateRangeFilter('all');
            }}
            className="ml-2"
          >
            Clear Filters
          </Button>
        )}
      </div>

      <div className="w-full mb-8">
        <DashboardTable
          columns={projectColumns}
          data={filteredProjects}
          showPagination={false}
        />
      </div>

      {/* Mini Bay Schedule Viewer */}
      <div className="mb-4 flex justify-between items-start">
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-sans font-bold">Manufacturing Bay Schedule Snapshot</h2>
          <div className="border border-red-500 rounded-md px-3 py-2 bg-red-950/20 dark:bg-red-950/30">
            <p className="text-red-400 dark:text-red-300 text-sm font-medium">
              Bay Schedule is an estimated prediction of the Nomad GCS schedule. For Approved Timeline Dates, review the Projects Module.
            </p>
          </div>
        </div>
        
      </div>

      

      {/* Project Search for Bay Schedule */}
      <div className="mb-6 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <Input
              type="text"
              placeholder="Search project number..."
              value={projectSearchQuery}
              onChange={(e) => setProjectSearchQuery(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  scrollToProject(projectSearchQuery);
                }
              }}
              className="pl-10 pr-4 py-2 w-48 text-sm bg-white text-gray-900 placeholder-gray-500 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <Button
            onClick={() => scrollToProject(projectSearchQuery)}
            variant="outline"
            size="sm"
            className="whitespace-nowrap"
          >
            Find Project
          </Button>
        </div>
      </div>

      <Card className="bg-darkCard border-gray-800">
        <CardContent className="p-0">
          <div className="h-[1200px] w-full overflow-auto">
            {manufacturingSchedules && manufacturingBays && projects ? (
              <div 
                className="bay-schedule-readonly min-w-full"
                style={{
                  pointerEvents: 'none',
                  userSelect: 'none',
                  cursor: 'default'
                }}
                onMouseDown={(e) => e.preventDefault()}
                onContextMenu={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
                onDrop={(e) => e.preventDefault()}
              >
                <style>{`
                  .bay-schedule-readonly * {
                    pointer-events: none !important;
                    user-select: none !important;
                    cursor: default !important;
                  }
                  .bay-schedule-readonly .scrollable-area {
                    pointer-events: auto !important;
                    overflow: auto !important;
                  }
                  .bay-schedule-readonly .project-bar {
                    cursor: default !important;
                  }
                  .bay-schedule-readonly .project-bar:hover {
                    cursor: default !important;
                    transform: none !important;
                  }
                  .bay-schedule-readonly button {
                    pointer-events: none !important;
                    cursor: default !important;
                  }
                  /* Enable only left/right scroll navigation buttons */
                  .bay-schedule-readonly button[aria-label="Scroll timeline left"],
                  .bay-schedule-readonly button[aria-label="Scroll timeline right"] {
                    pointer-events: auto !important;
                    cursor: pointer !important;
                  }
                  .bay-schedule-readonly button[aria-label="Scroll timeline left"]:hover,
                  .bay-schedule-readonly button[aria-label="Scroll timeline right"]:hover {
                    pointer-events: auto !important;
                    cursor: pointer !important;
                    background-color: rgba(0, 0, 0, 0.8) !important;
                  }
                  .bay-schedule-readonly .drag-handle {
                    display: none !important;
                  }
                  .bay-schedule-readonly .resize-handle {
                    display: none !important;
                  }
                  /* Hide specific delete buttons with X icons and trash can icons */
                  .bay-schedule-readonly .delete-button,
                  .bay-schedule-readonly button[title="Delete Row"],
                  .bay-schedule-readonly button[title="Add Row"],
                  .bay-schedule-readonly .row-delete-button,
                  .bay-schedule-readonly .row-management-buttons,
                  .bay-schedule-readonly button[title*="Delete"],
                  .bay-schedule-readonly button[title*="Remove"],
                  .bay-schedule-readonly .trash-icon,
                  .bay-schedule-readonly [data-testid*="delete"],
                  .bay-schedule-readonly [data-testid*="trash"],
                  .bay-schedule-readonly svg[class*="trash"],
                  .bay-schedule-readonly .lucide-trash,
                  .bay-schedule-readonly .lucide-trash-2 {
                    display: none !important;
                  }
                  /* Hide ONLY the "+" icon and team management buttons */
                  .bay-schedule-readonly .bg-green-700,
                  .bay-schedule-readonly .bg-blue-700,
                  .bay-schedule-readonly .bg-orange-700,
                  .bay-schedule-readonly .bg-purple-700,
                  .bay-schedule-readonly .bg-gray-700:not([aria-label]) {
                    display: none !important;
                  }
                  /* Hide ALL red elements including delete team buttons */
                  .bay-schedule-readonly .bg-red-500,
                  .bay-schedule-readonly .bg-red-600,
                  .bay-schedule-readonly .bg-red-700,
                  .bay-schedule-readonly button[class*="bg-red"],
                  .bay-schedule-readonly .text-red-500,
                  .bay-schedule-readonly .text-red-600,
                  .bay-schedule-readonly .text-red-700 {
                    display: none !important;
                  }
                  /* Keep only today marker visible */
                  .bay-schedule-readonly .today-marker,
                  .bay-schedule-readonly [class*="today"] {
                    display: block !important;
                  }
                  /* Ensure phases (FAB, PROD, NTC, QC) remain visible */
                  .bay-schedule-readonly .dept-fab-phase,
                  .bay-schedule-readonly .dept-prod-phase,
                  .bay-schedule-readonly .dept-production-phase,
                  .bay-schedule-readonly .dept-ntc-phase,
                  .bay-schedule-readonly .dept-qc-phase,
                  .bay-schedule-readonly .dept-paint-phase,
                  .bay-schedule-readonly .dept-it-phase,
                  .bay-schedule-readonly .fab-phase,
                  .bay-schedule-readonly .production-phase,
                  .bay-schedule-readonly .ntc-phase,
                  .bay-schedule-readonly .qc-phase,
                  .bay-schedule-readonly .paint-phase,
                  .bay-schedule-readonly .it-phase {
                    display: block !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                  }
                  /* Ensure TODAY marker remains visible */
                  .bay-schedule-readonly .today-marker,
                  .bay-schedule-readonly .bg-red-500 {
                    display: block !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    pointer-events: none !important;
                  }

                `}</style>
                <ResizableBaySchedule
                  schedules={manufacturingSchedules}
                  projects={projects}
                  bays={manufacturingBays}
                  onScheduleChange={async () => {}} // Read-only - no editing
                  onScheduleCreate={async () => {}} // Read-only - no editing
                  onScheduleDelete={async () => {}} // Read-only - no editing
                  onBayCreate={async () => {}} // Read-only - no editing
                  onBayUpdate={async () => {}} // Read-only - no editing
                  onBayDelete={async () => {}} // Read-only - no editing
                  dateRange={{
                    start: new Date(2025, 0, 1), // January 1, 2025
                    end: new Date(new Date().setMonth(new Date().getMonth() + 6))
                  }}
                  viewMode="week"
                  enableFinancialImpact={false}
                  isSandboxMode={true}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-32">
                <div className="text-center text-gray-400">
                  <Building2 className="h-8 w-8 mx-auto mb-2" />
                  <p>Loading bay schedule data...</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;