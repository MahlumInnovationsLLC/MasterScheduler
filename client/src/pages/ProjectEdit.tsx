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
import { Checkbox } from '@/components/ui/checkbox';
import { FormDescription } from '@/components/ui/form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { format, addDays } from 'date-fns';
import { cn, formatDate } from '@/lib/utils';
import { queryClient, apiRequest } from '@/lib/queryClient';
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
  
  // Dates
  contractDate: z.date().optional(),
  startDate: z.date().optional(), // This is Assembly Start Date
  poDroppedDate: z.date().optional(), // New field for PO Dropped Date
  estimatedCompletionDate: z.date().optional(),
  actualCompletionDate: z.date().optional(),
  chassisETA: z.date().optional(),
  fabricationStart: z.date().optional(),
  assemblyStart: z.date().optional(),
  wrapDate: z.date().optional(),
  ntcTestingDate: z.date().optional(),
  qcStartDate: z.date().optional(),
  executiveReviewDate: z.date().optional(),
  shipDate: z.date().optional(),
  deliveryDate: z.date().optional(),
  
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
  
  // Status and notes
  status: z.string(),
  priority: z.string().optional(),
  category: z.string().optional(),
  hasBillingMilestones: z.boolean().default(false),
  notes: z.string().optional(),
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
        
        // New field with calculated days
        poDroppedToDeliveryDays: calculatedDays,
        
        // Dates - parse carefully to avoid timezone issues
        contractDate: project.contractDate ? (() => {
          const [year, month, day] = project.contractDate.split('-');
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        })() : undefined,
        poDroppedDate: project.poDroppedDate ? (() => {
          const [year, month, day] = project.poDroppedDate.split('-');
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        })() : project.startDate ? (() => {
          const [year, month, day] = project.startDate.split('-');
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        })() : undefined,
        startDate: project.startDate ? (() => {
          const [year, month, day] = project.startDate.split('-');
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        })() : undefined,
        estimatedCompletionDate: project.estimatedCompletionDate ? (() => {
          const [year, month, day] = project.estimatedCompletionDate.split('-');
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        })() : undefined,
        actualCompletionDate: project.actualCompletionDate ? (() => {
          const [year, month, day] = project.actualCompletionDate.split('-');
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        })() : undefined,
        chassisETA: project.chassisETA ? (() => {
          const [year, month, day] = project.chassisETA.split('-');
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        })() : undefined,
        fabricationStart: project.fabricationStart ? (() => {
          const [year, month, day] = project.fabricationStart.split('-');
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        })() : undefined,
        assemblyStart: project.assemblyStart ? (() => {
          const [year, month, day] = project.assemblyStart.split('-');
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        })() : undefined,
        wrapDate: project.wrapDate ? (() => {
          const [year, month, day] = project.wrapDate.split('-');
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        })() : undefined,
        ntcTestingDate: project.ntcTestingDate ? (() => {
          const [year, month, day] = project.ntcTestingDate.split('-');
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        })() : undefined,
        qcStartDate: project.qcStartDate ? (() => {
          const [year, month, day] = project.qcStartDate.split('-');
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        })() : undefined,
        executiveReviewDate: project.executiveReviewDate ? (() => {
          const [year, month, day] = project.executiveReviewDate.split('-');
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        })() : undefined,
        shipDate: project.shipDate ? (() => {
          const [year, month, day] = project.shipDate.split('-');
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        })() : undefined,
        deliveryDate: project.deliveryDate ? (() => {
          const [year, month, day] = project.deliveryDate.split('-');
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
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
  
  // Watch for changes in percentage fields
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (['fabricationPercent', 'paintPercent', 'assemblyPercent', 
           'itPercent', 'ntcTestingPercent', 'qcPercent'].includes(name as string)) {
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
        if (fixedData[key] instanceof Date) {
          // Convert to YYYY-MM-DD format without timezone conversion
          const date = fixedData[key] as Date;
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          fixedData[key] = `${year}-${month}-${day}`;
        }
      });
      
      // Map form field names to database field names for department percentages
      fixedData.fabPercentage = fixedData.fabricationPercent;
      fixedData.paintPercentage = fixedData.paintPercent;
      fixedData.productionPercentage = fixedData.assemblyPercent;
      fixedData.itPercentage = fixedData.itPercent;
      fixedData.ntcPercentage = fixedData.ntcTestingPercent;
      fixedData.qcPercentage = fixedData.qcPercent;
      
      const res = await apiRequest('PUT', `/api/projects/${projectId}`, fixedData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: [`/api/projects/${projectId}`]});
      queryClient.invalidateQueries({queryKey: ['/api/projects']});
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
    // Check if total percentage exceeds 100%
    const total = calculateTotalPercentage();
    if (total > 100) {
      setIsPercentageWarningOpen(true);
      return;
    }
    
    // Check if this is a scheduled project and if ship date has been changed
    if (isProjectScheduled && data.shipDate && originalShipDate && 
        data.shipDate.getTime() !== originalShipDate.getTime()) {
      // Store the form data to use after confirmation
      setPendingFormData(data);
      // Show warning dialog about ship date changes affecting the manufacturing schedule
      setIsShipDateWarningOpen(true);
      return;
    }
    
    // Otherwise proceed with normal update
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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-darkCard border border-gray-800 mb-6">
              <TabsTrigger value="general">General Information</TabsTrigger>
              <TabsTrigger value="details">Project Details</TabsTrigger>
              <TabsTrigger value="timeline">Timeline & Schedule</TabsTrigger>
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
                      <div className={`px-3 py-1 rounded-md text-sm font-medium flex gap-1 items-center ${
                        totalPercentage > 100 
                          ? 'bg-red-950/30 text-red-300 border border-red-800' 
                          : totalPercentage === 100 
                            ? 'bg-green-950/30 text-green-300 border border-green-800'
                            : 'bg-yellow-950/30 text-yellow-300 border border-yellow-800'
                      }`}>
                        Total: <span className="font-bold">{totalPercentage}%</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="fabricationPercent"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fabrication %</FormLabel>
                            <div className="grid grid-cols-[1fr_50px] gap-2">
                              <FormControl>
                                <Slider 
                                  value={[field.value || 27]} 
                                  min={0} 
                                  max={100} 
                                  step={1}
                                  onValueChange={(vals) => field.onChange(vals[0])}
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
                              />
                            </div>
                            <FormDescription className="text-xs">
                              Fabrication phase percentage
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="paintPercent"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Paint %</FormLabel>
                            <div className="grid grid-cols-[1fr_50px] gap-2">
                              <FormControl>
                                <Slider 
                                  value={[field.value || 7]} 
                                  min={0} 
                                  max={100} 
                                  step={1}
                                  onValueChange={(vals) => field.onChange(vals[0])}
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
                              />
                            </div>
                            <FormDescription className="text-xs">
                              Paint phase percentage
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="assemblyPercent"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Assembly %</FormLabel>
                            <div className="grid grid-cols-[1fr_50px] gap-2">
                              <FormControl>
                                <Slider 
                                  value={[field.value || 45]} 
                                  min={0} 
                                  max={100} 
                                  step={1}
                                  onValueChange={(vals) => field.onChange(vals[0])}
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
                              />
                            </div>
                            <FormDescription className="text-xs">
                              Assembly phase percentage
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="itPercent"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>IT %</FormLabel>
                            <div className="grid grid-cols-[1fr_50px] gap-2">
                              <FormControl>
                                <Slider 
                                  value={[field.value || 7]} 
                                  min={0} 
                                  max={100} 
                                  step={1}
                                  onValueChange={(vals) => field.onChange(vals[0])}
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
                              />
                            </div>
                            <FormDescription className="text-xs">
                              IT phase percentage
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="ntcTestingPercent"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>NTC Testing %</FormLabel>
                            <div className="grid grid-cols-[1fr_50px] gap-2">
                              <FormControl>
                                <Slider 
                                  value={[field.value || 7]} 
                                  min={0} 
                                  max={100} 
                                  step={1}
                                  onValueChange={(vals) => field.onChange(vals[0])}
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
                              />
                            </div>
                            <FormDescription className="text-xs">
                              NTC Testing phase percentage
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="qcPercent"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>QC %</FormLabel>
                            <div className="grid grid-cols-[1fr_50px] gap-2">
                              <FormControl>
                                <Slider 
                                  value={[field.value || 7]} 
                                  min={0} 
                                  max={100} 
                                  step={1}
                                  onValueChange={(vals) => field.onChange(vals[0])}
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
                              />
                            </div>
                            <FormDescription className="text-xs">
                              QC phase percentage
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
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <FormControl>
                            <Input placeholder="Project category" {...field} />
                          </FormControl>
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
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              LLTs Ordered
                            </FormLabel>
                            <FormDescription>
                              Check if Long Lead Time items have been ordered
                            </FormDescription>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="hasBillingMilestones"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              Has Billing Milestones
                            </FormLabel>
                            <FormDescription>
                              Check if project has defined billing milestones
                            </FormDescription>
                          </div>
                          <FormMessage />
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
                        <FormItem className="flex flex-col">
                          <FormLabel>PO Dropped Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, 'MMM d, yyyy')
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value ? new Date(field.value) : undefined}
                                onSelect={(date) => {
                                  if (date) {
                                    // Fix timezone issue by creating date at noon UTC
                                    const fixedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
                                    field.onChange(fixedDate);
                                  } else {
                                    field.onChange(null);
                                  }
                                }}
                                disabled={(date) =>
                                  date < new Date("1900-01-01")
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormDescription>
                            The date when the Purchase Order was received
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="contractDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Contract Date *</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, 'MMM d, yyyy')
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value ? new Date(field.value) : undefined}
                                onSelect={(date) => {
                                  if (date) {
                                    // Fix timezone issue by creating date at noon UTC
                                    const fixedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
                                    field.onChange(fixedDate);
                                  } else {
                                    field.onChange(null);
                                  }
                                }}
                                disabled={(date) =>
                                  date < new Date("1900-01-01")
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormDescription>
                            The contract delivery date (must be manually entered)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Production Timeline Dates */}
                  <h3 className="text-md font-medium mb-2">Production Timeline</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="fabricationStart"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Fabrication Start Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    formatDate(field.value)
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date < new Date("1900-01-01")
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="assemblyStart"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Assembly Start Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    formatDate(field.value)
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date < new Date("1900-01-01")
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="ntcTestingDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>NTC Testing Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    formatDate(field.value)
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date < new Date("1900-01-01")
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="qcStartDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>QC Start Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    formatDate(field.value)
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date < new Date("1900-01-01")
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="shipDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Ship Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    formatDate(field.value)
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date < new Date("1900-01-01")
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="deliveryDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Delivery Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    formatDate(field.value)
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date < new Date("1900-01-01")
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
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