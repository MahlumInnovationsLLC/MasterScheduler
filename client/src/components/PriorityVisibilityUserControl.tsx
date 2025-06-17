import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Users, Eye, Edit, Move } from "lucide-react";

interface PriorityVisibilityUserControlProps {
  userId: number;
  user: any;
  isAdmin: boolean;
}

interface UserPriorityAccess {
  canViewPriorities: boolean;
  canEditPriorities: boolean;
  canDragReorder: boolean;
}

export default function PriorityVisibilityUserControl({ userId, user, isAdmin }: PriorityVisibilityUserControlProps) {
  const { toast } = useToast();

  // Fetch current priority access from database
  const { data: userAccess, isLoading: accessLoading } = useQuery({
    queryKey: ['/api/users', userId, 'priority-access'],
    queryFn: async () => {
      const response = await fetch(`/api/users/${userId}/priority-access`);
      if (!response.ok) throw new Error('Failed to fetch priority access');
      return response.json();
    },
    enabled: !!userId
  });

  // Update user priority access mutation
  const updateAccessMutation = useMutation({
    mutationFn: async (accessUpdate: Partial<UserPriorityAccess>) => {
      const response = await fetch(`/api/users/${userId}/priority-access`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accessUpdate),
      });
      if (!response.ok) throw new Error('Failed to update priority access');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Access Updated',
        description: 'Priority access permissions updated successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'priority-access'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update priority access',
        variant: 'destructive',
      });
    },
  });

  const handleAccessChange = (accessType: keyof UserPriorityAccess, value: boolean) => {
    updateAccessMutation.mutate({ [accessType]: value });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="w-5 h-5 text-purple-600" />
          Priority Module Access - {user?.email || 'User'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <Eye className="w-5 h-5 text-blue-600" />
            <div>
              <h4 className="font-medium text-gray-900">View Priorities</h4>
              <p className="text-sm text-gray-600">Can see the Priority Visibility page and view all project priorities</p>
            </div>
          </div>
          <Switch
            checked={userAccess?.canViewPriorities ?? true}
            onCheckedChange={(checked) => handleAccessChange('canViewPriorities', checked)}
            disabled={updateAccessMutation.isPending || accessLoading}
            className="priority-switch"
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <Edit className="w-5 h-5 text-green-600" />
            <div>
              <h4 className="font-medium text-gray-900">Edit Priorities</h4>
              <p className="text-sm text-gray-600">Can add new priorities and modify existing priority details</p>
            </div>
          </div>
          <Switch
            checked={userAccess?.canEditPriorities ?? false}
            onCheckedChange={(checked) => handleAccessChange('canEditPriorities', checked)}
            disabled={updateAccessMutation.isPending || accessLoading || !(userAccess?.canViewPriorities ?? true)}
            className="priority-switch"
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <Move className="w-5 h-5 text-orange-600" />
            <div>
              <h4 className="font-medium text-gray-900">Drag & Reorder</h4>
              <p className="text-sm text-gray-600">Can drag and drop to reorder priority rankings</p>
            </div>
          </div>
          <Switch
            checked={userAccess?.canDragReorder ?? false}
            onCheckedChange={(checked) => handleAccessChange('canDragReorder', checked)}
            disabled={updateAccessMutation.isPending || accessLoading || !(userAccess?.canViewPriorities ?? true)}
            className="priority-switch"
          />
        </div>

        {!(userAccess?.canViewPriorities ?? true) && (
          <Alert>
            <AlertDescription>
              This user will not see the Priority Visibility module in their navigation.
            </AlertDescription>
          </Alert>
        )}

        {updateAccessMutation.isPending && (
          <Alert>
            <AlertDescription>Updating priority access permissions...</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}