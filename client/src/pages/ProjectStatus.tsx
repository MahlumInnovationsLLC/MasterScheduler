import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
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
import EditableNotesField from '@/components/EditableNotesField';
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
import { formatDate, getProjectStatusColor, getProjectScheduleState } from '@/lib/utils';
import { Project } from '@shared/schema';

// Extend Project type to ensure rawData is included
interface ProjectWithRawData extends Project {
  rawData: Record<string, any>;
}

// EditableDateField is now imported from components folder

// EditableNotesField is now imported from components folder

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
  
  const { data: manufacturingSchedules } = useQuery({
    queryKey: ['/api/manufacturing-schedules'],
  });
  
  const { data: billingMilestones } = useQuery({
    queryKey: ['/api/billing-milestones'],
  });
  
  const { data: manufacturingBays } = useQuery({
    queryKey: ['/api/manufacturing-bays'],
  });
  // Flag to track if initial auto-filtering has been applied
  const [hasAppliedInitialFilter, setHasAppliedInitialFilter] = useState(false);
  
  // Auto-filter projects by next ship date on initial load
  useEffect(() => {
    if (!projects || hasAppliedInitialFilter) return;
    
    // Helper to get valid dates and handle null/invalid dates
    const getValidDate = (dateStr: string | null | undefined) => {
      if (!dateStr) return null;
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date;
    };
    
    // Find upcoming ship dates (after today)
    const now = new Date();
    const upcomingProjects = projects.filter(p => {
      const shipDate = getValidDate(p.shipDate);
      return shipDate && shipDate >= now;
    });
    
    // If we have upcoming projects with ship dates, auto-filter by ship date
    if (upcomingProjects.length > 0) {
      // Sort by earliest ship date
      const earliestShipDate = upcomingProjects
        .sort((a, b) => {
          const dateA = getValidDate(a.shipDate);
          const dateB = getValidDate(b.shipDate);
          if (!dateA) return 1;
          if (!dateB) return -1;
          return dateA.getTime() - dateB.getTime();
        })[0];
      
      if (earliestShipDate?.shipDate) {
        // Set a ship date minimum filter to today
        setDateFilters(prev => ({
          ...prev,
          shipDateMin: now.toISOString().split('T')[0]
        }));
      }
    }
    
    // Mark that we've applied the initial filter
    setHasAppliedInitialFilter(true);
  }, [projects, hasAppliedInitialFilter]);
  
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
  
  // Calculate project state breakdown
  const projectStateBreakdown = React.useMemo(() => {
    if (!projects || projects.length === 0) return null;
    
    // Initialize counters
    let unscheduled = 0;
    let scheduled = 0;
    let inProgress = 0;
    let complete = 0;
    
    // Count projects by schedule state
    projects.forEach(project => {
      // If project is completed, add to complete count
      if (project.status === 'completed') {
        complete++;
        return;
      }
      
      // For all other projects, categorize by their schedule state
      const scheduleState = getProjectScheduleState(manufacturingSchedules, project.id);
      
      if (scheduleState === 'Unscheduled') {
        unscheduled++;
      } else if (scheduleState === 'Scheduled') {
        scheduled++;
      } else if (scheduleState === 'In Progress') {
        inProgress++;
      } else if (scheduleState === 'Complete') {
        complete++;
      }
    });
    
    return {
      unscheduled,
      scheduled,
      inProgress,
      complete
    };
  }, [projects, manufacturingSchedules]);

  // Apply date filters to projects
  const filteredProjects = React.useMemo(() => {
    if (!projects) return [];
    
    // Helper to safely parse dates
    const parseDate = (dateString: string | null | undefined): Date | null => {
      if (!dateString) return null;
      
      try {
        const date = new Date(dateString);
        // Check if date is valid
        return isNaN(date.getTime()) ? null : date;
      } catch (e) {
        console.error("Error parsing date:", dateString, e);
        return null;
      }
    };
    
    // Helper to check date range
    const isInDateRange = (dateValue: string | null | undefined, minDate: string, maxDate: string): boolean => {
      if (!dateValue) return true; // Skip filtering if no date value
      
      const parsedDate = parseDate(dateValue);
      if (!parsedDate) return true; // Skip if unparseable
      
      if (minDate && parseDate(minDate) && parsedDate < parseDate(minDate)!) {
        return false;
      }
      
      if (maxDate && parseDate(maxDate) && parsedDate > parseDate(maxDate)!) {
        return false;
      }
      
      return true;
    };
    
    // Cast projects to ProjectWithRawData[] to ensure rawData is available
    return (projects as ProjectWithRawData[]).filter((project: ProjectWithRawData) => {
      // Check if any filter is active
      const hasActiveFilters = Object.values(dateFilters).some(val => val !== '');
      
      // If no filters, return all projects
      if (!hasActiveFilters) return true;
      
      // Start Date Filtering
      if (!isInDateRange(project.startDate, dateFilters.startDateMin, dateFilters.startDateMax)) {
        return false;
      }
      
      // End Date Filtering
      if (!isInDateRange(project.estimatedCompletionDate, dateFilters.endDateMin, dateFilters.endDateMax)) {
        return false;
      }
      
      // QC Start Date Filtering
      if (!isInDateRange(project.qcStartDate, dateFilters.qcStartDateMin, dateFilters.qcStartDateMax)) {
        return false;
      }
      
      // Ship Date Filtering
      if (!isInDateRange(project.shipDate, dateFilters.shipDateMin, dateFilters.shipDateMax)) {
        return false;
      }
      
      return true;
    });
  }, [projects, dateFilters]);

  // Calculate upcoming milestones within the next 30 days
  const upcomingMilestones = React.useMemo(() => {
    if (!billingMilestones || !Array.isArray(billingMilestones)) return 0;
    
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    return billingMilestones.filter(milestone => {
      if (!milestone.dueDate) return false;
      
      try {
        const dueDate = new Date(milestone.dueDate);
        return !milestone.isPaid && dueDate >= now && dueDate <= thirtyDaysFromNow;
      } catch (e) {
        console.error("Error parsing milestone due date:", e);
        return false;
      }
    }).length;
  }, [billingMilestones]);
  
  // Calculate manufacturing bay statistics
  const manufacturingStats = React.useMemo(() => {
    if (!manufacturingBays || !Array.isArray(manufacturingBays)) return { active: 0, available: 0, total: 0 };
    
    const total = manufacturingBays.length;
    const active = manufacturingBays.filter(bay => bay.isActive && 
      Array.isArray(manufacturingSchedules) && 
      manufacturingSchedules.some(schedule => schedule.bayId === bay.id)
    ).length;
    
    return {
      active,
      available: total - active,
      total
    };
  }, [manufacturingBays, manufacturingSchedules]);

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
  
  // Function to update a project date field
  const updateProjectDate = async (projectId: number, field: string, value: string | null) => {
    try {
      const response = await apiRequest(
        "PATCH",
        `/api/projects/${projectId}`,
        { [field]: value }
      );
      
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
        toast({
          title: "Date Updated",
          description: `${field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')} has been updated successfully`,
          variant: "default"
        });
        return true;
      } else {
        throw new Error(`Failed to update ${field}`);
      }
    } catch (error) {
      toast({
        title: "Update Failed",
        description: `Error updating date: ${(error as Error).message}`,
        variant: "destructive"
      });
      return false;
    }
  };
  
  // Component for editable notes field
  const EditableNotesField = ({
    projectId,
    value
  }: {
    projectId: number;
    value: string | null;
  }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [noteValue, setNoteValue] = useState<string>(value || '');
    const [isUpdating, setIsUpdating] = useState(false);
    
    // Function to handle saving the notes
    const handleSave = async () => {
      setIsUpdating(true);
      try {
        const response = await apiRequest(
          "PATCH",
          `/api/projects/${projectId}`,
          { notes: noteValue }
        );
        
        if (response.ok) {
          queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
          toast({
            title: "Notes Updated",
            description: "Notes have been updated successfully",
            variant: "default"
          });
          setIsEditing(false);
        } else {
          throw new Error("Failed to update notes");
        }
      } catch (error) {
        toast({
          title: "Update Failed",
          description: `Error updating notes: ${(error as Error).message}`,
          variant: "destructive"
        });
      } finally {
        setIsUpdating(false);
      }
    };
    
    // Display editor if in edit mode
    if (isEditing) {
      return (
        <div className="flex flex-col space-y-2 py-1">
          <textarea
            className="w-full h-24 px-2 py-1 rounded text-xs bg-background border border-input"
            value={noteValue}
            onChange={(e) => setNoteValue(e.target.value)}
            placeholder="Add notes here..."
          />
          <div className="flex justify-end space-x-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6" 
              onClick={handleSave}
              disabled={isUpdating}
            >
              {isUpdating ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-t-transparent border-primary"></div> : <Check className="h-3 w-3 text-success mr-1" />}
              Save
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6" 
              onClick={() => setIsEditing(false)}
              disabled={isUpdating}
            >
              <X className="h-3 w-3 text-danger mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      );
    }
    
    // Regular display mode
    return (
      <div 
        className="text-sm cursor-pointer hover:underline flex items-center min-h-[32px] relative group"
        onClick={() => setIsEditing(true)}
      >
        {noteValue ? (
          <>
            <div className="line-clamp-2">{noteValue}</div>
            <PencilIcon className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 absolute right-0 top-0" />
          </>
        ) : (
          <div className="text-gray-400 flex items-center">
            <span>Add notes</span>
            <PlusCircle className="h-3 w-3 ml-1" />
          </div>
        )}
      </div>
    );
  };
  
  // Use the imported EditableDateField component instead

  // Toggle column visibility
  const toggleColumnVisibility = (column: string) => {
    setVisibleColumns(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
  };
  
  // Helper function to create column definitions with proper typing
  const createColumn = <T extends keyof ProjectWithRawData>(
    id: string,
    accessorKey: T,
    header: string,
    cellRenderer: (value: ProjectWithRawData[T], project: ProjectWithRawData) => React.ReactNode,
    options: Record<string, any> = {}
  ) => {
    // Determine if this is a date column
    const isDateColumn = 
      id.toLowerCase().includes('date') || 
      id.toLowerCase().includes('eta') || 
      id.toLowerCase().includes('start') ||
      id.toLowerCase().includes('completion');
    
    return {
      id,
      accessorKey,
      header,
      // Use custom sort function to make N/A values appear at the bottom
      sortingFn: options.sortingFn || 'customSort' as any,
      ...options,
      cell: ({ row }: { row: ProjectRow }) => {
        try {
          return cellRenderer(row.original[accessorKey], row.original);
        } catch (error) {
          console.error(`Error rendering cell for column ${id}:`, error);
          return <div className="text-red-500">Error</div>;
        }
      }
    };
  };
  
  // Helper function to safely access raw data fields
  const getRawDataField = (project: ProjectWithRawData, field: string, defaultValue: any = 'N/A'): any => {
    try {
      if (!project.rawData) return defaultValue;
      
      // If the field exists directly in rawData, return it
      if (project.rawData[field] !== undefined && project.rawData[field] !== null) {
        return project.rawData[field];
      }
      
      // Search for case-insensitive match if no exact match
      const keys = Object.keys(project.rawData);
      const matchingKey = keys.find(key => key.toLowerCase() === field.toLowerCase());
      
      if (matchingKey) {
        return project.rawData[matchingKey];
      }
      
      // Try replacements of spaces with underscores and vice versa
      const spaceKey = field.replace(/_/g, ' ');
      const underscoreKey = field.replace(/ /g, '_');
      
      if (project.rawData[spaceKey] !== undefined) {
        return project.rawData[spaceKey];
      }
      
      if (project.rawData[underscoreKey] !== undefined) {
        return project.rawData[underscoreKey];
      }
      
      // Return default if no match found
      return defaultValue;
    } catch (error) {
      console.error(`Error accessing raw data field ${field}:`, error);
      return defaultValue;
    }
  };
  
  // Now all columns directly access the appropriate data from the project object

  // Define all available columns
  const allColumns = [
    // Add the location column as first column to ensure it appears at the far left
    {
      id: 'location',
      accessorKey: 'location',
      header: 'Location',
      size: 120,
      cell: ({ row }: { row: ProjectRow }) => {
        const value = row.original.location;
        return (
          <div className="flex items-center">
            <div className="px-3 py-1 rounded bg-primary text-white font-medium">
              {value || 'N/A'}
            </div>
          </div>
        );
      }
    },
    createColumn('projectNumber', 'projectNumber', 'Project', 
      (value, project) => (
        <div className="flex items-center">
          <div className="ml-2">
            <div className="text-sm font-medium text-white whitespace-normal">{value}</div>
            <div 
              className="text-xs text-gray-400 line-clamp-2 overflow-hidden" 
              title={project.name} // Show full name on hover
            >
              {project.name}
            </div>
          </div>
        </div>
      ),
      { sortingFn: 'alphanumeric', size: 260 }),
    createColumn('pmOwner', 'pmOwnerId', 'PM Owner', 
      (value) => <div className="text-sm">{value || 'Unassigned'}</div>,
      { size: 150 }),
    {
      id: 'timeline',
      accessorKey: 'startDate',
      header: 'Timeline',
      size: 200,
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
      },
      { size: 120 }),
    createColumn('status', 'status', 'Status', 
      (value, project) => {
        const percentValue = typeof project.percentComplete === 'string' 
          ? parseFloat(project.percentComplete) 
          : Number(project.percentComplete);
          
        const { status } = getProjectStatusColor(
          percentValue,
          project.estimatedCompletionDate
        );
        
        // Get the scheduling state for this project
        const scheduleState = manufacturingSchedules 
          ? getProjectScheduleState(manufacturingSchedules, project.id)
          : 'Unscheduled';
        
        return (
          <div className="flex items-center gap-2">
            <ProgressBadge status={status} />
            <ProgressBadge 
              status={scheduleState} 
              className={
                scheduleState === 'Unscheduled' ? 'bg-gray-700 border-gray-600' :
                scheduleState === 'Scheduled' ? 'bg-green-900 border-green-700' :
                scheduleState === 'In Progress' ? 'bg-yellow-900 border-yellow-700' :
                'bg-blue-900 border-blue-700'
              }
            />
          </div>
        );
      },
      { size: 180 }),
    createColumn('contractDate', 'contractDate', 'Contract Date', 
      (value, project) => <EditableDateField projectId={project.id} field="contractDate" value={value} />,
      { size: 140 }),
    createColumn('startDate', 'startDate', 'Start Date', 
      (value) => formatDate(value),
      { size: 140 }),
    createColumn('estimatedCompletionDate', 'estimatedCompletionDate', 'Est. Completion', 
      (value) => formatDate(value),
      { size: 140 }),
    createColumn('actualCompletionDate', 'actualCompletionDate', 'Actual Completion', 
      (value) => formatDate(value),
      { size: 140 }),
    createColumn('chassisETA', 'chassisETA', 'Chassis ETA', 
      (value) => formatDate(value),
      { size: 140 }),
    createColumn('dpasRating', 'dpasRating', 'DPAS Rating',
      (value) => value || 'N/A',
      { size: 120 }),
    createColumn('stretchShortenGears', 'stretchShortenGears', 'Stretch/Shorten Gears',
      (value) => value || 'N/A',
      { size: 150 }),
    createColumn('hasBillingMilestones', 'hasBillingMilestones', 'Payment Milestones',
      (value) => value ? 'Yes' : 'No',
      { size: 140 }),
    createColumn('lltsOrdered', 'lltsOrdered', 'LLTS Ordered',
      (value) => value ? 'Yes' : 'No',
      { size: 120 }),
    createColumn('meAssigned', 'meAssigned', 'ME Assigned',
      (value) => value || 'N/A',
      { size: 120 }),
    createColumn('meDesignOrdersPercent', 'meDesignOrdersPercent', 'ME Design %',
      (value) => value ? `${value}%` : 'N/A',
      { size: 120 }),
    createColumn('eeAssigned', 'eeAssigned', 'EE Assigned',
      (value) => value || 'N/A',
      { size: 120 }),
    createColumn('eeDesignOrdersPercent', 'eeDesignOrdersPercent', 'EE Design %',
      (value) => value ? `${value}%` : 'N/A',
      { size: 120 }),
    createColumn('iteAssigned', 'iteAssigned', 'ITE Assigned',
      (value) => value || 'N/A',
      { size: 120 }),
    createColumn('itDesignOrdersPercent', 'itDesignOrdersPercent', 'IT Design %',
      (value) => value ? `${value}%` : 'N/A',
      { size: 120 }),
    createColumn('ntcDesignOrdersPercent', 'ntcDesignOrdersPercent', 'NTC Design %',
      (value) => value ? `${value}%` : 'N/A',
      { size: 120 }),
    createColumn('fabricationStart', 'fabricationStart', 'Fabrication Start', 
      (value, project) => <EditableDateField projectId={project.id} field="fabricationStart" value={value} />,
      { size: 170 }),
    createColumn('assemblyStart', 'assemblyStart', 'Assembly Start', 
      (value, project) => <EditableDateField projectId={project.id} field="assemblyStart" value={value} />,
      { size: 170 }),
    createColumn('wrapDate', 'wrapDate', 'Wrap Date', 
      (value, project) => <EditableDateField projectId={project.id} field="wrapDate" value={value} />,
      { size: 170 }),
    createColumn('ntcTestingDate', 'ntcTestingDate', 'NTC Testing', 
      (value, project) => <EditableDateField projectId={project.id} field="ntcTestingDate" value={value} />,
      { size: 170 }),
    createColumn('qcStartDate', 'qcStartDate', 'QC Start', 
      (value, project) => <EditableDateField projectId={project.id} field="qcStartDate" value={value} />,
      { size: 170 }),
    createColumn('qcDays', 'qcDays', 'QC Days', 
      (value) => value !== null ? value : 'N/A',
      { size: 100 }),
    createColumn('executiveReviewDate', 'executiveReviewDate', 'Exec Review', 
      (value, project) => <EditableDateField projectId={project.id} field="executiveReviewDate" value={value} />,
      { size: 170 }),
    createColumn('shipDate', 'shipDate', 'Ship Date', 
      (value, project) => <EditableDateField projectId={project.id} field="shipDate" value={value} />,
      { size: 170 }),
    createColumn('deliveryDate', 'deliveryDate', 'Delivery Date', 
      (value, project) => <EditableDateField projectId={project.id} field="deliveryDate" value={value} />,
      { size: 170 }),
    createColumn('notes', 'notes', 'Notes',
      (value, project) => <EditableNotesField projectId={project.id} value={value} />,
      { size: 250 }),
    createColumn('description', 'description', 'Description',
      (value, project) => (
        <div className="text-sm max-w-xs truncate" title={value as string}>
          {value || 'N/A'}
        </div>
      ),
      { size: 200 }),
    createColumn('team', 'team', 'Team',
      (value) => value || 'N/A',
      { size: 120 }),
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }: { row: ProjectRow }) => (
        <div className="text-right space-x-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/project/${row.original.id}`)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/project/${row.original.id}/edit`)}>
            <Edit className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/project/${row.original.id}`)}>
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/project/${row.original.id}/edit`)}>
                Edit Project
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                const projectId = row.original.id;
                navigate(`/project/${projectId}/task/new`);
              }}>
                Add Task
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                toast({
                  title: "Archive functionality coming soon",
                  description: "Project archiving will be available in a future update.",
                });
                // In the future this will archive projects to a separate database
                // Implementation will move the project to the archived table in the database
                // and remove it from the active projects view
              }}>
                Archive Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];
  
    // Create dynamic columns based on rawData fields found in the first project
  const dynamicRawDataColumns = React.useMemo(() => {
    if (!filteredProjects || filteredProjects.length === 0) return [];
    
    const sampleProject = filteredProjects[0];
    if (!sampleProject.rawData) return [];
    
    // Get unique keys from rawData that aren't already in our column set
    const rawDataKeys = Object.keys(sampleProject.rawData);
    const existingColumnIds = allColumns.map(col => col.id);
    
    // Map common field names to nicer display names
    const friendlyNames: Record<string, string> = {
      'chassis_eta': 'Chassis ETA',
      'delivery_date': 'Delivery Date',
      'fabrication_start': 'Fabrication Start',
      'assembly_start': 'Assembly Start',
      'wrap_date': 'Wrap Date',
      'ntc_testing_date': 'NTC Testing',
      'qc_start_date': 'QC Start',
      'executive_review_date': 'Exec Review',
      'ship_date': 'Ship Date',
    };
    
    // Create columns for rawData fields
    return rawDataKeys
      .filter(key => 
        typeof sampleProject.rawData[key] !== 'object' && // Skip nested objects
        sampleProject.rawData[key] !== null // Skip null values
      )
      .map(key => {
        // Determine if this is a numeric column
        const isNumeric = typeof sampleProject.rawData[key] === 'number';
        
        // Determine if this is a date column - check if it contains "date" in the name
        const isDate = key.toLowerCase().includes('date') || 
                      key.toLowerCase().includes('eta') ||
                      key.toLowerCase().includes('start') ||
                      key.toLowerCase().includes('completion');
        
        // Format the header with friendly names and proper capitalization
        const formattedHeader = friendlyNames[key] || 
          key.split('_')
             .map(word => word.charAt(0).toUpperCase() + word.slice(1))
             .join(' ');
             
        return {
          id: `raw_${key}`,
          header: formattedHeader,
          accessorFn: (row: ProjectWithRawData) => getRawDataField(row, key),
          cell: ({ row }: { row: ProjectRow }) => {
            const value = getRawDataField(row.original, key);
            
            // Format based on detected type
            if (isDate) {
              return formatDate(value);
            } else if (isNumeric) {
              // Add percentage sign for values that look like percentages
              const numValue = parseFloat(value);
              if (!isNaN(numValue) && key.toLowerCase().includes('percent')) {
                return `${numValue}%`;
              }
              return value;
            } else if (typeof value === 'boolean') {
              return value ? 'Yes' : 'No';
            }
            
            return value || 'N/A';
          }
        };
      });
  }, [filteredProjects, allColumns]);
  
  // Only use standard columns - raw data will be loaded from the project data directly
  const allAvailableColumns = React.useMemo(() => {
    // We're only using the core columns for display consistency
    return allColumns;
  }, [allColumns]);
  
  // Filter columns based on visibility settings
  const columns = allAvailableColumns.filter(col => 
    // If the column is new (not in visibleColumns yet), show it by default
    visibleColumns[col.id as string] === undefined ? true : visibleColumns[col.id as string] !== false
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
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
        {/* Total Projects - Wider (5 columns) */}
        <div className="md:col-span-5">
          <ProjectStatsCard 
            title="Total Projects"
            value={projectStats?.total || 0}
            icon={<Folders className="text-primary h-5 w-5" />}
            tags={[
              { label: "Active", value: projectStats?.active || 0, status: "On Track" },
              { label: "Delayed", value: projectStats?.delayed || 0, status: "Delayed" },
              { label: "Critical", value: projectStats?.critical || 0, status: "Critical" }
            ]}
            stateBreakdown={projectStateBreakdown || undefined}
            className="h-72"
          />
        </div>
        
        {/* Upcoming Milestones (2 columns) */}
        <div className="md:col-span-2">
          <ProjectStatsCard 
            title="Upcoming Milestones"
            value={upcomingMilestones}
            icon={<Flag className="text-accent h-5 w-5" />}
            progress={{ 
              value: upcomingMilestones > 0 && Array.isArray(billingMilestones) && billingMilestones.length > 0 
                ? Math.round((upcomingMilestones / billingMilestones.length) * 100)
                : 0, 
              label: `${upcomingMilestones} due in 30 days` 
            }}
            className="h-72"
          />
        </div>
        
        {/* AI Insights (3 columns) */}
        <div className="md:col-span-3 h-72 overflow-hidden">
          <AIInsightsWidget projects={projects || []} />
        </div>
        
        {/* Manufacturing - Narrower (2 columns) */}
        <div className="md:col-span-2">
          <ProjectStatsCard 
            title="Manufacturing"
            value={`${manufacturingStats.active}/${manufacturingStats.total}`}
            icon={<Building2 className="text-success h-5 w-5" />}
            tags={[
              { label: "Active", value: manufacturingStats.active, status: "On Track" },
              { label: "Available", value: manufacturingStats.available, status: "Inactive" }
            ]}
            className="h-72"
          />
        </div>
      </div>
      
      {/* Project Status Breakdown now part of Total Projects card */}
      
      {/* Current Production Status - Horizontal Card */}
      <div className="mb-6">
        <HighRiskProjectsCard projects={projects || []} />
      </div>
      
      {/* Project List Table */}
      <DataTable
        columns={columns}
        data={filteredProjects as ProjectWithRawData[]}
        filterColumn="status"
        filterOptions={statusOptions}
        searchPlaceholder="Search projects..."
        frozenColumns={['location', 'projectNumber', 'name', 'pmOwner', 'progress', 'status']} // Freeze these columns on the left
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
