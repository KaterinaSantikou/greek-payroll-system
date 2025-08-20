/**
 * Cost Benchmarking Demo Page
 * Showcase of cost comparison and industry benchmarking system
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import CostBenchmarking from '@/components/CostBenchmarking';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Euro,
  Users,
  Building,
  Target,
  Award,
  AlertCircle,
  CheckCircle,
  Eye,
  Download,
  Calculator,
  PieChart,
  LineChart,
  Percent,
  Globe,
  ArrowRight,
  Zap,
  Shield,
  Activity,
  Star,
  Flag,
  MapPin,
  Clock,
  Briefcase,
  Scale,
  GraduationCap,
  Factory,
  Hotel,
  ShoppingCart,
  Stethoscope,
  Construction,
  Cpu
} from 'lucide-react';

interface DemoProps {
  locale?: 'en' | 'el';
}

export default function CostBenchmarkingDemo({ locale = 'en' }: DemoProps) {
  const [selectedLocale, setSelectedLocale] = useState<'en' | 'el'>(locale);
  const [showFullSystem, setShowFullSystem] = useState(false);

  const translations = {
    en: {
      title: 'Cost Benchmarking',
      subtitle: 'Compare Costs Against Industry Averages',
      hero: {
        title: 'Optimize HR Costs with Intelligent Benchmarking',
        subtitle: 'Comprehensive cost analysis platform that compares your HR and payroll expenses against Greek industry averages, providing actionable insights to optimize costs while maintaining competitive positioning and operational excellence.',
        cta: 'Launch Benchmarking System',
        ctaSecondary: 'Explore Analytics'
      },
      features: {
        title: 'Advanced Cost Analysis Features',
        industryComparison: {
          title: 'Industry Comparison',
          description: 'Compare your costs against comprehensive industry benchmarks across all HR and payroll categories with real-time Greek market data.'
        },
        sectorAnalysis: {
          title: 'Sector Analysis',
          description: 'Detailed sector-specific benchmarking for Tourism, Retail, Manufacturing, Healthcare, and Technology industries in Greece.'
        },
        regionalBenchmarks: {
          title: 'Regional Benchmarks',
          description: 'Regional cost analysis covering Attica, Central Macedonia, Western Greece, and Crete with localized market conditions.'
        },
        optimizationRecommendations: {
          title: 'Optimization Recommendations',
          description: 'AI-powered cost optimization suggestions with ROI calculations and implementation roadmaps for maximum efficiency.'
        }
      },
      benefits: {
        title: 'Why Cost Benchmarking Drives Business Success',
        costOptimization: {
          title: 'Cost Optimization',
          description: 'Reduce HR and payroll costs by 15-25% through intelligent benchmarking and optimization recommendations based on industry best practices.'
        },
        competitivePositioning: {
          title: 'Competitive Positioning',
          description: 'Maintain competitive salary and benefits positioning while optimizing operational costs through data-driven market analysis.'
        },
        budgetAccuracy: {
          title: 'Budget Accuracy',
          description: 'Improve budget planning accuracy by 40% with precise industry benchmarks and predictive cost modeling.'
        }
      },
      categories: {
        title: 'Cost Analysis Categories',
        payroll: 'Payroll Processing Costs',
        compliance: 'Legal Compliance Expenses',
        recruitment: 'Recruitment & Hiring Costs',
        training: 'Training & Development',
        benefits: 'Employee Benefits & Perks',
        hrAdmin: 'HR Administration Costs',
        technology: 'HR Technology Investment',
        consulting: 'External Consulting Fees'
      },
      insights: {
        title: 'Key Benchmarking Insights',
        efficiency: 'Cost Efficiency Score',
        ranking: 'Industry Ranking',
        optimization: 'Optimization Potential',
        compliance: 'Compliance Cost Index',
        retention: 'Cost per Retention',
        productivity: 'Productivity ROI'
      },
      performance: {
        title: 'Benchmarking Performance Metrics',
        companiesAnalyzed: 'Companies Analyzed',
        costCategories: 'Cost Categories',
        industryAccuracy: 'Industry Accuracy',
        optimizationSavings: 'Avg Optimization Savings'
      },
      sectors: {
        title: 'Industry Sector Coverage',
        tourism: 'Tourism & Hospitality',
        retail: 'Retail & Commerce',
        manufacturing: 'Manufacturing & Production',
        technology: 'Technology & IT Services',
        healthcare: 'Healthcare & Medical',
        construction: 'Construction & Engineering'
      }
    },
    el: {
      title: 'Συγκριτική Ανάλυση Κόστους',
      subtitle: 'Σύγκριση Κόστους με Μέσους Όρους Κλάδου',
      hero: {
        title: 'Βελτιστοποίηση Κόστους ΑΠ με Έξυπνη Συγκριτική Ανάλυση',
        subtitle: 'Περιεκτική πλατφόρμα ανάλυσης κόστους που συγκρίνει τα έξοδα ΑΠ και μισθοδοσίας σας με τους μέσους όρους των ελληνικών κλάδων, παρέχοντας ενεργές πληροφορίες για βελτιστοποίηση κόστους διατηρώντας την ανταγωνιστική θέση και την επιχειρησιακή αριστεία.',
        cta: 'Εκκίνηση Συστήματος Συγκριτικής Ανάλυσης',
        ctaSecondary: 'Εξερεύνηση Αναλυτικών'
      },
      features: {
        title: 'Προηγμένα Χαρακτηριστικά Ανάλυσης Κόστους',
        industryComparison: {
          title: 'Σύγκριση με Κλάδο',
          description: 'Συγκρίνετε το κόστος σας με περιεκτικά benchmarks κλάδου σε όλες τις κατηγορίες ΑΠ και μισθοδοσίας με δεδομένα ελληνικής αγοράς πραγματικού χρόνου.'
        },
        sectorAnalysis: {
          title: 'Ανάλυση Τομέων',
          description: 'Λεπτομερής συγκριτική ανάλυση ανά τομέα για Τουρισμό, Λιανικό Εμπόριο, Βιομηχανία, Υγειονομική Περίθαλψη και Τεχνολογία στην Ελλάδα.'
        },
        regionalBenchmarks: {
          title: 'Περιφερειακά Benchmarks',
          description: 'Περιφερειακή ανάλυση κόστους που καλύπτει Αττική, Κεντρική Μακεδονία, Δυτική Ελλάδα και Κρήτη με τοπικές συνθήκες αγοράς.'
        },
        optimizationRecommendations: {
          title: 'Συστάσεις Βελτιστοποίησης',
          description: 'Προτάσεις βελτιστοποίησης κόστους με τεχνητή νοημοσύνη με υπολογισμούς ROI και χάρτες υλοποίησης για μέγιστη αποδοτικότητα.'
        }
      },
      benefits: {
        title: 'Γιατί η Συγκριτική Ανάλυση Κόστους Οδηγεί στην Επιχειρησιακή Επιτυχία',
        costOptimization: {
          title: 'Βελτιστοποίηση Κόστους',
          description: 'Μειώστε το κόστος ΑΠ και μισθοδοσίας κατά 15-25% μέσω έξυπνης συγκριτικής ανάλυσης και προτάσεων βελτιστοποίησης βασισμένων σε βέλτιστες πρακτικές κλάδου.'
        },
        competitivePositioning: {
          title: 'Ανταγωνιστική Θέση',
          description: 'Διατηρήστε ανταγωνιστική θέση μισθών και παροχών ενώ βελτιστοποιείτε το λειτουργικό κόστος μέσω ανάλυσης αγοράς βασισμένης σε δεδομένα.'
        },
        budgetAccuracy: {
          title: 'Ακρίβεια Προϋπολογισμού',
          description: 'Βελτιώστε την ακρίβεια σχεδιασμού προϋπολογισμού κατά 40% με ακριβή benchmarks κλάδου και προβλεπτική μοντελοποίηση κόστους.'
        }
      },
      categories: {
        title: 'Κατηγορίες Ανάλυσης Κόστους',
        payroll: 'Κόστος Επεξεργασίας Μισθοδοσίας',
        compliance: 'Έξοδα Νομικής Συμμόρφωσης',
        recruitment: 'Κόστος Προσλήψεων & Στρατολόγησης',
        training: 'Εκπαίδευση & Ανάπτυξη',
        benefits: 'Παροχές & Προνόμια Εργαζομένων',
        hrAdmin: 'Κόστος Διοίκησης ΑΠ',
        technology: 'Επένδυση Τεχνολογίας ΑΠ',
        consulting: 'Αμοιβές Εξωτερικών Συμβούλων'
      },
      insights: {
        title: 'Βασικές Πληροφορίες Συγκριτικής Ανάλυσης',
        efficiency: 'Βαθμός Αποδοτικότητας Κόστους',
        ranking: 'Κατάταξη στον Κλάδο',
        optimization: 'Δυναμικό Βελτιστοποίησης',
        compliance: 'Δείκτης Κόστους Συμμόρφωσης',
        retention: 'Κόστος ανά Διατήρηση',
        productivity: 'ROI Παραγωγικότητας'
      },
      performance: {
        title: 'Μετρικές Απόδοσης Συγκριτικής Ανάλυσης',
        companiesAnalyzed: 'Επιχειρήσεις που Αναλύθηκαν',
        costCategories: 'Κατηγορίες Κόστους',
        industryAccuracy: 'Ακρίβεια Κλάδου',
        optimizationSavings: 'Μέση Εξοικονόμηση Βελτιστοποίησης'
      },
      sectors: {
        title: 'Κάλυψη Κλάδων Βιομηχανίας',
        tourism: 'Τουρισμός & Φιλοξενία',
        retail: 'Λιανικό Εμπόριο',
        manufacturing: 'Βιομηχανία & Παραγωγή',
        technology: 'Τεχνολογία & Υπηρεσίες IT',
        healthcare: 'Υγειονομική Περίθαλψη & Ιατρική',
        construction: 'Κατασκευές & Μηχανική'
      }
    }
  };

  const t = translations[selectedLocale];

  const categories = [
    { key: 'payroll', icon: Euro, color: 'text-green-600' },
    { key: 'compliance', icon: Scale, color: 'text-blue-600' },
    { key: 'recruitment', icon: Users, color: 'text-purple-600' },
    { key: 'training', icon: GraduationCap, color: 'text-orange-600' },
    { key: 'benefits', icon: Shield, color: 'text-red-600' },
    { key: 'hrAdmin', icon: Briefcase, color: 'text-indigo-600' },
    { key: 'technology', icon: Cpu, color: 'text-yellow-600' },
    { key: 'consulting', icon: Activity, color: 'text-pink-600' }
  ];

  const insights = [
    { key: 'efficiency', icon: Target, color: 'text-green-600' },
    { key: 'ranking', icon: Award, color: 'text-blue-600' },
    { key: 'optimization', icon: TrendingUp, color: 'text-purple-600' },
    { key: 'compliance', icon: Scale, color: 'text-orange-600' },
    { key: 'retention', icon: Users, color: 'text-red-600' },
    { key: 'productivity', icon: BarChart3, color: 'text-indigo-600' }
  ];

  const performanceMetrics = [
    { key: 'companiesAnalyzed', value: '2,847', icon: Building, color: 'text-blue-600' },
    { key: 'costCategories', value: '24', icon: Calculator, color: 'text-green-600' },
    { key: 'industryAccuracy', value: '94.2%', icon: Target, color: 'text-purple-600' },
    { key: 'optimizationSavings', value: '18.5%', icon: TrendingDown, color: 'text-orange-600' }
  ];

  const sectors = [
    { key: 'tourism', icon: Hotel, color: 'text-orange-600' },
    { key: 'retail', icon: ShoppingCart, color: 'text-purple-600' },
    { key: 'manufacturing', icon: Factory, color: 'text-gray-600' },
    { key: 'technology', icon: Cpu, color: 'text-blue-600' },
    { key: 'healthcare', icon: Stethoscope, color: 'text-red-600' },
    { key: 'construction', icon: Construction, color: 'text-yellow-600' }
  ];

  if (showFullSystem) {
    return <CostBenchmarking locale={selectedLocale} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
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
                onClick={() => setSelectedLocale(selectedLocale === 'en' ? 'el' : 'en')}
              >
                <Globe className="h-4 w-4 mr-2" />
                {selectedLocale === 'en' ? 'EL' : 'EN'}
              </Button>
              <Button
                onClick={() => setShowFullSystem(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                {t.hero.cta}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <BarChart3 className="h-4 w-4" />
            HR Cost Benchmarking Platform
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
              className="px-8 py-3 text-lg bg-green-600 hover:bg-green-700"
              onClick={() => setShowFullSystem(true)}
            >
              <BarChart3 className="h-5 w-5 mr-2" />
              {t.hero.cta}
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="px-8 py-3 text-lg"
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <Eye className="h-5 w-5 mr-2" />
              {t.hero.ctaSecondary}
            </Button>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-2xl p-8 mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">{t.performance.title}</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {performanceMetrics.map((metric, index) => {
              const Icon = metric.icon;
              return (
                <div key={index} className="text-center">
                  <div className={`text-4xl font-bold mb-2 ${metric.color.replace('text-', 'text-')}`}>
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
                <Building className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">{t.features.industryComparison.title}</h3>
              <p className="text-gray-600 leading-relaxed">{t.features.industryComparison.description}</p>
            </div>

            <div className="text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <PieChart className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">{t.features.sectorAnalysis.title}</h3>
              <p className="text-gray-600 leading-relaxed">{t.features.sectorAnalysis.description}</p>
            </div>

            <div className="text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <MapPin className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">{t.features.regionalBenchmarks.title}</h3>
              <p className="text-gray-600 leading-relaxed">{t.features.regionalBenchmarks.description}</p>
            </div>

            <div className="text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Target className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">{t.features.optimizationRecommendations.title}</h3>
              <p className="text-gray-600 leading-relaxed">{t.features.optimizationRecommendations.description}</p>
            </div>
          </div>
        </div>

        {/* Cost Categories */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            {t.categories.title}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {categories.map((category, index) => {
              const Icon = category.icon;
              return (
                <div key={index} className="text-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
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

        {/* Key Insights */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            {t.insights.title}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {insights.map((insight, index) => {
              const Icon = insight.icon;
              return (
                <div key={index} className="text-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Icon className={`h-6 w-6 ${insight.color}`} />
                  </div>
                  <h3 className="font-semibold mb-2">
                    {t.insights[insight.key as keyof typeof t.insights]}
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
                <TrendingDown className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">{t.benefits.costOptimization.title}</h3>
              <p className="text-gray-600 leading-relaxed">{t.benefits.costOptimization.description}</p>
            </div>

            <div className="p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">{t.benefits.competitivePositioning.title}</h3>
              <p className="text-gray-600 leading-relaxed">{t.benefits.competitivePositioning.description}</p>
            </div>

            <div className="p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-6">
                <Calculator className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">{t.benefits.budgetAccuracy.title}</h3>
              <p className="text-gray-600 leading-relaxed">{t.benefits.budgetAccuracy.description}</p>
            </div>
          </div>
        </div>

        {/* Industry Sectors */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            {t.sectors.title}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sectors.map((sector, index) => {
              const Icon = sector.icon;
              return (
                <div key={index} className="text-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
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
        <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white text-center rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-4">Start Optimizing Your HR Costs Today</h2>
          <p className="text-xl text-green-100 mb-8 max-w-2xl mx-auto">
            Transform your HR cost management with intelligent benchmarking that provides actionable insights for optimization while maintaining competitive positioning in the Greek market.
          </p>
          
          <Button 
            size="lg" 
            className="bg-white text-green-600 hover:bg-gray-100 px-8 py-3"
            onClick={() => setShowFullSystem(true)}
          >
            <BarChart3 className="h-5 w-5 mr-2" />
            Launch Cost Benchmarking System
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}