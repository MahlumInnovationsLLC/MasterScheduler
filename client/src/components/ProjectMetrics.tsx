import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { Project } from '@shared/schema';

interface ProjectMetricsProps {
  project: Project;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function ProjectMetrics({ project, onRefresh, isRefreshing = false }: ProjectMetricsProps) {
  const formatCurrency = (value: string | null) => {
    if (!value || value === '0' || value === '0.00') return 'N/A';
    const num = parseFloat(value);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatCPI = (value: string | null) => {
    if (!value || value === '0' || value === '0.0000') return 'N/A';
    const num = parseFloat(value);
    return num.toFixed(3);
  };

  const getCPIStatus = (cpi: string | null) => {
    if (!cpi || cpi === '0' || cpi === '0.0000') return 'unknown';
    const num = parseFloat(cpi);
    if (num >= 1.0) return 'good';
    if (num >= 0.8) return 'warning';
    return 'poor';
  };

  const getCPIColor = (status: string) => {
    switch (status) {
      case 'good': return 'bg-green-100 text-green-800 border-green-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'poor': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCPIIcon = (status: string) => {
    switch (status) {
      case 'good': return <TrendingUp className="h-4 w-4" />;
      case 'poor': return <TrendingDown className="h-4 w-4" />;
      default: return null;
    }
  };

  const cpiStatus = getCPIStatus(project.cpi);
  const hasMetrics = project.cpi || project.plannedValue || project.earnedValue || project.actualCost || project.estimatedCost;

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">Project Performance Metrics</CardTitle>
        <div className="flex items-center gap-2">
          {project.metricsLastUpdated && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                Updated: {new Date(project.metricsLastUpdated).toLocaleDateString()}
              </span>
            </div>
          )}
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="h-8"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              Sync
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!hasMetrics ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-sm">
              No performance metrics available for this project.
            </div>
            {onRefresh && (
              <div className="text-xs mt-2">
                Click "Sync" to fetch the latest data from the metrics system.
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Cost Performance Index (CPI) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">CPI</span>
                <Badge className={`${getCPIColor(cpiStatus)} flex items-center gap-1`}>
                  {getCPIIcon(cpiStatus)}
                  {formatCPI(project.cpi)}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                Cost Performance Index
              </div>
            </div>

            {/* Planned Value */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Planned</span>
                <span className="text-sm font-mono">{formatCurrency(project.plannedValue)}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Planned Value (PV)
              </div>
            </div>

            {/* Earned Value */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Earned</span>
                <span className="text-sm font-mono">{formatCurrency(project.earnedValue)}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Earned Value (EV)
              </div>
            </div>

            {/* Actual Cost */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Actual</span>
                <span className="text-sm font-mono">{formatCurrency(project.actualCost)}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Actual Cost (AC)
              </div>
            </div>

            {/* Estimated Cost */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Estimated</span>
                <span className="text-sm font-mono">{formatCurrency(project.estimatedCost)}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Estimated Cost (EC)
              </div>
            </div>

            {/* Total Hours (existing field) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Total Hours</span>
                <span className="text-sm font-mono">
                  {project.totalHours ? project.totalHours.toLocaleString() : 'N/A'}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Manufacturing Hours
              </div>
            </div>
          </div>
        )}

        {/* Performance Indicators */}
        {hasMetrics && project.cpi && project.plannedValue && project.earnedValue && (
          <div className="mt-6 pt-4 border-t">
            <div className="text-sm font-medium mb-3">Performance Analysis</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <div className="font-medium">Cost Performance:</div>
                <div className="text-muted-foreground">
                  {cpiStatus === 'good' && 'Project is under budget and performing well'}
                  {cpiStatus === 'warning' && 'Project costs are slightly above planned'}
                  {cpiStatus === 'poor' && 'Project is significantly over budget'}
                  {cpiStatus === 'unknown' && 'Performance data not available'}
                </div>
              </div>
              <div className="space-y-1">
                <div className="font-medium">Schedule Performance:</div>
                <div className="text-muted-foreground">
                  {project.earnedValue && project.plannedValue && (
                    parseFloat(project.earnedValue) >= parseFloat(project.plannedValue)
                      ? 'On or ahead of schedule'
                      : 'Behind planned schedule'
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ProjectMetrics;