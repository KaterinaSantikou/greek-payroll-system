/**
 * Digital Inspector Portal - Direct interface for labor inspections
 * Comprehensive portal for Greek labor inspectors to conduct digital inspections
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
import { Textarea } from '@/components/ui/textarea';
import {
  Shield,
  Search,
  FileText,
  Users,
  Building,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Download,
  Upload,
  Send,
  Flag,
  Scale,
  Gavel,
  Clipboard,
  BookOpen,
  Settings,
  Filter,
  BarChart3,
  TrendingUp,
  Activity,
  Target,
  Star,
  Award,
  Info,
  Edit,
  Plus,
  Trash2,
  Archive,
  History,
  Phone,
  Mail,
  MapPin,
  Globe,
  Lock,
  Unlock,
  Key,
  Fingerprint,
  CreditCard,
  Receipt,
  Euro,
  Percent,
  Calculator,
  Factory,
  Hotel,
  ShoppingCart,
  Stethoscope,
  GraduationCap,
  Construction,
  Truck,
  Cpu,
  RefreshCw,
  PieChart,
  LineChart,
} from 'lucide-react';

interface Company {
  id: string;
  name: string;
  nameEl: string;
  afm: string;
  sector: string;
  sectorEl: string;
  employees: number;
  address: string;
  addressEl: string;
  phone: string;
  email: string;
  legalRepresentative: string;
  legalRepresentativeEl: string;
  registrationDate: string;
  lastInspectionDate?: string;
  complianceScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  activeViolations: number;
  status: 'active' | 'suspended' | 'under_review';
}

interface Inspection {
  id: string;
  companyId: string;
  inspectorId: string;
  inspectorName: string;
  inspectorNameEl: string;
  type: 'routine' | 'complaint' | 'follow_up' | 'random' | 'targeted';
  typeEl: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  scheduledDate: string;
  completedDate?: string;
  duration?: number;
  categories: string[];
  categoriesEl: string[];
  findings: InspectionFinding[];
  overallScore: number;
  violationsFound: number;
  correctedViolations: number;
  finesIssued: number;
  totalFineAmount: number;
  notes?: string;
  notesEl?: string;
  followUpRequired: boolean;
  followUpDate?: string;
}

interface InspectionFinding {
  id: string;
  category: string;
  categoryEl: string;
  severity: 'minor' | 'major' | 'critical';
  description: string;
  descriptionEl: string;
  violation: boolean;
  lawReference: string;
  fineAmount?: number;
  correctionDeadline?: string;
  correctedDate?: string;
  status: 'open' | 'corrected' | 'disputed' | 'pending';
  evidence: string[];
}

interface Inspector {
  id: string;
  name: string;
  nameEl: string;
  badgeNumber: string;
  region: string;
  regionEl: string;
  specializations: string[];
  specializationsEl: string[];
  totalInspections: number;
  activeInspections: number;
  averageScore: number;
  phone: string;
  email: string;
}

interface InspectionMetrics {
  totalInspections: number;
  activeInspections: number;
  completedThisMonth: number;
  violationsFound: number;
  complianceRate: number;
  averageInspectionTime: number;
  finesIssued: number;
  totalFineAmount: number;
}

interface DigitalInspectorPortalProps {
  locale?: 'en' | 'el';
}

const COMPANIES: Company[] = [
  {
    id: 'comp-001',
    name: 'Aegean Hotels Group',
    nameEl: 'Ομιλος Ξενοδοχείων Αιγαίου',
    afm: '123456789',
    sector: 'Tourism',
    sectorEl: 'Τουρισμός',
    employees: 145,
    address: '25 Miaouli Street, Piraeus, 18538',
    addressEl: 'Μιαούλη 25, Πειραιάς, 18538',
    phone: '+30 210 1234567',
    email: 'info@aegeanhotels.gr',
    legalRepresentative: 'Maria Papadopoulos',
    legalRepresentativeEl: 'Μαρία Παπαδοπούλου',
    registrationDate: '2015-03-15',
    lastInspectionDate: '2023-11-20',
    complianceScore: 87,
    riskLevel: 'medium',
    activeViolations: 2,
    status: 'active',
  },
  {
    id: 'comp-002',
    name: 'Athens Retail Solutions',
    nameEl: 'Λιανικές Λύσεις Αθηνών',
    afm: '987654321',
    sector: 'Retail',
    sectorEl: 'Λιανικό Εμπόριο',
    employees: 89,
    address: '12 Ermou Street, Athens, 10563',
    addressEl: 'Ερμού 12, Αθήνα, 10563',
    phone: '+30 210 9876543',
    email: 'contact@athensretail.gr',
    legalRepresentative: 'Dimitris Konstantinou',
    legalRepresentativeEl: 'Δημήτρης Κωνσταντίνου',
    registrationDate: '2018-07-22',
    lastInspectionDate: '2024-01-15',
    complianceScore: 92,
    riskLevel: 'low',
    activeViolations: 0,
    status: 'active',
  },
  {
    id: 'comp-003',
    name: 'Hellenic Manufacturing Co.',
    nameEl: 'Ελληνική Βιομηχανική Εταιρεία',
    afm: '456789123',
    sector: 'Manufacturing',
    sectorEl: 'Βιομηχανία',
    employees: 234,
    address: '45 Industrial Park, Thessaloniki, 54248',
    addressEl: 'Βιομηχανικό Πάρκο 45, Θεσσαλονίκη, 54248',
    phone: '+30 2310 456789',
    email: 'info@hellenic-mfg.gr',
    legalRepresentative: 'Nikos Georgiou',
    legalRepresentativeEl: 'Νίκος Γεωργίου',
    registrationDate: '2012-12-08',
    lastInspectionDate: '2023-09-12',
    complianceScore: 78,
    riskLevel: 'high',
    activeViolations: 5,
    status: 'under_review',
  },
  {
    id: 'comp-004',
    name: 'Digital Health Services',
    nameEl: 'Ψηφιακές Υπηρεσίες Υγείας',
    afm: '789123456',
    sector: 'Healthcare',
    sectorEl: 'Υγειονομική Περίθαλψη',
    employees: 67,
    address: '8 Hippocrates Avenue, Athens, 11527',
    addressEl: 'Ιπποκράτους 8, Αθήνα, 11527',
    phone: '+30 210 7891234',
    email: 'admin@digitalhealth.gr',
    legalRepresentative: 'Elena Stavrou',
    legalRepresentativeEl: 'Έλενα Σταύρου',
    registrationDate: '2020-02-18',
    lastInspectionDate: '2024-02-28',
    complianceScore: 95,
    riskLevel: 'low',
    activeViolations: 0,
    status: 'active',
  },
];

const INSPECTIONS: Inspection[] = [
  {
    id: 'insp-001',
    companyId: 'comp-001',
    inspectorId: 'insp-001',
    inspectorName: 'Kostas Dimitriou',
    inspectorNameEl: 'Κώστας Δημητρίου',
    type: 'routine',
    typeEl: 'Τακτικός',
    status: 'scheduled',
    scheduledDate: '2024-12-20',
    categories: ['Working Hours', 'Safety Standards', 'Employee Records'],
    categoriesEl: [
      'Ωράριο Εργασίας',
      'Πρότυπα Ασφαλείας',
      'Αρχεία Εργαζομένων',
    ],
    findings: [],
    overallScore: 0,
    violationsFound: 0,
    correctedViolations: 0,
    finesIssued: 0,
    totalFineAmount: 0,
    followUpRequired: false,
  },
  {
    id: 'insp-002',
    companyId: 'comp-002',
    inspectorId: 'insp-002',
    inspectorName: 'Sofia Kalogerou',
    inspectorNameEl: 'Σοφία Καλογέρου',
    type: 'follow_up',
    typeEl: 'Παρακολούθηση',
    status: 'completed',
    scheduledDate: '2024-01-15',
    completedDate: '2024-01-15',
    duration: 240,
    categories: ['Payroll Compliance', 'Insurance Records'],
    categoriesEl: ['Συμμόρφωση Μισθοδοσίας', 'Αρχεία Ασφάλισης'],
    findings: [
      {
        id: 'find-001',
        category: 'Payroll Compliance',
        categoryEl: 'Συμμόρφωση Μισθοδοσίας',
        severity: 'minor',
        description:
          'Minor discrepancies in overtime calculations for 3 employees',
        descriptionEl:
          'Μικρές αποκλίσεις στους υπολογισμούς υπερωριών για 3 εργαζομένους',
        violation: true,
        lawReference: 'Law 4808/2021, Article 15',
        fineAmount: 500,
        correctionDeadline: '2024-02-15',
        correctedDate: '2024-02-10',
        status: 'corrected',
        evidence: ['payroll_records.pdf', 'overtime_calculations.xlsx'],
      },
    ],
    overallScore: 92,
    violationsFound: 1,
    correctedViolations: 1,
    finesIssued: 1,
    totalFineAmount: 500,
    followUpRequired: false,
  },
  {
    id: 'insp-003',
    companyId: 'comp-003',
    inspectorId: 'insp-001',
    inspectorName: 'Kostas Dimitriou',
    inspectorNameEl: 'Κώστας Δημητρίου',
    type: 'targeted',
    typeEl: 'Στοχευμένος',
    status: 'in_progress',
    scheduledDate: '2024-12-18',
    categories: [
      'Safety Compliance',
      'Working Conditions',
      'Equipment Standards',
    ],
    categoriesEl: [
      'Συμμόρφωση Ασφαλείας',
      'Συνθήκες Εργασίας',
      'Πρότυπα Εξοπλισμού',
    ],
    findings: [
      {
        id: 'find-002',
        category: 'Safety Compliance',
        categoryEl: 'Συμμόρφωση Ασφαλείας',
        severity: 'major',
        description: 'Missing safety equipment in production area',
        descriptionEl: 'Έλλειψη εξοπλισμού ασφαλείας στην περιοχή παραγωγής',
        violation: true,
        lawReference: 'Law 3850/2010, Article 8',
        fineAmount: 2000,
        correctionDeadline: '2024-12-31',
        status: 'open',
        evidence: ['safety_photos.zip', 'equipment_list.pdf'],
      },
    ],
    overallScore: 0,
    violationsFound: 1,
    correctedViolations: 0,
    finesIssued: 1,
    totalFineAmount: 2000,
    followUpRequired: true,
    followUpDate: '2025-01-15',
  },
];

const INSPECTORS: Inspector[] = [
  {
    id: 'insp-001',
    name: 'Kostas Dimitriou',
    nameEl: 'Κώστας Δημητρίου',
    badgeNumber: 'INS-2024-001',
    region: 'Attica',
    regionEl: 'Αττική',
    specializations: ['Labor Law', 'Safety Standards', 'Payroll Compliance'],
    specializationsEl: [
      'Εργατικό Δίκαιο',
      'Πρότυπα Ασφαλείας',
      'Συμμόρφωση Μισθοδοσίας',
    ],
    totalInspections: 156,
    activeInspections: 3,
    averageScore: 88.5,
    phone: '+30 210 1111111',
    email: 'k.dimitriou@sepe.gr',
  },
  {
    id: 'insp-002',
    name: 'Sofia Kalogerou',
    nameEl: 'Σοφία Καλογέρου',
    badgeNumber: 'INS-2024-002',
    region: 'Central Macedonia',
    regionEl: 'Κεντρική Μακεδονία',
    specializations: [
      'Insurance Compliance',
      'Working Hours',
      'Employee Rights',
    ],
    specializationsEl: [
      'Συμμόρφωση Ασφάλισης',
      'Ώρες Εργασίας',
      'Δικαιώματα Εργαζομένων',
    ],
    totalInspections: 203,
    activeInspections: 2,
    averageScore: 91.2,
    phone: '+30 2310 2222222',
    email: 's.kalogerou@sepe.gr',
  },
];

const INSPECTION_METRICS: InspectionMetrics = {
  totalInspections: 1247,
  activeInspections: 23,
  completedThisMonth: 87,
  violationsFound: 234,
  complianceRate: 81.3,
  averageInspectionTime: 195,
  finesIssued: 156,
  totalFineAmount: 147500,
};

export default function DigitalInspectorPortal({
  locale = 'en',
}: DigitalInspectorPortalProps) {
  const [selectedTab, setSelectedTab] = useState('dashboard');
  const [companies, setCompanies] = useState(COMPANIES);
  const [inspections, setInspections] = useState(INSPECTIONS);
  const [inspectors, setInspectors] = useState(INSPECTORS);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedInspection, setSelectedInspection] =
    useState<Inspection | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSector, setFilterSector] = useState<string>('all');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [inspectorCredentials, setInspectorCredentials] = useState({
    badgeNumber: '',
    password: '',
  });

  const translations = {
    en: {
      title: 'Digital Inspector Portal',
      subtitle: 'Labor Inspection Management System',
      tabs: {
        dashboard: 'Dashboard',
        companies: 'Companies',
        inspections: 'Inspections',
        reports: 'Reports',
        analytics: 'Analytics',
        settings: 'Settings',
      },
      auth: {
        title: 'Inspector Authentication',
        subtitle: 'Secure access for authorized labor inspectors',
        badgeNumber: 'Inspector Badge Number',
        password: 'Password',
        login: 'Access Portal',
        logout: 'Logout',
        unauthorized: 'Access denied. Please verify your credentials.',
      },
      metrics: {
        totalInspections: 'Total Inspections',
        activeInspections: 'Active Inspections',
        completedThisMonth: 'Completed This Month',
        violationsFound: 'Violations Found',
        complianceRate: 'Compliance Rate',
        averageInspectionTime: 'Avg Inspection Time',
        finesIssued: 'Fines Issued',
        totalFineAmount: 'Total Fine Amount',
      },
      company: {
        details: 'Company Details',
        employees: 'Employees',
        lastInspection: 'Last Inspection',
        complianceScore: 'Compliance Score',
        riskLevel: 'Risk Level',
        activeViolations: 'Active Violations',
        contactInfo: 'Contact Information',
        legalRepresentative: 'Legal Representative',
        address: 'Address',
        phone: 'Phone',
        email: 'Email',
      },
      inspection: {
        schedule: 'Schedule Inspection',
        details: 'Inspection Details',
        findings: 'Findings',
        violations: 'Violations',
        corrected: 'Corrected',
        fines: 'Fines',
        followUp: 'Follow-up Required',
        duration: 'Duration (minutes)',
        categories: 'Categories',
        notes: 'Notes',
        evidence: 'Evidence',
        status: 'Status',
      },
      status: {
        active: 'Active',
        suspended: 'Suspended',
        under_review: 'Under Review',
        scheduled: 'Scheduled',
        in_progress: 'In Progress',
        completed: 'Completed',
        cancelled: 'Cancelled',
        open: 'Open',
        corrected: 'Corrected',
        disputed: 'Disputed',
        pending: 'Pending',
      },
      risk: {
        low: 'Low Risk',
        medium: 'Medium Risk',
        high: 'High Risk',
        critical: 'Critical Risk',
      },
      severity: {
        minor: 'Minor',
        major: 'Major',
        critical: 'Critical',
      },
      inspectionType: {
        routine: 'Routine',
        complaint: 'Complaint',
        follow_up: 'Follow-up',
        random: 'Random',
        targeted: 'Targeted',
      },
      actions: {
        viewDetails: 'View Details',
        scheduleInspection: 'Schedule Inspection',
        startInspection: 'Start Inspection',
        completeInspection: 'Complete Inspection',
        addFinding: 'Add Finding',
        generateReport: 'Generate Report',
        exportData: 'Export Data',
        sendNotification: 'Send Notification',
        markCorrected: 'Mark Corrected',
        searchCompanies: 'Search companies...',
        filterSector: 'Filter by Sector',
        filterRisk: 'Filter by Risk',
      },
    },
    el: {
      title: 'Ψηφιακή Πύλη Επιθεωρητή',
      subtitle: 'Σύστημα Διαχείρισης Επιθεωρήσεων Εργασίας',
      tabs: {
        dashboard: 'Ταμπλό',
        companies: 'Επιχειρήσεις',
        inspections: 'Επιθεωρήσεις',
        reports: 'Αναφορές',
        analytics: 'Αναλυτικά',
        settings: 'Ρυθμίσεις',
      },
      auth: {
        title: 'Πιστοποίηση Επιθεωρητή',
        subtitle: 'Ασφαλής πρόσβαση για εξουσιοδοτημένους επιθεωρητές εργασίας',
        badgeNumber: 'Αριθμός Σήματος Επιθεωρητή',
        password: 'Κωδικός Πρόσβασης',
        login: 'Πρόσβαση στην Πύλη',
        logout: 'Αποσύνδεση',
        unauthorized:
          'Άρνηση πρόσβασης. Παρακαλώ επαληθεύστε τα διαπιστευτήριά σας.',
      },
      metrics: {
        totalInspections: 'Σύνολο Επιθεωρήσεων',
        activeInspections: 'Ενεργές Επιθεωρήσεις',
        completedThisMonth: 'Ολοκληρωμένες Αυτόν τον Μήνα',
        violationsFound: 'Παραβάσεις που Βρέθηκαν',
        complianceRate: 'Ποσοστό Συμμόρφωσης',
        averageInspectionTime: 'Μέσος Χρόνος Επιθεώρησης',
        finesIssued: 'Πρόστιμα που Επιβλήθηκαν',
        totalFineAmount: 'Συνολικό Ποσό Προστίμων',
      },
      company: {
        details: 'Στοιχεία Επιχείρησης',
        employees: 'Εργαζόμενοι',
        lastInspection: 'Τελευταία Επιθεώρηση',
        complianceScore: 'Βαθμός Συμμόρφωσης',
        riskLevel: 'Επίπεδο Κινδύνου',
        activeViolations: 'Ενεργές Παραβάσεις',
        contactInfo: 'Στοιχεία Επικοινωνίας',
        legalRepresentative: 'Νόμιμος Εκπρόσωπος',
        address: 'Διεύθυνση',
        phone: 'Τηλέφωνο',
        email: 'Email',
      },
      inspection: {
        schedule: 'Προγραμματισμός Επιθεώρησης',
        details: 'Στοιχεία Επιθεώρησης',
        findings: 'Ευρήματα',
        violations: 'Παραβάσεις',
        corrected: 'Διορθωμένες',
        fines: 'Πρόστιμα',
        followUp: 'Απαιτείται Παρακολούθηση',
        duration: 'Διάρκεια (λεπτά)',
        categories: 'Κατηγορίες',
        notes: 'Σημειώσεις',
        evidence: 'Στοιχεία',
        status: 'Κατάσταση',
      },
      status: {
        active: 'Ενεργή',
        suspended: 'Αναστολή',
        under_review: 'Υπό Εξέταση',
        scheduled: 'Προγραμματισμένη',
        in_progress: 'Σε Εξέλιξη',
        completed: 'Ολοκληρωμένη',
        cancelled: 'Ακυρωμένη',
        open: 'Ανοιχτή',
        corrected: 'Διορθωμένη',
        disputed: 'Αμφισβητούμενη',
        pending: 'Εκκρεμεί',
      },
      risk: {
        low: 'Χαμηλός Κίνδυνος',
        medium: 'Μέτριος Κίνδυνος',
        high: 'Υψηλός Κίνδυνος',
        critical: 'Κρίσιμος Κίνδυνος',
      },
      severity: {
        minor: 'Μικρή',
        major: 'Μεγάλη',
        critical: 'Κρίσιμη',
      },
      inspectionType: {
        routine: 'Τακτικός',
        complaint: 'Καταγγελία',
        follow_up: 'Παρακολούθηση',
        random: 'Τυχαίος',
        targeted: 'Στοχευμένος',
      },
      actions: {
        viewDetails: 'Προβολή Λεπτομερειών',
        scheduleInspection: 'Προγραμματισμός Επιθεώρησης',
        startInspection: 'Έναρξη Επιθεώρησης',
        completeInspection: 'Ολοκλήρωση Επιθεώρησης',
        addFinding: 'Προσθήκη Ευρήματος',
        generateReport: 'Δημιουργία Αναφοράς',
        exportData: 'Εξαγωγή Δεδομένων',
        sendNotification: 'Αποστολή Ειδοποίησης',
        markCorrected: 'Σήμανση ως Διορθωμένη',
        searchCompanies: 'Αναζήτηση επιχειρήσεων...',
        filterSector: 'Φιλτράρισμα κατά Κλάδο',
        filterRisk: 'Φιλτράρισμα κατά Κίνδυνο',
      },
    },
  };

  const t = translations[locale];

  const getSectorIcon = (sector: string) => {
    switch (sector.toLowerCase()) {
      case 'tourism':
        return Hotel;
      case 'retail':
        return ShoppingCart;
      case 'manufacturing':
        return Factory;
      case 'healthcare':
        return Stethoscope;
      case 'education':
        return GraduationCap;
      case 'construction':
        return Construction;
      case 'transport':
        return Truck;
      case 'technology':
        return Cpu;
      default:
        return Building;
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'text-green-600 bg-green-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'high':
        return 'text-orange-600 bg-orange-100';
      case 'critical':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'scheduled':
      case 'open':
        return 'bg-green-100 text-green-800';
      case 'suspended':
      case 'cancelled':
      case 'disputed':
        return 'bg-red-100 text-red-800';
      case 'under_review':
      case 'in_progress':
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
      case 'corrected':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'minor':
        return 'text-yellow-600';
      case 'major':
        return 'text-orange-600';
      case 'critical':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const filteredCompanies = companies.filter(company => {
    const sectorMatch =
      filterSector === 'all' || company.sector.toLowerCase() === filterSector;
    const riskMatch = filterRisk === 'all' || company.riskLevel === filterRisk;
    const searchMatch =
      searchTerm === '' ||
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.nameEl.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.afm.includes(searchTerm);

    return sectorMatch && riskMatch && searchMatch;
  });

  const handleLogin = () => {
    // Simple authentication simulation
    if (inspectorCredentials.badgeNumber && inspectorCredentials.password) {
      setIsAuthenticated(true);
    }
  };

  const handleScheduleInspection = (companyId: string) => {
    console.log(`Scheduling inspection for company ${companyId}`);
  };

  const handleStartInspection = (inspectionId: string) => {
    setInspections(prev =>
      prev.map(inspection =>
        inspection.id === inspectionId
          ? { ...inspection, status: 'in_progress' }
          : inspection
      )
    );
  };

  const handleCompleteInspection = (inspectionId: string) => {
    setInspections(prev =>
      prev.map(inspection =>
        inspection.id === inspectionId
          ? {
              ...inspection,
              status: 'completed',
              completedDate: new Date().toISOString().split('T')[0],
              duration: 180,
            }
          : inspection
      )
    );
  };

  // Authentication Guard
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">{t.auth.title}</CardTitle>
            <p className="text-gray-600 text-sm">{t.auth.subtitle}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                {t.auth.badgeNumber}
              </label>
              <Input
                type="text"
                value={inspectorCredentials.badgeNumber}
                onChange={e =>
                  setInspectorCredentials(prev => ({
                    ...prev,
                    badgeNumber: e.target.value,
                  }))
                }
                placeholder="INS-2024-001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                {t.auth.password}
              </label>
              <Input
                type="password"
                value={inspectorCredentials.password}
                onChange={e =>
                  setInspectorCredentials(prev => ({
                    ...prev,
                    password: e.target.value,
                  }))
                }
                placeholder="••••••••"
              />
            </div>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={handleLogin}
              disabled={
                !inspectorCredentials.badgeNumber ||
                !inspectorCredentials.password
              }
            >
              <Key className="h-4 w-4 mr-2" />
              {t.auth.login}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Shield className="h-8 w-8 text-blue-600" />
                </div>
                {t.title}
              </h1>
              <p className="text-gray-600 ml-12">{t.subtitle}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-600">
                Inspector: {INSPECTORS[0].name}
              </div>
              <Button
                variant="outline"
                onClick={() => setIsAuthenticated(false)}
              >
                <Lock className="h-4 w-4 mr-2" />
                {t.auth.logout}
              </Button>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4 mb-6">
            <Card className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {INSPECTION_METRICS.totalInspections}
                </div>
                <div className="text-xs text-blue-100">
                  {t.metrics.totalInspections}
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-r from-green-500 to-green-600 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {INSPECTION_METRICS.activeInspections}
                </div>
                <div className="text-xs text-green-100">
                  {t.metrics.activeInspections}
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {INSPECTION_METRICS.completedThisMonth}
                </div>
                <div className="text-xs text-purple-100">
                  {t.metrics.completedThisMonth}
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {INSPECTION_METRICS.violationsFound}
                </div>
                <div className="text-xs text-orange-100">
                  {t.metrics.violationsFound}
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {INSPECTION_METRICS.complianceRate}%
                </div>
                <div className="text-xs text-teal-100">
                  {t.metrics.complianceRate}
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {INSPECTION_METRICS.averageInspectionTime}m
                </div>
                <div className="text-xs text-indigo-100">
                  {t.metrics.averageInspectionTime}
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-r from-red-500 to-red-600 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {INSPECTION_METRICS.finesIssued}
                </div>
                <div className="text-xs text-red-100">
                  {t.metrics.finesIssued}
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  €{(INSPECTION_METRICS.totalFineAmount / 1000).toFixed(0)}K
                </div>
                <div className="text-xs text-yellow-100">
                  {t.metrics.totalFineAmount}
                </div>
              </div>
            </Card>
          </div>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="dashboard">{t.tabs.dashboard}</TabsTrigger>
            <TabsTrigger value="companies">{t.tabs.companies}</TabsTrigger>
            <TabsTrigger value="inspections">{t.tabs.inspections}</TabsTrigger>
            <TabsTrigger value="reports">{t.tabs.reports}</TabsTrigger>
            <TabsTrigger value="analytics">{t.tabs.analytics}</TabsTrigger>
            <TabsTrigger value="settings">{t.tabs.settings}</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Priority Inspections */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-600">
                      <AlertTriangle className="h-5 w-5" />
                      Priority Inspections
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {companies
                        .filter(
                          company =>
                            company.riskLevel === 'high' ||
                            company.riskLevel === 'critical'
                        )
                        .map(company => {
                          const SectorIcon = getSectorIcon(company.sector);

                          return (
                            <div
                              key={company.id}
                              className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50"
                            >
                              <div className="flex items-center gap-4">
                                <div className="p-2 bg-red-100 rounded-lg">
                                  <SectorIcon className="h-5 w-5 text-red-600" />
                                </div>
                                <div>
                                  <div className="font-medium">
                                    {locale === 'en'
                                      ? company.name
                                      : company.nameEl}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    AFM: {company.afm} • {company.employees}{' '}
                                    employees • {company.activeViolations}{' '}
                                    violations
                                  </div>
                                  <Badge
                                    className={`${getRiskColor(company.riskLevel)} text-xs mt-1`}
                                  >
                                    {
                                      t.risk[
                                        company.riskLevel as keyof typeof t.risk
                                      ]
                                    }
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedCompany(company)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  {t.actions.viewDetails}
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-red-600 hover:bg-red-700"
                                  onClick={() =>
                                    handleScheduleInspection(company.id)
                                  }
                                >
                                  <Calendar className="h-4 w-4 mr-1" />
                                  {t.actions.scheduleInspection}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Active Inspections */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-green-600" />
                    Active Inspections
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {inspections
                    .filter(
                      inspection =>
                        inspection.status === 'in_progress' ||
                        inspection.status === 'scheduled'
                    )
                    .map(inspection => {
                      const company = companies.find(
                        c => c.id === inspection.companyId
                      );

                      return (
                        <div
                          key={inspection.id}
                          className="flex items-start gap-3 text-sm p-3 border rounded"
                        >
                          <div
                            className={`w-2 h-2 rounded-full mt-2 ${
                              inspection.status === 'in_progress'
                                ? 'bg-green-500'
                                : 'bg-yellow-500'
                            }`}
                          ></div>
                          <div className="flex-1">
                            <div className="font-medium">
                              {locale === 'en'
                                ? company?.name
                                : company?.nameEl}
                            </div>
                            <div className="text-gray-600">
                              {
                                t.inspectionType[
                                  inspection.type as keyof typeof t.inspectionType
                                ]
                              }{' '}
                              • {inspection.scheduledDate}
                            </div>
                            <Badge
                              className={getStatusColor(inspection.status)}
                              variant="outline"
                            >
                              {
                                t.status[
                                  inspection.status as keyof typeof t.status
                                ]
                              }
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            {inspection.status === 'scheduled' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleStartInspection(inspection.id)
                                }
                              >
                                <Clock className="h-3 w-3" />
                              </Button>
                            )}
                            {inspection.status === 'in_progress' && (
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() =>
                                  handleCompleteInspection(inspection.id)
                                }
                              >
                                <CheckCircle className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Recent Inspection Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 border rounded-lg">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Inspection Completed</div>
                      <div className="text-sm text-gray-600">
                        Athens Retail Solutions - Follow-up inspection completed
                        successfully
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Today, 2:30 PM by Sofia Kalogerou
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      Score: 92%
                    </Badge>
                  </div>

                  <div className="flex items-start gap-4 p-4 border rounded-lg">
                    <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                      <Clock className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Inspection In Progress</div>
                      <div className="text-sm text-gray-600">
                        Hellenic Manufacturing Co. - Safety compliance
                        inspection ongoing
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Started today, 10:00 AM by Kostas Dimitriou
                      </div>
                    </div>
                    <Badge className="bg-orange-100 text-orange-800">
                      1 Violation
                    </Badge>
                  </div>

                  <div className="flex items-start gap-4 p-4 border rounded-lg">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Inspection Scheduled</div>
                      <div className="text-sm text-gray-600">
                        Aegean Hotels Group - Routine inspection scheduled
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        December 20, 2024 at 9:00 AM
                      </div>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">
                      Medium Risk
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Companies Tab */}
          <TabsContent value="companies" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Company Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-4">
                  <Input
                    placeholder={t.actions.searchCompanies}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />

                  <Select value={filterSector} onValueChange={setFilterSector}>
                    <SelectTrigger>
                      <SelectValue placeholder={t.actions.filterSector} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sectors</SelectItem>
                      <SelectItem value="tourism">Tourism</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="manufacturing">
                        Manufacturing
                      </SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterRisk} onValueChange={setFilterRisk}>
                    <SelectTrigger>
                      <SelectValue placeholder={t.actions.filterRisk} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Risk Levels</SelectItem>
                      <SelectItem value="low">Low Risk</SelectItem>
                      <SelectItem value="medium">Medium Risk</SelectItem>
                      <SelectItem value="high">High Risk</SelectItem>
                      <SelectItem value="critical">Critical Risk</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm('');
                      setFilterSector('all');
                      setFilterRisk('all');
                    }}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Companies List */}
            <div className="grid gap-4">
              {filteredCompanies.map(company => {
                const SectorIcon = getSectorIcon(company.sector);

                return (
                  <Card
                    key={company.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-4">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <SectorIcon className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg mb-1">
                              {locale === 'en' ? company.name : company.nameEl}
                            </h3>
                            <p className="text-gray-600 text-sm mb-2">
                              AFM: {company.afm} • {company.sector} •{' '}
                              {company.employees} employees
                            </p>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span>
                                {t.company.address}:{' '}
                                {locale === 'en'
                                  ? company.address
                                  : company.addressEl}
                              </span>
                              <span>
                                {t.company.phone}: {company.phone}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={getStatusColor(company.status)}>
                            {t.status[company.status as keyof typeof t.status]}
                          </Badge>
                          <Badge
                            className={`${getRiskColor(company.riskLevel)} border-current`}
                            variant="outline"
                          >
                            {t.risk[company.riskLevel as keyof typeof t.risk]}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-1">
                            {t.company.complianceScore}
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress
                              value={company.complianceScore}
                              className="flex-1"
                            />
                            <span className="text-sm font-medium">
                              {company.complianceScore}%
                            </span>
                          </div>
                        </div>

                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-1">
                            {t.company.activeViolations}
                          </div>
                          <div className="text-lg font-bold text-red-600">
                            {company.activeViolations}
                          </div>
                        </div>

                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-1">
                            {t.company.lastInspection}
                          </div>
                          <div className="text-sm font-medium">
                            {company.lastInspectionDate || 'Never'}
                          </div>
                        </div>

                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-1">
                            {t.company.legalRepresentative}
                          </div>
                          <div className="text-sm font-medium">
                            {locale === 'en'
                              ? company.legalRepresentative
                              : company.legalRepresentativeEl}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          {t.company.email}: {company.email}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedCompany(company)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            {t.actions.viewDetails}
                          </Button>
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => handleScheduleInspection(company.id)}
                          >
                            <Calendar className="h-4 w-4 mr-1" />
                            {t.actions.scheduleInspection}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Inspections Tab */}
          <TabsContent value="inspections" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clipboard className="h-5 w-5" />
                  Inspection Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {inspections.map(inspection => {
                    const company = companies.find(
                      c => c.id === inspection.companyId
                    );

                    return (
                      <div
                        key={inspection.id}
                        className="p-4 border rounded-lg"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold">
                              {locale === 'en'
                                ? company?.name
                                : company?.nameEl}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                              {
                                t.inspectionType[
                                  inspection.type as keyof typeof t.inspectionType
                                ]
                              }{' '}
                              • Inspector:{' '}
                              {locale === 'en'
                                ? inspection.inspectorName
                                : inspection.inspectorNameEl}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                              <span>Scheduled: {inspection.scheduledDate}</span>
                              {inspection.completedDate && (
                                <span>
                                  Completed: {inspection.completedDate}
                                </span>
                              )}
                              {inspection.duration && (
                                <span>Duration: {inspection.duration}m</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              className={getStatusColor(inspection.status)}
                            >
                              {
                                t.status[
                                  inspection.status as keyof typeof t.status
                                ]
                              }
                            </Badge>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-4 gap-4 mb-3">
                          <div>
                            <div className="text-xs font-medium text-gray-700">
                              Categories
                            </div>
                            <div className="text-sm">
                              {(locale === 'en'
                                ? inspection.categories
                                : inspection.categoriesEl
                              ).join(', ')}
                            </div>
                          </div>

                          {inspection.status === 'completed' && (
                            <>
                              <div>
                                <div className="text-xs font-medium text-gray-700">
                                  Score
                                </div>
                                <div className="text-sm font-bold text-blue-600">
                                  {inspection.overallScore}%
                                </div>
                              </div>

                              <div>
                                <div className="text-xs font-medium text-gray-700">
                                  Violations
                                </div>
                                <div className="text-sm font-bold text-red-600">
                                  {inspection.violationsFound}
                                </div>
                              </div>

                              <div>
                                <div className="text-xs font-medium text-gray-700">
                                  Fines
                                </div>
                                <div className="text-sm font-bold text-orange-600">
                                  €{inspection.totalFineAmount}
                                </div>
                              </div>
                            </>
                          )}
                        </div>

                        {inspection.findings.length > 0 && (
                          <div className="mb-3">
                            <div className="text-sm font-medium text-gray-700 mb-2">
                              Findings
                            </div>
                            <div className="space-y-2">
                              {inspection.findings.map(finding => (
                                <div
                                  key={finding.id}
                                  className="flex items-start gap-3 p-2 bg-gray-50 rounded"
                                >
                                  <div
                                    className={`p-1 rounded ${
                                      finding.violation
                                        ? 'bg-red-100'
                                        : 'bg-green-100'
                                    }`}
                                  >
                                    {finding.violation ? (
                                      <XCircle className="h-3 w-3 text-red-600" />
                                    ) : (
                                      <CheckCircle className="h-3 w-3 text-green-600" />
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-sm font-medium">
                                      {locale === 'en'
                                        ? finding.category
                                        : finding.categoryEl}
                                    </div>
                                    <div className="text-xs text-gray-600">
                                      {locale === 'en'
                                        ? finding.description
                                        : finding.descriptionEl}
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                                      <span>Law: {finding.lawReference}</span>
                                      {finding.fineAmount && (
                                        <span>Fine: €{finding.fineAmount}</span>
                                      )}
                                      <Badge
                                        className={getStatusColor(
                                          finding.status
                                        )}
                                        variant="outline"
                                      >
                                        {
                                          t.status[
                                            finding.status as keyof typeof t.status
                                          ]
                                        }
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            {inspection.followUpRequired && (
                              <Badge className="bg-yellow-100 text-yellow-800">
                                Follow-up Required
                                {inspection.followUpDate &&
                                  ` - ${inspection.followUpDate}`}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4 mr-1" />
                              {t.actions.viewDetails}
                            </Button>
                            {inspection.status === 'scheduled' && (
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() =>
                                  handleStartInspection(inspection.id)
                                }
                              >
                                <Clock className="h-4 w-4 mr-1" />
                                {t.actions.startInspection}
                              </Button>
                            )}
                            {inspection.status === 'in_progress' && (
                              <Button
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700"
                                onClick={() =>
                                  handleCompleteInspection(inspection.id)
                                }
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                {t.actions.completeInspection}
                              </Button>
                            )}
                            {inspection.status === 'completed' && (
                              <Button size="sm" variant="outline">
                                <Download className="h-4 w-4 mr-1" />
                                {t.actions.generateReport}
                              </Button>
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

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Compliance by Sector
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {['Tourism', 'Retail', 'Manufacturing', 'Healthcare'].map(
                      (sector, index) => {
                        const compliance = [87, 92, 78, 95][index];
                        return (
                          <div key={sector} className="flex items-center gap-3">
                            <div className="w-20 text-sm font-medium">
                              {sector}
                            </div>
                            <Progress value={compliance} className="flex-1" />
                            <div className="w-12 text-sm font-medium text-right">
                              {compliance}%
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Monthly Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        Inspections conducted
                      </span>
                      <span className="text-sm font-medium">
                        {INSPECTION_METRICS.completedThisMonth}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        Violations found
                      </span>
                      <span className="text-sm font-medium">
                        {INSPECTION_METRICS.violationsFound}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        Fines issued
                      </span>
                      <span className="text-sm font-medium">
                        {INSPECTION_METRICS.finesIssued}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        Total fine amount
                      </span>
                      <span className="text-sm font-medium">
                        €{INSPECTION_METRICS.totalFineAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        Average inspection time
                      </span>
                      <span className="text-sm font-medium">
                        {INSPECTION_METRICS.averageInspectionTime} minutes
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Inspection Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 mb-2">
                      {INSPECTION_METRICS.complianceRate}%
                    </div>
                    <div className="text-sm text-gray-600">
                      Overall Compliance Rate
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 mb-2">
                      {INSPECTION_METRICS.averageInspectionTime}m
                    </div>
                    <div className="text-sm text-gray-600">
                      Average Inspection Duration
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600 mb-2">
                      {(
                        (INSPECTION_METRICS.violationsFound /
                          INSPECTION_METRICS.totalInspections) *
                        100
                      ).toFixed(1)}
                      %
                    </div>
                    <div className="text-sm text-gray-600">
                      Violation Detection Rate
                    </div>
                  </div>
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
                  Inspector Portal Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">
                    Notification Preferences
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-medium">
                          High-risk company alerts
                        </label>
                        <p className="text-sm text-gray-600">
                          Receive notifications for high-risk companies
                        </p>
                      </div>
                      <Button variant="default" size="sm">
                        Enabled
                      </Button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-medium">
                          Inspection deadline reminders
                        </label>
                        <p className="text-sm text-gray-600">
                          Automatic reminders for scheduled inspections
                        </p>
                      </div>
                      <Button variant="default" size="sm">
                        Enabled
                      </Button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-medium">
                          Violation correction updates
                        </label>
                        <p className="text-sm text-gray-600">
                          Updates when companies correct violations
                        </p>
                      </div>
                      <Button variant="default" size="sm">
                        Enabled
                      </Button>
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
