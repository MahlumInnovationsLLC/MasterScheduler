import React, { useState } from 'react';
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
  onGoalCreate?: (year: number, month: number, targetAmount: number, description: string) => void;
  onGoalUpdate?: (year: number, month: number, targetAmount: number, description: string) => void;
}

// Goal Setting Dialog Component
function GoalSettingDialog({ 
  title, 
  chart, 
  goals,
  selectedMonthIndex,
  selectedWeekIndex,
  onGoalCreate,
  onGoalUpdate
}: {
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
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [goalAmount, setGoalAmount] = useState("");
  const [goalDescription, setGoalDescription] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [goalType, setGoalType] = useState<'month' | 'week'>('month');
  const [currentDate, setCurrentDate] = useState<{year: number, month: number, week?: number} | null>(null);
  
  const handleOpenCreate = () => {
    if (selectedMonthIndex !== undefined && chart) {
      const today = new Date();
      const targetDate = addMonths(new Date(today.getFullYear(), today.getMonth(), 1), selectedMonthIndex);
      
      const weekVal = goalType === 'week' ? (selectedWeekIndex !== undefined ? selectedWeekIndex + 1 : undefined) : undefined;
      
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
        goalDescription
      );
    } else {
      onGoalCreate && onGoalCreate(
        currentDate.year,
        currentDate.month,
        amount,
        goalDescription
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
                <Label className="w-24 text-right">Month:</Label>
                <div className="font-medium">
                  {format(new Date(currentDate.year, currentDate.month - 1), 'MMMM yyyy')}
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

  return (
    <Card className="bg-darkCard rounded-xl p-4 border border-gray-800">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-gray-400 font-medium">{title}</h3>
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
              
              {/* Goal Comparison Toggle (YTD vs Month) */}
              <Tabs defaultValue="month" className="h-8">
                <TabsList className="h-6">
                  <TabsTrigger value="month" className="text-xs px-2 h-6">Month</TabsTrigger>
                  <TabsTrigger value="ytd" className="text-xs px-2 h-6">YTD</TabsTrigger>
                </TabsList>
              </Tabs>
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
                        <Progress 
                          value={percentage} 
                          className={`h-1.5 w-full ${percentage >= 100 ? 'bg-green-900/20' : 'bg-amber-900/20'}`}
                          indicatorClassName={percentage >= 100 ? 'bg-green-400' : 'bg-amber-400'}
                        />
                      </div>
                    );
                  }
                  
                  return (
                    <div className="flex justify-between items-center text-xs mt-1 text-gray-400">
                      <span>No goal set for this month</span>
                      <Button 
                        variant="ghost" 
                        size="xs" 
                        className="h-6 px-2 text-xs"
                        onClick={() => {
                          if (onGoalCreate) {
                            // Show dialog for creating goal
                            const dialogContainer = document.getElementById('goal-dialog-container');
                            if (dialogContainer) {
                              const createButton = dialogContainer.querySelector('#create-goal-button');
                              if (createButton instanceof HTMLButtonElement) {
                                createButton.click();
                              }
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
          <div className="mt-3">
            {/* Month Navigation Buttons */}
            <div className="grid grid-cols-6 gap-1 mb-3">
              {chart.labels.map((label, idx) => (
                <Button 
                  key={idx}
                  variant={selectedMonthIndex === idx ? "default" : "outline"}
                  size="sm"
                  className="h-7 p-1 text-xs"
                  onClick={() => onMonthSelect && onMonthSelect(
                    new Date().getFullYear() + Math.floor((new Date().getMonth() + idx) / 12),
                    ((new Date().getMonth() + idx) % 12) + 1
                  )}
                >
                  {label}
                </Button>
              ))}
            </div>
            
            {/* Bar Chart */}
            <div className="grid grid-cols-6 gap-1 h-16">
              {chart.values.map((val, idx) => {
                // Find goal for this month's column
                const today = new Date();
                const targetDate = addMonths(new Date(today.getFullYear(), today.getMonth(), 1), idx);
                const matchingGoal = goals?.find(g => 
                  g.year === targetDate.getFullYear() && 
                  g.month === targetDate.getMonth() + 1
                );
                
                // Determine if this month has met or exceeded its goal
                const hasGoal = !!matchingGoal;
                const isExceedingGoal = hasGoal && val >= matchingGoal.targetAmount;
                
                return (
                  <div key={idx} className={`bg-primary bg-opacity-20 relative rounded-sm ${selectedMonthIndex === idx ? 'ring-1 ring-primary' : ''}`}>
                    <div 
                      className={`absolute bottom-0 w-full rounded-sm ${isExceedingGoal ? 'bg-green-400' : 'bg-primary'}`}
                      style={{ height: `${(val / Math.max(...chart.values, ...((goals || []).map(g => g.targetAmount) || []))) * 100}%` }}
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
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Fiscal Week Display - Appears below the monthly chart */}
          {showFiscalWeeks && chart?.weekLabels && chart?.weekValues && (
            <div className="mt-8 bg-gray-900/30 rounded-lg p-4 border border-gray-800">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-medium text-gray-300">Fiscal Week Breakdown</h4>
                <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded-full">
                  {selectedWeekIndex !== undefined && chart.weekLabels[selectedWeekIndex]}
                </span>
              </div>
              
              {/* Week Navigation Buttons */}
              <div className="grid grid-cols-6 gap-1 mb-3">
                {chart.weekLabels.slice(0, 6).map((label, idx) => (
                  <Button 
                    key={idx}
                    variant={selectedWeekIndex === idx ? "default" : "outline"}
                    size="sm"
                    className="h-7 p-1 text-xs"
                    onClick={() => onWeekSelect && onWeekSelect(
                      new Date().getFullYear(),
                      idx + 1
                    )}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              
              {/* Fiscal Week Chart */}
              <div className="grid grid-cols-6 gap-1 h-20">
                {chart.weekValues.slice(0, 6).map((val, idx) => {
                  // Find if there's a goal for this week
                  const today = new Date();
                  const matchingGoal = goals?.find(g => 
                    g.year === today.getFullYear() && 
                    g.month === (selectedMonthIndex || 0) + 1 && 
                    g.week === idx + 1
                  );
                  
                  // Determine if this week has met or exceeded its goal
                  const hasGoal = !!matchingGoal;
                  const isExceedingGoal = hasGoal && val >= (matchingGoal.targetAmount || 0);
                  
                  return (
                    <div key={idx} className={`bg-blue-500 bg-opacity-20 relative rounded-sm ${selectedWeekIndex === idx ? 'ring-1 ring-blue-400' : ''}`}>
                      <div 
                        className={`absolute bottom-0 w-full rounded-sm ${isExceedingGoal ? 'bg-green-400' : 'bg-blue-400'}`}
                        style={{ height: `${(val / Math.max(...chart.weekValues.slice(0, 6), 1)) * 100}%` }}
                      ></div>
                      
                      {/* Goal marker line if this week has a goal */}
                      {hasGoal && (
                        <div 
                          className={`absolute w-full border-t-2 ${isExceedingGoal ? 'border-green-700' : 'border-amber-400'} border-dashed`}
                          style={{ 
                            bottom: `${(matchingGoal.targetAmount / Math.max(...chart.weekValues.slice(0, 6), 1)) * 100}%` 
                          }}
                        ></div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Weekly Total vs Target */}
              {selectedWeekIndex !== undefined && (
                <div className="mt-3 flex justify-between items-center text-sm">
                  <span className="text-gray-400">Week {chart.weekLabels[selectedWeekIndex]} Total:</span>
                  <span className="font-bold">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(chart.weekValues[selectedWeekIndex])}
                  </span>
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
    </Card>
  );
}

export default BillingStatusCard;
