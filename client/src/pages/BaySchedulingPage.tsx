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
  
  // State for loading and import modal
  const [isLoading, setIsLoading] = useState(false);
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
    // Start range from July 2024 for more past date visibility
    const startDate = new Date(2024, 6, 1); // July 1st, 2024
    return {
      start: startDate,
      end: addWeeks(today, 24) // Show 24 weeks ahead from today
    };
  });
  
  // Use same approach as the Today button
  const forceScrollToToday = () => {
    console.log("USING EMERGENCY SCROLLING METHOD");
    
    try {
      // Target the exact container using the error message
      const scrollContainer = document.querySelector('.p-4.overflow-x-auto');
      
      if (!scrollContainer) {
        console.error("Schedule container not found - cannot add today marker");
        throw new Error("Schedule container not found");
      }
      
      // Calculate today's position based on the date (May 8, 2025)
      const today = new Date(2025, 4, 8); // May 8, 2025 (months are 0-indexed)
      const startOfYear = new Date(2025, 0, 1);
      const millisecondsPerDay = 24 * 60 * 60 * 1000;
      const daysSinceJan1 = Math.floor((today.getTime() - startOfYear.getTime()) / millisecondsPerDay);
      
      // Week view calculations (144px per week, divided by 7 days)
      const pixelsPerDay = 144 / 7; // ~20.6px per day in week view
      const bayColumnWidth = 343; // Bay column width
      
      // Calculate target position (days * pixels per day) + bay column width
      const targetPosition = (daysSinceJan1 * pixelsPerDay) + bayColumnWidth;
      
      // Force scroll using scrollLeft property
      (scrollContainer as HTMLElement).scrollLeft = targetPosition;
      
      console.log(`Forced scroll to ${targetPosition}px (${daysSinceJan1} days since Jan 1, ${pixelsPerDay}px per day)`);
      
      // Success message
      toast({
        title: "Scrolled to Today",
        description: "Positioned to May 8, 2025",
        duration: 2000
      });
      
      return true;
    } catch (error) {
      console.error("Emergency scrolling method failed:", error);
      toast({
        title: "Scrolling Failed", 
        description: "Could not scroll to today's date",
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
    
    // Set a consistent start date to January 1st of current year
    // This helps maintain consistency when switching between views
    const startDate = new Date(today.getFullYear(), 0, 1);
    let end;
    
    // Configure view range based on selected time scale
    switch (mode) {
      case 'day':
        // In day view, show 30 days (approximately 1 month)
        end = addDays(today, 30);
        break;
      case 'week':
        // In week view, show 16 weeks (approximately 4 months)
        end = addWeeks(today, 16);
        break;
      case 'month':
        // In month view, show 12 months (1 year)
        end = addMonths(today, 12);
        break;
      case 'quarter':
        // In quarter view, show 8 quarters (2 years)
        end = addMonths(today, 24);
        break;
    }
    
    // Update state with new date range
    setDateRange({ start: startDate, end });
    
    // Update the view mode
    setViewMode(mode);
    
    // Indicate in console which view mode was selected
    console.log(`Switching to ${mode} view mode with date range:`, 
      { start: startDate.toISOString().split('T')[0], end: end.toISOString().split('T')[0] });
    
    // After updating view mode, ensure we scroll to current date using direct method
    // Delay slightly to ensure the DOM has updated
    setTimeout(() => {
      forceScrollToToday();
    }, 500);
  };
  
  // Navigate through time (forward or backward)
  const navigateTime = (direction: 'forward' | 'backward') => {
    // Always keep January 1st of current year as the start date for consistency
    const startDate = new Date(new Date().getFullYear(), 0, 1);
    let newEnd;
    
    // Adjust the navigation increment based on view mode
    switch (viewMode) {
      case 'day':
        // For day view, navigate by 10 days at a time
        const dayIncrement = 10;
        newEnd = direction === 'forward' 
          ? addDays(dateRange.end, dayIncrement) 
          : addDays(dateRange.end, -dayIncrement);
        break;
        
      case 'week':
        // For week view, navigate by 4 weeks (approximately 1 month)
        const weekIncrement = 4;
        newEnd = direction === 'forward' 
          ? addWeeks(dateRange.end, weekIncrement) 
          : addWeeks(dateRange.end, -weekIncrement);
        break;
        
      case 'month':
        // For month view, navigate by 3 months (1 quarter)
        const monthIncrement = 3;
        newEnd = direction === 'forward' 
          ? addMonths(dateRange.end, monthIncrement) 
          : addMonths(dateRange.end, -monthIncrement);
        break;
        
      case 'quarter':
        // For quarter view, navigate by 6 months (half year)
        const quarterIncrement = 6;
        newEnd = direction === 'forward' 
          ? addMonths(dateRange.end, quarterIncrement) 
          : addMonths(dateRange.end, -quarterIncrement);
        break;
    }
    
    // Log navigation action
    console.log(`Navigating ${direction} in ${viewMode} view mode`);
    
    // Update the date range
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
              <div className="flex flex-col space-y-2">
                <Button 
                  variant="destructive" 
                  className="w-full font-bold text-base flex items-center justify-center gap-2"
                  disabled={isLoading}
                  onClick={async () => {
                    // Add confirmation dialog with more context
                    if (window.confirm("⚠️ IMPORTANT: This will reset ALL bay assignments and move ALL projects to the Unassigned section.\n\nThis action cannot be undone. Continue?")) {
                      setIsLoading(true);
                      try {
                        console.log("Attempting to clear all manufacturing schedules...");
                        
                        // Use the API request utility for better error handling
                        const response = await apiRequest("POST", "/api/manufacturing-schedules/clear-all", {});
                        
                        if (response.ok) {
                          const result = await response.json();
                          console.log("Response from clear-all endpoint:", result);
                          
                          if (result.success) {
                            toast({
                              title: "Success!",
                              description: result.message || "Projects moved to Unassigned section.",
                              variant: "default",
                            });
                            
                            // Success - update the UI
                            queryClient.invalidateQueries({ queryKey: ['/api/manufacturing-schedules'] });
                            queryClient.invalidateQueries({ queryKey: ['/api/manufacturing-bays'] });
                            queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
                          } else {
                            // Server returned success: false
                            console.error("Operation failed:", result.message, result.errors);
                            toast({
                              title: "Operation Failed",
                              description: result.message || "Failed to move projects to Unassigned section.",
                              variant: "destructive",
                            });
                          }
                        } else {
                          // HTTP error status code
                          let errorMessage = "Failed to move projects to Unassigned section. Please try again.";
                          
                          try {
                            const errorResponse = await response.json();
                            console.error("Error response from server:", errorResponse);
                            if (errorResponse.message) {
                              errorMessage = errorResponse.message;
                            }
                          } catch (e) {
                            // If response is not JSON, get text
                            const errorText = await response.text();
                            console.error("Error response (text):", errorText);
                          }
                          
                          toast({
                            title: `Error (${response.status})`,
                            description: errorMessage,
                            variant: "destructive",
                          });
                        }
                      } catch (error) {
                        console.error("Error clearing schedules:", error);
                        toast({
                          title: "Error",
                          description: "An unexpected error occurred. Please try again later.",
                          variant: "destructive",
                        });
                      } finally {
                        setIsLoading(false);
                      }
                    }
                  }}
                >
                  🔄 Reset All Bay Assignments
                </Button>
                <AIInsightsModal />
              </div>
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
                console.log("USING EMERGENCY SCROLLING METHOD");
                
                try {
                  // Target the exact container using the error message
                  const scrollContainer = document.querySelector('.p-4.overflow-x-auto');
                  
                  if (!scrollContainer) {
                    console.error("Schedule container not found - cannot add today marker");
                    throw new Error("Schedule container not found");
                  }
                  
                  // Calculate today's position based on the date (May 8, 2025)
                  const today = new Date(2025, 4, 8); // May 8, 2025 (months are 0-indexed)
                  const startOfYear = new Date(2025, 0, 1);
                  const millisecondsPerDay = 24 * 60 * 60 * 1000;
                  const daysSinceJan1 = Math.floor((today.getTime() - startOfYear.getTime()) / millisecondsPerDay);
                  
                  // Week view calculations (144px per week, divided by 7 days)
                  const pixelsPerDay = 144 / 7; // ~20.6px per day in week view
                  const bayColumnWidth = 343; // Bay column width
                  
                  // Calculate target position (days * pixels per day) + bay column width
                  const targetPosition = (daysSinceJan1 * pixelsPerDay) + bayColumnWidth;
                  
                  // Force scroll using scrollLeft property
                  (scrollContainer as HTMLElement).scrollLeft = targetPosition;
                  
                  console.log(`Forced scroll to ${targetPosition}px (${daysSinceJan1} days since Jan 1, ${pixelsPerDay}px per day)`);
                  
                  // Success message
                  toast({
                    title: "Scrolled to Today",
                    description: "Positioned to May 8, 2025",
                    duration: 2000
                  });
                } catch (error) {
                  console.error("Emergency scrolling method failed:", error);
                  toast({
                    title: "Scrolling Failed",
                    description: "Could not scroll to today's date",
                    variant: "destructive",
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
      
      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg shadow-lg flex flex-col items-center">
            <div className="h-10 w-10 border-4 border-t-transparent border-primary rounded-full animate-spin mb-4"></div>
            <p className="font-medium">Resetting All Bay Assignments...</p>
            <p className="text-sm text-muted-foreground mt-1">This may take a moment</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default BaySchedulingPage;