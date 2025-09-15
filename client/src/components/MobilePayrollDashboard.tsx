/**
 * Mobile-Optimized Payroll Dashboard
 * Greek payroll management optimized for mobile devices
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { usePWA, GreekNotifications } from '@/hooks/usePWA';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Users,
  Clock,
  Calculator,
  FileCheck,
  CreditCard,
  Bell,
  Wifi,
  WifiOff,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Play,
  Download,
  ThumbsUp,
  ThumbsDown,
  Eye,
  MessageSquare,
  Euro,
  Calendar,
  Zap,
  Shield,
} from 'lucide-react';

interface MobilePayrollDashboardProps {
  locale?: 'en' | 'el';
}

interface PayrollApprovalItem {
  id: string;
  period: string;
  employeeCount: number;
  grossTotal: number;
  netTotal: number;
  status: 'pending_approval' | 'approved' | 'rejected' | 'processing';
  submittedBy: string;
  submittedAt: string;
  details: {
    overtimeHours: number;
    bonuses: number;
    deductions: number;
    taxTotal: number;
    efkaContributions: number;
  };
  urgency: 'high' | 'medium' | 'low';
  complianceChecks: {
    ergani: boolean;
    efka: boolean;
    fmy: boolean;
  };
}

export default function MobilePayrollDashboard({
  locale = 'en',
}: MobilePayrollDashboardProps) {
  const [pwaState, pwaActions] = usePWA();
  const [currentPayroll, setCurrentPayroll] = useState<any>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] =
    useState<PayrollApprovalItem | null>(null);
  const [approvalComment, setApprovalComment] = useState('');
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const translations = {
    en: {
      title: 'Payroll Dashboard',
      subtitle: 'Quick payroll approvals',
      status: {
        online: 'Online',
        offline: 'Offline Mode',
      },
      approvals: {
        title: 'Pending Approvals',
        noApprovals: 'All payroll runs approved!',
        quickApprove: 'Quick Approve',
        quickReject: 'Quick Reject',
        reviewDetails: 'Review Details',
        approve: 'Approve',
        reject: 'Reject',
        addComment: 'Add Comment',
        comment: 'Comment (Optional)',
        confirmApproval: 'Confirm Approval',
        confirmRejection: 'Confirm Rejection',
        processing: 'Processing...',
        approved: 'Approved',
        rejected: 'Rejected',
        pending: 'Pending',
      },
      quickActions: {
        title: 'Quick Actions',
        runPayroll: 'Run Payroll',
        viewEmployees: 'View Employees',
        checkCompliance: 'Check Compliance',
        timeReview: 'Review Time',
      },
      currentPeriod: {
        title: 'January 2025 Payroll',
        employees: 'employees',
        grossPay: 'Gross Pay',
        netPay: 'Net Pay',
        status: 'Status',
        progress: 'Progress',
      },
      compliance: {
        title: 'Greek Compliance',
        ergani: 'ERGANI II',
        efka: 'e-EFKA',
        apd: 'APD Forms',
        fmy: 'FMY Filing',
      },
      details: {
        overtime: 'Overtime Hours',
        bonuses: 'Bonuses',
        deductions: 'Deductions',
        taxes: 'Taxes',
        efkaContrib: 'EFKA Contributions',
        submittedBy: 'Submitted by',
        submittedAt: 'Submitted at',
      },
      notifications: {
        setup: 'Setup Notifications',
        enabled: 'Notifications Active',
        approvalSuccess: 'Payroll approved successfully',
        rejectionSuccess: 'Payroll rejected successfully',
        approvalError: 'Failed to approve payroll',
        rejectionError: 'Failed to reject payroll',
      },
    },
    el: {
      title: 'Πίνακας Μισθοδοσίας',
      subtitle: 'Γρήγορες εγκρίσεις μισθοδοσίας',
      status: {
        online: 'Συνδεδεμένος',
        offline: 'Λειτουργία Offline',
      },
      approvals: {
        title: 'Εκκρεμείς Εγκρίσεις',
        noApprovals: 'Όλες οι μισθοδοσίες εγκρίθηκαν!',
        quickApprove: 'Γρήγορη Έγκριση',
        quickReject: 'Γρήγορη Απόρριψη',
        reviewDetails: 'Ανασκόπηση Λεπτομερειών',
        approve: 'Έγκριση',
        reject: 'Απόρριψη',
        addComment: 'Προσθήκη Σχολίου',
        comment: 'Σχόλιο (Προαιρετικό)',
        confirmApproval: 'Επιβεβαίωση Έγκρισης',
        confirmRejection: 'Επιβεβαίωση Απόρριψης',
        processing: 'Επεξεργασία...',
        approved: 'Εγκρίθηκε',
        rejected: 'Απορρίφθηκε',
        pending: 'Εκκρεμεί',
      },
      quickActions: {
        title: 'Γρήγορες Ενέργειες',
        runPayroll: 'Εκτέλεση Μισθοδοσίας',
        viewEmployees: 'Προβολή Υπαλλήλων',
        checkCompliance: 'Έλεγχος Συμμόρφωσης',
        timeReview: 'Έλεγχος Χρόνου',
      },
      currentPeriod: {
        title: 'Μισθοδοσία Ιανουαρίου 2025',
        employees: 'υπάλληλοι',
        grossPay: 'Μικτές Αποδοχές',
        netPay: 'Καθαρές Αποδοχές',
        status: 'Κατάσταση',
        progress: 'Πρόοδος',
      },
      compliance: {
        title: 'Ελληνική Συμμόρφωση',
        ergani: 'ΕΡΓΑΝΗ ΙΙ',
        efka: 'e-ΕΦΚΑ',
        apd: 'Έντυπα ΑΠΔ',
        fmy: 'Υποβολή ΦΜΥ',
      },
      details: {
        overtime: 'Ώρες Υπερωριών',
        bonuses: 'Μπόνους',
        deductions: 'Κρατήσεις',
        taxes: 'Φόροι',
        efkaContrib: 'Εισφορές ΕΦΚΑ',
        submittedBy: 'Υποβλήθηκε από',
        submittedAt: 'Υποβλήθηκε στις',
      },
      notifications: {
        setup: 'Ρύθμιση Ειδοποιήσεων',
        enabled: 'Ειδοποιήσεις Ενεργές',
        approvalSuccess: 'Η μισθοδοσία εγκρίθηκε επιτυχώς',
        rejectionSuccess: 'Η μισθοδοσία απορρίφθηκε επιτυχώς',
        approvalError: 'Αποτυχία έγκρισης μισθοδοσίας',
        rejectionError: 'Αποτυχία απόρριψης μισθοδοσίας',
      },
    },
  };

  const t = translations[locale];

  // Fetch pending payroll approvals
  const { data: pendingApprovals = [], isLoading: approvalsLoading } = useQuery(
    {
      queryKey: ['/api/payroll/pending-approvals'],
      refetchInterval: 30000, // Refresh every 30 seconds
    }
  );

  // Approval mutation
  const approvalMutation = useMutation({
    mutationFn: async ({
      approvalId,
      action,
      comment,
    }: {
      approvalId: string;
      action: 'approve' | 'reject';
      comment?: string;
    }) => {
      return apiRequest(`/api/payroll/approvals/${approvalId}`, {
        method: 'POST',
        body: { action, comment },
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['/api/payroll/pending-approvals'],
      });
      setShowApprovalModal(false);
      setApprovalComment('');
      setSelectedApproval(null);

      toast({
        title:
          variables.action === 'approve'
            ? t.notifications.approvalSuccess
            : t.notifications.rejectionSuccess,
        variant: 'default',
      });
    },
    onError: (error, variables) => {
      toast({
        title:
          variables.action === 'approve'
            ? t.notifications.approvalError
            : t.notifications.rejectionError,
        variant: 'destructive',
      });
    },
  });

  useEffect(() => {
    // Load dashboard data
    loadDashboardData();

    // Setup offline data sync
    if (pwaState.isOffline) {
      loadOfflineData();
    }
  }, [pwaState.isOffline]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Simulate API calls (replace with real API)
      const [payrollResponse, activityResponse] = await Promise.all([
        fetch('/api/payroll/current-period').catch(() => null),
        fetch('/api/activity/recent').catch(() => null),
      ]);

      if (payrollResponse?.ok) {
        const payrollData = await payrollResponse.json();
        setCurrentPayroll(payrollData);
      }

      if (activityResponse?.ok) {
        const activityData = await activityResponse.json();
        setRecentActivity(activityData.activities || []);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOfflineData = () => {
    // Load cached data for offline mode
    const cachedPayroll = {
      period: 'January 2025',
      status: 'draft',
      employeeCount: 25,
      grossTotal: 28450,
      netTotal: 19432,
      progress: 75,
      offline: true,
    };

    const cachedActivity = [
      {
        id: 1,
        type: 'payroll_calculation',
        description:
          locale === 'en'
            ? 'Payroll calculated for 25 employees'
            : 'Υπολογίστηκε μισθοδοσία για 25 υπαλλήλους',
        time: '2 hours ago',
        offline: true,
      },
      {
        id: 2,
        type: 'compliance_check',
        description:
          locale === 'en'
            ? 'ERGANI II validation completed'
            : 'Επικύρωση ΕΡΓΑΝΗ ΙΙ ολοκληρώθηκε',
        time: '4 hours ago',
        offline: true,
      },
    ];

    setCurrentPayroll(cachedPayroll);
    setRecentActivity(cachedActivity);
    setLoading(false);
  };

  const handleNotificationSetup = async () => {
    const success = await pwaActions.subscribeToGreekPayrollNotifications();

    if (success) {
      // Schedule some test notifications
      await GreekNotifications.scheduleErganiReminders([
        {
          date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          type: 'Monthly Filing',
        },
      ]);
    }
  };

  const handleQuickApproval = (
    approval: PayrollApprovalItem,
    action: 'approve' | 'reject'
  ) => {
    setSelectedApproval(approval);
    setShowApprovalModal(true);
  };

  const confirmApproval = (action: 'approve' | 'reject') => {
    if (selectedApproval) {
      approvalMutation.mutate({
        approvalId: selectedApproval.id,
        action,
        comment: approvalComment,
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale === 'el' ? 'el-GR' : 'en-US', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(
      locale === 'el' ? 'el-GR' : 'en-US',
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }
    );
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">
            {locale === 'en' ? 'Loading dashboard...' : 'Φόρτωση πίνακα...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{t.title}</h1>
            <p className="text-sm text-gray-600">{t.subtitle}</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Connection status */}
            <Badge
              variant={pwaState.isOffline ? 'destructive' : 'default'}
              className="text-xs"
            >
              {pwaState.isOffline ? (
                <>
                  <WifiOff className="h-3 w-3 mr-1" />
                  {t.status.offline}
                </>
              ) : (
                <>
                  <Wifi className="h-3 w-3 mr-1" />
                  {t.status.online}
                </>
              )}
            </Badge>

            {/* Notification setup */}
            {pwaState.notificationPermission === 'granted' ? (
              <Badge variant="secondary" className="text-xs">
                <Bell className="h-3 w-3 mr-1" />
                {t.notifications.enabled}
              </Badge>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={handleNotificationSetup}
              >
                <Bell className="h-3 w-3 mr-1" />
                {t.notifications.setup}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Pending Approvals - Priority Section */}
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-orange-600" />
                {t.approvals.title}
              </CardTitle>
              <Badge variant="secondary">{pendingApprovals.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {approvalsLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin h-6 w-6 border-2 border-orange-600 border-t-transparent rounded-full mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  {t.approvals.processing}
                </p>
              </div>
            ) : pendingApprovals.length === 0 ? (
              <div className="text-center py-4">
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-green-700">
                  {t.approvals.noApprovals}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingApprovals
                  .slice(0, 3)
                  .map((approval: PayrollApprovalItem) => (
                    <div
                      key={approval.id}
                      className="bg-white dark:bg-gray-800 rounded-lg p-4 border"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              className={getUrgencyColor(approval.urgency)}
                            >
                              {approval.urgency.toUpperCase()}
                            </Badge>
                            <Badge variant="outline">{approval.period}</Badge>
                          </div>
                          <h3 className="font-medium text-sm">
                            {approval.employeeCount} {t.currentPeriod.employees}
                          </h3>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {t.details.submittedBy} {approval.submittedBy}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-lg">
                            {formatCurrency(approval.netTotal)}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {formatCurrency(approval.grossTotal)}{' '}
                            {t.currentPeriod.grossPay.toLowerCase()}
                          </p>
                        </div>
                      </div>

                      {/* Compliance Indicators */}
                      <div className="flex items-center gap-4 mb-3 text-xs">
                        <div className="flex items-center gap-1">
                          <Shield
                            className={`h-3 w-3 ${approval.complianceChecks.ergani ? 'text-green-600' : 'text-red-600'}`}
                          />
                          <span
                            className={
                              approval.complianceChecks.ergani
                                ? 'text-green-700'
                                : 'text-red-700'
                            }
                          >
                            {t.compliance.ergani}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Shield
                            className={`h-3 w-3 ${approval.complianceChecks.efka ? 'text-green-600' : 'text-red-600'}`}
                          />
                          <span
                            className={
                              approval.complianceChecks.efka
                                ? 'text-green-700'
                                : 'text-red-700'
                            }
                          >
                            {t.compliance.efka}
                          </span>
                        </div>
                      </div>

                      {/* Quick Action Buttons */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white h-10"
                          onClick={() =>
                            handleQuickApproval(approval, 'approve')
                          }
                          disabled={approvalMutation.isPending}
                        >
                          <ThumbsUp className="h-4 w-4 mr-1" />
                          {t.approvals.quickApprove}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1 h-10"
                          onClick={() =>
                            handleQuickApproval(approval, 'reject')
                          }
                          disabled={approvalMutation.isPending}
                        >
                          <ThumbsDown className="h-4 w-4 mr-1" />
                          {t.approvals.quickReject}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="px-3 h-10"
                          onClick={() => {
                            setSelectedApproval(approval);
                            // Navigate to detailed view - placeholder for now
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                {pendingApprovals.length > 3 && (
                  <Button variant="outline" className="w-full">
                    View {pendingApprovals.length - 3} more approvals
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t.quickActions.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button className="h-20 flex-col gap-2" variant="outline">
                <Play className="h-5 w-5" />
                <span className="text-xs text-center">
                  {t.quickActions.runPayroll}
                </span>
              </Button>
              <Button className="h-20 flex-col gap-2" variant="outline">
                <Users className="h-5 w-5" />
                <span className="text-xs text-center">
                  {t.quickActions.viewEmployees}
                </span>
              </Button>
              <Button className="h-20 flex-col gap-2" variant="outline">
                <FileCheck className="h-5 w-5" />
                <span className="text-xs text-center">
                  {t.quickActions.checkCompliance}
                </span>
              </Button>
              <Button className="h-20 flex-col gap-2" variant="outline">
                <Clock className="h-5 w-5" />
                <span className="text-xs text-center">
                  {t.quickActions.timeReview}
                </span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Current Payroll Period */}
        {currentPayroll && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {t.currentPeriod.title}
                </CardTitle>
                {currentPayroll.offline && (
                  <Badge variant="outline" className="text-xs">
                    Cached
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {currentPayroll.employeeCount} {t.currentPeriod.employees}
                </span>
                <Badge
                  variant={
                    currentPayroll.status === 'complete'
                      ? 'default'
                      : 'secondary'
                  }
                >
                  {currentPayroll.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600 mb-1">
                    {t.currentPeriod.grossPay}
                  </p>
                  <p className="text-lg font-semibold">
                    €{currentPayroll.grossTotal?.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">
                    {t.currentPeriod.netPay}
                  </p>
                  <p className="text-lg font-semibold">
                    €{currentPayroll.netTotal?.toLocaleString()}
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">
                    {t.currentPeriod.progress}
                  </span>
                  <span className="text-sm font-medium">
                    {currentPayroll.progress}%
                  </span>
                </div>
                <Progress value={currentPayroll.progress} className="h-2" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Greek Compliance Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t.compliance.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">{t.compliance.ergani}</span>
                </div>
                <Badge className="bg-green-100 text-green-800 text-xs">
                  Ready
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">{t.compliance.efka}</span>
                </div>
                <Badge className="bg-green-100 text-green-800 text-xs">
                  Synced
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm">{t.compliance.apd}</span>
                </div>
                <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                  Pending
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">{t.compliance.fmy}</span>
                </div>
                <Badge className="bg-green-100 text-green-800 text-xs">
                  Filed
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {t.recentActivity.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map(activity => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                  {activity.offline && (
                    <Badge variant="outline" className="text-xs">
                      Cached
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Approval Modal */}
      <Dialog open={showApprovalModal} onOpenChange={setShowApprovalModal}>
        <DialogContent className="sm:max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedApproval ? (
                <>
                  <Euro className="h-5 w-5" />
                  {selectedApproval.period} - {selectedApproval.employeeCount}{' '}
                  {t.currentPeriod.employees}
                </>
              ) : null}
            </DialogTitle>
            <DialogDescription>
              {selectedApproval ? (
                <div className="space-y-2 text-left">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span>{t.details.submittedBy}:</span>
                    <span className="font-medium">
                      {selectedApproval.submittedBy}
                    </span>
                    <span>{t.currentPeriod.grossPay}:</span>
                    <span className="font-medium">
                      {formatCurrency(selectedApproval.grossTotal)}
                    </span>
                    <span>{t.currentPeriod.netPay}:</span>
                    <span className="font-medium">
                      {formatCurrency(selectedApproval.netTotal)}
                    </span>
                    <span>{t.details.overtime}:</span>
                    <span className="font-medium">
                      {selectedApproval.details.overtimeHours}h
                    </span>
                  </div>
                  <Separator />
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <Shield
                        className={`h-3 w-3 ${selectedApproval.complianceChecks.ergani ? 'text-green-600' : 'text-red-600'}`}
                      />
                      <span>{t.compliance.ergani}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Shield
                        className={`h-3 w-3 ${selectedApproval.complianceChecks.efka ? 'text-green-600' : 'text-red-600'}`}
                      />
                      <span>{t.compliance.efka}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Shield
                        className={`h-3 w-3 ${selectedApproval.complianceChecks.fmy ? 'text-green-600' : 'text-red-600'}`}
                      />
                      <span>{t.compliance.fmy}</span>
                    </div>
                  </div>
                </div>
              ) : null}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                {t.approvals.comment}
              </label>
              <Textarea
                placeholder={t.approvals.addComment}
                value={approvalComment}
                onChange={e => setApprovalComment(e.target.value)}
                className="h-20"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setShowApprovalModal(false)}
              disabled={approvalMutation.isPending}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={() => confirmApproval('reject')}
              disabled={approvalMutation.isPending}
              variant="destructive"
              className="flex-1"
            >
              {approvalMutation.isPending
                ? t.approvals.processing
                : t.approvals.reject}
            </Button>
            <Button
              onClick={() => confirmApproval('approve')}
              disabled={approvalMutation.isPending}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {approvalMutation.isPending
                ? t.approvals.processing
                : t.approvals.approve}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
