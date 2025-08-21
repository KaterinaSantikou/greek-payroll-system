import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  CheckCircle2, 
  AlertCircle, 
  Euro, 
  Clock, 
  Shield, 
  Database,
  TrendingDown,
  TrendingUp,
  Calendar,
  FileText,
  Users
} from 'lucide-react';
import { generateDigitalWorkCardComplianceReport } from '@/lib/digitalWorkCard';

interface ComplianceDashboardProps {
  companyId: string;
}

interface ComplianceMetrics {
  totalSessions: number;
  compliantSessions: number;
  retrospectiveSessions: number;
  violationSummary: { [key: string]: number };
  penaltyRisk: number;
  erganiSyncRate: number;
  payrollAccuracy: number;
  legalCompliance: {
    retentionCompliance: number;
    auditTrailIntegrity: number;
    modeConsistency: boolean;
  };
  recommendations: string[];
}

export function DigitalWorkCardComplianceDashboard({ companyId }: ComplianceDashboardProps) {
  const [metrics, setMetrics] = useState<ComplianceMetrics>({
    totalSessions: 1247,
    compliantSessions: 1189,
    retrospectiveSessions: 156,
    violationSummary: {
      'late_overtime_reporting': 23,
      'excessive_reporting_delay': 8,
      'missing_location_verification': 12,
      'timestamp_accuracy_issues': 5
    },
    penaltyRisk: 42000, // €42,000 risk
    erganiSyncRate: 97.8,
    payrollAccuracy: 99.2,
    legalCompliance: {
      retentionCompliance: 100,
      auditTrailIntegrity: 99.8,
      modeConsistency: true
    },
    recommendations: [
      'Ενεργοποίηση αυτόματων υπενθυμίσεων για προθεσμίες απολογιστικών καταχωρήσεων',
      'Τακτικός έλεγχος συμμόρφωσης για αποφυγή προστίμων €10,500',
      'Βελτίωση εκπαίδευσης προσωπικού για σωστή χρήση ψηφιακής κάρτας'
    ]
  });

  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const refreshMetrics = async () => {
    setRefreshing(true);
    try {
      // Simulate API call to refresh metrics
      await new Promise(resolve => setTimeout(resolve, 1500));
      setLastRefresh(new Date());
    } finally {
      setRefreshing(false);
    }
  };

  const complianceRate = (metrics.compliantSessions / metrics.totalSessions) * 100;
  const retrospectiveRate = (metrics.retrospectiveSessions / metrics.totalSessions) * 100;

  // Calculate risk level
  const getRiskLevel = (penaltyAmount: number) => {
    if (penaltyAmount === 0) return { level: 'low', color: 'text-green-600', bg: 'bg-green-50' };
    if (penaltyAmount < 25000) return { level: 'medium', color: 'text-amber-600', bg: 'bg-amber-50' };
    return { level: 'high', color: 'text-red-600', bg: 'bg-red-50' };
  };

  const riskLevel = getRiskLevel(metrics.penaltyRisk);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Compliance Dashboard - Ψηφιακή Κάρτα Εργασίας</h1>
          <p className="text-gray-600 mt-2">
            Παρακολούθηση νομικής συμμόρφωσης και κινδύνων προστίμων
          </p>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-500">
            Τελευταία ενημέρωση: {lastRefresh.toLocaleString('el-GR')}
          </p>
          <Button onClick={refreshMetrics} disabled={refreshing} size="sm">
            {refreshing ? 'Ανανέωση...' : 'Ανανέωση'}
          </Button>
        </div>
      </div>

      {/* High-Level Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Compliance */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Συνολική Συμμόρφωση</p>
                <p className="text-2xl font-bold text-green-600">{complianceRate.toFixed(1)}%</p>
                <p className="text-xs text-gray-500">{metrics.compliantSessions}/{metrics.totalSessions} συνεδρίες</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        {/* Penalty Risk */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Κίνδυνος Προστίμου</p>
                <p className={`text-2xl font-bold ${riskLevel.color}`}>
                  €{metrics.penaltyRisk.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">
                  {metrics.penaltyRisk / 10500} παραβάσεις x €10,500
                </p>
              </div>
              <Euro className={`w-8 h-8 ${riskLevel.color}`} />
            </div>
          </CardContent>
        </Card>

        {/* Retrospective Rate */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Απολογιστικές Καταχωρήσεις</p>
                <p className="text-2xl font-bold text-blue-600">{retrospectiveRate.toFixed(1)}%</p>
                <p className="text-xs text-gray-500">{metrics.retrospectiveSessions} από {metrics.totalSessions}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        {/* ERGANI Sync */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Συγχρονισμός ERGANI II</p>
                <p className="text-2xl font-bold text-purple-600">{metrics.erganiSyncRate.toFixed(1)}%</p>
                <p className="text-xs text-gray-500">Real-time sync rate</p>
              </div>
              <Database className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Penalty Risk Alert */}
      {metrics.penaltyRisk > 0 && (
        <Alert className={`border-2 ${riskLevel.color.replace('text-', 'border-')}`}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-lg">
            ΠΡΟΣΟΧΗ: Υψηλός Κίνδυνος Προστίμου - €{metrics.penaltyRisk.toLocaleString()}
          </AlertTitle>
          <AlertDescription className="mt-2">
            <div className="space-y-2">
              <p>
                Εντοπίστηκαν {Object.keys(metrics.violationSummary).length} τύποι παραβάσεων που μπορεί να επιφέρουν πρόστιμα. 
                Απαιτείται άμεση δράση για την αποφυγή νομικών συνεπειών.
              </p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" className="bg-red-600 hover:bg-red-700">
                  Άμεση Διόρθωση
                </Button>
                <Button variant="outline" size="sm">
                  Λεπτομέρειες Παραβάσεων
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compliance Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Αναλυτική Συμμόρφωση
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Συνολική Συμμόρφωση</span>
                <Badge variant={complianceRate >= 95 ? 'default' : complianceRate >= 90 ? 'secondary' : 'destructive'}>
                  {complianceRate.toFixed(1)}%
                </Badge>
              </div>
              <Progress value={complianceRate} className="w-full" />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Διατήρηση Αρχείων (5-ετή)</span>
                <Badge variant="default">{metrics.legalCompliance.retentionCompliance}%</Badge>
              </div>
              <Progress value={metrics.legalCompliance.retentionCompliance} className="w-full" />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Ακεραιότητα Audit Trail</span>
                <Badge variant="default">{metrics.legalCompliance.auditTrailIntegrity}%</Badge>
              </div>
              <Progress value={metrics.legalCompliance.auditTrailIntegrity} className="w-full" />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Συγχρονισμός ERGANI II</span>
                <Badge variant="default">{metrics.erganiSyncRate}%</Badge>
              </div>
              <Progress value={metrics.erganiSyncRate} className="w-full" />
            </div>
          </CardContent>
        </Card>

        {/* Violations Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Παραβάσεις & Κίνδυνοι
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(metrics.violationSummary).map(([type, count]) => {
                const violationNames: { [key: string]: string } = {
                  'late_overtime_reporting': 'Εκπρόθεσμη Αναφορά Υπερωριών',
                  'excessive_reporting_delay': 'Υπερβολική Καθυστέρηση (>72h)',
                  'missing_location_verification': 'Ελλειπής Επαλήθευση Τοποθεσίας',
                  'timestamp_accuracy_issues': 'Προβλήματα Ακρίβειας Χρονοσημάτων'
                };

                const penaltyPerViolation = type.includes('overtime') || type.includes('delay') ? 10500 : 5000;
                const totalPenaltyForType = count * penaltyPerViolation;

                return (
                  <div key={type} className="flex justify-between items-center p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{violationNames[type] || type}</p>
                      <p className="text-xs text-gray-500">
                        {count} παραβάσεις × €{penaltyPerViolation.toLocaleString()} = €{totalPenaltyForType.toLocaleString()}
                      </p>
                    </div>
                    <Badge variant={count > 10 ? 'destructive' : count > 5 ? 'secondary' : 'outline'}>
                      {count}
                    </Badge>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium text-red-800">Συνολικός Κίνδυνος:</span>
                <span className="text-lg font-bold text-red-600">€{metrics.penaltyRisk.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Legal Compliance Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Νομική Συμμόρφωση & Διατήρηση Αρχείων
          </CardTitle>
          <CardDescription>
            5-ετής διατήρηση, immutable audit trails, και cryptographic integrity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <p className="text-lg font-bold">{metrics.legalCompliance.retentionCompliance}%</p>
              <p className="text-sm text-gray-600">5-ετής Διατήρηση</p>
              <p className="text-xs text-gray-500">Αρχεία εντός νομικών ορίων</p>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <Database className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <p className="text-lg font-bold">{metrics.legalCompliance.auditTrailIntegrity}%</p>
              <p className="text-sm text-gray-600">Audit Trail Integrity</p>
              <p className="text-xs text-gray-500">Cryptographic hashing</p>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-purple-600" />
              <p className="text-lg font-bold">
                {metrics.legalCompliance.modeConsistency ? 'ΝΑΙ' : 'ΟΧΙ'}
              </p>
              <p className="text-sm text-gray-600">Συνέπεια Τρόπου</p>
              <p className="text-xs text-gray-500">Χωρίς μικτούς μήνες</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Συστάσεις Βελτίωσης
          </CardTitle>
          <CardDescription>
            Προτάσεις για βελτίωση συμμόρφωσης και μείωση κινδύνων
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-blue-600">{index + 1}</span>
                </div>
                <p className="text-sm">{recommendation}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Γρήγορες Ενέργειες</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline">
              <FileText className="w-4 h-4 mr-2" />
              Εξαγωγή Αναφοράς Συμμόρφωσης
            </Button>
            <Button size="sm" variant="outline">
              <Users className="w-4 h-4 mr-2" />
              Ειδοποίηση HR Team
            </Button>
            <Button size="sm" variant="outline">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Δημιουργία Incident Report
            </Button>
            <Button size="sm" variant="outline">
              <Calendar className="w-4 h-4 mr-2" />
              Προγραμματισμός Audit
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}