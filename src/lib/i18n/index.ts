export type { Language, Translations } from './types';
export { en } from './en';
export { ru } from './ru';
export { uz } from './uz';

import { en } from './en';
import { ru } from './ru';
import { uz } from './uz';
import type { Language, Translations } from './types';

export const translations: Record<Language, Translations> = {
  en,
  ru,
  uz,
};

export const languages: { code: Language; name: string; nativeName: string; flag: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'uz', name: 'Uzbek', nativeName: "O'zbekcha", flag: '🇺🇿' },
];

export const defaultLanguage: Language = 'en';
