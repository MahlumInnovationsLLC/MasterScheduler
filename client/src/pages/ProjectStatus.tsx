import React, { useState } from 'react';
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
  ArrowUpRight,
  Calendar,
  SearchIcon,
  ListFilter
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
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { formatDate, getProjectStatusColor } from '@/lib/utils';
import { Project } from '@shared/schema';

// Define a type for the row in the data table
interface ProjectRow {
  original: Project;
}

const ProjectStatus = () => {
  const [, navigate] = useLocation();
  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });
  
  // State for visible columns
  const [visibleColumns, setVisibleColumns] = useState<{ [key: string]: boolean }>({
    projectNumber: true,
    name: true,
    pmOwner: true,
    timeline: true,
    percentComplete: true,
    status: true,
    contractDate: true,
    estimatedCompletionDate: true,
    chassisETA: true,
    qcStartDate: true,
    qcDays: true,
    shipDate: true,
    deliveryDate: true,
    // All other columns are initially hidden
    description: false,
    team: false,
    location: false,
    actualCompletionDate: false,
    fabricationStart: false,
    assemblyStart: false,
    wrapDate: false,
    ntcTestingDate: false,
    executiveReviewDate: false,
    dpasRating: false,
    stretchShortenGears: false,
    lltsOrdered: false,
    meAssigned: false,
    meDesignOrdersPercent: false,
    eeAssigned: false,
    eeDesignOrdersPercent: false,
    iteAssigned: false,
    itDesignOrdersPercent: false,
    ntcDesignOrdersPercent: false,
    hasBillingMilestones: false,
    notes: false,
  });
  
  // Date filter state
  const [dateFilters, setDateFilters] = useState({
    startDateMin: '',
    startDateMax: '',
    endDateMin: '',
    endDateMax: '',
    qcStartDateMin: '',
    qcStartDateMax: '',
    shipDateMin: '',
    shipDateMax: '',
  });
  
  // Filter dialog state
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);

  // Calculate project stats
  const projectStats = React.useMemo(() => {
    if (!projects || projects.length === 0) return null;

    const active = projects.filter(p => p.status === 'active').length;
    const delayed = projects.filter(p => p.status === 'delayed').length;
    const critical = projects.filter(p => p.status === 'critical').length;
    const completed = projects.filter(p => p.status === 'completed').length;

    const avgCompletion = projects.reduce((sum, p) => sum + Number(p.percentComplete), 0) / projects.length;

    return {
      total: projects.length,
      active,
      delayed,
      critical,
      completed,
      avgCompletion
    };
  }, [projects]);

  // Apply date filters to projects
  const filteredProjects = React.useMemo(() => {
    if (!projects) return [];
    
    return projects.filter((project: Project) => {
      // Start Date Filtering
      if (dateFilters.startDateMin && new Date(project.startDate) < new Date(dateFilters.startDateMin)) {
        return false;
      }
      if (dateFilters.startDateMax && new Date(project.startDate) > new Date(dateFilters.startDateMax)) {
        return false;
      }
      
      // End Date Filtering
      if (dateFilters.endDateMin && new Date(project.estimatedCompletionDate) < new Date(dateFilters.endDateMin)) {
        return false;
      }
      if (dateFilters.endDateMax && new Date(project.estimatedCompletionDate) > new Date(dateFilters.endDateMax)) {
        return false;
      }
      
      // QC Start Date Filtering
      if (dateFilters.qcStartDateMin && project.qcStartDate && 
          new Date(project.qcStartDate) < new Date(dateFilters.qcStartDateMin)) {
        return false;
      }
      if (dateFilters.qcStartDateMax && project.qcStartDate && 
          new Date(project.qcStartDate) > new Date(dateFilters.qcStartDateMax)) {
        return false;
      }
      
      // Ship Date Filtering
      if (dateFilters.shipDateMin && project.shipDate && 
          new Date(project.shipDate) < new Date(dateFilters.shipDateMin)) {
        return false;
      }
      if (dateFilters.shipDateMax && project.shipDate && 
          new Date(project.shipDate) > new Date(dateFilters.shipDateMax)) {
        return false;
      }
      
      return true;
    });
  }, [projects, dateFilters]);

  const upcomingMilestones = 7; // This would come from the billing milestones API

  // Reset all filters
  const resetFilters = () => {
    setDateFilters({
      startDateMin: '',
      startDateMax: '',
      endDateMin: '',
      endDateMax: '',
      qcStartDateMin: '',
      qcStartDateMax: '',
      shipDateMin: '',
      shipDateMax: '',
    });
  };

  // Toggle column visibility
  const toggleColumnVisibility = (column: string) => {
    setVisibleColumns(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
  };
  
  // Helper function to create column definitions with proper typing
  const createColumn = <T extends keyof Project>(
    id: string,
    accessorKey: T,
    header: string,
    cellRenderer: (value: Project[T], project: Project) => React.ReactNode
  ) => {
    return {
      id,
      accessorKey,
      header,
      cell: ({ row }: { row: ProjectRow }) => cellRenderer(row.original[accessorKey], row.original)
    };
  };

  // Define all available columns
  const allColumns = [
    createColumn('projectNumber', 'projectNumber', 'Project', 
      (value, project) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 h-8 w-8 rounded bg-primary flex items-center justify-center text-white font-medium">
            {value.slice(-2)}
          </div>
          <div className="ml-3">
            <div className="text-sm font-medium text-white">{value}</div>
            <div className="text-xs text-gray-400">{project.name}</div>
          </div>
        </div>
      )),
    createColumn('pmOwner', 'pmOwnerId', 'PM Owner', 
      (value) => <div className="text-sm">{value || 'Unassigned'}</div>),
    {
      id: 'timeline',
      accessorKey: 'startDate',
      header: 'Timeline',
      cell: ({ row }: { row: ProjectRow }) => {
        const project = row.original;
        const durationDays = Math.ceil(
          (new Date(project.estimatedCompletionDate).getTime() - new Date(project.startDate).getTime()) / 
          (1000 * 60 * 60 * 24)
        );
        
        return (
          <div>
            <div className="text-sm">
              {formatDate(project.startDate)} - {formatDate(project.estimatedCompletionDate)}
            </div>
            <div className="text-xs text-gray-400">
              {durationDays} days
            </div>
          </div>
        );
      },
    },
    createColumn('percentComplete', 'percentComplete', 'Progress', 
      (value) => {
        const percentValue = typeof value === 'string' ? parseFloat(value) : Number(value);
        return (
          <div className="flex items-center gap-2">
            <div className="w-full bg-gray-800 rounded-full h-2.5">
              <div 
                className="bg-success h-2.5 rounded-full" 
                style={{ width: `${percentValue}%` }}
              ></div>
            </div>
            <span className="text-xs font-medium">{percentValue}%</span>
          </div>
        );
      }),
    createColumn('status', 'status', 'Status', 
      (value, project) => {
        const percentValue = typeof project.percentComplete === 'string' 
          ? parseFloat(project.percentComplete) 
          : Number(project.percentComplete);
          
        const { status } = getProjectStatusColor(
          percentValue,
          project.estimatedCompletionDate
        );
        return <ProgressBadge status={status} animatePulse={status === 'Critical'} />;
      }),
    createColumn('contractDate', 'contractDate', 'Contract Date', 
      (value) => formatDate(value)),
    createColumn('startDate', 'startDate', 'Start Date', 
      (value) => formatDate(value)),
    createColumn('estimatedCompletionDate', 'estimatedCompletionDate', 'Est. Completion', 
      (value) => formatDate(value)),
    createColumn('actualCompletionDate', 'actualCompletionDate', 'Actual Completion', 
      (value) => formatDate(value)),
    createColumn('chassisETA', 'chassisETA', 'Chassis ETA', 
      (value) => formatDate(value)),
    createColumn('fabricationStart', 'fabricationStart', 'Fabrication Start', 
      (value) => formatDate(value)),
    createColumn('assemblyStart', 'assemblyStart', 'Assembly Start', 
      (value) => formatDate(value)),
    createColumn('wrapDate', 'wrapDate', 'Wrap Date', 
      (value) => formatDate(value)),
    createColumn('ntcTestingDate', 'ntcTestingDate', 'NTC Testing', 
      (value) => formatDate(value)),
    createColumn('qcStartDate', 'qcStartDate', 'QC Start', 
      (value) => formatDate(value)),
    createColumn('qcDays', 'qcDays', 'QC Days', 
      (value) => value !== null ? value : 'N/A'),
    createColumn('executiveReviewDate', 'executiveReviewDate', 'Exec Review', 
      (value) => formatDate(value)),
    createColumn('shipDate', 'shipDate', 'Ship Date', 
      (value) => formatDate(value)),
    createColumn('deliveryDate', 'deliveryDate', 'Delivery Date', 
      (value) => formatDate(value)),
    createColumn('description', 'description', 'Description',
      (value, project) => (
        <div className="text-sm max-w-xs truncate" title={value as string}>
          {value || 'N/A'}
        </div>
      )),
    createColumn('team', 'team', 'Team',
      (value) => value || 'N/A'),
    createColumn('location', 'location', 'Location',
      (value) => value || 'N/A'),
    createColumn('dpasRating', 'dpasRating', 'DPAS Rating',
      (value) => value || 'N/A'),
    createColumn('stretchShortenGears', 'stretchShortenGears', 'Stretch/Shorten Gears',
      (value) => value || 'N/A'),
    createColumn('lltsOrdered', 'lltsOrdered', 'LLTS Ordered',
      (value) => value ? 'Yes' : 'No'),
    createColumn('meAssigned', 'meAssigned', 'ME Assigned',
      (value) => value || 'N/A'),
    createColumn('meDesignOrdersPercent', 'meDesignOrdersPercent', 'ME Design %',
      (value) => value ? `${value}%` : 'N/A'),
    createColumn('eeAssigned', 'eeAssigned', 'EE Assigned',
      (value) => value || 'N/A'),
    createColumn('eeDesignOrdersPercent', 'eeDesignOrdersPercent', 'EE Design %',
      (value) => value ? `${value}%` : 'N/A'),
    createColumn('iteAssigned', 'iteAssigned', 'ITE Assigned',
      (value) => value || 'N/A'),
    createColumn('itDesignOrdersPercent', 'itDesignOrdersPercent', 'IT Design %',
      (value) => value ? `${value}%` : 'N/A'),
    createColumn('ntcDesignOrdersPercent', 'ntcDesignOrdersPercent', 'NTC Design %',
      (value) => value ? `${value}%` : 'N/A'),
    createColumn('hasBillingMilestones', 'hasBillingMilestones', 'Has Billing Milestones',
      (value) => value ? 'Yes' : 'No'),
    createColumn('notes', 'notes', 'Notes',
      (value) => (
        <div className="text-sm max-w-xs truncate" title={value as string}>
          {value || 'N/A'}
        </div>
      )),
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }: { row: ProjectRow }) => (
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
  
  // Filter columns based on visibility settings
  const columns = allColumns.filter(col => 
    visibleColumns[col.id as string] !== false
  );

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
          {/* Date Filter Dialog */}
          <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Date Filter
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Filter Projects by Date</DialogTitle>
              </DialogHeader>
              
              <div className="grid grid-cols-2 gap-6 pt-4">
                <div>
                  <h3 className="font-semibold mb-3">Start Date</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="startDateMin">From</Label>
                      <Input
                        id="startDateMin"
                        type="date"
                        value={dateFilters.startDateMin}
                        onChange={(e) => setDateFilters({...dateFilters, startDateMin: e.target.value})}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="startDateMax">To</Label>
                      <Input
                        id="startDateMax"
                        type="date"
                        value={dateFilters.startDateMax}
                        onChange={(e) => setDateFilters({...dateFilters, startDateMax: e.target.value})}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-3">Estimated Completion</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="endDateMin">From</Label>
                      <Input
                        id="endDateMin"
                        type="date"
                        value={dateFilters.endDateMin}
                        onChange={(e) => setDateFilters({...dateFilters, endDateMin: e.target.value})}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="endDateMax">To</Label>
                      <Input
                        id="endDateMax"
                        type="date"
                        value={dateFilters.endDateMax}
                        onChange={(e) => setDateFilters({...dateFilters, endDateMax: e.target.value})}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-3">QC Start Date</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="qcStartDateMin">From</Label>
                      <Input
                        id="qcStartDateMin"
                        type="date"
                        value={dateFilters.qcStartDateMin}
                        onChange={(e) => setDateFilters({...dateFilters, qcStartDateMin: e.target.value})}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="qcStartDateMax">To</Label>
                      <Input
                        id="qcStartDateMax"
                        type="date"
                        value={dateFilters.qcStartDateMax}
                        onChange={(e) => setDateFilters({...dateFilters, qcStartDateMax: e.target.value})}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-3">Ship Date</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="shipDateMin">From</Label>
                      <Input
                        id="shipDateMin"
                        type="date"
                        value={dateFilters.shipDateMin}
                        onChange={(e) => setDateFilters({...dateFilters, shipDateMin: e.target.value})}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="shipDateMax">To</Label>
                      <Input
                        id="shipDateMax"
                        type="date"
                        value={dateFilters.shipDateMax}
                        onChange={(e) => setDateFilters({...dateFilters, shipDateMax: e.target.value})}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between mt-6">
                <div className="text-sm text-gray-400">
                  {filteredProjects.length} projects match filter criteria
                </div>
                <div className="flex gap-2">
                  <Button variant="destructive" onClick={resetFilters}>
                    Reset Filters
                  </Button>
                  <Button onClick={() => setIsFilterDialogOpen(false)}>
                    Apply Filters
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          {/* Column Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <ListFilter className="mr-2 h-4 w-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 max-h-96 overflow-y-auto">
              <DropdownMenuCheckboxItem
                checked={Object.values(visibleColumns).every(Boolean)}
                onCheckedChange={(checked) => {
                  const newVisibleColumns = {...visibleColumns};
                  allColumns.forEach(col => {
                    newVisibleColumns[col.id as string] = checked;
                  });
                  setVisibleColumns(newVisibleColumns);
                }}
              >
                Show All Columns
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              
              {allColumns.map(column => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={visibleColumns[column.id as string] !== false}
                  onCheckedChange={() => toggleColumnVisibility(column.id as string)}
                >
                  {column.header as React.ReactNode}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
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
        data={filteredProjects}
        filterColumn="status"
        filterOptions={statusOptions}
        searchPlaceholder="Search projects..."
      />
      
      {/* Filters Info */}
      {Object.values(dateFilters).some(v => v !== '') && (
        <div className="mt-4 bg-gray-900 p-3 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Calendar className="h-4 w-4" />
            <span>
              Date filters applied. Showing {filteredProjects.length} out of {projects?.length || 0} projects.
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
};

export default ProjectStatus;
