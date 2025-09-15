import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Download,
  DollarSign,
  Building2,
  Calendar,
  FileText,
  CreditCard,
  Banknote,
  Receipt,
  CheckCircle,
  AlertCircle,
  Euro,
} from 'lucide-react';

interface SepaFile {
  sepaFileId: string;
  fileName: string;
  propertyId: string | null;
  totalAmount: string;
  totalTransactions: number;
  status: string;
  createdAt: string;
  payrollPeriodId: string;
}

interface GLExport {
  glExportId: string;
  fileName: string;
  format: string;
  erpSystem: string;
  status: string;
  totalDebits: string;
  totalCredits: string;
  totalEntries: number;
  createdAt: string;
  payrollPeriodId: string;
}

interface PaymentHistory {
  paymentId: string;
  employeeId: string;
  employeeName: string;
  amount: string;
  status: string;
  bankAccount: string;
  processedAt: string;
  payrollPeriodId: string;
}

export default function Payments() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProperty, setSelectedProperty] = useState<string>('all');
  const [selectedPayrollPeriod, setSelectedPayrollPeriod] =
    useState<string>('2025-01');
  const [selectedERPSystem, setSelectedERPSystem] = useState<string>('softone');

  // Mock data for properties and periods
  const properties = [
    { id: 'all', name: 'All Properties' },
    { id: 'PROP001', name: 'Grand Hotel Athens' },
    { id: 'PROP002', name: 'Seaside Resort Mykonos' },
    { id: 'PROP003', name: 'Mountain Lodge Meteora' },
  ];

  const payrollPeriods = [
    { id: '2025-01', name: 'January 2025' },
    { id: '2024-12', name: 'December 2024' },
    { id: '2024-11', name: 'November 2024' },
  ];

  const erpSystems = [
    { id: 'softone', name: 'SoftOne' },
    { id: 'epsilon', name: 'Epsilon' },
    { id: 'sap', name: 'SAP Business One' },
    { id: 'navision', name: 'Microsoft Navision' },
  ];

  // Fetch payment history
  const { data: paymentHistory = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ['/api/payments/history', selectedProperty],
    queryFn: () =>
      apiRequest(`/api/payments/history?propertyId=${selectedProperty}`, 'GET'),
    enabled: true,
  });

  // Fetch GL export history
  const { data: glExportHistory = [], isLoading: isLoadingGLHistory } =
    useQuery({
      queryKey: ['/api/gl-export/history', selectedProperty, selectedERPSystem],
      queryFn: () =>
        apiRequest(
          `/api/gl-export/history?propertyId=${selectedProperty}&erpSystem=${selectedERPSystem}`,
          'GET'
        ),
      enabled: true,
    });

  // Generate SEPA file mutation
  const generateSepaMutation = useMutation({
    mutationFn: async (data: {
      payrollPeriodId: string;
      propertyId?: string;
    }) => {
      return apiRequest('/api/payments/sepa/generate', 'POST', data);
    },
    onSuccess: () => {
      toast({
        title: 'SEPA File Generated',
        description: 'Payment file has been generated successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/payments/history'] });
    },
    onError: error => {
      toast({
        title: 'Generation Failed',
        description: error.message || 'Failed to generate SEPA file',
        variant: 'destructive',
      });
    },
  });

  // Generate GL export mutation
  const generateGLMutation = useMutation({
    mutationFn: async (data: {
      payrollPeriodId: string;
      propertyId?: string;
      exportType: string;
      format: string;
      erpSystem: string;
    }) => {
      return apiRequest('/api/gl-export/generate', 'POST', data);
    },
    onSuccess: () => {
      toast({
        title: 'GL Export Generated',
        description: 'General ledger export has been generated successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/gl-export/history'] });
    },
    onError: error => {
      toast({
        title: 'Export Failed',
        description: error.message || 'Failed to generate GL export',
        variant: 'destructive',
      });
    },
  });

  const handleGenerateSepa = () => {
    generateSepaMutation.mutate({
      payrollPeriodId: selectedPayrollPeriod,
      propertyId: selectedProperty === 'all' ? undefined : selectedProperty,
    });
  };

  const handleGenerateGL = () => {
    generateGLMutation.mutate({
      payrollPeriodId: selectedPayrollPeriod,
      propertyId: selectedProperty === 'all' ? undefined : selectedProperty,
      exportType: 'payroll',
      format: 'csv',
      erpSystem: selectedERPSystem,
    });
  };

  const handleDownloadSepa = async (fileId: string) => {
    try {
      const response = await fetch(`/api/payments/sepa/${fileId}/download`);
      if (!response.ok) throw new Error('Failed to download');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `sepa-payment-${fileId}.xml`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: 'Download Failed',
        description: 'Failed to download SEPA file',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadGL = async (exportId: string) => {
    try {
      const response = await fetch(`/api/gl-export/${exportId}/download`);
      if (!response.ok) throw new Error('Failed to download');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `gl-export-${exportId}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: 'Download Failed',
        description: 'Failed to download GL export',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Payments & Accounting</h1>
        <div className="flex gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Euro className="w-3 h-3" />
            SEPA Ready
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Receipt className="w-3 h-3" />
            ERP Integration
          </Badge>
        </div>
      </div>

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Payment Control Panel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Property</label>
              <Select
                value={selectedProperty}
                onValueChange={setSelectedProperty}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map(property => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Payroll Period</label>
              <Select
                value={selectedPayrollPeriod}
                onValueChange={setSelectedPayrollPeriod}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  {payrollPeriods.map(period => (
                    <SelectItem key={period.id} value={period.id}>
                      {period.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">ERP System</label>
              <Select
                value={selectedERPSystem}
                onValueChange={setSelectedERPSystem}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select ERP" />
                </SelectTrigger>
                <SelectContent>
                  {erpSystems.map(erp => (
                    <SelectItem key={erp.id} value={erp.id}>
                      {erp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleGenerateSepa}
              disabled={generateSepaMutation.isPending}
              className="flex items-center gap-2"
            >
              <Banknote className="w-4 h-4" />
              {generateSepaMutation.isPending
                ? 'Generating...'
                : 'Generate SEPA File'}
            </Button>
            <Button
              variant="outline"
              onClick={handleGenerateGL}
              disabled={generateGLMutation.isPending}
              className="flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              {generateGLMutation.isPending
                ? 'Exporting...'
                : 'Generate GL Export'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="sepa" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sepa" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            SEPA Payments
          </TabsTrigger>
          <TabsTrigger value="gl-exports" className="flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            GL Exports
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Payment History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sepa" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SEPA Payment Files</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Mock SEPA files for demonstration */}
                {[
                  {
                    sepaFileId: 'SEPA001',
                    fileName: 'payroll_jan2025_sepa.xml',
                    totalAmount: '145,250.00',
                    totalTransactions: 87,
                    status: 'generated',
                    createdAt: new Date().toISOString(),
                    payrollPeriodId: '2025-01',
                  },
                  {
                    sepaFileId: 'SEPA002',
                    fileName: 'payroll_dec2024_sepa.xml',
                    totalAmount: '132,800.00',
                    totalTransactions: 83,
                    status: 'processed',
                    createdAt: new Date(Date.now() - 86400000).toISOString(),
                    payrollPeriodId: '2024-12',
                  },
                ].map(file => (
                  <div
                    key={file.sepaFileId}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Banknote className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{file.fileName}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>€{file.totalAmount}</span>
                          <span>{file.totalTransactions} transactions</span>
                          <span>
                            {format(
                              new Date(file.createdAt),
                              'MMM dd, yyyy HH:mm'
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          file.status === 'processed' ? 'default' : 'secondary'
                        }
                      >
                        {file.status === 'processed' ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : (
                          <AlertCircle className="w-3 h-3 mr-1" />
                        )}
                        {file.status}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadSepa(file.sepaFileId)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gl-exports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Ledger Exports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Mock GL exports for demonstration */}
                {[
                  {
                    glExportId: 'GL001',
                    fileName: 'payroll_jan2025_softone.csv',
                    format: 'csv',
                    erpSystem: 'SoftOne',
                    totalDebits: '145,250.00',
                    totalCredits: '145,250.00',
                    totalEntries: 174,
                    status: 'generated',
                    createdAt: new Date().toISOString(),
                    payrollPeriodId: '2025-01',
                  },
                  {
                    glExportId: 'GL002',
                    fileName: 'payroll_dec2024_epsilon.xml',
                    format: 'xml',
                    erpSystem: 'Epsilon',
                    totalDebits: '132,800.00',
                    totalCredits: '132,800.00',
                    totalEntries: 166,
                    status: 'exported',
                    createdAt: new Date(Date.now() - 86400000).toISOString(),
                    payrollPeriodId: '2024-12',
                  },
                ].map(export_ => (
                  <div
                    key={export_.glExportId}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Receipt className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">{export_.fileName}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>{export_.erpSystem}</span>
                          <span>{export_.totalEntries} entries</span>
                          <span>€{export_.totalDebits} balanced</span>
                          <span>
                            {format(
                              new Date(export_.createdAt),
                              'MMM dd, yyyy HH:mm'
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          export_.status === 'exported'
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {export_.status === 'exported' ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : (
                          <AlertCircle className="w-3 h-3 mr-1" />
                        )}
                        {export_.status}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadGL(export_.glExportId)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Mock payment history for demonstration */}
                {[
                  {
                    paymentId: 'PAY001',
                    employeeName: 'Maria Papadopoulos',
                    amount: '2,850.00',
                    status: 'processed',
                    bankAccount: 'GR16 0110 1250 0000 0001 2345 67',
                    processedAt: new Date().toISOString(),
                  },
                  {
                    paymentId: 'PAY002',
                    employeeName: 'Dimitris Kostas',
                    amount: '3,200.00',
                    status: 'processed',
                    bankAccount: 'GR16 0140 1050 0000 0001 2345 68',
                    processedAt: new Date().toISOString(),
                  },
                  {
                    paymentId: 'PAY003',
                    employeeName: 'Elena Georgiou',
                    amount: '2,650.00',
                    status: 'pending',
                    bankAccount: 'GR16 0260 1230 0000 0001 2345 69',
                    processedAt: new Date().toISOString(),
                  },
                ].map(payment => (
                  <div
                    key={payment.paymentId}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <DollarSign className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium">{payment.employeeName}</p>
                        <p className="text-sm text-gray-500">
                          {payment.bankAccount}
                        </p>
                        <p className="text-xs text-gray-400">
                          {format(
                            new Date(payment.processedAt),
                            'MMM dd, yyyy HH:mm'
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-semibold">€{payment.amount}</span>
                      <Badge
                        variant={
                          payment.status === 'processed'
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {payment.status === 'processed' ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : (
                          <AlertCircle className="w-3 h-3 mr-1" />
                        )}
                        {payment.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
