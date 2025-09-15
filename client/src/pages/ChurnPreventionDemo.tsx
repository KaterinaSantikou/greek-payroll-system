/**
 * Churn Prevention Demo Page
 * Showcase of proactive outreach system for at-risk accounts
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ChurnPrevention from '@/components/ChurnPrevention';
import {
  AlertTriangle,
  TrendingDown,
  Users,
  Mail,
  Phone,
  Calendar,
  Target,
  Shield,
  Heart,
  Zap,
  BarChart3,
  DollarSign,
  CheckCircle,
  Clock,
  Globe,
  ArrowRight,
  Star,
  Activity,
  Eye,
  TrendingUp,
  AlertCircle,
  MessageSquare,
  Bell,
} from 'lucide-react';

interface DemoProps {
  locale?: 'en' | 'el';
}

export default function ChurnPreventionDemo({ locale = 'en' }: DemoProps) {
  const [selectedLocale, setSelectedLocale] = useState<'en' | 'el'>(locale);
  const [showFullSystem, setShowFullSystem] = useState(false);

  const translations = {
    en: {
      title: 'Churn Prevention',
      subtitle: 'Proactive Outreach to At-Risk Accounts',
      hero: {
        title: 'Prevent Customer Churn Before It Happens',
        subtitle:
          'Advanced AI-powered system that identifies at-risk accounts and implements targeted retention strategies to maximize customer lifetime value and reduce revenue loss.',
        cta: 'Launch Churn Prevention',
        ctaSecondary: 'Explore Features',
      },
      features: {
        title: 'Comprehensive Churn Prevention Features',
        riskScoring: {
          title: 'AI Risk Scoring',
          description:
            'Advanced algorithms analyze customer behavior patterns to predict churn probability with 85% accuracy.',
        },
        proactiveOutreach: {
          title: 'Automated Outreach',
          description:
            'Intelligent campaigns automatically trigger personalized retention efforts based on risk level and customer profile.',
        },
        realTimeAlerts: {
          title: 'Real-Time Alerts',
          description:
            'Instant notifications to account managers when customer health scores drop or risk factors increase.',
        },
        retentionCampaigns: {
          title: 'Retention Campaigns',
          description:
            'Pre-built, customizable campaigns designed to address specific churn risks and re-engage customers.',
        },
      },
      benefits: {
        title: 'Why Churn Prevention Transforms Customer Retention',
        revenueProtection: {
          title: 'Revenue Protection',
          description:
            'Prevent up to 78% of potential churn, protecting millions in recurring revenue through proactive intervention.',
        },
        earlyWarning: {
          title: 'Early Warning System',
          description:
            'Identify at-risk customers 60-90 days before cancellation, providing ample time for successful retention efforts.',
        },
        personalizedApproach: {
          title: 'Personalized Retention',
          description:
            'Tailored outreach strategies based on customer segment, risk factors, and historical success patterns.',
        },
      },
      riskFactors: {
        title: 'Key Churn Risk Indicators',
        loginFrequency: 'Decreased Login Frequency',
        supportTickets: 'Increased Support Tickets',
        paymentDelays: 'Payment Delays',
        featureAdoption: 'Low Feature Adoption',
        engagementDrop: 'Engagement Drop',
        competitorActivity: 'Competitor Activity',
        contractExpiring: 'Contract Expiring Soon',
        keyUserLeaving: 'Key User Departure',
      },
      outreachStrategies: {
        title: 'Proven Retention Strategies',
        executiveMeeting: 'Executive Success Review',
        trainingSession: 'Personalized Training Session',
        featureShowcase: 'Advanced Feature Showcase',
        loyaltyProgram: 'Loyalty Program Enrollment',
        contractRenewal: 'Early Renewal Incentives',
        successPlanning: 'Success Planning Workshop',
      },
      performance: {
        title: 'Churn Prevention Performance',
        churnReduction: 'Churn Reduction',
        revenueRetained: 'Revenue Retained',
        successRate: 'Retention Success Rate',
        averageRecoveryTime: 'Average Recovery Time',
      },
      industries: {
        title: 'Industry-Specific Retention',
        saas: 'SaaS & Technology',
        hospitality: 'Hotels & Hospitality',
        retail: 'Retail & E-commerce',
        manufacturing: 'Manufacturing',
        professional: 'Professional Services',
        healthcare: 'Healthcare',
      },
    },
    el: {
      title: 'Πρόληψη Εγκατάλειψης',
      subtitle: 'Προληπτική Προσέγγιση σε Λογαριασμούς Υψηλού Κινδύνου',
      hero: {
        title: 'Αποτρέψτε την Εγκατάλειψη Πελατών Προτού Συμβεί',
        subtitle:
          'Προηγμένο σύστημα τεχνητής νοημοσύνης που εντοπίζει λογαριασμούς υψηλού κινδύνου και εφαρμόζει στοχευμένες στρατηγικές διατήρησης για μεγιστοποίηση της αξίας ζωής πελατών και μείωση απώλειας εσόδων.',
        cta: 'Εκκίνηση Συστήματος Πρόληψης',
        ctaSecondary: 'Εξερεύνηση Χαρακτηριστικών',
      },
      features: {
        title: 'Περιεκτικά Χαρακτηριστικά Πρόληψης Εγκατάλειψης',
        riskScoring: {
          title: 'Βαθμολογία Κινδύνου AI',
          description:
            'Προηγμένοι αλγόριθμοι αναλύουν τα πρότυπα συμπεριφοράς πελατών για πρόβλεψη πιθανότητας εγκατάλειψης με 85% ακρίβεια.',
        },
        proactiveOutreach: {
          title: 'Αυτοματοποιημένη Προσέγγιση',
          description:
            'Έξυπνες καμπάνιες ενεργοποιούν αυτόματα εξατομικευμένες προσπάθειες διατήρησης βάσει επιπέδου κινδύνου και προφίλ πελάτη.',
        },
        realTimeAlerts: {
          title: 'Ειδοποιήσεις Πραγματικού Χρόνου',
          description:
            'Άμεσες ειδοποιήσεις στους υπεύθυνους λογαριασμών όταν οι βαθμοί υγείας πελατών πέφτουν ή αυξάνονται οι παράγοντες κινδύνου.',
        },
        retentionCampaigns: {
          title: 'Καμπάνιες Διατήρησης',
          description:
            'Προκατασκευασμένες, προσαρμόσιμες καμπάνιες σχεδιασμένες για αντιμετώπιση συγκεκριμένων κινδύνων εγκατάλειψης και επαναδέσμευση πελατών.',
        },
      },
      benefits: {
        title: 'Γιατί η Πρόληψη Εγκατάλειψης Μεταμορφώνει τη Διατήρηση Πελατών',
        revenueProtection: {
          title: 'Προστασία Εσόδων',
          description:
            'Αποτρέψτε έως και 78% των πιθανών εγκαταλείψεων, προστατεύοντας εκατομμύρια σε επαναλαμβανόμενα έσοδα μέσω προληπτικής παρέμβασης.',
        },
        earlyWarning: {
          title: 'Σύστημα Έγκαιρης Προειδοποίησης',
          description:
            'Εντοπίστε πελάτες υψηλού κινδύνου 60-90 ημέρες πριν την ακύρωση, παρέχοντας άφθονο χρόνο για επιτυχείς προσπάθειες διατήρησης.',
        },
        personalizedApproach: {
          title: 'Εξατομικευμένη Διατήρηση',
          description:
            'Προσαρμοσμένες στρατηγικές προσέγγισης βάσει τμήματος πελάτη, παραγόντων κινδύνου και ιστορικών προτύπων επιτυχίας.',
        },
      },
      riskFactors: {
        title: 'Βασικοί Δείκτες Κινδύνου Εγκατάλειψης',
        loginFrequency: 'Μειωμένη Συχνότητα Σύνδεσης',
        supportTickets: 'Αυξημένα Tickets Υποστήριξης',
        paymentDelays: 'Καθυστερήσεις Πληρωμών',
        featureAdoption: 'Χαμηλή Υιοθέτηση Χαρακτηριστικών',
        engagementDrop: 'Πτώση Δέσμευσης',
        competitorActivity: 'Δραστηριότητα Ανταγωνιστών',
        contractExpiring: 'Σύμβαση Λήγει Σύντομα',
        keyUserLeaving: 'Αποχώρηση Κύριου Χρήστη',
      },
      outreachStrategies: {
        title: 'Δοκιμασμένες Στρατηγικές Διατήρησης',
        executiveMeeting: 'Ανασκόπηση Επιτυχίας Διοίκησης',
        trainingSession: 'Εξατομικευμένη Συνεδρία Εκπαίδευσης',
        featureShowcase: 'Επίδειξη Προχωρημένων Χαρακτηριστικών',
        loyaltyProgram: 'Εγγραφή Προγράμματος Πιστότητας',
        contractRenewal: 'Κίνητρα Έγκαιρης Ανανέωσης',
        successPlanning: 'Εργαστήριο Σχεδιασμού Επιτυχίας',
      },
      performance: {
        title: 'Απόδοση Πρόληψης Εγκατάλειψης',
        churnReduction: 'Μείωση Εγκαταλείψεων',
        revenueRetained: 'Έσοδα που Διατηρήθηκαν',
        successRate: 'Ποσοστό Επιτυχίας Διατήρησης',
        averageRecoveryTime: 'Μέσος Χρόνος Αποκατάστασης',
      },
      industries: {
        title: 'Κλαδική Διατήρηση',
        saas: 'SaaS & Τεχνολογία',
        hospitality: 'Ξενοδοχεία & Φιλοξενία',
        retail: 'Λιανικό & Ηλεκτρονικό Εμπόριο',
        manufacturing: 'Βιομηχανία',
        professional: 'Επαγγελματικές Υπηρεσίες',
        healthcare: 'Υγειονομική Περίθαλψη',
      },
    },
  };

  const t = translations[selectedLocale];

  const riskFactors = [
    { key: 'loginFrequency', icon: Activity, color: 'text-red-600' },
    { key: 'supportTickets', icon: MessageSquare, color: 'text-orange-600' },
    { key: 'paymentDelays', icon: DollarSign, color: 'text-yellow-600' },
    { key: 'featureAdoption', icon: Target, color: 'text-purple-600' },
    { key: 'engagementDrop', icon: TrendingDown, color: 'text-blue-600' },
    { key: 'competitorActivity', icon: AlertTriangle, color: 'text-red-600' },
    { key: 'contractExpiring', icon: Clock, color: 'text-orange-600' },
    { key: 'keyUserLeaving', icon: Users, color: 'text-gray-600' },
  ];

  const outreachStrategies = [
    {
      key: 'executiveMeeting',
      icon: Users,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      key: 'trainingSession',
      icon: Target,
      color: 'bg-green-100 text-green-600',
    },
    {
      key: 'featureShowcase',
      icon: Eye,
      color: 'bg-purple-100 text-purple-600',
    },
    { key: 'loyaltyProgram', icon: Heart, color: 'bg-red-100 text-red-600' },
    {
      key: 'contractRenewal',
      icon: Shield,
      color: 'bg-orange-100 text-orange-600',
    },
    {
      key: 'successPlanning',
      icon: CheckCircle,
      color: 'bg-emerald-100 text-emerald-600',
    },
  ];

  const performanceMetrics = [
    {
      key: 'churnReduction',
      value: '78%',
      icon: TrendingUp,
      color: 'text-green-600',
    },
    {
      key: 'revenueRetained',
      value: '€2.1M',
      icon: DollarSign,
      color: 'text-blue-600',
    },
    {
      key: 'successRate',
      value: '85%',
      icon: CheckCircle,
      color: 'text-emerald-600',
    },
    {
      key: 'averageRecoveryTime',
      value: '12 days',
      icon: Clock,
      color: 'text-purple-600',
    },
  ];

  const industries = [
    { key: 'saas', icon: Zap, color: 'text-blue-600' },
    { key: 'hospitality', icon: Heart, color: 'text-orange-600' },
    { key: 'retail', icon: Users, color: 'text-purple-600' },
    { key: 'manufacturing', icon: Shield, color: 'text-gray-600' },
    { key: 'professional', icon: Target, color: 'text-green-600' },
    { key: 'healthcare', icon: Activity, color: 'text-red-600' },
  ];

  if (showFullSystem) {
    return <ChurnPrevention locale={selectedLocale} />;
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
                <AlertTriangle className="h-4 w-4 mr-2" />
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
            <AlertTriangle className="h-4 w-4" />
            AI-Powered Customer Retention
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
              <AlertTriangle className="h-5 w-5 mr-2" />
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
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <BarChart3 className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.features.riskScoring.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.features.riskScoring.description}
              </p>
            </div>

            <div className="text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Zap className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.features.proactiveOutreach.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.features.proactiveOutreach.description}
              </p>
            </div>

            <div className="text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Bell className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.features.realTimeAlerts.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.features.realTimeAlerts.description}
              </p>
            </div>

            <div className="text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Target className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.features.retentionCampaigns.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.features.retentionCampaigns.description}
              </p>
            </div>
          </div>
        </div>

        {/* Risk Factors */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            {t.riskFactors.title}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {riskFactors.map((factor, index) => {
              const Icon = factor.icon;
              return (
                <div
                  key={index}
                  className="p-6 bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-6 w-6 ${factor.color}`} />
                    <span className="font-medium text-sm">
                      {t.riskFactors[factor.key as keyof typeof t.riskFactors]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Retention Strategies */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            {t.outreachStrategies.title}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {outreachStrategies.map((strategy, index) => {
              const Icon = strategy.icon;
              return (
                <div
                  key={index}
                  className="text-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div
                    className={`w-12 h-12 ${strategy.color} rounded-lg flex items-center justify-center mx-auto mb-4`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold mb-2">
                    {
                      t.outreachStrategies[
                        strategy.key as keyof typeof t.outreachStrategies
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
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.benefits.revenueProtection.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.benefits.revenueProtection.description}
              </p>
            </div>

            <div className="p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-6">
                <AlertCircle className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.benefits.earlyWarning.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.benefits.earlyWarning.description}
              </p>
            </div>

            <div className="p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                <Heart className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.benefits.personalizedApproach.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.benefits.personalizedApproach.description}
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
        <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white text-center rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-4">
            Stop Customer Churn Before It Starts
          </h2>
          <p className="text-xl text-red-100 mb-8 max-w-2xl mx-auto">
            Transform your customer retention strategy with AI-powered churn
            prevention that protects revenue and maximizes lifetime value.
          </p>

          <Button
            size="lg"
            className="bg-white text-red-600 hover:bg-gray-100 px-8 py-3"
            onClick={() => setShowFullSystem(true)}
          >
            <AlertTriangle className="h-5 w-5 mr-2" />
            Launch Churn Prevention System
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
