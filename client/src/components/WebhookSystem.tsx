/**
 * Webhook System - Real-time data sync with other systems
 * Comprehensive webhook management and real-time synchronization platform
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Zap,
  Globe,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Repeat,
  Send,
  Settings,
  Eye,
  Download,
  RefreshCw,
  Filter,
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  BarChart3,
  PieChart,
  LineChart,
  Target,
  Shield,
  Key,
  Link,
  Database,
  Server,
  Code,
  Bell,
  Mail,
  Phone,
  Calendar,
  Euro,
  Users,
  Building,
  FileText,
  Receipt,
  Scale,
  Award,
  Briefcase,
  Calculator,
  CreditCard,
  Factory,
  Hotel,
  ShoppingCart,
  Stethoscope,
  GraduationCap,
  Construction,
  Cpu,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Minus,
  Info,
  BookOpen,
  Search,
  History,
  TrendingUp,
  TrendingDown,
  Star,
  Flag,
  MapPin
} from 'lucide-react';

interface WebhookEndpoint {
  id: string;
  name: string;
  nameEl: string;
  url: string;
  method: 'POST' | 'PUT' | 'PATCH';
  status: 'active' | 'inactive' | 'failed';
  events: string[];
  headers: Record<string, string>;
  authentication: {
    type: 'none' | 'bearer' | 'basic' | 'signature';
    token?: string;
    secret?: string;
  };
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelay: number;
  };
  filters: {
    conditions: Record<string, any>;
  };
  createdAt: string;
  lastTriggered: string;
  successRate: number;
  totalCalls: number;
  failedCalls: number;
}

interface WebhookEvent {
  id: string;
  name: string;
  nameEl: string;
  description: string;
  descriptionEl: string;
  category: string;
  categoryEl: string;
  schema: Record<string, any>;
  frequency: 'high' | 'medium' | 'low';
  enabled: boolean;
  lastTriggered: string;
  totalTriggers: number;
  subscribedEndpoints: number;
}

interface WebhookDelivery {
  id: string;
  endpointId: string;
  endpointName: string;
  event: string;
  status: 'success' | 'failed' | 'pending' | 'retrying';
  attempts: number;
  maxAttempts: number;
  responseCode: number;
  responseTime: number;
  payload: Record<string, any>;
  error: string | null;
  timestamp: string;
  nextRetry: string | null;
}

interface IntegrationTemplate {
  id: string;
  name: string;
  nameEl: string;
  description: string;
  descriptionEl: string;
  provider: string;
  category: 'hr' | 'accounting' | 'analytics' | 'compliance' | 'payroll';
  logo: string;
  events: string[];
  authRequired: boolean;
  configurable: boolean;
  popular: boolean;
}

interface WebhookSystemProps {
  locale?: 'en' | 'el';
}

const WEBHOOK_ENDPOINTS: WebhookEndpoint[] = [
  {
    id: 'hr-system-sync',
    name: 'HR Management System',
    nameEl: 'Σύστημα Διαχείρισης ΑΠ',
    url: 'https://api.hrmanager.example.com/webhooks/payroll-sync',
    method: 'POST',
    status: 'active',
    events: ['employee.created', 'employee.updated', 'payroll.processed'],
    headers: {
      'Content-Type': 'application/json',
      'X-API-Version': '2.1'
    },
    authentication: {
      type: 'bearer',
      token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...'
    },
    retryPolicy: {
      maxRetries: 3,
      backoffMultiplier: 2,
      initialDelay: 1000
    },
    filters: {
      conditions: {}
    },
    createdAt: '2025-01-15T10:30:00Z',
    lastTriggered: '2025-01-20T14:22:15Z',
    successRate: 98.5,
    totalCalls: 1247,
    failedCalls: 18
  },
  {
    id: 'accounting-integration',
    name: 'Accounting Software Integration',
    nameEl: 'Ολοκλήρωση Λογισμικού Λογιστικής',
    url: 'https://accounting.example.com/api/v2/webhooks/payroll',
    method: 'POST',
    status: 'active',
    events: ['payroll.completed', 'expense.created', 'payment.processed'],
    headers: {
      'Content-Type': 'application/json',
      'X-Company-ID': 'GR123456789'
    },
    authentication: {
      type: 'signature',
      secret: 'webhook_secret_key_2024'
    },
    retryPolicy: {
      maxRetries: 5,
      backoffMultiplier: 1.5,
      initialDelay: 2000
    },
    filters: {
      conditions: {
        'amount': { 'gte': 100 }
      }
    },
    createdAt: '2025-01-10T09:15:00Z',
    lastTriggered: '2025-01-20T13:45:30Z',
    successRate: 94.2,
    totalCalls: 892,
    failedCalls: 52
  },
  {
    id: 'bank-api-connector',
    name: 'Banking API Connector',
    nameEl: 'Συνδετήρας API Τράπεζας',
    url: 'https://api.alphabank.gr/corporate/payments/webhook',
    method: 'POST',
    status: 'failed',
    events: ['payment.initiated', 'payment.completed', 'sepa.processed'],
    headers: {
      'Content-Type': 'application/json',
      'X-Bank-Code': 'CRBAGRAA'
    },
    authentication: {
      type: 'basic',
      token: 'Y29ycG9yYXRlX3VzZXI6cGFzc3dvcmQxMjM='
    },
    retryPolicy: {
      maxRetries: 3,
      backoffMultiplier: 2,
      initialDelay: 1500
    },
    filters: {
      conditions: {}
    },
    createdAt: '2025-01-18T16:20:00Z',
    lastTriggered: '2025-01-20T08:30:12Z',
    successRate: 76.3,
    totalCalls: 156,
    failedCalls: 37
  },
  {
    id: 'ergani-compliance-sync',
    name: 'ERGANI Compliance Sync',
    nameEl: 'Συγχρονισμός Συμμόρφωσης ΕΡΓΑΝΗ',
    url: 'https://services.ergani.gov.gr/api/external/notifications',
    method: 'POST',
    status: 'active',
    events: ['declaration.submitted', 'employee.registered', 'hours.reported'],
    headers: {
      'Content-Type': 'application/json',
      'X-Source-System': 'PayrollSync'
    },
    authentication: {
      type: 'bearer',
      token: 'Bearer_Token_ERGANI_2025'
    },
    retryPolicy: {
      maxRetries: 2,
      backoffMultiplier: 3,
      initialDelay: 5000
    },
    filters: {
      conditions: {}
    },
    createdAt: '2025-01-12T11:45:00Z',
    lastTriggered: '2025-01-20T15:10:45Z',
    successRate: 99.1,
    totalCalls: 2143,
    failedCalls: 19
  },
  {
    id: 'analytics-dashboard',
    name: 'Analytics Dashboard Feed',
    nameEl: 'Τροφοδοσία Πίνακα Αναλυτικών',
    url: 'https://analytics.company.com/api/webhooks/hr-metrics',
    method: 'POST',
    status: 'inactive',
    events: ['metrics.calculated', 'report.generated', 'kpi.updated'],
    headers: {
      'Content-Type': 'application/json'
    },
    authentication: {
      type: 'none'
    },
    retryPolicy: {
      maxRetries: 1,
      backoffMultiplier: 1,
      initialDelay: 1000
    },
    filters: {
      conditions: {}
    },
    createdAt: '2025-01-08T14:30:00Z',
    lastTriggered: '2025-01-19T12:20:18Z',
    successRate: 100.0,
    totalCalls: 67,
    failedCalls: 0
  }
];

const WEBHOOK_EVENTS: WebhookEvent[] = [
  {
    id: 'employee.created',
    name: 'Employee Created',
    nameEl: 'Εργαζόμενος Δημιουργήθηκε',
    description: 'Triggered when a new employee is added to the system',
    descriptionEl: 'Ενεργοποιείται όταν προστίθεται νέος εργαζόμενος στο σύστημα',
    category: 'Employee Management',
    categoryEl: 'Διαχείριση Εργαζομένων',
    schema: {
      employee_id: 'string',
      full_name: 'string',
      email: 'string',
      hire_date: 'date',
      position: 'string',
      department: 'string'
    },
    frequency: 'medium',
    enabled: true,
    lastTriggered: '2025-01-20T14:22:15Z',
    totalTriggers: 47,
    subscribedEndpoints: 3
  },
  {
    id: 'payroll.processed',
    name: 'Payroll Processed',
    nameEl: 'Μισθοδοσία Επεξεργάστηκε',
    description: 'Triggered when monthly payroll processing is completed',
    descriptionEl: 'Ενεργοποιείται όταν ολοκληρώνεται η μηνιαία επεξεργασία μισθοδοσίας',
    category: 'Payroll',
    categoryEl: 'Μισθοδοσία',
    schema: {
      payroll_id: 'string',
      period: 'string',
      total_amount: 'number',
      employee_count: 'number',
      processed_date: 'date'
    },
    frequency: 'low',
    enabled: true,
    lastTriggered: '2025-01-20T13:45:30Z',
    totalTriggers: 12,
    subscribedEndpoints: 4
  },
  {
    id: 'compliance.alert',
    name: 'Compliance Alert',
    nameEl: 'Ειδοποίηση Συμμόρφωσης',
    description: 'Triggered when compliance risks or violations are detected',
    descriptionEl: 'Ενεργοποιείται όταν εντοπίζονται κίνδυνοι ή παραβάσεις συμμόρφωσης',
    category: 'Compliance',
    categoryEl: 'Συμμόρφωση',
    schema: {
      alert_id: 'string',
      type: 'string',
      severity: 'string',
      description: 'string',
      deadline: 'date'
    },
    frequency: 'high',
    enabled: true,
    lastTriggered: '2025-01-20T15:10:45Z',
    totalTriggers: 156,
    subscribedEndpoints: 2
  },
  {
    id: 'payment.initiated',
    name: 'Payment Initiated',
    nameEl: 'Πληρωμή Εκκινήθηκε',
    description: 'Triggered when a salary payment is initiated to banking system',
    descriptionEl: 'Ενεργοποιείται όταν εκκινείται πληρωμή μισθού στο τραπεζικό σύστημα',
    category: 'Payments',
    categoryEl: 'Πληρωμές',
    schema: {
      payment_id: 'string',
      employee_id: 'string',
      amount: 'number',
      currency: 'string',
      bank_account: 'string'
    },
    frequency: 'medium',
    enabled: true,
    lastTriggered: '2025-01-20T12:30:22Z',
    totalTriggers: 89,
    subscribedEndpoints: 2
  },
  {
    id: 'report.generated',
    name: 'Report Generated',
    nameEl: 'Αναφορά Δημιουργήθηκε',
    description: 'Triggered when scheduled reports are generated and ready',
    descriptionEl: 'Ενεργοποιείται όταν προγραμματισμένες αναφορές δημιουργούνται και είναι έτοιμες',
    category: 'Reporting',
    categoryEl: 'Αναφορές',
    schema: {
      report_id: 'string',
      type: 'string',
      period: 'string',
      format: 'string',
      download_url: 'string'
    },
    frequency: 'low',
    enabled: false,
    lastTriggered: '2025-01-19T12:20:18Z',
    totalTriggers: 23,
    subscribedEndpoints: 1
  }
];

const RECENT_DELIVERIES: WebhookDelivery[] = [
  {
    id: 'delivery-001',
    endpointId: 'ergani-compliance-sync',
    endpointName: 'ERGANI Compliance Sync',
    event: 'compliance.alert',
    status: 'success',
    attempts: 1,
    maxAttempts: 2,
    responseCode: 200,
    responseTime: 145,
    payload: {
      alert_id: 'alert-12345',
      type: 'overtime_violation',
      severity: 'high',
      description: 'Employee overtime exceeds legal limits',
      deadline: '2025-01-25T00:00:00Z'
    },
    error: null,
    timestamp: '2025-01-20T15:10:45Z',
    nextRetry: null
  },
  {
    id: 'delivery-002',
    endpointId: 'hr-system-sync',
    endpointName: 'HR Management System',
    event: 'employee.created',
    status: 'success',
    attempts: 1,
    maxAttempts: 3,
    responseCode: 201,
    responseTime: 89,
    payload: {
      employee_id: 'emp-67890',
      full_name: 'Maria Papadopoulos',
      email: 'maria.papadopoulos@company.com',
      hire_date: '2025-01-20',
      position: 'Software Developer',
      department: 'Engineering'
    },
    error: null,
    timestamp: '2025-01-20T14:22:15Z',
    nextRetry: null
  },
  {
    id: 'delivery-003',
    endpointId: 'bank-api-connector',
    endpointName: 'Banking API Connector',
    event: 'payment.initiated',
    status: 'failed',
    attempts: 3,
    maxAttempts: 3,
    responseCode: 500,
    responseTime: 2340,
    payload: {
      payment_id: 'pay-54321',
      employee_id: 'emp-11111',
      amount: 2450.00,
      currency: 'EUR',
      bank_account: 'GR1601101250000000012300695'
    },
    error: 'Internal server error: Database connection timeout',
    timestamp: '2025-01-20T13:15:30Z',
    nextRetry: '2025-01-20T16:15:30Z'
  },
  {
    id: 'delivery-004',
    endpointId: 'accounting-integration',
    endpointName: 'Accounting Software Integration',
    event: 'payroll.processed',
    status: 'success',
    attempts: 2,
    maxAttempts: 5,
    responseCode: 200,
    responseTime: 567,
    payload: {
      payroll_id: 'payroll-202501',
      period: '2025-01',
      total_amount: 125600.50,
      employee_count: 48,
      processed_date: '2025-01-20T13:45:30Z'
    },
    error: null,
    timestamp: '2025-01-20T13:45:30Z',
    nextRetry: null
  },
  {
    id: 'delivery-005',
    endpointId: 'analytics-dashboard',
    endpointName: 'Analytics Dashboard Feed',
    event: 'report.generated',
    status: 'retrying',
    attempts: 1,
    maxAttempts: 1,
    responseCode: 429,
    responseTime: 1200,
    payload: {
      report_id: 'rpt-weekly-001',
      type: 'weekly_summary',
      period: '2025-01-13_2025-01-19',
      format: 'pdf',
      download_url: 'https://storage.company.com/reports/weekly-001.pdf'
    },
    error: 'Rate limit exceeded',
    timestamp: '2025-01-20T12:20:18Z',
    nextRetry: '2025-01-20T13:20:18Z'
  }
];

const INTEGRATION_TEMPLATES: IntegrationTemplate[] = [
  {
    id: 'workday-integration',
    name: 'Workday HCM',
    nameEl: 'Workday HCM',
    description: 'Sync employee data and payroll information with Workday',
    descriptionEl: 'Συγχρονισμός δεδομένων εργαζομένων και μισθοδοσίας με Workday',
    provider: 'Workday',
    category: 'hr',
    logo: '🏢',
    events: ['employee.created', 'employee.updated', 'payroll.processed'],
    authRequired: true,
    configurable: true,
    popular: true
  },
  {
    id: 'sage-accounting',
    name: 'Sage Accounting',
    nameEl: 'Sage Λογιστικά',
    description: 'Integrate payroll data with Sage accounting software',
    descriptionEl: 'Ολοκλήρωση δεδομένων μισθοδοσίας με λογισμικό λογιστικής Sage',
    provider: 'Sage',
    category: 'accounting',
    logo: '📊',
    events: ['payroll.completed', 'expense.created', 'payment.processed'],
    authRequired: true,
    configurable: true,
    popular: true
  },
  {
    id: 'power-bi-analytics',
    name: 'Power BI Analytics',
    nameEl: 'Power BI Αναλυτικά',
    description: 'Push HR metrics and KPIs to Power BI dashboards',
    descriptionEl: 'Αποστολή μετρικών ΑΠ και ΔΕΔ σε πίνακες ελέγχου Power BI',
    provider: 'Microsoft',
    category: 'analytics',
    logo: '📈',
    events: ['metrics.calculated', 'report.generated', 'kpi.updated'],
    authRequired: true,
    configurable: false,
    popular: false
  },
  {
    id: 'slack-notifications',
    name: 'Slack Notifications',
    nameEl: 'Ειδοποιήσεις Slack',
    description: 'Send HR alerts and updates to Slack channels',
    descriptionEl: 'Αποστολή ειδοποιήσεων και ενημερώσεων ΑΠ σε κανάλια Slack',
    provider: 'Slack',
    category: 'compliance',
    logo: '💬',
    events: ['compliance.alert', 'employee.created', 'payroll.completed'],
    authRequired: true,
    configurable: true,
    popular: true
  },
  {
    id: 'adp-payroll',
    name: 'ADP Payroll',
    nameEl: 'ADP Μισθοδοσία',
    description: 'Sync payroll data with ADP payroll management system',
    descriptionEl: 'Συγχρονισμός δεδομένων μισθοδοσίας με σύστημα διαχείρισης ADP',
    provider: 'ADP',
    category: 'payroll',
    logo: '💰',
    events: ['payroll.processed', 'employee.updated', 'payment.initiated'],
    authRequired: true,
    configurable: true,
    popular: false
  }
];

export default function WebhookSystem({ locale = 'en' }: WebhookSystemProps) {
  const [selectedTab, setSelectedTab] = useState('dashboard');
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<string>('all');
  const [deliveryFilter, setDeliveryFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const translations = {
    en: {
      title: 'Webhook System',
      subtitle: 'Real-time Data Sync with Other Systems',
      tabs: {
        dashboard: 'Dashboard',
        endpoints: 'Endpoints',
        events: 'Events',
        deliveries: 'Deliveries',
        templates: 'Templates',
        settings: 'Settings'
      },
      dashboard: {
        activeEndpoints: 'Active Endpoints',
        totalDeliveries: 'Total Deliveries',
        successRate: 'Overall Success Rate',
        averageResponseTime: 'Avg Response Time',
        recentActivity: 'Recent Activity',
        topEvents: 'Top Events',
        endpointStatus: 'Endpoint Status',
        deliveryMetrics: 'Delivery Metrics'
      },
      status: {
        active: 'Active',
        inactive: 'Inactive',
        failed: 'Failed',
        success: 'Success',
        pending: 'Pending',
        retrying: 'Retrying'
      },
      frequency: {
        high: 'High Frequency',
        medium: 'Medium Frequency',
        low: 'Low Frequency'
      },
      authentication: {
        none: 'No Authentication',
        bearer: 'Bearer Token',
        basic: 'Basic Auth',
        signature: 'Signature Verification'
      },
      actions: {
        create: 'Create Webhook',
        edit: 'Edit',
        delete: 'Delete',
        enable: 'Enable',
        disable: 'Disable',
        test: 'Test',
        retry: 'Retry',
        viewDetails: 'View Details',
        viewLogs: 'View Logs',
        downloadReport: 'Download Report',
        exportData: 'Export Data',
        refreshData: 'Refresh Data',
        configure: 'Configure',
        install: 'Install',
        connect: 'Connect'
      },
      filters: {
        endpoint: 'Filter by Endpoint',
        event: 'Filter by Event',
        status: 'Filter by Status',
        all: 'All'
      },
      categories: {
        hr: 'HR Systems',
        accounting: 'Accounting',
        analytics: 'Analytics',
        compliance: 'Compliance',
        payroll: 'Payroll'
      }
    },
    el: {
      title: 'Σύστημα Webhooks',
      subtitle: 'Συγχρονισμός Δεδομένων Πραγματικού Χρόνου με Άλλα Συστήματα',
      tabs: {
        dashboard: 'Πίνακας Ελέγχου',
        endpoints: 'Σημεία Τερματισμού',
        events: 'Γεγονότα',
        deliveries: 'Παραδόσεις',
        templates: 'Πρότυπα',
        settings: 'Ρυθμίσεις'
      },
      dashboard: {
        activeEndpoints: 'Ενεργά Σημεία Τερματισμού',
        totalDeliveries: 'Συνολικές Παραδόσεις',
        successRate: 'Συνολικός Ρυθμός Επιτυχίας',
        averageResponseTime: 'Μέσος Χρόνος Απόκρισης',
        recentActivity: 'Πρόσφατη Δραστηριότητα',
        topEvents: 'Κυριότερα Γεγονότα',
        endpointStatus: 'Κατάσταση Σημείων Τερματισμού',
        deliveryMetrics: 'Μετρικές Παράδοσης'
      },
      status: {
        active: 'Ενεργό',
        inactive: 'Ανενεργό',
        failed: 'Αποτυχημένο',
        success: 'Επιτυχία',
        pending: 'Εκκρεμές',
        retrying: 'Επανάληψη'
      },
      frequency: {
        high: 'Υψηλή Συχνότητα',
        medium: 'Μέτρια Συχνότητα',
        low: 'Χαμηλή Συχνότητα'
      },
      authentication: {
        none: 'Χωρίς Πιστοποίηση',
        bearer: 'Bearer Token',
        basic: 'Βασική Πιστοποίηση',
        signature: 'Επαλήθευση Υπογραφής'
      },
      actions: {
        create: 'Δημιουργία Webhook',
        edit: 'Επεξεργασία',
        delete: 'Διαγραφή',
        enable: 'Ενεργοποίηση',
        disable: 'Απενεργοποίηση',
        test: 'Δοκιμή',
        retry: 'Επανάληψη',
        viewDetails: 'Προβολή Λεπτομερειών',
        viewLogs: 'Προβολή Αρχείων Καταγραφής',
        downloadReport: 'Λήψη Αναφοράς',
        exportData: 'Εξαγωγή Δεδομένων',
        refreshData: 'Ανανέωση Δεδομένων',
        configure: 'Διαμόρφωση',
        install: 'Εγκατάσταση',
        connect: 'Σύνδεση'
      },
      filters: {
        endpoint: 'Φιλτράρισμα κατά Σημείο Τερματισμού',
        event: 'Φιλτράρισμα κατά Γεγονός',
        status: 'Φιλτράρισμα κατά Κατάσταση',
        all: 'Όλα'
      },
      categories: {
        hr: 'Συστήματα ΑΠ',
        accounting: 'Λογιστικά',
        analytics: 'Αναλυτικά',
        compliance: 'Συμμόρφωση',
        payroll: 'Μισθοδοσία'
      }
    }
  };

  const t = translations[locale];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'success': return 'text-green-600 bg-green-100';
      case 'inactive': return 'text-gray-600 bg-gray-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-blue-600 bg-blue-100';
      case 'retrying': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getFrequencyColor = (frequency: string) => {
    switch (frequency) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'hr': return Users;
      case 'accounting': return Calculator;
      case 'analytics': return BarChart3;
      case 'compliance': return Scale;
      case 'payroll': return Euro;
      default: return Globe;
    }
  };

  const filteredEndpoints = WEBHOOK_ENDPOINTS.filter(endpoint => {
    if (selectedEndpoint !== 'all' && endpoint.id !== selectedEndpoint) return false;
    return true;
  });

  const filteredEvents = WEBHOOK_EVENTS.filter(event => {
    if (selectedEvent !== 'all' && event.id !== selectedEvent) return false;
    return true;
  });

  const filteredDeliveries = RECENT_DELIVERIES.filter(delivery => {
    if (deliveryFilter !== 'all' && delivery.status !== deliveryFilter) return false;
    return true;
  });

  const activeEndpoints = WEBHOOK_ENDPOINTS.filter(e => e.status === 'active').length;
  const totalDeliveries = WEBHOOK_ENDPOINTS.reduce((sum, e) => sum + e.totalCalls, 0);
  const overallSuccessRate = (totalDeliveries - WEBHOOK_ENDPOINTS.reduce((sum, e) => sum + e.failedCalls, 0)) / totalDeliveries * 100;
  const averageResponseTime = Math.round(RECENT_DELIVERIES.reduce((sum, d) => sum + d.responseTime, 0) / RECENT_DELIVERIES.length);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Zap className="h-8 w-8 text-blue-600" />
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
                <Plus className="h-4 w-4 mr-2" />
                {t.actions.create}
              </Button>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="p-4 bg-gradient-to-r from-green-500 to-green-600 text-white">
              <div className="text-center">
                <div className="text-3xl font-bold">{activeEndpoints}</div>
                <div className="text-xs text-green-100">{t.dashboard.activeEndpoints}</div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <div className="text-center">
                <div className="text-3xl font-bold">{totalDeliveries.toLocaleString()}</div>
                <div className="text-xs text-blue-100">{t.dashboard.totalDeliveries}</div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <div className="text-center">
                <div className="text-3xl font-bold">{overallSuccessRate.toFixed(1)}%</div>
                <div className="text-xs text-purple-100">{t.dashboard.successRate}</div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
              <div className="text-center">
                <div className="text-3xl font-bold">{averageResponseTime}ms</div>
                <div className="text-xs text-orange-100">{t.dashboard.averageResponseTime}</div>
              </div>
            </Card>
          </div>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="dashboard">{t.tabs.dashboard}</TabsTrigger>
            <TabsTrigger value="endpoints">{t.tabs.endpoints}</TabsTrigger>
            <TabsTrigger value="events">{t.tabs.events}</TabsTrigger>
            <TabsTrigger value="deliveries">{t.tabs.deliveries}</TabsTrigger>
            <TabsTrigger value="templates">{t.tabs.templates}</TabsTrigger>
            <TabsTrigger value="settings">{t.tabs.settings}</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Recent Activity */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-blue-600" />
                      {t.dashboard.recentActivity}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {RECENT_DELIVERIES.slice(0, 4).map((delivery) => (
                        <div key={delivery.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Badge className={getStatusColor(delivery.status)}>
                              {t.status[delivery.status as keyof typeof t.status]}
                            </Badge>
                            <div>
                              <div className="font-medium text-sm">{delivery.endpointName}</div>
                              <div className="text-xs text-gray-600">
                                {delivery.event} • {new Date(delivery.timestamp).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold">
                              {delivery.responseCode || 'N/A'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {delivery.responseTime}ms
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Endpoint Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5 text-green-600" />
                    {t.dashboard.endpointStatus}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {['active', 'inactive', 'failed'].map((status) => {
                      const count = WEBHOOK_ENDPOINTS.filter(e => e.status === status).length;
                      return (
                        <div key={status} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(status)}>
                              {t.status[status as keyof typeof t.status]}
                            </Badge>
                          </div>
                          <div className="font-bold text-lg">{count}</div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Events */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  {t.dashboard.topEvents}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  {WEBHOOK_EVENTS.slice(0, 3).map((event) => (
                    <div key={event.id} className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge className={getFrequencyColor(event.frequency)}>
                          {t.frequency[event.frequency as keyof typeof t.frequency]}
                        </Badge>
                        <Badge variant="outline">
                          {event.subscribedEndpoints} endpoints
                        </Badge>
                      </div>
                      <h3 className="font-semibold mb-2">
                        {locale === 'en' ? event.name : event.nameEl}
                      </h3>
                      <div className="text-sm text-gray-600 mb-3">
                        {locale === 'en' ? event.category : event.categoryEl}
                      </div>
                      <div className="text-xs text-gray-500">
                        {event.totalTriggers} triggers • Last: {new Date(event.lastTriggered).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Endpoints Tab */}
          <TabsContent value="endpoints" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Endpoint Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <Select value={selectedEndpoint} onValueChange={setSelectedEndpoint}>
                    <SelectTrigger>
                      <SelectValue placeholder={t.filters.endpoint} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t.filters.all}</SelectItem>
                      {WEBHOOK_ENDPOINTS.map((endpoint) => (
                        <SelectItem key={endpoint.id} value={endpoint.id}>
                          {locale === 'en' ? endpoint.name : endpoint.nameEl}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button variant="outline" onClick={() => setSelectedEndpoint('all')}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>

                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    {t.actions.create}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Endpoints List */}
            <div className="space-y-4">
              {filteredEndpoints.map((endpoint) => (
                <Card key={endpoint.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">
                            {locale === 'en' ? endpoint.name : endpoint.nameEl}
                          </h3>
                          <Badge className={getStatusColor(endpoint.status)}>
                            {t.status[endpoint.status as keyof typeof t.status]}
                          </Badge>
                          <Badge variant="outline">
                            {endpoint.method}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 mb-3">
                          {endpoint.url}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>Events: {endpoint.events.length}</span>
                          <span>Success Rate: {endpoint.successRate}%</span>
                          <span>Total Calls: {endpoint.totalCalls}</span>
                          <span>Last Triggered: {new Date(endpoint.lastTriggered).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="text-sm font-medium text-gray-700 mb-2">Success Rate</div>
                      <Progress value={endpoint.successRate} className="h-2" />
                    </div>

                    <div className="grid md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <div className="text-xs font-medium text-gray-700">Authentication</div>
                        <div className="text-sm">
                          {t.authentication[endpoint.authentication.type as keyof typeof t.authentication]}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-medium text-gray-700">Max Retries</div>
                        <div className="text-sm">{endpoint.retryPolicy.maxRetries}</div>
                      </div>

                      <div>
                        <div className="text-xs font-medium text-gray-700">Created</div>
                        <div className="text-sm">{new Date(endpoint.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="text-sm font-medium text-gray-700 mb-2">Subscribed Events</div>
                      <div className="flex flex-wrap gap-2">
                        {endpoint.events.map((event, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {event}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        ID: {endpoint.id}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline">
                          <Play className="h-4 w-4 mr-1" />
                          {t.actions.test}
                        </Button>
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4 mr-1" />
                          {t.actions.edit}
                        </Button>
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-1" />
                          {t.actions.viewLogs}
                        </Button>
                        <Switch 
                          checked={endpoint.status === 'active'}
                          disabled={endpoint.status === 'failed'}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Webhook Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredEvents.map((event) => (
                    <div key={event.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold">
                              {locale === 'en' ? event.name : event.nameEl}
                            </h3>
                            <Badge className={getFrequencyColor(event.frequency)}>
                              {t.frequency[event.frequency as keyof typeof t.frequency]}
                            </Badge>
                            <Badge variant="outline">
                              {event.subscribedEndpoints} endpoints
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600 mb-2">
                            {locale === 'en' ? event.description : event.descriptionEl}
                          </div>
                          <div className="text-xs text-gray-500">
                            Category: {locale === 'en' ? event.category : event.categoryEl}
                          </div>
                        </div>
                        <Switch checked={event.enabled} />
                      </div>

                      <div className="grid md:grid-cols-3 gap-4 mb-3">
                        <div>
                          <div className="text-xs font-medium text-gray-700">Total Triggers</div>
                          <div className="text-lg font-bold text-blue-600">{event.totalTriggers}</div>
                        </div>

                        <div>
                          <div className="text-xs font-medium text-gray-700">Subscribed Endpoints</div>
                          <div className="text-lg font-bold text-green-600">{event.subscribedEndpoints}</div>
                        </div>

                        <div>
                          <div className="text-xs font-medium text-gray-700">Last Triggered</div>
                          <div className="text-sm">{new Date(event.lastTriggered).toLocaleDateString()}</div>
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">Data Schema</div>
                        <div className="bg-gray-50 p-3 rounded text-xs font-mono">
                          <pre>{JSON.stringify(event.schema, null, 2)}</pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Deliveries Tab */}
          <TabsContent value="deliveries" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Send className="h-5 w-5" />
                    Recent Deliveries
                  </CardTitle>
                  <Select value={deliveryFilter} onValueChange={setDeliveryFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder={t.filters.status} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t.filters.all}</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="retrying">Retrying</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredDeliveries.map((delivery) => (
                    <div key={delivery.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge className={getStatusColor(delivery.status)}>
                              {t.status[delivery.status as keyof typeof t.status]}
                            </Badge>
                            <Badge variant="outline">
                              {delivery.responseCode || 'N/A'}
                            </Badge>
                            <span className="text-sm text-gray-600">
                              {delivery.attempts}/{delivery.maxAttempts} attempts
                            </span>
                          </div>
                          <h3 className="font-semibold mb-1">{delivery.endpointName}</h3>
                          <div className="text-sm text-gray-600">
                            Event: {delivery.event} • {new Date(delivery.timestamp).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">
                            {delivery.responseTime}ms
                          </div>
                          {delivery.nextRetry && (
                            <div className="text-xs text-gray-500">
                              Next retry: {new Date(delivery.nextRetry).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>

                      {delivery.error && (
                        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                          Error: {delivery.error}
                        </div>
                      )}

                      <div className="text-sm">
                        <div className="font-medium text-gray-700 mb-2">Payload Preview</div>
                        <div className="bg-gray-50 p-3 rounded text-xs font-mono max-h-32 overflow-y-auto">
                          <pre>{JSON.stringify(delivery.payload, null, 2)}</pre>
                        </div>
                      </div>

                      {delivery.status === 'failed' && delivery.attempts < delivery.maxAttempts && (
                        <div className="flex justify-end mt-3">
                          <Button size="sm" variant="outline">
                            <Repeat className="h-4 w-4 mr-1" />
                            {t.actions.retry}
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Integration Templates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {INTEGRATION_TEMPLATES.map((template) => {
                    const CategoryIcon = getCategoryIcon(template.category);
                    
                    return (
                      <div key={template.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                        <div className="flex items-start gap-3 mb-4">
                          <div className="text-3xl">{template.logo}</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">
                                {locale === 'en' ? template.name : template.nameEl}
                              </h3>
                              {template.popular && (
                                <Badge className="bg-yellow-100 text-yellow-800">
                                  <Star className="h-3 w-3 mr-1" />
                                  Popular
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 mb-2">
                              by {template.provider}
                            </div>
                            <Badge className="text-xs" variant="outline">
                              <CategoryIcon className="h-3 w-3 mr-1" />
                              {t.categories[template.category as keyof typeof t.categories]}
                            </Badge>
                          </div>
                        </div>

                        <p className="text-sm text-gray-600 mb-4">
                          {locale === 'en' ? template.description : template.descriptionEl}
                        </p>

                        <div className="mb-4">
                          <div className="text-xs font-medium text-gray-700 mb-2">Events ({template.events.length})</div>
                          <div className="flex flex-wrap gap-1">
                            {template.events.slice(0, 3).map((event, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {event}
                              </Badge>
                            ))}
                            {template.events.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{template.events.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            {template.authRequired && (
                              <div className="flex items-center gap-1">
                                <Key className="h-3 w-3" />
                                Auth Required
                              </div>
                            )}
                            {template.configurable && (
                              <div className="flex items-center gap-1">
                                <Settings className="h-3 w-3" />
                                Configurable
                              </div>
                            )}
                          </div>
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                            <Link className="h-4 w-4 mr-1" />
                            {t.actions.connect}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
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
                  Webhook Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Global Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-medium">Default Timeout</label>
                        <p className="text-sm text-gray-600">Default request timeout for all webhooks</p>
                      </div>
                      <div className="w-32">
                        <Input type="number" defaultValue="30" />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-medium">Max Retry Attempts</label>
                        <p className="text-sm text-gray-600">Maximum number of retry attempts</p>
                      </div>
                      <div className="w-32">
                        <Input type="number" defaultValue="3" />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-medium">Rate Limiting</label>
                        <p className="text-sm text-gray-600">Maximum requests per minute</p>
                      </div>
                      <div className="w-32">
                        <Input type="number" defaultValue="100" />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-medium">Enable Logging</label>
                        <p className="text-sm text-gray-600">Log all webhook requests and responses</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
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