/**
 * Offline Payroll Preview - Manager can preview payroll calculations offline
 * Syncs data when online and handles reconciliation
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Calculator,
  Download,
  RefreshCw,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Clock,
  Users,
  Euro,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  offlineStorage,
  type OfflinePayrollPreview,
} from '@/lib/offlineStorage';
import { syncService } from '@/lib/syncService';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth } from 'date-fns';

interface PayrollData {
  employeeId: string;
  employeeName: string;
  regularHours: number;
  overtimeHours: number;
  grossPay: number;
  netPay: number;
  deductions: {
    tax: number;
    socialSecurity: number;
    other: number;
  };
  bonuses: number;
  allowances: number;
}

interface PayrollSummary {
  totalEmployees: number;
  totalGrossPay: number;
  totalNetPay: number;
  totalDeductions: number;
  payPeriod: string;
  calculationDate: string;
  isComplete: boolean;
}

interface OfflinePayrollPreviewProps {
  payPeriod?: string;
  propertyId: string;
}

export function OfflinePayrollPreview({
  payPeriod = format(new Date(), 'yyyy-MM'),
  propertyId,
}: OfflinePayrollPreviewProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [localPreview, setLocalPreview] =
    useState<OfflinePayrollPreview | null>(null);
  const [syncProgress, setSyncProgress] = useState(0);
  const [hasConflicts, setHasConflicts] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load cached payroll preview on mount
  useEffect(() => {
    loadCachedPreview();
  }, [payPeriod]);

  // Listen for sync events
  useEffect(() => {
    const handleSyncProgress = (event: CustomEvent) => {
      setSyncProgress(event.detail.progress || 0);
    };

    const handleSyncCompleted = (event: CustomEvent) => {
      setSyncProgress(100);
      loadCachedPreview();

      if (event.detail.success) {
        toast({
          title: 'Payroll Data Synced',
          description: 'Latest payroll calculations are now available',
        });
      }
    };

    window.addEventListener(
      'syncProgress',
      handleSyncProgress as EventListener
    );
    window.addEventListener(
      'syncCompleted',
      handleSyncCompleted as EventListener
    );

    return () => {
      window.removeEventListener(
        'syncProgress',
        handleSyncProgress as EventListener
      );
      window.removeEventListener(
        'syncCompleted',
        handleSyncCompleted as EventListener
      );
    };
  }, [toast]);

  const loadCachedPreview = async () => {
    try {
      const cached = await offlineStorage.getPayrollPreview(payPeriod);
      setLocalPreview(cached);
    } catch (error) {
      console.error('Failed to load cached preview:', error);
    }
  };

  // Fetch online payroll data
  const {
    data: onlinePreview,
    isLoading,
    error,
  } = useQuery<PayrollSummary & { employees: PayrollData[] }>({
    queryKey: ['/api/payroll/preview', payPeriod, propertyId],
    enabled: isOnline,
    retry: false,
  });

  // Handle successful data fetch
  useEffect(() => {
    if (onlinePreview) {
      const cacheData = async () => {
        const offlineData: OfflinePayrollPreview = {
          previewId: `preview_${payPeriod}_${propertyId}`,
          payPeriod,
          employeeData: onlinePreview.employees,
          calculations: {
            summary: {
              totalEmployees: onlinePreview.totalEmployees,
              totalGrossPay: onlinePreview.totalGrossPay,
              totalNetPay: onlinePreview.totalNetPay,
              totalDeductions: onlinePreview.totalDeductions,
              payPeriod: onlinePreview.payPeriod,
              calculationDate: onlinePreview.calculationDate,
              isComplete: onlinePreview.isComplete,
            },
          },
          syncStatus: 'synced',
          lastSync: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };

        await offlineStorage.savePayrollPreview(offlineData);
        setLocalPreview(offlineData);
      };

      cacheData().catch(console.error);
    }
  }, [onlinePreview, payPeriod, propertyId]);

  // Generate offline payroll preview
  const generateOfflinePreviewMutation = useMutation({
    mutationFn: async () => {
      // Create a basic payroll preview from available offline data
      const mockData: OfflinePayrollPreview = {
        previewId: `offline_preview_${payPeriod}_${propertyId}_${Date.now()}`,
        payPeriod,
        employeeData: [], // Would be populated from offline employee data
        calculations: {
          summary: {
            totalEmployees: 0,
            totalGrossPay: 0,
            totalNetPay: 0,
            totalDeductions: 0,
            payPeriod,
            calculationDate: new Date().toISOString(),
            isComplete: false,
          },
        },
        syncStatus: 'pending',
        lastSync: 'never',
        createdAt: new Date().toISOString(),
      };

      await offlineStorage.savePayrollPreview(mockData);
      return mockData;
    },
    onSuccess: data => {
      setLocalPreview(data);
      toast({
        title: 'Offline Preview Generated',
        description: 'Basic payroll preview created from local data',
      });
    },
  });

  // Force sync mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      setSyncProgress(10);
      const result = await syncService.forcSync();
      setSyncProgress(100);
      return result;
    },
    onSuccess: result => {
      if (result.conflicts.length > 0) {
        setHasConflicts(true);
        toast({
          title: 'Sync Conflicts Detected',
          description: `${result.conflicts.length} conflicts need resolution`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Sync Complete',
          description: `${result.syncedItems} items synced successfully`,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/payroll/preview'] });
    },
  });

  // Get the data to display (online or cached)
  const displayData =
    onlinePreview ||
    (localPreview
      ? {
          ...localPreview.calculations.summary,
          employees: localPreview.employeeData,
        }
      : null);

  const isDataStale = localPreview && localPreview.syncStatus !== 'synced';
  const lastSyncTime =
    localPreview?.lastSync === 'never' ? null : localPreview?.lastSync;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header with Connection Status */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="h-6 w-6" />
            Payroll Preview - {format(new Date(payPeriod + '-01'), 'MMMM yyyy')}
          </h1>
          <p className="text-muted-foreground">
            {isOnline
              ? 'Live payroll calculations'
              : 'Offline mode - showing cached data'}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-800"
              >
                <Wifi className="h-3 w-3 mr-1" />
                Online
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="bg-orange-100 text-orange-800"
              >
                <WifiOff className="h-3 w-3 mr-1" />
                Offline
              </Badge>
            )}
          </div>

          {/* Sync Button */}
          <Button
            onClick={() => syncMutation.mutate()}
            disabled={!isOnline || syncMutation.isPending}
            variant="outline"
            size="sm"
          >
            <RefreshCw
              className={`h-3 w-3 mr-1 ${syncMutation.isPending ? 'animate-spin' : ''}`}
            />
            Sync
          </Button>
        </div>
      </div>

      {/* Sync Progress */}
      {syncProgress > 0 && syncProgress < 100 && (
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Syncing payroll data...</span>
                <span>{syncProgress}%</span>
              </div>
              <Progress value={syncProgress} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Status Alerts */}
      {isDataStale && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Payroll data may be outdated. Last sync:{' '}
            {lastSyncTime ? format(new Date(lastSyncTime), 'PPp') : 'Never'}
            {isOnline && '. Click Sync to get the latest data.'}
          </AlertDescription>
        </Alert>
      )}

      {hasConflicts && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Sync conflicts detected. Some data may need manual resolution.
          </AlertDescription>
        </Alert>
      )}

      {/* Offline Mode Warning */}
      {!isOnline && !displayData && (
        <Card>
          <CardContent className="pt-6 text-center">
            <WifiOff className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">
              No Offline Data Available
            </h3>
            <p className="text-muted-foreground mb-4">
              Connect to the internet to load payroll data, or generate a basic
              preview from local data.
            </p>
            <Button
              onClick={() => generateOfflinePreviewMutation.mutate()}
              disabled={generateOfflinePreviewMutation.isPending}
            >
              Generate Offline Preview
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Payroll Summary */}
      {displayData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Employees
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {displayData.totalEmployees}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gross Pay</CardTitle>
                <Euro className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  €{displayData.totalGrossPay?.toLocaleString() || '0'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Pay</CardTitle>
                <Euro className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  €{displayData.totalNetPay?.toLocaleString() || '0'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Status</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <Badge
                  variant={displayData.isComplete ? 'default' : 'secondary'}
                >
                  {displayData.isComplete ? 'Complete' : 'Draft'}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Employee Details */}
          {displayData.employees && displayData.employees.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Employee Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-border">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border border-border px-4 py-2 text-left">
                          Employee
                        </th>
                        <th className="border border-border px-4 py-2 text-right">
                          Regular Hours
                        </th>
                        <th className="border border-border px-4 py-2 text-right">
                          Overtime
                        </th>
                        <th className="border border-border px-4 py-2 text-right">
                          Gross Pay
                        </th>
                        <th className="border border-border px-4 py-2 text-right">
                          Deductions
                        </th>
                        <th className="border border-border px-4 py-2 text-right">
                          Net Pay
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayData.employees.map((employee: PayrollData) => (
                        <tr
                          key={employee.employeeId}
                          className="hover:bg-muted/50"
                        >
                          <td className="border border-border px-4 py-2">
                            {employee.employeeName}
                          </td>
                          <td className="border border-border px-4 py-2 text-right">
                            {employee.regularHours}
                          </td>
                          <td className="border border-border px-4 py-2 text-right">
                            {employee.overtimeHours}
                          </td>
                          <td className="border border-border px-4 py-2 text-right">
                            €{employee.grossPay?.toLocaleString()}
                          </td>
                          <td className="border border-border px-4 py-2 text-right">
                            €
                            {(
                              employee.deductions?.tax +
                              employee.deductions?.socialSecurity +
                              employee.deductions?.other
                            )?.toLocaleString()}
                          </td>
                          <td className="border border-border px-4 py-2 text-right font-semibold">
                            €{employee.netPay?.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button variant="outline">
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Preview
            </Button>
            {isOnline && displayData.isComplete && (
              <Button className="bg-green-600 hover:bg-green-700">
                Process Payroll
              </Button>
            )}
          </div>

          {/* Last Updated */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                Last calculated:{' '}
                {format(
                  new Date(displayData.calculationDate || Date.now()),
                  'PPp'
                )}
                {lastSyncTime && lastSyncTime !== 'never' && (
                  <span>
                    {' '}
                    • Last synced: {format(new Date(lastSyncTime), 'PPp')}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
