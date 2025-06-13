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
  ArrowUpCircle,
  Database,
  Loader2
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import RolePermissionsManager from "@/components/RolePermissionsManager";
import ExternalConnectionsManager from "@/components/ExternalConnectionsManager";
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

  // User module visibility state
  const [userModuleVisibility, setUserModuleVisibility] = useState<Record<string, Record<string, boolean>>>({});

  // Role controls state for editing permissions
  const [rolePermissions, setRolePermissions] = useState({
    admin: {
      modules: {
        'project-management': true,
        'sales-forecast': true,
        'bay-scheduling': true,
        'billing-management': true,
        'reports': true,
        'import-export': true,
        'system-settings': true
      },
      data: {
        'view-data': true,
        'create-records': true,
        'edit-records': true,
        'delete-records': true,
        'import-data': true,
        'export-data': true
      },
      system: {
        'user-management': true,
        'role-assignment': true,
        'module-visibility': true,
        'system-maintenance': true,
        'backup-archive': true
      }
    },
    editor: {
      modules: {
        'project-management': true,
        'sales-forecast': true,
        'bay-scheduling': true,
        'billing-management': true,
        'reports': true,
        'import-export': false,
        'system-settings': false
      },
      data: {
        'view-data': true,
        'create-records': true,
        'edit-records': true,
        'delete-records': true,
        'import-data': false,
        'export-data': true
      },
      system: {
        'user-management': false,
        'role-assignment': false,
        'module-visibility': false,
        'system-maintenance': false,
        'backup-archive': false
      }
    },
    viewer: {
      modules: {
        'project-management': true,
        'sales-forecast': false,
        'bay-scheduling': false,
        'billing-management': true,
        'reports': true,
        'import-export': false,
        'system-settings': false
      },
      data: {
        'view-data': true,
        'create-records': false,
        'edit-records': false,
        'delete-records': false,
        'import-data': false,
        'export-data': true
      },
      system: {
        'user-management': false,
        'role-assignment': false,
        'module-visibility': false,
        'system-maintenance': false,
        'backup-archive': false
      }
    }
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

  // In a production environment, we would check the user's role here
  // For now, since we're in development mode, we'll always have admin rights
  // This ensures the permissions UI is editable during development
  useEffect(() => {
    console.log('Development mode detected, enabling admin capabilities');
    setIsAdmin(true);
  }, []);

  // Load user module visibility settings
  const loadUserModuleVisibility = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}/module-visibility`);
      if (response.ok) {
        const data = await response.json();
        const visibilityMap: Record<string, boolean> = {};
        data.forEach((item: any) => {
          visibilityMap[item.module] = item.is_visible;
        });
        setUserModuleVisibility(prev => ({
          ...prev,
          [userId]: visibilityMap
        }));
      }
    } catch (error) {
      console.error('Error loading user module visibility:', error);
    }
  };



  // Backup functionality temporarily disabled





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

  // Load module visibility for all users when users data changes
  useEffect(() => {
    if (users && users.length > 0) {
      users.forEach(user => {
        loadUserModuleVisibility(user.id);
      });
    }
  }, [users]);

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

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "User Deleted",
        description: "User has been permanently deleted from the system.",
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete user: " + (error as Error).message,
        variant: "destructive"
      });
    }
  });

  const handleDeleteUser = (userId: string) => {
    deleteUserMutation.mutate(userId);
  };

  // Handle role permission changes
  const handleRolePermissionChange = async (role: 'admin' | 'editor' | 'viewer', category: 'modules' | 'data' | 'system', permission: string, value: boolean) => {
    // Update local state immediately for instant UI feedback
    setRolePermissions(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [category]: {
          ...prev[role][category],
          [permission]: value
        }
      }
    }));

    try {
      // Save to backend immediately (auto-save)
      const response = await fetch('/api/role-permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role,
          category,
          permission,
          enabled: value
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to save permission change');
      }

      // Show success toast notification
      toast({
        title: "Permission Auto-Saved",
        description: `${role.charAt(0).toUpperCase() + role.slice(1)} role ${permission.replace('-', ' ')} permission ${value ? 'enabled' : 'disabled'} and saved instantly.`,
        variant: "default"
      });
    } catch (error) {
      // Revert local state on error
      setRolePermissions(prev => ({
        ...prev,
        [role]: {
          ...prev[role],
          [category]: {
            ...prev[role][category],
            [permission]: !value // Revert to previous state
          }
        }
      }));

      toast({
        title: "Auto-Save Failed",
        description: "Failed to save permission change. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Create permission render function
  const renderPermissionItem = (role: 'admin' | 'editor' | 'viewer', category: 'modules' | 'data' | 'system', permission: string, label: string) => {
    const isEnabled = (rolePermissions[role][category] as any)[permission] || false;

    return (
      <div key={permission} className="flex items-center justify-between">
        <span>{label}</span>
        <Switch 
          checked={isEnabled}
          disabled={!isAdmin}
          onCheckedChange={(checked) => handleRolePermissionChange(role, category, permission, checked)}
        />
      </div>
    );
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

  // Handle password reset button click
  const handlePasswordResetClick = (user: any) => {
    setPasswordResetUser(user);
    setNewPassword('');
    setConfirmPassword('');
    setIsPasswordResetDialogOpen(true);
  };

  // Handle password reset submission
  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordResetUser) return;

    if (newPassword !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match. Please try again.",
        variant: "destructive"
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch(`/api/admin/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: passwordResetUser.id,
          newPassword: newPassword
        })
      });

      if (!response.ok) {
        throw new Error('Failed to reset password');
      }

      toast({
        title: "Password Reset Successful",
        description: `Password has been reset for ${passwordResetUser.firstName} ${passwordResetUser.lastName}.`
      });

      setIsPasswordResetDialogOpen(false);
      setNewPassword('');
      setConfirmPassword('');
      setPasswordResetUser(null);

    } catch (error) {
      toast({
        title: "Password Reset Failed",
        description: "Failed to reset user password. Please try again.",
        variant: "destructive"
      });
    }
  };

  // User sorting function
  const handleSort = (column: string) => {
    setUserSort(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'desc'
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
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="z-[10001]">
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
                  value={editUserForm.department}
                  onValueChange={(value) => setEditUserForm({...editUserForm, department: value})}
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
                    <SelectItem value="supply_chain">Supply Chain</SelectItem>
                    <SelectItem value="isg">ISG</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
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

      {/* Password Reset Dialog */}
      <Dialog open={isPasswordResetDialogOpen} onOpenChange={setIsPasswordResetDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Reset User Password</DialogTitle>
            <DialogDescription>
              Set a new password for {passwordResetUser?.firstName} {passwordResetUser?.lastName} ({passwordResetUser?.email}).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePasswordResetSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="newPassword" className="text-right">
                  New Password
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="col-span-3"
                  placeholder="Enter new password"
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="confirmPassword" className="text-right">
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="col-span-3"
                  placeholder="Confirm new password"
                  required
                />
              </div>

              <div className="col-span-4 text-sm text-muted-foreground">
                Password must be at least 6 characters long.
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setIsPasswordResetDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive">
                Reset Password
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
        <TabsList className="grid grid-cols-7 w-full">
          <TabsTrigger value="accessControl">Access Control</TabsTrigger>
          <TabsTrigger value="roleControls">Role Controls</TabsTrigger>
          <TabsTrigger value="moduleVisibility">Module Visibility</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="externalConnections">External Connections</TabsTrigger>
          <TabsTrigger value="archiveManagement">Archive Management</TabsTrigger>
          <TabsTrigger value="maintenance">System Maintenance</TabsTrigger>
        </TabsList>

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
                                <Badge variant={user.role === 'admin' ? 'default' : user.role === 'editor' ? 'secondary' : 'outline'}>
                                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                            {user.department ? 
                              user.department.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 
                              'Not assigned'
                            }
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
                            {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 'Never'}
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

                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="icon"
                                        className="text-red-600 hover:text-red-700 hover:bg-red-100"
                                        title="Delete User"
                                        disabled={!isAdmin}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete User</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to permanently delete {user.firstName} {user.lastName}? 
                                          This action cannot be undone and will remove all user data from the system.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction 
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                          onClick={() => handleDeleteUser(user.id)}
                                        >
                                          Delete User
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>

                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    title="Reset Password"
                                    onClick={() => handlePasswordResetClick(user)}
                                    disabled={!isAdmin}
                                  >
                                    <Lock className="h-4 w-4" />
                                  </Button>

                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    title="Edit User"
                                    onClick={() => handleEditUserClick(user)}
                                  >
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

          {/* Role Controls Tab */}
          <TabsContent value="roleControls" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Role Controls Management</CardTitle>
                <CardDescription>
                  Configure default permission settings for each role (Viewer, Editor, Admin). Changes apply to new users and serve as fallback defaults when individual permissions aren't set.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {/* Admin Role */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Shield className="h-5 w-5 text-green-600" />
                      <h3 className="text-lg font-semibold">Admin Role</h3>
                      <Badge variant="default" className="bg-green-100 text-green-800">Full Access</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <Card className="p-4 border-green-200">
                        <h4 className="font-medium mb-2">Module Access</h4>
                        <div className="space-y-1 text-sm">
                          {renderPermissionItem('admin', 'modules', 'project-management', 'Project Management')}
                          {renderPermissionItem('admin', 'modules', 'sales-forecast', 'Sales Forecast')}
                          {renderPermissionItem('admin', 'modules', 'bay-scheduling', 'Bay Scheduling')}
                          {renderPermissionItem('admin', 'modules', 'billing-management', 'Billing Management')}
                          {renderPermissionItem('admin', 'modules', 'reports', 'Reports')}
                          {renderPermissionItem('admin', 'modules', 'import-export', 'Import/Export')}
                          {renderPermissionItem('admin', 'modules', 'system-settings', 'System Settings')}
                        </div>
                      </Card>
                      <Card className="p-4 border-green-200">
                        <h4 className="font-medium mb-2">Data Permissions</h4>
                        <div className="space-y-1 text-sm">
                          {renderPermissionItem('admin', 'data', 'view-data', 'View All Data')}
                          {renderPermissionItem('admin', 'data', 'create-records', 'Create Records')}
                          {renderPermissionItem('admin', 'data', 'edit-records', 'Edit Records')}
                          {renderPermissionItem('admin', 'data', 'delete-records', 'Delete Records')}
                          {renderPermissionItem('admin', 'data', 'import-data', 'Import Data')}
                          {renderPermissionItem('admin', 'data', 'export-data', 'Export Data')}
                        </div>
                      </Card>
                      <Card className="p-4 border-green-200">
                        <h4 className="font-medium mb-2">System Controls</h4>
                        <div className="space-y-1 text-sm">
                          {renderPermissionItem('admin', 'system', 'user-management', 'User Management')}
                          {renderPermissionItem('admin', 'system', 'role-assignment', 'Role Assignment')}
                          {renderPermissionItem('admin', 'system', 'module-visibility', 'Module Visibility')}
                          {renderPermissionItem('admin', 'system', 'system-maintenance', 'System Maintenance')}
                          {renderPermissionItem('admin', 'system', 'backup-archive', 'Backup & Archive')}
                        </div>
                      </Card>
                    </div>
                  </div>

                  <Separator />

                  {/* Editor Role */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Edit className="h-5 w-5 text-blue-600" />
                      <h3 className="text-lg font-semibold">Editor Role</h3>
                      <Badge variant="outline" className="border-blue-200 text-blue-800">Limited Access</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <Card className="p-4 border-blue-200">
                        <h4 className="font-medium mb-2">Module Access</h4>
                        <div className="space-y-1 text-sm">
                          {renderPermissionItem('editor', 'modules', 'project-management', 'Project Management')}
                          {renderPermissionItem('editor', 'modules', 'sales-forecast', 'Sales Forecast')}
                          {renderPermissionItem('editor', 'modules', 'bay-scheduling', 'Bay Scheduling')}
                          {renderPermissionItem('editor', 'modules', 'billing-management', 'Billing Management')}
                          {renderPermissionItem('editor', 'modules', 'reports', 'Reports')}
                          {renderPermissionItem('editor', 'modules', 'import-export', 'Import/Export')}
                          {renderPermissionItem('editor', 'modules', 'system-settings', 'System Settings')}
                        </div>
                      </Card>
                      <Card className="p-4 border-blue-200">
                        <h4 className="font-medium mb-2">Data Permissions</h4>
                        <div className="space-y-1 text-sm">
                          {renderPermissionItem('editor', 'data', 'view-data', 'View All Data')}
                          {renderPermissionItem('editor', 'data', 'create-records', 'Create Records')}
                          {renderPermissionItem('editor', 'data', 'edit-records', 'Edit Records')}
                          {renderPermissionItem('editor', 'data', 'delete-records', 'Delete Records')}
                          {renderPermissionItem('editor', 'data', 'import-data', 'Import Data')}
                          {renderPermissionItem('editor', 'data', 'export-data', 'Export Data')}
                        </div>
                      </Card>
                      <Card className="p-4 border-blue-200">
                        <h4 className="font-medium mb-2">System Controls</h4>
                        <div className="space-y-1 text-sm">
                          {renderPermissionItem('editor', 'system', 'user-management', 'User Management')}
                          {renderPermissionItem('editor', 'system', 'role-assignment', 'Role Assignment')}
                          {renderPermissionItem('editor', 'system', 'module-visibility', 'Module Visibility')}
                          {renderPermissionItem('editor', 'system', 'system-maintenance', 'System Maintenance')}
                          {renderPermissionItem('editor', 'system', 'backup-archive', 'Backup & Archive')}
                        </div>
                      </Card>
                    </div>
                  </div>

                  <Separator />

                  {/* Viewer Role */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <UserCheck className="h-5 w-5 text-amber-600" />
                      <h3 className="text-lg font-semibold">Viewer Role</h3>
                      <Badge variant="outline" className="border-amber-200 text-amber-800">Read-Only Access</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <Card className="p-4 border-amber-200">
                        <h4 className="font-medium mb-2">Module Access</h4>
                        <div className="space-y-1 text-sm">
                          {renderPermissionItem('viewer', 'modules', 'project-management', 'Project Management')}
                          {renderPermissionItem('viewer', 'modules', 'sales-forecast', 'Sales Forecast')}
                          {renderPermissionItem('viewer', 'modules', 'bay-scheduling', 'Bay Scheduling')}
                          {renderPermissionItem('viewer', 'modules', 'billing-management', 'Billing Management')}
                          {renderPermissionItem('viewer', 'modules', 'reports', 'Reports')}
                          {renderPermissionItem('viewer', 'modules', 'import-export', 'Import/Export')}
                          {renderPermissionItem('viewer', 'modules', 'system-settings', 'System Settings')}
                        </div>
                      </Card>
                      <Card className="p-4 border-amber-200">
                        <h4 className="font-medium mb-2">Data Permissions</h4>
                        <div className="space-y-1 text-sm">
                          {renderPermissionItem('viewer', 'data', 'view-data', 'View All Data')}
                          {renderPermissionItem('viewer', 'data', 'create-records', 'Create Records')}
                          {renderPermissionItem('viewer', 'data', 'edit-records', 'Edit Records')}
                          {renderPermissionItem('viewer', 'data', 'delete-records', 'Delete Records')}
                          {renderPermissionItem('viewer', 'data', 'import-data', 'Import Data')}
                          {renderPermissionItem('viewer', 'data', 'export-data', 'Export Data')}
                        </div>
                      </Card>
                      <Card className="p-4 border-amber-200">
                        <h4 className="font-medium mb-2">System Controls</h4>
                        <div className="space-y-1 text-sm">
                          {renderPermissionItem('viewer', 'system', 'user-management', 'User Management')}
                          {renderPermissionItem('viewer', 'system', 'role-assignment', 'Role Assignment')}
                          {renderPermissionItem('viewer', 'system', 'module-visibility', 'Module Visibility')}
                          {renderPermissionItem('viewer', 'system', 'system-maintenance', 'System Maintenance')}
                          {renderPermissionItem('viewer', 'system', 'backup-archive', 'Backup & Archive')}
                        </div>
                      </Card>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Module Visibility Tab */}
          <TabsContent value="moduleVisibility" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Module Visibility Control</CardTitle>
                <CardDescription>
                  Control which modules each individual user can access in the system. Toggle modules on/off for specific users.
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
                    <div className="space-y-6">
                      {getSortedUsers().map((user) => (
                        <div key={user.id} className="space-y-4 border rounded-lg p-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                              {user.firstName ? user.firstName.charAt(0) : user.username?.charAt(0)}
                            </div>
                            <div>
                              <div className="font-medium">{user.firstName} {user.lastName}</div>
                              <div className="text-sm text-muted-foreground flex items-center space-x-2">
                                <span>{user.email || user.username}</span>
                                <Badge variant={user.role === 'admin' ? 'default' : user.role === 'editor' ? 'secondary' : 'outline'}>
                                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pl-11">
                            {[
                              { id: 'dashboard', name: 'Dashboard', description: 'Main dashboard view' },
                              { id: 'projects', name: 'Projects', description: 'View and manage projects' },
                              { id: 'sales-forecast', name: 'Sales Forecast', description: 'Sales forecasting and analytics' },
                              { id: 'bay-scheduling', name: 'Bay Scheduling', description: 'Manufacturing scheduling system' },
                              { id: 'billing', name: 'Billing Milestones', description: 'Financial tracking and billing' },
                              { id: 'on-time-delivery', name: 'On Time Delivery', description: 'Delivery tracking and metrics' },
                              { id: 'delivered-projects', name: 'Delivered Projects', description: 'View delivered projects' },
                              { id: 'calendar', name: 'Calendar', description: 'Calendar view and scheduling' },
                              { id: 'reports', name: 'Reports', description: 'Reports and analytics' },
                              { id: 'import', name: 'Import Data', description: 'Import data functionality' },
                              { id: 'export-reports', name: 'Export Reports', description: 'Export reports and data' },
                              { id: 'system-settings', name: 'System Settings', description: 'Access system configuration' }
                            ].map((module) => {
                              // Get saved visibility state or default based on role
                              const getSavedOrDefaultChecked = () => {
                                // Check if we have saved visibility data for this user and module
                                const savedVisibility = userModuleVisibility[user.id]?.[module.id];
                                if (savedVisibility !== undefined) {
                                  return savedVisibility;
                                }

                                // Fallback to role-based defaults
                                if (user.role === 'admin') return true;
                                if (user.role === 'editor') return !['quality-assurance', 'system-settings', 'import'].includes(module.id);
                                if (user.role === 'viewer') return !['quality-assurance', 'sales-forecast', 'bay-scheduling', 'system-settings', 'import'].includes(module.id);
                                return false;
                              };

                              return (
                                <Card key={`${user.id}-${module.id}`} className="p-3 bg-slate-50/50">
                                  <div className="flex items-center justify-between space-x-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-sm">{module.name}</div>
                                      <div className="text-xs text-muted-foreground">{module.description}</div>
                                    </div>
                                    <Switch 
                                      checked={getSavedOrDefaultChecked()}
                                      disabled={!isAdmin}
                                      onCheckedChange={async (checked) => {
                                        console.log(`User ${user.firstName} ${user.lastName} - ${module.name} visibility:`, checked);

                                        try {
                                          const response = await fetch(`/api/users/${user.id}/module-visibility`, {
                                            method: 'PATCH',
                                            headers: {
                                              'Content-Type': 'application/json',
                                            },
                                            body: JSON.stringify({
                                              module: module.id,
                                              is_visible: checked
                                            }),
                                          });

                                          if (!response.ok) {
                                            throw new Error('Failed to update module visibility');
                                          }

                                          // Update local state to reflect the change
                                          setUserModuleVisibility(prev => ({
                                            ...prev,
                                            [user.id]: {
                                              ...prev[user.id],
                                              [module.id]: checked
                                            }
                                          }));

                                          // Invalidate module visibility cache to trigger refetch
                                          queryClient.invalidateQueries({ queryKey: ['module-visibility', user.id] });

                                          toast({
                                            title: "Module Visibility Updated",
                                            description: `${module.name} visibility for ${user.firstName} ${user.lastName} has been updated.`,
                                            variant: "default"
                                          });
                                        } catch (error) {
                                          toast({
                                            title: "Error",
                                            description: "Failed to update module visibility: " + (error as Error).message,
                                            variant: "destructive"
                                          });
                                        }
                                      }}
                                    />
                                  </div>
                                </Card>
                              );
                            })}
                          </div>
                        </div>
                      ))}
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
                              <TableHead>Changed Item</TableHead>
                              <TableHead>Details</TableHead>
                              <TableHead>Timestamp</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {userAuditLogs.map((log: any) => (
                              <TableRow key={log.id}>
                                <TableCell>
                                  <div className="flex items-center space-x-2">
                                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary">
                                      {(() => {
                                        // Try to get user from performed_by field first
                                        if (log.performed_by && log.performed_by !== 'system') {
                                          return log.performed_by.charAt(0).toUpperCase();
                                        }
                                        // Try username
                                        if (log.username && log.username !== 'system') {
                                          return log.username.charAt(0).toUpperCase();
                                        }
                                        // Try to find user in the users list by userId
                                        if (log.userId && users) {
                                          const user = users.find((u: any) => u.id === log.userId);
                                          if (user && user.firstName) {
                                            return user.firstName.charAt(0).toUpperCase();
                                          }
                                          if (user && user.username) {
                                            return user.username.charAt(0).toUpperCase();
                                          }
                                        }
                                        return 'S';
                                      })()}
                                    </div>
                                    <span className="font-medium">
                                      {(() => {
                                        // Try to get user from performed_by field first
                                        if (log.performed_by && log.performed_by !== 'system') {
                                          return log.performed_by;
                                        }
                                        // Try username
                                        if (log.username && log.username !== 'system') {
                                          return log.username;
                                        }
                                        // Try to find user in the users list by userId
                                        if (log.userId && users) {
                                          const user = users.find((u: any) => u.id === log.userId);
                                          if (user) {
                                            return user.firstName && user.lastName 
                                              ? `${user.firstName} ${user.lastName}`
                                              : user.username || user.email;
                                          }
                                        }
                                        return 'System';
                                      })()}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={log.action === 'login' ? 'outline' : log.action === 'create' ? 'default' : log.action === 'update' ? 'secondary' : 'destructive'}>
                                    {log.action.charAt(0).toUpperCase() + log.action.slice(1)}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="font-medium text-sm">
                                    {(() => {
                                      // Parse details to extract entity information
                                      if (log.details) {
                                        if (log.details.includes('project')) {
                                          const match = log.details.match(/project\s+([#\w\d-]+)|Project\s+([#\w\d-]+)/i);
                                          if (match) {
                                            return `Project ${match[1] || match[2]}`;
                                          }
                                        }
                                        if (log.details.includes('user')) {
                                          const match = log.details.match(/user\s+([#\w\d-@.]+)/i);
                                          if (match) {
                                            return `User ${match[1]}`;
                                          }
                                        }
                                        if (log.details.includes('bay')) {
                                          const match = log.details.match(/bay\s+([#\w\d-]+)/i);
                                          if (match) {
                                            return `Bay ${match[1]}`;
                                          }
                                        }
                                        if (log.details.includes('milestone')) {
                                          const match = log.details.match(/milestone\s+([#\w\d-]+)/i);
                                          if (match) {
                                            return `Milestone ${match[1]}`;
                                          }
                                        }
                                      }

                                      // Try extracting from entityType/entityId
                                      if (log.entityType) {
                                        return `${log.entityType}${log.entityId ? ` #${log.entityId}` : ''}`;
                                      }

                                      // Extract from new_data or previous_data
                                      try {
                                        const newData = log.new_data ? JSON.parse(log.new_data) : null;
                                        const prevData = log.previous_data ? JSON.parse(log.previous_data) : null;

                                        if (newData?.projectNumber) {
                                          return `Project ${newData.projectNumber}`;
                                        }
                                        if (newData?.name && log.action === 'create') {
                                          return `${log.action === 'create' ? 'New Item' : 'Item'}: ${newData.name}`;
                                        }
                                        if (prevData?.projectNumber) {
                                          return `Project ${prevData.projectNumber}`;
                                        }
                                      } catch (e) {
                                        // Ignore parsing errors
                                      }

                                      return 'System';
                                    })()}
                                  </div>
                                  {log.entityName && (
                                    <div className="text-xs text-muted-foreground">{log.entityName}</div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="max-w-xs">
                                    <div className="text-sm">{log.details}</div>
                                    {log.changes && (
                                      <div className="text-xs text-muted-foreground mt-1">
                                        Changes: {Object.keys(JSON.parse(log.changes || '{}')).join(', ')}
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">{new Date(log.timestamp).toLocaleDateString()}</div>
                                  <div className="text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleTimeString()}</div>
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

          {/* External Connections Tab */}
          <TabsContent value="externalConnections" className="space-y-6">
            <ExternalConnectionsManager />
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
                          <h3 className="text-lg font-semibold">{storageInfo ? storageInfo.totalStorageUsed : 28}</h3>
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