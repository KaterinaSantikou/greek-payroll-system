import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  CreditCard,
  Download,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PaymentBatch {
  id: string;
  batchNumber: string;
  type: 'SEPA_SCT' | 'SEPA_SDD' | 'Instant_Payment';
  bank: 'Alpha' | 'Piraeus' | 'Eurobank' | 'NBG';
  status:
    | 'draft'
    | 'validated'
    | 'submitted'
    | 'processing'
    | 'completed'
    | 'failed'
    | 'rejected';
  paymentCount: number;
  totalAmount: string;
  currency: string;
  executionDate: string;
  createdAt: string;
  submittedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  acknowledgmentFile?: string;
}

interface PaymentsCockpitProps {
  accessToken: string;
  onEvent?: (event: string, data: any) => void;
  theme?: 'light' | 'dark';
  locale?: string;
}

export function PaymentsCockpit({
  accessToken,
  onEvent,
  theme = 'light',
  locale = 'en',
}: PaymentsCockpitProps) {
  const [batches, setBatches] = useState<PaymentBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const statusConfig = {
    draft: {
      icon: Clock,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      badge: 'bg-gray-100 text-gray-800',
      label: 'Draft',
    },
    validated: {
      icon: CheckCircle,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      badge: 'bg-blue-100 text-blue-800',
      label: 'Validated',
    },
    submitted: {
      icon: RefreshCw,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      badge: 'bg-indigo-100 text-indigo-800',
      label: 'Submitted',
    },
    processing: {
      icon: RefreshCw,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      badge: 'bg-orange-100 text-orange-800',
      label: 'Processing',
    },
    completed: {
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      badge: 'bg-green-100 text-green-800',
      label: 'Completed',
    },
    failed: {
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      badge: 'bg-red-100 text-red-800',
      label: 'Failed',
    },
    rejected: {
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      badge: 'bg-red-100 text-red-800',
      label: 'Rejected',
    },
  };

  const bankConfig = {
    Alpha: { color: 'bg-blue-100 text-blue-800', logo: '🏦' },
    Piraeus: { color: 'bg-yellow-100 text-yellow-800', logo: '🏛️' },
    Eurobank: { color: 'bg-purple-100 text-purple-800', logo: '🏬' },
    NBG: { color: 'bg-green-100 text-green-800', logo: '🏢' },
  };

  const typeConfig = {
    SEPA_SCT: {
      label: 'SEPA Credit Transfer',
      color: 'bg-blue-50 text-blue-700',
    },
    SEPA_SDD: {
      label: 'SEPA Direct Debit',
      color: 'bg-green-50 text-green-700',
    },
    Instant_Payment: {
      label: 'Instant Payment',
      color: 'bg-purple-50 text-purple-700',
    },
  };

  const loadBatches = async () => {
    setLoading(true);
    try {
      // Mock data for demo - in real implementation, this would fetch from API
      const mockBatches: PaymentBatch[] = [
        {
          id: 'batch-001',
          batchNumber: 'PAY-2025-001',
          type: 'SEPA_SCT',
          bank: 'Alpha',
          status: 'completed',
          paymentCount: 128,
          totalAmount: '45680.50',
          currency: 'EUR',
          executionDate: '2025-01-20',
          createdAt: '2025-01-19T09:00:00Z',
          submittedAt: '2025-01-19T10:30:00Z',
          completedAt: '2025-01-19T14:20:00Z',
        },
        {
          id: 'batch-002',
          batchNumber: 'PAY-2025-002',
          type: 'SEPA_SCT',
          bank: 'Piraeus',
          status: 'processing',
          paymentCount: 89,
          totalAmount: '32150.75',
          currency: 'EUR',
          executionDate: '2025-01-20',
          createdAt: '2025-01-19T11:15:00Z',
          submittedAt: '2025-01-19T11:45:00Z',
        },
        {
          id: 'batch-003',
          batchNumber: 'PAY-2025-003',
          type: 'Instant_Payment',
          bank: 'NBG',
          status: 'validated',
          paymentCount: 15,
          totalAmount: '8750.25',
          currency: 'EUR',
          executionDate: '2025-01-19',
          createdAt: '2025-01-19T13:30:00Z',
        },
        {
          id: 'batch-004',
          batchNumber: 'PAY-2025-004',
          type: 'SEPA_SCT',
          bank: 'Eurobank',
          status: 'failed',
          paymentCount: 67,
          totalAmount: '23480.00',
          currency: 'EUR',
          executionDate: '2025-01-20',
          createdAt: '2025-01-19T08:45:00Z',
          submittedAt: '2025-01-19T09:15:00Z',
          errorMessage: 'Invalid IBAN format in payment #34',
        },
      ];

      setBatches(mockBatches);
      onEvent?.('payments.loaded', { count: mockBatches.length });
    } catch (error) {
      console.error('Load batches error:', error);
      onEvent?.('payments.failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const submitBatch = async (batchId: string) => {
    setProcessingIds(prev => new Set(prev).add(batchId));

    try {
      // Mock API call - in real implementation, this would call the API
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API delay

      setBatches(prev =>
        prev.map(batch =>
          batch.id === batchId
            ? {
                ...batch,
                status: 'submitted',
                submittedAt: new Date().toISOString(),
              }
            : batch
        )
      );

      const batch = batches.find(b => b.id === batchId);

      toast({
        title: 'Batch Submitted',
        description: `Payment batch ${batch?.batchNumber} submitted to ${batch?.bank}`,
      });

      onEvent?.('payment.sent', {
        batchId,
        batchNumber: batch?.batchNumber,
        bank: batch?.bank,
        amount: batch?.totalAmount,
        paymentCount: batch?.paymentCount,
      });
    } catch (error) {
      toast({
        title: 'Submission Failed',
        description: 'Failed to submit payment batch',
        variant: 'destructive',
      });
      onEvent?.('payment.failed', {
        batchId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setProcessingIds(prev => {
        const updated = new Set(prev);
        updated.delete(batchId);
        return updated;
      });
    }
  };

  const downloadAcknowledgment = async (batchId: string) => {
    // Mock download - in real implementation, this would download the actual file
    toast({
      title: 'Download Started',
      description: 'Bank acknowledgment file download started',
    });
  };

  const refreshBatch = async (batchId: string) => {
    setProcessingIds(prev => new Set(prev).add(batchId));

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Mock status update
      setBatches(prev =>
        prev.map(batch =>
          batch.id === batchId && batch.status === 'processing'
            ? {
                ...batch,
                status: 'completed',
                completedAt: new Date().toISOString(),
              }
            : batch
        )
      );

      toast({
        title: 'Status Updated',
        description: 'Payment batch status refreshed',
      });
    } catch (error) {
      toast({
        title: 'Refresh Failed',
        description: 'Failed to refresh batch status',
        variant: 'destructive',
      });
    } finally {
      setProcessingIds(prev => {
        const updated = new Set(prev);
        updated.delete(batchId);
        return updated;
      });
    }
  };

  useEffect(() => {
    loadBatches();
  }, [accessToken]);

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Loading Payment Batches...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalAmount = batches.reduce(
    (sum, batch) => sum + parseFloat(batch.totalAmount),
    0
  );
  const totalPayments = batches.reduce(
    (sum, batch) => sum + batch.paymentCount,
    0
  );
  const completedBatches = batches.filter(b => b.status === 'completed').length;
  const processingBatches = batches.filter(b =>
    ['submitted', 'processing'].includes(b.status)
  ).length;

  return (
    <div className={`w-full ${theme === 'dark' ? 'dark' : ''}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Payments Cockpit</span>
            <div className="flex space-x-2">
              {processingBatches > 0 && (
                <Badge variant="default">
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  {processingBatches} Processing
                </Badge>
              )}
              <Badge variant="secondary">{batches.length} Total Batches</Badge>
            </div>
          </CardTitle>
          <CardDescription>
            SEPA payment batch status and bank connectivity
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {totalPayments}
              </div>
              <div className="text-sm text-gray-500">Total Payments</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                €{totalAmount.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">Total Amount</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {completedBatches}
              </div>
              <div className="text-sm text-gray-500">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {processingBatches}
              </div>
              <div className="text-sm text-gray-500">In Progress</div>
            </div>
          </div>

          {/* Payment Batches */}
          <div className="space-y-4">
            {batches.map(batch => {
              const statusInfo = statusConfig[batch.status];
              const bankInfo = bankConfig[batch.bank];
              const typeInfo = typeConfig[batch.type];
              const isProcessing = processingIds.has(batch.id);

              return (
                <Card key={batch.id} className="transition-all hover:shadow-md">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <div className={`p-3 rounded-lg ${statusInfo.bgColor}`}>
                          <statusInfo.icon
                            className={`w-6 h-6 ${statusInfo.color} ${
                              ['processing', 'submitted'].includes(
                                batch.status
                              ) || isProcessing
                                ? 'animate-spin'
                                : ''
                            }`}
                          />
                        </div>

                        <div>
                          <h3 className="text-lg font-semibold">
                            {batch.batchNumber}
                          </h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge className={bankInfo.color}>
                              {bankInfo.logo} {batch.bank}
                            </Badge>
                            <Badge variant="outline" className={typeInfo.color}>
                              {typeInfo.label}
                            </Badge>
                            <Badge className={statusInfo.badge}>
                              {statusInfo.label}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">
                          €{parseFloat(batch.totalAmount).toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          {batch.paymentCount} payments
                        </div>
                      </div>
                    </div>

                    {/* Batch Details */}
                    <div className="grid grid-cols-3 gap-4 text-sm text-gray-600 mb-4">
                      <div>
                        <span className="font-medium">Execution Date:</span>
                        <div>
                          {new Date(batch.executionDate).toLocaleDateString()}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">Created:</span>
                        <div>{new Date(batch.createdAt).toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="font-medium">Currency:</span>
                        <div>{batch.currency}</div>
                      </div>
                    </div>

                    {batch.submittedAt && (
                      <div className="text-sm text-gray-500 mb-2">
                        <span className="font-medium">Submitted:</span>{' '}
                        {new Date(batch.submittedAt).toLocaleString()}
                      </div>
                    )}

                    {batch.completedAt && (
                      <div className="text-sm text-gray-500 mb-2">
                        <span className="font-medium">Completed:</span>{' '}
                        {new Date(batch.completedAt).toLocaleString()}
                      </div>
                    )}

                    {batch.errorMessage && (
                      <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg mb-4">
                        <AlertTriangle className="w-4 h-4 inline mr-1" />
                        {batch.errorMessage}
                      </div>
                    )}

                    {/* Progress Bar for Processing */}
                    {['submitted', 'processing'].includes(batch.status) && (
                      <div className="mb-4">
                        <Progress
                          value={batch.status === 'submitted' ? 30 : 70}
                          className="h-2"
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          {batch.status === 'submitted'
                            ? 'Bank validation in progress...'
                            : 'Processing payments...'}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-between items-center">
                      <div className="flex space-x-2">
                        {batch.status === 'validated' && (
                          <Button
                            onClick={() => submitBatch(batch.id)}
                            disabled={isProcessing}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            {isProcessing ? (
                              <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <CreditCard className="w-4 h-4 mr-1" />
                            )}
                            Submit to Bank
                          </Button>
                        )}

                        {batch.status === 'failed' && (
                          <Button
                            onClick={() => submitBatch(batch.id)}
                            disabled={isProcessing}
                            size="sm"
                            variant="outline"
                            className="text-orange-600 border-orange-600 hover:bg-orange-50"
                          >
                            {isProcessing ? (
                              <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4 mr-1" />
                            )}
                            Retry
                          </Button>
                        )}

                        {['submitted', 'processing'].includes(batch.status) && (
                          <Button
                            onClick={() => refreshBatch(batch.id)}
                            disabled={isProcessing}
                            size="sm"
                            variant="outline"
                          >
                            {isProcessing ? (
                              <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4 mr-1" />
                            )}
                            Refresh
                          </Button>
                        )}
                      </div>

                      {batch.status === 'completed' && (
                        <Button
                          onClick={() => downloadAcknowledgment(batch.id)}
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-600 hover:bg-green-50"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download Receipt
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {batches.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No payment batches found.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
