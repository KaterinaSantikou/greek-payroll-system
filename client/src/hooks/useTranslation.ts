import { useState, useEffect } from 'react';
import enTranslations from '../locales/en.json';
import elTranslations from '../locales/el.json';

type Translations = typeof enTranslations;
type TranslationKey = keyof Translations;

const translations: Record<string, Translations> = {
  en: enTranslations,
  el: elTranslations,
};

export function useTranslation() {
  const [locale, setLocale] = useState<string>(() => {
    // Get from localStorage first, then browser, then default to 'en'
    const saved = localStorage.getItem('locale');
    if (saved && translations[saved]) return saved;
    
    const browserLang = navigator.language.split('-')[0];
    if (translations[browserLang]) return browserLang;
    
    return 'en';
  });

  useEffect(() => {
    localStorage.setItem('locale', locale);
  }, [locale]);

  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    const translation = translations[locale]?.[key] || translations.en[key] || key;
    
    if (!params) return translation;
    
    // Simple template replacement for {{variable}} syntax
    return translation.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
      return String(params[paramKey] ?? match);
    });
  };

  const changeLanguage = (newLocale: string) => {
    if (translations[newLocale]) {
      setLocale(newLocale);
    }
  };

  return {
    t,
    locale,
    changeLanguage,
    availableLanguages: Object.keys(translations),
  };
}