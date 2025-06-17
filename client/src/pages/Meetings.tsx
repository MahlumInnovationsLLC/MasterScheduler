import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, Calendar, Users, FileText, Download, Edit, Trash2, Clock, MapPin, Settings, Copy, AlertTriangle, CheckCircle, ArrowUp, ExternalLink, BarChart, Building, Zap, RotateCcw, TrendingUp, Loader2, WifiOff, AlertCircle } from "lucide-react";
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

  // Fetch PTN detailed teams data
  const { data: ptnTeams, isLoading: ptnTeamsLoading } = useQuery({
    queryKey: ['/api/ptn-teams'],
    retry: false,
    refetchInterval: 2 * 60 * 1000 // Refresh every 2 minutes
  });

  // Fetch PTN enhanced summary with team analytics
  const { data: ptnEnhancedSummary, isLoading: ptnEnhancedLoading } = useQuery({
    queryKey: ['/api/ptn-enhanced-summary'],
    retry: false,
    refetchInterval: 2 * 60 * 1000 // Refresh every 2 minutes
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

  const handleSubmitConcern = () => {
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

  const handleSubmitTask = () => {
    createTaskMutation.mutate({
      projectId: parseInt(taskForm.projectId),
      name: taskForm.name,
      description: taskForm.description,
      dueDate: taskForm.dueDate || null,
      assignedToUserId: taskForm.assignedToUserId || null,
      department: taskForm.department
    });
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
    <>
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

        {/* Main Content - Removing Tabs Structure to Fix JSX Error */}
        <div className="w-full space-y-6">

        {/* Tier II (GEMBA) Dashboard Content */}
        <div className="space-y-6">
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
            ) : ptnMetrics?.error ? (
              <div className="col-span-4">
                <Card className="border-yellow-200 bg-yellow-50">
                  <CardContent className="pt-6">
                    <div className="flex items-center text-yellow-700">
                      <WifiOff className="h-5 w-5 mr-2" />
                      <div>
                        <p className="font-medium">PTN Connection Issue</p>
                        <p className="text-sm">{ptnMetrics.error}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
                    <BarChart className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {ptnMetrics?.summary?.projects?.total || 'N/A'}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Live PTN production data
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
                {ptnTeamNeedsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading team status...</span>
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
                ) : ptnTeamNeeds?.teams && ptnTeamNeeds.teams.length > 0 ? (
                  <div className="space-y-3">
                    {ptnTeamNeeds.teams.map((team: any, index: number) => (
                      <div key={index} className="flex justify-between items-center p-3 rounded-lg border bg-blue-50 border-blue-200">
                        <div>
                          <div className="font-medium text-blue-900">
                            {team.name || `Team ${index + 1}`}
                          </div>
                          <div className="text-sm text-blue-700">
                            {team.description || 'Production team active'}
                          </div>
                        </div>
                        <Badge className="bg-blue-100 text-blue-800 text-xs">
                          ACTIVE
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

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-600" />
                  Fabrication Status
                </CardTitle>
                <CardDescription>
                  Detailed team information and fabrication analytics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {ptnTeamsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-green-600" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading team details...</span>
                  </div>
                ) : ptnTeams?.error ? (
                  <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center text-yellow-700">
                      <WifiOff className="h-4 w-4 mr-2" />
                      <div>
                        <p className="text-sm font-medium">PTN Connection Issue</p>
                        <p className="text-xs">{ptnTeams.error}</p>
                      </div>
                    </div>
                  </div>
                ) : ptnTeams?.teams && ptnTeams.teams.length > 0 ? (
                  <div className="space-y-4">
                    {ptnTeams.teams.map((team: any, index: number) => (
                      <div key={index} className="p-4 rounded-lg border bg-green-50 border-green-200">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="font-medium text-green-900">
                              {team.name || `Team ${index + 1}`}
                            </div>
                            <div className="text-sm text-green-700">
                              {team.building && team.bay ? `${team.building} - Bay ${team.bay}` : 'Production Floor'}
                            </div>
                            {team.shift && (
                              <div className="text-xs text-green-600 mt-1">
                                Shift: {team.shift}
                              </div>
                            )}
                          </div>
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            ACTIVE
                          </Badge>
                        </div>

                        {/* Team Leads */}
                        {(team.electricalLead || team.assemblyLead) && (
                          <div className="mb-3">
                            <div className="text-xs font-medium text-green-800 mb-1">Team Leads</div>
                            <div className="flex gap-2 text-xs">
                              {team.electricalLead && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                  Electrical: {team.electricalLead}
                                </span>
                              )}
                              {team.assemblyLead && (
                                <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded">
                                  Assembly:                                  {team.assemblyLead}
                                </span>
                              )}
                            </div>
                          </div>                        )}<previous_generation>```text

</previous_generation>
                        {/* Team Members */}
                        {team.members && team.members.length > 0 && (
                          <div className="mb-3">
                            <div className="text-xs font-medium text-green-800 mb-1">
                              Team Members ({team.members.length})
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {team.members.map((member: any, memberIndex: number) => (
                                <span key={memberIndex} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                                  {member.name}
                                  {member.certifications && member.certifications.length > 0 && (
                                    <span className="ml-1 text-blue-600">
                                      ({member.certifications.join(', ')})
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Team Analytics */}
                        {team.analytics && (
                          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-green-200">
                            {team.analytics.productivity && (
                              <div className="text-center">
                                <div className="text-lg font-bold text-green-700">
                                  {team.analytics.productivity}%
                                </div>
                                <div className="text-xs text-green-600">Productivity</div>
                              </div>
                            )}
                            {team.analytics.quality && (
                              <div className="text-center">
                                <div className="text-lg font-bold text-green-700">
                                  {team.analytics.quality}%
                                </div>
                                <div className="text-xs text-green-600">Quality</div>
                              </div>
                            )}
                            {team.analytics.efficiency && (
                              <div className="text-center">
                                <div className="text-lg font-bold text-green-700">
                                  {team.analytics.efficiency}%
                                </div>
                                <div className="text-xs text-green-600">Efficiency</div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center text-green-700">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      <p className="text-sm">No team data available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Floor Alerts Section */}
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
        </div>

        {/* Tier III Content */}
        <div className="space-y-6">
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold text-muted-foreground">Tier III Content</h3>
            <p className="text-sm text-muted-foreground mt-2">Project readiness and escalation management</p>
          </div>
        </div>

        {/* Tier IV Content */}
        <div className="space-y-6">
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold text-muted-foreground">Tier IV Content</h3>
            <p className="text-sm text-muted-foreground mt-2">Critical issues and executive oversight</p>
          </div>
        </div>

        {/* Dialog Components */}
      <CreateMeetingDialog 
        open={showCreateDialog} 
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['/api/meetings'] });
          toast({ title: "Meeting created successfully" });
        }}
      />

      {/* Create Elevated Concern Dialog */}
      <Dialog open={showConcernDialog} onOpenChange={setShowConcernDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Elevated Concern</DialogTitle>
            <DialogDescription>
              Escalate a critical issue that requires immediate attention and tracking.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="concern-project">Project</Label>
              <Select value={concernForm.projectId} onValueChange={(value) => setConcernForm({ ...concernForm, projectId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects?.map((project: any) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.projectNumber} - {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="concern-type">Type</Label>
              <Select value={concernForm.type} onValueChange={(value: "task" | "note") => setConcernForm({ ...concernForm, type: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="note">Note</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="concern-title">Title</Label>
              <Input
                id="concern-title"
                value={concernForm.title}
                onChange={(e) => setConcernForm({ ...concernForm, title: e.target.value })}
                placeholder="Enter concern title"
              />
            </div>
            <div>
              <Label htmlFor="concern-description">Description</Label>
              <Textarea
                id="concern-description"
                value={concernForm.description}
                onChange={(e) => setConcernForm({ ...concernForm, description: e.target.value })}
                placeholder="Describe the concern in detail"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="concern-priority">Priority</Label>
                <Select value={concernForm.priority} onValueChange={(value: "low" | "medium" | "high") => setConcernForm({ ...concernForm, priority: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="concern-assigned">Assigned To</Label>
                <Select value={concernForm.assignedToId} onValueChange={(value) => setConcernForm({ ...concernForm, assignedToId: value })}>
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
              <Label htmlFor="concern-due-date">Due Date</Label>
              <Input
                id="concern-due-date"
                type="date"
                value={concernForm.dueDate}
                onChange={(e) => setConcernForm({ ...concernForm, dueDate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConcernDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitConcern}
              disabled={createConcernMutation.isPending || !concernForm.projectId || !concernForm.title || !concernForm.description}
            >
              {createConcernMutation.isPending ? "Creating..." : "Create Concern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Task Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
            <DialogDescription>
              Create a new task and assign it to a team member.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="task-project">Project</Label>
              <Select value={taskForm.projectId} onValueChange={(value) => setTaskForm({ ...taskForm, projectId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects?.map((project: any) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.projectNumber} - {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="task-name">Task Name</Label>
              <Input
                id="task-name"
                value={taskForm.name}
                onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })}
                placeholder="Enter task name"
              />
            </div>
            <div>
              <Label htmlFor="task-description">Description</Label>
              <Textarea
                id="task-description"
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                placeholder="Describe the task"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="task-due-date">Due Date</Label>
                <Input
                  id="task-due-date"
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="task-assigned">Assigned To</Label>
                <Select value={taskForm.assignedToUserId} onValueChange={(value) => setTaskForm({ ...taskForm, assignedToUserId: value })}>
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
              <Label htmlFor="task-department">Department</Label>
              <Select value={taskForm.department} onValueChange={(value) => setTaskForm({ ...taskForm, department: value })}>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaskDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitTask}
              disabled={createTaskMutation.isPending || !taskForm.name || !taskForm.description}
            >
              {createTaskMutation.isPending ? "Creating..." : "Create Task"}
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
      </div>
    </>
  );
}