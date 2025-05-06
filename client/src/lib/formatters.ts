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