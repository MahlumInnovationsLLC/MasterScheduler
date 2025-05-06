import React, { useState, useEffect } from 'react';
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
import { AlertTriangle, Calendar, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
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

interface ManufacturingBayLayoutProps {
  schedules: ManufacturingSchedule[];
  projects: Project[];
  bays: {
    id: number;
    name: string;
    bayNumber: number;
    description: string;
    isActive: boolean;
  }[];
  onScheduleChange: (scheduleId: number, newBayId: number, newStartDate: string, newEndDate: string) => Promise<void>;
  onScheduleCreate: (projectId: number, bayId: number, startDate: string, endDate: string) => Promise<void>;
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

  const formatDateDisplay = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d');
    } catch {
      return 'N/A';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`cursor-grab active:cursor-grabbing bg-darkCard rounded-md p-3 border border-gray-800 shadow-sm ${
        isDragging ? 'shadow-lg' : ''
      }`}
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="font-medium text-sm">{project.name}</div>
          <div className="text-xs text-gray-400 mt-0.5">{project.projectNumber}</div>
        </div>
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
        h-16 w-24 border-b border-r border-gray-800 flex items-center justify-center relative
        ${isToday ? 'bg-primary bg-opacity-5' : ''}
        ${isWeekend ? 'bg-gray-900' : ''}
        ${isOver ? 'bg-primary bg-opacity-20' : ''}
        ${slot.isDisabled ? 'bg-gray-800 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-800'}
      `}
      onDoubleClick={() => onDoubleClick(slot)}
    >
      <div className="absolute top-1 right-2 text-xs text-gray-400">{day}</div>
    </div>
  );
};

// Main manufacturing bay layout component
const ManufacturingBayLayout: React.FC<ManufacturingBayLayoutProps> = ({
  schedules,
  projects,
  bays,
  onScheduleChange,
  onScheduleCreate
}) => {
  const { toast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [selectedBayId, setSelectedBayId] = useState<number | 'all'>('all');
  const [activeProject, setActiveProject] = useState<ProjectCard | null>(null);
  const [baySlots, setBaySlots] = useState<BaySlot[][]>([]);
  const [unassignedProjects, setUnassignedProjects] = useState<ProjectCard[]>([]);

  // Set up sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Helper function to get days in a month
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Helper to get project name from project ID
  const getProjectInfo = (projectId: number) => {
    const project = projects.find(p => p.id === projectId);
    return {
      name: project?.name || 'Unknown Project',
      projectNumber: project?.projectNumber || '--'
    };
  };

  // Helper to get bay info from bay ID
  const getBayInfo = (bayId: number) => {
    const bay = bays.find(b => b.id === bayId);
    return {
      name: bay?.name || 'Unknown Bay',
      bayNumber: bay?.bayNumber || 0
    };
  };

  // Generate slots for the calendar view
  useEffect(() => {
    const currentYear = selectedMonth.getFullYear();
    const currentMonth = selectedMonth.getMonth();
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    
    // Convert schedules to our internal format with project and bay info
    const scheduleItems: ScheduleItem[] = schedules.map(schedule => {
      const { name, projectNumber } = getProjectInfo(schedule.projectId);
      const { name: bayName, bayNumber } = getBayInfo(schedule.bayId);
      
      return {
        id: schedule.id,
        projectId: schedule.projectId,
        bayId: schedule.bayId,
        startDate: schedule.startDate,
        endDate: schedule.endDate,
        status: schedule.status as 'scheduled' | 'in_progress' | 'complete' | 'maintenance',
        projectName: name,
        projectNumber,
        bayName,
        bayNumber
      };
    });
    
    // Generate bay slots for each bay
    const newBaySlots: BaySlot[][] = [];
    
    // Filter bays if a specific bay is selected
    const activeBays = selectedBayId === 'all' 
      ? bays.filter(bay => bay.isActive)
      : bays.filter(bay => bay.id === selectedBayId && bay.isActive);
    
    activeBays.forEach(bay => {
      const bayRow: BaySlot[] = [];
      
      // Create a slot for each day in the month
      for (let day = 1; day <= daysInMonth; day++) {
        const slotDate = new Date(currentYear, currentMonth, day);
        const slotKey = `bay-${bay.id}-day-${day}`;
        
        // Check if this slot has a schedule assigned
        const occupyingSchedule = scheduleItems.find(schedule => {
          const startDate = new Date(schedule.startDate);
          const endDate = new Date(schedule.endDate);
          
          return (
            schedule.bayId === bay.id &&
            slotDate >= startDate &&
            slotDate <= endDate
          );
        });
        
        bayRow.push({
          id: slotKey,
          bayId: bay.id,
          position: day,
          date: slotDate,
          scheduleId: occupyingSchedule?.id,
          isOccupied: !!occupyingSchedule,
          isDisabled: false // We could add logic here for maintenance days etc.
        });
      }
      
      newBaySlots.push(bayRow);
    });
    
    setBaySlots(newBaySlots);
    
    // Update unassigned projects list
    // Here we're creating "cards" for projects that don't have manufacturing schedules
    const assignedProjectIds = scheduleItems.map(item => item.projectId);
    const newUnassignedProjects: ProjectCard[] = [];
    
    // Convert schedules to project cards
    const scheduledProjects = scheduleItems.map(schedule => ({
      id: schedule.projectId,
      name: schedule.projectName,
      projectNumber: schedule.projectNumber,
      scheduleId: schedule.id,
      status: schedule.status,
      startDate: schedule.startDate,
      endDate: schedule.endDate
    }));
    
    // Add projects without schedules
    projects.forEach(project => {
      if (!assignedProjectIds.includes(project.id)) {
        newUnassignedProjects.push({
          id: project.id,
          name: project.name,
          projectNumber: project.projectNumber,
          status: 'scheduled', // Default status for unassigned projects
          startDate: project.startDate,
          endDate: project.estimatedCompletionDate || project.startDate
        });
      }
    });
    
    setUnassignedProjects(newUnassignedProjects);
    
  }, [schedules, projects, bays, selectedMonth, selectedBayId]);

  // Handle month navigation
  const goToPreviousMonth = () => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    setSelectedMonth(newDate);
  };
  
  const goToNextMonth = () => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    setSelectedMonth(newDate);
  };
  
  const goToCurrentMonth = () => {
    setSelectedMonth(new Date());
  };

  // Handle drag start event
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const { project } = active.data.current as { project: ProjectCard };
    setActiveProject(project);
  };

  // Handle drag end event
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveProject(null);
    
    if (!over) return;
    
    const projectId = parseInt(active.id.toString());
    const slotId = over.id.toString();
    
    // Check if we're dropping on a bay card
    const isBayDrop = slotId.startsWith('bay-card-');
    
    if (isBayDrop) {
      // Extract bay ID from the drop target ID
      const bayId = parseInt(slotId.replace('bay-card-', ''));
      const bay = bays.find(b => b.id === bayId);
      
      if (bay) {
        // Start date is the first day of the current month
        const startDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
        // End date is 7 days later (default duration)
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 7);
        
        // Check for conflicts
        const conflict = checkScheduleConflict(
          bayId,
          startDate.toISOString(),
          endDate.toISOString(),
          schedules
        );
        
        if (conflict) {
          toast({
            title: "Schedule Conflict",
            description: "This bay already has a schedule during this time period.",
            variant: "destructive"
          });
          return;
        }
        
        try {
          // Create a new schedule
          await onScheduleCreate(
            projectId,
            bayId,
            startDate.toISOString(),
            endDate.toISOString()
          );
          
          toast({
            title: "Project Scheduled",
            description: `Project scheduled to Bay ${bay.bayNumber}.`
          });
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to schedule project. Please try again.",
            variant: "destructive"
          });
        }
        
        return;
      }
    }
    
    // Find the slot that was dropped on (for timeline placement)
    let targetSlot: BaySlot | undefined;
    for (const row of baySlots) {
      const found = row.find(slot => slot.id === slotId);
      if (found) {
        targetSlot = found;
        break;
      }
    }
    
    if (!targetSlot) return;
    
    // Get the project from either unassigned or scheduled
    const project = activeProject;
    if (!project) return;
    
    // If the project has an existing schedule, update it
    if (project.scheduleId) {
      // Calculate a reasonable end date (e.g., 7 days from start)
      const startDate = targetSlot.date.toISOString();
      const endDate = new Date(targetSlot.date);
      endDate.setDate(endDate.getDate() + 7); // Default to 7-day duration
      
      // Check for conflicts
      const otherSchedules = schedules.filter(s => s.id !== project.scheduleId);
      const conflict = checkScheduleConflict(
        targetSlot.bayId,
        startDate,
        endDate.toISOString(),
        otherSchedules
      );
      
      if (conflict) {
        toast({
          title: "Schedule Conflict",
          description: "This bay is already scheduled during this time period.",
          variant: "destructive"
        });
        return;
      }
      
      try {
        // Update the schedule
        await onScheduleChange(
          project.scheduleId,
          targetSlot.bayId,
          startDate,
          endDate.toISOString()
        );
        
        toast({
          title: "Schedule Updated",
          description: `${project.name} has been rescheduled.`
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to update schedule. Please try again.",
          variant: "destructive"
        });
      }
    } else {
      // Create a new schedule for this project
      const startDate = targetSlot.date.toISOString();
      const endDate = new Date(targetSlot.date);
      endDate.setDate(endDate.getDate() + 7); // Default to 7-day duration
      
      // Check for conflicts
      const conflict = checkScheduleConflict(
        targetSlot.bayId,
        startDate,
        endDate.toISOString(),
        schedules
      );
      
      if (conflict) {
        toast({
          title: "Schedule Conflict",
          description: "This bay is already scheduled during this time period.",
          variant: "destructive"
        });
        return;
      }
      
      try {
        // Create a new schedule
        await onScheduleCreate(
          projectId,
          targetSlot.bayId,
          startDate,
          endDate.toISOString()
        );
        
        toast({
          title: "Schedule Created",
          description: `${project.name} has been scheduled.`
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to create schedule. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  // Handle double-click on a slot to show schedule details
  const handleSlotDoubleClick = (slot: BaySlot) => {
    if (slot.scheduleId) {
      const schedule = schedules.find(s => s.id === slot.scheduleId);
      if (schedule) {
        const { name, projectNumber } = getProjectInfo(schedule.projectId);
        const { name: bayName } = getBayInfo(schedule.bayId);
        
        toast({
          title: `${name} (${projectNumber})`,
          description: `Scheduled in ${bayName} from ${format(new Date(schedule.startDate), 'MMM d, yyyy')} to ${format(new Date(schedule.endDate), 'MMM d, yyyy')}`,
        });
      }
    } else {
      toast({
        title: "Empty Slot",
        description: `${format(slot.date, 'MMMM d, yyyy')} is available for scheduling.`,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
        {/* Manufacturing Bays (Left Side) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Manufacturing Bays</CardTitle>
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <span>Drag projects to bays</span>
                <Info className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="space-y-3">
                {bays.map((bay) => (
                  <div 
                    key={bay.id} 
                    id={`bay-card-${bay.id}`} // Important ID for drop identification
                    className="bg-darkCard p-3 rounded-md border border-gray-800 flex items-center justify-between cursor-pointer hover:border-primary hover:bg-gray-900 transition-colors"
                  >
                    <div>
                      <div className="font-medium">Bay {bay.bayNumber}</div>
                      <div className="text-xs text-gray-400">{bay.name || `Manufacturing Bay ${bay.bayNumber}`}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={bay.isActive ? 'bg-success bg-opacity-10 text-success' : 'bg-gray-500 bg-opacity-10 text-gray-500'}>
                        {bay.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <div className="text-xs text-gray-400">Drop projects here</div>
                    </div>
                  </div>
                ))}
              </div>
              
              <DragOverlay>
                {activeProject && (
                  <SortableProjectCard 
                    project={activeProject} 
                    isDragging={true}
                  />
                )}
              </DragOverlay>
            </DndContext>
          </CardContent>
        </Card>
        
        {/* Manufacturing Timeline (Right Side) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Manufacturing Timeline</CardTitle>
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <span>Drag projects to schedule them</span>
                <Info className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToCurrentMonth}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Select
                value={selectedBayId === 'all' ? 'all' : selectedBayId.toString()}
                onValueChange={(value) => setSelectedBayId(value === 'all' ? 'all' : parseInt(value))}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Select Bay" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Bays</SelectItem>
                  {bays.map((bay) => (
                    <SelectItem key={bay.id} value={bay.id.toString()}>
                      Bay {bay.bayNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="border-b border-gray-800 pl-32 pr-4 pt-2 pb-1">
              <div className="text-lg font-medium">
                {format(selectedMonth, 'MMMM yyyy')}
              </div>
            </div>
            
            <div className="relative overflow-x-auto">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <div className="min-w-max">
                  {/* Header row with day numbers */}
                  <div className="flex border-b border-gray-800">
                    <div className="w-32 flex-shrink-0"></div>
                    {baySlots.length > 0 && baySlots[0].map((slot) => (
                      <div 
                        key={`header-${slot.position}`}
                        className="h-10 w-24 flex items-center justify-center text-xs text-gray-400"
                      >
                        {format(slot.date, 'EEE')}
                      </div>
                    ))}
                  </div>
                  
                  {/* Bay rows */}
                  {baySlots.map((row, rowIndex) => {
                    const bayId = row.length > 0 ? row[0].bayId : 0;
                    const bay = bays.find(b => b.id === bayId);
                    
                    return (
                      <div key={`bay-${bayId}`} className="flex border-b border-gray-800">
                        <div className="w-32 flex-shrink-0 border-r border-gray-800 bg-gray-900 flex items-center justify-center">
                          <div className="text-center">
                            <div className="font-medium">Bay {bay?.bayNumber}</div>
                            <div className="text-xs text-gray-400">{bay?.name}</div>
                          </div>
                        </div>
                        
                        {/* Slots for this bay */}
                        <div className="flex flex-1">
                          {row.map((slot) => {
                            // Find schedule for this slot if it exists
                            const schedule = schedules.find(s => s.id === slot.scheduleId);
                            const isFirstDayOfSchedule = schedule && 
                              format(new Date(schedule.startDate), 'yyyy-MM-dd') === 
                              format(slot.date, 'yyyy-MM-dd');
                            
                            // Only show the project card on the first day of the schedule
                            return (
                              <div key={slot.id} className="relative">
                                <BaySlot 
                                  slot={slot} 
                                  onDoubleClick={handleSlotDoubleClick}
                                />
                                
                                {isFirstDayOfSchedule && schedule && (
                                  <div 
                                    className="absolute top-0 left-0 right-0 bottom-0 z-10 flex items-center justify-center"
                                    style={{
                                      width: `${calculateProjectWidth(schedule, row)}px`
                                    }}
                                  >
                                    <div className="w-full h-full py-1 px-2">
                                      <ProjectCard 
                                        schedule={schedule}
                                        projects={projects}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <DragOverlay>
                  {activeProject && (
                    <SortableProjectCard 
                      project={activeProject} 
                      isDragging={true}
                    />
                  )}
                </DragOverlay>
              </DndContext>
            </div>
          </CardContent>
        </Card>
        
        {/* Unassigned Projects */}
        <Card>
          <CardHeader>
            <CardTitle>Unassigned Projects</CardTitle>
            <div className="text-sm text-gray-400">
              Drag to schedule
            </div>
          </CardHeader>
          <CardContent>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="space-y-3">
                {unassignedProjects.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <div className="mb-2">
                      <AlertTriangle className="h-8 w-8 mx-auto text-gray-400" />
                    </div>
                    No unassigned projects
                  </div>
                ) : (
                  <SortableContext
                    items={unassignedProjects.map(p => p.id.toString())}
                    strategy={horizontalListSortingStrategy}
                  >
                    {unassignedProjects.map(project => (
                      <SortableProjectCard 
                        key={project.id} 
                        project={project}
                      />
                    ))}
                  </SortableContext>
                )}
              </div>
              
              <DragOverlay>
                {activeProject && (
                  <SortableProjectCard 
                    project={activeProject} 
                    isDragging={true}
                  />
                )}
              </DragOverlay>
            </DndContext>
          </CardContent>
          <CardFooter className="border-t pt-4 flex justify-between">
            <div className="text-sm text-gray-400">
              {unassignedProjects.length} projects unscheduled
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

// Helper components

// Project card that appears in the bay slot on the calendar
const ProjectCard = ({ 
  schedule, 
  projects 
}: { 
  schedule: ManufacturingSchedule; 
  projects: Project[];
}) => {
  const project = projects.find(p => p.id === schedule.projectId);
  
  // Calculate how many days the project spans
  const startDate = new Date(schedule.startDate);
  const endDate = new Date(schedule.endDate);
  const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  // Determine status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-500 border-blue-500';
      case 'in_progress':
        return 'bg-amber-500 border-amber-500';
      case 'complete':
        return 'bg-green-500 border-green-500';
      case 'maintenance':
        return 'bg-purple-500 border-purple-500';
      default:
        return 'bg-gray-500 border-gray-500';
    }
  };
  
  return (
    <div
      className={`h-full rounded-sm border-l-4 px-2 py-1 bg-opacity-20 relative ${getStatusColor(schedule.status)}`}
      style={{ width: `${Math.min(durationDays * 100, 400)}%` }}
    >
      <div className="text-xs font-medium truncate">{project?.name}</div>
      <div className="text-xs text-gray-400 truncate">{project?.projectNumber}</div>
      <div className="absolute bottom-1 right-2 text-xs opacity-75">
        {durationDays} days
      </div>
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
  
  if (startSlotIndex === -1) return 24; // Slot width
  
  // Find how many days this project spans
  const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  // Calculate how many days are visible in the current month view
  const visibleDays = Math.min(
    durationDays,
    slotRow.length - startSlotIndex
  );
  
  return visibleDays * 24; // Each slot is 24px wide
};

export default ManufacturingBayLayout;