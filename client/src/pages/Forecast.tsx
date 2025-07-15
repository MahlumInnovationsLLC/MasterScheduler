import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePermissions } from '@/components/PermissionsManager';
import { Redirect } from 'wouter';
import { Clock, TrendingUp, Calendar, Activity, ChevronRight, BarChart3, FileText, Settings, Plus, Factory, Paintbrush, Cpu, TestTube, CheckCircle, Wrench, Package, Monitor } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { EnhancedHoursFlowWidget } from '@/components/EnhancedHoursFlowWidget';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, startOfMonth, endOfMonth, subMonths, subQuarters, startOfYear, differenceInDays, differenceInCalendarDays, addDays, startOfWeek, endOfWeek } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';

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

interface DepartmentSandChartsProps {
  projects: any[];
  schedules: any[];
  departmentCapacity: any[];
  selectedLocation: 'cfalls' | 'libby';
  setSelectedLocation: (loc: 'cfalls' | 'libby') => void;
  selectedDepartment: string;
  setSelectedDepartment: (dept: string) => void;
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

// Department Sand Charts Component
function DepartmentSandCharts({
  projects,
  schedules,
  departmentCapacity,
  selectedLocation,
  setSelectedLocation,
  selectedDepartment,
  setSelectedDepartment
}: DepartmentSandChartsProps) {
  const departments = [
    { id: 'mech', name: 'MECH Shop', icon: <Wrench className="h-4 w-4" />, color: 'orange' },
    { id: 'fab', name: 'Fabrication', icon: <Factory className="h-4 w-4" />, color: 'blue' },
    { id: 'paint', name: 'Paint', icon: <Paintbrush className="h-4 w-4" />, color: 'red' },
    { id: 'wrap', name: 'Wrap', icon: <Package className="h-4 w-4" />, color: 'purple' },
    { id: 'production', name: 'Production', icon: <Settings className="h-4 w-4" />, color: 'green' },
    { id: 'it', name: 'IT', icon: <Monitor className="h-4 w-4" />, color: 'indigo' },
    { id: 'ntc', name: 'NTC', icon: <TestTube className="h-4 w-4" />, color: 'cyan' },
    { id: 'qc', name: 'QC', icon: <CheckCircle className="h-4 w-4" />, color: 'amber' }
  ];

  // Calculate department utilization data
  const calculateDepartmentUtilization = (deptId: string, location: string) => {
    const now = new Date();
    const weeksToShow = 26; // Show 6 months
    const weekData = [];

    // Get department capacity
    const deptCapacity = departmentCapacity.find((d: any) => 
      d.department === deptId.toUpperCase() && 
      d.location?.toLowerCase().includes(location === 'cfalls' ? 'columbia' : 'libby')
    );

    const weeklyCapacity = deptCapacity?.weeklyHours || 0;

    for (let week = 0; week < weeksToShow; week++) {
      const weekStart = startOfWeek(addDays(now, week * 7));
      const weekEnd = endOfWeek(weekStart);
      let allocatedHours = 0;

      // Calculate allocated hours for this week
      projects.forEach((project: any) => {
        if (!project || !project.totalHours) return;

        // Check if project is in this department phase during this week
        let phaseStart: Date | null = null;
        let phaseEnd: Date | null = null;

        switch (deptId) {
          case 'mech':
            if (project.mechShop && project.fabricationStart) {
              phaseStart = new Date(project.mechShop);
              phaseEnd = new Date(project.fabricationStart);
            }
            break;
          case 'fab':
            if (project.fabricationStart && project.paintStart) {
              phaseStart = new Date(project.fabricationStart);
              phaseEnd = new Date(project.paintStart);
            }
            break;
          case 'paint':
            if (project.paintStart && project.productionStart) {
              phaseStart = new Date(project.paintStart);
              phaseEnd = new Date(project.productionStart);
            }
            break;
          case 'production':
            if (project.productionStart && project.itStart) {
              phaseStart = new Date(project.productionStart);
              phaseEnd = new Date(project.itStart);
            }
            break;
          case 'it':
            if (project.itStart && project.ntcTestingDate) {
              phaseStart = new Date(project.itStart);
              phaseEnd = new Date(project.ntcTestingDate);
            }
            break;
          case 'ntc':
            if (project.ntcTestingDate && project.qcStartDate) {
              phaseStart = new Date(project.ntcTestingDate);
              phaseEnd = new Date(project.qcStartDate);
            }
            break;
          case 'qc':
            if (project.qcStartDate && project.shipDate) {
              phaseStart = new Date(project.qcStartDate);
              phaseEnd = new Date(project.shipDate);
            }
            break;
          case 'wrap':
            if (project.wrapDate) {
              phaseStart = new Date(project.wrapDate);
              phaseEnd = addDays(phaseStart, 7); // Assume 1 week for wrap
            }
            break;
        }

        if (phaseStart && phaseEnd && phaseStart <= weekEnd && phaseEnd >= weekStart) {
          // Calculate phase hours based on percentage allocations
          const phaseDays = differenceInCalendarDays(phaseEnd, phaseStart) || 1;
          const phaseHours = project.totalHours * (getDepartmentPercentage(deptId) / 100);
          const dailyHours = phaseHours / phaseDays;

          // Calculate overlap days with this week
          const overlapStart = phaseStart > weekStart ? phaseStart : weekStart;
          const overlapEnd = phaseEnd < weekEnd ? phaseEnd : weekEnd;
          const overlapDays = differenceInCalendarDays(overlapEnd, overlapStart) + 1;

          allocatedHours += dailyHours * overlapDays;
        }
      });

      weekData.push({
        week: format(weekStart, 'MMM d'),
        allocated: Math.round(allocatedHours),
        capacity: weeklyCapacity,
        utilization: weeklyCapacity > 0 ? Math.round((allocatedHours / weeklyCapacity) * 100) : 0
      });
    }

    return weekData;
  };

  const getDepartmentPercentage = (deptId: string): number => {
    switch (deptId) {
      case 'fab': return 27;
      case 'paint': return 7;
      case 'production': return 60;
      case 'it': return 7;
      case 'ntc': return 7;
      case 'qc': return 7;
      case 'mech': return 10; // Assumed percentage
      case 'wrap': return 5; // Assumed percentage
      default: return 10;
    }
  };

  const currentDept = departments.find(d => d.id === selectedDepartment);
  const utilizationData = calculateDepartmentUtilization(selectedDepartment, selectedLocation);

  return (
    <div className="space-y-6">
      {/* Location Tabs */}
      <div className="flex gap-4 mb-6">
        <Button
          variant={selectedLocation === 'cfalls' ? 'default' : 'outline'}
          onClick={() => setSelectedLocation('cfalls')}
        >
          Columbia Falls
        </Button>
        <Button
          variant={selectedLocation === 'libby' ? 'default' : 'outline'}
          onClick={() => setSelectedLocation('libby')}
        >
          Libby
        </Button>
      </div>

      {/* Department Tabs */}
      <div className="grid grid-cols-8 gap-2 mb-6">
        {departments.map((dept) => (
          <Button
            key={dept.id}
            variant={selectedDepartment === dept.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedDepartment(dept.id)}
            className="flex items-center gap-1"
          >
            {dept.icon}
            <span className="hidden md:inline">{dept.name}</span>
          </Button>
        ))}
      </div>

      {/* Sand Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {currentDept?.icon}
            {currentDept?.name} - {selectedLocation === 'cfalls' ? 'Columbia Falls' : 'Libby'}
          </CardTitle>
          <CardDescription>
            Capacity vs Allocated Manufacturing Hours
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            {/* Simple chart visualization - in real app would use Recharts */}
            <div className="relative h-full border rounded-lg p-4">
              <div className="absolute top-2 right-2 flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span>Allocated Hours</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-500 rounded"></div>
                  <span>Capacity</span>
                </div>
              </div>
              
              {/* Chart area */}
              <div className="mt-8 h-64 flex items-end justify-between gap-1">
                {utilizationData.slice(0, 12).map((week, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div className="w-full relative" style={{ height: '240px' }}>
                      {/* Capacity bar */}
                      <div 
                        className="absolute bottom-0 w-full bg-orange-200 rounded-t"
                        style={{ height: `${(week.capacity / Math.max(...utilizationData.map(w => w.capacity))) * 100}%` }}
                      />
                      {/* Allocated bar */}
                      <div 
                        className="absolute bottom-0 w-full bg-blue-500 rounded-t"
                        style={{ height: `${(week.allocated / Math.max(...utilizationData.map(w => w.capacity))) * 100}%` }}
                      />
                    </div>
                    <div className="text-xs mt-2 rotate-45 origin-left whitespace-nowrap">
                      {week.week}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Average Utilization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(utilizationData.reduce((sum, w) => sum + w.utilization, 0) / utilizationData.length)}%
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Peak Week</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.max(...utilizationData.map(w => w.allocated))} hrs
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Weekly Capacity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {utilizationData[0]?.capacity || 0} hrs
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function Forecast() {
  const { userRole } = usePermissions();
  const queryClient = useQueryClient();
  const [selectedPeriod, setSelectedPeriod] = useState<'lastMonth' | 'lastQuarter' | 'ytd'>('lastMonth');
  const [engineeringHoursPerMonth, setEngineeringHoursPerMonth] = useState<number>(2000);
  const [showEngineeringSettings, setShowEngineeringSettings] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'department-sand'>('overview');
  const [selectedLocation, setSelectedLocation] = useState<'cfalls' | 'libby'>('cfalls');
  const [selectedDepartment, setSelectedDepartment] = useState<'mech' | 'fab' | 'paint' | 'wrap' | 'production' | 'it' | 'ntc' | 'qc'>('mech');

  // Check permissions - only allow Editor and Admin roles
  if (userRole !== 'editor' && userRole !== 'admin') {
    return <Redirect to="/" />;
  }

  // Fetch user settings from database
  const { data: userSettings } = useQuery({
    queryKey: ['/api/user-settings'],
  });

  // Mutation for saving user settings
  const saveSettingsMutation = useMutation({
    mutationFn: (settings: { engineering_hours: number; capacity_hours: number }) =>
      apiRequest('POST', '/api/user-settings', settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-settings'] });
    },
  });

  // Update local state when user settings are loaded
  useEffect(() => {
    if (userSettings) {
      setEngineeringHoursPerMonth(userSettings.engineering_hours || 2000);
    }
  }, [userSettings]);

  // Update settings in database when engineering hours change
  useEffect(() => {
    if (userSettings && engineeringHoursPerMonth !== (userSettings.engineering_hours || 2000)) {
      const timeoutId = setTimeout(() => {
        saveSettingsMutation.mutate({
          engineering_hours: engineeringHoursPerMonth,
          capacity_hours: userSettings.capacity_hours || 130000,
        });
      }, 1000); // Debounce to avoid too many API calls

      return () => clearTimeout(timeoutId);
    }
  }, [engineeringHoursPerMonth, userSettings, saveSettingsMutation]);

  // Fetch projects data
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['/api/projects'],
  });

  // Fetch manufacturing schedules
  const { data: schedules = [], isLoading: schedulesLoading } = useQuery({
    queryKey: ['/api/manufacturing-schedules'],
  });

  // Fetch department capacity data
  const { data: departmentCapacity = [], isLoading: capacityLoading } = useQuery({
    queryKey: ['/api/capacity/departments'],
  });

  // Calculate forecast statistics using REAL project hours data
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
    
    // Calculate REAL total project hours based on actual project data
    let totalProjectHours = 0;
    let deliveredProjectHours = 0;
    let inProgressProjectHours = 0;
    let scheduledProjectHours = 0;
    
    // Calculate REAL hours for all scheduled projects
    projects.forEach((project: any) => {
      if (!project.totalHours || project.totalHours <= 0) return;

      const isScheduled = scheduledProjectIds.has(project.id);
      
      if (isScheduled) {
        // Get manufacturing schedule for this project
        const projectSchedules = schedules.filter((s: any) => s.projectId === project.id);
        
        if (projectSchedules.length > 0) {
          // Use the first schedule to determine project timeline
          const schedule = projectSchedules[0];
          const scheduleStart = new Date(schedule.startDate);
          const scheduleEnd = new Date(schedule.endDate);
          
          // Calculate the portion of hours that fall within the current year
          if (scheduleStart <= yearEnd && scheduleEnd >= yearStart) {
            const overlapStart = scheduleStart > yearStart ? scheduleStart : yearStart;
            const overlapEnd = scheduleEnd < yearEnd ? scheduleEnd : yearEnd;
            
            if (overlapStart <= overlapEnd) {
              const totalScheduleDays = (scheduleEnd.getTime() - scheduleStart.getTime()) / (1000 * 60 * 60 * 24);
              const overlapDays = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24);
              const overlapRatio = totalScheduleDays > 0 ? overlapDays / totalScheduleDays : 1;
              
              // Use ACTUAL project hours (no arbitrary scaling)
              const projectHoursInYear = project.totalHours * overlapRatio;
              scheduledProjectHours += projectHoursInYear;
              
              // Track delivered vs in-progress hours
              if (project.status === 'delivered') {
                deliveredProjectHours += projectHoursInYear;
                
                const deliveryDate = new Date(project.deliveryDate || project.actualCompletionDate);
                if (deliveryDate >= lastMonthStart && deliveryDate <= lastMonthEnd) {
                  lastMonthHours += projectHoursInYear;
                }
                if (deliveryDate >= lastQuarterStart && deliveryDate <= lastQuarterEnd) {
                  lastQuarterHours += projectHoursInYear;
                }
                if (deliveryDate >= yearStart && deliveryDate <= now) {
                  ytdHours += projectHoursInYear;
                }
              } else {
                inProgressProjectHours += projectHoursInYear;
              }
            }
          }
        }
      }
    });

    // Log real project hours data
    console.log('=== REAL PROJECT HOURS DATA ===');
    console.log('Scheduled project hours:', scheduledProjectHours);
    console.log('Delivered project hours:', deliveredProjectHours);
    console.log('In-progress project hours:', inProgressProjectHours);
    console.log('Total scheduled projects:', scheduledProjectIds.size);

    // Calculate engineering hours for remaining months of 2025 (July - December = 6 months)
    const remainingMonths = 6;
    const totalEngineeringHours = engineeringHoursPerMonth * remainingMonths;
    
    // Use REAL project hours data
    totalProjectHours = scheduledProjectHours;
    
    // Calculate total hours using real data
    totalHours = baselineAccumulatedHours + totalEngineeringHours + totalProjectHours;
    earnedHours = baselineAccumulatedHours + deliveredProjectHours;
    projectedHours = inProgressProjectHours + totalEngineeringHours;
    
    // Remaining hours = total scheduled hours - already delivered hours
    const remainingHours = totalProjectHours - deliveredProjectHours;
    
    console.log('=== REAL HOURS CALCULATION ===');
    console.log('Baseline accumulated:', baselineAccumulatedHours);
    console.log('Engineering hours:', totalEngineeringHours);
    console.log('Total project hours:', totalProjectHours);
    console.log('Delivered hours:', deliveredProjectHours);
    console.log('In-progress hours:', inProgressProjectHours);
    console.log('Total hours:', totalHours);
    console.log('Earned hours:', earnedHours);
    console.log('Remaining hours:', remainingHours);

    return {
      totalHours,
      earnedHours,
      projectedHours,
      remainingHours,
      engineeringHours: totalEngineeringHours,
      manufacturingHours: totalProjectHours,
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

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
        <TabsList className="grid w-fit grid-cols-2">
          <TabsTrigger value="overview" className="px-8">
            <BarChart3 className="h-4 w-4 mr-2" />
            Hours Overview
          </TabsTrigger>
          <TabsTrigger value="department-sand" className="px-8">
            <Factory className="h-4 w-4 mr-2" />
            Department Sand Charts
          </TabsTrigger>
        </TabsList>

        {/* Hours Overview Tab (Original Content) */}
        <TabsContent value="overview" className="space-y-6">
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
        </TabsContent>

        {/* Department Sand Charts Tab */}
        <TabsContent value="department-sand" className="space-y-6">
          <DepartmentSandCharts
            projects={projects}
            schedules={schedules}
            departmentCapacity={departmentCapacity}
            selectedLocation={selectedLocation}
            setSelectedLocation={setSelectedLocation}
            selectedDepartment={selectedDepartment}
            setSelectedDepartment={setSelectedDepartment}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default Forecast;