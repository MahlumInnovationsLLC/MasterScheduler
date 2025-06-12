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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "wouter";
import { formatCurrency, formatDate } from "@/lib/utils";

interface ProjectInfo {
  id: number;
  name: string;
  projectNumber: string;
}

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
    delivered: number;
  };
  projectLists?: {
    unscheduled: ProjectInfo[];
    scheduled: ProjectInfo[];
    inProgress: ProjectInfo[];
    complete: ProjectInfo[];
    delivered: ProjectInfo[];
  };
  upcomingMilestones?: Array<{
    id: number;
    name: string;
    projectNumber: string;
    amount: string;
    dueDate: string;
    status: string;
  }>;
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
  projectLists,
  upcomingMilestones,
  className
}: ProjectStatsCardProps) {
  // Define state breakdown items if provided
  const stateItems = stateBreakdown ? [
    {
      status: 'Unscheduled',
      count: stateBreakdown.unscheduled,
      icon: <PauseCircle className="h-4 w-4 text-gray-500" />,
      color: 'text-gray-500',
      key: 'unscheduled',
      projects: projectLists?.unscheduled || []
    },
    {
      status: 'Scheduled',
      count: stateBreakdown.scheduled,
      icon: <Clock className="h-4 w-4 text-indigo-500" />,
      color: 'text-indigo-500',
      key: 'scheduled',
      projects: projectLists?.scheduled || []
    },
    {
      status: 'In Progress',
      count: stateBreakdown.inProgress,
      icon: <ActivitySquare className="h-4 w-4 text-blue-500" />,
      color: 'text-blue-500',
      key: 'inProgress',
      projects: projectLists?.inProgress || []
    },
    {
      status: 'Delivered',
      count: stateBreakdown.delivered,
      icon: <CheckCircle className="h-4 w-4 text-green-500" />,
      color: 'text-green-500',
      key: 'delivered',
      projects: projectLists?.delivered || []
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
              <HoverCard key={item.status}>
                <HoverCardTrigger asChild>
                  <div 
                    className="flex flex-col items-center justify-center p-2 rounded-lg bg-card/50 border border-border cursor-pointer hover:border-primary/30 hover:bg-card/80 transition-colors"
                  >
                    {item.icon}
                    <div className={`text-sm font-bold mt-1 ${item.color}`}>{item.count}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 whitespace-nowrap">{item.status}</div>
                  </div>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 p-0 bg-card border-border">
                  <div className="p-3 border-b border-border">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      {item.icon}
                      <span>{item.status} Projects ({item.count})</span>
                    </h3>
                  </div>

                  {item.projects.length > 0 ? (
                    <div className="max-h-[320px] overflow-y-auto">
                      {item.projects.map((project) => (
                        <div 
                          key={project.id}
                          className="p-3 flex items-center justify-between border-b border-border last:border-b-0 hover:bg-muted/30"
                        >
                          <div>
                            <div className="font-medium text-sm">{project.name}</div>
                            <div className="text-xs text-muted-foreground">#{project.projectNumber}</div>
                          </div>
                          <div className="flex gap-1">
                            <div className={`px-2 py-1 text-xs rounded-full ${item.color.replace('text', 'bg')}/10 ${item.color}`}>
                              {item.status}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No projects found in this category
                    </div>
                  )}
                </HoverCardContent>
              </HoverCard>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Milestones List */}
      {upcomingMilestones && upcomingMilestones.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="text-xs text-gray-400 font-medium">Next 3 Due:</div>
          {upcomingMilestones.map((milestone, index) => (
            <div key={milestone.id} className="flex items-center justify-between text-xs bg-gray-800/50 rounded p-2">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-200 truncate">
                  {milestone.name}
                </div>
                <div className="text-gray-400">
                  {milestone.projectNumber} • {formatCurrency(parseFloat(milestone.amount))}
                </div>
              </div>
              <div className="text-gray-400 text-right ml-2">
                {milestone.targetInvoiceDate ? formatDate(milestone.targetInvoiceDate) : 'No date set'}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default ProjectStatsCard;