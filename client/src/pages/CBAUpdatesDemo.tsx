/**
 * CBA Updates Demo Page
 * Showcase of automated collective bargaining agreement updates system
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import CBAUpdates from '@/components/CBAUpdates';
import {
  RefreshCw,
  Bell,
  Scale,
  Shield,
  Zap,
  Clock,
  Target,
  FileText,
  Users,
  Building,
  Factory,
  Hotel,
  ShoppingCart,
  Euro,
  TrendingUp,
  BarChart3,
  CheckCircle,
  Globe,
  ArrowRight,
  Eye,
  Activity,
  AlertTriangle,
  Award,
  Star,
  BookOpen,
  Flag,
  Calendar,
  Download,
} from 'lucide-react';

interface DemoProps {
  locale?: 'en' | 'el';
}

export default function CBAUpdatesDemo({ locale = 'en' }: DemoProps) {
  const [selectedLocale, setSelectedLocale] = useState<'en' | 'el'>(locale);
  const [showFullSystem, setShowFullSystem] = useState(false);

  const translations = {
    en: {
      title: 'CBA Updates',
      subtitle: 'Automated Collective Bargaining Agreement Updates',
      hero: {
        title: 'Stay Current with All Greek Collective Agreements',
        subtitle:
          'Automated system that continuously monitors, tracks, and applies all Greek collective bargaining agreement updates to ensure continuous compliance with the latest sectoral wage scales and labor conditions.',
        cta: 'Launch CBA Tracker',
        ctaSecondary: 'Explore Features',
      },
      features: {
        title: 'Comprehensive CBA Management Features',
        automaticMonitoring: {
          title: 'Automatic Monitoring',
          description:
            'Continuously track all Greek collective agreements across 15+ sectors with real-time update detection and notification.',
        },
        instantUpdates: {
          title: 'Instant Updates',
          description:
            'Receive immediate notifications when CBAs are modified, ensuring you never miss critical wage or condition changes.',
        },
        smartApplication: {
          title: 'Smart Application',
          description:
            'Intelligently apply CBA updates to payroll systems with configurable auto-application and manual review options.',
        },
        complianceTracking: {
          title: 'Compliance Tracking',
          description:
            'Maintain 96.8% compliance rate with comprehensive tracking and reporting across all applicable agreements.',
        },
      },
      benefits: {
        title: 'Why CBA Updates Transform Labor Compliance',
        continuousCompliance: {
          title: 'Continuous Compliance',
          description:
            'Ensure 100% adherence to the latest Greek labor agreements with automated monitoring and instant update application.',
        },
        riskPrevention: {
          title: 'Risk Prevention',
          description:
            'Prevent costly labor law violations and penalties through proactive CBA compliance management and early warning systems.',
        },
        operationalEfficiency: {
          title: 'Operational Efficiency',
          description:
            'Reduce manual effort by 85% with automated agreement tracking, update detection, and intelligent application workflows.',
        },
      },
      sectors: {
        title: 'Monitored Sectors & Agreements',
        general: 'National General CBA',
        tourism: 'Tourism & Hospitality',
        retail: 'Retail Trade',
        banking: 'Banking & Finance',
        manufacturing: 'Manufacturing',
        healthcare: 'Healthcare Services',
        education: 'Education Sector',
        construction: 'Construction Industry',
        transport: 'Transportation',
        technology: 'Technology & IT',
        agriculture: 'Agriculture',
        energy: 'Energy & Utilities',
        telecommunications: 'Telecommunications',
        media: 'Media & Entertainment',
        professional: 'Professional Services',
      },
      updateTypes: {
        title: 'Types of CBA Updates Tracked',
        wageIncreases: 'Minimum Wage Increases',
        benefitChanges: 'Benefit & Allowance Changes',
        workingConditions: 'Working Conditions Updates',
        overtimePremiums: 'Overtime Premium Changes',
        holidayProvisions: 'Holiday & Leave Provisions',
        terminationRules: 'Termination & Severance Rules',
        safetyRequirements: 'Safety & Health Requirements',
        trainingProvisions: 'Training & Development Provisions',
      },
      performance: {
        title: 'CBA Management Performance',
        agreementsTracked: 'Agreements Tracked',
        updateSpeed: 'Update Detection Speed',
        complianceRate: 'Compliance Rate',
        autoApplySuccess: 'Auto-Apply Success Rate',
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
      title: 'Ενημερώσεις ΣΣΕ',
      subtitle: 'Αυτοματοποιημένες Ενημερώσεις Συλλογικών Συμβάσεων Εργασίας',
      hero: {
        title:
          'Παραμείνετε Ενημερωμένοι με Όλες τις Ελληνικές Συλλογικές Συμβάσεις',
        subtitle:
          'Αυτοματοποιημένο σύστημα που συνεχώς παρακολουθεί, εντοπίζει και εφαρμόζει όλες τις ενημερώσεις των ελληνικών συλλογικών συμβάσεων εργασίας για διασφάλιση συνεχούς συμμόρφωσης με τις τελευταίες κλαδικές μισθολογικές κλίμακες και εργασιακές συνθήκες.',
        cta: 'Εκκίνηση Παρακολούθησης ΣΣΕ',
        ctaSecondary: 'Εξερεύνηση Χαρακτηριστικών',
      },
      features: {
        title: 'Περιεκτικά Χαρακτηριστικά Διαχείρισης ΣΣΕ',
        automaticMonitoring: {
          title: 'Αυτόματη Παρακολούθηση',
          description:
            'Συνεχής παρακολούθηση όλων των ελληνικών συλλογικών συμβάσεων σε 15+ κλάδους με εντοπισμό ενημερώσεων πραγματικού χρόνου και ειδοποιήσεις.',
        },
        instantUpdates: {
          title: 'Άμεσες Ενημερώσεις',
          description:
            'Λάβετε άμεσες ειδοποιήσεις όταν τροποποιούνται οι ΣΣΕ, διασφαλίζοντας ότι δεν χάνετε κρίσιμες αλλαγές μισθών ή συνθηκών.',
        },
        smartApplication: {
          title: 'Έξυπνη Εφαρμογή',
          description:
            'Έξυπνη εφαρμογή ενημερώσεων ΣΣΕ στα συστήματα μισθοδοσίας με ρυθμιζόμενη αυτόματη εφαρμογή και επιλογές χειροκίνητης επιθεώρησης.',
        },
        complianceTracking: {
          title: 'Παρακολούθηση Συμμόρφωσης',
          description:
            'Διατήρηση ποσοστού συμμόρφωσης 96.8% με περιεκτική παρακολούθηση και αναφορά σε όλες τις εφαρμοστέες συμφωνίες.',
        },
      },
      benefits: {
        title: 'Γιατί οι Ενημερώσεις ΣΣΕ Μεταμορφώνουν τη Συμμόρφωση Εργασίας',
        continuousCompliance: {
          title: 'Συνεχής Συμμόρφωση',
          description:
            'Διασφαλίστε 100% τήρηση των τελευταίων ελληνικών εργασιακών συμφωνιών με αυτοματοποιημένη παρακολούθηση και άμεση εφαρμογή ενημερώσεων.',
        },
        riskPrevention: {
          title: 'Πρόληψη Κινδύνων',
          description:
            'Αποτρέψτε κοστοβόρες παραβάσεις του εργατικού δικαίου και πρόστιμα μέσω προληπτικής διαχείρισης συμμόρφωσης ΣΣΕ και συστημάτων έγκαιρης προειδοποίησης.',
        },
        operationalEfficiency: {
          title: 'Λειτουργική Αποδοτικότητα',
          description:
            'Μειώστε τη χειροκίνητη προσπάθεια κατά 85% με αυτοματοποιημένη παρακολούθηση συμφωνιών, εντοπισμό ενημερώσεων και έξυπνες ροές εργασίας εφαρμογής.',
        },
      },
      sectors: {
        title: 'Παρακολουθούμενοι Κλάδοι & Συμφωνίες',
        general: 'Εθνική Γενική ΣΣΕ',
        tourism: 'Τουρισμός & Φιλοξενία',
        retail: 'Λιανικό Εμπόριο',
        banking: 'Τραπεζικός & Χρηματοοικονομικός',
        manufacturing: 'Βιομηχανία',
        healthcare: 'Υπηρεσίες Υγείας',
        education: 'Εκπαιδευτικός Τομέας',
        construction: 'Οικοδομική Βιομηχανία',
        transport: 'Μεταφορές',
        technology: 'Τεχνολογία & Πληροφορική',
        agriculture: 'Γεωργία',
        energy: 'Ενέργεια & Κοινωφελή',
        telecommunications: 'Τηλεπικοινωνίες',
        media: 'Μέσα & Ψυχαγωγία',
        professional: 'Επαγγελματικές Υπηρεσίες',
      },
      updateTypes: {
        title: 'Τύποι Ενημερώσεων ΣΣΕ που Παρακολουθούνται',
        wageIncreases: 'Αυξήσεις Κατώτατου Μισθού',
        benefitChanges: 'Αλλαγές Παροχών & Επιδομάτων',
        workingConditions: 'Ενημερώσεις Συνθηκών Εργασίας',
        overtimePremiums: 'Αλλαγές Πριμ Υπερωριών',
        holidayProvisions: 'Διατάξεις Αργιών & Αδειών',
        terminationRules: 'Κανόνες Καταγγελίας & Αποζημίωσης',
        safetyRequirements: 'Απαιτήσεις Ασφάλειας & Υγείας',
        trainingProvisions: 'Διατάξεις Εκπαίδευσης & Ανάπτυξης',
      },
      performance: {
        title: 'Απόδοση Διαχείρισης ΣΣΕ',
        agreementsTracked: 'Παρακολουθούμενες Συμφωνίες',
        updateSpeed: 'Ταχύτητα Εντοπισμού Ενημερώσεων',
        complianceRate: 'Ποσοστό Συμμόρφωσης',
        autoApplySuccess: 'Ποσοστό Επιτυχίας Αυτόματης Εφαρμογής',
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

  const sectors = [
    { key: 'general', icon: Scale, color: 'text-blue-600', employees: '850K' },
    {
      key: 'tourism',
      icon: Hotel,
      color: 'text-orange-600',
      employees: '125K',
    },
    {
      key: 'retail',
      icon: ShoppingCart,
      color: 'text-purple-600',
      employees: '180K',
    },
    {
      key: 'banking',
      icon: Building,
      color: 'text-green-600',
      employees: '45K',
    },
    {
      key: 'manufacturing',
      icon: Factory,
      color: 'text-gray-600',
      employees: '95K',
    },
    {
      key: 'healthcare',
      icon: Activity,
      color: 'text-red-600',
      employees: '78K',
    },
    {
      key: 'education',
      icon: BookOpen,
      color: 'text-indigo-600',
      employees: '120K',
    },
    {
      key: 'construction',
      icon: Award,
      color: 'text-yellow-600',
      employees: '65K',
    },
    {
      key: 'transport',
      icon: TrendingUp,
      color: 'text-pink-600',
      employees: '42K',
    },
    { key: 'technology', icon: Zap, color: 'text-cyan-600', employees: '38K' },
    {
      key: 'agriculture',
      icon: Target,
      color: 'text-emerald-600',
      employees: '55K',
    },
    { key: 'energy', icon: Star, color: 'text-violet-600', employees: '28K' },
    {
      key: 'telecommunications',
      icon: Flag,
      color: 'text-rose-600',
      employees: '25K',
    },
    { key: 'media', icon: Calendar, color: 'text-amber-600', employees: '22K' },
    {
      key: 'professional',
      icon: FileText,
      color: 'text-slate-600',
      employees: '85K',
    },
  ];

  const updateTypes = [
    { key: 'wageIncreases', icon: Euro, color: 'text-green-600' },
    { key: 'benefitChanges', icon: Award, color: 'text-blue-600' },
    { key: 'workingConditions', icon: Clock, color: 'text-orange-600' },
    { key: 'overtimePremiums', icon: TrendingUp, color: 'text-purple-600' },
    { key: 'holidayProvisions', icon: Calendar, color: 'text-red-600' },
    { key: 'terminationRules', icon: Scale, color: 'text-indigo-600' },
    { key: 'safetyRequirements', icon: Shield, color: 'text-yellow-600' },
    { key: 'trainingProvisions', icon: BookOpen, color: 'text-pink-600' },
  ];

  const performanceMetrics = [
    {
      key: 'agreementsTracked',
      value: '47',
      icon: FileText,
      color: 'text-blue-600',
    },
    { key: 'updateSpeed', value: '<2 min', icon: Zap, color: 'text-green-600' },
    {
      key: 'complianceRate',
      value: '96.8%',
      icon: CheckCircle,
      color: 'text-emerald-600',
    },
    {
      key: 'autoApplySuccess',
      value: '94.2%',
      icon: RefreshCw,
      color: 'text-purple-600',
    },
  ];

  const industries = [
    { key: 'hospitality', icon: Hotel, color: 'text-orange-600' },
    { key: 'retail', icon: ShoppingCart, color: 'text-purple-600' },
    { key: 'manufacturing', icon: Factory, color: 'text-gray-600' },
    { key: 'services', icon: Users, color: 'text-green-600' },
    { key: 'healthcare', icon: Activity, color: 'text-red-600' },
    { key: 'technology', icon: Zap, color: 'text-blue-600' },
  ];

  if (showFullSystem) {
    return <CBAUpdates locale={selectedLocale} />;
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
                <RefreshCw className="h-4 w-4 mr-2" />
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
            <RefreshCw className="h-4 w-4" />
            Automated Greek CBA Monitoring
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
              <RefreshCw className="h-5 w-5 mr-2" />
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
                {t.features.automaticMonitoring.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.features.automaticMonitoring.description}
              </p>
            </div>

            <div className="text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Zap className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.features.instantUpdates.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.features.instantUpdates.description}
              </p>
            </div>

            <div className="text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <RefreshCw className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.features.smartApplication.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.features.smartApplication.description}
              </p>
            </div>

            <div className="text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.features.complianceTracking.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.features.complianceTracking.description}
              </p>
            </div>
          </div>
        </div>

        {/* Monitored Sectors */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            {t.sectors.title}
          </h2>
          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6">
            {sectors.map((sector, index) => {
              const Icon = sector.icon;
              return (
                <div
                  key={index}
                  className="p-6 bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <Icon className={`h-6 w-6 ${sector.color}`} />
                    </div>
                    <h3 className="font-semibold text-sm mb-1">
                      {t.sectors[sector.key as keyof typeof t.sectors]}
                    </h3>
                    <p className="text-xs text-gray-600">
                      {sector.employees} employees
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Update Types */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            {t.updateTypes.title}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {updateTypes.map((type, index) => {
              const Icon = type.icon;
              return (
                <div
                  key={index}
                  className="text-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Icon className={`h-6 w-6 ${type.color}`} />
                  </div>
                  <h3 className="font-semibold mb-2 text-sm">
                    {t.updateTypes[type.key as keyof typeof t.updateTypes]}
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
                {t.benefits.continuousCompliance.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.benefits.continuousCompliance.description}
              </p>
            </div>

            <div className="p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-6">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">
                {t.benefits.riskPrevention.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.benefits.riskPrevention.description}
              </p>
            </div>

            <div className="p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                <TrendingUp className="h-6 w-6 text-blue-600" />
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
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-center rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-4">
            Never Miss Another CBA Update
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Transform your labor compliance with automated CBA monitoring that
            ensures continuous adherence to all Greek collective bargaining
            agreements.
          </p>

          <Button
            size="lg"
            className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3"
            onClick={() => setShowFullSystem(true)}
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Launch CBA Update System
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
