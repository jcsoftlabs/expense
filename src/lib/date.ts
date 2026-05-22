/**
 * Safely parses a date string or Date object and returns a Date in local time,
 * completely avoiding any UTC timezone-offset shift issues (such as May 25th displaying as May 24th).
 */
export function parseLocalDate(dateInput: string | Date | null | undefined): Date {
  if (!dateInput) return new Date();
  
  if (dateInput instanceof Date) {
    return dateInput;
  }
  
  // If dateInput is a string like "2026-05-25T00:00:00.000Z" or just "2026-05-25"
  const dateString = typeof dateInput === 'string' ? dateInput : String(dateInput);
  
  // Extract only the YYYY-MM-DD part
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);
    
    // Construct local Date (month is 0-indexed)
    return new Date(year, month - 1, day);
  }
  
  // Fallback to standard parser
  const parsed = new Date(dateString);
  if (isNaN(parsed.getTime())) {
    return new Date();
  }
  return parsed;
}

/**
 * Elegantly formats a date in French, ignoring any timezone shift.
 */
export function formatLocalDate(dateInput: string | Date | null | undefined, options?: Intl.DateTimeFormatOptions): string {
  const localDate = parseLocalDate(dateInput);
  return localDate.toLocaleDateString('fr-FR', options || { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Standard French formatting (e.g. "25/05/2026"), ignoring timezone shifts.
 */
export function formatLocalDateCompact(dateInput: string | Date | null | undefined): string {
  const localDate = parseLocalDate(dateInput);
  return localDate.toLocaleDateString('fr-FR');
}
