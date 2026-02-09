'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface MeetingTimerProps {
  startTime: Date;
}

export default function MeetingTimer({ startTime }: MeetingTimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;

  const timeStr = hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${minutes}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="flex items-center gap-2 bg-purple-100 px-3 py-1.5 rounded-lg">
      <Clock size={16} className="text-purple-600" />
      <span className="text-sm font-mono font-semibold text-purple-700">{timeStr}</span>
    </div>
  );
}
