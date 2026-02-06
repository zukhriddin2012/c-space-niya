// In-memory lockout store for PIN brute force prevention
// Resets on server restart (acceptable for 60-second lockout)

interface LockoutEntry {
  failCount: number;
  lockedUntil: number;
}

const lockoutMap = new Map<string, LockoutEntry>();
const MAX_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 60_000; // 60 seconds

export function checkLockout(key: string): {
  locked: boolean;
  remainingSeconds?: number;
} {
  const entry = lockoutMap.get(key);

  if (!entry) {
    return { locked: false };
  }

  const now = Date.now();
  if (entry.lockedUntil > now) {
    const remainingMs = entry.lockedUntil - now;
    const remainingSeconds = Math.ceil(remainingMs / 1000);
    return { locked: true, remainingSeconds };
  }

  // Lockout expired, clean up
  lockoutMap.delete(key);
  return { locked: false };
}

export function recordFailure(key: string): {
  locked: boolean;
  attemptsRemaining: number;
  lockoutRemainingSeconds?: number;
} {
  const entry = lockoutMap.get(key) || { failCount: 0, lockedUntil: 0 };

  entry.failCount += 1;

  if (entry.failCount >= MAX_ATTEMPTS) {
    const now = Date.now();
    entry.lockedUntil = now + LOCKOUT_DURATION_MS;
    lockoutMap.set(key, entry);

    const remainingSeconds = Math.ceil(LOCKOUT_DURATION_MS / 1000);
    return {
      locked: true,
      attemptsRemaining: 0,
      lockoutRemainingSeconds: remainingSeconds,
    };
  }

  lockoutMap.set(key, entry);
  const attemptsRemaining = MAX_ATTEMPTS - entry.failCount;

  return {
    locked: false,
    attemptsRemaining,
  };
}

export function resetLockout(key: string): void {
  lockoutMap.delete(key);
}
