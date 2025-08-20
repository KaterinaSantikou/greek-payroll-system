/**
 * Device Compliance Monitor
 * Monitor and enforce device security compliance across the organization
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Monitor,
  Smartphone,
  Laptop,
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Users,
  Wifi,
  Lock,
  Unlock,
  Eye,
  RefreshCw,
  Settings,
  Download,
  Upload,
  Search,
  Filter,
  MoreVertical,
  Ban,
  UserCheck,
  Globe,
  Zap,
  Activity
} from 'lucide-react';

interface Device {
  id: string;
  name: string;
  type: 'desktop' | 'laptop' | 'mobile' | 'tablet';
  platform: string;
  version: string;
  user: string;
  userEmail: string;
  department: string;
  lastSeen: string;
  location: string;
  ipAddress: string;
  macAddress: string;
  complianceScore: number;
  status: 'compliant' | 'warning' | 'non-compliant' | 'quarantined';
  isManaged: boolean;
  isTrusted: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  complianceIssues: ComplianceIssue[];
  lastUpdated: string;
}

interface ComplianceIssue {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  description: string;
  recommendation: string;
  category: 'os' | 'antivirus' | 'firewall' | 'encryption' | 'policy' | 'certificate';
}

interface CompliancePolicy {
  id: string;
  name: string;
  nameEl: string;
  description: string;
  enabled: boolean;
  category: string;
  severity: 'info' | 'warning' | 'critical';
  greekCompliant: boolean;
}

const DEVICES: Device[] = [
  {
    id: 'dev-001',
    name: 'DESKTOP-KATERINA',
    type: 'desktop',
    platform: 'Windows 11 Pro',
    version: '22H2',
    user: 'Katerina Santikos',
    userEmail: 'katerina@santikos.gr',
    department: 'Management',
    lastSeen: '2025-01-20T15:30:00Z',
    location: 'Athens, Greece',
    ipAddress: '192.168.1.100',
    macAddress: '00:1B:44:11:3A:B7',
    complianceScore: 94,
    status: 'compliant',
    isManaged: true,
    isTrusted: true,
    riskLevel: 'low',
    complianceIssues: [],
    lastUpdated: '2025-01-20T12:00:00Z'
  },
  {
    id: 'dev-002',
    name: 'iPhone-Dimitris',
    type: 'mobile',
    platform: 'iOS',
    version: '17.2.1',
    user: 'Dimitris Kostas',
    userEmail: 'dimitris.hr@santikos.gr',
    department: 'HR',
    lastSeen: '2025-01-20T14:45:00Z',
    location: 'Thessaloniki, Greece',
    ipAddress: '192.168.1.205',
    macAddress: 'A4:83:E7:45:12:89',
    complianceScore: 87,
    status: 'warning',
    isManaged: true,
    isTrusted: true,
    riskLevel: 'medium',
    complianceIssues: [
      {
        id: 'issue-001',
        severity: 'medium',
        type: 'OS Update Required',
        description: 'iOS version 17.2.1 is outdated',
        recommendation: 'Update to iOS 17.3 or later',
        category: 'os'
      }
    ],
    lastUpdated: '2025-01-19T18:30:00Z'
  },
  {
    id: 'dev-003',
    name: 'LAPTOP-MARIA',
    type: 'laptop',
    platform: 'Windows 10 Pro',
    version: '19045',
    user: 'Maria Papadopoulos',
    userEmail: 'maria.payroll@santikos.gr',
    department: 'Payroll',
    lastSeen: '2025-01-18T16:20:00Z',
    location: 'Remote - Patras',
    ipAddress: '85.76.142.33',
    macAddress: '2C:F0:5D:13:45:B2',
    complianceScore: 65,
    status: 'non-compliant',
    isManaged: false,
    isTrusted: false,
    riskLevel: 'high',
    complianceIssues: [
      {
        id: 'issue-002',
        severity: 'critical',
        type: 'Windows 10 End of Support',
        description: 'Windows 10 reaching end of support',
        recommendation: 'Upgrade to Windows 11 or newer',
        category: 'os'
      },
      {
        id: 'issue-003',
        severity: 'high',
        type: 'Antivirus Outdated',
        description: 'Antivirus definitions are 5 days old',
        recommendation: 'Update antivirus definitions',
        category: 'antivirus'
      },
      {
        id: 'issue-004',
        severity: 'medium',
        type: 'Disk Encryption Disabled',
        description: 'BitLocker is not enabled',
        recommendation: 'Enable BitLocker disk encryption',
        category: 'encryption'
      }
    ],
    lastUpdated: '2025-01-15T10:45:00Z'
  },
  {
    id: 'dev-004',
    name: 'Samsung-Galaxy-S23',
    type: 'mobile',
    platform: 'Android',
    version: '14',
    user: 'Nikos Alexandros',
    userEmail: 'nikos.ops@santikos.gr',
    department: 'Operations',
    lastSeen: '2025-01-20T11:15:00Z',
    location: 'Rhodes, Greece',
    ipAddress: '94.66.192.78',
    macAddress: '8C:85:90:A2:B4:C1',
    complianceScore: 78,
    status: 'warning',
    isManaged: true,
    isTrusted: true,
    riskLevel: 'medium',
    complianceIssues: [
      {
        id: 'issue-005',
        severity: 'medium',
        type: 'VPN Not Connected',
        description: 'Device not connected to corporate VPN',
        recommendation: 'Connect to company VPN when accessing payroll data',
        category: 'policy'
      }
    ],
    lastUpdated: '2025-01-20T09:30:00Z'
  }
];

const COMPLIANCE_POLICIES: CompliancePolicy[] = [
  {
    id: 'policy-001',
    name: 'Operating System Updates',
    nameEl: 'Ενημερώσεις Λειτουργικού Συστήματος',
    description: 'Require devices to run supported OS versions with latest security updates',
    enabled: true,
    category: 'Operating System',
    severity: 'critical',
    greekCompliant: true
  },
  {
    id: 'policy-002',
    name: 'Disk Encryption',
    nameEl: 'Κρυπτογράφηση Δίσκου',
    description: 'All devices must have full disk encryption enabled (BitLocker/FileVault)',
    enabled: true,
    category: 'Data Protection',
    severity: 'critical',
    greekCompliant: true
  },
  {
    id: 'policy-003',
    name: 'Antivirus Protection',
    nameEl: 'Προστασία Antivirus',
    description: 'Real-time antivirus with up-to-date definitions required',
    enabled: true,
    category: 'Endpoint Protection',
    severity: 'critical',
    greekCompliant: true
  },
  {
    id: 'policy-004',
    name: 'Screen Lock Timeout',
    nameEl: 'Timeout Κλειδώματος Οθόνης',
    description: 'Screen lock after 15 minutes of inactivity',
    enabled: true,
    category: 'Access Control',
    severity: 'warning',
    greekCompliant: true
  },
  {
    id: 'policy-005',
    name: 'VPN Requirement',
    nameEl: 'Απαίτηση VPN',
    description: 'Corporate VPN required when accessing sensitive payroll data',
    enabled: true,
    category: 'Network Security',
    severity: 'warning',
    greekCompliant: true
  }
];

interface DeviceComplianceMonitorProps {
  locale?: 'en' | 'el';
}

export default function DeviceComplianceMonitor({ locale = 'en' }: DeviceComplianceMonitorProps) {
  const [activeTab, setActiveTab] = useState('devices');
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const translations = {
    en: {
      title: 'Device Compliance Monitor',
      subtitle: 'Monitor and enforce device security compliance across your organization',
      devices: 'Managed Devices',
      policies: 'Compliance Policies',
      reports: 'Compliance Reports',
      settings: 'Device Settings',
      compliant: 'Compliant',
      warning: 'Warning',
      nonCompliant: 'Non-Compliant',
      quarantined: 'Quarantined',
      managed: 'Managed',
      unmanaged: 'Unmanaged',
      trusted: 'Trusted',
      untrusted: 'Untrusted',
      lastSeen: 'Last Seen',
      complianceScore: 'Compliance Score',
      riskLevel: 'Risk Level',
      department: 'Department',
      location: 'Location',
      platform: 'Platform',
      version: 'Version',
      issues: 'Issues',
      remediate: 'Remediate',
      quarantine: 'Quarantine',
      trust: 'Trust Device',
      untrust: 'Untrust Device',
      viewDetails: 'View Details',
      backToDevices: 'Back to Devices',
      overallCompliance: 'Overall Compliance',
      totalDevices: 'Total Devices',
      complianceIssues: 'Compliance Issues',
      riskLevels: {
        low: 'Low Risk',
        medium: 'Medium Risk',
        high: 'High Risk',
        critical: 'Critical Risk'
      },
      severityLevels: {
        low: 'Low',
        medium: 'Medium',
        high: 'High',
        critical: 'Critical'
      }
    },
    el: {
      title: 'Παρακολούθηση Συμμόρφωσης Συσκευών',
      subtitle: 'Παρακολουθήστε και επιβάλλετε τη συμμόρφωση ασφαλείας συσκευών στον οργανισμό σας',
      devices: 'Διαχειριζόμενες Συσκευές',
      policies: 'Πολιτικές Συμμόρφωσης',
      reports: 'Αναφορές Συμμόρφωσης',
      settings: 'Ρυθμίσεις Συσκευών',
      compliant: 'Συμμορφούμενο',
      warning: 'Προειδοποίηση',
      nonCompliant: 'Μη Συμμορφούμενο',
      quarantined: 'Σε Καραντίνα',
      managed: 'Διαχειριζόμενο',
      unmanaged: 'Μη Διαχειριζόμενο',
      trusted: 'Αξιόπιστο',
      untrusted: 'Μη Αξιόπιστο',
      lastSeen: 'Τελευταία Προβολή',
      complianceScore: 'Βαθμός Συμμόρφωσης',
      riskLevel: 'Επίπεδο Κινδύνου',
      department: 'Τμήμα',
      location: 'Τοποθεσία',
      platform: 'Πλατφόρμα',
      version: 'Έκδοση',
      issues: 'Ζητήματα',
      remediate: 'Αποκατάσταση',
      quarantine: 'Καραντίνα',
      trust: 'Εμπιστοσύνη Συσκευής',
      untrust: 'Αφαίρεση Εμπιστοσύνης',
      viewDetails: 'Προβολή Λεπτομερειών',
      backToDevices: 'Επιστροφή στις Συσκευές',
      overallCompliance: 'Συνολική Συμμόρφωση',
      totalDevices: 'Συνολικές Συσκευές',
      complianceIssues: 'Ζητήματα Συμμόρφωσης',
      riskLevels: {
        low: 'Χαμηλός Κίνδυνος',
        medium: 'Μέτριος Κίνδυνος',
        high: 'Υψηλός Κίνδυνος',
        critical: 'Κρίσιμος Κίνδυνος'
      },
      severityLevels: {
        low: 'Χαμηλό',
        medium: 'Μέτριο',
        high: 'Υψηλό',
        critical: 'Κρίσιμο'
      }
    }
  };

  const t = translations[locale];

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'desktop': return Monitor;
      case 'laptop': return Laptop;
      case 'mobile': return Smartphone;
      case 'tablet': return Smartphone;
      default: return Monitor;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'non-compliant': return 'bg-red-100 text-red-800';
      case 'quarantined': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant': return ShieldCheck;
      case 'warning': return ShieldAlert;
      case 'non-compliant': return ShieldX;
      case 'quarantined': return Ban;
      default: return Shield;
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-blue-100 text-blue-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredDevices = DEVICES.filter(device => 
    filterStatus === 'all' || device.status === filterStatus
  );

  const overallCompliance = Math.round(
    DEVICES.reduce((acc, device) => acc + device.complianceScore, 0) / DEVICES.length
  );

  const totalIssues = DEVICES.reduce((acc, device) => acc + device.complianceIssues.length, 0);

  if (selectedDevice) {
    const DeviceIcon = getDeviceIcon(selectedDevice.type);
    const StatusIcon = getStatusIcon(selectedDevice.status);
    
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Button variant="ghost" onClick={() => setSelectedDevice(null)} className="mb-6">
          ← {t.backToDevices}
        </Button>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Device Header */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <DeviceIcon className="h-8 w-8 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">{selectedDevice.name}</CardTitle>
                      <p className="text-gray-600">{selectedDevice.platform} {selectedDevice.version}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <Badge className={getStatusColor(selectedDevice.status)}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {t[selectedDevice.status.replace('-', '') as keyof typeof t] || selectedDevice.status}
                        </Badge>
                        <span className={`text-sm font-medium ${getRiskColor(selectedDevice.riskLevel)}`}>
                          {(t.riskLevels as any)[selectedDevice.riskLevel] || selectedDevice.riskLevel}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">
                      {selectedDevice.complianceScore}%
                    </div>
                    <div className="text-sm text-gray-600">{t.complianceScore}</div>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Device Details */}
            <Card>
              <CardHeader>
                <CardTitle>Device Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm text-gray-600">User</Label>
                      <div className="font-medium">{selectedDevice.user}</div>
                      <div className="text-sm text-gray-500">{selectedDevice.userEmail}</div>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">{t.department}</Label>
                      <div className="font-medium">{selectedDevice.department}</div>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">{t.location}</Label>
                      <div className="font-medium">{selectedDevice.location}</div>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">IP Address</Label>
                      <div className="font-medium font-mono text-sm">{selectedDevice.ipAddress}</div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm text-gray-600">{t.platform}</Label>
                      <div className="font-medium">{selectedDevice.platform}</div>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">{t.version}</Label>
                      <div className="font-medium">{selectedDevice.version}</div>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">{t.lastSeen}</Label>
                      <div className="font-medium">{new Date(selectedDevice.lastSeen).toLocaleString()}</div>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">MAC Address</Label>
                      <div className="font-medium font-mono text-sm">{selectedDevice.macAddress}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Compliance Issues */}
            {selectedDevice.complianceIssues.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    {t.complianceIssues} ({selectedDevice.complianceIssues.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedDevice.complianceIssues.map((issue) => (
                      <div key={issue.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-semibold">{issue.type}</h4>
                              <Badge className={getSeverityColor(issue.severity)}>
                                {t.severityLevels[issue.severity as keyof typeof t.severityLevels]}
                              </Badge>
                            </div>
                            <p className="text-gray-600 mb-2">{issue.description}</p>
                            <p className="text-sm text-blue-600 font-medium">
                              Recommendation: {issue.recommendation}
                            </p>
                          </div>
                          <Button size="sm">
                            <Zap className="h-4 w-4 mr-2" />
                            {t.remediate}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Device Status */}
            <Card>
              <CardHeader>
                <CardTitle>Device Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Management Status</span>
                  <Badge className={selectedDevice.isManaged ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {selectedDevice.isManaged ? t.managed : t.unmanaged}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Trust Level</span>
                  <Badge className={selectedDevice.isTrusted ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}>
                    {selectedDevice.isTrusted ? t.trusted : t.untrusted}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t.complianceScore}</span>
                    <span>{selectedDevice.complianceScore}%</span>
                  </div>
                  <Progress value={selectedDevice.complianceScore} />
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full" variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync Compliance
                </Button>
                <Button className="w-full" variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Configure Policies
                </Button>
                {selectedDevice.isTrusted ? (
                  <Button className="w-full text-orange-600" variant="outline">
                    <Unlock className="h-4 w-4 mr-2" />
                    {t.untrust}
                  </Button>
                ) : (
                  <Button className="w-full text-green-600" variant="outline">
                    <Lock className="h-4 w-4 mr-2" />
                    {t.trust}
                  </Button>
                )}
                {selectedDevice.status !== 'quarantined' && (
                  <Button className="w-full text-red-600" variant="outline">
                    <Ban className="h-4 w-4 mr-2" />
                    {t.quarantine}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

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

        {/* Compliance Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">{t.overallCompliance}</p>
                  <p className="text-3xl font-bold">{overallCompliance}%</p>
                </div>
                <ShieldCheck className="h-12 w-12 text-blue-100" />
              </div>
              <Progress value={overallCompliance} className="mt-3 bg-blue-400" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">{t.totalDevices}</p>
                  <p className="text-2xl font-bold text-blue-600">{DEVICES.length}</p>
                </div>
                <Monitor className="h-8 w-8 text-blue-600" />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {DEVICES.filter(d => d.isManaged).length} managed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">{t.complianceIssues}</p>
                  <p className="text-2xl font-bold text-red-600">{totalIssues}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {DEVICES.filter(d => d.complianceIssues.some(i => i.severity === 'critical')).length} critical
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Non-Compliant</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {DEVICES.filter(d => d.status === 'non-compliant').length}
                  </p>
                </div>
                <ShieldX className="h-8 w-8 text-orange-600" />
              </div>
              <p className="text-sm text-gray-500 mt-2">Require attention</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="devices">{t.devices}</TabsTrigger>
          <TabsTrigger value="policies">{t.policies}</TabsTrigger>
          <TabsTrigger value="reports">{t.reports}</TabsTrigger>
          <TabsTrigger value="settings">{t.settings}</TabsTrigger>
        </TabsList>

        <TabsContent value="devices" className="space-y-6">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">All Devices</option>
              <option value="compliant">Compliant</option>
              <option value="warning">Warning</option>
              <option value="non-compliant">Non-Compliant</option>
              <option value="quarantined">Quarantined</option>
            </select>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </Button>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Devices Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDevices.map((device) => {
              const DeviceIcon = getDeviceIcon(device.type);
              const StatusIcon = getStatusIcon(device.status);
              
              return (
                <Card 
                  key={device.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setSelectedDevice(device)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <DeviceIcon className="h-6 w-6 text-blue-600" />
                        <div>
                          <CardTitle className="text-lg">{device.name}</CardTitle>
                          <p className="text-sm text-gray-600">{device.user}</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Badge className={getStatusColor(device.status)}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {t[device.status.replace('-', '') as keyof typeof t] || device.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{t.complianceScore}</span>
                        <div className="flex items-center gap-2">
                          <Progress value={device.complianceScore} className="w-20 h-2" />
                          <span className="font-medium">{device.complianceScore}%</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">{t.platform}:</span>
                          <div className="font-medium">{device.platform}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">{t.lastSeen}:</span>
                          <div className="font-medium">{new Date(device.lastSeen).toLocaleDateString()}</div>
                        </div>
                      </div>

                      {device.complianceIssues.length > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <AlertTriangle className="h-4 w-4 text-orange-600" />
                          <span className="text-orange-600 font-medium">
                            {device.complianceIssues.length} {t.issues}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-3 border-t">
                        <Badge variant="outline" className={device.isManaged ? 'text-green-700' : 'text-red-700'}>
                          {device.isManaged ? t.managed : t.unmanaged}
                        </Badge>
                        <Badge variant="outline" className={device.isTrusted ? 'text-blue-700' : 'text-gray-700'}>
                          {device.isTrusted ? t.trusted : t.untrusted}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="policies" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {COMPLIANCE_POLICIES.map((policy) => (
              <Card key={policy.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {locale === 'en' ? policy.name : policy.nameEl}
                    </CardTitle>
                    <Switch checked={policy.enabled} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={policy.severity === 'critical' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}>
                      {policy.severity}
                    </Badge>
                    {policy.greekCompliant && (
                      <Badge variant="outline" className="text-blue-700 border-blue-300">
                        Greek Compliant
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">{policy.description}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Category: {policy.category}</span>
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Configure
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-gray-500 py-8">
                <Activity className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Compliance reporting functionality will be implemented here</p>
                <p className="text-sm">Generate detailed compliance reports and analytics</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Device Management Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-gray-500 py-8">
                <Settings className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Device management settings will be implemented here</p>
                <p className="text-sm">Configure global device policies and enforcement rules</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}