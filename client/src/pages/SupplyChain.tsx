import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, addWeeks, subWeeks, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, addMonths, isBefore, isAfter, isSameDay } from 'date-fns';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Check, X, Edit, Trash, PlusCircle, Settings, AlertCircle, Calendar, LayoutGrid, List, Clock, ListFilter, Search, CheckCircle } from 'lucide-react';

interface SupplyChainBenchmark {
  id: number;
  name: string;
  description: string | null;
  department: string;
  weeksBeforePhase: number;
  targetPhase: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProjectSupplyChainBenchmark {
  id: number;
  projectId: number;
  benchmarkId: number;
  name: string;
  description: string | null;
  targetDate: string | null;
  isCompleted: boolean;
  completedDate: string | null;
  completedBy: string | null;
  weeksBeforePhase: number;
  targetPhase: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  project?: Project;
  benchmark?: SupplyChainBenchmark;
}

interface Project {
  id: number;
  name: string;
  projectNumber: string;
  status: string;
  startDate: string;
  estimatedCompletionDate: string;
  fabricationStart: string | null;
  assemblyStart: string | null;
  ntcTestingDate: string | null;
  qcStartDate: string | null;
  shipDate: string | null;
}

// Form schemas
const benchmarkFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
  department: z.string().min(1, "Department is required"),
  weeksBeforePhase: z.coerce.number().min(1, "Must be at least 1 week"),
  targetPhase: z.string().min(1, "Target phase is required"),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true)
});

const projectBenchmarkFormSchema = z.object({
  projectId: z.coerce.number().min(1, "Project is required"),
  benchmarkId: z.coerce.number().min(1, "Benchmark is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
  targetDate: z.string().optional().nullable(),
  isCompleted: z.boolean().default(false),
  completedDate: z.string().optional().nullable(),
  weeksBeforePhase: z.coerce.number().min(1, "Must be at least 1 week"),
  targetPhase: z.string().min(1, "Target phase is required"),
  notes: z.string().optional().nullable()
});

const SupplyChain = () => {
  const [activeTab, setActiveTab] = useState('project-benchmarks');
  const [openBenchmarkDialog, setOpenBenchmarkDialog] = useState(false);
  const [editingBenchmark, setEditingBenchmark] = useState<SupplyChainBenchmark | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [purchaseTimeframe, setPurchaseTimeframe] = useState<'week' | 'month' | 'quarter' | '6months' | '12months'>('week');
  const [projectDetailsOpen, setProjectDetailsOpen] = useState(false);
  const [selectedProjectDetails, setSelectedProjectDetails] = useState<Project | null>(null);
  const [pendingBenchmarkProjectId, setPendingBenchmarkProjectId] = useState<number | null>(null);
  const [templateBenchmarkDialogOpen, setTemplateBenchmarkDialogOpen] = useState(false);
  const [selectedBenchmarkTemplate, setSelectedBenchmarkTemplate] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [benchmarkFilter, setBenchmarkFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  // Settings state
  const [updateOption, setUpdateOption] = useState<'all' | 'selected' | 'new'>('new');
  const [selectedProjectsForUpdate, setSelectedProjectsForUpdate] = useState<number[]>([]);
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [isSavingBenchmarkSettings, setIsSavingBenchmarkSettings] = useState(false);

  // Query for all benchmarks
  const { data: benchmarks, isLoading: loadingBenchmarks } = useQuery({
    queryKey: ['/api/supply-chain-benchmarks'],
    select: (data) => data as SupplyChainBenchmark[]
  });

  // Query for active projects
  const { data: projects, isLoading: loadingProjects } = useQuery({
    queryKey: ['/api/projects'],
    select: (data) => (data as Project[])
  });

  // Query for project benchmarks
  const { data: projectBenchmarks, isLoading: loadingProjectBenchmarks } = useQuery({
    queryKey: ['/api/project-supply-chain-benchmarks'],
    select: (data) => data as ProjectSupplyChainBenchmark[]
  });

  // Mutations
  const createBenchmarkMutation = useMutation({
    mutationFn: (data: z.infer<typeof benchmarkFormSchema>) => 
      apiRequest('POST', '/api/supply-chain-benchmarks', data),
    onSuccess: async (response, data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/supply-chain-benchmarks'] });

      // Check if there's a pending project ID to add this benchmark to
      if (pendingBenchmarkProjectId) {
        console.log("Adding benchmark to project:", pendingBenchmarkProjectId);

        // Get the newly created benchmark ID from the response
        const newBenchmarkId = response?.id;

        if (newBenchmarkId) {
          // Create data for the project benchmark
          const projectBenchmarkData = {
            projectId: pendingBenchmarkProjectId,
            benchmarkId: newBenchmarkId,
            name: data.name,
            description: data.description,
            weeksBeforePhase: data.weeksBeforePhase,
            targetPhase: data.targetPhase,
            isCompleted: false
          };

          // Add this benchmark to the project
          try {
            await apiRequest('POST', '/api/project-supply-chain-benchmarks', projectBenchmarkData);

            // Invalidate project benchmarks query to refresh the list
            queryClient.invalidateQueries({ queryKey: ['/api/project-supply-chain-benchmarks'] });

            toast({
              title: "Benchmark added to project",
              description: "The new benchmark has been added to the project successfully."
            });
          } catch (error) {
            toast({
              title: "Error adding to project",
              description: "The benchmark was created but couldn't be added to the project.",
              variant: "destructive"
            });
          }

          // Clear the pending project ID
          setPendingBenchmarkProjectId(null);
        }
      } else {
        toast({
          title: "Benchmark created",
          description: "The supply chain benchmark has been created successfully."
        });
      }

      setOpenBenchmarkDialog(false);
    },
    onError: (error) => {
      // Clear the pending project ID to prevent issues on retry
      setPendingBenchmarkProjectId(null);

      toast({
        title: "Error creating benchmark",
        description: "There was an error creating the benchmark. Please try again.",
        variant: "destructive"
      });
    }
  });

  const updateBenchmarkMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: z.infer<typeof benchmarkFormSchema> }) => 
      apiRequest('PATCH', `/api/supply-chain-benchmarks/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/supply-chain-benchmarks'] });
      toast({
        title: "Benchmark updated",
        description: "The supply chain benchmark has been updated successfully."
      });
      setOpenBenchmarkDialog(false);
      setEditingBenchmark(null);
    },
    onError: (error) => {
      toast({
        title: "Error updating benchmark",
        description: "There was an error updating the benchmark. Please try again.",
        variant: "destructive"
      });
    }
  });

  const deleteBenchmarkMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest('DELETE', `/api/supply-chain-benchmarks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/supply-chain-benchmarks'] });
      toast({
        title: "Benchmark deleted",
        description: "The supply chain benchmark has been deleted successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting benchmark",
        description: "There was an error deleting the benchmark. Please try again.",
        variant: "destructive"
      });
    }
  });

  const updateProjectBenchmarkMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: Partial<z.infer<typeof projectBenchmarkFormSchema>> }) => 
      apiRequest('PATCH', `/api/project-supply-chain-benchmarks/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/project-supply-chain-benchmarks'] });
      toast({
        title: "Project benchmark updated",
        description: "The project benchmark has been updated successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating project benchmark",
        description: "There was an error updating the project benchmark. Please try again.",
        variant: "destructive"
      });
    }
  });

  const addDefaultBenchmarksMutation = useMutation({
    mutationFn: (projectId: number) => 
      apiRequest('POST', `/api/project-supply-chain-benchmarks/add-defaults/${projectId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/project-supply-chain-benchmarks'] });
      toast({
        title: "Default benchmarks added",
        description: "Default supply chain benchmarks have been added to the project."
      });
    },
    onError: (error) => {
      toast({
        title: "Error adding default benchmarks",
        description: "There was an error adding default benchmarks to the project. Please try again.",
        variant: "destructive"
      });
    }
  });

  const addTemplateBenchmarkMutation = useMutation({
    mutationFn: ({ projectId, benchmarkId }: { projectId: number, benchmarkId: number }) => {
      // Find the benchmark template to get its details
      const benchmark = benchmarks?.find(b => b.id === benchmarkId);

      if (!benchmark) {
        throw new Error("Benchmark template not found");
      }

      // Create the project benchmark data
      const projectBenchmarkData = {
        projectId: projectId,
        benchmarkId: benchmarkId,
        name: benchmark.name,
        description: benchmark.description,
        weeksBeforePhase: benchmark.weeksBeforePhase,
        targetPhase: benchmark.targetPhase,
        isCompleted: false
      };

      // Add this benchmark to the project
      return apiRequest('POST', '/api/project-supply-chain-benchmarks', projectBenchmarkData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/project-supply-chain-benchmarks'] });
      toast({
        title: "Benchmark added",
        description: "The selected benchmark template has been added to the project."
      });
      setTemplateBenchmarkDialogOpen(false);
      setSelectedBenchmarkTemplate(null);
    },
    onError: (error) => {
      toast({
        title: "Error adding benchmark",
        description: "There was an error adding the benchmark to the project. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Update benchmark settings mutation
  const updateBenchmarkSettingsMutation = useMutation({
    mutationFn: async (data: { benchmarkId: number; weeksBeforePhase: number; updateOption: string; selectedProjectIds?: number[] }) => {
      const response = await fetch('/api/benchmarks/update-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update benchmark settings');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/supply-chain-benchmarks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/project-supply-chain-benchmarks'] });
      setEditingBenchmark(null);
      setSelectedProjectsForUpdate([]);
      setShowProjectSelector(false);
      setIsSavingBenchmarkSettings(false);
      toast({
        title: "Settings Updated",
        description: "Benchmark settings have been updated successfully.",
      });
    },
    onError: (error: any) => {
      setIsSavingBenchmarkSettings(false);
      toast({
        title: "Error",
        description: error.message || "Failed to update benchmark settings.",
        variant: "destructive"
      });
    }
  });

  const handlePermanentDeleteProject = (projectId: number) => {
  };

  // Complete all benchmarks for a project
  const completeAllBenchmarksMutation = useMutation({
    mutationFn: async (projectId: number) => {
      if (!projectBenchmarks) return;
      
      const projectBenchmarksToComplete = projectBenchmarks.filter(
        pb => pb.projectId === projectId && !pb.isCompleted
      );
      
      // Update all incomplete benchmarks for this project
      const updates = projectBenchmarksToComplete.map(benchmark => 
        apiRequest('PATCH', `/api/project-supply-chain-benchmarks/${benchmark.id}`, {
          isCompleted: true,
          completedDate: new Date().toISOString(),
          completedBy: getCurrentUser()
        })
      );
      
      return Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/project-supply-chain-benchmarks'] });
      toast({
        title: "All benchmarks completed",
        description: "All benchmarks for this project have been marked as complete."
      });
    },
    onError: (error) => {
      toast({
        title: "Error completing benchmarks",
        description: "There was an error completing the benchmarks. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Form instances
  const benchmarkForm = useForm<z.infer<typeof benchmarkFormSchema>>({
    resolver: zodResolver(benchmarkFormSchema),
    defaultValues: {
      name: "",
      description: "",
      weeksBeforePhase: 1,
      targetPhase: "",
      isDefault: false,
      isActive: true
    }
  });

  const projectBenchmarkForm = useForm<z.infer<typeof projectBenchmarkFormSchema>>({
    resolver: zodResolver(projectBenchmarkFormSchema),
    defaultValues: {
      projectId: 0,
      benchmarkId: 0,
      name: "",
      description: "",
      targetDate: "",
      isCompleted: false,
      completedDate: "",
      weeksBeforePhase: 1,
      targetPhase: "",
      notes: ""
    }
  });

  // Handle new benchmark creation
  const handleNewBenchmark = (projectId?: number) => {
    benchmarkForm.reset();
    setEditingBenchmark(null);
    
    // If a project ID is provided, set it as pending to add to this project after creation
    if (projectId) {
      setPendingBenchmarkProjectId(projectId);
    }
    
    setOpenBenchmarkDialog(true);
  };

  // Handle edit benchmark
  const handleEditBenchmark = (benchmark: SupplyChainBenchmark) => {
    setEditingBenchmark(benchmark);
    benchmarkForm.reset({
      name: benchmark.name,
      description: benchmark.description,
      weeksBeforePhase: benchmark.weeksBeforePhase,
      targetPhase: benchmark.targetPhase,
      isDefault: benchmark.isDefault,
      isActive: benchmark.isActive
    });
    setOpenBenchmarkDialog(true);
  };

  // Handle form submission
  const onBenchmarkSubmit = (data: z.infer<typeof benchmarkFormSchema>) => {
    if (editingBenchmark) {
      updateBenchmarkMutation.mutate({ id: editingBenchmark.id, data });
    } else {
      createBenchmarkMutation.mutate(data);
    }
  };

  // State for tracking benchmark updates
  const [updatingBenchmarkId, setUpdatingBenchmarkId] = useState<number | null>(null);

  // Toggle benchmark completion
  const toggleBenchmarkCompletion = async (benchmark: ProjectSupplyChainBenchmark) => {
    setUpdatingBenchmarkId(benchmark.id);
    
    try {
      const updateData = {
        isCompleted: !benchmark.isCompleted,
        completedDate: !benchmark.isCompleted ? new Date().toISOString() : null,
        completedBy: !benchmark.isCompleted ? getCurrentUser() : null
      };

      await updateProjectBenchmarkMutation.mutateAsync({ id: benchmark.id, data: updateData });
    } catch (error) {
      console.error("Error toggling benchmark completion:", error);
      toast({
        title: "Error",
        description: "Failed to update benchmark status. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUpdatingBenchmarkId(null);
    }
  };

  // Get current user from the user query
  const { data: currentUser } = useQuery({
    queryKey: ['/api/user'],
    select: (data) => data as { id: string; email: string; firstName?: string; lastName?: string; role: string; }
  });

  // Get current user function
  const getCurrentUser = () => {
    if (currentUser?.firstName && currentUser?.lastName) {
      return `${currentUser.firstName} ${currentUser.lastName}`;
    }
    return currentUser?.email || 'Unknown User';
  };

  // Handle opening project details
  const handleOpenProjectDetails = (project: Project) => {
    setSelectedProjectDetails(project);
    setProjectDetailsOpen(true);
  };

  // Calculate target date for a benchmark
  const calculateTargetDate = (project: Project, benchmark: ProjectSupplyChainBenchmark) => {
    if (benchmark.targetDate) {
      return format(parseISO(benchmark.targetDate), 'MMM d, yyyy');
    }
    
    // Calculate based on project phases and weeks before phase
    let phaseDate: Date | null = null;
    
    switch (benchmark.targetPhase) {
      case 'FABRICATION':
        phaseDate = project.fabricationStart ? new Date(project.fabricationStart) : null;
        break;
      case 'NTC':
        phaseDate = project.ntcTestingDate ? new Date(project.ntcTestingDate) : null;
        break;
      case 'QC':
        phaseDate = project.qcStartDate ? new Date(project.qcStartDate) : null;
        break;
      case 'SHIP':
        phaseDate = project.shipDate ? new Date(project.shipDate) : null;
        break;
      default:
        phaseDate = new Date(project.estimatedCompletionDate);
        break;
    }
    
    if (!phaseDate) return 'TBD';
    
    const targetDate = new Date(phaseDate);
    targetDate.setDate(targetDate.getDate() - (benchmark.weeksBeforePhase * 7));
    
    return format(targetDate, 'MMM d, yyyy');
  };

  // Calculate benchmark due date and overdue status
  const getBenchmarkDueInfo = (project: Project, benchmark: ProjectSupplyChainBenchmark) => {
    const now = new Date();
    let dueDate: Date | null = null;
    
    if (benchmark.targetDate) {
      dueDate = new Date(benchmark.targetDate);
    } else {
      // Calculate based on project phases and weeks before phase
      let phaseDate: Date | null = null;
      
      switch (benchmark.targetPhase) {
        case 'FABRICATION':
          phaseDate = project.fabricationStart ? new Date(project.fabricationStart) : null;
          break;
        case 'NTC':
          phaseDate = project.ntcTestingDate ? new Date(project.ntcTestingDate) : null;
          break;
        case 'QC':
          phaseDate = project.qcStartDate ? new Date(project.qcStartDate) : null;
          break;
        case 'SHIP':
          phaseDate = project.shipDate ? new Date(project.shipDate) : null;
          break;
        default:
          phaseDate = new Date(project.estimatedCompletionDate);
          break;
      }
      
      if (phaseDate) {
        dueDate = new Date(phaseDate);
        dueDate.setDate(dueDate.getDate() - (benchmark.weeksBeforePhase * 7));
      }
    }
    
    if (!dueDate) {
      return {
        dueDateText: 'TBD',
        isOverdue: false,
        daysLate: 0,
        dueDate: null
      };
    }
    
    const isOverdue = !benchmark.isCompleted && now > dueDate;
    const daysLate = isOverdue ? Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
    
    return {
      dueDateText: format(dueDate, 'MMM d, yyyy'),
      isOverdue,
      daysLate,
      dueDate
    };
  };

  // Get benchmark status
  const getBenchmarkStatus = (benchmark: ProjectSupplyChainBenchmark) => {
    if (benchmark.isCompleted) {
      return { label: 'Completed', color: 'bg-green-500 text-white' };
    }
    
    if (benchmark.targetDate && new Date(benchmark.targetDate) < new Date()) {
      return { label: 'Overdue', color: 'bg-red-500 text-white' };
    }
    
    return { label: 'Pending', color: 'bg-yellow-500 text-white' };
  };

  // Get filtered project benchmarks
  const filteredProjectBenchmarks = projectBenchmarks || [];

  // Get active projects sorted by ship date
  const activeProjects = React.useMemo(() => {
    if (!projects) return [];
    
    return projects
      .filter(p => 
        p.status !== 'DELIVERED' && 
        p.status !== 'CANCELLED' && 
        p.status !== 'delivered' &&
        p.status !== 'archived'
      )
      .sort((a, b) => {
        // Get benchmark completion status for both projects
        const aBenchmarks = filteredProjectBenchmarks?.filter(pb => pb.projectId === a.id) || [];
        const bBenchmarks = filteredProjectBenchmarks?.filter(pb => pb.projectId === b.id) || [];
        
        const aAllComplete = aBenchmarks.length > 0 && aBenchmarks.every(benchmark => benchmark.isCompleted);
        const bAllComplete = bBenchmarks.length > 0 && bBenchmarks.every(benchmark => benchmark.isCompleted);
        
        // Projects with all benchmarks complete go to the bottom
        if (aAllComplete && !bAllComplete) return 1;
        if (!aAllComplete && bAllComplete) return -1;
        
        // If both have same completion status, sort by ship date
        const dateA = a.shipDate ? new Date(a.shipDate) : null;
        const dateB = b.shipDate ? new Date(b.shipDate) : null;
        
        if (dateA && dateB) {
          return dateA.getTime() - dateB.getTime();
        }
        
        // Projects with ship dates come before those without
        if (dateA && !dateB) return -1;
        if (!dateA && dateB) return 1;
        
        // For projects without ship dates, sort by project number (most recent first)
        const numA = parseInt(a.projectNumber.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.projectNumber.replace(/\D/g, '')) || 0;
        return numB - numA;
      });
  }, [projects, filteredProjectBenchmarks]);

  // Filter projects based on search query and filters
  const getFilteredProjects = () => {
    let filtered = activeProjects;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(project => 
        project.projectNumber.toLowerCase().includes(query) ||
        project.name.toLowerCase().includes(query)
      );
    }

    // Project selection filter
    if (selectedProjectId) {
      filtered = filtered.filter(p => p.id === selectedProjectId);
    }

    // Status filter (based on benchmark completion)
    if (statusFilter !== 'all') {
      filtered = filtered.filter(project => {
        const projectBenchmarks = filteredProjectBenchmarks?.filter(pb => pb.projectId === project.id) || [];
        const totalBenchmarks = projectBenchmarks.length;
        const completedBenchmarks = projectBenchmarks.filter(b => b.isCompleted).length;
        
        if (statusFilter === 'completed') {
          return totalBenchmarks > 0 && completedBenchmarks === totalBenchmarks;
        } else if (statusFilter === 'pending') {
          return totalBenchmarks === 0 || completedBenchmarks < totalBenchmarks;
        }
        return true;
      });
    }

    // Benchmark type filter
    if (benchmarkFilter !== 'all') {
      filtered = filtered.filter(project => {
        const projectBenchmarks = filteredProjectBenchmarks?.filter(pb => pb.projectId === project.id) || [];
        return projectBenchmarks.some(benchmark => benchmark.name.toLowerCase().includes(benchmarkFilter.toLowerCase()));
      });
    }

    // Department filter - filter based on benchmark departments
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(project => {
        const projectBenchmarks = filteredProjectBenchmarks?.filter(pb => pb.projectId === project.id) || [];
        return projectBenchmarks.some(benchmark => {
          // For now, infer department from benchmark name patterns or use actual department field if available
          const benchmarkData = benchmarks?.find(b => b.id === benchmark.benchmarkId);
          const department = (benchmarkData as any)?.department || 'supply_chain';
          return department === departmentFilter;
        });
      });
    }

    return filtered;
  };

  const filteredProjects = React.useMemo(() => getFilteredProjects(), [
    activeProjects, 
    searchQuery, 
    selectedProjectId, 
    statusFilter, 
    benchmarkFilter, 
    departmentFilter,
    filteredProjectBenchmarks,
    benchmarks
  ]);

  // Get unique benchmark names for filter
  const availableBenchmarks = React.useMemo(() => {
    const names = new Set<string>();
    filteredProjectBenchmarks?.forEach(benchmark => {
      names.add(benchmark.name);
    });
    return Array.from(names).sort();
  }, [filteredProjectBenchmarks]);

  // Get upcoming benchmarks
  const getUpcomingBenchmarks = (timeframe: 'week' | 'month' | 'quarter' | '6months' | '12months') => {
    if (!projectBenchmarks || !activeProjects) {
      console.log('📊 DEBUG: Missing data - projectBenchmarks:', !!projectBenchmarks, 'activeProjects:', !!activeProjects);
      return [];
    }
    
    const now = new Date();
    let endDate: Date;
    
    switch (timeframe) {
      case 'week':
        endDate = endOfWeek(now);
        break;
      case 'month':
        endDate = endOfMonth(now);
        break;
      case 'quarter':
        endDate = endOfQuarter(now);
        break;
      case '6months':
        endDate = addMonths(now, 6);
        break;
      case '12months':
        endDate = addMonths(now, 12);
        break;
    }
    
    console.log('📊 DEBUG: Timeframe:', timeframe, 'Now:', now, 'EndDate:', endDate);
    console.log('📊 DEBUG: Total project benchmarks:', projectBenchmarks.length);
    console.log('📊 DEBUG: Active projects:', activeProjects.length);
    
    // Get benchmarks from active projects only
    const activeProjectIds = new Set(activeProjects.map(p => p.id));
    
    const filteredBenchmarks = projectBenchmarks.filter(benchmark => {
      // Only include benchmarks from active projects
      if (!activeProjectIds.has(benchmark.projectId)) return false;
      
      // Skip completed benchmarks
      if (benchmark.isCompleted) return false;
      
      // For benchmarks with target dates, use those
      if (benchmark.targetDate) {
        const targetDate = new Date(benchmark.targetDate);
        const isInRange = targetDate >= now && targetDate <= endDate;
        console.log('📊 DEBUG: Benchmark with target date:', benchmark.name, 'targetDate:', targetDate, 'inRange:', isInRange);
        return isInRange;
      }
      
      // For benchmarks without target dates, calculate based on project phases
      const project = activeProjects.find(p => p.id === benchmark.projectId);
      if (!project) return false;
      
      // Calculate target date based on project phase dates and weeks before phase
      let phaseDate: Date | null = null;
      
      switch (benchmark.targetPhase) {
        case 'FABRICATION':
          phaseDate = project.fabricationStart ? new Date(project.fabricationStart) : null;
          break;
        case 'NTC':
          phaseDate = project.ntcTestingDate ? new Date(project.ntcTestingDate) : null;
          break;
        case 'QC':
          phaseDate = project.qcStartDate ? new Date(project.qcStartDate) : null;
          break;
        case 'SHIP':
          phaseDate = project.shipDate ? new Date(project.shipDate) : null;
          break;
        default:
          // For other phases, use estimated completion date as fallback
          phaseDate = new Date(project.estimatedCompletionDate);
          break;
      }
      
      if (!phaseDate) {
        console.log('📊 DEBUG: No phase date for benchmark:', benchmark.name, 'targetPhase:', benchmark.targetPhase);
        return false;
      }
      
      // Calculate benchmark due date (weeks before phase)
      const benchmarkDueDate = new Date(phaseDate);
      benchmarkDueDate.setDate(benchmarkDueDate.getDate() - (benchmark.weeksBeforePhase * 7));
      
      const isInRange = benchmarkDueDate >= now && benchmarkDueDate <= endDate;
      console.log('📊 DEBUG: Calculated benchmark:', benchmark.name, 'dueDate:', benchmarkDueDate, 'inRange:', isInRange);
      
      return isInRange;
    });
    
    console.log('📊 DEBUG: Filtered benchmarks count:', filteredBenchmarks.length);
    return filteredBenchmarks;
  };

  // PDF Generation function
  const generatePDFReport = async () => {
    setIsGeneratingPDF(true);

    try {
      const response = await fetch('/api/benchmarks/pdf-report', {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `benchmarks-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: "PDF Generated",
        description: "Benchmarks report has been downloaded successfully.",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Multi-Department Benchmarks</h1>
        <p className="text-slate-600 dark:text-slate-400">
          Track and manage benchmarks across all departments including Supply Chain, Engineering, and more
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-between items-center mb-8">
          <TabsList>
            <TabsTrigger value="project-benchmarks">Project Benchmarks</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={generatePDFReport}
              disabled={isGeneratingPDF}
              className="flex items-center gap-2"
            >
              {isGeneratingPDF ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-800 border-t-transparent" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <span>Generate PDF</span>
                </>
              )}
            </Button>

          </div>
        </div>

        {/* Benchmark Settings Tab */}
        <TabsContent value="benchmarks" className="mt-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Benchmarks</h2>
            <Button onClick={handleNewBenchmark}>
              <PlusCircle className="mr-2 h-4 w-4" />
              New Benchmark
            </Button>
          </div>

          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Timeline</TableHead>
                    <TableHead>Default</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {benchmarks && benchmarks.length > 0 ? (
                    benchmarks.map((benchmark) => (
                      <TableRow key={benchmark.id}>
                        <TableCell className="font-medium">{benchmark.name}</TableCell>
                        <TableCell>{benchmark.description}</TableCell>
                        <TableCell>{benchmark.weeksBeforePhase} weeks before {benchmark.targetPhase}</TableCell>
                        <TableCell>
                          {benchmark.isDefault ? (
                            <Badge variant="default" className="bg-blue-500">Default</Badge>
                          ) : (
                            <Badge variant="outline">Optional</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {benchmark.isActive ? (
                            <Badge variant="default" className="bg-green-500">Active</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-200">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            onClick={() => handleEditBenchmark(benchmark)} 
                            variant="ghost" 
                            size="sm"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            onClick={() => deleteBenchmarkMutation.mutate(benchmark.id)} 
                            variant="ghost" 
                            size="sm"
                            className="text-red-500"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4">
                        <div className="flex flex-col items-center gap-2">
                          <AlertCircle className="h-8 w-8 text-amber-500 mb-2" />
                          <p>No benchmarks defined yet.</p>
                          <Button 
                            onClick={handleNewBenchmark} 
                            variant="outline" 
                            size="sm" 
                            className="mt-2"
                          >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Create First Benchmark
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Project Benchmarks Tab */}
        <TabsContent value="project-benchmarks" className="mt-4">
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h2 className="text-xl font-semibold">Project Benchmarks</h2>
            </div>

            {/* Search and Filter Controls */}
            <div className="flex flex-col lg:flex-row gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search projects by number or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-2">
                <Select
                  value={selectedProjectId?.toString() || ""}
                  onValueChange={value => setSelectedProjectId(value !== " " ? parseInt(value) : null)}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=" ">All Projects</SelectItem>
                    {activeProjects.map((project) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.projectNumber} - {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={statusFilter}
                  onValueChange={(value: 'all' | 'completed' | 'pending') => setStatusFilter(value)}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={benchmarkFilter}
                  onValueChange={setBenchmarkFilter}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Benchmark type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Benchmarks</SelectItem>
                    {availableBenchmarks.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={departmentFilter}
                  onValueChange={setDepartmentFilter}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    <SelectItem value="supply_chain">Supply Chain</SelectItem>
                    <SelectItem value="engineering">Engineering</SelectItem>
                    <SelectItem value="manufacturing">Manufacturing</SelectItem>
                    <SelectItem value="quality_assurance">Quality Assurance</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="it">IT</SelectItem>
                    <SelectItem value="human_resources">Human Resources</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>

                {/* Clear Filters Button */}
                {(searchQuery || selectedProjectId || statusFilter !== 'all' || benchmarkFilter !== 'all' || departmentFilter !== 'all') && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedProjectId(null);
                      setStatusFilter('all');
                      setBenchmarkFilter('all');
                      setDepartmentFilter('all');
                    }}
                    className="whitespace-nowrap"
                  >
                    Clear All
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {filteredProjects.length || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Active projects with department benchmarks</p>
              </CardContent>
            </Card>

            {/* Combined purchasing widget with toggle buttons */}
            <Card className="md:col-span-2 border border-slate-200">
              <div className="p-4 pb-1">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium">Upcoming Benchmarks</h3>
                  <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                    <Button 
                      variant={purchaseTimeframe === 'week' ? "default" : "ghost"} 
                      size="sm"
                      onClick={() => setPurchaseTimeframe('week')}
                      className="h-7 text-xs"
                    >
                      Week
                    </Button>
                    <Button 
                      variant={purchaseTimeframe === 'month' ? "default" : "ghost"} 
                      size="sm"
                      onClick={() => setPurchaseTimeframe('month')}
                      className="h-7 text-xs"
                    >
                      Month
                    </Button>
                    <Button 
                      variant={purchaseTimeframe === 'quarter' ? "default" : "ghost"} 
                      size="sm"
                      onClick={() => setPurchaseTimeframe('quarter')}
                      className="h-7 text-xs"
                    >
                      Quarter
                    </Button>
                    <Button 
                      variant={purchaseTimeframe === '6months' ? "default" : "ghost"} 
                      size="sm"
                      onClick={() => setPurchaseTimeframe('6months')}
                      className="h-7 text-xs"
                    >
                      6 Months
                    </Button>
                    <Button 
                      variant={purchaseTimeframe === '12months' ? "default" : "ghost"} 
                      size="sm"
                      onClick={() => setPurchaseTimeframe('12months')}
                      className="h-7 text-xs"
                    >
                      12 Months
                    </Button>
                  </div>
                </div>

                <div className="mt-4 mb-2">
                  <div className="text-3xl font-bold">
                    {getUpcomingBenchmarks(purchaseTimeframe).length}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {purchaseTimeframe === 'week' && "Benchmarks due this week"}
                    {purchaseTimeframe === 'month' && "Benchmarks due this month"}
                    {purchaseTimeframe === 'quarter' && "Benchmarks due this quarter"}
                    {purchaseTimeframe === '6months' && "Benchmarks due in next 6 months"}
                    {purchaseTimeframe === '12months' && "Benchmarks due in next 12 months"}
                  </p>
                </div>

                {/* Display upcoming purchase items */}
                {getUpcomingBenchmarks(purchaseTimeframe).length > 0 ? (
                  <div className="border-t border-slate-200 mt-3 pt-3 pb-1">
                    <p className="text-xs font-medium mb-2">Upcoming Items:</p>
                    <ul className="text-xs text-muted-foreground space-y-1 max-h-[80px] overflow-y-auto">
                      {getUpcomingBenchmarks(purchaseTimeframe).slice(0, 3).map((benchmark) => {
                        const project = projects?.find(p => p.id === benchmark.projectId);
                        return (
                          <li key={benchmark.id} className="flex items-center gap-1">
                            <div className="h-1.5 w-1.5 rounded-full bg-amber-500 mr-1"></div>
                            <span>
                              {project?.projectNumber} - {benchmark.name}
                            </span>
                          </li>
                        );
                      })}
                      {getUpcomingBenchmarks(purchaseTimeframe).length > 3 && (
                        <li className="text-center text-blue-500">
                          +{getUpcomingBenchmarks(purchaseTimeframe).length - 3} more items
                        </li>
                      )}
                    </ul>
                  </div>
                ) : (
                  <div className="border-t border-slate-200 mt-3 pt-3 pb-1">
                    <p className="text-xs text-center text-muted-foreground py-2">
                      No upcoming benchmarks in this timeframe
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Additional Widgets Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Benchmarks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {benchmarks?.length || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Available benchmark templates</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Tracked Benchmarks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {projectBenchmarks?.length || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Total benchmarks tracked across all projects</p>
              </CardContent>
            </Card>
          </div>

          {/* Results Summary and View Toggle */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-medium">Active Projects</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Showing {filteredProjects.length} of {activeProjects.length} projects
                {(searchQuery || selectedProjectId || statusFilter !== 'all' || benchmarkFilter !== 'all' || departmentFilter !== 'all') && 
                  <span className="ml-1 text-blue-600 dark:text-blue-400">(filtered)</span>
                }
              </p>
            </div>
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
              <Button 
                variant={viewMode === 'grid' ? "default" : "ghost"} 
                size="sm"
                onClick={() => setViewMode('grid')}
                className="flex items-center gap-1"
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline-block">Grid</span>
              </Button>
              <Button 
                variant={viewMode === 'list' ? "default" : "ghost"} 
                size="sm"
                onClick={() => setViewMode('list')}
                className="flex items-center gap-1"
              >
                <List className="h-4 w-4" />
                <span className="hidden sm:inline-block">List</span>
              </Button>
            </div>
          </div>

          {/* Grid View */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => {
                  const projectBenchmarks = filteredProjectBenchmarks?.filter(pb => pb.projectId === project.id) || [];
                  const totalBenchmarks = projectBenchmarks.length;
                  const completedBenchmarks = projectBenchmarks.filter(b => b.isCompleted).length;
                  const progressPercentage = totalBenchmarks > 0 ? (completedBenchmarks / totalBenchmarks) * 100 : 0;

                  return (
                    <Card key={project.id} className="overflow-hidden">
                      <CardHeader className="bg-slate-50 dark:bg-slate-800 pb-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-md">{project.projectNumber}</CardTitle>
                            <CardDescription className="text-sm font-medium">{project.name}</CardDescription>
                          </div>
                          <div className="flex items-center gap-1">
                            {/* Complete All Tasks Button */}
                            {projectBenchmarks.some(b => !b.isCompleted) && (
                              <Button
                                onClick={() => completeAllBenchmarksMutation.mutate(project.id)}
                                variant="ghost"
                                size="sm"
                                disabled={completeAllBenchmarksMutation.isPending}
                                className="text-green-600 hover:text-green-700"
                                title="Complete All Tasks"
                              >
                                {completeAllBenchmarksMutation.isPending ? (
                                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                            <Button
                              onClick={() => handleOpenProjectDetails(project)}
                              variant="ghost"
                              size="sm"
                              className="text-blue-500"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Progress bar for benchmark completion */}
                        {totalBenchmarks > 0 && (
                          <div className="w-full mt-2">
                            <div className="flex justify-between text-xs mb-1">
                              <span>Benchmark Progress</span>
                              <span>{completedBenchmarks}/{totalBenchmarks}</span>
                            </div>
                            <Progress value={progressPercentage} className="h-2" />
                          </div>
                        )}
                      </CardHeader>
                      <CardContent className="pt-4 pb-2 max-h-[200px] overflow-y-auto">
                        {projectBenchmarks.length > 0 ? (
                          <ul className="space-y-2">
                            {projectBenchmarks.map((benchmark) => {
                              const dueInfo = getBenchmarkDueInfo(project, benchmark);
                              const status = getBenchmarkStatus(benchmark);

                              return (
                                <li key={benchmark.id} className="flex justify-between items-start mb-3">
                                  <div>
                                    <div className="font-medium text-sm">{benchmark.name}</div>
                                    <div className={`text-xs ${dueInfo.isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                                      Due: {dueInfo.dueDateText}
                                      {dueInfo.isOverdue && (
                                        <span className="ml-2 text-red-600 font-semibold">
                                          ({dueInfo.daysLate} days late)
                                        </span>
                                      )}
                                    </div>
                                    {benchmark.isCompleted && benchmark.completedDate && (
                                      <div className="text-xs text-green-600 mt-1 flex items-center">
                                        <Clock className="h-3 w-3 mr-1" />
                                        Completed on {format(new Date(benchmark.completedDate), 'MMM d, yyyy')}
                                        {benchmark.completedDate && 
                                          <> at {format(
                                            // Convert the UTC time to local time zone
                                            new Date(benchmark.completedDate),
                                            'h:mm a'
                                          )}</>}
                                        {benchmark.completedBy && 
                                          <span className="ml-1">by {benchmark.completedBy}</span>}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge className={`text-xs ${status.color}`}>{status.label}</Badge>
                                    <Button
                                      onClick={() => toggleBenchmarkCompletion(benchmark)}
                                      variant="ghost"
                                      size="sm"
                                      disabled={updatingBenchmarkId === benchmark.id}
                                      className={benchmark.isCompleted ? "text-amber-500 h-6 w-6 p-0" : "text-green-500 h-6 w-6 p-0"}
                                    >
                                      {updatingBenchmarkId === benchmark.id ? (
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                      ) : benchmark.isCompleted ? (
                                        <X className="h-4 w-4" />
                                      ) : (
                                        <Check className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        ) : (
                          <div className="text-center py-4">
                            <p className="text-gray-500">No Supply Chain Benchmarks</p>
                            <Button
                              onClick={() => addDefaultBenchmarksMutation.mutate(project.id)}
                              variant="outline"
                              size="sm"
                              className="mt-2"
                            >
                              <PlusCircle className="h-4 w-4 mr-2" />
                              Add Benchmarks
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-slate-900 dark:text-slate-100">Project</TableHead>
                      <TableHead className="text-slate-900 dark:text-slate-100">Benchmarks</TableHead>
                      <TableHead className="text-slate-900 dark:text-slate-100">Progress</TableHead>
                      <TableHead className="text-slate-900 dark:text-slate-100">Upcoming Tasks</TableHead>
                      <TableHead className="text-right text-slate-900 dark:text-slate-100">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProjects.length > 0 ? (
                        filteredProjects.map((project) => {
                            const projectBenchmarks = filteredProjectBenchmarks?.filter(pb => pb.projectId === project.id) || [];
                            const totalBenchmarks = projectBenchmarks.length;
                            const completedBenchmarks = projectBenchmarks.filter(b => b.isCompleted).length;
                            const progressPercentage = totalBenchmarks > 0 ? (completedBenchmarks / totalBenchmarks) * 100 : 0;

                            // Get upcoming (incomplete) benchmarks sorted by date
                            const upcomingBenchmarks = projectBenchmarks
                              .filter(b => !b.isCompleted)
                              .sort((a, b) => {
                                const dateA = a.targetDate ? new Date(a.targetDate) : new Date();
                                const dateB = b.targetDate ? new Date(b.targetDate) : new Date();
                                return dateA.getTime() - dateB.getTime();
                              });

                            return (
                              <TableRow key={project.id}>
                                <TableCell>
                                  <div className="font-medium text-slate-900 dark:text-slate-100">{project.projectNumber}</div>
                                  <div className="text-sm text-slate-600 dark:text-slate-400">{project.name}</div>
                                </TableCell>
                                <TableCell className="text-slate-900 dark:text-slate-100">{totalBenchmarks}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Progress value={progressPercentage} className="h-2 w-24" />
                                    <span className="text-xs text-slate-900 dark:text-slate-100">{completedBenchmarks}/{totalBenchmarks}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {upcomingBenchmarks.length > 0 ? (
                                    <div className="max-w-[250px]">
                                      <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3 text-amber-500" />
                                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{upcomingBenchmarks[0].name}</span>
                                      </div>
                                      <div className="text-xs text-slate-600 dark:text-slate-400">
                                        {(() => {
                                          const dueInfo = getBenchmarkDueInfo(project, upcomingBenchmarks[0]);
                                          return (
                                            <span className={dueInfo.isOverdue ? 'text-red-600 font-medium' : ''}>
                                              Due: {dueInfo.dueDateText}
                                              {dueInfo.isOverdue && (
                                                <span className="ml-1 text-red-600 font-semibold">
                                                  ({dueInfo.daysLate} days late)
                                                </span>
                                              )}
                                            </span>
                                          );
                                        })()}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-sm text-slate-600 dark:text-slate-400">No upcoming tasks</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {/* Complete All Tasks Button */}
                                    {projectBenchmarks.some(b => !b.isCompleted) && (
                                      <Button
                                        onClick={() => completeAllBenchmarksMutation.mutate(project.id)}
                                        variant="ghost"
                                        size="sm"
                                        disabled={completeAllBenchmarksMutation.isPending}
                                        className="text-green-600 hover:text-green-700"
                                        title="Complete All Tasks"
                                      >
                                        {completeAllBenchmarksMutation.isPending ? (
                                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                        ) : (
                                          <Check className="h-4 w-4" />
                                        )}
                                      </Button>
                                    )}
                                    <Button
                                      onClick={() => {
                                        if (totalBenchmarks === 0) {
                                          // Add default benchmarks if none exist
                                          addDefaultBenchmarksMutation.mutate(project.id);
                                        } else {
                                          // Open the project details dialog if benchmarks exist
                                          handleOpenProjectDetails(project);
                                        }
                                      }}
                                      variant="ghost"
                                      size="sm"
                                    >
                                      {totalBenchmarks === 0 ? (
                                        <>
                                          <PlusCircle className="h-4 w-4 mr-2" />
                                          Add
                                        </>
                                      ) : (
                                        <>
                                          <Edit className="h-4 w-4 mr-2" />
                                          Edit
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            <p className="text-lg text-slate-600 dark:text-slate-400">No projects match your filter criteria.</p>
                          </TableCell>
                        </TableRow>
                      )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Show this when there are no active projects */}
          {activeProjects.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center">
                <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                <p className="text-lg text-slate-600 dark:text-slate-400">No active projects found.</p>
                <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">Create projects in the Projects tab first.</p>
              </CardContent>
            </Card>
          )}

          {/* Show when there are projects but none match the filter */}
          {activeProjects.length > 0 && filteredProjects.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="text-lg text-slate-600 dark:text-slate-400">No projects match your filter criteria.</p>
                <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">Try adjusting your search or filter settings.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Benchmark Settings</CardTitle>
              <CardDescription>
                Manage benchmark templates and update timing for existing projects
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {benchmarks && benchmarks.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Benchmark Templates</h3>
                    <Button onClick={handleNewBenchmark} size="sm">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      New Benchmark
                    </Button>
                  </div>
                  <div className="grid gap-4">
                    {benchmarks.map((benchmark) => (
                      <div key={benchmark.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-medium">{benchmark.name}</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                              {benchmark.description}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                              <span>Department: {benchmark.department}</span>
                              <span>Target Phase: {benchmark.targetPhase}</span>
                              <span>Timing: {benchmark.weeksBeforePhase} weeks before</span>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingBenchmark(benchmark)}
                            className="flex items-center gap-2"
                          >
                            <Settings className="h-4 w-4" />
                            Edit Settings
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-600 dark:text-slate-400">No benchmark templates found.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Benchmark Form Dialog */}
      <Dialog open={openBenchmarkDialog} onOpenChange={setOpenBenchmarkDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingBenchmark ? 'Edit Benchmark' : 'Create New Benchmark'}</DialogTitle>
            <DialogDescription>
              {editingBenchmark
                ? 'Update the benchmark details below.'
                : 'Fill in the details to create a new benchmark.'}
            </DialogDescription>
          </DialogHeader>

          <Form {...benchmarkForm}>
            <form
              onSubmit={benchmarkForm.handleSubmit(onBenchmarkSubmit)}
              className="space-y-4"
            >
              <FormField
                control={benchmarkForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter benchmark name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={benchmarkForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter a description (optional)"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={benchmarkForm.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent className="z-[1000]">
                          <SelectItem value="supply_chain">Supply Chain</SelectItem>
                          <SelectItem value="engineering">Engineering</SelectItem>
                          <SelectItem value="manufacturing">Manufacturing</SelectItem>
                          <SelectItem value="quality_assurance">Quality Assurance</SelectItem>
                          <SelectItem value="sales">Sales</SelectItem>
                          <SelectItem value="finance">Finance</SelectItem>
                          <SelectItem value="it">IT</SelectItem>
                          <SelectItem value="human_resources">Human Resources</SelectItem>
                          <SelectItem value="operations">Operations</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={benchmarkForm.control}
                  name="weeksBeforePhase"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weeks Before Phase</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          placeholder="3"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={benchmarkForm.control}
                  name="targetPhase"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Phase</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a phase" />
                          </SelectTrigger>
                          <SelectContent className="z-[1000]">
                            <SelectItem value="CONTRACT">Contract</SelectItem>
                            <SelectItem value="START">Project Start</SelectItem>
                            <SelectItem value="CHASSIS">Chassis ETA</SelectItem>
                            <SelectItem value="FABRICATION">Fabrication</SelectItem>
                            <SelectItem value="ASSEMBLY">Assembly</SelectItem>
                            <SelectItem value="WRAP">Wrap</SelectItem>
                            <SelectItem value="PAINT">Paint</SelectItem>
                            <SelectItem value="PRODUCTION">Production</SelectItem>
                            <SelectItem value="IT">IT</SelectItem>
                            <SelectItem value="NTC">NTC Testing</SelectItem>
                            <SelectItem value="QC">Quality Control</SelectItem>
                            <SelectItem value="EXEC_REVIEW">Executive Review</SelectItem>
                            <SelectItem value="SHIP">Ship</SelectItem>
                            <SelectItem value="DELIVERY">Delivery</SelectItem>
                            <SelectItem value="COMPLETION">Completion</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex flex-col md:flex-row gap-6">
                <FormField
                  control={benchmarkForm.control}
                  name="isDefault"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Default Benchmark</FormLabel>
                        <FormDescription>
                          Automatically added to new projects
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={benchmarkForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Active</FormLabel>
                        <FormDescription>
                          Available for use in projects
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                {(createBenchmarkMutation.isPending || updateBenchmarkMutation.isPending) ? (
                  <Button disabled className="relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    </div>
                    <span className="opacity-0">
                      {editingBenchmark ? 'Updating...' : 'Creating...'}
                    </span>
                  </Button>
                ) : (
                  <Button type="submit">
                    {editingBenchmark ? 'Update Benchmark' : 'Create Benchmark'}
                  </Button>
                )}
              </DialogFooter>

              {/* Loading notification message */}
              {(createBenchmarkMutation.isPending || updateBenchmarkMutation.isPending) && (
                <div className="flex items-center justify-center text-sm text-blue-600 pt-2">
                  <div className="animate-pulse">
                    {editingBenchmark ? 'Updating benchmark...' : 'Creating benchmark...'}
                    <span className="ml-1">This may take a few seconds</span>
                  </div>
                </div>
              )}
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Project Benchmarks Dialog */}
      <Dialog open={projectDetailsOpen} onOpenChange={setProjectDetailsOpen}>
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle>
              {selectedProjectDetails?.projectNumber} - {selectedProjectDetails?.name}
            </DialogTitle>
            <DialogDescription>
              Manage benchmarks for this project
            </DialogDescription>
          </DialogHeader>

          {selectedProjectDetails && (
            <div className="mt-4">
              {/* Show current benchmarks for the project */}
              <div className="mb-4">
                <h3 className="text-lg font-medium mb-2">Current Benchmarks</h3>
                {projectBenchmarks?.filter(pb => pb.projectId === selectedProjectDetails.id).length > 0 ? (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                    {projectBenchmarks?.filter(pb => pb.projectId === selectedProjectDetails.id).map((benchmark) => {
                      const status = getBenchmarkStatus(benchmark);
                      const dueInfo = getBenchmarkDueInfo(selectedProjectDetails, benchmark);

                      return (
                        <div key={benchmark.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-md">
                          <div className="w-3/4">
                            <div className="font-medium">{benchmark.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {benchmark.weeksBeforePhase} weeks before {benchmark.targetPhase}
                            </div>
                            <div className={`text-sm ${dueInfo.isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                              Due: <span className="ml-1">{dueInfo.dueDateText}</span>
                              {dueInfo.isOverdue && (
                                <span className="ml-2 text-red-600 font-semibold">
                                  ({dueInfo.daysLate} days late)
                                </span>
                              )}
                            </div>
                            {benchmark.isCompleted && benchmark.completedDate && (
                              <div className="text-xs text-green-600 mt-1 flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                Completed on {format(new Date(benchmark.completedDate), 'MMM d, yyyy')}
                                {benchmark.completedDate && 
                                  <> at {format(
                                    // Convert the UTC time to local time zone
                                    new Date(benchmark.completedDate),
                                    'h:mm a'
                                  )}</>}
                                {benchmark.completedBy && 
                                  <span className="ml-1">by {benchmark.completedBy}</span>}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={status.color}>{status.label}</Badge>
                            <Button
                              onClick={() => toggleBenchmarkCompletion(benchmark)}
                              variant="ghost"
                              size="sm"
                              disabled={updatingBenchmarkId === benchmark.id}
                              className={benchmark.isCompleted ? "text-amber-500" : "text-green-500"}
                            >
                              {updatingBenchmarkId === benchmark.id ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              ) : benchmark.isCompleted ? (
                                <X className="h-4 w-4" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </Button>
                            <Button 
                              onClick={() => {
                                // Create a delete mutation for project benchmarks
                                toast({
                                  title: "Deleting benchmark...",
                                  description: "Removing benchmark from this project"
                                });

                                apiRequest('DELETE', `/api/project-supply-chain-benchmarks/${benchmark.id}`)
                                  .then(() => {
                                    queryClient.invalidateQueries({ queryKey: ['/api/project-supply-chain-benchmarks'] });
                                    toast({
                                      title: "Benchmark deleted",
                                      description: "The benchmark has been removed from this project."
                                    });
                                  })
                                  .catch((error) => {
                                    toast({
                                      title: "Error deleting benchmark",
                                      description: "There was an error deleting the benchmark. Please try again.",
                                      variant: "destructive"
                                    });
                                    console.error("Delete error:", error);
                                  });
                              }}
                              variant="ghost" 
                              size="sm"
                              className="text-red-500"
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 bg-slate-50 dark:bg-slate-800 rounded-md">
                    <AlertCircle className="h-10 w-10 text-amber-500 mx-auto mb-2" />
                    <p className="text-gray-500">No benchmarks for this project</p>
                  </div>
                )}
              </div>

              {/* Add default benchmarks option */}
              <div className="mt-6 flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Add default benchmarks to this project.
                </p>
                <Button
                  onClick={() => {
                    addDefaultBenchmarksMutation.mutate(selectedProjectDetails.id);
                  }}
                  variant="outline"
                  size="sm"
                  disabled={addDefaultBenchmarksMutation.isPending}
                  className="ml-auto"
                >
                  {addDefaultBenchmarksMutation.isPending ? (
                    <>
                      <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-slate-800 border-t-transparent" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Default Benchmarks
                    </>
                  )}
                </Button>
              </div>

              {/* Add benchmark from templates */}
              <div className="mt-4 flex justify-between space-x-2">
                <Button
                  onClick={() => {
                    setTemplateBenchmarkDialogOpen(true);
                    setPendingBenchmarkProjectId(selectedProjectDetails.id);
                  }}
                  variant="outline"
                  className="w-1/2"
                >
                  <ListFilter className="h-4 w-4 mr-2" />
                  Add from Templates
                </Button>

                <Button
                  onClick={() => {
                    setProjectDetailsOpen(false);
                    // Give time for the dialog to close before opening the new one
                    setTimeout(() => {
                      // Pass the project ID to associate the new benchmark with this project
                      handleNewBenchmark(selectedProjectDetails.id);
                    }, 100);
                  }}
                  variant="default"
                  className="w-1/2"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create New
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Template Benchmark Selection Dialog */}
      <Dialog open={templateBenchmarkDialogOpen} onOpenChange={setTemplateBenchmarkDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Select Benchmark Template</DialogTitle>
            <DialogDescription>
              Choose a benchmark template to add to this project.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {loadingBenchmarks ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800"></div>
              </div>
            ) : !benchmarks || benchmarks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No benchmark templates available. Create some first.
              </div>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {benchmarks.filter(b => b.isActive).map((benchmark) => (
                  <div 
                    key={benchmark.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedBenchmarkTemplate === benchmark.id 
                      ? 'border-primary bg-primary/5' 
                      : 'hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedBenchmarkTemplate(benchmark.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{benchmark.name}</div>
                      <Badge variant={benchmark.isDefault ? "secondary" : "outline"}>
                        {benchmark.isDefault ? "Default" : "Template"}
                      </Badge>
                    </div>

                    {benchmark.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {benchmark.description}
                      </p>
                    )}

                    <div className="flex items-center mt-2 text-sm">
                      <Clock className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                      <span>{benchmark.weeksBeforePhase} weeks before {benchmark.targetPhase}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setTemplateBenchmarkDialogOpen(false);
                setSelectedBenchmarkTemplate(null);
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={!selectedBenchmarkTemplate || addTemplateBenchmarkMutation.isPending}
              onClick={() => {
                if (pendingBenchmarkProjectId && selectedBenchmarkTemplate) {
                  addTemplateBenchmarkMutation.mutate({
                    projectId: pendingBenchmarkProjectId,
                    benchmarkId: selectedBenchmarkTemplate
                  });
                }
              }}
            >
              {addTemplateBenchmarkMutation.isPending ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  Adding...
                </>
              ) : (
                "Add to Project"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Benchmark Settings Dialog */}
      <Dialog open={!!editingBenchmark} onOpenChange={() => setEditingBenchmark(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Benchmark Settings</DialogTitle>
            <DialogDescription>
              Update timing for "{editingBenchmark?.name}" and choose how to apply changes
            </DialogDescription>
          </DialogHeader>
          
          {editingBenchmark && (
            <div className="space-y-6">
              {/* Current Settings */}
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Current Settings</h4>
                <div className="text-sm space-y-1 text-slate-600 dark:text-slate-400">
                  <p>Department: {editingBenchmark.department}</p>
                  <p>Target Phase: {editingBenchmark.targetPhase}</p>
                  <p>Current Timing: {editingBenchmark.weeksBeforePhase} weeks before phase</p>
                </div>
              </div>

              {/* New Settings */}
              <div className="space-y-4">
                <h4 className="font-medium">New Settings</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="newWeeks">Weeks Before Phase</Label>
                    <Input
                      id="newWeeks"
                      type="number"
                      min="1"
                      defaultValue={editingBenchmark.weeksBeforePhase}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Update Options */}
              <div className="space-y-4">
                <h4 className="font-medium">How should this change be applied?</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="update-new"
                      name="updateOption"
                      value="new"
                      checked={updateOption === 'new'}
                      onChange={(e) => setUpdateOption(e.target.value as 'all' | 'selected' | 'new')}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="update-new" className="flex-1">
                      <div>
                        <div className="font-medium">New Projects Only</div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          Only apply to projects created after this change
                        </div>
                      </div>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="update-all"
                      name="updateOption"
                      value="all"
                      checked={updateOption === 'all'}
                      onChange={(e) => setUpdateOption(e.target.value as 'all' | 'selected' | 'new')}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="update-all" className="flex-1">
                      <div>
                        <div className="font-medium">All Existing Projects</div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          Update all projects that have this benchmark
                        </div>
                      </div>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="update-selected"
                      name="updateOption"
                      value="selected"
                      checked={updateOption === 'selected'}
                      onChange={(e) => {
                        setUpdateOption(e.target.value as 'all' | 'selected' | 'new');
                        setShowProjectSelector(true);
                      }}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="update-selected" className="flex-1">
                      <div>
                        <div className="font-medium">Selected Projects</div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          Choose specific projects to update
                        </div>
                      </div>
                    </Label>
                  </div>
                </div>
              </div>

              {/* Project Selector */}
              {updateOption === 'selected' && showProjectSelector && (
                <div className="space-y-4 border-t pt-4">
                  <h4 className="font-medium">Select Projects to Update</h4>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {activeProjects?.map((project) => {
                      const hasThisBenchmark = projectBenchmarks?.some(
                        pb => pb.projectId === project.id && pb.benchmarkId === editingBenchmark.id
                      );
                      
                      if (!hasThisBenchmark) return null;
                      
                      return (
                        <div key={project.id} className="flex items-center space-x-2 p-2 border rounded">
                          <input
                            type="checkbox"
                            id={`project-${project.id}`}
                            checked={selectedProjectsForUpdate.includes(project.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedProjectsForUpdate([...selectedProjectsForUpdate, project.id]);
                              } else {
                                setSelectedProjectsForUpdate(selectedProjectsForUpdate.filter(id => id !== project.id));
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <Label htmlFor={`project-${project.id}`} className="flex-1">
                            <div className="text-sm">
                              <div className="font-medium">{project.projectNumber} - {project.name}</div>
                              <div className="text-slate-600 dark:text-slate-400">Status: {project.status}</div>
                            </div>
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingBenchmark(null);
                    setSelectedProjectsForUpdate([]);
                    setShowProjectSelector(false);
                    setUpdateOption('new');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    const newWeeksInput = document.getElementById('newWeeks') as HTMLInputElement;
                    const newWeeks = parseInt(newWeeksInput.value);
                    
                    if (newWeeks && newWeeks > 0) {
                      setIsSavingBenchmarkSettings(true);
                      await updateBenchmarkSettingsMutation.mutateAsync({
                        benchmarkId: editingBenchmark.id,
                        weeksBeforePhase: newWeeks,
                        updateOption,
                        selectedProjectIds: updateOption === 'selected' ? selectedProjectsForUpdate : undefined
                      });
                    }
                  }}
                  disabled={isSavingBenchmarkSettings || updateBenchmarkSettingsMutation.isPending}
                >
                  {isSavingBenchmarkSettings || updateBenchmarkSettingsMutation.isPending ? (
                    <>
                      <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-background border-t-transparent" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupplyChain;