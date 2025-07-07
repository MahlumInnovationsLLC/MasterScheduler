import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, parseISO, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, startOfWeek, endOfWeek } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Project } from '@shared/schema';
import { ModuleHelpButton } from '@/components/ModuleHelpButton';
import { calendarHelpContent } from '@/data/moduleHelpContent';
import { cn } from '@/lib/utils';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date | string;
  projectId: number;
  projectNumber: string;
  projectName: string;
  type: 'billing' | 'timeline';
  color: string;
  status?: string;
  amount?: number;
  phase?: string;
}

const CalendarPage = () => {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [billingMonth, setBillingMonth] = useState(new Date());
  const [timelineMonth, setTimelineMonth] = useState(new Date());
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  // Fetch all projects
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    enabled: isAuthenticated,
  });

  // Fetch billing milestones
  const { data: billingMilestones = [] } = useQuery<any[]>({
    queryKey: ['/api/billing-milestones'],
    enabled: isAuthenticated,
  });

  // Generate calendar days for a given month
  const getCalendarDays = (month: Date) => {
    const firstDayOfMonth = startOfMonth(month);
    const lastDayOfMonth = endOfMonth(month);
    const startDate = startOfWeek(firstDayOfMonth);
    const endDate = endOfWeek(lastDayOfMonth);
    return eachDayOfInterval({ start: startDate, end: endDate });
  };

  // Create billing events from milestones
  const billingEvents: CalendarEvent[] = billingMilestones
    .filter(milestone => milestone.targetInvoiceDate && projects.some(p => p.id === milestone.projectId))
    .map(milestone => {
      const project = projects.find(p => p.id === milestone.projectId);
      
      let color = '';
      switch (milestone.status) {
        case 'paid':
        case 'billed':
          color = 'bg-green-600 text-white';
          break;
        case 'delayed':
          color = 'bg-red-600 text-white';
          break;
        case 'upcoming':
          color = 'bg-amber-600 text-white';
          break;
        case 'invoiced':
          color = 'bg-blue-600 text-white';
          break;
        default:
          color = 'bg-gray-600 text-white';
      }
      
      return {
        id: `billing-${milestone.id}`,
        title: milestone.name,
        date: milestone.targetInvoiceDate,
        projectId: project?.id || 0,
        projectNumber: project?.projectNumber || '',
        projectName: project?.name || 'Unknown Project',
        type: 'billing' as const,
        color,
        status: milestone.status,
        amount: milestone.amount
      };
    });

  // Create timeline events from project dates
  const timelineEvents: CalendarEvent[] = projects.flatMap(project => {
    const events: CalendarEvent[] = [];
    
    // Fabrication Start
    if (project.fabricationStart) {
      events.push({
        id: `fab-start-${project.id}`,
        title: 'Fabrication Start',
        date: project.fabricationStart,
        projectId: project.id,
        projectNumber: project.projectNumber,
        projectName: project.name,
        type: 'timeline' as const,
        color: 'bg-blue-600 text-white',
        phase: 'fabrication'
      });
    }

    // PAINT Start
    if (project.paintStart) {
      events.push({
        id: `paint-start-${project.id}`,
        title: 'PAINT Start',
        date: project.paintStart,
        projectId: project.id,
        projectNumber: project.projectNumber,
        projectName: project.name,
        type: 'timeline' as const,
        color: 'bg-yellow-600 text-white',
        phase: 'paint'
      });
    }

    // Production Start
    if (project.productionStart) {
      events.push({
        id: `prod-start-${project.id}`,
        title: 'Production Start',
        date: project.productionStart,
        projectId: project.id,
        projectNumber: project.projectNumber,
        projectName: project.name,
        type: 'timeline' as const,
        color: 'bg-orange-600 text-white',
        phase: 'production'
      });
    }

    // IT Start
    if (project.itStart) {
      events.push({
        id: `it-start-${project.id}`,
        title: 'IT Start',
        date: project.itStart,
        projectId: project.id,
        projectNumber: project.projectNumber,
        projectName: project.name,
        type: 'timeline' as const,
        color: 'bg-purple-600 text-white',
        phase: 'it'
      });
    }

    // NTC Testing
    if (project.ntcTestingDate) {
      events.push({
        id: `ntc-${project.id}`,
        title: 'NTC Testing',
        date: project.ntcTestingDate,
        projectId: project.id,
        projectNumber: project.projectNumber,
        projectName: project.name,
        type: 'timeline' as const,
        color: 'bg-indigo-600 text-white',
        phase: 'ntc'
      });
    }

    // QC Start
    if (project.qcStartDate) {
      events.push({
        id: `qc-${project.id}`,
        title: 'QC Start',
        date: project.qcStartDate,
        projectId: project.id,
        projectNumber: project.projectNumber,
        projectName: project.name,
        type: 'timeline' as const,
        color: 'bg-teal-600 text-white',
        phase: 'qc'
      });
    }

    // Ship Date
    if (project.shipDate) {
      events.push({
        id: `ship-${project.id}`,
        title: 'Ship Date',
        date: project.shipDate,
        projectId: project.id,
        projectNumber: project.projectNumber,
        projectName: project.name,
        type: 'timeline' as const,
        color: 'bg-red-600 text-white',
        phase: 'ship'
      });
    }

    // Delivery Date
    if (project.deliveryDate) {
      events.push({
        id: `delivery-${project.id}`,
        title: 'Delivery Date',
        date: project.deliveryDate,
        projectId: project.id,
        projectNumber: project.projectNumber,
        projectName: project.name,
        type: 'timeline' as const,
        color: 'bg-green-600 text-white',
        phase: 'delivery'
      });
    }

    return events;
  });

  // Get events for a specific date
  const getEventsForDate = (date: Date, events: CalendarEvent[]) => {
    return events.filter(event => {
      try {
        const eventDate = event.date instanceof Date ? event.date : parseISO(event.date as string);
        return isSameDay(eventDate, date);
      } catch (error) {
        console.error("Error parsing date:", error);
        return false;
      }
    });
  };

  // Handle event click - navigate to project page
  const handleEventClick = (event: CalendarEvent) => {
    if (event.projectId) {
      navigate(`/project/${event.projectId}`);
    }
  };

  // Toggle expanded state for a date
  const toggleDateExpanded = (dateKey: string) => {
    setExpandedDates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dateKey)) {
        newSet.delete(dateKey);
      } else {
        newSet.add(dateKey);
      }
      return newSet;
    });
  };

  // Calendar component
  const CalendarView = ({ 
    month, 
    onMonthChange, 
    events, 
    title 
  }: { 
    month: Date; 
    onMonthChange: (date: Date) => void; 
    events: CalendarEvent[];
    title: string;
  }) => {
    const calendarDays = getCalendarDays(month);
    const today = new Date();

    return (
      <Card className="h-full">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{title}</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => onMonthChange(addMonths(month, -1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="w-40 text-center font-medium">
                {format(month, 'MMMM yyyy')}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => onMonthChange(addMonths(month, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onMonthChange(today)}
                className="ml-2"
              >
                Today
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
            <div className="min-w-[800px]">
              {/* Week days header */}
              <div className="grid grid-cols-7 border-b">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="py-2 px-4 text-sm font-medium text-center bg-muted">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar days */}
              <div className="grid grid-cols-7">
                {calendarDays.map((date, i) => {
                  const dateEvents = getEventsForDate(date, events);
                  const isCurrentMonth = isSameMonth(date, month);
                  const dateKey = format(date, 'yyyy-MM-dd');
                  const isExpanded = expandedDates.has(dateKey);
                  const eventsToShow = isExpanded ? dateEvents : dateEvents.slice(0, 3);
                  
                  return (
                    <div 
                      key={i} 
                      className={cn(
                        "min-h-[120px] p-2 border-r border-b",
                        !isCurrentMonth && "bg-muted/30",
                        isToday(date) && "bg-primary/5",
                        isExpanded && "min-h-[160px]"
                      )}
                    >
                      <div className={cn(
                        "font-medium text-sm mb-1",
                        isToday(date) ? "text-primary" : "text-muted-foreground",
                        !isCurrentMonth && "opacity-40"
                      )}>
                        {format(date, 'd')}
                      </div>
                      
                      <div className="space-y-1 overflow-y-auto" style={{ maxHeight: isExpanded ? '300px' : 'auto' }}>
                        {eventsToShow.map((event) => (
                          <div 
                            key={event.id}
                            className={cn(
                              "text-xs p-1 rounded cursor-pointer",
                              event.color,
                              "hover:opacity-80 transition-opacity"
                            )}
                            onClick={() => handleEventClick(event)}
                            title={`${event.projectNumber} - ${event.projectName}: ${event.title}`}
                          >
                            <div className="font-medium truncate">
                              {event.projectNumber}
                            </div>
                            <div className="truncate opacity-90 text-[10px]">
                              {event.projectName}
                            </div>
                            <div className="truncate opacity-80 text-[10px]">
                              {event.title}
                            </div>
                          </div>
                        ))}
                        
                        {!isExpanded && dateEvents.length > 3 && (
                          <div 
                            className="text-xs text-primary font-medium text-center cursor-pointer hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleDateExpanded(dateKey);
                            }}
                          >
                            +{dateEvents.length - 3} more
                          </div>
                        )}
                        
                        {isExpanded && dateEvents.length > 3 && (
                          <div 
                            className="text-xs text-primary font-medium text-center cursor-pointer hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleDateExpanded(dateKey);
                            }}
                          >
                            Show less
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Production Calendar</h1>
          <ModuleHelpButton moduleId="calendar" helpContent={calendarHelpContent} />
        </div>
      </div>
      
      <Tabs defaultValue="billing" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="billing">Billing Milestones</TabsTrigger>
          <TabsTrigger value="timeline">Production Timeline</TabsTrigger>
        </TabsList>
        
        <TabsContent value="billing" className="mt-6">
          <CalendarView
            month={billingMonth}
            onMonthChange={setBillingMonth}
            events={billingEvents}
            title="Billing Milestones Calendar"
          />
        </TabsContent>
        
        <TabsContent value="timeline" className="mt-6">
          <CalendarView
            month={timelineMonth}
            onMonthChange={setTimelineMonth}
            events={timelineEvents}
            title="Production Timeline Calendar"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CalendarPage;