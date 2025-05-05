import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistance, isBefore, isAfter, differenceInDays } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | undefined | null): string {
  if (!date) return 'N/A';
  
  try {
    // Try to create a valid date object
    const dateObj = new Date(date);
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      console.warn(`Invalid date format: ${date}`);
      return String(date) || 'N/A';
    }
    
    // Format the date
    return format(dateObj, 'MMM dd, yyyy');
  } catch (error) {
    console.error(`Error formatting date: ${date}`, error);
    return String(date) || 'N/A';
  }
}

export function formatCurrency(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null) return '$0';
  
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Format as USD with appropriate abbreviations for thousands/millions
  if (num >= 1000000) {
    return `$${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `$${(num / 1000).toFixed(1)}K`;
  } else {
    return `$${num.toFixed(2)}`;
  }
}

export function calculatePercentComplete(startDate: Date | string, endDate: Date | string, actualPercent?: number): number {
  if (actualPercent !== undefined) return actualPercent;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();
  
  if (isBefore(now, start)) return 0;
  if (isAfter(now, end)) return 100;
  
  const totalDuration = differenceInDays(end, start);
  const elapsedDuration = differenceInDays(now, start);
  
  const percent = Math.round((elapsedDuration / totalDuration) * 100);
  return Math.min(100, Math.max(0, percent));
}

export function getProjectStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'active':
      return 'bg-blue-900 text-blue-400';
    case 'delayed':
      return 'bg-warning-900 text-warning-400';
    case 'critical':
      return 'bg-danger-900 text-danger-400';
    case 'completed':
      return 'bg-success-900 text-success-400';
    case 'delivered':
      return 'bg-purple-900 text-purple-400';
    case 'archived':
      return 'bg-gray-900 text-gray-400';
    case 'on-hold':
      return 'bg-gray-900 text-gray-400';
    case 'cancelled':
      return 'bg-red-900 text-red-400';
    default:
      return 'bg-gray-800 text-gray-400';
  }
}

export function calculateProjectStatus(percentComplete: number, dueDate: Date | string | undefined | null): string {
  if (!dueDate) {
    return 'active';
  }
  
  const due = new Date(dueDate);
  const now = new Date();
  const daysUntilDue = differenceInDays(due, now);
  
  // Critical - due date passed or very close with low completion
  if ((daysUntilDue < 0 && percentComplete < 95) ||
      (daysUntilDue < 3 && percentComplete < 80)) {
    return 'critical';
  }
  
  // Delayed - behind expected progress
  if ((daysUntilDue < 10 && percentComplete < 70) ||
      (percentComplete < 0.5 * (100 - daysUntilDue))) {
    return 'delayed';
  }
  
  // Completed
  if (percentComplete >= 100) {
    return 'completed';
  }
  
  // On track
  return 'active';
}

export function getBillingStatusInfo(
  status: string, 
  targetDate: Date | string | undefined | null, 
  actualDate: Date | string | undefined | null
): { color: string, display: string, timeline: string } {
  const now = new Date();
  
  if (!targetDate) {
    return { color: 'bg-gray-500', display: 'Unknown', timeline: 'No date set' };
  }
  
  const target = new Date(targetDate);
  
  switch (status) {
    case 'paid':
      return { 
        color: 'bg-success', 
        display: 'Paid', 
        timeline: actualDate ? `Paid on ${formatDate(actualDate)}` : 'Payment received' 
      };
    case 'invoiced':
      return { 
        color: 'bg-warning', 
        display: 'Invoiced', 
        timeline: differenceInDays(now, target) > 0 
          ? `Due in ${formatDistance(now, target)}` 
          : `${Math.abs(differenceInDays(now, target))} days overdue` 
      };
    case 'delayed':
      return { 
        color: 'bg-danger', 
        display: 'Delayed', 
        timeline: `${Math.abs(differenceInDays(now, target))} days overdue` 
      };
    case 'upcoming':
    default:
      return { 
        color: 'bg-gray-700', 
        display: 'Upcoming', 
        timeline: `Due in ${formatDistance(now, target)}` 
      };
  }
}

export function checkScheduleConflict(
  bay: number,
  startDate: Date | string,
  endDate: Date | string,
  schedules: Array<{
    bayId: number,
    startDate: Date | string,
    endDate: Date | string,
    id?: number
  }>,
  currentId?: number
): boolean {
  const newStart = new Date(startDate);
  const newEnd = new Date(endDate);
  
  // Check for overlaps with existing schedules
  return schedules.some(schedule => {
    // Skip checking against itself when updating
    if (currentId && schedule.id === currentId) return false;
    
    if (schedule.bayId !== bay) return false;
    
    const scheduleStart = new Date(schedule.startDate);
    const scheduleEnd = new Date(schedule.endDate);
    
    // Check for any overlap between date ranges
    return (
      (isBefore(newStart, scheduleEnd) || newStart.getTime() === scheduleEnd.getTime()) &&
      (isAfter(newEnd, scheduleStart) || newEnd.getTime() === scheduleStart.getTime())
    );
  });
}
