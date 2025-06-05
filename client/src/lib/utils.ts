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

export function formatDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return 'N/A';

  // Handle text values like PENDING, N/A, etc.
  if (typeof dateInput === 'string') {
    // Check if it's a text value (not a date string)
    if (dateInput === 'PENDING' || dateInput === 'N/A' || dateInput === 'TBD') {
      return dateInput;
    }

    // Check if it's not a valid date format before trying to parse
    if (!/^\d{4}-\d{2}-\d{2}/.test(dateInput) && isNaN(Date.parse(dateInput))) {
      return dateInput; // Return as-is if it's not a recognizable date format
    }

    // Special handling for YYYY-MM-DD format to avoid timezone shifts
    if (dateInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateInput.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      
      if (isNaN(date.getTime())) {
        return dateInput; // Return original if invalid
      }
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  }

  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;

    if (isNaN(date.getTime())) {
      // If it's still invalid, return the original string value if it was a string
      return typeof dateInput === 'string' ? dateInput : 'Invalid Date';
    }

    return format(date, 'MMM dd, yyyy');
  } catch (error) {
    console.error('Date formatting error:', error);
    // Return the original value if it was a string, otherwise return error message
    return typeof dateInput === 'string' ? dateInput : 'Invalid Date';
  }
}

export function formatCurrency(amount: number | string | undefined | null): string {
  try {
    // Handle undefined, null, empty string cases
    if (amount === undefined || amount === null || amount === '') return '$0';

    // Parse the string to a number if needed
    let num: number;
    if (typeof amount === 'string') {
      // Remove non-numeric characters (except decimal point)
      const cleanedString = amount.replace(/[^0-9.]/g, '');
      num = parseFloat(cleanedString);
    } else {
      num = amount;
    }

    // Check if parsing resulted in a valid number
    if (isNaN(num)) {
      console.warn(`Invalid currency value: ${amount}`);
      return '$0';
    }

    // Format as USD with appropriate abbreviations for thousands/millions
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `$${(num / 1000).toFixed(1)}K`;
    } else {
      return `$${num.toFixed(2)}`;
    }
  } catch (error) {
    console.error(`Error formatting currency: ${amount}`, error);
    return '$0';
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
  actualDate: Date | string | undefined | null,
  liveDate: Date | string | undefined | null = null
): { color: string, display: string, timeline: string } {
  const now = new Date();

  if (!targetDate && !liveDate) {
    return { color: 'bg-gray-500', display: 'Unknown', timeline: 'No date set' };
  }

  // Use live date if available, otherwise fall back to target date
  const referenceDate = liveDate ? new Date(liveDate) : (targetDate ? new Date(targetDate) : null);

  if (!referenceDate) {
    return { color: 'bg-gray-500', display: 'Unknown', timeline: 'No date set' };
  }

  // Use formatted string to indicate which date we're comparing against
  const dateTypeLabel = liveDate ? 'Live date' : 'Target date';

  switch (status) {
    case 'paid':
      return { 
        color: 'bg-success', 
        display: 'Paid', 
        timeline: actualDate ? `Paid on ${formatDate(actualDate)}` : 'Payment received' 
      };
    case 'invoiced':
      // For invoiced, determine if it's overdue based on reference date
      if (differenceInDays(referenceDate, now) > 0) {
        // Date is in the future, show "Due in X days"
        return { 
          color: 'bg-warning', 
          display: 'Invoiced', 
          timeline: `Due in ${formatDistance(referenceDate, now)}`
        };
      } else {
        // Date is in the past, show "Late by X days"
        return { 
          color: 'bg-warning', 
          display: 'Invoiced', 
          timeline: `Late by ${Math.abs(differenceInDays(referenceDate, now))} days` 
        };
      }
    case 'delayed':
      // Always show overdue for delayed status
      return { 
        color: 'bg-danger', 
        display: 'Delayed', 
        timeline: `Late by ${Math.abs(differenceInDays(referenceDate, now))} days` 
      };
    case 'upcoming':
    default:
      // For upcoming, check if it's already late based on reference date
      if (differenceInDays(referenceDate, now) > 0) {
        // Date is in the future
        return { 
          color: 'bg-gray-700', 
          display: 'Upcoming', 
          timeline: `Due in ${formatDistance(referenceDate, now)}` 
        };
      } else {
        // Date is in the past, mark as late
        return { 
          color: 'bg-amber-600', 
          display: 'Upcoming', 
          timeline: `Late by ${Math.abs(differenceInDays(referenceDate, now))} days` 
        };
      }
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
  // Get start and end of month
  const startOfMonthDate = new Date(year, month - 1, 1); // month is 1-indexed in the function, but 0-indexed in Date
  const endOfMonthDate = endOfMonth(startOfMonthDate);

  // For each week that overlaps with this month, create an entry
  const weeks = eachWeekOfInterval(
    { start: startOfMonthDate, end: endOfMonthDate },
    { weekStartsOn: 1 } // Monday as first day of week
  ).map((weekStart, index) => {
    // Calculate the end date of this week
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

    // Adjust start and end dates to be within the month
    const adjustedStart = isBefore(weekStart, startOfMonthDate) ? startOfMonthDate : weekStart;
    const adjustedEnd = isAfter(weekEnd, endOfMonthDate) ? endOfMonthDate : weekEnd;

    // Format the date range label (e.g., "May 1 - 7" or if spans months "May 29 - Jun 4")
    const startFormat = format(adjustedStart, 'MMM d');
    const endFormat = format(adjustedEnd, 'd');

    // Check if start and end dates are in the same month
    const startMonth = format(adjustedStart, 'MMM');
    const endMonth = format(adjustedEnd, 'MMM');

    // Create the label with appropriate format
    const dateRangeLabel = startMonth === endMonth 
      ? `${startMonth} ${format(adjustedStart, 'd')} - ${format(adjustedEnd, 'd')}` 
      : `${startMonth} ${format(adjustedStart, 'd')} - ${endMonth} ${format(adjustedEnd, 'd')}`;

    return {
      weekNumber: index + 1,
      startDate: adjustedStart,
      endDate: adjustedEnd,
      label: `Week ${index + 1}: ${dateRangeLabel}`
    };
  });

  return weeks;
}

/**
 * Get fiscal week label for display
 * Returns a simple date range formatted as "May 1 - 7" or "May 29 - Jun 4"
 * If withRange is true, it returns a simplified date range without the week number
 */
export function getFiscalWeekLabel(year: number, month: number, weekNumber: number, withRange = false): string {
  // Get all fiscal weeks for the month
  const fiscalWeeks = getFiscalWeeksForMonth(year, month);

  // Find the requested week
  const targetWeek = fiscalWeeks.find(week => week.weekNumber === weekNumber);

  if (!targetWeek) {
    return `Week ${weekNumber}`;
  }

  // Format the dates based on whether they're in the same month or not
  const startMonth = format(targetWeek.startDate, 'MMM');
  const endMonth = format(targetWeek.endDate, 'MMM');

  if (withRange) {
    // Just return the date range without the "Week X:" prefix
    if (startMonth === endMonth) {
      return `${startMonth} ${format(targetWeek.startDate, 'd')} - ${format(targetWeek.endDate, 'd')}`;
    } else {
      return `${startMonth} ${format(targetWeek.startDate, 'd')} - ${endMonth} ${format(targetWeek.endDate, 'd')}`;
    }
  }

  // Return complete label
  if (startMonth === endMonth) {
    return `Week ${weekNumber}: ${startMonth} ${format(targetWeek.startDate, 'd')} - ${format(targetWeek.endDate, 'd')}`;
  } else {
    return `Week ${weekNumber}: ${startMonth} ${format(targetWeek.startDate, 'd')} - ${endMonth} ${format(targetWeek.endDate, 'd')}`;
  }
}

/**
 * Calculate the number of weekdays (Monday-Friday) between two dates
 * @param startDateStr Start date as string (ISO format) or null
 * @param endDateStr End date as string (ISO format) or null
 * @returns Number of weekdays or null if dates are invalid
 */
export function calculateWeekdaysBetween(startDateStr: string | null, endDateStr: string | null): number | null {
  if (!startDateStr || !endDateStr) return null;

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null;

  // If end date is before start date, return 0
  if (endDate < startDate) return 0;

  let weekdays = 0;
  let currentDate = new Date(startDate);

  // Set to start of day to avoid time issues
  currentDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    // Check if it's a weekday (Monday-Friday, 1-5)
    if (dayOfWeek > 0 && dayOfWeek < 6) {
      weekdays++;
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return weekdays;
}