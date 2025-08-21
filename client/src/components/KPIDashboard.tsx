import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  TrendingUp, 
  TrendingDown,
  AlertTriangle, 
  Shield,
  Clock,
  Target,
  Award,
  Zap
} from "lucide-react";

interface KPIMetrics {
  coverage: {
    current: number;
    target: number;
    trend: 'up' | 'down' | 'stable';
  };
  lateSubmissionRisk: {
    daysRemaining: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    openExceptions: number;
    blockers: string[];
  };
  penaltyGuard: {
    mismatchRiskToday: number;
    offSitePunches: number;
    unvalidatedEvents: number;
    riskScore: number;
  };
  evidenceRetention: {
    totalPacks: number;
    oldestPack: string;
    complianceScore: number;
  };
}

interface KPIDashboardProps {
  metrics: KPIMetrics;
  month: string;
  locale?: 'en' | 'el';
}

/**
 * KPI Dashboard with Risk Guards and Penalty Monitoring
 * KPIs & φύλακες κινδύνου
 */
export function KPIDashboard({ metrics, month, locale = 'el' }: KPIDashboardProps) {
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-red-400';
      case 'medium': return 'bg-yellow-400';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-400';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <div className="w-4 h-4" />;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(locale === 'el' ? 'el-GR' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Coverage KPI - ≥98% Target */}
      <Card className={`border-2 ${
        metrics.coverage.current >= metrics.coverage.target 
          ? 'border-green-200 bg-green-50' 
          : 'border-red-200 bg-red-50'
      }`}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              <span>{locale === 'el' ? 'Κάλυψη γραμμών χωρίς εξαιρέσεις' : 'Coverage Without Exceptions'}</span>
            </div>
            {getTrendIcon(metrics.coverage.trend)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-end gap-4">
              <div className="text-4xl font-bold">
                {metrics.coverage.current.toFixed(1)}%
              </div>
              <div className="text-lg text-gray-600 pb-1">
                {locale === 'el' ? 'στόχος' : 'target'}: {metrics.coverage.target}%
              </div>
            </div>
            
            <Progress 
              value={metrics.coverage.current} 
              className="h-3"
            />
            
            <div className="flex justify-between items-center text-sm">
              <span className={
                metrics.coverage.current >= metrics.coverage.target 
                  ? 'text-green-700 font-medium' 
                  : 'text-red-700 font-medium'
              }>
                {metrics.coverage.current >= metrics.coverage.target 
                  ? (locale === 'el' ? '✓ Στόχος επιτεύχθηκε' : '✓ Target achieved')
                  : (locale === 'el' 
                      ? `Απομένουν ${(metrics.coverage.target - metrics.coverage.current).toFixed(1)}% για στόχο` 
                      : `${(metrics.coverage.target - metrics.coverage.current).toFixed(1)}% below target`)
                }
              </span>
              
              {metrics.coverage.current >= metrics.coverage.target && (
                <Badge className="bg-green-100 text-green-800 border-green-300">
                  <Award className="h-3 w-3 mr-1" />
                  {locale === 'el' ? 'Έτοιμο για υποβολή' : 'Ready for Submission'}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Late Submission Risk */}
      <Card className="border-2 border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-600" />
            <span>{locale === 'el' ? 'Κίνδυνος καθυστερημένης υποβολής' : 'Late Submission Risk'}</span>
            <div className={`w-3 h-3 rounded-full ${getRiskColor(metrics.lateSubmissionRisk.riskLevel)}`} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {metrics.lateSubmissionRisk.daysRemaining}
                </div>
                <div className="text-sm text-gray-600">
                  {locale === 'el' ? 'ημέρες απομένουν' : 'days remaining'}
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {metrics.lateSubmissionRisk.openExceptions}
                </div>
                <div className="text-sm text-gray-600">
                  {locale === 'el' ? 'ανοιχτές εξαιρέσεις' : 'open exceptions'}
                </div>
              </div>
              
              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  metrics.lateSubmissionRisk.riskLevel === 'critical' ? 'text-red-600' :
                  metrics.lateSubmissionRisk.riskLevel === 'high' ? 'text-red-500' :
                  metrics.lateSubmissionRisk.riskLevel === 'medium' ? 'text-yellow-600' :
                  'text-green-600'
                }`}>
                  {metrics.lateSubmissionRisk.riskLevel.toUpperCase()}
                </div>
                <div className="text-sm text-gray-600">
                  {locale === 'el' ? 'επίπεδο κινδύνου' : 'risk level'}
                </div>
              </div>
            </div>

            {/* Risk Alert */}
            {metrics.lateSubmissionRisk.riskLevel === 'high' || metrics.lateSubmissionRisk.riskLevel === 'critical' ? (
              <Alert className="bg-red-50 border-red-200">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="text-red-800">
                  {locale === 'el' ? 'Κόφτης υποβολής ενεργός!' : 'Submission Cutoff Active!'}
                </AlertTitle>
                <AlertDescription className="text-red-700">
                  {locale === 'el' 
                    ? `Δεν θα επιτραπεί υποβολή αν οι εξαιρέσεις >0.5%. Τρέχουσες: ${metrics.lateSubmissionRisk.openExceptions}` 
                    : `Submission blocked if exceptions >0.5%. Current: ${metrics.lateSubmissionRisk.openExceptions}`
                  }
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="bg-green-50 border-green-200">
                <Shield className="h-4 w-4" />
                <AlertDescription className="text-green-700">
                  {locale === 'el' 
                    ? 'Κίνδυνος καθυστέρησης χαμηλός. Συνεχίστε με την τρέχουσα πρόοδο.' 
                    : 'Low delay risk. Continue with current progress.'
                  }
                </AlertDescription>
              </Alert>
            )}

            {/* Blockers */}
            {metrics.lateSubmissionRisk.blockers.length > 0 && (
              <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                <div className="font-medium text-yellow-800 mb-2">
                  {locale === 'el' ? 'Εμπόδια υποβολής:' : 'Submission Blockers:'}
                </div>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {metrics.lateSubmissionRisk.blockers.map((blocker, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <div className="w-1 h-1 bg-yellow-600 rounded-full" />
                      {blocker}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Penalty Guard - Daily Mismatch Risk */}
      <Card className="border-2 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-600" />
            <span>{locale === 'el' ? 'Φύλακας ποινών - Ημερήσιος κίνδυνος' : 'Penalty Guard - Daily Risk'}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-3 rounded text-center">
                <div className="text-xl font-bold text-gray-800">
                  {metrics.penaltyGuard.mismatchRiskToday.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">
                  {locale === 'el' ? 'κίνδυνος σήμερα' : 'risk today'}
                </div>
              </div>
              
              <div className="bg-orange-50 p-3 rounded text-center">
                <div className="text-xl font-bold text-orange-600">
                  {metrics.penaltyGuard.offSitePunches}
                </div>
                <div className="text-sm text-gray-600">
                  {locale === 'el' ? 'εκτός εγκαταστάσεων' : 'off-site punches'}
                </div>
              </div>
              
              <div className="bg-yellow-50 p-3 rounded text-center">
                <div className="text-xl font-bold text-yellow-600">
                  {metrics.penaltyGuard.unvalidatedEvents}
                </div>
                <div className="text-sm text-gray-600">
                  {locale === 'el' ? 'μη επιβεβαιωμένα' : 'unvalidated events'}
                </div>
              </div>
            </div>

            {/* Risk Score */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">
                  {locale === 'el' ? 'Σκορ κινδύνου ποινής:' : 'Penalty Risk Score:'}
                </span>
                <span className={`font-bold ${
                  metrics.penaltyGuard.riskScore < 30 ? 'text-green-600' :
                  metrics.penaltyGuard.riskScore < 60 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {metrics.penaltyGuard.riskScore}/100
                </span>
              </div>
              <Progress 
                value={metrics.penaltyGuard.riskScore} 
                className="h-2"
              />
            </div>

            {/* Risk Assessment */}
            {metrics.penaltyGuard.riskScore >= 60 ? (
              <Alert className="bg-red-50 border-red-200">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-red-700">
                  {locale === 'el' 
                    ? 'Υψηλός κίνδυνος ποινής! Απαιτείται άμεση δράση για επιβεβαίωση χτυπημάτων εκτός εγκαταστάσεων.' 
                    : 'High penalty risk! Immediate action required to validate off-site punches.'
                  }
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="bg-green-50 border-green-200">
                <Shield className="h-4 w-4" />
                <AlertDescription className="text-green-700">
                  {locale === 'el' 
                    ? 'Κίνδυνος ποινής χαμηλός. Συνεχίστε με την παρακολούθηση.' 
                    : 'Penalty risk low. Continue monitoring.'
                  }
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 5-Year Evidence Retention */}
      <Card className="border-2 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-600" />
            <span>{locale === 'el' ? '5-ετής διατήρηση στοιχείων' : '5-Year Evidence Retention'}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-3 rounded text-center">
                <div className="text-xl font-bold text-blue-600">
                  {metrics.evidenceRetention.totalPacks.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">
                  {locale === 'el' ? 'πακέτα αποδείξεων' : 'evidence packs'}
                </div>
              </div>
              
              <div className="bg-gray-50 p-3 rounded text-center">
                <div className="text-sm font-bold text-gray-600">
                  {formatDate(metrics.evidenceRetention.oldestPack)}
                </div>
                <div className="text-sm text-gray-600">
                  {locale === 'el' ? 'παλαιότερο πακέτο' : 'oldest pack'}
                </div>
              </div>
              
              <div className="bg-green-50 p-3 rounded text-center">
                <div className="text-xl font-bold text-green-600">
                  {metrics.evidenceRetention.complianceScore}%
                </div>
                <div className="text-sm text-gray-600">
                  {locale === 'el' ? 'συμμόρφωση' : 'compliance'}
                </div>
              </div>
            </div>

            <Alert className="bg-blue-50 border-blue-200">
              <Zap className="h-4 w-4" />
              <AlertDescription className="text-blue-700">
                {locale === 'el' 
                  ? 'Όλα τα στοιχεία διατηρούνται με κρυπτογραφική ακεραιότητα για 5 έτη σύμφωνα με την ελληνική νομοθεσία.' 
                  : 'All evidence maintained with cryptographic integrity for 5 years per Greek legislation.'
                }
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}