import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, Clock, CheckCircle, XCircle, AlertCircle, Settings } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface SchedulerStatus {
  [key: string]: boolean;
}

export default function MetricsManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);

  // Fetch scheduler status
  const { data: schedulerStatus, isLoading: isLoadingStatus } = useQuery<SchedulerStatus>({
    queryKey: ['/api/metrics/scheduler/status'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Manual sync mutation
  const syncMutation = useMutation({
    mutationFn: () => apiRequest('/api/metrics/sync', { method: 'POST' }),
    onMutate: () => {
      setIsSyncing(true);
    },
    onSuccess: (data) => {
      toast({
        title: "Sync Completed",
        description: `Successfully synchronized ${data.updatedProjects || 0} projects with performance metrics.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    },
    onError: (error: any) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to synchronize metrics. Please check the connection to the metrics server.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSyncing(false);
    },
  });

  const handleManualSync = () => {
    syncMutation.mutate();
  };

  const getStatusIcon = (isRunning: boolean) => {
    if (isRunning) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    return <XCircle className="h-4 w-4 text-red-600" />;
  };

  const getStatusBadge = (isRunning: boolean) => {
    if (isRunning) {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          Active
        </Badge>
      );
    }
    return (
      <Badge className="bg-red-100 text-red-800 border-red-200">
        Inactive
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Metrics Management</h1>
          <p className="text-muted-foreground">
            Monitor and manage automated project performance metrics synchronization
          </p>
        </div>
        <Button
          onClick={handleManualSync}
          disabled={isSyncing}
          size="lg"
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Manual Sync'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Scheduler Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg">Automation Status</CardTitle>
            <Settings className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingStatus ? (
              <div className="space-y-3">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mt-2"></div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {schedulerStatus && Object.entries(schedulerStatus).map(([jobName, isRunning]) => (
                  <div key={jobName} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(isRunning)}
                      <span className="font-medium capitalize">
                        {jobName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </span>
                    </div>
                    {getStatusBadge(isRunning)}
                  </div>
                ))}
                
                {(!schedulerStatus || Object.keys(schedulerStatus).length === 0) && (
                  <div className="text-center py-4 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                    <p>No scheduled jobs configured</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sync Configuration */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg">Sync Configuration</CardTitle>
            <Clock className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium mb-1">Schedule</div>
                <div className="text-sm text-muted-foreground">
                  Daily at 5:00 AM (Automated)
                </div>
              </div>
              
              <Separator />
              
              <div>
                <div className="text-sm font-medium mb-1">Data Source</div>
                <div className="text-sm text-muted-foreground">
                  http://metrics.nomadgcs.com/pea
                </div>
              </div>
              
              <Separator />
              
              <div>
                <div className="text-sm font-medium mb-1">Metrics Collected</div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="text-xs bg-gray-100 px-2 py-1 rounded">CPI</div>
                  <div className="text-xs bg-gray-100 px-2 py-1 rounded">Planned Value</div>
                  <div className="text-xs bg-gray-100 px-2 py-1 rounded">Earned Value</div>
                  <div className="text-xs bg-gray-100 px-2 py-1 rounded">Actual Cost</div>
                  <div className="text-xs bg-gray-100 px-2 py-1 rounded">Estimated Cost</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">System Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">Daily</div>
              <div className="text-sm text-muted-foreground">Sync Frequency</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">5:00 AM</div>
              <div className="text-sm text-muted-foreground">Scheduled Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">Auto</div>
              <div className="text-sm text-muted-foreground">Execution Mode</div>
            </div>
          </div>
          
          <Separator className="my-6" />
          
          <div className="space-y-3">
            <h4 className="font-medium">How it works:</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>System automatically connects to the metrics server every morning at 5:00 AM</li>
              <li>Extracts performance data for all active projects using project numbers</li>
              <li>Updates local database with CPI, planned/earned values, and cost information</li>
              <li>Performance metrics appear alongside project details throughout the application</li>
              <li>Manual sync is available for immediate updates when needed</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}