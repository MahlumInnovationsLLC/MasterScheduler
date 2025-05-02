import React from 'react';
import { cn } from '@/lib/utils';

interface ProgressBadgeProps {
  status: 'On Track' | 'Delayed' | 'Completed' | 'Critical' | 'Inactive' | string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  animatePulse?: boolean;
}

export function ProgressBadge({ 
  status, 
  size = 'md', 
  className,
  animatePulse = false
}: ProgressBadgeProps) {
  // Define styles based on status
  const getStatusStyles = () => {
    switch (status) {
      case 'On Track':
        return 'bg-success bg-opacity-10 text-success';
      case 'Delayed':
        return 'bg-danger bg-opacity-10 text-danger';
      case 'Completed':
        return 'bg-success bg-opacity-10 text-success';
      case 'Critical':
        return 'bg-danger bg-opacity-10 text-danger';
      case 'Paid':
        return 'bg-success bg-opacity-10 text-success';
      case 'Invoiced':
        return 'bg-warning bg-opacity-10 text-warning';
      case 'Upcoming':
        return 'bg-gray-700 text-gray-300';
      case 'Overdue':
        return 'bg-danger bg-opacity-10 text-danger';
      case 'Scheduled':
        return 'bg-success bg-opacity-10 text-success';
      case 'In Progress':
        return 'bg-primary bg-opacity-10 text-primary';
      case 'Inactive':
      default:
        return 'bg-gray-700 text-gray-400';
    }
  };

  // Size classes
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2 py-1 text-xs',
    lg: 'px-3 py-1 text-sm'
  };

  return (
    <span 
      className={cn(
        'rounded-full inline-block font-medium',
        getStatusStyles(),
        sizeClasses[size],
        animatePulse && status === 'Critical' && 'pulse-danger',
        className
      )}
    >
      {status}
    </span>
  );
}
