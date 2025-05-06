import React, { useState, useEffect, useMemo } from 'react';
import { format, addDays, differenceInDays, isSameDay } from 'date-fns';
import { PlusCircle, GripVertical, Info, X, ArrowsExpand } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ManufacturingBay, ManufacturingSchedule, Project } from '@shared/schema';

interface ResizableBayScheduleProps {
  schedules: ManufacturingSchedule[];
  projects: Project[];
  bays: ManufacturingBay[];
  onScheduleChange: (scheduleId: number, newBayId: number, newStartDate: string, newEndDate: string, totalHours?: number) => Promise<void>;
  onScheduleCreate: (projectId: number, bayId: number, startDate: string, endDate: string, totalHours?: number) => Promise<void>;
}

interface ScheduleBar {
  id: number;
  projectId: number;
  bayId: number;
  startDate: Date;
  endDate: Date;
  totalHours: number;
  projectName: string;
  projectNumber: string;
  width: number; // Width based on bay capacity
}

const ResizableBaySchedule: React.FC<ResizableBayScheduleProps> = ({
  schedules,
  projects,
  bays,
  onScheduleChange,
  onScheduleCreate
}) => {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<{ start: Date, end: Date }>({
    start: new Date(),
    end: addDays(new Date(), 28) // Show 4 weeks by default
  });
  
  const [draggingSchedule, setDraggingSchedule] = useState<ScheduleBar | null>(null);
  const [resizingSchedule, setResizingSchedule] = useState<ScheduleBar | null>(null);
  const [draggingPosition, setDraggingPosition] = useState({ x: 0, y: 0 });
  const [dropTarget, setDropTarget] = useState<{ bayId: number, date: Date } | null>(null);
  
  // Calculate total days shown
  const totalDays = differenceInDays(dateRange.end, dateRange.start) + 1;
  
  // Generate all dates in range
  const dates = useMemo(() => {
    const result = [];
    const currentDate = new Date(dateRange.start);
    while (currentDate <= dateRange.end) {
      result.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return result;
  }, [dateRange]);
  
  // Create schedule bars with calculated widths based on bay capacity
  const scheduleBars = useMemo(() => {
    return schedules.map(schedule => {
      const project = projects.find(p => p.id === schedule.projectId);
      const bay = bays.find(b => b.id === schedule.bayId);
      
      if (!project || !bay) return null;
      
      // Calculate bay's hourly capacity per day
      const dailyCapacity = (bay.hoursPerPersonPerWeek * bay.staffCount) / 5; // Assuming 5 workdays per week
      
      // Calculate how many days are needed for this project based on total hours
      const daysNeeded = Math.ceil(schedule.totalHours / dailyCapacity);
      
      // Calculate width percentage (how much of the bay's width this project will take)
      const totalDaysInView = differenceInDays(dateRange.end, dateRange.start) + 1;
      const width = (daysNeeded / totalDaysInView) * 100;
      
      return {
        id: schedule.id,
        projectId: schedule.projectId,
        bayId: schedule.bayId,
        startDate: new Date(schedule.startDate),
        endDate: new Date(schedule.endDate),
        totalHours: schedule.totalHours || 40, // Default to 40 if not specified
        projectName: project.name,
        projectNumber: project.projectNumber,
        width: width
      };
    }).filter(Boolean) as ScheduleBar[];
  }, [schedules, projects, bays, dateRange]);
  
  // Handler for when drag starts
  const handleDragStart = (e: React.DragEvent, schedule: ScheduleBar) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      scheduleId: schedule.id,
      projectId: schedule.projectId,
      bayId: schedule.bayId,
      startDate: schedule.startDate.toISOString(),
      endDate: schedule.endDate.toISOString(),
      totalHours: schedule.totalHours,
      projectName: schedule.projectName,
      projectNumber: schedule.projectNumber
    }));
    
    setDraggingSchedule(schedule);
    setDraggingPosition({ x: e.clientX, y: e.clientY });
  };
  
  // Handler for when drag ends
  const handleDragEnd = () => {
    setDraggingSchedule(null);
    setDropTarget(null);
  };
  
  // Handler for resizing bars
  const handleResizeStart = (e: React.MouseEvent, schedule: ScheduleBar) => {
    e.stopPropagation();
    setResizingSchedule(schedule);
    
    // Set up resize event listeners
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingSchedule) return;
      
      // Calculate new width based on mouse position
      const container = document.getElementById(`bay-container-${schedule.bayId}`);
      if (!container) return;
      
      const containerRect = container.getBoundingClientRect();
      const mouseX = moveEvent.clientX - containerRect.left;
      const containerWidth = containerRect.width;
      
      // Calculate width percentage
      let newWidthPercent = (mouseX / containerWidth) * 100;
      // Clamp between reasonable values
      newWidthPercent = Math.max(10, Math.min(newWidthPercent, 100));
      
      // Update the resizing schedule with new width
      setResizingSchedule(prev => {
        if (!prev) return null;
        return { ...prev, width: newWidthPercent };
      });
    };
    
    const handleMouseUp = () => {
      if (!resizingSchedule) return;
      
      // Calculate new hours based on width
      const bay = bays.find(b => b.id === resizingSchedule.bayId);
      if (!bay) return;
      
      const dailyCapacity = (bay.hoursPerPersonPerWeek * bay.staffCount) / 5;
      const totalDaysInView = differenceInDays(dateRange.end, dateRange.start) + 1;
      const daysNeeded = (resizingSchedule.width / 100) * totalDaysInView;
      const newTotalHours = Math.ceil(daysNeeded * dailyCapacity);
      
      // Calculate new end date based on start date and days needed
      const newEndDate = addDays(resizingSchedule.startDate, daysNeeded);
      
      // Update schedule with new hours and end date
      onScheduleChange(
        resizingSchedule.id,
        resizingSchedule.bayId,
        resizingSchedule.startDate.toISOString(),
        newEndDate.toISOString(),
        newTotalHours
      ).then(() => {
        toast({
          title: "Project Updated",
          description: `${resizingSchedule?.projectNumber} has been resized to ${newTotalHours} hours`,
        });
      }).catch(err => {
        toast({
          title: "Error",
          description: "Failed to resize project schedule",
          variant: "destructive"
        });
      });
      
      setResizingSchedule(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  // Handler for when schedule is dropped on a bay
  const handleDrop = (e: React.DragEvent, bayId: number, date: Date) => {
    e.preventDefault();
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      
      if (!data) return;
      
      const scheduleId = data.scheduleId;
      const projectId = data.projectId;
      const totalHours = data.totalHours || 40;
      
      // Find the bay
      const bay = bays.find(b => b.id === bayId);
      if (!bay) return;
      
      // Calculate daily capacity
      const dailyCapacity = (bay.hoursPerPersonPerWeek * bay.staffCount) / 5;
      
      // Calculate how many days are needed for this project based on total hours
      const daysNeeded = Math.ceil(totalHours / dailyCapacity);
      
      // Calculate new end date based on start date and days needed
      const newEndDate = addDays(date, daysNeeded);
      
      if (scheduleId) {
        // Update existing schedule
        onScheduleChange(
          scheduleId,
          bayId,
          date.toISOString(),
          newEndDate.toISOString(),
          totalHours
        ).then(() => {
          toast({
            title: "Schedule Updated",
            description: `Project moved to Bay ${bay.bayNumber}`,
          });
        }).catch(err => {
          toast({
            title: "Error",
            description: "Failed to update schedule",
            variant: "destructive"
          });
        });
      } else {
        // Create new schedule
        onScheduleCreate(
          projectId,
          bayId,
          date.toISOString(),
          newEndDate.toISOString(),
          totalHours
        ).then(() => {
          toast({
            title: "Schedule Created",
            description: `Project assigned to Bay ${bay.bayNumber}`,
          });
        }).catch(err => {
          toast({
            title: "Error",
            description: "Failed to create schedule",
            variant: "destructive"
          });
        });
      }
    } catch (error) {
      console.error('Error handling drop:', error);
      toast({
        title: "Error",
        description: "Failed to process schedule",
        variant: "destructive"
      });
    }
    
    setDropTarget(null);
  };
  
  // Handler for when drag enters a potential drop zone
  const handleDragOver = (e: React.DragEvent, bayId: number, date: Date) => {
    e.preventDefault();
    setDropTarget({ bayId, date });
  };
  
  return (
    <div className="mb-8 overflow-x-auto">
      {/* Date header */}
      <div className="flex">
        <div className="w-40 shrink-0"></div>
        <div className="flex">
          {dates.map((date, index) => {
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const isToday = isSameDay(date, new Date());
            
            return (
              <div
                key={index}
                className={`w-14 text-center py-2 text-xs border-r border-gray-800 ${
                  isWeekend ? 'bg-gray-800/20' : ''
                } ${isToday ? 'bg-blue-900/20' : ''}`}
              >
                <div className="mb-1 font-medium">{format(date, 'EEE')}</div>
                <div>{format(date, 'MMM d')}</div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Bay rows */}
      {bays.map(bay => {
        // Find schedules for this bay
        const baySchedules = scheduleBars.filter(bar => bar && bar.bayId === bay.id);
        
        // Calculate bay capacity
        const dailyCapacity = (bay.hoursPerPersonPerWeek * bay.staffCount) / 5;
        const weeklyCapacity = bay.hoursPerPersonPerWeek * bay.staffCount;
        
        return (
          <div key={bay.id} className="flex mt-1">
            {/* Bay info */}
            <div className="w-40 shrink-0 bg-gray-800/30 p-2 border-r border-gray-700 flex items-center">
              <div className="mr-2 bg-primary/20 text-primary p-1 rounded text-xs font-medium">
                {bay.bayNumber}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">{bay.name}</div>
                <div className="text-xs text-gray-400 flex items-center">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center cursor-help">
                          {bay.staffCount} staff · {weeklyCapacity}h/week
                          <Info className="h-3 w-3 ml-1 text-gray-500" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Bay Capacity: {dailyCapacity} hours/day</p>
                        <p>Weekly Capacity: {weeklyCapacity} hours/week</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>
            
            {/* Timeline container */}
            <div
              id={`bay-container-${bay.id}`}
              className="flex-1 relative h-20 bg-gray-900/30 border-b border-gray-800"
              onDragOver={e => e.preventDefault()}
              onDrop={e => handleDrop(e, bay.id, dateRange.start)}
            >
              {/* Date cells */}
              <div className="flex absolute top-0 left-0 right-0 bottom-0 pointer-events-none">
                {dates.map((date, index) => {
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  const isToday = isSameDay(date, new Date());
                  const isDropTarget = dropTarget?.bayId === bay.id && 
                    isSameDay(dropTarget.date, date);
                  
                  return (
                    <div
                      key={index}
                      className={`w-14 h-full border-r border-gray-800 relative ${
                        isWeekend ? 'bg-gray-800/20' : ''
                      } ${isToday ? 'bg-blue-900/20' : ''} ${
                        isDropTarget ? 'bg-blue-500/20' : ''
                      }`}
                      onDragOver={e => handleDragOver(e, bay.id, date)}
                      onDrop={e => handleDrop(e, bay.id, date)}
                    ></div>
                  );
                })}
              </div>
              
              {/* Schedule bars */}
              {baySchedules.map(schedule => {
                // Calculate position (x offset) based on start date
                const startDayOffset = Math.max(
                  0,
                  differenceInDays(schedule.startDate, dateRange.start)
                );
                const xOffset = (startDayOffset / totalDays) * 100;
                
                // Default styles
                let barStyles = {
                  left: `${xOffset}%`,
                  width: `${schedule.width}%`,
                };
                
                // If this schedule is being resized, use the resizing width
                if (resizingSchedule?.id === schedule.id) {
                  barStyles.width = `${resizingSchedule.width}%`;
                }
                
                return (
                  <div
                    key={schedule.id}
                    className={`absolute top-2 bottom-2 bg-blue-600 rounded-sm overflow-hidden 
                      border border-blue-400 shadow-lg cursor-grab 
                      hover:shadow-xl transition-shadow z-10
                      ${draggingSchedule?.id === schedule.id ? 'opacity-50' : 'opacity-80 hover:opacity-100'}`}
                    style={barStyles}
                    draggable
                    onDragStart={e => handleDragStart(e, schedule)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="flex items-center h-full p-1">
                      <div className="flex-1 text-xs text-white font-medium truncate">
                        {schedule.projectNumber}
                      </div>
                      <div className="text-xs bg-blue-700 rounded px-1 text-blue-200">
                        {schedule.totalHours}h
                      </div>
                      <div 
                        className="ml-1 cursor-ew-resize h-full flex items-center" 
                        onMouseDown={e => handleResizeStart(e, schedule)}
                      >
                        <GripVertical className="h-4 w-4 text-blue-300" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      
      {/* Unassigned projects section */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-2">Unassigned Projects</h3>
        <div className="flex flex-wrap gap-2">
          {projects
            .filter(project => !schedules.some(schedule => schedule.projectId === project.id))
            .map(project => (
              <div
                key={project.id}
                className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-md p-2 cursor-grab"
                draggable
                onDragStart={e => {
                  e.dataTransfer.setData('application/json', JSON.stringify({
                    projectId: project.id,
                    projectNumber: project.projectNumber,
                    projectName: project.name,
                    totalHours: 40 // Default hours
                  }));
                }}
              >
                <div className="text-sm font-medium">{project.projectNumber}</div>
                <div className="text-xs text-gray-400">{project.name}</div>
                <div className="text-xs mt-1 bg-gray-700 text-gray-300 rounded px-1 inline-block">
                  40h (default)
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default ResizableBaySchedule;