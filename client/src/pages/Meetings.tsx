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
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...task,
          isCompleted: true,
          completedDate: new Date().toISOString().split('T')[0]
        })
      });
      if (!response.ok) throw new Error('Failed to complete task');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({ title: "Task completed successfully" });
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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meetings Dashboard</h1>
          <p className="text-muted-foreground">
            Meeting management, Tier III project readiness, and Tier IV critical issues
          </p>
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

          {/* Production Status Cards */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-blue-600" />
                  Live Production Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {ptnStatusLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading production status...</span>
                  </div>
                ) : (ptnProductionStatus as any)?.error ? (
                  <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center text-yellow-700">
                      <WifiOff className="h-4 w-4 mr-2" />
                      <div>
                        <p className="text-sm font-medium">PTN Connection Issue</p>
                        <p className="text-xs">{ptnProductionStatus.error}</p>
                      </div>
                    </div>
                  </div>
                ) : ptnProductionStatus?.status === 'connected' ? (
                  <div className="space-y-4">
                    {/* Active Alerts Summary */}
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                        <div>
                          <p className="text-sm font-medium text-green-800">
                            {ptnProductionStatus.activeAlerts === 0 ? 'No Active Alerts' : `${ptnProductionStatus.activeAlerts} Active Alerts`}
                          </p>
                          <p className="text-xs text-green-600">
                            {ptnProductionStatus.criticalIssues === 0 ? 'All teams operating normally' : `${ptnProductionStatus.criticalIssues} critical issues`}
                          </p>
                        </div>
                      </div>
                      <Badge variant={ptnProductionStatus.activeAlerts === 0 ? "default" : "destructive"}>
                        {ptnProductionStatus.activeAlerts === 0 ? 'NORMAL' : 'ALERTS'}
                      </Badge>
                    </div>

                    {/* Active Projects Summary */}
                    {ptnProductionStatus.projects && ptnProductionStatus.projects.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Active PTN Projects</h4>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                            {(ptnProductionStatus as any).projects.slice(0, 5).map((project: any, index: number) => (
                            <div key={project.id || index} className="flex items-center justify-between p-2 bg-white rounded border">
                              <div className="flex items-center space-x-2">
                                <div className={`w-2 h-2 rounded-full ${project.status === 'active' ? 'bg-green-500' : project.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                                <div>
                                  <p className="text-sm font-medium">{String(project.name || project.project_name || project.displayName || `Project ${index + 1}`)}</p>
                                  <p className="text-xs text-muted-foreground">{String(project.team || project.team_name || 'No team assigned')}</p>
                                </div>
                              </div>
                              <Badge variant={project.status === 'active' ? 'default' : project.status === 'warning' ? 'secondary' : 'destructive'}>
                                {String(project.status || 'UNKNOWN').toUpperCase()}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Teams Status Summary */}
                    {ptnProductionStatus.teams && ptnProductionStatus.teams.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Team Status</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {ptnProductionStatus.teams.slice(0, 4).map((team: any, index: number) => (
                            <div key={team.id || index} className="flex items-center space-x-2 p-2 bg-white rounded border">
                              <div className={`w-2 h-2 rounded-full ${team.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{team.name || `Team ${index + 1}`}</p>
                                <p className="text-xs text-muted-foreground">{team.members || 0} members</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <WifiOff className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">PTN connection unavailable</p>
                    <p className="text-xs text-muted-foreground">Unable to fetch live production data</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  Floor Alerts & Issues
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {ptnTeamNeedsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading alerts...</span>
                  </div>
                ) : ptnTeamNeeds?.error ? (
                  <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center text-yellow-700">
                      <WifiOff className="h-4 w-4 mr-2" />
                      <div>
                        <p className="text-sm font-medium">PTN Connection Issue</p>
                        <p className="text-xs">{ptnTeamNeeds.error}</p>
                      </div>
                    </div>
                  </div>
                ) : ptnTeamNeeds?.pendingNeeds && ptnTeamNeeds.pendingNeeds.length > 0 ? (
                  <div className="space-y-3">
                    {ptnTeamNeeds.pendingNeeds.map((need: any, index: number) => (
                      <div key={index} className="flex justify-between items-center p-3 rounded-lg border bg-orange-50 border-orange-200">
                        <div>
                          <div className="font-medium text-orange-900">
                            {need.title || need.type || 'Production Alert'}
                          </div>
                          <div className="text-sm text-orange-700">
                            {need.description || 'Pending team need requires attention'}
                          </div>
                        </div>
                        <Badge className="bg-orange-100 text-orange-800 text-xs">
                          PENDING
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center text-green-700">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      <p className="text-sm">No active alerts - All teams operating normally</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Overall Production Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="h-5 w-5 text-blue-600" />
                Overall Production Summary
              </CardTitle>
              <CardDescription>
                System-wide metrics from Production Tracking Network
              </CardDescription>
            </CardHeader>
            <CardContent>
              {ptnEnhancedSummaryLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading production summary...</span>
                </div>
              ) : ptnEnhancedSummary?.error ? (
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center text-red-700">
                    <WifiOff className="h-5 w-5 mr-2" />
                    <div>
                      <p className="font-medium">PTN Connection Error</p>
                      <p className="text-sm">
                        {ptnEnhancedSummary.error.includes('Unexpected token') 
                          ? 'PTN enhanced summary endpoint is not available or authentication failed' 
                          : ptnEnhancedSummary.error}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {ptnEnhancedSummary?.summary?.projects?.active || 'N/A'}
                    </div>
                    <div className="text-sm text-muted-foreground">Active Projects</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {ptnEnhancedSummary?.summary?.teamNeeds?.fulfilled || 'N/A'}
                    </div>
                    <div className="text-sm text-muted-foreground">Fulfilled Needs</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {ptnEnhancedSummary?.summary?.teamNeeds?.pending || 'N/A'}
                    </div>
                    <div className="text-sm text-muted-foreground">Pending Needs</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {ptnEnhancedSummary?.summary?.teams?.count || 'N/A'}
                    </div>
                    <div className="text-sm text-muted-foreground">Active Teams</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Individual Team Widgets */}
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Team Status & Needs</h3>
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Refresh Teams
              </Button>
            </div>
            
            {ptnTeamsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-2 text-sm text-muted-foreground">Loading team data...</span>
              </div>
            ) : ptnTeams?.error ? (
              <div className="p-6 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center text-red-700">
                  <WifiOff className="h-5 w-5 mr-2" />
                  <div>
                    <p className="font-medium">Team Data Connection Error</p>
                    <p className="text-sm">
                      {ptnTeams.error.includes('Unexpected token') 
                        ? 'PTN team endpoints are not available or authentication failed' 
                        : ptnTeams.error}
                    </p>
                  </div>
                </div>
              </div>
            ) : ptnTeams?.teams && ptnTeams.teams.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {ptnTeams.teams.map((team: any, index: number) => (
                  <Card key={team.id || index} className="border-l-4 border-l-blue-500">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="truncate">{team.name || `Team ${index + 1}`}</span>
                        <Badge variant={team.status === 'active' ? 'default' : 'secondary'}>
                          {team.status || 'ACTIVE'}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        {team.description || 'Production team'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Team Leads */}
                      {(team.electricalLead || team.assemblyLead) && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-muted-foreground">Team Leads</h4>
                          <div className="space-y-1 text-sm">
                            {team.electricalLead && (
                              <div className="flex items-center gap-2">
                                <Zap className="h-3 w-3 text-yellow-600" />
                                <span>Electrical: {team.electricalLead}</span>
                              </div>
                            )}
                            {team.assemblyLead && (
                              <div className="flex items-center gap-2">
                                <Users className="h-3 w-3 text-blue-600" />
                                <span>Assembly: {team.assemblyLead}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Team Members */}
                      {team.members && team.members.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-muted-foreground">Team Members</h4>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-600" />
                            <span className="text-sm">{team.members.length} members</span>
                          </div>
                        </div>
                      )}

                      {/* Current Needs */}
                      {team.needs && team.needs.length > 0 ? (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-muted-foreground">Current Needs</h4>
                          <div className="space-y-2">
                            {team.needs.slice(0, 3).map((need: any, needIndex: number) => (
                              <div key={needIndex} className="flex items-start gap-2 p-2 bg-yellow-50 rounded border-l-2 border-l-yellow-400">
                                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-yellow-900 truncate">
                                    {need.title || need.type || 'Need'}
                                  </div>
                                  {need.description && (
                                    <div className="text-xs text-yellow-800 truncate">
                                      {need.description}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="text-xs border-yellow-300 text-yellow-800">
                                      {need.priority || 'Medium'}
                                    </Badge>
                                    {need.department && (
                                      <span className="text-xs text-yellow-700">{need.department}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                            {team.needs.length > 3 && (
                              <div className="text-xs text-muted-foreground text-center pt-1">
                                +{team.needs.length - 3} more needs
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex items-center text-green-700">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            <span className="text-sm">No active needs</span>
                          </div>
                        </div>
                      )}

                      {/* Team Analytics */}
                      {team.analytics && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-muted-foreground">Performance</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {team.analytics.projectsAssigned && (
                              <div className="text-center p-2 bg-blue-50 rounded">
                                <div className="font-bold text-blue-600">{team.analytics.projectsAssigned}</div>
                                <div className="text-xs text-muted-foreground">Projects</div>
                              </div>
                            )}
                            {team.analytics.efficiency && (
                              <div className="text-center p-2 bg-green-50 rounded">
                                <div className="font-bold text-green-600">{team.analytics.efficiency}%</div>
                                <div className="text-xs text-muted-foreground">Efficiency</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Last Activity */}
                      {team.lastActivity && (
                        <div className="text-xs text-muted-foreground border-t pt-2">
                          Last activity: {new Date(team.lastActivity).toLocaleString()}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 text-center">
                <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No team data available</p>
              </div>
            )}
          </div>

          {/* Enhanced PTN Projects and Issues Section */}
          <div className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart className="h-5 w-5 text-blue-600" />
                  PTN Projects & Issues Tracking
                </CardTitle>
                <CardDescription>
                  Live production data from PTN system showing active projects, teams, and critical issues
                </CardDescription>
              </CardHeader>
              <CardContent>
                {ptnProjectsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading PTN project data...</span>
                  </div>
                ) : (ptnProjects as any)?.error ? (
                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center text-yellow-700">
                      <WifiOff className="h-5 w-5 mr-2" />
                      <div>
                        <p className="font-medium">PTN Projects Connection Issue</p>
                        <p className="text-sm">{(ptnProjects as any).error}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Projects Grid */}
                    {(ptnProjects as any)?.projects && (ptnProjects as any).projects.length > 0 ? (
                      <div className="space-y-4">
                        <h4 className="text-lg font-semibold">Active Projects ({(ptnProjects as any).projects.length})</h4>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {(ptnProjects as any).projects.map((project: any, index: number) => (
                            <Card key={project.id || index} className="border-l-4 border-l-blue-500">
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                  <CardTitle className="text-base truncate">
                                    {String(project.displayName || project.project_name || project.name || project.title || project.project_number || `Project ${project.id || 'Unknown'}`)}
                                  </CardTitle>
                                  <Badge variant={project.status === 'active' ? 'default' : project.status === 'warning' ? 'secondary' : 'destructive'}>
                                    {String(project.status || 'UNKNOWN').toUpperCase()}
                                  </Badge>
                                </div>
                                <CardDescription className="text-sm">
                                  Team: {String(project.team || project.team_name || 'Unassigned')} • Status: {String(project.status || 'Active')}
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                {/* Project Details */}
                                <div className="space-y-2 text-sm">
                                  {project.teamInfo && (
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4 text-blue-600" />
                                        <span>Team: {String(project.teamInfo.name || project.teamInfo.team_name || 'Unassigned')}</span>
                                      </div>
                                      {(project.teamInfo.needs && project.teamInfo.needs.length > 0) && (
                                        <div className="flex items-center gap-2 text-xs">
                                          <AlertCircle className="h-3 w-3 text-orange-500" />
                                          <span className="text-orange-600">Active Needs: {String(project.teamInfo.needs.length)}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  {project.progress !== undefined && (
                                    <div className="flex items-center gap-2">
                                      <TrendingUp className="h-4 w-4 text-green-600" />
                                      <span>Progress: {String(project.progress)}%</span>
                                    </div>
                                  )}
                                  {project.priority && (
                                    <div className="flex items-center gap-2">
                                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                                      <span>Priority: {String(project.priority)}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Active Issues */}
                                {project.activeIssues && project.activeIssues.length > 0 && (
                                  <div className="border-t pt-3">
                                    <h5 className="text-sm font-medium text-red-600 mb-2">Active Issues ({String(project.activeIssues.length)})</h5>
                                    <div className="space-y-1">
                                      {project.activeIssues
                                        .filter((issue: any, index: number, arr: any[]) => 
                                          // Remove duplicates based on title, name, or description
                                          arr.findIndex(i => 
                                            (i.title || i.name || i.description) === 
                                            (issue.title || issue.name || issue.description)
                                          ) === index
                                        )
                                        .slice(0, 3)
                                        .map((issue: any, issueIndex: number) => (
                                        <div key={`${project.id}-issue-${issueIndex}`} className="flex items-center gap-2 text-xs p-2 bg-red-50 dark:bg-red-900/30 rounded">
                                          <AlertCircle className="h-3 w-3 text-red-500" />
                                          <span className="flex-1 text-red-800 dark:text-red-200">{String(issue.title || issue.description || 'Issue reported')}</span>
                                          <Badge variant="destructive" className="text-xs">
                                            {String(issue.severity || 'HIGH')}
                                          </Badge>
                                        </div>
                                      ))}
                                      {(() => {
                                        const uniqueIssues = project.activeIssues.filter((issue: any, index: number, arr: any[]) => 
                                          arr.findIndex(i => 
                                            (i.title || i.name || i.description) === 
                                            (issue.title || issue.name || issue.description)
                                          ) === index
                                        );
                                        return uniqueIssues.length > 3 && (
                                          <p className="text-xs text-muted-foreground">+ {String(uniqueIssues.length - 3)} more issues</p>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                )}

                                {/* Alerts */}
                                {project.alerts && project.alerts.length > 0 && (
                                  <div className="border-t pt-3">
                                    <h5 className="text-sm font-medium text-yellow-600 mb-2">Alerts ({String(project.alerts.length)})</h5>
                                    <div className="space-y-1">
                                      {project.alerts.slice(0, 2).map((alert: any, alertIndex: number) => (
                                        <div key={alertIndex} className="flex items-center gap-2 text-xs p-2 bg-yellow-50 rounded">
                                          <AlertTriangle className="h-3 w-3 text-yellow-500" />
                                          <span className="flex-1">{String(alert.message || 'Alert triggered')}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <BarChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-lg font-medium text-muted-foreground">No Active PTN Projects</p>
                        <p className="text-sm text-muted-foreground">No projects currently tracked in PTN system</p>
                      </div>
                    )}

                    {/* Teams Overview */}
                    {ptnProjects?.teams && ptnProjects.teams.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="text-lg font-semibold">Team Status ({(ptnProjects as any).teams.length})</h4>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                          {(ptnProjects as any).teams.map((team: any, index: number) => (
                            <Card key={team.id || index} className="border-l-4 border-l-green-500">
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                  <CardTitle className="text-base">{String(team.name || `Team ${index + 1}`)}</CardTitle>
                                  <Badge variant={team.status === 'active' ? 'default' : 'secondary'}>
                                    {String(team.status || 'INACTIVE').toUpperCase()}
                                  </Badge>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                <div className="flex items-center gap-2 text-sm">
                                  <Users className="h-4 w-4 text-blue-600" />
                                  <span>{String(team.members || 0)} members</span>
                                </div>
                                
                                {/* Team Projects */}
                                {team.projects && team.projects.length > 0 && (
                                  <div className="space-y-2">
                                    <h6 className="text-sm font-medium text-gray-700">Assigned Projects</h6>
                                    {team.projects.map((project: any, projectIndex: number) => (
                                      <div key={projectIndex} className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded border border-blue-200 dark:border-blue-700">
                                        <div className="flex items-center justify-between mb-1">
                                          <p className="text-sm font-medium text-blue-800 dark:text-blue-200 truncate">
                                            {String(project.project_name || project.name || project.project_number || `Project ${projectIndex + 1}`)}
                                          </p>
                                          <Badge variant="outline" className="text-xs border-blue-300 dark:border-blue-600 text-blue-800 dark:text-blue-200">
                                            {String(project.status || 'ACTIVE').toUpperCase()}
                                          </Badge>
                                        </div>
                                        
                                        {/* Project Needs */}
                                        {project.needs && project.needs.length > 0 && (
                                          <div className="mt-2 space-y-1">
                                            <p className="text-xs font-medium text-orange-600 dark:text-orange-400">Active Needs:</p>
                                            {project.needs.slice(0, 3).map((need: any, needIndex: number) => (
                                              <div key={needIndex} className="flex items-center gap-2 text-xs">
                                                <AlertCircle className="h-3 w-3 text-orange-500" />
                                                <span className="text-orange-700 dark:text-orange-300 truncate">
                                                  {String(need.description || need.title || need.need || `Need ${needIndex + 1}`)}
                                                </span>
                                                {need.priority && (
                                                  <Badge variant="secondary" className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                                                    {String(need.priority).toUpperCase()}
                                                  </Badge>
                                                )}
                                              </div>
                                            ))}
                                            {project.needs.length > 3 && (
                                              <p className="text-xs text-gray-500">+ {project.needs.length - 3} more needs</p>
                                            )}
                                          </div>
                                        )}
                                        
                                        {(!project.needs || project.needs.length === 0) && (
                                          <div className="mt-2 flex items-center gap-2 text-xs">
                                            <CheckCircle className="h-3 w-3 text-green-500" />
                                            <span className="text-green-600 dark:text-green-400">No active needs</span>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                {/* Fallback for teams without projects */}
                                {(!team.projects || team.projects.length === 0) && team.currentProject && (
                                  <div className="space-y-2">
                                    <h6 className="text-sm font-medium text-gray-700 dark:text-gray-300">Current Project</h6>
                                    <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                                      <div className="flex items-center gap-2 text-sm">
                                        <Briefcase className="h-4 w-4 text-green-600" />
                                        <span className="truncate text-gray-900 dark:text-gray-100">{String(team.currentProject)}</span>
                                      </div>
                                      <div className="mt-1 flex items-center gap-2 text-xs">
                                        <CheckCircle className="h-3 w-3 text-green-500" />
                                        <span className="text-green-600 dark:text-green-400">No active needs</span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                
                                {/* No projects message */}
                                {(!team.projects || team.projects.length === 0) && !team.currentProject && (
                                  <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 text-center">
                                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                      <CheckCircle className="h-4 w-4 text-green-500" />
                                      <span>No active projects</span>
                                    </div>
                                  </div>
                                )}
                                
                                {team.efficiency && (
                                  <div className="flex items-center gap-2 text-sm pt-2 border-t">
                                    <TrendingUp className="h-4 w-4 text-orange-600" />
                                    <span>Efficiency: {String(team.efficiency)}%</span>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Global Issues */}
                    {ptnProjects?.issues && ptnProjects.issues.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="text-lg font-semibold text-red-600">System-Wide Issues ({(ptnProjects as any).issues.length})</h4>
                        <div className="space-y-3">
                          {ptnProjects.issues.map((issue: any, index: number) => (
                            <Card key={index} className="border-l-4 border-l-red-500">
                              <CardContent className="pt-4">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <AlertCircle className="h-5 w-5 text-red-500" />
                                    <p className="font-medium">{String(issue.title || 'System Issue')}</p>
                                  </div>
                                  <Badge variant="destructive">
                                    {String(issue.severity || 'HIGH')}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">
                                  {String(issue.description || 'No description available')}
                                </p>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span>Reported: {String(issue.reportedAt || 'Unknown')}</span>
                                  {issue.affectedTeams && (
                                    <span>Affects: {String(issue.affectedTeams)} teams</span>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* PTN System Info */}
          <div className="mt-6 pt-4 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Live data from Production Tracking Network at ptn.nomadgcsai.com
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.open('https://ptn.nomadgcsai.com/', '_blank')}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View Full PTN Dashboard
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Tier III Tab Content */}
        <TabsContent value="tier-iii" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Tier III - Project Readiness</h2>
              <p className="text-muted-foreground">
                Top 30 projects ready to ship, sorted by earliest ship date first
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Location Filter Dropdown */}
              <Select value={tierIIILocationFilter} onValueChange={setTierIIILocationFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  <SelectItem value="LIBBY">LIBBY</SelectItem>
                  <SelectItem value="CFALLS">CFALLS</SelectItem>
                  <SelectItem value="FSW">FSW</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => setShowConcernDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Concern
              </Button>
            </div>
          </div>

          {/* Tier III Statistics */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ready to Ship</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{tierIIIProjects.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Concerns</CardTitle>
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(elevatedConcerns as ElevatedConcern[]).filter((c: ElevatedConcern) => !c.isEscalatedToTierIV).length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Escalated to Tier IV</CardTitle>
                <ArrowUp className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{tierIVConcerns.length}</div>
              </CardContent>
            </Card>
          </div>

          {/* FAB Projects Section - Full Width */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardTitle className="text-lg font-medium">Projects Currently in Fabrication (FAB)</CardTitle>
                <CardDescription>
                  Projects where today's date falls between FAB start and assembly start dates - next phase: Assembly/Production
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                  {(() => {
                    const today = new Date();
                    const projectsInFab = projects.filter(project => {
                      if (!project.fabricationStart || !project.assemblyStart) return false;
                      const fabStart = new Date(project.fabricationStart + 'T00:00:00');
                      const assemblyStart = new Date(project.assemblyStart + 'T00:00:00');
                      const isInFabPhase = today >= fabStart && today < assemblyStart;
                      
                      // Apply location filter
                      if (tierIIILocationFilter !== 'all') {
                        if (tierIIILocationFilter === 'CFALLS') {
                          // Handle all Columbia Falls variants
                          return isInFabPhase && (
                            project.location === 'CFALLS' || 
                            project.location === 'CFalls' || 
                            project.location === 'Columbia Falls, MT'
                          );
                        } else if (tierIIILocationFilter === 'LIBBY') {
                          // Handle all Libby variants
                          return isInFabPhase && (
                            project.location === 'LIBBY' || 
                            project.location === 'Libby' || 
                            project.location === 'Libby, MT'
                          );
                        } else {
                          return isInFabPhase && project.location === tierIIILocationFilter;
                        }
                      }
                      
                      return isInFabPhase;
                    });
                    return projectsInFab.length;
                  })()} in FAB
                </Badge>
                <Settings className="h-5 w-5 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                const today = new Date();
                const projectsInFab = projects.filter(project => {
                  if (!project.fabricationStart || !project.assemblyStart) return false;
                  const fabStart = new Date(project.fabricationStart + 'T00:00:00');
                  const assemblyStart = new Date(project.assemblyStart + 'T00:00:00');
                  const isInFabPhase = today >= fabStart && today < assemblyStart;
                  
                  // Apply location filter
                  if (tierIIILocationFilter !== 'all') {
                    if (tierIIILocationFilter === 'CFALLS') {
                      // Handle all Columbia Falls variants
                      return isInFabPhase && (
                        project.location === 'CFALLS' || 
                        project.location === 'CFalls' || 
                        project.location === 'Columbia Falls, MT'
                      );
                    } else if (tierIIILocationFilter === 'LIBBY') {
                      // Handle all Libby variants
                      return isInFabPhase && (
                        project.location === 'LIBBY' || 
                        project.location === 'Libby' || 
                        project.location === 'Libby, MT'
                      );
                    } else {
                      return isInFabPhase && project.location === tierIIILocationFilter;
                    }
                  }
                  
                  return isInFabPhase;
                });
                
                if (projectsInFab.length === 0) {
                  return (
                    <div className="text-center py-8 text-muted-foreground">
                      <Settings className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="text-lg font-medium">No projects currently in FAB phase</p>
                      <p className="text-sm">Projects will appear here when their dates fall between fabrication start and assembly start</p>
                    </div>
                  );
                }
                
                return (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {projectsInFab.map((project: any) => (
                      <Card key={project.id} className="border-l-4 border-l-blue-500">
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <Link 
                                href={`/project/${project.id}`}
                                className="text-sm font-medium text-blue-700 dark:text-blue-300 hover:underline block"
                              >
                                {project.projectNumber}
                              </Link>
                              <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {project.name}
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs border-blue-300 text-blue-700 bg-blue-50 ml-2">
                              FAB ACTIVE
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground">FAB Started:</span>
                              <span className="font-medium">{format(new Date(project.fabricationStart + 'T00:00:00'), 'MMM d, yyyy')}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground">Next Phase (Assembly):</span>
                              <span className="font-medium text-indigo-600">{format(new Date(project.assemblyStart + 'T00:00:00'), 'MMM d, yyyy')}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground">PM Owner:</span>
                              <span className="font-medium">{project.pmOwner || 'Unassigned'}</span>
                            </div>
                          </div>
                          
                          {/* Progress toward Assembly - Draggable */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">FAB Progress</span>
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">
                                  {getDisplayProgress(project)}%
                                </span>
                                {project.fabProgress !== null && project.fabProgress !== undefined && (
                                  <span className="text-xs text-blue-600 font-medium">(Custom)</span>
                                )}
                              </div>
                            </div>
                            <div 
                              className="relative w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700 cursor-pointer group"
                              onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const clickX = e.clientX - rect.left;
                                const width = rect.width;
                                const newProgress = Math.round((clickX / width) * 100);
                                const clampedProgress = Math.min(100, Math.max(0, newProgress));
                                handleFabProgressUpdate(project, clampedProgress);
                              }}
                            >
                              <div 
                                className="bg-blue-600 h-3 rounded-full transition-all duration-300 relative" 
                                style={{ 
                                  width: `${getDisplayProgress(project)}%`
                                }}
                              >
                                {/* Draggable handle */}
                                <div 
                                  className="absolute right-0 top-1/2 transform -translate-y-1/2 w-5 h-5 bg-blue-700 border-2 border-white rounded-full shadow-lg cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    
                                    const progressBar = e.currentTarget.parentElement?.parentElement;
                                    if (!progressBar) return;
                                    
                                    const handleMouseMove = (moveEvent: MouseEvent) => {
                                      const rect = progressBar.getBoundingClientRect();
                                      const mouseX = moveEvent.clientX - rect.left;
                                      const width = rect.width;
                                      const newProgress = Math.round((mouseX / width) * 100);
                                      const clampedProgress = Math.min(100, Math.max(0, newProgress));
                                      
                                      // Update the visual immediately
                                      const progressFill = progressBar.querySelector('.bg-blue-600') as HTMLElement;
                                      if (progressFill) {
                                        progressFill.style.width = `${clampedProgress}%`;
                                      }
                                    };
                                    
                                    const handleMouseUp = (upEvent: MouseEvent) => {
                                      const rect = progressBar.getBoundingClientRect();
                                      const mouseX = upEvent.clientX - rect.left;
                                      const width = rect.width;
                                      const newProgress = Math.round((mouseX / width) * 100);
                                      const clampedProgress = Math.min(100, Math.max(0, newProgress));
                                      
                                      handleFabProgressUpdate(project, clampedProgress);
                                      
                                      document.removeEventListener('mousemove', handleMouseMove);
                                      document.removeEventListener('mouseup', handleMouseUp);
                                    };
                                    
                                    document.addEventListener('mousemove', handleMouseMove);
                                    document.addEventListener('mouseup', handleMouseUp);
                                  }}
                                />
                              </div>
                              {/* Click instruction tooltip */}
                              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                                Click or drag to adjust progress
                              </div>
                            </div>
                            {/* Reset button for custom progress */}
                            {project.fabProgress !== null && project.fabProgress !== undefined && (
                              <div className="flex justify-center">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-xs h-6 px-2 text-blue-600 hover:text-blue-800"
                                  onClick={() => updateFabProgress.mutate({ projectId: project.id, fabProgress: null })}
                                >
                                  Reset to Auto ({calculateDefaultFabProgress(project)}%)
                                </Button>
                              </div>
                            )}
                          </div>
                          
                          {/* FAB Notes Section */}
                          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">FAB Notes</span>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenFabNotes(project)}
                                className="border-blue-300 text-blue-700 hover:bg-blue-50"
                              >
                                {project.fabNotes ? "Edit" : "Add"}
                              </Button>
                            </div>
                            {project.fabNotes && (
                              <div className="mt-2 text-xs text-muted-foreground bg-blue-50 dark:bg-blue-900/20 p-2 rounded-md">
                                {project.fabNotes.length > 100 ? `${project.fabNotes.substring(0, 100)}...` : project.fabNotes}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Top 20 Ready to Ship Projects */}
          <div className="grid gap-4 grid-cols-1">
            {tierIIIProjects.map((project: Project) => (
              <Card key={project.id} className="w-full border-l-4 border-l-green-500">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0 pr-2">
                      <CardTitle className="text-xl break-words">{project.name}</CardTitle>
                      <Link 
                        href={`/project/${project.id}`}
                        className="text-base text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                      >
                        {project.projectNumber}
                      </Link>
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      {/* Project Labels */}
                      {getProjectLabels(project.id).length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {getProjectLabels(project.id).map((label: any) => (
                            <Badge 
                              key={label.id}
                              className="text-xs"
                              style={{
                                backgroundColor: label.backgroundColor,
                                color: label.textColor,
                                border: `1px solid ${label.backgroundColor}`
                              }}
                            >
                              {label.labelName}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <Badge variant={project.status === "critical" ? "destructive" : "default"}>
                        {project.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm space-y-1">
                    <div className="truncate">
                      <span className="font-medium">PM:</span> {project.pmOwner || "Unassigned"}
                    </div>
                    <div className="truncate">
                      <span className="font-medium">Ship:</span> {project.shipDate ? (() => {
                        const date = new Date(project.shipDate + 'T00:00:00');
                        return format(date, 'MMM d');
                      })() : "TBD"}
                    </div>
                    <div className="truncate">
                      <span className="font-medium">Delivery:</span> {project.deliveryDate ? (() => {
                        const date = new Date(project.deliveryDate + 'T00:00:00');
                        return format(date, 'MMM d, yyyy');
                      })() : "TBD"}
                    </div>
                  </div>

                  {/* Timeline Dates - Horizontal Layout with Icons */}
                  <div className="mt-3 bg-gray-900 border border-gray-700 rounded-lg p-3 overflow-x-auto">
                    <div className="text-xs text-gray-300 mb-3 font-medium">Project Timeline</div>
                    <div className="flex gap-3 min-w-max">
                      {(project as any).contractDate && (
                        <div className="flex items-center gap-1 bg-gray-800 px-2 py-1 rounded whitespace-nowrap">
                          <Clock className="h-3 w-3 text-blue-400" />
                          <div>
                            <div className="text-xs text-gray-400 font-medium">CONTRACT DATE</div>
                            <div className="text-xs text-white">{(() => {
                              try {
                                const date = new Date((project as any).contractDate + 'T00:00:00');
                                return format(date, 'MMM d, yyyy');
                              } catch {
                                return (project as any).contractDate;
                              }
                            })()}</div>
                          </div>
                        </div>
                      )}
                      {(project as any).poDroppedDate && (
                        <div className="flex items-center gap-1 bg-gray-800 px-2 py-1 rounded whitespace-nowrap">
                          <Calendar className="h-3 w-3 text-green-400" />
                          <div>
                            <div className="text-xs text-gray-400 font-medium">TIMELINE START</div>
                            <div className="text-xs text-white">{(() => {
                              try {
                                const date = new Date((project as any).poDroppedDate + 'T00:00:00');
                                return format(date, 'MMM d, yyyy');
                              } catch {
                                return (project as any).poDroppedDate;
                              }
                            })()}</div>
                          </div>
                        </div>
                      )}
                      {(project as any).fabricationStart && (
                        <div className="flex items-center gap-1 bg-gray-800 px-2 py-1 rounded whitespace-nowrap">
                          <Settings className="h-3 w-3 text-blue-400" />
                          <div>
                            <div className="text-xs text-gray-400 font-medium">FAB START</div>
                            <div className="text-xs text-white">{(project as any).fabricationStartText || (() => {
                              try {
                                const date = new Date((project as any).fabricationStart + 'T00:00:00');
                                return format(date, 'MMM d, yyyy');
                              } catch {
                                return (project as any).fabricationStart;
                              }
                            })()}</div>
                          </div>
                        </div>
                      )}
                      {(project as any).assemblyStart && (
                        <div className="flex items-center gap-1 bg-gray-800 px-2 py-1 rounded whitespace-nowrap">
                          <Building className="h-3 w-3 text-indigo-400" />
                          <div>
                            <div className="text-xs text-gray-400 font-medium">ASSEMBLY START</div>
                            <div className="text-xs text-white">{(() => {
                              try {
                                const date = new Date((project as any).assemblyStart + 'T00:00:00');
                                return format(date, 'MMM d, yyyy');
                              } catch {
                                return (project as any).assemblyStart;
                              }
                            })()}</div>
                          </div>
                        </div>
                      )}
                      {(project as any).wrapDate && (
                        <div className="flex items-center gap-1 bg-gray-800 px-2 py-1 rounded whitespace-nowrap">
                          <Copy className="h-3 w-3 text-cyan-400" />
                          <div>
                            <div className="text-xs text-gray-400 font-medium">WRAP DATE</div>
                            <div className="text-xs text-white">{(project as any).wrapDateText || (() => {
                              try {
                                const date = new Date((project as any).wrapDate + 'T00:00:00');
                                return format(date, 'MMM d, yyyy');
                              } catch {
                                return (project as any).wrapDate;
                              }
                            })()}</div>
                          </div>
                        </div>
                      )}
                      {(project as any).ntcTestingDate && (
                        <div className="flex items-center gap-1 bg-gray-800 px-2 py-1 rounded whitespace-nowrap">
                          <Zap className="h-3 w-3 text-purple-400" />
                          <div>
                            <div className="text-xs text-gray-400 font-medium">NTC TESTING</div>
                            <div className="text-xs text-white">{(project as any).ntcTestingDateText || (() => {
                              try {
                                const date = new Date((project as any).ntcTestingDate + 'T00:00:00');
                                return format(date, 'MMM d, yyyy');
                              } catch {
                                return (project as any).ntcTestingDate;
                              }
                            })()}</div>
                          </div>
                        </div>
                      )}
                      {(project as any).qcStartDate && (
                        <div className="flex items-center gap-1 bg-gray-800 px-2 py-1 rounded whitespace-nowrap">
                          <CheckCircle className="h-3 w-3 text-green-400" />
                          <div>
                            <div className="text-xs text-gray-400 font-medium">QC START</div>
                            <div className="text-xs text-white">{(() => {
                              try {
                                const date = new Date((project as any).qcStartDate + 'T00:00:00');
                                return format(date, 'MMM d, yyyy');
                              } catch {
                                return (project as any).qcStartDate;
                              }
                            })()}</div>
                          </div>
                        </div>
                      )}
                      {(project as any).executiveReviewDate && (
                        <div className="flex items-center gap-1 bg-gray-800 px-2 py-1 rounded whitespace-nowrap">
                          <Users className="h-3 w-3 text-yellow-400" />
                          <div>
                            <div className="text-xs text-gray-400 font-medium">EXECUTIVE REVIEW</div>
                            <div className="text-xs text-white">{(() => {
                              try {
                                const date = new Date((project as any).executiveReviewDate + 'T00:00:00');
                                return format(date, 'MMM d, yyyy');
                              } catch {
                                return (project as any).executiveReviewDate;
                              }
                            })()}</div>
                          </div>
                        </div>
                      )}
                      {project.shipDate && (
                        <div className="flex items-center gap-1 bg-gray-800 px-2 py-1 rounded whitespace-nowrap">
                          <MapPin className="h-3 w-3 text-orange-400" />
                          <div>
                            <div className="text-xs text-gray-400 font-medium">SHIP</div>
                            <div className="text-xs text-white">{(() => {
                              try {
                                const date = new Date(project.shipDate + 'T00:00:00');
                                return format(date, 'MMM d, yyyy');
                              } catch {
                                return project.shipDate;
                              }
                            })()}</div>
                          </div>
                        </div>
                      )}
                      {project.deliveryDate && (
                        <div className="flex items-center gap-1 bg-gray-800 px-2 py-1 rounded whitespace-nowrap">
                          <Download className="h-3 w-3 text-red-400" />
                          <div>
                            <div className="text-xs text-gray-400 font-medium">DELIVERY</div>
                            <div className="text-xs text-white">{(() => {
                              try {
                                const date = new Date(project.deliveryDate + 'T00:00:00');
                                return format(date, 'MMM d, yyyy');
                              } catch {
                                return project.deliveryDate;
                              }
                            })()}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {project.notes && (
                    <div className="text-sm">
                      <span className="font-medium">Notes:</span> {project.notes}
                    </div>
                  )}

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Progress</span>
                      <span>{Math.round((project as any).percentComplete || 0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${(project as any).percentComplete || 0}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Risk Level */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Risk Level:</span>
                    <Badge variant={
                      (project as any).riskLevel === "HIGH RISK" ? "destructive" :
                      (project as any).riskLevel === "MEDIUM RISK" ? "secondary" : "default"
                    }>
                      {(project as any).riskLevel || "LOW RISK"}
                    </Badge>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setTaskForm({ 
                          projectId: project.id.toString(), 
                          name: '', 
                          description: '', 
                          dueDate: '', 
                          assignedToUserId: '',
                          department: ''
                        });
                        setShowTaskDialog(true);
                      }}
                    >
                      Add Task
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      className="bg-orange-600 hover:bg-orange-700 text-white"
                      onClick={() => {
                        setSelectedProjectForCCB(project);
                        setShowCCBDialog(true);
                      }}
                    >
                      Submit Schedule CCB
                    </Button>
                  </div>
                  <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-l-4 border-l-yellow-500 dark:border-l-yellow-400">
                    <div className="space-y-2">
                      {(() => {
                        const projectTasks = (allTasks as any[]).filter((task: any) => {
                          return task.projectId === project.id && !task.isCompleted;
                        });
                        
                        return projectTasks.length > 0 ? (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-yellow-800 dark:text-yellow-200">Active Tasks</span>
                              <Badge variant="outline" className="text-xs border-yellow-300 text-yellow-800 dark:border-yellow-400 dark:text-yellow-200">
                                {projectTasks.length} Tasks
                              </Badge>
                            </div>
                            {projectTasks.map((task: any) => (
                              <div key={task.id} className="text-xs border-b border-gray-200 dark:border-gray-700 pb-2 mb-2 last:border-b-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-900 dark:text-gray-100">{task.name}</div>
                                    {task.description && (
                                      <div className="text-gray-700 dark:text-gray-300 mt-1">{task.description}</div>
                                    )}
                                    {task.dueDate && (
                                      <div className="flex items-center gap-1 mt-1">
                                        <span className="font-medium text-gray-600 dark:text-gray-400">Due:</span>
                                        <span className="text-red-600 dark:text-red-400">
                                          {(() => {
                                            // Parse date as local timezone to avoid timezone conversion issues
                                            const date = new Date(task.dueDate + 'T00:00:00');
                                            return format(date, 'MMM d, yyyy');
                                          })()}
                                        </span>
                                      </div>
                                    )}
                                    {task.assignedToUserId && (
                                      <div className="flex items-center gap-1 mt-1">
                                        <span className="font-medium text-gray-600 dark:text-gray-400">Assigned:</span>
                                        <span className="text-gray-700 dark:text-gray-300">
                                          {(users as any[]).find(u => u.id === task.assignedToUserId)?.firstName || 'Unknown'}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-6 px-2 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:hover:bg-blue-800/50 dark:text-blue-300 dark:border-blue-600"
                                      onClick={() => handleEditTask(task)}
                                    >
                                      <Edit className="h-3 w-3 mr-1" />
                                      Edit
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-6 px-2 text-xs bg-green-50 hover:bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:hover:bg-green-800/50 dark:text-green-300 dark:border-green-600"
                                      onClick={() => handleCompleteTask(task)}
                                      disabled={completeTaskMutation.isPending}
                                    >
                                      {completeTaskMutation.isPending ? (
                                        <>
                                          <div className="h-3 w-3 mr-1 animate-spin rounded-full border border-green-600 border-t-transparent" />
                                          Completing...
                                        </>
                                      ) : (
                                        <>
                                          <CheckCircle className="h-3 w-3 mr-1" />
                                          Complete
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </>
                        ) : (
                          <div className="text-center py-2">
                            <span className="text-xs text-gray-600 dark:text-gray-400">NO TASKS</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>



          {/* Elevated Concerns Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Elevated Concerns</h3>
            <div className="grid gap-4">
              {(elevatedConcerns as ElevatedConcern[])
                .filter((c: ElevatedConcern) => !c.isEscalatedToTierIV)
                .map((concern: ElevatedConcern) => {
                  const project = (projects as Project[]).find((p: Project) => p.id === concern.projectId);
                  return (
                    <Card key={concern.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant={concern.type === "task" ? "default" : "secondary"}>
                                {concern.type}
                              </Badge>
                              <Badge variant={concern.priority === "high" ? "destructive" : "secondary"}>
                                {concern.priority}
                              </Badge>
                            </div>
                            <h4 className="font-medium">{concern.title}</h4>
                            <p className="text-sm text-muted-foreground mb-2">{concern.description}</p>
                            <p className="text-xs text-muted-foreground">
                              Project: {project?.name} ({project?.projectNumber})
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEscalate(concern.id)}
                            disabled={escalateMutation.isPending}
                          >
                            <ArrowUp className="h-4 w-4 mr-1" />
                            Escalate to Tier IV
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </div>
        </TabsContent>

        {/* Tier IV Tab Content */}
        <TabsContent value="tier-iv" className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold">Tier IV - Critical Issues</h2>
            <p className="text-muted-foreground">
              MAJOR and MINOR issue projects with escalated concerns from Tier III
            </p>
          </div>

          {/* Tier IV Nested Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="ccb">Change Control Board</TabsTrigger>
              <TabsTrigger value="concerns">Escalated Concerns</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6 mt-6">

          {/* Tier IV Statistics */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Critical Projects</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{tierIVProjects.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Escalated Concerns</CardTitle>
                <ArrowUp className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{tierIVConcerns.length}</div>
              </CardContent>
            </Card>
          </div>

          {/* Top 10 GOOD Projects - Thin cards */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Top 10 GOOD Projects ({goodProjects.length})</h3>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {goodProjects.map((project: Project) => (
                <Card key={project.id} className="w-full h-20 border-l-4 border-l-green-500">
                  <CardContent className="p-3 h-full flex items-center justify-between">
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="font-medium text-sm break-words">{project.name}</div>
                      <Link 
                        href={`/project/${project.id}`}
                        className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline break-words block"
                      >
                        {project.projectNumber}
                      </Link>
                      <div className="text-xs">
                        <span className="font-medium">PM:</span> {project.pmOwner || "Unassigned"} | 
                        <span className="font-medium ml-2">Ship:</span> {project.shipDate ? (() => {
                          const date = new Date(project.shipDate + 'T00:00:00');
                          return format(date, 'MMM d');
                        })() : "TBD"}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 ml-2">
                      <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                        GOOD
                      </Badge>
                      <Badge variant={project.status === "critical" ? "destructive" : "default"} className="text-xs">
                        {project.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Critical Projects - Larger cards for MAJOR and MINOR issues */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Critical Projects ({tierIVProjects.length})</h3>
            <div className="grid gap-4 grid-cols-1">
              {tierIVProjects.map((project: Project) => (
                <Card key={project.id} className="w-full border-l-4 border-l-red-500">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0 pr-2">
                        <CardTitle className="text-xl break-words">{project.name}</CardTitle>
                        <Link 
                          href={`/project/${project.id}`}
                          className="text-base text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                        >
                          {project.projectNumber}
                        </Link>
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        {/* Project Labels */}
                        {getProjectLabels(project.id).length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {getProjectLabels(project.id).map((label: any) => (
                              <Badge 
                                key={label.id} 
                                variant={label.labelName === 'MAJOR ISSUE' ? 'destructive' : 
                                        label.labelName === 'MINOR ISSUE' ? 'secondary' : 'default'}
                                className="text-sm font-semibold"
                              >
                                {label.labelName}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <Badge variant={project.status === "critical" ? "destructive" : "default"} className="text-sm">
                          {project.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Progress</span>
                        <span>{Math.round((project as any).percentComplete || 0)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-red-600 h-3 rounded-full transition-all duration-300" 
                          style={{ width: `${(project as any).percentComplete || 0}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Risk Level */}
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">Risk Level:</span>
                      <Badge variant={getRiskLevel(project) === 'high' ? 'destructive' : 'secondary'} className="text-sm">
                        {getRiskLevel(project).toUpperCase()} RISK
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">PM:</span> {project.pmOwner || "Unassigned"}
                      </div>
                      <div>
                        <span className="font-medium">Ship Date:</span> {project.shipDate ? (() => {
                          const date = new Date(project.shipDate + 'T00:00:00');
                          return format(date, 'MMM d, yyyy');
                        })() : "TBD"}
                      </div>
                      <div>
                        <span className="font-medium">Delivery:</span> {project.deliveryDate ? (() => {
                          const date = new Date(project.deliveryDate + 'T00:00:00');
                          return format(date, 'MMM d, yyyy');
                        })() : "TBD"}
                      </div>
                    </div>

                    {/* Timeline Dates - Horizontal Layout with Icons */}
                    <div className="mt-3 bg-gray-900 border border-red-600 rounded-lg p-3 overflow-x-auto">
                      <div className="text-xs text-red-400 mb-3 font-medium">Critical Project Timeline</div>
                      <div className="flex gap-3 min-w-max">
                        {(project as any).contractDate && (
                          <div className="flex items-center gap-1 bg-red-900/30 border border-red-700 px-2 py-1 rounded whitespace-nowrap">
                            <Clock className="h-3 w-3 text-red-400" />
                            <div>
                              <div className="text-xs text-red-300 font-medium">CONTRACT DATE</div>
                              <div className="text-xs text-white">{(() => {
                                try {
                                  const date = new Date((project as any).contractDate + 'T00:00:00');
                                  return format(date, 'MMM d, yyyy');
                                } catch {
                                  return (project as any).contractDate;
                                }
                              })()}</div>
                            </div>
                          </div>
                        )}
                        {(project as any).poDroppedDate && (
                          <div className="flex items-center gap-1 bg-red-900/30 border border-red-700 px-2 py-1 rounded whitespace-nowrap">
                            <Calendar className="h-3 w-3 text-red-400" />
                            <div>
                              <div className="text-xs text-red-300 font-medium">TIMELINE START</div>
                              <div className="text-xs text-white">{(() => {
                                try {
                                  const date = new Date((project as any).poDroppedDate + 'T00:00:00');
                                  return format(date, 'MMM d, yyyy');
                                } catch {
                                  return (project as any).poDroppedDate;
                                }
                              })()}</div>
                            </div>
                          </div>
                        )}
                        {(project as any).fabricationStart && (
                          <div className="flex items-center gap-1 bg-red-900/30 border border-red-700 px-2 py-1 rounded whitespace-nowrap">
                            <Settings className="h-3 w-3 text-red-400" />
                            <div>
                              <div className="text-xs text-red-300 font-medium">FAB START</div>
                              <div className="text-xs text-white">{(project as any).fabricationStartText || (() => {
                                try {
                                  const date = new Date((project as any).fabricationStart + 'T00:00:00');
                                  return format(date, 'MMM d, yyyy');
                                } catch {
                                  return (project as any).fabricationStart;
                                }
                              })()}</div>
                            </div>
                          </div>
                        )}
                        {(project as any).assemblyStart && (
                          <div className="flex items-center gap-1 bg-red-900/30 border border-red-700 px-2 py-1 rounded whitespace-nowrap">
                            <Building className="h-3 w-3 text-red-400" />
                            <div>
                              <div className="text-xs text-red-300 font-medium">ASSEMBLY START</div>
                              <div className="text-xs text-white">{(() => {
                                try {
                                  const date = new Date((project as any).assemblyStart + 'T00:00:00');
                                  return format(date, 'MMM d, yyyy');
                                } catch {
                                  return (project as any).assemblyStart;
                                }
                              })()}</div>
                            </div>
                          </div>
                        )}
                        {(project as any).wrapDate && (
                          <div className="flex items-center gap-1 bg-red-900/30 border border-red-700 px-2 py-1 rounded whitespace-nowrap">
                            <Copy className="h-3 w-3 text-red-400" />
                            <div>
                              <div className="text-xs text-red-300 font-medium">WRAP DATE</div>
                              <div className="text-xs text-white">{(project as any).wrapDateText || (() => {
                                try {
                                  const date = new Date((project as any).wrapDate + 'T00:00:00');
                                  return format(date, 'MMM d, yyyy');
                                } catch {
                                  return (project as any).wrapDate;
                                }
                              })()}</div>
                            </div>
                          </div>
                        )}
                        {(project as any).ntcTestingDate && (
                          <div className="flex items-center gap-1 bg-red-900/30 border border-red-700 px-2 py-1 rounded whitespace-nowrap">
                            <Zap className="h-3 w-3 text-red-400" />
                            <div>
                              <div className="text-xs text-red-300 font-medium">NTC TESTING</div>
                              <div className="text-xs text-white">{(project as any).ntcTestingDateText || (() => {
                                try {
                                  const date = new Date((project as any).ntcTestingDate + 'T00:00:00');
                                  return format(date, 'MMM d, yyyy');
                                } catch {
                                  return (project as any).ntcTestingDate;
                                }
                              })()}</div>
                            </div>
                          </div>
                        )}
                        {(project as any).qcStartDate && (
                          <div className="flex items-center gap-1 bg-red-900/30 border border-red-700 px-2 py-1 rounded whitespace-nowrap">
                            <CheckCircle className="h-3 w-3 text-red-400" />
                            <div>
                              <div className="text-xs text-red-300 font-medium">QC START</div>
                              <div className="text-xs text-white">{(() => {
                                try {
                                  const date = new Date((project as any).qcStartDate + 'T00:00:00');
                                  return format(date, 'MMM d, yyyy');
                                } catch {
                                  return (project as any).qcStartDate;
                                }
                              })()}</div>
                            </div>
                          </div>
                        )}
                        {(project as any).executiveReviewDate && (
                          <div className="flex items-center gap-1 bg-red-900/30 border border-red-700 px-2 py-1 rounded whitespace-nowrap">
                            <Users className="h-3 w-3 text-red-400" />
                            <div>
                              <div className="text-xs text-red-300 font-medium">EXECUTIVE REVIEW</div>
                              <div className="text-xs text-white">{(() => {
                                try {
                                  const date = new Date((project as any).executiveReviewDate + 'T00:00:00');
                                  return format(date, 'MMM d, yyyy');
                                } catch {
                                  return (project as any).executiveReviewDate;
                                }
                              })()}</div>
                            </div>
                          </div>
                        )}
                        {project.shipDate && (
                          <div className="flex items-center gap-1 bg-red-900/30 border border-red-700 px-2 py-1 rounded whitespace-nowrap">
                            <MapPin className="h-3 w-3 text-red-400" />
                            <div>
                              <div className="text-xs text-red-300 font-medium">SHIP</div>
                              <div className="text-xs text-white">{(() => {
                                try {
                                  const date = new Date(project.shipDate + 'T00:00:00');
                                  return format(date, 'MMM d, yyyy');
                                } catch {
                                  return project.shipDate;
                                }
                              })()}</div>
                            </div>
                          </div>
                        )}
                        {project.deliveryDate && (
                          <div className="flex items-center gap-1 bg-red-900/30 border border-red-700 px-2 py-1 rounded whitespace-nowrap">
                            <Download className="h-3 w-3 text-red-400" />
                            <div>
                              <div className="text-xs text-red-300 font-medium">DELIVERY</div>
                              <div className="text-xs text-white">{(() => {
                                try {
                                  const date = new Date(project.deliveryDate + 'T00:00:00');
                                  return format(date, 'MMM d, yyyy');
                                } catch {
                                  return project.deliveryDate;
                                }
                              })()}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {project.notes && (
                      <div className="text-sm">
                        <span className="font-medium">Notes:</span>
                        <p className="text-muted-foreground mt-1">{project.notes}</p>
                      </div>
                    )}

                    {/* TASK Section */}
                    <div className="text-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">TASK:</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setTaskForm({ ...taskForm, projectId: project.id.toString() });
                            setShowTaskDialog(true);
                          }}
                          className="text-xs h-6 px-2"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Task
                        </Button>
                      </div>
                      <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-l-4 border-l-yellow-500 dark:border-l-yellow-400">
                        <div className="space-y-2">
                          {(() => {
                            const projectTasks = (allTasks as any[]).filter((task: any) => {
                              return task.projectId === project.id && !task.isCompleted;
                            });
                            
                            return projectTasks.length > 0 ? (
                              <>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium text-yellow-800 dark:text-yellow-200">Active Tasks</span>
                                  <Badge variant="outline" className="text-xs border-yellow-300 text-yellow-800 dark:border-yellow-400 dark:text-yellow-200">
                                    {projectTasks.length} Tasks
                                  </Badge>
                                </div>
                                {projectTasks.slice(0, 2).map((task: any) => (
                                  <div key={task.id} className="text-xs">
                                    <div className="font-medium text-gray-900 dark:text-gray-100">{task.name}</div>
                                    {task.description && (
                                      <div className="text-gray-700 dark:text-gray-300 mt-1">{task.description}</div>
                                    )}
                                    {task.dueDate && (
                                      <div className="flex items-center gap-1 mt-1">
                                        <span className="font-medium text-gray-600 dark:text-gray-400">Due:</span>
                                        <span className="text-red-600 dark:text-red-400">
                                          {(() => {
                                            // Parse date as local timezone to avoid timezone conversion issues
                                            const date = new Date(task.dueDate + 'T00:00:00');
                                            return format(date, 'MMM d, yyyy');
                                          })()}
                                        </span>
                                      </div>
                                    )}
                                    {task.assignedToUserId && (
                                      <div className="flex items-center gap-1 mt-1">
                                        <span className="font-medium text-gray-600 dark:text-gray-400">Assigned:</span>
                                        <span className="text-gray-700 dark:text-gray-300">
                                          {(users as any[]).find(u => u.id === task.assignedToUserId)?.firstName || 'Unknown'}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                                {projectTasks.length > 2 && (
                                  <div className="text-xs text-center text-gray-600 dark:text-gray-400 mt-2">
                                    +{projectTasks.length - 2} more tasks
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="text-center py-2">
                                <span className="text-xs text-gray-600 dark:text-gray-400">NO TASKS</span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Current Tasks & Concerns */}
                    {(elevatedConcerns as ElevatedConcern[]).filter((c: ElevatedConcern) => c.projectId === project.id).length > 0 && (
                      <div className="space-y-2">
                        <span className="font-medium text-sm">Current Tasks & Concerns:</span>
                        {(elevatedConcerns as ElevatedConcern[]).filter((c: ElevatedConcern) => c.projectId === project.id).map((concern: ElevatedConcern) => (
                          <div key={concern.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
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
              ))}
            </div>
          </div>


            </TabsContent>

            {/* CCB Tab */}
            <TabsContent value="ccb" className="space-y-6 mt-6">
              <CCBManagementSystem />
            </TabsContent>

            {/* Concerns Tab */}
            <TabsContent value="concerns" className="space-y-6 mt-6">
              <div className="space-y-6">
                {/* Active Escalated Concerns */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-red-700">Tier IV Escalated Concerns</h3>
                      <Badge variant="destructive" className="bg-red-100 text-red-800">
                        {tierIVConcerns.length} Active
                      </Badge>
                    </div>
                  </div>
                  
                  {tierIVConcerns.length === 0 ? (
                    <Card className="border-green-200">
                      <CardContent className="pt-6">
                        <div className="text-center text-green-700">
                          <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                          <p className="font-medium">All escalated concerns have been resolved!</p>
                          <p className="text-sm">No active escalated concerns at this time.</p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-4">
                      {tierIVConcerns.map((concern: ElevatedConcern) => {
                        const project = (projects as Project[]).find((p: Project) => p.id === concern.projectId);
                        return (
                          <Card key={concern.id} className="border-red-200">
                            <CardContent className="pt-6">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="destructive">ESCALATED</Badge>
                                  <Badge variant={concern.type === "task" ? "default" : "secondary"}>
                                    {concern.type}
                                  </Badge>
                                  <Badge variant="destructive">{concern.priority}</Badge>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCloseConcern(concern)}
                                  className="text-green-600 border-green-600 hover:bg-green-50"
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Close
                                </Button>
                              </div>
                              <h4 className="font-medium">{concern.title}</h4>
                              <p className="text-sm text-muted-foreground mb-2">{concern.description}</p>
                              <div className="text-xs text-muted-foreground space-y-1">
                                <p>Project: {project?.name} ({project?.projectNumber})</p>
                                <p>Escalated: {concern.escalatedAt ? format(new Date(concern.escalatedAt), 'MMM d, yyyy h:mm a') : 'N/A'}</p>
                                {concern.dueDate && (
                                  <p>Due: {format(new Date(concern.dueDate), 'MMM d, yyyy h:mm a')}</p>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Recently Closed Concerns */}
                {(() => {
                  const closedConcerns = (elevatedConcerns as ElevatedConcern[]).filter((c: ElevatedConcern) => 
                    c.isEscalatedToTierIV && c.status === 'completed'
                  ).slice(0, 5); // Show last 5 closed concerns
                  
                  if (closedConcerns.length > 0) {
                    return (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-green-700">Recently Closed Concerns</h3>
                        <div className="grid gap-2">
                          {closedConcerns.map((concern: ElevatedConcern) => {
                            const project = (projects as Project[]).find((p: Project) => p.id === concern.projectId);
                            return (
                              <Card key={concern.id} className="border-green-200 bg-green-50">
                                <CardContent className="py-4">
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                        <span className="font-medium text-sm text-gray-900">{concern.title}</span>
                                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 border-green-300">CLOSED</Badge>
                                      </div>
                                      <div className="text-xs text-gray-600 font-medium">
                                        {project?.projectNumber}
                                      </div>
                                    </div>
                                    <div className="text-xs text-gray-700 ml-6">
                                      <p className="mb-1">{concern.description}</p>
                                      <div className="flex items-center gap-4 text-gray-600">
                                        <span>Project: {project?.name}</span>
                                        <span>Priority: {concern.priority}</span>
                                        <span>Closed: {concern.updatedAt ? format(new Date(concern.updatedAt), 'MMM d, h:mm a') : 'Recently'}</span>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* Create Meeting Dialog */}
      {showCreateDialog && (
        <CreateMeetingDialog 
          open={showCreateDialog} 
          onOpenChange={setShowCreateDialog}
        />
      )}

      {/* Create Elevated Concern Dialog */}
      <Dialog open={showConcernDialog} onOpenChange={setShowConcernDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Elevated Concern</DialogTitle>
            <DialogDescription>
              Create a new elevated concern for a project
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="project">Project</Label>
              <Select value={concernForm.projectId} onValueChange={(value) => setConcernForm({...concernForm, projectId: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {tierIIIProjects.map((project: Project) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name} ({project.projectNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="type">Type</Label>
              <Select value={concernForm.type} onValueChange={(value: "task" | "note") => setConcernForm({...concernForm, type: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="note">Note</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={concernForm.title}
                onChange={(e) => setConcernForm({...concernForm, title: e.target.value})}
                placeholder="Enter concern title"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={concernForm.description}
                onChange={(e) => setConcernForm({...concernForm, description: e.target.value})}
                placeholder="Enter detailed description"
              />
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={concernForm.priority} onValueChange={(value: "low" | "medium" | "high") => setConcernForm({...concernForm, priority: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={concernForm.dueDate}
                onChange={(e) => setConcernForm({...concernForm, dueDate: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConcernDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateConcern} disabled={createConcernMutation.isPending}>
              {createConcernMutation.isPending ? "Creating..." : "Create Concern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Creation Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
            <DialogDescription>
              Create a new task for this project that will sync with the project details page.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="task-name" className="text-right">
                Task Name
              </Label>
              <Input
                id="task-name"
                value={taskForm.name}
                onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })}
                className="col-span-3"
                placeholder="Enter task name"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="task-description" className="text-right">
                Description
              </Label>
              <Textarea
                id="task-description"
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                className="col-span-3"
                placeholder="Task description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="task-due-date" className="text-right">
                Due Date
              </Label>
              <Input
                id="task-due-date"
                type="date"
                value={taskForm.dueDate}
                onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="task-assigned" className="text-right">
                Assigned To
              </Label>
              <Select value={taskForm.assignedToUserId} onValueChange={(value) => setTaskForm({ ...taskForm, assignedToUserId: value })}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {(users as any[]).map((user: any) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="task-department" className="text-right">
                Department
              </Label>
              <Select value={taskForm.department} onValueChange={(value) => setTaskForm({ ...taskForm, department: value })}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="engineering">Engineering</SelectItem>
                  <SelectItem value="manufacturing">Manufacturing</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="project_management">Project Management</SelectItem>
                  <SelectItem value="quality_control">Quality Control</SelectItem>
                  <SelectItem value="it">IT</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="executive">Executive</SelectItem>
                  <SelectItem value="planning_analysis">Planning & Analysis</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaskDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                createTaskMutation.mutate({
                  projectId: parseInt(taskForm.projectId),
                  name: taskForm.name,
                  description: taskForm.description,
                  dueDate: taskForm.dueDate || null,
                  assignedToUserId: taskForm.assignedToUserId || null,
                });
              }} 
              disabled={createTaskMutation.isPending || !taskForm.name}
            >
              {createTaskMutation.isPending ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={showEditTaskDialog} onOpenChange={setShowEditTaskDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Modify the task details below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-task-name" className="text-right">
                Task Name
              </Label>
              <Input
                id="edit-task-name"
                value={editTaskForm.name}
                onChange={(e) => setEditTaskForm({ ...editTaskForm, name: e.target.value })}
                className="col-span-3"
                placeholder="Enter task name"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-task-description" className="text-right">
                Description
              </Label>
              <Textarea
                id="edit-task-description"
                value={editTaskForm.description}
                onChange={(e) => setEditTaskForm({ ...editTaskForm, description: e.target.value })}
                className="col-span-3"
                placeholder="Task description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-task-due-date" className="text-right">
                Due Date
              </Label>
              <Input
                id="edit-task-due-date"
                type="date"
                value={editTaskForm.dueDate}
                onChange={(e) => setEditTaskForm({ ...editTaskForm, dueDate: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-task-assigned" className="text-right">
                Assigned To
              </Label>
              <Select value={editTaskForm.assignedToUserId} onValueChange={(value) => setEditTaskForm({ ...editTaskForm, assignedToUserId: value })}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {(users as any[]).map((user: any) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-task-department" className="text-right">
                Department
              </Label>
              <Select value={editTaskForm.department} onValueChange={(value) => setEditTaskForm({ ...editTaskForm, department: value })}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="engineering">Engineering</SelectItem>
                  <SelectItem value="manufacturing">Manufacturing</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="project_management">Project Management</SelectItem>
                  <SelectItem value="quality_control">Quality Control</SelectItem>
                  <SelectItem value="it">IT</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="executive">Executive</SelectItem>
                  <SelectItem value="planning_analysis">Planning & Analysis</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditTaskDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitEditTask}
              disabled={editTaskMutation.isPending || !editTaskForm.name}
            >
              {editTaskMutation.isPending ? "Updating..." : "Update Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Concern Dialog */}
      <Dialog open={showCloseConcernDialog} onOpenChange={setShowCloseConcernDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Close Escalated Concern</DialogTitle>
            <DialogDescription>
              Create a follow-up task to document the resolution before closing this concern.
            </DialogDescription>
          </DialogHeader>
          {concernToClose && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium">{concernToClose.title}</h4>
                <p className="text-sm text-muted-foreground">{concernToClose.description}</p>
              </div>
              
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="close-task-name">Task Name</Label>
                  <Input
                    id="close-task-name"
                    value={closeTaskForm.name}
                    onChange={(e) => setCloseTaskForm({ ...closeTaskForm, name: e.target.value })}
                    placeholder="Enter task name"
                  />
                </div>
                <div>
                  <Label htmlFor="close-task-description">Task Description</Label>
                  <Textarea
                    id="close-task-description"
                    value={closeTaskForm.description}
                    onChange={(e) => setCloseTaskForm({ ...closeTaskForm, description: e.target.value })}
                    placeholder="Describe what was done to resolve this concern"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="close-task-due-date">Due Date</Label>
                    <Input
                      id="close-task-due-date"
                      type="date"
                      value={closeTaskForm.dueDate}
                      onChange={(e) => setCloseTaskForm({ ...closeTaskForm, dueDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="close-task-assigned">Assigned To</Label>
                    <Select value={closeTaskForm.assignedToUserId} onValueChange={(value) => setCloseTaskForm({ ...closeTaskForm, assignedToUserId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                      <SelectContent>
                        {(users as any[]).map((user: any) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.firstName} {user.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="close-task-department">Department</Label>
                  <Select value={closeTaskForm.department} onValueChange={(value) => setCloseTaskForm({ ...closeTaskForm, department: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="engineering">Engineering</SelectItem>
                      <SelectItem value="manufacturing">Manufacturing</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="project_management">Project Management</SelectItem>
                      <SelectItem value="quality_control">Quality Control</SelectItem>
                      <SelectItem value="it">IT</SelectItem>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="executive">Executive</SelectItem>
                      <SelectItem value="planning_analysis">Planning & Analysis</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseConcernDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitCloseConcern}
              disabled={closeConcernMutation.isPending || createTaskMutation.isPending || !closeTaskForm.name || !closeTaskForm.description}
              className="bg-green-600 hover:bg-green-700"
            >
              {(closeConcernMutation.isPending || createTaskMutation.isPending) ? "Processing..." : "Close Concern & Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CCB Request Dialog */}
      {selectedProjectForCCB && (
        <CCBRequestDialog
          project={selectedProjectForCCB}
          open={showCCBDialog}
          onClose={() => {
            setShowCCBDialog(false);
            setSelectedProjectForCCB(null);
          }}
        />
      )}

      {/* FAB Notes Dialog */}
      <Dialog open={showFabNotesDialog} onOpenChange={setShowFabNotesDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              FAB Notes - {selectedProjectForFabNotes?.projectNumber}
            </DialogTitle>
            <DialogDescription>
              Add or edit FAB-specific notes for {selectedProjectForFabNotes?.name}. These notes are separate from general project notes and only appear in the FAB section.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fab-notes">FAB Notes</Label>
              <Textarea
                id="fab-notes"
                placeholder="Enter FAB-specific notes, observations, or important information..."
                value={fabNotesContent}
                onChange={(e) => setFabNotesContent(e.target.value)}
                rows={8}
                className="resize-none"
              />
              <div className="text-xs text-muted-foreground">
                These notes will only be visible in the Tier III FAB section and are separate from general project notes.
              </div>
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