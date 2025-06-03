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
  MoveRight,
  ArchiveRestore
} from 'lucide-react';
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
import { useRolePermissions } from "@/hooks/use-role-permissions";
import { RoleBasedWrapper } from "@/components/RoleBasedWrapper";
import { queryClient, apiRequest, getQueryFn } from '../lib/queryClient';
import RolePermissionsManager from "@/components/RolePermissionsManager";
import UserPermissionsManager from "@/components/UserPermissionsManager";

const SystemSettings = () => {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingMilestones, setIsDeletingMilestones] = useState(false);
  const [showNotificationForm, setShowNotificationForm] = useState(false);
  const [deleteResult, setDeleteResult] = useState<{
    success: boolean;
    message: string;
    totalDeleted?: number;
  } | null>(null);
  const [deleteMilestonesResult, setDeleteMilestonesResult] = useState<{
    success: boolean;
    message: string;
    totalDeleted?: number;
  } | null>(null);

  // Get user data from authentication context
  const { user } = useAuth();

  // Get role-based permissions
  const { isViewOnly, canEdit, isAdmin: hasAdminRole, shouldDisableInput, getDisabledTooltip } = useRolePermissions();

  // User role state (for permission management)
  const [isAdmin, setIsAdmin] = useState(false);

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

  // Password reset dialog state
  const [isPasswordResetDialogOpen, setIsPasswordResetDialogOpen] = useState(false);
  const [passwordResetUser, setPasswordResetUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Check the user's role to determine admin access
  useEffect(() => {
    if (user && user.role === 'admin') {
      console.log('Admin role detected, enabling admin capabilities');
      setIsAdmin(true);
    } else {
      console.log(`User role ${user?.role} does not have admin capabilities`);
      setIsAdmin(false);
    }
  }, [user]);

  // Redirect non-admins to dashboard
  if (user && user.role !== 'admin') {
    return (
      <div className="container mx-auto py-6 px-6 md:px-8">
        <Alert variant="destructive" className="max-w-md mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have permission to access system settings. This area is restricted to administrators only.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Backup functionality temporarily disabled

  // Create database backup
  const handleBackupDatabase = async () => {
    setIsBackupLoading(true);
    try {
      const response = await fetch('/api/system/backup-database', {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast({
            title: "Success",
            description: "Database backup created successfully",
          });
          // Refresh backup info
          fetchLatestBackup();
        } else {
          toast({
            title: "Error",
            description: data.message || "Failed to create database backup",
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to create database backup",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error creating backup:', error);
      toast({
        title: "Error",
        description: "Failed to create database backup",
        variant: "destructive"
      });
    } finally {
      setIsBackupLoading(false);
    }
  };

  // Restore database from backup
  const handleRestoreDatabase = async (filename: string) => {
    // Show confirmation dialog
    if (!confirm("Are you sure you want to restore the database from backup? This will replace all current data.")) {
      return;
    }

    setIsRestoreLoading(true);
    try {
      const response = await fetch('/api/system/restore-database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ filename })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast({
            title: "Success",
            description: "Database restored successfully",
          });
          // Refresh all data
          queryClient.invalidateQueries();
        } else {
          toast({
            title: "Error",
            description: data.message || "Failed to restore database",
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to restore database",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error restoring database:', error);
      toast({
        title: "Error",
        description: "Failed to restore database",
        variant: "destructive"
      });
    } finally {
      setIsRestoreLoading(false);
    }
  };

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

  const handleDeleteAllBillingMilestones = async () => {
    setIsDeletingMilestones(true);

    try {
      const response = await fetch('/api/billing-milestones/all', {
        method: 'DELETE',
      });

      const result = await response.json();

      setDeleteMilestonesResult({
        success: result.success,
        message: result.message,
        totalDeleted: result.totalDeleted
      });

      toast({
        title: result.success ? "Billing Milestones Deleted" : "Deletion Failed",
        description: result.message,
        variant: result.success ? "default" : "destructive"
      });

      // Invalidate billing milestones cache
      queryClient.invalidateQueries({ queryKey: ['/api/billing-milestones'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    } catch (error) {
      setDeleteMilestonesResult({
        success: false,
        message: "Error deleting billing milestones: " + (error as Error).message
      });

      toast({
        title: "Error",
        description: "Failed to delete billing milestones: " + (error as Error).message,
        variant: "destructive"
      });
    } finally {
      setIsDeletingMilestones(false);
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

  // Reject user mutation (also handles revoking access for approved users)
  const rejectUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/users/${userId}/reject`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        throw new Error('Failed to reject user');
      }

      return await response.json();
    },
    onSuccess: (data, variables) => {
      // Find the user to determine if they were approved or pending
      const user = users.find(u => u.id === variables);
      const wasApproved = user?.isApproved;

      toast({
        title: wasApproved ? "Access Revoked" : "User Rejected",
        description: wasApproved 
          ? "User access has been successfully revoked." 
          : "The user request has been rejected.",
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to reject user: " + (error as Error).message,
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

  const handleRejectUser = (userId: string) => {
    rejectUserMutation.mutate(userId);
  };

  // Handle edit user button click
  const handleEditUserClick = (user: any) => {
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

  // User sorting function
  const handleSort = (column: string) => {
    setUserSort(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Get sorted users
  const getSortedUsers = () => {
    if (!users || users.length === 0) return [];

    return [...users].sort((a, b) => {
      // Handle special cases based on column
      if (userSort.column === 'lastName') {
        const aValue = `${a.lastName || ''} ${a.firstName || ''}`.toLowerCase();
        const bValue = `${b.lastName || ''} ${b.firstName || ''}`.toLowerCase();
        return userSort.direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (userSort.column === 'department') {
        const aValue = (a.department || 'zzz').toLowerCase(); // 'zzz' to sort empty values last
        const bValue = (b.department || 'zzz').toLowerCase();
        return userSort.direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (userSort.column === 'createdAt' || userSort.column === 'lastLogin') {
        const aDate = a[userSort.column] ? new Date(a[userSort.column]) : new Date(0);
        const bDate = b[userSort.column] ? new Date(b[userSort.column]) : new Date(0);
        return userSort.direction === 'asc' 
          ? aDate.getTime() - bDate.getTime()
          : bDate.getTime() - aDate.getTime();
      }

      if (userSort.column === 'isApproved') {
        // Sort by approval status (boolean)
        return userSort.direction === 'asc'
          ? (a.isApproved === b.isApproved ? 0 : a.isApproved ? 1 : -1)
          : (a.isApproved === b.isApproved ? 0 : a.isApproved ? -1 : 1);
      }

      // Default sort for other columns
      const aValue = (a[userSort.column] || '').toString().toLowerCase();
      const bValue = (b[userSort.column] || '').toString().toLowerCase();
      return userSort.direction === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    });
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
          description: "User information has been successfully updated."
        });
        setIsEditDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      })
      .catch(error => {
        toast({
          title: "Error",
          description: "Failed to update user: " + error.message,
          variant: "destructive"
        });
      });
  };

  // Password reset mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string, newPassword: string }) => {
      const response = await fetch(`/api/users/${userId}/reset-password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newPassword }),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to reset password');
      }

      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password Reset",
        description: "User password has been successfully reset.",
        variant: "default"
      });
      setIsPasswordResetDialogOpen(false);
      setNewPassword('');
      setConfirmPassword('');
      setPasswordResetUser(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to reset password: " + (error as Error).message,
        variant: "destructive"
      });
    }
  });

  const handlePasswordReset = (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordResetUser) return;

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive"
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive"
      });
      return;
    }

    resetPasswordMutation.mutate({
      userId: passwordResetUser.id,
      newPassword: newPassword
    });
  };

  const handlePasswordResetClick = (user: any) => {
    setPasswordResetUser(user);
    setNewPassword('');
    setConfirmPassword('');
    setIsPasswordResetDialogOpen(true);
  };

  // Handle tab change
  const [currentTab, setCurrentTab] = useState('accessControl');

  // For system maintenance stats
  const {
    data: activeProjects = [],
    isLoading: activeProjectsLoading,
    error: activeProjectsError
  } = useQuery({
    queryKey: ['/api/projects'],
    queryFn: getQueryFn({}),
  });

  // For archive management
  const {
    data: archivedProjects = [],
    isLoading: archivedProjectsLoading,
    error: archivedProjectsError
  } = useQuery({
    queryKey: ['/api/archived-projects'],
    queryFn: getQueryFn({}),
  });

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
      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and department settings.
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
                  type="email"
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
                  disabled={!hasAdminRole}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select role" />
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
                <Select 
                  value={editUserForm.department || ''} 
                  onValueChange={(value) => setEditUserForm({...editUserForm, department: value})}
                  disabled={!hasAdminRole}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="engineering">Engineering</SelectItem>
                    <SelectItem value="manufacturing">Manufacturing</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="project_management">Project Management</SelectItem>
                    <SelectItem value="quality_control">Quality Control</SelectItem>
                    <SelectItem value="it">IT</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="executive">Executive</SelectItem>
                    <SelectItem value="planning_analysis">Planning & Analysis</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!hasAdminRole}>
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={isPasswordResetDialogOpen} onOpenChange={setIsPasswordResetDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Reset User Password</DialogTitle>
            <DialogDescription>
              Reset password for {passwordResetUser?.firstName} {passwordResetUser?.lastName} ({passwordResetUser?.email})
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePasswordReset}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setIsPasswordResetDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={resetPasswordMutation.isPending}
              >
                {resetPasswordMutation.isPending ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
                    Resetting...
                  </>
                ) : (
                  <>Reset Password</>
                )}
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

      <Tabs defaultValue="accessControl" className="w-full space-y-6" onValueChange={setCurrentTab}>







        {/* Access Control Tab */}
        <TabsContent value="accessControl" className="space-y-6">

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
                          disabled={!hasAdminRole}
                        />
                      </div>
                      <div>
                        <Label htmlFor="defaultRole">Default Role</Label>
                        <Select 
                          value={newEmailPattern.defaultRole}
                          onValueChange={(value) => setNewEmailPattern({...newEmailPattern, defaultRole: value})}
                          disabled={!hasAdminRole}
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
                          disabled={!hasAdminRole}
                        />
                      </div>
                      <div className="md:col-span-4 flex justify-end">
                        <Button type="submit" disabled={createEmailPatternMutation.isPending || !hasAdminRole}>
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
                            <TableHead onClick={() => handleSort('lastName')} className="cursor-pointer hover:bg-slate-100">
                              User {userSort.column === 'lastName' && (userSort.direction === 'asc' ? '↑' : '↓')}
                            </TableHead>
                            <TableHead onClick={() => handleSort('role')} className="cursor-pointer hover:bg-slate-100">
                              Role {userSort.column === 'role' && (userSort.direction === 'asc' ? '↑' : '↓')}
                            </TableHead>
                            <TableHead onClick={() => handleSort('department')} className="cursor-pointer hover:bg-slate-100">
                              Department {userSort.column === 'department' && (userSort.direction === 'asc' ? '↑' : '↓')}
                            </TableHead>
                            <TableHead onClick={() => handleSort('isApproved')} className="cursor-pointer hover:bg-slate-100">
                              Status {userSort.column === 'isApproved' && (userSort.direction === 'asc' ? '↑' : '↓')}
                            </TableHead>
                            <TableHead onClick={() => handleSort('createdAt')} className="cursor-pointer hover:bg-slate-100">
                              Created {userSort.column === 'createdAt' && (userSort.direction === 'asc' ? '↑' : '↓')}
                            </TableHead>
                            <TableHead onClick={() => handleSort('lastLogin')} className="cursor-pointer hover:bg-slate-100">
                              Last Login {userSort.column === 'lastLogin' && (userSort.direction === 'asc' ? '↑' : '↓')}
                            </TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getSortedUsers().map((user) => (
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
                                <Badge 
                                  variant={user.role === 'admin' ? 'default' : user.role === 'editor' ? 'secondary' : 'outline'}
                                  className="capitalize"
                                >
                                  {user.role || 'viewer'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {user.department || 'Not assigned'}
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
                                <div className="flex justify-end space-x-2">
                                  {!user.isApproved && (
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      className="text-green-600 hover:text-green-700 hover:bg-green-100 flex items-center"
                                      onClick={() => handleApproveUser(user.id)}
                                      disabled={!isAdmin || approveUserMutation.isPending}
                                    >
                                      <UserCheck className="h-4 w-4 mr-1" />
                                      Approve
                                    </Button>
                                  )}

                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        className="text-red-600 hover:text-red-700 hover:bg-red-100 flex items-center"
                                        disabled={!isAdmin}
                                      >
                                        <UserX className="h-4 w-4 mr-1" />
                                        Reject
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>
                                          {user.isApproved ? 'Revoke User Access' : 'Reject User'}
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to {user.isApproved ? 'revoke access for' : 'reject'} {user.firstName} {user.lastName}? 
                                          {user.isApproved ? 
                                            ' This will prevent them from accessing the system.' : 
                                            ' Their account request will be denied.'}
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction 
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                          onClick={() => handleRejectUser(user.id)}
                                        >
                                          {user.isApproved ? 'Revoke Access' : 'Reject'}
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>

                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    title="Edit User"
                                    onClick={() => handleEditUserClick(user)}
                                    disabled={!hasAdminRole}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>

                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    title="Reset Password"
                                    onClick={() => handlePasswordResetClick(user)}
                                    disabled={!hasAdminRole}
                                    className="text-orange-600 hover:text-orange-700 hover:bg-orange-100"
                                  >
                                    <Lock className="h-4 w-4" />
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








                        Control which modules each user can access. Select a user below to manage their permissions.




                      {users
                        ?.filter(user => user.isApproved && user.status === 'active')
                        ?.map((user) => (
                          <div key={user.id} className="border p-4 rounded">
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="font-medium">{user.firstName} {user.lastName}</div>
                                <div className="text-sm text-gray-600">{user.email}</div>
                                <div className="text-sm text-gray-500">{user.role}</div>
                              </div>
                              <UserPermissionsManager
                                userId={user.id}
                                userEmail={user.email}
                                userRole={user.role}
                              />
                            </div>
                          </div>
                        ))}






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

                              Title
                              <Input 
                                id="title" 
                                value={newNotification.title}
                                onChange={(e) => setNewNotification({...newNotification, title: e.target.value})}
                                placeholder="Notification Title"
                                required
                              />



                                Priority
                                <Select 
                                  value={newNotification.priority}
                                  onValueChange={(value) => setNewNotification({...newNotification, priority: value})}
                                >

                                    Select priority







                                </Select>


                                Type
                                <Select 
                                  value={newNotification.type}
                                  onValueChange={(value) => setNewNotification({...newNotification, type: value})}
                                >

                                    Select type







                                </Select>





                            Message
                            <textarea 
                              id="message" 
                              value={newNotification.message}
                              onChange={(e) => setNewNotification({...newNotification, message: e.target.value})}
                              placeholder="Notification message..."
                              className="w-full h-24 px-3 py-2 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                              required
                            />




                              Cancel


                              {createNotificationMutation.isPending ? (
                                <>

                                  Sending...
                                </>
                              ) : (
                                <>Send Notification</>
                              )}


                        </form>
                      </CardContent>
                    </Card>
                  )}




                      User Activity Logs


                    {userAuditLogsLoading ? (



                    ) : userAuditLogsError ? (


                        Error
                        Failed to load user audit logs

                    ) : userAuditLogs && userAuditLogs.length === 0 ? (

                        No user activity logs found.

                    ) : (





                              Action
                              Details
                              Timestamp



                            {userAuditLogs.map((log: any) => {
                              // Find username if we have a userId
                              const user = users?.find(u => u.id === log.userId);
                              const displayName = user ? `${user.firstName} ${user.lastName}` : (log.userId || 'System');

                              // Determine badge color based on action type
                              let badgeVariant: 'outline' | 'default' | 'secondary' | 'destructive' = 'outline';
                              if (log.action === 'STATUS_CHANGE') {
                                badgeVariant = 'destructive';
                              } else if (log.action === 'USER_UPDATE') {
                                badgeVariant = 'secondary';
                              } else if (log.action === 'USER_CREATE') {
                                badgeVariant = 'default';
                              }

                              return (


                                    {displayName}



                                      {log.action}



                                    {log.details}


                                    {new Date(log.timestamp).toLocaleString()}


                              );
                            })}



                    )}


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



                      Archived Projects


                    {archivedProjectsLoading ? (



                    ) : archivedProjectsError ? (


                        Error
                        Failed to load archived projects

                    ) : archivedProjects && archivedProjects.length === 0 ? (

                        No archived projects found.

                    ) : (




                              Project
                              Project Number
                              Archived Date
                              Archive Reason
                              Archived By
                                Actions



                            {archivedProjects && archivedProjects.map((project: any) => (


                                  {project.name}


                                  {project.projectNumber}


                                  {new Date(project.archivedAt || project.updatedAt).toLocaleDateString()}


                                  {project.archiveReason || 'No reason provided'}


                                  {project.archivedBy || 'Unknown'}







                                            Restore




                                            Are you sure you want to restore project '{project.name}'? 
                                            It will be moved back to active projects.



                                          Cancel

                                            Restore









                                            Delete




                                            Are you sure you want to permanently delete project '{project.name}'? 
                                            This action cannot be undone and all associated data will be lost forever.



                                          Cancel

                                            Permanently Delete







                            ))}



                    )}


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



                      Warning: Destructive Actions
                      The operations in this section can permanently delete data. Proceed with caution.







                          Reset All Projects
                          Delete all projects and related data from the system.




                              Reset All Projects




                              Delete All Projects
                              This will permanently delete ALL projects and related data from the system.
                              This action cannot be undone. Are you absolutely sure?



                            Cancel

                              {isDeleting ? (
                                <>

                                  Deleting...
                                </>
                              ) : (
                                <>Delete All Projects</>
                              )}




                        {deleteResult && (


                              {deleteResult.success ? (

                              ) : (

                              )}
                              {deleteResult.success ? "Success" : "Error"}

                                {deleteResult.message}
                                {deleteResult.totalDeleted !== undefined && (


                                      {deleteResult.totalDeleted} projects deleted


                                )}



                        )}






                          Delete All Billing Milestones
                          Delete all billing milestones from the system.




                              Delete All Milestones




                              Delete All Billing Milestones
                              This will permanently delete ALL billing milestones from the system.
                              This action cannot be undone. Are you absolutely sure?



                            Cancel

                              {isDeletingMilestones ? (
                                <>

                                  Deleting...
                                </>
                              ) : (
                                <>Delete All Milestones</>
                              )}




                        {deleteMilestonesResult && (


                              {deleteMilestonesResult.success ? (

                              ) : (

                              )}
                              {deleteMilestonesResult.success ? "Success" : "Error"}

                                {deleteMilestonesResult.message}
                                {deleteMilestonesResult.totalDeleted !== undefined && (


                                      {deleteMilestonesResult.totalDeleted} milestones deleted


                                )}



                        )}





                        Database Backup
                        Create a backup of the current database.



                          Backup Database






                        Database Restore
                        Restore the database from a backup file.



                          Restore Database





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




                        Application Version
                        v1.0.0


                        Database Status




                          Connected



                        System Date

                          {new Date().toLocaleString()}












                          {users ? users.length : 0}
                          Total Users




                          {activeProjects ? activeProjects.length : 0}
                          Active Projects




                          {archivedProjects ? archivedProjects.length : 0}
                          Archived Projects




                          {storageInfo ? storageInfo.totalStorageUsed : 28}
                          Storage Used (MB)





              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>


};



export default SystemSettings;