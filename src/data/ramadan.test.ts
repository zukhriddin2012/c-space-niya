/**
 * CSN-174: Ramadan data layer unit tests
 * Tests timetable integrity, helper functions, timezone handling, and edge cases.
 */
import { describe, it, expect } from 'vitest';
import {
  RAMADAN_2026_TIMETABLE,
  RAMADAN_START,
  RAMADAN_END,
  getRamadanDay,
  isRamadanPeriod,
  getRamadanProgress,
  type RamadanDay,
} from '@/data/ramadan';

describe('Ramadan data layer (CSN-174)', () => {
  // ─── Timetable integrity ─────────────────────────────────────────────

  describe('RAMADAN_2026_TIMETABLE', () => {
    it('should have exactly 30 entries', () => {
      expect(RAMADAN_2026_TIMETABLE).toHaveLength(30);
    });

    it('should have sequential day numbers from 1 to 30', () => {
      const days = RAMADAN_2026_TIMETABLE.map(d => d.day);
      expect(days).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
    });

    it('should have sequential dates from Feb 19 to Mar 20', () => {
      const firstDate = RAMADAN_2026_TIMETABLE[0].date;
      const lastDate = RAMADAN_2026_TIMETABLE[29].date;
      expect(firstDate).toBe('2026-02-19');
      expect(lastDate).toBe('2026-03-20');
    });

    it('should have consecutive dates with no gaps', () => {
      for (let i = 1; i < RAMADAN_2026_TIMETABLE.length; i++) {
        const prev = new Date(RAMADAN_2026_TIMETABLE[i - 1].date);
        const curr = new Date(RAMADAN_2026_TIMETABLE[i].date);
        const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
        expect(diffDays).toBe(1);
      }
    });

    it('should have valid time formats (HH:MM) for all suhur/iftar', () => {
      const timeRegex = /^\d{2}:\d{2}$/;
      for (const day of RAMADAN_2026_TIMETABLE) {
        expect(day.suhur).toMatch(timeRegex);
        expect(day.iftar).toMatch(timeRegex);
      }
    });

    it('should have suhur before iftar for every day', () => {
      for (const day of RAMADAN_2026_TIMETABLE) {
        expect(day.suhur < day.iftar).toBe(true);
      }
    });

    it('should have suhur times getting earlier over the month', () => {
      const first = RAMADAN_2026_TIMETABLE[0].suhur;
      const last = RAMADAN_2026_TIMETABLE[29].suhur;
      expect(first > last).toBe(true); // 05:54 > 05:08
    });

    it('should have iftar times getting later over the month', () => {
      const first = RAMADAN_2026_TIMETABLE[0].iftar;
      const last = RAMADAN_2026_TIMETABLE[29].iftar;
      expect(first < last).toBe(true); // 18:05 < 18:39
    });

    it('should match RAMADAN_START and RAMADAN_END constants', () => {
      expect(RAMADAN_START).toBe(RAMADAN_2026_TIMETABLE[0].date);
      expect(RAMADAN_END).toBe(RAMADAN_2026_TIMETABLE[29].date);
    });

    it('should have correct Day 1 data matching PRD', () => {
      const day1 = RAMADAN_2026_TIMETABLE[0];
      expect(day1).toEqual({
        day: 1,
        date: '2026-02-19',
        suhur: '05:54',
        iftar: '18:05',
      });
    });

    it('should have correct Day 30 data matching PRD', () => {
      const day30 = RAMADAN_2026_TIMETABLE[29];
      expect(day30).toEqual({
        day: 30,
        date: '2026-03-20',
        suhur: '05:08',
        iftar: '18:39',
      });
    });
  });

  // ─── getRamadanDay() ──────────────────────────────────────────────────

  describe('getRamadanDay', () => {
    it('should return Day 1 for Feb 19, 2026', () => {
      // Create a date that, in Asia/Tashkent, is 2026-02-19
      const date = new Date('2026-02-19T12:00:00+05:00');
      const result = getRamadanDay(date);
      expect(result).not.toBeNull();
      expect(result!.day).toBe(1);
      expect(result!.suhur).toBe('05:54');
      expect(result!.iftar).toBe('18:05');
    });

    it('should return Day 15 for Mar 5, 2026', () => {
      const date = new Date('2026-03-05T12:00:00+05:00');
      const result = getRamadanDay(date);
      expect(result).not.toBeNull();
      expect(result!.day).toBe(15);
    });

    it('should return Day 30 for Mar 20, 2026', () => {
      const date = new Date('2026-03-20T12:00:00+05:00');
      const result = getRamadanDay(date);
      expect(result).not.toBeNull();
      expect(result!.day).toBe(30);
    });

    it('should return null before Ramadan (Feb 18, 2026)', () => {
      const date = new Date('2026-02-18T12:00:00+05:00');
      expect(getRamadanDay(date)).toBeNull();
    });

    it('should return null after Ramadan (Mar 21, 2026)', () => {
      const date = new Date('2026-03-21T12:00:00+05:00');
      expect(getRamadanDay(date)).toBeNull();
    });

    it('should return null for a date far outside Ramadan', () => {
      const date = new Date('2026-07-15T12:00:00+05:00');
      expect(getRamadanDay(date)).toBeNull();
    });

    it('should handle timezone edge case: UTC midnight Feb 19 is still Feb 18 in some zones', () => {
      // At UTC midnight Feb 19, in Tashkent it's 05:00 Feb 19 — should be Day 1
      const date = new Date('2026-02-19T00:00:00Z');
      const result = getRamadanDay(date);
      expect(result).not.toBeNull();
      expect(result!.day).toBe(1);
    });

    it('should handle timezone edge case: late UTC Mar 20 is Mar 21 in Tashkent', () => {
      // At UTC 20:00 Mar 20, in Tashkent it's 01:00 Mar 21 — should be null
      const date = new Date('2026-03-20T20:00:00Z');
      const result = getRamadanDay(date);
      expect(result).toBeNull();
    });

    it('should return valid RamadanDay shape', () => {
      const date = new Date('2026-02-25T12:00:00+05:00');
      const result = getRamadanDay(date);
      expect(result).toHaveProperty('day');
      expect(result).toHaveProperty('date');
      expect(result).toHaveProperty('suhur');
      expect(result).toHaveProperty('iftar');
      expect(typeof result!.day).toBe('number');
      expect(typeof result!.date).toBe('string');
      expect(typeof result!.suhur).toBe('string');
      expect(typeof result!.iftar).toBe('string');
    });
  });

  // ─── isRamadanPeriod() ────────────────────────────────────────────────

  describe('isRamadanPeriod', () => {
    it('should return true during Ramadan', () => {
      const date = new Date('2026-03-01T12:00:00+05:00');
      expect(isRamadanPeriod(date)).toBe(true);
    });

    it('should return false before Ramadan', () => {
      const date = new Date('2026-02-18T12:00:00+05:00');
      expect(isRamadanPeriod(date)).toBe(false);
    });

    it('should return false after Ramadan', () => {
      const date = new Date('2026-03-21T12:00:00+05:00');
      expect(isRamadanPeriod(date)).toBe(false);
    });

    it('should return true on first day', () => {
      const date = new Date('2026-02-19T12:00:00+05:00');
      expect(isRamadanPeriod(date)).toBe(true);
    });

    it('should return true on last day', () => {
      const date = new Date('2026-03-20T12:00:00+05:00');
      expect(isRamadanPeriod(date)).toBe(true);
    });
  });

  // ─── getRamadanProgress() ─────────────────────────────────────────────

  describe('getRamadanProgress', () => {
    it('should return { current: 1, total: 30 } on Day 1', () => {
      const date = new Date('2026-02-19T12:00:00+05:00');
      expect(getRamadanProgress(date)).toEqual({ current: 1, total: 30 });
    });

    it('should return { current: 30, total: 30 } on Day 30', () => {
      const date = new Date('2026-03-20T12:00:00+05:00');
      expect(getRamadanProgress(date)).toEqual({ current: 30, total: 30 });
    });

    it('should return null outside Ramadan', () => {
      const date = new Date('2026-01-01T12:00:00+05:00');
      expect(getRamadanProgress(date)).toBeNull();
    });

    it('should have total always equal 30', () => {
      const date = new Date('2026-03-10T12:00:00+05:00');
      const progress = getRamadanProgress(date);
      expect(progress).not.toBeNull();
      expect(progress!.total).toBe(30);
    });
  });
});
