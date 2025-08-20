/**
 * Zero-Trust Security Dashboard
 * Comprehensive security posture monitoring and control center
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Users,
  Smartphone,
  Globe,
  Database,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Settings,
  FileText,
  Network,
  Zap,
  Key,
  Fingerprint,
  Monitor,
  Server,
  Wifi,
  UserCheck,
  Ban,
  Search
} from 'lucide-react';

interface SecurityMetric {
  id: string;
  name: string;
  nameEl: string;
  value: number;
  maxValue: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
  description: string;
  descriptionEl: string;
  category: 'identity' | 'devices' | 'network' | 'data' | 'applications';
}

interface SecurityThreat {
  id: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  description: string;
  source: string;
  status: 'active' | 'investigating' | 'mitigated' | 'resolved';
  affectedAssets: string[];
}

interface AccessRequest {
  id: string;
  user: string;
  resource: string;
  timestamp: string;
  status: 'pending' | 'approved' | 'denied';
  riskScore: number;
  reason: string;
  justification: string;
}

interface ComplianceControl {
  id: string;
  name: string;
  nameEl: string;
  framework: string;
  status: 'compliant' | 'partial' | 'non-compliant';
  lastAssessed: string;
  nextDue: string;
  description: string;
  evidence: string[];
}

const SECURITY_METRICS: SecurityMetric[] = [
  {
    id: 'identity-verification',
    name: 'Identity Verification',
    nameEl: 'Επαλήθευση Ταυτότητας',
    value: 98,
    maxValue: 100,
    status: 'excellent',
    trend: 'up',
    description: 'Multi-factor authentication and identity verification coverage',
    descriptionEl: 'Κάλυψη πολυπαραγοντικής αυθεντικοποίησης και επαλήθευσης ταυτότητας',
    category: 'identity'
  },
  {
    id: 'device-compliance',
    name: 'Device Compliance',
    nameEl: 'Συμμόρφωση Συσκευών',
    value: 94,
    maxValue: 100,
    status: 'excellent',
    trend: 'stable',
    description: 'Percentage of devices meeting security compliance requirements',
    descriptionEl: 'Ποσοστό συσκευών που πληρούν τις απαιτήσεις συμμόρφωσης ασφαλείας',
    category: 'devices'
  },
  {
    id: 'network-segmentation',
    name: 'Network Segmentation',
    nameEl: 'Κατάτμηση Δικτύου',
    value: 87,
    maxValue: 100,
    status: 'good',
    trend: 'up',
    description: 'Network microsegmentation and access control effectiveness',
    descriptionEl: 'Αποτελεσματικότητα μικρο-κατάτμησης δικτύου και ελέγχου πρόσβασης',
    category: 'network'
  },
  {
    id: 'data-encryption',
    name: 'Data Encryption',
    nameEl: 'Κρυπτογράφηση Δεδομένων',
    value: 99,
    maxValue: 100,
    status: 'excellent',
    trend: 'stable',
    description: 'End-to-end encryption coverage for sensitive payroll data',
    descriptionEl: 'Κάλυψη κρυπτογράφησης από άκρο σε άκρο για ευαίσθητα δεδομένα μισθοδοσίας',
    category: 'data'
  },
  {
    id: 'application-security',
    name: 'Application Security',
    nameEl: 'Ασφάλεια Εφαρμογών',
    value: 91,
    maxValue: 100,
    status: 'excellent',
    trend: 'up',
    description: 'Application-level security controls and vulnerability management',
    descriptionEl: 'Έλεγχοι ασφαλείας σε επίπεδο εφαρμογής και διαχείριση ευπάθειας',
    category: 'applications'
  },
  {
    id: 'session-validation',
    name: 'Session Validation',
    nameEl: 'Επικύρωση Συνεδρίας',
    value: 96,
    maxValue: 100,
    status: 'excellent',
    trend: 'stable',
    description: 'Continuous session monitoring and revalidation',
    descriptionEl: 'Συνεχής παρακολούθηση και επανεπικύρωση συνεδρίας',
    category: 'identity'
  }
];

const RECENT_THREATS: SecurityThreat[] = [
  {
    id: 'threat-001',
    timestamp: '2025-01-20T14:30:00Z',
    severity: 'medium',
    type: 'Suspicious Login',
    description: 'Multiple failed login attempts from unusual location',
    source: '185.23.45.67',
    status: 'investigating',
    affectedAssets: ['HR Portal', 'Employee Database']
  },
  {
    id: 'threat-002',
    timestamp: '2025-01-20T13:15:00Z',
    severity: 'low',
    type: 'Device Non-Compliance',
    description: 'Employee device missing latest security updates',
    source: 'DESKTOP-MARIA-PC',
    status: 'mitigated',
    affectedAssets: ['Payroll System']
  },
  {
    id: 'threat-003',
    timestamp: '2025-01-20T12:45:00Z',
    severity: 'high',
    type: 'Data Access Anomaly',
    description: 'Unusual bulk data export detected',
    source: 'katerina@santikos.gr',
    status: 'resolved',
    affectedAssets: ['Employee Records', 'Salary Data']
  }
];

const ACCESS_REQUESTS: AccessRequest[] = [
  {
    id: 'req-001',
    user: 'dimitris.hr@santikos.gr',
    resource: 'ERGANI II Integration',
    timestamp: '2025-01-20T15:20:00Z',
    status: 'pending',
    riskScore: 35,
    reason: 'New employee onboarding process',
    justification: 'Need access to submit new employee data to ERGANI II system'
  },
  {
    id: 'req-002',
    user: 'maria.payroll@santikos.gr',
    resource: 'Alpha Bank Integration',
    timestamp: '2025-01-20T14:50:00Z',
    status: 'approved',
    riskScore: 15,
    reason: 'Monthly salary processing',
    justification: 'Regular monthly payroll run requires banking integration access'
  }
];

const COMPLIANCE_CONTROLS: ComplianceControl[] = [
  {
    id: 'gdpr-001',
    name: 'GDPR Data Protection',
    nameEl: 'Προστασία Δεδομένων GDPR',
    framework: 'GDPR',
    status: 'compliant',
    lastAssessed: '2025-01-15',
    nextDue: '2025-04-15',
    description: 'Personal data processing compliance for Greek employees',
    evidence: ['Privacy Impact Assessment', 'Data Processing Agreements', 'Consent Management']
  },
  {
    id: 'ergani-sec',
    name: 'ERGANI II Security',
    nameEl: 'Ασφάλεια ΕΡΓΑΝΗ ΙΙ',
    framework: 'Greek Labor Ministry',
    status: 'compliant',
    lastAssessed: '2025-01-18',
    nextDue: '2025-02-18',
    description: 'Government system integration security requirements',
    evidence: ['Security Certificate', 'API Authentication', 'Audit Logs']
  },
  {
    id: 'iso27001',
    name: 'ISO 27001 Controls',
    nameEl: 'Έλεγχοι ISO 27001',
    framework: 'ISO 27001',
    status: 'partial',
    lastAssessed: '2025-01-10',
    nextDue: '2025-02-10',
    description: 'Information security management system controls',
    evidence: ['Risk Assessment', 'Security Policies', 'Incident Response']
  }
];

interface ZeroTrustDashboardProps {
  locale?: 'en' | 'el';
}

export default function ZeroTrustDashboard({ locale = 'en' }: ZeroTrustDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedMetric, setSelectedMetric] = useState<SecurityMetric | null>(null);

  const translations = {
    en: {
      title: 'Zero-Trust Security Center',
      subtitle: 'Never trust, always verify - Comprehensive security posture monitoring',
      overview: 'Security Overview',
      threats: 'Threat Detection',
      access: 'Access Control',
      compliance: 'Compliance',
      audit: 'Audit Logs',
      securityScore: 'Security Score',
      trustLevel: 'Trust Level',
      activeThreats: 'Active Threats',
      pendingRequests: 'Pending Requests',
      lastUpdated: 'Last Updated',
      riskScore: 'Risk Score',
      status: 'Status',
      severity: 'Severity',
      investigate: 'Investigate',
      approve: 'Approve',
      deny: 'Deny',
      mitigate: 'Mitigate',
      resolved: 'Resolved',
      pending: 'Pending',
      approved: 'Approved',
      denied: 'Denied',
      compliant: 'Compliant',
      nonCompliant: 'Non-Compliant',
      partial: 'Partially Compliant',
      categories: {
        identity: 'Identity & Access',
        devices: 'Device Security',
        network: 'Network Protection',
        data: 'Data Security',
        applications: 'Application Security'
      },
      frameworks: {
        gdpr: 'GDPR Compliance',
        ergani: 'ERGANI II Security',
        iso27001: 'ISO 27001'
      }
    },
    el: {
      title: 'Κέντρο Ασφαλείας Zero-Trust',
      subtitle: 'Ποτέ μην εμπιστεύεσαι, πάντα επαληθεύεις - Ολοκληρωμένη παρακολούθηση στάσης ασφαλείας',
      overview: 'Επισκόπηση Ασφαλείας',
      threats: 'Ανίχνευση Απειλών',
      access: 'Έλεγχος Πρόσβασης',
      compliance: 'Συμμόρφωση',
      audit: 'Αρχεία Ελέγχου',
      securityScore: 'Βαθμός Ασφαλείας',
      trustLevel: 'Επίπεδο Εμπιστοσύνης',
      activeThreats: 'Ενεργές Απειλές',
      pendingRequests: 'Εκκρεμείς Αιτήσεις',
      lastUpdated: 'Τελευταία Ενημέρωση',
      riskScore: 'Βαθμός Κινδύνου',
      status: 'Κατάσταση',
      severity: 'Σοβαρότητα',
      investigate: 'Διερεύνηση',
      approve: 'Έγκριση',
      deny: 'Άρνηση',
      mitigate: 'Μετριασμός',
      resolved: 'Επιλύθηκε',
      pending: 'Εκκρεμεί',
      approved: 'Εγκρίθηκε',
      denied: 'Αρνήθηκε',
      compliant: 'Συμμορφούμενο',
      nonCompliant: 'Μη Συμμορφούμενο',
      partial: 'Μερικώς Συμμορφούμενο',
      categories: {
        identity: 'Ταυτότητα & Πρόσβαση',
        devices: 'Ασφάλεια Συσκευών',
        network: 'Προστασία Δικτύου',
        data: 'Ασφάλεια Δεδομένων',
        applications: 'Ασφάλεια Εφαρμογών'
      },
      frameworks: {
        gdpr: 'Συμμόρφωση GDPR',
        ergani: 'Ασφάλεια ΕΡΓΑΝΗ ΙΙ',
        iso27001: 'ISO 27001'
      }
    }
  };

  const t = translations[locale];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'bg-green-100 text-green-800';
      case 'good': return 'bg-blue-100 text-blue-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'critical': return 'bg-red-100 text-red-800';
      case 'compliant': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'non-compliant': return 'bg-red-100 text-red-800';
      case 'active': return 'bg-red-100 text-red-800';
      case 'investigating': return 'bg-yellow-100 text-yellow-800';
      case 'mitigated': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'denied': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
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
      case 'identity': return UserCheck;
      case 'devices': return Smartphone;
      case 'network': return Network;
      case 'data': return Database;
      case 'applications': return Monitor;
      default: return Shield;
    }
  };

  const overallSecurityScore = Math.round(
    SECURITY_METRICS.reduce((acc, metric) => acc + metric.value, 0) / SECURITY_METRICS.length
  );

  const activeThreatsCount = RECENT_THREATS.filter(t => t.status === 'active' || t.status === 'investigating').length;

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Shield className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t.title}</h1>
            <p className="text-gray-600">{t.subtitle}</p>
          </div>
        </div>

        {/* Security Score Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">{t.securityScore}</p>
                  <p className="text-3xl font-bold">{overallSecurityScore}%</p>
                </div>
                <ShieldCheck className="h-12 w-12 text-green-100" />
              </div>
              <div className="mt-4">
                <Progress value={overallSecurityScore} className="bg-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">{t.trustLevel}</p>
                  <p className="text-2xl font-bold text-blue-600">High</p>
                </div>
                <Lock className="h-8 w-8 text-blue-600" />
              </div>
              <Badge className="bg-blue-100 text-blue-800 mt-2">Zero-Trust Active</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">{t.activeThreats}</p>
                  <p className="text-2xl font-bold text-red-600">{activeThreatsCount}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <p className="text-sm text-gray-500 mt-2">{RECENT_THREATS.length} total detected</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">{t.pendingRequests}</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {ACCESS_REQUESTS.filter(r => r.status === 'pending').length}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
              <p className="text-sm text-gray-500 mt-2">Awaiting approval</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">{t.overview}</TabsTrigger>
          <TabsTrigger value="threats">{t.threats}</TabsTrigger>
          <TabsTrigger value="access">{t.access}</TabsTrigger>
          <TabsTrigger value="compliance">{t.compliance}</TabsTrigger>
          <TabsTrigger value="audit">{t.audit}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Security Metrics Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SECURITY_METRICS.map((metric) => {
              const TrendIcon = getTrendIcon(metric.trend);
              const CategoryIcon = getCategoryIcon(metric.category);
              
              return (
                <Card 
                  key={metric.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setSelectedMetric(metric)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CategoryIcon className="h-6 w-6 text-blue-600" />
                        <CardTitle className="text-lg">
                          {locale === 'en' ? metric.name : metric.nameEl}
                        </CardTitle>
                      </div>
                      <Badge className={getStatusColor(metric.status)}>
                        {metric.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-3xl font-bold text-gray-900">
                          {metric.value}%
                        </span>
                        <TrendIcon className={`h-5 w-5 ${
                          metric.trend === 'up' ? 'text-green-600' : 
                          metric.trend === 'down' ? 'text-red-600' : 
                          'text-gray-600'
                        }`} />
                      </div>
                      <Progress value={metric.value} className="h-2" />
                      <p className="text-sm text-gray-600">
                        {locale === 'en' ? metric.description : metric.descriptionEl}
                      </p>
                      <div className="text-xs text-gray-500">
                        Category: {(t.categories as any)[metric.category] || metric.category}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="threats" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Recent Security Threats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {RECENT_THREATS.map((threat) => (
                  <div key={threat.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold">{threat.type}</h4>
                          <Badge className={getStatusColor(threat.status)}>
                            {(t as any)[threat.status] || threat.status}
                          </Badge>
                          <span className={`font-medium ${getSeverityColor(threat.severity)}`}>
                            {threat.severity.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-gray-600 mb-2">{threat.description}</p>
                        <div className="text-sm text-gray-500">
                          <div>Source: {threat.source}</div>
                          <div>Time: {new Date(threat.timestamp).toLocaleString()}</div>
                          <div>Affected: {threat.affectedAssets.join(', ')}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Search className="h-4 w-4 mr-2" />
                          {t.investigate}
                        </Button>
                        {threat.status === 'active' && (
                          <Button size="sm">
                            <Shield className="h-4 w-4 mr-2" />
                            {t.mitigate}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-blue-600" />
                Access Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {ACCESS_REQUESTS.map((request) => (
                  <div key={request.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold">{request.user}</h4>
                          <Badge className={getStatusColor(request.status)}>
                            {(t as any)[request.status] || request.status}
                          </Badge>
                          <span className={`text-sm font-medium ${
                            request.riskScore > 50 ? 'text-red-600' : 
                            request.riskScore > 25 ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            Risk: {request.riskScore}%
                          </span>
                        </div>
                        <p className="text-gray-900 font-medium mb-1">
                          Requesting: {request.resource}
                        </p>
                        <p className="text-gray-600 mb-2">{request.justification}</p>
                        <div className="text-sm text-gray-500">
                          <div>Reason: {request.reason}</div>
                          <div>Time: {new Date(request.timestamp).toLocaleString()}</div>
                        </div>
                      </div>
                      {request.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="text-red-600">
                            <Ban className="h-4 w-4 mr-2" />
                            {t.deny}
                          </Button>
                          <Button size="sm">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {t.approve}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {COMPLIANCE_CONTROLS.map((control) => (
              <Card key={control.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {locale === 'en' ? control.name : control.nameEl}
                    </CardTitle>
                    <Badge className={getStatusColor(control.status)}>
                      {(t as any)[control.status.replace('-', '')] || control.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600">{control.framework}</div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">{control.description}</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Last Assessed:</span>
                        <span>{control.lastAssessed}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Next Due:</span>
                        <span>{control.nextDue}</span>
                      </div>
                    </div>
                    <div>
                      <h5 className="font-medium mb-2">Evidence:</h5>
                      <div className="space-y-1">
                        {control.evidence.map((evidence, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <FileText className="h-3 w-3 text-gray-500" />
                            <span>{evidence}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="audit" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-gray-600" />
                Security Audit Trail
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center text-gray-500 py-8">
                  <Activity className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>Audit log functionality will be implemented here</p>
                  <p className="text-sm">Real-time security event monitoring and logging</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}