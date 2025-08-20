import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  GavelIcon, 
  PlusIcon, 
  CalculatorIcon, 
  PauseIcon, 
  PlayIcon,
  AlertCircleIcon,
  DollarSignIcon,
  ClockIcon,
  FileTextIcon 
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
}

interface GarnishmentOrder {
  id: string;
  employeeId: string;
  orderNumber: string;
  creditorName: string;
  creditorAccountCode?: string;
  orderType: string;
  priority: number;
  status: string;
  deductionType: string;
  deductionAmount?: number;
  deductionPercentage?: number;
  maximumAmount?: number;
  totalOrderAmount?: number;
  currentBalance: number;
  totalDeducted: number;
  protectedNetAmount?: number;
  protectedPercentage?: number;
  courtName?: string;
  orderDate: string;
  effectiveDate: string;
  expirationDate?: string;
  createdAt: string;
  notes?: string;
}

interface GarnishmentTransaction {
  id: string;
  garnishmentOrderId: string;
  employeeId: string;
  payrollRunId?: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  grossPay: number;
  disposableIncome: number;
  calculatedAmount: number;
  deductedAmount: number;
  carriedForwardAmount: number;
  netPayBeforeGarnishment: number;
  protectedAmount: number;
  netPayAfterGarnishment: number;
  status: string;
  processedAt: string;
}

interface GarnishmentCalculationResult {
  totalGarnishmentAmount: number;
  netPayAfterGarnishments: number;
  garnishmentDetails: Array<{
    garnishmentId: string;
    orderNumber: string;
    creditorName: string;
    calculatedAmount: number;
    deductedAmount: number;
    carriedForwardAmount: number;
    protectedAmount: number;
    calculationMethod: string;
    glAccount: string;
  }>;
  protectionSummary: {
    totalProtectedAmount: number;
    netPayFloorApplied: boolean;
    carriedForwardTotal: number;
  };
  calculationLog: string[];
}

const orderTypes = [
  { value: 'child_support', label: 'Child Support' },
  { value: 'tax_levy', label: 'Tax Levy' },
  { value: 'wage_garnishment', label: 'Wage Garnishment' },
  { value: 'student_loan', label: 'Student Loan' },
];

const deductionTypes = [
  { value: 'fixed_amount', label: 'Fixed Amount' },
  { value: 'percentage', label: 'Percentage' },
  { value: 'percentage_with_cap', label: 'Percentage with Cap' },
];

export default function GarnishmentPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showNewOrderForm, setShowNewOrderForm] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  
  // New order form state
  const [orderForm, setOrderForm] = useState({
    orderNumber: '',
    creditorName: '',
    creditorAccountCode: '',
    orderType: '',
    priority: 1,
    deductionType: '',
    deductionAmount: '',
    deductionPercentage: '',
    maximumAmount: '',
    totalOrderAmount: '',
    protectedNetAmount: '',
    protectedPercentage: '',
    courtName: '',
    orderDate: '',
    effectiveDate: '',
    expirationDate: '',
    notes: ''
  });

  // Calculator form state
  const [calculatorForm, setCalculatorForm] = useState({
    grossPay: '',
    disposableIncome: '',
    netPayBeforeGarnishments: '',
    payPeriodStart: '',
    payPeriodEnd: ''
  });

  // Fetch employees
  const { data: employees } = useQuery({
    queryKey: ['/api/employees/active']
  });

  // Fetch garnishments for selected employee
  const { data: garnishments, refetch: refetchGarnishments } = useQuery({
    queryKey: ['/api/garnishments', selectedEmployee?.id],
    enabled: !!selectedEmployee?.id
  });

  // Fetch transaction history
  const { data: transactions } = useQuery({
    queryKey: ['/api/garnishments', selectedEmployee?.id, 'transactions'],
    enabled: !!selectedEmployee?.id
  });

  // Create garnishment order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      return await apiRequest('/api/garnishments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...orderData,
          employeeId: selectedEmployee?.id,
          orderDate: new Date(orderData.orderDate),
          effectiveDate: new Date(orderData.effectiveDate),
          expirationDate: orderData.expirationDate ? new Date(orderData.expirationDate) : null
        })
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Garnishment order created successfully"
      });
      setShowNewOrderForm(false);
      setOrderForm({
        orderNumber: '',
        creditorName: '',
        creditorAccountCode: '',
        orderType: '',
        priority: 1,
        deductionType: '',
        deductionAmount: '',
        deductionPercentage: '',
        maximumAmount: '',
        totalOrderAmount: '',
        protectedNetAmount: '',
        protectedPercentage: '',
        courtName: '',
        orderDate: '',
        effectiveDate: '',
        expirationDate: '',
        notes: ''
      });
      refetchGarnishments();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create garnishment order",
        variant: "destructive"
      });
    }
  });

  // Calculate garnishments mutation
  const calculateMutation = useMutation({
    mutationFn: async (calculationData: any) => {
      return await apiRequest('/api/garnishments/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(calculationData)
      });
    },
    onError: (error: any) => {
      toast({
        title: "Calculation Error",
        description: error.message || "Failed to calculate garnishments",
        variant: "destructive"
      });
    }
  });

  // Suspend/Reactivate garnishment mutations
  const suspendMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      return await apiRequest(`/api/garnishments/${id}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Garnishment order suspended" });
      refetchGarnishments();
    }
  });

  const reactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/garnishments/${id}/reactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Garnishment order reactivated" });
      refetchGarnishments();
    }
  });

  const handleCreateOrder = () => {
    if (!selectedEmployee) {
      toast({
        title: "Error",
        description: "Please select an employee first",
        variant: "destructive"
      });
      return;
    }

    // Convert string values to numbers where appropriate
    const formData = {
      ...orderForm,
      priority: Number(orderForm.priority),
      deductionAmount: orderForm.deductionAmount ? Number(orderForm.deductionAmount) : undefined,
      deductionPercentage: orderForm.deductionPercentage ? Number(orderForm.deductionPercentage) : undefined,
      maximumAmount: orderForm.maximumAmount ? Number(orderForm.maximumAmount) : undefined,
      totalOrderAmount: orderForm.totalOrderAmount ? Number(orderForm.totalOrderAmount) : undefined,
      protectedNetAmount: orderForm.protectedNetAmount ? Number(orderForm.protectedNetAmount) : undefined,
      protectedPercentage: orderForm.protectedPercentage ? Number(orderForm.protectedPercentage) : undefined,
    };

    createOrderMutation.mutate(formData);
  };

  const handleCalculate = () => {
    if (!selectedEmployee || !garnishments?.data?.length) {
      toast({
        title: "Error",
        description: "Please select an employee with active garnishments",
        variant: "destructive"
      });
      return;
    }

    const calculationData = {
      employeeId: selectedEmployee.id,
      grossPay: Number(calculatorForm.grossPay),
      disposableIncome: Number(calculatorForm.disposableIncome),
      netPayBeforeGarnishments: Number(calculatorForm.netPayBeforeGarnishments),
      payPeriodStart: calculatorForm.payPeriodStart,
      payPeriodEnd: calculatorForm.payPeriodEnd,
      activeGarnishments: garnishments.data.map((g: GarnishmentOrder) => ({
        id: g.id,
        orderNumber: g.orderNumber,
        creditorName: g.creditorName,
        orderType: g.orderType,
        priority: g.priority,
        deductionType: g.deductionType,
        deductionAmount: g.deductionAmount,
        deductionPercentage: g.deductionPercentage,
        maximumAmount: g.maximumAmount,
        protectedNetAmount: g.protectedNetAmount,
        protectedPercentage: g.protectedPercentage,
        currentBalance: g.currentBalance,
        carriedForwardAmount: 0 // Would come from balance records in real implementation
      }))
    };

    calculateMutation.mutate(calculationData);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'suspended': return 'secondary';
      case 'satisfied': return 'outline';
      case 'terminated': return 'destructive';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority === 1) return 'text-red-600 font-bold';
    if (priority === 2) return 'text-orange-600 font-semibold';
    return 'text-gray-600';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <GavelIcon className="h-8 w-8" />
            Garnishments & Court Orders
          </h1>
          <p className="text-gray-600 mt-1">
            Manage court-ordered deductions with legal compliance and net pay protection
          </p>
        </div>
      </div>

      {/* Employee Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Selection</CardTitle>
          <CardDescription>
            Select an employee to view and manage their garnishment orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedEmployee?.id || ''}
            onValueChange={(value) => {
              const employee = employees?.data?.find((e: Employee) => e.id === value);
              setSelectedEmployee(employee || null);
            }}
          >
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Select an employee..." />
            </SelectTrigger>
            <SelectContent>
              {employees?.map((employee: Employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.firstName} {employee.lastName} ({employee.employeeId})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedEmployee && (
        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="orders">Active Orders</TabsTrigger>
            <TabsTrigger value="calculator">Calculator</TabsTrigger>
            <TabsTrigger value="transactions">History</TabsTrigger>
            <TabsTrigger value="new-order">New Order</TabsTrigger>
          </TabsList>

          {/* Active Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                Active Garnishments for {selectedEmployee.firstName} {selectedEmployee.lastName}
              </h2>
            </div>

            {garnishments?.length === 0 ? (
              <Alert>
                <AlertCircleIcon className="h-4 w-4" />
                <AlertDescription>
                  No active garnishment orders found for this employee.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid gap-4">
                {garnishments?.map((garnishment: GarnishmentOrder) => (
                  <Card key={garnishment.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          Order #{garnishment.orderNumber}
                          <Badge variant={getStatusBadgeVariant(garnishment.status)}>
                            {garnishment.status}
                          </Badge>
                        </CardTitle>
                        <div className="flex gap-2">
                          {garnishment.status === 'active' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => suspendMutation.mutate({ 
                                id: garnishment.id, 
                                reason: 'Suspended via admin panel' 
                              })}
                            >
                              <PauseIcon className="h-4 w-4 mr-1" />
                              Suspend
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => reactivateMutation.mutate(garnishment.id)}
                            >
                              <PlayIcon className="h-4 w-4 mr-1" />
                              Reactivate
                            </Button>
                          )}
                        </div>
                      </div>
                      <CardDescription>
                        {garnishment.creditorName} • {garnishment.orderType.replace('_', ' ')}
                        <span className={`ml-2 ${getPriorityColor(garnishment.priority)}`}>
                          Priority {garnishment.priority}
                        </span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <Label className="text-gray-500">Deduction Type</Label>
                          <p className="font-medium">
                            {garnishment.deductionType === 'fixed_amount' && `$${garnishment.deductionAmount?.toFixed(2)}`}
                            {garnishment.deductionType === 'percentage' && `${garnishment.deductionPercentage}%`}
                            {garnishment.deductionType === 'percentage_with_cap' && 
                              `${garnishment.deductionPercentage}% (max $${garnishment.maximumAmount?.toFixed(2)})`}
                          </p>
                        </div>
                        <div>
                          <Label className="text-gray-500">Total Order Amount</Label>
                          <p className="font-medium">
                            ${garnishment.totalOrderAmount?.toFixed(2) || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-gray-500">Current Balance</Label>
                          <p className="font-medium">${garnishment.currentBalance.toFixed(2)}</p>
                        </div>
                        <div>
                          <Label className="text-gray-500">Total Deducted</Label>
                          <p className="font-medium">${garnishment.totalDeducted.toFixed(2)}</p>
                        </div>
                        <div>
                          <Label className="text-gray-500">Effective Date</Label>
                          <p className="font-medium">
                            {new Date(garnishment.effectiveDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <Label className="text-gray-500">Court</Label>
                          <p className="font-medium">{garnishment.courtName || 'N/A'}</p>
                        </div>
                        {garnishment.expirationDate && (
                          <div>
                            <Label className="text-gray-500">Expiration</Label>
                            <p className="font-medium">
                              {new Date(garnishment.expirationDate).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                        {(garnishment.protectedNetAmount || garnishment.protectedPercentage) && (
                          <div>
                            <Label className="text-gray-500">Protection</Label>
                            <p className="font-medium">
                              {garnishment.protectedNetAmount && `$${garnishment.protectedNetAmount.toFixed(2)}`}
                              {garnishment.protectedPercentage && `${garnishment.protectedPercentage}%`}
                            </p>
                          </div>
                        )}
                      </div>
                      {garnishment.notes && (
                        <div className="mt-4">
                          <Label className="text-gray-500">Notes</Label>
                          <p className="text-sm bg-gray-50 p-2 rounded mt-1">{garnishment.notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Calculator Tab */}
          <TabsContent value="calculator" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalculatorIcon className="h-5 w-5" />
                  Garnishment Calculator
                </CardTitle>
                <CardDescription>
                  Test garnishment calculations with net pay protection
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="grossPay">Gross Pay</Label>
                    <Input
                      id="grossPay"
                      type="number"
                      step="0.01"
                      placeholder="2500.00"
                      value={calculatorForm.grossPay}
                      onChange={(e) => setCalculatorForm({ ...calculatorForm, grossPay: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="disposableIncome">Disposable Income</Label>
                    <Input
                      id="disposableIncome"
                      type="number"
                      step="0.01"
                      placeholder="1800.00"
                      value={calculatorForm.disposableIncome}
                      onChange={(e) => setCalculatorForm({ ...calculatorForm, disposableIncome: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="netPayBefore">Net Pay Before Garnishments</Label>
                    <Input
                      id="netPayBefore"
                      type="number"
                      step="0.01"
                      placeholder="1950.00"
                      value={calculatorForm.netPayBeforeGarnishments}
                      onChange={(e) => setCalculatorForm({ ...calculatorForm, netPayBeforeGarnishments: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="payPeriodStart">Pay Period Start</Label>
                    <Input
                      id="payPeriodStart"
                      type="date"
                      value={calculatorForm.payPeriodStart}
                      onChange={(e) => setCalculatorForm({ ...calculatorForm, payPeriodStart: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="payPeriodEnd">Pay Period End</Label>
                    <Input
                      id="payPeriodEnd"
                      type="date"
                      value={calculatorForm.payPeriodEnd}
                      onChange={(e) => setCalculatorForm({ ...calculatorForm, payPeriodEnd: e.target.value })}
                    />
                  </div>
                </div>

                <Button onClick={handleCalculate} disabled={calculateMutation.isPending}>
                  {calculateMutation.isPending ? 'Calculating...' : 'Calculate Garnishments'}
                </Button>

                {calculateMutation.data && (
                  <div className="mt-6 space-y-4">
                    <Separator />
                    <h3 className="text-lg font-semibold">Calculation Results</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                              ${calculateMutation.data.totalGarnishmentAmount.toFixed(2)}
                            </div>
                            <div className="text-sm text-gray-600">Total Garnishments</div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold">
                              ${calculateMutation.data.netPayAfterGarnishments.toFixed(2)}
                            </div>
                            <div className="text-sm text-gray-600">Final Net Pay</div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                              ${calculateMutation.data.protectionSummary.carriedForwardTotal.toFixed(2)}
                            </div>
                            <div className="text-sm text-gray-600">Carried Forward</div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Garnishment Details */}
                    <div>
                      <h4 className="font-semibold mb-2">Garnishment Breakdown</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Order #</TableHead>
                            <TableHead>Creditor</TableHead>
                            <TableHead>Calculated</TableHead>
                            <TableHead>Deducted</TableHead>
                            <TableHead>Protected</TableHead>
                            <TableHead>Carried Forward</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {calculateMutation.data.garnishmentDetails.map((detail: any) => (
                            <TableRow key={detail.garnishmentId}>
                              <TableCell>{detail.orderNumber}</TableCell>
                              <TableCell>{detail.creditorName}</TableCell>
                              <TableCell>${detail.calculatedAmount.toFixed(2)}</TableCell>
                              <TableCell>${detail.deductedAmount.toFixed(2)}</TableCell>
                              <TableCell>${detail.protectedAmount.toFixed(2)}</TableCell>
                              <TableCell>${detail.carriedForwardAmount.toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Calculation Log */}
                    <div>
                      <h4 className="font-semibold mb-2">Calculation Log</h4>
                      <div className="bg-gray-50 p-4 rounded text-sm font-mono max-h-64 overflow-y-auto">
                        {calculateMutation.data.calculationLog.map((log: string, index: number) => (
                          <div key={index} className="mb-1">{log}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transaction History Tab */}
          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClockIcon className="h-5 w-5" />
                  Transaction History
                </CardTitle>
                <CardDescription>
                  Historical garnishment deductions and processing details
                </CardDescription>
              </CardHeader>
              <CardContent>
                {transactions?.length === 0 ? (
                  <Alert>
                    <AlertCircleIcon className="h-4 w-4" />
                    <AlertDescription>
                      No garnishment transactions found for this employee.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pay Period</TableHead>
                        <TableHead>Order #</TableHead>
                        <TableHead>Gross Pay</TableHead>
                        <TableHead>Calculated</TableHead>
                        <TableHead>Deducted</TableHead>
                        <TableHead>Net After</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions?.map((transaction: GarnishmentTransaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            {new Date(transaction.payPeriodStart).toLocaleDateString()} - {' '}
                            {new Date(transaction.payPeriodEnd).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {transaction.garnishmentOrderId.slice(-8)}
                          </TableCell>
                          <TableCell>${transaction.grossPay.toFixed(2)}</TableCell>
                          <TableCell>${transaction.calculatedAmount.toFixed(2)}</TableCell>
                          <TableCell className="font-semibold">
                            ${transaction.deductedAmount.toFixed(2)}
                          </TableCell>
                          <TableCell>${transaction.netPayAfterGarnishment.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={transaction.status === 'processed' ? 'default' : 'secondary'}>
                              {transaction.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(transaction.processedAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* New Order Tab */}
          <TabsContent value="new-order" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PlusIcon className="h-5 w-5" />
                  Create New Garnishment Order
                </CardTitle>
                <CardDescription>
                  Add a new court-ordered garnishment for {selectedEmployee.firstName} {selectedEmployee.lastName}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="orderNumber">Order Number *</Label>
                    <Input
                      id="orderNumber"
                      placeholder="CO-2024-12345"
                      value={orderForm.orderNumber}
                      onChange={(e) => setOrderForm({ ...orderForm, orderNumber: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="creditorName">Creditor Name *</Label>
                    <Input
                      id="creditorName"
                      placeholder="IRS, Child Support Division, etc."
                      value={orderForm.creditorName}
                      onChange={(e) => setOrderForm({ ...orderForm, creditorName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="orderType">Order Type *</Label>
                    <Select
                      value={orderForm.orderType}
                      onValueChange={(value) => setOrderForm({ ...orderForm, orderType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select order type..." />
                      </SelectTrigger>
                      <SelectContent>
                        {orderTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="priority">Priority (1=Highest) *</Label>
                    <Input
                      id="priority"
                      type="number"
                      min="1"
                      max="10"
                      value={orderForm.priority}
                      onChange={(e) => setOrderForm({ ...orderForm, priority: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="deductionType">Deduction Type *</Label>
                    <Select
                      value={orderForm.deductionType}
                      onValueChange={(value) => setOrderForm({ ...orderForm, deductionType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select deduction type..." />
                      </SelectTrigger>
                      <SelectContent>
                        {deductionTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {orderForm.deductionType === 'fixed_amount' && (
                    <div>
                      <Label htmlFor="deductionAmount">Deduction Amount ($) *</Label>
                      <Input
                        id="deductionAmount"
                        type="number"
                        step="0.01"
                        placeholder="250.00"
                        value={orderForm.deductionAmount}
                        onChange={(e) => setOrderForm({ ...orderForm, deductionAmount: e.target.value })}
                      />
                    </div>
                  )}
                  
                  {(orderForm.deductionType === 'percentage' || orderForm.deductionType === 'percentage_with_cap') && (
                    <>
                      <div>
                        <Label htmlFor="deductionPercentage">Deduction Percentage (%) *</Label>
                        <Input
                          id="deductionPercentage"
                          type="number"
                          step="0.01"
                          max="100"
                          placeholder="25.00"
                          value={orderForm.deductionPercentage}
                          onChange={(e) => setOrderForm({ ...orderForm, deductionPercentage: e.target.value })}
                        />
                      </div>
                      {orderForm.deductionType === 'percentage_with_cap' && (
                        <div>
                          <Label htmlFor="maximumAmount">Maximum Amount per Period ($)</Label>
                          <Input
                            id="maximumAmount"
                            type="number"
                            step="0.01"
                            placeholder="500.00"
                            value={orderForm.maximumAmount}
                            onChange={(e) => setOrderForm({ ...orderForm, maximumAmount: e.target.value })}
                          />
                        </div>
                      )}
                    </>
                  )}
                  
                  <div>
                    <Label htmlFor="totalOrderAmount">Total Order Amount ($)</Label>
                    <Input
                      id="totalOrderAmount"
                      type="number"
                      step="0.01"
                      placeholder="5000.00"
                      value={orderForm.totalOrderAmount}
                      onChange={(e) => setOrderForm({ ...orderForm, totalOrderAmount: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="courtName">Court Name</Label>
                    <Input
                      id="courtName"
                      placeholder="Superior Court of County"
                      value={orderForm.courtName}
                      onChange={(e) => setOrderForm({ ...orderForm, courtName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="orderDate">Order Date *</Label>
                    <Input
                      id="orderDate"
                      type="date"
                      value={orderForm.orderDate}
                      onChange={(e) => setOrderForm({ ...orderForm, orderDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="effectiveDate">Effective Date *</Label>
                    <Input
                      id="effectiveDate"
                      type="date"
                      value={orderForm.effectiveDate}
                      onChange={(e) => setOrderForm({ ...orderForm, effectiveDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="expirationDate">Expiration Date</Label>
                    <Input
                      id="expirationDate"
                      type="date"
                      value={orderForm.expirationDate}
                      onChange={(e) => setOrderForm({ ...orderForm, expirationDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="creditorAccountCode">GL Account Code</Label>
                    <Input
                      id="creditorAccountCode"
                      placeholder="2200-GARNISHMENT"
                      value={orderForm.creditorAccountCode}
                      onChange={(e) => setOrderForm({ ...orderForm, creditorAccountCode: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="protectedNetAmount">Protected Net Amount ($)</Label>
                    <Input
                      id="protectedNetAmount"
                      type="number"
                      step="0.01"
                      placeholder="435.00"
                      value={orderForm.protectedNetAmount}
                      onChange={(e) => setOrderForm({ ...orderForm, protectedNetAmount: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="protectedPercentage">Protected Percentage (%)</Label>
                    <Input
                      id="protectedPercentage"
                      type="number"
                      step="0.01"
                      max="100"
                      placeholder="75.00"
                      value={orderForm.protectedPercentage}
                      onChange={(e) => setOrderForm({ ...orderForm, protectedPercentage: e.target.value })}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional notes about this garnishment order..."
                    value={orderForm.notes}
                    onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => {
                    setOrderForm({
                      orderNumber: '',
                      creditorName: '',
                      creditorAccountCode: '',
                      orderType: '',
                      priority: 1,
                      deductionType: '',
                      deductionAmount: '',
                      deductionPercentage: '',
                      maximumAmount: '',
                      totalOrderAmount: '',
                      protectedNetAmount: '',
                      protectedPercentage: '',
                      courtName: '',
                      orderDate: '',
                      effectiveDate: '',
                      expirationDate: '',
                      notes: ''
                    });
                  }}>
                    Reset Form
                  </Button>
                  <Button 
                    onClick={handleCreateOrder} 
                    disabled={createOrderMutation.isPending}
                  >
                    {createOrderMutation.isPending ? 'Creating...' : 'Create Order'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}