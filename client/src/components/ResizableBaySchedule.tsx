import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { format, addDays, parse, parseISO, startOfWeek, endOfWeek, isWeekend, differenceInDays, addWeeks, subWeeks, isValid, isPast } from 'date-fns';
import ScheduleBar from './ScheduleBar';
import { ManufacturingSchedule, Project, ManufacturingBay } from '@shared/schema';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CalendarIcon, Edit, Save, Trash2, X, Plus, ChevronDown, ChevronUp, Move } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import MultiRowBayContent from './MultiRowBayContent';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import BayCapacityInfo from './BayCapacityInfo';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import ProjectDetailsCard from './cards/ProjectDetailsCard';
import { buildStyles } from '@/lib/styleUtils';
import WeekPicker from './WeekPicker';
import { useToast } from '@/hooks/use-toast';
import { Alert as AlertComponent } from '@/components/ui/alert';

interface TimelineSlot {
  date: Date;
  isStartOfMonth: boolean;
  isStartOfWeek: boolean;
  isBusinessDay: boolean;
  weekNumber?: number;
}

interface ScheduleBarPositionData {
  id: number;
  left: number;
  width: number;
  project?: Project;
  schedule: ManufacturingSchedule;
  bayId: number;
  rowIndex: number;
  startSlotIndex: number;
  endSlotIndex: number;
  scheduleWidthDays: number;  
}

interface DropTarget {
  bayId: number;
  rowIndex: number;
}

interface CreateScheduleData {
  bayId: number;
  slotIndex: number;
  startDate: string;
}

interface EditBayRowData {
  bayId: number;
  rowIndex: number;
}

interface WeekInfo {
  weekNumber: number;
  startDate: string;
  endDate: string;
}

interface EditableRow {
  id: number;
  name: string;
  height: number;
}

interface ResizableBayScheduleProps {
  manufacturingBays: ManufacturingBay[];
  schedules: ManufacturingSchedule[];
  projects: Project[];
  slotWidth?: number; // Width of each day slot in pixels
  onRefreshData?: () => void;
  onScheduleChange?: (scheduleId: number, bayId: number, startDate: string) => void;
  onEditSchedule?: (scheduleId: number) => void;
  onEditProject?: (projectId: number) => void;
  onDeleteSchedule?: (scheduleId: number) => void;
  canDragSchedules?: boolean;
  canCreateSchedule?: boolean;
  canEditSchedule?: boolean;
  canEditBay?: boolean;
  // To align with MultiRowBayContent
  scrollToToday?: boolean;
  weekCount?: number;
  gridRowHeight?: number;
  startDate?: Date;
  highlightToday?: boolean;
  showEmptyMessage?: boolean;
  emptyMessage?: string;
  onDragStart?: (e: React.DragEvent, scheduleId: number) => void;
  onDragOver?: (e: React.DragEvent, bayId: number, weekIndex: number, rowIndex?: number) => void;
  onDrop?: (e: React.DragEvent, bayId: number, weekIndex?: number, rowIndex?: number) => void;
  onDateSelect?: (date: Date) => void;
}

/**
 * A resizable bay schedule component that allows for:
 * - Dragging and dropping schedules between bays and rows
 * - Editing schedule details
 * - Viewing schedule information
 * - Resizing schedules by dragging handles
 */
const ResizableBaySchedule: React.FC<ResizableBayScheduleProps> = ({
  manufacturingBays,
  schedules,
  projects,
  slotWidth = 40,
  onRefreshData,
  onScheduleChange,
  onEditSchedule,
  onEditProject,
  onDeleteSchedule,
  canDragSchedules = true,
  canCreateSchedule = true,
  canEditSchedule = true,
  canEditBay = false,
  scrollToToday = true,
  weekCount = 52,
  gridRowHeight = 50,
  startDate = new Date(),
  highlightToday = true,
  showEmptyMessage = true,
  emptyMessage = "No schedules for this bay",
  onDragStart,
  onDragOver,
  onDrop,
  onDateSelect
}) => {
  const [draggingSchedule, setDraggingSchedule] = useState<number | null>(null);
  const [resizingSchedule, setResizingSchedule] = useState<number | null>(null);
  const [resizeDirection, setResizeDirection] = useState<'left' | 'right' | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [scheduleBars, setScheduleBars] = useState<ScheduleBarPositionData[]>([]);
  const [createScheduleData, setCreateScheduleData] = useState<CreateScheduleData | null>(null);
  const [editScheduleId, setEditScheduleId] = useState<number | null>(null);
  const [editingBay, setEditingBay] = useState<Partial<ManufacturingBay> | null>(null);
  const [deletingScheduleId, setDeletingScheduleId] = useState<number | null>(null);
  const [editBayRow, setEditBayRow] = useState<EditBayRowData | null>(null);
  const [confirmRowDelete, setConfirmRowDelete] = useState<{rowIndex: number, bayId: number, affectedProjects?: ManufacturingSchedule[]} | null>(null);
  const [isCreatingRow, setIsCreatingRow] = useState<boolean>(false);
  const [newRowHeight, setNewRowHeight] = useState<number>(gridRowHeight);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [activeBay, setActiveBay] = useState<number | null>(null);
  const [editableBayRows, setEditableBayRows] = useState<{[bayId: number]: EditableRow[]}>({});
  const [editRowDetails, setEditRowDetails] = useState<{rowIndex: number, bayId: number} | null>(null);
  const [hoverSchedule, setHoverSchedule] = useState<number | null>(null);
  
  // Refs for drag scrolling and element positioning
  const viewportRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const dragScrollIntervalRef = useRef<number | null>(null);
  const initialScheduleDateRef = useRef<string | null>(null);
  const initialScheduleBayRef = useRef<number | null>(null);
  const initialScheduleRowRef = useRef<number | null>(null);
  const startResizePositionRef = useRef<{x: number, scheduleLeft: number, scheduleWidth: number} | null>(null);
  const { toast } = useToast();
  
  // Generate all slots (days) in the timeline
  const slots = useMemo(() => {
    const result: TimelineSlot[] = [];
    let current = new Date(startDate);
    current.setHours(0, 0, 0, 0); // Normalize to start of day
    
    // Determine the start of the current week 
    const weekStart = startOfWeek(current);
    
    // If we're not already at the week start, go back to it
    if (current.getTime() !== weekStart.getTime()) {
      current = new Date(weekStart);
    }
    
    // Generate slots for all days in the selected range
    for (let i = 0; i < weekCount * 7; i++) {
      const date = addDays(current, i);
      const isStartOfMonth = date.getDate() === 1;
      const isStartOfWeek = date.getDay() === 0; // Sunday is the start of week
      const isBusinessDay = !isWeekend(date); // Simple business day check
      
      // Calculate the week number relative to our starting week
      const weekNumber = Math.floor(i / 7);
      
      result.push({
        date,
        isStartOfMonth,
        isStartOfWeek,
        isBusinessDay,
        weekNumber
      });
    }
    
    return result;
  }, [startDate, weekCount]);

  // Default row height for bays
  const rowHeight = gridRowHeight;
  
  // Cache the projects by ID for faster lookup
  const projectsById = useMemo(() => {
    return projects.reduce((acc, project) => {
      acc[project.id] = project;
      return acc;
    }, {} as Record<number, Project>);
  }, [projects]);
  
  // Find a schedule by ID
  const findScheduleById = useCallback((id: number) => {
    return schedules.find(s => s.id === id);
  }, [schedules]);
  
  // Get the bay row count for a specific bay ID
  const getBayRowCount = useCallback((bayId: number, bayName: string) => {
    // Single row layout for ALL bays based on team structure
    console.log(`Single row configuration for bay ${bayId} (${bayName}) - new team-based layout`);
    console.log(`Bay ${bayId} (${bayName}): isMultiRowBay=false, rowCount=1, bayNumber=${bayId}`);
    return 1;
  }, []);
  
  // Check if a bay uses multi-row configuration
  const isMultiRowBay = useCallback((bayId: number) => {
    // All bays are using single row now - one schedule per bay
    return false;
  }, []);

  // Handle drag start events for schedules
  const handleDragStart = (e: React.DragEvent, scheduleId: number) => {
    // Get the schedule and store its initial position
    const schedule = findScheduleById(scheduleId);
    if (!schedule) return;
    
    initialScheduleDateRef.current = schedule.startDate;
    initialScheduleBayRef.current = schedule.bayId;
    initialScheduleRowRef.current = schedule.rowIndex || 0;
    
    // Set data for transfer
    e.dataTransfer.setData('text/plain', scheduleId.toString());
    
    // Create a custom drag image to make it clearer what's being dragged
    const dragImage = document.createElement('div');
    dragImage.className = 'drag-image bg-primary/80 text-white px-2 py-1 rounded shadow-lg';
    
    // Find the project associated with this schedule
    const project = projectsById[schedule.projectId];
    const projectName = project ? 
      (project.name.length > 30 ? project.name.substring(0, 27) + '...' : project.name) 
      : 'Schedule';
    
    dragImage.textContent = projectName;
    dragImage.style.fontSize = '12px';
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    dragImage.style.opacity = '0.9';
    dragImage.style.padding = '6px 10px';
    dragImage.style.borderRadius = '4px';
    dragImage.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
    dragImage.style.pointerEvents = 'none';
    dragImage.style.zIndex = '100';
    
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 30, 15);
      
      // Remove the drag image after the drag operation completes
      setTimeout(() => {
        document.body.removeChild(dragImage);
      }, 0);
    
    setDraggingSchedule(scheduleId);
  };
  
  const handleDragOver = (e: React.DragEvent, bayId: number, rowIndex: number, slotIndex: number) => {
    // SUPER CRITICAL: This prevents the "no-drop" icon from appearing
    e.preventDefault(); 
    e.stopPropagation();
    
    // Set dropEffect to 'move' to show the move cursor
    e.dataTransfer.dropEffect = 'move';
    
    // Add important attributes to identify elements as valid drop targets 
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.setAttribute('data-droppable', 'true');
      e.currentTarget.style.cursor = 'move';
      e.currentTarget.classList.add('valid-drop-target');
    }
    
    // Store target position in global document for easier access
    document.body.setAttribute('data-current-drop-target-bay', bayId.toString());
    document.body.setAttribute('data-current-drop-target-row', rowIndex.toString());
    
    // Log to confirm drag over is working (debugging)
    console.log(`✅ VALID DROP TARGET: Bay ${bayId}, Row ${rowIndex}`);
    
    // Update drop target information for tracking
    setDropTarget({ bayId, rowIndex });
    
    // Add visual feedback to show this is a valid drop target
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.classList.add('drop-target-active');
    }
  };

  // Helper to find the exact slot based on a date
  const findSlotIndexByDate = (date: Date): number => {
    const targetTime = date.getTime();
    for (let i = 0; i < slots.length; i++) {
      if (slots[i].date.getTime() === targetTime) {
        return i;
      }
    }
    return -1;
  };
  
  const handleSlotDragOver = (e: React.DragEvent, bayId: number, rowIndex: number, date: Date) => {
    // Essential: Prevent default to allow drop
    e.preventDefault();
    
    // Calculate the date for the current slot
    const slotDate = format(date, 'yyyy-MM-dd');
    console.log(`Drag over slot: Bay ${bayId}, Row ${rowIndex}, Date ${slotDate}`);
    
    // Set current drag coordinates
    setDropTarget({ bayId, rowIndex });
    
    // If using external handler, call it
    if (onDragOver) {
      const slotIndex = findSlotIndexByDate(date);
      onDragOver(e, bayId, slotIndex, rowIndex);
    }
  };

  // Handle drop events for schedules
  const handleDrop = async (e: React.DragEvent, bayId: number, slotIndex: number, rowIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log(`DROP DEBUG: Dropping in Bay ${bayId}, SlotIndex ${slotIndex}, RowIndex ${rowIndex}`);
    
    try {
      // Get the schedule ID from the drag data
      const scheduleId = Number(e.dataTransfer.getData('text/plain'));
      if (isNaN(scheduleId)) return;
      
      // Find the schedule and check if it's valid
      const schedule = findScheduleById(scheduleId);
      if (!schedule) {
        console.error('Schedule not found:', scheduleId);
        return;
      }
      
      // Get the date of the slot where we're dropping
      const dropSlot = slots[slotIndex];
      if (!dropSlot) {
        console.error('Invalid drop slot index:', slotIndex);
        return;
      }
      
      // Format the new start date for the schedule
      const newStartDate = format(dropSlot.date, 'yyyy-MM-dd');
      console.log(`onScheduleChange: scheduleId=${scheduleId}, bayId=${bayId}, startDate=${newStartDate}`);
      
      // Call the onScheduleChange handler with the updated schedule data
      if (onScheduleChange) {
        onScheduleChange(scheduleId, bayId, newStartDate);
      }
      
      // Reset state
      setDraggingSchedule(null);
      setDropTarget(null);
      
      // Update UI feedback
      if (e.currentTarget instanceof HTMLElement) {
        e.currentTarget.classList.remove('drag-over', 'drag-target', 'drop-target-active');
      }
      
      // Log the operation for debugging
      console.log(`Schedule ${scheduleId} moved to Bay ${bayId}, Row ${rowIndex}, Date ${newStartDate}`);
    } catch (error) {
      console.error('Error during drop operation:', error);
    }
  };

  // Handle starting a resize operation
  const handleResizeStart = (
    e: React.MouseEvent, 
    scheduleId: number, 
    direction: 'left' | 'right',
    scheduleLeft: number,
    scheduleWidth: number
  ) => {
    // Prevent this from bubbling to parent elements
    e.stopPropagation();
    
    // Store the schedule ID and resize direction
    setResizingSchedule(scheduleId);
    setResizeDirection(direction);
    
    // Store the initial position and size for calculation during resize
    startResizePositionRef.current = {
      x: e.clientX,
      scheduleLeft,
      scheduleWidth
    };
    
    // Add event listeners for resize operations
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };

  // Handle mouse movement during resize
  const handleResizeMove = (e: MouseEvent) => {
    // Find the schedule being resized
    const scheduleId = resizingSchedule;
    if (!scheduleId) return;
    
    // Find the schedule in our bars array
    const scheduleBarIndex = scheduleBars.findIndex(bar => bar.schedule.id === scheduleId);
    if (scheduleBarIndex === -1) return;
    
    // Get the initial position data
    const startPosition = startResizePositionRef.current;
    if (!startPosition) return;
    
    // Calculate the change in position
    const deltaX = e.clientX - startPosition.x;
    const scheduleCopy = { ...scheduleBars[scheduleBarIndex] };
    
    // Apply changes based on which handle is being dragged
    if (resizeDirection === 'left') {
      // Resizing from the left (start date)
      const newLeft = Math.max(0, startPosition.scheduleLeft + deltaX);
      const newWidth = startPosition.scheduleWidth - (newLeft - startPosition.scheduleLeft);
      
      // Only allow positive width
      if (newWidth > 0) {
        scheduleCopy.left = newLeft;
        scheduleCopy.width = newWidth;
        
        // Calculate the new start slot index
        scheduleCopy.startSlotIndex = Math.floor(newLeft / slotWidth);
      }
    } else if (resizeDirection === 'right') {
      // Resizing from the right (end date)
      const newWidth = Math.max(slotWidth, startPosition.scheduleWidth + deltaX);
      scheduleCopy.width = newWidth;
      
      // Calculate the new end slot index
      const newEndIndex = Math.floor((scheduleCopy.left + newWidth) / slotWidth);
      scheduleCopy.endSlotIndex = newEndIndex;
    }
    
    // Update the schedule bar
    const newBars = [...scheduleBars];
    newBars[scheduleBarIndex] = scheduleCopy;
    setScheduleBars(newBars);
  };

  // Handle the end of a resize operation
  const handleResizeEnd = () => {
    // Clean up event listeners
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
    
    // Find the schedule being resized
    const scheduleId = resizingSchedule;
    if (!scheduleId) return;
    
    // Find the schedule in our bars array
    const scheduleBar = scheduleBars.find(bar => bar.schedule.id === scheduleId);
    if (!scheduleBar) return;
    
    // Find the original schedule
    const schedule = findScheduleById(scheduleId);
    if (!schedule) return;
    
    // Calculate new dates based on slot indices
    const startDate = slots[scheduleBar.startSlotIndex]?.date;
    const endDate = slots[scheduleBar.endSlotIndex]?.date;
    
    if (startDate && endDate) {
      // Format dates for update
      const formattedStartDate = format(startDate, 'yyyy-MM-dd');
      const formattedEndDate = format(endDate, 'yyyy-MM-dd');
      
      // Calculate the number of days for the schedule
      const daysDiff = differenceInDays(endDate, startDate) + 1;
      
      console.log(`Resize complete:
        Schedule ID: ${scheduleId}
        New start date: ${formattedStartDate}
        New end date: ${formattedEndDate}
        Days: ${daysDiff}
      `);
      
      // TODO: Call an update function here to save the changes
      // For now, just update the visual state
    }
    
    // Reset the resize state
    setResizingSchedule(null);
    setResizeDirection(null);
    startResizePositionRef.current = null;
  };

  // Create a schedule bar for each schedule
  const calculateScheduleBars = useCallback(() => {
    console.log("Recalculating schedule bars (version 3): ensuring NO automatic adjustments");
    
    const bars: ScheduleBarPositionData[] = [];
    
    schedules.forEach(schedule => {
      try {
        // Parse dates
        let startDateObj: Date;
        let endDateObj: Date;
        
        // Ensure we have valid date strings or objects
        if (typeof schedule.startDate === 'string') {
          startDateObj = parseISO(schedule.startDate);
        } else if (schedule.startDate instanceof Date) {
          startDateObj = schedule.startDate;
        } else {
          console.error('Invalid startDate format for schedule', schedule.id, schedule.startDate);
          return;
        }
        
        // If we don't have an endDate, calculate based on fabrication/paint/etc. days
        if (!schedule.endDate) {
          // Calculate a sensible end date from the schedule properties
          const totalDays = (schedule.fabricationDays || 0) + 
                           (schedule.paintDays || 0) + 
                           (schedule.assemblyDays || 0) + 
                           (schedule.testingDays || 0) + 
                           (schedule.ntcDays || 0) + 
                           (schedule.qcDays || 0);
          
          // Ensure at least 1 day
          const scheduleDays = Math.max(1, totalDays);
          endDateObj = addDays(startDateObj, scheduleDays - 1);
        } else if (typeof schedule.endDate === 'string') {
          endDateObj = parseISO(schedule.endDate);
        } else if (schedule.endDate instanceof Date) {
          endDateObj = schedule.endDate;
        } else {
          // Default to start date + 1 week if no valid end date
          endDateObj = addDays(startDateObj, 7);
        }
        
        // Find the slot indices for the start and end dates
        let startSlotIndex = -1;
        let endSlotIndex = -1;
        
        // Look for exact date matches in the slots array
        for (let i = 0; i < slots.length; i++) {
          const slotDate = slots[i].date;
          
          if (slotDate.getTime() === startDateObj.getTime()) {
            startSlotIndex = i;
          }
          
          if (slotDate.getTime() === endDateObj.getTime()) {
            endSlotIndex = i;
          }
          
          // If we've found both indices, we can stop searching
          if (startSlotIndex !== -1 && endSlotIndex !== -1) {
            break;
          }
        }
        
        // If we couldn't find exact matches, use closest approximations
        if (startSlotIndex === -1) {
          // Find the closest slot to the start date
          startSlotIndex = slots.findIndex(slot => slot.date.getTime() >= startDateObj.getTime());
          if (startSlotIndex === -1) startSlotIndex = 0; // Default to first slot
        }
        
        if (endSlotIndex === -1) {
          // Find the closest slot to the end date
          endSlotIndex = slots.findIndex(slot => slot.date.getTime() > endDateObj.getTime()) - 1;
          if (endSlotIndex === -2) endSlotIndex = slots.length - 1; // Default to last slot
        }
        
        // Calculate the width of the schedule in days
        const scheduleWidthDays = endSlotIndex - startSlotIndex + 1;
        
        // Calculate the position and size of the schedule bar
        const left = startSlotIndex * slotWidth;
        const width = scheduleWidthDays * slotWidth;
        
        // Create the schedule bar
        bars.push({
          id: schedule.id,
          left,
          width,
          schedule,
          project: projectsById[schedule.projectId],
          bayId: schedule.bayId,
          rowIndex: schedule.rowIndex || 0,
          startSlotIndex,
          endSlotIndex,
          scheduleWidthDays
        });
      } catch (error) {
        console.error('Error calculating schedule bar for schedule', schedule.id, error);
      }
    });
    
    return bars;
  }, [schedules, slots, slotWidth, projectsById]);

  // Update the schedule bars when schedules, slots, or slotWidth changes
  useEffect(() => {
    const bars = calculateScheduleBars();
    setScheduleBars(bars);
  }, [calculateScheduleBars]);

  // Scroll to the current day when the component mounts
  useEffect(() => {
    if (scrollToToday && viewportRef.current) {
      // Find today in the slots
      const todayIndex = slots.findIndex(slot => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return slot.date.getTime() === today.getTime();
      });
      
      if (todayIndex !== -1) {
        const scrollPosition = todayIndex * slotWidth - viewportRef.current.clientWidth / 2 + slotWidth / 2;
        
        // Scroll to today's position
        viewportRef.current.scrollLeft = Math.max(0, scrollPosition);
        console.log(`Auto-scrolled to current week position: ${scrollPosition}px (week ${Math.floor(todayIndex / 7)} of ${format(slots[todayIndex].date, 'yyyy')}) centered at ${scrollPosition - viewportRef.current.clientWidth / 2 + slotWidth / 2}px`);
      }
    }
  }, [slots, slotWidth, scrollToToday]);

  // Handle auto-scrolling during drag operations
  useEffect(() => {
    const handleDragScroll = () => {
      if (!viewportRef.current || !draggingSchedule) return;
      
      const scrollElement = viewportRef.current;
      const scrollRect = scrollElement.getBoundingClientRect();
      const scrollSpeed = 10;
      
      document.addEventListener('dragover', (e) => {
        // If near the left edge, scroll left
        if (e.clientX < scrollRect.left + 100) {
          scrollElement.scrollLeft -= scrollSpeed;
        }
        
        // If near the right edge, scroll right
        if (e.clientX > scrollRect.right - 100) {
          scrollElement.scrollLeft += scrollSpeed;
        }
      });
      
      return () => {
        document.removeEventListener('dragover', () => {});
      };
    };
    
    const cleanup = handleDragScroll();
    
    return () => {
      if (cleanup) cleanup();
    };
  }, [draggingSchedule]);

  // Clear drag state on component unmount
  useEffect(() => {
    return () => {
      // Clean up any intervals or listeners
      if (dragScrollIntervalRef.current) {
        clearInterval(dragScrollIntervalRef.current);
      }
    };
  }, []);

  // Handle creation of a new schedule
  const handleCreateSchedule = async (formData: any) => {
    if (!createScheduleData) return;
    
    const { bayId, slotIndex, startDate } = createScheduleData;
    
    try {
      // Create the new schedule
      const newSchedule = {
        projectId: formData.projectId,
        bayId,
        startDate,
        rowIndex: 0, // Always use row 0 in the simplified layout
        status: 'scheduled' as const,
        fabricationDays: formData.fabricationDays,
        assemblyDays: formData.assemblyDays,
        paintDays: formData.paintDays,
        testingDays: formData.testingDays,
        ntcDays: formData.ntcDays,
        qcDays: formData.qcDays,
        notes: formData.notes,
        color: formData.color || 'blue'
      };
      
      // Call the API to create the schedule
      const response = await apiRequest('/api/manufacturing-schedules', {
        method: 'POST',
        body: JSON.stringify(newSchedule)
      });
      
      if (response.ok) {
        // Close the dialog and refresh the data
        setCreateScheduleData(null);
        if (onRefreshData) onRefreshData();
        
        // Show a success message
        toast({
          title: "Schedule created",
          description: "The project has been scheduled successfully.",
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create schedule');
      }
    } catch (error) {
      console.error('Error creating schedule:', error);
      
      // Show an error message
      toast({
        title: "Error creating schedule",
        description: "There was a problem creating the schedule. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle editing a bay
  const handleEditBay = async () => {
    if (!editingBay || !editingBay.id) return;
    
    try {
      // Call the API to update the bay
      const response = await apiRequest(`/api/manufacturing-bays/${editingBay.id}`, {
        method: 'PATCH',
        body: JSON.stringify(editingBay)
      });
      
      if (response.ok) {
        // Close the dialog and refresh the data
        setEditingBay(null);
        if (onRefreshData) onRefreshData();
        
        // Show a success message
        toast({
          title: "Bay updated",
          description: "The bay has been updated successfully.",
        });
        
        // Invalidate the manufacturing bays query
        queryClient.invalidateQueries({ queryKey: ['/api/manufacturing-bays'] });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update bay');
      }
    } catch (error) {
      console.error('Error updating bay:', error);
      
      // Show an error message
      toast({
        title: "Error updating bay",
        description: "There was a problem updating the bay. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle deleting a schedule
  const handleConfirmDeleteSchedule = async () => {
    if (!deletingScheduleId) return;
    
    try {
      // Call the API to delete the schedule
      const response = await apiRequest(`/api/manufacturing-schedules/${deletingScheduleId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // Close the dialog and refresh the data
        setDeletingScheduleId(null);
        if (onRefreshData) onRefreshData();
        
        // Show a success message
        toast({
          title: "Schedule deleted",
          description: "The schedule has been deleted successfully.",
        });
        
        // Invalidate the manufacturing schedules query
        queryClient.invalidateQueries({ queryKey: ['/api/manufacturing-schedules'] });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete schedule');
      }
    } catch (error) {
      console.error('Error deleting schedule:', error);
      
      // Show an error message
      toast({
        title: "Error deleting schedule",
        description: "There was a problem deleting the schedule. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Render the component
  return (
    <div className="resizable-bay-schedule w-full h-full flex flex-col">
      <div className="bay-schedule-container flex-grow flex flex-col overflow-hidden">
        <div className="bay-schedule-viewport flex-grow overflow-auto" ref={viewportRef}>
          <div className="bay-schedule-container relative" ref={timelineRef}>
          {/* Timeline Header */}
          <div className="timeline-header sticky top-0 z-10 bg-gray-900 shadow-sm flex ml-32">
            {slots.map((slot, index) => {
              // For week headers, we only want one cell per week with width = 7 * slotWidth
              // This ensures no gaps and creates a continuous header
              if (slot.isStartOfWeek) {
                const weekStart = slot.date;
                const weekEnd = endOfWeek(weekStart);
                const formattedStartDate = format(weekStart, 'MMM d');
                const formattedEndDate = format(weekEnd, 'MMM d');
                const weekYear = format(weekStart, 'yyyy');
                
                // Create a HALF-width week cell to match screenshot (3.5 days worth of width)
                return (
                  <div
                    key={`header-${index}`}
                    className="timeline-slot flex-shrink-0 bg-gray-800/90 border-r border-gray-600"
                    style={{ 
                      width: `${slotWidth * 3.5}px`,
                      minWidth: `${slotWidth * 3.5}px`
                    }}
                    data-date={format(slot.date, 'yyyy-MM-dd')}
                    data-week-number={slot.weekNumber || Math.floor(index / 7)}
                  >
                    {/* Week header with no gaps but HALF width */}
                    <div className="week-number">
                      Week {slot.weekNumber || Math.floor(index / 7)}
                    </div>
                    <div className="week-date-range">
                      {formattedStartDate} - {formattedEndDate} {weekYear}
                    </div>
                    {slot.isStartOfMonth && (
                      <div className="text-xs font-bold text-blue-400 mt-1">
                        {format(slot.date, 'yyyy')}
                      </div>
                    )}
                  </div>
                );
              }
              // Skip rendering for non-week-start days
              return null;
            }).filter(Boolean)}
          </div>
          
          {/* Today indicator */}
          <div className="today-indicator absolute top-0 bottom-0 border-r-2 border-red-500 z-20 pointer-events-none">
            {/* This will be positioned via JS */}
          </div>
          
          {/* Bays content */}
          <div className="bays-container mt-0 flex flex-col">
            {manufacturingBays.map((bay, bayIndex) => {
              // Separate bays into team categories
              const teamIdentifier = bay.team || `Team ${Math.floor(bayIndex / 2) + 1}`;
              const bayPair = bayIndex % 2 === 0 ? `Bay ${bay.bayNumber} & ${bay.bayNumber + 1}` : `Bay ${bay.bayNumber - 1} & ${bay.bayNumber}`;
              
              // Calculate capacity based on available hours and staffing
              const bayCapacity = 0; // Placeholder, this would be calculated based on staffing, etc.
              
              // Get the schedules for this bay
              const baySchedules = scheduleBars.filter(bar => bar.bayId === bay.id);
              
              // Log for debugging
              console.log(`Bay ${bay.name} at ${bayCapacity}% capacity with ${baySchedules.length} projects`);
              console.log(`Bay ${bay.name} final status: ${baySchedules.length === 0 ? 'Available' : 'In Use'} with ${baySchedules.length} active projects`);
              
              return (
                <div key={`bay-${bay.id}`} className="bay-row-container border-t border-gray-700 first:border-t-0">
                  {/* Bay header with team info and capacity */}
                  <div className="bay-header sticky left-0 bg-gray-900 z-10 border-b border-gray-700 text-white">
                    <div className="flex items-center h-8 px-4 text-xs font-medium">
                      <span className="bay-name text-blue-400 w-32 truncate">{bay.name}</span>
                      
                      {/* Team and capacity indicators */}
                      <BayCapacityInfo
                        bay={bay}
                        capacity={bayCapacity}
                        activeProjects={baySchedules.length}
                      />
                      
                      {/* Bay actions menu */}
                      {canEditBay && (
                        <div className="ml-auto">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-0">
                              <div className="py-1">
                                <button
                                  className="w-full px-4 py-2 text-sm text-left hover:bg-gray-800"
                                  onClick={() => setEditingBay(bay)}
                                >
                                  Edit Bay
                                </button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Bay content */}
                  <div className="bay-content flex">
                    {/* Bay name sidebar */}
                    <div className="bay-sidebar sticky left-0 bg-gray-900 z-10 flex flex-col text-sm text-gray-300 shadow-md">
                      <div 
                        className="bay-name-cell flex items-center pl-4 text-xs font-medium border-r border-gray-700 w-32 relative" 
                        style={{ height: `${rowHeight}px` }}
                      >
                        <div className="bg-primary/20 rounded-md px-2 py-0.5 text-xs font-bold text-primary">
                          B{bay.bayNumber}
                        </div>
                      </div>
                      
                      {/* Cell grid for this bay - Modified to align with header widths */}
                      <div className="absolute inset-0 flex" style={{ width: `${slots.length * slotWidth}px` }}>
                        {/* Instead of mapping all slots, we map only week-start slots at 3.5-day intervals to match headers */}
                        {slots.filter((_, idx) => idx % 3.5 === 0).map((slot, groupIndex) => {
                          const slotIndex = Math.floor(groupIndex * 3.5);
                          const isStartOfMonth = slot.isStartOfMonth;
                          const isStartOfWeek = slot.isStartOfWeek;
                          const isWeekend = !slot.isBusinessDay;
                          const weekNumber = slot.weekNumber || Math.floor(slotIndex / 7);
                          
                          // Create cells that match the header widths exactly
                          const cellClasses = [
                            "relative h-full week-cell", // Base class for all cells
                            "border-l border-r border-gray-700/80", // Consistent borders
                            "bg-gray-900/95", // Single consistent background color
                            isWeekend ? "weekend-cell" : ""
                          ].filter(Boolean).join(" ");
                          
                          return (
                            <div 
                              key={`bay-${bay.id}-slot-${slotIndex}`} 
                              className={cellClasses}
                              data-row="0"
                              data-slot-index={slotIndex}
                              data-date={format(slot.date, 'yyyy-MM-dd')}
                              data-start-date={format(slot.date, 'yyyy-MM-dd')}
                              data-bay-id={bay.id}
                              data-row-index="0"
                              data-exact-week="true"
                              data-week-number={weekNumber}
                              data-is-start-of-month={isStartOfMonth ? "true" : "false"}
                              data-is-start-of-week={isStartOfWeek ? "true" : "false"}
                              data-is-weekend={isWeekend ? "true" : "false"}
                              style={{
                                width: `${slotWidth * 3.5}px`, // Each cell has the same width as header
                                minWidth: `${slotWidth * 3.5}px`,
                                height: '100%',
                                position: 'relative',
                              }}
                              onDragOver={(e) => {
                                // CRITICAL: Prevent default to enable dropping
                                e.preventDefault();
                                
                                // Stop propagation to prevent parent elements from handling
                                e.stopPropagation();
                                
                                // Explicitly set the drop effect to 'move' to show move cursor
                                e.dataTransfer.dropEffect = 'move';
                                
                                // Update highlight state for active drag target
                                e.currentTarget.classList.add('drag-over');
                                
                                // Call main drag over handler with proper coordinates
                                handleDragOver(e, bay.id, 0, slotIndex);
                              }}
                              onDragLeave={(e) => {
                                // Remove highlight when drag leaves
                                e.currentTarget.classList.remove('drag-over');
                              }}
                              onDrop={(e) => {
                                // Handle the drop with EXACT position matching
                                // IMPORTANT: No auto-adjustments, this is the exact cell where user drops
                                handleDrop(e, bay.id, slotIndex, 0).catch(console.error);
                                
                                // Remove highlight when drop completes
                                e.currentTarget.classList.remove('drag-over');
                              }}
                              onClick={(e) => {
                                // Handle click on empty slot for create/edit options
                                if (canCreateSchedule) {
                                  // Show dialog for creating a new schedule
                                  setCreateScheduleData({
                                    bayId: bay.id,
                                    slotIndex: slotIndex,
                                    startDate: format(slot.date, 'yyyy-MM-dd')
                                  });
                                }
                              }}
                            />
                          );
                        })}
                      </div>
                      
                      {/* Render the schedule bars for this bay */}
                      {scheduleBars
                        .filter(bar => bar.bayId === bay.id)
                        .map(bar => {
                          // Get the project for this schedule
                          const project = bar.project;
                          if (!project) return null;
                          
                          return (
                            <ScheduleBar 
                              key={`schedule-${bar.id}`}
                              scheduleId={bar.id}
                              left={bar.left}
                              width={bar.width}
                              height={rowHeight - 1} // -1 for border
                              project={project}
                              schedule={bar.schedule}
                              draggable={canDragSchedules}
                              onDragStart={handleDragStart}
                              onResizeStart={handleResizeStart}
                              isResizing={resizingSchedule === bar.id}
                              onEditClick={() => onEditSchedule && onEditSchedule(bar.id)}
                              onDeleteClick={() => setDeletingScheduleId(bar.id)}
                              onProjectClick={() => onEditProject && onEditProject(project.id)}
                              isHighlighted={hoverSchedule === bar.id}
                              onMouseEnter={() => setHoverSchedule(bar.id)}
                              onMouseLeave={() => setHoverSchedule(null)}
                              style={{
                                top: `${(bar.rowIndex) * rowHeight}px`,
                                zIndex: hoverSchedule === bar.id ? 10 : 1
                              }}
                            />
                          );
                        })}
                    </div>
                    
                    {isMultiRowBay(bay.id) ? (
                      // Multi-row bay content (complex layout)
                      <MultiRowBayContent 
                        bay={bay} 
                        slots={slots} 
                        slotWidth={slotWidth} 
                        rowHeight={rowHeight}
                        schedules={schedules}
                        projects={projects}
                        rowCount={getBayRowCount(bay.id, bay.name)}
                      />
                    ) : (
                      // SIMPLIFIED SINGLE-ROW LAYOUT - EACH BAY IS ONE ROW
                      <div className="absolute inset-0 flex flex-col w-full" style={{ minWidth: '100%', width: `${slots.length * slotWidth}px` }}>
                        {/* Single row per bay - simplified drop zone - EXTENDED TO END OF TIMELINE */}
                        <div 
                          className="h-full bay-row transition-colors hover:bg-gray-700/10 cursor-pointer relative" 
                          style={{ width: `${slots.length * slotWidth}px`, minWidth: '100%' }}
                          onDragOver={(e) => {
                            // Add strong visual indicator for this bay's single row
                            e.currentTarget.classList.add('row-target-highlight', 'bay-highlight');
                            // Always use row 0 for consistent placement
                            handleDragOver(e, bay.id, 0, 0);
                          }}
                          onDragLeave={(e) => {
                            // Clear visual indicators when dragging out
                            e.currentTarget.classList.remove('row-target-highlight', 'bay-highlight');
                          }}
                          onDrop={(e) => {
                            // Always drop in row 0 for simplified single-row layout
                            handleDrop(e, bay.id, 0, 0);
                            // Clear visual indicators after drop
                            e.currentTarget.classList.remove('row-target-highlight', 'bay-highlight');
                          }}
                        >
                          {/* Background grid for this bay's row */}
                          <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${slots.length}, ${slotWidth}px)` }}>
                            {slots.map((slot, index) => {
                              const isWeekend = !slot.isBusinessDay;
                              const isStartOfWeek = slot.isStartOfWeek;
                              
                              return (
                                <div 
                                  key={`cell-${index}`}
                                  className={cn(
                                    "h-full", 
                                    isWeekend ? "bg-gray-800/20" : "bg-gray-900/95",
                                    isStartOfWeek ? "border-l border-r border-gray-700/80" : "border-r border-gray-700/30",
                                  )}
                                />
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          </div>
        </div>
      </div>
      
      {/* Create Schedule Dialog */}
      {createScheduleData && (
        <Dialog open={!!createScheduleData} onOpenChange={() => setCreateScheduleData(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Schedule</DialogTitle>
              <DialogDescription>
                Schedule a project to start on {createScheduleData.startDate}
              </DialogDescription>
            </DialogHeader>
            
            {/* Schedule creation form would go here */}
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="project" className="text-right">Project</Label>
                <Select>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="fabricationDays" className="text-right">Fabrication Days</Label>
                <Input id="fabricationDays" type="number" min="0" className="col-span-3" />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="paintDays" className="text-right">Paint Days</Label>
                <Input id="paintDays" type="number" min="0" className="col-span-3" />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="assemblyDays" className="text-right">Assembly Days</Label>
                <Input id="assemblyDays" type="number" min="0" className="col-span-3" />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="testingDays" className="text-right">Testing Days</Label>
                <Input id="testingDays" type="number" min="0" className="col-span-3" />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="ntcDays" className="text-right">NTC Days</Label>
                <Input id="ntcDays" type="number" min="0" className="col-span-3" />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="qcDays" className="text-right">QC Days</Label>
                <Input id="qcDays" type="number" min="0" className="col-span-3" />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="notes" className="text-right">Notes</Label>
                <Textarea id="notes" className="col-span-3" />
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateScheduleData(null)}>Cancel</Button>
              <Button type="button" onClick={() => handleCreateSchedule({})}>Create Schedule</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Edit Bay Dialog */}
      {editingBay && (
        <Dialog open={!!editingBay} onOpenChange={() => setEditingBay(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Bay</DialogTitle>
              <DialogDescription>
                Update the details for bay {editingBay.name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input 
                  id="name" 
                  value={editingBay.name || ''} 
                  onChange={(e) => setEditingBay({...editingBay, name: e.target.value})} 
                  className="col-span-3" 
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="bayNumber" className="text-right">Bay Number</Label>
                <Input 
                  id="bayNumber" 
                  type="number" 
                  value={editingBay.bayNumber || 0} 
                  onChange={(e) => setEditingBay({...editingBay, bayNumber: parseInt(e.target.value) || 0})} 
                  className="col-span-3" 
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="team" className="text-right">Team</Label>
                <Input 
                  id="team" 
                  value={editingBay.team || ''} 
                  onChange={(e) => setEditingBay({...editingBay, team: e.target.value})} 
                  className="col-span-3" 
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">Description</Label>
                <Textarea 
                  id="description" 
                  value={editingBay.description || ''} 
                  onChange={(e) => setEditingBay({...editingBay, description: e.target.value})} 
                  className="col-span-3" 
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="isActive" className="text-right">Active</Label>
                <div className="col-span-3 flex items-center">
                  <Checkbox 
                    id="isActive" 
                    checked={editingBay.isActive || false} 
                    onCheckedChange={(checked) => setEditingBay({...editingBay, isActive: !!checked})} 
                  />
                  <Label htmlFor="isActive" className="ml-2">Bay is active</Label>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingBay(null)}>Cancel</Button>
              <Button type="button" onClick={handleEditBay}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Delete Schedule Dialog */}
      {deletingScheduleId && (
        <Dialog open={!!deletingScheduleId} onOpenChange={() => setDeletingScheduleId(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Delete Schedule</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this schedule? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDeletingScheduleId(null)}>Cancel</Button>
              <Button type="button" variant="destructive" onClick={handleConfirmDeleteSchedule}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ResizableBaySchedule;