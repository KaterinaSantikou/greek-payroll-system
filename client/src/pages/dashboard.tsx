import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar, 
  FileText, 
  Smartphone, 
  PlayCircle, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  DollarSign,
  Users,
  Eye,
  Zap
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useLocale } from "@/lib/i18n";

// Mock data following slim dashboard principles
const mockDashboardData = {
  nextPayday: "Feb 28, 2025",
  filingsDue: 3,
  digitalCardSync: 94.2,
  payrollStatus: {
    stage: "draft" as const,
    progress: 67,
    headcount: 24,
    totalAmount: 48750
  },
  timeApprovals: {
    count: 7,
    urgent: 2
  },
  filingsStatus: {
    ergani: "synced",
    apd: "pending", 
    fmy: "due"
  },
  lastPaymentBatch: {
    date: "Jan 28, 2025",
    status: "completed",
    amount: 45200,
    failed: 0
  },
  lastUpdated: "1m ago"
};

export default function Dashboard() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  
  const handleRefresh = () => {
    // Refresh logic here
    console.log('Refreshing dashboard data...');
  };

  const getFilingStatusColor = (status: string) => {
    switch (status) {
      case 'synced': return 'default';
      case 'pending': return 'secondary';
      case 'due': return 'destructive';
      default: return 'outline';
    }
  };

  const getFilingStatusText = (status: string) => {
    switch (status) {
      case 'synced': return '✓ Synced';
      case 'pending': return 'Pending';
      case 'due': return 'Due';
      default: return 'Unknown';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('nav.dashboard')}</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {locale === 'el' ? 'Κεντρικός Πίνακας Ελέγχου' : 'Overview of key metrics and actions'}
          </p>
        </div>
      </div>

      {/* Context Strip - 3 Chips Maximum */}
      <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950/20 dark:to-green-950/20 rounded-lg">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          <span className="font-medium">Next Payday:</span>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            {mockDashboardData.nextPayday}
          </Badge>
        </div>
        
        <Separator orientation="vertical" className="h-6" />
        
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-orange-500" />
          <span className="font-medium">Filings Due:</span>
          <Badge variant={mockDashboardData.filingsDue > 0 ? "destructive" : "default"}>
            {mockDashboardData.filingsDue}
          </Badge>
        </div>
        
        <Separator orientation="vertical" className="h-6" />
        
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-green-600" />
          <span className="font-medium">Digital Card Sync:</span>
          <Badge variant="default" className="bg-green-50 text-green-700 border-green-200">
            {mockDashboardData.digitalCardSync}%
          </Badge>
        </div>
      </div>

      {/* 4 Cards Maximum */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1: Run Payroll - Primary CTA */}
        <Card className="border-2 border-blue-200 bg-blue-50/30 dark:bg-blue-950/10 dark:border-blue-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl flex items-center gap-3">
                <PlayCircle className="h-6 w-6 text-blue-600" />
                {mockDashboardData.payrollStatus.stage === 'draft' ? 'Resume Draft' : 'Run Payroll'}
              </CardTitle>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={handleRefresh}
                className="text-gray-500 hover:text-gray-700"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                {mockDashboardData.lastUpdated}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Progress</span>
                <span className="text-sm font-medium">{mockDashboardData.payrollStatus.progress}%</span>
              </div>
              <Progress value={mockDashboardData.payrollStatus.progress} className="h-2" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-500">Employees</div>
                <div className="text-xl font-bold">{mockDashboardData.payrollStatus.headcount}</div>
              </div>
              <div>
                <div className="text-gray-500">Total Amount</div>
                <div className="text-xl font-bold">€{mockDashboardData.payrollStatus.totalAmount.toLocaleString()}</div>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-2">
              <Button className="flex-1 mr-2">
                <PlayCircle className="h-4 w-4 mr-2" />
                {mockDashboardData.payrollStatus.stage === 'draft' ? 'Resume Draft' : 'Start Payroll'}
              </Button>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-1" />
                View all
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Time Approvals */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-purple-600" />
                Time Approvals
              </CardTitle>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={handleRefresh}
                className="text-gray-500 hover:text-gray-700"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                {mockDashboardData.lastUpdated}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center py-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-purple-600">{mockDashboardData.timeApprovals.count}</div>
                <div className="text-sm text-gray-500">Pending approvals</div>
                {mockDashboardData.timeApprovals.urgent > 0 && (
                  <Badge variant="destructive" className="mt-2">
                    {mockDashboardData.timeApprovals.urgent} urgent
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" className="flex-1 mr-2">
                <CheckCircle className="h-4 w-4 mr-2" />
                Review Now
              </Button>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-1" />
                View all ({mockDashboardData.timeApprovals.count})
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Filings This Month */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Filings This Month
              </CardTitle>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={handleRefresh}
                className="text-gray-500 hover:text-gray-700"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                {mockDashboardData.lastUpdated}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">ERGANI</span>
                </div>
                <Badge variant={getFilingStatusColor(mockDashboardData.filingsStatus.ergani)}>
                  {getFilingStatusText(mockDashboardData.filingsStatus.ergani)}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">APD</span>
                </div>
                <Badge variant={getFilingStatusColor(mockDashboardData.filingsStatus.apd)}>
                  {getFilingStatusText(mockDashboardData.filingsStatus.apd)}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">ΦΜΥ</span>
                </div>
                <Badge variant={getFilingStatusColor(mockDashboardData.filingsStatus.fmy)}>
                  {getFilingStatusText(mockDashboardData.filingsStatus.fmy)}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" className="flex-1 mr-2">
                <ArrowRight className="h-4 w-4 mr-2" />
                Submit Pending
              </Button>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-1" />
                View all ({mockDashboardData.filingsDue})
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Payments Status */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Payments Status
              </CardTitle>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={handleRefresh}
                className="text-gray-500 hover:text-gray-700"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                {mockDashboardData.lastUpdated}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Last Batch</span>
                <Badge variant="default">{mockDashboardData.lastPaymentBatch.status}</Badge>
              </div>
              <div className="text-sm text-gray-500">{mockDashboardData.lastPaymentBatch.date}</div>
              <div className="text-xl font-bold">€{mockDashboardData.lastPaymentBatch.amount.toLocaleString()}</div>
              {mockDashboardData.lastPaymentBatch.failed === 0 ? (
                <div className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  All payments successful
                </div>
              ) : (
                <div className="text-sm text-red-600 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  {mockDashboardData.lastPaymentBatch.failed} failed payments
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-between pt-2">
              {mockDashboardData.lastPaymentBatch.failed > 0 ? (
                <Button variant="outline" className="flex-1 mr-2">
                  <Zap className="h-4 w-4 mr-2" />
                  Re-issue as Instant
                </Button>
              ) : (
                <Button variant="outline" className="flex-1 mr-2">
                  <DollarSign className="h-4 w-4 mr-2" />
                  New Payment
                </Button>
              )}
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-1" />
                View all
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}