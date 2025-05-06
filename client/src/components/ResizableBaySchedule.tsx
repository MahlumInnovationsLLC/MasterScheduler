import React, { useState, useEffect, useMemo } from 'react';
import { format, addDays, differenceInDays, isSameDay, addWeeks, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { PlusCircle, GripVertical, Info, X, ArrowsExpand, ChevronRight, PencilIcon, PlusIcon } from 'lucide-react';
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

interface ResizableBayScheduleProps {
  schedules: ManufacturingSchedule[];
  projects: Project[];
  bays: ManufacturingBay[];
  onScheduleChange: (scheduleId: number, newBayId: number, newStartDate: string, newEndDate: string, totalHours?: number) => Promise<void>;
  onScheduleCreate: (projectId: number, bayId: number, startDate: string, endDate: string, totalHours?: number) => Promise<void>;
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
}

const generateTimeSlots = (dateRange: { start: Date, end: Date }, viewMode: 'day' | 'week' | 'month' | 'quarter') => {
  const slots = [];
  let current = new Date(dateRange.start);
  let slotWidth = 0;
  let format_string = '';
  
  switch (viewMode) {
    case 'day':
      slotWidth = 50;
      format_string = 'MMM d';
      while (current <= dateRange.end) {
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
      while (current <= dateRange.end) {
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
      while (current <= dateRange.end) {
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
      while (current <= dateRange.end) {
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

// EditBayDialog component for editing bay capacity
const EditBayDialog = ({ 
  bay, 
  isOpen, 
  onClose, 
  onSave 
}: { 
  bay: ManufacturingBay, 
  isOpen: boolean, 
  onClose: () => void,
  onSave: (bayId: number, staffCount: number, hoursPerPersonPerWeek: number) => void 
}) => {
  const [staffCount, setStaffCount] = useState(bay.staffCount);
  const [hoursPerWeek, setHoursPerWeek] = useState(bay.hoursPerPersonPerWeek);
  
  const handleSave = () => {
    onSave(bay.id, staffCount, hoursPerWeek);
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Bay Capacity</DialogTitle>
          <DialogDescription>
            Update staff count and hours per person for Bay {bay.bayNumber}: {bay.name}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-right text-sm">Staff Count</label>
            <input
              type="number"
              className="col-span-3 p-2 rounded bg-gray-800 border border-gray-700"
              value={staffCount}
              min={1}
              onChange={(e) => setStaffCount(parseInt(e.target.value) || 1)}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-right text-sm">Hours per Person/Week</label>
            <input
              type="number" 
              className="col-span-3 p-2 rounded bg-gray-800 border border-gray-700"
              value={hoursPerWeek}
              min={1}
              max={80}
              onChange={(e) => setHoursPerWeek(parseInt(e.target.value) || 40)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ResizableBaySchedule: React.FC<ResizableBayScheduleProps> = ({
  schedules,
  projects,
  bays,
  onScheduleChange,
  onScheduleCreate,
  dateRange,
  viewMode
}) => {
  const { toast } = useToast();
  const [draggingSchedule, setDraggingSchedule] = useState<any>(null);
  const [resizingSchedule, setResizingSchedule] = useState<any>(null);
  const [dropTarget, setDropTarget] = useState<{ bayId: number, slotIndex: number } | null>(null);
  const [editingBay, setEditingBay] = useState<ManufacturingBay | null>(null);
  
  // Generate time slots based on view mode
  const { slots, slotWidth } = useMemo(() => 
    generateTimeSlots(dateRange, viewMode), 
    [dateRange, viewMode]
  );
  
  const totalViewWidth = slots.length * slotWidth;
  
  // Map schedules to visual bars
  const scheduleBars = useMemo(() => {
    if (!schedules.length || !slots.length) return [];
    
    return schedules.map(schedule => {
      const project = projects.find(p => p.id === schedule.projectId);
      const bay = bays.find(b => b.id === schedule.bayId);
      
      if (!project || !bay) return null;
      
      const startDate = new Date(schedule.startDate);
      const endDate = new Date(schedule.endDate);
      
      // Find the slot index for start and end
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
      
      return {
        id: schedule.id,
        projectId: schedule.projectId,
        bayId: schedule.bayId,
        startDate,
        endDate,
        totalHours: schedule.totalHours || 40,
        projectName: project.name,
        projectNumber: project.projectNumber,
        width: barWidth,
        left: barLeft,
        color: getProjectColor(project.id)
      };
    }).filter(Boolean);
  }, [schedules, projects, bays, slots, viewMode, slotWidth]);
  
  // Handle drag start
  const handleDragStart = (e: React.DragEvent, type: 'existing' | 'new', data: any) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type,
      ...data
    }));
    setDraggingSchedule(data);
  };
  
  // Handle drag over
  const handleDragOver = (e: React.DragEvent, bayId: number, slotIndex: number) => {
    e.preventDefault();
    setDropTarget({ bayId, slotIndex });
  };
  
  // Handle drop
  const handleDrop = (e: React.DragEvent, bayId: number, slotIndex: number) => {
    e.preventDefault();
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (!data) return;
      
      const bay = bays.find(b => b.id === bayId);
      if (!bay) return;
      
      // Get the date for this slot
      const slotDate = slots[slotIndex]?.date;
      if (!slotDate) return;
      
      // Calculate end date based on total hours and bay capacity
      const dailyCapacity = (bay.hoursPerPersonPerWeek * bay.staffCount) / 5;
      const daysNeeded = Math.ceil(data.totalHours / dailyCapacity);
      const endDate = addDays(slotDate, daysNeeded);
      
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
    setDraggingSchedule(null);
  };
  
  // Handle bay capacity edit
  const handleSaveBayEdit = async (bayId: number, staffCount: number, hoursPerPersonPerWeek: number) => {
    // In a real implementation, this would call an API to update the bay
    toast({
      title: "Bay Updated",
      description: `Staff count: ${staffCount}, Hours per week: ${hoursPerPersonPerWeek}`,
    });
    
    // For now, we'll just close the dialog
    setEditingBay(null);
  };
  
  // Render
  return (
    <div className="mb-8 overflow-hidden">
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
              className="h-16 flex items-center justify-between px-3 border-b border-gray-700"
            >
              <div className="flex items-center">
                <Badge variant="outline" className="mr-2">
                  {bay.bayNumber}
                </Badge>
                <div>
                  <div className="text-sm font-semibold">{bay.name}</div>
                  <div className="text-xs text-gray-400">
                    {bay.staffCount} staff · {bay.hoursPerPersonPerWeek * bay.staffCount}h/week
                  </div>
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
          ))}
          
          {/* Empty slots for additional bays */}
          {Array.from({ length: Math.max(0, 8 - bays.length) }).map((_, index) => (
            <div
              key={`empty-bay-${index}`}
              className="h-16 flex items-center justify-between px-3 border-b border-gray-700 text-gray-500"
            >
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
                onClick={() => toast({
                  title: "Not Implemented",
                  description: "Adding new bays is not implemented in this demo.",
                })}
              >
                <PlusIcon className="h-3.5 w-3.5" />
              </Button>
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
            {/* Existing bays */}
            {bays.map(bay => (
              <div 
                key={bay.id} 
                className="relative h-16 border-b border-gray-700"
                style={{ width: totalViewWidth }}
              >
                {/* Grid columns */}
                <div 
                  className="absolute inset-0 grid" 
                  style={{ gridTemplateColumns: `repeat(${slots.length}, ${slotWidth}px)` }}
                >
                  {slots.map((slot, index) => (
                    <div 
                      key={index}
                      className={`border-r border-gray-700 h-full ${
                        slot.isWeekend ? 'bg-gray-800/20' : ''
                      } ${isSameDay(slot.date, new Date()) ? 'bg-blue-900/20' : ''} ${
                        dropTarget?.bayId === bay.id && dropTarget.slotIndex === index 
                          ? 'bg-primary/20' 
                          : ''
                      }`}
                      onDragOver={(e) => handleDragOver(e, bay.id, index)}
                      onDrop={(e) => handleDrop(e, bay.id, index)}
                    />
                  ))}
                </div>
                
                {/* Schedule bars */}
                {scheduleBars
                  .filter(bar => bar.bayId === bay.id)
                  .map(bar => (
                    <div
                      key={bar.id}
                      className="absolute top-2 bottom-2 rounded-sm z-10 cursor-move border shadow-md"
                      style={{
                        left: bar.left + 'px',
                        width: bar.width - 2 + 'px',  // -2 for borders
                        backgroundColor: bar.color,
                        opacity: draggingSchedule?.id === bar.id ? 0.5 : 0.8
                      }}
                      draggable
                      onDragStart={(e) => handleDragStart(e, 'existing', bar)}
                    >
                      <div className="flex items-center justify-between h-full px-2 text-white">
                        <div className="font-medium text-xs truncate">
                          {bar.projectNumber}
                        </div>
                        <div className="text-xs opacity-80 shrink-0">
                          {bar.totalHours}h
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
            ))}
            
            {/* Empty bay placeholders */}
            {Array.from({ length: Math.max(0, 8 - bays.length) }).map((_, index) => (
              <div 
                key={`empty-bay-grid-${index}`} 
                className="relative h-16 border-b border-gray-700"
                style={{ width: totalViewWidth }}
              >
                {/* Grid columns */}
                <div 
                  className="absolute inset-0 grid" 
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
                
                {/* Empty indicator */}
                <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-xs">
                  Empty Bay (Add projects by creating a bay first)
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
                className="p-3 rounded-md border border-gray-700 bg-gray-800/50 shadow-sm cursor-move hover:bg-gray-800 transition-colors"
                draggable
                onDragStart={(e) => handleDragStart(e, 'new', {
                  projectId: project.id,
                  projectName: project.name,
                  projectNumber: project.projectNumber,
                  totalHours: 40
                })}
              >
                <div className="text-sm font-medium">{project.projectNumber}</div>
                <div className="text-xs text-gray-400 mt-1 line-clamp-1">{project.name}</div>
                <div className="flex justify-between items-center mt-2">
                  <Badge variant="outline" className="bg-gray-700/50">40h</Badge>
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getProjectColor(project.id) }}
                  ></div>
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