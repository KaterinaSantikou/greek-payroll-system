/**
 * Real-Time Error Tracking Dashboard
 * Comprehensive error monitoring and resolution system for PayrollSync
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertTriangle,
  AlertCircle,
  XCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  Eye,
  Zap,
  Shield,
  Globe,
  Server,
  Database,
  CreditCard,
  Users,
  Settings,
  RefreshCw,
  Search,
  Filter,
  Download,
  Bell,
  BellOff,
  ArrowRight,
  BarChart3,
  PieChart,
  LineChart,
  Bug,
  Code,
  Network,
  Timer,
  Target
} from 'lucide-react';

interface ErrorEvent {
  id: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'api' | 'payment' | 'validation' | 'security' | 'performance' | 'integration';
  source: string;
  message: string;
  details: string;
  stack?: string;
  userImpacted: boolean;
  resolved: boolean;
  assignedTo?: string;
  resolution?: string;
  customerFacing: boolean;
  greekIntegration?: string;
  affectedUsers: number;
  businessImpact: 'none' | 'low' | 'medium' | 'high' | 'critical';
  environment: 'production' | 'staging' | 'development';
  tags: string[];
}

interface ErrorMetric {
  id: string;
  name: string;
  nameEl: string;
  value: number;
  previousValue: number;
  target: number;
  status: 'good' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
  category: string;
  description: string;
  descriptionEl: string;
}

interface SystemHealth {
  component: string;
  componentEl: string;
  status: 'healthy' | 'degraded' | 'down';
  uptime: number;
  responseTime: number;
  errorRate: number;
  lastIncident?: string;
  criticalForPayroll: boolean;
}

const ERROR_EVENTS: ErrorEvent[] = [
  {
    id: 'err-001',
    timestamp: '2025-01-20T15:45:00Z',
    severity: 'critical',
    category: 'integration',
    source: 'ERGANI II API',
    message: 'Connection timeout to ERGANI II government system',
    details: 'Failed to submit employee work card data after 3 retries',
    userImpacted: true,
    resolved: false,
    customerFacing: true,
    greekIntegration: 'ERGANI II',
    affectedUsers: 12,
    businessImpact: 'high',
    environment: 'production',
    tags: ['government', 'compliance', 'timeout', 'urgent']
  },
  {
    id: 'err-002',
    timestamp: '2025-01-20T15:30:00Z',
    severity: 'high',
    category: 'payment',
    source: 'Alpha Bank SEPA',
    message: 'Salary payment batch validation failed',
    details: 'Invalid IBAN format detected in batch payment file',
    userImpacted: true,
    resolved: true,
    assignedTo: 'maria.payroll@santikos.gr',
    resolution: 'IBAN validation rules updated, batch reprocessed successfully',
    customerFacing: true,
    affectedUsers: 47,
    businessImpact: 'medium',
    environment: 'production',
    tags: ['payment', 'sepa', 'validation', 'resolved']
  },
  {
    id: 'err-003',
    timestamp: '2025-01-20T15:15:00Z',
    severity: 'medium',
    category: 'validation',
    source: 'Payroll Engine',
    message: 'Invalid AFM format in employee data',
    details: 'Employee AFM 123456789 does not match Greek tax number format',
    userImpacted: false,
    resolved: true,
    customerFacing: false,
    affectedUsers: 1,
    businessImpact: 'low',
    environment: 'production',
    tags: ['validation', 'afm', 'greek-compliance']
  },
  {
    id: 'err-004',
    timestamp: '2025-01-20T14:55:00Z',
    severity: 'low',
    category: 'performance',
    source: 'Database Query',
    message: 'Slow query detected in payroll calculation',
    details: 'Query execution time: 3.2s (threshold: 2s)',
    userImpacted: false,
    resolved: false,
    customerFacing: false,
    affectedUsers: 0,
    businessImpact: 'none',
    environment: 'production',
    tags: ['performance', 'database', 'optimization']
  },
  {
    id: 'err-005',
    timestamp: '2025-01-20T14:40:00Z',
    severity: 'high',
    category: 'security',
    source: 'Authentication Service',
    message: 'Multiple failed login attempts detected',
    details: 'Suspicious login activity from IP: 185.23.45.67',
    userImpacted: false,
    resolved: true,
    customerFacing: false,
    affectedUsers: 0,
    businessImpact: 'low',
    environment: 'production',
    tags: ['security', 'brute-force', 'blocked']
  }
];

const ERROR_METRICS: ErrorMetric[] = [
  {
    id: 'error-rate',
    name: 'Error Rate',
    nameEl: 'Ποσοστό Σφαλμάτων',
    value: 0.12,
    previousValue: 0.18,
    target: 0.1,
    status: 'warning',
    trend: 'down',
    category: 'Overall',
    description: 'Percentage of requests resulting in errors',
    descriptionEl: 'Ποσοστό αιτημάτων που καταλήγουν σε σφάλματα'
  },
  {
    id: 'mttr',
    name: 'Mean Time to Resolution',
    nameEl: 'Μέσος Χρόνος Επίλυσης',
    value: 14.5,
    previousValue: 22.3,
    target: 15,
    status: 'good',
    trend: 'down',
    category: 'Response',
    description: 'Average time to resolve critical errors (minutes)',
    descriptionEl: 'Μέσος χρόνος επίλυσης κρίσιμων σφαλμάτων (λεπτά)'
  },
  {
    id: 'uptime',
    name: 'System Uptime',
    nameEl: 'Χρόνος Λειτουργίας Συστήματος',
    value: 99.97,
    previousValue: 99.92,
    target: 99.95,
    status: 'good',
    trend: 'up',
    category: 'Reliability',
    description: 'Percentage of time systems are operational',
    descriptionEl: 'Ποσοστό χρόνου που τα συστήματα λειτουργούν'
  },
  {
    id: 'customer-impact',
    name: 'Customer-Facing Errors',
    nameEl: 'Σφάλματα Πελατών',
    value: 3,
    previousValue: 8,
    target: 2,
    status: 'warning',
    trend: 'down',
    category: 'Customer Experience',
    description: 'Number of errors affecting customer experience',
    descriptionEl: 'Αριθμός σφαλμάτων που επηρεάζουν την εμπειρία πελάτη'
  },
  {
    id: 'greek-integration-health',
    name: 'Greek Integration Health',
    nameEl: 'Υγεία Ελληνικών Ενσωματώσεων',
    value: 98.5,
    previousValue: 96.8,
    target: 99,
    status: 'good',
    trend: 'up',
    category: 'Government Systems',
    description: 'Health score of ERGANI II, e-EFKA connections',
    descriptionEl: 'Βαθμός υγείας συνδέσεων ΕΡΓΑΝΗ ΙΙ, e-ΕΦΚΑ'
  },
  {
    id: 'payment-success-rate',
    name: 'Payment Success Rate',
    nameEl: 'Ποσοστό Επιτυχίας Πληρωμών',
    value: 99.8,
    previousValue: 99.6,
    target: 99.9,
    status: 'good',
    trend: 'up',
    category: 'Payments',
    description: 'Percentage of successful SEPA salary payments',
    descriptionEl: 'Ποσοστό επιτυχών πληρωμών μισθών SEPA'
  }
];

const SYSTEM_HEALTH: SystemHealth[] = [
  {
    component: 'ERGANI II Integration',
    componentEl: 'Ενσωμάτωση ΕΡΓΑΝΗ ΙΙ',
    status: 'degraded',
    uptime: 98.2,
    responseTime: 1250,
    errorRate: 2.1,
    lastIncident: '2025-01-20T15:45:00Z',
    criticalForPayroll: true
  },
  {
    component: 'e-EFKA Integration',
    componentEl: 'Ενσωμάτωση e-ΕΦΚΑ',
    status: 'healthy',
    uptime: 99.8,
    responseTime: 450,
    errorRate: 0.1,
    criticalForPayroll: true
  },
  {
    component: 'Alpha Bank SEPA',
    componentEl: 'Alpha Bank SEPA',
    status: 'healthy',
    uptime: 99.9,
    responseTime: 320,
    errorRate: 0.05,
    criticalForPayroll: true
  },
  {
    component: 'Payroll Engine',
    componentEl: 'Μηχανή Μισθοδοσίας',
    status: 'healthy',
    uptime: 99.95,
    responseTime: 180,
    errorRate: 0.02,
    criticalForPayroll: true
  },
  {
    component: 'Database Cluster',
    componentEl: 'Συστάδα Βάσης Δεδομένων',
    status: 'healthy',
    uptime: 100,
    responseTime: 85,
    errorRate: 0,
    criticalForPayroll: true
  },
  {
    component: 'Authentication Service',
    componentEl: 'Υπηρεσία Αυθεντικοποίησης',
    status: 'healthy',
    uptime: 99.97,
    responseTime: 120,
    errorRate: 0.03,
    criticalForPayroll: false
  }
];

interface ErrorTrackingDashboardProps {
  locale?: 'en' | 'el';
}

export default function ErrorTrackingDashboard({ locale = 'en' }: ErrorTrackingDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedError, setSelectedError] = useState<ErrorEvent | null>(null);
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Simulate real-time updates
  useEffect(() => {
    if (!realTimeEnabled) return;
    
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [realTimeEnabled]);

  const translations = {
    en: {
      title: 'Real-Time Error Tracking',
      subtitle: 'Fix issues before customers notice - Comprehensive error monitoring and resolution',
      overview: 'Error Overview',
      realTime: 'Real-Time Monitor',
      analytics: 'Error Analytics',
      resolution: 'Issue Resolution',
      systemHealth: 'System Health',
      errorRate: 'Error Rate',
      totalErrors: 'Total Errors',
      criticalErrors: 'Critical Errors',
      resolvedToday: 'Resolved Today',
      mttr: 'MTTR',
      uptime: 'Uptime',
      lastUpdate: 'Last Update',
      severity: 'Severity',
      category: 'Category',
      source: 'Source',
      affectedUsers: 'Affected Users',
      resolved: 'Resolved',
      unresolved: 'Unresolved',
      assignTo: 'Assign To',
      markResolved: 'Mark Resolved',
      viewDetails: 'View Details',
      realTimeMonitoring: 'Real-Time Monitoring',
      enableAlerts: 'Enable Alerts',
      downloadReport: 'Download Report',
      filterErrors: 'Filter Errors',
      refreshData: 'Refresh Data',
      businessImpact: 'Business Impact',
      customerFacing: 'Customer Facing',
      greekIntegrations: 'Greek Integrations',
      paymentSystems: 'Payment Systems',
      securityAlerts: 'Security Alerts',
      performanceIssues: 'Performance Issues',
      healthStatus: {
        healthy: 'Healthy',
        degraded: 'Degraded',
        down: 'Down'
      },
      severityLevels: {
        low: 'Low',
        medium: 'Medium', 
        high: 'High',
        critical: 'Critical'
      },
      categories: {
        api: 'API Integration',
        payment: 'Payment Processing',
        validation: 'Data Validation',
        security: 'Security',
        performance: 'Performance',
        integration: 'System Integration'
      },
      trends: {
        up: 'Trending Up',
        down: 'Trending Down',
        stable: 'Stable'
      }
    },
    el: {
      title: 'Παρακολούθηση Σφαλμάτων σε Πραγματικό Χρόνο',
      subtitle: 'Διορθώστε προβλήματα πριν τα παρατηρήσουν οι πελάτες - Ολοκληρωμένη παρακολούθηση και επίλυση σφαλμάτων',
      overview: 'Επισκόπηση Σφαλμάτων',
      realTime: 'Παρακολούθηση σε Πραγματικό Χρόνο',
      analytics: 'Αναλυτικά Σφαλμάτων',
      resolution: 'Επίλυση Ζητημάτων',
      systemHealth: 'Υγεία Συστήματος',
      errorRate: 'Ποσοστό Σφαλμάτων',
      totalErrors: 'Συνολικά Σφάλματα',
      criticalErrors: 'Κρίσιμα Σφάλματα',
      resolvedToday: 'Επιλύθηκαν Σήμερα',
      mttr: 'Μέσος Χρόνος Επίλυσης',
      uptime: 'Χρόνος Λειτουργίας',
      lastUpdate: 'Τελευταία Ενημέρωση',
      severity: 'Σοβαρότητα',
      category: 'Κατηγορία',
      source: 'Πηγή',
      affectedUsers: 'Επηρεασμένοι Χρήστες',
      resolved: 'Επιλύθηκε',
      unresolved: 'Μη Επιλύθηκε',
      assignTo: 'Ανάθεση σε',
      markResolved: 'Σήμανση ως Επιλύθηκε',
      viewDetails: 'Προβολή Λεπτομερειών',
      realTimeMonitoring: 'Παρακολούθηση σε Πραγματικό Χρόνο',
      enableAlerts: 'Ενεργοποίηση Ειδοποιήσεων',
      downloadReport: 'Λήψη Αναφοράς',
      filterErrors: 'Φιλτράρισμα Σφαλμάτων',
      refreshData: 'Ανανέωση Δεδομένων',
      businessImpact: 'Επιχειρηματικός Αντίκτυπος',
      customerFacing: 'Προς Πελάτες',
      greekIntegrations: 'Ελληνικές Ενσωματώσεις',
      paymentSystems: 'Συστήματα Πληρωμών',
      securityAlerts: 'Ειδοποιήσεις Ασφαλείας',
      performanceIssues: 'Ζητήματα Απόδοσης',
      healthStatus: {
        healthy: 'Υγιής',
        degraded: 'Υποβαθμισμένο',
        down: 'Εκτός Λειτουργίας'
      },
      severityLevels: {
        low: 'Χαμηλό',
        medium: 'Μέτριο',
        high: 'Υψηλό', 
        critical: 'Κρίσιμο'
      },
      categories: {
        api: 'Ενσωμάτωση API',
        payment: 'Επεξεργασία Πληρωμών',
        validation: 'Επικύρωση Δεδομένων',
        security: 'Ασφάλεια',
        performance: 'Απόδοση',
        integration: 'Ενσωμάτωση Συστήματος'
      },
      trends: {
        up: 'Ανοδική Τάση',
        down: 'Καθοδική Τάση',
        stable: 'Σταθερό'
      }
    }
  };

  const t = translations[locale];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-blue-100 text-blue-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'low': return AlertCircle;
      case 'medium': return AlertTriangle;
      case 'high': return XCircle;
      case 'critical': return XCircle;
      default: return AlertCircle;
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800';
      case 'degraded': return 'bg-yellow-100 text-yellow-800';
      case 'down': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy': return CheckCircle;
      case 'degraded': return AlertTriangle;
      case 'down': return XCircle;
      default: return AlertCircle;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return TrendingUp;
      case 'down': return TrendingDown;
      case 'stable': return Activity;
      default: return Activity;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'api': return Network;
      case 'payment': return CreditCard;
      case 'validation': return CheckCircle;
      case 'security': return Shield;
      case 'performance': return Timer;
      case 'integration': return Globe;
      default: return Bug;
    }
  };

  const filteredErrors = ERROR_EVENTS.filter(error => 
    filterSeverity === 'all' || error.severity === filterSeverity
  );

  const criticalErrors = ERROR_EVENTS.filter(e => e.severity === 'critical').length;
  const unresolvedErrors = ERROR_EVENTS.filter(e => !e.resolved).length;
  const resolvedToday = ERROR_EVENTS.filter(e => e.resolved && 
    new Date(e.timestamp).toDateString() === new Date().toDateString()
  ).length;

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-lg">
              <Bug className="h-8 w-8 text-red-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t.title}</h1>
              <p className="text-gray-600">{t.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant={realTimeEnabled ? "default" : "outline"}
              onClick={() => setRealTimeEnabled(!realTimeEnabled)}
            >
              {realTimeEnabled ? <Bell className="h-4 w-4 mr-2" /> : <BellOff className="h-4 w-4 mr-2" />}
              {t.realTimeMonitoring}
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              {t.downloadReport}
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm">{t.criticalErrors}</p>
                  <p className="text-3xl font-bold">{criticalErrors}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-100" />
              </div>
              <div className="flex items-center mt-2">
                <TrendingDown className="h-4 w-4 text-red-100 mr-1" />
                <span className="text-sm text-red-100">-2 from yesterday</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">{t.totalErrors}</p>
                  <p className="text-2xl font-bold text-gray-900">{ERROR_EVENTS.length}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-600" />
              </div>
              <p className="text-sm text-gray-500 mt-2">{unresolvedErrors} unresolved</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">{t.resolvedToday}</p>
                  <p className="text-2xl font-bold text-green-600">{resolvedToday}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-sm text-gray-500 mt-2">92% resolution rate</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">{t.mttr}</p>
                  <p className="text-2xl font-bold text-blue-600">14.5m</p>
                </div>
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
              <div className="flex items-center mt-2">
                <TrendingDown className="h-4 w-4 text-green-600 mr-1" />
                <span className="text-sm text-green-600">-35% improvement</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">{t.uptime}</p>
                  <p className="text-2xl font-bold text-green-600">99.97%</p>
                </div>
                <Activity className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-sm text-gray-500 mt-2">30-day average</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">{t.errorRate}</p>
                  <p className="text-2xl font-bold text-yellow-600">0.12%</p>
                </div>
                <BarChart3 className="h-8 w-8 text-yellow-600" />
              </div>
              <p className="text-sm text-gray-500 mt-2">{t.lastUpdate}: {lastUpdate.toLocaleTimeString()}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">{t.overview}</TabsTrigger>
          <TabsTrigger value="realtime">{t.realTime}</TabsTrigger>
          <TabsTrigger value="analytics">{t.analytics}</TabsTrigger>
          <TabsTrigger value="resolution">{t.resolution}</TabsTrigger>
          <TabsTrigger value="health">{t.systemHealth}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Error Metrics Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ERROR_METRICS.map((metric) => {
              const TrendIcon = getTrendIcon(metric.trend);
              
              return (
                <Card key={metric.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {locale === 'en' ? metric.name : metric.nameEl}
                      </CardTitle>
                      <Badge className={
                        metric.status === 'good' ? 'bg-green-100 text-green-800' :
                        metric.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }>
                        {metric.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-3xl font-bold text-gray-900">
                          {metric.name.includes('Rate') || metric.name.includes('Uptime') || metric.name.includes('Health') ? 
                            `${metric.value}%` : 
                            metric.name.includes('Time') ? 
                            `${metric.value}m` : 
                            metric.value
                          }
                        </span>
                        <TrendIcon className={`h-5 w-5 ${
                          metric.trend === 'up' ? 'text-green-600' : 
                          metric.trend === 'down' ? 'text-red-600' : 
                          'text-gray-600'
                        }`} />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Target: {
                            metric.name.includes('Rate') || metric.name.includes('Uptime') || metric.name.includes('Health') ? 
                            `${metric.target}%` : 
                            metric.name.includes('Time') ? 
                            `${metric.target}m` : 
                            metric.target
                          }</span>
                          <span className={
                            metric.value >= metric.target ? 'text-green-600' : 'text-red-600'
                          }>
                            {metric.value >= metric.target ? '✓ Met' : '⚠ Below'}
                          </span>
                        </div>
                        <Progress 
                          value={metric.name.includes('Rate') || metric.name.includes('Uptime') || metric.name.includes('Health') ? metric.value : 
                                (metric.value / metric.target) * 100} 
                          className="h-2" 
                        />
                      </div>

                      <p className="text-sm text-gray-600">
                        {locale === 'en' ? metric.description : metric.descriptionEl}
                      </p>

                      <div className="text-xs text-gray-500">
                        Previous: {
                          metric.name.includes('Rate') || metric.name.includes('Uptime') || metric.name.includes('Health') ? 
                          `${metric.previousValue}%` : 
                          metric.name.includes('Time') ? 
                          `${metric.previousValue}m` : 
                          metric.previousValue
                        } | Category: {metric.category}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="realtime" className="space-y-6">
          {/* Real-time Error Feed */}
          <div className="flex items-center gap-4 mb-6">
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              {t.filterErrors}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setLastUpdate(new Date())}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {t.refreshData}
            </Button>
          </div>

          <div className="space-y-4">
            {filteredErrors.map((error) => {
              const SeverityIcon = getSeverityIcon(error.severity);
              const CategoryIcon = getCategoryIcon(error.category);
              
              return (
                <Card key={error.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <SeverityIcon className={`h-5 w-5 ${
                            error.severity === 'critical' ? 'text-red-600' :
                            error.severity === 'high' ? 'text-orange-600' :
                            error.severity === 'medium' ? 'text-yellow-600' :
                            'text-blue-600'
                          }`} />
                          <h3 className="font-semibold text-lg">{error.message}</h3>
                          <Badge className={getSeverityColor(error.severity)}>
                            {t.severityLevels[error.severity as keyof typeof t.severityLevels]}
                          </Badge>
                          {error.resolved ? (
                            <Badge className="bg-green-100 text-green-800">
                              {t.resolved}
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800">
                              {t.unresolved}
                            </Badge>
                          )}
                        </div>

                        <p className="text-gray-600 mb-3">{error.details}</p>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-500">{t.source}:</span>
                            <div className="flex items-center gap-2">
                              <CategoryIcon className="h-4 w-4 text-gray-400" />
                              {error.source}
                            </div>
                          </div>
                          <div>
                            <span className="font-medium text-gray-500">{t.category}:</span>
                            <div>{t.categories[error.category as keyof typeof t.categories]}</div>
                          </div>
                          <div>
                            <span className="font-medium text-gray-500">{t.affectedUsers}:</span>
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4 text-gray-400" />
                              {error.affectedUsers}
                            </div>
                          </div>
                          <div>
                            <span className="font-medium text-gray-500">Time:</span>
                            <div>{new Date(error.timestamp).toLocaleString()}</div>
                          </div>
                        </div>

                        {error.greekIntegration && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4 text-blue-600" />
                              <span className="font-medium text-blue-900">Greek Integration: {error.greekIntegration}</span>
                            </div>
                          </div>
                        )}

                        {error.customerFacing && (
                          <div className="mt-3 p-3 bg-orange-50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-orange-600" />
                              <span className="font-medium text-orange-900">{t.customerFacing}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-2" />
                          {t.viewDetails}
                        </Button>
                        {!error.resolved && (
                          <Button size="sm">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {t.markResolved}
                          </Button>
                        )}
                        {error.assignedTo && (
                          <div className="text-xs text-gray-500 mt-2">
                            Assigned to: {error.assignedTo}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Errors by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(t.categories).map(([key, category]) => {
                    const count = ERROR_EVENTS.filter(e => e.category === key).length;
                    const percentage = (count / ERROR_EVENTS.length) * 100;
                    
                    return (
                      <div key={key} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{category}</span>
                          <span>{count} ({percentage.toFixed(1)}%)</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Errors by Severity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(t.severityLevels).map(([key, severity]) => {
                    const count = ERROR_EVENTS.filter(e => e.severity === key).length;
                    const percentage = (count / ERROR_EVENTS.length) * 100;
                    
                    return (
                      <div key={key} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${
                              key === 'critical' ? 'bg-red-500' :
                              key === 'high' ? 'bg-orange-500' :
                              key === 'medium' ? 'bg-yellow-500' :
                              'bg-blue-500'
                            }`}></div>
                            {severity}
                          </span>
                          <span>{count} ({percentage.toFixed(1)}%)</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                Error Trends & Business Impact
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center p-6 border rounded-lg">
                  <div className="text-3xl font-bold text-red-600 mb-2">
                    {ERROR_EVENTS.filter(e => e.customerFacing).length}
                  </div>
                  <div className="text-sm text-gray-600">Customer-Facing Errors</div>
                  <div className="text-xs text-gray-500 mt-1">-40% from last week</div>
                </div>
                
                <div className="text-center p-6 border rounded-lg">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {ERROR_EVENTS.filter(e => e.greekIntegration).length}
                  </div>
                  <div className="text-sm text-gray-600">Greek Integration Issues</div>
                  <div className="text-xs text-gray-500 mt-1">+2 from yesterday</div>
                </div>
                
                <div className="text-center p-6 border rounded-lg">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {ERROR_EVENTS.filter(e => e.category === 'payment').length}
                  </div>
                  <div className="text-sm text-gray-600">Payment System Errors</div>
                  <div className="text-xs text-gray-500 mt-1">-1 from yesterday</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resolution" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Issue Resolution Workflow</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-gray-500 py-8">
                <Target className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Advanced resolution workflow will be implemented here</p>
                <p className="text-sm">Automated assignment, escalation, and resolution tracking</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SYSTEM_HEALTH.map((component) => {
              const HealthIcon = getHealthIcon(component.status);
              
              return (
                <Card key={component.component}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {locale === 'en' ? component.component : component.componentEl}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge className={getHealthColor(component.status)}>
                          <HealthIcon className="h-3 w-3 mr-1" />
                          {t.healthStatus[component.status as keyof typeof t.healthStatus]}
                        </Badge>
                        {component.criticalForPayroll && (
                          <Badge variant="outline" className="text-red-700 border-red-300">
                            Critical
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Uptime:</span>
                          <div className="font-medium">{component.uptime}%</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Response Time:</span>
                          <div className="font-medium">{component.responseTime}ms</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Error Rate:</span>
                          <div className="font-medium">{component.errorRate}%</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Status:</span>
                          <div className="font-medium capitalize">{component.status}</div>
                        </div>
                      </div>

                      {component.lastIncident && (
                        <div className="p-3 bg-yellow-50 rounded-lg">
                          <div className="text-sm">
                            <span className="font-medium text-yellow-800">Last Incident:</span>
                            <div className="text-yellow-700">
                              {new Date(component.lastIncident).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span>Health Score</span>
                          <span>{component.uptime}%</span>
                        </div>
                        <Progress value={component.uptime} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}