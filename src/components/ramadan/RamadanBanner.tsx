'use client';

import { useState, useEffect } from 'react';
import { Moon, Star, X } from 'lucide-react';
import { getRamadanDay, type RamadanDay } from '@/data/ramadan';
import { useTranslation } from '@/contexts/LanguageContext';
import type { Language } from '@/lib/i18n/types';
import { en } from '@/lib/i18n/en';
import { uz } from '@/lib/i18n/uz';
import { ru } from '@/lib/i18n/ru';

const translations = { en, uz, ru } as const;

function interpolate(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (str, [key, val]) => str.replace(`{${key}}`, String(val)),
    template
  );
}

function getDismissKey(date: string): string {
  return `ramadan-banner-dismissed-${date}`;
}

function isDismissed(date: string): boolean {
  try {
    return sessionStorage.getItem(getDismissKey(date)) === '1';
  } catch {
    return false;
  }
}

function setDismissed(date: string): void {
  try {
    sessionStorage.setItem(getDismissKey(date), '1');
  } catch {
    // Ignore — incognito or storage full
  }
}

interface RamadanBannerProps {
  variant?: 'default' | 'kiosk' | 'compact';
  lang?: Language;
}

export default function RamadanBanner({ variant = 'default', lang }: RamadanBannerProps) {
  if (variant === 'default') {
    return <RamadanBannerWithContext />;
  }
  return <RamadanBannerStandalone variant={variant} lang={lang || 'uz'} />;
}

// Dashboard variant — uses LanguageProvider context
function RamadanBannerWithContext() {
  const { t } = useTranslation();
  const [ramadanDay, setRamadanDay] = useState<RamadanDay | null>(null);
  const [visible, setVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const day = getRamadanDay();
    if (day && !isDismissed(day.date)) {
      setRamadanDay(day);
      setVisible(true);
    }
  }, []);

  if (!ramadanDay || !visible) return null;

  const handleDismiss = () => {
    setFadeOut(true);
    setDismissed(ramadanDay.date);
    setTimeout(() => setVisible(false), 300);
  };

  return (
    <BannerUI
      variant="default"
      ramadanDay={ramadanDay}
      greeting={t.ramadan.greeting}
      dayText={interpolate(t.ramadan.dayOf, { current: ramadanDay.day, total: 30 })}
      suhurLabel={t.ramadan.suhur}
      iftarLabel={t.ramadan.iftar}
      dismissLabel={t.ramadan.dismiss}
      fadeOut={fadeOut}
      onDismiss={handleDismiss}
    />
  );
}

// Kiosk + Compact variants — standalone, no LanguageProvider needed
function RamadanBannerStandalone({ variant, lang }: { variant: 'kiosk' | 'compact'; lang: Language }) {
  const [ramadanDay, setRamadanDay] = useState<RamadanDay | null>(null);
  const [visible, setVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const day = getRamadanDay();
    if (day && (variant === 'compact' || !isDismissed(day.date))) {
      setRamadanDay(day);
      setVisible(true);
    }
  }, [variant]);

  if (!ramadanDay || !visible) return null;

  const t = translations[lang].ramadan;

  const handleDismiss = () => {
    setFadeOut(true);
    setDismissed(ramadanDay.date);
    setTimeout(() => setVisible(false), 300);
  };

  return (
    <BannerUI
      variant={variant}
      ramadanDay={ramadanDay}
      greeting={t.greeting}
      dayText={interpolate(t.dayOf, { current: ramadanDay.day, total: 30 })}
      suhurLabel={t.suhur}
      iftarLabel={t.iftar}
      dismissLabel={t.dismiss}
      fadeOut={fadeOut}
      onDismiss={handleDismiss}
    />
  );
}

// Shared render logic for all variants
function BannerUI({
  variant,
  ramadanDay,
  greeting,
  dayText,
  suhurLabel,
  iftarLabel,
  dismissLabel,
  fadeOut,
  onDismiss,
}: {
  variant: 'default' | 'kiosk' | 'compact';
  ramadanDay: RamadanDay;
  greeting: string;
  dayText: string;
  suhurLabel: string;
  iftarLabel: string;
  dismissLabel: string;
  fadeOut: boolean;
  onDismiss: () => void;
}) {
  const isCompact = variant === 'compact';
  const isKiosk = variant === 'kiosk';

  const containerClasses = isCompact
    ? 'relative overflow-hidden rounded-xl px-3 py-2.5'
    : 'relative overflow-hidden rounded-lg px-4 py-3' + (isKiosk ? ' sm:px-5 sm:py-3.5' : '');

  const textSize = isCompact ? 'text-xs' : isKiosk ? 'text-base' : 'text-sm';
  const iconSize = isCompact ? 'w-4 h-4' : isKiosk ? 'w-6 h-6' : 'w-5 h-5';
  const starSize = isCompact ? 'w-2.5 h-2.5' : 'w-3 h-3';

  return (
    <>
    <style>{`
      @keyframes ramadan-fade-in {
        from { opacity: 0; transform: translateY(-4px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes ramadan-twinkle {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 1; }
      }
      .animate-fade-in { animation: ramadan-fade-in 600ms ease-out; }
      .animate-twinkle { animation: ramadan-twinkle 4s ease-in-out infinite; }
      .delay-1000 { animation-delay: 1s; }
      .delay-2000 { animation-delay: 2s; }
      @media (prefers-reduced-motion: reduce) {
        .animate-fade-in { animation: none; }
        .animate-twinkle { animation: none; opacity: 0.5; }
      }
    `}</style>
    <div
      role="complementary"
      aria-label="Ramadan greeting banner"
      className={`
        ${containerClasses}
        bg-gradient-to-r from-indigo-950 via-blue-950 to-slate-900
        text-white ${textSize}
        transition-opacity duration-300 ease-in-out
        ${fadeOut ? 'opacity-0' : 'animate-fade-in'}
      `}
    >
      {/* Star decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <Star className={`${starSize} text-amber-300/40 absolute top-1 right-[15%] animate-twinkle`} fill="currentColor" />
        <Star className={`${starSize} text-amber-200/30 absolute bottom-1.5 right-[30%] animate-twinkle delay-1000`} fill="currentColor" />
        {!isCompact && (
          <Star className={`${starSize} text-amber-300/25 absolute top-2 right-[45%] animate-twinkle delay-2000`} fill="currentColor" />
        )}
      </div>

      {isCompact ? (
        /* Compact layout — centered, stacked */
        <div className="relative z-10 flex flex-col items-center gap-1.5 text-center">
          <div className="flex items-center gap-1.5">
            <Moon className={`${iconSize} text-amber-500`} />
            <span className="font-semibold text-amber-500">{greeting}</span>
          </div>
          <span className="text-blue-200">{dayText}</span>
          <div className="flex items-center gap-3 text-blue-100">
            <span>{suhurLabel}: <strong className="text-white">{ramadanDay.suhur}</strong></span>
            <span className="text-blue-300/50">|</span>
            <span>{iftarLabel}: <strong className="text-white">{ramadanDay.iftar}</strong></span>
          </div>
        </div>
      ) : (
        /* Default + Kiosk layout — horizontal */
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Moon className={`${iconSize} text-amber-500 shrink-0`} />
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="font-semibold text-amber-500">{greeting}</span>
              <span className="text-blue-200">{dayText}</span>
              <span className="text-blue-300/40 hidden sm:inline">|</span>
              <span className="text-blue-100 hidden sm:inline">
                {suhurLabel}: <strong className="text-white">{ramadanDay.suhur}</strong>
              </span>
              <span className="text-blue-300/40 hidden sm:inline">|</span>
              <span className="text-blue-100 hidden sm:inline">
                {iftarLabel}: <strong className="text-white">{ramadanDay.iftar}</strong>
              </span>
            </div>
          </div>

          {/* Mobile times (shown below on small screens) */}
          <div className="sm:hidden absolute -bottom-0.5 left-8 flex items-center gap-2 text-blue-100" style={{ fontSize: '0.7rem' }}>
            <span>{suhurLabel}: <strong className="text-white">{ramadanDay.suhur}</strong></span>
            <span className="text-blue-300/40">|</span>
            <span>{iftarLabel}: <strong className="text-white">{ramadanDay.iftar}</strong></span>
          </div>

          {/* Dismiss button */}
          <button
            onClick={onDismiss}
            className="shrink-0 p-1 rounded hover:bg-white/10 transition-colors"
            aria-label={dismissLabel}
          >
            <X className={isKiosk ? 'w-5 h-5' : 'w-4 h-4'} />
          </button>
        </div>
      )}
    </div>
    </>
  );
}
