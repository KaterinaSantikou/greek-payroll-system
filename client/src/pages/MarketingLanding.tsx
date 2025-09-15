/**
 * High-Converting PayrollSync Marketing Landing Page
 * Following best practices from Gusto, ADP, QuickBooks Payroll, and Rippling
 * Optimized for Greek market with local compliance features
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import InteractiveDemo from '@/components/InteractiveDemo';
import {
  Clock,
  FileCheck,
  Users,
  Zap,
  Shield,
  Star,
  Check,
  Play,
  ArrowRight,
  Globe,
  CreditCard,
  BarChart3,
  Settings,
  Lock,
  Award,
  Phone,
} from 'lucide-react';

interface LandingPageProps {
  locale?: 'en' | 'el';
}

export default function MarketingLanding(props: any) {
  const [locale, setLocale] = useState<'en' | 'el'>('en');
  const [stickyVisible, setStickyVisible] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  // Sticky CTA visibility on scroll
  useEffect(() => {
    const handleScroll = () => {
      setStickyVisible(window.scrollY > 800);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const t = locale === 'el' ? translations.el : translations.en;

  // Show interactive demo if requested
  if (showDemo) {
    return <InteractiveDemo onClose={() => setShowDemo(false)} />;
  }

  const handleCTAClick = (type: 'start_free' | 'demo') => {
    // Analytics tracking
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', `cta_click:${type}`, {
        event_category: 'landing',
        event_label: locale,
      });
    }

    if (type === 'start_free') {
      window.location.href = '/signup';
    } else {
      // Open interactive demo
      setShowDemo(true);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Language Toggle */}
      <div className="fixed top-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLocale(locale === 'en' ? 'el' : 'en')}
          className="bg-white border-gray-200"
        >
          <Globe className="h-4 w-4 mr-2" />
          {locale === 'en' ? 'EL' : 'EN'}
        </Button>
      </div>

      {/* Sticky CTA */}
      {stickyVisible && (
        <div className="fixed bottom-0 left-0 right-0 bg-blue-600 text-white p-4 shadow-lg z-40 md:hidden">
          <div className="flex gap-3">
            <Button
              className="flex-1 bg-white text-blue-600 hover:bg-gray-100"
              onClick={() => handleCTAClick('start_free')}
            >
              {t.cta.primary}
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-white text-white hover:bg-blue-700"
              onClick={() => handleCTAClick('demo')}
            >
              {t.cta.demo}
            </Button>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-6 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
              {t.hero.headline}
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              {t.hero.subline}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Button
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-6"
                onClick={() => handleCTAClick('start_free')}
              >
                {t.cta.primary}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-6 border-2"
                onClick={() => handleCTAClick('demo')}
              >
                <Play className="mr-2 h-5 w-5" />
                {t.cta.demo}
              </Button>
            </div>

            {/* Trust Strip */}
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star
                    key={i}
                    className="h-4 w-4 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>
              <span>{t.trust.rating}</span>
            </div>
          </div>

          {/* Hero Visual */}
          <div className="relative">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-8">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">
                    PayrollSync Dashboard
                  </h3>
                  <Badge className="bg-green-100 text-green-800">Live</Badge>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Employees</span>
                    <span className="font-semibold">245</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Monthly Payroll</span>
                    <span className="font-semibold">€485,320</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">ERGANI Submissions</span>
                    <span className="text-green-600 font-semibold">
                      ✓ Automated
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Greek Compliance Bar */}
      <section className="py-6 bg-gray-50 border-y">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-wrap justify-center gap-4">
            {t.compliance.items.map((item, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="px-4 py-2 text-sm bg-blue-100 text-blue-800"
              >
                <Check className="h-4 w-4 mr-2" />
                {item}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* Value Cards */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            {t.features.title}
          </h2>
          <p className="text-xl text-gray-600">{t.features.subtitle}</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {t.features.cards.map((feature, index) => {
            const icons = [Zap, Clock, Users, Settings];
            const Icon = icons[index];

            return (
              <Card
                key={index}
                className="p-6 hover:shadow-lg transition-shadow"
              >
                <CardContent className="p-0">
                  <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gray-50 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              {t.howItWorks.title}
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {t.howItWorks.steps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                  {index + 1}
                </div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            {t.social.title}
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {t.social.testimonials.map((testimonial, index) => (
            <Card key={index} className="p-6">
              <CardContent className="p-0">
                <div className="flex items-center gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>
                <p className="text-gray-600 mb-4">"{testimonial.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="bg-gray-200 w-10 h-10 rounded-full"></div>
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-gray-600">
                      {testimonial.role}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Customer Logos */}
        <div className="text-center">
          <p className="text-gray-600 mb-8">{t.social.trustedBy}</p>
          <div className="flex justify-center items-center gap-8 opacity-60">
            {/* Placeholder for customer logos */}
            <div className="bg-gray-200 h-12 w-32 rounded"></div>
            <div className="bg-gray-200 h-12 w-32 rounded"></div>
            <div className="bg-gray-200 h-12 w-32 rounded"></div>
            <div className="bg-gray-200 h-12 w-32 rounded"></div>
          </div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="py-20 bg-blue-50 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            {t.pricing.title}
          </h2>
          <p className="text-xl text-gray-600 mb-8">{t.pricing.subtitle}</p>

          <div className="bg-white rounded-2xl p-8 shadow-lg inline-block">
            <div className="text-5xl font-bold text-blue-600 mb-2">€15</div>
            <div className="text-gray-600 mb-4">{t.pricing.perEmployee}</div>
            <ul className="text-left space-y-2 mb-6">
              {t.pricing.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Button size="lg" className="w-full bg-blue-600 hover:bg-blue-700">
              {t.pricing.cta}
            </Button>
          </div>
        </div>
      </section>

      {/* Security & Reliability */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            {t.security.title}
          </h2>
        </div>

        <div className="grid md:grid-cols-4 gap-8 text-center">
          {t.security.features.map((feature, index) => {
            const icons = [Shield, Lock, Award, BarChart3];
            const Icon = icons[index];

            return (
              <div key={index}>
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-bold mb-6">{t.finalCTA.headline}</h2>
          <p className="text-xl mb-8 opacity-90">{t.finalCTA.subline}</p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button
              size="lg"
              className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-6"
              onClick={() => handleCTAClick('start_free')}
            >
              {t.cta.primary}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-blue-600 text-lg px-8 py-6"
              onClick={() => handleCTAClick('demo')}
            >
              <Phone className="mr-2 h-5 w-5" />
              {t.finalCTA.salesCall}
            </Button>
          </div>

          <p className="text-sm opacity-75">{t.finalCTA.noCredit}</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">PayrollSync</h3>
              <p className="text-gray-400">{t.footer.description}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t.footer.product}</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Security
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t.footer.support}</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Contact
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Status
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t.footer.legal}</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white">
                    Privacy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Terms
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    GDPR
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>&copy; 2025 PayrollSync. {t.footer.rights}</p>
            <p className="mt-2">{t.footer.gdpr}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Translations for bilingual support
const translations = {
  en: {
    hero: {
      headline: 'Run payroll in minutes. Filings done for you.',
      subline:
        'Automated taxes & forms, ERGANI II and Digital Work Card compliance, instant SEPA payouts.',
    },
    cta: {
      primary: 'Start free',
      demo: 'Watch 1-min demo',
    },
    trust: {
      rating: 'Trusted by 500+ Greek businesses',
    },
    compliance: {
      items: [
        'ERGANI II',
        'Digital Work Card',
        'ΑΠΔ/ΦΜΥ',
        'SEPA Alerts',
        'e-EFKA',
      ],
    },
    features: {
      title: 'Everything you need for Greek payroll',
      subtitle: 'Automated compliance, seamless integrations, happy employees',
      cards: [
        {
          title: 'We calculate & file',
          description:
            'Greek taxes, social security, and all government filings handled automatically.',
        },
        {
          title: 'Hours flow into payroll',
          description:
            'PTO, holidays, and timesheets sync directly from your time tracking system.',
        },
        {
          title: 'Employee self-service',
          description:
            'Employees view pay stubs, update details, and request time off themselves.',
        },
        {
          title: 'Works with your apps',
          description:
            'Integrates with QuickBooks, Xero, and popular time tracking tools.',
        },
      ],
    },
    howItWorks: {
      title: 'How it works',
      steps: [
        {
          title: 'Connect company & time',
          description: 'Link your business and time tracking',
        },
        {
          title: 'Review hours & exceptions',
          description: 'Check timesheets and handle any issues',
        },
        { title: 'Run payroll', description: 'Auto-calculate taxes and forms' },
        {
          title: 'Pay & File',
          description: 'SEPA payments and ΑΠΔ/ΦΜΥ filing',
        },
      ],
    },
    social: {
      title: 'Trusted by Greek businesses',
      trustedBy: 'Trusted by hotels, restaurants, and businesses across Greece',
      testimonials: [
        {
          quote:
            'Payroll went from 6 hours to 15 minutes. Zero errors with ERGANI filings.',
          name: 'Maria Kouris',
          role: 'HR Director, Aegean Hotels',
        },
        {
          quote:
            'The Greek compliance automation saves us €2,000 monthly in accounting fees.',
          name: 'Dimitris Stavros',
          role: 'CFO, Mykonos Restaurants',
        },
        {
          quote:
            'Our employees love the self-service portal. No more payroll questions!',
          name: 'Elena Papadaki',
          role: 'Operations Manager',
        },
      ],
    },
    pricing: {
      title: 'Simple, transparent pricing',
      subtitle: 'Per company + per employee. No hidden fees.',
      perEmployee: 'per employee/month',
      features: [
        'Unlimited payroll runs',
        'All Greek compliance',
        'Employee self-service',
        'SEPA payments included',
      ],
      cta: 'Start free trial',
    },
    security: {
      title: 'Security & reliability you can trust',
      features: [
        {
          title: 'ISO 27001 Certified',
          description: 'Enterprise-grade security standards',
        },
        {
          title: 'EU Data Residency',
          description: 'Your data stays in Europe',
        },
        {
          title: '99.99% Uptime',
          description: 'Reliable payroll, every time',
        },
        {
          title: 'Role-based Access',
          description: 'Granular permissions and MFA',
        },
      ],
    },
    finalCTA: {
      headline: 'Run your first payroll this week',
      subline: 'Join hundreds of Greek businesses automating their payroll',
      salesCall: 'Talk to sales',
      noCredit: 'No credit card required • Free 30-day trial',
    },
    footer: {
      description: 'The modern payroll platform for Greek businesses',
      product: 'Product',
      support: 'Support',
      legal: 'Legal',
      rights: 'All rights reserved.',
      gdpr: 'GDPR compliant • EU data residency',
    },
  },
  el: {
    hero: {
      headline: 'Μισθοδοσία σε λίγα λεπτά. Δηλώσεις αυτόματα.',
      subline:
        'Αυτόματοι φόροι & έντυπα, συμμόρφωση με ΕΡΓΑΝΗ ΙΙ και Ψηφιακή Κάρτα, άμεσες πληρωμές SEPA.',
    },
    cta: {
      primary: 'Ξεκινήστε δωρεάν',
      demo: 'Δείτε demo',
    },
    trust: {
      rating: 'Εμπιστεύονται 500+ ελληνικές επιχειρήσεις',
    },
    compliance: {
      items: [
        'ΕΡΓΑΝΗ ΙΙ',
        'Ψηφιακή Κάρτα',
        'ΑΠΔ/ΦΜΥ',
        'Ειδοποιήσεις SEPA',
        'e-ΕΦΚΑ',
      ],
    },
    features: {
      title: 'Όλα όσα χρειάζεστε για ελληνική μισθοδοσία',
      subtitle:
        'Αυτόματη συμμόρφωση, απρόσκοπτες ενσωματώσεις, ευτυχισμένοι υπάλληλοι',
      cards: [
        {
          title: 'Υπολογίζουμε & κατατίθουμε',
          description:
            'Ελληνικοί φόροι, κοινωνική ασφάλιση και όλες οι κρατικές δηλώσεις αυτόματα.',
        },
        {
          title: 'Ώρες εργασίας στη μισθοδοσία',
          description:
            'Άδειες, αργίες και ωράρια συγχρονίζονται απευθείας από το σύστημά σας.',
        },
        {
          title: 'Αυτοεξυπηρέτηση υπαλλήλων',
          description:
            'Οι υπάλληλοι βλέπουν μισθοδοτικά, ενημερώνουν στοιχεία και αιτούνται άδειες.',
        },
        {
          title: 'Συνδυάζεται με τις εφαρμογές σας',
          description:
            'Ενσωματώνεται με QuickBooks, Xero και δημοφιλή εργαλεία χρονομέτρησης.',
        },
      ],
    },
    howItWorks: {
      title: 'Πώς λειτουργεί',
      steps: [
        {
          title: 'Σύνδεση εταιρείας & χρόνου',
          description: 'Συνδέστε την επιχείρησή σας και το χρονοδιάγραμμα',
        },
        {
          title: 'Έλεγχος ωρών & εξαιρέσεων',
          description: 'Ελέγξτε τα φύλλα χρόνου και χειριστείτε προβλήματα',
        },
        {
          title: 'Εκτέλεση μισθοδοσίας',
          description: 'Αυτόματος υπολογισμός φόρων και εντύπων',
        },
        {
          title: 'Πληρωμή & Δήλωση',
          description: 'Πληρωμές SEPA και δήλωση ΑΠΔ/ΦΜΥ',
        },
      ],
    },
    social: {
      title: 'Εμπιστεύονται ελληνικές επιχειρήσεις',
      trustedBy:
        'Εμπιστεύονται ξενοδοχεία, εστιατόρια και επιχειρήσεις σε όλη την Ελλάδα',
      testimonials: [
        {
          quote:
            'Η μισθοδοσία από 6 ώρες έγινε 15 λεπτά. Μηδέν λάθη με τις δηλώσεις ΕΡΓΑΝΗ.',
          name: 'Μαρία Κούρη',
          role: 'Διευθύντρια HR, Aegean Hotels',
        },
        {
          quote:
            'Η αυτοματοποίηση της ελληνικής συμμόρφωσης μας εξοικονομεί €2.000 μηνιαίως.',
          name: 'Δημήτρης Σταύρος',
          role: 'CFO, Mykonos Restaurants',
        },
        {
          quote:
            'Οι υπάλληλοί μας αγαπούν την αυτοεξυπηρέτηση. Τέλος οι ερωτήσεις μισθοδοσίας!',
          name: 'Έλενα Παπαδάκη',
          role: 'Διευθύντρια Λειτουργιών',
        },
      ],
    },
    pricing: {
      title: 'Απλή, διαφανής τιμολόγηση',
      subtitle: 'Ανά εταιρεία + ανά υπάλληλο. Χωρίς κρυφές χρεώσεις.',
      perEmployee: 'ανά υπάλληλο/μήνα',
      features: [
        'Απεριόριστες εκτελέσεις μισθοδοσίας',
        'Πλήρης ελληνική συμμόρφωση',
        'Αυτοεξυπηρέτηση υπαλλήλων',
        'Πληρωμές SEPA συμπεριλαμβάνονται',
      ],
      cta: 'Ξεκινήστε δωρεάν δοκιμή',
    },
    security: {
      title: 'Ασφάλεια & αξιοπιστία που μπορείτε να εμπιστευτείτε',
      features: [
        {
          title: 'Πιστοποίηση ISO 27001',
          description: 'Πρότυπα ασφαλείας επιχειρηματικού επιπέδου',
        },
        {
          title: 'Κατοικία Δεδομένων ΕΕ',
          description: 'Τα δεδομένα σας μένουν στην Ευρώπη',
        },
        {
          title: '99.99% Χρόνος Λειτουργίας',
          description: 'Αξιόπιστη μισθοδοσία, κάθε φορά',
        },
        {
          title: 'Πρόσβαση Βάσει Ρόλων',
          description: 'Λεπτομερή δικαιώματα και MFA',
        },
      ],
    },
    finalCTA: {
      headline: 'Τρέξτε την πρώτη σας μισθοδοσία αυτή την εβδομάδα',
      subline:
        'Ενωθείτε με εκατοντάδες ελληνικές επιχειρήσεις που αυτοματοποιούν τη μισθοδοσία τους',
      salesCall: 'Επικοινωνία πωλήσεων',
      noCredit: 'Δεν απαιτείται πιστωτική κάρτα • Δωρεάν δοκιμή 30 ημερών',
    },
    footer: {
      description:
        'Η σύγχρονη πλατφόρμα μισθοδοσίας για ελληνικές επιχειρήσεις',
      product: 'Προϊόν',
      support: 'Υποστήριξη',
      legal: 'Νομικά',
      rights: 'Όλα τα δικαιώματα διατηρούνται.',
      gdpr: 'Συμμόρφωση GDPR • Κατοικία δεδομένων ΕΕ',
    },
  },
};
