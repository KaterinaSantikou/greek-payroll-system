/**
 * Language Switcher Component
 * 
 * UI component for switching between Greek and English languages.
 * Provides both button and dropdown variants.
 */

import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from './button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { Languages, Globe } from 'lucide-react';
import { SupportedLanguage } from '../../../lib/localization/BilingualMessages';

interface LanguageSwitcherProps {
  variant?: 'button' | 'dropdown';
  className?: string;
}

/**
 * Language Switcher Component
 */
export function LanguageSwitcher({ variant = 'button', className = '' }: LanguageSwitcherProps) {
  const { currentLanguage, setLanguage, t } = useLanguage();

  const languages: { code: SupportedLanguage; name: string; nativeName: string }[] = [
    { code: 'el', name: 'Greek', nativeName: 'Ελληνικά' },
    { code: 'en', name: 'English', nativeName: 'English' }
  ];

  const currentLangInfo = languages.find(lang => lang.code === currentLanguage);

  if (variant === 'dropdown') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`gap-2 ${className}`}
            data-testid="language-switcher-dropdown"
          >
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">
              {currentLangInfo?.nativeName}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {languages.map((language) => (
            <DropdownMenuItem
              key={language.code}
              onClick={() => setLanguage(language.code)}
              className={currentLanguage === language.code ? 'bg-accent' : ''}
              data-testid={`language-option-${language.code}`}
            >
              <span className="font-medium">{language.nativeName}</span>
              <span className="text-sm text-muted-foreground ml-2">
                {language.name}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Button variant - toggle between languages
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setLanguage(currentLanguage === 'el' ? 'en' : 'el')}
      className={`gap-2 ${className}`}
      data-testid="language-switcher-button"
      title={currentLanguage === 'el' ? 'Switch to English' : 'Αλλαγή σε Ελληνικά'}
    >
      <Languages className="h-4 w-4" />
      <span className="font-medium">
        {currentLanguage === 'el' ? 'EN' : 'ΕΛ'}
      </span>
    </Button>
  );
}

/**
 * Compact Language Toggle for Mobile
 */
export function CompactLanguageToggle({ className = '' }: { className?: string }) {
  const { currentLanguage, setLanguage } = useLanguage();

  return (
    <button
      onClick={() => setLanguage(currentLanguage === 'el' ? 'en' : 'el')}
      className={`
        inline-flex items-center justify-center 
        w-10 h-10 rounded-full 
        bg-gray-100 hover:bg-gray-200 
        dark:bg-gray-800 dark:hover:bg-gray-700
        text-sm font-medium
        transition-colors
        ${className}
      `}
      data-testid="compact-language-toggle"
      title={currentLanguage === 'el' ? 'Switch to English' : 'Αλλαγή σε Ελληνικά'}
    >
      {currentLanguage === 'el' ? 'EN' : 'ΕΛ'}
    </button>
  );
}

/**
 * Language Flag Component (optional visual enhancement)
 */
export function LanguageFlag({ 
  language, 
  size = 'sm',
  className = '' 
}: { 
  language: SupportedLanguage;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}) {
  const sizeClasses = {
    xs: 'w-4 h-3',
    sm: 'w-6 h-4',
    md: 'w-8 h-6'
  };

  return (
    <div 
      className={`
        ${sizeClasses[size]} 
        rounded-sm border border-gray-300 
        flex items-center justify-center
        text-xs font-bold
        ${language === 'el' ? 'bg-blue-500 text-white' : 'bg-red-500 text-white'}
        ${className}
      `}
      data-testid={`language-flag-${language}`}
    >
      {language === 'el' ? 'ΕΛ' : 'EN'}
    </div>
  );
}

/**
 * Language Status Indicator
 */
export function LanguageStatus({ className = '' }: { className?: string }) {
  const { currentLanguage, t } = useLanguage();
  const currentLangName = currentLanguage === 'el' ? 'Ελληνικά' : 'English';

  return (
    <div 
      className={`
        flex items-center gap-2 
        text-sm text-muted-foreground
        ${className}
      `}
      data-testid="language-status"
    >
      <LanguageFlag language={currentLanguage} size="xs" />
      <span>{currentLangName}</span>
    </div>
  );
}