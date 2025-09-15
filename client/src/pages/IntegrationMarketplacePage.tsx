/**
 * Integration Marketplace Page
 * Main page combining marketplace discovery and integration management
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import IntegrationMarketplace from '@/components/IntegrationMarketplace';
import IntegrationManager from '@/components/IntegrationManager';
import {
  Store,
  Settings,
  TrendingUp,
  Users,
  Globe,
  Sparkles,
  ArrowRight,
  CheckCircle,
  Zap,
} from 'lucide-react';

type View = 'landing' | 'marketplace' | 'manager';

export default function IntegrationMarketplacePage() {
  const [view, setView] = useState<View>('landing');
  const [locale, setLocale] = useState<'en' | 'el'>('en');

  const translations = {
    en: {
      title: 'PayrollSync Integration Ecosystem',
      subtitle: "Discover, connect, and amplify your payroll system's power",
      hero: {
        title: 'Build Your Connected Payroll Ecosystem',
        subtitle:
          'Join 5,000+ businesses leveraging our integration network to automate Greek payroll, reduce errors by 99%, and save 20+ hours per month.',
        cta: 'Explore Integrations',
        ctaSecondary: 'Manage Existing',
      },
      benefits: {
        title: 'Why Integration Networks Create Unstoppable Value',
        networkEffects: {
          title: 'Network Effects',
          description:
            'The more integrations you use, the more valuable PayrollSync becomes for your entire business ecosystem.',
        },
        stickiness: {
          title: 'Switching Costs',
          description:
            'Deep integrations across your business make it virtually impossible to switch to competitors.',
        },
        automation: {
          title: 'End-to-End Automation',
          description:
            'Connect every aspect of your HR and business operations for seamless, error-free workflows.',
        },
      },
      stats: {
        integrations: 'Available Integrations',
        connections: 'Active Connections',
        dataFlow: 'Daily Transactions',
        timeSaved: 'Hours Saved Monthly',
      },
      categories: {
        government: 'Government & Compliance',
        banking: 'Banking & Payments',
        hr: 'HR & Workforce',
        accounting: 'Accounting & ERP',
        communication: 'Team Communication',
      },
      marketplace: {
        title: 'Integration Marketplace',
        description: 'Discover new integrations to extend your payroll system',
      },
      manager: {
        title: 'Integration Manager',
        description: 'Monitor and optimize your existing integrations',
      },
    },
    el: {
      title: 'Οικοσύστημα Ενσωματώσεων PayrollSync',
      subtitle:
        'Ανακαλύψτε, συνδέστε και ενισχύστε τη δύναμη του συστήματος μισθοδοσίας σας',
      hero: {
        title: 'Δημιουργήστε το Συνδεδεμένο Οικοσύστημα Μισθοδοσίας σας',
        subtitle:
          'Εγγραφείτε στις 5.000+ επιχειρήσεις που χρησιμοποιούν το δίκτυο ενσωματώσεων μας για αυτοματοποίηση ελληνικής μισθοδοσίας, μείωση σφαλμάτων κατά 99% και εξοικονόμηση 20+ ωρών μηνιαίως.',
        cta: 'Εξερευνήστε Ενσωματώσεις',
        ctaSecondary: 'Διαχειριστείτε Υπάρχουσες',
      },
      benefits: {
        title: 'Γιατί τα Δίκτυα Ενσωματώσεων Δημιουργούν Ασταμάτητη Αξία',
        networkEffects: {
          title: 'Δικτυακές Επιδράσεις',
          description:
            'Όσες περισσότερες ενσωματώσεις χρησιμοποιείτε, τόσο πιο πολύτιμο γίνεται το PayrollSync για ολόκληρο το επιχειρηματικό σας οικοσύστημα.',
        },
        stickiness: {
          title: 'Κόστος Αλλαγής',
          description:
            'Οι βαθιές ενσωματώσεις σε όλη την επιχείρησή σας καθιστούν σχεδόν αδύνατη τη μετάβαση στους ανταγωνιστές.',
        },
        automation: {
          title: 'Αυτοματοποίηση από Άκρο σε Άκρο',
          description:
            'Συνδέστε κάθε πτυχή των HR και επιχειρηματικών σας λειτουργιών για απρόσκοπτες, χωρίς σφάλματα ροές εργασίας.',
        },
      },
      stats: {
        integrations: 'Διαθέσιμες Ενσωματώσεις',
        connections: 'Ενεργές Συνδέσεις',
        dataFlow: 'Ημερήσιες Συναλλαγές',
        timeSaved: 'Ώρες Εξοικονόμησης Μηνιαίως',
      },
      categories: {
        government: 'Κυβέρνηση & Συμμόρφωση',
        banking: 'Τραπεζικά & Πληρωμές',
        hr: 'Ανθρώπινο Δυναμικό',
        accounting: 'Λογιστική & ERP',
        communication: 'Επικοινωνία Ομάδας',
      },
      marketplace: {
        title: 'Αγορά Ενσωματώσεων',
        description:
          'Ανακαλύψτε νέες ενσωματώσεις για επέκταση του συστήματος μισθοδοσίας σας',
      },
      manager: {
        title: 'Διαχειριστής Ενσωματώσεων',
        description:
          'Παρακολουθήστε και βελτιστοποιήστε τις υπάρχουσες ενσωματώσεις σας',
      },
    },
  };

  const t = translations[locale];

  if (view === 'marketplace') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Button variant="ghost" onClick={() => setView('landing')}>
              ← Back to Overview
            </Button>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => setView('manager')}>
                <Settings className="h-4 w-4 mr-2" />
                {t.manager.title}
              </Button>
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
        <IntegrationMarketplace locale={locale} />
      </div>
    );
  }

  if (view === 'manager') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Button variant="ghost" onClick={() => setView('landing')}>
              ← Back to Overview
            </Button>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => setView('marketplace')}>
                <Store className="h-4 w-4 mr-2" />
                {t.marketplace.title}
              </Button>
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
        <IntegrationManager locale={locale} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
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
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            Network Effects Platform
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
              className="px-8 py-3 text-lg"
              onClick={() => setView('marketplace')}
            >
              <Store className="h-5 w-5 mr-2" />
              {t.hero.cta}
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="px-8 py-3 text-lg"
              onClick={() => setView('manager')}
            >
              <Settings className="h-5 w-5 mr-2" />
              {t.hero.ctaSecondary}
            </Button>
          </div>
        </div>

        {/* Stats Section */}
        <Card className="mb-16 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <CardContent className="p-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-4xl font-bold mb-2">50+</div>
                <div className="text-blue-100">{t.stats.integrations}</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold mb-2">25K+</div>
                <div className="text-blue-100">{t.stats.connections}</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold mb-2">500K+</div>
                <div className="text-blue-100">{t.stats.dataFlow}</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold mb-2">240K+</div>
                <div className="text-blue-100">{t.stats.timeSaved}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Benefits Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            {t.benefits.title}
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center p-8 hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.benefits.networkEffects.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.benefits.networkEffects.description}
              </p>
            </Card>

            <Card className="text-center p-8 hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.benefits.stickiness.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.benefits.stickiness.description}
              </p>
            </Card>

            <Card className="text-center p-8 hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Zap className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.benefits.automation.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.benefits.automation.description}
              </p>
            </Card>
          </div>
        </div>

        {/* Integration Categories Preview */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Popular Integration Categories
          </h2>
          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6">
            {Object.entries(t.categories).map(([key, name]) => (
              <Card
                key={key}
                className="text-center p-6 cursor-pointer hover:shadow-lg hover:scale-105 transition-all"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <div className="w-6 h-6 bg-blue-600 rounded" />
                </div>
                <h4 className="font-semibold text-sm">{name}</h4>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <Card className="bg-gradient-to-r from-gray-900 to-gray-800 text-white text-center p-12">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Build Your Integration Network?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Join thousands of Greek businesses who've transformed their payroll
            operations with our integration ecosystem.
          </p>
          <div className="flex items-center justify-center gap-6">
            <Button
              size="lg"
              className="bg-white text-gray-900 hover:bg-gray-100 px-8 py-3"
              onClick={() => setView('marketplace')}
            >
              <Store className="h-5 w-5 mr-2" />
              Browse Marketplace
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-white text-white hover:bg-white hover:text-gray-900 px-8 py-3"
              onClick={() => setView('manager')}
            >
              <Settings className="h-5 w-5 mr-2" />
              Manage Integrations
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
