import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  User, 
  FileText, 
  Download, 
  Calendar, 
  Clock,
  Euro,
  AlertCircle,
  Shield,
  Eye
} from 'lucide-react';

interface Employee {
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  afm: string;
  amka: string;
  phoneNumber?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  address?: string;
  dateOfBirth?: string;
  hireDate: string;
  position?: string;
  department?: string;
  currentSalary?: number;
  bankAccount?: string;
}

interface Payslip {
  payslipId: string;
  employeeId: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  issueDate: string;
  grossPay: number;
  netPay: number;
  totalTax: number;
  totalInsurance: number;
  status: 'draft' | 'issued' | 'paid';
  payslipPdf?: string;
}

interface TimeEntry {
  id: string;
  employeeId: string;
  clockIn: string;
  clockOut?: string;
  date: string;
  totalHours?: number;
  overtimeHours?: number;
  status: 'pending' | 'approved' | 'rejected';
}

interface ImpersonationAlert {
  isImpersonated: boolean;
  impersonatorName?: string;
  reason?: string;
}

export function EmployeeSelfServicePortal() {
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [impersonationAlert, setImpersonationAlert] = useState<ImpersonationAlert>({ isImpersonated: false });
  const { toast } = useToast();

  // Check for impersonation session
  useEffect(() => {
    const impersonationToken = sessionStorage.getItem('impersonation_token');
    if (impersonationToken) {
      // In a real implementation, you'd decode the token or make an API call
      // to get impersonation details
      setImpersonationAlert({
        isImpersonated: true,
        impersonatorName: 'Admin User',
        reason: 'Troubleshooting payslip access'
      });
    }
  }, []);

  // Queries - All scoped to current employee only
  const { data: employee, isLoading: employeeLoading } = useQuery({
    queryKey: ['/api/employee/profile'],
    enabled: true,
  });

  const { data: payslips = [], isLoading: payslipsLoading } = useQuery({
    queryKey: ['/api/employee/payslips'],
    enabled: true,
  });

  const { data: timeEntries = [], isLoading: timeEntriesLoading } = useQuery({
    queryKey: ['/api/employee/time-entries'],
    enabled: true,
  });

  // Mutations
  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: Partial<Employee>) => {
      return apiRequest('PUT', '/api/employee/profile', profileData);
    },
    onSuccess: () => {
      toast({
        title: 'Profile Updated',
        description: 'Your profile information has been updated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update profile',
        variant: 'destructive',
      });
    },
  });

  const downloadPayslipMutation = useMutation({
    mutationFn: async (payslipId: string) => {
      return apiRequest('GET', `/api/employee/payslips/${payslipId}/download`);
    },
    onSuccess: (data, payslipId) => {
      // Create and trigger download
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payslip-${payslipId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Download Complete',
        description: 'Payslip has been downloaded successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Download Failed',
        description: error.message || 'Failed to download payslip',
        variant: 'destructive',
      });
    },
  });

  if (employeeLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Impersonation Alert */}
      {impersonationAlert.isImpersonated && (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-amber-400 mr-3" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                Administrative View Active
              </p>
              <p className="text-sm text-amber-700">
                {impersonationAlert.impersonatorName} is viewing this portal for: {impersonationAlert.reason}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome, {employee?.firstName} {employee?.lastName}
          </h1>
          <p className="text-muted-foreground">
            Manage your personal information and view payroll details
          </p>
        </div>
        <div className="flex gap-2">
          {impersonationAlert.isImpersonated && (
            <Button 
              variant="outline" 
              onClick={() => {
                sessionStorage.removeItem('impersonation_token');
                window.location.href = '/admin';
              }}
            >
              <Shield className="w-4 h-4 mr-2" />
              Exit Admin View
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="payslips" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Payslips
          </TabsTrigger>
          <TabsTrigger value="timesheet" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Timesheet
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <EmployeeProfileForm 
            employee={employee}
            onUpdate={(data) => updateProfileMutation.mutate(data)}
            isUpdating={updateProfileMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="payslips" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Payslips</CardTitle>
              <CardDescription>
                View and download your payslip history
              </CardDescription>
            </CardHeader>
            <CardContent>
              {payslipsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pay Period</TableHead>
                      <TableHead>Issue Date</TableHead>
                      <TableHead>Gross Pay</TableHead>
                      <TableHead>Net Pay</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payslips.map((payslip: Payslip) => (
                      <TableRow key={payslip.payslipId}>
                        <TableCell>
                          {new Date(payslip.payPeriodStart).toLocaleDateString()} - {' '}
                          {new Date(payslip.payPeriodEnd).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {new Date(payslip.issueDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Euro className="w-4 h-4 mr-1" />
                            {payslip.grossPay.toFixed(2)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center font-medium">
                            <Euro className="w-4 h-4 mr-1" />
                            {payslip.netPay.toFixed(2)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              payslip.status === 'paid' ? 'default' :
                              payslip.status === 'issued' ? 'secondary' : 'outline'
                            }
                          >
                            {payslip.status.charAt(0).toUpperCase() + payslip.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedPayslip(payslip)}
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadPayslipMutation.mutate(payslip.payslipId)}
                              disabled={downloadPayslipMutation.isPending}
                            >
                              <Download className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timesheet" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Time Entries</CardTitle>
              <CardDescription>
                Your recent clock-in and clock-out records
              </CardDescription>
            </CardHeader>
            <CardContent>
              {timeEntriesLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Clock In</TableHead>
                      <TableHead>Clock Out</TableHead>
                      <TableHead>Total Hours</TableHead>
                      <TableHead>Overtime</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timeEntries.map((entry: TimeEntry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          {new Date(entry.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {new Date(entry.clockIn).toLocaleTimeString()}
                        </TableCell>
                        <TableCell>
                          {entry.clockOut 
                            ? new Date(entry.clockOut).toLocaleTimeString()
                            : 'Not clocked out'
                          }
                        </TableCell>
                        <TableCell>
                          {entry.totalHours?.toFixed(2) || '-'} hrs
                        </TableCell>
                        <TableCell>
                          {entry.overtimeHours?.toFixed(2) || '0'} hrs
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              entry.status === 'approved' ? 'default' :
                              entry.status === 'rejected' ? 'destructive' : 'secondary'
                            }
                          >
                            {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payslip Detail Dialog */}
      <Dialog open={!!selectedPayslip} onOpenChange={() => setSelectedPayslip(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payslip Details</DialogTitle>
            <DialogDescription>
              Pay period: {selectedPayslip && new Date(selectedPayslip.payPeriodStart).toLocaleDateString()} - {selectedPayslip && new Date(selectedPayslip.payPeriodEnd).toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>
          {selectedPayslip && (
            <PayslipDetailView payslip={selectedPayslip} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface EmployeeProfileFormProps {
  employee: Employee | null;
  onUpdate: (data: Partial<Employee>) => void;
  isUpdating: boolean;
}

function EmployeeProfileForm({ employee, onUpdate, isUpdating }: EmployeeProfileFormProps) {
  const [formData, setFormData] = useState<Partial<Employee>>({});
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (employee) {
      setFormData(employee);
    }
  }, [employee]);

  const handleSave = () => {
    onUpdate(formData);
    setIsEditing(false);
  };

  if (!employee) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>
              Update your contact information and emergency contacts
            </CardDescription>
          </div>
          <Button
            variant={isEditing ? "default" : "outline"}
            onClick={isEditing ? handleSave : () => setIsEditing(true)}
            disabled={isUpdating}
          >
            {isUpdating ? 'Saving...' : isEditing ? 'Save Changes' : 'Edit Profile'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>First Name</Label>
            <Input
              value={formData.firstName || ''}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label>Last Name</Label>
            <Input
              value={formData.lastName || ''}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              value={formData.email || ''}
              type="email"
              disabled // Email usually can't be changed by employee
            />
          </div>
          <div>
            <Label>Phone Number</Label>
            <Input
              value={formData.phoneNumber || ''}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label>AFM (Tax ID)</Label>
            <Input
              value={formData.afm || ''}
              disabled // AFM can't be changed by employee
            />
          </div>
          <div>
            <Label>AMKA (Social Security)</Label>
            <Input
              value={formData.amka || ''}
              disabled // AMKA can't be changed by employee
            />
          </div>
          <div className="md:col-span-2">
            <Label>Address</Label>
            <Input
              value={formData.address || ''}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label>Emergency Contact</Label>
            <Input
              value={formData.emergencyContact || ''}
              onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label>Emergency Phone</Label>
            <Input
              value={formData.emergencyPhone || ''}
              onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
              disabled={!isEditing}
            />
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-medium mb-3">Employment Information (Read Only)</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Employee ID</Label>
              <Input value={employee.employeeId} disabled />
            </div>
            <div>
              <Label>Position</Label>
              <Input value={employee.position || 'Not specified'} disabled />
            </div>
            <div>
              <Label>Department</Label>
              <Input value={employee.department || 'Not specified'} disabled />
            </div>
            <div>
              <Label>Hire Date</Label>
              <Input 
                value={employee.hireDate ? new Date(employee.hireDate).toLocaleDateString() : ''} 
                disabled 
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface PayslipDetailViewProps {
  payslip: Payslip;
}

function PayslipDetailView({ payslip }: PayslipDetailViewProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium">Gross Pay</Label>
          <div className="text-2xl font-bold flex items-center">
            <Euro className="w-5 h-5 mr-1" />
            {payslip.grossPay.toFixed(2)}
          </div>
        </div>
        <div>
          <Label className="text-sm font-medium">Net Pay</Label>
          <div className="text-2xl font-bold text-green-600 flex items-center">
            <Euro className="w-5 h-5 mr-1" />
            {payslip.netPay.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium">Tax Deductions</Label>
          <div className="text-lg flex items-center text-red-600">
            <Euro className="w-4 h-4 mr-1" />
            {payslip.totalTax.toFixed(2)}
          </div>
        </div>
        <div>
          <Label className="text-sm font-medium">Insurance Contributions</Label>
          <div className="text-lg flex items-center text-red-600">
            <Euro className="w-4 h-4 mr-1" />
            {payslip.totalInsurance.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <div className="flex justify-between items-center">
          <div>
            <Label className="text-sm font-medium">Status</Label>
            <div>
              <Badge
                variant={
                  payslip.status === 'paid' ? 'default' :
                  payslip.status === 'issued' ? 'secondary' : 'outline'
                }
              >
                {payslip.status.charAt(0).toUpperCase() + payslip.status.slice(1)}
              </Badge>
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium">Issue Date</Label>
            <div className="text-sm text-muted-foreground">
              {new Date(payslip.issueDate).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}