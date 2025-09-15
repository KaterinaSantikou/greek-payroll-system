/**
 * PWA Install Prompt Component
 * Shows install banner for Greek payroll professionals
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePWA } from '@/hooks/usePWA';
import {
  X,
  Download,
  Smartphone,
  Clock,
  Bell,
  Shield,
  Zap,
} from 'lucide-react';

interface PWAInstallPromptProps {
  onDismiss?: () => void;
  variant?: 'banner' | 'modal' | 'inline';
  locale?: 'en' | 'el';
}

export default function PWAInstallPrompt({
  onDismiss,
  variant = 'banner',
  locale = 'en',
}: PWAInstallPromptProps) {
  const [pwaState, pwaActions] = usePWA();
  const [dismissed, setDismissed] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Don't show if not installable, already installed, or dismissed
  if (!pwaState.canInstall || pwaState.isInstalled || dismissed) {
    return null;
  }

  const translations = {
    en: {
      title: 'Install PayrollSync App',
      subtitle: 'Get the full Greek payroll experience',
      features: {
        offline: 'Work offline with cached data',
        notifications: 'Greek payroll deadline alerts',
        performance: 'Faster than website version',
        homescreen: 'Quick access from home screen',
      },
      benefits: [
        'ERGANI II notifications',
        'Offline payroll access',
        'Lightning fast performance',
        'Professional mobile experience',
      ],
      install: 'Install App',
      dismiss: 'Maybe Later',
      details: 'See Benefits',
      installing: 'Installing...',
    },
    el: {
      title: 'Εγκατάσταση PayrollSync App',
      subtitle: 'Λάβετε την πλήρη ελληνική εμπειρία μισθοδοσίας',
      features: {
        offline: 'Εργασία offline με cached δεδομένα',
        notifications: 'Ειδοποιήσεις ελληνικών προθεσμιών μισθοδοσίας',
        performance: 'Γρηγορότερο από την ιστοσελίδα',
        homescreen: 'Γρήγορη πρόσβαση από την αρχική οθόνη',
      },
      benefits: [
        'Ειδοποιήσεις ΕΡΓΑΝΗ ΙΙ',
        'Offline πρόσβαση μισθοδοσίας',
        'Αστραπιαία γρήγορη απόδοση',
        'Επαγγελματική mobile εμπειρία',
      ],
      install: 'Εγκατάσταση App',
      dismiss: 'Ίσως Αργότερα',
      details: 'Δείτε τα Οφέλη',
      installing: 'Εγκατάσταση...',
    },
  };

  const t = translations[locale];
  const [isInstalling, setIsInstalling] = useState(false);

  const handleInstall = async () => {
    setIsInstalling(true);

    try {
      await pwaActions.promptInstall();

      // Track installation attempt
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'pwa_install_attempt', {
          event_category: 'pwa',
          event_label: locale,
        });
      }
    } catch (error) {
      console.error('Installation failed:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();

    // Track dismissal
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'pwa_install_dismissed', {
        event_category: 'pwa',
        event_label: locale,
      });
    }
  };

  // Banner variant (top of page)
  if (variant === 'banner') {
    return (
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 relative">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-2 rounded-lg">
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <div className="font-semibold">{t.title}</div>
              <div className="text-blue-100 text-sm">{t.subtitle}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="bg-white/20 hover:bg-white/30 text-white border-0"
            >
              {t.details}
            </Button>
            <Button
              size="sm"
              onClick={handleInstall}
              disabled={isInstalling}
              className="bg-white text-blue-600 hover:bg-blue-50"
            >
              {isInstalling ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full mr-2" />
                  {t.installing}
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  {t.install}
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Expandable details */}
        {showDetails && (
          <div className="mt-4 pt-4 border-t border-white/20">
            <div className="grid md:grid-cols-4 gap-4 max-w-4xl">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-200" />
                <span className="text-sm">{t.features.offline}</span>
              </div>
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-blue-200" />
                <span className="text-sm">{t.features.notifications}</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-blue-200" />
                <span className="text-sm">{t.features.performance}</span>
              </div>
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-blue-200" />
                <span className="text-sm">{t.features.homescreen}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Modal variant (popup)
  if (variant === 'modal') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Smartphone className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">{t.title}</h3>
              <p className="text-gray-600">{t.subtitle}</p>
            </div>

            <div className="space-y-3 mb-6">
              {t.benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-sm">{benefit}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleInstall}
                disabled={isInstalling}
                className="flex-1"
              >
                {isInstalling ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    {t.installing}
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    {t.install}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleDismiss}
                className="flex-1"
              >
                {t.dismiss}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Inline variant (within page content)
  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Smartphone className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">{t.title}</h4>
              <p className="text-gray-600 text-sm">{t.subtitle}</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {t.benefits.map((benefit, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
              <span className="text-sm text-gray-700">{benefit}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleInstall}
            disabled={isInstalling}
            size="sm"
            className="flex-1"
          >
            {isInstalling ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                {t.installing}
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                {t.install}
              </>
            )}
          </Button>
          <Badge variant="secondary" className="text-xs px-3 py-1">
            {locale === 'en' ? 'Free' : 'Δωρεάν'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
