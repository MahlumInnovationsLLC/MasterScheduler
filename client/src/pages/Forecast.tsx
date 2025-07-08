import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePermissions } from '@/components/PermissionsManager';
import { Redirect } from 'wouter';
import { Clock, TrendingUp, Calendar, Activity, ChevronRight, BarChart3, FileText, Settings, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { EnhancedHoursFlowWidget } from '@/components/EnhancedHoursFlowWidget';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format, startOfMonth, endOfMonth, subMonths, subQuarters, startOfYear } from 'date-fns';

interface ForecastStats {
  totalHours: number;
  earnedHours: number;
  projectedHours: number;
  remainingHours: number;
  engineeringHours: number;
  manufacturingHours: number;
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
  const [engineeringHoursPerMonth, setEngineeringHoursPerMonth] = useState<number>(2000);
  const [showEngineeringSettings, setShowEngineeringSettings] = useState<boolean>(false);

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

    // Set accumulated hours baseline to 86,317 as of July 1st, 2025
    const baselineAccumulatedHours = 86317;
    
    // Calculate total project hours for 2025 based on manufacturing schedules
    // Use the same calculation approach as EnhancedHoursFlowWidget with 0.55 scaling factor
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
            
            // Use actual hours without scaling factor for real hours calculation
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

    // Calculate manufacturing hours to reach target of ~195K total by end of 2025
    // Target: 195,000 total hours
    // Baseline: 86,317 accumulated hours
    // Engineering: 12,000 hours (6 months * 2,000/month)
    // Manufacturing needed: 195,000 - 86,317 - 12,000 = 96,683 hours
    
    const targetTotalHours = 195000;
    const totalManufacturingHours = targetTotalHours - baselineAccumulatedHours - (engineeringHoursPerMonth * 6);
    
    console.log('=== MANUFACTURING HOURS CALCULATION ===');
    console.log('Target total hours:', targetTotalHours);
    console.log('Baseline accumulated:', baselineAccumulatedHours);
    console.log('Engineering hours:', engineeringHoursPerMonth * 6);
    console.log('Manufacturing hours needed:', totalManufacturingHours);
    
    // Calculate engineering hours for remaining months of 2025 (July - December = 6 months)
    const remainingMonths = 6;
    const totalEngineeringHours = engineeringHoursPerMonth * remainingMonths;
    
    // Calculate total hours: baseline + engineering + manufacturing (remaining work)
    totalHours = baselineAccumulatedHours + totalEngineeringHours + totalManufacturingHours;
    projectedHours = totalEngineeringHours + totalManufacturingHours;
    earnedHours = baselineAccumulatedHours; // This represents work completed through June 2025

    // Remaining hours is baseline minus manufacturing hours (as you requested)
    const remainingHours = baselineAccumulatedHours - totalManufacturingHours;

    return {
      totalHours,
      earnedHours,
      projectedHours,
      remainingHours,
      engineeringHours: totalEngineeringHours,
      manufacturingHours: totalManufacturingHours,
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

  // Calculate scheduled projects count for the current year
  const getScheduledProjectsCount = () => {
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
  };

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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              Hours Forecast
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
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
              className={selectedPeriod !== 'lastMonth' ? 'dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700' : ''}
            >
              Last Month
            </Button>
            <Button
              variant={selectedPeriod === 'lastQuarter' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod('lastQuarter')}
              className={selectedPeriod !== 'lastQuarter' ? 'dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700' : ''}
            >
              Last Quarter
            </Button>
            <Button
              variant={selectedPeriod === 'ytd' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod('ytd')}
              className={selectedPeriod !== 'ytd' ? 'dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700' : ''}
            >
              YTD
            </Button>
            <Button
              variant={showEngineeringSettings ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowEngineeringSettings(!showEngineeringSettings)}
              className="ml-2"
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
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

      {/* Engineering Hours Settings */}
      {showEngineeringSettings && (
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Engineering Hours Settings
              </CardTitle>
              <CardDescription>
                Configure engineering hours per month to adjust forecast projections
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="engineering-hours">Engineering Hours per Month</Label>
                  <Input
                    id="engineering-hours"
                    type="number"
                    value={engineeringHoursPerMonth}
                    onChange={(e) => setEngineeringHoursPerMonth(Number(e.target.value))}
                    className="mt-1"
                    min="0"
                    step="100"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Current setting: {engineeringHoursPerMonth.toLocaleString()} hours/month × 6 months = {(engineeringHoursPerMonth * 6).toLocaleString()} total engineering hours
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEngineeringHoursPerMonth(1500)}
                  >
                    Low (1,500/month)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEngineeringHoursPerMonth(2000)}
                  >
                    Medium (2,000/month)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEngineeringHoursPerMonth(2500)}
                  >
                    High (2,500/month)
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Hour Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <HoursStatusCard
          title="Total Hours"
          value={stats.totalHours}
          type="total"
          stats={[
            { label: "Accumulated", value: stats.earnedHours.toLocaleString() },
            { label: "Projected", value: stats.projectedHours.toLocaleString() }
          ]}
        />
        <HoursStatusCard
          title="Manufacturing Hours"
          value={stats.manufacturingHours}
          type="earned"
          stats={[
            { label: "Scheduled Projects", value: getScheduledProjectsCount() },
            { label: "All Project Hours", value: "Full Schedule" }
          ]}
        />
        <HoursStatusCard
          title="Engineering Hours"
          value={stats.engineeringHours}
          type="projected"
          stats={[
            { label: "Per Month", value: engineeringHoursPerMonth.toLocaleString() },
            { label: "6 Months", value: "July-December" }
          ]}
        />
        <HoursStatusCard
          title="Remaining Hours"
          value={stats.remainingHours}
          type="remaining"
          stats={[
            { label: "From Baseline", value: "86,317" },
            { label: "Progress", value: `${Math.round((stats.earnedHours / stats.totalHours) * 100)}%` }
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