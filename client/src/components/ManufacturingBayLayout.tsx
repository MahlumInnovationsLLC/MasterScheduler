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
import { format, addWeeks, eachWeekOfInterval, startOfWeek, endOfWeek, isSameWeek } from 'date-fns';
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
  onUpdateBay?: (bayId: number, name: string, description: string) => Promise<void>;
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

  // Helper to format dates in a friendly format
  const formatDateDisplay = (dateString: string) => {
    const date = new Date(dateString);
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
  
  return (
    <div 
      className={`
        h-12 w-36 border-r border-b border-gray-800 relative
        ${isToday ? 'bg-primary/10' : isWeekend ? 'bg-gray-900/10' : 'bg-transparent'}
        ${slot.isOccupied ? 'cursor-not-allowed' : 'cursor-pointer'}
        ${slot.isDisabled ? 'opacity-50' : ''}
        ${isOver ? 'bg-primary/20' : ''}
      `}
      id={slot.id}
      onDoubleClick={() => onDoubleClick(slot)}
    />
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
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xl font-semibold text-primary">{group.name}</h3>
        <Badge variant="outline" className="text-xs">Team: {group.team}</Badge>
      </div>
      
      {group.bays.map(bay => (
        <div key={bay.id} className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <h4 className="font-medium">{bay.name} - Bay {bay.bayNumber}</h4>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 ml-2"
                onClick={() => onEditBay(bay)}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-xs text-gray-400">{bay.description}</div>
          </div>
          
          <div className="flex relative">
            {/* Bay slots */}
            <div className="flex">
              {slots[bay.id]?.map(slot => (
                <BaySlot 
                  key={slot.id} 
                  slot={slot} 
                  onDoubleClick={onSlotDoubleClick} 
                />
              ))}
            </div>
            
            {/* Project cards positioned absolutely over the slots */}
            <div className="absolute top-0 left-0 h-12">
              {schedules
                .filter(schedule => schedule.bayId === bay.id)
                .map(schedule => {
                  // Find the starting slot for this schedule
                  const startSlot = slots[bay.id]?.find(slot => 
                    format(slot.date, 'yyyy-MM-dd') === format(new Date(schedule.startDate), 'yyyy-MM-dd')
                  );
                  
                  if (!startSlot) return null;
                  
                  // Calculate the width based on duration
                  const width = calculateProjectWidth(schedule, slots[bay.id] || []);
                  
                  // Determine the left position based on the start date
                  const startIndex = slots[bay.id]?.findIndex(s => s.id === startSlot.id) || 0;
                  const left = startIndex * 36; // Each slot is 36px wide

                  return (
                    <div 
                      key={schedule.id}
                      className="absolute h-11 rounded-sm border overflow-hidden"
                      style={{ 
                        left: `${left}px`, 
                        width: `${width}px`, 
                        top: '2px',
                        backgroundColor: getScheduleColor(schedule.status)
                      }}
                    >
                      <div className="p-1 text-xs font-medium truncate">
                        {schedule.projectName}
                      </div>
                      <div className="px-1 text-[10px] truncate text-gray-200">
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
}) => {
  const { toast } = useToast();
  
  // State for timeline navigation
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
  
  // State for weeks display in the timeline
  const [weeks, setWeeks] = useState<WeekRange[]>([]);
  
  // State for bay editing dialog
  const [isEditingBay, setIsEditingBay] = useState(false);
  const [currentBay, setCurrentBay] = useState<Bay | null>(null);
  const [bayName, setBayName] = useState('');
  const [bayDescription, setBayDescription] = useState('');
  
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
      
      // Create a slot for each day in the date range
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        // Check if this slot is occupied by a schedule
        const isOccupied = schedules.some(schedule => {
          const scheduleStart = new Date(schedule.startDate);
          const scheduleEnd = new Date(schedule.endDate);
          
          return (
            schedule.bayId === bay.id &&
            currentDate >= scheduleStart &&
            currentDate <= scheduleEnd
          );
        });
        
        baySlots.push({
          id: `slot-${bay.id}-${format(currentDate, 'yyyy-MM-dd')}`,
          bayId: bay.id,
          position,
          date: new Date(currentDate),
          isOccupied,
          isDisabled: false,
        });
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
        position++;
      }
      
      result[bay.id] = baySlots;
    });
    
    return result;
  }, [bays, schedules, weeks]);
  
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
        endDate: p.endDate || new Date().toISOString()
      }));
  }, [projects, schedules]);
  
  // Initialize weeks when component mounts
  useEffect(() => {
    const today = new Date();
    initializeWeeks(today);
  }, []);
  
  // Generate weeks for the timeline
  const initializeWeeks = (startDate: Date, numberOfWeeks = 4) => {
    const start = startOfWeek(startDate, { weekStartsOn: 1 }); // Start on Monday
    const end = endOfWeek(addWeeks(start, numberOfWeeks - 1), { weekStartsOn: 1 });
    
    const weeksArray = eachWeekOfInterval(
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
    
    setWeeks(weeksArray);
    setCurrentWeek(start);
  };
  
  // Navigate to previous set of weeks
  const goToPreviousWeeks = () => {
    if (weeks.length > 0) {
      const newStart = addWeeks(weeks[0].startDate, -4);
      initializeWeeks(newStart);
    }
  };
  
  // Navigate to next set of weeks
  const goToNextWeeks = () => {
    if (weeks.length > 0) {
      const newStart = addWeeks(weeks[0].startDate, 4);
      initializeWeeks(newStart);
    }
  };
  
  // Handle starting to edit a bay
  const handleEditBay = (bay: Bay) => {
    setCurrentBay(bay);
    setBayName(bay.name);
    setBayDescription(bay.description || '');
    setIsEditingBay(true);
  };
  
  // Handle saving bay edits
  const handleSaveBay = async () => {
    if (!currentBay || !onUpdateBay) return;
    
    try {
      await onUpdateBay(currentBay.id, bayName, bayDescription);
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
      await onScheduleCreate(
        selectedProject,
        selectedBay,
        schedulingStartDate,
        schedulingEndDate
      );
      
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
        } else {
          // Create new schedule
          await onScheduleCreate(
            projectId,
            bayId,
            startDate,
            endDate
          );
          
          toast({
            title: "Schedule created",
            description: "The project has been scheduled successfully.",
          });
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
      
      {/* Week indicators */}
      <div className="mb-4 ml-36">
        <div className="flex">
          {weeks.map((week, index) => (
            <div 
              key={week.weekNumber}
              className="flex-shrink-0 text-center font-medium"
              style={{ width: `${7 * 36}px` }} // 7 days per week, 36px per day
            >
              Week {week.weekNumber}
            </div>
          ))}
        </div>
        
        {/* Days of week */}
        <div className="flex">
          {weeks.map(week => (
            <React.Fragment key={week.weekNumber}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, dayIndex) => (
                <div 
                  key={`${week.weekNumber}-${day}`}
                  className="flex-shrink-0 text-xs text-center py-1"
                  style={{ width: '36px' }}
                >
                  {day}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
      
      <div className="flex">
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
                schedules={schedules.filter(s => 
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
              Make changes to the bay name and description.
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
const calculateProjectWidth = (schedule: ManufacturingSchedule, slotRow: BaySlot[]) => {
  const startDate = new Date(schedule.startDate);
  const endDate = new Date(schedule.endDate);
  
  // Find the index of the slot that matches the start date
  const startSlotIndex = slotRow.findIndex(slot => 
    format(slot.date, 'yyyy-MM-dd') === format(startDate, 'yyyy-MM-dd')
  );
  
  if (startSlotIndex === -1) return 36; // Slot width
  
  // Find how many days this project spans
  const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  // Calculate how many days are visible in the current month view
  const visibleDays = Math.min(
    durationDays,
    slotRow.length - startSlotIndex
  );
  
  return visibleDays * 36; // Each slot is 36px wide
};

export default ManufacturingBayLayout;