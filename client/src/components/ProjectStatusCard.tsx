import React from 'react';
import { 
  Folders,
  ArrowUp,
  ArrowDown,
  PauseCircle,
  Clock,
  ActivitySquare,
  CheckCircle
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ProgressBadge } from '@/components/ui/progress-badge';

interface ProjectStatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  change?: {
    value: string | number;
    isPositive: boolean;
  };
  tags?: {
    label: string;
    value: number;
    status: string;
  }[];
  progress?: {
    value: number;
    label: string;
  };
  stateBreakdown?: {
    unscheduled: number;
    scheduled: number;
    inProgress: number;
    complete: number;
  };
  className?: string;
}

export function ProjectStatsCard({
  title,
  value,
  icon,
  change,
  tags,
  progress,
  stateBreakdown,
  className
}: ProjectStatsCardProps) {
  // Define state breakdown items if provided
  const stateItems = stateBreakdown ? [
    {
      status: 'Unscheduled',
      count: stateBreakdown.unscheduled,
      icon: <PauseCircle className="h-4 w-4 text-gray-500" />,
      color: 'text-gray-500'
    },
    {
      status: 'Scheduled',
      count: stateBreakdown.scheduled,
      icon: <Clock className="h-4 w-4 text-indigo-500" />,
      color: 'text-indigo-500'
    },
    {
      status: 'In Progress',
      count: stateBreakdown.inProgress,
      icon: <ActivitySquare className="h-4 w-4 text-blue-500" />,
      color: 'text-blue-500'
    },
    {
      status: 'Complete',
      count: stateBreakdown.complete,
      icon: <CheckCircle className="h-4 w-4 text-success" />,
      color: 'text-success'
    }
  ] : [];

  return (
    <Card className={`bg-darkCard rounded-xl p-4 border border-gray-800 ${className || ''}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-gray-400 font-medium">{title}</h3>
        <div className="p-2 rounded-lg bg-primary/10 flex items-center justify-center w-9 h-9">
          {icon}
        </div>
      </div>
      <div className="flex items-end">
        <span className="text-3xl font-bold font-sans">{value}</span>
        {change && (
          <span className={`ml-2 text-xs ${change.isPositive ? 'text-success' : 'text-danger'} flex items-center`}>
            {change.isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {' '}{change.value}
          </span>
        )}
      </div>
      
      {progress && (
        <div className="mt-3 flex items-center">
          <Progress value={progress.value} className="w-full bg-gray-800 h-2" />
          <span className="ml-2 text-xs text-gray-400">{progress.label}</span>
        </div>
      )}
      
      {tags && tags.length > 0 && (
        <div className="mt-2 flex gap-2 flex-wrap">
          {tags.map((tag, index) => (
            <span 
              key={index} 
              className="inline-flex items-center"
            >
              <ProgressBadge status={tag.status} size="sm" className="px-2 py-0.5 text-xs">
                {tag.value} {tag.label}
              </ProgressBadge>
            </span>
          ))}
        </div>
      )}

      {/* Project State Breakdown */}
      {stateBreakdown && (
        <div className="mt-4">
          <h4 className="text-xs text-gray-400 mb-2">Project State Breakdown</h4>
          <div className="grid grid-cols-4 gap-2">
            {stateItems.map((item) => (
              <div 
                key={item.status}
                className="flex flex-col items-center justify-center p-2 rounded-lg bg-card/50 border border-border"
              >
                {item.icon}
                <div className={`text-sm font-bold mt-1 ${item.color}`}>{item.count}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{item.status}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

export default ProjectStatsCard;
