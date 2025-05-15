import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, Calendar, Activity } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface ManufacturingBay {
  id: number;
  name: string;
  team: string | null;
  assemblyStaffCount: number | null;
  electricalStaffCount: number | null;
  hoursPerPersonPerWeek: number | null;
}

interface ManufacturingSchedule {
  id: number;
  projectId: number;
  bayId: number;
  startDate: Date;
  endDate: Date;
  totalHours: number;
}

interface TeamCapacityInfoProps {
  teamName: string;
  bays: ManufacturingBay[];
  schedules: ManufacturingSchedule[];
}

export function TeamCapacityInfo({ teamName, bays, schedules }: TeamCapacityInfoProps) {
  // Filter the bays that belong to this team
  const teamBays = bays.filter(bay => bay.team === teamName);
  const teamBayIds = teamBays.map(bay => bay.id);
  
  // Filter schedules for this team's bays
  const teamSchedules = schedules.filter(schedule => 
    teamBayIds.includes(schedule.bayId)
  );
  
  // Calculate staff counts and hours
  const assemblyStaffCount = teamBays.reduce((total, bay) => total + (bay.assemblyStaffCount || 0), 0);
  const electricalStaffCount = teamBays.reduce((total, bay) => total + (bay.electricalStaffCount || 0), 0);
  const totalStaffCount = assemblyStaffCount + electricalStaffCount;
  
  // Use the standard hours per week (should be the same for all bays in team)
  const hoursPerWeek = teamBays.length > 0 ? (teamBays[0].hoursPerPersonPerWeek || 29) : 29;
  
  // Calculate weekly capacity in hours
  const weeklyCapacity = totalStaffCount * hoursPerWeek;
  
  // Count active projects
  const activeProjectIds = new Set(teamSchedules.map(s => s.projectId));
  const activeProjectCount = activeProjectIds.size;
  
  // Calculate utilization based on current week's schedules
  // This is a simplified calculation - in a real scenario you'd want to look at schedules 
  // that overlap with the current week only
  const currentDate = new Date();
  const currentWeekStart = new Date(currentDate);
  currentWeekStart.setDate(currentDate.getDate() - currentDate.getDay());
  const currentWeekEnd = new Date(currentWeekStart);
  currentWeekEnd.setDate(currentWeekStart.getDate() + 6);
  
  // Get schedules that overlap with current week
  const currentWeekSchedules = teamSchedules.filter(schedule => {
    const startDate = new Date(schedule.startDate);
    const endDate = new Date(schedule.endDate);
    return (startDate <= currentWeekEnd && endDate >= currentWeekStart);
  });
  
  // Get total hours for current week (simplified calculation)
  // Ideally this would be prorated by actual days within current week
  const estimatedWeeklyHours = currentWeekSchedules.reduce((total, schedule) => {
    const startDate = new Date(schedule.startDate);
    const endDate = new Date(schedule.endDate);
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysPerWeek = 7;
    return total + (schedule.totalHours / totalDays * daysPerWeek);
  }, 0);
  
  // Calculate utilization percentage
  const utilizationPercentage = weeklyCapacity > 0 
    ? Math.min(100, Math.round((estimatedWeeklyHours / weeklyCapacity) * 100)) 
    : 0;
  
  // Determine status color based on utilization
  let statusColor = "bg-green-500";
  let statusText = "Available";
  
  if (utilizationPercentage > 90) {
    statusColor = "bg-red-500";
    statusText = "Over Capacity";
  } else if (utilizationPercentage > 75) {
    statusColor = "bg-yellow-500";
    statusText = "High Utilization";
  } else if (utilizationPercentage > 40) {
    statusColor = "bg-blue-500";
    statusText = "Good Utilization";
  }

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-md font-medium">{teamName} Capacity</CardTitle>
          <Badge className={statusColor}>{statusText}</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              Staff: <b>{totalStaffCount}</b>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              Hours/Week: <b>{hoursPerWeek}</b>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              Projects: <b>{activeProjectCount}</b>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              Weekly: <b>{weeklyCapacity}h</b>
            </span>
          </div>
        </div>
        
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span>Utilization</span>
            <span className="font-medium">{utilizationPercentage}%</span>
          </div>
          <Progress value={utilizationPercentage} className="h-2" />
          
          <div className="grid grid-cols-2 gap-x-2 mt-2 text-xs text-muted-foreground">
            <div>
              Assembly: <span className="font-medium">{assemblyStaffCount}</span> (
              {assemblyStaffCount * hoursPerWeek}h/week)
            </div>
            <div>
              Electrical: <span className="font-medium">{electricalStaffCount}</span> (
              {electricalStaffCount * hoursPerWeek}h/week)
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}