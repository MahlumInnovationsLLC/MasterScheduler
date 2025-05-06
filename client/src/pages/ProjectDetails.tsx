import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, Link, useLocation } from 'wouter';
import { queryClient } from '@/lib/queryClient';
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
  Trash2,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ProgressBadge } from '@/components/ui/progress-badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatDate, formatCurrency, getProjectStatusColor, getBillingStatusInfo } from '@/lib/utils';
import { AIInsightsModal } from '@/components/AIInsightsModal';
import { ProjectHealthCard } from '@/components/ProjectHealthCard';
import { MilestonesList } from '@/components/MilestonesList';
import { MilestoneDialog } from '@/components/MilestoneDialog';
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
import { apiRequest } from '@/lib/queryClient';
import { addDays } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const ProjectDetails = () => {
  const { id } = useParams();
  const projectId = parseInt(id || "0");
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // Dialog state
  const [isAssignBayDialogOpen, setIsAssignBayDialogOpen] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [isTaskDialogOpen, setTaskDialogOpen] = useState(false);
  const [isDeleteTaskDialogOpen, setDeleteTaskDialogOpen] = useState(false);
  const [isMilestoneDialogOpen, setIsMilestoneDialogOpen] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<any | null>(null);
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
  
  // API Queries
  const { data: project, isLoading: isLoadingProject } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !isNaN(projectId)
  });
  
  const { data: tasks = [], isLoading: isLoadingTasks } = useQuery({
    queryKey: [`/api/projects/${projectId}/tasks`],
    enabled: !isNaN(projectId)
  });
  
  const { data: projectMilestones = [], isLoading: isLoadingMilestones } = useQuery({
    queryKey: [`/api/projects/${projectId}/milestones`],
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

  // Calculate project progress based on tasks and milestones completion
  const calculateProjectProgress = (): number => {
    if (!tasks || tasks.length === 0) return 0;
    
    // Calculate task completion percentage
    const completedTasks = tasks.filter((t: any) => t.isCompleted).length;
    return Math.round((completedTasks / tasks.length) * 100);
  };

  const calculateProjectHealth = (): { score: number; change: number } => {
    if (!project || !tasks || !billingMilestones) return { score: 0, change: 0 };
    
    // Calculate percent of tasks completed
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t: any) => t.isCompleted).length;
    const taskScore = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    // Calculate percent of billing milestones completed
    const totalMilestones = billingMilestones.length;
    const completedMilestones = billingMilestones.filter((m: any) => m.status === 'paid').length;
    const billingScore = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;
    
    // Calculate timeline adherence (whether project is on track)
    const percentComplete = calculateProjectProgress();
    const today = new Date();
    const startDate = new Date(project.startDate);
    const endDate = new Date(project.estimatedCompletionDate);
    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsedDuration = today.getTime() - startDate.getTime();
    const expectedProgress = Math.min(100, Math.max(0, (elapsedDuration / totalDuration) * 100));
    
    // Penalize if behind schedule, reward if ahead of schedule
    const timelineScore = 100 - Math.abs(percentComplete - expectedProgress);
    
    // Calculate overall health score
    const overallScore = (taskScore * 0.4) + (billingScore * 0.3) + (timelineScore * 0.3);
    
    return {
      score: Math.round(overallScore),
      change: 5 // This would be calculated from historical data in a real implementation
    };
  };

  const projectHealth = calculateProjectHealth();
  const { status: projectStatus } = project ? getProjectStatusColor(
    parseFloat(project.percentComplete),
    project.estimatedCompletionDate
  ) : { status: 'Unknown' };

  // Find the active manufacturing schedule if any
  const activeSchedule = manufacturingSchedules?.find((s: any) => s.status === 'in_progress');
  const activeBay = activeSchedule ? manufacturingBays?.find((b: any) => b.id === activeSchedule.bayId) : null;

  // Group tasks by milestone
  const milestones = React.useMemo(() => {
    // Add demo tasks if there are none yet (for UI development purposes only)
    const currentTasks = tasks.length > 0 ? tasks : [
      // Project Kickoff Milestone Tasks
      {
        id: 1001,
        name: 'Initial requirements gathering',
        description: 'Document the initial project requirements',
        dueDate: '2023-01-15T00:00:00.000Z',
        completedDate: '2023-01-15T00:00:00.000Z',
        isCompleted: true,
        projectId: projectId,
        milestoneId: 1
      },
      {
        id: 1002,
        name: 'Project charter creation',
        description: 'Create and distribute project charter',
        dueDate: '2023-01-16T00:00:00.000Z',
        completedDate: '2023-01-16T00:00:00.000Z',
        isCompleted: true,
        projectId: projectId,
        milestoneId: 1
      },
      {
        id: 1003,
        name: 'Kickoff meeting',
        description: 'Hold project kickoff meeting with stakeholders',
        dueDate: '2023-01-17T00:00:00.000Z',
        completedDate: '2023-01-17T00:00:00.000Z',
        isCompleted: true,
        projectId: projectId,
        milestoneId: 1
      },
      
      // Design Phase Tasks
      {
        id: 1004,
        name: 'Design approval',
        description: 'Get sign-off on final designs',
        dueDate: '2023-02-10T00:00:00.000Z',
        completedDate: '2023-02-11T00:00:00.000Z',
        isCompleted: true,
        projectId: projectId,
        milestoneId: 2
      },
      {
        id: 1005,
        name: 'Materials sourcing',
        description: 'Source all required materials for production',
        dueDate: '2023-02-12T00:00:00.000Z',
        completedDate: '2023-02-12T00:00:00.000Z',
        isCompleted: true,
        projectId: projectId,
        milestoneId: 2
      },
      {
        id: 1006,
        name: 'Production schedule finalization',
        description: 'Finalize production schedule with manufacturing team',
        dueDate: '2023-02-14T00:00:00.000Z',
        completedDate: '2023-02-14T00:00:00.000Z',
        isCompleted: true,
        projectId: projectId,
        milestoneId: 2
      },
      
      // Production Phase Tasks
      {
        id: 1007,
        name: 'Assembly start',
        description: 'Begin assembly of components',
        dueDate: '2023-03-05T00:00:00.000Z',
        completedDate: '2023-03-05T00:00:00.000Z',
        isCompleted: true,
        projectId: projectId,
        milestoneId: 3
      },
      {
        id: 1008,
        name: 'Mid-production review',
        description: 'Conduct mid-production review and quality check',
        dueDate: '2023-04-10T00:00:00.000Z',
        completedDate: null,
        isCompleted: false,
        projectId: projectId,
        milestoneId: 3
      },
      {
        id: 1009,
        name: 'QC inspection',
        description: 'Quality control inspection before delivery',
        dueDate: '2023-05-20T00:00:00.000Z',
        completedDate: null,
        isCompleted: false,
        projectId: projectId,
        milestoneId: 3
      }
    ];
    
    // Simple grouping - in a real app you would likely have a milestone field on tasks
    // or a separate milestones table with relationships
    const milestoneGroups = projectMilestones.length > 0 
      ? projectMilestones.map((milestone: any) => {
          const milestoneTasks = currentTasks.filter((task: any) => task.milestoneId === milestone.id);
          return {
            ...milestone,
            tasks: milestoneTasks,
            color: milestone.isCompleted 
              ? 'border-primary' 
              : milestone.status === 'delayed' 
                ? 'border-warning' 
                : 'border-accent'
          };
        })
      : [
        {
          id: 1,
          name: 'Project Kickoff Milestone',
          status: 'Completed',
          date: '2023-01-15',
          tasks: currentTasks.filter((t: any) => t.milestoneId === 1),
          color: 'border-primary',
          isCompleted: true
        },
        {
          id: 2,
          name: 'Design Phase Complete',
          status: 'Completed',
          date: '2023-02-15',
          tasks: currentTasks.filter((t: any) => t.milestoneId === 2),
          color: 'border-accent',
          isCompleted: true
        },
        {
          id: 3,
          name: 'Production Phase',
          status: 'In Progress',
          date: 'Currently Active',
          tasks: currentTasks.filter((t: any) => t.milestoneId === 3),
          color: 'border-warning',
          isCompleted: false
        }
      ];
    
    return milestoneGroups;
  }, [tasks, projectId, projectMilestones]);

  if (isLoadingProject || isLoadingTasks || isLoadingBilling || isLoadingManufacturing) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" disabled>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-2xl font-bold">Loading Project Details...</h2>
        </div>
        <div className="flex justify-center p-10">
          <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/projects')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-2xl font-bold">Project Not Found</h2>
        </div>
        <div className="bg-destructive/10 text-destructive p-4 rounded-md">
          <p>The requested project could not be found. The project may have been archived or deleted.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/projects')}>
            Return to Projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/projects')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">{project.projectNumber}: {project.name}</h2>
            <ProgressBadge progress={calculateProjectProgress()} className="mt-0.5" />
          </div>
          <div className="text-sm text-gray-400">Status: {projectStatus}</div>
        </div>
      </div>
      
      {/* Project Overview */}
      <div className="flex flex-col space-y-8">
        <div className="bg-darkCard rounded-xl border border-gray-800 p-5">
          <div className="flex justify-between items-start">
            <div className="space-y-1 mb-4">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-sm">Start Date: <span className="text-gray-400">{formatDate(project.startDate)}</span></span>
                <span className="text-gray-500 mx-2">•</span>
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-sm">Est. Completion: <span className="text-gray-400">{formatDate(project.estimatedCompletionDate)}</span></span>
              </div>
              <div className="flex items-center gap-1">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-sm">PM: <span className="text-gray-400">{project.pmOwner || 'Not Assigned'}</span></span>
                <span className="text-gray-500 mx-2">•</span>
                <Building2 className="h-4 w-4 text-gray-400" />
                <span className="text-sm">Customer: <span className="text-gray-400">{project.customer}</span></span>
              </div>
            </div>
            <div className="flex space-x-2 items-center">
              <AIInsightsModal projectId={projectId} />
              <Button variant="outline" size="sm" onClick={() => navigate(`/projects/${projectId}/edit`)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Project
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
          
          <div className="mt-5 flex gap-8">
            <div>
              <div className="text-sm text-gray-400 mb-1">Project Health</div>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold">{projectHealth.score}<span className="text-sm">/100</span></div>
                <div className="bg-success text-success-foreground rounded px-1.5 text-xs flex items-center">
                  <ArrowLeft className="h-3 w-3 rotate-90" /> {projectHealth.change}
                </div>
              </div>
            </div>
            
            <div>
              <div className="text-sm text-gray-400 mb-1">Progress</div>
              <div className="flex items-center gap-3">
                <div className="w-32 bg-gray-800 rounded-full h-2.5">
                  <div 
                    className="bg-success h-2.5 rounded-full" 
                    style={{ width: `${calculateProjectProgress()}%` }}
                  ></div>
                </div>
                <span className="text-lg font-bold">{calculateProjectProgress()}%</span>
              </div>
            </div>
            
            <div>
              <div className="text-sm text-gray-400 mb-1">Tasks</div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">
                  {tasks.filter((t: any) => t.isCompleted).length}/{tasks.length}
                </span>
                <span className="text-sm text-gray-400">completed</span>
              </div>
            </div>
            
            <div>
              <div className="text-sm text-gray-400 mb-1">Billing</div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">{formatCurrency(project.totalValue)}</span>
                <ProjectHealthCard project={project} billingMilestones={billingMilestones} />
              </div>
            </div>
          </div>
        </div>
        
        {/* Manufacturing Bay Assignment */}
        <div className="bg-darkCard rounded-xl border border-gray-800 p-5">
          <h3 className="font-bold mb-4">Manufacturing</h3>
          <Card className="bg-darkCardLight border-gray-800">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 font-bold">
                    <span>Assignment Status</span>
                    <span className="px-2 py-0.5 rounded-full bg-success bg-opacity-20 text-success text-xs">
                      {activeSchedule ? 'Active' : 'Not Scheduled'}
                    </span>
                  </div>
                </div>
              </div>
              
              {activeBay ? (
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Bay</div>
                    <div className="font-semibold">Bay {activeBay.bayNumber}: {activeBay.name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Schedule</div>
                    <div className="font-semibold">{formatDate(activeSchedule.startDate)} - {formatDate(activeSchedule.endDate)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Team</div>
                    <div className="font-semibold">{activeSchedule.staffAssigned || 'Not Assigned'}</div>
                  </div>
                </div>
              ) : (
                <div className="text-gray-400 italic mb-4">
                  This project has not been assigned to a manufacturing bay yet.
                </div>
              )}
              
              <div className="flex gap-2">
                <Button 
                  onClick={() => setIsAssignBayDialogOpen(true)}
                  className="flex-1"
                >
                  {activeBay ? 'Reassign Bay' : 'Assign to Bay'}
                </Button>
                {activeBay && (
                  <Button 
                    variant="outline"
                    className="flex-1"
                  >
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

      {/* Task List & Milestones + Sidebar */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-darkCard rounded-xl border border-gray-800">
          <div className="p-4 border-b border-gray-800 flex justify-between items-center">
            <h3 className="font-bold">Project Progress</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>
          
          <div className="p-4">
            <Tabs defaultValue="milestones" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="milestones">Milestones</TabsTrigger>
                <TabsTrigger value="tasks">Tasks</TabsTrigger>
              </TabsList>
              
              <TabsContent value="milestones" className="space-y-4">
                <div className="flex justify-end mb-4">
                  <Button 
                    size="sm"
                    onClick={() => {
                      setSelectedMilestone(undefined);
                      setIsMilestoneDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Milestone
                  </Button>
                </div>
                <MilestonesList projectId={projectId} />
              </TabsContent>
              
              <TabsContent value="tasks" className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-base font-medium">Project Tasks</h4>
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
                
                <div className="space-y-3">
                  {milestones.map((milestone: any) => (
                    <React.Fragment key={milestone.id}>
                      {/* Milestone Header */}
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
                              ${milestone.status === 'Completed' || milestone.status === 'completed'
                                ? 'bg-green-500/20 text-green-400' 
                                : milestone.status === 'In Progress' || milestone.status === 'in_progress'
                                  ? 'bg-blue-500/20 text-blue-400' 
                                  : 'bg-yellow-500/20 text-yellow-400'
                              }`}
                            >
                              {milestone.status}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 ml-2"
                              onClick={() => {
                                setEditTaskId(null);
                                setTaskForm({
                                  name: '',
                                  description: '',
                                  dueDate: new Date().toISOString().split('T')[0],
                                  milestoneId: milestone.id
                                });
                                setTaskDialogOpen(true);
                              }}
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span className="sr-only">Add Task to Milestone</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Tasks for this milestone */}
                      {milestone.tasks && milestone.tasks.length > 0 ? (
                        milestone.tasks.map((task: any) => (
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
                                      ? `Completed on ${formatDate(task.completedDate)}` 
                                      : `Due ${formatDate(task.dueDate)}`}
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
                                  <Edit className="h-4 w-4" />
                                  <span className="sr-only">Edit</span>
                                </Button>
                                <Button 
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => {
                                    setTaskToDelete(task);
                                    setDeleteTaskDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">Delete</span>
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="pl-6 py-2 text-sm text-gray-400">
                          No tasks for this milestone yet
                          <Button 
                            variant="link" 
                            className="p-0 h-auto text-xs ml-2"
                            onClick={() => {
                              setEditTaskId(null);
                              setTaskForm({
                                name: '',
                                description: '',
                                dueDate: new Date().toISOString().split('T')[0],
                                milestoneId: milestone.id
                              });
                              setTaskDialogOpen(true);
                            }}
                          >
                            Add Task
                          </Button>
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
        
        {/* Sidebar */}
        <div>
          {/* Billing Milestones */}
          <Card className="mb-6">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <h3 className="font-bold">Billing Milestones</h3>
              <Button variant="ghost" size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 space-y-3">
              {billingMilestones.length === 0 ? (
                <div className="text-center text-gray-400 py-4">
                  <div className="text-sm">No billing milestones</div>
                  <Button variant="link" className="mt-1">Add Your First Milestone</Button>
                </div>
              ) : (
                billingMilestones.map((milestone: any) => {
                  const { icon: StatusIcon, color } = getBillingStatusInfo(milestone.status);
                  return (
                    <div key={milestone.id} className="border-b border-gray-800 pb-3 last:border-0 last:pb-0">
                      <div className="flex justify-between">
                        <div className="font-medium">{milestone.name}</div>
                        <div className={`${color} flex items-center text-xs font-medium`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {milestone.status.charAt(0).toUpperCase() + milestone.status.slice(1)}
                        </div>
                      </div>
                      <div className="text-sm text-gray-400 mt-1">{formatCurrency(milestone.amount)}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Due: {formatDate(milestone.dueDate)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
          
          {/* Raw Project Data */}
          <Card>
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <h3 className="font-bold">Project Data</h3>
              <Button variant="ghost" size="icon">
                <FileText className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4">
              <div className="flex justify-between mb-3 items-center">
                <input 
                  type="text"
                  placeholder="Search fields..." 
                  className="px-3 py-2 bg-darkInput border border-gray-700 rounded-md max-w-xs w-full text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
                      // Show all fields
                      const rows = document.querySelectorAll('.raw-data-row');
                      rows.forEach(row => {
                        (row as HTMLElement).style.display = '';
                      });
                    }}
                  >
                    All
                  </Button>
                </div>
              </div>
              
              <div className="divide-y divide-gray-800 text-sm max-h-96 overflow-y-auto">
                {Object.entries(project.rawData || {}).map(([key, value]) => {
                  if (key === 'id' || key === 'createdAt' || key === 'updatedAt') return null;
                  return (
                    <div key={key} className="py-2 flex justify-between raw-data-row">
                      <div className="text-gray-400 field-name">{key}</div>
                      <div className="text-right font-medium field-value">
                        {value === null ? (
                          <span className="text-gray-500 italic">null</span>
                        ) : typeof value === 'object' ? (
                          <span className="text-gray-500 italic">object</span>
                        ) : typeof value === 'boolean' ? (
                          value ? 'true' : 'false'
                        ) : (
                          String(value)
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Task Dialog */}
      <Dialog open={isTaskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editTaskId ? 'Edit Task' : 'Create Task'}</DialogTitle>
            <DialogDescription>
              {editTaskId
                ? 'Update the task details below.'
                : 'Add a new task to track progress on this project.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="taskName" className="text-right">
                Name
              </Label>
              <Input
                id="taskName"
                className="col-span-3 bg-darkInput border-gray-800"
                value={taskForm.name}
                onChange={(e) => setTaskForm({...taskForm, name: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="taskDescription" className="text-right">
                Description
              </Label>
              <Textarea
                id="taskDescription"
                className="col-span-3 bg-darkInput border-gray-800"
                value={taskForm.description}
                onChange={(e) => setTaskForm({...taskForm, description: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="taskDueDate" className="text-right">
                Due Date
              </Label>
              <Input
                id="taskDueDate"
                type="date"
                className="col-span-3 bg-darkInput border-gray-800"
                value={taskForm.dueDate}
                onChange={(e) => setTaskForm({...taskForm, dueDate: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="taskMilestone" className="text-right">
                Milestone
              </Label>
              <Select
                value={taskForm.milestoneId.toString()}
                onValueChange={(value) => setTaskForm({...taskForm, milestoneId: parseInt(value)})}
              >
                <SelectTrigger className="col-span-3 bg-darkInput border-gray-800">
                  <SelectValue placeholder="Select a milestone" />
                </SelectTrigger>
                <SelectContent className="bg-darkInput border-gray-800">
                  {milestones.map((milestone: any) => (
                    <SelectItem key={milestone.id} value={milestone.id.toString()}>
                      {milestone.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (!taskForm.name) {
                  toast({
                    title: "Task name is required",
                    description: "Please provide a name for this task",
                    variant: "destructive",
                  });
                  return;
                }
                
                if (editTaskId) {
                  updateTaskMutation.mutate({
                    id: editTaskId,
                    data: {
                      name: taskForm.name,
                      description: taskForm.description,
                      dueDate: new Date(taskForm.dueDate).toISOString(),
                      milestoneId: taskForm.milestoneId
                    }
                  });
                } else {
                  createTaskMutation.mutate({
                    name: taskForm.name,
                    description: taskForm.description,
                    dueDate: new Date(taskForm.dueDate).toISOString(),
                    milestoneId: taskForm.milestoneId
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
              ) : (
                editTaskId ? 'Update Task' : 'Create Task'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Task Confirmation Dialog */}
      <Dialog open={isDeleteTaskDialogOpen} onOpenChange={setDeleteTaskDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {taskToDelete && (
            <div className="py-4">
              <div className="font-semibold">{taskToDelete.name}</div>
              <div className="text-sm text-gray-400 mt-1">{taskToDelete.description}</div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTaskDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => taskToDelete && deleteTaskMutation.mutate(taskToDelete.id)}
              disabled={deleteTaskMutation.isPending}
            >
              {deleteTaskMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Task'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                    {manufacturingBays?.map((bay: any) => (
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
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="col-span-3 bg-darkInput border-gray-800"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="endDate" className="text-right">
                End Date
              </Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="col-span-3 bg-darkInput border-gray-800"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="equipment" className="text-right">
                Equipment
              </Label>
              <Input
                id="equipment"
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
                className="col-span-3 bg-darkInput border-gray-800"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="staff" className="text-right">
                Staff
              </Label>
              <Input
                id="staff"
                value={staffAssigned}
                onChange={(e) => setStaffAssigned(e.target.value)}
                className="col-span-3 bg-darkInput border-gray-800"
              />
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
                    title: "Manufacturing bay required",
                    description: "Please select a manufacturing bay to assign",
                    variant: "destructive",
                  });
                  return;
                }
                
                if (new Date(startDate) >= new Date(endDate)) {
                  toast({
                    title: "Invalid date range",
                    description: "End date must be after start date",
                    variant: "destructive",
                  });
                  return;
                }
                
                assignBayMutation.mutate({
                  projectId: projectId,
                  bayId: selectedBayId,
                  startDate: startDate,
                  endDate: endDate,
                  equipment: equipment,
                  staffAssigned: staffAssigned,
                  status: 'in_progress'
                });
              }}
              disabled={assignBayMutation.isPending}
            >
              {assignBayMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                'Assign Bay'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Project Dialog */}
      <Dialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Archive Project</DialogTitle>
            <DialogDescription>
              This project will be moved to the archive. You can restore it later if needed.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Label htmlFor="archiveReason" className="block mb-2">
              Reason for archiving (optional)
            </Label>
            <Textarea
              id="archiveReason"
              value={archiveReason}
              onChange={(e) => setArchiveReason(e.target.value)}
              placeholder="Project was completed successfully..."
              className="bg-darkInput border-gray-800 w-full h-24"
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsArchiveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => archiveProjectMutation.mutate({ reason: archiveReason })}
              disabled={archiveProjectMutation.isPending}
            >
              {archiveProjectMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Archiving...
                </>
              ) : (
                'Archive Project'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Milestone Dialog */}
      <MilestoneDialog
        isOpen={isMilestoneDialogOpen}
        onClose={() => setIsMilestoneDialogOpen(false)}
        projectId={projectId}
        milestone={selectedMilestone}
      />
    </div>
  );
};

export default ProjectDetails;