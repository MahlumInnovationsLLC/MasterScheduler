
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from '@/lib/queryClient';
import { Badge } from "@/components/ui/badge";
import { Settings, Save } from 'lucide-react';

interface UserPermission {
  id?: number;
  userId: string;
  module: string;
  canAccess: boolean;
}

interface UserPermissionsManagerProps {
  userId: string;
  userEmail: string;
  userRole: string;
  isReadOnly?: boolean;
}

// Available modules that can be controlled
const availableModules = [
  { id: 'dashboard', name: 'Dashboard', description: 'Main dashboard overview' },
  { id: 'projects', name: 'Projects', description: 'Project management and status' },
  { id: 'manufacturing', name: 'Manufacturing', description: 'Manufacturing bays and scheduling' },
  { id: 'billing', name: 'Billing', description: 'Billing milestones and financial tracking' },
  { id: 'sales', name: 'Sales', description: 'Sales forecast and deals' },
  { id: 'reports', name: 'Reports', description: 'Analytics and reporting' },
  { id: 'calendar', name: 'Calendar', description: 'Calendar view and scheduling' },
  { id: 'supply_chain', name: 'Supply Chain', description: 'Supply chain management' },
  { id: 'delivered_projects', name: 'Delivered Projects', description: 'Completed project tracking' },
  { id: 'archived_projects', name: 'Archived Projects', description: 'Archived project management' },
  { id: 'import_export', name: 'Import/Export', description: 'Data import and export tools' },
  { id: 'settings', name: 'Settings', description: 'System settings and configuration' },
];

const UserPermissionsManager: React.FC<UserPermissionsManagerProps> = ({ 
  userId, 
  userEmail, 
  userRole, 
  isReadOnly = false 
}) => {
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  // Fetch user permissions
  const { data: fetchedPermissions, isLoading, error } = useQuery({
    queryKey: ['/api/user-permissions', userId],
    queryFn: async () => {
      const response = await fetch(`/api/user-permissions/${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user permissions');
      }
      return response.json();
    }
  });

  // Initialize permissions with defaults if none exist
  useEffect(() => {
    if (fetchedPermissions) {
      const initializedPermissions = [...fetchedPermissions];
      let hasCreatedDefaults = false;
      
      // Generate default permissions for any missing modules
      availableModules.forEach(module => {
        const existingPermission = fetchedPermissions.find(p => p.module === module.id);
        
        if (!existingPermission) {
          hasCreatedDefaults = true;
          let defaultAccess = true;
          
          // Set defaults based on role
          if (userRole === 'viewer') {
            defaultAccess = module.id !== 'sales'; // Viewers can't see sales by default
          } else if (userRole === 'editor' || userRole === 'admin') {
            defaultAccess = true; // Editors and admins can see everything by default
          }
          
          const defaultPermission: UserPermission = {
            userId,
            module: module.id,
            canAccess: defaultAccess,
          };
          
          initializedPermissions.push(defaultPermission);
        }
      });
      
      setPermissions(initializedPermissions);
      
      if (hasCreatedDefaults) {
        setUnsavedChanges(true);
      }
    }
  }, [fetchedPermissions, userId, userRole]);

  // Mutation for bulk updating permissions
  const updatePermissionsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/user-permissions/bulk-update/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          permissions: permissions.map(p => ({ 
            module: p.module, 
            canAccess: p.canAccess 
          })) 
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update user permissions');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Permissions Updated",
        description: `${userEmail}'s module permissions have been updated successfully.`,
        variant: "default"
      });
      setUnsavedChanges(false);
      queryClient.invalidateQueries({ queryKey: ['/api/user-permissions'] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: `Error updating permissions: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Handle toggle change for a module
  const handleToggleModule = (moduleId: string) => {
    if (isReadOnly) return;
    
    const updatedPermissions = permissions.map(p => {
      if (p.module === moduleId) {
        return { ...p, canAccess: !p.canAccess };
      }
      return p;
    });
    
    setPermissions(updatedPermissions);
    setUnsavedChanges(true);
  };

  // Handle save permissions
  const handleSavePermissions = () => {
    if (isReadOnly) return;
    updatePermissionsMutation.mutate();
  };

  // Get permission for a specific module
  const getModulePermission = (moduleId: string): boolean => {
    const permission = permissions.find(p => p.module === moduleId);
    return permission ? permission.canAccess : false;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-4">
        Error loading permissions: {(error as Error).message}
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings className="h-5 w-5 text-primary" />
            <CardTitle>Module Access Control</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            {isReadOnly && (
              <Badge variant="outline" className="mr-2">
                Read-Only Mode
              </Badge>
            )}
            <Badge 
              variant={userRole === 'admin' ? "default" : userRole === 'editor' ? "secondary" : "outline"}
              className="px-3 py-1"
            >
              {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
            </Badge>
          </div>
        </div>
        <CardDescription>
          Configure which modules {userEmail} can access. Changes apply immediately after saving.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500">
            Toggle modules on/off to control what this user can see in their navigation and dashboard.
          </p>
          
          {!isReadOnly && unsavedChanges && (
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleSavePermissions}
              disabled={updatePermissionsMutation.isPending}
              className="flex items-center gap-1"
            >
              {updatePermissionsMutation.isPending ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full mr-1"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1" />
                  Save Changes
                </>
              )}
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {availableModules.map((module) => (
            <div key={module.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <Label htmlFor={`module-${module.id}`} className="font-medium">
                    {module.name}
                  </Label>
                  {getModulePermission(module.id) && (
                    <Badge variant="secondary" className="text-xs">
                      Enabled
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">{module.description}</p>
              </div>
              <Switch
                id={`module-${module.id}`}
                checked={getModulePermission(module.id)}
                onCheckedChange={() => handleToggleModule(module.id)}
                disabled={isReadOnly}
                className={isReadOnly ? "opacity-60" : ""}
              />
            </div>
          ))}
        </div>
        
        {!isReadOnly && (
          <div className="flex justify-end pt-4 border-t">
            <Button
              onClick={handleSavePermissions}
              disabled={!unsavedChanges || updatePermissionsMutation.isPending}
              className="w-full sm:w-auto"
            >
              {updatePermissionsMutation.isPending ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-b-transparent rounded-full"></div>
                  Saving Changes...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Module Permissions
                </>
              )}
            </Button>
          </div>
        )}
        
        {unsavedChanges && (
          <div className="bg-amber-950/30 border border-amber-700 rounded-lg p-4">
            <p className="text-amber-500 text-sm">
              You have unsaved permission changes. Click "Save Module Permissions" to apply them.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserPermissionsManager;
