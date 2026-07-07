import { useCallback } from 'react';
import { create } from 'zustand';
import { useUserStore } from '../store/user';
import { english } from './translations/english';
import { hindi } from './translations/hindi';
import { gujarati } from './translations/gujarati';
import { marathi } from './translations/marathi';
import { tamil } from './translations/tamil';
import { bilingual } from './translations/bilingual';
import { telugu } from './translations/telugu';
import { kannada } from './translations/kannada';
import { punjabi } from './translations/punjabi';
import { bengali } from './translations/bengali';
import { malayalam } from './translations/malayalam';
import { urdu } from './translations/urdu';

// Translation registry lookup
export const TRANSLATIONS: Record<string, any> = {
  English: english,
  Hindi: hindi,
  Gujarati: gujarati,
  Marathi: marathi,
  Tamil: tamil,
  Bilingual: bilingual,
  Telugu: telugu,
  Kannada: kannada,
  Punjabi: punjabi,
  Bengali: bengali,
  Malayalam: malayalam,
  Urdu: urdu,
};

// Local storage backup language state store
interface LocalLanguageStore {
  localLanguage: string;
  setLocalLanguage: (lang: string) => void;
}

export const useLocalLanguageStore = create<LocalLanguageStore>((set) => ({
  localLanguage: 'English',
  setLocalLanguage: (localLanguage) => set({ localLanguage }),
}));

// Resolve dotted nested translation keys (e.g. "home.welcome" or "common.save")
export const resolveKey = (obj: any, path: string): string | undefined => {
  if (!obj || !path) return undefined;
  const val = path.split('.').reduce((acc, part) => acc && acc[part], obj);
  return typeof val === 'string' ? val : undefined;
};

// Global Translation Hook
export const useTranslation = () => {
  const profile = useUserStore((s) => s.profile);
  const localLanguage = useLocalLanguageStore((s) => s.localLanguage);
  
  // Precedence: User profile personalization -> local store state -> default English
  const language = profile?.personalizations?.general?.language || localLanguage || 'English';

  const t = useCallback((
    key: string,
    replacementsOrFallback?: Record<string, string | number> | string
  ): string => {
    const dict = TRANSLATIONS[language] || TRANSLATIONS.English;
    
    // Resolve dotted path (e.g., "common.save")
    let value = resolveKey(dict, key);
    
    // Fallback to English dictionary nested resolution
    if (value === undefined && language !== 'English') {
      value = resolveKey(TRANSLATIONS.English, key);
    }
    
    // Fallback to checking flat key compatibility (backward compatibility check)
    if (value === undefined) {
      value = dict[key] || TRANSLATIONS.English[key];
    }
    
    if (value !== undefined) {
      if (replacementsOrFallback && typeof replacementsOrFallback === 'object') {
        Object.entries(replacementsOrFallback).forEach(([k, v]) => {
          value = (value as string).replace(new RegExp(`{${k}}`, 'g'), String(v));
        });
      }
      return value;
    }
    
    // If not found, use fallback string if provided
    if (typeof replacementsOrFallback === 'string') {
      return replacementsOrFallback;
    }
    
    return key;
  }, [language]);

  return { t, language };
};

// Dotted key lookup helper for outside hooks (such as global notifications handlers)
export const translateOutside = (
  key: string, 
  currentLanguage = 'English', 
  replacementsOrFallback?: Record<string, string | number> | string
): string => {
  const dict = TRANSLATIONS[currentLanguage] || TRANSLATIONS.English;
  let value = resolveKey(dict, key);
  if (value === undefined) {
    value = resolveKey(TRANSLATIONS.English, key);
  }
  if (value === undefined) {
    value = dict[key] || TRANSLATIONS.English[key];
  }
  if (value !== undefined) {
    if (replacementsOrFallback && typeof replacementsOrFallback === 'object') {
      Object.entries(replacementsOrFallback).forEach(([k, v]) => {
        value = (value as string).replace(new RegExp(`{${k}}`, 'g'), String(v));
      });
    }
    return value;
  }
  if (typeof replacementsOrFallback === 'string') {
    return replacementsOrFallback;
  }
  return key;
};

// Global Date Formatting Handler
export const formatRelativeDate = (dateStr: string | Date | undefined, currentLanguage = 'English'): string => {
  if (!dateStr) return '';
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  const today = new Date();
  
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear();

  // Dynamic localization strings based on language selection
  const dateTranslations: Record<string, { today: string; yesterday: string; tomorrow: string }> = {
    English: { today: 'Today', yesterday: 'Yesterday', tomorrow: 'Tomorrow' },
    Hindi: { today: 'आज', yesterday: 'कल', tomorrow: 'कल' },
    Bilingual: { today: 'Today (आज)', yesterday: 'Yesterday (कल)', tomorrow: 'Tomorrow (कल)' },
    Gujarati: { today: 'આજે', yesterday: 'ગઈકાલે', tomorrow: 'આવતીકાલે' },
    Marathi: { today: 'आज', yesterday: 'काल', tomorrow: 'उद्या' },
    Tamil: { today: 'இன்று', yesterday: 'நேற்று', tomorrow: 'நாளை' },
    Telugu: { today: 'నేడు', yesterday: 'నిన్న', tomorrow: 'రేపు' },
    Kannada: { today: 'ಇಂದು', yesterday: 'ನಿನ್ನೆ', tomorrow: 'ನಾಳೆ' },
    Punjabi: { today: 'ਅੱਜ', yesterday: 'ਕੱਲ੍ਹ', tomorrow: 'ਕੱਲ੍ਹ' },
    Bengali: { today: 'আজ', yesterday: 'গতকাল', tomorrow: 'আগামীকাল' },
    Malayalam: { today: 'ഇന്ന്', yesterday: 'ഇന്നലെ', tomorrow: 'നാളെ' },
    Urdu: { today: 'آج', yesterday: 'کل', tomorrow: 'کل' }
  };

  const trans = dateTranslations[currentLanguage] || dateTranslations.English;

  if (isSameDay(date, today)) {
    return trans.today;
  } else if (isSameDay(date, yesterday)) {
    return trans.yesterday;
  } else if (isSameDay(date, tomorrow)) {
    return trans.tomorrow;
  }

  // Retrieve user custom date formatting config
  const profile = useUserStore.getState().profile;
  const dateFormat = profile?.personalizations?.general?.dateFormat || 'DD/MM/YYYY';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());

  if (dateFormat === 'MM/DD/YYYY') {
    return `${month}/${day}/${year}`;
  } else if (dateFormat === 'YYYY-MM-DD') {
    return `${year}-${month}-${day}`;
  }
  
  // Default: DD/MM/YYYY
  return `${day}/${month}/${year}`;
};

// Global Time Formatting Handler
export const formatTime = (timeStr: string | Date | undefined): string => {
  if (!timeStr) return '';
  const date = typeof timeStr === 'string' ? new Date(timeStr) : timeStr;
  if (isNaN(date.getTime())) {
    // If it's a simple "HH:MM" string, parse it manually or return it
    if (typeof timeStr === 'string' && timeStr.includes(':')) return timeStr;
    return '';
  }

  const profile = useUserStore.getState().profile;
  const timeFormatSetting = profile?.personalizations?.general?.timeFormat || '12-hour';

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');

  if (timeFormatSetting === '24-hour') {
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  } else {
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    return `${hours}:${minutes} ${ampm}`;
  }
};

// Localize numbers based on language selection
export const formatNumber = (num: number, currentLanguage = 'English'): string => {
  const isIndianFormat = [
    'Hindi', 'Bilingual', 'Tamil', 'Gujarati', 'Marathi',
    'Telugu', 'Kannada', 'Punjabi', 'Bengali', 'Malayalam', 'Urdu'
  ].includes(currentLanguage);
  try {
    return new Intl.NumberFormat(isIndianFormat ? 'en-IN' : 'en-US').format(num);
  } catch (e) {
    return num.toLocaleString();
  }
};

// Localize currency symbols & formatting
export const formatCurrency = (amount: number, currentLanguage = 'English', currencyCode = 'INR'): string => {
  const isIndianLocale = [
    'Hindi', 'Bilingual', 'Tamil', 'Gujarati', 'Marathi',
    'Telugu', 'Kannada', 'Punjabi', 'Bengali', 'Malayalam', 'Urdu'
  ].includes(currentLanguage);
  try {
    return new Intl.NumberFormat(isIndianLocale ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch (e) {
    const symbol = currencyCode === 'INR' ? '₹' : '$';
    return `${symbol}${formatNumber(amount, currentLanguage)}`;
  }
};


// Localize percentage
export const formatPercentage = (val: number): string => {
  return `${val}%`;
};
