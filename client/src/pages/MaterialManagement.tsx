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

interface BayScheduleData {
  projects: Project[];
  manufacturingBays: ManufacturingBay[];
  manufacturingSchedules: ManufacturingSchedule[];
}

interface TeamWithProjects {
  team: string;
  projects: Project[];
}

const MaterialManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch data from separate endpoints
  const { data: projects, isLoading: isLoadingProjects } = useQuery<Project[]>({
    queryKey: ['/api/projects']
  });

  const { data: manufacturingBays, isLoading: isLoadingBays } = useQuery<ManufacturingBay[]>({
    queryKey: ['/api/manufacturing-bays']
  });

  const { data: manufacturingSchedules, isLoading: isLoadingSchedules } = useQuery<ManufacturingSchedule[]>({
    queryKey: ['/api/manufacturing-schedules']
  });

  // Combine loading states
  const isLoading = isLoadingProjects || isLoadingBays || isLoadingSchedules;

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
      return await apiRequest(`/api/projects/${projectId}`, 'PATCH', {
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
      // Find all projects for this team
      const teamProjects = data.manufacturingSchedules
        .filter((schedule: ManufacturingSchedule) => 
          data.manufacturingBays.some((b: ManufacturingBay) => b.team === teamName && b.id === schedule.bayId)
        )
        .map((schedule: ManufacturingSchedule) => 
          data.projects.find((p: Project) => p.id === schedule.projectId)
        )
        .filter((p: Project | undefined): p is Project => p !== undefined);

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

  const handleStatusUpdate = (projectId: number, newStatus: string) => {
    updateMaterialStatus.mutate({ projectId, status: newStatus });
  };

  // Status configuration
  const statusConfig = {
    in_qc: {
      label: 'IN QC',
      color: 'bg-yellow-500',
      textColor: 'text-yellow-900',
      icon: AlertCircle,
      description: 'Quality Control in Progress'
    },
    in_work: {
      label: 'IN WORK',
      color: 'bg-blue-500',
      textColor: 'text-blue-900',
      icon: Clock,
      description: 'Currently Being Worked On'
    },
    inventory_job_cart: {
      label: 'Inventory Job Cart',
      color: 'bg-green-500',
      textColor: 'text-green-900',
      icon: CheckCircle,
      description: 'Ready for Inventory'
    },
    shipped: {
      label: 'SHIPPED',
      color: 'bg-purple-500',
      textColor: 'text-purple-900',
      icon: Truck,
      description: 'Shipped to Customer'
    }
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

  if (error) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center text-red-500">
          <p>Error loading material management data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Package className="h-8 w-8 text-blue-500" />
        <h1 className="text-3xl font-bold text-white">Material Management</h1>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search teams or projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
          />
        </div>
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredTeams.map((team) => (
          <Card key={team.team} className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-white flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-500" />
                {team.team}
              </CardTitle>
              <p className="text-sm text-gray-400">
                {team.projects.length} project{team.projects.length !== 1 ? 's' : ''}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {team.projects.map((project: Project) => {
                const currentStatus = project.materialManagementStatus || 'in_qc';
                const statusInfo = statusConfig[currentStatus as keyof typeof statusConfig];
                const IconComponent = statusInfo?.icon || AlertCircle;

                return (
                  <div key={project.id} className="p-4 bg-gray-700 rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium text-white">{project.name}</h4>
                        <p className="text-sm text-gray-400">#{project.projectNumber}</p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={`${statusInfo?.color} ${statusInfo?.textColor} flex items-center gap-1`}
                      >
                        <IconComponent className="h-3 w-3" />
                        {statusInfo?.label}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <Select
                        value={currentStatus}
                        onValueChange={(value) => handleStatusUpdate(project.id, value)}
                      >
                        <SelectTrigger className="w-full bg-gray-600 border-gray-500 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-600">
                          {Object.entries(statusConfig).map(([key, config]) => (
                            <SelectItem
                              key={key}
                              value={key}
                              className="text-white hover:bg-gray-700 focus:bg-gray-700"
                            >
                              <div className="flex items-center gap-2">
                                <config.icon className="h-4 w-4" />
                                {config.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTeams.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">
            {searchTerm ? 'No teams found matching your search.' : 'No teams with active projects found.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default MaterialManagement;