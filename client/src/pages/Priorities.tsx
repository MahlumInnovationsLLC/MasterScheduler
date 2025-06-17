import { useState, useEffect, useRef } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { GripVertical, Plus, Calendar, DollarSign, TrendingUp, Archive, Search } from 'lucide-react';

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
  percentComplete: number;
  totalValue: number;
  daysUntilShip: number;
  billingMilestones: BillingMilestone[];
}

const SortablePriorityItem = ({ 
  priority, 
  index, 
  onArchive, 
  priorityRef 
}: { 
  priority: ProjectPriority; 
  index: number; 
  onArchive: (id: number, projectNumber: string) => void;
  priorityRef: (el: HTMLDivElement | null) => void;
}) => {
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
      ref={(el) => {
        setNodeRef(el);
        priorityRef(el);
      }}
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
                  width: `${priority.percentComplete || 0}%`
                }}
              ></div>
            </div>
            <div className="text-xs text-gray-700 mt-1">
              {priority.percentComplete || 0}%
            </div>
          </div>
        </div>

        {/* Action Column */}
        <div className="flex items-center ml-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onArchive(priority.id, priority.projectNumber)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            title="Remove from priority list"
          >
            <Archive className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default function Priorities() {
  const [projectPriorities, setProjectPriorities] = useState<ProjectPriority[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPriorities, setFilteredPriorities] = useState<ProjectPriority[]>([]);
  const priorityRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
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
      console.log('🔄 Sending priority update for', priorities.length, 'projects');
      const response = await apiRequest('POST', '/api/project-priorities/update-order', { priorities });
      return response.json();
    },
    onSuccess: () => {
      console.log('✅ Priority order update successful, refetching data');
      // Refetch the priorities to ensure we have the latest data
      refetch();
      toast({
        title: 'Success',
        description: 'Priority order updated successfully.',
      });
    },
    onError: (error: any) => {
      console.error('❌ Priority update failed:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update priority order',
        variant: 'destructive',
      });
    },
  });

  // Archive priority mutation
  const archivePriorityMutation = useMutation({
    mutationFn: async (priorityId: number) => {
      const response = await apiRequest('DELETE', `/api/project-priorities/${priorityId}`);
      return response.json();
    },
    onSuccess: (data, priorityId) => {
      setProjectPriorities(prev => prev.filter(p => p.id !== priorityId));
      toast({
        title: 'Success',
        description: 'Project removed from priority list.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove project from priority list',
        variant: 'destructive',
      });
    },
  });

  // Load existing priorities
  const { data: existingPriorities, isLoading, refetch } = useQuery({
    queryKey: ['/api/project-priorities'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/project-priorities', { credentials: 'include' });
        if (!response.ok) return [];
        const data = await response.json();
        console.log('📊 Fetched project priorities:', data.length, 'projects');
        return data;
      } catch (error) {
        console.error('Error fetching priorities:', error);
        return [];
      }
    },
  });

  useEffect(() => {
    if (existingPriorities && Array.isArray(existingPriorities)) {
      console.log('📊 Setting project priorities state:', existingPriorities.length, 'projects');
      setProjectPriorities(existingPriorities);
    }
  }, [existingPriorities]);

  // Filter priorities based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredPriorities(projectPriorities);
    } else {
      const filtered = projectPriorities.filter(priority =>
        priority.projectNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        priority.projectName.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredPriorities(filtered);
    }
  }, [projectPriorities, searchQuery]);

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



  const handleAddNewPriority = () => {
    // For now, we'll show a toast - in a full implementation this would open a dialog
    toast({
      title: 'Add New Priority',
      description: 'Feature to add custom priorities coming soon.',
    });
  };

  const handleArchivePriority = (priorityId: number, projectNumber: string) => {
    if (window.confirm(`Are you sure you want to remove ${projectNumber} from the priority list?`)) {
      archivePriorityMutation.mutate(priorityId);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() && filteredPriorities.length > 0) {
      // Scroll to first matching result
      const firstMatch = filteredPriorities[0];
      const element = priorityRefs.current[firstMatch.id];
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
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
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by project number or name..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            {searchQuery && (
              <div className="mt-2 text-sm text-gray-600">
                {filteredPriorities.length} of {projectPriorities.length} projects match your search
              </div>
            )}
          </div>

          {/* KPI Widgets - Always visible at top */}
          {projectPriorities.length > 0 && (
            <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
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
          )}

          {filteredPriorities.length === 0 && projectPriorities.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">No project priorities configured</div>
              <div className="flex gap-3 justify-center">
                <Button onClick={handleAddNewPriority} disabled={addNewPriorityMutation.isPending} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Priority
                </Button>
              </div>
            </div>
          ) : filteredPriorities.length === 0 && searchQuery ? (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">No projects match your search</div>
              <Button 
                onClick={() => setSearchQuery('')} 
                variant="outline"
              >
                Clear Search
              </Button>
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
                <div className="w-16 text-center">Actions</div>
              </div>

              {/* Sortable List */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={filteredPriorities.map(p => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {filteredPriorities.map((priority, index) => (
                      <SortablePriorityItem
                        key={priority.id}
                        priority={priority}
                        index={projectPriorities.findIndex(p => p.id === priority.id)}
                        onArchive={handleArchivePriority}
                        priorityRef={(el) => {
                          priorityRefs.current[priority.id] = el;
                        }}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}