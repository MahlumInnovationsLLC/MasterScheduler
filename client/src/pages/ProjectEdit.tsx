import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertTriangle, CalendarIcon, ChevronLeft, Loader2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { FormDescription } from '@/components/ui/form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { format, addDays } from 'date-fns';
import { cn, formatDate } from '@/lib/utils';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useRolePermissions } from '@/hooks/use-role-permissions';
import { EnhancedDateField } from '@/components/EnhancedDateField';
import { RoleBasedWrapper } from '@/components/RoleBasedWrapper';
import { ProjectMilestoneIconsManager } from '@/components/ProjectMilestoneIconsManager';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Define the comprehensive project information schema
const projectSchema = z.object({
  projectNumber: z.string().min(1, 'Project number is required'),
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
  client: z.string().optional(),
  location: z.string().optional(),
  pmOwner: z.string().optional(),
  team: z.string().optional(),

  // New field for auto-calculation of dates
  poDroppedToDeliveryDays: z.number().min(1).default(365),

  // Dates (allow Date objects or text values like PENDING/N/A)
  contractDate: z.union([z.date(), z.string()]).optional(),
  startDate: z.union([z.date(), z.string()]).optional(), // This is Assembly Start Date
  poDroppedDate: z.union([z.date(), z.string()]).optional(), // New field for PO Dropped Date
  estimatedCompletionDate: z.union([z.date(), z.string()]).optional(),
  actualCompletionDate: z.union([z.date(), z.string()]).optional(),
  chassisETA: z.union([z.date(), z.string()]).optional(),
  fabricationStart: z.union([z.date(), z.string()]).optional(),
  assemblyStart: z.union([z.date(), z.string()]).optional(),
  wrapDate: z.union([z.date(), z.string()]).optional(),
  ntcTestingDate: z.union([z.date(), z.string()]).optional(),
  qcStartDate: z.union([z.date(), z.string()]).optional(),
  executiveReviewDate: z.union([z.date(), z.string()]).optional(),
  shipDate: z.union([z.date(), z.string()]).optional(),
  deliveryDate: z.union([z.date(), z.string()]).optional(),
  mechShop: z.union([z.date(), z.string()]).optional(),

  // Project details
  percentComplete: z.number().min(0).max(100).default(0),
  dpasRating: z.string().optional(),
  stretchShortenGears: z.string().optional(),
  lltsOrdered: z.boolean().default(false),
  qcDays: z.number().optional(),

  // Design assignments
  meAssigned: z.string().optional(),
  meDesignOrdersPercent: z.number().min(0).max(100).optional(),
  eeAssigned: z.string().optional(),
  eeDesignOrdersPercent: z.number().min(0).max(100).optional(),
  iteAssigned: z.string().optional(),
  itDesignOrdersPercent: z.number().min(0).max(100).optional(),
  ntcDesignOrdersPercent: z.number().min(0).max(100).optional(),

  // Manufacturing details
  totalHours: z.number().min(0).optional(),

  // Department allocation percentages
  fabricationPercent: z.number().min(0).max(100).default(27),
  paintPercent: z.number().min(0).max(100).default(7),
  assemblyPercent: z.number().min(0).max(100).default(45),
  itPercent: z.number().min(0).max(100).default(7),
  ntcTestingPercent: z.number().min(0).max(100).default(7),
  qcPercent: z.number().min(0).max(100).default(7),

  // MECH Shop progress
  mechShop: z.number().min(0).max(100).default(0),

  // Phase visibility controls
  showFabPhase: z.boolean().default(true),
  showPaintPhase: z.boolean().default(true),
  showProductionPhase: z.boolean().default(true),
  showItPhase: z.boolean().default(true),
  showNtcPhase: z.boolean().default(true),
  showQcPhase: z.boolean().default(true),

  // Status and notes
  status: z.string().optional(),
  priority: z.string().optional(),
  category: z.string().optional(),
  hasBillingMilestones: z.boolean().default(false),
  notes: z.string().optional(),
  isSalesEstimate: z.boolean().default(false),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

function ProjectEdit() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('general');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPercentageWarningOpen, setIsPercentageWarningOpen] = useState(false);
  const [isShipDateWarningOpen, setIsShipDateWarningOpen] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);
  const [totalPercentage, setTotalPercentage] = useState(100);
  const [originalShipDate, setOriginalShipDate] = useState<Date | null>(null);
  const [pendingFormData, setPendingFormData] = useState<ProjectFormValues | null>(null);

  // Get role permissions
  const { isViewOnly, canEdit, shouldDisableInput, getDisabledTooltip } = useRolePermissions();

  // Extract project ID from the URL
  const currentPath = window.location.pathname;
  const projectId = currentPath.split('/')[2]; // Get proper ID part from /project/:id/edit

  // Fetch project data
  const { data: project, isLoading, error } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });

  // Check if project has a manufacturing schedule
  const { data: manufacturingSchedules } = useQuery({
    queryKey: ['/api/manufacturing-schedules'],
    enabled: !!projectId,
  });

  // Determine if this project is scheduled in a manufacturing bay
  const isProjectScheduled = React.useMemo(() => {
    if (!manufacturingSchedules || !projectId) return false;
    return manufacturingSchedules.some((schedule: any) => schedule.projectId === parseInt(projectId));
  }, [manufacturingSchedules, projectId]);

  // Create form with react-hook-form
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      projectNumber: '',
      name: '',
      description: '',
      location: '',
      pmOwner: '',
      client: '',
      totalHours: 40,
      status: 'active',
      priority: 'medium',
      category: '',
      notes: '',
      isSalesEstimate: false,
    },
  });

  // Watch the PO Dropped Date and ARO days to calculate completion date
  const poDroppedDate = form.watch('poDroppedDate');
  const poDroppedToDeliveryDays = form.watch('poDroppedToDeliveryDays');

  // Auto-calculate estimated completion date when PO Dropped Date or ARO days change
  useEffect(() => {
    // Only calculate if both values exist
    if (poDroppedDate && poDroppedToDeliveryDays) {
      // Estimated completion date is PO Dropped Date + ARO days
      const estimatedDate = new Date(poDroppedDate);
      estimatedDate.setDate(estimatedDate.getDate() + poDroppedToDeliveryDays);
      form.setValue('estimatedCompletionDate', estimatedDate);
    }
  }, [poDroppedDate, poDroppedToDeliveryDays, form]);

  // Update form when project data is loaded
  useEffect(() => {
    if (project) {
      // Debug log to see what's coming from the server
      console.log("DEBUG - Project data received:", project);
      console.log("DEBUG - Percentage fields:", {
        fab: project.fabPercentage,
        paint: project.paintPercentage,
        production: project.productionPercentage,
        it: project.itPercentage,
        ntc: project.ntcPercentage,
        qc: project.qcPercentage
      });

      // Save the original ship date for comparison
      if (project.shipDate) {
        setOriginalShipDate(new Date(project.shipDate));
      }

      // Set default ARO days to 365
      let calculatedDays = 365; // Always default to 365 days

      // If the project already has a saved value for poDroppedToDeliveryDays, use that
      if (project.poDroppedToDeliveryDays) {
        calculatedDays = project.poDroppedToDeliveryDays;
      }

      form.reset({
        projectNumber: project.projectNumber || '',
        name: project.name || '',
        description: project.description || '',
        client: project.client || '',
        location: project.location || '',
        pmOwner: project.pmOwner || '',
        team: project.team || '',

        // Manufacturing details
        totalHours: project.totalHours ? Number(project.totalHours) : 40,

        // Department allocation percentages - use database field names
        fabricationPercent: project.fabPercentage !== undefined && project.fabPercentage !== null ? Number(project.fabPercentage) : 27,
        paintPercent: project.paintPercentage !== undefined && project.paintPercentage !== null ? Number(project.paintPercentage) : 7,
        assemblyPercent: project.productionPercentage !== undefined && project.productionPercentage !== null ? Number(project.productionPercentage) : 45,
        itPercent: project.itPercentage !== undefined && project.itPercentage !== null ? Number(project.itPercentage) : 7,
        ntcTestingPercent: project.ntcPercentage !== undefined && project.ntcPercentage !== null ? Number(project.ntcPercentage) : 7,
        qcPercent: project.qcPercentage !== undefined && project.qcPercentage !== null ? Number(project.qcPercentage) : 7,

        // MECH Shop progress
        mechShop: project.mechShop !== undefined && project.mechShop !== null ? Number(project.mechShop) : 0,

        // Phase visibility controls
        showFabPhase: project.showFabPhase !== undefined ? project.showFabPhase : true,
        showPaintPhase: project.showPaintPhase !== undefined ? project.showPaintPhase : true,
        showProductionPhase: project.showProductionPhase !== undefined ? project.showProductionPhase : true,
        showItPhase: project.showItPhase !== undefined ? project.showItPhase : true,
        showNtcPhase: project.showNtcPhase !== undefined ? project.showNtcPhase : true,
        showQcPhase: project.showQcPhase !== undefined ? project.showQcPhase : true,

        // New field with calculated days
        poDroppedToDeliveryDays: calculatedDays,

        // Dates - TIMEZONE FIX: Parse dates safely to prevent day-before display issues
        contractDate: project.contractDate ? (() => {
          // Parse date in local timezone to avoid UTC conversion shifting the day
          const [year, month, day] = project.contractDate.split('-').map(Number);
          return new Date(year, month - 1, day); // month is 0-indexed
        })() : undefined,
        poDroppedDate: project.poDroppedDate ? (() => {
          const [year, month, day] = project.poDroppedDate.split('-').map(Number);
          return new Date(year, month - 1, day);
        })() : project.startDate ? (() => {
          const [year, month, day] = project.startDate.split('-').map(Number);
          return new Date(year, month - 1, day);
        })() : undefined,
        startDate: project.startDate ? (() => {
          const [year, month, day] = project.startDate.split('-').map(Number);
          return new Date(year, month - 1, day);
        })() : undefined,
        estimatedCompletionDate: project.estimatedCompletionDate ? (() => {
          const [year, month, day] = project.estimatedCompletionDate.split('-').map(Number);
          return new Date(year, month - 1, day);
        })() : undefined,
        actualCompletionDate: project.actualCompletionDate ? (() => {
          const [year, month, day] = project.actualCompletionDate.split('-').map(Number);
          return new Date(year, month - 1, day);
        })() : undefined,
        chassisETA: project.chassisETA ? (() => {
          const [year, month, day] = project.chassisETA.split('-').map(Number);
          return new Date(year, month - 1, day);
        })() : undefined,
        fabricationStart: project.fabricationStart ? (() => {
          const [year, month, day] = project.fabricationStart.split('-').map(Number);
          return new Date(year, month - 1, day);
        })() : undefined,
        assemblyStart: project.assemblyStart ? (() => {
          const [year, month, day] = project.assemblyStart.split('-').map(Number);
          return new Date(year, month - 1, day);
        })() : undefined,
        wrapDate: project.wrapDate ? (() => {
          const [year, month, day] = project.wrapDate.split('-').map(Number);
          return new Date(year, month - 1, day);
        })() : undefined,
        ntcTestingDate: project.ntcTestingDate ? (() => {
          const [year, month, day] = project.ntcTestingDate.split('-').map(Number);
          return new Date(year, month - 1, day);
        })() : undefined,
        qcStartDate: project.qcStartDate ? (() => {
          const [year, month, day] = project.qcStartDate.split('-').map(Number);
          return new Date(year, month - 1, day);
        })() : undefined,
        executiveReviewDate: project.executiveReviewDate ? (() => {
          const [year, month, day] = project.executiveReviewDate.split('-').map(Number);
          return new Date(year, month - 1, day);
        })() : undefined,
        shipDate: project.shipDate ? (() => {
          const [year, month, day] = project.shipDate.split('-').map(Number);
          return new Date(year, month - 1, day);
        })() : undefined,
        deliveryDate: project.deliveryDate ? (() => {
          const [year, month, day] = project.deliveryDate.split('-').map(Number);
          return new Date(year, month - 1, day);
        })() : undefined,
        mechShop: project.mechShop ? (() => {
          const [year, month, day] = project.mechShop.split('-').map(Number);
          return new Date(year, month - 1, day);
        })() : undefined,

        // Project details
        percentComplete: project.percentComplete ? Number(project.percentComplete) : 0,
        dpasRating: project.dpasRating || '',
        stretchShortenGears: project.stretchShortenGears || '',
        lltsOrdered: project.lltsOrdered || false,
        qcDays: project.qcDays || undefined,

        // Design assignments
        meAssigned: project.meAssigned || '',
        meDesignOrdersPercent: project.meDesignOrdersPercent ? Number(project.meDesignOrdersPercent) : undefined,
        eeAssigned: project.eeAssigned || '',
        eeDesignOrdersPercent: project.eeDesignOrdersPercent ? Number(project.eeDesignOrdersPercent) : undefined,
        iteAssigned: project.iteAssigned || '',
        itDesignOrdersPercent: project.itDesignOrdersPercent ? Number(project.itDesignOrdersPercent) : undefined,
        ntcDesignOrdersPercent: project.ntcDesignOrdersPercent ? Number(project.ntcDesignOrdersPercent) : undefined,

        // Status and notes
        status: project.status || 'active',
        priority: project.priority || 'medium',
        category: project.category || '',
        hasBillingMilestones: project.hasBillingMilestones || false,
        notes: project.notes || '',
        isSalesEstimate: project.isSalesEstimate || false,
      });
    }
  }, [project, form]);

  // Calculate total percentage and check for warnings
  const calculateTotalPercentage = () => {
    const fabricationPercent = form.watch('fabricationPercent') || 0;
    const paintPercent = form.watch('paintPercent') || 0;
    const assemblyPercent = form.watch('assemblyPercent') || 0;
    const itPercent = form.watch('itPercent') || 0;
    const ntcTestingPercent = form.watch('ntcTestingPercent') || 0;
    const qcPercent = form.watch('qcPercent') || 0;

    const total = fabricationPercent + paintPercent + assemblyPercent + 
                  itPercent + ntcTestingPercent + qcPercent;

    setTotalPercentage(total);
    return total;
  };

  // Function to calculate redistributed percentages when phases are hidden
  const getRedistributedPercentages = () => {
    // Get current visibility settings
    const showFab = form.watch('showFabPhase');
    const showPaint = form.watch('showPaintPhase');
    const showProduction = form.watch('showProductionPhase');
    const showIt = form.watch('showItPhase');
    const showNtc = form.watch('showNtcPhase');
    const showQc = form.watch('showQcPhase');

    // Get original percentages
    const originalFabPercent = form.watch('fabricationPercent') || 0;
    const originalPaintPercent = form.watch('paintPercent') || 0;
    const originalAssemblyPercent = form.watch('assemblyPercent') || 0;
    const originalItPercent = form.watch('itPercent') || 0;
    const originalNtcPercent = form.watch('ntcTestingPercent') || 0;
    const originalQcPercent = form.watch('qcPercent') || 0;

    // Check if all phases are visible - if so, return original values without redistribution
    const allPhasesVisible = showFab && showPaint && showProduction && showIt && showNtc && showQc;

    if (allPhasesVisible) {
      return {
        fabricationPercent: originalFabPercent,
        paintPercent: originalPaintPercent,
        assemblyPercent: originalAssemblyPercent,
        itPercent: originalItPercent,
        ntcTestingPercent: originalNtcPercent,
        qcPercent: originalQcPercent
      };
    }

    // Calculate sum of visible phase percentages
    let visibleSum = 0;
    if (showFab) visibleSum += originalFabPercent;
    if (showPaint) visibleSum += originalPaintPercent;
    if (showProduction) visibleSum += originalAssemblyPercent;
    if (showIt) visibleSum += originalItPercent;
    if (showNtc) visibleSum += originalNtcPercent;
    if (showQc) visibleSum += originalQcPercent;

    // If no phases are visible or sum is 0, return zeros
    if (visibleSum === 0) {
      return {
        fabricationPercent: 0,
        paintPercent: 0,
        assemblyPercent: 0,
        itPercent: 0,
        ntcTestingPercent: 0,
        qcPercent: 0
      };
    }

    // Calculate redistribution factor only when phases are hidden
    const redistributionFactor = 100 / visibleSum;

    // Return redistributed percentages (0 for hidden phases)
    return {
      fabricationPercent: showFab ? Math.round(originalFabPercent * redistributionFactor * 100) / 100 : 0,
      paintPercent: showPaint ? Math.round(originalPaintPercent * redistributionFactor * 100) / 100 : 0,
      assemblyPercent: showProduction ? Math.round(originalAssemblyPercent * redistributionFactor * 100) / 100 : 0,
      itPercent: showIt ? Math.round(originalItPercent * redistributionFactor * 100) / 100 : 0,
      ntcTestingPercent: showNtc ? Math.round(originalNtcPercent * redistributionFactor * 100) / 100 : 0,
      qcPercent: showQc ? Math.round(originalQcPercent * redistributionFactor * 100) / 100 : 0
    };
  };

  // Watch for changes in percentage fields and phase visibility
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (['fabricationPercent', 'paintPercent', 'assemblyPercent', 
           'itPercent', 'ntcTestingPercent', 'qcPercent',
           'showFabPhase', 'showPaintPhase', 'showProductionPhase', 
           'showItPhase', 'showNtcPhase', 'showQcPhase'].includes(name as string)) {
        calculateTotalPercentage();
      }
    });

    return () => subscription.unsubscribe();
  }, [form]);

  // Mutations for updating and deleting projects
  const updateMutation = useMutation({
    mutationFn: async (data: ProjectFormValues) => {
      // Convert dates to simple YYYY-MM-DD format to prevent timezone issues
      const fixedData = { ...data };

      // Process all date fields to send as simple date strings
      Object.keys(fixedData).forEach(key => {
        const value = (fixedData as any)[key];
        if (value instanceof Date) {
          // Convert to YYYY-MM-DD format without timezone conversion
          const year = value.getFullYear();
          const month = String(value.getMonth() + 1).padStart(2, '0');
          const day = String(value.getDate()).padStart(2, '0');
          (fixedData as any)[key] = `${year}-${month}-${day}`;
        } else if (typeof value === 'string' && (value === 'PENDING' || value === 'N/A')) {
          // Keep text values as-is
          (fixedData as any)[key] = value;
        }
      });

      // Apply redistribution logic when saving to ensure stored percentages match effective percentages
      const redistributedPercentages = getRedistributedPercentages();

      // Map form field names to database field names using redistributed values
      fixedData.fabPercentage = redistributedPercentages.fabricationPercent;
      fixedData.paintPercentage = redistributedPercentages.paintPercent;
      fixedData.productionPercentage = redistributedPercentages.assemblyPercent;
      fixedData.itPercentage = redistributedPercentages.itPercent;
      fixedData.ntcPercentage = redistributedPercentages.ntcTestingPercent;
      fixedData.qcPercentage = redistributedPercentages.qcPercent;

      // Phase visibility mapping (these names already match database fields)
      fixedData.showFabPhase = fixedData.showFabPhase;
      fixedData.showPaintPhase = fixedData.showPaintPhase;
      fixedData.showProductionPhase = fixedData.showProductionPhase;
      fixedData.showItPhase = fixedData.showItPhase;
      fixedData.showNtcPhase = fixedData.showNtcPhase;
      fixedData.showQcPhase = fixedData.showQcPhase;

      // Remove the form field names to avoid conflicts
      delete (fixedData as any).fabricationPercent;
      delete (fixedData as any).paintPercent;
      delete (fixedData as any).assemblyPercent;
      delete (fixedData as any).itPercent;
      delete (fixedData as any).ntcTestingPercent;
      delete (fixedData as any).qcPercent;

      const res = await apiRequest('PUT', `/api/projects/${projectId}`, fixedData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: [`/api/projects/${projectId}`]});
      queryClient.invalidateQueries({queryKey: ['/api/projects']});
      queryClient.invalidateQueries({queryKey: ['/api/manufacturing-schedules']});
      toast({
        title: 'Project updated',
        description: 'The project has been updated successfully',
      });
      navigate(`/project/${projectId}`);
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating project',
        description: error.message || 'Failed to update project',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      setDeletingProject(true);
      const res = await apiRequest('DELETE', `/api/projects/${projectId}`);
      return res.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['/api/projects']});
      toast({
        title: 'Project deleted',
        description: 'The project has been deleted successfully',
      });
      navigate('/projects');
    },
    onError: (error: any) => {
      setDeletingProject(false);
      toast({
        title: 'Error deleting project',
        description: error.message || 'Failed to delete project',
        variant: 'destructive',
      });
    },
  });

  function onSubmit(data: ProjectFormValues) {
    console.log('SAVE BUTTON CLICKED - Form submitted with data:', data);

    // Check if total percentage exceeds 100%
    const total = calculateTotalPercentage();
    console.log('Total percentage:', total);
    if (total > 100) {
      console.log('Showing percentage warning dialog');
      setIsPercentageWarningOpen(true);
      return;
    }

    // Check if this is a scheduled project and if ship date has been changed
    if (isProjectScheduled && data.shipDate && originalShipDate && 
        data.shipDate.getTime() !== originalShipDate.getTime()) {
      console.log('Showing ship date warning dialog');
      // Store the form data to use after confirmation
      setPendingFormData(data);
      // Show warning dialog about ship date changes affecting the manufacturing schedule
      setIsShipDateWarningOpen(true);
      return;
    }

    // Otherwise proceed with normal update
    console.log('Proceeding with mutation');
    updateMutation.mutate(data);
  }

  function handlePercentageWarningConfirm() {
    setIsPercentageWarningOpen(false);
    updateMutation.mutate(form.getValues());
  }

  function handleShipDateWarningConfirm() {
    setIsShipDateWarningOpen(false);
    // Use the stored pending form data for the update
    if (pendingFormData) {
      updateMutation.mutate(pendingFormData);
      setPendingFormData(null);
    }
  }

  function handleDelete() {
    deleteMutation.mutate();
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-900/20 border border-red-800 text-red-300 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Error loading project</h3>
          <p>{(error as Error).message || 'Failed to load project details'}</p>
        </div>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/projects')}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate(`/project/${projectId}`)}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              Edit Project {project ? `- ${project.projectNumber}: ${project.name}` : ''}
            </h1>
            <p className="text-gray-400 text-sm">Update project details, timeline, and settings</p>
          </div>
        </div>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">Delete Project</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the project
                and all associated data including milestones and manufacturing schedules.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700"
                disabled={deletingProject}
              >
                {deletingProject ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Project'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
          console.log('FORM VALIDATION ERRORS:', errors);
          console.log('Form is invalid, cannot submit');
        })} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-darkCard border border-gray-800 mb-6">
              <TabsTrigger value="general">General Information</TabsTrigger>
              <TabsTrigger value="details">Project Details</TabsTrigger>
              <TabsTrigger value="timeline">Timeline & Schedule</TabsTrigger>
              <TabsTrigger value="milestones">Milestone Icons</TabsTrigger>
              <TabsTrigger value="notes">Notes & Documentation</TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <Card>
                <CardHeader>
                  <CardTitle>General Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="projectNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter project number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter project name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="pmOwner"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project Manager</FormLabel>
                          <FormControl>
                            <Input placeholder="Assigned PM" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="client"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client</FormLabel>
                          <FormControl>
                            <Input placeholder="Client name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter project description"
                            className="min-h-[100px]"
                            {...field}
                          />
```python
                          </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="details">
              <Card>
                <CardHeader>
                  <CardTitle>Project Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="totalHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Manufacturing Hours</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min={0}
                              step={1}
                              placeholder="Total hours required" 
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormDescription>
                            Total hours required for manufacturing (used for scheduling)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-between items-center mt-4 mb-2">
                      <h3 className="text-md font-medium">Department Allocation Percentages</h3>
                      <div className="flex gap-2">
                        <div className={`px-3 py-1 rounded-md text-sm font-medium flex gap-1 items-center ${
                          totalPercentage > 100 
                            ? 'bg-red-950/30 text-red-300 border border-red-800' 
                            : totalPercentage === 100 
                              ? 'bg-green-950/30 text-green-300 border border-green-800'
                              : 'bg-yellow-950/30 text-yellow-300 border border-yellow-800'
                        }`}>
                          Original: <span className="font-bold">{totalPercentage}%</span>
                        </div>
                        <div className="px-3 py-1 rounded-md text-sm font-medium bg-blue-950/30 text-blue-300 border border-blue-800">
                          Redistributed: <span className="font-bold">
                            {(() => {
                              const redistributed = getRedistributedPercentages();
                              const redistributedTotal = redistributed.fabricationPercent + redistributed.paintPercent + 
                                redistributed.assemblyPercent + redistributed.itPercent + 
                                redistributed.ntcTestingPercent + redistributed.qcPercent;
                              return redistributedTotal.toFixed(1);
                            })()}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4 p-3 bg-blue-950/20 border border-blue-800 rounded-md">
                      <h4 className="text-sm font-medium text-blue-300 mb-2">Effective Percentages (After Phase Redistribution):</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                        {(() => {
                          const redistributed = getRedistributedPercentages();
                          return (
                            <>
                              <div className="flex justify-between">
                                <span>Fabrication:</span>
                                <span className={`font-medium ${form.watch('showFabPhase') ? 'text-blue-300' : 'text-gray-500'}`}>
                                  {redistributed.fabricationPercent.toFixed(1)}%
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Paint:</span>
                                <span className={`font-medium ${form.watch('showPaintPhase') ? 'text-blue-300' : 'text-gray-500'}`}>
                                  {redistributed.paintPercent.toFixed(1)}%
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Assembly:</span>
                                <span className={`font-medium ${form.watch('showProductionPhase') ? 'text-blue-300' : 'text-gray-500'}`}>
                                  {redistributed.assemblyPercent.toFixed(1)}%
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>IT:</span>
                                <span className={`font-medium ${form.watch('showItPhase') ? 'text-blue-300' : 'text-gray-500'}`}>
                                  {redistributed.itPercent.toFixed(1)}%
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>NTC:</span>
                                <span className={`font-medium ${form.watch('showNtcPhase') ? 'text-blue-300' : 'text-gray-500'}`}>
                                  {redistributed.ntcTestingPercent.toFixed(1)}%
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>QC:</span>
                                <span className={`font-medium ${form.watch('showQcPhase') ? 'text-blue-300' : 'text-gray-500'}`}>
                                  {redistributed.qcPercent.toFixed(1)}%
                                </span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="fabricationPercent"
                        render={({ field }) => (
                          <FormItem className={!form.watch('showFabPhase') ? 'opacity-50' : ''}>
                            <FormLabel className="flex items-center gap-2">
                              Fabrication %
                              {!form.watch('showFabPhase') && (
                                <span className="text-xs text-red-400 bg-red-950/30 px-1 rounded">HIDDEN</span>
                              )}
                            </FormLabel>
                            <div className="grid grid-cols-[1fr_50px] gap-2">
                              <FormControl>
                                <Slider 
                                  value={[field.value || 27]} 
                                  min={0} 
                                  max={100} 
                                  step={1}
                                  onValueChange={(vals) => field.onChange(vals[0])}
                                  disabled={!form.watch('showFabPhase')}
                                />
                              </FormControl>
                              <Input 
                                type="number" 
                                value={field.value || 27}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  if (!isNaN(val) && val >= 0 && val <= 100) {
                                    field.onChange(val);
                                  }
                                }} 
                                className="w-[60px]"
                                disabled={!form.watch('showFabPhase')}
                              />
                            </div>
                            <FormDescription className="text-xs">
                              {form.watch('showFabPhase') 
                                ? `Fabrication phase percentage (Effective: ${getRedistributedPercentages().fabricationPercent.toFixed(1)}%)`
                                : 'Phase is hidden - will not appear in schedule'
                              }
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="paintPercent"
                        render={({ field }) => (
                          <FormItem className={!form.watch('showPaintPhase') ? 'opacity-50' : ''}>
                            <FormLabel className="flex items-center gap-2">
                              Paint %
                              {!form.watch('showPaintPhase') && (
                                <span className="text-xs text-red-400 bg-red-950/30 px-1 rounded">HIDDEN</span>
                              )}
                            </FormLabel>
                            <div className="grid grid-cols-[1fr_50px] gap-2">
                              <FormControl>
                                <Slider 
                                  value={[field.value || 7]} 
                                  min={0} 
                                  max={100} 
                                  step={1}
                                  onValueChange={(vals) => field.onChange(vals[0])}
                                  disabled={!form.watch('showPaintPhase')}
                                />
                              </FormControl>
                              <Input 
                                type="number" 
                                value={field.value || 7}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  if (!isNaN(val) && val >= 0 && val <= 100) {
                                    field.onChange(val);
                                  }
                                }} 
                                className="w-[60px]"
                                disabled={!form.watch('showPaintPhase')}
                              />
                            </div>
                            <FormDescription className="text-xs">
                              {form.watch('showPaintPhase') 
                                ? `Paint phase percentage (Effective: ${getRedistributedPercentages().paintPercent.toFixed(1)}%)`
                                : 'Phase is hidden - will not appear in schedule'
                              }
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="assemblyPercent"
                        render={({ field }) => (
                          <FormItem className={!form.watch('showProductionPhase') ? 'opacity-50' : ''}>
                            <FormLabel className="flex items-center gap-2">
                              Assembly %
                              {!form.watch('showProductionPhase') && (
                                <span className="text-xs text-red-400 bg-red-950/30 px-1 rounded">HIDDEN</span>
                              )}
                            </FormLabel>
                            <div className="grid grid-cols-[1fr_50px] gap-2">
                              <FormControl>
                                <Slider 
                                  value={[field.value || 45]} 
                                  min={0} 
                                  max={100} 
                                  step={1}
                                  onValueChange={(vals) => field.onChange(vals[0])}
                                  disabled={!form.watch('showProductionPhase')}
                                />
                              </FormControl>
                              <Input 
                                type="number" 
                                value={field.value || 45}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  if (!isNaN(val) && val >= 0 && val <= 100) {
                                    field.onChange(val);
                                  }
                                }} 
                                className="w-[60px]"
                                disabled={!form.watch('showProductionPhase')}
                              />
                            </div>
                            <FormDescription className="text-xs">
                              {form.watch('showProductionPhase') 
                                ? `Assembly phase percentage (Effective: ${getRedistributedPercentages().assemblyPercent.toFixed(1)}%)`
                                : 'Phase is hidden - will not appear in schedule'
                              }
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="itPercent"
                        render={({ field }) => (
                          <FormItem className={!form.watch('showItPhase') ? 'opacity-50' : ''}>
                            <FormLabel className="flex items-center gap-2">
                              IT %
                              {!form.watch('showItPhase') && (
                                <span className="text-xs text-red-400 bg-red-950/30 px-1 rounded">HIDDEN</span>
                              )}
                            </FormLabel>
                            <div className="grid grid-cols-[1fr_50px] gap-2">
                              <FormControl>
                                <Slider 
                                  value={[field.value || 7]} 
                                  min={0} 
                                  max={100} 
                                  step={1}
                                  onValueChange={(vals) => field.onChange(vals[0])}
                                  disabled={!form.watch('showItPhase')}
                                />
                              </FormControl>
                              <Input 
                                type="number" 
                                value={field.value || 7}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  if (!isNaN(val) && val >= 0 && val <= 100) {
                                    field.onChange(val);
                                  }
                                }} 
                                className="w-[60px]"
                                disabled={!form.watch('showItPhase')}
                              />
                            </div>
                            <FormDescription className="text-xs">
                              {form.watch('showItPhase') 
                                ? `IT phase percentage (Effective: ${getRedistributedPercentages().itPercent.toFixed(1)}%)`
                                : 'Phase is hidden - will not appear in schedule'
                              }
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="ntcTestingPercent"
                        render={({ field }) => (
                          <FormItem className={!form.watch('showNtcPhase') ? 'opacity-50' : ''}>
                            <FormLabel className="flex items-center gap-2">
                              NTC Testing %
                              {!form.watch('showNtcPhase') && (
                                <span className="text-xs text-red-400 bg-red-950/30 px-1 rounded">HIDDEN</span>
                              )}
                            </FormLabel>
                            <div className="grid grid-cols-[1fr_50px] gap-2">
                              <FormControl>
                                <Slider 
                                  value={[field.value || 7]} 
                                  min={0} 
                                  max={100} 
                                  step={1}
                                  onValueChange={(vals) => field.onChange(vals[0])}
                                  disabled={!form.watch('showNtcPhase')}
                                />
                              </FormControl>
                              <Input 
                                type="number" 
                                value={field.value || 7}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  if (!isNaN(val) && val >= 0 && val <= 100) {
                                    field.onChange(val);
                                  }
                                }} 
                                className="w-[60px]"
                                disabled={!form.watch('showNtcPhase')}
                              />
                            </div>
                            <FormDescription className="text-xs">
                              {form.watch('showNtcPhase') 
                                ? `NTC Testing phase percentage (Effective: ${getRedistributedPercentages().ntcTestingPercent.toFixed(1)}%)`
                                : 'Phase is hidden - will not appear in schedule'
                              }
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="qcPercent"
                        render={({ field }) => (
                          <FormItem className={!form.watch('showQcPhase') ? 'opacity-50' : ''}>
                            <FormLabel className="flex items-center gap-2">
                              QC %
                              {!form.watch('showQcPhase') && (
                                <span className="text-xs text-red-400 bg-red-950/30 px-1 rounded">HIDDEN</span>
                              )}
                            </FormLabel>
                            <div className="grid grid-cols-[1fr_50px] gap-2">
                              <FormControl>
                                <Slider 
                                  value={[field.value || 7]} 
                                  min={0} 
                                  max={100} 
                                  step={1}
                                  onValueChange={(vals) => field.onChange(vals[0])}
                                  disabled={!form.watch('showQcPhase')}
                                />
                              </FormControl>
                              <Input 
                                type="number" 
                                value={field.value || 7}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  if (!isNaN(val) && val >= 0 && val <= 100) {
                                    field.onChange(val);
                                  }
                                }} 
                                className="w-[60px]"
                                disabled={!form.watch('showQcPhase')}
                              />
                            </div>
                            <FormDescription className="text-xs">
                              {form.watch('showQcPhase') 
                                ? `QC phase percentage (Effective: ${getRedistributedPercentages().qcPercent.toFixed(1)}%)`
                                : 'Phase is hidden - will not appear in schedule'
                              }
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="on-hold">On Hold</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="delayed">Delayed</SelectItem>
                              <SelectItem value="critical">Critical</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select priority" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select location" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="CFALLS">CFALLS</SelectItem>
                              <SelectItem value="LIBBY">LIBBY</SelectItem>
                              <SelectItem value="FSW">FSW</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="team"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Team</FormLabel>
                          <FormControl>
                            <Input placeholder="Team name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="percentComplete"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Percent Complete</FormLabel>
                          <div className="grid grid-cols-[1fr_50px] gap-2">
                            <FormControl>
                              <Slider 
                                value={[field.value || 0]} 
                                min={0} 
                                max={100} 
                                step={1}
                                onValueChange={(vals) => field.onChange(vals[0])}
                              />
                            </FormControl>
                            <Input 
                              type="number" 
                              value={field.value || 0}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (!isNaN(val) && val >= 0 && val <= 100) {
                                  field.onChange(val);
                                }
                              }} 
                              className="w-[60px]"
                            />
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator className="my-4" />
                  <h3 className="text-md font-medium mb-2">Phase Visibility Controls</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Toggle which phases should be displayed in the manufacturing bay schedule for this project.
                    Disabled phases will not appear in the project bar and their percentages will be redistributed.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    <FormField
                      control={form.control}
                      name="showFabPhase"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm font-medium">Fabrication Phase</FormLabel>
                            <FormDescription className="text-xs">Show FAB phase in schedule</FormDescription>
                          </div>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="showPaintPhase"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm font-medium">Paint Phase</FormLabel>
                            <FormDescription className="text-xs">Show PAINT phase in schedule</FormDescription>
                          </div>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="showProductionPhase"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm font-medium">Production Phase</FormLabel>
                            <FormDescription className="text-xs">Show PROD phase in schedule</FormDescription>
                          </div>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="showItPhase"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm font-medium">IT Phase</FormLabel>
                            <FormDescription className="text-xs">Show IT phase in schedule</FormDescription>
                          </div>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="showNtcPhase"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm font-medium">NTC Phase</FormLabel>
                            <FormDescription className="text-xs">Show NTC phase in schedule</FormDescription>
                          </div>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="showQcPhase"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm font-medium">QC Phase</FormLabel>
                            <FormDescription className="text-xs">Show QC phase in schedule</FormDescription>
                          </div>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator className="my-4" />
                  <h3 className="text-md font-medium mb-2">Design & Manufacturing Details</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <FormField
                      control={form.control}
                      name="dpasRating"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>DPAS Rating</FormLabel>
                          <FormControl>
                            <Input placeholder="DPAS Rating" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="stretchShortenGears"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stretch/Shorten Gears</FormLabel>
                          <FormControl>
                            <Input placeholder="Stretch/Shorten Gears" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lltsOrdered"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              LLTs Ordered
                            </FormLabel>
                            <FormDescription>
                              Check if Long Lead Time items have been ordered
                            </FormDescription>
                          </div>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="hasBillingMilestones"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Has Billing Milestones
                            </FormLabel>
                            <FormDescription>
                              Check if project has defined billing milestones
                            </FormDescription>
                          </div>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator className="my-4" />
                  <h3 className="text-md font-medium mb-2">Design Assignments & Progress</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="meAssigned"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ME Assigned</FormLabel>
                            <FormControl>
                              <Input placeholder="Mechanical Engineer" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="meDesignOrdersPercent"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ME Design Orders % Complete</FormLabel>
                            <div className="grid grid-cols-[1fr_50px] gap-2">
                              <FormControl>
                                <Slider 
                                  value={[field.value || 0]} 
                                  min={0} 
                                  max={100} 
                                  step={1}
                                  onValueChange={(vals) => field.onChange(vals[0])}
                                />
                              </FormControl>
                              <Input 
                                type="number" 
                                value={field.value || 0}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  if (!isNaN(val) && val >= 0 && val <= 100) {
                                    field.onChange(val);
                                  }
                                }} 
                                className="w-[60px]"
                              />
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="eeAssigned"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>EE Assigned</FormLabel>
                            <FormControl>
                              <Input placeholder="Electrical Engineer" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="eeDesignOrdersPercent"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>EE Design Orders % Complete</FormLabel>
                            <div className="grid grid-cols-[1fr_50px] gap-2">
                              <FormControl>
                                <Slider 
                                  value={[field.value || 0]} 
                                  min={0} 
                                  max={100} 
                                  step={1}
                                  onValueChange={(vals) => field.onChange(vals[0])}
                                />
                              </FormControl>
                              <Input 
                                type="number" 
                                value={field.value || 0}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  if (!isNaN(val) && val >= 0 && val <= 100) {
                                    field.onChange(val);
                                  }
                                }} 
                                className="w-[60px]"
                              />
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="iteAssigned"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ITE Assigned</FormLabel>
                            <FormControl>
                              <Input placeholder="IT Engineer" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="itDesignOrdersPercent"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>IT Design Orders % Complete</FormLabel>
                            <div className="grid grid-cols-[1fr_50px] gap-2">
                              <FormControl>
                                <Slider 
                                  value={[field.value || 0]} 
                                  min={0} 
                                  max={100} 
                                  step={1}
                                  onValueChange={(vals) => field.onChange(vals[0])}
                                />
                              </FormControl>
                              <Input 
                                type="number" 
                                value={field.value || 0}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  if (!isNaN(val) && val >= 0 && val <= 100) {
                                    field.onChange(val);
                                  }
                                }} 
                                className="w-[60px]"
                              />
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="ntcDesignOrdersPercent"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>NTC Design Orders % Complete</FormLabel>
                            <div className="grid grid-cols-[1fr_50px] gap-2">
                              <FormControl>
                                <Slider 
                                  value={[field.value || 0]} 
                                  min={0} 
                                  max={100} 
                                  step={1}
                                  onValueChange={(vals) => field.onChange(vals[0])}
                                />
                              </FormControl>
                              <Input 
                                type="number" 
                                value={field.value || 0}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  if (!isNaN(val) && val >= 0 && val <= 100) {
                                    field.onChange(val);
                                  }
                                }} 
                                className="w-[60px]"
                              />
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>


                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="timeline">
              <Card>
                <CardHeader>
                  <CardTitle>Timeline & Schedule</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Essential project dates only */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="poDroppedDate"
                      render={({ field }) => (
                        <EnhancedDateField
                          label="PO Dropped Date"
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select date or status..."
                          description="The date when the Purchase Order was received"
                          fieldName="poDroppedDate"
                        />
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contractDate"
                      render={({ field }) => (
                        <EnhancedDateField
                          label="Contract Date *"
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select date or status..."
                          description="The contract deliverydate (must be manually entered)"
                          fieldName="contractDate"
                        />
                      )}
                    />
                  </div>

                  {/* Production Timeline Dates */}
                  <h3 className="text-md font-medium mb-2">Production Timeline</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    <FormField
                      control={form.control}
                      name="chassisETA"
                      render={({ field }) => (
                        <EnhancedDateField
                          label="Chassis ETA"
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select date or status..."
                          fieldName="chassisETA"
                          textOverride={project?.chassisETAText}
                        />
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="mechShop"
                      render={({ field }) => (
                        <EnhancedDateField
                          label="MECH Shop Date"
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select date or status..."
                          fieldName="mechShop"
                          textOverride={project?.mechShopText}
                        />
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="fabricationStart"
                      render={({ field }) => (
                        <EnhancedDateField
                          label="Fabrication Start Date"
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select date or status..."
                          fieldName="fabricationStart"
                          textOverride={project?.fabricationStartText}
                        />
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="assemblyStart"
                      render={({ field }) => (
                        <EnhancedDateField
                          label="Assembly Start Date"
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select date or status..."
                        />
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ntcTestingDate"
                      render={({ field }) => (
                        <EnhancedDateField
                          label="NTC Testing Date"
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select date or status..."
                          fieldName="ntcTestingDate"
                          textOverride={project?.ntcTestingDateText}
                        />
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="wrapDate"
                      render={({ field }) => (
                        <EnhancedDateField
                          label="Wrap Date"
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select date or status..."
                          fieldName="wrapDate"
                          textOverride={project?.wrapDateText}
                        />
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="qcStartDate"
                      render={({ field }) => (
                        <EnhancedDateField
                          label="QC Start Date"
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select date or status..."
                        />
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="executiveReviewDate"
                      render={({ field }) => (
                        <EnhancedDateField
                          label="Executive Review Date"
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select date or status..."
                          fieldName="executiveReviewDate"
                          textOverride={project?.executiveReviewDateText}
                        />
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="shipDate"
                      render={({ field }) => (
                        <EnhancedDateField
                          label="Ship Date"
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select date or status..."
                        />
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="deliveryDate"
                      render={({ field }) => (
                        <EnhancedDateField
                          label="Delivery Date"
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select date or status..."
                          fieldName="deliveryDate"
                          textOverride={project?.deliveryDateText}
                        />
                      )}
                    />
                  </div>

                  {/* MECH Shop Progress */}
                  <h3 className="text-md font-medium mb-2">Manufacturing Progress</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="mechShop"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>MECH Shop Progress (%)</FormLabel>
                          <div className="grid grid-cols-[1fr_80px] gap-2">
                            <FormControl>
                              <Slider 
                                value={[field.value || 0]} 
                                min={0} 
                                max={100} 
                                step={1}
                                onValueChange={(vals) => field.onChange(vals[0])}
                              />
                            </FormControl>
                            <Input 
                              type="number" 
                              value={field.value || 0}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (!isNaN(val) && val >= 0 && val <= 100) {
                                  field.onChange(val);
                                }
                              }} 
                              className="w-[80px]"
                            />
                          </div>
                          <FormDescription>
                            Progress percentage for MECH Shop phase
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="milestones">
              <Card>
                <CardHeader>
                  <CardTitle>Milestone Icons</CardTitle>
                </CardHeader>
                <CardContent>
                  <ProjectMilestoneIconsManager projectId={projectId} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes">
              <Card>
                <CardHeader>
                  <CardTitle>Notes & Documentation</CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter project notes, comments, or additional documentation"
                            className="min-h-[200px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isSalesEstimate"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 mt-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Sales Estimate Proposal</FormLabel>
                          <FormDescription>
                            Mark this project as a sales estimate proposal only
                          </FormDescription>
                        </div>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/project/${projectId}`)}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>

          {/* Percentage Warning Alert Dialog */}
          <AlertDialog open={isPercentageWarningOpen} onOpenChange={setIsPercentageWarningOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Department Allocation Warning</AlertDialogTitle>
                <AlertDialogDescription>
                  The total of your department percentages exceeds 100% ({totalPercentage}%). 
                  This may cause scheduling and resource allocation issues.
                  <div className="mt-2 p-2 bg-yellow-950/30 border border-yellow-800 rounded-md">
                    <strong>Department Allocations:</strong>
                    <ul className="mt-1 space-y-1 text-sm">
                      <li>Fabrication: {form.watch('fabricationPercent') || 0}%</li>
                      <li>Paint: {form.watch('paintPercent') || 0}%</li>
                      <li>Assembly: {form.watch('assemblyPercent') || 0}%</li>
                      <li>IT: {form.watch('itPercent') || 0}%</li>
                      <li>NTC Testing: {form.watch('ntcTestingPercent') || 0}%</li>
                      <li>QC: {form.watch('qcPercent') || 0}%</li>
                      <li className="font-bold text-yellow-300">Total: {totalPercentage}%</li>
                    </ul>
                  </div>
                  <p className="mt-3">
                    Are you sure you want to proceed with these percentages?
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Go Back and Adjust</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handlePercentageWarningConfirm}
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  Save Anyway
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Ship Date Warning Alert Dialog */}
          <AlertDialog open={isShipDateWarningOpen} onOpenChange={setIsShipDateWarningOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  <div className="flex items-center">
                    <AlertTriangle className="h-5 w-5 text-amber-400 mr-2" />
                    Warning: Manufacturing Schedule Impact
                  </div>
                </AlertDialogTitle>
                <AlertDialogDescription>
                  <p className="mb-3">
                    This project is currently scheduled in a manufacturing bay. Changing the ship date 
                    will automatically update the end date in the manufacturing schedule.
                  </p>

                  <div className="mt-2 p-3 bg-amber-950/30 border border-amber-800 rounded-md">
                    <p className="text-amber-200 font-medium mb-1">Important:</p>
                    <p className="text-sm text-amber-100">
                      This change may affect other projects in the schedule and could create scheduling conflicts.
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="p-2 bg-gray-800/50 rounded-md">
                      <p className="text-sm font-medium text-gray-400">Original Ship Date:</p>
                      <p className="font-medium">
                        {originalShipDate ? format(originalShipDate, 'MMM d, yyyy') : 'None'}
                      </p>
                    </div>
                    <div className="p-2 bg-gray-800/50 rounded-md">
                      <p className="text-sm font-medium text-gray-400">New Ship Date:</p>
                      <p className="font-medium">
                        {form.watch('shipDate') ? format(form.watch('shipDate'), 'MMM d, yyyy') : 'None'}
                      </p>
                    </div>
                  </div>

                  <p className="mt-4">
                    Are you sure you want to continue with this change?
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleShipDateWarningConfirm}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  Update Ship Date
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </form>
      </Form>

    </div>
  );
}

export default ProjectEdit;