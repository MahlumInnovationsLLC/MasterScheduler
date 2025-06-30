import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/lib/queryClient';
import { Package, Search, Clock, CheckCircle, Truck, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Project {
  id: number;
  projectNumber: string;
  name: string;
  materialManagementStatus: 'in_qc' | 'in_work' | 'inventory_job_cart' | 'shipped';
  status: string;
  totalHours?: number;
}

interface ManufacturingBay {
  id: number;
  bayNumber: number;
  name: string;
  team: string;
}

interface ManufacturingSchedule {
  id: number;
  bayId: number;
  projectId: number;
  startDate: string;
  endDate: string;
  project?: Project;
}

const statusConfig = {
  in_qc: {
    label: 'IN QC',
    color: 'bg-yellow-500',
    textColor: 'text-white',
    icon: AlertCircle,
    description: 'Quality Control Review'
  },
  in_work: {
    label: 'IN WORK',
    color: 'bg-blue-500',
    textColor: 'text-white',
    icon: Clock,
    description: 'Currently In Progress'
  },
  inventory_job_cart: {
    label: 'INVENTORY JOB CART',
    color: 'bg-green-500',
    textColor: 'text-white',
    icon: Package,
    description: 'Ready for Inventory'
  },
  shipped: {
    label: 'SHIPPED',
    color: 'bg-gray-500',
    textColor: 'text-white',
    icon: Truck,
    description: 'Shipped to Customer'
  }
};

export default function MaterialManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch data
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['/api/projects'],
  });

  const { data: manufacturingBays = [], isLoading: baysLoading } = useQuery({
    queryKey: ['/api/manufacturing-bays'],
  });

  const { data: manufacturingSchedules = [], isLoading: schedulesLoading } = useQuery({
    queryKey: ['/api/manufacturing-schedules'],
  });

  // Update material management status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ projectId, status }: { projectId: number; status: string }) => {
      return await apiRequest(`/api/projects/${projectId}`, {
        method: 'PATCH',
        body: { materialManagementStatus: status }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({
        title: 'Status Updated',
        description: 'Material management status has been updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update material management status.',
        variant: 'destructive',
      });
    }
  });

  // Group projects by teams
  const teamProjects = useMemo(() => {
    if (!projects.length || !manufacturingBays.length || !manufacturingSchedules.length) {
      return [];
    }

    // Create a map of active projects by team
    const teamMap = new Map();

    // Get unique teams from manufacturing bays
    const teams = [...new Set(manufacturingBays
      .filter(bay => bay.team && bay.team !== 'General' && !bay.team.match(/^Team \d+:?/))
      .map(bay => bay.team)
    )];

    // Initialize team structure
    teams.forEach(teamName => {
      teamMap.set(teamName, {
        name: teamName,
        projects: [],
        bays: manufacturingBays.filter(bay => bay.team === teamName)
      });
    });

    // Add projects to teams based on current manufacturing schedules
    manufacturingSchedules.forEach(schedule => {
      const bay = manufacturingBays.find(b => b.id === schedule.bayId);
      const project = projects.find(p => p.id === schedule.projectId);
      
      if (bay && project && bay.team && teamMap.has(bay.team)) {
        const team = teamMap.get(bay.team);
        // Only add if project isn't already in this team (avoid duplicates)
        if (!team.projects.find(p => p.id === project.id)) {
          team.projects.push({
            ...project,
            scheduleId: schedule.id,
            bayId: schedule.bayId,
            bayName: bay.name,
            startDate: schedule.startDate,
            endDate: schedule.endDate
          });
        }
      }
    });

    // Filter teams that have projects and apply search/filter
    const filteredTeams = Array.from(teamMap.values())
      .filter(team => team.projects.length > 0)
      .map(team => ({
        ...team,
        projects: team.projects.filter(project => {
          const matchesSearch = searchTerm === '' || 
            project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            project.projectNumber.toLowerCase().includes(searchTerm.toLowerCase());
          
          const matchesStatus = filterStatus === 'all' || 
            project.materialManagementStatus === filterStatus;
          
          return matchesSearch && matchesStatus;
        })
      }))
      .filter(team => team.projects.length > 0);

    return filteredTeams;
  }, [projects, manufacturingBays, manufacturingSchedules, searchTerm, filterStatus]);

  const handleStatusUpdate = (projectId: number, newStatus: string) => {
    updateStatusMutation.mutate({ projectId, status: newStatus });
  };

  const isLoading = projectsLoading || baysLoading || schedulesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Package className="h-8 w-8 mx-auto mb-2 text-gray-400 animate-spin" />
          <p className="text-gray-400">Loading material management data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Material Management</h1>
          <div className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-blue-500" />
            <span className="text-sm text-gray-400">
              {teamProjects.reduce((acc, team) => acc + team.projects.length, 0)} Active Projects
            </span>
          </div>
        </div>

        {/* Status Legend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Status Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(statusConfig).map(([key, config]) => {
                const IconComponent = config.icon;
                return (
                  <div key={key} className="flex items-center space-x-2">
                    <div className={`p-2 rounded-lg ${config.color}`}>
                      <IconComponent className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{config.label}</p>
                      <p className="text-xs text-gray-400">{config.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(statusConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Teams and Projects */}
      <div className="space-y-6">
        {teamProjects.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-400">No projects found matching your criteria.</p>
            </CardContent>
          </Card>
        ) : (
          teamProjects.map((team) => (
            <Card key={team.name} className="overflow-hidden">
              <CardHeader className="bg-slate-800 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl text-blue-400">{team.name}</CardTitle>
                  <Badge variant="outline" className="text-blue-400 border-blue-400">
                    {team.projects.length} Projects
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {team.projects.map((project) => {
                    const statusInfo = statusConfig[project.materialManagementStatus];
                    const StatusIcon = statusInfo.icon;
                    
                    return (
                      <Card key={project.id} className="border-slate-700 bg-slate-800/50">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            {/* Project Header */}
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-sm truncate">{project.name}</h3>
                                <p className="text-xs text-gray-400">{project.projectNumber}</p>
                              </div>
                              <Badge className={`${statusInfo.color} ${statusInfo.textColor} text-xs`}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusInfo.label}
                              </Badge>
                            </div>

                            {/* Project Details */}
                            <div className="space-y-2 text-xs text-gray-400">
                              <div className="flex justify-between">
                                <span>Bay:</span>
                                <span>{project.bayName}</span>
                              </div>
                              {project.totalHours && (
                                <div className="flex justify-between">
                                  <span>Hours:</span>
                                  <span>{project.totalHours}</span>
                                </div>
                              )}
                              <div className="flex justify-between">
                                <span>End Date:</span>
                                <span>{new Date(project.endDate).toLocaleDateString()}</span>
                              </div>
                            </div>

                            {/* Status Update */}
                            <div className="pt-2 border-t border-slate-600">
                              <Select
                                value={project.materialManagementStatus}
                                onValueChange={(value) => handleStatusUpdate(project.id, value)}
                                disabled={updateStatusMutation.isPending}
                              >
                                <SelectTrigger className="w-full h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(statusConfig).map(([key, config]) => (
                                    <SelectItem key={key} value={key}>
                                      <div className="flex items-center space-x-2">
                                        <config.icon className="h-3 w-3" />
                                        <span>{config.label}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}