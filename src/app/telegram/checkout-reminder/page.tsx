'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

type Status = 'checking' | 'done' | 'error';

function CheckoutReminderContent() {
  const searchParams = useSearchParams();
  const telegramId = searchParams.get('tid');
  const attendanceId = searchParams.get('aid') || searchParams.get('attendanceId');
  const messageId = searchParams.get('mid'); // Message ID for editing

  const [status, setStatus] = useState<Status>('checking');
  const [errorMsg, setErrorMsg] = useState('');

  // Check IP and close - bot will send appropriate message
  // Using XMLHttpRequest for better WebView compatibility
  const checkAndClose = useCallback(() => {
    console.log('[Checkout Reminder WebApp] Starting check with params:', {
      telegramId,
      attendanceId,
      messageId,
    });

    if (!telegramId) {
      setStatus('error');
      setErrorMsg('Telegram ID topilmadi');
      return;
    }

    try {
      // Use relative URL to avoid CORS issues and work across environments
      const apiUrl = '/api/attendance/checkout-check';

      const xhr = new XMLHttpRequest();
      xhr.open('POST', apiUrl, true);
      xhr.setRequestHeader('Content-Type', 'application/json');

      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          console.log('[Checkout Reminder] XHR response:', xhr.status, xhr.responseText?.substring(0, 200));

          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const result = JSON.parse(xhr.responseText);

              if (result.success) {
                setStatus('done');
                // Close after a short delay to show success
                setTimeout(() => {
                  if (window.Telegram?.WebApp) {
                    window.Telegram.WebApp.close();
                  }
                }, 800);
              } else {
                setStatus('error');
                setErrorMsg(result.error || 'API xatolik');
              }
            } catch (e) {
              setStatus('error');
              setErrorMsg('JSON parse xatosi');
            }
          } else {
            setStatus('error');
            setErrorMsg(`HTTP ${xhr.status}`);
          }
        }
      };

      xhr.onerror = function() {
        setStatus('error');
        setErrorMsg('Tarmoq xatosi');
      };

      xhr.send(JSON.stringify({
        telegramId: String(telegramId),
        attendanceId: attendanceId ? String(attendanceId) : null,
        messageId: messageId ? String(messageId) : null
      }));
    } catch (error: any) {
      setStatus('error');
      setErrorMsg(error?.message || 'Xatolik');
    }
  }, [telegramId, attendanceId, messageId]);

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
    }
    checkAndClose();
  }, [checkAndClose]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-500 to-indigo-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-xs w-full text-center">
        {status === 'checking' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-purple-600 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <p className="text-gray-600">Tekshirilmoqda...</p>
          </>
        )}

        {status === 'done' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-gray-600">Tayyor!</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-gray-600 text-sm">{errorMsg}</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function CheckoutReminderPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-purple-500 to-indigo-600 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <CheckoutReminderContent />
    </Suspense>
  );
}
