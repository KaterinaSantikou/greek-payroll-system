import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import PayExplanation from '@/components/PayExplanation';
import {
  InfoIcon,
  FileTextIcon,
  CalculatorIcon,
  TrendingUpIcon,
  UsersIcon,
  CalendarIcon,
} from 'lucide-react';

// Mock paycheck data for demonstration
const mockPaychecks = [
  {
    id: 'paycheck-001',
    employeeName: 'Μαρία Παπαδάκη',
    period: 'Δεκέμβριος 2024',
    grossPay: '€2,450.00',
    netPay: '€1,876.30',
    status: 'paid',
  },
  {
    id: 'paycheck-002',
    employeeName: 'Γιάννης Κωνσταντίνου',
    period: 'Δεκέμβριος 2024',
    grossPay: '€2,180.00',
    netPay: '€1,693.40',
    status: 'paid',
  },
  {
    id: 'paycheck-003',
    employeeName: 'Ελένη Αντωνίου',
    period: 'Δεκέμβριος 2024',
    grossPay: '€2,650.00',
    netPay: '€2,012.20',
    status: 'paid',
  },
];

export default function PayExplanationDemo() {
  const [selectedPaycheckId, setSelectedPaycheckId] = useState<string>('');
  const [customPaycheckId, setCustomPaycheckId] = useState<string>('');
  const [showExplanation, setShowExplanation] = useState<boolean>(false);

  const handleShowExplanation = () => {
    const paycheckId = customPaycheckId || selectedPaycheckId;
    if (paycheckId) {
      setShowExplanation(true);
    }
  };

  const activePaycheckId = customPaycheckId || selectedPaycheckId;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <CalculatorIcon className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Explain-Your-Pay Demo
            </h1>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Experience our advanced pay explanation system that provides
            transparent, detailed breakdowns of Greek payroll calculations with
            full compliance context.
          </p>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="text-center">
            <CardContent className="pt-6">
              <FileTextIcon className="h-8 w-8 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Detailed Breakdown</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Complete earnings, deductions, and summary with calculation
                provenance
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <TrendingUpIcon className="h-8 w-8 text-blue-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Change Analysis</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Automatic comparison with previous paycheck to highlight
                differences
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <UsersIcon className="h-8 w-8 text-purple-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Bilingual Support</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Full Greek and English explanations with policy links
              </p>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Demo controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Select Paycheck for Explanation
            </CardTitle>
            <CardDescription>
              Choose a sample paycheck to see detailed pay explanations, or
              enter a custom paycheck ID.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Mock paycheck selection */}
            <div>
              <Label className="text-sm font-medium mb-3 block">
                Sample Paychecks
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {mockPaychecks.map(paycheck => (
                  <Card
                    key={paycheck.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedPaycheckId === paycheck.id
                        ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950'
                        : ''
                    }`}
                    onClick={() => {
                      setSelectedPaycheckId(paycheck.id);
                      setCustomPaycheckId('');
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">
                            {paycheck.employeeName}
                          </h4>
                          <Badge variant="secondary" className="text-xs">
                            {paycheck.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {paycheck.period}
                        </p>
                        <div className="flex justify-between text-xs">
                          <span>Gross: {paycheck.grossPay}</span>
                          <span className="font-semibold">
                            Net: {paycheck.netPay}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Separator className="my-4" />

            {/* Custom paycheck ID input */}
            <div className="space-y-3">
              <Label htmlFor="custom-paycheck" className="text-sm font-medium">
                Or Enter Custom Paycheck ID
              </Label>
              <div className="flex gap-3">
                <Input
                  id="custom-paycheck"
                  placeholder="paycheck-abc123"
                  value={customPaycheckId}
                  onChange={e => {
                    setCustomPaycheckId(e.target.value);
                    if (e.target.value) {
                      setSelectedPaycheckId('');
                    }
                  }}
                  className="flex-1"
                />
              </div>
            </div>

            <Separator className="my-4" />

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleShowExplanation}
                disabled={!activePaycheckId}
                className="flex-1"
              >
                <CalculatorIcon className="h-4 w-4 mr-2" />
                Generate Pay Explanation
              </Button>
              {showExplanation && (
                <Button
                  variant="outline"
                  onClick={() => setShowExplanation(false)}
                >
                  Hide Explanation
                </Button>
              )}
            </div>

            {!activePaycheckId && (
              <Alert>
                <InfoIcon className="h-4 w-4" />
                <AlertDescription>
                  Please select a sample paycheck or enter a custom paycheck ID
                  to generate an explanation.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Pay Explanation Component */}
        {showExplanation && activePaycheckId && (
          <div className="space-y-6">
            <Separator />
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
              <PayExplanation paycheckId={activePaycheckId} language="el" />
            </div>
          </div>
        )}

        {/* Footer info */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6 text-center">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              PayrollSync Explain-Your-Pay Feature
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-200 max-w-3xl mx-auto">
              This advanced system provides employees with comprehensive,
              transparent explanations of their pay calculations, including all
              Greek tax and social security deductions, overtime premiums,
              allowances, and compliance-related adjustments. Each calculation
              includes full provenance and links to relevant policies and
              regulations.
            </p>
            <div className="mt-4 flex items-center justify-center gap-6 text-xs text-blue-700 dark:text-blue-300">
              <span>✓ GDPR Compliant</span>
              <span>✓ Greek Law Aligned</span>
              <span>✓ Real-time Calculations</span>
              <span>✓ Audit Trail</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
