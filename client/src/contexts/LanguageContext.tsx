/**
 * Language Context Provider
 * 
 * React context for managing bilingual support throughout the application.
 * Provides language switching functionality and message translation.
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  SupportedLanguage, 
  BilingualMessageManager, 
  bilingualMessages 
} from '../../../lib/localization/BilingualMessages';

interface LanguageContextType {
  currentLanguage: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;
  t: (keyPath: string, params?: Record<string, any>) => string;
  getBilingual: (keyPath: string) => { el: string; en: string };
  isGreek: boolean;
  isEnglish: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
  initialLanguage?: SupportedLanguage;
}

/**
 * Language Context Provider Component
 */
export function LanguageProvider({ children, initialLanguage = 'el' }: LanguageProviderProps) {
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>(() => {
    // Check for saved language preference in localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('payroll-language') as SupportedLanguage;
      if (saved === 'el' || saved === 'en') {
        return saved;
      }
      
      // Check browser language preference
      const browserLang = navigator.language || navigator.languages?.[0];
      if (browserLang?.startsWith('el') || browserLang?.startsWith('gr')) {
        return 'el';
      }
    }
    
    return initialLanguage;
  });

  // Update the message manager when language changes
  useEffect(() => {
    bilingualMessages.setLanguage(currentLanguage);
    
    // Save language preference
    if (typeof window !== 'undefined') {
      localStorage.setItem('payroll-language', currentLanguage);
      
      // Update document lang attribute for accessibility
      document.documentElement.lang = currentLanguage === 'el' ? 'el' : 'en';
      
      // Update document direction (both Greek and English are LTR)
      document.documentElement.dir = 'ltr';
    }
  }, [currentLanguage]);

  const setLanguage = (language: SupportedLanguage) => {
    setCurrentLanguage(language);
  };

  const t = (keyPath: string, params?: Record<string, any>): string => {
    return params ? 
      bilingualMessages.getFormattedMessage(keyPath, params) : 
      bilingualMessages.getMessage(keyPath);
  };

  const getBilingual = (keyPath: string) => {
    return bilingualMessages.getBilingualMessage(keyPath);
  };

  const contextValue: LanguageContextType = {
    currentLanguage,
    setLanguage,
    t,
    getBilingual,
    isGreek: currentLanguage === 'el',
    isEnglish: currentLanguage === 'en'
  };

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * Hook to use the language context
 */
export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

/**
 * Hook for translation with shorter name
 */
export function useTranslation() {
  const { t, getBilingual, currentLanguage, isGreek, isEnglish } = useLanguage();
  
  return {
    t,
    getBilingual,
    language: currentLanguage,
    isGreek,
    isEnglish
  };
}

/**
 * Higher-order component to wrap components with language context
 */
export function withLanguage<T extends object>(Component: React.ComponentType<T>) {
  return function WrappedComponent(props: T) {
    return (
      <LanguageProvider>
        <Component {...props} />
      </LanguageProvider>
    );
  };
}