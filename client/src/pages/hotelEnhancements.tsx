import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Calendar as CalendarIcon,
  Users,
  Home,
  Utensils,
  DollarSign,
  Clock,
  Building2,
  Star,
  TrendingUp,
  Award,
  RefreshCw,
  Plus,
  Settings,
  BarChart3,
  Zap,
  Target,
  CheckCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';

interface SeasonalityDashboard {
  currentSeason: {
    seasonId: string;
    name: string;
    status: string;
    daysRemaining: number;
    staffingProgress: number;
  };
  metrics: {
    staffingLevels: {
      current: number;
      target: number;
      variance: number;
    };
    rehireSuccess: {
      rate: number;
      totalReturning: number;
      newHires: number;
    };
    costEfficiency: {
      seasonalLabor: number;
      accommodation: number;
      meals: number;
      tips: number;
      total: number;
    };
    satisfaction: {
      employeeSatisfaction: number;
      guestSatisfaction: number;
      retentionRate: number;
    };
  };
}

interface TipPoolAnalytics {
  poolId: string;
  poolName: string;
  totalTipsCollected: number;
  averagePerEmployee: number;
  topPerformers: Array<{
    employeeId: string;
    employeeName: string;
    tipAmount: number;
    performanceScore: number;
  }>;
  departmentBreakdown: Array<{
    department: string;
    totalTips: number;
    employeeCount: number;
    averagePerEmployee: number;
  }>;
}

export default function HotelEnhancementsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProperty, setSelectedProperty] = useState('default');
  const [activeSeasonId, setActiveSeasonId] = useState('summer_2025');

  // Fetch Seasonality Analytics
  const { data: seasonalData, isLoading: seasonalLoading } =
    useQuery<SeasonalityDashboard>({
      queryKey: [
        `/api/hotel-enhancements/seasonal-analytics/${selectedProperty}`,
      ],
      retry: false,
      onError: (error: Error) => {
        // if (isUnauthorizedError(error)) {
        //   toast({
        //     title: "Unauthorized",
        //     description: "You are logged out. Logging in again...",
        //     variant: "destructive",
        //   });
        //   setTimeout(() => {
        //     window.location.href = "/api/login";
        //   }, 500);
        // }
      },
    });

  // Fetch Tip Pool Analytics
  const { data: tipPoolData, isLoading: tipPoolLoading } =
    useQuery<TipPoolAnalytics>({
      queryKey: [
        `/api/hotel-enhancements/tip-pool-analytics/${selectedProperty}`,
      ],
      retry: false,
      onError: (error: Error) => {
        // if (isUnauthorizedError(error)) {
        //   toast({
        //     title: "Unauthorized",
        //     description: "You are logged out. Logging in again...",
        //     variant: "destructive",
        //   });
        //   setTimeout(() => {
        //     window.location.href = "/api/login";
        //   }, 500);
        // }
      },
    });

  // Create Batch Hiring Campaign
  const batchHiringMutation = useMutation({
    mutationFn: async (campaignData: any) => {
      return await apiRequest(`/api/hotel-enhancements/batch-hiring`, {
        method: 'POST',
        body: campaignData,
      });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Batch hiring campaign created successfully',
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/hotel-enhancements/seasonal-analytics`],
      });
    },
    onError: (error: Error) => {
      // if (isUnauthorizedError(error)) {
      //   toast({
      //     title: "Unauthorized",
      //     description: "You are logged out. Logging in again...",
      //     variant: "destructive",
      //   });
      //   setTimeout(() => {
      //     window.location.href = "/api/login";
      //   }, 500);
      //   return;
      // }
      toast({
        title: 'Error',
        description: 'Failed to create batch hiring campaign',
        variant: 'destructive',
      });
    },
  });

  // Configure Tip Pool
  const tipPoolMutation = useMutation({
    mutationFn: async (poolConfig: any) => {
      return await apiRequest(`/api/hotel-enhancements/tip-pool/configure`, {
        method: 'POST',
        body: poolConfig,
      });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Tip pool configuration updated successfully',
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/hotel-enhancements/tip-pool-analytics`],
      });
    },
    onError: (error: Error) => {
      // if (isUnauthorizedError(error)) {
      //   toast({
      //     title: "Unauthorized",
      //     description: "You are logged out. Logging in again...",
      //     variant: "destructive",
      //   });
      //   setTimeout(() => {
      //     window.location.href = "/api/login";
      //   }, 500);
      //   return;
      // }
      toast({
        title: 'Error',
        description: 'Failed to configure tip pool',
        variant: 'destructive',
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'planning':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleBatchHiring = () => {
    const campaignData = {
      propertyId: selectedProperty,
      seasonId: activeSeasonId,
      targetPositions: [
        {
          department: 'Housekeeping',
          position: 'Room Attendant',
          targetCount: 25,
          priorityLevel: 'high',
        },
        {
          department: 'F&B Service',
          position: 'Server',
          targetCount: 20,
          priorityLevel: 'high',
        },
      ],
    };
    batchHiringMutation.mutate(campaignData);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Hotel-Specific Enhancements
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Seasonality toolkit, accommodation & meal allowances, tip pooling,
            and split-shift costing
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedProperty} onValueChange={setSelectedProperty}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Hotel Santikos Costa</SelectItem>
              <SelectItem value="property2">Santikos Beach Resort</SelectItem>
              <SelectItem value="property3">Santikos City Center</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="seasonality" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="seasonality" className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Seasonality Toolkit
          </TabsTrigger>
          <TabsTrigger value="allowances" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            Allowances
          </TabsTrigger>
          <TabsTrigger value="tips" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            Tip Pooling
          </TabsTrigger>
          <TabsTrigger value="split-shifts" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Split Shifts
          </TabsTrigger>
        </TabsList>

        {/* Seasonality Toolkit Tab */}
        <TabsContent value="seasonality" className="space-y-6">
          {seasonalLoading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            seasonalData && (
              <>
                {/* Current Season Overview */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <CalendarIcon className="h-5 w-5" />
                        Current Season: {seasonalData.currentSeason.name}
                      </CardTitle>
                      <Badge
                        className={getStatusColor(
                          seasonalData.currentSeason.status
                        )}
                      >
                        {seasonalData.currentSeason.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Days Remaining
                        </p>
                        <p className="text-2xl font-bold text-blue-600">
                          {seasonalData.currentSeason.daysRemaining}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Staffing Progress
                        </p>
                        <p className="text-2xl font-bold text-green-600">
                          {seasonalData.currentSeason.staffingProgress.toFixed(
                            1
                          )}
                          %
                        </p>
                        <Progress
                          value={seasonalData.currentSeason.staffingProgress}
                          className="mt-2"
                        />
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Current Staff
                        </p>
                        <p className="text-2xl font-bold">
                          {seasonalData.metrics.staffingLevels.current}
                        </p>
                        <p className="text-xs text-gray-500">
                          Target: {seasonalData.metrics.staffingLevels.target}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Rehire Success
                        </p>
                        <p className="text-2xl font-bold text-purple-600">
                          {seasonalData.metrics.rehireSuccess.rate.toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-500">
                          {seasonalData.metrics.rehireSuccess.totalReturning}{' '}
                          returning
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Batch Hiring & Mass Renewals */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Batch Hiring Campaign
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">
                            Target Positions
                          </p>
                          <p className="font-medium">53 positions</p>
                        </div>
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">
                            Automated Screening
                          </p>
                          <p className="font-medium text-green-600">Enabled</p>
                        </div>
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">
                            Bulk Onboarding
                          </p>
                          <p className="font-medium text-green-600">Ready</p>
                        </div>
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">
                            Priority Departments
                          </p>
                          <p className="font-medium">Housekeeping, F&B</p>
                        </div>
                      </div>
                      <Button
                        onClick={handleBatchHiring}
                        disabled={batchHiringMutation.isPending}
                        className="w-full"
                      >
                        {batchHiringMutation.isPending ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Launching Campaign...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Launch Hiring Campaign
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Award className="h-5 w-5" />
                        Mass Contract Renewals
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">
                            Eligible Employees
                          </p>
                          <p className="font-medium">
                            {seasonalData.metrics.rehireSuccess.totalReturning}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">
                            Performance Threshold
                          </p>
                          <p className="font-medium">3.5/5.0</p>
                        </div>
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">
                            Wage Increase
                          </p>
                          <p className="font-medium text-green-600">+5.0%</p>
                        </div>
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">
                            Bonus Eligibility
                          </p>
                          <p className="font-medium text-blue-600">Included</p>
                        </div>
                      </div>
                      <Button variant="outline" className="w-full">
                        <Settings className="h-4 w-4 mr-2" />
                        Configure Renewals
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Seniority Carry-Over */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Seniority Carry-Over Rules
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Badge className="bg-blue-100 text-blue-800">
                            Standard
                          </Badge>
                          <h3 className="font-semibold">Regular Seasonal</h3>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">
                              Carry-over Period:
                            </span>
                            <span className="font-medium">24 months</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">
                              Multiplier:
                            </span>
                            <span className="font-medium">1.2x</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">
                              Benefits:
                            </span>
                            <span className="font-medium">Standard</span>
                          </div>
                        </div>
                      </div>

                      <div className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Badge className="bg-purple-100 text-purple-800">
                            Veteran
                          </Badge>
                          <h3 className="font-semibold">Veteran Seasonal</h3>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">
                              Min Seasons:
                            </span>
                            <span className="font-medium">3+</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">
                              Multiplier:
                            </span>
                            <span className="font-medium">1.15x</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">
                              Privileges:
                            </span>
                            <span className="font-medium">Priority</span>
                          </div>
                        </div>
                      </div>

                      <div className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Badge className="bg-gold-100 text-gold-800">
                            Expert
                          </Badge>
                          <h3 className="font-semibold">Expert Seasonal</h3>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">
                              Min Seasons:
                            </span>
                            <span className="font-medium">5+</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">
                              Multiplier:
                            </span>
                            <span className="font-medium">1.25x</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">
                              Privileges:
                            </span>
                            <span className="font-medium">Lead Roles</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Cost Efficiency Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Seasonal Cost Efficiency
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                      <div className="text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Seasonal Labor
                        </p>
                        <p className="text-xl font-bold">
                          €
                          {seasonalData.metrics.costEfficiency.seasonalLabor.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Accommodation
                        </p>
                        <p className="text-xl font-bold">
                          €
                          {seasonalData.metrics.costEfficiency.accommodation.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Meals
                        </p>
                        <p className="text-xl font-bold">
                          €
                          {seasonalData.metrics.costEfficiency.meals.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Tips
                        </p>
                        <p className="text-xl font-bold">
                          €
                          {seasonalData.metrics.costEfficiency.tips.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Total Cost
                        </p>
                        <p className="text-xl font-bold text-blue-600">
                          €
                          {seasonalData.metrics.costEfficiency.total.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )
          )}
        </TabsContent>

        {/* Accommodation & Meal Allowances Tab */}
        <TabsContent value="allowances" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Accommodation Allowances
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="accommodation-enabled">
                      Enable Accommodation Allowances
                    </Label>
                    <Switch id="accommodation-enabled" defaultChecked />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="per-day-cap">Per Day Cap</Label>
                      <Input
                        id="per-day-cap"
                        placeholder="€50.00"
                        defaultValue="50.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="max-days">Max Days</Label>
                      <Input
                        id="max-days"
                        placeholder="180"
                        defaultValue="180"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Accommodation Types</Label>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">Shared Room</span>
                        <span className="text-sm font-medium">€25.00/day</span>
                      </div>
                      <div className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">Single Room</span>
                        <span className="text-sm font-medium">€40.00/day</span>
                      </div>
                      <div className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">Apartment</span>
                        <span className="text-sm font-medium">€60.00/day</span>
                      </div>
                    </div>
                  </div>

                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>Tax Compliance</AlertTitle>
                    <AlertDescription>
                      Accommodation allowances up to €600/month are tax-free.
                      Current monthly calculation: €1,500 (taxable: €900)
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Utensils className="h-5 w-5" />
                  Meal Allowances
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="meals-enabled">
                      Enable Meal Allowances
                    </Label>
                    <Switch id="meals-enabled" defaultChecked />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="meal-per-day-cap">Per Day Cap</Label>
                      <Input
                        id="meal-per-day-cap"
                        placeholder="€25.00"
                        defaultValue="25.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="reimbursement-rate">
                        Reimbursement Rate
                      </Label>
                      <Input
                        id="reimbursement-rate"
                        placeholder="60%"
                        defaultValue="60"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Meal Types & Limits</Label>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">Breakfast</span>
                        <span className="text-sm font-medium">€6.00 max</span>
                      </div>
                      <div className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">Lunch</span>
                        <span className="text-sm font-medium">€10.00 max</span>
                      </div>
                      <div className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">Dinner</span>
                        <span className="text-sm font-medium">€12.00 max</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Meal Voucher Networks</Label>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">Ticket Restaurant</Badge>
                      <Badge variant="secondary">Up2You</Badge>
                      <Badge variant="secondary">Pluxee</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Allowances Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Allowances Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Total Accommodation
                  </p>
                  <p className="text-2xl font-bold">€45,680</p>
                  <p className="text-xs text-gray-500">124 employees</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Total Meals
                  </p>
                  <p className="text-2xl font-bold">€28,950</p>
                  <p className="text-xs text-gray-500">162 employees</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Tax-Free Amount
                  </p>
                  <p className="text-2xl font-bold text-green-600">€58,420</p>
                  <p className="text-xs text-gray-500">78% of total</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Taxable Amount
                  </p>
                  <p className="text-2xl font-bold text-orange-600">€16,210</p>
                  <p className="text-xs text-gray-500">22% of total</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tip Pooling Tab */}
        <TabsContent value="tips" className="space-y-6">
          {tipPoolLoading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            tipPoolData && (
              <>
                {/* Tip Pool Overview */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Star className="h-5 w-5" />
                        {tipPoolData.poolName}
                      </CardTitle>
                      <Button
                        onClick={() =>
                          tipPoolMutation.mutate({
                            propertyId: selectedProperty,
                            poolName: 'Main Property Tip Pool',
                            distributionMethod: 'weighted',
                          })
                        }
                        disabled={tipPoolMutation.isPending}
                        variant="outline"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Configure Pool
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Total Tips Collected
                        </p>
                        <p className="text-2xl font-bold text-green-600">
                          €{tipPoolData.totalTipsCollected.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">This week</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Average per Employee
                        </p>
                        <p className="text-2xl font-bold">
                          €{tipPoolData.averagePerEmployee.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">Weekly average</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Top Performer
                        </p>
                        <p className="text-2xl font-bold text-purple-600">
                          €
                          {tipPoolData.topPerformers[0]?.tipAmount.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {tipPoolData.topPerformers[0]?.employeeName}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Performance Score
                        </p>
                        <p className="text-2xl font-bold text-blue-600">
                          {tipPoolData.topPerformers[0]?.performanceScore.toFixed(
                            1
                          )}
                        </p>
                        <p className="text-xs text-gray-500">
                          Top performer rating
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Department Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle>Department Tip Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {tipPoolData.departmentBreakdown.map((dept, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold">{dept.department}</h3>
                            <span className="font-bold text-green-600">
                              €{dept.totalTips.toLocaleString()}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600 dark:text-gray-400">
                                Employee Count
                              </p>
                              <p className="font-medium">
                                {dept.employeeCount}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600 dark:text-gray-400">
                                Average per Employee
                              </p>
                              <p className="font-medium">
                                €{dept.averagePerEmployee.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600 dark:text-gray-400">
                                Share of Total
                              </p>
                              <p className="font-medium">
                                {(
                                  (dept.totalTips /
                                    tipPoolData.totalTipsCollected) *
                                  100
                                ).toFixed(1)}
                                %
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Top Performers */}
                <Card>
                  <CardHeader>
                    <CardTitle>Top Performers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {tipPoolData.topPerformers.map((performer, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gold-100 flex items-center justify-center font-bold text-gold-800">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium">
                                {performer.employeeName}
                              </p>
                              <p className="text-sm text-gray-600">
                                Performance Score:{' '}
                                {performer.performanceScore.toFixed(1)}/5.0
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600">
                              €{performer.tipAmount.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500">This week</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )
          )}
        </TabsContent>

        {/* Split Shifts & Costing Tab */}
        <TabsContent value="split-shifts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Split-Shift & Cross-Outlet Costing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Create New Split Shift */}
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-semibold">Create Split Shift</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="employee-select">Employee</Label>
                    <Select>
                      <SelectTrigger id="employee-select">
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="emp1">Maria Papadopoulos</SelectItem>
                        <SelectItem value="emp2">Dimitris Kostas</SelectItem>
                        <SelectItem value="emp3">Anna Georgiou</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="shift-date">Date</Label>
                    <Input
                      id="shift-date"
                      type="date"
                      defaultValue={format(new Date(), 'yyyy-MM-dd')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="total-hours">Total Hours</Label>
                    <Input id="total-hours" placeholder="8.0" />
                  </div>
                </div>
                <Button className="w-full md:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Split Shift
                </Button>
              </div>

              {/* Example Split Shift */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Split Shift Example - Maria Papadopoulos
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                    {format(new Date(), 'MMMM dd, yyyy')}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Segments */}
                    <div className="space-y-3">
                      <h4 className="font-medium">Shift Segments</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className="text-sm">
                              <p className="font-medium">06:00 - 10:00</p>
                              <p className="text-gray-600">Breakfast Service</p>
                            </div>
                            <Badge variant="outline">Restaurant</Badge>
                            <Badge variant="outline">F&B Service</Badge>
                          </div>
                          <div className="text-right text-sm">
                            <p className="font-medium">4.0 hours</p>
                            <p className="text-gray-600">€52.00</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className="text-sm">
                              <p className="font-medium">19:00 - 23:00</p>
                              <p className="text-gray-600">Dinner Service</p>
                            </div>
                            <Badge variant="outline">Pool Bar</Badge>
                            <Badge variant="outline">Bar Service</Badge>
                          </div>
                          <div className="text-right text-sm">
                            <p className="font-medium">4.0 hours</p>
                            <p className="text-gray-600">€58.00</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Costing Breakdown */}
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3">Cost Distribution</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h5 className="text-sm font-medium mb-2">
                            By Outlet
                          </h5>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Restaurant</span>
                              <span>€52.00 (47.3%)</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Pool Bar</span>
                              <span>€58.00 (52.7%)</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium mb-2">
                            By Department
                          </h5>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>F&B Service</span>
                              <span>€52.00 (47.3%)</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Bar Service</span>
                              <span>€58.00 (52.7%)</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Compliance Checks */}
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3">Compliance Status</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm">Max Daily Hours</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm">Rest Period</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm">Break Requirements</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm">Overtime Rules</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
