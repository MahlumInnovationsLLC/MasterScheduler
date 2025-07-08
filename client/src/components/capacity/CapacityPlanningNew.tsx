import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Users, Factory, MapPin } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import TeamCapacityCard from "./TeamCapacityCard";
import DepartmentCapacityCard from "./DepartmentCapacityCard";
import TeamMemberDialog from "./TeamMemberDialog";
import DepartmentDialog from "./DepartmentDialog";
import type { DepartmentCapacity, TeamMember, ManufacturingBay, ManufacturingSchedule, Project } from "@shared/schema";

export default function CapacityPlanning() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<number | null>(null);
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
    
    return {
      utilization,
      projectCount,
      memberCount: teamMembersForTeam.length,
      totalCapacity: totalCapacityHours
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

  const renderTeamsSection = (teams: any[], location: string) => (
    <>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">{location} Production Teams</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map((team) => {
          const members = teamMembers.filter((m) => 
            m.teamName === team.name && m.location === location
          );
          const utilization = calculateTeamUtilization(team.bayIds);
          
          return (
            <Card key={team.name} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{team.name}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedTeam(team.name);
                      setSelectedLocation(location);
                      setEditingMember(null);
                      setShowTeamMemberDialog(true);
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </CardTitle>
                <CardDescription>
                  {utilization.memberCount} members • {utilization.projectCount} active projects
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Team Capacity</span>
                      <span>{utilization.totalCapacity} hrs/week</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Utilization</span>
                      <span className={utilization.utilization > 100 ? "text-red-600 font-medium" : ""}>
                        {utilization.utilization}%
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Team Members</h4>
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                      >
                        <div>
                          <div className="font-medium text-sm">{member.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {member.role} • {member.hoursPerWeek} hrs/week
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingMember(member);
                              setSelectedTeam(team.name);
                              setSelectedLocation(location);
                              setShowTeamMemberDialog(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteTeamMemberMutation.mutate(member.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                    {members.length === 0 && (
                      <div className="text-sm text-muted-foreground text-center py-4">
                        No team members assigned
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );

  const renderDepartmentsSection = (location: string) => {
    // Filter departments by location
    const locationDepartments = departments.filter(dept => 
      dept.location === location && dept.isActive
    );

    return (
      <>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{location} Department Capacity</h3>
          <Button
            size="sm"
            onClick={() => {
              setEditingDepartment({
                id: 0,
                departmentName: "",
                departmentType: "fabrication",
                location,
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
            Add Department
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
              <p>No departments configured for {location} yet.</p>
              <p className="text-sm mt-2">Click "Add Department" to get started.</p>
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="columbia-falls" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="columbia-falls">
            <MapPin className="h-4 w-4 mr-2" />
            Columbia Falls, MT
          </TabsTrigger>
          <TabsTrigger value="libby">
            <MapPin className="h-4 w-4 mr-2" />
            Libby, MT
          </TabsTrigger>
        </TabsList>

        {/* Columbia Falls Tab */}
        <TabsContent value="columbia-falls" className="space-y-4 mt-6">
          <Tabs defaultValue="teams" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="teams">
                <Users className="h-4 w-4 mr-2" />
                Production Teams
              </TabsTrigger>
              <TabsTrigger value="departments">
                <Factory className="h-4 w-4 mr-2" />
                Departments
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="teams" className="mt-6">
              {renderTeamsSection(columbiaFallsTeams, "Columbia Falls, MT")}
            </TabsContent>
            
            <TabsContent value="departments" className="mt-6">
              {renderDepartmentsSection("Columbia Falls, MT")}
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Libby Tab */}
        <TabsContent value="libby" className="space-y-4 mt-6">
          <Tabs defaultValue="teams" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="teams">
                <Users className="h-4 w-4 mr-2" />
                Production Teams
              </TabsTrigger>
              <TabsTrigger value="departments">
                <Factory className="h-4 w-4 mr-2" />
                Departments
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="teams" className="mt-6">
              {renderTeamsSection(libbyTeams, "Libby, MT")}
            </TabsContent>
            
            <TabsContent value="departments" className="mt-6">
              {renderDepartmentsSection("Libby, MT")}
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* Team Member Dialog */}
      {showTeamMemberDialog && (
        <TeamMemberDialog
          open={showTeamMemberDialog}
          onOpenChange={setShowTeamMemberDialog}
          member={editingMember}
          teamName={selectedTeam}
          location={selectedLocation}
          departmentId={selectedDepartment}
          onSave={(data) => {
            const saveData = {
              ...data,
              teamName: selectedTeam || data.teamName,
              location: selectedLocation || data.location,
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