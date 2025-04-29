import React from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { 
  Folders, 
  Flag, 
  DollarSign,
  Building2,
  Plus,
  Filter,
  SortDesc,
  Eye,
  Edit,
  MoreHorizontal,
  ArrowUpRight
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ProjectStatsCard } from '@/components/ProjectStatusCard';
import { DataTable } from '@/components/ui/data-table';
import { ProgressBadge } from '@/components/ui/progress-badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDate, getProjectStatusColor } from '@/lib/utils';

const ProjectStatus = () => {
  const [, navigate] = useLocation();
  const { data: projects, isLoading } = useQuery({
    queryKey: ['/api/projects'],
  });

  // Calculate project stats
  const projectStats = React.useMemo(() => {
    if (!projects || projects.length === 0) return null;

    const active = projects.filter(p => p.status === 'active').length;
    const delayed = projects.filter(p => p.status === 'delayed').length;
    const critical = projects.filter(p => p.status === 'critical').length;
    const completed = projects.filter(p => p.status === 'completed').length;

    const avgCompletion = projects.reduce((sum, p) => sum + parseFloat(p.percentComplete), 0) / projects.length;

    return {
      total: projects.length,
      active,
      delayed,
      critical,
      completed,
      avgCompletion
    };
  }, [projects]);

  const upcomingMilestones = 7; // This would come from the billing milestones API

  const columns = [
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
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/projects/${row.original.id}`)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Edit className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>View Details</DropdownMenuItem>
              <DropdownMenuItem>Edit Project</DropdownMenuItem>
              <DropdownMenuItem>Add Task</DropdownMenuItem>
              <DropdownMenuItem>Archive Project</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  const statusOptions = [
    { value: 'all', label: 'All Projects' },
    { value: 'active', label: 'Active Projects' },
    { value: 'delayed', label: 'Delayed Projects' },
    { value: 'critical', label: 'Critical Projects' },
    { value: 'completed', label: 'Completed Projects' },
  ];

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-sans font-bold mb-6">Project Status</h1>
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
          <h1 className="text-2xl font-sans font-bold">Project Status</h1>
          <p className="text-gray-400 text-sm">Manage and track all your project timelines and progress</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <SortDesc className="mr-2 h-4 w-4" />
            Sort
          </Button>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <ProjectStatsCard 
          title="Total Projects"
          value={projectStats?.total || 0}
          icon={<Folders className="text-primary" />}
          tags={[
            { label: "Active", value: projectStats?.active || 0, status: "On Track" },
            { label: "Delayed", value: projectStats?.delayed || 0, status: "Delayed" },
            { label: "Critical", value: projectStats?.critical || 0, status: "Critical" }
          ]}
        />
        
        <ProjectStatsCard 
          title="Upcoming Milestones"
          value={upcomingMilestones}
          icon={<Flag className="text-accent" />}
          progress={{ 
            value: 45, 
            label: "45% complete" 
          }}
        />
        
        <ProjectStatsCard 
          title="Avg. Completion"
          value={`${Math.round(projectStats?.avgCompletion || 0)}%`}
          icon={<DollarSign className="text-secondary" />}
          change={{ 
            value: "5% this month", 
            isPositive: true 
          }}
        />
        
        <ProjectStatsCard 
          title="Manufacturing"
          value="4/5"
          icon={<Building2 className="text-success" />}
          tags={[
            { label: "Active", value: 4, status: "On Track" },
            { label: "Available", value: 1, status: "Inactive" }
          ]}
        />
      </div>
      
      {/* Project List Table */}
      <DataTable
        columns={columns}
        data={projects || []}
        filterColumn="status"
        filterOptions={statusOptions}
        searchPlaceholder="Search projects..."
      />
    </div>
  );
};

export default ProjectStatus;
