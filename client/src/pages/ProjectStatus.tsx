import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import { calculateWeekdaysBetween } from '@/lib/utils';
import { CellHighlighter } from '@/components/CellHighlighter';
import ErrorBoundary from '@/components/ErrorBoundary';
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
  BarChart,
  Check,
  X,
  Pencil as PencilIcon,
  PlusCircle,
  Archive,
  Camera,
  FileText
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
import EditableDateFieldWithOP from '@/components/EditableDateFieldWithOP';
import EditableNotesField from '../components/EditableNotesField';
import EditableTextField from '@/components/EditableTextField';
import { EditableStatusField } from '@/components/EditableStatusField';
import CCBRequestDialog from '@/components/CCBRequestDialog';
import ImpactAssessmentDialog from '@/components/ImpactAssessmentDialog';
import { Badge } from '@/components/ui/badge';
import { EngineeringAssignmentCell } from '@/components/EngineeringAssignmentCell';
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
import { useProjectLabelStats } from '@/hooks/use-project-label-stats';
import { DeliveryDialog } from '../components/DeliveryDialog';
import { exportProjectsToExcel } from '@/lib/excel-export';
import { ModuleHelpButton } from "@/components/ModuleHelpButton";
import { projectsHelpContent } from "@/data/moduleHelpContent";
import { useRolePermissions } from '@/hooks/use-role-permissions';

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

// Project Cell Component that matches badge colors
const ProjectCell = ({ project }: { project: ProjectWithRawData }) => {
  // Check if ship date is past due
  const isPastDue = project.shipDate ? new Date(project.shipDate) < new Date() : false;
  // Check if this is a sales estimate
  const isSalesEstimate = project.isSalesEstimate;

  // Fetch project labels to get the badge color
  const { data: projectLabels = [] } = useQuery({
    queryKey: [`/api/projects/${project.id}/labels`],
    enabled: !!project.id
  });

  // Get status-based background color from the actual badge/label
  const getStatusBackgroundColor = () => {
    // If there are no labels/badges, return no highlight
    if (!projectLabels || projectLabels.length === 0) {
      return '';
    }

    // Get the first label (since only one is allowed based on the code)
    const currentLabel = projectLabels[0];
    if (!currentLabel) {
      return '';
    }

    // Use the label's background color but with reduced opacity for highlighting
    const backgroundColor = currentLabel.backgroundColor;
    if (!backgroundColor) {
      return '';
    }

    // Convert hex color to RGB and apply low opacity for background highlight
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    };

    const rgb = hexToRgb(backgroundColor);
    if (rgb) {
      return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`;
    }

    return '';
  };

  const statusBackgroundColor = getStatusBackgroundColor();

  return (
    <div 
      className={`flex items-center rounded ${isPastDue ? 'bg-red-900/30' : isSalesEstimate ? 'bg-yellow-500/10' : ''}`}
      style={{ 
        backgroundColor: statusBackgroundColor || (isPastDue ? undefined : (isSalesEstimate ? undefined : 'transparent'))
      }}
    >
      <div className="ml-2 p-1">
        <div className={`text-sm font-medium ${isPastDue ? 'text-red-500' : isSalesEstimate ? 'text-yellow-400' : 'text-white'} whitespace-normal`}>
          <Link to={`/project/${project.id}`} className={`${isPastDue ? 'text-red-500 font-bold' : isSalesEstimate ? 'text-yellow-400 font-semibold' : 'text-primary'} hover:underline`}>
            {isSalesEstimate && <span className="text-xs bg-yellow-500/20 text-yellow-300 px-1.5 py-0.5 rounded mr-2">PROPOSED</span>}
            {project.projectNumber}
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
};

// Project Labels Inline Component for table cells
const ProjectLabelsInline = ({ projectId }: { projectId: number }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isViewOnly, canEdit } = useRolePermissions();

  // Fetch project labels
  const { data: labels = [] } = useQuery({
    queryKey: [`/api/projects/${projectId}/labels`],
    enabled: !!projectId
  });

  // Fetch available labels for assignment
  const { data: availableLabels = [] } = useQuery({
    queryKey: ['/api/project-labels']
  });

  const [isOpen, setIsOpen] = useState(false);

  // Assign label mutation - remove existing label first if any, then assign new one
  const assignMutation = useMutation({
    mutationFn: async (labelId: number) => {
      // First remove any existing labels (only one label allowed)
      if (labels.length > 0) {
        for (const assignment of labels) {
          await apiRequest('DELETE', `/api/projects/${projectId}/labels/${assignment.labelId}`);
        }
      }

      // Then assign the new label
      const response = await apiRequest('POST', `/api/projects/${projectId}/labels/${labelId}`);
      if (!response.ok) throw new Error('Failed to assign label');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/labels`] });
      toast({ title: "Label assigned successfully" });
    },
    onError: (error) => {
      console.error('Error assigning label:', error);
      toast({ title: "Error assigning label", variant: "destructive" });
    }
  });

  // Remove label mutation - with optimistic update
  const removeMutation = useMutation({
    mutationFn: async (labelId: number) => {
      const response = await apiRequest('DELETE', `/api/projects/${projectId}/labels/${labelId}`);
      if (!response.ok) throw new Error('Failed to remove label');
    },
    onMutate: async (labelId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: [`/api/projects/${projectId}/labels`] });

      // Snapshot the previous value
      const previousLabels = queryClient.getQueryData([`/api/projects/${projectId}/labels`]);

      // Optimistically update to the new value
      queryClient.setQueryData([`/api/projects/${projectId}/labels`], (old: any[]) => 
        old ? old.filter(label => label.labelId !== labelId) : []
      );

      return { previousLabels };
    },
    onError: (err, labelId, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData([`/api/projects/${projectId}/labels`], context?.previousLabels);
      toast({ title: "Error removing label", variant: "destructive" });
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/labels`] });
    }
  });

  const handleAssignLabel = (labelId: number) => {
    assignMutation.mutate(labelId);
    setIsOpen(false);
  };

  const handleRemoveLabel = (labelId: number) => {
    removeMutation.mutate(labelId);
  };

  // Current assigned label (should only be one)
  const currentLabel = labels[0];

  // Show all labels for selection if no label is assigned
  const showAddButton = !currentLabel;

  return (
    <div className="flex flex-wrap gap-1 items-center min-w-0">
      {/* Display current label */}
      {currentLabel && (
        <Badge 
          key={currentLabel.id}
          variant="secondary" 
          className={`px-2 py-1 text-xs font-medium border ${canEdit ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed opacity-70'} transition-opacity`}
          style={{ 
            backgroundColor: currentLabel.backgroundColor || '#6b7280', 
            color: currentLabel.textColor || '#ffffff',
            borderColor: currentLabel.backgroundColor || '#6b7280'
          }}
          onClick={() => canEdit && handleRemoveLabel(currentLabel.labelId)}
          title={canEdit ? "Click to remove" : "View only - cannot edit status"}
        >
          {currentLabel.labelName}
          {canEdit && <X className="w-3 h-3 ml-1" />}
        </Badge>
      )}

      {/* Show read-only indicator for Viewer role when no label is assigned */}
      {!currentLabel && isViewOnly && (
        <Badge 
          variant="secondary" 
          className="px-2 py-1 text-xs font-medium border cursor-not-allowed opacity-70"
          style={{ 
            backgroundColor: '#6b7280', 
            color: '#ffffff',
            borderColor: '#6b7280'
          }}
          title="View only - cannot edit status"
        >
          No Status
        </Badge>
      )}

      {/* Add/Change label button - only for Editor and Admin */}
      {canEdit && (showAddButton || currentLabel) && (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-2 text-xs border-dashed hover:border-solid transition-all"
            >
              <Plus className="w-3 h-3 mr-1" />
              {currentLabel ? 'Change' : 'Add'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="start">
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {(availableLabels || []).filter((label: any) => label.name !== 'DELIVERED').map((label: any) => (
                <button
                  key={label.id}
                  onClick={() => handleAssignLabel(label.id)}
                  className="w-full flex items-center justify-start px-2 py-1 rounded text-xs hover:bg-gray-50 transition-colors"
                  disabled={assignMutation.isPending}
                >
                  <Badge 
                    variant="secondary" 
                    className="px-2 py-1 text-xs font-medium border mr-2"
                    style={{ 
                      backgroundColor: label.backgroundColor || '#6b7280', 
                      color: label.textColor || '#ffffff',
                      borderColor: label.backgroundColor || '#6b7280'
                    }}
                  >
                    {label.name}
                  </Badge>
                  {currentLabel?.labelId === label.id && (
                    <Check className="w-3 h-3 ml-auto text-green-600" />
                  )}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};



// Utility function to format column names
const formatColumnName = (column: string): string => {
  return column.charAt(0).toUpperCase() + column.slice(1).replace(/([A-Z])/g, ' $1');
};

const ProjectStatus = () => {
  // State for archived projects visibility - now TRUE by default to show all projects
  const [showArchived, setShowArchived] = useState(true);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { data: projects = [], isLoading, isError, error, refetch: refetchProjects } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    retry: 3,
    retryDelay: 1000,
    staleTime: 30000,
    refetchOnWindowFocus: false
  });

  const { data: ccbRequests = [] } = useQuery({
    queryKey: ['/api/ccb-requests'],
    staleTime: 30000,
  });

  const { data: manufacturingSchedules = [] } = useQuery({
    queryKey: ['/api/manufacturing-schedules'],
  });

  const { data: billingMilestones = [] } = useQuery({
    queryKey: ['/api/billing-milestones'],
  });

  const { data: manufacturingBays = [] } = useQuery({
    queryKey: ['/api/manufacturing-bays'],
  });

  // Fetch all project label assignments for sorting
  const { data: allProjectLabelAssignments = [] } = useQuery({
    queryKey: ['/api/all-project-label-assignments'],
    staleTime: 30000,
    refetchOnWindowFocus: false
  });

  // Fetch available labels to get issue type information
  const { data: availableLabels = [] } = useQuery({
    queryKey: ['/api/project-labels']
  });

  // Function to get issue priority for sorting
  const getIssuePriority = (projectId: number): number => {
    if (!allProjectLabelAssignments || !availableLabels) return 0;
    
    // Find the project's label assignment
    const assignment = allProjectLabelAssignments.find((a: any) => a.projectId === projectId);
    if (!assignment) return 0; // No status assigned
    
    // Find the label details
    const label = availableLabels.find((l: any) => l.id === assignment.labelId);
    if (!label) return 0;
    
    // Priority order: MAJOR ISSUE > MINOR ISSUE > GOOD > DELIVERED > No Status
    switch (label.name) {
      case 'MAJOR ISSUE': return 4;
      case 'MINOR ISSUE': return 3;
      case 'GOOD': return 2;
      case 'DELIVERED': return 1;
      default: return 0;
    }
  };

  // Removed hasAppliedInitialFilter - not needed anymore

  // Delivery dialog state
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [deliveryReason, setDeliveryReason] = useState('');
  const [delayResponsibility, setDelayResponsibility] = useState<string>('');
  const [isLateDelivery, setIsLateDelivery] = useState(false);
  
  // CCB Request Dialog State
  const [ccbDialogOpen, setCcbDialogOpen] = useState(false);
  const [selectedProjectForCCB, setSelectedProjectForCCB] = useState<any>(null);

  // Impact Assessment Dialog State
  const [impactAssessmentDialogOpen, setImpactAssessmentDialogOpen] = useState(false);
  const [selectedProjectForImpact, setSelectedProjectForImpact] = useState<any>(null);

  // Function to open CCB request dialog
  const openCCBDialog = (project: any) => {
    setSelectedProjectForCCB(project);
    setCcbDialogOpen(true);
  };

  // Function to open Impact Assessment dialog
  const openImpactAssessmentDialog = (project: any) => {
    setSelectedProjectForImpact(project);
    setImpactAssessmentDialogOpen(true);
  };

  // Function to check if project has date variances (orange highlights)
  const hasDateVariances = (project: any) => {
    const phaseKeys = [
      'fabricationStartDate', 'paintStartDate', 'productionStartDate', 'itStartDate',
      'wrapDate', 'ntcTestingDate', 'qcStartDate', 'executiveReviewDate', 'shipDate', 'deliveryDate'
    ];
    
    const opKeys = [
      'opFabricationStartDate', 'opPaintStartDate', 'opProductionStartDate', 'opItStartDate',
      'opWrapDate', 'opNtcTestingDate', 'opQcStartDate', 'opExecutiveReviewDate', 'opShipDate', 'opDeliveryDate'
    ];
    
    for (let i = 0; i < phaseKeys.length; i++) {
      const currentDate = project[phaseKeys[i]];
      const opDate = project[opKeys[i]];
      
      if (currentDate && opDate) {
        const current = new Date(currentDate);
        const original = new Date(opDate);
        
        if (current.getTime() !== original.getTime()) {
          return true;
        }
      }
    }
    
    return false;
  };
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
  // Create stable refs for dialog handlers to prevent React.memo from breaking
  const dialogHandlersRef = useRef({
    onDateChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      console.log("🔄 STABLE DIALOG: Date change triggered, value:", e.target.value);
      setDeliveryDate(e.target.value);
    },
    onReasonChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      console.log("🔄 STABLE DIALOG: Reason change triggered, value:", e.target.value);
      setDeliveryReason(e.target.value);
    },
    onResponsibilityChange: (e: React.ChangeEvent<HTMLSelectElement>) => {
      console.log("🔄 STABLE DIALOG: Responsibility change triggered, value:", e.target.value);
      setDelayResponsibility(e.target.value);
    },
    onClose: () => {
      setDeliveryDialogOpen(false);
    },
    onSubmit: async () => {
      if (!selectedProject) return;

      try {
        const updateData: any = {
          status: 'delivered',
          actualDeliveryDate: deliveryDate
        };

        if (isLateDelivery && deliveryReason) {
          updateData.delayReason = deliveryReason;
        }

        if (isLateDelivery && delayResponsibility) {
          updateData.delayResponsibility = delayResponsibility;
        }

        await apiRequest(`/api/projects/${selectedProject.id}`, {
          method: 'PATCH',
          body: JSON.stringify(updateData),
        });

        toast({
          title: "Success",
          description: `Project ${selectedProject.name} marked as delivered`,
        });

        queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
        setDeliveryDialogOpen(false);
        setSelectedProjectId(null);
        setDeliveryDate('');
        setDeliveryReason('');
        setDelayResponsibility('');

      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to mark project as delivered",
          variant: "destructive",
        });
      }
    }
  });

  // Update refs on every render to capture latest state
  dialogHandlersRef.current.onDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("🔄 STABLE DIALOG: Date change triggered, value:", e.target.value);
    setDeliveryDate(e.target.value);
  };

  dialogHandlersRef.current.onReasonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    console.log("🔄 STABLE DIALOG: Reason change triggered, value:", e.target.value);
    setDeliveryReason(e.target.value);
  };

  dialogHandlersRef.current.onResponsibilityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    console.log("🔄 STABLE DIALOG: Responsibility change triggered, value:", e.target.value);
    setDelayResponsibility(e.target.value);
  };

  dialogHandlersRef.current.onClose = () => {
    setDeliveryDialogOpen(false);
  };

  dialogHandlersRef.current.onSubmit = async () => {
    if (!selectedProject) return;

    try {
      const updateData: any = {
        status: 'delivered',
        actualDeliveryDate: deliveryDate
      };

      if (isLateDelivery && deliveryReason) {
        updateData.delayReason = deliveryReason;
      }

      if (isLateDelivery && delayResponsibility) {
        updateData.delayResponsibility = delayResponsibility;
      }

      await apiRequest(`/api/projects/${selectedProject.id}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      });

      toast({
        title: "Success",
        description: `Project ${selectedProject.name} marked as delivered`,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setDeliveryDialogOpen(false);
      setSelectedProjectId(null);
      setDeliveryDate('');
      setDeliveryReason('');
      setDelayResponsibility('');

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark project as delivered",
        variant: "destructive",
      });
    }
  };

  // Memoize the selected project to prevent unnecessary re-renders
  const selectedProject = useMemo(() => {
    return projects?.find(p => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);



  // Create handler functions for archive dialog
  const handleArchiveReasonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setArchiveReason(e.target.value);
  };

  const handleCloseArchiveDialog = () => {
    setArchiveDialogOpen(false);
  };

  // Memoize the selected archive project to prevent unnecessary re-renders
  const selectedArchiveProject = useMemo(() => {
    return projects?.find(p => p.id === selectedArchiveProjectId) || null;
  }, [projects, selectedArchiveProjectId]);

  // Add the Archive Dialog component
  const ArchiveDialog = () => {
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
  };

  // Log when projects are loaded (no state updates here)
  useEffect(() => {
    if (projects && projects.length > 0) {
      console.log(`Initialized with ${projects.length} total projects - NO auto-filtering`);
    }
  }, [projects?.length]); // Only log when project count changes

  // State for visible columns
  const [visibleColumns, setVisibleColumns] = useState<{ [key: string]: boolean }>({
    projectNumber: true,
    name: true,
    pmOwner: true,
    timeline: true,
    percentComplete: true,
    status: true,
    contractDate: true, // Show Contract Date instead of Start Date
    estimatedCompletionDate: false, // Hidden: Est. Completion
    chassisETA: true,
    mechShop: true,
    qcStartDate: true,
    qcDays: true,
    shipDate: true,
    deliveryDate: true,
    // Making the required columns visible
    fabricationStart: true,
    paintStart: true,
    productionStart: true,
    wrapDate: true,
    itStart: true,
    ntcTestingDate: true,
    executiveReviewDate: true,
    dpasRating: true,
    stretchShortenGears: false, // Hidden: Stretch/Shorten Gears
    lltsOrdered: true,
    meAssigned: true,
    meDesignOrdersPercent: true,
    eeAssigned: true,
    eeDesignOrdersPercent: true,
    iteAssigned: true,
    itDesignOrdersPercent: true,
    ntcDesignOrdersPercent: true,
    hasBillingMilestones: false, // Hidden: Payment Milestones
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
  const [sortableColumns, setSortableColumns] = useState<boolean>(true); // Always allow sorting

  // Filter dialog state
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);

  // Get label statistics
  const labelStats = useProjectLabelStats();

  // Calculate project stats
  const projectStats = React.useMemo(() => {
    if (!projects || projects.length === 0) return null;

    const completed = (projects || []).filter(p => p.status === 'completed').length;
    const avgCompletion = projects.length > 0 ? projects.reduce((sum, p) => sum + Number(p.percentComplete), 0) / projects.length : 0;

    return {
      total: projects.length,
      major: labelStats.major,
      minor: labelStats.minor,
      good: labelStats.good,
      completed,
      avgCompletion
    };
  }, [projects, labelStats]);

  // Calculate project state breakdown
  const projectStateBreakdown = React.useMemo(() => {
    if (!projects || projects.length === 0) return null;

    // Initialize counters
    let unscheduled = 0;
    let scheduled = 0;
    let inProgress = 0;
    let complete = 0;
    let delivered = 0;

    // Count projects by schedule state
    projects.forEach(project => {
      // If project is completed, add to complete count
      if (project.status === 'completed') {
        complete++;
        return;
      }

      // If project is delivered, count it in delivered category
      if (project.status === 'delivered') {
        delivered++;
        return;
      }

      // Filter out Field or FSW category projects
      if (project.team === 'Field' || project.team === 'FSW') {
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
      complete,
      delivered
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

    // Cast projects to ProjectWithRawData[] and add issue priority for sorting
    const projectsWithPriority = ((projects || []) as ProjectWithRawData[]).map((project: ProjectWithRawData) => ({
      ...project,
      issuePriority: getIssuePriority(project.id)
    }));

    const filtered = projectsWithPriority.filter((project: ProjectWithRawData & { issuePriority: number }) => {
      // Now we'll only filter out archived projects if showArchived is false
      // This allows displaying all projects including archived ones when showArchived is true
      if (project.status === 'archived' && !showArchived) {
        return false;
      }

      // Check if any filter is active
      const hasActiveFilters = Object.values(dateFilters).some(val => val !== '') || locationFilter !== '';

      // If no filters, return all projects (archived ones only if showArchived is true)
      if (!hasActiveFilters) {
        return true;
      }

      // Location filtering
      if (locationFilter && project.location) {
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

    // ALWAYS sort delivered projects to the bottom regardless of other sorting
    return filtered.sort((a, b) => {
      // First priority: delivered projects always go to the bottom
      const aDelivered = a.status === 'delivered';
      const bDelivered = b.status === 'delivered';

      if (aDelivered && !bDelivered) return 1;  // a goes to bottom
      if (!aDelivered && bDelivered) return -1; // b goes to bottom

      // If both or neither are delivered, maintain existing order
      return 0;
    });
  }, [projects, dateFilters, locationFilter, showArchived, allProjectLabelAssignments, availableLabels]);

  // Commented out DOM manipulation to prevent infinite loops
  // This was causing re-renders by adding event listeners
  // The filter buttons should be handled through React's event system instead

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

  // Handle Excel export - excludes delivered projects and shows only date columns
  const handleExcelExport = () => {
    try {
      console.log('Starting export process...');
      console.log('Filtered projects count:', filteredProjects.length);
      
      // Filter out delivered projects by status rather than using a separate query
      const nonDeliveredProjects = (filteredProjects || []).filter(project => 
        project.status !== 'delivered'
      );

      console.log('Non-delivered projects count:', nonDeliveredProjects.length);

      if (nonDeliveredProjects.length === 0) {
        toast({
          title: 'No data to export',
          description: 'All projects are marked as delivered.',
          variant: 'destructive'
        });
        return;
      }

      // Transform the projects to match the export interface
      const exportData = nonDeliveredProjects.map(project => ({
        id: project.id,
        projectNumber: project.projectNumber || '',
        name: project.name || '',
        location: project.location || '',
        pmOwner: project.pmOwner || '',
        percentComplete: typeof project.percentComplete === 'number' ? project.percentComplete : 0,
        contractDate: project.contractDate,
        startDate: project.startDate,
        estimatedCompletionDate: project.estimatedCompletionDate,
        actualCompletionDate: project.actualCompletionDate,
        deliveryDate: project.deliveryDate,
        shipDate: project.shipDate,
        chassisETA: project.chassisETA,
        mechShop: project.mechShop,
        qcStartDate: project.qcStartDate,
        executiveReviewDate: project.executiveReviewDate,
        fabricationStart: project.fabricationStart,
        assemblyStart: project.assemblyStart,
        // Engineering assignment fields
        meAssigned: project.meAssigned || null,
        meCompletionPercent: project.meManualPercent || project.meDesignOrdersPercent || null,
        eeAssigned: project.eeAssigned || null,
        eeCompletionPercent: project.eeManualPercent || project.eeDesignOrdersPercent || null,
        iteAssigned: project.iteAssigned || null,
        iteCompletionPercent: project.iteManualPercent || project.itDesignOrdersPercent || null,
        ntcCompletionPercent: project.ntcManualPercent || project.ntcPercentage || null,
        notes: project.notes,
        rawData: project.rawData
      }));

      console.log('Export data prepared, sample:', exportData[0]);
      
      exportProjectsToExcel(exportData, 'projects-export');
      
      toast({
        title: 'Export successful',
        description: `Exported ${nonDeliveredProjects.length} projects to CSV`,
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: 'Export failed',
        description: `Unable to export projects: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive'
      });
    }
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
            <div className="px-3 py-1 rounded font-medium text-white border border-gray-500 shadow-lg" 
                 style={{ 
                   background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                   boxShadow: '0 2px 8px rgba(107, 114, 128, 0.3)'
                 }}>
              {value || 'N/A'}
            </div>
          </div>
        );
      }
    },
    createColumn('projectNumber', 'projectNumber', 'Project', 
      (value, project) => <ProjectCell project={project} />,
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
      { size: 120 }),
    createColumn('status', 'status', 'Status', 
      (value, project) => {
        return <ProjectLabelsInline projectId={project.id} />;
      },
      { 
        size: 200,
        sortingFn: 'statusSort' // Use custom sorting function for issue type priority
      }),
    createColumn('contractDate', 'contractDate', 'Contract Date', 
      (value, project) => <EditableDateFieldWithOP 
        projectId={project.id} 
        field="contractDate" 
        value={value} 
        opValue={(project as any).opContractDate}
        opField="opContractDate"
      />,
      { size: 140 }),
    createColumn('estimatedCompletionDate', 'estimatedCompletionDate', 'Est. Completion', 
      (value) => formatDate(value),
      { size: 140 }),
    createColumn('actualCompletionDate', 'actualCompletionDate', 'Actual Completion', 
      (value) => formatDate(value),
      { size: 140 }),
    createColumn('chassisETA', 'chassisETA', 'Chassis ETA', 
      (value, project) => <EditableDateFieldWithOP 
        projectId={project.id} 
        field="chassisETA" 
        value={value} 
        opValue={(project as any).opChassisETA}
        opField="opChassisETA"
      />,
      { size: 140 }),
    createColumn('mechShop', 'mechShop', 'MECH Shop', 
      (value, project) => <EditableDateFieldWithOP 
        projectId={project.id} 
        field="mechShop" 
        value={value} 
        opValue={(project as any).opMechShop}
        opField="opMechShop"
      />,
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
      (value, project) => <EngineeringAssignmentCell projectId={project.id} discipline="ME" />,
      { size: 120 }),
    createColumn('meDesignOrdersPercent', 'meDesignOrdersPercent', 'ME Design %',
      (value, project) => <EditableTextField projectId={project.id} field="meDesignOrdersPercent" value={value} isPercentage={true} />,
      { size: 120 }),
    createColumn('eeAssigned', 'eeAssigned', 'EE Assigned',
      (value, project) => <EngineeringAssignmentCell projectId={project.id} discipline="EE" />,
      { size: 120 }),
    createColumn('eeDesignOrdersPercent', 'eeDesignOrdersPercent', 'EE Design %',
      (value, project) => <EditableTextField projectId={project.id} field="eeDesignOrdersPercent" value={value} isPercentage={true} />,
      { size: 120 }),
    createColumn('iteAssigned', 'iteAssigned', 'ITE Assigned',
      (value, project) => <EngineeringAssignmentCell projectId={project.id} discipline="ITE" />,
      { size: 120 }),
    createColumn('itDesignOrdersPercent', 'itDesignOrdersPercent', 'IT Design %',
      (value, project) => <EditableTextField projectId={project.id} field="itDesignOrdersPercent" value={value} isPercentage={true} />,
      { size: 120 }),
    // Add NTC Assigned column
    {
      id: 'ntcAssigned',
      header: 'NTC Assigned',
      cell: ({ row }) => <EngineeringAssignmentCell projectId={row.original.id} discipline="NTC" />,
      size: 120
    },
    createColumn('ntcDesignOrdersPercent', 'ntcDesignOrdersPercent', 'NTC Design %',
      (value, project) => <EditableTextField projectId={project.id} field="ntcDesignOrdersPercent" value={value} isPercentage={true} />,
      { size: 120 }),
    createColumn('fabricationStart', 'fabricationStart', 'Fabrication Start', 
      (value, project) => <EditableDateFieldWithOP 
        projectId={project.id} 
        field="fabricationStart" 
        value={value} 
        opValue={(project as any).opFabricationStart}
        opField="opFabricationStart"
      />,
      { size: 170 }),
    createColumn('paintStart', 'paintStart', 'PAINT Start', 
      (value, project) => <EditableDateFieldWithOP 
        projectId={project.id} 
        field="paintStart" 
        value={value} 
        opValue={(project as any).opPaintStart}
        opField="opPaintStart"
      />,
      { size: 140 }),
    createColumn('productionStart', 'productionStart', 'Production Start', 
      (value, project) => <EditableDateFieldWithOP 
        projectId={project.id} 
        field="productionStart" 
        value={value} 
        opValue={(project as any).opProductionStart}
        opField="opProductionStart"
      />,
      { size: 170 }),
    createColumn('wrapDate', 'wrapDate', 'Wrap Date', 
      (value, project) => <EditableDateFieldWithOP 
        projectId={project.id} 
        field="wrapDate" 
        value={value} 
        opValue={(project as any).opWrapDate}
        opField="opWrapDate"
      />,
      { size: 170 }),
    createColumn('itStart', 'itStart', 'IT Start', 
      (value, project) => <EditableDateFieldWithOP 
        projectId={project.id} 
        field="itStart" 
        value={value} 
        opValue={(project as any).opItStart}
        opField="opItStart"
      />,
      { size: 140 }),
    createColumn('ntcTestingDate', 'ntcTestingDate', 'NTC Testing', 
      (value, project) => <EditableDateFieldWithOP 
        projectId={project.id} 
        field="ntcTestingDate" 
        value={value} 
        opValue={(project as any).opNtcTestingDate}
        opField="opNtcTestingDate"
      />,
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
      (value, project) => <EditableDateFieldWithOP 
        projectId={project.id} 
        field="qcStartDate" 
        value={value} 
        opValue={(project as any).opQcStartDate}
        opField="opQcStartDate"
      />,
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
      (value, project) => {
        // Prioritize text value over date value for status display
        const displayValue = (project as any).executiveReviewDateText || value;
        const opDisplayValue = (project as any).opExecutiveReviewDateText || (project as any).opExecutiveReviewDate;
        return <EditableDateFieldWithOP 
          projectId={project.id} 
          field="executiveReviewDate" 
          value={displayValue} 
          opValue={opDisplayValue}
          opField="opExecutiveReviewDate"
        />;
      },
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
            <EditableDateFieldWithOP 
              projectId={project.id} 
              field="shipDate" 
              value={value} 
              opValue={(project as any).opShipDate}
              opField="opShipDate"
              className={isPastDue ? 'text-red-500 font-semibold' : ''}
            />
          </div>
        );
      },
      { size: 170 }),
    createColumn('deliveryDate', 'deliveryDate', 'Delivery Date', 
      (value, project) => <EditableDateFieldWithOP 
        projectId={project.id} 
        field="deliveryDate" 
        value={value} 
        opValue={(project as any).opDeliveryDate}
        opField="opDeliveryDate"
      />,
      { size: 170 }),
    createColumn('notes', 'notes', 'Notes',
      (value, project) => <EditableNotesField projectId={project.id} value={value} />,
      { size: 120 }),
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
        
        <div className="flex items-center justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/project/${row.original.id}`)}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/project/${row.original.id}/edit`)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Project
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                const projectId = row.original.id;
                navigate(`/project/${projectId}/task/new`);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </DropdownMenuItem>
              {hasDateVariances(row.original) && (
                <>
                  <DropdownMenuItem 
                    onClick={() => openCCBDialog(row.original)}
                    className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Submit Schedule CCB Request
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => openImpactAssessmentDialog(row.original)}
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <BarChart className="h-4 w-4 mr-2" />
                    Run Impact Assessment
                  </DropdownMenuItem>
                </>
              )}
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
    const rawDataKeys = sampleProject.rawData ? Object.keys(sampleProject.rawData) : [];
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

  if (isError) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-sans font-bold mb-6">Project Status</h1>
        <div className="flex flex-col items-center justify-center h-96 text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Projects</h2>
          <p className="text-gray-600 mb-4">
            There was an error loading project data. This could be due to:
          </p>
          <ul className="text-left text-sm text-gray-500 mb-6">
            <li>• Network connectivity issues</li>
            <li>• Server temporary unavailability</li>
            <li>• Authentication problems</li>
            <li>• Browser cache issues</li>
          </ul>
          <div className="flex gap-3">
            <Button onClick={() => refetchProjects()} variant="outline">
              Try Again
            </Button>
            <Button onClick={() => window.location.reload()} variant="default">
              Refresh Page
            </Button>
          </div>
          <details className="mt-4 text-xs text-gray-400">
            <summary className="cursor-pointer">Technical Details</summary>
            <pre className="mt-2 text-left bg-gray-100 p-2 rounded">
              {error instanceof Error ? error.message : String(error)}
            </pre>
          </details>
        </div>
      </div>
    );
  }

  // Additional safety checks to prevent blank screen
  if (!projects && !isLoading && !isError) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-sans font-bold mb-6">Project Status</h1>
        <div className="flex flex-col items-center justify-center h-96 text-center">
          <AlertTriangle className="h-16 w-16 text-yellow-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Projects Found</h2>
          <p className="text-gray-600 mb-4">
            No project data is available. This could be due to:
          </p>
          <ul className="text-left text-sm text-gray-500 mb-6">
            <li>• Database connection issues</li>
            <li>• Empty database</li>
            <li>• Permission restrictions</li>
          </ul>
          <Button onClick={() => refetchProjects()} variant="outline">
            Retry Loading
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-sans font-bold">Project Status</h1>
            <p className="text-gray-400 text-sm">Manage and track all your project timelines and progress</p>
          </div>
          <ModuleHelpButton 
            moduleId="projects" 
            helpContent={projectsHelpContent}
          />
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
        {/* Total Projects - Wider (4 columns) */}
        <div className="md:col-span-4">
          <ProjectStatsCard 
            title="Total Projects"
            value={projectStats?.total || 0}
            icon={<Folders className="text-primary h-5 w-5" />}
            tags={[
              { label: "Major", value: projectStats?.major || 0, status: "Critical" },
              { label: "Minor", value: projectStats?.minor || 0, status: "Delayed" },
              { label: "Good", value: projectStats?.good || 0, status: "On Track" }
            ]}
            stateBreakdown={projectStateBreakdown || undefined}
            className="h-72"
          />
        </div>

        {/* AI Insights (4 columns) */}
        <div className="md:col-span-4 h-72 overflow-hidden">
          <AIInsightsWidget projects={projects || []} />
        </div>

        {/* CCB Requests (2 columns) */}
        <div className="md:col-span-2">
          <ProjectStatsCard 
            title="CCB Requests"
            value={(ccbRequests || []).filter((req: any) => req.status === 'pending_review' || req.status === 'under_review').length}
            icon={<FileText className="text-orange-500 h-5 w-5" />}
            tags={[
              { label: "Pending", value: (ccbRequests || []).filter((req: any) => req.status === 'pending_review').length, status: "Delayed" },
              { label: "Under Review", value: (ccbRequests || []).filter((req: any) => req.status === 'under_review').length, status: "On Track" },
              { label: "Approved", value: (ccbRequests || []).filter((req: any) => req.status === 'approved').length, status: "Completed" }
            ]}
            className="h-72"
          />
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
          searchPlaceholder="Search by project number, name, PM owner, location, status..."
          frozenColumns={['location', 'projectNumber', 'name', 'pmOwner', 'progress', 'status']} // Freeze these columns on the left
          enableSorting={true} // Always enable sorting on all columns
          initialSorting={[{ id: 'shipDate', desc: false }]} // Auto-sort by ship date (earliest first)
          onExportExcel={handleExcelExport}
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

      {/* Delivery Dialog - Only render when open to prevent unnecessary re-renders */}
      {deliveryDialogOpen && (
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
                  onChange={(e) => {
                    console.log("🔥 FOCUS DEBUG: Date change - value:", e.target.value, "activeElement:", document.activeElement?.id);
                    setDeliveryDate(e.target.value);
                    console.log("🔥 FOCUS DEBUG: After setDeliveryDate - activeElement:", document.activeElement?.id);
                  }}
                  onFocus={() => console.log("🔥 FOCUS DEBUG: Date input focused")}
                  onBlur={() => console.log("🔥 FOCUS DEBUG: Date input blurred")}
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
                      onChange={(e) => {
                        console.log("🔥 FOCUS DEBUG: Reason change - value:", e.target.value, "activeElement:", document.activeElement?.id);
                        setDeliveryReason(e.target.value);
                        console.log("🔥 FOCUS DEBUG: After setDeliveryReason - activeElement:", document.activeElement?.id);
                      }}
                      onFocus={() => console.log("🔥 FOCUS DEBUG: Reason textarea focused")}
                      onBlur={() => console.log("🔥 FOCUS DEBUG: Reason textarea blurred")}
                      onInput={(e) => console.log("🔥 FOCUS DEBUG: Reason input event - value:", e.currentTarget.value)}
                      onKeyDown={(e) => console.log("🔥 FOCUS DEBUG: Reason keydown - key:", e.key, "activeElement:", document.activeElement?.id)}
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
                      onChange={(e) => {
                        console.log("🔥 FOCUS DEBUG: Responsibility change - value:", e.target.value, "activeElement:", document.activeElement?.id);
                        setDelayResponsibility(e.target.value);
                        console.log("🔥 FOCUS DEBUG: After setDelayResponsibility - activeElement:", document.activeElement?.id);
                      }}
                      onFocus={() => console.log("🔥 FOCUS DEBUG: Responsibility select focused")}
                      onBlur={() => console.log("🔥 FOCUS DEBUG: Responsibility select blurred")}
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
              <Button variant="outline" onClick={() => setDeliveryDialogOpen(false)}>Cancel</Button>
              <Button onClick={async () => {
                if (!selectedProject) return;
                try {
                  const response = await fetch(`/api/projects/${selectedProject.id}/mark-delivered`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      deliveryDate,
                      lateDeliveryReason: deliveryReason,
                      delayResponsibility,
                    }),
                  });

                  if (!response.ok) {
                    throw new Error('Failed to mark project as delivered');
                  }

                  toast({
                    title: "Success",
                    description: `Project ${selectedProject.name} marked as delivered`,
                  });

                  queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
                  setDeliveryDialogOpen(false);
                  setSelectedProjectId(null);
                  setDeliveryDate('');
                  setDeliveryReason('');
                  setDelayResponsibility('');
                } catch (error) {
                  toast({
                    title: "Error",
                    description: "Failed to mark project as delivered",
                    variant: "destructive",
                  });
                }
              }}>Mark as Delivered</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      <ArchiveDialog />
      
      {/* CCB Request Dialog */}
      {selectedProjectForCCB && (
        <CCBRequestDialog
          isOpen={ccbDialogOpen}
          onClose={() => {
            setCcbDialogOpen(false);
            setSelectedProjectForCCB(null);
          }}
          project={selectedProjectForCCB}
        />
      )}

      {/* Impact Assessment Dialog */}
      {selectedProjectForImpact && (
        <ImpactAssessmentDialog
          open={impactAssessmentDialogOpen}
          onClose={() => {
            setImpactAssessmentDialogOpen(false);
            setSelectedProjectForImpact(null);
          }}
          project={selectedProjectForImpact}
        />
      )}
    </div>
  );
};

// Wrap the entire component in ErrorBoundary to catch rendering errors
const ProjectStatusWithErrorBoundary = () => {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('Projects Module Error:', error, errorInfo);
        // You could also send this to a logging service
      }}
    >
      <ProjectStatus />
    </ErrorBoundary>
  );
};

export default ProjectStatusWithErrorBoundary;