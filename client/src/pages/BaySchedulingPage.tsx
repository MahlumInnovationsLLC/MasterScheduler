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
  
  // Super simple approach - find today's column and scroll to it
  const forceScrollToToday = () => {
    try {
      console.log("⚠️ USING DIRECT TODAY ELEMENT FINDER");
      
      // Find today's date as a string in yyyy-MM-dd format
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');
      
      // Use a short timeout to ensure the DOM is loaded
      setTimeout(() => {
        // Find a week cell with today's date
        const todayCell = document.querySelector(`[data-date="${todayStr}"]`) as HTMLElement;
        
        if (todayCell) {
          // Found a cell with today's date, scroll to it
          console.log(`Found today's cell (${todayStr}), scrolling to it`);
          
          // Use scrollIntoView with options for better positioning
          todayCell.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center'
          });
          
          // Add a brief highlight to make it noticeable
          todayCell.style.outline = '3px solid red';
          todayCell.style.outlineOffset = '-3px';
          
          // Remove the highlight after a short delay
          setTimeout(() => {
            todayCell.style.outline = '';
            todayCell.style.outlineOffset = '';
          }, 2000);
          
          toast({
            title: "Found Today",
            description: `Positioned to ${format(today, 'MMMM d, yyyy')}`,
            duration: 2000
          });
          return true;
        } else {
          // If we can't find today directly, scroll by targeting the overflow container
          const scrollContainer = document.querySelector('.overflow-x-auto') as HTMLElement;
          if (!scrollContainer) {
            throw new Error("Scroll container not found");
          }
          
          // Calculate days since January 1
          const startOfYear = new Date(today.getFullYear(), 0, 1);
          const millisecondsPerDay = 24 * 60 * 60 * 1000;
          const daysSinceJan1 = Math.floor((today.getTime() - startOfYear.getTime()) / millisecondsPerDay);
          
          // Calculate pixels per day based on view mode
          let pixelsPerDay = 20.6; // Default for week view
          
          if (viewMode === 'day') {
            pixelsPerDay = 40;
          } else if (viewMode === 'week') {
            pixelsPerDay = 144 / 7; // ~20.6px per day
          } else if (viewMode === 'month') {
            pixelsPerDay = 144 / 30; // ~4.8px per day
          } else if (viewMode === 'quarter') {
            pixelsPerDay = 144 / 90; // ~1.6px per day
          }
          
          // Calculate bay width
          let bayWidth = 343; // Default fallback
          const bayColumn = document.querySelector('.bay-column') as HTMLElement;
          if (bayColumn) {
            bayWidth = bayColumn.offsetWidth;
          }
          
          // Calculate position from left edge
          const scrollPosition = (daysSinceJan1 * pixelsPerDay) + bayWidth - (scrollContainer.clientWidth / 2);
          
          // Set scroll position directly
          scrollContainer.scrollLeft = scrollPosition > 0 ? scrollPosition : 0;
          
          console.log(`Directly set scroll position to ${scrollPosition}px`);
          
          toast({
            title: "Scrolled to Today",
            description: `Positioned to ${format(today, 'MMMM d, yyyy')}`,
            duration: 2000
          });
          return true;
        }
      }, 500); // Give time for DOM to load
      
      return true;
    } catch (error) {
      console.error("Direct today method failed:", error);
      
      // Fallback to simple scrolling if available
      const scrollContainer = document.querySelector('.overflow-x-auto') as HTMLElement;
      if (scrollContainer) {
        try {
          // Attempt a basic scroll to an estimated position
          const today = new Date();
          const startOfYear = new Date(today.getFullYear(), 0, 1);
          const daysSinceStart = Math.floor((today.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
          
          // Very rough estimation: 20px per day, 343px bay column width
          const roughPosition = daysSinceStart * 20 + 343;
          scrollContainer.scrollLeft = roughPosition;
          
          console.log("Used emergency fallback scrolling");
          return true;
        } catch (innerError) {
          console.error("Even fallback scrolling failed:", innerError);
        }
      }
      
      toast({
        title: "Scrolling Failed",
        description: "Could not position to today's date",
        variant: "destructive",
        duration: 3000
      });
      return false;
    }
  };
  
  // Original function kept for backward compatibility but now calls our new function
  const scrollToCurrentDay = (mode = 'week') => {
    return forceScrollToToday();
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
      
      // Wait a bit longer to ensure DOM is fully rendered
      const initialTimeout = setTimeout(() => {
        // Use our direct calculation method instead of trying to find DOM elements
        forceScrollToToday();
      }, 1000); // Give the rendering a full second to complete
      
      // Clean up timeout if component unmounts
      return () => clearTimeout(initialTimeout);
    }
  }, [manufacturingBays, manufacturingSchedules]);
  
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
    
    // After updating view mode, ensure we scroll to current date using direct method
    setTimeout(() => {
      forceScrollToToday();
    }, 500); // Slightly longer delay to ensure DOM updates
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
                // Directly call our new forceScrollToToday function
                forceScrollToToday();
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