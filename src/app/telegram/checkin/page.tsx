'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getRamadanDay, type RamadanDay } from '@/data/ramadan';

type Lang = 'uz' | 'ru' | 'en';

// Translations for checkin mini app
const t = {
  checking: { uz: 'Tekshirilmoqda...', ru: 'Проверяем...', en: 'Checking...' },
  checkingTitle: { uz: 'Tekshirilmoqda', ru: 'Проверяем', en: 'Checking' },
  success: { uz: 'Kirish tasdiqlandi!', ru: 'Вход подтверждён!', en: 'Check-in confirmed!' },
  time: { uz: 'Vaqt', ru: 'Время', en: 'Time' },
  branch: { uz: 'Filial', ru: 'Филиал', en: 'Branch' },
  status: { uz: 'Holat', ru: 'Статус', en: 'Status' },
  late: { uz: '⏰ Kechikish', ru: '⏰ Опоздание', en: '⏰ Late' },
  gpsNeeded: { uz: 'Joylashuv kerak', ru: 'Требуется геолокация', en: 'Location needed' },
  sendLocation: { uz: 'Joylashuvingizni yuboring', ru: 'Отправьте местоположение', en: 'Send your location' },
  error: { uz: 'Xatolik', ru: 'Ошибка', en: 'Error' },
  networkError: { uz: 'Tarmoq xatosi. Qaytadan urinib ko\'ring.', ru: 'Сетевая ошибка. Попробуйте снова.', en: 'Network error. Please try again.' },
  noTelegramId: { uz: 'Telegram ID topilmadi', ru: 'Telegram ID не найден', en: 'Telegram ID not found' },
  activeCheckin: { uz: 'Sizda yopilmagan kirish mavjud', ru: 'У вас есть незакрытый вход', en: 'You have an active check-in' },
  loading: { uz: 'Yuklanmoqda...', ru: 'Загрузка...', en: 'Loading...' },
  ramadanGreeting: { uz: 'Ramazon Muborak!', ru: 'Рамадан Мубарак!', en: 'Ramadan Mubarak!' },
  ramadanSuhur: { uz: 'Saharlik', ru: 'Сухур', en: 'Suhur' },
  ramadanIftar: { uz: 'Iftorlik', ru: 'Ифтар', en: 'Iftar' },
};

function TelegramCheckinContent() {
  const searchParams = useSearchParams();
  const telegramId = searchParams.get('tid');
  const shiftId = searchParams.get('shift') || 'day';
  const langParam = searchParams.get('lang') as Lang | null;

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'gps_needed'>('loading');
  const [message, setMessage] = useState('');
  const [data, setData] = useState<any>(null);
  const [lang, setLang] = useState<Lang>(langParam || 'uz');
  const [ramadanDay, setRamadanDay] = useState<RamadanDay | null>(null);
  const hasCheckedIn = useRef(false);

  const performCheckin = useCallback(async () => {
    // Prevent duplicate check-in calls
    if (hasCheckedIn.current) {
      return;
    }
    hasCheckedIn.current = true;
    if (!telegramId) {
      setStatus('error');
      setMessage(t.noTelegramId[lang]);
      return;
    }

    setMessage(t.checking[lang]);

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
        // Update language from response if available
        if (result.data?.language) {
          setLang(result.data.language as Lang);
        }
        setStatus('success');
        setData(result.data);

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
          setMessage(t.sendLocation[lang]);
        }
      } else if (result.error === 'active_checkin') {
        setStatus('error');
        setMessage(`${t.activeCheckin[lang]}: ${result.checkIn}`);

        if (window.Telegram?.WebApp) {
          setTimeout(() => {
            window.Telegram?.WebApp?.close();
          }, 2000);
        }
      } else {
        setStatus('error');
        setMessage(result.message || result.error || t.error[lang]);
      }
    } catch (error) {
      console.error('Check-in error:', error);
      setStatus('error');
      setMessage(t.networkError[lang]);
    }
  }, [telegramId, shiftId, lang]);

  useEffect(() => {
    // Initialize Telegram Web App
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }

    // Check Ramadan
    setRamadanDay(getRamadanDay());

    // Perform check-in
    performCheckin();
  }, [performCheckin]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-500 to-teal-600 flex items-center justify-center p-4">
      <div className="max-w-sm w-full space-y-3">
        {/* CSN-174: Ramadan compact banner */}
        {ramadanDay && (
          <div className="bg-gradient-to-r from-indigo-950 via-blue-950 to-slate-900 rounded-xl px-3 py-2.5 text-center text-xs text-white">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <span className="text-amber-500">☪</span>
              <span className="font-semibold text-amber-500">{t.ramadanGreeting[lang]}</span>
            </div>
            <div className="text-blue-200 mb-1">
              {lang === 'en' ? `Day ${ramadanDay.day} of 30` : lang === 'uz' ? `30 kundan ${ramadanDay.day}-kun` : `День ${ramadanDay.day} из 30`}
            </div>
            <div className="flex items-center justify-center gap-3 text-blue-100">
              <span>{t.ramadanSuhur[lang]}: <strong className="text-white">{ramadanDay.suhur}</strong></span>
              <span className="text-blue-300/50">|</span>
              <span>{t.ramadanIftar[lang]}: <strong className="text-white">{ramadanDay.iftar}</strong></span>
            </div>
          </div>
        )}
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full text-center">
        {status === 'loading' && (
          <>
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
              <svg className="w-10 h-10 text-emerald-600 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">{t.checkingTitle[lang]}</h1>
            <p className="text-gray-500 text-sm">{message || t.checking[lang]}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
              <svg className="w-12 h-12 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-emerald-600 mb-4">{t.success[(data?.language as Lang) || lang]}</h1>
            {data && (
              <div className="bg-gray-50 rounded-xl p-4 text-left space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">{t.time[(data?.language as Lang) || lang]}</span>
                  <span className="font-bold text-lg">{data.checkIn}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">{t.branch[(data?.language as Lang) || lang]}</span>
                  <span className="font-semibold text-emerald-600">{data.branchName}</span>
                </div>
                {data.isLate && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-sm">{t.status[(data?.language as Lang) || lang]}</span>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                      {t.late[(data?.language as Lang) || lang]}
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
            <h1 className="text-xl font-bold text-amber-600 mb-2">{t.gpsNeeded[lang]}</h1>
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
            <h1 className="text-xl font-bold text-red-500 mb-2">{t.error[lang]}</h1>
            <p className="text-gray-500 text-sm">{message}</p>
          </>
        )}
      </div>
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
        <h1 className="text-xl font-bold text-gray-900">...</h1>
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
