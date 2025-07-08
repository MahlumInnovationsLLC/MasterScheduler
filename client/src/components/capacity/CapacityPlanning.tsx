import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Users, Factory } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import TeamCapacityCard from "./TeamCapacityCard";
import DepartmentCapacityCard from "./DepartmentCapacityCard";
import TeamMemberDialog from "./TeamMemberDialog";
import DepartmentDialog from "./DepartmentDialog";
import type { DepartmentCapacity, TeamMember, ManufacturingBay } from "@shared/schema";

export default function CapacityPlanning() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedBay, setSelectedBay] = useState<number | null>(null);
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

  // Mutations
  const createDepartmentMutation = useMutation({
    mutationFn: (data: Partial<DepartmentCapacity>) => 
      apiRequest("POST", "/api/capacity/departments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/capacity/departments"] });
      toast({ title: "Department created successfully" });
      setShowDepartmentDialog(false);
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

  const createTeamMemberMutation = useMutation({
    mutationFn: (data: Partial<TeamMember>) => 
      apiRequest("POST", "/api/capacity/team-members", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/capacity/team-members"] });
      toast({ title: "Team member added successfully" });
      setShowTeamMemberDialog(false);
    },
    onError: () => {
      toast({ title: "Failed to add team member", variant: "destructive" });
    }
  });

  const updateTeamMemberMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<TeamMember> }) => 
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
    mutationFn: (id: number) => 
      apiRequest("DELETE", `/api/capacity/team-members/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/capacity/team-members"] });
      toast({ title: "Team member removed successfully" });
    },
    onError: () => {
      toast({ title: "Failed to remove team member", variant: "destructive" });
    }
  });

  // Initialize departments if none exist
  const initializeDepartments = async () => {
    const defaultDepartments = [
      { departmentType: "fabrication" as const, departmentName: "Fabrication", weeklyCapacityHours: 0 },
      { departmentType: "paint" as const, departmentName: "Paint", weeklyCapacityHours: 0 },
      { departmentType: "it" as const, departmentName: "IT", weeklyCapacityHours: 0 },
      { departmentType: "ntc" as const, departmentName: "NTC", weeklyCapacityHours: 0 },
      { departmentType: "qa" as const, departmentName: "Quality Assurance", weeklyCapacityHours: 0 },
    ];

    for (const dept of defaultDepartments) {
      await createDepartmentMutation.mutateAsync(dept);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="production" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="production">
            <Users className="h-4 w-4 mr-2" />
            Production Teams
          </TabsTrigger>
          <TabsTrigger value="departments">
            <Factory className="h-4 w-4 mr-2" />
            Department Capacity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="production" className="space-y-4 mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Production Team Capacity</h3>
            <Button 
              onClick={() => {
                setSelectedBay(null);
                setEditingMember(null);
                setShowTeamMemberDialog(true);
              }}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Team Member
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bays.filter(bay => bay.team && bay.team !== "LIBBY").map((bay) => {
              const bayMembers = teamMembers.filter((m) => m.bayId === bay.id);
              return (
                <TeamCapacityCard
                  key={bay.id}
                  bay={bay}
                  members={bayMembers}
                  onAddMember={() => {
                    setSelectedBay(bay.id);
                    setEditingMember(null);
                    setShowTeamMemberDialog(true);
                  }}
                  onEditMember={(member) => {
                    setEditingMember(member);
                    setSelectedBay(member.bayId);
                    setShowTeamMemberDialog(true);
                  }}
                  onDeleteMember={(id) => deleteTeamMemberMutation.mutate(id)}
                />
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="departments" className="space-y-4 mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Department Capacity</h3>
            {departments.length === 0 && (
              <Button onClick={initializeDepartments} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Initialize Departments
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((dept) => {
              const deptMembers = teamMembers.filter((m) => m.departmentId === dept.id);
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
          </div>
        </TabsContent>
      </Tabs>

      {/* Team Member Dialog */}
      {showTeamMemberDialog && (
        <TeamMemberDialog
          open={showTeamMemberDialog}
          onOpenChange={setShowTeamMemberDialog}
          member={editingMember}
          bayId={selectedBay}
          departmentId={selectedDepartment}
          onSave={(data) => {
            if (editingMember) {
              updateTeamMemberMutation.mutate({ id: editingMember.id, data });
            } else {
              createTeamMemberMutation.mutate(data);
            }
          }}
        />
      )}

      {/* Department Dialog */}
      {showDepartmentDialog && (
        <DepartmentDialog
          open={showDepartmentDialog}
          onOpenChange={setShowDepartmentDialog}
          department={editingDepartment}
          onSave={(data) => {
            if (editingDepartment) {
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