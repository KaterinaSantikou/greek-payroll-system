/**
 * Churn Prevention - Proactive Outreach to At-Risk Accounts
 * Comprehensive system for identifying and retaining at-risk customers
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  AlertTriangle,
  TrendingDown,
  Users,
  Mail,
  Phone,
  Calendar,
  Target,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Activity,
  MessageSquare,
  Send,
  Eye,
  Edit,
  Plus,
  Filter,
  Download,
  BarChart3,
  PieChart,
  LineChart,
  AlertCircle,
  Shield,
  Zap,
  Heart,
  Star,
  ThumbsUp,
  ArrowUp,
  ArrowDown,
  Minus,
  Bell,
  PlayCircle,
  Pause,
  StopCircle,
  RefreshCw
} from 'lucide-react';

interface AtRiskAccount {
  id: string;
  companyName: string;
  companyNameEl: string;
  contactPerson: string;
  email: string;
  phone: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  monthlyRevenue: number;
  lastActivity: string;
  riskFactors: string[];
  riskFactorsEl: string[];
  segment: string;
  industry: string;
  employeeCount: number;
  contractEndDate: string;
  lastContactDate: string;
  outreachStatus: 'pending' | 'in-progress' | 'completed' | 'escalated';
  assignedManager: string;
  churnProbability: number;
  healthScore: number;
  supportTickets: number;
  paymentDelays: number;
  featureAdoption: number;
  engagementTrend: 'up' | 'down' | 'stable';
}

interface OutreachCampaign {
  id: string;
  name: string;
  nameEl: string;
  type: 'email' | 'call' | 'meeting' | 'survey' | 'offer';
  status: 'active' | 'paused' | 'completed' | 'draft';
  targetSegment: string;
  riskLevelTarget: string[];
  template: string;
  templateEl: string;
  sentCount: number;
  openRate: number;
  responseRate: number;
  conversionRate: number;
  createdDate: string;
  lastSent: string;
  scheduledDate?: string;
}

interface RetentionMetrics {
  totalAtRisk: number;
  criticalAccounts: number;
  monthlyChurnRate: number;
  retentionRate: number;
  averageRiskScore: number;
  successfulOutreach: number;
  revenueAtRisk: number;
  preventedChurn: number;
}

interface ChurnPreventionProps {
  locale?: 'en' | 'el';
}

const AT_RISK_ACCOUNTS: AtRiskAccount[] = [
  {
    id: 'acc-001',
    companyName: 'Aegean Hotels Group',
    companyNameEl: 'Όμιλος Ξενοδοχείων Αιγαίου',
    contactPerson: 'Maria Papadopoulos',
    email: 'maria.p@aegeanhotels.gr',
    phone: '+30 210 123 4567',
    riskScore: 85,
    riskLevel: 'critical',
    monthlyRevenue: 8500,
    lastActivity: '2025-01-15',
    riskFactors: [
      'Decreased login frequency (50% drop)',
      'Support ticket volume increased',
      'Payment delay (15 days)',
      'Key user left company',
      'Exploring competitor solutions'
    ],
    riskFactorsEl: [
      'Μειωμένη συχνότητα σύνδεσης (πτώση 50%)',
      'Αυξημένος όγκος tickets υποστήριξης',
      'Καθυστέρηση πληρωμής (15 ημέρες)',
      'Βασικός χρήστης άφησε την εταιρεία',
      'Εξερεύνηση λύσεων ανταγωνιστών'
    ],
    segment: 'Enterprise',
    industry: 'Hospitality',
    employeeCount: 450,
    contractEndDate: '2025-06-30',
    lastContactDate: '2025-01-10',
    outreachStatus: 'pending',
    assignedManager: 'Nikos Stavros',
    churnProbability: 78,
    healthScore: 32,
    supportTickets: 12,
    paymentDelays: 2,
    featureAdoption: 45,
    engagementTrend: 'down'
  },
  {
    id: 'acc-002',
    companyName: 'Thessaloniki Retail Chain',
    companyNameEl: 'Αλυσίδα Λιανικής Θεσσαλονίκης',
    contactPerson: 'Dimitris Kostas',
    email: 'dk@thessretail.gr',
    phone: '+30 231 098 7654',
    riskScore: 72,
    riskLevel: 'high',
    monthlyRevenue: 3200,
    lastActivity: '2025-01-18',
    riskFactors: [
      'Usage declined 30% last month',
      'Missed training sessions',
      'Late payment last quarter',
      'Limited feature adoption',
      'Competitor outreach confirmed'
    ],
    riskFactorsEl: [
      'Χρήση μειώθηκε 30% τον τελευταίο μήνα',
      'Χάθηκαν συνεδρίες εκπαίδευσης',
      'Καθυστερημένη πληρωμή το τελευταίο τρίμηνο',
      'Περιορισμένη υιοθέτηση χαρακτηριστικών',
      'Επαφή ανταγωνιστή επιβεβαιώθηκε'
    ],
    segment: 'Mid-Market',
    industry: 'Retail',
    employeeCount: 85,
    contractEndDate: '2025-12-15',
    lastContactDate: '2024-12-20',
    outreachStatus: 'in-progress',
    assignedManager: 'Sofia Dimitriou',
    churnProbability: 65,
    healthScore: 48,
    supportTickets: 8,
    paymentDelays: 1,
    featureAdoption: 52,
    engagementTrend: 'down'
  },
  {
    id: 'acc-003',
    companyName: 'Athens Manufacturing Ltd',
    companyNameEl: 'Αθηναϊκή Βιομηχανία ΑΕ',
    contactPerson: 'Yannis Petrou',
    email: 'y.petrou@athensmanuf.gr',
    phone: '+30 210 555 1234',
    riskScore: 58,
    riskLevel: 'medium',
    monthlyRevenue: 5400,
    lastActivity: '2025-01-20',
    riskFactors: [
      'Slower adoption of new features',
      'Reduced admin activity',
      'Budget constraints mentioned',
      'Team turnover in HR department'
    ],
    riskFactorsEl: [
      'Πιο αργή υιοθέτηση νέων χαρακτηριστικών',
      'Μειωμένη δραστηριότητα διαχειριστή',
      'Αναφέρθηκαν περιορισμοί προϋπολογισμού',
      'Αλλαγή προσωπικού στο τμήμα HR'
    ],
    segment: 'Mid-Market',
    industry: 'Manufacturing',
    employeeCount: 120,
    contractEndDate: '2025-09-30',
    lastContactDate: '2025-01-05',
    outreachStatus: 'pending',
    assignedManager: 'Elena Vargas',
    churnProbability: 45,
    healthScore: 62,
    supportTickets: 4,
    paymentDelays: 0,
    featureAdoption: 68,
    engagementTrend: 'stable'
  },
  {
    id: 'acc-004',
    companyName: 'Corfu Tourism Services',
    companyNameEl: 'Τουριστικές Υπηρεσίες Κέρκυρας',
    contactPerson: 'Anna Nikolaidou',
    email: 'anna@corfutourism.gr',
    phone: '+30 266 123 4567',
    riskScore: 68,
    riskLevel: 'high',
    monthlyRevenue: 2800,
    lastActivity: '2025-01-12',
    riskFactors: [
      'Seasonal usage pattern irregularities',
      'Support response satisfaction low',
      'Integration issues unresolved',
      'Key stakeholder left company',
      'Price sensitivity expressed'
    ],
    riskFactorsEl: [
      'Ανωμαλίες στο εποχιακό πρότυπο χρήσης',
      'Χαμηλή ικανοποίηση από τις απαντήσεις υποστήριξης',
      'Άλυτα προβλήματα ενσωμάτωσης',
      'Βασικός stakeholder άφησε την εταιρεία',
      'Εκφράστηκε ευαισθησία στην τιμή'
    ],
    segment: 'Small Business',
    industry: 'Tourism',
    employeeCount: 35,
    contractEndDate: '2025-08-15',
    lastContactDate: '2024-12-28',
    outreachStatus: 'escalated',
    assignedManager: 'Kostas Manolis',
    churnProbability: 62,
    healthScore: 41,
    supportTickets: 9,
    paymentDelays: 1,
    featureAdoption: 41,
    engagementTrend: 'down'
  }
];

const OUTREACH_CAMPAIGNS: OutreachCampaign[] = [
  {
    id: 'camp-001',
    name: 'Critical Account Recovery',
    nameEl: 'Αποκατάσταση Κρίσιμων Λογαριασμών',
    type: 'meeting',
    status: 'active',
    targetSegment: 'Enterprise',
    riskLevelTarget: ['critical', 'high'],
    template: 'Personal meeting with executive team to address concerns and provide custom solutions.',
    templateEl: 'Προσωπική συνάντηση με τη διοικητική ομάδα για την αντιμετώπιση ανησυχιών και παροχή προσαρμοσμένων λύσεων.',
    sentCount: 23,
    openRate: 95,
    responseRate: 78,
    conversionRate: 65,
    createdDate: '2025-01-01',
    lastSent: '2025-01-20',
    scheduledDate: '2025-01-25'
  },
  {
    id: 'camp-002',
    name: 'Feature Adoption Boost',
    nameEl: 'Ενίσχυση Υιοθέτησης Χαρακτηριστικών',
    type: 'email',
    status: 'active',
    targetSegment: 'Mid-Market',
    riskLevelTarget: ['medium', 'high'],
    template: 'Personalized training invitation and feature showcase to increase platform value.',
    templateEl: 'Εξατομικευμένη πρόσκληση εκπαίδευσης και επίδειξη χαρακτηριστικών για αύξηση της αξίας της πλατφόρμας.',
    sentCount: 156,
    openRate: 72,
    responseRate: 34,
    conversionRate: 28,
    createdDate: '2025-01-08',
    lastSent: '2025-01-19'
  },
  {
    id: 'camp-003',
    name: 'Success Check-in Program',
    nameEl: 'Πρόγραμμα Ελέγχου Επιτυχίας',
    type: 'call',
    status: 'active',
    targetSegment: 'All',
    riskLevelTarget: ['medium'],
    template: 'Proactive success check-in calls to ensure customer satisfaction and identify improvement areas.',
    templateEl: 'Προληπτικές κλήσεις ελέγχου επιτυχίας για διασφάλιση ικανοποίησης πελατών και εντοπισμό περιοχών βελτίωσης.',
    sentCount: 89,
    openRate: 85,
    responseRate: 67,
    conversionRate: 54,
    createdDate: '2025-01-10',
    lastSent: '2025-01-18'
  },
  {
    id: 'camp-004',
    name: 'Value Realization Workshop',
    nameEl: 'Εργαστήριο Πραγματοποίησης Αξίας',
    type: 'meeting',
    status: 'draft',
    targetSegment: 'Enterprise',
    riskLevelTarget: ['high', 'critical'],
    template: 'Exclusive workshop to demonstrate ROI and advanced features tailored to their specific needs.',
    templateEl: 'Αποκλειστικό εργαστήριο για επίδειξη ROI και προχωρημένων χαρακτηριστικών προσαρμοσμένων στις ειδικές τους ανάγκες.',
    sentCount: 0,
    openRate: 0,
    responseRate: 0,
    conversionRate: 0,
    createdDate: '2025-01-15',
    lastSent: '',
    scheduledDate: '2025-01-30'
  }
];

const RETENTION_METRICS: RetentionMetrics = {
  totalAtRisk: 47,
  criticalAccounts: 12,
  monthlyChurnRate: 3.2,
  retentionRate: 94.5,
  averageRiskScore: 64,
  successfulOutreach: 78,
  revenueAtRisk: 156000,
  preventedChurn: 23
};

export default function ChurnPrevention({ locale = 'en' }: ChurnPreventionProps) {
  const [selectedTab, setSelectedTab] = useState('dashboard');
  const [accounts, setAccounts] = useState(AT_RISK_ACCOUNTS);
  const [campaigns, setCampaigns] = useState(OUTREACH_CAMPAIGNS);
  const [selectedAccount, setSelectedAccount] = useState<AtRiskAccount | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<OutreachCampaign | null>(null);
  const [filterRiskLevel, setFilterRiskLevel] = useState<string>('all');
  const [filterSegment, setFilterSegment] = useState<string>('all');
  const [newOutreachMessage, setNewOutreachMessage] = useState('');

  const translations = {
    en: {
      title: 'Churn Prevention',
      subtitle: 'Proactive Outreach to At-Risk Accounts',
      tabs: {
        dashboard: 'Dashboard',
        accounts: 'At-Risk Accounts',
        outreach: 'Outreach Campaigns',
        analytics: 'Analytics',
        settings: 'Settings'
      },
      metrics: {
        totalAtRisk: 'Total At-Risk',
        criticalAccounts: 'Critical Accounts',
        monthlyChurnRate: 'Monthly Churn Rate',
        retentionRate: 'Retention Rate',
        averageRiskScore: 'Avg Risk Score',
        successfulOutreach: 'Successful Outreach',
        revenueAtRisk: 'Revenue at Risk',
        preventedChurn: 'Prevented Churn'
      },
      riskLevels: {
        low: 'Low Risk',
        medium: 'Medium Risk',
        high: 'High Risk',
        critical: 'Critical Risk'
      },
      outreachStatus: {
        pending: 'Pending',
        'in-progress': 'In Progress',
        completed: 'Completed',
        escalated: 'Escalated'
      },
      campaignTypes: {
        email: 'Email',
        call: 'Phone Call',
        meeting: 'Meeting',
        survey: 'Survey',
        offer: 'Special Offer'
      },
      campaignStatus: {
        active: 'Active',
        paused: 'Paused',
        completed: 'Completed',
        draft: 'Draft'
      },
      actions: {
        contactNow: 'Contact Now',
        scheduleMeeting: 'Schedule Meeting',
        sendEmail: 'Send Email',
        viewDetails: 'View Details',
        editCampaign: 'Edit Campaign',
        startCampaign: 'Start Campaign',
        pauseCampaign: 'Pause Campaign',
        viewReports: 'View Reports',
        exportData: 'Export Data'
      },
      filters: {
        all: 'All',
        riskLevel: 'Risk Level',
        segment: 'Segment',
        industry: 'Industry',
        manager: 'Account Manager'
      },
      accountDetails: {
        riskFactors: 'Risk Factors',
        contactInfo: 'Contact Information',
        accountHealth: 'Account Health',
        recentActivity: 'Recent Activity',
        outreachHistory: 'Outreach History'
      },
      quickActions: {
        title: 'Quick Actions',
        escalateToManager: 'Escalate to Manager',
        scheduleFollowUp: 'Schedule Follow-up',
        updateRiskScore: 'Update Risk Score',
        addNote: 'Add Note'
      }
    },
    el: {
      title: 'Πρόληψη Εγκατάλειψης',
      subtitle: 'Προληπτική Προσέγγιση σε Λογαριασμούς Υψηλού Κινδύνου',
      tabs: {
        dashboard: 'Ταμπλό',
        accounts: 'Λογαριασμοί Κινδύνου',
        outreach: 'Καμπάνιες Προσέγγισης',
        analytics: 'Αναλυτικά',
        settings: 'Ρυθμίσεις'
      },
      metrics: {
        totalAtRisk: 'Σύνολο σε Κίνδυνο',
        criticalAccounts: 'Κρίσιμοι Λογαριασμοί',
        monthlyChurnRate: 'Μηνιαίο Ποσοστό Εγκατάλειψης',
        retentionRate: 'Ποσοστό Διατήρησης',
        averageRiskScore: 'Μέσος Βαθμός Κινδύνου',
        successfulOutreach: 'Επιτυχημένη Προσέγγιση',
        revenueAtRisk: 'Έσοδα σε Κίνδυνο',
        preventedChurn: 'Αποτροπή Εγκατάλειψης'
      },
      riskLevels: {
        low: 'Χαμηλός Κίνδυνος',
        medium: 'Μέτριος Κίνδυνος',
        high: 'Υψηλός Κίνδυνος',
        critical: 'Κρίσιμος Κίνδυνος'
      },
      outreachStatus: {
        pending: 'Εκκρεμεί',
        'in-progress': 'Σε Εξέλιξη',
        completed: 'Ολοκληρώθηκε',
        escalated: 'Κλιμακώθηκε'
      },
      campaignTypes: {
        email: 'Email',
        call: 'Τηλεφωνική Κλήση',
        meeting: 'Συνάντηση',
        survey: 'Έρευνα',
        offer: 'Ειδική Προσφορά'
      },
      campaignStatus: {
        active: 'Ενεργό',
        paused: 'Σε Παύση',
        completed: 'Ολοκληρώθηκε',
        draft: 'Πρόχειρο'
      },
      actions: {
        contactNow: 'Επικοινωνία Τώρα',
        scheduleMeeting: 'Προγραμματισμός Συνάντησης',
        sendEmail: 'Αποστολή Email',
        viewDetails: 'Προβολή Λεπτομερειών',
        editCampaign: 'Επεξεργασία Καμπάνιας',
        startCampaign: 'Έναρξη Καμπάνιας',
        pauseCampaign: 'Παύση Καμπάνιας',
        viewReports: 'Προβολή Αναφορών',
        exportData: 'Εξαγωγή Δεδομένων'
      },
      filters: {
        all: 'Όλα',
        riskLevel: 'Επίπεδο Κινδύνου',
        segment: 'Τμήμα',
        industry: 'Κλάδος',
        manager: 'Υπεύθυνος Λογαριασμού'
      },
      accountDetails: {
        riskFactors: 'Παράγοντες Κινδύνου',
        contactInfo: 'Στοιχεία Επικοινωνίας',
        accountHealth: 'Υγεία Λογαριασμού',
        recentActivity: 'Πρόσφατη Δραστηριότητα',
        outreachHistory: 'Ιστορικό Προσεγγίσεων'
      },
      quickActions: {
        title: 'Γρήγορες Ενέργειες',
        escalateToManager: 'Κλιμάκωση στον Manager',
        scheduleFollowUp: 'Προγραμματισμός Παρακολούθησης',
        updateRiskScore: 'Ενημέρωση Βαθμού Κινδύνου',
        addNote: 'Προσθήκη Σημείωσης'
      }
    }
  };

  const t = translations[locale];

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getOutreachStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'escalated': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCampaignStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredAccounts = accounts.filter(account => {
    const riskMatch = filterRiskLevel === 'all' || account.riskLevel === filterRiskLevel;
    const segmentMatch = filterSegment === 'all' || account.segment === filterSegment;
    return riskMatch && segmentMatch;
  });

  const handleContactAccount = (accountId: string, method: 'email' | 'call' | 'meeting') => {
    setAccounts(prev => 
      prev.map(acc => 
        acc.id === accountId 
          ? { ...acc, outreachStatus: 'in-progress', lastContactDate: new Date().toISOString().split('T')[0] }
          : acc
      )
    );
    console.log(`Initiating ${method} contact with account ${accountId}`);
  };

  const handleCampaignAction = (campaignId: string, action: 'start' | 'pause' | 'stop') => {
    setCampaigns(prev =>
      prev.map(campaign =>
        campaign.id === campaignId
          ? { ...campaign, status: action === 'start' ? 'active' : action === 'pause' ? 'paused' : 'completed' }
          : campaign
      )
    );
    console.log(`${action} campaign ${campaignId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
                {t.title}
              </h1>
              <p className="text-gray-600 ml-12">{t.subtitle}</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                {t.actions.exportData}
              </Button>
              <Button className="bg-red-600 hover:bg-red-700">
                <Plus className="h-4 w-4 mr-2" />
                New Campaign
              </Button>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4 mb-6">
            <Card className="p-4 bg-gradient-to-r from-red-500 to-red-600 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold">{RETENTION_METRICS.totalAtRisk}</div>
                <div className="text-xs text-red-100">{t.metrics.totalAtRisk}</div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold">{RETENTION_METRICS.criticalAccounts}</div>
                <div className="text-xs text-orange-100">{t.metrics.criticalAccounts}</div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold">{RETENTION_METRICS.monthlyChurnRate}%</div>
                <div className="text-xs text-yellow-100">{t.metrics.monthlyChurnRate}</div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-r from-green-500 to-green-600 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold">{RETENTION_METRICS.retentionRate}%</div>
                <div className="text-xs text-green-100">{t.metrics.retentionRate}</div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold">{RETENTION_METRICS.averageRiskScore}</div>
                <div className="text-xs text-blue-100">{t.metrics.averageRiskScore}</div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold">{RETENTION_METRICS.successfulOutreach}%</div>
                <div className="text-xs text-purple-100">{t.metrics.successfulOutreach}</div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-r from-gray-600 to-gray-700 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold">€{(RETENTION_METRICS.revenueAtRisk / 1000).toFixed(0)}K</div>
                <div className="text-xs text-gray-300">{t.metrics.revenueAtRisk}</div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold">{RETENTION_METRICS.preventedChurn}</div>
                <div className="text-xs text-emerald-100">{t.metrics.preventedChurn}</div>
              </div>
            </Card>
          </div>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard">{t.tabs.dashboard}</TabsTrigger>
            <TabsTrigger value="accounts">{t.tabs.accounts}</TabsTrigger>
            <TabsTrigger value="outreach">{t.tabs.outreach}</TabsTrigger>
            <TabsTrigger value="analytics">{t.tabs.analytics}</TabsTrigger>
            <TabsTrigger value="settings">{t.tabs.settings}</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Critical Accounts Alert */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-600">
                      <AlertCircle className="h-5 w-5" />
                      Critical Accounts Requiring Immediate Attention
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {accounts.filter(acc => acc.riskLevel === 'critical').map((account) => (
                        <div key={account.id} className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-red-600 text-white">
                                {account.companyName.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{locale === 'en' ? account.companyName : account.companyNameEl}</div>
                              <div className="text-sm text-gray-600">{account.contactPerson} • €{account.monthlyRevenue.toLocaleString()}/month</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="text-2xl font-bold text-red-600">{account.riskScore}</div>
                              <div className="text-xs text-gray-500">Risk Score</div>
                            </div>
                            <Button size="sm" className="bg-red-600 hover:bg-red-700">
                              <Phone className="h-4 w-4 mr-1" />
                              {t.actions.contactNow}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-blue-600" />
                    {t.quickActions.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start" variant="outline">
                    <Mail className="h-4 w-4 mr-2" />
                    Send Bulk Retention Email
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Manager Reviews
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Target className="h-4 w-4 mr-2" />
                    Launch Success Campaign
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Bell className="h-4 w-4 mr-2" />
                    Set Risk Alerts
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Generate Report
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Risk Distribution and Trends */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Risk Level Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-sm">Critical (12)</span>
                      </div>
                      <div className="text-sm font-medium">25.5%</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                        <span className="text-sm">High (18)</span>
                      </div>
                      <div className="text-sm font-medium">38.3%</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span className="text-sm">Medium (15)</span>
                      </div>
                      <div className="text-sm font-medium">31.9%</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm">Low (2)</span>
                      </div>
                      <div className="text-sm font-medium">4.3%</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="h-5 w-5" />
                    Churn Prevention Success
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Prevented Churn This Month</span>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="font-medium">23 accounts</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Revenue Saved</span>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-medium">€89,400</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Success Rate</span>
                      <div className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-green-600" />
                        <span className="font-medium">78%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Avg. Recovery Time</span>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">12 days</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* At-Risk Accounts Tab */}
          <TabsContent value="accounts" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Filter At-Risk Accounts
                  </CardTitle>
                  <div className="text-sm text-gray-500">
                    Showing {filteredAccounts.length} of {accounts.length} accounts
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-4">
                  <Select value={filterRiskLevel} onValueChange={setFilterRiskLevel}>
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

                  <Select value={filterSegment} onValueChange={setFilterSegment}>
                    <SelectTrigger>
                      <SelectValue placeholder={t.filters.segment} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t.filters.all}</SelectItem>
                      <SelectItem value="Enterprise">Enterprise</SelectItem>
                      <SelectItem value="Mid-Market">Mid-Market</SelectItem>
                      <SelectItem value="Small Business">Small Business</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button variant="outline" className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Refresh Scores
                  </Button>

                  <Button variant="outline" className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Export List
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Accounts List */}
            <div className="grid gap-4">
              {filteredAccounts.map((account) => (
                <Card key={account.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className={`${account.riskLevel === 'critical' ? 'bg-red-600' : account.riskLevel === 'high' ? 'bg-orange-600' : account.riskLevel === 'medium' ? 'bg-yellow-600' : 'bg-green-600'} text-white`}>
                            {account.companyName.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-lg">{locale === 'en' ? account.companyName : account.companyNameEl}</h3>
                          <p className="text-gray-600">{account.contactPerson} • {account.segment} • {account.employeeCount} employees</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-2xl font-bold text-red-600">{account.riskScore}</div>
                          <Badge className={getRiskLevelColor(account.riskLevel)}>
                            {t.riskLevels[account.riskLevel as keyof typeof t.riskLevels]}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6 mb-4">
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">Account Health</div>
                        <div className="flex items-center gap-2">
                          <Progress value={account.healthScore} className="flex-1" />
                          <span className="text-sm font-medium">{account.healthScore}%</span>
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">Feature Adoption</div>
                        <div className="flex items-center gap-2">
                          <Progress value={account.featureAdoption} className="flex-1" />
                          <span className="text-sm font-medium">{account.featureAdoption}%</span>
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">Engagement Trend</div>
                        <div className="flex items-center gap-2">
                          {account.engagementTrend === 'up' && <ArrowUp className="h-4 w-4 text-green-600" />}
                          {account.engagementTrend === 'down' && <ArrowDown className="h-4 w-4 text-red-600" />}
                          {account.engagementTrend === 'stable' && <Minus className="h-4 w-4 text-yellow-600" />}
                          <span className="text-sm font-medium capitalize">{account.engagementTrend}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="text-sm font-medium text-gray-700 mb-2">{t.accountDetails.riskFactors}</div>
                      <div className="flex flex-wrap gap-2">
                        {(locale === 'en' ? account.riskFactors : account.riskFactorsEl).slice(0, 3).map((factor, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {factor}
                          </Badge>
                        ))}
                        {account.riskFactors.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{account.riskFactors.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          €{account.monthlyRevenue.toLocaleString()}/month
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Last contact: {account.lastContactDate}
                        </div>
                        <Badge className={getOutreachStatusColor(account.outreachStatus)}>
                          {t.outreachStatus[account.outreachStatus as keyof typeof t.outreachStatus]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleContactAccount(account.id, 'email')}
                        >
                          <Mail className="h-4 w-4 mr-1" />
                          {t.actions.sendEmail}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleContactAccount(account.id, 'call')}
                        >
                          <Phone className="h-4 w-4 mr-1" />
                          Call
                        </Button>
                        <Button 
                          size="sm" 
                          className="bg-red-600 hover:bg-red-700"
                          onClick={() => handleContactAccount(account.id, 'meeting')}
                        >
                          <Calendar className="h-4 w-4 mr-1" />
                          {t.actions.scheduleMeeting}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Outreach Campaigns Tab */}
          <TabsContent value="outreach" className="space-y-6">
            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
              {campaigns.map((campaign) => (
                <Card key={campaign.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{locale === 'en' ? campaign.name : campaign.nameEl}</CardTitle>
                      <Badge className={getCampaignStatusColor(campaign.status)}>
                        {t.campaignStatus[campaign.status as keyof typeof t.campaignStatus]}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      {t.campaignTypes[campaign.type as keyof typeof t.campaignTypes]} • {campaign.targetSegment}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-sm">
                        {locale === 'en' ? campaign.template : campaign.templateEl}
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="font-medium text-gray-700">Sent</div>
                          <div className="text-lg font-bold">{campaign.sentCount}</div>
                        </div>
                        <div>
                          <div className="font-medium text-gray-700">Open Rate</div>
                          <div className="text-lg font-bold">{campaign.openRate}%</div>
                        </div>
                        <div>
                          <div className="font-medium text-gray-700">Response</div>
                          <div className="text-lg font-bold">{campaign.responseRate}%</div>
                        </div>
                        <div>
                          <div className="font-medium text-gray-700">Convert</div>
                          <div className="text-lg font-bold">{campaign.conversionRate}%</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {campaign.status === 'active' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleCampaignAction(campaign.id, 'pause')}
                          >
                            <Pause className="h-4 w-4 mr-1" />
                            {t.actions.pauseCampaign}
                          </Button>
                        ) : campaign.status === 'paused' ? (
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => handleCampaignAction(campaign.id, 'start')}
                          >
                            <PlayCircle className="h-4 w-4 mr-1" />
                            {t.actions.startCampaign}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => handleCampaignAction(campaign.id, 'start')}
                          >
                            <PlayCircle className="h-4 w-4 mr-1" />
                            {t.actions.startCampaign}
                          </Button>
                        )}
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Churn Prevention Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Total Revenue Saved</span>
                      <span className="text-2xl font-bold text-green-600">€234,500</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Accounts Recovered</span>
                      <span className="text-2xl font-bold text-blue-600">47</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Success Rate</span>
                      <span className="text-2xl font-bold text-purple-600">78%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Risk Score Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span>Critical (85-100)</span>
                      </div>
                      <span className="font-bold">12</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                        <span>High (70-84)</span>
                      </div>
                      <span className="font-bold">18</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span>Medium (50-69)</span>
                      </div>
                      <span className="font-bold">15</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span>Low (0-49)</span>
                      </div>
                      <span className="font-bold">2</span>
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
                <CardTitle>Churn Prevention Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Risk Scoring Parameters</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Login Frequency Weight</label>
                      <Input type="number" defaultValue="25" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Support Ticket Weight</label>
                      <Input type="number" defaultValue="20" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Payment Delay Weight</label>
                      <Input type="number" defaultValue="30" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Feature Adoption Weight</label>
                      <Input type="number" defaultValue="25" />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">Alert Thresholds</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Critical Risk Threshold</label>
                      <Input type="number" defaultValue="80" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">High Risk Threshold</label>
                      <Input type="number" defaultValue="65" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Medium Risk Threshold</label>
                      <Input type="number" defaultValue="45" />
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