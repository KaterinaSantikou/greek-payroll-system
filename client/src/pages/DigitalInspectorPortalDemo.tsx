/**
 * Digital Inspector Portal Demo Page
 * Showcase of digital labor inspection management system
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import DigitalInspectorPortal from '@/components/DigitalInspectorPortal';
import {
  Shield,
  Search,
  FileText,
  Users,
  Building,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Eye,
  Download,
  Scale,
  Gavel,
  Clipboard,
  BookOpen,
  BarChart3,
  TrendingUp,
  Activity,
  Target,
  Star,
  Award,
  Globe,
  ArrowRight,
  Key,
  Lock,
  Fingerprint,
  History,
  Flag,
  Settings,
  RefreshCw,
} from 'lucide-react';

interface DemoProps {
  locale?: 'en' | 'el';
}

export default function DigitalInspectorPortalDemo({
  locale = 'en',
}: DemoProps) {
  const [selectedLocale, setSelectedLocale] = useState<'en' | 'el'>(locale);
  const [showFullSystem, setShowFullSystem] = useState(false);

  const translations = {
    en: {
      title: 'Digital Inspector Portal',
      subtitle: 'Labor Inspection Management System',
      hero: {
        title: 'Revolutionize Labor Inspections with Digital Tools',
        subtitle:
          'Comprehensive digital portal that empowers Greek labor inspectors with real-time access to company data, streamlined inspection workflows, automated compliance tracking, and intelligent reporting capabilities for efficient and thorough labor law enforcement.',
        cta: 'Access Inspector Portal',
        ctaSecondary: 'Explore Features',
      },
      features: {
        title: 'Advanced Digital Inspection Features',
        companyAccess: {
          title: 'Company Data Access',
          description:
            'Real-time access to complete company profiles, employee records, compliance history, and violation tracking with secure authentication.',
        },
        inspectionManagement: {
          title: 'Inspection Management',
          description:
            'Streamlined inspection workflows with scheduling, progress tracking, finding documentation, and automated report generation.',
        },
        complianceTracking: {
          title: 'Compliance Tracking',
          description:
            'Comprehensive compliance monitoring with risk assessment, violation tracking, correction deadlines, and follow-up management.',
        },
        digitalReporting: {
          title: 'Digital Reporting',
          description:
            'Automated report generation with evidence management, fine calculations, legal references, and digital documentation.',
        },
      },
      benefits: {
        title: 'Why Digital Inspector Portal Transforms Labor Inspections',
        efficiency: {
          title: 'Inspection Efficiency',
          description:
            'Reduce inspection time by 60% through digital workflows, automated documentation, and real-time data access during on-site visits.',
        },
        accuracy: {
          title: 'Enhanced Accuracy',
          description:
            'Improve violation detection by 45% with comprehensive data analysis, historical trend tracking, and intelligent risk assessment.',
        },
        compliance: {
          title: 'Better Compliance',
          description:
            'Achieve 89% faster violation correction through automated follow-up scheduling, deadline tracking, and digital communication.',
        },
      },
      capabilities: {
        title: 'Digital Inspection Capabilities',
        authentication: 'Secure Inspector Authentication',
        companySearch: 'Advanced Company Search & Filtering',
        realTimeData: 'Real-Time Company Data Access',
        inspectionWorkflow: 'Streamlined Inspection Workflows',
        findingsManagement: 'Digital Findings Management',
        violationTracking: 'Comprehensive Violation Tracking',
        reportGeneration: 'Automated Report Generation',
        followUpManagement: 'Intelligent Follow-up Management',
      },
      inspectionTypes: {
        title: 'Supported Inspection Types',
        routine: 'Routine Inspections',
        complaint: 'Complaint-Based Inspections',
        followUp: 'Follow-up Inspections',
        random: 'Random Inspections',
        targeted: 'Targeted Risk-Based Inspections',
        safety: 'Safety Compliance Inspections',
      },
      performance: {
        title: 'Digital Inspection Performance',
        inspectionsManaged: 'Inspections Managed',
        averageTime: 'Average Inspection Time',
        complianceRate: 'Overall Compliance Rate',
        violationDetection: 'Violation Detection Rate',
      },
      sectors: {
        title: 'Monitored Business Sectors',
        tourism: 'Tourism & Hospitality',
        retail: 'Retail & Commerce',
        manufacturing: 'Manufacturing',
        healthcare: 'Healthcare Services',
        construction: 'Construction',
        technology: 'Technology & IT',
      },
    },
    el: {
      title: 'Ψηφιακή Πύλη Επιθεωρητή',
      subtitle: 'Σύστημα Διαχείρισης Επιθεωρήσεων Εργασίας',
      hero: {
        title: 'Επαναστατήστε τις Επιθεωρήσεις Εργασίας με Ψηφιακά Εργαλεία',
        subtitle:
          'Περιεκτική ψηφιακή πύλη που ενδυναμώνει τους Έλληνες επιθεωρητές εργασίας με πρόσβαση σε πραγματικό χρόνο σε δεδομένα επιχειρήσεων, εξορθολογισμένες ροές εργασίας επιθεώρησης, αυτοματοποιημένη παρακολούθηση συμμόρφωσης και έξυπνες δυνατότητες αναφοράς για αποτελεσματική και διεξοδική επιβολή του εργατικού δικαίου.',
        cta: 'Πρόσβαση στην Πύλη Επιθεωρητή',
        ctaSecondary: 'Εξερεύνηση Χαρακτηριστικών',
      },
      features: {
        title: 'Προηγμένα Χαρακτηριστικά Ψηφιακής Επιθεώρησης',
        companyAccess: {
          title: 'Πρόσβαση σε Δεδομένα Επιχειρήσεων',
          description:
            'Πρόσβαση σε πραγματικό χρόνο σε πλήρη προφίλ επιχειρήσεων, αρχεία εργαζομένων, ιστορικό συμμόρφωσης και παρακολούθηση παραβάσεων με ασφαλή πιστοποίηση.',
        },
        inspectionManagement: {
          title: 'Διαχείριση Επιθεωρήσεων',
          description:
            'Εξορθολογισμένες ροές εργασίας επιθεώρησης με προγραμματισμό, παρακολούθηση προόδου, τεκμηρίωση ευρημάτων και αυτοματοποιημένη δημιουργία αναφορών.',
        },
        complianceTracking: {
          title: 'Παρακολούθηση Συμμόρφωσης',
          description:
            'Περιεκτική παρακολούθηση συμμόρφωσης με αξιολόγηση κινδύνων, παρακολούθηση παραβάσεων, προθεσμίες διόρθωσης και διαχείριση παρακολούθησης.',
        },
        digitalReporting: {
          title: 'Ψηφιακές Αναφορές',
          description:
            'Αυτοματοποιημένη δημιουργία αναφορών με διαχείριση στοιχείων, υπολογισμούς προστίμων, νομικές αναφορές και ψηφιακή τεκμηρίωση.',
        },
      },
      benefits: {
        title:
          'Γιατί η Ψηφιακή Πύλη Επιθεωρητή Μεταμορφώνει τις Επιθεωρήσεις Εργασίας',
        efficiency: {
          title: 'Αποδοτικότητα Επιθεώρησης',
          description:
            'Μειώστε τον χρόνο επιθεώρησης κατά 60% μέσω ψηφιακών ροών εργασίας, αυτοματοποιημένης τεκμηρίωσης και πρόσβασης σε δεδομένα πραγματικού χρόνου κατά τις επισκέψεις στις εγκαταστάσεις.',
        },
        accuracy: {
          title: 'Βελτιωμένη Ακρίβεια',
          description:
            'Βελτιώστε τον εντοπισμό παραβάσεων κατά 45% με περιεκτική ανάλυση δεδομένων, παρακολούθηση ιστορικών τάσεων και έξυπνη αξιολόγηση κινδύνων.',
        },
        compliance: {
          title: 'Καλύτερη Συμμόρφωση',
          description:
            'Επιτύχετε 89% ταχύτερη διόρθωση παραβάσεων μέσω αυτοματοποιημένου προγραμματισμού παρακολούθησης, παρακολούθησης προθεσμιών και ψηφιακής επικοινωνίας.',
        },
      },
      capabilities: {
        title: 'Δυνατότητες Ψηφιακής Επιθεώρησης',
        authentication: 'Ασφαλής Πιστοποίηση Επιθεωρητή',
        companySearch: 'Προηγμένη Αναζήτηση & Φιλτράρισμα Επιχειρήσεων',
        realTimeData: 'Πρόσβαση σε Δεδομένα Επιχειρήσεων Πραγματικού Χρόνου',
        inspectionWorkflow: 'Εξορθολογισμένες Ροές Εργασίας Επιθεώρησης',
        findingsManagement: 'Ψηφιακή Διαχείριση Ευρημάτων',
        violationTracking: 'Περιεκτική Παρακολούθηση Παραβάσεων',
        reportGeneration: 'Αυτοματοποιημένη Δημιουργία Αναφορών',
        followUpManagement: 'Έξυπνη Διαχείριση Παρακολούθησης',
      },
      inspectionTypes: {
        title: 'Υποστηριζόμενοι Τύποι Επιθεώρησης',
        routine: 'Τακτικές Επιθεωρήσεις',
        complaint: 'Επιθεωρήσεις Βάσει Καταγγελιών',
        followUp: 'Επιθεωρήσεις Παρακολούθησης',
        random: 'Τυχαίες Επιθεωρήσεις',
        targeted: 'Στοχευμένες Επιθεωρήσεις Βάσει Κινδύνου',
        safety: 'Επιθεωρήσεις Συμμόρφωσης Ασφαλείας',
      },
      performance: {
        title: 'Απόδοση Ψηφιακής Επιθεώρησης',
        inspectionsManaged: 'Διαχειριζόμενες Επιθεωρήσεις',
        averageTime: 'Μέσος Χρόνος Επιθεώρησης',
        complianceRate: 'Συνολικό Ποσοστό Συμμόρφωσης',
        violationDetection: 'Ποσοστό Εντοπισμού Παραβάσεων',
      },
      sectors: {
        title: 'Παρακολουθούμενοι Επιχειρηματικοί Τομείς',
        tourism: 'Τουρισμός & Φιλοξενία',
        retail: 'Λιανικό & Εμπόριο',
        manufacturing: 'Βιομηχανία',
        healthcare: 'Υπηρεσίες Υγείας',
        construction: 'Κατασκευές',
        technology: 'Τεχνολογία & Πληροφορική',
      },
    },
  };

  const t = translations[selectedLocale];

  const capabilities = [
    { key: 'authentication', icon: Shield, color: 'text-red-600' },
    { key: 'companySearch', icon: Search, color: 'text-blue-600' },
    { key: 'realTimeData', icon: Activity, color: 'text-green-600' },
    { key: 'inspectionWorkflow', icon: Clipboard, color: 'text-purple-600' },
    { key: 'findingsManagement', icon: FileText, color: 'text-orange-600' },
    { key: 'violationTracking', icon: AlertTriangle, color: 'text-red-600' },
    { key: 'reportGeneration', icon: Download, color: 'text-indigo-600' },
    { key: 'followUpManagement', icon: Calendar, color: 'text-pink-600' },
  ];

  const inspectionTypes = [
    { key: 'routine', icon: Clock, color: 'text-blue-600' },
    { key: 'complaint', icon: Flag, color: 'text-red-600' },
    { key: 'followUp', icon: RefreshCw, color: 'text-green-600' },
    { key: 'random', icon: Target, color: 'text-purple-600' },
    { key: 'targeted', icon: Eye, color: 'text-orange-600' },
    { key: 'safety', icon: Shield, color: 'text-yellow-600' },
  ];

  const performanceMetrics = [
    {
      key: 'inspectionsManaged',
      value: '1,247',
      icon: Clipboard,
      color: 'text-blue-600',
    },
    {
      key: 'averageTime',
      value: '195 min',
      icon: Clock,
      color: 'text-green-600',
    },
    {
      key: 'complianceRate',
      value: '81.3%',
      icon: CheckCircle,
      color: 'text-emerald-600',
    },
    {
      key: 'violationDetection',
      value: '18.8%',
      icon: AlertTriangle,
      color: 'text-orange-600',
    },
  ];

  const sectors = [
    { key: 'tourism', icon: Award, color: 'text-orange-600' },
    { key: 'retail', icon: Building, color: 'text-purple-600' },
    { key: 'manufacturing', icon: Settings, color: 'text-gray-600' },
    { key: 'healthcare', icon: Activity, color: 'text-red-600' },
    { key: 'construction', icon: Flag, color: 'text-yellow-600' },
    { key: 'technology', icon: Star, color: 'text-blue-600' },
  ];

  if (showFullSystem) {
    return <DigitalInspectorPortal locale={selectedLocale} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
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
                <Shield className="h-4 w-4 mr-2" />
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
            <Shield className="h-4 w-4" />
            Digital Labor Inspection Portal
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
              <Shield className="h-5 w-5 mr-2" />
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
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.features.companyAccess.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.features.companyAccess.description}
              </p>
            </div>

            <div className="text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clipboard className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.features.inspectionManagement.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.features.inspectionManagement.description}
              </p>
            </div>

            <div className="text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.features.complianceTracking.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.features.complianceTracking.description}
              </p>
            </div>

            <div className="text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FileText className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.features.digitalReporting.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.features.digitalReporting.description}
              </p>
            </div>
          </div>
        </div>

        {/* Digital Capabilities */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            {t.capabilities.title}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {capabilities.map((capability, index) => {
              const Icon = capability.icon;
              return (
                <div
                  key={index}
                  className="text-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Icon className={`h-6 w-6 ${capability.color}`} />
                  </div>
                  <h3 className="font-semibold mb-2 text-sm">
                    {
                      t.capabilities[
                        capability.key as keyof typeof t.capabilities
                      ]
                    }
                  </h3>
                </div>
              );
            })}
          </div>
        </div>

        {/* Inspection Types */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            {t.inspectionTypes.title}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {inspectionTypes.map((type, index) => {
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
                    {
                      t.inspectionTypes[
                        type.key as keyof typeof t.inspectionTypes
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
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-6">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.benefits.efficiency.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.benefits.efficiency.description}
              </p>
            </div>

            <div className="p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.benefits.accuracy.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.benefits.accuracy.description}
              </p>
            </div>

            <div className="p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-6">
                <CheckCircle className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.benefits.compliance.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.benefits.compliance.description}
              </p>
            </div>
          </div>
        </div>

        {/* Monitored Sectors */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            {t.sectors.title}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sectors.map((sector, index) => {
              const Icon = sector.icon;
              return (
                <div
                  key={index}
                  className="text-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Icon className={`h-6 w-6 ${sector.color}`} />
                  </div>
                  <h3 className="font-semibold mb-2">
                    {t.sectors[sector.key as keyof typeof t.sectors]}
                  </h3>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-center rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-4">
            Transform Labor Inspections Today
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Empower your inspection teams with cutting-edge digital tools that
            streamline workflows, enhance accuracy, and ensure comprehensive
            compliance monitoring across all Greek business sectors.
          </p>

          <Button
            size="lg"
            className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3"
            onClick={() => setShowFullSystem(true)}
          >
            <Shield className="h-5 w-5 mr-2" />
            Launch Digital Inspector Portal
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
