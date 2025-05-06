import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { insertProjectMilestoneSchema } from "@shared/schema";

// Extended schema with client-side validation
const milestoneFormSchema = insertProjectMilestoneSchema.extend({
  name: z.string().min(1, "Name is required"),
  date: z.string().min(1, "Date is required"),
});

type MilestoneFormValues = z.infer<typeof milestoneFormSchema>;

type MilestoneDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  milestone?: {
    id: number;
    name: string;
    description: string | null;
    date: string;
    status: string;
    isCompleted: boolean;
  };
};

export function MilestoneDialog({
  isOpen,
  onClose,
  projectId,
  milestone,
}: MilestoneDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!milestone;

  // Initialize form with default values or existing milestone data
  const form = useForm<MilestoneFormValues>({
    resolver: zodResolver(milestoneFormSchema),
    defaultValues: {
      projectId,
      name: milestone?.name || "",
      description: milestone?.description || "",
      date: milestone?.date || new Date().toISOString().split("T")[0],
      status: milestone?.status || "pending",
      isCompleted: milestone?.isCompleted || false,
    },
  });

  // Update form values when existing milestone changes
  useEffect(() => {
    if (milestone) {
      form.reset({
        projectId,
        name: milestone.name,
        description: milestone.description || "",
        date: milestone.date,
        status: milestone.status,
        isCompleted: milestone.isCompleted,
      });
    } else {
      form.reset({
        projectId,
        name: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
        status: "pending",
        isCompleted: false,
      });
    }
  }, [milestone, form, projectId]);

  // Create milestone mutation
  const createMutation = useMutation({
    mutationFn: async (values: MilestoneFormValues) => {
      const res = await apiRequest("POST", "/api/project-milestones", values);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to create milestone");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Milestone created successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/milestones`] });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update milestone mutation
  const updateMutation = useMutation({
    mutationFn: async (values: MilestoneFormValues) => {
      if (!milestone) throw new Error("No milestone to update");
      const res = await apiRequest(
        "PUT",
        `/api/project-milestones/${milestone.id}`,
        values
      );
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to update milestone");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Milestone updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/milestones`] });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (values: MilestoneFormValues) => {
    if (isEditing) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Milestone" : "Add Milestone"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the details for this project milestone."
              : "Add a new milestone to track project progress."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Design Approval"
                      {...field}
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
                      placeholder="Add details about this milestone..."
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
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
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="delayed">Delayed</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isCompleted"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2 space-y-0">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </FormControl>
                  <FormLabel className="text-sm font-normal">
                    Mark as completed
                  </FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="mr-2"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={createMutation.isPending || updateMutation.isPending}
              >
                {isEditing ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}