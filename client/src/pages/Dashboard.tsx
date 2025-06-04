import React, { useState, useEffect } from 'react';
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
  BarChart3
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

const Dashboard = () => {
  const { user, isLoading: authLoading } = useAuth();

  // If not authenticated, show login required message
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="border-border bg-darkCard/80 backdrop-blur-sm">
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

              <h1 className="text-2xl font-bold mb-4 text-white">Login Required</h1>
              <p className="text-gray-300 mb-8 leading-relaxed">
                Please sign in to access your manufacturing dashboard and project management tools.
              </p>

              <div className="space-y-4">
                <Link href="/auth">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
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
  const { data: projects, isLoading: isLoadingProjects } = useQuery({
    queryKey: ['/api/projects'],
  });

  const { data: billingMilestones, isLoading: isLoadingBillingMilestones } = useQuery({
    queryKey: ['/api/billing-milestones'],
  });

  const [filteredProjects, setFilteredProjects] = useState([]);
  const [selectedMonthData, setSelectedMonthData] = useState<{
    month: number;
    year: number;
    amount: number;
    milestones: any[];
  } | null>(null);

  // Show the top 5 projects that are ready to ship next
  useEffect(() => {
    if (!projects) return;

    // Helper to get valid dates and handle null/invalid dates
    const getValidDate = (dateStr) => {
      if (!dateStr) return null;
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date;
    };

    // Filter for projects with valid ship dates and sort by earliest ship date
    const now = new Date();
    const upcomingProjects = projects
      .filter(p => {
        const shipDate = getValidDate(p.shipDate);
        return shipDate && shipDate >= now;
      })
      .sort((a, b) => {
        const dateA = getValidDate(a.shipDate);
        const dateB = getValidDate(b.shipDate);
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateA.getTime() - dateB.getTime(); // Sort by earliest ship date first
      });

    // Show up to 5 projects ready to ship next
    if (upcomingProjects.length > 0) {
      setFilteredProjects(upcomingProjects.slice(0, 5));
    } else {
      // If no upcoming ship dates, show active projects instead
      const activeProjects = projects
        .filter(p => p.status === 'active' || p.status === 'delayed' || p.status === 'critical')
        .sort((a, b) => {
          const numA = parseInt(a.projectNumber.replace(/\D/g, '')) || 0;
          const numB = parseInt(b.projectNumber.replace(/\D/g, '')) || 0;
          return numB - numA; // Most recent numbers first
        });

      if (activeProjects.length > 0) {
        setFilteredProjects(activeProjects.slice(0, 5));
      } else {
        // If no active projects either, show any projects
        setFilteredProjects(projects.slice(0, 5));
      }
    }
  }, [projects]);



  const { data: manufacturingSchedules, isLoading: isLoadingManufacturing } = useQuery({
    queryKey: ['/api/manufacturing-schedules'],
  });

  const { data: manufacturingBays, isLoading: isLoadingBays } = useQuery({
    queryKey: ['/api/manufacturing-bays'],
  });

  // Calculate project stats
  const projectStats = React.useMemo(() => {
    if (!projects || projects.length === 0) return null;

    const activeProjects = projects.filter(p => p.status === 'active');
    const delayedProjects = projects.filter(p => p.status === 'delayed');
    const criticalProjects = projects.filter(p => p.status === 'critical');

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
          const isUnscheduled = scheduleState === 'Unscheduled' && p.status !== 'completed';
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
      }))
    };

    console.log('Dashboard Debug - Project counts:');
    console.log('Total projects:', projects.length);
    console.log('Unscheduled projects found:', unscheduledProjects.length);
    console.log('Project lists for hover:', {
      unscheduled: projectLists.unscheduled.length,
      scheduled: projectLists.scheduled.length,
      inProgress: projectLists.inProgress.length,
      complete: projectLists.complete.length
    });

    return {
      total: projects.length,
      active: activeProjects.length,
      delayed: delayedProjects.length,
      critical: criticalProjects.length,
      scheduled: scheduledProjects.length,
      inProgress: inProgressProjects.length,
      complete: completeProjects.length,
      unscheduled: unscheduledProjects.length,
      projectLists
    };
  }, [projects, manufacturingSchedules]);

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

  // Helper function to format dates consistently
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Project table columns
  const projectColumns = [
    {
      accessorKey: 'projectNumber',
      header: 'Project',
      cell: ({ row }) => (
        <div className="flex items-center">
          <div className="ml-2">
            <div className="text-sm font-medium text-white">{row.original.projectNumber}</div>
            <div className="text-xs text-gray-400">{row.original.name}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'location',
      header: 'Location',
      cell: ({ row }) => (
        <div className="flex items-center">
          <div className="px-3 py-1 rounded location-block font-medium">
            {row.original.location || 'N/A'}
          </div>
        </div>
      ),
    },

    {
      accessorKey: 'ntcTestingDate',
      header: 'NTC Testing',
      cell: ({ row }) => (
        <div className="text-sm">
          {formatDate(row.original.ntcTestingDate)}
        </div>
      ),
    },
    {
      accessorKey: 'qcDate',
      header: 'QC Date',
      cell: ({ row }) => (
        <div className="text-sm">
          {formatDate(row.original.qcDate)}
        </div>
      ),
    },
    {
      accessorKey: 'shipDate',
      header: 'Ship Date',
      cell: ({ row }) => (
        <div className="text-sm">
          {formatDate(row.original.shipDate)}
        </div>
      ),
    },
    {
      accessorKey: 'pmOwnerId',
      header: 'PM Owner',
      cell: ({ row }) => <div className="text-sm">{row.original.pmOwner || 'Unassigned'}</div>,
    },
    {
      accessorKey: 'percentComplete',
      header: 'Progress',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="w-full bg-gray-800 rounded-full h-2.5">
            <div 
              className="bg-success h-2.5 rounded-full" 
              style={{ width: `${row.original.percentComplete}%` }}
            ></div>
          </div>
          <span className="text-xs font-medium">{row.original.percentComplete}%</span>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        // Get the project health status (Active, Critical, Delayed, etc.)
        const { status } = getProjectStatusColor(
          row.original.percentComplete,
          row.original.estimatedCompletionDate
        );

        // Get the manufacturing schedule state (Unscheduled, Scheduled, In Progress, Complete)
        const scheduleState = getProjectScheduleState(manufacturingSchedules, row.original.id);

        return (
          <div className="flex flex-wrap gap-1">
            <ProgressBadge status={status} animatePulse={status === 'Critical'} size="sm" />
            <ProgressBadge 
              status={scheduleState} 
              size="sm"
              className={
                scheduleState === 'Unscheduled' ? 'bg-gray-100 text-gray-800 border border-gray-600' :
                scheduleState === 'Scheduled' ? 'bg-green-100 text-green-800 border border-green-600' :
                scheduleState === 'In Progress' ? 'bg-blue-100 text-blue-800 border border-blue-600' :
                'bg-green-100 text-green-800 border border-green-600'
              }
            />
          </div>
        );
      },
    },

  ];

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
        <div>
          <h1 className="text-2xl font-sans font-bold">Dashboard</h1>
          <p className="text-gray-400 text-sm">Overview of project status, billing, and manufacturing</p>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <ProjectStatsCard
          title="Total Projects"
          value={projectStats?.total || 0}
          icon={<Folders className="text-primary" />}
          tags={[
            { label: "Active", value: projectStats?.active || 0, status: "Active" },
            { label: "Delayed", value: projectStats?.delayed || 0, status: "Delayed" },
            { label: "Critical", value: projectStats?.critical || 0, status: "Critical" }
          ]}
          stateBreakdown={{
            unscheduled: projectStats?.unscheduled || 0,
            scheduled: projectStats?.scheduled || 0,
            inProgress: projectStats?.inProgress || 0,
            complete: projectStats?.complete || 0
          }}
          projectLists={projectStats?.projectLists}
        />

        <BillingStatusCard
          title="Billing Status"
          value={formatCurrency(billingStats?.amounts.pending || 0)}
          type="cashflow"
          stats={[
            { label: "Received", value: formatCurrency(billingStats?.amounts.received || 0) },
            { label: "Pending", value: formatCurrency(billingStats?.amounts.pending || 0) },
            { label: "Overdue", value: formatCurrency(billingStats?.amounts.overdue || 0) }
          ]}
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

        <ManufacturingCard
          title="Bay Utilization"
          value={manufacturingStats?.utilization || 0}
          type="utilization"
          subtitle={manufacturingStats ? 
            getBayStatusInfo(manufacturingStats.utilization).description :
            'No bay utilization data available'
          }
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
        <h2 className="text-xl font-sans font-bold">Next Projects Ready to Ship</h2>
        <Link href="/projects">
          <Button variant="outline" size="sm">
            View All Projects
          </Button>
        </Link>
      </div>

      <div className="w-full">
        <DashboardTable
          columns={projectColumns}
          data={filteredProjects}
          showPagination={false}
        />
      </div>
    </div>
  );
};

export default Dashboard;