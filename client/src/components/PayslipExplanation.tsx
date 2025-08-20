import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  ChevronRight, 
  Info, 
  Star,
  TrendingUp,
  TrendingDown,
  Calculator,
  FileText,
  HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation, formatCurrency, formatNumber, formatDate } from '@/lib/i18n';

// Types for explanation data
interface ExplanationItem {
  lineCode: string;
  label: string;
  labelEl: string;
  amount: number;
  formula: string;
  formulaEl: string;
  explanation: string;
  explanationEl: string;
  citation: {
    ruleId: string;
    ruleVersion: string;
    policyRef?: string;
    regulationRef?: string;
  };
  variables: Record<string, any>;
}

interface ExplanationSection {
  type: 'earnings' | 'deductions' | 'summary';
  title: string;
  titleEl: string;
  items: ExplanationItem[];
  subtotal: number;
  subtotalLabel: string;
  subtotalLabelEl: string;
}

interface ExplanationData {
  sections: ExplanationSection[];
  summary: {
    totalGross: number;
    totalDeductions: number;
    netPay: number;
    totalGrossLabel: string;
    totalGrossLabelEl: string;
    totalDeductionsLabel: string;
    totalDeductionsLabelEl: string;
    netPayLabel: string;
    netPayLabelEl: string;
  };
  metadata: {
    generatedAt: string;
    rulePackVersion: string;
    locale: string;
  };
}

interface PayslipExplanationProps {
  explanationId: string;
  content: ExplanationData;
  textEn?: string;
  textEl?: string;
  coverage: {
    totalPayslipValue: number;
    explainedValue: number;
    coveragePercentage: number;
    unexplainedLines: string[];
  };
  confidenceScore: number;
  onFeedback?: (feedback: any) => void;
  locale?: string;
}

export function PayslipExplanation({
  explanationId,
  content,
  textEn,
  textEl,
  coverage,
  confidenceScore,
  onFeedback,
  locale = 'en'
}: PayslipExplanationProps) {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['earnings']));
  const [showFormulas, setShowFormulas] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const { t, locale: translationLocale } = useTranslation();
  
  const isGreek = locale === 'el';
  const currentLocale = locale || translationLocale;

  const toggleSection = (sectionType: string) => {
    const newOpenSections = new Set(openSections);
    if (newOpenSections.has(sectionType)) {
      newOpenSections.delete(sectionType);
    } else {
      newOpenSections.add(sectionType);
    }
    setOpenSections(newOpenSections);
  };

  const formatCurrencyAmount = (amount: number) => {
    return formatCurrency(amount, currentLocale);
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.9) return 'text-green-600';
    if (score >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCoverageColor = (percentage: number) => {
    if (percentage >= 95) return 'bg-green-100 text-green-800';
    if (percentage >= 80) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const submitFeedback = async () => {
    if (!onFeedback || rating === 0) return;
    
    await onFeedback({
      explanationId,
      overallRating: rating,
      feedbackText: '', // Could add text input
    });
    
    setFeedbackOpen(false);
    setRating(0);
  };

  return (
    <div className="space-y-6">
      {/* Header with Coverage and Confidence Metrics */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t('explanation.title')}
            </CardTitle>
            <div className="flex items-center gap-4">
              <Badge className={getCoverageColor(coverage.coveragePercentage)}>
                {formatNumber(coverage.coveragePercentage, currentLocale, 1)}% {t('explanation.coverage')}
              </Badge>
              <div className={cn('text-sm font-medium', getConfidenceColor(confidenceScore))}>
                {formatNumber(confidenceScore * 100, currentLocale, 0)}% {t('explanation.confidence')}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              {t('explanation.generated')}: {formatDate(new Date(content.metadata.generatedAt), currentLocale)}
            </span>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFormulas(!showFormulas)}
                className="flex items-center gap-2"
              >
                <Calculator className="h-4 w-4" />
                {showFormulas ? t('explanation.hide_formulas') : t('explanation.show_formulas')}
              </Button>
              {onFeedback && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFeedbackOpen(!feedbackOpen)}
                  className="flex items-center gap-2"
                >
                  <Star className="h-4 w-4" />
                  {isGreek ? 'Αξιολόγηση' : 'Rate'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feedback Section */}
      {feedbackOpen && (
        <Card className="border-blue-200">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <h3 className="font-medium">
                {isGreek ? 'Πόσο χρήσιμη ήταν αυτή η εξήγηση;' : 'How helpful was this explanation?'}
              </h3>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={cn(
                      'p-1 rounded transition-colors',
                      star <= rating ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'
                    )}
                  >
                    <Star className="h-6 w-6 fill-current" />
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button onClick={submitFeedback} disabled={rating === 0} size="sm">
                  {isGreek ? 'Υποβολή' : 'Submit'}
                </Button>
                <Button variant="outline" onClick={() => setFeedbackOpen(false)} size="sm">
                  {isGreek ? 'Ακύρωση' : 'Cancel'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Explanation Sections */}
      {content.sections.map((section) => {
        const isOpen = openSections.has(section.type);
        const Icon = section.type === 'earnings' ? TrendingUp : TrendingDown;
        
        return (
          <Card key={section.type}>
            <Collapsible open={isOpen} onOpenChange={() => toggleSection(section.type)}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-3">
                      <Icon className="h-5 w-5" />
                      {isGreek ? section.titleEl : section.title}
                      <Badge variant="secondary">
                        {section.items.length} {isGreek ? 'στοιχεία' : 'items'}
                      </Badge>
                    </CardTitle>
                    <div className="flex items-center gap-4">
                      <span className="font-semibold text-lg">
                        {formatCurrency(section.subtotal)}
                      </span>
                      {isOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {section.items.map((item, index) => (
                      <div key={item.lineCode} className="border rounded-lg p-4 space-y-3">
                        {/* Item Header */}
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">
                              {isGreek ? item.labelEl : item.label}
                            </h4>
                            <code className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              {item.lineCode}
                            </code>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-lg">
                              {formatCurrency(item.amount)}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                v{item.citation.ruleVersion}
                              </Badge>
                              {item.citation.regulationRef && (
                                <Badge variant="secondary" className="text-xs">
                                  <Info className="h-3 w-3 mr-1" />
                                  {item.citation.regulationRef}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Explanation Text */}
                        <div className="text-sm text-gray-700 bg-blue-50 p-3 rounded">
                          {isGreek ? item.explanationEl : item.explanation}
                        </div>

                        {/* Formula (if enabled) */}
                        {showFormulas && (
                          <div className="bg-gray-50 p-3 rounded border-l-4 border-blue-400">
                            <div className="flex items-center gap-2 mb-2">
                              <Calculator className="h-4 w-4 text-blue-600" />
                              <span className="text-sm font-medium text-blue-800">
                                {isGreek ? 'Τύπος Υπολογισμού' : 'Calculation Formula'}
                              </span>
                            </div>
                            <code className="text-sm font-mono text-gray-800">
                              {isGreek ? item.formulaEl : item.formula}
                            </code>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}

      {/* Summary Section */}
      <Card className="border-2 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            {isGreek ? 'Σύνοψη' : 'Summary'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between py-2">
              <span className="font-medium">
                {isGreek ? content.summary.totalGrossLabelEl : content.summary.totalGrossLabel}
              </span>
              <span className="font-semibold">
                {formatCurrency(content.summary.totalGross)}
              </span>
            </div>
            <div className="flex justify-between py-2 border-t">
              <span className="font-medium">
                {isGreek ? content.summary.totalDeductionsLabelEl : content.summary.totalDeductionsLabel}
              </span>
              <span className="font-semibold text-red-600">
                -{formatCurrency(content.summary.totalDeductions)}
              </span>
            </div>
            <div className="flex justify-between py-2 border-t-2 border-gray-300">
              <span className="font-bold text-lg">
                {isGreek ? content.summary.netPayLabelEl : content.summary.netPayLabel}
              </span>
              <span className="font-bold text-lg text-green-600">
                {formatCurrency(content.summary.netPay)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Coverage Details */}
      {coverage.unexplainedLines.length > 0 && (
        <Card className="border-yellow-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <HelpCircle className="h-5 w-5" />
              {isGreek ? 'Μη Εξηγημένα Στοιχεία' : 'Unexplained Items'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">
              {isGreek 
                ? 'Τα παρακάτω στοιχεία δεν μπόρεσαν να εξηγηθούν αυτόματα:'
                : 'The following items could not be explained automatically:'
              }
            </p>
            <div className="flex flex-wrap gap-2">
              {coverage.unexplainedLines.map((code) => (
                <Badge key={code} variant="outline" className="border-yellow-400 text-yellow-800">
                  {code}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}