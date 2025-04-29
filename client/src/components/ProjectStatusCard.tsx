import React from 'react';
import { 
  Folders,
  ArrowUp,
  ArrowDown
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
}

export function ProjectStatsCard({
  title,
  value,
  icon,
  change,
  tags,
  progress
}: ProjectStatsCardProps) {
  return (
    <Card className="bg-darkCard rounded-xl p-4 border border-gray-800">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-gray-400 font-medium">{title}</h3>
        <div className="p-2 rounded-lg bg-primary bg-opacity-10">
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
              className="px-2 py-0.5 rounded-full text-xs inline-flex items-center"
            >
              <ProgressBadge status={tag.status} size="sm">
                {tag.value} {tag.label}
              </ProgressBadge>
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}

export default ProjectStatsCard;
