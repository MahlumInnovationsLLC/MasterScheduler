import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { addDays, addWeeks, addMonths, format } from 'date-fns';
import { Calendar, Filter, ArrowLeft, ArrowRight, ChevronDown, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn, calculateBayUtilization } from '@/lib/utils';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ManufacturingCard } from '@/components/ManufacturingCard';
import { BayUtilizationCard } from '@/components/BayUtilizationCard';
import { HighRiskProjectsCard } from '@/components/HighRiskProjectsCard';
import { AIInsightsModal } from '@/components/AIInsightsModal';
import ResizableBaySchedule from '@/components/ResizableBaySchedule';
import BaySchedulingImport from '@/components/BaySchedulingImport';
import { 
  ManufacturingBay, 
  ManufacturingSchedule, 
  Project 
} from '@shared/schema';

const BaySchedulingPage = () => {
  const { toast } = useToast();
  
  // State for import modal
  const [showImportModal, setShowImportModal] = useState(false);
  
  // Force a refresh of manufacturing schedules when page loads
  // This ensures capacity sharing calculations are correctly applied
  useEffect(() => {
    // Force immediate refetch of all schedule data
    queryClient.invalidateQueries({ queryKey: ['/api/manufacturing-schedules'] });
    console.log("Manufacturing page loaded: forcing refresh of schedules to apply capacity sharing after FAB phase");
  }, []);
  
  // View mode and date range
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month' | 'quarter'>('week');
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    // Start range from beginning of the year
    const startDate = new Date(today.getFullYear(), 0, 1); // January 1st of current year
    return {
      start: startDate,
      end: addWeeks(today, 24) // Show 24 weeks ahead from today
    };
  });
  
  // Function to scroll to current day in the schedule - separated from any references to component state
  const scrollToCurrentDay = (mode = 'week') => {
    console.log(`Attempting to scroll to current day position (view mode: ${mode})`);
    
    try {
      // Find the schedule container element
      const scheduleContainer = document.querySelector('.overflow-x-auto');
      if (!scheduleContainer) {
        throw new Error('Could not find schedule container');
      }
  
      // Find the Today indicator element or the cell for today's date
      // Try multiple selectors to find today's indicator
      const todayIndicators = [
        document.querySelector('.today-indicator'), 
        document.querySelector('[data-today="true"]'),
        document.querySelector('.today-cell'),
        // Try to find by specific data-date attribute with today's date
        document.querySelector(`[data-date="${format(new Date(), 'yyyy-MM-dd')}"]`)
      ];
      
      // Get first non-null element
      const todayIndicator = todayIndicators.find(el => el !== null);
      
      if (!todayIndicator) {
        // Fallback to a more accurate calculation based on current view mode
        const today = new Date();
        const startDate = new Date(today.getFullYear(), 0, 1); // Jan 1 of current year
        const diffDays = Math.round((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Get the bay column width - more robust handling if element isn't found
        const bayColumn = document.querySelector('.bay-column');
        const bayColumnWidth = bayColumn ? bayColumn.getBoundingClientRect().width : 343; // Default width if element not found
        
        // Calculate position based on the provided view mode with more precise pixel measurements
        let dayWidth;
        switch(mode) {
          case 'day':
            dayWidth = 40; // 40px per day in day view
            break;
          case 'week':
            dayWidth = 20; // ~20px per day in week view (140px / 7 days)
            break;
          case 'month':
            dayWidth = 7; // ~7px per day in month view (210px / 30 days)
            break;
          case 'quarter':
            dayWidth = 2; // ~2px per day in quarter view (180px / 90 days)
            break;
          default:
            dayWidth = 20; // Default to week view sizing
        }
        
        // Calculate the position with bay column offset
        const calculatedPosition = diffDays * dayWidth;
        
        // Apply the calculated position
        scheduleContainer.scrollLeft = Math.max(0, calculatedPosition);
        console.log(`Using calculated fallback position: ${calculatedPosition}px (${diffDays} days since Jan 1, ${dayWidth}px per day in ${mode} view)`);
        
        // Show toast notification for debugging
        toast({
          title: "Auto-scrolling",
          description: `Using calculated position for current day (${format(today, 'MMM d')})`,
          duration: 2000
        });
        
        return true; // Still consider this a success even though we used fallback
      }
  
      // Get the bay column width
      const bayColumn = document.querySelector('.bay-column');
      const bayColumnWidth = bayColumn ? bayColumn.getBoundingClientRect().width : 343;
      
      // Calculate position to place the today indicator at left edge after bay column
      // Get the position of today indicator relative to its container
      const todayRect = todayIndicator.getBoundingClientRect();
      const containerRect = scheduleContainer.getBoundingClientRect();
      
      // Calculate the position to scroll to (indicator position - bay column width)
      const position = todayRect.left - containerRect.left - bayColumnWidth;
      
      // Set the scroll position with a small offset to make the today line fully visible
      scheduleContainer.scrollLeft = position > 0 ? position : 0;
      
      console.log(`Successfully scrolled to today indicator, position: ${position}px`);
      
      // Show toast notification for debugging
      toast({
        title: "Auto-scrolling",
        description: `Positioned to today (${format(new Date(), 'MMM d')})`,
        duration: 2000
      });
      
      return true;
    } catch (error) {
      console.error('Error in scrollToCurrentDay:', error);
      toast({
        title: "Auto-scrolling error",
        description: "Could not automatically scroll to today's date",
        variant: "destructive",
        duration: 3000
      });
      return false;
    }
  };
  
  // Filter states
  const [filterTeam, setFilterTeam] = useState<string | null>(null);
  
  // Fetch data
  const { data: manufacturingBays = [], refetch: refetchBays } = useQuery({
    queryKey: ['/api/manufacturing-bays'],
  });
  
  const { data: manufacturingSchedules = [] } = useQuery({
    queryKey: ['/api/manufacturing-schedules'],
  });
  
  const { data: projects = [] } = useQuery({
    queryKey: ['/api/projects'],
  });

  // Scroll to current week on initial load
  useEffect(() => {
    // When data is loaded and components are rendered, try to scroll
    if (manufacturingBays.length > 0 && manufacturingSchedules.length > 0) {
      console.log('Manufacturing data loaded, attempting to scroll to current day');
      
      // We need to wait for the DOM to fully render the schedule
      // Use a sequence of delays with progressive backoff to ensure we catch it
      let attempts = 0;
      const maxAttempts = 5;
      
      const attemptScroll = () => {
        try {
          const success = scrollToCurrentDay(viewMode);
          
          if (!success && attempts < maxAttempts) {
            attempts++;
            console.log(`Scroll attempt ${attempts} of ${maxAttempts} failed, retrying in ${250 * attempts}ms`);
            return false;
          }
          return true;
        } catch (error) {
          console.error('Error during initial scroll to current day:', error);
          return false;
        }
      };
      
      // Attempt the first scroll after a short delay
      const initialTimeout = setTimeout(() => {
        // If first attempt fails, try a few more times with increasing delays
        if (!attemptScroll() && attempts < maxAttempts) {
          const intervalId = setInterval(() => {
            if (attemptScroll() || attempts >= maxAttempts) {
              clearInterval(intervalId);
            }
          }, 250 * attempts); // Increase delay for each attempt
          
          // Clean up interval if component unmounts
          return () => clearInterval(intervalId);
        }
      }, 800); // Initial delay is longer to ensure schedule is fully rendered
      
      // Clean up timeout if component unmounts
      return () => clearTimeout(initialTimeout);
    }
  }, [manufacturingBays, manufacturingSchedules, viewMode]);
  
  // Create bay mutation
  const createBayMutation = useMutation({
    mutationFn: async (bay: Partial<ManufacturingBay>) => {
      const response = await apiRequest('POST', '/api/manufacturing-bays', bay);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/manufacturing-bays'] });
      toast({
        title: 'Success',
        description: 'Manufacturing bay created successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to create manufacturing bay',
        variant: 'destructive',
      });
      console.error(error);
    },
  });
  
  // Update bay mutation
  const updateBayMutation = useMutation({
    mutationFn: async ({ id, ...bay }: { id: number } & Partial<ManufacturingBay>) => {
      const response = await apiRequest('PUT', `/api/manufacturing-bays/${id}`, bay);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/manufacturing-bays'] });
      toast({
        title: 'Success',
        description: 'Manufacturing bay updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update manufacturing bay',
        variant: 'destructive',
      });
      console.error(error);
    },
  });
  
  // Delete bay mutation
  const deleteBayMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/manufacturing-bays/${id}`);
      return response.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/manufacturing-bays'] });
      queryClient.invalidateQueries({ queryKey: ['/api/manufacturing-schedules'] });
      toast({
        title: 'Success',
        description: 'Manufacturing bay deleted successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to delete manufacturing bay',
        variant: 'destructive',
      });
      console.error(error);
    },
  });
  
  // Calculate utilization metrics using the shared utility function
  const bayUtilization = React.useMemo(() => {
    return calculateBayUtilization(manufacturingBays, manufacturingSchedules);
  }, [manufacturingBays, manufacturingSchedules]);
  
  // Calculate scheduled projects
  const scheduledProjectsCount = React.useMemo(() => {
    if (!manufacturingSchedules.length) return 0;
    
    // Get unique project IDs from schedules
    const uniqueProjectIds = new Set(manufacturingSchedules.map(s => s.projectId));
    return uniqueProjectIds.size;
  }, [manufacturingSchedules]);
  
  // Calculate total capacity hours
  const totalCapacityHours = React.useMemo(() => {
    if (!manufacturingBays.length) return 0;
    
    return manufacturingBays.reduce((sum, bay) => {
      const weeklyHours = bay.hoursPerPersonPerWeek * bay.staffCount;
      return sum + weeklyHours;
    }, 0);
  }, [manufacturingBays]);
  
  // Mutations for schedules
  const updateScheduleMutation = useMutation({
    mutationFn: async ({ scheduleId, bayId, startDate, endDate, totalHours, row }: { 
      scheduleId: number, 
      bayId: number, 
      startDate: string, 
      endDate: string, 
      totalHours?: number,
      row?: number
    }) => {
      const response = await fetch(`/api/manufacturing-schedules/${scheduleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bayId, startDate, endDate, totalHours, row }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update schedule');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/manufacturing-schedules'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update schedule',
        variant: 'destructive',
      });
      console.error(error);
    },
  });
  
  const createScheduleMutation = useMutation({
    mutationFn: async ({ projectId, bayId, startDate, endDate, totalHours, row }: { 
      projectId: number, 
      bayId: number, 
      startDate: string, 
      endDate: string, 
      totalHours?: number,
      row?: number 
    }) => {
      const response = await fetch('/api/manufacturing-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, bayId, startDate, endDate, totalHours, row }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create schedule');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/manufacturing-schedules'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to create schedule',
        variant: 'destructive',
      });
      console.error(error);
    },
  });
  
  // Delete schedule mutation
  const deleteScheduleMutation = useMutation({
    mutationFn: async (scheduleId: number) => {
      const response = await apiRequest('DELETE', `/api/manufacturing-schedules/${scheduleId}`);
      return response.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/manufacturing-schedules'] });
      toast({
        title: 'Success',
        description: 'Project removed from manufacturing schedule',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to remove project from schedule',
        variant: 'destructive',
      });
      console.error(error);
    },
  });
  
  // Handler for schedule changes
  const handleScheduleChange = async (
    scheduleId: number,
    newBayId: number,
    newStartDate: string,
    newEndDate: string,
    totalHours?: number,
    rowIndex?: number
  ) => {
    try {
      console.log(`Updating schedule ${scheduleId} to bay ${newBayId}, row ${rowIndex}`);
      const result = await updateScheduleMutation.mutateAsync({
        scheduleId,
        bayId: newBayId,
        startDate: newStartDate,
        endDate: newEndDate,
        totalHours,
        row: rowIndex
      });
      
      // Force a refetch to ensure state is up to date
      queryClient.invalidateQueries({ queryKey: ['/api/manufacturing-schedules'] });
      
      return result;
    } catch (error) {
      console.error('Error updating schedule:', error);
      toast({
        title: "Error",
        description: "Failed to update schedule",
        variant: "destructive"
      });
      return false;
    }
  };
  
  // Handler for schedule creation
  const handleScheduleCreate = async (
    projectId: number,
    bayId: number,
    startDate: string,
    endDate: string,
    totalHours?: number,
    rowIndex?: number
  ) => {
    try {
      await createScheduleMutation.mutateAsync({
        projectId,
        bayId,
        startDate,
        endDate,
        totalHours,
        row: rowIndex
      });
      return true;
    } catch (error) {
      return false;
    }
  };
  
  // Handler for schedule deletion
  const handleScheduleDelete = async (scheduleId: number) => {
    try {
      await deleteScheduleMutation.mutateAsync(scheduleId);
      return true;
    } catch (error) {
      console.error('Error deleting schedule:', error);
      return false;
    }
  };
  
  // Update date range based on view mode
  const updateDateRange = (mode: 'day' | 'week' | 'month' | 'quarter') => {
    const today = new Date();
    // Maintain start date as January 1st of current year
    const startDate = new Date(today.getFullYear(), 0, 1);
    let end;
    
    switch (mode) {
      case 'day':
        end = addDays(today, 14); // 2 weeks view
        break;
      case 'week':
        end = addWeeks(today, 4); // 4 weeks view
        break;
      case 'month':
        end = addMonths(today, 6); // 6 months view
        break;
      case 'quarter':
        end = addMonths(today, 12); // 1 year view
        break;
    }
    
    setDateRange({ start: startDate, end });
    setViewMode(mode);
    
    // After updating view mode, ensure we scroll to current date
    setTimeout(() => {
      scrollToCurrentDay();
    }, 300);
  };
  
  // Navigate through time
  const navigateTime = (direction: 'forward' | 'backward') => {
    // Always keep January 1st of current year as the start date
    const startDate = new Date(new Date().getFullYear(), 0, 1);
    let newEnd;
    
    switch (viewMode) {
      case 'day':
        newEnd = direction === 'forward' 
          ? addDays(dateRange.end, 7) 
          : addDays(dateRange.end, -7);
        break;
      case 'week':
        newEnd = direction === 'forward' 
          ? addWeeks(dateRange.end, 2) 
          : addWeeks(dateRange.end, -2);
        break;
      case 'month':
        newEnd = direction === 'forward' 
          ? addMonths(dateRange.end, 2) 
          : addMonths(dateRange.end, -2);
        break;
      case 'quarter':
        newEnd = direction === 'forward' 
          ? addMonths(dateRange.end, 3) 
          : addMonths(dateRange.end, -3);
        break;
    }
    
    setDateRange({ start: startDate, end: newEnd });
  };
  
  return (
    <div className="px-4 py-4 md:py-6 md:px-6">
      <div className="flex flex-col gap-1 mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Bay Scheduling</h1>
        <p className="text-muted-foreground">
          Schedule and manage projects across manufacturing bays
        </p>
      </div>
      
      {/* Top row - Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="md:col-span-1">
          <BayUtilizationCard
            title="Bay Utilization"
            value={bayUtilization}
            subtitle="Average utilization of staffed bays"
            change={{ value: "+5%", isPositive: true }}
            bays={manufacturingBays}
            schedules={manufacturingSchedules}
          />
        </div>
        <div className="md:col-span-1">
          <ManufacturingCard
            title="Manufacturing Capacity"
            value={totalCapacityHours}
            type="resources"
            stats={[
              { label: "Total Hours", value: totalCapacityHours },
              { label: "Total Bays", value: manufacturingBays.length },
              { label: "Active Projects", value: scheduledProjectsCount },
              { label: "Unassigned", value: projects.length - scheduledProjectsCount },
            ]}
          />
        </div>
        <div className="md:col-span-1">
          <Card className="h-full">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">AI Insights</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="mb-3">
                <p className="text-sm text-gray-400">
                  Optimize your manufacturing schedule with AI-powered insights.
                </p>
              </div>
              <AIInsightsModal />
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Production Status - Horizontal Card */}
      <div className="mb-6">
        <div className="w-full">
          <HighRiskProjectsCard projects={projects} />
        </div>
      </div>
      
      {/* Controls bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Tabs
            value={viewMode}
            onValueChange={(value) => updateDateRange(value as 'day' | 'week' | 'month' | 'quarter')}
            className="mr-4"
          >
            <TabsList>
              <TabsTrigger value="day" className="text-xs">Day</TabsTrigger>
              <TabsTrigger value="week" className="text-xs">Week</TabsTrigger>
              <TabsTrigger value="month" className="text-xs">Month</TabsTrigger>
              <TabsTrigger value="quarter" className="text-xs">Quarter</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateTime('backward')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateTime('forward')}
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                // Use the improved scrollToCurrentDay function with current viewMode
                const success = scrollToCurrentDay(viewMode);
                
                // Show appropriate toast based on success
                if (success) {
                  toast({
                    title: "Scrolled to Today",
                    description: `View positioned at ${format(new Date(), 'MMMM d, yyyy')}`,
                    duration: 2000
                  });
                } else {
                  toast({
                    title: "Estimated Position",
                    description: "Using best estimate for today's position. The today indicator may not be visible in the current view.",
                    duration: 3000
                  });
                }
              }}
              className="flex items-center gap-1 ml-1"
            >
              <Calendar className="h-4 w-4 mr-1" />
              <span>Today</span>
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-1">
                <Filter className="h-4 w-4 mr-1" />
                <span>Filters</span>
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Filter By Team</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => setFilterTeam(null)}>
                  <span className={cn(filterTeam === null && "font-semibold")}>All Teams</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterTeam('Electronics')}>
                  <span className={cn(filterTeam === 'Electronics' && "font-semibold")}>Electronics</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterTeam('Mechanical')}>
                  <span className={cn(filterTeam === 'Mechanical' && "font-semibold")}>Mechanical</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterTeam('Assembly')}>
                  <span className={cn(filterTeam === 'Assembly' && "font-semibold")}>Assembly</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <div className="rounded-md border border-gray-800 bg-darkCard">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold">Manufacturing Schedule</h2>
        </div>
        <div className="p-4 overflow-x-auto">
          <ResizableBaySchedule
            schedules={manufacturingSchedules}
            projects={projects}
            bays={filterTeam 
              ? manufacturingBays.filter(bay => bay.team === filterTeam) 
              : manufacturingBays
            }
            onScheduleChange={handleScheduleChange}
            onScheduleCreate={handleScheduleCreate}
            onScheduleDelete={handleScheduleDelete}
            onBayCreate={(bay) => createBayMutation.mutateAsync(bay)}
            onBayUpdate={(id, bay) => updateBayMutation.mutateAsync({ id, ...bay })}
            onBayDelete={(id) => deleteBayMutation.mutateAsync(id)}
            dateRange={dateRange}
            viewMode={viewMode}
          />
        </div>
      </div>
    </div>
  );
};

export default BaySchedulingPage;