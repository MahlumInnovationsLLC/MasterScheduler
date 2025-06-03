import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Search,
  Settings,
  Users,
  Eye,
  EyeOff,
  RotateCcw,
  Save
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface User {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  isApproved: boolean;
}

interface UserModuleVisibility {
  id: number;
  userId: string;
  module: string;
  isVisible: boolean;
  user?: User;
}

interface ModuleConfig {
  id: string;
  name: string;
  description: string;
  defaultVisible: {
    viewer: boolean;
    editor: boolean;
    admin: boolean;
  };
}

const moduleConfigs: ModuleConfig[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Main dashboard overview',
    defaultVisible: { viewer: true, editor: true, admin: true }
  },
  {
    id: 'projects',
    name: 'Projects',
    description: 'Project management and tracking',
    defaultVisible: { viewer: true, editor: true, admin: true }
  },
  {
    id: 'manufacturing',
    name: 'Manufacturing',
    description: 'Manufacturing bays and scheduling',
    defaultVisible: { viewer: true, editor: true, admin: true }
  },
  {
    id: 'billing',
    name: 'Billing',
    description: 'Billing milestones and finance',
    defaultVisible: { viewer: true, editor: true, admin: true }
  },
  {
    id: 'sales',
    name: 'Sales',
    description: 'Sales forecasts and deals',
    defaultVisible: { viewer: false, editor: true, admin: true }
  },
  {
    id: 'reports',
    name: 'Reports',
    description: 'Analytics and reporting',
    defaultVisible: { viewer: true, editor: true, admin: true }
  },
  {
    id: 'import_export',
    name: 'Import/Export',
    description: 'Data import and export tools',
    defaultVisible: { viewer: true, editor: true, admin: true }
  },
  {
    id: 'settings',
    name: 'Settings',
    description: 'System settings and configuration',
    defaultVisible: { viewer: true, editor: true, admin: true }
  },
  {
    id: 'calendar',
    name: 'Calendar',
    description: 'Calendar view and scheduling',
    defaultVisible: { viewer: true, editor: true, admin: true }
  }
];

const UserModuleVisibilityManager: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingChanges, setPendingChanges] = useState<Record<string, Record<string, boolean>>>({});

  // Fetch all users
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
    staleTime: 5 * 60 * 1000,
  });

  // Fetch all user module visibility settings
  const { data: visibilityData = [], isLoading } = useQuery<UserModuleVisibility[]>({
    queryKey: ['/api/user-module-visibility'],
    staleTime: 2 * 60 * 1000,
  });

  // Initialize default visibility for users who don't have settings
  const initializeUserVisibility = useMutation({
    mutationFn: async ({ userId, userRole }: { userId: string; userRole: string }) => {
      return apiRequest(`/api/user-module-visibility/${userId}/initialize`, {
        method: 'POST',
        body: { userRole }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-module-visibility'] });
      toast({
        title: "Success",
        description: "Default module visibility initialized for user"
      });
    },
    onError: (error) => {
      console.error('Error initializing user visibility:', error);
      toast({
        title: "Error",
        description: "Failed to initialize default module visibility",
        variant: "destructive"
      });
    }
  });

  // Update module visibility
  const updateVisibility = useMutation({
    mutationFn: async ({ userId, module, isVisible }: { userId: string; module: string; isVisible: boolean }) => {
      return apiRequest('/api/user-module-visibility', {
        method: 'POST',
        body: { userId, module, isVisible }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-module-visibility'] });
      toast({
        title: "Success",
        description: "Module visibility updated successfully"
      });
    },
    onError: (error) => {
      console.error('Error updating visibility:', error);
      toast({
        title: "Error",
        description: "Failed to update module visibility",
        variant: "destructive"
      });
    }
  });

  // Filter users based on search term
  const filteredUsers = users.filter(user => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      user.username.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchLower)
    );
  });

  // Get visibility settings for a specific user
  const getUserVisibility = (userId: string) => {
    const userVisibility = visibilityData.filter(v => v.userId === userId);
    const visibilityMap: Record<string, boolean> = {};
    
    // Initialize with defaults based on user role
    const user = users.find(u => u.id === userId);
    const userRole = user?.role || 'viewer';
    
    moduleConfigs.forEach(module => {
      const existing = userVisibility.find(v => v.module === module.id);
      if (existing) {
        visibilityMap[module.id] = existing.isVisible;
      } else {
        // Use default based on role
        visibilityMap[module.id] = module.defaultVisible[userRole as keyof typeof module.defaultVisible] ?? true;
      }
    });

    return visibilityMap;
  };

  // Handle visibility toggle with pending changes
  const handleVisibilityToggle = (userId: string, module: string, isVisible: boolean) => {
    setPendingChanges(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [module]: isVisible
      }
    }));
  };

  // Save pending changes for a user
  const savePendingChanges = async (userId: string) => {
    const userChanges = pendingChanges[userId];
    if (!userChanges) return;

    try {
      for (const [module, isVisible] of Object.entries(userChanges)) {
        await updateVisibility.mutateAsync({ userId, module, isVisible });
      }
      
      // Clear pending changes for this user
      setPendingChanges(prev => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
    } catch (error) {
      console.error('Error saving changes:', error);
    }
  };

  // Reset to defaults for a user
  const resetToDefaults = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    initializeUserVisibility.mutate({ userId, userRole: user.role });
    
    // Clear any pending changes
    setPendingChanges(prev => {
      const updated = { ...prev };
      delete updated[userId];
      return updated;
    });
  };

  const getUserDisplayName = (user: User) => {
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    return fullName || user.username;
  };

  const hasPendingChanges = (userId: string) => {
    return pendingChanges[userId] && Object.keys(pendingChanges[userId]).length > 0;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Module Visibility Manager</CardTitle>
          <CardDescription>Loading user module settings...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            User Module Visibility Manager
          </CardTitle>
          <CardDescription>
            Control which modules each user can see in the dashboard. Changes are applied immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users by name, username, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {filteredUsers.map(user => {
          const userVisibility = getUserVisibility(user.id);
          const userPendingChanges = pendingChanges[user.id] || {};
          const hasChanges = hasPendingChanges(user.id);

          return (
            <Card key={user.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5" />
                    <div>
                      <CardTitle className="text-lg">{getUserDisplayName(user)}</CardTitle>
                      <CardDescription>
                        {user.email} • Role: {user.role} • 
                        <Badge variant={user.isApproved ? "default" : "secondary"} className="ml-2">
                          {user.isApproved ? "Approved" : "Pending"}
                        </Badge>
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {hasChanges && (
                      <Button
                        size="sm"
                        onClick={() => savePendingChanges(user.id)}
                        disabled={updateVisibility.isPending}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Save Changes
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resetToDefaults(user.id)}
                      disabled={initializeUserVisibility.isPending}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Reset to Defaults
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {moduleConfigs.map(module => {
                    const currentVisibility = userPendingChanges[module.id] ?? userVisibility[module.id];
                    const hasChange = userPendingChanges[module.id] !== undefined;
                    const defaultForRole = module.defaultVisible[user.role as keyof typeof module.defaultVisible];

                    return (
                      <div
                        key={module.id}
                        className={`flex items-center justify-between p-3 border rounded-lg ${
                          hasChange ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {currentVisibility ? (
                            <Eye className="h-4 w-4 text-green-600" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          )}
                          <div>
                            <Label className="text-sm font-medium">{module.name}</Label>
                            <p className="text-xs text-gray-500">{module.description}</p>
                            {!defaultForRole && (
                              <Badge variant="outline" className="text-xs mt-1">
                                Hidden by default for {user.role}s
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Switch
                          checked={currentVisibility}
                          onCheckedChange={(checked) => handleVisibilityToggle(user.id, module.id, checked)}
                          disabled={updateVisibility.isPending}
                        />
                      </div>
                    );
                  })}
                </div>
                {hasChanges && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      You have unsaved changes for this user. Click "Save Changes" to apply them.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredUsers.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No users found matching your search criteria.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UserModuleVisibilityManager;