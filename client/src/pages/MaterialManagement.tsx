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
import type { Project, ManufacturingBay, ManufacturingSchedule } from '@shared/schema';

interface TeamWithProjects {
  team: string;
  projects: Project[];
}

const MaterialManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch data from separate endpoints
  const { data: projects, isLoading: isLoadingProjects, error: projectsError } = useQuery<Project[]>({
    queryKey: ['/api/projects']
  });

  const { data: manufacturingBays, isLoading: isLoadingBays, error: baysError } = useQuery<ManufacturingBay[]>({
    queryKey: ['/api/manufacturing-bays']
  });

  const { data: manufacturingSchedules, isLoading: isLoadingSchedules, error: schedulesError } = useQuery<ManufacturingSchedule[]>({
    queryKey: ['/api/manufacturing-schedules']
  });

  // Combine loading states and errors
  const isLoading = isLoadingProjects || isLoadingBays || isLoadingSchedules;
  const hasError = projectsError || baysError || schedulesError;

  // Combine data into expected format
  const data = useMemo(() => {
    if (!projects || !manufacturingBays || !manufacturingSchedules) return null;
    return {
      projects,
      manufacturingBays,
      manufacturingSchedules
    };
  }, [projects, manufacturingBays, manufacturingSchedules]);

  // Update material status mutation
  const updateMaterialStatus = useMutation({
    mutationFn: async ({ projectId, status }: { projectId: number; status: string }) => {
      return await apiRequest('PATCH', `/api/projects/${projectId}`, {
        materialManagementStatus: status
      });
    },
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/manufacturing-bays'] });
      queryClient.invalidateQueries({ queryKey: ['/api/manufacturing-schedules'] });
      toast({
        title: "Status Updated",
        description: "Material management status has been updated successfully.",
      });
    },
    onError: (error) => {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update material status. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Process teams with projects
  const teamsWithProjects = useMemo(() => {
    if (!data?.projects || !data?.manufacturingBays || !data?.manufacturingSchedules) return [];

    // Get unique team names from manufacturing bays
    const teamNames = new Set(
      data.manufacturingBays
        .filter((bay: ManufacturingBay) => bay.team && bay.team.trim() !== '')
        .map((bay: ManufacturingBay) => bay.team)
    );

    return Array.from(teamNames).map(teamName => {
      // Find all projects for this team, excluding delivered projects
      const teamProjects = data.manufacturingSchedules
        .filter((schedule: ManufacturingSchedule) => 
          data.manufacturingBays.some((b: ManufacturingBay) => b.team === teamName && b.id === schedule.bayId)
        )
        .map((schedule: ManufacturingSchedule) => 
          data.projects.find((p: Project) => p.id === schedule.projectId)
        )
        .filter((p: Project | undefined): p is Project => p !== undefined)
        .filter((p: Project) => p.status !== 'delivered'); // Filter out delivered projects

      return {
        team: teamName,
        projects: teamProjects
      };
    }).filter(team => team.projects.length > 0);
  }, [data]);

  // Filter teams based on search
  const filteredTeams = useMemo(() => {
    if (!searchTerm) return teamsWithProjects;
    
    return teamsWithProjects.filter((team) =>
      team.team?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.projects.some((project: Project) =>
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.projectNumber.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [teamsWithProjects, searchTerm]);

  // Status display mapping - converts database values to display names
  const getStatusDisplay = (status?: string | null) => {
    switch (status) {
      case 'in_qc':
        return 'IN QC';
      case 'in_work':
        return 'IN WORK';
      case 'inventory_job_cart':
        return 'Inventory Job Cart';
      case 'shipped':
        return 'SHIPPED';
      default:
        return 'Not Set';
    }
  };

  // Status color mapping
  const getStatusColor = (status?: string | null) => {
    switch (status) {
      case 'in_qc':
        return 'bg-orange-500 text-white';
      case 'in_work':
        return 'bg-blue-500 text-white';
      case 'inventory_job_cart':
        return 'bg-purple-500 text-white';
      case 'shipped':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  // Status icon mapping
  const getStatusIcon = (status?: string | null) => {
    switch (status) {
      case 'in_qc':
        return <AlertCircle className="h-4 w-4" />;
      case 'in_work':
        return <Clock className="h-4 w-4" />;
      case 'inventory_job_cart':
        return <Package className="h-4 w-4" />;
      case 'shipped':
        return <Truck className="h-4 w-4" />;
      default:
        return <CheckCircle className="h-4 w-4" />;
    }
  };

  const handleStatusUpdate = (projectId: number, newStatus: string) => {
    updateMaterialStatus.mutate({ projectId, status: newStatus });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center text-red-500">
          <p>Error loading material management data</p>
          <p className="text-sm mt-2">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Package className="h-8 w-8 text-blue-500" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Material Management</h1>
      </div>

      {/* Description */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-gray-700">
        <p className="text-gray-700 dark:text-gray-300">
          Track and manage material status for all manufacturing teams and their projects. 
          Update status to keep the team informed about material availability and progress.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search teams or projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredTeams.map((team) => (
          <Card key={team.team} className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-500" />
                {team.team}
              </CardTitle>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {team.projects.length} project{team.projects.length !== 1 ? 's' : ''}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {team.projects.map((project) => (
                <div key={project.id} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">{project.projectNumber}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">{project.name}</p>
                    </div>
                  </div>
                  
                  {/* Current Status */}
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className={`${getStatusColor(project.materialManagementStatus)} flex items-center gap-1`}>
                      {getStatusIcon(project.materialManagementStatus)}
                      {getStatusDisplay(project.materialManagementStatus)}
                    </Badge>
                  </div>

                  {/* Status Update Dropdown */}
                  <div className="flex items-center gap-2">
                    <Select
                      value={project.materialManagementStatus || ''}
                      onValueChange={(value) => handleStatusUpdate(project.id, value)}
                    >
                      <SelectTrigger className="flex-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                        <SelectItem value="in_qc" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-orange-500" />
                            IN QC
                          </div>
                        </SelectItem>
                        <SelectItem value="in_work" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-blue-500" />
                            IN WORK
                          </div>
                        </SelectItem>
                        <SelectItem value="inventory_job_cart" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-purple-500" />
                            Inventory Job Cart
                          </div>
                        </SelectItem>
                        <SelectItem value="shipped" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-green-500" />
                            SHIPPED
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* No Results */}
      {filteredTeams.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <Package className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-600 dark:text-gray-400 mb-2">No teams found</h3>
          <p className="text-gray-500 dark:text-gray-500">
            {searchTerm ? 'No teams match your search criteria.' : 'No manufacturing teams with projects found.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default MaterialManagement;