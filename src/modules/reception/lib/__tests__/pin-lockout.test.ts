// ============================================
// TST-025: PIN Lockout Tests
// Tests for src/modules/reception/lib/pin-lockout.ts
// Covers: PIN brute force prevention, lockout timing, reset
// ============================================

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { checkLockout, recordFailure, resetLockout } from '@/modules/reception/lib/pin-lockout';

describe('PIN Lockout', () => {
  const testKey = 'branch-1:user-1';

  beforeEach(() => {
    // Reset the lockout state for our test key
    resetLockout(testKey);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ═══ checkLockout ═══

  describe('checkLockout', () => {
    it('returns not locked for unknown key', () => {
      const result = checkLockout('unknown-key');
      expect(result.locked).toBe(false);
      expect(result.remainingSeconds).toBeUndefined();
    });

    it('returns not locked after reset', () => {
      recordFailure(testKey);
      resetLockout(testKey);
      expect(checkLockout(testKey).locked).toBe(false);
    });
  });

  // ═══ recordFailure ═══

  describe('recordFailure', () => {
    it('allows 2 failures without lockout', () => {
      const fail1 = recordFailure(testKey);
      expect(fail1.locked).toBe(false);
      expect(fail1.attemptsRemaining).toBe(2);

      const fail2 = recordFailure(testKey);
      expect(fail2.locked).toBe(false);
      expect(fail2.attemptsRemaining).toBe(1);
    });

    it('locks on 3rd failure', () => {
      recordFailure(testKey);
      recordFailure(testKey);
      const fail3 = recordFailure(testKey);

      expect(fail3.locked).toBe(true);
      expect(fail3.attemptsRemaining).toBe(0);
      expect(fail3.lockoutRemainingSeconds).toBe(60);
    });

    it('reports correct attempts remaining', () => {
      expect(recordFailure(testKey).attemptsRemaining).toBe(2);
      expect(recordFailure(testKey).attemptsRemaining).toBe(1);
      expect(recordFailure(testKey).attemptsRemaining).toBe(0);
    });
  });

  // ═══ Lockout behavior ═══

  describe('lockout behavior', () => {
    it('is locked after 3 failures', () => {
      recordFailure(testKey);
      recordFailure(testKey);
      recordFailure(testKey);

      const status = checkLockout(testKey);
      expect(status.locked).toBe(true);
      expect(status.remainingSeconds).toBeGreaterThan(0);
    });

    it('expires after 60 seconds', () => {
      recordFailure(testKey);
      recordFailure(testKey);
      recordFailure(testKey);

      // Advance 61 seconds
      vi.advanceTimersByTime(61_000);

      const status = checkLockout(testKey);
      expect(status.locked).toBe(false);
    });

    it('is still locked after 30 seconds', () => {
      recordFailure(testKey);
      recordFailure(testKey);
      recordFailure(testKey);

      vi.advanceTimersByTime(30_000);

      const status = checkLockout(testKey);
      expect(status.locked).toBe(true);
      expect(status.remainingSeconds).toBeLessThanOrEqual(30);
    });
  });

  // ═══ resetLockout ═══

  describe('resetLockout', () => {
    it('clears lockout state', () => {
      recordFailure(testKey);
      recordFailure(testKey);
      recordFailure(testKey);

      expect(checkLockout(testKey).locked).toBe(true);

      resetLockout(testKey);

      expect(checkLockout(testKey).locked).toBe(false);
    });

    it('resets failure count so user gets 3 new attempts', () => {
      recordFailure(testKey);
      recordFailure(testKey);
      resetLockout(testKey);

      // After reset, should get full 3 attempts
      const fail1 = recordFailure(testKey);
      expect(fail1.attemptsRemaining).toBe(2);
    });

    it('is safe to call on unknown key', () => {
      // Should not throw
      resetLockout('nonexistent-key');
    });
  });

  // ═══ Key isolation ═══

  describe('key isolation', () => {
    it('different keys are independent', () => {
      const keyA = 'branch-1:user-A';
      const keyB = 'branch-1:user-B';
      resetLockout(keyA);
      resetLockout(keyB);

      recordFailure(keyA);
      recordFailure(keyA);
      recordFailure(keyA);

      expect(checkLockout(keyA).locked).toBe(true);
      expect(checkLockout(keyB).locked).toBe(false);
    });

    it('same user at different branches are independent', () => {
      const keyBranch1 = 'branch-1:user-1';
      const keyBranch2 = 'branch-2:user-1';
      resetLockout(keyBranch1);
      resetLockout(keyBranch2);

      recordFailure(keyBranch1);
      recordFailure(keyBranch1);
      recordFailure(keyBranch1);

      expect(checkLockout(keyBranch1).locked).toBe(true);
      expect(checkLockout(keyBranch2).locked).toBe(false);
    });
  });
});
