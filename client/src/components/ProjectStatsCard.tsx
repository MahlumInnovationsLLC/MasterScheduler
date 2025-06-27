import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface ProjectStatsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  tags?: {
    label: string;
    value: number;
    status: 'Critical' | 'Delayed' | 'On Track' | 'Upcoming';
  }[];
  stateBreakdown?: {
    unscheduled: number;
    scheduled: number;
    inProgress: number;
    complete: number;
    delivered: number;
  };
  projectLists?: any;
  upcomingMilestones?: any[];
}

const ProjectStatsCard: React.FC<ProjectStatsCardProps> = ({
  title,
  value,
  icon,
  tags,
  stateBreakdown,
  upcomingMilestones
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'Delayed': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'On Track': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'Upcoming': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="h-4 w-4">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        
        {tags && (
          <div className="flex flex-wrap gap-1 mt-2">
            {tags.map((tag, index) => (
              <Badge
                key={index}
                variant="outline"
                className={`text-xs ${getStatusColor(tag.status)}`}
              >
                {tag.value} {tag.label}
              </Badge>
            ))}
          </div>
        )}

        {stateBreakdown && (
          <div className="mt-3 space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Project States</span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <div className="flex justify-between">
                <span>Unscheduled:</span>
                <span>{stateBreakdown.unscheduled}</span>
              </div>
              <div className="flex justify-between">
                <span>Scheduled:</span>
                <span>{stateBreakdown.scheduled}</span>
              </div>
              <div className="flex justify-between">
                <span>In Progress:</span>
                <span>{stateBreakdown.inProgress}</span>
              </div>
              <div className="flex justify-between">
                <span>Complete:</span>
                <span>{stateBreakdown.complete}</span>
              </div>
              <div className="flex justify-between col-span-2">
                <span>Delivered:</span>
                <span>{stateBreakdown.delivered}</span>
              </div>
            </div>
          </div>
        )}

        {upcomingMilestones && upcomingMilestones.length > 0 && (
          <div className="mt-3 space-y-1">
            <div className="text-xs text-muted-foreground">Next Milestones:</div>
            {upcomingMilestones.slice(0, 3).map((milestone, index) => (
              <div key={index} className="text-xs flex justify-between">
                <span className="truncate">{milestone.name}</span>
                <span className="text-muted-foreground">
                  {milestone.dueDate ? new Date(milestone.dueDate).toLocaleDateString() : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProjectStatsCard;