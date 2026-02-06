/**
 * SEC-024: Timezone standardization tests
 * Tests for Tashkent (UTC+5) timezone utilities
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getTashkentTime,
  toTashkentISO,
  getTashkentDateString,
  getTashkentHour,
  getTashkentTimeString,
} from '@/lib/timezone';

describe('Timezone utilities (SEC-024)', () => {
  describe('getTashkentTime', () => {
    it('should return a valid Date object', () => {
      const result = getTashkentTime();
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).not.toBeNaN();
    });

    it('should return a time offset from UTC by approximately +5 hours', () => {
      const utcNow = new Date();
      const tashkentNow = getTashkentTime();

      // The Tashkent time's getHours() should be ~5 hours ahead of UTC's getUTCHours()
      // We need to handle the day boundary carefully
      const utcHour = utcNow.getUTCHours();
      const tashkentHour = tashkentNow.getHours();
      const diff = ((tashkentHour - utcHour) + 24) % 24;
      expect(diff).toBe(5);
    });

    it('should consistently return the same timezone', () => {
      const t1 = getTashkentTime();
      const t2 = getTashkentTime();
      // Should be within a few seconds of each other
      expect(Math.abs(t1.getTime() - t2.getTime())).toBeLessThan(1000);
    });
  });

  describe('toTashkentISO', () => {
    it('should return a string in YYYY-MM-DD HH:MM:SS format', () => {
      const result = toTashkentISO();
      // sv-SE locale produces: YYYY-MM-DD HH:MM:SS
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/);
    });

    it('should have a valid date part', () => {
      const result = toTashkentISO();
      const datePart = result.split(' ')[0];
      const [year, month, day] = datePart.split('-').map(Number);
      expect(year).toBeGreaterThanOrEqual(2025);
      expect(month).toBeGreaterThanOrEqual(1);
      expect(month).toBeLessThanOrEqual(12);
      expect(day).toBeGreaterThanOrEqual(1);
      expect(day).toBeLessThanOrEqual(31);
    });
  });

  describe('getTashkentDateString', () => {
    it('should return a string in YYYY-MM-DD format', () => {
      const result = getTashkentDateString();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return a parseable date', () => {
      const result = getTashkentDateString();
      const parsed = new Date(result);
      expect(parsed.getTime()).not.toBeNaN();
    });
  });

  describe('getTashkentHour', () => {
    it('should return a number between 0 and 23', () => {
      const hour = getTashkentHour();
      expect(hour).toBeGreaterThanOrEqual(0);
      expect(hour).toBeLessThanOrEqual(23);
      expect(Number.isInteger(hour)).toBe(true);
    });

    it('should be UTC+5', () => {
      const utcHour = new Date().getUTCHours();
      const tashkentHour = getTashkentHour();
      const diff = ((tashkentHour - utcHour) + 24) % 24;
      expect(diff).toBe(5);
    });
  });

  describe('getTashkentTimeString', () => {
    it('should return HH:MM:SS format', () => {
      const result = getTashkentTimeString();
      expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });

    it('should have valid time components', () => {
      const result = getTashkentTimeString();
      const [hours, minutes, seconds] = result.split(':').map(Number);
      expect(hours).toBeGreaterThanOrEqual(0);
      expect(hours).toBeLessThanOrEqual(23);
      expect(minutes).toBeGreaterThanOrEqual(0);
      expect(minutes).toBeLessThanOrEqual(59);
      expect(seconds).toBeGreaterThanOrEqual(0);
      expect(seconds).toBeLessThanOrEqual(59);
    });

    it('should zero-pad single digit values', () => {
      const result = getTashkentTimeString();
      const parts = result.split(':');
      for (const part of parts) {
        expect(part.length).toBe(2);
      }
    });
  });
});
