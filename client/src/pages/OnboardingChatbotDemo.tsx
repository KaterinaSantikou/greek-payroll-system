/**
 * Onboarding Chatbot Demo Page
 * Interactive demonstration of the PayrollSync onboarding assistant
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import OnboardingChatbot from '@/components/OnboardingChatbot';
import {
  MessageCircle,
  Bot,
  Users,
  Building2,
  Shield,
  CreditCard,
  Settings,
  Target,
  Globe,
  Sparkles,
  Zap,
  CheckCircle,
  Clock,
  TrendingUp,
  Star,
} from 'lucide-react';

interface DemoProps {
  locale?: 'en' | 'el';
}

export default function OnboardingChatbotDemo({ locale = 'en' }: DemoProps) {
  const [showChatbot, setShowChatbot] = useState(false);
  const [chatbotMinimized, setChatbotMinimized] = useState(false);
  const [selectedLocale, setSelectedLocale] = useState<'en' | 'el'>(locale);

  const translations = {
    en: {
      title: 'PayrollSync Onboarding Assistant',
      subtitle:
        'Intelligent chatbot that guides new Greek customers through payroll setup',
      hero: {
        title: 'AI-Powered Onboarding for Greek Payroll Systems',
        subtitle:
          'Revolutionary chatbot assistant that transforms complex Greek payroll setup into a simple, guided conversation. Perfect for businesses navigating ERGANI II, e-EFKA, and SEPA compliance.',
        cta: 'Launch Assistant',
        ctaSecondary: 'View Features',
      },
      features: {
        title: 'Smart Onboarding Features',
        intelligent: {
          title: 'Intelligent Guidance',
          description:
            'Context-aware conversations that adapt to your specific Greek business needs and compliance requirements.',
        },
        stepByStep: {
          title: 'Step-by-Step Setup',
          description:
            'Breaks down complex payroll configuration into manageable, sequential steps with progress tracking.',
        },
        compliance: {
          title: 'Greek Compliance Focus',
          description:
            'Expert knowledge of ERGANI II, e-EFKA, AADE, and all Greek payroll regulations built-in.',
        },
        multilingual: {
          title: 'Bilingual Support',
          description:
            'Seamless Greek and English support for international businesses operating in Greece.',
        },
      },
      benefits: {
        title: 'Why an Onboarding Chatbot is Essential for Greek Payroll',
        complexity: {
          title: 'Simplifies Complex Setup',
          description:
            'Greek payroll involves dozens of regulations, government systems, and compliance requirements. Our chatbot makes it conversational and simple.',
        },
        time: {
          title: 'Reduces Setup Time',
          description:
            'Traditional payroll setup takes weeks. Our assistant completes configuration in hours with guided conversations.',
        },
        accuracy: {
          title: 'Ensures Compliance Accuracy',
          description:
            'Built-in knowledge of Greek labor law prevents costly mistakes and ensures perfect compliance from day one.',
        },
      },
      capabilities: {
        title: 'Onboarding Capabilities',
        company: 'Company Registration & AFM Setup',
        employees: 'Employee Data Import & AMKA Validation',
        ergani: 'ERGANI II Digital Work Cards',
        efka: 'e-EFKA Insurance Configuration',
        aade: 'AADE Tax Authority Integration',
        banking: 'SEPA Banking & Salary Payments',
        payroll: 'Greek Payroll Rules & Tax Settings',
        testing: 'First Payroll Run Testing',
      },
      metrics: {
        title: 'Onboarding Performance',
        setupTime: 'Setup Time Reduction',
        satisfaction: 'Customer Satisfaction',
        compliance: 'Compliance Accuracy',
        completion: 'Setup Completion Rate',
      },
      demo: {
        title: 'Interactive Demo',
        description:
          'Experience the onboarding assistant in action. The chatbot will guide you through a complete Greek payroll setup.',
        launch: 'Launch Demo Assistant',
        features: 'Demo Features:',
        feature1: 'Complete Greek compliance walkthrough',
        feature2: 'Interactive government integration testing',
        feature3: 'Real-time progress tracking',
        feature4: 'Bilingual Greek/English support',
        feature5: 'Context-aware help and guidance',
      },
    },
    el: {
      title: 'Βοηθός Εισαγωγής PayrollSync',
      subtitle:
        'Έξυπνο chatbot που καθοδηγεί νέους ελληνικούς πελάτες στη ρύθμιση μισθοδοσίας',
      hero: {
        title:
          'Εισαγωγή με Τεχνητή Νοημοσύνη για Ελληνικά Συστήματα Μισθοδοσίας',
        subtitle:
          'Επαναστατικός βοηθός chatbot που μετατρέπει την περίπλοκη ρύθμιση ελληνικής μισθοδοσίας σε απλή, καθοδηγούμενη συνομιλία. Ιδανικό για επιχειρήσεις που πλοηγούνται στην ΕΡΓΑΝΗ ΙΙ, e-ΕΦΚΑ και συμμόρφωση SEPA.',
        cta: 'Εκκίνηση Βοηθού',
        ctaSecondary: 'Προβολή Χαρακτηριστικών',
      },
      features: {
        title: 'Έξυπνα Χαρακτηριστικά Εισαγωγής',
        intelligent: {
          title: 'Έξυπνη Καθοδήγηση',
          description:
            'Συνομιλίες με αντίληψη περιβάλλοντος που προσαρμόζονται στις συγκεκριμένες ελληνικές επιχειρηματικές ανάγκες και απαιτήσεις συμμόρφωσης.',
        },
        stepByStep: {
          title: 'Βήμα προς Βήμα Ρύθμιση',
          description:
            'Διασπά την περίπλοκη ρύθμιση μισθοδοσίας σε διαχειρίσιμα, διαδοχικά βήματα με παρακολούθηση προόδου.',
        },
        compliance: {
          title: 'Εστίαση σε Ελληνική Συμμόρφωση',
          description:
            'Ενσωματωμένη εξειδικευμένη γνώση ΕΡΓΑΝΗ ΙΙ, e-ΕΦΚΑ, ΑΑΔΕ και όλων των ελληνικών κανονισμών μισθοδοσίας.',
        },
        multilingual: {
          title: 'Δίγλωσση Υποστήριξη',
          description:
            'Απρόσκοπτη υποστήριξη ελληνικών και αγγλικών για διεθνείς επιχειρήσεις που λειτουργούν στην Ελλάδα.',
        },
      },
      benefits: {
        title:
          'Γιατί ένα Chatbot Εισαγωγής είναι Απαραίτητο για την Ελληνική Μισθοδοσία',
        complexity: {
          title: 'Απλοποιεί την Περίπλοκη Ρύθμιση',
          description:
            'Η ελληνική μισθοδοσία περιλαμβάνει δεκάδες κανονισμούς, κυβερνητικά συστήματα και απαιτήσεις συμμόρφωσης. Το chatbot μας την κάνει συνομιλιακή και απλή.',
        },
        time: {
          title: 'Μειώνει τον Χρόνο Ρύθμισης',
          description:
            'Η παραδοσιακή ρύθμιση μισθοδοσίας διαρκεί εβδομάδες. Ο βοηθός μας ολοκληρώνει τη ρύθμιση σε ώρες με καθοδηγούμενες συνομιλίες.',
        },
        accuracy: {
          title: 'Εξασφαλίζει Ακρίβεια Συμμόρφωσης',
          description:
            'Ενσωματωμένη γνώση ελληνικού εργατικού δικαίου αποτρέπει κοστοβόρα λάθη και εξασφαλίζει τέλεια συμμόρφωση από την πρώτη μέρα.',
        },
      },
      capabilities: {
        title: 'Δυνατότητες Εισαγωγής',
        company: 'Εγγραφή Εταιρείας & Ρύθμιση ΑΦΜ',
        employees: 'Εισαγωγή Δεδομένων Υπαλλήλων & Επικύρωση ΑΜΚΑ',
        ergani: 'Ψηφιακές Κάρτες Εργασίας ΕΡΓΑΝΗ ΙΙ',
        efka: 'Ρύθμιση Ασφάλισης e-ΕΦΚΑ',
        aade: 'Ενσωμάτωση Φορολογικής Αρχής ΑΑΔΕ',
        banking: 'Τραπεζικές Υπηρεσίες SEPA & Πληρωμές Μισθών',
        payroll: 'Κανόνες Ελληνικής Μισθοδοσίας & Φορολογικές Ρυθμίσεις',
        testing: 'Δοκιμή Πρώτης Εκτέλεσης Μισθοδοσίας',
      },
      metrics: {
        title: 'Απόδοση Εισαγωγής',
        setupTime: 'Μείωση Χρόνου Ρύθμισης',
        satisfaction: 'Ικανοποίηση Πελάτη',
        compliance: 'Ακρίβεια Συμμόρφωσης',
        completion: 'Ποσοστό Ολοκλήρωσης Ρύθμισης',
      },
      demo: {
        title: 'Διαδραστική Επίδειξη',
        description:
          'Δοκιμάστε τον βοηθό εισαγωγής σε δράση. Το chatbot θα σας καθοδηγήσει σε μια πλήρη ρύθμιση ελληνικής μισθοδοσίας.',
        launch: 'Εκκίνηση Βοηθού Επίδειξης',
        features: 'Χαρακτηριστικά Επίδειξης:',
        feature1: 'Πλήρης περιήγηση ελληνικής συμμόρφωσης',
        feature2: 'Διαδραστική δοκιμή κυβερνητικής ενσωμάτωσης',
        feature3: 'Παρακολούθηση προόδου σε πραγματικό χρόνο',
        feature4: 'Δίγλωσση υποστήριξη ελληνικών/αγγλικών',
        feature5: 'Βοήθεια και καθοδήγηση με αντίληψη περιβάλλοντος',
      },
    },
  };

  const t = translations[selectedLocale];

  const capabilities = [
    { icon: Building2, key: 'company' },
    { icon: Users, key: 'employees' },
    { icon: Shield, key: 'ergani' },
    { icon: Users, key: 'efka' },
    { icon: Settings, key: 'aade' },
    { icon: CreditCard, key: 'banking' },
    { icon: Settings, key: 'payroll' },
    { icon: Target, key: 'testing' },
  ];

  const metrics = [
    {
      label: t.metrics.setupTime,
      value: '85%',
      icon: Clock,
      color: 'text-green-600',
    },
    {
      label: t.metrics.satisfaction,
      value: '98%',
      icon: Star,
      color: 'text-blue-600',
    },
    {
      label: t.metrics.compliance,
      value: '99.9%',
      icon: Shield,
      color: 'text-purple-600',
    },
    {
      label: t.metrics.completion,
      value: '94%',
      icon: CheckCircle,
      color: 'text-orange-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
              <p className="text-gray-600">{t.subtitle}</p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() =>
                  setSelectedLocale(selectedLocale === 'en' ? 'el' : 'en')
                }
              >
                <Globe className="h-4 w-4 mr-2" />
                {selectedLocale === 'en' ? 'EL' : 'EN'}
              </Button>
              <Button
                onClick={() => setShowChatbot(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                {t.demo.launch}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Bot className="h-4 w-4" />
            AI-Powered Greek Payroll Assistant
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
              className="px-8 py-3 text-lg bg-blue-600 hover:bg-blue-700"
              onClick={() => setShowChatbot(true)}
            >
              <Bot className="h-5 w-5 mr-2" />
              {t.hero.cta}
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="px-8 py-3 text-lg"
              onClick={() =>
                document
                  .getElementById('features')
                  ?.scrollIntoView({ behavior: 'smooth' })
              }
            >
              <Sparkles className="h-5 w-5 mr-2" />
              {t.hero.ctaSecondary}
            </Button>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-2xl p-8 mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">
            {t.metrics.title}
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {metrics.map((metric, index) => {
              const Icon = metric.icon;
              return (
                <div key={index} className="text-center">
                  <div
                    className={`text-4xl font-bold mb-2 ${metric.color.replace('text-', 'text-')}`}
                  >
                    {metric.value}
                  </div>
                  <div className="text-gray-300 flex items-center justify-center gap-2">
                    <Icon className="h-4 w-4" />
                    {metric.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Features Section */}
        <div id="features" className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            {t.features.title}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Bot className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.features.intelligent.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.features.intelligent.description}
              </p>
            </div>

            <div className="text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.features.stepByStep.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.features.stepByStep.description}
              </p>
            </div>

            <div className="text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.features.compliance.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.features.compliance.description}
              </p>
            </div>

            <div className="text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Globe className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.features.multilingual.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.features.multilingual.description}
              </p>
            </div>
          </div>
        </div>

        {/* Capabilities Grid */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            {t.capabilities.title}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {capabilities.map((capability, index) => {
              const Icon = capability.icon;
              return (
                <div
                  key={index}
                  className="p-6 bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-6 w-6 text-blue-600" />
                    <span className="font-medium text-sm">
                      {
                        t.capabilities[
                          capability.key as keyof typeof t.capabilities
                        ]
                      }
                    </span>
                  </div>
                </div>
              );
            })}
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
                <Zap className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.benefits.complexity.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.benefits.complexity.description}
              </p>
            </div>

            <div className="p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-6">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.benefits.time.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.benefits.time.description}
              </p>
            </div>

            <div className="p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-6">
                <CheckCircle className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.benefits.accuracy.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.benefits.accuracy.description}
              </p>
            </div>
          </div>
        </div>

        {/* Demo Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-center rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-4">{t.demo.title}</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            {t.demo.description}
          </p>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="text-left">
              <h3 className="font-semibold mb-4">{t.demo.features}</h3>
              <div className="space-y-2 text-blue-100">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  {t.demo.feature1}
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  {t.demo.feature2}
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  {t.demo.feature3}
                </div>
              </div>
            </div>
            <div className="text-left">
              <div className="space-y-2 text-blue-100 mt-8">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  {t.demo.feature4}
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  {t.demo.feature5}
                </div>
              </div>
            </div>
          </div>

          <Button
            size="lg"
            className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3"
            onClick={() => setShowChatbot(true)}
          >
            <MessageCircle className="h-5 w-5 mr-2" />
            {t.demo.launch}
          </Button>
        </div>
      </div>

      {/* Onboarding Chatbot */}
      {showChatbot && (
        <OnboardingChatbot
          locale={selectedLocale}
          onClose={() => setShowChatbot(false)}
          minimized={chatbotMinimized}
          onToggleMinimize={() => setChatbotMinimized(!chatbotMinimized)}
        />
      )}
    </div>
  );
}
