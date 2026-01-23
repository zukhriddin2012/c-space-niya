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
      setMessage('Telegram ID topilmadi');
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
        setMessage('Kirish muvaffaqiyatli!');

        // Close the web app after short delay
        if (window.Telegram?.WebApp) {
          setTimeout(() => {
            window.Telegram?.WebApp?.close();
          }, 1500);
        }
      } else if (result.error === 'ip_not_matched') {
        // IP not matched - close immediately, webhook will prompt for GPS
        if (window.Telegram?.WebApp) {
          window.Telegram.WebApp.close();
        } else {
          setStatus('gps_needed');
          setMessage('Joylashuvingizni yuboring');
        }
      } else if (result.error === 'active_checkin') {
        setStatus('error');
        setMessage(`Sizda yopilmagan kirish mavjud: ${result.checkIn}`);

        if (window.Telegram?.WebApp) {
          setTimeout(() => {
            window.Telegram?.WebApp?.close();
          }, 2000);
        }
      } else {
        setStatus('error');
        setMessage(result.message || result.error || 'Xatolik yuz berdi');
      }
    } catch (error) {
      console.error('Check-in error:', error);
      setStatus('error');
      setMessage('Tarmoq xatosi. Qaytadan urinib ko\'ring.');
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
    <div className="min-h-screen bg-gradient-to-b from-emerald-500 to-teal-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full text-center">
        {status === 'loading' && (
          <>
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
              <svg className="w-10 h-10 text-emerald-600 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Tekshirilmoqda</h1>
            <p className="text-gray-500 text-sm">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
              <svg className="w-12 h-12 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-emerald-600 mb-4">Kirish tasdiqlandi!</h1>
            {data && (
              <div className="bg-gray-50 rounded-xl p-4 text-left space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Vaqt</span>
                  <span className="font-bold text-lg">{data.checkIn}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Filial</span>
                  <span className="font-semibold text-emerald-600">{data.branchName}</span>
                </div>
                {data.isLate && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-sm">Holat</span>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                      ⏰ Kechikish
                    </span>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {status === 'gps_needed' && (
          <>
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
              <svg className="w-12 h-12 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-amber-600 mb-2">Joylashuv kerak</h1>
            <p className="text-gray-500 text-sm">{message}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-red-500 mb-2">Xatolik</h1>
            <p className="text-gray-500 text-sm">{message}</p>
          </>
        )}
      </div>
    </div>
  );
}

// Loading fallback for Suspense
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-500 to-teal-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
          <svg className="w-10 h-10 text-emerald-600 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900">Yuklanmoqda...</h1>
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
