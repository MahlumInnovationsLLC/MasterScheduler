import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield, Save, RefreshCw, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { apiRequest } from '@/lib/queryClient';

// Permission categories and their corresponding features
const permissionStructure = {
  projects: {
    label: 'Projects',
    features: [
      { id: 'project_list', name: 'Project List' },
      { id: 'project_details', name: 'Project Details' },
      { id: 'project_statuses', name: 'Project Statuses' },
      { id: 'project_financial', name: 'Financial Data' },
      { id: 'project_documents', name: 'Documents' },
    ]
  },
  manufacturing: {
    label: 'Manufacturing',
    features: [
      { id: 'bay_schedule', name: 'Bay Schedule' },
      { id: 'production_status', name: 'Production Status' },
      { id: 'manufacturing_bays', name: 'Bay Management' },
      { id: 'capacity_planning', name: 'Capacity Planning' },
    ]
  },
  billing: {
    label: 'Billing',
    features: [
      { id: 'billing_overview', name: 'Billing Overview' },
      { id: 'billing_milestones', name: 'Billing Milestones' },
      { id: 'invoice_management', name: 'Invoice Management' },
      { id: 'payment_tracking', name: 'Payment Tracking' },
    ]
  },
  users: {
    label: 'Users',
    features: [
      { id: 'user_management', name: 'User Management' },
      { id: 'user_roles', name: 'Role Management' },
      { id: 'user_activity', name: 'User Activity' },
    ]
  },
  data: {
    label: 'Data',
    features: [
      { id: 'data_analytics', name: 'Analytics' },
      { id: 'data_dashboards', name: 'Dashboards' },
      { id: 'data_exports', name: 'Data Exports' },
    ]
  },
  reports: {
    label: 'Reports',
    features: [
      { id: 'reports_financial', name: 'Financial Reports' },
      { id: 'reports_manufacturing', name: 'Manufacturing Reports' },
      { id: 'reports_management', name: 'Management Reports' },
      { id: 'reports_custom', name: 'Custom Reports' },
    ]
  },
  settings: {
    label: 'Settings',
    features: [
      { id: 'system_settings', name: 'System Settings' },
      { id: 'company_profile', name: 'Company Profile' },
      { id: 'email_templates', name: 'Email Templates' },
      { id: 'system_logs', name: 'System Logs' },
    ]
  },
  import_export: {
    label: 'Import/Export',
    features: [
      { id: 'import_projects', name: 'Import Projects' },
      { id: 'import_manufacturing', name: 'Import Manufacturing Data' },
      { id: 'import_billing', name: 'Import Billing Data' },
      { id: 'export_all', name: 'Export All Data' },
    ]
  }
};

// Permission types that can be toggled
const permissionTypes = [
  { id: 'canView', name: 'View', description: 'Can view this feature' },
  { id: 'canEdit', name: 'Edit', description: 'Can edit/modify data in this feature' },
  { id: 'canCreate', name: 'Create', description: 'Can create new items in this feature' },
  { id: 'canDelete', name: 'Delete', description: 'Can delete items from this feature' },
  { id: 'canImport', name: 'Import', description: 'Can import data for this feature' },
  { id: 'canExport', name: 'Export', description: 'Can export data from this feature' },
];

// The roles available in the system
const roleTypes = [
  { id: 'viewer', name: 'Viewer', description: 'Basic read-only access' },
  { id: 'editor', name: 'Editor', description: 'Can edit most data but not manage users or system settings' },
  { id: 'admin', name: 'Admin', description: 'Full system access and control' },
];

interface RolePermissionsManagerProps {
  role?: string;
}

const RolePermissionsManager = ({ role }: RolePermissionsManagerProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeRole, setActiveRole] = useState(role || 'viewer');
  const [activeCategory, setActiveCategory] = useState(Object.keys(permissionStructure)[0]);
  const [permissions, setPermissions] = useState<Record<string, any>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch permissions for the active role
  const { data: rolePermissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ['/api/role-permissions', activeRole],
    queryFn: async () => {
      const response = await fetch(`/api/role-permissions?role=${activeRole}`);
      if (!response.ok) {
        throw new Error('Failed to fetch role permissions');
      }
      return response.json();
    },
    refetchOnWindowFocus: false,
  });

  // Save updated permissions
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/role-permissions/bulk-update/${activeRole}`, {
        method: 'POST',
        body: JSON.stringify({ permissions: data }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Permissions updated",
        description: `Permissions for ${roleTypes.find(r => r.id === activeRole)?.name || activeRole} have been updated successfully.`,
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/role-permissions'] });
      setHasChanges(false);
    },
    onError: (error) => {
      toast({
        title: "Error updating permissions",
        description: `Failed to update permissions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    },
  });

  // Initialize permissions from fetched data
  useEffect(() => {
    if (rolePermissions) {
      setPermissions(rolePermissions);
      setIsLoading(false);
    }
  }, [rolePermissions]);

  // Handle the save action
  const handleSavePermissions = () => {
    saveMutation.mutate(permissions);
  };

  // Toggle a specific permission
  const togglePermission = (categoryId: string, featureId: string, permissionType: string, value: boolean) => {
    setPermissions(prev => {
      // Find the existing permission if it exists
      const existingIndex = prev.findIndex(p => 
        p.role === activeRole && 
        p.category === categoryId && 
        p.feature === featureId
      );

      // Create updated permissions array
      const updated = [...prev];
      
      if (existingIndex >= 0) {
        // Update existing permission
        updated[existingIndex] = {
          ...updated[existingIndex],
          [permissionType]: value
        };
      } else {
        // Create new permission
        updated.push({
          role: activeRole,
          category: categoryId,
          feature: featureId,
          [permissionType]: value,
        });
      }

      setHasChanges(true);
      return updated;
    });
  };

  // Check if a permission is enabled
  const isPermissionEnabled = (categoryId: string, featureId: string, permissionType: string): boolean => {
    const permission = permissions.find(p => 
      p.role === activeRole && 
      p.category === categoryId && 
      p.feature === featureId
    );

    // If no permission record exists or the specific permission is not set, default to false
    return permission ? !!permission[permissionType] : false;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" /> Role Permissions
        </CardTitle>
        <CardDescription>
          Customize access permissions for each role in the system
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Role Selection Tabs */}
        <Tabs value={activeRole} onValueChange={setActiveRole} className="mb-6">
          <TabsList className="grid w-full grid-cols-3">
            {roleTypes.map(role => (
              <TabsTrigger 
                key={role.id} 
                value={role.id}
                className="relative"
              >
                {role.name}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {roleTypes.map(role => (
            <TabsContent key={role.id} value={role.id} className="pt-4">
              <div className="text-sm text-muted-foreground mb-4">
                {role.description}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Category Selection Tabs */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-6">
          <TabsList className="flex flex-wrap">
            {Object.entries(permissionStructure).map(([id, category]) => (
              <TabsTrigger 
                key={id} 
                value={id}
                className="text-xs"
              >
                {category.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {isLoading || permissionsLoading ? (
          <div className="flex justify-center py-6">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Permission Toggles Section */}
            <div className="space-y-6">
              {permissionStructure[activeCategory as keyof typeof permissionStructure].features.map(feature => (
                <div key={feature.id} className="border rounded-md p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-medium">{feature.name}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                    {permissionTypes.map(permission => (
                      <div key={permission.id} className="flex items-center space-x-2">
                        <Switch
                          id={`${feature.id}-${permission.id}`}
                          checked={isPermissionEnabled(activeCategory, feature.id, permission.id)}
                          onCheckedChange={(checked) => togglePermission(activeCategory, feature.id, permission.id, checked)}
                        />
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Label 
                                htmlFor={`${feature.id}-${permission.id}`}
                                className="text-sm cursor-pointer"
                              >
                                {permission.name}
                              </Label>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{permission.description}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Save Button */}
            <div className="mt-6 flex justify-end">
              <Button
                onClick={handleSavePermissions}
                disabled={!hasChanges || saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Permissions
                  </>
                )}
              </Button>
            </div>

            {/* Information Text */}
            <div className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>
                Changes to permissions are applied instantly to all users with this role.
                Note that the Admin role always has full access to all features regardless of these settings.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default RolePermissionsManager;