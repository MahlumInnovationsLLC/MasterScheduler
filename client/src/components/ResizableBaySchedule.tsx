// ResizableBaySchedule.tsx
import React, { 
  useState, 
  useRef, 
  useEffect, 
  useMemo,
  useCallback
} from 'react';
import { 
  format, 
  isSameDay, 
  addDays, 
  subDays, 
  addWeeks, 
  isWeekend,
  addMonths,
  isWithinInterval,
} from 'date-fns';
import { 
  Pencil, 
  XCircle, 
  MoreVertical, 
  ChevronRight, 
  ChevronLeft, 
  Plus,
  UserPlus,
  CalendarDays,
  Users,
  AlarmClock,
  PlusCircle,
  Trash2
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from '@/components/ui/button';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { ManufacturingBay, ManufacturingSchedule, Project } from '@shared/schema';

// Extended type for backward compatibility
interface ExtendedManufacturingBay extends ManufacturingBay {
  rowCount?: number;
  isMultiRowBay?: boolean;
  hoursPerPerson?: number;
}
import { EditBayDialog } from './EditBayDialog';
import MultiRowBayContent from './MultiRowBayContent';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { formatCurrency as formatHours } from '@/lib/utils';

// Define stub for missing calculateProjectPhases function
function calculateProjectPhases(project: Project, startDate: string, endDate: string) {
  // Calculate how many days between start and end dates
  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  
  // Fabrication typically takes first 27% of the schedule
  const fabDays = Math.ceil(totalDays * 0.27);
  const fabEndDate = new Date(start.getTime() + (fabDays * 24 * 60 * 60 * 1000));
  
  // Paint takes 7% of the schedule
  const paintDays = Math.ceil(totalDays * 0.07);
  const paintEndDate = new Date(fabEndDate.getTime() + (paintDays * 24 * 60 * 60 * 1000));
  
  // Production takes 60% of the schedule
  const prodDays = Math.ceil(totalDays * 0.60);
  const prodEndDate = new Date(paintEndDate.getTime() + (prodDays * 24 * 60 * 60 * 1000));
  
  // IT takes 3% of the schedule
  const itDays = Math.ceil(totalDays * 0.03);
  const itEndDate = new Date(prodEndDate.getTime() + (itDays * 24 * 60 * 60 * 1000));
  
  // NTC takes 2% of the schedule
  const ntcDays = Math.ceil(totalDays * 0.02);
  const ntcEndDate = new Date(itEndDate.getTime() + (ntcDays * 24 * 60 * 60 * 1000));
  
  // QC takes 1% of the schedule
  const qcDays = Math.ceil(totalDays * 0.01);
  const qcEndDate = new Date(ntcEndDate.getTime() + (qcDays * 24 * 60 * 60 * 1000));
  
  // Calculate widths as percentages of total schedule
  const fabWidth = Math.round((fabDays / totalDays) * 100);
  const paintWidth = Math.round((paintDays / totalDays) * 100);
  const prodWidth = Math.round((prodDays / totalDays) * 100);
  const itWidth = Math.round((itDays / totalDays) * 100);
  const ntcWidth = Math.round((ntcDays / totalDays) * 100);
  const qcWidth = Math.round((qcDays / totalDays) * 100);
  
  // Return the phase object with additional derived properties
  // needed by the existing code
  return {
    fabrication: { start, end: fabEndDate },
    paint: { start: fabEndDate, end: paintEndDate },
    assembly: { start: paintEndDate, end: prodEndDate },
    it: { start: prodEndDate, end: itEndDate },
    ntc: { start: itEndDate, end: ntcEndDate },
    qc: { start: ntcEndDate, end: qcEndDate },
    // Additional properties for compatibility
    fabDays,
    prodDays,
    fabWeeks: Math.ceil(fabDays / 7),
    phases: {
      fab: { 
        start: format(start, 'yyyy-MM-dd'), 
        end: format(fabEndDate, 'yyyy-MM-dd'),
        width: fabWidth
      },
      paint: { 
        start: format(fabEndDate, 'yyyy-MM-dd'), 
        end: format(paintEndDate, 'yyyy-MM-dd'),
        width: paintWidth 
      },
      production: { 
        start: format(paintEndDate, 'yyyy-MM-dd'), 
        end: format(prodEndDate, 'yyyy-MM-dd'),
        width: prodWidth 
      },
      it: { 
        start: format(prodEndDate, 'yyyy-MM-dd'), 
        end: format(itEndDate, 'yyyy-MM-dd'),
        width: itWidth 
      },
      ntc: { 
        start: format(itEndDate, 'yyyy-MM-dd'), 
        end: format(ntcEndDate, 'yyyy-MM-dd'),
        width: ntcWidth 
      },
      qc: { 
        start: format(ntcEndDate, 'yyyy-MM-dd'), 
        end: format(qcEndDate, 'yyyy-MM-dd'),
        width: qcWidth
      }
    }
  };
}

// Import the speciality handlers for exact positioning
import { storeExactDateInfo, clearExactDateInfo } from '@/lib/exactPositioningHandler';

// Custom styles for the visualization
const styles = {
  container: 'relative',
  timelineContainer: 'overflow-x-auto border border-border rounded-md bg-background',
  timelineHeader: 'sticky top-0 z-10 bg-card border-b border-border',
  timelineHeaderCell: 'px-2 py-1 text-xs border-r border-border min-w-[100px] text-center font-medium',
  timelineRow: 'border-b border-border hover:bg-muted/30 transition-colors',
  timelineCell: 'px-2 py-1 text-xs border-r border-border min-w-[100px] h-12',
  timelineCellSlot: 'absolute top-0 left-0 h-full border-r border-gray-200 opacity-0',
  weekendCell: 'bg-muted/50',
  todayCell: 'bg-primary/10',
  scheduledItem: 'absolute top-1 left-0 p-1 rounded text-xs text-white cursor-pointer transition-all',
  scheduledItemContent: 'truncate text-xs font-medium',
  phase: 'absolute top-0 left-0 h-full opacity-70',
  phaseFab: 'bg-blue-500',
  phasePaint: 'bg-green-500',
  phaseProduction: 'bg-amber-500',
  phaseIT: 'bg-purple-500',
  phaseNTC: 'bg-pink-500',
  phaseQC: 'bg-red-400',
  bayHeader: 'sticky left-0 z-20 flex items-center justify-between bg-card shadow-md px-4 border-b border-r border-border py-2',
  bayName: 'font-semibold text-foreground truncate',
  rowContainer: 'flex flex-col',
  rowHeader: 'sticky left-0 z-10 w-36 bg-card shadow-md flex items-center px-3 h-12 border-r border-border',
  activeDropTarget: 'bg-primary/20 dark:bg-primary/30',
  dragItem: 'bg-primary text-primary-foreground p-2 rounded shadow-lg cursor-move',
  phaseLabel: 'uppercase font-semibold text-[0.65rem] tracking-wider'
};

// TypeScript interfaces
interface DragData {
  id?: number;
  projectId: number;
  type: 'new' | 'existing';
  projectName: string;
  startDate?: string;
  endDate?: string;
  totalHours?: number;
  row?: number;
  targetStartDate?: string;
}

export interface ResizableBayScheduleProps {
  schedules: ManufacturingSchedule[];
  projects: Project[];
  bays: ExtendedManufacturingBay[];
  onScheduleChange: (schedule: ManufacturingSchedule) => void;
  onScheduleCreate: (schedule: Omit<ManufacturingSchedule, 'id'>) => void;
  onScheduleDelete: (id: number) => void;
  onBayCreate: (bay: Omit<ExtendedManufacturingBay, 'id'>) => void;
  onBayUpdate: (bay: ExtendedManufacturingBay) => void;
  onBayDelete: (id: number) => void;
  dateRange: [Date, Date];
  viewMode?: 'month' | 'week';
}

// Utility function to add business days (skip weekends and holidays)
function addBusinessDays(date: Date, days: number, holidays: Date[]): Date {
  let currentDate = new Date(date);
  let remainingDays = days;
  
  while (remainingDays > 0) {
    currentDate = addDays(currentDate, 1);
    // Skip weekends and holidays
    if (
      !isWeekend(currentDate) && 
      !holidays.some(holiday => isSameDay(holiday, currentDate))
    ) {
      remainingDays--;
    }
  }
  
  return currentDate;
}

// Function to find the next business day (for start dates)
function adjustToNextBusinessDay(date: Date): Date | null {
  if (!date) return null;
  
  try {
    // If it's already a business day, return as is
    if (!isWeekend(date)) {
      return date;
    }
    
    // Move to the next Monday if it's a weekend
    let nextDate = date;
    while (isWeekend(nextDate)) {
      nextDate = addDays(nextDate, 1);
    }
    
    return nextDate;
  } catch (err) {
    console.error('Error in adjustToNextBusinessDay:', err);
    return date; // In case of error, just return the original date
  }
}

// Function to find the previous business day (for end dates)
function adjustToPreviousBusinessDay(date: Date): Date | null {
  if (!date) return null;
  
  try {
    // If it's already a business day, return as is
    if (!isWeekend(date)) {
      return date;
    }
    
    // Move to the previous Friday if it's a weekend
    let prevDate = date;
    while (isWeekend(prevDate)) {
      prevDate = subDays(prevDate, 1);
    }
    
    return prevDate;
  } catch (err) {
    console.error('Error in adjustToPreviousBusinessDay:', err);
    return date; // In case of error, just return the original date
  }
}

// Helper to determine if a drag operation is in progress
let dragInProgress = false;

// MAJOR BUGFIX: Function component needs to be exported properly
const ResizableBaySchedule = ({ 
  schedules, 
  projects, 
  bays: initialBays, 
  onScheduleChange, 
  onScheduleCreate, 
  onScheduleDelete,
  onBayCreate,
  onBayUpdate,
  onBayDelete,
  dateRange,
  viewMode = 'month'
}: ResizableBayScheduleProps) => {
  // References
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const resizeInfo = useRef<{ id: number; type: 'left' | 'right' | 'move'; startX: number; initialLeft: number; initialWidth: number; initialStart: Date; initialEnd: Date } | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [resizing, setResizing] = useState(false);
  
  // State variables
  // Fix dateRange not iterable error by providing safe defaults 
  const startDate = Array.isArray(dateRange) && dateRange.length > 0 ? dateRange[0] : new Date();
  const endDate = Array.isArray(dateRange) && dateRange.length > 1 ? dateRange[1] : new Date(startDate.getTime() + (30 * 24 * 60 * 60 * 1000));
  const [bays, setBays] = useState<ManufacturingBay[]>(initialBays);
  const [selectedSchedule, setSelectedSchedule] = useState<ManufacturingSchedule | null>(null);
  const [showAddScheduleDialog, setShowAddScheduleDialog] = useState(false);
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [editingBay, setEditingBay] = useState<ManufacturingBay | null>(null);
  const [showNewBayDialog, setShowNewBayDialog] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ManufacturingSchedule | null>(null);
  const [confirmRowDelete, setConfirmRowDelete] = useState<{bayId: number, rowIndex: number, rowNumber: number, bayName: string} | null>(null);
  const [currentView, setCurrentView] = useState(viewMode);
  
  // Custom hooks for holiday dates
  const holidayDates: Date[] = [];
  
  // Effect to sync bays state with props
  useEffect(() => {
    setBays(initialBays);
  }, [initialBays]);
  
  // Compute the days of the timeline
  const days = useMemo(() => {
    const daysArray: Date[] = [];
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      daysArray.push(new Date(currentDate));
      currentDate = addDays(currentDate, 1);
    }
    
    return daysArray;
  }, [startDate, endDate]);
  
  // Compute the slots
  const slots = useMemo(() => {
    return days.map(day => ({
      date: day,
      isWeekend: isWeekend(day)
    }));
  }, [days]);
  
  // Get today's date for highlighting
  const today = new Date();
  
  // Derive schedules by bay for easier rendering
  const schedulesByBay = useMemo(() => {
    const byBay: { [bayId: number]: ManufacturingSchedule[] } = {};
    
    schedules.forEach(schedule => {
      if (!byBay[schedule.bayId]) {
        byBay[schedule.bayId] = [];
      }
      byBay[schedule.bayId].push(schedule);
    });
    
    return byBay;
  }, [schedules]);
  
  // Helper to find a project by its ID
  const getProject = useCallback((projectId: number): Project | undefined => {
    return projects.find(p => p.id === projectId);
  }, [projects]);
  
  // Compute the row range for each bay
  const bayRows = useMemo(() => {
    const rows: { [bayId: number]: number[] } = {};
    
    bays.forEach(bay => {
      const scheduleCount = (schedulesByBay[bay.id] || []).length;
      
      // Default to 1 row if no schedules, or use the maximum row index + 1
      let rowCount = bay.rowCount || 4; // Default to 4 rows for bays
      
      // Special case for bay numbers 7 and 8, which should always have 20 rows
      if (bay.bayNumber === 7 || bay.bayNumber === 8) {
        console.log(`Using 20 rows for bay ${bay.id} (${bay.name}) - mandatory 20 rows for bay numbers 7 & 8`);
        rowCount = 20;
      }
      
      // For debug, log the row count decision
      console.log(`Bay ${bay.id} (${bay.name}): isMultiRowBay=${bay.isMultiRowBay}, rowCount=${rowCount}, bayNumber=${bay.bayNumber}`);
      
      rows[bay.id] = Array.from({ length: rowCount }, (_, i) => i);
    });
    
    return rows;
  }, [bays, schedulesByBay]);
  
  // Simple implementation of bay scheduling utilities
  const bayScheduling = {
    updateProjectPhaseDates: (project: Project, bay: ManufacturingBay, dates: {startDate: string, endDate: string}) => {
      console.log('Updating project phase dates:', {projectId: project.id, bayId: bay.id, dates});
      // This would normally update the project's phase dates in the database
      return true;
    },
    getProjectPhaseDates: (project: Project, options: {scheduleStart: string, scheduleEnd: string}) => {
      // Return a structure with phase dates
      const startDate = new Date(options.scheduleStart);
      const endDate = new Date(options.scheduleEnd);
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Fabrication typically takes first 27% of the schedule
      const fabDays = Math.ceil(totalDays * 0.27);
      const fabEndDate = new Date(startDate.getTime() + (fabDays * 24 * 60 * 60 * 1000));
      
      // Paint takes 7% of the schedule
      const paintDays = Math.ceil(totalDays * 0.07);
      const paintEndDate = new Date(fabEndDate.getTime() + (paintDays * 24 * 60 * 60 * 1000));
      
      // Production takes 60% of the schedule
      const prodDays = Math.ceil(totalDays * 0.60);
      const prodEndDate = new Date(paintEndDate.getTime() + (prodDays * 24 * 60 * 60 * 1000));
      
      // IT takes 3% of the schedule
      const itDays = Math.ceil(totalDays * 0.03);
      const itEndDate = new Date(prodEndDate.getTime() + (itDays * 24 * 60 * 60 * 1000));
      
      // NTC takes 2% of the schedule
      const ntcDays = Math.ceil(totalDays * 0.02);
      const ntcEndDate = new Date(itEndDate.getTime() + (ntcDays * 24 * 60 * 60 * 1000));
      
      // QC takes 1% of the schedule
      const qcDays = Math.ceil(totalDays * 0.01);
      const qcEndDate = new Date(ntcEndDate.getTime() + (qcDays * 24 * 60 * 60 * 1000));
      
      return {
        schedule: { start: startDate, end: endDate },
        shipDate: project.shipDate || endDate,
        fabStart: startDate,
        fabEnd: fabEndDate,
        paintStart: fabEndDate,
        paintEnd: paintEndDate,
        assemblyStart: paintEndDate,
        assemblyEnd: prodEndDate,
        ntcStart: prodEndDate,
        ntcEnd: ntcEndDate,
        qcStart: ntcEndDate,
        qcEnd: qcEndDate
      };
    }
  };
  
  // Handle drag start for a project
  const handleProjectDragStart = (e: React.DragEvent, project: Project) => {
    // Set global flag for active drag
    dragInProgress = true;
    document.body.classList.add('dragging-active');
    
    const data: DragData = {
      projectId: project.id,
      type: 'new',
      projectName: project.name,
      totalHours: project.totalHours as number
    };
    
    // Set the drag data
    try {
      e.dataTransfer.setData('application/json', JSON.stringify(data));
      
      // We also set text/plain for browsers that don't support application/json
      e.dataTransfer.setData('text/plain', JSON.stringify(data));
      
      // Set the drag image and make it pretty
      const dragElement = document.createElement('div');
      dragElement.className = styles.dragItem;
      dragElement.innerHTML = `Scheduling: ${project.projectNumber} - ${project.name}`;
      document.body.appendChild(dragElement);
      
      e.dataTransfer.setDragImage(dragElement, 20, 20);
      
      // Clean up the drag element after a short delay
      setTimeout(() => {
        document.body.removeChild(dragElement);
      }, 100);
    } catch (error) {
      console.error('Failed to set drag data:', error);
    }
  };
  
  // Handle drag start for an existing schedule
  const handleScheduleDragStart = (e: React.DragEvent, schedule: ManufacturingSchedule) => {
    // Set global flag for active drag
    dragInProgress = true;
    document.body.classList.add('dragging-active');
    
    // Find the associated project
    const project = getProject(schedule.projectId);
    if (!project) return;
    
    const data: DragData = {
      id: schedule.id,
      projectId: schedule.projectId,
      type: 'existing',
      projectName: project.name,
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      totalHours: schedule.totalHours,
      row: schedule.rowIndex
    };
    
    try {
      // Set the drag data
      e.dataTransfer.setData('application/json', JSON.stringify(data));
      e.dataTransfer.setData('text/plain', JSON.stringify(data));
      
      // Create a custom drag image
      const dragElement = document.createElement('div');
      dragElement.className = styles.dragItem;
      dragElement.innerHTML = `Moving: ${project.projectNumber} - ${project.name}`;
      document.body.appendChild(dragElement);
      
      e.dataTransfer.setDragImage(dragElement, 20, 20);
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(dragElement);
      }, 100);
    } catch (error) {
      console.error('Failed to set drag data:', error);
    }
  };
  
  // Function to add a row to a bay
  const handleAddRow = async (bayId: number) => {
    try {
      // Find the bay to update
      const bay = bays.find(b => b.id === bayId);
      if (!bay) {
        throw new Error(`Bay with ID ${bayId} not found`);
      }
      
      // Calculate new row count (current max + 1)
      const currentRowCount = bay.rowCount || 4; // Default to 4 if not set
      const newRowCount = currentRowCount + 1;
      
      // Update the bay
      const updatedBay = {
        ...bay,
        rowCount: newRowCount
      };
      
      // Call API to update
      await onBayUpdate(updatedBay);
      
      // Show success toast
      toast({
        title: "Row Added",
        description: `Added row ${newRowCount} to ${bay.name}`,
      });
      
      // Update local state
      const updatedBays = bays.map(b => b.id === bayId ? updatedBay : b);
      setBays(updatedBays);
    } catch (error) {
      console.error('Error adding row:', error);
      toast({
        title: "Error",
        description: `Failed to add row: ${(error as Error).message}`,
        variant: "destructive"
      });
    }
  };
  
  // Function to delete a row from a bay
  const handleDeleteRow = async (bayId: number, rowIndex: number) => {
    try {
      // Find affected schedules (projects) in this row
      const affectedSchedules = schedules.filter(
        schedule => schedule.bayId === bayId && (schedule.rowIndex === rowIndex || schedule.row === rowIndex)
      );
      
      if (affectedSchedules.length > 0) {
        // Confirm with user first since this will unschedule projects
        const projectNames = affectedSchedules.map(s => {
          const project = getProject(s.projectId);
          return project ? `${project.projectNumber} - ${project.name}` : `Project #${s.projectId}`;
        });
        
        // Delete the schedules first
        for (const schedule of affectedSchedules) {
          await onScheduleDelete(schedule.id);
        }
      }
      
      // Find the bay
      const bay = bays.find(b => b.id === bayId);
      if (!bay) {
        throw new Error(`Bay with ID ${bayId} not found`);
      }
      
      // Decrease row count
      const currentRowCount = bay.rowCount || 4;
      if (currentRowCount <= 1) {
        throw new Error("Cannot remove the last row");
      }
      
      const newRowCount = currentRowCount - 1;
      
      // Update the bay
      const updatedBay = {
        ...bay,
        rowCount: newRowCount
      };
      
      // Call API to update
      await onBayUpdate(updatedBay);
      
      // Success toast
      toast({
        title: "Row Deleted",
        description: `Removed row ${rowIndex + 1} from ${bay.name}`,
      });
      
      // Update local state
      const updatedBays = bays.map(b => b.id === bayId ? updatedBay : b);
      setBays(updatedBays);
      
      // Close the confirmation dialog
      setConfirmRowDelete(null);
    } catch (error) {
      console.error('Error deleting row:', error);
      toast({
        title: "Error",
        description: `Failed to delete row: ${(error as Error).message}`,
        variant: "destructive"
      });
    }
  };
  
  // Function to add a new bay
  const handleAddBay = () => {
    // Show the new bay dialog
    setShowNewBayDialog(true);
  };
  
  // Function to delete a bay
  const handleDeleteBay = async (bayId: number) => {
    try {
      // Find affected schedules (projects) in this bay
      const affectedSchedules = schedules.filter(schedule => schedule.bayId === bayId);
      
      if (affectedSchedules.length > 0) {
        // Prompt user for confirmation since this will unschedule projects
        const confirm = window.confirm(
          `Deleting this bay will unschedule ${affectedSchedules.length} projects. Continue?`
        );
        
        if (!confirm) return;
        
        // Delete the schedules first
        for (const schedule of affectedSchedules) {
          await onScheduleDelete(schedule.id);
        }
      }
      
      // Delete the bay
      await onBayDelete(bayId);
      
      // Success toast
      toast({
        title: "Bay Deleted",
        description: `Bay successfully deleted`,
      });
    } catch (error) {
      console.error('Error deleting bay:', error);
      toast({
        title: "Error",
        description: `Failed to delete bay: ${(error as Error).message}`,
        variant: "destructive"
      });
    }
  };
  
  // Function to create a new bay
  const handleCreateBay = async (bayData: Omit<ManufacturingBay, 'id'>) => {
    try {
      // Call API to create new bay
      await onBayCreate(bayData);
      
      // Success message
      toast({
        title: "Bay Created",
        description: `Created new bay: ${bayData.name}`,
      });
      
      // Close dialog
      setShowNewBayDialog(false);
    } catch (error) {
      console.error('Error creating bay:', error);
      toast({
        title: "Error",
        description: `Failed to create bay: ${(error as Error).message}`,
        variant: "destructive"
      });
    }
  };
  
  // Function to save bay edits
  const handleSaveBayEdit = async (bay: ExtendedManufacturingBay) => {
    try {
      // Call API to update bay
      await onBayUpdate(bay);
      
      // Show success message
      toast({
        title: "Bay Updated",
        description: `Updated bay: ${bay.name}`,
      });
      
      // Update local state and close dialog
      const updatedBays = bays.map(b => b.id === bay.id ? bay : b);
      setBays(updatedBays);
      setEditingBay(null);
    } catch (error) {
      console.error('Error updating bay:', error);
      toast({
        title: "Error",
        description: `Failed to update bay: ${(error as Error).message}`,
        variant: "destructive"
      });
    }
  };
  
  // Auto-scroll the timeline to the current week
  useEffect(() => {
    try {
      // Get the timeline container from our ref
      const scrollContainer = timelineContainerRef.current;
      
      if (scrollContainer) {
        // Calculate days since Jan 1 of the current year
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const daysSinceStart = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
        
        // Calculate pixel position based on cell width (adjust the 100 if your cell width is different)
        const pixelsPerDay = 20.57; // Each day is approx 20px wide
        const dayOffset = daysSinceStart * pixelsPerDay;
        
        // Emergency: if the normal calculation fails, try a fixed approach
        // This is a failsafe for browsers or situations where the above calculation doesn't work
        let scrollPosition = dayOffset;
        const weeksFromStart = Math.floor(daysSinceStart / 7);
        
        try {
          // Try regular scrolling first
          scrollContainer.scrollLeft = scrollPosition - (window.innerWidth / 4); // Offset to center current week
          
          console.log(`Auto-scrolled to ${format(now, 'MMMM yyyy')} position: ${scrollPosition}px (week ${format(now, 'w')} of ${now.getFullYear()}) centered at ${scrollPosition - (window.innerWidth / 4)}px`);
        } catch (err) {
          // If that fails, try a more direct approach
          console.log('USING EMERGENCY SCROLLING METHOD');
          let pxPerDay = 20.57; // Approximate px per day
          let forcedPosition = daysSinceStart * pxPerDay;
          scrollContainer.scrollLeft = forcedPosition;
          console.log(`Forced scroll to ${forcedPosition}px (${daysSinceStart} days since Jan 1, ${pxPerDay}px per day)`);
        }
      }
    } catch (error) {
      console.error('Error in auto-scroll effect:', error);
    }
  }, []);
  
  // Handle timeline cell drag over
  const handleDragOver = (e: React.DragEvent, slotIndex: number, rowIndex: number, bayId: number) => {
    try {
      e.preventDefault();
      
      // Get the containing cell element
      const targetElement = e.currentTarget as HTMLElement;
      
      // Store info about where we're dragging over
      const slotData = slots[slotIndex];
      if (slotData && slotData.date) {
        // Format the date for readability and consistency
        const dateStr = format(slotData.date, 'yyyy-MM-dd');
        
        // Store this date in our global state for use during drop
        // Our exactPositioningHandler will store in a safe format
        storeExactDateInfo(dateStr);
        
        // Add a data attribute to the element for reference
        targetElement.setAttribute('data-exact-date', dateStr);
      }
      
      // Store the bay ID on the document body for fallback positioning
      document.body.setAttribute('data-current-drag-bay', bayId.toString());
      document.body.setAttribute('data-current-drag-row', rowIndex.toString());
      
      // Clean up any existing highlight classes
      try {
        document.querySelectorAll('.active-drop-target, .drag-hover, [class*="row-"],[class*="-highlight"]').forEach(el => {
          el.classList.remove('active-drop-target', 'drag-hover');
          
          // Also remove any row-specific highlight classes
          const classList = el.classList;
          Array.from(classList).forEach(cls => {
            if (cls.includes('-highlight')) {
              el.classList.remove(cls);
            }
          });
        });
      } catch (err) {
        console.error('Error removing highlight classes:', err);
      }
      
      // Add the highlight class to this element
      e.currentTarget.classList.add('active-drop-target');
      
      // Add a row-specific highlight class
      e.currentTarget.classList.add(`row-${rowIndex}-highlight`);
      
      // Find all cells in this week column and add hover effect
      const columnIndex = e.currentTarget.getAttribute('data-slot-index');
      if (columnIndex) {
        document.querySelectorAll(`[data-slot-index="${columnIndex}"][data-bay-id="${bayId}"]`).forEach(el => {
          el.classList.add('drag-hover');
        });
      }
    } catch (error) {
      console.error('Error in drag over handler:', error);
    }
  };
  
  // Handle drop on a timeline cell
  const handleDrop = (e: React.DragEvent, slotIndex: number, rowIndex: number, bayId: number) => {
    // Prevent default browser behavior
    e.preventDefault();
    
    // Get the element where the drop occurred
    const targetElement = e.currentTarget as HTMLElement;
    
    // Get the date attribute from the target element
    const dataDate = targetElement.getAttribute('data-date') || 
                    targetElement.getAttribute('data-exact-date');
    
    // Clean up highlight classes
    try {
      document.querySelectorAll('.active-drop-target, .drag-hover, [class*="row-"],[class*="-highlight"]').forEach(el => {
        el.classList.remove('active-drop-target', 'drag-hover');
        
        // Also remove any row-specific highlight classes
        const classList = el.classList;
        Array.from(classList).forEach(cls => {
          if (cls.includes('-highlight')) {
            el.classList.remove(cls);
          }
        });
      });
    } catch (error) {
      console.error('Error cleaning up highlight classes:', error);
    }
    
    // Remove dragging active class from body
    document.body.classList.remove('dragging-active');
    
    // Try multiple formats in case one fails
    let dataStr = '';
    try {
      dataStr = e.dataTransfer.getData('application/json');
    } catch (err) {
      console.log('Error getting application/json data, trying text/plain...');
      dataStr = e.dataTransfer.getData('text/plain');
    }
    
    if (!dataStr) {
      console.error('No data received in drop event');
      return;
    }
    
    console.log('Data received in drop:', dataStr);
    console.log(`Dropping at bay ${bayId}, slot ${slotIndex}, row ${rowIndex}`);
    console.log(`DROP HANDLER: FORCING BAY ID TO USE EXACT PARAMETER: ${bayId}`);
    
    try {
      const data = JSON.parse(dataStr);
      if (!data) {
        console.error('Failed to parse drop data');
        return;
      }
      
      // CRITICAL BUG FIX: Ensure we're using EXACTLY the bay ID from the drop event parameter
      // This is the most reliable source of the actual bay where the drop occurred
      // DO NOT override this with any stored value - this is what's causing projects to jump bays
      const exactBayId = bayId;
      console.log(`💯 Using EXACT bay ID from drop event parameter: ${exactBayId}`);
      // Log this prominent message for debugging
      console.log(`🚨 BAY ID VERIFICATION: Ensuring drop uses bay ${exactBayId} EXACTLY as provided by event`);
      
      // CRITICAL FIX: Use exactBayId instead of the normal bayId parameter
      const bay = bays.find(b => b.id === exactBayId);
      console.log(`Finding bay with ID ${exactBayId} (from exact parameter)`);
      
      if (!bay) {
        console.error(`Bay with ID ${exactBayId} not found in bays list:`, bays.map(b => b.id));
        toast({
          title: "Error",
          description: `Bay ID ${exactBayId} not found`,
          variant: "destructive"
        });
        return;
      }
      
      // Check if the bay has staff assigned
      if (!bay.staffCount || bay.staffCount <= 0) {
        toast({
          title: "Cannot assign to bay",
          description: "This bay has no staff assigned. Please add staff first.",
          variant: "destructive"
        });
        return;
      }
      
      // Get the date for this slot using our dedicated exact positioning module
      let slotDate: Date | null = null;
      let exactDateForStorage: string | null = null;
      
      // The number of days between slots in the display - constant for consistency
      const daysBetweenSlots = 1;
      
      // Import and use the exactPositioningHandler module for all bays
      import('@/lib/exactPositioningHandler').then(positioningModule => {
        // Define position parameters for the module
        const positioningProps = {
          targetElement,
          slotWidth,
          daysBetweenSlots,
          slots,
          dataDate,
          bayId: exactBayId,
          bayName: bay?.name || `Bay ${exactBayId}`
        };
        
        // Get the precise date position from our specialized module
        const result = positioningModule.calculateExactDatePosition(positioningProps);
        
        if (result) {
          slotDate = result.date;
          exactDateForStorage = result.exactDateStr;
          
          // Log the result based on the bay (with consistent prefixes)
          const bayPrefix = `BAY ${exactBayId}`;
          console.log(`${bayPrefix} EXACT POSITIONING: Using date from dedicated module (${result.source}):`, result.exactDateStr);
          
          // Now that we have our date, we can continue processing the drop
          continueDropProcessing();
        } else {
          // Handle error case when the module fails to determine a date
          console.error(`BAY ${exactBayId} POSITIONING ERROR: Failed to determine date position`);
          
          // Fall back to our legacy method in case of module failure
          useLegacyPositioning();
        }
      }).catch(error => {
        // If the module import fails, log the error and fallback to legacy positioning
        console.error('Failed to import exactPositioningHandler module:', error);
        useLegacyPositioning();
      });
      
      // Legacy positioning method as a fallback
      const useLegacyPositioning = () => {
        console.log('FALLBACK: Using legacy positioning method');
        
        // Exact same order of checks as before, but refactored into a function
        const storedGlobalDate = (window as any).lastExactDate;
        const bodyDateAttribute = document.body.getAttribute('data-current-drag-date');
        
        if (storedGlobalDate) {
          slotDate = new Date(storedGlobalDate);
          exactDateForStorage = storedGlobalDate;
          console.log(`FALLBACK: Using global date variable: ${storedGlobalDate}`, slotDate);
        }
        else if (bodyDateAttribute) {
          slotDate = new Date(bodyDateAttribute);
          exactDateForStorage = bodyDateAttribute;
          console.log(`FALLBACK: Using body attribute: ${bodyDateAttribute}`, slotDate);
        }
        else if (targetElement.getAttribute('data-exact-date')) {
          const exactDateStr = targetElement.getAttribute('data-exact-date');
          slotDate = new Date(exactDateStr!);
          exactDateForStorage = exactDateStr;
          console.log('FALLBACK: Using data-exact-date attribute:', exactDateStr);
        }
        else if (dataDate) {
          slotDate = new Date(dataDate);
          exactDateForStorage = dataDate;
          console.log('FALLBACK: Using data-date attribute:', dataDate);
        }
        else {
          const dateElement = targetElement.closest('[data-date]') as HTMLElement;
          if (dateElement) {
            const dateStr = dateElement.getAttribute('data-date');
            if (dateStr) {
              slotDate = new Date(dateStr);
              exactDateForStorage = dateStr;
              console.log('FALLBACK: Using closest element data-date:', dateStr);
            }
          }
        }
        
        // Still check bay containers as a last resort
        if (!slotDate) {
          const bayContainers = document.querySelectorAll('.bay-container');
          Array.from(bayContainers).forEach(container => {
            if (!slotDate && container.getAttribute('data-last-dragover-date')) {
              const bayDateStr = container.getAttribute('data-last-dragover-date');
              slotDate = new Date(bayDateStr!);
              exactDateForStorage = bayDateStr;
              console.log('FALLBACK: Using bay container data-last-dragover-date:', bayDateStr);
            }
          });
        }
        
        // Final fallback to slot index
        if (!slotDate && slotIndex >= 0 && slotIndex < slots.length) {
          slotDate = new Date(slots[slotIndex]?.date);
          exactDateForStorage = format(slotDate, 'yyyy-MM-dd');
          console.log('FALLBACK: Using slot index date:', slotIndex, exactDateForStorage);
        }
        
        // Now continue with drop processing
        if (slotDate) {
          continueDropProcessing();
        } else {
          console.error('CRITICAL: Could not determine date position with any method');
          toast({
            title: "Error",
            description: "Could not determine position date",
            variant: "destructive"
          });
        }
      }
      
      // Continue with the drop processing once we have determined the date
      const continueDropProcessing = () => {
        // Only proceed if we have a valid date
        if (!slotDate) {
          console.error('Critical error: No slotDate available to continue drop processing');
          toast({
            title: "Error",
            description: "Could not determine position date",
            variant: "destructive"
          });
          return;
        }
        
        // CRITICAL: Store the EXACT slot date from the drop target before any modifications
        // This ensures we remember precisely which week cell was targeted
        if (slotDate) {
          // IMPORTANT: Keep track of the original target slot date before any phase calculations
          // Create a clone to avoid any reference issues
          const exactTargetStartDate = new Date(slotDate.getTime());
          console.log('Exact target start date (before any FAB calculations):', exactTargetStartDate);
          
          // Store this for later use - CRUCIAL for proper week positioning
          // We MUST create a new property as a string to ensure it's carried forward in drag events
          // First prioritize the exactDateForStorage, then format the date to avoid toISOString() errors
          
          // SAFE VERSION: Use string date from storage or manually format date with date-fns
          if (exactDateForStorage) {
            data.targetStartDate = exactDateForStorage;
          } else if (exactTargetStartDate instanceof Date) {
            try {
              // Safely format the date using date-fns
              data.targetStartDate = format(exactTargetStartDate, 'yyyy-MM-dd');
            } catch (err) {
              // Ultimate fallback
              console.error('Error formatting date:', err);
              data.targetStartDate = format(new Date(), 'yyyy-MM-dd');
            }
          } else {
            // Ultimate fallback
            data.targetStartDate = format(new Date(), 'yyyy-MM-dd');
          }
          
          // CRITICAL DEBUG: Add more verbose logging
          console.log('SAVED EXACT TARGET START DATE:', data.targetStartDate);
          console.log('Week of target start date:', format(exactTargetStartDate, 'w'));
        }
        
        // Final validation
        if (!slotDate) {
          toast({
            title: "Error",
            description: "Invalid date slot",
            variant: "destructive"
          });
          return;
        }
        
        // Find the project for this drop
        const project = projects.find(p => p.id === data.projectId);
        if (!project) {
          console.error(`Project with ID ${data.projectId} not found`);
          toast({
            title: "Error",
            description: `Project not found: ID ${data.projectId}`,
            variant: "destructive"
          });
          return;
        }
        
        // Look for any schedules already in this bay that might overlap
        // We'll use this for capacity planning
        const overlappingSchedules = schedulesByBay[exactBayId]?.filter(s => {
          const scheduleStartDate = new Date(s.startDate);
          const scheduleEndDate = new Date(s.endDate);
          return (
            s.projectId !== data.projectId && // Skip the current project if we're moving it
            isWithinInterval(slotDate, { start: scheduleStartDate, end: scheduleEndDate }) ||
            isWithinInterval(addDays(slotDate, 14), { start: scheduleStartDate, end: scheduleEndDate })
          );
        }) || [];
        
        // Base weekly capacity for a bay is derived from staff count and hours per person
        // Default to 40 hours per person per week if not specified
        const hoursPerPerson = bay.hoursPerPerson || 40;
        const baseWeeklyCapacity = (bay.staffCount || 0) * hoursPerPerson;
        
        // Track target row index - use the provided row if in range, otherwise default to 0
        const maxRowIndex = (bayRows[exactBayId]?.length || 4) - 1;
        const targetRowIndex = rowIndex > maxRowIndex ? 0 : rowIndex;
        
        if (!project.totalHours) {
          toast({
            title: "Missing Hours",
            description: "This project doesn't have total hours assigned. Please update the project first.",
            variant: "destructive"
          });
          return;
        }
        
        // Get the total hours as a number, ensuring it's valid
        const totalHours = parseFloat(project.totalHours as string);
        if (isNaN(totalHours) || totalHours <= 0) {
          toast({
            title: "Invalid Hours",
            description: "Project has invalid total hours. Please update the project with a positive number of hours.",
            variant: "destructive"
          });
          return;
        }
        
        // Calculate phases for visualization (FAB, Production, etc.)
        // We'll use this for better timeline visualization and auto-scheduling sub-phases
        const phases = calculateProjectPhases(project, bay);
        const { fabDays, prodDays, fabWeeks } = phases;
        
        // Let's determine how long this project will take based on the bay capacity
        // A bay's full capacity is divided among active projects
        
        // Use the bay's available staff per row and calculate remaining capacity
        const weeklyCapacity = baseWeeklyCapacity / (bayRows[exactBayId]?.length || 4);
        console.log(`Bay ${exactBayId} (${bay.name}) weekly capacity: ${weeklyCapacity} hours per row`);
        
        // Calculate capacity adjustment based on concurrent projects
        // We need to account for the fact that available capacity decreases with each project
        // but never goes below a certain threshold of staff availability
        let capacityAdjustment = 1.0; // Start at 100% capacity
        
        // Count number of schedules in this row for the current period
        const schedulesInRow = schedulesByBay[exactBayId]?.filter(s => s.rowIndex === targetRowIndex) || [];
        const schedulesInSameRow = schedulesInRow.length;
        
        // Apply capacity adjustments based on concurrent projects
        if (schedulesInSameRow >= 1) {
          // With one other project, we're at 80% capacity for this project
          capacityAdjustment = 0.8;
        }
        if (schedulesInSameRow >= 2) {
          // With two other projects, we're at 60% capacity
          capacityAdjustment = 0.6;
        }
        if (schedulesInSameRow >= 3) {
          // With three or more other projects, we're at 50% capacity
          capacityAdjustment = 0.5;
        }
        
        // The adjusted weekly capacity accounts for other projects
        const adjustedWeeklyCapacity = weeklyCapacity * capacityAdjustment;
        console.log(`Adjusted weekly capacity: ${adjustedWeeklyCapacity} hours per week (${capacityAdjustment * 100}% of ${weeklyCapacity})`);
        
        // Calculate the production hours for this project
        // This is based on the total hours minus fabrication (which is a fixed percentage)
        const fabHours = totalHours * 0.27; // 27% for fabrication
        const prodHours = totalHours - fabHours; // The rest is production
        console.log(`Project ${project.id} hours breakdown: ${totalHours} total, ${fabHours} fab, ${prodHours} production`);
        
        // Calculate how many production days we need based on the available capacity
        // We use full weekly capacity so that the timeline is accurate
        const fullWeeklyCapacity = adjustedWeeklyCapacity * 5; // 5 working days per week
        
        console.log(`Calculating production days: ${prodHours} hours at ${fullWeeklyCapacity} hours per week`);
        // Calculate the number of workdays needed for this project's production phase
        const workdaysPerWeek = 5; // Standard 5-day workweek
        const hoursPerDay = fullWeeklyCapacity / workdaysPerWeek;
        
        // Calculate days needed, but NEVER less than 1 day
        const calculatedProdDays = Math.max(1, Math.ceil(prodHours / hoursPerDay));
        console.log(`Production phase days needed: ${calculatedProdDays} days`);
        
        // Safety check - just log if the duration seems excessive
        if (calculatedProdDays > 365) { // Only log a warning if over a year, but don't cap it
          console.warn(`WARNING: Very long production phase calculated: ${calculatedProdDays} days. This is based on ${prodHours} production hours at ${fullWeeklyCapacity} hours per week capacity.`);
        }
        
        // Use the calculated duration based on hours and capacity
        // NO CAPPING - allow the proper calculation based on hours/capacity
        const prodDaysToUse = calculatedProdDays;
        
        // Calculate the FAB end date based on the slot date and phases
        // Use safe date calculations with fallbacks in case of null values
        const exactFabEndDate = slotDate ? addDays(slotDate, fabDays || 1) : new Date();
        
        // Now calculate the final end date by adding the calculated production days to the FAB end date
        let finalEndDate = addDays(exactFabEndDate, prodDaysToUse);
        
        // BUSINESS DAY VALIDATION: Ensure start date and end date are business days (not weekends or holidays)
        // For start date, find the next business day if not already one
        // First check for null values to avoid type errors
        const exactStartDate = slotDate ? new Date(slotDate) : new Date();
        const safeExactStartDate = exactStartDate instanceof Date ? exactStartDate : new Date();
        let adjustedStartDate = safeExactStartDate;
        
        try {
          const nextBusinessDay = adjustToNextBusinessDay(safeExactStartDate);
          if (nextBusinessDay instanceof Date) {
            adjustedStartDate = nextBusinessDay;
          }
        } catch (err) {
          console.error('Error adjusting to next business day:', err);
        }
        
        // For end date, find the previous business day if not already one
        // We use previous for end date to ensure the project ends on a business day (not weekend/holiday)
        const safeFinalEndDate = finalEndDate instanceof Date ? finalEndDate : addDays(new Date(), 30);
        let adjustedEndDate = safeFinalEndDate;
        
        try {
          const prevBusinessDay = adjustToPreviousBusinessDay(safeFinalEndDate);
          if (prevBusinessDay instanceof Date) {
            adjustedEndDate = prevBusinessDay;
          }
        } catch (err) {
          console.error('Error adjusting to previous business day:', err);
        }
        
        // Log any date adjustments to inform the user
        try {
          if (!isSameDay(adjustedStartDate, safeExactStartDate)) {
            console.log(`Start date adjusted from ${format(safeExactStartDate, 'yyyy-MM-dd')} to ${format(adjustedStartDate, 'yyyy-MM-dd')} (next business day)`);
            toast({
              title: "Date Adjusted",
              description: `Start date adjusted to ${format(adjustedStartDate, 'MMM d, yyyy')} (next business day)`,
              variant: "default"
            });
          }
          
          if (!isSameDay(adjustedEndDate, safeFinalEndDate)) {
            console.log(`End date adjusted from ${format(safeFinalEndDate, 'yyyy-MM-dd')} to ${format(adjustedEndDate, 'yyyy-MM-dd')} (previous business day)`);
            toast({
              title: "Date Adjusted",
              description: `End date adjusted to ${format(adjustedEndDate, 'MMM d, yyyy')} (previous business day)`,
              variant: "default"
            });
          }
        } catch (err) {
          console.error('Error during date comparison:', err);
        }
        
        // Ensure adjusted end date is after adjusted start date
        try {
          if (adjustedEndDate <= adjustedStartDate) {
            adjustedEndDate = addDays(adjustedStartDate, 1);
            
            // If the next day isn't a business day, find the next business day
            try {
              const nextDay = adjustToNextBusinessDay(adjustedEndDate);
              if (nextDay instanceof Date) {
                adjustedEndDate = nextDay;
              }
            } catch (err) {
              console.error('Error adjusting end date to next business day:', err);
            }
            
            // If we still have an issue, just add 3 days which should get us to next business day
            if (adjustedEndDate <= adjustedStartDate) {
              adjustedEndDate = addDays(adjustedStartDate, 3);
              try {
                const nextFurtherDay = adjustToNextBusinessDay(adjustedEndDate);
                if (nextFurtherDay instanceof Date) {
                  adjustedEndDate = nextFurtherDay;
                }
              } catch (err) {
                console.error('Error during further date adjustment:', err);
              }
            }
            
            toast({
              title: "Date Range Adjusted",
              description: "End date adjusted to ensure a valid project duration",
              variant: "destructive"
            });
          }
        } catch (err) {
          console.error('Error ensuring end date is after start date:', err);
        }
        
        // Use the adjusted dates for all subsequent operations
        const newExactStartDate = adjustedStartDate;
        finalEndDate = adjustedEndDate;
        
        // Store the formatted target date for API - CRUCIAL for preserving exact week position
        const formattedExactStartDate = newExactStartDate ? format(newExactStartDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
        
        // Safe date formatting for logging
        console.log('Calculated dates:', {
          originalStartDate: exactStartDate ? format(exactStartDate, 'yyyy-MM-dd') : 'Invalid Date',
          adjustedStartDate: newExactStartDate ? format(newExactStartDate, 'yyyy-MM-dd') : 'Invalid Date',
          fabEndDate: exactFabEndDate ? format(exactFabEndDate, 'yyyy-MM-dd') : 'Invalid Date',
          finalEndDate: finalEndDate ? format(finalEndDate, 'yyyy-MM-dd') : 'Invalid Date',
          fabDays,
          calculatedProdDays,
          businessDayAdjusted: exactStartDate && newExactStartDate ? !isSameDay(exactStartDate, newExactStartDate) : false
        });
        
        // For logging, use safe date formatting
        console.log('Attempting to drop project:', {
          projectId: data.projectId || data.id,
          bayId,
          slotDate: slotDate ? format(slotDate, 'yyyy-MM-dd') : 'Invalid Date',
          finalEndDate: finalEndDate ? format(finalEndDate, 'yyyy-MM-dd') : 'Invalid Date',
          totalHours: totalHours,
          baseWeeklyCapacity,
          prodDays,
          fabWeeks,
          overlappingProjects: overlappingSchedules.length,
          type: data.type
        });
        
        if (data.type === 'existing') {
          console.log('Moving existing schedule with data:', {
            id: data.id,
            projectId: data.projectId,
            bayId: bayId, // EMERGENCY FIX: Always use the actual bay where the user dropped (function param)
            startDate: slotDate ? format(slotDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
            endDate: finalEndDate ? format(finalEndDate, 'yyyy-MM-dd') : format(addDays(new Date(), 30), 'yyyy-MM-dd'),
            totalHours: data.totalHours !== null ? Number(data.totalHours) : 1000,
            row: targetRowIndex
          });
          
          // Update existing schedule
          const updatedSchedule: ManufacturingSchedule = {
            id: data.id as number,
            projectId: data.projectId,
            bayId, // CRITICAL: Use the exact bay ID from the drop event
            startDate: formattedExactStartDate, // Use the adjusted business day start date
            endDate: format(finalEndDate, 'yyyy-MM-dd'),
            totalHours: data.totalHours as number,
            rowIndex: targetRowIndex
          };
          
          try {
            onScheduleChange(updatedSchedule);
            
            // Clear the global exact date tracking
            clearExactDateInfo();
            
            // Update project phase dates
            bayScheduling.updateProjectPhaseDates(project, bay, {
              startDate: formattedExactStartDate,
              endDate: format(finalEndDate, 'yyyy-MM-dd')
            });
            
            toast({
              title: "Schedule Updated",
              description: `Project moved to bay ${bay.name} on ${format(newExactStartDate, 'MMM d, yyyy')}`,
            });
          } catch (error) {
            console.error('Failed to update schedule:', error);
            toast({
              title: "Error",
              description: `Failed to update schedule: ${(error as Error).message}`,
              variant: "destructive"
            });
          }
        } else {
          // Create new schedule
          const newSchedule = {
            projectId: data.projectId,
            bayId, // CRITICAL: Use the exact bay ID from the drop event
            startDate: formattedExactStartDate, // Use the adjusted business day start date
            endDate: format(finalEndDate, 'yyyy-MM-dd'),
            totalHours,
            rowIndex: targetRowIndex
          };
          
          console.log('Creating new schedule:', newSchedule);
          
          try {
            onScheduleCreate(newSchedule);
            
            // Clear the global exact date tracking
            clearExactDateInfo();
            
            // Update project phase dates
            bayScheduling.updateProjectPhaseDates(project, bay, {
              startDate: formattedExactStartDate,
              endDate: format(finalEndDate, 'yyyy-MM-dd')
            });
            
            toast({
              title: "Project Scheduled",
              description: `Project added to bay ${bay.name} on ${format(newExactStartDate, 'MMM d, yyyy')}`,
            });
          } catch (error) {
            console.error('Failed to create schedule:', error);
            toast({
              title: "Error",
              description: `Failed to schedule project: ${(error as Error).message}`,
              variant: "destructive"
            });
          }
        }
      };
    } catch (error) {
      console.error('Error in drop handler:', error);
      toast({
        title: "Error",
        description: `Drop failed: ${(error as Error).message}`,
        variant: "destructive"
      });
    }
  };
  
  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent, id: number, type: 'left' | 'right' | 'move', initialLeft: number, initialWidth: number, startDate: string, endDate: string) => {
    e.stopPropagation();
    const startX = e.clientX;
    
    // Store the resize info for use during mousemove
    resizeInfo.current = {
      id,
      type,
      startX,
      initialLeft,
      initialWidth,
      initialStart: new Date(startDate),
      initialEnd: new Date(endDate)
    };
    
    // Set resizing state
    setResizing(true);
    
    // Add a resize-active class to the body for styling
    document.body.classList.add('resize-active');
  };
  
  // Handle resize end
  const handleResizeEnd = () => {
    if (resizing && resizeInfo.current) {
      // Reset the resize info
      resizeInfo.current = null;
      setResizing(false);
      
      // Remove the resize-active class
      document.body.classList.remove('resize-active');
    }
  };
  
  // Handle resize move
  const handleResizeMove = (e: React.MouseEvent) => {
    if (resizing && resizeInfo.current && timelineRef.current) {
      e.preventDefault();
      
      const { id, type, startX, initialLeft, initialWidth, initialStart, initialEnd } = resizeInfo.current;
      
      // Calculate the movement delta
      const deltaX = e.clientX - startX;
      
      // Find the schedule being resized
      const schedule = schedules.find(s => s.id === id);
      if (!schedule) return;
      
      // Find the corresponding project
      const project = projects.find(p => p.id === schedule.projectId);
      if (!project) return;
      
      // Find the bay for this schedule
      const bay = bays.find(b => b.id === schedule.bayId);
      if (!bay) return;
      
      // Calculate the cell width for time calculations
      const timelineWidth = timelineRef.current.scrollWidth;
      const daysCount = days.length;
      const slotWidth = timelineWidth / daysCount;
      
      // Function to handle manual resize application
      const applyManualResize = (newStart: Date, newEnd: Date) => {
        // Format the dates for the API
        const formattedStart = format(newStart, 'yyyy-MM-dd');
        const formattedEnd = format(newEnd, 'yyyy-MM-dd');
        
        // Update the schedule
        const updatedSchedule: ManufacturingSchedule = {
          ...schedule,
          startDate: formattedStart,
          endDate: formattedEnd
        };
        
        // Call the onChange handler
        onScheduleChange(updatedSchedule);
        
        // Update project phase dates
        bayScheduling.updateProjectPhaseDates(project, bay, {
          startDate: formattedStart,
          endDate: formattedEnd
        });
        
        // Success message
        toast({
          title: "Schedule Updated",
          description: `Project duration updated`,
        });
      };
      
      // Depending on the resize type, update the schedule differently
      if (type === 'left') {
        // Resizing from the left changes the start date
        const newLeft = initialLeft + deltaX;
        const newWidth = initialWidth - deltaX;
        
        // Calculate the new start date based on pixelDelta / pixelsPerDay
        const daysOffset = Math.round(deltaX / slotWidth);
        const newStart = addDays(initialStart, daysOffset);
        
        // Ensure the new start date is not after the end date
        if (newStart < initialEnd) {
          applyManualResize(newStart, initialEnd);
        }
      } else if (type === 'right') {
        // Resizing from the right changes the end date
        const newWidth = initialWidth + deltaX;
        
        // Calculate the new end date
        const daysOffset = Math.round(deltaX / slotWidth);
        const newEnd = addDays(initialEnd, daysOffset);
        
        // Ensure the new end date is not before the start date
        if (newEnd > initialStart) {
          applyManualResize(initialStart, newEnd);
        }
      } else if (type === 'move') {
        // Moving changes both start and end dates
        const newLeft = initialLeft + deltaX;
        
        // Calculate the day offset
        const daysOffset = Math.round(deltaX / slotWidth);
        
        // Calculate new dates
        const newStart = addDays(initialStart, daysOffset);
        const newEnd = addDays(initialEnd, daysOffset);
        
        // Apply the move
        applyManualResize(newStart, newEnd);
      }
      
      // Reset the resize info after applying changes
      resizeInfo.current = null;
      setResizing(false);
      
      // Remove the resize-active class
      document.body.classList.remove('resize-active');
    }
  };
  
  // Handle schedule click to open details
  const handleScheduleClick = (e: React.MouseEvent, schedule: ManufacturingSchedule) => {
    e.stopPropagation();
    setSelectedSchedule(schedule);
  };
  
  // Helper to calculate position and width for a schedule
  const getScheduleStyle = useCallback((startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Find the indices of the start and end dates
    const startIndex = days.findIndex(day => isSameDay(day, start));
    const endIndex = days.findIndex(day => isSameDay(day, end));
    
    // If either date is not found, return default positioning
    if (startIndex === -1 || endIndex === -1) {
      return { left: 0, width: 100 };
    }
    
    // Calculate position and width
    const totalWidth = timelineRef.current?.scrollWidth || days.length * 100;
    const cellWidth = totalWidth / days.length;
    
    const left = startIndex * cellWidth;
    const width = (endIndex - startIndex + 1) * cellWidth;
    
    return { left, width };
  }, [days]);
  
  // Width of each slot in pixels
  const slotWidth = 100; // Default value
  
  // Render the schedule for a bay
  const renderBaySchedule = (bay: ExtendedManufacturingBay, schedules: ManufacturingSchedule[]) => {
    const rowIndices = bayRows[bay.id] || [0, 1, 2, 3]; // Default to 4 rows
    
    // Log in which rows the schedules are positioned for debugging
    schedules.forEach(schedule => {
      const project = getProject(schedule.projectId);
      if (project) {
        console.log(`Schedule ${schedule.id} positioned in row ${schedule.rowIndex} (displays in visual row ${schedule.rowIndex}) (using database row)`);
      }
    });
    
    // We make a special case for bays with ID 7 & 8 (which should have 20 rows)
    // Or any bay specifically marked as multi-row
    if (bay.isMultiRowBay || bay.bayNumber === 7 || bay.bayNumber === 8) {
      return (
        <MultiRowBayContent 
          bay={bay}
          schedules={schedules}
          projects={projects}
          slots={slots}
          rowIndices={rowIndices}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onScheduleClick={handleScheduleClick}
          onResizeStart={handleResizeStart}
          onDelete={setConfirmDelete}
          calculateProjectPhases={calculateProjectPhases}
          getScheduleStyle={getScheduleStyle}
          bayScheduling={bayScheduling}
        />
      );
    }
    
    // For normal bays, render a standard row-based view
    return (
      <div className="bay-schedule">
        {rowIndices.map(rowIndex => (
          <div key={rowIndex} className={styles.rowContainer}>
            <div className={styles.rowHeader}>
              <div className="flex-1 text-sm">Row {rowIndex + 1}</div>
              
              {/* Menu for row operations */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => setConfirmRowDelete({
                      bayId: bay.id,
                      rowIndex,
                      rowNumber: rowIndex + 1,
                      bayName: bay.name
                    })}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Delete Row</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <div className="flex">
              {slots.map((slot, slotIndex) => {
                const slotIsWeekend = slot.isWeekend;
                const isToday = isSameDay(slot.date, today);
                
                return (
                  <div 
                    key={slotIndex}
                    className={`${styles.timelineCell} ${slotIsWeekend ? styles.weekendCell : ''} ${isToday ? styles.todayCell : ''} relative`}
                    data-date={format(slot.date, 'yyyy-MM-dd')}
                    data-slot-index={slotIndex}
                    data-bay-id={bay.id}
                    data-row-index={rowIndex}
                    onDragOver={(e) => handleDragOver(e, slotIndex, rowIndex, bay.id)}
                    onDrop={(e) => handleDrop(e, slotIndex, rowIndex, bay.id)}
                  >
                    {/* Slot for exact positioning - very thin element for precise targeting */}
                    <div 
                      className={styles.timelineCellSlot}
                      style={{ width: `${100 / days.length}%` }}
                      data-date={format(slot.date, 'yyyy-MM-dd')}
                    />
                  </div>
                );
              })}
            </div>
            
            {/* Render schedules for this row */}
            {schedules
              .filter(schedule => schedule.rowIndex === rowIndex || schedule.row === rowIndex)
              .map(schedule => {
                const project = getProject(schedule.projectId);
                if (!project) return null;
                
                // Get the schedule positioning
                const { left, width } = getScheduleStyle(schedule.startDate, schedule.endDate);
                
                // Calculate the phase positions
                // We use project phases to show different parts of the manufacturing process
                const phasesData = calculateProjectPhases(project, bay, {
                  startDate: schedule.startDate,
                  endDate: schedule.endDate
                });
                
                // Extract phase start/end dates for display
                const phaseDates = bayScheduling.getProjectPhaseDates(project, {
                  scheduleStart: schedule.startDate,
                  scheduleEnd: schedule.endDate
                });
                
                // Log phase data for debugging
                console.log(`Project ${project.projectNumber} phase dates:`, phaseDates);
                console.log(`Project ${project.projectNumber} phase calculations:`, phasesData);
                
                // If we have all phases, calculate their widths relative to the overall bar
                const { phases } = phasesData;
                
                // Generate a bright color for this project based on its ID for consistency
                const hue = (project.id * 40) % 360;
                const color = `hsl(${hue}, 70%, 50%)`;
                
                return (
                  <div
                    key={schedule.id}
                    className={`${styles.scheduledItem} flex flex-col overflow-hidden rounded-sm z-10`}
                    style={{
                      left: left,
                      width: width,
                      top: '4px', // Adjust for row header height
                      backgroundColor: color,
                      height: 'calc(100% - 8px)', // Adjust for padding
                      cursor: 'move'
                    }}
                    draggable
                    onDragStart={(e) => handleScheduleDragStart(e, schedule)}
                    onClick={(e) => handleScheduleClick(e, schedule)}
                  >
                    <div className={`${styles.scheduledItemContent} px-1 z-20 flex items-center space-x-1 h-4 text-[10px]`}>
                      <span>{project.projectNumber}</span>
                      <span className="truncate flex-1">{project.name}</span>
                    </div>
                    
                    {/* Render the phases as sub-bars */}
                    {phases.fab && (
                      <div 
                        className={`${styles.phase} ${styles.phaseFab}`} 
                        style={{ 
                          width: phases.fab.width,
                          left: 0,
                          borderTopLeftRadius: '2px',
                          borderBottomLeftRadius: '2px',
                          height: 'calc(100% - 16px)',
                          top: '16px'
                        }}
                      >
                        <span className={`${styles.phaseLabel} hidden`}>FAB</span>
                      </div>
                    )}
                    
                    {phases.paint && (
                      <div 
                        className={`${styles.phase} ${styles.phasePaint}`} 
                        style={{ 
                          width: phases.paint.width,
                          left: phases.fab.width,
                          height: 'calc(100% - 16px)',
                          top: '16px'
                        }}
                      >
                        <span className={`${styles.phaseLabel} hidden`}>PAINT</span>
                      </div>
                    )}
                    
                    {phases.production && (
                      <div 
                        className={`${styles.phase} ${styles.phaseProduction}`} 
                        style={{ 
                          width: phases.production.width,
                          left: phases.fab.width + phases.paint.width,
                          height: 'calc(100% - 16px)',
                          top: '16px'
                        }}
                      >
                        <span className={`${styles.phaseLabel} hidden`}>PROD</span>
                      </div>
                    )}
                    
                    {phases.it && (
                      <div 
                        className={`${styles.phase} ${styles.phaseIT}`} 
                        style={{ 
                          width: phases.it.width,
                          left: phases.fab.width + phases.paint.width + phases.production.width,
                          height: 'calc(100% - 16px)',
                          top: '16px'
                        }}
                      >
                        <span className={`${styles.phaseLabel} hidden`}>IT</span>
                      </div>
                    )}
                    
                    {phases.ntc && (
                      <div 
                        className={`${styles.phase} ${styles.phaseNTC}`} 
                        style={{ 
                          width: phases.ntc.width,
                          left: phases.fab.width + phases.paint.width + phases.production.width + phases.it.width,
                          height: 'calc(100% - 16px)',
                          top: '16px'
                        }}
                      >
                        <span className={`${styles.phaseLabel} hidden`}>NTC</span>
                      </div>
                    )}
                    
                    {phases.qc && (
                      <div 
                        className={`${styles.phase} ${styles.phaseQC}`} 
                        style={{ 
                          width: phases.qc.width,
                          left: phases.fab.width + phases.paint.width + phases.production.width + phases.it.width + phases.ntc.width,
                          borderTopRightRadius: '2px',
                          borderBottomRightRadius: '2px',
                          height: 'calc(100% - 16px)',
                          top: '16px'
                        }}
                      >
                        <span className={`${styles.phaseLabel} hidden`}>QC</span>
                      </div>
                    )}
                    
                    {/* Resize handles */}
                    <div
                      className="absolute left-0 top-0 w-2 h-full cursor-w-resize z-30"
                      onMouseDown={(e) => handleResizeStart(e, schedule.id, 'left', left, width, schedule.startDate, schedule.endDate)}
                    />
                    <div
                      className="absolute right-0 top-0 w-2 h-full cursor-e-resize z-30"
                      onMouseDown={(e) => handleResizeStart(e, schedule.id, 'right', left, width, schedule.startDate, schedule.endDate)}
                    />
                    <div
                      className="absolute left-2 right-2 top-0 h-4 cursor-move z-20"
                      onMouseDown={(e) => handleResizeStart(e, schedule.id, 'move', left, width, schedule.startDate, schedule.endDate)}
                    />
                  </div>
                );
              })}
          </div>
        ))}
      </div>
    );
  };
  
  // Handle mouse events for resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (resizing && resizeInfo.current) {
        e.preventDefault();
        
        const { id, type, startX, initialLeft, initialWidth, initialStart, initialEnd } = resizeInfo.current;
        
        // Calculate the movement delta
        const deltaX = e.clientX - startX;
        
        // Find the schedule being resized
        const schedule = schedules.find(s => s.id === id);
        if (!schedule) return;
        
        // Find the corresponding project
        const project = projects.find(p => p.id === schedule.projectId);
        if (!project) return;
        
        // Find the bay for this schedule
        const bay = bays.find(b => b.id === schedule.bayId);
        if (!bay) return;
        
        // Calculate the cell width for time calculations
        const timelineWidth = timelineRef.current?.scrollWidth || days.length * 100;
        const daysCount = days.length;
        const slotWidth = timelineWidth / daysCount;
        
        // Function to apply changes and update the schedule
        const applyChanges = (newStart: Date, newEnd: Date) => {
          // Format the dates for the API
          const formattedStart = format(newStart, 'yyyy-MM-dd');
          const formattedEnd = format(newEnd, 'yyyy-MM-dd');
          
          // Update the schedule
          const updatedSchedule: ManufacturingSchedule = {
            ...schedule,
            startDate: formattedStart,
            endDate: formattedEnd
          };
          
          // Call the onChange handler
          onScheduleChange(updatedSchedule);
          
          // Update project phase dates
          bayScheduling.updateProjectPhaseDates(project, bay, {
            startDate: formattedStart,
            endDate: formattedEnd
          });
          
          // Success message
          toast({
            title: "Schedule Updated",
            description: `Project duration updated`,
          });
        };
        
        // Depending on the resize type, calculate the changes
        if (type === 'left') {
          // Resizing from the left changes the start date
          // Calculate the new start date based on delta / cellWidth = days
          const daysOffset = Math.round(deltaX / slotWidth);
          const newStart = addDays(initialStart, daysOffset);
          
          // Ensure the new start date is not after the end date
          if (newStart < initialEnd) {
            applyChanges(newStart, initialEnd);
          }
        } else if (type === 'right') {
          // Resizing from the right changes the end date
          const daysOffset = Math.round(deltaX / slotWidth);
          const newEnd = addDays(initialEnd, daysOffset);
          
          // Ensure the new end date is not before the start date
          if (newEnd > initialStart) {
            applyChanges(initialStart, newEnd);
          }
        } else if (type === 'move') {
          // Moving changes both start and end dates
          const daysOffset = Math.round(deltaX / slotWidth);
          const newStart = addDays(initialStart, daysOffset);
          const newEnd = addDays(initialEnd, daysOffset);
          
          applyChanges(newStart, newEnd);
        }
        
        // Reset the resize info
        resizeInfo.current = null;
        setResizing(false);
      }
    };
    
    const handleMouseUp = () => {
      if (resizing) {
        setResizing(false);
        resizeInfo.current = null;
        document.body.classList.remove('resize-active');
      }
    };
    
    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // Cleanup
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing, schedules, onScheduleChange, projects, bays, days.length, bayScheduling]);
  
  // Reset global drag flag on unmount
  useEffect(() => {
    return () => {
      dragInProgress = false;
      document.body.classList.remove('dragging-active');
      clearExactDateInfo();
    };
  }, []);
  
  // Handle month navigation
  const handlePrevMonth = () => {
    const newStartDate = subDays(startDate, 30);
    const newEndDate = subDays(endDate, 30);
    // TODO: Add support for navigating months via props callback
  };
  
  const handleNextMonth = () => {
    const newStartDate = addDays(startDate, 30);
    const newEndDate = addDays(endDate, 30);
    // TODO: Add support for navigating months via props callback
  };
  
  // Get available projects (those without a schedule)
  useEffect(() => {
    // Get IDs of all scheduled projects
    const scheduledIds = schedules.map(s => s.projectId);
    
    // Filter out projects that are already scheduled
    const available = projects.filter(p => 
      !scheduledIds.includes(p.id) && 
      p.status !== 'completed' && 
      p.status !== 'cancelled'
    );
    
    setAvailableProjects(available);
  }, [schedules, projects]);
  
  // Build the timeline header
  const timelineHeaders = useMemo(() => {
    if (viewMode === 'month') {
      // Group days into weeks
      const weeks: { startDate: Date; days: Date[] }[] = [];
      let currentWeek: Date[] = [];
      let weekStartDate = new Date(days[0]);
      
      days.forEach((day, i) => {
        if (i === 0 || format(day, 'E') === 'Mon') {
          if (currentWeek.length > 0) {
            weeks.push({ startDate: weekStartDate, days: [...currentWeek] });
            currentWeek = [];
            weekStartDate = new Date(day);
          }
        }
        currentWeek.push(day);
      });
      
      // Add the final week
      if (currentWeek.length > 0) {
        weeks.push({ startDate: weekStartDate, days: [...currentWeek] });
      }
      
      return (
        <>
          {/* Month headers */}
          <div className="flex">
            {Array.from(new Set(days.map(day => format(day, 'MMMM yyyy')))).map((month, i, arr) => {
              const monthDays = days.filter(day => format(day, 'MMMM yyyy') === month);
              const width = (monthDays.length / days.length) * 100;
              
              return (
                <div 
                  key={month} 
                  className={`px-2 py-1 text-sm font-medium text-center border-r border-border ${i === arr.length - 1 ? '' : 'border-r border-border'}`}
                  style={{ width: `${width}%` }}
                >
                  {month}
                </div>
              );
            })}
          </div>
          
          {/* Week headers */}
          <div className="flex">
            {weeks.map((week, i) => {
              const width = (week.days.length / days.length) * 100;
              const weekNumber = format(week.startDate, 'w');
              
              return (
                <div 
                  key={i} 
                  className="px-2 py-1 text-xs font-medium text-center border-r border-border"
                  style={{ width: `${width}%` }}
                >
                  Week {weekNumber}
                </div>
              );
            })}
          </div>
          
          {/* Day headers */}
          <div className="flex">
            {days.map((day, i) => {
              const isDayWeekend = isWeekend(day);
              const isToday = isSameDay(day, today);
              
              return (
                <div 
                  key={i} 
                  className={`px-2 py-1 text-xs text-center ${isDayWeekend ? 'bg-muted/50' : ''} ${isToday ? 'bg-primary/10 font-medium' : ''} border-r border-border`}
                  style={{ width: `${100 / days.length}%`, minWidth: '20px' }}
                >
                  {format(day, 'd')}
                </div>
              );
            })}
          </div>
        </>
      );
    } else {
      // Week view - simpler header with just days
      return (
        <div className="flex">
          {days.map((day, i) => {
            const isDayWeekend = isWeekend(day);
            const isToday = isSameDay(day, today);
            
            return (
              <div 
                key={i} 
                className={`px-2 py-2 text-xs ${isDayWeekend ? 'bg-muted/50' : ''} ${isToday ? 'bg-primary/10 font-medium' : ''} border-r border-border text-center`}
                style={{ width: `${100 / days.length}%`, minWidth: '20px' }}
              >
                <div className="text-xs font-medium">{format(day, 'EEE')}</div>
                <div className={`text-sm ${isToday ? 'font-medium' : ''}`}>{format(day, 'd')}</div>
              </div>
            );
          })}
        </div>
      );
    }
  }, [days, viewMode, today]);
  
  // Create today indicator element
  const todayIndicator = useMemo(() => {
    // Find the number of days since the start of the timeline
    const diffInDays = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // If today is not in the visible range, don't show the indicator
    if (diffInDays < 0 || diffInDays >= days.length) return null;
    
    // Calculate position based on the current view
    const position = (diffInDays / days.length) * 100;
    
    // For showing the date with the indicator
    const todayText = format(today, 'MMM d');
    
    console.log(`Today indicator (${viewMode} view): ${diffInDays} weeks from start = ${position * 100}px`);
    
    return (
      <div 
        className="absolute top-0 bottom-0 w-px bg-red-500 z-20 pointer-events-none"
        style={{ left: `${position}%` }}
      >
        <div className="px-1 py-0.5 text-xs text-white bg-red-500 rounded-sm whitespace-nowrap">
          Today
        </div>
      </div>
    );
  }, [startDate, days.length, today, viewMode]);
  
  // Render the component
  return (
    <div className={styles.container} onMouseMove={handleResizeMove} onMouseUp={handleResizeEnd}>
      {/* Timeline controls */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <Button variant="outline" size="sm" onClick={handleNextMonth}>
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
          
          {/* View mode toggle */}
          <div className="ml-4 flex items-center space-x-2">
            <Button 
              variant={currentView === 'month' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setCurrentView('month')}
            >
              Month
            </Button>
            <Button 
              variant={currentView === 'week' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setCurrentView('week')}
            >
              Week
            </Button>
          </div>
        </div>
        
        <div className="flex space-x-2">
          {/* Bay management */}
          <Button variant="outline" size="sm" onClick={handleAddBay}>
            <Plus className="h-4 w-4 mr-1" />
            Add Bay
          </Button>
        </div>
      </div>
      
      {/* Timeline visualization */}
      <div className={styles.timelineContainer} ref={timelineContainerRef}>
        <div ref={timelineRef}>
          {/* Timeline header */}
          <div className={styles.timelineHeader}>
            {timelineHeaders}
          </div>
          
          {/* Today indicator */}
          {todayIndicator}
          
          {/* Bays and their schedules */}
          {bays.map((bay) => {
            const baySchedules = schedulesByBay[bay.id] || [];
            
            return (
              <div key={bay.id} className="bay-container" data-bay-id={bay.id}>
                {/* Bay header */}
                <div className={styles.bayHeader}>
                  <div className="flex-1">
                    <h3 className={styles.bayName}>{bay.name}</h3>
                    <div className="text-xs text-muted-foreground flex items-center space-x-2">
                      <span className="flex items-center">
                        <Users className="h-3 w-3 mr-1" />
                        {bay.staffCount || 0} staff
                      </span>
                      <span className="flex items-center">
                        <AlarmClock className="h-3 w-3 mr-1" />
                        {bay.hoursPerPerson || 40} hrs/week
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    {/* Add row button */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 mr-1"
                            onClick={() => handleAddRow(bay.id)}
                          >
                            <PlusCircle className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Add Row</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    {/* Edit bay button */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 mr-1"
                            onClick={() => setEditingBay(bay)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Edit Bay</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    {/* Bay operations menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleDeleteBay(bay.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Delete Bay</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                
                {/* Bay schedule rows */}
                {renderBaySchedule(bay, baySchedules)}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Available projects sidebar */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-2">Available Projects</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {availableProjects.map(project => (
            <div
              key={project.id}
              className="p-2 bg-card border border-border rounded-md text-sm cursor-move hover:bg-accent transition-colors"
              draggable
              onDragStart={(e) => handleProjectDragStart(e, project)}
            >
              <div className="font-medium">{project.projectNumber}</div>
              <div className="truncate">{project.name}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {formatHours(project.totalHours as number)} hrs
              </div>
            </div>
          ))}
          
          {availableProjects.length === 0 && (
            <div className="p-2 bg-muted/30 border border-border rounded-md text-sm text-muted-foreground">
              No unscheduled projects available.
            </div>
          )}
        </div>
      </div>
      
      {/* Schedule detail dialog */}
      {selectedSchedule && (
        <Dialog open={!!selectedSchedule} onOpenChange={() => setSelectedSchedule(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule Details</DialogTitle>
              <DialogDescription>
                View and manage project schedule details.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              {(() => {
                const project = projects.find(p => p.id === selectedSchedule.projectId);
                if (!project) return <p>Project not found</p>;
                
                const bay = bays.find(b => b.id === selectedSchedule.bayId);
                if (!bay) return <p>Bay not found</p>;
                
                return (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Project</Label>
                      <p className="text-lg font-medium">{project.projectNumber} - {project.name}</p>
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Bay</Label>
                      <p>{bay.name}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Start Date</Label>
                        <p>{format(new Date(selectedSchedule.startDate), 'MMM d, yyyy')}</p>
                      </div>
                      
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">End Date</Label>
                        <p>{format(new Date(selectedSchedule.endDate), 'MMM d, yyyy')}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Total Hours</Label>
                        <p>{formatHours(selectedSchedule.totalHours)} hrs</p>
                      </div>
                      
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Row</Label>
                        <p>Row {(selectedSchedule.rowIndex || 0) + 1}</p>
                      </div>
                    </div>
                    
                    {/* Project phases if available */}
                    <div className="space-y-1 pt-2">
                      <Label className="text-xs text-muted-foreground">Project Phases</Label>
                      
                      <div className="space-y-2 mt-2">
                        {/* Phase dates information */}
                        {(() => {
                          const phaseDates = bayScheduling.getProjectPhaseDates(project, {
                            scheduleStart: selectedSchedule.startDate,
                            scheduleEnd: selectedSchedule.endDate
                          });
                          
                          return (
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                              <div className="space-y-1">
                                <span className="text-xs text-muted-foreground">Schedule</span>
                                <p>{format(new Date(phaseDates.schedule.start), 'MMM d, yyyy')} - {format(new Date(phaseDates.schedule.end), 'MMM d, yyyy')}</p>
                              </div>
                              
                              <div className="space-y-1">
                                <span className="text-xs text-muted-foreground">Ship Date</span>
                                <p>{phaseDates.shipDate ? format(new Date(phaseDates.shipDate), 'MMM d, yyyy') : 'Not set'}</p>
                              </div>
                              
                              <div className="space-y-1">
                                <span className="text-xs text-muted-foreground">Fabrication Start</span>
                                <p>{phaseDates.fabStart ? format(new Date(phaseDates.fabStart), 'MMM d, yyyy') : 'N/A'}</p>
                              </div>
                              
                              <div className="space-y-1">
                                <span className="text-xs text-muted-foreground">Paint Start</span>
                                <p>{phaseDates.paintStart ? format(new Date(phaseDates.paintStart), 'MMM d, yyyy') : 'N/A'}</p>
                              </div>
                              
                              <div className="space-y-1">
                                <span className="text-xs text-muted-foreground">Assembly Start</span>
                                <p>{phaseDates.assemblyStart ? format(new Date(phaseDates.assemblyStart), 'MMM d, yyyy') : 'N/A'}</p>
                              </div>
                              
                              <div className="space-y-1">
                                <span className="text-xs text-muted-foreground">NTC Start</span>
                                <p>{phaseDates.ntcStart ? format(new Date(phaseDates.ntcStart), 'MMM d, yyyy') : 'N/A'}</p>
                              </div>
                              
                              <div className="space-y-1">
                                <span className="text-xs text-muted-foreground">QC Start</span>
                                <p>{phaseDates.qcStart ? format(new Date(phaseDates.qcStart), 'MMM d, yyyy') : 'N/A'}</p>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
            
            <DialogFooter>
              <Button
                variant="destructive"
                onClick={() => {
                  setConfirmDelete(selectedSchedule);
                  setSelectedSchedule(null);
                }}
              >
                Delete Schedule
              </Button>
              
              <Button
                variant="outline"
                asChild
              >
                <a 
                  href={`/project/${selectedSchedule.projectId}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  View Project
                </a>
              </Button>
              
              <DialogClose asChild>
                <Button>Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Delete confirmation dialog */}
      {confirmDelete && (
        <AlertDialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Schedule</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove this project from the scheduling?
                This will not delete the project itself, only its schedule assignment.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => {
                  onScheduleDelete(confirmDelete.id);
                  setConfirmDelete(null);
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      
      {/* Row deletion confirmation dialog */}
      {confirmRowDelete && (
        <AlertDialog open={!!confirmRowDelete} onOpenChange={() => setConfirmRowDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Row {confirmRowDelete.rowNumber}</AlertDialogTitle>
              <AlertDialogDescription>
                <p>Are you sure you want to delete row {confirmRowDelete.rowNumber} from {confirmRowDelete.bayName}?</p>
                
                {/* Show projects that will be affected */}
                {(() => {
                  const affectedSchedules = schedules.filter(
                    s => s.bayId === confirmRowDelete.bayId && s.rowIndex === confirmRowDelete.rowIndex
                  );
                  
                  if (affectedSchedules.length > 0) {
                    return (
                      <div className="mt-2">
                        <p className="font-semibold text-destructive">Warning: {affectedSchedules.length} projects will be unscheduled:</p>
                        <ul className="mt-1 space-y-1 list-disc list-inside">
                          {affectedSchedules.map(schedule => {
                            const project = projects.find(p => p.id === schedule.projectId);
                            return (
                              <li key={project.id}>
                                {project.projectNumber} - {project.projectName}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  } else {
                    return (
                      <p className="mt-2 text-muted-foreground">No projects are currently scheduled in this row.</p>
                    );
                  }
                })()}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => handleDeleteRow(confirmRowDelete.bayId, confirmRowDelete.rowIndex)}
              >
                Delete Row
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      
      {/* Team Edit Dialog */}
      {editingBay && (
        <EditBayDialog
          bay={editingBay}
          isOpen={!!editingBay}
          onClose={() => setEditingBay(null)}
          onSave={handleSaveBayEdit}
        />
      )}
    </div>
  );
};

export default ResizableBaySchedule;