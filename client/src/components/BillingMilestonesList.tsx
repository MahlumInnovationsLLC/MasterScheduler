import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Calendar,
  CheckCircle,
  Clock,
  Edit,
  Trash2,
  Plus,
  AlertCircle,
  DollarSign
} from "lucide-react";
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
import { cn, formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { BillingMilestoneForm } from "@/components/BillingMilestoneForm";

type BillingMilestonesListProps = {
  projectId: number;
};

export function BillingMilestonesList({ projectId }: BillingMilestonesListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Fetch billing milestones for this project
  const { data: billingMilestones, isLoading, error } = useQuery({
    queryKey: [`/api/projects/${projectId}/billing-milestones`],
    enabled: !!projectId,
  });

  // Delete billing milestone mutation
  const deleteMutation = useMutation({
    mutationFn: async (milestoneId: number) => {
      const res = await apiRequest(
        "DELETE",
        `/api/billing-milestones/${milestoneId}`
      );
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to delete billing milestone");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Billing milestone deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/billing-milestones`] });
      queryClient.invalidateQueries({ queryKey: ['/api/billing-milestones'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Open dialog to add a new billing milestone
  const handleAddMilestone = () => {
    setSelectedMilestone(null);
    setIsEditing(false);
    setShowMilestoneForm(true);
  };

  // Open dialog to edit an existing billing milestone
  const handleEditMilestone = (milestone: any) => {
    setSelectedMilestone(milestone);
    setIsEditing(true);
    setShowMilestoneForm(true);
  };

  // Delete a billing milestone
  const handleDeleteMilestone = (milestoneId: number) => {
    deleteMutation.mutate(milestoneId);
  };

  // Get status badge for billing milestone
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge variant="default" className="bg-green-600">
            Paid
          </Badge>
        );
      case "invoiced":
        return <Badge variant="default" className="bg-blue-600">Invoiced</Badge>;
      case "upcoming":
        return <Badge variant="secondary">Upcoming</Badge>;
      case "delayed":
        return <Badge variant="destructive">Delayed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Sort milestones by date
  const sortedMilestones = billingMilestones
    ? [...billingMilestones].sort((a, b) => {
        return new Date(a.targetInvoiceDate + 'T00:00:00').getTime() - new Date(b.targetInvoiceDate + 'T00:00:00').getTime();
      })
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-lg font-semibold">Billing Milestones</h3>
        <Button
          size="sm"
          onClick={handleAddMilestone}
          className="flex items-center gap-1"
        >
          <Plus className="h-4 w-4" />
          Add Billing Milestone
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
          <p>Failed to load billing milestones</p>
        </div>
      )}

      {!isLoading && sortedMilestones.length === 0 && (
        <div className="text-center text-muted-foreground p-6 border border-dashed rounded-lg">
          <p>No billing milestones added yet</p>
          <Button
            variant="link"
            onClick={handleAddMilestone}
            className="mt-2"
          >
            Add your first billing milestone
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-4">
        {sortedMilestones.map((milestone) => (
          <Card
            key={milestone.id}
            className={cn(
              "transition-colors",
              milestone.status === "paid"
                ? "border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800"
                : milestone.status === "delayed"
                ? "border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800"
                : milestone.status === "invoiced"
                ? "border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800"
                : ""
            )}
          >
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-base font-semibold mr-2">
                  {milestone.name}
                </CardTitle>
                {getStatusBadge(milestone.status)}
              </div>
              <CardDescription>
                <div className="flex items-center gap-1 text-xs mt-1">
                  <DollarSign className="h-3 w-3" />
                  {formatCurrency(parseFloat(milestone.amount))}
                </div>
                <div className="flex items-center text-xs mt-1">
                  <Calendar className="h-3 w-3 mr-1" />
                  Due: {milestone.targetInvoiceDate ? format(new Date(milestone.targetInvoiceDate + 'T00:00:00'), "MMM d, yyyy") : "Upcoming"}
                </div>
                {milestone.status === 'upcoming' && milestone.liveDate && (
                  <div className="flex items-center text-xs mt-1">
                    <Calendar className="h-3 w-3 mr-1" />
                    Live: {format(new Date(milestone.liveDate + 'T00:00:00'), "MMM d, yyyy")}
                  </div>
                )}
                {milestone.actualInvoiceDate && (milestone.status === 'invoiced' || milestone.status === 'billed' || milestone.status === 'paid') && (
                  <div className="flex items-center text-xs mt-1">
                    <Calendar className="h-3 w-3 mr-1" />
                    Invoiced: {format(new Date(milestone.actualInvoiceDate + 'T00:00:00'), "MMM d, yyyy")}
                  </div>
                )}

              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                {milestone.notes || "No notes provided"}
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
                      <AlertDialogTitle>Delete Billing Milestone</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete the "{milestone.name}" billing milestone? This action cannot be undone.
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
            </CardFooter>
          </Card>
        ))}
      </div>

      <BillingMilestoneForm
        open={showMilestoneForm}
        onOpenChange={setShowMilestoneForm}
        defaultValues={selectedMilestone ? {
          projectId: selectedMilestone.projectId,
          name: selectedMilestone.name,
          description: selectedMilestone.description || '',
          amount: selectedMilestone.amount.toString(),
          targetInvoiceDate: selectedMilestone.targetInvoiceDate,
          actualInvoiceDate: selectedMilestone.actualInvoiceDate || '',
          paymentReceivedDate: selectedMilestone.paymentReceivedDate || '',
          status: selectedMilestone.status
        } : {
          projectId: projectId,
          name: '',
          description: '',
          amount: '',
          targetInvoiceDate: '',
          actualInvoiceDate: '',
          paymentReceivedDate: '',
          status: 'upcoming'
        }}
        isEdit={isEditing}
        milestoneId={selectedMilestone?.id}
      />
    </div>
  );
}