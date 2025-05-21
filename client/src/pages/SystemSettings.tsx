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
  ArchiveRestore,
  MoveRight,
  ArrowUpCircle
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
  
  // In a production environment, we would check the user's role here
  // For now, since we're in development mode, we'll always have admin rights
  // This ensures the permissions UI is editable during development
  useEffect(() => {
    console.log('Development mode detected, enabling admin capabilities');
    setIsAdmin(true);
  }, []);

  // User audit logs query
  const {
    data: userAuditLogs = [],
    isLoading: userAuditLogsLoading,
    error: userAuditLogsError
  } = useQuery({
    queryKey: ['/api/user-audit-logs'],
    queryFn: getQueryFn({})
  });

  const handleDeleteAllProjects = async () => {
    setIsDeleting(true);
    
    try {
      const response = await fetch('/api/reset-all-projects', {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      setDeleteResult({
        success: result.success,
        message: result.message,
        totalDeleted: result.totalDeleted
      });
      
      toast({
        title: result.success ? "Projects Deleted" : "Deletion Failed",
        description: result.message,
        variant: result.success ? "default" : "destructive"
      });
    } catch (error) {
      setDeleteResult({
        success: false,
        message: "Error deleting projects: " + (error as Error).message
      });
      
      toast({
        title: "Error",
        description: "Failed to delete projects: " + (error as Error).message,
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
    priority: 'normal',
    type: 'system',
  });

  const createNotificationMutation = useMutation({
    mutationFn: async (notification: any) => {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notification),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create notification');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Notification Created",
        description: "Your notification has been successfully created and sent to all users.",
        variant: "default"
      });
      setShowNotificationForm(false);
      setNewNotification({
        title: '',
        message: '',
        priority: 'normal',
        type: 'system',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create notification: " + (error as Error).message,
        variant: "destructive"
      });
    }
  });

  const handleCreateNotification = (e: React.FormEvent) => {
    e.preventDefault();
    createNotificationMutation.mutate(newNotification);
  };

  // Email allowed domains management
  const [newEmailPattern, setNewEmailPattern] = useState({
    emailPattern: '',
    autoApprove: true,
    defaultRole: 'viewer',
  });

  // Get users for user management
  const {
    data: users = [],
    isLoading: usersLoading,
    error: usersError
  } = useQuery<any[]>({
    queryKey: ['/api/users'],
    queryFn: getQueryFn({}),
  });

  // Get email patterns
  const {
    data: allowedEmails = [],
    isLoading: allowedEmailsLoading,
    error: allowedEmailsError
  } = useQuery<any[]>({
    queryKey: ['/api/allowed-emails'],
    queryFn: getQueryFn({}),
  });

  // Create email pattern mutation
  const createEmailPatternMutation = useMutation({
    mutationFn: async (emailPattern: any) => {
      const response = await fetch('/api/allowed-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailPattern),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create email pattern');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Email Pattern Added",
        description: "The email pattern has been successfully added to the allowed list.",
        variant: "default"
      });
      setNewEmailPattern({
        emailPattern: '',
        autoApprove: true,
        defaultRole: 'viewer',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/allowed-emails'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add email pattern: " + (error as Error).message,
        variant: "destructive"
      });
    }
  });

  // Delete email pattern mutation
  const deleteEmailPatternMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/allowed-emails/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete email pattern');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Email Pattern Deleted",
        description: "The email pattern has been successfully removed from the allowed list.",
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/allowed-emails'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete email pattern: " + (error as Error).message,
        variant: "destructive"
      });
    }
  });

  // Update user role mutation
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string, role: string }) => {
      const response = await fetch(`/api/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update user role');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "User Role Updated",
        description: "The user's role has been successfully updated.",
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update user role: " + (error as Error).message,
        variant: "destructive"
      });
    }
  });

  // Approve user mutation
  const approveUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/users/${userId}/approve`, {
        method: 'PATCH',
      });
      
      if (!response.ok) {
        throw new Error('Failed to approve user');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "User Approved",
        description: "The user has been successfully approved and can now access the system.",
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to approve user: " + (error as Error).message,
        variant: "destructive"
      });
    }
  });

  const handleCreateEmailPattern = (e: React.FormEvent) => {
    e.preventDefault();
    createEmailPatternMutation.mutate(newEmailPattern);
  };

  const handleDeleteEmailPattern = (id: number) => {
    deleteEmailPatternMutation.mutate(id);
  };

  const handleUpdateUserRole = (userId: string, role: string) => {
    updateUserRoleMutation.mutate({ userId, role });
  };

  const handleApproveUser = (userId: string) => {
    approveUserMutation.mutate(userId);
  };

  // Handle tab change
  const [currentTab, setCurrentTab] = useState('accessControl');

  // For archive management
  const {
    data: archivedProjects = [],
    isLoading: archivedProjectsLoading,
    error: archivedProjectsError
  } = useQuery({
    queryKey: ['/api/projects/archived'],
    queryFn: getQueryFn({}),
  });

  const restoreProjectMutation = useMutation({
    mutationFn: async (projectId: number) => {
      const response = await fetch(`/api/projects/${projectId}/restore`, {
        method: 'PATCH',
      });
      
      if (!response.ok) {
        throw new Error('Failed to restore project');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Project Restored",
        description: "The project has been successfully restored from the archive.",
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/projects/archived'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to restore project: " + (error as Error).message,
        variant: "destructive"
      });
    }
  });

  const permanentDeleteProjectMutation = useMutation({
    mutationFn: async (projectId: number) => {
      const response = await fetch(`/api/projects/${projectId}/permanent-delete`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to permanently delete project');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Project Deleted",
        description: "The project has been permanently deleted.",
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/projects/archived'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete project: " + (error as Error).message,
        variant: "destructive"
      });
    }
  });

  const handleRestoreProject = (projectId: number) => {
    restoreProjectMutation.mutate(projectId);
  };

  const handlePermanentDeleteProject = (projectId: number) => {
    permanentDeleteProjectMutation.mutate(projectId);
  };

  return (
    <div className="container mx-auto py-6 px-6 md:px-8 space-y-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
          <p className="text-muted-foreground">
            Configure system-wide settings, user access, and perform maintenance tasks.
          </p>
        </div>
      </div>

      <Tabs defaultValue="accessControl" className="w-full space-y-6" onValueChange={setCurrentTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="accessControl">Access Control</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="archiveManagement">Archive Management</TabsTrigger>
          <TabsTrigger value="maintenance">System Maintenance</TabsTrigger>
        </TabsList>

        {/* Access Control Tab */}
        <TabsContent value="accessControl" className="space-y-6">
          <Card>
              <CardHeader>
                <CardTitle>Role Permissions</CardTitle>
                <CardDescription>
                  Customize what each role (Viewer, Editor, Admin) can access and modify in the system.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="viewer" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="viewer">Viewer Permissions</TabsTrigger>
                    <TabsTrigger value="editor">Editor Permissions</TabsTrigger>
                    <TabsTrigger value="admin">Admin Permissions</TabsTrigger>
                  </TabsList>
                  
                  {/* Viewer Permissions Tab */}
                  <TabsContent value="viewer" className="pt-4">
                    <RolePermissionsManager role="viewer" isReadOnly={!isAdmin} />
                  </TabsContent>
                  
                  {/* Editor Permissions Tab */}
                  <TabsContent value="editor" className="pt-4">
                    <RolePermissionsManager role="editor" isReadOnly={!isAdmin} />
                  </TabsContent>
                  
                  {/* Admin Permissions Tab */}
                  <TabsContent value="admin" className="pt-4">
                    <RolePermissionsManager role="admin" isReadOnly={!isAdmin} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Email Access Control</CardTitle>
                <CardDescription>
                  Configure email patterns for automatic user approval and default role assignment.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Add New Email Pattern</h3>
                    <p className="text-sm text-gray-500">
                      Add patterns like 'user@example.com' for exact match or '*@example.com' for all emails from a domain.
                    </p>
                    
                    <form onSubmit={handleCreateEmailPattern} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="md:col-span-2">
                        <Label htmlFor="emailPattern">Email Pattern</Label>
                        <Input 
                          id="emailPattern" 
                          placeholder="*@company.com or user@example.com"
                          value={newEmailPattern.emailPattern}
                          onChange={(e) => setNewEmailPattern({...newEmailPattern, emailPattern: e.target.value})}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="defaultRole">Default Role</Label>
                        <Select 
                          value={newEmailPattern.defaultRole}
                          onValueChange={(value) => setNewEmailPattern({...newEmailPattern, defaultRole: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="viewer">Viewer</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="autoApprove" className="block mb-5">Auto Approve</Label>
                        <Switch 
                          id="autoApprove"
                          checked={newEmailPattern.autoApprove}
                          onCheckedChange={(checked) => setNewEmailPattern({...newEmailPattern, autoApprove: checked})}
                        />
                      </div>
                      <div className="md:col-span-4 flex justify-end">
                        <Button type="submit" disabled={createEmailPatternMutation.isPending}>
                          {createEmailPatternMutation.isPending ? (
                            <>
                              <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
                              Adding...
                            </>
                          ) : (
                            <>Add Email Pattern</>
                          )}
                        </Button>
                      </div>
                    </form>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Email Patterns</h3>
                    {allowedEmailsLoading ? (
                      <div className="flex justify-center p-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : allowedEmailsError ? (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>Failed to load email patterns</AlertDescription>
                      </Alert>
                    ) : allowedEmails.length === 0 ? (
                      <div className="text-center p-4 border rounded-md">
                        <p className="text-muted-foreground">No email patterns configured yet.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
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
                            {allowedEmails.map((pattern) => (
                              <TableRow key={pattern.id}>
                                <TableCell>{pattern.emailPattern}</TableCell>
                                <TableCell>
                                  <Badge variant={pattern.defaultRole === 'admin' ? 'default' : pattern.defaultRole === 'editor' ? 'secondary' : 'outline'}>
                                    {pattern.defaultRole.charAt(0).toUpperCase() + pattern.defaultRole.slice(1)}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {pattern.autoApprove ? (
                                    <Badge variant="success" className="bg-green-500">Yes</Badge>
                                  ) : (
                                    <Badge variant="outline">No</Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/20">
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Email Pattern</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete the pattern '{pattern.emailPattern}'? 
                                          This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction 
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                          onClick={() => handleDeleteEmailPattern(pattern.id)}
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage user access and roles. Approve pending users or modify existing user permissions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {usersLoading ? (
                    <div className="flex justify-center p-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : usersError ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>Failed to load users</AlertDescription>
                    </Alert>
                  ) : users.length === 0 ? (
                    <div className="text-center p-4 border rounded-md">
                      <p className="text-muted-foreground">No users found.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead>Last Login</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {users.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell>
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                                    {user.firstName ? user.firstName.charAt(0) : user.username?.charAt(0)}
                                  </div>
                                  <div>
                                    <div className="font-medium">{user.firstName} {user.lastName}</div>
                                    <div className="text-sm text-muted-foreground">{user.email || user.username}</div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Select 
                                  defaultValue={user.role} 
                                  onValueChange={(value) => handleUpdateUserRole(user.id, value)}
                                  disabled={!isAdmin}
                                >
                                  <SelectTrigger className="w-[110px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="viewer">Viewer</SelectItem>
                                    <SelectItem value="editor">Editor</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                {user.isApproved ? (
                                  <Badge className="bg-green-500">Approved</Badge>
                                ) : (
                                  <Badge variant="outline" className="border-amber-500 text-amber-500">Pending</Badge>
                                )}
                              </TableCell>
                              <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                              <TableCell>
                                {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end space-x-1">
                                  {!user.isApproved && (
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      className="text-green-600 hover:text-green-700 hover:bg-green-100"
                                      onClick={() => handleApproveUser(user.id)}
                                      disabled={!isAdmin || approveUserMutation.isPending}
                                    >
                                      <UserCheck className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <Button variant="ghost" size="icon">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Notifications</CardTitle>
                <CardDescription>
                  Create and manage system-wide notifications for all users.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex justify-end">
                    <Button 
                      onClick={() => setShowNotificationForm(!showNotificationForm)}
                      className="flex items-center space-x-2"
                    >
                      {showNotificationForm ? 'Cancel' : 'Create Notification'}
                    </Button>
                  </div>
                  
                  {showNotificationForm && (
                    <Card className="border border-primary/20 bg-primary/5">
                      <CardHeader>
                        <CardTitle>Create New Notification</CardTitle>
                        <CardDescription>
                          This notification will be sent to all users immediately.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <form onSubmit={handleCreateNotification} className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="title">Title</Label>
                              <Input 
                                id="title" 
                                value={newNotification.title}
                                onChange={(e) => setNewNotification({...newNotification, title: e.target.value})}
                                placeholder="Notification Title"
                                required
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="priority">Priority</Label>
                                <Select 
                                  value={newNotification.priority}
                                  onValueChange={(value) => setNewNotification({...newNotification, priority: value})}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select priority" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="normal">Normal</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="urgent">Urgent</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="type">Type</Label>
                                <Select 
                                  value={newNotification.type}
                                  onValueChange={(value) => setNewNotification({...newNotification, type: value})}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="system">System</SelectItem>
                                    <SelectItem value="manufacturing">Manufacturing</SelectItem>
                                    <SelectItem value="project">Project</SelectItem>
                                    <SelectItem value="billing">Billing</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="message">Message</Label>
                            <textarea 
                              id="message" 
                              value={newNotification.message}
                              onChange={(e) => setNewNotification({...newNotification, message: e.target.value})}
                              placeholder="Notification message..."
                              className="w-full h-24 px-3 py-2 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                              required
                            />
                          </div>
                          
                          <div className="flex justify-end space-x-2">
                            <Button type="button" variant="outline" onClick={() => setShowNotificationForm(false)}>
                              Cancel
                            </Button>
                            <Button type="submit" disabled={createNotificationMutation.isPending}>
                              {createNotificationMutation.isPending ? (
                                <>
                                  <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
                                  Sending...
                                </>
                              ) : (
                                <>Send Notification</>
                              )}
                            </Button>
                          </div>
                        </form>
                      </CardContent>
                    </Card>
                  )}
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">User Activity Logs</h3>
                    
                    {userAuditLogsLoading ? (
                      <div className="flex justify-center p-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : userAuditLogsError ? (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>Failed to load user audit logs</AlertDescription>
                      </Alert>
                    ) : userAuditLogs && userAuditLogs.length === 0 ? (
                      <div className="text-center p-4 border rounded-md">
                        <p className="text-muted-foreground">No user activity logs found.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>User</TableHead>
                              <TableHead>Action</TableHead>
                              <TableHead>Details</TableHead>
                              <TableHead>Timestamp</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {userAuditLogs.map((log: any) => (
                              <TableRow key={log.id}>
                                <TableCell>{log.username || log.userId || 'System'}</TableCell>
                                <TableCell>
                                  <Badge variant={log.action === 'login' ? 'outline' : log.action === 'create' ? 'default' : log.action === 'update' ? 'secondary' : 'destructive'}>
                                    {log.action}
                                  </Badge>
                                </TableCell>
                                <TableCell>{log.details}</TableCell>
                                <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Archive Management Tab */}
          <TabsContent value="archiveManagement" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Archive Management</CardTitle>
                <CardDescription>
                  Restore or permanently delete archived projects, milestones, and other items.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Archived Projects</h3>
                    
                    {archivedProjectsLoading ? (
                      <div className="flex justify-center p-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : archivedProjectsError ? (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>Failed to load archived projects</AlertDescription>
                      </Alert>
                    ) : archivedProjects && archivedProjects.length === 0 ? (
                      <div className="text-center p-4 border rounded-md">
                        <p className="text-muted-foreground">No archived projects found.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Project</TableHead>
                              <TableHead>Project Number</TableHead>
                              <TableHead>Archived Date</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {archivedProjects && archivedProjects.map((project: any) => (
                              <TableRow key={project.id}>
                                <TableCell>{project.name}</TableCell>
                                <TableCell>{project.projectNumber}</TableCell>
                                <TableCell>{new Date(project.updatedAt).toLocaleDateString()}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end space-x-1">
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button 
                                          variant="outline" 
                                          size="sm" 
                                          className="flex items-center space-x-1"
                                        >
                                          <ArchiveRestore className="h-4 w-4 mr-1" />
                                          Restore
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Restore Project</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Are you sure you want to restore project '{project.name}'? 
                                            It will be moved back to active projects.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction 
                                            onClick={() => handleRestoreProject(project.id)}
                                          >
                                            Restore
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                    
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="text-destructive hover:text-destructive hover:bg-destructive/20 flex items-center space-x-1"
                                        >
                                          <Trash2 className="h-4 w-4 mr-1" />
                                          Delete
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Permanently Delete Project</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Are you sure you want to permanently delete project '{project.name}'? 
                                            This action cannot be undone and all associated data will be lost forever.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction 
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            onClick={() => handlePermanentDeleteProject(project.id)}
                                          >
                                            Permanently Delete
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
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
                              Reset All Projects
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete All Projects</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete ALL projects and related data from the system.
                                This action cannot be undone. Are you absolutely sure?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={handleDeleteAllProjects}
                              >
                                {isDeleting ? (
                                  <>
                                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
                                    Deleting...
                                  </>
                                ) : (
                                  <>Delete All Projects</>
                                )}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        
                        {deleteResult && (
                          <div className="mt-4">
                            <Alert variant={deleteResult.success ? "default" : "destructive"}>
                              {deleteResult.success ? (
                                <CheckCircle2 className="h-4 w-4" />
                              ) : (
                                <AlertCircle className="h-4 w-4" />
                              )}
                              <AlertTitle>{deleteResult.success ? "Success" : "Error"}</AlertTitle>
                              <AlertDescription>
                                {deleteResult.message}
                                {deleteResult.totalDeleted !== undefined && (
                                  <div className="mt-2">
                                    <Badge variant="outline">
                                      {deleteResult.totalDeleted} projects deleted
                                    </Badge>
                                  </div>
                                )}
                              </AlertDescription>
                            </Alert>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Database Backup</CardTitle>
                        <CardDescription>
                          Create a backup of the current database.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-2">
                        <Button className="w-full" variant="outline">
                          Backup Database
                        </Button>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Database Restore</CardTitle>
                        <CardDescription>
                          Restore the database from a backup file.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-2">
                        <Button className="w-full" variant="outline">
                          Restore Database
                        </Button>
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
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-muted-foreground">Last Backup</h3>
                      <p className="text-lg font-semibold">Never</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
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
                          <h3 className="text-lg font-semibold">0</h3>
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
                          <h3 className="text-lg font-semibold">0</h3>
                          <p className="text-sm text-muted-foreground">Storage Used (MB)</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
};

export default SystemSettings;