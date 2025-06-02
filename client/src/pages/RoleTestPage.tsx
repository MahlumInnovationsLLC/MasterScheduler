import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRolePermissions } from '@/hooks/use-role-permissions';
import { RoleBasedWrapper } from '@/components/RoleBasedWrapper';
import { useAuth } from '@/hooks/use-auth';
import { Shield, Edit, Eye, UserCheck } from 'lucide-react';

const RoleTestPage = () => {
  const { user } = useAuth();
  const { userRole, isViewOnly, canEdit, isAdmin, roleLabel } = useRolePermissions();

  const testFeatures = [
    {
      name: "View Data",
      description: "Can view all project data",
      requiredRole: "viewer",
      component: (
        <Button variant="outline" className="w-full">
          <Eye className="h-4 w-4 mr-2" />
          View Projects
        </Button>
      )
    },
    {
      name: "Edit Data", 
      description: "Can modify project information",
      requiredRole: "editor",
      component: (
        <RoleBasedWrapper requiresEdit={true}>
          <Button variant="default" className="w-full">
            <Edit className="h-4 w-4 mr-2" />
            Edit Projects
          </Button>
        </RoleBasedWrapper>
      )
    },
    {
      name: "Admin Functions",
      description: "Can access system settings",
      requiredRole: "admin",
      component: (
        <RoleBasedWrapper requiresAdmin={true}>
          <Button variant="destructive" className="w-full">
            <Shield className="h-4 w-4 mr-2" />
            System Settings
          </Button>
        </RoleBasedWrapper>
      )
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Role Testing Dashboard</h1>
        <div className="flex items-center space-x-4">
          <Badge variant={isAdmin ? "default" : canEdit ? "secondary" : "outline"}>
            <UserCheck className="h-4 w-4 mr-1" />
            {roleLabel}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current User Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">User ID:</p>
              <p className="text-sm text-muted-foreground">{user?.id || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Email:</p>
              <p className="text-sm text-muted-foreground">{user?.email || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Role:</p>
              <p className="text-sm text-muted-foreground">{userRole}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Name:</p>
              <p className="text-sm text-muted-foreground">{user?.firstName} {user?.lastName}</p>
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <h4 className="font-medium mb-2">Permissions</h4>
            <div className="grid grid-cols-3 gap-2">
              <Badge variant={isViewOnly ? "default" : "outline"}>
                View Only: {isViewOnly ? "Yes" : "No"}
              </Badge>
              <Badge variant={canEdit ? "default" : "outline"}>
                Can Edit: {canEdit ? "Yes" : "No"}
              </Badge>
              <Badge variant={isAdmin ? "default" : "outline"}>
                Admin: {isAdmin ? "Yes" : "No"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        {testFeatures.map((feature, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="text-lg">{feature.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
              <Badge variant="outline" className="w-fit">
                Requires: {feature.requiredRole}
              </Badge>
            </CardHeader>
            <CardContent>
              {feature.component}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Role Testing Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            To test different roles, add the following URL parameters:
          </p>
          <div className="space-y-2">
            <div className="p-3 bg-muted rounded-md">
              <code className="text-sm">?role=admin</code> - Full admin access
            </div>
            <div className="p-3 bg-muted rounded-md">
              <code className="text-sm">?role=editor</code> - Can edit but not access admin features
            </div>
            <div className="p-3 bg-muted rounded-md">
              <code className="text-sm">?role=viewer</code> - Read-only access
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RoleTestPage;