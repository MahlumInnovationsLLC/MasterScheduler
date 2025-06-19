import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  CheckSquare, 
  Clock, 
  AlertCircle, 
  ExternalLink,
  Calendar,
  User,
  Filter,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/use-auth';
import { Link } from 'wouter';

interface TaskItem {
  id: number;
  type: 'project_task' | 'meeting_task' | 'elevated_concern';
  title: string;
  description?: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  projectId?: number;
  projectName?: string;
  projectNumber?: string;
  meetingId?: number;
  meetingTitle?: string;
  assignedBy?: string;
  createdAt: string;
  link: string; // Direct link to the task location
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent': return 'bg-red-500';
    case 'high': return 'bg-orange-500';
    case 'medium': return 'bg-yellow-500';
    case 'low': return 'bg-green-500';
    default: return 'bg-gray-500';
  }
};

const getPriorityTextColor = (priority: string) => {
  switch (priority) {
    case 'urgent': return 'text-red-600 dark:text-red-400';
    case 'high': return 'text-orange-600 dark:text-orange-400';
    case 'medium': return 'text-yellow-600 dark:text-yellow-400';
    case 'low': return 'text-green-600 dark:text-green-400';
    default: return 'text-gray-600 dark:text-gray-400';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'in_progress':
      return <Clock className="h-4 w-4 text-blue-500" />;
    case 'overdue':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    default:
      return <CheckSquare className="h-4 w-4 text-gray-500" />;
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) return 'Today';
  if (diffInDays === 1) return 'Tomorrow';
  if (diffInDays === -1) return 'Yesterday';
  if (diffInDays < 0) return `${Math.abs(diffInDays)} days overdue`;
  if (diffInDays <= 7) return `${diffInDays} days`;
  
  return date.toLocaleDateString();
};

export const MyTasks = () => {
  const { user } = useAuth();
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Fetch user's assigned tasks
  const { data: tasks = [], isLoading } = useQuery<TaskItem[]>({
    queryKey: ['/api/my-tasks', user?.id],
    enabled: !!user?.id,
  });

  // Separate active and completed tasks
  const activeTasks = tasks.filter((task: TaskItem) => task.status !== 'completed');
  const completedTasks = tasks.filter((task: TaskItem) => task.status === 'completed');

  // Filter active tasks based on status
  const filteredActiveTasks = activeTasks.filter((task: TaskItem) => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'active') return ['pending', 'in_progress', 'overdue'].includes(task.status);
    return task.status === filterStatus;
  });

  // Count tasks by status
  const taskCounts = {
    all: tasks.length,
    active: activeTasks.length,
    pending: tasks.filter((t: TaskItem) => t.status === 'pending').length,
    in_progress: tasks.filter((t: TaskItem) => t.status === 'in_progress').length,
    completed: completedTasks.length,
    overdue: tasks.filter((t: TaskItem) => t.status === 'overdue').length,
  };

  const TaskCard = ({ task }: { task: TaskItem }) => (
    <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-1">
          {getStatusIcon(task.status)}
          <h4 className="font-medium text-sm text-foreground truncate">{task.title}</h4>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`} />
          <Link href={`/projects/${task.projectId}`}>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <ExternalLink className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>
      
      {task.description && (
        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
          {task.description}
        </p>
      )}
      
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          {task.projectName && (
            <span className="flex items-center gap-1">
              <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">
                {task.projectNumber}
              </span>
              {task.projectName}
            </span>
          )}
          {task.meetingTitle && (
            <span>Meeting: {task.meetingTitle}</span>
          )}
        </div>
        
        {task.dueDate && (
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span className={task.status === 'overdue' ? 'text-red-500' : ''}>
              {formatDate(task.dueDate)}
            </span>
          </div>
        )}
      </div>
      
      <div className="flex items-center justify-between mt-2">
        <Badge variant="outline" className={`text-xs ${getPriorityTextColor(task.priority)}`}>
          {task.priority.toUpperCase()}
        </Badge>
        
        {task.assignedBy && (
          <span className="text-xs text-muted-foreground">
            by {task.assignedBy}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <CheckSquare className="h-5 w-5 text-muted-foreground" />
          {taskCounts.active > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {taskCounts.active > 99 ? '99+' : taskCounts.active}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-96 p-0">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <DropdownMenuLabel className="p-0 text-base font-semibold">
              My Tasks
            </DropdownMenuLabel>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Filter className="h-4 w-4 mr-1" />
                  Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setFilterStatus('all')}>
                  All Tasks ({taskCounts.all})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus('active')}>
                  Active ({taskCounts.active})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus('pending')}>
                  Pending ({taskCounts.pending})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus('in_progress')}>
                  In Progress ({taskCounts.in_progress})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus('completed')}>
                  Completed ({taskCounts.completed})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus('overdue')}>
                  Overdue ({taskCounts.overdue})
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <div className="flex gap-2 text-sm text-muted-foreground">
            <span>{taskCounts.active} active</span>
            {taskCounts.overdue > 0 && (
              <span className="text-red-500">{taskCounts.overdue} overdue</span>
            )}
          </div>
        </div>

        <ScrollArea className="max-h-96">
          <div className="p-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : activeTasks.length === 0 && completedTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No tasks assigned to you</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Active Tasks Section */}
                {filteredActiveTasks.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2 px-1">
                      Active Tasks ({filteredActiveTasks.length})
                    </h4>
                    <div className="space-y-2">
                      {filteredActiveTasks.map((task: TaskItem) => (
                        <TaskCard key={`${task.type}-${task.id}`} task={task} />
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Completed Tasks Section */}
                {completedTasks.length > 0 && (filterStatus === 'all' || filterStatus === 'completed') && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2 px-1 border-t pt-4">
                      Completed Tasks ({completedTasks.length})
                    </h4>
                    <div className="space-y-2 opacity-60">
                      {completedTasks.map((task: TaskItem) => (
                        <TaskCard key={`${task.type}-${task.id}`} task={task} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {(filteredActiveTasks.length > 0 || completedTasks.length > 0) && (
          <div className="p-3 border-t">
            <Link href="/tasks">
              <Button variant="outline" className="w-full" size="sm">
                View All Tasks
              </Button>
            </Link>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};