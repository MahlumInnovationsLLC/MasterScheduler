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
import { CalendarIcon, ChevronLeft, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
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

// Define the basic project information schema
const projectSchema = z.object({
  projectNumber: z.string().min(1, 'Project number is required'),
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
  pmOwner: z.string().optional(),
  client: z.string().optional(),
  startDate: z.date().optional(),
  estimatedCompletionDate: z.date().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  category: z.string().optional(),
  notes: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

function ProjectEdit() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('general');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);

  // Extract project ID from the URL
  const currentPath = window.location.pathname;
  const projectId = currentPath.split('/')[2]; // Get proper ID part from /project/:id/edit

  // Fetch project data
  const { data: project, isLoading, error } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });

  // Create form with react-hook-form
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      projectNumber: '',
      name: '',
      description: '',
      pmOwner: '',
      client: '',
      status: 'active',
      priority: 'medium',
      category: '',
      notes: '',
    },
  });

  // Update form when project data is loaded
  useEffect(() => {
    if (project) {
      form.reset({
        projectNumber: project.projectNumber || '',
        name: project.name || '',
        description: project.description || '',
        pmOwner: project.pmOwner || '',
        client: project.client || '',
        startDate: project.startDate ? new Date(project.startDate) : undefined,
        estimatedCompletionDate: project.estimatedCompletionDate ? new Date(project.estimatedCompletionDate) : undefined,
        status: project.status || 'active',
        priority: project.priority || 'medium',
        category: project.category || '',
        notes: project.notes || '',
      });
    }
  }, [project, form]);

  // Mutations for updating and deleting projects
  const updateMutation = useMutation({
    mutationFn: async (data: ProjectFormValues) => {
      const res = await apiRequest('PUT', `/api/projects/${projectId}`, data);
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
    updateMutation.mutate(data);
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
            <h1 className="text-2xl font-bold">Edit Project</h1>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Start Date</FormLabel>
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
                      name="estimatedCompletionDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Estimated Completion Date</FormLabel>
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
        </form>
      </Form>
    </div>
  );
}

export default ProjectEdit;