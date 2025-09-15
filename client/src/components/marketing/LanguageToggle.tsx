/**
 * Language Toggle Component
 * Switches between EN/EL without page reload
 */

import { useLanguage } from '@/hooks/useLanguage';
import { Globe } from 'lucide-react';

export function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
      aria-label={`Switch to ${language === 'en' ? 'Greek' : 'English'}`}
    >
      <Globe className="w-4 h-4" />
      <span className="font-medium">{language === 'en' ? 'EL' : 'EN'}</span>
    </button>
  );
}
