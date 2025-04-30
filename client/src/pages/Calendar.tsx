import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { Calendar as CalendarIcon, Plus, Filter } from 'lucide-react';
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
import { format } from 'date-fns';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { getProjectStatusColor, checkScheduleConflict } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Project, ManufacturingBay, ManufacturingSchedule } from '@shared/schema';

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
});

type ScheduleForm = z.infer<typeof scheduleFormSchema>;

const CalendarPage = () => {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isAddScheduleOpen, setIsAddScheduleOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month');
  const [filterBay, setFilterBay] = useState<string>('all');
  const [filterProject, setFilterProject] = useState<string>('all');

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

  // Fetch all manufacturing schedules
  const { data: schedules = [], refetch: refetchSchedules } = useQuery<ManufacturingSchedule[]>({
    queryKey: ['/api/manufacturing-schedules'],
    enabled: isAuthenticated,
  });

  // Set up form with validation
  const form = useForm<ScheduleForm>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      projectId: '',
      bayId: '',
      notes: '',
    },
  });

  // Convert manufacturing schedules to calendar schedule items
  const calendarItems: ScheduleItem[] = schedules
    .filter(schedule => 
      (filterBay === 'all' || schedule.bayId.toString() === filterBay) &&
      (filterProject === 'all' || schedule.projectId.toString() === filterProject)
    )
    .map(schedule => {
      const project = projects.find(p => p.id === schedule.projectId);
      const bay = bays.find(b => b.id === schedule.bayId);
      
      // Determine color based on project status
      const statusInfo = getProjectStatusColor(
        parseFloat(project?.percentComplete || '0'), 
        project?.estimatedCompletionDate
      );
      
      return {
        id: schedule.id,
        title: project?.name || 'Unknown Project',
        date: schedule.startDate,
        project: project?.projectNumber || '',
        status: schedule.status,
        color: statusInfo.color,
        bay: bay?.name || 'Unknown Bay',
        endDate: schedule.endDate,
        notes: schedule.notes || '',
      };
    });

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
      await fetch('/api/manufacturing-schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: parseInt(data.projectId),
          bayId: parseInt(data.bayId),
          startDate: data.startDate,
          endDate: data.endDate,
          status: 'scheduled',
          notes: data.notes,
        }),
      });

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

  // Handle date selection
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    // Additional functionality when date is clicked
  };

  // Handle schedule item click
  const handleItemClick = (item: ScheduleItem) => {
    // Show details or edit dialog for the clicked item
    toast({
      title: item.title,
      description: `${format(new Date(item.date), 'MMM d, yyyy')} - ${item.bay}`,
    });
  };

  return (
    <div className="container mx-auto py-6 max-w-7xl px-4 sm:px-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Production Calendar</h1>
        
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
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>Production Schedule</CardTitle>
                <CardDescription>
                  {viewMode === 'month' 
                    ? 'Monthly view of all scheduled manufacturing activities' 
                    : 'Detailed list of upcoming manufacturing schedules'}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-success w-3 h-3 rounded-full"></div> <span className="text-xs">On Track</span>
                <div className="bg-warning w-3 h-3 rounded-full ml-2"></div> <span className="text-xs">At Risk</span>
                <div className="bg-danger w-3 h-3 rounded-full ml-2"></div> <span className="text-xs">Delayed</span>
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
                      .map(item => (
                        <div 
                          key={item.id} 
                          className="flex items-center p-3 rounded-lg border border-gray-700 hover:bg-gray-800 cursor-pointer"
                          onClick={() => handleItemClick(item)}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full bg-${item.color}`}></div>
                              <h3 className="font-medium">{item.title}</h3>
                              <Badge variant="outline">{item.project}</Badge>
                            </div>
                            <div className="text-sm text-gray-400 mt-1">
                              {format(new Date(item.date), 'MMM d, yyyy')} - {item.endDate ? format(new Date(item.endDate), 'MMM d, yyyy') : 'N/A'}
                            </div>
                          </div>
                          <div>
                            <Badge className={`bg-${item.color} bg-opacity-20 text-${item.color} border-${item.color}`}>
                              {item.status}
                            </Badge>
                          </div>
                          <div className="ml-4 text-sm text-gray-400">
                            Bay: {item.bay}
                          </div>
                        </div>
                      ))
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
                        {bay.name}
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
                        {project.projectNumber}
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
              <CardTitle className="text-lg">Selected Date</CardTitle>
              <CardDescription>
                {selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'No date selected'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedDate && calendarItems
                  .filter(item => {
                    const itemDate = new Date(item.date);
                    return (
                      itemDate.getDate() === selectedDate.getDate() &&
                      itemDate.getMonth() === selectedDate.getMonth() &&
                      itemDate.getFullYear() === selectedDate.getFullYear()
                    );
                  })
                  .map(item => (
                    <div 
                      key={item.id} 
                      className="p-2 border border-gray-700 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full bg-${item.color}`}></div>
                        <span className="font-medium">{item.title}</span>
                      </div>
                      <div className="mt-1 text-sm text-gray-400">
                        Bay: {item.bay}
                      </div>
                      {item.notes && (
                        <div className="mt-1 text-xs text-gray-500">
                          {item.notes}
                        </div>
                      )}
                    </div>
                  ))}
                
                {selectedDate && calendarItems.filter(item => {
                  const itemDate = new Date(item.date);
                  return (
                    itemDate.getDate() === selectedDate.getDate() &&
                    itemDate.getMonth() === selectedDate.getMonth() &&
                    itemDate.getFullYear() === selectedDate.getFullYear()
                  );
                }).length === 0 && (
                  <div className="text-center py-4 text-gray-400 text-sm">
                    No schedules for this date
                  </div>
                )}
                
                {!selectedDate && (
                  <div className="text-center py-4 text-gray-400 text-sm">
                    Select a date on the calendar to see scheduled items
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