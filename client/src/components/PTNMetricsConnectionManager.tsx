import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from '@/lib/queryClient';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  ExternalLink,
  Database,
  Clock,
  Activity,
  Zap
} from 'lucide-react';

interface PTNConnection {
  id: number;
  name: string;
  url: string;
  apiKey: string;
  isEnabled: boolean;
  lastSync: string | null;
  lastTestResult: string | null;
  syncFrequency: string;
  description: string;
  headers: Record<string, string>;
  timeout: number;
  retryAttempts: number;
}

const PTNMetricsConnectionManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<PTNConnection>>({
    name: 'PTN Production System',
    url: 'https://ptn.nomadgcsai.com',
    apiKey: '',
    isEnabled: true,
    syncFrequency: 'hourly',
    description: 'External PTN application for production metrics and GEMBA dashboard data',
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'NomadGCS-Dashboard/1.0'
    },
    timeout: 15000,
    retryAttempts: 3
  });

  // Fetch PTN connection
  const { data: connection, isLoading, error } = useQuery<PTNConnection>({
    queryKey: ['/api/ptn-connection'],
    retry: false
  });

  // Update form data when connection loads
  React.useEffect(() => {
    if (connection) {
      setFormData(connection);
    }
  }, [connection]);

  // Save connection
  const saveConnectionMutation = useMutation({
    mutationFn: async (data: Partial<PTNConnection>) => {
      const method = connection ? 'PUT' : 'POST';
      const url = connection ? `/api/ptn-connection/${connection.id}` : '/api/ptn-connection';
      const response = await apiRequest(method, url, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ptn-connection'] });
      toast({
        title: "Connection Saved",
        description: "PTN connection settings have been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Save Failed",
        description: `Failed to save connection: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Test connection
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      if (!connection?.id) throw new Error('No connection to test');
      const response = await apiRequest('POST', `/api/ptn-connection/${connection.id}/test`);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/ptn-connection'] });
      toast({
        title: "Connection Test Complete",
        description: data.success ? 
          `Connection successful! Response time: ${data.responseTime}ms` : 
          `Test failed: ${data.message}`,
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
      if (!connection?.id) throw new Error('No connection to sync');
      const response = await apiRequest('POST', `/api/ptn-connection/${connection.id}/sync`);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/ptn-connection'] });
      toast({
        title: "Manual Sync Complete",
        description: `Successfully synced ${data.recordsUpdated || 0} production metrics.`,
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

  const handleSave = () => {
    saveConnectionMutation.mutate(formData);
  };

  const handleTestConnection = () => {
    testConnectionMutation.mutate();
  };

  const handleManualSync = () => {
    manualSyncMutation.mutate();
  };

  const getStatusBadge = () => {
    if (!connection) return <Badge variant="secondary">Not Configured</Badge>;
    
    if (!connection.isEnabled) {
      return <Badge variant="secondary">Disabled</Badge>;
    }

    if (connection.lastTestResult) {
      const testResult = JSON.parse(connection.lastTestResult);
      if (testResult.success) {
        return <Badge variant="default" className="bg-green-100 text-green-800">Connected</Badge>;
      } else {
        return <Badge variant="destructive">Connection Failed</Badge>;
      }
    }

    return <Badge variant="outline">Unknown</Badge>;
  };

  const getLastSyncInfo = () => {
    if (!connection?.lastSync) return "Never synced";
    
    const lastSync = new Date(connection.lastSync);
    const now = new Date();
    const diffMs = now.getTime() - lastSync.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 60) {
      return `${diffMins} minutes ago`;
    } else if (diffMins < 1440) {
      return `${Math.floor(diffMins / 60)} hours ago`;
    } else {
      return `${Math.floor(diffMins / 1440)} days ago`;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Loading PTN connection settings...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            PTN Connection Status
          </CardTitle>
          <CardDescription>
            Monitor the connection status to your external PTN production system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status:</span>
              {getStatusBadge()}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Last sync: {getLastSyncInfo()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                Sync: {formData.syncFrequency || 'Not configured'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            PTN API Configuration
          </CardTitle>
          <CardDescription>
            Configure the connection to your external PTN production system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ptn-name">Connection Name</Label>
              <Input
                id="ptn-name"
                value={formData.name || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="PTN Production System"
              />
            </div>
            <div>
              <Label htmlFor="ptn-url">API Base URL</Label>
              <Input
                id="ptn-url"
                value={formData.url || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://ptn.nomadgcsai.com/api"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="ptn-api-key">API Key</Label>
            <Input
              id="ptn-api-key"
              type="password"
              value={formData.apiKey || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
              placeholder="Enter your PTN API key"
            />
          </div>

          <div>
            <Label htmlFor="ptn-description">Description</Label>
            <Textarea
              id="ptn-description"
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe this connection..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ptn-timeout">Timeout (ms)</Label>
              <Input
                id="ptn-timeout"
                type="number"
                value={formData.timeout || 30000}
                onChange={(e) => setFormData(prev => ({ ...prev, timeout: parseInt(e.target.value) }))}
                min="5000"
                max="120000"
              />
            </div>
            <div>
              <Label htmlFor="ptn-retry">Retry Attempts</Label>
              <Input
                id="ptn-retry"
                type="number"
                value={formData.retryAttempts || 3}
                onChange={(e) => setFormData(prev => ({ ...prev, retryAttempts: parseInt(e.target.value) }))}
                min="0"
                max="10"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="ptn-enabled"
              checked={formData.isEnabled || false}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isEnabled: checked }))}
            />
            <Label htmlFor="ptn-enabled">Enable PTN Connection</Label>
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              onClick={handleSave}
              disabled={saveConnectionMutation.isPending}
            >
              {saveConnectionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Configuration
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleTestConnection}
              disabled={testConnectionMutation.isPending || !formData.url}
            >
              {testConnectionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Test Connection
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleManualSync}
              disabled={manualSyncMutation.isPending || !connection?.isEnabled}
            >
              {manualSyncMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Manual Sync
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Integration Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            PTN Integration Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <h4 className="font-medium">Connected Features:</h4>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                <li>• GEMBA Dashboard Metrics (Production Efficiency, Quality Rates, OEE)</li>
                <li>• Live Bay Status and Workstation Monitoring</li>
                <li>• Floor Alerts and Production Issues</li>
                <li>• Active Work Orders and Production Schedule</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium">Data Sync:</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Production metrics are automatically synchronized based on the configured frequency. 
                Manual sync is available for immediate updates when needed.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Connection Error</AlertTitle>
          <AlertDescription>
            Failed to load PTN connection settings. Please check your network connection and try again.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default PTNMetricsConnectionManager;