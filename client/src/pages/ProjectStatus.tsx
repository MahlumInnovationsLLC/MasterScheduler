import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  PlusCircle,
  Archive,
  Camera
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
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { formatDate, getProjectStatusColor, getProjectScheduleState } from '@/lib/utils';
import { Project, delayResponsibilityEnum } from '@shared/schema';

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

// Utility function to format column names
const formatColumnName = (column: string): string => {
  return column.charAt(0).toUpperCase() + column.slice(1).replace(/([A-Z])/g, ' $1');
};

const ProjectStatus = () => {
  // State for archived projects visibility - now TRUE by default to show all projects
  const [showArchived, setShowArchived] = useState(true);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { data: projects, isLoading, refetch: refetchProjects } = useQuery<Project[]>({
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
  
  // Delivery dialog state
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [deliveryReason, setDeliveryReason] = useState('');
  const [delayResponsibility, setDelayResponsibility] = useState<string>('');
  const [isLateDelivery, setIsLateDelivery] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Archive dialog state
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [selectedArchiveProjectId, setSelectedArchiveProjectId] = useState<number | null>(null);
  const [archiveReason, setArchiveReason] = useState('');
  
  // Generate responsibility options from enum
  const responsibilityOptions = Object.values(delayResponsibilityEnum.enumValues);
  
  // Function to handle opening the delivery dialog
  const openDeliveryDialog = (projectId: number) => {
    if (!projects) return;
    
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    setSelectedProjectId(projectId);
    
    // Use existing delivery/ship date if available, otherwise default to today
    const existingDate = project.deliveryDate || project.shipDate || format(new Date(), 'yyyy-MM-dd');
    setDeliveryDate(existingDate);
    
    // Check if delivery is late (comparing to contract date)
    const contractDate = project.contractDate;
    if (contractDate) {
      const isLate = new Date(existingDate) > new Date(contractDate);
      setIsLateDelivery(isLate);
    } else {
      setIsLateDelivery(false);
    }
    
    setDeliveryReason('');
    setDelayResponsibility('');
    setDeliveryDialogOpen(true);
  };

  // Function to handle opening the archive dialog
  const openArchiveDialog = (projectId: number) => {
    setSelectedArchiveProjectId(projectId);
    setArchiveReason('');
    setArchiveDialogOpen(true);
  };

  // Function to handle archiving a project
  const handleArchiveProject = async () => {
    if (!selectedArchiveProjectId) return;

    try {
      const data = {
        reason: archiveReason || undefined
      };

      const response = await apiRequest('POST', `/api/projects/${selectedArchiveProjectId}/archive`, data);
      
      if (response.ok) {
        // Refresh projects list
        queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
        queryClient.invalidateQueries({ queryKey: ['/api/archived-projects'] });
        
        // Close dialog and show success message
        setArchiveDialogOpen(false);
        const project = projects?.find(p => p.id === selectedArchiveProjectId);
        toast({
          title: 'Project archived successfully',
          description: `${project?.projectNumber} has been moved to archived projects`,
        });
      } else {
        throw new Error('Failed to archive project');
      }
      
    } catch (error) {
      console.error('Error archiving project:', error);
      toast({
        title: 'Failed to archive project',
        description: 'An error occurred. Please try again.',
        variant: 'destructive'
      });
    }
  };
  
  // Function to handle submitting the delivery form
  const handleMarkAsDelivered = async () => {
    if (!selectedProjectId) return;
    
    try {
      // Use the proper API endpoint for marking projects as delivered
      const data: any = {
        deliveryDate: deliveryDate  // Include the user-selected delivery date
      };
      
      console.log("🚀 FRONTEND: Sending delivery request with data:", JSON.stringify(data, null, 2));
      console.log("🚀 FRONTEND: Selected delivery date:", deliveryDate);
      
      // Include late delivery data if provided
      if (isLateDelivery && deliveryReason) {
        data.lateDeliveryReason = deliveryReason;
      }
      if (isLateDelivery && delayResponsibility && delayResponsibility !== 'not_applicable') {
        data.delayResponsibility = delayResponsibility;
      }
      
      console.log("🚀 FRONTEND: Final data being sent:", JSON.stringify(data, null, 2));
      
      const response = await apiRequest('POST', `/api/projects/${selectedProjectId}/mark-delivered`, data);
      
      if (response.ok) {
        // Reset dialog state first
        setDeliveryDialogOpen(false);
        setDeliveryReason('');
        setDelayResponsibility('');
        
        // Add a small delay before refreshing to prevent focus issues
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
          queryClient.invalidateQueries({ queryKey: ['/api/delivered-projects'] });
        }, 100);
        
        toast({
          title: 'Project marked as delivered',
          description: 'Project has been moved to Delivered Projects',
        });
      } else {
        throw new Error('Failed to mark project as delivered');
      }
      
    } catch (error) {
      console.error('Error marking project as delivered:', error);
      toast({
        title: 'Failed to mark project as delivered',
        description: 'An error occurred. Please try again.',
        variant: 'destructive'
      });
    }
  };
  
  // Create stable callback functions to prevent re-renders
  const handleDeliveryDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("🔄 DELIVERY DIALOG: Date change triggered, value:", e.target.value);
    setDeliveryDate(e.target.value);
  }, []);

  const handleDeliveryReasonChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    console.log("🔄 DELIVERY DIALOG: Reason change triggered, value:", e.target.value);
    setDeliveryReason(e.target.value);
  }, []);

  const handleDelayResponsibilityChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    console.log("🔄 DELIVERY DIALOG: Responsibility change triggered, value:", e.target.value);
    setDelayResponsibility(e.target.value);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setDeliveryDialogOpen(false);
  }, []);

  // Memoize the selected project to prevent unnecessary re-renders
  const selectedProject = useMemo(() => {
    return projects?.find(p => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  // Stable Delivery Dialog component to prevent focus loss
  const StableDeliveryDialog = React.memo(function DeliveryDialogComponent() {
    console.log("🔄 DELIVERY DIALOG: Component rendering with state:", {
      deliveryDialogOpen,
      deliveryDate,
      isLateDelivery,
      deliveryReason,
      delayResponsibility,
      selectedProject: selectedProject?.name
    });
    
    return (
      <Dialog open={deliveryDialogOpen} onOpenChange={setDeliveryDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Mark Project as Delivered</DialogTitle>
            <DialogDescription>
              {selectedProject ? (
                <>Mark <strong>{selectedProject.name}</strong> (#{selectedProject.projectNumber}) as delivered</>
              ) : 'Mark project as delivered'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="delivery-date" className="text-right">
                Delivery Date
              </Label>
              <Input
                id="delivery-date"
                type="date"
                value={deliveryDate}
                onChange={handleDeliveryDateChange}
                className="col-span-3"
              />
            </div>
            
            {isLateDelivery && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <div className="text-right col-span-4">
                    <div className="text-amber-600 font-semibold flex items-center justify-end">
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      Late Delivery Detected
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This delivery is after the contracted delivery date
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="delay-reason" className="text-right">
                    Delay Reason
                  </Label>
                  <Textarea
                    id="delay-reason"
                    value={deliveryReason}
                    onChange={handleDeliveryReasonChange}
                    placeholder="Explain why the delivery was delayed"
                    className="col-span-3"
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="delay-responsibility" className="text-right">
                    Responsibility
                  </Label>
                  <select
                    id="delay-responsibility"
                    value={delayResponsibility}
                    onChange={handleDelayResponsibilityChange}
                    className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">-- Select responsibility --</option>
                    {responsibilityOptions.map(option => (
                      <option key={option} value={option}>
                        {option.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleMarkAsDelivered}>Mark as Delivered</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  });

  // Create stable callback functions for archive dialog
  const handleArchiveReasonChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setArchiveReason(e.target.value);
  }, []);

  const handleCloseArchiveDialog = useCallback(() => {
    setArchiveDialogOpen(false);
  }, []);

  // Memoize the selected archive project to prevent unnecessary re-renders
  const selectedArchiveProject = useMemo(() => {
    return projects?.find(p => p.id === selectedArchiveProjectId) || null;
  }, [projects, selectedArchiveProjectId]);

  // Add the Archive Dialog component with stable props
  const ArchiveDialog = useCallback(() => {
    return (
      <Dialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <DialogContent className="bg-darkBg border-gray-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              Archive Project
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              This will archive the project and remove it from the active projects list. 
              Archived projects can still be viewed in System Settings but cannot be modified.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-start">
              <Archive className="h-10 w-10 text-destructive mr-4 flex-shrink-0" />
              <div>
                <p className="text-white font-medium">
                  Are you sure you want to archive{' '}
                  <span className="font-bold">
                    {selectedArchiveProject?.projectNumber}: {selectedArchiveProject?.name}
                  </span>?
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  This action will move the project to the archive, along with all associated tasks, 
                  billing milestones, and manufacturing schedules.
                </p>
              </div>
            </div>
            
            <div className="bg-gray-900 p-3 rounded-md">
              <Label htmlFor="archiveReason" className="text-sm font-medium mb-2 block">
                Reason for archiving (optional)
              </Label>
              <Input
                id="archiveReason"
                value={archiveReason}
                onChange={handleArchiveReasonChange}
                placeholder="e.g., Project completed, Contract terminated, etc."
                className="bg-darkInput border-gray-700 focus:border-primary text-white"
              />
            </div>
          </div>
          
          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseArchiveDialog}
              className="border-gray-700 hover:bg-gray-800 hover:text-white"
            >
              Cancel
            </Button>
            
            <Button
              type="button"
              variant="destructive"
              onClick={handleArchiveProject}
              className="bg-destructive hover:bg-destructive/90"
            >
              <Archive className="h-4 w-4 mr-2" />
              Archive Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }, [archiveDialogOpen, selectedArchiveProject, archiveReason, handleArchiveReasonChange, handleCloseArchiveDialog, handleArchiveProject]);
  
  // DISABLED auto-filtering - show ALL projects by default
  useEffect(() => {
    if (!projects || hasAppliedInitialFilter) return;
    
    // Simply mark that we've processed the initial state
    // without applying any filters - this ensures ALL projects are visible
    console.log(`Initialized with ${projects.length} total projects - NO auto-filtering`);
    setHasAppliedInitialFilter(true);
    
    // Clear any existing date filters to ensure all projects are shown
    setDateFilters({
      shipDateMin: '',
      shipDateMax: '',
      contractDateMin: '',
      contractDateMax: '',
      estimatedCompletionDateMin: '',
      estimatedCompletionDateMax: ''
    });
    
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
    notes: true,  // Make the notes column visible
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
  
  // Location filter state
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [sortableColumns, setSortableColumns] = useState<boolean>(false);
  
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

  // Apply date filters and location filters to projects
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
      // Now we'll only filter out archived projects if showArchived is false
      // This allows displaying all projects including archived ones when showArchived is true
      if (project.status === 'archived' && !showArchived) {
        return false;
      }
      
      // Check if any filter is active
      const hasActiveFilters = Object.values(dateFilters).some(val => val !== '') || locationFilter !== '';
      
      // If no filters, return all projects (archived ones only if showArchived is true)
      if (!hasActiveFilters) {
        // Keep sorting enabled for all columns
        setSortableColumns(true);
        return true;
      }
      
      // Location filtering
      if (locationFilter && project.location) {
        // Enable sorting when a location filter is applied
        setSortableColumns(true);
        
        // If the project location doesn't match the filter, exclude it
        if (project.location.toLowerCase() !== locationFilter.toLowerCase()) {
          return false;
        }
      }
      
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
  }, [projects, dateFilters, locationFilter, showArchived]);
  
  // Effect to move filter buttons into table header
  useEffect(() => {
    // Wait for the DOM to be ready
    const moveFilterButtons = () => {
      const source = document.getElementById('custom-filter-buttons-source');
      const target = document.getElementById('custom-filter-buttons');
      
      if (source && target) {
        // Clear previous content
        while (target.firstChild) {
          target.firstChild.remove();
        }
        
        // Clone the buttons but not as a deep clone to preserve event handlers
        const buttons = source.cloneNode(false);
        
        // Copy each child individually to preserve event handlers
        Array.from(source.children).forEach(child => {
          const clone = child.cloneNode(true);
          buttons.appendChild(clone);
          
          // Restore event listeners for the Show Archived button
          if (clone.textContent?.includes('Archived')) {
            clone.addEventListener('click', () => setShowArchived(!showArchived));
          }
          
          // Add event listeners for location filter items
          if (clone.querySelector('[data-location-filter]')) {
            const items = clone.querySelectorAll('[data-location-filter]');
            items.forEach(item => {
              item.addEventListener('click', (e) => {
                const locationValue = (e.currentTarget as HTMLElement).dataset.locationFilter || '';
                setLocationFilter(locationValue);
              });
            });
          }
        });
        
        // Make the buttons visible and enable pointer events
        buttons.classList.remove('opacity-0');
        buttons.classList.remove('pointer-events-none');
        
        // Move the content
        target.appendChild(buttons);
      }
    };
    
    // Run after a short delay to ensure both elements exist
    const timer = setTimeout(moveFilterButtons, 300);
    
    return () => clearTimeout(timer);
  }, [locationFilter, showArchived]); // Re-run when filter state changes

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
  
  // Remove comment that was causing issues
  // Adding Mark as Delivered option in project context menu
  
  // Function to mark a project as delivered
  const markProjectAsDelivered = async (projectId: number, lateReason?: string, responsibility?: string) => {
    try {
      // Use our new API endpoint for marking projects as delivered
      const data: any = {};
      
      // Only include late delivery data if it's provided
      if (lateReason) {
        data.lateDeliveryReason = lateReason;
      }
      
      if (responsibility && responsibility !== 'not_applicable') {
        data.delayResponsibility = responsibility;
      }
      
      const response = await apiRequest(
        "POST",
        `/api/projects/${projectId}/mark-delivered`,
        data
      );
      
      if (response.ok) {
        // Refresh projects list
        queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
        queryClient.invalidateQueries({ queryKey: ['/api/delivered-projects'] });
        
        // Show success notification
        toast({
          title: "Project Delivered",
          description: `Project has been successfully marked as delivered`,
          variant: "default"
        });
        
        return true;
      } else {
        throw new Error(`Failed to mark project as delivered`);
      }
    } catch (error) {
      toast({
        title: "Delivery Status Update Failed",
        description: `Error: ${(error as Error).message}`,
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
          // Wrap the cell content with the CellHighlighter component
          return (
            <CellHighlighter rowId={row.original.id} columnId={id}>
              {cellRenderer(row.original[accessorKey], row.original)}
            </CellHighlighter>
          );
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
      (value, project) => {
        // Check if ship date is past due
        const isPastDue = project.shipDate ? new Date(project.shipDate) < new Date() : false;
        // Check if this is a sales estimate
        const isSalesEstimate = project.isSalesEstimate;
        
        return (
          <div className={`flex items-center ${isPastDue ? 'bg-red-900/30 rounded' : isSalesEstimate ? 'bg-yellow-500/10 rounded' : ''}`}>
            <div className="ml-2 p-1">
              <div className={`text-sm font-medium ${isPastDue ? 'text-red-500' : isSalesEstimate ? 'text-yellow-400' : 'text-white'} whitespace-normal`}>
                <Link to={`/project/${project.id}`} className={`${isPastDue ? 'text-red-500 font-bold' : isSalesEstimate ? 'text-yellow-400 font-semibold' : 'text-primary'} hover:underline`}>
                  {isSalesEstimate && <span className="text-xs bg-yellow-500/20 text-yellow-300 px-1.5 py-0.5 rounded mr-2">PROPOSED</span>}
                  {value}
                </Link>
              </div>
              <div 
                className={`text-xs ${isSalesEstimate ? 'text-yellow-400/70' : 'text-gray-400'} line-clamp-2 overflow-hidden`}
                title={project.name} // Show full name on hover
              >
                {project.name}
              </div>
            </div>
          </div>
        );
      },
      { sortingFn: 'alphanumeric', size: 260 }),
    createColumn('pmOwner', 'pmOwner', 'PM Owner', 
      (value, project) => <EditableTextField projectId={project.id} field="pmOwner" value={value || ''} placeholder="Unassigned" />,
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
      (value, project) => <EditableDateField projectId={project.id} field="chassisETA" value={value} />,
      { size: 140 }),
    createColumn('dpasRating', 'dpasRating', 'DPAS Rating',
      (value, project) => <EditableTextField projectId={project.id} field="dpasRating" value={value} />,
      { size: 120 }),
    createColumn('stretchShortenGears', 'stretchShortenGears', 'Stretch/Shorten Gears',
      (value, project) => <EditableTextField projectId={project.id} field="stretchShortenGears" value={value} />,
      { size: 150 }),
    createColumn('hasBillingMilestones', 'hasBillingMilestones', 'Payment Milestones',
      (value) => value ? 'Yes' : 'No',
      { size: 140 }),
    createColumn('lltsOrdered', 'lltsOrdered', 'LLTS Ordered',
      (value) => value ? 'Yes' : 'No',
      { size: 120 }),
    createColumn('meAssigned', 'meAssigned', 'ME Assigned',
      (value, project) => <EditableTextField projectId={project.id} field="meAssigned" value={value} />,
      { size: 120 }),
    createColumn('meDesignOrdersPercent', 'meDesignOrdersPercent', 'ME Design %',
      (value, project) => <EditableTextField projectId={project.id} field="meDesignOrdersPercent" value={value} isPercentage={true} />,
      { size: 120 }),
    createColumn('eeAssigned', 'eeAssigned', 'EE Assigned',
      (value, project) => <EditableTextField projectId={project.id} field="eeAssigned" value={value} />,
      { size: 120 }),
    createColumn('eeDesignOrdersPercent', 'eeDesignOrdersPercent', 'EE Design %',
      (value, project) => <EditableTextField projectId={project.id} field="eeDesignOrdersPercent" value={value} isPercentage={true} />,
      { size: 120 }),
    createColumn('iteAssigned', 'iteAssigned', 'ITE Assigned',
      (value, project) => <EditableTextField projectId={project.id} field="iteAssigned" value={value} />,
      { size: 120 }),
    createColumn('itDesignOrdersPercent', 'itDesignOrdersPercent', 'IT Design %',
      (value, project) => <EditableTextField projectId={project.id} field="itDesignOrdersPercent" value={value} isPercentage={true} />,
      { size: 120 }),
    createColumn('ntcDesignOrdersPercent', 'ntcDesignOrdersPercent', 'NTC Design %',
      (value, project) => <EditableTextField projectId={project.id} field="ntcDesignOrdersPercent" value={value} isPercentage={true} />,
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
    // Create a derived column for NTC Testing Days that doesn't use the column name as accessor
    {
      id: 'ntcTestingDays',
      header: 'NTC Testing Days',
      cell: ({ row }) => {
        const project = row.original;
        // Calculate weekdays between NTC Testing Date and QC Start Date
        const ntcTestingDate = project.ntcTestingDate;
        const qcStartDate = project.qcStartDate;
        
        // Calculate weekdays
        const weekdays = calculateWeekdaysBetween(ntcTestingDate, qcStartDate);
        
        // If no calculation could be made
        if (weekdays === null) return 'N/A';
        
        // Style based on weekday count
        let style = '';
        if (weekdays < 3) {
          style = 'bg-red-200 text-red-800 px-2 py-1 rounded';
        } else if (weekdays < 5) {
          style = 'bg-yellow-200 text-yellow-800 px-2 py-1 rounded';
        } else {
          style = 'bg-green-200 text-green-800 px-2 py-1 rounded';
        }
        
        return <div className={style}>{weekdays}</div>;
      },
      size: 100
    },
    createColumn('qcStartDate', 'qcStartDate', 'QC Start', 
      (value, project) => <EditableDateField projectId={project.id} field="qcStartDate" value={value} />,
      { size: 170 }),
    // Create a derived column for QC Days
    {
      id: 'qcDays',
      header: 'QC Days',
      cell: ({ row }) => {
        const project = row.original;
        // Calculate weekdays between QC Start and Exec Review (or Ship Date if Exec Review isn't set)
        const qcStartDate = project.qcStartDate;
        const execReviewDate = project.executiveReviewDate;
        const shipDate = project.shipDate;
        
        // Use Exec Review Date if available, otherwise fall back to Ship Date
        const endDate = execReviewDate || shipDate;
        
        // Calculate weekdays
        const weekdays = calculateWeekdaysBetween(qcStartDate, endDate);
        
        // If no calculation could be made
        if (weekdays === null) return 'N/A';
        
        // Style based on weekday count
        let style = '';
        if (weekdays < 3) {
          style = 'bg-red-200 text-red-800 px-2 py-1 rounded';
        } else if (weekdays < 5) {
          style = 'bg-yellow-200 text-yellow-800 px-2 py-1 rounded';
        } else {
          style = 'bg-green-200 text-green-800 px-2 py-1 rounded';
        }
        
        return <div className={style}>{weekdays}</div>;
      },
      size: 100
    },
    createColumn('executiveReviewDate', 'executiveReviewDate', 'Exec Review', 
      (value, project) => <EditableDateField projectId={project.id} field="executiveReviewDate" value={value} />,
      { size: 170 }),
    // Add Photos Taken column with checkbox functionality
    {
      id: 'photosTaken',
      header: 'Photos Taken',
      accessorKey: 'photosTaken',
      size: 120,
      cell: ({ row }) => {
        const project = row.original;
        const [isChecked, setIsChecked] = useState(project.photosTaken === true);
        
        const handleToggle = async () => {
          const newValue = !isChecked;
          setIsChecked(newValue);
          
          try {
            await apiRequest('PATCH', `/api/projects/${project.id}`, {
              photosTaken: newValue
            });
            
            // Update the cache
            queryClient.setQueryData(['/api/projects'], (oldData: Project[] | undefined) => {
              if (!oldData) return oldData;
              return oldData.map(p => 
                p.id === project.id ? { ...p, photosTaken: newValue } : p
              );
            });
          } catch (error) {
            console.error('Failed to update photos taken status:', error);
            // Revert UI state on error
            setIsChecked(!newValue);
            toast({
              title: 'Update Failed',
              description: 'Could not update photos taken status.',
              variant: 'destructive'
            });
          }
        };
        
        // Wrap with CellHighlighter component
        return (
          <CellHighlighter rowId={project.id} columnId="photosTaken">
            <div className="flex items-center justify-center">
              {isChecked ? (
                <div 
                  className="flex items-center cursor-pointer bg-green-100 text-green-800 px-2 py-1 rounded"
                  onClick={handleToggle}
                >
                  <Check className="h-4 w-4 mr-1" />
                  <span>COMPLETE</span>
                </div>
              ) : (
                <div 
                  className="flex items-center cursor-pointer bg-red-100 text-red-800 px-2 py-1 rounded"
                  onClick={handleToggle}
                >
                  <X className="h-4 w-4 mr-1" />
                  <span>NOT DONE</span>
                </div>
              )}
            </div>
          </CellHighlighter>
        );
      }
    },
    createColumn('shipDate', 'shipDate', 'Ship Date', 
      (value, project) => {
        // Check if ship date is past due
        const isPastDue = value ? new Date(value) < new Date() : false;
        
        return (
          <div className={isPastDue ? 'bg-red-900/30 rounded p-1' : ''}>
            <EditableDateField 
              projectId={project.id} 
              field="shipDate" 
              value={value} 
              className={isPastDue ? 'text-red-500 font-semibold' : ''}
            />
          </div>
        );
      },
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
          <Link to={`/project/${row.original.id}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          <Link to={`/project/${row.original.id}/edit`}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Edit className="h-4 w-4" />
            </Button>
          </Link>
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
              <DropdownMenuItem onClick={() => openArchiveDialog(row.original.id)}>
                <Archive className="h-4 w-4 mr-2" />
                Archive Project
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => openDeliveryDialog(row.original.id)}
                className="text-green-500 hover:text-green-700 hover:bg-green-100"
              >
                <Check className="h-4 w-4 mr-2" />
                Mark as Delivered
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
          {/* Location Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant={locationFilter ? "default" : "outline"} 
                size="sm"
                className="flex items-center gap-2"
              >
                <Building2 className="h-4 w-4" />
                {locationFilter ? `Location: ${locationFilter}` : "Filter by Location"}
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
      <div className="relative">
        <DataTable
          columns={columns}
          data={filteredProjects as ProjectWithRawData[]}
          filterColumn="status"
          filterOptions={statusOptions}
          searchPlaceholder="Search projects..."
          frozenColumns={['location', 'projectNumber', 'name', 'pmOwner', 'progress', 'status']} // Freeze these columns on the left
          enableSorting={true} // Always enable sorting on all columns
          initialSorting={[{ id: 'shipDate', desc: false }]} // Auto-sort by ship date (earliest first)
        />
        
        {/* Custom Filter Buttons - Will be moved to the results header using portal/DOM manipulation */}
        {/* Filter buttons source div - HIDDEN 
            These buttons are not displayed at the top of the results window
            They are still available in the UI in other places as needed
        */}
        <div className="absolute top-0 left-0 opacity-0 pointer-events-none hidden">
          <div id="custom-filter-buttons-source" className="flex items-center gap-2">
            {/* Keeping the buttons in the DOM but hiding them completely */}
          </div>
        </div>
      </div>
      
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
      
      {/* Delivery Dialog */}
      <StableDeliveryDialog />
      <ArchiveDialog />
    </div>
  );
};

export default ProjectStatus;
