import React, { useState, useEffect, useMemo } from 'react';
import { format, addWeeks, startOfWeek, endOfWeek, eachWeekOfInterval, addDays, isSameDay } from 'date-fns';
import { DndContext, DragEndEvent, DragStartEvent, useSensors, useSensor, PointerSensor } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PlusCircle, Edit, Check, X, Calendar, ArrowLeft, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ManufacturingSchedule, Project } from '@shared/schema';
import { checkScheduleConflict } from '@/lib/utils';

interface ScheduleItem {
  id: number;
  projectId: number;
  bayId: number;
  startDate: string;
  endDate: string;
  status: 'scheduled' | 'in_progress' | 'complete' | 'maintenance';
  projectName: string;
  projectNumber: string;
  bayName: string;
  bayNumber: number;
}

interface BaySlot {
  id: string;
  bayId: number;
  position: number;
  date: Date;
  scheduleId?: number;
  isOccupied: boolean;
  isDisabled: boolean;
  interval?: number; // Number of days in this slot (1 for day view, 7 for week, ~30 for month)
}

interface ProjectCard {
  id: number;
  name: string;
  projectNumber: string;
  scheduleId?: number;
  assignedSlotId?: string;
  status: 'scheduled' | 'in_progress' | 'complete' | 'maintenance';
  startDate: string;
  endDate: string;
}

// Define bay types
interface Bay {
  id: number;
  name: string;
  bayNumber: number;
  description: string;
  team: string;
  isActive: boolean;
}

// Group type for organizing related bays
interface BayGroup {
  id: string;
  name: string;
  bays: Bay[];
  team: string;
}

// Week range for timeline
interface WeekRange {
  startDate: Date;
  endDate: Date;
  weekNumber: number;
  label: string;
}

interface ManufacturingBayLayoutProps {
  schedules: ManufacturingSchedule[];
  projects: Project[];
  bays: Bay[];
  onScheduleChange: (scheduleId: number, newBayId: number, newStartDate: string, newEndDate: string) => Promise<void>;
  onScheduleCreate: (projectId: number, bayId: number, startDate: string, endDate: string) => Promise<void>;
  onUpdateBay?: (bayId: number, name: string, description: string, team: string) => Promise<void>;
}

// Project card component
const ProjectCard = ({ project }: { project: ProjectCard }) => {
  // Helper to format dates in a friendly format
  const formatDateDisplay = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'MMM d');
  };

  // Handle drag start
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      projectId: project.id,
      projectNumber: project.projectNumber,
      name: project.name,
      startDate: project.startDate,
      endDate: project.endDate
    }));
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div 
      className="bg-white/5 rounded p-2 mb-2 border border-blue-500/30 hover:bg-white/10 cursor-grab"
      draggable="true"
      onDragStart={handleDragStart}
      data-project-id={project.id}
    >
      <div className="text-sm font-medium">{project.projectNumber}</div>
      <div className="text-xs text-gray-400 mt-1">{formatDateDisplay(project.startDate)} - {formatDateDisplay(project.endDate)}</div>
    </div>
  );
};

// Bay column component with frozen scrolling
const BayColumn = ({ bay, onClick }: { bay: Bay; onClick?: () => void }) => {
  return (
    <div className="w-[100px] h-12 bg-blue-500/10 flex items-center justify-center border-r-2 border-blue-500/20 sticky left-0 z-10">
      <div className="text-sm font-medium text-blue-400">Bay {bay.bayNumber}</div>
    </div>
  );
};

// Day header component
const DayHeader = ({ date, isWeekend }: { date: Date; isWeekend: boolean }) => {
  const isToday = isSameDay(date, new Date());
  return (
    <div className={`text-center py-1 border-r border-r-border/30 ${isWeekend ? 'bg-gray-800/30' : ''}`}>
      <div className="text-xs text-gray-400">{format(date, 'EEE')}</div>
      <div className={`text-sm ${isToday ? 'text-blue-400 font-medium' : ''}`}>{format(date, 'd')}</div>
    </div>
  );
};

// Week header component
const WeekHeader = ({ startDate, endDate, weekNum }: { startDate: Date; endDate: Date; weekNum: number }) => {
  return (
    <div className="text-center border-b border-b-border/50 py-2 mb-2">
      <div className="font-medium">Week {weekNum}</div>
      <div className="text-xs text-gray-400">
        {format(startDate, 'MMM d')} - {format(endDate, 'MMM d')}
      </div>
    </div>
  );
};

// Main component function
const ManufacturingBayLayout: React.FC<ManufacturingBayLayoutProps> = ({
  schedules,
  projects,
  bays,
  onScheduleChange,
  onScheduleCreate,
  onUpdateBay
}) => {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
  const [dateRange, setDateRange] = useState<{ start: Date, end: Date }>({
    start: startOfWeek(new Date(), { weekStartsOn: 1 }),
    end: endOfWeek(addWeeks(new Date(), 1), { weekStartsOn: 1 })
  });
  
  // For tracking drag and drop operations
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);
  
  // Prepare schedule data by bay
  const schedulesByBay = useMemo(() => {
    const result: Record<number, any[]> = {};
    
    schedules.forEach(schedule => {
      const project = projects.find(p => p.id === schedule.projectId);
      if (!result[schedule.bayId]) {
        result[schedule.bayId] = [];
      }
      
      result[schedule.bayId].push({
        ...schedule,
        projectName: project?.name || `Project #${schedule.projectId}`,
        projectNumber: project?.projectNumber || '',
      });
    });
    
    return result;
  }, [schedules, projects]);
  
  // Generate dates based on view mode
  const viewDates = useMemo(() => {
    // For day view, generate all individual days
    if (viewMode === 'day') {
      const days: Date[] = [];
      let currentDate = new Date(dateRange.start);
      
      while (currentDate <= dateRange.end) {
        days.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      return days;
    }
    
    // For week view, generate week starts
    if (viewMode === 'week') {
      const weeks: Date[] = [];
      let currentDate = new Date(dateRange.start);
      
      while (currentDate <= dateRange.end) {
        weeks.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 7);
      }
      
      return weeks;
    }
    
    // For month view
    return [dateRange.start, addDays(dateRange.start, 30), addDays(dateRange.start, 60)];
  }, [viewMode, dateRange]);
  
  // Grouped bays by team
  const bayGroups = useMemo(() => {
    const groups: Record<string, Bay[]> = {};
    
    bays.forEach(bay => {
      const team = bay.team || 'Unassigned';
      if (!groups[team]) {
        groups[team] = [];
      }
      groups[team].push(bay);
    });
    
    return Object.entries(groups).map(([name, bays]) => ({
      name,
      bays: bays.sort((a, b) => a.bayNumber - b.bayNumber)
    }));
  }, [bays]);
  
  // Unassigned projects
  const unassignedProjects = useMemo(() => {
    const scheduledIds = new Set(schedules.map(s => s.projectId));
    return projects.filter(p => !scheduledIds.has(p.id));
  }, [projects, schedules]);
  
  return (
    <div className="mb-8">
      {/* Schedule header with view mode selection */}
      <div className="flex justify-between items-center mb-4 sticky top-0 z-20 bg-background p-2">
        <h2 className="text-xl font-bold">Manufacturing Bay Schedule</h2>
        
        <div className="flex items-center gap-2">
          <Button onClick={() => {/* Previous dates logic */}} size="sm" variant="outline">
            <ArrowLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          
          <span className="text-sm px-2">
            {format(dateRange.start, 'MMM d')} - {format(dateRange.end, 'MMM d')}
          </span>
          
          <Button onClick={() => {/* Next dates logic */}} size="sm" variant="outline">
            Next <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
          
          <div className="flex border border-border rounded-md overflow-hidden ml-4">
            <Button 
              size="sm" 
              variant={viewMode === 'day' ? 'default' : 'ghost'} 
              className="rounded-none"
              onClick={() => setViewMode('day')}
            >
              Day
            </Button>
            <Button 
              size="sm" 
              variant={viewMode === 'week' ? 'default' : 'ghost'} 
              className="rounded-none"
              onClick={() => setViewMode('week')}
            >
              Week
            </Button>
            <Button 
              size="sm" 
              variant={viewMode === 'month' ? 'default' : 'ghost'} 
              className="rounded-none"
              onClick={() => setViewMode('month')}
            >
              Month
            </Button>
          </div>
        </div>
      </div>
      
      <div className="flex">
        {/* Main content area */}
        <div className="flex-1 pr-4">
          {/* Display weeks header */}
          <div className="flex mb-4 ml-[100px]">
            {viewMode === 'day' ? (
              // For day view, show weeks
              [...Array(2)].map((_, i) => {
                const weekStart = addDays(dateRange.start, i * 7);
                const weekEnd = addDays(weekStart, 6);
                return (
                  <div key={i} className="flex-1">
                    <WeekHeader startDate={weekStart} endDate={weekEnd} weekNum={i + 1} />
                    <div className="flex">
                      {[...Array(7)].map((_, j) => {
                        const date = addDays(weekStart, j);
                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                        return (
                          <div key={j} className="flex-1">
                            <DayHeader date={date} isWeekend={isWeekend} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            ) : viewMode === 'week' ? (
              // For week view, show week blocks
              [...Array(4)].map((_, i) => {
                const weekStart = addDays(dateRange.start, i * 7);
                const weekEnd = addDays(weekStart, 6);
                return (
                  <div key={i} className="flex-1">
                    <WeekHeader startDate={weekStart} endDate={weekEnd} weekNum={i + 1} />
                    <div className="flex items-center justify-center h-10 border-r border-border/30 text-sm">
                      {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d')}
                    </div>
                  </div>
                );
              })
            ) : (
              // For month view, show month blocks
              [...Array(3)].map((_, i) => {
                const monthStart = addDays(dateRange.start, i * 30);
                const monthEnd = addDays(monthStart, 29);
                return (
                  <div key={i} className="flex-1">
                    <div className="text-center border-b border-b-border/50 py-2 mb-2">
                      <div className="font-medium">{format(monthStart, 'MMMM yyyy')}</div>
                    </div>
                    <div className="flex items-center justify-center h-10 border-r border-border/30 text-sm">
                      {format(monthStart, 'MMM')}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          
          {/* Bay sections */}
          {bayGroups.map((group, gIndex) => (
            <div key={gIndex} className="mb-8 bg-card/20 rounded-lg p-4 border-l-4 border border-blue-600/20 border-l-blue-600">
              <h3 className="text-lg font-semibold mb-4">{group.name} Bays</h3>
              
              {group.bays.map((bay) => (
                <div key={bay.id} className="mb-6">
                  <div className="flex items-center mb-2">
                    <div className="bg-card p-1 px-2 rounded-md text-xs mr-2">#{bay.bayNumber}</div>
                    <div className="font-medium">{bay.name}</div>
                    {bay.description && <div className="ml-3 text-xs text-gray-400">{bay.description}</div>}
                  </div>
                  
                  <div className="flex overflow-x-auto relative" style={{ scrollbarWidth: 'thin' }}>
                    {/* Fixed bay column */}
                    <BayColumn bay={bay} />
                    
                    {/* Schedule slots */}
                    <div className="flex-1 overflow-x-auto max-w-[calc(100vw-280px)]" id={`bay-${bay.id}-timeline`}>
                      <div className="flex relative">
                        {/* Today indicator line */}
                        <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10" style={{
                          left: (() => {
                            const today = new Date();
                            const startDate = new Date(dateRange.start);
                            const diffDays = Math.round((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                            
                            if (viewMode === 'day') {
                              return `${diffDays * 40}px`; // 40px per day
                            } else if (viewMode === 'week') {
                              return `${(diffDays / 7) * 160}px`; // 160px per week
                            } else {
                              return `${(diffDays / 30) * 320}px`; // 320px per month
                            }
                          })()
                        }}></div>
                      
                        {viewMode === 'day' ? (
                          // Day slots - 14 days
                          [...Array(14)].map((_, i) => {
                            const date = addDays(dateRange.start, i);
                            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                            const isToday = isSameDay(date, new Date());
                            
                            // Check if this day has a schedule
                            const daySchedule = schedulesByBay[bay.id]?.find(s => {
                              const scheduleStart = new Date(s.startDate);
                              const scheduleEnd = new Date(s.endDate);
                              return date >= scheduleStart && date <= scheduleEnd;
                            });
                            
                            return (
                              <div 
                                key={i}
                                data-date={format(date, 'yyyy-MM-dd')}
                                data-bay-id={bay.id}
                                className={`
                                  w-10 h-12 border-r border-border/30
                                  ${isWeekend ? 'bg-gray-800/30' : ''}
                                  ${isToday ? 'bg-blue-900/20' : ''}
                                  ${daySchedule ? '' : 'droppable-slot hover:bg-blue-500/10'}
                                  ${dragOverSlot === `slot-${bay.id}-${format(date, 'yyyy-MM-dd')}` ? 'bg-blue-500/20' : ''}
                                `}
                                onDragOver={(e) => {
                                  if (!daySchedule) {
                                    e.preventDefault();
                                    setDragOverSlot(`slot-${bay.id}-${format(date, 'yyyy-MM-dd')}`);
                                  }
                                }}
                                onDragLeave={() => setDragOverSlot(null)}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  setDragOverSlot(null);
                                  
                                  try {
                                    const data = JSON.parse(e.dataTransfer.getData('application/json'));
                                    
                                    // If it's a new project being scheduled
                                    if (data.projectId && !data.scheduleId) {
                                      // Calculate a default end date (7 days after start)
                                      const startDate = format(date, 'yyyy-MM-dd');
                                      const endDate = format(addDays(date, 7), 'yyyy-MM-dd');
                                      
                                      toast({
                                        title: "Scheduling project",
                                        description: `Project ${data.projectNumber} in Bay ${bay.bayNumber}`,
                                      });
                                      
                                      onScheduleCreate(
                                        data.projectId,
                                        bay.id,
                                        startDate,
                                        endDate
                                      );
                                    } 
                                    // If it's an existing schedule being moved
                                    else if (data.scheduleId) {
                                      const startDate = format(date, 'yyyy-MM-dd');
                                      
                                      // Calculate the same duration as before
                                      const oldStartDate = new Date(data.startDate);
                                      const oldEndDate = new Date(data.endDate);
                                      const durationMs = oldEndDate.getTime() - oldStartDate.getTime();
                                      const newEndDate = format(new Date(date.getTime() + durationMs), 'yyyy-MM-dd');
                                      
                                      toast({
                                        title: "Moving schedule",
                                        description: `Project ${data.projectNumber} to Bay ${bay.bayNumber}`,
                                      });
                                      
                                      onScheduleChange(
                                        data.scheduleId,
                                        bay.id,
                                        startDate,
                                        newEndDate
                                      );
                                    }
                                  } catch (error) {
                                    console.error('Error parsing drop data:', error);
                                    toast({
                                      title: "Error",
                                      description: "Failed to schedule project",
                                      variant: "destructive"
                                    });
                                  }
                                }}
                              >
                                {daySchedule && (
                                  <div 
                                    className="h-full w-full flex items-center justify-center text-xs text-white bg-blue-500/70 cursor-grab draggable-project"
                                    draggable="true"
                                    data-project-id={daySchedule.projectId}
                                    data-schedule-id={daySchedule.id}
                                    data-bay-id={bay.id}
                                    data-start-date={daySchedule.startDate}
                                    data-end-date={daySchedule.endDate}
                                    onDragStart={(e) => {
                                      e.dataTransfer.setData('application/json', JSON.stringify({
                                        projectId: daySchedule.projectId,
                                        scheduleId: daySchedule.id,
                                        bayId: bay.id,
                                        startDate: daySchedule.startDate,
                                        endDate: daySchedule.endDate,
                                        projectNumber: daySchedule.projectNumber
                                      }));
                                      e.dataTransfer.effectAllowed = 'move';
                                    }}
                                  >
                                    {daySchedule.projectNumber}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        ) : viewMode === 'week' ? (
                          // Week slots - 4 weeks
                          [...Array(4)].map((_, i) => {
                            const weekStart = addDays(dateRange.start, i * 7);
                            const weekEnd = addDays(weekStart, 6);
                            const isCurrentWeek = isSameDay(new Date(), weekStart) || 
                              (new Date() >= weekStart && new Date() <= weekEnd);
                            
                            // Check if this week has a schedule
                            const weekSchedule = schedulesByBay[bay.id]?.find(s => {
                              const scheduleStart = new Date(s.startDate);
                              const scheduleEnd = new Date(s.endDate);
                              return (
                                (weekStart <= scheduleEnd && weekEnd >= scheduleStart) ||
                                (scheduleStart >= weekStart && scheduleStart <= weekEnd)
                              );
                            });
                            
                            return (
                              <div 
                                key={i}
                                data-date={format(weekStart, 'yyyy-MM-dd')}
                                data-bay-id={bay.id}
                                className={`
                                  w-40 h-12 border-r border-border/30
                                  ${isCurrentWeek ? 'bg-blue-900/20' : ''}
                                  ${weekSchedule ? '' : 'droppable-slot hover:bg-blue-500/10'}
                                  ${dragOverSlot === `slot-${bay.id}-week-${format(weekStart, 'yyyy-MM-dd')}` ? 'bg-blue-500/20' : ''}
                                `}
                                onDragOver={(e) => {
                                  if (!weekSchedule) {
                                    e.preventDefault();
                                    setDragOverSlot(`slot-${bay.id}-week-${format(weekStart, 'yyyy-MM-dd')}`);
                                  }
                                }}
                                onDragLeave={() => setDragOverSlot(null)}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  setDragOverSlot(null);
                                  
                                  try {
                                    const data = JSON.parse(e.dataTransfer.getData('application/json'));
                                    
                                    // If it's a new project being scheduled
                                    if (data.projectId && !data.scheduleId) {
                                      // For week view, schedule for the entire week
                                      const startDate = format(weekStart, 'yyyy-MM-dd');
                                      const endDate = format(addDays(weekStart, 14), 'yyyy-MM-dd');
                                      
                                      toast({
                                        title: "Scheduling project",
                                        description: `Project ${data.projectNumber} in Bay ${bay.bayNumber}`,
                                      });
                                      
                                      onScheduleCreate(
                                        data.projectId,
                                        bay.id,
                                        startDate,
                                        endDate
                                      );
                                    } 
                                    // If it's an existing schedule being moved
                                    else if (data.scheduleId) {
                                      const startDate = format(weekStart, 'yyyy-MM-dd');
                                      
                                      // Calculate the same duration as before
                                      const oldStartDate = new Date(data.startDate);
                                      const oldEndDate = new Date(data.endDate);
                                      const durationMs = oldEndDate.getTime() - oldStartDate.getTime();
                                      const newEndDate = format(new Date(weekStart.getTime() + durationMs), 'yyyy-MM-dd');
                                      
                                      toast({
                                        title: "Moving schedule",
                                        description: `Project ${data.projectNumber} to Bay ${bay.bayNumber}`,
                                      });
                                      
                                      onScheduleChange(
                                        data.scheduleId,
                                        bay.id,
                                        startDate,
                                        newEndDate
                                      );
                                    }
                                  } catch (error) {
                                    console.error('Error parsing drop data:', error);
                                    toast({
                                      title: "Error",
                                      description: "Failed to schedule project",
                                      variant: "destructive"
                                    });
                                  }
                                }}
                              >
                                {weekSchedule && (
                                  <div 
                                    className="h-full w-full flex items-center justify-center text-xs text-white bg-blue-500/70 cursor-grab draggable-project"
                                    draggable="true"
                                    data-project-id={weekSchedule.projectId}
                                    data-schedule-id={weekSchedule.id}
                                    data-bay-id={bay.id}
                                    data-start-date={weekSchedule.startDate}
                                    data-end-date={weekSchedule.endDate}
                                    onDragStart={(e) => {
                                      e.dataTransfer.setData('application/json', JSON.stringify({
                                        projectId: weekSchedule.projectId,
                                        scheduleId: weekSchedule.id,
                                        bayId: bay.id,
                                        startDate: weekSchedule.startDate,
                                        endDate: weekSchedule.endDate,
                                        projectNumber: weekSchedule.projectNumber
                                      }));
                                      e.dataTransfer.effectAllowed = 'move';
                                    }}
                                  >
                                    {weekSchedule.projectNumber}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          // Month slots - 3 months
                          [...Array(3)].map((_, i) => {
                            const monthStart = addDays(dateRange.start, i * 30);
                            const monthEnd = addDays(monthStart, 29);
                            const isCurrentMonth = 
                              new Date().getMonth() === monthStart.getMonth() && 
                              new Date().getFullYear() === monthStart.getFullYear();
                            
                            // Check if this month has a schedule
                            const monthSchedule = schedulesByBay[bay.id]?.find(s => {
                              const scheduleStart = new Date(s.startDate);
                              const scheduleEnd = new Date(s.endDate);
                              return (
                                (monthStart <= scheduleEnd && monthEnd >= scheduleStart) ||
                                (scheduleStart >= monthStart && scheduleStart <= monthEnd)
                              );
                            });
                            
                            return (
                              <div 
                                key={i}
                                data-date={format(monthStart, 'yyyy-MM-dd')}
                                data-bay-id={bay.id}
                                className={`
                                  w-80 h-12 border-r border-border/30
                                  ${isCurrentMonth ? 'bg-blue-900/20' : ''}
                                  ${monthSchedule ? '' : 'droppable-slot hover:bg-blue-500/10'}
                                  ${dragOverSlot === `slot-${bay.id}-month-${format(monthStart, 'yyyy-MM-dd')}` ? 'bg-blue-500/20' : ''}
                                `}
                                onDragOver={(e) => {
                                  if (!monthSchedule) {
                                    e.preventDefault();
                                    setDragOverSlot(`slot-${bay.id}-month-${format(monthStart, 'yyyy-MM-dd')}`);
                                  }
                                }}
                                onDragLeave={() => setDragOverSlot(null)}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  setDragOverSlot(null);
                                  
                                  try {
                                    const data = JSON.parse(e.dataTransfer.getData('application/json'));
                                    
                                    // If it's a new project being scheduled
                                    if (data.projectId && !data.scheduleId) {
                                      // For month view, schedule for a whole month
                                      const startDate = format(monthStart, 'yyyy-MM-dd');
                                      const endDate = format(addDays(monthStart, 30), 'yyyy-MM-dd');
                                      
                                      toast({
                                        title: "Scheduling project",
                                        description: `Project ${data.projectNumber} in Bay ${bay.bayNumber}`,
                                      });
                                      
                                      onScheduleCreate(
                                        data.projectId,
                                        bay.id,
                                        startDate,
                                        endDate
                                      );
                                    } 
                                    // If it's an existing schedule being moved
                                    else if (data.scheduleId) {
                                      const startDate = format(monthStart, 'yyyy-MM-dd');
                                      
                                      // Calculate the same duration as before
                                      const oldStartDate = new Date(data.startDate);
                                      const oldEndDate = new Date(data.endDate);
                                      const durationMs = oldEndDate.getTime() - oldStartDate.getTime();
                                      const newEndDate = format(new Date(monthStart.getTime() + durationMs), 'yyyy-MM-dd');
                                      
                                      toast({
                                        title: "Moving schedule",
                                        description: `Project ${data.projectNumber} to Bay ${bay.bayNumber}`,
                                      });
                                      
                                      onScheduleChange(
                                        data.scheduleId,
                                        bay.id,
                                        startDate,
                                        newEndDate
                                      );
                                    }
                                  } catch (error) {
                                    console.error('Error parsing drop data:', error);
                                    toast({
                                      title: "Error",
                                      description: "Failed to schedule project",
                                      variant: "destructive"
                                    });
                                  }
                                }}
                              >
                                {monthSchedule && (
                                  <div 
                                    className="h-full w-full flex items-center justify-center text-xs text-white bg-blue-500/70 cursor-grab draggable-project"
                                    draggable="true"
                                    data-project-id={monthSchedule.projectId}
                                    data-schedule-id={monthSchedule.id}
                                    data-bay-id={bay.id}
                                    data-start-date={monthSchedule.startDate}
                                    data-end-date={monthSchedule.endDate}
                                    onDragStart={(e) => {
                                      e.dataTransfer.setData('application/json', JSON.stringify({
                                        projectId: monthSchedule.projectId,
                                        scheduleId: monthSchedule.id,
                                        bayId: bay.id,
                                        startDate: monthSchedule.startDate,
                                        endDate: monthSchedule.endDate,
                                        projectNumber: monthSchedule.projectNumber
                                      }));
                                      e.dataTransfer.effectAllowed = 'move';
                                    }}
                                  >
                                    {monthSchedule.projectNumber}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
        
        {/* Unassigned projects sidebar */}
        <div className="w-64">
          <div className="bg-card/20 p-4 rounded-lg border border-border/50">
            <h3 className="font-bold mb-4">Unassigned Projects</h3>
            
            {unassignedProjects.length === 0 ? (
              <p className="text-sm text-gray-400">No unassigned projects</p>
            ) : (
              <div>
                {unassignedProjects.map(project => (
                  <ProjectCard 
                    key={project.id} 
                    project={{
                      id: project.id,
                      name: project.name,
                      projectNumber: project.projectNumber,
                      status: 'scheduled',
                      startDate: (project.startDate as string) || new Date().toISOString(),
                      endDate: (project.endDate as string) || addDays(new Date(), 14).toISOString(),
                    }} 
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export { ManufacturingBayLayout };