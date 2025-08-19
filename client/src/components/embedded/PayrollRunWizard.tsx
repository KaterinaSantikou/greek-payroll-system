import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle, Clock, Play, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PayrollRun {
  id: string;
  runNumber: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  payDate: string;
  status: 'draft' | 'validated' | 'finalized' | 'posted';
  totalGross: string;
  totalNet: string;
  employeeCount: number;
}

interface PayrollRunWizardProps {
  runId?: string;
  accessToken: string;
  onEvent?: (event: string, data: any) => void;
  theme?: 'light' | 'dark';
  locale?: string;
}

export function PayrollRunWizard({ 
  runId, 
  accessToken, 
  onEvent,
  theme = 'light',
  locale = 'en'
}: PayrollRunWizardProps) {
  const [run, setRun] = useState<PayrollRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const { toast } = useToast();

  const steps = [
    { id: 'draft', title: 'Draft', description: 'Create payroll run' },
    { id: 'validate', title: 'Validate', description: 'Check calculations' },
    { id: 'finalize', title: 'Finalize', description: 'Lock payroll' },
    { id: 'post', title: 'Post', description: 'Submit to GL' }
  ];

  const getStepIndex = (status: string) => {
    switch (status) {
      case 'draft': return 0;
      case 'validated': return 1;
      case 'finalized': return 2;
      case 'posted': return 3;
      default: return 0;
    }
  };

  const loadPayrollRun = async () => {
    if (!runId) return;
    
    try {
      const response = await fetch(`/api/embedded/payroll/runs/${runId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRun(data.run);
        setCurrentStep(getStepIndex(data.run.status));
        onEvent?.('payroll.run.opened', { runId, status: data.run.status });
      } else {
        toast({
          title: "Error",
          description: "Failed to load payroll run",
          variant: "destructive",
        });
        onEvent?.('payroll.run.failed', { runId, error: 'Failed to load' });
      }
    } catch (error) {
      console.error('Load error:', error);
      onEvent?.('payroll.run.failed', { runId, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const validateRun = async () => {
    if (!run) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/embedded/payroll/runs/${run.id}/validate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `validate-${run.id}-${Date.now()}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRun({ ...run, status: 'validated' });
        setCurrentStep(1);
        toast({
          title: "Validation Complete",
          description: "Payroll run validated successfully",
        });
        onEvent?.('payroll.run.validated', { runId: run.id, data });
      } else {
        const error = await response.json();
        toast({
          title: "Validation Failed",
          description: error.message || "Validation failed",
          variant: "destructive",
        });
        onEvent?.('payroll.run.failed', { runId: run.id, error: error.message });
      }
    } catch (error) {
      console.error('Validation error:', error);
      onEvent?.('payroll.run.failed', { runId: run.id, error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const finalizeRun = async () => {
    if (!run) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/embedded/payroll/runs/${run.id}/finalize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `finalize-${run.id}-${Date.now()}`,
        },
        body: JSON.stringify({
          finalizeDate: new Date().toISOString().split('T')[0],
          notes: 'Finalized via embedded surface',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setRun({ ...run, status: 'finalized' });
        setCurrentStep(2);
        toast({
          title: "Finalization Complete",
          description: "Payroll run finalized successfully",
        });
        onEvent?.('payroll.run.finalized', { runId: run.id, data });
      } else {
        const error = await response.json();
        toast({
          title: "Finalization Failed",
          description: error.message || "Finalization failed",
          variant: "destructive",
        });
        onEvent?.('payroll.run.failed', { runId: run.id, error: error.message });
      }
    } catch (error) {
      console.error('Finalization error:', error);
      onEvent?.('payroll.run.failed', { runId: run.id, error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const postToGL = async () => {
    if (!run) return;
    
    setLoading(true);
    try {
      // This would typically post to GL through the GL Export Service
      const response = await fetch(`/api/embedded/gl/journals`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `post-${run.id}-${Date.now()}`,
        },
        body: JSON.stringify({
          payrollRunId: run.id,
          journalDate: run.payDate,
          description: `Payroll Journal - ${run.runNumber}`,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setRun({ ...run, status: 'posted' });
        setCurrentStep(3);
        toast({
          title: "GL Posting Complete",
          description: "Payroll posted to general ledger",
        });
        onEvent?.('payroll.run.posted', { runId: run.id, journalId: data.id });
      } else {
        const error = await response.json();
        toast({
          title: "GL Posting Failed",
          description: error.message || "GL posting failed",
          variant: "destructive",
        });
        onEvent?.('payroll.run.failed', { runId: run.id, error: error.message });
      }
    } catch (error) {
      console.error('GL posting error:', error);
      onEvent?.('payroll.run.failed', { runId: run.id, error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayrollRun();
  }, [runId, accessToken]);

  if (!run) {
    return (
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Loading Payroll Run...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const progress = ((currentStep + 1) / steps.length) * 100;
  const canProceed = !loading;
  const isComplete = currentStep >= 3;

  return (
    <div className={`w-full max-w-4xl ${theme === 'dark' ? 'dark' : ''}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Payroll Run Wizard - {run.runNumber}</span>
            <Badge variant={isComplete ? "default" : "secondary"}>
              {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
            </Badge>
          </CardTitle>
          <CardDescription>
            Pay Period: {new Date(run.payPeriodStart).toLocaleDateString()} - {new Date(run.payPeriodEnd).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Steps */}
          <div className="grid grid-cols-4 gap-4">
            {steps.map((step, index) => (
              <div key={step.id} className={`text-center p-3 rounded-lg border-2 transition-colors ${
                index <= currentStep 
                  ? 'border-green-500 bg-green-50' 
                  : 'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex flex-col items-center space-y-2">
                  {index < currentStep ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : index === currentStep ? (
                    loading ? (
                      <Clock className="w-6 h-6 text-blue-600 animate-spin" />
                    ) : (
                      <Play className="w-6 h-6 text-blue-600" />
                    )
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-gray-300" />
                  )}
                  <div>
                    <div className="font-semibold text-sm">{step.title}</div>
                    <div className="text-xs text-gray-500">{step.description}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Run Summary */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{run.employeeCount}</div>
              <div className="text-sm text-gray-500">Employees</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">€{parseFloat(run.totalGross).toLocaleString()}</div>
              <div className="text-sm text-gray-500">Gross Pay</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">€{parseFloat(run.totalNet).toLocaleString()}</div>
              <div className="text-sm text-gray-500">Net Pay</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={loadPayrollRun}
              disabled={loading}
            >
              Refresh
            </Button>
            
            <div className="space-x-2">
              {currentStep === 0 && (
                <Button 
                  onClick={validateRun} 
                  disabled={!canProceed}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? <Clock className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  Validate Run
                </Button>
              )}
              
              {currentStep === 1 && (
                <Button 
                  onClick={finalizeRun} 
                  disabled={!canProceed}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {loading ? <Clock className="w-4 h-4 mr-2 animate-spin" /> : <AlertTriangle className="w-4 h-4 mr-2" />}
                  Finalize Run
                </Button>
              )}
              
              {currentStep === 2 && (
                <Button 
                  onClick={postToGL} 
                  disabled={!canProceed}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loading ? <Clock className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  Post to GL
                </Button>
              )}
              
              {isComplete && (
                <Button variant="outline" disabled>
                  <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                  Complete
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}