import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Upload, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const ncrFormSchema = z.object({
  projectId: z.number().min(1, "Please select a project"),
  bayId: z.number().optional(),
  issueTitle: z.string().min(1, "Issue title is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  vehicleModuleSection: z.string().optional(),
  partSubsystemInvolved: z.string().optional(),
  dateIdentified: z.date(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  attachmentUrls: z.array(z.string()).optional(),
  imageUrls: z.array(z.string()).optional(),
});

type NCRFormData = z.infer<typeof ncrFormSchema>;

interface NCRFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function NCRForm({ onSuccess, onCancel }: NCRFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [attachments, setAttachments] = useState<File[]>([]);
  const [images, setImages] = useState<File[]>([]);

  const form = useForm<NCRFormData>({
    resolver: zodResolver(ncrFormSchema),
    defaultValues: {
      dateIdentified: new Date(),
      severity: "medium",
      attachmentUrls: [],
      imageUrls: [],
    },
  });

  // Fetch projects for dropdown
  const { data: projects } = useQuery({
    queryKey: ["/api/projects"],
  });

  // Fetch manufacturing bays for dropdown
  const { data: bays } = useQuery({
    queryKey: ["/api/manufacturing-bays"],
  });

  const createNCRMutation = useMutation({
    mutationFn: (data: NCRFormData) => apiRequest("/api/ncrs", {
      method: "POST",
      body: data,
    }),
    onSuccess: () => {
      toast({
        title: "NCR Created",
        description: "Non-conformance report has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ncrs"] });
      form.reset();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create NCR",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: NCRFormData) => {
    createNCRMutation.mutate(data);
  };

  const handleFileUpload = (files: FileList | null, type: "attachment" | "image") => {
    if (!files) return;
    
    const fileArray = Array.from(files);
    if (type === "attachment") {
      setAttachments(prev => [...prev, ...fileArray]);
    } else {
      setImages(prev => [...prev, ...fileArray]);
    }
  };

  const removeFile = (index: number, type: "attachment" | "image") => {
    if (type === "attachment") {
      setAttachments(prev => prev.filter((_, i) => i !== index));
    } else {
      setImages(prev => prev.filter((_, i) => i !== index));
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "text-red-600 bg-red-50 border-red-200";
      case "high": return "text-orange-600 bg-orange-50 border-orange-200";
      case "medium": return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "low": return "text-green-600 bg-green-50 border-green-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Create Non-Conformance Report</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Project and Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project *</FormLabel>
                    <Select
                      value={field.value?.toString()}
                      onValueChange={(value) => field.onChange(parseInt(value))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projects?.map((project: any) => (
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
                name="bayId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Manufacturing Bay</FormLabel>
                    <Select
                      value={field.value?.toString()}
                      onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select bay (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {bays?.map((bay: any) => (
                          <SelectItem key={bay.id} value={bay.id.toString()}>
                            {bay.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Issue Details */}
            <FormField
              control={form.control}
              name="issueTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Issue Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="Brief description of the non-conformance" {...field} />
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
                  <FormLabel>Detailed Description *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Provide a detailed description of the non-conformance, including what was observed, expected vs actual results, and any immediate actions taken..."
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Additional Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vehicleModuleSection"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle/Module Section</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Electrical Panel, Engine Bay" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="partSubsystemInvolved"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Part/Subsystem Involved</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Radio Mount, Wiring Harness" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Date and Severity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dateIdentified"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date Identified *</FormLabel>
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
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
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
                name="severity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Severity Level *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className={getSeverityColor(field.value)}>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low" className="text-green-600">
                          Low - Minor issue, no impact on function
                        </SelectItem>
                        <SelectItem value="medium" className="text-yellow-600">
                          Medium - Some impact, manageable
                        </SelectItem>
                        <SelectItem value="high" className="text-orange-600">
                          High - Significant impact, requires attention
                        </SelectItem>
                        <SelectItem value="critical" className="text-red-600">
                          Critical - Safety/compliance issue, immediate action
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* File Attachments */}
            <div className="space-y-4">
              <div>
                <Label>Supporting Documents</Label>
                <div className="mt-2">
                  <Input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={(e) => handleFileUpload(e.target.files, "attachment")}
                    className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Upload documents, procedures, or specifications (PDF, DOC, TXT)
                  </p>
                </div>
                {attachments.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index, "attachment")}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <Label>Evidence Photos</Label>
                <div className="mt-2">
                  <Input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e.target.files, "image")}
                    className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Upload photos showing the non-conformance (JPG, PNG, GIF)
                  </p>
                </div>
                {images.length > 0 && (
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                    {images.map((file, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Evidence ${index + 1}`}
                          className="w-full h-20 object-cover rounded border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 h-6 w-6 p-0"
                          onClick={() => removeFile(index, "image")}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* CAPA Auto-trigger Notice */}
            {form.watch("severity") === "high" || form.watch("severity") === "critical" ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-amber-800">
                      <strong>CAPA Required:</strong> This severity level will automatically trigger a Corrective and Preventive Action (CAPA) process.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Form Actions */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createNCRMutation.isPending}
                className="min-w-[120px]"
              >
                {createNCRMutation.isPending ? "Creating..." : "Create NCR"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}