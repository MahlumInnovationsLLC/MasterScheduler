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
  Search
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

const Dashboard = () => {
  // Authentication checks must be done first before any other hooks
  const { user, isLoading: authLoading } = useAuth();

  // Show loading if auth is still loading
  if (authLoading) {
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

  // Authentication check - must happen before other hooks
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

  // Now all hooks can be called safely after auth checks
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const { toast } = useToast();

  const { data: projects, isLoading: isLoadingProjects } = useQuery({
    queryKey: ['/api/projects'],
  });

  const { data: billingMilestones, isLoading: isLoadingBillingMilestones } = useQuery({
    queryKey: ['/api/billing-milestones'],
  });

  const { data: manufacturingSchedules, isLoading: isLoadingManufacturing } = useQuery({
    queryKey: ['/api/manufacturing-schedules'],
  });

  const { data: manufacturingBays, isLoading: isLoadingBays } = useQuery({
    queryKey: ['/api/manufacturing-bays'],
  });

  // Fetch delivered projects for analytics
  const { data: deliveredProjects } = useQuery({
    queryKey: ['/api/delivered-projects'],
    staleTime: 0,
    gcTime: 0,
  });

  const [filteredProjects, setFilteredProjects] = useState([]);
  const [selectedMonthData, setSelectedMonthData] = useState<{
    month: number;
    year: number;
    amount: number;
    milestones: any[];
  } | null>(null);
  const [columnFilter, setColumnFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState('all');

  // Project scroll function - same logic as bay scheduling module
  const scrollToProject = (searchQuery) => {
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
        '.project-timeline-bar'
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
          const element = allElements[i];
          const textContent = element.textContent || '';

          if (textContent.includes(targetProject.projectNumber) || 
              textContent.includes(targetProject.name)) {
            // Find the closest parent that looks like a project bar
            let parent = element;
            while (parent && parent !== document.body) {
              if (parent.classList.contains('project-bar') || 
                  parent.style.backgroundColor || 
                  parent.style.width) {
                targetBar = parent;
                break;
              }
              parent = parent.parentElement;
            }
            if (targetBar) break;
          }
        }
      }

      if (!targetBar) {
        toast({
          title: "Project Bar Not Found",
          description: "Project found but not visible in current schedule view",
          variant: "destructive",
          duration: 3000
        });
        return false;
      }

      // Scroll to the project bar
      targetBar.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'center'
      });

      // Success message
      toast({
        title: "Found Project",
        description: `Scrolled to project ${targetProject.projectNumber} (${targetProject.name})`,
        duration: 3000
      });

      return true;
    } catch (error) {
      console.error("Project search scrolling failed:", error);
      toast({
        title: "Search Failed", 
        description: "Could not scroll to the project",
        variant: "destructive",
        duration: 3000
      });
      return false;
    }
  };

  // Show the top 10 projects that are ready to ship next with enhanced date calculations
  useEffect(() => {
    if (!projects) return;

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

    // Enhance projects with calculated phase dates
    const enhancedProjects = projects.map(p => {
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
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // End of this week (Saturday)
      endOfWeek.setHours(23, 59, 59, 999);

      const startOfNextWeek = new Date(endOfWeek);
      startOfNextWeek.setDate(endOfWeek.getDate() + 1);
      startOfNextWeek.setHours(0, 0, 0, 0);

      const endOfNextWeek = new Date(startOfNextWeek);
      endOfNextWeek.setDate(startOfNextWeek.getDate() + 6);
      endOfNextWeek.setHours(23, 59, 59, 999);

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59, 999);

      return projects.filter(project => {
        // Get the date field based on column filter
        let dateField = null;
        if (columnFilter === 'all') {
          // For 'all', check any date field that starts in the range
          const dateFields = [
            project.mechShop, project.fabricationStart, project.paintStart,
            project.assemblyStart, project.itStart, project.ntcTestStart,
            project.qcStart, project.execReview, project.contractDate, project.shipDate
          ];
          
          for (const field of dateFields) {
            const date = getValidDate(field);
            if (date) {
              dateField = date;
              break; // Use the first valid date found
            }
          }
        } else {
          // Use specific column's date
          dateField = getValidDate(project[columnFilter]);
        }

        if (!dateField) return false;

        switch (dateRangeFilter) {
          case 'thisWeek':
            return dateField >= startOfWeek && dateField <= endOfWeek;
          case 'nextWeek':
            return dateField >= startOfNextWeek && dateField <= endOfNextWeek;
          case 'thisMonth':
            return dateField >= startOfMonth && dateField <= endOfMonth;
          case 'nextMonth':
            return dateField >= startOfNextMonth && dateField <= endOfNextMonth;
          default:
            return true;
        }
      });
    };

    // Apply column filter (if not 'all', show only projects with valid dates in that column)
    const getColumnFilteredProjects = (projects) => {
      if (columnFilter === 'all') return projects;
      
      return projects.filter(project => {
        const dateValue = getValidDate(project[columnFilter]);
        return dateValue !== null;
      });
    };

    // Apply filters
    let filteredByColumn = getColumnFilteredProjects(enhancedProjects);
    let filteredByDateRange = getDateRangeFilteredProjects(filteredByColumn);

    // Sort ALL projects by ship date but ensure delivered projects are always at the bottom
    const sortedByShipDate = filteredByDateRange
      .sort((a, b) => {
        // FIRST PRIORITY: delivered projects always go to the bottom
        const aDelivered = a.status === 'delivered';
        const bDelivered = b.status === 'delivered';

        if (aDelivered && !bDelivered) return 1;  // a goes to bottom
        if (!aDelivered && bDelivered) return -1; // b goes to bottom

        // SECOND PRIORITY: for non-delivered projects, sort by ship date
        if (!aDelivered && !bDelivered) {
          const dateA = getValidDate(a.shipDate);
          const dateB = getValidDate(b.shipDate);

          // Projects with ship dates come first, sorted by earliest date
          if (dateA && dateB) {
            return dateA.getTime() - dateB.getTime();
          }

          // Projects with ship dates come before those without
          if (dateA && !dateB) return -1;
          if (!dateA && dateB) return 1;

          // For projects without ship dates, sort by project number (most recent first)
          const numA = parseInt(a.projectNumber.replace(/\D/g, '')) || 0;
          const numB = parseInt(b.projectNumber.replace(/\D/g, '')) || 0;
          return numB - numA;
        }

        // If both are delivered, maintain original order
        return 0;
      });

    // Apply different limits based on filter state
    let finalList;
    
    if (dateRangeFilter === 'all' && columnFilter === 'all') {
      // No filters applied - limit to top 10 projects
      const nonDeliveredProjects = sortedByShipDate.filter(p => p.status !== 'delivered');
      const deliveredProjects = sortedByShipDate.filter(p => p.status === 'delivered');

      // Take top 10 non-delivered projects, then add any delivered projects at the end
      finalList = [
        ...nonDeliveredProjects.slice(0, 10),
        ...deliveredProjects
      ].slice(0, 10); // Still limit to 10 total but prioritize non-delivered
    } else {
      // Any filter is applied - show ALL matching projects (no limit)
      finalList = sortedByShipDate;
    }

    setFilteredProjects(finalList);
  }, [projects, columnFilter, dateRangeFilter]);

  // Get label statistics  
  const labelStats = useProjectLabelStats();

  // Calculate delivered projects count
  const deliveredProjectsCount = deliveredProjects?.length || 0;

  // Calculate project stats
  const projectStats = React.useMemo(() => {
    if (!projects || projects.length === 0) return null;

    // Get projects by schedule state
    const scheduledProjects = manufacturingSchedules 
      ? projects.filter(p => getProjectScheduleState(manufacturingSchedules, p.id) === 'Scheduled')
      : [];
    const inProgressProjects = manufacturingSchedules
      ? projects.filter(p => getProjectScheduleState(manufacturingSchedules, p.id) === 'In Progress')
      : [];
    const completeProjects = projects.filter(p => p.status === 'completed');
    const unscheduledProjects = manufacturingSchedules
      ? projects.filter(p => {
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
        })
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
    console.log('Total projects:', projects.length);
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
      total: projects.length,
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
    if (!billingMilestones || billingMilestones.length === 0) return null;

    const completed = billingMilestones.filter(m => m.status === 'paid').length;
    const inProgress = billingMilestones.filter(m => m.status === 'invoiced').length;
    const overdue = billingMilestones.filter(m => m.status === 'delayed').length;
    const upcoming = billingMilestones.filter(m => m.status === 'upcoming').length;

    // Calculate total amounts
    const totalReceived = billingMilestones
      .filter(m => m.status === 'paid')
      .reduce((sum, m) => sum + parseFloat(m.amount || '0'), 0);

    const totalPending = billingMilestones
      .filter(m => m.status === 'invoiced')
      .reduce((sum, m) => sum + parseFloat(m.amount || '0'), 0);

    const totalOverdue = billingMilestones
      .filter(m => m.status === 'delayed')
      .reduce((sum, m) => sum + parseFloat(m.amount || '0'), 0);

    // Calculate forecast for next 12 months
    const today = new Date();
    const nextTwelveMonths = Array.from({ length: 12 }, (_, i) => {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
      return date;
    });

    const monthNames = nextTwelveMonths.map(date => 
      date.toLocaleDateString('default', { month: 'short' })
    );

    const forecastValues = nextTwelveMonths.map(month => {
      const nextMonth = new Date(month);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      // Calculate revenue for milestones due in this month
      const monthlyRevenue = billingMilestones
        .filter(m => {
          if (!m.targetInvoiceDate) return false;
          const milestoneDate = new Date(m.targetInvoiceDate);
          return milestoneDate >= month && milestoneDate < nextMonth;
        })
        .reduce((sum, m) => sum + parseFloat(m.amount || '0'), 0);

      return monthlyRevenue;
    });

    return {
      milestones: {
        completed,
        inProgress,
        overdue,
        upcoming
      },
      amounts: {
        received: totalReceived,
        pending: totalPending,
        overdue: totalOverdue
      },
      forecast: {
        labels: monthNames,
        values: forecastValues
      }
    };
  }, [billingMilestones]);

  // Calculate upcoming milestones (billing milestones due in next 30 days)
  const upcomingMilestonesData = React.useMemo(() => {
    if (!billingMilestones || !projects) return [];

    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    return billingMilestones
      .filter(milestone => {
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
      });
  }, [billingMilestones, projects]);


  // Manufacturing bay stats
  const manufacturingStats = React.useMemo(() => {
    if (!manufacturingSchedules || !manufacturingBays) return null;

    // Get active bays (bays with active manufacturing schedules)
    const activeBayIds = manufacturingSchedules
      .filter(s => s.status === 'in_progress')
      .map(s => s.bayId);

    // Remove duplicates to get unique active bays
    const uniqueActiveBayIds = [...new Set(activeBayIds)];
    const active = uniqueActiveBayIds.length;

    // Get scheduled bays (bays with scheduled manufacturing but not active)
    const scheduledBayIds = manufacturingSchedules
      .filter(s => s.status === 'scheduled')
      .map(s => s.bayId);

    // Remove duplicates and exclude bays that are already active
    const uniqueScheduledBayIds = [...new Set(scheduledBayIds)]
      .filter(id => !uniqueActiveBayIds.includes(id));
    const scheduled = uniqueScheduledBayIds.length;

    // For display purposes, count completed and maintenance schedules
    const completed = manufacturingSchedules.filter(s => s.status === 'complete').length;
    const maintenance = manufacturingSchedules.filter(s => s.status === 'maintenance').length;

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

  

  // Helper function to format dates consistently without timezone issues
  const formatDate = (dateStr) => {
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

  // Enhanced project table columns matching Projects Module exactly
  const allProjectColumns = [
    {
      accessorKey: 'projectNumber',
      header: 'Project',
      cell: ({ row }) => {
        const isPastDue = row.original.shipDate ? new Date(row.original.shipDate) < new Date() : false;
        const isSalesEstimate = row.original.isSalesEstimate;

        return (
          <div className={`flex items-center ${isPastDue ? 'bg-red-900/30 rounded' : isSalesEstimate ? 'bg-yellow-500/10 rounded' : ''}`}>
            <div className="ml-2 p-1">
              <div className={`text-sm font-medium ${isPastDue ? 'text-red-500' : isSalesEstimate ? 'text-yellow-400' : 'text-white'} whitespace-normal`}>
                <Link to={`/project/${row.original.id}`} className={`${isPastDue ? 'text-red-500 font-bold' : isSalesEstimate ? 'text-yellow-400 font-semibold' : 'text-primary'} hover:underline`}>
                  {isSalesEstimate && <span className="text-xs bg-yellow-500/20 text-yellow-300 px-1.5 py-0.5 rounded mr-2">PROPOSED</span>}
                  {row.original.projectNumber}
                </Link>
              </div>
              <div 
                className={`text-xs ${isSalesEstimate ? 'text-yellow-400/70' : 'text-gray-400'} line-clamp-2 overflow-hidden`}
                title={row.original.name}
              >
                {row.original.name}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'location',
      header: 'Location',
      cell: ({ row }) => (
        <div className="flex items-center">
          <div className="px-3 py-1 rounded font-medium text-white border border-gray-500 shadow-lg" 
               style={{ 
                 background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                 boxShadow: '0 2px 8px rgba(107, 114, 128, 0.3)'
               }}>
            {row.original.location || 'N/A'}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'mechShop',
      header: 'MECH Shop',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Wrench className="h-4 w-4 text-gray-400" />
          <div className="text-sm">
            {formatDate(row.original.mechShop)}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'fabricationStart',
      header: 'FAB Start',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Hammer className="h-4 w-4 text-blue-400" />
          <div className="text-sm">
            {formatDate(row.original.fabricationStart)}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'paintStart',
      header: 'Paint Start',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <svg className="h-4 w-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8 2a1 1 0 000 2h4a1 1 0 100-2H8zM3 7a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM4 10a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zm2 3a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
          <div className="text-sm">
            {formatDate(row.original.paintStart)}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'productionStart',
      header: 'Production Start',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Wrench className="h-4 w-4 text-green-400" />
          <div className="text-sm">
            {formatDate(row.original.productionStart)}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'itStart',
      header: 'IT Start',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <svg className="h-4 w-4 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-3.22l.123.493.006.024c.01.041.017.082.017.123a.75.75 0 01-.22.53l-.22.22a.75.75 0 01-1.06 0l-.22-.22A.75.75 0 0110 15.25a.75.75 0 01.75-.75H15a.5.5 0 00.5-.5V5a.5.5 0 00-.5-.5H5a.5.5 0 00-.5.5v9.5a.5.5 0 00.5.5h4.25a.75.75 0 010 1.5H5a2 2 0 01-2-2V5z" clipRule="evenodd" />
          </svg>
          <div className="text-sm">
            {formatDate(row.original.itStart)}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'ntcTestingDate',
      header: 'NTC Test',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <CheckCircle className="h-4 w-4 text-orange-400" />
          <div className="text-sm">
            {formatDate(row.original.ntcTestingDate)}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'qcStartDate',
      header: 'QC Start',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Shield className="h-4 w-4 text-purple-400" />
          <div className="text-sm">
            {formatDate(row.original.qcStartDate)}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'executiveReviewDate',
      header: 'Exec Review',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <svg className="h-4 w-4 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
          </svg>
          <div className="text-sm">
            {formatDate(row.original.executiveReviewDate)}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'contractDate',
      header: 'Contract Date',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4 text-blue-500" />
          <div className="text-sm">
            {formatDate(row.original.contractDate)}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'shipDate',
      header: 'Ship Date',
      cell: ({ row }) => {
        const isPastDue = row.original.shipDate ? new Date(row.original.shipDate) < new Date() : false;
        return (
          <div className={`text-sm ${isPastDue ? 'text-red-400 font-semibold' : ''}`}>
            {formatDate(row.original.shipDate)}
          </div>
        );
      },
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
    
  ];

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

    return filteredColumns.filter(Boolean); // Remove any undefined columns
  }, [columnFilter]);

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
              const ytdMilestones = (billingMilestones || []).filter(milestone => {
                const milestoneDate = new Date(milestone.targetInvoiceDate);
                return milestoneDate.getFullYear() === currentYear;
              });
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
              const next12Months = (billingMilestones || []).filter(milestone => {
                const milestoneDate = new Date(milestone.targetInvoiceDate);
                const today = new Date();
                const twelveMonthsFromNow = new Date(today.getFullYear(), today.getMonth() + 12, today.getDate());
                return milestoneDate >= today && milestoneDate <= twelveMonthsFromNow;
              });
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

            const selectedMonthMilestones = (billingMilestones || []).filter(milestone => {
              if (!milestone.targetInvoiceDate) return false;
              const milestoneDate = new Date(milestone.targetInvoiceDate);
              return milestoneDate >= startOfMonth && milestoneDate < startOfNextMonth;
            });

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
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              // Snap to today functionality
              const todayMarker = document.querySelector('.today-marker');
              if (todayMarker) {
                todayMarker.scrollIntoView({ 
                  behavior: 'smooth', 
                  block: 'center', 
                  inline: 'center' 
                });
              }
            }}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Today
          </Button>
          <Link href="/bay-scheduling">
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              Open Full Schedule
            </Button>
          </Link>
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