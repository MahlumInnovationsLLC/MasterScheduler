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
 * Calculate bay utilization percentage based on staffing and scheduled work
 * This is the standardized calculation used across the application
 */
export function calculateBayUtilization(bays: any[], schedules: any[]): number {
  if (!bays || !bays.length || !schedules || !schedules.length) return 0;
  
  // Filter to only include bays with staff assigned
  const staffedBays = bays.filter(bay => bay.staffCount && bay.staffCount > 0);
  
  if (staffedBays.length === 0) return 0;
  
  // Calculate individual bay utilizations
  const bayUtilizations = staffedBays.map(bay => {
    // Get schedules for this bay
    const baySchedules = schedules.filter(schedule => schedule.bayId === bay.id);
    
    // Calculate capacity for this bay
    const weeklyCapacity = (bay.hoursPerPersonPerWeek || 40) * (bay.staffCount || 0);
    
    if (weeklyCapacity === 0) return 0;
    
    // Calculate scheduled hours with time weighting and production phase focus
    let weeklyUtilization = 0;
    
    if (baySchedules.length > 0) {
      // Get current date for time-based weighting
      const now = new Date();
      // We'll analyze by week for the next 16 weeks (4 months)
      const MAX_FUTURE_WEEKS = 16;
      const weeklyHoursMap: Record<string, number> = {};
      
      // First, calculate the load by week across the next few months
      baySchedules.forEach(schedule => {
        if (schedule.startDate && schedule.endDate && schedule.totalHours) {
          const startDate = new Date(schedule.startDate);
          const endDate = new Date(schedule.endDate);
          
          // Skip projects that have already ended
          if (endDate < now) return;
          
          // Calculate production hours per day for this schedule
          const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
          const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
          const hoursPerDay = schedule.totalHours / diffDays;
          
          // Analyze each week starting from today
          let currentWeekStart = new Date(now);
          currentWeekStart.setHours(0, 0, 0, 0);
          currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay()); // Start of current week
          
          for (let week = 0; week < MAX_FUTURE_WEEKS; week++) {
            // Calculate week range
            const weekStart = new Date(currentWeekStart);
            weekStart.setDate(weekStart.getDate() + (week * 7));
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            
            // Skip if this week is completely before the project starts
            if (weekEnd < startDate) continue;
            
            // Skip if this week is completely after the project ends
            if (weekStart > endDate) continue;
            
            // Calculate overlap days between this week and the project
            const overlapStart = new Date(Math.max(weekStart.getTime(), startDate.getTime()));
            const overlapEnd = new Date(Math.min(weekEnd.getTime(), endDate.getTime()));
            const overlapDays = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            
            // Calculate hours for this week based on overlap
            const weekHours = hoursPerDay * Math.min(7, overlapDays);
            
            // Apply time-decay factor: more weight to current weeks, less to future weeks
            const weekKey = weekStart.toISOString().substring(0, 10);
            const timeDecayFactor = Math.max(0.25, 1 - (week * 0.05)); // 5% decay per week
            
            // Add to weekly hours map
            if (!weeklyHoursMap[weekKey]) {
              weeklyHoursMap[weekKey] = 0;
            }
            weeklyHoursMap[weekKey] += weekHours * timeDecayFactor;
          }
        }
      });
      
      // Now find the peak utilization by looking at the week with the most hours
      // This accounts for when projects overlap in time
      if (Object.keys(weeklyHoursMap).length > 0) {
        const peakWeekHours = Math.max(...Object.values(weeklyHoursMap));
        weeklyUtilization = peakWeekHours;
      }
    }
    
    // Calculate utilization percentage based on weekly hours
    return Math.min(100, (weeklyUtilization / weeklyCapacity) * 100);
  });
  
  // Calculate average utilization across all staffed bays
  const avgUtilization = bayUtilizations.reduce((sum, util) => sum + util, 0) / staffedBays.length;
  
  return Math.round(avgUtilization);
}
