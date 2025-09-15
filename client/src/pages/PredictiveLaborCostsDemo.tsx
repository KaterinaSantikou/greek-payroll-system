/**
 * Predictive Labor Costs Demo Page
 * Showcase of monthly payroll expense forecasting system
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import PredictiveLaborCosts from '@/components/PredictiveLaborCosts';
import {
  LineChart,
  TrendingUp,
  TrendingDown,
  Euro,
  Calendar,
  Users,
  BarChart3,
  Target,
  AlertTriangle,
  CheckCircle,
  Activity,
  Clock,
  Calculator,
  PieChart,
  Eye,
  Download,
  Globe,
  ArrowRight,
  Zap,
  Shield,
  Star,
  Flag,
  Building,
  MapPin,
  Briefcase,
  Award,
  Factory,
  Hotel,
  ShoppingCart,
  Stethoscope,
  Construction,
  Cpu,
  Settings,
} from 'lucide-react';

interface DemoProps {
  locale?: 'en' | 'el';
}

export default function PredictiveLaborCostsDemo({ locale = 'en' }: DemoProps) {
  const [selectedLocale, setSelectedLocale] = useState<'en' | 'el'>(locale);
  const [showFullSystem, setShowFullSystem] = useState(false);

  const translations = {
    en: {
      title: 'Predictive Labor Costs',
      subtitle: 'Forecast Monthly Payroll Expenses',
      hero: {
        title: 'Forecast Labor Costs with Advanced Analytics',
        subtitle:
          'Sophisticated predictive modeling platform that accurately forecasts monthly payroll expenses using Greek market intelligence, seasonal patterns, regulatory changes, and economic indicators to enable precise budgeting and strategic workforce planning.',
        cta: 'Launch Forecasting System',
        ctaSecondary: 'Explore Predictions',
      },
      features: {
        title: 'Advanced Forecasting Features',
        predictiveModeling: {
          title: 'Predictive Modeling',
          description:
            'AI-powered forecasting algorithms that analyze historical data, market trends, and regulatory changes to predict future labor costs with 87% accuracy.',
        },
        scenarioAnalysis: {
          title: 'Scenario Analysis',
          description:
            'Multiple forecasting scenarios including optimistic, baseline, and pessimistic projections with probability assessments and risk analysis.',
        },
        seasonalIntelligence: {
          title: 'Seasonal Intelligence',
          description:
            'Advanced seasonal pattern recognition for Greek markets, accounting for tourism cycles, holiday periods, and industry-specific fluctuations.',
        },
        costDriverTracking: {
          title: 'Cost Driver Tracking',
          description:
            'Comprehensive monitoring of regulatory, market, seasonal, and operational factors that influence labor costs with trend analysis.',
        },
      },
      benefits: {
        title: 'Why Predictive Labor Costs Transform Budget Planning',
        budgetAccuracy: {
          title: 'Budget Accuracy',
          description:
            'Improve budget planning accuracy by 45% with precise monthly forecasts that account for all cost variables and seasonal fluctuations.',
        },
        riskMitigation: {
          title: 'Risk Mitigation',
          description:
            'Identify and prepare for cost increases up to 6 months in advance, enabling proactive budget adjustments and risk management.',
        },
        strategicPlanning: {
          title: 'Strategic Planning',
          description:
            'Enable long-term workforce planning with accurate cost projections that support hiring decisions and capacity management.',
        },
      },
      forecastComponents: {
        title: 'Forecast Components',
        baseSalary: 'Base Salary Projections',
        overtime: 'Overtime Cost Predictions',
        benefits: 'Benefits & Allowances',
        socialSecurity: 'Social Security Contributions',
        taxes: 'Tax Obligations',
        bonuses: 'Bonus & Incentive Payments',
        seasonalAdjustments: 'Seasonal Adjustments',
        regulatoryChanges: 'Regulatory Impact Analysis',
      },
      scenarios: {
        title: 'Forecasting Scenarios',
        optimistic: 'Optimistic Scenario (25% probability)',
        baseline: 'Baseline Scenario (55% probability)',
        pessimistic: 'Pessimistic Scenario (20% probability)',
        riskAssessment: 'Risk Assessment & Impact Analysis',
        confidence: 'Confidence Intervals & Accuracy',
        variability: 'Monthly Variability Analysis',
      },
      performance: {
        title: 'Forecasting Performance Metrics',
        predictedAnnualCost: 'Predicted Annual Cost',
        forecastAccuracy: 'Forecast Accuracy',
        confidenceLevel: 'Confidence Level',
        seasonalVariation: 'Seasonal Variation',
      },
      drivers: {
        title: 'Key Cost Drivers',
        regulatory: 'Regulatory Changes',
        market: 'Market Conditions',
        seasonal: 'Seasonal Patterns',
        operational: 'Operational Factors',
        minimumWage: 'Minimum Wage Updates',
        efkaContributions: 'EFKA Contribution Changes',
      },
    },
    el: {
      title: 'Προβλεπτικό Κόστος Εργασίας',
      subtitle: 'Πρόβλεψη Μηνιαίων Εξόδων Μισθοδοσίας',
      hero: {
        title: 'Πρόβλεψη Κόστους Εργασίας με Προηγμένα Αναλυτικά',
        subtitle:
          'Εξελιγμένη πλατφόρμα προβλεπτικής μοντελοποίησης που προβλέπει με ακρίβεια μηνιαία έξοδα μισθοδοσίας χρησιμοποιώντας ελληνική νοημοσύνη αγοράς, εποχικά πρότυπα, κανονιστικές αλλαγές και οικονομικούς δείκτες για να επιτρέψει ακριβή προϋπολογισμό και στρατηγικό σχεδιασμό εργατικού δυναμικού.',
        cta: 'Εκκίνηση Συστήματος Πρόβλεψης',
        ctaSecondary: 'Εξερεύνηση Προβλέψεων',
      },
      features: {
        title: 'Προηγμένα Χαρακτηριστικά Πρόβλεψης',
        predictiveModeling: {
          title: 'Προβλεπτική Μοντελοποίηση',
          description:
            'Αλγόριθμοι πρόβλεψης με τεχνητή νοημοσύνη που αναλύουν ιστορικά δεδομένα, τάσεις αγοράς και κανονιστικές αλλαγές για πρόβλεψη μελλοντικού κόστους εργασίας με ακρίβεια 87%.',
        },
        scenarioAnalysis: {
          title: 'Ανάλυση Σεναρίων',
          description:
            'Πολλαπλά σενάρια πρόβλεψης συμπεριλαμβανομένων αισιόδοξων, βασικών και απαισιόδοξων προβολών με αξιολογήσεις πιθανότητας και ανάλυση κινδύνων.',
        },
        seasonalIntelligence: {
          title: 'Εποχική Νοημοσύνη',
          description:
            'Προηγμένη αναγνώριση εποχικών προτύπων για ελληνικές αγορές, λαμβάνοντας υπόψη τουριστικούς κύκλους, περιόδους διακοπών και διακυμάνσεις ειδικές για τον κλάδο.',
        },
        costDriverTracking: {
          title: 'Παρακολούθηση Παραγόντων Κόστους',
          description:
            'Περιεκτική παρακολούθηση κανονιστικών, αγοραίων, εποχικών και λειτουργικών παραγόντων που επηρεάζουν το κόστος εργασίας με ανάλυση τάσεων.',
        },
      },
      benefits: {
        title:
          'Γιατί το Προβλεπτικό Κόστος Εργασίας Μεταμορφώνει τον Σχεδιασμό Προϋπολογισμού',
        budgetAccuracy: {
          title: 'Ακρίβεια Προϋπολογισμού',
          description:
            'Βελτιώστε την ακρίβεια σχεδιασμού προϋπολογισμού κατά 45% με ακριβείς μηνιαίες προβλέψεις που λαμβάνουν υπόψη όλες τις μεταβλητές κόστους και εποχικές διακυμάνσεις.',
        },
        riskMitigation: {
          title: 'Μείωση Κινδύνων',
          description:
            'Εντοπίστε και προετοιμαστείτε για αυξήσεις κόστους έως 6 μήνες εκ των προτέρων, επιτρέποντας προληπτικές προσαρμογές προϋπολογισμού και διαχείριση κινδύνων.',
        },
        strategicPlanning: {
          title: 'Στρατηγικός Σχεδιασμός',
          description:
            'Επιτρέψτε μακροπρόθεσμο σχεδιασμό εργατικού δυναμικού με ακριβείς προβολές κόστους που υποστηρίζουν αποφάσεις πρόσληψης και διαχείρισης χωρητικότητας.',
        },
      },
      forecastComponents: {
        title: 'Συστατικά Πρόβλεψης',
        baseSalary: 'Προβολές Βασικού Μισθού',
        overtime: 'Προβλέψεις Κόστους Υπερωριών',
        benefits: 'Παροχές & Επιδόματα',
        socialSecurity: 'Εισφορές Κοινωνικής Ασφάλισης',
        taxes: 'Φορολογικές Υποχρεώσεις',
        bonuses: 'Μπόνους & Πληρωμές Κινήτρων',
        seasonalAdjustments: 'Εποχικές Προσαρμογές',
        regulatoryChanges: 'Ανάλυση Κανονιστικού Αντίκτυπου',
      },
      scenarios: {
        title: 'Σενάρια Πρόβλεψης',
        optimistic: 'Αισιόδοξο Σενάριο (25% πιθανότητα)',
        baseline: 'Βασικό Σενάριο (55% πιθανότητα)',
        pessimistic: 'Απαισιόδοξο Σενάριο (20% πιθανότητα)',
        riskAssessment: 'Αξιολόγηση Κινδύνου & Ανάλυση Αντίκτυπου',
        confidence: 'Διαστήματα Εμπιστοσύνης & Ακρίβεια',
        variability: 'Ανάλυση Μηνιαίας Μεταβλητότητας',
      },
      performance: {
        title: 'Μετρικές Απόδοσης Πρόβλεψης',
        predictedAnnualCost: 'Προβλεπόμενο Ετήσιο Κόστος',
        forecastAccuracy: 'Ακρίβεια Πρόβλεψης',
        confidenceLevel: 'Επίπεδο Εμπιστοσύνης',
        seasonalVariation: 'Εποχική Διακύμανση',
      },
      drivers: {
        title: 'Βασικοί Παράγοντες Κόστους',
        regulatory: 'Κανονιστικές Αλλαγές',
        market: 'Συνθήκες Αγοράς',
        seasonal: 'Εποχικά Μοτίβα',
        operational: 'Λειτουργικοί Παράγοντες',
        minimumWage: 'Ενημερώσεις Κατώτατου Μισθού',
        efkaContributions: 'Αλλαγές Εισφορών ΕΦΚΑ',
      },
    },
  };

  const t = translations[selectedLocale];

  const forecastComponents = [
    { key: 'baseSalary', icon: Euro, color: 'text-green-600' },
    { key: 'overtime', icon: Clock, color: 'text-blue-600' },
    { key: 'benefits', icon: Shield, color: 'text-purple-600' },
    { key: 'socialSecurity', icon: Users, color: 'text-orange-600' },
    { key: 'taxes', icon: Calculator, color: 'text-red-600' },
    { key: 'bonuses', icon: Award, color: 'text-indigo-600' },
    { key: 'seasonalAdjustments', icon: Calendar, color: 'text-yellow-600' },
    { key: 'regulatoryChanges', icon: Settings, color: 'text-pink-600' },
  ];

  const scenarios = [
    { key: 'optimistic', icon: TrendingUp, color: 'text-green-600' },
    { key: 'baseline', icon: Target, color: 'text-blue-600' },
    { key: 'pessimistic', icon: TrendingDown, color: 'text-red-600' },
    { key: 'riskAssessment', icon: AlertTriangle, color: 'text-orange-600' },
    { key: 'confidence', icon: CheckCircle, color: 'text-purple-600' },
    { key: 'variability', icon: Activity, color: 'text-indigo-600' },
  ];

  const performanceMetrics = [
    {
      key: 'predictedAnnualCost',
      value: '€3.74M',
      icon: Euro,
      color: 'text-green-600',
    },
    {
      key: 'forecastAccuracy',
      value: '87.2%',
      icon: Target,
      color: 'text-blue-600',
    },
    {
      key: 'confidenceLevel',
      value: '82.1%',
      icon: CheckCircle,
      color: 'text-purple-600',
    },
    {
      key: 'seasonalVariation',
      value: '47.3%',
      icon: Calendar,
      color: 'text-orange-600',
    },
  ];

  const costDrivers = [
    { key: 'regulatory', icon: Settings, color: 'text-blue-600' },
    { key: 'market', icon: TrendingUp, color: 'text-green-600' },
    { key: 'seasonal', icon: Calendar, color: 'text-orange-600' },
    { key: 'operational', icon: Activity, color: 'text-purple-600' },
    { key: 'minimumWage', icon: Euro, color: 'text-red-600' },
    { key: 'efkaContributions', icon: Shield, color: 'text-indigo-600' },
  ];

  if (showFullSystem) {
    return <PredictiveLaborCosts locale={selectedLocale} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
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
                <LineChart className="h-4 w-4 mr-2" />
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
            <LineChart className="h-4 w-4" />
            Advanced Labor Cost Forecasting
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
              <LineChart className="h-5 w-5 mr-2" />
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
                {t.features.predictiveModeling.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.features.predictiveModeling.description}
              </p>
            </div>

            <div className="text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Target className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.features.scenarioAnalysis.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.features.scenarioAnalysis.description}
              </p>
            </div>

            <div className="text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Calendar className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.features.seasonalIntelligence.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.features.seasonalIntelligence.description}
              </p>
            </div>

            <div className="text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Activity className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.features.costDriverTracking.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.features.costDriverTracking.description}
              </p>
            </div>
          </div>
        </div>

        {/* Forecast Components */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            {t.forecastComponents.title}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {forecastComponents.map((component, index) => {
              const Icon = component.icon;
              return (
                <div
                  key={index}
                  className="text-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Icon className={`h-6 w-6 ${component.color}`} />
                  </div>
                  <h3 className="font-semibold mb-2 text-sm">
                    {
                      t.forecastComponents[
                        component.key as keyof typeof t.forecastComponents
                      ]
                    }
                  </h3>
                </div>
              );
            })}
          </div>
        </div>

        {/* Forecasting Scenarios */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            {t.scenarios.title}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {scenarios.map((scenario, index) => {
              const Icon = scenario.icon;
              return (
                <div
                  key={index}
                  className="text-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Icon className={`h-6 w-6 ${scenario.color}`} />
                  </div>
                  <h3 className="font-semibold mb-2">
                    {t.scenarios[scenario.key as keyof typeof t.scenarios]}
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
                <Calculator className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.benefits.budgetAccuracy.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.benefits.budgetAccuracy.description}
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
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-6">
                <Target className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.benefits.strategicPlanning.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.benefits.strategicPlanning.description}
              </p>
            </div>
          </div>
        </div>

        {/* Cost Drivers */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            {t.drivers.title}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {costDrivers.map((driver, index) => {
              const Icon = driver.icon;
              return (
                <div
                  key={index}
                  className="text-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Icon className={`h-6 w-6 ${driver.color}`} />
                  </div>
                  <h3 className="font-semibold mb-2">
                    {t.drivers[driver.key as keyof typeof t.drivers]}
                  </h3>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-center rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-4">
            Transform Your Budget Planning Today
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Enable precise workforce cost forecasting with advanced predictive
            modeling that accounts for Greek market conditions, seasonal
            patterns, and regulatory changes for strategic budget planning.
          </p>

          <Button
            size="lg"
            className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3"
            onClick={() => setShowFullSystem(true)}
          >
            <LineChart className="h-5 w-5 mr-2" />
            Launch Predictive Forecasting System
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
