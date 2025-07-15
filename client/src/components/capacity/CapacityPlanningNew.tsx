import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Users, Factory, MapPin, Calendar, PaintBucket, Package, Wrench, Settings, Monitor, TestTube, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import TeamCapacityCard from "./TeamCapacityCard";
import DepartmentCapacityCard from "./DepartmentCapacityCard";
import TeamMemberDialog from "./TeamMemberDialog";
import DepartmentDialog from "./DepartmentDialog";
import type { DepartmentCapacity, TeamMember, ManufacturingBay, ManufacturingSchedule, Project } from "@shared/schema";

type DepartmentType = 'mech' | 'fabrication' | 'paint' | 'wrap' | 'production' | 'it' | 'ntc' | 'qc';

const departmentConfig = {
  mech: { name: 'MECH Shop', icon: Wrench, color: 'orange' },
  fabrication: { name: 'Fabrication', icon: Factory, color: 'blue' },
  paint: { name: 'Paint', icon: PaintBucket, color: 'red' },
  wrap: { name: 'Wrap', icon: Package, color: 'red' },
  production: { name: 'Production', icon: Settings, color: 'green' },
  it: { name: 'IT', icon: Monitor, color: 'purple' },
  ntc: { name: 'NTC', icon: TestTube, color: 'cyan' },
  qc: { name: 'QC', icon: CheckCircle, color: 'amber' }
};

export default function CapacityPlanning() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentType>('mech');
  const [selectedLocation, setSelectedLocation] = useState<string>('Columbia Falls');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null);
  const [selectedBayId, setSelectedBayId] = useState<number | null>(null);
  const [showTeamMemberDialog, setShowTeamMemberDialog] = useState(false);
  const [showDepartmentDialog, setShowDepartmentDialog] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editingDepartment, setEditingDepartment] = useState<DepartmentCapacity | null>(null);

  // Fetch data
  const { data: bays = [] } = useQuery<ManufacturingBay[]>({
    queryKey: ["/api/manufacturing-bays"],
  });

  const { data: departments = [] } = useQuery<DepartmentCapacity[]>({
    queryKey: ["/api/capacity/departments"],
  });

  const { data: teamMembers = [] } = useQuery<TeamMember[]>({
    queryKey: ["/api/capacity/team-members"],
  });

  const { data: schedules = [] } = useQuery<ManufacturingSchedule[]>({
    queryKey: ["/api/manufacturing-schedules"],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // Define teams by location
  const columbiaFallsTeams = [
    { name: "Chavez / Davidson", bayIds: bays.filter(b => b.team === "Chavez / Davidson").map(b => b.id) },
    { name: "Held / Freiheit", bayIds: bays.filter(b => b.team === "Held / Freiheit").map(b => b.id) },
    { name: "May / LaRose", bayIds: bays.filter(b => b.team === "May / LaRose").map(b => b.id) },
    { name: "Nelson / Mondora", bayIds: bays.filter(b => b.team === "Nelson / Mondora").map(b => b.id) },
    { name: "Kelley / Overcast", bayIds: bays.filter(b => b.team === "Kelley / Overcast").map(b => b.id) },
    { name: "Shultz / Mengelos", bayIds: bays.filter(b => b.team === "Shultz / Mengelos").map(b => b.id) },
  ].filter(team => team.bayIds.length > 0);

  const libbyTeams = [
    { name: "Libby, MT", bayIds: bays.filter(b => b.team === "Libby, MT").map(b => b.id) },
    { name: "Libby Container Line", bayIds: bays.filter(b => b.team === "Libby Container Line").map(b => b.id) },
  ].filter(team => team.bayIds.length > 0);

  // Calculate team utilization based on scheduled projects
  const calculateTeamUtilization = (teamBayIds: number[]) => {
    const teamSchedules = schedules.filter(s => 
      teamBayIds.includes(s.bayId) && 
      new Date(s.endDate) >= new Date()
    );
    
    const teamMembersForTeam = teamMembers.filter(m => 
      teamBayIds.includes(m.bayId || 0) && m.isActive
    );
    
    const totalCapacityHours = teamMembersForTeam.reduce((sum, member) => 
      sum + (member.hoursPerWeek || 40), 0
    );
    
    // Get unique projects scheduled in these bays
    const uniqueProjectIds = [...new Set(teamSchedules.map(s => s.projectId))];
    const activeProjects = uniqueProjectIds.filter(projectId => {
      const project = projects.find(p => p.id === projectId);
      return project && project.status !== "Delivered" && project.status !== "Cancelled";
    });
    
    // Calculate utilization based on active projects
    const projectCount = activeProjects.length;
    const utilization = projectCount === 0 ? 0 :
                       projectCount === 1 ? 75 :
                       projectCount === 2 ? 100 :
                       120; // 3+ projects = overloaded
    
    // Calculate projects currently in production phases (active in bay)
    const today = new Date();
    const activeProjectsInBay = activeProjects.filter(projectId => {
      const project = projects.find(p => p.id === projectId);
      if (!project) return false;
      
      // Check if project is in production-related phases (Assembly/Production, IT, NTC, QC)
      const assemblyStart = project.assemblyStartDate ? new Date(project.assemblyStartDate) : null;
      const deliveryDate = project.deliveryDate ? new Date(project.deliveryDate) : null;
      
      // Project is active in bay if today is between assembly start and delivery
      return assemblyStart && 
             today >= assemblyStart && 
             (!deliveryDate || today <= deliveryDate);
    });

    return {
      utilization,
      projectCount,
      memberCount: teamMembersForTeam.length,
      totalCapacity: totalCapacityHours,
      activeProjectsInBay: activeProjectsInBay.length
    };
  };

  // Mutations
  const createTeamMemberMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/capacity/team-members", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/capacity/team-members"] });
      toast({ title: "Team member added successfully" });
      setShowTeamMemberDialog(false);
      setEditingMember(null);
    },
    onError: () => {
      toast({ title: "Failed to add team member", variant: "destructive" });
    }
  });

  const updateTeamMemberMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest("PUT", `/api/capacity/team-members/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/capacity/team-members"] });
      toast({ title: "Team member updated successfully" });
      setShowTeamMemberDialog(false);
      setEditingMember(null);
    },
    onError: () => {
      toast({ title: "Failed to update team member", variant: "destructive" });
    }
  });

  const deleteTeamMemberMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/capacity/team-members/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/capacity/team-members"] });
      toast({ title: "Team member removed successfully" });
    },
    onError: () => {
      toast({ title: "Failed to remove team member", variant: "destructive" });
    }
  });

  const createDepartmentMutation = useMutation({
    mutationFn: (data: Partial<DepartmentCapacity>) => 
      apiRequest("POST", "/api/capacity/departments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/capacity/departments"] });
      toast({ title: "Department created successfully" });
      setShowDepartmentDialog(false);
      setEditingDepartment(null);
    },
    onError: () => {
      toast({ title: "Failed to create department", variant: "destructive" });
    }
  });

  const updateDepartmentMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<DepartmentCapacity> }) => 
      apiRequest("PUT", `/api/capacity/departments/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/capacity/departments"] });
      toast({ title: "Department updated successfully" });
      setShowDepartmentDialog(false);
      setEditingDepartment(null);
    },
    onError: () => {
      toast({ title: "Failed to update department", variant: "destructive" });
    }
  });



  const renderDepartmentContent = (department: DepartmentType) => {
    const config = departmentConfig[department];
    const Icon = config.icon;
    
    // Special handling for production department - show bay teams
    if (department === 'production') {
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <Icon className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold">{config.name} Teams</h2>
          </div>
          
          <Tabs defaultValue="Columbia Falls" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="Columbia Falls">
                <MapPin className="h-4 w-4 mr-2" />
                Columbia Falls, MT
              </TabsTrigger>
              <TabsTrigger value="Libby">
                <MapPin className="h-4 w-4 mr-2" />
                Libby, MT
              </TabsTrigger>
            </TabsList>

            <TabsContent value="Columbia Falls" className="space-y-4 mt-6">
              {renderProductionTeamsSection("Columbia Falls")}
            </TabsContent>

            <TabsContent value="Libby" className="space-y-4 mt-6">
              {renderProductionTeamsSection("Libby")}
            </TabsContent>
          </Tabs>
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <Icon className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold">{config.name} Department Capacity</h2>
        </div>
        
        <Tabs defaultValue="Columbia Falls" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="Columbia Falls">
              <MapPin className="h-4 w-4 mr-2" />
              Columbia Falls, MT
            </TabsTrigger>
            <TabsTrigger value="Libby">
              <MapPin className="h-4 w-4 mr-2" />
              Libby, MT
            </TabsTrigger>
          </TabsList>

          <TabsContent value="Columbia Falls" className="space-y-4 mt-6">
            {renderDepartmentLocationSection(department, "Columbia Falls")}
          </TabsContent>

          <TabsContent value="Libby" className="space-y-4 mt-6">
            {renderDepartmentLocationSection(department, "Libby")}
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  const renderProductionTeamsSection = (location: string) => {
    const teams = location === "Columbia Falls" ? columbiaFallsTeams : libbyTeams;
    const fullLocation = location === "Columbia Falls" ? "Columbia Falls, MT" : "Libby, MT";
    
    // Calculate total location capacity
    const locationTeamMembers = teamMembers.filter(m => 
      m.location === fullLocation && m.isActive && m.bayId
    );
    
    const totalLocationCapacity = locationTeamMembers.reduce(
      (sum, member) => sum + (member.hoursPerWeek || 40), 0
    );
    
    // Count total projects for this location
    const locationBayIds = teams.flatMap(t => t.bayIds);
    const locationSchedules = schedules.filter(s => locationBayIds.includes(s.bayId));
    const uniqueProjectIds = [...new Set(locationSchedules.map(s => s.projectId))];
    const activeProjects = uniqueProjectIds.filter(projectId => {
      const project = projects.find(p => p.id === projectId);
      return project && project.status !== "Delivered" && project.status !== "Cancelled";
    });
    
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">{location} Production Teams</h3>
        </div>
        
        {/* Location Summary Card */}
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Teams</p>
                <p className="text-2xl font-bold">{teams.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Projects</p>
                <p className="text-2xl font-bold">{activeProjects.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Capacity</p>
                <p className="text-2xl font-bold">{totalLocationCapacity} hrs/week</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => {
            const teamStats = calculateTeamUtilization(team.bayIds);
            const teamMembersForTeam = teamMembers.filter(m => 
              team.bayIds.includes(m.bayId || 0) && m.isActive
            );
            
            return (
              <TeamCapacityCard
                key={team.name}
                bay={{
                  id: team.bayIds[0] || 0,
                  bayNumber: team.bayIds[0] || 0,
                  name: team.name,
                  team: team.name,
                  location: fullLocation,
                  capacity: 2,
                  isActive: true,
                  createdAt: new Date(),
                  updatedAt: new Date()
                }}
                members={teamMembersForTeam}
                projects={projects}
                schedules={schedules || []}
                onAddMember={() => {
                  setSelectedLocation(fullLocation);
                  setSelectedBayId(team.bayIds[0] || null);
                  setEditingMember(null);
                  setShowTeamMemberDialog(true);
                }}
                onEditMember={(member) => {
                  setEditingMember(member);
                  setSelectedLocation(fullLocation);
                  setShowTeamMemberDialog(true);
                }}
                onDeleteMember={(id) => deleteTeamMemberMutation.mutate(id)}
              />
            );
          })}
          {teams.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No production teams found for {location}.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderDepartmentLocationSection = (department: DepartmentType, location: string) => {
    const config = departmentConfig[department];
    const fullLocation = location === "Columbia Falls" ? "Columbia Falls, MT" : "Libby, MT";
    const locationDepartments = departments.filter(dept => 
      dept.location === fullLocation && 
      dept.departmentType === department &&
      dept.isActive
    );

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">{location} {config.name}</h3>
          <Button
            size="sm"
            onClick={() => {
              setEditingDepartment({
                id: 0,
                departmentName: config.name,
                departmentType: department,
                location: fullLocation,
                weeklyCapacityHours: 2000,
                isActive: true,
                notes: "",
                createdAt: new Date(),
                updatedAt: new Date()
              });
              setShowDepartmentDialog(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add {config.name} Capacity
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locationDepartments.map((dept) => {
            const deptMembers = teamMembers.filter((m) => 
              m.departmentId === dept.id && m.isActive
            );
            return (
              <DepartmentCapacityCard
                key={dept.id}
                department={dept}
                members={deptMembers}
                onAddMember={() => {
                  setSelectedDepartment(dept.id);
                  setEditingMember(null);
                  setShowTeamMemberDialog(true);
                }}
                onEditMember={(member) => {
                  setEditingMember(member);
                  setSelectedDepartment(member.departmentId);
                  setShowTeamMemberDialog(true);
                }}
                onDeleteMember={(id) => deleteTeamMemberMutation.mutate(id)}
                onEditDepartment={() => {
                  setEditingDepartment(dept);
                  setShowDepartmentDialog(true);
                }}
              />
            );
          })}
          {locationDepartments.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <Factory className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No {config.name} capacity configured for {location} yet.</p>
              <p className="text-sm mt-2">Click "Add {config.name} Capacity" to get started.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Tabs value={selectedDepartment} onValueChange={(value) => setSelectedDepartment(value as DepartmentType)} className="w-full">
        <TabsList className="grid w-full grid-cols-8">
          {Object.entries(departmentConfig).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <TabsTrigger key={key} value={key} className="flex items-center gap-1">
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{config.name}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {Object.keys(departmentConfig).map((department) => (
          <TabsContent key={department} value={department} className="mt-6">
            {renderDepartmentContent(department as DepartmentType)}
          </TabsContent>
        ))}
      </Tabs>

      {/* Team Member Dialog */}
      {showTeamMemberDialog && (
        <TeamMemberDialog
          open={showTeamMemberDialog}
          onOpenChange={setShowTeamMemberDialog}
          member={editingMember}
          teamName=""
          location={selectedLocation}
          departmentId={selectedDepartmentId}
          bayId={selectedBayId}
          onSave={(data) => {
            const saveData = {
              ...data,
              location: selectedLocation || data.location,
              bayId: selectedBayId || data.bayId,
            };
            
            if (editingMember) {
              updateTeamMemberMutation.mutate({ id: editingMember.id, data: saveData });
            } else {
              createTeamMemberMutation.mutate(saveData);
            }
          }}
        />
      )}

      {/* Department Dialog */}
      {showDepartmentDialog && editingDepartment && (
        <DepartmentDialog
          open={showDepartmentDialog}
          onOpenChange={setShowDepartmentDialog}
          department={editingDepartment}
          onSave={(data) => {
            if (editingDepartment.id) {
              updateDepartmentMutation.mutate({ id: editingDepartment.id, data });
            } else {
              createDepartmentMutation.mutate(data);
            }
          }}
        />
      )}
    </div>
  );
}