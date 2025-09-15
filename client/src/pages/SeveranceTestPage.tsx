import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Loader2, PlayCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TestResult {
  name: string;
  inputs: any;
  expected: any;
  actualResult?: any;
  passed: boolean;
  error?: string;
}

export default function SeveranceTestPage() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();

  const runGoldenTests = async () => {
    setIsRunning(true);
    try {
      const response = await fetch('/api/severance/test-golden', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (data.success) {
        setTestResults(data.testResults);
        toast({
          title: 'Test Suite Complete',
          description: `${data.summary.passed}/${data.summary.total} tests passed`,
          variant: data.summary.failed > 0 ? 'destructive' : 'default',
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error running tests:', error);
      toast({
        title: 'Test Failed',
        description: 'Failed to run golden test suite',
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Severance Golden Test Suite</h1>
          <p className="text-muted-foreground mt-2">
            Validation tests for Greek severance calculations with deterministic
            results
          </p>
        </div>
        <Button onClick={runGoldenTests} disabled={isRunning} size="lg">
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Tests
            </>
          ) : (
            <>
              <PlayCircle className="mr-2 h-4 w-4" />
              Run Golden Tests
            </>
          )}
        </Button>
      </div>

      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{testResults.length}</div>
                <div className="text-sm text-muted-foreground">Total Tests</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {testResults.filter(t => t.passed).length}
                </div>
                <div className="text-sm text-muted-foreground">Passed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {testResults.filter(t => !t.passed).length}
                </div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {testResults.map((test, index) => (
          <Card
            key={index}
            className={test.passed ? 'border-green-200' : 'border-red-200'}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  {test.passed ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span>{test.name}</span>
                </CardTitle>
                <Badge variant={test.passed ? 'default' : 'destructive'}>
                  {test.passed ? 'PASSED' : 'FAILED'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Test Inputs */}
              <div>
                <h4 className="font-semibold text-sm mb-2">Test Inputs:</h4>
                <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded text-sm font-mono">
                  <div>Contract: {test.inputs.contractType}</div>
                  <div>
                    Hire: {test.inputs.hireDate} → Terminate:{' '}
                    {test.inputs.terminationDate}
                  </div>
                  <div>Type: {test.inputs.terminationType}</div>
                  <div>Base: €{test.inputs.lastMonthlyWage}</div>
                  <div>Leave: {test.inputs.unusedLeaveDays} days</div>
                  {test.inputs.christmasPaid && (
                    <div>Christmas: Already paid</div>
                  )}
                </div>
              </div>

              {/* Expected Results */}
              <div>
                <h4 className="font-semibold text-sm mb-2">
                  Expected Results:
                </h4>
                <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded text-sm">
                  {test.expected.severanceAmount !== undefined && (
                    <div>Severance: €{test.expected.severanceAmount}</div>
                  )}
                  {test.expected.christmasProRata && (
                    <div>
                      Christmas Pro-rata: €{test.expected.christmasProRata}
                    </div>
                  )}
                  {test.expected.earlyTerminationCompensation && (
                    <div>
                      Early Termination: €
                      {test.expected.earlyTerminationCompensation}
                    </div>
                  )}
                  {test.expected.holidayAllowanceAmount !== undefined && (
                    <div>
                      Holiday Allowance: €{test.expected.holidayAllowanceAmount}
                    </div>
                  )}
                </div>
              </div>

              {/* Actual Results */}
              {test.actualResult && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">
                    Actual Results:
                  </h4>
                  <div className="bg-green-50 dark:bg-green-950 p-3 rounded text-sm">
                    <div>{test.actualResult.message}</div>
                    {test.actualResult.deterministic && (
                      <div className="text-green-700 dark:text-green-300">
                        ✓ Deterministic calculation
                      </div>
                    )}
                    {test.actualResult.hashMatches && (
                      <div className="text-green-700 dark:text-green-300">
                        ✓ Hash consistency verified
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Error Messages */}
              {test.error && (
                <div>
                  <h4 className="font-semibold text-sm mb-2 text-red-600">
                    Error:
                  </h4>
                  <div className="bg-red-50 dark:bg-red-950 p-3 rounded text-sm text-red-700 dark:text-red-300">
                    {test.error}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {testResults.length === 0 && !isRunning && (
        <Card>
          <CardContent className="text-center py-8">
            <PlayCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Tests Run</h3>
            <p className="text-muted-foreground">
              Click "Run Golden Tests" to execute the comprehensive test suite
              for severance calculations
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="bg-blue-50 dark:bg-blue-950">
        <CardHeader>
          <CardTitle>Test Scenarios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div>
              <strong>Test 1:</strong> Dismissal without notice (4 years
              service) - Expected severance: 3 months
            </div>
            <div>
              <strong>Test 2:</strong> Dismissal with notice - 50% reduction in
              severance
            </div>
            <div>
              <strong>Test 3:</strong> Employee resignation - No severance, only
              wages/leave
            </div>
            <div>
              <strong>Test 4:</strong> Fixed-term early termination -
              Compensation for remaining time
            </div>
            <div>
              <strong>Test 5:</strong> Holiday allowance already paid - Zero
              additional allowance
            </div>
            <div>
              <strong>Test 6:</strong> Rounding determinism - Identical results
              on re-run
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-yellow-50 dark:bg-yellow-950">
        <CardHeader>
          <CardTitle>Acceptance Criteria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div>✓ Deterministic calculations with full provenance</div>
            <div>✓ Readable GR/EN explanations</div>
            <div>✓ Integration with payroll system</div>
            <div>✓ ERGANI termination payload generation</div>
            <div>✓ P95 latency &lt; 800ms</div>
            <div>✓ All golden tests pass</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
