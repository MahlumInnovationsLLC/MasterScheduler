import React, { useState, forwardRef, useImperativeHandle, useRef } from 'react';
import { 
  DollarSign,
  Flag,
  LineChart,
  Banknote,
  CalendarIcon,
  PlusCircle,
  Edit,
  Calendar
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { format, addMonths, addWeeks, getWeek, getMonth, getYear } from 'date-fns';
import { getFiscalWeeksForMonth, getFiscalWeekLabel } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface BillingStatusCardProps {
  title: string;
  value: string | number;
  type: 'revenue' | 'milestones' | 'forecast' | 'cashflow';
  change?: {
    value: string | number;
    isPositive: boolean;
  };
  progress?: {
    value: number;
    label: string;
  };
  stats?: {
    label: string;
    value: string | number;
    color?: string;
  }[];
  chart?: {
    labels: string[];
    values: number[];
    weekLabels?: string[];
    weekValues?: number[];
  };
  onMonthSelect?: (year: number, month: number) => void;
  selectedMonthIndex?: number;
  onWeekSelect?: (year: number, week: number) => void;
  selectedWeekIndex?: number;
  showFiscalWeeks?: boolean;
  fiscalWeekDisplay?: 'below' | 'inline';
  goals?: { 
    year: number; 
    month: number; 
    targetAmount: number; 
    description?: string;
    week?: number; 
  }[];
  onGoalCreate?: (year: number, month: number, targetAmount: number, description: string, week?: number) => void;
  onGoalUpdate?: (year: number, month: number, targetAmount: number, description: string, week?: number) => void;
}

// Goal Setting Dialog Component
// Define the dialog ref type
interface GoalDialogRef {
  openDialog: (type: 'month' | 'week') => void;
}

const GoalSettingDialog = forwardRef<GoalDialogRef, {
  title: string;
  chart?: {
    labels: string[];
    values: number[];
    weekLabels?: string[];
    weekValues?: number[];
  };
  goals?: { 
    year: number; 
    month: number; 
    targetAmount: number; 
    description?: string;
    week?: number;
  }[];
  onMonthSelect?: (year: number, month: number) => void;
  selectedMonthIndex?: number;
  selectedWeekIndex?: number;
  onGoalCreate?: (year: number, month: number, targetAmount: number, description: string, week?: number) => void;
  onGoalUpdate?: (year: number, month: number, targetAmount: number, description: string, week?: number) => void;
  defaultGoalType?: 'month' | 'week';
}>(({ 
  title, 
  chart, 
  goals,
  selectedMonthIndex,
  selectedWeekIndex,
  onGoalCreate,
  onGoalUpdate,
  defaultGoalType = 'month'
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [goalAmount, setGoalAmount] = useState("");
  const [goalDescription, setGoalDescription] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [goalType, setGoalType] = useState<'month' | 'week'>(defaultGoalType);
  const [currentDate, setCurrentDate] = useState<{year: number, month: number, week?: number} | null>(null);
  
  // Expose the openDialog method to the parent component via ref
  useImperativeHandle(ref, () => ({
    openDialog: (type: 'month' | 'week') => {
      setGoalType(type);
      handleOpenCreate();
    }
  }));
  
  const handleOpenCreate = () => {
    if (selectedMonthIndex !== undefined && chart) {
      const today = new Date();
      const targetDate = addMonths(new Date(today.getFullYear(), today.getMonth(), 1), selectedMonthIndex);
      
      // Use standardized fiscal week number if in week mode
      let weekVal;
      if (goalType === 'week' && selectedWeekIndex !== undefined) {
        const fiscalWeeks = getFiscalWeeksForMonth(targetDate.getFullYear(), targetDate.getMonth() + 1);
        weekVal = fiscalWeeks[selectedWeekIndex]?.weekNumber || selectedWeekIndex + 1;
      } else {
        weekVal = undefined;
      }
      
      setCurrentDate({
        year: targetDate.getFullYear(),
        month: targetDate.getMonth() + 1,
        week: weekVal
      });
      
      // Check if a goal already exists for this month or week
      const existingGoal = goals?.find(g => {
        const yearMatch = g.year === targetDate.getFullYear();
        const monthMatch = g.month === targetDate.getMonth() + 1;
        
        if (goalType === 'month') {
          return yearMatch && monthMatch && !g.week;
        } else {
          // Week-level goal
          return yearMatch && monthMatch && g.week === weekVal;
        }
      });
      
      if (existingGoal) {
        // We're editing
        setIsEditing(true);
        setGoalAmount(existingGoal.targetAmount.toString());
        setGoalDescription(existingGoal.description || "");
      } else {
        // We're creating
        setIsEditing(false);
        setGoalAmount("");
        setGoalDescription("");
      }
      
      setIsOpen(true);
    }
  };
  
  const handleSave = () => {
    if (!currentDate || !goalAmount) return;
    
    const amount = parseFloat(goalAmount);
    if (isNaN(amount)) return;
    
    if (isEditing) {
      onGoalUpdate && onGoalUpdate(
        currentDate.year,
        currentDate.month,
        amount,
        goalDescription,
        currentDate.week
      );
    } else {
      onGoalCreate && onGoalCreate(
        currentDate.year,
        currentDate.month,
        amount,
        goalDescription,
        currentDate.week
      );
    }
    
    setIsOpen(false);
  };
  
  return (
    <div id="goal-dialog-container">
      <button 
        id="create-goal-button" 
        className="hidden"
        onClick={handleOpenCreate}
      />
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Financial Goal" : "Set New Financial Goal"}
            </DialogTitle>
          </DialogHeader>
          
          {currentDate && (
            <div className="grid gap-4 py-4">
              <div className="flex items-center gap-4">
                <Label className="w-24 text-right">Period:</Label>
                <div className="font-medium flex flex-col gap-1">
                  <div>
                    {format(new Date(currentDate.year, currentDate.month - 1), 'MMMM yyyy')}
                  </div>
                  {currentDate.week && (
                    <div className="text-sm text-muted-foreground">
                      Week {currentDate.week}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <Label className="w-24 text-right">Goal Type:</Label>
                <div className="flex items-center space-x-2">
                  <Button
                    variant={goalType === 'month' ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setGoalType('month');
                      // Reset the current date to remove week if present
                      setCurrentDate(prev => prev ? {
                        ...prev,
                        week: undefined
                      } : null);
                    }}
                  >
                    Monthly
                  </Button>
                  <Button
                    variant={goalType === 'week' ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setGoalType('week');
                      // Add week number if it's not set
                      setCurrentDate(prev => prev ? {
                        ...prev,
                        week: prev.week || (selectedWeekIndex !== undefined ? selectedWeekIndex + 1 : 1)
                      } : null);
                    }}
                    disabled={selectedWeekIndex === undefined}
                  >
                    Weekly
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <Label htmlFor="goalAmount" className="w-24 text-right">
                  Target Amount:
                </Label>
                <div className="flex-1">
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                    <Input
                      id="goalAmount"
                      className="pl-7"
                      value={goalAmount}
                      onChange={(e) => setGoalAmount(e.target.value)}
                      placeholder="Enter target amount"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <Label htmlFor="goalDescription" className="w-24 text-right">
                  Description:
                </Label>
                <Input
                  id="goalDescription"
                  value={goalDescription}
                  onChange={(e) => setGoalDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {isEditing ? "Update Goal" : "Create Goal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

export function BillingStatusCard({
  title,
  value,
  type,
  change,
  progress,
  stats,
  chart,
  onMonthSelect,
  selectedMonthIndex,
  onWeekSelect,
  selectedWeekIndex,
  showFiscalWeeks = false,
  fiscalWeekDisplay = 'below',
  goals,
  onGoalCreate,
  onGoalUpdate
}: BillingStatusCardProps) {
  // Create a ref for the goal dialog
  const goalDialogRef = useRef<GoalDialogRef>(null);
  const getIcon = () => {
    switch (type) {
      case 'revenue':
        return <DollarSign className="text-success" />;
      case 'milestones':
        return <Flag className="text-primary" />;
      case 'forecast':
        return <LineChart className="text-secondary" />;
      case 'cashflow':
        return <Banknote className="text-accent" />;
      default:
        return <DollarSign className="text-success" />;
    }
  };

  // Determine if this is a full-width forecast card (for special styling)
  const isFullWidthForecast = type === 'forecast' && chart && chart.weekValues;
  
  // Function to render the fiscal week charts
  const renderFiscalWeekCharts = () => {
    if (!chart || !chart.weekValues) return null;
    
    // Get the selected month's year and month based on selectedMonthIndex
    const today = new Date();
    const targetDate = addMonths(new Date(today.getFullYear(), today.getMonth(), 1), selectedMonthIndex || 0);
    
    // Get fiscal weeks for this month
    const fiscalWeeks = getFiscalWeeksForMonth(targetDate.getFullYear(), targetDate.getMonth() + 1);
    
    // Extract revenue values specific to this month's weeks
    // Each week needs its own revenue value
    const weekRevenues = fiscalWeeks.map((week, index) => {
      // Here we use the week index to align with the UI
      return chart.weekValues ? chart.weekValues[index] || 0 : 0;
    });
    
    // Calculate maximum value for proper scaling across all weeks in this month only
    const maxWeekValue = Math.max(...weekRevenues, 1); // At least 1 to avoid division by zero
    
    // Only display charts for the weeks of the selected month
    return fiscalWeeks.map((fiscalWeek, idx) => {
      // Get the value for this specific week
      const val = weekRevenues[idx];
      
      // Find a matching goal for this specific fiscal week
      const matchingGoal = goals?.find(g => 
        g.year === targetDate.getFullYear() && 
        g.month === targetDate.getMonth() + 1 && 
        g.week === fiscalWeek.weekNumber
      );
      
      // Determine if this week has met or exceeded its goal
      const hasGoal = !!matchingGoal;
      const isExceedingGoal = hasGoal && val >= (matchingGoal?.targetAmount || 0);
      
      return (
        <div key={idx} className={`${isFullWidthForecast ? 'flex-1 mx-1' : ''} bg-blue-500 bg-opacity-20 relative rounded-sm ${selectedWeekIndex === idx ? 'ring-1 ring-blue-400' : ''}`}>
          <div 
            className={`absolute bottom-0 w-full rounded-sm ${isExceedingGoal ? 'bg-green-400' : 'bg-blue-400'}`}
            style={{ height: `${(val / maxWeekValue) * 100}%` }}
          ></div>
          
          {/* Goal marker line if this week has a goal */}
          {hasGoal && (
            <div 
              className={`absolute w-full border-t-2 ${isExceedingGoal ? 'border-green-700' : 'border-amber-400'} border-dashed`}
              style={{ 
                bottom: `${(matchingGoal.targetAmount / maxWeekValue) * 100}%` 
              }}
            ></div>
          )}

          {/* Value label above the bar for full-width view */}
          {isFullWidthForecast && (
            <div className="absolute w-full text-center -top-6 text-xs">
              {new Intl.NumberFormat('en-US', { 
                style: 'currency', 
                currency: 'USD',
                notation: 'compact',
                maximumFractionDigits: 1
              }).format(val)}
            </div>
          )}
        </div>
      );
    });
  };
  return (
    <Card className={`bg-darkCard rounded-xl p-4 border border-gray-800 ${isFullWidthForecast ? 'p-6' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`text-gray-400 font-medium ${isFullWidthForecast ? 'text-lg' : ''}`}>{title}</h3>
        <div className="p-2 rounded-lg bg-opacity-10" style={{ backgroundColor: 'rgba(var(--chart-1), 0.1)' }}>
          {getIcon()}
        </div>
      </div>
      
      {type === 'milestones' && stats ? (
        <div className="grid grid-cols-2 gap-2">
          {stats.map((stat, index) => (
            <div 
              key={index} 
              className={`text-center p-2 rounded-lg ${
                stat.color || (
                  index === 0 ? 'bg-success bg-opacity-10' : 
                  index === 1 ? 'bg-warning bg-opacity-10' : 
                  index === 2 ? 'bg-danger bg-opacity-10' : 
                  'bg-gray-700 bg-opacity-30'
                )
              }`}
            >
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className={`text-xs font-semibold ${
                index === 0 ? 'text-green-400' : 
                index === 1 ? 'text-amber-400' : 
                index === 2 ? 'text-rose-400' : 
                'text-gray-400'
              }`}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      ) : type === 'forecast' && chart ? (
        <>
          {/* Goal Setting Dialog */}
          <GoalSettingDialog 
            title={title}
            chart={chart}
            goals={goals}
            onMonthSelect={onMonthSelect}
            selectedMonthIndex={selectedMonthIndex}
            onGoalCreate={onGoalCreate}
            onGoalUpdate={onGoalUpdate}
          />

          {/* Top Section with Value and Comparison Tabs */}
          <div className="flex flex-col">
            <div className="flex justify-between items-center">
              <div className="flex items-end">
                <span className="text-2xl font-bold font-sans">{value}</span>
                <span className="ml-2 text-sm text-gray-400">forecast</span>
              </div>
              
              {/* YTD and 12M Buttons */}
              <div className="flex gap-2">
                <Button 
                  variant={selectedMonthIndex === -1 ? "default" : "outline"}
                  size="sm"
                  className={`
                    h-7 px-3 text-xs
                    ${selectedMonthIndex === -1 ? 'bg-blue-500 hover:bg-blue-600 text-white' : ''}
                  `}
                  onClick={() => {
                    console.log('YTD selection: Changing to Year-To-Date');
                    if (onMonthSelect) {
                      onMonthSelect(new Date().getFullYear(), -1); // -1 indicates YTD
                    }
                  }}
                >
                  YTD
                </Button>
                
                <Button 
                  variant={selectedMonthIndex === -2 ? "default" : "outline"}
                  size="sm"
                  className={`
                    h-7 px-3 text-xs
                    ${selectedMonthIndex === -2 ? 'bg-purple-500 hover:bg-purple-600 text-white' : ''}
                  `}
                  onClick={() => {
                    console.log('12-Month selection: Changing to Next 12 Months');
                    if (onMonthSelect) {
                      onMonthSelect(new Date().getFullYear(), -2); // -2 indicates 12-month view
                    }
                  }}
                >
                  12M
                </Button>
              </div>
            </div>
            
            {/* Goal Progress */}
            {goals && goals.length > 0 && selectedMonthIndex !== undefined && (
              <div className="mt-1">
                {/* Find goal matching the currently selected month */}
                {(() => {
                  const today = new Date();
                  const targetDate = addMonths(new Date(today.getFullYear(), today.getMonth(), 1), selectedMonthIndex);
                  const matchingGoal = goals.find(g => g.year === targetDate.getFullYear() && g.month === targetDate.getMonth() + 1);
                  
                  if (matchingGoal) {
                    const monthValue = chart.values[selectedMonthIndex];
                    const percentage = Math.min(100, Math.round((monthValue / matchingGoal.targetAmount) * 100));
                    
                    return (
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Goal: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(matchingGoal.targetAmount)}</span>
                          <span className={percentage >= 100 ? 'text-green-400' : 'text-amber-400'}>{percentage}%</span>
                        </div>
                        <div className={`h-1.5 w-full rounded-full ${percentage >= 100 ? 'bg-green-900/20' : 'bg-amber-900/20'}`}>
                          <div 
                            className={`h-full rounded-full ${percentage >= 100 ? 'bg-green-400' : 'bg-amber-400'}`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="flex justify-between items-center text-xs mt-1 text-gray-400">
                      <span>No goal set for this month</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 px-2 text-xs"
                        onClick={() => {
                          if (onGoalCreate) {
                            // Use the ref to open the dialog with 'month' type
                            if (goalDialogRef.current) {
                              goalDialogRef.current.openDialog('month');
                            }
                          }
                        }}
                      >
                        <PlusCircle className="h-3 w-3 mr-1" /> Set Goal
                      </Button>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
          
          {/* Month Navigation and Chart */}
          <div className={`mt-3 ${isFullWidthForecast ? 'px-2' : ''}`}>
            {/* Month Navigation Buttons */}
            <div className={`grid grid-cols-12 gap-1 mb-3 ${isFullWidthForecast ? 'flex flex-wrap justify-between' : ''}`}>
              {chart.labels.map((label, idx) => {
                // Create a distinct visual style for the selected month
                const isSelected = selectedMonthIndex === idx;
                
                return (
                  <Button 
                    key={idx}
                    variant={isSelected ? "default" : "outline"}
                    size={isFullWidthForecast ? "default" : "sm"}
                    className={`
                      ${isFullWidthForecast ? 'flex-1 mx-1 min-w-[70px] mb-1' : 'h-7 p-1'} 
                      text-xs
                      ${isSelected ? 'bg-green-500 hover:bg-green-600 text-white' : ''}
                    `}
                    onClick={() => {
                      console.log(`Month selection: Changing to month index ${idx} (${label})`);
                      
                      // When changing months, we should also update the fiscal week display
                      // by resetting the selected week to the first week of the month
                      if (onMonthSelect) {
                        onMonthSelect(
                          new Date().getFullYear() + Math.floor((new Date().getMonth() + idx) / 12),
                          ((new Date().getMonth() + idx) % 12) + 1
                        );
                        
                        // If onWeekSelect is provided, also select the first week of this month
                        if (onWeekSelect) {
                          // Calculate the target date based on selected month
                          const today = new Date();
                          const targetDate = addMonths(new Date(today.getFullYear(), today.getMonth(), 1), idx);
                          
                          // Get first fiscal week of the month
                          const fiscalWeeks = getFiscalWeeksForMonth(targetDate.getFullYear(), targetDate.getMonth() + 1);
                          const firstWeekNumber = fiscalWeeks.length > 0 ? fiscalWeeks[0].weekNumber : 1;
                          
                          onWeekSelect(
                            targetDate.getFullYear(),
                            firstWeekNumber // Use the correct first fiscal week of the month
                          );
                        }
                      }
                    }}
                  >
                    {label}
                  </Button>
                );
              })}
            </div>
            
            {/* Bar Chart */}
            <div className={`grid grid-cols-12 gap-1 ${isFullWidthForecast ? 'h-32' : 'h-16'}`}>
              {chart.values.map((val, idx) => {
                // Debug log to see actual values
                console.log(`Bar ${idx} (${chart.labels[idx]}): $${val}`);
                
                // Calculate max value for scaling - use all values, not just positive ones
                const maxValue = Math.max(...chart.values);
                const heightPercentage = maxValue > 0 ? (val / maxValue) * 90 : 0;
                console.log(`Max value: $${maxValue}, Current val: $${val}, Height: ${heightPercentage}%`);
                // Find goal for this month's column
                const today = new Date();
                const targetDate = addMonths(new Date(today.getFullYear(), today.getMonth(), 1), idx);
                const matchingGoal = goals?.find(g => 
                  g.year === targetDate.getFullYear() && 
                  g.month === targetDate.getMonth() + 1 &&
                  !g.week // Only find month-level goals here
                );
                
                // Determine if this month has met or exceeded its goal
                const hasGoal = !!matchingGoal;
                const isExceedingGoal = hasGoal && val >= matchingGoal.targetAmount;
                
                // Highlight the selected month
                const isSelected = selectedMonthIndex === idx;
                
                return (
                  <div key={idx} className={`bg-gray-700 bg-opacity-30 relative rounded-sm ${isSelected ? 'ring-2 ring-green-400 ring-opacity-80' : ''}`}>
                    <div 
                      className={`absolute bottom-0 w-full rounded-sm z-10 ${
                        isSelected 
                          ? 'bg-green-500 shadow-lg' 
                          : isExceedingGoal 
                            ? 'bg-green-400' 
                            : val < maxValue * 0.3 
                              ? 'bg-blue-800' 
                              : 'bg-blue-500'
                      }`}
                      style={{ 
                        height: `${val > 0 ? Math.max(15, heightPercentage) : 8}%` 
                      }}
                    ></div>
                    
                    {/* Goal marker line if this month has a goal */}
                    {hasGoal && (
                      <div 
                        className={`absolute w-full border-t-2 ${isExceedingGoal ? 'border-green-700' : 'border-amber-400'} border-dashed`}
                        style={{ 
                          bottom: `${(matchingGoal.targetAmount / Math.max(...chart.values, ...((goals || []).map(g => g.targetAmount) || []))) * 100}%` 
                        }}
                      ></div>
                    )}
                    
                    {/* Value label above the bar for full-width view */}
                    {isFullWidthForecast && (
                      <div className="absolute w-full text-center -top-6 text-xs">
                        {new Intl.NumberFormat('en-US', { 
                          style: 'currency', 
                          currency: 'USD',
                          notation: 'compact',
                          maximumFractionDigits: 1
                        }).format(val)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Fiscal Week Display - Appears below the monthly chart */}
          {showFiscalWeeks && chart?.weekLabels && chart?.weekValues && (
            <div className={`mt-8 bg-gray-900/30 rounded-lg ${isFullWidthForecast ? 'p-6' : 'p-4'} border border-gray-800`}>
              <div className="flex justify-between items-center mb-4">
                <h4 className={`${isFullWidthForecast ? 'text-lg' : 'text-sm'} font-medium text-gray-300`}>Fiscal Week Breakdown</h4>
                <span className={`text-xs text-gray-400 bg-gray-800 px-3 py-1.5 rounded-full ${isFullWidthForecast ? 'text-sm' : ''}`}>
                  {selectedWeekIndex !== undefined && (() => {
                    // Get the selected month's year and month based on selectedMonthIndex
                    const today = new Date();
                    const targetDate = addMonths(new Date(today.getFullYear(), today.getMonth(), 1), selectedMonthIndex || 0);
                    
                    // Get fiscal weeks for the current selected month
                    const fiscalWeeks = getFiscalWeeksForMonth(targetDate.getFullYear(), targetDate.getMonth() + 1);
                    
                    // Display proper week range if available
                    if (fiscalWeeks[selectedWeekIndex]) {
                      const weekNumber = fiscalWeeks[selectedWeekIndex].weekNumber;
                      return `Week ${selectedWeekIndex + 1}: ${getFiscalWeekLabel(targetDate.getFullYear(), targetDate.getMonth() + 1, weekNumber, true)}`;
                    }
                    return chart.weekLabels[selectedWeekIndex];
                  })()}
                </span>
              </div>
              
              {/* Week Navigation Buttons */}
              <div className={`${isFullWidthForecast ? 'flex justify-between' : 'grid grid-cols-6 gap-1'} mb-4`}>
                {(() => {
                  // Get the selected month's year and month based on selectedMonthIndex
                  const today = new Date();
                  const targetDate = addMonths(new Date(today.getFullYear(), today.getMonth(), 1), selectedMonthIndex || 0);
                  
                  // Get fiscal weeks for the current selected month
                  const fiscalWeeks = getFiscalWeeksForMonth(targetDate.getFullYear(), targetDate.getMonth() + 1);
                  
                  // Adjust the number of buttons based on actual fiscal weeks
                  const weeksToShow = fiscalWeeks.length;
                  
                  // Create buttons based on the number of weeks in the selected month
                  return fiscalWeeks.map((fiscalWeek, idx) => {
                    // Get the week label with range - just the dates for the current month
                    const weekRangeLabel = getFiscalWeekLabel(targetDate.getFullYear(), targetDate.getMonth() + 1, fiscalWeek.weekNumber, true);
                    
                    return (
                      <Button 
                        key={idx}
                        variant={selectedWeekIndex === idx ? "default" : "outline"}
                        size={isFullWidthForecast ? "default" : "sm"}
                        className={`${isFullWidthForecast ? 'flex-1 mx-1' : 'h-9 p-1'} text-xs flex flex-col justify-center`}
                        onClick={() => {
                          if (onWeekSelect) {
                            onWeekSelect(
                              targetDate.getFullYear(),
                              fiscalWeek.weekNumber
                            );
                          }
                        }}
                      >
                        <span>{`Week ${idx + 1}`}</span>
                        <span className="text-[0.6rem] opacity-80">{weekRangeLabel}</span>
                      </Button>
                    );
                  });
                })()}
              </div>
              
              {/* Fiscal Week Chart */}
              <div className={`${isFullWidthForecast ? 'flex justify-between h-40' : 'grid grid-cols-6 gap-1 h-20'}`}>
                {renderFiscalWeekCharts()}
              </div>
              
              {/* Weekly Goal Status */}
              {selectedWeekIndex !== undefined && (
                <div className={`${isFullWidthForecast ? 'mt-6 flex justify-between items-center' : 'mt-3 flex justify-between items-center text-sm'}`}>
                  <div>
                    <span className="text-gray-400">
                      {/* Get the proper fiscal week for display */}
                      {(() => {
                        // Get the selected month's year and month
                        const today = new Date();
                        const targetDate = addMonths(new Date(today.getFullYear(), today.getMonth(), 1), selectedMonthIndex || 0);
                        
                        // Get fiscal weeks for this month
                        const fiscalWeeks = getFiscalWeeksForMonth(targetDate.getFullYear(), targetDate.getMonth() + 1);
                        
                        if (fiscalWeeks[selectedWeekIndex]) {
                          return `Week ${selectedWeekIndex + 1} Total:`;
                        }
                        return "Week Total:";
                      })()}
                    </span>
                    <span className={`ml-2 font-bold ${isFullWidthForecast ? 'text-lg' : ''}`}>
                      {(() => {
                        // Get the value for this week from our aligned values
                        const today = new Date();
                        const targetDate = addMonths(new Date(today.getFullYear(), today.getMonth(), 1), selectedMonthIndex || 0);
                        const fiscalWeeks = getFiscalWeeksForMonth(targetDate.getFullYear(), targetDate.getMonth() + 1);
                        
                        // Extract revenue values specific to this month's weeks
                        const weekRevenues = fiscalWeeks.map((week, index) => {
                          return chart.weekValues ? chart.weekValues[index] || 0 : 0;
                        });
                        
                        const weekValue = weekRevenues[selectedWeekIndex] || 0;
                        return new Intl.NumberFormat('en-US', { 
                          style: 'currency', 
                          currency: 'USD', 
                          maximumFractionDigits: 0 
                        }).format(weekValue);
                      })()}
                    </span>
                  </div>
                  
                  {/* Add Goal button */}
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-8"
                    onClick={() => {
                      if (onGoalCreate) {
                        // Use the ref to open the dialog with 'week' type
                        if (goalDialogRef.current) {
                          goalDialogRef.current.openDialog('week');
                        }
                      }
                    }}
                  >
                    <PlusCircle className="h-3.5 w-3.5 mr-1" /> {isFullWidthForecast ? 'Set Weekly Goal' : 'Set Goal'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      ) : type === 'cashflow' && stats ? (
        <div className="space-y-3">
          {stats.map((stat, index) => (
            <div key={index} className="flex justify-between items-center">
              <span className="text-sm">{stat.label}</span>
              <span className={`font-bold ${index === 2 ? 'text-green-400' : ''}`}>{stat.value}</span>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="flex items-end">
            <span className="text-3xl font-bold font-sans">{value}</span>
            {change && (
              <span className={`ml-2 text-xs ${change.isPositive ? 'text-green-400' : 'text-rose-400'} flex items-center`}>
                {change.isPositive ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-up"><path d="m5 12 7-7 7 7"></path><path d="M12 19V5"></path></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-down"><path d="m19 12-7 7-7-7"></path><path d="M12 5v14"></path></svg>
                )}
                {change.value}
              </span>
            )}
          </div>
          
          {progress && (
            <div className="mt-3 flex items-center">
              <Progress value={progress.value} className="w-full bg-gray-800 h-2" />
              <span className="ml-2 text-xs text-gray-400">{progress.label}</span>
            </div>
          )}
        </>
      )}
      {/* Add the goal setting dialog */}
      <GoalSettingDialog
        ref={goalDialogRef}
        title={title}
        chart={chart}
        goals={goals}
        selectedMonthIndex={selectedMonthIndex}
        selectedWeekIndex={selectedWeekIndex}
        onGoalCreate={onGoalCreate}
        onGoalUpdate={onGoalUpdate}
      />
    </Card>
  );
}

export default BillingStatusCard;
