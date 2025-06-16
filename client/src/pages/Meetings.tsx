import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, Calendar, Users, FileText, Download, Edit, Trash2, Clock, MapPin, Settings, Copy, AlertTriangle, CheckCircle, ArrowUp } from "lucide-react";
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
import { format } from "date-fns";

interface Project {
  id: number;
  projectNumber: string;
  name: string;
  pmOwner?: string;
  shipDate?: string;
  deliveryDate?: string;
  status: string;
  notes?: string;
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

  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  // Filter projects for Tier III (top 20 ready to ship, earliest first)
  const tierIIIProjects = (projects as Project[])
    .filter((p: Project) => p.shipDate && new Date(p.shipDate) > new Date())
    .sort((a: Project, b: Project) => new Date(a.shipDate!).getTime() - new Date(b.shipDate!).getTime())
    .slice(0, 20);

  // Get next 20 ready to ship projects for Tier III
  const nextTierIIIProjects = (projects as Project[])
    .filter((p: Project) => p.shipDate && new Date(p.shipDate) > new Date())
    .sort((a: Project, b: Project) => new Date(a.shipDate!).getTime() - new Date(b.shipDate!).getTime())
    .slice(20, 40);

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

  // Get concerns escalated to Tier IV
  const tierIVConcerns = (elevatedConcerns as ElevatedConcern[]).filter((c: ElevatedConcern) => c.isEscalatedToTierIV);

  const handleCreateConcern = () => {
    createConcernMutation.mutate(concernForm);
  };

  const handleEscalate = (id: number) => {
    escalateMutation.mutate(id);
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
      <Tabs defaultValue="meetings" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="meetings">Meetings</TabsTrigger>
          <TabsTrigger value="tier-iii">Tier III</TabsTrigger>
          <TabsTrigger value="tier-iv">Tier IV</TabsTrigger>
        </TabsList>

        {/* Meetings Tab Content */}
        <TabsContent value="meetings" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Meeting Management</h2>
              <p className="text-muted-foreground">
                Manage meeting minutes, action items, and team collaboration
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Meeting
              </Button>
            </div>
          </div>

          {/* Meeting Statistics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Meetings</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(meetings as Meeting[]).length}</div>
              </CardContent>
            </Card>
          </div>

          {/* Meetings List */}
          <div className="grid gap-4">
            {(meetings as Meeting[]).map((meeting: Meeting) => (
              <Card key={meeting.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">
                        <Link href={`/meetings/${meeting.id}`} className="hover:underline">
                          {meeting.title}
                        </Link>
                      </CardTitle>
                      <CardDescription>
                        {meeting.description}
                      </CardDescription>
                    </div>
                    <Badge variant={meeting.status === "completed" ? "default" : "secondary"}>
                      {meeting.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(meeting.datetime), 'MMM d, yyyy')}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {format(new Date(meeting.datetime), 'h:mm a')}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tier III Tab Content */}
        <TabsContent value="tier-iii" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Tier III - Project Readiness</h2>
              <p className="text-muted-foreground">
                Top 20 projects ready to ship, sorted by earliest ship date first
              </p>
            </div>
            <Button onClick={() => setShowConcernDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Concern
            </Button>
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

          {/* Top 20 Ready to Ship Projects */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Next 20 Ready to Ship Projects - Compact */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Next 20 Ready to Ship</h3>
            <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
              {nextTierIIIProjects.map((project: Project) => (
                <Card key={project.id} className="w-full border-l-4 border-l-blue-500">
                  <CardHeader className="pb-2">
                    <div className="space-y-1">
                      <CardTitle className="text-sm font-medium break-words">{project.name}</CardTitle>
                      <Link 
                        href={`/project/${project.id}`}
                        className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                      >
                        {project.projectNumber}
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    <div className="text-xs space-y-1">
                      <div className="truncate">
                        <span className="font-medium">Ship:</span> {project.shipDate ? (() => {
                          const date = new Date(project.shipDate + 'T00:00:00');
                          return format(date, 'MMM d');
                        })() : "TBD"}
                      </div>
                      <div className="truncate">
                        <span className="font-medium">PM:</span> {project.pmOwner || "Unassigned"}
                      </div>
                    </div>
                    
                    {/* Compact Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Progress</span>
                        <span>{Math.round((project as any).percentComplete || 0)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                        <div 
                          className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
                          style={{ width: `${(project as any).percentComplete || 0}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Compact Tasks Section */}
                    <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border-l-2 border-l-blue-500">
                      {(() => {
                        const projectTasks = (allTasks as any[]).filter((task: any) => {
                          return task.projectId === project.id && !task.isCompleted;
                        });
                        
                        return projectTasks.length > 0 ? (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-blue-800 dark:text-blue-200">Tasks</span>
                              <Badge variant="outline" className="text-xs border-blue-300 text-blue-800 dark:border-blue-400 dark:text-blue-200">
                                {projectTasks.length}
                              </Badge>
                            </div>
                            {projectTasks.slice(0, 1).map((task: any) => (
                              <div key={task.id} className="text-xs">
                                <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{task.name}</div>
                                {task.dueDate && (
                                  <div className="text-red-600 dark:text-red-400">
                                    Due: {(() => {
                                      const date = new Date(task.dueDate + 'T00:00:00');
                                      return format(date, 'MMM d');
                                    })()}
                                  </div>
                                )}
                              </div>
                            ))}
                            {projectTasks.length > 1 && (
                              <div className="text-xs text-center text-gray-600 dark:text-gray-400">
                                +{projectTasks.length - 1} more
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center">
                            <span className="text-xs text-gray-600 dark:text-gray-400">NO TASKS</span>
                          </div>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
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
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
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

          {/* Escalated Concerns from Tier III */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Escalated Concerns from Tier III</h3>
            <div className="grid gap-4">
              {tierIVConcerns.map((concern: ElevatedConcern) => {
                const project = (projects as Project[]).find((p: Project) => p.id === concern.projectId);
                return (
                  <Card key={concern.id} className="border-red-200">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="destructive">ESCALATED</Badge>
                        <Badge variant={concern.type === "task" ? "default" : "secondary"}>
                          {concern.type}
                        </Badge>
                        <Badge variant="destructive">{concern.priority}</Badge>
                      </div>
                      <h4 className="font-medium">{concern.title}</h4>
                      <p className="text-sm text-muted-foreground mb-2">{concern.description}</p>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>Project: {project?.name} ({project?.projectNumber})</p>
                        <p>Escalated: {concern.escalatedAt ? format(new Date(concern.escalatedAt), 'MMM d, yyyy h:mm a') : 'N/A'}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
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
                  {(projects as Project[]).map((project: Project) => (
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
    </div>
  );
}