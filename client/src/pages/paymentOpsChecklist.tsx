import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertTriangle, Clock, Upload, Download, FileText, Building2, CreditCard, ArrowRight, Zap } from "lucide-react";

interface PaymentOpsStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  icon: React.ReactNode;
  details?: any;
}

interface EntityProfile {
  id: string;
  name: string;
  debtorIban: string;
  preferredBank: string;
  uploadChannel: 'host-to-host' | 'bib' | 'portal';
}

export default function PaymentOpsChecklist() {
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [selectedPayrollRun, setSelectedPayrollRun] = useState<string>('');
  const [steps, setSteps] = useState<PaymentOpsStep[]>([
    {
      id: 'select-profile',
      title: 'Select Bank Profile per Entity',
      description: 'Choose entity and configure debtor IBAN with preferred bank',
      status: 'pending',
      icon: <Building2 className="w-4 h-4" />
    },
    {
      id: 'generate-pain001',
      title: 'Generate pain.001',
      description: 'Create ISO 20022 file with CtgyPurp=SALA, BtchBookg=false',
      status: 'pending',
      icon: <FileText className="w-4 h-4" />
    },
    {
      id: 'upload-bank',
      title: 'Upload via Bank Channel',
      description: 'Submit file through host-to-host or BIB channel',
      status: 'pending',
      icon: <Upload className="w-4 h-4" />
    },
    {
      id: 'poll-status',
      title: 'Poll/Ingest pain.002',
      description: 'Monitor status reports and reconcile with payroll run',
      status: 'pending',
      icon: <Clock className="w-4 h-4" />
    },
    {
      id: 'download-reconcile',
      title: 'Download camt.054',
      description: 'Retrieve credit notifications and complete reconciliation',
      status: 'pending',
      icon: <Download className="w-4 h-4" />
    }
  ]);

  const mockEntities: EntityProfile[] = [
    {
      id: 'hotel-princess',
      name: 'Hotel Princess Aegean',
      debtorIban: 'GR1601101250000000012300695',
      preferredBank: 'alpha',
      uploadChannel: 'host-to-host'
    },
    {
      id: 'resort-mykonos',
      name: 'Mykonos Grand Resort',
      debtorIban: 'GR4401401030000000005678901',
      preferredBank: 'piraeus',
      uploadChannel: 'bib'
    },
    {
      id: 'santorini-suites',
      name: 'Santorini Executive Suites',
      debtorIban: 'GR9608100010000001234567890',
      preferredBank: 'eurobank',
      uploadChannel: 'host-to-host'
    }
  ];

  const mockPayrollRuns = [
    { id: 'PR-2025-01', name: 'January 2025 Payroll', employees: 45, amount: 125000.00 },
    { id: 'PR-2025-01-BONUS', name: 'January Bonus Run', employees: 12, amount: 18500.00 },
    { id: 'PR-2025-01-CORRECTION', name: 'Overtime Corrections', employees: 8, amount: 2150.00 }
  ];

  const bankChannels = {
    'alpha': { name: 'Alpha Bank', channels: ['host-to-host', 'portal'], cutoff: '14:00' },
    'piraeus': { name: 'Piraeus Bank', channels: ['bib', 'host-to-host'], cutoff: '13:30' },
    'eurobank': { name: 'Eurobank', channels: ['host-to-host', 'portal'], cutoff: '15:00' },
    'nbg': { name: 'NBG', channels: ['host-to-host', 'portal'], cutoff: '14:00' }
  };

  const updateStepStatus = (stepId: string, status: PaymentOpsStep['status'], details?: any) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status, details } : step
    ));
  };

  const selectProfile = useMutation({
    mutationFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true };
    },
    onMutate: () => updateStepStatus('select-profile', 'in-progress'),
    onSuccess: () => {
      const entity = mockEntities.find(e => e.id === selectedEntity);
      updateStepStatus('select-profile', 'completed', { entity });
    }
  });

  const generatePain001 = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/payments/sepa/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          payrollPeriodId: selectedPayrollRun,
          entityId: selectedEntity,
          categoryPurpose: 'SALA',
          batchBooking: false
        })
      });
      return response.json();
    },
    onMutate: () => updateStepStatus('generate-pain001', 'in-progress'),
    onSuccess: (data) => {
      updateStepStatus('generate-pain001', 'completed', data);
    },
    onError: () => updateStepStatus('generate-pain001', 'failed')
  });

  const uploadBank = useMutation({
    mutationFn: async () => {
      const entity = mockEntities.find(e => e.id === selectedEntity);
      const bank = entity ? bankChannels[entity.preferredBank as keyof typeof bankChannels] : null;
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      return { 
        success: true, 
        channel: entity?.uploadChannel,
        bank: bank?.name,
        submissionId: `SUB-${Date.now()}`
      };
    },
    onMutate: () => updateStepStatus('upload-bank', 'in-progress'),
    onSuccess: (data) => {
      updateStepStatus('upload-bank', 'completed', data);
    }
  });

  const pollStatus = useMutation({
    mutationFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 3000));
      return {
        statusReceived: true,
        acceptedPayments: 40,
        rejectedPayments: 5,
        correlationId: `CORR-${Date.now()}`
      };
    },
    onMutate: () => updateStepStatus('poll-status', 'in-progress'),
    onSuccess: (data) => {
      updateStepStatus('poll-status', 'completed', data);
    }
  });

  const downloadReconcile = useMutation({
    mutationFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      return {
        camt054Downloaded: true,
        reconciliationComplete: true,
        finalStatus: 'COMPLETED'
      };
    },
    onMutate: () => updateStepStatus('download-reconcile', 'in-progress'),
    onSuccess: (data) => {
      updateStepStatus('download-reconcile', 'completed', data);
    }
  });

  const executeStep = (stepId: string) => {
    switch (stepId) {
      case 'select-profile':
        selectProfile.mutate();
        break;
      case 'generate-pain001':
        generatePain001.mutate();
        break;
      case 'upload-bank':
        uploadBank.mutate();
        break;
      case 'poll-status':
        pollStatus.mutate();
        break;
      case 'download-reconcile':
        downloadReconcile.mutate();
        break;
    }
  };

  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const progressPercentage = (completedSteps / steps.length) * 100;

  const canExecuteStep = (stepId: string) => {
    const stepIndex = steps.findIndex(s => s.id === stepId);
    if (stepIndex === 0) return selectedEntity && selectedPayrollRun;
    return steps[stepIndex - 1]?.status === 'completed';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <CreditCard className="w-8 h-8 text-green-600" />
        <div>
          <h1 className="text-3xl font-bold">Payment Operations Checklist</h1>
          <p className="text-muted-foreground">
            Complete SEPA payment workflow from bank profile selection to reconciliation
          </p>
        </div>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Operation Progress</span>
            <Badge variant="outline">{completedSteps}/{steps.length} Steps</Badge>
          </CardTitle>
          <CardDescription>
            Track progress through the complete payment operations workflow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={progressPercentage} className="w-full" />
          <p className="text-sm text-muted-foreground mt-2">
            {progressPercentage.toFixed(0)}% Complete
          </p>
        </CardContent>
      </Card>

      {/* Entity and Payroll Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Configuration</CardTitle>
          <CardDescription>
            Select entity profile and payroll run for payment processing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Entity Profile</label>
              <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                <SelectTrigger>
                  <SelectValue placeholder="Select entity" />
                </SelectTrigger>
                <SelectContent>
                  {mockEntities.map((entity) => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {entity.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedEntity && (
                <div className="text-xs space-y-1">
                  {(() => {
                    const entity = mockEntities.find(e => e.id === selectedEntity);
                    const bank = entity ? bankChannels[entity.preferredBank as keyof typeof bankChannels] : null;
                    return entity ? (
                      <>
                        <p><strong>Debtor IBAN:</strong> {entity.debtorIban}</p>
                        <p><strong>Preferred Bank:</strong> {bank?.name}</p>
                        <p><strong>Upload Channel:</strong> {entity.uploadChannel}</p>
                        <p><strong>Cut-off:</strong> {bank?.cutoff}</p>
                      </>
                    ) : null;
                  })()}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Payroll Run</label>
              <Select value={selectedPayrollRun} onValueChange={setSelectedPayrollRun}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payroll run" />
                </SelectTrigger>
                <SelectContent>
                  {mockPayrollRuns.map((run) => (
                    <SelectItem key={run.id} value={run.id}>
                      {run.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPayrollRun && (
                <div className="text-xs space-y-1">
                  {(() => {
                    const run = mockPayrollRuns.find(r => r.id === selectedPayrollRun);
                    return run ? (
                      <>
                        <p><strong>Employees:</strong> {run.employees}</p>
                        <p><strong>Total Amount:</strong> €{run.amount.toLocaleString()}</p>
                      </>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Operations Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Operations Workflow</CardTitle>
          <CardDescription>
            Execute each step in sequence to complete the payment process
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-start gap-4 p-4 border rounded-lg">
              <div className="flex-shrink-0">
                {step.status === 'completed' ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : step.status === 'in-progress' ? (
                  <Clock className="w-6 h-6 text-blue-600 animate-spin" />
                ) : step.status === 'failed' ? (
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                ) : (
                  <div className="w-6 h-6 border-2 border-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium">{index + 1}</span>
                  </div>
                )}
              </div>

              <div className="flex-grow space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{step.title}</h4>
                  <Badge variant={
                    step.status === 'completed' ? 'default' :
                    step.status === 'in-progress' ? 'secondary' :
                    step.status === 'failed' ? 'destructive' : 'outline'
                  }>
                    {step.status}
                  </Badge>
                </div>
                
                <p className="text-sm text-muted-foreground">{step.description}</p>
                
                {step.details && (
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded text-xs space-y-1">
                    {step.id === 'select-profile' && step.details.entity && (
                      <>
                        <p><strong>Selected:</strong> {step.details.entity.name}</p>
                        <p><strong>Bank:</strong> {bankChannels[step.details.entity.preferredBank as keyof typeof bankChannels]?.name}</p>
                      </>
                    )}
                    {step.id === 'generate-pain001' && (
                      <>
                        <p><strong>Category Purpose:</strong> SALA</p>
                        <p><strong>Batch Booking:</strong> false</p>
                        <p><strong>Format:</strong> pain.001.001.03</p>
                      </>
                    )}
                    {step.id === 'upload-bank' && (
                      <>
                        <p><strong>Channel:</strong> {step.details.channel}</p>
                        <p><strong>Bank:</strong> {step.details.bank}</p>
                        <p><strong>Submission ID:</strong> {step.details.submissionId}</p>
                      </>
                    )}
                    {step.id === 'poll-status' && (
                      <>
                        <p><strong>Accepted:</strong> {step.details.acceptedPayments} payments</p>
                        <p><strong>Rejected:</strong> {step.details.rejectedPayments} payments</p>
                        <p><strong>Correlation:</strong> {step.details.correlationId}</p>
                      </>
                    )}
                    {step.id === 'download-reconcile' && (
                      <>
                        <p><strong>camt.054:</strong> Downloaded</p>
                        <p><strong>Reconciliation:</strong> Complete</p>
                        <p><strong>Final Status:</strong> {step.details.finalStatus}</p>
                      </>
                    )}
                  </div>
                )}
                
                {step.status === 'pending' && canExecuteStep(step.id) && (
                  <Button 
                    size="sm" 
                    onClick={() => executeStep(step.id)}
                    className="mt-2"
                  >
                    Execute Step
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Summary */}
      {completedSteps === steps.length && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Payment operations workflow completed successfully! All payments have been processed 
            and reconciled through the selected bank channel.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}