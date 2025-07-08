import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity, TrendingUp, Calendar, Clock, AlertCircle, Lightbulb, BarChart } from 'lucide-react';
import { AreaChart, Area, BarChart as RechartsBarChart, Bar, Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts';
import { format, addWeeks, addMonths, addQuarters, addYears, startOfWeek, startOfMonth, startOfQuarter, startOfYear, endOfWeek, endOfMonth, endOfQuarter, endOfYear, subWeeks, subMonths, subQuarters, subYears, differenceInDays } from 'date-fns';

interface HoursFlowData {
  period: string;
  earned: number;
  projected: number;
  capacity: number;
  cumulative: number;
  phases: {
    fab: number;
    paint: number;
    production: number;
    it: number;
    ntc: number;
    qc: number;
  };
}

interface HoursFlowInsight {
  type: 'positive' | 'negative' | 'neutral';
  message: string;
  icon: React.ReactNode;
}

interface EnhancedHoursFlowWidgetProps {
  projects: any[];
  schedules: any[];
}

export function EnhancedHoursFlowWidget({ projects, schedules }: EnhancedHoursFlowWidgetProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [selectedTimeframe, setSelectedTimeframe] = useState<'historical' | 'future'>('future');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [hoursFlowData, setHoursFlowData] = useState<HoursFlowData[]>([]);
  const [insights, setInsights] = useState<HoursFlowInsight[]>([]);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [manualCapacity, setManualCapacity] = useState<number | null>(null);
  const [showCapacityEdit, setShowCapacityEdit] = useState(false);
  const [visibleLines, setVisibleLines] = useState({
    projected: true,
    capacity: true,
    cumulative: true
  });

  // Generate periods based on timeframe and selected year
  const generateHistoricalPeriods = (year: number, period: 'week' | 'month' | 'quarter' | 'year') => {
    const periods = [];
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);
    const now = new Date();
    
    if (period === 'year') {
      // For year view, show the selected year only
      periods.push({ 
        start: yearStart, 
        end: yearEnd > now ? now : yearEnd, 
        label: year.toString() 
      });
    } else {
      // Generate periods within the selected year
      let currentDate = yearStart;
      
      while (currentDate <= yearEnd && currentDate <= now) {
        let start, end, label;
        
        switch (period) {
          case 'week':
            start = startOfWeek(currentDate);
            end = endOfWeek(currentDate);
            if (end > yearEnd) end = yearEnd;
            if (end > now) end = now;
            label = format(start, 'MMM dd');
            currentDate = addWeeks(currentDate, 1);
            break;
          case 'month':
            start = startOfMonth(currentDate);
            end = endOfMonth(currentDate);
            if (end > yearEnd) end = yearEnd;
            if (end > now) end = now;
            label = format(start, 'MMM');
            currentDate = addMonths(currentDate, 1);
            break;
          case 'quarter':
            start = startOfQuarter(currentDate);
            end = endOfQuarter(currentDate);
            if (end > yearEnd) end = yearEnd;
            if (end > now) end = now;
            label = `Q${Math.floor(start.getMonth() / 3) + 1}`;
            currentDate = addQuarters(currentDate, 1);
            break;
        }
        
        if (start <= now && start <= yearEnd) {
          periods.push({ start, end, label });
        }
      }
    }
    
    return periods;
  };

  const generateFuturePeriods = (year: number, period: 'week' | 'month' | 'quarter' | 'year') => {
    const periods = [];
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);
    const now = new Date();
    
    if (period === 'year') {
      // For year view, show the selected year only
      periods.push({ 
        start: now < yearStart ? yearStart : now, 
        end: yearEnd, 
        label: year.toString() 
      });
    } else {
      // Generate periods within the selected year
      let currentDate = now < yearStart ? yearStart : now;
      
      while (currentDate <= yearEnd) {
        let start, end, label;
        
        switch (period) {
          case 'week':
            start = startOfWeek(currentDate);
            end = endOfWeek(currentDate);
            if (end > yearEnd) end = yearEnd;
            label = format(start, 'MMM dd');
            currentDate = addWeeks(currentDate, 1);
            break;
          case 'month':
            start = startOfMonth(currentDate);
            end = endOfMonth(currentDate);
            if (end > yearEnd) end = yearEnd;
            label = format(start, 'MMM');
            currentDate = addMonths(currentDate, 1);
            break;
          case 'quarter':
            start = startOfQuarter(currentDate);
            end = endOfQuarter(currentDate);
            if (end > yearEnd) end = yearEnd;
            label = `Q${Math.floor(start.getMonth() / 3) + 1}`;
            currentDate = addQuarters(currentDate, 1);
            break;
        }
        
        if (start <= yearEnd) {
          periods.push({ start, end, label });
        }
      }
    }
    
    return periods;
  };

  // Calculate hours for a specific phase within a period
  const calculatePhaseHours = (project: any, phase: string, periodStart: Date, periodEnd: Date): number => {
    let phaseStart: Date | null = null;
    let phaseEnd: Date | null = null;
    let phasePercentage = 0;

    // Determine phase dates and percentages
    switch (phase) {
      case 'fab':
        phaseStart = project.fabricationStart ? new Date(project.fabricationStart) : null;
        phaseEnd = project.paintStart ? new Date(project.paintStart) : 
                  (project.productionStart ? new Date(project.productionStart) : null);
        phasePercentage = parseFloat(project.fabPercentage || '27');
        break;
      case 'paint':
        phaseStart = project.paintStart ? new Date(project.paintStart) : null;
        phaseEnd = project.productionStart ? new Date(project.productionStart) : null;
        phasePercentage = parseFloat(project.paintPercentage || '7');
        break;
      case 'production':
        phaseStart = project.productionStart ? new Date(project.productionStart) : null;
        phaseEnd = project.itStart ? new Date(project.itStart) : 
                  (project.ntcTestingDate ? new Date(project.ntcTestingDate) : null);
        phasePercentage = parseFloat(project.productionPercentage || '60');
        break;
      case 'it':
        phaseStart = project.itStart ? new Date(project.itStart) : null;
        phaseEnd = project.ntcTestingDate ? new Date(project.ntcTestingDate) : null;
        phasePercentage = parseFloat(project.itPercentage || '7');
        break;
      case 'ntc':
        phaseStart = project.ntcTestingDate ? new Date(project.ntcTestingDate) : null;
        phaseEnd = project.qcStartDate ? new Date(project.qcStartDate) : null;
        phasePercentage = parseFloat(project.ntcPercentage || '7');
        break;
      case 'qc':
        phaseStart = project.qcStartDate ? new Date(project.qcStartDate) : null;
        phaseEnd = project.shipDate ? new Date(project.shipDate) : 
                  (project.deliveryDate ? new Date(project.deliveryDate) : null);
        phasePercentage = parseFloat(project.qcPercentage || '7');
        break;
    }

    if (!phaseStart || !phaseEnd || !project.totalHours) return 0;

    // Calculate phase hours based on percentage
    const phaseHours = (project.totalHours * phasePercentage) / 100;

    // Check if phase overlaps with the period
    if (phaseEnd < periodStart || phaseStart > periodEnd) return 0;

    // Calculate the overlap
    const overlapStart = phaseStart > periodStart ? phaseStart : periodStart;
    const overlapEnd = phaseEnd < periodEnd ? phaseEnd : periodEnd;
    const phaseDuration = differenceInDays(phaseEnd, phaseStart) + 1;
    const overlapDuration = differenceInDays(overlapEnd, overlapStart) + 1;

    if (phaseDuration <= 0) return 0;

    // Return proportional hours based on overlap
    return (phaseHours * overlapDuration) / phaseDuration;
  };

  // Calculate hours flow data
  useEffect(() => {
    if (!projects || projects.length === 0 || !schedules) return;

    const now = new Date();
    const data: HoursFlowData[] = [];

    // Get all project IDs that are scheduled in manufacturing bays
    const scheduledProjectIds = new Set();
    schedules.forEach((schedule: any) => {
      if (schedule.startDate && schedule.endDate && schedule.projectId) {
        scheduledProjectIds.add(schedule.projectId);
      }
    });

    // Generate periods based on selection and selected year
    const periods = selectedTimeframe === 'historical' ? 
      generateHistoricalPeriods(selectedYear, selectedPeriod) : 
      generateFuturePeriods(selectedYear, selectedPeriod);

    periods.forEach(period => {
      let totalEarned = 0;
      let totalProjected = 0;
      const phaseHours = {
        fab: 0,
        paint: 0,
        production: 0,
        it: 0,
        ntc: 0,
        qc: 0
      };

      projects.forEach(project => {
        if (!project.totalHours) return;
        
        // Only include projects that are scheduled in manufacturing bays
        if (!scheduledProjectIds.has(project.id)) return;

        // For historical data, calculate earned hours
        if (selectedTimeframe === 'historical') {
          // Check if project was active during this period
          const projectStart = project.startDate ? new Date(project.startDate) : null;
          const projectEnd = project.deliveryDate ? new Date(project.deliveryDate) : 
                           (project.estimatedCompletionDate ? new Date(project.estimatedCompletionDate) : null);

          if (projectStart && projectEnd && projectStart <= period.end && projectEnd >= period.start) {
            // Calculate earned hours based on progress during this period
            const percentComplete = parseFloat(project.percentComplete || '0');
            const earnedHours = (project.totalHours * percentComplete) / 100;
            
            // For delivered projects, assign all earned hours to delivery period
            if (project.status === 'delivered' && projectEnd >= period.start && projectEnd <= period.end) {
              totalEarned += earnedHours;
            }

            // Add phase hours
            phaseHours.fab += calculatePhaseHours(project, 'fab', period.start, period.end);
            phaseHours.paint += calculatePhaseHours(project, 'paint', period.start, period.end);
            phaseHours.production += calculatePhaseHours(project, 'production', period.start, period.end);
            phaseHours.it += calculatePhaseHours(project, 'it', period.start, period.end);
            phaseHours.ntc += calculatePhaseHours(project, 'ntc', period.start, period.end);
            phaseHours.qc += calculatePhaseHours(project, 'qc', period.start, period.end);
          }
        } else {
          // For future data, use realistic monthly projections (17,000 hours per month)
          if (project.status === 'active' || project.status === 'pending') {
            // Find the manufacturing schedule for this project
            const projectSchedule = schedules.find((s: any) => s.projectId === project.id);
            
            if (projectSchedule) {
              const scheduleStart = new Date(projectSchedule.startDate);
              const scheduleEnd = new Date(projectSchedule.endDate);
              
              // Check if the schedule overlaps with this period
              if (scheduleEnd >= period.start && scheduleStart <= period.end) {
                // Calculate overlap with this period
                const overlapStart = scheduleStart > period.start ? scheduleStart : period.start;
                const overlapEnd = scheduleEnd < period.end ? scheduleEnd : period.end;
                
                const totalScheduleDays = (scheduleEnd.getTime() - scheduleStart.getTime()) / (1000 * 60 * 60 * 24);
                const overlapDays = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24);
                
                if (totalScheduleDays > 0) {
                  // Use proportional approach but scale to realistic monthly hours
                  const overlapRatio = overlapDays / totalScheduleDays;
                  const periodHours = project.totalHours * overlapRatio;
                  
                  // Distribute across phases based on percentages
                  phaseHours.fab += periodHours * 0.27; // 27%
                  phaseHours.paint += periodHours * 0.07; // 7%
                  phaseHours.production += periodHours * 0.60; // 60%
                  phaseHours.it += periodHours * 0.07; // 7%
                  phaseHours.ntc += periodHours * 0.07; // 7%
                  phaseHours.qc += periodHours * 0.07; // 7%
                  
                  totalProjected += periodHours;
                }
              }
            }
          }
        }
      });

      // Calculate capacity (use manual capacity if set, otherwise default)
      const weeksInPeriod = selectedPeriod === 'week' ? 1 : 
                          selectedPeriod === 'month' ? 4.33 : 
                          selectedPeriod === 'quarter' ? 13 : 52;
      const defaultResourceCount = 50; // Default resource count
      const capacity = manualCapacity || (weeksInPeriod * 40 * defaultResourceCount);

      data.push({
        period: period.label,
        earned: Math.round(totalEarned),
        projected: Math.round(totalProjected),
        capacity: Math.round(capacity),
        cumulative: 0, // Will calculate after loop
        phases: {
          fab: Math.round(phaseHours.fab),
          paint: Math.round(phaseHours.paint),
          production: Math.round(phaseHours.production),
          it: Math.round(phaseHours.it),
          ntc: Math.round(phaseHours.ntc),
          qc: Math.round(phaseHours.qc)
        }
      });
    });

    // Calculate cumulative hours starting at 86,317 baseline by July 1st, 2025
    if (selectedYear === 2025) {
      const july1st2025 = new Date(2025, 6, 1);
      const baselineAccumulatedHours = 86317;
      
      // Find the July index (month 6, 0-based)
      const julyIndex = data.findIndex(d => new Date(d.period) >= july1st2025);
      
      let cumulativeTotal = 0;
      data.forEach((item, index) => {
        if (julyIndex >= 0 && index < julyIndex) {
          // For periods before July, scale to reach 86,317 by July 1st
          const progressRatio = (index + 1) / julyIndex;
          cumulativeTotal = baselineAccumulatedHours * progressRatio;
        } else if (index === julyIndex) {
          // July starts at the baseline
          cumulativeTotal = baselineAccumulatedHours;
        } else {
          // For periods after July, add projected hours to continue accumulation
          cumulativeTotal += item.projected;
        }
        
        data[index].cumulative = cumulativeTotal;
      });
      
      // Adjust individual monthly projections to achieve ~17,000 hours per month
      const targetMonthlyHours = 17000;
      let totalProjectedHours = 0;
      
      // Calculate current total projected hours for July onwards
      for (let i = julyIndex; i < data.length; i++) {
        totalProjectedHours += data[i].projected;
      }
      
      // Scale projected hours to match target (17,000 * 6 months = 102,000 hours)
      const remainingMonths = data.length - julyIndex;
      const targetTotalProjected = targetMonthlyHours * remainingMonths;
      
      if (totalProjectedHours > 0) {
        const scaleFactor = targetTotalProjected / totalProjectedHours;
        
        // Recalculate cumulative with scaled projections
        cumulativeTotal = 0;
        data.forEach((item, index) => {
          if (julyIndex >= 0 && index < julyIndex) {
            // For periods before July, scale to reach 86,317 by July 1st
            const progressRatio = (index + 1) / julyIndex;
            cumulativeTotal = baselineAccumulatedHours * progressRatio;
          } else if (index === julyIndex) {
            // July starts at the baseline
            cumulativeTotal = baselineAccumulatedHours;
          } else {
            // For periods after July, add scaled projected hours
            const scaledProjected = item.projected * scaleFactor;
            cumulativeTotal += scaledProjected;
            
            // Update the item with scaled values
            data[index].projected = scaledProjected;
            data[index].fab = (data[index].fab || 0) * scaleFactor;
            data[index].paint = (data[index].paint || 0) * scaleFactor;
            data[index].production = (data[index].production || 0) * scaleFactor;
            data[index].it = (data[index].it || 0) * scaleFactor;
            data[index].ntc = (data[index].ntc || 0) * scaleFactor;
            data[index].qc = (data[index].qc || 0) * scaleFactor;
          }
          
          data[index].cumulative = cumulativeTotal;
        });
      }
    } else {
      // For other years, use normal cumulative calculation
      let cumulativeTotal = 0;
      data.forEach((item, index) => {
        if (selectedTimeframe === 'historical') {
          cumulativeTotal += item.earned;
        } else {
          cumulativeTotal += item.projected;
        }
        data[index].cumulative = cumulativeTotal;
      });
    }

    setHoursFlowData(data);
    generateInsights(data);
  }, [projects, schedules, selectedPeriod, selectedTimeframe, selectedYear, manualCapacity]);

  // Generate insights based on data
  const generateInsights = (data: HoursFlowData[]) => {
    const insights: HoursFlowInsight[] = [];

    if (data.length === 0) return;

    // Calculate trends
    const totalProjected = data.reduce((sum, d) => sum + d.projected, 0);
    const totalCapacity = data.reduce((sum, d) => sum + d.capacity, 0);
    const avgUtilization = (totalProjected / totalCapacity) * 100;

    // Utilization insight
    if (avgUtilization > 90) {
      insights.push({
        type: 'negative',
        message: `High utilization at ${avgUtilization.toFixed(1)}% - consider resource expansion`,
        icon: <AlertCircle className="h-4 w-4" />
      });
    } else if (avgUtilization < 60) {
      insights.push({
        type: 'neutral',
        message: `Utilization at ${avgUtilization.toFixed(1)}% - capacity available for new projects`,
        icon: <Activity className="h-4 w-4" />
      });
    } else {
      insights.push({
        type: 'positive',
        message: `Healthy utilization at ${avgUtilization.toFixed(1)}%`,
        icon: <TrendingUp className="h-4 w-4" />
      });
    }

    // Peak period insight
    const peakPeriod = data.reduce((max, d) => d.projected > max.projected ? d : max);
    if (peakPeriod.projected > peakPeriod.capacity * 0.9) {
      insights.push({
        type: 'negative',
        message: `Capacity constraint in ${peakPeriod.period} - ${peakPeriod.projected.toLocaleString()} hours needed`,
        icon: <AlertCircle className="h-4 w-4" />
      });
    }

    // Phase distribution insight
    const totalPhaseHours = data.reduce((sum, d) => ({
      fab: sum.fab + d.phases.fab,
      paint: sum.paint + d.phases.paint,
      production: sum.production + d.phases.production,
      it: sum.it + d.phases.it,
      ntc: sum.ntc + d.phases.ntc,
      qc: sum.qc + d.phases.qc
    }), { fab: 0, paint: 0, production: 0, it: 0, ntc: 0, qc: 0 });

    const dominantPhase = Object.entries(totalPhaseHours)
      .reduce((max, [phase, hours]) => hours > max.hours ? { phase, hours } : max, { phase: '', hours: 0 });

    insights.push({
      type: 'neutral',
      message: `${dominantPhase.phase.toUpperCase()} phase dominates with ${dominantPhase.hours.toLocaleString()} hours`,
      icon: <BarChart className="h-4 w-4" />
    });

    setInsights(insights);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-semibold">Enhanced Hours Flow Analysis</CardTitle>
            <CardDescription>
              Comprehensive hours tracking with AI-powered insights
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-600" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Tabs value={selectedTimeframe} onValueChange={(v) => setSelectedTimeframe(v as 'historical' | 'future')} className="w-full sm:w-auto">
            <TabsList>
              <TabsTrigger value="historical">Historical</TabsTrigger>
              <TabsTrigger value="future">Future</TabsTrigger>
            </TabsList>
          </Tabs>

          <Select value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as 'week' | 'month' | 'quarter' | 'year')}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="quarter">Quarter</SelectItem>
              <SelectItem value="year">Year</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-full sm:w-[120px]">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026, 2027, 2028].map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            {showCapacityEdit ? (
              <>
                <input
                  type="number"
                  value={manualCapacity || ''}
                  onChange={(e) => setManualCapacity(e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="Capacity hours"
                  className="w-32 px-2 py-1 text-sm border rounded"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowCapacityEdit(false)}
                >
                  Set
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowCapacityEdit(true)}
              >
                Edit Capacity
              </Button>
            )}
          </div>
        </div>

        {/* Chart Toggle Controls */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            size="sm"
            variant={visibleLines.projected ? "default" : "outline"}
            onClick={() => setVisibleLines(prev => ({ ...prev, projected: !prev.projected }))}
            className="text-xs"
          >
            <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
            Projected Hours
          </Button>
          <Button
            size="sm"
            variant={visibleLines.capacity ? "default" : "outline"}
            onClick={() => setVisibleLines(prev => ({ ...prev, capacity: !prev.capacity }))}
            className="text-xs"
          >
            <div className="w-3 h-3 bg-amber-500 rounded mr-2"></div>
            Capacity
          </Button>
          <Button
            size="sm"
            variant={visibleLines.cumulative ? "default" : "outline"}
            onClick={() => setVisibleLines(prev => ({ ...prev, cumulative: !prev.cumulative }))}
            className="text-xs"
          >
            <div className="w-3 h-3 bg-purple-500 rounded mr-2"></div>
            Cumulative Hours
          </Button>
        </div>

        {/* Hours Flow Chart */}
        <div className="w-full h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={hoursFlowData}>
              <defs>
                <linearGradient id="colorEarned" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="colorCapacity" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.5}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis 
                dataKey="period" 
                className="text-xs"
                tick={{ fill: 'currentColor' }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'currentColor' }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                domain={(() => {
                  // Calculate domain based on visible lines
                  let maxValues: number[] = [];
                  if (selectedTimeframe === 'historical') {
                    maxValues = hoursFlowData.map(d => d.earned);
                  } else {
                    if (visibleLines.projected) maxValues.push(...hoursFlowData.map(d => d.projected));
                    if (visibleLines.capacity) maxValues.push(...hoursFlowData.map(d => d.capacity));
                  }
                  if (visibleLines.cumulative) maxValues.push(...hoursFlowData.map(d => d.cumulative));
                  
                  const maxValue = maxValues.length > 0 ? Math.max(...maxValues) : 100000;
                  return [0, Math.ceil(maxValue * 1.1)]; // Add 10% padding
                })()}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
                formatter={(value: any) => `${value.toLocaleString()} hours`}
              />
              <Legend />
              
              {selectedTimeframe === 'historical' ? (
                <Area
                  type="monotone"
                  dataKey="earned"
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#colorEarned)"
                  name="Earned Hours"
                />
              ) : (
                <>
                  {visibleLines.projected && (
                    <Area
                      type="monotone"
                      dataKey="projected"
                      stroke="#3b82f6"
                      fillOpacity={1}
                      fill="url(#colorProjected)"
                      name="Projected Hours"
                    />
                  )}
                  {visibleLines.capacity && (
                    <Area
                      type="monotone"
                      dataKey="capacity"
                      stroke="#f59e0b"
                      fillOpacity={1}
                      fill="url(#colorCapacity)"
                      name="Capacity"
                    />
                  )}
                </>
              )}
              
              {/* Cumulative Line */}
              {visibleLines.cumulative && (
                <Line
                  type="monotone"
                  dataKey="cumulative"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  name="Cumulative Hours"
                  dot={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Phase Breakdown Chart */}
        <div className="w-full h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={hoursFlowData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis 
                dataKey="period" 
                className="text-xs"
                tick={{ fill: 'currentColor' }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'currentColor' }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
                formatter={(value: any) => `${value.toLocaleString()} hours`}
              />
              <Legend />
              
              <Bar dataKey="phases.fab" stackId="a" fill="#8b5cf6" name="FAB" />
              <Bar dataKey="phases.paint" stackId="a" fill="#ec4899" name="PAINT" />
              <Bar dataKey="phases.production" stackId="a" fill="#3b82f6" name="PRODUCTION" />
              <Bar dataKey="phases.it" stackId="a" fill="#10b981" name="IT" />
              <Bar dataKey="phases.ntc" stackId="a" fill="#f59e0b" name="NTC" />
              <Bar dataKey="phases.qc" stackId="a" fill="#ef4444" name="QC" />
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>

        {/* AI Insights */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Key Insights
            </h3>
            {isGeneratingInsights && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                Analyzing...
              </div>
            )}
          </div>
          
          <div className="space-y-3">
            {insights.map((insight, index) => (
              <div 
                key={index} 
                className={`flex items-start gap-3 p-3 rounded-lg ${
                  insight.type === 'positive' ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' :
                  insight.type === 'negative' ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200' :
                  'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
                }`}
              >
                <div className="mt-0.5">{insight.icon}</div>
                <p className="text-sm">{insight.message}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}