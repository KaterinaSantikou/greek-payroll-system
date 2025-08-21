import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Calculator,
  Clock,
  CheckCircle,
  AlertTriangle,
  FileText,
  Users,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Calendar,
  Shield,
  DollarSign,
  Target,
  Activity,
  RefreshCw,
  Download,
  Eye,
  Settings,
  Zap,
  BarChart3,
  PieChart,
  Percent,
  ArrowUp,
  ArrowDown,
  Minus,
  CheckCircle2,
  XCircle,
  Clock3,
  Bell
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface PayrollWorkflowStep {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'in-progress' | 'pending' | 'error';
  completedAt?: string;
  assignedTo?: string;
  dependencies?: string[];
  estimatedTime?: string;
}

interface TimeAttendanceData {
  totalEmployees: number;
  timesheetsSubmitted: number;
  timesheetsApproved: number;
  pendingApprovals: number;
  exceptionsCount: number;
  overtimeHours: number;
  submissionRate: number;
  approvalRate: number;
}

interface PayrollChange {
  id: string;
  type: 'new-hire' | 'termination' | 'salary-increase' | 'bonus' | 'deduction' | 'adjustment';
  employeeName: string;
  department: string;
  description: string;
  amount?: number;
  effectiveDate: string;
  approvedBy: string;
  status: 'pending' | 'approved' | 'applied';
}

interface PendingApproval {
  id: string;
  category: string;
  description: string;
  amount?: number;
  employeeName?: string;
  submittedBy: string;
  submittedDate: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedImpact: string;
}

interface PayrollMetrics {
  errorRate: {
    current: number;
    previous: number;
    trend: 'up' | 'down' | 'stable';
    target: number;
  };
  totalCost: {
    current: number;
    previous: number;
    variance: number;
    variancePercent: number;
    budget: number;
  };
  deductions: {
    taxWithholdings: number;
    socialSecurity: number;
    benefits: number;
    garnishments: number;
    other: number;
  };
  accuracy: {
    calculationAccuracy: number;
    onTimeDelivery: number;
    complianceScore: number;
  };
}

interface ComplianceStatus {
  id: string;
  filing: string;
  type: 'monthly' | 'quarterly' | 'annual';
  dueDate: string;
  status: 'filed' | 'pending' | 'overdue' | 'draft';
  amount?: number;
  lastFiled?: string;
  daysUntilDue: number;
}

export default function PayrollManagerDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState('current');
  const [activeTab, setActiveTab] = useState('workflow');

  // Mock data - replace with actual API calls
  const payrollWorkflow: PayrollWorkflowStep[] = [
    {
      id: '1',
      title: 'Time & Attendance Collection',
      description: 'Collect and validate all employee time data',
      status: 'completed',
      completedAt: '2024-08-20T10:00:00',
      assignedTo: 'Time Management Team',
      estimatedTime: '2 hours'
    },
    {
      id: '2',
      title: 'Overtime Approval',
      description: 'Review and approve overtime hours',
      status: 'in-progress',
      assignedTo: 'Payroll Team',
      dependencies: ['1'],
      estimatedTime: '1 hour'
    },
    {
      id: '3',
      title: 'Payroll Changes Review',
      description: 'Review all salary changes, bonuses, and adjustments',
      status: 'pending',
      assignedTo: 'Payroll Manager',
      dependencies: ['2'],
      estimatedTime: '3 hours'
    },
    {
      id: '4',
      title: 'Tax Calculations',
      description: 'Calculate income tax and social security contributions',
      status: 'pending',
      assignedTo: 'System Auto-calculation',
      dependencies: ['3'],
      estimatedTime: '30 minutes'
    },
    {
      id: '5',
      title: 'EFKA Submissions',
      description: 'Submit employee data to EFKA system',
      status: 'pending',
      assignedTo: 'Compliance Team',
      dependencies: ['4'],
      estimatedTime: '1 hour'
    },
    {
      id: '6',
      title: 'Final Approval',
      description: 'Management sign-off on payroll run',
      status: 'pending',
      assignedTo: 'Finance Director',
      dependencies: ['5'],
      estimatedTime: '30 minutes'
    },
    {
      id: '7',
      title: 'Payroll Processing',
      description: 'Execute payroll and generate pay slips',
      status: 'pending',
      assignedTo: 'Payroll System',
      dependencies: ['6'],
      estimatedTime: '2 hours'
    },
    {
      id: '8',
      title: 'Banking File Generation',
      description: 'Generate SEPA payment files for banks',
      status: 'pending',
      assignedTo: 'Banking Integration',
      dependencies: ['7'],
      estimatedTime: '45 minutes'
    }
  ];

  const timeAttendanceData: TimeAttendanceData = {
    totalEmployees: 247,
    timesheetsSubmitted: 242,
    timesheetsApproved: 238,
    pendingApprovals: 4,
    exceptionsCount: 12,
    overtimeHours: 156,
    submissionRate: 98.0,
    approvalRate: 96.4
  };

  const payrollChanges: PayrollChange[] = [
    {
      id: '1',
      type: 'new-hire',
      employeeName: 'Μαρία Παπαδοπούλου',
      department: 'Engineering',
      description: 'Νέα πρόσληψη - Junior Developer',
      amount: 2800,
      effectiveDate: '2024-08-19',
      approvedBy: 'HR Manager',
      status: 'approved'
    },
    {
      id: '2',
      type: 'salary-increase',
      employeeName: 'Γιάννης Κωνσταντίνου',
      department: 'Sales',
      description: 'Προαγωγή σε Senior Sales Rep (+15%)',
      amount: 450,
      effectiveDate: '2024-08-01',
      approvedBy: 'Sales Director',
      status: 'approved'
    },
    {
      id: '3',
      type: 'bonus',
      employeeName: 'Ελένη Μιχαήλ',
      department: 'Marketing',
      description: 'Q2 Performance Bonus',
      amount: 1200,
      effectiveDate: '2024-08-31',
      approvedBy: 'CEO',
      status: 'approved'
    },
    {
      id: '4',
      type: 'termination',
      employeeName: 'Νίκος Αντωνίου',
      department: 'Finance',
      description: 'Εθελουσία έξοδος - Τελευταίος μισθός',
      amount: 3200,
      effectiveDate: '2024-08-15',
      approvedBy: 'HR Director',
      status: 'approved'
    },
    {
      id: '5',
      type: 'adjustment',
      employeeName: 'Σοφία Δημητρίου',
      department: 'Operations',
      description: 'Διόρθωση υπερωριών προηγούμενου μήνα',
      amount: 385,
      effectiveDate: '2024-08-31',
      approvedBy: 'Payroll Manager',
      status: 'pending'
    }
  ];

  const pendingApprovals: PendingApproval[] = [
    {
      id: '1',
      category: 'Overtime Authorization',
      description: 'Engineering team weekend work approval',
      amount: 4200,
      submittedBy: 'Engineering Manager',
      submittedDate: '2024-08-20',
      priority: 'critical',
      estimatedImpact: 'Affects 12 employees'
    },
    {
      id: '2',
      category: 'Bonus Payment',
      description: 'Q2 sales incentive payouts',
      amount: 15600,
      submittedBy: 'Sales Director',
      submittedDate: '2024-08-19',
      priority: 'high',
      estimatedImpact: 'Affects 8 employees'
    },
    {
      id: '3',
      category: 'Salary Adjustment',
      description: 'Cost of living adjustment - Operations team',
      amount: 2800,
      submittedBy: 'Operations Manager',
      submittedDate: '2024-08-18',
      priority: 'medium',
      estimatedImpact: 'Affects 15 employees'
    },
    {
      id: '4',
      category: 'Garnishment Setup',
      description: 'Court-ordered wage garnishment',
      amount: 650,
      employeeName: 'Αλέξανδρος Γεωργίου',
      submittedBy: 'Legal Department',
      submittedDate: '2024-08-17',
      priority: 'critical',
      estimatedImpact: 'Legal compliance requirement'
    }
  ];

  const payrollMetrics: PayrollMetrics = {
    errorRate: {
      current: 0.8,
      previous: 1.2,
      trend: 'down',
      target: 0.5
    },
    totalCost: {
      current: 428750,
      previous: 419230,
      variance: 9520,
      variancePercent: 2.27,
      budget: 445000
    },
    deductions: {
      taxWithholdings: 89420,
      socialSecurity: 67340,
      benefits: 23180,
      garnishments: 4620,
      other: 8940
    },
    accuracy: {
      calculationAccuracy: 99.2,
      onTimeDelivery: 98.5,
      complianceScore: 97.8
    }
  };

  const complianceStatus: ComplianceStatus[] = [
    {
      id: '1',
      filing: 'Μηνιαία δήλωση φόρου μισθωτών',
      type: 'monthly',
      dueDate: '2024-09-15',
      status: 'pending',
      amount: 89420,
      daysUntilDue: 25
    },
    {
      id: '2',
      filing: 'ΑΠΔ ΕΦΚΑ',
      type: 'monthly',
      dueDate: '2024-09-16',
      status: 'draft',
      amount: 67340,
      daysUntilDue: 26
    },
    {
      id: '3',
      filing: 'Πληρωμή εισφορών ΕΦΚΑ',
      type: 'monthly',
      dueDate: '2024-09-30',
      status: 'pending',
      amount: 103260,
      daysUntilDue: 40
    },
    {
      id: '4',
      filing: 'Τριμηνιαία δήλωση ΦΠΑ',
      type: 'quarterly',
      dueDate: '2024-10-25',
      status: 'filed',
      lastFiled: '2024-08-20',
      daysUntilDue: 65
    },
    {
      id: '5',
      filing: 'Βεβαιώσεις αποδοχών',
      type: 'annual',
      dueDate: '2025-02-28',
      status: 'pending',
      daysUntilDue: 191
    }
  ];

  const getWorkflowProgress = () => {
    const completedSteps = payrollWorkflow.filter(step => step.status === 'completed').length;
    return (completedSteps / payrollWorkflow.length) * 100;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in-progress': return <Clock3 className="h-4 w-4 text-blue-600" />;
      case 'pending': return <Clock className="h-4 w-4 text-gray-400" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in-progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getComplianceStatusColor = (status: string, daysUntilDue: number) => {
    if (status === 'overdue') return 'text-red-700 bg-red-100 border-red-200';
    if (status === 'filed') return 'text-green-700 bg-green-100 border-green-200';
    if (daysUntilDue <= 7) return 'text-red-700 bg-red-100 border-red-200';
    if (daysUntilDue <= 30) return 'text-yellow-700 bg-yellow-100 border-yellow-200';
    return 'text-blue-700 bg-blue-100 border-blue-200';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-700 bg-red-100 border-red-200';
      case 'high': return 'text-orange-700 bg-orange-100 border-orange-200';
      case 'medium': return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-green-700 bg-green-100 border-green-200';
      default: return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  const getChangeTypeIcon = (type: string) => {
    switch (type) {
      case 'new-hire': return <Users className="h-4 w-4 text-green-600" />;
      case 'termination': return <Users className="h-4 w-4 text-red-600" />;
      case 'salary-increase': return <TrendingUp className="h-4 w-4 text-blue-600" />;
      case 'bonus': return <DollarSign className="h-4 w-4 text-purple-600" />;
      case 'deduction': return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'adjustment': return <Settings className="h-4 w-4 text-orange-600" />;
      default: return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Calculator className="h-8 w-8 text-blue-600" />
            Payroll Manager Dashboard
          </h1>
          <p className="text-gray-600 mt-2">
            Payroll accuracy, compliance oversight, and processing workflow management
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            <Target className="h-3 w-3 mr-1" />
            {payrollMetrics.errorRate.current}% Error Rate
          </Badge>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Pre-Payroll Workflow Status */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="h-6 w-6" />
              Current Payroll Run - August 2024
            </span>
            <div className="flex items-center gap-3">
              <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                Step {payrollWorkflow.findIndex(s => s.status === 'in-progress') + 1} of {payrollWorkflow.length}
              </Badge>
              <span className="text-lg font-bold">{Math.round(getWorkflowProgress())}% Complete</span>
            </div>
          </CardTitle>
          <Progress value={getWorkflowProgress()} className="w-full mt-2" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {payrollWorkflow.map((step, index) => (
              <div key={step.id} className={`p-4 border rounded-lg ${
                step.status === 'in-progress' ? 'border-blue-300 bg-blue-50' : 
                step.status === 'completed' ? 'border-green-300 bg-green-50' : 
                step.status === 'error' ? 'border-red-300 bg-red-50' : 'border-gray-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(step.status)}
                    <span className="font-medium text-sm">{step.title}</span>
                  </div>
                  <Badge className={getStatusColor(step.status)}>
                    {step.status.replace('-', ' ')}
                  </Badge>
                </div>
                <p className="text-xs text-gray-600 mb-2">{step.description}</p>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{step.assignedTo}</span>
                  {step.estimatedTime && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {step.estimatedTime}
                    </span>
                  )}
                </div>
                {step.completedAt && (
                  <div className="text-xs text-green-600 mt-1">
                    Completed: {new Date(step.completedAt).toLocaleString('el-GR')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Time & Attendance Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Time & Attendance Data Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{timeAttendanceData.submissionRate}%</div>
                  <div className="text-sm text-gray-600">Submission Rate</div>
                  <div className="text-xs text-gray-500">{timeAttendanceData.timesheetsSubmitted}/{timeAttendanceData.totalEmployees}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{timeAttendanceData.approvalRate}%</div>
                  <div className="text-sm text-gray-600">Approval Rate</div>
                  <div className="text-xs text-gray-500">{timeAttendanceData.timesheetsApproved}/{timeAttendanceData.timesheetsSubmitted}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{timeAttendanceData.pendingApprovals}</div>
                  <div className="text-sm text-gray-600">Pending Approvals</div>
                  <div className="text-xs text-gray-500">Manager Review</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{timeAttendanceData.exceptionsCount}</div>
                  <div className="text-sm text-gray-600">Exceptions</div>
                  <div className="text-xs text-gray-500">Need Review</div>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-blue-800">Overtime Summary</h4>
                    <p className="text-blue-700 text-sm">
                      {timeAttendanceData.overtimeHours} total overtime hours recorded this period
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-800">{timeAttendanceData.overtimeHours}h</div>
                    <div className="text-xs text-blue-600">Est. Cost: €{(timeAttendanceData.overtimeHours * 25).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payroll Changes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Changes to Payroll Since Last Run
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {payrollChanges.map((change) => (
                  <div key={change.id} className={`p-4 border rounded-lg ${
                    change.status === 'pending' ? 'border-yellow-300 bg-yellow-50' : 'border-green-300 bg-green-50'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        {getChangeTypeIcon(change.type)}
                        <div>
                          <h4 className="font-semibold text-sm">{change.employeeName}</h4>
                          <p className="text-xs text-gray-600">{change.department}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {change.amount && (
                          <div className="font-medium text-sm">€{change.amount.toLocaleString()}</div>
                        )}
                        <Badge className={change.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                        'bg-green-100 text-green-800 border-green-200'}>
                          {change.status}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm mb-2">{change.description}</p>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Effective: {new Date(change.effectiveDate).toLocaleDateString('el-GR')}</span>
                      <span>Approved by: {change.approvedBy}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Payroll Health Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Payroll Health & Accuracy Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Error Rate */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Target className="h-5 w-5 text-red-600" />
                    <span className="text-sm font-medium">Error Rate</span>
                  </div>
                  <div className="text-3xl font-bold text-red-600 mb-1">
                    {payrollMetrics.errorRate.current}%
                  </div>
                  <div className="flex items-center justify-center gap-1 text-sm">
                    <ArrowDown className="h-3 w-3 text-green-600" />
                    <span className="text-green-600">
                      -{(payrollMetrics.errorRate.previous - payrollMetrics.errorRate.current).toFixed(1)}% vs last run
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Target: {payrollMetrics.errorRate.target}%</div>
                  <Progress 
                    value={(payrollMetrics.errorRate.target / payrollMetrics.errorRate.current) * 100} 
                    className="w-full mt-2" 
                  />
                </div>

                {/* Total Cost Variance */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <DollarSign className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium">Cost Variance</span>
                  </div>
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    {payrollMetrics.totalCost.variancePercent > 0 ? '+' : ''}{payrollMetrics.totalCost.variancePercent}%
                  </div>
                  <div className="flex items-center justify-center gap-1 text-sm">
                    {payrollMetrics.totalCost.variancePercent > 0 ? 
                      <ArrowUp className="h-3 w-3 text-red-600" /> : 
                      <ArrowDown className="h-3 w-3 text-green-600" />
                    }
                    <span className={payrollMetrics.totalCost.variancePercent > 0 ? 'text-red-600' : 'text-green-600'}>
                      €{Math.abs(payrollMetrics.totalCost.variance).toLocaleString()} vs last run
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Current: €{payrollMetrics.totalCost.current.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">
                    Budget: €{payrollMetrics.totalCost.budget.toLocaleString()}
                  </div>
                </div>

                {/* Accuracy Score */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium">Accuracy Score</span>
                  </div>
                  <div className="text-3xl font-bold text-green-600 mb-1">
                    {payrollMetrics.accuracy.calculationAccuracy}%
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>On-time delivery:</span>
                      <span className="font-medium">{payrollMetrics.accuracy.onTimeDelivery}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Compliance score:</span>
                      <span className="font-medium">{payrollMetrics.accuracy.complianceScore}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Deductions Summary */}
              <div className="mt-6 pt-6 border-t">
                <h4 className="font-semibold mb-4">Deductions & Withholdings Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-red-600">
                      €{payrollMetrics.deductions.taxWithholdings.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Tax Withholdings</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">
                      €{payrollMetrics.deductions.socialSecurity.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Social Security</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">
                      €{payrollMetrics.deductions.benefits.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Benefits</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-600">
                      €{payrollMetrics.deductions.garnishments.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Garnishments</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-600">
                      €{payrollMetrics.deductions.other.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Other</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Pending Approvals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Pending Final Approvals
                <Badge variant="destructive" className="ml-auto">
                  {pendingApprovals.filter(a => a.priority === 'critical').length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingApprovals.map((approval) => (
                  <Alert key={approval.id} className={`${getPriorityColor(approval.priority)} border`}>
                    <div className="flex items-start gap-2">
                      <Bell className="h-4 w-4 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h5 className="font-medium text-sm">{approval.category}</h5>
                          <Badge className={getPriorityColor(approval.priority)}>
                            {approval.priority}
                          </Badge>
                        </div>
                        <AlertDescription className="text-xs mb-2">
                          {approval.description}
                        </AlertDescription>
                        {approval.amount && (
                          <div className="text-xs font-medium mb-1">
                            Amount: €{approval.amount.toLocaleString()}
                          </div>
                        )}
                        <div className="text-xs text-gray-500">
                          {approval.estimatedImpact}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          By: {approval.submittedBy} • {approval.submittedDate}
                        </div>
                      </div>
                    </div>
                  </Alert>
                ))}
              </div>
              <Button className="w-full mt-3" size="sm">
                Review All Approvals
              </Button>
            </CardContent>
          </Card>

          {/* Compliance & Filing Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Tax Filing Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {complianceStatus.map((filing) => (
                  <div key={filing.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">{filing.filing}</h4>
                      <Badge className={getComplianceStatusColor(filing.status, filing.daysUntilDue)}>
                        {filing.status === 'filed' ? 'Υποβλήθηκε' : 
                         filing.status === 'pending' ? 'Εκκρεμεί' :
                         filing.status === 'draft' ? 'Προσχέδιο' : 'Καθυστέρηση'}
                      </Badge>
                    </div>
                    
                    <div className="text-xs text-gray-600 space-y-1">
                      <div className="flex justify-between">
                        <span>Due Date:</span>
                        <span className="font-medium">
                          {new Date(filing.dueDate).toLocaleDateString('el-GR')}
                        </span>
                      </div>
                      {filing.amount && (
                        <div className="flex justify-between">
                          <span>Amount:</span>
                          <span className="font-medium text-green-600">
                            €{filing.amount.toLocaleString()}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Days Until Due:</span>
                        <span className={`font-medium ${
                          filing.daysUntilDue <= 7 ? 'text-red-600' :
                          filing.daysUntilDue <= 30 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {filing.daysUntilDue} days
                        </span>
                      </div>
                      {filing.lastFiled && (
                        <div className="flex justify-between">
                          <span>Last Filed:</span>
                          <span className="text-green-600">
                            {new Date(filing.lastFiled).toLocaleDateString('el-GR')}
                          </span>
                        </div>
                      )}
                    </div>

                    {filing.status !== 'filed' && filing.daysUntilDue <= 30 && (
                      <Button variant="outline" size="sm" className="w-full mt-2">
                        {filing.status === 'draft' ? 'Complete Filing' : 'Start Filing'}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline">
                <Eye className="h-4 w-4 mr-2" />
                View Payroll Summary
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Generate Reports
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Payroll Settings
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Audit Trail
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}