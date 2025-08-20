import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { CalendarDays, Calculator, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface SeveranceWizardProps {
  employeeId: string;
  onComplete?: (result: any) => void;
  onCancel?: () => void;
}

interface WizardData {
  // Step 1 - Details
  contractType: string;
  hireDate: string;
  terminationDate: string;
  terminationType: string;
  terminationCause: string;
  lastMonthlyWage: number;
  baseRate: number;
  avgRegular6m?: number;
  easterPaid: boolean;
  christmasPaid: boolean;
  withNotice: boolean;

  // Step 2 - Balances
  unpaidRegularDays: number;
  unusedLeaveDays: number;
  pendingAllowances: Record<string, number>;
  unpaidOvertimeAmount: number;
  allowanceAlreadyPaidYtd: number;
  pendingTips: number;

  // Step 3 - Preview (calculated)
  calculationResult?: any;

  // Step 4 - Documents
  selectedDocuments: string[];
  explanationLanguage: 'gr' | 'en';

  // Step 5 - Commit
  requiresApproval: boolean;
  addToPayrollRun: boolean;
  triggerErganiSubmission: boolean;
}

const STEPS = [
  { id: 1, title: 'Details', icon: CalendarDays, description: 'Contract & termination details' },
  { id: 2, title: 'Balances', icon: Calculator, description: 'Unpaid wages & leave' },
  { id: 3, title: 'Preview', icon: FileText, description: 'Calculation breakdown' },
  { id: 4, title: 'Documents', icon: FileText, description: 'Generate documents' },
  { id: 5, title: 'Commit', icon: CheckCircle, description: 'Finalize & submit' }
];

export function SeveranceWizard({ employeeId, onComplete, onCancel }: SeveranceWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState<WizardData>({
    contractType: 'indefinite',
    hireDate: '',
    terminationDate: new Date().toISOString().split('T')[0],
    terminationType: 'dismissal_without_notice',
    terminationCause: 'business_reasons',
    lastMonthlyWage: 0,
    baseRate: 0,
    easterPaid: false,
    christmasPaid: false,
    withNotice: false,
    unpaidRegularDays: 0,
    unusedLeaveDays: 0,
    pendingAllowances: {},
    unpaidOvertimeAmount: 0,
    allowanceAlreadyPaidYtd: 0,
    pendingTips: 0,
    selectedDocuments: ['termination_letter', 'ergani_payload'],
    explanationLanguage: 'gr',
    requiresApproval: true,
    addToPayrollRun: false,
    triggerErganiSubmission: true
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch employee data for auto-population
  const { data: employeeData } = useQuery({
    queryKey: [`/api/employees/${employeeId}`],
    enabled: !!employeeId
  });

  // Calculate severance mutation
  const calculateSeverance = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/severance/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          ...data
        })
      });
      if (!response.ok) {
        throw new Error('Calculation failed');
      }
      return response.json();
    },
    onSuccess: (result) => {
      setWizardData(prev => ({ ...prev, calculationResult: result }));
      setCurrentStep(3);
    },
    onError: (error) => {
      toast({
        title: "Calculation Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Finalize severance mutation
  const finalizeSeverance = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/severance/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          ...data
        })
      });
      if (!response.ok) {
        throw new Error('Finalization failed');
      }
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Severance Completed",
        description: "Final pay calculation has been processed successfully.",
        variant: "default"
      });
      onComplete?.(result);
    },
    onError: (error) => {
      toast({
        title: "Processing Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Auto-populate employee data
  useEffect(() => {
    if (employeeData) {
      const data = employeeData as any;
      setWizardData(prev => ({
        ...prev,
        hireDate: data?.hireDate || prev.hireDate,
        lastMonthlyWage: data?.currentSalary || data?.salary || prev.lastMonthlyWage,
        baseRate: data?.baseSalary || data?.salary || prev.baseRate,
        contractType: data?.contractType || prev.contractType
      }));
    }
  }, [employeeData]);

  const updateWizardData = (updates: Partial<WizardData>) => {
    setWizardData(prev => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    if (currentStep === 2) {
      // Trigger calculation before moving to preview
      calculateSeverance.mutate(wizardData);
    } else if (currentStep < 5) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleFinalize = () => {
    finalizeSeverance.mutate(wizardData);
  };

  const progressPercentage = (currentStep / 5) * 100;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Severance & Final Pay Calculator</h1>
        <p className="text-muted-foreground">
          Step {currentStep} of 5: {STEPS.find(s => s.id === currentStep)?.description}
        </p>
        <Progress value={progressPercentage} className="w-full max-w-md mx-auto" />
      </div>

      {/* Steps Navigation */}
      <div className="flex justify-center space-x-4 mb-8">
        {STEPS.map((step) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          
          return (
            <div
              key={step.id}
              className={`flex flex-col items-center space-y-2 p-3 rounded-lg transition-colors ${
                isActive ? 'bg-primary/10 border-2 border-primary' :
                isCompleted ? 'bg-green-50 border border-green-200' :
                'bg-gray-50 border border-gray-200'
              }`}
            >
              <Icon className={`w-6 h-6 ${
                isActive ? 'text-primary' :
                isCompleted ? 'text-green-600' :
                'text-gray-400'
              }`} />
              <span className={`text-sm font-medium ${
                isActive ? 'text-primary' :
                isCompleted ? 'text-green-600' :
                'text-gray-500'
              }`}>
                {step.title}
              </span>
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      {currentStep === 1 && (
        <StepDetails wizardData={wizardData} updateWizardData={updateWizardData} />
      )}

      {currentStep === 2 && (
        <StepBalances wizardData={wizardData} updateWizardData={updateWizardData} />
      )}

      {currentStep === 3 && wizardData.calculationResult && (
        <StepPreview calculationResult={wizardData.calculationResult} />
      )}

      {currentStep === 4 && (
        <StepDocuments 
          wizardData={wizardData} 
          updateWizardData={updateWizardData}
        />
      )}

      {currentStep === 5 && (
        <StepCommit 
          wizardData={wizardData} 
          updateWizardData={updateWizardData}
        />
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-6">
        <div>
          {currentStep > 1 && (
            <Button variant="outline" onClick={handleBack}>
              Previous
            </Button>
          )}
          {currentStep === 1 && onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>

        <div className="space-x-2">
          {currentStep < 5 && (
            <Button 
              onClick={handleNext}
              disabled={calculateSeverance.isPending}
            >
              {calculateSeverance.isPending ? 'Calculating...' : 'Next'}
            </Button>
          )}
          {currentStep === 5 && (
            <Button 
              onClick={handleFinalize}
              disabled={finalizeSeverance.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {finalizeSeverance.isPending ? 'Processing...' : 'Finalize Severance'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Step Components
function StepDetails({ wizardData, updateWizardData }: {
  wizardData: WizardData;
  updateWizardData: (updates: Partial<WizardData>) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5" />
          Termination Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contractType">Contract Type</Label>
            <Select
              value={wizardData.contractType}
              onValueChange={(value) => updateWizardData({ contractType: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select contract type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="indefinite">Indefinite Duration</SelectItem>
                <SelectItem value="fixed">Fixed Term</SelectItem>
                <SelectItem value="seasonal">Seasonal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="terminationType">Termination Type</Label>
            <Select
              value={wizardData.terminationType}
              onValueChange={(value) => updateWizardData({ terminationType: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select termination type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dismissal_without_notice">Dismissal Without Notice</SelectItem>
                <SelectItem value="dismissal_with_notice">Dismissal With Notice</SelectItem>
                <SelectItem value="resignation">Employee Resignation</SelectItem>
                <SelectItem value="mutual_agreement">Mutual Agreement</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="hireDate">Hire Date</Label>
            <Input
              id="hireDate"
              type="date"
              value={wizardData.hireDate}
              onChange={(e) => updateWizardData({ hireDate: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="terminationDate">Termination Date</Label>
            <Input
              id="terminationDate"
              type="date"
              value={wizardData.terminationDate}
              onChange={(e) => updateWizardData({ terminationDate: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="lastMonthlyWage">Last Monthly Wage (€)</Label>
            <Input
              id="lastMonthlyWage"
              type="number"
              step="0.01"
              value={wizardData.lastMonthlyWage}
              onChange={(e) => updateWizardData({ lastMonthlyWage: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="baseRate">Base Rate (€)</Label>
            <Input
              id="baseRate"
              type="number"
              step="0.01"
              value={wizardData.baseRate}
              onChange={(e) => updateWizardData({ baseRate: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="easterPaid"
              checked={wizardData.easterPaid}
              onCheckedChange={(checked) => updateWizardData({ easterPaid: !!checked })}
            />
            <Label htmlFor="easterPaid">Easter bonus already paid</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="christmasPaid"
              checked={wizardData.christmasPaid}
              onCheckedChange={(checked) => updateWizardData({ christmasPaid: !!checked })}
            />
            <Label htmlFor="christmasPaid">Christmas bonus already paid</Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StepBalances({ wizardData, updateWizardData }: {
  wizardData: WizardData;
  updateWizardData: (updates: Partial<WizardData>) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          Outstanding Balances
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="unpaidRegularDays">Unpaid Regular Days</Label>
            <Input
              id="unpaidRegularDays"
              type="number"
              value={wizardData.unpaidRegularDays}
              onChange={(e) => updateWizardData({ unpaidRegularDays: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="unusedLeaveDays">Unused Leave Days</Label>
            <Input
              id="unusedLeaveDays"
              type="number"
              value={wizardData.unusedLeaveDays}
              onChange={(e) => updateWizardData({ unusedLeaveDays: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="unpaidOvertimeAmount">Unpaid Overtime (€)</Label>
          <Input
            id="unpaidOvertimeAmount"
            type="number"
            step="0.01"
            value={wizardData.unpaidOvertimeAmount}
            onChange={(e) => updateWizardData({ unpaidOvertimeAmount: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function StepPreview({ calculationResult }: { calculationResult: any }) {
  const formatCurrency = (amount: number) => new Intl.NumberFormat('el-GR', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Calculation Preview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg">
            <div className="text-sm font-medium">Severance</div>
            <div className="text-2xl font-bold">
              {formatCurrency(calculationResult.severanceAmount)}
            </div>
          </div>

          <div className="p-4 border rounded-lg">
            <div className="text-sm font-medium">Net Total</div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(calculationResult.netTotal)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StepDocuments({ wizardData, updateWizardData }: {
  wizardData: WizardData;
  updateWizardData: (updates: Partial<WizardData>) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Label>Language</Label>
          <Select
            value={wizardData.explanationLanguage}
            onValueChange={(value: 'gr' | 'en') => updateWizardData({ explanationLanguage: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gr">Greek</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

function StepCommit({ wizardData, updateWizardData }: {
  wizardData: WizardData;
  updateWizardData: (updates: Partial<WizardData>) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Finalize</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="requiresApproval"
            checked={wizardData.requiresApproval}
            onCheckedChange={(checked) => updateWizardData({ requiresApproval: !!checked })}
          />
          <Label htmlFor="requiresApproval">Requires approval</Label>
        </div>
      </CardContent>
    </Card>
  );
}