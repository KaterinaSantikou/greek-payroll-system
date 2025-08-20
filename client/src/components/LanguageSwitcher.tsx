import React, { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocale, Locale } from "@/lib/i18n";
import { Globe, Check } from "lucide-react";

const languages = [
  { code: 'en' as Locale, name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'el' as Locale, name: 'Greek', nativeName: 'Ελληνικά', flag: '🇬🇷' },
];

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  // Initialize locale on mount with persistence
  useEffect(() => {
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
    if (initialLocale !== locale) {
      setLocale(initialLocale);
    }
  }, [locale, setLocale]);

  const handleLanguageChange = (newLocale: Locale) => {
    // Update localStorage for persistence
    localStorage.setItem('preferred_locale', newLocale);
    
    // Update cookie for SSR support
    document.cookie = `lang=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}`; // 1 year
    
    // Update the locale in context
    setLocale(newLocale);
    
    // Broadcast language change event for third-party widgets
    window.dispatchEvent(new CustomEvent('langChanged', { 
      detail: { locale: newLocale, previousLocale: locale }
    }));
    
    // Log for debugging
    console.log(`Language changed from ${locale} to ${newLocale}`);
  };

  const currentLanguage = languages.find(lang => lang.code === locale);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">
            {currentLanguage?.flag} {currentLanguage?.nativeName}
          </span>
          <span className="sm:hidden">
            {currentLanguage?.flag}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span>{language.flag}</span>
              <div className="flex flex-col">
                <span className="font-medium">{language.nativeName}</span>
                <span className="text-xs text-muted-foreground">{language.name}</span>
              </div>
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