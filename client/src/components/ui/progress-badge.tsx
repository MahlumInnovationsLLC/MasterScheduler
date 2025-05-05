import React from 'react';
import { cn } from '@/lib/utils';

interface ProgressBadgeProps {
  status: 'On Track' | 'Delayed' | 'Completed' | 'Critical' | 'Inactive' | string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  animatePulse?: boolean;
  children?: React.ReactNode;
}

export function ProgressBadge({ 
  status, 
  size = 'md', 
  className,
  animatePulse = false,
  children
}: ProgressBadgeProps) {
  // Define styles based on status
  const getStatusStyles = () => {
    switch (status) {
      case 'On Track':
        return 'dark:bg-green-950 bg-green-100 dark:text-white text-green-800 border border-green-600';
      case 'Delayed':
        return 'dark:bg-red-950 bg-red-100 dark:text-white text-red-800 border border-red-600';
      case 'Completed':
        return 'dark:bg-green-950 bg-green-100 dark:text-white text-green-800 border border-green-600';
      case 'Critical':
        return 'dark:bg-red-950 bg-red-100 dark:text-white text-red-800 border border-red-600';
      case 'Paid':
        return 'dark:bg-green-950 bg-green-100 dark:text-white text-green-800 border border-green-600';
      case 'Invoiced':
        return 'dark:bg-yellow-950 bg-yellow-100 dark:text-white text-yellow-800 border border-yellow-600';
      case 'Upcoming':
        return 'dark:bg-gray-900 bg-gray-100 dark:text-white text-gray-800 border border-gray-600';
      case 'Overdue':
        return 'dark:bg-red-950 bg-red-100 dark:text-white text-red-800 border border-red-600';
      case 'Scheduled':
        return 'dark:bg-green-950 bg-green-100 dark:text-white text-green-800 border border-green-600';
      case 'In Progress':
        return 'dark:bg-blue-950 bg-blue-100 dark:text-white text-blue-800 border border-blue-600';
      case 'Inactive':
      default:
        return 'dark:bg-gray-900 bg-gray-100 dark:text-white text-gray-800 border border-gray-600';
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
      {children || status}
    </span>
  );
}
