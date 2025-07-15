import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, Pencil, Trash2, Settings, AlertCircle, TrendingUp, Users, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { DepartmentCapacity, TeamMember, Project, ManufacturingSchedule } from "@shared/schema";

interface DepartmentCapacityCardProps {
  department: DepartmentCapacity;
  members: TeamMember[];
  onAddMember: () => void;
  onEditMember: (member: TeamMember) => void;
  onDeleteMember: (id: number) => void;
  onEditDepartment: () => void;
}

const departmentIcons: Record<string, string> = {
  fabrication: "🔨",
  paint: "🎨",
  it: "💻",
  ntc: "🧪",
  qa: "✓",
};

const departmentColors: Record<string, { bg: string; text: string; border: string }> = {
  fabrication: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  paint: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  it: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  ntc: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  qa: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
};

export default function DepartmentCapacityCard({
  department,
  members,
  onAddMember,
  onEditMember,
  onDeleteMember,
  onEditDepartment,
}: DepartmentCapacityCardProps) {
  // Fetch projects and schedules to calculate department load
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: schedules = [] } = useQuery<ManufacturingSchedule[]>({
    queryKey: ["/api/manufacturing-schedules"],
  });

  const activeMembers = members.filter(m => m.isActive);
  const totalMemberCapacity = activeMembers.reduce((sum, m) => 
    sum + (m.hoursPerWeek || 40) * ((m.efficiencyRate || 100) / 100), 0
  );

  // Calculate department workload based on active projects in this phase
  const calculateDepartmentLoad = () => {
    const now = new Date();
    const activeProjects = projects.filter(p => {
      if (p.status === "Delivered" || p.status === "Cancelled") return false;
      
      // Check if project is currently in this department's phase
      switch (department.departmentType) {
        case 'fabrication':
          return p.fabricationStartDate && new Date(p.fabricationStartDate) <= now && 
                 p.assemblyStartDate && new Date(p.assemblyStartDate) > now;
        case 'paint':
          return p.paintStartDate && new Date(p.paintStartDate) <= now && 
                 p.assemblyStartDate && new Date(p.assemblyStartDate) > now;
        case 'it':
          return p.itStartDate && new Date(p.itStartDate) <= now && 
                 p.ntcTestingDate && new Date(p.ntcTestingDate) > now;
        case 'ntc':
          return p.ntcTestingDate && new Date(p.ntcTestingDate) <= now && 
                 p.qcStartDate && new Date(p.qcStartDate) > now;
        case 'qa':
          return p.qcStartDate && new Date(p.qcStartDate) <= now && 
                 (!p.deliveryDate || new Date(p.deliveryDate) > now);
        default:
          return false;
      }
    });

    // Calculate upcoming projects (starting in next 2 weeks)
    const twoWeeksFromNow = new Date();
    twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);
    
    const upcomingProjects = projects.filter(p => {
      if (p.status === "Delivered" || p.status === "Cancelled") return false;
      
      switch (department.departmentType) {
        case 'fabrication':
          return p.fabricationStartDate && 
                 new Date(p.fabricationStartDate) > now && 
                 new Date(p.fabricationStartDate) <= twoWeeksFromNow;
        case 'paint':
          return p.paintStartDate && 
                 new Date(p.paintStartDate) > now && 
                 new Date(p.paintStartDate) <= twoWeeksFromNow;
        case 'it':
          return p.itStartDate && 
                 new Date(p.itStartDate) > now && 
                 new Date(p.itStartDate) <= twoWeeksFromNow;
        case 'ntc':
          return p.ntcTestingDate && 
                 new Date(p.ntcTestingDate) > now && 
                 new Date(p.ntcTestingDate) <= twoWeeksFromNow;
        case 'qa':
          return p.qcStartDate && 
                 new Date(p.qcStartDate) > now && 
                 new Date(p.qcStartDate) <= twoWeeksFromNow;
        default:
          return false;
      }
    });

    return { active: activeProjects, upcoming: upcomingProjects };
  };

  const { active: activeProjects, upcoming: upcomingProjects } = calculateDepartmentLoad();
  const activeProjectCount = activeProjects.length;
  const upcomingProjectCount = upcomingProjects.length;
  
  // Calculate utilization based on project load vs capacity
  const hoursPerProject = department.departmentType === 'fabrication' ? 300 : 
                          department.departmentType === 'paint' ? 100 :
                          department.departmentType === 'it' ? 150 :
                          department.departmentType === 'ntc' ? 120 :
                          80; // QA
  
  const requiredCapacity = activeProjectCount * hoursPerProject;
  const utilization = totalMemberCapacity > 0 ? (requiredCapacity / totalMemberCapacity) * 100 : 0;
  const capacityVsTarget = department.weeklyCapacityHours > 0 
    ? (totalMemberCapacity / department.weeklyCapacityHours) * 100 
    : 0;

  // Calculate recommended team size
  const recommendedTeamSize = Math.ceil(requiredCapacity / 160); // 40 hours/week * 4 weeks
  const teamSizeGap = Math.max(0, recommendedTeamSize - activeMembers.length);

  const colors = departmentColors[department.departmentType] || departmentColors.fabrication;

  return (
    <Card className={`bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow`}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className={`text-3xl p-2 rounded-lg ${colors.bg} ${colors.border} border`}>
              {departmentIcons[department.departmentType] || "📋"}
            </div>
            <div>
              <CardTitle className="text-lg">{department.departmentName}</CardTitle>
              <div className="flex items-center gap-4 mt-1">
                <CardDescription className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {activeMembers.length} members
                </CardDescription>
                <CardDescription className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {totalMemberCapacity} hrs/week
                </CardDescription>
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Badge variant={utilization > 100 ? "destructive" : utilization > 85 ? "warning" : "success"} className="whitespace-nowrap">
              {utilization.toFixed(0)}% Load
            </Badge>
            <Button onClick={onEditDepartment} size="sm" variant="ghost" className="h-8 w-8 p-0 flex-shrink-0">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Project Load Overview */}
        <div className={`p-3 rounded-lg ${colors.bg} ${colors.border} border`}>
          <div className="flex justify-between items-center">
            <div>
              <p className={`text-sm font-medium ${colors.text}`}>Active Projects</p>
              <p className="text-2xl font-bold">{activeProjectCount}</p>
            </div>
            <div className="text-right">
              <p className={`text-sm font-medium ${colors.text}`}>Upcoming (2 weeks)</p>
              <p className="text-2xl font-bold">{upcomingProjectCount}</p>
            </div>
          </div>
        </div>

        {/* Capacity Analysis */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Workload vs Capacity</span>
            <span className={`font-medium ${utilization > 100 ? 'text-red-600' : ''}`}>
              {utilization.toFixed(0)}%
            </span>
          </div>
          <Progress 
            value={Math.min(utilization, 100)} 
            className={`h-2 ${utilization > 100 ? '[&>div]:bg-red-500' : ''}`}
          />
          {utilization > 100 && (
            <div className="flex items-center gap-1 text-xs text-red-600">
              <AlertCircle className="h-3 w-3" />
              Overloaded by {(utilization - 100).toFixed(0)}%
            </div>
          )}
        </div>

        {/* Capacity vs Target */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Current vs Target Capacity</span>
            <span className="font-medium">{capacityVsTarget.toFixed(0)}%</span>
          </div>
          <Progress value={Math.min(capacityVsTarget, 100)} className="h-2" />
        </div>

        {/* Recommendations */}
        {(teamSizeGap > 0 || upcomingProjectCount > 2) && (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="text-sm space-y-1">
                {teamSizeGap > 0 && (
                  <p className="text-amber-800 dark:text-amber-200">
                    Need {teamSizeGap} more team member{teamSizeGap > 1 ? 's' : ''} for current load
                  </p>
                )}
                {upcomingProjectCount > 2 && (
                  <p className="text-amber-800 dark:text-amber-200">
                    {upcomingProjectCount} projects starting soon - prepare resources
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Team Members */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-medium">Team Members</h4>
            <Button onClick={onAddMember} size="sm" variant="outline">
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          </div>
          {activeMembers.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
              No team members assigned
            </p>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {activeMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{member.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {member.role} • {member.hoursPerWeek}h/wk
                      {member.efficiencyRate !== 100 && ` • ${member.efficiencyRate}% efficiency`}
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

        {/* Department Stats */}
        <div className={`grid grid-cols-3 gap-2 pt-3 border-t`}>
          <div className="text-center">
            <div className={`text-lg font-bold ${colors.text}`}>
              {activeMembers.length}
            </div>
            <div className="text-xs text-gray-500">Members</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-bold ${colors.text}`}>
              {Math.round(activeMembers.reduce((sum, m) => sum + (m.efficiencyRate || 100), 0) / Math.max(activeMembers.length, 1))}%
            </div>
            <div className="text-xs text-gray-500">Avg Efficiency</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-bold ${colors.text}`}>
              {Math.round(totalMemberCapacity / Math.max(activeMembers.length, 1))}
            </div>
            <div className="text-xs text-gray-500">Hrs/Person</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}