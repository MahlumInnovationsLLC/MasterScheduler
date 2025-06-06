import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Edit, Save, Plus, X, CheckCircle, Circle, Calendar, Clock, MapPin, Users, FileText, Download, LinkIcon } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { ProjectLinkDialog } from "@/components/meetings/ProjectLinkDialog";
import type { Meeting, MeetingNote, MeetingTask, Project } from "@shared/schema";

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

interface MeetingNote {
  id: number;
  meetingId: number;
  agendaItem: string;
  notes?: string;
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

interface MeetingAttendee {
  id: number;
  meetingId: number;
  userId: string;
  attended: boolean;
  createdAt: string;
}

interface User {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export default function MeetingDetails() {
  const { id } = useParams<{ id: string }>();
  const meetingId = parseInt(id!);
  const [isEditing, setIsEditing] = useState(false);
  const [newNote, setNewNote] = useState({ agendaItem: "", notes: "" });
  const [newTask, setNewTask] = useState({
    description: "",
    assignedToId: "",
    dueDate: "",
    priority: "medium" as const
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch meeting data
  const { data: meeting, isLoading: meetingLoading } = useQuery<Meeting>({
    queryKey: [`/api/meetings/${meetingId}`],
  });

  const { data: notes = [], isLoading: notesLoading } = useQuery<MeetingNote[]>({
    queryKey: [`/api/meetings/${meetingId}/notes`],
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<MeetingTask[]>({
    queryKey: [`/api/meeting-tasks`, meetingId],
    queryFn: () => apiRequest(`/api/meeting-tasks?meetingId=${meetingId}`),
  });

  const { data: attendees = [], isLoading: attendeesLoading } = useQuery<MeetingAttendee[]>({
    queryKey: [`/api/meetings/${meetingId}/attendees`],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  // Mutations
  const updateMeetingMutation = useMutation({
    mutationFn: (data: Partial<Meeting>) => 
      apiRequest(`/api/meetings/${meetingId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/meetings/${meetingId}`] });
      toast({ title: "Meeting updated successfully" });
      setIsEditing(false);
    },
  });

  const createNoteMutation = useMutation({
    mutationFn: (data: { agendaItem: string; notes: string }) =>
      apiRequest(`/api/meetings/${meetingId}/notes`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/meetings/${meetingId}/notes`] });
      setNewNote({ agendaItem: "", notes: "" });
      toast({ title: "Note added successfully" });
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<MeetingNote> }) =>
      apiRequest(`/api/notes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/meetings/${meetingId}/notes`] });
      toast({ title: "Note updated successfully" });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: typeof newTask) =>
      apiRequest('/api/meeting-tasks', {
        method: 'POST',
        body: JSON.stringify({ ...data, meetingId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/meeting-tasks`] });
      setNewTask({ description: "", assignedToId: "", dueDate: "", priority: "medium" });
      toast({ title: "Task created successfully" });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<MeetingTask> }) =>
      apiRequest(`/api/meeting-tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/meeting-tasks`] });
      toast({ title: "Task updated successfully" });
    },
  });

  const updateAttendanceMutation = useMutation({
    mutationFn: ({ userId, attended }: { userId: string; attended: boolean }) =>
      apiRequest(`/api/meetings/${meetingId}/attendees/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ attended }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/meetings/${meetingId}/attendees`] });
      toast({ title: "Attendance updated" });
    },
  });

  const exportMeetingMutation = useMutation({
    mutationFn: (format: 'word' | 'pdf') =>
      fetch(`/api/meetings/${meetingId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ format }),
      }),
    onSuccess: async (response, format) => {
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `meeting-${meetingId}.${format === 'word' ? 'docx' : 'pdf'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast({ title: `Meeting exported as ${format.toUpperCase()}` });
      }
    },
  });

  const getUserDisplayName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return 'Unknown User';
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.username || user.email || 'Unknown User';
  };

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

  const handleStartMeeting = () => {
    updateMeetingMutation.mutate({ status: "in_progress" });
  };

  const handleCompleteMeeting = () => {
    updateMeetingMutation.mutate({ status: "completed" });
  };

  const handleToggleTaskStatus = (task: MeetingTask) => {
    const newStatus = task.status === "completed" ? "pending" : "completed";
    updateTaskMutation.mutate({ id: task.id, data: { status: newStatus } });
  };

  if (meetingLoading || notesLoading || tasksLoading || attendeesLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Meeting not found</h1>
          <Link href="/meetings">
            <Button className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Meetings
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/meetings">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Meetings
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{meeting.title}</h1>
            <div className="flex items-center gap-4 text-muted-foreground">
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
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(meeting.status)}
          {meeting.status === "scheduled" && (
            <Button onClick={handleStartMeeting}>Start Meeting</Button>
          )}
          {meeting.status === "in_progress" && (
            <Button onClick={handleCompleteMeeting}>Complete Meeting</Button>
          )}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Export Meeting</DialogTitle>
                <DialogDescription>
                  Choose the format to export this meeting
                </DialogDescription>
              </DialogHeader>
              <div className="flex gap-2">
                <Button 
                  onClick={() => exportMeetingMutation.mutate('word')}
                  disabled={exportMeetingMutation.isPending}
                >
                  Export as Word
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => exportMeetingMutation.mutate('pdf')}
                  disabled={exportMeetingMutation.isPending}
                >
                  Export as PDF
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Meeting Info Card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Meeting Information</CardTitle>
              <CardDescription>{meeting.description}</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              <Edit className="h-4 w-4 mr-2" />
              {isEditing ? "Cancel" : "Edit"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {meeting.virtualLink && (
            <div className="mb-4">
              <strong>Virtual Link:</strong>{" "}
              <a
                href={meeting.virtualLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {meeting.virtualLink}
              </a>
            </div>
          )}
          {meeting.agenda && meeting.agenda.length > 0 && (
            <div>
              <strong>Agenda:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                {meeting.agenda.map((item, index) => (
                  <li key={index} className="text-sm">{item}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="notes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="tasks">Action Items</TabsTrigger>
          <TabsTrigger value="attendees">Attendees</TabsTrigger>
        </TabsList>

        <TabsContent value="notes" className="space-y-4">
          {/* Add Note Form */}
          <Card>
            <CardHeader>
              <CardTitle>Add Note</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Agenda item..."
                value={newNote.agendaItem}
                onChange={(e) => setNewNote({ ...newNote, agendaItem: e.target.value })}
              />
              <Textarea
                placeholder="Meeting notes..."
                value={newNote.notes}
                onChange={(e) => setNewNote({ ...newNote, notes: e.target.value })}
              />
              <Button
                onClick={() => createNoteMutation.mutate(newNote)}
                disabled={!newNote.agendaItem || createNoteMutation.isPending}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Note
              </Button>
            </CardContent>
          </Card>

          {/* Notes List */}
          <div className="space-y-4">
            {notes.map((note) => (
              <Card key={note.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{note.agendaItem}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{note.notes || "No notes added yet"}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          {/* Add Task Form */}
          <Card>
            <CardHeader>
              <CardTitle>Create Action Item</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Task description..."
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              />
              <div className="grid grid-cols-3 gap-4">
                <Select
                  value={newTask.assignedToId}
                  onValueChange={(value) => setNewTask({ ...newTask, assignedToId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Assign to..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {getUserDisplayName(user.id)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                />
                <Select
                  value={newTask.priority}
                  onValueChange={(value) => setNewTask({ ...newTask, priority: value as "low" | "medium" | "high" })}
                >
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
              <Button
                onClick={() => createTaskMutation.mutate(newTask)}
                disabled={!newTask.description || !newTask.assignedToId || createTaskMutation.isPending}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Task
              </Button>
            </CardContent>
          </Card>

          {/* Tasks List */}
          <div className="space-y-4">
            {tasks.map((task) => (
              <Card key={task.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleTaskStatus(task)}
                        className="p-0 h-6 w-6"
                      >
                        {task.status === "completed" ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <Circle className="h-5 w-5 text-gray-400" />
                        )}
                      </Button>
                      <div className="space-y-1">
                        <p className={`font-medium ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                          {task.description}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>Assigned to: {getUserDisplayName(task.assignedToId)}</span>
                          {task.dueDate && (
                            <span>Due: {format(new Date(task.dueDate), 'MMM d, yyyy')}</span>
                          )}
                        </div>
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

        <TabsContent value="attendees" className="space-y-4">
          <div className="grid gap-4">
            {attendees.map((attendee) => (
              <Card key={attendee.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">{getUserDisplayName(attendee.userId)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateAttendanceMutation.mutate({
                          userId: attendee.userId,
                          attended: !attendee.attended
                        })}
                      >
                        {attendee.attended ? "Mark Absent" : "Mark Present"}
                      </Button>
                      <Badge variant={attendee.attended ? "default" : "secondary"}>
                        {attendee.attended ? "Present" : "Absent"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}