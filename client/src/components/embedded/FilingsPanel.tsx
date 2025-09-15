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
  Send,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Filing {
  id: string;
  type: 'ERGANI' | 'APD' | 'ΦΜΥ';
  description: string;
  status: 'pending' | 'in_progress' | 'submitted' | 'acknowledged' | 'failed';
  dueDate: string;
  submittedAt?: string;
  acknowledgedAt?: string;
  records: number;
  errorMessage?: string;
}

interface FilingsPanelProps {
  accessToken: string;
  onEvent?: (event: string, data: any) => void;
  theme?: 'light' | 'dark';
  locale?: string;
}

export function FilingsPanel({
  accessToken,
  onEvent,
  theme = 'light',
  locale = 'en',
}: FilingsPanelProps) {
  const [filings, setFilings] = useState<Filing[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingIds, setSubmittingIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const filingTypeConfig = {
    ERGANI: {
      fullName: 'ΕΡΓΑΝΗ II',
      description: 'Ministry of Labor notifications',
      color: 'bg-blue-100 text-blue-800',
      urgentColor: 'bg-blue-600 text-white',
    },
    APD: {
      fullName: 'e-EFKA/APD',
      description: 'Social security contributions',
      color: 'bg-green-100 text-green-800',
      urgentColor: 'bg-green-600 text-white',
    },
    ΦΜΥ: {
      fullName: 'ΑΑΔΕ/ΦΜΥ',
      description: 'Tax authority filings',
      color: 'bg-purple-100 text-purple-800',
      urgentColor: 'bg-purple-600 text-white',
    },
  };

  const statusConfig = {
    pending: {
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      label: 'Pending',
    },
    in_progress: {
      icon: RefreshCw,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      label: 'Processing',
    },
    submitted: {
      icon: Send,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      label: 'Submitted',
    },
    acknowledged: {
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      label: 'Acknowledged',
    },
    failed: {
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      label: 'Failed',
    },
  };

  const loadFilings = async () => {
    setLoading(true);
    try {
      // Mock data for demo - in real implementation, this would fetch from API
      const mockFilings: Filing[] = [
        {
          id: 'filing-001',
          type: 'ERGANI',
          description: 'Employee Schedule Notifications',
          status: 'pending',
          dueDate: '2025-01-20',
          records: 45,
        },
        {
          id: 'filing-002',
          type: 'APD',
          description: 'Monthly Social Security Contributions',
          status: 'submitted',
          dueDate: '2025-01-25',
          records: 128,
          submittedAt: '2025-01-19T10:30:00Z',
        },
        {
          id: 'filing-003',
          type: 'ΦΜΥ',
          description: 'Payroll Tax Declarations',
          status: 'acknowledged',
          dueDate: '2025-01-30',
          records: 89,
          submittedAt: '2025-01-18T14:15:00Z',
          acknowledgedAt: '2025-01-19T09:20:00Z',
        },
        {
          id: 'filing-004',
          type: 'ERGANI',
          description: 'Overtime Notifications',
          status: 'failed',
          dueDate: '2025-01-19',
          records: 12,
          errorMessage: 'Invalid employee AMKA format in record #7',
        },
      ];

      setFilings(mockFilings);
      onEvent?.('filings.loaded', { count: mockFilings.length });
    } catch (error) {
      console.error('Load filings error:', error);
      onEvent?.('filings.failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const submitFiling = async (filingId: string) => {
    setSubmittingIds(prev => new Set(prev).add(filingId));

    try {
      // Mock API call - in real implementation, this would call the API
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API delay

      setFilings(prev =>
        prev.map(filing =>
          filing.id === filingId
            ? {
                ...filing,
                status: 'submitted',
                submittedAt: new Date().toISOString(),
              }
            : filing
        )
      );

      const filing = filings.find(f => f.id === filingId);

      toast({
        title: 'Filing Submitted',
        description: `${filing?.description} submitted successfully`,
      });

      onEvent?.('filing.submitted', {
        filingId,
        type: filing?.type,
        records: filing?.records,
      });
    } catch (error) {
      toast({
        title: 'Submission Failed',
        description: 'Failed to submit filing',
        variant: 'destructive',
      });
      onEvent?.('filing.failed', {
        filingId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setSubmittingIds(prev => {
        const updated = new Set(prev);
        updated.delete(filingId);
        return updated;
      });
    }
  };

  const getDaysUntilDue = (dueDate: string): number => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const isUrgent = (dueDate: string): boolean => {
    return getDaysUntilDue(dueDate) <= 2;
  };

  useEffect(() => {
    loadFilings();
  }, [accessToken]);

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Loading Filings...</CardTitle>
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

  const pendingCount = filings.filter(f => f.status === 'pending').length;
  const urgentCount = filings.filter(
    f => f.status === 'pending' && isUrgent(f.dueDate)
  ).length;
  const completedCount = filings.filter(
    f => f.status === 'acknowledged'
  ).length;

  return (
    <div className={`w-full ${theme === 'dark' ? 'dark' : ''}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Government Filings Status</span>
            <div className="flex space-x-2">
              {urgentCount > 0 && (
                <Badge variant="destructive">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {urgentCount} Urgent
                </Badge>
              )}
              <Badge variant={pendingCount > 0 ? 'default' : 'secondary'}>
                {pendingCount} Pending
              </Badge>
            </div>
          </CardTitle>
          <CardDescription>
            ΕΡΓΑΝΗ, e-EFKA/APD, and ΑΑΔΕ/ΦΜΥ filing status
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {pendingCount}
              </div>
              <div className="text-sm text-gray-500">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {filings.filter(f => f.status === 'submitted').length}
              </div>
              <div className="text-sm text-gray-500">Submitted</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {completedCount}
              </div>
              <div className="text-sm text-gray-500">Completed</div>
            </div>
          </div>

          {/* Filings List */}
          <div className="space-y-4">
            {filings.map(filing => {
              const statusInfo = statusConfig[filing.status];
              const typeConfig = filingTypeConfig[filing.type];
              const daysUntilDue = getDaysUntilDue(filing.dueDate);
              const urgent = isUrgent(filing.dueDate);
              const isSubmitting = submittingIds.has(filing.id);

              return (
                <Card
                  key={filing.id}
                  className={`transition-all ${urgent ? 'ring-2 ring-red-200' : ''}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`p-3 rounded-lg ${statusInfo.bgColor}`}>
                          <statusInfo.icon
                            className={`w-5 h-5 ${statusInfo.color} ${
                              filing.status === 'in_progress' || isSubmitting
                                ? 'animate-spin'
                                : ''
                            }`}
                          />
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <Badge
                              className={
                                urgent
                                  ? typeConfig.urgentColor
                                  : typeConfig.color
                              }
                            >
                              {filing.type}
                            </Badge>
                            <h3 className="font-semibold">
                              {filing.description}
                            </h3>
                          </div>

                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>{filing.records} records</span>
                            <span>
                              Due:{' '}
                              {new Date(filing.dueDate).toLocaleDateString()}
                            </span>
                            {daysUntilDue >= 0 && (
                              <span
                                className={
                                  urgent ? 'text-red-600 font-semibold' : ''
                                }
                              >
                                {daysUntilDue === 0
                                  ? 'Due today'
                                  : `${daysUntilDue} days`}
                              </span>
                            )}
                            {daysUntilDue < 0 && (
                              <span className="text-red-600 font-semibold">
                                {Math.abs(daysUntilDue)} days overdue
                              </span>
                            )}
                          </div>

                          {filing.submittedAt && (
                            <div className="text-xs text-gray-400 mt-1">
                              Submitted:{' '}
                              {new Date(filing.submittedAt).toLocaleString()}
                            </div>
                          )}

                          {filing.acknowledgedAt && (
                            <div className="text-xs text-gray-400 mt-1">
                              Acknowledged:{' '}
                              {new Date(filing.acknowledgedAt).toLocaleString()}
                            </div>
                          )}

                          {filing.errorMessage && (
                            <div className="text-sm text-red-600 mt-1 bg-red-50 p-2 rounded">
                              <AlertTriangle className="w-4 h-4 inline mr-1" />
                              {filing.errorMessage}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Badge className={statusInfo.color}>
                          {statusInfo.label}
                        </Badge>

                        {filing.status === 'pending' && (
                          <Button
                            onClick={() => submitFiling(filing.id)}
                            disabled={isSubmitting}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            {isSubmitting ? (
                              <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4 mr-1" />
                            )}
                            Submit
                          </Button>
                        )}

                        {filing.status === 'failed' && (
                          <Button
                            onClick={() => submitFiling(filing.id)}
                            disabled={isSubmitting}
                            size="sm"
                            variant="outline"
                            className="text-orange-600 border-orange-600 hover:bg-orange-50"
                          >
                            {isSubmitting ? (
                              <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4 mr-1" />
                            )}
                            Retry
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filings.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <p>No filings pending. All up to date!</p>
            </div>
          )}

          {/* Overall Progress */}
          {filings.length > 0 && (
            <div className="pt-4 border-t">
              <div className="flex justify-between text-sm text-gray-500 mb-2">
                <span>Overall Filing Progress</span>
                <span>
                  {Math.round((completedCount / filings.length) * 100)}%
                </span>
              </div>
              <Progress
                value={(completedCount / filings.length) * 100}
                className="h-2"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
