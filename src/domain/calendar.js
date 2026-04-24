// src/domain/calendar.js
// 工作日历纯函数

/**
 * @param {string} dateStr  - 'YYYY-MM-DD'
 * @returns {boolean}
 */
export function isWeekend(dateStr) {
  const [y, m, day] = dateStr.split('-').map(Number);
  const d = new Date(y, m - 1, day);
  const dayOfWeek = d.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
}

/**
 * @param {string} dateStr
 * @param {string[]} holidays  - ['YYYY-MM-DD', ...]
 * @returns {boolean}
 */
export function isHoliday(dateStr, holidays = []) {
  return holidays.includes(dateStr);
}

/**
 * @param {string} dateStr
 * @param {string[]} holidays
 * @returns {boolean}
 */
export function isWorkDay(dateStr, holidays = []) {
  return !isWeekend(dateStr) && !isHoliday(dateStr, holidays);
}

/**
 * @param {string} dateStr  - 'YYYY-MM-DD'
 * @param {number} n
 * @param {string[]} holidays
 * @returns {string}  'YYYY-MM-DD'
 */
export function addWorkDays(dateStr, n, holidays = []) {
  if (n < 0) throw new Error('n must be non-negative');
  if (n === 0) return dateStr;

  const toLocal = (ds) => {
    const [y, m, day] = ds.split('-').map(Number);
    return new Date(y, m - 1, day);
  };
  const toIso = (d) => {
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
 * 将 'YYYY-MM-DD' 转 'YYYY-MM-DD' 字符串（纯校验/解析）
 * @param {string|Date} input
 * @returns {string|null}
 */
export function parseDate(input) {
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
 * 计算两个日期之间的自然天数（含首尾）
 * @param {string} start  - 'YYYY-MM-DD'
 * @param {string} end
 * @returns {number}
 */
export function naturalDays(start, end) {
  const [y1, m1, d1] = start.split('-').map(Number);
  const [y2, m2, d2] = end.split('-').map(Number);
  const s = new Date(y1, m1 - 1, d1);
  const e = new Date(y2, m2 - 1, d2);
  return Math.round((e - s) / 86400000) + 1;
}

/**
 * 从 durationDays 和 startDate 反推 endDate（跳过非工作日）
 * @param {string} startDate
 * @param {number} durationDays
 * @param {string[]} holidays
 * @returns {string}
 */
export function calcEndDate(startDate, durationDays, holidays = []) {
  if (durationDays <= 0) return startDate;
  // endDate = addWorkDays(startDate, durationDays - 1)
  return addWorkDays(startDate, durationDays - 1, holidays);
}
