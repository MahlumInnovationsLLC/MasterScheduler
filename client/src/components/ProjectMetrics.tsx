import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp, TrendingDown, Clock, Loader2 } from 'lucide-react';
import { Project } from '@shared/schema';

interface ProjectMetricsProps {
  projectId: number;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function ProjectMetrics({ projectId, onRefresh, isRefreshing = false }: ProjectMetricsProps) {
  // Fetch project data to get metrics
  const { data: project, isLoading, error } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });

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

  if (isLoading) {
    return (
      <div className="bg-dark rounded border border-gray-800 p-3">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="bg-dark rounded border border-gray-800 p-3">
        <div className="text-md font-semibold text-gray-300 mb-2">PROJECT METRICS</div>
        <div className="text-sm text-gray-400">No data available</div>
      </div>
    );
  }

  const cpiStatus = getCPIStatus(project.cpi);
  const hasMetrics = project.cpi || project.plannedValue || project.earnedValue || project.actualCost || project.estimatedCost;

  return (
    <div className="bg-dark rounded border border-gray-800 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-md font-semibold text-gray-300">PROJECT METRICS</div>
        {project.metricsLastUpdated && (
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Clock className="h-3 w-3" />
            <span>
              {new Date(project.metricsLastUpdated).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>
      
      {!hasMetrics ? (
        <div className="text-sm text-gray-400">
          No performance data available
        </div>
      ) : (
        <div className="space-y-3">
          {/* CPI */}
          {project.cpi && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">CPI</span>
              <div className="flex items-center gap-2">
                {getCPIIcon(cpiStatus)}
                <span className={`text-sm font-bold ${
                  cpiStatus === 'good' ? 'text-green-400' :
                  cpiStatus === 'warning' ? 'text-yellow-400' :
                  cpiStatus === 'poor' ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {formatCPI(project.cpi)}
                </span>
              </div>
            </div>
          )}
          
          {/* Planned Value */}
          {project.plannedValue && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">PLANNED</span>
              <span className="text-sm font-bold">{formatCurrency(project.plannedValue)}</span>
            </div>
          )}
          
          {/* Earned Value */}
          {project.earnedValue && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">EARNED</span>
              <span className="text-sm font-bold">{formatCurrency(project.earnedValue)}</span>
            </div>
          )}
          
          {/* Actual Cost */}
          {project.actualCost && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">ACTUAL</span>
              <span className="text-sm font-bold">{formatCurrency(project.actualCost)}</span>
            </div>
          )}
          
          {/* Estimated Cost */}
          {project.estimatedCost && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">ESTIMATED</span>
              <span className="text-sm font-bold">{formatCurrency(project.estimatedCost)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ProjectMetrics;