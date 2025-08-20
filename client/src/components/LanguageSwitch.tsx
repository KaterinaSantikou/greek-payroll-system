import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Locale } from '@/lib/i18n';

interface LanguageSwitchProps {
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  className?: string;
}

// Language options with native names
const languages = [
  { code: 'en' as Locale, name: 'English', nativeName: 'English' },
  { code: 'el' as Locale, name: 'Greek', nativeName: 'Ελληνικά' },
];

export function LanguageSwitch({ locale, onLocaleChange, className }: LanguageSwitchProps) {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleLanguageChange = (newLocale: Locale) => {
    // Update localStorage for persistence
    localStorage.setItem('preferred_locale', newLocale);
    
    // Update cookie for SSR support
    document.cookie = `lang=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}`; // 1 year
    
    // Call the parent handler
    onLocaleChange(newLocale);
    
    // Broadcast language change event for third-party widgets
    window.dispatchEvent(new CustomEvent('langChanged', { 
      detail: { locale: newLocale, previousLocale: locale }
    }));
    
    // Log for debugging
    console.log(`Language changed from ${locale} to ${newLocale}`);
  };

  const currentLanguage = languages.find(lang => lang.code === locale);

  if (!isClient) {
    return (
      <Button variant="ghost" size="sm" className={cn("h-8 px-2", className)} disabled>
        <Globe className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn("h-8 px-2 hover:bg-accent hover:text-accent-foreground", className)}
        >
          <Globe className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline-block">
            {currentLanguage?.nativeName || 'Language'}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex flex-col">
              <span className="font-medium">{language.nativeName}</span>
              <span className="text-xs text-muted-foreground">{language.name}</span>
            </div>
            {locale === language.code && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Hook for language persistence logic
export function useLanguagePersistence() {
  const [locale, setLocale] = useState<Locale>('en');

  useEffect(() => {
    // Language source of truth order:
    // 1. User profile preferred_locale (would need API call)
    // 2. Cookie lang
    // 3. localStorage.lang  
    // 4. Browser navigator.language
    // 5. Fallback en-US

    const getInitialLocale = (): Locale => {
      // Check localStorage first
      const storedLocale = localStorage.getItem('preferred_locale') as Locale;
      if (storedLocale && ['en', 'el'].includes(storedLocale)) {
        return storedLocale;
      }

      // Check cookie
      const cookieMatch = document.cookie.match(/(?:^|; )lang=([^;]*)/);
      const cookieLocale = cookieMatch?.[1] as Locale;
      if (cookieLocale && ['en', 'el'].includes(cookieLocale)) {
        return cookieLocale;
      }

      // Check browser language
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.startsWith('el')) {
        return 'el';
      }

      // Fallback to English
      return 'en';
    };

    const initialLocale = getInitialLocale();
    setLocale(initialLocale);

    // Persist the determined locale
    localStorage.setItem('preferred_locale', initialLocale);
    document.cookie = `lang=${initialLocale}; path=/; max-age=${60 * 60 * 24 * 365}`;
  }, []);

  const changeLocale = (newLocale: Locale) => {
    setLocale(newLocale);
  };

  return { locale, changeLocale };
}