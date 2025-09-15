import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import {
  Calendar,
  Clock,
  CreditCard,
  AlertTriangle,
  Zap,
  Play,
  TrendingUp,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PayrollCue {
  daysUntilDue: number;
  dueDate: string;
  isOverdue: boolean;
}

interface PaymentCue {
  isPastCutoff: boolean;
  nextCutoffTime: string;
  bank: string;
}

export function CompliancePaymentsCues() {
  const [payrollCue] = useState<PayrollCue>({
    daysUntilDue: 3,
    dueDate: '25 Ιανουαρίου',
    isOverdue: false,
  });

  const [paymentCue] = useState<PaymentCue>({
    isPastCutoff: true,
    nextCutoffTime: '14:30',
    bank: 'Alpha Bank',
  });

  const shouldShowPayrollCue =
    payrollCue.daysUntilDue <= 5 || payrollCue.isOverdue;
  const shouldShowPaymentCue = paymentCue.isPastCutoff;

  if (!shouldShowPayrollCue && !shouldShowPaymentCue) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Payroll Due Soon */}
      {shouldShowPayrollCue && (
        <Alert
          className={cn(
            'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950',
            payrollCue.isOverdue &&
              'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
          )}
        >
          <Calendar
            className={cn(
              'h-4 w-4',
              payrollCue.isOverdue ? 'text-red-600' : 'text-amber-600'
            )}
          />
          <AlertTitle
            className={cn(
              payrollCue.isOverdue
                ? 'text-red-800 dark:text-red-200'
                : 'text-amber-800 dark:text-amber-200'
            )}
          >
            {payrollCue.isOverdue
              ? 'Εκκρεμής Μισθοδοσία'
              : 'Επερχόμενη Μισθοδοσία'}
          </AlertTitle>
          <AlertDescription
            className={cn(
              'flex items-center justify-between',
              payrollCue.isOverdue
                ? 'text-red-700 dark:text-red-300'
                : 'text-amber-700 dark:text-amber-300'
            )}
          >
            <div>
              {payrollCue.isOverdue
                ? `Η μισθοδοσία έπρεπε να εκτελεστεί στις ${payrollCue.dueDate}`
                : `Η μισθοδοσία οφείλει να εκτελεστεί σε ${payrollCue.daysUntilDue} ημέρες (${payrollCue.dueDate})`}
            </div>
            <Button
              size="sm"
              className={cn(
                'ml-4',
                payrollCue.isOverdue
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              )}
            >
              <Play className="mr-2 h-4 w-4" />
              Εκτέλεση Μισθοδοσίας
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Payment Past SCT Cutoff */}
      {shouldShowPaymentCue && (
        <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <Zap className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800 dark:text-blue-200">
            Άμεσες Πληρωμές Διαθέσιμες
          </AlertTitle>
          <AlertDescription className="flex items-center justify-between text-blue-700 dark:text-blue-300">
            <div>
              <div>
                Πέρασε το cut-off {paymentCue.bank} ({paymentCue.nextCutoffTime}
                )
              </div>
              <div className="text-sm mt-1">
                Χρησιμοποιήστε SCT Instant για άμεσες μεταφορές
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="ml-4 border-blue-600 text-blue-700 hover:bg-blue-100"
            >
              <Zap className="mr-2 h-4 w-4" />
              Χρήση SCT Inst
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// Enhanced KPI Cards with Data Freshness and Inline CTAs
interface EnhancedKPICardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  lastUpdated: string;
  ctaLabel: string;
  ctaHref: string;
  locale?: 'el' | 'en';
}

export function EnhancedKPICard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  lastUpdated,
  ctaLabel,
  ctaHref,
  locale = 'el',
}: EnhancedKPICardProps) {
  const formatNumber = (num: string) => {
    if (locale === 'el') {
      // Greek formatting: 38,5 instead of 38.5
      return num.replace('.', ',');
    }
    return num;
  };

  return (
    <Card className="relative hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline justify-between">
          <div className="text-2xl font-bold">{formatNumber(value)}</div>
          {trend && (
            <div
              className={cn(
                'flex items-center text-sm',
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              )}
            >
              <TrendingUp
                className={cn(
                  'h-3 w-3 mr-1',
                  !trend.isPositive && 'rotate-180'
                )}
              />
              {formatNumber(trend.value)}
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">{description}</p>

        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Ενημ.: {lastUpdated}
          </div>
          <Button size="sm" variant="outline" asChild>
            <a href={ctaHref}>{ctaLabel}</a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
