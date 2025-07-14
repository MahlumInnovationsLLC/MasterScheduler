import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { 
  Users, 
  Wrench, 
  Calendar, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  Plus,
  Edit,
  Trash2,
  Target,
  TrendingUp,
  Activity,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Settings,
  FileText,
  Download,
  Upload,
  Search,
  Filter,
  Play,
  ChevronUp,
  RotateCcw
} from 'lucide-react';
import { format } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';
import { ModuleHelpButton } from '@/components/ModuleHelpButton';
import { engineeringHelpContent } from '@/data/moduleHelpContent';
import { usePermissions } from '@/components/PermissionsManager';
import { useAuth } from '@/hooks/use-auth';
import { ShieldX } from 'lucide-react';

interface EngineeringResource {
  id: string; // User ID
  firstName: string;
  lastName: string;
  discipline: 'ME' | 'EE' | 'ITE' | 'NTC';
  title: string;
  workloadStatus: 'available' | 'at_capacity' | 'overloaded' | 'unavailable';
  currentCapacityPercent: number;
  hourlyRate: number;
  skillLevel: 'junior' | 'intermediate' | 'senior' | 'principal';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface EngineeringTask {
  id: number;
  projectId: number;
  resourceId: number;
  discipline: 'ME' | 'EE' | 'ITE' | 'NTC';
  taskName: string;
  description: string | null;
  estimatedHours: number;
  actualHours: number | null;
  percentComplete: number;
  status: 'not_started' | 'in_progress' | 'under_review' | 'completed' | 'on_hold';
  priority: 'low' | 'medium' | 'high' | 'critical';
  startDate: string | null;
  dueDate: string | null;
  completedDate: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface EngineeringBenchmark {
  id: number;
  projectId: number;
  discipline: 'ME' | 'EE' | 'ITE' | 'NTC';
  benchmarkName: string;
  description: string | null;
  targetDate: string;
  actualDate: string | null;
  isCompleted: boolean;
  commitmentLevel: 'low' | 'medium' | 'high' | 'critical';
  notes: string | null;
  progressPercentage?: number; // Progress from 0-100
  createdAt: Date;
  updatedAt: Date;
  // Project information from join
  projectNumber?: string;
  projectName?: string;
}

interface BenchmarkTemplate {
  id: number;
  name: string;
  description: string;
  discipline: 'ME' | 'EE' | 'ITE' | 'NTC';
  referencePhase: 'fabrication_start' | 'production_start';
  daysBefore: number;
  commitmentLevel: 'low' | 'medium' | 'high' | 'critical';
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ProjectEngineeringAssignment {
  id: number;
  projectId: number;
  resourceId: string; // User ID
  discipline: 'ME' | 'EE' | 'ITE' | 'NTC';
  percentage: number;
  isLead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface Project {
  id: number;
  name: string;
  projectNumber: string;
  status: string;
  shipDate?: string | null;
  meAssigned?: string | null;
  eeAssigned?: string | null;
  iteAssigned?: string | null;
  ntcAssigned?: string | null;
  meDesignOrdersPercent?: number | null;
  eeDesignOrdersPercent?: number | null;
  itDesignOrdersPercent?: number | null;
  itPercentage?: number | null;
  ntcPercentage?: number | null;
  engineeringTasks?: number;
  completedTasks?: number;
  engineeringBenchmarks?: number;
  completedBenchmarks?: number;
  // New discipline-specific benchmark fields
  meBenchmarks?: number;
  eeBenchmarks?: number;
  iteBenchmarks?: number;
  ntcBenchmarks?: number;
  meCompletionPercent?: number;
  eeCompletionPercent?: number;
  iteCompletionPercent?: number;
  ntcCompletionPercent?: number;
  // Manual percentage overrides
  meManualPercent?: number | null;
  eeManualPercent?: number | null;
  iteManualPercent?: number | null;
  ntcManualPercent?: number | null;
}

interface EngineeringOverview {
  workloadStats: {
    totalEngineers: number;
    availableEngineers: number;
    atCapacityEngineers: number;
    overloadedEngineers: number;
    unavailableEngineers: number;
  };
  disciplineStats: Record<string, number>;
  taskStats: {
    totalTasks: number;
    notStarted: number;
    inProgress: number;
    underReview: number;
    completed: number;
    onHold: number;
  };
  benchmarkStats: {
    totalBenchmarks: number;
    completed: number;
    pending: number;
  };
  projects: Project[];
  resources: EngineeringResource[];
  recentTasks: EngineeringTask[];
  upcomingBenchmarks: EngineeringBenchmark[];
}

export default function Engineering() {
  const { userRole } = usePermissions();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [showResourceDialog, setShowResourceDialog] = useState(false);
  const [selectedResource, setSelectedResource] = useState<EngineeringResource | null>(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<EngineeringTask | null>(null);
  const [showEngineerEditDialog, setShowEngineerEditDialog] = useState(false);
  const [editingEngineer, setEditingEngineer] = useState<EngineeringResource | null>(null);
  
  // Benchmark and template management states
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<BenchmarkTemplate | null>(null);
  const [showApplyTemplateDialog, setShowApplyTemplateDialog] = useState(false);
  const [showManageTemplatesDialog, setShowManageTemplatesDialog] = useState(false);
  const [showBenchmarkEditDialog, setShowBenchmarkEditDialog] = useState(false);
  const [selectedBenchmark, setSelectedBenchmark] = useState<EngineeringBenchmark | null>(null);
  const [sortField, setSortField] = useState<string>('status');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [disciplineFilter, setDisciplineFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [projectViewMode, setProjectViewMode] = useState<'project' | 'engineer'>('project');
  // Project table sorting state (separate from benchmarks sorting)
  const [projectSortField, setProjectSortField] = useState<string>('shipDate');
  const [projectSortOrder, setProjectSortOrder] = useState<'asc' | 'desc'>('asc');
  const queryClient = useQueryClient();

  // All hooks must be called before any conditional returns
  // Fetch engineering overview data
  const { data: overview, isLoading: overviewLoading, error: overviewError } = useQuery<EngineeringOverview>({
    queryKey: ['/api/engineering/engineering-overview'],
    retry: 3,
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true,
  });
  
  // Debug logging whenever overview data changes
  React.useEffect(() => {
    console.log('🔍 FRONTEND: Overview loading status:', overviewLoading);
    console.log('🔍 FRONTEND: Overview data:', overview);
    console.log('🔍 FRONTEND: Overview error:', overviewError);
    
    if (overview) {
      console.log('🔍 FRONTEND: Engineering overview data loaded successfully:', overview);
      console.log('🔍 FRONTEND: First project with ME benchmarks:', overview.projects.find(p => p.meBenchmarks > 0));
    }
    if (overviewError) {
      console.error('🔍 FRONTEND: Engineering overview error:', overviewError);
    }
  }, [overview, overviewError, overviewLoading]);



  // Fetch engineering resources
  const { data: resources = [], isLoading: resourcesLoading } = useQuery<EngineeringResource[]>({
    queryKey: ['/api/engineering/engineering-resources'],
  });

  // Fetch engineering tasks
  const { data: tasks = [], isLoading: tasksLoading } = useQuery<EngineeringTask[]>({
    queryKey: ['/api/engineering-tasks'],
  });

  // Fetch engineering benchmarks
  const { data: benchmarks = [], isLoading: benchmarksLoading } = useQuery<EngineeringBenchmark[]>({
    queryKey: ['/api/engineering/engineering-benchmarks'],
  });

  // Sort benchmarks with completed ones at the bottom
  const sortedBenchmarks = React.useMemo(() => {
    if (!benchmarks) return [];
    
    const benchmarksCopy = [...benchmarks];
    
    return benchmarksCopy.sort((a, b) => {
      // Always put completed benchmarks at the bottom
      if (a.isCompleted && !b.isCompleted) return 1;
      if (!a.isCompleted && b.isCompleted) return -1;
      
      // Then sort by the selected field
      if (sortField === 'benchmark') {
        return sortOrder === 'asc' 
          ? a.benchmarkName.localeCompare(b.benchmarkName)
          : b.benchmarkName.localeCompare(a.benchmarkName);
      } else if (sortField === 'project') {
        return sortOrder === 'asc' 
          ? a.projectId - b.projectId
          : b.projectId - a.projectId;
      } else if (sortField === 'discipline') {
        return sortOrder === 'asc'
          ? a.discipline.localeCompare(b.discipline)
          : b.discipline.localeCompare(a.discipline);
      } else if (sortField === 'targetDate') {
        return sortOrder === 'asc'
          ? new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
          : new Date(b.targetDate).getTime() - new Date(a.targetDate).getTime();
      } else if (sortField === 'progress') {
        const aProgress = a.progressPercentage || 0;
        const bProgress = b.progressPercentage || 0;
        return sortOrder === 'asc' ? aProgress - bProgress : bProgress - aProgress;
      } else if (sortField === 'commitment') {
        const commitmentOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
        const aOrder = commitmentOrder[a.commitmentLevel as keyof typeof commitmentOrder];
        const bOrder = commitmentOrder[b.commitmentLevel as keyof typeof commitmentOrder];
        return sortOrder === 'asc' ? aOrder - bOrder : bOrder - aOrder;
      }
      
      return 0;
    });
  }, [benchmarks, sortField, sortOrder]);

  // Project table sorting handler
  const handleProjectSort = (field: string) => {
    if (projectSortField === field) {
      if (projectSortOrder === 'asc') {
        setProjectSortOrder('desc');
      } else {
        // Third click resets to default sorting (shipDate asc)
        setProjectSortField('shipDate');
        setProjectSortOrder('asc');
      }
    } else {
      setProjectSortField(field);
      setProjectSortOrder('asc');
    }
  };

  // Benchmark table sorting handler
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Helper function to render sortable column headers
  const renderSortableHeader = (label: string, field: string) => (
    <th 
      className="text-left p-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 select-none"
      onClick={() => handleProjectSort(field)}
      title={`Click to sort by ${label}. Click again to reverse order. Third click resets to default sorting (Next Project Ready to Ship).`}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {projectSortField === field && (
          <ChevronUp 
            className={`h-4 w-4 transition-transform ${
              projectSortOrder === 'desc' ? 'rotate-180' : ''
            }`} 
          />
        )}
      </div>
    </th>
  );

  const { data: templates = [], isLoading: templatesLoading } = useQuery<BenchmarkTemplate[]>({
    queryKey: ['/api/engineering/benchmark-templates'],
  });

  // Mutations for benchmark management
  const generateStandardBenchmarksMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/engineering/generate-standard-benchmarks', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/engineering/engineering-benchmarks'] });
      toast({ title: "Standard benchmarks generated successfully" });
    },
    onError: (error) => {
      console.error('Error generating benchmarks:', error);
      toast({ title: "Failed to generate benchmarks", variant: "destructive" });
    }
  });

  const createTemplateMutation = useMutation({
    mutationFn: (template: any) => apiRequest('POST', '/api/engineering/benchmark-templates', template),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/engineering/benchmark-templates'] });
      toast({ title: "Template created successfully" });
    },
    onError: (error) => {
      console.error('Error creating template:', error);
      toast({ title: "Failed to create template", variant: "destructive" });
    }
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, template }: { id: number; template: any }) => 
      apiRequest('PUT', `/api/engineering/benchmark-templates/${id}`, template),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/engineering/benchmark-templates'] });
      toast({ title: "Template updated successfully" });
    },
    onError: (error) => {
      console.error('Error updating template:', error);
      toast({ title: "Failed to update template", variant: "destructive" });
    }
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/engineering/benchmark-templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/engineering/benchmark-templates'] });
      toast({ title: "Template deleted successfully" });
    },
    onError: (error) => {
      console.error('Error deleting template:', error);
      toast({ title: "Failed to delete template", variant: "destructive" });
    }
  });

  const applyTemplateMutation = useMutation({
    mutationFn: (data: { templateId: number; projectIds?: number[]; applyToAll?: boolean }) => 
      apiRequest('POST', '/api/engineering/apply-benchmark-template', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/engineering/engineering-benchmarks'] });
      toast({ title: "Template applied successfully" });
    },
    onError: (error) => {
      console.error('Error applying template:', error);
      toast({ title: "Failed to apply template", variant: "destructive" });
    }
  });

  const deleteBenchmarkMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/engineering/engineering-benchmarks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/engineering/engineering-benchmarks'] });
      toast({ title: "Benchmark deleted successfully" });
    },
    onError: (error) => {
      console.error('Error deleting benchmark:', error);
      toast({ title: "Failed to delete benchmark", variant: "destructive" });
    }
  });

  const updateBenchmarkMutation = useMutation({
    mutationFn: ({ id, benchmark }: { id: number; benchmark: any }) => 
      apiRequest('PUT', `/api/engineering/engineering-benchmarks/${id}`, benchmark),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/engineering/engineering-benchmarks'] });
      toast({ title: "Benchmark updated successfully" });
    },
    onError: (error) => {
      console.error('Error updating benchmark:', error);
      toast({ title: "Failed to update benchmark", variant: "destructive" });
    }
  });

  const updateBenchmarkProgressMutation = useMutation({
    mutationFn: ({ id, progressPercentage, isCompleted }: { id: number; progressPercentage?: number; isCompleted?: boolean }) => 
      apiRequest('PUT', `/api/engineering/engineering-benchmarks/${id}`, { 
        progressPercentage,
        isCompleted,
        ...(isCompleted && { actualDate: new Date().toISOString().split('T')[0] })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/engineering/engineering-benchmarks'] });
    },
    onError: (error) => {
      console.error('Error updating benchmark progress:', error);
      toast({ title: "Failed to update progress", variant: "destructive" });
    }
  });

  const autoCompleteDeliveredBenchmarksMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/engineering/auto-complete-delivered-benchmarks', {}),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/engineering/engineering-benchmarks'] });
      toast({ 
        title: "Auto-completion successful", 
        description: data.message || `Updated ${data.updated} benchmarks for delivered projects`
      });
    },
    onError: (error) => {
      console.error('Error auto-completing delivered benchmarks:', error);
      toast({ title: "Failed to auto-complete delivered benchmarks", variant: "destructive" });
    }
  });

  const updateManualPercentageMutation = useMutation({
    mutationFn: ({ projectId, percentages }: { projectId: number, percentages: { meManualPercent?: number | null, eeManualPercent?: number | null, iteManualPercent?: number | null, ntcManualPercent?: number | null } }) => 
      apiRequest('PUT', `/api/engineering/projects/${projectId}/manual-percentages`, percentages),
    onMutate: async ({ projectId, percentages }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['/api/engineering/engineering-overview'] });
      
      // Snapshot the previous value
      const previousOverview = queryClient.getQueryData(['/api/engineering/engineering-overview']);
      
      // Optimistically update to the new value
      queryClient.setQueryData(['/api/engineering/engineering-overview'], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          projects: old.projects.map((project: any) => {
            if (project.id === projectId) {
              const updatedProject = { ...project };
              // Update the appropriate completion percentages
              if (percentages.meManualPercent !== undefined) {
                updatedProject.meCompletionPercent = percentages.meManualPercent;
              }
              if (percentages.eeManualPercent !== undefined) {
                updatedProject.eeCompletionPercent = percentages.eeManualPercent;
              }
              if (percentages.iteManualPercent !== undefined) {
                updatedProject.iteCompletionPercent = percentages.iteManualPercent;
              }
              if (percentages.ntcManualPercent !== undefined) {
                updatedProject.ntcCompletionPercent = percentages.ntcManualPercent;
              }
              return updatedProject;
            }
            return project;
          })
        };
      });
      
      // Return a context object with the snapshotted value
      return { previousOverview };
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Manual percentages updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/engineering/engineering-overview'] });
    },
    onError: (error, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousOverview) {
        queryClient.setQueryData(['/api/engineering/engineering-overview'], context.previousOverview);
      }
      toast({
        title: 'Error',
        description: 'Failed to update manual percentages. Please try again.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/engineering/engineering-overview'] });
    },
  });

  // Fetch project assignments
  const { data: projectAssignments = [], isLoading: assignmentsLoading } = useQuery<ProjectEngineeringAssignment[]>({
    queryKey: ['/api/engineering/project-assignments'],
  });

  // Fetch projects with engineering data
  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });
  
  // Use overview data for projects if available, otherwise use direct projects data
  const projectsWithEngineering = overview?.projects || projects;
  
  // Enhanced search and filtering with sorting
  const filteredAndSortedProjects = React.useMemo(() => {
    let filtered = projectsWithEngineering.filter(project => {
      if (searchTerm === '') return true;
      
      const searchLower = searchTerm.toLowerCase();
      
      // Search in project name and number
      if (project.name?.toLowerCase().includes(searchLower) || 
          project.projectNumber?.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      // Search in assigned engineer names
      if (project.meAssigned?.toLowerCase().includes(searchLower) ||
          project.eeAssigned?.toLowerCase().includes(searchLower) ||
          project.iteAssigned?.toLowerCase().includes(searchLower) ||
          project.ntcAssigned?.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      // Search in status
      if (project.status?.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      return false;
    });
    
    // Sort the filtered results
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (projectSortField) {
        case 'name':
          aValue = a.name || '';
          bValue = b.name || '';
          break;
        case 'projectNumber':
          aValue = a.projectNumber || '';
          bValue = b.projectNumber || '';
          break;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        case 'meAssigned':
          aValue = a.meAssigned || 'Unassigned';
          bValue = b.meAssigned || 'Unassigned';
          break;
        case 'eeAssigned':
          aValue = a.eeAssigned || 'Unassigned';
          bValue = b.eeAssigned || 'Unassigned';
          break;
        case 'iteAssigned':
          aValue = a.iteAssigned || 'Unassigned';
          bValue = b.iteAssigned || 'Unassigned';
          break;
        case 'ntcAssigned':
          aValue = a.ntcAssigned || 'Unassigned';
          bValue = b.ntcAssigned || 'Unassigned';
          break;
        case 'mePercent':
          aValue = a.meCompletionPercent || 0;
          bValue = b.meCompletionPercent || 0;
          break;
        case 'eePercent':
          aValue = a.eeCompletionPercent || 0;
          bValue = b.eeCompletionPercent || 0;
          break;
        case 'itePercent':
          aValue = a.iteCompletionPercent || 0;
          bValue = b.iteCompletionPercent || 0;
          break;
        case 'ntcPercent':
          aValue = a.ntcCompletionPercent || 0;
          bValue = b.ntcCompletionPercent || 0;
          break;
        case 'tasks':
          aValue = (a.completedTasks || 0) / (a.engineeringTasks || 1);
          bValue = (b.completedTasks || 0) / (b.engineeringTasks || 1);
          break;
        case 'benchmarks':
          aValue = (a.completedBenchmarks || 0) / (a.engineeringBenchmarks || 1);
          bValue = (b.completedBenchmarks || 0) / (b.engineeringBenchmarks || 1);
          break;
        case 'shipDate':
          // Sort by ship date for "Next Project Ready To Ship" default sorting
          aValue = a.shipDate ? new Date(a.shipDate).getTime() : new Date('2099-12-31').getTime();
          bValue = b.shipDate ? new Date(b.shipDate).getTime() : new Date('2099-12-31').getTime();
          break;
        default:
          aValue = a.name || '';
          bValue = b.name || '';
      }
      
      // Handle string comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return projectSortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      // Handle numeric comparison
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return projectSortOrder === 'asc' 
          ? aValue - bValue
          : bValue - aValue;
      }
      
      return 0;
    });
    
    return filtered;
  }, [projectsWithEngineering, searchTerm, projectSortField, projectSortOrder]);
  
  // Debug logging
  React.useEffect(() => {
    console.log('🔍 FRONTEND: projectsWithEngineering array length:', projectsWithEngineering.length);
    console.log('🔍 FRONTEND: first project with benchmarks:', projectsWithEngineering.find(p => p.meBenchmarks > 0));
  }, [projectsWithEngineering]);

  // Fetch engineering users
  const { data: engineers = [], isLoading: engineersLoading } = useQuery<any[]>({
    queryKey: ['/api/users'],
    select: (data: any[]) => data.filter(user => user.department === 'engineering'),
  });

  // Mutation for updating project assignments directly in Projects table
  const updateProjectAssignmentMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<{ 
      meAssigned: string | null; 
      eeAssigned: string | null; 
      iteAssigned: string | null;
      meDesignOrdersPercent: number | null;
      eeDesignOrdersPercent: number | null;
      itDesignOrdersPercent: number | null;
      ntcPercentage: number | null;
    }>) => {
      return await apiRequest('PUT', `/api/projects/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/engineering/engineering-overview'] });
    },
  });

  // Mutation for updating project assignments
  const updateAssignmentMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<ProjectEngineeringAssignment> & { id: number }) => {
      return await apiRequest('PUT', `/api/engineering/project-assignments/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/engineering/project-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    },
  });

  // Mutation for creating project assignments
  const createAssignmentMutation = useMutation({
    mutationFn: async (data: Omit<ProjectEngineeringAssignment, 'id' | 'createdAt' | 'updatedAt'>) => {
      return await apiRequest('POST', '/api/engineering/project-assignments', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/engineering/project-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    },
  });

  // Mutation for deleting project assignments
  const deleteAssignmentMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/engineering/project-assignments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/engineering/project-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    },
  });

  // Mutation for updating engineering resources
  const updateEngineerMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<EngineeringResource> & { id: number }) => {
      return await apiRequest('PUT', `/api/engineering/engineering-resources/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/engineering/engineering-resources'] });
      queryClient.invalidateQueries({ queryKey: ['/api/engineering/engineering-overview'] });
      setShowEngineerEditDialog(false);
      setEditingEngineer(null);
      toast({
        title: "Success",
        description: "Engineer updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update engineer",
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting engineering resources (admin only)
  const deleteEngineerMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/engineering/engineering-resources'] });
      queryClient.invalidateQueries({ queryKey: ['/api/engineering/engineering-overview'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Success",
        description: "Engineer deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete engineer",
        variant: "destructive",
      });
    },
  });

  // Mutation for creating project engineering assignments
  const createEngineerAssignmentMutation = useMutation({
    mutationFn: async (data: Omit<ProjectEngineeringAssignment, 'id' | 'createdAt' | 'updatedAt'>) => {
      console.log('🔍 DEBUG: MUTATION STARTING - Assignment data:', data);
      try {
        const result = await apiRequest('POST', '/api/engineering/project-assignments', data);
        console.log('🔍 DEBUG: MUTATION SUCCESS - API result:', result);
        return result;
      } catch (error) {
        console.error('🔍 DEBUG: MUTATION ERROR - API failed:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('🔍 DEBUG: MUTATION onSuccess triggered with data:', data);
      console.log('🔍 DEBUG: SUCCESS - Assignment created successfully, invalidating queries...');
      queryClient.invalidateQueries({ queryKey: ['/api/engineering/project-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/engineering/engineering-overview'] });
      toast({
        title: "Success",
        description: "Engineer assigned to project successfully",
      });
      console.log('🔍 DEBUG: SUCCESS toast shown and queries invalidated');
    },
    onError: (error: any) => {
      console.error('🔍 DEBUG: MUTATION onError triggered with error:', error);
      console.error('🔍 DEBUG: ERROR - Full error object:', JSON.stringify(error, null, 2));
      console.error('🔍 DEBUG: ERROR - Error message:', error.message);
      console.error('🔍 DEBUG: ERROR - Error stack:', error.stack);
      toast({
        title: "Error",
        description: error.message || "Failed to assign engineer to project",
        variant: "destructive",
      });
      console.error('🔍 DEBUG: ERROR toast shown');
    },
  });

  // Mutation for updating assignment percentage
  const updateAssignmentPercentageMutation = useMutation({
    mutationFn: async ({ assignmentId, percentage }: { assignmentId: number; percentage: number }) => {
      return await apiRequest('PUT', `/api/engineering/project-assignments/${assignmentId}`, { percentage });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/engineering/project-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/engineering/engineering-overview'] });
      toast({
        title: "Success",
        description: "Assignment percentage updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update assignment percentage",
        variant: "destructive",
      });
    },
  });





  // Handler for manual percentage update
  const handleManualPercentageUpdate = (projectId: number, discipline: 'me' | 'ee' | 'ite' | 'ntc', percentage: number) => {
    const percentages: any = {};
    percentages[`${discipline}ManualPercent`] = percentage;
    updateManualPercentageMutation.mutate({ projectId, percentages });
  };

  // Handler for reverting to calculated percentage
  const handleRevertToCalculated = (projectId: number, discipline: 'me' | 'ee' | 'ite' | 'ntc') => {
    const percentages: any = {};
    percentages[`${discipline}ManualPercent`] = null;
    updateManualPercentageMutation.mutate({ projectId, percentages });
  };

  // Check if user has access to Engineering module
  const hasEngineeringAccess = () => {
    // Only check userRole, user object can be null during loading
    if (!userRole) {
      return false;
    }

    // EDITOR and ADMIN roles can access regardless of department
    if (userRole === 'editor' || userRole === 'admin') {
      return true;
    }

    // VIEWER role can access ONLY if they are in the engineering department
    if (userRole === 'viewer') {
      return user?.department === 'engineering';
    }

    return false;
  };

  // Check if user can edit within Engineering module
  const canEditEngineering = () => {
    // Only check userRole, user object can be null during loading
    if (!userRole) {
      return false;
    }

    // EDITOR and ADMIN roles can edit regardless of department
    if (userRole === 'editor' || userRole === 'admin') {
      return true;
    }

    // VIEWER role can edit ONLY if they are in the engineering department
    if (userRole === 'viewer') {
      return user?.department === 'engineering';
    }

    return false;
  };

  // Check if user is admin (for delete permissions)
  const isAdmin = () => {
    return userRole === 'admin';
  };

  // Handle engineer deletion with confirmation
  const handleDeleteEngineer = (engineer: EngineeringResource) => {
    if (!isAdmin()) {
      toast({
        title: "Access Denied",
        description: "Only administrators can delete engineers",
        variant: "destructive",
      });
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${engineer.firstName} ${engineer.lastName}? This action cannot be undone.`)) {
      deleteEngineerMutation.mutate(engineer.id);
    }
  };

  // If user doesn't have access, show access denied message
  if (!hasEngineeringAccess()) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <ShieldX className="h-16 w-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            You don't have permission to access the Engineering Resource Planner.
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md">
            <p className="text-sm text-red-700">
              <strong>Requirements:</strong>
              <br />
              • Must have EDITOR or ADMIN role
              <br />
              • OR be a VIEWER in the Engineering department
              <br />
              • General VIEWER access is restricted
            </p>
          </div>
        </div>
      </div>
    );
  }



  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'at_capacity': return 'bg-yellow-100 text-yellow-800';
      case 'overloaded': return 'bg-red-100 text-red-800';
      case 'unavailable': return 'bg-gray-100 text-gray-800';
      case 'not_started': return 'bg-gray-100 text-gray-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'under_review': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'on_hold': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper function to get engineer assignments for a project
  const getProjectAssignments = (projectId: number) => {
    return projectAssignments.filter(assignment => assignment.projectId === projectId);
  };

  // Helper function to calculate percentage for a discipline on a project
  const getDisciplinePercentage = (projectId: number, discipline: 'ME' | 'EE' | 'ITE' | 'NTC') => {
    const assignments = getProjectAssignments(projectId);
    const disciplineAssignments = assignments.filter(a => a.discipline === discipline);
    return disciplineAssignments.reduce((sum, a) => sum + a.percentage, 0);
  };

  // Helper function to get assigned engineers for a project discipline
  const getAssignedEngineers = (projectId: number, discipline: 'ME' | 'EE' | 'ITE' | 'NTC') => {
    const assignments = getProjectAssignments(projectId);
    const disciplineAssignments = assignments.filter(a => a.discipline === discipline);
    return disciplineAssignments.map(assignment => {
      const engineer = resources.find(resource => resource.id === assignment.resourceId);
      return engineer ? `${engineer.firstName} ${engineer.lastName}` : 'Unknown';
    }).join(', ');
  };

  // Function to handle engineer assignment update
  const handleEngineerAssignment = async (projectId: number, discipline: 'ME' | 'EE' | 'ITE' | 'NTC', engineerId: string) => {
    console.log('🔍 DEBUG: handleEngineerAssignment called with:', { projectId, discipline, engineerId });
    
    const engineer = resources.find(resource => resource.id === engineerId);
    console.log('🔍 DEBUG: Found engineer:', engineer);
    
    if (engineer) {
      const assignmentData: Omit<ProjectEngineeringAssignment, 'id' | 'createdAt' | 'updatedAt'> = {
        projectId: projectId,
        resourceId: engineerId,
        discipline: discipline,
        percentage: 50, // Default to 50% assignment
        isLead: false // Default to not lead
      };

      console.log('🔍 DEBUG: Creating assignment:', assignmentData);
      await createEngineerAssignmentMutation.mutateAsync(assignmentData);
    } else {
      console.error('🔍 DEBUG: Engineer not found with ID:', engineerId);
    }
  };

  // Function to handle percentage update
  const handlePercentageUpdate = async (projectId: number, discipline: 'ME' | 'EE' | 'ITE' | 'NTC', newPercentage: number) => {
    const percentageData: any = {};

    switch (discipline) {
      case 'ME':
        percentageData.meDesignOrdersPercent = newPercentage;
        break;
      case 'EE':
        percentageData.eeDesignOrdersPercent = newPercentage;
        break;
      case 'ITE':
        percentageData.itDesignOrdersPercent = newPercentage;
        break;
      case 'NTC':
        percentageData.ntcPercentage = newPercentage;
        break;
    }

    await updateProjectAssignmentMutation.mutateAsync({
      id: projectId,
      ...percentageData
    });
  };

  const formatPercentage = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    return `${Math.round(value)}%`;
  };

  // Function to handle engineer edit
  const handleEditEngineer = (engineer: EngineeringResource) => {
    setEditingEngineer(engineer);
    setSelectedProjectId(null); // Reset project selection when opening dialog
    setShowEngineerEditDialog(true);
  };

  // Function to handle engineer form submission
  const handleEngineerSubmit = (formData: any) => {
    console.log('🔍 DEBUG: SUBMIT BUTTON CLICKED - Starting form submission process');
    console.log('🔍 DEBUG: Form data received:', formData);
    console.log('🔍 DEBUG: Editing engineer:', editingEngineer);
    console.log('🔍 DEBUG: Selected project ID:', selectedProjectId);
    
    if (editingEngineer) {
      // First update the engineer
      console.log('🔍 DEBUG: Updating engineer with mutation...');
      updateEngineerMutation.mutate({
        id: editingEngineer.id,
        ...formData,
      });

      // Then handle project assignment if a project was selected
      if (selectedProjectId) {
        console.log('🔍 DEBUG: SAVE CLICKED - Creating assignment for project:', selectedProjectId);
        console.log('🔍 DEBUG: About to call handleProjectAssignment with engineer ID:', editingEngineer.id);
        console.log('🔍 DEBUG: Current selectedProjectId state:', selectedProjectId);
        console.log('🔍 DEBUG: Current editingEngineer:', editingEngineer);
        
        // Call the assignment creation function
        handleProjectAssignment(editingEngineer.id, selectedProjectId);
        
        // Reset the selected project after assignment
        console.log('🔍 DEBUG: Resetting selected project ID to null');
        setSelectedProjectId(null);
      } else {
        console.log('🔍 DEBUG: No project selected - skipping assignment creation');
        console.log('🔍 DEBUG: Current selectedProjectId state when no project selected:', selectedProjectId);
      }
    } else {
      console.error('🔍 DEBUG: ERROR - No editing engineer found');
    }
  };

  // Function to handle project assignment
  const handleProjectAssignment = async (engineerId: string, projectId: string) => {
    console.log('🔍 DEBUG: Starting assignment creation for engineer:', engineerId, 'project:', projectId);
    
    const engineer = resources.find(r => r.id === engineerId);
    if (!engineer) {
      console.error('🔍 DEBUG: Engineer not found in resources for ID:', engineerId);
      return;
    }

    console.log('🔍 DEBUG: Found engineer in resources:', engineer);

    // Check if engineer is already assigned to this project using the user ID
    const existingAssignment = projectAssignments.find(
      a => a.resourceId === engineerId && a.projectId === parseInt(projectId)
    );

    if (existingAssignment) {
      toast({
        title: "Info",
        description: "Engineer is already assigned to this project",
        variant: "default",
      });
      return;
    }

    console.log('🔍 DEBUG: Creating assignment with user ID:', engineerId);
    
    const assignmentData = {
      projectId: parseInt(projectId),
      resourceId: engineerId, // Use the actual user ID
      discipline: engineer.discipline as 'ME' | 'EE' | 'ITE' | 'NTC',
      percentage: 50, // Default percentage
      isLead: false,
    };
    
    console.log('🔍 DEBUG: Assignment data to be sent:', assignmentData);

    createEngineerAssignmentMutation.mutate(assignmentData);
  };

  // Function to get engineer assignments
  const getEngineerAssignments = (engineerId: string) => {
    console.log('🔍 DEBUG: Getting assignments for engineer ID:', engineerId);
    console.log('🔍 DEBUG: Available project assignments:', projectAssignments);
    console.log('🔍 DEBUG: Project assignments loading:', assignmentsLoading);
    
    // Filter assignments by the user ID directly
    const assignments = projectAssignments.filter(assignment => assignment.resourceId === engineerId);
    console.log('🔍 DEBUG: Found assignments:', assignments);
    
    return assignments;
  };

  // Function to update assignment percentage
  const handleAssignmentPercentageUpdate = (assignmentId: number, newPercentage: number) => {
    if (newPercentage >= 0 && newPercentage <= 100) {
      updateAssignmentPercentageMutation.mutate({
        assignmentId,
        percentage: newPercentage,
      });
    }
  };

  return (
    <div>
      <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold">Engineering Resource Planner</h1>
            <p className="text-muted-foreground">
              Manage engineering resources, track project assignments, and monitor benchmarks
            </p>
          </div>
          <ModuleHelpButton moduleId="engineering" helpContent={engineeringHelpContent} />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="resource-planning">Resource Planning</TabsTrigger>
          <TabsTrigger value="benchmarks-overview">Benchmarks Overview</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {overviewLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading overview data...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Workload Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Engineers</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{overview?.workloadStats.totalEngineers || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Available</CardTitle>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{overview?.workloadStats.availableEngineers || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">At Capacity</CardTitle>
                    <Clock className="h-4 w-4 text-yellow-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">{overview?.workloadStats.atCapacityEngineers || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Overloaded</CardTitle>
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{overview?.workloadStats.overloadedEngineers || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Unavailable</CardTitle>
                    <Activity className="h-4 w-4 text-gray-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-600">{overview?.workloadStats.unavailableEngineers || 0}</div>
                  </CardContent>
                </Card>
              </div>

              

              {/* Projects with Engineering Data */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Projects Overview</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        All projects with engineering assignments and adjustable percentages
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      {/* Search Input */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          placeholder="Search projects, engineers, status..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 w-64"
                        />
                      </div>

                      {/* View Mode Toggle */}
                      <div className="flex border border-gray-300 dark:border-gray-600 rounded-lg">
                        <Button
                          variant={projectViewMode === 'project' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setProjectViewMode('project')}
                          className={`rounded-r-none ${
                            projectViewMode === 'project' 
                              ? 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700' 
                              : 'bg-white text-gray-900 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Project View
                        </Button>
                        <Button
                          variant={projectViewMode === 'engineer' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setProjectViewMode('engineer')}
                          className={`rounded-l-none ${
                            projectViewMode === 'engineer' 
                              ? 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700' 
                              : 'bg-white text-gray-900 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          <Users className="h-4 w-4 mr-1" />
                          Engineer View
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto max-h-[800px] overflow-y-auto">
                    {projectViewMode === 'project' ? (
                      <table className="w-full">
                        <thead className="sticky top-0 bg-white dark:bg-gray-900">
                          <tr className="border-b">
                            {renderSortableHeader('Project', 'name')}
                            {renderSortableHeader('Status', 'status')}
                            {renderSortableHeader('ME Assigned', 'meAssigned')}
                            {renderSortableHeader('EE Assigned', 'eeAssigned')}
                            {renderSortableHeader('ITE Assigned', 'iteAssigned')}
                            {renderSortableHeader('NTC Assigned', 'ntcAssigned')}
                            {renderSortableHeader('ME %', 'mePercent')}
                            {renderSortableHeader('EE %', 'eePercent')}
                            {renderSortableHeader('IT %', 'itePercent')}
                            {renderSortableHeader('NTC %', 'ntcPercent')}
                            {renderSortableHeader('Tasks', 'tasks')}
                            {renderSortableHeader('Benchmarks', 'benchmarks')}
                            <th className="text-left p-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredAndSortedProjects.map((project) => (
                            <tr key={project.id} className="border-b hover:bg-gray-50">
                              <td className="p-2">
                                <div>
                                  <div className="font-medium">{project.name}</div>
                                  <div className="text-sm text-muted-foreground">{project.projectNumber}</div>
                                </div>
                              </td>
                              <td className="p-2">
                                <Badge variant="outline" className={getStatusColor(project.status)}>
                                  {project.status}
                                </Badge>
                              </td>
                              <td className="p-2 text-sm">{project.meAssigned || 'Unassigned'}</td>
                              <td className="p-2 text-sm">{project.eeAssigned || 'Unassigned'}</td>
                              <td className="p-2 text-sm">{project.iteAssigned || 'Unassigned'}</td>
                              <td className="p-2 text-sm">{project.ntcAssigned || 'Unassigned'}</td>
                              <td className="p-2">
                                <div className="text-center text-sm">
                                  {formatPercentage(project.meCompletionPercent)}
                                  <div className="text-xs text-muted-foreground">{project.meBenchmarks || 0} benchmarks</div>
                                </div>
                              </td>
                              <td className="p-2">
                                <div className="text-center text-sm">
                                  {formatPercentage(project.eeCompletionPercent)}
                                  <div className="text-xs text-muted-foreground">{project.eeBenchmarks || 0} benchmarks</div>
                                </div>
                              </td>
                              <td className="p-2">
                                <div className="text-center text-sm">
                                  {formatPercentage(project.iteCompletionPercent)}
                                  <div className="text-xs text-muted-foreground">{project.iteBenchmarks || 0} benchmarks</div>
                                </div>
                              </td>
                              <td className="p-2">
                                <div className="text-center text-sm">
                                  {formatPercentage(project.ntcCompletionPercent)}
                                  <div className="text-xs text-muted-foreground">{project.ntcBenchmarks || 0} benchmarks</div>
                                </div>
                              </td>
                              <td className="p-2 text-sm">
                                {project.completedTasks || 0} / {project.engineeringTasks || 0}
                              </td>
                              <td className="p-2 text-sm">
                                {project.completedBenchmarks || 0} / {project.engineeringBenchmarks || 0}
                              </td>
                              <td className="p-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedProject(project);
                                    setShowProjectDialog(true);
                                  }}
                                >
                                  <Wrench className="h-4 w-4 mr-1" />
                                  Manage
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="space-y-6">
                        {engineers
                          .filter(engineer => 
                            searchTerm === '' ||
                            `${engineer.firstName} ${engineer.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
                          )
                          .map((engineer) => {
                            const engineerProjects = projectsWithEngineering.filter(project => 
                              project.meAssigned === `${engineer.firstName} ${engineer.lastName}` ||
                              project.eeAssigned === `${engineer.firstName} ${engineer.lastName}` ||
                              project.iteAssigned === `${engineer.firstName} ${engineer.lastName}` ||
                              project.ntcAssigned === `${engineer.firstName} ${engineer.lastName}`
                            );

                            return (
                              <div key={engineer.id} className="border rounded-lg p-4">
                                <div className="flex items-center justify-between mb-4">
                                  <div>
                                    <h4 className="text-lg font-semibold">
                                      {engineer.firstName} {engineer.lastName}
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                      {engineer.title || 'Engineer'} • {engineer.department}
                                    </p>
                                  </div>
                                  <Badge variant="outline" className="text-sm">
                                    {engineerProjects.length} Project{engineerProjects.length !== 1 ? 's' : ''}
                                  </Badge>
                                </div>

                                {engineerProjects.length > 0 ? (
                                  <div className="overflow-x-auto">
                                    <table className="w-full">
                                      <thead>
                                        <tr className="border-b text-sm">
                                          <th className="text-left p-2">Project</th>
                                          <th className="text-left p-2">Status</th>
                                          <th className="text-left p-2">Role</th>
                                          <th className="text-left p-2">Completion %</th>
                                          <th className="text-left p-2">Benchmarks</th>
                                          <th className="text-left p-2">Tasks</th>
                                          <th className="text-left p-2">Actions</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {engineerProjects.map((project) => {
                                          const engineerName = `${engineer.firstName} ${engineer.lastName}`;
                                          let role = '';
                                          let percentage = 0;
                                          let benchmarkCount = 0;

                                          if (project.meAssigned === engineerName) {
                                            role = 'ME';
                                            percentage = project.meCompletionPercent || 0;
                                            benchmarkCount = project.meBenchmarks || 0;
                                          } else if (project.eeAssigned === engineerName) {
                                            role = 'EE';
                                            percentage = project.eeCompletionPercent || 0;
                                            benchmarkCount = project.eeBenchmarks || 0;
                                          } else if (project.iteAssigned === engineerName) {
                                            role = 'ITE';
                                            percentage = project.iteCompletionPercent || 0;
                                            benchmarkCount = project.iteBenchmarks || 0;
                                          } else if (project.ntcAssigned === engineerName) {
                                            role = 'NTC';
                                            percentage = project.ntcCompletionPercent || 0;
                                            benchmarkCount = project.ntcBenchmarks || 0;
                                          }

                                          return (
                                            <tr key={project.id} className="border-b hover:bg-gray-50">
                                              <td className="p-2">
                                                <div>
                                                  <div className="font-medium text-sm">{project.name}</div>
                                                  <div className="text-xs text-muted-foreground">{project.projectNumber}</div>
                                                </div>
                                              </td>
                                              <td className="p-2">
                                                <Badge variant="outline" className={getStatusColor(project.status) + ' text-xs'}>
                                                  {project.status}                                                </Badge>
                                              </td>
                                              <td className="p-2">
                                                <Badge variant="outline" className="text-xs">{role}</Badge>
                                              </td>
                                              <td className="p-2 text-sm text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                  <div className="flex-1 bg-gray-200 rounded-full h-2 relative min-w-[80px]">
                                                    <div 
                                                      className="h-2 rounded-full bg-blue-500 transition-all duration-300"
                                                      style={{ width: `${percentage}%` }}
                                                    />
                                                    <input
                                                      type="range"
                                                      min="0"
                                                      max="100"
                                                      value={percentage}
                                                      onChange={(e) => {
                                                        const newPercentage = parseInt(e.target.value);
                                                        const fieldName = role === 'ME' ? 'meManualPercent' : 
                                                                        role === 'EE' ? 'eeManualPercent' : 
                                                                        role === 'ITE' ? 'iteManualPercent' : 
                                                                        'ntcManualPercent';
                                                        
                                                        updateManualPercentageMutation.mutate({
                                                          projectId: project.id,
                                                          percentages: { [fieldName]: newPercentage }
                                                        });
                                                      }}
                                                      className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer"
                                                    />
                                                  </div>
                                                  <span className="text-xs text-gray-600 min-w-[35px]">
                                                    {formatPercentage(percentage)}
                                                  </span>
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="p-1 h-6 w-6 text-gray-400 hover:text-blue-600"
                                                    onClick={() => {
                                                      const fieldName = role === 'ME' ? 'meManualPercent' : 
                                                                      role === 'EE' ? 'eeManualPercent' : 
                                                                      role === 'ITE' ? 'iteManualPercent' : 
                                                                      'ntcManualPercent';
                                                      
                                                      updateManualPercentageMutation.mutate({
                                                        projectId: project.id,
                                                        percentages: { [fieldName]: null }
                                                      });
                                                    }}
                                                    title="Revert to calculated percentage"
                                                  >
                                                    <RotateCcw className="h-3 w-3" />
                                                  </Button>
                                                </div>
                                              </td>
                                              <td className="p-2 text-sm text-center">
                                                {benchmarkCount}
                                              </td>
                                              <td className="p-2 text-sm">
                                                {project.completedTasks || 0} / {project.engineeringTasks || 0}
                                              </td>
                                              <td className="p-2">
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  onClick={() => {
                                                    setSelectedProject(project);
                                                    setShowProjectDialog(true);
                                                  }}
                                                >
                                                  <Wrench className="h-4 w-4" />
                                                </Button>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <div className="text-center text-muted-foreground py-4">
                                    No projects assigned to this engineer
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Resource Planning Tab */}
        <TabsContent value="resource-planning" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Resource Planning & Workload Monitoring</h2>
            <Button className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Engineer
            </Button>
          </div>

          {resourcesLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading resource data...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search engineers..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>

                  {/* Discipline Filter */}
                  <Select value={disciplineFilter} onValueChange={setDisciplineFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Discipline" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Disciplines</SelectItem>
                      <SelectItem value="ME">ME</SelectItem>
                      <SelectItem value="EE">EE</SelectItem>
                      <SelectItem value="ITE">ITE</SelectItem>
                      <SelectItem value="NTC">NTC</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Status Filter */}
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="at_capacity">At Capacity</SelectItem>
                      <SelectItem value="overloaded">Overloaded</SelectItem>
                      <SelectItem value="unavailable">Unavailable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* View Toggle */}
                <div className="flex border border-gray-300 dark:border-gray-600 rounded-lg">
                  <Button
                    variant={projectViewMode === 'project' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setProjectViewMode('project')}
                    className={`rounded-r-none ${
                      projectViewMode === 'project' 
                        ? 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700' 
                        : 'bg-white text-gray-900 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <BarChart3 className="h-4 w-4 mr-1" />
                    Grid View
                  </Button>
                  <Button
                    variant={projectViewMode === 'engineer' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setProjectViewMode('engineer')}
                    className={`rounded-l-none ${
                      projectViewMode === 'engineer' 
                        ? 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700' 
                        : 'bg-white text-gray-900 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Users className="h-4 w-4 mr-1" />
                    List View
                  </Button>
                </div>
              </div>

              {/* Grid View */}
              {projectViewMode === 'project' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {resources
                    .filter(resource => {
                      const matchesSearch = searchTerm === '' || 
                        `${resource.firstName} ${resource.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        resource.title.toLowerCase().includes(searchTerm.toLowerCase());
                      const matchesDiscipline = disciplineFilter === 'all' || resource.discipline === disciplineFilter;
                      const matchesStatus = statusFilter === 'all' || resource.workloadStatus === statusFilter;
                      return matchesSearch && matchesDiscipline && matchesStatus;
                    })
                    .map((resource) => (
                    <Card key={resource.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">
                            {resource.firstName} {resource.lastName}
                          </CardTitle>
                          <Badge className={getStatusColor(resource.workloadStatus)}>
                            {resource.workloadStatus.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {resource.discipline} • {resource.title}
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span>Current Capacity</span>
                            <span>{resource.currentCapacityPercent}%</span>
                          </div>
                          <Progress value={resource.currentCapacityPercent} className="h-2" />
                        </div>

                        {/* Project Assignments */}
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Project Assignments</div>
                          {getEngineerAssignments(resource.id).length > 0 ? (
                            <div className="space-y-2">
                              {getEngineerAssignments(resource.id).map((assignment) => {
                                const project = projectsWithEngineering.find(p => p.id === assignment.projectId);
                                return (
                                  <div key={assignment.id} className="bg-gray-50 dark:bg-gray-700 p-2 rounded text-xs">
                                    <div className="font-medium text-gray-900 dark:text-white">{project?.projectNumber}</div>
                                    <div className="text-gray-600 dark:text-gray-300 truncate">{project?.name}</div>
                                    <div className="flex items-center justify-between mt-1">
                                      <span className="text-gray-500 dark:text-gray-400">{assignment.discipline}</span>
                                      <div className="flex items-center gap-1">
                                        <Input
                                          type="number"
                                          min="0"
                                          max="100"
                                          value={assignment.percentage}
                                          onChange={(e) => handleAssignmentPercentageUpdate(assignment.id, parseInt(e.target.value) || 0)}
                                          className="w-16 h-6 text-xs"
                                          disabled={!canEditEngineering()}
                                        />
                                        <span className="text-xs text-gray-600 dark:text-gray-300">%</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-500">No project assignments</div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditEngineer(resource)}
                            disabled={!canEditEngineering()}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button variant="outline" size="sm">
                            View Tasks
                          </Button>
                          {isAdmin() && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDeleteEngineer(resource)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* List View */}
              {projectViewMode === 'engineer' && (
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="border-b bg-gray-50">
                          <tr>
                            <th className="text-left p-4 font-medium">Engineer</th>
                            <th className="text-left p-4 font-medium">Discipline</th>
                            <th className="text-left p-4 font-medium">Title</th>
                            <th className="text-left p-4 font-medium">Status</th>
                            <th className="text-left p-4 font-medium">Capacity</th>
                            <th className="text-left p-4 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {resources
                            .filter(resource => {
                              const matchesSearch = searchTerm === '' || 
                                `${resource.firstName} ${resource.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                resource.title.toLowerCase().includes(searchTerm.toLowerCase());
                              const matchesDiscipline = disciplineFilter === 'all' || resource.discipline === disciplineFilter;
                              const matchesStatus = statusFilter === 'all' || resource.workloadStatus === statusFilter;
                              return matchesSearch && matchesDiscipline && matchesStatus;
                            })
                            .map((resource, index) => (
                              <tr key={resource.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="p-4">
                                  <div className="font-medium">
                                    {resource.firstName} {resource.lastName}
                                  </div>
                                </td>
                                <td className="p-4">
                                  <Badge variant="outline">{resource.discipline}</Badge>
                                </td>
                                <td className="p-4 text-sm text-muted-foreground">
                                  {resource.title}
                                </td>
                                <td className="p-4">
                                  <Badge className={getStatusColor(resource.workloadStatus)}>
                                    {resource.workloadStatus.replace('_', ' ')}
                                  </Badge>
                                </td>
                                <td className="p-4">
                                  <div className="flex items-center gap-2">
                                    <div className="w-24">
                                      <Progress value={resource.currentCapacityPercent} className="h-2" />
                                    </div>
                                    <span className="text-sm">{resource.currentCapacityPercent}%</span>
                                  </div>
                                </td>
                                <td className="p-4">
                                  <div className="space-y-2">
                                    <div className="flex gap-2">
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => handleEditEngineer(resource)}
                                        disabled={!canEditEngineering()}
                                      >
                                        <Edit className="h-4 w-4 mr-1" />
                                        Edit
                                      </Button>
                                      <Button variant="outline" size="sm">
                                        View Tasks
                                      </Button>
                                      {isAdmin() && (
                                        <Button 
                                          variant="outline" 
                                          size="sm"
                                          onClick={() => handleDeleteEngineer(resource)}
                                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </div>

                                    {/* Project Assignments Dropdown */}
                                    {getEngineerAssignments(resource.id).length > 0 && (
                                      <details className="group">
                                        <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                                          <span className="group-open:rotate-90 transition-transform">▶</span>
                                          {getEngineerAssignments(resource.id).length} Project{getEngineerAssignments(resource.id).length !== 1 ? 's' : ''}
                                        </summary>
                                        <div className="mt-2 space-y-1 pl-4 border-l-2 border-gray-200">
                                          {getEngineerAssignments(resource.id).map((assignment) => {
                                            const project = projectsWithEngineering.find(p => p.id === assignment.projectId);
                                            return (
                                              <div key={assignment.id} className="bg-gray-50 p-2 rounded text-xs">
                                                <div className="font-medium">{project?.projectNumber}</div>
                                                <div className="text-gray-600 truncate">{project?.name}</div>
                                                <div className="flex items-center justify-between mt-1">
                                                  <Badge variant="outline" className="text-xs">{assignment.discipline}</Badge>
                                                  <div className="flex items-center gap-1">
                                                    <Input
                                                      type="number"
                                                      min="0"
                                                      max="100"
                                                      value={assignment.percentage}
                                                      onChange={(e) => handleAssignmentPercentageUpdate(assignment.id, parseInt(e.target.value) || 0)}
                                                      className="w-12 h-6 text-xs"
                                                    />
                                                    <span className="text-xs">%</span>
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </details>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* Benchmarks Overview Tab */}
        <TabsContent value="benchmarks-overview" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Engineering Benchmarks Overview</h2>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowManageTemplatesDialog(true)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Manage Templates
              </Button>

              <Button 
                className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700"
                onClick={() => setShowTemplateDialog(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Benchmark
              </Button>
            </div>
          </div>

          {/* Nested Tabs for Benchmarks and Templates */}
          <Tabs defaultValue="active-benchmarks" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="active-benchmarks">Active Benchmarks</TabsTrigger>
              <TabsTrigger value="benchmark-templates">Benchmark Templates</TabsTrigger>
            </TabsList>
            
            {/* Active Benchmarks Tab */}
            <TabsContent value="active-benchmarks" className="space-y-4">

          {/* Benchmark Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Benchmarks</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.benchmarkStats.totalBenchmarks || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{overview?.benchmarkStats.completed || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Clock className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{overview?.benchmarkStats.pending || 0}</div>
              </CardContent>
            </Card>
          </div>

          {benchmarksLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading benchmark data...</p>
              </div>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Engineering Commit Dates & Benchmarks</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Track engineering commitments and benchmark progress across disciplines
                </p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th 
                          className="text-left p-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                          onClick={() => handleSort('benchmark')}
                        >
                          <div className="flex items-center gap-1">
                            Benchmark
                            {sortField === 'benchmark' && (
                              <ChevronUp className={`h-3 w-3 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
                            )}
                          </div>
                        </th>
                        <th 
                          className="text-left p-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                          onClick={() => handleSort('project')}
                        >
                          <div className="flex items-center gap-1">
                            Project
                            {sortField === 'project' && (
                              <ChevronUp className={`h-3 w-3 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
                            )}
                          </div>
                        </th>
                        <th 
                          className="text-left p-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                          onClick={() => handleSort('discipline')}
                        >
                          <div className="flex items-center gap-1">
                            Discipline
                            {sortField === 'discipline' && (
                              <ChevronUp className={`h-3 w-3 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
                            )}
                          </div>
                        </th>
                        <th 
                          className="text-left p-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                          onClick={() => handleSort('targetDate')}
                        >
                          <div className="flex items-center gap-1">
                            Target Date
                            {sortField === 'targetDate' && (
                              <ChevronUp className={`h-3 w-3 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
                            )}
                          </div>
                        </th>
                        <th 
                          className="text-left p-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                          onClick={() => handleSort('progress')}
                        >
                          <div className="flex items-center gap-1">
                            Progress
                            {sortField === 'progress' && (
                              <ChevronUp className={`h-3 w-3 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
                            )}
                          </div>
                        </th>
                        <th className="text-left p-2">Status</th>
                        <th 
                          className="text-left p-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                          onClick={() => handleSort('commitment')}
                        >
                          <div className="flex items-center gap-1">
                            Commitment Level
                            {sortField === 'commitment' && (
                              <ChevronUp className={`h-3 w-3 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
                            )}
                          </div>
                        </th>
                        <th className="text-left p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedBenchmarks.map((benchmark) => (
                        <tr key={benchmark.id} className={`border-b hover:bg-gray-50 ${benchmark.isCompleted ? 'opacity-60' : ''}`}>
                          <td className="p-2">
                            <div>
                              <div className="font-medium">{benchmark.benchmarkName}</div>
                              {benchmark.description && (
                                <div className="text-sm text-muted-foreground">{benchmark.description}</div>
                              )}
                            </div>
                          </td>
                          <td className="p-2 text-sm">{benchmark.projectNumber || `Project #${benchmark.projectId}`}</td>
                          <td className="p-2">
                            <Badge variant="outline">{benchmark.discipline}</Badge>
                          </td>
                          <td className="p-2 text-sm">
                            {format(new Date(benchmark.targetDate), 'MMM dd, yyyy')}
                          </td>
                          <td className="p-2 min-w-[200px]">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-2 relative">
                                <div 
                                  className={`h-2 rounded-full transition-all duration-300 ${
                                    benchmark.isCompleted ? 'bg-green-500' : 'bg-blue-500'
                                  }`}
                                  style={{ width: `${benchmark.progressPercentage || 0}%` }}
                                />
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  value={benchmark.progressPercentage || 0}
                                  onChange={(e) => {
                                    const value = parseInt(e.target.value);
                                    updateBenchmarkProgressMutation.mutate({
                                      id: benchmark.id,
                                      progressPercentage: value,
                                      isCompleted: value === 100
                                    });
                                  }}
                                  className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer"
                                />
                              </div>
                              <span className="text-xs text-gray-600 min-w-[35px]">
                                {benchmark.progressPercentage || 0}%
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`p-1 h-6 w-6 ${
                                  benchmark.isCompleted 
                                    ? 'text-green-600 hover:text-green-700' 
                                    : 'text-gray-400 hover:text-green-600'
                                }`}
                                onClick={() => {
                                  updateBenchmarkProgressMutation.mutate({
                                    id: benchmark.id,
                                    progressPercentage: 100,
                                    isCompleted: !benchmark.isCompleted
                                  });
                                }}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                          <td className="p-2">
                            <Badge className={benchmark.isCompleted ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                              {benchmark.isCompleted ? 'Completed' : 'In Progress'}
                            </Badge>
                          </td>
                          <td className="p-2">
                            <Badge className={getPriorityColor(benchmark.commitmentLevel)}>
                              {benchmark.commitmentLevel}
                            </Badge>
                          </td>
                          <td className="p-2">
                            <div className="flex gap-1">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setSelectedBenchmark(benchmark);
                                  setShowBenchmarkEditDialog(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => deleteBenchmarkMutation.mutate(benchmark.id)}
                                disabled={deleteBenchmarkMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
            </TabsContent>
            
            {/* Benchmark Templates Tab */}
            <TabsContent value="benchmark-templates" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Benchmark Templates</h3>
                <Button 
                  className="bg-blue-600 text-white hover:bg-blue-700"
                  onClick={() => setShowTemplateDialog(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </div>

              {templatesLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-muted-foreground">Loading templates...</p>
                  </div>
                </div>
              ) : templates.length > 0 ? (
                <Card>
                  <CardContent className="p-6">
                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Template Name</th>
                            <th className="text-left p-2">Discipline</th>
                            <th className="text-left p-2">Relative To</th>
                            <th className="text-left p-2">Days Before</th>
                            <th className="text-left p-2">Commitment Level</th>
                            <th className="text-left p-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {templates.map((template) => (
                            <tr key={template.id} className="border-b hover:bg-gray-50">
                              <td className="p-2">
                                <div>
                                  <div className="font-medium">{template.name}</div>
                                  <div className="text-sm text-muted-foreground">{template.description}</div>
                                </div>
                              </td>
                              <td className="p-2">
                                <Badge variant="outline">{template.discipline}</Badge>
                              </td>
                              <td className="p-2 text-sm">
                                {template.referencePhase === 'fabrication_start' ? 'Fabrication Start' : 'Production Start'}
                              </td>
                              <td className="p-2 text-sm">{template.daysBefore} days before</td>
                              <td className="p-2">
                                <Badge className={getPriorityColor(template.commitmentLevel)}>
                                  {template.commitmentLevel}
                                </Badge>
                              </td>
                              <td className="p-2">
                                <div className="flex gap-1">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      setSelectedTemplate(template);
                                      setShowApplyTemplateDialog(true);
                                    }}
                                  >
                                    <Play className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      setSelectedTemplate(template);
                                      setShowTemplateDialog(true);
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => deleteTemplateMutation.mutate(template.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center py-8">
                      <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Benchmark Templates</h3>
                      <p className="text-gray-500 mb-4">
                        Create reusable benchmark templates that can be applied to projects based on FAB and Production start dates.
                      </p>
                      <Button 
                        className="bg-blue-600 text-white hover:bg-blue-700"
                        onClick={() => setShowTemplateDialog(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Your First Template
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
      </div>

      {/* Project Engineering Dialog */}
      <Dialog open={showProjectDialog} onOpenChange={setShowProjectDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Engineering Management - {selectedProject?.name}
            </DialogTitle>
          </DialogHeader>

          {selectedProject && (
            <div className="space-y-6">
              {/* Project Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Project Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Project Name</Label>
                      <p className="text-sm">{selectedProject.name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Project Number</Label>
                      <p className="text-sm">{selectedProject.projectNumber}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Status</Label>
                      <Badge className={getStatusColor(selectedProject.status)}>
                        {selectedProject.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Engineering Assignments */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Engineering Assignments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {['ME', 'EE', 'ITE', 'NTC'].map((discipline) => (
                      <div key={discipline} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">{discipline} Engineering</h4>
                          <Badge variant="outline">{discipline}</Badge>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label className="text-sm">Assigned Engineers</Label>
                            <p className="text-sm text-muted-foreground">
                              {getAssignedEngineers(selectedProject.id, discipline as 'ME' | 'EE' | 'ITE' | 'NTC') || 'None assigned'}
                            </p>
                          </div>

                          <div>
                            <Label className="text-sm">Current Percentage</Label>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Input
                                  type="range"
                                  min="0"
                                  max="100"
                                  value={
                                    discipline === 'ME' ? (selectedProject.meManualPercent ?? getDisciplinePercentage(selectedProject.id, 'ME')) :
                                    discipline === 'EE' ? (selectedProject.eeManualPercent ?? getDisciplinePercentage(selectedProject.id, 'EE')) :
                                    discipline === 'ITE' ? (selectedProject.iteManualPercent ?? getDisciplinePercentage(selectedProject.id, 'ITE')) :
                                    discipline === 'NTC' ? (selectedProject.ntcManualPercent ?? getDisciplinePercentage(selectedProject.id, 'NTC')) : 0
                                  }
                                  onChange={(e) => handleManualPercentageUpdate(
                                    selectedProject.id, 
                                    discipline.toLowerCase() as 'me' | 'ee' | 'ite' | 'ntc', 
                                    parseInt(e.target.value) || 0
                                  )}
                                  className="flex-1"
                                  disabled={updateProjectAssignmentMutation.isPending}
                                />
                                <span className="text-sm w-12 text-right">
                                  {discipline === 'ME' ? (selectedProject.meManualPercent ?? getDisciplinePercentage(selectedProject.id, 'ME')) :
                                   discipline === 'EE' ? (selectedProject.eeManualPercent ?? getDisciplinePercentage(selectedProject.id, 'EE')) :
                                   discipline === 'ITE' ? (selectedProject.iteManualPercent ?? getDisciplinePercentage(selectedProject.id, 'ITE')) :
                                   discipline === 'NTC' ? (selectedProject.ntcManualPercent ?? getDisciplinePercentage(selectedProject.id, 'NTC')) : 0}%
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {((discipline === 'ME' && selectedProject.meManualPercent !== null) ||
                                  (discipline === 'EE' && selectedProject.eeManualPercent !== null) ||
                                  (discipline === 'ITE' && selectedProject.iteManualPercent !== null) ||
                                  (discipline === 'NTC' && selectedProject.ntcManualPercent !== null)) && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRevertToCalculated(
                                      selectedProject.id,
                                      discipline.toLowerCase() as 'me' | 'ee' | 'ite' | 'ntc'
                                    )}
                                    disabled={updateProjectAssignmentMutation.isPending}
                                  >
                                    <RotateCcw className="h-3 w-3 mr-1" />
                                    Revert to Auto
                                  </Button>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {(discipline === 'ME' && selectedProject.meManualPercent !== null) ||
                                   (discipline === 'EE' && selectedProject.eeManualPercent !== null) ||
                                   (discipline === 'ITE' && selectedProject.iteManualPercent !== null) ||
                                   (discipline === 'NTC' && selectedProject.ntcManualPercent !== null) 
                                    ? 'Manual override'
                                    : 'Auto calculated'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <Label className="text-sm">Assign Engineer</Label>
                            <Select onValueChange={(value) => handleEngineerAssignment(
                              selectedProject.id,
                              discipline as 'ME' | 'EE' | 'ITE' | 'NTC',
                              value
                            )}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select engineer" />
                              </SelectTrigger>
                              <SelectContent>
                                {resources
                                  .filter(resource => resource.discipline === discipline)
                                  .map(resource => (
                                    <SelectItem key={resource.id} value={resource.id}>
                                      {resource.firstName} {resource.lastName} - {resource.title}
                                    </SelectItem>
                                  ))
                                }
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Current Assignments Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Current Project Assignments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Engineer</th>
                          <th className="text-left p-2">Discipline</th>
                          <th className="text-left p-2">Percentage</th>
                          <th className="text-left p-2">Lead</th>
                          <th className="text-left p-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getProjectAssignments(selectedProject.id).map((assignment) => {
                          const engineer = resources.find(eng => eng.id === assignment.resourceId);
                          return (
                            <tr key={assignment.id} className="border-b">
                              <td className="p-2">
                                {engineer ? `${engineer.firstName} ${engineer.lastName}` : 'Unknown'}
                              </td>
                              <td className="p-2">
                                <Badge variant="outline">{assignment.discipline}</Badge>
                              </td>
                              <td className="p-2">{assignment.percentage}%</td>
                              <td className="p-2">
                                {assignment.isLead ? (
                                  <Badge className="bg-blue-100 text-blue-800">Lead</Badge>
                                ) : (
                                  <span className="text-muted-foreground">Member</span>
                                )}
                              </td>
                              <td className="p-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => deleteAssignmentMutation.mutate(assignment.id)}
                                  disabled={deleteAssignmentMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProjectDialog(false)}>
              Close
            </Button>
            <Button onClick={() => setShowProjectDialog(false)}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Engineer Edit Dialog */}
      <Dialog open={showEngineerEditDialog} onOpenChange={setShowEngineerEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Edit Engineer - {editingEngineer?.firstName} {editingEngineer?.lastName}
            </DialogTitle>
          </DialogHeader>

          {editingEngineer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    defaultValue={editingEngineer.firstName}
                    onChange={(e) => setEditingEngineer({...editingEngineer, firstName: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    defaultValue={editingEngineer.lastName}
                    onChange={(e) => setEditingEngineer({...editingEngineer, lastName: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="discipline">Discipline</Label>
                  <Select 
                    value={editingEngineer.discipline} 
                    onValueChange={(value: 'ME' | 'EE' | 'ITE' | 'NTC') => 
                      setEditingEngineer({...editingEngineer, discipline: value})
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ME">ME</SelectItem>
                      <SelectItem value="EE">EE</SelectItem>
                      <SelectItem value="ITE">ITE</SelectItem>
                      <SelectItem value="NTC">NTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    defaultValue={editingEngineer.title}
                    onChange={(e) => setEditingEngineer({...editingEngineer, title: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="workloadStatus">Workload Status</Label>
                  <Select 
                    value={editingEngineer.workloadStatus} 
                    onValueChange={(value: 'available' | 'at_capacity' | 'overloaded' | 'unavailable') => 
                      setEditingEngineer({...editingEngineer, workloadStatus: value})
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="at_capacity">At Capacity</SelectItem>
                      <SelectItem value="overloaded">Overloaded</SelectItem>
                      <SelectItem value="unavailable">Unavailable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="currentCapacityPercent">Current Capacity (%)</Label>
                  <Input
                    id="currentCapacityPercent"
                    type="number"
                    min="0"
                    max="200"
                    defaultValue={editingEngineer.currentCapacityPercent}
                    onChange={(e) => setEditingEngineer({
                      ...editingEngineer, 
                      currentCapacityPercent: parseInt(e.target.value) || 0
                    })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="projectAssignment">Assign to Project</Label>
                <Select onValueChange={(value) => {
                  console.log('🔍 DEBUG: DROPDOWN SELECTION - User selected project ID:', value);
                  console.log('🔍 DEBUG: DROPDOWN SELECTION - Setting selectedProjectId state to:', value);
                  setSelectedProjectId(value);
                  console.log('🔍 DEBUG: DROPDOWN SELECTION - State updated, selectedProjectId should now be:', value);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project to assign" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.projectNumber} - {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedProjectId && (
                  <p className="text-sm text-green-600 mt-1">
                    Selected project: {projects.find(p => p.id.toString() === selectedProjectId)?.projectNumber} (will be assigned when you click Save)
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={editingEngineer.isActive}
                  onChange={(e) => setEditingEngineer({...editingEngineer, isActive: e.target.checked})}
                  className="rounded"
                />
                <Label htmlFor="isActive">Active Engineer</Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowEngineerEditDialog(false);
                setEditingEngineer(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => handleEngineerSubmit(editingEngineer)}
              disabled={updateEngineerMutation.isPending}
            >
              {updateEngineerMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Creation/Edit Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? 'Edit Template' : 'Create Benchmark Template'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  placeholder="e.g., Section X CAD Complete"
                  defaultValue={selectedTemplate?.name || ''}
                />
              </div>
              <div>
                <Label htmlFor="template-discipline">Discipline</Label>
                <Select defaultValue={selectedTemplate?.discipline || 'ME'}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select discipline" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ME">ME</SelectItem>
                    <SelectItem value="EE">EE</SelectItem>
                    <SelectItem value="ITE">ITE</SelectItem>
                    <SelectItem value="NTC">NTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="template-description">Description</Label>
              <Textarea
                id="template-description"
                placeholder="Template description (use {{project_name}} for dynamic project name)"
                defaultValue={selectedTemplate?.description || ''}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="template-reference-phase">Reference Phase</Label>
                <Select defaultValue={selectedTemplate?.referencePhase || 'fabrication_start'}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select base date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fabrication_start">Fabrication Start</SelectItem>
                    <SelectItem value="production_start">Production Start</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="template-days-before">Days Before</Label>
                <Input
                  id="template-days-before"
                  type="number"
                  placeholder="e.g., 30"
                  defaultValue={selectedTemplate?.daysBefore || ''}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="template-commitment">Commitment Level</Label>
              <Select defaultValue={selectedTemplate?.commitmentLevel || 'high'}>
                <SelectTrigger>
                  <SelectValue placeholder="Select commitment level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowTemplateDialog(false);
              setSelectedTemplate(null);
            }}>
              Cancel
            </Button>
            <Button onClick={() => {
              // Template save logic will be added
              setShowTemplateDialog(false);
              setSelectedTemplate(null);
            }}>
              {selectedTemplate ? 'Update Template' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Apply Template Dialog */}
      <Dialog open={showApplyTemplateDialog} onOpenChange={setShowApplyTemplateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Apply Template: {selectedTemplate?.name}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Template Details</h4>
              <p className="text-sm text-gray-600 mb-1">
                <strong>Discipline:</strong> {selectedTemplate?.discipline}
              </p>
              <p className="text-sm text-gray-600 mb-1">
                <strong>Reference Phase:</strong> {selectedTemplate?.referencePhase === 'fabrication_start' ? 'Fabrication Start' : 'Production Start'}
              </p>
              <p className="text-sm text-gray-600 mb-1">
                <strong>Days Before:</strong> {selectedTemplate?.daysBefore} days
              </p>
              <p className="text-sm text-gray-600">
                <strong>Commitment Level:</strong> {selectedTemplate?.commitmentLevel}
              </p>
            </div>
            
            <div>
              <Label className="text-base font-medium">Apply to Projects</Label>
              <div className="mt-2 space-y-2">
                <label className="flex items-center space-x-2">
                  <input type="radio" name="apply-scope" value="all" defaultChecked />
                  <span>Apply to all projects</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="radio" name="apply-scope" value="specific" />
                  <span>Apply to specific projects</span>
                </label>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowApplyTemplateDialog(false);
              setSelectedTemplate(null);
            }}>
              Cancel
            </Button>
            <Button onClick={() => {
              if (selectedTemplate) {
                applyTemplateMutation.mutate({
                  templateId: selectedTemplate.id,
                  applyToAll: true
                });
              }
              setShowApplyTemplateDialog(false);
              setSelectedTemplate(null);
            }}>
              Apply Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Benchmark Edit Dialog */}
      <Dialog open={showBenchmarkEditDialog} onOpenChange={setShowBenchmarkEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Benchmark</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="benchmark-name">Benchmark Name</Label>
                <Input
                  id="benchmark-name"
                  defaultValue={selectedBenchmark?.benchmarkName || ''}
                />
              </div>
              <div>
                <Label htmlFor="benchmark-discipline">Discipline</Label>
                <Select defaultValue={selectedBenchmark?.discipline || 'ME'}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select discipline" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ME">ME</SelectItem>
                    <SelectItem value="EE">EE</SelectItem>
                    <SelectItem value="ITE">ITE</SelectItem>
                    <SelectItem value="NTC">NTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="benchmark-description">Description</Label>
              <Textarea
                id="benchmark-description"
                defaultValue={selectedBenchmark?.description || ''}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="benchmark-target-date">Target Date</Label>
                <Input
                  id="benchmark-target-date"
                  type="date"
                  defaultValue={selectedBenchmark?.targetDate || ''}
                />
              </div>
              <div>
                <Label htmlFor="benchmark-commitment">Commitment Level</Label>
                <Select defaultValue={selectedBenchmark?.commitmentLevel || 'medium'}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select commitment level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="benchmark-progress">Progress ({selectedBenchmark?.progressPercentage || 0}%)</Label>
              <div className="mt-2 flex items-center gap-4">
                <div className="flex-1">
                  <input
                    id="benchmark-progress"
                    type="range"
                    min="0"
                    max="100"
                    defaultValue={selectedBenchmark?.progressPercentage || 0}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div className="w-16">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    defaultValue={selectedBenchmark?.progressPercentage || 0}
                    className="text-center"
                  />
                </div>
              </div>
            </div>
            
            <div>
              <Label htmlFor="benchmark-notes">Notes</Label>
              <Textarea
                id="benchmark-notes"
                defaultValue={selectedBenchmark?.notes || ''}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowBenchmarkEditDialog(false);
              setSelectedBenchmark(null);
            }}>
              Cancel
            </Button>
            <Button onClick={() => {
              if (selectedBenchmark) {
                const nameInput = document.querySelector('#benchmark-name') as HTMLInputElement;
                const descInput = document.querySelector('#benchmark-description') as HTMLTextAreaElement;
                const targetDateInput = document.querySelector('#benchmark-target-date') as HTMLInputElement;
                const notesInput = document.querySelector('#benchmark-notes') as HTMLTextAreaElement;
                const progressInput = document.querySelector('#benchmark-progress') as HTMLInputElement;
                const disciplineSelect = document.querySelector('[id^="radix-"][id*="discipline"]') as HTMLSelectElement;
                const commitmentSelect = document.querySelector('[id^="radix-"][id*="commitment"]') as HTMLSelectElement;
                
                updateBenchmarkMutation.mutate({
                  id: selectedBenchmark.id,
                  benchmark: {
                    benchmarkName: nameInput?.value || selectedBenchmark.benchmarkName,
                    description: descInput?.value || null,
                    targetDate: targetDateInput?.value || selectedBenchmark.targetDate,
                    notes: notesInput?.value || null,
                    progressPercentage: parseInt(progressInput?.value || '0'),
                    discipline: selectedBenchmark.discipline,
                    commitmentLevel: selectedBenchmark.commitmentLevel
                  }
                });
              }
              setShowBenchmarkEditDialog(false);
              setSelectedBenchmark(null);
            }}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}