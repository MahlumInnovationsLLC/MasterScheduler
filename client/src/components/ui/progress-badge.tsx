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
        return 'bg-green-950 text-white border border-green-600';
      case 'Delayed':
        return 'bg-red-950 text-white border border-red-600';
      case 'Completed':
        return 'bg-green-950 text-white border border-green-600';
      case 'Critical':
        return 'bg-red-950 text-white border border-red-600';
      case 'Paid':
        return 'bg-green-950 text-white border border-green-600';
      case 'Invoiced':
        return 'bg-yellow-950 text-white border border-yellow-600';
      case 'Upcoming':
        return 'bg-gray-900 text-white border border-gray-600';
      case 'Overdue':
        return 'bg-red-950 text-white border border-red-600';
      case 'Scheduled':
        return 'bg-green-950 text-white border border-green-600';
      case 'In Progress':
        return 'bg-blue-950 text-white border border-blue-600';
      case 'Inactive':
      default:
        return 'bg-gray-900 text-white border border-gray-600';
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
