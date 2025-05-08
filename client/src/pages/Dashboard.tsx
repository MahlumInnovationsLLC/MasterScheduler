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
  ArrowUpRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProjectStatsCard } from '@/components/ProjectStatusCard';
import { BillingStatusCard } from '@/components/BillingStatusCard';
import { ManufacturingCard } from '@/components/ManufacturingCard';
import { ProgressBadge } from '@/components/ui/progress-badge';
import { formatDate, formatCurrency, getProjectStatusColor, getProjectScheduleState, calculateBayUtilization } from '@/lib/utils';
import { DashboardTable } from '@/components/ui/dashboard-table';
import { ProjectStatusBreakdownCard } from '@/components/ProjectStatusBreakdownCard';
import { HighRiskProjectsCard } from '@/components/HighRiskProjectsCard';

const Dashboard = () => {
  const { data: projects, isLoading: isLoadingProjects } = useQuery({
    queryKey: ['/api/projects'],
  });
  
  const [filteredProjects, setFilteredProjects] = useState([]);
  
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

  const { data: billingMilestones, isLoading: isLoadingBilling } = useQuery({
    queryKey: ['/api/billing-milestones'],
  });

  const { data: manufacturingSchedules, isLoading: isLoadingManufacturing } = useQuery({
    queryKey: ['/api/manufacturing-schedules'],
  });
  
  const { data: manufacturingBays, isLoading: isLoadingBays } = useQuery({
    queryKey: ['/api/manufacturing-bays'],
  });

  // Calculate project stats
  const projectStats = React.useMemo(() => {
    if (!projects || projects.length === 0) return null;

    const active = projects.filter(p => p.status === 'active').length;
    const delayed = projects.filter(p => p.status === 'delayed').length;
    const critical = projects.filter(p => p.status === 'critical').length;

    return {
      total: projects.length,
      active,
      delayed,
      critical
    };
  }, [projects]);

  // Calculate billing stats
  const billingStats = React.useMemo(() => {
    if (!billingMilestones || billingMilestones.length === 0) return null;

    const completed = billingMilestones.filter(m => m.status === 'paid').length;
    const inProgress = billingMilestones.filter(m => m.status === 'invoiced').length;
    const overdue = billingMilestones.filter(m => m.status === 'delayed').length;
    const upcoming = billingMilestones.filter(m => m.status === 'upcoming').length;

    // Calculate total amounts
    const totalReceived = billingMilestones
      .filter(m => m.status === 'paid')
      .reduce((sum, m) => sum + parseFloat(m.amount), 0);
      
    const totalPending = billingMilestones
      .filter(m => m.status === 'invoiced')
      .reduce((sum, m) => sum + parseFloat(m.amount), 0);
      
    const totalOverdue = billingMilestones
      .filter(m => m.status === 'delayed')
      .reduce((sum, m) => sum + parseFloat(m.amount), 0);

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
          <div className="px-3 py-1 rounded bg-primary text-white font-medium">
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
          <div className="flex flex-col gap-1">
            <ProgressBadge status={status} animatePulse={status === 'Critical'} />
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

  if (isLoadingProjects || isLoadingBilling || isLoadingManufacturing || isLoadingBays) {
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
          value={formatCurrency((billingStats?.amounts.received || 0) + (billingStats?.amounts.pending || 0) + (billingStats?.amounts.overdue || 0))}
          type="forecast"
          chart={{
            labels: [
              new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short' }),
              new Date().toLocaleDateString('en-US', { month: 'short' }),
              new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short' })
            ],
            values: [
              billingStats?.milestones.completed || 0,
              billingStats?.milestones.inProgress || 0,
              billingStats?.milestones.upcoming || 0
            ]
          }}
        />

        <ManufacturingCard
          title="Bay Utilization"
          value={manufacturingStats?.utilization || 0}
          type="utilization"
          subtitle={`${manufacturingStats?.active || 0} bays active, ${manufacturingStats?.scheduled || 0} scheduled`}
        />
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
