import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  XCircle
} from "lucide-react";
import { format } from "date-fns";
import { el, enUS } from "date-fns/locale";

// Language context
const translations = {
  en: {
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
    priority: "Priority",
    high: "High",
    medium: "Medium",
    low: "Low"
  },
  el: {
    welcome: "Καλώς ήρθατε πίσω",
    nextPayday: "Επόμενη Πληρωμή",
    hoursThisWeek: "Ώρες Εβδομάδας",
    leaveBalance: "Υπόλοιπο Αδείας",
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
    priority: "Προτεραιότητα",
    high: "Υψηλή",
    medium: "Μεσαία",
    low: "Χαμηλή"
  }
};

export default function EmployeeDashboard() {
  const [language, setLanguage] = useState<'en' | 'el'>('en');
  const t = translations[language];
  const locale = language === 'el' ? el : enUS;

  // API queries for all dashboard widgets
  const { data: payday } = useQuery({
    queryKey: ['/api/portal/payday'],
    retry: false
  });

  const { data: timesheets } = useQuery({
    queryKey: ['/api/portal/timesheets/summary'],
    retry: false
  });

  const { data: leaveBalance } = useQuery({
    queryKey: ['/api/portal/leave/balance'],
    retry: false
  });

  const { data: upcomingShifts } = useQuery({
    queryKey: ['/api/portal/schedule/upcoming'],
    retry: false
  });

  const { data: dwcCoverage } = useQuery({
    queryKey: ['/api/portal/dwc/coverage'],
    retry: false
  });

  const { data: tasks } = useQuery({
    queryKey: ['/api/portal/tasks'],
    retry: false
  });

  const { data: payslips } = useQuery({
    queryKey: ['/api/portal/payslips'],
    retry: false
  });

  const { data: announcements } = useQuery({
    queryKey: ['/api/portal/announcements'],
    retry: false
  });

  const { data: explainPay } = useQuery({
    queryKey: ['/api/portal/explain/pay-2025-01'],
    retry: false
  });

  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(language === 'el' ? 'el-GR' : 'en-US', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  // Helper function to format hours
  const formatHours = (hours: number) => {
    if (language === 'el') {
      return `${hours.toString().replace('.', ',')} ώρες`;
    }
    return `${hours}h`;
  };

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
        </div>
        <div className="flex gap-2">
          <Button 
            variant={language === 'en' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setLanguage('en')}
          >
            EN
          </Button>
          <Button 
            variant={language === 'el' ? 'default' : 'outline'}
            size="sm" 
            onClick={() => setLanguage('el')}
          >
            ΕΛ
          </Button>
        </div>
      </div>

      {/* Above the fold - Top row cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Next Payday Widget */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t.nextPayday}
            </CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {(payday as any)?.payDate ? format(new Date((payday as any).payDate), 'dd MMM', { locale }) : '--'}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {(payday as any)?.netEstimate ? formatCurrency((payday as any).netEstimate) : '--'}
                </div>
              </div>
              {(payday as any)?.status && (
                <Badge variant={(payday as any).status === 'paid' ? 'default' : 'secondary'}>
                  {(payday as any).status}
                </Badge>
              )}
              <Button size="sm" className="w-full">
                <ExternalLink className="h-3 w-3 mr-2" />
                {t.viewPayslip}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Hours This Week Widget */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t.hoursThisWeek}
            </CardTitle>
            <Clock className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {(timesheets as any)?.worked ? formatHours((timesheets as any).worked) : '--'}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {(timesheets as any)?.scheduled ? `${formatHours((timesheets as any).scheduled)} ${t.scheduled}` : '--'}
                </div>
              </div>
              {(timesheets as any)?.hasExceptions && (
                <Badge variant="destructive">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {(timesheets as any).exceptions} {t.exceptions}
                </Badge>
              )}
              <Button size="sm" className="w-full">
                <Clock className="h-3 w-3 mr-2" />
                {t.openTimesheet}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Leave Balance Widget */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t.leaveBalance}
            </CardTitle>
            <Plane className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {(leaveBalance as any)?.remaining || 0} {language === 'el' ? 'ημέρες' : 'days'}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {(leaveBalance as any)?.used || 0} {t.used} / {(leaveBalance as any)?.entitlement || 0}
                </div>
              </div>
              {(leaveBalance as any)?.nextHoliday && (
                <div className="text-xs text-gray-500">
                  {t.nextHoliday}: {language === 'el' ? (leaveBalance as any).nextHoliday.name : (leaveBalance as any).nextHoliday.nameEn}
                </div>
              )}
              <Button size="sm" className="w-full">
                <Plane className="h-3 w-3 mr-2" />
                {t.requestLeave}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Explain-Your-Pay Widget */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t.explainYourPay}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(explainPay as any)?.highlights?.length > 0 ? (
                <div className="space-y-2">
                  {(explainPay as any).highlights.slice(0, 2).map((highlight: any, index: number) => (
                    <div key={index} className="text-sm">
                      <span className={`font-medium ${highlight.direction === 'increase' ? 'text-green-600' : 'text-red-600'}`}>
                        {highlight.direction === 'increase' ? '+' : '-'}{formatCurrency(highlight.amount)}
                      </span>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {highlight.description}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">No changes this period</div>
              )}
              <Button size="sm" variant="outline" className="w-full">
                <Info className="h-3 w-3 mr-2" />
                {t.seeFullExplanation}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Shifts Widget */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t.upcomingShifts}
            </CardTitle>
            <CalendarDays className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(upcomingShifts as any)?.length > 0 ? (
                <div className="space-y-2">
                  {(upcomingShifts as any).slice(0, 3).map((shift: any, index: number) => (
                    <div key={index} className="flex justify-between items-start text-sm">
                      <div>
                        <div className="font-medium">
                          {format(new Date(shift.date), 'EEE dd/MM', { locale })}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {shift.startTime} - {shift.endTime}
                        </div>
                        <div className="text-xs text-gray-500">
                          {shift.propertyName}
                        </div>
                      </div>
                      {shift.warnings?.length > 0 && (
                        <AlertCircle className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">No upcoming shifts</div>
              )}
              <Button size="sm" variant="outline" className="w-full">
                <CalendarDays className="h-3 w-3 mr-2" />
                {t.viewSchedule}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Digital Work Card Widget */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t.digitalWorkCard}
            </CardTitle>
            <Shield className="h-4 w-4 text-cyan-600" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {(dwcCoverage as any)?.coveragePercent || 0}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {t.coverage}
                </div>
              </div>
              {(dwcCoverage as any)?.lastSync && (
                <div className="text-xs text-gray-500">
                  {t.lastSync}: {format(new Date((dwcCoverage as any).lastSync), 'HH:mm', { locale })}
                </div>
              )}
              <Button size="sm" variant="outline" className="w-full">
                <Shield className="h-3 w-3 mr-2" />
                {t.openTimeline}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right rail / Bottom section on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* To-dos Widget */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t.toDos}
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(tasks as any)?.tasks?.length > 0 ? (
                <div className="space-y-2">
                  {(tasks as any).tasks.map((task: any, index: number) => (
                    <div key={task.id} className="p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="text-sm font-medium">
                            {language === 'el' ? task.titleEl : task.title}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {language === 'el' ? task.descriptionEl : task.description}
                          </div>
                        </div>
                        <Badge 
                          variant={task.priority === 'high' ? 'destructive' : 'secondary'}
                          className="ml-2 text-xs"
                        >
                          {task.priority === 'high' ? t.high : task.priority === 'medium' ? t.medium : t.low}
                        </Badge>
                      </div>
                      <Button size="sm" className="w-full mt-2" variant="outline">
                        {t.complete}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  All tasks completed
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Payslips Widget */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t.recentPayslips}
            </CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(payslips as any)?.slice(0, 6).map((payslip: any, index: number) => (
                <div key={payslip.payslipId} className="flex justify-between items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded">
                  <div>
                    <div className="text-sm font-medium">{payslip.period}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {formatCurrency(parseFloat(payslip.netPay))}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                      <Download className="h-3 w-3" />
                    </Button>
                    {payslip.isWatermarked && (
                      <Badge variant="outline" className="text-xs">Draft</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Announcements Widget */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t.announcements}
            </CardTitle>
            <Speaker className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(announcements as any)?.slice(0, 3).map((announcement: any, index: number) => (
                <div key={announcement.id} className="p-2 border-l-2 border-amber-500 bg-amber-50 dark:bg-amber-900/20">
                  <div className="text-sm font-medium">
                    {language === 'el' ? announcement.titleEl : announcement.title}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {language === 'el' ? announcement.contentEl : announcement.content}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {format(new Date(announcement.createdAt), 'dd MMM yyyy', { locale })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}