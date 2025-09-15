import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  FileText,
  Download,
  Calculator,
  CreditCard,
  CheckCircle,
  AlertTriangle,
  Euro,
  Clock,
  Building2,
} from 'lucide-react';

interface PayslipData {
  employee: {
    fullName: string;
    afm: string;
    amka: string;
    iban: string;
    position: string;
    department: string;
  };
  earnings: {
    baseSalary: number;
    allowances: {
      meal: number;
      transport: number;
      housing: number;
      hazardPay: number;
    };
    overtimeTiers: {
      tier1_25percent: { hours: number; amount: number };
      tier2_50percent: { hours: number; amount: number };
    };
    premiums: {
      nightWork: { hours: number; amount: number };
      sundayWork: { hours: number; amount: number };
      holidayWork: { hours: number; amount: number };
    };
    tips: {
      total: number;
    };
    totalGross: number;
  };
  deductions: {
    totalDeductions: number;
  };
  netPayable: number;
}

interface GLMapping {
  journalEntries: Array<{
    accountCode: string;
    accountName: string;
    debitAmount: number;
    creditAmount: number;
    description: string;
  }>;
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  validation: {
    isValid: boolean;
    errors: string[];
  };
}

export default function PayrollProcessingPage() {
  const [selectedRunId, setSelectedRunId] = useState('PR-2025-01-001');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('EMP001');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Generate payslip
  const generatePayslip = useMutation({
    mutationFn: async ({
      employeeId,
      runId,
    }: {
      employeeId: string;
      runId: string;
    }) => {
      const response = await fetch(
        `/api/payroll/payslip/${employeeId}/${runId}?format=json`
      );
      if (!response.ok) throw new Error('Failed to generate payslip');
      return response.json() as Promise<PayslipData>;
    },
    onSuccess: () => {
      toast({
        title: 'Payslip Generated',
        description: 'Employee payslip has been successfully generated.',
      });
    },
    onError: error => {
      toast({
        title: 'Generation Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Generate SEPA file
  const generateSEPA = useMutation({
    mutationFn: async (runId: string) => {
      const response = await fetch(
        `/api/payroll/sepa/${runId}?format=metadata`
      );
      if (!response.ok) throw new Error('Failed to generate SEPA metadata');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'SEPA File Ready',
        description: 'SEPA payment file has been generated successfully.',
      });
    },
    onError: error => {
      toast({
        title: 'SEPA Generation Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Generate GL mapping
  const generateGL = useMutation({
    mutationFn: async (runId: string) => {
      const response = await fetch(`/api/payroll/gl-mapping/${runId}`);
      if (!response.ok) throw new Error('Failed to generate GL mapping');
      return response.json() as Promise<GLMapping>;
    },
    onSuccess: () => {
      toast({
        title: 'GL Mapping Generated',
        description: 'Greek Chart of Accounts mapping has been created.',
      });
    },
    onError: error => {
      toast({
        title: 'GL Generation Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const downloadSEPAFile = async () => {
    try {
      const response = await fetch(
        `/api/payroll/sepa/${selectedRunId}?format=xml`
      );
      if (!response.ok) throw new Error('Failed to download SEPA file');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SEPA_${selectedRunId}_${new Date().toISOString().split('T')[0]}.xml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Download Complete',
        description: 'SEPA XML file downloaded successfully.',
      });
    } catch (error) {
      toast({
        title: 'Download Failed',
        description: 'Failed to download SEPA file',
        variant: 'destructive',
      });
    }
  };

  const downloadGLCSV = async () => {
    try {
      const response = await fetch(
        `/api/payroll/gl-mapping/${selectedRunId}?format=csv`
      );
      if (!response.ok) throw new Error('Failed to download GL mapping');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GL_Mapping_${selectedRunId}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Download Complete',
        description: 'GL mapping CSV file downloaded successfully.',
      });
    } catch (error) {
      toast({
        title: 'Download Failed',
        description: 'Failed to download GL mapping',
        variant: 'destructive',
      });
    }
  };

  const viewPayslipHTML = () => {
    const url = `/api/payroll/payslip/${selectedEmployeeId}/${selectedRunId}?format=html`;
    window.open(url, '_blank');
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Greek Payroll Processing
        </h1>
        <p className="text-gray-600">
          Complete payroll processing with Greek compliance, SEPA file
          generation, and GL mapping
        </p>
      </div>

      {/* Input Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Processing Parameters
          </CardTitle>
          <CardDescription>
            Configure payroll run and employee details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="runId">Payroll Run ID</Label>
              <Input
                id="runId"
                value={selectedRunId}
                onChange={e => setSelectedRunId(e.target.value)}
                placeholder="PR-2025-01-001"
              />
            </div>
            <div>
              <Label htmlFor="employeeId">Employee ID (for payslip)</Label>
              <Input
                id="employeeId"
                value={selectedEmployeeId}
                onChange={e => setSelectedEmployeeId(e.target.value)}
                placeholder="EMP001"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="payslip" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="payslip" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Greek Payslips
          </TabsTrigger>
          <TabsTrigger value="sepa" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            SEPA Files
          </TabsTrigger>
          <TabsTrigger value="gl" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            GL Mapping
          </TabsTrigger>
        </TabsList>

        {/* Payslip Generation Tab */}
        <TabsContent value="payslip" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Greek Payslip Generation
              </CardTitle>
              <CardDescription>
                Generate compliant Greek payslips with earnings, deductions, and
                YTD summaries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={() =>
                      generatePayslip.mutate({
                        employeeId: selectedEmployeeId,
                        runId: selectedRunId,
                      })
                    }
                    disabled={generatePayslip.isPending}
                    className="w-full"
                  >
                    {generatePayslip.isPending ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        Generate Payslip (JSON)
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={viewPayslipHTML}
                    variant="outline"
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    View HTML Payslip
                  </Button>
                </div>

                {generatePayslip.data && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-3">Payslip Summary</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p>
                          <strong>Employee:</strong>{' '}
                          {generatePayslip.data.employee.fullName}
                        </p>
                        <p>
                          <strong>Position:</strong>{' '}
                          {generatePayslip.data.employee.position}
                        </p>
                        <p>
                          <strong>AFM:</strong>{' '}
                          {generatePayslip.data.employee.afm}
                        </p>
                        <p>
                          <strong>AMKA:</strong>{' '}
                          {generatePayslip.data.employee.amka}
                        </p>
                      </div>
                      <div>
                        <p>
                          <strong>Base Salary:</strong> €
                          {generatePayslip.data.earnings.baseSalary.toFixed(2)}
                        </p>
                        <p>
                          <strong>Total Gross:</strong> €
                          {generatePayslip.data.earnings.totalGross.toFixed(2)}
                        </p>
                        <p>
                          <strong>Total Deductions:</strong> €
                          {generatePayslip.data.deductions.totalDeductions.toFixed(
                            2
                          )}
                        </p>
                        <p>
                          <strong>Net Payable:</strong>{' '}
                          <span className="text-green-600 font-semibold">
                            €{generatePayslip.data.netPayable.toFixed(2)}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-4 text-xs bg-white p-3 rounded">
                      <div>
                        <p className="font-medium text-gray-700">Overtime</p>
                        <p>
                          T1 (25%):{' '}
                          {
                            generatePayslip.data.earnings.overtimeTiers
                              .tier1_25percent.hours
                          }
                          h = €
                          {generatePayslip.data.earnings.overtimeTiers.tier1_25percent.amount.toFixed(
                            2
                          )}
                        </p>
                        <p>
                          T2 (50%):{' '}
                          {
                            generatePayslip.data.earnings.overtimeTiers
                              .tier2_50percent.hours
                          }
                          h = €
                          {generatePayslip.data.earnings.overtimeTiers.tier2_50percent.amount.toFixed(
                            2
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">Premiums</p>
                        <p>
                          Night:{' '}
                          {
                            generatePayslip.data.earnings.premiums.nightWork
                              .hours
                          }
                          h = €
                          {generatePayslip.data.earnings.premiums.nightWork.amount.toFixed(
                            2
                          )}
                        </p>
                        <p>
                          Sunday:{' '}
                          {
                            generatePayslip.data.earnings.premiums.sundayWork
                              .hours
                          }
                          h = €
                          {generatePayslip.data.earnings.premiums.sundayWork.amount.toFixed(
                            2
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">Allowances</p>
                        <p>
                          Meal: €
                          {generatePayslip.data.earnings.allowances.meal.toFixed(
                            2
                          )}
                        </p>
                        <p>
                          Transport: €
                          {generatePayslip.data.earnings.allowances.transport.toFixed(
                            2
                          )}
                        </p>
                        <p>
                          Tips: €
                          {generatePayslip.data.earnings.tips.total.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SEPA File Generation Tab */}
        <TabsContent value="sepa" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-green-600" />
                SEPA Credit Transfer (pain.001.001.03)
              </CardTitle>
              <CardDescription>
                Generate XML files for automated salary payments to Greek banks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={() => generateSEPA.mutate(selectedRunId)}
                    disabled={generateSEPA.isPending}
                    className="w-full"
                  >
                    {generateSEPA.isPending ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Generate SEPA Metadata
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={downloadSEPAFile}
                    variant="outline"
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download XML File
                  </Button>
                </div>

                {generateSEPA.data && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-3">SEPA File Metadata</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p>
                          <strong>Message ID:</strong>{' '}
                          {generateSEPA.data.messageId}
                        </p>
                        <p>
                          <strong>Total Transactions:</strong>{' '}
                          {generateSEPA.data.numberOfTransactions}
                        </p>
                        <p>
                          <strong>Total Amount:</strong> €
                          {generateSEPA.data.totalAmount.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p>
                          <strong>Execution Date:</strong>{' '}
                          {generateSEPA.data.requestedExecutionDate}
                        </p>
                        <p>
                          <strong>Debtor:</strong>{' '}
                          {generateSEPA.data.debtorName}
                        </p>
                        <p>
                          <strong>Debtor IBAN:</strong>{' '}
                          {generateSEPA.data.debtorIBAN}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Badge
                        variant={
                          generateSEPA.data.batchBooking
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        Batch Booking:{' '}
                        {generateSEPA.data.batchBooking
                          ? 'Enabled'
                          : 'Disabled'}
                      </Badge>
                    </div>
                  </div>
                )}

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h5 className="font-medium text-blue-900 mb-2">
                    SEPA File Features
                  </h5>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• pain.001.001.03 standard format</li>
                    <li>• Batch booking flag for efficient processing</li>
                    <li>• End-to-end IDs for payment tracking</li>
                    <li>• Greek IBAN validation</li>
                    <li>• Next business day execution dates</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* GL Mapping Tab */}
        <TabsContent value="gl" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-purple-600" />
                Greek Chart of Accounts Mapping
              </CardTitle>
              <CardDescription>
                Generate journal entries with Greek accounting codes (60.xx,
                33.xx, 38.xx)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={() => generateGL.mutate(selectedRunId)}
                    disabled={generateGL.isPending}
                    className="w-full"
                  >
                    {generateGL.isPending ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Calculator className="h-4 w-4 mr-2" />
                        Generate GL Mapping
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={downloadGLCSV}
                    variant="outline"
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download CSV Export
                  </Button>
                </div>

                {generateGL.data && (
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-3">GL Summary</h4>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-600">
                            €{generateGL.data.totalDebit.toFixed(2)}
                          </p>
                          <p className="text-gray-600">Total Debits</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-red-600">
                            €{generateGL.data.totalCredit.toFixed(2)}
                          </p>
                          <p className="text-gray-600">Total Credits</p>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center">
                            {generateGL.data.isBalanced ? (
                              <CheckCircle className="h-8 w-8 text-green-500" />
                            ) : (
                              <AlertTriangle className="h-8 w-8 text-red-500" />
                            )}
                          </div>
                          <p className="text-gray-600">
                            {generateGL.data.isBalanced
                              ? 'Balanced'
                              : 'Unbalanced'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border rounded-lg">
                      <div className="p-4 border-b bg-gray-50">
                        <h5 className="font-medium">
                          Journal Entries (
                          {generateGL.data.journalEntries.length})
                        </h5>
                      </div>
                      <div className="p-4">
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {generateGL.data.journalEntries
                            .slice(0, 10)
                            .map((entry, index) => (
                              <div
                                key={index}
                                className="flex justify-between items-center py-2 border-b border-gray-100"
                              >
                                <div className="flex-1">
                                  <p className="font-mono text-sm">
                                    {entry.accountCode}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    {entry.accountName}
                                  </p>
                                </div>
                                <div className="text-right">
                                  {entry.debitAmount > 0 && (
                                    <p className="text-green-600 font-medium">
                                      +€{entry.debitAmount.toFixed(2)}
                                    </p>
                                  )}
                                  {entry.creditAmount > 0 && (
                                    <p className="text-red-600 font-medium">
                                      -€{entry.creditAmount.toFixed(2)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>

                    {generateGL.data.validation &&
                      !generateGL.data.validation.isValid && (
                        <div className="bg-red-50 p-4 rounded-lg">
                          <h5 className="font-medium text-red-900 mb-2">
                            Validation Errors
                          </h5>
                          <ul className="text-sm text-red-800 space-y-1">
                            {generateGL.data.validation.errors.map(
                              (error, index) => (
                                <li key={index}>• {error}</li>
                              )
                            )}
                          </ul>
                        </div>
                      )}
                  </div>
                )}

                <div className="bg-purple-50 p-4 rounded-lg">
                  <h5 className="font-medium text-purple-900 mb-2">
                    Greek Account Structure
                  </h5>
                  <ul className="text-sm text-purple-800 space-y-1">
                    <li>
                      • <strong>60.00.xx:</strong> Regular wages
                    </li>
                    <li>
                      • <strong>60.01.xx:</strong> Overtime and night premiums
                    </li>
                    <li>
                      • <strong>60.10.xx:</strong> Employer contributions (EFKA,
                      unemployment)
                    </li>
                    <li>
                      • <strong>33.xx:</strong> Tax and insurance liabilities
                    </li>
                    <li>
                      • <strong>38.xx:</strong> Bank clearing and cash accounts
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
