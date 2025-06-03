import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Car, 
  Truck, 
  Package, 
  PaintBucket, 
  Wrench, 
  Settings, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Flag, 
  Star,
  Diamond,
  Circle,
  Square,
  Plus,
  Trash2,
  Edit
} from 'lucide-react';
import { type ProjectMilestoneIcon, type InsertProjectMilestoneIcon } from '@shared/schema';

interface ProjectMilestoneIconsManagerProps {
  projectId: number;
}

// Icon mapping for display
const iconMap = {
  car: Car,
  truck: Truck,
  box: Package,
  paintBucket: PaintBucket,
  wrench: Wrench,
  gear: Settings,
  calendar: Calendar,
  clock: Clock,
  checkmark: CheckCircle,
  warning: AlertTriangle,
  flag: Flag,
  star: Star,
  diamond: Diamond,
  circle: Circle,
  square: Square,
};

const phaseOptions = [
  { value: 'fab', label: 'FAB' },
  { value: 'paint', label: 'PAINT' },
  { value: 'production', label: 'PRODUCTION' },
  { value: 'it', label: 'IT' },
  { value: 'ntc', label: 'NTC' },
  { value: 'qc', label: 'QC' },
];

const iconOptions = Object.keys(iconMap).map(key => ({
  value: key,
  label: key.charAt(0).toUpperCase() + key.slice(1),
  Icon: iconMap[key as keyof typeof iconMap],
}));

export function ProjectMilestoneIconsManager({ projectId }: ProjectMilestoneIconsManagerProps) {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingIcon, setEditingIcon] = useState<ProjectMilestoneIcon | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    icon: 'car' as keyof typeof iconMap,
    phase: 'production' as 'fab' | 'paint' | 'production' | 'it' | 'ntc' | 'qc',
    daysBefore: 30,
    isEnabled: true,
  });

  // Fetch project milestone icons
  const { data: milestoneIcons = [], isLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}/milestone-icons`],
    enabled: !!projectId,
  });

  // Create milestone icon mutation
  const createMutation = useMutation({
    mutationFn: async (data: InsertProjectMilestoneIcon) => {
      const response = await apiRequest('POST', `/api/projects/${projectId}/milestone-icons`, data);
      if (!response.ok) {
        throw new Error('Failed to create milestone icon');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/milestone-icons`] });
      queryClient.invalidateQueries({ queryKey: ['/api/manufacturing-schedules'] });
      toast({
        title: "Milestone icon created",
        description: "The milestone icon has been added successfully.",
      });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error creating milestone icon",
        description: error.message || "Failed to create milestone icon",
        variant: "destructive",
      });
    },
  });

  // Update milestone icon mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ProjectMilestoneIcon> }) => {
      const response = await apiRequest('PATCH', `/api/projects/${projectId}/milestone-icons/${id}`, data);
      if (!response.ok) {
        throw new Error('Failed to update milestone icon');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/milestone-icons`] });
      queryClient.invalidateQueries({ queryKey: ['/api/manufacturing-schedules'] });
      toast({
        title: "Milestone icon updated",
        description: "The milestone icon has been updated successfully.",
      });
      setEditingIcon(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error updating milestone icon",
        description: error.message || "Failed to update milestone icon",
        variant: "destructive",
      });
    },
  });

  // Delete milestone icon mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/projects/${projectId}/milestone-icons/${id}`);
      if (!response.ok) {
        throw new Error('Failed to delete milestone icon');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/milestone-icons`] });
      queryClient.invalidateQueries({ queryKey: ['/api/manufacturing-schedules'] });
      toast({
        title: "Milestone icon deleted",
        description: "The milestone icon has been removed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting milestone icon",
        description: error.message || "Failed to delete milestone icon",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      icon: 'car',
      phase: 'production',
      daysBefore: 30,
      isEnabled: true,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingIcon) {
      updateMutation.mutate({
        id: editingIcon.id,
        data: formData,
      });
    } else {
      createMutation.mutate({
        projectId,
        ...formData,
      });
    }
  };

  const startEdit = (icon: ProjectMilestoneIcon) => {
    setEditingIcon(icon);
    setFormData({
      name: icon.name,
      icon: icon.icon as keyof typeof iconMap,
      phase: icon.phase as 'fab' | 'paint' | 'production' | 'it' | 'ntc' | 'qc',
      daysBefore: icon.daysBefore,
      isEnabled: icon.isEnabled,
    });
    setIsAddDialogOpen(true);
  };

  const toggleEnabled = (icon: ProjectMilestoneIcon) => {
    updateMutation.mutate({
      id: icon.id,
      data: { isEnabled: !icon.isEnabled },
    });
  };

  if (isLoading) {
    return <div>Loading milestone icons...</div>;
  }

  // Define default milestones
  const defaultMilestones = [
    {
      name: 'MECH SHOP',
      icon: 'car' as keyof typeof iconMap,
      phase: 'production' as const,
      daysBefore: 30,
    },
    {
      name: 'GRAPHICS',
      icon: 'star' as keyof typeof iconMap, // Changed from paintBucket to star (valid enum value)
      phase: 'qc' as const,
      daysBefore: 7,
    },
  ];

  // Check which default milestones are enabled
  const enabledDefaults = defaultMilestones.map(defaultMilestone => {
    const existing = milestoneIcons.find(icon => 
      icon.name === defaultMilestone.name && 
      icon.phase === defaultMilestone.phase &&
      icon.daysBefore === defaultMilestone.daysBefore
    );
    return {
      ...defaultMilestone,
      isEnabled: existing?.isEnabled || false,
      existingId: existing?.id,
    };
  });

  // Toggle default milestone
  const toggleDefaultMilestone = async (defaultMilestone: typeof enabledDefaults[0]) => {
    if (defaultMilestone.existingId) {
      // Update existing milestone
      updateMutation.mutate({
        id: defaultMilestone.existingId,
        data: { isEnabled: !defaultMilestone.isEnabled },
      });
    } else {
      // Create new milestone
      createMutation.mutate({
        projectId,
        name: defaultMilestone.name,
        icon: defaultMilestone.icon,
        phase: defaultMilestone.phase,
        daysBefore: defaultMilestone.daysBefore,
        isEnabled: true,
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Milestone Icons</h3>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingIcon(null); resetForm(); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Milestone Icon
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingIcon ? 'Edit Milestone Icon' : 'Add Milestone Icon'}
              </DialogTitle>
              <DialogDescription>
                Configure milestone icons to display on project bars in the bay schedule.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., MECH SHOP, GRAPHICS"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="icon">Icon</Label>
                  <Select value={formData.icon} onValueChange={(value) => setFormData({ ...formData, icon: value as keyof typeof iconMap })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an icon" />
                    </SelectTrigger>
                    <SelectContent>
                      {iconOptions.map((option) => {
                        const IconComponent = option.Icon;
                        return (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <IconComponent className="h-4 w-4" />
                              {option.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="phase">Reference Phase</Label>
                  <Select value={formData.phase} onValueChange={(value) => setFormData({ ...formData, phase: value as any })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a phase" />
                    </SelectTrigger>
                    <SelectContent>
                      {phaseOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="daysBefore">Days Before Phase Start</Label>
                  <Input
                    id="daysBefore"
                    type="number"
                    min="0"
                    max="365"
                    value={formData.daysBefore}
                    onChange={(e) => setFormData({ ...formData, daysBefore: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isEnabled"
                    checked={formData.isEnabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, isEnabled: checked })}
                  />
                  <Label htmlFor="isEnabled">Enabled</Label>
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingIcon ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {milestoneIcons.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No milestone icons configured. Add some to display them on project bars in the bay schedule.
            </CardContent>
          </Card>
        ) : (
          milestoneIcons.map((icon: ProjectMilestoneIcon) => {
            const IconComponent = iconMap[icon.icon as keyof typeof iconMap];
            return (
              <Card key={icon.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <IconComponent className="h-5 w-5" />
                      <div>
                        <div className="font-medium">{icon.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {icon.daysBefore} days before {icon.phase.toUpperCase()} starts
                        </div>
                      </div>
                      <Badge variant={icon.isEnabled ? "default" : "secondary"}>
                        {icon.isEnabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={icon.isEnabled}
                        onCheckedChange={() => toggleEnabled(icon)}
                        disabled={updateMutation.isPending}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(icon)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(icon.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Default milestone icons section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Default Milestone Icons</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {enabledDefaults.map((defaultMilestone, index) => {
            const IconComponent = iconMap[defaultMilestone.icon];
            return (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <IconComponent className="h-5 w-5" />
                  <div>
                    <div className="font-medium">{defaultMilestone.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {defaultMilestone.daysBefore} days before {defaultMilestone.phase.toUpperCase()} phase
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={defaultMilestone.isEnabled ? "default" : "secondary"}>
                    {defaultMilestone.isEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                  <Switch
                    checked={defaultMilestone.isEnabled}
                    onCheckedChange={() => toggleDefaultMilestone(defaultMilestone)}
                    disabled={createMutation.isPending || updateMutation.isPending}
                  />
                </div>
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground">
            These are the recommended defaults. You can customize or add your own milestone icons above.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}