import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { format, addDays, addMonths } from 'date-fns';

import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Loading } from '@/components/ui/loading';
import { CalendarIcon, ArrowLeft, Info, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Define the project creation form schema
const projectFormSchema = z.object({
  projectNumber: z.string().min(1, "Project number is required"),
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  client: z.string().optional(),
  
  // PM and team information
  pmOwner: z.string().optional(),
  team: z.string().optional(),
  location: z.string().optional(),
  
  // Dates
  contractDate: z.date().optional(),
  startDate: z.date(),
  estimatedCompletionDate: z.date(),
  chassisETA: z.date().optional(),
  
  // Status and risk
  status: z.enum(["active", "delayed", "completed", "archived", "critical"]).default("active"),
  riskLevel: z.enum(["low", "medium", "high"]).default("medium"),
  
  // Manufacturing details
  totalHours: z.number().min(1).default(1000),
  
  // Department allocations (percentages)
  fabPercentage: z.number().min(0).max(100).default(27),
  paintPercentage: z.number().min(0).max(100).default(7),
  productionPercentage: z.number().min(0).max(100).default(60),
  itPercentage: z.number().min(0).max(100).default(7),
  ntcPercentage: z.number().min(0).max(100).default(7),
  qcPercentage: z.number().min(0).max(100).default(7),
  
  // Staff assignments
  meAssigned: z.string().optional(),
  eeAssigned: z.string().optional(),
  iteAssigned: z.string().optional(),
  
  // Phase start dates (calculated on submit)
  fabricationStart: z.date().optional(),
  assemblyStart: z.date().optional(),
  wrapDate: z.date().optional(),
  ntcTestingDate: z.date().optional(),
  qcStartDate: z.date().optional(),
  executiveReviewDate: z.date().optional(),
  shipDate: z.date().optional(),
  deliveryDate: z.date().optional(),
  
  // Additional fields
  dpasRating: z.string().optional(),
  stretchShortenGears: z.string().optional(),
  lltsOrdered: z.boolean().default(false),
  notes: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

export default function ProjectCreate() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('general');
  const [isPercentageDialogOpen, setIsPercentageDialogOpen] = useState(false);
  const [totalPercentage, setTotalPercentage] = useState(100);
  
  // Get the current date for default values
  const today = new Date();
  const twoMonthsLater = addMonths(today, 2);
  
  const defaultValues: Partial<ProjectFormValues> = {
    status: "active",
    riskLevel: "medium",
    startDate: today,
    estimatedCompletionDate: twoMonthsLater,
    totalHours: 1000,
    fabPercentage: 27,
    paintPercentage: 7,
    productionPercentage: 60,
    itPercentage: 7,
    ntcPercentage: 7,
    qcPercentage: 7,
    lltsOrdered: false,
  };
  
  // Form definition
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues,
  });
  
  // Watch for percentage field changes to validate total is 100%
  const fabPercent = form.watch("fabPercentage") || 0;
  const paintPercent = form.watch("paintPercentage") || 0;
  const productionPercent = form.watch("productionPercentage") || 0;
  const itPercent = form.watch("itPercentage") || 0;
  const ntcPercent = form.watch("ntcPercentage") || 0;
  const qcPercent = form.watch("qcPercentage") || 0;
  
  React.useEffect(() => {
    const newTotal = fabPercent + paintPercent + productionPercent + itPercent + ntcPercent + qcPercent;
    setTotalPercentage(newTotal);
  }, [fabPercent, paintPercent, productionPercent, itPercent, ntcPercent, qcPercent]);
  
  // Mutation for creating a project
  const createProjectMutation = useMutation({
    mutationFn: async (data: ProjectFormValues) => {
      // Convert dates to ISO strings to ensure they're serialized properly
      const formattedData = {
        ...data,
        startDate: data.startDate instanceof Date ? data.startDate.toISOString() : data.startDate,
        estimatedCompletionDate: data.estimatedCompletionDate instanceof Date ? 
          data.estimatedCompletionDate.toISOString() : data.estimatedCompletionDate,
        contractDate: data.contractDate instanceof Date ? 
          data.contractDate.toISOString() : data.contractDate,
        chassisETA: data.chassisETA instanceof Date ? 
          data.chassisETA.toISOString() : data.chassisETA,
        // Format all other dates too
        fabricationStart: data.fabricationStart instanceof Date ? 
          data.fabricationStart.toISOString() : data.fabricationStart,
        assemblyStart: data.assemblyStart instanceof Date ? 
          data.assemblyStart.toISOString() : data.assemblyStart,
        wrapDate: data.wrapDate instanceof Date ? 
          data.wrapDate.toISOString() : data.wrapDate,
        ntcTestingDate: data.ntcTestingDate instanceof Date ? 
          data.ntcTestingDate.toISOString() : data.ntcTestingDate,
        qcStartDate: data.qcStartDate instanceof Date ? 
          data.qcStartDate.toISOString() : data.qcStartDate,
        executiveReviewDate: data.executiveReviewDate instanceof Date ? 
          data.executiveReviewDate.toISOString() : data.executiveReviewDate,
        shipDate: data.shipDate instanceof Date ? 
          data.shipDate.toISOString() : data.shipDate,
        deliveryDate: data.deliveryDate instanceof Date ? 
          data.deliveryDate.toISOString() : data.deliveryDate,
      };
      
      console.log("Submitting project data:", formattedData);
      
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedData),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Server error:", response.status, errorText);
        throw new Error(`Failed to create project: ${response.status} ${errorText}`);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({
        title: "Project Created",
        description: `Project ${data.projectNumber} has been created successfully.`,
      });
      navigate(`/project/${data.id}`);
    },
    onError: (error: any) => {
      console.error("Project creation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create project. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (values: ProjectFormValues) => {
    // Check if percentages add up to 100
    if (Math.abs(totalPercentage - 100) > 0.01) {
      setIsPercentageDialogOpen(true);
      return;
    }
    
    // Calculate all phase dates based on percentages and duration
    const startDate = values.startDate;
    const endDate = values.estimatedCompletionDate;
    const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate days for each phase based on percentages
    const fabDays = Math.round((values.fabPercentage / 100) * totalDays);
    const paintDays = Math.round((values.paintPercentage / 100) * totalDays);
    const prodDays = Math.round((values.productionPercentage / 100) * totalDays);
    const itDays = Math.round((values.itPercentage / 100) * totalDays);
    const ntcDays = Math.round((values.ntcPercentage / 100) * totalDays);
    const qcDays = Math.round((values.qcPercentage / 100) * totalDays);
    
    // Set all the phase dates
    const fabStartDate = startDate;
    const paintStartDate = addDays(fabStartDate, fabDays);
    const prodStartDate = addDays(paintStartDate, paintDays);
    const ntcStartDate = addDays(prodStartDate, prodDays);
    const qcStartDate = addDays(ntcStartDate, ntcDays + itDays); // IT and NTC often overlap
    const execReviewDate = addDays(qcStartDate, Math.round(qcDays * 0.8));
    const shipDate = endDate;
    
    // Update form values with calculated dates
    const projectData = {
      ...values,
      fabricationStart: fabStartDate,
      wrapDate: paintStartDate,
      assemblyStart: prodStartDate,
      ntcTestingDate: ntcStartDate,
      qcStartDate: qcStartDate,
      executiveReviewDate: execReviewDate,
      shipDate: shipDate,
      deliveryDate: shipDate, // By default delivery matches ship date
    };
    
    // Create the project
    createProjectMutation.mutate(projectData);
  };
  
  // Function to proceed anyway despite percentage warnings
  const proceedAnyway = () => {
    setIsPercentageDialogOpen(false);
    createProjectMutation.mutate(form.getValues());
  };
  
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate('/projects')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Create New Project</h1>
            <p className="text-gray-400 text-sm">Add a new project with details, timeline, and manufacturing phases</p>
          </div>
        </div>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="general" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">General Information</TabsTrigger>
              <TabsTrigger value="details">Project Details</TabsTrigger>
              <TabsTrigger value="phases">Manufacturing Phases</TabsTrigger>
              <TabsTrigger value="team">Team & Resources</TabsTrigger>
            </TabsList>
            
            <TabsContent value="general" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>
                    Enter the core details for the new project
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="projectNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project Number *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter a unique project number" {...field} />
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
                          <FormLabel>Project Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter project name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                <SelectValue placeholder="Select project status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="delayed">Delayed</SelectItem>
                              <SelectItem value="critical">Critical</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
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
                  
                  <Separator className="my-4" />
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Start Date *</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
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
                          <FormLabel>Estimated Completion *</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
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
                      name="contractDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Contract Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
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
                                selected={field.value || undefined}
                                onSelect={field.onChange}
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
            
            <TabsContent value="details" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Project Details</CardTitle>
                  <CardDescription>
                    Additional information about the project
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <FormControl>
                            <Input placeholder="Project location" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="riskLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Risk Level</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select risk level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="dpasRating"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>DPAS Rating</FormLabel>
                          <FormControl>
                            <Input placeholder="DPAS Rating" {...field} />
                          </FormControl>
                          <FormDescription>
                            Defense Priorities and Allocations System rating, if applicable
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="stretchShortenGears"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stretch/Shorten Details</FormLabel>
                          <FormControl>
                            <Input placeholder="Stretch/shorten gear details" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="chassisETA"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Chassis ETA</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
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
                                selected={field.value || undefined}
                                onSelect={field.onChange}
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
                      name="lltsOrdered"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>LLTS Ordered</FormLabel>
                            <FormDescription>
                              Check if Long Lead Time Systems have been ordered
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="phases" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    Manufacturing Phases
                    {Math.abs(totalPercentage - 100) > 0.01 && (
                      <div className="ml-4 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded inline-flex items-center">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Total: {totalPercentage}% (should be 100%)
                      </div>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Configure phase allocations and manufacturing hours
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Math.abs(totalPercentage - 100) > 0.01 && (
                    <Alert variant="warning" className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Phase allocations don't add up to 100%</AlertTitle>
                      <AlertDescription>
                        The current total is {totalPercentage}%. Please adjust the phase percentages to total 100%.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <FormField
                    control={form.control}
                    name="totalHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Manufacturing Hours</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min={1}
                            placeholder="Total hours" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          The total number of hours allocated for manufacturing this project
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <FormField
                      control={form.control}
                      name="fabPercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fabrication %</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min={0}
                              max={100}
                              placeholder="Fab percentage" 
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="paintPercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Paint %</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min={0}
                              max={100}
                              placeholder="Paint percentage" 
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="productionPercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Production/Assembly %</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min={0}
                              max={100}
                              placeholder="Production percentage" 
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="itPercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>IT %</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min={0}
                              max={100}
                              placeholder="IT percentage" 
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="ntcPercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>NTC %</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min={0}
                              max={100}
                              placeholder="NTC percentage" 
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="qcPercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>QC %</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min={0}
                              max={100}
                              placeholder="QC percentage" 
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="team" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Team & Resources</CardTitle>
                  <CardDescription>
                    Assign team members and resources to the project
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <FormField
                      control={form.control}
                      name="pmOwner"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project Manager</FormLabel>
                          <FormControl>
                            <Input placeholder="Project manager name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="meAssigned"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mechanical Engineering</FormLabel>
                          <FormControl>
                            <Input placeholder="ME assigned" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="eeAssigned"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Electrical Engineering</FormLabel>
                          <FormControl>
                            <Input placeholder="EE assigned" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="iteAssigned"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>IT Engineering</FormLabel>
                          <FormControl>
                            <Input placeholder="ITE assigned" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/projects')}
            >
              Cancel
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const currentTabIndex = ["general", "details", "phases", "team"].indexOf(activeTab);
                if (currentTabIndex < 3) {
                  setActiveTab(["general", "details", "phases", "team"][currentTabIndex + 1]);
                }
              }}
              disabled={activeTab === "team"}
            >
              Next
            </Button>
            
            <Button 
              type="submit"
              disabled={createProjectMutation.isPending}
            >
              {createProjectMutation.isPending ? <Loading size="sm" /> : "Create Project"}
            </Button>
          </div>
        </form>
      </Form>
      
      {/* Warning dialog for percentages not adding up to 100% */}
      {isPercentageDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 w-[90%] max-w-md">
            <h3 className="text-lg font-medium mb-2">Phase Allocation Warning</h3>
            <p className="mb-4">
              The phase percentages currently add up to {totalPercentage}%, not 100%. 
              This may cause inaccurate phase durations and scheduling.
            </p>
            <div className="flex justify-end space-x-3">
              <Button 
                variant="outline"
                onClick={() => setIsPercentageDialogOpen(false)}
              >
                Adjust Percentages
              </Button>
              <Button
                variant="default"
                onClick={proceedAnyway}
              >
                Proceed Anyway
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}