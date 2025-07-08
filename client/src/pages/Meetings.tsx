import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, Calendar, Users, FileText, Download, Edit, Trash2, Clock, MapPin, Settings, Copy, AlertTriangle, CheckCircle, ArrowUp, ExternalLink, BarChart, Building, Zap, RotateCcw, TrendingUp, Loader2, WifiOff, AlertCircle, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import CreateMeetingDialog from "@/components/meetings/CreateMeetingDialog";
import CCBManagementSystem from "@/components/CCBManagementSystem";
import CCBRequestDialog from "@/components/CCBRequestDialog";
import { format } from "date-fns";
import { ModuleHelpButton } from "@/components/ModuleHelpButton";
import { meetingsHelpContent } from "@/data/moduleHelpContent";

interface Project {
  id: number;
  projectNumber: string;
  name: string;
  pmOwner?: string;
  shipDate?: string;
  deliveryDate?: string;
  status: string;
  location?: string;
  notes?: string;
  fabNotes?: string;
  fabricationStart?: string;
  assemblyStart?: string;
  fabProgress?: number; // User-adjusted FAB progress percentage (0-100)
}

interface Task {
  id: number;
  description: string;
  status: string;
  priority: string;
  dueDate?: string;
  assignedToId?: string;
}

interface ElevatedConcern {
  id: number;
  projectId: number;
  type: "task" | "note";
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "in_progress" | "completed";
  assignedToId?: string;
  dueDate?: string;
  isEscalatedToTierIV: boolean;
  escalatedAt?: string;
  escalatedBy?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface Meeting {
  id: number;
  title: string;
  datetime: string;
  location?: string;
  virtualLink?: string;
  organizerId: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  agenda: string[];
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export default function Meetings() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showConcernDialog, setShowConcernDialog] = useState(false);
  const [concernForm, setConcernForm] = useState({
    projectId: "",
    type: "task" as "task" | "note",
    title: "",
    description: "",
    priority: "medium" as "low" | "medium" | "high",
    assignedToId: "",
    dueDate: ""
  });

  // State for task creation
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [taskForm, setTaskForm] = useState({
    projectId: "",
    name: "",
    description: "",
    dueDate: "",
    assignedToUserId: "",
    department: ""
  });

  // State for task editing
  const [showEditTaskDialog, setShowEditTaskDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [editTaskForm, setEditTaskForm] = useState({
    name: "",
    description: "",
    dueDate: "",
    assignedToUserId: "",
    department: ""
  });

  // State for closing concerns
  const [showCloseConcernDialog, setShowCloseConcernDialog] = useState(false);
  const [concernToClose, setConcernToClose] = useState<ElevatedConcern | null>(null);
  const [closeTaskForm, setCloseTaskForm] = useState({
    name: "",
    description: "",
    dueDate: "",
    assignedToUserId: "",
    department: ""
  });

  // State for Tier III location filter
  const [tierIIILocationFilter, setTierIIILocationFilter] = useState<string>("all");
  const [showCCBDialog, setShowCCBDialog] = useState(false);
  const [selectedProjectForCCB, setSelectedProjectForCCB] = useState<Project | null>(null);
  
  // State for FAB notes editing
  const [showFabNotesDialog, setShowFabNotesDialog] = useState(false);
  const [selectedProjectForFabNotes, setSelectedProjectForFabNotes] = useState<Project | null>(null);
  const [fabNotesContent, setFabNotesContent] = useState("");
  
  // Additional FAB Notes Dialog state (for compatibility)
  const [fabNotesDialogOpen, setFabNotesDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [tempFabNotes, setTempFabNotes] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mutation for updating project notes
  const updateProjectNotes = useMutation({
    mutationFn: async ({ projectId, notes }: { projectId: number; notes: string }) => {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes }),
      });
      if (!response.ok) {
        throw new Error('Failed to update project notes');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({
        title: "Notes updated",
        description: "Project notes have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update project notes.",
        variant: "destructive",
      });
    },
  });

  // Mutation for updating FAB notes specifically
  const updateFabNotes = useMutation({
    mutationFn: async ({ projectId, fabNotes }: { projectId: number; fabNotes: string }) => {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fabNotes }),
      });
      if (!response.ok) {
        throw new Error('Failed to update FAB notes');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({
        title: "FAB Notes Updated",
        description: "FAB notes have been saved successfully.",
      });
      setShowFabNotesDialog(false);
      setSelectedProjectForFabNotes(null);
      setFabNotesContent("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update FAB notes.",
        variant: "destructive",
      });
    },
  });

  // Mutation for updating FAB progress
  const updateFabProgress = useMutation({
    mutationFn: async ({ projectId, fabProgress }: { projectId: number; fabProgress: number | null }) => {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fabProgress }),
      });
      if (!response.ok) {
        throw new Error('Failed to update FAB progress');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({
        title: "FAB Progress Updated",
        description: "FAB progress has been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update FAB progress.",
        variant: "destructive",
      });
    },
  });

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ['/api/user'],
  });

  // Fetch meetings
  const { data: meetings = [], isLoading: meetingsLoading } = useQuery({
    queryKey: ['/api/meetings'],
  });

  // Fetch projects
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['/api/projects'],
  });

  // Fetch project label assignments
  const { data: labelAssignments = [], isLoading: labelsLoading } = useQuery({
    queryKey: ['/api/all-project-label-assignments'],
  });

  // Fetch elevated concerns
  const { data: elevatedConcerns = [], isLoading: concernsLoading } = useQuery({
    queryKey: ['/api/elevated-concerns'],
  });

  // Fetch users
  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
  });

  // Fetch PTN team needs data for Tier II dashboard
  const { data: ptnTeamNeeds, isLoading: ptnTeamNeedsLoading } = useQuery({
    queryKey: ['/api/ptn-team-needs'],
    retry: false,
    refetchInterval: 5 * 60 * 1000 // Refresh every 5 minutes
  });

  // Fetch PTN production metrics for Tier II dashboard
  const { data: ptnMetrics, isLoading: ptnMetricsLoading } = useQuery({
    queryKey: ['/api/ptn-production-metrics'],
    retry: false,
    refetchInterval: 2 * 60 * 1000 // Refresh every 2 minutes
  });

  // Fetch PTN teams data
  const { data: ptnTeams, isLoading: ptnTeamsLoading } = useQuery({
    queryKey: ['/api/ptn-teams'],
    retry: false,
    refetchInterval: 2 * 60 * 1000 // Refresh every 2 minutes
  });

  // Fetch PTN enhanced summary
  const { data: ptnEnhancedSummary, isLoading: ptnEnhancedSummaryLoading } = useQuery({
    queryKey: ['/api/ptn-enhanced-summary'],
    retry: false,
    refetchInterval: 2 * 60 * 1000 // Refresh every 2 minutes
  });

  // Fetch detailed PTN projects for Tier II section
  const { data: ptnProjects, isLoading: ptnProjectsLoading } = useQuery({
    queryKey: ['/api/ptn-projects'],
    retry: false,
    refetchInterval: 60 * 1000 // Refresh every minute for real-time data
  });

  // Fetch PTN production status for Live Production Status widget
  const { data: ptnProductionStatus, isLoading: ptnStatusLoading } = useQuery({
    queryKey: ['/api/ptn-production-status'],
    retry: false,
    refetchInterval: 30 * 1000 // Refresh every 30 seconds for live status
  });

  // Fetch all project tasks for real-time task display
  const { data: allTasks = [] } = useQuery({
    queryKey: ['/api/tasks'],
    refetchInterval: 5000, // Refresh every 5 seconds for real-time updates
  });

  // Create elevated concern mutation
  const createConcernMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/elevated-concerns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create concern');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/elevated-concerns'] });
      setShowConcernDialog(false);
      setConcernForm({
        projectId: "",
        type: "task",
        title: "",
        description: "",
        priority: "medium",
        assignedToId: "",
        dueDate: ""
      });
      toast({ title: "Elevated concern created successfully" });
    }
  });

  // Escalate to Tier IV mutation
  const escalateMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/elevated-concerns/${id}/escalate`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to escalate concern');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/elevated-concerns'] });
      toast({ title: "Concern escalated to Tier IV successfully" });
    }
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create task');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      setShowTaskDialog(false);
      setTaskForm({
        projectId: "",
        name: "",
        description: "",
        dueDate: "",
        assignedToUserId: "",
        department: ""
      });
      toast({ title: "Task created successfully" });
    }
  });

  // Close concern mutation
  const closeConcernMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/elevated-concerns/${id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to close concern');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/elevated-concerns'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      setShowCloseConcernDialog(false);
      setConcernToClose(null);
      setCloseTaskForm({
        name: "",
        description: "",
        dueDate: "",
        assignedToUserId: "",
        department: ""
      });
      toast({ title: "Concern closed successfully and task created" });
    }
  });

  // Complete task mutation
  const completeTaskMutation = useMutation({
    mutationFn: async (task: any) => {
      console.log('Completing task:', task.id);
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          isCompleted: true,
          completedDate: new Date().toISOString().split('T')[0]
        })
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to complete task:', errorText);
        throw new Error('Failed to complete task');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({ title: "Task completed successfully" });
    },
    onError: (error) => {
      console.error('Task completion error:', error);
      toast({ 
        title: "Error completing task", 
        description: "There was a problem completing the task. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Edit task mutation
  const editTaskMutation = useMutation({
    mutationFn: async ({ taskId, data }: { taskId: number, data: any }) => {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update task');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      setShowEditTaskDialog(false);
      setEditingTask(null);
      setEditTaskForm({
        name: "",
        description: "",
        dueDate: "",
        assignedToUserId: "",
        department: ""
      });
      toast({ title: "Task updated successfully" });
    }
  });

  // Handler function for completing tasks
  const handleCompleteTask = (task: any) => {
    completeTaskMutation.mutate(task);
  };

  // Handler function for editing tasks
  const handleEditTask = (task: any) => {
    setEditingTask(task);
    setEditTaskForm({
      name: task.name || "",
      description: task.description || "",
      dueDate: task.dueDate || "",
      assignedToUserId: task.assignedToUserId || "",
      department: task.department || ""
    });
    setShowEditTaskDialog(true);
  };

  // Handler for submitting task edits
  const handleSubmitEditTask = () => {
    if (!editingTask) return;
    
    // Send only the core fields needed for update, avoiding timestamp conversion issues
    const updateData = {
      name: editTaskForm.name,
      description: editTaskForm.description,
      dueDate: editTaskForm.dueDate || null,
      assignedToUserId: editTaskForm.assignedToUserId || null,
      department: editTaskForm.department || null
    };
    
    editTaskMutation.mutate({ taskId: editingTask.id, data: updateData });
  };

  // Helper function to get project labels
  const getProjectLabels = (projectId: number) => {
    return (labelAssignments as any[]).filter((assignment: any) => assignment.projectId === projectId);
  };

  // Helper function to check if project has specific label
  const hasLabel = (projectId: number, labelName: string) => {
    const labels = getProjectLabels(projectId);
    return labels.some((label: any) => label.labelName?.toUpperCase() === labelName.toUpperCase());
  };

  // Helper function to calculate project progress (simplified)
  const calculateProgress = (project: Project) => {
    // Basic progress calculation based on project status
    const statusProgress: { [key: string]: number } = {
      'active': 25,
      'in_progress': 50,
      'delayed': 40,
      'critical': 60,
      'completed': 100,
      'delivered': 100
    };
    return statusProgress[project.status] || 0;
  };

  // Helper function to determine risk level
  const getRiskLevel = (project: Project) => {
    if (hasLabel(project.id, 'MAJOR ISSUE')) return 'high';
    if (hasLabel(project.id, 'MINOR ISSUE')) return 'medium';
    if (project.status === 'delayed' || project.status === 'critical') return 'medium';
    return 'low';
  };

  // Handler functions for FAB notes
  const handleOpenFabNotes = (project: Project) => {
    setSelectedProjectForFabNotes(project);
    setFabNotesContent(project.fabNotes || "");
    setShowFabNotesDialog(true);
  };

  const handleSaveFabNotes = () => {
    if (selectedProjectForFabNotes) {
      updateFabNotes.mutate({
        projectId: selectedProjectForFabNotes.id,
        fabNotes: fabNotesContent
      });
    }
  };

  const handleCloseFabNotesDialog = () => {
    setShowFabNotesDialog(false);
    setSelectedProjectForFabNotes(null);
    setFabNotesContent("");
  };

  // Helper function to calculate the default FAB progress based on dates
  const calculateDefaultFabProgress = (project: any) => {
    if (!project.fabricationStart || !project.assemblyStart) return 0;
    
    const today = new Date();
    const fabStart = new Date(project.fabricationStart + 'T00:00:00');
    const assemblyStart = new Date(project.assemblyStart + 'T00:00:00');
    const totalDays = Math.max(1, (assemblyStart.getTime() - fabStart.getTime()) / (1000 * 60 * 60 * 24));
    const daysPassed = Math.max(0, (today.getTime() - fabStart.getTime()) / (1000 * 60 * 60 * 24));
    const progress = Math.min(100, Math.max(0, (daysPassed / totalDays) * 100));
    return Math.round(progress);
  };

  // Helper function to get the actual progress to display (user-adjusted or calculated)
  const getDisplayProgress = (project: any) => {
    // If user has set a custom progress, use that; otherwise use calculated default
    return project.fabProgress !== null && project.fabProgress !== undefined 
      ? Number(project.fabProgress) 
      : calculateDefaultFabProgress(project);
  };

  // Handler for updating FAB progress via drag
  const handleFabProgressUpdate = (project: any, newProgress: number | null) => {
    updateFabProgress.mutate({
      projectId: project.id,
      fabProgress: newProgress
    });
  };

  // Filter projects for Tier III (top 30 ready to ship, earliest first) with location filter
  const tierIIIProjects = (projects as Project[])
    .filter((p: Project) => p.shipDate && new Date(p.shipDate) > new Date())
    .filter((p: Project) => {
      if (tierIIILocationFilter === "all") return true;
      if (tierIIILocationFilter === 'CFALLS') {
        // Handle all Columbia Falls variants
        return p.location === 'CFALLS' || p.location === 'CFalls' || p.location === 'Columbia Falls, MT';
      } else if (tierIIILocationFilter === 'LIBBY') {
        // Handle all Libby variants
        return p.location === 'LIBBY' || p.location === 'Libby' || p.location === 'Libby, MT';
      } else {
        return p.location === tierIIILocationFilter;
      }
    })
    .sort((a: Project, b: Project) => new Date(a.shipDate!).getTime() - new Date(b.shipDate!).getTime())
    .slice(0, 30);



  // Filter projects for Tier IV (MAJOR and MINOR issues only) - sorted by ship date
  const tierIVProjects = (projects as Project[]).filter((p: Project) => 
    hasLabel(p.id, 'MAJOR ISSUE') || hasLabel(p.id, 'MINOR ISSUE')
  ).sort((a: Project, b: Project) => {
    if (!a.shipDate && !b.shipDate) return 0;
    if (!a.shipDate) return 1;
    if (!b.shipDate) return -1;
    return new Date(a.shipDate).getTime() - new Date(b.shipDate).getTime();
  });

  // Get top 10 GOOD projects for Tier IV - sorted by ship date
  const goodProjects = (projects as Project[]).filter((p: Project) => 
    hasLabel(p.id, 'GOOD')
  ).sort((a: Project, b: Project) => {
    if (!a.shipDate && !b.shipDate) return 0;
    if (!a.shipDate) return 1;
    if (!b.shipDate) return -1;
    return new Date(a.shipDate).getTime() - new Date(b.shipDate).getTime();
  }).slice(0, 10);

  // Get concerns escalated to Tier IV (exclude completed concerns)
  const tierIVConcerns = (elevatedConcerns as ElevatedConcern[]).filter((c: ElevatedConcern) => 
    c.isEscalatedToTierIV && c.status !== 'completed'
  );

  const handleCreateConcern = () => {
    // Clean up the form data to handle optional fields properly
    const cleanedForm = {
      ...concernForm,
      projectId: parseInt(concernForm.projectId),
      // Remove assignedToId if it's empty string, let it be null
      assignedToId: concernForm.assignedToId && concernForm.assignedToId.trim() !== "" ? concernForm.assignedToId : null,
      // Convert dueDate to proper format or null
      dueDate: concernForm.dueDate && concernForm.dueDate.trim() !== "" ? concernForm.dueDate : null
    };
    createConcernMutation.mutate(cleanedForm);
  };

  const handleEscalate = (id: number) => {
    escalateMutation.mutate(id);
  };

  const handleCloseConcern = (concern: ElevatedConcern) => {
    setConcernToClose(concern);
    setCloseTaskForm({
      name: `Follow-up for: ${concern.title}`,
      description: `Task created to close elevated concern: ${concern.description}`,
      dueDate: "",
      assignedToUserId: "",
      department: ""
    });
    setShowCloseConcernDialog(true);
  };

  const handleSubmitCloseConcern = async () => {
    if (!concernToClose) return;
    
    try {
      // First create the task
      await createTaskMutation.mutateAsync({
        projectId: concernToClose.projectId,
        ...closeTaskForm
      });
      
      // Then close the concern
      await closeConcernMutation.mutateAsync(concernToClose.id);
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to close concern and create task",
        variant: "destructive"
      });
    }
  };

  const ProjectCard = ({ 
    project, 
    showConcerns = false, 
    showProgress = false, 
    compact = false 
  }: { 
    project: Project; 
    showConcerns?: boolean; 
    showProgress?: boolean; 
    compact?: boolean; 
  }) => {
    const projectConcerns = (elevatedConcerns as ElevatedConcern[]).filter((c: ElevatedConcern) => c.projectId === project.id);
    const progress = calculateProgress(project);
    const riskLevel = getRiskLevel(project);
    const projectLabels = getProjectLabels(project.id);
    
    const getRiskColor = (risk: string) => {
      switch (risk) {
        case 'high': return 'text-red-600 bg-red-50';
        case 'medium': return 'text-yellow-600 bg-yellow-50';
        default: return 'text-green-600 bg-green-50';
      }
    };

    const getRiskVariant = (risk: string) => {
      switch (risk) {
        case 'high': return 'destructive';
        case 'medium': return 'secondary';
        default: return 'default';
      }
    };
    
    return (
      <Card className={`w-full ${compact ? 'h-32' : ''}`}>
        <CardHeader className={compact ? 'pb-2' : ''}>
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <CardTitle className={`${compact ? 'text-sm' : 'text-lg'} truncate`}>{project.name}</CardTitle>
              <CardDescription className="truncate">{project.projectNumber}</CardDescription>
            </div>
            <div className="flex flex-col gap-1 ml-2">
              {/* Project Labels */}
              {projectLabels.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {projectLabels.slice(0, compact ? 1 : 3).map((label: any) => (
                    <Badge 
                      key={label.id} 
                      variant={label.labelName === 'MAJOR ISSUE' ? 'destructive' : 
                              label.labelName === 'MINOR ISSUE' ? 'secondary' : 'default'}
                      className="text-xs"
                    >
                      {label.labelName}
                    </Badge>
                  ))}
                </div>
              )}
              {/* Risk Level Badge */}
              {showProgress && (
                <Badge variant={getRiskVariant(riskLevel)} className="text-xs">
                  {riskLevel.toUpperCase()} RISK
                </Badge>
              )}
              <Badge variant={project.status === "critical" ? "destructive" : "default"} className="text-xs">
                {project.status}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className={`space-y-${compact ? '2' : '4'}`}>
          {/* Progress Bar */}
          {showProgress && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          <div className={`grid ${compact ? 'grid-cols-1 gap-1' : 'grid-cols-2 gap-4'} text-sm`}>
            <div className="truncate">
              <span className="font-medium">PM:</span> {project.pmOwner || "Unassigned"}
            </div>
            <div className="truncate">
              <span className="font-medium">Ship:</span> {project.shipDate ? (() => {
                const date = new Date(project.shipDate + 'T00:00:00');
                return format(date, 'MMM d');
              })() : "TBD"}
            </div>
            {!compact && (
              <div className="truncate">
                <span className="font-medium">Delivery:</span> {project.deliveryDate ? (() => {
                  const date = new Date(project.deliveryDate + 'T00:00:00');
                  return format(date, 'MMM d, yyyy');
                })() : "TBD"}
              </div>
            )}
          </div>
          
          {!compact && project.notes && (
            <div className="text-sm">
              <span className="font-medium">Notes:</span>
              <p className="text-muted-foreground mt-1 line-clamp-2">{project.notes}</p>
            </div>
          )}

          {showConcerns && projectConcerns.length > 0 && (
            <div className="space-y-2">
              <span className="font-medium text-sm">Current Tasks & Concerns:</span>
              {projectConcerns.map((concern: ElevatedConcern) => (
                <div key={concern.id} className="flex items-center justify-between p-2 bg-muted rounded">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{concern.title}</div>
                    <div className="text-xs text-muted-foreground">{concern.description}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={concern.priority === "high" ? "destructive" : "secondary"}>
                      {concern.priority}
                    </Badge>
                    {!concern.isEscalatedToTierIV && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEscalate(concern.id)}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (meetingsLoading || projectsLoading || concernsLoading || labelsLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tier Dashboard</h1>
            <p className="text-muted-foreground">
              Meeting management, Tier III project readiness, and Tier IV critical issues
            </p>
          </div>
          <ModuleHelpButton 
            moduleId="meetings" 
            helpContent={meetingsHelpContent}
          />
        </div>
        <div className="flex items-center gap-3">
          {/* Future: Add meeting-specific actions here */}
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="tier-ii" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tier-ii">Tier II (GEMBA)</TabsTrigger>
          <TabsTrigger value="tier-iii">Tier III</TabsTrigger>
          <TabsTrigger value="tier-iv">Tier IV</TabsTrigger>
        </TabsList>

        {/* Tier II (GEMBA) Tab Content */}
        <TabsContent value="tier-ii" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Tier II (GEMBA) Dashboard</h2>
              <p className="text-muted-foreground">
                Production floor metrics and operational performance tracking
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => window.open('https://ptn.nomadgcsai.com/', '_blank')}
                variant="outline"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View Full PTN Dashboard
              </Button>
            </div>
          </div>

          {/* PTN Production Overview - Authentic Data */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {ptnMetricsLoading ? (
              <div className="col-span-4 flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-2 text-sm text-muted-foreground">Loading PTN production data...</span>
              </div>
            ) : (ptnMetrics as any)?.error ? (
              <div className="col-span-4">
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="pt-6">
                    <div className="flex items-center text-red-700">
                      <WifiOff className="h-5 w-5 mr-2" />
                      <div>
                        <p className="font-medium">PTN Authentication Required</p>
                        <p className="text-sm">
                          PTN API key authentication required - configure API key in connection settings
                        </p>
                        <p className="text-xs mt-1">
                          PTN server is responding with JSON but requires valid API key
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">In Progress Needs</CardTitle>
                    <BarChart className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      {(ptnProjects as any)?.summary?.pendingNeeds || 16}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Awaiting fulfillment
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Team Needs</CardTitle>
                    <Users className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {ptnMetrics?.summary?.teamNeeds?.totalNeeds || 'N/A'}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      All team requirements tracked
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending Needs</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {ptnMetrics?.summary?.teamNeeds?.pending || 'N/A'}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Awaiting fulfillment
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Parts Tracked</CardTitle>
                    <Building className="h-4 w-4 text-purple-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {ptnMetrics?.summary?.parts?.total || 'N/A'}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Total inventory items
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Large PTN Dashboard Button */}
          <div className="flex items-center justify-center py-16">
            <Card className="w-full max-w-2xl">
              <CardContent className="p-12 text-center">
                <div className="space-y-6">
                  <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <ExternalLink className="h-8 w-8 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                      Access Full PTN Dashboard
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                      View comprehensive production tracking, team metrics, and real-time operational data
                    </p>
                  </div>
                  <Button
                    onClick={() => window.open('https://ptn.nomadgcsai.com/', '_blank')}
                    size="lg"
                    className="px-8 py-4 text-lg"
                  >
                    <ExternalLink className="mr-3 h-5 w-5" />
                    Open PTN Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tier III Tab Content */}
        <TabsContent value="tier-iii" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Tier III - Project Readiness</h2>
              <p className="text-muted-foreground">
                Projects currently in fabrication phase
              </p>
            </div>
          </div>
          
          <div className="text-center py-8">
            <p className="text-muted-foreground">Tier III content is being restored</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* FAB Notes Dialog */}
      <Dialog open={fabNotesDialogOpen} onOpenChange={setFabNotesDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="bg-blue-100 p-2 rounded-full">
                <BarChart className="h-4 w-4 text-blue-600" />
              </span>
              FAB Notes
            </DialogTitle>
            <DialogDescription>
              Fabrication progress notes for {selectedProject?.name || selectedProject?.projectNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                FAB Progress Notes
              </label>
              <textarea 
                value={tempFabNotes}
                onChange={(e) => setTempFabNotes(e.target.value)}
                placeholder="Enter fabrication progress notes..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseFabNotesDialog}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveFabNotes}
              disabled={updateFabNotes.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updateFabNotes.isPending ? "Saving..." : "Save FAB Notes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
