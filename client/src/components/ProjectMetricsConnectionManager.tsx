import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Activity, 
  Settings, 
  CheckCircle, 
  XCircle, 
  Globe, 
  Key, 
  RefreshCw,
  AlertCircle,
  Clock,
  TestTube
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';

interface ProjectMetricsConnection {
  id: number;
  name: string;
  url: string;
  apiKey?: string;
  isActive: boolean;
  lastSyncAt?: string;
  lastSuccessAt?: string;
  lastErrorAt?: string;
  lastErrorMessage?: string;
  syncSchedule: string;
  autoSync: boolean;
}

export function ProjectMetricsConnectionManager() {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: 'Project Performance Metrics API',
    url: 'http://metrics.nomadgcs.com/pea',
    apiKey: '',
    isActive: true,
    autoSync: true,
    syncSchedule: '0 5 * * *' // Daily at 5:00 AM
  });

  // Fetch current connection settings
  const { data: connection, isLoading } = useQuery({
    queryKey: ['/api/settings/project-metrics-connection'],
    enabled: true,
  });

  // Update connection settings
  const updateConnectionMutation = useMutation({
    mutationFn: async (connectionData: any) => {
      const response = await apiRequest('PUT', '/api/settings/project-metrics-connection', connectionData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings/project-metrics-connection'] });
      setIsEditing(false);
      toast({
        title: "Connection Updated",
        description: "Project metrics connection settings have been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: `Failed to update connection settings: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Test connection
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/metrics-sync/test-connection');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings/project-metrics-connection'] });
      toast({
        title: "Connection Test Complete",
        description: data.success ? 
          `Connection successful! Found ${data.projectCount || 0} projects.` : 
          `Test failed: ${data.error}`,
        variant: data.success ? "default" : "destructive"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Test Failed",
        description: `Connection test failed: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Manual sync
  const manualSyncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/metrics-sync/manual');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings/project-metrics-connection'] });
      toast({
        title: "Manual Sync Complete",
        description: `Successfully updated ${data.updatedProjects || 0} projects with metrics data.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Sync Failed",
        description: `Manual sync failed: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateConnectionMutation.mutate(formData);
  };

  const getStatusBadge = () => {
    if (!connection?.isActive) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    
    const lastSuccess = connection?.lastSuccessAt;
    const lastError = connection?.lastErrorAt;
    
    if (!lastSuccess && !lastError) {
      return <Badge variant="outline">Not Tested</Badge>;
    }
    
    if (lastError && (!lastSuccess || new Date(lastError) > new Date(lastSuccess))) {
      return <Badge variant="destructive">Error</Badge>;
    }
    
    return <Badge variant="default" className="bg-green-600">Connected</Badge>;
  };

  React.useEffect(() => {
    if (connection && !isEditing) {
      setFormData({
        name: connection.name || 'Project Performance Metrics API',
        url: connection.url || 'http://metrics.nomadgcs.com/pea',
        apiKey: connection.apiKey || '',
        isActive: connection.isActive !== false,
        autoSync: connection.autoSync !== false,
        syncSchedule: connection.syncSchedule || '0 5 * * *'
      });
    }
  }, [connection, isEditing]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Project Metrics Integration
            </CardTitle>
            <CardDescription>
              Configure the connection to your external project performance metrics system.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            {!isEditing ? (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Configure
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Connection Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Connection Status</Label>
            <div className="flex items-center gap-2">
              {connection?.isActive ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Active</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm">Inactive</span>
                </>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Last Sync</Label>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-sm">
                {connection?.lastSyncAt ? 
                  new Date(connection.lastSyncAt).toLocaleString() : 
                  'Never'
                }
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Auto Sync</Label>
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-blue-500" />
              <span className="text-sm">
                {connection?.autoSync ? 'Daily at 5:00 AM' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Configuration Form */}
        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Connection Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Project Performance Metrics API"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="url">API Endpoint URL</Label>
                <Input
                  id="url"
                  value={formData.url}
                  onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="http://metrics.nomadgcs.com/pea"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key (Optional)</Label>
              <Input
                id="apiKey"
                type="password"
                value={formData.apiKey}
                onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                placeholder="Enter API key if required"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="syncSchedule">Sync Schedule (Cron Format)</Label>
              <Input
                id="syncSchedule"
                value={formData.syncSchedule}
                onChange={(e) => setFormData(prev => ({ ...prev, syncSchedule: e.target.value }))}
                placeholder="0 5 * * * (Daily at 5:00 AM)"
              />
              <p className="text-xs text-gray-500">
                Current: Daily at 5:00 AM. Use cron format for custom schedules.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
              />
              <Label htmlFor="isActive">Enable connection</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="autoSync"
                checked={formData.autoSync}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, autoSync: checked }))}
              />
              <Label htmlFor="autoSync">Enable automatic synchronization</Label>
            </div>

            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={updateConnectionMutation.isPending}
              >
                {updateConnectionMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Settings'
                )}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Endpoint URL</Label>
                <p className="text-sm text-gray-600 mt-1">{connection?.url || 'Not configured'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">API Authentication</Label>
                <p className="text-sm text-gray-600 mt-1">
                  {connection?.apiKey ? 'API Key configured' : 'No authentication'}
                </p>
              </div>
            </div>

            {connection?.lastErrorMessage && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Last Error</p>
                  <p className="text-sm text-red-700">{connection.lastErrorMessage}</p>
                  {connection.lastErrorAt && (
                    <p className="text-xs text-red-600 mt-1">
                      {new Date(connection.lastErrorAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => testConnectionMutation.mutate()}
            disabled={testConnectionMutation.isPending}
          >
            {testConnectionMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <TestTube className="h-4 w-4 mr-2" />
                Test Connection
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={() => manualSyncMutation.mutate()}
            disabled={manualSyncMutation.isPending || !connection?.isActive}
          >
            {manualSyncMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Manual Sync
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default ProjectMetricsConnectionManager;