/**
 * Predictive Labor Costs - Forecast monthly payroll expenses
 * Advanced forecasting system for Greek payroll expense prediction
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
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
  ArrowUp,
  ArrowDown,
  Activity,
  Clock,
  Calculator,
  PieChart,
  Settings,
  Eye,
  Download,
  RefreshCw,
  Filter,
  Zap,
  Shield,
  Star,
  Flag,
  Percent,
  DollarSign,
  CreditCard,
  Receipt,
  Building,
  Factory,
  Hotel,
  ShoppingCart,
  Stethoscope,
  GraduationCap,
  Construction,
  Truck,
  Cpu,
  Globe,
  MapPin,
  Briefcase,
  Award,
  Info,
  BookOpen,
  Search,
  FileText,
  Mail,
  Phone,
  History,
  Plus,
  Minus,
  ArrowRight,
} from 'lucide-react';

interface ForecastPeriod {
  month: string;
  year: number;
  baseSalary: number;
  overtime: number;
  benefits: number;
  socialSecurity: number;
  taxes: number;
  bonuses: number;
  seasonalAdjustment: number;
  totalCost: number;
  variance: number;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
}

interface CostDriver {
  id: string;
  name: string;
  nameEl: string;
  impact: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  description: string;
  descriptionEl: string;
  category: 'regulatory' | 'market' | 'seasonal' | 'operational';
}

interface ForecastScenario {
  id: string;
  name: string;
  nameEl: string;
  description: string;
  descriptionEl: string;
  probability: number;
  totalImpact: number;
  monthlyVariation: number;
  riskLevel: 'low' | 'medium' | 'high';
}

interface SeasonalPattern {
  month: string;
  monthEl: string;
  multiplier: number;
  drivers: string[];
  driversEl: string[];
  description: string;
  descriptionEl: string;
}

interface ForecastMetrics {
  predictedAnnualCost: number;
  averageMonthlyCost: number;
  yearOverYearChange: number;
  seasonalVariation: number;
  forecastAccuracy: number;
  confidenceLevel: number;
  budgetVariance: number;
  riskScore: number;
}

interface PredictiveLaborCostsProps {
  locale?: 'en' | 'el';
}

const FORECAST_DATA: ForecastPeriod[] = [
  {
    month: 'January 2025',
    year: 2025,
    baseSalary: 145000,
    overtime: 12500,
    benefits: 32000,
    socialSecurity: 34800,
    taxes: 28900,
    bonuses: 8500,
    seasonalAdjustment: -5200,
    totalCost: 256500,
    variance: -3.2,
    confidence: 92,
    riskLevel: 'low',
  },
  {
    month: 'February 2025',
    year: 2025,
    baseSalary: 145000,
    overtime: 11800,
    benefits: 32000,
    socialSecurity: 34200,
    taxes: 28400,
    bonuses: 5200,
    seasonalAdjustment: -2100,
    totalCost: 254500,
    variance: -1.8,
    confidence: 89,
    riskLevel: 'low',
  },
  {
    month: 'March 2025',
    year: 2025,
    baseSalary: 147500,
    overtime: 15200,
    benefits: 32500,
    socialSecurity: 36400,
    taxes: 30100,
    bonuses: 12000,
    seasonalAdjustment: 3400,
    totalCost: 277200,
    variance: 4.2,
    confidence: 85,
    riskLevel: 'medium',
  },
  {
    month: 'April 2025',
    year: 2025,
    baseSalary: 147500,
    overtime: 18700,
    benefits: 33200,
    socialSecurity: 38900,
    taxes: 32800,
    bonuses: 15600,
    seasonalAdjustment: 7800,
    totalCost: 294500,
    variance: 8.7,
    confidence: 82,
    riskLevel: 'medium',
  },
  {
    month: 'May 2025',
    year: 2025,
    baseSalary: 150000,
    overtime: 22300,
    benefits: 34800,
    socialSecurity: 42100,
    taxes: 36200,
    bonuses: 18900,
    seasonalAdjustment: 12400,
    totalCost: 316700,
    variance: 15.3,
    confidence: 78,
    riskLevel: 'high',
  },
  {
    month: 'June 2025',
    year: 2025,
    baseSalary: 152500,
    overtime: 26800,
    benefits: 36200,
    socialSecurity: 45600,
    taxes: 39800,
    bonuses: 22100,
    seasonalAdjustment: 18700,
    totalCost: 341700,
    variance: 24.1,
    confidence: 75,
    riskLevel: 'high',
  },
  {
    month: 'July 2025',
    year: 2025,
    baseSalary: 155000,
    overtime: 31200,
    benefits: 38400,
    socialSecurity: 49800,
    taxes: 43700,
    bonuses: 25600,
    seasonalAdjustment: 26200,
    totalCost: 369900,
    variance: 32.8,
    confidence: 72,
    riskLevel: 'high',
  },
  {
    month: 'August 2025',
    year: 2025,
    baseSalary: 157500,
    overtime: 29400,
    benefits: 37800,
    socialSecurity: 48200,
    taxes: 42100,
    bonuses: 23800,
    seasonalAdjustment: 22100,
    totalCost: 360900,
    variance: 28.5,
    confidence: 74,
    riskLevel: 'high',
  },
  {
    month: 'September 2025',
    year: 2025,
    baseSalary: 155000,
    overtime: 21800,
    benefits: 36200,
    socialSecurity: 43900,
    taxes: 38600,
    bonuses: 18200,
    seasonalAdjustment: 12800,
    totalCost: 326500,
    variance: 18.2,
    confidence: 80,
    riskLevel: 'medium',
  },
  {
    month: 'October 2025',
    year: 2025,
    baseSalary: 152500,
    overtime: 17600,
    benefits: 34800,
    socialSecurity: 40200,
    taxes: 35100,
    bonuses: 14500,
    seasonalAdjustment: 6700,
    totalCost: 301400,
    variance: 12.4,
    confidence: 83,
    riskLevel: 'medium',
  },
  {
    month: 'November 2025',
    year: 2025,
    baseSalary: 150000,
    overtime: 14200,
    benefits: 33600,
    socialSecurity: 37800,
    taxes: 32400,
    bonuses: 11200,
    seasonalAdjustment: 2100,
    totalCost: 281300,
    variance: 6.8,
    confidence: 87,
    riskLevel: 'medium',
  },
  {
    month: 'December 2025',
    year: 2025,
    baseSalary: 147500,
    overtime: 16800,
    benefits: 35200,
    socialSecurity: 39600,
    taxes: 34700,
    bonuses: 28500,
    seasonalAdjustment: 8400,
    totalCost: 310700,
    variance: 14.2,
    confidence: 85,
    riskLevel: 'medium',
  },
];

const COST_DRIVERS: CostDriver[] = [
  {
    id: 'minimum-wage',
    name: 'Minimum Wage Increases',
    nameEl: 'Αυξήσεις Κατώτατου Μισθού',
    impact: 8.5,
    trend: 'increasing',
    description:
      'Greek minimum wage adjustments affecting baseline salary calculations',
    descriptionEl:
      'Προσαρμογές ελληνικού κατώτατου μισθού που επηρεάζουν τους βασικούς υπολογισμούς μισθών',
    category: 'regulatory',
  },
  {
    id: 'efka-contributions',
    name: 'EFKA Contribution Changes',
    nameEl: 'Αλλαγές Εισφορών ΕΦΚΑ',
    impact: 12.3,
    trend: 'increasing',
    description:
      'Changes in social security contribution rates and calculations',
    descriptionEl:
      'Αλλαγές στα ποσοστά και τους υπολογισμούς εισφορών κοινωνικής ασφάλισης',
    category: 'regulatory',
  },
  {
    id: 'tourism-seasonality',
    name: 'Tourism Seasonality',
    nameEl: 'Εποχικότητα Τουρισμού',
    impact: 35.2,
    trend: 'stable',
    description: 'Seasonal hiring patterns in tourism and hospitality sectors',
    descriptionEl:
      'Εποχικά πρότυπα προσλήψεων στους τομείς τουρισμού και φιλοξενίας',
    category: 'seasonal',
  },
  {
    id: 'collective-agreements',
    name: 'Collective Agreement Updates',
    nameEl: 'Ενημερώσεις Συλλογικών Συμβάσεων',
    impact: 15.7,
    trend: 'increasing',
    description:
      'Changes in collective bargaining agreements affecting wages and benefits',
    descriptionEl:
      'Αλλαγές στις συλλογικές συμβάσεις που επηρεάζουν μισθούς και παροχές',
    category: 'regulatory',
  },
  {
    id: 'talent-shortage',
    name: 'Talent Shortage Premium',
    nameEl: 'Πριμ Έλλειψης Ταλέντου',
    impact: 22.1,
    trend: 'increasing',
    description:
      'Increased compensation due to skilled labor shortages in key sectors',
    descriptionEl:
      'Αυξημένες αποδοχές λόγω ελλείψεων εξειδικευμένου εργατικού δυναμικού σε βασικούς τομείς',
    category: 'market',
  },
  {
    id: 'remote-work-allowances',
    name: 'Remote Work Allowances',
    nameEl: 'Επιδόματα Τηλεργασίας',
    impact: 6.8,
    trend: 'stable',
    description: 'Additional costs for remote work equipment and allowances',
    descriptionEl: 'Πρόσθετα κόστη για εξοπλισμό και επιδόματα τηλεργασίας',
    category: 'operational',
  },
  {
    id: 'inflation-adjustment',
    name: 'Inflation Adjustment',
    nameEl: 'Προσαρμογή Πληθωρισμού',
    impact: 9.4,
    trend: 'increasing',
    description:
      'Salary adjustments to maintain purchasing power amid inflation',
    descriptionEl:
      'Προσαρμογές μισθών για διατήρηση αγοραστικής δύναμης εν μέσω πληθωρισμού',
    category: 'market',
  },
];

const FORECAST_SCENARIOS: ForecastScenario[] = [
  {
    id: 'optimistic',
    name: 'Optimistic Scenario',
    nameEl: 'Αισιόδοξο Σενάριο',
    description:
      'Favorable economic conditions with controlled labor cost increases',
    descriptionEl:
      'Ευνοϊκές οικονομικές συνθήκες με ελεγχόμενες αυξήσεις κόστους εργασίας',
    probability: 25,
    totalImpact: -5.2,
    monthlyVariation: 2.1,
    riskLevel: 'low',
  },
  {
    id: 'baseline',
    name: 'Baseline Scenario',
    nameEl: 'Βασικό Σενάριο',
    description:
      'Current trends continue with expected regulatory and market changes',
    descriptionEl:
      'Οι τρέχουσες τάσεις συνεχίζονται με αναμενόμενες κανονιστικές και αγοραίες αλλαγές',
    probability: 55,
    totalImpact: 8.7,
    monthlyVariation: 4.3,
    riskLevel: 'medium',
  },
  {
    id: 'pessimistic',
    name: 'Pessimistic Scenario',
    nameEl: 'Απαισιόδοξο Σενάριο',
    description:
      'Economic challenges leading to higher labor costs and regulatory burdens',
    descriptionEl:
      'Οικονομικές προκλήσεις που οδηγούν σε υψηλότερο κόστος εργασίας και κανονιστικά βάρη',
    probability: 20,
    totalImpact: 18.5,
    monthlyVariation: 7.8,
    riskLevel: 'high',
  },
];

const SEASONAL_PATTERNS: SeasonalPattern[] = [
  {
    month: 'January',
    monthEl: 'Ιανουάριος',
    multiplier: 0.92,
    drivers: ['Post-holiday reduction', 'Lower tourism activity'],
    driversEl: [
      'Μείωση μετά τις διακοπές',
      'Χαμηλότερη τουριστική δραστηριότητα',
    ],
    description: 'Reduced activity following holiday season',
    descriptionEl: 'Μειωμένη δραστηριότητα μετά την περίοδο των διακοπών',
  },
  {
    month: 'February',
    monthEl: 'Φεβρουάριος',
    multiplier: 0.94,
    drivers: ['Continued low season', 'Pre-spring preparation'],
    driversEl: ['Συνεχιζόμενη χαμηλή περίοδος', 'Προετοιμασία προ-ανοιξιάτικη'],
    description: 'Lowest activity month with minimal overtime',
    descriptionEl:
      'Μήνας με τη χαμηλότερη δραστηριότητα και ελάχιστες υπερωρίες',
  },
  {
    month: 'March',
    monthEl: 'Μάρτιος',
    multiplier: 1.04,
    drivers: ['Spring preparation', 'Early tourism bookings'],
    driversEl: ['Προετοιμασία άνοιξης', 'Πρώιμες τουριστικές κρατήσεις'],
    description: 'Activity increase as tourism season approaches',
    descriptionEl:
      'Αύξηση δραστηριότητας καθώς πλησιάζει η τουριστική περίοδος',
  },
  {
    month: 'April',
    monthEl: 'Απρίλιος',
    multiplier: 1.12,
    drivers: ['Easter holidays', 'Tourism season start', 'Retail spring surge'],
    driversEl: [
      'Πασχαλινές διακοπές',
      'Έναρξη τουριστικής περιόδου',
      'Ανοιξιάτικη άνοδος λιανικής',
    ],
    description: 'Significant increase due to Easter and tourism preparation',
    descriptionEl: 'Σημαντική αύξηση λόγω Πάσχα και προετοιμασίας τουρισμού',
  },
  {
    month: 'May',
    monthEl: 'Μάιος',
    multiplier: 1.21,
    drivers: [
      'Peak spring activity',
      'Early summer preparation',
      'Wedding season',
    ],
    driversEl: [
      'Κορυφαία ανοιξιάτικη δραστηριότητα',
      'Προετοιμασία πρώιμου καλοκαιριού',
      'Περίοδος γάμων',
    ],
    description: 'High activity with wedding season and tourism ramp-up',
    descriptionEl:
      'Υψηλή δραστηριότητα με περίοδο γάμων και ανάπτυξη τουρισμού',
  },
  {
    month: 'June',
    monthEl: 'Ιούνιος',
    multiplier: 1.35,
    drivers: ['Summer season peak', 'Tourism high season', 'Extended hours'],
    driversEl: [
      'Κορυφή καλοκαιρινής περιόδου',
      'Υψηλή τουριστική περίοδος',
      'Εκτεταμένο ωράριο',
    ],
    description: 'Peak summer activity with maximum staffing needs',
    descriptionEl:
      'Κορυφαία καλοκαιρινή δραστηριότητα με μέγιστες ανάγκες προσωπικού',
  },
  {
    month: 'July',
    monthEl: 'Ιούλιος',
    multiplier: 1.42,
    drivers: ['Absolute peak season', 'Maximum tourism', 'Vacation coverage'],
    driversEl: [
      'Απόλυτη κορυφαία περίοδος',
      'Μέγιστος τουρισμός',
      'Κάλυψη διακοπών',
    ],
    description: 'Highest labor costs due to peak summer demands',
    descriptionEl:
      'Υψηλότερο κόστος εργασίας λόγω κορυφαίων καλοκαιρινών απαιτήσεων',
  },
  {
    month: 'August',
    monthEl: 'Αύγουστος',
    multiplier: 1.38,
    drivers: [
      'Continued peak season',
      'Employee vacation coverage',
      'Heat adjustments',
    ],
    driversEl: [
      'Συνεχιζόμενη κορυφαία περίοδος',
      'Κάλυψη διακοπών εργαζομένων',
      'Προσαρμογές ζέστης',
    ],
    description: 'High costs maintained with vacation coverage challenges',
    descriptionEl:
      'Υψηλό κόστος που διατηρείται με προκλήσεις κάλυψης διακοπών',
  },
  {
    month: 'September',
    monthEl: 'Σεπτέμβριος',
    multiplier: 1.18,
    drivers: [
      'Late summer activity',
      'Back-to-school preparations',
      'Conference season',
    ],
    driversEl: [
      'Καλοκαιρινή δραστηριότητα τέλος',
      'Προετοιμασίες επιστροφής στο σχολείο',
      'Περίοδος συνεδρίων',
    ],
    description: 'Gradual decrease from summer peak with conference activity',
    descriptionEl:
      'Βαθμιαία μείωση από την καλοκαιρινή κορυφή με δραστηριότητα συνεδρίων',
  },
  {
    month: 'October',
    monthEl: 'Οκτώβριος',
    multiplier: 1.08,
    drivers: [
      'Autumn adjustment',
      'Business season recovery',
      'Holiday preparation',
    ],
    driversEl: [
      'Φθινοπωρινή προσαρμογή',
      'Ανάκαμψη επιχειρηματικής περιόδου',
      'Προετοιμασία διακοπών',
    ],
    description: 'Moderate activity with business season recovery',
    descriptionEl: 'Μέτρια δραστηριότητα με ανάκαμψη επιχειρηματικής περιόδου',
  },
  {
    month: 'November',
    monthEl: 'Νοέμβριος',
    multiplier: 1.02,
    drivers: [
      'Pre-holiday preparation',
      'Black Friday retail surge',
      'Year-end projects',
    ],
    driversEl: [
      'Προετοιμασία προ-διακοπών',
      'Άνοδος λιανικής Black Friday',
      'Έργα τέλους έτους',
    ],
    description:
      'Slight increase due to holiday preparation and retail activity',
    descriptionEl:
      'Μικρή αύξηση λόγω προετοιμασίας διακοπών και λιανικής δραστηριότητας',
  },
  {
    month: 'December',
    monthEl: 'Δεκέμβριος',
    multiplier: 1.14,
    drivers: [
      'Holiday season',
      'Christmas bonuses',
      'Year-end bonuses',
      'Retail peak',
    ],
    driversEl: [
      'Περίοδος διακοπών',
      'Χριστουγεννιάτικα μπόνους',
      'Μπόνους τέλους έτους',
      'Κορυφή λιανικής',
    ],
    description:
      'Increased costs due to holiday bonuses and retail peak activity',
    descriptionEl:
      'Αυξημένο κόστος λόγω μπόνους διακοπών και κορυφαίας λιανικής δραστηριότητας',
  },
];

const FORECAST_METRICS: ForecastMetrics = {
  predictedAnnualCost: 3742800,
  averageMonthlyCost: 311900,
  yearOverYearChange: 12.4,
  seasonalVariation: 47.3,
  forecastAccuracy: 87.2,
  confidenceLevel: 82.1,
  budgetVariance: 5.8,
  riskScore: 6.4,
};

export default function PredictiveLaborCosts({
  locale = 'en',
}: PredictiveLaborCostsProps) {
  const [selectedTab, setSelectedTab] = useState('forecast');
  const [selectedScenario, setSelectedScenario] = useState<string>('baseline');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('12months');
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  const translations = {
    en: {
      title: 'Predictive Labor Costs',
      subtitle: 'Forecast Monthly Payroll Expenses',
      tabs: {
        forecast: 'Forecast',
        scenarios: 'Scenarios',
        drivers: 'Cost Drivers',
        seasonal: 'Seasonal Patterns',
        analytics: 'Analytics',
        settings: 'Settings',
      },
      metrics: {
        predictedAnnualCost: 'Predicted Annual Cost',
        averageMonthlyCost: 'Average Monthly Cost',
        yearOverYearChange: 'Year-over-Year Change',
        seasonalVariation: 'Seasonal Variation',
        forecastAccuracy: 'Forecast Accuracy',
        confidenceLevel: 'Confidence Level',
        budgetVariance: 'Budget Variance',
        riskScore: 'Risk Score',
      },
      forecast: {
        baseSalary: 'Base Salary',
        overtime: 'Overtime',
        benefits: 'Benefits',
        socialSecurity: 'Social Security',
        taxes: 'Taxes',
        bonuses: 'Bonuses',
        seasonalAdjustment: 'Seasonal Adjustment',
        totalCost: 'Total Cost',
        variance: 'Variance',
        confidence: 'Confidence',
        riskLevel: 'Risk Level',
      },
      scenarios: {
        optimistic: 'Optimistic',
        baseline: 'Baseline',
        pessimistic: 'Pessimistic',
        probability: 'Probability',
        totalImpact: 'Total Impact',
        monthlyVariation: 'Monthly Variation',
      },
      costDrivers: {
        regulatory: 'Regulatory',
        market: 'Market',
        seasonal: 'Seasonal',
        operational: 'Operational',
        impact: 'Impact',
        trend: 'Trend',
        increasing: 'Increasing',
        decreasing: 'Decreasing',
        stable: 'Stable',
      },
      riskLevel: {
        low: 'Low Risk',
        medium: 'Medium Risk',
        high: 'High Risk',
      },
      actions: {
        viewDetails: 'View Details',
        downloadForecast: 'Download Forecast',
        exportData: 'Export Data',
        refreshData: 'Refresh Data',
        adjustParameters: 'Adjust Parameters',
        createBudget: 'Create Budget',
        viewChart: 'View Chart',
        viewTable: 'View Table',
      },
      filters: {
        scenario: 'Select Scenario',
        period: 'Select Period',
        all: 'All',
      },
    },
    el: {
      title: 'Προβλεπτικό Κόστος Εργασίας',
      subtitle: 'Πρόβλεψη Μηνιαίων Εξόδων Μισθοδοσίας',
      tabs: {
        forecast: 'Πρόβλεψη',
        scenarios: 'Σενάρια',
        drivers: 'Παράγοντες Κόστους',
        seasonal: 'Εποχικά Μοτίβα',
        analytics: 'Αναλυτικά',
        settings: 'Ρυθμίσεις',
      },
      metrics: {
        predictedAnnualCost: 'Προβλεπόμενο Ετήσιο Κόστος',
        averageMonthlyCost: 'Μέσο Μηνιαίο Κόστος',
        yearOverYearChange: 'Μεταβολή Έτος προς Έτος',
        seasonalVariation: 'Εποχική Διακύμανση',
        forecastAccuracy: 'Ακρίβεια Πρόβλεψης',
        confidenceLevel: 'Επίπεδο Εμπιστοσύνης',
        budgetVariance: 'Απόκλιση Προϋπολογισμού',
        riskScore: 'Βαθμός Κινδύνου',
      },
      forecast: {
        baseSalary: 'Βασικός Μισθός',
        overtime: 'Υπερωρίες',
        benefits: 'Παροχές',
        socialSecurity: 'Κοινωνική Ασφάλιση',
        taxes: 'Φόροι',
        bonuses: 'Μπόνους',
        seasonalAdjustment: 'Εποχική Προσαρμογή',
        totalCost: 'Συνολικό Κόστος',
        variance: 'Απόκλιση',
        confidence: 'Εμπιστοσύνη',
        riskLevel: 'Επίπεδο Κινδύνου',
      },
      scenarios: {
        optimistic: 'Αισιόδοξο',
        baseline: 'Βασικό',
        pessimistic: 'Απαισιόδοξο',
        probability: 'Πιθανότητα',
        totalImpact: 'Συνολικός Αντίκτυπος',
        monthlyVariation: 'Μηνιαία Διακύμανση',
      },
      costDrivers: {
        regulatory: 'Κανονιστικό',
        market: 'Αγορά',
        seasonal: 'Εποχικό',
        operational: 'Λειτουργικό',
        impact: 'Αντίκτυπος',
        trend: 'Τάση',
        increasing: 'Αυξάνεται',
        decreasing: 'Μειώνεται',
        stable: 'Σταθερό',
      },
      riskLevel: {
        low: 'Χαμηλός Κίνδυνος',
        medium: 'Μέτριος Κίνδυνος',
        high: 'Υψηλός Κίνδυνος',
      },
      actions: {
        viewDetails: 'Προβολή Λεπτομερειών',
        downloadForecast: 'Λήψη Πρόβλεψης',
        exportData: 'Εξαγωγή Δεδομένων',
        refreshData: 'Ανανέωση Δεδομένων',
        adjustParameters: 'Προσαρμογή Παραμέτρων',
        createBudget: 'Δημιουργία Προϋπολογισμού',
        viewChart: 'Προβολή Γραφήματος',
        viewTable: 'Προβολή Πίνακα',
      },
      filters: {
        scenario: 'Επιλογή Σεναρίου',
        period: 'Επιλογή Περιόδου',
        all: 'Όλα',
      },
    },
  };

  const t = translations[locale];

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'text-green-600 bg-green-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'high':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'regulatory':
        return 'text-blue-600 bg-blue-100';
      case 'market':
        return 'text-green-600 bg-green-100';
      case 'seasonal':
        return 'text-orange-600 bg-orange-100';
      case 'operational':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return ArrowUp;
      case 'decreasing':
        return ArrowDown;
      case 'stable':
        return ArrowRight;
      default:
        return ArrowRight;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return 'text-red-600';
      case 'decreasing':
        return 'text-green-600';
      case 'stable':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  const filteredForecast = FORECAST_DATA.filter(period => {
    if (selectedPeriod === '6months') {
      return new Date(period.month) <= new Date('June 2025');
    }
    return true;
  });

  const selectedScenarioData = FORECAST_SCENARIOS.find(
    scenario => scenario.id === selectedScenario
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <LineChart className="h-8 w-8 text-blue-600" />
                </div>
                {t.title}
              </h1>
              <p className="text-gray-600 ml-12">{t.subtitle}</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                {t.actions.refreshData}
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Download className="h-4 w-4 mr-2" />
                {t.actions.downloadForecast}
              </Button>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4 mb-6">
            <Card className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  €{(FORECAST_METRICS.predictedAnnualCost / 1000000).toFixed(1)}
                  M
                </div>
                <div className="text-xs text-blue-100">
                  {t.metrics.predictedAnnualCost}
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-r from-green-500 to-green-600 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  €{(FORECAST_METRICS.averageMonthlyCost / 1000).toFixed(0)}K
                </div>
                <div className="text-xs text-green-100">
                  {t.metrics.averageMonthlyCost}
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  +{FORECAST_METRICS.yearOverYearChange}%
                </div>
                <div className="text-xs text-purple-100">
                  {t.metrics.yearOverYearChange}
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {FORECAST_METRICS.seasonalVariation}%
                </div>
                <div className="text-xs text-orange-100">
                  {t.metrics.seasonalVariation}
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-r from-red-500 to-red-600 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {FORECAST_METRICS.forecastAccuracy}%
                </div>
                <div className="text-xs text-red-100">
                  {t.metrics.forecastAccuracy}
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {FORECAST_METRICS.confidenceLevel}%
                </div>
                <div className="text-xs text-indigo-100">
                  {t.metrics.confidenceLevel}
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  ±{FORECAST_METRICS.budgetVariance}%
                </div>
                <div className="text-xs text-teal-100">
                  {t.metrics.budgetVariance}
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {FORECAST_METRICS.riskScore}/10
                </div>
                <div className="text-xs text-yellow-100">
                  {t.metrics.riskScore}
                </div>
              </div>
            </Card>
          </div>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="forecast">{t.tabs.forecast}</TabsTrigger>
            <TabsTrigger value="scenarios">{t.tabs.scenarios}</TabsTrigger>
            <TabsTrigger value="drivers">{t.tabs.drivers}</TabsTrigger>
            <TabsTrigger value="seasonal">{t.tabs.seasonal}</TabsTrigger>
            <TabsTrigger value="analytics">{t.tabs.analytics}</TabsTrigger>
            <TabsTrigger value="settings">{t.tabs.settings}</TabsTrigger>
          </TabsList>

          {/* Forecast Tab */}
          <TabsContent value="forecast" className="space-y-6">
            {/* Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Forecast Controls
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-4">
                  <Select
                    value={selectedScenario}
                    onValueChange={setSelectedScenario}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t.filters.scenario} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="optimistic">
                        {t.scenarios.optimistic}
                      </SelectItem>
                      <SelectItem value="baseline">
                        {t.scenarios.baseline}
                      </SelectItem>
                      <SelectItem value="pessimistic">
                        {t.scenarios.pessimistic}
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={selectedPeriod}
                    onValueChange={setSelectedPeriod}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t.filters.period} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6months">6 Months</SelectItem>
                      <SelectItem value="12months">12 Months</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={viewMode}
                    onValueChange={(value: any) => setViewMode(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="View Mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="chart">
                        {t.actions.viewChart}
                      </SelectItem>
                      <SelectItem value="table">
                        {t.actions.viewTable}
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedScenario('baseline');
                      setSelectedPeriod('12months');
                      setViewMode('chart');
                    }}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Forecast Overview */}
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <LineChart className="h-5 w-5 text-blue-600" />
                      Monthly Labor Cost Forecast
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {viewMode === 'chart' ? (
                      <div className="h-64 flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                          <p>Interactive forecast chart would display here</p>
                          <p className="text-sm">
                            Showing monthly predictions with confidence
                            intervals
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredForecast.slice(0, 6).map(period => (
                          <div
                            key={period.month}
                            className="flex items-center justify-between p-3 border rounded"
                          >
                            <div>
                              <div className="font-medium">{period.month}</div>
                              <div className="text-sm text-gray-600">
                                Confidence: {period.confidence}%
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-lg">
                                €{period.totalCost.toLocaleString()}
                              </div>
                              <div
                                className={`text-sm ${period.variance >= 0 ? 'text-red-600' : 'text-green-600'}`}
                              >
                                {period.variance >= 0 ? '+' : ''}
                                {period.variance}%
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Current Scenario */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-green-600" />
                    Current Scenario
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedScenarioData && (
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-lg mb-2">
                          {locale === 'en'
                            ? selectedScenarioData.name
                            : selectedScenarioData.nameEl}
                        </h3>
                        <p className="text-sm text-gray-600 mb-3">
                          {locale === 'en'
                            ? selectedScenarioData.description
                            : selectedScenarioData.descriptionEl}
                        </p>
                        <Badge
                          className={getRiskColor(
                            selectedScenarioData.riskLevel
                          )}
                        >
                          {
                            t.riskLevel[
                              selectedScenarioData.riskLevel as keyof typeof t.riskLevel
                            ]
                          }
                        </Badge>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            {t.scenarios.probability}
                          </span>
                          <span className="text-sm font-medium">
                            {selectedScenarioData.probability}%
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            {t.scenarios.totalImpact}
                          </span>
                          <span
                            className={`text-sm font-medium ${selectedScenarioData.totalImpact >= 0 ? 'text-red-600' : 'text-green-600'}`}
                          >
                            {selectedScenarioData.totalImpact >= 0 ? '+' : ''}
                            {selectedScenarioData.totalImpact}%
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            {t.scenarios.monthlyVariation}
                          </span>
                          <span className="text-sm font-medium">
                            ±{selectedScenarioData.monthlyVariation}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Detailed Forecast Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Detailed Monthly Forecast
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Month</th>
                        <th className="text-right p-2">
                          {t.forecast.baseSalary}
                        </th>
                        <th className="text-right p-2">
                          {t.forecast.overtime}
                        </th>
                        <th className="text-right p-2">
                          {t.forecast.benefits}
                        </th>
                        <th className="text-right p-2">
                          {t.forecast.socialSecurity}
                        </th>
                        <th className="text-right p-2">{t.forecast.taxes}</th>
                        <th className="text-right p-2">{t.forecast.bonuses}</th>
                        <th className="text-right p-2">
                          {t.forecast.totalCost}
                        </th>
                        <th className="text-right p-2">
                          {t.forecast.confidence}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredForecast.slice(0, 6).map(period => (
                        <tr
                          key={period.month}
                          className="border-b hover:bg-gray-50"
                        >
                          <td className="p-2 font-medium">{period.month}</td>
                          <td className="text-right p-2">
                            €{period.baseSalary.toLocaleString()}
                          </td>
                          <td className="text-right p-2">
                            €{period.overtime.toLocaleString()}
                          </td>
                          <td className="text-right p-2">
                            €{period.benefits.toLocaleString()}
                          </td>
                          <td className="text-right p-2">
                            €{period.socialSecurity.toLocaleString()}
                          </td>
                          <td className="text-right p-2">
                            €{period.taxes.toLocaleString()}
                          </td>
                          <td className="text-right p-2">
                            €{period.bonuses.toLocaleString()}
                          </td>
                          <td className="text-right p-2 font-bold">
                            €{period.totalCost.toLocaleString()}
                          </td>
                          <td className="text-right p-2">
                            <Badge className={getRiskColor(period.riskLevel)}>
                              {period.confidence}%
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Scenarios Tab */}
          <TabsContent value="scenarios" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Forecast Scenarios
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6">
                  {FORECAST_SCENARIOS.map(scenario => (
                    <div
                      key={scenario.id}
                      className={`p-6 border rounded-lg hover:shadow-md transition-shadow cursor-pointer ${
                        selectedScenario === scenario.id
                          ? 'border-blue-500 bg-blue-50'
                          : ''
                      }`}
                      onClick={() => setSelectedScenario(scenario.id)}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-lg mb-2">
                            {locale === 'en' ? scenario.name : scenario.nameEl}
                          </h3>
                          <p className="text-gray-600 text-sm mb-3">
                            {locale === 'en'
                              ? scenario.description
                              : scenario.descriptionEl}
                          </p>
                        </div>
                        <Badge className={getRiskColor(scenario.riskLevel)}>
                          {
                            t.riskLevel[
                              scenario.riskLevel as keyof typeof t.riskLevel
                            ]
                          }
                        </Badge>
                      </div>

                      <div className="grid md:grid-cols-4 gap-4">
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-1">
                            {t.scenarios.probability}
                          </div>
                          <div className="text-lg font-bold text-blue-600">
                            {scenario.probability}%
                          </div>
                        </div>

                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-1">
                            {t.scenarios.totalImpact}
                          </div>
                          <div
                            className={`text-lg font-bold ${scenario.totalImpact >= 0 ? 'text-red-600' : 'text-green-600'}`}
                          >
                            {scenario.totalImpact >= 0 ? '+' : ''}
                            {scenario.totalImpact}%
                          </div>
                        </div>

                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-1">
                            {t.scenarios.monthlyVariation}
                          </div>
                          <div className="text-lg font-bold text-purple-600">
                            ±{scenario.monthlyVariation}%
                          </div>
                        </div>

                        <div className="flex items-end">
                          <Button
                            size="sm"
                            variant={
                              selectedScenario === scenario.id
                                ? 'default'
                                : 'outline'
                            }
                            className={
                              selectedScenario === scenario.id
                                ? 'bg-blue-600 hover:bg-blue-700'
                                : ''
                            }
                          >
                            {selectedScenario === scenario.id
                              ? 'Selected'
                              : 'Select'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cost Drivers Tab */}
          <TabsContent value="drivers" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Cost Drivers Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {COST_DRIVERS.map(driver => {
                    const TrendIcon = getTrendIcon(driver.trend);

                    return (
                      <div
                        key={driver.id}
                        className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-lg mb-1">
                              {locale === 'en' ? driver.name : driver.nameEl}
                            </h3>
                            <p className="text-gray-600 text-sm">
                              {locale === 'en'
                                ? driver.description
                                : driver.descriptionEl}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              className={getCategoryColor(driver.category)}
                            >
                              {
                                t.costDrivers[
                                  driver.category as keyof typeof t.costDrivers
                                ]
                              }
                            </Badge>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-4">
                          <div>
                            <div className="text-sm font-medium text-gray-700 mb-1">
                              {t.costDrivers.impact}
                            </div>
                            <div className="text-lg font-bold text-orange-600">
                              {driver.impact}%
                            </div>
                          </div>

                          <div>
                            <div className="text-sm font-medium text-gray-700 mb-1">
                              {t.costDrivers.trend}
                            </div>
                            <div
                              className={`flex items-center gap-1 ${getTrendColor(driver.trend)}`}
                            >
                              <TrendIcon className="h-4 w-4" />
                              <span className="font-medium">
                                {
                                  t.costDrivers[
                                    driver.trend as keyof typeof t.costDrivers
                                  ]
                                }
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-end">
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4 mr-1" />
                              {t.actions.viewDetails}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Seasonal Patterns Tab */}
          <TabsContent value="seasonal" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Seasonal Cost Patterns
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {SEASONAL_PATTERNS.map(pattern => (
                    <div key={pattern.month} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold text-lg">
                          {locale === 'en' ? pattern.month : pattern.monthEl}
                        </h3>
                        <div
                          className={`text-lg font-bold ${
                            pattern.multiplier > 1.2
                              ? 'text-red-600'
                              : pattern.multiplier > 1.0
                                ? 'text-orange-600'
                                : 'text-green-600'
                          }`}
                        >
                          {(pattern.multiplier * 100).toFixed(0)}%
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 mb-3">
                        {locale === 'en'
                          ? pattern.description
                          : pattern.descriptionEl}
                      </p>

                      <div className="text-xs text-gray-500">
                        Key drivers:{' '}
                        {(locale === 'en'
                          ? pattern.drivers
                          : pattern.driversEl
                        ).join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Forecast Accuracy Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        Overall Accuracy
                      </span>
                      <span className="text-lg font-bold text-green-600">
                        {FORECAST_METRICS.forecastAccuracy}%
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        Confidence Level
                      </span>
                      <span className="text-lg font-bold text-blue-600">
                        {FORECAST_METRICS.confidenceLevel}%
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        Budget Variance
                      </span>
                      <span className="text-lg font-bold text-orange-600">
                        ±{FORECAST_METRICS.budgetVariance}%
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        Risk Assessment
                      </span>
                      <span className="text-lg font-bold text-purple-600">
                        {FORECAST_METRICS.riskScore}/10
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Cost Trend Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        Annual Growth
                      </span>
                      <span className="text-lg font-bold text-red-600">
                        +{FORECAST_METRICS.yearOverYearChange}%
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        Seasonal Peak
                      </span>
                      <span className="text-lg font-bold text-orange-600">
                        July (+42%)
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        Seasonal Low
                      </span>
                      <span className="text-lg font-bold text-green-600">
                        February (-6%)
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        Total Variation
                      </span>
                      <span className="text-lg font-bold text-purple-600">
                        {FORECAST_METRICS.seasonalVariation}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Forecast Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Model Parameters</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-medium">Seasonal Weight</label>
                        <p className="text-sm text-gray-600">
                          Impact of seasonal patterns on predictions
                        </p>
                      </div>
                      <div className="w-32">
                        <Input
                          type="number"
                          defaultValue="0.75"
                          step="0.05"
                          min="0"
                          max="1"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-medium">Trend Sensitivity</label>
                        <p className="text-sm text-gray-600">
                          Responsiveness to market trends
                        </p>
                      </div>
                      <div className="w-32">
                        <Input
                          type="number"
                          defaultValue="0.85"
                          step="0.05"
                          min="0"
                          max="1"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-medium">Risk Tolerance</label>
                        <p className="text-sm text-gray-600">
                          Acceptable forecast variance range
                        </p>
                      </div>
                      <div className="w-32">
                        <Input
                          type="number"
                          defaultValue="10"
                          step="1"
                          min="1"
                          max="25"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button variant="outline">Reset to Defaults</Button>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    Save Settings
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
