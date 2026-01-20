'use client';

import { useState } from 'react';
import { Bell, Check, X } from 'lucide-react';

interface ReminderButtonProps {
  employeeId: string;
  employeeName: string;
  type: 'checkin' | 'checkout';
}

export default function ReminderButton({
  employeeId,
  employeeName,
  type,
}: ReminderButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSendReminder = async () => {
    setIsLoading(true);
    setStatus('idle');
    setErrorMessage('');

    try {
      const response = await fetch(`/api/attendance/${employeeId}/remind`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, employeeName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reminder');
      }

      setStatus('success');
      // Reset after 3 seconds
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'An error occurred');
      // Reset after 5 seconds
      setTimeout(() => {
        setStatus('idle');
        setErrorMessage('');
      }, 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const buttonTitle = type === 'checkin'
    ? 'Send check-in reminder'
    : 'Send check-out reminder';

  if (status === 'success') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-600">
        <Check size={14} />
        Sent
      </span>
    );
  }

  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600" title={errorMessage}>
        <X size={14} />
        Failed
      </span>
    );
  }

  return (
    <button
      onClick={handleSendReminder}
      disabled={isLoading}
      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded transition-colors disabled:opacity-50"
      title={buttonTitle}
    >
      <Bell size={14} className={isLoading ? 'animate-pulse' : ''} />
      {isLoading ? 'Sending...' : 'Remind'}
    </button>
  );
}
