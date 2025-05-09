import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { z } from "zod";
import { format } from "date-fns";

import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { CalendarIcon, Loader2, AlertTriangle } from "lucide-react";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Define the sales deal schema for form validation
const salesDealSchema = z.object({
  dealNumber: z.string().min(1, "Deal number is required"),
  name: z.string().min(1, "Deal name is required"),
  description: z.string().optional().nullable(),
  clientName: z.string().min(1, "Client name is required"),
  clientLocation: z.string().optional().nullable(),
  clientContactName: z.string().optional().nullable(),
  clientContactEmail: z.string().email().optional().nullable(),
  value: z.coerce.number().gte(0, "Value must be a positive number").optional().nullable(),
  currency: z.string().default("USD"),
  dealType: z.enum(["unsolicited_bid", "unfinanced_restrict", "developed_direct", "developed_public_bid"]),
  dealStage: z.enum(["verbal_commit", "project_launch", "site_core_activity", "submit_decide", "not_started"]),
  createdDate: z.date().optional().nullable(),
  expectedCloseDate: z.date().optional().nullable(),
  actualCloseDate: z.date().optional().nullable(),
  lastContactDate: z.date().optional().nullable(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  probability: z.coerce.number().min(0).max(100).default(50),
  notes: z.string().optional().nullable(),
  vertical: z.string().optional().nullable(),
});

type SalesDealFormValues = z.infer<typeof salesDealSchema>;

function SalesDealEdit() {
  const params = useParams<{ id: string }>();
  const dealId = parseInt(params.id);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Fetch the sales deal data
  const { data: deal, isLoading, error } = useQuery({
    queryKey: [`/api/sales-deals/${dealId}`],
    queryFn: async () => {
      const res = await fetch(`/api/sales-deals/${dealId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch sales deal");
      }
      return res.json();
    },
  });

  // Set up the form with default values
  const form = useForm<SalesDealFormValues>({
    resolver: zodResolver(salesDealSchema),
    defaultValues: {
      dealNumber: "",
      name: "",
      description: "",
      clientName: "",
      clientLocation: "",
      clientContactName: "",
      clientContactEmail: "",
      value: 0,
      currency: "USD",
      dealType: "unsolicited_bid",
      dealStage: "verbal_commit",
      createdDate: null,
      expectedCloseDate: null,
      actualCloseDate: null,
      lastContactDate: null,
      priority: "medium",
      probability: 50,
      notes: "",
      vertical: "",
    },
  });

  // Update form when deal data is loaded
  useEffect(() => {
    if (deal) {
      // Convert date strings to Date objects
      const formattedDeal = {
        ...deal,
        createdDate: deal.createdDate ? new Date(deal.createdDate) : null,
        expectedCloseDate: deal.expectedCloseDate ? new Date(deal.expectedCloseDate) : null,
        actualCloseDate: deal.actualCloseDate ? new Date(deal.actualCloseDate) : null,
        lastContactDate: deal.lastContactDate ? new Date(deal.lastContactDate) : null,
      };
      form.reset(formattedDeal);
    }
  }, [deal, form]);

  // Mutation to update a sales deal
  const updateDealMutation = useMutation({
    mutationFn: async (data: SalesDealFormValues) => {
      // Format dates for API
      const formattedData = {
        ...data,
        createdDate: data.createdDate ? format(data.createdDate, "yyyy-MM-dd") : null,
        expectedCloseDate: data.expectedCloseDate ? format(data.expectedCloseDate, "yyyy-MM-dd") : null,
        actualCloseDate: data.actualCloseDate ? format(data.actualCloseDate, "yyyy-MM-dd") : null,
        lastContactDate: data.lastContactDate ? format(data.lastContactDate, "yyyy-MM-dd") : null,
      };
      
      const res = await apiRequest("PUT", `/api/sales-deals/${dealId}`, formattedData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-deals"] });
      queryClient.invalidateQueries({ queryKey: [`/api/sales-deals/${dealId}`] });
      toast({
        title: "Success",
        description: "Sales deal updated successfully",
      });
      navigate("/sales-forecast");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update sales deal: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Mutation to delete a sales deal
  const deleteDealMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/sales-deals/${dealId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-deals"] });
      toast({
        title: "Success",
        description: "Sales deal deleted successfully",
      });
      navigate("/sales-forecast");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete sales deal: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: SalesDealFormValues) {
    updateDealMutation.mutate(data);
  }

  function handleDelete() {
    setIsDeleteDialogOpen(false);
    deleteDealMutation.mutate();
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] p-4">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-bold mb-2">Error Loading Sales Deal</h2>
        <p className="text-muted-foreground mb-4">{error?.message || "Failed to load sales deal data"}</p>
        <Button onClick={() => navigate("/sales-forecast")}>Return to Sales Forecast</Button>
      </div>
    );
  }

  return (
    <div className="container py-6 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Edit Sales Deal</h1>
          <p className="text-muted-foreground">
            {deal.dealNumber} - {deal.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/sales-forecast")}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
            Delete
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="dealNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deal Number</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          disabled={user?.role !== 'admin'} 
                          placeholder="Example: 8-12345"
                        />
                      </FormControl>
                      <FormDescription>
                        {user?.role === 'admin' ? 'All deal numbers should start with "8-"' : 'Only admins can edit deal numbers'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deal Name *</FormLabel>
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
                      <Textarea
                        {...field}
                        value={field.value || ""}
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="clientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Name *</FormLabel>
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
                        <Input {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="clientContactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Name</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} />
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
                        <Input {...field} type="email" value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <FormField
                      control={form.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem className="w-[100px]">
                          <FormLabel>Currency</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="USD" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="USD">USD</SelectItem>
                              <SelectItem value="EUR">EUR</SelectItem>
                              <SelectItem value="GBP">GBP</SelectItem>
                              <SelectItem value="JPY">JPY</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="value"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Deal Value</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              placeholder="Amount"
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="probability"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Probability (%)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="0"
                          max="100"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
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
                            <SelectValue placeholder="Select type" />
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
                            <SelectValue placeholder="Select stage" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="verbal_commit">Verbal Commit</SelectItem>
                          <SelectItem value="project_launch">Project Launch</SelectItem>
                          <SelectItem value="site_core_activity">Site Core Activity</SelectItem>
                          <SelectItem value="submit_decide">Submit & Decide</SelectItem>
                          <SelectItem value="not_started">Not Started</SelectItem>
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
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                                "w-full pl-3 text-left font-normal",
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
                                "w-full pl-3 text-left font-normal",
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

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value || ""}
                        rows={4}
                      />
                    </FormControl>
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
                      <Select
                        value={field.value || ""}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select vertical" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="East">East</SelectItem>
                          <SelectItem value="West">West</SelectItem>
                          <SelectItem value="North">North</SelectItem>
                          <SelectItem value="South">South</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => navigate("/sales-forecast")}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateDealMutation.isPending}>
                  {updateDealMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Sales Deal</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this sales deal? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteDealMutation.isPending}
            >
              {deleteDealMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SalesDealEdit;