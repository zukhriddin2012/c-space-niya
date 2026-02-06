'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import SessionWarning from './SessionWarning';
import SessionExpired from './SessionExpired';

// Token lifetime: 1 hour (3600s). Warn at 55 minutes (5 min before expiry).
const TOKEN_LIFETIME_MS = 60 * 60 * 1000;
const WARNING_BEFORE_MS = 5 * 60 * 1000;

export default function SessionManager() {
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);
  const [showExpired, setShowExpired] = useState(false);
  const [expiresAt, setExpiresAt] = useState(0);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const expiryTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const resetTimers = useCallback((expiryTime: number) => {
    // Clear existing timers
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);

    setExpiresAt(expiryTime);
    setShowWarning(false);
    setShowExpired(false);

    const now = Date.now();
    const timeUntilWarning = expiryTime - now - WARNING_BEFORE_MS;
    const timeUntilExpiry = expiryTime - now;

    if (timeUntilWarning > 0) {
      warningTimerRef.current = setTimeout(() => {
        setShowWarning(true);
      }, timeUntilWarning);
    }

    if (timeUntilExpiry > 0) {
      expiryTimerRef.current = setTimeout(() => {
        setShowWarning(false);
        setShowExpired(true);
      }, timeUntilExpiry);
    }
  }, []);

  // On mount, set initial timer based on token lifetime
  useEffect(() => {
    resetTimers(Date.now() + TOKEN_LIFETIME_MS);

    return () => {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
    };
  }, [resetTimers]);

  // Listen for token refreshes from other tabs
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;

    const channel = new BroadcastChannel('c-space-session');
    channel.onmessage = (event) => {
      if (event.data.type === 'session-refreshed') {
        resetTimers(event.data.expiresAt);
      }
      if (event.data.type === 'session-logout') {
        setShowWarning(false);
        setShowExpired(true);
      }
    };

    return () => channel.close();
  }, [resetTimers]);

  const handleExtend = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const newExpiry = Date.now() + TOKEN_LIFETIME_MS;
        resetTimers(newExpiry);

        // Notify other tabs
        if (typeof BroadcastChannel !== 'undefined') {
          const channel = new BroadcastChannel('c-space-session');
          channel.postMessage({ type: 'session-refreshed', expiresAt: newExpiry });
          channel.close();
        }

        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [resetTimers]);

  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // Continue with client-side logout even if API fails
    }

    // Notify other tabs
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('c-space-session');
      channel.postMessage({ type: 'session-logout' });
      channel.close();
    }

    router.push('/login');
    router.refresh();
  }, [router]);

  return (
    <>
      <SessionWarning
        isOpen={showWarning}
        expiresAt={expiresAt}
        onExtend={handleExtend}
        onLogout={handleLogout}
      />
      <SessionExpired isOpen={showExpired} />
    </>
  );
}
