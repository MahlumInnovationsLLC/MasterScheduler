import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  Activity
} from 'lucide-react';
import { format } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';

interface EngineeringResource {
  id: number;
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
  resourceId: number;
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
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const queryClient = useQueryClient();

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

  const formatPercentage = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    return `${Math.round(value)}%`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Engineering Resource Planner</h1>
          <p className="text-muted-foreground">
            Manage engineering resources, track project assignments, and monitor benchmarks
          </p>
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

              {/* Discipline Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Engineering Discipline Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(overview?.disciplineStats || {}).map(([discipline, count]) => (
                      <div key={discipline} className="text-center">
                        <div className="text-2xl font-bold">{count}</div>
                        <div className="text-sm text-muted-foreground">{discipline}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Projects with Engineering Data */}
              <Card>
                <CardHeader>
                  <CardTitle>Projects Overview</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Current projects with engineering assignments and completion percentages
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
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
                        </tr>
                      </thead>
                      <tbody>
                        {overview?.projects.slice(0, 10).map((project) => (
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
                            <td className="p-2 text-sm">{formatPercentage(project.meDesignOrdersPercent)}</td>
                            <td className="p-2 text-sm">{formatPercentage(project.eeDesignOrdersPercent)}</td>
                            <td className="p-2 text-sm">{formatPercentage(project.itDesignOrdersPercent)}</td>
                            <td className="p-2 text-sm">{formatPercentage(project.ntcPercentage)}</td>
                            <td className="p-2 text-sm">
                              {project.completedTasks || 0} / {project.engineeringTasks || 0}
                            </td>
                            <td className="p-2 text-sm">
                              {project.completedBenchmarks || 0} / {project.engineeringBenchmarks || 0}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
            <Button>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {resources.map((resource) => (
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
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Skill Level:</span>
                        <div className="font-medium capitalize">{resource.skillLevel}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Rate:</span>
                        <div className="font-medium">${resource.hourlyRate}/hr</div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
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
        </TabsContent>

        {/* Benchmarks Overview Tab */}
        <TabsContent value="benchmarks-overview" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Engineering Benchmarks Overview</h2>
            <Button>
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
    </div>
  );
}