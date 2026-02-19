export interface RamadanDay {
  day: number;
  date: string;
  suhur: string;
  iftar: string;
}

export const RAMADAN_START = '2026-02-19';
export const RAMADAN_END = '2026-03-20';

export const RAMADAN_2026_TIMETABLE: RamadanDay[] = [
  { day: 1,  date: '2026-02-19', suhur: '05:54', iftar: '18:05' },
  { day: 2,  date: '2026-02-20', suhur: '05:53', iftar: '18:07' },
  { day: 3,  date: '2026-02-21', suhur: '05:51', iftar: '18:08' },
  { day: 4,  date: '2026-02-22', suhur: '05:50', iftar: '18:09' },
  { day: 5,  date: '2026-02-23', suhur: '05:49', iftar: '18:10' },
  { day: 6,  date: '2026-02-24', suhur: '05:47', iftar: '18:11' },
  { day: 7,  date: '2026-02-25', suhur: '05:46', iftar: '18:13' },
  { day: 8,  date: '2026-02-26', suhur: '05:44', iftar: '18:14' },
  { day: 9,  date: '2026-02-27', suhur: '05:43', iftar: '18:15' },
  { day: 10, date: '2026-02-28', suhur: '05:41', iftar: '18:16' },
  { day: 11, date: '2026-03-01', suhur: '05:40', iftar: '18:17' },
  { day: 12, date: '2026-03-02', suhur: '05:38', iftar: '18:19' },
  { day: 13, date: '2026-03-03', suhur: '05:37', iftar: '18:20' },
  { day: 14, date: '2026-03-04', suhur: '05:35', iftar: '18:21' },
  { day: 15, date: '2026-03-05', suhur: '05:34', iftar: '18:22' },
  { day: 16, date: '2026-03-06', suhur: '05:32', iftar: '18:23' },
  { day: 17, date: '2026-03-07', suhur: '05:31', iftar: '18:24' },
  { day: 18, date: '2026-03-08', suhur: '05:29', iftar: '18:25' },
  { day: 19, date: '2026-03-09', suhur: '05:27', iftar: '18:27' },
  { day: 20, date: '2026-03-10', suhur: '05:26', iftar: '18:28' },
  { day: 21, date: '2026-03-11', suhur: '05:24', iftar: '18:29' },
  { day: 22, date: '2026-03-12', suhur: '05:22', iftar: '18:30' },
  { day: 23, date: '2026-03-13', suhur: '05:21', iftar: '18:31' },
  { day: 24, date: '2026-03-14', suhur: '05:19', iftar: '18:32' },
  { day: 25, date: '2026-03-15', suhur: '05:17', iftar: '18:33' },
  { day: 26, date: '2026-03-16', suhur: '05:15', iftar: '18:34' },
  { day: 27, date: '2026-03-17', suhur: '05:14', iftar: '18:35' },
  { day: 28, date: '2026-03-18', suhur: '05:12', iftar: '18:37' },
  { day: 29, date: '2026-03-19', suhur: '05:10', iftar: '18:38' },
  { day: 30, date: '2026-03-20', suhur: '05:08', iftar: '18:39' },
];

/**
 * Get today's Ramadan info. Returns null if outside Ramadan period.
 * Uses Asia/Tashkent timezone for consistent date matching on both
 * client (browser in Tashkent) and server (Vercel UTC).
 */
export function getRamadanDay(date?: Date): RamadanDay | null {
  const d = date ?? new Date();
  const iso = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });
  return RAMADAN_2026_TIMETABLE.find(day => day.date === iso) ?? null;
}

export function isRamadanPeriod(date?: Date): boolean {
  return getRamadanDay(date) !== null;
}

export function getRamadanProgress(date?: Date): { current: number; total: number } | null {
  const day = getRamadanDay(date);
  if (!day) return null;
  return { current: day.day, total: 30 };
}
