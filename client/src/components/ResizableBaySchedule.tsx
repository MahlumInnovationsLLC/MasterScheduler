import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import MultiRowBayContent from './MultiRowBayContent';
import { CollapsibleSidebar } from './CollapsibleSidebar';
import { 
  format, 
  addDays, 
  differenceInDays, 
  differenceInMonths, 
  isSameDay, 
  addWeeks, 
  addMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek,
  getDaysInMonth
} from 'date-fns';
import { updatePhaseWidthsWithExactFit, calculateExactFitPhaseWidths, applyPhaseWidthsToDom } from './ExactFitPhaseWidths';
import { isBusinessDay, adjustToNextBusinessDay, adjustToPreviousBusinessDay } from '@shared/utils/date-utils';
import { TeamManagementDialog } from './TeamManagementDialog';
import { 
  PlusCircle, 
  GripVertical, 
  Info, 
  X, 
  ChevronRight, 
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  PencilIcon, 
  PlusIcon, 
  MinusIcon,
  Users, 
  UserPlus,
  Zap, 
  Wrench, // Replacing Tool with Wrench
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Truck
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from '@/components/ui/scroll-area';
import { useApiRequest } from '@/lib/queryClient';

interface ManufacturingBay {
  id: number;
  name: string;
  bayNumber: number;
  status: 'active' | 'inactive' | 'maintenance';
  description: string | null;
  location: string | null;
  team: string | null;
  capacityTonn: number | null;
  maxWidth: number | null;
  maxHeight: number | null;
  maxLength: number | null;
  teamId: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  // Team capacity management properties
  assemblyStaffCount?: number | null;
  electricalStaffCount?: number | null;
  hoursPerPersonPerWeek?: number | null;
}

interface Project {
  id: number;
  name: string;
  projectNumber: string;
  status: string;
  description: string | null;
  team: string | null;
  createdAt: Date | null;
  startDate: Date | null;
  shipDate: Date | null;
  // And other project fields
}

interface ManufacturingSchedule {
  id: number;
  projectId: number;
  bayId: number;
  startDate: Date;
  endDate: Date;
  totalHours: number;
  row?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ResizableBayScheduleProps {
  schedules: ManufacturingSchedule[];
  projects: Project[];
  bays: ManufacturingBay[];
  onScheduleChange: (scheduleId: number, newBayId: number, newStartDate: string, newEndDate: string, totalHours?: number, rowIndex?: number) => Promise<any>;
  onScheduleCreate: (projectId: number, bayId: number, startDate: string, endDate: string, totalHours?: number, rowIndex?: number) => Promise<any>;
  onScheduleDelete?: (scheduleId: number) => Promise<any>;
  onBayCreate?: (bay: Partial<ManufacturingBay>) => Promise<any>;
  onBayUpdate?: (id: number, bay: Partial<ManufacturingBay>) => Promise<any>;
  onBayDelete?: (id: number) => Promise<any>;
  dateRange: { start: Date, end: Date };
  viewMode: 'day' | 'week' | 'month' | 'quarter';
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
  width: number; // Width based on time period
  left: number; // Left position (start)
  color: string;
  // For multi-row layout within a bay
  row?: number; // 0-3 for 4 rows per bay
  
  // Department phase percentages
  fabPercentage: number; // Default 27%
  paintPercentage: number; // Default 7%
  productionPercentage: number; // Default 60%
  itPercentage: number; // Default 7%
  ntcPercentage: number; // Default 7% 
  qcPercentage: number; // Default 7%
  
  // Normalization factor for phase width calculations
  normalizeFactor?: number;
  
  // Width calculations for phases
  fabWidth?: number; // Width of FAB phase on visualization
  paintWidth?: number; // Width of PAINT phase
  productionWidth?: number; // Width of PRODUCTION phase
  itWidth?: number; // Width of IT phase 
  ntcWidth?: number; // Width of NTC phase
  qcWidth?: number; // Width of QC phase
  
  // Legacy field
  fabWeeks: number; // Number of weeks for FAB phase
}

type TimeSlot = {
  date: Date;
  formattedStartDate?: string;
  formattedEndDate?: string;
  isStartOfMonth: boolean;
  isStartOfWeek: boolean;
  isBusinessDay: boolean;
  monthName?: string;
  weekNumber?: number;
};

const BAY_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-purple-500',
  'bg-indigo-500',
  'bg-pink-500',
  'bg-orange-500',
  'bg-teal-500',
  'bg-cyan-500',
  'bg-lime-500',
  'bg-emerald-500',
  'bg-sky-500',
  'bg-red-500',
];

const PROJECT_COLORS = [
  'rgb(59, 130, 246)', // blue-500
  'rgb(16, 185, 129)', // green-500
  'rgb(234, 179, 8)',  // yellow-500
  'rgb(168, 85, 247)', // purple-500
  'rgb(99, 102, 241)', // indigo-500
  'rgb(236, 72, 153)', // pink-500
  'rgb(249, 115, 22)', // orange-500
  'rgb(20, 184, 166)', // teal-500
  'rgb(6, 182, 212)',  // cyan-500
  'rgb(132, 204, 22)', // lime-500
  'rgb(16, 185, 129)', // emerald-500
  'rgb(14, 165, 233)', // sky-500
  'rgb(239, 68, 68)',  // red-500
];

// Multi-bay teams now have a single row per bay (simplified layout)
// This makes bays work like horizontal tracks with NO multi-row complexity
const getBayRowCount = (bayId: number, bayName: string) => {
  console.log(`Single row configuration for bay ${bayId} (${bayName}) - new team-based layout`);
  
  // NEW SIMPLIFIED MODEL:
  // - Each bay has exactly ONE row
  // - Team-based organization now groups 2 bays = 1 team
  // - Simplified row calculation guarantees pixel-perfect placement
  return 1; // Always return 1 row for the simplified single-row layout
};

// ALWAYS GENERATE TIME SLOTS THROUGH 2030 - This ensures all grid cells show properly
const generateTimeSlots = (dateRange: { start: Date, end: Date }, viewMode: 'day' | 'week' | 'month' | 'quarter') => {
  const slots: TimeSlot[] = [];
  // Start from dateRange.start
  let currentDate = new Date(dateRange.start);
  
  // CRITICAL FIX: Force end date to be Dec 31, 2030 regardless of what date range is passed in
  const forcedEndDate = new Date(2030, 11, 31); // December 31, 2030
  
  console.log(`⏱️ Generating time slots from ${format(currentDate, 'yyyy-MM-dd')} to ${format(forcedEndDate, 'yyyy-MM-dd')}`);
  
  // Loop until we reach the forced 2030 end date
  while (currentDate <= forcedEndDate) {
    const isStartOfMonth = currentDate.getDate() === 1;
    const isStartOfWeek = currentDate.getDay() === 1; // Monday as start of week
    const isCurrentDateBusinessDay = isBusinessDay(currentDate);
    
    slots.push({
      date: new Date(currentDate),
      isStartOfMonth,
      isStartOfWeek,
      isBusinessDay: isCurrentDateBusinessDay,
      monthName: isStartOfMonth ? format(currentDate, 'MMMM') : undefined,
      weekNumber: isStartOfWeek ? Math.ceil(differenceInDays(currentDate, new Date(currentDate.getFullYear(), 0, 1)) / 7) : undefined
    });
    
    if (viewMode === 'day') {
      currentDate = addDays(currentDate, 1);
    } else if (viewMode === 'week') {
      if (isStartOfWeek || slots.length === 0) {
        currentDate = addDays(currentDate, 1);
      } else {
        // Move to next Monday
        const daysUntilMonday = (8 - currentDate.getDay()) % 7;
        currentDate = addDays(currentDate, daysUntilMonday > 0 ? daysUntilMonday : 7);
      }
    } else if (viewMode === 'month') {
      if (isStartOfMonth || slots.length === 0) {
        currentDate = addDays(currentDate, 1);
      } else {
        // Move to first day of next month
        currentDate = addMonths(currentDate, 1);
        currentDate.setDate(1);
      }
    } else if (viewMode === 'quarter') {
      if (isStartOfMonth && [0, 3, 6, 9].includes(currentDate.getMonth()) || slots.length === 0) {
        currentDate = addMonths(currentDate, 1);
      } else {
        // Move to first month of next quarter
        const currentMonth = currentDate.getMonth();
        const monthsToNextQuarter = 3 - (currentMonth % 3);
        currentDate = addMonths(currentDate, monthsToNextQuarter);
        currentDate.setDate(1);
      }
    }
  }
  
  return slots;
};

// Component to display bay capacity information and status indicators
const BayCapacityInfo = ({ bay, allSchedules, projects, bays }: { bay: ManufacturingBay, allSchedules: ManufacturingSchedule[], projects: Project[], bays: ManufacturingBay[] }) => {
  // Get scheduled projects for this bay
  const baySchedules = allSchedules.filter(s => s.bayId === bay.id);
  const activeProjects = baySchedules.length;
  
  // Determine capacity status 
  let capacityPercentage = 0;
  if (activeProjects > 0) {
    // Calculate based on project count
    capacityPercentage = Math.min(activeProjects * 50, 100); // 2+ projects = 100% capacity
  }
  
  let statusText = 'Available';
  let statusBg = 'bg-green-500';
  let statusIcon = <CheckCircle2 className="h-4 w-4 text-white" />;
  
  if (capacityPercentage >= 100) {
    statusText = 'At Capacity';
    statusBg = 'bg-red-500';
    statusIcon = <AlertTriangle className="h-4 w-4 text-white" />;
  } else if (capacityPercentage >= 50) {
    statusText = 'Near Capacity';
    statusBg = 'bg-amber-500';
    statusIcon = <Clock3 className="h-4 w-4 text-white" />;
  }
  
  // Calculate team capacity - look for assembly/electrical staff counts on this bay
  const assemblyStaff = bay.assemblyStaffCount || 1;
  const electricalStaff = bay.electricalStaffCount || 1;
  const hoursPerWeek = bay.hoursPerPersonPerWeek || 29;
  const totalStaff = assemblyStaff + electricalStaff;
  const totalCapacity = totalStaff * hoursPerWeek;
  
  // Find other bays in same team to calculate team capacity
  let teamCapacity = totalCapacity;
  if (bay.team) {
    const teamBays = bays.filter(b => b.team === bay.team);
    if (teamBays.length > 0) {
      // Sum up assembly and electrical staff from all bays in team
      let teamAssemblyStaff = 0;
      let teamElectricalStaff = 0;
      let teamHoursPerWeek = hoursPerWeek; // Use the same hours per week value across team
      
      teamBays.forEach(b => {
        if (b.assemblyStaffCount) teamAssemblyStaff += b.assemblyStaffCount;
        if (b.electricalStaffCount) teamElectricalStaff += b.electricalStaffCount;
        if (b.hoursPerPersonPerWeek) teamHoursPerWeek = b.hoursPerPersonPerWeek;
      });
      
      const teamTotalStaff = teamAssemblyStaff + teamElectricalStaff;
      teamCapacity = teamTotalStaff * teamHoursPerWeek;
    }
  }
  
  console.log(`Bay ${bay.name} at ${capacityPercentage}% capacity with ${activeProjects === 0 ? 'no projects' : activeProjects + ' project' + (activeProjects > 1 ? 's' : '')}`);
  console.log(`Bay ${bay.name} final status: ${statusText} with ${activeProjects} active project${activeProjects !== 1 ? 's' : ''}`);
  
  return (
    <div className="bay-capacity-info absolute right-2 top-2 flex flex-col items-end gap-1">
      <div className="flex items-center space-x-2">
        <div className={`status-indicator ${statusBg} text-white text-xs px-2 py-0.5 rounded-full flex items-center`}>
          {statusIcon}
          <span className="ml-1">{statusText}</span>
        </div>
        <div className="project-count bg-gray-200 text-gray-800 text-xs px-2 py-0.5 rounded-full">
          {activeProjects} project{activeProjects !== 1 ? 's' : ''}
        </div>
      </div>
      
      {bay.team && (
        <div className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs flex items-center gap-1 mt-1">
          <Users className="h-3 w-3" />
          <span>Team: {teamCapacity} hrs/wk</span>
        </div>
      )}
      
      <div className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full text-xs flex items-center gap-1 mt-1">
        <UserPlus className="h-3 w-3" />
        <span>{assemblyStaff}A + {electricalStaff}E</span>
      </div>
    </div>
  );
};

export default function ResizableBaySchedule({
  schedules,
  projects,
  bays,
  onScheduleChange,
  onScheduleCreate,
  onScheduleDelete,
  onBayCreate,
  onBayUpdate,
  onBayDelete,
  dateRange,
  viewMode
}: ResizableBayScheduleProps) {
  const { toast } = useToast();
  const apiRequest = useApiRequest();
  
  // State for managing UI
  const [scheduleBars, setScheduleBars] = useState<ScheduleBar[]>([]);
  const [draggingSchedule, setDraggingSchedule] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<{ bayId: number, rowIndex: number } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newBayDialog, setNewBayDialog] = useState(false);
  const [editingBay, setEditingBay] = useState<ManufacturingBay | null>(null);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [deleteRowDialogOpen, setDeleteRowDialogOpen] = useState(false);
  const [confirmRowDelete, setConfirmRowDelete] = useState<{
    bayId: number;
    rowIndex: number;
    bayName: string;
    rowNumber: number;
    affectedProjects: {
      id: number;
      projectId: number;
      projectName: string;
      projectNumber: string;
    }[];
  } | null>(null);
  const [currentProject, setCurrentProject] = useState<number | null>(null);
  const [targetBay, setTargetBay] = useState<number | null>(null);
  const [targetStartDate, setTargetStartDate] = useState<Date | null>(null);
  const [targetEndDate, setTargetEndDate] = useState<Date | null>(null);
  const [scheduleDuration, setScheduleDuration] = useState(4); // in weeks
  const [rowHeight, setRowHeight] = useState(60); // Height of each row in pixels
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [slotWidth, setSlotWidth] = useState(60); // Increased slot width for better visibility
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [showAddMultipleWarning, setShowAddMultipleWarning] = useState(false);
  const [showQcDaysWarning, setShowQcDaysWarning] = useState(false);
  const [modifiedSchedule, setModifiedSchedule] = useState<ScheduleBar | null>(null);
  const [originalSchedule, setOriginalSchedule] = useState<ScheduleBar | null>(null);
  const [showRevertDialog, setShowRevertDialog] = useState(false);
  
  // Track the viewport element for scrolling
  const viewportRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  
  // Group bays into teams (2 bays = 1 team)
  const bayTeams = useMemo(() => {
    const sortedBays = [...bays].sort((a, b) => a.bayNumber - b.bayNumber);
    
    // Group bays into teams of 2
    const teams: ManufacturingBay[][] = [];
    
    // For each pair of bays, create a team
    for (let i = 0; i < sortedBays.length; i += 2) {
      const team = [sortedBays[i]];
      if (i + 1 < sortedBays.length) {
        team.push(sortedBays[i + 1]);
      }
      teams.push(team);
    }
    
    return teams;
  }, [bays]);
  
  // Slots for the timeline
  const slots = useMemo(() => {
    return generateTimeSlots(dateRange, viewMode);
  }, [dateRange, viewMode]);
  
  // Calculate schedule bars positions based on the schedules data
  useEffect(() => {
    console.log('Recalculating schedule bars (version 3): ensuring NO automatic adjustments');
    
    if (!schedules.length || !projects.length) return;
    
    // Calculate pixels per day based on slot width
    const pixelsPerDay = viewMode === 'day' ? slotWidth : slotWidth / 7;
    
    // Map schedules to bars
    const bars = schedules.map((schedule) => {
      const project = projects.find((p) => p.id === schedule.projectId);
      
      if (!project) {
        console.warn(`Project not found for schedule: ${schedule.id}, projectId: ${schedule.projectId}`);
        return null;
      }
      
      // Get start and end dates
      const startDate = new Date(schedule.startDate);
      const endDate = new Date(schedule.endDate);
      
      // Calculate left position based on date range start
      const daysFromStart = differenceInDays(startDate, dateRange.start);
      const left = daysFromStart * pixelsPerDay;
      
      // Calculate width based on duration
      const durationDays = differenceInDays(endDate, startDate) + 1; // +1 to include the end date
      const width = durationDays * pixelsPerDay;
      
      // Determine a color based on project ID
      const colorIndex = schedule.projectId % PROJECT_COLORS.length;
      const color = PROJECT_COLORS[colorIndex];
      
      const bar: ScheduleBar = {
        id: schedule.id,
        projectId: schedule.projectId,
        bayId: schedule.bayId,
        startDate,
        endDate,
        totalHours: schedule.totalHours,
        projectName: project.name,
        projectNumber: project.projectNumber,
        width,
        left,
        color,
        row: schedule.row !== undefined ? schedule.row : 0, // Use the explicit row from database
        
        // Department phase percentages (default values)
        fabPercentage: 27,
        paintPercentage: 7,
        productionPercentage: 60,
        itPercentage: 7,
        ntcPercentage: 7,
        qcPercentage: 7,
        
        // Default fab weeks
        fabWeeks: 4
      };
      
      // Bar object is created but phase widths aren't calculated yet
      return bar;
    }).filter((bar): bar is ScheduleBar => bar !== null);
    
    // Important: NO automatic row assignment or repositioning
    // Bars will be positioned exactly where they are in the database
    
    // Convert manufacturing bays to the Bay type needed for capacity calculations
    const capacityBays = bays.map(bay => ({
      id: bay.id,
      team: bay.team,
      assemblyStaffCount: bay.assemblyStaffCount || 1, 
      electricalStaffCount: bay.electricalStaffCount || 1,
      hoursPerPersonPerWeek: bay.hoursPerPersonPerWeek || 29 // Default 29 hours per week
    }));
    
    // Apply team capacity-based calculations to all schedule bars
    const barsWithCapacityCalculation = updatePhaseWidthsWithExactFit(bars, capacityBays);
    console.log('Applied capacity-based calculations for production phase widths');
    
    setScheduleBars(barsWithCapacityCalculation);
  }, [schedules, projects, dateRange, viewMode, slotWidth]);
  
  // Filter projects when search term changes
  useEffect(() => {
    if (!searchTerm) {
      setFilteredProjects([]);
      return;
    }
    
    const searchTermLower = searchTerm.toLowerCase();
    
    // Filter projects by name or number
    const filtered = projects.filter(
      (project) =>
        project.name.toLowerCase().includes(searchTermLower) ||
        project.projectNumber.toLowerCase().includes(searchTermLower)
    );
    
    // Get IDs of already scheduled projects
    const scheduledProjectIds = new Set(schedules.map((s) => s.projectId));
    
    // Sort by whether they're already scheduled
    const sorted = [...filtered].sort((a, b) => {
      const aScheduled = scheduledProjectIds.has(a.id);
      const bScheduled = scheduledProjectIds.has(b.id);
      
      if (aScheduled && !bScheduled) return 1;
      if (!aScheduled && bScheduled) return -1;
      return 0;
    });
    
    setFilteredProjects(sorted);
  }, [searchTerm, projects, schedules]);
  
  // Auto-scroll to current day on initial render
  useEffect(() => {
    const viewportEl = viewportRef.current;
    const timelineEl = timelineRef.current;
    
    if (!viewportEl || !timelineEl) return;
    
    // Find today's position in the timeline
    const today = new Date();
    
    // Calculate days since the start of our date range
    const daysFromStart = differenceInDays(today, dateRange.start);
    
    // Calculate the position to scroll to based on slot width
    // Use viewMode to determine pixels per day
    const pixelsPerDay = viewMode === 'day' ? slotWidth : slotWidth / 7;
    const scrollPosition = daysFromStart * pixelsPerDay;
    
    // Adjust for centering by subtracting half the viewport width
    const adjustedPosition = Math.max(0, scrollPosition - viewportEl.clientWidth / 2);
    
    // Scroll to position
    console.log('Auto-scrolling to current week');
    try {
      if (viewportEl.scrollTo) {
        const weekPosition = Math.floor(adjustedPosition);
        console.log(`Auto-scrolled to current week position: ${scrollPosition}px (week ${Math.floor(daysFromStart / 7)} of ${today.getFullYear()}) centered at ${adjustedPosition}px`);
        viewportEl.scrollTo({ left: weekPosition, behavior: 'smooth' });
      } else {
        console.log('USING EMERGENCY SCROLLING METHOD');
        // Fallback for older browsers
        viewportEl.scrollLeft = adjustedPosition;
        console.log(`Forced scroll to ${adjustedPosition}px (${daysFromStart} days since Jan 1, ${pixelsPerDay}px per day)`);
      }
    } catch (e) {
      console.error('Error during auto-scroll:', e);
    }
  }, [dateRange, viewMode, slotWidth]);
  
  // Drag handling functions
  const handleDragStart = (e: React.DragEvent, scheduleId: number) => {
    e.dataTransfer.setData('text/plain', scheduleId.toString());
    e.dataTransfer.effectAllowed = 'move';
    
    // Add some visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.classList.add('dragging');
      
      // Create a custom drag image that looks like the actual bar
      const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
      dragImage.style.width = '200px'; // Fixed width for drag image
      dragImage.style.height = '40px';
      dragImage.style.zIndex = '9999';
      dragImage.style.opacity = '0.8';
      dragImage.style.pointerEvents = 'none';
      dragImage.style.position = 'absolute';
      dragImage.style.top = '-1000px'; // Hide it initially
      document.body.appendChild(dragImage);
      
      e.dataTransfer.setDragImage(dragImage, 100, 20);
      
      // Remove the drag image after the drag operation completes
      setTimeout(() => {
        document.body.removeChild(dragImage);
      }, 0);
    }
    
    setDraggingSchedule(scheduleId);
  };
  
  const handleDragOver = (e: React.DragEvent, bayId: number, rowIndex: number, slotIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    setDropTarget({ bayId, rowIndex });
  };
  
  const handleSlotDragOver = (e: React.DragEvent, bayId: number, rowIndex: number, date: Date) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Update drop target info
    setDropTarget({ bayId, rowIndex });
    
    // Visually highlight the drop zone
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.classList.add('drop-target');
    }
  };
  
  const handleDragEnd = (e: React.DragEvent) => {
    // Reset dragging state
    setDraggingSchedule(null);
    setDropTarget(null);
    
    // Remove any visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.classList.remove('dragging');
    }
    
    // Remove highlights from all potential drop targets
    document.querySelectorAll('.drop-target').forEach((el) => {
      el.classList.remove('drop-target');
    });
  };
  
  const handleDrop = async (e: React.DragEvent, bayId: number, slotIndex: number, rowIndex: number) => {
    e.preventDefault();
    console.log(`DROP DEBUG: handleDrop called with bayId=${bayId}, slotIndex=${slotIndex}, rowIndex=${rowIndex}`);
    
    // Get the schedule ID from the drag data
    const scheduleId = parseInt(e.dataTransfer.getData('text/plain'), 10);
    console.log(`DROP DEBUG: Moving schedule ID ${scheduleId}`);
    
    // Find the schedule bar being moved
    const bar = scheduleBars.find((b) => b.id === scheduleId);
    if (!bar) {
      console.error('DROP ERROR: Could not find schedule bar with ID', scheduleId);
      return;
    }
    
    try {
      // Determine the new start and end dates based on drop position
      const targetDate = getDateFromDropPosition(e, bayId, rowIndex);
      if (!targetDate) {
        console.error('DROP ERROR: Could not determine target date for drop');
        return;
      }
      
      // Calculate the duration in days and apply to the target date
      const durationDays = differenceInDays(bar.endDate, bar.startDate);
      const newEndDate = addDays(targetDate, durationDays);
      
      // Debug info
      console.log(`⚠️ DROP DEBUG: AUTO-ADJUSTMENT DISABLED - Project will be placed EXACTLY where dropped`);
      console.log(`⚠️ DROP DEBUG: Target row index: ${rowIndex}`);
      console.log(`⚠️ DROP DEBUG: Start date: ${format(targetDate, 'yyyy-MM-dd')}, End date: ${format(newEndDate, 'yyyy-MM-dd')}`);
      console.log(`🔒 DROP DEBUG: NO AUTO OPTIMIZATION: Projects can overlap - NO collision detection`);
      
      // Format dates for the API
      const formattedStartDate = format(targetDate, 'yyyy-MM-dd');
      const formattedEndDate = format(newEndDate, 'yyyy-MM-dd');
      
      // Update the schedule with EXACT row position
      await onScheduleChange(
        scheduleId,
        bayId,
        formattedStartDate,
        formattedEndDate,
        bar.totalHours, 
        rowIndex // CRITICAL: This preserves the exact row where the user dropped
      );
      
      // Show success toast
      toast({
        title: "Schedule updated",
        description: `${bar.projectName} moved to ${bays.find(b => b.id === bayId)?.name || 'Bay ' + bayId}`,
      });
    } catch (error) {
      console.error('Error updating schedule:', error);
      toast({
        title: "Update failed",
        description: "There was an error updating the schedule. Please try again.",
        variant: "destructive",
      });
    }
    
    // Reset drag state
    setDraggingSchedule(null);
    setDropTarget(null);
  };
  
  const handleSlotDrop = async (e: React.DragEvent, bayId: number, rowIndex: number, date: Date) => {
    e.preventDefault();
    
    console.log(`🎯 PRECISE DROP: Bay ${bayId}, Row ${rowIndex}, Date ${format(date, 'yyyy-MM-dd')}`);
    console.log(`🎯 EXACT DROP: BAY ${bayId} (${bays.find(b => b.id === bayId)?.name})`);
    console.log(`🎯 Pixel position: x=${e.nativeEvent.offsetX}px from bay left edge`);
    console.log(`🎯 Using single-row layout, placing in row ${rowIndex}`);
    console.log(`⚠️ NO AUTO-ADJUSTMENT: Projects will stay EXACTLY where dropped`);
    console.log(`⚠️ OVERLAP ALLOWED: Multiple projects can occupy the same space`);
    
    // Get the schedule ID from the drag data
    const scheduleId = parseInt(e.dataTransfer.getData('text/plain'), 10);
    
    // Check if this is a NEW project being created (negative ID) or existing schedule
    const isNewProject = scheduleId < 0;
    
    if (isNewProject) {
      // This is a new project being added from the unassigned projects list
      const projectId = Math.abs(scheduleId);
      console.log(`Creating NEW schedule for project ID ${projectId} in bay ${bayId} at row ${rowIndex}`);
      
      // Find the project data
      const project = projects.find(p => p.id === projectId);
      if (!project) {
        console.error('Cannot find project with ID', projectId);
        return;
      }
      
      // Default duration is 4 weeks if not specified
      const endDate = addWeeks(date, scheduleDuration);
      
      // Format dates for API
      const formattedStartDate = format(date, 'yyyy-MM-dd');
      const formattedEndDate = format(endDate, 'yyyy-MM-dd');
      
      try {
        // Create a new schedule with the projectId, bayId, and dates
        await onScheduleCreate(
          projectId,
          bayId,
          formattedStartDate,
          formattedEndDate,
          scheduleDuration * 40, // 40 hours per week default
          rowIndex // Exact row placement
        );
        
        toast({
          title: "Schedule created",
          description: `Added ${project.name} to ${bays.find(b => b.id === bayId)?.name || 'Bay ' + bayId}`,
        });
      } catch (error) {
        console.error('Error creating schedule:', error);
        toast({
          title: "Failed to create schedule",
          description: "There was an error creating the schedule. Please try again.",
          variant: "destructive",
        });
      }
      
      return;
    }
    
    // Handle existing schedule being moved
    const bar = scheduleBars.find((b) => b.id === scheduleId);
    if (!bar) {
      console.error('DROP ERROR: Could not find schedule bar with ID', scheduleId);
      return;
    }
    
    // Clear any previous drop highlight markers
    document.querySelectorAll('.drop-highlight-marker').forEach(el => {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
    
    // Create visual indicators for the exact drop location
    const targetElement = e.currentTarget instanceof HTMLElement ? e.currentTarget : document.querySelector(`[data-bay-id="${bayId}"]`);
    if (targetElement) {
      // Create position marker
      const marker = document.createElement('div');
      marker.className = 'drop-highlight-marker absolute w-2 h-10 bg-green-600 z-40 rounded';
      marker.style.left = '0px';
      marker.style.top = '0px';
      targetElement.appendChild(marker);
      
      // Add visual indicator for user feedback
      const indicator = document.createElement('div');
      indicator.className = 'drop-highlight-marker absolute bg-green-500/30 border border-green-500 px-2 py-1 text-xs font-bold text-white z-50 rounded';
      indicator.style.top = '5px';
      indicator.style.left = '5px';
      indicator.textContent = `EXACT PLACEMENT: ${format(date, 'MMM d')}`;
      targetElement.appendChild(indicator);
      
      // Remove indicators after 2 seconds
      setTimeout(() => {
        document.querySelectorAll('.drop-highlight-marker').forEach(el => {
          if (el.parentNode) el.parentNode.removeChild(el);
        });
      }, 2000);
    }
    
    try {
      // Calculate the duration in days and apply to the target date
      const durationDays = differenceInDays(bar.endDate, bar.startDate);
      const newEndDate = addDays(date, durationDays);
      
      // Debug info
      console.log(`⚠️ DROP DEBUG: AUTO-ADJUSTMENT DISABLED - Project will stay EXACTLY at dropped position`);
      console.log(`⚠️ DROP DEBUG: Target row index: ${rowIndex}`);
      console.log(`⚠️ DROP DEBUG: Start date: ${format(date, 'yyyy-MM-dd')}, End date: ${format(newEndDate, 'yyyy-MM-dd')}`);
      console.log(`🔒 DROP DEBUG: NO AUTO OPTIMIZATION: Projects can overlap - NO collision detection`);
      
      // Format dates for the API
      const formattedStartDate = format(date, 'yyyy-MM-dd');
      const formattedEndDate = format(newEndDate, 'yyyy-MM-dd');
      
      // Update the schedule with EXACT row position
      await onScheduleChange(
        scheduleId,
        bayId,
        formattedStartDate,
        formattedEndDate,
        bar.totalHours,
        rowIndex
      );
      
      // Show success toast
      toast({
        title: "Schedule updated",
        description: `${bar.projectName} moved to ${bays.find(b => b.id === bayId)?.name || 'Bay ' + bayId}`,
      });
    } catch (error) {
      console.error('Error updating schedule:', error);
      toast({
        title: "Update failed",
        description: "There was an error updating the schedule. Please try again.",
        variant: "destructive",
      });
    }
    
    // Reset drag state
    setDraggingSchedule(null);
    setDropTarget(null);
    
    // Remove highlights
    document.querySelectorAll('.drop-target').forEach((el) => {
      el.classList.remove('drop-target');
    });
  };
  
  const getDateFromDropPosition = (e: React.DragEvent, bayId: number, rowIndex: number): Date | null => {
    console.log(`DROP DEBUG: Bay ID ${bayId}, Row Index ${rowIndex}`);
    
    // Try to get date from data attributes first (more precise if available)
    if (e.currentTarget instanceof HTMLElement) {
      const dateAttr = e.currentTarget.getAttribute('data-date');
      if (dateAttr) {
        console.log(`DROP DEBUG: Using date attribute: ${dateAttr}`);
        return new Date(dateAttr);
      }
    }
    
    // Get the element where the drop happened
    const dropTarget = e.target as HTMLElement;
    if (dropTarget?.classList.contains('week-cell')) {
      const dateAttr = dropTarget.getAttribute('data-date');
      if (dateAttr) {
        console.log(`DROP DEBUG: Using week-cell date attribute: ${dateAttr}`);
        return new Date(dateAttr);
      }
    }
    
    try {
      // Find the timeline element that contains the week cells
      const timelineEl = timelineRef.current;
      if (!timelineEl) {
        console.error('DROP DEBUG: Timeline element not found');
        return addDays(dateRange.start, 0); // Default to start date
      }
      
      // Get the timeline bounding rect
      const timelineRect = timelineEl.getBoundingClientRect();
      
      // Get the offset from the start of the timeline (left edge) 
      const timelineX = e.clientX - timelineRect.left - 32; // Adjust for bay label width
      
      // Make sure we have a positive value
      const adjustedX = Math.max(0, timelineX);
      
      // Calculate date based on slot width with precise positioning
      const dayWidth = viewMode === 'day' ? slotWidth : slotWidth / 7;
      
      // Calculate the day offset based on pixels
      const dayOffset = adjustedX / dayWidth;
      console.log(`DROP DEBUG: Improved calculation - timelineX: ${timelineX}px, adjustedX: ${adjustedX}px, dayWidth: ${dayWidth}px, dayOffset: ${dayOffset} days`);
      
      // Get the exact date
      const exactDate = addDays(dateRange.start, Math.floor(dayOffset));
      console.log(`DROP DEBUG: Target date: ${format(exactDate, 'yyyy-MM-dd')}`);
      
      return exactDate;
    } catch (error) {
      console.error('Error calculating drop position:', error);
      
      // Fallback - use the center of the first visible week on screen
      return addDays(dateRange.start, 0);
    }
  };
  
  const handleDeleteRow = async (bayId: number, rowIndex: number) => {
    try {
      // Find schedules in this row
      const schedulesInRow = scheduleBars.filter(
        (bar) => bar.bayId === bayId && bar.row === rowIndex
      );
      
      // If schedules exist, delete them first
      for (const schedule of schedulesInRow) {
        if (onScheduleDelete) {
          await onScheduleDelete(schedule.id);
        }
      }
      
      toast({
        title: "Row deleted",
        description: `Row ${rowIndex + 1} in Bay ${bayId} has been deleted.`,
      });
    } catch (error) {
      console.error('Error deleting row:', error);
      toast({
        title: "Deletion failed",
        description: "There was an error deleting the row. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleRowAdd = async (bayId: number) => {
    try {
      // For now, adding a row doesn't involve API calls
      // It's just a UI update that will be reflected in future schedule creates
      
      toast({
        title: "Row added",
        description: `A new row has been added to Bay ${bayId}.`,
      });
    } catch (error) {
      console.error('Error adding row:', error);
      toast({
        title: "Addition failed",
        description: "There was an error adding the row. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleAddSchedule = async () => {
    if (!currentProject || !targetBay || !targetStartDate || !targetEndDate) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Format dates for the API
      const formattedStartDate = format(targetStartDate, 'yyyy-MM-dd');
      const formattedEndDate = format(targetEndDate, 'yyyy-MM-dd');
      
      // Create the schedule with default row 0
      const rowIndex = 0;
      
      // Create the schedule
      await onScheduleCreate(
        currentProject,
        targetBay,
        formattedStartDate,
        formattedEndDate,
        40, // Default to 40 hours
        rowIndex
      );
      
      // Show success toast
      toast({
        title: "Schedule created",
        description: `Project added to ${bays.find(b => b.id === targetBay)?.name || 'Bay ' + targetBay}`,
      });
      
      // Reset dialog state
      setDialogOpen(false);
      setCurrentProject(null);
      setTargetBay(null);
      setTargetStartDate(null);
      setTargetEndDate(null);
    } catch (error) {
      console.error('Error creating schedule:', error);
      toast({
        title: "Creation failed",
        description: "There was an error creating the schedule. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleDeleteSchedule = async (scheduleId: number) => {
    if (!onScheduleDelete) return;
    
    try {
      await onScheduleDelete(scheduleId);
      
      // Show success toast
      toast({
        title: "Schedule deleted",
        description: "The schedule has been deleted.",
      });
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast({
        title: "Deletion failed",
        description: "There was an error deleting the schedule. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleSaveBayEdit = async () => {
    if (!editingBay || !onBayUpdate) return;
    
    try {
      await onBayUpdate(editingBay.id, editingBay);
      
      // Show success toast
      toast({
        title: "Bay updated",
        description: `${editingBay.name} has been updated.`,
      });
      
      // Reset editing state
      setEditingBay(null);
    } catch (error) {
      console.error('Error updating bay:', error);
      toast({
        title: "Update failed",
        description: "There was an error updating the bay. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleCreateBay = async () => {
    if (!editingBay || !onBayCreate) return;
    
    try {
      await onBayCreate(editingBay);
      
      // Show success toast
      toast({
        title: "Bay created",
        description: `${editingBay.name} has been created.`,
      });
      
      // Reset dialog state
      setNewBayDialog(false);
      setEditingBay(null);
    } catch (error) {
      console.error('Error creating bay:', error);
      toast({
        title: "Creation failed",
        description: "There was an error creating the bay. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleDeleteBay = async (bayId: number) => {
    if (!onBayDelete) return;
    
    try {
      await onBayDelete(bayId);
      
      // Show success toast
      toast({
        title: "Bay deleted",
        description: "The bay has been deleted.",
      });
    } catch (error) {
      console.error('Error deleting bay:', error);
      toast({
        title: "Deletion failed",
        description: "There was an error deleting the bay. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Function to calculate bar position
  const calculateBarPosition = (startDate: Date, endDate: Date): { left?: number, width?: number } => {
    // Calculate pixels per day based on slot width
    const pixelsPerDay = viewMode === 'day' ? slotWidth : slotWidth / 7;
    
    // Calculate left position based on date range start
    const daysFromStart = differenceInDays(startDate, dateRange.start);
    const left = daysFromStart * pixelsPerDay;
    
    // Calculate width based on duration
    const durationDays = differenceInDays(endDate, startDate) + 1; // +1 to include the end date
    const width = durationDays * pixelsPerDay;
    
    return { left, width };
  };
  
  // Function to update department phase widths dynamically 
  const updateDepartmentPhaseWidths = (barElement: HTMLElement, totalWidth: number) => {
    const bar = barElement;
    
    // Get department percentage values from the element
    const fabPercent = parseFloat(bar.getAttribute('data-fab-percentage') || '27');
    const paintPercent = parseFloat(bar.getAttribute('data-paint-percentage') || '7');
    const prodPercent = parseFloat(bar.getAttribute('data-production-percentage') || '60');
    const itPercent = parseFloat(bar.getAttribute('data-it-percentage') || '7');
    const ntcPercent = parseFloat(bar.getAttribute('data-ntc-percentage') || '7');
    const qcPercent = parseFloat(bar.getAttribute('data-qc-percentage') || '7');
    
    // Calculate widths based on percentages of the total width
    const fabWidth = Math.round(totalWidth * (fabPercent / 100));
    const paintWidth = Math.round(totalWidth * (paintPercent / 100));
    const prodWidth = Math.round(totalWidth * (prodPercent / 100));
    const itWidth = Math.round(totalWidth * (itPercent / 100));
    const ntcWidth = Math.round(totalWidth * (ntcPercent / 100));
    const qcWidth = Math.round(totalWidth * (qcPercent / 100));
    
    // Find and update the phase elements
    const fabPhase = bar.querySelector('.fab-phase') as HTMLElement;
    const paintPhase = bar.querySelector('.paint-phase') as HTMLElement;
    const prodPhase = bar.querySelector('.production-phase') as HTMLElement;
    const itPhase = bar.querySelector('.it-phase') as HTMLElement;
    const ntcPhase = bar.querySelector('.ntc-phase') as HTMLElement;
    const qcPhase = bar.querySelector('.qc-phase') as HTMLElement;
    
    if (fabPhase) fabPhase.style.width = `${fabWidth}px`;
    if (paintPhase) paintPhase.style.width = `${paintWidth}px`;
    if (prodPhase) prodPhase.style.width = `${prodWidth}px`;
    if (itPhase) itPhase.style.width = `${itWidth}px`;
    if (ntcPhase) ntcPhase.style.width = `${ntcWidth}px`;
    if (qcPhase) qcPhase.style.width = `${qcWidth}px`;
  };
  
  // Handle resizing the schedule bars
  const handleResizeStart = (e: React.MouseEvent, bar: ScheduleBar, direction: 'start' | 'end') => {
    e.preventDefault();
    e.stopPropagation();
    
    // Save current values to be restored if needed
    const element = e.currentTarget.closest('.schedule-bar') as HTMLElement;
    if (!element) return;
    
    // Track initial position and size
    const initialRect = element.getBoundingClientRect();
    const initialLeft = initialRect.left;
    const initialWidth = initialRect.width;
    initialStartDate = new Date(bar.startDate);
    initialEndDate = new Date(bar.endDate);
    
    // Set up resize mode
    const resizeMode = direction;
    let startX = e.clientX;
    
    // Function to calculate the width between two dates
    const getWidthBetweenDates = (from: Date, to: Date): number => {
      const days = differenceInDays(to, from) + 1; // Add 1 to include both start and end dates
      return days * (viewMode === 'day' ? slotWidth : slotWidth / 7);
    };
    
    // Handle mouse move during resizing
    const handleResizeMove = (e: MouseEvent) => {
      // Calculate the delta
      const deltaX = e.clientX - startX;
      
      // Update the bar style based on resize direction
      if (resizeMode === 'start') {
        // Determine the new left position, but don't allow it to go beyond the end
        const newLeft = Math.min(initialLeft + deltaX, initialLeft + initialWidth - 40); // Keep a minimum width
        const newWidth = initialWidth - (newLeft - initialLeft);
        
        // Convert to date range
        const pixelsPerDay = viewMode === 'day' ? slotWidth : slotWidth / 7;
        const daysOffset = Math.round((newLeft - initialLeft) / pixelsPerDay);
        const newStartDate = addDays(initialStartDate, daysOffset);
        
        // Update the visual bar
        element.style.left = `${newLeft - element.parentElement!.getBoundingClientRect().left}px`;
        element.style.width = `${newWidth}px`;
        
        // Update department phase widths
        updateDepartmentPhaseWidths(element, newWidth);
        
      } else { // end resize
        // Calculate the new width
        const newWidth = Math.max(40, initialWidth + deltaX); // Ensure a minimum width
        
        // Convert to date range
        const pixelsPerDay = viewMode === 'day' ? slotWidth : slotWidth / 7;
        const daysExtended = Math.round(deltaX / pixelsPerDay);
        const newEndDate = addDays(initialEndDate, daysExtended);
        
        // Update the visual bar
        element.style.width = `${newWidth}px`;
        
        // Update department phase widths  
        updateDepartmentPhaseWidths(element, newWidth);
      }
    };
    
    // Handle mouse up to finalize the resize
    const handleResizeEnd = async (e: MouseEvent) => {
      // Clean up event listeners
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
      
      // Calculate the final dimensions
      const finalRect = element.getBoundingClientRect();
      const deltaLeft = finalRect.left - initialLeft;
      const deltaWidth = finalRect.width - initialWidth;
      
      // Convert to dates
      const pixelsPerDay = viewMode === 'day' ? slotWidth : slotWidth / 7;
      let newStartDate = initialStartDate;
      let newEndDate = initialEndDate;
      
      if (resizeMode === 'start') {
        const daysOffset = Math.round(deltaLeft / pixelsPerDay);
        newStartDate = addDays(initialStartDate, daysOffset);
      } else {
        const daysExtended = Math.round(deltaWidth / pixelsPerDay);
        newEndDate = addDays(initialEndDate, daysExtended);
      }
      
      // Format dates for the API
      const formattedStartDate = format(newStartDate, 'yyyy-MM-dd');
      const formattedEndDate = format(newEndDate, 'yyyy-MM-dd');
      
      try {
        // Update the schedule
        await onScheduleChange(
          bar.id,
          bar.bayId,
          formattedStartDate,
          formattedEndDate,
          bar.totalHours,
          bar.row
        );
        
        // Show success toast
        toast({
          title: "Schedule updated",
          description: `${bar.projectName} has been resized.`,
        });
      } catch (error) {
        console.error('Error updating schedule:', error);
        
        // Revert the visual changes
        if (resizeMode === 'start') {
          element.style.left = `${initialLeft - element.parentElement!.getBoundingClientRect().left}px`;
        }
        element.style.width = `${initialWidth}px`;
        
        // Update department phase widths to original size
        updateDepartmentPhaseWidths(element, initialWidth);
        
        toast({
          title: "Update failed",
          description: "There was an error updating the schedule. Please try again.",
          variant: "destructive",
        });
      }
    };
    
    // Add event listeners
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };
  
  // Find minimum and maximum dates for the chart
  const findDateBoundaries = () => {
    if (!schedules.length) {
      return {
        earliestDate: dateRange.start,
        latestDate: dateRange.end
      };
    }
    
    // Filter out empty and undefined dates
    const validStartDates = schedules.map(s => s.startDate).filter(Boolean);
    const validEndDates = schedules.map(s => s.endDate).filter(Boolean);
    
    if (!validStartDates.length || !validEndDates.length) {
      return {
        earliestDate: dateRange.start,
        latestDate: dateRange.end
      };
    }
    
    // Find min/max
    const earliestDate = new Date(Math.min(...validStartDates.map(d => new Date(d).getTime())));
    const latestDate = new Date(Math.max(...validEndDates.map(d => new Date(d).getTime())));
    
    return { earliestDate, latestDate };
  };
  
  // Find unassigned projects that don't have any schedules
  const unassignedProjects = projects.filter(project => 
    !schedules.some(schedule => schedule.projectId === project.id)
  );
  
  return (
    <div className="resizable-bay-schedule relative flex flex-col h-full dark">
      {/* Header Bar */}
      <div className="schedule-header sticky top-0 z-10 bg-gray-900 border-b border-gray-700 shadow-sm">
        <div className="flex justify-between items-center p-2">
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-semibold text-white">Manufacturing Schedule</h2>
            <Badge variant="secondary" className="ml-2">
              {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} View
            </Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            <button 
              className="bg-gray-700 hover:bg-gray-600 p-1 rounded"
              onClick={() => setDialogOpen(true)}
            >
              <PlusCircle className="h-5 w-5 text-white" />
            </button>
            
            <button
              className="bg-gray-700 hover:bg-gray-600 p-1 rounded"
              onClick={() => {
                setNewBayDialog(true);
                setEditingBay({
                  id: 0,
                  name: '',
                  bayNumber: bays.length + 1,
                  status: 'active',
                  description: null,
                  location: null,
                  team: null,
                  capacityTonn: null,
                  maxWidth: null,
                  maxHeight: null,
                  maxLength: null,
                  teamId: null,
                  createdAt: null,
                  updatedAt: null
                });
              }}
            >
              <div className="flex items-center">
                <PlusIcon className="h-4 w-4 text-gray-700" />
                <span className="text-sm">Bay</span>
              </div>
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex flex-row flex-1 h-full">
        <CollapsibleSidebar unassignedProjects={unassignedProjects} />
                    // Create dummy schedule to use the existing drag logic
                    const dummySchedule = {
                      id: -project.id, // Negative ID to mark as new
                      projectId: project.id,
                      bayId: 0,
                      startDate: new Date(),
                      endDate: addWeeks(new Date(), 4),
                      totalHours: 160,
                      row: 0
                    };
                    
                    // Set drag data
                    e.dataTransfer.setData('text/plain', String(dummySchedule.id));
                    e.dataTransfer.effectAllowed = 'copy';
                    
                    // Visual feedback
                    e.currentTarget.classList.add('opacity-50');
                    
                    // Create custom drag image
                    const dragImage = document.createElement('div');
                    dragImage.className = 'bg-blue-600 text-white p-2 rounded opacity-80 pointer-events-none fixed -left-full';
                    dragImage.textContent = `${project.projectNumber}: ${project.name}`;
                    document.body.appendChild(dragImage);
                    e.dataTransfer.setDragImage(dragImage, 10, 10);
                    
                    // Add to temporary data to be accessed by drop handlers
                    (window as any).draggedProject = project;
                    console.log(`Dragging unassigned project ${project.projectNumber}: ${project.name}`);
                  }}
                  onDragEnd={(e) => {
                    e.currentTarget.classList.remove('opacity-50');
                    const dragImages = document.querySelectorAll('div.pointer-events-none.fixed.-left-full');
                    dragImages.forEach(el => el.remove());
                  }}
                >
                  <div className="font-medium text-white text-sm mb-1 truncate">{project.projectNumber}: {project.name}</div>
                  <div className="text-xs text-gray-400 truncate">{project.status}</div>
                  <div className="text-xs text-gray-400 mt-1 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-blue-500 mr-1"></span>
                    {project.team || 'No Team'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="bay-schedule-viewport flex-grow overflow-auto" ref={viewportRef}>
          <div className="bay-schedule-container relative" ref={timelineRef}>
          {/* Timeline Header */}
          <div className="timeline-header sticky top-0 z-10 bg-gray-900 shadow-sm flex ml-32" 
            style={{ 
              width: `${Math.max(10000, differenceInDays(new Date(2030, 11, 31), dateRange.start) * (viewMode === 'day' ? slotWidth : slotWidth / 7))}px`,
            }}>
            {slots.map((slot, index) => (
              <div
                key={`header-${index}`}
                className={`
                  timeline-slot border-r flex-shrink-0
                  ${slot.isStartOfMonth ? 'bg-gray-800 border-r-2 border-r-blue-500' : ''}
                  ${slot.isStartOfWeek ? 'bg-gray-850 border-r border-r-gray-600' : ''}
                  ${!slot.isBusinessDay ? 'bg-gray-850/70' : ''}
                `}
                style={{ width: `${slotWidth}px`, height: '40px' }}
              >
                <div className="text-xs text-center w-full flex flex-col justify-center h-full">
                  {slot.isStartOfMonth && (
                    <div className="font-semibold text-gray-300 whitespace-nowrap overflow-hidden">
                      {slot.monthName} {format(slot.date, 'yyyy')}
                    </div>
                  )}
                  {slot.isStartOfWeek && (
                    <div className="text-gray-400 mt-1 text-[10px]">
                      Week {slot.weekNumber}
                    </div>
                  )}
                  <div className="text-gray-400 text-[10px]">
                    {format(slot.date, 'MM/dd')}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Today indicator */}
          <div className="today-indicator absolute top-0 bottom-0 border-r-2 border-red-500 z-20 pointer-events-none">
            <div className="today-label bg-red-500 text-white text-xs px-1 py-0.5 absolute top-0 -left-10 whitespace-nowrap">
              Today
            </div>
          </div>
          
          {/* Manufacturing Bays */}
          <div className="manufacturing-bays mt-2">
            {bayTeams.map((team, teamIndex) => (
              <div 
                key={`team-${teamIndex}`} 
                className="team-container mb-5 relative"
                style={{
                  minWidth: `${Math.max(12000, differenceInDays(new Date(2030, 11, 31), dateRange.start) * (viewMode === 'day' ? slotWidth : slotWidth / 7))}px`
                }}>
                <div className="team-header bg-blue-900 text-white py-2 px-3 rounded-md mb-2 flex justify-between items-center shadow-md">
                  <div className="team-name font-bold text-lg flex items-center gap-2">
                    <span>Team {teamIndex + 1}: {team.map(b => b.name).join(' & ')}</span>
                    
                    {/* Team capacity indicators - MOVED INSIDE the team name box as requested */}
                    <div className="team-capacity-indicators flex items-center space-x-2 ml-3">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <div className="capacity-indicator flex items-center text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                              <Users className="h-3 w-3 mr-1" />
                              <span>
                                {scheduleBars.filter(bar => team.some(b => b.id === bar.bayId)).length} projects
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Number of projects assigned to this team</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <div className="utilization-indicator flex items-center text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                              <Zap className="h-3 w-3 mr-1" />
                              <span>
                                {Math.min(
                                  Math.round(
                                    (scheduleBars.filter(bar => team.some(b => b.id === bar.bayId)).length / 
                                    (team.length * 2)) * 100
                                  ), 
                                  100
                                )}% utilization
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Team capacity utilization percentage</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    
                    {/* Team Management Button */}
                    {team[0]?.team && (
                      <button 
                        className="p-1 bg-blue-700 hover:bg-blue-600 rounded-full text-white flex items-center justify-center"
                        onClick={() => {
                          const teamName = team[0].team;
                          if (teamName) {
                            setSelectedTeam(teamName);
                            setTeamDialogOpen(true);
                          }
                        }}
                      >
                        <Wrench className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  
                  {/* Empty div to keep layout spacing */}
                  <div></div>
                </div>
                
                {team.map((bay) => {
                  // Get all schedules for this bay
                  const baySchedules = scheduleBars.filter(bar => bar.bayId === bay.id);
                  
                  // Log row count for this bay
                  // In our simplified single-row model, we still maintain special treatment for TCV line
                  // BUT all bays use the single-row standard layout
                  const isMultiRowBay = false; // Always use single-row layout regardless of bay type
                  const rowCount = getBayRowCount(bay.id, bay.name);
                  console.log(`Bay ${bay.id} (${bay.name}): isMultiRowBay=${isMultiRowBay}, rowCount=${rowCount}, bayNumber=${bay.bayNumber}`);
                  
                  return (
                    <div 
                      key={`bay-${bay.id}`} 
                      className="bay-container relative mb-2 border rounded-md overflow-hidden"
                      style={{ 
                        height: `${rowHeight * rowCount}px`,
                        backgroundColor: bay.status === 'maintenance' ? 'rgba(250, 200, 200, 0.2)' : 'white'
                      }}
                    >
                      {/* Bay Label - Fixed to stay visible when scrolling horizontally */}
                      <div 
                        className="bay-label sticky left-0 w-48 h-full bg-gray-100 border-r flex flex-col justify-between py-2 px-2 z-10"
                      >
                        <div>
                          <div className="font-medium text-sm">{bay.name}</div>
                          <div className="text-xs text-gray-500">Bay #{bay.bayNumber}</div>
                          
                          {bay.status === 'maintenance' && (
                            <Badge variant="destructive" className="mt-1 text-[10px]">Maintenance</Badge>
                          )}
                          
                          {/* Show team info if available */}
                          {bay.team && (
                            <div className="text-xs text-primary mt-1">
                              Team: {bay.team}
                            </div>
                          )}
                          
                          {/* Edit, delete and team management buttons */}
                          <div className="bay-actions mt-2 flex space-x-1">
                            <button 
                              className="p-1 bg-gray-200 hover:bg-gray-300 rounded text-gray-700"
                              onClick={() => {
                                setEditingBay({...bay});
                                setNewBayDialog(true);
                              }}
                            >
                              <PencilIcon className="h-3 w-3" />
                            </button>
                            
                            {/* Team Management Button */}
                            {bay.team && (
                              <button
                                className="p-1 bg-blue-100 hover:bg-blue-200 rounded text-blue-700"
                                onClick={() => {
                                  setSelectedTeam(bay.team);
                                  setTeamDialogOpen(true);
                                }}
                              >
                                <Wrench className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {/* Bay status and capacity information - MOVED HERE as requested */}
                        <div className="flex flex-col gap-1 mt-auto">
                          {/* Bay status indicator - Fixed contrast issues */}
                          <div className={`status-badge flex items-center justify-center rounded-full py-1 px-2 text-xs ${
                            baySchedules.length > 0 ? 'bg-amber-200 text-amber-800' : 'bg-green-200 text-green-800'
                          }`}>
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {baySchedules.length > 0 ? 'Near Capacity' : 'Available'}
                          </div>
                          
                          {/* Project count - Fixed contrast issues */}
                          <div className="project-count bg-gray-200 text-gray-800 rounded-full py-1 px-2 text-xs flex items-center justify-center">
                            <Users className="h-3 w-3 mr-1" />
                            {baySchedules.length} {baySchedules.length === 1 ? 'project' : 'projects'}
                          </div>
                          
                          {/* Team capacity information - Fixed contrast issues */}
                          {bay.team && (
                            <div className="team-capacity bg-blue-200 text-blue-800 rounded-full py-1 px-2 text-xs flex items-center justify-center">
                              <Users className="h-3 w-3 mr-1" />
                              Team: {((bay.assemblyStaffCount || 2) + (bay.electricalStaffCount || 1)) * (bay.hoursPerPersonPerWeek || 29)} hrs/wk
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Bay content area - FULL WIDTH to extend to end of timeline (2030) */}
                      <div className="bay-content absolute left-48 top-0 bottom-0"
                        style={{ 
                          width: `${Math.max(8000, differenceInDays(new Date(2030, 11, 31), dateRange.start) * (viewMode === 'day' ? slotWidth : slotWidth / 7))}px` 
                        }}>
                        {isMultiRowBay ? (
                          <MultiRowBayContent 
                            timeSlots={slots} 
                            slotWidth={slotWidth}
                            bay={bay}
                            handleDragOver={handleDragOver}
                            handleDrop={handleDrop}
                            handleSlotDragOver={handleSlotDragOver}
                            handleSlotDrop={handleSlotDrop}
                            setDeleteRowDialogOpen={setDeleteRowDialogOpen}
                            handleRowDelete={handleDeleteRow}
                            handleRowAdd={handleRowAdd}
                            rowCount={getBayRowCount(bay.id, bay.name)}
                          />
                        ) : (
                          // SIMPLIFIED SINGLE-ROW LAYOUT - EACH BAY IS ONE ROW
                          <div className="absolute inset-0 flex flex-col">
                            {/* Single row per bay - simplified drop zone */}
                            <div 
                              className="h-full bay-row transition-colors hover:bg-gray-700/10 cursor-pointer relative" 
                              onDragOver={(e) => {
                                // Add strong visual indicator for this bay's single row
                                e.currentTarget.classList.add('row-target-highlight', 'bay-highlight');
                                // Always use row 0 for consistent placement
                                handleDragOver(e, bay.id, 0, 0);
                              }}
                              onDragLeave={(e) => {
                                // Remove the highlight when leaving this bay
                                e.currentTarget.classList.remove('row-target-highlight', 'bay-highlight');
                              }}
                              onDrop={(e) => {
                                // Prevent default browser handling
                                e.preventDefault();
                                
                                // ENSURE PIXEL-PERFECT POSITIONING IN SIMPLIFIED LAYOUT
                                // Guaranteed to place project exactly where user dropped it
                                const mouseX = e.clientX;
                                const rect = e.currentTarget.getBoundingClientRect();
                                const exactPosition = mouseX - rect.left;
                                
                                // Enhanced debugging with precise position data
                                console.log(`🎯 EXACT DROP: BAY ${bay.id} (${bay.name})`);
                                console.log(`🎯 Pixel position: x=${exactPosition}px from bay left edge`);
                                console.log(`🎯 Using single-row layout, placing in row 0`);
                                console.log(`⚠️ NO AUTO-ADJUSTMENT: Projects will stay EXACTLY where dropped`);
                                console.log(`⚠️ OVERLAP ALLOWED: Multiple projects can occupy the same space`);
                                
                                // Always use row 0 in the single-row team-based layout
                                const targetRow = 0;
                                
                                // Set data attributes for debugging
                                document.body.setAttribute('data-exact-pixel-position', exactPosition.toString());
                                document.body.setAttribute('data-drop-bay', bay.id.toString());
                                document.body.setAttribute('data-drop-row', '0');
                                
                                // Add visual indicator for debugging and user feedback
                                const indicator = document.createElement('div');
                                indicator.className = 'absolute bg-green-500/30 border border-green-500 px-2 py-1 text-xs font-bold text-white z-50 rounded';
                                indicator.style.top = '5px';
                                indicator.style.left = '5px';
                                indicator.textContent = `EXACT PLACEMENT: Bay ${bay.id} - Will NOT be auto-adjusted`;
                                e.currentTarget.appendChild(indicator);
                                
                                // Create placement marker at exact drop location
                                const marker = document.createElement('div');
                                marker.className = 'absolute w-2 h-10 bg-green-600 z-40 rounded';
                                marker.style.left = `${exactPosition}px`;
                                marker.style.top = '0px';
                                e.currentTarget.appendChild(marker);
                                
                                // Remove indicators after 2 seconds
                                setTimeout(() => {
                                  if (indicator.parentNode) indicator.parentNode.removeChild(indicator);
                                  if (marker.parentNode) marker.parentNode.removeChild(marker);
                                }, 2000);
                                
                                // Call handleDrop with the calculated parameters
                                // CRITICAL: This ensures exact placement with no auto-adjustment
                                handleDrop(e, bay.id, 0, targetRow);
                              }}
                            >
                              {/* Bay indicator */}
                              <div className="absolute -left-6 top-0 h-full opacity-70 pointer-events-none flex items-center justify-center">
                                <div className="bg-primary/20 rounded-md px-2 py-0.5 text-xs font-bold text-primary">
                                  B{bay.bayNumber}
                                </div>
                              </div>
                              
                              {/* Cell grid for this bay - EXTENDED TO 2030 PROPERLY */}
                              <div className="absolute inset-0 grid" 
                                style={{ 
                                  gridTemplateColumns: `repeat(${slots.length}, ${slotWidth}px)`,
                                  minWidth: `${Math.max(12000, differenceInDays(new Date(2030, 11, 31), dateRange.start) * (viewMode === 'day' ? slotWidth : slotWidth / 7))}px` 
                                }}>
                                {slots.map((slot, index) => (
                                  <div 
                                    key={`bay-${bay.id}-slot-${index}`} 
                                    className="relative h-full border-r border-gray-700/30"
                                    data-row="0"
                                    data-slot-index={index}
                                    data-date={format(slot.date, 'yyyy-MM-dd')}
                                    data-start-date={format(slot.date, 'yyyy-MM-dd')}
                                    data-bay-id={bay.id}
                                    data-row-index="0"
                                    data-exact-week="true"
                                    onDragOver={(e) => {
                                      // Prevent event from propagating to parent elements
                                      e.stopPropagation();
                                      
                                      // Store the row index and bay id in body attributes for the drop handler
                                      document.body.setAttribute('data-current-drag-row', '0');
                                      document.body.setAttribute('data-current-drag-bay', bay.id.toString());
                                      
                                      // Make sure the element has the correct bay ID
                                      if (e.currentTarget instanceof HTMLElement) {
                                        e.currentTarget.setAttribute('data-bay-id', bay.id.toString());
                                      }
                                      
                                      // Add highlight classes
                                      e.currentTarget.classList.add('cell-highlight');
                                      
                                      handleSlotDragOver(e, bay.id, 0, slot.date);
                                    }}
                                    onDragLeave={(e) => {
                                      // Remove highlight when leaving
                                      e.currentTarget.classList.remove('cell-highlight');
                                    }}
                                    onDrop={(e) => {
                                      // Use the data stored on the element for drop handling
                                      handleSlotDrop(e, bay.id, 0, slot.date);
                                    }}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Schedule Bars - these are positioned absolutely over the bays */}
                        {baySchedules.map(bar => {
                          // Verify row values are within valid range
                          const maxRowIndex = getBayRowCount(bay.id, bay.name) - 1;
                          if (bar.row !== undefined && bar.row > maxRowIndex) {
                            console.warn(`⚠️ Schedule ${bar.id} row value ${bar.row} is outside expected range 0-${maxRowIndex}, but keeping as-is per user request`);
                            // We will NOT reposition to a different row - user wants exact positioning
                          }
                          
                          // Get bay row count for positioning
                          const rowCount = getBayRowCount(bay.id, bay.name);
                          
                          // Log bar positioning for debugging
                          if (bay.id === bar.bayId) {
                            console.log(`🔒 POSITIONING BAR ${bar.id} in ${bay.name}`);
                            if (isMultiRowBay) {
                              console.log(`  - Row: ${bar.row} of ${rowCount} rows (multi-row bay)`);
                            } else {
                              console.log(`  - Row: ${bar.row} of ${rowCount} rows (standard bay)`);
                            }
                            console.log(`  - Database values: projectId=${bar.projectId}, bayId=${bar.bayId}, row=${bar.row}`);
                            console.log(`🔍 COMPLETE BAR DATA:`, JSON.stringify(bar, null, 2));
                          }
                          
                          return bar.bayId === bay.id && (
                            <div
                              key={`schedule-bar-${bar.id}`}
                              className={`schedule-bar absolute p-1 text-white text-xs rounded cursor-grab z-20 row-${bar.row}-bar`}
                              style={{
                                left: `${bar.left}px`,
                                width: `${bar.width}px`,
                                height: '160%', // Double the height of project bars
                                backgroundColor: `${bar.color}90`,
                                // Adjust vertical positioning for row layout
                                top: '-30%', // Shift up slightly to center better
                                // Set data attributes for department phase percentages 
                                // Store important info for drag/resize operations
                              }}
                              data-schedule-id={bar.id}
                              data-project-id={bar.projectId}
                              data-bay-id={bar.bayId}
                              data-row-index={bar.row}
                              data-fab-percentage={bar.fabPercentage}
                              data-paint-percentage={bar.paintPercentage}
                              data-production-percentage={bar.productionPercentage}
                              data-it-percentage={bar.itPercentage}
                              data-ntc-percentage={bar.ntcPercentage}
                              data-qc-percentage={bar.qcPercentage}
                              draggable
                              onDragStart={(e) => handleDragStart(e, bar.id)}
                              onDragEnd={handleDragEnd}
                            >
                              {/* Department phases visualization */}
                              <div className="phases-container flex h-full w-full absolute top-0 left-0 overflow-hidden rounded">
                                {bar.fabWidth && bar.fabWidth > 0 && (
                                  <div className="fab-phase bg-blue-700 h-full flex items-center justify-center" 
                                       style={{ width: `${bar.fabWidth}px` }}>
                                    <span className="text-xs font-bold text-white text-center">FAB</span>
                                  </div>
                                )}
                                {bar.paintWidth && bar.paintWidth > 0 && (
                                  <div className="paint-phase bg-green-700 h-full flex items-center justify-center" 
                                       style={{ width: `${bar.paintWidth}px` }}>
                                    <span className="text-xs font-bold text-white text-center">PAINT</span>
                                  </div>
                                )}
                                {bar.productionWidth && bar.productionWidth > 0 && (
                                  <div className="production-phase bg-yellow-700 h-full flex items-center justify-center" 
                                       style={{ width: `${bar.productionWidth}px` }}>
                                    <span className="text-xs font-bold text-gray-800 text-center">PROD</span>
                                  </div>
                                )}
                                {bar.itWidth && bar.itWidth > 0 && (
                                  <div className="it-phase bg-purple-700 h-full flex items-center justify-center" 
                                       style={{ width: `${bar.itWidth}px` }}>
                                    <span className="text-xs font-bold text-white text-center">IT</span>
                                  </div>
                                )}
                                {bar.ntcWidth && bar.ntcWidth > 0 && (
                                  <div className="ntc-phase bg-cyan-700 h-full flex items-center justify-center" 
                                       style={{ width: `${bar.ntcWidth}px` }}>
                                    <span className="text-xs font-bold text-white text-center">NTC</span>
                                  </div>
                                )}
                                {bar.qcWidth && bar.qcWidth > 0 && (
                                  <div className="qc-phase bg-pink-700 h-full flex items-center justify-center" 
                                       style={{ width: `${bar.qcWidth}px` }}>
                                    <span className="text-xs font-bold text-white text-center">QC</span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Project information overlay */}
                              <div className="project-info relative z-10 flex justify-between items-start h-full pointer-events-none">
                                <div className="ml-1 mt-1">
                                  <div className="font-bold truncate max-w-[120px]">{bar.projectNumber}</div>
                                  <div className="truncate max-w-[200px]">{bar.projectName}</div>
                                </div>
                                
                                {/* Delete button (appears on hover) */}
                                <button
                                  className="delete-button p-1 bg-red-500 hover:bg-red-600 rounded text-white pointer-events-auto opacity-0 hover:opacity-100 transition-opacity absolute top-1 right-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSchedule(bar.id);
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                              
                              {/* Resize handles */}
                              <div 
                                className="resize-handle-start absolute top-0 left-0 w-2 h-full cursor-ew-resize bg-blue-900/30 hover:bg-blue-900/50"
                                onMouseDown={(e) => handleResizeStart(e, bar, 'start')}
                              ></div>
                              <div 
                                className="resize-handle-end absolute top-0 right-0 w-2 h-full cursor-ew-resize bg-blue-900/30 hover:bg-blue-900/50"
                                onMouseDown={(e) => handleResizeStart(e, bar, 'end')}
                              ></div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Add Schedule Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Schedule</DialogTitle>
            <DialogDescription>
              Assign a project to a bay for a specific time period.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="project" className="text-right">
                Project
              </Label>
              <div className="col-span-3">
                <Input
                  id="project-search"
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mb-2"
                />
                
                {filteredProjects.length > 0 && (
                  <ScrollArea className="h-32 border rounded-md p-2">
                    {filteredProjects.map((project) => (
                      <div
                        key={project.id}
                        className={`py-1 px-2 cursor-pointer rounded hover:bg-gray-100 ${
                          currentProject === project.id ? 'bg-primary text-primary-foreground' : ''
                        }`}
                        onClick={() => setCurrentProject(project.id)}
                      >
                        <div className="font-medium">{project.projectNumber}</div>
                        <div className="text-sm">{project.name}</div>
                      </div>
                    ))}
                  </ScrollArea>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="bay" className="text-right">
                Bay
              </Label>
              <div className="col-span-3">
                <ScrollArea className="h-24 border rounded-md p-2">
                  {bays.map((bay) => (
                    <div
                      key={bay.id}
                      className={`py-1 px-2 cursor-pointer rounded hover:bg-gray-100 ${
                        targetBay === bay.id ? 'bg-primary text-primary-foreground' : ''
                      } ${bay.status === 'maintenance' ? 'opacity-50' : ''}`}
                      onClick={() => bay.status !== 'maintenance' && setTargetBay(bay.id)}
                    >
                      <div className="font-medium">{bay.name}</div>
                      <div className="text-sm">Bay #{bay.bayNumber}</div>
                      {bay.status === 'maintenance' && (
                        <Badge variant="destructive" className="mt-1">Maintenance</Badge>
                      )}
                    </div>
                  ))}
                </ScrollArea>
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="startDate" className="text-right">
                Start Date
              </Label>
              <div className="col-span-3">
                <Input
                  id="startDate"
                  type="date"
                  value={targetStartDate ? format(targetStartDate, 'yyyy-MM-dd') : ''}
                  onChange={(e) => setTargetStartDate(e.target.value ? new Date(e.target.value) : null)}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="duration" className="text-right">
                Duration (Weeks)
              </Label>
              <div className="col-span-3">
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  max="52"
                  value={scheduleDuration}
                  onChange={(e) => {
                    const duration = parseInt(e.target.value);
                    setScheduleDuration(duration);
                    
                    // Update end date based on duration
                    if (targetStartDate) {
                      setTargetEndDate(addWeeks(targetStartDate, duration));
                    }
                  }}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="endDate" className="text-right">
                End Date
              </Label>
              <div className="col-span-3">
                <Input
                  id="endDate"
                  type="date"
                  value={targetEndDate ? format(targetEndDate, 'yyyy-MM-dd') : ''}
                  onChange={(e) => setTargetEndDate(e.target.value ? new Date(e.target.value) : null)}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleAddSchedule}>
              Add Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Bay Edit/Create Dialog */}
      <Dialog open={newBayDialog} onOpenChange={setNewBayDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingBay && editingBay.id > 0 ? 'Edit Bay' : 'Create Bay'}</DialogTitle>
            <DialogDescription>
              {editingBay && editingBay.id > 0 
                ? 'Update the bay information.' 
                : 'Add a new manufacturing bay to the schedule.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="bayName" className="text-right">
                Name
              </Label>
              <div className="col-span-3">
                <Input
                  id="bayName"
                  value={editingBay?.name || ''}
                  onChange={(e) => setEditingBay(prev => prev ? {...prev, name: e.target.value} : null)}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="bayNumber" className="text-right">
                Bay #
              </Label>
              <div className="col-span-3">
                <Input
                  id="bayNumber"
                  type="number"
                  min="1"
                  value={editingBay?.bayNumber || 1}
                  onChange={(e) => setEditingBay(prev => prev ? {...prev, bayNumber: parseInt(e.target.value)} : null)}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="bayStatus" className="text-right">
                Status
              </Label>
              <div className="col-span-3">
                <select
                  id="bayStatus"
                  className="border rounded-md p-2 w-full"
                  value={editingBay?.status || 'active'}
                  onChange={(e) => setEditingBay(prev => prev ? {...prev, status: e.target.value as any} : null)}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="bayDescription" className="text-right">
                Description
              </Label>
              <div className="col-span-3">
                <Input
                  id="bayDescription"
                  value={editingBay?.description || ''}
                  onChange={(e) => setEditingBay(prev => prev ? {...prev, description: e.target.value} : null)}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="bayLocation" className="text-right">
                Location
              </Label>
              <div className="col-span-3">
                <Input
                  id="bayLocation"
                  value={editingBay?.location || ''}
                  onChange={(e) => setEditingBay(prev => prev ? {...prev, location: e.target.value} : null)}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="bayTeam" className="text-right">
                Team
              </Label>
              <div className="col-span-3">
                <Input
                  id="bayTeam"
                  value={editingBay?.team || ''}
                  onChange={(e) => setEditingBay(prev => prev ? {...prev, team: e.target.value} : null)}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setNewBayDialog(false)}>
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={editingBay?.id > 0 ? handleSaveBayEdit : handleCreateBay}
            >
              {editingBay?.id > 0 ? 'Save Changes' : 'Create Bay'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Row Confirmation Dialog */}
      <Dialog open={deleteRowDialogOpen && !!confirmRowDelete} onOpenChange={setDeleteRowDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Row</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete row {confirmRowDelete?.rowNumber} in {confirmRowDelete?.bayName}?
              {confirmRowDelete?.affectedProjects.length > 0 && (
                <div className="mt-2 text-destructive">
                  Warning: The following projects will be deleted from the schedule:
                  <ul className="list-disc pl-5 mt-1">
                    {confirmRowDelete?.affectedProjects.map(project => (
                      <li key={project.id}>{project.projectNumber} - {project.projectName}</li>
                    ))}
                  </ul>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => {
                setDeleteRowDialogOpen(false);
                setConfirmRowDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="destructive"
              onClick={() => {
                if (confirmRowDelete) {
                  handleDeleteRow(confirmRowDelete.bayId, confirmRowDelete.rowIndex);
                  setDeleteRowDialogOpen(false);
                  setConfirmRowDelete(null);
                }
              }}
            >
              Delete Row
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Team Management Dialog */}
      <TeamManagementDialog 
        open={teamDialogOpen}
        onOpenChange={setTeamDialogOpen}
        teamName={selectedTeam}
        bays={bays}
        onTeamUpdate={async (teamName, assemblyStaff, electricalStaff, hoursPerWeek) => {
          // After team capacity is updated, refresh the schedule data
          toast({
            title: "Team capacity updated",
            description: `Team ${teamName} capacity has been updated with ${assemblyStaff} assembly and ${electricalStaff} electrical staff.`
          });
          
          // Refresh schedule bars to reflect the new capacity settings
          // This would trigger a re-calculation of phase widths based on the new capacity
          const updatedScheduleBars = [...scheduleBars].map(bar => {
            // Update production phase width calculations for affected bars
            const bayBelongsToUpdatedTeam = bays.some(b => b.team === teamName && b.id === bar.bayId);
            if (bayBelongsToUpdatedTeam) {
              // Recalculate production phase width based on new capacity
              return {
                ...bar,
                // Flag for re-rendering and width recalculation
                normalizeFactor: Math.random()
              };
            }
            return bar;
          });
          
          setScheduleBars(updatedScheduleBars);
        }}
      />
      </div>
    </div>
  );
}

// For handleResizeStart
let initialStartDate: Date;
let initialEndDate: Date;