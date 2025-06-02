import React from 'react';
import { Card } from '@/components/ui/card';
import { Clock, CheckCircle, PauseCircle, ActivitySquare, AlertTriangle } from 'lucide-react';
import { Project } from '@shared/schema';
import { getProjectScheduleState } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

interface ProjectStatusBreakdownCardProps {
  projects: Project[];
}

export function ProjectStatusBreakdownCard({ projects }: ProjectStatusBreakdownCardProps) {
  // Fetch manufacturing schedules
  const { data: manufacturingSchedules } = useQuery({
    queryKey: ['/api/manufacturing-schedules'],
  });
  
  // Calculate status counts and project lists for hover functionality
  const statusData = React.useMemo(() => {
    if (!projects || projects.length === 0) {
      return {
        counts: { unscheduled: 0, scheduled: 0, inProgress: 0, complete: 0 },
        lists: { unscheduled: [], scheduled: [], inProgress: [], complete: [] }
      };
    }
    
    // Initialize arrays to collect projects
    const unscheduledProjects: Project[] = [];
    const scheduledProjects: Project[] = [];
    const inProgressProjects: Project[] = [];
    const completeProjects: Project[] = [];
    
    // Categorize projects by schedule state
    projects.forEach(project => {
      // If project is completed, add to complete
      if (project.status === 'completed') {
        completeProjects.push(project);
        return;
      }
      
      // For all other projects, categorize by their schedule state
      const scheduleState = getProjectScheduleState(manufacturingSchedules, project.id);
      
      if (scheduleState === 'Unscheduled') {
        unscheduledProjects.push(project);
      } else if (scheduleState === 'Scheduled') {
        scheduledProjects.push(project);
      } else if (scheduleState === 'In Progress') {
        inProgressProjects.push(project);
      } else if (scheduleState === 'Complete') {
        completeProjects.push(project);
      }
    });
    
    return {
      counts: {
        unscheduled: unscheduledProjects.length,
        scheduled: scheduledProjects.length,
        inProgress: inProgressProjects.length,
        complete: completeProjects.length
      },
      lists: {
        unscheduled: unscheduledProjects,
        scheduled: scheduledProjects,
        inProgress: inProgressProjects,
        complete: completeProjects
      }
    };
  }, [projects, manufacturingSchedules]);
  
  // Define status items with project lists for hover functionality
  const statusItems = [
    {
      status: 'Unscheduled',
      count: statusData.counts.unscheduled,
      icon: <PauseCircle className="h-6 w-6 text-gray-500" />,
      color: 'text-gray-500',
      projects: statusData.lists.unscheduled
    },
    {
      status: 'Scheduled',
      count: statusData.counts.scheduled,
      icon: <Clock className="h-6 w-6 text-indigo-500" />,
      color: 'text-indigo-500',
      projects: statusData.lists.scheduled
    },
    {
      status: 'In Progress',
      count: statusData.counts.inProgress,
      icon: <ActivitySquare className="h-6 w-6 text-blue-500" />,
      color: 'text-blue-500',
      projects: statusData.lists.inProgress
    },
    {
      status: 'Complete',
      count: statusData.counts.complete,
      icon: <CheckCircle className="h-6 w-6 text-success" />,
      color: 'text-success',
      projects: statusData.lists.complete
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
            <HoverCard key={item.status}>
              <HoverCardTrigger asChild>
                <div 
                  className="flex flex-col items-center justify-center p-3 rounded-lg bg-card/50 border border-border hover:bg-card/70 transition-colors cursor-pointer"
                >
                  {item.icon}
                  <div className={`text-xl font-bold mt-2 ${item.color}`}>{item.count}</div>
                  <div className="text-sm text-muted-foreground mt-1">{item.status}</div>
                </div>
              </HoverCardTrigger>
              <HoverCardContent className="w-80">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">{item.status} Projects ({item.count})</h4>
                  {item.projects.length > 0 ? (
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {item.projects.map((project) => (
                        <div key={project.id} className="flex items-center justify-between p-2 bg-muted/50 rounded text-xs">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{project.name}</div>
                            <div className="text-muted-foreground">{project.projectNumber}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No projects found</p>
                  )}
                </div>
              </HoverCardContent>
            </HoverCard>
          ))}
        </div>
      </div>
    </Card>
  );
}

export default ProjectStatusBreakdownCard;