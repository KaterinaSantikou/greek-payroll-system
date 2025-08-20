/**
 * Language Toggle Hook
 * Manages EN/EL language switching with localStorage persistence
 */

import { useState, useEffect } from 'react';

export type Language = 'en' | 'el';

export function useLanguage() {
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('preferred-language') as Language;
      return stored || 'en';
    }
    return 'en';
  });

  const toggleLanguage = () => {
    const newLang: Language = language === 'en' ? 'el' : 'en';
    setLanguage(newLang);
    localStorage.setItem('preferred-language', newLang);
  };

  const setLanguageDirectly = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('preferred-language', lang);
  };

  useEffect(() => {
    // Update document lang attribute
    document.documentElement.lang = language;
  }, [language]);

  return {
    language,
    toggleLanguage,
    setLanguageDirectly,
    isEnglish: language === 'en',
    isGreek: language === 'el',
  };
}

/**
 * Translation helper for bilingual content
 */
export function useTranslation() {
  const { language } = useLanguage();

  const t = (content: { [key: string]: string } | string, fallback?: string): string => {
    if (typeof content === 'string') {
      return content;
    }

    const key = `${Object.keys(content)[0]}_${language}`;
    return content[key] || content[`${Object.keys(content)[0]}_en`] || fallback || '';
  };

  return { t, language };
}