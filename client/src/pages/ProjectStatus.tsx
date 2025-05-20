import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import { calculateWeekdaysBetween } from '@/lib/utils';
import { CellHighlighter } from '@/components/CellHighlighter';
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
  ListFilter,
  AlertTriangle,
  PieChart,
  Check,
  X,
  Pencil as PencilIcon,
  PlusCircle
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ProjectStatsCard } from '@/components/ProjectStatusCard';
import { HighRiskProjectsCard } from '@/components/HighRiskProjectsCard';
import { Textarea } from '@/components/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ProjectStatusBreakdownCard } from '@/components/ProjectStatusBreakdownCard';
import { AIInsightsWidget } from '@/components/AIInsightsWidget';
import { DataTable } from '@/components/ui/data-table';
import { ProgressBadge } from '@/components/ui/progress-badge';
import EditableDateField from '@/components/EditableDateField';
import EditableNotesField from '../components/EditableNotesField';
import EditableTextField from '@/components/EditableTextField';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { StatusBadge } from '@/components/StatusBadge';
import { PhotosTakenCheckbox } from '@/components/PhotosTakenCheckbox';

interface ProjectWithRawData extends Project {
  rawData: Record<string, any>;
}

interface ProjectRow {
  original: ProjectWithRawData;
}

// Main component
export default function ProjectStatus() {
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const [locationFilter, setLocationFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [dateFilters, setDateFilters] = useState({
    startDateMin: '',
    startDateMax: '',
    shipDateMin: '',
    shipDateMax: '',
  });
  
  // Query to fetch all projects
  const { data: projects, isLoading: projectsLoading, error: projectsError } = useQuery({
    queryKey: ['/api/projects'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  const handlePhotosTakenChange = async (projectId: number, checked: boolean) => {
    try {
      await apiRequest(`/api/projects/${projectId}`, 'PATCH', { photosTaken: checked });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({
        title: "Photos taken status updated",
        description: `Photos taken status was ${checked ? 'checked' : 'unchecked'} for this project`,
      });
    } catch (error) {
      console.error("Error updating photos taken status:", error);
      toast({
        title: "Error updating photos taken status",
        description: "There was a problem updating the photos taken status. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Filter projects based on the location filter
  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    
    if (!locationFilter) {
      return projects as ProjectWithRawData[];
    }
    
    return (projects as ProjectWithRawData[]).filter((project: ProjectWithRawData) => {
      return project.location === locationFilter;
    });
  }, [projects, locationFilter]);

  // Helper to get raw data fields safely
  const getRawDataField = (project: ProjectWithRawData, field: string, defaultValue: any = 'N/A'): any => {
    try {
      if (!project.rawData) return defaultValue;
      const value = project.rawData[field];
      return value !== undefined && value !== null ? value : defaultValue;
    } catch (e) {
      console.warn(`Error getting raw data field ${field}:`, e);
      return defaultValue;
    }
  };

  // Define table columns
  const columns = useMemo(() => [
    // Location column (always enable sorting)
    {
      id: 'location',
      header: "Location",
      accessorKey: 'location',
      cell: ({ row }: { row: ProjectRow }) => (
        <div className="font-medium">
          {row.original.location || 'N/A'}
        </div>
      ),
    },
    // Project Number column
    {
      id: 'projectNumber',
      header: "Project #",
      accessorKey: 'projectNumber',
      cell: ({ row }: { row: ProjectRow }) => (
        <div className="font-medium whitespace-nowrap">
          {row.original.projectNumber}
        </div>
      ),
    },
    // Name column
    {
      id: 'name',
      header: "Name",
      accessorKey: 'name',
      cell: ({ row }: { row: ProjectRow }) => {
        const hasHighRiskField = getRawDataField(row.original, 'isHighRisk', false);
        
        return (
          <div className="flex items-center gap-2">
            {hasHighRiskField && (
              <div className="text-red-500">
                <AlertTriangle size={16} />
              </div>
            )}
            <CellHighlighter 
              value={row.original.name} 
              highlight={getRawDataField(row.original, 'nameHighlight', false)}
              indicator={getRawDataField(row.original, 'nameIndicator')}
            />
          </div>
        );
      },
    },
    // PM/Owner column
    {
      id: 'pmOwner',
      header: "PM/Owner",
      accessorKey: 'pmOwner',
      cell: ({ row }: { row: ProjectRow }) => (
        <CellHighlighter 
          value={row.original.pmOwner || 'N/A'} 
          highlight={getRawDataField(row.original, 'pmOwnerHighlight', false)}
          indicator={getRawDataField(row.original, 'pmOwnerIndicator')}
        />
      ),
    },
    // Progress column
    {
      id: 'progress',
      header: "Progress",
      accessorFn: (row: ProjectWithRawData) => row.progress || 0,
      cell: ({ row }: { row: ProjectRow }) => (
        <ProgressBadge 
          value={row.original.progress || 0} 
          highlight={getRawDataField(row.original, 'progressHighlight', false)}
          indicator={getRawDataField(row.original, 'progressIndicator')}
        />
      ),
    },
    // Status column
    {
      id: 'status',
      header: "Status",
      accessorKey: 'status',
      cell: ({ row }: { row: ProjectRow }) => (
        <StatusBadge 
          status={row.original.status}
          highlight={getRawDataField(row.original, 'statusHighlight', false)}
          indicator={getRawDataField(row.original, 'statusIndicator')}
        />
      ),
    },
    // Photos Taken column
    {
      id: 'photosTaken',
      header: "Photos Taken",
      accessorKey: 'photosTaken',
      cell: ({ row }: { row: ProjectRow }) => (
        <PhotosTakenCheckbox
          checked={!!row.original.photosTaken}
          onChange={(checked) => handlePhotosTakenChange(row.original.id, checked)}
        />
      ),
    },
    // Description column
    {
      id: 'description',
      header: "Description",
      accessorKey: 'description',
      cell: ({ row }: { row: ProjectRow }) => (
        <CellHighlighter 
          value={row.original.description || 'N/A'} 
          highlight={getRawDataField(row.original, 'descriptionHighlight', false)}
          indicator={getRawDataField(row.original, 'descriptionIndicator')}
          maxLength={150}
        />
      ),
    },
    // Client column
    {
      id: 'client',
      header: "Client",
      accessorFn: (row: ProjectWithRawData) => getRawDataField(row, 'client', 'N/A'),
      cell: ({ row }: { row: ProjectRow }) => (
        <CellHighlighter 
          value={getRawDataField(row.original, 'client', 'N/A')} 
          highlight={getRawDataField(row.original, 'clientHighlight', false)}
          indicator={getRawDataField(row.original, 'clientIndicator')}
        />
      ),
    },
    // Ship Date column
    {
      id: 'shipDate',
      header: "Ship Date",
      accessorFn: (row: ProjectWithRawData) => row.shipDate || 'N/A',
      cell: ({ row }: { row: ProjectRow }) => {
        const shipDate = row.original.shipDate 
          ? new Date(row.original.shipDate)
          : null;
          
        return (
          <CellHighlighter 
            value={shipDate ? format(shipDate, 'MMM d, yyyy') : 'N/A'} 
            highlight={getRawDataField(row.original, 'shipDateHighlight', false)}
            indicator={getRawDataField(row.original, 'shipDateIndicator')}
          />
        );
      },
    },
    // Actions column
    {
      id: 'actions',
      header: "Actions",
      cell: ({ row }: { row: ProjectRow }) => (
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(`/projects/${row.original.id}`)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>View</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(`/projects/${row.original.id}/edit`)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => navigate(`/projects/${row.original.id}/timeline`)}
              >
                <PieChart className="mr-2 h-4 w-4" />
                Timeline
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate(`/bay-scheduling?project=${row.original.id}`)}
              >
                <Calendar className="mr-2 h-4 w-4" />
                Bay Schedule
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => navigate(`/projects/${row.original.id}/billing`)}
              >
                <DollarSign className="mr-2 h-4 w-4" />
                Billing
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ], [navigate, handlePhotosTakenChange]);
  
  // Status options for filtering
  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'delayed', label: 'Delayed' },
    { value: 'completed', label: 'Completed' },
    { value: 'critical', label: 'Critical' },
    { value: 'archived', label: 'Archived' },
  ];

  if (projectsLoading) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-sans font-bold">Project Status</h1>
            <p className="text-gray-400 text-sm">Manage and track all your project timelines and progress</p>
          </div>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
              <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
            </div>
            <p className="mt-2 text-gray-500">Loading projects...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-sans font-bold">Project Status</h1>
          <p className="text-gray-400 text-sm">Manage and track all your project timelines and progress</p>
        </div>
      </div>
      
      {/* Filter Buttons Bar - Matches screenshot */}
      <div className="flex items-center gap-2 mb-6 bg-zinc-900 p-2 rounded-lg shadow-sm">
        {/* Location Filter Button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant={locationFilter ? "default" : "outline"} 
              size="sm"
              className="flex items-center gap-1"
            >
              <Building2 className="h-4 w-4" />
              Filter by Location
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setLocationFilter('')}>
              All Locations
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {projects && 
              [...new Set(projects
                .map(p => p.location)
                .filter(Boolean)
              )]
              .sort()
              .map(location => (
                <DropdownMenuItem 
                  key={location} 
                  onClick={() => setLocationFilter(location || '')}
                >
                  {location}
                </DropdownMenuItem>
              ))
            }
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* Date Filter Button */}
        <Button 
          variant="outline" 
          size="sm"
          className="flex items-center gap-1"
          onClick={() => setIsFilterDialogOpen(true)}
        >
          <Calendar className="h-4 w-4" />
          Date Filter
        </Button>
        
        {/* Columns Button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              <ListFilter className="h-4 w-4" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>
              Show All Columns
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              Hide Status Column
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* Sort Button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              <SortDesc className="h-4 w-4" />
              Sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>
              Sort by Name
            </DropdownMenuItem>
            <DropdownMenuItem>
              Sort by Date
            </DropdownMenuItem>
            <DropdownMenuItem>
              Sort by Status
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* Spacer to push New Project button to the right */}
        <div className="flex-grow"></div>
        
        {/* New Project Button */}
        <Link href="/projects/new">
          <Button className="flex items-center gap-1" size="sm">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>
      
      {/* Date Filter Dialog - Separate from buttons */}
      <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Filter Projects by Date</DialogTitle>
            <DialogDescription>Select date ranges to filter projects</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-6 pt-4">
            {/* Date filter content here */}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
        {/* Total Projects - Wider (5 columns) */}
        <div className="md:col-span-5">
          <ProjectStatsCard />
        </div>
        
        {/* Status Breakdown (7 columns) */}
        <div className="md:col-span-7">
          <ProjectStatusBreakdownCard />
        </div>
      </div>
      
      {/* AI Insights */}
      <div className="mb-6">
        <AIInsightsWidget />
      </div>
      
      {/* Projects DataTable */}
      <div className="mb-6">
        <DataTable 
          columns={columns} 
          data={filteredProjects}
          filterColumn="status"
          filterOptions={statusOptions}
          searchPlaceholder="Search projects..."
          frozenColumns={['location', 'projectNumber']}
          enableSorting={!locationFilter}
        />
      </div>
    </div>
  );
}
