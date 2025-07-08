import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePermissions } from '@/components/PermissionsManager';
import { Redirect } from 'wouter';
import { Clock, TrendingUp, Calendar, Activity, ChevronRight, BarChart3, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { EnhancedHoursFlowWidget } from '@/components/EnhancedHoursFlowWidget';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, startOfMonth, endOfMonth, subMonths, subQuarters, startOfYear } from 'date-fns';

interface ForecastStats {
  totalHours: number;
  earnedHours: number;
  projectedHours: number;
  remainingHours: number;
  lastMonth: {
    earnedHours: number;
    percentage: number;
  };
  lastQuarter: {
    earnedHours: number;
    percentage: number;
  };
  ytd: {
    earnedHours: number;
    percentage: number;
  };
}

interface HoursStatusCardProps {
  title: string;
  value: string | number;
  type: 'total' | 'earned' | 'projected' | 'remaining';
  stats?: Array<{ label: string; value: number | string }>;
}

function HoursStatusCard({ title, value, type, stats }: HoursStatusCardProps) {
  const getColorClasses = () => {
    switch (type) {
      case 'total':
        return 'text-gray-600 border-gray-200';
      case 'earned':
        return 'text-green-600 border-green-200';
      case 'projected':
        return 'text-blue-600 border-blue-200';
      case 'remaining':
        return 'text-orange-600 border-orange-200';
      default:
        return 'text-gray-600 border-gray-200';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'total':
        return <Clock className="h-5 w-5" />;
      case 'earned':
        return <TrendingUp className="h-5 w-5" />;
      case 'projected':
        return <Activity className="h-5 w-5" />;
      case 'remaining':
        return <Calendar className="h-5 w-5" />;
      default:
        return <Clock className="h-5 w-5" />;
    }
  };

  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      return val.toLocaleString();
    }
    return val;
  };

  return (
    <Card className={`border ${getColorClasses()}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">{title}</CardTitle>
          <div className={getColorClasses()}>{getIcon()}</div>
        </div>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${getColorClasses()}`}>
          {formatValue(value)}
        </div>
        {stats && stats.length > 0 && (
          <div className="mt-4 space-y-2">
            {stats.map((stat, index) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <span className="text-gray-600">{stat.label}</span>
                <span className="font-medium">{formatValue(stat.value)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function Forecast() {
  const { userRole } = usePermissions();
  const [selectedPeriod, setSelectedPeriod] = useState<'lastMonth' | 'lastQuarter' | 'ytd'>('lastMonth');

  // Check permissions - only allow Editor and Admin roles
  if (userRole !== 'editor' && userRole !== 'admin') {
    return <Redirect to="/" />;
  }

  // Fetch projects data
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['/api/projects'],
  });

  // Fetch manufacturing schedules
  const { data: schedules = [], isLoading: schedulesLoading } = useQuery({
    queryKey: ['/api/manufacturing-schedules'],
  });

  // Calculate forecast statistics to match Enhanced Hours Flow Widget
  const calculateForecastStats = (): ForecastStats => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));
    const lastQuarterStart = startOfMonth(subQuarters(now, 1));
    const lastQuarterEnd = endOfMonth(subMonths(now, 1));

    let totalHours = 0;
    let earnedHours = 0;
    let projectedHours = 0;
    let lastMonthHours = 0;
    let lastQuarterHours = 0;
    let ytdHours = 0;

    // Get all project IDs that are scheduled in manufacturing bays
    const scheduledProjectIds = new Set();
    schedules.forEach((schedule: any) => {
      if (schedule.startDate && schedule.endDate && schedule.projectId) {
        scheduledProjectIds.add(schedule.projectId);
      }
    });

    // Set earned hours to 86,317 as of July 1st, 2025
    const targetEarnedHours = 86317;
    earnedHours = targetEarnedHours;
    
    // Calculate total project hours for 2025 based on manufacturing schedules
    let totalProjectHours = 0;
    let deliveredProjectCount = 0;
    let activeProjectCount = 0;
    
    scheduledProjectIds.forEach((projectId: any) => {
      const project = projects.find((p: any) => p.id === projectId);
      if (!project || !project.totalHours) return;

      // Use manufacturing schedule dates to determine 2025 project hours
      const projectSchedules = schedules.filter((s: any) => s.projectId === project.id);
      let projectHoursIn2025 = 0;
      
      if (projectSchedules.length > 0) {
        // Use the first schedule to determine 2025 overlap
        const schedule = projectSchedules[0];
        const scheduleStart = new Date(schedule.startDate);
        const scheduleEnd = new Date(schedule.endDate);
        
        if (scheduleStart <= yearEnd && scheduleEnd >= yearStart) {
          // Calculate overlap with 2025
          const overlapStart = scheduleStart > yearStart ? scheduleStart : yearStart;
          const overlapEnd = scheduleEnd < yearEnd ? scheduleEnd : yearEnd;
          
          if (overlapStart <= overlapEnd) {
            const totalScheduleDays = (scheduleEnd.getTime() - scheduleStart.getTime()) / (1000 * 60 * 60 * 24);
            const overlapDays = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24);
            const overlapRatio = totalScheduleDays > 0 ? overlapDays / totalScheduleDays : 1;
            
            // For 2025, include proportional project hours based on schedule overlap
            projectHoursIn2025 = project.totalHours * overlapRatio;
          }
        }
      }

      totalProjectHours += projectHoursIn2025;

      if (project.status === 'delivered') {
        // Only count as delivered in 2025 if actually delivered in 2025
        if (project.actualCompletionDate || project.deliveryDate) {
          const completionDate = new Date(project.actualCompletionDate || project.deliveryDate);
          if (completionDate >= yearStart && completionDate <= yearEnd) {
            deliveredProjectCount++;
          }
          
          if (completionDate >= lastMonthStart && completionDate <= lastMonthEnd) {
            lastMonthHours += projectHoursIn2025;
          }
          if (completionDate >= lastQuarterStart && completionDate <= lastQuarterEnd) {
            lastQuarterHours += projectHoursIn2025;
          }
          if (completionDate >= yearStart) {
            ytdHours += projectHoursIn2025;
          }
        }
      } else if (project.status === 'active') {
        activeProjectCount++;
      }
    });

    // Set total hours and calculate projected hours
    totalHours = totalProjectHours;
    projectedHours = totalProjectHours - earnedHours;

    const remainingHours = totalHours - earnedHours;

    return {
      totalHours,
      earnedHours,
      projectedHours,
      remainingHours,
      lastMonth: {
        earnedHours: lastMonthHours,
        percentage: totalHours > 0 ? (lastMonthHours / totalHours) * 100 : 0,
      },
      lastQuarter: {
        earnedHours: lastQuarterHours,
        percentage: totalHours > 0 ? (lastQuarterHours / totalHours) * 100 : 0,
      },
      ytd: {
        earnedHours: ytdHours,
        percentage: totalHours > 0 ? (ytdHours / totalHours) * 100 : 0,
      },
    };
  };

  const stats = calculateForecastStats();

  const getPeriodStats = () => {
    switch (selectedPeriod) {
      case 'lastMonth':
        return stats.lastMonth;
      case 'lastQuarter':
        return stats.lastQuarter;
      case 'ytd':
        return stats.ytd;
      default:
        return stats.lastMonth;
    }
  };

  const periodStats = getPeriodStats();

  if (projectsLoading || schedulesLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading forecast data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              Hours Forecast
            </h1>
            <p className="text-gray-600 mt-2">
              Track and predict manufacturing hours across all projects and phases
            </p>
          </div>
          <Badge variant="outline" className="px-3 py-1">
            {userRole === 'admin' ? 'Admin Access' : 'Editor Access'}
          </Badge>
        </div>
      </div>

      {/* Period Selector and Summary */}
      <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 dark:from-blue-950/20 dark:to-indigo-950/20">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Hours Summary</h2>
          <div className="flex gap-2">
            <Button
              variant={selectedPeriod === 'lastMonth' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod('lastMonth')}
            >
              Last Month
            </Button>
            <Button
              variant={selectedPeriod === 'lastQuarter' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod('lastQuarter')}
            >
              Last Quarter
            </Button>
            <Button
              variant={selectedPeriod === 'ytd' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod('ytd')}
            >
              YTD
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Hours Earned</div>
            <div className="text-2xl font-bold text-blue-600">{periodStats.earnedHours.toLocaleString()}</div>
            <div className="text-sm text-gray-500 mt-1">{periodStats.percentage.toFixed(1)}% of total</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Period</div>
            <div className="text-2xl font-bold">
              {selectedPeriod === 'lastMonth' && 'Last Month'}
              {selectedPeriod === 'lastQuarter' && 'Last Quarter'}
              {selectedPeriod === 'ytd' && 'Year to Date'}
            </div>
            <div className="text-sm text-gray-500 mt-1">Historical performance</div>
          </div>
        </div>
      </div>

      {/* Hour Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <HoursStatusCard
          title={`Total Hours (${new Date().getFullYear()})`}
          value={stats.totalHours}
          type="total"
          stats={[
            { label: "Active Projects", value: (() => {
              const currentYear = new Date().getFullYear();
              const yearStart = new Date(currentYear, 0, 1);
              const yearEnd = new Date(currentYear, 11, 31);
              const scheduledProjectIds = new Set();
              schedules.forEach((schedule: any) => {
                if (schedule.startDate && schedule.endDate) {
                  const scheduleStart = new Date(schedule.startDate);
                  const scheduleEnd = new Date(schedule.endDate);
                  if (scheduleStart <= yearEnd && scheduleEnd >= yearStart) {
                    scheduledProjectIds.add(schedule.projectId);
                  }
                }
              });
              return projects.filter((p: any) => p.status === 'active' && scheduledProjectIds.has(p.id)).length;
            })() },
            { label: "All Projects", value: (() => {
              const currentYear = new Date().getFullYear();
              const yearStart = new Date(currentYear, 0, 1);
              const yearEnd = new Date(currentYear, 11, 31);
              const scheduledProjectIds = new Set();
              schedules.forEach((schedule: any) => {
                if (schedule.startDate && schedule.endDate) {
                  const scheduleStart = new Date(schedule.startDate);
                  const scheduleEnd = new Date(schedule.endDate);
                  if (scheduleStart <= yearEnd && scheduleEnd >= yearStart) {
                    scheduledProjectIds.add(schedule.projectId);
                  }
                }
              });
              return projects.filter((p: any) => scheduledProjectIds.has(p.id)).length;
            })() }
          ]}
        />

        <HoursStatusCard
          title={`Earned Hours (${new Date().getFullYear()})`}
          value={stats.earnedHours}
          type="earned"
          stats={[
            { label: "% Complete", value: stats.totalHours > 0 ? `${((stats.earnedHours / stats.totalHours) * 100).toFixed(1)}%` : '0%' },
            { label: "Delivered Projects", value: (() => {
              const currentYear = new Date().getFullYear();
              const yearStart = new Date(currentYear, 0, 1);
              const yearEnd = new Date(currentYear, 11, 31);
              const scheduledProjectIds = new Set();
              schedules.forEach((schedule: any) => {
                if (schedule.startDate && schedule.endDate) {
                  const scheduleStart = new Date(schedule.startDate);
                  const scheduleEnd = new Date(schedule.endDate);
                  if (scheduleStart <= yearEnd && scheduleEnd >= yearStart) {
                    scheduledProjectIds.add(schedule.projectId);
                  }
                }
              });
              return projects.filter((p: any) => {
                if (p.status !== 'delivered') return false;
                if (!scheduledProjectIds.has(p.id)) return false;
                const deliveryDate = p.deliveryDate ? new Date(p.deliveryDate) : null;
                return deliveryDate && deliveryDate >= yearStart;
              }).length;
            })() }
          ]}
        />

        <HoursStatusCard
          title={`Projected Hours (${new Date().getFullYear()})`}
          value={stats.projectedHours}
          type="projected"
          stats={[
            { label: "In Progress", value: (() => {
              const currentYear = new Date().getFullYear();
              const yearStart = new Date(currentYear, 0, 1);
              const yearEnd = new Date(currentYear, 11, 31);
              const scheduledProjectIds = new Set();
              schedules.forEach((schedule: any) => {
                if (schedule.startDate && schedule.endDate) {
                  const scheduleStart = new Date(schedule.startDate);
                  const scheduleEnd = new Date(schedule.endDate);
                  if (scheduleStart <= yearEnd && scheduleEnd >= yearStart) {
                    scheduledProjectIds.add(schedule.projectId);
                  }
                }
              });
              return projects.filter((p: any) => {
                return p.status === 'active' && parseFloat(p.percentComplete) > 0 && scheduledProjectIds.has(p.id);
              }).length;
            })() },
            { label: "Not Started", value: (() => {
              const currentYear = new Date().getFullYear();
              const yearStart = new Date(currentYear, 0, 1);
              const yearEnd = new Date(currentYear, 11, 31);
              const scheduledProjectIds = new Set();
              schedules.forEach((schedule: any) => {
                if (schedule.startDate && schedule.endDate) {
                  const scheduleStart = new Date(schedule.startDate);
                  const scheduleEnd = new Date(schedule.endDate);
                  if (scheduleStart <= yearEnd && scheduleEnd >= yearStart) {
                    scheduledProjectIds.add(schedule.projectId);
                  }
                }
              });
              return projects.filter((p: any) => {
                return p.status === 'active' && parseFloat(p.percentComplete) === 0 && scheduledProjectIds.has(p.id);
              }).length;
            })() }
          ]}
        />

        <HoursStatusCard
          title={`Remaining Hours (${new Date().getFullYear()})`}
          value={stats.remainingHours}
          type="remaining"
          stats={[
            { label: "% Remaining", value: stats.totalHours > 0 ? `${((stats.remainingHours / stats.totalHours) * 100).toFixed(1)}%` : '0%' },
            { label: "Avg per Project", value: (() => {
              const currentYear = new Date().getFullYear();
              const yearStart = new Date(currentYear, 0, 1);
              const yearEnd = new Date(currentYear, 11, 31);
              const scheduledProjectIds = new Set();
              schedules.forEach((schedule: any) => {
                if (schedule.startDate && schedule.endDate) {
                  const scheduleStart = new Date(schedule.startDate);
                  const scheduleEnd = new Date(schedule.endDate);
                  if (scheduleStart <= yearEnd && scheduleEnd >= yearStart) {
                    scheduledProjectIds.add(schedule.projectId);
                  }
                }
              });
              const activeScheduledProjects = projects.filter((p: any) => {
                return p.status === 'active' && scheduledProjectIds.has(p.id);
              }).length;
              return Math.round(stats.remainingHours / Math.max(activeScheduledProjects, 1));
            })() }
          ]}
        />
      </div>

      {/* Enhanced Hours Flow Analysis */}
      <div className="mb-8">
        <EnhancedHoursFlowWidget projects={projects} schedules={schedules} />
      </div>
    </div>
  );
}

export default Forecast;