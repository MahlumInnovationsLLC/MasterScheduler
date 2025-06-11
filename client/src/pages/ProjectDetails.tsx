import React, { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, Link, useLocation } from 'wouter';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { 
  ArrowLeft,
  User,
  Calendar,
  Clock,
  Edit,
  Plus,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Building2,
  Info,
  Archive,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ProgressBadge } from '@/components/ui/progress-badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate, formatCurrency, getProjectStatusColor, getBillingStatusInfo } from '@/lib/utils';
import { AIInsightsModal } from '@/components/AIInsightsModal';
import { ProjectHealthCard } from '@/components/ProjectHealthCard';
import { MilestonesList } from '@/components/MilestonesList';
import { BillingMilestonesList } from '@/components/BillingMilestonesList';
import { ProjectCostsList } from '@/components/ProjectCostsList';
import { ProjectPhaseInfo } from '@/components/ProjectPhaseInfo';
import { ProjectForensicsWidget } from '@/components/ProjectForensicsWidget';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { addDays } from 'date-fns';
import { Loader2 } from 'lucide-react';

// Interactive Progress Slider Component
interface InteractiveProgressSliderProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

const InteractiveProgressSlider: React.FC<InteractiveProgressSliderProps> = ({ 
  value, 
  onChange, 
  className = "" 
}) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    updateValue(e.clientX);
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      updateValue(e.clientX);
    }
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const updateValue = useCallback((clientX: number) => {
    if (sliderRef.current) {
      const rect = sliderRef.current.getBoundingClientRect();
      const percentage = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      onChange(Math.round(percentage));
    }
  }, [onChange]);

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div 
      ref={sliderRef}
      className={`relative bg-gray-800 rounded-full h-2.5 cursor-pointer ${className}`}
      onMouseDown={handleMouseDown}
    >
      <div 
        className="bg-success h-2.5 rounded-full transition-all duration-200" 
        style={{ width: `${value}%` }}
      />
      <div 
        className="absolute top-1/2 transform -translate-y-1/2 w-4 h-4 bg-success rounded-full border-2 border-white shadow-md cursor-grab"
        style={{ left: `calc(${value}% - 8px)` }}
      />
    </div>
  );
};

const ProjectDetails = () => {
  const { id } = useParams();
  const projectId = parseInt(id);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Mutation for updating project progress
  const updateProgressMutation = useMutation({
    mutationFn: async (newProgress: number) => {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ percentComplete: newProgress.toString() })
      });
      if (!response.ok) {
        throw new Error('Failed to update progress');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/health`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/metrics`] });
      toast({
        title: "Progress Updated",
        description: "Project progress has been updated successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update project progress.",
        variant: "destructive"
      });
    }
  });

  const updateProjectProgress = useCallback((newValue: number) => {
    updateProgressMutation.mutate(newValue);
  }, [updateProgressMutation]);
  
  // Dialog state
  const [isAssignBayDialogOpen, setIsAssignBayDialogOpen] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [isTaskDialogOpen, setTaskDialogOpen] = useState(false);
  const [isDeleteTaskDialogOpen, setDeleteTaskDialogOpen] = useState(false);
  const [isMilestoneDialogOpen, setIsMilestoneDialogOpen] = useState(false);
  const [isEditNotesDialogOpen, setIsEditNotesDialogOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState<string>('');
  const [selectedBayId, setSelectedBayId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    addDays(new Date(), 14).toISOString().split('T')[0]
  );
  const [equipment, setEquipment] = useState<string>('Standard Equipment');
  const [staffAssigned, setStaffAssigned] = useState<string>('Team Alpha (4)');
  
  // Task editing state
  const [editTaskId, setEditTaskId] = useState<number | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<any | null>(null);
  const [taskForm, setTaskForm] = useState({
    name: '',
    description: '',
    dueDate: new Date().toISOString().split('T')[0],
    milestoneId: 0
  });

  // Milestone editing state
  const [editMilestoneId, setEditMilestoneId] = useState<number | null>(null);
  const [milestoneForm, setMilestoneForm] = useState({
    name: '',
    status: 'In Progress',
    date: new Date().toISOString().split('T')[0]
  });
  
  // Notes editing state
  const [notesForm, setNotesForm] = useState({
    notes: ''
  });
  
  const { data: project, isLoading: isLoadingProject } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !isNaN(projectId)
  });
  
  // Reset task form when dialog closes
  React.useEffect(() => {
    if (!isTaskDialogOpen) {
      setTaskForm({
        name: '',
        description: '',
        dueDate: new Date().toISOString().split('T')[0],
        milestoneId: 0
      });
      setEditTaskId(null);
    }
  }, [isTaskDialogOpen]);
  
  // Initialize notes form when dialog opens
  React.useEffect(() => {
    if (isEditNotesDialogOpen && project) {
      setNotesForm({
        notes: project.notes || ''
      });
    }
  }, [isEditNotesDialogOpen, project]);
  
  const { data: tasks = [], isLoading: isLoadingTasks } = useQuery({
    queryKey: [`/api/projects/${projectId}/tasks`],
    enabled: !isNaN(projectId)
  });
  
  const { data: billingMilestones = [], isLoading: isLoadingBilling } = useQuery({
    queryKey: [`/api/projects/${projectId}/billing-milestones`],
    enabled: !isNaN(projectId)
  });
  
  const { data: manufacturingSchedules = [], isLoading: isLoadingManufacturing } = useQuery({
    queryKey: [`/api/manufacturing-schedules`],
    queryFn: async ({ queryKey }) => {
      const res = await fetch(`${queryKey[0]}?projectId=${projectId}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch manufacturing schedules');
      return res.json();
    },
    enabled: !isNaN(projectId)
  });
  
  const { data: manufacturingBays = [] } = useQuery({
    queryKey: ['/api/manufacturing-bays'],
    enabled: !isNaN(projectId)
  });
  
  // Create manufacturing schedule mutation
  const assignBayMutation = useMutation({
    mutationFn: async (scheduleData: {
      projectId: number;
      bayId: number;
      startDate: string;
      endDate: string;
      equipment: string;
      staffAssigned: string;
      status: string;
    }) => {
      const response = await apiRequest('POST', '/api/manufacturing-schedules', scheduleData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Manufacturing bay assigned",
        description: "Project has been successfully scheduled for production",
      });
      setIsAssignBayDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: [`/api/manufacturing-schedules`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to assign bay",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Archive project mutation
  const archiveProjectMutation = useMutation({
    mutationFn: async ({ reason }: { reason: string }) => {
      const response = await apiRequest('POST', `/api/projects/${projectId}/archive`, { reason });
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Project archived",
        description: `Project ${data.archivedProject.projectNumber} has been archived successfully`,
      });
      setIsArchiveDialogOpen(false);
      // Navigate back to projects list
      navigate('/projects');
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to archive project",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      const response = await apiRequest('POST', '/api/tasks', {
        ...taskData,
        projectId: projectId,
        isCompleted: false
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Task created",
        description: "Task has been successfully created",
      });
      setTaskDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/tasks`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create task",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      const response = await apiRequest('PUT', `/api/tasks/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Task updated",
        description: "Task has been successfully updated",
      });
      setTaskDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/tasks`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update task",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const response = await apiRequest('DELETE', `/api/tasks/${taskId}`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Task deleted",
        description: "Task has been successfully deleted",
      });
      setDeleteTaskDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/tasks`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete task",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Create/Update milestone mutation
  const saveMilestoneMutation = useMutation({
    mutationFn: async (data: any) => {
      // Since we're not using a real API for milestones in the demo, we'll simulate it
      // In a real app, you'd send a request to the server
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ success: true, milestone: data });
        }, 500);
      });
    },
    onSuccess: () => {
      toast({
        title: editMilestoneId ? "Milestone updated" : "Milestone created",
        description: `Milestone has been successfully ${editMilestoneId ? 'updated' : 'created'}`,
      });
      setIsMilestoneDialogOpen(false);
      
      // In a real app, you'd invalidate the milestone query
      // For demo, we're just closing the dialog
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save milestone",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Update project notes mutation
  const updateNotesMutation = useMutation({
    mutationFn: async (notes: string) => {
      const response = await apiRequest('PUT', `/api/projects/${projectId}`, { notes });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Notes updated",
        description: "Project notes have been successfully updated",
      });
      setIsEditNotesDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update notes",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Calculate project progress based on tasks and milestones completion
  const calculateProjectProgress = (): number => {
    if (!tasks || tasks.length === 0) return 0;
    
    // Calculate task completion percentage
    const completedTasks = tasks.filter(t => t.isCompleted).length;
    return Math.round((completedTasks / tasks.length) * 100);
  };

  // Real-time project health data from API
  const { data: realTimeProjectHealth, isLoading: isLoadingHealth } = useQuery({
    queryKey: [`/api/projects/${projectId}/health`],
    enabled: !!projectId,
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchOnWindowFocus: true,
    staleTime: 15000, // Consider data stale after 15 seconds
  });

  // Real-time project metrics from API
  const { data: projectMetrics, isLoading: isLoadingMetrics } = useQuery({
    queryKey: [`/api/projects/${projectId}/metrics`],
    enabled: !!projectId,
    refetchInterval: 15000, // Refresh every 15 seconds
    refetchOnWindowFocus: true,
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  // Use real-time data if available, otherwise fallback to calculated data
  const projectHealth = realTimeProjectHealth || {
    score: 0,
    change: 0,
    breakdown: {
      taskCompletion: 0,
      timelineAdherence: 0,
      billingProgress: 0,
      manufacturingStatus: 0,
      overallRisk: 'Unknown'
    }
  };

  const { status: projectStatus } = project ? getProjectStatusColor(
    parseFloat(project.percentComplete),
    project.estimatedCompletionDate
  ) : { status: 'Unknown' };

  // Find the active manufacturing schedule if any
  const activeSchedule = manufacturingSchedules?.find(s => s.status === 'in_progress');
  const activeBay = activeSchedule ? manufacturingBays?.find(b => b.id === activeSchedule.bayId) : null;

  // Group tasks by milestone
  const milestones = React.useMemo(() => {
    const currentTasks = Array.isArray(tasks) ? tasks : [];
    
    if (currentTasks.length === 0) {
      return [];
    }
    
    const milestoneGroups = [];
    
    // Group tasks that have milestoneId assignments
    const tasksWithMilestones = currentTasks.filter(task => task.milestoneId);
    const standaloneTasks = currentTasks.filter(task => !task.milestoneId);
    
    // Create milestone groups for tasks with milestone assignments
    const milestoneMap = new Map();
    tasksWithMilestones.forEach(task => {
      const milestoneId = task.milestoneId;
      if (!milestoneMap.has(milestoneId)) {
        milestoneMap.set(milestoneId, {
          id: milestoneId,
          name: `Milestone ${milestoneId}`,
          status: 'Active',
          date: 'Current',
          tasks: [],
          color: 'border-primary',
          isCompleted: false
        });
      }
      milestoneMap.get(milestoneId).tasks.push(task);
    });
    
    // Add milestone groups to the result
    milestoneGroups.push(...Array.from(milestoneMap.values()));
    
    // Add standalone tasks group if any exist
    if (standaloneTasks.length > 0) {
      milestoneGroups.push({
        id: 0,
        name: 'Standalone Tasks',
        status: 'Active',
        date: 'No milestone',
        tasks: standaloneTasks,
        color: 'border-gray-500',
        isCompleted: false
      });
    }
    
    return milestoneGroups;
  }, [tasks, projectId]);

  if (isLoadingProject || isLoadingTasks || isLoadingBilling || isLoadingManufacturing) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </div>
        <div className="animate-pulse space-y-6">
          <div className="bg-darkCard h-36 rounded-xl border border-gray-800"></div>
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 bg-darkCard h-96 rounded-xl border border-gray-800"></div>
            <div className="space-y-6">
              <div className="bg-darkCard h-48 rounded-xl border border-gray-800"></div>
              <div className="bg-darkCard h-48 rounded-xl border border-gray-800"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If project not found
  if (!project) {
    return (
      <div className="p-6">
        <Link href="/projects">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </Link>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-warning mb-4" />
            <h2 className="text-xl font-bold mb-2">Project Not Found</h2>
            <p className="text-gray-400">The project you're looking for doesn't exist or has been removed.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/projects">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </Link>
        <AIInsightsModal projectId={projectId} />
      </div>
      
      {/* Project Header */}
      <div className="bg-darkCard rounded-xl border border-gray-800 p-5">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded flex items-center justify-center text-white font-bold text-sm border border-gray-500 shadow-lg" 
                   style={{ 
                     background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                     boxShadow: '0 2px 8px rgba(107, 114, 128, 0.3)'
                   }}>
                {project.location || 'N/A'}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className={`text-xl font-bold font-sans ${project.isSalesEstimate ? 'text-yellow-400 drop-shadow-lg' : ''}`}>
                    {project.projectNumber}: {project.name}
                  </h2>
                  {project.isSalesEstimate && (
                    <span className="px-2 py-1 text-xs font-semibold bg-yellow-500/20 text-yellow-400 border border-yellow-400/30 rounded-full animate-pulse">
                      Proposed
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-400 mt-1">
                  <span className="flex items-center gap-1">
                    <User className="h-4 w-4" /> {project.pmOwner || 'Unassigned'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" /> {formatDate(project.poDroppedDate || project.startDate)} - {formatDate(project.deliveryDate || project.shipDate || project.estimatedCompletionDate)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" /> {Math.ceil((new Date(project.deliveryDate || project.shipDate || project.estimatedCompletionDate).getTime() - new Date(project.poDroppedDate || project.startDate).getTime()) / (1000 * 60 * 60 * 24))} days
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <ProgressBadge status={projectStatus} size="md" animatePulse={projectStatus === 'Critical'} />
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate(`/project/${projectId}/edit`)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Project
            </Button>
            <Button 
              size="sm"
              onClick={() => {
                setEditTaskId(null);
                setTaskForm({
                  name: '',
                  description: '',
                  dueDate: new Date().toISOString().split('T')[0],
                  milestoneId: milestones[0]?.id || 0
                });
                setTaskDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsArchiveDialogOpen(true)}
              className="text-destructive border-destructive hover:bg-destructive/10"
            >
              <Archive className="h-4 w-4 mr-2" />
              Archive Project
            </Button>
          </div>
        </div>
        
        {/* Project metrics */}
        {/* Department Percentages and Total Hours */}
        <div className="mt-3 mb-2">
          <div className="bg-dark rounded border border-gray-800 p-3 mb-2">
            <div className="text-md font-semibold text-gray-300 mb-2">TOTAL HOURS</div>
            <div className="text-2xl font-bold">{project.totalHours || 40}</div>
          </div>
          
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {(() => {
              // Use the stored percentages directly since they're already redistributed
              const showFab = project.showFabPhase !== undefined ? project.showFabPhase : true;
              const showPaint = project.showPaintPhase !== undefined ? project.showPaintPhase : true;
              const showProduction = project.showProductionPhase !== undefined ? project.showProductionPhase : true;
              const showIt = project.showItPhase !== undefined ? project.showItPhase : true;
              const showNtc = project.showNtcPhase !== undefined ? project.showNtcPhase : true;
              const showQc = project.showQcPhase !== undefined ? project.showQcPhase : true;

              // Get stored percentages (already redistributed)
              const fabPercentage = parseFloat(project.fabPercentage as any) || 0;
              const paintPercentage = parseFloat(project.paintPercentage as any) || 0;
              const productionPercentage = parseFloat(project.productionPercentage as any) || 0;
              const itPercentage = parseFloat(project.itPercentage as any) || 0;
              const ntcPercentage = parseFloat(project.ntcPercentage as any) || 0;
              const qcPercentage = parseFloat(project.qcPercentage as any) || 0;

              return (
                <>
                  {showFab && fabPercentage > 0 && (
                    <div className="bg-dark rounded border border-gray-800 p-2">
                      <div className="text-xs text-gray-400 mb-1">FABRICATION</div>
                      <div className="text-lg font-bold">{fabPercentage.toFixed(2)}%</div>
                    </div>
                  )}
                  {showPaint && paintPercentage > 0 && (
                    <div className="bg-dark rounded border border-gray-800 p-2">
                      <div className="text-xs text-gray-400 mb-1">PAINT</div>
                      <div className="text-lg font-bold">{paintPercentage.toFixed(2)}%</div>
                    </div>
                  )}
                  {showProduction && productionPercentage > 0 && (
                    <div className="bg-dark rounded border border-gray-800 p-2">
                      <div className="text-xs text-gray-400 mb-1">ASSEMBLY</div>
                      <div className="text-lg font-bold">{productionPercentage.toFixed(2)}%</div>
                    </div>
                  )}
                  {showIt && itPercentage > 0 && (
                    <div className="bg-dark rounded border border-gray-800 p-2">
                      <div className="text-xs text-gray-400 mb-1">IT</div>
                      <div className="text-lg font-bold">{itPercentage.toFixed(2)}%</div>
                    </div>
                  )}
                  {showNtc && ntcPercentage > 0 && (
                    <div className="bg-dark rounded border border-gray-800 p-2">
                      <div className="text-xs text-gray-400 mb-1">NTC TESTING</div>
                      <div className="text-lg font-bold">{ntcPercentage.toFixed(2)}%</div>
                    </div>
                  )}
                  {showQc && qcPercentage > 0 && (
                    <div className="bg-dark rounded border border-gray-800 p-2">
                      <div className="text-xs text-gray-400 mb-1">QC</div>
                      <div className="text-lg font-bold">{qcPercentage.toFixed(2)}%</div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-5 gap-6">
          <div className="col-span-1">
            <div className="text-sm text-gray-400 mb-1">Project Health</div>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{projectHealth.score}<span className="text-sm">/100</span></div>
              <div className={`text-white rounded px-1.5 text-xs flex items-center ${
                projectHealth.change > 0 ? 'bg-green-600' : projectHealth.change < 0 ? 'bg-red-600' : 'bg-gray-600'
              }`}>
                <ArrowLeft className={`h-3 w-3 ${projectHealth.change > 0 ? '-rotate-90' : projectHealth.change < 0 ? 'rotate-90' : 'rotate-0'}`} /> 
                {projectHealth.change > 0 ? '+' : ''}{projectHealth.change}
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Risk: <span className={`font-medium ${
                projectHealth.breakdown.overallRisk === 'Critical' ? 'text-red-400' :
                projectHealth.breakdown.overallRisk === 'High' ? 'text-orange-400' :
                projectHealth.breakdown.overallRisk === 'Medium' ? 'text-yellow-400' : 'text-green-400'
              }`}>
                {projectHealth.breakdown.overallRisk}
              </span>
            </div>
          </div>
          
          <div className="col-span-1">
            <div className="text-sm text-gray-400 mb-1">Progress</div>
            <div className="flex items-center gap-3">
              <InteractiveProgressSlider 
                value={parseFloat((project as any)?.percentComplete || '0')}
                onChange={updateProjectProgress}
                className="w-32"
              />
              <span className="text-lg font-bold">{parseFloat(project?.percentComplete || '0').toFixed(0)}%</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Timeline: {projectHealth.breakdown.timelineAdherence}%
            </div>
          </div>
          
          <div className="col-span-1">
            <div className="text-sm text-gray-400 mb-1">Tasks</div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">
                {tasks.filter(t => t.isCompleted).length}/{tasks.length}
              </span>
              <span className="text-sm text-gray-400">completed</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {tasks.length === 0 ? 'No tasks defined' : 
               tasks.filter(t => t.isCompleted).length === tasks.length ? 'All complete' :
               `${tasks.length - tasks.filter(t => t.isCompleted).length} remaining`}
            </div>
          </div>
          
          <div className="col-span-1">
            <div className="text-sm text-gray-400 mb-1">Billing</div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">
                {formatCurrency(billingMilestones
                  .filter(m => m.status === 'paid')
                  .reduce((sum, m) => sum + parseFloat(m.amount), 0)
                )}
              </span>
              <span className="text-sm text-gray-400">/ 
                {formatCurrency(billingMilestones
                  .reduce((sum, m) => sum + parseFloat(m.amount), 0)
                )}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Progress: {projectHealth.breakdown.billingProgress}%
            </div>
          </div>
          
          <div className="col-span-1">
            <div className="text-sm text-gray-400 mb-1">Manufacturing</div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">
                {activeBay ? `Bay ${activeBay.bayNumber}` : 'None'}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeSchedule ? 'bg-blue-600 bg-opacity-20 text-blue-400' : 
                manufacturingSchedules?.some(s => s.projectId === parseInt(projectId) && new Date(s.startDate) > new Date()) ? 
                'bg-yellow-600 bg-opacity-20 text-yellow-400' : 'bg-gray-600 bg-opacity-20 text-gray-400'
              }`}>
                {activeSchedule ? 'In Progress' : 
                 manufacturingSchedules?.some(s => s.projectId === parseInt(projectId) && new Date(s.startDate) > new Date()) ? 
                 'Scheduled' : 'Not Scheduled'}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Status: {projectHealth.breakdown.manufacturingStatus}%
            </div>
          </div>
          
          {/* Timeline Information - Full width row */}
          <div className="col-span-5 -mt-2">
            <ProjectPhaseInfo project={project} />
          </div>
        </div>
      </div>
      
      {/* Task List & Milestones + Sidebar */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-darkCard rounded-xl border border-gray-800">
          <div className="p-4 border-b border-gray-800 flex justify-between items-center">
            <h3 className="font-bold">Project Activities</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>
          
          <Tabs defaultValue="tasks" className="w-full">
            <TabsList className="bg-darkCard h-12 border-b border-gray-800 w-full grid grid-cols-3 rounded-none">
              <TabsTrigger 
                value="tasks" 
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:rounded-none rounded-none"
              >
                Tasks & Milestones
              </TabsTrigger>
              <TabsTrigger 
                value="billing" 
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:rounded-none rounded-none"
              >
                Billing Milestones
              </TabsTrigger>
              <TabsTrigger 
                value="costs" 
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:rounded-none rounded-none"
              >
                Project Cost
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="tasks" className="border-0 m-0 p-0">
              <div className="p-4 flex justify-end border-b border-gray-800">
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditMilestoneId(null);
                      setMilestoneForm({
                        name: '',
                        status: 'In Progress',
                        date: new Date().toISOString().split('T')[0]
                      });
                      setIsMilestoneDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Milestone
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => {
                      setEditTaskId(null);
                      setTaskForm({
                        name: '',
                        description: '',
                        dueDate: new Date().toISOString().split('T')[0],
                        milestoneId: milestones[0]?.id || 0
                      });
                      setTaskDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Task
                  </Button>
                </div>
              </div>
          
          <div className="p-4 space-y-3">
            {milestones.map((milestone) => (
              <React.Fragment key={milestone.id}>
                {/* Milestone */}
                <div className={`border-l-4 ${milestone.color} pl-4 py-2`}>
                  <div className="flex items-center justify-between">
                    <h4 className={`font-bold ${
                      milestone.color === 'border-primary' ? 'text-primary' :
                      milestone.color === 'border-accent' ? 'text-accent' :
                      'text-warning'
                    }`}>
                      {milestone.name}
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{milestone.date}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs 
                        ${milestone.status === 'Completed' 
                          ? 'bg-green-500/20 text-green-400' 
                          : milestone.status === 'In Progress' 
                            ? 'bg-blue-500/20 text-blue-400' 
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}
                      >
                        {milestone.status}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Tasks for this milestone */}
                {milestone.tasks.map((task) => (
                  <div key={task.id} className="pl-6 py-2 border-b border-gray-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center">
                          <Checkbox 
                            checked={task.isCompleted} 
                            className={`h-4 w-4 rounded border ${task.isCompleted ? 'bg-green-500 border-green-500' : 'bg-transparent border-gray-600'}`}
                            onCheckedChange={(checked) => {
                              const isCompleted = !!checked;
                              updateTaskMutation.mutate({
                                id: task.id,
                                data: { 
                                  isCompleted, 
                                  completedDate: isCompleted ? new Date().toISOString() : null 
                                }
                              });
                            }}
                          />
                        </div>
                        <div>
                          <div className={`text-sm ${task.isCompleted ? 'line-through text-gray-400' : ''}`}>
                            {task.name}
                          </div>
                          <div className="text-xs text-gray-400">
                            {task.isCompleted 
                              ? `Completed on ${formatDate(task.completedDate)}${task.completedByUser ? ` by ${task.completedByUser.firstName} ${task.completedByUser.lastName}` : ''}` 
                              : task.assignedToUser 
                                ? `Assigned to ${task.assignedToUser.firstName} ${task.assignedToUser.lastName}${task.dueDate ? ` • Due ${formatDate(task.dueDate)}` : ''}`
                                : task.dueDate 
                                  ? `Due ${formatDate(task.dueDate)}`
                                  : 'No due date'}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => {
                            setEditTaskId(task.id);
                            setTaskForm({
                              name: task.name,
                              description: task.description || '',
                              dueDate: new Date(task.dueDate).toISOString().split('T')[0],
                              milestoneId: milestone.id
                            });
                            setTaskDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4 text-gray-400" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8 hover:text-destructive"
                          onClick={() => {
                            setTaskToDelete(task);
                            setDeleteTaskDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-gray-400" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
            </TabsContent>
            
            <TabsContent value="billing" className="border-0 m-0 p-0">
              <BillingMilestonesList projectId={projectId} />
            </TabsContent>
            
            <TabsContent value="costs" className="border-0 m-0 p-0">
              <ProjectCostsList projectId={projectId} />
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="space-y-6">
          {/* AI-powered Project Health Analysis */}
          <ProjectHealthCard projectId={projectId} />

          {/* Project Notes */}
          <Card className="bg-darkCard rounded-xl border border-gray-800">
            <div className="p-4 border-b border-gray-800">
              <h3 className="font-bold">Project Notes</h3>
            </div>
            <div className="p-4">
              <div className="bg-darkInput rounded-lg p-3 text-sm">
                <p>{project.notes || 'No notes available for this project.'}</p>
                {!project.notes && (
                  <p className="mt-3">Click 'Edit Notes' to add project notes and important details.</p>
                )}
              </div>
              <div className="mt-4 flex justify-between">
                <span className="text-xs text-gray-400">Last updated: {formatDate(project.updatedAt)}</span>
                <Button 
                  variant="link" 
                  size="sm" 
                  className="text-primary h-auto p-0"
                  onClick={() => setIsEditNotesDialogOpen(true)}
                >
                  Edit Notes
                </Button>
              </div>
            </div>
          </Card>

          {/* All Excel Data */}
          <Card className="bg-darkCard rounded-xl border border-gray-800">
            <div className="p-4 border-b border-gray-800">
              <h3 className="font-bold">Additional Project Data</h3>
              <p className="text-xs text-gray-400">All original data from Excel import</p>
            </div>
            <div className="p-4 overflow-auto max-h-[600px]">
              {project.rawData && Object.keys(project.rawData).length > 0 ? (
                <div className="bg-darkInput rounded-lg p-3 text-sm">
                  <div className="flex justify-between mb-3 items-center">
                    <input 
                      type="text"
                      placeholder="Search fields..." 
                      className="px-3 py-2 bg-darkCard border border-gray-700 rounded-md max-w-xs w-full text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      onChange={(e) => {
                        const searchTerm = e.target.value.toLowerCase();
                        const rows = document.querySelectorAll('.raw-data-row');
                        rows.forEach(row => {
                          const fieldName = row.querySelector('.field-name')?.textContent?.toLowerCase() || '';
                          const fieldValue = row.querySelector('.field-value')?.textContent?.toLowerCase() || '';
                          
                          if (fieldName.includes(searchTerm) || fieldValue.includes(searchTerm)) {
                            (row as HTMLElement).style.display = '';
                          } else {
                            (row as HTMLElement).style.display = 'none';
                          }
                        });
                      }}
                    />
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          // Only show date fields
                          const rows = document.querySelectorAll('.raw-data-row');
                          rows.forEach(row => {
                            const fieldName = row.querySelector('.field-name')?.textContent?.toLowerCase() || '';
                            if (fieldName.includes('date') || fieldName.includes('eta') || 
                                fieldName.includes('start') || fieldName.includes('completion')) {
                              (row as HTMLElement).style.display = '';
                            } else {
                              (row as HTMLElement).style.display = 'none';
                            }
                          });
                        }}
                      >
                        Dates
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          // Only show percentage fields
                          const rows = document.querySelectorAll('.raw-data-row');
                          rows.forEach(row => {
                            const fieldName = row.querySelector('.field-name')?.textContent?.toLowerCase() || '';
                            if (fieldName.includes('percent') || fieldName.includes('progress') || 
                                fieldName.includes('complete')) {
                              (row as HTMLElement).style.display = '';
                            } else {
                              (row as HTMLElement).style.display = 'none';
                            }
                          });
                        }}
                      >
                        Percentages
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          // Only show fields that aren't in our standard displayed fields
                          const standardFields = [
                            'project_number', 'name', 'description', 'notes', 'pm_owner', 'team', 
                            'location', 'start_date', 'estimated_completion_date', 'actual_completion_date',
                            'percent_complete', 'status', 'contract_date', 'chassis_eta', 'fabrication_start',
                            'assembly_start', 'wrap_date', 'ntc_testing_date', 'qc_start_date', 'qc_days',
                            'executive_review_date', 'ship_date', 'delivery_date', 'dpas_rating', 
                            'stretch_shorten_gears', 'llts_ordered'
                          ];
                          
                          const rows = document.querySelectorAll('.raw-data-row');
                          rows.forEach(row => {
                            const fieldName = row.querySelector('.field-name')?.textContent?.toLowerCase() || '';
                            const isStandardField = standardFields.some(f => 
                              fieldName.includes(f.toLowerCase()) || 
                              fieldName.replace(/_/g, ' ').includes(f.replace(/_/g, ' ').toLowerCase())
                            );
                            
                            if (!isStandardField) {
                              (row as HTMLElement).style.display = '';
                            } else {
                              (row as HTMLElement).style.display = 'none';
                            }
                          });
                        }}
                      >
                        Unique Fields
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          // Show all rows
                          const rows = document.querySelectorAll('.raw-data-row');
                          rows.forEach(row => {
                            (row as HTMLElement).style.display = '';
                          });
                        }}
                      >
                        Show All
                      </Button>
                    </div>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="text-left p-2 font-medium" style={{ width: '30%' }}>Field</th>
                        <th className="text-left p-2 font-medium" style={{ width: '50%' }}>Value</th>
                        <th className="text-left p-2 font-medium" style={{ width: '20%' }}>Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(project.rawData)
                        .sort(([keyA], [keyB]) => keyA.localeCompare(keyB)) // Sort alphabetically
                        .map(([key, value]) => {
                          // Format the value based on its type
                          let formattedValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
                          let typeLabel = typeof value;
                          let typeClass = 'bg-gray-800 text-gray-300';
                          
                          // Format dates
                          if (
                            key.toLowerCase().includes('date') || 
                            key.toLowerCase().includes('eta') ||
                            key.toLowerCase().includes('start') ||
                            key.toLowerCase().includes('completion')
                          ) {
                            try {
                              formattedValue = formatDate(value);
                              typeLabel = 'date';
                              typeClass = 'bg-blue-900/50 text-blue-300';
                            } catch (e) {
                              // Keep original if date formatting fails
                            }
                          }
                          
                          // Format percentages
                          if (
                            key.toLowerCase().includes('percent') &&
                            typeof value === 'number'
                          ) {
                            formattedValue = `${value}%`;
                            typeLabel = 'percentage';
                            typeClass = 'bg-green-900/50 text-green-300';
                          }
                          
                          // Format booleans
                          if (typeof value === 'boolean') {
                            formattedValue = value ? 'Yes' : 'No';
                            typeLabel = 'boolean';
                            typeClass = 'bg-purple-900/50 text-purple-300';
                          }

                          return (
                            <tr key={key} className="border-b border-gray-700/20 hover:bg-gray-800/20 raw-data-row">
                              <td className="p-2 font-medium text-gray-300 field-name">
                                {key}
                              </td>
                              <td className="p-2 field-value">
                                {formattedValue}
                              </td>
                              <td className="p-2">
                                <span className={`px-2 py-0.5 rounded-full text-xs ${typeClass}`}>
                                  {typeLabel}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      }
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-darkInput rounded-lg p-3 text-sm">
                  <p>No additional data available from Excel import.</p>
                </div>
              )}
            </div>
          </Card>
          
          {/* We've moved the Billing Milestones to the tabbed interface */}
          
          {/* Bay Assignment */}
          <Card className="bg-darkCard rounded-xl border border-gray-800">
            <div className="p-4 border-b border-gray-800">
              <h3 className="font-bold">Manufacturing Assignment</h3>
            </div>
            <div className="p-4">
              {activeSchedule ? (
                <div className="bg-darkInput rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg font-bold">Bay {activeBay?.bayNumber || activeSchedule.bayId}</div>
                      <div className="text-sm text-gray-400">
                        {formatDate(activeSchedule.startDate)} - {formatDate(activeSchedule.endDate)}
                      </div>
                    </div>
                    <ProgressBadge status="Active" size="sm" />
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-700 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Usage:</span>
                      <span>
                        {Math.ceil((new Date(activeSchedule.endDate).getTime() - new Date(activeSchedule.startDate).getTime()) / (1000 * 60 * 60 * 24))} days
                      </span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-gray-400">Equipment:</span>
                      <span>{activeSchedule.equipment || 'Standard Equipment'}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-gray-400">Staff:</span>
                      <span>{activeSchedule.staffAssigned || 'Team Alpha (4)'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-darkInput rounded-lg p-3 text-center">
                  <Building2 className="h-12 w-12 mx-auto text-gray-500 mb-2" />
                  <div className="text-sm mb-2">No manufacturing bay currently assigned</div>
                  <div className="text-xs text-gray-400">
                    Schedule production for this project to assign a bay
                  </div>
                </div>
              )}
              
              <div className="flex gap-2 mt-3">
                {!activeSchedule ? (
                  <Button 
                    className="flex-1" 
                    onClick={() => setIsAssignBayDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Assign Manufacturing Bay
                  </Button>
                ) : (
                  <Button variant="outline" className="flex-1">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Assignment
                  </Button>
                )}
                <Button variant="outline" className="flex-1">
                  View Schedule
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
      
      {/* Project Forensics Widget */}
      <div className="mt-6">
        <ProjectForensicsWidget 
          projectId={projectId} 
          className="border-t pt-6"
        />
      </div>

      {/* Manufacturing Bay Assignment Dialog */}
      <Dialog open={isAssignBayDialogOpen} onOpenChange={setIsAssignBayDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Assign Manufacturing Bay</DialogTitle>
            <DialogDescription>
              Schedule production for {project?.name} by assigning a manufacturing bay and time period.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="bay" className="text-right">
                Bay
              </Label>
              <div className="col-span-3">
                <Select
                  value={selectedBayId?.toString() || ""}
                  onValueChange={(value) => setSelectedBayId(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a manufacturing bay" />
                  </SelectTrigger>
                  <SelectContent>
                    {manufacturingBays?.map((bay) => (
                      <SelectItem key={bay.id} value={bay.id.toString()}>
                        Bay {bay.bayNumber} - {bay.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="startDate" className="text-right">
                Start Date
              </Label>
              <div className="col-span-3">
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="endDate" className="text-right">
                End Date
              </Label>
              <div className="col-span-3">
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="equipment" className="text-right">
                Equipment
              </Label>
              <div className="col-span-3">
                <Input
                  id="equipment"
                  value={equipment}
                  onChange={(e) => setEquipment(e.target.value)}
                  placeholder="Equipment requirements"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="staff" className="text-right">
                Staff
              </Label>
              <div className="col-span-3">
                <Input
                  id="staff"
                  value={staffAssigned}
                  onChange={(e) => setStaffAssigned(e.target.value)}
                  placeholder="Staff assigned"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignBayDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (!selectedBayId) {
                  toast({
                    title: "Bay selection required",
                    description: "Please select a manufacturing bay",
                    variant: "destructive",
                  });
                  return;
                }
                
                assignBayMutation.mutate({
                  projectId,
                  bayId: selectedBayId,
                  startDate,
                  endDate,
                  equipment,
                  staffAssigned,
                  status: 'scheduled'
                });
              }}
              disabled={assignBayMutation.isPending}
            >
              {assignBayMutation.isPending ? "Assigning..." : "Assign Bay"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Archive Project Dialog */}
      <Dialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
        <DialogContent className="bg-darkBg border-gray-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              Archive Project
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              This will archive the project and remove it from the active projects list. 
              Archived projects can still be viewed but cannot be modified.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-start">
              <Trash2 className="h-10 w-10 text-destructive mr-4 flex-shrink-0" />
              <div>
                <p className="text-white font-medium">
                  Are you sure you want to archive <span className="font-bold">{project.projectNumber}: {project.name}</span>?
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  This action will move the project to the archive, along with all associated tasks, 
                  billing milestones, and manufacturing schedules.
                </p>
              </div>
            </div>
            
            <div className="bg-gray-900 p-3 rounded-md">
              <Label htmlFor="archiveReason" className="text-sm font-medium mb-2 block">
                Reason for archiving (optional)
              </Label>
              <Input 
                id="archiveReason"
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                placeholder="e.g., Project completed, Contract terminated, etc."
                className="bg-darkInput border-gray-700 focus:border-primary text-white"
              />
            </div>
          </div>
          
          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsArchiveDialogOpen(false)}
              className="border-gray-700 hover:bg-gray-800 hover:text-white"
            >
              Cancel
            </Button>
            
            <Button
              type="button"
              variant="destructive"
              onClick={() => archiveProjectMutation.mutate({ reason: archiveReason })}
              disabled={archiveProjectMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {archiveProjectMutation.isPending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Archiving...
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4 mr-2" />
                  Archive Project
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Task Dialog (Add/Edit) */}
      <Dialog open={isTaskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="sm:max-w-md bg-darkBg border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">{editTaskId ? 'Edit Task' : 'Add Task'}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {editTaskId ? 'Update the task details below.' : 'Add a new task to this project.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="space-y-2">
              <Label htmlFor="taskMilestone" className="text-white">Milestone (optional)</Label>
              <Select
                value={taskForm.milestoneId?.toString() || "0"}
                onValueChange={(value) => setTaskForm({...taskForm, milestoneId: value === "0" ? 0 : parseInt(value)})}
              >
                <SelectTrigger className="bg-darkInput border-gray-800 w-full text-white">
                  <SelectValue placeholder="Select a milestone (optional)" />
                </SelectTrigger>
                <SelectContent className="bg-darkInput border-gray-800">
                  <SelectItem value="0" className="text-white">No milestone (standalone task)</SelectItem>
                  {milestones.map((milestone) => (
                    <SelectItem key={milestone.id} value={milestone.id.toString()} className="text-white">
                      {milestone.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="taskName" className="text-white">Task Name</Label>
              <Input
                id="taskName"
                value={taskForm.name}
                onChange={(e) => setTaskForm({...taskForm, name: e.target.value})}
                className="bg-white border-gray-300 text-black placeholder:text-gray-500"
                placeholder="Test Task"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="taskDescription" className="text-white">Description (optional)</Label>
              <Textarea
                id="taskDescription"
                value={taskForm.description}
                onChange={(e) => setTaskForm({...taskForm, description: e.target.value})}
                className="resize-none bg-darkInput border-gray-800 h-24 text-white placeholder:text-gray-400"
                placeholder="Enter task description"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="taskDueDate" className="text-white">Due Date</Label>
              <Input
                id="taskDueDate"
                type="date"
                value={taskForm.dueDate}
                onChange={(e) => setTaskForm({...taskForm, dueDate: e.target.value})}
                className="bg-white border-gray-300 text-black"
              />
            </div>
          </div>
          <DialogFooter className="flex space-x-2 sm:space-x-0">
            <Button type="button" variant="outline" onClick={() => setTaskDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="button"
              onClick={() => {
                if (!taskForm.name.trim()) {
                  toast({
                    title: "Task name required",
                    description: "Please provide a name for this task",
                    variant: "destructive",
                  });
                  return;
                }
                
                if (editTaskId) {
                  updateTaskMutation.mutate({
                    id: editTaskId,
                    data: taskForm
                  });
                } else {
                  createTaskMutation.mutate({
                    ...taskForm,
                    projectId,
                    milestoneId: taskForm.milestoneId === 0 ? null : taskForm.milestoneId,
                    dueDate: new Date(taskForm.dueDate).toISOString()
                  });
                }
              }}
              disabled={createTaskMutation.isPending || updateTaskMutation.isPending}
            >
              {createTaskMutation.isPending || updateTaskMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editTaskId ? 'Updating...' : 'Creating...'}
                </>
              ) : (editTaskId ? 'Update Task' : 'Create Task')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Task Confirmation Dialog */}
      <Dialog open={isDeleteTaskDialogOpen} onOpenChange={setDeleteTaskDialogOpen}>
        <DialogContent className="sm:max-w-md bg-darkBg border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Task</DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to delete this task? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {taskToDelete && (
            <div className="py-4">
              <div className="bg-darkInput rounded-lg p-3 mb-4">
                <p className="font-medium text-white">{taskToDelete.name}</p>
                {taskToDelete.description && (
                  <p className="text-sm text-gray-400 mt-1">{taskToDelete.description}</p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Due: {formatDate(taskToDelete.dueDate)}
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="flex space-x-2 sm:space-x-0">
            <Button type="button" variant="outline" onClick={() => setDeleteTaskDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="button"
              variant="destructive"
              onClick={() => {
                if (taskToDelete) {
                  deleteTaskMutation.mutate(taskToDelete.id);
                }
              }}
              disabled={deleteTaskMutation.isPending}
            >
              {deleteTaskMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : 'Delete Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add/Edit Milestone Dialog */}
      <Dialog open={isMilestoneDialogOpen} onOpenChange={setIsMilestoneDialogOpen}>
        <DialogContent className="bg-darkBg border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editMilestoneId ? 'Edit Milestone' : 'Add New Milestone'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {editMilestoneId 
                ? 'Update the milestone details below.' 
                : 'Create a new milestone to organize project tasks.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="milestoneName">Milestone Name</Label>
              <Input
                id="milestoneName"
                value={milestoneForm.name}
                onChange={(e) => setMilestoneForm({...milestoneForm, name: e.target.value})}
                className="bg-darkInput border-gray-800"
                placeholder="Enter milestone name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="milestoneStatus">Status</Label>
              <Select
                value={milestoneForm.status}
                onValueChange={(value) => setMilestoneForm({...milestoneForm, status: value})}
              >
                <SelectTrigger className="bg-darkInput border-gray-800 w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-darkInput border-gray-800">
                  <SelectItem value="Upcoming">Upcoming</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="milestoneDate">Target Date</Label>
              <Input
                id="milestoneDate"
                type="date"
                value={milestoneForm.date}
                onChange={(e) => setMilestoneForm({...milestoneForm, date: e.target.value})}
                className="bg-darkInput border-gray-800"
              />
            </div>
          </div>
          
          <DialogFooter className="flex space-x-2 sm:space-x-0">
            <Button type="button" variant="outline" onClick={() => setIsMilestoneDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="button"
              onClick={() => {
                if (!milestoneForm.name.trim()) {
                  toast({
                    title: "Milestone name required",
                    description: "Please provide a name for this milestone",
                    variant: "destructive",
                  });
                  return;
                }
                
                saveMilestoneMutation.mutate({
                  id: editMilestoneId || Date.now(), // Use timestamp as placeholder ID for demo
                  name: milestoneForm.name,
                  status: milestoneForm.status,
                  date: milestoneForm.date,
                  color: editMilestoneId ? 
                    milestones.find(m => m.id === editMilestoneId)?.color || 'border-primary' : 
                    'border-primary'
                });
              }}
              disabled={saveMilestoneMutation.isPending}
            >
              {saveMilestoneMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editMilestoneId ? 'Updating...' : 'Creating...'}
                </>
              ) : (editMilestoneId ? 'Update Milestone' : 'Create Milestone')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Notes Dialog */}
      <Dialog open={isEditNotesDialogOpen} onOpenChange={setIsEditNotesDialogOpen}>
        <DialogContent className="bg-darkBg border-gray-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              Edit Project Notes
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Update notes and important details for {project?.projectNumber}: {project?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="projectNotes" className="text-white">Notes</Label>
              <Textarea
                id="projectNotes"
                value={notesForm.notes}
                onChange={(e) => setNotesForm({...notesForm, notes: e.target.value})}
                className="bg-darkInput border-gray-800 text-white min-h-[200px] resize-none placeholder:text-gray-400"
                placeholder="Enter project notes, important details, or updates..."
              />
              <p className="text-xs text-gray-400">
                Use this space to document important project information, updates, or notes for team members.
              </p>
            </div>
          </div>
          
          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditNotesDialogOpen(false)}
              className="border-gray-700 hover:bg-gray-800 hover:text-white"
            >
              Cancel
            </Button>
            
            <Button
              type="button"
              onClick={() => updateNotesMutation.mutate(notesForm.notes)}
              disabled={updateNotesMutation.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              {updateNotesMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Update Notes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectDetails;
