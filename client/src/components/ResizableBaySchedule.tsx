import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import MultiRowBayContent from './MultiRowBayContent';
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
  getDaysInMonth,
  isWithinInterval,
  parseISO
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
  PencilIcon, 
  PlusIcon, 
  MinusIcon,
  MinusCircle, // Added for remove bay button
  Users, 
  UserPlus,
  Zap, 
  Wrench, // Replacing Tool with Wrench
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Trash2, // For delete icon
  Truck,
  BarChart2 // Added for utilization icon
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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

// CALENDAR CORRECTION: Fixed 4-week offset in date display
const generateTimeSlots = (dateRange: { start: Date, end: Date }, viewMode: 'day' | 'week' | 'month' | 'quarter') => {
  const slots: TimeSlot[] = [];
  
  // OFFSET CORRECTION: Fix the 4-week offset by adjusting the starting date
  // This ensures dates align with the UI week headers
  let currentDate = new Date(2024, 0, 1); // January 1, 2024
  
  // Zero out time component
  currentDate.setHours(0, 0, 0, 0);
  
  // NEW CALIBRATION APPROACH
  // Instead of trying to adjust the timeline, let's use specific reference dates
  if (viewMode === 'week') {
    // Explicitly set to 4 weeks earlier than what we see in the UI
    // This ensures project 804666 scheduled for 5/5/2025 shows in the week of 5/5/2025 
    // and not 6/2/2025 as seen in the screenshot
    
    // CRITICAL: Set specific reference date - 11/06/2023 is well before any of our schedules
    // and allows us to build a consistent timeline
    currentDate = new Date(2023, 10, 6); // November 6, 2023 (Monday)
    
    // The date is already a Monday, so no need for additional adjustment
    console.log(`USING CALIBRATED REFERENCE DATE: ${format(currentDate, 'yyyy-MM-dd')}`);
    console.log(`This should fix the 4-week offset seen in the UI`);
  }
  
  // Keep the end date stable for grid consistency
  const forcedEndDate = new Date(2030, 11, 31); // December 31, 2030
  
  console.log(`⏱️ DATE GRID CORRECTION: Using ${format(currentDate, 'yyyy-MM-dd')} to ${format(forcedEndDate, 'yyyy-MM-dd')}`);
  console.log(`OFFSET FIX: Applied 4-week (-28 day) adjustment to correct date display`);
  
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
      // Always move exactly 7 days for week view to ensure ONE CELL = ONE WEEK
      currentDate = addDays(currentDate, 7);
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

// CRITICAL FIX: Global handler to ensure multiple projects can be placed in the same row
function initializeGlobalDragDropFix() {
  // Enable dropping anywhere by preventing default on all dragover events
  const handleGlobalDragOver = (e: DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
  };
  
  // Add a global handler for drops outside target areas
  const handleGlobalDrop = (e: DragEvent) => {
    const isOverDropTarget = 
      e.target instanceof Element && 
      (e.target.closest('.bay-row') || 
       e.target.closest('.week-cell') || 
       e.target.closest('.unassigned-drop-container') ||
       e.target.closest('.droppable-slot'));
       
    if (!isOverDropTarget) {
      e.preventDefault();
      console.log('Global drop handler caught a drop outside of designated drop zones');
    }
  };
  
  // Add global listeners
  document.addEventListener('dragover', handleGlobalDragOver, true);
  document.addEventListener('drop', handleGlobalDrop, false);
  
  // Enable special styling
  document.body.classList.add('allow-multiple-projects');
  document.body.classList.add('force-accept-drop');
  
  console.log('🔒 MAXIMUM DRAG-DROP OVERRIDE ACTIVE - Projects can now be placed anywhere without restrictions');
  
  return () => {
    document.removeEventListener('dragover', handleGlobalDragOver, true);
    document.removeEventListener('drop', handleGlobalDrop, false);
    document.body.classList.remove('allow-multiple-projects');
    document.body.classList.remove('force-accept-drop');
  };
}

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
  
  // Team name inline editing states
  const [editingTeamId, setEditingTeamId] = useState<string>('');
  const [editingTeamName, setEditingTeamName] = useState<string>('');
  
  // State for team deletion confirmation
  const [teamDeleteConfirm, setTeamDeleteConfirm] = useState<{isOpen: boolean; teamName: string; bayIds: number[]}>({
    isOpen: false,
    teamName: '',
    bayIds: []
  });
  
  // Map of team descriptions (could be fetched from API in real app)
  const [teamDescriptions, setTeamDescriptions] = useState<Record<string, string>>({
    'General': 'Main production team',
    'ISG': 'Integrated Systems Group',
    'TCV': 'Tactical Combat Vehicles',
    'Electrical': 'Power and electrical systems',
    'Assembly': 'Final assembly and testing',
    'Bay 1 & 2 & Bay 3 & 4': 'General production and testing',
    'Bay 5 & 6': 'Vehicle interiors and electrical systems',
    'Bay 7 & 8': 'Military vehicle conversions',
    'Bay 9 & 10 (ISG)': 'Advanced systems integration',
    'Bay 11 & 12': 'Quality control and finalization',
    'TCV Line': 'Tactical vehicle production line',
    'TCV Line 2': 'Second tactical vehicle line'
  });
  
  // Handler function to update team names
  const handleTeamNameUpdate = async (oldTeamName: string, newTeamName: string) => {
    if (oldTeamName === newTeamName || !newTeamName.trim()) {
      // No change or empty name, just exit
      return;
    }
    
    try {
      // Keep track of the team description
      const description = teamDescriptions[oldTeamName] || '';
      
      // Update all bays with this team name
      const updatedBays = await Promise.all(
        bays.filter(bay => bay.team === oldTeamName).map(async (bay) => {
          // Call the API to update each bay
          const updatedBay = await onBayUpdate?.(bay.id, {
            ...bay,
            team: newTeamName
          });
          return updatedBay;
        })
      );
      
      // Update the team description in our local state
      setTeamDescriptions(prev => {
        const newDescriptions = {...prev};
        if (oldTeamName in newDescriptions) {
          // Transfer the description to the new team name
          newDescriptions[newTeamName] = description;
          // Remove the old team name if it's different
          if (oldTeamName !== newTeamName) {
            delete newDescriptions[oldTeamName];
          }
        }
        return newDescriptions;
      });
      
      // Show success toast
      toast({
        title: "Team Updated",
        description: `Team name changed from "${oldTeamName}" to "${newTeamName}"`,
      });
      
      // Force a refresh of the UI
      setForceUpdate(Date.now());
      
    } catch (error) {
      console.error('Error updating team name:', error);
      toast({
        title: "Error",
        description: "Failed to update team name",
        variant: "destructive"
      });
    }
  };
  
  // Function to handle team deletion
  const handleTeamDelete = async (teamName: string, bayIds: number[]) => {
    try {
      console.log(`Deleting team "${teamName}" from bays: ${bayIds.join(', ')}`);
      
      // For direct UI feedback, hide the team section immediately by adding a class
      // This provides visual feedback before the actual database update completes
      const teamSectionSelector = `[data-team-section="${teamName}::${bayIds.join(',')}"]`;
      const teamSectionElement = document.querySelector(teamSectionSelector);
      
      if (teamSectionElement) {
        // Mark for deletion with a style effect
        teamSectionElement.classList.add('opacity-50', 'relative');
        const overlay = document.createElement('div');
        overlay.className = 'absolute inset-0 bg-red-500 bg-opacity-20 z-50';
        teamSectionElement.appendChild(overlay);
      }
      
      // Track success of each bay update
      let successCount = 0;
      
      try {
        // Perform the actual database updates directly with individual requests
        for (const bayId of bayIds) {
          console.log(`Removing team "${teamName}" from bay ${bayId}`);
          
          try {
            // Clear the team field for this bay
            const response = await fetch(`/api/manufacturing-bays/${bayId}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                team: null,
                description: null
              })
            });
            
            if (response.ok) {
              successCount++;
              console.log(`Successfully updated bay ${bayId}`);
            } else {
              console.error(`Failed to update bay ${bayId}: ${response.statusText}`);
            }
          } catch (err) {
            console.error(`Error updating bay ${bayId}:`, err);
          }
          
          // Small delay between requests
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Remove from team descriptions
        setTeamDescriptions(prev => {
          const newDescriptions = {...prev};
          if (teamName in newDescriptions) {
            delete newDescriptions[teamName];
          }
          return newDescriptions;
        });
        
        // If we've updated at least one bay successfully, consider it a success
        if (successCount > 0) {
          toast({
            title: "Team Deleted",
            description: `Successfully removed "${teamName}" team from ${successCount} bay(s)`,
          });
          
          // Close the dialog
          setTeamDeleteConfirm({
            isOpen: false,
            teamName: '',
            bayIds: []
          });
          
          // Now reload the page for a complete refresh - this is the most reliable way
          // to ensure the UI fully reflects the database state
          console.log("Scheduling page reload after team deletion...");
          setTimeout(() => {
            window.location.href = window.location.href;
          }, 1200);
        } else {
          // No bays were updated successfully
          throw new Error("Failed to update any bays");
        }
      } catch (apiError) {
        console.error('API error when deleting team:', apiError);
        throw apiError;
      }
    } catch (error) {
      console.error('Error deleting team:', error);
      toast({
        title: "Error",
        description: "Failed to delete team. Please try again.",
        variant: "destructive"
      });
      
      // Reset delete confirmation dialog
      setTeamDeleteConfirm({
        isOpen: false,
        teamName: '',
        bayIds: []
      });
    }
  };
  
  // Handler function for when team data is updated from TeamManagementDialog
  const handleTeamUpdate = async (teamName: string, newTeamName: string, description: string, assemblyStaff: number, electricalStaff: number, hoursPerWeek: number) => {
    try {
      console.log(`Updating team from "${teamName}" to "${newTeamName}" with description: "${description}"`);
      
      // Update team descriptions immediately in local state
      const newDescriptions = {...teamDescriptions};
      newDescriptions[newTeamName] = description; 
      
      // If team name changed, remove old entry
      if (teamName !== newTeamName && teamName in newDescriptions) {
        delete newDescriptions[teamName];
      }
      
      // Update state with new values
      setTeamDescriptions(newDescriptions);
      
      // Always reload fresh data from API after any team update
      try {
        console.log("Fetching fresh bay data after team update");
        const response = await fetch('/api/manufacturing-bays');
        if (response.ok) {
          const freshBays = await response.json();
          console.log("Received fresh bay data:", freshBays.length, "bays after team update");
          
          // Always force a full page refresh after team updates
          // This ensures all UI elements are properly updated with the latest data
          console.log("Forcing page refresh to update UI with latest team data");
          setTimeout(() => {
            window.location.reload();
          }, 500);
        }
      } catch (err) {
        console.error("Error refreshing bay data:", err);
        // Force refresh even if API fetch failed as a fallback
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    } catch (error) {
      console.error('Error in handleTeamUpdate:', error);
      // Show error toast
      toast({
        title: "Update failed",
        description: "There was an error updating the team. Please try again.",
        variant: "destructive",
      });
    }
  };
  // Add forceUpdate state to force re-rendering when needed
  const [forceUpdate, setForceUpdate] = useState<number>(Date.now());
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
  const [sidebarOpen, setSidebarOpen] = useState(true); // For collapsible sidebar
  const [targetBay, setTargetBay] = useState<number | null>(null);
  const [targetStartDate, setTargetStartDate] = useState<Date | null>(null);
  const [targetEndDate, setTargetEndDate] = useState<Date | null>(null);
  const [scheduleDuration, setScheduleDuration] = useState(4); // in weeks
  const [rowHeight, setRowHeight] = useState(60); // Height of each row in pixels
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
  
  // Group bays by team name - this is the key to preventing duplicate blue headers
  const bayTeams = useMemo(() => {
    // First sort all bays by their bay number
    const sortedBays = [...bays].sort((a, b) => a.bayNumber - b.bayNumber);
    
    // Group bays by their team property using a string key in a dictionary
    const teamMap: Record<string, ManufacturingBay[]> = {};
    
    // ONLY include bays that have an actual team assigned 
    // This completely eliminates phantom teams from the UI
    const assignedTeamBays = sortedBays.filter(bay => 
      bay.team !== null && 
      bay.team !== undefined && 
      bay.team !== '' && 
      // Specifically filter out any bays with auto-generated "Team X:" names
      !bay.team.match(/^Team \d+:?/)
    );
    
    // Process each bay with a valid team and group it
    assignedTeamBays.forEach(bay => {
      // Use the team name as the key for grouping
      const teamKey = bay.team || '';
      
      // Initialize the array for this team if it doesn't exist yet
      if (!teamMap[teamKey]) {
        teamMap[teamKey] = [];
      }
      
      // Add this bay to its team group
      teamMap[teamKey].push(bay);
    });
    
    // Convert the team map to an array of bay arrays (each sub-array = one team)
    const teams = Object.values(teamMap);
    
    // Sort teams by the lowest bay number in each team (for consistent ordering)
    teams.sort((a, b) => {
      const minBayNumberA = Math.min(...a.map(bay => bay.bayNumber));
      const minBayNumberB = Math.min(...b.map(bay => bay.bayNumber));
      return minBayNumberA - minBayNumberB;
    });
    
    console.log("Active teams found:", teams.map(team => team[0]?.team).join(", "));
    
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
      
      // IMPORTANT FIX: Explicitly handle each date format possibility
      // This ensures schedules appear in their correct position on the timeline
      let startDate: Date, endDate: Date;
      
      // Start date handling
      if (typeof schedule.startDate === 'string') {
        // For string dates, parse without timezone influence
        startDate = parseISO(schedule.startDate.split('T')[0]);
      } else if (schedule.startDate instanceof Date) {
        // For Date objects, create a new date to avoid reference issues
        startDate = new Date(schedule.startDate.getFullYear(), schedule.startDate.getMonth(), schedule.startDate.getDate());
      } else {
        // Fallback for any other case
        console.warn(`Unusual date format for schedule ${schedule.id}, using current date as fallback`);
        startDate = new Date();
      }
      
      // End date handling with the same careful approach
      if (typeof schedule.endDate === 'string') {
        endDate = parseISO(schedule.endDate.split('T')[0]);
      } else if (schedule.endDate instanceof Date) {
        endDate = new Date(schedule.endDate.getFullYear(), schedule.endDate.getMonth(), schedule.endDate.getDate());
      } else {
        // Fallback case
        console.warn(`Unusual end date format for schedule ${schedule.id}, using start date + 30 days as fallback`);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 30);
      }
      
      console.log(`Parsing schedule ${schedule.id} dates (fixed version):`, {
        originalStartDate: schedule.startDate,
        originalEndDate: schedule.endDate,
        fixedStartDate: format(startDate, 'yyyy-MM-dd'),
        fixedEndDate: format(endDate, 'yyyy-MM-dd')
      });
      
      // FIXED DATE POSITION CALCULATION - Direct fix for date alignment
      // Instead of calculating based on dateRange.start, use our known starting position
      // This ensures the dates in UI match the database dates exactly
      
      // Calculate days from our fixed Jan 1, 2024 reference point
      const calendarStartDate = new Date(2024, 0, 1);
      
      // Calculate position using the fixed reference date
      const daysFromStart = differenceInDays(startDate, calendarStartDate);
      
      // Go back to a simpler approach that works
      // Calculate position from start date with a fixed offset
      // Based on what we've learned through testing
      const daysOffset = viewMode === 'week' ? 28 : 0; // 4 weeks of offset for weekly view
      const fixedDaysFromStart = daysFromStart + daysOffset;
      const left = fixedDaysFromStart * pixelsPerDay;
      
      console.log(`Schedule ${schedule.id} position fix:`, {
        date: format(startDate, 'yyyy-MM-dd'),
        daysFromJan2024: daysFromStart,
        adjustedDays: fixedDaysFromStart,
        pixelPosition: left
      });
      
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
  
  // Auto-scroll to center the red TODAY line in the viewport by finding it visually
  useEffect(() => {
    // Wait for rendering to complete
    const scrollTimeout = setTimeout(() => {
      // Get the viewport element
      const viewportEl = viewportRef.current;
      
      if (!viewportEl) {
        console.error('Could not find viewport element');
        return;
      }
      
      try {
        // Find the red TODAY line directly in the DOM
        // This looks for any element with 'today-line' or 'today-marker' class
        // or any element with red background color that might be the marker
        const findTodayLine = () => {
          // Try different selectors to find the today line
          const selectors = [
            '.today-line', 
            '.today-marker', 
            '.today-indicator',
            '[data-today="true"]', 
            '.timeline-container [style*="background-color: rgba(239, 68, 68"]',
            '.timeline-container [style*="background: rgba(239, 68, 68"]',
            '.timeline-container [style*="background-color: rgb(239, 68, 68"]',
            '.timeline-container [style*="background: rgb(239, 68, 68"]',
            '.today'
          ];
          
          // Try each selector
          for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
              console.log(`Found today line using selector: ${selector}`);
              return element;
            }
          }
          
          // If we couldn't find it with selectors, look for any red element
          const allElements = document.querySelectorAll('*');
          for (const el of allElements) {
            if (el instanceof HTMLElement) {
              const style = window.getComputedStyle(el);
              const bgColor = style.backgroundColor;
              // Check if it's a red element (rough check for red-ish colors)
              if (
                (bgColor.includes('rgb(239, 68, 68)') || 
                bgColor.includes('rgb(255, 0, 0)') || 
                bgColor.includes('rgb(220, 38, 38)') ||
                el.classList.contains('bg-red-500')) &&
                el.offsetHeight > 40 // Likely a vertical line
              ) {
                console.log('Found today line by color analysis');
                return el;
              }
            }
          }
          
          return null;
        };
        
        // Find the today line
        const todayLine = findTodayLine();
        
        if (todayLine) {
          // Get the position of the today line
          const rect = todayLine.getBoundingClientRect();
          const containerRect = viewportEl.getBoundingClientRect();
          
          // Calculate the today line's position relative to the viewport
          const todayPosition = rect.left + viewportEl.scrollLeft - containerRect.left;
          
          console.log(`Found Today line at position: ${todayPosition}px`);
          
          // Center it in the viewport
          const viewportWidth = viewportEl.clientWidth;
          const scrollPosition = Math.max(0, todayPosition - (viewportWidth / 2));
          
          console.log(`Auto-scrolling to position ${scrollPosition}px to center the today line`);
          
          // Smooth scroll to center the today line
          viewportEl.scrollTo({
            left: Math.floor(scrollPosition),
            behavior: 'smooth'
          });
          
          // Enhance visibility of today line
          if (todayLine instanceof HTMLElement) {
            todayLine.style.boxShadow = '0 0 12px 3px rgba(239, 68, 68, 0.8)';
            todayLine.style.zIndex = '1000';
            todayLine.style.transition = 'all 0.3s ease-in-out';
            
            // Quick pulsing animation to draw attention
            setTimeout(() => {
              if (todayLine instanceof HTMLElement) {
                todayLine.style.boxShadow = '0 0 20px 5px rgba(239, 68, 68, 0.9)';
                setTimeout(() => {
                  todayLine.style.boxShadow = '0 0 8px 2px rgba(239, 68, 68, 0.7)';
                }, 500);
              }
            }, 300);
            
            console.log('Successfully centered and highlighted the TODAY line');
          }
        } else {
          // Fallback: If we can't find the today line, use a hardcoded approach
          // Week 20 of 2025 (May 12-18, 2025)
          console.log("Couldn't find today line visually, using fixed position for Week 20 (May 2025)");
          
          const weekIndex = 19; // 0-indexed, Week 20
          const todayPosition = (weekIndex * slotWidth) + ((4/7) * slotWidth) + 200; // Friday of Week 20
          
          const viewportWidth = viewportEl.clientWidth;
          const scrollPosition = Math.max(0, todayPosition - (viewportWidth / 2));
          
          viewportEl.scrollTo({
            left: Math.floor(scrollPosition),
            behavior: 'smooth'
          });
        }
      } catch (error) {
        console.error('Error during auto-scroll:', error);
      }
    }, 1000); // Longer timeout to ensure everything is rendered
    
    return () => clearTimeout(scrollTimeout);
  }, [viewportRef, slotWidth]);
  
  // Drag handling functions
  const handleDragStart = (e: React.DragEvent, scheduleId: number) => {
    // Find the specific schedule bar to get its details
    const bar = scheduleBars.find((b) => b.id === scheduleId);
    if (!bar) {
      console.error('Could not find schedule bar with ID', scheduleId);
      return;
    }

    // Store the schedule ID as plain text (primary data)
    e.dataTransfer.setData('text/plain', scheduleId.toString());
    
    // Also store as JSON with complete data (enhanced data)
    const dragData = {
      scheduleId: bar.id,
      projectId: bar.projectId,
      bayId: bar.bayId,
      startDate: format(bar.startDate, 'yyyy-MM-dd'),
      endDate: format(bar.endDate, 'yyyy-MM-dd'),
      totalHours: bar.totalHours,
      projectName: bar.projectName,
      projectNumber: bar.projectNumber
    };
    
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'move';
    
    // Set global state
    setDraggingSchedule(scheduleId);
    
    // Add enhanced visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.classList.add('dragging');
      document.body.classList.add('dragging-active');
      
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
    // Always prevent default to allow dropping
    e.preventDefault();
    
    // Set appropriate drop effect based on what's being dragged
    try {
      const dataString = e.dataTransfer.getData('text/plain');
      if (dataString.startsWith('-') || document.body.classList.contains('dragging-unassigned-project')) {
        // This is an unassigned project
        e.dataTransfer.dropEffect = 'copy';
      } else {
        // This is an existing schedule being moved
        e.dataTransfer.dropEffect = 'move';
      }
    } catch (err) {
      // Default to move if we can't determine
      e.dataTransfer.dropEffect = 'move';
    }
    
    // Update the drop target for visual feedback
    setDropTarget({ bayId, rowIndex });
    
    // Add visual indicator for drop target
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.classList.add('drop-target-active');
      
      // Find parent bay container for additional highlighting
      let parent = e.currentTarget.parentElement;
      while (parent && !parent.classList.contains('bay-container')) {
        parent = parent.parentElement;
      }
      
      if (parent) {
        parent.classList.add('active-drop-area');
      }
    }
  };
  
  const handleSlotDragOver = (e: React.DragEvent, bayId: number, rowIndex: number, date: Date) => {
    // CRITICAL: Always call preventDefault() to allow dropping
    e.preventDefault();
    
    // FORCE-ACCEPT ALL DROPS
    e.stopPropagation();
    
    // Force the cursor to always show "move" and never "no-drop"
    e.dataTransfer.dropEffect = 'move';
    
    console.log(`✅ DRAG OVER: Bay ${bayId}, Row ${rowIndex}, Date ${format(date, 'yyyy-MM-dd')}`);
    console.log(`✅ DROP TARGET ACTIVE: Cell accepting drop`);
    
    // Update drop target info
    setDropTarget({ bayId, rowIndex });
    
    // Visually highlight the drop zone
    if (e.currentTarget instanceof HTMLElement) {
      // Add highlight classes
      e.currentTarget.classList.add('drop-target');
      e.currentTarget.classList.add('force-accept-drop');
      
      // Set critical data attributes needed for drop acceptance
      e.currentTarget.setAttribute('data-drop-enabled', 'true');
      e.currentTarget.setAttribute('data-overlap-allowed', 'true');
      e.currentTarget.setAttribute('data-bay-id', bayId.toString());
      e.currentTarget.setAttribute('data-row-index', rowIndex.toString());
      
      // Force the parent elements to accept drops too
      let parent = e.currentTarget.parentElement;
      while (parent) {
        parent.classList.add('force-accept-drop');
        parent.setAttribute('data-drop-enabled', 'true');
        parent = parent.parentElement;
      }
      
      // Ensure the body has the special class for CSS rules
      document.body.classList.add('allow-multiple-projects');
      document.body.classList.add('force-accept-drop');
    }
  };
  
  const handleDragEnd = (e: React.DragEvent) => {
    // Reset all dragging state
    setDraggingSchedule(null);
    setDropTarget(null);
    
    // Remove any visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.classList.remove('dragging');
    }
    
    // Clear global states
    document.body.classList.remove('dragging-active');
    
    // Remove highlights from all potential drop targets
    document.querySelectorAll('.drop-target').forEach((el) => {
      el.classList.remove('drop-target');
    });
    
    // Remove highlights from bay rows and other drop areas
    document.querySelectorAll('.row-target-highlight, .bay-highlight').forEach((el) => {
      el.classList.remove('row-target-highlight', 'bay-highlight');
    });
    
    console.log('Drag operation completed, all states cleared');
  };
  
  const handleDrop = async (e: React.DragEvent, bayId: number, slotIndex: number, rowIndex: number) => {
    e.preventDefault();
    console.log(`DROP DEBUG: handleDrop called with bayId=${bayId}, slotIndex=${slotIndex}, rowIndex=${rowIndex}`);
    
    // Try to get the data in both formats - we support both scheduled items and unassigned projects
    const dataString = e.dataTransfer.getData('text/plain');
    const jsonData = e.dataTransfer.getData('application/json');
    
    try {
      // First, check if this is an unassigned project (identifier starts with -)
      if (dataString.startsWith('-')) {
        // Handle drop of an unassigned project
        const projectId = parseInt(dataString.substring(1), 10);
        console.log(`DROP DEBUG: Adding NEW project ID ${projectId} to schedule in bay ${bayId}`);
        
        // Find the project to get its details
        const project = projects.find(p => p.id === projectId);
        if (!project) {
          console.error('DROP ERROR: Could not find project with ID', projectId);
          return;
        }
        
        // Get date at drop position
        const targetDate = getDateFromDropPosition(e, bayId, rowIndex);
        if (!targetDate) {
          console.error('DROP ERROR: Could not determine target date for drop');
          return;
        }
        
        // Calculate default duration (4 weeks for new projects)
        const defaultDuration = scheduleDuration || 4; // in weeks
        const endDate = addWeeks(targetDate, defaultDuration);
        
        // Default hours calculation (use project.totalHours if available, otherwise estimate)
        const totalHours = project.totalHours || 1200; // Default to 1200 hours if not set
        
        // Format dates for API
        const formattedStartDate = format(targetDate, 'yyyy-MM-dd');
        const formattedEndDate = format(endDate, 'yyyy-MM-dd');
        
        console.log(`⚠️ CREATING NEW SCHEDULE: Project ${project.name}`);
        console.log(`⚠️ Bay: ${bayId}, Row: ${rowIndex}`);
        console.log(`⚠️ Dates: ${formattedStartDate} to ${formattedEndDate}`);
        
        // Create a new schedule with the project
        await onScheduleCreate(
          projectId,
          bayId,
          formattedStartDate,
          formattedEndDate,
          totalHours,
          rowIndex
        );
        
        // Show success toast
        toast({
          title: "Project scheduled",
          description: `${project.name} added to ${bays.find(b => b.id === bayId)?.name || 'Bay ' + bayId}`,
        });
        
        return;
      }
      
      // If it's not an unassigned project, it must be an existing schedule being moved
      let scheduleId: number;
      let bar: ScheduleBar | undefined;
      
      // Try to get complete data from JSON if available
      if (jsonData) {
        try {
          const parsedData = JSON.parse(jsonData);
          scheduleId = parsedData.scheduleId;
          console.log('Using complete JSON data for drag operation:', parsedData);
        } catch (e) {
          // Fallback to text data if JSON parsing fails
          scheduleId = parseInt(dataString, 10);
        }
      } else {
        // Use plain text data
        scheduleId = parseInt(dataString, 10);
      }
      
      console.log(`DROP DEBUG: Moving EXISTING schedule ID ${scheduleId}`);
      
      // Find the schedule bar being moved
      bar = scheduleBars.find((b) => b.id === scheduleId);
      if (!bar) {
        console.error('DROP ERROR: Could not find schedule bar with ID', scheduleId);
        return;
      }
      
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
    // This is critical - ALWAYS prevent default to allow the drop
    e.preventDefault();
    
    // STOP PROPAGATION to ensure no parent elements interfere
    e.stopPropagation();
    
    // Clear any drag state from the document
    document.body.removeAttribute('data-drag-in-progress');
    document.body.classList.remove('global-drag-active');
    
    // Get data from the drop event
    const dataString = e.dataTransfer.getData('text/plain');
    console.log(`📦 RAW DRAG DATA: "${dataString}"`);
    
    // EXTENDED DEBUG LOGGING - to track exactly what's happening
    console.log(`🎯 DROP SUCCESSFUL: Bay ${bayId}, Row ${rowIndex}, Date ${format(date, 'yyyy-MM-dd')}`);
    console.log(`🎯 DROP TARGET: BAY ${bayId} (${bays.find(b => b.id === bayId)?.name})`);
    console.log(`🎯 EXACT COORDINATES: x=${e.nativeEvent.offsetX}px, y=${e.nativeEvent.offsetY}px`);
    console.log(`🎯 PLACEMENT: Row ${rowIndex} - NO POSITION RESTRICTIONS`);
    console.log(`⚠️ CRITICAL POLICY: Projects placed EXACTLY where dropped - NO AUTO-ADJUSTMENT`);
    console.log(`⚠️ CRITICAL POLICY: Multiple projects ALLOWED in same row - OVERLAPS PERMITTED`);
    
    // Check for unassigned project identifier format (begins with a minus sign)
    const isNegativeFormat = dataString.startsWith('-');
    const scheduleId = parseInt(dataString, 10);
    
    // Check if this is a NEW project being created (negative ID) or existing schedule
    const isNewProject = isNegativeFormat || scheduleId < 0;
    
    if (isNewProject) {
      // This is a new project being added from the unassigned projects list
      const projectId = Math.abs(scheduleId);
      console.log(`🆕 Creating NEW SCHEDULE for project ID ${projectId} in bay ${bayId} at row ${rowIndex}`);
      
      // Find the project data
      const project = projects.find(p => p.id === projectId);
      if (!project) {
        // Attempt to recover from sessionStorage if project data is not found
        try {
          const storedProject = JSON.parse(sessionStorage.getItem('dragging_project') || '{}');
          if (storedProject && storedProject.id === projectId) {
            console.log(`🔄 Recovered project data from session storage: ${storedProject.name}`);
            // Use the stored project data
            // Continue with the scheduling creation
          } else {
            console.error('❌ Cannot find project with ID', projectId);
            return;
          }
        } catch (error) {
          console.error('❌ Cannot find project with ID', projectId);
          return;
        }
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
      
      // Find the closest date column based on mouse position
      const allDateCells = document.querySelectorAll(`[data-bay-id="${bayId}"][data-date]`);
      if (allDateCells && allDateCells.length > 0) {
        // Find the closest date cell to the drop position
        let closestCell = null;
        let minDistance = Infinity;
        
        allDateCells.forEach(cell => {
          const cellRect = (cell as HTMLElement).getBoundingClientRect();
          const cellCenterX = cellRect.left + (cellRect.width / 2);
          const distance = Math.abs(e.clientX - cellCenterX);
          
          if (distance < minDistance) {
            minDistance = distance;
            closestCell = cell;
          }
        });
        
        if (closestCell) {
          const dateAttr = closestCell.getAttribute('data-date');
          if (dateAttr) {
            console.log(`🎯 DROP DEBUG: Using date from closest cell: ${dateAttr} (distance: ${minDistance}px)`);
            return new Date(dateAttr);
          }
        }
      }
      
      // Fall back to pixel-based calculation if no cells found
      // Get the offset from the start of the timeline (left edge) 
      const timelineX = e.clientX - timelineRect.left - 32; // Adjust for bay label width
      
      // Make sure we have a positive value
      const adjustedX = Math.max(0, timelineX);
      
      // Calculate date based on slot width with precise positioning
      const dayWidth = viewMode === 'day' ? slotWidth : slotWidth / 7;
      
      // Calculate the day offset based on pixels
      const dayOffset = adjustedX / dayWidth;
      console.log(`📏 DROP DEBUG: Improved calculation - timelineX: ${timelineX}px, adjustedX: ${adjustedX}px, dayWidth: ${dayWidth}px, dayOffset: ${dayOffset} days`);
      
      // Get the exact date
      const exactDate = addDays(dateRange.start, Math.floor(dayOffset));
      console.log(`📅 DROP DEBUG: Target date: ${format(exactDate, 'yyyy-MM-dd')}`);
      
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
      // Check if we're creating a team (has team name and no ID)
      const isTeamCreation = editingBay.team && !editingBay.id;
      
      // Make sure we have valid staff counts
      const updatedData = {
        ...editingBay,
        staffCount: (editingBay.assemblyStaffCount || 0) + (editingBay.electricalStaffCount || 0),
      };
      
      console.log('Creating bay/team with data:', updatedData);
      
      // Create the bay using the parent component's callback
      const newBay = await onBayCreate(updatedData);
      
      // Show appropriate success toast
      if (isTeamCreation) {
        toast({
          title: "Team created",
          description: `Team "${editingBay.team}" with bay "${editingBay.name}" has been created.`,
        });
        
        // If we created a team, update team descriptions
        if (editingBay.team && editingBay.description) {
          const newDescriptions = {...teamDescriptions};
          newDescriptions[editingBay.team] = editingBay.description;
          setTeamDescriptions(newDescriptions);
        }
      } else {
        toast({
          title: "Bay created",
          description: `${editingBay.name} has been created.`,
        });
      }
      
      // Reset dialog state
      setNewBayDialog(false);
      setEditingBay(null);
      
      // Fetch fresh data from API
      console.log("Fetching fresh bay data after creation");
      try {
        const response = await fetch('/api/manufacturing-bays');
        if (response.ok) {
          const freshBays = await response.json();
          
          // Update bays with fresh data
          console.log("Received fresh bay data:", freshBays.length, "bays");
          
          // Force a full page refresh to ensure proper rendering
          // This is more reliable than trying to update state directly
          setTimeout(() => {
            window.location.reload();
          }, 500);
        }
      } catch (err) {
        console.error("Error refreshing bay data:", err);
      }
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
  // When forceUpdate changes, this will recalculate and update the UI
  const unassignedProjects = useMemo(() => {
    console.log('⚡ Recalculating unassigned projects list');
    // Make sure projects array exists before filtering
    if (!projects || !Array.isArray(projects)) return [];
    
    return projects.filter(project => 
      !schedules.some(schedule => schedule.projectId === project.id)
    );
  }, [projects, schedules, forceUpdate]);
  
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
              className="bg-blue-700 hover:bg-blue-600 p-1 rounded"
              onClick={() => {
                // Set up a new team creation dialog
                const teamName = "New Team";
                const highestBayNumber = Math.max(...bays.map(b => b.bayNumber));
                
                // Create a new bay with the team name
                setNewBayDialog(true);
                setEditingBay({
                  id: 0,
                  name: `${teamName} Bay 1`,
                  bayNumber: highestBayNumber + 1,
                  status: 'active',
                  description: 'Manufacturing Team',
                  location: null,
                  team: teamName, // Important - this assigns the bay to the new team
                  capacityTonn: null,
                  maxWidth: null,
                  maxHeight: null,
                  maxLength: null,
                  teamId: null,
                  createdAt: null,
                  updatedAt: null,
                  assemblyStaffCount: 4,
                  electricalStaffCount: 2,
                  hoursPerPersonPerWeek: 40
                });
              }}
            >
              <div className="flex items-center text-white">
                <PlusIcon className="h-4 w-4" />
                <span className="text-sm ml-1">Team</span>
              </div>
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex flex-row flex-1 h-full">
        {/* Unassigned Projects Sidebar - Collapsible with Drop Zone */}
        <div 
          className={`unassigned-projects-sidebar border-r border-gray-700 flex-shrink-0 bg-gray-900 flex flex-col transition-all duration-300 ease-in-out ${sidebarOpen ? 'w-64 p-4' : 'w-10 p-2'}`}
          style={{ transitionProperty: 'width, padding', height: 'calc(100vh - 64px)' }}
        >
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <h3 className={`font-bold text-white ${!sidebarOpen ? 'hidden' : 'block'}`}>Unassigned Projects</h3>
            <button 
              onClick={() => {
                console.log("Toggling sidebar from", sidebarOpen, "to", !sidebarOpen);
                setSidebarOpen(!sidebarOpen);
                // Save to localStorage to persist between page reloads
                localStorage.setItem('sidebarOpen', String(!sidebarOpen));
              }} 
              className="p-1 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors flex items-center justify-center"
              title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              {sidebarOpen ? <ChevronLeft className="h-4 w-4 text-gray-300" /> : <ChevronRight className="h-4 w-4 text-gray-300" />}
            </button>
          </div>
          
          {sidebarOpen && (
            <div className="flex flex-col flex-grow overflow-hidden">
              {/* Drop Zone for unassigning projects - fixed height, doesn't scroll */}
              <div 
                className="unassigned-drop-container min-h-[80px] rounded-md border-2 border-dashed border-gray-700 mb-4 p-2 flex-shrink-0" 
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.currentTarget.classList.add('drop-zone-active');
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove('drop-zone-active');
                }}
                onDrop={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.currentTarget.classList.remove('drop-zone-active');
                  
                  document.body.classList.remove('global-drag-active');
                  
                  try {
                    const dataString = e.dataTransfer.getData('text/plain');
                    console.log(`📦 UNASSIGNED DROP: "${dataString}"`);
                    
                    const scheduleId = parseInt(dataString, 10);
                    
                    if (scheduleId > 0) {
                      console.log(`🔄 Returning schedule ${scheduleId} to unassigned section`);
                      
                      const schedule = schedules.find(s => s.id === scheduleId);
                      if (schedule && onScheduleDelete) {
                        await onScheduleDelete(scheduleId);
                        
                        // CRITICAL FIX: Update local state to reflect the deletion
                        setScheduleBars(prevBars => prevBars.filter(bar => bar.id !== scheduleId));
                        
                        toast({
                          title: "Project unassigned",
                          description: "Project moved back to unassigned list",
                        });
                        
                        // Force a rerender by updating a timestamp
                        setForceUpdate(Date.now());
                      }
                    }
                  } catch (error) {
                    console.error('Error processing drop on unassigned section:', error);
                  }
                }}
              >
                <div className="text-sm text-gray-400 italic p-2 text-center flex items-center justify-center">
                  Drop projects here to unassign them
                </div>
              </div>
              
              {/* Scrollable Unassigned Projects List - takes remaining space and scrolls */}
              <div className="overflow-y-auto flex-grow" style={{ maxHeight: 'calc(100% - 100px)' }}>
                {unassignedProjects.length === 0 ? (
                  <div className="text-sm text-gray-400 italic">No unassigned projects</div>
                ) : (
                  <div className="space-y-3 pb-2 pr-1">
                    {unassignedProjects.map(project => (
                      <div 
                        key={`unassigned-${project.id}`}
                        className="unassigned-project-card bg-gray-800 p-3 rounded border border-gray-700 shadow-sm cursor-grab hover:bg-gray-700 transition-colors"
                        draggable={true}
                        onDragStart={(e) => {
                          // Store project ID with special prefix to identify unassigned projects
                          const projectIdentifier = `-${project.id}`;
                          e.dataTransfer.setData('text/plain', projectIdentifier);
                          
                          // Also store complete project data as JSON for enhanced drop handlers
                          const projectData = {
                            projectId: project.id,
                            name: project.name,
                            projectNumber: project.projectNumber,
                            isUnassigned: true // Flag to identify this as an unassigned project
                          };
                          e.dataTransfer.setData('application/json', JSON.stringify(projectData));
                          
                          // Set visual indicators
                          document.body.setAttribute('data-drag-in-progress', 'true');
                          document.body.classList.add('global-drag-active');
                          document.body.classList.add('dragging-unassigned-project');
                          
                          console.log(`🔄 Dragging unassigned project ${project.id}: ${project.name}`);
                          
                          // Set copy effect for new project assignment
                          e.dataTransfer.effectAllowed = 'copy';
                          e.currentTarget.classList.add('opacity-50');
                          
                          // Store project data in session storage as backup
                          sessionStorage.setItem('dragging_project', JSON.stringify({
                            id: project.id,
                            name: project.name,
                            projectNumber: project.projectNumber
                          }));
                          
                          // Create custom drag image
                          const dragImage = document.createElement('div');
                          dragImage.className = 'bg-blue-600 text-white p-2 rounded opacity-80 pointer-events-none fixed -left-full';
                          dragImage.textContent = `${project.projectNumber}: ${project.name}`;
                          document.body.appendChild(dragImage);
                          e.dataTransfer.setDragImage(dragImage, 10, 10);
                          
                          setTimeout(() => {
                            if (dragImage.parentNode) {
                              dragImage.parentNode.removeChild(dragImage);
                            }
                          }, 100);
                        }}
                        onDragEnd={(e) => {
                          e.currentTarget.classList.remove('opacity-50');
                          document.body.removeAttribute('data-drag-in-progress');
                          document.body.classList.remove('global-drag-active');
                          document.body.classList.remove('dragging-unassigned-project');
                          
                          // Clean up any session storage
                          sessionStorage.removeItem('dragging_project');
                          
                          // Clean up any highlights
                          document.querySelectorAll('.row-target-highlight, .bay-highlight, .drop-target').forEach((el) => {
                            el.classList.remove('row-target-highlight', 'bay-highlight', 'drop-target');
                          });
                          
                          console.log('Unassigned project drag operation completed - cleaned up states');
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
            </div>
          )}
        </div>
        
        <div className="bay-schedule-viewport flex-grow overflow-auto" ref={viewportRef}>
          <div className="bay-schedule-container relative" ref={timelineRef}>
          {/* Today Line marker - positioned absolutely */}
          {(() => {
            // Fixed DATE VALUE: Today's date is May 16, 2025
            const today = new Date(2025, 4, 16); // May 16, 2025
            
            // STEP 1: Find the week containing May 16, 2025 - should be week of May 12, 2025
            const mondayOfWeek = new Date(2025, 4, 12); // Monday, May 12, 2025
            
            console.log(`Looking for TODAY line position (${format(today, 'yyyy-MM-dd')}) in week of ${format(mondayOfWeek, 'yyyy-MM-dd')}`);
                
            // STEP 2: Find this exact date in our slots array by matching the Monday
            // We'll use simple date components matching instead of date-fns functions
            for (let i = 0; i < slots.length; i++) {
              const slot = slots[i];
              
              // Check if this slot is the Monday of our target week
              if (slot.date.getFullYear() === mondayOfWeek.getFullYear() &&
                  slot.date.getMonth() === mondayOfWeek.getMonth() &&
                  slot.date.getDate() === mondayOfWeek.getDate()) {
                
                // Found the slot - now calculate position
                let todayPosition = i * slotWidth; // Start of the week
                
                // Add offset for Friday (day 4 in a week starting on Monday)
                const fridayOffset = 4/7 * slotWidth; // Friday is day 4 (0-indexed from Monday)
                todayPosition += fridayOffset;
                
                console.log(`Found TODAY's week at slot ${i} (${format(slot.date, 'yyyy-MM-dd')}), position: ${todayPosition}px`);
                
                // Only show if today is within visible range
                if (todayPosition >= 0) {
                  return (
                    <div 
                      className="today-marker absolute top-0 bottom-0 w-[2px] bg-red-500 z-10" 
                      style={{ 
                        left: `${todayPosition}px`,
                        height: '100%'
                      }}
                    >
                      <div className="bg-red-500 text-white text-xs py-1 px-2 rounded absolute top-0 -translate-x-1/2">
                        TODAY
                      </div>
                    </div>
                  );
                }
                
                // If we found the slot but it's out of range, break the loop
                break;
              }
            }
            
            // Fallback if the exact slot wasn't found - manual calculation
            console.warn('TODAY slot not found in slots array, using fallback calculation');
            
            // Calculate the week number (May 12 is the 20th week of 2025)
            const weekNumber = 19; // 0-indexed, so week 20 = index 19
            const todayPosition = weekNumber * slotWidth + (4/7 * slotWidth); // Week start + Friday offset
            
            // Only show if today is within visible range
            if (todayPosition >= 0) {
              return (
                <div 
                  className="today-line absolute top-0 bottom-0 z-20 pointer-events-none" 
                  style={{ 
                    left: `${todayPosition + 32}px`, // +32 to account for the left sidebar
                    width: '2px',
                    backgroundColor: 'rgba(239, 68, 68, 0.8)', // Red with 80% opacity
                    boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)' // Red glow effect
                  }}
                >
                  {/* TODAY label at the top */}
                  <div 
                    className="today-label absolute top-0 -translate-x-1/2 bg-red-600 text-white text-xs px-2 py-1 rounded" 
                    style={{ left: '1px' }}
                  >
                    TODAY
                  </div>
                </div>
              );
            }
            return null;
          })()}
          
          {/* Timeline Header */}
          <div className="timeline-header sticky top-0 z-10 bg-gray-900 shadow-sm flex" 
            style={{ 
              marginLeft: "0px",  // Removed the ml-32 class and set to 0px
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
                  {/* Always show week numbers - one cell = one week */}
                  <div className="text-gray-400 mt-1 text-[10px] font-semibold">
                    Week {Math.ceil(differenceInDays(slot.date, new Date(slot.date.getFullYear(), 0, 1)) / 7)}
                  </div>
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
            {bayTeams
              .filter(team => {
                // Only show teams with a valid name (not auto-generated "Team X:" names)
                const teamName = team[0]?.team;
                if (!teamName) return false;
                return !teamName.match(/^Team \d+:?/);
              })
              .map((team, teamIndex) => (
              <div 
                key={`team-${teamIndex}`} 
                className="team-container mb-5 relative"
                data-team-section={team[0]?.team ? `${team[0].team}::${team.map(bay => bay.id).join(',')}` : ''}
                style={{
                  minWidth: `${Math.max(12000, differenceInDays(new Date(2030, 11, 31), dateRange.start) * (viewMode === 'day' ? slotWidth : slotWidth / 7))}px`
                }}>
                <div className="team-header bg-blue-900 text-white py-2 px-3 rounded-md mb-2 flex shadow-md" style={{ position: 'relative' }}>
                  <div 
                    className="flex items-center"
                    style={{
                      position: 'sticky',
                      left: 0,
                      zIndex: 40,
                      backgroundColor: '#1e3a8a',
                      paddingRight: '15px'
                    }}
                  >
                    <div className="flex items-center">
                      {/* Team Name with Description */}
                      <div className="flex items-center">
                        {/* Always show team name and description, even for static teams */}
                        <span 
                          className="font-bold text-lg bay-header-team-name" 
                          data-team={team[0]?.team || `${team.map(b => b.name).join(' & ')}`}
                          data-bay-id={team.map(bay => bay.id).join(',')}
                        >
                          {team[0]?.team || `${team.map(b => b.name).join(' & ')}`}
                        </span>
                        
                        {/* Team Description (shown as smaller text to the right) */}
                        <span 
                          className="text-sm ml-2 font-light text-blue-100 italic truncate max-w-[200px] bay-header-team-description" 
                          data-team={team[0]?.team || `${team.map(b => b.name).join(' & ')}`}
                          data-bay-id={team.map(bay => bay.id).join(',')}
                        >
                          {team[0]?.description || 'Production Bay'}
                        </span>
                      </div>
                      
                      {/* Team Management Controls - Show for all team sections */}
                      {true && (
                        <div className="flex items-center space-x-1">
                          {/* Edit Button (Gear Icon) */}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button 
                                  className="ml-2 p-1 bg-blue-700 hover:bg-blue-600 rounded-full text-white flex items-center justify-center"
                                  onClick={() => {
                                    // Create a team name from the display if none exists
                                    const teamName = team[0]?.team || `Team ${teamIndex + 1}: ${team.map(b => b.name).join(' & ')}`;
                                    const teamBayIds = team.map(bay => bay.id).join(',');
                                    
                                    // Set selected team with the specific bay IDs this team represents
                                    setSelectedTeam(`${teamName}::${teamBayIds}`);
                                    setTeamDialogOpen(true);
                                  }}
                                >
                                  <Wrench className="h-4 w-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Edit this {team[0].team} section</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          
                          {/* Delete Button (For Team 5: & Team 6 and any other team) */}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button 
                                  className="p-1 bg-red-700 hover:bg-red-600 rounded-full text-white flex items-center justify-center ml-1"
                                  onClick={() => {
                                    // Set up delete confirmation with specific team info
                                    setTeamDeleteConfirm({
                                      isOpen: true,
                                      teamName: team[0]?.team || `Team ${teamIndex + 1}: ${team.map(b => b.name).join(' & ')}`,
                                      bayIds: team.map(bay => bay.id)
                                    });
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Delete team</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          
                          {/* Add Bay Button */}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button 
                                  className="p-1 bg-green-700 hover:bg-green-600 rounded-full text-white flex items-center justify-center ml-1"
                                  onClick={() => {
                                    // Get the first team bay to copy its properties
                                    const firstBay = team[0];
                                    
                                    // Create a row number for the new bay (in this team)
                                    const bayCount = team.length;
                                    
                                    // CRITICAL: For consistent bay naming, use the existing bay name format
                                    // But preserve any team prefix that might be in the name
                                    let teamPrefix = '';
                                    let numericSuffix = '';
                                    
                                    // Extract team prefix from the bay name pattern
                                    const bayNameMatch = firstBay.name.match(/(.*?)\s*(\d+)$/);
                                    
                                    if (bayNameMatch) {
                                      // Bay has a numeric suffix like "Team 1"
                                      teamPrefix = bayNameMatch[1].trim();
                                      numericSuffix = (bayCount + 1).toString();
                                    } else {
                                      // No numeric suffix, use the entire name as prefix
                                      teamPrefix = firstBay.name;
                                      numericSuffix = (bayCount + 1).toString();
                                    }
                                    
                                    // Create a new bay name following the team's pattern
                                    const newBayName = `${teamPrefix} ${numericSuffix}`;
                                    
                                    // Find highest bay number for the new bay
                                    const highestBayNumber = Math.max(...bays.map(b => b.bayNumber));
                                    
                                    console.log(`Creating new bay row with team: "${firstBay.team}" and name: "${newBayName}"`);
                                    
                                    // Store the original first bay's team name for debugging
                                    const originalTeamName = firstBay.team;
                                    
                                    // Create bay with EXACTLY the same team name and other properties
                                    // This ensures it's displayed in the same team group
                                    const newBay: Partial<ManufacturingBay> = {
                                      name: newBayName,
                                      bayNumber: highestBayNumber + 1,
                                      // Critical - use the EXACT same team value from the first bay in the team
                                      team: firstBay.team,
                                      // Copy other properties exactly as they are in the first bay
                                      description: firstBay.description,
                                      assemblyStaffCount: firstBay.assemblyStaffCount, 
                                      electricalStaffCount: firstBay.electricalStaffCount,
                                      hoursPerPersonPerWeek: firstBay.hoursPerPersonPerWeek
                                    };
                                    
                                    // Call the onBayCreate function
                                    if (onBayCreate) {
                                      onBayCreate(newBay);
                                      
                                      // Success notification
                                      toast({
                                        title: "New bay row added",
                                        description: `Added row to ${firstBay.team || firstBay.name}`
                                      });
                                    }
                                  }}
                                >
                                  <PlusCircle className="h-4 w-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Add bay to team</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          
                          {/* Remove Bay Button (only shown if team has more than 1 bay) */}
                          {team.length > 1 && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button 
                                    className="p-1 bg-orange-700 hover:bg-orange-600 rounded-full text-white flex items-center justify-center ml-1"
                                    onClick={() => {
                                      // Get the team name
                                      const teamName = team[0]?.team || `Team ${teamIndex + 1}: ${team.map(b => b.name).join(' & ')}`;
                                      
                                      // Get the last bay in this team
                                      const lastBay = team[team.length - 1];
                                      
                                      // Call the onBayDelete function for the last bay
                                      if (onBayDelete && lastBay) {
                                        onBayDelete(lastBay.id);
                                        
                                        toast({
                                          title: "Bay removed",
                                          description: `Removed ${lastBay.name} from ${teamName}`
                                        });
                                      }
                                    }}
                                  >
                                    <MinusCircle className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Remove last bay from team</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Info bubbles RIGHT NEXT to team name - CURRENT WEEK ONLY */}
                    <div className="flex items-center ml-3">
                      <div className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full flex items-center mr-2">
                        <Users className="h-3.5 w-3.5 mr-1" />
                        <span>
                          {(() => {
                            // Get current week's start and end date
                            const today = new Date(2025, 4, 16); // May 16, 2025 - use fixed date for consistency
                            const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday as start of week
                            const currentWeekEnd = endOfWeek(today, { weekStartsOn: 1 });
                            
                            // Count projects active in current week only
                            const currentWeekProjects = scheduleBars.filter(bar => {
                              // Check if team owns this bay
                              const isTeamBay = team.some(b => b.id === bar.bayId);
                              if (!isTeamBay) return false;
                              
                              // Check if schedule overlaps with current week
                              const scheduleStart = new Date(bar.startDate);
                              const scheduleEnd = new Date(bar.endDate);
                              return (
                                (scheduleStart <= currentWeekEnd && scheduleEnd >= currentWeekStart)
                              );
                            }).length;
                            
                            return `${currentWeekProjects} projects`;
                          })()}
                        </span>
                      </div>
                      <div className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full flex items-center">
                        <BarChart2 className="h-3.5 w-3.5 mr-1" />
                        <span>
                          {(() => {
                            // Get current week's start and end date
                            const today = new Date(2025, 4, 16); // May 16, 2025
                            const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
                            const currentWeekEnd = endOfWeek(today, { weekStartsOn: 1 });
                            
                            // Count projects active in current week only
                            const currentWeekProjects = scheduleBars.filter(bar => {
                              // Check if team owns this bay
                              const isTeamBay = team.some(b => b.id === bar.bayId);
                              if (!isTeamBay) return false;
                              
                              // Check if schedule overlaps with current week
                              const scheduleStart = new Date(bar.startDate);
                              const scheduleEnd = new Date(bar.endDate);
                              return (
                                (scheduleStart <= currentWeekEnd && scheduleEnd >= currentWeekStart)
                              );
                            }).length;
                            
                            // Enhanced phase-based utilization calculation
                            const TODAY = new Date(2025, 4, 16); // May 16, 2025 (fixed date)
                            
                            // Count projects in each phase on current date
                            let prodPhaseProjects = 0;
                            let itNtcQcPhaseProjects = 0;
                            let fabPaintPhaseProjects = 0;
                            
                            // Process each project to determine which phase it's in on the current date
                            scheduleBars.forEach(bar => {
                              // Skip if not part of this team
                              const isTeamBay = team.some(b => b.id === bar.bayId);
                              if (!isTeamBay) return;
                              
                              // Skip if project is not active on the current date
                              const scheduleStart = new Date(bar.startDate);
                              const scheduleEnd = new Date(bar.endDate);
                              if (TODAY < scheduleStart || TODAY > scheduleEnd) return;
                              
                              // Calculate phase date ranges
                              const totalDays = differenceInDays(scheduleEnd, scheduleStart) + 1;
                              
                              // Use the bar's actual phase percentages or default if undefined
                              const fabPercent = bar.fabPercentage || 27;
                              const paintPercent = bar.paintPercentage || 7;
                              const prodPercent = bar.productionPercentage || 60;
                              const itPercent = bar.itPercentage || 7;
                              const ntcPercent = bar.ntcPercentage || 7;
                              const qcPercent = bar.qcPercentage || 7;
                              
                              // Calculate phase durations in days
                              const fabDays = Math.ceil(totalDays * (fabPercent / 100));
                              const paintDays = Math.ceil(totalDays * (paintPercent / 100));
                              const prodDays = Math.ceil(totalDays * (prodPercent / 100));
                              const itDays = Math.ceil(totalDays * (itPercent / 100));
                              const ntcDays = Math.ceil(totalDays * (ntcPercent / 100));
                              const qcDays = Math.ceil(totalDays * (qcPercent / 100));
                              
                              // Calculate phase start dates
                              let currentDate = new Date(scheduleStart);
                              
                              // FAB phase
                              const fabStart = new Date(currentDate);
                              const fabEnd = addDays(new Date(currentDate), fabDays);
                              currentDate = addDays(currentDate, fabDays);
                              
                              // PAINT phase
                              const paintStart = new Date(currentDate);
                              const paintEnd = addDays(new Date(currentDate), paintDays);
                              currentDate = addDays(currentDate, paintDays);
                              
                              // PRODUCTION phase
                              const prodStart = new Date(currentDate);
                              const prodEnd = addDays(new Date(currentDate), prodDays);
                              currentDate = addDays(currentDate, prodDays);
                              
                              // IT phase
                              const itStart = new Date(currentDate);
                              const itEnd = addDays(new Date(currentDate), itDays);
                              currentDate = addDays(currentDate, itDays);
                              
                              // NTC phase
                              const ntcStart = new Date(currentDate);
                              const ntcEnd = addDays(new Date(currentDate), ntcDays);
                              currentDate = addDays(currentDate, ntcDays);
                              
                              // QC phase
                              const qcStart = new Date(currentDate);
                              const qcEnd = addDays(new Date(currentDate), qcDays);
                              
                              // Determine which phase the current date falls into
                              if (TODAY >= fabStart && TODAY <= fabEnd) {
                                fabPaintPhaseProjects++;
                              } else if (TODAY >= paintStart && TODAY <= paintEnd) {
                                fabPaintPhaseProjects++;
                              } else if (TODAY >= prodStart && TODAY <= prodEnd) {
                                prodPhaseProjects++;
                              } else if ((TODAY >= itStart && TODAY <= itEnd) || 
                                         (TODAY >= ntcStart && TODAY <= ntcEnd) ||
                                         (TODAY >= qcStart && TODAY <= qcEnd)) {
                                itNtcQcPhaseProjects++;
                              }
                            });
                            
                            // Calculate utilization based on phase rules
                            const baseCapacity = team.length * 2; // 2 projects per bay = 100%
                            
                            let utilizationPercentage = 0;
                            
                            // PROD phase: 100% capacity is 2 projects, 50% per project
                            if (prodPhaseProjects > 0) {
                              // Each project takes 50% of capacity (100% capacity = 2 projects)
                              utilizationPercentage += (prodPhaseProjects * 50);
                            }
                            
                            // IT/NTC/QC phases: 50% capacity per project
                            if (itNtcQcPhaseProjects > 0) {
                              utilizationPercentage += (itNtcQcPhaseProjects * 50);
                            }
                            
                            // FAB/PAINT phases: 0% capacity (no effect on utilization)
                            // No calculation needed for these phases
                            
                            // Ensure we don't exceed sensible limits
                            const cappedPercentage = Math.min(utilizationPercentage, 200);
                            
                            return `${cappedPercentage}% utilization`;
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* This div remains empty but keeps the layout clean */}
                  <div className="ml-auto">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <div className="capacity-indicator flex items-center text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                            <Users className="h-3 w-3 mr-1" />
                            <span>
                              {(() => {
                                // Get current week's start and end date
                                const today = new Date();
                                const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });  // Monday as start of week
                                const currentWeekEnd = endOfWeek(today, { weekStartsOn: 1 });
                                
                                // Count projects active in current week only
                                return scheduleBars.filter(bar => {
                                  // Check if team owns this bay
                                  const isTeamBay = team.some(b => b.id === bar.bayId);
                                  if (!isTeamBay) return false;
                                  
                                  // Check if schedule overlaps with current week
                                  const scheduleStart = new Date(bar.startDate);
                                  const scheduleEnd = new Date(bar.endDate);
                                  return (
                                    (scheduleStart <= currentWeekEnd && scheduleEnd >= currentWeekStart)
                                  );
                                }).length;
                              })()} projects this week
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Number of projects active for this team in the current week</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <div className="utilization-indicator flex items-center text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                            <Zap className="h-3 w-3 mr-1" />
                            <span>
                              {(() => {
                                // Get current week's start and end date
                                const today = new Date();
                                const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
                                const currentWeekEnd = endOfWeek(today, { weekStartsOn: 1 });
                                
                                // Count projects active in current week only
                                const currentWeekProjects = scheduleBars.filter(bar => {
                                  // Check if team owns this bay
                                  const isTeamBay = team.some(b => b.id === bar.bayId);
                                  if (!isTeamBay) return false;
                                  
                                  // Check if schedule overlaps with current week
                                  const scheduleStart = new Date(bar.startDate);
                                  const scheduleEnd = new Date(bar.endDate);
                                  return (
                                    (scheduleStart <= currentWeekEnd && scheduleEnd >= currentWeekStart)
                                  );
                                }).length;
                                
                                // Calculate utilization percentage based on team capacity
                                const percentage = Math.min(
                                  Math.round(
                                    (currentWeekProjects / (team.length * 2)) * 100
                                  ), 
                                  100
                                );
                                
                                return `${percentage}% utilization this week`;
                              })()}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Team capacity utilization percentage for the current week</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
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
                      {/* Bay Label - ENHANCED sticky positioning for perfect alignment with sidebar */}
                      <div 
                        className="bay-label h-full bg-gray-100 border-r flex flex-col justify-between py-2 px-2 z-40"
                        style={{ 
                          position: 'sticky',
                          left: 0,
                          width: '240px',
                          boxShadow: '4px 0 6px rgba(0,0,0,0.1)'
                        }}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-sm">{bay.name}</div>
                            {/* Info bubble moved to the right of bay name as requested */}
                            <div className="bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center ml-2">
                              {baySchedules.length}
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-gray-500">Bay #{bay.bayNumber}</div>
                            
                            {/* Individual bay row edit button */}
                            <button 
                              className="ml-1 p-1 bg-blue-100 hover:bg-blue-200 rounded text-blue-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingBay({...bay});
                                setNewBayDialog(true);
                              }}
                              title="Edit this bay"
                            >
                              <PencilIcon className="h-3 w-3" />
                            </button>
                          </div>
                          
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
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      className="px-2 py-1 bg-blue-100 hover:bg-blue-200 rounded text-blue-700 flex items-center"
                                      onClick={() => {
                                        // Use the specific bay ID format for this single bay's team
                                      setSelectedTeam(`${bay.team}::${bay.id}`);
                                      setTeamDialogOpen(true);
                                      }}
                                    >
                                      <Wrench className="h-3 w-3 mr-1" />
                                      <span className="text-xs">{bay.team}</span>
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Manage {bay.team} team settings</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </div>
                        
                        {/* Bay status and capacity information - IMPROVED CONTRAST */}
                        <div className="flex flex-col gap-1 mt-auto">
                          {/* Bay status indicator - Improved contrast */}
                          <div className={`status-badge flex items-center justify-center rounded-full py-1 px-2 text-xs ${
                            baySchedules.length > 0 ? 'bg-amber-200 text-amber-900' : 'bg-green-200 text-green-900'
                          }`}>
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {baySchedules.length > 0 ? 'Near Capacity' : 'Available'}
                          </div>
                          
                          {/* Project count - Improved contrast */}
                          <div className="project-count bg-gray-200 text-gray-900 rounded-full py-1 px-2 text-xs flex items-center justify-center">
                            <Users className="h-3 w-3 mr-1" />
                            {baySchedules.length} {baySchedules.length === 1 ? 'project' : 'projects'}
                          </div>
                          
                          {/* Team capacity information - Improved contrast */}
                          {bay.team && (
                            <div className="team-capacity bg-blue-200 text-blue-900 rounded-full py-1 px-2 text-xs flex items-center justify-center">
                              <Users className="h-3 w-3 mr-1" />
                              Team: {((bay.assemblyStaffCount || 2) + (bay.electricalStaffCount || 1)) * (bay.hoursPerPersonPerWeek || 29)} hrs/wk
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Bay content area - FULL WIDTH to extend to end of timeline (2030) */}
                      <div className="bay-content absolute left-[240px] top-0 bottom-0"
                        style={{ 
                          width: `${Math.max(8000, differenceInDays(new Date(2030, 11, 31), dateRange.start) * (viewMode === 'day' ? slotWidth : slotWidth / 7))}px`,
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
                              className="h-full bay-row transition-colors hover:bg-gray-700/10 cursor-pointer relative droppable-area" 
                              onDragOver={(e) => {
                                // Must prevent default to enable drop
                                e.preventDefault();
                                
                                // Set the correct drop effect based on the drag type
                                if (document.body.classList.contains('dragging-unassigned-project')) {
                                  e.dataTransfer.dropEffect = 'copy'; // New project
                                } else {
                                  e.dataTransfer.dropEffect = 'move'; // Existing project
                                }
                                
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
                                    draggable={false}
                                    onDragEnter={(e) => {
                                      // CRITICAL: Always prevent default to be a valid drop target
                                      e.preventDefault();
                                      e.stopPropagation();
                                      
                                      // Force visual feedback
                                      e.currentTarget.classList.add('drop-target');
                                      e.currentTarget.classList.add('cell-highlight');
                                      
                                      console.log(`✅ CELL READY FOR DROP: Bay ${bay.id}, Row 0, Date ${format(slot.date, 'yyyy-MM-dd')}`);
                                    }}
                                    onDragOver={(e) => {
                                      // CRITICAL: Always prevent default to allow dropping
                                      e.preventDefault();
                                      e.stopPropagation();
                                      
                                      // Set appropriate drop effect based on what's being dragged
                                      if (e.dataTransfer) {
                                        // Check if this is a new project (unassigned) or an existing one
                                        const isUnassignedProject = document.body.classList.contains('dragging-unassigned-project');
                                        // Use 'copy' for new projects, 'move' for existing ones
                                        e.dataTransfer.dropEffect = isUnassignedProject ? 'copy' : 'move';
                                      }
                                      
                                      // Store the row index and bay id in body attributes
                                      document.body.setAttribute('data-current-drag-row', '0');
                                      document.body.setAttribute('data-current-drag-bay', bay.id.toString());
                                      
                                      // Force the element to accept drops
                                      if (e.currentTarget instanceof HTMLElement) {
                                        e.currentTarget.setAttribute('data-bay-id', bay.id.toString());
                                        e.currentTarget.setAttribute('data-accept-drops', 'true');
                                        e.currentTarget.setAttribute('data-overlap-allowed', 'true');
                                      }
                                      
                                      // Visual indication
                                      e.currentTarget.classList.add('cell-highlight');
                                      e.currentTarget.classList.add('drop-target');
                                      
                                      // Apply handler
                                      handleSlotDragOver(e, bay.id, 0, slot.date);
                                    }}
                                    onDragLeave={(e) => {
                                      // Remove highlight when leaving
                                      e.currentTarget.classList.remove('cell-highlight');
                                    }}
                                    onDrop={(e) => {
                                      // CRITICAL: Always prevent default to accept the drop
                                      e.preventDefault();
                                      e.stopPropagation();
                                      
                                      // Clear any visual indication
                                      e.currentTarget.classList.remove('cell-highlight');
                                      e.currentTarget.classList.remove('drop-target');
                                      
                                      console.log(`🎯 DROP HAPPENING NOW: Bay ${bay.id}, Row 0, Date ${format(slot.date, 'yyyy-MM-dd')}`);
                                      
                                      // Call the handler with EXACT placement info
                                      // Enhanced debug for precise drop location
                                      console.log(`🎯 PRECISE DROP: Using exact date ${format(slot.date, 'yyyy-MM-dd')} from cell data`);
                                      console.log(`🎯 PIXEL-PERFECT: Project will start EXACTLY at this cell date`);
                                      
                                      // Create visual marker at the drop position for feedback
                                      const marker = document.createElement('div');
                                      marker.className = 'absolute w-1 h-10 bg-green-500 z-50';
                                      marker.style.left = '0px'; 
                                      marker.style.top = '0px';
                                      e.currentTarget.appendChild(marker);
                                      
                                      // Remove marker after 1 second
                                      setTimeout(() => {
                                        if (marker.parentNode) marker.parentNode.removeChild(marker);
                                      }, 1000);
                                      
                                      // Call handler with EXACT cell date for precise placement
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
                <ScrollArea className="h-48 border rounded-md p-2">
                  {/* Group bays by team */}
                  {(() => {
                    // Group bays by team name
                    const baysByTeam = bays.reduce((groups, bay) => {
                      const teamName = bay.team || 'Unassigned';
                      if (!groups[teamName]) {
                        groups[teamName] = [];
                      }
                      groups[teamName].push(bay);
                      return groups;
                    }, {} as Record<string, ManufacturingBay[]>);
                    
                    // Sort team names alphabetically, but put "Unassigned" at the end
                    const sortedTeamNames = Object.keys(baysByTeam).sort((a, b) => {
                      if (a === 'Unassigned') return 1;
                      if (b === 'Unassigned') return -1;
                      return a.localeCompare(b);
                    });
                    
                    return sortedTeamNames.map(teamName => (
                      <div key={teamName} className="mb-3 last:mb-0">
                        {/* Team header */}
                        <div className="bg-blue-900 text-white text-sm font-bold py-1 px-2 rounded-t mb-1">
                          {teamName}
                        </div>
                        
                        {/* Bays within this team */}
                        {baysByTeam[teamName].map((bay) => (
                          <div
                            key={bay.id}
                            className={`py-1 px-2 cursor-pointer rounded hover:bg-gray-100 ${
                              targetBay === bay.id ? 'bg-primary text-primary-foreground' : ''
                            } ${bay.status === 'maintenance' ? 'opacity-50' : ''}`}
                            onClick={() => bay.status !== 'maintenance' && setTargetBay(bay.id)}
                          >
                            <div className="font-medium">{bay.name}</div>
                            <div className="text-xs flex justify-between">
                              <span>Bay #{bay.bayNumber}</span>
                              {bay.description && (
                                <span className="italic text-gray-500">{bay.description}</span>
                              )}
                            </div>
                            {bay.status === 'maintenance' && (
                              <Badge variant="destructive" className="mt-1 text-[10px]">
                                Maintenance
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    ));
                  })()}
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
            <DialogTitle>
              {editingBay && editingBay.id > 0 
                ? 'Edit Bay' 
                : editingBay?.team 
                  ? 'Create New Team' 
                  : 'Create Bay'}
            </DialogTitle>
            <DialogDescription>
              {editingBay && editingBay.id > 0 
                ? 'Update the bay information.' 
                : editingBay?.team 
                  ? 'Create a new manufacturing team with initial bay' 
                  : 'Add a new manufacturing bay to the schedule.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Team section - only show when creating a new team */}
            {editingBay && !editingBay.id && editingBay.team && (
              <div className="bg-blue-900/20 p-3 rounded-md border border-blue-800 mb-2">
                <h3 className="text-blue-100 font-medium mb-2">Team Information</h3>
                <div className="grid grid-cols-4 items-center gap-4 mb-3">
                  <Label htmlFor="teamName" className="text-right text-blue-100">
                    Team Name
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="teamName"
                      placeholder="Enter team name"
                      value={editingBay.team || ''}
                      onChange={(e) => setEditingBay(prev => prev ? {...prev, team: e.target.value} : null)}
                      className="border-blue-700 bg-blue-950/50"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="teamDescription" className="text-right text-blue-100">
                    Description
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="teamDescription"
                      placeholder="Team description"
                      value={editingBay.description || ''}
                      onChange={(e) => setEditingBay(prev => prev ? {...prev, description: e.target.value} : null)}
                      className="border-blue-700 bg-blue-950/50"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4 mt-3">
                  <Label htmlFor="assemblyStaff" className="text-right text-blue-100">
                    Assembly Staff
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="assemblyStaff"
                      type="number"
                      placeholder="Number of assembly staff"
                      value={editingBay.assemblyStaffCount || 4}
                      onChange={(e) => setEditingBay(prev => prev ? {...prev, assemblyStaffCount: parseInt(e.target.value)} : null)}
                      className="border-blue-700 bg-blue-950/50"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4 mt-3">
                  <Label htmlFor="electricalStaff" className="text-right text-blue-100">
                    Electrical Staff
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="electricalStaff"
                      type="number"
                      placeholder="Number of electrical staff"
                      value={editingBay.electricalStaffCount || 2}
                      onChange={(e) => setEditingBay(prev => prev ? {...prev, electricalStaffCount: parseInt(e.target.value)} : null)}
                      className="border-blue-700 bg-blue-950/50"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4 mt-3">
                  <Label htmlFor="hoursPerWeek" className="text-right text-blue-100">
                    Hours/Week
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="hoursPerWeek"
                      type="number"
                      placeholder="Hours per person per week"
                      value={editingBay.hoursPerPersonPerWeek || 40}
                      onChange={(e) => setEditingBay(prev => prev ? {...prev, hoursPerPersonPerWeek: parseInt(e.target.value)} : null)}
                      className="border-blue-700 bg-blue-950/50"
                    />
                  </div>
                </div>
              </div>
            )}
            
            {/* Bay section - Always show */}
            <h3 className="text-gray-300 font-medium">
              {editingBay && !editingBay.id && editingBay.team 
                ? 'Initial Bay Settings' 
                : 'Bay Information'}
            </h3>
            
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
            
            {/* Only show Team field if not creating a team */}
            {(!editingBay?.team || editingBay.id > 0) && (
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
            )}
          </div>
          
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setNewBayDialog(false)}>
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={editingBay?.id > 0 ? handleSaveBayEdit : handleCreateBay}
            >
              {editingBay?.id > 0 
                ? 'Save Changes' 
                : editingBay?.team 
                  ? 'Create Team' 
                  : 'Create Bay'
              }
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
        onTeamUpdate={async (teamName, newTeamName, description, assemblyStaff, electricalStaff, hoursPerWeek) => {
          // Update team description in our local state to show in the header bar
          handleTeamUpdate(teamName, newTeamName, description, assemblyStaff, electricalStaff, hoursPerWeek);
          
          // After team capacity is updated, refresh the schedule data
          toast({
            title: "Team updated",
            description: `Team ${newTeamName} has been updated with ${assemblyStaff} assembly and ${electricalStaff} electrical staff.`
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
      
      {/* Team Delete Confirmation Dialog - Fixed for proper DOM nesting */}
      <Dialog 
        open={teamDeleteConfirm.isOpen} 
        onOpenChange={(isOpen) => setTeamDeleteConfirm(prev => ({...prev, isOpen}))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Trash2 className="h-5 w-5 mr-2 text-red-600" />
              <span>Delete Team</span>
            </DialogTitle>
            <DialogDescription asChild>
              <div>
                <p>Are you sure you want to delete the team "{teamDeleteConfirm.teamName}"?</p>
                <div className="mt-2 mb-2 p-2 bg-amber-50 border border-amber-200 rounded-md text-amber-800">
                  <AlertTriangle className="h-4 w-4 inline-block mr-1" /> 
                  This will remove the team association from {teamDeleteConfirm.bayIds.length} bay(s).
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  The bay itself will remain, but the team information and settings will be removed.
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTeamDeleteConfirm(prev => ({...prev, isOpen: false}))}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => handleTeamDelete(teamDeleteConfirm.teamName, teamDeleteConfirm.bayIds)}
            >
              Delete Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}

// For handleResizeStart
let initialStartDate: Date;
let initialEndDate: Date;