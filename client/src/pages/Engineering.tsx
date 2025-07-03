import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { 
  Users, 
  Wrench, 
  Calendar, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  Plus,
  Edit,
  Trash2,
  Target,
  TrendingUp,
  Activity,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Settings,
  FileText,
  Download,
  Upload,
  Search,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';
import { ModuleHelpButton } from '@/components/ModuleHelpButton';
import { engineeringHelpContent } from '@/data/moduleHelpContent';
import { usePermissions } from '@/components/PermissionsManager';
import { useAuth } from '@/hooks/use-auth';
import { ShieldX } from 'lucide-react';

interface EngineeringResource {
  id: string; // User ID
  firstName: string;
  lastName: string;
  discipline: 'ME' | 'EE' | 'ITE' | 'NTC';
  title: string;
  workloadStatus: 'available' | 'at_capacity' | 'overloaded' | 'unavailable';
  currentCapacityPercent: number;
  hourlyRate: number;
  skillLevel: 'junior' | 'intermediate' | 'senior' | 'principal';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface EngineeringTask {
  id: number;
  projectId: number;
  resourceId: number;
  discipline: 'ME' | 'EE' | 'ITE' | 'NTC';
  taskName: string;
  description: string | null;
  estimatedHours: number;
  actualHours: number | null;
  percentComplete: number;
  status: 'not_started' | 'in_progress' | 'under_review' | 'completed' | 'on_hold';
  priority: 'low' | 'medium' | 'high' | 'critical';
  startDate: string | null;
  dueDate: string | null;
  completedDate: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface EngineeringBenchmark {
  id: number;
  projectId: number;
  discipline: 'ME' | 'EE' | 'ITE' | 'NTC';
  benchmarkName: string;
  description: string | null;
  targetDate: string;
  actualDate: string | null;
  isCompleted: boolean;
  commitmentLevel: 'low' | 'medium' | 'high' | 'critical';
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ProjectEngineeringAssignment {
  id: number;
  projectId: number;
  resourceId: string; // User ID
  discipline: 'ME' | 'EE' | 'ITE' | 'NTC';
  percentage: number;
  isLead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface Project {
  id: number;
  name: string;
  projectNumber: string;
  status: string;
  meAssigned?: string | null;
  eeAssigned?: string | null;
  iteAssigned?: string | null;
  meDesignOrdersPercent?: number | null;
  eeDesignOrdersPercent?: number | null;
  itDesignOrdersPercent?: number | null;
  itPercentage?: number | null;
  ntcPercentage?: number | null;
  engineeringTasks?: number;
  completedTasks?: number;
  engineeringBenchmarks?: number;
  completedBenchmarks?: number;
}

interface EngineeringOverview {
  workloadStats: {
    totalEngineers: number;
    availableEngineers: number;
    atCapacityEngineers: number;
    overloadedEngineers: number;
    unavailableEngineers: number;
  };
  disciplineStats: Record<string, number>;
  taskStats: {
    totalTasks: number;
    notStarted: number;
    inProgress: number;
    underReview: number;
    completed: number;
    onHold: number;
  };
  benchmarkStats: {
    totalBenchmarks: number;
    completed: number;
    pending: number;
  };
  projects: Project[];
  resources: EngineeringResource[];
  recentTasks: EngineeringTask[];
  upcomingBenchmarks: EngineeringBenchmark[];
}

export default function Engineering() {
  const { userRole } = usePermissions();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [showResourceDialog, setShowResourceDialog] = useState(false);
  const [selectedResource, setSelectedResource] = useState<EngineeringResource | null>(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<EngineeringTask | null>(null);
  const [showEngineerEditDialog, setShowEngineerEditDialog] = useState(false);
  const [editingEngineer, setEditingEngineer] = useState<EngineeringResource | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [disciplineFilter, setDisciplineFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [projectViewMode, setProjectViewMode] = useState<'project' | 'engineer'>('project');
  const queryClient = useQueryClient();

  // All hooks must be called before any conditional returns
  // Fetch engineering overview data
  const { data: overview, isLoading: overviewLoading } = useQuery<EngineeringOverview>({
    queryKey: ['/api/engineering-overview'],
  });

  // Fetch engineering resources
  const { data: resources = [], isLoading: resourcesLoading } = useQuery<EngineeringResource[]>({
    queryKey: ['/api/engineering-resources'],
  });

  // Fetch engineering tasks
  const { data: tasks = [], isLoading: tasksLoading } = useQuery<EngineeringTask[]>({
    queryKey: ['/api/engineering-tasks'],
  });

  // Fetch engineering benchmarks
  const { data: benchmarks = [], isLoading: benchmarksLoading } = useQuery<EngineeringBenchmark[]>({
    queryKey: ['/api/engineering-benchmarks'],
  });

  // Fetch project assignments
  const { data: projectAssignments = [], isLoading: assignmentsLoading } = useQuery<ProjectEngineeringAssignment[]>({
    queryKey: ['/api/engineering/project-assignments'],
  });

  // Fetch projects with engineering data
  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  // Fetch engineering users
  const { data: engineers = [], isLoading: engineersLoading } = useQuery<any[]>({
    queryKey: ['/api/users'],
    select: (data: any[]) => data.filter(user => user.department === 'engineering'),
  });

  // Mutation for updating project assignments directly in Projects table
  const updateProjectAssignmentMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<{ 
      meAssigned: string | null; 
      eeAssigned: string | null; 
      iteAssigned: string | null;
      meDesignOrdersPercent: number | null;
      eeDesignOrdersPercent: number | null;
      itDesignOrdersPercent: number | null;
      ntcPercentage: number | null;
    }>) => {
      return await apiRequest('PUT', `/api/projects/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/engineering-overview'] });
    },
  });

  // Mutation for updating project assignments
  const updateAssignmentMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<ProjectEngineeringAssignment> & { id: number }) => {
      return await apiRequest('PUT', `/api/engineering/project-assignments/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/engineering/project-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    },
  });

  // Mutation for creating project assignments
  const createAssignmentMutation = useMutation({
    mutationFn: async (data: Omit<ProjectEngineeringAssignment, 'id' | 'createdAt' | 'updatedAt'>) => {
      return await apiRequest('POST', '/api/engineering/project-assignments', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/engineering/project-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    },
  });

  // Mutation for deleting project assignments
  const deleteAssignmentMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/engineering/project-assignments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/engineering/project-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    },
  });

  // Mutation for updating engineering resources
  const updateEngineerMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<EngineeringResource> & { id: number }) => {
      return await apiRequest('PUT', `/api/engineering-resources/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/engineering-resources'] });
      queryClient.invalidateQueries({ queryKey: ['/api/engineering-overview'] });
      setShowEngineerEditDialog(false);
      setEditingEngineer(null);
      toast({
        title: "Success",
        description: "Engineer updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update engineer",
        variant: "destructive",
      });
    },
  });

  // Mutation for creating project engineering assignments
  const createEngineerAssignmentMutation = useMutation({
    mutationFn: async (data: Omit<ProjectEngineeringAssignment, 'id' | 'createdAt' | 'updatedAt'>) => {
      return await apiRequest('POST', '/api/engineering/project-assignments', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/engineering/project-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/engineering-overview'] });
      toast({
        title: "Success",
        description: "Engineer assigned to project successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign engineer to project",
        variant: "destructive",
      });
    },
  });

  // Mutation for updating assignment percentage
  const updateAssignmentPercentageMutation = useMutation({
    mutationFn: async ({ assignmentId, percentage }: { assignmentId: number; percentage: number }) => {
      return await apiRequest('PUT', `/api/engineering/project-assignments/${assignmentId}`, { percentage });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/engineering/project-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/engineering-overview'] });
      toast({
        title: "Success",
        description: "Assignment percentage updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update assignment percentage",
        variant: "destructive",
      });
    },
  });

  // Check if user has access to Engineering module
  const hasEngineeringAccess = () => {
    // Only check userRole, user object can be null during loading
    if (!userRole) {
      return false;
    }

    // EDITOR and ADMIN roles can access regardless of department
    if (userRole === 'editor' || userRole === 'admin') {
      return true;
    }

    // VIEWER role can access ONLY if they are in the engineering department
    if (userRole === 'viewer') {
      return user?.department === 'engineering';
    }

    return false;
  };

  // Check if user can edit within Engineering module
  const canEditEngineering = () => {
    // Only check userRole, user object can be null during loading
    if (!userRole) {
      return false;
    }

    // EDITOR and ADMIN roles can edit regardless of department
    if (userRole === 'editor' || userRole === 'admin') {
      return true;
    }

    // VIEWER role can edit ONLY if they are in the engineering department
    if (userRole === 'viewer') {
      return user?.department === 'engineering';
    }

    return false;
  };

  // If user doesn't have access, show access denied message
  if (!hasEngineeringAccess()) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <ShieldX className="h-16 w-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            You don't have permission to access the Engineering Resource Planner.
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md">
            <p className="text-sm text-red-700">
              <strong>Requirements:</strong>
              <br />
              • Must have EDITOR or ADMIN role
              <br />
              • OR be a VIEWER in the Engineering department
              <br />
              • General VIEWER access is restricted
            </p>
          </div>
        </div>
      </div>
    );
  }



  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'at_capacity': return 'bg-yellow-100 text-yellow-800';
      case 'overloaded': return 'bg-red-100 text-red-800';
      case 'unavailable': return 'bg-gray-100 text-gray-800';
      case 'not_started': return 'bg-gray-100 text-gray-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'under_review': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'on_hold': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper function to get engineer assignments for a project
  const getProjectAssignments = (projectId: number) => {
    return projectAssignments.filter(assignment => assignment.projectId === projectId);
  };

  // Helper function to calculate percentage for a discipline on a project
  const getDisciplinePercentage = (projectId: number, discipline: 'ME' | 'EE' | 'ITE' | 'NTC') => {
    const assignments = getProjectAssignments(projectId);
    const disciplineAssignments = assignments.filter(a => a.discipline === discipline);
    return disciplineAssignments.reduce((sum, a) => sum + a.percentage, 0);
  };

  // Helper function to get assigned engineers for a project discipline
  const getAssignedEngineers = (projectId: number, discipline: 'ME' | 'EE' | 'ITE' | 'NTC') => {
    const assignments = getProjectAssignments(projectId);
    const disciplineAssignments = assignments.filter(a => a.discipline === discipline);
    return disciplineAssignments.map(assignment => {
      const engineer = engineers.find(eng => eng.id === assignment.resourceId);
      return engineer ? `${engineer.firstName} ${engineer.lastName}` : 'Unknown';
    }).join(', ');
  };

  // Function to handle engineer assignment update
  const handleEngineerAssignment = async (projectId: number, discipline: 'ME' | 'EE' | 'ITE' | 'NTC', engineerId: string) => {
    const engineer = engineers.find(eng => eng.id.toString() === engineerId);
    if (engineer) {
      const assignmentData: any = {};
      const engineerName = `${engineer.firstName} ${engineer.lastName}`;

      switch (discipline) {
        case 'ME':
          assignmentData.meAssigned = engineerName;
          break;
        case 'EE':
          assignmentData.eeAssigned = engineerName;
          break;
        case 'ITE':
          assignmentData.iteAssigned = engineerName;
          break;
      }

      await updateProjectAssignmentMutation.mutateAsync({
        id: projectId,
        ...assignmentData
      });
    }
  };

  // Function to handle percentage update
  const handlePercentageUpdate = async (projectId: number, discipline: 'ME' | 'EE' | 'ITE' | 'NTC', newPercentage: number) => {
    const percentageData: any = {};

    switch (discipline) {
      case 'ME':
        percentageData.meDesignOrdersPercent = newPercentage;
        break;
      case 'EE':
        percentageData.eeDesignOrdersPercent = newPercentage;
        break;
      case 'ITE':
        percentageData.itDesignOrdersPercent = newPercentage;
        break;
      case 'NTC':
        percentageData.ntcPercentage = newPercentage;
        break;
    }

    await updateProjectAssignmentMutation.mutateAsync({
      id: projectId,
      ...percentageData
    });
  };

  const formatPercentage = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    return `${Math.round(value)}%`;
  };

  // Function to handle engineer edit
  const handleEditEngineer = (engineer: EngineeringResource) => {
    setEditingEngineer(engineer);
    setShowEngineerEditDialog(true);
  };

  // Function to handle engineer form submission
  const handleEngineerSubmit = (formData: any) => {
    if (editingEngineer) {
      updateEngineerMutation.mutate({
        id: editingEngineer.id,
        ...formData,
      });
    }
  };

  // Function to handle project assignment
  const handleProjectAssignment = async (engineerId: string, projectId: string) => {
    console.log('🔍 DEBUG: Starting assignment creation for engineer:', engineerId, 'project:', projectId);
    
    const engineer = resources.find(r => r.id === engineerId);
    if (!engineer) {
      console.error('🔍 DEBUG: Engineer not found in resources for ID:', engineerId);
      return;
    }

    console.log('🔍 DEBUG: Found engineer in resources:', engineer);

    // Check if engineer is already assigned to this project using the user ID
    const existingAssignment = projectAssignments.find(
      a => a.resourceId === engineerId && a.projectId === parseInt(projectId)
    );

    if (existingAssignment) {
      toast({
        title: "Info",
        description: "Engineer is already assigned to this project",
        variant: "default",
      });
      return;
    }

    console.log('🔍 DEBUG: Creating assignment with user ID:', engineerId);
    
    const assignmentData = {
      projectId: parseInt(projectId),
      resourceId: engineerId, // Use the actual user ID
      discipline: engineer.discipline as 'ME' | 'EE' | 'ITE' | 'NTC',
      percentage: 50, // Default percentage
      isLead: false,
    };
    
    console.log('🔍 DEBUG: Assignment data to be sent:', assignmentData);

    createEngineerAssignmentMutation.mutate(assignmentData);
  };

  // Function to get engineer assignments
  const getEngineerAssignments = (engineerId: string) => {
    console.log('🔍 DEBUG: Getting assignments for engineer ID:', engineerId);
    console.log('🔍 DEBUG: Available project assignments:', projectAssignments);
    console.log('🔍 DEBUG: Project assignments loading:', assignmentsLoading);
    
    // Filter assignments by the user ID directly
    const assignments = projectAssignments.filter(assignment => assignment.resourceId === engineerId);
    console.log('🔍 DEBUG: Found assignments:', assignments);
    
    return assignments;
  };

  // Function to update assignment percentage
  const handleAssignmentPercentageUpdate = (assignmentId: number, newPercentage: number) => {
    if (newPercentage >= 0 && newPercentage <= 100) {
      updateAssignmentPercentageMutation.mutate({
        assignmentId,
        percentage: newPercentage,
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold">Engineering Resource Planner</h1>
            <p className="text-muted-foreground">
              Manage engineering resources, track project assignments, and monitor benchmarks
            </p>
          </div>
          <ModuleHelpButton moduleId="engineering" helpContent={engineeringHelpContent} />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="resource-planning">Resource Planning</TabsTrigger>
          <TabsTrigger value="benchmarks-overview">Benchmarks Overview</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {overviewLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading overview data...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Workload Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Engineers</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{overview?.workloadStats.totalEngineers || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Available</CardTitle>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{overview?.workloadStats.availableEngineers || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">At Capacity</CardTitle>
                    <Clock className="h-4 w-4 text-yellow-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">{overview?.workloadStats.atCapacityEngineers || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Overloaded</CardTitle>
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{overview?.workloadStats.overloadedEngineers || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Unavailable</CardTitle>
                    <Activity className="h-4 w-4 text-gray-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-600">{overview?.workloadStats.unavailableEngineers || 0}</div>
                  </CardContent>
                </Card>
              </div>

              

              {/* Projects with Engineering Data */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Projects Overview</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        All projects with engineering assignments and adjustable percentages
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      {/* Search Input */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          placeholder="Search projects..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 w-64"
                        />
                      </div>

                      {/* View Mode Toggle */}
                      <div className="flex border border-gray-300 dark:border-gray-600 rounded-lg">
                        <Button
                          variant={projectViewMode === 'project' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setProjectViewMode('project')}
                          className={`rounded-r-none ${
                            projectViewMode === 'project' 
                              ? 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700' 
                              : 'bg-white text-gray-900 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Project View
                        </Button>
                        <Button
                          variant={projectViewMode === 'engineer' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setProjectViewMode('engineer')}
                          className={`rounded-l-none ${
                            projectViewMode === 'engineer' 
                              ? 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700' 
                              : 'bg-white text-gray-900 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          <Users className="h-4 w-4 mr-1" />
                          Engineer View
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto max-h-[800px] overflow-y-auto">
                    {projectViewMode === 'project' ? (
                      <table className="w-full">
                        <thead className="sticky top-0 bg-white">
                          <tr className="border-b">
                            <th className="text-left p-2">Project</th>
                            <th className="text-left p-2">Status</th>
                            <th className="text-left p-2">ME Assigned</th>
                            <th className="text-left p-2">EE Assigned</th>
                            <th className="text-left p-2">ITE Assigned</th>
                            <th className="text-left p-2">ME %</th>
                            <th className="text-left p-2">EE %</th>
                            <th className="text-left p-2">IT %</th>
                            <th className="text-left p-2">NTC %</th>
                            <th className="text-left p-2">Tasks</th>
                            <th className="text-left p-2">Benchmarks</th>
                            <th className="text-left p-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {projects
                            .filter(project => 
                              searchTerm === '' || 
                              project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              project.projectNumber.toLowerCase().includes(searchTerm.toLowerCase())
                            )
                            .map((project) => (
                            <tr key={project.id} className="border-b hover:bg-gray-50">
                              <td className="p-2">
                                <div>
                                  <div className="font-medium">{project.name}</div>
                                  <div className="text-sm text-muted-foreground">{project.projectNumber}</div>
                                </div>
                              </td>
                              <td className="p-2">
                                <Badge variant="outline" className={getStatusColor(project.status)}>
                                  {project.status}
                                </Badge>
                              </td>
                              <td className="p-2 text-sm">{project.meAssigned || 'Unassigned'}</td>
                              <td className="p-2 text-sm">{project.eeAssigned || 'Unassigned'}</td>
                              <td className="p-2 text-sm">{project.iteAssigned || 'Unassigned'}</td>
                              <td className="p-2">
                                <div className="text-center text-sm">
                                  {formatPercentage(project.meDesignOrdersPercent)}
                                </div>
                              </td>
                              <td className="p-2">
                                <div className="text-center text-sm">
                                  {formatPercentage(project.eeDesignOrdersPercent)}
                                </div>
                              </td>
                              <td className="p-2">
                                <div className="text-center text-sm">
                                  {formatPercentage(project.itDesignOrdersPercent)}
                                </div>
                              </td>
                              <td className="p-2">
                                <div className="text-center text-sm">
                                  {formatPercentage(project.ntcPercentage)}
                                </div>
                              </td>
                              <td className="p-2 text-sm">
                                {project.completedTasks || 0} / {project.engineeringTasks || 0}
                              </td>
                              <td className="p-2 text-sm">
                                {project.completedBenchmarks || 0} / {project.engineeringBenchmarks || 0}
                              </td>
                              <td className="p-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedProject(project);
                                    setShowProjectDialog(true);
                                  }}
                                >
                                  <Wrench className="h-4 w-4 mr-1" />
                                  Manage
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="space-y-6">
                        {engineers
                          .filter(engineer => 
                            searchTerm === '' ||
                            `${engineer.firstName} ${engineer.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
                          )
                          .map((engineer) => {
                            const engineerProjects = projects.filter(project => 
                              project.meAssigned === `${engineer.firstName} ${engineer.lastName}` ||
                              project.eeAssigned === `${engineer.firstName} ${engineer.lastName}` ||
                              project.iteAssigned === `${engineer.firstName} ${engineer.lastName}`
                            );

                            return (
                              <div key={engineer.id} className="border rounded-lg p-4">
                                <div className="flex items-center justify-between mb-4">
                                  <div>
                                    <h4 className="text-lg font-semibold">
                                      {engineer.firstName} {engineer.lastName}
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                      {engineer.title || 'Engineer'} • {engineer.department}
                                    </p>
                                  </div>
                                  <Badge variant="outline" className="text-sm">
                                    {engineerProjects.length} Project{engineerProjects.length !== 1 ? 's' : ''}
                                  </Badge>
                                </div>

                                {engineerProjects.length > 0 ? (
                                  <div className="overflow-x-auto">
                                    <table className="w-full">
                                      <thead>
                                        <tr className="border-b text-sm">
                                          <th className="text-left p-2">Project</th>
                                          <th className="text-left p-2">Status</th>
                                          <th className="text-left p-2">Role</th>
                                          <th className="text-left p-2">Percentage</th>
                                          <th className="text-left p-2">Tasks</th>
                                          <th className="text-left p-2">Actions</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {engineerProjects.map((project) => {
                                          const engineerName = `${engineer.firstName} ${engineer.lastName}`;
                                          let role = '';
                                          let percentage = 0;

                                          if (project.meAssigned === engineerName) {
                                            role = 'ME';
                                            percentage = project.meDesignOrdersPercent || 0;
                                          } else if (project.eeAssigned === engineerName) {
                                            role = 'EE';
                                            percentage = project.eeDesignOrdersPercent || 0;
                                          } else if (project.iteAssigned === engineerName) {
                                            role = 'ITE';
                                            percentage = project.itDesignOrdersPercent || 0;
                                          }

                                          return (
                                            <tr key={project.id} className="border-b hover:bg-gray-50">
                                              <td className="p-2">
                                                <div>
                                                  <div className="font-medium text-sm">{project.name}</div>
                                                  <div className="text-xs text-muted-foreground">{project.projectNumber}</div>
                                                </div>
                                              </td>
                                              <td className="p-2">
                                                <Badge variant="outline" className={getStatusColor(project.status) + ' text-xs'}>
                                                  {project.status}                                                </Badge>
                                              </td>
                                              <td className="p-2">
                                                <Badge variant="outline" className="text-xs">{role}</Badge>
                                              </td>
                                              <td className="p-2 text-sm text-center">
                                                {formatPercentage(percentage)}
                                              </td>
                                              <td className="p-2 text-sm">
                                                {project.completedTasks || 0} / {project.engineeringTasks || 0}
                                              </td>
                                              <td className="p-2">
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  onClick={() => {
                                                    setSelectedProject(project);
                                                    setShowProjectDialog(true);
                                                  }}
                                                >
                                                  <Wrench className="h-4 w-4" />
                                                </Button>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <div className="text-center text-muted-foreground py-4">
                                    No projects assigned to this engineer
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Resource Planning Tab */}
        <TabsContent value="resource-planning" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Resource Planning & Workload Monitoring</h2>
            <Button className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Engineer
            </Button>
          </div>

          {resourcesLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading resource data...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search engineers..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>

                  {/* Discipline Filter */}
                  <Select value={disciplineFilter} onValueChange={setDisciplineFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Discipline" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Disciplines</SelectItem>
                      <SelectItem value="ME">ME</SelectItem>
                      <SelectItem value="EE">EE</SelectItem>
                      <SelectItem value="ITE">ITE</SelectItem>
                      <SelectItem value="NTC">NTC</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Status Filter */}
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="at_capacity">At Capacity</SelectItem>
                      <SelectItem value="overloaded">Overloaded</SelectItem>
                      <SelectItem value="unavailable">Unavailable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* View Toggle */}
                <div className="flex border border-gray-300 dark:border-gray-600 rounded-lg">
                  <Button
                    variant={projectViewMode === 'project' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setProjectViewMode('project')}
                    className={`rounded-r-none ${
                      projectViewMode === 'project' 
                        ? 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700' 
                        : 'bg-white text-gray-900 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <BarChart3 className="h-4 w-4 mr-1" />
                    Grid View
                  </Button>
                  <Button
                    variant={projectViewMode === 'engineer' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setProjectViewMode('engineer')}
                    className={`rounded-l-none ${
                      projectViewMode === 'engineer' 
                        ? 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700' 
                        : 'bg-white text-gray-900 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Users className="h-4 w-4 mr-1" />
                    List View
                  </Button>
                </div>
              </div>

              {/* Grid View */}
              {projectViewMode === 'project' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {resources
                    .filter(resource => {
                      const matchesSearch = searchTerm === '' || 
                        `${resource.firstName} ${resource.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        resource.title.toLowerCase().includes(searchTerm.toLowerCase());
                      const matchesDiscipline = disciplineFilter === 'all' || resource.discipline === disciplineFilter;
                      const matchesStatus = statusFilter === 'all' || resource.workloadStatus === statusFilter;
                      return matchesSearch && matchesDiscipline && matchesStatus;
                    })
                    .map((resource) => (
                    <Card key={resource.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">
                            {resource.firstName} {resource.lastName}
                          </CardTitle>
                          <Badge className={getStatusColor(resource.workloadStatus)}>
                            {resource.workloadStatus.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {resource.discipline} • {resource.title}
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span>Current Capacity</span>
                            <span>{resource.currentCapacityPercent}%</span>
                          </div>
                          <Progress value={resource.currentCapacityPercent} className="h-2" />
                        </div>

                        {/* Project Assignments */}
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Project Assignments</div>
                          {getEngineerAssignments(resource.id).length > 0 ? (
                            <div className="space-y-2">
                              {getEngineerAssignments(resource.id).map((assignment) => {
                                const project = projects.find(p => p.id === assignment.projectId);
                                return (
                                  <div key={assignment.id} className="bg-gray-50 p-2 rounded text-xs">
                                    <div className="font-medium">{project?.projectNumber}</div>
                                    <div className="text-gray-600 truncate">{project?.name}</div>
                                    <div className="flex items-center justify-between mt-1">
                                      <span className="text-gray-500">{assignment.discipline}</span>
                                      <div className="flex items-center gap-1">
                                        <Input
                                          type="number"
                                          min="0"
                                          max="100"
                                          value={assignment.percentage}
                                          onChange={(e) => handleAssignmentPercentageUpdate(assignment.id, parseInt(e.target.value) || 0)}
                                          className="w-12 h-6 text-xs"
                                          disabled={!canEditEngineering()}
                                        />
                                        <span className="text-xs">%</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-500">No project assignments</div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditEngineer(resource)}
                            disabled={!canEditEngineering()}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button variant="outline" size="sm">
                            View Tasks
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* List View */}
              {projectViewMode === 'engineer' && (
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="border-b bg-gray-50">
                          <tr>
                            <th className="text-left p-4 font-medium">Engineer</th>
                            <th className="text-left p-4 font-medium">Discipline</th>
                            <th className="text-left p-4 font-medium">Title</th>
                            <th className="text-left p-4 font-medium">Status</th>
                            <th className="text-left p-4 font-medium">Capacity</th>
                            <th className="text-left p-4 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {resources
                            .filter(resource => {
                              const matchesSearch = searchTerm === '' || 
                                `${resource.firstName} ${resource.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                resource.title.toLowerCase().includes(searchTerm.toLowerCase());
                              const matchesDiscipline = disciplineFilter === 'all' || resource.discipline === disciplineFilter;
                              const matchesStatus = statusFilter === 'all' || resource.workloadStatus === statusFilter;
                              return matchesSearch && matchesDiscipline && matchesStatus;
                            })
                            .map((resource, index) => (
                              <tr key={resource.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="p-4">
                                  <div className="font-medium">
                                    {resource.firstName} {resource.lastName}
                                  </div>
                                </td>
                                <td className="p-4">
                                  <Badge variant="outline">{resource.discipline}</Badge>
                                </td>
                                <td className="p-4 text-sm text-muted-foreground">
                                  {resource.title}
                                </td>
                                <td className="p-4">
                                  <Badge className={getStatusColor(resource.workloadStatus)}>
                                    {resource.workloadStatus.replace('_', ' ')}
                                  </Badge>
                                </td>
                                <td className="p-4">
                                  <div className="flex items-center gap-2">
                                    <div className="w-24">
                                      <Progress value={resource.currentCapacityPercent} className="h-2" />
                                    </div>
                                    <span className="text-sm">{resource.currentCapacityPercent}%</span>
                                  </div>
                                </td>
                                <td className="p-4">
                                  <div className="space-y-2">
                                    <div className="flex gap-2">
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => handleEditEngineer(resource)}
                                        disabled={!canEditEngineering()}
                                      >
                                        <Edit className="h-4 w-4 mr-1" />
                                        Edit
                                      </Button>
                                      <Button variant="outline" size="sm">
                                        View Tasks
                                      </Button>
                                    </div>

                                    {/* Project Assignments Dropdown */}
                                    {getEngineerAssignments(resource.id).length > 0 && (
                                      <details className="group">
                                        <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                                          <span className="group-open:rotate-90 transition-transform">▶</span>
                                          {getEngineerAssignments(resource.id).length} Project{getEngineerAssignments(resource.id).length !== 1 ? 's' : ''}
                                        </summary>
                                        <div className="mt-2 space-y-1 pl-4 border-l-2 border-gray-200">
                                          {getEngineerAssignments(resource.id).map((assignment) => {
                                            const project = projects.find(p => p.id === assignment.projectId);
                                            return (
                                              <div key={assignment.id} className="bg-gray-50 p-2 rounded text-xs">
                                                <div className="font-medium">{project?.projectNumber}</div>
                                                <div className="text-gray-600 truncate">{project?.name}</div>
                                                <div className="flex items-center justify-between mt-1">
                                                  <Badge variant="outline" className="text-xs">{assignment.discipline}</Badge>
                                                  <div className="flex items-center gap-1">
                                                    <Input
                                                      type="number"
                                                      min="0"
                                                      max="100"
                                                      value={assignment.percentage}
                                                      onChange={(e) => handleAssignmentPercentageUpdate(assignment.id, parseInt(e.target.value) || 0)}
                                                      className="w-12 h-6 text-xs"
                                                    />
                                                    <span className="text-xs">%</span>
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </details>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* Benchmarks Overview Tab */}
        <TabsContent value="benchmarks-overview" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Engineering Benchmarks Overview</h2>
            <Button className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Benchmark
            </Button>
          </div>

          {/* Benchmark Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Benchmarks</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.benchmarkStats.totalBenchmarks || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{overview?.benchmarkStats.completed || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Clock className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{overview?.benchmarkStats.pending || 0}</div>
              </CardContent>
            </Card>
          </div>

          {benchmarksLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading benchmark data...</p>
              </div>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Engineering Commit Dates & Benchmarks</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Track engineering commitments and benchmark progress across disciplines
                </p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Benchmark</th>
                        <th className="text-left p-2">Project</th>
                        <th className="text-left p-2">Discipline</th>
                        <th className="text-left p-2">Target Date</th>
                        <th className="text-left p-2">Actual Date</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">Commitment Level</th>
                        <th className="text-left p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {benchmarks.slice(0, 20).map((benchmark) => (
                        <tr key={benchmark.id} className="border-b hover:bg-gray-50">
                          <td className="p-2">
                            <div>
                              <div className="font-medium">{benchmark.benchmarkName}</div>
                              {benchmark.description && (
                                <div className="text-sm text-muted-foreground">{benchmark.description}</div>
                              )}
                            </div>
                          </td>
                          <td className="p-2 text-sm">Project #{benchmark.projectId}</td>
                          <td className="p-2">
                            <Badge variant="outline">{benchmark.discipline}</Badge>
                          </td>
                          <td className="p-2 text-sm">
                            {format(new Date(benchmark.targetDate), 'MMM dd, yyyy')}
                          </td>
                          <td className="p-2 text-sm">
                            {benchmark.actualDate 
                              ? format(new Date(benchmark.actualDate), 'MMM dd, yyyy')
                              : 'Pending'
                            }
                          </td>
                          <td className="p-2">
                            <Badge className={benchmark.isCompleted ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                              {benchmark.isCompleted ? 'Completed' : 'In Progress'}
                            </Badge>
                          </td>
                          <td className="p-2">
                            <Badge className={getPriorityColor(benchmark.commitmentLevel)}>
                              {benchmark.commitmentLevel}
                            </Badge>
                          </td>
                          <td className="p-2">
                            <div className="flex gap-1">
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Project Engineering Dialog */}
      <Dialog open={showProjectDialog} onOpenChange={setShowProjectDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Engineering Management - {selectedProject?.name}
            </DialogTitle>
          </DialogHeader>

          {selectedProject && (
            <div className="space-y-6">
              {/* Project Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Project Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Project Name</Label>
                      <p className="text-sm">{selectedProject.name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Project Number</Label>
                      <p className="text-sm">{selectedProject.projectNumber}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Status</Label>
                      <Badge className={getStatusColor(selectedProject.status)}>
                        {selectedProject.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Engineering Assignments */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Engineering Assignments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {['ME', 'EE', 'ITE', 'NTC'].map((discipline) => (
                      <div key={discipline} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">{discipline} Engineering</h4>
                          <Badge variant="outline">{discipline}</Badge>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label className="text-sm">Assigned Engineers</Label>
                            <p className="text-sm text-muted-foreground">
                              {(discipline === 'ME' && selectedProject.meAssigned) ||
                               (discipline === 'EE' && selectedProject.eeAssigned) ||
                               (discipline === 'ITE' && selectedProject.iteAssigned) ||
                               'None assigned'}
                            </p>
                          </div>

                          <div>
                            <Label className="text-sm">Current Percentage</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={
                                  discipline === 'ME' ? (selectedProject.meDesignOrdersPercent || 0) :
                                  discipline === 'EE' ? (selectedProject.eeDesignOrdersPercent || 0) :
                                  discipline === 'ITE' ? (selectedProject.itDesignOrdersPercent || 0) :
                                  discipline === 'NTC' ? (selectedProject.ntcPercentage || 0) : 0
                                }
                                onChange={(e) => handlePercentageUpdate(
                                  selectedProject.id, 
                                  discipline as 'ME' | 'EE' | 'ITE' | 'NTC', 
                                  parseInt(e.target.value) || 0
                                )}
                                className="w-20"
                                disabled={updateProjectAssignmentMutation.isPending}
                              />
                              <span className="text-sm">%</span>
                            </div>
                          </div>

                          <div>
                            <Label className="text-sm">Assign Engineer</Label>
                            <Select onValueChange={(value) => handleEngineerAssignment(
                              selectedProject.id,
                              discipline as 'ME' | 'EE' | 'ITE' | 'NTC',
                              value
                            )}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select engineer" />
                              </SelectTrigger>
                              <SelectContent>
                                {engineers
                                  .filter(eng => eng.discipline === discipline)
                                  .map(engineer => (
                                    <SelectItem key={engineer.id} value={engineer.id.toString()}>
                                      {engineer.firstName} {engineer.lastName} - {engineer.title}
                                    </SelectItem>
                                  ))
                                }
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Current Assignments Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Current Project Assignments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Engineer</th>
                          <th className="text-left p-2">Discipline</th>
                          <th className="text-left p-2">Percentage</th>
                          <th className="text-left p-2">Lead</th>
                          <th className="text-left p-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getProjectAssignments(selectedProject.id).map((assignment) => {
                          const engineer = engineers.find(eng => eng.id === assignment.resourceId);
                          return (
                            <tr key={assignment.id} className="border-b">
                              <td className="p-2">
                                {engineer ? `${engineer.firstName} ${engineer.lastName}` : 'Unknown'}
                              </td>
                              <td className="p-2">
                                <Badge variant="outline">{assignment.discipline}</Badge>
                              </td>
                              <td className="p-2">{assignment.percentage}%</td>
                              <td className="p-2">
                                {assignment.isLead ? (
                                  <Badge className="bg-blue-100 text-blue-800">Lead</Badge>
                                ) : (
                                  <span className="text-muted-foreground">Member</span>
                                )}
                              </td>
                              <td className="p-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => deleteAssignmentMutation.mutate(assignment.id)}
                                  disabled={deleteAssignmentMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProjectDialog(false)}>
              Close
            </Button>
            <Button onClick={() => setShowProjectDialog(false)}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Engineer Edit Dialog */}
      <Dialog open={showEngineerEditDialog} onOpenChange={setShowEngineerEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Edit Engineer - {editingEngineer?.firstName} {editingEngineer?.lastName}
            </DialogTitle>
          </DialogHeader>

          {editingEngineer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    defaultValue={editingEngineer.firstName}
                    onChange={(e) => setEditingEngineer({...editingEngineer, firstName: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    defaultValue={editingEngineer.lastName}
                    onChange={(e) => setEditingEngineer({...editingEngineer, lastName: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="discipline">Discipline</Label>
                  <Select 
                    value={editingEngineer.discipline} 
                    onValueChange={(value: 'ME' | 'EE' | 'ITE' | 'NTC') => 
                      setEditingEngineer({...editingEngineer, discipline: value})
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ME">ME</SelectItem>
                      <SelectItem value="EE">EE</SelectItem>
                      <SelectItem value="ITE">ITE</SelectItem>
                      <SelectItem value="NTC">NTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    defaultValue={editingEngineer.title}
                    onChange={(e) => setEditingEngineer({...editingEngineer, title: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="workloadStatus">Workload Status</Label>
                  <Select 
                    value={editingEngineer.workloadStatus} 
                    onValueChange={(value: 'available' | 'at_capacity' | 'overloaded' | 'unavailable') => 
                      setEditingEngineer({...editingEngineer, workloadStatus: value})
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="at_capacity">At Capacity</SelectItem>
                      <SelectItem value="overloaded">Overloaded</SelectItem>
                      <SelectItem value="unavailable">Unavailable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="currentCapacityPercent">Current Capacity (%)</Label>
                  <Input
                    id="currentCapacityPercent"
                    type="number"
                    min="0"
                    max="200"
                    defaultValue={editingEngineer.currentCapacityPercent}
                    onChange={(e) => setEditingEngineer({
                      ...editingEngineer, 
                      currentCapacityPercent: parseInt(e.target.value) || 0
                    })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="projectAssignment">Assign to Project</Label>
                <Select onValueChange={(value) => handleProjectAssignment(editingEngineer.id, value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project to assign" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.projectNumber} - {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={editingEngineer.isActive}
                  onChange={(e) => setEditingEngineer({...editingEngineer, isActive: e.target.checked})}
                  className="rounded"
                />
                <Label htmlFor="isActive">Active Engineer</Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowEngineerEditDialog(false);
                setEditingEngineer(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => handleEngineerSubmit(editingEngineer)}
              disabled={updateEngineerMutation.isPending}
            >
              {updateEngineerMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}