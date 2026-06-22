/**
 * AI Legal Mobile - Data Formatters
 * Localized layout helper functions.
 */

/**
 * Format timestamp or ISO string to local date format.
 * E.g., '2026-06-18' -> 'Jun 18, 2026'
 */
export function formatDate(date: string | number | Date, options?: Intl.DateTimeFormatOptions): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  };

  return d.toLocaleDateString('en-US', defaultOptions);
}

/**
 * Format currency amount (e.g. 5000 -> '$5,000.00' or '₹5,000.00' depending on currency code).
 */
export function formatCurrency(amount: number, currency = 'USD', locale = 'en-US'): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(amount);
  } catch (e) {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/**
 * Convert bytes to readable strings.
 * E.g. 1048576 -> '1.00 MB'
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
