'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function TelegramCheckinContent() {
  const searchParams = useSearchParams();
  const telegramId = searchParams.get('tid');
  const shiftId = searchParams.get('shift') || 'day';

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'gps_needed'>('loading');
  const [message, setMessage] = useState('Tekshirilmoqda...');
  const [data, setData] = useState<any>(null);

  const performCheckin = useCallback(async () => {
    if (!telegramId) {
      setStatus('error');
      setMessage('Missing telegram ID');
      return;
    }

    try {
      const response = await fetch('/api/attendance/ip-checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telegramId,
          shiftId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setStatus('success');
        setData(result.data);
        setMessage('Check-in successful!');

        // Close the web app and send data back to Telegram
        if (window.Telegram?.WebApp) {
          window.Telegram.WebApp.sendData(JSON.stringify({
            success: true,
            action: 'checkin',
            ...result.data,
          }));
          setTimeout(() => {
            window.Telegram?.WebApp?.close();
          }, 2000);
        }
      } else if (result.error === 'ip_not_matched') {
        // IP not matched - close immediately and let bot ask for GPS
        if (window.Telegram?.WebApp) {
          window.Telegram.WebApp.sendData(JSON.stringify({
            success: false,
            action: 'need_gps',
          }));
          // Close immediately for seamless transition to GPS prompt
          window.Telegram.WebApp.close();
        } else {
          // Fallback if not in Telegram Web App
          setStatus('gps_needed');
          setMessage('Joylashuvingizni yuboring.');
        }
      } else if (result.error === 'active_checkin') {
        setStatus('error');
        setMessage(`You already have an active check-in at ${result.checkIn}`);

        if (window.Telegram?.WebApp) {
          setTimeout(() => {
            window.Telegram?.WebApp?.close();
          }, 2000);
        }
      } else {
        setStatus('error');
        setMessage(result.message || result.error || 'Check-in failed');
      }
    } catch (error) {
      console.error('Check-in error:', error);
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  }, [telegramId, shiftId]);

  useEffect(() => {
    // Initialize Telegram Web App
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }

    // Perform check-in
    performCheckin();
  }, [performCheckin]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center">
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-indigo-600 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Checking In</h1>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-green-600 mb-2">Checked In!</h1>
            {data && (
              <div className="bg-gray-50 rounded-xl p-4 mt-4 text-left space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Time</span>
                  <span className="font-semibold">{data.checkIn}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Branch</span>
                  <span className="font-semibold text-indigo-600">{data.branchName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Holat</span>
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                    ✓ Tasdiqlandi
                  </span>
                </div>
              </div>
            )}
            <p className="text-gray-500 text-sm mt-4">This window will close automatically...</p>
          </>
        )}

        {status === 'gps_needed' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
              <svg className="w-10 h-10 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-amber-600 mb-2">Joylashuv kerak</h1>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-red-600 mb-2">Check-in Failed</h1>
            <p className="text-gray-600">{message}</p>
          </>
        )}
      </div>
    </div>
  );
}

// Loading fallback for Suspense
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-indigo-600 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Loading...</h1>
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function TelegramCheckinPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <TelegramCheckinContent />
    </Suspense>
  );
}

// Extend window with Telegram type
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        sendData: (data: string) => void;
      };
    };
  }
}
