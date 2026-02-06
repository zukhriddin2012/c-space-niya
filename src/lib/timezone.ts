// SEC-024: Standardize timezone handling
// All C-Space branches are in Tashkent, Uzbekistan (UTC+5)

const TASHKENT_TZ = 'Asia/Tashkent';

/**
 * Get current time in Tashkent timezone
 */
export function getTashkentTime(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: TASHKENT_TZ }));
}

/**
 * Get ISO string in Tashkent timezone (for SQL queries)
 */
export function toTashkentISO(): string {
  return new Date().toLocaleString('sv-SE', { timeZone: TASHKENT_TZ });
}

/**
 * Get current date string in YYYY-MM-DD format (Tashkent timezone)
 */
export function getTashkentDateString(): string {
  return getTashkentTime().toISOString().split('T')[0];
}

/**
 * Get current hour in Tashkent timezone (0-23)
 */
export function getTashkentHour(): number {
  return getTashkentTime().getHours();
}

/**
 * Get current time as HH:MM:SS string in Tashkent timezone
 */
export function getTashkentTimeString(): string {
  const t = getTashkentTime();
  return `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}:${String(t.getSeconds()).padStart(2, '0')}`;
}
