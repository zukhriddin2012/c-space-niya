/**
 * SEC-015: Rate limiter tests
 * Tests for in-memory sliding window rate limiting
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { rateLimit, loginRateLimit, apiRateLimit } from '@/lib/rate-limiter';

describe('Rate limiter (SEC-015)', () => {
  beforeEach(() => {
    // Reset timers between tests to get clean windows
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('rateLimit core', () => {
    it('should allow the first request', () => {
      const result = rateLimit('test-allow-1', 5, 60000);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it('should track remaining attempts correctly', () => {
      const key = 'test-remaining-' + Date.now();
      for (let i = 0; i < 3; i++) {
        const result = rateLimit(key, 5, 60000);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(4 - i);
      }
    });

    it('should block after exceeding max attempts', () => {
      const key = 'test-block-' + Date.now();
      // Use all 5 attempts
      for (let i = 0; i < 5; i++) {
        const result = rateLimit(key, 5, 60000);
        expect(result.allowed).toBe(true);
      }
      // 6th attempt should be blocked
      const result = rateLimit(key, 5, 60000);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should include retryAfter when blocked', () => {
      const key = 'test-retry-' + Date.now();
      // Exhaust attempts
      for (let i = 0; i < 6; i++) {
        rateLimit(key, 5, 60000);
      }
      const result = rateLimit(key, 5, 60000);
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeDefined();
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should reset after window expires', () => {
      const key = 'test-reset-' + Date.now();
      // Exhaust attempts
      for (let i = 0; i < 6; i++) {
        rateLimit(key, 5, 60000);
      }
      expect(rateLimit(key, 5, 60000).allowed).toBe(false);

      // Advance past the window
      vi.advanceTimersByTime(61000);

      // Should be allowed again
      const result = rateLimit(key, 5, 60000);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it('should track different keys independently', () => {
      const key1 = 'user-a-' + Date.now();
      const key2 = 'user-b-' + Date.now();

      // Exhaust key1
      for (let i = 0; i < 6; i++) {
        rateLimit(key1, 5, 60000);
      }

      // key1 blocked, key2 still allowed
      expect(rateLimit(key1, 5, 60000).allowed).toBe(false);
      expect(rateLimit(key2, 5, 60000).allowed).toBe(true);
    });

    it('should not allow negative remaining', () => {
      const key = 'test-negative-' + Date.now();
      for (let i = 0; i < 10; i++) {
        const result = rateLimit(key, 3, 60000);
        expect(result.remaining).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('loginRateLimit', () => {
    it('should allow up to 5 login attempts per IP', () => {
      const ip = '192.168.1.' + Date.now();
      for (let i = 0; i < 5; i++) {
        const result = loginRateLimit(ip);
        expect(result.allowed).toBe(true);
      }
    });

    it('should block on 6th login attempt within 15 minutes', () => {
      const ip = '10.0.0.' + Date.now();
      for (let i = 0; i < 5; i++) {
        loginRateLimit(ip);
      }
      const result = loginRateLimit(ip);
      expect(result.allowed).toBe(false);
    });

    it('should reset login attempts after 15 minutes', () => {
      const ip = '172.16.0.' + Date.now();
      for (let i = 0; i < 6; i++) {
        loginRateLimit(ip);
      }
      expect(loginRateLimit(ip).allowed).toBe(false);

      // Advance 15 minutes + 1 second
      vi.advanceTimersByTime(15 * 60 * 1000 + 1000);

      expect(loginRateLimit(ip).allowed).toBe(true);
    });
  });

  describe('apiRateLimit', () => {
    it('should allow up to 100 requests per minute per IP per path', () => {
      const ip = 'api-test-' + Date.now();
      const path = '/api/employees';

      for (let i = 0; i < 100; i++) {
        const result = apiRateLimit(ip, path);
        expect(result.allowed).toBe(true);
      }
    });

    it('should block on 101st request within 1 minute', () => {
      const ip = 'api-block-' + Date.now();
      const path = '/api/employees';

      for (let i = 0; i < 100; i++) {
        apiRateLimit(ip, path);
      }
      const result = apiRateLimit(ip, path);
      expect(result.allowed).toBe(false);
    });

    it('should track different paths independently', () => {
      const ip = 'api-path-' + Date.now();

      // Exhaust /api/employees
      for (let i = 0; i < 101; i++) {
        apiRateLimit(ip, '/api/employees');
      }

      // /api/branches should still be allowed
      expect(apiRateLimit(ip, '/api/branches').allowed).toBe(true);
    });
  });
});
