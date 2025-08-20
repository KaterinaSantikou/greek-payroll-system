/**
 * Multi-Factor Authentication Management
 * Setup and manage MFA methods for zero-trust security
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Smartphone,
  Shield,
  Key,
  Fingerprint,
  Mail,
  MessageSquare,
  QrCode,
  CheckCircle,
  AlertTriangle,
  Clock,
  Settings,
  Plus,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Download,
  Upload,
  Zap
} from 'lucide-react';

interface MFAMethod {
  id: string;
  type: 'authenticator' | 'sms' | 'email' | 'biometric' | 'hardware';
  name: string;
  nameEl: string;
  description: string;
  descriptionEl: string;
  status: 'active' | 'inactive' | 'setup' | 'failed';
  lastUsed: string;
  setupDate: string;
  trustScore: number;
  icon: React.ComponentType<any>;
  isPrimary: boolean;
  isRecommended: boolean;
  greekCompliant: boolean;
}

interface SecurityEvent {
  id: string;
  timestamp: string;
  type: 'login_success' | 'login_failed' | 'mfa_success' | 'mfa_failed' | 'device_new';
  method: string;
  location: string;
  device: string;
  ipAddress: string;
  riskLevel: 'low' | 'medium' | 'high';
}

const MFA_METHODS: MFAMethod[] = [
  {
    id: 'authenticator-app',
    type: 'authenticator',
    name: 'Authenticator App',
    nameEl: 'Εφαρμογή Αυθεντικοποίησης',
    description: 'Time-based codes via mobile authenticator app',
    descriptionEl: 'Κωδικοί βάσει χρόνου μέσω εφαρμογής αυθεντικοποίησης',
    status: 'active',
    lastUsed: '2025-01-20T14:30:00Z',
    setupDate: '2024-12-15T10:00:00Z',
    trustScore: 95,
    icon: Smartphone,
    isPrimary: true,
    isRecommended: true,
    greekCompliant: true
  },
  {
    id: 'sms-backup',
    type: 'sms',
    name: 'SMS Backup',
    nameEl: 'Εφεδρικό SMS',
    description: 'SMS codes to registered Greek mobile number',
    descriptionEl: 'Κωδικοί SMS σε καταχωρημένο ελληνικό κινητό',
    status: 'active',
    lastUsed: '2025-01-18T09:15:00Z',
    setupDate: '2024-12-15T10:05:00Z',
    trustScore: 75,
    icon: MessageSquare,
    isPrimary: false,
    isRecommended: false,
    greekCompliant: true
  },
  {
    id: 'email-backup',
    type: 'email',
    name: 'Email Backup',
    nameEl: 'Εφεδρικό Email',
    description: 'Email verification codes',
    descriptionEl: 'Κωδικοί επαλήθευσης email',
    status: 'inactive',
    lastUsed: '2025-01-10T16:20:00Z',
    setupDate: '2024-12-15T10:10:00Z',
    trustScore: 60,
    icon: Mail,
    isPrimary: false,
    isRecommended: false,
    greekCompliant: true
  },
  {
    id: 'biometric-windows',
    type: 'biometric',
    name: 'Windows Hello',
    nameEl: 'Windows Hello',
    description: 'Fingerprint and facial recognition',
    descriptionEl: 'Αναγνώριση δακτυλικών αποτυπωμάτων και προσώπου',
    status: 'setup',
    lastUsed: '',
    setupDate: '',
    trustScore: 90,
    icon: Fingerprint,
    isPrimary: false,
    isRecommended: true,
    greekCompliant: true
  },
  {
    id: 'hardware-key',
    type: 'hardware',
    name: 'Hardware Security Key',
    nameEl: 'Κλειδί Ασφαλείας Υλικού',
    description: 'FIDO2/WebAuthn hardware security key',
    descriptionEl: 'Κλειδί ασφαλείας υλικού FIDO2/WebAuthn',
    status: 'setup',
    lastUsed: '',
    setupDate: '',
    trustScore: 98,
    icon: Key,
    isPrimary: false,
    isRecommended: true,
    greekCompliant: true
  }
];

const RECENT_EVENTS: SecurityEvent[] = [
  {
    id: 'event-001',
    timestamp: '2025-01-20T14:30:00Z',
    type: 'login_success',
    method: 'Authenticator App',
    location: 'Athens, Greece',
    device: 'Chrome on Windows',
    ipAddress: '95.130.xxx.xxx',
    riskLevel: 'low'
  },
  {
    id: 'event-002',
    timestamp: '2025-01-20T09:15:00Z',
    type: 'mfa_success',
    method: 'SMS Backup',
    location: 'Thessaloniki, Greece',
    device: 'Mobile Safari',
    ipAddress: '94.66.xxx.xxx',
    riskLevel: 'low'
  },
  {
    id: 'event-003',
    timestamp: '2025-01-19T16:45:00Z',
    type: 'login_failed',
    method: 'Unknown',
    location: 'Sofia, Bulgaria',
    device: 'Chrome on Linux',
    ipAddress: '95.42.xxx.xxx',
    riskLevel: 'high'
  }
];

interface MultiFactorAuthProps {
  locale?: 'en' | 'el';
}

export default function MultiFactorAuth({ locale = 'en' }: MultiFactorAuthProps) {
  const [activeTab, setActiveTab] = useState('methods');
  const [setupMethod, setSetupMethod] = useState<MFAMethod | null>(null);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [qrCode, setQrCode] = useState('');

  const translations = {
    en: {
      title: 'Multi-Factor Authentication',
      subtitle: 'Secure your account with additional verification methods',
      methods: 'MFA Methods',
      activity: 'Security Activity',
      backup: 'Backup Codes',
      settings: 'MFA Settings',
      setup: 'Setup',
      remove: 'Remove',
      setPrimary: 'Set as Primary',
      active: 'Active',
      inactive: 'Inactive',
      failed: 'Failed',
      recommended: 'Recommended',
      greekCompliant: 'Greek Compliant',
      trustScore: 'Trust Score',
      lastUsed: 'Last Used',
      setupDate: 'Setup Date',
      neverUsed: 'Never used',
      generateCodes: 'Generate Backup Codes',
      downloadCodes: 'Download Codes',
      viewCodes: 'View Codes',
      hideCodes: 'Hide Codes',
      securityLevel: 'Security Level',
      excellent: 'Excellent',
      good: 'Good',
      fair: 'Fair',
      riskLevel: {
        low: 'Low Risk',
        medium: 'Medium Risk',
        high: 'High Risk'
      },
      eventTypes: {
        login_success: 'Successful Login',
        login_failed: 'Failed Login',
        mfa_success: 'MFA Success',
        mfa_failed: 'MFA Failed',
        device_new: 'New Device'
      }
    },
    el: {
      title: 'Πολυπαραγοντική Αυθεντικοποίηση',
      subtitle: 'Ασφαλίστε τον λογαριασμό σας με επιπλέον μεθόδους επαλήθευσης',
      methods: 'Μέθοδοι MFA',
      activity: 'Δραστηριότητα Ασφαλείας',
      backup: 'Εφεδρικοί Κωδικοί',
      settings: 'Ρυθμίσεις MFA',
      setup: 'Εγκατάσταση',
      remove: 'Αφαίρεση',
      setPrimary: 'Ορισμός ως Κύριο',
      active: 'Ενεργό',
      inactive: 'Ανενεργό',
      failed: 'Αποτυχία',
      recommended: 'Συνιστώμενο',
      greekCompliant: 'Ελληνική Συμμόρφωση',
      trustScore: 'Βαθμός Εμπιστοσύνης',
      lastUsed: 'Τελευταία Χρήση',
      setupDate: 'Ημερομηνία Εγκατάστασης',
      neverUsed: 'Ποτέ δεν χρησιμοποιήθηκε',
      generateCodes: 'Δημιουργία Εφεδρικών Κωδικών',
      downloadCodes: 'Λήψη Κωδικών',
      viewCodes: 'Προβολή Κωδικών',
      hideCodes: 'Απόκρυψη Κωδικών',
      securityLevel: 'Επίπεδο Ασφαλείας',
      excellent: 'Άριστο',
      good: 'Καλό',
      fair: 'Μέτριο',
      riskLevel: {
        low: 'Χαμηλός Κίνδυνος',
        medium: 'Μέτριος Κίνδυνος',
        high: 'Υψηλός Κίνδυνος'
      },
      eventTypes: {
        login_success: 'Επιτυχής Σύνδεση',
        login_failed: 'Αποτυχημένη Σύνδεση',
        mfa_success: 'Επιτυχία MFA',
        mfa_failed: 'Αποτυχία MFA',
        device_new: 'Νέα Συσκευή'
      }
    }
  };

  const t = translations[locale];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'setup': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getSecurityLevel = (score: number) => {
    if (score >= 90) return { level: t.excellent, color: 'text-green-600' };
    if (score >= 70) return { level: t.good, color: 'text-blue-600' };
    return { level: t.fair, color: 'text-yellow-600' };
  };

  const activeMethods = MFA_METHODS.filter(m => m.status === 'active').length;
  const averageTrustScore = Math.round(
    MFA_METHODS.filter(m => m.status === 'active')
      .reduce((acc, method) => acc + method.trustScore, 0) / activeMethods
  );

  const backupCodes = [
    'A1B2-C3D4-E5F6',
    'G7H8-I9J0-K1L2',
    'M3N4-O5P6-Q7R8',
    'S9T0-U1V2-W3X4',
    'Y5Z6-A7B8-C9D0',
    'E1F2-G3H4-I5J6',
    'K7L8-M9N0-O1P2',
    'Q3R4-S5T6-U7V8'
  ];

  if (setupMethod) {
    const Icon = setupMethod.icon;
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Button variant="ghost" onClick={() => setSetupMethod(null)} className="mb-6">
          ← Back to MFA Methods
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Icon className="h-6 w-6 text-blue-600" />
              Setup {locale === 'en' ? setupMethod.name : setupMethod.nameEl}
            </CardTitle>
            <p className="text-gray-600">
              {locale === 'en' ? setupMethod.description : setupMethod.descriptionEl}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {setupMethod.type === 'authenticator' && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300 inline-block">
                    <QrCode className="h-32 w-32 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Scan this QR code with your authenticator app
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>Manual Entry Key</Label>
                  <div className="flex gap-2">
                    <Input 
                      value="JBSWY3DPEHPK3PXP" 
                      readOnly 
                      className="font-mono text-sm"
                    />
                    <Button variant="outline" size="sm">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Enter Verification Code</Label>
                  <Input placeholder="123456" maxLength={6} className="font-mono text-center text-lg" />
                </div>
              </div>
            )}

            {setupMethod.type === 'sms' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Greek Mobile Number</Label>
                  <Input placeholder="+30 69X XXX XXXX" />
                  <p className="text-sm text-gray-600">
                    Must be a valid Greek mobile number for compliance
                  </p>
                </div>

                <Button className="w-full">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Verification SMS
                </Button>
              </div>
            )}

            {setupMethod.type === 'biometric' && (
              <div className="space-y-4">
                <div className="text-center py-8">
                  <Fingerprint className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                  <h4 className="font-semibold mb-2">Biometric Setup Required</h4>
                  <p className="text-gray-600">
                    Windows Hello must be configured on this device
                  </p>
                </div>

                <Button className="w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  Configure Windows Hello
                </Button>
              </div>
            )}

            {setupMethod.type === 'hardware' && (
              <div className="space-y-4">
                <div className="text-center py-8">
                  <Key className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                  <h4 className="font-semibold mb-2">Insert Security Key</h4>
                  <p className="text-gray-600">
                    Connect your FIDO2 security key to continue
                  </p>
                </div>

                <Button className="w-full">
                  <Zap className="h-4 w-4 mr-2" />
                  Detect Security Key
                </Button>
              </div>
            )}

            <div className="flex gap-3">
              <Button className="flex-1">
                Complete Setup
              </Button>
              <Button variant="outline" onClick={() => setSetupMethod(null)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
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

        {/* MFA Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Active Methods</p>
                  <p className="text-2xl font-bold text-green-600">{activeMethods}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <Progress value={(activeMethods / MFA_METHODS.length) * 100} className="mt-3" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">{t.trustScore}</p>
                  <p className="text-2xl font-bold text-blue-600">{averageTrustScore}%</p>
                </div>
                <Shield className="h-8 w-8 text-blue-600" />
              </div>
              <div className="mt-3">
                <span className={`text-sm font-medium ${getSecurityLevel(averageTrustScore).color}`}>
                  {getSecurityLevel(averageTrustScore).level}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">{t.securityLevel}</p>
                  <p className="text-2xl font-bold text-purple-600">Zero-Trust</p>
                </div>
                <Key className="h-8 w-8 text-purple-600" />
              </div>
              <Badge className="bg-purple-100 text-purple-800 mt-2">Enterprise Grade</Badge>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="methods">{t.methods}</TabsTrigger>
          <TabsTrigger value="activity">{t.activity}</TabsTrigger>
          <TabsTrigger value="backup">{t.backup}</TabsTrigger>
          <TabsTrigger value="settings">{t.settings}</TabsTrigger>
        </TabsList>

        <TabsContent value="methods" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {MFA_METHODS.map((method) => {
              const Icon = method.icon;
              const securityLevel = getSecurityLevel(method.trustScore);
              
              return (
                <Card key={method.id} className="relative">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Icon className="h-6 w-6 text-blue-600" />
                        <div>
                          <CardTitle className="text-lg">
                            {locale === 'en' ? method.name : method.nameEl}
                          </CardTitle>
                          <p className="text-sm text-gray-600">
                            {locale === 'en' ? method.description : method.descriptionEl}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Badge className={getStatusColor(method.status)}>
                          {t[method.status as keyof typeof t] || method.status}
                        </Badge>
                        {method.isPrimary && (
                          <Badge className="bg-blue-100 text-blue-800 text-xs">
                            Primary
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3">
                      {method.isRecommended && (
                        <Badge variant="outline" className="text-green-700 border-green-300">
                          {t.recommended}
                        </Badge>
                      )}
                      {method.greekCompliant && (
                        <Badge variant="outline" className="text-blue-700 border-blue-300">
                          {t.greekCompliant}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{t.trustScore}</span>
                        <div className="flex items-center gap-2">
                          <Progress value={method.trustScore} className="w-20 h-2" />
                          <span className={`font-medium ${securityLevel.color}`}>
                            {method.trustScore}%
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">{t.setupDate}:</span>
                          <div>{method.setupDate ? new Date(method.setupDate).toLocaleDateString() : 'Not setup'}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">{t.lastUsed}:</span>
                          <div>{method.lastUsed ? new Date(method.lastUsed).toLocaleDateString() : t.neverUsed}</div>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-3 border-t">
                        {method.status === 'setup' ? (
                          <Button 
                            size="sm" 
                            className="flex-1"
                            onClick={() => setSetupMethod(method)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            {t.setup}
                          </Button>
                        ) : (
                          <>
                            <Button variant="outline" size="sm" className="flex-1">
                              <Settings className="h-4 w-4 mr-2" />
                              Configure
                            </Button>
                            {!method.isPrimary && method.status === 'active' && (
                              <Button variant="outline" size="sm">
                                {t.setPrimary}
                              </Button>
                            )}
                            <Button variant="outline" size="sm" className="text-red-600">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Security Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {RECENT_EVENTS.map((event) => (
                  <div key={event.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold">
                            {t.eventTypes[event.type as keyof typeof t.eventTypes]}
                          </h4>
                          <span className={`text-sm font-medium ${getRiskColor(event.riskLevel)}`}>
                            {(t.riskLevel as any)[event.riskLevel] || event.riskLevel}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Method:</span> {event.method}
                          </div>
                          <div>
                            <span className="font-medium">Location:</span> {event.location}
                          </div>
                          <div>
                            <span className="font-medium">Device:</span> {event.device}
                          </div>
                          <div>
                            <span className="font-medium">Time:</span> {new Date(event.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Backup Recovery Codes
              </CardTitle>
              <p className="text-gray-600">
                Use these codes if you lose access to your primary MFA methods
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <Button onClick={() => setShowBackupCodes(!showBackupCodes)}>
                    {showBackupCodes ? (
                      <>
                        <EyeOff className="h-4 w-4 mr-2" />
                        {t.hideCodes}
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        {t.viewCodes}
                      </>
                    )}
                  </Button>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    {t.downloadCodes}
                  </Button>
                  <Button variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {t.generateCodes}
                  </Button>
                </div>

                {showBackupCodes && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-lg">
                    {backupCodes.map((code, index) => (
                      <div key={index} className="bg-white p-3 rounded border text-center font-mono text-sm">
                        {code}
                      </div>
                    ))}
                  </div>
                )}

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-yellow-800">Important:</p>
                      <ul className="text-yellow-700 mt-1 space-y-1">
                        <li>• Each code can only be used once</li>
                        <li>• Store these codes in a safe place</li>
                        <li>• Generate new codes if these are compromised</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>MFA Policy Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Require MFA for all logins</Label>
                  <p className="text-sm text-gray-600">Always require multi-factor authentication</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Remember trusted devices</Label>
                  <p className="text-sm text-gray-600">Skip MFA for 30 days on trusted devices</p>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Greek compliance mode</Label>
                  <p className="text-sm text-gray-600">Enforce GDPR and Greek data protection requirements</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">High-risk location alerts</Label>
                  <p className="text-sm text-gray-600">Alert when login attempts from unusual locations</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}