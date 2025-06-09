import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, Calendar, Users, FileText, Download, Edit, Trash2, Clock, MapPin, Settings, Copy } from "lucide-react";
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

interface MeetingTask {
  id: number;
  meetingId: number;
  description: string;
  assignedToId: string;
  dueDate?: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "in_progress" | "completed";
  createdAt: string;
  updatedAt: string;
}

interface MeetingTemplate {
  id: number;
  name: string;
  description?: string;
  agendaItems: string[];
  defaultDuration: number; // in minutes
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function Meetings() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showTemplatesDialog, setShowTemplatesDialog] = useState(false);
  const [showCreateTemplateDialog, setShowCreateTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MeetingTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: "",
    description: "",
    agendaItems: [""],
    defaultDuration: 60
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch meetings
  const { data: meetings = [], isLoading: meetingsLoading } = useQuery({
    queryKey: ['/api/meetings'],
  });

  // Fetch all meeting tasks
  const { data: allTasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['/api/meeting-tasks'],
  });

  // Fetch meeting templates
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['/api/meeting-templates'],
  });

  // Delete meeting mutation
  const deleteMeetingMutation = useMutation({
    mutationFn: (id: number) => fetch(`/api/meetings/${id}`, { 
      method: 'DELETE',
      credentials: 'include'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meetings'] });
      toast({ title: "Meeting deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete meeting", variant: "destructive" });
    },
  });

  // Export meeting mutation
  const exportMeetingMutation = useMutation({
    mutationFn: ({ id, format }: { id: number; format: 'word' | 'pdf' }) =>
      fetch(`/api/meetings/${id}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ format }),
      }),
    onSuccess: async (response, variables) => {
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `meeting-${variables.id}.${variables.format === 'word' ? 'docx' : 'pdf'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast({ title: `Meeting exported as ${variables.format.toUpperCase()}` });
      } else {
        throw new Error('Export failed');
      }
    },
    onError: () => {
      toast({ title: "Failed to export meeting", variant: "destructive" });
    },
  });

  // Template mutations
  const createTemplateMutation = useMutation({
    mutationFn: (template: Omit<MeetingTemplate, 'id' | 'createdAt' | 'updatedAt'>) =>
      fetch('/api/meeting-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(template),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meeting-templates'] });
      setShowCreateTemplateDialog(false);
      setTemplateForm({ name: "", description: "", agendaItems: [""], defaultDuration: 60 });
      toast({ title: "Template created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create template", variant: "destructive" });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, template }: { id: number; template: Partial<MeetingTemplate> }) =>
      fetch(`/api/meeting-templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(template),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meeting-templates'] });
      setEditingTemplate(null);
      toast({ title: "Template updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update template", variant: "destructive" });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: number) => fetch(`/api/meeting-templates/${id}`, { 
      method: 'DELETE',
      credentials: 'include'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meeting-templates'] });
      toast({ title: "Template deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete template", variant: "destructive" });
    },
  });

  // Filter meetings
  const filteredMeetings = meetings.filter((meeting: Meeting) => {
    const matchesSearch = meeting.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         meeting.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || meeting.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Get upcoming meetings
  const upcomingMeetings = meetings.filter((meeting: Meeting) => 
    meeting.status === "scheduled" && new Date(meeting.datetime) > new Date()
  );

  // Get recent meetings
  const recentMeetings = meetings.filter((meeting: Meeting) => 
    meeting.status === "completed" || new Date(meeting.datetime) < new Date()
  ).slice(0, 5);

  // Get overdue tasks
  const overdueTasks = allTasks.filter((task: MeetingTask) => 
    task.status !== "completed" && task.dueDate && new Date(task.dueDate) < new Date()
  );

  // Get pending tasks
  const pendingTasks = allTasks.filter((task: MeetingTask) => 
    task.status === "pending"
  );

  const getStatusBadge = (status: string) => {
    const variants = {
      scheduled: "default",
      in_progress: "secondary",
      completed: "default",
      cancelled: "destructive"
    } as const;
    
    return <Badge variant={variants[status as keyof typeof variants] || "default"}>{status.replace('_', ' ')}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      low: "default",
      medium: "secondary", 
      high: "destructive"
    } as const;
    
    return <Badge variant={variants[priority as keyof typeof variants] || "default"}>{priority}</Badge>;
  };

  const handleDeleteMeeting = (meeting: Meeting) => {
    if (confirm(`Are you sure you want to delete "${meeting.title}"?`)) {
      deleteMeetingMutation.mutate(meeting.id);
    }
  };

  const handleExportMeeting = (meeting: Meeting, format: 'word' | 'pdf') => {
    exportMeetingMutation.mutate({ id: meeting.id, format });
  };

  // Template helper functions
  const handleCreateTemplate = () => {
    const agendaItems = templateForm.agenda.filter(item => item.trim() !== "");
    createTemplateMutation.mutate({
      name: templateForm.name,
      description: templateForm.description || undefined,
      agenda: agendaItems,
      defaultDuration: templateForm.defaultDuration,
      isActive: true
    });
  };

  const handleEditTemplate = (template: MeetingTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      description: template.description || "",
      agenda: template.agenda.length > 0 ? template.agenda : [""],
      defaultDuration: template.defaultDuration
    });
    setShowCreateTemplateDialog(true);
  };

  const handleUpdateTemplate = () => {
    if (!editingTemplate) return;
    const agendaItems = templateForm.agenda.filter(item => item.trim() !== "");
    updateTemplateMutation.mutate({
      id: editingTemplate.id,
      template: {
        name: templateForm.name,
        description: templateForm.description || undefined,
        agenda: agendaItems,
        defaultDuration: templateForm.defaultDuration
      }
    });
  };

  const handleDeleteTemplate = (template: MeetingTemplate) => {
    if (confirm(`Are you sure you want to delete the template "${template.name}"?`)) {
      deleteTemplateMutation.mutate(template.id);
    }
  };

  const addAgendaItem = () => {
    setTemplateForm(prev => ({
      ...prev,
      agenda: [...prev.agenda, ""]
    }));
  };

  const updateAgendaItem = (index: number, value: string) => {
    setTemplateForm(prev => ({
      ...prev,
      agenda: prev.agenda.map((item, i) => i === index ? value : item)
    }));
  };

  const removeAgendaItem = (index: number) => {
    setTemplateForm(prev => ({
      ...prev,
      agenda: prev.agenda.filter((_, i) => i !== index)
    }));
  };

  const resetTemplateForm = () => {
    setTemplateForm({ name: "", description: "", agenda: [""], defaultDuration: 60 });
    setEditingTemplate(null);
    setShowCreateTemplateDialog(false);
  };

  if (meetingsLoading || tasksLoading) {
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
          <h1 className="text-3xl font-bold tracking-tight">Meetings</h1>
          <p className="text-muted-foreground">
            Manage meeting minutes, action items, and team collaboration
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowTemplatesDialog(true)}>
            <Settings className="mr-2 h-4 w-4" />
            Templates
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Meeting
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingMeetings.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingTasks.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
            <FileText className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{overdueTasks.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="meetings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="meetings">All Meetings</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="tasks">Action Items</TabsTrigger>
        </TabsList>

        <TabsContent value="meetings" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <Input
              placeholder="Search meetings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Meetings List */}
          <div className="grid gap-4">
            {filteredMeetings.map((meeting: Meeting) => (
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
                    <div className="flex items-center gap-2">
                      {getStatusBadge(meeting.status)}
                    </div>
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
                      {meeting.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {meeting.location}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/meetings/${meeting.id}`}>
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Link>
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-1" />
                            Export
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Export Meeting</DialogTitle>
                            <DialogDescription>
                              Choose the format to export "{meeting.title}"
                            </DialogDescription>
                          </DialogHeader>
                          <div className="flex gap-2">
                            <Button 
                              onClick={() => handleExportMeeting(meeting, 'word')}
                              disabled={exportMeetingMutation.isPending}
                            >
                              Export as Word
                            </Button>
                            <Button 
                              variant="outline"
                              onClick={() => handleExportMeeting(meeting, 'pdf')}
                              disabled={exportMeetingMutation.isPending}
                            >
                              Export as PDF
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeleteMeeting(meeting)}
                        disabled={deleteMeetingMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4">
          <div className="grid gap-4">
            {upcomingMeetings.map((meeting: Meeting) => (
              <Card key={meeting.id}>
                <CardHeader>
                  <CardTitle>
                    <Link href={`/meetings/${meeting.id}`} className="hover:underline">
                      {meeting.title}
                    </Link>
                  </CardTitle>
                  <CardDescription>
                    {format(new Date(meeting.datetime), 'MMM d, yyyy h:mm a')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{meeting.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <div className="grid gap-4">
            {allTasks.map((task: MeetingTask) => (
              <Card key={task.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="font-medium">{task.description}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {task.dueDate && (
                          <span>Due: {format(new Date(task.dueDate), 'MMM d, yyyy')}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getPriorityBadge(task.priority)}
                      <Badge variant={task.status === "completed" ? "default" : "secondary"}>
                        {task.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Meeting Dialog */}
      <CreateMeetingDialog 
        open={showCreateDialog} 
        onOpenChange={setShowCreateDialog} 
      />

      {/* Templates Management Dialog */}
      <Dialog open={showTemplatesDialog} onOpenChange={setShowTemplatesDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Meeting Templates</DialogTitle>
            <DialogDescription>
              Create and manage reusable meeting templates with predefined agendas
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Templates</h3>
              <Button onClick={() => setShowCreateTemplateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Template
              </Button>
            </div>

            <div className="grid gap-4">
              {(templates as MeetingTemplate[]).map((template) => (
                <Card key={template.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <CardDescription>{template.description}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={template.isActive ? "default" : "secondary"}>
                          {template.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Button variant="outline" size="sm" onClick={() => handleEditTemplate(template)}>
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteTemplate(template)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Default Duration: {template.defaultDuration} minutes
                      </p>
                      <div>
                        <p className="text-sm font-medium mb-1">Agenda Items:</p>
                        <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                          {template.agenda.map((item, index) => (
                            <li key={index}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Template Dialog */}
      <Dialog open={showCreateTemplateDialog} onOpenChange={(open) => {
        if (!open) resetTemplateForm();
        setShowCreateTemplateDialog(open);
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Template' : 'Create New Template'}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate ? 'Update template details' : 'Create a reusable meeting template'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                value={templateForm.name}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter template name"
              />
            </div>

            <div>
              <Label htmlFor="template-description">Description (Optional)</Label>
              <Textarea
                id="template-description"
                value={templateForm.description}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter template description"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="default-duration">Default Duration (minutes)</Label>
              <Input
                id="default-duration"
                type="number"
                value={templateForm.defaultDuration}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, defaultDuration: parseInt(e.target.value) || 60 }))}
                min="15"
                max="480"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Agenda Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={addAgendaItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>
              <div className="space-y-2">
                {templateForm.agenda.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={item}
                      onChange={(e) => updateAgendaItem(index, e.target.value)}
                      placeholder={`Agenda item ${index + 1}`}
                    />
                    {templateForm.agenda.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeAgendaItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetTemplateForm}>
              Cancel
            </Button>
            <Button 
              onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
              disabled={!templateForm.name.trim() || (editingTemplate ? updateTemplateMutation.isPending : createTemplateMutation.isPending)}
            >
              {editingTemplate ? 'Update Template' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}