import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Plus, Search, Filter, Calendar, User, AlertTriangle, CheckCircle, Clock, XCircle, Target, Wrench, Package, Shield, Truck, Settings, GripVertical, Download, RotateCcw } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest, getQueryFn } from '../lib/queryClient';

// Project priority with billing milestones
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

// Sortable Priority Item Component
const SortablePriorityItem = ({ priority, index }: { priority: ProjectPriority; index: number }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: priority.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'critical': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'delayed': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Not set';
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow ${
        isDragging ? 'ring-2 ring-blue-500' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
        >
          <GripVertical size={16} />
        </div>

        {/* Priority number */}
        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium">
          {index + 1}
        </div>

        {/* Project info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-gray-900">{priority.projectNumber}</span>
            <Badge className={getStatusColor(priority.status)}>
              {priority.status}
            </Badge>
            {priority.daysUntilShip <= 30 && priority.daysUntilShip > 0 && (
              <Badge variant="destructive">
                <Clock size={12} className="mr-1" />
                {priority.daysUntilShip} days
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-600 truncate">{priority.projectName}</p>
        </div>

        {/* Ship date */}
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">Ship Date</p>
          <p className="text-sm text-gray-600">{formatDate(priority.shipDate)}</p>
        </div>

        {/* Total value */}
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">Total Value</p>
          <p className="text-sm text-green-600 font-medium">{formatCurrency(priority.totalValue)}</p>
        </div>

        {/* Billing milestones summary */}
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">Milestones</p>
          <div className="flex gap-1">
            {priority.billingMilestones.slice(0, 3).map((milestone, idx) => (
              <div
                key={milestone.id}
                className={`w-3 h-3 rounded-full ${
                  milestone.isPaid ? 'bg-green-500' : 'bg-gray-300'
                }`}
                title={`${milestone.name}: ${milestone.percentage}% - ${formatCurrency(milestone.amount)}`}
              />
            ))}
            {priority.billingMilestones.length > 3 && (
              <span className="text-xs text-gray-500">+{priority.billingMilestones.length - 3}</span>
            )}
          </div>
        </div>
      </div>

      {/* Billing milestones detail */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {priority.billingMilestones.map((milestone) => (
            <div
              key={milestone.id}
              className="p-2 rounded bg-gray-50 border"
            >
              <div className="flex items-center gap-1 mb-1">
                <div
                  className={`w-2 h-2 rounded-full ${
                    milestone.isPaid ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />
                <span className="text-xs font-medium text-gray-700">{milestone.name}</span>
              </div>
              <p className="text-xs text-gray-600">{milestone.percentage}%</p>
              <p className="text-xs font-medium text-gray-900">{formatCurrency(milestone.amount)}</p>
              {milestone.dueDate && (
                <p className="text-xs text-gray-500">{formatDate(milestone.dueDate)}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Priorities = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [projectPriorities, setProjectPriorities] = useState<ProjectPriority[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Import top 50 projects based on earliest ship date
  const importProjectsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/priorities/import-top-projects', {
        method: 'POST',
      });
      return response;
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

  // Update priority order after drag and drop
  const updatePriorityOrderMutation = useMutation({
    mutationFn: async (priorities: ProjectPriority[]) => {
      return apiRequest('/api/priorities/update-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priorities }),
      });
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
    queryFn: getQueryFn,
  });

  useEffect(() => {
    if (existingPriorities) {
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

        const newOrder = arrayMove(items, oldIndex, newIndex);
        
        // Update priority orders
        const updatedPriorities = newOrder.map((item, index) => ({
          ...item,
          priorityOrder: index + 1,
        }));

        // Save to backend
        updatePriorityOrderMutation.mutate(updatedPriorities);

        return updatedPriorities;
      });
    }
  };

  // Filter projects based on search
  const filteredPriorities = projectPriorities.filter((priority) =>
    priority.projectNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    priority.projectName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading priorities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Project Priorities</h1>
          <p className="text-gray-600">
            Manage priority ranking of top 50 projects by ship date with billing milestones
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => importProjectsMutation.mutate()}
            disabled={importProjectsMutation.isPending}
            className="flex items-center gap-2"
          >
            <Download size={16} />
            {importProjectsMutation.isPending ? 'Importing...' : 'Import Top 50'}
          </Button>
          <Button
            variant="outline"
            onClick={() => setProjectPriorities([])}
            className="flex items-center gap-2"
          >
            <RotateCcw size={16} />
            Reset
          </Button>
        </div>
      </div>

      {/* Search and filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Target size={12} />
          {filteredPriorities.length} projects
        </Badge>
      </div>

      {/* Project priorities list */}
      {filteredPriorities.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No project priorities</h3>
            <p className="text-gray-600 mb-4">
              Import the top 50 projects ranked by earliest ship date to start managing priorities.
            </p>
            <Button
              onClick={() => importProjectsMutation.mutate()}
              disabled={importProjectsMutation.isPending}
              className="flex items-center gap-2"
            >
              <Download size={16} />
              Import Top 50 Projects
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={filteredPriorities.map(p => p.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {filteredPriorities.map((priority, index) => (
                <SortablePriorityItem
                  key={priority.id}
                  priority={priority}
                  index={index}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Statistics */}
      {projectPriorities.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Total Projects</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{projectPriorities.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium">Urgent (≤30 days)</span>
              </div>
              <p className="text-2xl font-bold text-red-600">
                {projectPriorities.filter(p => p.daysUntilShip <= 30 && p.daysUntilShip > 0).length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Active Projects</span>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {projectPriorities.filter(p => p.status.toLowerCase() === 'active').length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">Total Value</span>
              </div>
              <p className="text-2xl font-bold text-purple-600">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  notation: 'compact',
                  maximumFractionDigits: 1,
                }).format(projectPriorities.reduce((sum, p) => sum + p.totalValue, 0))}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Priorities;