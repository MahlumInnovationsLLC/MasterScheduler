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
import { useMutation } from "@tanstack/react-query";
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
import { useQuery as tanstackUseQuery, useQueryClient } from '@tanstack/react-query';

// Define the role permission types
interface ModulePermission {
  dashboard: boolean;
  projects: boolean;
  manufacturing: boolean;
  billing: boolean;
  reports: boolean;
  calendar: boolean;
  systemSettings?: boolean;
  userManagement?: boolean;
  accessControl?: boolean;
}

interface ActionPermission {
  export: boolean;
  import?: boolean;
  createProject?: boolean;
  editProject?: boolean;
  deleteProject?: boolean;
  createSchedule?: boolean;
  modifySchedule?: boolean;
  comment: boolean;
  receiveNotifications: boolean;
  printReports: boolean;
  createBays?: boolean;
  systemBackup?: boolean;
  archiveUsers?: boolean;
  dataReset?: boolean;
}

interface RolePermissions {
  modules: ModulePermission;
  actions: ActionPermission;
}

const SystemSettings = () => {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingMilestones, setIsDeletingMilestones] = useState(false);
  const [isMovingProjects, setIsMovingProjects] = useState(false);
  const [isRestoringProject, setIsRestoringProject] = useState(false);
  const [isArchivingUser, setIsArchivingUser] = useState(false);
  const [deleteResult, setDeleteResult] = useState<{
    success: boolean;
    message: string;
    totalDeleted?: number;
  } | null>(null);
  
  // We'll use the auth hook for user information
  const { user, isLoading: authLoading } = useAuth();
  
  // Role permissions state
  const [viewerPermissions, setViewerPermissions] = useState<RolePermissions>({
    modules: {
      dashboard: true,
      projects: true,
      manufacturing: true,
      billing: true,
      reports: true,
      calendar: true
    },
    actions: {
      export: true,
      comment: true,
      receiveNotifications: true,
      printReports: true
    }
  });
  
  const [editorPermissions, setEditorPermissions] = useState<RolePermissions>({
    modules: {
      dashboard: true,
      projects: true,
      manufacturing: true,
      billing: true,
      reports: true,
      calendar: true
    },
    actions: {
      export: true,
      import: true,
      createProject: true,
      editProject: true,
      deleteProject: true,
      createSchedule: true,
      modifySchedule: true,
      comment: true,
      receiveNotifications: true,
      printReports: true,
      createBays: true
    }
  });
  
  const [adminPermissions, setAdminPermissions] = useState<RolePermissions>({
    modules: {
      dashboard: true,
      projects: true,
      manufacturing: true,
      billing: true,
      reports: true,
      calendar: true,
      systemSettings: true,
      userManagement: true,
      accessControl: true
    },
    actions: {
      export: true,
      import: true,
      createProject: true,
      editProject: true,
      deleteProject: true,
      createSchedule: true,
      modifySchedule: true,
      comment: true,
      receiveNotifications: true,
      printReports: true,
      createBays: true,
      systemBackup: true,
      archiveUsers: true,
      dataReset: true
    }
  });
  
  // Loading states for permissions
  const [savingViewerPermissions, setSavingViewerPermissions] = useState(false);
  const [savingEditorPermissions, setSavingEditorPermissions] = useState(false);
  const [savingAdminPermissions, setSavingAdminPermissions] = useState(false);
  
  // Query for existing role permissions
  const {
    data: rolePermissions,
    isLoading: permissionsLoading,
    refetch: refetchPermissions
  } = tanstackUseQuery({
    queryKey: ['/api/role-permissions'],
    enabled: !!user && user.role === 'admin'
  });
  
  // Handle updating module permissions
  const handleModulePermissionChange = (role: 'viewer' | 'editor' | 'admin', module: keyof ModulePermission, value: boolean) => {
    if (role === 'viewer') {
      setViewerPermissions(prev => ({
        ...prev,
        modules: {
          ...prev.modules,
          [module]: value
        }
      }));
    } else if (role === 'editor') {
      setEditorPermissions(prev => ({
        ...prev,
        modules: {
          ...prev.modules,
          [module]: value
        }
      }));
    } else if (role === 'admin') {
      setAdminPermissions(prev => ({
        ...prev,
        modules: {
          ...prev.modules,
          [module]: value
        }
      }));
    }
  };
  
  // Handle updating action permissions
  const handleActionPermissionChange = (role: 'viewer' | 'editor' | 'admin', action: keyof ActionPermission, value: boolean) => {
    if (role === 'viewer') {
      setViewerPermissions(prev => ({
        ...prev,
        actions: {
          ...prev.actions,
          [action]: value
        }
      }));
    } else if (role === 'editor') {
      setEditorPermissions(prev => ({
        ...prev,
        actions: {
          ...prev.actions,
          [action]: value
        }
      }));
    } else if (role === 'admin') {
      setAdminPermissions(prev => ({
        ...prev,
        actions: {
          ...prev.actions,
          [action]: value
        }
      }));
    }
  };
  
  // Handle saving permissions for a specific role
  const handleSavePermissions = async (role: 'viewer' | 'editor' | 'admin') => {
    try {
      let permissionsData;
      let setLoading;
      
      if (role === 'viewer') {
        permissionsData = viewerPermissions;
        setLoading = setSavingViewerPermissions;
      } else if (role === 'editor') {
        permissionsData = editorPermissions;
        setLoading = setSavingEditorPermissions;
      } else {
        permissionsData = adminPermissions;
        setLoading = setSavingAdminPermissions;
      }
      
      setLoading(true);
      
      const response = await apiRequest('PUT', `/api/role-permissions/${role}`, permissionsData);
      
      if (response.ok) {
        toast({
          title: "Permissions Updated",
          description: `${role.charAt(0).toUpperCase() + role.slice(1)} role permissions have been updated successfully.`,
          variant: "default"
        });
        await refetchPermissions();
      } else {
        const error = await response.json();
        throw new Error(error.message || `Failed to update ${role} permissions`);
      }
    } catch (error) {
      toast({
        title: "Update Failed",
        description: `Error updating permissions: ${(error as Error).message}`,
        variant: "destructive"
      });
    } finally {
      if (role === 'viewer') {
        setSavingViewerPermissions(false);
      } else if (role === 'editor') {
        setSavingEditorPermissions(false);
      } else {
        setSavingAdminPermissions(false);
      }
    }
  };

  // Effect to handle fetching and setting permissions data
  useEffect(() => {
    if (user?.role === 'admin') {
      // Initialize with default permissions
      const fetchRolePermissions = async () => {
        try {
          const response = await fetch('/api/role-permissions');
          
          if (response.ok) {
            const data = await response.json();
            
            if (data?.viewer) {
              setViewerPermissions(data.viewer);
            }
            if (data?.editor) {
              setEditorPermissions(data.editor);
            }
            if (data?.admin) {
              setAdminPermissions(data.admin);
            }
          }
        } catch (error) {
          console.error('Error fetching role permissions:', error);
        }
      };
      
      fetchRolePermissions();
    }
  }, [user]);

  // User audit logs query
  const {
    data: userAuditLogs = [],
    isLoading: userAuditLogsLoading,
    error: userAuditLogsError
  } = tanstackUseQuery({
    queryKey: ['/api/user-audit-logs'],
    queryFn: getQueryFn({})
  });

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
  
  // Function to handle deletion of all billing milestones
  const handleDeleteAllBillingMilestones = async () => {
    try {
      setIsDeletingMilestones(true);
      
      const response = await apiRequest("DELETE", "/api/billing-milestones/delete-all", {});
      
      if (response.ok) {
        const result = await response.json();
        
        toast({
          title: "Success!",
          description: `All billing milestones have been deleted. ${result.count || 0} entries removed.`,
          variant: "default",
        });
        
        // Update the UI by invalidating the billing milestones query
        queryClient.invalidateQueries({ queryKey: ['/api/billing-milestones'] });
      } else {
        let errorMessage = "Failed to delete billing milestones. Please try again.";
        
        try {
          const errorResponse = await response.json();
          if (errorResponse.message) {
            errorMessage = errorResponse.message;
          }
        } catch (e) {
          // If response is not JSON, get text
          const errorText = await response.text();
          console.error("Error response (text):", errorText);
        }
        
        toast({
          title: "Operation Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Operation Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      console.error("Error deleting billing milestones:", error);
    } finally {
      setIsDeletingMilestones(false);
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
  } = tanstackUseQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: !!user && user.role === 'admin',
  });
  
  // Query for allowed emails
  const { 
    data: allowedEmails = [] as AllowedEmail[], 
    isLoading: allowedEmailsLoading,
    error: allowedEmailsError 
  } = tanstackUseQuery<AllowedEmail[]>({
    queryKey: ['/api/allowed-emails'],
    enabled: !!user && user.role === 'admin',
  });
  
  // Mutation for updating user roles and preferences
  const updateUserMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Mutation sending data:", data);
      const response = await apiRequest('PUT', `/api/users/${data.id}/role`, {
        role: data.role, 
        isApproved: data.isApproved,
        status: data.status || 'active',
        preferences: data.preferences || {}
      });
      console.log("Response from server:", response);
      return response;
    }
  });
  
  // Mutation for creating allowed email patterns
  const createAllowedEmailMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/allowed-emails', data);
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
      return await apiRequest('PUT', `/api/allowed-emails/${data.id}`, { 
        emailPattern: data.emailPattern, 
        autoApprove: data.autoApprove, 
        defaultRole: data.defaultRole 
      });
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
      return await apiRequest('DELETE', `/api/allowed-emails/${id}`);
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
  
  // Mutation for archiving users
  const archiveUserMutation = useMutation({
    mutationFn: async (data: { userId: string, reason: string }) => {
      return await apiRequest(
        "PUT", 
        `/api/users/${data.userId}/archive`,
        { reason: data.reason }
      );
    },
    onSuccess: () => {
      toast({
        title: "User Archived",
        description: "User has been archived successfully.",
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user-audit-logs'] });
    },
    onError: (error: any) => {
      toast({
        title: "Archive Failed",
        description: `Error archiving user: ${error.message}`,
        variant: "destructive"
      });
    },
    onSettled: () => {
      setIsArchivingUser(false);
    }
  });
  
  // State for archive reason dialog
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [archiveReason, setArchiveReason] = useState("");
  const [userToArchive, setUserToArchive] = useState<string | null>(null);

  // Function to open the archive reason dialog
  const handleArchiveUser = (userId: string) => {
    setUserToArchive(userId);
    setArchiveReason("");
    setShowArchiveDialog(true);
  };

  // Function to submit the archive request with reason
  const submitArchiveUser = () => {
    if (!userToArchive) return;
    
    if (!archiveReason.trim()) {
      toast({
        title: "Validation Error",
        description: "A reason for archiving the user is required",
        variant: "destructive"
      });
      return;
    }
    
    setIsArchivingUser(true);
    archiveUserMutation.mutate({ 
      userId: userToArchive, 
      reason: archiveReason 
    });
    setShowArchiveDialog(false);
  };
  
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
    
    // Prepare preferences data with defaults
    const preferences = {
      department: editingUser.preferences?.department || '',
      notifyBillingUpdates: editingUser.preferences?.notifyBillingUpdates !== false,
      notifyProjectUpdates: editingUser.preferences?.notifyProjectUpdates !== false,
      notifyManufacturingUpdates: editingUser.preferences?.notifyManufacturingUpdates !== false,
      notifySystemUpdates: editingUser.preferences?.notifySystemUpdates !== false
    };
    
    // Log the data being sent for debugging
    console.log("Updating user with data:", {
      id: editingUser.id,
      role: editingUser.role,
      status: editingUser.status || 'active',
      isApproved: editingUser.isApproved,
      preferences
    });
    
    // Save the changes and close the dialog
    updateUserMutation.mutate({
      id: editingUser.id,
      role: editingUser.role,
      status: editingUser.status || 'active',
      isApproved: editingUser.isApproved,
      preferences
    }, {
      onSuccess: () => {
        toast({
          title: "User Updated",
          description: "User settings have been updated successfully.",
          variant: "default"
        });
        queryClient.invalidateQueries({ queryKey: ['/api/users'] });
        setEditingUser(null);
      }
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
  
  // Function to handle moving all projects to unassigned
  const handleMoveAllProjectsToUnassigned = async () => {
    if (!window.confirm("⚠️ IMPORTANT: This will reset ALL bay assignments and move ALL projects to the Unassigned section.\n\nThis action cannot be undone. Continue?")) {
      return;
    }
    
    try {
      setIsMovingProjects(true);
      const response = await apiRequest("POST", "/api/manufacturing-schedules/clear-all", {});
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success) {
          toast({
            title: "Success!",
            description: result.message || "Projects moved to Unassigned section.",
            variant: "default",
          });
          
          // Update the UI
          queryClient.invalidateQueries({ queryKey: ['/api/manufacturing-schedules'] });
          queryClient.invalidateQueries({ queryKey: ['/api/manufacturing-bays'] });
          queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
        } else {
          toast({
            title: "Operation Failed",
            description: result.message || "Failed to move projects to Unassigned section.",
            variant: "destructive",
          });
        }
      } else {
        let errorMessage = "Failed to move projects to Unassigned section. Please try again.";
        
        try {
          const errorResponse = await response.json();
          if (errorResponse.message) {
            errorMessage = errorResponse.message;
          }
        } catch (e) {
          // If response is not JSON, get text
          const errorText = await response.text();
          console.error("Error response (text):", errorText);
        }
        
        toast({
          title: "Operation Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Operation Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      console.error("Error clearing manufacturing schedules:", error);
    } finally {
      setIsMovingProjects(false);
    }
  };
  
  // Query for archived projects
  const { 
    data: archivedProjects = [], 
    isLoading: archivedProjectsLoading,
    error: archivedProjectsError 
  } = tanstackUseQuery({
    queryKey: ['/api/archived-projects'],
    enabled: !!user && user.role === 'admin',
  });
  
  // Function to handle restoring an archived project
  const handleRestoreProject = async (projectId: number) => {
    if (!window.confirm("Are you sure you want to restore this project? It will be moved back to active projects.")) {
      return;
    }
    
    try {
      setIsRestoringProject(true);
      const response = await apiRequest("PUT", `/api/projects/${projectId}/restore`, {});
      
      if (response.ok) {
        toast({
          title: "Success!",
          description: "Project has been restored successfully.",
          variant: "default",
        });
        
        // Update the UI
        queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
        queryClient.invalidateQueries({ queryKey: ['/api/archived-projects'] });
      } else {
        let errorMessage = "Failed to restore project. Please try again.";
        
        try {
          const errorResponse = await response.json();
          if (errorResponse.message) {
            errorMessage = errorResponse.message;
          }
        } catch (e) {
          const errorText = await response.text();
          console.error("Error response (text):", errorText);
        }
        
        toast({
          title: "Operation Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Operation Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      console.error("Error restoring project:", error);
    } finally {
      setIsRestoringProject(false);
    }
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
      {/* Archive User Dialog */}
      <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive User</DialogTitle>
            <DialogDescription>
              Provide a reason for archiving this user. They will no longer be able to access the system.
              This action is tracked for audit purposes.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="archiveReason">Reason for Archiving</Label>
              <textarea
                id="archiveReason"
                className="w-full min-h-[100px] px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Please provide a reason for archiving this user"
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowArchiveDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={submitArchiveUser} 
              disabled={isArchivingUser || !archiveReason.trim()}
              className={!archiveReason.trim() ? "opacity-50 cursor-not-allowed" : ""}
            >
              {isArchivingUser ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-b-2 border-white rounded-full" />
                  Archiving...
                </>
              ) : (
                "Archive User"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
          <TabsList className="grid grid-cols-5 w-[750px]">
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="userHistory">User History</TabsTrigger>
            <TabsTrigger value="access">Access Control</TabsTrigger>
            <TabsTrigger value="system">Data Management</TabsTrigger>
            <TabsTrigger value="archived">Archived Projects</TabsTrigger>
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
                            <div className="flex flex-col gap-1">
                              {user.isApproved ? (
                                <Badge variant="outline" className="bg-green-950 text-white border border-green-600 font-medium">
                                  Approved
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-yellow-950 text-white border border-yellow-600 font-medium">
                                  Pending
                                </Badge>
                              )}
                              {user.status && (
                                <Badge 
                                  variant="outline" 
                                  className={`font-medium ${
                                    user.status === 'active' 
                                      ? 'bg-blue-950 text-white border border-blue-600' 
                                      : user.status === 'inactive' 
                                        ? 'bg-gray-950 text-white border border-gray-600' 
                                        : 'bg-red-950 text-white border border-red-600'
                                  }`}
                                >
                                  {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
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
                                      
                                      <div className="space-y-2">
                                        <Label htmlFor="status">Status</Label>
                                        <Select 
                                          value={editingUser.status || 'active'} 
                                          onValueChange={value => setEditingUser({...editingUser, status: value})}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select status" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="inactive">Inactive</SelectItem>
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
                                      
                                      <div className="space-y-2">
                                        <Label htmlFor="department">Department</Label>
                                        <Select 
                                          value={editingUser.preferences?.department || ''}
                                          onValueChange={value => {
                                            console.log(`Changing department to: ${value}`);
                                            // Create a complete copy of editingUser to avoid reference issues
                                            const updatedUser = JSON.parse(JSON.stringify(editingUser));
                                            // Ensure preferences object exists
                                            updatedUser.preferences = updatedUser.preferences || {};
                                            // Set the department value
                                            updatedUser.preferences.department = value;
                                            // Update the state with the modified copy
                                            setEditingUser(updatedUser);
                                          }}
                                        >
                                          <SelectTrigger>
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
                                            <SelectItem value="other">Other</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      
                                      <div className="space-y-4 mt-6">
                                        <h4 className="font-medium text-sm">Notification Preferences</h4>
                                        <div className="space-y-2 border border-gray-700 rounded-md p-4">
                                          <div className="flex items-center justify-between">
                                            <div>
                                              <Label className="text-sm font-medium" htmlFor="notifyBilling">Billing Updates</Label>
                                              <p className="text-xs text-muted-foreground">Receive updates about billing milestones and financial changes</p>
                                            </div>
                                            <Switch 
                                              id="notifyBilling" 
                                              checked={editingUser.preferences?.notifyBillingUpdates !== false}
                                              onCheckedChange={checked => setEditingUser({
                                                ...editingUser, 
                                                preferences: {
                                                  ...editingUser.preferences || {},
                                                  notifyBillingUpdates: checked
                                                }
                                              })}
                                            />
                                          </div>
                                          
                                          <Separator className="my-2" />
                                          
                                          <div className="flex items-center justify-between">
                                            <div>
                                              <Label className="text-sm font-medium" htmlFor="notifyProject">Project Updates</Label>
                                              <p className="text-xs text-muted-foreground">Receive updates about project status changes and deadlines</p>
                                            </div>
                                            <Switch 
                                              id="notifyProject" 
                                              checked={editingUser.preferences?.notifyProjectUpdates !== false}
                                              onCheckedChange={checked => setEditingUser({
                                                ...editingUser, 
                                                preferences: {
                                                  ...editingUser.preferences || {},
                                                  notifyProjectUpdates: checked
                                                }
                                              })}
                                            />
                                          </div>
                                          
                                          <Separator className="my-2" />
                                          
                                          <div className="flex items-center justify-between">
                                            <div>
                                              <Label className="text-sm font-medium" htmlFor="notifyManufacturing">Manufacturing Updates</Label>
                                              <p className="text-xs text-muted-foreground">Receive updates about manufacturing schedules and bay assignments</p>
                                            </div>
                                            <Switch 
                                              id="notifyManufacturing" 
                                              checked={editingUser.preferences?.notifyManufacturingUpdates !== false}
                                              onCheckedChange={checked => setEditingUser({
                                                ...editingUser, 
                                                preferences: {
                                                  ...editingUser.preferences || {},
                                                  notifyManufacturingUpdates: checked
                                                }
                                              })}
                                            />
                                          </div>
                                          
                                          <Separator className="my-2" />
                                          
                                          <div className="flex items-center justify-between">
                                            <div>
                                              <Label className="text-sm font-medium" htmlFor="notifySystem">System Updates</Label>
                                              <p className="text-xs text-muted-foreground">Receive important system notifications and announcements</p>
                                            </div>
                                            <Switch 
                                              id="notifySystem" 
                                              checked={editingUser.preferences?.notifySystemUpdates !== false}
                                              onCheckedChange={checked => setEditingUser({
                                                ...editingUser, 
                                                preferences: {
                                                  ...editingUser.preferences || {},
                                                  notifySystemUpdates: checked
                                                }
                                              })}
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  
                                  <DialogFooter>
                                    <Button variant="outline" onClick={() => setEditingUser(null)}>
                                      Cancel
                                    </Button>
                                    <Button 
                                      type="button"
                                      onClick={() => {
                                        // First, force the dialog to close immediately
                                        const userToUpdate = {...editingUser};
                                        setEditingUser(null);
                                        
                                        // Show an immediate success message
                                        toast({
                                          title: "Saving...",
                                          description: "Updating user settings and preferences",
                                          variant: "default"
                                        });
                                        
                                        // Now perform the update in the background
                                        updateUserMutation.mutate({
                                          id: userToUpdate.id,
                                          role: userToUpdate.role,
                                          status: userToUpdate.status || 'active',
                                          isApproved: userToUpdate.isApproved,
                                          preferences: userToUpdate.preferences || {}
                                        }, {
                                          onSuccess: () => {
                                            toast({
                                              title: "Success",
                                              description: "User settings have been updated successfully.",
                                              variant: "default"
                                            });
                                            queryClient.invalidateQueries({ queryKey: ['/api/users'] });
                                          },
                                          onError: (error: any) => {
                                            toast({
                                              title: "Update Failed",
                                              description: error.message || "Failed to update user settings",
                                              variant: "destructive"
                                            });
                                          }
                                        });
                                      }} 
                                      disabled={updateUserMutation.isPending}
                                    >
                                      {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                              
                              {/* Archive User Button */}
                              <Button 
                                variant="ghost"
                                size="icon"
                                className="text-red-500 hover:text-red-700"
                                disabled={user.status === 'archived'}
                                onClick={() => handleArchiveUser(user.id)}
                              >
                                <UserX className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* User History Tab */}
          <TabsContent value="userHistory" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Audit History</CardTitle>
                <CardDescription>
                  View a history of user management actions for auditing purposes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {userAuditLogsLoading ? (
                  <div className="flex justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : userAuditLogsError ? (
                  <Alert className="bg-destructive/20 border-destructive">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                      {(userAuditLogsError as Error).message || "Failed to load user audit logs"}
                    </AlertDescription>
                  </Alert>
                ) : userAuditLogs.length === 0 ? (
                  <div className="text-center p-6 text-gray-500">
                    No user audit logs found.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date/Time</TableHead>
                        <TableHead>Performed By</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Target User</TableHead>
                        <TableHead>Changes / Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userAuditLogs.map((log: any) => {
                        // Parse JSON data for detailed changes
                        let previousData = null;
                        let newData = null;
                        
                        try {
                          if (log.previousData) {
                            previousData = JSON.parse(log.previousData);
                          }
                        } catch (e) {
                          console.error("Error parsing previousData:", e);
                        }
                        
                        try {
                          if (log.newData) {
                            newData = JSON.parse(log.newData);
                          }
                        } catch (e) {
                          console.error("Error parsing newData:", e);
                        }
                        
                        // Format change details
                        let changeDetails = [];
                        if (previousData && newData) {
                          if (previousData.status !== undefined && newData.status !== undefined) {
                            changeDetails.push(`Status: ${previousData.status} → ${newData.status}`);
                          }
                          
                          if (previousData.role !== undefined && newData.role !== undefined && 
                              previousData.role !== newData.role) {
                            changeDetails.push(`Role: ${previousData.role} → ${newData.role}`);
                          }
                          
                          if (previousData.isApproved !== undefined && newData.isApproved !== undefined && 
                              previousData.isApproved !== newData.isApproved) {
                            changeDetails.push(`Approval: ${previousData.isApproved ? 'Approved' : 'Not Approved'} → ${newData.isApproved ? 'Approved' : 'Not Approved'}`);
                          }
                        }
                        
                        return (
                          <TableRow key={log.id}>
                            <TableCell>
                              {new Date(log.timestamp).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                {log.performedBy}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline" 
                                className={
                                  log.action === 'STATUS_CHANGE' || log.action === 'archive'
                                    ? 'bg-red-950 text-white border border-red-600'
                                    : log.action === 'update'
                                      ? 'bg-blue-950 text-white border border-blue-600'
                                      : 'bg-green-950 text-white border border-green-600'
                                }
                              >
                                {log.action === 'STATUS_CHANGE' ? 'Status Change' : 
                                  log.action.charAt(0).toUpperCase() + log.action.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell>{log.userId}</TableCell>
                            <TableCell>
                              <div className="max-w-xs">
                                {changeDetails.length > 0 ? (
                                  <div className="flex flex-col gap-1">
                                    {changeDetails.map((detail, idx) => (
                                      <div key={idx} className="text-xs">
                                        {detail}
                                      </div>
                                    ))}
                                    {log.details && (
                                      <div className="text-xs mt-1 italic">
                                        Reason: {log.details}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  log.details || "No details provided"
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
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
                <CardTitle>Role Permission Management</CardTitle>
                <CardDescription>
                  Configure permissions for each user role in the system. Changes will automatically apply to all users with that role.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Role permission configuration section */}
                  <Tabs defaultValue="viewer" className="w-full">
                    <TabsList className="grid grid-cols-3 w-[400px] mb-6">
                      <TabsTrigger value="viewer">Viewer</TabsTrigger>
                      <TabsTrigger value="editor">Editor</TabsTrigger>
                      <TabsTrigger value="admin">Administrator</TabsTrigger>
                    </TabsList>
                    
                    {/* Viewer Permissions */}
                    <TabsContent value="viewer" className="border rounded-lg p-4 border-border">
                      <h3 className="text-lg font-medium mb-4">Viewer Role Permissions</h3>
                      <p className="text-sm text-gray-500 mb-4">
                        Configure what users with the Viewer role can access and do in the system.
                      </p>
                      
                      {permissionsLoading ? (
                        <div className="flex justify-center p-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {/* Module Access */}
                          <div className="space-y-3">
                            <h4 className="font-semibold text-primary">Module Access</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="flex items-center justify-between p-3 border rounded-md">
                                <div>
                                  <Label htmlFor="viewer-dashboard">Dashboard</Label>
                                  <p className="text-xs text-gray-500">View main dashboard and metrics</p>
                                </div>
                                <Switch 
                                  id="viewer-dashboard" 
                                  checked={viewerPermissions.modules.dashboard}
                                  onCheckedChange={(checked) => handleModulePermissionChange('viewer', 'dashboard', checked)}
                                />
                              </div>
                              <div className="flex items-center justify-between p-3 border rounded-md">
                                <div>
                                  <Label htmlFor="viewer-projects">Projects</Label>
                                  <p className="text-xs text-gray-500">View project details and status</p>
                                </div>
                                <Switch 
                                  id="viewer-projects" 
                                  checked={viewerPermissions.modules.projects}
                                  onCheckedChange={(checked) => handleModulePermissionChange('viewer', 'projects', checked)}
                                />
                              </div>
                              <div className="flex items-center justify-between p-3 border rounded-md">
                                <div>
                                  <Label htmlFor="viewer-manufacturing">Manufacturing</Label>
                                  <p className="text-xs text-gray-500">View manufacturing schedules</p>
                                </div>
                                <Switch 
                                  id="viewer-manufacturing" 
                                  checked={viewerPermissions.modules.manufacturing}
                                  onCheckedChange={(checked) => handleModulePermissionChange('viewer', 'manufacturing', checked)}
                                />
                              </div>
                              <div className="flex items-center justify-between p-3 border rounded-md">
                                <div>
                                  <Label htmlFor="viewer-billing">Billing</Label>
                                  <p className="text-xs text-gray-500">View billing milestones</p>
                                </div>
                                <Switch 
                                  id="viewer-billing" 
                                  checked={viewerPermissions.modules.billing}
                                  onCheckedChange={(checked) => handleModulePermissionChange('viewer', 'billing', checked)}
                                />
                              </div>
                              <div className="flex items-center justify-between p-3 border rounded-md">
                                <div>
                                  <Label htmlFor="viewer-reports">Reports</Label>
                                  <p className="text-xs text-gray-500">Access to reporting features</p>
                                </div>
                                <Switch 
                                  id="viewer-reports" 
                                  checked={viewerPermissions.modules.reports}
                                  onCheckedChange={(checked) => handleModulePermissionChange('viewer', 'reports', checked)}
                                />
                              </div>
                              <div className="flex items-center justify-between p-3 border rounded-md">
                                <div>
                                  <Label htmlFor="viewer-calendar">Calendar</Label>
                                  <p className="text-xs text-gray-500">View scheduling calendar</p>
                                </div>
                                <Switch 
                                  id="viewer-calendar" 
                                  checked={viewerPermissions.modules.calendar}
                                  onCheckedChange={(checked) => handleModulePermissionChange('viewer', 'calendar', checked)}
                                />
                              </div>
                            </div>
                          </div>
                          
                          {/* Action Permissions */}
                          <div className="space-y-3">
                            <h4 className="font-semibold text-primary">Action Permissions</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="flex items-center justify-between p-3 border rounded-md">
                                <div>
                                  <Label htmlFor="viewer-export">Export Data</Label>
                                  <p className="text-xs text-gray-500">Export project and schedule data</p>
                                </div>
                                <Switch 
                                  id="viewer-export" 
                                  checked={viewerPermissions.actions.export}
                                  onCheckedChange={(checked) => handleActionPermissionChange('viewer', 'export', checked)}
                                />
                              </div>
                              <div className="flex items-center justify-between p-3 border rounded-md">
                                <div>
                                  <Label htmlFor="viewer-comment">Add Comments</Label>
                                  <p className="text-xs text-gray-500">Add comments to projects</p>
                                </div>
                                <Switch 
                                  id="viewer-comment" 
                                  checked={viewerPermissions.actions.comment}
                                  onCheckedChange={(checked) => handleActionPermissionChange('viewer', 'comment', checked)}
                                />
                              </div>
                              <div className="flex items-center justify-between p-3 border rounded-md">
                                <div>
                                  <Label htmlFor="viewer-notifications">Receive Notifications</Label>
                                  <p className="text-xs text-gray-500">Receive system notifications</p>
                                </div>
                                <Switch 
                                  id="viewer-notifications" 
                                  checked={viewerPermissions.actions.receiveNotifications}
                                  onCheckedChange={(checked) => handleActionPermissionChange('viewer', 'receiveNotifications', checked)}
                                />
                              </div>
                              <div className="flex items-center justify-between p-3 border rounded-md">
                                <div>
                                  <Label htmlFor="viewer-print">Print Reports</Label>
                                  <p className="text-xs text-gray-500">Generate and print reports</p>
                                </div>
                                <Switch 
                                  id="viewer-print" 
                                  checked={viewerPermissions.actions.printReports}
                                  onCheckedChange={(checked) => handleActionPermissionChange('viewer', 'printReports', checked)}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-6 flex justify-end">
                        <Button 
                          onClick={() => handleSavePermissions('viewer')}
                          disabled={savingViewerPermissions}
                        >
                          {savingViewerPermissions ? (
                            <>
                              <div className="animate-spin mr-2 h-4 w-4 border-2 border-b-transparent rounded-full"></div>
                              Saving...
                            </>
                          ) : (
                            "Save Viewer Permissions"
                          )}
                        </Button>
                      </div>
                    </TabsContent>
                    
                    {/* Editor Permissions */}
                    <TabsContent value="editor" className="border rounded-lg p-4 border-border">
                      <h3 className="text-lg font-medium mb-4">Editor Role Permissions</h3>
                      <p className="text-sm text-gray-500 mb-4">
                        Configure what users with the Editor role can access and do in the system.
                      </p>
                      
                      <div className="space-y-6">
                        {/* Module Access */}
                        <div className="space-y-3">
                          <h4 className="font-semibold text-primary">Module Access</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center justify-between p-3 border rounded-md">
                              <div>
                                <Label htmlFor="editor-dashboard">Dashboard</Label>
                                <p className="text-xs text-gray-500">View and customize dashboard</p>
                              </div>
                              <Switch id="editor-dashboard" defaultChecked />
                            </div>
                            <div className="flex items-center justify-between p-3 border rounded-md">
                              <div>
                                <Label htmlFor="editor-projects">Projects</Label>
                                <p className="text-xs text-gray-500">Edit project details and status</p>
                              </div>
                              <Switch id="editor-projects" defaultChecked />
                            </div>
                            <div className="flex items-center justify-between p-3 border rounded-md">
                              <div>
                                <Label htmlFor="editor-manufacturing">Manufacturing</Label>
                                <p className="text-xs text-gray-500">Modify manufacturing schedules</p>
                              </div>
                              <Switch id="editor-manufacturing" defaultChecked />
                            </div>
                            <div className="flex items-center justify-between p-3 border rounded-md">
                              <div>
                                <Label htmlFor="editor-billing">Billing</Label>
                                <p className="text-xs text-gray-500">Create and edit billing milestones</p>
                              </div>
                              <Switch id="editor-billing" defaultChecked />
                            </div>
                            <div className="flex items-center justify-between p-3 border rounded-md">
                              <div>
                                <Label htmlFor="editor-reports">Reports</Label>
                                <p className="text-xs text-gray-500">Create and edit reports</p>
                              </div>
                              <Switch id="editor-reports" defaultChecked />
                            </div>
                            <div className="flex items-center justify-between p-3 border rounded-md">
                              <div>
                                <Label htmlFor="editor-calendar">Calendar</Label>
                                <p className="text-xs text-gray-500">Modify scheduling calendar</p>
                              </div>
                              <Switch id="editor-calendar" defaultChecked />
                            </div>
                          </div>
                        </div>
                        
                        {/* Action Permissions */}
                        <div className="space-y-3">
                          <h4 className="font-semibold text-primary">Action Permissions</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center justify-between p-3 border rounded-md">
                              <div>
                                <Label htmlFor="editor-export">Export Data</Label>
                                <p className="text-xs text-gray-500">Export project and schedule data</p>
                              </div>
                              <Switch id="editor-export" defaultChecked />
                            </div>
                            <div className="flex items-center justify-between p-3 border rounded-md">
                              <div>
                                <Label htmlFor="editor-import">Import Data</Label>
                                <p className="text-xs text-gray-500">Import projects and schedules</p>
                              </div>
                              <Switch id="editor-import" defaultChecked />
                            </div>
                            <div className="flex items-center justify-between p-3 border rounded-md">
                              <div>
                                <Label htmlFor="editor-create-project">Create Projects</Label>
                                <p className="text-xs text-gray-500">Create new projects</p>
                              </div>
                              <Switch id="editor-create-project" defaultChecked />
                            </div>
                            <div className="flex items-center justify-between p-3 border rounded-md">
                              <div>
                                <Label htmlFor="editor-delete-project">Delete Projects</Label>
                                <p className="text-xs text-gray-500">Delete existing projects</p>
                              </div>
                              <Switch id="editor-delete-project" defaultChecked />
                            </div>
                            <div className="flex items-center justify-between p-3 border rounded-md">
                              <div>
                                <Label htmlFor="editor-schedule">Modify Schedules</Label>
                                <p className="text-xs text-gray-500">Change manufacturing schedules</p>
                              </div>
                              <Switch id="editor-schedule" defaultChecked />
                            </div>
                            <div className="flex items-center justify-between p-3 border rounded-md">
                              <div>
                                <Label htmlFor="editor-create-bay">Create Bays</Label>
                                <p className="text-xs text-gray-500">Create new manufacturing bays</p>
                              </div>
                              <Switch id="editor-create-bay" defaultChecked />
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-6 flex justify-end">
                        <Button>Save Editor Permissions</Button>
                      </div>
                    </TabsContent>
                    
                    {/* Admin Permissions */}
                    <TabsContent value="admin" className="border rounded-lg p-4 border-border">
                      <h3 className="text-lg font-medium mb-4">Administrator Role Permissions</h3>
                      <p className="text-sm text-gray-500 mb-4">
                        Configure what users with the Administrator role can access and do in the system.
                      </p>
                      
                      <div className="space-y-6">
                        {/* Module Access */}
                        <div className="space-y-3">
                          <h4 className="font-semibold text-primary">Module Access</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center justify-between p-3 border rounded-md">
                              <div>
                                <Label htmlFor="admin-system-settings">System Settings</Label>
                                <p className="text-xs text-gray-500">Access and modify system settings</p>
                              </div>
                              <Switch id="admin-system-settings" defaultChecked disabled />
                              <p className="text-xs text-gray-500">Always enabled for admin</p>
                            </div>
                            <div className="flex items-center justify-between p-3 border rounded-md">
                              <div>
                                <Label htmlFor="admin-user-management">User Management</Label>
                                <p className="text-xs text-gray-500">Manage user accounts</p>
                              </div>
                              <Switch id="admin-user-management" defaultChecked disabled />
                              <p className="text-xs text-gray-500">Always enabled for admin</p>
                            </div>
                            <div className="flex items-center justify-between p-3 border rounded-md">
                              <div>
                                <Label htmlFor="admin-access-control">Access Control</Label>
                                <p className="text-xs text-gray-500">Manage roles and permissions</p>
                              </div>
                              <Switch id="admin-access-control" defaultChecked disabled />
                              <p className="text-xs text-gray-500">Always enabled for admin</p>
                            </div>
                            <div className="flex items-center justify-between p-3 border rounded-md">
                              <div>
                                <Label htmlFor="admin-data-import">Data Import/Export</Label>
                                <p className="text-xs text-gray-500">Perform system-wide imports/exports</p>
                              </div>
                              <Switch id="admin-data-import" defaultChecked />
                            </div>
                            <div className="flex items-center justify-between p-3 border rounded-md">
                              <div>
                                <Label htmlFor="admin-system-utilities">System Utilities</Label>
                                <p className="text-xs text-gray-500">Access system maintenance tools</p>
                              </div>
                              <Switch id="admin-system-utilities" defaultChecked />
                            </div>
                            <div className="flex items-center justify-between p-3 border rounded-md">
                              <div>
                                <Label htmlFor="admin-billing-management">Billing Management</Label>
                                <p className="text-xs text-gray-500">Advanced billing system controls</p>
                              </div>
                              <Switch id="admin-billing-management" defaultChecked />
                            </div>
                          </div>
                        </div>
                        
                        {/* Action Permissions */}
                        <div className="space-y-3">
                          <h4 className="font-semibold text-primary">Action Permissions</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center justify-between p-3 border rounded-md">
                              <div>
                                <Label htmlFor="admin-system-backup">System Backup</Label>
                                <p className="text-xs text-gray-500">Create system backups</p>
                              </div>
                              <Switch id="admin-system-backup" defaultChecked />
                            </div>
                            <div className="flex items-center justify-between p-3 border rounded-md">
                              <div>
                                <Label htmlFor="admin-user-archive">Archive Users</Label>
                                <p className="text-xs text-gray-500">Archive user accounts</p>
                              </div>
                              <Switch id="admin-user-archive" defaultChecked />
                            </div>
                            <div className="flex items-center justify-between p-3 border rounded-md">
                              <div>
                                <Label htmlFor="admin-global-settings">Global Settings</Label>
                                <p className="text-xs text-gray-500">Modify global system parameters</p>
                              </div>
                              <Switch id="admin-global-settings" defaultChecked />
                            </div>
                            <div className="flex items-center justify-between p-3 border rounded-md">
                              <div>
                                <Label htmlFor="admin-data-reset">Data Reset Operations</Label>
                                <p className="text-xs text-gray-500">Perform system data reset</p>
                              </div>
                              <Switch id="admin-data-reset" defaultChecked />
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-6 flex justify-end">
                        <Button>Save Administrator Permissions</Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
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
                  
                  {/* Data Management Section */}
                  <div className="border border-red-600/20 rounded-lg p-4 bg-red-500/5">
                    <h3 className="font-semibold text-lg mb-2 flex items-center">
                      <Trash2 className="mr-2 h-5 w-5 text-red-500" />
                      Data Maintenance
                    </h3>
                    <p className="text-sm mb-4 text-gray-300">
                      These actions perform permanent data deletion operations. Use with caution.
                    </p>
                    
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">Delete All Billing Milestones</p>
                        <p className="text-sm text-gray-400">
                          Permanently deletes all billing milestones from the system. This action cannot be undone.
                        </p>
                      </div>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="destructive" 
                            className="flex items-center"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete All Milestones
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete All Billing Milestones</AlertDialogTitle>
                            <AlertDialogDescription>
                              <p>This action will permanently delete ALL billing milestones in the system and cannot be undone.</p>
                              <div className="mt-4 bg-red-500/10 p-3 rounded border border-red-500/20">
                                <ul className="list-disc pl-5 space-y-1 text-sm">
                                  <li>All milestone data will be permanently lost</li>
                                  <li>Projects will no longer have financial data associated</li>
                                  <li>You will need to re-import or manually recreate billing milestones</li>
                                </ul>
                              </div>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleDeleteAllBillingMilestones}
                              disabled={isDeletingMilestones}
                              className="bg-red-500 text-white hover:bg-red-600"
                            >
                              {isDeletingMilestones ? "Deleting..." : "Yes, Delete All Milestones"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  
                  {/* Manufacturing Management Section */}
                  <div className="border border-yellow-600/20 rounded-lg p-4 bg-yellow-500/5">
                    <h3 className="font-semibold text-lg mb-2 flex items-center">
                      <RefreshCw className="mr-2 h-5 w-5 text-yellow-500" />
                      Manufacturing Management
                    </h3>
                    <p className="text-sm mb-4 text-gray-300">
                      Operations that affect the manufacturing scheduling system.
                    </p>
                    
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">Reset Bay Assignments</p>
                        <p className="text-sm text-gray-400">
                          Move all projects to the Unassigned section and clear all bay assignments.
                        </p>
                      </div>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" className="flex items-center border-yellow-500 text-yellow-500 hover:bg-yellow-500/10">
                            <MoveRight className="mr-2 h-4 w-4" />
                            Move All Projects to Unassigned
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will reset ALL bay assignments and move ALL projects to the Unassigned section.
                              This action cannot be undone and will affect all production planning.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleMoveAllProjectsToUnassigned}
                              disabled={isMovingProjects}
                              className="bg-yellow-600 text-white hover:bg-yellow-700"
                            >
                              {isMovingProjects ? "Processing..." : "Yes, Move All Projects"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
                    
                    <div className="flex justify-between items-center mb-6">
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
                    
                    {/* Delete All Billing Milestones */}
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">Delete All Billing Milestones</p>
                        <p className="text-sm text-gray-400">
                          This will remove all billing milestones from the system. This is useful for clearing duplicate entries after imports.
                        </p>
                      </div>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" className="flex items-center">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete All Milestones
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete ALL billing milestones 
                              from the database. You will need to reimport them after this operation.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleDeleteAllBillingMilestones}
                              disabled={isDeletingMilestones}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {isDeletingMilestones ? "Deleting..." : "Yes, Delete All Milestones"}
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
          
          {/* Archived Projects Tab */}
          <TabsContent value="archived" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Archived Projects</CardTitle>
                <CardDescription>
                  View and restore previously archived projects.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {archivedProjectsLoading ? (
                  <div className="flex justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : archivedProjectsError ? (
                  <Alert className="bg-destructive/20 border-destructive">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                      {(archivedProjectsError as Error).message || "Failed to load archived projects"}
                    </AlertDescription>
                  </Alert>
                ) : archivedProjects.length === 0 ? (
                  <div className="text-center p-6 space-y-2">
                    <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <ArchiveRestore className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-medium">No Archived Projects</h3>
                    <p className="text-sm text-gray-400">
                      There are no archived projects in the system.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Project Number</TableHead>
                        <TableHead>Project Name</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Archived Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {archivedProjects.map((project: any) => (
                        <TableRow key={project.id} className="hover:bg-primary/5">
                          <TableCell className="font-medium">{project.projectNumber}</TableCell>
                          <TableCell>{project.name}</TableCell>
                          <TableCell>{project.client || 'N/A'}</TableCell>
                          <TableCell>
                            {project.archivedAt ? new Date(project.archivedAt).toLocaleString() : 'Unknown'}
                          </TableCell>
                          <TableCell className="text-right">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="hover:text-primary"
                                >
                                  <ArrowUpCircle className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Restore Project</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to restore "{project.name}" (#{project.projectNumber})?
                                    This will move the project back to active status.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleRestoreProject(project.id)}
                                    disabled={isRestoringProject}
                                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                                  >
                                    {isRestoringProject ? "Restoring..." : "Restore Project"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default SystemSettings;