/**
 * Hook for managing Exit-Intent Popup behavior
 * Provides easy configuration for different pages and user segments
 */

import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

interface UseExitIntentOptions {
  enabled?: boolean;
  variant?: 'trial' | 'demo' | 'newsletter' | 'support' | 'discount';
  delay?: number; // seconds
  showOnlyForAnonymous?: boolean;
  showOnlyOnce?: boolean;
  excludePages?: string[];
  locale?: 'en' | 'el';
}

interface ExitIntentState {
  shouldShow: boolean;
  variant: 'trial' | 'demo' | 'newsletter' | 'support' | 'discount';
  locale: 'en' | 'el';
  onCapture: (data: any) => void;
}

export function useExitIntent(
  options: UseExitIntentOptions = {}
): ExitIntentState {
  const {
    enabled = true,
    variant = 'trial',
    delay = 10,
    showOnlyForAnonymous = true,
    showOnlyOnce = true,
    excludePages = [],
    locale = 'en',
  } = options;

  const { isAuthenticated } = useAuth();
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    // Check if exit intent should be shown
    const checkShouldShow = () => {
      // Don't show if disabled
      if (!enabled) return false;

      // Don't show if user is authenticated and we only want to show for anonymous
      if (showOnlyForAnonymous && isAuthenticated) return false;

      // Don't show if already shown and configured to show only once
      if (showOnlyOnce && localStorage.getItem('exitIntentShown')) return false;

      // Don't show on excluded pages
      const currentPath = window.location.pathname;
      if (excludePages.some(page => currentPath.includes(page))) return false;

      return true;
    };

    setShouldShow(checkShouldShow());
  }, [
    enabled,
    isAuthenticated,
    showOnlyForAnonymous,
    showOnlyOnce,
    excludePages,
  ]);

  const handleCapture = async (data: any) => {
    try {
      // Mark as shown in localStorage
      if (showOnlyOnce) {
        localStorage.setItem('exitIntentShown', 'true');
        localStorage.setItem('exitIntentDate', new Date().toISOString());
      }

      // In production, send to analytics/CRM
      console.log('Exit intent capture:', {
        ...data,
        page: window.location.pathname,
        referrer: document.referrer,
        sessionId: sessionStorage.getItem('sessionId') || 'anonymous',
      });

      // You could send to various services:
      // - Google Analytics event
      // - HubSpot/Salesforce lead
      // - Email marketing platform
      // - Internal analytics API

      // Example API call (uncomment in production):
      /*
      await fetch('/api/leads/exit-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      */

      // Track conversion
      if ((window as any).gtag) {
        (window as any).gtag('event', 'exit_intent_capture', {
          event_category: 'engagement',
          event_label: variant,
          value: 1,
        });
      }
    } catch (error) {
      console.error('Failed to process exit intent capture:', error);
    }
  };

  return {
    shouldShow,
    variant,
    locale,
    onCapture: handleCapture,
  };
}
