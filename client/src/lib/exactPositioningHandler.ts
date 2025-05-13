// exactPositioningHandler.ts
// This module provides exact date positioning for drag and drop operations in the bay scheduling system
// It ensures consistent positioning behavior across all bays without grid snapping

import { format, addDays } from 'date-fns';

export interface PositioningProps {
  // Element references and dimensions
  targetElement: HTMLElement | null;
  slotWidth: number;
  daysBetweenSlots: number;
  slots: { date: Date }[];
  
  // Date attributes from target elements
  dataDate?: string | null;
  
  // For logging/debugging
  bayId: number;
  bayName?: string;
}

export interface DateResult {
  date: Date;
  exactDateStr: string;
  // The source of the date (for debugging)
  source: 'element-data-date' | 'closest-data-date' | 'global-date' | 'body-attribute' | 'fallback' | 'pixel-calculation';
}

/**
 * Calculate exact date position for initial drop or move operations
 * WITHOUT grid-snapping to predefined points
 */
export function calculateExactDatePosition(props: PositioningProps): DateResult | null {
  const { 
    targetElement, 
    slotWidth, 
    daysBetweenSlots, 
    slots,
    dataDate,
    bayId
  } = props;
  
  // For logging
  const bayPrefix = `BAY ${bayId}`;
  
  // Always use direct data-date attribute first (most reliable)
  if (dataDate) {
    console.log(`${bayPrefix} EXACT POSITIONING: Using data-date attribute directly:`, dataDate);
    return {
      date: new Date(dataDate),
      exactDateStr: dataDate,
      source: 'element-data-date'
    };
  }
  
  // Next, try to find closest element with data-date
  if (targetElement) {
    const dateElement = targetElement.closest('[data-date]') as HTMLElement;
    if (dateElement) {
      const dateStr = dateElement.getAttribute('data-date');
      if (dateStr) {
        console.log(`${bayPrefix} EXACT POSITIONING: Using date from closest element:`, dateStr);
        return {
          date: new Date(dateStr),
          exactDateStr: dateStr,
          source: 'closest-data-date'
        };
      }
    }
  }
  
  // Try global date variable (set during drag operations)
  const storedGlobalDate = (window as any).lastExactDate;
  if (storedGlobalDate) {
    console.log(`${bayPrefix} EXACT POSITIONING: Using global lastExactDate:`, storedGlobalDate);
    return {
      date: new Date(storedGlobalDate),
      exactDateStr: storedGlobalDate,
      source: 'global-date'
    };
  }
  
  // Try body attribute
  const bodyDateAttribute = document.body.getAttribute('data-current-drag-date');
  if (bodyDateAttribute) {
    console.log(`${bayPrefix} EXACT POSITIONING: Using body attribute data-current-drag-date:`, bodyDateAttribute);
    return {
      date: new Date(bodyDateAttribute),
      exactDateStr: bodyDateAttribute,
      source: 'body-attribute'
    };
  }
  
  // If we still don't have a date and have slots, use the first slot date (emergency fallback)
  if (slots.length > 0 && slots[0].date) {
    console.log(`${bayPrefix} EXACT POSITIONING: Falling back to first visible slot date`);
    const dateStr = format(slots[0].date, 'yyyy-MM-dd');
    return {
      date: new Date(slots[0].date),
      exactDateStr: dateStr,
      source: 'fallback'
    };
  }
  
  console.error(`${bayPrefix} EXACT POSITIONING: Failed to determine exact date position`);
  return null;
}

/**
 * Calculate exact date based on pixel position for resize operations
 */
export function calculateDateFromPixelPosition(
  pixelPosition: number,
  options: {
    slotWidth: number;
    daysBetweenSlots: number;
    slots: { date: Date }[];
    // Optional reference point for relative calculation
    referenceDate?: Date;
    pixelOffset?: number;
    // For logging
    bayId: number;
    operation: 'left-resize' | 'right-resize' | 'move';
  }
): DateResult | null {
  const { 
    slotWidth, 
    daysBetweenSlots, 
    slots, 
    referenceDate, 
    pixelOffset = 0,
    bayId,
    operation
  } = options;
  
  // For logging
  const bayPrefix = `BAY ${bayId}`;
  const operationDesc = operation === 'left-resize' 
    ? 'LEFT RESIZE' 
    : operation === 'right-resize' 
      ? 'RIGHT RESIZE' 
      : 'MOVE';
  
  console.log(`${bayPrefix} EXACT POSITIONING (${operationDesc}): Calculating date from pixel position ${pixelPosition}`);
  
  // Calculate days from start based on pixel position
  const daysFromStart = ((pixelPosition - pixelOffset) / slotWidth) * daysBetweenSlots;
  const msPerDay = 24 * 60 * 60 * 1000;
  const msFromStart = daysFromStart * msPerDay;
  
  // Use reference date for relative calculation if provided
  if (referenceDate) {
    const newDate = new Date(referenceDate.getTime() + msFromStart);
    const dateStr = format(newDate, 'yyyy-MM-dd');
    
    console.log(`${bayPrefix} EXACT POSITIONING (${operationDesc}): Date from reference calculation:`, dateStr);
    return {
      date: newDate,
      exactDateStr: dateStr,
      source: 'pixel-calculation'
    };
  }
  
  // If no reference date but we have slots, use first slot as reference
  if (slots.length > 0 && slots[0].date) {
    const firstVisibleDate = new Date(slots[0].date);
    const newDate = new Date(firstVisibleDate.getTime() + msFromStart);
    const dateStr = format(newDate, 'yyyy-MM-dd');
    
    console.log(`${bayPrefix} EXACT POSITIONING (${operationDesc}): Date from first slot calculation:`, dateStr);
    return {
      date: newDate,
      exactDateStr: dateStr,
      source: 'pixel-calculation'
    };
  }
  
  console.error(`${bayPrefix} EXACT POSITIONING: Failed to calculate date from pixel position`);
  return null;
}

/**
 * Calculate a new end date based on resizing from the right
 */
export function calculateEndDateFromResize(
  exactRightPx: number,
  options: {
    slotWidth: number;
    daysBetweenSlots: number;
    slots: { date: Date }[];
    initialPositionLeft: number;
    initialWidth: number;
    initialEndDate: Date;
    bayId: number;
  }
): DateResult | null {
  const { 
    slotWidth, 
    daysBetweenSlots, 
    slots,
    initialPositionLeft,
    initialWidth, 
    initialEndDate,
    bayId
  } = options;
  
  // For logging
  const bayPrefix = `BAY ${bayId}`;
  
  // First attempt: direct pixel-to-date conversion from slots
  const result = calculateDateFromPixelPosition(exactRightPx, {
    slotWidth,
    daysBetweenSlots,
    slots,
    bayId,
    operation: 'right-resize'
  });
  
  if (result) {
    // Set to end of day for end date
    result.date.setHours(23, 59, 59);
    return result;
  }
  
  // Fallback calculation using delta from initial position
  const pixelsDelta = exactRightPx - (initialPositionLeft + initialWidth);
  const pixelsPerDay = slotWidth / daysBetweenSlots;
  const daysDelta = pixelsDelta / pixelsPerDay; // Don't round - use exact value
  const newEndDate = addDays(initialEndDate, daysDelta);
  
  // Set to end of day for end date
  newEndDate.setHours(23, 59, 59);
  
  const dateStr = format(newEndDate, 'yyyy-MM-dd');
  console.log(`${bayPrefix} EXACT POSITIONING (RIGHT RESIZE): Using delta calculation fallback:`, dateStr);
  
  return {
    date: newEndDate,
    exactDateStr: dateStr,
    source: 'pixel-calculation'
  };
}

/**
 * Calculate a new start date based on resizing from the left
 */
export function calculateStartDateFromResize(
  exactLeftPx: number,
  options: {
    slotWidth: number;
    daysBetweenSlots: number;
    slots: { date: Date }[];
    initialPositionLeft: number;
    initialStartDate: Date;
    bayId: number;
  }
): DateResult | null {
  const { 
    slotWidth, 
    daysBetweenSlots, 
    slots,
    initialPositionLeft,
    initialStartDate,
    bayId
  } = options;
  
  // For logging
  const bayPrefix = `BAY ${bayId}`;
  
  // First attempt: direct pixel-to-date conversion from slots
  const result = calculateDateFromPixelPosition(exactLeftPx, {
    slotWidth,
    daysBetweenSlots,
    slots,
    bayId,
    operation: 'left-resize'
  });
  
  if (result) {
    return result;
  }
  
  // Fallback calculation using delta from initial position
  const pixelsDelta = exactLeftPx - initialPositionLeft;
  const pixelsPerDay = slotWidth / daysBetweenSlots;
  const daysDelta = pixelsDelta / pixelsPerDay; // Don't round - use exact value
  const newStartDate = addDays(initialStartDate, daysDelta);
  
  const dateStr = format(newStartDate, 'yyyy-MM-dd');
  console.log(`${bayPrefix} EXACT POSITIONING (LEFT RESIZE): Using delta calculation fallback:`, dateStr);
  
  return {
    date: newStartDate,
    exactDateStr: dateStr,
    source: 'pixel-calculation'
  };
}

/**
 * Capture and store exact date information during drag operations
 */
export function storeExactDateInfo(date: string): void {
  // Store in global variable for use during drop
  (window as any).lastExactDate = date;
  
  // Also store in document body for redundancy
  document.body.setAttribute('data-current-drag-date', date);
  
  console.log('✅ EXACT POSITIONING: Stored date info:', date);
}

/**
 * Clear stored exact date information
 */
export function clearExactDateInfo(): void {
  (window as any).lastExactDate = null;
  document.body.removeAttribute('data-current-drag-date');
  
  console.log('🧹 EXACT POSITIONING: Cleared stored date info');
}