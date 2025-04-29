import React from 'react';
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
import { DataTable } from '@/components/ui/data-table';
import { ProgressBadge } from '@/components/ui/progress-badge';
import { formatDate, formatCurrency, getProjectStatusColor } from '@/lib/utils';

const Dashboard = () => {
  const { data: projects, isLoading: isLoadingProjects } = useQuery({
    queryKey: ['/api/projects'],
  });

  const { data: billingMilestones, isLoading: isLoadingBilling } = useQuery({
    queryKey: ['/api/billing-milestones'],
  });

  const { data: manufacturingSchedules, isLoading: isLoadingManufacturing } = useQuery({
    queryKey: ['/api/manufacturing-schedules'],
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
    if (!manufacturingSchedules) return null;

    const active = manufacturingSchedules.filter(s => s.status === 'in_progress').length;
    const scheduled = manufacturingSchedules.filter(s => s.status === 'scheduled').length;
    const completed = manufacturingSchedules.filter(s => s.status === 'complete').length;
    const maintenance = manufacturingSchedules.filter(s => s.status === 'maintenance').length;

    return {
      active,
      scheduled,
      completed,
      maintenance,
      total: active + scheduled
    };
  }, [manufacturingSchedules]);

  // Project table columns
  const projectColumns = [
    {
      accessorKey: 'projectNumber',
      header: 'Project',
      cell: ({ row }) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 h-8 w-8 rounded bg-primary flex items-center justify-center text-white font-medium">
            {row.original.projectNumber.slice(-2)}
          </div>
          <div className="ml-3">
            <div className="text-sm font-medium text-white">{row.original.projectNumber}</div>
            <div className="text-xs text-gray-400">{row.original.name}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'pmOwnerId',
      header: 'PM Owner',
      cell: ({ row }) => <div className="text-sm">John Smith</div>,
    },
    {
      accessorKey: 'timeline',
      header: 'Timeline',
      cell: ({ row }) => (
        <div>
          <div className="text-sm">
            {formatDate(row.original.startDate)} - {formatDate(row.original.estimatedCompletionDate)}
          </div>
          <div className="text-xs text-gray-400">
            {Math.ceil((new Date(row.original.estimatedCompletionDate).getTime() - new Date(row.original.startDate).getTime()) / (1000 * 60 * 60 * 24))} days
          </div>
        </div>
      ),
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
        const { status } = getProjectStatusColor(
          row.original.percentComplete,
          row.original.estimatedCompletionDate
        );
        return <ProgressBadge status={status} animatePulse={status === 'Critical'} />;
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="text-right space-x-2">
          <Link href={`/projects/${row.original.id}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  if (isLoadingProjects || isLoadingBilling || isLoadingManufacturing) {
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
          change={{ value: "12% from last month", isPositive: true }}
          tags={[
            { label: "Active", value: projectStats?.active || 0, status: "On Track" },
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
          value="$920K"
          type="forecast"
          chart={{
            labels: ["Apr", "May", "Jun"],
            values: [8, 5, 10]
          }}
        />

        <ManufacturingCard
          title="Bay Utilization"
          value="85"
          type="utilization"
          change={{ value: "7% from last month", isPositive: false }}
        />
      </div>

      {/* Projects Table */}
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-xl font-sans font-bold">Recent Projects</h2>
        <Link href="/projects">
          <Button variant="outline" size="sm">
            View All Projects
          </Button>
        </Link>
      </div>

      <DataTable
        columns={projectColumns}
        data={projects?.slice(0, 5) || []}
        showPagination={false}
      />
    </div>
  );
};

export default Dashboard;
