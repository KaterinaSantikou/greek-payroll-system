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
  { value: 'wage_garnishment', label: 'Wage Garnishment' },
  { value: 'child_support', label: 'Child Support' },
  { value: 'tax_levy', label: 'Tax Levy' },
  { value: 'court_order', label: 'Court Order' },
  { value: 'other', label: 'Other' },
];

const deductionMethods = [
  { value: 'fixed_amount', label: 'Fixed Amount' },
  { value: 'percent_of_disposable_net', label: 'Percent of Disposable Net' },
];

const applicationScope = [
  { value: 'all_runs', label: 'All runs' },
  { value: 'only_regular', label: 'Only regular' },
  { value: 'only_off_cycle', label: 'Only off-cycle' },
];

export default function GarnishmentPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showNewOrderForm, setShowNewOrderForm] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  
  // New order form state
  const [orderForm, setOrderForm] = useState({
    type: '',
    creditorName: '',
    creditorIban: '',
    orderRef: '',
    caseId: '',
    documentUpload: null as File | null,
    priority: 1,
    startDate: '',
    endDate: '',
    stopAfterBalance: false,
    method: '',
    amount: '',
    percent: '',
    protectedNetFloor: '',
    maxPercentCap: '',
    perRunCap: '',
    totalBalance: '',
    perRunMin: '',
    applyTo: 'all_runs',
    notes: ''
  });
  
  // Preview calculation state
  const [previewData, setPreviewData] = useState<{
    grossPay: number;
    taxes: number;
    contributions: number;
    disposableNet: number;
    proposedDeductions: Array<{ creditor: string; amount: number; }>;
    netRemaining: number;
    belowFloor: boolean;
    cappedAmount: number;
  } | null>(null);

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

    // Validate required fields
    if (!orderForm.type || !orderForm.creditorName || !orderForm.orderRef || 
        !orderForm.method || !orderForm.startDate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (orderForm.method === 'fixed_amount' && !orderForm.amount) {
      toast({
        title: "Error",
        description: "Amount is required for fixed amount method",
        variant: "destructive"
      });
      return;
    }

    if (orderForm.method === 'percent_of_disposable_net' && !orderForm.percent) {
      toast({
        title: "Error",
        description: "Percentage is required for percentage method",
        variant: "destructive"
      });
      return;
    }

    // Convert new form structure to API format
    const formData = {
      orderNumber: orderForm.orderRef,
      creditorName: orderForm.creditorName,
      creditorAccountCode: orderForm.creditorIban || '',
      orderType: orderForm.type,
      priority: Number(orderForm.priority),
      deductionType: orderForm.method,
      deductionAmount: orderForm.method === 'fixed_amount' ? Number(orderForm.amount) : undefined,
      deductionPercentage: orderForm.method === 'percent_of_disposable_net' ? Number(orderForm.percent) : undefined,
      maximumAmount: orderForm.perRunCap ? Number(orderForm.perRunCap) : undefined,
      totalOrderAmount: orderForm.totalBalance ? Number(orderForm.totalBalance) : undefined,
      protectedNetAmount: orderForm.protectedNetFloor ? Number(orderForm.protectedNetFloor) : undefined,
      protectedPercentage: orderForm.maxPercentCap ? Number(orderForm.maxPercentCap) : undefined,
      courtName: orderForm.caseId || '',
      orderDate: orderForm.startDate,
      effectiveDate: orderForm.startDate,
      expirationDate: orderForm.endDate || undefined,
      notes: orderForm.notes || ''
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
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <span>Employee</span>
            <span>→</span>
            <span>Deductions</span>
            <span>→</span>
            <span className="font-medium">New Garnishment</span>
          </div>
          
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
        <Tabs defaultValue="new-order" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="new-order">New Garnishment</TabsTrigger>
            <TabsTrigger value="orders">Active Orders</TabsTrigger>
            <TabsTrigger value="calculator">Calculator</TabsTrigger>
            <TabsTrigger value="transactions">History</TabsTrigger>
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
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Type */}
                  <div>
                    <Label htmlFor="type">Type *</Label>
                    <Select
                      value={orderForm.type}
                      onValueChange={(value) => setOrderForm({ ...orderForm, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select garnishment type..." />
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

                  {/* Priority */}
                  <div>
                    <Label htmlFor="priority">Priority (1 = highest) *</Label>
                    <Input
                      id="priority"
                      type="number"
                      min="1"
                      max="10"
                      value={orderForm.priority}
                      onChange={(e) => setOrderForm({ ...orderForm, priority: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>

                {/* Creditor Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Creditor Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <Label htmlFor="creditorIban">Creditor IBAN (optional)</Label>
                      <Input
                        id="creditorIban"
                        placeholder="GR16 0110 1250 0000 0001 2300 695"
                        value={orderForm.creditorIban}
                        onChange={(e) => setOrderForm({ ...orderForm, creditorIban: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Order Details */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Order Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="orderRef">Order Reference *</Label>
                      <Input
                        id="orderRef"
                        placeholder="CO-2024-12345"
                        value={orderForm.orderRef}
                        onChange={(e) => setOrderForm({ ...orderForm, orderRef: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="caseId">Case ID</Label>
                      <Input
                        id="caseId"
                        placeholder="CASE-789456"
                        value={orderForm.caseId}
                        onChange={(e) => setOrderForm({ ...orderForm, caseId: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="documentUpload">Document Upload (PDF)</Label>
                      <Input
                        id="documentUpload"
                        type="file"
                        accept=".pdf"
                        onChange={(e) => setOrderForm({ ...orderForm, documentUpload: e.target.files?.[0] || null })}
                      />
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Dates</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startDate">Start Date *</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={orderForm.startDate}
                        onChange={(e) => setOrderForm({ ...orderForm, startDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="endDate">End Date</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={orderForm.endDate}
                        onChange={(e) => setOrderForm({ ...orderForm, endDate: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="stopAfterBalance"
                      checked={orderForm.stopAfterBalance}
                      onChange={(e) => setOrderForm({ ...orderForm, stopAfterBalance: e.target.checked })}
                    />
                    <Label htmlFor="stopAfterBalance">Stop after balance = €0</Label>
                  </div>
                </div>

                {/* Deduction Method */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Deduction Method</h3>
                  <div>
                    <Label htmlFor="method">Method *</Label>
                    <Select
                      value={orderForm.method}
                      onValueChange={(value) => setOrderForm({ ...orderForm, method: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select deduction method..." />
                      </SelectTrigger>
                      <SelectContent>
                        {deductionMethods.map((method) => (
                          <SelectItem key={method.value} value={method.value}>
                            {method.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {orderForm.method === 'fixed_amount' && (
                      <div>
                        <Label htmlFor="amount">Amount (€) *</Label>
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          placeholder="150.00"
                          value={orderForm.amount}
                          onChange={(e) => setOrderForm({ ...orderForm, amount: e.target.value })}
                        />
                      </div>
                    )}
                    
                    {orderForm.method === 'percent_of_disposable_net' && (
                      <div>
                        <Label htmlFor="percent">Percent (%) *</Label>
                        <Input
                          id="percent"
                          type="number"
                          step="0.01"
                          max="100"
                          placeholder="20.00"
                          value={orderForm.percent}
                          onChange={(e) => setOrderForm({ ...orderForm, percent: e.target.value })}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Protection & Caps */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Protection & Caps</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="protectedNetFloor">Protected Net Floor (€)</Label>
                      <Input
                        id="protectedNetFloor"
                        type="number"
                        step="0.01"
                        placeholder="800.00"
                        value={orderForm.protectedNetFloor}
                        onChange={(e) => setOrderForm({ ...orderForm, protectedNetFloor: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="maxPercentCap">Max Percent Cap (%)</Label>
                      <Input
                        id="maxPercentCap"
                        type="number"
                        step="0.01"
                        max="100"
                        placeholder="50.00"
                        value={orderForm.maxPercentCap}
                        onChange={(e) => setOrderForm({ ...orderForm, maxPercentCap: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="perRunCap">Per-Run Cap (€)</Label>
                      <Input
                        id="perRunCap"
                        type="number"
                        step="0.01"
                        placeholder="500.00"
                        value={orderForm.perRunCap}
                        onChange={(e) => setOrderForm({ ...orderForm, perRunCap: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="perRunMin">Per-Run Min (€)</Label>
                      <Input
                        id="perRunMin"
                        type="number"
                        step="0.01"
                        placeholder="50.00"
                        value={orderForm.perRunMin}
                        onChange={(e) => setOrderForm({ ...orderForm, perRunMin: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Balance & Application */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Balance & Application</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="totalBalance">Total Balance (€, optional for arrears)</Label>
                      <Input
                        id="totalBalance"
                        type="number"
                        step="0.01"
                        placeholder="5000.00"
                        value={orderForm.totalBalance}
                        onChange={(e) => setOrderForm({ ...orderForm, totalBalance: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="applyTo">Apply To *</Label>
                      <Select
                        value={orderForm.applyTo}
                        onValueChange={(value) => setOrderForm({ ...orderForm, applyTo: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select application scope..." />
                        </SelectTrigger>
                        <SelectContent>
                          {applicationScope.map((scope) => (
                            <SelectItem key={scope.value} value={scope.value}>
                              {scope.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional notes or special instructions..."
                    value={orderForm.notes}
                    onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                  />
                </div>

                {/* Preview for Next Run */}
                {orderForm.method && orderForm.creditorName && (orderForm.amount || orderForm.percent) && (
                  <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <CalculatorIcon className="h-5 w-5" />
                      Preview for Next Run
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-center">
                      <div>
                        <div className="text-sm text-gray-600">Gross Pay</div>
                        <div className="text-lg font-semibold">€2,500.00</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Taxes/Contributions</div>
                        <div className="text-lg font-semibold text-red-600">-€750.00</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Disposable Net</div>
                        <div className="text-lg font-semibold">€1,750.00</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Proposed Deduction</div>
                        <div className="text-lg font-semibold text-orange-600">
                          -{orderForm.method === 'fixed_amount' 
                            ? `€${orderForm.amount}` 
                            : `€${((Number(orderForm.percent) / 100) * 1750).toFixed(2)}`
                          }
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Net Remaining</div>
                        <div className="text-lg font-semibold text-green-600">
                          €{orderForm.method === 'fixed_amount' 
                            ? (1750 - Number(orderForm.amount || 0)).toFixed(2)
                            : (1750 - ((Number(orderForm.percent) / 100) * 1750)).toFixed(2)
                          }
                        </div>
                      </div>
                    </div>

                    {/* Floor Protection Warning */}
                    {orderForm.protectedNetFloor && (
                      (orderForm.method === 'fixed_amount' 
                        ? (1750 - Number(orderForm.amount || 0)) < Number(orderForm.protectedNetFloor)
                        : (1750 - ((Number(orderForm.percent) / 100) * 1750)) < Number(orderForm.protectedNetFloor)
                      ) && (
                        <Alert className="border-yellow-200 bg-yellow-50">
                          <AlertCircleIcon className="h-4 w-4 text-yellow-600" />
                          <AlertDescription className="text-yellow-800">
                            <span className="font-medium">Capped to maintain net floor</span> - 
                            Deduction reduced to protect minimum net pay of €{orderForm.protectedNetFloor}
                          </AlertDescription>
                        </Alert>
                      )
                    )}
                  </div>
                )}

                {/* Submit Buttons */}
                <div className="flex gap-4 pt-4">
                  <Button
                    onClick={handleCreateOrder}
                    disabled={createOrderMutation.isPending}
                    className="flex-1"
                  >
                    {createOrderMutation.isPending ? 'Creating...' : 'Create Garnishment Order'}
                  </Button>
                  <Button variant="outline" onClick={() => setOrderForm({
                    type: '', creditorName: '', creditorIban: '', orderRef: '', caseId: '',
                    documentUpload: null, priority: 1, startDate: '', endDate: '', stopAfterBalance: false,
                    method: '', amount: '', percent: '', protectedNetFloor: '', maxPercentCap: '',
                    perRunCap: '', totalBalance: '', perRunMin: '', applyTo: 'all_runs', notes: ''
                  })}>
                    Reset Form
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