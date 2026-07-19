/**
 * Utility functions for date manipulation and formatting
 */

export function getTodayDateString(): string {
  const d = new Date();
  return formatDateString(d);
}

export function getYesterdayDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatDateString(d);
}

export function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getStartAndEndOfWeek(dateStr?: string): { start: string; end: string } {
  const date = dateStr ? new Date(dateStr) : new Date();
  const day = date.getDay(); // 0 is Sunday, 1 is Monday, etc.
  
  const start = new Date(date);
  start.setDate(date.getDate() - day); // Go back to Sunday
  
  const end = new Date(start);
  end.setDate(start.getDate() + 6); // Go forward to Saturday
  
  return {
    start: formatDateString(start),
    end: formatDateString(end)
  };
}

export function getStartAndEndOfMonth(dateStr?: string): { start: string; end: string } {
  const date = dateStr ? new Date(dateStr) : new Date();
  const year = date.getFullYear();
  const month = date.getMonth();
  
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0); // Last day of month
  
  return {
    start: formatDateString(start),
    end: formatDateString(end)
  };
}

export function getStartAndEndOfYear(dateStr?: string): { start: string; end: string } {
  const date = dateStr ? new Date(dateStr) : new Date();
  const year = date.getFullYear();
  
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  
  return {
    start: formatDateString(start),
    end: formatDateString(end)
  };
}

export function getMonthName(monthIndex: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthIndex];
}

export function formatToReadableDate(dateStr: string): string {
  const today = getTodayDateString();
  const yesterday = getYesterdayDateString();
  
  // Extract just the YYYY-MM-DD part if a full ISO string was passed
  const cleanDateStr = dateStr.substring(0, 10);
  
  if (cleanDateStr === today) {
    return 'Today';
  } else if (cleanDateStr === yesterday) {
    return 'Yesterday';
  }
  
  const date = new Date(cleanDateStr);
  const day = date.getDate();
  const month = date.toLocaleString('default', { month: 'short' });
  const year = date.getFullYear();
  
  return `${day} ${month} ${year}`;
}

export function formatToReadableTime(isoString: string): string {
  const date = new Date(isoString);
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  return `${hours}:${minutes} ${ampm}`;
}

export function getPreviousMonthDateRange(dateStr: string): { start: string; end: string } {
  const date = new Date(dateStr);
  date.setDate(1); // Set to 1st of current month
  date.setMonth(date.getMonth() - 1); // Subtract 1 month
  return getStartAndEndOfMonth(formatDateString(date));
}

export function getPreviousWeekDateRange(dateStr: string): { start: string; end: string } {
  const date = new Date(dateStr);
  date.setDate(date.getDate() - 7); // Subtract 1 week
  return getStartAndEndOfWeek(formatDateString(date));
}
