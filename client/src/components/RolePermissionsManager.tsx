import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle2, Shield, Settings, Package, Clipboard, Users, BarChart3, FileText, Download, Upload, Save } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from '@/lib/queryClient';
import { Badge } from "@/components/ui/badge";

interface RolePermission {
  id?: number;
  role: string;
  category: string;
  feature: string;
  canView: boolean;
  canEdit: boolean;
  canCreate: boolean;
  canDelete: boolean;
  canImport: boolean;
  canExport: boolean;
  specialPermissions?: any;
}

interface RolePermissionsManagerProps {
  role: string;
  isReadOnly?: boolean; // Added to control read-only mode
}

// Define the available module categories and their features based on actual application structure
const moduleCategories = [
  {
    id: 'projects',
    name: 'Project Management',
    icon: <Clipboard className="h-5 w-5" />,
    features: [
      { id: 'project_list', name: 'Project List' },
      { id: 'project_details', name: 'Project Details' },
      { id: 'project_create', name: 'Create Projects' },
      { id: 'project_edit', name: 'Edit Projects' },
      { id: 'archived_projects', name: 'Archived Projects' },
      { id: 'delivered_projects', name: 'Delivered Projects' },
    ]
  },
  {
    id: 'manufacturing',
    name: 'Manufacturing',
    icon: <Package className="h-5 w-5" />,
    features: [
      { id: 'bay_scheduling', name: 'Bay Scheduling' },
      { id: 'manufacturing_bays', name: 'Manufacturing Bays' },
      { id: 'on_time_delivery', name: 'On Time Delivery' },
      { id: 'supply_chain', name: 'Supply Chain' },
    ]
  },
  {
    id: 'billing',
    name: 'Billing & Finance',
    icon: <FileText className="h-5 w-5" />,
    features: [
      { id: 'billing_milestones', name: 'Billing Milestones' },
      { id: 'sales_forecast', name: 'Sales Forecast' },
      { id: 'sales_deals', name: 'Sales Deals' },
    ]
  },
  {
    id: 'reports',
    name: 'Reports & Analytics',
    icon: <BarChart3 className="h-5 w-5" />,
    features: [
      { id: 'reports', name: 'Reports Dashboard' },
      { id: 'export_reports', name: 'Export Reports' },
      { id: 'calendar', name: 'Calendar View' },
    ]
  },
  {
    id: 'import_export',
    name: 'Import & Export',
    icon: <Download className="h-5 w-5" />,
    features: [
      { id: 'import_data', name: 'Import Data' },
      { id: 'export_data', name: 'Export Data' },
      { id: 'bulk_operations', name: 'Bulk Operations' },
    ]
  },
  {
    id: 'settings',
    name: 'System Settings',
    icon: <Settings className="h-5 w-5" />,
    features: [
      { id: 'user_management', name: 'User Management' },
      { id: 'access_control', name: 'Access Control' },
      { id: 'system_maintenance', name: 'System Maintenance' },
      { id: 'user_preferences', name: 'User Preferences' },
    ]
  },
];

const RolePermissionsManager: React.FC<RolePermissionsManagerProps> = ({ role, isReadOnly = false }) => {
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Fetch permissions for this role
  const { data: fetchedPermissions, isLoading, error } = useQuery({
    queryKey: ['/api/role-permissions', role],
    queryFn: async () => {
      const response = await fetch(`/api/role-permissions?role=${role}`);
      if (!response.ok) {
        throw new Error('Failed to fetch permissions');
      }
      return response.json();
    }
  });

  // Initialize default permissions if none exist for a category/feature
  useEffect(() => {
    if (fetchedPermissions) {
      const initializedPermissions = [...fetchedPermissions];
      let hasCreatedDefaults = false;
      
      // Generate default permissions structure for any missing features
      moduleCategories.forEach(category => {
        category.features.forEach(feature => {
          const existingPermission = fetchedPermissions.find(
            p => p.category === category.id && p.feature === feature.id
          );
          
          if (!existingPermission) {
            hasCreatedDefaults = true;
            // For admin role, grant all permissions by default
            // For editor, grant view & edit but not delete by default
            // For viewer, grant only view by default
            const defaultPermission: RolePermission = {
              role: role,
              category: category.id,
              feature: feature.id,
              canView: true, // All roles can view by default
              canEdit: role === 'admin' || role === 'editor',
              canCreate: role === 'admin' || role === 'editor',
              canDelete: role === 'admin',
              canImport: role === 'admin',
              canExport: true, // All roles can export by default
              specialPermissions: {}
            };
            
            initializedPermissions.push(defaultPermission);
          }
        });
      });
      
      setPermissions(initializedPermissions);
      
      // If we had to create default permissions, mark as having unsaved changes
      // so the save button will appear
      if (hasCreatedDefaults) {
        setUnsavedChanges(true);
      }
    }
  }, [fetchedPermissions, role]);

  // Mutation for bulk updating permissions
  const updatePermissionsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/role-permissions/bulk-update/${role}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ permissions }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update permissions');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Permissions Updated",
        description: `${role.charAt(0).toUpperCase() + role.slice(1)} permissions have been updated successfully.`,
        variant: "default"
      });
      setUnsavedChanges(false);
      queryClient.invalidateQueries({ queryKey: ['/api/role-permissions'] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: `Error updating permissions: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Handle toggle change for a permission
  const handleTogglePermission = (categoryId: string, featureId: string, permissionType: keyof RolePermission) => {
    // Don't allow changes in read-only mode
    if (isReadOnly) return;
    
    const updatedPermissions = permissions.map(p => {
      if (p.category === categoryId && p.feature === featureId) {
        let newPermission = {
          ...p,
          [permissionType]: !p[permissionType as keyof RolePermission]
        };
        
        // If turning off view, also turn off dependent permissions
        if (permissionType === 'canView' && !newPermission.canView) {
          newPermission.canEdit = false;
          newPermission.canCreate = false;
          newPermission.canDelete = false;
        }
        
        // If turning on edit/create/delete, ensure view is on
        if ((permissionType === 'canEdit' || permissionType === 'canCreate' || permissionType === 'canDelete') 
            && newPermission[permissionType]) {
          newPermission.canView = true;
        }
        
        // If turning off edit, also turn off delete
        if (permissionType === 'canEdit' && !newPermission.canEdit) {
          newPermission.canDelete = false;
        }
        
        // If turning on delete, ensure edit is on
        if (permissionType === 'canDelete' && newPermission.canDelete) {
          newPermission.canEdit = true;
          newPermission.canView = true;
        }
        
        return newPermission;
      }
      return p;
    });
    
    setPermissions(updatedPermissions);
    setUnsavedChanges(true);
  };

  // Handle save permissions
  const handleSavePermissions = () => {
    if (isReadOnly) return;
    
    setSaving(true);
    updatePermissionsMutation.mutate();
  };

  // Toggle category expansion
  const toggleCategory = (categoryId: string) => {
    if (expandedCategories.includes(categoryId)) {
      setExpandedCategories(expandedCategories.filter(id => id !== categoryId));
    } else {
      setExpandedCategories([...expandedCategories, categoryId]);
    }
  };

  // Get permission for a specific feature
  const getPermission = (categoryId: string, featureId: string): RolePermission | undefined => {
    return permissions.find(p => p.category === categoryId && p.feature === featureId);
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
      <Alert className="bg-destructive/20 border-destructive">
        <AlertCircle className="h-5 w-5 text-destructive" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {(error as Error).message || "Failed to load permissions"}
        </AlertDescription>
      </Alert>
    );
  }

  // Get role label with proper formatting
  const getRoleLabel = () => {
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-medium">{getRoleLabel()} Role Permissions</h3>
        </div>
        <div className="flex items-center space-x-2">
          {isReadOnly && (
            <Badge variant="outline" className="mr-2">
              Read-Only Mode
            </Badge>
          )}
          <Badge 
            variant={role === 'admin' ? "default" : role === 'editor' ? "secondary" : "outline"}
            className="px-3 py-1"
          >
            {getRoleLabel()} Role
          </Badge>
        </div>
      </div>
      
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">
          Configure what {getRoleLabel()} users can access and modify in the system. Changes will apply to all users with this role.
        </p>
        
        {!isReadOnly && unsavedChanges && (
          <Button 
            variant="default" 
            size="sm" 
            onClick={handleSavePermissions}
            disabled={saving}
            className="flex items-center gap-1"
          >
            {saving ? (
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
      
      <Accordion type="multiple" className="w-full" value={expandedCategories}>
        {moduleCategories.map((category) => (
          <AccordionItem key={category.id} value={category.id}>
            <AccordionTrigger onClick={() => toggleCategory(category.id)} className="hover:no-underline">
              <div className="flex items-center space-x-2">
                {category.icon}
                <span>{category.name}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-7 gap-2 text-xs font-medium text-gray-500 border-b pb-2">
                  <div className="col-span-3">Feature</div>
                  <div className="text-center">View</div>
                  <div className="text-center">Edit</div>
                  <div className="text-center">Create</div>
                  <div className="text-center">Delete</div>
                </div>
                
                {category.features.map((feature) => {
                  const permission = getPermission(category.id, feature.id);
                  
                  return permission ? (
                    <div key={feature.id} className="grid grid-cols-7 gap-2 items-center py-2 border-b border-gray-800">
                      <div className="col-span-3">{feature.name}</div>
                      
                      {/* View Permission */}
                      <div className="flex justify-center">
                        <Switch
                          checked={permission.canView}
                          onCheckedChange={() => handleTogglePermission(category.id, feature.id, 'canView')}
                          disabled={isReadOnly}
                          className={isReadOnly ? "opacity-60" : ""}
                        />
                      </div>
                      
                      {/* Edit Permission */}
                      <div className="flex justify-center">
                        <Switch
                          checked={permission.canEdit}
                          onCheckedChange={() => handleTogglePermission(category.id, feature.id, 'canEdit')}
                          disabled={isReadOnly || !permission.canView} // Can't edit if can't view
                          className={isReadOnly ? "opacity-60" : ""}
                        />
                      </div>
                      
                      {/* Create Permission */}
                      <div className="flex justify-center">
                        <Switch
                          checked={permission.canCreate}
                          onCheckedChange={() => handleTogglePermission(category.id, feature.id, 'canCreate')}
                          disabled={isReadOnly || !permission.canView} // Can't create if can't view
                          className={isReadOnly ? "opacity-60" : ""}
                        />
                      </div>
                      
                      {/* Delete Permission */}
                      <div className="flex justify-center">
                        <Switch
                          checked={permission.canDelete}
                          onCheckedChange={() => handleTogglePermission(category.id, feature.id, 'canDelete')}
                          disabled={isReadOnly || !permission.canEdit} // Can't delete if can't edit
                          className={isReadOnly ? "opacity-60" : ""}
                        />
                      </div>
                    </div>
                  ) : null;
                })}
                
                <div className="py-2">
                  <h4 className="text-sm font-medium mb-2">Advanced Permissions</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`${category.id}-import`}
                          checked={permissions.some(p => p.category === category.id && p.canImport)}
                          onCheckedChange={() => {
                            // Don't allow changes in read-only mode
                            if (isReadOnly) return;
                            
                            // Toggle import permission for all features in this category
                            const allFeatureIds = category.features.map(f => f.id);
                            const currentValue = permissions.some(p => p.category === category.id && p.canImport);
                            
                            const updatedPermissions = permissions.map(p => {
                              if (p.category === category.id && allFeatureIds.includes(p.feature)) {
                                return { ...p, canImport: !currentValue };
                              }
                              return p;
                            });
                            
                            setPermissions(updatedPermissions);
                            setUnsavedChanges(true);
                          }}
                          disabled={isReadOnly}
                          className={isReadOnly ? "opacity-60" : ""}
                        />
                        <Label htmlFor={`${category.id}-import`} className={`flex items-center space-x-1 ${isReadOnly ? "opacity-60" : ""}`}>
                          <Upload className="h-4 w-4" />
                          <span>Import Data</span>
                        </Label>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`${category.id}-export`}
                          checked={permissions.some(p => p.category === category.id && p.canExport)}
                          onCheckedChange={() => {
                            // Don't allow changes in read-only mode
                            if (isReadOnly) return;
                            
                            // Toggle export permission for all features in this category
                            const allFeatureIds = category.features.map(f => f.id);
                            const currentValue = permissions.some(p => p.category === category.id && p.canExport);
                            
                            const updatedPermissions = permissions.map(p => {
                              if (p.category === category.id && allFeatureIds.includes(p.feature)) {
                                return { ...p, canExport: !currentValue };
                              }
                              return p;
                            });
                            
                            setPermissions(updatedPermissions);
                            setUnsavedChanges(true);
                          }}
                          disabled={isReadOnly}
                          className={isReadOnly ? "opacity-60" : ""}
                        />
                        <Label htmlFor={`${category.id}-export`} className={`flex items-center space-x-1 ${isReadOnly ? "opacity-60" : ""}`}>
                          <Download className="h-4 w-4" />
                          <span>Export Data</span>
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      
      <div className="flex justify-end pt-4">
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
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Save Permission Changes
            </>
          )}
        </Button>
      </div>
      
      {unsavedChanges && (
        <Alert className="bg-amber-950/30 border-amber-700">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          <AlertTitle>Unsaved Changes</AlertTitle>
          <AlertDescription>
            You have unsaved permission changes. Click "Save Permission Changes" to apply them.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default RolePermissionsManager;