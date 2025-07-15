/**
 * Safe array filtering utilities with comprehensive logging
 */

// Enable debug logging
const DEBUG_FILTERS = true;

/**
 * Safely filter an array with type checking and logging
 * @param data - The data to filter (might not be an array)
 * @param filterFn - The filter function
 * @param context - Context string for debugging
 * @returns Filtered array or empty array if data is invalid
 */
export function safeFilter<T>(
  data: any,
  filterFn: (item: T, index: number, array: T[]) => boolean,
  context: string = 'Unknown'
): T[] {
  // Log the operation
  if (DEBUG_FILTERS) {
    console.log(`[FILTER DEBUG] ${context}:`, {
      dataType: typeof data,
      isArray: Array.isArray(data),
      dataLength: Array.isArray(data) ? data.length : 'N/A',
      data: data
    });
  }

  // Handle null/undefined
  if (data === null || data === undefined) {
    console.warn(`[FILTER WARNING] ${context}: Data is null/undefined`);
    return [];
  }

  // Handle non-arrays
  if (!Array.isArray(data)) {
    console.error(`[FILTER ERROR] ${context}: Data is not an array`, {
      actualType: typeof data,
      data: data
    });
    
    // Try to convert common types to arrays
    if (typeof data === 'object' && data !== null) {
      // Check if it's an object with array-like properties
      if ('length' in data) {
        try {
          const arrayData = Array.from(data);
          console.log(`[FILTER RECOVERY] ${context}: Converted array-like object to array`);
          return arrayData.filter(filterFn);
        } catch (e) {
          console.error(`[FILTER ERROR] ${context}: Failed to convert array-like object`, e);
        }
      }
      
      // Check if it's an object that should be wrapped in an array
      if (Object.keys(data).length > 0) {
        console.log(`[FILTER RECOVERY] ${context}: Wrapping object in array`);
        return [data].filter(filterFn as any);
      }
    }
    
    return [];
  }

  // Safe filter with error handling
  try {
    const result = data.filter(filterFn);
    if (DEBUG_FILTERS && result.length !== data.length) {
      console.log(`[FILTER RESULT] ${context}: Filtered ${data.length} items to ${result.length}`);
    }
    return result;
  } catch (error) {
    console.error(`[FILTER ERROR] ${context}: Filter function threw error`, error);
    return [];
  }
}

/**
 * Safely map an array with type checking
 * @param data - The data to map (might not be an array)
 * @param mapFn - The map function
 * @param context - Context string for debugging
 * @returns Mapped array or empty array if data is invalid
 */
export function safeMap<T, R>(
  data: any,
  mapFn: (item: T, index: number, array: T[]) => R,
  context: string = 'Unknown'
): R[] {
  if (!Array.isArray(data)) {
    if (DEBUG_FILTERS) {
      console.warn(`[MAP WARNING] ${context}: Data is not an array, returning empty array`);
    }
    return [];
  }
  
  try {
    return data.map(mapFn);
  } catch (error) {
    console.error(`[MAP ERROR] ${context}: Map function threw error`, error);
    return [];
  }
}

/**
 * Ensure data is an array
 * @param data - The data that should be an array
 * @param defaultValue - Default value if data is not an array
 * @param context - Context string for debugging
 * @returns Array or default value
 */
export function ensureArray<T>(
  data: any,
  defaultValue: T[] = [],
  context: string = 'Unknown'
): T[] {
  if (Array.isArray(data)) {
    return data;
  }
  
  if (DEBUG_FILTERS) {
    console.warn(`[ARRAY CHECK] ${context}: Data is not an array, using default`, {
      dataType: typeof data,
      data: data,
      defaultValue: defaultValue
    });
  }
  
  return defaultValue;
}

/**
 * Safe array length check
 * @param data - The data to check
 * @param context - Context string for debugging
 * @returns Length or 0 if not an array
 */
export function safeLength(data: any, context: string = 'Unknown'): number {
  if (Array.isArray(data)) {
    return data.length;
  }
  
  if (DEBUG_FILTERS) {
    console.warn(`[LENGTH CHECK] ${context}: Data is not an array, returning 0`);
  }
  
  return 0;
}

/**
 * Ultra-safe filter with maximum defensive programming
 * Uses optional chaining and nullish coalescing for absolute safety
 * @param data - The data to filter (might be anything)
 * @param filterFn - The filter function
 * @param context - Context string for debugging
 * @returns Filtered array or empty array
 */
export function ultraSafeFilter<T>(
  data: any,
  filterFn: (item: T, index: number, array: T[]) => boolean,
  context: string = 'Unknown'
): T[] {
  try {
    // Use optional chaining and nullish coalescing for maximum safety
    const result = (data ?? [])?.filter?.(filterFn) ?? [];
    
    // Verify result is actually an array
    if (Array.isArray(result)) {
      return result;
    }
    
    console.warn(`[ULTRA FILTER WARNING] ${context}: Filter result was not an array`);
    return [];
  } catch (error) {
    console.error(`[ULTRA FILTER ERROR] ${context}: Caught error in ultra-safe filter`, error);
    return [];
  }
}

/**
 * Belt-and-suspenders filter that combines all safety techniques
 * @param data - The data to filter
 * @param filterFn - The filter function
 * @param context - Context string for debugging
 * @returns Filtered array with absolute safety guarantees
 */
export function beltAndSuspendersFilter<T>(
  data: any,
  filterFn: (item: T, index: number, array: T[]) => boolean,
  context: string = 'Unknown'
): T[] {
  // Layer 1: Null/undefined check
  if (data == null) {
    if (DEBUG_FILTERS) {
      console.log(`[B&S FILTER] ${context}: Data is null/undefined, returning []`);
    }
    return [];
  }
  
  // Layer 2: Check if filter method exists
  if (typeof data?.filter !== 'function') {
    if (DEBUG_FILTERS) {
      console.log(`[B&S FILTER] ${context}: No filter method found, returning []`);
    }
    return [];
  }
  
  // Layer 3: Array.isArray check
  if (!Array.isArray(data)) {
    if (DEBUG_FILTERS) {
      console.log(`[B&S FILTER] ${context}: Not an array, returning []`);
    }
    return [];
  }
  
  // Layer 4: Validate filter function
  if (typeof filterFn !== 'function') {
    if (DEBUG_FILTERS) {
      console.log(`[B&S FILTER] ${context}: Invalid filter function, returning original array`);
    }
    return data;
  }
  
  // Layer 5: Try-catch with optional chaining
  try {
    const result = data?.filter?.(filterFn) ?? [];
    
    // Layer 6: Verify result is an array
    if (!Array.isArray(result)) {
      console.error(`[B&S FILTER] ${context}: Filter did not return an array`);
      return [];
    }
    
    return result;
  } catch (error) {
    console.error(`[B&S FILTER] ${context}: Exception during filter`, error);
    return [];
  }
}