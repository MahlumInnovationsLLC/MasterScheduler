import React, { useState, useEffect, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Calendar, ChevronLeft, ChevronRight, Info, Edit, PlusCircle, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  format, 
  addWeeks, 
  addDays, 
  addMonths,
  eachWeekOfInterval, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth,
  endOfMonth,
  isSameWeek 
} from 'date-fns';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkScheduleConflict } from '@/lib/utils';
import { ManufacturingSchedule, Project } from '@shared/schema';

// Types for our components
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
  onScheduleCreate: (projectId: number, bayId: number, startDate: string, endDate: string, row?: number) => Promise<void>;
  onUpdateBay?: (bayId: number, name: string, description: string, team: string) => Promise<void>;
}

// Draggable project card component
const SortableProjectCard = ({ 
  project, 
  isDragging = false
}: { 
  project: ProjectCard; 
  isDragging?: boolean;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: project.id.toString(),
    data: { type: 'project', project }
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.8 : 1,
  };

  // Determine status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-500 bg-opacity-10 text-blue-500 border-blue-500';
      case 'in_progress':
        return 'bg-amber-500 bg-opacity-10 text-amber-500 border-amber-500';
      case 'complete':
        return 'bg-green-500 bg-opacity-10 text-green-500 border-green-500';
      case 'maintenance':
        return 'bg-purple-500 bg-opacity-10 text-purple-500 border-purple-500';
      default:
        return 'bg-gray-500 bg-opacity-10 text-gray-500 border-gray-500';
    }
  };

  // Helper to format dates in a friendly format - fixed timezone issue
  const formatDateDisplay = (dateString: string) => {
    // Parse date as local time to avoid timezone shifts
    const [year, month, day] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return format(date, 'MMM d');
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      {...attributes} 
      {...listeners}
      className="bg-darkCard rounded-md p-3 mb-2 border border-gray-800 shadow-sm cursor-grab"
    >
      <div className="flex items-center justify-between">
        <div className="font-medium truncate">{project.name}</div>
        <Badge className={`${getStatusColor(project.status)} text-xs`}>
          {project.status.replace('_', ' ')}
        </Badge>
      </div>
      <div className="flex items-center mt-2 text-xs text-gray-400">
        <Calendar className="h-3 w-3 mr-1" />
        <span>{formatDateDisplay(project.startDate)} - {formatDateDisplay(project.endDate)}</span>
      </div>
    </div>
  );
};

// Bay slot component
const BaySlot = ({ 
  slot, 
  isOver = false,
  onDoubleClick
}: { 
  slot: BaySlot; 
  isOver?: boolean;
  onDoubleClick: (slot: BaySlot) => void;
}) => {
  
  // Format the date to just display the day of month
  const day = format(slot.date, 'd');
  const isToday = format(new Date(), 'd MMM yyyy') === format(slot.date, 'd MMM yyyy');
  const isWeekend = [0, 6].includes(slot.date.getDay()); // 0 is Sunday, 6 is Saturday
  
  // Determine width based on the slot interval (from view mode)
  const getSlotWidth = () => {
    // Default slot width for day view
    const baseWidth = 36;
    
    // Wider slots for week and month views, but not too wide
    // to keep the schedule within screen width
    if (slot.interval === 7) {
      return baseWidth * 2; // Week view: 72px per slot
    } else if (slot.interval === 30) {
      return baseWidth * 4; // Month view: 144px per slot
    }
    
    return baseWidth; // Default (day view): 36px per slot
  };
  
  const slotWidth = getSlotWidth();
  
  // Determine the appropriate date format based on the interval
  const getDateLabel = () => {
    if (slot.interval === 1) {
      return day; // Just the day number for day view
    } else if (slot.interval === 7) {
      return `${format(slot.date, 'MMM d')}-${format(addDays(slot.date, 6), 'd')}`;
    } else {
      return format(slot.date, 'MMM');
    }
  };
  
  const dateLabel = getDateLabel();
  
  // Track mouse movement to determine which row the user is interacting with
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const rowHeight = 12; // Height of each slot row in pixels
    
    // Calculate which row within the bay (0-3, meaning rows 1-4)
    const targetRowIndex = Math.floor(relativeY / rowHeight);
    
    // Ensure row is within valid range
    const normalizedRowIndex = Math.max(0, Math.min(3, targetRowIndex));
    
    // Store the row in data attribute to ensure we can access it later
    document.body.setAttribute('data-current-drag-row', normalizedRowIndex.toString());
    
    // DEBUG: Uncomment to see row tracking in real-time
    // console.log(`MOUSE OVER: Slot=${slot.id}, Row=${normalizedRowIndex}, Y-Position=${relativeY}px`);
  };
  
  return (
    <div 
      className={`
        h-12 border-r border-b border-border/30 relative
        ${isToday ? 'bg-primary/10' : isWeekend ? 'bg-gray-900/20' : 'bg-transparent'}
        ${slot.isOccupied ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-primary/5'}
        ${slot.isDisabled ? 'opacity-50' : ''}
        ${isOver ? 'bg-primary/20' : ''}
        transition-colors duration-100
        flex items-center justify-center
      `}
      id={slot.id}
      style={{ width: `${slotWidth}px` }}
      onDoubleClick={() => onDoubleClick(slot)}
      onMouseMove={handleMouseMove}
      data-testid={`bay-slot-${slot.bayId}`}
    >
      <div className="text-xs text-gray-400">
        {dateLabel}
      </div>
      
      {isToday && (
        <div className="absolute bottom-1 right-1 w-1.5 h-1.5 bg-primary rounded-full"></div>
      )}
      
      {/* Visual row indicators for debugging - hidden in production */}
      <div className="absolute top-0 left-0 w-full opacity-5 pointer-events-none">
        <div className="h-3 border-b border-primary"></div>
        <div className="h-3 border-b border-primary"></div>
        <div className="h-3 border-b border-primary"></div>
        <div className="h-3 border-b border-primary"></div>
      </div>
    </div>
  );
};

// Bay group component (represents a section of bays with a common team)
const BayGroup = ({ 
  group, 
  slots,
  schedules,
  onEditBay, 
  onSlotDoubleClick 
}: { 
  group: BayGroup; 
  slots: Record<number, BaySlot[]>;
  schedules: ScheduleItem[];
  onEditBay: (bay: Bay) => void;
  onSlotDoubleClick: (slot: BaySlot) => void;
}) => {
  return (
    <div className="mb-10 bg-darkCard/50 p-4 rounded-lg border-l-4 border border-primary/20 border-l-primary">
      <div className="flex items-center justify-between mb-6 pb-3 border-b border-gray-800">
        <div className="flex items-center">
          <h3 className="text-xl font-semibold text-primary">{group.name}</h3>
        </div>
        <Badge 
          variant="outline" 
          className="text-xs px-3 py-1 border-primary/30 text-primary bg-primary/5"
        >
          Team: {group.team}
        </Badge>
      </div>
      
      {group.bays.map(bay => (
        <div key={bay.id} className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="bg-card p-1 px-2 rounded-md border border-border mr-2">
                <span className="font-mono text-sm">#{bay.bayNumber}</span>
              </div>
              <h4 className="font-medium">{bay.name}</h4>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 ml-2"
                onClick={() => onEditBay(bay)}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center">
              <div className="text-xs text-gray-400 mr-3 italic">{bay.description}</div>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 p-0 px-3 bg-primary/5 border-primary/20 hover:bg-primary/10 text-primary"
                onClick={() => {
                  // Find first empty slot for this bay
                  const firstEmptySlot = slots[bay.id]?.find(slot => !slot.isOccupied);
                  if (firstEmptySlot) {
                    onSlotDoubleClick(firstEmptySlot);
                  }
                }}
              >
                <PlusCircle className="h-4 w-4 mr-1" />
                <span className="text-xs">Add Project</span>
              </Button>
            </div>
          </div>
          
          <div className="flex relative">
            {/* Frozen bay label column (fixed width) */}
            <div className="w-20 h-12 bg-primary/10 flex items-center justify-center border-r-2 border-primary/20 z-10 sticky left-0">
              <div className="text-xs font-medium text-primary">Bay {bay.bayNumber}</div>
            </div>
            
            <div className="overflow-x-auto max-w-[calc(100vw-240px)]">
              <div className="flex">
                {/* Bay slots */}
                <div className="flex bg-darkCard/80 rounded-md overflow-hidden border border-border/50">
                  {slots[bay.id]?.map(slot => (
                    <BaySlot 
                      key={slot.id} 
                      slot={slot} 
                      onDoubleClick={onSlotDoubleClick} 
                    />
                  ))}
                </div>
              </div>
            </div>
            
            {/* Project cards positioned absolutely over the slots */}
            <div className="absolute top-0 left-20 h-12"> {/* Offset by the frozen column width */}
              {schedules
                .filter(schedule => schedule.bayId === bay.id)
                .map(schedule => {
                  // Find the starting slot for this schedule
                  const startSlot = slots[bay.id]?.find(slot => 
                    format(slot.date, 'yyyy-MM-dd') === format(new Date(schedule.startDate), 'yyyy-MM-dd')
                  );
                  
                  if (!startSlot) return null;
                  
                  // Get the slot width based on view mode
                  const getSlotWidth = (interval?: number) => {
                    // Default slot width for day view
                    const baseWidth = 36;
                    
                    // Wider slots for week and month views
                    if (interval === 7) {
                      return baseWidth * 2; // Week view: 72px per slot
                    } else if (interval === 30) {
                      return baseWidth * 4; // Month view: 144px per slot
                    }
                    
                    return baseWidth; // Default (day view): 36px per slot
                  };
                  
                  // Calculate the width based on duration
                  const startDate = new Date(schedule.startDate);
                  const endDate = new Date(schedule.endDate);
                  
                  // Calculate width based on the view mode
                  const slotWidth = getSlotWidth(startSlot.interval);
                  
                  // Scale the width based on the actual duration and slot intervals
                  let width: number;
                  if (startSlot.interval === 1) {
                    // Day view - one day per slot
                    const daysDifference = Math.ceil(
                      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
                    );
                    width = (daysDifference + 1) * slotWidth;
                  } else if (startSlot.interval === 7) {
                    // Week view - one week per slot
                    const weeksDifference = Math.ceil(
                      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7)
                    );
                    width = (weeksDifference + 0.5) * slotWidth; // Slightly less to show it's a partial week
                  } else {
                    // Month view - one month per slot
                    const monthsDifference = 
                      (endDate.getMonth() - startDate.getMonth()) + 
                      (endDate.getFullYear() - startDate.getFullYear()) * 12;
                    width = (monthsDifference + 0.5) * slotWidth; // Slightly less to show it's a partial month
                  }
                  
                  // Determine the left position based on the start date
                  const startIndex = slots[bay.id]?.findIndex(s => s.id === startSlot.id) || 0;
                  const left = startIndex * slotWidth; // Position based on slot width

                  // Determine status-specific styling
                  let statusColor = 'bg-blue-500/80';
                  let borderColor = 'border-blue-600';
                  
                  switch (schedule.status) {
                    case 'scheduled':
                      statusColor = 'bg-blue-500/80';
                      borderColor = 'border-blue-600';
                      break;
                    case 'in_progress':
                      statusColor = 'bg-amber-500/80';
                      borderColor = 'border-amber-600';
                      break;
                    case 'complete':
                      statusColor = 'bg-green-500/80';
                      borderColor = 'border-green-600';
                      break;
                    case 'maintenance':
                      statusColor = 'bg-purple-500/80';
                      borderColor = 'border-purple-600';
                      break;
                  }

                  return (
                    <div 
                      key={schedule.id}
                      className={`absolute h-11 rounded-md border-2 overflow-hidden shadow-md ${borderColor} ${statusColor}`}
                      style={{ 
                        left: `${left}px`, 
                        width: `${width}px`, 
                        top: '1px',
                      }}
                    >
                      <div className="p-1 text-xs font-medium truncate text-white">
                        {schedule.projectName}
                      </div>
                      <div className="px-1 text-[10px] truncate text-white/90 font-mono">
                        {schedule.projectNumber}
                      </div>
                    </div>
                  );
                })
              }
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Helper function to determine the background color based on schedule status
const getScheduleColor = (status: string): string => {
  switch (status) {
    case 'scheduled':
      return 'rgba(59, 130, 246, 0.6)'; // blue
    case 'in_progress':
      return 'rgba(245, 158, 11, 0.6)'; // amber
    case 'complete':
      return 'rgba(34, 197, 94, 0.6)'; // green
    case 'maintenance':
      return 'rgba(168, 85, 247, 0.6)'; // purple
    default:
      return 'rgba(75, 85, 99, 0.6)'; // gray
  }
};

// Main component function
const ManufacturingBayLayout: React.FC<ManufacturingBayLayoutProps> = ({
  schedules,
  projects,
  bays,
  onScheduleChange,
  onScheduleCreate,
  onUpdateBay
}): React.ReactNode => {
  const { toast } = useToast();
  
  // State for timeline navigation
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
  
  // State for weeks display in the timeline
  const [weeks, setWeeks] = useState<WeekRange[]>([]);
  
  // State for view mode (day, week, month)
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
  
  // State for bay editing dialog
  const [isEditingBay, setIsEditingBay] = useState(false);
  const [currentBay, setCurrentBay] = useState<Bay | null>(null);
  const [bayName, setBayName] = useState('');
  const [bayDescription, setBayDescription] = useState('');
  const [bayTeam, setBayTeam] = useState('');
  
  // State for creating a new schedule
  const [isScheduling, setIsScheduling] = useState(false);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [selectedBay, setSelectedBay] = useState<number | null>(null);
  const [schedulingStartDate, setSchedulingStartDate] = useState<string>('');
  const [schedulingEndDate, setSchedulingEndDate] = useState<string>('');

  // State for dragging
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeProject, setActiveProject] = useState<ProjectCard | null>(null);
  
  // Create sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );
  
  // Organize bays into groups by team
  const bayGroups = useMemo(() => {
    const groupsByTeam = new Map<string, Bay[]>();
    
    bays.forEach(bay => {
      const team = bay.team || 'Unassigned';
      if (!groupsByTeam.has(team)) {
        groupsByTeam.set(team, []);
      }
      groupsByTeam.get(team)?.push(bay);
    });
    
    return Array.from(groupsByTeam.entries()).map(([team, bays]) => ({
      id: `team-${team}`,
      name: `${team} Bays`,
      team,
      bays: bays.sort((a, b) => a.bayNumber - b.bayNumber)
    }));
  }, [bays]);
  
  // Generate calendar slots for the visible date range
  const calendarSlots = useMemo(() => {
    if (weeks.length === 0) return {};
    
    const startDate = weeks[0].startDate;
    const endDate = weeks[weeks.length - 1].endDate;
    
    const result: Record<number, BaySlot[]> = {};
    
    // Create slots for each bay
    bays.forEach(bay => {
      const baySlots: BaySlot[] = [];
      let position = 0;
      
      // Time interval depends on the view mode
      const interval = viewMode === 'day' ? 1 : viewMode === 'week' ? 7 : 30;
      
      // Create slots based on view mode (day, week, or month)
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        // Check if this slot is occupied by a schedule
        const isOccupied = schedules.some(schedule => {
          const scheduleStart = new Date(schedule.startDate);
          const scheduleEnd = new Date(schedule.endDate);
          
          // For week and month views, we need to check if any day in the interval
          // overlaps with the schedule
          const intervalEnd = new Date(currentDate);
          intervalEnd.setDate(intervalEnd.getDate() + interval - 1);
          
          return (
            schedule.bayId === bay.id &&
            ((currentDate >= scheduleStart && currentDate <= scheduleEnd) ||
             (intervalEnd >= scheduleStart && intervalEnd <= scheduleEnd) ||
             (scheduleStart >= currentDate && scheduleStart <= intervalEnd))
          );
        });
        
        // Generate an ID that includes the view mode
        const slotId = viewMode === 'day' 
          ? `slot-${bay.id}-${format(currentDate, 'yyyy-MM-dd')}`
          : viewMode === 'week'
            ? `slot-${bay.id}-week-${format(currentDate, 'yyyy-MM-dd')}`
            : `slot-${bay.id}-month-${format(currentDate, 'yyyy-MM-dd')}`;
            
        baySlots.push({
          id: slotId,
          bayId: bay.id,
          position,
          date: new Date(currentDate),
          isOccupied,
          isDisabled: false,
          interval: interval
        });
        
        // Move to next interval based on view mode
        const nextDate = new Date(currentDate);
        nextDate.setDate(nextDate.getDate() + interval);
        currentDate = nextDate;
        position++;
      }
      
      result[bay.id] = baySlots;
    });
    
    return result;
  }, [bays, schedules, weeks, viewMode]);
  
  // Create project cards for unassigned projects
  const unassignedProjects = useMemo(() => {
    const scheduledProjectIds = new Set(schedules.map(s => s.projectId));
    
    return projects
      .filter(p => !scheduledProjectIds.has(p.id))
      .map(p => ({
        id: p.id,
        name: p.name,
        projectNumber: p.projectNumber,
        status: 'scheduled' as const,
        startDate: p.startDate || new Date().toISOString(),
        endDate: (p as any).endDate || new Date(new Date().setDate(new Date().getDate() + 30)).toISOString()
      }));
  }, [projects, schedules]);
  
  // Initialize weeks when component mounts or when view mode changes
  useEffect(() => {
    const today = new Date();
    initializeTimeRange(today);
  }, [viewMode]);
  
  // Generate time range (days, weeks, or months) for the timeline
  const initializeTimeRange = (startDate: Date) => {
    let start: Date;
    let end: Date;
    let weeksArray: WeekRange[] = [];
    
    switch (viewMode) {
      case 'day':
        // Day view: show 2 weeks of individual days
        start = startOfWeek(startDate, { weekStartsOn: 1 }); // Start on Monday
        end = endOfWeek(addWeeks(start, 1), { weekStartsOn: 1 });
        
        weeksArray = eachWeekOfInterval(
          { start, end },
          { weekStartsOn: 1 }
        ).map((weekStart, index) => {
          const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
          return {
            startDate: weekStart,
            endDate: weekEnd,
            weekNumber: index + 1,
            label: `Week ${index + 1}: ${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`
          };
        });
        break;
        
      case 'week':
        // Week view: show 4 weeks
        start = startOfWeek(startDate, { weekStartsOn: 1 });
        end = endOfWeek(addWeeks(start, 3), { weekStartsOn: 1 });
        
        weeksArray = eachWeekOfInterval(
          { start, end },
          { weekStartsOn: 1 }
        ).map((weekStart, index) => {
          const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
          return {
            startDate: weekStart,
            endDate: weekEnd,
            weekNumber: index + 1,
            label: `Week ${index + 1}: ${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`
          };
        });
        break;
        
      case 'month':
        // Month view: show 3 months
        start = startOfMonth(startDate);
        end = endOfMonth(addMonths(start, 2));
        
        // Create weekly intervals within the 3-month period
        weeksArray = eachWeekOfInterval(
          { start, end },
          { weekStartsOn: 1 }
        ).map((weekStart, index) => {
          const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
          return {
            startDate: weekStart,
            endDate: weekEnd,
            weekNumber: index + 1,
            label: `Week ${index + 1}: ${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`
          };
        });
        break;
    }
    
    setWeeks(weeksArray);
    setCurrentWeek(start);
  };
  
  // Navigate to previous time range based on view mode
  const goToPreviousWeeks = () => {
    if (weeks.length > 0) {
      let newStart: Date;
      
      switch (viewMode) {
        case 'day':
          newStart = addWeeks(weeks[0].startDate, -2);
          break;
        case 'week':
          newStart = addWeeks(weeks[0].startDate, -4);
          break;
        case 'month':
          newStart = addMonths(weeks[0].startDate, -3);
          break;
        default:
          newStart = addWeeks(weeks[0].startDate, -2);
      }
      
      initializeTimeRange(newStart);
    }
  };
  
  // Navigate to next time range based on view mode
  const goToNextWeeks = () => {
    if (weeks.length > 0) {
      let newStart: Date;
      
      switch (viewMode) {
        case 'day':
          newStart = addWeeks(weeks[0].startDate, 2);
          break;
        case 'week':
          newStart = addWeeks(weeks[0].startDate, 4);
          break;
        case 'month':
          newStart = addMonths(weeks[0].startDate, 3);
          break;
        default:
          newStart = addWeeks(weeks[0].startDate, 2);
      }
      
      initializeTimeRange(newStart);
    }
  };
  
  // Handle starting to edit a bay
  const handleEditBay = (bay: Bay) => {
    setCurrentBay(bay);
    setBayName(bay.name);
    setBayDescription(bay.description || '');
    setBayTeam(bay.team || '');
    setIsEditingBay(true);
  };
  
  // Handle saving bay edits
  const handleSaveBay = async () => {
    if (!currentBay || !onUpdateBay) return;
    
    try {
      await onUpdateBay(currentBay.id, bayName, bayDescription, bayTeam);
      toast({
        title: "Bay updated",
        description: `${bayName} has been updated successfully.`,
      });
      setIsEditingBay(false);
    } catch (error) {
      console.error("Error updating bay:", error);
      toast({
        title: "Error",
        description: "Failed to update bay. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Handle double-clicking on a slot to add a schedule
  const handleSlotDoubleClick = (slot: BaySlot) => {
    // Reset scheduling form
    setSelectedProject(null);
    setSelectedBay(slot.bayId);
    
    // Set default dates based on the selected slot
    const startDate = format(slot.date, 'yyyy-MM-dd');
    const endDate = format(addWeeks(slot.date, 1), 'yyyy-MM-dd');
    
    setSchedulingStartDate(startDate);
    setSchedulingEndDate(endDate);
    setIsScheduling(true);
  };
  
  // Handle creating a new schedule
  const handleCreateSchedule = async () => {
    if (!selectedProject || !selectedBay || !schedulingStartDate || !schedulingEndDate) {
      toast({
        title: "Error",
        description: "Please fill out all fields.",
        variant: "destructive",
      });
      return;
    }
    
    // Check for conflicting schedules
    const hasConflict = checkScheduleConflict(
      selectedBay, 
      schedulingStartDate, 
      schedulingEndDate, 
      schedules.map(s => ({
        id: s.id,
        bayId: s.bayId,
        startDate: s.startDate,
        endDate: s.endDate
      }))
    );
    
    if (hasConflict) {
      toast({
        title: "Schedule Conflict",
        description: "This bay is already scheduled during the selected dates.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Create manufacturing schedule
      // Get the intended row from the dialog inputs (always default to 0 for now to let user specify)
      const preferredRow = 0;
      
      console.log(`MANUAL ROW ASSIGNMENT from scheduling dialog: Using row=${preferredRow} for new project placement`);
      
      await onScheduleCreate(
        selectedProject,
        selectedBay,
        schedulingStartDate,
        schedulingEndDate,
        preferredRow // CRITICAL: Pass the row explicitly
      );
      
      // Update project status to in_progress if current date is between start and end dates
      const currentDate = new Date();
      const startDate = new Date(schedulingStartDate);
      const endDate = new Date(schedulingEndDate);
      
      if (currentDate >= startDate && currentDate <= endDate) {
        // Update project status to active
        try {
          const response = await fetch(`/api/projects/${selectedProject}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              status: 'active'
            }),
          });
          
          if (!response.ok) {
            console.warn('Failed to update project status, but schedule was created');
          }
        } catch (statusError) {
          console.warn('Error updating project status:', statusError);
        }
      }
      
      toast({
        title: "Schedule created",
        description: "The project has been scheduled successfully.",
      });
      
      setIsScheduling(false);
    } catch (error) {
      console.error("Error creating schedule:", error);
      toast({
        title: "Error",
        description: "Failed to create schedule. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Handle drag start event
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id.toString());
    
    // Get the project data
    const { project } = active.data.current as { project: ProjectCard };
    setActiveProject(project);
  };
  
  // Handle drag end event
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    setActiveProject(null);
    
    if (!over) return;
    
    try {
      const projectId = parseInt(active.id.toString());
      const overSlotId = over.id.toString();
      
      // Get the cursor position from the DragEndEvent
      const { delta } = event;
      const dropY = delta.y; // Vertical position relative to start
      
      // Calculate which row the user dropped the project into (1-4)
      // In our layout, each bay has 4 potential rows for placing projects
      // We need to determine which row based on where in the bay the cursor is
      const targetElement = document.getElementById(overSlotId);
      const rowHeight = 12; // Height of each row in pixels
      let targetRow = 0; // Default row
      
      if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        
        // The activatorEvent is a MouseEvent or TouchEvent that has clientY property
        const ev = event.activatorEvent as MouseEvent | TouchEvent;
        let clientY = 0;
        
        if ('clientY' in ev) {
          // It's a MouseEvent
          clientY = ev.clientY;
        } else if (ev.touches && ev.touches[0]) {
          // It's a TouchEvent
          clientY = ev.touches[0].clientY;
        }
        
        // Calculate which row within the bay based on drop position
        // Row is 0-based index, so 0=row1, 1=row2, 2=row3, 3=row4
        const relativeY = clientY - rect.top;
        targetRow = Math.floor(relativeY / rowHeight);
        
        // Ensure row is within valid range (0-3)
        targetRow = Math.max(0, Math.min(3, targetRow));
        
        // Store the row in data attribute to ensure we can access it later
        document.body.setAttribute('data-current-drag-row', targetRow.toString());
        
        console.log(`DROP DETECTED: Bay=${overSlotId}, Row=${targetRow}, Y-Position=${relativeY}px`);
      }
      
      // Extract bay ID and date from the slot ID
      const match = overSlotId.match(/slot-(\d+)-(\d{4}-\d{2}-\d{2})/);
      
      if (match) {
        const bayId = parseInt(match[1]);
        const startDate = match[2];
        
        // Default to a 1-week duration
        const endDate = format(addWeeks(new Date(startDate), 1), 'yyyy-MM-dd');
        
        // Check for existing schedule for this project
        const existingSchedule = schedules.find(s => s.projectId === projectId);
        
        // Check for conflicting schedules
        const hasConflict = checkScheduleConflict(
          bayId, 
          startDate, 
          endDate, 
          schedules.map(s => ({
            id: s.id,
            bayId: s.bayId,
            startDate: s.startDate,
            endDate: s.endDate
          })),
          existingSchedule?.id
        );
        
        if (hasConflict) {
          toast({
            title: "Schedule Conflict",
            description: "This bay is already scheduled during the selected dates.",
            variant: "destructive",
          });
          return;
        }
        
        if (existingSchedule) {
          // Update existing schedule
          try {
            await onScheduleChange(
              existingSchedule.id,
              bayId,
              startDate,
              endDate
            );
            
            toast({
              title: "Schedule updated",
              description: "The project schedule has been updated.",
            });
          } catch (error) {
            console.error("Error updating schedule:", error);
            toast({
              title: "Error",
              description: "Failed to update schedule. Please try again.",
              variant: "destructive",
            });
          }
        } else {
          // Create new schedule
          try {
            // CRITICAL: Get row information from where the user dropped the project
            // The clientY position will help determine which row the user intended (we need to do additional math)
            
            // Get the drop position from data attributes
            const targetRowIndex = parseInt(document.body.getAttribute('data-current-drag-row') || '0');
            
            console.log(`DRAG END - USING EXACT DROP ROW: Bay=${bayId}, Row=${targetRowIndex}, Project=${projectId}`);
            
            // Always use the exact row where the user dropped the project
            await onScheduleCreate(
              projectId,
              bayId,
              startDate,
              endDate,
              targetRowIndex // CRITICAL: Pass the exact row where user dropped
            );
            
            // Update project status to active if current date is between start and end dates
            const currentDate = new Date();
            const scheduleStartDate = new Date(startDate);
            const scheduleEndDate = new Date(endDate);
            
            if (currentDate >= scheduleStartDate && currentDate <= scheduleEndDate) {
              // Update project status to active
              try {
                const response = await fetch(`/api/projects/${projectId}`, {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    status: 'active'
                  }),
                });
                
                if (!response.ok) {
                  console.warn('Failed to update project status, but schedule was created');
                }
              } catch (statusError) {
                console.warn('Error updating project status:', statusError);
              }
            }
            
            toast({
              title: "Schedule created",
              description: "The project has been scheduled successfully.",
            });
          } catch (createError) {
            console.error("Error creating schedule:", createError);
            toast({
              title: "Error",
              description: "Failed to create schedule. Please try again.",
              variant: "destructive",
            });
          }
        }
      }
    } catch (error) {
      console.error("Error scheduling project:", error);
      toast({
        title: "Error",
        description: "Failed to schedule project. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="min-h-screen pb-12">
      {/* Timeline navigation */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Manufacturing Bay Schedule</h2>
        
        <div className="flex items-center gap-4">
          {/* View mode toggle buttons */}
          <div className="flex items-center bg-card rounded-md overflow-hidden border border-border">
            <Button 
              variant={viewMode === 'day' ? 'default' : 'ghost'} 
              size="sm" 
              className={`rounded-none h-8 px-3 transition-colors ${viewMode === 'day' ? 'bg-primary text-white' : 'bg-transparent'}`}
              onClick={() => setViewMode('day')}
            >
              Day
            </Button>
            <Button 
              variant={viewMode === 'week' ? 'default' : 'ghost'} 
              size="sm" 
              className={`rounded-none h-8 px-3 transition-colors ${viewMode === 'week' ? 'bg-primary text-white' : 'bg-transparent'}`}
              onClick={() => setViewMode('week')}
            >
              Week
            </Button>
            <Button 
              variant={viewMode === 'month' ? 'default' : 'ghost'} 
              size="sm" 
              className={`rounded-none h-8 px-3 transition-colors ${viewMode === 'month' ? 'bg-primary text-white' : 'bg-transparent'}`}
              onClick={() => setViewMode('month')}
            >
              Month
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={goToPreviousWeeks}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            
            <p className="text-sm font-medium">
              {weeks.length > 0 
                ? `${format(weeks[0].startDate, 'MMM d')} - ${format(weeks[weeks.length - 1].endDate, 'MMM d')}`
                : 'Loading...'}
            </p>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={goToNextWeeks}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Week indicators */}
      <div className="mb-6 ml-[156px]">
        <div className="flex mb-2">
          {weeks.map((week, index) => {
            // Calculate if this is the current week
            const today = new Date();
            const isCurrentWeek = 
              today >= week.startDate && 
              today <= week.endDate;
            
            return (
              <div 
                key={week.weekNumber}
                className={`
                  flex-shrink-0 text-center font-medium rounded-t-md px-2 py-1
                  ${isCurrentWeek ? 'bg-primary/20 text-primary' : 'bg-card/80 text-foreground/80'}
                `}
                style={{ width: `${7 * 36}px` }} // 7 days per week, 36px per day
              >
                <div className="text-sm">Week {week.weekNumber}</div>
                <div className="text-xs opacity-70">{format(week.startDate, 'MMM d')} - {format(week.endDate, 'MMM d')}</div>
              </div>
            );
          })}
        </div>
        
        {/* Days of week */}
        <div className="flex bg-card/80 rounded-md border border-border/30">
          {weeks.map(week => (
            <React.Fragment key={week.weekNumber}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, dayIndex) => {
                const date = addDays(week.startDate, dayIndex);
                const isWeekend = [5, 6].includes(dayIndex); // 5 is Sat, 6 is Sun
                return (
                  <div 
                    key={`${week.weekNumber}-${day}`}
                    className={`
                      flex-shrink-0 flex flex-col items-center justify-center py-1 text-center border-r border-border/20
                      ${isWeekend ? 'bg-gray-900/10' : ''}
                    `}
                    style={{ width: '36px' }}
                  >
                    <div className="text-[10px] text-foreground/70">{day}</div>
                    <div className="text-xs font-mono">{format(date, 'd')}</div>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
      
      <div className="flex">
        {/* Bay group labels sidebar */}
        <div className="w-[152px] flex-shrink-0 pt-[1px] pr-4">
          <div className="text-sm font-medium text-right text-foreground/70 mb-2">Manufacturing Bays</div>
        </div>
        
        {/* Main schedule area */}
        <div className="flex-1">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {/* Display bay groups */}
            {bayGroups.map(group => (
              <BayGroup 
                key={group.id}
                group={group}
                slots={calendarSlots}
                schedules={schedules.map(s => ({
                  id: s.id,
                  projectId: s.projectId,
                  bayId: s.bayId,
                  startDate: s.startDate,
                  endDate: s.endDate,
                  status: s.status,
                  projectName: projects.find(p => p.id === s.projectId)?.name || 'Unknown Project',
                  projectNumber: projects.find(p => p.id === s.projectId)?.projectNumber || '',
                  bayName: bays.find(b => b.id === s.bayId)?.name || 'Unknown Bay',
                  bayNumber: bays.find(b => b.id === s.bayId)?.bayNumber || 0
                })).filter(s => 
                  group.bays.some(b => b.id === s.bayId)
                )}
                onEditBay={handleEditBay}
                onSlotDoubleClick={handleSlotDoubleClick}
              />
            ))}
            
            {/* Drag overlay */}
            <DragOverlay>
              {activeId && activeProject ? (
                <div className="bg-primary/90 border-2 border-primary p-3 rounded-md shadow-xl w-32">
                  <div className="font-medium text-sm truncate text-white">{activeProject.name}</div>
                  <div className="text-xs text-white/80 truncate">{activeProject.projectNumber}</div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
        
        {/* Unassigned projects */}
        <div className="w-64 ml-6">
          <div className="bg-card rounded-md p-4 border border-border">
            <h3 className="font-semibold mb-3">Unassigned Projects</h3>
            
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={unassignedProjects.map(p => p.id.toString())}
                strategy={horizontalListSortingStrategy}
              >
                {unassignedProjects.length > 0 ? (
                  unassignedProjects.map(project => (
                    <SortableProjectCard 
                      key={project.id} 
                      project={project} 
                    />
                  ))
                ) : (
                  <p className="text-sm text-gray-400">No unassigned projects</p>
                )}
              </SortableContext>
            </DndContext>
          </div>
        </div>
      </div>
      
      {/* Bay editing dialog */}
      <Dialog open={isEditingBay} onOpenChange={setIsEditingBay}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Bay</DialogTitle>
            <DialogDescription>
              Make changes to the bay name, description, and team.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="bayName" className="text-right">
                Name
              </Label>
              <Input
                id="bayName"
                value={bayName}
                onChange={(e) => setBayName(e.target.value)}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="bayDescription" className="text-right">
                Description
              </Label>
              <Input
                id="bayDescription"
                value={bayDescription}
                onChange={(e) => setBayDescription(e.target.value)}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="bayTeam" className="text-right">
                Team
              </Label>
              <Input
                id="bayTeam"
                value={bayTeam}
                onChange={(e) => setBayTeam(e.target.value)}
                placeholder="e.g., Bay 1 & 2, Bay 5 & 10"
                className="col-span-3"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingBay(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveBay}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Schedule creation dialog */}
      <Dialog open={isScheduling} onOpenChange={setIsScheduling}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Project</DialogTitle>
            <DialogDescription>
              Select a project and set the schedule dates.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="projectSelect" className="text-right">
                Project
              </Label>
              <Select
                value={selectedProject?.toString() || ''}
                onValueChange={(value) => setSelectedProject(parseInt(value))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {unassignedProjects.map(project => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name} ({project.projectNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="startDate" className="text-right">
                Start Date
              </Label>
              <Input
                id="startDate"
                type="date"
                value={schedulingStartDate}
                onChange={(e) => setSchedulingStartDate(e.target.value)}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="endDate" className="text-right">
                End Date
              </Label>
              <Input
                id="endDate"
                type="date"
                value={schedulingEndDate}
                onChange={(e) => setSchedulingEndDate(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsScheduling(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSchedule}>
              Create Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Helper function to calculate the width of a project on the timeline
// Calculate the width of a project based on the schedule dates and view mode
const calculateProjectWidth = (schedule: ManufacturingSchedule, slotRow: BaySlot[]) => {
  const startDate = new Date(schedule.startDate);
  const endDate = new Date(schedule.endDate);
  
  // Find the index of the slot that matches the start date
  const startSlotIndex = slotRow.findIndex(slot => 
    format(slot.date, 'yyyy-MM-dd') === format(startDate, 'yyyy-MM-dd')
  );
  
  if (startSlotIndex === -1 || slotRow.length === 0) return 36; // Default fallback

  // Get the first slot to determine interval/view mode
  const firstSlot = slotRow[0];
  
  // Get the slot width based on interval (view mode)
  const getSlotWidth = (interval?: number) => {
    // Default slot width for day view
    const baseWidth = 36;
    
    // Wider slots for week and month views
    if (interval === 7) {
      return baseWidth * 2; // Week view: 72px per slot
    } else if (interval === 30) {
      return baseWidth * 4; // Month view: 144px per slot
    }
    
    return baseWidth; // Default (day view): 36px per slot
  };
  
  const slotWidth = getSlotWidth(firstSlot.interval);
  
  // Scale the width based on the actual duration and slot intervals
  let width: number;
  if (firstSlot.interval === 1) {
    // Day view - one day per slot
    const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    // Calculate how many days are visible in the current view
    const visibleDays = Math.min(durationDays, slotRow.length - startSlotIndex);
    width = visibleDays * slotWidth;
  } else if (firstSlot.interval === 7) {
    // Week view - one week per slot
    const durationWeeks = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7)) + 0.5;
    // Calculate how many weeks are visible in the current view
    const visibleWeeks = Math.min(durationWeeks, slotRow.length - startSlotIndex);
    width = visibleWeeks * slotWidth;
  } else {
    // Month view - one month per slot
    const durationMonths = 
      (endDate.getMonth() - startDate.getMonth()) + 
      (endDate.getFullYear() - startDate.getFullYear()) * 12 + 0.5;
    // Calculate how many months are visible in the current view
    const visibleMonths = Math.min(durationMonths, slotRow.length - startSlotIndex);
    width = visibleMonths * slotWidth;
  }
  
  return width;
};

export { ManufacturingBayLayout };