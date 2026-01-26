'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

type ReminderStatus = 'loading' | 'ip_matched' | 'ip_not_matched' | 'at_work_confirmed' | 'checkout_done' | 'reminder_set' | 'error';

function CheckoutReminderContent() {
  const searchParams = useSearchParams();
  // Get telegramId from URL (tid) - same pattern as checkin page
  const telegramId = searchParams.get('tid');
  const attendanceId = searchParams.get('aid') || searchParams.get('attendanceId');
  const lang = searchParams.get('lang') || 'uz';

  const [status, setStatus] = useState<ReminderStatus>('loading');
  const [message, setMessage] = useState('');
  const [branchName, setBranchName] = useState('');
  const [reminderId, setReminderId] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState('');

  // Translations
  const t = {
    uz: {
      checking: 'Tekshirilmoqda...',
      stillAtOffice: (branch: string) => `Ajoyib! Siz hali ${branch}dasiz.`,
      whenToCheck: 'Qachon yana tekshiraylik?',
      ipMismatch: 'Sizni ofisda aniqlay olmadik.',
      areYouAtWork: 'Hali ishdamisiz?',
      checkoutDone: 'Chiqishingiz qayd etildi!',
      seeYou: 'Keyingi safar ko\'rishguncha! 👋',
      reminderSet: 'Eslatma belgilandi!',
      keepWorking: 'Davom eting! 💪',
      stayingLate: 'Bugun kech qolasiz.',
      dontForget: 'Chiqishni qayd etishni unutmang! 🌙',
      error: 'Xatolik yuz berdi',
      tryAgain: 'Qaytadan urinib ko\'ring',
      imAtWork: '🏢 Men ishdaman',
      iLeft: '🚪 Men chiqdim',
      in45min: '⏱️ 45 daqiqadan keyin',
      in2hours: '🕐 2 soatdan keyin',
      allDay: '🌙 Bugun ketmayman',
    },
    en: {
      checking: 'Checking...',
      stillAtOffice: (branch: string) => `Great! You're still at ${branch}.`,
      whenToCheck: 'When should we check again?',
      ipMismatch: 'We couldn\'t detect you at the office.',
      areYouAtWork: 'Are you still at work?',
      checkoutDone: 'Your checkout has been recorded!',
      seeYou: 'See you next time! 👋',
      reminderSet: 'Reminder set!',
      keepWorking: 'Keep up the great work! 💪',
      stayingLate: 'You\'re staying late today.',
      dontForget: 'Don\'t forget to checkout when you leave! 🌙',
      error: 'An error occurred',
      tryAgain: 'Please try again',
      imAtWork: '🏢 I\'m at work',
      iLeft: '🚪 I already left',
      in45min: '⏱️ In 45 minutes',
      in2hours: '🕐 In 2 hours',
      allDay: '🌙 I won\'t leave today',
    },
    ru: {
      checking: 'Проверяем...',
      stillAtOffice: (branch: string) => `Отлично! Вы всё ещё в ${branch}.`,
      whenToCheck: 'Когда напомнить снова?',
      ipMismatch: 'Мы не обнаружили вас в офисе.',
      areYouAtWork: 'Вы ещё на работе?',
      checkoutDone: 'Ваш уход зафиксирован!',
      seeYou: 'До встречи! 👋',
      reminderSet: 'Напоминание установлено!',
      keepWorking: 'Так держать! 💪',
      stayingLate: 'Вы сегодня задерживаетесь.',
      dontForget: 'Не забудьте отметить уход! 🌙',
      error: 'Произошла ошибка',
      tryAgain: 'Попробуйте снова',
      imAtWork: '🏢 Я на работе',
      iLeft: '🚪 Я уже ушёл',
      in45min: '⏱️ Через 45 минут',
      in2hours: '🕐 Через 2 часа',
      allDay: '🌙 Сегодня не уйду',
    },
  };

  const texts = t[lang as keyof typeof t] || t.uz;

  // Get base URL dynamically
  const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return '';
  };

  // Check presence on load - using fetch like the check-in page
  const checkPresence = useCallback(async () => {
    if (!telegramId) {
      setStatus('error');
      setMessage('Telegram ID topilmadi');
      setDebugInfo(`tid=null, aid=${attendanceId}`);
      return;
    }

    const baseUrl = getBaseUrl();
    const apiUrl = `${baseUrl}/api/tg-check`;
    setDebugInfo(`tid=${telegramId}, url=${apiUrl}`);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telegramId: String(telegramId),
          attendanceId: attendanceId ? String(attendanceId) : null
        }),
      });

      // Check if response is OK
      if (!response.ok) {
        setStatus('error');
        setMessage(`HTTP xato: ${response.status}`);
        setDebugInfo(`tid=${telegramId}, url=${apiUrl}, status=${response.status}`);
        return;
      }

      // Check content type
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        setStatus('error');
        setMessage('Server JSON qaytarmadi');
        setDebugInfo(`tid=${telegramId}, ct=${contentType}, body=${text.substring(0, 100)}`);
        return;
      }

      const result = await response.json();

      if (result.success) {
        setReminderId(result.reminderId);
        if (result.ipMatched) {
          setStatus('ip_matched');
          setBranchName(result.branchName || '');
        } else {
          setStatus('ip_not_matched');
        }
      } else {
        setStatus('error');
        setMessage(result.error || 'Xatolik yuz berdi');
      }
    } catch (error: any) {
      console.error('Presence check error:', error);
      setStatus('error');
      setMessage(`Tarmoq xatosi: ${error?.message || 'unknown'}`);
    }
  }, [telegramId, attendanceId]);

  // Handle action buttons - using fetch like the check-in page
  const handleAction = async (action: 'im_at_work' | 'i_left' | '45min' | '2hours' | 'all_day') => {
    const baseUrl = getBaseUrl();
    try {
      const response = await fetch(`${baseUrl}/api/tg-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telegramId: String(telegramId),
          reminderId,
          attendanceId: attendanceId ? String(attendanceId) : null,
          responseType: action
        }),
      });

      const result = await response.json();

      if (result.success) {
        if (action === 'i_left') {
          setStatus('checkout_done');
          setTimeout(() => {
            if (window.Telegram?.WebApp) {
              window.Telegram.WebApp.close();
            }
          }, 2000);
        } else if (action === 'im_at_work') {
          setStatus('at_work_confirmed');
        } else if (action === 'all_day') {
          setStatus('reminder_set');
          setMessage('all_day');
          setTimeout(() => {
            if (window.Telegram?.WebApp) {
              window.Telegram.WebApp.close();
            }
          }, 2000);
        } else {
          setStatus('reminder_set');
          setMessage(action);
          setTimeout(() => {
            if (window.Telegram?.WebApp) {
              window.Telegram.WebApp.close();
            }
          }, 2000);
        }
      } else {
        setStatus('error');
        setMessage(result.error || 'Xatolik yuz berdi');
      }
    } catch (error: any) {
      console.error('Action error:', error);
      setStatus('error');
      setMessage(`Tarmoq xatosi: ${error?.message || 'unknown'}`);
    }
  };

  useEffect(() => {
    // Initialize Telegram Web App
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }

    // Perform check immediately - same as checkin page
    checkPresence();
  }, [checkPresence]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-500 to-indigo-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
        {/* Loading State */}
        {status === 'loading' && (
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-purple-100 flex items-center justify-center">
              <svg className="w-10 h-10 text-purple-600 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">{texts.checking}</h1>
          </div>
        )}

        {/* IP Matched - Still at office */}
        {status === 'ip_matched' && (
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              {texts.stillAtOffice(branchName)}
            </h1>
            <p className="text-gray-500 text-sm mb-6">{texts.whenToCheck}</p>
            <div className="space-y-3">
              <button onClick={() => handleAction('45min')} className="w-full py-3 px-4 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl font-medium transition-colors">
                {texts.in45min}
              </button>
              <button onClick={() => handleAction('2hours')} className="w-full py-3 px-4 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl font-medium transition-colors">
                {texts.in2hours}
              </button>
              <button onClick={() => handleAction('all_day')} className="w-full py-3 px-4 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl font-medium transition-colors">
                {texts.allDay}
              </button>
            </div>
          </div>
        )}

        {/* At Work Confirmed */}
        {status === 'at_work_confirmed' && (
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">👍</h1>
            <p className="text-gray-500 text-sm mb-6">{texts.whenToCheck}</p>
            <div className="space-y-3">
              <button onClick={() => handleAction('45min')} className="w-full py-3 px-4 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl font-medium transition-colors">
                {texts.in45min}
              </button>
              <button onClick={() => handleAction('2hours')} className="w-full py-3 px-4 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl font-medium transition-colors">
                {texts.in2hours}
              </button>
              <button onClick={() => handleAction('all_day')} className="w-full py-3 px-4 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl font-medium transition-colors">
                {texts.allDay}
              </button>
            </div>
          </div>
        )}

        {/* IP Not Matched */}
        {status === 'ip_not_matched' && (
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-orange-100 flex items-center justify-center">
              <svg className="w-10 h-10 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-lg font-bold text-gray-900 mb-2">{texts.ipMismatch}</h1>
            <p className="text-gray-500 text-sm mb-6">{texts.areYouAtWork}</p>
            <div className="space-y-3">
              <button onClick={() => handleAction('im_at_work')} className="w-full py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors">
                {texts.imAtWork}
              </button>
              <button onClick={() => handleAction('i_left')} className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors">
                {texts.iLeft}
              </button>
            </div>
          </div>
        )}

        {/* Checkout Done */}
        {status === 'checkout_done' && (
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">{texts.checkoutDone}</h1>
            <p className="text-gray-500">{texts.seeYou}</p>
          </div>
        )}

        {/* Reminder Set */}
        {status === 'reminder_set' && (
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-purple-100 flex items-center justify-center">
              <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              {message === 'all_day' ? texts.stayingLate : texts.reminderSet}
            </h1>
            <p className="text-gray-500">
              {message === 'all_day' ? texts.dontForget : texts.keepWorking}
            </p>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">{texts.error}</h1>
            <p className="text-gray-500 text-sm">{message || texts.tryAgain}</p>
            {debugInfo && <p className="text-xs text-gray-400 mt-2 break-all">{debugInfo}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CheckoutReminderPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-purple-500 to-indigo-600 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <CheckoutReminderContent />
    </Suspense>
  );
}
