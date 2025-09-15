/**
 * Tax Law Change Alerts - Notify of Greek labor law changes
 * Comprehensive system for monitoring and alerting on Greek tax law modifications
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
  Bell,
  AlertTriangle,
  CheckCircle,
  Clock,
  Euro,
  FileText,
  Users,
  Calendar,
  Download,
  Eye,
  Filter,
  Search,
  Settings,
  RefreshCw,
  BookOpen,
  Scale,
  Shield,
  TrendingUp,
  BarChart3,
  Activity,
  Target,
  Flag,
  Globe,
  Building,
  CreditCard,
  Calculator,
  Percent,
  Receipt,
  Briefcase,
  Factory,
  Hotel,
  ShoppingCart,
  Stethoscope,
  GraduationCap,
  Construction,
  Truck,
  Cpu,
  Zap,
  Star,
  Award,
  Info,
  AlertCircle,
  CheckCheck,
  XCircle,
  Plus,
  Edit,
  Trash2,
  Archive,
  History,
  Send,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';

interface TaxLawChange {
  id: string;
  title: string;
  titleEl: string;
  category:
    | 'income_tax'
    | 'social_security'
    | 'vat'
    | 'corporate_tax'
    | 'payroll_tax'
    | 'withholding_tax'
    | 'other';
  categoryEl: string;
  description: string;
  descriptionEl: string;
  effectiveDate: string;
  publishedDate: string;
  source: string;
  sourceEl: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  affectedSectors: string[];
  affectedEmployees: number;
  keyChanges: string[];
  keyChangesEl: string[];
  previousRate?: number;
  newRate?: number;
  complianceActions: string[];
  complianceActionsEl: string[];
  deadline?: string;
  status: 'published' | 'effective' | 'pending' | 'superseded';
  isUrgent: boolean;
  relatedLaws: string[];
  attachments: string[];
}

interface TaxAlert {
  id: string;
  taxLawId: string;
  alertType: 'immediate' | 'reminder' | 'deadline' | 'compliance';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  message: string;
  messageEl: string;
  scheduledDate: string;
  sentDate?: string;
  recipients: string[];
  status: 'scheduled' | 'sent' | 'failed' | 'cancelled';
  readBy: string[];
  actionRequired: boolean;
  actionDeadline?: string;
}

interface ComplianceTask {
  id: string;
  taxLawId: string;
  title: string;
  titleEl: string;
  description: string;
  descriptionEl: string;
  assignedTo: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  estimatedHours: number;
  completedDate?: string;
  notes?: string;
}

interface TaxLawMetrics {
  totalChanges: number;
  pendingChanges: number;
  criticalChanges: number;
  complianceRate: number;
  alertsSent: number;
  tasksCompleted: number;
  averageComplianceTime: number;
  sectorsAffected: number;
}

interface TaxLawAlertsProps {
  locale?: 'en' | 'el';
}

const TAX_LAW_CHANGES: TaxLawChange[] = [
  {
    id: 'tax-001',
    title: 'Income Tax Rate Adjustment for 2025',
    titleEl: 'Προσαρμογή Συντελεστών Φόρου Εισοδήματος για το 2025',
    category: 'income_tax',
    categoryEl: 'Φόρος Εισοδήματος',
    description:
      'Adjustment of income tax rates and tax brackets effective January 1, 2025. The first tax bracket remains at 9%, while higher brackets see reductions.',
    descriptionEl:
      'Προσαρμογή των συντελεστών φόρου εισοδήματος και των φορολογικών κλιμακίων με ισχύ από 1η Ιανουαρίου 2025. Η πρώτη κλίμακα παραμένει στο 9%, ενώ οι υψηλότερες κλίμακες μειώνονται.',
    effectiveDate: '2025-01-01',
    publishedDate: '2024-12-10',
    source: 'Ministry of Finance - Tax Policy Department',
    sourceEl: 'Υπουργείο Οικονομικών - Τμήμα Φορολογικής Πολιτικής',
    impact: 'high',
    affectedSectors: ['All sectors'],
    affectedEmployees: 4500000,
    keyChanges: [
      'First bracket (€0-€10,000): 9% (unchanged)',
      'Second bracket (€10,001-€20,000): 20% (reduced from 22%)',
      'Third bracket (€20,001-€30,000): 28% (reduced from 29%)',
      'Fourth bracket (€30,001-€40,000): 36% (reduced from 37%)',
      'Solidarity tax threshold increased to €12,000',
    ],
    keyChangesEl: [
      'Πρώτη κλίμακα (€0-€10.000): 9% (αμετάβλητη)',
      'Δεύτερη κλίμακα (€10.001-€20.000): 20% (μείωση από 22%)',
      'Τρίτη κλίμακα (€20.001-€30.000): 28% (μείωση από 29%)',
      'Τέταρτη κλίμακα (€30.001-€40.000): 36% (μείωση από 37%)',
      'Κατώφλι εισφοράς αλληλεγγύης αυξήθηκε σε €12.000',
    ],
    complianceActions: [
      'Update payroll systems with new tax rates',
      'Recalculate withholding tax for all employees',
      'Prepare tax adjustment forms',
      'Notify employees of tax changes',
    ],
    complianceActionsEl: [
      'Ενημέρωση συστημάτων μισθοδοσίας με νέους φορολογικούς συντελεστές',
      'Επανυπολογισμός παρακράτησης φόρου για όλους τους εργαζομένους',
      'Προετοιμασία φορμών φορολογικής προσαρμογής',
      'Ενημέρωση εργαζομένων για τις φορολογικές αλλαγές',
    ],
    deadline: '2024-12-31',
    status: 'published',
    isUrgent: true,
    relatedLaws: ['Law 4172/2013', 'Law 4549/2018'],
    attachments: ['tax_rates_2025.pdf', 'implementation_guide.pdf'],
  },
  {
    id: 'tax-002',
    title: 'Social Security Contribution Rates Update',
    titleEl: 'Ενημέρωση Συντελεστών Εισφορών Κοινωνικής Ασφάλισης',
    category: 'social_security',
    categoryEl: 'Κοινωνική Ασφάλιση',
    description:
      'Modification of social security contribution rates for employees and employers in the private sector, effective February 1, 2025.',
    descriptionEl:
      'Τροποποίηση των συντελεστών εισφορών κοινωνικής ασφάλισης για εργαζομένους και εργοδότες στον ιδιωτικό τομέα, με ισχύ από 1η Φεβρουαρίου 2025.',
    effectiveDate: '2025-02-01',
    publishedDate: '2024-12-05',
    source: 'EFKA - Unified Social Security Fund',
    sourceEl: 'e-ΕΦΚΑ - Ηλεκτρονικός Εθνικός Φορέας Κοινωνικής Ασφάλισης',
    impact: 'medium',
    affectedSectors: ['Private sector'],
    affectedEmployees: 2800000,
    keyChanges: [
      'Employee contribution: 16.0% (increased from 15.5%)',
      'Employer contribution: 24.56% (increased from 24.06%)',
      'Maximum monthly salary ceiling: €6,500',
      'Minimum contribution base: €760',
    ],
    keyChangesEl: [
      'Εισφορά εργαζομένου: 16.0% (αύξηση από 15.5%)',
      'Εισφορά εργοδότη: 24.56% (αύξηση από 24.06%)',
      'Μέγιστο μηνιαίο πλαφόν μισθού: €6.500',
      'Ελάχιστη βάση εισφοράς: €760',
    ],
    complianceActions: [
      'Update contribution calculation systems',
      'Adjust monthly payroll deductions',
      'Submit revised contribution declarations',
      'Update employee pay slips',
    ],
    complianceActionsEl: [
      'Ενημέρωση συστημάτων υπολογισμού εισφορών',
      'Προσαρμογή μηνιαίων παρακρατήσεων μισθοδοσίας',
      'Υποβολή αναθεωρημένων δηλώσεων εισφορών',
      'Ενημέρωση μισθολογικών καταστάσεων εργαζομένων',
    ],
    deadline: '2025-01-31',
    status: 'published',
    isUrgent: false,
    relatedLaws: ['Law 4387/2016', 'Law 4670/2020'],
    attachments: ['efka_rates_2025.pdf'],
  },
  {
    id: 'tax-003',
    title: 'VAT Rate Changes for Hospitality Sector',
    titleEl: 'Αλλαγές Συντελεστή ΦΠΑ για τον Κλάδο Φιλοξενίας',
    category: 'vat',
    categoryEl: 'ΦΠΑ',
    description:
      'Temporary reduction of VAT rates for hospitality services to support tourism recovery, effective March 1, 2025.',
    descriptionEl:
      'Προσωρινή μείωση των συντελεστών ΦΠΑ για υπηρεσίες φιλοξενίας για την υποστήριξη της ανάκαμψης του τουρισμού, με ισχύ από 1η Μαρτίου 2025.',
    effectiveDate: '2025-03-01',
    publishedDate: '2024-11-28',
    source: 'General Secretariat for Tax Policy',
    sourceEl: 'Γενική Γραμματεία Φορολογικής Πολιτικής',
    impact: 'medium',
    affectedSectors: ['Tourism', 'Hospitality', 'Restaurants'],
    affectedEmployees: 180000,
    keyChanges: [
      'Hotel accommodation: 13% VAT (reduced from 24%)',
      'Restaurant services: 13% VAT (reduced from 24%)',
      'Tourism services: 13% VAT (reduced from 24%)',
      'Valid until December 31, 2025',
    ],
    keyChangesEl: [
      'Ξενοδοχειακή διαμονή: 13% ΦΠΑ (μείωση από 24%)',
      'Υπηρεσίες εστίασης: 13% ΦΠΑ (μείωση από 24%)',
      'Τουριστικές υπηρεσίες: 13% ΦΠΑ (μείωση από 24%)',
      'Ισχύει έως 31 Δεκεμβρίου 2025',
    ],
    complianceActions: [
      'Update POS systems with new VAT rates',
      'Revise pricing strategies',
      'Update VAT return calculations',
      'Train staff on new rates',
    ],
    complianceActionsEl: [
      'Ενημέρωση συστημάτων POS με νέους συντελεστές ΦΠΑ',
      'Αναθεώρηση στρατηγικών τιμολόγησης',
      'Ενημέρωση υπολογισμών δηλώσεων ΦΠΑ',
      'Εκπαίδευση προσωπικού σε νέους συντελεστές',
    ],
    deadline: '2025-02-28',
    status: 'effective',
    isUrgent: false,
    relatedLaws: ['Law 2859/2000', 'VAT Code'],
    attachments: ['vat_hospitality_2025.pdf'],
  },
  {
    id: 'tax-004',
    title: 'Digital Nomad Tax Incentives',
    titleEl: 'Φορολογικά Κίνητρα για Ψηφιακούς Νομάδες',
    category: 'income_tax',
    categoryEl: 'Φόρος Εισοδήματος',
    description:
      'Introduction of special tax regime for digital nomads and remote workers relocating to Greece, effective April 1, 2025.',
    descriptionEl:
      'Εισαγωγή ειδικού φορολογικού καθεστώτος για ψηφιακούς νομάδες και εξ αποστάσεως εργαζομένους που μετεγκαθίστανται στην Ελλάδα, με ισχύ από 1η Απριλίου 2025.',
    effectiveDate: '2025-04-01',
    publishedDate: '2024-11-15',
    source: 'Ministry of Digital Governance',
    sourceEl: 'Υπουργείο Ψηφιακής Διακυβέρνησης',
    impact: 'low',
    affectedSectors: ['Technology', 'Professional Services'],
    affectedEmployees: 25000,
    keyChanges: [
      '50% tax reduction for first two years',
      'Minimum income threshold: €35,000',
      'Maximum benefit period: 7 years',
      'Must establish tax residency in Greece',
    ],
    keyChangesEl: [
      'Μείωση φόρου 50% για τα πρώτα δύο χρόνια',
      'Ελάχιστο όριο εισοδήματος: €35.000',
      'Μέγιστη περίοδος παροχής: 7 χρόνια',
      'Απαραίτητη η εγκατάσταση φορολογικής κατοικίας στην Ελλάδα',
    ],
    complianceActions: [
      'Prepare application procedures',
      'Update tax calculation systems',
      'Create employee information materials',
      'Establish tracking mechanisms',
    ],
    complianceActionsEl: [
      'Προετοιμασία διαδικασιών αίτησης',
      'Ενημέρωση συστημάτων υπολογισμού φόρου',
      'Δημιουργία ενημερωτικού υλικού εργαζομένων',
      'Εγκατάσταση μηχανισμών παρακολούθησης',
    ],
    deadline: '2025-03-31',
    status: 'pending',
    isUrgent: false,
    relatedLaws: ['Law 4251/2014'],
    attachments: ['digital_nomad_guide.pdf'],
  },
];

const TAX_ALERTS: TaxAlert[] = [
  {
    id: 'alert-001',
    taxLawId: 'tax-001',
    alertType: 'immediate',
    priority: 'urgent',
    message:
      'URGENT: Income tax rates changing January 1, 2025. Immediate action required.',
    messageEl:
      'ΕΠΕΙΓΟΝ: Αλλαγή συντελεστών φόρου εισοδήματος 1η Ιανουαρίου 2025. Απαιτείται άμεση ενέργεια.',
    scheduledDate: '2024-12-10',
    sentDate: '2024-12-10',
    recipients: ['hr@company.com', 'payroll@company.com'],
    status: 'sent',
    readBy: ['hr@company.com'],
    actionRequired: true,
    actionDeadline: '2024-12-31',
  },
  {
    id: 'alert-002',
    taxLawId: 'tax-002',
    alertType: 'reminder',
    priority: 'medium',
    message:
      'Reminder: Social security rates changing February 1, 2025. Update your systems.',
    messageEl:
      'Υπενθύμιση: Αλλαγή συντελεστών κοινωνικής ασφάλισης 1η Φεβρουαρίου 2025. Ενημερώστε τα συστήματά σας.',
    scheduledDate: '2025-01-15',
    recipients: ['payroll@company.com'],
    status: 'scheduled',
    readBy: [],
    actionRequired: true,
    actionDeadline: '2025-01-31',
  },
];

const COMPLIANCE_TASKS: ComplianceTask[] = [
  {
    id: 'task-001',
    taxLawId: 'tax-001',
    title: 'Update Payroll System Tax Rates',
    titleEl: 'Ενημέρωση Φορολογικών Συντελεστών Συστήματος Μισθοδοσίας',
    description:
      'Configure new income tax rates in payroll system for January 2025',
    descriptionEl:
      'Διαμόρφωση νέων συντελεστών φόρου εισοδήματος στο σύστημα μισθοδοσίας για Ιανουάριο 2025',
    assignedTo: 'Payroll Team',
    dueDate: '2024-12-28',
    priority: 'urgent',
    status: 'in_progress',
    estimatedHours: 8,
    notes: 'Testing phase completed, deploying to production',
  },
  {
    id: 'task-002',
    taxLawId: 'tax-001',
    title: 'Employee Tax Change Notification',
    titleEl: 'Ειδοποίηση Εργαζομένων για Αλλαγές Φόρου',
    description: 'Send notification to all employees about tax rate changes',
    descriptionEl:
      'Αποστολή ειδοποίησης σε όλους τους εργαζομένους για τις αλλαγές φορολογικών συντελεστών',
    assignedTo: 'HR Team',
    dueDate: '2024-12-30',
    priority: 'high',
    status: 'pending',
    estimatedHours: 4,
  },
];

const TAX_METRICS: TaxLawMetrics = {
  totalChanges: 28,
  pendingChanges: 5,
  criticalChanges: 3,
  complianceRate: 94.2,
  alertsSent: 156,
  tasksCompleted: 43,
  averageComplianceTime: 4.2,
  sectorsAffected: 12,
};

export default function TaxLawAlerts({ locale = 'en' }: TaxLawAlertsProps) {
  const [selectedTab, setSelectedTab] = useState('dashboard');
  const [changes, setChanges] = useState(TAX_LAW_CHANGES);
  const [alerts, setAlerts] = useState(TAX_ALERTS);
  const [tasks, setTasks] = useState(COMPLIANCE_TASKS);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedImpact, setSelectedImpact] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const translations = {
    en: {
      title: 'Tax Law Alerts',
      subtitle: 'Greek Labor Law Change Notifications',
      tabs: {
        dashboard: 'Dashboard',
        changes: 'Law Changes',
        alerts: 'Alert System',
        compliance: 'Compliance Tasks',
        reports: 'Reports',
        settings: 'Settings',
      },
      metrics: {
        totalChanges: 'Total Changes',
        pendingChanges: 'Pending Changes',
        criticalChanges: 'Critical Changes',
        complianceRate: 'Compliance Rate',
        alertsSent: 'Alerts Sent',
        tasksCompleted: 'Tasks Completed',
        averageComplianceTime: 'Avg Compliance Time',
        sectorsAffected: 'Sectors Affected',
      },
      categories: {
        income_tax: 'Income Tax',
        social_security: 'Social Security',
        vat: 'VAT',
        corporate_tax: 'Corporate Tax',
        payroll_tax: 'Payroll Tax',
        withholding_tax: 'Withholding Tax',
        other: 'Other',
      },
      impact: {
        low: 'Low Impact',
        medium: 'Medium Impact',
        high: 'High Impact',
        critical: 'Critical Impact',
      },
      status: {
        published: 'Published',
        effective: 'Effective',
        pending: 'Pending',
        superseded: 'Superseded',
        scheduled: 'Scheduled',
        sent: 'Sent',
        failed: 'Failed',
        cancelled: 'Cancelled',
        in_progress: 'In Progress',
        completed: 'Completed',
        overdue: 'Overdue',
      },
      actions: {
        refreshAlerts: 'Refresh Alerts',
        viewDetails: 'View Details',
        createAlert: 'Create Alert',
        assignTask: 'Assign Task',
        markComplete: 'Mark Complete',
        exportReport: 'Export Report',
        subscribeAlerts: 'Subscribe to Alerts',
        downloadAttachment: 'Download Attachment',
        editSettings: 'Edit Settings',
      },
      alertTypes: {
        immediate: 'Immediate',
        reminder: 'Reminder',
        deadline: 'Deadline',
        compliance: 'Compliance',
      },
      priority: {
        low: 'Low',
        medium: 'Medium',
        high: 'High',
        urgent: 'Urgent',
      },
    },
    el: {
      title: 'Ειδοποιήσεις Φορολογικών Νόμων',
      subtitle: 'Ειδοποιήσεις Αλλαγών Ελληνικού Εργατικού Δικαίου',
      tabs: {
        dashboard: 'Ταμπλό',
        changes: 'Αλλαγές Νόμων',
        alerts: 'Σύστημα Ειδοποιήσεων',
        compliance: 'Εργασίες Συμμόρφωσης',
        reports: 'Αναφορές',
        settings: 'Ρυθμίσεις',
      },
      metrics: {
        totalChanges: 'Σύνολο Αλλαγών',
        pendingChanges: 'Εκκρεμείς Αλλαγές',
        criticalChanges: 'Κρίσιμες Αλλαγές',
        complianceRate: 'Ποσοστό Συμμόρφωσης',
        alertsSent: 'Ειδοποιήσεις Απεσταλμένες',
        tasksCompleted: 'Εργασίες Ολοκληρωμένες',
        averageComplianceTime: 'Μέσος Χρόνος Συμμόρφωσης',
        sectorsAffected: 'Επηρεαζόμενοι Κλάδοι',
      },
      categories: {
        income_tax: 'Φόρος Εισοδήματος',
        social_security: 'Κοινωνική Ασφάλιση',
        vat: 'ΦΠΑ',
        corporate_tax: 'Εταιρικός Φόρος',
        payroll_tax: 'Φόρος Μισθοδοσίας',
        withholding_tax: 'Παρακράτηση Φόρου',
        other: 'Άλλο',
      },
      impact: {
        low: 'Χαμηλός Αντίκτυπος',
        medium: 'Μέτριος Αντίκτυπος',
        high: 'Υψηλός Αντίκτυπος',
        critical: 'Κρίσιμος Αντίκτυπος',
      },
      status: {
        published: 'Δημοσιευμένο',
        effective: 'Σε Ισχύ',
        pending: 'Εκκρεμεί',
        superseded: 'Αντικαταστάθηκε',
        scheduled: 'Προγραμματισμένο',
        sent: 'Απεσταλμένο',
        failed: 'Αποτυχημένο',
        cancelled: 'Ακυρωμένο',
        in_progress: 'Σε Εξέλιξη',
        completed: 'Ολοκληρωμένο',
        overdue: 'Εκπρόθεσμο',
      },
      actions: {
        refreshAlerts: 'Ανανέωση Ειδοποιήσεων',
        viewDetails: 'Προβολή Λεπτομερειών',
        createAlert: 'Δημιουργία Ειδοποίησης',
        assignTask: 'Ανάθεση Εργασίας',
        markComplete: 'Σήμανση ως Ολοκληρωμένο',
        exportReport: 'Εξαγωγή Αναφοράς',
        subscribeAlerts: 'Εγγραφή σε Ειδοποιήσεις',
        downloadAttachment: 'Λήψη Συνημμένου',
        editSettings: 'Επεξεργασία Ρυθμίσεων',
      },
      alertTypes: {
        immediate: 'Άμεση',
        reminder: 'Υπενθύμιση',
        deadline: 'Προθεσμία',
        compliance: 'Συμμόρφωση',
      },
      priority: {
        low: 'Χαμηλή',
        medium: 'Μέτρια',
        high: 'Υψηλή',
        urgent: 'Επείγουσα',
      },
    },
  };

  const t = translations[locale];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'income_tax':
        return Calculator;
      case 'social_security':
        return Users;
      case 'vat':
        return Receipt;
      case 'corporate_tax':
        return Building;
      case 'payroll_tax':
        return Euro;
      case 'withholding_tax':
        return Percent;
      default:
        return FileText;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
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
      case 'published':
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'effective':
      case 'sent':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'superseded':
      case 'failed':
      case 'cancelled':
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'text-green-600';
      case 'medium':
        return 'text-yellow-600';
      case 'high':
        return 'text-orange-600';
      case 'urgent':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const filteredChanges = changes.filter(change => {
    const categoryMatch =
      selectedCategory === 'all' || change.category === selectedCategory;
    const impactMatch =
      selectedImpact === 'all' || change.impact === selectedImpact;
    const searchMatch =
      searchTerm === '' ||
      change.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      change.titleEl.toLowerCase().includes(searchTerm.toLowerCase()) ||
      change.description.toLowerCase().includes(searchTerm.toLowerCase());

    return categoryMatch && impactMatch && searchMatch;
  });

  const handleRefreshAlerts = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsRefreshing(false);
  };

  const handleMarkTaskComplete = (taskId: string) => {
    setTasks(prev =>
      prev.map(task =>
        task.id === taskId
          ? {
              ...task,
              status: 'completed',
              completedDate: new Date().toISOString().split('T')[0],
            }
          : task
      )
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Bell className="h-8 w-8 text-orange-600" />
                </div>
                {t.title}
              </h1>
              <p className="text-gray-600 ml-12">{t.subtitle}</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleRefreshAlerts}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {t.actions.refreshAlerts}
                  </>
                )}
              </Button>
              <Button className="bg-orange-600 hover:bg-orange-700">
                <Download className="h-4 w-4 mr-2" />
                {t.actions.exportReport}
              </Button>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4 mb-6">
            <Card className="p-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {TAX_METRICS.totalChanges}
                </div>
                <div className="text-xs text-orange-100">
                  {t.metrics.totalChanges}
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {TAX_METRICS.pendingChanges}
                </div>
                <div className="text-xs text-yellow-100">
                  {t.metrics.pendingChanges}
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-r from-red-500 to-red-600 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {TAX_METRICS.criticalChanges}
                </div>
                <div className="text-xs text-red-100">
                  {t.metrics.criticalChanges}
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-r from-green-500 to-green-600 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {TAX_METRICS.complianceRate}%
                </div>
                <div className="text-xs text-green-100">
                  {t.metrics.complianceRate}
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {TAX_METRICS.alertsSent}
                </div>
                <div className="text-xs text-purple-100">
                  {t.metrics.alertsSent}
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {TAX_METRICS.tasksCompleted}
                </div>
                <div className="text-xs text-blue-100">
                  {t.metrics.tasksCompleted}
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {TAX_METRICS.averageComplianceTime}d
                </div>
                <div className="text-xs text-indigo-100">
                  {t.metrics.averageComplianceTime}
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {TAX_METRICS.sectorsAffected}
                </div>
                <div className="text-xs text-teal-100">
                  {t.metrics.sectorsAffected}
                </div>
              </div>
            </Card>
          </div>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="dashboard">{t.tabs.dashboard}</TabsTrigger>
            <TabsTrigger value="changes">{t.tabs.changes}</TabsTrigger>
            <TabsTrigger value="alerts">{t.tabs.alerts}</TabsTrigger>
            <TabsTrigger value="compliance">{t.tabs.compliance}</TabsTrigger>
            <TabsTrigger value="reports">{t.tabs.reports}</TabsTrigger>
            <TabsTrigger value="settings">{t.tabs.settings}</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Critical Changes Alert */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-600">
                      <AlertTriangle className="h-5 w-5" />
                      Critical Tax Law Changes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {changes
                        .filter(change => change.impact === 'critical')
                        .map(change => {
                          const CategoryIcon = getCategoryIcon(change.category);

                          return (
                            <div
                              key={change.id}
                              className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50"
                            >
                              <div className="flex items-center gap-4">
                                <div className="p-2 bg-red-100 rounded-lg">
                                  <CategoryIcon className="h-5 w-5 text-red-600" />
                                </div>
                                <div>
                                  <div className="font-medium">
                                    {locale === 'en'
                                      ? change.title
                                      : change.titleEl}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    Effective: {change.effectiveDate} • Affects{' '}
                                    {change.affectedEmployees.toLocaleString()}{' '}
                                    employees
                                  </div>
                                  {change.isUrgent && (
                                    <Badge className="bg-red-600 text-white text-xs mt-1">
                                      URGENT
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button size="sm" variant="outline">
                                  <Eye className="h-4 w-4 mr-1" />
                                  {t.actions.viewDetails}
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  {t.actions.createAlert}
                                </Button>
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
                    <Activity className="h-5 w-5 text-blue-600" />
                    Recent Tax Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3 text-sm">
                    <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                    <div>
                      <div className="font-medium">
                        Income tax rates updated
                      </div>
                      <div className="text-gray-600">
                        Effective January 1, 2025
                      </div>
                      <div className="text-xs text-gray-500">2 hours ago</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 text-sm">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                    <div>
                      <div className="font-medium">Social security rates</div>
                      <div className="text-gray-600">
                        e-EFKA contribution update
                      </div>
                      <div className="text-xs text-gray-500">1 day ago</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <div className="font-medium">VAT rate reduction</div>
                      <div className="text-gray-600">
                        Hospitality sector 13% VAT
                      </div>
                      <div className="text-xs text-gray-500">5 days ago</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 text-sm">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div>
                      <div className="font-medium">
                        Digital nomad incentives
                      </div>
                      <div className="text-gray-600">
                        New tax regime published
                      </div>
                      <div className="text-xs text-gray-500">2 weeks ago</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Compliance Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Compliance Progress by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-6">
                  {Object.entries(t.categories).map(([key, category]) => {
                    const CategoryIcon = getCategoryIcon(key);
                    const progress =
                      [95, 87, 92, 89, 91, 94][
                        Object.keys(t.categories).indexOf(key)
                      ] || 90;

                    return (
                      <div key={key} className="text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <CategoryIcon className="h-8 w-8 text-gray-600" />
                        </div>
                        <h3 className="font-semibold text-sm mb-2">
                          {category}
                        </h3>
                        <div className="text-2xl font-bold mb-2">
                          {progress}%
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Law Changes Tab */}
          <TabsContent value="changes" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filter Tax Law Changes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-4">
                  <Select
                    value={selectedCategory}
                    onValueChange={setSelectedCategory}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {Object.entries(t.categories).map(([key, category]) => (
                        <SelectItem key={key} value={key}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={selectedImpact}
                    onValueChange={setSelectedImpact}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Impact Levels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Impact Levels</SelectItem>
                      {Object.entries(t.impact).map(([key, impact]) => (
                        <SelectItem key={key} value={key}>
                          {impact}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    placeholder="Search changes..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />

                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedCategory('all');
                      setSelectedImpact('all');
                      setSearchTerm('');
                    }}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Changes List */}
            <div className="grid gap-4">
              {filteredChanges.map(change => {
                const CategoryIcon = getCategoryIcon(change.category);

                return (
                  <Card
                    key={change.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-4">
                          <div className="p-2 bg-orange-100 rounded-lg">
                            <CategoryIcon className="h-6 w-6 text-orange-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg mb-1">
                              {locale === 'en' ? change.title : change.titleEl}
                            </h3>
                            <p className="text-gray-600 text-sm mb-2">
                              {locale === 'en'
                                ? change.description
                                : change.descriptionEl}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span>Effective: {change.effectiveDate}</span>
                              <span>Published: {change.publishedDate}</span>
                              <span>
                                Source:{' '}
                                {locale === 'en'
                                  ? change.source
                                  : change.sourceEl}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {change.isUrgent && (
                            <Badge className="bg-red-600 text-white">
                              URGENT
                            </Badge>
                          )}
                          <Badge className={getStatusColor(change.status)}>
                            {t.status[change.status as keyof typeof t.status]}
                          </Badge>
                          <Badge
                            className={`${getImpactColor(change.impact)} border-current`}
                            variant="outline"
                          >
                            {t.impact[change.impact as keyof typeof t.impact]}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-1">
                            Affected Employees
                          </div>
                          <div className="text-lg font-bold text-blue-600">
                            {change.affectedEmployees.toLocaleString()}
                          </div>
                        </div>

                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-1">
                            Category
                          </div>
                          <div className="text-sm font-medium">
                            {locale === 'en'
                              ? t.categories[
                                  change.category as keyof typeof t.categories
                                ]
                              : change.categoryEl}
                          </div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          Key Changes
                        </div>
                        <div className="space-y-1">
                          {(locale === 'en'
                            ? change.keyChanges
                            : change.keyChangesEl
                          )
                            .slice(0, 3)
                            .map((keyChange, index) => (
                              <div
                                key={index}
                                className="text-sm text-gray-600 flex items-center gap-2"
                              >
                                <CheckCircle className="h-3 w-3 text-green-600" />
                                {keyChange}
                              </div>
                            ))}
                          {change.keyChanges.length > 3 && (
                            <div className="text-sm text-blue-600">
                              +{change.keyChanges.length - 3} more changes
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          Compliance Actions Required
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(locale === 'en'
                            ? change.complianceActions
                            : change.complianceActionsEl
                          )
                            .slice(0, 2)
                            .map((action, index) => (
                              <Badge
                                key={index}
                                variant="outline"
                                className="text-xs"
                              >
                                {action}
                              </Badge>
                            ))}
                          {change.complianceActions.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{change.complianceActions.length - 2} more
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>
                            Sectors: {change.affectedSectors.join(', ')}
                          </span>
                          {change.deadline && (
                            <span className="text-red-600 font-medium">
                              Deadline: {change.deadline}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-1" />
                            {t.actions.viewDetails}
                          </Button>
                          <Button size="sm" variant="outline">
                            <Bell className="h-4 w-4 mr-1" />
                            {t.actions.createAlert}
                          </Button>
                          <Button
                            size="sm"
                            className="bg-orange-600 hover:bg-orange-700"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            {t.actions.assignTask}
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
                  Tax Law Alert System
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {alerts.map(alert => {
                    const change = changes.find(c => c.id === alert.taxLawId);

                    return (
                      <div key={alert.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-3">
                            <div
                              className={`p-2 rounded-lg ${getPriorityColor(alert.priority)} bg-opacity-10`}
                            >
                              <Bell
                                className={`h-5 w-5 ${getPriorityColor(alert.priority)}`}
                              />
                            </div>
                            <div>
                              <h3 className="font-semibold">
                                {locale === 'en'
                                  ? change?.title
                                  : change?.titleEl}
                              </h3>
                              <p className="text-sm text-gray-600 mt-1">
                                {locale === 'en'
                                  ? alert.message
                                  : alert.messageEl}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                                <span>
                                  Type:{' '}
                                  {
                                    t.alertTypes[
                                      alert.alertType as keyof typeof t.alertTypes
                                    ]
                                  }
                                </span>
                                <span>Scheduled: {alert.scheduledDate}</span>
                                {alert.sentDate && (
                                  <span>Sent: {alert.sentDate}</span>
                                )}
                                <span>
                                  Recipients: {alert.recipients.length}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(alert.status)}>
                              {t.status[alert.status as keyof typeof t.status]}
                            </Badge>
                            <Badge
                              className={`${getPriorityColor(alert.priority)} border-current`}
                              variant="outline"
                            >
                              {
                                t.priority[
                                  alert.priority as keyof typeof t.priority
                                ]
                              }
                            </Badge>
                          </div>
                        </div>

                        {alert.actionRequired && (
                          <div className="mb-3 p-2 bg-yellow-50 rounded text-sm text-yellow-800 border border-yellow-200">
                            <AlertTriangle className="h-4 w-4 inline mr-1" />
                            Action required
                            {alert.actionDeadline &&
                              ` by ${alert.actionDeadline}`}
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            {alert.readBy.length > 0 && (
                              <span>
                                Read by: {alert.readBy.length} of{' '}
                                {alert.recipients.length}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4 mr-1" />
                              View Details
                            </Button>
                            {alert.status === 'scheduled' && (
                              <Button size="sm" variant="outline">
                                <Edit className="h-4 w-4 mr-1" />
                                Edit Alert
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

          {/* Compliance Tab */}
          <TabsContent value="compliance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Compliance Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tasks.map(task => {
                    const change = changes.find(c => c.id === task.taxLawId);

                    return (
                      <div key={task.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold">
                              {locale === 'en' ? task.title : task.titleEl}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                              {locale === 'en'
                                ? task.description
                                : task.descriptionEl}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                              <span>
                                Related:{' '}
                                {locale === 'en'
                                  ? change?.title
                                  : change?.titleEl}
                              </span>
                              <span>Due: {task.dueDate}</span>
                              <span>Assigned: {task.assignedTo}</span>
                              <span>Est: {task.estimatedHours}h</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(task.status)}>
                              {t.status[task.status as keyof typeof t.status]}
                            </Badge>
                            <Badge
                              className={`${getPriorityColor(task.priority)} border-current`}
                              variant="outline"
                            >
                              {
                                t.priority[
                                  task.priority as keyof typeof t.priority
                                ]
                              }
                            </Badge>
                          </div>
                        </div>

                        {task.notes && (
                          <div className="mb-3 p-2 bg-blue-50 rounded text-sm text-blue-700">
                            <Info className="h-4 w-4 inline mr-1" />
                            {task.notes}
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-600">
                            {task.completedDate && (
                              <span>Completed: {task.completedDate}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4 mr-1" />
                              Details
                            </Button>
                            {task.status !== 'completed' && (
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => handleMarkTaskComplete(task.id)}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                {t.actions.markComplete}
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
                    Compliance by Category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(t.categories).map(([key, category]) => {
                      const progress =
                        [95, 87, 92, 89, 91, 94][
                          Object.keys(t.categories).indexOf(key)
                        ] || 90;
                      return (
                        <div key={key} className="flex items-center gap-3">
                          <div className="w-24 text-sm font-medium">
                            {category}
                          </div>
                          <Progress value={progress} className="flex-1" />
                          <div className="w-12 text-sm font-medium text-right">
                            {progress}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Monthly Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        Tax law changes tracked
                      </span>
                      <span className="text-sm font-medium">28</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Alerts sent</span>
                      <span className="text-sm font-medium">156</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        Tasks completed
                      </span>
                      <span className="text-sm font-medium">43</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        Average compliance time
                      </span>
                      <span className="text-sm font-medium">4.2 days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        Sectors affected
                      </span>
                      <span className="text-sm font-medium">12</span>
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
                  Alert Settings
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
                          Email alerts for critical changes
                        </label>
                        <p className="text-sm text-gray-600">
                          Immediate notification for urgent tax law changes
                        </p>
                      </div>
                      <Button variant="default" size="sm">
                        Enabled
                      </Button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-medium">
                          Weekly digest reports
                        </label>
                        <p className="text-sm text-gray-600">
                          Summary of all tax law changes and compliance status
                        </p>
                      </div>
                      <Button variant="default" size="sm">
                        Enabled
                      </Button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-medium">
                          Deadline reminders
                        </label>
                        <p className="text-sm text-gray-600">
                          Automatic reminders for compliance deadlines
                        </p>
                      </div>
                      <Button variant="default" size="sm">
                        Enabled
                      </Button>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">
                    Monitoring Categories
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(t.categories).map(([key, category]) => (
                      <div
                        key={key}
                        className="flex items-center gap-2 p-3 border rounded-lg"
                      >
                        <input
                          type="checkbox"
                          defaultChecked
                          className="rounded"
                        />
                        <span className="text-sm font-medium">{category}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button variant="outline">Reset to Defaults</Button>
                  <Button className="bg-orange-600 hover:bg-orange-700">
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
