'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations, defaultLanguage, type Language, type Translations } from '@/lib/i18n';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'c-space-language';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(defaultLanguage);
  const [mounted, setMounted] = useState(false);

  // Load language from database (via /api/auth/me) on mount, fallback to localStorage
  useEffect(() => {
    const loadLanguage = async () => {
      // First check localStorage for immediate display
      const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
      if (stored && (stored === 'en' || stored === 'ru' || stored === 'uz')) {
        setLanguageState(stored);
      }

      // Then try to load from database (if user is logged in)
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          const dbLang = data.employee?.preferred_language as Language | null;
          if (dbLang && (dbLang === 'en' || dbLang === 'ru' || dbLang === 'uz')) {
            setLanguageState(dbLang);
            localStorage.setItem(STORAGE_KEY, dbLang); // Sync localStorage with DB
          }
        }
      } catch (err) {
        // Ignore - user might not be logged in
      }

      setMounted(true);
    };
    loadLanguage();
  }, []);

  // Save language to localStorage and database when it changes
  const setLanguage = useCallback(async (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    // Update HTML lang attribute
    document.documentElement.lang = lang;

    // Save to database for Telegram bot messages
    try {
      await fetch('/api/employees/language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: lang }),
      });
    } catch (err) {
      console.error('Failed to save language to database:', err);
    }
  }, []);

  // Set initial HTML lang
  useEffect(() => {
    if (mounted) {
      document.documentElement.lang = language;
    }
  }, [language, mounted]);

  const t = translations[language];

  // Prevent hydration mismatch by not rendering children until mounted
  if (!mounted) {
    return null;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// Hook for getting just translations (convenience)
export function useTranslation() {
  const { t, language } = useLanguage();
  return { t, language };
}
