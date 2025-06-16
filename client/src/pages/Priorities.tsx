import { useState, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { GripVertical, Plus, Calendar, DollarSign, TrendingUp } from 'lucide-react';

interface BillingMilestone {
  id: number;
  projectId: number;
  name: string;
  percentage: number;
  amount: number;
  dueDate: string | null;
  isPaid: boolean;
  description: string | null;
}

interface ProjectPriority {
  id: number;
  projectId: number;
  priorityOrder: number;
  projectNumber: string;
  projectName: string;
  shipDate: string | null;
  status: string;
  totalValue: number;
  daysUntilShip: number;
  billingMilestones: BillingMilestone[];
}

const SortablePriorityItem = ({ priority, index }: { priority: ProjectPriority; index: number }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: priority.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'No date';
    return new Date(dateStr).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'delayed':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyColor = (days: number) => {
    if (days <= 7) return 'text-red-600';
    if (days <= 30) return 'text-yellow-600';
    return 'text-green-600';
  };

  const totalMilestoneValue = priority.billingMilestones.reduce((sum, milestone) => sum + milestone.amount, 0);
  const paidMilestones = priority.billingMilestones.filter(m => m.isPaid);
  const paidValue = paidMilestones.reduce((sum, milestone) => sum + milestone.amount, 0);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow mb-2"
    >
      <div className="flex items-center p-4">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing mr-3"
        >
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Priority Number */}
        <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 rounded-full font-semibold text-sm mr-4">
          {index + 1}
        </div>

        {/* Project Info */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-7 gap-4 items-center">
          {/* Project Details */}
          <div className="md:col-span-2">
            <div className="font-semibold text-gray-900">{priority.projectNumber}</div>
            <div className="text-sm text-gray-600 truncate">{priority.projectName}</div>
            <Badge className={`text-xs mt-1 ${getStatusColor(priority.status)}`}>
              {priority.status}
            </Badge>
          </div>

          {/* Ship Date */}
          <div className="text-center">
            <div className="flex items-center justify-center text-sm text-gray-700 mb-1">
              <Calendar className="w-3 h-3 mr-1" />
              Ship Date
            </div>
            <div className="font-medium text-gray-900">{formatDate(priority.shipDate)}</div>
            <div className={`text-xs font-medium ${getUrgencyColor(priority.daysUntilShip)}`}>
              {priority.daysUntilShip > 0 ? `${priority.daysUntilShip} days` : 'Overdue'}
            </div>
          </div>

          {/* Total Value */}
          <div className="text-center">
            <div className="flex items-center justify-center text-sm text-gray-700 mb-1">
              <DollarSign className="w-3 h-3 mr-1" />
              Total Value
            </div>
            <div className="font-medium text-gray-900">{formatCurrency(priority.totalValue)}</div>
          </div>

          {/* Billing Progress */}
          <div className="text-center">
            <div className="flex items-center justify-center text-sm text-gray-700 mb-1">
              <TrendingUp className="w-3 h-3 mr-1" />
              Billing
            </div>
            <div className="font-medium text-gray-900">{formatCurrency(paidValue)}</div>
            <div className="text-xs text-gray-700">
              {paidMilestones.length}/{priority.billingMilestones.length} paid
            </div>
          </div>

          {/* Milestones Count */}
          <div className="text-center">
            <div className="text-sm text-gray-700 mb-1">Milestones</div>
            <div className="font-medium text-gray-900">{priority.billingMilestones.length}</div>
            <div className="text-xs text-gray-700">
              {totalMilestoneValue > 0 ? formatCurrency(totalMilestoneValue) : 'No billing'}
            </div>
          </div>

          {/* Completion Progress */}
          <div className="text-center">
            <div className="text-sm text-gray-700 mb-1">Progress</div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{
                  width: `${totalMilestoneValue > 0 ? (paidValue / totalMilestoneValue) * 100 : 0}%`
                }}
              ></div>
            </div>
            <div className="text-xs text-gray-700 mt-1">
              {totalMilestoneValue > 0 ? `${Math.round((paidValue / totalMilestoneValue) * 100)}%` : '0%'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Priorities() {
  const [projectPriorities, setProjectPriorities] = useState<ProjectPriority[]>([]);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Add new priority functionality
  const addNewPriorityMutation = useMutation({
    mutationFn: async (newPriority: Partial<ProjectPriority>) => {
      const response = await apiRequest('POST', '/api/priorities/add', newPriority);
      return response.json();
    },
    onSuccess: (data) => {
      setProjectPriorities(prev => [...prev, data]);
      toast({
        title: 'Success',
        description: 'New priority added successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add new priority',
        variant: 'destructive',
      });
    },
  });

  // Update priority order after drag and drop
  const updatePriorityOrderMutation = useMutation({
    mutationFn: async (priorities: ProjectPriority[]) => {
      const response = await apiRequest('POST', '/api/priorities/update-order', { priorities });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Priority order updated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update priority order',
        variant: 'destructive',
      });
    },
  });

  // Load existing priorities
  const { data: existingPriorities, isLoading } = useQuery({
    queryKey: ['/api/project-priorities'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/project-priorities', { credentials: 'include' });
        if (!response.ok) return [];
        return response.json();
      } catch {
        return [];
      }
    },
  });

  useEffect(() => {
    if (existingPriorities && Array.isArray(existingPriorities)) {
      setProjectPriorities(existingPriorities);
    }
  }, [existingPriorities]);

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setProjectPriorities((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // Update priority order
        const updatedItems = newItems.map((item, index) => ({
          ...item,
          priorityOrder: index + 1,
        }));

        // Save the new order
        updatePriorityOrderMutation.mutate(updatedItems);

        return updatedItems;
      });
    }
  };

  // Import top 50 projects based on earliest ship date
  const importProjectsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/priorities/import-top-projects');
      return response.json();
    },
    onSuccess: (data) => {
      setProjectPriorities(data);
      toast({
        title: 'Success',
        description: `Imported ${data.length} projects with priority ranking by ship date.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to import projects',
        variant: 'destructive',
      });
    },
  });

  const handleAddNewPriority = () => {
    // For now, we'll show a toast - in a full implementation this would open a dialog
    toast({
      title: 'Add New Priority',
      description: 'Feature to add custom priorities coming soon.',
    });
  };

  const handleRestoreProjects = () => {
    importProjectsMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Project Priorities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">Project Priorities</CardTitle>
              <p className="text-gray-600 mt-1">
                Manage project priorities with drag-and-drop ordering. View billing milestones and project progress.
              </p>
            </div>
            <Button
              onClick={handleAddNewPriority}
              disabled={addNewPriorityMutation.isPending}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add New Priority
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {projectPriorities.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">No project priorities configured</div>
              <div className="flex gap-3 justify-center">
                <Button onClick={handleRestoreProjects} disabled={importProjectsMutation.isPending}>
                  <Plus className="w-4 h-4 mr-2" />
                  {importProjectsMutation.isPending ? 'Restoring...' : 'Restore Top 50 Projects'}
                </Button>
                <Button onClick={handleAddNewPriority} disabled={addNewPriorityMutation.isPending} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Priority
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Header Row */}
              <div className="hidden md:flex items-center p-4 bg-gray-50 rounded-lg mb-4 text-sm font-medium text-gray-700">
                <div className="w-8"></div> {/* Drag handle space */}
                <div className="w-8 mr-4">Rank</div>
                <div className="flex-1 grid grid-cols-7 gap-4">
                  <div className="col-span-2">Project Details</div>
                  <div className="text-center">Ship Date</div>
                  <div className="text-center">Total Value</div>
                  <div className="text-center">Billing Progress</div>
                  <div className="text-center">Milestones</div>
                  <div className="text-center">Completion</div>
                </div>
              </div>

              {/* Sortable List */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={projectPriorities.map(p => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {projectPriorities.map((priority, index) => (
                      <SortablePriorityItem
                        key={priority.id}
                        priority={priority}
                        index={index}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {/* Summary Stats */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-blue-600 text-sm font-medium">Total Projects</div>
                  <div className="text-2xl font-bold text-blue-900">{projectPriorities.length}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-green-600 text-sm font-medium">Total Value</div>
                  <div className="text-2xl font-bold text-green-900">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      notation: 'compact',
                    }).format(projectPriorities.reduce((sum, p) => sum + p.totalValue, 0))}
                  </div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-yellow-600 text-sm font-medium">Critical Projects</div>
                  <div className="text-2xl font-bold text-yellow-900">
                    {projectPriorities.filter(p => p.daysUntilShip <= 7).length}
                  </div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-purple-600 text-sm font-medium">Billing Milestones</div>
                  <div className="text-2xl font-bold text-purple-900">
                    {projectPriorities.reduce((sum, p) => sum + p.billingMilestones.length, 0)}
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}