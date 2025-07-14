import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CalendarIcon, CheckCircleIcon, ClockIcon, FolderIcon, ListTodoIcon } from "lucide-react";
import { Link } from "wouter";
import type { Meeting, Task } from "@shared/schema";
import { safeFilter, ensureArray } from "@/lib/array-utils";

interface ProjectActivitySummaryProps {
  projectId: number;
}

interface ActivitySummary {
  meetings: Meeting[];
  meetingTasks: Task[];
  totalMeetings: number;
  upcomingMeetings: number;
  pendingMeetingTasks: number;
}

export function ProjectActivitySummary({ projectId }: ProjectActivitySummaryProps) {
  const { data: summary, isLoading } = useQuery<ActivitySummary>({
    queryKey: ["/api/projects", projectId, "activity-summary"],
    enabled: !!projectId
  });

  const { data: projectMeetings = [] } = useQuery<Meeting[]>({
    queryKey: ["/api/projects", projectId, "meetings"],
    enabled: !!projectId
  });

  const { data: meetingTasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/projects", projectId, "meeting-tasks"],
    enabled: !!projectId
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Meeting Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Loading meeting activity...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return null;
  }

  const getStatusColor = (status: string) => {
    const colors = {
      scheduled: "bg-blue-100 text-blue-800",
      in_progress: "bg-yellow-100 text-yellow-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
      pending: "bg-gray-100 text-gray-800"
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: "bg-green-100 text-green-800",
      medium: "bg-yellow-100 text-yellow-800",
      high: "bg-red-100 text-red-800"
    };
    return colors[priority as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">{summary.totalMeetings}</div>
                <div className="text-sm text-muted-foreground">Total Meetings</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ClockIcon className="h-4 w-4 text-blue-600" />
              <div>
                <div className="text-2xl font-bold text-blue-600">{summary.upcomingMeetings}</div>
                <div className="text-sm text-muted-foreground">Upcoming</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ListTodoIcon className="h-4 w-4 text-yellow-600" />
              <div>
                <div className="text-2xl font-bold text-yellow-600">{summary.pendingMeetingTasks}</div>
                <div className="text-sm text-muted-foreground">Pending Tasks</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {safeFilter(ensureArray(summary.meetingTasks, [], 'ProjectActivitySummary.meetingTasks'), task => task.status === 'completed', 'ProjectActivitySummary.completedTasks').length}
                </div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Meetings */}
      {projectMeetings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Recent Meetings
            </CardTitle>
            <CardDescription>
              Meetings linked to this project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {projectMeetings.slice(0, 5).map((meeting) => (
                <div key={meeting.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-medium">{meeting.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(meeting.datetime).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(meeting.status)}>
                      {meeting.status}
                    </Badge>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/meetings/${meeting.id}`}>View</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Meeting Tasks */}
      {meetingTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TaskIcon className="h-5 w-5" />
              Meeting-Generated Tasks
            </CardTitle>
            <CardDescription>
              Tasks created from meeting activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {meetingTasks.slice(0, 10).map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-medium">{task.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {task.description && task.description.length > 100 
                          ? `${task.description.substring(0, 100)}...`
                          : task.description
                        }
                      </div>
                      {task.dueDate && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getPriorityColor(task.priority || 'medium')}>
                      {task.priority || 'medium'}
                    </Badge>
                    <Badge className={getStatusColor(task.status || 'pending')}>
                      {task.status || 'pending'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Activity State */}
      {projectMeetings.length === 0 && meetingTasks.length === 0 && (
        <Card>
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <FolderIcon className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-lg font-medium">No Meeting Activity</h3>
                <p className="text-muted-foreground">
                  This project hasn't been linked to any meetings yet.
                </p>
              </div>
              <Button asChild>
                <Link href="/meetings">Browse Meetings</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}