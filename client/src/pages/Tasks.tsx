import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  CheckSquare, 
  Clock, 
  AlertCircle, 
  ExternalLink,
  Calendar,
  User,
  Filter,
  CheckCircle2,
  Search,
  SortAsc,
  SortDesc,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import { Link } from 'wouter';
import { queryClient } from '@/lib/queryClient';

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
  link: string;
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

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'completed': return 'default';
    case 'in_progress': return 'secondary';
    case 'overdue': return 'destructive';
    default: return 'outline';
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

const Tasks = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('priority');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Fetch user's assigned tasks
  const { data: tasks = [], isLoading } = useQuery<TaskItem[]>({
    queryKey: ['/api/my-tasks', user?.id],
    enabled: !!user?.id,
  });

  // Filter and search tasks
  const filteredTasks = tasks.filter((task: TaskItem) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        task.title.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.projectName?.toLowerCase().includes(query) ||
        task.projectNumber?.toLowerCase().includes(query) ||
        task.meetingTitle?.toLowerCase().includes(query);
      
      if (!matchesSearch) return false;
    }

    // Status filter
    if (filterStatus !== 'all') {
      if (filterStatus === 'active' && !['pending', 'in_progress'].includes(task.status)) return false;
      if (filterStatus !== 'active' && task.status !== filterStatus) return false;
    }

    // Priority filter
    if (filterPriority !== 'all' && task.priority !== filterPriority) return false;

    // Type filter
    if (filterType !== 'all' && task.type !== filterType) return false;

    return true;
  });

  // Sort tasks
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortBy) {
      case 'priority':
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 2;
        bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 2;
        break;
      case 'dueDate':
        aValue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        bValue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        break;
      case 'createdAt':
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
        break;
      case 'title':
        aValue = a.title.toLowerCase();
        bValue = b.title.toLowerCase();
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Count tasks by status
  const taskCounts = {
    all: tasks.length,
    active: tasks.filter((t: TaskItem) => ['pending', 'in_progress'].includes(t.status)).length,
    pending: tasks.filter((t: TaskItem) => t.status === 'pending').length,
    in_progress: tasks.filter((t: TaskItem) => t.status === 'in_progress').length,
    completed: tasks.filter((t: TaskItem) => t.status === 'completed').length,
    overdue: tasks.filter((t: TaskItem) => t.status === 'overdue').length,
  };

  const TaskCard = ({ task }: { task: TaskItem }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 flex-1">
            {getStatusIcon(task.status)}
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">{task.title}</h3>
              {task.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {task.description}
                </p>
              )}
            </div>
          </div>
          <Link href={task.link}>
            <Button variant="ghost" size="sm">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge variant={getStatusBadgeVariant(task.status)} className="text-xs">
              {task.status.replace('_', ' ').toUpperCase()}
            </Badge>
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`} />
              <span className={`text-xs font-medium ${getPriorityTextColor(task.priority)}`}>
                {task.priority.toUpperCase()}
              </span>
            </div>
            <Badge variant="outline" className="text-xs">
              {task.type.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>

          {task.dueDate && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span className={task.status === 'overdue' ? 'text-red-500 font-medium' : ''}>
                {formatDate(task.dueDate)}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-3">
            {task.projectName && (
              <div className="flex items-center gap-1">
                <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                  {task.projectNumber}
                </span>
                <span className="truncate max-w-32">{task.projectName}</span>
              </div>
            )}
            {task.meetingTitle && (
              <span className="truncate max-w-32">Meeting: {task.meetingTitle}</span>
            )}
          </div>

          {task.assignedBy && (
            <span className="text-xs">by {task.assignedBy}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">My Tasks</h1>
        <p className="text-muted-foreground">
          Manage all your assigned tasks across projects, meetings, and concerns
        </p>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filters & Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status ({taskCounts.all})</SelectItem>
                <SelectItem value="active">Active ({taskCounts.active})</SelectItem>
                <SelectItem value="pending">Pending ({taskCounts.pending})</SelectItem>
                <SelectItem value="in_progress">In Progress ({taskCounts.in_progress})</SelectItem>
                <SelectItem value="completed">Completed ({taskCounts.completed})</SelectItem>
                <SelectItem value="overdue">Overdue ({taskCounts.overdue})</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="project_task">Project Tasks</SelectItem>
                <SelectItem value="meeting_task">Meeting Tasks</SelectItem>
                <SelectItem value="elevated_concern">Concerns</SelectItem>
              </SelectContent>
            </Select>

            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
              const [newSortBy, newSortOrder] = value.split('-');
              setSortBy(newSortBy);
              setSortOrder(newSortOrder as 'asc' | 'desc');
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="priority-asc">Priority (Low to High)</SelectItem>
                <SelectItem value="priority-desc">Priority (High to Low)</SelectItem>
                <SelectItem value="dueDate-asc">Due Date (Earliest)</SelectItem>
                <SelectItem value="dueDate-desc">Due Date (Latest)</SelectItem>
                <SelectItem value="createdAt-desc">Newest First</SelectItem>
                <SelectItem value="createdAt-asc">Oldest First</SelectItem>
                <SelectItem value="title-asc">Title (A-Z)</SelectItem>
                <SelectItem value="title-desc">Title (Z-A)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Task Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-foreground">{taskCounts.all}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{taskCounts.active}</div>
            <div className="text-sm text-muted-foreground">Active</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">{taskCounts.pending}</div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{taskCounts.in_progress}</div>
            <div className="text-sm text-muted-foreground">In Progress</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{taskCounts.completed}</div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{taskCounts.overdue}</div>
            <div className="text-sm text-muted-foreground">Overdue</div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks List */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">
          Tasks ({sortedTasks.length})
        </h2>
        {sortedTasks.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
            Sorted by {sortBy}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : sortedTasks.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CheckSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No tasks found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || filterStatus !== 'all' || filterPriority !== 'all' || filterType !== 'all' 
                ? 'Try adjusting your filters or search query.'
                : 'You don\'t have any tasks assigned to you yet.'}
            </p>
            {(searchQuery || filterStatus !== 'all' || filterPriority !== 'all' || filterType !== 'all') && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchQuery('');
                  setFilterStatus('all');
                  setFilterPriority('all');
                  setFilterType('all');
                }}
              >
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sortedTasks.map((task: TaskItem) => (
            <TaskCard key={`${task.type}-${task.id}`} task={task} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Tasks;