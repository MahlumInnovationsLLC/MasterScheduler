import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, Trash2, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Types
interface ProjectLabel {
  id: number;
  name: string;
  type: 'status' | 'priority' | 'issue' | 'category' | 'custom';
  color: 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'gray';
  backgroundColor?: string;
  textColor?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProjectLabelAssignment {
  id: number;
  projectId: number;
  labelId: number;
  assignedAt: string;
  labelName: string;
  labelType: string;
  labelColor: string;
  backgroundColor?: string;
  textColor?: string;
}

// Form schemas
const labelSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  type: z.enum(['status', 'priority', 'issue', 'category', 'custom']),
  color: z.enum(['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'gray']),
  description: z.string().optional(),
});

type LabelFormData = z.infer<typeof labelSchema>;

// Color mappings
const colorMappings = {
  red: { bg: '#ef4444', text: '#ffffff' },
  orange: { bg: '#f97316', text: '#ffffff' },
  yellow: { bg: '#eab308', text: '#000000' },
  green: { bg: '#22c55e', text: '#ffffff' },
  blue: { bg: '#3b82f6', text: '#ffffff' },
  purple: { bg: '#a855f7', text: '#ffffff' },
  pink: { bg: '#ec4899', text: '#ffffff' },
  gray: { bg: '#6b7280', text: '#ffffff' },
};

// Label Badge Component
export function LabelBadge({ label, onRemove }: { 
  label: ProjectLabel | ProjectLabelAssignment; 
  onRemove?: () => void 
}) {
  const labelColor = 'labelColor' in label ? label.labelColor : label.color;
  const bgColor = label.backgroundColor || colorMappings[labelColor as keyof typeof colorMappings]?.bg || '#6b7280';
  const textColor = label.textColor || colorMappings[labelColor as keyof typeof colorMappings]?.text || '#ffffff';

  return (
    <Badge 
      variant="secondary" 
      className="px-2 py-1 text-xs font-medium border"
      style={{ 
        backgroundColor: bgColor, 
        color: textColor,
        borderColor: bgColor
      }}
    >
      <Tag className="w-3 h-3 mr-1" />
      {'labelName' in label ? label.labelName : label.name}
      {onRemove && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 hover:opacity-70"
        >
          ×
        </button>
      )}
    </Badge>
  );
}

// Label Form Component
function LabelForm({ 
  label, 
  onSuccess, 
  onCancel 
}: { 
  label?: ProjectLabel; 
  onSuccess: () => void; 
  onCancel: () => void; 
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<LabelFormData>({
    resolver: zodResolver(labelSchema),
    defaultValues: {
      name: label?.name || '',
      type: label?.type || 'custom',
      color: label?.color || 'gray',
      description: label?.description || '',
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: LabelFormData) => apiRequest('/api/project-labels', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        backgroundColor: colorMappings[data.color].bg,
        textColor: colorMappings[data.color].text,
      }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/project-labels'] });
      toast({ title: "Label created successfully" });
      onSuccess();
    },
    onError: () => {
      toast({ title: "Error creating label", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: LabelFormData) => apiRequest(`/api/project-labels/${label!.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...data,
        backgroundColor: colorMappings[data.color].bg,
        textColor: colorMappings[data.color].text,
      }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/project-labels'] });
      toast({ title: "Label updated successfully" });
      onSuccess();
    },
    onError: () => {
      toast({ title: "Error updating label", variant: "destructive" });
    },
  });

  const onSubmit = (data: LabelFormData) => {
    if (label) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Enter label name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select label type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="issue">Issue</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="color"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Color</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select color" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(colorMappings).map(([color, { bg, text }]) => (
                    <SelectItem key={color} value={color}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded border"
                          style={{ backgroundColor: bg }}
                        />
                        <span className="capitalize">{color}</span>
                      </div>
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
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Enter label description" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Preview */}
        <div className="pt-2">
          <FormLabel>Preview</FormLabel>
          <div className="mt-1">
            <LabelBadge 
              label={{
                id: 0,
                name: form.watch('name') || 'Label Preview',
                type: form.watch('type'),
                color: form.watch('color'),
                backgroundColor: colorMappings[form.watch('color')].bg,
                textColor: colorMappings[form.watch('color')].text,
                isActive: true,
                createdAt: '',
                updatedAt: '',
              }} 
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {label ? 'Update' : 'Create'} Label
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Main Project Labels Management Component
export function ProjectLabelsManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState<ProjectLabel | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: labels = [], isLoading } = useQuery({
    queryKey: ['/api/project-labels'],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/project-labels/${id}`, {
      method: 'DELETE',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/project-labels'] });
      toast({ title: "Label deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error deleting label", variant: "destructive" });
    },
  });

  const handleEdit = (label: ProjectLabel) => {
    setEditingLabel(label);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this label? This will remove it from all projects.')) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingLabel(null);
  };

  if (isLoading) {
    return <div className="p-4">Loading labels...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Project Labels</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingLabel(null)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Label
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingLabel ? 'Edit Label' : 'Create New Label'}
                </DialogTitle>
              </DialogHeader>
              <LabelForm
                label={editingLabel || undefined}
                onSuccess={handleDialogClose}
                onCancel={handleDialogClose}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {labels.length === 0 ? (
            <p className="text-muted-foreground">No labels created yet.</p>
          ) : (
            <div className="grid gap-3">
              {labels.map((label: ProjectLabel) => (
                <div key={label.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <LabelBadge label={label} />
                    <div>
                      <p className="text-sm font-medium">{label.name}</p>
                      {label.description && (
                        <p className="text-xs text-muted-foreground">{label.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground capitalize">
                        Type: {label.type}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(label)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(label.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Project-specific Label Assignment Component
export function ProjectLabelsAssignment({ projectId }: { projectId: number }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: availableLabels = [] } = useQuery({
    queryKey: ['/api/project-labels'],
  });

  const { data: projectLabels = [], isLoading } = useQuery({
    queryKey: ['/api/projects', projectId, 'labels'],
    queryFn: () => apiRequest(`/api/projects/${projectId}/labels`),
  });

  const assignMutation = useMutation({
    mutationFn: (labelId: number) => apiRequest(`/api/projects/${projectId}/labels/${labelId}`, {
      method: 'POST',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'labels'] });
      toast({ title: "Label assigned successfully" });
      setIsDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Error assigning label", variant: "destructive" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (labelId: number) => apiRequest(`/api/projects/${projectId}/labels/${labelId}`, {
      method: 'DELETE',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'labels'] });
      toast({ title: "Label removed successfully" });
    },
    onError: () => {
      toast({ title: "Error removing label", variant: "destructive" });
    },
  });

  const assignedLabelIds = projectLabels.map((assignment: ProjectLabelAssignment) => assignment.labelId);
  const unassignedLabels = availableLabels.filter((label: ProjectLabel) => 
    !assignedLabelIds.includes(label.id)
  );

  if (isLoading) {
    return <div>Loading project labels...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Project Labels</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Label
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Label to Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {unassignedLabels.length === 0 ? (
                <p className="text-muted-foreground">All available labels are already assigned to this project.</p>
              ) : (
                unassignedLabels.map((label: ProjectLabel) => (
                  <div key={label.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <LabelBadge label={label} />
                      {label.description && (
                        <p className="text-sm text-muted-foreground">{label.description}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => assignMutation.mutate(label.id)}
                      disabled={assignMutation.isPending}
                    >
                      Assign
                    </Button>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {projectLabels.length === 0 ? (
        <p className="text-muted-foreground">No labels assigned to this project.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {projectLabels.map((assignment: ProjectLabelAssignment) => (
            <LabelBadge
              key={assignment.id}
              label={assignment}
              onRemove={() => removeMutation.mutate(assignment.labelId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}