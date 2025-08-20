/**
 * Integration Manager
 * Manage installed integrations, usage analytics, and network effects
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Settings,
  TrendingUp,
  Activity,
  Users,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart,
  ExternalLink,
  RefreshCw,
  Shield,
  CreditCard,
  MessageSquare,
  Trash2,
  Edit,
  Info,
  ArrowLeft
} from 'lucide-react';

interface InstalledIntegration {
  id: string;
  name: string;
  nameEl: string;
  description: string;
  category: string;
  icon: React.ComponentType<any>;
  status: 'active' | 'inactive' | 'error' | 'syncing';
  lastSync: string;
  usageStats: {
    dailyTransactions: number;
    monthlyTransactions: number;
    errorRate: number;
    uptime: number;
  };
  networkImpact: {
    connectionsEnabled: number;
    dataShared: number;
    efficiencyGain: number;
  };
  businessValue: {
    timeSaved: string;
    costReduction: string;
    accuracyImprovement: string;
  };
  configuration: {
    autoSync: boolean;
    notifications: boolean;
    dataRetention: number;
  };
  dependencies: string[];
  isGreekSpecific: boolean;
}

const INSTALLED_INTEGRATIONS: InstalledIntegration[] = [
  {
    id: 'ergani-ii',
    name: 'ERGANI II',
    nameEl: 'ΕΡΓΑΝΗ ΙΙ',
    description: 'Official Greek employment system',
    category: 'Government',
    icon: Shield,
    status: 'active',
    lastSync: '2025-01-20T10:30:00Z',
    usageStats: {
      dailyTransactions: 156,
      monthlyTransactions: 4200,
      errorRate: 0.2,
      uptime: 99.8
    },
    networkImpact: {
      connectionsEnabled: 8,
      dataShared: 95,
      efficiencyGain: 87
    },
    businessValue: {
      timeSaved: '12 hours/week',
      costReduction: '€2,400/month',
      accuracyImprovement: '99.8%'
    },
    configuration: {
      autoSync: true,
      notifications: true,
      dataRetention: 365
    },
    dependencies: ['e-efka', 'digital-work-card'],
    isGreekSpecific: true
  },
  {
    id: 'alpha-bank',
    name: 'Alpha Bank Corporate',
    nameEl: 'Alpha Bank Εταιρικά',
    description: 'Direct salary payments integration',
    category: 'Banking',
    icon: CreditCard,
    status: 'active',
    lastSync: '2025-01-20T09:45:00Z',
    usageStats: {
      dailyTransactions: 89,
      monthlyTransactions: 2100,
      errorRate: 0.1,
      uptime: 99.9
    },
    networkImpact: {
      connectionsEnabled: 5,
      dataShared: 78,
      efficiencyGain: 92
    },
    businessValue: {
      timeSaved: '6 hours/week',
      costReduction: '€800/month',
      accuracyImprovement: '99.9%'
    },
    configuration: {
      autoSync: true,
      notifications: true,
      dataRetention: 180
    },
    dependencies: [],
    isGreekSpecific: true
  },
  {
    id: 'microsoft-teams',
    name: 'Microsoft Teams',
    nameEl: 'Microsoft Teams',
    description: 'HR notifications and workflows',
    category: 'Communication',
    icon: MessageSquare,
    status: 'syncing',
    lastSync: '2025-01-20T08:20:00Z',
    usageStats: {
      dailyTransactions: 234,
      monthlyTransactions: 6800,
      errorRate: 0.5,
      uptime: 98.7
    },
    networkImpact: {
      connectionsEnabled: 12,
      dataShared: 65,
      efficiencyGain: 73
    },
    businessValue: {
      timeSaved: '4 hours/week',
      costReduction: '€400/month',
      accuracyImprovement: '94.2%'
    },
    configuration: {
      autoSync: true,
      notifications: false,
      dataRetention: 90
    },
    dependencies: ['office365'],
    isGreekSpecific: false
  }
];

interface IntegrationManagerProps {
  locale?: 'en' | 'el';
}

export default function IntegrationManager({ locale = 'en' }: IntegrationManagerProps) {
  const [selectedIntegration, setSelectedIntegration] = useState<InstalledIntegration | null>(null);
  const [view, setView] = useState<'overview' | 'details'>('overview');

  const translations = {
    en: {
      title: 'Integration Manager',
      subtitle: 'Monitor and manage your active integrations',
      overview: 'Overview',
      details: 'Details',
      status: 'Status',
      active: 'Active',
      inactive: 'Inactive',
      error: 'Error',
      syncing: 'Syncing',
      lastSync: 'Last Sync',
      dailyTransactions: 'Daily Transactions',
      monthlyTransactions: 'Monthly Transactions',
      errorRate: 'Error Rate',
      uptime: 'Uptime',
      networkImpact: 'Network Impact',
      connectionsEnabled: 'Connections Enabled',
      dataShared: 'Data Shared',
      efficiencyGain: 'Efficiency Gain',
      businessValue: 'Business Value',
      timeSaved: 'Time Saved',
      costReduction: 'Cost Reduction',
      accuracyImprovement: 'Accuracy',
      configuration: 'Configuration',
      autoSync: 'Auto Sync',
      notifications: 'Notifications',
      dataRetention: 'Data Retention (days)',
      dependencies: 'Dependencies',
      configure: 'Configure',
      disable: 'Disable',
      remove: 'Remove',
      refresh: 'Refresh',
      backToOverview: 'Back to Overview',
      networkEffects: {
        totalConnections: 'Total Connections',
        averageEfficiency: 'Average Efficiency',
        dataFlow: 'Daily Data Flow',
        businessImpact: 'Business Impact Score'
      }
    },
    el: {
      title: 'Διαχειριστής Ενσωματώσεων',
      subtitle: 'Παρακολουθήστε και διαχειριστείτε τις ενεργές ενσωματώσεις σας',
      overview: 'Επισκόπηση',
      details: 'Λεπτομέρειες',
      status: 'Κατάσταση',
      active: 'Ενεργό',
      inactive: 'Ανενεργό',
      error: 'Σφάλμα',
      syncing: 'Συγχρονισμός',
      lastSync: 'Τελευταίος Συγχρονισμός',
      dailyTransactions: 'Ημερήσιες Συναλλαγές',
      monthlyTransactions: 'Μηνιαίες Συναλλαγές',
      errorRate: 'Ποσοστό Σφαλμάτων',
      uptime: 'Χρόνος Λειτουργίας',
      networkImpact: 'Δικτυακός Αντίκτυπος',
      connectionsEnabled: 'Συνδέσεις Ενεργοποιημένες',
      dataShared: 'Δεδομένα Κοινοποιημένα',
      efficiencyGain: 'Κέρδος Αποδοτικότητας',
      businessValue: 'Επιχειρηματική Αξία',
      timeSaved: 'Εξοικονόμηση Χρόνου',
      costReduction: 'Μείωση Κόστους',
      accuracyImprovement: 'Ακρίβεια',
      configuration: 'Διαμόρφωση',
      autoSync: 'Αυτόματος Συγχρονισμός',
      notifications: 'Ειδοποιήσεις',
      dataRetention: 'Διατήρηση Δεδομένων (ημέρες)',
      dependencies: 'Εξαρτήσεις',
      configure: 'Διαμόρφωση',
      disable: 'Απενεργοποίηση',
      remove: 'Αφαίρεση',
      refresh: 'Ανανέωση',
      backToOverview: 'Επιστροφή στην Επισκόπηση',
      networkEffects: {
        totalConnections: 'Συνολικές Συνδέσεις',
        averageEfficiency: 'Μέση Αποδοτικότητα',
        dataFlow: 'Ημερήσια Ροή Δεδομένων',
        businessImpact: 'Βαθμός Επιχειρηματικού Αντικτύπου'
      }
    }
  };

  const t = translations[locale];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'syncing': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return CheckCircle;
      case 'inactive': return Clock;
      case 'error': return AlertTriangle;
      case 'syncing': return RefreshCw;
      default: return Info;
    }
  };

  const formatLastSync = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'Just now';
  };

  // Calculate network effects metrics
  const totalConnections = INSTALLED_INTEGRATIONS.reduce((acc, integration) => 
    acc + integration.networkImpact.connectionsEnabled, 0
  );
  
  const averageEfficiency = Math.round(
    INSTALLED_INTEGRATIONS.reduce((acc, integration) => 
      acc + integration.networkImpact.efficiencyGain, 0
    ) / INSTALLED_INTEGRATIONS.length
  );
  
  const dailyDataFlow = INSTALLED_INTEGRATIONS.reduce((acc, integration) => 
    acc + integration.usageStats.dailyTransactions, 0
  );

  const businessImpactScore = Math.round(
    (totalConnections * 2.5) + (averageEfficiency * 0.8) + (dailyDataFlow * 0.1)
  );

  if (view === 'details' && selectedIntegration) {
    const Icon = selectedIntegration.icon;
    const StatusIcon = getStatusIcon(selectedIntegration.status);
    
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Button variant="ghost" onClick={() => setView('overview')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t.backToOverview}
        </Button>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Integration Header */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Icon className="h-8 w-8 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">
                        {locale === 'en' ? selectedIntegration.name : selectedIntegration.nameEl}
                      </CardTitle>
                      <p className="text-gray-600">{selectedIntegration.description}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <Badge className={getStatusColor(selectedIntegration.status)}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {(t as any)[selectedIntegration.status] || selectedIntegration.status}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {t.lastSync}: {formatLastSync(selectedIntegration.lastSync)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {t.refresh}
                  </Button>
                </div>
              </CardHeader>
            </Card>

            {/* Usage Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart className="h-5 w-5" />
                  Usage Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {selectedIntegration.usageStats.dailyTransactions}
                    </div>
                    <div className="text-sm text-gray-600">{t.dailyTransactions}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {selectedIntegration.usageStats.monthlyTransactions.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">{t.monthlyTransactions}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {selectedIntegration.usageStats.errorRate}%
                    </div>
                    <div className="text-sm text-gray-600">{t.errorRate}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {selectedIntegration.usageStats.uptime}%
                    </div>
                    <div className="text-sm text-gray-600">{t.uptime}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Network Impact */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  {t.networkImpact}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>{t.connectionsEnabled}</span>
                    <div className="flex items-center gap-2">
                      <Progress value={selectedIntegration.networkImpact.connectionsEnabled * 8} className="w-24" />
                      <span className="font-medium">{selectedIntegration.networkImpact.connectionsEnabled}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{t.dataShared}</span>
                    <div className="flex items-center gap-2">
                      <Progress value={selectedIntegration.networkImpact.dataShared} className="w-24" />
                      <span className="font-medium">{selectedIntegration.networkImpact.dataShared}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{t.efficiencyGain}</span>
                    <div className="flex items-center gap-2">
                      <Progress value={selectedIntegration.networkImpact.efficiencyGain} className="w-24" />
                      <span className="font-medium">{selectedIntegration.networkImpact.efficiencyGain}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Business Value */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t.businessValue}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm text-gray-600">{t.timeSaved}</div>
                  <div className="font-semibold text-green-600">{selectedIntegration.businessValue.timeSaved}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">{t.costReduction}</div>
                  <div className="font-semibold text-blue-600">{selectedIntegration.businessValue.costReduction}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">{t.accuracyImprovement}</div>
                  <div className="font-semibold text-purple-600">{selectedIntegration.businessValue.accuracyImprovement}</div>
                </div>
              </CardContent>
            </Card>

            {/* Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t.configuration}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>{t.autoSync}</Label>
                  <Switch checked={selectedIntegration.configuration.autoSync} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>{t.notifications}</Label>
                  <Switch checked={selectedIntegration.configuration.notifications} />
                </div>
                <div>
                  <Label className="text-sm">{t.dataRetention}</Label>
                  <div className="font-medium">{selectedIntegration.configuration.dataRetention}</div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="p-6 space-y-3">
                <Button className="w-full" variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  {t.configure}
                </Button>
                <Button className="w-full" variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Settings
                </Button>
                <Button className="w-full text-red-600" variant="outline">
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t.remove}
                </Button>
              </CardContent>
            </Card>

            {/* Dependencies */}
            {selectedIntegration.dependencies.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t.dependencies}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {selectedIntegration.dependencies.map((dep, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        <span className="text-sm">{dep}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t.title}</h1>
        <p className="text-gray-600 mt-2">{t.subtitle}</p>
      </div>

      {/* Network Effects Dashboard */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Network Effects Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{totalConnections}</div>
              <div className="text-sm text-gray-600">{t.networkEffects.totalConnections}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{averageEfficiency}%</div>
              <div className="text-sm text-gray-600">{t.networkEffects.averageEfficiency}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{dailyDataFlow}</div>
              <div className="text-sm text-gray-600">{t.networkEffects.dataFlow}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">{businessImpactScore}</div>
              <div className="text-sm text-gray-600">{t.networkEffects.businessImpact}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Installed Integrations */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {INSTALLED_INTEGRATIONS.map((integration) => {
          const Icon = integration.icon;
          const StatusIcon = getStatusIcon(integration.status);
          
          return (
            <Card 
              key={integration.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => {
                setSelectedIntegration(integration);
                setView('details');
              }}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Icon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {locale === 'en' ? integration.name : integration.nameEl}
                      </CardTitle>
                      <p className="text-sm text-gray-600">{integration.category}</p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(integration.status)}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {(t as any)[integration.status] || integration.status}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">{integration.description}</p>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500">{t.dailyTransactions}</div>
                      <div className="font-medium">{integration.usageStats.dailyTransactions}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">{t.uptime}</div>
                      <div className="font-medium">{integration.usageStats.uptime}%</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{t.efficiencyGain}</span>
                      <span>{integration.networkImpact.efficiencyGain}%</span>
                    </div>
                    <Progress value={integration.networkImpact.efficiencyGain} className="h-2" />
                  </div>
                  
                  <div className="flex justify-between items-center pt-3 border-t">
                    <span className="text-xs text-gray-500">
                      {t.lastSync}: {formatLastSync(integration.lastSync)}
                    </span>
                    <Button variant="outline" size="sm">
                      <Settings className="h-3 w-3 mr-1" />
                      {t.configure}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}