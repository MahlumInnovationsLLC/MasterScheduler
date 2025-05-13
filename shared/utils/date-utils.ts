/**
 * Utility functions for date calculations and manipulations
 */

/**
 * List of US holidays by date each year
 * These will be adjusted for weekends (moved to Monday or Friday) as in the US
 */
export const US_HOLIDAYS: Record<string, string> = {
  "01-01": "New Year's Day",
  "07-04": "Independence Day",
  "11-11": "Veterans Day",
  "12-25": "Christmas Day",
  // Variable holidays will need to be calculated separately
};

// Month-Day patterns for holidays that fall on specific weekdays in specific months
// These will be calculated for each year
const VARIABLE_HOLIDAYS: Record<string, { month: number; weekday: number; dayNumber: number; name: string }> = {
  "MLK_DAY": { month: 1, weekday: 1, dayNumber: 3, name: "Martin Luther King Jr. Day" }, // 3rd Monday in January
  "PRESIDENTS_DAY": { month: 2, weekday: 1, dayNumber: 3, name: "Presidents' Day" }, // 3rd Monday in February
  "MEMORIAL_DAY": { month: 5, weekday: 1, dayNumber: -1, name: "Memorial Day" }, // Last Monday in May
  "LABOR_DAY": { month: 9, weekday: 1, dayNumber: 1, name: "Labor Day" }, // 1st Monday in September
  "COLUMBUS_DAY": { month: 10, weekday: 1, dayNumber: 2, name: "Columbus Day" }, // 2nd Monday in October
  "THANKSGIVING": { month: 11, weekday: 4, dayNumber: 4, name: "Thanksgiving" }, // 4th Thursday in November
};

/**
 * Calculates US holidays for a specific year
 * 
 * @param year Calendar year
 * @returns Map of dates (YYYY-MM-DD) to holiday names
 */
export function getUSHolidays(year: number): Map<string, string> {
  const holidays = new Map<string, string>();

  // Fixed holidays (adjusted for weekends)
  Object.entries(US_HOLIDAYS).forEach(([datePart, name]) => {
    const [month, day] = datePart.split('-').map(Number);
    let holidayDate = new Date(year, month - 1, day);
    
    // Weekend adjustments (Saturday → Friday, Sunday → Monday)
    const weekday = holidayDate.getDay();
    if (weekday === 0) { // Sunday
      holidayDate = new Date(year, month - 1, day + 1);
    } else if (weekday === 6) { // Saturday
      holidayDate = new Date(year, month - 1, day - 1);
    }
    
    const formattedDate = holidayDate.toISOString().split('T')[0];
    holidays.set(formattedDate, name);
  });

  // Variable holidays
  Object.values(VARIABLE_HOLIDAYS).forEach(({ month, weekday, dayNumber, name }) => {
    const holidayDate = getNthWeekdayOfMonth(year, month, weekday, dayNumber);
    const formattedDate = holidayDate.toISOString().split('T')[0];
    holidays.set(formattedDate, name);
  });

  return holidays;
}

/**
 * Gets a specific weekday of a specific month
 * e.g., 3rd Monday of January, or last Monday of May
 * 
 * @param year Year
 * @param month Month (1-12)
 * @param weekday Weekday (0-6, where 0 is Sunday)
 * @param n Which occurrence (1, 2, 3, 4, 5, or -1 for last)
 * @returns Date object
 */
function getNthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): Date {
  const date = new Date(year, month - 1, 1);
  
  // Find the first occurrence of the weekday
  while (date.getDay() !== weekday) {
    date.setDate(date.getDate() + 1);
  }
  
  // If we want the last occurrence
  if (n < 0) {
    // Start from the first occurrence in the next month and go back
    const nextMonth = new Date(year, month, 1);
    
    // Find the first occurrence of the weekday in the next month
    while (nextMonth.getDay() !== weekday) {
      nextMonth.setDate(nextMonth.getDate() + 1);
    }
    
    // Go back by 7 days at a time until we're back in the right month
    while (nextMonth.getMonth() === month) {
      nextMonth.setDate(nextMonth.getDate() - 7);
    }
    
    // Now go forward by 7 days once to get the last occurrence in the correct month
    nextMonth.setDate(nextMonth.getDate() + 7);
    return nextMonth;
  }
  
  // Otherwise, add (n-1) weeks to get to the nth occurrence
  date.setDate(date.getDate() + (n - 1) * 7);
  return date;
}

/**
 * Counts working days (Monday-Friday, excluding US holidays) between two dates
 * 
 * @param startDateStr ISO date string (YYYY-MM-DD) or Date object
 * @param endDateStr ISO date string (YYYY-MM-DD) or Date object
 * @returns Number of working days, or null if dates are invalid
 */
export function countWorkingDays(startDateStr: string | Date | null, endDateStr: string | Date | null): number | null {
  // Handle null/invalid inputs
  if (!startDateStr || !endDateStr) return null;
  
  // Convert to Date objects
  const startDate = startDateStr instanceof Date 
    ? startDateStr 
    : new Date(startDateStr);
    
  const endDate = endDateStr instanceof Date 
    ? endDateStr 
    : new Date(endDateStr);
  
  // Validate dates
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null;
  
  // Ensure startDate is not after endDate
  if (startDate > endDate) return null;
  
  // Set time portion to the same to avoid any time-related issues
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  
  // Get years range to calculate holidays
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();
  
  // Collect all holidays in the date range
  const holidays = new Set<string>();
  for (let year = startYear; year <= endYear; year++) {
    const yearHolidays = getUSHolidays(year);
    yearHolidays.forEach((_, dateStr) => {
      holidays.add(dateStr);
    });
  }
  
  // Count working days
  let workingDays = 0;
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    const dateString = currentDate.toISOString().split('T')[0];
    
    // Only count weekdays (Monday-Friday) and not holidays
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.has(dateString)) {
      workingDays++;
    }
    
    // Move to the next day
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return workingDays;
}

/**
 * Determines if a date is a business day (weekday and not a holiday)
 * 
 * @param dateStr ISO date string (YYYY-MM-DD) or Date object
 * @returns boolean indicating if the date is a business day
 */
export function isBusinessDay(dateStr: string | Date | null): boolean {
  if (!dateStr) return false;
  
  // Convert to Date object
  const date = dateStr instanceof Date 
    ? dateStr 
    : new Date(dateStr);
  
  // Validate date
  if (isNaN(date.getTime())) return false;
  
  // Set time portion to zeros to avoid any time-related issues
  date.setHours(0, 0, 0, 0);
  
  // Check if it's a weekend
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) return false; // Sunday or Saturday
  
  // Check if it's a holiday
  const dateString = date.toISOString().split('T')[0];
  const year = date.getFullYear();
  const holidays = getUSHolidays(year);
  
  return !holidays.has(dateString);
}

/**
 * Adjusts a date to the next business day if it falls on a weekend or holiday
 * 
 * @param dateStr ISO date string (YYYY-MM-DD) or Date object
 * @returns Date object adjusted to the next business day if needed
 */
export function adjustToNextBusinessDay(dateStr: string | Date | null): Date | null {
  if (!dateStr) return null;
  
  // Convert to Date object
  const date = dateStr instanceof Date 
    ? new Date(dateStr.getTime()) // Create a copy
    : new Date(dateStr);
  
  // Validate date
  if (isNaN(date.getTime())) return null;
  
  // Set time portion to zeros
  date.setHours(0, 0, 0, 0);
  
  // Keep incrementing the date until we find a business day
  while (!isBusinessDay(date)) {
    date.setDate(date.getDate() + 1);
  }
  
  return date;
}

/**
 * Adjusts a date to the previous business day if it falls on a weekend or holiday
 * 
 * @param dateStr ISO date string (YYYY-MM-DD) or Date object
 * @returns Date object adjusted to the previous business day if needed
 */
export function adjustToPreviousBusinessDay(dateStr: string | Date | null): Date | null {
  if (!dateStr) return null;
  
  // Convert to Date object
  const date = dateStr instanceof Date 
    ? new Date(dateStr.getTime()) // Create a copy
    : new Date(dateStr);
  
  // Validate date
  if (isNaN(date.getTime())) return null;
  
  // Set time portion to zeros
  date.setHours(0, 0, 0, 0);
  
  // Keep decrementing the date until we find a business day
  while (!isBusinessDay(date)) {
    date.setDate(date.getDate() - 1);
  }
  
  return date;
}