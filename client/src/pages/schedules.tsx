import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { 
  Calendar, 
  Clock, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  DollarSign,
  Shield,
  Send,
  ChevronRight,
  Edit,
  Eye,
  Plus,
  MoreHorizontal
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

// Mock data following UX principles - summary level only
const mockScheduleSummary = {
  currentWeek: "Jan 20-26, 2025",
  status: "draft",
  coverage: 87.3,
  budgetStatus: "under",
  budgetPercent: 92.1,
  staffCount: 4,
  totalShifts: 28,
  complianceIssues: 1,
  pendingApprovals: 3
};

const mockWeeklyShifts = [
  { day: "Mon", shifts: 4, coverage: 100, cost: 320 },
  { day: "Tue", shifts: 4, coverage: 100, cost: 320 },
  { day: "Wed", shifts: 3, coverage: 75, cost: 240 },
  { day: "Thu", shifts: 4, coverage: 100, cost: 320 },
  { day: "Fri", shifts: 4, coverage: 100, cost: 320 },
  { day: "Sat", shifts: 5, coverage: 125, cost: 400 },
  { day: "Sun", shifts: 4, coverage: 100, cost: 380 }, // Sunday premium
];

export default function Schedules() {
  const { t } = useTranslation();
  const [selectedDetail, setSelectedDetail] = useState<string | null>(null);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header with Primary Action */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('nav.schedules')}</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {mockScheduleSummary.currentWeek} • {mockScheduleSummary.staffCount} staff • {mockScheduleSummary.totalShifts} shifts
          </p>
        </div>
        
        {/* Single Primary Action */}
        <Button size="lg" className="bg-green-600 hover:bg-green-700">
          <Send className="h-5 w-5 mr-2" />
          Publish Schedule
        </Button>
      </div>

      {/* Context Strip (1 only) */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950/20 dark:to-green-950/20 rounded-lg">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium">Greek Compliance</span>
            {mockScheduleSummary.complianceIssues > 0 ? (
              <Badge variant="secondary">{mockScheduleSummary.complianceIssues} issue</Badge>
            ) : (
              <Badge variant="default">✓ Clear</Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            <span className="text-sm">Budget: {mockScheduleSummary.budgetPercent}%</span>
            <Badge variant="default">Under Budget</Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            <span className="text-sm">{mockScheduleSummary.pendingApprovals} pending approvals</span>
          </div>
        </div>
        
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          DRAFT
        </Badge>
      </div>

      {/* 4 Cards Maximum - Core Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: Schedule Overview */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedDetail('overview')}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Schedule Overview
              </CardTitle>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Coverage</span>
                <span className="font-semibold text-green-600">{mockScheduleSummary.coverage}%</span>
              </div>
              <Progress value={mockScheduleSummary.coverage} className="h-2" />
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-gray-500">Shifts</div>
                  <div className="font-medium">{mockScheduleSummary.totalShifts}</div>
                </div>
                <div>
                  <div className="text-gray-500">Staff</div>
                  <div className="font-medium">{mockScheduleSummary.staffCount}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: People & Requests */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedDetail('people')}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                People & Requests
              </CardTitle>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Pending Requests</span>
                <Badge variant="secondary">{mockScheduleSummary.pendingApprovals}</Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Time Off</span>
                  <span className="text-orange-600">2</span>
                </div>
                <div className="flex justify-between">
                  <span>Shift Swaps</span>
                  <span className="text-blue-600">1</span>
                </div>
                <div className="flex justify-between">
                  <span>Available Staff</span>
                  <span className="text-green-600">4/4</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Budget & Costs */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedDetail('budget')}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Budget & Costs
              </CardTitle>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Weekly Budget</span>
                <span className="font-semibold text-green-600">{mockScheduleSummary.budgetPercent}%</span>
              </div>
              <Progress value={mockScheduleSummary.budgetPercent} className="h-2" />
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-gray-500">Budgeted</div>
                  <div className="font-medium">€2,800</div>
                </div>
                <div>
                  <div className="text-gray-500">Forecast</div>
                  <div className="font-medium text-green-600">€2,580</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Compliance Status */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedDetail('compliance')}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                Compliance Status
              </CardTitle>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Weekly Hours: ✓</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Rest Periods: ✓</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span>Night Shifts: Review</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>ERGANI II: Synced</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progressive Disclosure - Detail Sheets */}
      {/* Schedule Overview Detail */}
      <Sheet open={selectedDetail === 'overview'} onOpenChange={() => setSelectedDetail(null)}>
        <SheetContent className="w-[600px] sm:max-w-[600px]">
          <SheetHeader>
            <SheetTitle>Schedule Overview</SheetTitle>
            <SheetDescription>{mockScheduleSummary.currentWeek}</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="grid gap-4">
              {mockWeeklyShifts.map((day) => (
                <div key={day.day} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    <div className="font-medium w-8">{day.day}</div>
                    <div className="text-sm text-gray-600">{day.shifts} shifts</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={day.coverage < 100 ? 'destructive' : day.coverage > 100 ? 'secondary' : 'default'}>
                      {day.coverage}%
                    </Badge>
                    <span className="text-sm font-medium">€{day.cost}</span>
                    <Button size="sm" variant="ghost">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-4">
              <Button className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Shift
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* People & Requests Detail */}
      <Sheet open={selectedDetail === 'people'} onOpenChange={() => setSelectedDetail(null)}>
        <SheetContent className="w-[600px] sm:max-w-[600px]">
          <SheetHeader>
            <SheetTitle>People & Requests</SheetTitle>
            <SheetDescription>Manage staff availability and requests</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-3">
              <h4 className="font-medium">Pending Approvals</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <div className="font-medium">Maria Papadaki</div>
                    <div className="text-sm text-gray-600">Time off: Jan 25-27</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm">Approve</Button>
                    <Button size="sm" variant="outline">Reject</Button>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <div className="font-medium">Nikos Dimitriou</div>
                    <div className="text-sm text-gray-600">Shift swap with Sofia</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm">Approve</Button>
                    <Button size="sm" variant="outline">Reject</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Budget Detail */}
      <Sheet open={selectedDetail === 'budget'} onOpenChange={() => setSelectedDetail(null)}>
        <SheetContent className="w-[600px] sm:max-w-[600px]">
          <SheetHeader>
            <SheetTitle>Budget & Cost Analysis</SheetTitle>
            <SheetDescription>Weekly budget tracking and forecasts</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Weekly Budget</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">€2,800</div>
                  <Progress value={92.1} className="h-2 mt-2" />
                  <div className="text-sm text-gray-600 mt-1">€2,580 used (92.1%)</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Cost by Role</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Front Desk</span>
                    <span>€800</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>F&B</span>
                    <span>€920</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Housekeeping</span>
                    <span>€580</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Maintenance</span>
                    <span>€280</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Compliance Detail */}
      <Sheet open={selectedDetail === 'compliance'} onOpenChange={() => setSelectedDetail(null)}>
        <SheetContent className="w-[600px] sm:max-w-[600px]">
          <SheetHeader>
            <SheetTitle>Greek Labor Compliance</SheetTitle>
            <SheetDescription>Compliance status and violations</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Weekly Hours (48h max)</span>
                </div>
                <Badge variant="default">✓ Compliant</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Rest Between Shifts (11h min)</span>
                </div>
                <Badge variant="default">✓ Compliant</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <span className="font-medium">Night Shifts (22:00-06:00)</span>
                </div>
                <Badge variant="secondary">Review Required</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium">ERGANI II Sync</span>
                </div>
                <Badge variant="default">✓ Up to Date</Badge>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}