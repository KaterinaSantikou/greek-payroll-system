import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertTriangle, CheckCircle, Clock, UserX, Timer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Exception {
  id: string;
  type:
    | 'missed_punch'
    | 'overtime_approval'
    | 'late_arrival'
    | 'early_departure';
  employeeId: string;
  employeeName: string;
  date: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected' | 'resolved';
  severity: 'low' | 'medium' | 'high';
  details?: any;
}

interface ExceptionsReviewProps {
  accessToken: string;
  onEvent?: (event: string, data: any) => void;
  theme?: 'light' | 'dark';
  locale?: string;
  filters?: {
    types?: string[];
    dateRange?: { start: string; end: string };
    severity?: string[];
  };
}

export function ExceptionsReview({
  accessToken,
  onEvent,
  theme = 'light',
  locale = 'en',
  filters,
}: ExceptionsReviewProps) {
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const exceptionTypeConfig = {
    missed_punch: {
      label: 'Missed Punch',
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    overtime_approval: {
      label: 'Overtime Approval',
      icon: Timer,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    late_arrival: {
      label: 'Late Arrival',
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    early_departure: {
      label: 'Early Departure',
      icon: UserX,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  };

  const severityConfig = {
    low: { color: 'bg-green-100 text-green-800', label: 'Low' },
    medium: { color: 'bg-yellow-100 text-yellow-800', label: 'Medium' },
    high: { color: 'bg-red-100 text-red-800', label: 'High' },
  };

  const statusConfig = {
    pending: { color: 'bg-gray-100 text-gray-800', label: 'Pending' },
    approved: { color: 'bg-green-100 text-green-800', label: 'Approved' },
    rejected: { color: 'bg-red-100 text-red-800', label: 'Rejected' },
    resolved: { color: 'bg-blue-100 text-blue-800', label: 'Resolved' },
  };

  const loadExceptions = async () => {
    setLoading(true);
    try {
      // Mock data for demo - in real implementation, this would fetch from API
      const mockExceptions: Exception[] = [
        {
          id: 'ex-001',
          type: 'missed_punch',
          employeeId: 'emp-123',
          employeeName: 'John Smith',
          date: '2025-01-19',
          description: 'Missing clock-out punch at end of shift',
          status: 'pending',
          severity: 'medium',
        },
        {
          id: 'ex-002',
          type: 'overtime_approval',
          employeeId: 'emp-456',
          employeeName: 'Maria Garcia',
          date: '2025-01-18',
          description: '2.5 hours overtime requires manager approval',
          status: 'pending',
          severity: 'high',
          details: { hours: 2.5, rate: 'time_and_half' },
        },
        {
          id: 'ex-003',
          type: 'late_arrival',
          employeeId: 'emp-789',
          employeeName: 'David Chen',
          date: '2025-01-19',
          description: '15 minutes late arrival without notification',
          status: 'resolved',
          severity: 'low',
        },
        {
          id: 'ex-004',
          type: 'early_departure',
          employeeId: 'emp-321',
          employeeName: 'Sarah Wilson',
          date: '2025-01-18',
          description: 'Left 30 minutes early without approval',
          status: 'pending',
          severity: 'medium',
        },
      ];

      setExceptions(mockExceptions);
      onEvent?.('exceptions.loaded', { count: mockExceptions.length });
    } catch (error) {
      console.error('Load exceptions error:', error);
      onEvent?.('exceptions.failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const resolveException = async (
    exceptionId: string,
    action: 'approve' | 'reject' | 'resolve'
  ) => {
    setProcessingIds(prev => new Set(prev).add(exceptionId));

    try {
      // Mock API call - in real implementation, this would call the API
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API delay

      setExceptions(prev =>
        prev.map(ex =>
          ex.id === exceptionId
            ? {
                ...ex,
                status:
                  action === 'resolve'
                    ? 'resolved'
                    : action === 'approve'
                      ? 'approved'
                      : 'rejected',
              }
            : ex
        )
      );

      const exception = exceptions.find(ex => ex.id === exceptionId);

      toast({
        title: 'Exception Resolved',
        description: `${exception?.description} has been ${action}d`,
      });

      onEvent?.('exceptions.resolved', {
        exceptionId,
        action,
        employeeId: exception?.employeeId,
        type: exception?.type,
      });
    } catch (error) {
      toast({
        title: 'Resolution Failed',
        description: 'Failed to resolve exception',
        variant: 'destructive',
      });
      onEvent?.('exceptions.failed', {
        exceptionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setProcessingIds(prev => {
        const updated = new Set(prev);
        updated.delete(exceptionId);
        return updated;
      });
    }
  };

  useEffect(() => {
    loadExceptions();
  }, [accessToken, filters]);

  const pendingCount = exceptions.filter(ex => ex.status === 'pending').length;
  const highPriorityCount = exceptions.filter(
    ex => ex.severity === 'high' && ex.status === 'pending'
  ).length;

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Loading Exceptions...</CardTitle>
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

  return (
    <div className={`w-full ${theme === 'dark' ? 'dark' : ''}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Exceptions Review</span>
            <div className="flex space-x-2">
              {highPriorityCount > 0 && (
                <Badge variant="destructive">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {highPriorityCount} High Priority
                </Badge>
              )}
              <Badge variant={pendingCount > 0 ? 'default' : 'secondary'}>
                {pendingCount} Pending
              </Badge>
            </div>
          </CardTitle>
          <CardDescription>
            Review and resolve time & attendance exceptions
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            {Object.entries(
              exceptions.reduce(
                (acc, ex) => {
                  acc[ex.type] = (acc[ex.type] || 0) + 1;
                  return acc;
                },
                {} as Record<string, number>
              )
            ).map(([type, count]) => {
              const config =
                exceptionTypeConfig[type as keyof typeof exceptionTypeConfig];
              return (
                <div key={type} className="text-center">
                  <div
                    className={`inline-flex items-center justify-center w-8 h-8 rounded-full mb-2 ${config.bgColor}`}
                  >
                    <config.icon className={`w-4 h-4 ${config.color}`} />
                  </div>
                  <div className="text-lg font-bold">{count}</div>
                  <div className="text-xs text-gray-500">{config.label}</div>
                </div>
              );
            })}
          </div>

          {/* Exceptions Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exceptions.map(exception => {
                const typeConfig = exceptionTypeConfig[exception.type];
                const isProcessing = processingIds.has(exception.id);

                return (
                  <TableRow key={exception.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div
                          className={`p-2 rounded-full ${typeConfig.bgColor}`}
                        >
                          <typeConfig.icon
                            className={`w-4 h-4 ${typeConfig.color}`}
                          />
                        </div>
                        <span className="text-sm">{typeConfig.label}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {exception.employeeName}
                    </TableCell>
                    <TableCell>
                      {new Date(exception.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="text-sm">{exception.description}</div>
                      {exception.details && (
                        <div className="text-xs text-gray-500 mt-1">
                          {exception.type === 'overtime_approval' &&
                            `${exception.details.hours}h @ ${exception.details.rate}`}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={severityConfig[exception.severity].color}
                      >
                        {severityConfig[exception.severity].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusConfig[exception.status].color}>
                        {statusConfig[exception.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {exception.status === 'pending' && (
                        <div className="flex space-x-2">
                          {exception.type === 'overtime_approval' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  resolveException(exception.id, 'approve')
                                }
                                disabled={isProcessing}
                                className="text-green-600 border-green-600 hover:bg-green-50"
                              >
                                {isProcessing ? (
                                  <Clock className="w-3 h-3 animate-spin" />
                                ) : (
                                  <CheckCircle className="w-3 h-3" />
                                )}
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  resolveException(exception.id, 'reject')
                                }
                                disabled={isProcessing}
                                className="text-red-600 border-red-600 hover:bg-red-50"
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              resolveException(exception.id, 'resolve')
                            }
                            disabled={isProcessing}
                            className="text-blue-600 border-blue-600 hover:bg-blue-50"
                          >
                            {isProcessing ? (
                              <Clock className="w-3 h-3 animate-spin" />
                            ) : (
                              <CheckCircle className="w-3 h-3" />
                            )}
                            Resolve
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {exceptions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <p>No exceptions found. All clear!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
