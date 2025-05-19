import React, { useState, useEffect } from 'react';

// MAXIMUM OVERRIDE: Force all elements to accept drag & drop
// This ensures multiple projects can be placed in any row no matter what
(() => {
  // Direct, global event handler override
  const enableMaximumDragDrop = () => {
    // PRIORITY #1: Prevent the "no drop" cursor from ever showing
    // Override the dragover event at the document level to ALWAYS allow drops
    document.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // CRITICAL: Force move cursor during drag operations
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move';
      }
      
      // Set dragging state on the document for CSS targeting
      document.body.setAttribute('data-dragging', 'true');
      
      // Force all elements to accept drops
      const target = e.target as HTMLElement;
      if (target) {
        target.style.pointerEvents = 'all';
        target.style.cursor = 'move';
      }
    }, true);
    
    // PRIORITY #2: Make all drop events succeed 
    document.addEventListener('drop', (e) => {
      // Remove dragging state
      document.body.removeAttribute('data-dragging');
      console.log('GLOBAL DROP HANDLER: Allowing drop to proceed without interference');
    }, true);
    
    // PRIORITY #3: Add necessary classes to force drop acceptance
    document.body.classList.add('allow-multiple-projects');
    document.body.classList.add('force-accept-drop');
    document.body.classList.add('unlimited-drops');
    
    console.log('🔒 MAXIMUM DRAG-DROP OVERRIDE ACTIVE - Projects can now be placed anywhere without restrictions');
    
    // Add mutation observer to ensure new elements also accept drops
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              node.style.pointerEvents = 'all';
            }
          });
        }
      });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
  };
  
  // Run immediately AND when document loads
  enableMaximumDragDrop();
  window.addEventListener('DOMContentLoaded', enableMaximumDragDrop);
  
  // Also run when the page has fully loaded
  window.addEventListener('load', enableMaximumDragDrop);
})();
import { useQuery, useMutation } from '@tanstack/react-query';
import { addDays, addWeeks, addMonths, format } from 'date-fns';
import { Calendar, Filter, ArrowLeft, ArrowRight, ChevronDown, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn, calculateBayUtilization } from '@/lib/utils';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { QueryClient } from '@tanstack/react-query';
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
import LoadingOverlay from '@/components/LoadingOverlay';
import { TeamManagementButton } from '@/components/TeamManagementButton';
import { TeamCapacityInfo } from '@/components/TeamCapacityInfo';
// RowPositionTester removed as requested
import { 
  ManufacturingBay, 
  ManufacturingSchedule, 
  Project 
} from '@shared/schema';

const BaySchedulingPage = () => {
  const { toast } = useToast();
  
  // State for import modal and loading
  const [showImportModal, setShowImportModal] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // Track which schedule is being processed for more precise loading indicators
  const [processingScheduleId, setProcessingScheduleId] = useState<number | null>(null);
  
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
    // Set fixed date range to ensure all weeks from 2024 to 2030 are visible
    const startDate = new Date(2024, 0, 1); // January 1st, 2024
    // Extend end date to end of 2030 to show much more future dates
    const endDate = new Date(2030, 11, 31); // December 31st, 2030
    return {
      start: startDate,
      end: endDate
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
      
      // Calculate today's position based on the current date
      const today = new Date(); // Current date
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
        description: "Positioned to today's date",
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
  
  // Fetch data with proper typing
  const { data: manufacturingBays = [], refetch: refetchBays } = useQuery<ManufacturingBay[]>({
    queryKey: ['/api/manufacturing-bays'],
  });
  
  const { data: manufacturingSchedules = [] } = useQuery<ManufacturingSchedule[]>({
    queryKey: ['/api/manufacturing-schedules'],
  });
  
  const { data: projects = [] } = useQuery<Project[]>({
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
  
  // Count visible bay rows in the schedule
  const visibleBayRowsCount = React.useMemo(() => {
    if (!manufacturingBays.length) return 0;
    
    // Group bays by team to count distinct rows
    const teamRows = new Map<string, Set<number>>();
    
    // Count rows for each team
    manufacturingBays.forEach(bay => {
      const teamName = bay.team || `bay_${bay.id}`;
      
      // Create a new set for this team if it doesn't exist
      if (!teamRows.has(teamName)) {
        teamRows.set(teamName, new Set());
      }
      
      // Add this bay's row to the team's set
      teamRows.get(teamName)?.add(bay.bayNumber);
    });
    
    // Count total rows across all teams
    let totalRows = 0;
    teamRows.forEach(rows => {
      totalRows += rows.size;
    });
    
    return totalRows;
  }, [manufacturingBays]);
  
  // Calculate total capacity hours - use team-based calculation
  const totalCapacityHours = React.useMemo(() => {
    if (!manufacturingBays.length) return 0;
    
    // Group bays by team to avoid counting the same team's hours multiple times
    const teamHours = new Map<string, number>();
    
    manufacturingBays.forEach(bay => {
      const teamName = bay.team || `bay_${bay.id}`;
      
      // Calculate this team's hours
      const assemblyStaff = bay.assemblyStaffCount || 0;
      const electricalStaff = bay.electricalStaffCount || 0;
      const hoursPerPerson = bay.hoursPerPersonPerWeek || 40;
      const teamWeeklyHours = (assemblyStaff + electricalStaff) * hoursPerPerson;
      
      // Only store once per team (use first bay's data for each team)
      if (!teamHours.has(teamName)) {
        teamHours.set(teamName, teamWeeklyHours);
      }
    });
    
    // Sum up hours across all teams
    return Array.from(teamHours.values()).reduce((sum, hours) => sum + hours, 0);
  }, [manufacturingBays]);
  
  // Mutations for schedules
  const updateScheduleMutation = useMutation({
    mutationFn: async ({ scheduleId, bayId, startDate, endDate, totalHours, row, forcedRowIndex }: { 
      scheduleId: number, 
      bayId: number, 
      startDate: string, 
      endDate: string, 
      totalHours?: number,
      row?: number,
      forcedRowIndex?: number  // Add forcedRowIndex to type interface
    }) => {
      const response = await fetch(`/api/manufacturing-schedules/${scheduleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          bayId, 
          startDate, 
          endDate, 
          totalHours, 
          row,                  // Original row param 
          rowIndex: row,        // Include rowIndex to be sure
          forcedRowIndex        // Add the forcedRowIndex parameter with highest priority
        }),
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
    mutationFn: async ({ projectId, bayId, startDate, endDate, totalHours, row, rowIndex, forcedRowIndex }: { 
      projectId: number, 
      bayId: number, 
      startDate: string, 
      endDate: string, 
      totalHours?: number,
      row?: number,
      rowIndex?: number,
      forcedRowIndex?: number
    }) => {
      // 🚨 MAY 17 2025 - CRITICAL FIX FOR ROW POSITIONING 🚨
      // Get any force-set row values from DOM attributes (highest priority)
      const domForcedRowIndex = document.body.getAttribute('data-forced-row-index');
      const domFinalExactRow = document.body.getAttribute('data-final-exact-row');
      const domCurrentDragRow = document.body.getAttribute('data-current-drag-row');

      // Use the best row value available (in priority order)
      const bestRowIndex = 
        // 1. Use forcedRowIndex parameter if available
        forcedRowIndex !== undefined ? forcedRowIndex :
        // 2. Use any DOM-stored forced row index if available  
        (domForcedRowIndex ? parseInt(domForcedRowIndex) :
        // 3. Use any DOM-stored final row if available
        (domFinalExactRow ? parseInt(domFinalExactRow) :
        // 4. Use any DOM-stored current drag row if available
        (domCurrentDragRow ? parseInt(domCurrentDragRow) :
        // 5. Use provided rowIndex or row parameter
        (rowIndex !== undefined ? rowIndex : 
        (row !== undefined ? row : 0)))));
      
      // Log detailed debug info about all available row sources
      console.log(`🔴 CREATE SCHEDULE MUTATION - ALL ROW SOURCES:
        - Function param forcedRowIndex: ${forcedRowIndex}
        - Function param rowIndex: ${rowIndex}
        - Function param row: ${row}
        - DOM data-forced-row-index: ${domForcedRowIndex}
        - DOM data-final-exact-row: ${domFinalExactRow}
        - DOM data-current-drag-row: ${domCurrentDragRow}
        - 🚨 FINAL SELECTED ROW: ${bestRowIndex}
      `);
      
      // Ensure consistency by using the same value for all row parameters 
      const finalRowValue = bestRowIndex;
      
      // Log the final body being sent to API
      console.log(`🚨 SENDING API REQUEST WITH FOLLOWING BODY:`);
      console.log({
        projectId, 
        bayId, 
        startDate, 
        endDate, 
        totalHours,
        row: finalRowValue,
        rowIndex: finalRowValue,
        forcedRowIndex: finalRowValue
      });
      
      const response = await fetch('/api/manufacturing-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectId, 
          bayId, 
          startDate, 
          endDate, 
          totalHours, 
          // 🚨 CRITICAL: Use the exact same value for all row parameters to ensure consistency
          row: finalRowValue,                  
          rowIndex: finalRowValue,             
          forcedRowIndex: finalRowValue        
        }),
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
      console.log(`🔄 Deleting schedule ${scheduleId} and returning project to unassigned list`);
      const response = await apiRequest('DELETE', `/api/manufacturing-schedules/${scheduleId}`);
      return response.ok;
    },
    onSuccess: () => {
      // Force refresh all relevant queries to ensure UI is in sync with server state
      queryClient.invalidateQueries({ queryKey: ['/api/manufacturing-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      
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
  
  // Handler for schedule changes with optimistic updates
  const handleScheduleChange = async (
    scheduleId: number,
    newBayId: number,
    newStartDate: string,
    newEndDate: string,
    totalHours?: number,
    rowIndex?: number
  ) => {
    try {
      setIsLoading(true);
      setProcessingScheduleId(scheduleId);
      console.log(`Updating schedule ${scheduleId} to bay ${newBayId}, row ${rowIndex}`);
      
      // Get the current data for optimistic updates
      const previousSchedules = queryClient.getQueryData<ManufacturingSchedule[]>(['/api/manufacturing-schedules']) || [];
      
      // Find the schedule to update
      const scheduleToUpdate = previousSchedules.find(s => s.id === scheduleId);
      
      if (scheduleToUpdate) {
        // Create optimistic update
        const optimisticData = previousSchedules.map(s => 
          s.id === scheduleId 
            ? { 
                ...s, 
                bayId: newBayId, 
                startDate: newStartDate, 
                endDate: newEndDate,
                totalHours: totalHours || s.totalHours,
                row: rowIndex !== undefined ? rowIndex : s.row,
                rowIndex: rowIndex !== undefined ? rowIndex : s.rowIndex
              } 
            : s
        );
        
        // Update the cache with optimistic data
        queryClient.setQueryData(['/api/manufacturing-schedules'], optimisticData);
      }
      
      // 🚨 MAY 17 2025 EMERGENCY FIX: Get row from EVERY POSSIBLE SOURCE with priority order
      // Check all potential row position sources with careful priority ordering
      
      // Source 1: data attribute on body (highest priority)
      const forcedRowIndexAttr = document.body.getAttribute('data-forced-row-index');
      const dataAttrRow = forcedRowIndexAttr ? parseInt(forcedRowIndexAttr) : undefined;
      
      // Source 2: Global variable on window
      const windowVarRow = (window as any).absoluteRowPosition !== undefined ? 
        parseInt(String((window as any).absoluteRowPosition)) : undefined;
      
      // Source 3: localStorage backup (used in case of page refresh)
      const localStorageRow = localStorage.getItem('absoluteRowPosition') ?
        parseInt(localStorage.getItem('absoluteRowPosition')!) : undefined;
      
      // Source 4: forcedRowIndex from localStorage
      const localStorageForcedRow = localStorage.getItem('forcedRowIndex') ?
        parseInt(localStorage.getItem('forcedRowIndex')!) : undefined;
        
      // Source 5: Other data attributes that might have been set (emergency fallbacks)
      const emergencyDataAttrRow = document.body.getAttribute('data-emergency-row-override') ?
        parseInt(document.body.getAttribute('data-emergency-row-override')!) : undefined;
      
      // Source 6: lastDropRowIndex from localStorage (final emergency fallback)
      const lastDropRowIndex = localStorage.getItem('lastDropRowIndex') ?
        parseInt(localStorage.getItem('lastDropRowIndex')!) : undefined;
      
      // Source 7: Function parameter row (lowest priority, but still used)
      
      // CRITICAL MAY 2025 FIX: Use the first valid row value in priority order
      // Always prefer the most direct/reliable source, with carefully designed fallbacks
      const finalRowIndex = dataAttrRow !== undefined ? dataAttrRow :
                           windowVarRow !== undefined ? windowVarRow :
                           localStorageRow !== undefined ? localStorageRow :
                           localStorageForcedRow !== undefined ? localStorageForcedRow :
                           emergencyDataAttrRow !== undefined ? emergencyDataAttrRow :
                           lastDropRowIndex !== undefined ? lastDropRowIndex :
                           rowIndex;
      
      // MAXIMUM VISIBILITY Logging for this absolutely critical value
      console.log(`🔴🔴🔴 CRITICAL VALUE CHECK BEFORE API CALL - MAY 17 2025 EMERGENCY FIX`);
      console.log(`🔴🔴🔴 ABSOLUTE ROW POSITIONING DATA SOURCES:`);
      console.log(`Row from data-forced-row-index: ${dataAttrRow}`);
      console.log(`Row from window.absoluteRowPosition: ${windowVarRow}`);
      console.log(`Row from localStorage.absoluteRowPosition: ${localStorageRow}`);
      console.log(`Row from localStorage.forcedRowIndex: ${localStorageForcedRow}`);
      console.log(`Row from data-emergency-row-override: ${emergencyDataAttrRow}`);
      console.log(`Row from localStorage.lastDropRowIndex: ${lastDropRowIndex}`);
      console.log(`Row from function parameter: ${rowIndex}`);
      console.log(`🔴🔴🔴 FINAL ROW BEING SENT TO API: ${finalRowIndex}`);
      console.log(`🔴🔴🔴 THIS IS ABSOLUTE PRIORITY - NO AUTO-ADJUSTMENT`);
      console.log(`🔴🔴🔴 PROJECT WILL BE PLACED AT EXACTLY ROW ${finalRowIndex}`);
      
      // Perform the actual API update with guaranteed row value
      const result = await updateScheduleMutation.mutateAsync({
        scheduleId,
        bayId: newBayId,
        startDate: newStartDate,
        endDate: newEndDate,
        totalHours,
        row: finalRowIndex,            // Use final calculated row
        forcedRowIndex: finalRowIndex  // Add forcedRowIndex as highest priority signal
      });
      
      // No need to invalidate, just refresh the query silently
      queryClient.invalidateQueries({ 
        queryKey: ['/api/manufacturing-schedules'],
        refetchType: 'none' // Don't trigger an immediate refetch
      });
      
      return result;
    } catch (error) {
      console.error('Error updating schedule:', error);
      // Invalidate to get fresh data on error
      queryClient.invalidateQueries({ queryKey: ['/api/manufacturing-schedules'] });
      toast({
        title: "Error",
        description: "Failed to update schedule",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
      setProcessingScheduleId(null);
    }
  };
  
  // Handler for schedule creation with optimistic updates
  const handleScheduleCreate = async (
    projectId: number,
    bayId: number,
    startDate: string,
    endDate: string,
    totalHours?: number,
    rowIndex?: number
  ) => {
    try {
      setIsLoading(true);
      // Use -1 as a special ID to represent creating a new schedule
      setProcessingScheduleId(-1);
      
      // Find the project for optimistic updates
      const project = projects.find(p => p.id === projectId);
      
      if (project) {
        // Get current data for optimistic updates
        const currentSchedules = queryClient.getQueryData<ManufacturingSchedule[]>(['/api/manufacturing-schedules']) || [];
        
        // Create a temporary ID for the optimistic update
        const tempId = -Date.now(); // Use negative timestamp to avoid collisions with real IDs
        
        // Create optimistic update with a temporary schedule
        // Using "as any" to bypass TypeScript type-checking for calculated fields
        const optimisticSchedule = {
          id: tempId,
          projectId,
          bayId,
          startDate,
          endDate,
          totalHours: totalHours || project.totalHours || 0,
          row: rowIndex || 0,
          rowIndex: rowIndex || 0,
          status: 'scheduled',
          equipment: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          fabricationStart: null,
          assemblyStart: null,
          ntcTestingStart: null, 
          qcStart: null,
          notes: null,
          staffAssigned: null,
          
          // These fields are calculated by the server but needed by the UI
          projectName: project.name
        } as any;
        
        // Add the optimistic schedule to the cache
        queryClient.setQueryData(
          ['/api/manufacturing-schedules'], 
          [...currentSchedules, optimisticSchedule]
        );
      }
      
      // 🚨 MAY 17 2025 EMERGENCY FIX: Get row from EVERY POSSIBLE SOURCE with priority order
      // Check all potential row position sources with careful priority ordering
      
      // Source 1: data attribute on body (highest priority)
      const forcedRowIndexAttr = document.body.getAttribute('data-forced-row-index');
      const dataAttrRow = forcedRowIndexAttr ? parseInt(forcedRowIndexAttr) : undefined;
      
      // Source 2: Global variable on window
      const windowVarRow = (window as any).absoluteRowPosition !== undefined ? 
        parseInt(String((window as any).absoluteRowPosition)) : undefined;
      
      // Source 3: localStorage backup (used in case of page refresh)
      const localStorageRow = localStorage.getItem('absoluteRowPosition') ?
        parseInt(localStorage.getItem('absoluteRowPosition')!) : undefined;
      
      // Source 4: forcedRowIndex from localStorage
      const localStorageForcedRow = localStorage.getItem('forcedRowIndex') ?
        parseInt(localStorage.getItem('forcedRowIndex')!) : undefined;
        
      // Source 5: Other data attributes that might have been set (emergency fallbacks)
      const emergencyDataAttrRow = document.body.getAttribute('data-emergency-row-override') ?
        parseInt(document.body.getAttribute('data-emergency-row-override')!) : undefined;
      
      // Source 6: lastDropRowIndex from localStorage (final emergency fallback)
      const lastDropRowIndex = localStorage.getItem('lastDropRowIndex') ?
        parseInt(localStorage.getItem('lastDropRowIndex')!) : undefined;
      
      // Source 7: Function parameter row (lowest priority, but still used)
      
      // CRITICAL MAY 2025 FIX: Use the first valid row value in priority order
      // Always prefer the most direct/reliable source, with carefully designed fallbacks
      const finalRowIndex = dataAttrRow !== undefined ? dataAttrRow :
                           windowVarRow !== undefined ? windowVarRow :
                           localStorageRow !== undefined ? localStorageRow :
                           localStorageForcedRow !== undefined ? localStorageForcedRow :
                           emergencyDataAttrRow !== undefined ? emergencyDataAttrRow :
                           lastDropRowIndex !== undefined ? lastDropRowIndex :
                           rowIndex;
      
      // Log the exact row being sent to the API for creation with MAXIMUM visibility
      console.log(`🔴🔴🔴 CRITICAL CREATE DEBUG - MAY 17 2025 EMERGENCY FIX`);
      console.log(`🔴🔴🔴 ABSOLUTE ROW POSITIONING DATA SOURCES:`);
      console.log(`Row from data-forced-row-index: ${dataAttrRow}`);
      console.log(`Row from window.absoluteRowPosition: ${windowVarRow}`);
      console.log(`Row from localStorage.absoluteRowPosition: ${localStorageRow}`);
      console.log(`Row from localStorage.forcedRowIndex: ${localStorageForcedRow}`);
      console.log(`Row from data-emergency-row-override: ${emergencyDataAttrRow}`);
      console.log(`Row from localStorage.lastDropRowIndex: ${lastDropRowIndex}`);
      console.log(`Row from function parameter: ${rowIndex}`);
      console.log(`🔴🔴🔴 FINAL ROW BEING SENT TO API: ${finalRowIndex}`);
      console.log(`🔴🔴🔴 THIS IS ABSOLUTE PRIORITY - NO AUTO-ADJUSTMENT`);
      console.log(`🔴🔴🔴 PROJECT WILL BE PLACED AT EXACTLY ROW ${finalRowIndex}`);
      
      // Perform the actual API request
      // CRITICAL FIX: Ensure row is explicitly set to the finalRowIndex and passed with highest priority
      console.log(`🚨 EXACT ROW PLACEMENT: Forcing row=${finalRowIndex} for projectId=${projectId} in bayId=${bayId}`);
      await createScheduleMutation.mutateAsync({
        projectId,
        bayId,
        startDate,
        endDate,
        totalHours,
        row: finalRowIndex,
        rowIndex: finalRowIndex, // Include both for absolute certainty
        forcedRowIndex: finalRowIndex // Add highest priority signal
      });
      
      return true;
    } catch (error) {
      console.error('Error creating schedule:', error);
      // Invalidate to get fresh data on error
      queryClient.invalidateQueries({ queryKey: ['/api/manufacturing-schedules'] });
      toast({
        title: "Error",
        description: "Failed to create schedule",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
      setProcessingScheduleId(null);
    }
  };
  
  // Handler for schedule deletion with optimistic updates
  const handleScheduleDelete = async (scheduleId: number) => {
    try {
      setIsLoading(true);
      setProcessingScheduleId(scheduleId);
      
      // Get current data for optimistic updates
      const currentSchedules = queryClient.getQueryData<ManufacturingSchedule[]>(['/api/manufacturing-schedules']) || [];
      
      // Create optimistic update by filtering out the schedule to delete
      const updatedSchedules = currentSchedules.filter(schedule => schedule.id !== scheduleId);
      
      // Update the cache with optimistic data
      queryClient.setQueryData(['/api/manufacturing-schedules'], updatedSchedules);
      
      // Perform the actual API request
      await deleteScheduleMutation.mutateAsync(scheduleId);
      
      return true;
    } catch (error) {
      console.error('Error deleting schedule:', error);
      // Invalidate to get fresh data on error
      queryClient.invalidateQueries({ queryKey: ['/api/manufacturing-schedules'] });
      toast({
        title: "Error",
        description: "Failed to delete schedule",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
      setProcessingScheduleId(null);
    }
  };
  
  // Update date range based on view mode
  const updateDateRange = (mode: 'day' | 'week' | 'month' | 'quarter') => {
    const today = new Date();
    
    // Always keep January 1st, 2024 as the start date for consistency
    const startDate = new Date(2024, 0, 1);
    // Always ensure end date is at least May 31st, 2028 (week 20)
    const minEndDate = new Date(2028, 4, 31);
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
    
    // Make sure end date is never before our minimum end date
    if (end < minEndDate) {
      end = minEndDate;
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
    // Always keep January 1st, 2024 as the start date for consistency
    const startDate = new Date(2024, 0, 1);
    // Always ensure end date is at least May 31st, 2028 (week 20)
    const minEndDate = new Date(2028, 4, 31);
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
    
    // Make sure end date is never before our minimum end date (May 31st, 2028)
    if (newEnd < minEndDate) {
      newEnd = minEndDate;
    }
    
    // Update the date range ensuring our full range is always visible
    setDateRange({ start: startDate, end: newEnd });
  };
  
  return (
    <div className="px-4 py-4 md:py-6 md:px-6">
      <div className="flex flex-col gap-1 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Bay Scheduling</h1>
            <p className="text-muted-foreground">
              Schedule and manage projects across manufacturing bays
            </p>
          </div>
          <div className="flex gap-2">
            {/* Team 7 and Team 8 buttons removed as requested */}
          </div>
        </div>
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
              { label: "Total Bays", value: visibleBayRowsCount },
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
                  
                  // Calculate today's position based on the current date
                  const today = new Date(); // Current date
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
                    description: "Positioned to today's date",
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
          {/* Row Position Testing Tool removed as requested */}
          
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
      
      {/* Use the enhanced LoadingOverlay component with delay and processingId */}
      <LoadingOverlay 
        visible={isLoading} 
        message="Updating Schedule... This may take a moment" 
        delay={500}
        processingId={processingScheduleId}
      />
    </div>
  );
};

export default BaySchedulingPage;