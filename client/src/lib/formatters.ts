/**
 * Formats a number as currency
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "N/A";
  
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(value);
}

/**
 * Formats a date string to a user-friendly format
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "N/A";
  
  // If the date string is in YYYY-MM-DD format, parse it as local time to avoid timezone shifts
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
  
  // For other date formats, use the original logic
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Formats a percentage value
 */
export function formatPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined) return "N/A";
  
  return `${value}%`;
}