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
  updatedAt?: string;
  assignedTo?: any;
  project?: Project;
}

export default function Meetings() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showConcernDialog, setShowConcernDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showCloseConcernDialog, setShowCloseConcernDialog] = useState(false);
  const [concernToClose, setConcernToClose] = useState<ElevatedConcern | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form states
  const [concernForm, setConcernForm] = useState({
    projectId: "",
    type: "task" as "task" | "note",
    title: "",
    description: "",
    priority: "medium" as "low" | "medium" | "high",
    assignedToId: "",
    dueDate: ""
  });

  const [taskForm, setTaskForm] = useState({
    projectId: "",
    name: "",
    description: "",
    dueDate: "",
    assignedToUserId: "",
    department: ""
  });

  const [closeTaskForm, setCloseTaskForm] = useState({
    name: "",
    description: "",
    dueDate: "",
    assignedToUserId: "",
    department: ""
  });

  // Queries
  const { data: meetings } = useQuery({
    queryKey: ['/api/meetings'],
    enabled: true
  });

  const { data: projects } = useQuery({
    queryKey: ['/api/projects'],
    enabled: true
  });

  const { data: users } = useQuery({
    queryKey: ['/api/users'],
    enabled: true
  });

  const { data: elevatedConcerns } = useQuery({
    queryKey: ['/api/meetings/concerns'],
    enabled: true
  });

  const { data: ptnTeams } = useQuery({
    queryKey: ['/api/ptn-teams'],
    enabled: true
  });

  const { data: ptnEnhancedSummary } = useQuery({
    queryKey: ['/api/ptn-enhanced-summary'],
    enabled: true
  });

  // Mutations
  const createConcernMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/meetings/concerns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create concern');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meetings/concerns'] });
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
      toast({ title: "Concern created successfully" });
    }
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
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

  const closeConcernMutation = useMutation({
    mutationFn: async (concernId: number) => {
      const response = await fetch(`/api/meetings/concerns/${concernId}/close`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to close concern');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meetings/concerns'] });
      setShowCloseConcernDialog(false);
      setConcernToClose(null);
      setCloseTaskForm({
        name: "",
        description: "",
        dueDate: "",
        assignedToUserId: "",
        department: ""
      });
      toast({ title: "Concern closed successfully" });
    }
  });

  // Handlers
  const handleSubmitConcern = () => {
    createConcernMutation.mutate({
      projectId: parseInt(concernForm.projectId),
      type: concernForm.type,
      title: concernForm.title,
      description: concernForm.description,
      priority: concernForm.priority,
      assignedToId: concernForm.assignedToId || null,
      dueDate: concernForm.dueDate || null,
    });
  };

  const handleSubmitCloseConcern = () => {
    if (!concernToClose) return;
    
    // First create the task
    createTaskMutation.mutate({
      projectId: concernToClose.projectId,
      name: closeTaskForm.name,
      description: closeTaskForm.description,
      dueDate: closeTaskForm.dueDate || null,
      assignedToUserId: closeTaskForm.assignedToUserId || null,
      department: closeTaskForm.department
    });

    // Then close the concern
    closeConcernMutation.mutate(concernToClose.id);
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Priority Visibility Dashboard</h1>
          <p className="text-muted-foreground">
            Manufacturing and production management oversight system
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Schedule Meeting
          </Button>
          <Button 
            onClick={() => setShowConcernDialog(true)}
            variant="outline"
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            Add Concern
          </Button>
          <Button 
            onClick={() => setShowTaskDialog(true)}
            variant="outline"
          >
            <FileText className="mr-2 h-4 w-4" />
            Create Task
          </Button>
        </div>
      </div>

      <Tabs defaultValue="tier-ii" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tier-i">Tier I (Strategic)</TabsTrigger>
          <TabsTrigger value="tier-ii">Tier II (GEMBA)</TabsTrigger>
          <TabsTrigger value="tier-iii">Tier III (Tactical)</TabsTrigger>
          <TabsTrigger value="tier-iv">Tier IV (Critical)</TabsTrigger>
        </TabsList>

        {/* Tier I Tab Content */}
        <TabsContent value="tier-i" className="space-y-6">
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold text-muted-foreground">Tier I Content</h3>
            <p className="text-sm text-muted-foreground mt-2">Strategic oversight and executive decision making</p>
          </div>
        </TabsContent>

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

          {/* Fabrication Status Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-blue-600" />
                  Fabrication Status
                </CardTitle>
                <CardDescription>
                  Real-time team performance and fabrication metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                {ptnTeams?.isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Loading team data...</span>
                  </div>
                ) : ptnTeams?.error ? (
                  <div className="flex items-center gap-2 text-red-600 py-4">
                    <WifiOff className="h-4 w-4" />
                    <span>Unable to connect to PTN API</span>
                  </div>
                ) : ptnTeams?.data && ptnTeams.data.length > 0 ? (
                  <div className="space-y-4">
                    {ptnTeams.data.map((team: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-semibold">{team.name}</h4>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              <span>Building: {team.building}</span>
                              <span>Bay: {team.bay}</span>
                            </div>
                          </div>
                          <Badge variant={team.status === 'active' ? 'default' : 'secondary'}>
                            {team.status}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <div className="text-sm font-medium">Team Leads</div>
                            <div className="text-sm text-muted-foreground">
                              <div>Electrical: {team.electrical_lead || 'Not assigned'}</div>
                              <div>Assembly: {team.assembly_lead || 'Not assigned'}</div>
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium">Team Size</div>
                            <div className="text-sm text-muted-foreground">
                              {team.members?.length || 0} members
                            </div>
                          </div>
                        </div>

                        {team.members && team.members.length > 0 && (
                          <div className="mb-3">
                            <div className="text-sm font-medium mb-2">Team Members</div>
                            <div className="space-y-1">
                              {team.members.map((member: any, memberIndex: number) => (
                                <div key={memberIndex} className="flex justify-between items-center text-sm bg-muted/50 rounded p-2">
                                  <span>{member.name}</span>
                                  <div className="flex gap-2">
                                    {member.certifications?.map((cert: string, certIndex: number) => (
                                      <Badge key={certIndex} variant="outline" className="text-xs">
                                        {cert}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {team.analytics && (
                          <div className="grid grid-cols-3 gap-4 pt-3 border-t">
                            <div className="text-center">
                              <div className="text-lg font-semibold text-green-600">
                                {team.analytics.productivity}%
                              </div>
                              <div className="text-xs text-muted-foreground">Productivity</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-semibold text-blue-600">
                                {team.analytics.quality}%
                              </div>
                              <div className="text-xs text-muted-foreground">Quality</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-semibold text-purple-600">
                                {team.analytics.efficiency}%
                              </div>
                              <div className="text-xs text-muted-foreground">Efficiency</div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No team data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Live Production Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-green-600" />
                  Live Production Status
                </CardTitle>
                <CardDescription>
                  Current manufacturing operations and team needs
                </CardDescription>
              </CardHeader>
              <CardContent>
                {ptnEnhancedSummary?.isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Loading production data...</span>
                  </div>
                ) : ptnEnhancedSummary?.error ? (
                  <div className="flex items-center gap-2 text-red-600 py-4">
                    <AlertCircle className="h-4 w-4" />
                    <span>Production data unavailable</span>
                  </div>
                ) : ptnEnhancedSummary?.data ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-700">
                          {ptnEnhancedSummary.data.active_teams || 0}
                        </div>
                        <div className="text-sm text-green-600">Active Teams</div>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-700">
                          {ptnEnhancedSummary.data.total_projects || 0}
                        </div>
                        <div className="text-sm text-blue-600">Active Projects</div>
                      </div>
                    </div>

                    {ptnEnhancedSummary.data.current_needs && ptnEnhancedSummary.data.current_needs.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Current Team Needs</h4>
                        <div className="space-y-2">
                          {ptnEnhancedSummary.data.current_needs.map((need: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                              <div>
                                <div className="font-medium">{need.team}</div>
                                <div className="text-sm text-muted-foreground">{need.need}</div>
                              </div>
                              <Badge variant="outline" className="bg-yellow-100">
                                {need.priority}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {ptnEnhancedSummary.data.alerts && ptnEnhancedSummary.data.alerts.length > 0 ? (
                      <div>
                        <h4 className="font-medium mb-2 text-red-700">Active Alerts</h4>
                        <div className="space-y-2">
                          {ptnEnhancedSummary.data.alerts.map((alert: any, index: number) => (
                            <div key={index} className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
                              <AlertTriangle className="h-4 w-4 text-red-600" />
                              <div>
                                <div className="font-medium text-red-700">{alert.message}</div>
                                <div className="text-sm text-red-600">{alert.team}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <div>
                          <div className="font-medium text-green-700">No Active Alerts</div>
                          <div className="text-sm text-green-600">All teams operating normally</div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No production data available</p>
                  </div>
                )}
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-lg font-semibold">Live Data</div>
                  <div className="text-sm text-muted-foreground">Real-time team metrics</div>
                  <div className="mt-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      Connected
                    </Badge>
                  </div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-lg font-semibold">Team Analytics</div>
                  <div className="text-sm text-muted-foreground">Performance tracking</div>
                  <div className="mt-2">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      Enhanced
                    </Badge>
                  </div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-lg font-semibold">Alert System</div>
                  <div className="text-sm text-muted-foreground">Real-time notifications</div>
                  <div className="mt-2">
                    <Badge variant="outline" className="bg-purple-50 text-purple-700">
                      Active
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Elevated Concerns Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                Elevated Concerns
              </CardTitle>
              <CardDescription>
                Issues requiring immediate attention and escalation
              </CardDescription>
            </CardHeader>
            <CardContent>
              {elevatedConcerns && elevatedConcerns.length > 0 ? (
                <div className="space-y-4">
                  {elevatedConcerns.map((concern: ElevatedConcern) => (
                    <div key={concern.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold">{concern.title}</h4>
                          <p className="text-sm text-muted-foreground">{concern.description}</p>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant={
                            concern.priority === 'high' ? 'destructive' :
                            concern.priority === 'medium' ? 'default' : 'secondary'
                          }>
                            {concern.priority}
                          </Badge>
                          <Badge variant={concern.status === 'completed' ? 'default' : 'outline'}>
                            {concern.status}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center text-sm text-muted-foreground">
                        <div>
                          <span>Project: {concern.project?.projectNumber} - {concern.project?.name}</span>
                          {concern.assignedTo && (
                            <span className="ml-4">Assigned: {concern.assignedTo.firstName} {concern.assignedTo.lastName}</span>
                          )}
                        </div>
                        {concern.status !== 'completed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setConcernToClose(concern);
                              setShowCloseConcernDialog(true);
                            }}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Close
                          </Button>
                        )}
                      </div>

                      {concern.isEscalatedToTierIV && (
                        <div className="mt-2 p-2 bg-red-50 rounded border-l-4 border-red-500">
                          <div className="flex items-center gap-2 text-red-700">
                            <ArrowUp className="h-4 w-4" />
                            <span className="text-sm font-medium">Escalated to Tier IV</span>
                            {concern.escalatedAt && (
                              <span className="text-sm">
                                on {format(new Date(concern.escalatedAt), 'MMM d, h:mm a')}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {concern.status === 'completed' && (
                        <div className="mt-2 p-2 bg-green-50 rounded border-l-4 border-green-500">
                          <div className="flex items-center gap-2 text-green-700">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-sm">Closed: {concern.updatedAt ? format(new Date(concern.updatedAt), 'MMM d, h:mm a') : 'Recently'}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No elevated concerns at this time</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tier III Tab Content */}
        <TabsContent value="tier-iii" className="space-y-6">
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold text-muted-foreground">Tier III Content</h3>
            <p className="text-sm text-muted-foreground mt-2">Project readiness and escalation management</p>
          </div>
        </TabsContent>

        {/* Tier IV Tab Content */}
        <TabsContent value="tier-iv" className="space-y-6">
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold text-muted-foreground">Tier IV Content</h3>
            <p className="text-sm text-muted-foreground mt-2">Critical issues and executive oversight</p>
          </div>
        </TabsContent>
      </Tabs>

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
                    {(users as any[])?.map((user: any) => (
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
                    {(users as any[])?.map((user: any) => (
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
              onClick={() => {
                createTaskMutation.mutate({
                  projectId: parseInt(taskForm.projectId),
                  name: taskForm.name,
                  description: taskForm.description,
                  dueDate: taskForm.dueDate || null,
                  assignedToUserId: taskForm.assignedToUserId || null,
                });
              }} 
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
                        {(users as any[])?.map((user: any) => (
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