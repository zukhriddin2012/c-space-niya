'use client';

import { useState, useEffect, useCallback } from 'react';
import { Clock, LogOut } from 'lucide-react';

interface SessionWarningProps {
  onExtend: () => Promise<boolean>;
  onLogout: () => void;
  isOpen: boolean;
  expiresAt: number; // timestamp in ms
}

export default function SessionWarning({ onExtend, onLogout, isOpen, expiresAt }: SessionWarningProps) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isExtending, setIsExtending] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, expiresAt]);

  const handleExtend = useCallback(async () => {
    setIsExtending(true);
    try {
      const success = await onExtend();
      if (!success) {
        // Refresh failed — token already expired
        onLogout();
      }
    } catch {
      onLogout();
    } finally {
      setIsExtending(false);
    }
  }, [onExtend, onLogout]);

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6 text-center">
        {/* Icon */}
        <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock size={28} className="text-amber-600" />
        </div>

        <h2 className="text-lg font-semibold text-gray-900 mb-2">Session Expiring Soon</h2>
        <p className="text-sm text-gray-600 mb-4">
          Your session will expire due to inactivity. You will be signed out automatically.
        </p>

        {/* Countdown */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg py-3 px-4 mb-6">
          <span className="text-2xl font-mono font-bold text-amber-700">{timeStr}</span>
          <p className="text-xs text-amber-600 mt-1">remaining</p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onLogout}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <LogOut size={16} />
            Sign Out
          </button>
          <button
            onClick={handleExtend}
            disabled={isExtending}
            className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {isExtending ? 'Extending...' : 'Stay Signed In'}
          </button>
        </div>
      </div>
    </div>
  );
}
