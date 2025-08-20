import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Calendar, 
  Clock, 
  Plane, 
  TrendingUp, 
  CalendarDays, 
  Shield, 
  AlertCircle, 
  FileText, 
  Speaker,
  Download,
  ExternalLink,
  Info,
  CheckCircle,
  RefreshCw,
  Eye,
  MapPin,
  Timer,
  Zap
} from "lucide-react";
import { format, formatDistance } from "date-fns";
import { el, enUS } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";

// Language context with ICU plurals and proper localization
const translations = {
  'en-US': {
    welcome: "Welcome back",
    nextPayday: "Next Payday",
    hoursThisWeek: "Hours This Week", 
    leaveBalance: "Leave Balance",
    explainYourPay: "Explain Your Pay",
    upcomingShifts: "Upcoming Shifts",
    digitalWorkCard: "Digital Work Card",
    toDos: "To-Do",
    recentPayslips: "Recent Payslips",
    announcements: "Announcements",
    viewPayslip: "View Payslip",
    openTimesheet: "Open Timesheet",
    requestLeave: "Request Leave",
    seeFullExplanation: "See Full Explanation",
    viewSchedule: "View Schedule",
    openTimeline: "Open Timeline",
    worked: "worked",
    scheduled: "scheduled",
    used: "used",
    remaining: "remaining",
    exceptions: "exceptions",
    coverage: "coverage",
    lastSync: "Last sync",
    nextHoliday: "Next holiday",
    download: "Download",
    preview: "Preview",
    complete: "Complete",
    refresh: "Refresh",
    updatedAgo: "Updated {time} ago",
    priority: "Priority",
    high: "High",
    medium: "Medium", 
    low: "Low",
    noUpcomingShifts: "No upcoming shifts",
    noUpcomingShiftsAction: "View schedule",
    allTasksComplete: "All tasks completed",
    noRecentPayslips: "No recent payslips",
    noAnnouncements: "No announcements",
    estimatedTime: "Est. {time}",
    refreshData: "Refresh data",
    dataFreshness: "Updated {time} ago • Refresh"
  },
  'el-GR': {
    welcome: "Καλώς ήρθατε πίσω",
    nextPayday: "Επόμενη Πληρωμή",
    hoursThisWeek: "Ώρες Εβδομάδας",
    leaveBalance: "Υπόλοιπο Άδειας", 
    explainYourPay: "Εξήγηση Αποδοχών",
    upcomingShifts: "Επόμενες Βάρδιες",
    digitalWorkCard: "Ψηφιακή Κάρτα Εργασίας",
    toDos: "Εκκρεμότητες",
    recentPayslips: "Πρόσφατα Εκκαθαριστικά",
    announcements: "Ανακοινώσεις",
    viewPayslip: "Προβολή Εκκαθαριστικού",
    openTimesheet: "Άνοιγμα Φύλλου Χρόνου",
    requestLeave: "Αίτηση Άδειας",
    seeFullExplanation: "Πλήρης Εξήγηση",
    viewSchedule: "Προβολή Προγράμματος",
    openTimeline: "Άνοιγμα Χρονολογίου", 
    worked: "εργάστηκε",
    scheduled: "προγραμματισμένες",
    used: "χρησιμοποιήθηκαν",
    remaining: "υπόλοιπο",
    exceptions: "εξαιρέσεις",
    coverage: "κάλυψη",
    lastSync: "Τελευταίος συγχρονισμός",
    nextHoliday: "Επόμενη αργία",
    download: "Λήψη",
    preview: "Προεπισκόπηση",
    complete: "Ολοκλήρωση",
    refresh: "Ανανέωση",
    updatedAgo: "Ενημερώθηκε {time} πριν",
    priority: "Προτεραιότητα",
    high: "Υψηλή",
    medium: "Μεσαία",
    low: "Χαμηλή",
    noUpcomingShifts: "Δεν υπάρχουν επόμενες βάρδιες",
    noUpcomingShiftsAction: "Προβολή προγράμματος",
    allTasksComplete: "Όλες οι εργασίες ολοκληρώθηκαν",
    noRecentPayslips: "Δεν υπάρχουν πρόσφατα εκκαθαριστικά",
    noAnnouncements: "Δεν υπάρχουν ανακοινώσεις",
    estimatedTime: "Εκτ. {time}",
    refreshData: "Ανανέωση δεδομένων",
    dataFreshness: "Ενημερώθηκε {time} πριν • Ανανέωση"
  }
};

// Skeleton components for loading states
const WidgetSkeleton = ({ height = "h-24" }: { height?: string }) => (
  <Card className={`${height} animate-pulse`}>
    <CardHeader className="space-y-0 pb-2">
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded" />
      </div>
    </CardHeader>
    <CardContent className="space-y-2">
      <Skeleton className="h-6 w-16" />
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-8 w-full" />
    </CardContent>
  </Card>
);

// Data freshness component
const DataFreshness = ({ 
  updatedAt, 
  onRefresh, 
  locale = 'en-US',
  isRefreshing = false 
}: { 
  updatedAt: string;
  onRefresh: () => void;
  locale?: string;
  isRefreshing?: boolean;
}) => {
  const t = translations[locale as keyof typeof translations];
  const localeObj = locale === 'el-GR' ? el : enUS;
  
  const timeAgo = formatDistance(new Date(updatedAt), new Date(), { 
    addSuffix: false,
    locale: localeObj 
  });

  return (
    <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
      <span>{t.updatedAgo.replace('{time}', timeAgo)}</span>
      <span>•</span>
      <button
        onClick={onRefresh}
        disabled={isRefreshing}
        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 disabled:opacity-50"
      >
        <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
        {t.refresh}
      </button>
    </div>
  );
};

// Empty state component
const EmptyState = ({ 
  title, 
  action, 
  onAction, 
  icon: Icon = AlertCircle 
}: { 
  title: string;
  action: string;
  onAction: () => void;
  icon?: React.ComponentType<any>;
}) => (
  <div className="flex flex-col items-center justify-center py-8 text-center">
    <Icon className="h-12 w-12 text-gray-400 mb-3" />
    <p className="text-sm text-gray-600 mb-4">{title}</p>
    <Button size="sm" variant="outline" onClick={onAction}>
      <ExternalLink className="h-3 w-3 mr-1" />
      {action}
    </Button>
  </div>
);

export default function EmployeeDashboard() {
  const [language, setLanguage] = useState<'en-US' | 'el-GR'>('en-US');
  const t = translations[language];
  const locale = language === 'el-GR' ? el : enUS;
  const queryClient = useQueryClient();

  // Track dashboard view event
  useEffect(() => {
    apiRequest('POST', '/api/portal/events', {
      event: 'dashboard.view',
      properties: { type: 'cold', locale: language },
      timestamp: new Date().toISOString()
    }).catch(console.error);
  }, [language]);

  // Main dashboard data query using aggregate endpoint
  const { data: dashboardData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['/api/portal/employee/dashboard', { lang: language }],
    queryFn: () => apiRequest('GET', `/api/portal/employee/dashboard?lang=${language}`),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes  
    retry: false,
    refetchOnWindowFocus: true,
    refetchOnMount: true
  });

  // Event tracking mutation
  const trackEvent = useMutation({
    mutationFn: (event: { event: string; properties?: any }) =>
      apiRequest('POST', '/api/portal/events', {
        ...event,
        timestamp: new Date().toISOString()
      })
  });

  // Audit logging mutation
  const logAudit = useMutation({
    mutationFn: (action: { action: string; resource_id: string; details?: any }) =>
      apiRequest('POST', '/api/portal/audit', action)
  });

  // Helper function to format currency with proper locale
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(language, {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Helper function to format hours with locale
  const formatHours = (hours: number) => {
    if (language === 'el-GR') {
      return `${hours.toString().replace('.', ',')} ώρες`;
    }
    return `${hours}h`;
  };

  // Handle refresh for specific widgets
  const handleWidgetRefresh = (widgetType: string) => {
    trackEvent.mutate({
      event: `dashboard.widget.refresh`,
      properties: { widget: widgetType }
    });
    
    // Invalidate and refetch specific widget data
    queryClient.invalidateQueries({ 
      queryKey: ['/api/portal/employee/dashboard'] 
    });
    refetch();
  };

  // Handle CTA clicks with tracking
  const handleCTAClick = (action: string, destination?: string) => {
    trackEvent.mutate({
      event: `dashboard.cta.click`,
      properties: { action, destination }
    });
    
    if (destination) {
      window.open(destination, '_blank');
    }
  };

  // Handle payslip download with audit logging
  const handlePayslipDownload = (payslipId: string, url: string) => {
    logAudit.mutate({
      action: 'payslip.download',
      resource_id: payslipId,
      details: { url, method: 'dashboard' }
    });
    
    trackEvent.mutate({
      event: 'payslip.download',
      properties: { payslip_id: payslipId, source: 'dashboard' }
    });
    
    window.open(url, '_blank');
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
        {/* Header skeleton */}
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-8 w-12" />
          </div>
        </div>

        {/* Widget skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <WidgetSkeleton />
          <WidgetSkeleton />
          <WidgetSkeleton />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <WidgetSkeleton />
          <WidgetSkeleton />
          <WidgetSkeleton />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <WidgetSkeleton height="h-32" />
          <WidgetSkeleton height="h-32" />
          <WidgetSkeleton height="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header with language toggle */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t.welcome}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {format(new Date(), 'EEEE, MMMM do, yyyy', { locale })}
          </p>
          {dashboardData?.context && (
            <p className="text-sm text-gray-500 mt-1">
              {language === 'el-GR' ? dashboardData.context.property_name_el : dashboardData.context.property_name} • 
              {language === 'el-GR' ? dashboardData.context.role_el : dashboardData.context.role}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button 
            variant={language === 'en-US' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setLanguage('en-US')}
            aria-label="Switch to English"
          >
            EN
          </Button>
          <Button 
            variant={language === 'el-GR' ? 'default' : 'outline'}
            size="sm" 
            onClick={() => setLanguage('el-GR')}
            aria-label="Αλλαγή σε Ελληνικά"
          >
            ΕΛ
          </Button>
        </div>
      </div>

      {/* Above the fold - Top row cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Next Payday Widget */}
        <Card className="hover:shadow-lg transition-shadow" role="region" aria-labelledby="payday-title">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle id="payday-title" className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t.nextPayday}
            </CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white" role="text">
                  {dashboardData?.payday?.date ? 
                    format(new Date(dashboardData.payday.date), 'dd MMM', { locale }) : '--'}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {dashboardData?.payday?.net_estimate ? 
                    formatCurrency(dashboardData.payday.net_estimate) : '--'}
                </div>
              </div>
              {dashboardData?.payday?.status && (
                <Badge variant={dashboardData.payday.status === 'paid' ? 'default' : 'secondary'}>
                  {dashboardData.payday.status}
                </Badge>
              )}
              {dashboardData?.payday?.is_late && (
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    Running late - check employer note
                  </AlertDescription>
                </Alert>
              )}
              <Button 
                size="sm" 
                className="w-full"
                onClick={() => handleCTAClick('view_payslip', '/payslips/current')}
                tabIndex={0}
              >
                <ExternalLink className="h-3 w-3 mr-2" />
                {t.viewPayslip}
              </Button>
              {dashboardData?.metadata?.data_freshness?.payday && (
                <DataFreshness
                  updatedAt={dashboardData.metadata.data_freshness.payday}
                  onRefresh={() => handleWidgetRefresh('payday')}
                  locale={language}
                  isRefreshing={isRefetching}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Hours This Week Widget */}
        <Card className="hover:shadow-lg transition-shadow" role="region" aria-labelledby="hours-title">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle id="hours-title" className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t.hoursThisWeek}
            </CardTitle>
            <Clock className="h-4 w-4 text-green-600" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {dashboardData?.hours?.worked ? formatHours(dashboardData.hours.worked) : '--'}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {dashboardData?.hours?.scheduled ? 
                    `${formatHours(dashboardData.hours.scheduled)} ${t.scheduled}` : '--'}
                </div>
              </div>
              {dashboardData?.hours?.exceptions > 0 && (
                <Badge variant="destructive">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {dashboardData.hours.exceptions} {t.exceptions}
                </Badge>
              )}
              {dashboardData?.hours?.status === 'unapproved' && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  <Timer className="h-3 w-3 mr-1" />
                  Needs approval
                </Badge>
              )}
              <Button 
                size="sm" 
                className="w-full"
                onClick={() => {
                  trackEvent.mutate({ event: 'timesheet.open', properties: { source: 'dashboard' } });
                  handleCTAClick('open_timesheet', '/timesheet');
                }}
                tabIndex={0}
              >
                <Clock className="h-3 w-3 mr-2" />
                {t.openTimesheet}
              </Button>
              {dashboardData?.metadata?.data_freshness?.hours && (
                <DataFreshness
                  updatedAt={dashboardData.metadata.data_freshness.hours}
                  onRefresh={() => handleWidgetRefresh('hours')}
                  locale={language}
                  isRefreshing={isRefetching}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Leave Balance Widget */}
        <Card className="hover:shadow-lg transition-shadow" role="region" aria-labelledby="leave-title">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle id="leave-title" className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t.leaveBalance}
            </CardTitle>
            <Plane className="h-4 w-4 text-orange-600" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {dashboardData?.leave?.remaining_days || 0} {language === 'el-GR' ? 'ημέρες' : 'days'}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {dashboardData?.leave?.used_days || 0} {t.used} / {dashboardData?.leave?.entitlement_days || 0}
                </div>
              </div>
              {dashboardData?.leave?.next_holiday && (
                <div className="text-xs text-gray-500">
                  {t.nextHoliday}: {language === 'el-GR' ? 
                    dashboardData.leave.next_holiday.name : 
                    dashboardData.leave.next_holiday.name_en}
                </div>
              )}
              <Button 
                size="sm" 
                className="w-full"
                onClick={() => {
                  trackEvent.mutate({ event: 'leave.request.start', properties: { source: 'dashboard' } });
                  handleCTAClick('request_leave', '/leave/request');
                }}
                tabIndex={0}
              >
                <Plane className="h-3 w-3 mr-2" />
                {t.requestLeave}
              </Button>
              {dashboardData?.metadata?.data_freshness?.general && (
                <DataFreshness
                  updatedAt={dashboardData.metadata.data_freshness.general}
                  onRefresh={() => handleWidgetRefresh('leave')}
                  locale={language}
                  isRefreshing={isRefetching}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Explain-Your-Pay Widget */}
        <Card className="hover:shadow-lg transition-shadow" role="region" aria-labelledby="explain-title">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle id="explain-title" className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t.explainYourPay}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData?.explain?.deltas?.length > 0 ? (
                <div className="space-y-2" role="list">
                  {dashboardData.explain.deltas.slice(0, 2).map((delta: any, index: number) => (
                    <div key={index} className="text-sm" role="listitem">
                      <span className={`font-medium ${delta.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {delta.amount > 0 ? '+' : ''}{formatCurrency(delta.amount)}
                      </span>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {language === 'el-GR' ? delta.description_el : delta.description}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">No changes this period</div>
              )}
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  trackEvent.mutate({ event: 'explain.open', properties: { payslip_id: dashboardData?.explain?.payslip_id } });
                  handleCTAClick('explain_pay', `/explain/${dashboardData?.explain?.payslip_id}`);
                }}
                tabIndex={0}
              >
                <Info className="h-3 w-3 mr-2" />
                {t.seeFullExplanation}
              </Button>
              {dashboardData?.metadata?.data_freshness?.general && (
                <DataFreshness
                  updatedAt={dashboardData.metadata.data_freshness.general}
                  onRefresh={() => handleWidgetRefresh('explain')}
                  locale={language}
                  isRefreshing={isRefetching}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Shifts Widget */}
        <Card className="hover:shadow-lg transition-shadow" role="region" aria-labelledby="shifts-title">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle id="shifts-title" className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t.upcomingShifts}
            </CardTitle>
            <CalendarDays className="h-4 w-4 text-indigo-600" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData?.shifts?.length > 0 ? (
                <div className="space-y-2" role="list">
                  {dashboardData.shifts.slice(0, 3).map((shift: any, index: number) => (
                    <div key={index} className="flex justify-between items-start text-sm" role="listitem">
                      <div>
                        <div className="font-medium">
                          {format(new Date(shift.date), 'EEE dd/MM', { locale })}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {shift.start} - {shift.end}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {language === 'el-GR' ? shift.site_el : shift.site}
                        </div>
                      </div>
                      {shift.warnings?.length > 0 && (
                        <AlertCircle className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title={t.noUpcomingShifts}
                  action={t.noUpcomingShiftsAction}
                  onAction={() => handleCTAClick('view_schedule', '/schedule')}
                  icon={CalendarDays}
                />
              )}
              {dashboardData?.shifts?.length > 0 && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full"
                  onClick={() => handleCTAClick('view_schedule', '/schedule')}
                  tabIndex={0}
                >
                  <CalendarDays className="h-3 w-3 mr-2" />
                  {t.viewSchedule}
                </Button>
              )}
              {dashboardData?.metadata?.data_freshness?.general && (
                <DataFreshness
                  updatedAt={dashboardData.metadata.data_freshness.general}
                  onRefresh={() => handleWidgetRefresh('shifts')}
                  locale={language}
                  isRefreshing={isRefetching}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Digital Work Card Widget */}
        <Card className="hover:shadow-lg transition-shadow" role="region" aria-labelledby="dwc-title">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle id="dwc-title" className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t.digitalWorkCard}
            </CardTitle>
            <Shield className="h-4 w-4 text-cyan-600" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                  {dashboardData?.dwc?.coverage_pct || 0}%
                  {dashboardData?.dwc?.coverage_pct >= 95 && (
                    <Zap className="h-5 w-5 text-green-500 ml-2" />
                  )}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {t.coverage}
                </div>
              </div>
              {dashboardData?.dwc?.last_sync && (
                <div className="text-xs text-gray-500">
                  {t.lastSync}: {format(new Date(dashboardData.dwc.last_sync), 'HH:mm', { locale })}
                </div>
              )}
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  trackEvent.mutate({ event: 'dwc.timeline.open', properties: { source: 'dashboard' } });
                  handleCTAClick('dwc_timeline', '/dwc/timeline');
                }}
                tabIndex={0}
              >
                <Shield className="h-3 w-3 mr-2" />
                {t.openTimeline}
              </Button>
              {dashboardData?.metadata?.data_freshness?.dwc && (
                <DataFreshness
                  updatedAt={dashboardData.metadata.data_freshness.dwc}
                  onRefresh={() => handleWidgetRefresh('dwc')}
                  locale={language}
                  isRefreshing={isRefetching}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* To-dos Widget */}
        <Card className="hover:shadow-lg transition-shadow" role="region" aria-labelledby="todos-title">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle id="todos-title" className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t.toDos}
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData?.todos?.length > 0 ? (
                <div className="space-y-2" role="list">
                  {dashboardData.todos.map((task: any) => (
                    <div key={task.id} className="p-2 bg-gray-50 dark:bg-gray-800 rounded-md" role="listitem">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="text-sm font-medium">
                            {language === 'el-GR' ? task.label_el : task.label}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {language === 'el-GR' ? task.description_el : task.description}
                          </div>
                          {task.estimated_time && (
                            <div className="text-xs text-blue-600 mt-1">
                              {t.estimatedTime.replace('{time}', task.estimated_time)}
                            </div>
                          )}
                        </div>
                        <Badge 
                          variant={task.priority === 'high' ? 'destructive' : 'secondary'}
                          className="ml-2 text-xs"
                        >
                          {task.priority === 'high' ? t.high : task.priority === 'medium' ? t.medium : t.low}
                        </Badge>
                      </div>
                      <Button 
                        size="sm" 
                        className="w-full mt-2" 
                        variant="outline"
                        onClick={() => {
                          trackEvent.mutate({ 
                            event: `${task.type}.update.start`, 
                            properties: { task_id: task.id, source: 'dashboard' } 
                          });
                          handleCTAClick('complete_task', task.link);
                        }}
                        tabIndex={0}
                      >
                        {t.complete}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 flex items-center justify-center py-4">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  {t.allTasksComplete}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Payslips Widget */}
        <Card className="hover:shadow-lg transition-shadow" role="region" aria-labelledby="payslips-title">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle id="payslips-title" className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t.recentPayslips}
            </CardTitle>
            <FileText className="h-4 w-4 text-blue-600" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            {dashboardData?.payslips?.length > 0 ? (
              <div className="space-y-2" role="list">
                {dashboardData.payslips.slice(0, 6).map((payslip: any) => (
                  <div 
                    key={payslip.payslip_id} 
                    className="flex justify-between items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded"
                    role="listitem"
                  >
                    <div>
                      <div className="text-sm font-medium">
                        {language === 'el-GR' ? payslip.period_el : payslip.period}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {formatCurrency(payslip.net)}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-6 w-6 p-0"
                        onClick={() => handlePayslipDownload(payslip.payslip_id, payslip.pdf_url)}
                        aria-label={`${t.download} ${payslip.period}`}
                        tabIndex={0}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-6 w-6 p-0"
                        onClick={() => handleCTAClick('preview_payslip', payslip.preview_url)}
                        aria-label={`${t.preview} ${payslip.period}`}
                        tabIndex={0}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      {!payslip.is_final && (
                        <Badge variant="outline" className="text-xs">Draft</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title={t.noRecentPayslips}
                action="View payroll history"
                onAction={() => handleCTAClick('view_payslips', '/payslips')}
                icon={FileText}
              />
            )}
          </CardContent>
        </Card>

        {/* Announcements Widget */}
        <Card className="hover:shadow-lg transition-shadow" role="region" aria-labelledby="announcements-title">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle id="announcements-title" className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t.announcements}
            </CardTitle>
            <Speaker className="h-4 w-4 text-amber-600" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            {dashboardData?.announcements?.length > 0 ? (
              <div className="space-y-3" role="list">
                {dashboardData.announcements.slice(0, 3).map((announcement: any) => (
                  <div 
                    key={announcement.id} 
                    className="p-2 border-l-2 border-amber-500 bg-amber-50 dark:bg-amber-900/20 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/30"
                    onClick={() => handleCTAClick('view_announcement', announcement.link)}
                    role="listitem"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleCTAClick('view_announcement', announcement.link);
                      }
                    }}
                  >
                    <div className="text-sm font-medium">
                      {language === 'el-GR' ? announcement.title_el : announcement.title}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {language === 'el-GR' ? announcement.summary_el : announcement.summary}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {format(new Date(announcement.created_at), 'dd MMM yyyy', { locale })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title={t.noAnnouncements}
                action="View archive"
                onAction={() => handleCTAClick('view_announcements', '/announcements')}
                icon={Speaker}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}