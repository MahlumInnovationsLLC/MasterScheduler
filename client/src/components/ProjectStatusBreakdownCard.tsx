import React from 'react';
import { Card } from '@/components/ui/card';
import { Clock, CheckCircle, PauseCircle, ActivitySquare, AlertTriangle } from 'lucide-react';
import { Project } from '@shared/schema';
import { getProjectScheduleState } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

interface ProjectStatusBreakdownCardProps {
  projects: Project[];
}

export function ProjectStatusBreakdownCard({ projects }: ProjectStatusBreakdownCardProps) {
  // Fetch manufacturing schedules
  const { data: manufacturingSchedules } = useQuery({
    queryKey: ['/api/manufacturing-schedules'],
  });
  
  // Calculate status counts for the specific categories we care about
  const statusCounts = React.useMemo(() => {
    if (!projects || projects.length === 0) {
      return {
        unscheduled: 0,
        scheduled: 0,
        inProgress: 0,
        complete: 0
      };
    }
    
    // Initialize counters
    let unscheduled = 0;
    let scheduled = 0;
    let inProgress = 0;
    let complete = 0;
    
    // Count projects by schedule state
    projects.forEach(project => {
      // If project is completed, add to complete count
      if (project.status === 'completed') {
        complete++;
        return;
      }
      
      // For all other projects, categorize by their schedule state
      const scheduleState = getProjectScheduleState(manufacturingSchedules, project.id);
      
      if (scheduleState === 'Unscheduled') {
        unscheduled++;
      } else if (scheduleState === 'Scheduled') {
        scheduled++;
      } else if (scheduleState === 'In Progress') {
        inProgress++;
      } else if (scheduleState === 'Complete') {
        complete++;
      }
    });
    
    return {
      unscheduled,
      scheduled,
      inProgress,
      complete
    };
  }, [projects, manufacturingSchedules]);
  
  // Define status items
  const statusItems = [
    {
      status: 'Unscheduled',
      count: statusCounts.unscheduled,
      icon: <PauseCircle className="h-6 w-6 text-gray-500" />,
      color: 'text-gray-500'
    },
    {
      status: 'Scheduled',
      count: statusCounts.scheduled,
      icon: <Clock className="h-6 w-6 text-indigo-500" />,
      color: 'text-indigo-500'
    },
    {
      status: 'In Progress',
      count: statusCounts.inProgress,
      icon: <ActivitySquare className="h-6 w-6 text-blue-500" />,
      color: 'text-blue-500'
    },
    {
      status: 'Complete',
      count: statusCounts.complete,
      icon: <CheckCircle className="h-6 w-6 text-success" />,
      color: 'text-success'
    }
  ];

  return (
    <Card className="bg-card rounded-xl p-4 border border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Project Status Breakdown</h3>
      </div>
      
      <div>
        <div className="grid grid-cols-4 gap-3">
          {statusItems.map((item) => (
            <div 
              key={item.status}
              className="flex flex-col items-center justify-center p-3 rounded-lg bg-card/50 border border-border"
            >
              {item.icon}
              <div className={`text-xl font-bold mt-2 ${item.color}`}>{item.count}</div>
              <div className="text-sm text-muted-foreground mt-1">{item.status}</div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export default ProjectStatusBreakdownCard;