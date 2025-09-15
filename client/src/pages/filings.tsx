import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  FileText,
  Upload,
  Download,
  CheckCircle,
  AlertTriangle,
  Clock,
  Building,
  Shield,
  Target,
  Calendar,
  RefreshCw,
} from 'lucide-react';

export default function Filings() {
  const filingQueues = [
    {
      system: 'ERGANI II',
      icon: Shield,
      pending: 12,
      submitted: 156,
      errors: 2,
      lastSync: '5 minutes ago',
      status: 'active',
      types: ['Hires', 'Schedules', 'OT', 'Changes', 'Terminations'],
    },
    {
      system: 'e-EFKA / APD',
      icon: Building,
      pending: 3,
      submitted: 89,
      errors: 0,
      lastSync: '12 minutes ago',
      status: 'active',
      types: ['Monthly Returns', 'Contributions', 'Declarations'],
    },
    {
      system: 'AADE / ΦΜΥ',
      icon: Target,
      pending: 1,
      submitted: 24,
      errors: 1,
      lastSync: '1 hour ago',
      status: 'warning',
      types: ['Tax Returns', 'Withholdings', 'Declarations'],
    },
  ];

  const recentFilings = [
    {
      id: 1,
      system: 'ERGANI II',
      type: 'Schedule Changes',
      employees: 8,
      submittedAt: '2025-01-19 14:30',
      status: 'submitted',
      receipt: 'ERG-2025-001234',
      processingTime: '2.3s',
    },
    {
      id: 2,
      system: 'e-EFKA',
      type: 'New Hire Declaration',
      employees: 1,
      submittedAt: '2025-01-19 11:15',
      status: 'accepted',
      receipt: 'EFK-2025-005678',
      processingTime: '4.1s',
    },
    {
      id: 3,
      system: 'AADE',
      type: 'Monthly Tax Return',
      employees: 152,
      submittedAt: '2025-01-15 16:45',
      status: 'error',
      receipt: 'AAD-2025-009876',
      processingTime: 'timeout',
      error: 'Validation failed: Missing AMKA for 1 employee',
    },
    {
      id: 4,
      system: 'ERGANI II',
      type: 'Overtime Declaration',
      employees: 12,
      submittedAt: '2025-01-19 09:20',
      status: 'accepted',
      receipt: 'ERG-2025-001233',
      processingTime: '1.8s',
    },
  ];

  const inspectorPack = {
    period: 'January 2025',
    employees: 152,
    properties: 1,
    lastGenerated: '2025-01-15 10:30',
    size: '24.7 MB',
    status: 'ready',
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
      case 'submitted':
      case 'ready':
        return 'default';
      case 'active':
        return 'secondary';
      case 'warning':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
      case 'ready':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'submitted':
      case 'active':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Government Filings
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            ERGANI II • e-EFKA/APD • AADE/ΦΜΥ • Inspector Packs
          </p>
        </div>
        <div className="flex gap-2">
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Submit Filings
          </Button>
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync Status
          </Button>
        </div>
      </div>

      {/* Filing Systems Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filingQueues.map((system, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <system.icon className="h-5 w-5" />
                {system.system}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                  <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                    {system.pending}
                  </p>
                  <p className="text-xs text-orange-600">Pending</p>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                    {system.submitted}
                  </p>
                  <p className="text-xs text-green-600">Submitted</p>
                </div>
                <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                  <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                    {system.errors}
                  </p>
                  <p className="text-xs text-red-600">Errors</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status</span>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(system.status)}
                    <Badge variant={getStatusColor(system.status)}>
                      {system.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Last Sync
                  </span>
                  <span className="text-sm">{system.lastSync}</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Filing Types</h4>
                <div className="flex flex-wrap gap-1">
                  {system.types.map((type, typeIndex) => (
                    <Badge
                      key={typeIndex}
                      variant="outline"
                      className="text-xs"
                    >
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1">
                  <FileText className="h-3 w-3 mr-1" />
                  View Queue
                </Button>
                <Button size="sm" variant="outline" className="flex-1">
                  <Upload className="h-3 w-3 mr-1" />
                  Submit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Filings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Filing Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentFilings.map(filing => (
              <div
                key={filing.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {filing.system}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {filing.type}
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="text-xs text-gray-500">EMPLOYEES</p>
                    <p className="text-sm font-medium">{filing.employees}</p>
                  </div>

                  <div className="text-center">
                    <p className="text-xs text-gray-500">SUBMITTED</p>
                    <p className="text-sm">{filing.submittedAt}</p>
                  </div>

                  <div className="text-center">
                    <p className="text-xs text-gray-500">PROCESSING TIME</p>
                    <p className="text-sm font-mono">{filing.processingTime}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-xs text-gray-500">RECEIPT</p>
                    <p className="text-sm font-mono">{filing.receipt}</p>
                  </div>

                  <div className="flex items-center gap-1">
                    {getStatusIcon(filing.status)}
                    <Badge variant={getStatusColor(filing.status)}>
                      {filing.status.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Download className="h-3 w-3 mr-1" />
                      Receipt
                    </Button>
                    {filing.status === 'error' && (
                      <Button size="sm" variant="destructive">
                        View Error
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Inspector Pack */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Inspector Export Pack
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold">
                One-Click Export for Inspections
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Coverage Period
                  </span>
                  <span className="text-sm font-medium">
                    {inspectorPack.period}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Employees Included
                  </span>
                  <span className="text-sm font-medium">
                    {inspectorPack.employees}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Properties
                  </span>
                  <span className="text-sm font-medium">
                    {inspectorPack.properties}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Package Size
                  </span>
                  <span className="text-sm font-medium">
                    {inspectorPack.size}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Last Generated
                  </span>
                  <span className="text-sm">{inspectorPack.lastGenerated}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Export Contents</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span>Employee contracts & documentation</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span>Time & attendance records</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span>Payroll calculations & slips</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span>Government filing receipts</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span>Compliance audit trail</span>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button className="flex-1">
                  <Download className="h-3 w-3 mr-1" />
                  Download Current
                </Button>
                <Button variant="outline" className="flex-1">
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Regenerate
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filing Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Success Rate</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                  98.7%
                </p>
                <p className="text-xs text-gray-500">This month</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Upload className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Total Submissions</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  269
                </p>
                <p className="text-xs text-gray-500">This month</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Avg Response Time</p>
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                  2.8s
                </p>
                <p className="text-xs text-gray-500">Government APIs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Shield className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Compliance Score</p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                  100%
                </p>
                <p className="text-xs text-gray-500">All requirements met</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
