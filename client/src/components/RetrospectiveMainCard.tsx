import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  FileText,
  Send,
  TrendingUp
} from "lucide-react";

interface MainCardProps {
  month: string;
  locale?: 'en' | 'el';
  coverageDays: { covered: number; total: number };
  exceptions: number;
  readyLinesPercent: number;
  daysUntilDeadline: number;
  onPreview: () => void;
  onSubmit: () => void;
  canSubmit: boolean;
}

/**
 * Main Retrospective Card - Primary UI element showing current month status
 * Κύρια κάρτα «Απολογιστικό: Μήνας Αύγ 2025» με progress
 */
export function RetrospectiveMainCard({
  month,
  locale = 'el',
  coverageDays,
  exceptions,
  readyLinesPercent,
  daysUntilDeadline,
  onPreview,
  onSubmit,
  canSubmit
}: MainCardProps) {
  const monthName = new Date(month + '-01').toLocaleDateString(locale === 'el' ? 'el-GR' : 'en-US', {
    year: 'numeric',
    month: 'long'
  });

  const getDeadlineStatus = () => {
    if (daysUntilDeadline < 0) return 'overdue';
    if (daysUntilDeadline <= 2) return 'critical';
    if (daysUntilDeadline <= 5) return 'warning';
    return 'ok';
  };

  const getDeadlineColor = () => {
    const status = getDeadlineStatus();
    switch (status) {
      case 'overdue': return 'bg-red-500';
      case 'critical': return 'bg-red-400';
      case 'warning': return 'bg-yellow-400';
      default: return 'bg-green-500';
    }
  };

  const getReadyLinesColor = () => {
    if (readyLinesPercent >= 98) return 'text-green-600';
    if (readyLinesPercent >= 95) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-4">
      {/* Deadline Alert */}
      {daysUntilDeadline <= 5 && (
        <Alert className={`border-l-4 ${
          daysUntilDeadline < 0 ? 'border-l-red-500 bg-red-50' : 
          daysUntilDeadline <= 2 ? 'border-l-red-400 bg-red-50' :
          'border-l-yellow-400 bg-yellow-50'
        }`}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="font-semibold">
            {locale === 'el' ? 'Ειδοποίηση προθεσμίας' : 'Deadline Notification'}
          </AlertTitle>
          <AlertDescription>
            {daysUntilDeadline < 0 
              ? (locale === 'el' 
                  ? `Προθεσμία παρήλθε πριν ${Math.abs(daysUntilDeadline)} ημέρες για ${monthName}` 
                  : `Deadline passed ${Math.abs(daysUntilDeadline)} days ago for ${monthName}`)
              : (locale === 'el' 
                  ? `Απομένουν ${daysUntilDeadline} ημέρες για την αποστολή ${monthName}` 
                  : `${daysUntilDeadline} days remaining for ${monthName} submission`)
            }
          </AlertDescription>
        </Alert>
      )}

      {/* Main Progress Card */}
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${getDeadlineColor()}`}></div>
              <CardTitle className="text-2xl font-bold text-gray-800">
                {locale === 'el' ? 'Απολογιστικό' : 'Retrospective'}: {monthName}
              </CardTitle>
            </div>
            <Badge variant="outline" className="bg-white">
              {locale === 'el' ? 'Ενεργό' : 'Active'}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Key Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Coverage Days */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-gray-700">
                  {locale === 'el' ? 'Καλυμμένες ημέρες' : 'Covered Days'}
                </span>
              </div>
              <div className="text-3xl font-bold text-gray-800 mb-1">
                {coverageDays.covered}/{coverageDays.total}
              </div>
              <Progress 
                value={(coverageDays.covered / coverageDays.total) * 100} 
                className="h-2" 
              />
            </div>

            {/* Exceptions */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <span className="font-medium text-gray-700">Exceptions</span>
              </div>
              <div className="text-3xl font-bold text-yellow-600 mb-1">
                {exceptions}
              </div>
              <div className="text-sm text-gray-600">
                {exceptions === 0 
                  ? (locale === 'el' ? 'Όλες επιλυμένες' : 'All resolved')
                  : (locale === 'el' ? 'Απαιτούν επιλυση' : 'Need resolution')
                }
              </div>
            </div>

            {/* Ready Lines */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span className="font-medium text-gray-700">
                  {locale === 'el' ? 'Έτοιμες γραμμές' : 'Ready Lines'}
                </span>
              </div>
              <div className={`text-3xl font-bold mb-1 ${getReadyLinesColor()}`}>
                {readyLinesPercent}%
              </div>
              <div className="text-sm text-gray-600">
                {readyLinesPercent >= 98 
                  ? (locale === 'el' ? 'Έτοιμο για υποβολή' : 'Ready for submission')
                  : (locale === 'el' ? 'Χρειάζεται βελτίωση' : 'Needs improvement')
                }
              </div>
            </div>
          </div>

          {/* Overall Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-700">
                {locale === 'el' ? 'Συνολική πρόοδος' : 'Overall Progress'}
              </span>
              <span className="text-sm text-gray-600">
                {Math.round((readyLinesPercent + (coverageDays.covered / coverageDays.total) * 100) / 2)}%
              </span>
            </div>
            <Progress 
              value={Math.round((readyLinesPercent + (coverageDays.covered / coverageDays.total) * 100) / 2)}
              className="h-3"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <Button 
              variant="outline" 
              onClick={onPreview}
              className="flex-1"
              size="lg"
            >
              <FileText className="h-4 w-4 mr-2" />
              {locale === 'el' ? 'Προεπισκόπηση δηλώσεων' : 'Preview Declarations'}
            </Button>
            
            <Button 
              onClick={onSubmit}
              disabled={!canSubmit}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              <Send className="h-4 w-4 mr-2" />
              {locale === 'el' ? 'Υποβολή' : 'Submit'}
            </Button>
          </div>

          {/* Submission Requirements */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-800 mb-2">
              {locale === 'el' ? 'Απαιτήσεις υποβολής:' : 'Submission Requirements:'}
            </h4>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                {readyLinesPercent >= 98 ? 
                  <CheckCircle className="h-4 w-4 text-green-600" /> : 
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                }
                <span>
                  {locale === 'el' ? 'Κάλυψη ≥98% γραμμών χωρίς εξαιρέσεις' : 'Coverage ≥98% lines without exceptions'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {exceptions === 0 ? 
                  <CheckCircle className="h-4 w-4 text-green-600" /> : 
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                }
                <span>
                  {locale === 'el' ? 'Όλες οι εξαιρέσεις επιλυμένες' : 'All exceptions resolved'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {daysUntilDeadline > 0 ? 
                  <CheckCircle className="h-4 w-4 text-green-600" /> : 
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                }
                <span>
                  {locale === 'el' ? 'Εντός νόμιμης προθεσμίας' : 'Within legal deadline'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}