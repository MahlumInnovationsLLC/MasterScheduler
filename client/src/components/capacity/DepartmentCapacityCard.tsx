import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, Pencil, Trash2, Settings } from "lucide-react";
import type { DepartmentCapacity, TeamMember } from "@shared/schema";

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

export default function DepartmentCapacityCard({
  department,
  members,
  onAddMember,
  onEditMember,
  onDeleteMember,
  onEditDepartment,
}: DepartmentCapacityCardProps) {
  const totalCapacity = members.reduce(
    (sum, member) => sum + (member.hoursPerWeek || 40) * ((member.efficiencyRate || 100) / 100),
    0
  ) || department.weeklyCapacityHours;

  const utilization = totalCapacity > 0 ? Math.min(100, (members.length * 40 / totalCapacity) * 100) : 0;

  return (
    <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{departmentIcons[department.departmentType] || "📋"}</span>
            <div>
              <CardTitle className="text-lg">{department.departmentName}</CardTitle>
              <CardDescription>{members.length} members</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={utilization > 85 ? "destructive" : utilization > 70 ? "warning" : "success"}>
              {utilization.toFixed(0)}% Utilized
            </Badge>
            <Button onClick={onEditDepartment} size="sm" variant="ghost" className="h-8 w-8 p-0">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Weekly Capacity</span>
            <span className="font-medium">{totalCapacity} hrs/week</span>
          </div>
          <Progress value={utilization} className="h-2" />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-medium">Team Members</h4>
            <Button onClick={onAddMember} size="sm" variant="ghost">
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          {members.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              No team members assigned
            </p>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{member.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {member.role} • {member.hoursPerWeek}h/wk • {member.efficiencyRate}% efficiency
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

        {department.notes && (
          <div className="text-xs text-gray-500 dark:text-gray-400 border-t pt-2">
            {department.notes}
          </div>
        )}
      </CardContent>
    </Card>
  );
}