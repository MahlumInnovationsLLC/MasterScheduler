import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { DepartmentCapacity } from "@shared/schema";

const formSchema = z.object({
  departmentName: z.string().min(1, "Department name is required"),
  weeklyCapacityHours: z.number().min(0),
  utilizationTarget: z.number().min(0).max(100),
  notes: z.string().optional(),
});

interface DepartmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department?: DepartmentCapacity | null;
  onSave: (data: Partial<DepartmentCapacity>) => void;
}

export default function DepartmentDialog({
  open,
  onOpenChange,
  department,
  onSave,
}: DepartmentDialogProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      departmentName: "",
      weeklyCapacityHours: 0,
      utilizationTarget: 85,
      notes: "",
    },
  });

  useEffect(() => {
    if (department) {
      form.reset({
        departmentName: department.departmentName,
        weeklyCapacityHours: department.weeklyCapacityHours || 0,
        utilizationTarget: department.utilizationTarget || 85,
        notes: department.notes || "",
      });
    }
  }, [department, form]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    onSave(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Department Settings</DialogTitle>
          <DialogDescription>
            Update department capacity settings and targets
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="departmentName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department Name</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={!!department} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="weeklyCapacityHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base Weekly Capacity (Hours)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    Default capacity when no team members are assigned
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="utilizationTarget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Utilization Target (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 85)}
                    />
                  </FormControl>
                  <FormDescription>
                    Target utilization percentage for capacity planning
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes about this department..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Update Department
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}