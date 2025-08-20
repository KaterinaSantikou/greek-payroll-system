/**
 * Mobile-Optimized Payroll Dashboard
 * Greek payroll management optimized for mobile devices
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { usePWA, GreekNotifications } from '@/hooks/usePWA';
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
  Download
} from 'lucide-react';

interface MobilePayrollDashboardProps {
  locale?: 'en' | 'el';
}

export default function MobilePayrollDashboard({ locale = 'en' }: MobilePayrollDashboardProps) {
  const [pwaState, pwaActions] = usePWA();
  const [currentPayroll, setCurrentPayroll] = useState<any>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const translations = {
    en: {
      title: "Payroll Dashboard",
      subtitle: "Greek payroll management",
      status: {
        online: "Online",
        offline: "Offline Mode"
      },
      quickActions: {
        title: "Quick Actions",
        runPayroll: "Run Payroll",
        viewEmployees: "View Employees", 
        checkCompliance: "Check Compliance",
        timeReview: "Review Time"
      },
      currentPeriod: {
        title: "January 2025 Payroll",
        employees: "employees",
        grossPay: "Gross Pay",
        netPay: "Net Pay",
        status: "Status",
        progress: "Progress"
      },
      compliance: {
        title: "Greek Compliance",
        ergani: "ERGANI II",
        efka: "e-EFKA",
        apd: "APD Forms",
        fmy: "FMY Filing"
      },
      recentActivity: {
        title: "Recent Activity"
      },
      notifications: {
        setup: "Setup Notifications",
        enabled: "Notifications Active"
      }
    },
    el: {
      title: "Πίνακας Μισθοδοσίας",
      subtitle: "Διαχείριση ελληνικής μισθοδοσίας",
      status: {
        online: "Συνδεδεμένος",
        offline: "Λειτουργία Offline"
      },
      quickActions: {
        title: "Γρήγορες Ενέργειες",
        runPayroll: "Εκτέλεση Μισθοδοσίας",
        viewEmployees: "Προβολή Υπαλλήλων",
        checkCompliance: "Έλεγχος Συμμόρφωσης", 
        timeReview: "Έλεγχος Χρόνου"
      },
      currentPeriod: {
        title: "Μισθοδοσία Ιανουαρίου 2025",
        employees: "υπάλληλοι",
        grossPay: "Μικτές Αποδοχές",
        netPay: "Καθαρές Αποδοχές",
        status: "Κατάσταση",
        progress: "Πρόοδος"
      },
      compliance: {
        title: "Ελληνική Συμμόρφωση",
        ergani: "ΕΡΓΑΝΗ ΙΙ",
        efka: "e-ΕΦΚΑ",
        apd: "Έντυπα ΑΠΔ",
        fmy: "Υποβολή ΦΜΥ"
      },
      recentActivity: {
        title: "Πρόσφατη Δραστηριότητα"
      },
      notifications: {
        setup: "Ρύθμιση Ειδοποιήσεων",
        enabled: "Ειδοποιήσεις Ενεργές"
      }
    }
  };

  const t = translations[locale];

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
        fetch('/api/activity/recent').catch(() => null)
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
      offline: true
    };
    
    const cachedActivity = [
      {
        id: 1,
        type: 'payroll_calculation',
        description: locale === 'en' ? 'Payroll calculated for 25 employees' : 'Υπολογίστηκε μισθοδοσία για 25 υπαλλήλους',
        time: '2 hours ago',
        offline: true
      },
      {
        id: 2,
        type: 'compliance_check',
        description: locale === 'en' ? 'ERGANI II validation completed' : 'Επικύρωση ΕΡΓΑΝΗ ΙΙ ολοκληρώθηκε',
        time: '4 hours ago',
        offline: true
      }
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
        { date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), type: 'Monthly Filing' }
      ]);
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
            <Badge variant={pwaState.isOffline ? 'destructive' : 'default'} className="text-xs">
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
              <Button size="sm" variant="outline" onClick={handleNotificationSetup}>
                <Bell className="h-3 w-3 mr-1" />
                {t.notifications.setup}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t.quickActions.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button className="h-20 flex-col gap-2" variant="outline">
                <Play className="h-5 w-5" />
                <span className="text-xs text-center">{t.quickActions.runPayroll}</span>
              </Button>
              <Button className="h-20 flex-col gap-2" variant="outline">
                <Users className="h-5 w-5" />
                <span className="text-xs text-center">{t.quickActions.viewEmployees}</span>
              </Button>
              <Button className="h-20 flex-col gap-2" variant="outline">
                <FileCheck className="h-5 w-5" />
                <span className="text-xs text-center">{t.quickActions.checkCompliance}</span>
              </Button>
              <Button className="h-20 flex-col gap-2" variant="outline">
                <Clock className="h-5 w-5" />
                <span className="text-xs text-center">{t.quickActions.timeReview}</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Current Payroll Period */}
        {currentPayroll && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t.currentPeriod.title}</CardTitle>
                {currentPayroll.offline && (
                  <Badge variant="outline" className="text-xs">
                    Cached
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{currentPayroll.employeeCount} {t.currentPeriod.employees}</span>
                <Badge variant={currentPayroll.status === 'complete' ? 'default' : 'secondary'}>
                  {currentPayroll.status}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600 mb-1">{t.currentPeriod.grossPay}</p>
                  <p className="text-lg font-semibold">€{currentPayroll.grossTotal?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">{t.currentPeriod.netPay}</p>
                  <p className="text-lg font-semibold">€{currentPayroll.netTotal?.toLocaleString()}</p>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">{t.currentPeriod.progress}</span>
                  <span className="text-sm font-medium">{currentPayroll.progress}%</span>
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
                <Badge className="bg-green-100 text-green-800 text-xs">Ready</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">{t.compliance.efka}</span>
                </div>
                <Badge className="bg-green-100 text-green-800 text-xs">Synced</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm">{t.compliance.apd}</span>
                </div>
                <Badge className="bg-yellow-100 text-yellow-800 text-xs">Pending</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">{t.compliance.fmy}</span>
                </div>
                <Badge className="bg-green-100 text-green-800 text-xs">Filed</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t.recentActivity.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{activity.description}</p>
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
    </div>
  );
}