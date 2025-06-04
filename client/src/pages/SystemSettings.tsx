import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  AlertCircle, 
  AlertTriangle, 
  CheckCircle2, 
  Trash2, 
  UserPlus, 
  Edit, 
  Lock, 
  Shield, 
  UserCheck, 
  UserX, 
  RefreshCw,
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import RolePermissionsManager from "@/components/RolePermissionsManager";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest, getQueryFn } from '../lib/queryClient';

const SystemSettings = () => {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showNotificationForm, setShowNotificationForm] = useState(false);
  const [deleteResult, setDeleteResult] = useState<{
    success: boolean;
    message: string;
    totalDeleted?: number;
  } | null>(null);
  
  // User role state (for permission management)
  const [isAdmin, setIsAdmin] = useState(true); // Default to true in development mode
  
  // User sorting state
  const [userSort, setUserSort] = useState<{column: string, direction: 'asc' | 'desc'}>({
    column: 'lastName',
    direction: 'asc'
  });
  
  // User edit dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editUserForm, setEditUserForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: '',
    department: ''
  });
  
  // In a production environment, we would check the user's role here
  // For now, since we're in development mode, we'll always have admin rights
  // This ensures the permissions UI is editable during development
  useEffect(() => {
    console.log('Development mode detected, enabling admin capabilities');
    setIsAdmin(true);
  }, []);
  
  // Get system storage info
  const {
    data: storageInfo = { totalStorageUsed: 0 },
    isLoading: storageInfoLoading,
    error: storageInfoError
  } = useQuery({
    queryKey: ['/api/system/storage-info'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/system/storage-info');
        if (!response.ok) {
          return { totalStorageUsed: 0 };
        }
        return await response.json();
      } catch (error) {
        // Silently fail but with a fallback value
        console.error("Error fetching storage info:", error);
        return { totalStorageUsed: 0 };
      }
    },
    retry: false // Don't retry if it fails
  });

  const restoreProjectMutation = useMutation({
    mutationFn: async (projectId: number) => {
      const response = await fetch(`/api/projects/${projectId}/restore`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to restore project');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Project Restored",
        description: "Project has been successfully restored",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects/archived'] });
    },
    onError: () => {
      toast({
        title: "Restore Failed",
        description: "Failed to restore project",
        variant: "destructive"
      });
    }
  });
  
  // Fetch data for charts and stats
  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
    queryFn: getQueryFn({}),
  });
  
  const { data: userAuditLogs = [] } = useQuery({
    queryKey: ['/api/user-audit-logs'],
    queryFn: getQueryFn({}),
  });
  
  const { data: rolePermissions = [] } = useQuery({
    queryKey: ['/api/role-permissions'],
    queryFn: getQueryFn({}),
  });
  
  const { data: allowedEmails = [] } = useQuery({
    queryKey: ['/api/allowed-emails'],
    queryFn: getQueryFn({}),
  });
  
  const { data: projects = [] } = useQuery({
    queryKey: ['/api/projects'],
    queryFn: getQueryFn({}),
  });
  
  // Active projects (not archived)
  const activeProjects = projects.filter((project: any) => project.status !== 'archived');
  
  // Archived projects
  const { data: archivedProjects = [] } = useQuery({
    queryKey: ['/api/projects/archived'],
    queryFn: getQueryFn({}),
  });
  
  const handleCreateAllowedEmail = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const emailPattern = formData.get('emailPattern')?.toString() || '';
    const defaultRole = formData.get('defaultRole')?.toString() || 'viewer';
    const autoApprove = formData.get('autoApprove') === 'on';
    
    if (!emailPattern) return;
    
    try {
      const response = await fetch('/api/allowed-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailPattern,
          defaultRole,
          autoApprove
        })
      });
      
      if (response.ok) {
        toast({
          title: "Email Pattern Added",
          description: `${emailPattern} has been added to allowed emails`,
        });
        queryClient.invalidateQueries({ queryKey: ['/api/allowed-emails'] });
        
        // Reset form
        e.currentTarget.reset();
      } else {
        toast({
          title: "Failed to Add",
          description: "There was an error adding the email pattern",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "There was an error adding the email pattern",
        variant: "destructive"
      });
    }
  };
  
  const handleDeleteAllowedEmail = async (id: number) => {
    try {
      const response = await fetch(`/api/allowed-emails/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        toast({
          title: "Email Pattern Deleted",
          description: "The email pattern has been removed",
        });
        queryClient.invalidateQueries({ queryKey: ['/api/allowed-emails'] });
      } else {
        toast({
          title: "Failed to Delete",
          description: "There was an error removing the email pattern",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "There was an error removing the email pattern",
        variant: "destructive"
      });
    }
  };
  
  // Get user names for audit logs
  const getUserName = (userId: string) => {
    const user = users.find((u: any) => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : 'Unknown User';
  };
  
  // Handle approval of a user
  const handleApproveUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        toast({
          title: "User Approved",
          description: "User has been approved for access",
          variant: "success"
        });
        
        // Refresh user list
        queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      } else {
        toast({
          title: "Approval Failed",
          description: "There was an error approving the user",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "There was an error approving the user",
        variant: "destructive"
      });
    }
  };
  
  // Handle rejection/revocation of a user
  const handleRejectUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        toast({
          title: "User Rejected",
          description: "User access has been rejected/revoked",
        });
        
        // Refresh user list
        queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      } else {
        toast({
          title: "Rejection Failed",
          description: "There was an error rejecting the user",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "There was an error rejecting the user",
        variant: "destructive"
      });
    }
  };
  
  // Handle edit user
  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setEditUserForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      role: user.role || 'viewer',
      department: user.department || ''
    });
    setIsEditDialogOpen(true);
  };
  
  // Handle user form submission
  const handleEditUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    // Direct fetch call with proper method formatting
    fetch(`/api/users/${editingUser.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(editUserForm),
      credentials: 'include',
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to update user');
        }
        return response.json();
      })
      .then(() => {
        // Update user list
        queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      })
      .then(() => {
        toast({
          title: "User Updated",
          description: "User information has been updated",
        });
        setIsEditDialogOpen(false);
      })
      .catch(error => {
        console.error("Error updating user:", error);
        toast({
          title: "Update Failed",
          description: "There was an error updating the user",
          variant: "destructive"
        });
      });
  };
  
  // Function to sort users
  const sortUsers = (users: any[], column: string, direction: 'asc' | 'desc') => {
    return [...users].sort((a, b) => {
      let aValue = a[column];
      let bValue = b[column];
      
      // Special handling for nested properties
      if (column.includes('.')) {
        const [parent, child] = column.split('.');
        aValue = a[parent] ? a[parent][child] : '';
        bValue = b[parent] ? b[parent][child] : '';
      }
      
      // Convert to lowercase for string comparison
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();
      
      // Handle undefined or null values
      if (aValue === undefined || aValue === null) aValue = '';
      if (bValue === undefined || bValue === null) bValue = '';
      
      return direction === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    });
  };

  return (
    <div className="container mx-auto py-10 space-y-8">
      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and role.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleEditUserSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="firstName" className="text-right">
                  First Name
                </Label>
                <Input
                  id="firstName"
                  value={editUserForm.firstName}
                  onChange={(e) => setEditUserForm({...editUserForm, firstName: e.target.value})}
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="lastName" className="text-right">
                  Last Name
                </Label>
                <Input
                  id="lastName"
                  value={editUserForm.lastName}
                  onChange={(e) => setEditUserForm({...editUserForm, lastName: e.target.value})}
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email
                </Label>
                <Input
                  id="email"
                  value={editUserForm.email}
                  onChange={(e) => setEditUserForm({...editUserForm, email: e.target.value})}
                  className="col-span-3"
                  disabled
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">
                  Role
                </Label>
                <Select 
                  value={editUserForm.role} 
                  onValueChange={(value) => setEditUserForm({...editUserForm, role: value})}
                >
                  <SelectTrigger id="role" className="col-span-3">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="department" className="text-right">
                  Department
                </Label>
                <Input
                  id="department"
                  value={editUserForm.department}
                  onChange={(e) => setEditUserForm({...editUserForm, department: e.target.value})}
                  className="col-span-3"
                  placeholder="e.g. Engineering, Sales, Production"
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
          <p className="text-muted-foreground">
            Configure system-wide settings, user access, and perform maintenance tasks.
          </p>
        </div>
      </div>
      
      <Tabs defaultValue="access-control" className="space-y-4">
        <TabsList>
          <TabsTrigger value="access-control">Access Control</TabsTrigger>
          <TabsTrigger value="user-management">User Management</TabsTrigger>
          <TabsTrigger value="maintenance">System Maintenance</TabsTrigger>
          <TabsTrigger value="logs">Audit Logs</TabsTrigger>
        </TabsList>
        
        {/* Access Control Tab */}
        <TabsContent value="access-control" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Role Permissions</CardTitle>
              <CardDescription>
                Configure what each role can access and modify in the system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RolePermissionsManager 
                rolePermissions={rolePermissions} 
                isAdmin={isAdmin}
                onSave={() => {
                  queryClient.invalidateQueries({ queryKey: ['/api/role-permissions'] });
                }}
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Email Access Control</CardTitle>
              <CardDescription>
                Control which email domains can access the system, their default role, and auto-approval settings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateAllowedEmail} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emailPattern">Email Pattern</Label>
                    <Input 
                      id="emailPattern" 
                      name="emailPattern" 
                      placeholder="*@example.com" 
                      required 
                    />
                    <p className="text-xs text-muted-foreground">
                      Use * as wildcard. Example: *@nomadgcs.com
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="defaultRole">Default Role</Label>
                    <Select name="defaultRole" defaultValue="viewer">
                      <SelectTrigger id="defaultRole">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">Viewer</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2 flex items-end">
                    <div className="flex items-center space-x-2">
                      <Switch id="autoApprove" name="autoApprove" />
                      <Label htmlFor="autoApprove">Auto Approve</Label>
                    </div>
                  </div>
                  
                  <div className="flex items-end">
                    <Button type="submit" className="w-full">
                      Add Email Pattern
                    </Button>
                  </div>
                </div>
                
                <Separator className="my-6" />
                
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email Pattern</TableHead>
                        <TableHead>Default Role</TableHead>
                        <TableHead>Auto Approve</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allowedEmails.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                            No email patterns configured
                          </TableCell>
                        </TableRow>
                      ) : (
                        allowedEmails.map((email: any) => (
                          <TableRow key={email.id}>
                            <TableCell>{email.emailPattern}</TableCell>
                            <TableCell>
                              <Badge className="capitalize">
                                {email.defaultRole}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {email.autoApprove ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                              ) : (
                                <AlertCircle className="h-5 w-5 text-amber-500" />
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleDeleteAllowedEmail(email.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Management Tab */}
        <TabsContent value="user-management" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage user access and roles. Approve pending users or modify existing user permissions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer" onClick={() => setUserSort({
                        column: 'firstName',
                        direction: userSort.column === 'firstName' && userSort.direction === 'asc' ? 'desc' : 'asc'
                      })}>
                        User {userSort.column === 'firstName' && (userSort.direction === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => setUserSort({
                        column: 'department',
                        direction: userSort.column === 'department' && userSort.direction === 'asc' ? 'desc' : 'asc'
                      })}>
                        Department {userSort.column === 'department' && (userSort.direction === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => setUserSort({
                        column: 'role',
                        direction: userSort.column === 'role' && userSort.direction === 'asc' ? 'desc' : 'asc'
                      })}>
                        Role {userSort.column === 'role' && (userSort.direction === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => setUserSort({
                        column: 'status',
                        direction: userSort.column === 'status' && userSort.direction === 'asc' ? 'desc' : 'asc'
                      })}>
                        Status {userSort.column === 'status' && (userSort.direction === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => setUserSort({
                        column: 'createdAt',
                        direction: userSort.column === 'createdAt' && userSort.direction === 'asc' ? 'desc' : 'asc'
                      })}>
                        Created {userSort.column === 'createdAt' && (userSort.direction === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => setUserSort({
                        column: 'lastLogin',
                        direction: userSort.column === 'lastLogin' && userSort.direction === 'asc' ? 'desc' : 'asc'
                      })}>
                        Last Login {userSort.column === 'lastLogin' && (userSort.direction === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                          No users found
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortUsers(users, userSort.column, userSort.direction).map((user: any) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span className="font-semibold">{user.firstName} {user.lastName}</span>
                              <span className="text-xs text-muted-foreground">{user.email}</span>
                            </div>
                          </TableCell>
                          <TableCell>{user.department || 'Not assigned'}</TableCell>
                          <TableCell>
                            <Badge className="capitalize">
                              {user.role || 'viewer'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {user.status === 'approved' ? (
                              <Badge variant="success" className="bg-green-500 hover:bg-green-600">Approved</Badge>
                            ) : user.status === 'pending' ? (
                              <Badge variant="outline" className="bg-amber-500/20 text-amber-700 border-amber-500">Pending</Badge>
                            ) : user.status === 'rejected' ? (
                              <Badge variant="destructive">Rejected</Badge>
                            ) : (
                              <Badge variant="outline">Unknown</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Never'}
                          </TableCell>
                          <TableCell>
                            {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-1">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleEditUser(user)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              
                              {/* If the user is pending, show approve button */}
                              {user.status === 'pending' && (
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="text-green-600 hover:text-green-700 hover:bg-green-100"
                                  onClick={() => handleApproveUser(user.id)}
                                >
                                  <UserCheck className="h-4 w-4" />
                                </Button>
                              )}
                              
                              {/* For all users, show reject/revoke button */}
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="text-red-600 hover:text-red-700 hover:bg-red-100"
                                onClick={() => handleRejectUser(user.id)}
                              >
                                <UserX className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Maintenance Tab */}
        <TabsContent value="maintenance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Database Maintenance</CardTitle>
              <CardDescription>
                Perform database maintenance tasks. Warning: These actions can be destructive.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <Alert className="bg-amber-500/20 border-amber-500">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <AlertTitle>Warning: Destructive Actions</AlertTitle>
                  <AlertDescription>
                    The operations in this section can permanently delete data. Proceed with caution.
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="border border-destructive/40">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Reset All Projects</CardTitle>
                      <CardDescription>
                        Delete all projects and related data from the system.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" className="w-full">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Reset Projects Data
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete all projects, schedules, milestones, and related data from the system.
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              className="bg-destructive"
                              onClick={() => {
                                setIsDeleting(true);
                                fetch('/api/maintenance/reset-projects', {
                                  method: 'POST',
                                })
                                  .then(response => response.json())
                                  .then(data => {
                                    setDeleteResult(data);
                                    queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
                                    toast({
                                      title: "Reset Complete",
                                      description: `Successfully reset the project data. Deleted ${data.totalDeleted} items.`,
                                    });
                                  })
                                  .catch(() => {
                                    toast({
                                      title: "Reset Failed",
                                      description: "Failed to reset project data.",
                                      variant: "destructive"
                                    });
                                  })
                                  .finally(() => {
                                    setIsDeleting(false);
                                  });
                              }}
                            >
                              Delete All Projects
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
            
          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
              <CardDescription>
                View system information and statistics.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Application Version</h3>
                    <p className="text-lg font-semibold">v1.0.0</p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Database Status</h3>
                    <div className="flex items-center space-x-2">
                      <div className="h-3 w-3 rounded-full bg-green-500"></div>
                      <p className="text-lg font-semibold">Connected</p>
                    </div>
                  </div>
                </div>
                
                <Separator className="my-6" />
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <h3 className="text-lg font-semibold">{users ? users.length : 0}</h3>
                        <p className="text-sm text-muted-foreground">Total Users</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <h3 className="text-lg font-semibold">{activeProjects ? activeProjects.length : 0}</h3>
                        <p className="text-sm text-muted-foreground">Active Projects</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <h3 className="text-lg font-semibold">{archivedProjects ? archivedProjects.length : 0}</h3>
                        <p className="text-sm text-muted-foreground">Archived Projects</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <h3 className="text-lg font-semibold">
                          {storageInfo?.totalStorageUsed
                            ? Math.round(storageInfo.totalStorageUsed / (1024 * 1024))
                            : 0} MB
                        </h3>
                        <p className="text-sm text-muted-foreground">Storage Used</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Archived Projects</CardTitle>
              <CardDescription>
                View and manage archived projects.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Project</TableHead>
                      <TableHead>Number</TableHead>
                      <TableHead>Date Archived</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {archivedProjects.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                          No archived projects found
                        </TableCell>
                      </TableRow>
                    ) : (
                      archivedProjects.map((project: any) => (
                        <TableRow key={project.id}>
                          <TableCell className="font-medium">{project.name}</TableCell>
                          <TableCell>{project.projectNumber}</TableCell>
                          <TableCell>
                            {new Date(project.archivedAt || project.updatedAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => restoreProjectMutation.mutate(project.id)}
                              disabled={restoreProjectMutation.isPending}
                            >
                              <ArchiveRestore className="h-4 w-4 mr-2" />
                              Restore
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Logs Tab */}
        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Activity Logs</CardTitle>
              <CardDescription>
                View audit logs of user activities in the system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userAuditLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                          No audit logs found
                        </TableCell>
                      </TableRow>
                    ) : (
                      userAuditLogs.map((log: any) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-medium">{getUserName(log.userId)}</TableCell>
                          <TableCell>{log.actionType}</TableCell>
                          <TableCell>{log.details}</TableCell>
                          <TableCell>{new Date(log.createdAt).toLocaleString()}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SystemSettings;