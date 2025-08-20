/**
 * Automated CBA Updates - Stay current with collective agreements
 * Comprehensive system for tracking and applying Greek collective bargaining agreement updates
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  RefreshCw,
  Bell,
  Download,
  Upload,
  Calendar,
  FileText,
  Users,
  Euro,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Settings,
  Search,
  Filter,
  Eye,
  Edit,
  Plus,
  Trash2,
  BookOpen,
  Scale,
  Building,
  Factory,
  Hotel,
  ShoppingCart,
  Stethoscope,
  Cpu,
  Truck,
  GraduationCap,
  Briefcase,
  Construction,
  Utensils,
  Car,
  Plane,
  Ship,
  Zap,
  Shield,
  Award,
  Target,
  BarChart3,
  PieChart,
  LineChart,
  Activity,
  Star,
  Flag,
  Globe,
  MapPin,
  Phone,
  Mail,
  Info,
  AlertCircle,
  CheckCheck,
  XCircle,
  Archive,
  History
} from 'lucide-react';

interface CollectiveAgreement {
  id: string;
  title: string;
  titleEl: string;
  sector: string;
  sectorEl: string;
  code: string;
  effectiveDate: string;
  expirationDate?: string;
  status: 'active' | 'pending' | 'expired' | 'updated';
  lastUpdated: string;
  minimumWage: number;
  wageIncrease?: number;
  coverageEmployees: number;
  publishedBy: string;
  publishedByEl: string;
  keyChanges: string[];
  keyChangesEl: string[];
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
  autoApply: boolean;
  complianceScore: number;
  applicableRegions: string[];
  employeeCategories: string[];
}

interface CBAUpdate {
  id: string;
  cbaId: string;
  updateType: 'wage_increase' | 'benefit_change' | 'working_conditions' | 'termination_rules' | 'other';
  updateTypeEl: string;
  description: string;
  descriptionEl: string;
  effectiveDate: string;
  impactedEmployees: number;
  previousValue?: string;
  newValue: string;
  autoApplied: boolean;
  reviewRequired: boolean;
  status: 'pending' | 'applied' | 'rejected' | 'reviewing';
  appliedDate?: string;
  appliedBy?: string;
  notes?: string;
}

interface CBAMetrics {
  totalAgreements: number;
  activeAgreements: number;
  pendingUpdates: number;
  criticalUpdates: number;
  complianceRate: number;
  employeesCovered: number;
  sectorsTracked: number;
  autoAppliedUpdates: number;
}

interface CBAUpdatesProps {
  locale?: 'en' | 'el';
}

const COLLECTIVE_AGREEMENTS: CollectiveAgreement[] = [
  {
    id: 'cba-001',
    title: 'National General Collective Agreement',
    titleEl: 'Εθνική Γενική Συλλογική Σύμβαση Εργασίας',
    sector: 'General',
    sectorEl: 'Γενικός',
    code: 'EGSSE-2024',
    effectiveDate: '2024-01-01',
    expirationDate: '2025-12-31',
    status: 'active',
    lastUpdated: '2024-12-15',
    minimumWage: 760,
    wageIncrease: 5.2,
    coverageEmployees: 850000,
    publishedBy: 'Ministry of Labor',
    publishedByEl: 'Υπουργείο Εργασίας',
    keyChanges: [
      'Minimum wage increased to €760',
      'Overtime premium increased to 25%',
      'Holiday bonus calculation updated',
      'Flexible working hours provisions'
    ],
    keyChangesEl: [
      'Κατώτατος μισθός αυξήθηκε σε €760',
      'Πριμ υπερωριών αυξήθηκε σε 25%',
      'Ενημερώθηκε ο υπολογισμός δώρου αργιών',
      'Διατάξεις ευέλικτου ωραρίου'
    ],
    impactLevel: 'critical',
    autoApply: true,
    complianceScore: 98,
    applicableRegions: ['All Greece'],
    employeeCategories: ['All employees']
  },
  {
    id: 'cba-002',
    title: 'Tourism & Hospitality Sector Agreement',
    titleEl: 'Κλαδική Σύμβαση Τουρισμού & Φιλοξενίας',
    sector: 'Tourism',
    sectorEl: 'Τουρισμός',
    code: 'TOUR-2024',
    effectiveDate: '2024-04-01',
    expirationDate: '2025-03-31',
    status: 'active',
    lastUpdated: '2024-11-20',
    minimumWage: 820,
    wageIncrease: 7.8,
    coverageEmployees: 125000,
    publishedBy: 'Greek Tourism Association',
    publishedByEl: 'Ελληνικός Οργανισμός Τουρισμού',
    keyChanges: [
      'Seasonal worker minimum wage €820',
      'Tips distribution rules clarified',
      'Split shift premiums introduced',
      'Extended vacation entitlements'
    ],
    keyChangesEl: [
      'Κατώτατος μισθός εποχιακών εργαζομένων €820',
      'Διευκρινίστηκαν οι κανόνες διανομής φιλοδωρημάτων',
      'Εισήχθησαν πριμ διαιρεμένων βαρδιών',
      'Επεκτάθηκαν τα δικαιώματα διακοπών'
    ],
    impactLevel: 'high',
    autoApply: false,
    complianceScore: 94,
    applicableRegions: ['Attica', 'Crete', 'Rhodes', 'Mykonos', 'Santorini'],
    employeeCategories: ['Hotel staff', 'Restaurant workers', 'Tour guides']
  },
  {
    id: 'cba-003',
    title: 'Retail Trade Collective Agreement',
    titleEl: 'Συλλογική Σύμβαση Λιανικού Εμπορίου',
    sector: 'Retail',
    sectorEl: 'Λιανικό Εμπόριο',
    code: 'RET-2024',
    effectiveDate: '2024-02-01',
    expirationDate: '2025-01-31',
    status: 'active',
    lastUpdated: '2024-10-30',
    minimumWage: 785,
    wageIncrease: 4.5,
    coverageEmployees: 180000,
    publishedBy: 'Retail Workers Union',
    publishedByEl: 'Ένωση Εργαζομένων Λιανικού Εμπορίου',
    keyChanges: [
      'Sunday work premium 75%',
      'Night shift allowance €45/month',
      'Training leave entitlement',
      'Performance bonus structure'
    ],
    keyChangesEl: [
      'Πριμ εργασίας Κυριακής 75%',
      'Επίδομα νυχτερινής βάρδιας €45/μήνα',
      'Δικαίωμα άδειας εκπαίδευσης',
      'Δομή bonus απόδοσης'
    ],
    impactLevel: 'medium',
    autoApply: true,
    complianceScore: 96,
    applicableRegions: ['Athens', 'Thessaloniki', 'Patras'],
    employeeCategories: ['Sales staff', 'Cashiers', 'Stock handlers']
  },
  {
    id: 'cba-004',
    title: 'Banking Sector Agreement',
    titleEl: 'Κλαδική Σύμβαση Τραπεζικού Τομέα',
    sector: 'Banking',
    sectorEl: 'Τραπεζικός',
    code: 'BANK-2024',
    effectiveDate: '2024-01-01',
    expirationDate: '2024-12-31',
    status: 'pending',
    lastUpdated: '2024-12-01',
    minimumWage: 1200,
    wageIncrease: 3.2,
    coverageEmployees: 45000,
    publishedBy: 'Hellenic Bank Association',
    publishedByEl: 'Ελληνική Ένωση Τραπεζών',
    keyChanges: [
      'Digital transformation bonus',
      'Hybrid work allowances',
      'Enhanced pension contributions',
      'Professional development funding'
    ],
    keyChangesEl: [
      'Bonus ψηφιακής μεταμόρφωσης',
      'Επιδόματα υβριδικής εργασίας',
      'Ενισχυμένες εισφορές συντάξεων',
      'Χρηματοδότηση επαγγελματικής ανάπτυξης'
    ],
    impactLevel: 'high',
    autoApply: false,
    complianceScore: 92,
    applicableRegions: ['All Greece'],
    employeeCategories: ['Bank employees', 'Branch managers', 'IT staff']
  },
  {
    id: 'cba-005',
    title: 'Manufacturing Industry Agreement',
    titleEl: 'Συλλογική Σύμβαση Βιομηχανίας',
    sector: 'Manufacturing',
    sectorEl: 'Βιομηχανία',
    code: 'MAN-2024',
    effectiveDate: '2024-03-01',
    expirationDate: '2025-02-28',
    status: 'active',
    lastUpdated: '2024-09-15',
    minimumWage: 800,
    wageIncrease: 6.1,
    coverageEmployees: 95000,
    publishedBy: 'Federation of Greek Industries',
    publishedByEl: 'Σύνδεσμος Ελληνικών Βιομηχανιών',
    keyChanges: [
      'Safety equipment allowance',
      'Shift work premiums updated',
      'Annual productivity bonus',
      'Skills development programs'
    ],
    keyChangesEl: [
      'Επίδομα εξοπλισμού ασφαλείας',
      'Ενημερώθηκαν τα πριμ βαρδιακής εργασίας',
      'Ετήσιο bonus παραγωγικότητας',
      'Προγράμματα ανάπτυξης δεξιοτήτων'
    ],
    impactLevel: 'medium',
    autoApply: true,
    complianceScore: 97,
    applicableRegions: ['Northern Greece', 'Central Greece'],
    employeeCategories: ['Factory workers', 'Technicians', 'Quality control']
  }
];

const CBA_UPDATES: CBAUpdate[] = [
  {
    id: 'upd-001',
    cbaId: 'cba-001',
    updateType: 'wage_increase',
    updateTypeEl: 'Αύξηση Μισθού',
    description: 'Minimum wage increased from €740 to €760 effective January 1, 2025',
    descriptionEl: 'Κατώτατος μισθός αυξήθηκε από €740 σε €760 με ισχύ από 1 Ιανουαρίου 2025',
    effectiveDate: '2025-01-01',
    impactedEmployees: 850000,
    previousValue: '€740',
    newValue: '€760',
    autoApplied: true,
    reviewRequired: false,
    status: 'applied',
    appliedDate: '2024-12-15',
    appliedBy: 'System Auto-Update'
  },
  {
    id: 'upd-002',
    cbaId: 'cba-002',
    updateType: 'benefit_change',
    updateTypeEl: 'Αλλαγή Παροχών',
    description: 'Tips distribution method updated to include digital payment processing',
    descriptionEl: 'Ενημερώθηκε η μέθοδος διανομής φιλοδωρημάτων για να συμπεριλάβει την ψηφιακή επεξεργασία πληρωμών',
    effectiveDate: '2024-12-01',
    impactedEmployees: 125000,
    newValue: 'Digital tips included in distribution calculation',
    autoApplied: false,
    reviewRequired: true,
    status: 'reviewing',
    notes: 'Requires manual review for digital payment integration'
  },
  {
    id: 'upd-003',
    cbaId: 'cba-003',
    updateType: 'working_conditions',
    updateTypeEl: 'Συνθήκες Εργασίας',
    description: 'Sunday work premium increased from 50% to 75%',
    descriptionEl: 'Το πριμ εργασίας Κυριακής αυξήθηκε από 50% σε 75%',
    effectiveDate: '2024-11-01',
    impactedEmployees: 45000,
    previousValue: '50%',
    newValue: '75%',
    autoApplied: true,
    reviewRequired: false,
    status: 'applied',
    appliedDate: '2024-10-30',
    appliedBy: 'HR Manager - Sofia D.'
  },
  {
    id: 'upd-004',
    cbaId: 'cba-004',
    updateType: 'other',
    updateTypeEl: 'Άλλο',
    description: 'New hybrid work policy and allowances for banking sector',
    descriptionEl: 'Νέα πολιτική υβριδικής εργασίας και επιδόματα για τον τραπεζικό τομέα',
    effectiveDate: '2025-01-15',
    impactedEmployees: 45000,
    newValue: 'Monthly hybrid work allowance €150',
    autoApplied: false,
    reviewRequired: true,
    status: 'pending'
  }
];

const CBA_METRICS: CBAMetrics = {
  totalAgreements: 47,
  activeAgreements: 42,
  pendingUpdates: 12,
  criticalUpdates: 3,
  complianceRate: 96.8,
  employeesCovered: 1295000,
  sectorsTracked: 15,
  autoAppliedUpdates: 34
};

export default function CBAUpdates({ locale = 'en' }: CBAUpdatesProps) {
  const [selectedTab, setSelectedTab] = useState('dashboard');
  const [agreements, setAgreements] = useState(COLLECTIVE_AGREEMENTS);
  const [updates, setUpdates] = useState(CBA_UPDATES);
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const translations = {
    en: {
      title: 'CBA Updates',
      subtitle: 'Automated Collective Bargaining Agreement Updates',
      tabs: {
        dashboard: 'Dashboard',
        agreements: 'CBA Library',
        updates: 'Recent Updates',
        notifications: 'Notifications',
        compliance: 'Compliance',
        settings: 'Settings'
      },
      metrics: {
        totalAgreements: 'Total CBAs',
        activeAgreements: 'Active CBAs',
        pendingUpdates: 'Pending Updates',
        criticalUpdates: 'Critical Updates',
        complianceRate: 'Compliance Rate',
        employeesCovered: 'Employees Covered',
        sectorsTracked: 'Sectors Tracked',
        autoAppliedUpdates: 'Auto-Applied Updates'
      },
      actions: {
        checkUpdates: 'Check for Updates',
        applyUpdate: 'Apply Update',
        reviewUpdate: 'Review Update',
        dismissUpdate: 'Dismiss Update',
        viewDetails: 'View Details',
        downloadCBA: 'Download CBA',
        subscribeSector: 'Subscribe to Sector',
        exportReport: 'Export Report',
        refreshAll: 'Refresh All',
        autoApply: 'Auto-Apply',
        manualReview: 'Manual Review'
      },
      status: {
        active: 'Active',
        pending: 'Pending',
        expired: 'Expired',
        updated: 'Updated',
        applied: 'Applied',
        rejected: 'Rejected',
        reviewing: 'Under Review'
      },
      updateTypes: {
        wage_increase: 'Wage Increase',
        benefit_change: 'Benefit Change',
        working_conditions: 'Working Conditions',
        termination_rules: 'Termination Rules',
        other: 'Other Changes'
      },
      impactLevels: {
        low: 'Low Impact',
        medium: 'Medium Impact',
        high: 'High Impact',
        critical: 'Critical Impact'
      },
      sectors: {
        general: 'General',
        tourism: 'Tourism & Hospitality',
        retail: 'Retail Trade',
        banking: 'Banking & Finance',
        manufacturing: 'Manufacturing',
        healthcare: 'Healthcare',
        education: 'Education',
        construction: 'Construction',
        transport: 'Transportation',
        technology: 'Technology & IT',
        agriculture: 'Agriculture',
        energy: 'Energy & Utilities',
        telecommunications: 'Telecommunications',
        media: 'Media & Entertainment',
        professional: 'Professional Services'
      },
      notifications: {
        title: 'CBA Update Notifications',
        criticalUpdate: 'Critical CBA update requires immediate attention',
        wageIncrease: 'Wage increase notification from',
        newAgreement: 'New collective agreement published',
        expiringAgreement: 'CBA expiring within 30 days',
        complianceAlert: 'Compliance issue detected',
        autoApplied: 'Update automatically applied to payroll system'
      },
      compliance: {
        overallScore: 'Overall Compliance Score',
        sectorsCompliant: 'Fully Compliant Sectors',
        pendingActions: 'Pending Compliance Actions',
        lastAudit: 'Last Compliance Audit',
        nextReview: 'Next Scheduled Review'
      },
      filters: {
        allSectors: 'All Sectors',
        allStatuses: 'All Statuses',
        search: 'Search agreements...'
      }
    },
    el: {
      title: 'Ενημερώσεις ΣΣΕ',
      subtitle: 'Αυτοματοποιημένες Ενημερώσεις Συλλογικών Συμβάσεων Εργασίας',
      tabs: {
        dashboard: 'Ταμπλό',
        agreements: 'Βιβλιοθήκη ΣΣΕ',
        updates: 'Πρόσφατες Ενημερώσεις',
        notifications: 'Ειδοποιήσεις',
        compliance: 'Συμμόρφωση',
        settings: 'Ρυθμίσεις'
      },
      metrics: {
        totalAgreements: 'Σύνολο ΣΣΕ',
        activeAgreements: 'Ενεργές ΣΣΕ',
        pendingUpdates: 'Εκκρεμείς Ενημερώσεις',
        criticalUpdates: 'Κρίσιμες Ενημερώσεις',
        complianceRate: 'Ποσοστό Συμμόρφωσης',
        employeesCovered: 'Καλυπτόμενοι Εργαζόμενοι',
        sectorsTracked: 'Παρακολουθούμενοι Κλάδοι',
        autoAppliedUpdates: 'Αυτόματες Ενημερώσεις'
      },
      actions: {
        checkUpdates: 'Έλεγχος Ενημερώσεων',
        applyUpdate: 'Εφαρμογή Ενημέρωσης',
        reviewUpdate: 'Επιθεώρηση Ενημέρωσης',
        dismissUpdate: 'Απόρριψη Ενημέρωσης',
        viewDetails: 'Προβολή Λεπτομερειών',
        downloadCBA: 'Λήψη ΣΣΕ',
        subscribeSector: 'Εγγραφή σε Κλάδο',
        exportReport: 'Εξαγωγή Αναφοράς',
        refreshAll: 'Ανανέωση Όλων',
        autoApply: 'Αυτόματη Εφαρμογή',
        manualReview: 'Χειροκίνητη Επιθεώρηση'
      },
      status: {
        active: 'Ενεργή',
        pending: 'Εκκρεμεί',
        expired: 'Έληξε',
        updated: 'Ενημερώθηκε',
        applied: 'Εφαρμόστηκε',
        rejected: 'Απορρίφθηκε',
        reviewing: 'Υπό Επιθεώρηση'
      },
      updateTypes: {
        wage_increase: 'Αύξηση Μισθού',
        benefit_change: 'Αλλαγή Παροχών',
        working_conditions: 'Συνθήκες Εργασίας',
        termination_rules: 'Κανόνες Καταγγελίας',
        other: 'Άλλες Αλλαγές'
      },
      impactLevels: {
        low: 'Χαμηλός Αντίκτυπος',
        medium: 'Μέτριος Αντίκτυπος',
        high: 'Υψηλός Αντίκτυπος',
        critical: 'Κρίσιμος Αντίκτυπος'
      },
      sectors: {
        general: 'Γενικός',
        tourism: 'Τουρισμός & Φιλοξενία',
        retail: 'Λιανικό Εμπόριο',
        banking: 'Τραπεζικός & Χρηματοοικονομικός',
        manufacturing: 'Βιομηχανία',
        healthcare: 'Υγειονομική Περίθαλψη',
        education: 'Εκπαίδευση',
        construction: 'Κατασκευές',
        transport: 'Μεταφορές',
        technology: 'Τεχνολογία & Πληροφορική',
        agriculture: 'Γεωργία',
        energy: 'Ενέργεια & Κοινωφελή',
        telecommunications: 'Τηλεπικοινωνίες',
        media: 'Μέσα & Ψυχαγωγία',
        professional: 'Επαγγελματικές Υπηρεσίες'
      },
      notifications: {
        title: 'Ειδοποιήσεις Ενημερώσεων ΣΣΕ',
        criticalUpdate: 'Κρίσιμη ενημέρωση ΣΣΕ απαιτεί άμεση προσοχή',
        wageIncrease: 'Ειδοποίηση αύξησης μισθού από',
        newAgreement: 'Νέα συλλογική σύμβαση δημοσιεύτηκε',
        expiringAgreement: 'ΣΣΕ λήγει εντός 30 ημερών',
        complianceAlert: 'Εντοπίστηκε πρόβλημα συμμόρφωσης',
        autoApplied: 'Ενημέρωση εφαρμόστηκε αυτόματα στο σύστημα μισθοδοσίας'
      },
      compliance: {
        overallScore: 'Συνολικός Βαθμός Συμμόρφωσης',
        sectorsCompliant: 'Πλήρως Συμμορφωμένοι Κλάδοι',
        pendingActions: 'Εκκρεμείς Ενέργειες Συμμόρφωσης',
        lastAudit: 'Τελευταίος Έλεγχος Συμμόρφωσης',
        nextReview: 'Επόμενη Προγραμματισμένη Επιθεώρηση'
      },
      filters: {
        allSectors: 'Όλοι οι Κλάδοι',
        allStatuses: 'Όλες οι Καταστάσεις',
        search: 'Αναζήτηση συμβάσεων...'
      }
    }
  };

  const t = translations[locale];

  const getSectorIcon = (sector: string) => {
    switch (sector.toLowerCase()) {
      case 'general': return Scale;
      case 'tourism': return Hotel;
      case 'retail': return ShoppingCart;
      case 'banking': return Building;
      case 'manufacturing': return Factory;
      case 'healthcare': return Stethoscope;
      case 'education': return GraduationCap;
      case 'construction': return Construction;
      case 'transport': return Truck;
      case 'technology': return Cpu;
      default: return Briefcase;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'updated': return 'bg-blue-100 text-blue-800';
      case 'applied': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'reviewing': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getImpactColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getUpdateTypeIcon = (type: string) => {
    switch (type) {
      case 'wage_increase': return Euro;
      case 'benefit_change': return Award;
      case 'working_conditions': return Clock;
      case 'termination_rules': return Scale;
      default: return FileText;
    }
  };

  const filteredAgreements = agreements.filter(agreement => {
    const sectorMatch = selectedSector === 'all' || agreement.sector.toLowerCase() === selectedSector;
    const statusMatch = selectedStatus === 'all' || agreement.status === selectedStatus;
    const searchMatch = searchTerm === '' || 
      agreement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agreement.titleEl.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agreement.sector.toLowerCase().includes(searchTerm.toLowerCase());
    
    return sectorMatch && statusMatch && searchMatch;
  });

  const handleCheckUpdates = async () => {
    setIsUpdating(true);
    // Simulate API call to check for updates
    await new Promise(resolve => setTimeout(resolve, 3000));
    setIsUpdating(false);
    console.log('Checking for CBA updates...');
  };

  const handleApplyUpdate = (updateId: string) => {
    setUpdates(prev => 
      prev.map(update => 
        update.id === updateId 
          ? { ...update, status: 'applied', appliedDate: new Date().toISOString().split('T')[0] }
          : update
      )
    );
    console.log(`Applied update ${updateId}`);
  };

  const handleReviewUpdate = (updateId: string) => {
    setUpdates(prev => 
      prev.map(update => 
        update.id === updateId 
          ? { ...update, status: 'reviewing' }
          : update
      )
    );
    console.log(`Reviewing update ${updateId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <RefreshCw className="h-8 w-8 text-blue-600" />
                </div>
                {t.title}
              </h1>
              <p className="text-gray-600 ml-12">{t.subtitle}</p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                onClick={handleCheckUpdates}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {t.actions.checkUpdates}
                  </>
                )}
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Download className="h-4 w-4 mr-2" />
                {t.actions.exportReport}
              </Button>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4 mb-6">
            <Card className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold">{CBA_METRICS.totalAgreements}</div>
                <div className="text-xs text-blue-100">{t.metrics.totalAgreements}</div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-r from-green-500 to-green-600 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold">{CBA_METRICS.activeAgreements}</div>
                <div className="text-xs text-green-100">{t.metrics.activeAgreements}</div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold">{CBA_METRICS.pendingUpdates}</div>
                <div className="text-xs text-yellow-100">{t.metrics.pendingUpdates}</div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-r from-red-500 to-red-600 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold">{CBA_METRICS.criticalUpdates}</div>
                <div className="text-xs text-red-100">{t.metrics.criticalUpdates}</div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold">{CBA_METRICS.complianceRate}%</div>
                <div className="text-xs text-purple-100">{t.metrics.complianceRate}</div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold">{(CBA_METRICS.employeesCovered / 1000000).toFixed(1)}M</div>
                <div className="text-xs text-indigo-100">{t.metrics.employeesCovered}</div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold">{CBA_METRICS.sectorsTracked}</div>
                <div className="text-xs text-teal-100">{t.metrics.sectorsTracked}</div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold">{CBA_METRICS.autoAppliedUpdates}</div>
                <div className="text-xs text-emerald-100">{t.metrics.autoAppliedUpdates}</div>
              </div>
            </Card>
          </div>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="dashboard">{t.tabs.dashboard}</TabsTrigger>
            <TabsTrigger value="agreements">{t.tabs.agreements}</TabsTrigger>
            <TabsTrigger value="updates">{t.tabs.updates}</TabsTrigger>
            <TabsTrigger value="notifications">{t.tabs.notifications}</TabsTrigger>
            <TabsTrigger value="compliance">{t.tabs.compliance}</TabsTrigger>
            <TabsTrigger value="settings">{t.tabs.settings}</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Critical Updates Alert */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-600">
                      <AlertTriangle className="h-5 w-5" />
                      Critical Updates Requiring Immediate Attention
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {updates.filter(update => updates.find(u => u.id === update.id && agreements.find(a => a.id === update.cbaId)?.impactLevel === 'critical')).map((update) => {
                        const cba = agreements.find(a => a.id === update.cbaId);
                        const TypeIcon = getUpdateTypeIcon(update.updateType);
                        
                        return (
                          <div key={update.id} className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                            <div className="flex items-center gap-4">
                              <div className="p-2 bg-red-100 rounded-lg">
                                <TypeIcon className="h-5 w-5 text-red-600" />
                              </div>
                              <div>
                                <div className="font-medium">
                                  {locale === 'en' ? cba?.title : cba?.titleEl}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {locale === 'en' ? update.description : update.descriptionEl}
                                </div>
                                <div className="text-xs text-red-600 mt-1">
                                  Effective: {update.effectiveDate} • Affects {update.impactedEmployees.toLocaleString()} employees
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReviewUpdate(update.id)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                {t.actions.reviewUpdate}
                              </Button>
                              {!update.reviewRequired && (
                                <Button
                                  size="sm"
                                  className="bg-red-600 hover:bg-red-700"
                                  onClick={() => handleApplyUpdate(update.id)}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  {t.actions.applyUpdate}
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-green-600" />
                    Recent CBA Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <div className="font-medium">Minimum wage updated</div>
                      <div className="text-gray-600">National General CBA • €740 → €760</div>
                      <div className="text-xs text-gray-500">2 hours ago</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 text-sm">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div>
                      <div className="font-medium">New sector agreement</div>
                      <div className="text-gray-600">Banking sector CBA published</div>
                      <div className="text-xs text-gray-500">1 day ago</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 text-sm">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                    <div>
                      <div className="font-medium">Tips policy updated</div>
                      <div className="text-gray-600">Tourism sector digital tips</div>
                      <div className="text-xs text-gray-500">3 days ago</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 text-sm">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                    <div>
                      <div className="font-medium">Sunday premium increased</div>
                      <div className="text-gray-600">Retail sector • 50% → 75%</div>
                      <div className="text-xs text-gray-500">1 week ago</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sector Compliance Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Sector Compliance Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {['General', 'Tourism', 'Retail', 'Banking', 'Manufacturing'].map((sector, index) => {
                    const SectorIcon = getSectorIcon(sector);
                    const compliance = [98, 94, 96, 92, 97][index];
                    
                    return (
                      <div key={sector} className="p-4 border rounded-lg">
                        <div className="flex items-center gap-3 mb-3">
                          <SectorIcon className="h-5 w-5 text-blue-600" />
                          <span className="font-medium text-sm">{sector}</span>
                        </div>
                        <div className="text-2xl font-bold mb-2">{compliance}%</div>
                        <Progress value={compliance} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CBA Library Tab */}
          <TabsContent value="agreements" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filter Collective Agreements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-4">
                  <Select value={selectedSector} onValueChange={setSelectedSector}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Sector" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t.filters.allSectors}</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="tourism">Tourism</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="banking">Banking</SelectItem>
                      <SelectItem value="manufacturing">Manufacturing</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t.filters.allStatuses}</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>

                  <Input
                    placeholder={t.filters.search}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />

                  <Button variant="outline" onClick={() => {
                    setSelectedSector('all');
                    setSelectedStatus('all');
                    setSearchTerm('');
                  }}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Agreements List */}
            <div className="grid gap-4">
              {filteredAgreements.map((agreement) => {
                const SectorIcon = getSectorIcon(agreement.sector);
                
                return (
                  <Card key={agreement.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-4">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <SectorIcon className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg mb-1">
                              {locale === 'en' ? agreement.title : agreement.titleEl}
                            </h3>
                            <p className="text-gray-600 text-sm mb-2">
                              {locale === 'en' ? agreement.sector : agreement.sectorEl} • 
                              Code: {agreement.code} • 
                              Covers {agreement.coverageEmployees.toLocaleString()} employees
                            </p>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span>Effective: {agreement.effectiveDate}</span>
                              {agreement.expirationDate && (
                                <span>Expires: {agreement.expirationDate}</span>
                              )}
                              <span>Last Updated: {agreement.lastUpdated}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={getStatusColor(agreement.status)}>
                            {t.status[agreement.status as keyof typeof t.status]}
                          </Badge>
                          <Badge className={`${getImpactColor(agreement.impactLevel)} border-current`} variant="outline">
                            {t.impactLevels[agreement.impactLevel as keyof typeof t.impactLevels]}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-1">Minimum Wage</div>
                          <div className="text-lg font-bold text-green-600">€{agreement.minimumWage}</div>
                          {agreement.wageIncrease && (
                            <div className="text-xs text-green-600">
                              +{agreement.wageIncrease}% from previous
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-1">Compliance Score</div>
                          <div className="flex items-center gap-2">
                            <Progress value={agreement.complianceScore} className="flex-1" />
                            <span className="text-sm font-medium">{agreement.complianceScore}%</span>
                          </div>
                        </div>

                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-1">Auto-Apply</div>
                          <div className="flex items-center gap-2">
                            {agreement.autoApply ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                            <span className="text-sm">
                              {agreement.autoApply ? 'Enabled' : 'Manual Review'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="text-sm font-medium text-gray-700 mb-2">Key Changes</div>
                        <div className="flex flex-wrap gap-2">
                          {(locale === 'en' ? agreement.keyChanges : agreement.keyChangesEl).slice(0, 3).map((change, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {change}
                            </Badge>
                          ))}
                          {agreement.keyChanges.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{agreement.keyChanges.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          Published by: {locale === 'en' ? agreement.publishedBy : agreement.publishedByEl}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-1" />
                            {t.actions.viewDetails}
                          </Button>
                          <Button size="sm" variant="outline">
                            <Download className="h-4 w-4 mr-1" />
                            {t.actions.downloadCBA}
                          </Button>
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                            <Bell className="h-4 w-4 mr-1" />
                            {t.actions.subscribeSector}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Updates Tab */}
          <TabsContent value="updates" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Recent CBA Updates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {updates.map((update) => {
                    const cba = agreements.find(a => a.id === update.cbaId);
                    const TypeIcon = getUpdateTypeIcon(update.updateType);
                    
                    return (
                      <div key={update.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <TypeIcon className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold">
                                {locale === 'en' ? cba?.title : cba?.titleEl}
                              </h3>
                              <p className="text-sm text-gray-600 mt-1">
                                {locale === 'en' ? update.description : update.descriptionEl}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                                <span>Effective: {update.effectiveDate}</span>
                                <span>Affects {update.impactedEmployees.toLocaleString()} employees</span>
                                {update.previousValue && (
                                  <span>{update.previousValue} → {update.newValue}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(update.status)}>
                              {t.status[update.status as keyof typeof t.status]}
                            </Badge>
                            <Badge variant="outline">
                              {locale === 'en' ? 
                                t.updateTypes[update.updateType as keyof typeof t.updateTypes] : 
                                update.updateTypeEl
                              }
                            </Badge>
                          </div>
                        </div>

                        {update.notes && (
                          <div className="mb-3 p-2 bg-gray-50 rounded text-sm text-gray-600">
                            <Info className="h-4 w-4 inline mr-1" />
                            {update.notes}
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            {update.autoApplied && (
                              <div className="flex items-center gap-1 text-green-600">
                                <Zap className="h-4 w-4" />
                                Auto-Applied
                              </div>
                            )}
                            {update.reviewRequired && (
                              <div className="flex items-center gap-1 text-orange-600">
                                <Eye className="h-4 w-4" />
                                Review Required
                              </div>
                            )}
                            {update.appliedDate && (
                              <span>Applied: {update.appliedDate}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {update.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleReviewUpdate(update.id)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  {t.actions.reviewUpdate}
                                </Button>
                                {!update.reviewRequired && (
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => handleApplyUpdate(update.id)}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    {t.actions.applyUpdate}
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  {t.notifications.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border-l-4 border-red-500 bg-red-50 rounded">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <span className="font-medium text-red-800">Critical Update</span>
                      <span className="text-sm text-red-600">2 hours ago</span>
                    </div>
                    <p className="text-sm text-red-700">
                      {t.notifications.criticalUpdate}: National General CBA minimum wage increase effective January 1, 2025.
                    </p>
                  </div>

                  <div className="p-4 border-l-4 border-green-500 bg-green-50 rounded">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-800">Auto-Applied</span>
                      <span className="text-sm text-green-600">1 day ago</span>
                    </div>
                    <p className="text-sm text-green-700">
                      {t.notifications.autoApplied}: Retail sector Sunday work premium increased to 75%.
                    </p>
                  </div>

                  <div className="p-4 border-l-4 border-blue-500 bg-blue-50 rounded">
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="h-5 w-5 text-blue-600" />
                      <span className="font-medium text-blue-800">New Agreement</span>
                      <span className="text-sm text-blue-600">3 days ago</span>
                    </div>
                    <p className="text-sm text-blue-700">
                      {t.notifications.newAgreement}: Banking sector collective agreement for 2024-2025 published.
                    </p>
                  </div>

                  <div className="p-4 border-l-4 border-yellow-500 bg-yellow-50 rounded">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-5 w-5 text-yellow-600" />
                      <span className="font-medium text-yellow-800">Expiring Soon</span>
                      <span className="text-sm text-yellow-600">1 week ago</span>
                    </div>
                    <p className="text-sm text-yellow-700">
                      {t.notifications.expiringAgreement}: Manufacturing sector CBA expires on February 28, 2025.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Compliance Tab */}
          <TabsContent value="compliance" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-green-600" />
                    {t.compliance.overallScore}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center mb-6">
                    <div className="text-4xl font-bold text-green-600 mb-2">{CBA_METRICS.complianceRate}%</div>
                    <Progress value={CBA_METRICS.complianceRate} className="w-full" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">{t.compliance.sectorsCompliant}</span>
                      <span className="text-sm font-medium">13 of 15</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">{t.compliance.pendingActions}</span>
                      <span className="text-sm font-medium text-orange-600">3</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">{t.compliance.lastAudit}</span>
                      <span className="text-sm font-medium">December 1, 2024</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">{t.compliance.nextReview}</span>
                      <span className="text-sm font-medium">March 1, 2025</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Compliance by Sector
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { sector: 'General', compliance: 98 },
                      { sector: 'Manufacturing', compliance: 97 },
                      { sector: 'Retail', compliance: 96 },
                      { sector: 'Tourism', compliance: 94 },
                      { sector: 'Banking', compliance: 92 }
                    ].map((item, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="w-20 text-sm font-medium">{item.sector}</div>
                        <Progress value={item.compliance} className="flex-1" />
                        <div className="w-12 text-sm font-medium text-right">{item.compliance}%</div>
                      </div>
                    ))}
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
                  CBA Update Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Notification Preferences</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-medium">Email notifications for critical updates</label>
                        <p className="text-sm text-gray-600">Receive email alerts for critical CBA updates</p>
                      </div>
                      <Button variant="default" size="sm">Enabled</Button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-medium">Auto-apply non-critical updates</label>
                        <p className="text-sm text-gray-600">Automatically apply updates with low to medium impact</p>
                      </div>
                      <Button variant="outline" size="sm">Disabled</Button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-medium">Weekly compliance reports</label>
                        <p className="text-sm text-gray-600">Receive weekly summary of CBA compliance status</p>
                      </div>
                      <Button variant="default" size="sm">Enabled</Button>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">Sector Subscriptions</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {['General', 'Tourism', 'Retail', 'Banking', 'Manufacturing', 'Healthcare'].map((sector) => (
                      <div key={sector} className="flex items-center gap-2 p-3 border rounded-lg">
                        <input type="checkbox" defaultChecked className="rounded" />
                        <span className="text-sm font-medium">{sector}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button variant="outline">Reset to Defaults</Button>
                  <Button className="bg-blue-600 hover:bg-blue-700">Save Settings</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}