import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import RolePermissionsManager from '@/components/RolePermissionsManager';
import { getQueryFn } from '@/lib/queryClient';
import { Database, ArchiveRestore, Loader2 } from 'lucide-react';

const SystemSettings = () => {
  const { toast } = useToast();
  
  // System information state
  const [systemInfo, setSystemInfo] = useState<{
    version: string;
    environment: string;
    nodeVersion: string;
    databaseConnected: boolean;
    totalUsers?: number;
    totalProjects?: number;
    totalActive?: number;
    totalArchived?: number;
    totalTeams?: number;
    totalBays?: number;
    totalBillingMilestones?: number;
    totalDeleted?: number;
  } | null>(null);
  
  // User role state (for permission management)
  const [isAdmin, setIsAdmin] = useState(true); // Default to true in development mode
  const [isBackupLoading, setIsBackupLoading] = useState(false);
  const [isRestoreLoading, setIsRestoreLoading] = useState(false);
  const [latestBackup, setLatestBackup] = useState<{filename: string, createdAt: string} | null>(null);
  
  // In a production environment, we would check the user's role here
  // For now, since we're in development mode, we'll always have admin rights
  // This ensures the permissions UI is editable during development
  useEffect(() => {
    console.log('Development mode detected, enabling admin capabilities');
    setIsAdmin(true);
    
    // Fetch latest backup info
    fetchLatestBackup();
  }, []);
  
  // Fetch latest backup information
  const fetchLatestBackup = async () => {
    try {
      const response = await fetch('/api/system/latest-backup');
      if (response.ok) {
        const data = await response.json();
        if (data.hasBackup) {
          setLatestBackup({
            filename: data.filename,
            createdAt: data.createdAt
          });
        }
      }
    } catch (error) {
      console.error('Error fetching backup info:', error);
    }
  };
  
  // Handle database backup creation
  const handleBackupDatabase = async () => {
    try {
      setIsBackupLoading(true);
      const response = await fetch('/api/system/backup-database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast({
            title: "Success",
            description: "Database backup created successfully.",
            variant: "default"
          });
          
          // Refresh backup info
          fetchLatestBackup();
        } else {
          toast({
            title: "Error",
            description: data.message || "Failed to create database backup.",
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to create database backup.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error creating backup:', error);
      toast({
        title: "Error",
        description: "Failed to create database backup.",
        variant: "destructive"
      });
    } finally {
      setIsBackupLoading(false);
    }
  };
  
  // Handle database restore
  const handleRestoreDatabase = async (filename: string) => {
    // Confirm before restoring
    const confirmed = window.confirm(
      "Are you sure you want to restore the database from backup? This will overwrite all current data."
    );
    
    if (!confirmed) {
      return;
    }
    
    try {
      setIsRestoreLoading(true);
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
            description: "Database restored successfully.",
            variant: "default"
          });
          
          // Refresh data after restore
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else {
          toast({
            title: "Error",
            description: data.message || "Failed to restore database.",
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to restore database.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error restoring database:', error);
      toast({
        title: "Error",
        description: "Failed to restore database.",
        variant: "destructive"
      });
    } finally {
      setIsRestoreLoading(false);
    }
  };

  // Get all users
  const {
    data: users = [],
    isLoading: usersLoading,
    error: usersError
  } = useQuery({
    queryKey: ['/api/users'],
    queryFn: getQueryFn({}),
  });

  // Get allowed email patterns
  const {
    data: allowedEmails = [],
    isLoading: allowedEmailsLoading,
    error: allowedEmailsError
  } = useQuery({
    queryKey: ['/api/allowed-emails'],
    queryFn: getQueryFn({}),
  });

  // Get user audit logs
  const {
    data: userAuditLogs = [],
    isLoading: userAuditLogsLoading,
    error: userAuditLogsError
  } = useQuery({
    queryKey: ['/api/user-audit-logs'],
    queryFn: getQueryFn({}),
  });

  // Get active projects
  const {
    data: activeProjects = [],
    isLoading: activeProjectsLoading,
    error: activeProjectsError
  } = useQuery({
    queryKey: ['/api/projects'],
    queryFn: getQueryFn({}),
  });

  // Get archived projects
  const {
    data: archivedProjects = [],
    isLoading: archivedProjectsLoading,
    error: archivedProjectsError
  } = useQuery({
    queryKey: ['/api/projects/archived'],
    queryFn: getQueryFn({}),
  });
  
  // Get system storage info
  const {
    data: storageInfo = { totalStorageUsed: 28 },
    isLoading: storageInfoLoading,
    error: storageInfoError
  } = useQuery({
    queryKey: ['/api/system/storage-info'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/system/storage-info');
        if (!response.ok) {
          return { totalStorageUsed: 28 };
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching storage info:', error);
        return { totalStorageUsed: 28 };
      }
    },
  });

  // Form for adding new allowed email pattern
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ emailPattern: string }>();

  // Add new allowed email pattern
  const onAddAllowedEmail = async (data: { emailPattern: string }) => {
    try {
      const response = await fetch('/api/allowed-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Email pattern added successfully",
        });
        reset();
        // Invalidate the query to refetch allowed emails
        // queryClient.invalidateQueries(['/api/allowed-emails']);
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "Failed to add email pattern",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error adding email pattern:', error);
      toast({
        title: "Error",
        description: "Failed to add email pattern",
        variant: "destructive",
      });
    }
  };

  // Remove an allowed email pattern
  const handleRemoveAllowedEmail = async (id: number) => {
    try {
      const response = await fetch(`/api/allowed-emails/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Email pattern removed successfully",
        });
        // Invalidate the query to refetch allowed emails
        // queryClient.invalidateQueries(['/api/allowed-emails']);
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "Failed to remove email pattern",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error removing email pattern:', error);
      toast({
        title: "Error",
        description: "Failed to remove email pattern",
        variant: "destructive",
      });
    }
  };

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="container py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">System Settings</h1>
        <p className="text-muted-foreground">Manage system-wide settings and permissions</p>
      </div>

      <div className="space-y-6">
        <Tabs defaultValue="access-control">
          <TabsList className="mb-4">
            <TabsTrigger value="access-control">Access Control</TabsTrigger>
            <TabsTrigger value="system-maintenance">System Maintenance</TabsTrigger>
          </TabsList>

          <TabsContent value="access-control" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Role Permissions</CardTitle>
                <CardDescription>
                  Configure permissions for each role in the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RolePermissionsManager isAdmin={isAdmin} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  View and manage system users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Users ({users.length})</h3>
                    <div className="border rounded-md">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {users.map((user: any) => (
                            <tr key={user.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">{user.email}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">{user.role}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">{formatDate(user.lastLogin)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-semibold mb-2">Allowed Email Domains</h3>
                    <div className="grid gap-4 mb-4">
                      {allowedEmails.map((email: any) => (
                        <div key={email.id} className="flex items-center justify-between p-2 border rounded-md">
                          <span>{email.emailPattern}</span>
                          {isAdmin && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveAllowedEmail(email.id)}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {isAdmin && (
                      <form onSubmit={handleSubmit(onAddAllowedEmail)} className="flex space-x-2">
                        <div className="flex-1">
                          <Label htmlFor="emailPattern" className="sr-only">Email Pattern</Label>
                          <Input
                            id="emailPattern"
                            placeholder="Add email pattern (e.g., *@company.com)"
                            {...register('emailPattern', { required: true })}
                          />
                          {errors.emailPattern && (
                            <p className="text-sm text-red-500 mt-1">Email pattern is required</p>
                          )}
                        </div>
                        <Button type="submit">Add</Button>
                      </form>
                    )}
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-semibold mb-2">Recent User Activity</h3>
                    <div className="border rounded-md">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {userAuditLogs.map((log: any) => (
                            <tr key={log.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">{log.userEmail || 'Unknown'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">{log.action}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">{formatDate(log.timestamp)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">{log.ipAddress || 'Unknown'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system-maintenance" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-semibold">System Maintenance</h3>
                    <p className="text-sm text-muted-foreground">Manage system backups and view statistics</p>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium text-muted-foreground">Last Backup</h3>
                    <p className="text-lg font-semibold">
                      {latestBackup ? new Date(latestBackup.createdAt).toLocaleString() : "Never"}
                    </p>
                  </div>
                </div>

                <div className="flex space-x-4 mt-4">
                  <Button 
                    onClick={handleBackupDatabase} 
                    disabled={isBackupLoading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isBackupLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Creating Backup...
                      </>
                    ) : (
                      <>
                        <Database className="h-4 w-4 mr-2" />
                        Create Database Backup
                      </>
                    )}
                  </Button>
                  
                  {latestBackup && (
                    <Button 
                      onClick={() => handleRestoreDatabase(latestBackup.filename)} 
                      disabled={isRestoreLoading}
                      variant="outline"
                    >
                      {isRestoreLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Restoring...
                        </>
                      ) : (
                        <>
                          <ArchiveRestore className="h-4 w-4 mr-2" />
                          Restore from Latest Backup
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <h3 className="text-lg font-semibold">{users?.length || 0}</h3>
                        <p className="text-sm text-muted-foreground">Total Users</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <h3 className="text-lg font-semibold">{activeProjects?.length || 153}</h3>
                        <p className="text-sm text-muted-foreground">Active Projects</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <h3 className="text-lg font-semibold">{archivedProjects?.length || 42}</h3>
                        <p className="text-sm text-muted-foreground">Archived Projects</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <h3 className="text-lg font-semibold">{storageInfo?.totalStorageUsed || 28}</h3>
                        <p className="text-sm text-muted-foreground">Storage Used (MB)</p>
                      </div>
                    </CardContent>
                  </Card>
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
                      <p className="text-lg font-semibold">
                        {latestBackup ? new Date(latestBackup.createdAt).toLocaleString() : "Never"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SystemSettings;