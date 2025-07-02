import React, { useState, useEffect, useCallback } from 'react';

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
import { Calendar, Filter, ArrowLeft, ArrowRight, ChevronDown, Upload, Shuffle, X, Save, Play, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn, calculateBayUtilization } from '@/lib/utils';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { QueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
import { MobileBaySchedule } from '@/components/MobileBaySchedule';
import { SandboxModeBanner } from '@/components/SandboxModeBanner';
import BaySchedulingImport from '@/components/BaySchedulingImport';
import LoadingOverlay from '@/components/LoadingOverlay';
import { TeamManagementButton } from '@/components/TeamManagementButton';
import { TeamCapacityInfo } from '@/components/TeamCapacityInfo';
import { useIsMobile } from '@/hooks/use-mobile';
// RowPositionTester removed as requested
import { 
  ManufacturingBay, 
  ManufacturingSchedule, 
  Project 
} from '@shared/schema';
import { ModuleHelpButton } from "@/components/ModuleHelpButton";
import { baySchedulingHelpContent } from "@/data/moduleHelpContent";

const BaySchedulingPage = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // State for import modal and loading
  const [showImportModal, setShowImportModal] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // Track which schedule is being processed for more precise loading indicators
  const [processingScheduleId, setProcessingScheduleId] = useState<number | null>(null);
  // State for financial impact analysis toggle
  const [showFinancialImpact, setShowFinancialImpact] = useState<boolean>(true);
  
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
  
  // Sandbox Mode state variables
  const [isSandboxMode, setSandboxMode] = useState<boolean>(false);
  const [sandboxSchedules, setSandboxSchedules] = useState<ManufacturingSchedule[]>([]);
  const [sandboxProjects, setSandboxProjects] = useState<Project[]>([]);
  const [sandboxBays, setSandboxBays] = useState<ManufacturingBay[]>([]);
  const [sandboxChanges, setSandboxChanges] = useState<number>(0);
  const [isSavingSandbox, setIsSavingSandbox] = useState<boolean>(false);
  
  // Track if we've loaded data into sandbox mode
  const [isSandboxInitialized, setIsSandboxInitialized] = useState<boolean>(false);
  
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
  
  // Function to scroll to a specific project number
  const scrollToProject = (projectNumber: string) => {
    if (!projectNumber.trim()) {
      toast({
        title: "Search Error",
        description: "Please enter a project number to search for",
        variant: "destructive",
        duration: 3000
      });
      return false;
    }
    
    try {
      // Find the project in our data
      const targetProject = projects.find(project => 
        project.projectNumber?.toLowerCase().includes(projectNumber.toLowerCase())
      );
      
      if (!targetProject) {
        toast({
          title: "Project Not Found",
          description: `No project found with number containing "${projectNumber}"`,
          variant: "destructive",
          duration: 3000
        });
        return false;
      }
      
      // Find the schedule for this project
      const activeSchedules = isSandboxMode ? sandboxSchedules : manufacturingSchedules;
      const projectSchedule = activeSchedules.find(schedule => 
        schedule.projectId === targetProject.id
      );
      
      if (!projectSchedule) {
        toast({
          title: "Project Not Scheduled",
          description: `Project "${targetProject.projectNumber}" (${targetProject.name}) is not currently scheduled`,
          variant: "destructive",
          duration: 4000
        });
        return false;
      }
      
      console.log(`Found project ${targetProject.projectNumber} scheduled in bay ${projectSchedule.bayId}`);
      
      // First, try to find the actual project element in the DOM
      console.log('Searching for project element in DOM...');
      let projectElement: Element | null = null;
      let scrollContainer: Element | null = null;
      
      // Look for the project by text content in various possible selectors
      const possibleSelectors = [
        `*[data-project-number="${targetProject.projectNumber}"]`,
        `*[data-project-id="${targetProject.id}"]`,
        '.schedule-bar',
        '.project-bar', 
        '.manufacturing-schedule-bar',
        '[class*="schedule"]',
        '[class*="project"]'
      ];
      
      for (const selector of possibleSelectors) {
        const elements = document.querySelectorAll(selector);
        for (let i = 0; i < elements.length; i++) {
          const element = elements[i];
          const text = element.textContent || '';
          if (text.includes(targetProject.projectNumber)) {
            projectElement = element;
            console.log(`Found project element using selector ${selector}:`, element);
            break;
          }
        }
        if (projectElement) break;
      }
      
      // If still not found, search all elements containing the project number
      if (!projectElement) {
        console.log('Searching all elements for project number...');
        const allElements = document.querySelectorAll('*');
        for (let i = 0; i < allElements.length; i++) {
          const element = allElements[i] as HTMLElement;
          const text = element.textContent || '';
          if (text.includes(targetProject.projectNumber) && element.offsetWidth > 50) {
            projectElement = element;
            console.log(`Found project element in general search:`, element);
            break;
          }
        }
      }
      
      if (projectElement) {
        console.log('Project element found, getting position...');
        const rect = projectElement.getBoundingClientRect();
        console.log(`Project element position: left=${rect.left}, top=${rect.top}, width=${rect.width}`);
        
        // Find the scrollable container
        let parent = projectElement.parentElement;
        while (parent && parent !== document.body) {
          const styles = window.getComputedStyle(parent);
          if (styles.overflowX === 'auto' || styles.overflowX === 'scroll' || styles.overflow === 'auto' || styles.overflow === 'scroll') {
            if (parent.scrollWidth > parent.clientWidth) {
              scrollContainer = parent;
              console.log('Found scrollable container:', parent);
              break;
            }
          }
          parent = parent.parentElement;
        }
        
        if (scrollContainer) {
          // Calculate scroll position based on actual element position
          const containerRect = scrollContainer.getBoundingClientRect();
          const elementOffsetLeft = (projectElement as HTMLElement).offsetLeft;
          const targetScrollLeft = elementOffsetLeft - (containerRect.width / 2) + (rect.width / 2);
          const finalPosition = Math.max(0, targetScrollLeft);
          
          console.log(`Direct positioning:
            - Container width: ${containerRect.width}
            - Element offset left: ${elementOffsetLeft}
            - Element width: ${rect.width}
            - Target scroll position: ${finalPosition}`);
          
          // Scroll to the calculated position
          scrollContainer.scrollTo({
            left: finalPosition,
            behavior: 'smooth'
          });
          
          // Fallback with direct assignment
          setTimeout(() => {
            (scrollContainer as HTMLElement).scrollLeft = finalPosition;
          }, 100);
          
          // Also scroll the element into view as additional fallback
          setTimeout(() => {
            projectElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'center'
            });
          }, 200);
        } else {
          // No scrollable container found, just scroll element into view
          console.log('No scrollable container found, using scrollIntoView');
          projectElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'center'
          });
        }
      } else {
        console.log('Project element not found, falling back to date calculation...');
        
        // Fallback to original date-based calculation
        scrollContainer = document.querySelector('.p-4.overflow-x-auto') ||
                         document.querySelector('[class*="overflow-x-auto"]') ||
                         document.querySelector('.manufacturing-schedule');
        
        if (!scrollContainer) {
          const allScrollableElements = document.querySelectorAll('*');
          for (let i = 0; i < allScrollableElements.length; i++) {
            const element = allScrollableElements[i];
            const styles = window.getComputedStyle(element);
            if (styles.overflowX === 'auto' || styles.overflowX === 'scroll') {
              if (element.scrollWidth > element.clientWidth) {
                scrollContainer = element;
                break;
              }
            }
          }
        }
        
        if (!scrollContainer) {
          throw new Error("Could not find project element or scrollable container");
        }
        
        console.log(`Using fallback scroll container:`, scrollContainer);
        
        // Calculate the project's position based on its start date
        const projectStartDate = new Date(projectSchedule.startDate);
        const startOfYear = new Date(2024, 0, 1);
        const millisecondsPerDay = 24 * 60 * 60 * 1000;
        const daysSinceStart = Math.floor((projectStartDate.getTime() - startOfYear.getTime()) / millisecondsPerDay);
        
        // Week view calculations
        const pixelsPerDay = 144 / 7;
        const bayColumnWidth = 200;
        
        const projectPixelPosition = daysSinceStart * pixelsPerDay;
        const viewportWidth = scrollContainer.clientWidth;
        const targetPosition = projectPixelPosition + bayColumnWidth - (viewportWidth / 2);
        const finalPosition = Math.max(0, targetPosition);
        
        console.log(`Fallback calculation:
          - Start date: ${projectStartDate.toISOString()}
          - Days since 2024-01-01: ${daysSinceStart}
          - Pixel position: ${projectPixelPosition}
          - Target scroll position: ${finalPosition}`);
        
        scrollContainer.scrollTo({
          left: finalPosition,
          behavior: 'smooth'
        });
        
        setTimeout(() => {
          (scrollContainer as HTMLElement).scrollLeft = finalPosition;
        }, 100);
      }
      
      // Also scroll vertically to the bay if needed
      const activeBays = isSandboxMode ? sandboxBays : manufacturingBays;
      const targetBay = activeBays.find(bay => bay.id === projectSchedule.bayId);
      if (targetBay) {
        // Try to find the bay element and scroll it into view
        setTimeout(() => {
          const bayElements = document.querySelectorAll(`[data-bay-id="${targetBay.id}"], .bay-row, .manufacturing-bay`);
          for (let i = 0; i < bayElements.length; i++) {
            const bayElement = bayElements[i];
            const bayText = bayElement.textContent || '';
            if (bayText.includes(targetBay.name) || bayText.includes(`Bay ${targetBay.bayNumber}`)) {
              bayElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center',
                inline: 'nearest'
              });
              break;
            }
          }
        }, 500);
      }
      
      // Success message
      toast({
        title: "Found Project",
        description: `Scrolled to project ${targetProject.projectNumber} (${targetProject.name})`,
        duration: 3000
      });
      
      return true;
    } catch (error) {
      console.error("Project search scrolling failed:", error);
      toast({
        title: "Search Failed", 
        description: "Could not scroll to the project",
        variant: "destructive",
        duration: 3000
      });
      return false;
    }
  };
  
  // Filter states
  const [filterTeam, setFilterTeam] = useState<string | null>(null);
  
  // Project search state
  const [searchProjectNumber, setSearchProjectNumber] = useState<string>('');
  
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
  
  // All sandbox mode functions
  const toggleSandboxMode = useCallback(() => {
    if (isSandboxMode) {
      // If we're already in sandbox mode, ask about unsaved changes
      if (sandboxChanges > 0) {
        const confirmExit = confirm("You have unsaved changes. Are you sure you want to exit sandbox mode without saving?");
        if (!confirmExit) return;
      }
      
      // Exit sandbox mode
      setSandboxMode(false);
      setSandboxSchedules([]);
      setSandboxProjects([]);
      setSandboxBays([]);
      setSandboxChanges(0);
      
      toast({
        title: "Sandbox Mode Exited",
        description: "No changes were saved to production data",
        duration: 3000
      });
    } else {
      // Enter sandbox mode - make deep copies of the data
      const schedulesCopy = JSON.parse(JSON.stringify(manufacturingSchedules));
      const projectsCopy = JSON.parse(JSON.stringify(projects));
      const baysCopy = JSON.parse(JSON.stringify(manufacturingBays));
      
      // Update state
      setSandboxSchedules(schedulesCopy);
      setSandboxProjects(projectsCopy);
      setSandboxBays(baysCopy);
      setSandboxMode(true);
      setSandboxChanges(0);
      
      // Notify user
      toast({
        title: "Sandbox Mode Activated",
        description: "You can now experiment with the schedule without affecting real data",
        duration: 3000
      });
    }
  }, [isSandboxMode, sandboxChanges, manufacturingSchedules, projects, manufacturingBays, toast]);
  

  
  // Discard sandbox changes without saving
  const discardSandboxChanges = useCallback(() => {
    if (sandboxChanges > 0) {
      const confirmExit = confirm("You have unsaved changes. Are you sure you want to exit sandbox mode without saving?");
      if (!confirmExit) return;
    }
    
    toast({
      title: "Sandbox Mode Exited",
      description: "No changes were saved to production data",
      duration: 3000
    });
    
    // Reset state
    setSandboxMode(false);
    setSandboxSchedules([]);
    setSandboxProjects([]);
    setSandboxBays([]);
    setSandboxChanges(0);
  }, [sandboxChanges, toast]);
  
  // We'll move saveSandboxChanges further down to fix the circular dependency issue
  
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
  
  // Calculate unassigned projects count (excluding delivered projects)
  const unassignedProjectsCount = React.useMemo(() => {
    if (!projects.length) return 0;
    
    // Filter out delivered projects and Field/FSW category projects
    const eligibleProjects = projects.filter(project => {
      // Exclude delivered projects
      if (project.status === 'delivered') {
        return false;
      }
      
      // Exclude Field or FSW category projects
      if (project.team === 'Field' || project.team === 'FSW') {
        return false;
      }
      
      return true;
    });
    
    // Get scheduled project IDs
    const scheduledProjectIds = new Set(manufacturingSchedules.map(s => s.projectId));
    
    // Count eligible projects that are not scheduled
    const unassignedCount = eligibleProjects.filter(project => 
      !scheduledProjectIds.has(project.id)
    ).length;
    
    console.log(`🔢 Manufacturing Capacity calculation:
      - Total projects: ${projects.length}
      - Eligible projects (non-delivered, non-Field/FSW): ${eligibleProjects.length}
      - Scheduled projects: ${scheduledProjectsCount}
      - Unassigned eligible projects: ${unassignedCount}`);
    
    return unassignedCount;
  }, [projects, manufacturingSchedules, scheduledProjectsCount]);
  
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
  
  // Handler for schedule changes with optimistic updates and sandbox support
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
      
      // Set the schedule we're processing
      setProcessingScheduleId(scheduleId);
      
      // Show loading indicator
      setIsLoading(true);
      
      // Handle sandbox mode updates
      if (isSandboxMode) {
        // Find the schedule in sandbox data
        const scheduleIndex = sandboxSchedules.findIndex(s => s.id === scheduleId);
        
        if (scheduleIndex !== -1) {
          // Create updated schedules array
          const updatedSchedules = [...sandboxSchedules];
          
          // Update the specific schedule with new values
          updatedSchedules[scheduleIndex] = {
            ...updatedSchedules[scheduleIndex],
            bayId: newBayId,
            startDate: updatedSchedules[scheduleIndex].startDate,
            endDate: updatedSchedules[scheduleIndex].endDate,
            totalHours: totalHours || updatedSchedules[scheduleIndex].totalHours,
            row: rowIndex,
            rowIndex: rowIndex
          };
          
          // Update sandbox state after a short delay to simulate processing
          setTimeout(() => {
            // Update the sandbox schedules
            setSandboxSchedules(updatedSchedules);
            
            // Increment the change counter
            setSandboxChanges(prev => prev + 1);
            
            // Clear the loading state
            setIsLoading(false);
            setProcessingScheduleId(null);
            
            // Show success toast
            toast({
              title: "Sandbox Update",
              description: `Schedule updated in sandbox mode`,
              duration: 3000
            });
          }, 500);
          
          return { id: scheduleId };
        } else {
          throw new Error("Schedule not found in sandbox data");
        }
      }
      
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
            <ModuleHelpButton 
              moduleId="bay-scheduling" 
              helpContent={baySchedulingHelpContent}
            />
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
              { label: "Unassigned", value: unassignedProjectsCount },
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
      
      {/* SandboxModeBanner positioned between Current & Upcoming Production and Manufacturing Schedule */}
      {/* Implement save function inline here to avoid circular dependency with updateScheduleMutation */}
      <SandboxModeBanner 
        isActive={isSandboxMode}
        onToggle={toggleSandboxMode}
        onSave={async () => {
          if (sandboxChanges === 0) {
            toast({
              title: "No Changes",
              description: "There are no changes to save",
              duration: 3000
            });
            return;
          }
          
          setIsSavingSandbox(true);
          
          try {
            // Find all changed schedules by comparing sandbox to original
            const updatedSchedules = sandboxSchedules.filter(sandboxSchedule => {
              const originalSchedule = manufacturingSchedules.find(s => s.id === sandboxSchedule.id);
              
              // If we can't find a matching schedule, it's new
              if (!originalSchedule) return true;
              
              // Check if any properties changed
              return (
                sandboxSchedule.bayId !== originalSchedule.bayId ||
                sandboxSchedule.startDate !== originalSchedule.startDate ||
                sandboxSchedule.endDate !== originalSchedule.endDate ||
                sandboxSchedule.row !== originalSchedule.row
              );
            });
            
            console.log(`Applying ${updatedSchedules.length} schedule changes from sandbox`);
            
            // Process each schedule update sequentially to avoid race conditions
            for (const schedule of updatedSchedules) {
              await updateScheduleMutation.mutateAsync({
                scheduleId: schedule.id,
                bayId: schedule.bayId,
                startDate: schedule.startDate,
                endDate: schedule.endDate,
                row: schedule.row || 0
              });
            }
            
            toast({
              title: "Sandbox Changes Applied",
              description: `Successfully applied ${updatedSchedules.length} changes to production data`,
              duration: 3000
            });
            
            // Reset state
            setSandboxMode(false);
            setSandboxSchedules([]);
            setSandboxProjects([]);
            setSandboxBays([]);
            setSandboxChanges(0);
          } catch (error) {
            console.error("Error saving sandbox changes:", error);
            toast({
              title: "Error",
              description: "Failed to apply sandbox changes to production data",
              variant: "destructive",
              duration: 5000
            });
          } finally {
            setIsSavingSandbox(false);
          }
        }}
        onDiscard={discardSandboxChanges}
        hasChanges={sandboxChanges > 0}
      />
      
      <div className="rounded-md border border-gray-800 bg-darkCard">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Manufacturing Schedule</h2>
          
          <div className="flex items-center gap-4">
            {/* Project Search */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search project number..."
                  value={searchProjectNumber}
                  onChange={(e) => setSearchProjectNumber(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      scrollToProject(searchProjectNumber);
                    }
                  }}
                  className="pl-10 pr-4 py-2 w-48 text-sm"
                />
              </div>
              <Button
                onClick={() => scrollToProject(searchProjectNumber)}
                variant="outline"
                size="sm"
                className="whitespace-nowrap"
              >
                Find Project
              </Button>
            </div>
            
            {/* Day/Week/Month view options removed as requested */}
            <div className="flex items-center gap-2 mr-4">
              <Switch 
                id="financial-impact-toggle"
                checked={showFinancialImpact}
                onCheckedChange={setShowFinancialImpact}
              />
              <Label htmlFor="financial-impact-toggle" className="text-sm cursor-pointer">
                Financial Impact Analysis
              </Label>
            </div>
            
            {/* Removed redundant Sandbox Mode Toggle button since we now have the SandboxModeBanner */}
          </div>
        </div>
        <div className={`${isMobile ? 'p-2' : 'p-4 overflow-x-auto'}`}>
          {isMobile ? (
            <MobileBaySchedule
              schedules={isSandboxMode ? sandboxSchedules : manufacturingSchedules}
              projects={isSandboxMode ? sandboxProjects : projects}
              bays={filterTeam 
                ? (isSandboxMode ? sandboxBays : manufacturingBays).filter(bay => bay.team === filterTeam) 
                : (isSandboxMode ? sandboxBays : manufacturingBays)
              }
              dateRange={dateRange}
              viewMode={viewMode as 'day' | 'week' | 'month'}
              onViewModeChange={(mode) => setViewMode(mode)}
              onDateRangeChange={setDateRange}
            />
          ) : (
            <ResizableBaySchedule
              schedules={isSandboxMode ? sandboxSchedules : manufacturingSchedules}
              projects={isSandboxMode ? sandboxProjects : projects}
              bays={filterTeam 
                ? (isSandboxMode ? sandboxBays : manufacturingBays).filter(bay => bay.team === filterTeam) 
                : (isSandboxMode ? sandboxBays : manufacturingBays)
              }
              onScheduleChange={handleScheduleChange}
              onScheduleCreate={handleScheduleCreate}
              onScheduleDelete={handleScheduleDelete}
              onBayCreate={(bay) => createBayMutation.mutateAsync(bay)}
              onBayUpdate={(id, bay) => updateBayMutation.mutateAsync({ id, ...bay })}
              onBayDelete={(id) => deleteBayMutation.mutateAsync(id)}
              dateRange={dateRange}
              viewMode={viewMode}
              enableFinancialImpact={showFinancialImpact}
              isSandboxMode={isSandboxMode}
            />
          )}
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