'use client';

import { useState } from 'react';
import { Clock, X, AlertTriangle } from 'lucide-react';

interface ManualCheckoutButtonProps {
  attendanceId: string;
  employeeName: string;
  checkInTime: string | null;
  checkInDate?: string; // YYYY-MM-DD format
  onCheckoutComplete?: () => void;
}

export default function ManualCheckoutButton({
  attendanceId,
  employeeName,
  checkInTime,
  checkInDate,
  onCheckoutComplete,
}: ManualCheckoutButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [checkOutTime, setCheckOutTime] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Check if checkout is on a different day than check-in
  const getTodayDate = () => {
    const now = new Date();
    const tashkent = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tashkent' }));
    return tashkent.toISOString().split('T')[0];
  };

  const isOvernightShift = checkInDate && checkInDate !== getTodayDate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/attendance/${attendanceId}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkOutTime,
          // Include checkout date if it's different from check-in date
          ...(checkOutDate && checkOutDate !== checkInDate ? { checkOutDate } : {})
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to record check-out');
      }

      setIsOpen(false);
      setCheckOutTime('');

      // Refresh the page to show updated data
      if (onCheckoutComplete) {
        onCheckoutComplete();
      } else {
        window.location.reload();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get current time in Tashkent as default
  const getDefaultTime = () => {
    const now = new Date();
    const tashkent = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tashkent' }));
    return `${String(tashkent.getHours()).padStart(2, '0')}:${String(tashkent.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <>
      <button
        onClick={() => {
          setCheckOutTime(getDefaultTime());
          setCheckOutDate(getTodayDate());
          setIsOpen(true);
        }}
        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded transition-colors"
        title="Manual check-out"
      >
        <Clock size={14} />
        Check Out
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal content */}
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>

            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Manual Check-Out
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Record check-out time for <span className="font-medium">{employeeName}</span>
            </p>

            {checkInTime && (
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-sm text-gray-600">
                  Check-in: <span className="font-medium text-gray-900">{checkInDate && `${checkInDate} `}{checkInTime}</span>
                </p>
              </div>
            )}

            {isOvernightShift && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-start gap-2">
                <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-800">
                  This check-in is from a previous day ({checkInDate}). Make sure to select the correct check-out date.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Show date picker for overnight shifts or always to be safe */}
              <div className="mb-4">
                <label
                  htmlFor="checkOutDate"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Check-Out Date
                </label>
                <input
                  type="date"
                  id="checkOutDate"
                  value={checkOutDate}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                  min={checkInDate} // Can't checkout before check-in
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                  required
                />
              </div>

              <div className="mb-4">
                <label
                  htmlFor="checkOutTime"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Check-Out Time
                </label>
                <input
                  type="time"
                  id="checkOutTime"
                  value={checkOutTime}
                  onChange={(e) => setCheckOutTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the time when the employee left (Tashkent time)
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !checkOutTime}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Saving...' : 'Save Check-Out'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
