import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Download, 
  Upload, 
  FileText, 
  Eye, 
  Play, 
  ArrowRight, 
  ArrowLeft,
  RefreshCw,
  Calculator,
  DollarSign,
  Users,
  Calendar
} from "lucide-react";

interface PayrollStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  isActive: boolean;
}

interface TimesheetData {
  employeesProcessed: number;
  totalHours: number;
  overtimeHours: number;
  regularHours: number;
  exceptions: TimesheetException[];
}

interface TimesheetException {
  id: string;
  employeeName: string;
  type: 'missing_punch' | 'overtime_approval' | 'schedule_conflict' | 'break_violation';
  description: string;
  severity: 'high' | 'medium' | 'low';
  suggestedAction: string;
  canAutoResolve: boolean;
}

interface PayrollPreview {
  totalGrossPay: number;
  totalNetPay: number;
  totalTaxes: number;
  totalInsurance: number;
  employeeCount: number;
  variance: {
    grossPay: { amount: number; percentage: number };
    netPay: { amount: number; percentage: number };
    overtime: { amount: number; percentage: number };
  };
  breakdown: {
    regularPay: number;
    overtimePay: number;
    bonuses: number;
    allowances: number;
    deductions: number;
  };
}

const payrollSteps: PayrollStep[] = [
  {
    id: 'import',
    title: 'Import Timesheets',
    description: 'Automatically import and validate timesheet data',
    status: 'pending',
    isActive: true
  },
  {
    id: 'validate',
    title: 'Validate Exceptions',
    description: 'Review and resolve timesheet exceptions',
    status: 'pending',
    isActive: false
  },
  {
    id: 'preview',
    title: 'Preview Payroll',
    description: 'Review payroll totals and variance analysis',
    status: 'pending',
    isActive: false
  },
  {
    id: 'generate',
    title: 'Generate & Submit',
    description: 'Generate SEPA files, APD, and ΦΜΥ submissions',
    status: 'pending',
    isActive: false
  }
];

export default function PayrollRunWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState(payrollSteps);
  const [timesheetData, setTimesheetData] = useState<TimesheetData | null>(null);
  const [payrollPreview, setPayrollPreview] = useState<PayrollPreview | null>(null);
  const queryClient = useQueryClient();

  // Import timesheets mutation
  const importTimesheets = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/payroll-wizard/import-timesheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      return response.json();
    },
    onSuccess: (data) => {
      setTimesheetData(data);
      updateStepStatus(0, 'completed');
      if (data.exceptions.length === 0) {
        // Skip validation step if no exceptions
        updateStepStatus(1, 'completed');
        setCurrentStep(2);
      } else {
        setCurrentStep(1);
      }
    }
  });

  // Generate payroll preview mutation
  const generatePreview = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/payroll-wizard/generate-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      return response.json();
    },
    onSuccess: (data) => {
      setPayrollPreview(data);
      updateStepStatus(2, 'completed');
      setCurrentStep(3);
    }
  });

  // Final payroll generation mutation
  const generatePayroll = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/payroll-wizard/generate-final', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      return response.json();
    },
    onSuccess: () => {
      updateStepStatus(3, 'completed');
    }
  });

  const updateStepStatus = (stepIndex: number, status: PayrollStep['status']) => {
    setSteps(prev => prev.map((step, index) => 
      index === stepIndex ? { ...step, status } : step
    ));
  };

  const handleStepClick = (stepIndex: number) => {
    if (stepIndex <= currentStep || steps[stepIndex].status === 'completed') {
      setCurrentStep(stepIndex);
    }
  };

  const handleNext = () => {
    if (currentStep === 0 && !timesheetData) {
      importTimesheets.mutate();
    } else if (currentStep === 1) {
      // Validate exceptions step
      updateStepStatus(1, 'completed');
      setCurrentStep(2);
    } else if (currentStep === 2 && !payrollPreview) {
      generatePreview.mutate();
    } else if (currentStep === 3) {
      generatePayroll.mutate();
    } else if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getVarianceDisplay = (variance: { amount: number; percentage: number }, label: string) => {
    const isIncrease = variance.amount > 0;
    const color = isIncrease ? 'text-red-600' : 'text-green-600';
    const icon = isIncrease ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />;
    
    return (
      <div className={`flex items-center gap-2 ${color}`}>
        {icon}
        <span className="font-medium">
          {isIncrease ? '+' : ''}€{Math.abs(variance.amount).toLocaleString('el-GR')} 
          ({isIncrease ? '+' : ''}{variance.percentage.toFixed(1)}% vs July)
        </span>
      </div>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Import Timesheets
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Import Timesheets
              </CardTitle>
              <CardDescription>
                Automatically importing timesheet data from all sources
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!timesheetData ? (
                <div className="text-center py-8">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                    <p className="text-lg">Importing timesheet data...</p>
                    <p className="text-sm text-muted-foreground">
                      Connecting to ERGANI II, digital work cards, and manual entries
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Successfully imported timesheets for {timesheetData.employeesProcessed} employees
                    </AlertDescription>
                  </Alert>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{timesheetData.totalHours}</div>
                      <div className="text-sm text-muted-foreground">Total Hours</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{timesheetData.regularHours}</div>
                      <div className="text-sm text-muted-foreground">Regular Hours</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">{timesheetData.overtimeHours}</div>
                      <div className="text-sm text-muted-foreground">Overtime Hours</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{timesheetData.exceptions.length}</div>
                      <div className="text-sm text-muted-foreground">Exceptions</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 1: // Validate Exceptions
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Validate Exceptions
              </CardTitle>
              <CardDescription>
                Review and resolve timesheet exceptions before payroll processing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {timesheetData?.exceptions.map((exception) => (
                <div key={exception.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant={exception.severity === 'high' ? 'destructive' : exception.severity === 'medium' ? 'default' : 'secondary'}>
                        {exception.severity.toUpperCase()}
                      </Badge>
                      <span className="font-medium">{exception.employeeName}</span>
                      <span className="text-sm text-muted-foreground">{exception.type.replace('_', ' ').toUpperCase()}</span>
                    </div>
                    {exception.canAutoResolve && (
                      <Button size="sm" variant="outline">
                        Auto-Resolve
                      </Button>
                    )}
                  </div>
                  <p className="text-sm">{exception.description}</p>
                  <p className="text-sm text-muted-foreground">
                    <strong>Suggested Action:</strong> {exception.suggestedAction}
                  </p>
                </div>
              ))}
              
              {timesheetData?.exceptions.length === 0 && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    No exceptions found. All timesheets are valid and ready for payroll processing.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        );

      case 2: // Preview Payroll
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Preview Payroll Totals
              </CardTitle>
              <CardDescription>
                Review payroll calculations and variance analysis vs previous month
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!payrollPreview ? (
                <div className="text-center py-8">
                  <div className="flex flex-col items-center gap-4">
                    <Calculator className="w-16 h-16 text-blue-600 animate-pulse" />
                    <p className="text-lg">Calculating payroll totals...</p>
                    <p className="text-sm text-muted-foreground">
                      Processing Greek tax calculations, EFKA insurance, and collective agreements
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-2 border-blue-200">
                      <CardContent className="p-4 text-center">
                        <div className="text-3xl font-bold text-blue-600">
                          €{payrollPreview.totalGrossPay.toLocaleString('el-GR')}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Gross Pay</div>
                        {getVarianceDisplay(payrollPreview.variance.grossPay, 'Gross Pay')}
                      </CardContent>
                    </Card>
                    
                    <Card className="border-2 border-green-200">
                      <CardContent className="p-4 text-center">
                        <div className="text-3xl font-bold text-green-600">
                          €{payrollPreview.totalNetPay.toLocaleString('el-GR')}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Net Pay</div>
                        {getVarianceDisplay(payrollPreview.variance.netPay, 'Net Pay')}
                      </CardContent>
                    </Card>
                    
                    <Card className="border-2 border-orange-200">
                      <CardContent className="p-4 text-center">
                        <div className="text-3xl font-bold text-orange-600">
                          €{payrollPreview.breakdown.overtimePay.toLocaleString('el-GR')}
                        </div>
                        <div className="text-sm text-muted-foreground">Overtime Pay</div>
                        {getVarianceDisplay(payrollPreview.variance.overtime, 'Overtime')}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Variance Highlights */}
                  <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20">
                    <TrendingUp className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800 dark:text-red-200">
                      <strong>Variance Alert:</strong> Overtime costs increased by €{Math.abs(payrollPreview.variance.overtime.amount).toLocaleString('el-GR')} 
                      (+{payrollPreview.variance.overtime.percentage.toFixed(1)}%) compared to July due to summer season staffing.
                    </AlertDescription>
                  </Alert>

                  {/* Detailed Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Pay Breakdown</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span>Regular Pay</span>
                          <span className="font-medium">€{payrollPreview.breakdown.regularPay.toLocaleString('el-GR')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Overtime Pay</span>
                          <span className="font-medium text-orange-600">€{payrollPreview.breakdown.overtimePay.toLocaleString('el-GR')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Bonuses</span>
                          <span className="font-medium">€{payrollPreview.breakdown.bonuses.toLocaleString('el-GR')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Allowances</span>
                          <span className="font-medium">€{payrollPreview.breakdown.allowances.toLocaleString('el-GR')}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold">
                          <span>Gross Total</span>
                          <span>€{payrollPreview.totalGrossPay.toLocaleString('el-GR')}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Deductions</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span>Income Tax</span>
                          <span className="font-medium">€{(payrollPreview.totalTaxes * 0.6).toLocaleString('el-GR')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Solidarity Tax</span>
                          <span className="font-medium">€{(payrollPreview.totalTaxes * 0.1).toLocaleString('el-GR')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>EFKA Insurance</span>
                          <span className="font-medium">€{payrollPreview.totalInsurance.toLocaleString('el-GR')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Other Deductions</span>
                          <span className="font-medium">€{payrollPreview.breakdown.deductions.toLocaleString('el-GR')}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold">
                          <span>Net Pay</span>
                          <span className="text-green-600">€{payrollPreview.totalNetPay.toLocaleString('el-GR')}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 3: // Generate & Submit
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Generate & Submit
              </CardTitle>
              <CardDescription>
                Generate SEPA payment files, APD submissions, and ΦΜΥ filings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-2 border-blue-200">
                  <CardContent className="p-4 text-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="font-medium">SEPA Files</div>
                    <div className="text-sm text-muted-foreground">pain.001 payment files</div>
                    <Button className="mt-2 w-full" variant="outline" size="sm">
                      Generate SEPA
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-2 border-green-200">
                  <CardContent className="p-4 text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                      <Upload className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="font-medium">APD Filing</div>
                    <div className="text-sm text-muted-foreground">Monthly APD submission</div>
                    <Button className="mt-2 w-full" variant="outline" size="sm">
                      Submit APD
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-2 border-orange-200">
                  <CardContent className="p-4 text-center">
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                      <Calendar className="w-6 h-6 text-orange-600" />
                    </div>
                    <div className="font-medium">ΦΜΥ Filing</div>
                    <div className="text-sm text-muted-foreground">Tax authority submission</div>
                    <Button className="mt-2 w-full" variant="outline" size="sm">
                      Submit ΦΜΥ
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {steps[3].status === 'completed' && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    ✅ Payroll processing completed successfully! All files generated and submissions completed.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payroll Run Wizard</h1>
          <p className="text-muted-foreground">August 2025 Payroll Processing</p>
        </div>
        <div className="text-sm text-muted-foreground">
          Step {currentStep + 1} of {steps.length}
        </div>
      </div>

      {/* Progress Steps */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex flex-col items-center flex-1">
                <button
                  onClick={() => handleStepClick(index)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 mb-2 transition-colors ${
                    step.status === 'completed' 
                      ? 'bg-green-600 border-green-600 text-white' 
                      : index === currentStep 
                        ? 'bg-blue-600 border-blue-600 text-white' 
                        : 'border-gray-300 text-gray-400'
                  }`}
                >
                  {step.status === 'completed' ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : step.status === 'processing' ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </button>
                <div className="text-center">
                  <div className={`text-sm font-medium ${index === currentStep ? 'text-blue-600' : 'text-gray-600'}`}>
                    {step.title}
                  </div>
                  <div className="text-xs text-muted-foreground">{step.description}</div>
                </div>
              </div>
            ))}
          </div>
          <Progress value={((currentStep + 1) / steps.length) * 100} className="h-2" />
        </CardContent>
      </Card>

      {/* Step Content */}
      {renderStepContent()}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 0}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Previous
        </Button>
        
        <Button
          onClick={handleNext}
          disabled={
            (currentStep === 0 && importTimesheets.isPending) ||
            (currentStep === 2 && generatePreview.isPending) ||
            (currentStep === 3 && generatePayroll.isPending) ||
            (currentStep === 3 && steps[3].status === 'completed')
          }
          className="flex items-center gap-2"
        >
          {currentStep === steps.length - 1 ? (
            steps[3].status === 'completed' ? (
              'Completed'
            ) : generatePayroll.isPending ? (
              'Processing...'
            ) : (
              <>
                Generate Files
                <Play className="w-4 h-4" />
              </>
            )
          ) : (
            <>
              Next
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}