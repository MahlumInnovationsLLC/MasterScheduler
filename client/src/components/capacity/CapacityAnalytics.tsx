import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { TrendingUp, TrendingDown, Users, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import type { DepartmentCapacity, TeamMember, ManufacturingBay, ManufacturingSchedule, Project } from "@shared/schema";

export default function CapacityAnalytics() {
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

  // Calculate metrics
  const activeMembers = teamMembers.filter(m => m.isActive);
  const totalCapacityHours = activeMembers.reduce((sum, m) => sum + (m.hoursPerWeek || 40) * ((m.efficiencyRate || 100) / 100), 0);
  const averageEfficiency = activeMembers.length > 0 
    ? activeMembers.reduce((sum, m) => sum + (m.efficiencyRate || 100), 0) / activeMembers.length
    : 100;

  // Team utilization by bay
  const teamUtilization = bays
    .filter(bay => bay.team && bay.team !== "LIBBY")
    .map(bay => {
      const bayMembers = teamMembers.filter(m => m.bayId === bay.id && m.isActive);
      const baySchedules = schedules.filter(s => s.bayId === bay.id);
      const activeProjects = baySchedules.filter(s => {
        const project = projects.find(p => p.id === s.projectId);
        return project && project.status !== "Delivered" && project.status !== "Cancelled";
      });

      const memberCapacity = bayMembers.reduce((sum, m) => sum + (m.hoursPerWeek || 40) * ((m.efficiencyRate || 100) / 100), 0);
      const utilization = activeProjects.length > 0 ? Math.min(100, (activeProjects.length / Math.max(1, bayMembers.length)) * 50) : 0;

      return {
        team: bay.team,
        capacity: memberCapacity,
        utilization,
        projectCount: activeProjects.length,
        memberCount: bayMembers.length,
      };
    });

  // Department capacity breakdown by location with project integration
  const departmentBreakdown = departments.map(dept => {
    const deptMembers = teamMembers.filter(m => m.departmentId === dept.id && m.isActive);
    const capacity = deptMembers.reduce((sum, m) => sum + (m.hoursPerWeek || 40) * ((m.efficiencyRate || 100) / 100), 0);

    // Calculate active projects in this department phase
    const now = new Date();
    const activeProjects = projects.filter(p => {
      if (p.status === "Delivered" || p.status === "Cancelled") return false;
      
      switch (dept.departmentType) {
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

    const workload = activeProjects.length * (dept.departmentType === 'fabrication' ? 300 : 
                                              dept.departmentType === 'paint' ? 100 :
                                              dept.departmentType === 'it' ? 150 :
                                              dept.departmentType === 'ntc' ? 120 : 80);
    const utilizationByLoad = capacity > 0 ? (workload / capacity) * 100 : 0;

    return {
      name: `${dept.departmentName} (${dept.location})`,
      type: dept.departmentType,
      location: dept.location || "Columbia Falls, MT",
      capacity,
      members: deptMembers.length,
      target: dept.utilizationTarget || 85,
      activeProjects: activeProjects.length,
      workloadUtilization: Math.round(utilizationByLoad),
      targetCapacity: dept.weeklyCapacityHours
    };
  });

  // Role distribution
  const roleDistribution = activeMembers.reduce((acc, member) => {
    acc[member.role] = (acc[member.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const roleData = Object.entries(roleDistribution).map(([role, count]) => ({
    name: role,
    value: count,
  }));

  // Efficiency trends (mock data for demonstration)
  const efficiencyTrends = [
    { week: 'W1', efficiency: 92, target: 85 },
    { week: 'W2', efficiency: 94, target: 85 },
    { week: 'W3', efficiency: 89, target: 85 },
    { week: 'W4', efficiency: 95, target: 85 },
    { week: 'W5', efficiency: 97, target: 85 },
    { week: 'W6', efficiency: 93, target: 85 },
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Capacity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCapacityHours.toFixed(0)} hrs/week</div>
            <p className="text-xs text-muted-foreground mt-1">Across all teams</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeMembers.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {teamMembers.length - activeMembers.length} inactive
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Efficiency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {averageEfficiency.toFixed(0)}%
              {averageEfficiency >= 90 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </div>
            <Progress value={averageEfficiency} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Critical Teams</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teamUtilization.filter(t => t.utilization > 85).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Above 85% utilization</p>
          </CardContent>
        </Card>
      </div>

      {/* Team Utilization Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Team Utilization Overview</CardTitle>
          <CardDescription>Current capacity utilization by production team</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={teamUtilization}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="team" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="utilization" fill="#8884d8" name="Utilization %" />
              <Bar dataKey="capacity" fill="#82ca9d" name="Capacity (hrs)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Department Capacity Analysis</CardTitle>
            <CardDescription>Capacity vs workload by department and location</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {departmentBreakdown.map((dept, idx) => (
                <div key={`${dept.type}-${dept.location}`} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">{dept.name}</span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{dept.activeProjects} active projects</span>
                        <span>•</span>
                        <span>{dept.members} members</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{dept.capacity}h/wk</div>
                      <div className={`text-xs ${dept.workloadUtilization > 100 ? 'text-red-600' : 'text-green-600'}`}>
                        {dept.workloadUtilization}% load
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Progress value={Math.min((dept.capacity / dept.targetCapacity) * 100, 100)} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Capacity vs Target</span>
                      <span>{Math.round((dept.capacity / dept.targetCapacity) * 100)}%</span>
                    </div>
                  </div>
                  {dept.workloadUtilization > 100 && (
                    <div className="flex items-center gap-1 text-xs text-amber-600">
                      <AlertTriangle className="h-3 w-3" />
                      <span>Department overloaded - consider adding staff</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Role Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Role Distribution</CardTitle>
            <CardDescription>Team composition by role</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={roleData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {roleData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Efficiency Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Efficiency Trends</CardTitle>
          <CardDescription>Team efficiency over the past 6 weeks</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={efficiencyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="efficiency" stroke="#8884d8" name="Actual Efficiency" strokeWidth={2} />
              <Line type="monotone" dataKey="target" stroke="#82ca9d" name="Target" strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Capacity Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Capacity Alerts</CardTitle>
          <CardDescription>Teams requiring attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {teamUtilization
              .filter(t => t.utilization > 85 || t.memberCount === 0)
              .map((team, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {team.utilization > 85 ? (
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                    ) : (
                      <Users className="h-5 w-5 text-gray-600" />
                    )}
                    <div>
                      <p className="font-medium">{team.team} Team</p>
                      <p className="text-sm text-gray-600">
                        {team.memberCount === 0
                          ? "No team members assigned"
                          : `${team.utilization}% utilized with ${team.projectCount} projects`}
                      </p>
                    </div>
                  </div>
                  <Badge variant={team.utilization > 95 ? "destructive" : "warning"}>
                    {team.memberCount === 0 ? "Understaffed" : "High Load"}
                  </Badge>
                </div>
              ))}
            {teamUtilization.filter(t => t.utilization > 85 || t.memberCount === 0).length === 0 && (
              <div className="flex items-center gap-3 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span>All teams operating within normal capacity</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}