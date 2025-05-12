import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { 
  format, 
  formatDistance, 
  isBefore, 
  isAfter, 
  differenceInDays, 
  addDays, 
  startOfMonth, 
  endOfMonth, 
  eachWeekOfInterval, 
  startOfWeek, 
  endOfWeek, 
  getWeekOfMonth,
  addWeeks
} from "date-fns";

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

export function getProjectStatusColor(percentComplete: number, dueDate: Date | string | undefined | null): { color: string, status: string } {
  if (!dueDate) {
    return { color: 'bg-gray-500', status: 'Unknown' };
  }
  
  const due = new Date(dueDate);
  const now = new Date();
  const daysUntilDue = differenceInDays(due, now);
  
  // Completed
  if (percentComplete >= 100) {
    return { color: 'bg-success', status: 'Completed' };
  }
  
  // Critical - due date passed or very close with very low completion
  if ((daysUntilDue < 0 && percentComplete < 90) ||
      (daysUntilDue < 3 && percentComplete < 75)) {
    return { color: 'bg-danger', status: 'Critical' };
  }
  
  // Delayed - only mark as delayed if significantly behind expected progress
  if ((daysUntilDue < 7 && percentComplete < 60) ||
      (percentComplete < 0.4 * (100 - daysUntilDue) && daysUntilDue < 14)) {
    return { color: 'bg-warning', status: 'Delayed' };
  }
  
  // On track - most projects should show as Active
  return { color: 'bg-success', status: 'Active' };
}

export function getProjectScheduleState(
  manufacturingSchedules: any[] | null | undefined,
  projectId: number
): string {
  if (!manufacturingSchedules || manufacturingSchedules.length === 0) {
    return 'Unscheduled';
  }
  
  // Find schedules for this project
  const projectSchedules = manufacturingSchedules.filter(
    schedule => schedule.projectId === projectId
  );
  
  if (projectSchedules.length === 0) {
    return 'Unscheduled';
  }
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Check if any schedule is complete
  const completed = projectSchedules.some(
    schedule => schedule.status === 'complete' || 
    (schedule.endDate && new Date(schedule.endDate) < today)
  );
  
  if (completed) {
    return 'Complete';
  }
  
  // Check if any schedule is in progress
  const inProgress = projectSchedules.some(
    schedule => {
      const startDate = new Date(schedule.startDate);
      const endDate = new Date(schedule.endDate);
      return startDate <= today && endDate >= today;
    }
  );
  
  if (inProgress) {
    return 'In Progress';
  }
  
  // If not completed or in progress, but scheduled, then it's scheduled
  return 'Scheduled';
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

/**
 * Get bay status information based on utilization percentage
 * Follows the project standard: 0=Available, 50=Near Capacity, 100=At Capacity
 */
export function getBayStatusInfo(utilization: number): { status: string, color: string, description: string } {
  if (utilization === 0) {
    return {
      status: 'Available',
      color: 'text-blue-500',
      description: 'No projects currently assigned'
    };
  } else if (utilization === 50) {
    return {
      status: 'Near Capacity',
      color: 'text-amber-500',
      description: '1 project assigned (50% capacity)'
    };
  } else if (utilization === 100) {
    return {
      status: 'At Capacity',
      color: 'text-red-500',
      description: '2+ projects assigned (100% capacity)'
    };
  } else if (utilization < 25) {
    return {
      status: 'Mostly Available',
      color: 'text-blue-500',
      description: 'Most bays have no projects assigned'
    };
  } else if (utilization < 75) {
    return {
      status: 'Mixed Capacity',
      color: 'text-amber-500',
      description: 'Mix of available and near-capacity bays'
    };
  } else {
    return {
      status: 'Mostly At Capacity',
      color: 'text-red-500',
      description: 'Most bays are at full capacity'
    };
  }
}

/**
 * Calculate bay utilization percentage based on staffing and scheduled work
 * This is the standardized calculation used across the application
 */
export function calculateBayUtilization(bays: any[], schedules: any[]): number {
  if (!bays || !bays.length || !schedules || !schedules.length) return 0;
  
  // Filter to only include active bays (with isActive=true or undefined)
  const activeBays = bays.filter(bay => bay.isActive !== false);
  
  if (activeBays.length === 0) return 0;
  
  // Simplified approach based on project count per bay
  // Using the rule: 0 projects = 0%, 1 project = 50%, 2+ projects = 100%
  const bayUtilizations: number[] = [];
  
  // Process each bay individually
  activeBays.forEach(bay => {
    // Get active schedules for this bay (not completed)
    const now = new Date();
    const activeSchedules = schedules.filter(schedule => {
      return schedule.bayId === bay.id && 
             new Date(schedule.endDate) >= now && 
             schedule.status !== 'complete';
    });
    
    // Apply simplified utilization model and push to array
    if (activeSchedules.length >= 2) {
      bayUtilizations.push(100); // At Capacity (2+ projects)
    } else if (activeSchedules.length === 1) {
      bayUtilizations.push(50);  // Near Capacity (1 project)
    } else {
      bayUtilizations.push(0);   // Available (0 projects)
    }
  });
  
  // Calculate average utilization across all active bays
  let totalUtilization = 0;
  for (const util of bayUtilizations) {
    totalUtilization += util;
  }
  
  const avgUtilization = activeBays.length > 0 ? totalUtilization / activeBays.length : 0;
  
  console.log(`Bay utilization calculation: ${Math.round(avgUtilization)}% (based on project count per bay)`);
  return Math.round(avgUtilization);
}

/**
 * Get fiscal weeks for a specific month
 * Returns an array of fiscal weeks with start and end dates
 * Weeks are considered to start on Monday (weekStartsOn: 1)
 */
export function getFiscalWeeksForMonth(year: number, month: number): {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  label: string;
}[] {
  const startOfMonthDate = new Date(year, month - 1, 1); // month is 1-indexed in the function, but 0-indexed in Date
  const endOfMonthDate = endOfMonth(startOfMonthDate);
  
  // Get all weeks that intersect with this month
  const weeks = eachWeekOfInterval(
    { start: startOfMonthDate, end: endOfMonthDate },
    { weekStartsOn: 1 } // Monday as first day of week
  ).map((weekStart, index) => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    
    return {
      weekNumber: index + 1,
      startDate: weekStart,
      endDate: weekEnd < endOfMonthDate ? weekEnd : endOfMonthDate, // Cap at end of month
      label: `Week ${index + 1}: ${format(weekStart, 'MMM d')} - ${format(weekEnd < endOfMonthDate ? weekEnd : endOfMonthDate, 'MMM d')}`
    };
  });
  
  return weeks;
}

/**
 * Get fiscal week label for display
 * Includes date range for better context
 */
export function getFiscalWeekLabel(year: number, month: number, weekNumber: number): string {
  const weeks = getFiscalWeeksForMonth(year, month);
  const targetWeek = weeks.find(w => w.weekNumber === weekNumber);
  
  if (!targetWeek) {
    return `Week ${weekNumber}`;
  }
  
  return targetWeek.label;
}
