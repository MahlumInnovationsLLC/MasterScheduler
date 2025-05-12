import React, { useState, useRef } from 'react';
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

// Define the dialog ref type
interface GoalDialogRef {
  openDialog: (type: 'month' | 'week') => void;
}

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
  const [isOpen, setIsOpen] = useState(false);
  const [goalAmount, setGoalAmount] = useState("");
  const [goalDescription, setGoalDescription] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [goalType, setGoalType] = useState<'month' | 'week'>('month');
  const [currentDate, setCurrentDate] = useState<{year: number, month: number, week?: number} | null>(null);
  const goalDialogRef = useRef<GoalDialogRef>(null);
  
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
  
  // Icons for card types
  const getIcon = () => {
    switch(type) {
      case 'revenue':
        return <DollarSign className="h-5 w-5 text-green-500" />;
      case 'milestones':
        return <Flag className="h-5 w-5 text-blue-500" />;
      case 'forecast':
        return <LineChart className="h-5 w-5 text-orange-500" />;
      case 'cashflow':
        return <Banknote className="h-5 w-5 text-purple-500" />;
      default:
        return <DollarSign className="h-5 w-5 text-green-500" />;
    }
  };

  const getCurrentMonthDetails = () => {
    if (selectedMonthIndex === undefined || !chart) return null;
    
    const today = new Date();
    const monthDate = addMonths(new Date(today.getFullYear(), today.getMonth(), 1), selectedMonthIndex);
    const monthName = format(monthDate, 'MMMM yyyy');
    
    return {
      date: monthDate,
      name: monthName,
      year: monthDate.getFullYear(),
      month: monthDate.getMonth() + 1
    };
  };
  
  const getCurrentFiscalWeeks = () => {
    const monthDetails = getCurrentMonthDetails();
    if (!monthDetails) return [];
    
    return getFiscalWeeksForMonth(monthDetails.year, monthDetails.month);
  };

  const formatCurrency = (value: string | number) => {
    if (typeof value === 'string') {
      // Try to parse as number if it's a string
      const parsedValue = parseFloat(value.replace(/[^0-9.-]+/g, ''));
      if (!isNaN(parsedValue)) {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(parsedValue);
      }
      return value;
    } else {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    }
  };

  // Goal dialog
  const GoalSettingDialog = () => (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Financial Goal' : 'Create Financial Goal'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="goalType" className="text-right">
              Type
            </Label>
            <div className="col-span-3">
              <Tabs 
                value={goalType} 
                onValueChange={(value) => setGoalType(value as 'month' | 'week')}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="month">Month</TabsTrigger>
                  <TabsTrigger value="week">Week</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="period" className="text-right">
              Period
            </Label>
            <div className="col-span-3 flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-sm">
                {getCurrentMonthDetails()?.name}
                {goalType === 'week' && currentDate?.week && 
                  ` • Week ${currentDate.week}`
                }
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Target
            </Label>
            <div className="col-span-3 relative">
              <div className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500">$</div>
              <Input 
                id="amount" 
                value={goalAmount} 
                onChange={(e) => setGoalAmount(e.target.value)}
                placeholder="500,000" 
                className="pl-6"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description
            </Label>
            <Input 
              id="description" 
              value={goalDescription}
              onChange={(e) => setGoalDescription(e.target.value)}
              placeholder="Optional description" 
              className="col-span-3"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {isEditing ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <Card className="overflow-hidden h-full">
      <div className="p-6">
        {/* Header with Title and Icon */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            {getIcon()}
            <h3 className="text-lg font-medium">{title}</h3>
          </div>
          
          {type === 'forecast' && chart && (
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setGoalType('month');
                  handleOpenCreate();
                }}
              >
                <PlusCircle className="h-4 w-4 mr-1" />
                Add Goal
              </Button>
            </div>
          )}
        </div>
        
        {/* Different Content Based on Type */}
        {type === 'revenue' || type === 'milestones' || type === 'cashflow' ? (
          <>
            {/* Value and Change */}
            <div className="flex items-baseline space-x-2 mb-1">
              <div className="text-2xl font-bold">
                {typeof value === 'number' ? formatCurrency(value) : value}
              </div>
              {change && (
                <div className={`text-sm font-medium ${change.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                  {change.isPositive ? '+' : ''}{change.value}
                </div>
              )}
            </div>
            
            {/* Progress */}
            {progress && (
              <div className="mb-4">
                <Progress value={progress.value} className="h-2 mb-1" />
                <p className="text-xs text-muted-foreground">{progress.label}</p>
              </div>
            )}
            
            {/* Stats */}
            {stats && stats.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-4">
                {stats.map((stat, i) => (
                  <div key={i} className="flex flex-col">
                    <div className="text-sm font-medium">
                      {typeof stat.value === 'number' ? formatCurrency(stat.value) : stat.value}
                    </div>
                    <div className={`text-xs ${stat.color ? 
                      'text-' + stat.color + '-500' : 
                      'text-gray-400'
                    }`}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : type === 'forecast' && chart ? (
          <>
            {/* Goal Setting Dialog */}
            <GoalSettingDialog />

            {/* Top Section with Value and Comparison Tabs */}
            <div className="flex flex-col">
              <div className="flex justify-between items-center">
                <div className="flex items-baseline space-x-2">
                  <div className="text-2xl font-bold">
                    {typeof value === 'number' ? formatCurrency(value) : value}
                  </div>
                  {change && (
                    <div className={`text-sm font-medium ${change.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                      {change.isPositive ? '+' : ''}{change.value}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Month Navigation */}
              <div className="flex items-center space-x-1 mt-4 mb-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onMonthSelect && onMonthSelect(getYear(new Date()), getMonth(new Date()) - 2)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                {chart.labels.map((label, index) => (
                  <Button
                    key={index}
                    variant={index === selectedMonthIndex ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      onMonthSelect && onMonthSelect(getYear(new Date()), getMonth(new Date()) + (index - 2));
                      
                      // Reset week selection when changing month
                      if (selectedWeekIndex !== undefined) {
                        onWeekSelect && onWeekSelect(getYear(new Date()), 0);
                      }
                    }}
                    className="min-w-[40px]"
                  >
                    {label}
                  </Button>
                ))}
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onMonthSelect && onMonthSelect(getYear(new Date()), getMonth(new Date()) + 3)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Week Navigation - only show if showFiscalWeeks is true */}
              {showFiscalWeeks && selectedMonthIndex !== undefined && fiscalWeekDisplay === 'below' && (
                <div className="flex flex-wrap gap-1 mb-4">
                  <Button
                    variant={selectedWeekIndex === undefined ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      onWeekSelect && onWeekSelect(0, 0);
                    }}
                    className="text-xs py-0 h-6"
                  >
                    All
                  </Button>
                  
                  {getCurrentFiscalWeeks().map((week, index) => (
                    <Button
                      key={index}
                      variant={index === selectedWeekIndex ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        onWeekSelect && onWeekSelect(week.weekNumber, week.weekNumber);
                        setGoalType('week');
                      }}
                      className="text-xs py-0 h-6"
                    >
                      <span>W{week.weekNumber}</span>
                    </Button>
                  ))}
                  
                  {selectedWeekIndex !== undefined && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setGoalType('week');
                        handleOpenCreate();
                      }}
                      className="text-xs py-0 h-6 ml-auto"
                    >
                      <PlusCircle className="h-3 w-3 mr-1" />
                      Add Goal
                    </Button>
                  )}
                </div>
              )}
              
              {/* Monthly Target with Goal */}
              {goals && selectedMonthIndex !== undefined && (
                <div className="mb-3">
                  {(() => {
                    const monthDetails = getCurrentMonthDetails();
                    if (!monthDetails) return null;
                    
                    const monthGoal = goals.find(g => 
                      g.year === monthDetails.year && 
                      g.month === monthDetails.month && 
                      !g.week
                    );
                    
                    const weekGoal = selectedWeekIndex !== undefined ? goals.find(g => {
                      const fiscalWeeks = getFiscalWeeksForMonth(monthDetails.year, monthDetails.month);
                      const weekNum = fiscalWeeks[selectedWeekIndex]?.weekNumber;
                      return g.year === monthDetails.year && 
                             g.month === monthDetails.month && 
                             g.week === weekNum;
                    }) : null;
                    
                    const goal = selectedWeekIndex !== undefined ? weekGoal : monthGoal;
                    
                    if (!goal) return null;
                    
                    // Find the actual value for the period
                    let actualValue = 0;
                    if (selectedWeekIndex !== undefined && chart.weekValues && chart.weekValues[selectedWeekIndex]) {
                      actualValue = chart.weekValues[selectedWeekIndex];
                    } else if (chart.values[selectedMonthIndex]) {
                      actualValue = chart.values[selectedMonthIndex];
                    }
                    
                    // Calculate progress percentage
                    const progressPercentage = Math.min(100, Math.round((actualValue / goal.targetAmount) * 100));
                    
                    return (
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between items-center">
                          <div className="font-medium">
                            Target: {formatCurrency(goal.targetAmount)}
                          </div>
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => {
                              if (selectedWeekIndex !== undefined) {
                                setGoalType('week');
                              } else {
                                setGoalType('month');
                              }
                              handleOpenCreate();
                            }}
                            className="h-6 mr-0 px-2"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                        <Progress value={progressPercentage} className="h-2" />
                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                          <span>
                            {formatCurrency(actualValue)} / {formatCurrency(goal.targetAmount)}
                          </span>
                          <span>{progressPercentage}%</span>
                        </div>
                        {goal.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {goal.description}
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
                            
              {/* Display current chart data */}
              <div className="mt-1 h-28 w-full">
                <Chart 
                  data={
                    selectedWeekIndex !== undefined && chart.weekValues 
                      ? chart.weekValues 
                      : chart.values
                  } 
                  labels={
                    selectedWeekIndex !== undefined && chart.weekLabels 
                      ? chart.weekLabels 
                      : chart.labels
                  }
                  selectedIndex={selectedWeekIndex !== undefined ? selectedWeekIndex : selectedMonthIndex}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-40">
            <p>No data available</p>
          </div>
        )}
      </div>
    </Card>
  );
}

// Simple chart component
function Chart({ data, labels, selectedIndex }: { 
  data: number[], 
  labels: string[],
  selectedIndex?: number
}) {
  // Add a small value to ensure bars have minimum height for better visualization
  const max = Math.max(...data, 1); 
  
  return (
    <div className="flex h-full w-full items-end space-x-1">
      {data.map((value, i) => {
        // Calculate height percentage with minimum height for visibility
        const heightPercent = Math.max(5, (value / max) * 100);
        
        return (
          <div
            key={i}
            className="relative flex flex-1 flex-col items-center"
          >
            {/* Bar column with blue highlighting for selected month/week */}
            <div 
              className={`w-full rounded-sm ${
                selectedIndex === i ? 'bg-blue-500' : 'bg-blue-200'
              }`}
              style={{ 
                height: `${heightPercent}%`,
              }}
            />
            
            {/* Value label on top of bar if value is significant */}
            {value > 0 && (
              <div className="absolute top-0 w-full text-center transform -translate-y-5">
                <span className="text-[9px] font-medium">
                  {value >= 1000000 
                    ? `$${(value / 1000000).toFixed(1)}M` 
                    : value >= 1000 
                      ? `$${(value / 1000).toFixed(0)}K` 
                      : `$${value}`
                  }
                </span>
              </div>
            )}
            
            {/* Month/week label below bar */}
            <span className="mt-1 text-[10px] text-muted-foreground w-full text-center truncate">
              {labels[i]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Additional imports needed for navigation
import { ChevronLeft, ChevronRight } from 'lucide-react';