import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SeveranceCalculator } from '@/components/SeveranceCalculator';
import { SeveranceWizard } from '@/components/SeveranceWizard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import {
  Calculator,
  FileText,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  Eye,
  Search,
  Filter,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export function SeverancePage() {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [view, setView] = useState<'dashboard' | 'calculator' | 'wizard'>(
    'dashboard'
  );
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch recent severance calculations
  const { data: recentCalculations } = useQuery({
    queryKey: ['/api/severance/recent'],
  });

  // Fetch pending approvals
  const { data: pendingApprovals } = useQuery({
    queryKey: ['/api/severance/pending-approvals'],
  });

  // Fetch eligible employees for severance
  const { data: eligibleEmployees } = useQuery({
    queryKey: ['/api/employees/active'],
  });

  // Handle different view states
  if (view === 'calculator' && selectedEmployeeId) {
    return (
      <div className="p-6">
        <div className="mb-4">
          <Button
            variant="outline"
            onClick={() => {
              setView('dashboard');
              setSelectedEmployeeId('');
            }}
          >
            ← Back to Dashboard
          </Button>
        </div>
        <SeveranceCalculator
          employeeId={selectedEmployeeId}
          onComplete={() => {
            setView('dashboard');
            setSelectedEmployeeId('');
          }}
        />
      </div>
    );
  }

  if (view === 'wizard' && selectedEmployeeId) {
    return (
      <div className="p-6">
        <div className="mb-4">
          <Button
            variant="outline"
            onClick={() => {
              setView('dashboard');
              setSelectedEmployeeId('');
            }}
          >
            ← Back to Dashboard
          </Button>
        </div>
        <SeveranceWizard
          employeeId={selectedEmployeeId}
          onComplete={() => {
            setView('dashboard');
            setSelectedEmployeeId('');
          }}
          onCancel={() => {
            setView('dashboard');
            setSelectedEmployeeId('');
          }}
        />
      </div>
    );
  }

  // Main dashboard view
  const filteredEmployees =
    eligibleEmployees?.filter(
      (employee: any) =>
        employee.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.employeeId?.includes(searchTerm)
    ) || [];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Severance & Final Pay</h1>
            <p className="text-muted-foreground">
              Greek Labor Law 4093/2012 compliant calculations
            </p>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">This Month</p>
                  <p className="text-2xl font-bold">12</p>
                  <p className="text-xs text-green-600">+2 from last month</p>
                </div>
                <Calculator className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Pending Approval
                  </p>
                  <p className="text-2xl font-bold">
                    {pendingApprovals?.length || 0}
                  </p>
                  <p className="text-xs text-orange-600">Requires review</p>
                </div>
                <Clock className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-2xl font-bold">€45,230</p>
                  <p className="text-xs text-muted-foreground">This quarter</p>
                </div>
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Active Employees
                  </p>
                  <p className="text-2xl font-bold">
                    {eligibleEmployees?.length || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Eligible for severance
                  </p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Approvals */}
        {pendingApprovals && pendingApprovals.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Pending Approvals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingApprovals.slice(0, 3).map((approval: any) => (
                  <div
                    key={approval.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                      <div>
                        <div className="font-medium">
                          {approval.employeeName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          €{approval.netTotal?.toFixed(2)} •{' '}
                          {approval.terminationType}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{approval.status}</Badge>
                      <Button size="sm">Review</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Calculations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Recent Calculations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentCalculations && recentCalculations.length > 0 ? (
              <div className="space-y-3">
                {recentCalculations.slice(0, 5).map((calc: any) => (
                  <div
                    key={calc.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <div>
                        <div className="font-medium">{calc.employeeName}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(calc.createdAt).toLocaleDateString()} • €
                          {calc.netTotal?.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="bg-green-50 text-green-700"
                      >
                        {calc.status}
                      </Badge>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No recent calculations found</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Employee Selection */}
        <Card>
          <CardHeader>
            <CardTitle>New Severance Calculation</CardTitle>
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-1" />
                Filter
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {eligibleEmployees && eligibleEmployees.length > 0 ? (
              <div className="grid gap-4">
                {filteredEmployees.slice(0, 10).map((employee: any) => (
                  <div
                    key={employee.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">
                          {employee.name || 'Unknown'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {employee.employeeId} • {employee.position || 'N/A'} •
                          Hired:{' '}
                          {employee.hireDate
                            ? new Date(employee.hireDate).toLocaleDateString()
                            : 'N/A'}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          setSelectedEmployeeId(employee.id);
                          setView('wizard');
                        }}
                        size="sm"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        New Calculation
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedEmployeeId(employee.id);
                          setView('calculator');
                        }}
                        size="sm"
                      >
                        <Calculator className="w-4 h-4 mr-1" />
                        Quick Calc
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No active employees found</p>
                <p className="text-sm">Check employee status or contact HR</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
