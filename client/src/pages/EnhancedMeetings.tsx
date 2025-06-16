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
import { apiRequest } from "@/lib/queryClient";

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

export default function EnhancedMeetings() {
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

  // Fetch elevated concerns
  const { data: elevatedConcerns = [], isLoading: concernsLoading } = useQuery({
    queryKey: ['/api/elevated-concerns'],
  });

  // Fetch users
  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
  });

  // Create elevated concern mutation
  const createConcernMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('/api/elevated-concerns', {
        method: 'POST',
        body: JSON.stringify(data)
      });
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
      return await apiRequest(`/api/elevated-concerns/${id}/escalate`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/elevated-concerns'] });
      toast({ title: "Concern escalated to Tier IV successfully" });
    }
  });

  // Filter projects for Tier III (top 20 ready to ship, earliest first)
  const tierIIIProjects = projects
    .filter((p: Project) => p.shipDate && new Date(p.shipDate) > new Date())
    .sort((a: Project, b: Project) => new Date(a.shipDate!).getTime() - new Date(b.shipDate!).getTime())
    .slice(0, 20);

  // Filter projects for Tier IV (MAJOR and MINOR issues only)
  const tierIVProjects = projects.filter((p: Project) => 
    p.status === "critical" || p.notes?.toLowerCase().includes("major") || p.notes?.toLowerCase().includes("minor")
  );

  // Get concerns escalated to Tier IV
  const tierIVConcerns = elevatedConcerns.filter((c: ElevatedConcern) => c.isEscalatedToTierIV);

  const handleCreateConcern = () => {
    createConcernMutation.mutate(concernForm);
  };

  const handleEscalate = (id: number) => {
    escalateMutation.mutate(id);
  };

  const ProjectCard = ({ project, showConcerns = false }: { project: Project; showConcerns?: boolean }) => {
    const projectConcerns = elevatedConcerns.filter((c: ElevatedConcern) => c.projectId === project.id);
    
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">{project.name}</CardTitle>
              <CardDescription>{project.projectNumber}</CardDescription>
            </div>
            <Badge variant={project.status === "critical" ? "destructive" : "default"}>
              {project.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">PM:</span> {project.pmOwner || "Unassigned"}
            </div>
            <div>
              <span className="font-medium">Ship Date:</span> {project.shipDate ? format(new Date(project.shipDate), 'MMM d, yyyy') : "TBD"}
            </div>
            <div>
              <span className="font-medium">Delivery:</span> {project.deliveryDate ? format(new Date(project.deliveryDate), 'MMM d, yyyy') : "TBD"}
            </div>
          </div>
          
          {project.notes && (
            <div className="text-sm">
              <span className="font-medium">Notes:</span>
              <p className="text-muted-foreground mt-1">{project.notes}</p>
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

  if (meetingsLoading || projectsLoading || concernsLoading) {
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
                <div className="text-2xl font-bold">{meetings.length}</div>
              </CardContent>
            </Card>
          </div>

          {/* Meetings List */}
          <div className="grid gap-4">
            {meetings.map((meeting: Meeting) => (
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
                  {elevatedConcerns.filter((c: ElevatedConcern) => !c.isEscalatedToTierIV).length}
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

          {/* Projects Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tierIIIProjects.map((project: Project) => (
              <ProjectCard key={project.id} project={project} showConcerns={true} />
            ))}
          </div>

          {/* Elevated Concerns Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Elevated Concerns</h3>
            <div className="grid gap-4">
              {elevatedConcerns
                .filter((c: ElevatedConcern) => !c.isEscalatedToTierIV)
                .map((concern: ElevatedConcern) => {
                  const project = projects.find((p: Project) => p.id === concern.projectId);
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

          {/* Critical Projects */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Critical Projects</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tierIVProjects.map((project: Project) => (
                <ProjectCard key={project.id} project={project} showConcerns={true} />
              ))}
            </div>
          </div>

          {/* Escalated Concerns from Tier III */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Escalated Concerns from Tier III</h3>
            <div className="grid gap-4">
              {tierIVConcerns.map((concern: ElevatedConcern) => {
                const project = projects.find((p: Project) => p.id === concern.projectId);
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
                  {projects.map((project: Project) => (
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
    </div>
  );
}