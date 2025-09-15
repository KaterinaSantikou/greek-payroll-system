/**
 * ERGANI Validation Demo Page
 * Showcase of real-time validation system for Greek employment data
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ERGANIValidation from '@/components/ERGANIValidation';
import {
  CheckCheck,
  XCircle,
  AlertTriangle,
  Shield,
  Zap,
  Clock,
  Target,
  FileText,
  Users,
  CreditCard,
  BarChart3,
  CheckCircle,
  Globe,
  ArrowRight,
  Eye,
  Activity,
  RefreshCw,
  Send,
  AlertCircle,
  Info,
  TrendingUp,
  Star,
  Award,
} from 'lucide-react';

interface DemoProps {
  locale?: 'en' | 'el';
}

export default function ERGANIValidationDemo({ locale = 'en' }: DemoProps) {
  const [selectedLocale, setSelectedLocale] = useState<'en' | 'el'>(locale);
  const [showFullSystem, setShowFullSystem] = useState(false);

  const translations = {
    en: {
      title: 'ERGANI Validation',
      subtitle: 'Real-time validation before submitting to ERGANI II',
      hero: {
        title: 'Prevent ERGANI Rejections Before They Happen',
        subtitle:
          'Advanced real-time validation system that checks all Greek employment data against ERGANI II requirements before submission, ensuring 100% compliance and eliminating rejection errors.',
        cta: 'Launch ERGANI Validator',
        ctaSecondary: 'Explore Features',
      },
      features: {
        title: 'Comprehensive ERGANI Validation Features',
        realTimeValidation: {
          title: 'Real-Time Validation',
          description:
            'Instant validation checks as you enter data, preventing errors before they reach ERGANI II submission.',
        },
        complianceChecks: {
          title: 'Full Compliance Checks',
          description:
            'Complete validation against all ERGANI II requirements including AFM, AMKA, contracts, and work cards.',
        },
        errorPrevention: {
          title: 'Error Prevention',
          description:
            'Advanced algorithms detect and prevent common ERGANI submission errors before they occur.',
        },
        smartSuggestions: {
          title: 'Smart Corrections',
          description:
            'Intelligent suggestions and automated fixes for common validation issues and data problems.',
        },
      },
      benefits: {
        title: 'Why ERGANI Validation Transforms Compliance',
        zeroRejections: {
          title: '100% Success Rate',
          description:
            'Eliminate ERGANI rejection errors with comprehensive pre-submission validation and compliance checking.',
        },
        timeEfficiency: {
          title: 'Instant Validation',
          description:
            'Real-time checks save hours of manual review and prevent costly resubmission delays.',
        },
        complianceAssurance: {
          title: 'Complete Compliance',
          description:
            'Ensure full adherence to all Greek labor law requirements and ERGANI II specifications.',
        },
      },
      validationChecks: {
        title: 'Comprehensive Validation Checks',
        afmValidation: 'AFM Format & Checksum',
        amkaValidation: 'AMKA Format & Checksum',
        emailValidation: 'Email Address Format',
        phoneValidation: 'Greek Phone Numbers',
        contractValidation: 'Contract Compliance',
        salaryValidation: 'Minimum Wage Compliance',
        workingHoursValidation: 'Working Hours Limits',
        dateValidation: 'Date Format & Logic',
        specialtyValidation: 'Specialty Code Verification',
        duplicateValidation: 'Duplicate Prevention',
      },
      dataTypes: {
        title: 'Validated Data Types',
        employees: 'Employee Personal Data',
        contracts: 'Employment Contracts',
        workCards: 'Digital Work Cards',
        payroll: 'Payroll Information',
        schedules: 'Work Schedules',
        overtime: 'Overtime Records',
      },
      performance: {
        title: 'ERGANI Validation Performance',
        accuracyRate: 'Validation Accuracy',
        processingSpeed: 'Processing Speed',
        errorDetection: 'Error Detection Rate',
        complianceScore: 'Compliance Score',
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
      title: 'Επικύρωση ΕΡΓΑΝΗ',
      subtitle: 'Επικύρωση σε πραγματικό χρόνο πριν την υποβολή στην ΕΡΓΑΝΗ ΙΙ',
      hero: {
        title: 'Αποτρέψτε τις Απορρίψεις ΕΡΓΑΝΗ Προτού Συμβούν',
        subtitle:
          'Προηγμένο σύστημα επικύρωσης πραγματικού χρόνου που ελέγχει όλα τα ελληνικά δεδομένα απασχόλησης σύμφωνα με τις απαιτήσεις ΕΡΓΑΝΗ ΙΙ πριν την υποβολή, διασφαλίζοντας 100% συμμόρφωση και εξαλείφοντας σφάλματα απόρριψης.',
        cta: 'Εκκίνηση Επικυρωτή ΕΡΓΑΝΗ',
        ctaSecondary: 'Εξερεύνηση Χαρακτηριστικών',
      },
      features: {
        title: 'Περιεκτικά Χαρακτηριστικά Επικύρωσης ΕΡΓΑΝΗ',
        realTimeValidation: {
          title: 'Επικύρωση Πραγματικού Χρόνου',
          description:
            'Άμεσοι έλεγχοι επικύρωσης καθώς εισάγετε δεδομένα, αποτρέποντας σφάλματα πριν φτάσουν στην υποβολή ΕΡΓΑΝΗ ΙΙ.',
        },
        complianceChecks: {
          title: 'Πλήρεις Έλεγχοι Συμμόρφωσης',
          description:
            'Ολοκληρωμένη επικύρωση σύμφωνα με όλες τις απαιτήσεις ΕΡΓΑΝΗ ΙΙ συμπεριλαμβανομένων ΑΦΜ, ΑΜΚΑ, συμβολαίων και καρτών εργασίας.',
        },
        errorPrevention: {
          title: 'Πρόληψη Σφαλμάτων',
          description:
            'Προηγμένοι αλγόριθμοι εντοπίζουν και αποτρέπουν κοινά σφάλματα υποβολής ΕΡΓΑΝΗ πριν συμβούν.',
        },
        smartSuggestions: {
          title: 'Έξυπνες Διορθώσεις',
          description:
            'Έξυπνες προτάσεις και αυτοματοποιημένες διορθώσεις για κοινά προβλήματα επικύρωσης και δεδομένων.',
        },
      },
      benefits: {
        title: 'Γιατί η Επικύρωση ΕΡΓΑΝΗ Μεταμορφώνει τη Συμμόρφωση',
        zeroRejections: {
          title: 'Ποσοστό Επιτυχίας 100%',
          description:
            'Εξαλείψτε τα σφάλματα απόρριψης ΕΡΓΑΝΗ με περιεκτική επικύρωση πριν την υποβολή και έλεγχο συμμόρφωσης.',
        },
        timeEfficiency: {
          title: 'Άμεση Επικύρωση',
          description:
            'Οι έλεγχοι πραγματικού χρόνου εξοικονομούν ώρες χειροκίνητης αναθεώρησης και αποτρέπουν κοστοβόρες καθυστερήσεις επανυποβολής.',
        },
        complianceAssurance: {
          title: 'Πλήρης Συμμόρφωση',
          description:
            'Διασφαλίστε πλήρη τήρηση όλων των απαιτήσεων του ελληνικού εργατικού δικαίου και των προδιαγραφών ΕΡΓΑΝΗ ΙΙ.',
        },
      },
      validationChecks: {
        title: 'Περιεκτικοί Έλεγχοι Επικύρωσης',
        afmValidation: 'Μορφή & Άθροισμα Ελέγχου ΑΦΜ',
        amkaValidation: 'Μορφή & Άθροισμα Ελέγχου ΑΜΚΑ',
        emailValidation: 'Μορφή Διεύθυνσης Email',
        phoneValidation: 'Ελληνικοί Αριθμοί Τηλεφώνου',
        contractValidation: 'Συμμόρφωση Συμβολαίων',
        salaryValidation: 'Συμμόρφωση Κατώτατου Μισθού',
        workingHoursValidation: 'Όρια Ωρών Εργασίας',
        dateValidation: 'Μορφή & Λογική Ημερομηνίας',
        specialtyValidation: 'Επαλήθευση Κωδικού Ειδικότητας',
        duplicateValidation: 'Πρόληψη Διπλότυπων',
      },
      dataTypes: {
        title: 'Τύποι Δεδομένων που Επικυρώνονται',
        employees: 'Προσωπικά Δεδομένα Εργαζομένων',
        contracts: 'Συμβόλαια Απασχόλησης',
        workCards: 'Ψηφιακές Κάρτες Εργασίας',
        payroll: 'Πληροφορίες Μισθοδοσίας',
        schedules: 'Προγράμματα Εργασίας',
        overtime: 'Αρχεία Υπερωριών',
      },
      performance: {
        title: 'Απόδοση Επικύρωσης ΕΡΓΑΝΗ',
        accuracyRate: 'Ακρίβεια Επικύρωσης',
        processingSpeed: 'Ταχύτητα Επεξεργασίας',
        errorDetection: 'Ποσοστό Εντοπισμού Σφαλμάτων',
        complianceScore: 'Βαθμός Συμμόρφωσης',
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

  const validationChecks = [
    { key: 'afmValidation', icon: Shield, color: 'text-blue-600' },
    { key: 'amkaValidation', icon: Shield, color: 'text-green-600' },
    { key: 'emailValidation', icon: Activity, color: 'text-purple-600' },
    { key: 'phoneValidation', icon: Activity, color: 'text-orange-600' },
    { key: 'contractValidation', icon: FileText, color: 'text-red-600' },
    { key: 'salaryValidation', icon: Target, color: 'text-indigo-600' },
    { key: 'workingHoursValidation', icon: Clock, color: 'text-yellow-600' },
    { key: 'dateValidation', icon: AlertCircle, color: 'text-pink-600' },
    { key: 'specialtyValidation', icon: Award, color: 'text-emerald-600' },
    { key: 'duplicateValidation', icon: CheckCircle, color: 'text-gray-600' },
  ];

  const dataTypes = [
    { key: 'employees', icon: Users, color: 'bg-blue-100 text-blue-600' },
    { key: 'contracts', icon: FileText, color: 'bg-green-100 text-green-600' },
    {
      key: 'workCards',
      icon: CreditCard,
      color: 'bg-purple-100 text-purple-600',
    },
    { key: 'payroll', icon: BarChart3, color: 'bg-orange-100 text-orange-600' },
    { key: 'schedules', icon: Clock, color: 'bg-red-100 text-red-600' },
    {
      key: 'overtime',
      icon: TrendingUp,
      color: 'bg-indigo-100 text-indigo-600',
    },
  ];

  const performanceMetrics = [
    {
      key: 'accuracyRate',
      value: '99.7%',
      icon: CheckCircle,
      color: 'text-green-600',
    },
    {
      key: 'processingSpeed',
      value: '<2 sec',
      icon: Zap,
      color: 'text-blue-600',
    },
    {
      key: 'errorDetection',
      value: '98.4%',
      icon: AlertTriangle,
      color: 'text-orange-600',
    },
    {
      key: 'complianceScore',
      value: '100%',
      icon: Star,
      color: 'text-purple-600',
    },
  ];

  const industries = [
    { key: 'hospitality', icon: Award, color: 'text-orange-600' },
    { key: 'retail', icon: Users, color: 'text-purple-600' },
    { key: 'manufacturing', icon: Shield, color: 'text-gray-600' },
    { key: 'services', icon: Target, color: 'text-green-600' },
    { key: 'healthcare', icon: Activity, color: 'text-red-600' },
    { key: 'technology', icon: Zap, color: 'text-blue-600' },
  ];

  if (showFullSystem) {
    return <ERGANIValidation locale={selectedLocale} />;
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
                <CheckCheck className="h-4 w-4 mr-2" />
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
            <CheckCheck className="h-4 w-4" />
            Real-Time ERGANI Compliance Validation
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
              <CheckCheck className="h-5 w-5 mr-2" />
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
                <RefreshCw className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.features.realTimeValidation.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.features.realTimeValidation.description}
              </p>
            </div>

            <div className="text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.features.complianceChecks.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.features.complianceChecks.description}
              </p>
            </div>

            <div className="text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.features.errorPrevention.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.features.errorPrevention.description}
              </p>
            </div>

            <div className="text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Zap className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.features.smartSuggestions.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.features.smartSuggestions.description}
              </p>
            </div>
          </div>
        </div>

        {/* Validation Checks */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            {t.validationChecks.title}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
            {validationChecks.map((check, index) => {
              const Icon = check.icon;
              return (
                <div
                  key={index}
                  className="p-6 bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-6 w-6 ${check.color}`} />
                    <span className="font-medium text-sm">
                      {
                        t.validationChecks[
                          check.key as keyof typeof t.validationChecks
                        ]
                      }
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Data Types */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            {t.dataTypes.title}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {dataTypes.map((type, index) => {
              const Icon = type.icon;
              return (
                <div
                  key={index}
                  className="text-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div
                    className={`w-12 h-12 ${type.color} rounded-lg flex items-center justify-center mx-auto mb-4`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold mb-2">
                    {t.dataTypes[type.key as keyof typeof t.dataTypes]}
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
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.benefits.zeroRejections.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.benefits.zeroRejections.description}
              </p>
            </div>

            <div className="p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.benefits.timeEfficiency.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.benefits.timeEfficiency.description}
              </p>
            </div>

            <div className="p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-6">
                <Shield className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.benefits.complianceAssurance.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.benefits.complianceAssurance.description}
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
        <div className="bg-gradient-to-r from-blue-600 to-green-600 text-white text-center rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-4">
            Eliminate ERGANI Rejections Forever
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Transform your ERGANI compliance with real-time validation that
            ensures 100% submission success and complete Greek labor law
            adherence.
          </p>

          <Button
            size="lg"
            className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3"
            onClick={() => setShowFullSystem(true)}
          >
            <CheckCheck className="h-5 w-5 mr-2" />
            Launch ERGANI Validation System
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
