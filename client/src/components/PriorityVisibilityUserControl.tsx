import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Priority } from "@shared/schema";

interface PriorityVisibilityUserControlProps {
  userId: number;
  user: any;
  isAdmin: boolean;
}

interface PriorityVisibility {
  id: number;
  userId: number;
  priorityId: number;
  canView: boolean;
  canEdit: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export default function PriorityVisibilityUserControl({ userId, user, isAdmin }: PriorityVisibilityUserControlProps) {
  const { toast } = useToast();
  const [userPriorityAccess, setUserPriorityAccess] = useState<Record<number, { canView: boolean; canEdit: boolean }>>({});

  // Fetch all priorities
  const { data: priorities = [], isLoading: prioritiesLoading } = useQuery({
    queryKey: ['/api/priorities'],
    queryFn: async () => {
      const response = await fetch('/api/priorities');
      if (!response.ok) throw new Error('Failed to fetch priorities');
      return response.json();
    }
  });

  // Fetch user's priority visibility settings
  const { data: userVisibility = [], isLoading: visibilityLoading } = useQuery({
    queryKey: ['/api/priority-visibility', userId],
    queryFn: async () => {
      const response = await fetch(`/api/priority-visibility/user/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch priority visibility');
      return response.json();
    }
  });

  // Update local state when visibility data loads
  useEffect(() => {
    if (userVisibility && Array.isArray(userVisibility)) {
      const accessMap: Record<number, { canView: boolean; canEdit: boolean }> = {};
      userVisibility.forEach((visibility: PriorityVisibility) => {
        accessMap[visibility.priorityId] = {
          canView: visibility.canView,
          canEdit: visibility.canEdit
        };
      });
      setUserPriorityAccess(accessMap);
    }
  }, [userVisibility]);

  // Mutation to update priority visibility
  const updateVisibilityMutation = useMutation({
    mutationFn: async ({ priorityId, canView, canEdit }: { priorityId: number; canView: boolean; canEdit: boolean }) => {
      const response = await fetch(`/api/priority-visibility/user/${userId}/priority/${priorityId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ canView, canEdit }),
      });

      if (!response.ok) {
        throw new Error('Failed to update priority visibility');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      // Update local state
      setUserPriorityAccess(prev => ({
        ...prev,
        [variables.priorityId]: {
          canView: variables.canView,
          canEdit: variables.canEdit
        }
      }));

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/priority-visibility', userId] });

      const priority = priorities.find((p: Priority) => p.id === variables.priorityId);
      toast({
        title: "Priority Access Updated",
        description: `${priority?.title || 'Priority'} access for ${user.firstName} ${user.lastName} has been updated.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update priority access: " + (error as Error).message,
        variant: "destructive"
      });
    }
  });

  const handleViewToggle = (priorityId: number, canView: boolean) => {
    const currentAccess = userPriorityAccess[priorityId] || { canView: false, canEdit: false };
    updateVisibilityMutation.mutate({
      priorityId,
      canView,
      canEdit: canView ? currentAccess.canEdit : false // If removing view access, also remove edit access
    });
  };

  const handleEditToggle = (priorityId: number, canEdit: boolean) => {
    const currentAccess = userPriorityAccess[priorityId] || { canView: false, canEdit: false };
    updateVisibilityMutation.mutate({
      priorityId,
      canView: canEdit ? true : currentAccess.canView, // If granting edit access, also grant view access
      canEdit
    });
  };

  if (prioritiesLoading || visibilityLoading) {
    return (
      <div className="flex justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!priorities || priorities.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          No priority lists found. Create priority lists in the Priorities module first.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      {priorities.map((priority: Priority) => {
        const access = userPriorityAccess[priority.id] || { canView: false, canEdit: false };
        
        return (
          <Card key={priority.id} className="p-4 bg-slate-50/50">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{priority.title}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {priority.description || 'Production priority list'}
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant={priority.type === 'production' ? 'default' : 'secondary'} className="text-xs">
                      {priority.type}
                    </Badge>
                    <Badge variant={priority.status === 'new' ? 'outline' : 'secondary'} className="text-xs">
                      {priority.status}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">View Access</span>
                  <Switch 
                    checked={access.canView}
                    disabled={!isAdmin || updateVisibilityMutation.isPending}
                    onCheckedChange={(checked) => handleViewToggle(priority.id, checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Edit Access</span>
                  <Switch 
                    checked={access.canEdit}
                    disabled={!isAdmin || !access.canView || updateVisibilityMutation.isPending}
                    onCheckedChange={(checked) => handleEditToggle(priority.id, checked)}
                  />
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </>
  );
}