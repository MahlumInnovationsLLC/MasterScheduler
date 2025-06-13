import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Play, 
  CheckCircle, 
  XCircle, 
  Clock,
  Settings,
  Globe,
  Key,
  Activity
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ExternalConnection {
  id: number;
  name: string;
  description: string | null;
  type: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  authentication: {
    type: 'none' | 'basic' | 'bearer' | 'apikey';
    username?: string;
    password?: string;
    token?: string;
    apiKey?: string;
    apiKeyHeader?: string;
  };
  requestBody: string | null;
  responseMapping: Record<string, string>;
  retryConfig: {
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier: number;
  };
  isActive: boolean;
  lastTestedAt: string | null;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function ExternalConnectionsManager() {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<ExternalConnection | null>(null);
  const [showTestDialog, setShowTestDialog] = useState(false);

  // Fetch external connections
  const { data: connections = [], isLoading, error } = useQuery<ExternalConnection[]>({
    queryKey: ["/api/external-connections"],
    enabled: true
  });

  // Create connection mutation
  const createConnectionMutation = useMutation({
    mutationFn: async (connectionData: any) => {
      const response = await fetch('/api/external-connections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(connectionData),
      });
      if (!response.ok) {
        throw new Error('Failed to create connection');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/external-connections"] });
      setShowCreateDialog(false);
      toast({
        title: "Connection Created",
        description: "External connection has been successfully created.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create connection: " + (error as Error).message,
        variant: "destructive"
      });
    }
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async (connectionId: number) => {
      const response = await fetch(`/api/external-connections/${connectionId}/test`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to test connection');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/external-connections"] });
      toast({
        title: "Connection Test Complete",
        description: data.success ? "Connection test successful!" : `Test failed: ${data.error}`,
        variant: data.success ? "default" : "destructive"
      });
    },
    onError: (error) => {
      toast({
        title: "Test Error",
        description: "Failed to test connection: " + (error as Error).message,
        variant: "destructive"
      });
    }
  });

  // Delete connection mutation
  const deleteConnectionMutation = useMutation({
    mutationFn: async (connectionId: number) => {
      const response = await fetch(`/api/external-connections/${connectionId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete connection');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/external-connections"] });
      toast({
        title: "Connection Deleted",
        description: "External connection has been successfully deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete connection: " + (error as Error).message,
        variant: "destructive"
      });
    }
  });

  const getStatusBadge = (connection: ExternalConnection) => {
    if (!connection.isActive) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    
    const lastSuccess = connection.lastSuccessAt;
    const lastError = connection.lastErrorAt;
    
    if (!lastSuccess && !lastError) {
      return <Badge variant="outline">Not Tested</Badge>;
    }
    
    if (lastError && (!lastSuccess || new Date(lastError) > new Date(lastSuccess))) {
      return <Badge variant="destructive">Error</Badge>;
    }
    
    return <Badge variant="default" className="bg-green-600">Active</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                External Connections
              </CardTitle>
              <CardDescription>
                Configure and manage external API endpoints for data integration and webhooks.
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Connection
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="text-center p-8 text-red-600">
              Error loading connections. Please try again.
            </div>
          ) : connections.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No external connections configured yet.</p>
              <p className="text-sm">Create your first connection to start integrating external APIs.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Test</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {connections.map((connection) => (
                    <TableRow key={connection.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{connection.name}</div>
                          {connection.description && (
                            <div className="text-sm text-muted-foreground">{connection.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{connection.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{connection.method}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{connection.url}</TableCell>
                      <TableCell>{getStatusBadge(connection)}</TableCell>
                      <TableCell>
                        {connection.lastTestedAt ? (
                          <div className="text-sm">
                            {new Date(connection.lastTestedAt).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Never</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => testConnectionMutation.mutate(connection.id)}
                            disabled={testConnectionMutation.isPending}
                          >
                            <Play className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedConnection(connection);
                              setShowEditDialog(true);
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteConnectionMutation.mutate(connection.id)}
                            disabled={deleteConnectionMutation.isPending}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Connection Dialog */}
      <CreateConnectionDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={createConnectionMutation.mutate}
        isLoading={createConnectionMutation.isPending}
      />

      {/* Edit Connection Dialog */}
      {selectedConnection && (
        <EditConnectionDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          connection={selectedConnection}
          onSubmit={(data) => {
            // Update connection logic here
            console.log('Update connection:', data);
          }}
          isLoading={false}
        />
      )}
    </div>
  );
}

// Create Connection Dialog Component
function CreateConnectionDialog({ 
  open, 
  onOpenChange, 
  onSubmit, 
  isLoading 
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'webhook',
    method: 'POST',
    url: '',
    headers: '{}',
    authType: 'none',
    authUsername: '',
    authPassword: '',
    authToken: '',
    authApiKey: '',
    authApiKeyHeader: 'X-API-Key',
    requestBody: '',
    responseMapping: '{}',
    maxRetries: 3,
    retryDelay: 1000,
    backoffMultiplier: 2,
    isActive: true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const headers = JSON.parse(formData.headers || '{}');
      const responseMapping = JSON.parse(formData.responseMapping || '{}');
      
      const authentication: any = { type: formData.authType };
      
      if (formData.authType === 'basic') {
        authentication.username = formData.authUsername;
        authentication.password = formData.authPassword;
      } else if (formData.authType === 'bearer') {
        authentication.token = formData.authToken;
      } else if (formData.authType === 'apikey') {
        authentication.apiKey = formData.authApiKey;
        authentication.apiKeyHeader = formData.authApiKeyHeader;
      }

      onSubmit({
        name: formData.name,
        description: formData.description || null,
        type: formData.type,
        method: formData.method,
        url: formData.url,
        headers,
        authentication,
        requestBody: formData.requestBody || null,
        responseMapping,
        retryConfig: {
          maxRetries: formData.maxRetries,
          retryDelay: formData.retryDelay,
          backoffMultiplier: formData.backoffMultiplier
        },
        isActive: formData.isActive
      });
    } catch (error) {
      console.error('Form validation error:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create External Connection</DialogTitle>
          <DialogDescription>
            Configure a new external API endpoint or webhook connection.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Connection Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="My External API"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="webhook">Webhook</SelectItem>
                  <SelectItem value="api">REST API</SelectItem>
                  <SelectItem value="database">Database</SelectItem>
                  <SelectItem value="integration">Integration</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of this connection"
            />
          </div>

          {/* HTTP Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="method">HTTP Method</Label>
              <Select value={formData.method} onValueChange={(value) => setFormData(prev => ({ ...prev, method: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="url">URL *</Label>
              <Input
                id="url"
                value={formData.url}
                onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://api.example.com/webhook"
                required
              />
            </div>
          </div>

          {/* Authentication */}
          <div className="space-y-4">
            <Label>Authentication</Label>
            <Select value={formData.authType} onValueChange={(value) => setFormData(prev => ({ ...prev, authType: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="basic">Basic Auth</SelectItem>
                <SelectItem value="bearer">Bearer Token</SelectItem>
                <SelectItem value="apikey">API Key</SelectItem>
              </SelectContent>
            </Select>

            {formData.authType === 'basic' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={formData.authUsername}
                    onChange={(e) => setFormData(prev => ({ ...prev, authUsername: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.authPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, authPassword: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {formData.authType === 'bearer' && (
              <div className="space-y-2">
                <Label htmlFor="token">Bearer Token</Label>
                <Input
                  id="token"
                  value={formData.authToken}
                  onChange={(e) => setFormData(prev => ({ ...prev, authToken: e.target.value }))}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                />
              </div>
            )}

            {formData.authType === 'apikey' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    value={formData.authApiKey}
                    onChange={(e) => setFormData(prev => ({ ...prev, authApiKey: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apiKeyHeader">Header Name</Label>
                  <Input
                    id="apiKeyHeader"
                    value={formData.authApiKeyHeader}
                    onChange={(e) => setFormData(prev => ({ ...prev, authApiKeyHeader: e.target.value }))}
                    placeholder="X-API-Key"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Headers and Body */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="headers">Custom Headers (JSON)</Label>
              <Textarea
                id="headers"
                value={formData.headers}
                onChange={(e) => setFormData(prev => ({ ...prev, headers: e.target.value }))}
                placeholder='{"Content-Type": "application/json"}'
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="requestBody">Request Body Template</Label>
              <Textarea
                id="requestBody"
                value={formData.requestBody}
                onChange={(e) => setFormData(prev => ({ ...prev, requestBody: e.target.value }))}
                placeholder='{"data": "{{data}}", "timestamp": "{{timestamp}}"}'
                rows={4}
              />
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-6 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.name || !formData.url}
              className="min-w-[120px]"
            >
              {isLoading ? "Creating..." : "Create Connection"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Edit Connection Dialog Component (simplified for now)
function EditConnectionDialog({ 
  open, 
  onOpenChange, 
  connection,
  onSubmit, 
  isLoading 
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection: ExternalConnection;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Connection</DialogTitle>
          <DialogDescription>
            Modify the configuration for {connection.name}
          </DialogDescription>
        </DialogHeader>
        <div className="p-4">
          <p>Edit functionality will be implemented in the next iteration.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}