import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Calendar, 
  Clock, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  Settings, 
  DollarSign,
  Smartphone,
  BarChart3,
  Send,
  Drag,
  Copy,
  Edit3,
  MapPin,
  Bell,
  Shield,
  TrendingUp,
  Target,
  Activity,
  Zap,
  UserCheck,
  FileText,
  CheckSquare,
  Plus,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

// Mock data for the comprehensive rota system
const mockEmployees = [
  { id: '1', name: 'Maria Papadaki', role: 'Front Desk', department: 'Reception', hourlyRate: 12.50, availability: 'full' },
  { id: '2', name: 'Nikos Dimitriou', role: 'Bartender', department: 'F&B', hourlyRate: 14.00, availability: 'part' },
  { id: '3', name: 'Sofia Kostas', role: 'Housekeeper', department: 'Housekeeping', hourlyRate: 11.00, availability: 'full' },
  { id: '4', name: 'Yannis Stavros', role: 'Maintenance', department: 'Engineering', hourlyRate: 15.50, availability: 'on_call' },
];

const mockShifts = [
  { id: 's1', employeeId: '1', date: '2025-01-20', startTime: '08:00', endTime: '16:00', role: 'Front Desk', cost: 100, status: 'published' },
  { id: 's2', employeeId: '2', date: '2025-01-20', startTime: '18:00', endTime: '02:00', role: 'Bartender', cost: 112, status: 'draft' },
  { id: 's3', employeeId: '3', date: '2025-01-21', startTime: '09:00', endTime: '17:00', role: 'Housekeeper', cost: 88, status: 'published' },
];

const mockBudget = {
  daily: 800,
  weekly: 5600,
  monthly: 24000,
  ytd: 285000
};

const mockAnalytics = {
  coveragePercent: 87.3,
  understaffedHours: 12,
  overtimeRisk: 'medium',
  forecastAccuracy: 91.2,
  scheduleAdherence: 94.8,
  noShowRate: 2.1
};

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const timeSlots = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

export default function ComprehensiveRotaSystem() {
  const { t } = useTranslation();
  const [currentView, setCurrentView] = useState<'week' | 'fortnight' | 'month'>('week');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [showCosts, setShowCosts] = useState(true);
  const [selectedShift, setSelectedShift] = useState<any>(null);
  
  // Weekly cost calculation
  const weeklyActual = useMemo(() => {
    return mockShifts.reduce((total, shift) => total + shift.cost, 0);
  }, []);

  const budgetStatus = weeklyActual > mockBudget.weekly ? 'over' : 'under';
  const budgetPercent = (weeklyActual / mockBudget.weekly) * 100;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">{t('rota.title')}</h1>
            <p className="text-gray-600 dark:text-gray-400">{t('rota.subtitle')}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">Week Jan 20-26, 2025</span>
            <Button variant="outline" size="sm">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <Select value={currentView} onValueChange={(value: any) => setCurrentView(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">{t('rota.week_view')}</SelectItem>
              <SelectItem value="fortnight">{t('rota.fortnight_view')}</SelectItem>
              <SelectItem value="month">{t('rota.month_view')}</SelectItem>
            </SelectContent>
          </Select>
          
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Shift
          </Button>
        </div>
      </div>

      {/* Status Strip */}
      <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950/20 dark:to-green-950/20 rounded-lg">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-green-600" />
          <span className="text-sm font-medium">Greek Compliance: Active</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="text-sm">ERGANI II: Synced</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-orange-500" />
          <span className="text-sm">3 Pending Approvals</span>
        </div>
        <div className="flex items-center gap-2">
          <DollarSign className={`h-5 w-5 ${budgetStatus === 'over' ? 'text-red-500' : 'text-green-500'}`} />
          <span className={`text-sm font-medium ${budgetStatus === 'over' ? 'text-red-600' : 'text-green-600'}`}>
            Budget: {budgetPercent.toFixed(1)}%
          </span>
        </div>
      </div>

      <Tabs defaultValue="builder" className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="builder" className="flex items-center gap-2">
            <Drag className="h-4 w-4" />
            {t('rota.builder')}
          </TabsTrigger>
          <TabsTrigger value="people" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t('rota.people')}
          </TabsTrigger>
          <TabsTrigger value="costs" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            {t('rota.costs')}
          </TabsTrigger>
          <TabsTrigger value="compliance" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            {t('rota.compliance')}
          </TabsTrigger>
          <TabsTrigger value="mobile" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            {t('rota.mobile')}
          </TabsTrigger>
          <TabsTrigger value="publishing" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            {t('rota.publishing')}
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            {t('rota.analytics')}
          </TabsTrigger>
        </TabsList>

        {/* 1. ROTA BUILDER TAB */}
        <TabsContent value="builder" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Schedule Grid */}
            <Card className="lg:col-span-3">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Drag className="h-5 w-5" />
                    {t('rota.drag_drop')} Schedule Grid
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Copy className="h-4 w-4 mr-2" />
                      {t('rota.templates')}
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit3 className="h-4 w-4 mr-2" />
                      {t('rota.bulk_edit')}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-8 gap-1 text-xs">
                  {/* Header row */}
                  <div className="font-medium p-2">Employee</div>
                  {daysOfWeek.map((day) => (
                    <div key={day} className="font-medium p-2 text-center">{day.slice(0, 3)}</div>
                  ))}
                  
                  {/* Employee rows */}
                  {mockEmployees.map((employee) => (
                    <div key={employee.id} className="contents">
                      <div className="p-2 font-medium bg-gray-50 dark:bg-gray-800 rounded">
                        <div className="text-sm">{employee.name}</div>
                        <div className="text-xs text-gray-500">{employee.role}</div>
                      </div>
                      {daysOfWeek.map((day, dayIndex) => {
                        const shift = mockShifts.find(s => s.employeeId === employee.id);
                        return (
                          <div key={`${employee.id}-${dayIndex}`} className="p-1 min-h-[60px] border border-gray-200 dark:border-gray-700 rounded relative">
                            {shift && dayIndex === 0 && (
                              <div 
                                className={`text-xs p-2 rounded cursor-pointer transition-all hover:shadow-md ${
                                  shift.status === 'published' 
                                    ? 'bg-green-100 border-green-300 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                                    : 'bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                }`}
                                onClick={() => setSelectedShift(shift)}
                              >
                                <div className="font-medium">{shift.startTime}-{shift.endTime}</div>
                                <div>{shift.role}</div>
                                {showCosts && <div className="text-xs">€{shift.cost}</div>}
                                {shift.status === 'draft' && <div className="text-xs">DRAFT</div>}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Shift Details Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('rota.shift_details')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedShift ? (
                  <div className="space-y-3">
                    <div>
                      <Label>Employee</Label>
                      <div className="text-sm font-medium">
                        {mockEmployees.find(e => e.id === selectedShift.employeeId)?.name}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Start Time</Label>
                        <Input type="time" value={selectedShift.startTime} />
                      </div>
                      <div>
                        <Label>End Time</Label>
                        <Input type="time" value={selectedShift.endTime} />
                      </div>
                    </div>
                    <div>
                      <Label>{t('rota.role_required')}</Label>
                      <Select value={selectedShift.role}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Front Desk">Front Desk</SelectItem>
                          <SelectItem value="Bartender">Bartender</SelectItem>
                          <SelectItem value="Housekeeper">Housekeeper</SelectItem>
                          <SelectItem value="Maintenance">Maintenance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span>Duration:</span>
                        <span>8 hours</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cost:</span>
                        <span>€{selectedShift.cost}</span>
                      </div>
                    </div>
                    <div className="pt-3 space-y-2">
                      <Button className="w-full" size="sm">Save Changes</Button>
                      <Button variant="outline" className="w-full" size="sm">Delete Shift</Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <Drag className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Select a shift to view details</p>
                    <p className="text-xs">or drag to create new shifts</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 2. PEOPLE & AVAILABILITY TAB */}
        <TabsContent value="people" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  {t('rota.availability_requests')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { employee: 'Maria Papadaki', request: 'Cannot work Sundays in February', status: 'pending' },
                    { employee: 'Nikos Dimitriou', request: 'Prefer evening shifts', status: 'approved' },
                    { employee: 'Sofia Kostas', request: 'Time off: Jan 25-27', status: 'pending' }
                  ].map((req, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="font-medium">{req.employee}</div>
                        <div className="text-sm text-gray-600">{req.request}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={req.status === 'approved' ? 'default' : 'secondary'}>
                          {req.status}
                        </Badge>
                        {req.status === 'pending' && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="default">Approve</Button>
                            <Button size="sm" variant="outline">Reject</Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  {t('rota.shift_swaps')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { from: 'Maria Papadaki', to: 'Sofia Kostas', shift: 'Jan 22, 08:00-16:00', status: 'pending_approval' },
                    { from: 'Nikos Dimitriou', to: 'Yannis Stavros', shift: 'Jan 24, 18:00-02:00', status: 'approved' }
                  ].map((swap, i) => (
                    <div key={i} className="p-3 border rounded">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium">{swap.shift}</div>
                        <Badge variant={swap.status === 'approved' ? 'default' : 'secondary'}>
                          {swap.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600">
                        {swap.from} → {swap.to}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 3. COSTS & BUDGET TAB */}
        <TabsContent value="costs" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  {t('rota.labor_cost_forecast')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Daily Budget:</span>
                    <span className="font-medium">€{mockBudget.daily}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Weekly Budget:</span>
                    <span className="font-medium">€{mockBudget.weekly}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Weekly Actual:</span>
                    <span className={`font-medium ${budgetStatus === 'over' ? 'text-red-600' : 'text-green-600'}`}>
                      €{weeklyActual}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Budget Usage:</span>
                      <span className="text-sm">{budgetPercent.toFixed(1)}%</span>
                    </div>
                    <Progress value={budgetPercent} className="h-2" />
                    <Badge variant={budgetStatus === 'over' ? 'destructive' : 'default'} className="w-full justify-center">
                      {budgetStatus === 'over' ? t('rota.over_budget') : t('rota.under_budget')}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Cost per Role
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { role: 'Front Desk', hours: 40, cost: 500, budget: 520 },
                    { role: 'F&B', hours: 35, cost: 490, budget: 480 },
                    { role: 'Housekeeping', hours: 32, cost: 352, budget: 380 },
                    { role: 'Maintenance', hours: 20, cost: 310, budget: 300 }
                  ].map((item) => (
                    <div key={item.role} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{item.role}</span>
                        <span>€{item.cost}/€{item.budget}</span>
                      </div>
                      <Progress 
                        value={(item.cost / item.budget) * 100} 
                        className="h-1"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Weekly Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">-8.3%</div>
                    <div className="text-sm text-gray-500">vs last week</div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Overtime Hours:</span>
                      <span className="text-orange-600">12.5h</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Night Shifts:</span>
                      <span className="text-blue-600">8 shifts</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sunday Work:</span>
                      <span className="text-purple-600">3 shifts</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 4. COMPLIANCE ENGINE TAB */}
        <TabsContent value="compliance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Greek Labor Law Compliance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium">{t('rota.max_weekly')}</span>
                    </div>
                    <Badge variant="default">48h Max ✓</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium">{t('rota.rest_between')}</span>
                    </div>
                    <Badge variant="default">11h Min ✓</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      <span className="font-medium">{t('rota.night_shift')}</span>
                    </div>
                    <Badge variant="secondary">Review Required</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium">{t('rota.sunday_premium')}</span>
                    </div>
                    <Badge variant="default">75% Applied ✓</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {t('rota.ergani_announcement')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Weekly Schedule</span>
                      <Badge variant="outline">Auto-Generated</Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      Pre-announcement for Jan 20-26, 2025
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      4 employees, 28 total shifts
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Last Sync:</span>
                      <span className="text-green-600">2 minutes ago</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Overtime Changes:</span>
                      <span className="text-orange-600">3 pending</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Compliance Status:</span>
                      <span className="text-green-600">✓ All Clear</span>
                    </div>
                  </div>

                  <Button className="w-full" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export ERGANI Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 5. MOBILE FEATURES TAB */}
        <TabsContent value="mobile" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  {t('rota.clock_in')}/{t('rota.clock_out')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-4">
                  <div className="text-3xl font-bold text-green-600">08:47</div>
                  <div className="text-sm text-gray-500">Current Time</div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm">Maria Papadaki</span>
                    <Badge variant="default">Clocked In</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm">Nikos Dimitriou</span>
                    <Badge variant="secondary">Off Shift</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm">Sofia Kostas</span>
                    <Badge variant="default">On Break</Badge>
                  </div>
                </div>

                <div className="pt-2">
                  <Button className="w-full">
                    <MapPin className="h-4 w-4 mr-2" />
                    {t('rota.gps_verify')}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Live Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { type: 'late', employee: 'Sofia Kostas', message: 'Late arrival - 15 min', time: '2 min ago', color: 'orange' },
                    { type: 'overtime', employee: 'Maria Papadaki', message: 'Overtime threshold reached', time: '5 min ago', color: 'yellow' },
                    { type: 'break', employee: 'Nikos Dimitriou', message: 'Break overrun - 20 min', time: '8 min ago', color: 'red' },
                  ].map((alert, i) => (
                    <div key={i} className={`p-3 border-l-4 border-${alert.color}-500 bg-${alert.color}-50 dark:bg-${alert.color}-950/20 rounded`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{alert.employee}</span>
                        <span className="text-xs text-gray-500">{alert.time}</span>
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        {alert.message}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Employee Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="h-4 w-4 mr-3" />
                    Request Time Off
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="h-4 w-4 mr-3" />
                    Swap Shift
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Clock className="h-4 w-4 mr-3" />
                    Update Availability
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-3" />
                    View My Schedule
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Bell className="h-4 w-4 mr-3" />
                    Notification Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 6. PUBLISHING & COMMUNICATIONS TAB */}
        <TabsContent value="publishing" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  {t('rota.publishing')} Workflow
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 p-4 border rounded">
                  <div className="flex items-center justify-center w-8 h-8 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                    1
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{t('rota.draft')}</div>
                    <div className="text-sm text-gray-500">Schedule created, not yet published</div>
                  </div>
                  <Badge variant="secondary">Current</Badge>
                </div>

                <div className="flex items-center gap-4 p-4 border rounded opacity-50">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    2
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{t('rota.publish')}</div>
                    <div className="text-sm text-gray-500">Send to all affected employees</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 border rounded opacity-30">
                  <div className="flex items-center justify-center w-8 h-8 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    3
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{t('rota.acknowledged')}</div>
                    <div className="text-sm text-gray-500">Staff confirm receipt</div>
                  </div>
                </div>

                <div className="pt-4 space-y-2">
                  <Button className="w-full">
                    <Send className="h-4 w-4 mr-2" />
                    Publish Schedule Now
                  </Button>
                  <div className="text-xs text-gray-500 text-center">
                    Will notify 4 employees via push, SMS & email
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckSquare className="h-5 w-5" />
                  Acknowledgment Tracking
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockEmployees.map((employee, i) => (
                    <div key={employee.id} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${i < 2 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        <div>
                          <div className="font-medium text-sm">{employee.name}</div>
                          <div className="text-xs text-gray-500">{employee.role}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        {i < 2 ? (
                          <div>
                            <Badge variant="default" className="mb-1">Acknowledged</Badge>
                            <div className="text-xs text-gray-500">2 hours ago</div>
                          </div>
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4">
                  <div className="text-sm text-gray-600 mb-2">Acknowledgment Rate</div>
                  <Progress value={50} className="h-2" />
                  <div className="text-xs text-gray-500 mt-1">2 of 4 employees confirmed</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 7. ANALYTICS TAB */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('rota.coverage_percent')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{mockAnalytics.coveragePercent}%</div>
                  <Progress value={mockAnalytics.coveragePercent} className="h-2 mt-2" />
                  <div className="text-sm text-gray-500 mt-2">Target: 90%</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('rota.forecast_accuracy')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{mockAnalytics.forecastAccuracy}%</div>
                  <div className="text-sm text-gray-500 mt-2">vs actual hours</div>
                  <div className="text-xs text-green-600 mt-1">+2.1% vs last month</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('rota.schedule_adherence')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">{mockAnalytics.scheduleAdherence}%</div>
                  <div className="text-sm text-gray-500 mt-2">on-time rate</div>
                  <div className="text-xs text-green-600 mt-1">Industry leading</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('rota.no_show_rate')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">{mockAnalytics.noShowRate}%</div>
                  <div className="text-sm text-gray-500 mt-2">monthly average</div>
                  <div className="text-xs text-green-600 mt-1">-0.8% vs last month</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Labor Health Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <h4 className="font-medium">{t('rota.understaffed')} Windows</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span>Monday 14:00-16:00</span>
                      <Badge variant="destructive">Critical</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Friday 22:00-00:00</span>
                      <Badge variant="secondary">Medium</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Sunday 10:00-12:00</span>
                      <Badge variant="outline">Low</Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">{t('rota.overtime_risk')}</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span>Maria Papadaki</span>
                      <span className="text-orange-600">42h/week</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Nikos Dimitriou</span>
                      <span className="text-green-600">35h/week</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Sofia Kostas</span>
                      <span className="text-red-600">47h/week</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">{t('rota.cost_per_role')}</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span>Front Desk</span>
                      <span>€12.50/h</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>F&B</span>
                      <span>€14.00/h</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Housekeeping</span>
                      <span>€11.00/h</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}