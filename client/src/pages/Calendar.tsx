import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarSchedule, ScheduleItem } from '@/components/ui/calendar-schedule';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Plus, Filter, Check, Info, ArrowRight, X } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format, parseISO, addDays, subDays, isSameDay, differenceInDays, isWithinInterval } from 'date-fns';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { getProjectStatusColor, checkScheduleConflict } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Project, ManufacturingBay, ManufacturingSchedule } from '@shared/schema';
import { queryClient } from '@/lib/queryClient';
import { ModuleHelpButton } from '@/components/ModuleHelpButton';
import { calendarHelpContent } from '@/data/moduleHelpContent';

// Form validation schema
const scheduleFormSchema = z.object({
  projectId: z.string().min(1, { message: 'Please select a project' }),
  bayId: z.string().min(1, { message: 'Please select a manufacturing bay' }),
  startDate: z.date({
    required_error: 'Please select a start date',
  }),
  endDate: z.date({
    required_error: 'Please select an end date',
  }),
  notes: z.string().optional(),
  status: z.enum(['scheduled', 'in_progress', 'complete', 'maintenance']).default('scheduled'),
});

type ScheduleForm = z.infer<typeof scheduleFormSchema>;

const CalendarPage = () => {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isAddScheduleOpen, setIsAddScheduleOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month');
  const [filterBay, setFilterBay] = useState<string>('all');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [isViewScheduleOpen, setIsViewScheduleOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleItem | null>(null);
  const [previewMilestone, setPreviewMilestone] = useState<ScheduleItem | null>(null);

  // Fetch all projects
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    enabled: isAuthenticated,
  });

  // Fetch all manufacturing bays
  const { data: bays = [] } = useQuery<ManufacturingBay[]>({
    queryKey: ['/api/manufacturing-bays'],
    enabled: isAuthenticated,
  });

  // Fetch all manufacturing schedules with project phases
  const { data: schedules = [], refetch: refetchSchedules } = useQuery<ManufacturingSchedule[]>({
    queryKey: ['/api/manufacturing-schedules'],
    enabled: isAuthenticated,
  });

  // Fetch project milestones for phase display
  const { data: milestones = [] } = useQuery({
    queryKey: ['/api/phases'],
    enabled: isAuthenticated,
  });
  
  // Fetch billing milestones for display
  const { data: billingMilestones = [] } = useQuery<any[]>({
    queryKey: ['/api/billing-milestones'],
    enabled: isAuthenticated,
  });

  // Set up form with validation
  const form = useForm<ScheduleForm>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      projectId: '',
      bayId: '',
      notes: '',
      status: 'scheduled',
    },
  });

  // Get project phase dates to display as calendar items
  const getProjectPhaseDates = (projectId: number) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return [];

    const phaseItems: ScheduleItem[] = [];

    if (project.fabricationStart) {
      phaseItems.push({
        id: `fab-${projectId}`,
        title: `Fabrication - ${project.name}`,
        date: project.fabricationStart,
        endDate: project.wrapDate || addDays(new Date(project.fabricationStart), 7),
        project: project.projectNumber,
        status: 'phase',
        color: 'bg-blue-700/70 text-white',
        projectId: project.id
      });
    }

    if (project.wrapDate) {
      phaseItems.push({
        id: `paint-${projectId}`,
        title: `Paint - ${project.name}`,
        date: project.wrapDate,
        endDate: project.assemblyStart || addDays(new Date(project.wrapDate), 7),
        project: project.projectNumber,
        status: 'phase',
        color: 'bg-yellow-600/70 text-white',
        projectId: project.id
      });
    }

    if (project.assemblyStart) {
      phaseItems.push({
        id: `asm-${projectId}`,
        title: `Assembly - ${project.name}`,
        date: project.assemblyStart,
        endDate: project.ntcTestingDate || addDays(new Date(project.assemblyStart), 14),
        project: project.projectNumber,
        status: 'phase',
        color: 'bg-orange-600/70 text-white',
        projectId: project.id
      });
    }

    if (project.ntcTestingDate) {
      phaseItems.push({
        id: `ntc-${projectId}`,
        title: `NTC Testing - ${project.name}`,
        date: project.ntcTestingDate,
        endDate: project.qcStartDate || addDays(new Date(project.ntcTestingDate), 5),
        project: project.projectNumber,
        status: 'phase',
        color: 'bg-purple-600/70 text-white',
        projectId: project.id
      });
    }

    if (project.qcStartDate) {
      phaseItems.push({
        id: `qc-${projectId}`,
        title: `QC - ${project.name}`,
        date: project.qcStartDate,
        endDate: project.executiveReviewDate || addDays(new Date(project.qcStartDate), 3),
        project: project.projectNumber,
        status: 'phase',
        color: 'bg-green-600/70 text-white',
        projectId: project.id
      });
    }

    if (project.shipDate) {
      phaseItems.push({
        id: `ship-${projectId}`,
        title: `Ship Date - ${project.name}`,
        date: project.shipDate,
        project: project.projectNumber,
        projectName: project.name,
        status: 'milestone',
        color: 'bg-red-600/90 text-white',
        projectId: project.id
      });
    }

    return phaseItems;
  };

  // Generate phase items for all projects
  const phaseItems = projects.flatMap(project => getProjectPhaseDates(project.id));
  
  // Generate billing milestone items
  const billingMilestoneItems: ScheduleItem[] = billingMilestones
    .filter(milestone => milestone.targetInvoiceDate && projects.some(p => p.id === milestone.projectId))
    .map(milestone => {
      const project = projects.find(p => p.id === milestone.projectId);
      
      // Determine color based on milestone status
      let statusColor = '';
      switch (milestone.status) {
        case 'delayed':
          statusColor = 'bg-red-600/80 text-white';
          break;
        case 'upcoming':
          statusColor = 'bg-amber-600/80 text-white';
          break;
        case 'invoiced':
          statusColor = 'bg-blue-600/80 text-white';
          break;
        case 'paid':
          statusColor = 'bg-green-600/80 text-white';
          break;
        default:
          statusColor = 'bg-gray-600/80 text-white';
      }
      
      return {
        id: `billing-${milestone.id}`,
        title: `${milestone.name} - ${project?.name || 'Unknown Project'}`,
        date: milestone.targetInvoiceDate,
        project: project?.projectNumber || '',
        projectName: project?.name,
        status: 'billing',
        color: statusColor,
        projectId: project?.id,
        variant: milestone.status,
        notes: milestone.description || milestone.notes || ''
      };
    });

  // Convert manufacturing schedules to calendar schedule items
  const scheduleItems: ScheduleItem[] = schedules
    .filter(schedule => 
      (filterBay === 'all' || schedule.bayId.toString() === filterBay) &&
      (filterProject === 'all' || schedule.projectId.toString() === filterProject)
    )
    .map(schedule => {
      const project = projects.find(p => p.id === schedule.projectId);
      const bay = bays.find(b => b.id === schedule.bayId);
      
      // Determine color based on schedule status
      let statusColor = '';
      switch (schedule.status) {
        case 'scheduled':
          statusColor = 'bg-blue-600/80 text-white';
          break;
        case 'in_progress':
          statusColor = 'bg-amber-600/80 text-white';
          break;
        case 'complete':
          statusColor = 'bg-green-600/80 text-white';
          break;
        case 'maintenance':
          statusColor = 'bg-purple-600/80 text-white';
          break;
        default:
          statusColor = 'bg-gray-600/80 text-white';
      }
      
      return {
        id: schedule.id,
        title: `${project?.name || 'Unknown Project'} - Bay ${bay?.bayNumber || '?'}`,
        date: schedule.startDate,
        project: project?.projectNumber || '',
        status: schedule.status,
        color: statusColor,
        bay: bay?.name || 'Unknown Bay',
        endDate: schedule.endDate,
        notes: schedule.notes || '',
        projectId: project?.id
      };
    });

  // Filter phase items based on project filter
  const filteredPhaseItems = filterProject === 'all'
    ? phaseItems
    : phaseItems.filter(item => {
        const projectId = parseInt(filterProject);
        return item.projectId === projectId;
      });

  // Set up display options for calendar items
  const [showPhases, setShowPhases] = useState<boolean>(false);
  const [showShipDates, setShowShipDates] = useState<boolean>(false);
  
  // Filter billing milestones based on project filter
  const filteredBillingMilestones = filterProject === 'all'
    ? billingMilestoneItems
    : billingMilestoneItems.filter(item => {
        const projectId = parseInt(filterProject);
        return item.projectId === projectId;
      });

  // Set up display options for calendar items
  const [showBillingMilestones, setShowBillingMilestones] = useState<boolean>(true);
  
  // Combine milestone items only (no schedule bars)
  const calendarItems: ScheduleItem[] = [
    ...(showShipDates ? filteredPhaseItems.filter(item => item.status === 'milestone') : []),
    ...(showBillingMilestones ? filteredBillingMilestones : [])
  ];

  // Handle form submission
  const onSubmit = async (data: ScheduleForm) => {
    // Check for schedule conflicts
    const conflictExists = checkScheduleConflict(
      parseInt(data.bayId),
      data.startDate,
      data.endDate,
      schedules,
      undefined // No ID for new schedule
    );

    if (conflictExists) {
      toast({
        title: 'Schedule Conflict',
        description: 'This bay is already scheduled during this time period.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Create new manufacturing schedule
      const response = await fetch('/api/manufacturing-schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: parseInt(data.projectId),
          bayId: parseInt(data.bayId),
          startDate: data.startDate,
          endDate: data.endDate,
          status: data.status,
          notes: data.notes || '',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create schedule');
      }

      // Invalidate queries to update project data
      await queryClient.invalidateQueries({ queryKey: ['/api/manufacturing-schedules'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/projects'] });

      // Success notification
      toast({
        title: 'Schedule Created',
        description: 'The manufacturing schedule has been created successfully.',
      });

      // Close dialog and refetch schedules
      setIsAddScheduleOpen(false);
      form.reset();
      refetchSchedules();
    } catch (error) {
      console.error('Error creating schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to create manufacturing schedule. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Function to delete a schedule
  const deleteSchedule = async (scheduleId: number | string) => {
    try {
      const response = await fetch(`/api/manufacturing-schedules/${scheduleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete schedule');
      }

      // Invalidate queries to update data
      await queryClient.invalidateQueries({ queryKey: ['/api/manufacturing-schedules'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/projects'] });

      toast({
        title: 'Schedule Deleted',
        description: 'The manufacturing schedule has been removed.',
      });

      setIsViewScheduleOpen(false);
      refetchSchedules();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete manufacturing schedule. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Handle date selection
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  // Function to close the milestone preview
  const closeMilestonePreview = () => {
    setPreviewMilestone(null);
  };

  // Function to navigate to project from preview
  const goToProjectFromPreview = () => {
    if (previewMilestone?.projectId) {
      navigate(`/project/${previewMilestone.projectId}`);
      closeMilestonePreview();
    }
  };

  // Handle schedule item click
  const handleItemClick = (item: ScheduleItem) => {
    // Set the selected schedule for the details view
    setSelectedSchedule(item);

    // For milestones or billing milestones, show the preview popup
    if ((item.status === 'milestone' || item.status === 'billing')) {
      setPreviewMilestone(item);
      return;
    }
    
    // For phase items, navigate directly to project details
    if (item.status === 'phase' && item.projectId) {
      navigate(`/project/${item.projectId}`);
      return;
    }
    
    // For regular schedule items (bay schedules), show the details dialog
    if (item.status !== 'milestone' && item.status !== 'billing' && item.status !== 'phase') {
      setIsViewScheduleOpen(true);
    }
  };

  return (
    <div className="container mx-auto py-6 max-w-7xl px-4 sm:px-6">
      {/* Milestone Preview Popup */}
      {previewMilestone && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={closeMilestonePreview}>
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full mx-4" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div 
                  className={`h-3 w-3 rounded-full ${
                    previewMilestone.status === 'billing' 
                      ? (previewMilestone.variant === 'paid' 
                          ? 'bg-green-500' 
                          : previewMilestone.variant === 'delayed' 
                            ? 'bg-red-500' 
                            : 'bg-amber-500')
                      : 'bg-blue-500'
                  }`}
                />
                <h3 className="text-lg font-semibold">
                  {previewMilestone.status === 'billing' ? 'Billing Milestone' : 'Project Milestone'}
                </h3>
              </div>
              <button 
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                onClick={closeMilestonePreview}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-3 mb-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Title</p>
                <p className="font-medium">{previewMilestone.title}</p>
              </div>
              
              {previewMilestone.projectName && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Project</p>
                  <p className="font-medium">{previewMilestone.projectName}</p>
                </div>
              )}
              
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Date</p>
                <p className="font-medium">{format(new Date(previewMilestone.date), 'MMMM d, yyyy')}</p>
              </div>
              
              {previewMilestone.status === 'billing' && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                  <p className="font-medium capitalize">{previewMilestone.variant || 'upcoming'}</p>
                </div>
              )}
              
              {previewMilestone.notes && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Description</p>
                  <p className="text-sm">{previewMilestone.notes}</p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeMilestonePreview}>
                Close
              </Button>
              {previewMilestone.projectId && (
                <Button onClick={goToProjectFromPreview}>
                  View Project
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
      
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Production Calendar</h1>
          <ModuleHelpButton moduleId="calendar" helpContent={calendarHelpContent} />
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={viewMode} onValueChange={(value: 'month' | 'list') => setViewMode(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="View Mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Month View</SelectItem>
              <SelectItem value="list">List View</SelectItem>
            </SelectContent>
          </Select>
          
          <Dialog open={isAddScheduleOpen} onOpenChange={setIsAddScheduleOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add Schedule
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>Add Manufacturing Schedule</DialogTitle>
                <DialogDescription>
                  Create a new manufacturing schedule for a project
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="projectId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a project" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {projects.map((project) => (
                              <SelectItem 
                                key={project.id} 
                                value={project.id.toString()}
                              >
                                {project.projectNumber} - {project.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="bayId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Manufacturing Bay</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a bay" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {bays.map((bay) => (
                              <SelectItem 
                                key={bay.id} 
                                value={bay.id.toString()}
                              >
                                {bay.name} - Bay {bay.bayNumber}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Schedule Status</FormLabel>
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
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="complete">Complete</SelectItem>
                            <SelectItem value="maintenance">Maintenance</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Start Date</FormLabel>
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            className="rounded-md border bg-darkCard"
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>End Date</FormLabel>
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => {
                              const start = form.getValues("startDate");
                              return start ? date < start : false;
                            }}
                            className="rounded-md border bg-darkCard"
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter>
                    <Button 
                      type="submit" 
                      disabled={form.formState.isSubmitting}
                    >
                      {form.formState.isSubmitting ? 'Saving...' : 'Save Schedule'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      {/* View Schedule Dialog */}
      <Dialog open={isViewScheduleOpen} onOpenChange={setIsViewScheduleOpen}>
        <DialogContent className="sm:max-w-[500px]">
          {selectedSchedule && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span 
                    className={`w-3 h-3 rounded-full ${
                      selectedSchedule.status === 'in_progress' ? 'bg-amber-500' : 
                      selectedSchedule.status === 'complete' ? 'bg-green-500' : 
                      selectedSchedule.status === 'maintenance' ? 'bg-purple-500' : 
                      'bg-blue-500'
                    }`}
                  ></span>
                  {selectedSchedule.title}
                </DialogTitle>
                <DialogDescription>
                  Schedule details and actions
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-2">
                {/* Project Info */}
                <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                  <div>
                    <p className="text-sm text-gray-400">Project</p>
                    <p className="font-medium">{selectedSchedule.project}</p>
                  </div>
                  <Badge variant="outline">{selectedSchedule.status}</Badge>
                </div>
                
                {/* Dates */}
                <div className="flex justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Start Date</p>
                    <p className="font-medium">
                      {format(new Date(selectedSchedule.date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">End Date</p>
                    <p className="font-medium">
                      {selectedSchedule.endDate ? format(new Date(selectedSchedule.endDate), 'MMM d, yyyy') : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Duration</p>
                    <p className="font-medium">
                      {selectedSchedule.endDate 
                        ? `${differenceInDays(new Date(selectedSchedule.endDate), new Date(selectedSchedule.date))} days` 
                        : 'N/A'}
                    </p>
                  </div>
                </div>
                
                {/* Bay Info */}
                {selectedSchedule.bay && (
                  <div className="border-t border-gray-800 pt-3">
                    <p className="text-sm text-gray-400">Manufacturing Bay</p>
                    <p className="font-medium">{selectedSchedule.bay}</p>
                  </div>
                )}
                
                {/* Notes */}
                {selectedSchedule.notes && (
                  <div className="border-t border-gray-800 pt-3">
                    <p className="text-sm text-gray-400">Notes</p>
                    <p className="mt-1 text-sm">{selectedSchedule.notes}</p>
                  </div>
                )}
              </div>
              
              <DialogFooter className="flex justify-between gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => navigate(`/project/${selectedSchedule.projectId}`)}
                >
                  View Project <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                
                <Button 
                  variant="destructive"
                  onClick={() => deleteSchedule(selectedSchedule.id)}
                >
                  Delete Schedule
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>Production Schedule</CardTitle>
                <CardDescription>
                  {viewMode === 'month' 
                    ? 'Monthly view of manufacturing activities and project phases' 
                    : 'Detailed list of all scheduled manufacturing activities'}
                </CardDescription>
              </div>
              <div className="flex flex-col items-end gap-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="show-billing" 
                      className="h-3.5 w-3.5 rounded border-gray-300" 
                      checked={showBillingMilestones}
                      onChange={(e) => setShowBillingMilestones(e.target.checked)}
                    />
                    <label htmlFor="show-billing" className="text-xs cursor-pointer flex items-center">
                      <div className="bg-blue-600/80 w-3 h-3 rounded-full mr-1"></div> 
                      <span>Billing Milestones</span>
                    </label>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="show-ship-dates" 
                      className="h-3.5 w-3.5 rounded border-gray-300" 
                      checked={showShipDates}
                      onChange={(e) => setShowShipDates(e.target.checked)}
                    />
                    <label htmlFor="show-ship-dates" className="text-xs cursor-pointer flex items-center">
                      <div className="bg-red-600/90 w-3 h-3 rounded-full mr-1"></div> 
                      <span>Ship Dates</span>
                    </label>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 mt-1">
                  <div className="text-xs text-gray-400 mr-2">Legend:</div>
                  <div className="flex items-center gap-2">
                    <div className="bg-green-600/80 w-3 h-3 rounded-full"></div> 
                    <span className="text-xs">Paid</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-amber-600/80 w-3 h-3 rounded-full"></div> 
                    <span className="text-xs">Upcoming</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-red-600/90 w-3 h-3 rounded-full"></div> 
                    <span className="text-xs">Delayed</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {viewMode === 'month' ? (
                <CalendarSchedule 
                  items={calendarItems} 
                  onDateClick={handleDateClick}
                  onItemClick={handleItemClick}
                />
              ) : (
                <div className="space-y-3">
                  {calendarItems.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                      No schedules found with the current filters
                    </div>
                  ) : (
                    calendarItems
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .map(item => {
                        // Extract color class without "bg-" prefix for badge styling
                        const colorClass = item.color ? item.color.replace('bg-', '') : '';
                        
                        return (
                          <div 
                            key={item.id} 
                            className="flex items-center p-3 rounded-lg border border-gray-700 hover:bg-gray-800 cursor-pointer"
                            onClick={() => handleItemClick(item)}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <div className={item.color.includes('bg-') ? item.color : `bg-${item.color}`} style={{ width: '8px', height: '8px', borderRadius: '50%' }}></div>
                                <h3 className="font-medium">{item.title}</h3>
                                <Badge variant="outline">{item.project}</Badge>
                              </div>
                              <div className="text-sm text-gray-400 mt-1">
                                {format(new Date(item.date), 'MMM d, yyyy')} 
                                {item.endDate && ` - ${format(new Date(item.endDate), 'MMM d, yyyy')}`}
                              </div>
                            </div>
                            <div>
                              <Badge className={`${item.color.replace('bg-', 'border-')} border`}>
                                {item.status}
                              </Badge>
                            </div>
                            {item.bay && (
                              <div className="ml-4 text-sm text-gray-400">
                                Bay: {item.bay}
                              </div>
                            )}
                          </div>
                        );
                      })
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="bay-filter">Manufacturing Bay</Label>
                <Select value={filterBay} onValueChange={setFilterBay}>
                  <SelectTrigger id="bay-filter" className="w-full">
                    <SelectValue placeholder="All Bays" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Bays</SelectItem>
                    {bays.map(bay => (
                      <SelectItem key={bay.id} value={bay.id.toString()}>
                        {bay.name} - Bay {bay.bayNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="project-filter">Project</Label>
                <Select value={filterProject} onValueChange={setFilterProject}>
                  <SelectTrigger id="project-filter" className="w-full">
                    <SelectValue placeholder="All Projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.projectNumber} - {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button variant="outline" className="w-full" onClick={() => {
                setFilterBay('all');
                setFilterProject('all');
              }}>
                <Filter className="mr-2 h-4 w-4" /> Reset Filters
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Selected Date: {selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'None'}</CardTitle>
              <CardDescription>
                {selectedDate 
                  ? `Events on ${format(selectedDate, 'MMMM d, yyyy')}` 
                  : 'Select a date on the calendar to see events'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedDate && (
                  <>
                    {calendarItems
                      .filter(item => {
                        // Check if selected date falls within the item's date range
                        try {
                          const itemStartDate = item.date instanceof Date ? item.date : parseISO(item.date as string);
                          
                          // If the item has no end date, just check if it's on the same day
                          if (!item.endDate) {
                            return isSameDay(itemStartDate, selectedDate);
                          }
                          
                          const itemEndDate = item.endDate instanceof Date ? item.endDate : parseISO(item.endDate as string);
                          
                          // Check if the selected date is within the interval (inclusive)
                          return isWithinInterval(selectedDate, {
                            start: itemStartDate,
                            end: itemEndDate
                          });
                        } catch (error) {
                          console.error("Error filtering by date:", error);
                          return false;
                        }
                      })
                      .map(item => (
                        <div 
                          key={item.id} 
                          className="p-3 border border-gray-700 rounded-lg hover:bg-gray-800 cursor-pointer"
                          onClick={() => handleItemClick(item)}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div className={item.color.includes('bg-') ? item.color : `bg-${item.color}`} style={{ width: '8px', height: '8px', borderRadius: '50%' }}></div>
                            <span className="font-medium">{item.title}</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-1 mt-2 text-xs text-gray-400">
                            <div>
                              <div className="font-medium text-gray-300">Project:</div>
                              <div>{item.project}</div>
                            </div>
                            
                            {item.bay && (
                              <div>
                                <div className="font-medium text-gray-300">Bay:</div>
                                <div>{item.bay}</div>
                              </div>
                            )}
                            
                            <div className="col-span-2 mt-1">
                              <div className="font-medium text-gray-300">Duration:</div>
                              <div>
                                {format(new Date(item.date), 'MMM d')} 
                                {item.endDate && ` - ${format(new Date(item.endDate), 'MMM d')}`}
                              </div>
                            </div>
                          </div>
                          
                          {item.notes && (
                            <div className="mt-2 text-xs text-gray-500 border-t border-gray-800 pt-2">
                              {item.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    
                    {calendarItems.filter(item => {
                      const itemDate = new Date(item.date);
                      if (!item.endDate) {
                        return isSameDay(itemDate, selectedDate);
                      }
                      const itemEndDate = new Date(item.endDate);
                      return isWithinInterval(selectedDate, { start: itemDate, end: itemEndDate });
                    }).length === 0 && (
                      <div className="text-center py-8 text-gray-400 text-sm flex flex-col items-center">
                        <Info className="h-6 w-6 mb-2 text-gray-500" />
                        No events scheduled for this date
                      </div>
                    )}
                  </>
                )}
                
                {!selectedDate && (
                  <div className="text-center py-8 text-gray-400 text-sm flex flex-col items-center">
                    <CalendarIcon className="h-10 w-10 mb-3 text-gray-500" />
                    Select a date on the calendar to see scheduled events
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;