/**
 * Compliance Risk Scoring Demo Page
 * Showcase of proactive compliance monitoring and violation prevention system
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ComplianceRiskScoring from '@/components/ComplianceRiskScoring';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Target,
  Activity,
  Bell,
  Eye,
  Download,
  Globe,
  ArrowRight,
  Zap,
  Star,
  Flag,
  Building,
  Users,
  Calendar,
  Euro,
  Scale,
  FileText,
  BarChart3,
  PieChart,
  LineChart,
  Settings,
  Award,
  Briefcase,
  Calculator,
  CreditCard,
  Receipt,
  MapPin,
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

export default function ComplianceRiskScoringDemo({
  locale = 'en',
}: DemoProps) {
  const [selectedLocale, setSelectedLocale] = useState<'en' | 'el'>(locale);
  const [showFullSystem, setShowFullSystem] = useState(false);

  const translations = {
    en: {
      title: 'Compliance Risk Scoring',
      subtitle: 'Alert Before Potential Violations',
      hero: {
        title: 'Proactive Compliance Risk Management',
        subtitle:
          'Advanced risk assessment system that monitors compliance across all Greek labor law areas, providing early warning alerts before violations occur and ensuring continuous regulatory adherence through intelligent risk scoring and predictive analytics.',
        cta: 'Launch Risk Assessment System',
        ctaSecondary: 'Explore Risk Analysis',
      },
      features: {
        title: 'Advanced Risk Assessment Features',
        predictiveAnalytics: {
          title: 'Predictive Analytics',
          description:
            'AI-powered risk assessment algorithms that identify potential compliance violations before they occur, with 85% accuracy in violation prediction.',
        },
        realTimeMonitoring: {
          title: 'Real-Time Monitoring',
          description:
            'Continuous monitoring of all compliance areas with instant alerts when risk thresholds are exceeded or violations become imminent.',
        },
        multiCategoryAssessment: {
          title: 'Multi-Category Assessment',
          description:
            'Comprehensive risk evaluation across ERGANI, tax compliance, social security, labor law, and payroll regulations with detailed scoring.',
        },
        automatedRemediation: {
          title: 'Automated Remediation',
          description:
            'Intelligent recommendation engine providing specific action plans and remediation steps to address identified risks and prevent violations.',
        },
      },
      benefits: {
        title: 'Why Proactive Compliance Risk Management Prevents Violations',
        violationPrevention: {
          title: 'Violation Prevention',
          description:
            'Identify and address compliance risks up to 2 weeks before violations occur, reducing potential fines by 90% through proactive intervention.',
        },
        riskMitigation: {
          title: 'Risk Mitigation',
          description:
            'Comprehensive risk scoring across all compliance areas with automated alerts and remediation guidance to maintain continuous compliance.',
        },
        regulatoryConfidence: {
          title: 'Regulatory Confidence',
          description:
            'Ensure continuous adherence to Greek labor law requirements with real-time monitoring and predictive compliance assessment.',
        },
      },
      riskCategories: {
        title: 'Risk Assessment Categories',
        erganiCompliance: 'ERGANI System Compliance',
        taxCompliance: 'Tax & Withholding Compliance',
        socialSecurity: 'Social Security & EFKA',
        laborLaw: 'Greek Labor Law Adherence',
        payrollCompliance: 'Payroll Calculation Accuracy',
        workingTime: 'Working Time Regulations',
        holidayCompliance: 'Holiday & Leave Compliance',
        documentCompliance: 'Documentation & Reporting',
      },
      alertTypes: {
        title: 'Compliance Alert Types',
        immediate: 'Immediate Action Required',
        upcoming: 'Upcoming Deadline Alerts',
        potential: 'Potential Risk Warnings',
        preventive: 'Preventive Recommendations',
        regulatory: 'Regulatory Change Alerts',
        inspection: 'Inspection Preparedness',
      },
      performance: {
        title: 'Risk Assessment Performance Metrics',
        overallScore: 'Overall Compliance Score',
        activeAlerts: 'Active Risk Alerts',
        preventedViolations: 'Prevented Violations',
        riskAccuracy: 'Risk Prediction Accuracy',
      },
      riskLevels: {
        title: 'Risk Level Classifications',
        critical: 'Critical Risk (80-100)',
        high: 'High Risk (60-79)',
        medium: 'Medium Risk (40-59)',
        low: 'Low Risk (0-39)',
        monitoring: 'Continuous Monitoring',
        assessment: 'Regular Assessment',
      },
    },
    el: {
      title: 'Βαθμολόγηση Κινδύνου Συμμόρφωσης',
      subtitle: 'Ειδοποίηση Πριν από Πιθανές Παραβάσεις',
      hero: {
        title: 'Προληπτική Διαχείριση Κινδύνου Συμμόρφωσης',
        subtitle:
          'Προηγμένο σύστημα αξιολόγησης κινδύνου που παρακολουθεί τη συμμόρφωση σε όλους τους τομείς του ελληνικού εργατικού δικαίου, παρέχοντας πρώιμες προειδοποιήσεις πριν από την εμφάνιση παραβάσεων και διασφαλίζοντας συνεχή κανονιστική συμμόρφωση μέσω έξυπνης βαθμολόγησης κινδύνου και προβλεπτικών αναλυτικών.',
        cta: 'Εκκίνηση Συστήματος Αξιολόγησης Κινδύνου',
        ctaSecondary: 'Εξερεύνηση Ανάλυσης Κινδύνου',
      },
      features: {
        title: 'Προηγμένα Χαρακτηριστικά Αξιολόγησης Κινδύνου',
        predictiveAnalytics: {
          title: 'Προβλεπτικά Αναλυτικά',
          description:
            'Αλγόριθμοι αξιολόγησης κινδύνου με τεχνητή νοημοσύνη που εντοπίζουν πιθανές παραβάσεις συμμόρφωσης πριν συμβούν, με ακρίβεια πρόβλεψης παράβασης 85%.',
        },
        realTimeMonitoring: {
          title: 'Παρακολούθηση Πραγματικού Χρόνου',
          description:
            'Συνεχής παρακολούθηση όλων των περιοχών συμμόρφωσης με άμεσες ειδοποιήσεις όταν υπερβαίνονται τα όρια κινδύνου ή οι παραβάσεις γίνονται επικείμενες.',
        },
        multiCategoryAssessment: {
          title: 'Πολυκατηγορική Αξιολόγηση',
          description:
            'Περιεκτική αξιολόγηση κινδύνου σε ΕΡΓΑΝΗ, φορολογική συμμόρφωση, κοινωνική ασφάλιση, εργατικό δίκαιο και κανονισμούς μισθοδοσίας με λεπτομερή βαθμολόγηση.',
        },
        automatedRemediation: {
          title: 'Αυτοματοποιημένη Αποκατάσταση',
          description:
            'Έξυπνη μηχανή συστάσεων που παρέχει συγκεκριμένα σχέδια δράσης και βήματα αποκατάστασης για την αντιμετώπιση εντοπισμένων κινδύνων και την πρόληψη παραβάσεων.',
        },
      },
      benefits: {
        title:
          'Γιατί η Προληπτική Διαχείριση Κινδύνου Συμμόρφωσης Αποτρέπει Παραβάσεις',
        violationPrevention: {
          title: 'Πρόληψη Παραβάσεων',
          description:
            'Εντοπισμός και αντιμετώπιση κινδύνων συμμόρφωσης έως 2 εβδομάδες πριν από την εμφάνιση παραβάσεων, μειώνοντας πιθανά πρόστιμα κατά 90% μέσω προληπτικής παρέμβασης.',
        },
        riskMitigation: {
          title: 'Μείωση Κινδύνων',
          description:
            'Περιεκτική βαθμολόγηση κινδύνου σε όλες τις περιοχές συμμόρφωσης με αυτοματοποιημένες ειδοποιήσεις και καθοδήγηση αποκατάστασης για διατήρηση συνεχούς συμμόρφωσης.',
        },
        regulatoryConfidence: {
          title: 'Κανονιστική Εμπιστοσύνη',
          description:
            'Διασφάλιση συνεχούς τήρησης των απαιτήσεων ελληνικού εργατικού δικαίου με παρακολούθηση πραγματικού χρόνου και προβλεπτική αξιολόγηση συμμόρφωσης.',
        },
      },
      riskCategories: {
        title: 'Κατηγορίες Αξιολόγησης Κινδύνου',
        erganiCompliance: 'Συμμόρφωση Συστήματος ΕΡΓΑΝΗ',
        taxCompliance: 'Φορολογική & Παρακρατήσεων Συμμόρφωση',
        socialSecurity: 'Κοινωνική Ασφάλιση & ΕΦΚΑ',
        laborLaw: 'Τήρηση Ελληνικού Εργατικού Δικαίου',
        payrollCompliance: 'Ακρίβεια Υπολογισμού Μισθοδοσίας',
        workingTime: 'Κανονισμοί Ωραρίου Εργασίας',
        holidayCompliance: 'Συμμόρφωση Διακοπών & Αδειών',
        documentCompliance: 'Τεκμηρίωση & Αναφορές',
      },
      alertTypes: {
        title: 'Τύποι Ειδοποιήσεων Συμμόρφωσης',
        immediate: 'Απαιτείται Άμεση Ενέργεια',
        upcoming: 'Ειδοποιήσεις Επερχόμενων Προθεσμιών',
        potential: 'Προειδοποιήσεις Πιθανών Κινδύνων',
        preventive: 'Προληπτικές Συστάσεις',
        regulatory: 'Ειδοποιήσεις Κανονιστικών Αλλαγών',
        inspection: 'Ετοιμότητα Επιθεώρησης',
      },
      performance: {
        title: 'Μετρικές Απόδοσης Αξιολόγησης Κινδύνου',
        overallScore: 'Συνολικός Βαθμός Συμμόρφωσης',
        activeAlerts: 'Ενεργές Ειδοποιήσεις Κινδύνου',
        preventedViolations: 'Αποτραπείσες Παραβάσεις',
        riskAccuracy: 'Ακρίβεια Πρόβλεψης Κινδύνου',
      },
      riskLevels: {
        title: 'Κατηγοριοποιήσεις Επιπέδων Κινδύνου',
        critical: 'Κρίσιμος Κίνδυνος (80-100)',
        high: 'Υψηλός Κίνδυνος (60-79)',
        medium: 'Μέτριος Κίνδυνος (40-59)',
        low: 'Χαμηλός Κίνδυνος (0-39)',
        monitoring: 'Συνεχής Παρακολούθηση',
        assessment: 'Τακτική Αξιολόγηση',
      },
    },
  };

  const t = translations[selectedLocale];

  const riskCategories = [
    { key: 'erganiCompliance', icon: FileText, color: 'text-blue-600' },
    { key: 'taxCompliance', icon: Calculator, color: 'text-green-600' },
    { key: 'socialSecurity', icon: Shield, color: 'text-purple-600' },
    { key: 'laborLaw', icon: Scale, color: 'text-orange-600' },
    { key: 'payrollCompliance', icon: Euro, color: 'text-red-600' },
    { key: 'workingTime', icon: Clock, color: 'text-indigo-600' },
    { key: 'holidayCompliance', icon: Calendar, color: 'text-yellow-600' },
    { key: 'documentCompliance', icon: Receipt, color: 'text-pink-600' },
  ];

  const alertTypes = [
    { key: 'immediate', icon: AlertTriangle, color: 'text-red-600' },
    { key: 'upcoming', icon: Clock, color: 'text-orange-600' },
    { key: 'potential', icon: Eye, color: 'text-yellow-600' },
    { key: 'preventive', icon: Shield, color: 'text-blue-600' },
    { key: 'regulatory', icon: Scale, color: 'text-purple-600' },
    { key: 'inspection', icon: Building, color: 'text-gray-600' },
  ];

  const performanceMetrics = [
    { key: 'overallScore', value: '80%', icon: Target, color: 'text-blue-600' },
    { key: 'activeAlerts', value: '10', icon: Bell, color: 'text-orange-600' },
    {
      key: 'preventedViolations',
      value: '23',
      icon: CheckCircle,
      color: 'text-green-600',
    },
    {
      key: 'riskAccuracy',
      value: '85%',
      icon: Activity,
      color: 'text-purple-600',
    },
  ];

  const riskLevels = [
    { key: 'critical', icon: XCircle, color: 'text-red-600' },
    { key: 'high', icon: AlertTriangle, color: 'text-orange-600' },
    { key: 'medium', icon: Clock, color: 'text-yellow-600' },
    { key: 'low', icon: CheckCircle, color: 'text-green-600' },
    { key: 'monitoring', icon: Activity, color: 'text-blue-600' },
    { key: 'assessment', icon: BarChart3, color: 'text-purple-600' },
  ];

  if (showFullSystem) {
    return <ComplianceRiskScoring locale={selectedLocale} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50">
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
                className="bg-red-600 hover:bg-red-700"
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
          <div className="inline-flex items-center gap-2 bg-red-100 text-red-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Shield className="h-4 w-4" />
            Proactive Compliance Risk Management
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
                <BarChart3 className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.features.predictiveAnalytics.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.features.predictiveAnalytics.description}
              </p>
            </div>

            <div className="text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Activity className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.features.realTimeMonitoring.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.features.realTimeMonitoring.description}
              </p>
            </div>

            <div className="text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Building className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.features.multiCategoryAssessment.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.features.multiCategoryAssessment.description}
              </p>
            </div>

            <div className="text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Settings className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.features.automatedRemediation.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.features.automatedRemediation.description}
              </p>
            </div>
          </div>
        </div>

        {/* Risk Categories */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            {t.riskCategories.title}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {riskCategories.map((category, index) => {
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
                    {
                      t.riskCategories[
                        category.key as keyof typeof t.riskCategories
                      ]
                    }
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
            {alertTypes.map((alertType, index) => {
              const Icon = alertType.icon;
              return (
                <div
                  key={index}
                  className="text-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Icon className={`h-6 w-6 ${alertType.color}`} />
                  </div>
                  <h3 className="font-semibold mb-2">
                    {t.alertTypes[alertType.key as keyof typeof t.alertTypes]}
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
                {t.benefits.violationPrevention.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.benefits.violationPrevention.description}
              </p>
            </div>

            <div className="p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-6">
                <Shield className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.benefits.riskMitigation.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.benefits.riskMitigation.description}
              </p>
            </div>

            <div className="p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.benefits.regulatoryConfidence.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.benefits.regulatoryConfidence.description}
              </p>
            </div>
          </div>
        </div>

        {/* Risk Levels */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            {t.riskLevels.title}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {riskLevels.map((riskLevel, index) => {
              const Icon = riskLevel.icon;
              return (
                <div
                  key={index}
                  className="text-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Icon className={`h-6 w-6 ${riskLevel.color}`} />
                  </div>
                  <h3 className="font-semibold mb-2">
                    {t.riskLevels[riskLevel.key as keyof typeof t.riskLevels]}
                  </h3>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white text-center rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-4">
            Prevent Violations Before They Happen
          </h2>
          <p className="text-xl text-red-100 mb-8 max-w-2xl mx-auto">
            Transform your compliance management with proactive risk assessment
            that identifies potential violations weeks in advance, ensuring
            continuous regulatory adherence and avoiding costly penalties.
          </p>

          <Button
            size="lg"
            className="bg-white text-red-600 hover:bg-gray-100 px-8 py-3"
            onClick={() => setShowFullSystem(true)}
          >
            <Shield className="h-5 w-5 mr-2" />
            Launch Compliance Risk Assessment
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
