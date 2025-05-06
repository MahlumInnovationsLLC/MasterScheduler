import React, { useState, useEffect, useMemo } from 'react';
import { format, addDays, differenceInDays, isSameDay, addWeeks, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { PlusCircle, GripVertical, Info, X, ChevronRight, PencilIcon, PlusIcon, Users, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ManufacturingBay, ManufacturingSchedule, Project } from '@shared/schema';
import { EditBayDialog } from './EditBayDialog';
import { apiRequest } from '@/lib/queryClient';

interface ResizableBayScheduleProps {
  schedules: ManufacturingSchedule[];
  projects: Project[];
  bays: ManufacturingBay[];
  onScheduleChange: (scheduleId: number, newBayId: number, newStartDate: string, newEndDate: string, totalHours?: number) => Promise<void>;
  onScheduleCreate: (projectId: number, bayId: number, startDate: string, endDate: string, totalHours?: number) => Promise<void>;
  onBayCreate?: (bay: Partial<ManufacturingBay>) => Promise<any>;
  onBayUpdate?: (id: number, bay: Partial<ManufacturingBay>) => Promise<any>;
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
}

const generateTimeSlots = (dateRange: { start: Date, end: Date }, viewMode: 'day' | 'week' | 'month' | 'quarter') => {
  const slots = [];
  let current = new Date(dateRange.start);
  let slotWidth = 0;
  let format_string = '';
  
  // Calculate end date 5 years from now for extended timeline
  const extendedEndDate = new Date();
  extendedEndDate.setFullYear(extendedEndDate.getFullYear() + 5);
  
  switch (viewMode) {
    case 'day':
      slotWidth = 50;
      format_string = 'MMM d';
      while (current <= extendedEndDate) {
        slots.push({
          date: new Date(current),
          label: format(current, format_string),
          sublabel: format(current, 'EEE'),
          isWeekend: current.getDay() === 0 || current.getDay() === 6
        });
        current = addDays(current, 1);
      }
      break;
    case 'week':
      slotWidth = 100;
      format_string = "'Week' w";
      while (current <= extendedEndDate) {
        const weekEnd = addDays(current, 6);
        slots.push({
          date: new Date(current),
          label: format(current, format_string),
          sublabel: `${format(current, 'MMM d')} - ${format(weekEnd, 'MMM d')}`,
          isWeekend: false
        });
        current = addDays(current, 7);
      }
      break;
    case 'month':
      slotWidth = 150;
      format_string = 'MMM yyyy';
      while (current <= extendedEndDate) {
        const monthStart = startOfMonth(current);
        const monthEnd = endOfMonth(current);
        slots.push({
          date: new Date(monthStart),
          label: format(current, format_string),
          sublabel: '',
          isWeekend: false
        });
        current = addMonths(current, 1);
      }
      break;
    case 'quarter':
      slotWidth = 200;
      while (current <= extendedEndDate) {
        const quarter = Math.floor(current.getMonth() / 3) + 1;
        const year = current.getFullYear();
        slots.push({
          date: new Date(current),
          label: `Q${quarter} ${year}`,
          sublabel: `${format(current, 'MMM')} - ${format(addMonths(current, 2), 'MMM')}`,
          isWeekend: false
        });
        current = addMonths(current, 3);
      }
      break;
  }
  
  return { slots, slotWidth };
};

const COLORS = [
  'rgb(59, 130, 246)', // blue-500
  'rgb(16, 185, 129)', // green-500
  'rgb(245, 158, 11)', // amber-500
  'rgb(99, 102, 241)', // indigo-500
  'rgb(139, 92, 246)', // violet-500
  'rgb(236, 72, 153)', // pink-500
  'rgb(220, 38, 38)', // red-500
];

const getProjectColor = (projectId: number) => {
  return COLORS[projectId % COLORS.length];
};

// Simple BayCapacityInfo component to show staffing breakdown
const BayCapacityInfo = ({ bay }: { bay: ManufacturingBay }) => {
  const assemblyStaff = bay.assemblyStaffCount || 0;
  const electricalStaff = bay.electricalStaffCount || 0;
  const hoursPerWeek = bay.hoursPerPersonPerWeek || 40;
  const staffCount = bay.staffCount || assemblyStaff + electricalStaff;
  const totalCapacity = hoursPerWeek * staffCount;
  
  return (
    <div className="flex flex-col">
      <div className="text-xs text-gray-400 mb-1">
        <div className="flex items-center">
          <div className="flex items-center mr-3">
            <Users className="h-3 w-3 mr-1 text-blue-400" />
            <span>{assemblyStaff}</span>
          </div>
          <div className="flex items-center">
            <Zap className="h-3 w-3 mr-1 text-amber-400" />
            <span>{electricalStaff}</span>
          </div>
        </div>
      </div>
      <div className="text-xs text-gray-400">
        {totalCapacity}h/week capacity
      </div>
    </div>
  );
};

const ResizableBaySchedule: React.FC<ResizableBayScheduleProps> = ({
  schedules,
  projects,
  bays: initialBays,
  onScheduleChange,
  onScheduleCreate,
  onBayCreate,
  onBayUpdate,
  dateRange,
  viewMode
}) => {
  // Extended state
  const [bays, setBays] = useState<ManufacturingBay[]>(initialBays);
  
  // Update bays when props change
  useEffect(() => {
    setBays(initialBays);
  }, [initialBays]);
  const { toast } = useToast();
  const [draggingSchedule, setDraggingSchedule] = useState<any>(null);
  const [resizingSchedule, setResizingSchedule] = useState<any>(null);
  const [dropTarget, setDropTarget] = useState<{ bayId: number, slotIndex: number, rowIndex?: number } | null>(null);
  const [editingBay, setEditingBay] = useState<ManufacturingBay | null>(null);
  const [newBay, setNewBay] = useState<ManufacturingBay | null>(null);
  
  // Generate time slots based on view mode
  const { slots, slotWidth } = useMemo(() => 
    generateTimeSlots(dateRange, viewMode), 
    [dateRange, viewMode]
  );
  
  const totalViewWidth = slots.length * slotWidth;
  
  // Map schedules to visual bars
  const scheduleBars = useMemo(() => {
    if (!schedules.length || !slots.length) return [];
    
    // First, group schedules by bay
    const schedulesByBay = schedules.reduce((acc, schedule) => {
      if (!acc[schedule.bayId]) {
        acc[schedule.bayId] = [];
      }
      acc[schedule.bayId].push(schedule);
      return acc;
    }, {} as Record<number, typeof schedules>);
    
    // Process each bay's schedules to assign rows within the bay (for overlapping projects)
    const processedBars: ScheduleBar[] = [];
    
    Object.entries(schedulesByBay).forEach(([bayIdStr, baySchedules]) => {
      const bayId = parseInt(bayIdStr);
      
      // Sort schedules by start date
      const sortedSchedules = [...baySchedules].sort((a, b) => 
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );
      
      // Initialize row tracking for this bay
      const rowEndDates: Date[] = [
        new Date(0), // Row 0
        new Date(0), // Row 1
        new Date(0), // Row 2
        new Date(0)  // Row 3
      ];
      
      // Process each schedule
      sortedSchedules.forEach(schedule => {
        const project = projects.find(p => p.id === schedule.projectId);
        const bay = bays.find(b => b.id === bayId);
        
        if (!project || !bay) return;
        
        const startDate = new Date(schedule.startDate);
        const endDate = new Date(schedule.endDate);
        
        // Find a row that doesn't have a schedule overlapping with this one
        let assignedRow = -1;
        for (let row = 0; row < 4; row++) {
          if (startDate >= rowEndDates[row]) {
            assignedRow = row;
            break;
          }
        }
        
        // If all rows are occupied, use the one that ends soonest
        if (assignedRow === -1) {
          assignedRow = rowEndDates.indexOf(Math.min(...rowEndDates.map(d => d.getTime())));
        }
        
        // Update the end date for this row
        rowEndDates[assignedRow] = new Date(endDate);
        
        // Find the slot indices
        const startSlotIndex = slots.findIndex(slot => {
          if (viewMode === 'day') {
            return isSameDay(slot.date, startDate) || slot.date > startDate;
          } else if (viewMode === 'week') {
            const slotEndDate = addDays(slot.date, 6);
            return (startDate >= slot.date && startDate <= slotEndDate);
          } else if (viewMode === 'month') {
            const slotMonth = slot.date.getMonth();
            const slotYear = slot.date.getFullYear();
            return (startDate.getMonth() === slotMonth && startDate.getFullYear() === slotYear);
          } else { // quarter
            const slotQuarter = Math.floor(slot.date.getMonth() / 3);
            const slotYear = slot.date.getFullYear();
            const startQuarter = Math.floor(startDate.getMonth() / 3);
            return (startQuarter === slotQuarter && startDate.getFullYear() === slotYear);
          }
        });
        
        const endSlotIndex = slots.findIndex(slot => {
          if (viewMode === 'day') {
            return isSameDay(slot.date, endDate) || slot.date > endDate;
          } else if (viewMode === 'week') {
            const slotEndDate = addDays(slot.date, 6);
            return (endDate >= slot.date && endDate <= slotEndDate);
          } else if (viewMode === 'month') {
            const slotMonth = slot.date.getMonth();
            const slotYear = slot.date.getFullYear();
            return (endDate.getMonth() === slotMonth && endDate.getFullYear() === slotYear);
          } else { // quarter
            const slotQuarter = Math.floor(slot.date.getMonth() / 3);
            const slotYear = slot.date.getFullYear();
            const endQuarter = Math.floor(endDate.getMonth() / 3);
            return (endQuarter === slotQuarter && endDate.getFullYear() === slotYear);
          }
        });
        
        // Calculate width and position
        const validStartIndex = startSlotIndex === -1 ? 0 : startSlotIndex;
        const validEndIndex = endSlotIndex === -1 ? slots.length - 1 : endSlotIndex;
        
        const barWidth = ((validEndIndex - validStartIndex) + 1) * slotWidth;
        const barLeft = validStartIndex * slotWidth;
        
        processedBars.push({
          id: schedule.id,
          projectId: schedule.projectId,
          bayId,
          startDate,
          endDate,
          totalHours: schedule.totalHours || 40,
          projectName: project.name,
          projectNumber: project.projectNumber,
          width: barWidth,
          left: barLeft,
          color: getProjectColor(project.id),
          row: assignedRow
        });
      });
    });
    
    return processedBars;
  }, [schedules, projects, bays, slots, viewMode, slotWidth]);
  
  // Handle drag start
  const handleDragStart = (e: React.DragEvent, type: 'existing' | 'new', data: any) => {
    e.stopPropagation();
    
    // CRITICAL: We must ensure the correct data is set for the drag operation
    try {
      // Set both formats for better browser compatibility
      const payload = JSON.stringify({
        type,
        ...data
      });
      
      e.dataTransfer.setData('text/plain', payload);
      e.dataTransfer.setData('application/json', payload);
      
      // Set drop effect
      e.dataTransfer.effectAllowed = 'move';
      
      console.log(`Drag started for ${type} project:`, data.projectNumber || 'Project');
      
      // Create custom drag image
      const dragImage = document.createElement('div');
      dragImage.className = 'p-2 rounded-md shadow-lg border bg-primary text-white';
      dragImage.style.position = 'absolute';
      dragImage.style.top = '-1000px';
      dragImage.style.zIndex = '9999';
      dragImage.style.padding = '10px';
      dragImage.style.width = '200px';
      
      const projectInfo = document.createElement('div');
      projectInfo.className = 'font-medium';
      projectInfo.textContent = data.projectNumber ? 
        `${data.projectNumber}: ${data.projectName?.substring(0, 15) || ''}` : 
        'Project';
      dragImage.appendChild(projectInfo);
      
      const hoursInfo = document.createElement('div');
      hoursInfo.className = 'text-white text-xs mt-1';
      hoursInfo.textContent = `${data.totalHours || 40} hours`;
      dragImage.appendChild(hoursInfo);
      
      document.body.appendChild(dragImage);
      
      // Set drag image with offset
      e.dataTransfer.setDragImage(dragImage, 30, 20);
      
      // Clean up after a short delay
      setTimeout(() => {
        if (document.body.contains(dragImage)) {
          document.body.removeChild(dragImage);
        }
      }, 100);
      
      // Update internal state
      if (type === 'existing' && data.id) {
        const bar = scheduleBars.find(b => b.id === data.id);
        if (bar) {
          setDraggingSchedule(bar);
        } else {
          setDraggingSchedule(data);
        }
      } else {
        setDraggingSchedule(data);
      }
    } catch (error) {
      console.error('Error in drag start:', error);
    }
  };
  
  // Handle drag over
  const handleDragOver = (e: React.DragEvent, bayId: number, slotIndex: number, rowIndex?: number) => {
    // CRITICAL: We must call preventDefault to allow dropping
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Clear previous highlight
    document.querySelectorAll('.bg-primary/10').forEach(el => {
      el.classList.remove('bg-primary/10');
    });
    document.querySelectorAll('.bay-row-highlight').forEach(el => {
      el.classList.remove('bay-row-highlight');
    });
    
    // Determine row index if not provided
    const cellHeight = e.currentTarget.clientHeight;
    const relativeY = e.nativeEvent.offsetY;
    const calculatedRowIndex = rowIndex !== undefined 
      ? rowIndex 
      : Math.floor((relativeY / cellHeight) * 4);
    
    const validRowIndex = Math.max(0, Math.min(3, calculatedRowIndex));
    
    // Update the target location
    setDropTarget({ 
      bayId, 
      slotIndex,
      rowIndex: validRowIndex
    });
    
    // Add visual cue to the cell
    const target = e.currentTarget as HTMLElement;
    target.classList.add('bg-primary/10');
    
    // Highlight the specific row
    const bayElement = target.closest('.bay-container');
    if (bayElement) {
      const rowElements = bayElement.querySelectorAll('.bay-row');
      if (rowElements && rowElements.length > validRowIndex) {
        rowElements[validRowIndex].classList.add('bay-row-highlight');
      }
    }
  };
  
  // Handle saving an edited bay
  const handleSaveBayEdit = async (bayId: number, data: Partial<ManufacturingBay>) => {
    try {
      if (!bayId && !data) {
        toast({
          title: "Error",
          description: "Invalid bay data",
          variant: "destructive"
        });
        return;
      }
      
      if (onBayUpdate) {
        // Use the parent component's mutation
        const updatedBay = await onBayUpdate(bayId, data);
        
        // Update local state
        setBays(prev => prev.map(bay => bay.id === bayId ? updatedBay : bay));
        
        toast({
          title: "Bay Updated",
          description: `Bay ${data.bayNumber}: ${data.name} has been updated`,
        });
      } else {
        // Fallback to direct API call
        const response = await apiRequest('PUT', `/api/manufacturing-bays/${bayId}`, data);
        
        if (!response.ok) {
          throw new Error(`Failed to update bay: ${response.statusText}`);
        }
        
        const updatedBay = await response.json();
        
        // Update local state
        setBays(prev => prev.map(bay => bay.id === bayId ? updatedBay : bay));
        
        toast({
          title: "Bay Updated",
          description: `Bay ${data.bayNumber}: ${data.name} has been updated`,
        });
      }
    } catch (error) {
      console.error('Error updating bay:', error);
      toast({
        title: "Error",
        description: "Failed to update bay",
        variant: "destructive"
      });
    }
  };
  
  // Handle creating a new bay
  const handleCreateBay = async (bayId: number, data: Partial<ManufacturingBay>) => {
    try {
      if (onBayCreate) {
        // Use the parent component's mutation
        const newBay = await onBayCreate(data);
        
        // Update local state
        setBays(prev => [...prev, newBay]);
        
        toast({
          title: "Bay Created",
          description: `Bay ${data.bayNumber}: ${data.name} has been created`,
        });
      } else {
        // Fallback to direct API call
        const response = await apiRequest('POST', '/api/manufacturing-bays', data);
        
        if (!response.ok) {
          throw new Error(`Failed to create bay: ${response.statusText}`);
        }
        
        const newBay = await response.json();
        
        // Update local state
        setBays(prev => [...prev, newBay]);
        
        toast({
          title: "Bay Created",
          description: `Bay ${data.bayNumber}: ${data.name} has been created`,
        });
      }
    } catch (error) {
      console.error('Error creating bay:', error);
      toast({
        title: "Error",
        description: "Failed to create bay",
        variant: "destructive"
      });
    }
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent, bayId: number, slotIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Remove visual cue from all possible drop targets
    document.querySelectorAll('.bg-primary/10').forEach(el => {
      el.classList.remove('bg-primary/10');
    });
    document.querySelectorAll('.bay-row-highlight').forEach(el => {
      el.classList.remove('bay-row-highlight');
    });
    
    try {
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
      
      const data = JSON.parse(dataStr);
      if (!data) {
        console.error('Failed to parse drop data');
        return;
      }
      
      const bay = bays.find(b => b.id === bayId);
      if (!bay) {
        toast({
          title: "Error",
          description: "Bay not found",
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
      
      // Get the date for this slot
      const slotDate = slots[slotIndex]?.date;
      if (!slotDate) {
        toast({
          title: "Error",
          description: "Invalid date slot",
          variant: "destructive"
        });
        return;
      }
      
      // Calculate end date based on total hours and bay capacity
      // Make sure to use at least 1 hour per day
      const dailyCapacity = Math.max(1, (bay.hoursPerPersonPerWeek * bay.staffCount) / 5);
      const daysNeeded = Math.max(1, Math.ceil(data.totalHours / dailyCapacity));
      const endDate = addDays(slotDate, daysNeeded);
      
      console.log('Attempting to drop project:', {
        projectId: data.projectId || data.id,
        bayId,
        slotDate: slotDate.toISOString(),
        endDate: endDate.toISOString(),
        totalHours: data.totalHours,
        type: data.type
      });
      
      if (data.type === 'existing') {
        // Update existing schedule
        onScheduleChange(
          data.id,
          bayId,
          slotDate.toISOString(),
          endDate.toISOString(),
          data.totalHours
        ).then(() => {
          toast({
            title: "Schedule Updated",
            description: `${data.projectNumber} moved to Bay ${bay.bayNumber}`,
          });
        }).catch(err => {
          console.error('Failed to update schedule:', err);
          toast({
            title: "Error",
            description: "Failed to update schedule",
            variant: "destructive"
          });
        });
      } else {
        // Create new schedule
        onScheduleCreate(
          data.projectId,
          bayId,
          slotDate.toISOString(),
          endDate.toISOString(),
          data.totalHours
        ).then(() => {
          toast({
            title: "Schedule Created",
            description: `${data.projectNumber} assigned to Bay ${bay.bayNumber}`,
          });
        }).catch(err => {
          console.error('Failed to create schedule:', err);
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
        description: "Failed to process schedule. Please try again.",
        variant: "destructive"
      });
    }
    
    setDropTarget(null);
    setDraggingSchedule(null);
  };
  
  // Update state after edits
  const handleBayChanges = () => {
    // This function now consolidated and replaced with apiRequest in handleSaveBayEdit & handleCreateBay
    // Clear edit state when done
    setEditingBay(null);
    setNewBay(null);
  };
  
  // Render
  return (
    <div className="mb-8 overflow-hidden">
      {/* EditBayDialog for existing bay edit */}
      {editingBay && (
        <EditBayDialog 
          bay={editingBay}
          isOpen={!!editingBay}
          onClose={() => setEditingBay(null)}
          onSave={handleSaveBayEdit}
          isNewBay={false}
        />
      )}
      
      {/* EditBayDialog for new bay creation */}
      {newBay && (
        <EditBayDialog 
          bay={newBay}
          isOpen={!!newBay}
          onClose={() => setNewBay(null)}
          onSave={handleCreateBay}
          isNewBay={true}
        />
      )}
      
      <div className="flex">
        {/* Left sidebar with bay labels */}
        <div className="shrink-0 w-48 border-r border-gray-700">
          <div className="h-12 flex items-end pb-1 pl-3 text-xs font-semibold text-gray-400">
            Bays
          </div>
          {/* Display edit button for each bay */}
          {bays.map(bay => (
            <div 
              key={bay.id} 
              className="h-64 flex flex-col px-3 py-3 border-b border-gray-700"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <Badge variant="outline" className="mr-2">
                    {bay.bayNumber}
                  </Badge>
                  <div>
                    <div className="text-sm font-semibold">{bay.name}</div>
                    <BayCapacityInfo bay={bay} />
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setEditingBay(bay)}
                >
                  <PencilIcon className="h-3.5 w-3.5" />
                </Button>
              </div>
              
              {/* Show 4 rows visually in the sidebar */}
              <div className="flex-1 flex flex-col">
                <div className="flex-1 border-b border-gray-700/30 text-xs text-gray-500 pl-2">Row 1</div>
                <div className="flex-1 border-b border-gray-700/30 text-xs text-gray-500 pl-2">Row 2</div>
                <div className="flex-1 border-b border-gray-700/30 text-xs text-gray-500 pl-2">Row 3</div>
                <div className="flex-1 text-xs text-gray-500 pl-2">Row 4</div>
              </div>
            </div>
          ))}
          
          {/* Empty slots for additional bays */}
          {Array.from({ length: Math.max(0, 8 - bays.length) }).map((_, index) => (
            <div
              key={`empty-bay-${index}`}
              className="h-64 flex flex-col px-3 py-3 border-b border-gray-700 text-gray-500"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <Badge variant="outline" className="mr-2">
                    {bays.length + index + 1}
                  </Badge>
                  <div>
                    <div className="text-sm font-semibold">Empty Bay</div>
                    <div className="text-xs text-gray-500">
                      No staff assigned
                    </div>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    // Create a default empty bay to edit
                    const newBay: Partial<ManufacturingBay> = {
                      bayNumber: bays.length + index + 1,
                      name: `Bay ${bays.length + index + 1}`,
                      description: '',
                      staffCount: 0,
                      assemblyStaffCount: 0,
                      electricalStaffCount: 0,
                      hoursPerPersonPerWeek: 40,
                      isActive: true
                    };
                    setNewBay(newBay as ManufacturingBay);
                  }}
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                </Button>
              </div>
              
              {/* Show 4 rows visually in the sidebar */}
              <div className="flex-1 flex flex-col opacity-50">
                <div className="flex-1 border-b border-gray-700/30 text-xs text-gray-500 pl-2">Row 1</div>
                <div className="flex-1 border-b border-gray-700/30 text-xs text-gray-500 pl-2">Row 2</div>
                <div className="flex-1 border-b border-gray-700/30 text-xs text-gray-500 pl-2">Row 3</div>
                <div className="flex-1 text-xs text-gray-500 pl-2">Row 4</div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Main timeline grid */}
        <div className="overflow-x-auto flex-1" style={{ maxWidth: 'calc(100% - 48px)' }}>
          {/* Header row with time slots */}
          <div 
            className="h-12 border-b border-gray-700 grid" 
            style={{ 
              gridTemplateColumns: `repeat(${slots.length}, ${slotWidth}px)`,
              width: totalViewWidth 
            }}
          >
            {slots.map((slot, index) => (
              <div 
                key={index} 
                className={`border-r border-gray-700 flex flex-col justify-end pb-1 ${
                  slot.isWeekend ? 'bg-gray-800/20' : ''
                } ${isSameDay(slot.date, new Date()) ? 'bg-blue-900/20' : ''}`}
              >
                <div className="text-xs font-medium px-2">{slot.label}</div>
                {slot.sublabel && (
                  <div className="text-xs text-gray-400 px-2">{slot.sublabel}</div>
                )}
              </div>
            ))}
          </div>
          
          {/* Bay rows with schedule bars */}
          <div>
            {/* Existing bays - each bay now has 4 rows */}
            {bays.map(bay => (
              <div 
                key={bay.id} 
                className="relative h-64 border-b border-gray-700"
                style={{ width: totalViewWidth }}
              >
                {/* Grid columns */}
                <div 
                  className="absolute inset-0 grid bay-container" 
                  style={{ gridTemplateColumns: `repeat(${slots.length}, ${slotWidth}px)` }}
                >
                  {slots.map((slot, index) => (
                    <div 
                      key={index}
                      className={`border-r border-gray-700 h-full ${
                        slot.isWeekend ? 'bg-gray-800/20' : ''
                      } ${isSameDay(slot.date, new Date()) ? 'bg-blue-900/20' : ''} ${
                        dropTarget?.bayId === bay.id && dropTarget.slotIndex === index 
                          ? 'bg-primary/40 border-primary border-2 z-10' 
                          : ''
                      }`}
                      onDragOver={(e) => handleDragOver(e, bay.id, index)}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        // Add visual feedback on drag enter
                        e.currentTarget.classList.add('bg-primary/10');
                      }}
                      onDragLeave={(e) => {
                        // Remove visual feedback when leaving cell
                        e.currentTarget.classList.remove('bg-primary/10');
                      }}
                      onDrop={(e) => handleDrop(e, bay.id, index)}
                    />
                  ))}
                </div>
                
                {/* Row dividers */}
                <div className="absolute inset-0 flex flex-col pointer-events-none">
                  <div className="border-b border-gray-700/50 h-1/4 bay-row transition-colors"></div>
                  <div className="border-b border-gray-700/50 h-1/4 bay-row transition-colors"></div>
                  <div className="border-b border-gray-700/50 h-1/4 bay-row transition-colors"></div>
                  <div className="h-1/4 bay-row transition-colors"></div>
                </div>
                
                {/* Style for row highlight */}
                <style jsx>{`
                  .bay-row-highlight {
                    background-color: rgba(59, 130, 246, 0.15);
                    border-color: rgba(59, 130, 246, 0.3);
                  }
                `}</style>
                
                {/* Schedule bars */}
                {scheduleBars
                  .filter(bar => bar.bayId === bay.id)
                  .map(bar => {
                    // Calculate position based on row (0-3)
                    const rowHeight = 64 / 4; // Total height divided by 4 rows
                    const top = (bar.row || 0) * rowHeight + 2;
                    const height = rowHeight - 4;
                    
                    return (
                      <div
                        key={bar.id}
                        className="absolute rounded-sm z-10 border shadow-md group"
                        style={{
                          left: bar.left + 'px',
                          width: bar.width - 2 + 'px',  // -2 for borders
                          backgroundColor: bar.color,
                          opacity: draggingSchedule?.id === bar.id ? 0.5 : 0.8,
                          top: top + 'px',
                          height: height + 'px'
                        }}
                        draggable
                        onDragStart={(e) => handleDragStart(e, 'existing', {
                          id: bar.id,
                          projectId: bar.projectId,
                          projectName: bar.projectName,
                          projectNumber: bar.projectNumber,
                          totalHours: bar.totalHours,
                          bayId: bar.bayId
                        })}
                      >
                        {/* Content */}
                        <div className="absolute inset-0 flex items-center justify-between px-2 text-white">
                          <div className="font-medium text-xs truncate">
                            {bar.projectNumber}
                          </div>
                          <div className="text-xs opacity-80 shrink-0">
                            {bar.totalHours}h
                          </div>
                        </div>
                        
                        {/* Edit button (appears on hover) */}
                        <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <a 
                            href={`/project/${bar.projectId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center justify-center w-4 h-4 bg-white/20 hover:bg-white/30 rounded-bl text-white"
                          >
                            <PencilIcon className="h-2.5 w-2.5" />
                          </a>
                        </div>
                      </div>
                    );
                  })
                }
                
                {/* Bay label (shows on each row) */}
                <div className="absolute top-0 left-0 bg-gray-800/80 text-xs px-1 rounded-br z-20">
                  Bay {bay.bayNumber}
                </div>
              </div>
            ))}
            
            {/* Empty bay placeholders - each bay now has 4 rows */}
            {Array.from({ length: Math.max(0, 8 - bays.length) }).map((_, index) => (
              <div 
                key={`empty-bay-grid-${index}`} 
                className="relative h-64 border-b border-gray-700"
                style={{ width: totalViewWidth }}
              >
                {/* Grid columns */}
                <div 
                  className="absolute inset-0 grid bay-container" 
                  style={{ gridTemplateColumns: `repeat(${slots.length}, ${slotWidth}px)` }}
                >
                  {slots.map((slot, index) => (
                    <div 
                      key={index}
                      className={`border-r border-gray-700 h-full ${
                        slot.isWeekend ? 'bg-gray-800/20' : ''
                      } ${isSameDay(slot.date, new Date()) ? 'bg-blue-900/20' : ''}`}
                    />
                  ))}
                </div>
                
                {/* Row dividers */}
                <div className="absolute inset-0 flex flex-col pointer-events-none">
                  <div className="border-b border-gray-700/50 h-1/4 bay-row transition-colors"></div>
                  <div className="border-b border-gray-700/50 h-1/4 bay-row transition-colors"></div>
                  <div className="border-b border-gray-700/50 h-1/4 bay-row transition-colors"></div>
                  <div className="h-1/4 bay-row transition-colors"></div>
                </div>
                
                {/* Empty indicator */}
                <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-xs">
                  Empty Bay (Add projects by creating a bay first)
                </div>
                
                {/* Bay label */}
                <div className="absolute top-0 left-0 bg-gray-800/80 text-xs px-1 rounded-br z-20">
                  Bay {bays.length + index + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Unassigned projects panel */}
      <div className="mt-6 bg-darkCard p-4 rounded-md border border-gray-700">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-base font-semibold">Unassigned Projects</h3>
          <Button size="sm" variant="ghost" className="text-xs">
            <ChevronRight className="h-4 w-4 mr-1" />
            View All
          </Button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {projects
            .filter(project => !schedules.some(schedule => schedule.projectId === project.id))
            .map(project => (
              <div
                key={project.id}
                className="relative p-3 rounded-md border border-gray-700 bg-gray-800/50 shadow-sm hover:bg-gray-800 transition-colors group"
                draggable
                onDragStart={(e) => handleDragStart(e, 'new', {
                  projectId: project.id,
                  projectName: project.name,
                  projectNumber: project.projectNumber,
                  totalHours: project.totalHours || 40
                })}
              >
                <div className="text-sm font-medium">{project.projectNumber}</div>
                <div className="text-xs text-gray-400 mt-1 line-clamp-1">{project.name}</div>
                <div className="flex justify-between items-center mt-2">
                  <Badge variant="outline" className="bg-gray-700/50">{project.totalHours || 40}h</Badge>
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getProjectColor(project.id) }}
                    ></div>
                    
                    {/* Edit button */}
                    <a 
                      href={`/project/${project.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center text-gray-400 hover:text-white"
                    >
                      <PencilIcon className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Bay Edit Dialog */}
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