/**
 * Tax Law Alerts Demo Page
 * Showcase of Greek tax law change notification system
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import TaxLawAlerts from '@/components/TaxLawAlerts';
import {
  Bell,
  AlertTriangle,
  Scale,
  Shield,
  Zap,
  Clock,
  Target,
  FileText,
  Calculator,
  Users,
  Receipt,
  Building,
  Euro,
  Percent,
  TrendingUp,
  BarChart3,
  CheckCircle,
  Globe,
  ArrowRight,
  Eye,
  Activity,
  Star,
  Award,
  BookOpen,
  Flag,
  Calendar,
  Download,
  CreditCard,
  Briefcase,
  RefreshCw,
} from 'lucide-react';

interface DemoProps {
  locale?: 'en' | 'el';
}

export default function TaxLawAlertsDemo({ locale = 'en' }: DemoProps) {
  const [selectedLocale, setSelectedLocale] = useState<'en' | 'el'>(locale);
  const [showFullSystem, setShowFullSystem] = useState(false);

  const translations = {
    en: {
      title: 'Tax Law Alerts',
      subtitle: 'Greek Labor Law Change Notifications',
      hero: {
        title: 'Never Miss Critical Greek Tax Law Changes',
        subtitle:
          'Comprehensive monitoring system that tracks all Greek tax and labor law modifications, providing instant alerts and compliance guidance to ensure your organization stays current with the latest regulatory requirements.',
        cta: 'Launch Tax Alert System',
        ctaSecondary: 'Explore Features',
      },
      features: {
        title: 'Comprehensive Tax Law Monitoring Features',
        realTimeMonitoring: {
          title: 'Real-Time Monitoring',
          description:
            'Continuous tracking of Greek tax law changes from official sources including Ministry of Finance, AADE, and EFKA.',
        },
        instantAlerts: {
          title: 'Instant Alerts',
          description:
            'Immediate notifications for critical tax law changes with impact assessment and required compliance actions.',
        },
        complianceGuidance: {
          title: 'Compliance Guidance',
          description:
            'Step-by-step compliance instructions and automated task creation to ensure timely implementation.',
        },
        impactAssessment: {
          title: 'Impact Assessment',
          description:
            'Intelligent analysis of how tax law changes affect your organization, employees, and compliance obligations.',
        },
      },
      benefits: {
        title: 'Why Tax Law Alerts Transform Compliance',
        proactiveCompliance: {
          title: 'Proactive Compliance',
          description:
            'Stay ahead of tax law changes with advance notifications and automated compliance task generation.',
        },
        riskMitigation: {
          title: 'Risk Mitigation',
          description:
            'Prevent costly penalties and violations through immediate awareness of critical regulatory changes.',
        },
        operationalEfficiency: {
          title: 'Operational Efficiency',
          description:
            'Reduce compliance workload by 70% with automated monitoring, categorization, and task assignment.',
        },
      },
      categories: {
        title: 'Monitored Tax Law Categories',
        incomeTax: 'Income Tax Changes',
        socialSecurity: 'Social Security Updates',
        vat: 'VAT Rate Modifications',
        corporateTax: 'Corporate Tax Rules',
        payrollTax: 'Payroll Tax Changes',
        withholdingTax: 'Withholding Tax Updates',
        laborLaw: 'Labor Law Modifications',
        complianceRules: 'Compliance Requirements',
      },
      alertTypes: {
        title: 'Types of Tax Law Alerts',
        immediate: 'Immediate Critical Alerts',
        reminder: 'Compliance Reminders',
        deadline: 'Deadline Notifications',
        analysis: 'Impact Analysis Reports',
        updates: 'Regular Update Digests',
        training: 'Training Requirements',
      },
      performance: {
        title: 'Tax Law Alert Performance',
        changesTracked: 'Changes Tracked',
        alertSpeed: 'Alert Speed',
        complianceRate: 'Compliance Rate',
        accuracyRate: 'Accuracy Rate',
      },
      industries: {
        title: 'Industry Applications',
        hospitality: 'Hotels & Tourism',
        retail: 'Retail & Commerce',
        manufacturing: 'Manufacturing',
        services: 'Professional Services',
        healthcare: 'Healthcare',
        technology: 'Technology & IT',
      },
    },
    el: {
      title: 'Ειδοποιήσεις Φορολογικών Νόμων',
      subtitle: 'Ειδοποιήσεις Αλλαγών Ελληνικού Εργατικού Δικαίου',
      hero: {
        title:
          'Μη Χάσετε Ποτέ Κρίσιμες Αλλαγές των Ελληνικών Φορολογικών Νόμων',
        subtitle:
          'Περιεκτικό σύστημα παρακολούθησης που εντοπίζει όλες τις τροποποιήσεις των ελληνικών φορολογικών και εργατικών νόμων, παρέχοντας άμεσες ειδοποιήσεις και οδηγίες συμμόρφωσης για να διασφαλίζει ότι ο οργανισμός σας παραμένει ενημερωμένος με τις τελευταίες κανονιστικές απαιτήσεις.',
        cta: 'Εκκίνηση Συστήματος Φορολογικών Ειδοποιήσεων',
        ctaSecondary: 'Εξερεύνηση Χαρακτηριστικών',
      },
      features: {
        title: 'Περιεκτικά Χαρακτηριστικά Παρακολούθησης Φορολογικών Νόμων',
        realTimeMonitoring: {
          title: 'Παρακολούθηση Πραγματικού Χρόνου',
          description:
            'Συνεχής παρακολούθηση αλλαγών ελληνικών φορολογικών νόμων από επίσημες πηγές συμπεριλαμβανομένου του Υπουργείου Οικονομικών, ΑΑΔΕ και e-ΕΦΚΑ.',
        },
        instantAlerts: {
          title: 'Άμεσες Ειδοποιήσεις',
          description:
            'Άμεσες ειδοποιήσεις για κρίσιμες αλλαγές φορολογικών νόμων με αξιολόγηση επιπτώσεων και απαιτούμενες ενέργειες συμμόρφωσης.',
        },
        complianceGuidance: {
          title: 'Οδηγίες Συμμόρφωσης',
          description:
            'Βήμα προς βήμα οδηγίες συμμόρφωσης και αυτοματοποιημένη δημιουργία εργασιών για διασφάλιση έγκαιρης υλοποίησης.',
        },
        impactAssessment: {
          title: 'Αξιολόγηση Επιπτώσεων',
          description:
            'Έξυπνη ανάλυση του πώς οι αλλαγές φορολογικών νόμων επηρεάζουν τον οργανισμό σας, τους εργαζομένους και τις υποχρεώσεις συμμόρφωσης.',
        },
      },
      benefits: {
        title:
          'Γιατί οι Ειδοποιήσεις Φορολογικών Νόμων Μεταμορφώνουν τη Συμμόρφωση',
        proactiveCompliance: {
          title: 'Προληπτική Συμμόρφωση',
          description:
            'Προηγηθείτε των αλλαγών φορολογικών νόμων με προκαταρκτικές ειδοποιήσεις και αυτοματοποιημένη δημιουργία εργασιών συμμόρφωσης.',
        },
        riskMitigation: {
          title: 'Μείωση Κινδύνων',
          description:
            'Αποτρέψτε κοστοβόρα πρόστιμα και παραβάσεις μέσω άμεσης ενημέρωσης για κρίσιμες κανονιστικές αλλαγές.',
        },
        operationalEfficiency: {
          title: 'Λειτουργική Αποδοτικότητα',
          description:
            'Μειώστε τον φόρτο εργασίας συμμόρφωσης κατά 70% με αυτοματοποιημένη παρακολούθηση, κατηγοριοποίηση και ανάθεση εργασιών.',
        },
      },
      categories: {
        title: 'Παρακολουθούμενες Κατηγορίες Φορολογικών Νόμων',
        incomeTax: 'Αλλαγές Φόρου Εισοδήματος',
        socialSecurity: 'Ενημερώσεις Κοινωνικής Ασφάλισης',
        vat: 'Τροποποιήσεις Συντελεστών ΦΠΑ',
        corporateTax: 'Κανόνες Εταιρικού Φόρου',
        payrollTax: 'Αλλαγές Φόρου Μισθοδοσίας',
        withholdingTax: 'Ενημερώσεις Παρακράτησης Φόρου',
        laborLaw: 'Τροποποιήσεις Εργατικού Δικαίου',
        complianceRules: 'Απαιτήσεις Συμμόρφωσης',
      },
      alertTypes: {
        title: 'Τύποι Ειδοποιήσεων Φορολογικών Νόμων',
        immediate: 'Άμεσες Κρίσιμες Ειδοποιήσεις',
        reminder: 'Υπενθυμίσεις Συμμόρφωσης',
        deadline: 'Ειδοποιήσεις Προθεσμιών',
        analysis: 'Αναφορές Ανάλυσης Επιπτώσεων',
        updates: 'Τακτικές Περιλήψεις Ενημερώσεων',
        training: 'Απαιτήσεις Εκπαίδευσης',
      },
      performance: {
        title: 'Απόδοση Ειδοποιήσεων Φορολογικών Νόμων',
        changesTracked: 'Παρακολουθούμενες Αλλαγές',
        alertSpeed: 'Ταχύτητα Ειδοποιήσεων',
        complianceRate: 'Ποσοστό Συμμόρφωσης',
        accuracyRate: 'Ποσοστό Ακρίβειας',
      },
      industries: {
        title: 'Εφαρμογές Κλάδων',
        hospitality: 'Ξενοδοχεία & Τουρισμός',
        retail: 'Λιανικό & Εμπόριο',
        manufacturing: 'Βιομηχανία',
        services: 'Επαγγελματικές Υπηρεσίες',
        healthcare: 'Υγειονομική Περίθαλψη',
        technology: 'Τεχνολογία & Πληροφορική',
      },
    },
  };

  const t = translations[selectedLocale];

  const categories = [
    { key: 'incomeTax', icon: Calculator, color: 'text-green-600' },
    { key: 'socialSecurity', icon: Users, color: 'text-blue-600' },
    { key: 'vat', icon: Receipt, color: 'text-purple-600' },
    { key: 'corporateTax', icon: Building, color: 'text-orange-600' },
    { key: 'payrollTax', icon: Euro, color: 'text-red-600' },
    { key: 'withholdingTax', icon: Percent, color: 'text-indigo-600' },
    { key: 'laborLaw', icon: Scale, color: 'text-yellow-600' },
    { key: 'complianceRules', icon: Shield, color: 'text-pink-600' },
  ];

  const alertTypes = [
    { key: 'immediate', icon: Bell, color: 'text-red-600' },
    { key: 'reminder', icon: Clock, color: 'text-yellow-600' },
    { key: 'deadline', icon: Calendar, color: 'text-orange-600' },
    { key: 'analysis', icon: BarChart3, color: 'text-purple-600' },
    { key: 'updates', icon: RefreshCw, color: 'text-blue-600' },
    { key: 'training', icon: BookOpen, color: 'text-green-600' },
  ];

  const performanceMetrics = [
    {
      key: 'changesTracked',
      value: '328',
      icon: FileText,
      color: 'text-blue-600',
    },
    { key: 'alertSpeed', value: '<5 min', icon: Zap, color: 'text-green-600' },
    {
      key: 'complianceRate',
      value: '94.2%',
      icon: CheckCircle,
      color: 'text-emerald-600',
    },
    {
      key: 'accuracyRate',
      value: '99.1%',
      icon: Target,
      color: 'text-purple-600',
    },
  ];

  const industries = [
    { key: 'hospitality', icon: Award, color: 'text-orange-600' },
    { key: 'retail', icon: CreditCard, color: 'text-purple-600' },
    { key: 'manufacturing', icon: Flag, color: 'text-gray-600' },
    { key: 'services', icon: Briefcase, color: 'text-green-600' },
    { key: 'healthcare', icon: Activity, color: 'text-red-600' },
    { key: 'technology', icon: Zap, color: 'text-blue-600' },
  ];

  if (showFullSystem) {
    return <TaxLawAlerts locale={selectedLocale} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
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
                onClick={() => setShowFullSystem(true)}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Bell className="h-4 w-4 mr-2" />
                {t.hero.cta}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Bell className="h-4 w-4" />
            Greek Tax Law Monitoring
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
              className="px-8 py-3 text-lg bg-orange-600 hover:bg-orange-700"
              onClick={() => setShowFullSystem(true)}
            >
              <Bell className="h-5 w-5 mr-2" />
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
              <Eye className="h-5 w-5 mr-2" />
              {t.hero.ctaSecondary}
            </Button>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-2xl p-8 mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">
            {t.performance.title}
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {performanceMetrics.map((metric, index) => {
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
                    {t.performance[metric.key as keyof typeof t.performance]}
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
                <Eye className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.features.realTimeMonitoring.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.features.realTimeMonitoring.description}
              </p>
            </div>

            <div className="text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Zap className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.features.instantAlerts.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.features.instantAlerts.description}
              </p>
            </div>

            <div className="text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.features.complianceGuidance.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.features.complianceGuidance.description}
              </p>
            </div>

            <div className="text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <BarChart3 className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.features.impactAssessment.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.features.impactAssessment.description}
              </p>
            </div>
          </div>
        </div>

        {/* Tax Law Categories */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            {t.categories.title}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {categories.map((category, index) => {
              const Icon = category.icon;
              return (
                <div
                  key={index}
                  className="text-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Icon className={`h-6 w-6 ${category.color}`} />
                  </div>
                  <h3 className="font-semibold mb-2 text-sm">
                    {t.categories[category.key as keyof typeof t.categories]}
                  </h3>
                </div>
              );
            })}
          </div>
        </div>

        {/* Alert Types */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            {t.alertTypes.title}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {alertTypes.map((type, index) => {
              const Icon = type.icon;
              return (
                <div
                  key={index}
                  className="text-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Icon className={`h-6 w-6 ${type.color}`} />
                  </div>
                  <h3 className="font-semibold mb-2">
                    {t.alertTypes[type.key as keyof typeof t.alertTypes]}
                  </h3>
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
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.benefits.proactiveCompliance.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.benefits.proactiveCompliance.description}
              </p>
            </div>

            <div className="p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-6">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.benefits.riskMitigation.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.benefits.riskMitigation.description}
              </p>
            </div>

            <div className="p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-6">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.benefits.operationalEfficiency.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.benefits.operationalEfficiency.description}
              </p>
            </div>
          </div>
        </div>

        {/* Industries */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            {t.industries.title}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {industries.map((industry, index) => {
              const Icon = industry.icon;
              return (
                <div
                  key={index}
                  className="text-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Icon className={`h-6 w-6 ${industry.color}`} />
                  </div>
                  <h3 className="font-semibold mb-2">
                    {t.industries[industry.key as keyof typeof t.industries]}
                  </h3>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white text-center rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-4">
            Stay Compliant with Every Greek Tax Change
          </h2>
          <p className="text-xl text-orange-100 mb-8 max-w-2xl mx-auto">
            Transform your tax compliance with intelligent monitoring that
            ensures immediate awareness of all Greek tax law modifications and
            automated compliance guidance.
          </p>

          <Button
            size="lg"
            className="bg-white text-orange-600 hover:bg-gray-100 px-8 py-3"
            onClick={() => setShowFullSystem(true)}
          >
            <Bell className="h-5 w-5 mr-2" />
            Launch Tax Alert System
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
