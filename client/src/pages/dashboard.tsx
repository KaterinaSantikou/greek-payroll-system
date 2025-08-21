import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  PlayCircle, 
  Clock, 
  FileText, 
  AlertTriangle, 
  ChevronRight, 
  TrendingUp, 
  Users, 
  DollarSign, 
  FileCheck, 
  AlertCircle, 
  RefreshCw,
  CheckCircle,
  XCircle,
  ArrowRight,
  Calendar,
  CreditCard,
  Shield,
  BarChart3,
  Eye,
  Download
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

type UserRole = 'admin' | 'payroll' | 'employee' | 'manager';

interface PayrollDraft {
  id: string;
  payPeriod: string;
  status: 'draft' | 'processing' | 'completed';
  lastSaved: Date;
  employeeCount: number;
}

interface CriticalItem {
  id: string;
  type: 'paydate' | 'approvals' | 'filings' | 'cutoff';
  title: string;
  count?: number;
  dueDate?: Date;
  status: 'urgent' | 'warning' | 'ok';
  action: string;
}

interface ComplianceAlert {
  id: string;
  type: 'missing_iban' | 'missing_afm' | 'missing_tax_id' | 'ergani_sync' | 'card_coverage';
  title: string;
  description: string;
  employeeCount: number;
  action: string;
  fixUrl: string;
}

interface TimeWidget {
  hoursReady: number;
  totalHours: number;
  exceptionsCount: number;
  lastUpdated: Date;
}

export default function Dashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [lastRefresh, setLastRefresh] = useState(new Date());
  
  // Determine user role
  const userRole: UserRole = 'admin'; // Default to admin for demo
  const isAdmin = userRole === 'admin' || userRole === 'payroll';

  // Query for payroll draft
  const { data: payrollDraft, isLoading: isDraftLoading } = useQuery({
    queryKey: ['/api/payroll/draft'],
    enabled: isAdmin,
  }) as { data: PayrollDraft | undefined, isLoading: boolean };

  // Query for critical items
  const { data: criticalItems, isLoading: isCriticalLoading } = useQuery({
    queryKey: ['/api/dashboard/critical'],
    enabled: isAdmin,
  }) as { data: CriticalItem[] | undefined, isLoading: boolean };

  // Query for compliance alerts
  const { data: complianceAlerts, isLoading: isComplianceLoading } = useQuery({
    queryKey: ['/api/dashboard/compliance-alerts'],
    enabled: isAdmin,
  }) as { data: ComplianceAlert[] | undefined, isLoading: boolean };

  // Query for time widget
  const { data: timeData, isLoading: isTimeLoading } = useQuery({
    queryKey: ['/api/dashboard/time-summary'],
    enabled: isAdmin,
  }) as { data: TimeWidget | undefined, isLoading: boolean };

  // Query for employee dashboard data
  const { data: employeeData, isLoading: isEmployeeLoading } = useQuery({
    queryKey: ['/api/dashboard/employee'],
    enabled: !isAdmin,
  }) as { data: any, isLoading: boolean };

  const refreshAll = () => {
    setLastRefresh(new Date());
    queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['/api/payroll'] });
  };

  const getMinutesAgo = (date: Date) => {
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    return diffMinutes;
  };

  const StatusIndicator = ({ lastUpdated }: { lastUpdated: Date }) => (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>Updated {getMinutesAgo(lastUpdated)} min ago</span>
      <button onClick={refreshAll} className="hover:text-foreground transition-colors">
        <RefreshCw className="h-3 w-3" />
      </button>
    </div>
  );

  if (isAdmin) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Payroll Dashboard</h1>
            <p className="text-muted-foreground">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
        </div>

        {/* Run Payroll - Persistent Primary Action */}
        <Card className="border-primary bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">Run Payroll</h3>
                  {payrollDraft?.status === 'draft' && (
                    <Badge variant="secondary">Draft in Progress</Badge>
                  )}
                </div>
                {payrollDraft?.status === 'draft' ? (
                  <p className="text-sm text-muted-foreground">
                    Draft saved {getMinutesAgo(payrollDraft.lastSaved)} min ago • {payrollDraft.employeeCount} employees
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Start processing payroll for this pay period
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {payrollDraft?.status === 'draft' && (
                  <Button variant="outline" size="sm">
                    Resume Draft
                  </Button>
                )}
                <Button size="lg" className="flex items-center gap-2">
                  <PlayCircle className="h-4 w-4" />
                  {payrollDraft?.status === 'draft' ? 'Continue Payroll' : 'Start Payroll'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Critical Today Strip */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Critical Today</CardTitle>
          </CardHeader>
          <CardContent>
            {isCriticalLoading ? (
              <div className="flex gap-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-48" />
                ))}
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {/* Next Pay Date */}
                <button className="flex-shrink-0 p-3 border rounded-lg hover:bg-muted transition-colors min-w-48">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">Next Pay Date</span>
                  </div>
                  <div className="text-lg font-bold">Jan 31, 2025</div>
                  <div className="text-xs text-muted-foreground">10 days away</div>
                </button>

                {/* Items to Approve */}
                <button className="flex-shrink-0 p-3 border rounded-lg hover:bg-muted transition-colors min-w-48">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="h-4 w-4 text-orange-500" />
                    <span className="font-medium text-sm">Items to Approve</span>
                  </div>
                  <div className="text-lg font-bold">23</div>
                  <div className="text-xs text-muted-foreground">Time off + hours</div>
                </button>

                {/* Filings Due */}
                <button className="flex-shrink-0 p-3 border rounded-lg hover:bg-muted transition-colors min-w-48">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-red-500" />
                    <span className="font-medium text-sm">Filings Due</span>
                  </div>
                  <div className="text-lg font-bold">2</div>
                  <div className="text-xs text-muted-foreground">ΑΠΔ + ΦΜΥ</div>
                </button>

                {/* Bank Cutoff */}
                <button className="flex-shrink-0 p-3 border rounded-lg hover:bg-muted transition-colors min-w-48">
                  <div className="flex items-center gap-2 mb-1">
                    <CreditCard className="h-4 w-4 text-blue-500" />
                    <span className="font-medium text-sm">Bank Cutoff</span>
                  </div>
                  <div className="text-lg font-bold">3 PM</div>
                  <div className="text-xs text-muted-foreground">Today</div>
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Compliance Alerts - Turn Alerts into Actions */}
        {!isComplianceLoading && complianceAlerts && complianceAlerts.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Action Required</h3>
            {complianceAlerts.map((alert: ComplianceAlert) => (
              <Alert key={alert.id} className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-red-800">{alert.title}</div>
                    <div className="text-sm text-red-600">
                      {alert.employeeCount} employees • {alert.description}
                    </div>
                  </div>
                  <Button variant="destructive" size="sm" className="flex items-center gap-2">
                    Fix
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Time → Payroll Widget */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Time & Attendance</CardTitle>
              <StatusIndicator lastUpdated={timeData?.lastUpdated || lastRefresh} />
            </CardHeader>
            <CardContent>
              {isTimeLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span>Hours Ready</span>
                    <span className="font-medium">{timeData?.hoursReady || 1847} / {timeData?.totalHours || 2050}</span>
                  </div>
                  <Progress value={((timeData?.hoursReady || 1847) / (timeData?.totalHours || 2050)) * 100} />
                  
                  {(timeData?.exceptionsCount || 12) > 0 && (
                    <div className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                        <span className="text-sm font-medium">{timeData?.exceptionsCount || 12} Exceptions</span>
                      </div>
                      <Button variant="outline" size="sm">View</Button>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1">Approve All</Button>
                    <Button variant="outline" size="sm">View Exceptions</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Next Payday + Processing Status */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Next Payday</CardTitle>
              <StatusIndicator lastUpdated={lastRefresh} />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="text-2xl font-bold">January 31</div>
                  <div className="text-sm text-muted-foreground">10 days away</div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Hours approved</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-500" />
                    <span className="text-sm">Payroll pending</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Payments not started</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  View Timeline
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ΕΡΓΑΝΗ ΙΙ Sync Health */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">ΕΡΓΑΝΗ ΙΙ Sync</CardTitle>
              <StatusIndicator lastUpdated={lastRefresh} />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Sync Status</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Healthy
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Last Sync</span>
                  <span className="text-sm font-medium">2 min ago</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Pending Uploads</span>
                  <span className="text-sm font-medium">0</span>
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Ψηφιακή Κάρτα Coverage */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Digital Card Coverage</CardTitle>
              <StatusIndicator lastUpdated={lastRefresh} />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Active Cards</span>
                  <span className="font-medium">187 / 205</span>
                </div>
                <Progress value={91} />
                <div className="text-xs text-muted-foreground">
                  18 employees need card activation
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  Manage Cards
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ΑΠΔ/ΦΜΥ Filings */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Government Filings</CardTitle>
              <StatusIndicator lastUpdated={lastRefresh} />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">ΑΠΔ Filing</span>
                    <Badge variant="destructive">Due Today</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">ΦΜΥ Report</span>
                    <Badge variant="outline">Due Feb 5</Badge>
                  </div>
                </div>
                <Button size="sm" className="w-full">
                  File ΑΠΔ Now
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Runs & Reports */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Recent Payroll Runs</CardTitle>
              <StatusIndicator lastUpdated={lastRefresh} />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <div className="font-medium text-sm">December 2024</div>
                      <div className="text-xs text-muted-foreground">205 employees</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Completed</Badge>
                      <Button variant="ghost" size="sm">
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <div className="font-medium text-sm">November 2024</div>
                      <div className="text-xs text-muted-foreground">198 employees</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Completed</Badge>
                      <Button variant="ghost" size="sm">
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* What Changed vs Last Month */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">What Changed vs Last Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-blue-500" />
                <div>
                  <div className="text-sm text-muted-foreground">Headcount</div>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">205</span>
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="text-xs text-green-600">+7</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-orange-500" />
                <div>
                  <div className="text-sm text-muted-foreground">OT Hours</div>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">2,347</span>
                    <TrendingUp className="h-3 w-3 text-red-500" />
                    <span className="text-xs text-red-600">+12%</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-green-500" />
                <div>
                  <div className="text-sm text-muted-foreground">Net Variance</div>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">€23,420</span>
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="text-xs text-green-600">+5.2%</span>
                  </div>
                </div>
              </div>
            </div>
            <Button variant="outline" className="mt-4">
              <Eye className="h-4 w-4 mr-2" />
              Explain Your Pay Details
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Employee Dashboard
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Dashboard</h1>
        <p className="text-muted-foreground">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Upcoming Paycheck */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Upcoming Paycheck</CardTitle>
            <StatusIndicator lastUpdated={lastRefresh} />
          </CardHeader>
          <CardContent>
            {isEmployeeLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <div className="text-2xl font-bold">€2,450</div>
                  <div className="text-sm text-muted-foreground">Net pay • Jan 31</div>
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  <Eye className="h-4 w-4 mr-2" />
                  Explain My Pay
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Paystubs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent Paystubs</CardTitle>
            <StatusIndicator lastUpdated={lastRefresh} />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <button className="w-full flex items-center justify-between p-2 border rounded hover:bg-muted">
                <span className="text-sm">December 2024</span>
                <Download className="h-4 w-4" />
              </button>
              <button className="w-full flex items-center justify-between p-2 border rounded hover:bg-muted">
                <span className="text-sm">November 2024</span>
                <Download className="h-4 w-4" />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Time Off */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Time Off</CardTitle>
            <StatusIndicator lastUpdated={lastRefresh} />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Available Days</span>
                <span className="font-medium">18.5</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Pending Requests</span>
                <span className="font-medium">2</span>
              </div>
              <Button variant="outline" size="sm" className="w-full">
                Request Time Off
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}