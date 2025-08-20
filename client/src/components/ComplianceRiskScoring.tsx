/**
 * Compliance Risk Scoring - Alert before potential violations
 * Proactive compliance monitoring and risk assessment system
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
  RefreshCw,
  Filter,
  Settings,
  BarChart3,
  PieChart,
  LineChart,
  Users,
  Calendar,
  Euro,
  Scale,
  Building,
  FileText,
  Mail,
  Phone,
  History,
  Plus,
  Minus,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Zap,
  Star,
  Flag,
  Info,
  BookOpen,
  Search,
  Award,
  Briefcase,
  Calculator,
  CreditCard,
  Receipt,
  Globe,
  MapPin,
  Factory,
  Hotel,
  ShoppingCart,
  Stethoscope,
  GraduationCap,
  Construction,
  Truck,
  Cpu,
  Percent,
  DollarSign
} from 'lucide-react';

interface RiskAssessment {
  id: string;
  category: string;
  categoryEl: string;
  title: string;
  titleEl: string;
  description: string;
  descriptionEl: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  violationProbability: number;
  timeToViolation: string;
  timeToViolationEl: string;
  impactSeverity: 'minor' | 'moderate' | 'major' | 'severe';
  recommendedActions: string[];
  recommendedActionsEl: string[];
  lastUpdated: string;
  trend: 'improving' | 'stable' | 'deteriorating';
}

interface ComplianceMetric {
  id: string;
  name: string;
  nameEl: string;
  value: number;
  threshold: number;
  status: 'compliant' | 'warning' | 'violation';
  unit: string;
  category: string;
  lastChecked: string;
}

interface ViolationAlert {
  id: string;
  type: 'immediate' | 'upcoming' | 'potential';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  titleEl: string;
  description: string;
  descriptionEl: string;
  dueDate: string;
  estimatedImpact: string;
  estimatedImpactEl: string;
  actions: string[];
  actionsEl: string[];
  responsible: string;
  responsibleEl: string;
}

interface ComplianceCategory {
  id: string;
  name: string;
  nameEl: string;
  overallScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  activeAlerts: number;
  lastAssessment: string;
  trend: 'improving' | 'stable' | 'deteriorating';
  subcategories: {
    name: string;
    nameEl: string;
    score: number;
    status: 'compliant' | 'warning' | 'violation';
  }[];
}

interface ComplianceRiskScoringProps {
  locale?: 'en' | 'el';
}

const RISK_ASSESSMENTS: RiskAssessment[] = [
  {
    id: 'ergani-overtime',
    category: 'ERGANI Compliance',
    categoryEl: 'Συμμόρφωση ΕΡΓΑΝΗ',
    title: 'Overtime Hour Reporting Discrepancy',
    titleEl: 'Απόκλιση Αναφοράς Ωρών Υπερωρίας',
    description: 'Potential underreporting of overtime hours to ERGANI system detected',
    descriptionEl: 'Εντοπίστηκε πιθανή υποαναφορά ωρών υπερωρίας στο σύστημα ΕΡΓΑΝΗ',
    riskScore: 78,
    riskLevel: 'high',
    violationProbability: 85,
    timeToViolation: '3-5 days',
    timeToViolationEl: '3-5 ημέρες',
    impactSeverity: 'major',
    recommendedActions: [
      'Review and correct overtime calculations',
      'Submit corrective ERGANI declarations',
      'Implement automated overtime tracking'
    ],
    recommendedActionsEl: [
      'Επανεξέταση και διόρθωση υπολογισμών υπερωριών',
      'Υποβολή διορθωτικών δηλώσεων ΕΡΓΑΝΗ',
      'Εφαρμογή αυτοματοποιημένης παρακολούθησης υπερωριών'
    ],
    lastUpdated: '2025-01-20 14:30',
    trend: 'deteriorating'
  },
  {
    id: 'tax-withholding',
    category: 'Tax Compliance',
    categoryEl: 'Φορολογική Συμμόρφωση',
    title: 'Withholding Tax Calculation Variance',
    titleEl: 'Απόκλιση Υπολογισμού Παρακρατούμενου Φόρου',
    description: 'Tax withholding calculations show variance from required rates',
    descriptionEl: 'Οι υπολογισμοί παρακρατούμενου φόρου δείχνουν απόκλιση από τα απαιτούμενα ποσοστά',
    riskScore: 65,
    riskLevel: 'medium',
    violationProbability: 72,
    timeToViolation: '1-2 weeks',
    timeToViolationEl: '1-2 εβδομάδες',
    impactSeverity: 'moderate',
    recommendedActions: [
      'Update tax calculation parameters',
      'Verify employee tax classifications',
      'Reconcile with AADE requirements'
    ],
    recommendedActionsEl: [
      'Ενημέρωση παραμέτρων υπολογισμού φόρου',
      'Επαλήθευση φορολογικών κατηγοριών εργαζομένων',
      'Συμφωνία με απαιτήσεις ΑΑΔΕ'
    ],
    lastUpdated: '2025-01-20 13:45',
    trend: 'stable'
  },
  {
    id: 'efka-contributions',
    category: 'Social Security',
    categoryEl: 'Κοινωνική Ασφάλιση',
    title: 'EFKA Contribution Rate Mismatch',
    titleEl: 'Αναντιστοιχία Ποσοστών Εισφοράς ΕΦΚΑ',
    description: 'Social security contribution rates not aligned with current EFKA requirements',
    descriptionEl: 'Τα ποσοστά εισφοράς κοινωνικής ασφάλισης δεν ευθυγραμμίζονται με τις τρέχουσες απαιτήσεις ΕΦΚΑ',
    riskScore: 82,
    riskLevel: 'high',
    violationProbability: 89,
    timeToViolation: '2-4 days',
    timeToViolationEl: '2-4 ημέρες',
    impactSeverity: 'major',
    recommendedActions: [
      'Update EFKA contribution rates immediately',
      'Recalculate affected payroll entries',
      'Submit corrective declarations to EFKA'
    ],
    recommendedActionsEl: [
      'Άμεση ενημέρωση ποσοστών εισφοράς ΕΦΚΑ',
      'Επανυπολογισμός επηρεαζόμενων καταχωρήσεων μισθοδοσίας',
      'Υποβολή διορθωτικών δηλώσεων στον ΕΦΚΑ'
    ],
    lastUpdated: '2025-01-20 15:20',
    trend: 'deteriorating'
  },
  {
    id: 'working-hours',
    category: 'Labor Law',
    categoryEl: 'Εργατικό Δίκαιο',
    title: 'Weekly Working Hours Limit Approach',
    titleEl: 'Προσέγγιση Ορίου Εβδομαδιαίων Ωρών Εργασίας',
    description: 'Several employees approaching maximum weekly working hours limit',
    descriptionEl: 'Πολλοί εργαζόμενοι πλησιάζουν το μέγιστο όριο εβδομαδιαίων ωρών εργασίας',
    riskScore: 45,
    riskLevel: 'medium',
    violationProbability: 58,
    timeToViolation: '5-7 days',
    timeToViolationEl: '5-7 ημέρες',
    impactSeverity: 'moderate',
    recommendedActions: [
      'Monitor employee schedules closely',
      'Redistribute workload if necessary',
      'Plan additional staffing for peak periods'
    ],
    recommendedActionsEl: [
      'Στενή παρακολούθηση προγραμμάτων εργαζομένων',
      'Ανακατανομή φόρτου εργασίας εάν χρειαστεί',
      'Σχεδιασμός πρόσθετου προσωπικού για περιόδους αιχμής'
    ],
    lastUpdated: '2025-01-20 12:15',
    trend: 'improving'
  },
  {
    id: 'holiday-pay',
    category: 'Payroll Compliance',
    categoryEl: 'Συμμόρφωση Μισθοδοσίας',
    title: 'Holiday Pay Calculation Accuracy',
    titleEl: 'Ακρίβεια Υπολογισμού Αμοιβής Διακοπών',
    description: 'Holiday pay calculations may not reflect latest collective bargaining agreements',
    descriptionEl: 'Οι υπολογισμοί αμοιβής διακοπών ενδέχεται να μη αντικατοπτρίζουν τις τελευταίες συλλογικές συμβάσεις',
    riskScore: 35,
    riskLevel: 'low',
    violationProbability: 42,
    timeToViolation: '2-3 weeks',
    timeToViolationEl: '2-3 εβδομάδες',
    impactSeverity: 'minor',
    recommendedActions: [
      'Review current collective agreements',
      'Update holiday pay calculation rules',
      'Verify historical holiday payments'
    ],
    recommendedActionsEl: [
      'Επανεξέταση τρεχουσών συλλογικών συμβάσεων',
      'Ενημέρωση κανόνων υπολογισμού αμοιβής διακοπών',
      'Επαλήθευση ιστορικών πληρωμών διακοπών'
    ],
    lastUpdated: '2025-01-20 11:30',
    trend: 'stable'
  }
];

const VIOLATION_ALERTS: ViolationAlert[] = [
  {
    id: 'urgent-ergani-submission',
    type: 'immediate',
    severity: 'critical',
    title: 'ERGANI Monthly Declaration Overdue',
    titleEl: 'Καθυστερημένη Μηνιαία Δήλωση ΕΡΓΑΝΗ',
    description: 'Monthly ERGANI declaration is 2 days overdue and requires immediate submission',
    descriptionEl: 'Η μηνιαία δήλωση ΕΡΓΑΝΗ έχει καθυστέρηση 2 ημερών και απαιτεί άμεση υποβολή',
    dueDate: '2025-01-18',
    estimatedImpact: '€2,500 fine potential',
    estimatedImpactEl: '€2.500 δυναμικό πρόστιμο',
    actions: [
      'Complete and submit declaration immediately',
      'Document reason for delay',
      'Implement automated reminder system'
    ],
    actionsEl: [
      'Συμπλήρωση και άμεση υποβολή δήλωσης',
      'Τεκμηρίωση αιτίας καθυστέρησης',
      'Εφαρμογή συστήματος αυτοματοποιημένων υπενθυμίσεων'
    ],
    responsible: 'HR Manager',
    responsibleEl: 'Διευθυντής ΑΠ'
  },
  {
    id: 'upcoming-tax-deadline',
    type: 'upcoming',
    severity: 'high',
    title: 'Tax Withholding Payment Due',
    titleEl: 'Πληρωμή Παρακρατούμενου Φόρου Λήγει',
    description: 'Employee tax withholding payment due in 3 days',
    descriptionEl: 'Πληρωμή παρακρατούμενου φόρου εργαζομένων λήγει σε 3 ημέρες',
    dueDate: '2025-01-23',
    estimatedImpact: '€850 late payment penalty',
    estimatedImpactEl: '€850 ποινή εκπρόθεσμης πληρωμής',
    actions: [
      'Prepare payment documentation',
      'Verify payment amount accuracy',
      'Schedule bank transfer'
    ],
    actionsEl: [
      'Προετοιμασία εγγράφων πληρωμής',
      'Επαλήθευση ακρίβειας ποσού πληρωμής',
      'Προγραμματισμός τραπεζικής μεταφοράς'
    ],
    responsible: 'Finance Team',
    responsibleEl: 'Ομάδα Οικονομικών'
  },
  {
    id: 'potential-overtime-violation',
    type: 'potential',
    severity: 'medium',
    title: 'Employee Overtime Limit Risk',
    titleEl: 'Κίνδυνος Ορίου Υπερωριών Εργαζομένου',
    description: '3 employees at risk of exceeding monthly overtime limits',
    descriptionEl: '3 εργαζόμενοι σε κίνδυνο υπέρβασης μηνιαίων ορίων υπερωριών',
    dueDate: '2025-01-31',
    estimatedImpact: 'Labor inspection risk',
    estimatedImpactEl: 'Κίνδυνος επιθεώρησης εργασίας',
    actions: [
      'Monitor remaining overtime hours',
      'Redistribute workload',
      'Consider temporary staffing'
    ],
    actionsEl: [
      'Παρακολούθηση υπόλοιπων ωρών υπερωρίας',
      'Ανακατανομή φόρτου εργασίας',
      'Εξέταση προσωρινού προσωπικού'
    ],
    responsible: 'Operations Manager',
    responsibleEl: 'Διευθυντής Λειτουργιών'
  }
];

const COMPLIANCE_CATEGORIES: ComplianceCategory[] = [
  {
    id: 'ergani-compliance',
    name: 'ERGANI Compliance',
    nameEl: 'Συμμόρφωση ΕΡΓΑΝΗ',
    overallScore: 72,
    riskLevel: 'medium',
    activeAlerts: 3,
    lastAssessment: '2025-01-20 15:00',
    trend: 'deteriorating',
    subcategories: [
      { name: 'Monthly Declarations', nameEl: 'Μηνιαίες Δηλώσεις', score: 65, status: 'warning' },
      { name: 'Employee Registrations', nameEl: 'Εγγραφές Εργαζομένων', score: 85, status: 'compliant' },
      { name: 'Working Time Reporting', nameEl: 'Αναφορά Ωρών Εργασίας', score: 68, status: 'warning' }
    ]
  },
  {
    id: 'tax-compliance',
    name: 'Tax Compliance',
    nameEl: 'Φορολογική Συμμόρφωση',
    overallScore: 88,
    riskLevel: 'low',
    activeAlerts: 1,
    lastAssessment: '2025-01-20 14:30',
    trend: 'stable',
    subcategories: [
      { name: 'Withholding Tax', nameEl: 'Παρακρατούμενος Φόρος', score: 92, status: 'compliant' },
      { name: 'VAT Compliance', nameEl: 'Συμμόρφωση ΦΠΑ', score: 89, status: 'compliant' },
      { name: 'Corporate Tax', nameEl: 'Εταιρικός Φόρος', score: 83, status: 'compliant' }
    ]
  },
  {
    id: 'social-security',
    name: 'Social Security',
    nameEl: 'Κοινωνική Ασφάλιση',
    overallScore: 65,
    riskLevel: 'high',
    activeAlerts: 4,
    lastAssessment: '2025-01-20 13:15',
    trend: 'improving',
    subcategories: [
      { name: 'EFKA Contributions', nameEl: 'Εισφορές ΕΦΚΑ', score: 58, status: 'violation' },
      { name: 'Insurance Classifications', nameEl: 'Ασφαλιστικές Κατηγορίες', score: 75, status: 'warning' },
      { name: 'Benefits Administration', nameEl: 'Διαχείριση Παροχών', score: 72, status: 'warning' }
    ]
  },
  {
    id: 'labor-law',
    name: 'Labor Law',
    nameEl: 'Εργατικό Δίκαιο',
    overallScore: 91,
    riskLevel: 'low',
    activeAlerts: 0,
    lastAssessment: '2025-01-20 12:45',
    trend: 'improving',
    subcategories: [
      { name: 'Working Hours', nameEl: 'Ώρες Εργασίας', score: 94, status: 'compliant' },
      { name: 'Rest Periods', nameEl: 'Περίοδοι Ανάπαυσης', score: 89, status: 'compliant' },
      { name: 'Collective Agreements', nameEl: 'Συλλογικές Συμβάσεις', score: 90, status: 'compliant' }
    ]
  },
  {
    id: 'payroll-compliance',
    name: 'Payroll Compliance',
    nameEl: 'Συμμόρφωση Μισθοδοσίας',
    overallScore: 84,
    riskLevel: 'low',
    activeAlerts: 2,
    lastAssessment: '2025-01-20 11:30',
    trend: 'stable',
    subcategories: [
      { name: 'Salary Calculations', nameEl: 'Υπολογισμοί Μισθών', score: 87, status: 'compliant' },
      { name: 'Bonus Payments', nameEl: 'Πληρωμές Μπόνους', score: 82, status: 'compliant' },
      { name: 'Holiday Pay', nameEl: 'Αμοιβή Διακοπών', score: 83, status: 'compliant' }
    ]
  }
];

const COMPLIANCE_METRICS: ComplianceMetric[] = [
  {
    id: 'overall-compliance-score',
    name: 'Overall Compliance Score',
    nameEl: 'Συνολικός Βαθμός Συμμόρφωσης',
    value: 80,
    threshold: 85,
    status: 'warning',
    unit: '%',
    category: 'General',
    lastChecked: '2025-01-20 15:30'
  },
  {
    id: 'active-violations',
    name: 'Active Violations',
    nameEl: 'Ενεργές Παραβάσεις',
    value: 2,
    threshold: 0,
    status: 'violation',
    unit: 'count',
    category: 'Violations',
    lastChecked: '2025-01-20 15:30'
  },
  {
    id: 'pending-declarations',
    name: 'Pending Declarations',
    nameEl: 'Εκκρεμείς Δηλώσεις',
    value: 3,
    threshold: 5,
    status: 'compliant',
    unit: 'count',
    category: 'Declarations',
    lastChecked: '2025-01-20 15:00'
  },
  {
    id: 'overdue-payments',
    name: 'Overdue Payments',
    nameEl: 'Ληξιπρόθεσμες Πληρωμές',
    value: 1,
    threshold: 0,
    status: 'violation',
    unit: 'count',
    category: 'Payments',
    lastChecked: '2025-01-20 14:45'
  }
];

export default function ComplianceRiskScoring({ locale = 'en' }: ComplianceRiskScoringProps) {
  const [selectedTab, setSelectedTab] = useState('dashboard');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<string>('all');
  const [alertsFilter, setAlertsFilter] = useState<string>('all');

  const translations = {
    en: {
      title: 'Compliance Risk Scoring',
      subtitle: 'Alert Before Potential Violations',
      tabs: {
        dashboard: 'Dashboard',
        assessments: 'Risk Assessments',
        alerts: 'Alerts',
        categories: 'Categories',
        metrics: 'Metrics',
        settings: 'Settings'
      },
      dashboard: {
        overallScore: 'Overall Compliance Score',
        riskLevel: 'Current Risk Level',
        activeAlerts: 'Active Alerts',
        pendingActions: 'Pending Actions',
        trendAnalysis: 'Trend Analysis',
        recentActivity: 'Recent Activity'
      },
      riskLevels: {
        low: 'Low Risk',
        medium: 'Medium Risk',
        high: 'High Risk',
        critical: 'Critical Risk'
      },
      alertTypes: {
        immediate: 'Immediate Action Required',
        upcoming: 'Upcoming Deadline',
        potential: 'Potential Issue'
      },
      severity: {
        low: 'Low',
        medium: 'Medium',
        high: 'High',
        critical: 'Critical'
      },
      impact: {
        minor: 'Minor Impact',
        moderate: 'Moderate Impact',
        major: 'Major Impact',
        severe: 'Severe Impact'
      },
      status: {
        compliant: 'Compliant',
        warning: 'Warning',
        violation: 'Violation'
      },
      trend: {
        improving: 'Improving',
        stable: 'Stable',
        deteriorating: 'Deteriorating'
      },
      actions: {
        viewDetails: 'View Details',
        takeAction: 'Take Action',
        markResolved: 'Mark Resolved',
        downloadReport: 'Download Report',
        exportData: 'Export Data',
        refreshData: 'Refresh Data',
        configure: 'Configure',
        acknowledge: 'Acknowledge'
      },
      filters: {
        category: 'Filter by Category',
        riskLevel: 'Filter by Risk Level',
        alertType: 'Filter by Alert Type',
        all: 'All'
      }
    },
    el: {
      title: 'Βαθμολόγηση Κινδύνου Συμμόρφωσης',
      subtitle: 'Ειδοποίηση Πριν από Πιθανές Παραβάσεις',
      tabs: {
        dashboard: 'Πίνακας Ελέγχου',
        assessments: 'Αξιολογήσεις Κινδύνου',
        alerts: 'Ειδοποιήσεις',
        categories: 'Κατηγορίες',
        metrics: 'Μετρικές',
        settings: 'Ρυθμίσεις'
      },
      dashboard: {
        overallScore: 'Συνολικός Βαθμός Συμμόρφωσης',
        riskLevel: 'Τρέχον Επίπεδο Κινδύνου',
        activeAlerts: 'Ενεργές Ειδοποιήσεις',
        pendingActions: 'Εκκρεμείς Ενέργειες',
        trendAnalysis: 'Ανάλυση Τάσεων',
        recentActivity: 'Πρόσφατη Δραστηριότητα'
      },
      riskLevels: {
        low: 'Χαμηλός Κίνδυνος',
        medium: 'Μέτριος Κίνδυνος',
        high: 'Υψηλός Κίνδυνος',
        critical: 'Κρίσιμος Κίνδυνος'
      },
      alertTypes: {
        immediate: 'Απαιτείται Άμεση Ενέργεια',
        upcoming: 'Επερχόμενη Προθεσμία',
        potential: 'Πιθανό Ζήτημα'
      },
      severity: {
        low: 'Χαμηλή',
        medium: 'Μέτρια',
        high: 'Υψηλή',
        critical: 'Κρίσιμη'
      },
      impact: {
        minor: 'Μικρός Αντίκτυπος',
        moderate: 'Μέτριος Αντίκτυπος',
        major: 'Σημαντικός Αντίκτυπος',
        severe: 'Σοβαρός Αντίκτυπος'
      },
      status: {
        compliant: 'Συμμορφούμενο',
        warning: 'Προειδοποίηση',
        violation: 'Παράβαση'
      },
      trend: {
        improving: 'Βελτιώνεται',
        stable: 'Σταθερό',
        deteriorating: 'Επιδεινώνεται'
      },
      actions: {
        viewDetails: 'Προβολή Λεπτομερειών',
        takeAction: 'Λήψη Μέτρων',
        markResolved: 'Σήμανση ως Επιλυμένο',
        downloadReport: 'Λήψη Αναφοράς',
        exportData: 'Εξαγωγή Δεδομένων',
        refreshData: 'Ανανέωση Δεδομένων',
        configure: 'Διαμόρφωση',
        acknowledge: 'Αναγνώριση'
      },
      filters: {
        category: 'Φιλτράρισμα κατά Κατηγορία',
        riskLevel: 'Φιλτράρισμα κατά Επίπεδο Κινδύνου',
        alertType: 'Φιλτράρισμα κατά Τύπο Ειδοποίησης',
        all: 'Όλα'
      }
    }
  };

  const t = translations[locale];

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'violation': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return ArrowUp;
      case 'deteriorating': return ArrowDown;
      case 'stable': return ArrowRight;
      default: return ArrowRight;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return 'text-green-600';
      case 'deteriorating': return 'text-red-600';
      case 'stable': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case 'immediate': return AlertTriangle;
      case 'upcoming': return Clock;
      case 'potential': return Eye;
      default: return Bell;
    }
  };

  const filteredAssessments = RISK_ASSESSMENTS.filter(assessment => {
    if (selectedCategory !== 'all' && assessment.category !== selectedCategory) return false;
    if (selectedRiskLevel !== 'all' && assessment.riskLevel !== selectedRiskLevel) return false;
    return true;
  });

  const filteredAlerts = VIOLATION_ALERTS.filter(alert => {
    if (alertsFilter !== 'all' && alert.type !== alertsFilter) return false;
    return true;
  });

  const overallScore = Math.round(COMPLIANCE_CATEGORIES.reduce((sum, cat) => sum + cat.overallScore, 0) / COMPLIANCE_CATEGORIES.length);
  const totalAlerts = VIOLATION_ALERTS.length;
  const criticalAlerts = VIOLATION_ALERTS.filter(alert => alert.severity === 'critical').length;
  const highRiskAssessments = RISK_ASSESSMENTS.filter(assessment => assessment.riskLevel === 'high' || assessment.riskLevel === 'critical').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Shield className="h-8 w-8 text-red-600" />
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
              <Button className="bg-red-600 hover:bg-red-700">
                <Download className="h-4 w-4 mr-2" />
                {t.actions.downloadReport}
              </Button>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <div className="text-center">
                <div className="text-3xl font-bold">{overallScore}%</div>
                <div className="text-xs text-blue-100">{t.dashboard.overallScore}</div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
              <div className="text-center">
                <div className="text-3xl font-bold">{totalAlerts}</div>
                <div className="text-xs text-orange-100">{t.dashboard.activeAlerts}</div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-r from-red-500 to-red-600 text-white">
              <div className="text-center">
                <div className="text-3xl font-bold">{criticalAlerts}</div>
                <div className="text-xs text-red-100">Critical Alerts</div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <div className="text-center">
                <div className="text-3xl font-bold">{highRiskAssessments}</div>
                <div className="text-xs text-purple-100">High Risk Issues</div>
              </div>
            </Card>
          </div>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="dashboard">{t.tabs.dashboard}</TabsTrigger>
            <TabsTrigger value="assessments">{t.tabs.assessments}</TabsTrigger>
            <TabsTrigger value="alerts">{t.tabs.alerts}</TabsTrigger>
            <TabsTrigger value="categories">{t.tabs.categories}</TabsTrigger>
            <TabsTrigger value="metrics">{t.tabs.metrics}</TabsTrigger>
            <TabsTrigger value="settings">{t.tabs.settings}</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Risk Overview */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-red-600" />
                      Compliance Risk Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {COMPLIANCE_CATEGORIES.slice(0, 4).map((category) => {
                        const TrendIcon = getTrendIcon(category.trend);
                        
                        return (
                          <div key={category.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <div className="font-medium mb-1">
                                {locale === 'en' ? category.name : category.nameEl}
                              </div>
                              <div className="text-sm text-gray-600">
                                {category.activeAlerts} active alerts • Last checked: {new Date(category.lastAssessment).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <div className="text-lg font-bold">{category.overallScore}%</div>
                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                  <TrendIcon className={`h-3 w-3 ${getTrendColor(category.trend)}`} />
                                  {t.trend[category.trend as keyof typeof t.trend]}
                                </div>
                              </div>
                              <Badge className={getRiskColor(category.riskLevel)}>
                                {t.riskLevels[category.riskLevel as keyof typeof t.riskLevels]}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Active Alerts Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-orange-600" />
                    Active Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {VIOLATION_ALERTS.slice(0, 3).map((alert) => {
                      const AlertIcon = getAlertTypeIcon(alert.type);
                      
                      return (
                        <div key={alert.id} className="p-3 border rounded-lg">
                          <div className="flex items-start gap-3">
                            <div className={`p-1 rounded ${getSeverityColor(alert.severity)}`}>
                              <AlertIcon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">
                                {locale === 'en' ? alert.title : alert.titleEl}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Due: {new Date(alert.dueDate).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    <Button size="sm" variant="outline" className="w-full mt-3">
                      <Eye className="h-4 w-4 mr-2" />
                      View All Alerts
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats */}
            <div className="grid md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">15</div>
                    <div className="text-sm text-gray-600">Compliant Areas</div>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <AlertTriangle className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-600">8</div>
                    <div className="text-sm text-gray-600">Warning Areas</div>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <XCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">2</div>
                    <div className="text-sm text-gray-600">Violation Areas</div>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Clock className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">5</div>
                    <div className="text-sm text-gray-600">Pending Reviews</div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Risk Assessments Tab */}
          <TabsContent value="assessments" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Assessment Filters
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
                      <SelectItem value="ERGANI Compliance">ERGANI Compliance</SelectItem>
                      <SelectItem value="Tax Compliance">Tax Compliance</SelectItem>
                      <SelectItem value="Social Security">Social Security</SelectItem>
                      <SelectItem value="Labor Law">Labor Law</SelectItem>
                      <SelectItem value="Payroll Compliance">Payroll Compliance</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={selectedRiskLevel} onValueChange={setSelectedRiskLevel}>
                    <SelectTrigger>
                      <SelectValue placeholder={t.filters.riskLevel} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t.filters.all}</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button variant="outline" onClick={() => {
                    setSelectedCategory('all');
                    setSelectedRiskLevel('all');
                  }}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reset Filters
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Risk Assessments */}
            <div className="space-y-4">
              {filteredAssessments.map((assessment) => {
                const TrendIcon = getTrendIcon(assessment.trend);
                
                return (
                  <Card key={assessment.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">
                              {locale === 'en' ? assessment.category : assessment.categoryEl}
                            </Badge>
                            <Badge className={getRiskColor(assessment.riskLevel)}>
                              {t.riskLevels[assessment.riskLevel as keyof typeof t.riskLevels]}
                            </Badge>
                          </div>
                          <h3 className="font-semibold text-lg mb-2">
                            {locale === 'en' ? assessment.title : assessment.titleEl}
                          </h3>
                          <p className="text-gray-600 text-sm mb-3">
                            {locale === 'en' ? assessment.description : assessment.descriptionEl}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-red-600 mb-1">
                            {assessment.riskScore}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <TrendIcon className={`h-3 w-3 ${getTrendColor(assessment.trend)}`} />
                            {t.trend[assessment.trend as keyof typeof t.trend]}
                          </div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="text-sm font-medium text-gray-700 mb-2">Risk Score</div>
                        <Progress value={assessment.riskScore} className="h-2" />
                      </div>

                      <div className="grid md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <div className="text-xs font-medium text-gray-700">Violation Probability</div>
                          <div className="text-sm font-bold text-orange-600">{assessment.violationProbability}%</div>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-gray-700">Time to Violation</div>
                          <div className="text-sm font-bold text-red-600">
                            {locale === 'en' ? assessment.timeToViolation : assessment.timeToViolationEl}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-gray-700">Impact Severity</div>
                          <Badge className={getSeverityColor(assessment.impactSeverity)}>
                            {t.impact[assessment.impactSeverity as keyof typeof t.impact]}
                          </Badge>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-gray-700">Last Updated</div>
                          <div className="text-sm text-gray-600">
                            {new Date(assessment.lastUpdated).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="text-sm font-medium text-gray-700 mb-2">Recommended Actions</div>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {(locale === 'en' ? assessment.recommendedActions : assessment.recommendedActionsEl).map((action, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <ArrowRight className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-500">
                          Assessment ID: {assessment.id}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-1" />
                            {t.actions.viewDetails}
                          </Button>
                          <Button size="sm" className="bg-red-600 hover:bg-red-700">
                            <Settings className="h-4 w-4 mr-1" />
                            {t.actions.takeAction}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Violation Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Select value={alertsFilter} onValueChange={setAlertsFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder={t.filters.alertType} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t.filters.all}</SelectItem>
                      <SelectItem value="immediate">Immediate</SelectItem>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="potential">Potential</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  {filteredAlerts.map((alert) => {
                    const AlertIcon = getAlertTypeIcon(alert.type);
                    
                    return (
                      <div key={alert.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                        <div className="flex items-start gap-4">
                          <div className={`p-2 rounded-lg ${getSeverityColor(alert.severity)}`}>
                            <AlertIcon className="h-5 w-5" />
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={getSeverityColor(alert.severity)}>
                                {t.severity[alert.severity as keyof typeof t.severity]}
                              </Badge>
                              <Badge variant="outline">
                                {t.alertTypes[alert.type as keyof typeof t.alertTypes]}
                              </Badge>
                            </div>
                            
                            <h3 className="font-semibold mb-2">
                              {locale === 'en' ? alert.title : alert.titleEl}
                            </h3>
                            
                            <p className="text-gray-600 text-sm mb-3">
                              {locale === 'en' ? alert.description : alert.descriptionEl}
                            </p>
                            
                            <div className="grid md:grid-cols-3 gap-4 mb-3">
                              <div>
                                <div className="text-xs font-medium text-gray-700">Due Date</div>
                                <div className="text-sm font-bold text-red-600">
                                  {new Date(alert.dueDate).toLocaleDateString()}
                                </div>
                              </div>
                              
                              <div>
                                <div className="text-xs font-medium text-gray-700">Estimated Impact</div>
                                <div className="text-sm text-gray-600">
                                  {locale === 'en' ? alert.estimatedImpact : alert.estimatedImpactEl}
                                </div>
                              </div>
                              
                              <div>
                                <div className="text-xs font-medium text-gray-700">Responsible</div>
                                <div className="text-sm text-gray-600">
                                  {locale === 'en' ? alert.responsible : alert.responsibleEl}
                                </div>
                              </div>
                            </div>
                            
                            <div className="mb-4">
                              <div className="text-sm font-medium text-gray-700 mb-2">Required Actions</div>
                              <ul className="text-sm text-gray-600 space-y-1">
                                {(locale === 'en' ? alert.actions : alert.actionsEl).map((action, index) => (
                                  <li key={index} className="flex items-start gap-2">
                                    <ArrowRight className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
                                    {action}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t">
                          <Button size="sm" variant="outline">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            {t.actions.acknowledge}
                          </Button>
                          <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
                            <Settings className="h-4 w-4 mr-1" />
                            {t.actions.takeAction}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Compliance Categories
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {COMPLIANCE_CATEGORIES.map((category) => {
                    const TrendIcon = getTrendIcon(category.trend);
                    
                    return (
                      <div key={category.id} className="p-6 border rounded-lg">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-semibold text-lg mb-2">
                              {locale === 'en' ? category.name : category.nameEl}
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span>{category.activeAlerts} active alerts</span>
                              <span>Last assessed: {new Date(category.lastAssessment).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold mb-1">{category.overallScore}%</div>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={getRiskColor(category.riskLevel)}>
                                {t.riskLevels[category.riskLevel as keyof typeof t.riskLevels]}
                              </Badge>
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <TrendIcon className={`h-3 w-3 ${getTrendColor(category.trend)}`} />
                              {t.trend[category.trend as keyof typeof t.trend]}
                            </div>
                          </div>
                        </div>
                        
                        <div className="mb-4">
                          <Progress value={category.overallScore} className="h-2" />
                        </div>
                        
                        <div className="grid md:grid-cols-3 gap-4">
                          {category.subcategories.map((sub, index) => (
                            <div key={index} className="text-center p-3 border rounded">
                              <div className="text-lg font-bold mb-1">{sub.score}%</div>
                              <div className="text-sm text-gray-600 mb-2">
                                {locale === 'en' ? sub.name : sub.nameEl}
                              </div>
                              <Badge className={getStatusColor(sub.status)}>
                                {t.status[sub.status as keyof typeof t.status]}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Metrics Tab */}
          <TabsContent value="metrics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Compliance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {COMPLIANCE_METRICS.map((metric) => (
                    <div key={metric.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium">
                          {locale === 'en' ? metric.name : metric.nameEl}
                        </h3>
                        <Badge className={getStatusColor(metric.status)}>
                          {t.status[metric.status as keyof typeof t.status]}
                        </Badge>
                      </div>
                      
                      <div className="text-2xl font-bold mb-2">
                        {metric.value}{metric.unit}
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-3">
                        Threshold: {metric.threshold}{metric.unit}
                      </div>
                      
                      <div className="text-xs text-gray-500">
                        Last checked: {new Date(metric.lastChecked).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Risk Assessment Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Alert Thresholds</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-medium">Critical Risk Threshold</label>
                        <p className="text-sm text-gray-600">Risk scores above this value trigger critical alerts</p>
                      </div>
                      <div className="w-32">
                        <Input type="number" defaultValue="80" min="0" max="100" />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-medium">High Risk Threshold</label>
                        <p className="text-sm text-gray-600">Risk scores above this value trigger high risk alerts</p>
                      </div>
                      <div className="w-32">
                        <Input type="number" defaultValue="60" min="0" max="100" />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-medium">Medium Risk Threshold</label>
                        <p className="text-sm text-gray-600">Risk scores above this value trigger medium risk alerts</p>
                      </div>
                      <div className="w-32">
                        <Input type="number" defaultValue="40" min="0" max="100" />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">Assessment Frequency</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-medium">Automatic Risk Assessment</label>
                        <p className="text-sm text-gray-600">How often to run automated risk assessments</p>
                      </div>
                      <Select defaultValue="daily">
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hourly">Hourly</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button variant="outline">Reset to Defaults</Button>
                  <Button className="bg-red-600 hover:bg-red-700">Save Settings</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}