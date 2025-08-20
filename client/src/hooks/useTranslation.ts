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
    // Get from LanguageSwitcher's preferred_locale first, then fallback to locale
    const switcherLocale = localStorage.getItem('preferred_locale');
    if (switcherLocale && translations[switcherLocale]) return switcherLocale;
    
    const saved = localStorage.getItem('locale');
    if (saved && translations[saved]) return saved;
    
    const browserLang = navigator.language.split('-')[0];
    if (translations[browserLang]) return browserLang;
    
    return 'en';
  });

  useEffect(() => {
    // Sync both localStorage keys
    localStorage.setItem('locale', locale);
    localStorage.setItem('preferred_locale', locale);
  }, [locale]);

  // Listen for language changes from LanguageSwitcher
  useEffect(() => {
    const handleLanguageChange = (event: CustomEvent) => {
      const newLocale = event.detail.locale;
      if (newLocale && translations[newLocale] && newLocale !== locale) {
        setLocale(newLocale);
      }
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'preferred_locale' && event.newValue && translations[event.newValue]) {
        setLocale(event.newValue);
      }
    };

    window.addEventListener('langChanged', handleLanguageChange as EventListener);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('langChanged', handleLanguageChange as EventListener);
      window.removeEventListener('storage', handleStorageChange);
    };
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