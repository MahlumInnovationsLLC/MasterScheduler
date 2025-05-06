import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2, Upload, X, AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { insertDeliveryTrackingSchema, type Project } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { Separator } from "@/components/ui/separator";
import { differenceInCalendarDays } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import * as XLSX from "xlsx";

// Define props interface
interface DeliveryTrackingFormProps {
  projects: Project[];
  editData?: any; // Optional data for editing existing records
  onSuccess?: () => void;
}

// Extend the insert schema to add client-side validation
const deliveryTrackingFormSchema = insertDeliveryTrackingSchema.extend({
  // Override date fields to use proper Date objects for the form
  originalEstimatedDate: z.date({
    required_error: "Original estimated delivery date is required",
  }),
  revisedEstimatedDate: z.date().optional().nullable(),
  actualDeliveryDate: z.date().optional().nullable(),
});

// Define form values type based on the schema
type DeliveryTrackingFormValues = z.infer<typeof deliveryTrackingFormSchema>;

export const DeliveryTrackingForm: React.FC<DeliveryTrackingFormProps> = ({
  projects,
  editData,
  onSuccess
}) => {
  // Initialize form with default values or edit data
  const form = useForm<DeliveryTrackingFormValues>({
    resolver: zodResolver(deliveryTrackingFormSchema),
    defaultValues: editData || {
      projectId: undefined,
      originalEstimatedDate: undefined,
      revisedEstimatedDate: null,
      actualDeliveryDate: null,
      daysLate: null,
      delayResponsibility: "not_applicable",
      delayReason: "",
      delayNotes: "",
    },
  });

  // Mutation for creating a delivery tracking record
  const createMutation = useMutation({
    mutationFn: async (data: DeliveryTrackingFormValues) => {
      // Convert Date objects to ISO strings for API
      const apiData = {
        ...data,
        originalEstimatedDate: data.originalEstimatedDate.toISOString(),
        revisedEstimatedDate: data.revisedEstimatedDate 
          ? data.revisedEstimatedDate.toISOString() 
          : null,
        actualDeliveryDate: data.actualDeliveryDate 
          ? data.actualDeliveryDate.toISOString() 
          : null,
      };
      
      return await apiRequest("/api/delivery-tracking", {
        method: "POST",
        body: apiData
      });
    },
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/delivery-tracking"] });
      queryClient.invalidateQueries({ queryKey: ["/api/delivery-tracking/analytics"] });
      
      // Reset form
      form.reset();
      
      // Call success handler if provided
      if (onSuccess) {
        onSuccess();
      }
    },
  });

  // Update mutation for editing existing records
  const updateMutation = useMutation({
    mutationFn: async (data: DeliveryTrackingFormValues & { id: number }) => {
      const { id, ...rest } = data;
      
      // Convert Date objects to ISO strings for API
      const apiData = {
        ...rest,
        originalEstimatedDate: data.originalEstimatedDate.toISOString(),
        revisedEstimatedDate: data.revisedEstimatedDate 
          ? data.revisedEstimatedDate.toISOString() 
          : null,
        actualDeliveryDate: data.actualDeliveryDate 
          ? data.actualDeliveryDate.toISOString() 
          : null,
      };
      
      return await apiRequest(`/api/delivery-tracking/${id}`, {
        method: "PUT",
        body: apiData
      });
    },
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/delivery-tracking"] });
      queryClient.invalidateQueries({ queryKey: ["/api/delivery-tracking/analytics"] });
      
      // Call success handler if provided
      if (onSuccess) {
        onSuccess();
      }
    },
  });

  // On form submit
  const onSubmit = (values: DeliveryTrackingFormValues) => {
    // Calculate days late if both dates are provided and daysLate isn't set
    if (values.actualDeliveryDate && values.originalEstimatedDate && !values.daysLate) {
      values.daysLate = differenceInCalendarDays(
        values.actualDeliveryDate,
        values.originalEstimatedDate
      );
    }
    
    // Update existing record or create new one
    if (editData?.id) {
      updateMutation.mutate({
        ...values,
        id: editData.id,
      });
    } else {
      createMutation.mutate(values);
    }
  };

  // Calculate days late when dates change
  const calculateDaysLate = () => {
    const originalDate = form.watch("originalEstimatedDate");
    const actualDate = form.watch("actualDeliveryDate");
    
    if (originalDate && actualDate) {
      const days = differenceInCalendarDays(actualDate, originalDate);
      form.setValue("daysLate", days);
      
      // Set responsibility based on days late
      if (days > 0 && form.watch("delayResponsibility") === "not_applicable") {
        form.setValue("delayResponsibility", "nomad_fault");
      } else if (days <= 0) {
        form.setValue("delayResponsibility", "not_applicable");
      }
    }
  };

  // Watch for changes in dates to auto-calculate days late
  React.useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "originalEstimatedDate" || name === "actualDeliveryDate") {
        calculateDaysLate();
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form.watch]);

  // Excel import functionality
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importStatus, setImportStatus] = useState<{
    status: 'idle' | 'loading' | 'success' | 'error';
    message: string;
    progress: number;
    results?: {
      imported: number;
      errors: number;
      details: string[];
    };
  }>({
    status: 'idle',
    message: '',
    progress: 0
  });
  
  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (data: any[]) => {
      return await apiRequest("/api/import/delivery-tracking", {
        method: "POST",
        body: data
      });
    },
    onSuccess: (response) => {
      // Update status
      setImportStatus({
        status: 'success',
        message: `Successfully imported ${response.results.imported} records with ${response.results.errors} errors`,
        progress: 100,
        results: response.results
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/delivery-tracking"] });
      queryClient.invalidateQueries({ queryKey: ["/api/delivery-tracking/analytics"] });
      
      // Call success handler if provided
      if (onSuccess) {
        setTimeout(onSuccess, 1500); // Delay to allow user to see results
      }
    },
    onError: (error: any) => {
      setImportStatus({
        status: 'error',
        message: `Import failed: ${error.message || 'Unknown error'}`,
        progress: 0
      });
    }
  });
  
  // Handle file selection for Excel import
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Update status
    setImportStatus({
      status: 'loading',
      message: 'Reading Excel file...',
      progress: 10
    });
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        setImportStatus({
          status: 'loading',
          message: 'Processing data...',
          progress: 40
        });
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        console.log('Parsed Excel data:', jsonData);
        
        if (!jsonData || jsonData.length === 0) {
          setImportStatus({
            status: 'error',
            message: 'No data found in Excel file',
            progress: 0
          });
          return;
        }
        
        // Update status
        setImportStatus({
          status: 'loading',
          message: `Importing ${jsonData.length} records...`,
          progress: 70
        });
        
        // Submit the data to the import API
        importMutation.mutate(jsonData);
        
      } catch (error: any) {
        console.error('Error processing Excel file:', error);
        setImportStatus({
          status: 'error',
          message: `Error processing Excel file: ${error.message || 'Unknown error'}`,
          progress: 0
        });
      }
    };
    
    reader.onerror = () => {
      setImportStatus({
        status: 'error',
        message: 'Failed to read file',
        progress: 0
      });
    };
    
    reader.readAsArrayBuffer(file);
  };
  
  const resetImport = () => {
    setImportStatus({
      status: 'idle',
      message: '',
      progress: 0
    });
  };
  
  const isLoading = createMutation.isPending || updateMutation.isPending || importMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Project Selection */}
        <FormField
          control={form.control}
          name="projectId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project</FormLabel>
              <Select
                disabled={isLoading}
                onValueChange={(value) => field.onChange(parseInt(value))}
                defaultValue={field.value?.toString()}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.projectNumber}: {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Select the project to track delivery for
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Original Estimated Date */}
          <FormField
            control={form.control}
            name="originalEstimatedDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Original Estimated Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                        disabled={isLoading}
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
                      disabled={isLoading}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  The original date the project was estimated to be delivered
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Revised Estimated Date */}
          <FormField
            control={form.control}
            name="revisedEstimatedDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Revised Estimated Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                        disabled={isLoading}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date (optional)</span>
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
                      disabled={isLoading}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  Updated delivery date if the estimate changed
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Actual Delivery Date */}
          <FormField
            control={form.control}
            name="actualDeliveryDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Actual Delivery Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                        disabled={isLoading}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date (optional)</span>
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
                      disabled={isLoading}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  The date the project was actually delivered
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Days Late */}
          <FormField
            control={form.control}
            name="daysLate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Days Late</FormLabel>
                <FormControl>
                  <input
                    type="number"
                    disabled={isLoading}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    {...field}
                    onChange={(e) => {
                      const value = e.target.value === "" ? null : parseInt(e.target.value);
                      field.onChange(value);
                    }}
                    value={field.value === null ? "" : field.value}
                  />
                </FormControl>
                <FormDescription>
                  Automatically calculated from dates (negative values = early)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Delay Responsibility */}
          <FormField
            control={form.control}
            name="delayResponsibility"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Responsibility</FormLabel>
                <Select
                  disabled={isLoading}
                  onValueChange={field.onChange}
                  value={field.value as string || "not_applicable"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select responsibility" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="nomad_fault">Nomad Fault</SelectItem>
                    <SelectItem value="vendor_fault">Vendor Fault</SelectItem>
                    <SelectItem value="client_fault">Client Fault</SelectItem>
                    <SelectItem value="not_applicable">Not Applicable</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Who is responsible for any delay in the delivery
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Delay Reason */}
        <FormField
          control={form.control}
          name="delayReason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Delay Reason</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Explain the reason for any delay"
                  className="resize-none"
                  disabled={isLoading}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  ref={field.ref}
                  name={field.name}
                  value={field.value || ""}
                />
              </FormControl>
              <FormDescription>
                Brief explanation of what caused the delay
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Additional Notes */}
        <FormField
          control={form.control}
          name="delayNotes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Additional Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Any additional information about the delivery"
                  className="resize-none"
                  disabled={isLoading}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  ref={field.ref}
                  name={field.name}
                  value={field.value || ""}
                />
              </FormControl>
              <FormDescription>
                Additional context, details on corrective actions, etc.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {editData ? "Update Record" : "Create Record"}
        </Button>
        
        {/* Excel Import Button */}
        <Button 
          type="button" 
          variant="outline" 
          className="mt-4 w-full md:w-auto md:mt-0 md:ml-2"
          onClick={() => setIsImportDialogOpen(true)}
          disabled={isLoading}
        >
          <Upload className="mr-2 h-4 w-4" />
          Import from Excel
        </Button>
      </form>
      
      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Delivery Tracking Data</DialogTitle>
            <DialogDescription>
              Upload an Excel file with delivery tracking data to import multiple records at once.
            </DialogDescription>
          </DialogHeader>
          
          {/* Upload Area */}
          <div className="grid gap-4 py-4">
            {importStatus.status === 'idle' && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  type="file"
                  id="excel-upload"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isLoading}
                />
                <label 
                  htmlFor="excel-upload" 
                  className="cursor-pointer flex flex-col items-center justify-center"
                >
                  <Upload className="h-10 w-10 text-gray-400 mb-2" />
                  <span className="text-sm font-medium">Click to upload Excel file</span>
                  <span className="text-xs text-gray-500 mt-1">
                    Supports .xlsx, .xls files
                  </span>
                </label>
              </div>
            )}
            
            {/* Progress Indicator */}
            {importStatus.status === 'loading' && (
              <div className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">{importStatus.message}</span>
                  <span className="text-sm font-medium">{importStatus.progress}%</span>
                </div>
                <Progress value={importStatus.progress} className="h-2" />
              </div>
            )}
            
            {/* Success State */}
            {importStatus.status === 'success' && (
              <Alert className="border-green-500 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Import Successful</AlertTitle>
                <AlertDescription className="text-green-700">
                  {importStatus.message}
                  {importStatus.results && importStatus.results.errors > 0 && (
                    <div className="mt-2">
                      <details>
                        <summary className="cursor-pointer text-sm font-medium">View error details</summary>
                        <ul className="mt-2 text-xs list-disc pl-5">
                          {importStatus.results.details.map((detail, i) => (
                            <li key={i} className="mb-1">{detail}</li>
                          ))}
                        </ul>
                      </details>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
            
            {/* Error State */}
            {importStatus.status === 'error' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Import Failed</AlertTitle>
                <AlertDescription>
                  {importStatus.message}
                </AlertDescription>
              </Alert>
            )}
          </div>
          
          <DialogFooter className="sm:justify-between">
            {importStatus.status !== 'idle' && (
              <Button
                type="button"
                variant="outline"
                onClick={resetImport}
                className="mr-auto"
              >
                {importStatus.status === 'success' ? 'Import Another File' : 'Try Again'}
              </Button>
            )}
            <Button
              type="button"
              variant={importStatus.status === 'success' ? 'default' : 'outline'}
              onClick={() => setIsImportDialogOpen(false)}
            >
              {importStatus.status === 'success' ? 'Done' : 'Cancel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Form>
  );
};