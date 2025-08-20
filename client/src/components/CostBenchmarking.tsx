/**
 * Cost Benchmarking - Compare costs against industry averages
 * Comprehensive benchmarking system for Greek HR and payroll cost analysis
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
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
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Minus,
  Eye,
  Download,
  Filter,
  RefreshCw,
  Calculator,
  PieChart,
  LineChart,
  DollarSign,
  Percent,
  Clock,
  Calendar,
  MapPin,
  Globe,
  Factory,
  Hotel,
  ShoppingCart,
  Stethoscope,
  GraduationCap,
  Construction,
  Truck,
  Cpu,
  Briefcase,
  CreditCard,
  Receipt,
  Scale,
  Shield,
  Zap,
  Activity,
  Star,
  Flag,
  Info,
  Settings,
  Search,
  BookOpen
} from 'lucide-react';

interface CostCategory {
  id: string;
  name: string;
  nameEl: string;
  description: string;
  descriptionEl: string;
  icon: string;
  yourCost: number;
  industryAverage: number;
  topQuartile: number;
  bottomQuartile: number;
  variance: number;
  variancePercent: number;
  trend: 'up' | 'down' | 'stable';
  recommendation: string;
  recommendationEl: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface SectorBenchmark {
  sector: string;
  sectorEl: string;
  employeeCount: number;
  totalPayrollCost: number;
  avgSalary: number;
  hrCostPerEmployee: number;
  complianceCost: number;
  trainingCost: number;
  benefitsCost: number;
  recruitmentCost: number;
  totalHrCost: number;
}

interface RegionalData {
  region: string;
  regionEl: string;
  avgSalary: number;
  livingCostIndex: number;
  unemploymentRate: number;
  hrCostIndex: number;
  complianceComplexity: number;
}

interface BenchmarkMetrics {
  totalEmployees: number;
  totalPayrollCost: number;
  hrCostPerEmployee: number;
  payrollCostPerEmployee: number;
  complianceCostPerEmployee: number;
  benefitsCostPerEmployee: number;
  overallRanking: number;
  costEfficiencyScore: number;
}

interface CostBenchmarkingProps {
  locale?: 'en' | 'el';
}

const COST_CATEGORIES: CostCategory[] = [
  {
    id: 'payroll',
    name: 'Payroll Processing',
    nameEl: 'Επεξεργασία Μισθοδοσίας',
    description: 'Monthly payroll processing and administration costs',
    descriptionEl: 'Κόστος μηνιαίας επεξεργασίας και διαχείρισης μισθοδοσίας',
    icon: 'euro',
    yourCost: 4200,
    industryAverage: 3800,
    topQuartile: 2900,
    bottomQuartile: 4800,
    variance: 400,
    variancePercent: 10.5,
    trend: 'up',
    recommendation: 'Consider automating payroll processes to reduce processing costs by 25%',
    recommendationEl: 'Εξετάστε την αυτοματοποίηση των διαδικασιών μισθοδοσίας για μείωση κόστους κατά 25%',
    priority: 'medium'
  },
  {
    id: 'compliance',
    name: 'Legal Compliance',
    nameEl: 'Νομική Συμμόρφωση',
    description: 'Legal compliance and regulatory reporting costs',
    descriptionEl: 'Κόστος νομικής συμμόρφωσης και κανονιστικών αναφορών',
    icon: 'scale',
    yourCost: 2800,
    industryAverage: 3200,
    topQuartile: 2400,
    bottomQuartile: 4000,
    variance: -400,
    variancePercent: -12.5,
    trend: 'down',
    recommendation: 'Excellent compliance cost management, maintain current practices',
    recommendationEl: 'Εξαιρετική διαχείριση κόστους συμμόρφωσης, διατηρήστε τις τρέχουσες πρακτικές',
    priority: 'low'
  },
  {
    id: 'recruitment',
    name: 'Recruitment & Hiring',
    nameEl: 'Προσλήψεις & Στρατολόγηση',
    description: 'Recruitment, hiring, and onboarding costs',
    descriptionEl: 'Κόστος προσλήψεων, στρατολόγησης και ενσωμάτωσης',
    icon: 'users',
    yourCost: 5600,
    industryAverage: 4200,
    topQuartile: 3100,
    bottomQuartile: 5800,
    variance: 1400,
    variancePercent: 33.3,
    trend: 'up',
    recommendation: 'High recruitment costs - implement employee referral programs to reduce external hiring costs',
    recommendationEl: 'Υψηλό κόστος προσλήψεων - εφαρμόστε προγράμματα παραπομπής εργαζομένων για μείωση εξωτερικού κόστους',
    priority: 'critical'
  },
  {
    id: 'training',
    name: 'Training & Development',
    nameEl: 'Εκπαίδευση & Ανάπτυξη',
    description: 'Employee training and development programs',
    descriptionEl: 'Προγράμματα εκπαίδευσης και ανάπτυξης εργαζομένων',
    icon: 'graduation-cap',
    yourCost: 1800,
    industryAverage: 2400,
    topQuartile: 3200,
    bottomQuartile: 1600,
    variance: -600,
    variancePercent: -25.0,
    trend: 'down',
    recommendation: 'Training investment below industry average - consider increasing to improve retention',
    recommendationEl: 'Επένδυση εκπαίδευσης κάτω από τον μέσο όρο του κλάδου - εξετάστε αύξηση για βελτίωση διατήρησης',
    priority: 'high'
  },
  {
    id: 'benefits',
    name: 'Employee Benefits',
    nameEl: 'Παροχές Εργαζομένων',
    description: 'Health insurance, retirement, and other benefits',
    descriptionEl: 'Ασφάλιση υγείας, συνταξιοδότηση και άλλες παροχές',
    icon: 'shield',
    yourCost: 3400,
    industryAverage: 3100,
    topQuartile: 2600,
    bottomQuartile: 3800,
    variance: 300,
    variancePercent: 9.7,
    trend: 'stable',
    recommendation: 'Benefits costs slightly above average - review package efficiency',
    recommendationEl: 'Κόστος παροχών ελαφρώς πάνω από τον μέσο όρο - επανεξετάστε την αποτελεσματικότητα του πακέτου',
    priority: 'medium'
  },
  {
    id: 'hr-admin',
    name: 'HR Administration',
    nameEl: 'Διοίκηση Ανθρωπίνων Πόρων',
    description: 'HR administration and management costs',
    descriptionEl: 'Κόστος διοίκησης και διαχείρισης ανθρωπίνων πόρων',
    icon: 'briefcase',
    yourCost: 2200,
    industryAverage: 2600,
    topQuartile: 2000,
    bottomQuartile: 3200,
    variance: -400,
    variancePercent: -15.4,
    trend: 'down',
    recommendation: 'Efficient HR administration costs, excellent management',
    recommendationEl: 'Αποτελεσματικό κόστος διοίκησης ΑΠ, εξαιρετική διαχείριση',
    priority: 'low'
  }
];

const SECTOR_BENCHMARKS: SectorBenchmark[] = [
  {
    sector: 'Tourism',
    sectorEl: 'Τουρισμός',
    employeeCount: 125,
    totalPayrollCost: 312000,
    avgSalary: 24960,
    hrCostPerEmployee: 890,
    complianceCost: 15600,
    trainingCost: 8900,
    benefitsCost: 28080,
    recruitmentCost: 12500,
    totalHrCost: 111250
  },
  {
    sector: 'Retail',
    sectorEl: 'Λιανικό Εμπόριο',
    employeeCount: 89,
    totalPayrollCost: 267300,
    avgSalary: 30000,
    hrCostPerEmployee: 950,
    complianceCost: 13340,
    trainingCost: 7120,
    benefitsCost: 24030,
    recruitmentCost: 10680,
    totalHrCost: 84550
  },
  {
    sector: 'Manufacturing',
    sectorEl: 'Βιομηχανία',
    employeeCount: 234,
    totalPayrollCost: 936000,
    avgSalary: 40000,
    hrCostPerEmployee: 1200,
    complianceCost: 35100,
    trainingCost: 18720,
    benefitsCost: 74880,
    recruitmentCost: 23400,
    totalHrCost: 280800
  },
  {
    sector: 'Technology',
    sectorEl: 'Τεχνολογία',
    employeeCount: 67,
    totalPayrollCost: 402000,
    avgSalary: 60000,
    hrCostPerEmployee: 1450,
    complianceCost: 10050,
    trainingCost: 13400,
    benefitsCost: 32160,
    recruitmentCost: 16750,
    totalHrCost: 97150
  },
  {
    sector: 'Healthcare',
    sectorEl: 'Υγειονομική Περίθαλψη',
    employeeCount: 156,
    totalPayrollCost: 702000,
    avgSalary: 45000,
    hrCostPerEmployee: 1100,
    complianceCost: 23400,
    trainingCost: 15600,
    benefitsCost: 56160,
    recruitmentCost: 18720,
    totalHrCost: 171600
  }
];

const REGIONAL_DATA: RegionalData[] = [
  {
    region: 'Attica',
    regionEl: 'Αττική',
    avgSalary: 32000,
    livingCostIndex: 112,
    unemploymentRate: 8.2,
    hrCostIndex: 108,
    complianceComplexity: 95
  },
  {
    region: 'Central Macedonia',
    regionEl: 'Κεντρική Μακεδονία',
    avgSalary: 26500,
    livingCostIndex: 88,
    unemploymentRate: 12.1,
    hrCostIndex: 92,
    complianceComplexity: 87
  },
  {
    region: 'Western Greece',
    regionEl: 'Δυτική Ελλάδα',
    avgSalary: 24800,
    livingCostIndex: 85,
    unemploymentRate: 15.3,
    hrCostIndex: 89,
    complianceComplexity: 82
  },
  {
    region: 'Crete',
    regionEl: 'Κρήτη',
    avgSalary: 25200,
    livingCostIndex: 90,
    unemploymentRate: 11.7,
    hrCostIndex: 94,
    complianceComplexity: 85
  }
];

const BENCHMARK_METRICS: BenchmarkMetrics = {
  totalEmployees: 145,
  totalPayrollCost: 580000,
  hrCostPerEmployee: 1380,
  payrollCostPerEmployee: 4000,
  complianceCostPerEmployee: 193,
  benefitsCostPerEmployee: 2345,
  overallRanking: 23,
  costEfficiencyScore: 78.5
};

export default function CostBenchmarking({ locale = 'en' }: CostBenchmarkingProps) {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [comparisonMode, setComparisonMode] = useState<'industry' | 'sector' | 'regional'>('industry');

  const translations = {
    en: {
      title: 'Cost Benchmarking',
      subtitle: 'Compare Costs Against Industry Averages',
      tabs: {
        overview: 'Overview',
        categories: 'Cost Categories',
        sectors: 'Sector Analysis',
        regional: 'Regional Analysis',
        recommendations: 'Recommendations',
        reports: 'Reports'
      },
      metrics: {
        totalEmployees: 'Total Employees',
        totalPayrollCost: 'Total Payroll Cost',
        hrCostPerEmployee: 'HR Cost Per Employee',
        payrollCostPerEmployee: 'Payroll Cost Per Employee',
        complianceCostPerEmployee: 'Compliance Cost Per Employee',
        benefitsCostPerEmployee: 'Benefits Cost Per Employee',
        overallRanking: 'Overall Ranking',
        costEfficiencyScore: 'Cost Efficiency Score'
      },
      comparison: {
        yourCost: 'Your Cost',
        industryAverage: 'Industry Average',
        topQuartile: 'Top Quartile',
        bottomQuartile: 'Bottom Quartile',
        variance: 'Variance',
        above: 'Above Average',
        below: 'Below Average',
        onTarget: 'On Target'
      },
      categories: {
        payroll: 'Payroll Processing',
        compliance: 'Legal Compliance',
        recruitment: 'Recruitment',
        training: 'Training',
        benefits: 'Benefits',
        hrAdmin: 'HR Administration'
      },
      priority: {
        low: 'Low Priority',
        medium: 'Medium Priority',
        high: 'High Priority',
        critical: 'Critical Priority'
      },
      trend: {
        up: 'Increasing',
        down: 'Decreasing',
        stable: 'Stable'
      },
      actions: {
        viewDetails: 'View Details',
        downloadReport: 'Download Report',
        exportData: 'Export Data',
        refresh: 'Refresh Data',
        compare: 'Compare',
        analyze: 'Analyze',
        optimize: 'Optimize Costs'
      },
      filters: {
        sector: 'Filter by Sector',
        region: 'Filter by Region',
        category: 'Filter by Category',
        all: 'All'
      }
    },
    el: {
      title: 'Συγκριτική Ανάλυση Κόστους',
      subtitle: 'Σύγκριση Κόστους με Μέσους Όρους Κλάδου',
      tabs: {
        overview: 'Επισκόπηση',
        categories: 'Κατηγορίες Κόστους',
        sectors: 'Ανάλυση Κλάδων',
        regional: 'Περιφερειακή Ανάλυση',
        recommendations: 'Συστάσεις',
        reports: 'Αναφορές'
      },
      metrics: {
        totalEmployees: 'Σύνολο Εργαζομένων',
        totalPayrollCost: 'Συνολικό Κόστος Μισθοδοσίας',
        hrCostPerEmployee: 'Κόστος ΑΠ Ανά Εργαζόμενο',
        payrollCostPerEmployee: 'Κόστος Μισθοδοσίας Ανά Εργαζόμενο',
        complianceCostPerEmployee: 'Κόστος Συμμόρφωσης Ανά Εργαζόμενο',
        benefitsCostPerEmployee: 'Κόστος Παροχών Ανά Εργαζόμενο',
        overallRanking: 'Συνολική Κατάταξη',
        costEfficiencyScore: 'Βαθμός Αποδοτικότητας Κόστους'
      },
      comparison: {
        yourCost: 'Το Κόστος Σας',
        industryAverage: 'Μέσος Όρος Κλάδου',
        topQuartile: 'Κορυφαίο Τέταρτο',
        bottomQuartile: 'Χαμηλότερο Τέταρτο',
        variance: 'Απόκλιση',
        above: 'Πάνω από τον Μέσο Όρο',
        below: 'Κάτω από τον Μέσο Όρο',
        onTarget: 'Στον Στόχο'
      },
      categories: {
        payroll: 'Επεξεργασία Μισθοδοσίας',
        compliance: 'Νομική Συμμόρφωση',
        recruitment: 'Προσλήψεις',
        training: 'Εκπαίδευση',
        benefits: 'Παροχές',
        hrAdmin: 'Διοίκηση ΑΠ'
      },
      priority: {
        low: 'Χαμηλή Προτεραιότητα',
        medium: 'Μέτρια Προτεραιότητα',
        high: 'Υψηλή Προτεραιότητα',
        critical: 'Κρίσιμη Προτεραιότητα'
      },
      trend: {
        up: 'Αυξάνεται',
        down: 'Μειώνεται',
        stable: 'Σταθερό'
      },
      actions: {
        viewDetails: 'Προβολή Λεπτομερειών',
        downloadReport: 'Λήψη Αναφοράς',
        exportData: 'Εξαγωγή Δεδομένων',
        refresh: 'Ανανέωση Δεδομένων',
        compare: 'Σύγκριση',
        analyze: 'Ανάλυση',
        optimize: 'Βελτιστοποίηση Κόστους'
      },
      filters: {
        sector: 'Φιλτράρισμα κατά Κλάδο',
        region: 'Φιλτράρισμα κατά Περιοχή',
        category: 'Φιλτράρισμα κατά Κατηγορία',
        all: 'Όλα'
      }
    }
  };

  const t = translations[locale];

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'euro': return Euro;
      case 'scale': return Scale;
      case 'users': return Users;
      case 'graduation-cap': return GraduationCap;
      case 'shield': return Shield;
      case 'briefcase': return Briefcase;
      default: return Calculator;
    }
  };

  const getSectorIcon = (sector: string) => {
    switch (sector.toLowerCase()) {
      case 'tourism': return Hotel;
      case 'retail': return ShoppingCart;
      case 'manufacturing': return Factory;
      case 'technology': return Cpu;
      case 'healthcare': return Stethoscope;
      default: return Building;
    }
  };

  const getVarianceColor = (variance: number) => {
    if (Math.abs(variance) < 5) return 'text-green-600 bg-green-100';
    if (variance > 0) return 'text-red-600 bg-red-100';
    return 'text-blue-600 bg-blue-100';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return ArrowUp;
      case 'down': return ArrowDown;
      case 'stable': return Minus;
      default: return Minus;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-red-600';
      case 'down': return 'text-green-600';
      case 'stable': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const filteredCategories = COST_CATEGORIES.filter(category => {
    if (selectedCategory === 'all') return true;
    return category.id === selectedCategory;
  });

  const calculateCostEfficiency = (yourCost: number, industryAverage: number) => {
    return ((industryAverage - yourCost) / industryAverage * 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <BarChart3 className="h-8 w-8 text-green-600" />
                </div>
                {t.title}
              </h1>
              <p className="text-gray-600 ml-12">{t.subtitle}</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                {t.actions.refresh}
              </Button>
              <Button className="bg-green-600 hover:bg-green-700">
                <Download className="h-4 w-4 mr-2" />
                {t.actions.downloadReport}
              </Button>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4 mb-6">
            <Card className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold">{BENCHMARK_METRICS.totalEmployees}</div>
                <div className="text-xs text-blue-100">{t.metrics.totalEmployees}</div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-r from-green-500 to-green-600 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold">€{(BENCHMARK_METRICS.totalPayrollCost / 1000).toFixed(0)}K</div>
                <div className="text-xs text-green-100">{t.metrics.totalPayrollCost}</div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold">€{BENCHMARK_METRICS.hrCostPerEmployee}</div>
                <div className="text-xs text-purple-100">{t.metrics.hrCostPerEmployee}</div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold">€{BENCHMARK_METRICS.payrollCostPerEmployee}</div>
                <div className="text-xs text-orange-100">{t.metrics.payrollCostPerEmployee}</div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-r from-red-500 to-red-600 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold">€{BENCHMARK_METRICS.complianceCostPerEmployee}</div>
                <div className="text-xs text-red-100">{t.metrics.complianceCostPerEmployee}</div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold">€{BENCHMARK_METRICS.benefitsCostPerEmployee}</div>
                <div className="text-xs text-indigo-100">{t.metrics.benefitsCostPerEmployee}</div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold">#{BENCHMARK_METRICS.overallRanking}</div>
                <div className="text-xs text-teal-100">{t.metrics.overallRanking}</div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold">{BENCHMARK_METRICS.costEfficiencyScore}%</div>
                <div className="text-xs text-yellow-100">{t.metrics.costEfficiencyScore}</div>
              </div>
            </Card>
          </div>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">{t.tabs.overview}</TabsTrigger>
            <TabsTrigger value="categories">{t.tabs.categories}</TabsTrigger>
            <TabsTrigger value="sectors">{t.tabs.sectors}</TabsTrigger>
            <TabsTrigger value="regional">{t.tabs.regional}</TabsTrigger>
            <TabsTrigger value="recommendations">{t.tabs.recommendations}</TabsTrigger>
            <TabsTrigger value="reports">{t.tabs.reports}</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Cost Performance Summary */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-green-600" />
                      Cost Performance Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {COST_CATEGORIES.slice(0, 4).map((category) => {
                        const Icon = getCategoryIcon(category.icon);
                        const TrendIcon = getTrendIcon(category.trend);
                        const efficiency = calculateCostEfficiency(category.yourCost, category.industryAverage);
                        
                        return (
                          <div key={category.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-4">
                              <div className="p-2 bg-green-100 rounded-lg">
                                <Icon className="h-5 w-5 text-green-600" />
                              </div>
                              <div>
                                <div className="font-medium">
                                  {locale === 'en' ? category.name : category.nameEl}
                                </div>
                                <div className="text-sm text-gray-600">
                                  Your Cost: €{category.yourCost} • Industry: €{category.industryAverage}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <div className={`text-sm font-medium ${efficiency > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {efficiency > 0 ? '+' : ''}{efficiency.toFixed(1)}%
                                </div>
                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                  <TrendIcon className={`h-3 w-3 ${getTrendColor(category.trend)}`} />
                                  {t.trend[category.trend as keyof typeof t.trend]}
                                </div>
                              </div>
                              <Badge className={getPriorityColor(category.priority)}>
                                {t.priority[category.priority as keyof typeof t.priority]}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Efficiency Score */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-gold-600" />
                    Cost Efficiency Score
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="relative w-32 h-32 mx-auto mb-4">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-3xl font-bold text-green-600">
                        {BENCHMARK_METRICS.costEfficiencyScore}%
                      </div>
                    </div>
                    <Progress 
                      value={BENCHMARK_METRICS.costEfficiencyScore} 
                      className="h-4 transform rotate-90"
                    />
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Industry Ranking</span>
                      <span className="font-medium">#{BENCHMARK_METRICS.overallRanking} of 100</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Percentile</span>
                      <span className="font-medium">{100 - BENCHMARK_METRICS.overallRanking}th</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cost Optimization</span>
                      <span className="font-medium text-green-600">Good</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Quick Insights & Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center p-4 border rounded-lg bg-red-50">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <AlertCircle className="h-6 w-6 text-red-600" />
                    </div>
                    <h3 className="font-semibold text-red-600 mb-2">High Priority</h3>
                    <p className="text-sm text-gray-600">Recruitment costs 33% above industry average</p>
                    <Button size="sm" className="mt-3 bg-red-600 hover:bg-red-700">
                      {t.actions.optimize}
                    </Button>
                  </div>

                  <div className="text-center p-4 border rounded-lg bg-yellow-50">
                    <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <TrendingDown className="h-6 w-6 text-yellow-600" />
                    </div>
                    <h3 className="font-semibold text-yellow-600 mb-2">Opportunity</h3>
                    <p className="text-sm text-gray-600">Training investment below industry standards</p>
                    <Button size="sm" className="mt-3 bg-yellow-600 hover:bg-yellow-700">
                      {t.actions.analyze}
                    </Button>
                  </div>

                  <div className="text-center p-4 border rounded-lg bg-green-50">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-green-600 mb-2">Strength</h3>
                    <p className="text-sm text-gray-600">Compliance costs 12.5% below average</p>
                    <Button size="sm" className="mt-3 bg-green-600 hover:bg-green-700">
                      {t.actions.viewDetails}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Category Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder={t.filters.category} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t.filters.all}</SelectItem>
                      <SelectItem value="payroll">Payroll Processing</SelectItem>
                      <SelectItem value="compliance">Legal Compliance</SelectItem>
                      <SelectItem value="recruitment">Recruitment</SelectItem>
                      <SelectItem value="training">Training</SelectItem>
                      <SelectItem value="benefits">Benefits</SelectItem>
                      <SelectItem value="hr-admin">HR Administration</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={comparisonMode} onValueChange={(value: any) => setComparisonMode(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Comparison Mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="industry">Industry Average</SelectItem>
                      <SelectItem value="sector">Sector Benchmark</SelectItem>
                      <SelectItem value="regional">Regional Average</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button variant="outline" onClick={() => {
                    setSelectedCategory('all');
                    setComparisonMode('industry');
                  }}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Category Details */}
            <div className="grid gap-6">
              {filteredCategories.map((category) => {
                const Icon = getCategoryIcon(category.icon);
                const TrendIcon = getTrendIcon(category.trend);
                const efficiency = calculateCostEfficiency(category.yourCost, category.industryAverage);
                
                return (
                  <Card key={category.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-green-100 rounded-lg">
                            <Icon className="h-6 w-6 text-green-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg mb-1">
                              {locale === 'en' ? category.name : category.nameEl}
                            </h3>
                            <p className="text-gray-600 text-sm mb-2">
                              {locale === 'en' ? category.description : category.descriptionEl}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getPriorityColor(category.priority)}>
                            {t.priority[category.priority as keyof typeof t.priority]}
                          </Badge>
                          <div className="text-right">
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <TrendIcon className={`h-3 w-3 ${getTrendColor(category.trend)}`} />
                              {t.trend[category.trend as keyof typeof t.trend]}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-5 gap-4 mb-4">
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-1">{t.comparison.yourCost}</div>
                          <div className="text-lg font-bold text-blue-600">€{category.yourCost.toLocaleString()}</div>
                        </div>

                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-1">{t.comparison.industryAverage}</div>
                          <div className="text-lg font-bold text-gray-600">€{category.industryAverage.toLocaleString()}</div>
                        </div>

                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-1">{t.comparison.topQuartile}</div>
                          <div className="text-sm font-medium text-green-600">€{category.topQuartile.toLocaleString()}</div>
                        </div>

                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-1">{t.comparison.variance}</div>
                          <div className={`text-sm font-bold ${category.variance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {category.variance > 0 ? '+' : ''}€{category.variance.toLocaleString()} ({category.variancePercent > 0 ? '+' : ''}{category.variancePercent}%)
                          </div>
                        </div>

                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-1">Efficiency</div>
                          <div className={`text-sm font-bold ${efficiency > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {efficiency > 0 ? '+' : ''}{efficiency.toFixed(1)}%
                          </div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="text-sm font-medium text-gray-700 mb-2">Performance vs Industry</div>
                        <div className="relative">
                          <Progress value={50 + (category.variance / category.industryAverage * 50)} className="h-3" />
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>Top Quartile</span>
                            <span>Industry Average</span>
                            <span>Bottom Quartile</span>
                          </div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="text-sm font-medium text-gray-700 mb-2">Recommendation</div>
                        <p className="text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">
                          {locale === 'en' ? category.recommendation : category.recommendationEl}
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {category.variance > 0 ? (
                            <Badge className="bg-red-100 text-red-800">
                              {t.comparison.above}
                            </Badge>
                          ) : category.variance < 0 ? (
                            <Badge className="bg-green-100 text-green-800">
                              {t.comparison.below}
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-100 text-blue-800">
                              {t.comparison.onTarget}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-1" />
                            {t.actions.viewDetails}
                          </Button>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700">
                            <Calculator className="h-4 w-4 mr-1" />
                            {t.actions.optimize}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Sectors Tab */}
          <TabsContent value="sectors" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Sector Benchmarking
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {SECTOR_BENCHMARKS.map((sector) => {
                    const SectorIcon = getSectorIcon(sector.sector);
                    
                    return (
                      <div key={sector.sector} className="p-6 border rounded-lg hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <SectorIcon className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg">
                                {locale === 'en' ? sector.sector : sector.sectorEl}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {sector.employeeCount} employees • €{(sector.totalPayrollCost / 1000).toFixed(0)}K total payroll
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-4 gap-4">
                          <div>
                            <div className="text-xs font-medium text-gray-700">Average Salary</div>
                            <div className="text-lg font-bold text-green-600">€{sector.avgSalary.toLocaleString()}</div>
                          </div>

                          <div>
                            <div className="text-xs font-medium text-gray-700">HR Cost/Employee</div>
                            <div className="text-lg font-bold text-blue-600">€{sector.hrCostPerEmployee}</div>
                          </div>

                          <div>
                            <div className="text-xs font-medium text-gray-700">Compliance Cost</div>
                            <div className="text-lg font-bold text-purple-600">€{sector.complianceCost.toLocaleString()}</div>
                          </div>

                          <div>
                            <div className="text-xs font-medium text-gray-700">Training Cost</div>
                            <div className="text-lg font-bold text-orange-600">€{sector.trainingCost.toLocaleString()}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Regional Tab */}
          <TabsContent value="regional" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Regional Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {REGIONAL_DATA.map((region) => (
                    <div key={region.region} className="p-4 border rounded-lg">
                      <h3 className="font-semibold text-lg mb-4">
                        {locale === 'en' ? region.region : region.regionEl}
                      </h3>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Average Salary</span>
                          <span className="text-sm font-medium">€{region.avgSalary.toLocaleString()}</span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Living Cost Index</span>
                          <span className="text-sm font-medium">{region.livingCostIndex}</span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Unemployment Rate</span>
                          <span className="text-sm font-medium">{region.unemploymentRate}%</span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">HR Cost Index</span>
                          <span className="text-sm font-medium">{region.hrCostIndex}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="h-5 w-5" />
                    Priority Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {COST_CATEGORIES.filter(c => c.priority === 'critical' || c.priority === 'high').map((category) => (
                      <div key={category.id} className="p-4 border-l-4 border-red-500 bg-red-50 rounded">
                        <h4 className="font-semibold text-red-800 mb-2">
                          {locale === 'en' ? category.name : category.nameEl}
                        </h4>
                        <p className="text-sm text-red-700 mb-3">
                          {locale === 'en' ? category.recommendation : category.recommendationEl}
                        </p>
                        <Badge className={getPriorityColor(category.priority)}>
                          {t.priority[category.priority as keyof typeof t.priority]}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    Optimization Opportunities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 border-l-4 border-green-500 bg-green-50 rounded">
                      <h4 className="font-semibold text-green-800 mb-2">Payroll Automation</h4>
                      <p className="text-sm text-green-700 mb-2">
                        Potential savings: €1,000-1,500/month through process automation
                      </p>
                      <div className="text-xs text-green-600">ROI: 240% over 12 months</div>
                    </div>

                    <div className="p-4 border-l-4 border-blue-500 bg-blue-50 rounded">
                      <h4 className="font-semibold text-blue-800 mb-2">Employee Referral Program</h4>
                      <p className="text-sm text-blue-700 mb-2">
                        Reduce recruitment costs by 40% through referral incentives
                      </p>
                      <div className="text-xs text-blue-600">Potential savings: €2,200/month</div>
                    </div>

                    <div className="p-4 border-l-4 border-purple-500 bg-purple-50 rounded">
                      <h4 className="font-semibold text-purple-800 mb-2">Training Investment</h4>
                      <p className="text-sm text-purple-700 mb-2">
                        Increase training budget to improve retention and reduce turnover costs
                      </p>
                      <div className="text-xs text-purple-600">ROI: 180% through retention improvement</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Cost Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {COST_CATEGORIES.map((category, index) => {
                      const percentage = (category.yourCost / COST_CATEGORIES.reduce((sum, c) => sum + c.yourCost, 0) * 100);
                      return (
                        <div key={category.id} className="flex items-center gap-3">
                          <div className="w-16 text-xs font-medium">
                            {locale === 'en' ? category.name.split(' ')[0] : category.nameEl.split(' ')[0]}
                          </div>
                          <Progress value={percentage} className="flex-1" />
                          <div className="w-16 text-xs font-medium text-right">{percentage.toFixed(1)}%</div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="h-5 w-5" />
                    Monthly Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total HR costs trend</span>
                      <Badge className="bg-green-100 text-green-800">↓ 5.2% vs last quarter</Badge>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Cost per employee</span>
                      <Badge className="bg-blue-100 text-blue-800">↑ 2.1% vs industry</Badge>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Efficiency improvement</span>
                      <Badge className="bg-purple-100 text-purple-800">↑ 12.3% YoY</Badge>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Compliance costs</span>
                      <Badge className="bg-green-100 text-green-800">↓ 8.7% vs budget</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Export Options</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-4">
                  <Button variant="outline" className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    PDF Report
                  </Button>
                  
                  <Button variant="outline" className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Excel Data
                  </Button>
                  
                  <Button variant="outline" className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    CSV Export
                  </Button>
                  
                  <Button variant="outline" className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    PowerBI
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}