import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  Users, 
  Plus, 
  Edit, 
  Save, 
  X, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Link as LinkIcon,
  FileText,
  User
} from "lucide-react";
import { format } from "date-fns";

interface MeetingViewProps {}

export default function MeetingView({}: MeetingViewProps) {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/meetings/:id");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const meetingId = params?.id ? parseInt(params.id) : null;
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedMeeting, setEditedMeeting] = useState<any>(null);
  const [editedAttendees, setEditedAttendees] = useState<string[]>([]);
  const [newNote, setNewNote] = useState("");
  const [selectedAgendaItem, setSelectedAgendaItem] = useState("");
  const [newTask, setNewTask] = useState({
    description: "",
    assignedToId: "",
    dueDate: "",
    priority: "medium" as const,
    projectId: ""
  });
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);

  // Fetch meeting details
  const { data: meeting, isLoading: meetingLoading } = useQuery({
    queryKey: [`/api/meetings/${meetingId}`],
    enabled: !!meetingId
  });

  // Fetch meeting notes
  const { data: notes = [] } = useQuery({
    queryKey: [`/api/meeting-notes/${meetingId}`],
    enabled: !!meetingId
  });

  // Fetch meeting tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ["/api/meeting-tasks"],
    queryFn: async () => {
      const response = await fetch(`/api/meeting-tasks?meetingId=${meetingId}`);
      if (!response.ok) throw new Error('Failed to fetch tasks');
      return response.json();
    },
    enabled: !!meetingId
  });

  // Fetch meeting attendees
  const { data: attendees = [] } = useQuery({
    queryKey: [`/api/meetings/${meetingId}/attendees`],
    enabled: !!meetingId
  });

  // Fetch users for task assignment
  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"]
  });

  // Fetch projects for task linking
  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"]
  });

  // Update meeting mutation
  const updateMeetingMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/meetings/${meetingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error("Failed to update meeting");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/meetings/${meetingId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      setIsEditing(false);
      toast({ title: "Meeting updated successfully" });
    }
  });

  // Create note mutation
  const createNoteMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/meeting-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, meetingId })
      });
      if (!response.ok) throw new Error("Failed to create note");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/meeting-notes/${meetingId}`] });
      setNewNote("");
      setSelectedAgendaItem("");
      setShowNoteDialog(false);
      toast({ title: "Note added successfully" });
    }
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/meeting-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, meetingId })
      });
      if (!response.ok) throw new Error("Failed to create task");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-tasks"] });
      setNewTask({
        description: "",
        assignedToId: "",
        dueDate: "",
        priority: "medium",
        projectId: ""
      });
      setShowTaskDialog(false);
      toast({ title: "Task created successfully" });
    }
  });

  // Update task status mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: number; status: string }) => {
      const response = await fetch(`/api/meeting-tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (!response.ok) throw new Error("Failed to update task");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-tasks"] });
      toast({ title: "Task updated successfully" });
    }
  });

  // Debug meeting data - moved before early returns
  useEffect(() => {
    if (meeting) {
      console.log("🔍 Meeting data received:", JSON.stringify(meeting, null, 2));
    }
  }, [meeting]);

  useEffect(() => {
    if (meeting && !editedMeeting) {
      setEditedMeeting({ ...meeting });
    }
  }, [meeting]);

  useEffect(() => {
    if (attendees && isEditing) {
      setEditedAttendees(attendees.map((a: any) => a.userId));
    }
  }, [attendees, isEditing]);

  if (!meetingId) {
    return <div>Invalid meeting ID</div>;
  }

  if (meetingLoading) {
    return <div>Loading meeting...</div>;
  }

  if (!meeting) {
    return <div>Meeting not found</div>;
  }

  // Safe access to meeting properties
  const meetingData = meeting as any;

  const handleSaveMeeting = async () => {
    try {
      // Prepare meeting data with proper datetime conversion
      const meetingUpdateData = { ...editedMeeting };
      
      // Remove fields that shouldn't be updated
      delete meetingUpdateData.id;
      delete meetingUpdateData.createdAt;
      delete meetingUpdateData.updatedAt;
      delete meetingUpdateData.organizerId; // Don't change organizer
      
      // Ensure datetime is properly formatted as ISO string if it exists
      if (meetingUpdateData.datetime) {
        const dateValue = typeof meetingUpdateData.datetime === 'string' 
          ? meetingUpdateData.datetime 
          : new Date(meetingUpdateData.datetime).toISOString();
        meetingUpdateData.datetime = dateValue;
      }
      
      console.log('Sending meeting update:', meetingUpdateData);
      
      // Update meeting details
      await updateMeetingMutation.mutateAsync(meetingUpdateData);
      
      // Update attendees if they've changed
      if (attendees && editedAttendees) {
        const currentAttendeeIds = attendees.map((a: any) => a.userId);
        const attendeesToAdd = editedAttendees.filter(id => !currentAttendeeIds.includes(id));
        const attendeesToRemove = currentAttendeeIds.filter((id: string) => !editedAttendees.includes(id));
        
        // Add new attendees
        for (const userId of attendeesToAdd) {
          await fetch(`/api/meetings/${meetingId}/attendees`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
          });
        }
        
        // Remove attendees
        for (const userId of attendeesToRemove) {
          const attendee = attendees.find((a: any) => a.userId === userId);
          if (attendee) {
            await fetch(`/api/meetings/${meetingId}/attendees/${attendee.id}`, {
              method: 'DELETE'
            });
          }
        }
        
        // Refresh attendees data
        queryClient.invalidateQueries({ queryKey: [`/api/meetings/${meetingId}/attendees`] });
      }
    } catch (error) {
      console.error('Error saving meeting:', error);
      toast({ title: "Error saving meeting", variant: "destructive" });
    }
  };

  const handleCreateNote = () => {
    if (!newNote.trim() || !selectedAgendaItem) return;
    
    createNoteMutation.mutate({
      agendaItem: selectedAgendaItem,
      notes: newNote
    }, {
      onSuccess: () => {
        setShowNoteDialog(false);
        setSelectedAgendaItem("");
        setNewNote("");
        toast({ title: "Note added successfully" });
      },
      onError: (error) => {
        console.error("Error creating note:", error);
        toast({ title: "Error adding note", variant: "destructive" });
      }
    });
  };

  const handleCreateTask = () => {
    if (!newTask.description.trim() || !newTask.assignedToId) return;
    
    createTaskMutation.mutate({
      ...newTask,
      projectId: newTask.projectId || null
    });
  };

  const getTaskStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "default";
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate("/meetings")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Meetings
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{meetingData.title || "Untitled Meeting"}</h1>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                {meetingData.datetime ? format(new Date(meetingData.datetime), "PPP p") : "No date set"}
              </div>
              {meetingData.location && (
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {meetingData.location}
                </div>
              )}
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-1" />
                {Array.isArray(attendees) ? attendees.length : 0} attendees
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSaveMeeting} disabled={updateMeetingMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Meeting
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Meeting Details */}
          <Card>
            <CardHeader>
              <CardTitle>Meeting Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={editedMeeting?.title || ""}
                      onChange={(e) => setEditedMeeting((prev: any) => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={editedMeeting?.description || ""}
                      onChange={(e) => setEditedMeeting((prev: any) => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={editedMeeting?.location || ""}
                      onChange={(e) => setEditedMeeting((prev: any) => ({ ...prev, location: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Attendees</Label>
                    <div className="space-y-2">
                      {Array.isArray(users) && users.map((user: any) => (
                        <div key={user.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`attendee-${user.id}`}
                            checked={editedAttendees.includes(user.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditedAttendees(prev => [...prev, user.id]);
                              } else {
                                setEditedAttendees(prev => prev.filter(id => id !== user.id));
                              }
                            }}
                            className="rounded border-gray-300"
                          />
                          <label htmlFor={`attendee-${user.id}`} className="text-sm">
                            {user.firstName} {user.lastName} ({user.email})
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {meetingData.description && (
                    <div>
                      <Label>Description</Label>
                      <p className="text-sm text-muted-foreground">{meetingData.description}</p>
                    </div>
                  )}
                  <Badge variant="outline">{meetingData.status || "scheduled"}</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Agenda */}
          <Card>
            <CardHeader>
              <CardTitle>Agenda</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Array.isArray(meetingData.agenda) && meetingData.agenda.map((item: string, index: number) => (
                  <div key={index} className="flex items-center space-x-2 p-2 rounded border">
                    <span className="text-sm font-medium">{index + 1}.</span>
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
                {!Array.isArray(meetingData.agenda) && (
                  <p className="text-sm text-muted-foreground">No agenda items</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Meeting Notes</CardTitle>
              <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Note
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl">
                  <DialogHeader>
                    <DialogTitle>Add Meeting Note</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="agenda-item">Agenda Item</Label>
                      <Select value={selectedAgendaItem} onValueChange={setSelectedAgendaItem}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select agenda item" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.isArray(meetingData.agenda) && meetingData.agenda.map((item: string, index: number) => (
                            <SelectItem key={index} value={item}>
                              {index + 1}. {item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="note">Note</Label>
                      <Textarea
                        id="note"
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Enter your note..."
                        rows={6}
                        className="min-h-[120px]"
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => {
                        setShowNoteDialog(false);
                        setSelectedAgendaItem("");
                        setNewNote("");
                      }}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateNote} disabled={createNoteMutation.isPending || !selectedAgendaItem || !newNote.trim()}>
                        Add Note
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.isArray(notes) && notes.map((note: any) => (
                  <div key={note.id} className="border rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">{note.agendaItem}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(note.createdAt), "PPp")}
                      </span>
                    </div>
                    <p className="text-sm">{note.notes}</p>
                  </div>
                ))}
                {(!Array.isArray(notes) || notes.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No notes added yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Attendees */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Attendees ({Array.isArray(attendees) ? attendees.length : 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Array.isArray(attendees) && attendees.map((attendee: any) => (
                  <div key={attendee.id} className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {attendee.user?.firstName?.[0]}{attendee.user?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {attendee.user?.firstName} {attendee.user?.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{attendee.user?.email}</p>
                    </div>
                    {attendee.attended && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Action Items/Tasks */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Action Items</CardTitle>
              <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Task
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Action Item</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="task-description">Description</Label>
                      <Textarea
                        id="task-description"
                        value={newTask.description}
                        onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe the task..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="assignee">Assignee</Label>
                      <Select value={newTask.assignedToId} onValueChange={(value) => setNewTask(prev => ({ ...prev, assignedToId: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select assignee" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.isArray(users) && users.map((user: any) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.firstName} {user.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="due-date">Due Date</Label>
                      <Input
                        id="due-date"
                        type="date"
                        value={newTask.dueDate}
                        onChange={(e) => setNewTask(prev => ({ ...prev, dueDate: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="priority">Priority</Label>
                      <Select value={newTask.priority} onValueChange={(value) => setNewTask(prev => ({ ...prev, priority: value as any }))}>
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
                      <Label htmlFor="project">Link to Project (Optional)</Label>
                      <Select value={newTask.projectId} onValueChange={(value) => setNewTask(prev => ({ ...prev, projectId: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No project</SelectItem>
                          {Array.isArray(projects) && projects.map((project: any) => (
                            <SelectItem key={project.id} value={project.id.toString()}>
                              {project.projectNumber} - {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setShowTaskDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateTask} disabled={createTaskMutation.isPending}>
                        Create Task
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.isArray(tasks) && tasks.map((task: any) => (
                  <div key={task.id} className="border rounded p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        {getTaskStatusIcon(task.status)}
                        <span className="text-sm font-medium">{task.description}</span>
                      </div>
                      <Badge variant={getPriorityColor(task.priority)}>
                        {task.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>{task.assignedTo?.firstName} {task.assignedTo?.lastName}</span>
                      {task.dueDate && (
                        <>
                          <Separator orientation="vertical" className="h-3" />
                          <Calendar className="h-3 w-3" />
                          <span>{format(new Date(task.dueDate), "PP")}</span>
                        </>
                      )}
                      {task.project && (
                        <>
                          <Separator orientation="vertical" className="h-3" />
                          <LinkIcon className="h-3 w-3" />
                          <span>{task.project.projectNumber}</span>
                        </>
                      )}
                    </div>
                    <div className="flex space-x-1">
                      {task.status !== "completed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateTaskMutation.mutate({ taskId: task.id, status: "completed" })}
                        >
                          Mark Complete
                        </Button>
                      )}
                      {task.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateTaskMutation.mutate({ taskId: task.id, status: "in_progress" })}
                        >
                          Start
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {(!Array.isArray(tasks) || tasks.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No action items yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}