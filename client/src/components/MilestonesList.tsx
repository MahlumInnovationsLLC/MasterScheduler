import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { MilestoneDialog } from "./MilestoneDialog";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  CheckCircle,
  Clock,
  Edit,
  Trash2,
  Plus,
  AlertCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { ProjectMilestone } from "@shared/schema";

type MilestonesListProps = {
  projectId: number;
};

export function MilestonesList({ projectId }: MilestonesListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<ProjectMilestone | undefined>(undefined);

  // Fetch milestones for this project
  const { data: milestones, isLoading, error } = useQuery({
    queryKey: [`/api/projects/${projectId}/milestones`],
    enabled: !!projectId,
  });

  // Complete milestone mutation
  const completeMutation = useMutation({
    mutationFn: async (milestoneId: number) => {
      const res = await apiRequest(
        "PUT",
        `/api/project-milestones/${milestoneId}/complete`,
        {}
      );
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to complete milestone");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Milestone marked as completed",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/milestones`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete milestone mutation
  const deleteMutation = useMutation({
    mutationFn: async (milestoneId: number) => {
      const res = await apiRequest(
        "DELETE",
        `/api/project-milestones/${milestoneId}`
      );
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to delete milestone");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Milestone deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/milestones`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Open dialog to add a new milestone
  const handleAddMilestone = () => {
    setSelectedMilestone(undefined);
    setIsDialogOpen(true);
  };

  // Open dialog to edit an existing milestone
  const handleEditMilestone = (milestone: ProjectMilestone) => {
    setSelectedMilestone(milestone);
    setIsDialogOpen(true);
  };

  // Complete a milestone
  const handleCompleteMilestone = (milestoneId: number) => {
    completeMutation.mutate(milestoneId);
  };

  // Delete a milestone
  const handleDeleteMilestone = (milestoneId: number) => {
    deleteMutation.mutate(milestoneId);
  };

  // Close the dialog
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedMilestone(undefined);
  };

  // Get status badge for milestone
  const getStatusBadge = (status: string, isCompleted: boolean) => {
    if (isCompleted) {
      return (
        <Badge variant="default" className="bg-green-600">
          Completed
        </Badge>
      );
    }

    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "in_progress":
        return <Badge variant="default" className="bg-blue-600">In Progress</Badge>;
      case "delayed":
        return <Badge variant="destructive">Delayed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Sort milestones by date
  const sortedMilestones = milestones
    ? [...milestones].sort((a, b) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      })
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Project Milestones</h3>
        <Button
          size="sm"
          onClick={handleAddMilestone}
          className="flex items-center gap-1"
        >
          <Plus className="h-4 w-4" />
          Add Milestone
        </Button>
      </div>

      {isLoading && (
        <div className="flex justify-center p-4">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      )}

      {error && (
        <div className="p-4 text-center text-red-500">
          <AlertCircle className="h-5 w-5 mb-1 mx-auto" />
          <p>Failed to load milestones</p>
        </div>
      )}

      {!isLoading && sortedMilestones.length === 0 && (
        <div className="text-center text-muted-foreground p-6 border border-dashed rounded-lg">
          <p>No milestones added yet</p>
          <Button
            variant="link"
            onClick={handleAddMilestone}
            className="mt-2"
          >
            Add your first milestone
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedMilestones.map((milestone) => (
          <Card
            key={milestone.id}
            className={cn(
              "transition-colors",
              milestone.isCompleted
                ? "border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800"
                : milestone.status === "delayed"
                ? "border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800"
                : ""
            )}
          >
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-base font-semibold mr-2">
                  {milestone.name}
                </CardTitle>
                {getStatusBadge(milestone.status, milestone.isCompleted)}
              </div>
              <CardDescription>
                <div className="flex items-center text-xs mt-1">
                  <Calendar className="h-3 w-3 mr-1" />
                  {format(new Date(milestone.date), "MMM d, yyyy")}
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                {milestone.description || "No description provided"}
              </p>
            </CardContent>
            <CardFooter className="pt-1 flex justify-between">
              <div className="flex space-x-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => handleEditMilestone(milestone)}
                >
                  <Edit className="h-4 w-4" />
                  <span className="sr-only">Edit</span>
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive">
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Milestone</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete the "{milestone.name}" milestone? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => handleDeleteMilestone(milestone.id)}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              {!milestone.isCompleted && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-8"
                  onClick={() => handleCompleteMilestone(milestone.id)}
                >
                  <CheckCircle className="h-3.5 w-3.5 mr-1" />
                  Complete
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      <MilestoneDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        projectId={projectId}
        milestone={selectedMilestone}
      />
    </div>
  );
}