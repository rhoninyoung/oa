// packages/shared/src/calendar.ts
// 工作日历纯函数

/**
 * @param dateStr - 'YYYY-MM-DD'
 * @returns true if weekend (Sat/Sun)
 */
export function isWeekend(dateStr: string): boolean {
  const [y, m, day] = dateStr.split('-').map(Number);
  const d = new Date(y, m - 1, day);
  const dayOfWeek = d.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
}

/**
 * @param dateStr - 'YYYY-MM-DD'
 * @param holidays - Array of holiday dates
 * @returns true if holiday
 */
export function isHoliday(dateStr: string, holidays: string[] = []): boolean {
  return holidays.includes(dateStr);
}

/**
 * @param dateStr - 'YYYY-MM-DD'
 * @param holidays - Array of holiday dates
 * @returns true if workday (not weekend, not holiday)
 */
export function isWorkDay(dateStr: string, holidays: string[] = []): boolean {
  return !isWeekend(dateStr) && !isHoliday(dateStr, holidays);
}

/**
 * Add n work days to a date, skipping weekends and holidays
 * @param dateStr - 'YYYY-MM-DD'
 * @param n - Number of work days to add
 * @param holidays - Array of holiday dates
 * @returns 'YYYY-MM-DD'
 */
export function addWorkDays(dateStr: string, n: number, holidays: string[] = []): string {
  if (n < 0) throw new Error('n must be non-negative');
  if (n === 0) return dateStr;

  const toLocal = (ds: string) => {
    const [y, m, day] = ds.split('-').map(Number);
    return new Date(y, m - 1, day);
  };
  const toIso = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  let current = toLocal(dateStr);
  let remaining = n;
  while (remaining > 0) {
    current = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1);
    if (isWorkDay(toIso(current), holidays)) {
      remaining--;
    }
  }
  return toIso(current);
}

/**
 * Parse date input to 'YYYY-MM-DD' string
 * @param input - string or Date
 * @returns 'YYYY-MM-DD' or null if invalid
 */
export function parseDate(input: string | Date | null | undefined): string | null {
  if (!input) return null;
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y, m, day] = input.split('-').map(Number);
    const d = new Date(y, m - 1, day);
    if (!isNaN(d.getTime())) return input;
  }
  if (input instanceof Date) {
    const y = input.getFullYear();
    const m = String(input.getMonth() + 1).padStart(2, '0');
    const day = String(input.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return null;
}

/**
 * Calculate natural days between two dates (inclusive)
 * @param start - 'YYYY-MM-DD'
 * @param end - 'YYYY-MM-DD'
 * @returns number of calendar days
 */
export function naturalDays(start: string, end: string): number {
  const [y1, m1, d1] = start.split('-').map(Number);
  const [y2, m2, d2] = end.split('-').map(Number);
  const s = new Date(y1, m1 - 1, d1);
  const e = new Date(y2, m2 - 1, d2);
  return Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
}

/**
 * Calculate end date from startDate and durationDays, skipping non-workdays
 * @param startDate - 'YYYY-MM-DD'
 * @param durationDays - Number of work days
 * @param holidays - Array of holiday dates
 * @returns 'YYYY-MM-DD'
 */
export function calcEndDate(startDate: string, durationDays: number, holidays: string[] = []): string {
  if (durationDays <= 0) return startDate;
  return addWorkDays(startDate, durationDays - 1, holidays);
}
