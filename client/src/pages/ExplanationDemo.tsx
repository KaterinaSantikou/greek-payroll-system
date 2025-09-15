import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PayslipExplanation } from '@/components/PayslipExplanation';
import {
  LanguageSwitch,
  useLanguagePersistence,
} from '@/components/LanguageSwitch';
import { formatNumber, LocaleProvider } from '@/lib/i18n';
import { Loader2, TestTube, Globe, FileText } from 'lucide-react';

interface DemoResponse {
  success: boolean;
  demo: boolean;
  explanation: {
    content: any;
    textEn: string;
    textEl: string;
    coverage: {
      totalPayslipValue: number;
      explainedValue: number;
      coveragePercentage: number;
      unexplainedLines: string[];
    };
    confidenceScore: number;
    qualityMetrics: {
      stackedLinesHandled: number;
      edgeCasesDetected: string[];
      roundingAdjustments: number;
      securityChecksPass: boolean;
    };
  };
  sampleData: any;
}

export function ExplanationDemo() {
  const { locale, changeLocale } = useLanguagePersistence();

  const { data, isLoading, error, refetch } = useQuery<DemoResponse>({
    queryKey: ['/api/explanations/demo', locale],
    queryFn: async () => {
      const response = await fetch(`/api/explanations/demo?locale=${locale}`);
      if (!response.ok) {
        throw new Error('Failed to fetch demo explanation');
      }
      return response.json();
    },
  });

  const handleLocaleChange = (newLocale: 'en' | 'el') => {
    changeLocale(newLocale);
  };

  const handleFeedback = async (feedback: any) => {
    console.log('Demo feedback received:', feedback);
    // In real implementation, this would send feedback to the API
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Generating explanation demo...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-600 mb-4">
                Error loading demo explanation
              </p>
              <Button onClick={() => refetch()} variant="outline">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data?.success || !data.explanation) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">
              No explanation data available
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <TestTube className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">
            {locale === 'en'
              ? 'Explain-Your-Pay Demo'
              : 'Επίδειξη Εξήγησης Μισθοδοσίας'}
          </h1>
        </div>
        <p className="text-gray-600 max-w-2xl mx-auto">
          {locale === 'en'
            ? 'Interactive demonstration of our bilingual payslip explanation system with quality metrics and edge case handling.'
            : 'Διαδραστική επίδειξη του διγλωσσικού συστήματος εξήγησης μισθοδοσίας με μετρικές ποιότητας και χειρισμό ειδικών περιπτώσεων.'}
        </p>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {locale === 'en' ? 'Demo Controls' : 'Έλεγχοι Επίδειξης'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">
              {locale === 'en' ? 'Language:' : 'Γλώσσα:'}
            </span>
            <LanguageSwitch
              locale={locale}
              onLocaleChange={handleLocaleChange}
            />
            <Button onClick={() => refetch()} variant="outline" size="sm">
              {locale === 'en' ? 'Refresh Demo' : 'Ανανέωση'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quality Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {locale === 'en' ? 'Quality Metrics' : 'Μετρικές Ποιότητας'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatNumber(
                  data.explanation.coverage.coveragePercentage,
                  locale,
                  1
                )}
                %
              </div>
              <div className="text-sm text-gray-600">
                {locale === 'en' ? 'Coverage' : 'Κάλυψη'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatNumber(
                  data.explanation.confidenceScore * 100,
                  locale,
                  0
                )}
                %
              </div>
              <div className="text-sm text-gray-600">
                {locale === 'en' ? 'Confidence' : 'Εμπιστοσύνη'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {data.explanation.qualityMetrics.edgeCasesDetected.length}
              </div>
              <div className="text-sm text-gray-600">
                {locale === 'en' ? 'Edge Cases' : 'Ειδικές Περιπτώσεις'}
              </div>
            </div>
            <div className="text-center">
              <div
                className={`text-2xl font-bold ${data.explanation.qualityMetrics.securityChecksPass ? 'text-green-600' : 'text-red-600'}`}
              >
                {data.explanation.qualityMetrics.securityChecksPass ? '✓' : '✗'}
              </div>
              <div className="text-sm text-gray-600">
                {locale === 'en' ? 'Security' : 'Ασφάλεια'}
              </div>
            </div>
          </div>

          {data.explanation.qualityMetrics.edgeCasesDetected.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">
                {locale === 'en'
                  ? 'Edge Cases Detected:'
                  : 'Ειδικές Περιπτώσεις που Εντοπίστηκαν:'}
              </p>
              <div className="flex flex-wrap gap-2">
                {data.explanation.qualityMetrics.edgeCasesDetected.map(
                  edgeCase => (
                    <Badge key={edgeCase} variant="secondary">
                      {edgeCase.replace('_', ' ')}
                    </Badge>
                  )
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sample Data Info */}
      <Card className="bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800">
            {locale === 'en'
              ? 'Sample Payslip Data'
              : 'Δείγμα Δεδομένων Μισθοδοσίας'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <strong>{locale === 'en' ? 'Employee:' : 'Εργαζόμενος:'}</strong>{' '}
              Maria Papadopoulos
            </div>
            <div>
              <strong>{locale === 'en' ? 'Period:' : 'Περίοδος:'}</strong>{' '}
              January 2025
            </div>
            <div>
              <strong>{locale === 'en' ? 'Hourly Rate:' : 'Ωρομίσθιο:'}</strong>{' '}
              €7.50
            </div>
            <div>
              <strong>
                {locale === 'en' ? 'Regular Hours:' : 'Κανονικές Ώρες:'}
              </strong>{' '}
              160h
            </div>
            <div>
              <strong>{locale === 'en' ? 'Overtime:' : 'Υπερωρίες:'}</strong> 6h
            </div>
            <div>
              <strong>
                {locale === 'en' ? 'Night/Sunday:' : 'Νύχτα/Κυριακή:'}
              </strong>{' '}
              8h
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payslip Explanation Component */}
      <PayslipExplanation
        explanationId="demo_explanation"
        content={data.explanation.content}
        textEn={data.explanation.textEn}
        textEl={data.explanation.textEl}
        coverage={data.explanation.coverage}
        confidenceScore={data.explanation.confidenceScore}
        onFeedback={handleFeedback}
        locale={locale}
      />

      {/* Raw Output (for development) */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-gray-700">
            {locale === 'en'
              ? 'Raw Text Output'
              : 'Ακατέργαστη Έξοδος Κειμένου'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-white p-4 rounded border overflow-auto max-h-64">
            {locale === 'en'
              ? data.explanation.textEn
              : data.explanation.textEl}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
