import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle, CheckCircle2, Trash2, UserPlus, Edit, Lock, Shield, UserCheck, UserX } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from '../lib/queryClient';

const SystemSettings = () => {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<{
    success: boolean;
    message: string;
    totalDeleted?: number;
  } | null>(null);

  const handleDeleteAllProjects = async () => {
    try {
      setIsDeleting(true);
      setDeleteResult(null);
      
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
        title: "Deletion Failed",
        description: "Error deleting projects: " + (error as Error).message,
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editingAllowedEmail, setEditingAllowedEmail] = useState<any>(null);
  const [newEmailPattern, setNewEmailPattern] = useState({
    emailPattern: '',
    autoApprove: false,
    defaultRole: 'viewer'
  });
  
  // Define types
  interface AllowedEmail {
    id: number;
    emailPattern: string;
    autoApprove: boolean;
    defaultRole: string;
    createdAt: string;
    updatedAt: string;
  }
  
  interface User {
    id: string;
    username: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    bio?: string;
    profileImageUrl?: string;
    role: 'admin' | 'editor' | 'viewer' | 'pending';
    isApproved: boolean;
    createdAt: string;
    updatedAt: string;
    lastLogin?: string;
  }
  
  // Query for users
  const { 
    data: users = [] as User[], 
    isLoading: usersLoading,
    error: usersError 
  } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: !!user && user.role === 'admin',
  });
  
  // Query for allowed emails
  const { 
    data: allowedEmails = [] as AllowedEmail[], 
    isLoading: allowedEmailsLoading,
    error: allowedEmailsError 
  } = useQuery<AllowedEmail[]>({
    queryKey: ['/api/allowed-emails'],
    enabled: !!user && user.role === 'admin',
  });
  
  // Mutation for updating user roles
  const updateUserMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest(
        `/api/users/${data.id}/role`, 
        { method: 'PUT', body: { role: data.role, isApproved: data.isApproved } }
      );
    },
    onSuccess: () => {
      toast({
        title: "User Updated",
        description: "User role and approval status has been updated successfully.",
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setEditingUser(null);
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: `Error updating user: ${error.message}`,
        variant: "destructive"
      });
    }
  });
  
  // Mutation for creating allowed email patterns
  const createAllowedEmailMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest(
        '/api/allowed-emails', 
        { method: 'POST', body: data }
      );
    },
    onSuccess: () => {
      toast({
        title: "Email Pattern Created",
        description: "New email pattern has been added successfully.",
        variant: "default"
      });
      setNewEmailPattern({ emailPattern: '', autoApprove: false, defaultRole: 'viewer' });
      queryClient.invalidateQueries({ queryKey: ['/api/allowed-emails'] });
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: `Error creating email pattern: ${error.message}`,
        variant: "destructive"
      });
    }
  });
  
  // Mutation for updating allowed email patterns
  const updateAllowedEmailMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest(
        `/api/allowed-emails/${data.id}`, 
        { method: 'PUT', body: { 
          emailPattern: data.emailPattern, 
          autoApprove: data.autoApprove, 
          defaultRole: data.defaultRole 
        }}
      );
    },
    onSuccess: () => {
      toast({
        title: "Email Pattern Updated",
        description: "Email pattern has been updated successfully.",
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/allowed-emails'] });
      setEditingAllowedEmail(null);
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: `Error updating email pattern: ${error.message}`,
        variant: "destructive"
      });
    }
  });
  
  // Mutation for deleting allowed email patterns
  const deleteAllowedEmailMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(
        `/api/allowed-emails/${id}`, 
        { method: 'DELETE' }
      );
    },
    onSuccess: () => {
      toast({
        title: "Email Pattern Deleted",
        description: "Email pattern has been deleted successfully.",
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/allowed-emails'] });
    },
    onError: (error: any) => {
      toast({
        title: "Deletion Failed",
        description: `Error deleting email pattern: ${error.message}`,
        variant: "destructive"
      });
    }
  });
  
  const handleCreateAllowedEmail = () => {
    if (!newEmailPattern.emailPattern) {
      toast({
        title: "Validation Error",
        description: "Email pattern is required",
        variant: "destructive"
      });
      return;
    }
    
    createAllowedEmailMutation.mutate(newEmailPattern);
  };
  
  const handleUpdateUser = () => {
    if (!editingUser) return;
    
    updateUserMutation.mutate({
      id: editingUser.id,
      role: editingUser.role,
      isApproved: editingUser.isApproved
    });
  };
  
  const handleUpdateAllowedEmail = () => {
    if (!editingAllowedEmail) return;
    
    updateAllowedEmailMutation.mutate({
      id: editingAllowedEmail.id,
      emailPattern: editingAllowedEmail.emailPattern,
      autoApprove: editingAllowedEmail.autoApprove,
      defaultRole: editingAllowedEmail.defaultRole
    });
  };
  
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-red-950 text-white border border-red-600 hover:bg-red-900 font-medium">Admin</Badge>;
      case 'editor':
        return <Badge className="bg-blue-950 text-white border border-blue-600 hover:bg-blue-900 font-medium">Editor</Badge>;
      case 'viewer':
        return <Badge className="bg-green-950 text-white border border-green-600 hover:bg-green-900 font-medium">Viewer</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-950 text-white border border-yellow-600 hover:bg-yellow-900 font-medium">Pending</Badge>;
      default:
        return <Badge variant="outline" className="font-medium">{role}</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-6 max-w-6xl px-4 sm:px-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">System Settings</h1>
      </div>
      
      {authLoading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : !user || user.role !== 'admin' ? (
        <Alert className="bg-destructive/20 border-destructive mb-6">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You need administrator privileges to access system settings.
          </AlertDescription>
        </Alert>
      ) : (
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid grid-cols-3 w-[400px]">
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="access">Access Control</TabsTrigger>
            <TabsTrigger value="system">Data Management</TabsTrigger>
          </TabsList>
          
          {/* User Management Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage users and their access permissions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : usersError ? (
                  <Alert className="bg-destructive/20 border-destructive">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                      {(usersError as Error).message || "Failed to load users"}
                    </AlertDescription>
                  </Alert>
                ) : users.length === 0 ? (
                  <div className="text-center p-6 text-gray-500">
                    No users found in the system.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user: any) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center space-x-2">
                              {user.profileImageUrl ? (
                                <img 
                                  src={user.profileImageUrl} 
                                  alt={user.username} 
                                  className="h-8 w-8 rounded-full"
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center">
                                  {user.username?.charAt(0).toUpperCase() || '?'}
                                </div>
                              )}
                              <div>
                                <div className="font-semibold">{user.username}</div>
                                <div className="text-xs text-gray-500">ID: {user.id}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{user.email || 'N/A'}</TableCell>
                          <TableCell>{getRoleBadge(user.role)}</TableCell>
                          <TableCell>
                            {user.isApproved ? (
                              <Badge variant="outline" className="bg-green-950 text-white border border-green-600 font-medium">
                                Approved
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-yellow-950 text-white border border-yellow-600 font-medium">
                                Pending
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => setEditingUser(user)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Edit User</DialogTitle>
                                  <DialogDescription>
                                    Modify role and approval status for {editingUser?.username}.
                                  </DialogDescription>
                                </DialogHeader>
                                
                                {editingUser && (
                                  <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                      <Label htmlFor="role">Role</Label>
                                      <Select 
                                        value={editingUser.role} 
                                        onValueChange={value => setEditingUser({...editingUser, role: value})}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="admin">Administrator</SelectItem>
                                          <SelectItem value="editor">Editor</SelectItem>
                                          <SelectItem value="viewer">Viewer</SelectItem>
                                          <SelectItem value="pending">Pending</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    
                                    <div className="flex items-center space-x-2">
                                      <Switch 
                                        id="approved" 
                                        checked={editingUser.isApproved}
                                        onCheckedChange={checked => setEditingUser({...editingUser, isApproved: checked})}
                                      />
                                      <Label htmlFor="approved">User is approved</Label>
                                    </div>
                                  </div>
                                )}
                                
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setEditingUser(null)}>
                                    Cancel
                                  </Button>
                                  <Button onClick={handleUpdateUser} disabled={updateUserMutation.isPending}>
                                    {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Access Control Tab */}
          <TabsContent value="access" className="space-y-6">
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
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="md:col-span-2">
                        <Label htmlFor="emailPattern">Email Pattern</Label>
                        <Input 
                          id="emailPattern" 
                          placeholder="*@company.com or user@example.com"
                          value={newEmailPattern.emailPattern}
                          onChange={e => setNewEmailPattern({...newEmailPattern, emailPattern: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="defaultRole">Default Role</Label>
                        <Select 
                          value={newEmailPattern.defaultRole} 
                          onValueChange={value => setNewEmailPattern({...newEmailPattern, defaultRole: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Administrator</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end">
                        <div className="flex items-center space-x-2 h-10">
                          <Switch 
                            id="autoApprove" 
                            checked={newEmailPattern.autoApprove}
                            onCheckedChange={checked => setNewEmailPattern({...newEmailPattern, autoApprove: checked})}
                          />
                          <Label htmlFor="autoApprove">Auto-approve</Label>
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      className="mt-2"
                      onClick={handleCreateAllowedEmail}
                      disabled={createAllowedEmailMutation.isPending}
                    >
                      {createAllowedEmailMutation.isPending ? (
                        <>
                          <div className="animate-spin mr-2 h-4 w-4 border-2 border-b-transparent rounded-full"></div>
                          Adding...
                        </>
                      ) : (
                        <>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Add Email Pattern
                        </>
                      )}
                    </Button>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-700">
                    <h3 className="text-lg font-medium mb-4">Allowed Email Patterns</h3>
                    
                    {allowedEmailsLoading ? (
                      <div className="flex justify-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : allowedEmailsError ? (
                      <Alert className="bg-destructive/20 border-destructive">
                        <AlertCircle className="h-5 w-5 text-destructive" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>
                          {(allowedEmailsError as Error).message || "Failed to load email patterns"}
                        </AlertDescription>
                      </Alert>
                    ) : allowedEmails.length === 0 ? (
                      <div className="text-center p-6 text-gray-500">
                        No email patterns have been configured yet.
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Pattern</TableHead>
                            <TableHead>Default Role</TableHead>
                            <TableHead>Auto-Approve</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {allowedEmails.map((pattern: any) => (
                            <TableRow key={pattern.id}>
                              <TableCell className="font-medium">
                                {pattern.emailPattern}
                              </TableCell>
                              <TableCell>{getRoleBadge(pattern.defaultRole)}</TableCell>
                              <TableCell>
                                {pattern.autoApprove ? (
                                  <Badge variant="outline" className="bg-green-950 text-white border border-green-600 font-medium">
                                    <CheckCircle2 className="mr-1 h-3 w-3" />
                                    Yes
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-gray-950 text-white border border-gray-600 font-medium">
                                    <UserX className="mr-1 h-3 w-3" />
                                    No
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end space-x-2">
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setEditingAllowedEmail(pattern)}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Edit Email Pattern</DialogTitle>
                                        <DialogDescription>
                                          Modify the email pattern settings.
                                        </DialogDescription>
                                      </DialogHeader>
                                      
                                      {editingAllowedEmail && (
                                        <div className="space-y-4 py-4">
                                          <div className="space-y-2">
                                            <Label htmlFor="editEmailPattern">Email Pattern</Label>
                                            <Input
                                              id="editEmailPattern"
                                              value={editingAllowedEmail.emailPattern}
                                              onChange={e => setEditingAllowedEmail({
                                                ...editingAllowedEmail,
                                                emailPattern: e.target.value
                                              })}
                                            />
                                          </div>
                                          
                                          <div className="space-y-2">
                                            <Label htmlFor="editDefaultRole">Default Role</Label>
                                            <Select
                                              value={editingAllowedEmail.defaultRole}
                                              onValueChange={value => setEditingAllowedEmail({
                                                ...editingAllowedEmail,
                                                defaultRole: value
                                              })}
                                            >
                                              <SelectTrigger id="editDefaultRole">
                                                <SelectValue placeholder="Select role" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="admin">Administrator</SelectItem>
                                                <SelectItem value="editor">Editor</SelectItem>
                                                <SelectItem value="viewer">Viewer</SelectItem>
                                                <SelectItem value="pending">Pending</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          
                                          <div className="flex items-center space-x-2">
                                            <Switch
                                              id="editAutoApprove"
                                              checked={editingAllowedEmail.autoApprove}
                                              onCheckedChange={checked => setEditingAllowedEmail({
                                                ...editingAllowedEmail,
                                                autoApprove: checked
                                              })}
                                            />
                                            <Label htmlFor="editAutoApprove">Auto-approve</Label>
                                          </div>
                                        </div>
                                      )}
                                      
                                      <DialogFooter>
                                        <Button variant="outline" onClick={() => setEditingAllowedEmail(null)}>
                                          Cancel
                                        </Button>
                                        <Button
                                          onClick={handleUpdateAllowedEmail}
                                          disabled={updateAllowedEmailMutation.isPending}
                                        >
                                          {updateAllowedEmailMutation.isPending ? "Saving..." : "Save Changes"}
                                        </Button>
                                      </DialogFooter>
                                    </DialogContent>
                                  </Dialog>
                                  
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon">
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This will delete the email pattern '{pattern.emailPattern}'. This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => deleteAllowedEmailMutation.mutate(pattern.id)}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          {deleteAllowedEmailMutation.isPending ? "Deleting..." : "Delete"}
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
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* System Tab */}
          <TabsContent value="system" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Data Management</CardTitle>
                <CardDescription>
                  Configure data settings and perform maintenance operations.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Data Migration Section */}
                  <div className="border border-primary/20 rounded-lg p-4 bg-primary/5">
                    <h3 className="font-semibold text-lg mb-2 flex items-center">
                      <CheckCircle2 className="mr-2 h-5 w-5 text-primary" />
                      Data Migrations
                    </h3>
                    <p className="text-sm mb-4 text-gray-300">
                      These actions update data in the system to match updated requirements.
                    </p>
                    
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">Update Default Project Hours</p>
                        <p className="text-sm text-gray-400">
                          Updates all projects and schedules with the old default of 40 hours to the new default of 1000 hours.
                        </p>
                      </div>
                      
                      <Button 
                        variant="outline" 
                        className="flex items-center border-primary text-primary hover:bg-primary/10"
                        onClick={async () => {
                          try {
                            const response = await apiRequest('POST', '/api/admin/update-project-hours');
                            const result = await response.json();
                            
                            toast({
                              title: result.success ? "Hours Updated" : "Update Failed",
                              description: result.message,
                              variant: result.success ? "default" : "destructive"
                            });
                          } catch (error) {
                            toast({
                              title: "Update Failed",
                              description: "Failed to update project hours: " + (error as Error).message,
                              variant: "destructive"
                            });
                          }
                        }}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Update Hours
                      </Button>
                    </div>
                  </div>
                  
                  {/* Danger Zone */}
                  <div className="border border-destructive/20 rounded-lg p-4 bg-destructive/5">
                    <h3 className="font-semibold text-lg mb-2 flex items-center">
                      <AlertTriangle className="mr-2 h-5 w-5 text-destructive" />
                      Danger Zone
                    </h3>
                    <p className="text-sm mb-4 text-gray-300">
                      These actions are irreversible and will permanently delete data from the system.
                    </p>
                    
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">Delete All Projects</p>
                        <p className="text-sm text-gray-400">
                          This will remove all projects and their associated data (tasks, billing milestones, manufacturing schedules).
                        </p>
                      </div>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" className="flex items-center">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete All Projects
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete all projects 
                              and all related data from the database.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleDeleteAllProjects}
                              disabled={isDeleting}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {isDeleting ? "Deleting..." : "Yes, Delete Everything"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              </CardContent>
              
              {deleteResult && (
                <CardFooter>
                  <Alert className={`w-full ${deleteResult.success ? 'bg-success/20 border-success' : 'bg-destructive/20 border-destructive'}`}>
                    {deleteResult.success ? (
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    )}
                    <AlertTitle>{deleteResult.success ? 'Success' : 'Error'}</AlertTitle>
                    <AlertDescription>
                      {deleteResult.message}
                      {deleteResult.totalDeleted !== undefined && (
                        <p className="mt-1">Total projects deleted: {deleteResult.totalDeleted}</p>
                      )}
                    </AlertDescription>
                  </Alert>
                </CardFooter>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default SystemSettings;