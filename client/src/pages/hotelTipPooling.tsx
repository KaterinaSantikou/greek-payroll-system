import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  Calculator,
  DollarSign,
  Users,
  TrendingUp,
  Upload,
  Settings,
  FileText,
  Clock,
  Star,
  Building2,
  PieChart,
} from 'lucide-react';

interface TipRole {
  id: string;
  name: string;
  category: 'service' | 'kitchen' | 'support' | 'management';
  baseWeight: number;
  hourlyPoints: number;
  shiftPoints: number;
  serviceMultiplier: number;
  description: string;
}

interface POSOutlet {
  id: string;
  name: string;
  type: 'restaurant' | 'bar' | 'room_service' | 'spa' | 'retail';
  tipPoolPercentage: number;
  isActive: boolean;
}

interface TipPoolPeriod {
  id: string;
  startDate: string;
  endDate: string;
  status: 'open' | 'calculating' | 'finalized' | 'paid';
  totalRevenue: number;
  totalTipPool: number;
  totalPoints: number;
  employerTopUp: number;
}

interface TipAllocation {
  employeeId: string;
  roleId: string;
  hoursWorked: number;
  shiftsWorked: number;
  totalPoints: number;
  baseAllocation: number;
  serviceBonus: number;
  employerTopUpShare: number;
  totalAmount: number;
  taxableAmount: number;
  earningsCode: string;
}

export default function HotelTipPooling() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [newPeriod, setNewPeriod] = useState({ startDate: '', endDate: '' });
  const [employeeShifts, setEmployeeShifts] = useState([
    {
      employeeId: '',
      roleId: '',
      hoursWorked: 0,
      shiftsWorked: 0,
      serviceScore: 1.0,
    },
  ]);

  // Fetch data
  const { data: roles } = useQuery({
    queryKey: ['/api/tip-pooling/roles'],
    refetchInterval: 30000,
  }) as { data?: { data?: TipRole[] } };

  const { data: outlets } = useQuery({
    queryKey: ['/api/tip-pooling/outlets'],
    refetchInterval: 30000,
  }) as { data?: { data?: POSOutlet[] } };

  const { data: periods } = useQuery({
    queryKey: ['/api/tip-pooling/periods'],
    refetchInterval: 15000,
  }) as { data?: { data?: TipPoolPeriod[] } };

  const { data: analytics } = useQuery({
    queryKey: ['/api/tip-pooling/analytics'],
    refetchInterval: 30000,
  }) as { data?: { data?: any } };

  const { data: payrollSummary } = useQuery({
    queryKey: ['/api/tip-pooling/payroll-summary', selectedPeriod],
    enabled: !!selectedPeriod,
    refetchInterval: 15000,
  }) as {
    data?: {
      data?: {
        period: TipPoolPeriod;
        allocations: TipAllocation[];
        payrollEntries: any[];
      };
    };
  };

  // Mutations
  const simulateDataMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/tip-pooling/simulate-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Demo Data Generated',
        description: '30 days of sample POS revenue data has been imported',
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/tip-pooling/analytics'],
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Generate Data',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const createPeriodMutation = useMutation({
    mutationFn: async (periodData: { startDate: string; endDate: string }) => {
      const response = await fetch('/api/tip-pooling/periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(periodData),
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Tip Pool Period Created',
        description: 'New tip pool period has been created successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tip-pooling/periods'] });
      setNewPeriod({ startDate: '', endDate: '' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Create Period',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const calculateTipPoolMutation = useMutation({
    mutationFn: async (periodId: string) => {
      const response = await fetch(`/api/tip-pooling/calculate/${periodId}`, {
        method: 'POST',
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Tip Pool Calculated',
        description: 'Revenue has been aggregated and tip pool calculated',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tip-pooling/periods'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Calculation Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const calculateAllocationsMutation = useMutation({
    mutationFn: async (data: { periodId: string; employeeShifts: any[] }) => {
      const response = await fetch('/api/tip-pooling/allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Allocations Calculated',
        description:
          'Individual tip allocations have been calculated and are ready for payroll',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tip-pooling/periods'] });
      queryClient.invalidateQueries({
        queryKey: ['/api/tip-pooling/payroll-summary', selectedPeriod],
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Allocation Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleAddEmployeeShift = () => {
    setEmployeeShifts([
      ...employeeShifts,
      {
        employeeId: '',
        roleId: '',
        hoursWorked: 0,
        shiftsWorked: 0,
        serviceScore: 1.0,
      },
    ]);
  };

  const handleUpdateEmployeeShift = (
    index: number,
    field: string,
    value: any
  ) => {
    const updatedShifts = [...employeeShifts];
    updatedShifts[index] = { ...updatedShifts[index], [field]: value };
    setEmployeeShifts(updatedShifts);
  };

  const handleRemoveEmployeeShift = (index: number) => {
    setEmployeeShifts(employeeShifts.filter((_, i) => i !== index));
  };

  const formatCurrency = (amount: number) => `€${amount.toFixed(2)}`;
  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'service':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
      case 'kitchen':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100';
      case 'support':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 'management':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 'calculating':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100';
      case 'finalized':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
      case 'paid':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Building2 className="h-8 w-8 text-blue-600" />
              Hotel Tip Pooling
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage POS revenue allocation, role weights, and tip pool
              distribution with Greek tax compliance
            </p>
          </div>
          <Button
            onClick={() => simulateDataMutation.mutate()}
            disabled={simulateDataMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Upload className="h-4 w-4 mr-2" />
            Generate Demo Data
          </Button>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Revenue (30d)
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(analytics?.data?.totalRevenue || 0)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Tip Pool (30d)
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(analytics?.data?.totalTipPool || 0)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Active Outlets
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {outlets?.data?.filter(o => o.isActive).length || 0}
                  </p>
                </div>
                <Building2 className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Tip Roles
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {roles?.data?.length || 0}
                  </p>
                </div>
                <Users className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Interface */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="outlets">POS Outlets</TabsTrigger>
            <TabsTrigger value="roles">Tip Roles</TabsTrigger>
            <TabsTrigger value="periods">Pool Periods</TabsTrigger>
            <TabsTrigger value="allocations">Allocations</TabsTrigger>
            <TabsTrigger value="payroll">Payroll Export</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Outlet Revenue Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Outlet Performance (30d)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics?.data?.outletBreakdown?.map(
                      (outlet: any, index: number) => (
                        <div
                          key={index}
                          className="flex items-center justify-between"
                        >
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">
                                {outlet.outletName}
                              </span>
                              <span className="text-sm text-gray-600">
                                {formatCurrency(outlet.revenue)} (
                                {formatPercentage(outlet.percentage / 100)})
                              </span>
                            </div>
                            <Progress
                              value={outlet.percentage}
                              className="mt-2"
                            />
                            <div className="text-xs text-gray-500 mt-1">
                              Tip Pool: {formatCurrency(outlet.tipPoolAmount)}
                            </div>
                          </div>
                        </div>
                      )
                    ) || (
                      <div className="text-center text-gray-500">
                        No data available - Generate demo data to start
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Daily Trends */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Revenue Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics?.data?.dailyTrends
                      ?.slice(0, 7)
                      .map((day: any, index: number) => (
                        <div
                          key={index}
                          className="flex items-center justify-between"
                        >
                          <span className="text-sm font-medium">
                            {new Date(day.date).toLocaleDateString('en-GB', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                          <div className="text-right">
                            <div className="font-medium">
                              {formatCurrency(day.revenue)}
                            </div>
                            <div className="text-xs text-gray-500">
                              Pool: {formatCurrency(day.tipPool)}
                            </div>
                          </div>
                        </div>
                      )) || (
                      <div className="text-center text-gray-500">
                        No trend data available
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* POS Outlets Tab */}
          <TabsContent value="outlets" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>POS Outlets Configuration</CardTitle>
                <CardDescription>
                  Configure outlet types and tip pool allocation percentages
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {outlets?.data?.map(outlet => (
                    <div
                      key={outlet.id}
                      className="p-4 border rounded-lg space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{outlet.name}</h3>
                        <Badge
                          className={
                            outlet.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }
                        >
                          {outlet.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Type:</span>
                          <Badge variant="outline">
                            {outlet.type.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            Tip Pool %:
                          </span>
                          <span className="font-medium">
                            {formatPercentage(outlet.tipPoolPercentage)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tip Roles Tab */}
          <TabsContent value="roles" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tip Roles & Point System</CardTitle>
                <CardDescription>
                  Define roles, weights, and service multipliers for tip
                  distribution
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {roles?.data?.map(role => (
                    <div
                      key={role.id}
                      className="p-4 border rounded-lg space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{role.name}</h3>
                        <Badge className={getCategoryColor(role.category)}>
                          {role.category}
                        </Badge>
                      </div>

                      <p className="text-sm text-gray-600">
                        {role.description}
                      </p>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Base Weight:</span>
                          <div className="font-medium">{role.baseWeight}x</div>
                        </div>
                        <div>
                          <span className="text-gray-600">
                            Service Multiplier:
                          </span>
                          <div className="font-medium">
                            {role.serviceMultiplier}x
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Hourly Points:</span>
                          <div className="font-medium">{role.hourlyPoints}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Shift Points:</span>
                          <div className="font-medium">{role.shiftPoints}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tip Pool Periods Tab */}
          <TabsContent value="periods" className="space-y-6">
            {/* Create New Period */}
            <Card>
              <CardHeader>
                <CardTitle>Create New Tip Pool Period</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={newPeriod.startDate}
                      onChange={e =>
                        setNewPeriod({
                          ...newPeriod,
                          startDate: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={newPeriod.endDate}
                      onChange={e =>
                        setNewPeriod({ ...newPeriod, endDate: e.target.value })
                      }
                    />
                  </div>
                  <Button
                    onClick={() =>
                      createPeriodMutation.mutate({
                        startDate: new Date(newPeriod.startDate).toISOString(),
                        endDate: new Date(newPeriod.endDate).toISOString(),
                      })
                    }
                    disabled={
                      !newPeriod.startDate ||
                      !newPeriod.endDate ||
                      createPeriodMutation.isPending
                    }
                  >
                    Create Period
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Existing Periods */}
            <Card>
              <CardHeader>
                <CardTitle>Tip Pool Periods</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {periods?.data?.map(period => (
                    <div key={period.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-semibold">
                            {new Date(period.startDate).toLocaleDateString()} -{' '}
                            {new Date(period.endDate).toLocaleDateString()}
                          </h3>
                          <p className="text-sm text-gray-600">
                            ID: {period.id}
                          </p>
                        </div>
                        <Badge className={getStatusColor(period.status)}>
                          {period.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                        <div>
                          <span className="text-gray-600">Total Revenue:</span>
                          <div className="font-medium">
                            {formatCurrency(period.totalRevenue)}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Tip Pool:</span>
                          <div className="font-medium">
                            {formatCurrency(period.totalTipPool)}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">
                            Employer Top-up:
                          </span>
                          <div className="font-medium">
                            {formatCurrency(period.employerTopUp)}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Total Points:</span>
                          <div className="font-medium">
                            {period.totalPoints.toFixed(1)}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {period.status === 'open' && (
                          <Button
                            size="sm"
                            onClick={() =>
                              calculateTipPoolMutation.mutate(period.id)
                            }
                            disabled={calculateTipPoolMutation.isPending}
                          >
                            <Calculator className="h-4 w-4 mr-2" />
                            Calculate Pool
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedPeriod(period.id)}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Allocations Tab */}
          <TabsContent value="allocations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Calculate Individual Allocations</CardTitle>
                <CardDescription>
                  Enter employee shift data to calculate tip pool distributions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Period Selection */}
                <div>
                  <Label>Select Tip Pool Period</Label>
                  <Select
                    value={selectedPeriod}
                    onValueChange={setSelectedPeriod}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a calculated period..." />
                    </SelectTrigger>
                    <SelectContent>
                      {periods?.data
                        ?.filter(p => p.status === 'calculating')
                        .map(period => (
                          <SelectItem key={period.id} value={period.id}>
                            {new Date(period.startDate).toLocaleDateString()} -{' '}
                            {new Date(period.endDate).toLocaleDateString()}(
                            {formatCurrency(period.totalTipPool)} pool)
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedPeriod && (
                  <>
                    {/* Employee Shifts Input */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Employee Shift Data</h3>
                        <Button size="sm" onClick={handleAddEmployeeShift}>
                          Add Employee
                        </Button>
                      </div>

                      {employeeShifts.map((shift, index) => (
                        <div
                          key={index}
                          className="p-4 border rounded-lg space-y-4"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                            <div>
                              <Label>Employee ID</Label>
                              <Input
                                placeholder="EMP001"
                                value={shift.employeeId}
                                onChange={e =>
                                  handleUpdateEmployeeShift(
                                    index,
                                    'employeeId',
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                            <div>
                              <Label>Role</Label>
                              <Select
                                value={shift.roleId}
                                onValueChange={value =>
                                  handleUpdateEmployeeShift(
                                    index,
                                    'roleId',
                                    value
                                  )
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select role..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {roles?.data?.map(role => (
                                    <SelectItem key={role.id} value={role.id}>
                                      {role.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Hours Worked</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.5"
                                value={shift.hoursWorked}
                                onChange={e =>
                                  handleUpdateEmployeeShift(
                                    index,
                                    'hoursWorked',
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                              />
                            </div>
                            <div>
                              <Label>Shifts Worked</Label>
                              <Input
                                type="number"
                                min="0"
                                value={shift.shiftsWorked}
                                onChange={e =>
                                  handleUpdateEmployeeShift(
                                    index,
                                    'shiftsWorked',
                                    parseInt(e.target.value) || 0
                                  )
                                }
                              />
                            </div>
                            <div>
                              <Label>Service Score</Label>
                              <Input
                                type="number"
                                min="0"
                                max="1"
                                step="0.1"
                                value={shift.serviceScore}
                                onChange={e =>
                                  handleUpdateEmployeeShift(
                                    index,
                                    'serviceScore',
                                    parseFloat(e.target.value) || 1.0
                                  )
                                }
                              />
                            </div>
                            <div className="flex items-end">
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRemoveEmployeeShift(index)}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button
                      onClick={() =>
                        calculateAllocationsMutation.mutate({
                          periodId: selectedPeriod,
                          employeeShifts: employeeShifts.filter(
                            s => s.employeeId && s.roleId
                          ),
                        })
                      }
                      disabled={
                        calculateAllocationsMutation.isPending ||
                        employeeShifts.filter(s => s.employeeId && s.roleId)
                          .length === 0
                      }
                      className="w-full"
                    >
                      <Calculator className="h-4 w-4 mr-2" />
                      Calculate Allocations
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payroll Export Tab */}
          <TabsContent value="payroll" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Payroll Export</CardTitle>
                <CardDescription>
                  Export finalized tip pool distributions for payroll processing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Period Selection */}
                <div>
                  <Label>Select Finalized Period</Label>
                  <Select
                    value={selectedPeriod}
                    onValueChange={setSelectedPeriod}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a finalized period..." />
                    </SelectTrigger>
                    <SelectContent>
                      {periods?.data
                        ?.filter(p => p.status === 'finalized')
                        .map(period => (
                          <SelectItem key={period.id} value={period.id}>
                            {new Date(period.startDate).toLocaleDateString()} -{' '}
                            {new Date(period.endDate).toLocaleDateString()}(
                            {formatCurrency(period.totalTipPool)} distributed)
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {payrollSummary?.data && (
                  <div className="space-y-6">
                    {/* Period Summary */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <h3 className="font-semibold mb-3">Period Summary</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Total Revenue:</span>
                          <div className="font-medium">
                            {formatCurrency(
                              payrollSummary.data.period.totalRevenue
                            )}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Tip Pool:</span>
                          <div className="font-medium">
                            {formatCurrency(
                              payrollSummary.data.period.totalTipPool
                            )}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">
                            Employer Top-up:
                          </span>
                          <div className="font-medium">
                            {formatCurrency(
                              payrollSummary.data.period.employerTopUp
                            )}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Employees:</span>
                          <div className="font-medium">
                            {payrollSummary.data.allocations.length}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Allocations Table */}
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium">
                              Employee
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium">
                              Role
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium">
                              Hours
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium">
                              Points
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium">
                              Base
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium">
                              Bonus
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium">
                              Total
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium">
                              Code
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {payrollSummary.data.allocations.map(
                            (allocation, index) => (
                              <tr key={index}>
                                <td className="px-4 py-3 font-medium">
                                  {allocation.employeeId}
                                </td>
                                <td className="px-4 py-3">
                                  {roles?.data?.find(
                                    r => r.id === allocation.roleId
                                  )?.name || allocation.roleId}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {allocation.hoursWorked}h
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {allocation.totalPoints.toFixed(1)}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {formatCurrency(allocation.baseAllocation)}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {formatCurrency(allocation.serviceBonus)}
                                </td>
                                <td className="px-4 py-3 text-right font-medium">
                                  {formatCurrency(allocation.totalAmount)}
                                </td>
                                <td className="px-4 py-3">
                                  <Badge variant="outline">
                                    {allocation.earningsCode}
                                  </Badge>
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Export Actions */}
                    <div className="flex gap-2">
                      <Button className="flex-1">
                        <FileText className="h-4 w-4 mr-2" />
                        Export to CSV
                      </Button>
                      <Button variant="outline" className="flex-1">
                        <FileText className="h-4 w-4 mr-2" />
                        Export Payslips
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
