import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, Calendar, Users, FileText, Download, Edit, Trash2, Clock, MapPin, Settings, Copy, AlertTriangle, CheckCircle, ArrowUp, ExternalLink, BarChart, Building, Zap, RotateCcw, TrendingUp } from "lucide-react";
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

          {/* GEMBA Key Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Production Efficiency</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">87.5%</div>
                <p className="text-xs text-muted-foreground">
                  +2.3% from last week
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Quality Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">96.2%</div>
                <p className="text-xs text-muted-foreground">
                  +0.8% from last week
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">OEE Score</CardTitle>
                <BarChart className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">84.1%</div>
                <p className="text-xs text-muted-foreground">
                  +1.5% from last week
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Workstations</CardTitle>
                <Building className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">24/28</div>
                <p className="text-xs text-muted-foreground">
                  4 stations in maintenance
                </p>
              </CardContent>
            </Card>
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
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                    <div>
                      <div className="font-medium text-green-900">Bay 1 - Fabrication</div>
                      <div className="text-sm text-green-700">Project 805344 - 78% Complete</div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">RUNNING</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div>
                      <div className="font-medium text-blue-900">Bay 2 - Assembly</div>
                      <div className="text-sm text-blue-700">Project 805298 - 45% Complete</div>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">RUNNING</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div>
                      <div className="font-medium text-yellow-900">Bay 3 - Welding</div>
                      <div className="text-sm text-yellow-700">Setup in progress</div>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-800">SETUP</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-200">
                    <div>
                      <div className="font-medium text-red-900">Bay 4 - Painting</div>
                      <div className="text-sm text-red-700">Equipment maintenance</div>
                    </div>
                    <Badge className="bg-red-100 text-red-800">DOWN</Badge>
                  </div>
                </div>
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
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-200">
                    <div>
                      <div className="font-medium text-red-900">Material Shortage</div>
                      <div className="text-sm text-red-700">Steel plates for Project 805344</div>
                    </div>
                    <Badge variant="destructive" className="text-xs">HIGH</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div>
                      <div className="font-medium text-yellow-900">Quality Check Pending</div>
                      <div className="text-sm text-yellow-700">Bay 2 - Awaiting QC approval</div>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-800 text-xs">MEDIUM</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div>
                      <div className="font-medium text-orange-900">Tool Calibration Due</div>
                      <div className="text-sm text-orange-700">CNC Machine #3 - Tomorrow</div>
                    </div>
                    <Badge className="bg-orange-100 text-orange-800 text-xs">LOW</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* PTN Integration Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5 text-blue-600" />
                PTN System Integration
              </CardTitle>
              <CardDescription>
                Real-time data from Production Tracking Network at ptn.nomadgcsai.com
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">156</div>
                  <div className="text-sm text-muted-foreground">Work Orders Active</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">23</div>
                  <div className="text-sm text-muted-foreground">Completed Today</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">4</div>
                  <div className="text-sm text-muted-foreground">Behind Schedule</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Last sync: 2 minutes ago</span>
                  <Button variant="outline" size="sm">
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Refresh Data
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
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
            <h3 className="text-lg font-semibold">Active Escalated Concerns from Tier III</h3>
            {tierIVConcerns.length === 0 ? (
              <Card className="border-green-200 bg-green-50">
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
            ).slice(0, 3); // Show last 3 closed concerns
            
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
  );
}