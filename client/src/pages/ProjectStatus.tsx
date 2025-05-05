import React, { useState, useMemo } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
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
  Search,
  ListFilter,
  Clock,
  Archive
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
import OnTimeDelivery from './OnTimeDelivery';

// Extend Project type to ensure rawData is included
interface ProjectWithRawData extends Project {
  rawData: Record<string, any>;
}

// Define a type for the row in the data table
interface ProjectRow {
  original: ProjectWithRawData;
}

const ProjectStatus = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });
  
  // Add state for active tab
  const [activeTab, setActiveTab] = useState("projects");
  
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
    // Making the required columns visible
    fabricationStart: true,
    assemblyStart: true,
    wrapDate: true,
    ntcTestingDate: true,
    executiveReviewDate: true,
    dpasRating: true,
    stretchShortenGears: true,
    lltsOrdered: true,
    meAssigned: true,
    meDesignOrdersPercent: true,
    eeAssigned: true,
    eeDesignOrdersPercent: true,
    iteAssigned: true,
    itDesignOrdersPercent: true,
    ntcDesignOrdersPercent: true,
    hasBillingMilestones: true,
    // Other columns still hidden
    description: false,
    team: false,
    location: true,  // Make the location column visible
    actualCompletionDate: false,
    notes: false,
    // All raw data columns are initially hidden
    rawData_DPAS_Rating: false,
    rawData_ME_Assigned: false,
    rawData_EE_Assigned: false,
    rawData_ITE_Assigned: false,
    rawData_ME_Design_Orders: false,
    rawData_EE_Design_Orders: false,
    rawData_IT_Design_Orders: false,
    rawData_NTC_Design_Orders: false,
    rawData_Stretch_Shorten_Gears: false,
    rawData_LLTs_Ordered: false,
    rawData_QC_DAYS: false,
    rawData_Chassis_ETA: false,
    rawData_Fabrication_Start: false,
    rawData_Assembly_Start: false,
    rawData_Wrap: false,
    rawData_NTC_Testing: false,
    rawData_QC_START: false,
    rawData_EXECUTIVE_REVIEW: false,
    rawData_Ship: false,
    rawData_Delivery: false,
    rawData_Progress: false,
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
    if (!projects) return { total: 0, active: 0, delayed: 0, critical: 0, avgCompletion: 0 };
    
    const stats = {
      total: projects.length,
      active: projects.filter(p => p.status === 'active').length,
      delayed: projects.filter(p => p.status === 'delayed').length,
      critical: projects.filter(p => p.status === 'critical').length,
      avgCompletion: projects.reduce((sum, p) => sum + (p.percentComplete || 0), 0) / projects.length
    };
    
    return stats;
  }, [projects]);
  
  // Upcoming milestones count
  const upcomingMilestones = useMemo(() => {
    // In a real app, you might have a separate query for this
    return 12; // Static for demo
  }, []);
  
  // Function to toggle column visibility
  const toggleColumnVisibility = (columnId: string) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnId]: !prev[columnId]
    }));
  };
  
  // Reset date filters
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
    setIsFilterDialogOpen(false);
  };
  
  // Filter for date ranges
  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    
    return (projects as ProjectWithRawData[]).filter((project: ProjectWithRawData) => {
      const startDate = project.contractDate ? new Date(project.contractDate) : null;
      const endDate = project.estimatedCompletionDate ? new Date(project.estimatedCompletionDate) : null;
      const qcStartDate = project.qcStartDate ? new Date(project.qcStartDate) : null;
      const shipDate = project.shipDate ? new Date(project.shipDate) : null;
      
      // Check if date is in range
      const isInRange = (date: Date | null, min: string, max: string) => {
        if (!date) return true;
        if (min && date < new Date(min)) return false;
        if (max && date > new Date(max)) return false;
        return true;
      };
      
      return isInRange(startDate, dateFilters.startDateMin, dateFilters.startDateMax) &&
        isInRange(endDate, dateFilters.endDateMin, dateFilters.endDateMax) &&
        isInRange(qcStartDate, dateFilters.qcStartDateMin, dateFilters.qcStartDateMax) &&
        isInRange(shipDate, dateFilters.shipDateMin, dateFilters.shipDateMax);
    });
  }, [projects, dateFilters]);
  
  // Column definitions with custom formatters
  // This is a simplified version, actual columns would be more complex
  const getRawDataField = (project: ProjectWithRawData, field: string, defaultValue: any = 'N/A'): any => {
    if (!project.rawData) return defaultValue;
    return project.rawData[field] ?? defaultValue;
  };
  
  type ProjectField = keyof ProjectWithRawData;
  
  interface ColumnConfig<T extends ProjectField> {
    accessorKey: T;
    header: string;
    sortingFn?: string;
    cellRenderer?: (value: ProjectWithRawData[T], project: ProjectWithRawData) => React.ReactNode;
  }
  
  const defineColumns = <T extends ProjectField>(config: ColumnConfig<T>) => config;
  
  // Define base columns
  const baseColumns = [
    defineColumns({
      accessorKey: 'projectNumber',
      header: 'Project #',
      sortingFn: 'basic',
      cellRenderer: (value, project) => (
        <div className="flex flex-col">
          <Link to={`/projects/${project.id}`} className="text-primary hover:underline font-medium">
            {value}
          </Link>
          <span className="text-xs text-gray-500">{project.name}</span>
        </div>
      )
    }),
    defineColumns({
      accessorKey: 'name',
      header: 'Name',
      sortingFn: 'basic'
    }),
    defineColumns({
      accessorKey: 'pmOwner',
      header: 'PM Owner',
      sortingFn: 'basic'
    }),
    defineColumns({
      accessorKey: 'timeline',
      header: 'Timeline',
      cellRenderer: (value, project) => (
        <div className="flex items-center">
          <ProgressBadge 
            value={project.percentComplete || 0} 
            status={project.status}
          />
        </div>
      )
    }),
    defineColumns({
      accessorKey: 'percentComplete',
      header: '% Complete',
      cellRenderer: (value) => (
        <span>{value || 0}%</span>
      )
    }),
    defineColumns({
      accessorKey: 'status',
      header: 'Status',
      cellRenderer: (value) => (
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getProjectStatusColor(value as string)}`}>
          {value?.toString().charAt(0).toUpperCase() + value?.toString().slice(1)}
        </div>
      )
    }),
    defineColumns({
      accessorKey: 'location',
      header: 'Location'
    }),
    defineColumns({
      accessorKey: 'contractDate',
      header: 'Contract Date',
      cellRenderer: (value) => formatDate(value as string)
    }),
    defineColumns({
      accessorKey: 'estimatedCompletionDate',
      header: 'Est. Completion',
      cellRenderer: (value) => formatDate(value as string)
    }),
    // Add all other columns...
  ];
  
  // Create all dynamic raw data columns
  const rawDataColumns = [
    {
      accessorKey: 'dpasRating',
      header: 'DPAS Rating',
      cellRenderer: (project: ProjectWithRawData) => getRawDataField(project, 'DPAS_Rating')
    },
    {
      accessorKey: 'meAssigned',
      header: 'ME Assigned',
      cellRenderer: (project: ProjectWithRawData) => getRawDataField(project, 'ME_Assigned')
    },
    // Add all other raw data columns...
  ];
  
  // Combine to create the final columns array
  const baseColumnsWithCells = baseColumns.map(col => ({
    id: col.accessorKey,
    accessorKey: col.accessorKey,
    header: col.header,
    sortingFn: col.sortingFn || 'basic',
    cell: ({ row }: { row: ProjectRow }) => {
      const project = row.original;
      const value = project[col.accessorKey as keyof ProjectWithRawData];
      return col.cellRenderer ? col.cellRenderer(value, project) : value;
    }
  }));
  
  // Create the raw data columns
  const rawDataColumnsFormatted = Object.keys(projects?.[0]?.rawData || {}).map(key => ({
    id: `rawData_${key}`,
    accessorFn: (row: ProjectWithRawData) => getRawDataField(row, key),
    header: key.replace(/_/g, ' '),
    cell: ({ row }: { row: ProjectRow }) => {
      return getRawDataField(row.original, key);
    }
  }));
  
  // Combine all columns for the dropdown
  const allColumns = [...baseColumnsWithCells, ...rawDataColumnsFormatted];
  
  // Filter columns by visibility
  const columns = allColumns.filter(col => visibleColumns[col.id as string] !== false);
  
  // Filter status options
  const statusOptions = useMemo(() => [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'delayed', label: 'Delayed' },
    { value: 'critical', label: 'Critical' },
    { value: 'completed', label: 'Completed' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'archived', label: 'Archived' },
    { value: 'on-hold', label: 'On Hold' },
    { value: 'cancelled', label: 'Cancelled' },
  ], []);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-gray-400">Loading projects...</p>
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
          {/* Only show project-specific controls when on projects tab */}
          {activeTab === "projects" && (
            <>
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
                      // Include all columns
                      allColumns.forEach(col => {
                        newVisibleColumns[col.id as string] = checked;
                      });
                      setVisibleColumns(newVisibleColumns);
                    }}
                  >
                    Show All Columns
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  
                  {/* List all columns */}
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
              
              <Button size="sm" onClick={() => navigate('/projects/new')}>
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            </>
          )}
        </div>
      </div>
      
      {/* Tabs Navigation */}
      <Tabs defaultValue="projects" className="w-full mb-6" onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-[800px] mb-4">
          <TabsTrigger value="projects" className="flex items-center gap-2">
            <ListFilter className="h-4 w-4" /> 
            Projects
          </TabsTrigger>
          <TabsTrigger value="delivered" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" /> 
            Delivered
          </TabsTrigger>
          <TabsTrigger value="archived" className="flex items-center gap-2">
            <Archive className="h-4 w-4" /> 
            Archived
          </TabsTrigger>
          <TabsTrigger value="delivery" className="flex items-center gap-2">
            <Clock className="h-4 w-4" /> 
            On Time Delivery
          </TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="mt-0">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <ProjectStatsCard 
              title="Total Projects"
              value={projectStats?.total || 0}
              icon={<Folders className="text-primary h-5 w-5" />}
              tags={[
                { label: "Active", value: projectStats?.active || 0, status: "On Track" },
                { label: "Delayed", value: projectStats?.delayed || 0, status: "Delayed" },
                { label: "Critical", value: projectStats?.critical || 0, status: "Critical" }
              ]}
            />
            
            <ProjectStatsCard 
              title="Upcoming Milestones"
              value={upcomingMilestones}
              icon={<Flag className="text-accent h-5 w-5" />}
              progress={{ 
                value: 45, 
                label: "45% complete" 
              }}
            />
            
            <ProjectStatsCard 
              title="Avg. Completion"
              value={`${Math.round(projectStats?.avgCompletion || 0)}%`}
              icon={<DollarSign className="text-secondary h-5 w-5" />}
              change={{ 
                value: "5% this month", 
                isPositive: true 
              }}
            />
            
            <ProjectStatsCard 
              title="Manufacturing"
              value="4/5"
              icon={<Building2 className="text-success h-5 w-5" />}
              tags={[
                { label: "Active", value: 4, status: "On Track" },
                { label: "Available", value: 1, status: "Inactive" }
              ]}
            />
          </div>
          
          {/* Project List Table */}
          <DataTable
            columns={columns}
            data={(filteredProjects as ProjectWithRawData[]).filter(p => 
              p.status.toLowerCase() !== 'delivered' && 
              p.status.toLowerCase() !== 'archived'
            )}
            filterColumn="status"
            filterOptions={statusOptions}
            searchPlaceholder="Search projects..."
            frozenColumns={['location', 'projectNumber', 'pmOwner', 'timeline', 'percentComplete', 'status']} // Freeze these columns on the left
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
        </TabsContent>
        
        <TabsContent value="delivered" className="mt-0">
          {/* Delivered Projects Tab */}
          <div className="bg-darkCard rounded-xl border border-gray-800 p-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-gray-400" />
                <h2 className="text-lg font-medium">Delivered Projects</h2>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search delivered projects..."
                  className="pl-8 bg-darkInput border-gray-700"
                />
              </div>
            </div>

            {/* Filter for delivered projects */}
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : (
              <DataTable 
                columns={columns}
                data={(filteredProjects as ProjectWithRawData[]).filter(p => p.status.toLowerCase() === 'delivered')}
                searchPlaceholder="Filter delivered projects..."
                filterColumn="projectNumber"
              />
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="archived" className="mt-0">
          {/* Archived Projects Tab */}
          <div className="bg-darkCard rounded-xl border border-gray-800 p-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Archive className="h-5 w-5 text-gray-400" />
                <h2 className="text-lg font-medium">Archived Projects</h2>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search archived projects..."
                  className="pl-8 bg-darkInput border-gray-700"
                />
              </div>
            </div>

            {/* Query for archived projects */}
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : (
              <DataTable 
                columns={columns}
                data={(filteredProjects as ProjectWithRawData[]).filter(p => p.status.toLowerCase() === 'archived')}
                searchPlaceholder="Filter archived projects..."
                filterColumn="projectNumber"
              />
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="delivery" className="mt-0">
          {/* Render the On Time Delivery component */}
          <OnTimeDelivery />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProjectStatus;