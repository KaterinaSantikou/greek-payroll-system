/**
 * Webhook System Demo Page
 * Showcase of real-time data synchronization and webhook management system
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import WebhookSystem from '@/components/WebhookSystem';
import {
  Zap,
  Globe,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Settings,
  Eye,
  Download,
  ArrowRight,
  Target,
  Shield,
  Key,
  Link,
  Database,
  Server,
  Code,
  Bell,
  Users,
  Building,
  Calculator,
  BarChart3,
  Scale,
  Euro,
  FileText,
  Repeat,
  TrendingUp,
  Award,
  Star,
  Flag,
  Factory,
  Hotel,
  ShoppingCart,
  Stethoscope,
  GraduationCap,
  Construction,
  Cpu,
} from 'lucide-react';

interface DemoProps {
  locale?: 'en' | 'el';
}

export default function WebhookSystemDemo({ locale = 'en' }: DemoProps) {
  const [selectedLocale, setSelectedLocale] = useState<'en' | 'el'>(locale);
  const [showFullSystem, setShowFullSystem] = useState(false);

  const translations = {
    en: {
      title: 'Webhook System',
      subtitle: 'Real-time Data Sync with Other Systems',
      hero: {
        title: 'Seamless Real-time Data Synchronization',
        subtitle:
          'Comprehensive webhook management platform that enables instant data synchronization between PayrollSync and external systems, ensuring real-time updates across your entire technology ecosystem with secure, reliable, and scalable integration capabilities.',
        cta: 'Launch Webhook System',
        ctaSecondary: 'Explore Integrations',
      },
      features: {
        title: 'Advanced Webhook Management Features',
        realTimeSync: {
          title: 'Real-Time Synchronization',
          description:
            'Instant data synchronization with external systems through secure webhook delivery with sub-second latency and 99.9% uptime reliability.',
        },
        secureDelivery: {
          title: 'Secure Delivery',
          description:
            'Advanced security features including signature verification, authentication tokens, and encrypted payload delivery for maximum data protection.',
        },
        intelligentRetry: {
          title: 'Intelligent Retry Logic',
          description:
            'Smart retry mechanisms with exponential backoff, configurable retry policies, and automatic failure recovery for guaranteed delivery.',
        },
        comprehensiveMonitoring: {
          title: 'Comprehensive Monitoring',
          description:
            'Real-time delivery monitoring, performance analytics, success rate tracking, and detailed logging for complete visibility.',
        },
      },
      benefits: {
        title: 'Why Webhook Integration Transforms Business Operations',
        automatedSync: {
          title: 'Automated Data Sync',
          description:
            'Eliminate manual data entry and reduce errors by 95% through automated real-time synchronization between PayrollSync and external systems.',
        },
        systemIntegration: {
          title: 'Seamless Integration',
          description:
            'Connect with 50+ popular business systems including HR platforms, accounting software, and analytics tools through pre-built templates.',
        },
        operationalEfficiency: {
          title: 'Operational Efficiency',
          description:
            'Increase productivity by 40% through automated workflows and real-time data updates across all connected business systems.',
        },
      },
      integrationTypes: {
        title: 'Integration Categories',
        hrSystems: 'HR Management Systems',
        accounting: 'Accounting & Finance',
        analytics: 'Analytics & Reporting',
        compliance: 'Compliance & Regulatory',
        payroll: 'Payroll Processing',
        banking: 'Banking & Payments',
        communications: 'Communications & Alerts',
        businessIntelligence: 'Business Intelligence',
      },
      webhookEvents: {
        title: 'Webhook Event Types',
        employeeEvents: 'Employee Lifecycle Events',
        payrollEvents: 'Payroll Processing Events',
        complianceEvents: 'Compliance & Risk Events',
        paymentEvents: 'Payment & Banking Events',
        reportingEvents: 'Reporting & Analytics Events',
        systemEvents: 'System & Administrative Events',
      },
      performance: {
        title: 'Webhook Performance Metrics',
        activeEndpoints: 'Active Endpoints',
        totalDeliveries: 'Total Deliveries',
        successRate: 'Success Rate',
        averageLatency: 'Average Latency',
      },
      popularIntegrations: {
        title: 'Popular Integration Templates',
        workday: 'Workday HCM Integration',
        sage: 'Sage Accounting Suite',
        powerbi: 'Microsoft Power BI',
        slack: 'Slack Notifications',
        adp: 'ADP Payroll System',
        ergani: 'ERGANI Government Portal',
      },
    },
    el: {
      title: 'Σύστημα Webhooks',
      subtitle: 'Συγχρονισμός Δεδομένων Πραγματικού Χρόνου με Άλλα Συστήματα',
      hero: {
        title: 'Απρόσκοπτος Συγχρονισμός Δεδομένων Πραγματικού Χρόνου',
        subtitle:
          'Περιεκτική πλατφόρμα διαχείρισης webhooks που επιτρέπει άμεσο συγχρονισμό δεδομένων μεταξύ PayrollSync και εξωτερικών συστημάτων, διασφαλίζοντας ενημερώσεις πραγματικού χρόνου σε όλο το τεχνολογικό σας οικοσύστημα με ασφαλείς, αξιόπιστες και επεκτάσιμες δυνατότητες ολοκλήρωσης.',
        cta: 'Εκκίνηση Συστήματος Webhooks',
        ctaSecondary: 'Εξερεύνηση Ολοκληρώσεων',
      },
      features: {
        title: 'Προηγμένα Χαρακτηριστικά Διαχείρισης Webhooks',
        realTimeSync: {
          title: 'Συγχρονισμός Πραγματικού Χρόνου',
          description:
            'Άμεσος συγχρονισμός δεδομένων με εξωτερικά συστήματα μέσω ασφαλούς παράδοσης webhook με καθυστέρηση υποδευτερολέπτου και αξιοπιστία 99.9%.',
        },
        secureDelivery: {
          title: 'Ασφαλής Παράδοση',
          description:
            'Προηγμένα χαρακτηριστικά ασφαλείας συμπεριλαμβανομένης επαλήθευσης υπογραφής, tokens πιστοποίησης και κρυπτογραφημένης παράδοσης δεδομένων για μέγιστη προστασία.',
        },
        intelligentRetry: {
          title: 'Έξυπνη Λογική Επανάληψης',
          description:
            'Έξυπνοι μηχανισμοί επανάληψης με εκθετική καθυστέρηση, διαμορφώσιμες πολιτικές επανάληψης και αυτόματη ανάκαμψη αποτυχιών για εγγυημένη παράδοση.',
        },
        comprehensiveMonitoring: {
          title: 'Περιεκτική Παρακολούθηση',
          description:
            'Παρακολούθηση παράδοσης πραγματικού χρόνου, αναλυτικά απόδοσης, παρακολούθηση ποσοστού επιτυχίας και λεπτομερής καταγραφή για πλήρη ορατότητα.',
        },
      },
      benefits: {
        title:
          'Γιατί η Ολοκλήρωση Webhooks Μεταμορφώνει τις Επιχειρηματικές Λειτουργίες',
        automatedSync: {
          title: 'Αυτοματοποιημένος Συγχρονισμός Δεδομένων',
          description:
            'Εξάλειψη χειροκίνητης εισαγωγής δεδομένων και μείωση σφαλμάτων κατά 95% μέσω αυτοματοποιημένου συγχρονισμού πραγματικού χρόνου μεταξύ PayrollSync και εξωτερικών συστημάτων.',
        },
        systemIntegration: {
          title: 'Απρόσκοπτη Ολοκλήρωση',
          description:
            'Σύνδεση με 50+ δημοφιλή επιχειρηματικά συστήματα συμπεριλαμβανομένων πλατφορμών ΑΠ, λογισμικού λογιστικής και εργαλείων αναλυτικών μέσω προκατασκευασμένων προτύπων.',
        },
        operationalEfficiency: {
          title: 'Λειτουργική Αποδοτικότητα',
          description:
            'Αύξηση παραγωγικότητας κατά 40% μέσω αυτοματοποιημένων ροών εργασίας και ενημερώσεων δεδομένων πραγματικού χρόνου σε όλα τα συνδεδεμένα επιχειρηματικά συστήματα.',
        },
      },
      integrationTypes: {
        title: 'Κατηγορίες Ολοκλήρωσης',
        hrSystems: 'Συστήματα Διαχείρισης ΑΠ',
        accounting: 'Λογιστικά & Οικονομικά',
        analytics: 'Αναλυτικά & Αναφορές',
        compliance: 'Συμμόρφωση & Κανονιστικό',
        payroll: 'Επεξεργασία Μισθοδοσίας',
        banking: 'Τραπεζικά & Πληρωμές',
        communications: 'Επικοινωνίες & Ειδοποιήσεις',
        businessIntelligence: 'Επιχειρηματική Νοημοσύνη',
      },
      webhookEvents: {
        title: 'Τύποι Γεγονότων Webhooks',
        employeeEvents: 'Γεγονότα Κύκλου Ζωής Εργαζομένων',
        payrollEvents: 'Γεγονότα Επεξεργασίας Μισθοδοσίας',
        complianceEvents: 'Γεγονότα Συμμόρφωσης & Κινδύνου',
        paymentEvents: 'Γεγονότα Πληρωμών & Τραπεζικών',
        reportingEvents: 'Γεγονότα Αναφορών & Αναλυτικών',
        systemEvents: 'Γεγονότα Συστήματος & Διαχείρισης',
      },
      performance: {
        title: 'Μετρικές Απόδοσης Webhooks',
        activeEndpoints: 'Ενεργά Σημεία Τερματισμού',
        totalDeliveries: 'Συνολικές Παραδόσεις',
        successRate: 'Ποσοστό Επιτυχίας',
        averageLatency: 'Μέση Καθυστέρηση',
      },
      popularIntegrations: {
        title: 'Δημοφιλή Πρότυπα Ολοκλήρωσης',
        workday: 'Ολοκλήρωση Workday HCM',
        sage: 'Σουίτα Λογιστικών Sage',
        powerbi: 'Microsoft Power BI',
        slack: 'Ειδοποιήσεις Slack',
        adp: 'Σύστημα Μισθοδοσίας ADP',
        ergani: 'Κυβερνητική Πύλη ΕΡΓΑΝΗ',
      },
    },
  };

  const t = translations[selectedLocale];

  const integrationTypes = [
    { key: 'hrSystems', icon: Users, color: 'text-blue-600' },
    { key: 'accounting', icon: Calculator, color: 'text-green-600' },
    { key: 'analytics', icon: BarChart3, color: 'text-purple-600' },
    { key: 'compliance', icon: Scale, color: 'text-orange-600' },
    { key: 'payroll', icon: Euro, color: 'text-red-600' },
    { key: 'banking', icon: Building, color: 'text-indigo-600' },
    { key: 'communications', icon: Bell, color: 'text-yellow-600' },
    { key: 'businessIntelligence', icon: Target, color: 'text-pink-600' },
  ];

  const webhookEvents = [
    { key: 'employeeEvents', icon: Users, color: 'text-blue-600' },
    { key: 'payrollEvents', icon: Euro, color: 'text-green-600' },
    { key: 'complianceEvents', icon: Shield, color: 'text-orange-600' },
    { key: 'paymentEvents', icon: Building, color: 'text-purple-600' },
    { key: 'reportingEvents', icon: FileText, color: 'text-red-600' },
    { key: 'systemEvents', icon: Settings, color: 'text-gray-600' },
  ];

  const performanceMetrics = [
    { key: 'activeEndpoints', value: '4', icon: Link, color: 'text-green-600' },
    {
      key: 'totalDeliveries',
      value: '4,338',
      icon: Send,
      color: 'text-blue-600',
    },
    {
      key: 'successRate',
      value: '96.4%',
      icon: CheckCircle,
      color: 'text-purple-600',
    },
    {
      key: 'averageLatency',
      value: '89ms',
      icon: Zap,
      color: 'text-orange-600',
    },
  ];

  const popularIntegrations = [
    { key: 'workday', icon: Building, color: 'text-blue-600' },
    { key: 'sage', icon: Calculator, color: 'text-green-600' },
    { key: 'powerbi', icon: BarChart3, color: 'text-yellow-600' },
    { key: 'slack', icon: Bell, color: 'text-purple-600' },
    { key: 'adp', icon: Euro, color: 'text-red-600' },
    { key: 'ergani', icon: Scale, color: 'text-gray-600' },
  ];

  if (showFullSystem) {
    return <WebhookSystem locale={selectedLocale} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
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
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Zap className="h-4 w-4 mr-2" />
                {t.hero.cta}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Zap className="h-4 w-4" />
            Real-time Integration Platform
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
              onClick={() => setShowFullSystem(true)}
            >
              <Zap className="h-5 w-5 mr-2" />
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
                <Activity className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.features.realTimeSync.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.features.realTimeSync.description}
              </p>
            </div>

            <div className="text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.features.secureDelivery.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.features.secureDelivery.description}
              </p>
            </div>

            <div className="text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Repeat className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.features.intelligentRetry.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.features.intelligentRetry.description}
              </p>
            </div>

            <div className="text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <BarChart3 className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.features.comprehensiveMonitoring.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.features.comprehensiveMonitoring.description}
              </p>
            </div>
          </div>
        </div>

        {/* Integration Types */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            {t.integrationTypes.title}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {integrationTypes.map((integrationType, index) => {
              const Icon = integrationType.icon;
              return (
                <div
                  key={index}
                  className="text-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Icon className={`h-6 w-6 ${integrationType.color}`} />
                  </div>
                  <h3 className="font-semibold mb-2 text-sm">
                    {
                      t.integrationTypes[
                        integrationType.key as keyof typeof t.integrationTypes
                      ]
                    }
                  </h3>
                </div>
              );
            })}
          </div>
        </div>

        {/* Webhook Events */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            {t.webhookEvents.title}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {webhookEvents.map((webhookEvent, index) => {
              const Icon = webhookEvent.icon;
              return (
                <div
                  key={index}
                  className="text-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Icon className={`h-6 w-6 ${webhookEvent.color}`} />
                  </div>
                  <h3 className="font-semibold mb-2">
                    {
                      t.webhookEvents[
                        webhookEvent.key as keyof typeof t.webhookEvents
                      ]
                    }
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
                <Database className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.benefits.automatedSync.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.benefits.automatedSync.description}
              </p>
            </div>

            <div className="p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-6">
                <Link className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.benefits.systemIntegration.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.benefits.systemIntegration.description}
              </p>
            </div>

            <div className="p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-6">
                <TrendingUp className="h-6 w-6 text-purple-600" />
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

        {/* Popular Integrations */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            {t.popularIntegrations.title}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {popularIntegrations.map((integration, index) => {
              const Icon = integration.icon;
              return (
                <div
                  key={index}
                  className="text-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Icon className={`h-6 w-6 ${integration.color}`} />
                  </div>
                  <h3 className="font-semibold mb-2">
                    {
                      t.popularIntegrations[
                        integration.key as keyof typeof t.popularIntegrations
                      ]
                    }
                  </h3>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-blue-600 to-green-600 text-white text-center rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-4">
            Connect Your Systems Today
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Transform your business operations with seamless real-time data
            synchronization that connects PayrollSync with all your essential
            business systems for maximum efficiency and accuracy.
          </p>

          <Button
            size="lg"
            className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3"
            onClick={() => setShowFullSystem(true)}
          >
            <Zap className="h-5 w-5 mr-2" />
            Launch Webhook Integration System
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
