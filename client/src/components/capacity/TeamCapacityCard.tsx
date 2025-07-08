import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, Pencil, Trash2, Users, Zap, Calendar } from "lucide-react";
import type { ManufacturingBay, TeamMember, Project, ManufacturingSchedule } from "@shared/schema";

interface TeamCapacityCardProps {
  bay: ManufacturingBay;
  members: TeamMember[];
  projects: Project[];
  schedules: ManufacturingSchedule[];
  onAddMember: () => void;
  onEditMember: (member: TeamMember) => void;
  onDeleteMember: (id: number) => void;
}

export default function TeamCapacityCard({
  bay,
  members,
  projects,
  schedules,
  onAddMember,
  onEditMember,
  onDeleteMember,
}: TeamCapacityCardProps) {
  const assemblyMembers = members.filter((m) => m.role === "Assembly");
  const electricalMembers = members.filter((m) => m.role === "Electrical");

  const totalCapacity = members.reduce(
    (sum, member) => sum + (member.hoursPerWeek || 40) * ((member.efficiencyRate || 100) / 100),
    0
  );

  // Calculate active projects in production phases for this bay
  const today = new Date();
  const activeSchedules = schedules.filter(s => s.bayId === bay.id);
  const activeProjects = activeSchedules.filter(schedule => {
    const project = projects.find(p => p.id === schedule.projectId);
    if (!project || project.status === "Delivered" || project.status === "Cancelled") return false;
    
    // Check if project is in production-related phases (Assembly/Production, IT, NTC, QC)
    const assemblyStart = project.assemblyStartDate ? new Date(project.assemblyStartDate) : null;
    const qcStart = project.qcStartDate ? new Date(project.qcStartDate) : null;
    const deliveryDate = project.deliveryDate ? new Date(project.deliveryDate) : null;
    
    // Project is active if today is between assembly start and delivery (or if no delivery date, assume ongoing)
    return assemblyStart && 
           today >= assemblyStart && 
           (!deliveryDate || today <= deliveryDate);
  });

  const utilization = Math.min(100, (members.length > 0 ? (members.length / 2) * 50 : 0));

  return (
    <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{bay.name}</CardTitle>
            <CardDescription>{bay.team} Team</CardDescription>
          </div>
          <Badge variant={utilization > 80 ? "destructive" : utilization > 60 ? "warning" : "success"}>
            {utilization}% Utilized
          </Badge>
        </div>
        
        {/* Active Projects Display */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-500" />
            <span className="text-muted-foreground">Currently Active In Bay:</span>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-blue-600 border-blue-200">
              {activeProjects.length} project{activeProjects.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Capacity Utilization</span>
            <span className="font-medium">{totalCapacity} hrs/week</span>
          </div>
          <Progress value={utilization} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
            <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Assembly</p>
              <p className="font-semibold">{assemblyMembers.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
            <Zap className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Electrical</p>
              <p className="font-semibold">{electricalMembers.length}</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-medium">Team Members</h4>
            <Button onClick={onAddMember} size="sm" variant="ghost">
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          {members.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
              No team members assigned
            </p>
          ) : (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{member.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {member.role} • {member.hoursPerWeek}h/wk
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      onClick={() => onEditMember(member)}
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      onClick={() => onDeleteMember(member.id)}
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}