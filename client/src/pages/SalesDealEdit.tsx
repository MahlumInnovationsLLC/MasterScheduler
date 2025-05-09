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
  FormDescription,
} from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, ChevronLeft, Loader2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
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

// Define the sales deal schema
const salesDealSchema = z.object({
  dealNumber: z.string().min(1, 'Deal number is required'),
  name: z.string().min(1, 'Deal name is required'),
  description: z.string().optional(),
  
  // Client information
  clientName: z.string().min(1, 'Client name is required'),
  clientLocation: z.string().optional(),
  clientContactName: z.string().optional(),
  clientContactEmail: z.string().email().optional().or(z.literal('')),
  
  // Deal details
  value: z.preprocess(
    (val) => (val === '' ? undefined : Number(val)),
    z.number().min(0, 'Value must be a positive number').optional()
  ),
  currency: z.string().default('USD'),
  dealType: z.enum(['unsolicited_bid', 'unfinanced_restrict', 'developed_direct', 'developed_public_bid']),
  dealStage: z.enum(['verbal_commit', 'project_launch', 'site_core_activity', 'submit_decide', 'not_started']),
  
  // Dates
  createdDate: z.date().optional(),
  expectedCloseDate: z.date().optional(),
  actualCloseDate: z.date().optional(),
  lastContactDate: z.date().optional(),
  
  // Status
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  probability: z.preprocess(
    (val) => (val === '' ? 50 : Number(val)),
    z.number().min(0).max(100).default(50)
  ),
  notes: z.string().optional(),
  vertical: z.string().optional(),
});

type SalesDealFormValues = z.infer<typeof salesDealSchema>;

function SalesDealEdit() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('general');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingDeal, setDeletingDeal] = useState(false);

  // Extract deal ID from the URL
  const currentPath = window.location.pathname;
  const dealId = currentPath.split('/')[2]; // Get ID from /sales-deal/:id/edit

  // Fetch sales deal data
  const { data: salesDeal, isLoading, error } = useQuery({
    queryKey: [`/api/sales-deals/${dealId}`],
    enabled: !!dealId,
  });

  // Create form with react-hook-form
  const form = useForm<SalesDealFormValues>({
    resolver: zodResolver(salesDealSchema),
    defaultValues: {
      dealNumber: '',
      name: '',
      description: '',
      clientName: '',
      clientLocation: '',
      clientContactName: '',
      clientContactEmail: '',
      value: undefined,
      currency: 'USD',
      dealType: 'developed_direct',
      dealStage: 'not_started',
      priority: 'medium',
      probability: 50,
      notes: '',
      vertical: '',
    },
  });

  // Update form when sales deal data is loaded
  useEffect(() => {
    if (salesDeal) {
      form.reset({
        dealNumber: salesDeal.dealNumber || '',
        name: salesDeal.name || '',
        description: salesDeal.description || '',
        clientName: salesDeal.clientName || '',
        clientLocation: salesDeal.clientLocation || '',
        clientContactName: salesDeal.clientContactName || '',
        clientContactEmail: salesDeal.clientContactEmail || '',
        value: salesDeal.value ? Number(salesDeal.value) : undefined,
        currency: salesDeal.currency || 'USD',
        dealType: salesDeal.dealType,
        dealStage: salesDeal.dealStage,
        createdDate: salesDeal.createdDate ? new Date(salesDeal.createdDate) : undefined,
        expectedCloseDate: salesDeal.expectedCloseDate ? new Date(salesDeal.expectedCloseDate) : undefined,
        actualCloseDate: salesDeal.actualCloseDate ? new Date(salesDeal.actualCloseDate) : undefined,
        lastContactDate: salesDeal.lastContactDate ? new Date(salesDeal.lastContactDate) : undefined,
        priority: salesDeal.priority || 'medium',
        probability: salesDeal.probability ? Number(salesDeal.probability) : 50,
        notes: salesDeal.notes || '',
        vertical: salesDeal.vertical || '',
      });
    }
  }, [salesDeal, form]);

  // Mutations for updating and deleting deals
  const updateMutation = useMutation({
    mutationFn: async (data: SalesDealFormValues) => {
      // Fix for date timezone issues - ensure all dates are set to noon UTC
      const fixedData = { ...data };
      
      // Process all date fields to ensure consistent UTC handling
      Object.keys(fixedData).forEach(key => {
        if (fixedData[key] instanceof Date) {
          // Create a new date at noon UTC which prevents timezone issues
          const date = new Date(fixedData[key]);
          const utcDate = new Date(Date.UTC(
            date.getFullYear(), 
            date.getMonth(), 
            date.getDate(), 
            12, 0, 0
          ));
          fixedData[key] = utcDate;
        }
      });
      
      const res = await apiRequest('PUT', `/api/sales-deals/${dealId}`, fixedData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: [`/api/sales-deals/${dealId}`]});
      queryClient.invalidateQueries({queryKey: ['/api/sales-deals']});
      toast({
        title: 'Deal updated',
        description: 'The sales deal has been updated successfully',
      });
      navigate(`/sales-forecast`);
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating deal',
        description: error.message || 'Failed to update sales deal',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      setDeletingDeal(true);
      const res = await apiRequest('DELETE', `/api/sales-deals/${dealId}`);
      return res.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['/api/sales-deals']});
      toast({
        title: 'Deal deleted',
        description: 'The sales deal has been deleted successfully',
      });
      navigate('/sales-forecast');
    },
    onError: (error: any) => {
      setDeletingDeal(false);
      toast({
        title: 'Error deleting deal',
        description: error.message || 'Failed to delete sales deal',
        variant: 'destructive',
      });
    },
  });

  function onSubmit(data: SalesDealFormValues) {
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
          <h3 className="text-lg font-semibold mb-2">Error loading sales deal</h3>
          <p>{(error as Error).message || 'Failed to load sales deal details'}</p>
        </div>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/sales-forecast')}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Sales Pipeline
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate(`/sales-forecast`)}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              Edit Deal {salesDeal ? `- ${salesDeal.dealNumber}: ${salesDeal.name}` : ''}
            </h1>
            <p className="text-gray-400 text-sm">Update sales deal details, timeline, and settings</p>
          </div>
        </div>
        
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">Delete Deal</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the sales deal
                and all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700"
                disabled={deletingDeal}
              >
                {deletingDeal ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : 'Delete Deal'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="client">Client Details</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Deal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="dealNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Deal Number</FormLabel>
                          <FormControl>
                            <Input {...field} />
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
                          <FormLabel>Deal Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
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
                          <Textarea rows={3} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="dealType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Deal Type</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select deal type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="unsolicited_bid">Unsolicited Bid</SelectItem>
                              <SelectItem value="unfinanced_restrict">Unfinanced Restrict</SelectItem>
                              <SelectItem value="developed_direct">Developed Direct</SelectItem>
                              <SelectItem value="developed_public_bid">Developed Public Bid</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="dealStage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Deal Stage</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select deal stage" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="not_started">Not Started</SelectItem>
                              <SelectItem value="verbal_commit">Verbal Commit</SelectItem>
                              <SelectItem value="project_launch">Project Launch</SelectItem>
                              <SelectItem value="site_core_activity">Site/Core Activity</SelectItem>
                              <SelectItem value="submit_decide">Submit/Decide</SelectItem>
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
                      name="value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Value ($)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              value={field.value || ''} 
                              onChange={e => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Currency</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select currency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="USD">USD</SelectItem>
                              <SelectItem value="EUR">EUR</SelectItem>
                              <SelectItem value="GBP">GBP</SelectItem>
                              <SelectItem value="CAD">CAD</SelectItem>
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
                      name="vertical"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vertical</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormDescription>
                            Business vertical (e.g., Education, Finance)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Probability Assessment</CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="probability"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Close Probability: {field.value}%
                        </FormLabel>
                        <FormControl>
                          <Slider
                            value={[field.value]}
                            min={0}
                            max={100}
                            step={5}
                            onValueChange={(value) => field.onChange(value[0])}
                            className="mt-2"
                          />
                        </FormControl>
                        <FormDescription>
                          Estimate the probability of this deal closing
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="client" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Client Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="clientName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="clientLocation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client Location</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="clientContactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="clientContactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="timeline" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Deal Timeline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="createdDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Deal Created Date</FormLabel>
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
                      name="expectedCloseDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Expected Close Date</FormLabel>
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
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="actualCloseDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Actual Close Date</FormLabel>
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
                      name="lastContactDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Last Contact Date</FormLabel>
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

            <TabsContent value="notes" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Deal Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea rows={8} placeholder="Enter detailed notes about this deal..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/sales-forecast')}
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
              ) : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

export default SalesDealEdit;