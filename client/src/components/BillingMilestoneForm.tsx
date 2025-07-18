import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Form validation schema
const formSchema = z.object({
  projectId: z.number(),
  name: z.string().min(1, "Milestone name is required"),
  description: z.string().optional(),
  amount: z.string()
    .min(1, "Amount is required")
    .refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
      message: "Amount must be a positive number",
    }),
  targetInvoiceDate: z.string().optional(),
  actualInvoiceDate: z.string().optional(),
  paymentReceivedDate: z.string().optional(),
  status: z.enum(["upcoming", "invoiced", "paid", "delayed", "billed"]),
  // Delivery milestone flag
  isDeliveryMilestone: z.boolean().default(false),
  // Live date tracking for approval workflow
  liveDate: z.string().optional(),
  shipDateChanged: z.boolean().default(false),

  // New fields
  contractReference: z.string().optional(),
  paymentTerms: z.string().optional(),
  invoiceNumber: z.string().optional(),
  percentageOfTotal: z.string().optional(),
  billingContact: z.string().optional(),
  notes: z.string().optional(),
});

export type BillingMilestoneFormValues = z.infer<typeof formSchema>;

interface BillingMilestoneFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: Partial<BillingMilestoneFormValues>;
  projectId?: number;
  isEdit?: boolean;
  milestoneId?: number;
}

export const BillingMilestoneForm: React.FC<BillingMilestoneFormProps> = ({
  open,
  onOpenChange,
  defaultValues,
  projectId,
  isEdit = false,
  milestoneId,
}) => {
  const { toast } = useToast();
  
  // Get all projects for dropdown
  const { data: projects, isLoading: isLoadingProjects } = useQuery({
    queryKey: ['/api/projects'],
  });

  // Get existing milestone data for editing
  const { data: existingMilestone, isLoading: isLoadingMilestone } = useQuery({
    queryKey: ['/api/billing-milestones', milestoneId],
    queryFn: async () => {
      if (!isEdit || !milestoneId) return null;
      const response = await fetch(`/api/billing-milestones/${milestoneId}`);
      if (!response.ok) throw new Error('Failed to fetch milestone');
      return response.json();
    },
    enabled: isEdit && !!milestoneId,
  });

  // Define form with defaultValues, using existing milestone data when editing
  const form = useForm<BillingMilestoneFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEdit && existingMilestone ? {
      projectId: existingMilestone.projectId,
      name: existingMilestone.name,
      description: existingMilestone.description || "",
      amount: existingMilestone.amount,
      targetInvoiceDate: existingMilestone.targetInvoiceDate || "",
      actualInvoiceDate: existingMilestone.actualInvoiceDate || "",
      paymentReceivedDate: existingMilestone.paymentReceivedDate || "",
      status: existingMilestone.status || "upcoming",
      isDeliveryMilestone: existingMilestone.isDeliveryMilestone || false,
      liveDate: existingMilestone.liveDate || "",
      shipDateChanged: existingMilestone.shipDateChanged || false,
    } : {
      projectId: projectId || 0,
      name: "",
      description: "",
      amount: "",
      targetInvoiceDate: format(new Date(), "yyyy-MM-dd"),
      actualInvoiceDate: "",
      paymentReceivedDate: "",
      status: "upcoming",
      isDeliveryMilestone: false,
      liveDate: "",
      shipDateChanged: false,
      ...defaultValues,
    },
  });

  // Reset form when existingMilestone data loads
  React.useEffect(() => {
    if (isEdit && existingMilestone) {
      form.reset({
        projectId: existingMilestone.projectId,
        name: existingMilestone.name,
        description: existingMilestone.description || "",
        amount: existingMilestone.amount,
        targetInvoiceDate: existingMilestone.targetInvoiceDate || "",
        actualInvoiceDate: existingMilestone.actualInvoiceDate || "",
        paymentReceivedDate: existingMilestone.paymentReceivedDate || "",
        status: existingMilestone.status || "upcoming",
        isDeliveryMilestone: existingMilestone.isDeliveryMilestone || false,
        // Additional billing information fields
        contractReference: existingMilestone.contractReference || "",
        paymentTerms: existingMilestone.paymentTerms || "",
        invoiceNumber: existingMilestone.invoiceNumber || "",
        percentageOfTotal: existingMilestone.percentageOfTotal || "",
        billingContact: existingMilestone.billingContact || "",
        notes: existingMilestone.notes || "",
        liveDate: existingMilestone.liveDate || "",
        shipDateChanged: existingMilestone.shipDateChanged || false,
      });
    }
  }, [isEdit, existingMilestone, form]);

  // Create mutation for adding new milestone
  const createMutation = useMutation({
    mutationFn: async (data: BillingMilestoneFormValues) => {
      console.log("🚀 Form submission data:", JSON.stringify(data, null, 2));
      
      const requestData = {
        ...data,
        // Convert empty strings to null for date fields to prevent database errors
        targetInvoiceDate: data.targetInvoiceDate || null,
        actualInvoiceDate: data.actualInvoiceDate || null,
        paymentReceivedDate: data.paymentReceivedDate || null,
        liveDate: data.liveDate || null,
        shipDateChanged: data.shipDateChanged || false,
        // Keep amount as string since the schema expects it
        amount: data.amount,
      };
      
      console.log("📤 Sending to API:", JSON.stringify(requestData, null, 2));
      
      return await apiRequest("POST", "/api/billing-milestones", requestData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Billing milestone created successfully",
      });
      
      // Enable cache invalidation so data appears immediately
      queryClient.invalidateQueries({ queryKey: ['/api/billing-milestones'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      
      // If projectId is set, also invalidate project-specific queries
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'billing-milestones'] });
      }
      
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create billing milestone: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update mutation for editing an existing milestone
  const updateMutation = useMutation({
    mutationFn: async (data: BillingMilestoneFormValues) => {
      const requestData = {
        ...data,
        // Convert empty strings to null for date fields to prevent database errors
        targetInvoiceDate: data.targetInvoiceDate || null,
        actualInvoiceDate: data.actualInvoiceDate || null,
        paymentReceivedDate: data.paymentReceivedDate || null,
        liveDate: data.liveDate || null,
        shipDateChanged: data.shipDateChanged || false,
        // Keep amount as string since the schema expects it
        amount: data.amount,
      };

      // Check if this is NOT a delivery milestone - for non-delivery milestones,
      // when dates are updated from project page, update liveDate and flag for approval
      if (!data.isDeliveryMilestone && existingMilestone) {
        // Check if any date fields have changed
        const dateFieldsChanged = 
          data.targetInvoiceDate !== existingMilestone.targetInvoiceDate ||
          data.actualInvoiceDate !== existingMilestone.actualInvoiceDate ||
          data.paymentReceivedDate !== existingMilestone.paymentReceivedDate;

        if (dateFieldsChanged) {
          // Update liveDate with the most recent date change
          const newLiveDate = data.actualInvoiceDate || data.paymentReceivedDate || data.targetInvoiceDate;
          if (newLiveDate) {
            requestData.liveDate = newLiveDate;
            
            // Flag for approval if liveDate differs from targetInvoiceDate
            if (data.targetInvoiceDate && newLiveDate !== data.targetInvoiceDate) {
              requestData.shipDateChanged = true;
            }
          }
        }
      }
      
      return await apiRequest("PUT", `/api/billing-milestones/${milestoneId}`, requestData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Billing milestone updated successfully",
      });
      
      // Enable cache invalidation so data appears immediately
      queryClient.invalidateQueries({ queryKey: ['/api/billing-milestones'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      
      // If projectId is set, also invalidate project-specific queries
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'billing-milestones'] });
      }
      
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update billing milestone: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  function onSubmit(values: BillingMilestoneFormValues) {
    if (isEdit && milestoneId) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[95vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{isEdit ? "Edit Billing Milestone" : "Add New Billing Milestone"}</DialogTitle>
          <DialogDescription>
            {isEdit 
              ? "Update the details of this billing milestone." 
              : "Create a new billing milestone for a project."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
            <div className="overflow-y-auto pr-2 flex-1 space-y-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value?.toString()}
                      disabled={isPending || isLoadingProjects || projectId !== undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a project" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projects?.map((project) => (
                          <SelectItem key={project.id} value={project.id.toString()}>
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
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Milestone Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Initial Payment, Project Completion"
                        {...field}
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the milestone..."
                        {...field}
                        disabled={isPending}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount ($)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="0.00"
                        {...field}
                        type="number"
                        step="0.01"
                        min="0"
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="targetInvoiceDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Invoice Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={isPending}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="upcoming">Upcoming</SelectItem>
                          <SelectItem value="invoiced">Invoiced</SelectItem>
                          <SelectItem value="billed">Billed</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="delayed">Delayed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Show additional fields based on status */}
              {(form.watch("status") === "invoiced" || form.watch("status") === "billed" || form.watch("status") === "paid" || form.watch("status") === "delayed") && (
                <FormField
                  control={form.control}
                  name="actualInvoiceDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Actual Invoice Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          disabled={isPending}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {form.watch("status") === "paid" && (
                <FormField
                  control={form.control}
                  name="paymentReceivedDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Received Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          disabled={isPending}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Delivery Milestone Checkbox */}
              <FormField
                control={form.control}
                name="isDeliveryMilestone"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          className="form-checkbox h-5 w-5 text-primary"
                          checked={field.value}
                          onChange={field.onChange}
                          id="isDeliveryMilestone"
                        />
                        <label 
                          htmlFor="isDeliveryMilestone" 
                          className="text-sm font-medium leading-none cursor-pointer"
                        >
                          This is a delivery milestone
                        </label>
                      </div>
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormDescription>
                        When checked, this milestone's target date will be synchronized with the project's delivery date
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {/* Additional Billing Information Section */}
              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-medium mb-4">Additional Billing Information</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <FormField
                    control={form.control}
                    name="contractReference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contract Reference</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Contract #"
                            {...field}
                            disabled={isPending}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="invoiceNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invoice Number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Invoice #"
                            {...field}
                            disabled={isPending}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <FormField
                    control={form.control}
                    name="paymentTerms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Terms</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Net 30, etc."
                            {...field}
                            disabled={isPending}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="percentageOfTotal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Percentage of Total</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., 25%"
                            {...field}
                            disabled={isPending}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="billingContact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Billing Contact</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Contact name or email"
                          {...field}
                          disabled={isPending}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any additional notes about this billing milestone..."
                          {...field}
                          disabled={isPending}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <div className="flex-shrink-0 pt-4 border-t">
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEdit ? "Update Milestone" : "Add Milestone"}
                </Button>
              </DialogFooter>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default BillingMilestoneForm;