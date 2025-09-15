import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  UserMinus,
  FileText,
  Calculator,
  AlertTriangle,
  Clock,
  CheckCircle,
  Euro,
  Calendar,
} from 'lucide-react';

export default function Exits() {
  const exitCases = [
    {
      id: 1,
      employeeName: 'Kostas Dimitriou',
      position: 'Night Auditor',
      exitType: 'resignation',
      lastWorkDay: '2025-01-31',
      finalPayStatus: 'pending_calculation',
      documentsStatus: 'complete',
      exitInterviewStatus: 'scheduled',
      accrualedLeave: 12.5,
      finalPayAmount: 2450.8,
      urgency: 'high',
    },
    {
      id: 2,
      employeeName: 'Sofia Papadaki',
      position: 'Restaurant Manager',
      exitType: 'termination',
      lastWorkDay: '2025-01-20',
      finalPayStatus: 'ready_for_payment',
      documentsStatus: 'pending_signature',
      exitInterviewStatus: 'completed',
      accrualedLeave: 18.0,
      finalPayAmount: 4250.15,
      urgency: 'urgent',
    },
    {
      id: 3,
      employeeName: 'Nikos Stavros',
      position: 'Maintenance',
      exitType: 'end_of_contract',
      lastWorkDay: '2025-02-15',
      finalPayStatus: 'not_started',
      documentsStatus: 'not_started',
      exitInterviewStatus: 'not_scheduled',
      accrualedLeave: 8.5,
      finalPayAmount: 0,
      urgency: 'normal',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete':
      case 'completed':
      case 'ready_for_payment':
        return 'default';
      case 'pending_calculation':
      case 'pending_signature':
      case 'scheduled':
        return 'secondary';
      case 'not_started':
      case 'not_scheduled':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'default';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Employee Exits
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Terminations, documents, final pay
          </p>
        </div>
        <div className="flex gap-2">
          <Button>
            <UserMinus className="h-4 w-4 mr-2" />
            Process Exit
          </Button>
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Exit Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Urgent</p>
                <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                  1
                </p>
                <p className="text-xs text-gray-500">Needs attention</p>
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
                <p className="text-sm font-medium">In Progress</p>
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                  2
                </p>
                <p className="text-xs text-gray-500">Active cases</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Euro className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Final Pay Pending</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  €6,700
                </p>
                <p className="text-xs text-gray-500">Total outstanding</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">This Month</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                  7
                </p>
                <p className="text-xs text-gray-500">Completed exits</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Exit Cases */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Active Exit Cases</h2>
        {exitCases.map(employee => (
          <Card key={employee.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {employee.employeeName}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {employee.position}
                    </p>
                  </div>
                  <Badge variant={getUrgencyColor(employee.urgency)}>
                    {employee.urgency.toUpperCase()}
                  </Badge>
                  <Badge variant="outline">
                    {employee.exitType.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">Last Work Day</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {employee.lastWorkDay}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Status Checklist */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Exit Checklist</h4>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Final Pay Calculation</span>
                    <Badge
                      variant={getStatusColor(employee.finalPayStatus)}
                      className="text-xs"
                    >
                      {employee.finalPayStatus.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Documents</span>
                    <Badge
                      variant={getStatusColor(employee.documentsStatus)}
                      className="text-xs"
                    >
                      {employee.documentsStatus.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Exit Interview</span>
                    <Badge
                      variant={getStatusColor(employee.exitInterviewStatus)}
                      className="text-xs"
                    >
                      {employee.exitInterviewStatus.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>

                {/* Financial Details */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Financial Summary</h4>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Accrued Leave
                      </span>
                      <span className="text-sm font-medium">
                        {employee.accrualedLeave} days
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Final Pay Amount
                      </span>
                      <span className="text-sm font-medium">
                        {employee.finalPayAmount > 0
                          ? `€${employee.finalPayAmount.toFixed(2)}`
                          : 'TBD'}
                      </span>
                    </div>
                  </div>

                  {employee.finalPayStatus === 'ready_for_payment' && (
                    <Button size="sm" className="w-full">
                      <Euro className="h-3 w-3 mr-1" />
                      Process Payment
                    </Button>
                  )}
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Quick Actions</h4>

                  <div className="space-y-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full justify-start"
                    >
                      <Calculator className="h-3 w-3 mr-2" />
                      Calculate Final Pay
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full justify-start"
                    >
                      <FileText className="h-3 w-3 mr-2" />
                      Generate Documents
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full justify-start"
                    >
                      <Calendar className="h-3 w-3 mr-2" />
                      Schedule Interview
                    </Button>
                  </div>

                  <Button className="w-full mt-3">View Full Case</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Exit Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">
                  Anna Petridou final payment processed
                </span>
              </div>
              <span className="text-xs text-gray-500">2 hours ago</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm">
                  Exit interview completed for Michalis Kouris
                </span>
              </div>
              <span className="text-xs text-gray-500">1 day ago</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span className="text-sm">
                  Documents signed by Eleni Tsiaras
                </span>
              </div>
              <span className="text-xs text-gray-500">2 days ago</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
