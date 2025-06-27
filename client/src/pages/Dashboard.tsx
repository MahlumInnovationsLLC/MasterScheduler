import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useProjectLabelStats } from '../hooks/use-project-label-stats';
import { Link } from 'wouter';
import { format, isAfter, isBefore, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addWeeks, addMonths } from 'date-fns';
import { 
  Folders, 
  Calendar, 
  DollarSign, 
  Building, 
  TrendingUp, 
  Clock,
  Search,
  Filter,
  ChevronDown,
  Wrench,
  Hammer,
  Palette,
  Settings,
  CheckCircle,
  Shield,
  UserCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DataTable } from '@/components/ui/data-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";

const Dashboard = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const { toast } = useToast();

  // Filter states for Next 10 ready to ship table
  const [timeFilter, setTimeFilter] = useState<'all' | 'this-week' | 'next-week' | 'this-month' | 'next-month'>('all');
  const [selectedPhase, setSelectedPhase] = useState<'all' | 'mechShop' | 'fabStart' | 'paintStart' | 'productionStart' | 'it' | 'ntc' | 'qc' | 'executiveReview'>('all');
  const [phaseFilters, setPhaseFilters] = useState<{
    mechShop: boolean;
    fabStart: boolean;
    paintStart: boolean;
    productionStart: boolean;
    it: boolean;
    ntc: boolean;
    qc: boolean;
    executiveReview: boolean;
  }>({
    mechShop: true,
    fabStart: true,
    paintStart: true,
    productionStart: true,
    it: true,
    ntc: true,
    qc: true,
    executiveReview: true,
  });

  const [filteredProjects, setFilteredProjects] = useState<any[]>([]);
  const [selectedMonthData, setSelectedMonthData] = useState<{
    month: number;
    year: number;
    amount: number;
    milestones: any[];
  } | null>(null);

  // All hooks called in consistent order
  const { data: projects, isLoading: isLoadingProjects } = useQuery({
    queryKey: ['/api/projects'],
  });

  const { data: billingMilestones, isLoading: isLoadingBillingMilestones } = useQuery({
    queryKey: ['/api/billing-milestones'],
  });

  const { data: manufacturingSchedules, isLoading: isLoadingManufacturing } = useQuery({
    queryKey: ['/api/manufacturing-schedules'],
  });

  const { data: manufacturingBays, isLoading: isLoadingBays } = useQuery({
    queryKey: ['/api/manufacturing-bays'],
  });

  const { data: deliveredProjects } = useQuery({
    queryKey: ['/api/delivered-projects'],
    staleTime: 0,
    gcTime: 0,
  });

  // Get label statistics  
  const labelStats = useProjectLabelStats();

  // Helper function to format dates consistently
  const formatDate = (dateStr: any) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'N/A';

    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC'
    });
  };

  // Enhanced project table columns with filtering capabilities
  const projectColumns = useMemo(() => {
    const baseColumns = [
      {
        accessorKey: 'projectNumber',
        header: 'Project',
        cell: ({ row }: any) => {
          const isPastDue = row.original.shipDate ? new Date(row.original.shipDate) < new Date() : false;
          const isSalesEstimate = row.original.isSalesEstimate;

          return (
            <div className={`flex items-center ${isPastDue ? 'bg-red-900/30 rounded' : isSalesEstimate ? 'bg-yellow-500/10 rounded' : ''}`}>
              <div className="ml-2 p-1">
                <div className={`text-sm font-medium ${isPastDue ? 'text-red-500' : isSalesEstimate ? 'text-yellow-400' : 'text-white'} whitespace-normal`}>
                  <Link to={`/project/${row.original.id}`} className={`${isPastDue ? 'text-red-500 font-bold' : isSalesEstimate ? 'text-yellow-400 font-semibold' : 'text-primary'} hover:underline`}>
                    {isSalesEstimate && <span className="text-xs bg-yellow-500/20 text-yellow-300 px-1.5 py-0.5 rounded mr-2">PROPOSED</span>}
                    {row.original.projectNumber}
                  </Link>
                </div>
                <div 
                  className={`text-xs ${isSalesEstimate ? 'text-yellow-400/70' : 'text-gray-400'} line-clamp-2 overflow-hidden`}
                  title={row.original.name}
                >
                  {row.original.name}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'location',
        header: 'Location',
        cell: ({ row }: any) => (
          <div className="flex items-center">
            <div className="px-3 py-1 rounded font-medium text-white border border-gray-500 shadow-lg" 
                 style={{ 
                   background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                   boxShadow: '0 2px 8px rgba(107, 114, 128, 0.3)'
                 }}>
              {row.original.location || 'N/A'}
            </div>
          </div>
        ),
      },
    ];

    // Add phase columns based on filters
    if (phaseFilters.mechShop) {
      baseColumns.push({
        accessorKey: 'mechShop',
        header: 'Mech Shop',
        cell: ({ row }: any) => (
          <div className="flex items-center gap-1">
            <Wrench className="h-4 w-4 text-gray-400" />
            <div className="text-sm">
              {formatDate(row.original.mechShop)}
            </div>
          </div>
        ),
      });
    }

    if (phaseFilters.fabStart) {
      baseColumns.push({
        accessorKey: 'fabricationStart',
        header: 'FAB Start',
        cell: ({ row }: any) => (
          <div className="flex items-center gap-1">
            <Hammer className="h-4 w-4 text-blue-400" />
            <div className="text-sm">
              {formatDate(row.original.fabricationStart)}
            </div>
          </div>
        ),
      });
    }

    if (phaseFilters.paintStart) {
      baseColumns.push({
        accessorKey: 'paintStart',
        header: 'Paint Start',
        cell: ({ row }: any) => (
          <div className="flex items-center gap-1">
            <Palette className="h-4 w-4 text-pink-400" />
            <div className="text-sm">
              {formatDate(row.original.paintStart)}
            </div>
          </div>
        ),
      });
    }

    if (phaseFilters.productionStart) {
      baseColumns.push({
        accessorKey: 'assemblyStart',
        header: 'Production Start',
        cell: ({ row }: any) => (
          <div className="flex items-center gap-1">
            <Settings className="h-4 w-4 text-green-400" />
            <div className="text-sm">
              {formatDate(row.original.assemblyStart)}
            </div>
          </div>
        ),
      });
    }

    if (phaseFilters.it) {
      baseColumns.push({
        accessorKey: 'itStart',
        header: 'IT',
        cell: ({ row }: any) => (
          <div className="flex items-center gap-1">
            <Settings className="h-4 w-4 text-cyan-400" />
            <div className="text-sm">
              {formatDate(row.original.itStart)}
            </div>
          </div>
        ),
      });
    }

    if (phaseFilters.ntc) {
      baseColumns.push({
        accessorKey: 'ntcTestStart',
        header: 'NTC',
        cell: ({ row }: any) => (
          <div className="flex items-center gap-1">
            <CheckCircle className="h-4 w-4 text-orange-400" />
            <div className="text-sm">
              {formatDate(row.original.ntcTestStart)}
            </div>
          </div>
        ),
      });
    }

    if (phaseFilters.qc) {
      baseColumns.push({
        accessorKey: 'qcStart',
        header: 'QC',
        cell: ({ row }: any) => (
          <div className="flex items-center gap-1">
            <Shield className="h-4 w-4 text-purple-400" />
            <div className="text-sm">
              {formatDate(row.original.qcStart)}
            </div>
          </div>
        ),
      });
    }

    if (phaseFilters.executiveReview) {
      baseColumns.push({
        accessorKey: 'executiveReview',
        header: 'Executive Review',
        cell: ({ row }: any) => (
          <div className="flex items-center gap-1">
            <UserCheck className="h-4 w-4 text-yellow-400" />
            <div className="text-sm">
              {formatDate(row.original.executiveReview)}
            </div>
          </div>
        ),
      });
    }

    // Always include ship date and progress
    baseColumns.push(
      {
        accessorKey: 'shipDate',
        header: 'Ship Date',
        cell: ({ row }: any) => {
          const isPastDue = row.original.shipDate ? new Date(row.original.shipDate) < new Date() : false;
          return (
            <div className={`text-sm ${isPastDue ? 'text-red-400 font-semibold' : ''}`}>
              {formatDate(row.original.shipDate)}
            </div>
          );
        },
      },
      {
        accessorKey: 'percentComplete',
        header: 'Progress',
        cell: ({ row }: any) => {
          const percentValue = typeof row.original.percentComplete === 'string' ? parseFloat(row.original.percentComplete) : Number(row.original.percentComplete);
          return (
            <div className="flex items-center gap-2">
              <div className="w-full bg-gray-800 rounded-full h-2.5 relative overflow-hidden">
                <div 
                  className="h-2.5 rounded-full bg-gradient-to-r from-green-400 via-green-500 to-green-600 relative overflow-hidden" 
                  style={{ width: `${percentValue}%` }}
                >
                  <div className="absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                </div>
              </div>
              <span className="text-xs font-medium">{percentValue}%</span>
            </div>
          );
        },
      }
    );

    return baseColumns;
  }, [phaseFilters]);

  // Project scroll function
  const scrollToProject = (searchQuery: string) => {
    if (!searchQuery.trim()) {
      toast({
        title: "Search Required",
        description: "Please enter a project number to search",
        variant: "destructive",
      });
      return;
    }

    const projectElement = document.querySelector(`[data-project-number="${searchQuery}"]`);
    if (projectElement) {
      projectElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      (projectElement as HTMLElement).style.backgroundColor = '#1f2937';
      (projectElement as HTMLElement).style.transition = 'background-color 0.3s ease';
      
      setTimeout(() => {
        const element = document.querySelector(`[data-project-number="${searchQuery}"]`) as HTMLElement;
        if (element) {
          element.style.backgroundColor = '';
        }
      }, 2000);
    } else {
      toast({
        title: "Project Not Found",
        description: `Project ${searchQuery} is not visible in the current view`,
        variant: "destructive",
      });
    }
  };

  // Filter projects based on time filter and selected phase
  useEffect(() => {
    if (!projects || !Array.isArray(projects) || projects.length === 0) {
      setFilteredProjects([]);
      return;
    }

    const now = new Date();
    let filteredList = projects.filter((project: any) => {
      // Time-based filtering
      let passesTimeFilter = false;
      
      if (selectedPhase === 'all') {
        // For "all phases", filter by ship date
        if (!project.shipDate) return false;
        const shipDate = new Date(project.shipDate);
        
        switch (timeFilter) {
          case 'this-week':
            passesTimeFilter = shipDate >= startOfWeek(now) && shipDate <= endOfWeek(now);
            break;
          case 'next-week':
            const nextWeekStart = addWeeks(startOfWeek(now), 1);
            const nextWeekEnd = addWeeks(endOfWeek(now), 1);
            passesTimeFilter = shipDate >= nextWeekStart && shipDate <= nextWeekEnd;
            break;
          case 'this-month':
            passesTimeFilter = shipDate >= startOfMonth(now) && shipDate <= endOfMonth(now);
            break;
          case 'next-month':
            const nextMonthStart = addMonths(startOfMonth(now), 1);
            const nextMonthEnd = addMonths(endOfMonth(now), 1);
            passesTimeFilter = shipDate >= nextMonthStart && shipDate <= nextMonthEnd;
            break;
          default:
            passesTimeFilter = true;
        }
      } else {
        // For specific phases, filter by the phase date
        let phaseDate: Date | null = null;
        
        switch (selectedPhase) {
          case 'mechShop':
            phaseDate = project.mechShop ? new Date(project.mechShop) : null;
            break;
          case 'fabStart':
            phaseDate = project.fabricationStart ? new Date(project.fabricationStart) : null;
            break;
          case 'paintStart':
            phaseDate = project.paintStart ? new Date(project.paintStart) : null;
            break;
          case 'productionStart':
            phaseDate = project.assemblyStart ? new Date(project.assemblyStart) : null;
            break;
          case 'it':
            phaseDate = project.itStart ? new Date(project.itStart) : null;
            break;
          case 'ntc':
            phaseDate = project.ntcTestStart ? new Date(project.ntcTestStart) : null;
            break;
          case 'qc':
            phaseDate = project.qcStart ? new Date(project.qcStart) : null;
            break;
          case 'executiveReview':
            phaseDate = project.executiveReview ? new Date(project.executiveReview) : null;
            break;
        }
        
        if (!phaseDate) return false;
        
        switch (timeFilter) {
          case 'this-week':
            passesTimeFilter = phaseDate >= startOfWeek(now) && phaseDate <= endOfWeek(now);
            break;
          case 'next-week':
            const nextWeekStart = addWeeks(startOfWeek(now), 1);
            const nextWeekEnd = addWeeks(endOfWeek(now), 1);
            passesTimeFilter = phaseDate >= nextWeekStart && phaseDate <= nextWeekEnd;
            break;
          case 'this-month':
            passesTimeFilter = phaseDate >= startOfMonth(now) && phaseDate <= endOfMonth(now);
            break;
          case 'next-month':
            const nextMonthStart = addMonths(startOfMonth(now), 1);
            const nextMonthEnd = addMonths(endOfMonth(now), 1);
            passesTimeFilter = phaseDate >= nextMonthStart && phaseDate <= nextMonthEnd;
            break;
          default:
            passesTimeFilter = true;
        }
      }
      
      return passesTimeFilter;
    });

    // Sort by the appropriate date
    filteredList = filteredList.sort((a: any, b: any) => {
      if (selectedPhase === 'all') {
        // Sort by ship date
        const aDate = a.shipDate ? new Date(a.shipDate).getTime() : 0;
        const bDate = b.shipDate ? new Date(b.shipDate).getTime() : 0;
        return aDate - bDate;
      } else {
        // Sort by phase date
        let aPhaseDate = 0;
        let bPhaseDate = 0;
        
        switch (selectedPhase) {
          case 'mechShop':
            aPhaseDate = a.mechShop ? new Date(a.mechShop).getTime() : 0;
            bPhaseDate = b.mechShop ? new Date(b.mechShop).getTime() : 0;
            break;
          case 'fabStart':
            aPhaseDate = a.fabricationStart ? new Date(a.fabricationStart).getTime() : 0;
            bPhaseDate = b.fabricationStart ? new Date(b.fabricationStart).getTime() : 0;
            break;
          case 'paintStart':
            aPhaseDate = a.paintStart ? new Date(a.paintStart).getTime() : 0;
            bPhaseDate = b.paintStart ? new Date(b.paintStart).getTime() : 0;
            break;
          case 'productionStart':
            aPhaseDate = a.assemblyStart ? new Date(a.assemblyStart).getTime() : 0;
            bPhaseDate = b.assemblyStart ? new Date(b.assemblyStart).getTime() : 0;
            break;
          case 'it':
            aPhaseDate = a.itStart ? new Date(a.itStart).getTime() : 0;
            bPhaseDate = b.itStart ? new Date(b.itStart).getTime() : 0;
            break;
          case 'ntc':
            aPhaseDate = a.ntcTestStart ? new Date(a.ntcTestStart).getTime() : 0;
            bPhaseDate = b.ntcTestStart ? new Date(b.ntcTestStart).getTime() : 0;
            break;
          case 'qc':
            aPhaseDate = a.qcStart ? new Date(a.qcStart).getTime() : 0;
            bPhaseDate = b.qcStart ? new Date(b.qcStart).getTime() : 0;
            break;
          case 'executiveReview':
            aPhaseDate = a.executiveReview ? new Date(a.executiveReview).getTime() : 0;
            bPhaseDate = b.executiveReview ? new Date(b.executiveReview).getTime() : 0;
            break;
        }
        
        return aPhaseDate - bPhaseDate;
      }
    });

    // Apply limit only when showing "all phases" - no limit for specific phase filtering
    const finalList = selectedPhase === 'all' ? filteredList.slice(0, 10) : filteredList;

    setFilteredProjects(finalList);
  }, [projects, timeFilter, selectedPhase]);

  // Calculate delivered projects count
  const deliveredProjectsCount = Array.isArray(deliveredProjects) ? deliveredProjects.length : 0;

  // Calculate project stats
  const projectStats = React.useMemo(() => {
    if (!projects || !Array.isArray(projects) || projects.length === 0) return null;

    // Get projects by schedule state
    const getProjectScheduleState = (schedules: any[], projectId: number) => {
      const schedule = schedules.find((s: any) => s.projectId === projectId);
      if (!schedule) return 'Unscheduled';
      
      const now = new Date();
      const startDate = new Date(schedule.startDate);
      const endDate = new Date(schedule.endDate);
      
      if (now < startDate) return 'Scheduled';
      if (now >= startDate && now <= endDate) return 'In Progress';
      return 'Complete';
    };

    const scheduledProjects = manufacturingSchedules && Array.isArray(manufacturingSchedules)
      ? projects.filter((p: any) => getProjectScheduleState(manufacturingSchedules, p.id) === 'Scheduled')
      : [];
    const inProgressProjects = manufacturingSchedules && Array.isArray(manufacturingSchedules)
      ? projects.filter((p: any) => getProjectScheduleState(manufacturingSchedules, p.id) === 'In Progress')
      : [];
    const completeProjects = projects.filter((p: any) => p.status === 'completed');
    const unscheduledProjects = manufacturingSchedules && Array.isArray(manufacturingSchedules)
      ? projects.filter((p: any) => {
          const scheduleState = getProjectScheduleState(manufacturingSchedules, p.id);
          const isUnscheduled = scheduleState === 'Unscheduled' && p.status !== 'completed' && p.status !== 'delivered';
          
          // Filter out Field or FSW category projects
          if (p.team === 'Field' || p.team === 'FSW') {
            return false;
          }
          
          return isUnscheduled;
        })
      : [];

    // Simple project info for the popover display
    const projectLists = {
      scheduled: scheduledProjects.map((p: any) => ({ 
        id: p.id, 
        name: p.name, 
        projectNumber: p.projectNumber 
      })),
      inProgress: inProgressProjects.map((p: any) => ({ 
        id: p.id, 
        name: p.name, 
        projectNumber: p.projectNumber 
      })),
      complete: completeProjects.map((p: any) => ({ 
        id: p.id, 
        name: p.name, 
        projectNumber: p.projectNumber 
      })),
      unscheduled: unscheduledProjects.map((p: any) => ({ 
        id: p.id, 
        name: p.name, 
        projectNumber: p.projectNumber 
      })),
      delivered: Array.isArray(deliveredProjects) ? deliveredProjects.map((p: any) => ({ 
        id: p.id, 
        name: p.name || 'Unknown Project', 
        projectNumber: p.projectNumber 
      })) : []
    };

    return {
      total: projects.length,
      major: labelStats.major,
      minor: labelStats.minor,
      good: labelStats.good,
      scheduled: scheduledProjects.length,
      inProgress: inProgressProjects.length,
      complete: completeProjects.length,
      unscheduled: unscheduledProjects.length,
      delivered: deliveredProjectsCount,
      projectLists
    };
  }, [projects, manufacturingSchedules, labelStats, deliveredProjects, deliveredProjectsCount]);

  // Loading state
  if (isLoadingProjects || isLoadingBillingMilestones || isLoadingManufacturing || isLoadingBays) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-sans font-bold mb-6">Dashboard</h1>
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-darkCard h-28 rounded-xl border border-gray-800"></div>
            ))}
          </div>
          <div className="bg-darkCard h-80 rounded-xl border border-gray-800"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-sans font-bold">Dashboard</h1>
          <p className="text-gray-400 text-sm">Overview of project status, billing, and manufacturing</p>
        </div>
      </div>

      {/* Project Search */}
      <div className="mb-6">
        <div className="flex gap-2 max-w-md">
          <Input
            placeholder="Search by project number..."
            value={projectSearchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProjectSearchQuery(e.target.value)}
            className="flex-1"
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter') {
                scrollToProject(projectSearchQuery);
              }
            }}
          />
          <Button 
            onClick={() => scrollToProject(projectSearchQuery)}
            className="flex items-center gap-2"
          >
            <Search className="h-4 w-4" />
            Search
          </Button>
        </div>
      </div>

      {/* Enhanced Next 10 Ready to Ship Table */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {selectedPhase === 'all' ? 'Next 10 Ready to Ship' : 
               `${selectedPhase === 'mechShop' ? 'Mech Shop' :
                 selectedPhase === 'fabStart' ? 'FAB Start' :
                 selectedPhase === 'paintStart' ? 'Paint Start' :
                 selectedPhase === 'productionStart' ? 'Production Start' :
                 selectedPhase === 'it' ? 'IT' :
                 selectedPhase === 'ntc' ? 'NTC' :
                 selectedPhase === 'qc' ? 'QC' :
                 'Executive Review'} Projects`}
              {filteredProjects.length > 0 && selectedPhase !== 'all' && (
                <Badge variant="secondary" className="ml-2">
                  {filteredProjects.length} projects
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* Phase Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    {selectedPhase === 'all' ? 'All Phases' :
                     selectedPhase === 'mechShop' ? 'Mech Shop' :
                     selectedPhase === 'fabStart' ? 'FAB Start' :
                     selectedPhase === 'paintStart' ? 'Paint Start' :
                     selectedPhase === 'productionStart' ? 'Production Start' :
                     selectedPhase === 'it' ? 'IT' :
                     selectedPhase === 'ntc' ? 'NTC' :
                     selectedPhase === 'qc' ? 'QC' :
                     'Executive Review'}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSelectedPhase('all')}>
                    All Phases
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setSelectedPhase('mechShop')}>
                    Mech Shop
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedPhase('fabStart')}>
                    FAB Start
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedPhase('paintStart')}>
                    Paint Start
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedPhase('productionStart')}>
                    Production Start
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedPhase('it')}>
                    IT
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedPhase('ntc')}>
                    NTC
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedPhase('qc')}>
                    QC
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedPhase('executiveReview')}>
                    Executive Review
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Time Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {timeFilter === 'all' ? 'All Time' : 
                     timeFilter === 'this-week' ? 'This Week' :
                     timeFilter === 'next-week' ? 'Next Week' :
                     timeFilter === 'this-month' ? 'This Month' : 'Next Month'}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setTimeFilter('all')}>
                    All Time
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTimeFilter('this-week')}>
                    This Week
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTimeFilter('next-week')}>
                    Next Week
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTimeFilter('this-month')}>
                    This Month
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTimeFilter('next-month')}>
                    Next Month
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Phase Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Columns
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuCheckboxItem
                    checked={phaseFilters.mechShop}
                    onCheckedChange={(checked) => setPhaseFilters(prev => ({ ...prev, mechShop: checked }))}
                  >
                    Mech Shop
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={phaseFilters.fabStart}
                    onCheckedChange={(checked) => setPhaseFilters(prev => ({ ...prev, fabStart: checked }))}
                  >
                    FAB Start
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={phaseFilters.paintStart}
                    onCheckedChange={(checked) => setPhaseFilters(prev => ({ ...prev, paintStart: checked }))}
                  >
                    Paint Start
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={phaseFilters.productionStart}
                    onCheckedChange={(checked) => setPhaseFilters(prev => ({ ...prev, productionStart: checked }))}
                  >
                    Production Start
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={phaseFilters.it}
                    onCheckedChange={(checked) => setPhaseFilters(prev => ({ ...prev, it: checked }))}
                  >
                    IT
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={phaseFilters.ntc}
                    onCheckedChange={(checked) => setPhaseFilters(prev => ({ ...prev, ntc: checked }))}
                  >
                    NTC
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={phaseFilters.qc}
                    onCheckedChange={(checked) => setPhaseFilters(prev => ({ ...prev, qc: checked }))}
                  >
                    QC
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={phaseFilters.executiveReview}
                    onCheckedChange={(checked) => setPhaseFilters(prev => ({ ...prev, executiveReview: checked }))}
                  >
                    Executive Review
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={projectColumns}
            data={filteredProjects}
            filterColumn="projectNumber"
            searchPlaceholder="Search projects..."
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;