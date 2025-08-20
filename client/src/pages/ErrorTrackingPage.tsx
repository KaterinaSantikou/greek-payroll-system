/**
 * Error Tracking Page
 * Main page for real-time error tracking and monitoring system
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ErrorTrackingDashboard from '@/components/ErrorTrackingDashboard';
import ErrorAnalytics from '@/components/ErrorAnalytics';
import {
  Bug,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Globe,
  ArrowRight,
  Shield,
  Zap,
  Clock,
  Target,
  TrendingUp,
  Activity
} from 'lucide-react';

type View = 'landing' | 'dashboard' | 'analytics';

export default function ErrorTrackingPage() {
  const [view, setView] = useState<View>('landing');
  const [locale, setLocale] = useState<'en' | 'el'>('en');

  const translations = {
    en: {
      title: 'Real-Time Error Tracking',
      subtitle: 'Fix issues before customers notice - Comprehensive error monitoring and resolution',
      hero: {
        title: 'Proactive Error Management for Greek Payroll Systems',
        subtitle: 'Advanced real-time error tracking designed specifically for critical Greek payroll operations, government integrations, and SEPA payment processing.',
        cta: 'View Error Dashboard',
        ctaSecondary: 'Explore Analytics'
      },
      features: {
        title: 'Mission-Critical Error Management',
        realTime: {
          title: 'Real-Time Detection',
          description: 'Instant error detection and alerting across all PayrollSync components and Greek integrations.'
        },
        analytics: {
          title: 'Advanced Analytics',
          description: 'Deep insights into error patterns, resolution performance, and business impact analysis.'
        },
        integration: {
          title: 'Greek System Integration',
          description: 'Specialized monitoring for ERGANI II, e-EFKA, and Greek banking system connections.'
        },
        resolution: {
          title: 'Automated Resolution',
          description: 'AI-powered error classification, automated assignment, and resolution workflow management.'
        }
      },
      benefits: {
        title: 'Why Real-Time Error Tracking is Critical for Greek Payroll',
        compliance: {
          title: 'Government Compliance Protection',
          description: 'Prevent compliance violations with ERGANI II and e-EFKA through immediate error detection and resolution.'
        },
        customer: {
          title: 'Customer Experience Excellence',
          description: 'Fix issues before they impact employees and HR teams, maintaining trust in payroll accuracy.'
        },
        business: {
          title: 'Business Continuity Assurance',
          description: 'Minimize payroll disruptions and financial losses through proactive error management.'
        }
      },
      stats: {
        mttr: 'Mean Time to Resolution',
        uptime: 'System Uptime',
        errorRate: 'Error Rate',
        resolution: 'Resolution Rate'
      }
    },
    el: {
      title: 'Παρακολούθηση Σφαλμάτων σε Πραγματικό Χρόνο',
      subtitle: 'Διορθώστε προβλήματα πριν τα παρατηρήσουν οι πελάτες - Ολοκληρωμένη παρακολούθηση και επίλυση σφαλμάτων',
      hero: {
        title: 'Προληπτική Διαχείριση Σφαλμάτων για Ελληνικά Συστήματα Μισθοδοσίας',
        subtitle: 'Προηγμένη παρακολούθηση σφαλμάτων σε πραγματικό χρόνο σχεδιασμένη ειδικά για κρίσιμες ελληνικές λειτουργίες μισθοδοσίας, κυβερνητικές ενσωματώσεις και επεξεργασία πληρωμών SEPA.',
        cta: 'Προβολή Πίνακα Σφαλμάτων',
        ctaSecondary: 'Εξερεύνηση Αναλυτικών'
      },
      features: {
        title: 'Διαχείριση Σφαλμάτων Κρίσιμης Αποστολής',
        realTime: {
          title: 'Ανίχνευση σε Πραγματικό Χρόνο',
          description: 'Άμεση ανίχνευση και ειδοποίηση σφαλμάτων σε όλα τα στοιχεία PayrollSync και ελληνικές ενσωματώσεις.'
        },
        analytics: {
          title: 'Προηγμένα Αναλυτικά',
          description: 'Βαθιά insights σε μοτίβα σφαλμάτων, απόδοση επίλυσης και ανάλυση επιχειρηματικού αντίκτυπου.'
        },
        integration: {
          title: 'Ενσωμάτωση Ελληνικών Συστημάτων',
          description: 'Εξειδικευμένη παρακολούθηση για συνδέσεις ΕΡΓΑΝΗ ΙΙ, e-ΕΦΚΑ και ελληνικών τραπεζικών συστημάτων.'
        },
        resolution: {
          title: 'Αυτοματοποιημένη Επίλυση',
          description: 'Κατηγοριοποίηση σφαλμάτων με AI, αυτοματοποιημένη ανάθεση και διαχείριση ροής εργασίας επίλυσης.'
        }
      },
      benefits: {
        title: 'Γιατί η Παρακολούθηση Σφαλμάτων σε Πραγματικό Χρόνο είναι Κρίσιμη για την Ελληνική Μισθοδοσία',
        compliance: {
          title: 'Προστασία Κυβερνητικής Συμμόρφωσης',
          description: 'Αποφύγετε παραβιάσεις συμμόρφωσης με ΕΡΓΑΝΗ ΙΙ και e-ΕΦΚΑ μέσω άμεσης ανίχνευσης και επίλυσης σφαλμάτων.'
        },
        customer: {
          title: 'Αριστεία Εμπειρίας Πελάτη',
          description: 'Διορθώστε προβλήματα πριν επηρεάσουν υπαλλήλους και ομάδες HR, διατηρώντας την εμπιστοσύνη στην ακρίβεια μισθοδοσίας.'
        },
        business: {
          title: 'Διασφάλιση Επιχειρηματικής Συνέχειας',
          description: 'Ελαχιστοποιήστε τις διαταραχές μισθοδοσίας και τις οικονομικές απώλειες μέσω προληπτικής διαχείρισης σφαλμάτων.'
        }
      },
      stats: {
        mttr: 'Μέσος Χρόνος Επίλυσης',
        uptime: 'Χρόνος Λειτουργίας Συστήματος',
        errorRate: 'Ποσοστό Σφαλμάτων',
        resolution: 'Ποσοστό Επίλυσης'
      }
    }
  };

  const t = translations[locale];

  if (view === 'dashboard') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Button variant="ghost" onClick={() => setView('landing')}>
              ← Back to Error Tracking Overview
            </Button>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => setView('analytics')}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Button>
              <Button variant="outline" onClick={() => setLocale(locale === 'en' ? 'el' : 'en')}>
                <Globe className="h-4 w-4 mr-2" />
                {locale === 'en' ? 'EL' : 'EN'}
              </Button>
            </div>
          </div>
        </div>
        <ErrorTrackingDashboard locale={locale} />
      </div>
    );
  }

  if (view === 'analytics') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Button variant="ghost" onClick={() => setView('landing')}>
              ← Back to Error Tracking Overview
            </Button>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => setView('dashboard')}>
                <Bug className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
              <Button variant="outline" onClick={() => setLocale(locale === 'en' ? 'el' : 'en')}>
                <Globe className="h-4 w-4 mr-2" />
                {locale === 'en' ? 'EL' : 'EN'}
              </Button>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Error Analytics & Insights</h1>
            <p className="text-gray-600">Deep analysis of error patterns and resolution performance</p>
          </div>
          <ErrorAnalytics locale={locale} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-gray-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
              <p className="text-gray-600">{t.subtitle}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => setLocale(locale === 'en' ? 'el' : 'en')}
            >
              <Globe className="h-4 w-4 mr-2" />
              {locale === 'en' ? 'EL' : 'EN'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-red-100 text-red-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Bug className="h-4 w-4" />
            Real-Time Error Tracking System
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
            {t.hero.title}
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-10 leading-relaxed">
            {t.hero.subtitle}
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button 
              size="lg" 
              className="px-8 py-3 text-lg bg-red-600 hover:bg-red-700"
              onClick={() => setView('dashboard')}
            >
              <Bug className="h-5 w-5 mr-2" />
              {t.hero.cta}
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="px-8 py-3 text-lg"
              onClick={() => setView('analytics')}
            >
              <BarChart3 className="h-5 w-5 mr-2" />
              {t.hero.ctaSecondary}
            </Button>
          </div>
        </div>

        {/* Performance Stats */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-2xl p-8 mb-16">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold mb-2 text-green-400">14.5m</div>
              <div className="text-gray-300">{t.stats.mttr}</div>
              <div className="text-sm text-green-300 mt-1">-35% improvement</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2 text-blue-400">99.97%</div>
              <div className="text-gray-300">{t.stats.uptime}</div>
              <div className="text-sm text-blue-300 mt-1">30-day average</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2 text-yellow-400">0.12%</div>
              <div className="text-gray-300">{t.stats.errorRate}</div>
              <div className="text-sm text-yellow-300 mt-1">Below target</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2 text-purple-400">92.3%</div>
              <div className="text-gray-300">{t.stats.resolution}</div>
              <div className="text-sm text-purple-300 mt-1">Above target</div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            {t.features.title}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div 
              className="text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
              onClick={() => setView('dashboard')}
            >
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Zap className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">{t.features.realTime.title}</h3>
              <p className="text-gray-600 leading-relaxed">{t.features.realTime.description}</p>
            </div>

            <div 
              className="text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
              onClick={() => setView('analytics')}
            >
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <BarChart3 className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">{t.features.analytics.title}</h3>
              <p className="text-gray-600 leading-relaxed">{t.features.analytics.description}</p>
            </div>

            <div className="text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Globe className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">{t.features.integration.title}</h3>
              <p className="text-gray-600 leading-relaxed">{t.features.integration.description}</p>
            </div>

            <div className="text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Target className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">{t.features.resolution.title}</h3>
              <p className="text-gray-600 leading-relaxed">{t.features.resolution.description}</p>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            {t.benefits.title}
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">{t.benefits.compliance.title}</h3>
              <p className="text-gray-600 leading-relaxed">{t.benefits.compliance.description}</p>
            </div>

            <div className="p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-6">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">{t.benefits.customer.title}</h3>
              <p className="text-gray-600 leading-relaxed">{t.benefits.customer.description}</p>
            </div>

            <div className="p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-6">
                <Activity className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">{t.benefits.business.title}</h3>
              <p className="text-gray-600 leading-relaxed">{t.benefits.business.description}</p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white text-center rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Eliminate Payroll System Errors?
          </h2>
          <p className="text-xl text-red-100 mb-8 max-w-2xl mx-auto">
            Start monitoring your Greek payroll systems in real-time and resolve issues before they impact your business.
          </p>
          <div className="flex items-center justify-center gap-6">
            <Button 
              size="lg" 
              className="bg-white text-red-600 hover:bg-gray-100 px-8 py-3"
              onClick={() => setView('dashboard')}
            >
              <Bug className="h-5 w-5 mr-2" />
              Start Error Monitoring
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="border-white text-white hover:bg-white hover:text-red-600 px-8 py-3"
              onClick={() => setView('analytics')}
            >
              <BarChart3 className="h-5 w-5 mr-2" />
              View Error Analytics
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}