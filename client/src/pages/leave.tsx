import { useState } from "react";
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
import { Calendar, Users, AlertTriangle, CheckCircle, Clock, Calculator, Plane, Heart, Baby, GraduationCap } from "lucide-react";
import { 
  calculateAnnualLeaveEntitlement,
  calculateLeaveBalance,
  validateLeaveRequest,
  calculateLeaveDays,
  checkLeaveConflicts,
  getLeaveTypesAndEntitlements,
  ANNUAL_LEAVE_ENTITLEMENTS,
  SICK_LEAVE_ENTITLEMENTS,
  PARENTAL_LEAVE_ENTITLEMENTS,
  SPECIAL_LEAVE_TYPES
} from "@/lib/leaveCalculations";

export default function LeavePage() {
  const [employeeData, setEmployeeData] = useState({
    startDate: "2020-01-15",
    dateOfBirth: "1985-05-20",
    hasChildren: true,
    numberOfChildren: 2,
    hasDisability: false,
    disabilityPercentage: 0,
    workPattern: "standard",
    gender: "female",
    currentAnnualUsed: 12,
    currentSickUsed: 3,
    pendingDays: 5,
    carriedOverDays: 2,
    hasUsedMandatoryDays: false,
    lastLeaveDate: "2024-08-15"
  });

  const [leaveRequest, setLeaveRequest] = useState({
    type: "annual",
    startDate: "",
    endDate: "",
    reason: "",
    emergencyLeave: false
  });

  const [calculations, setCalculations] = useState<any>(null);
  const [validation, setValidation] = useState<any>(null);

  const leaveTypes = getLeaveTypesAndEntitlements();

  const handleCalculateEntitlement = () => {
    const entitlement = calculateAnnualLeaveEntitlement(employeeData);
    const balance = calculateLeaveBalance(
      entitlement.totalDays,
      employeeData.currentAnnualUsed,
      employeeData.pendingDays,
      employeeData.carriedOverDays
    );

    setCalculations({
      entitlement,
      balance,
      sickLeaveBalance: {
        entitlement: SICK_LEAVE_ENTITLEMENTS.PAID_SICK_LEAVE.daysPerYear,
        used: employeeData.currentSickUsed,
        remaining: SICK_LEAVE_ENTITLEMENTS.PAID_SICK_LEAVE.daysPerYear - employeeData.currentSickUsed
      }
    });
  };

  const handleValidateLeave = () => {
    if (!leaveRequest.startDate || !leaveRequest.endDate) {
      return;
    }

    const leaveDays = calculateLeaveDays(leaveRequest.startDate, leaveRequest.endDate);
    const availableDays = calculations?.balance?.availableDays || 0;

    const validationResult = validateLeaveRequest(
      leaveRequest.type,
      leaveRequest.startDate,
      leaveRequest.endDate,
      {
        availableDays,
        hasUsedMandatoryDays: employeeData.hasUsedMandatoryDays,
        yearsOfService: Math.floor((new Date().getTime() - new Date(employeeData.startDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)),
        lastLeaveDate: employeeData.lastLeaveDate
      }
    );

    const existingLeaves = [
      { startDate: "2024-12-20", endDate: "2024-12-30", type: "annual", status: "approved" }
    ];

    const conflicts = checkLeaveConflicts(
      leaveRequest.startDate,
      leaveRequest.endDate,
      existingLeaves
    );

    setValidation({
      ...validationResult,
      leaveDays,
      conflicts
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Plane className="h-8 w-8 text-green-600" />
        <div>
          <h1 className="text-3xl font-bold">Διαχείριση Αδειών</h1>
          <p className="text-gray-600">Διαχείριση ετήσιων αδειών, αδειών ασθενείας και ειδικών αδειών</p>
        </div>
      </div>

      <Tabs defaultValue="balance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="balance">Υπόλοιπα</TabsTrigger>
          <TabsTrigger value="request">Αίτημα Άδειας</TabsTrigger>
          <TabsTrigger value="entitlements">Δικαιώματα</TabsTrigger>
          <TabsTrigger value="calendar">Ημερολόγιο</TabsTrigger>
          <TabsTrigger value="reports">Αναφορές</TabsTrigger>
        </TabsList>

        {/* Leave Balance */}
        <TabsContent value="balance">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Στοιχεία Εργαζομένου
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startDate">Ημερομηνία Έναρξης</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={employeeData.startDate}
                        onChange={(e) => setEmployeeData({...employeeData, startDate: e.target.value})}
                      />
                    </div>

                    <div>
                      <Label htmlFor="dateOfBirth">Ημερομηνία Γέννησης</Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={employeeData.dateOfBirth}
                        onChange={(e) => setEmployeeData({...employeeData, dateOfBirth: e.target.value})}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="gender">Φύλο</Label>
                    <Select 
                      value={employeeData.gender} 
                      onValueChange={(value) => setEmployeeData({...employeeData, gender: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Άνδρας</SelectItem>
                        <SelectItem value="female">Γυναίκα</SelectItem>
                        <SelectItem value="other">Άλλο</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="numberOfChildren">Αριθμός Τέκνων</Label>
                    <Input
                      id="numberOfChildren"
                      type="number"
                      value={employeeData.numberOfChildren}
                      onChange={(e) => setEmployeeData({...employeeData, numberOfChildren: parseInt(e.target.value)})}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="hasDisability"
                        checked={employeeData.hasDisability}
                        onCheckedChange={(checked) => setEmployeeData({...employeeData, hasDisability: checked})}
                      />
                      <Label htmlFor="hasDisability">Άτομο με Αναπηρία</Label>
                    </div>

                    {employeeData.hasDisability && (
                      <div>
                        <Label htmlFor="disabilityPercentage">Ποσοστό Αναπηρίας (%)</Label>
                        <Input
                          id="disabilityPercentage"
                          type="number"
                          value={employeeData.disabilityPercentage}
                          onChange={(e) => setEmployeeData({...employeeData, disabilityPercentage: parseInt(e.target.value)})}
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="workPattern">Τύπος Εργασίας</Label>
                    <Select 
                      value={employeeData.workPattern} 
                      onValueChange={(value) => setEmployeeData({...employeeData, workPattern: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Κανονικό Ωράριο</SelectItem>
                        <SelectItem value="continuous_shifts">Συνεχείς Βάρδιες</SelectItem>
                        <SelectItem value="part_time">Μερική Απασχόληση</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="currentAnnualUsed">Χρησιμοποιημένες Ετήσιες</Label>
                      <Input
                        id="currentAnnualUsed"
                        type="number"
                        value={employeeData.currentAnnualUsed}
                        onChange={(e) => setEmployeeData({...employeeData, currentAnnualUsed: parseInt(e.target.value)})}
                      />
                    </div>

                    <div>
                      <Label htmlFor="currentSickUsed">Χρησιμοποιημένες Ασθενείας</Label>
                      <Input
                        id="currentSickUsed"
                        type="number"
                        value={employeeData.currentSickUsed}
                        onChange={(e) => setEmployeeData({...employeeData, currentSickUsed: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>

                  <Button 
                    onClick={handleCalculateEntitlement} 
                    className="w-full" 
                    size="lg"
                  >
                    <Calculator className="mr-2 h-4 w-4" />
                    Υπολογισμός Δικαιωμάτων
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Leave Balance Results */}
            {calculations && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Plane className="h-5 w-5" />
                      Ετήσια Άδεια
                    </CardTitle>
                    <CardDescription>
                      Υπόλοιπο και δικαιώματα ετήσιας άδειας
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {calculations.entitlement.totalDays}
                        </div>
                        <div className="text-sm text-gray-600">Συνολικές Ημέρες</div>
                      </div>

                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {calculations.balance.availableDays}
                        </div>
                        <div className="text-sm text-gray-600">Διαθέσιμες</div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Χρήση Ετήσιας Άδειας</span>
                        <span>{calculations.balance.usedDays}/{calculations.balance.totalEntitlement}</span>
                      </div>
                      <Progress 
                        value={(calculations.balance.usedDays / calculations.balance.totalEntitlement) * 100} 
                        className="h-2"
                      />
                    </div>

                    {/* Breakdown */}
                    <div className="space-y-3">
                      <h4 className="font-medium">Ανάλυση Δικαιωμάτων</h4>
                      {calculations.entitlement.breakdown.map((item: any, index: number) => (
                        <div key={index} className="flex justify-between items-center py-2 border-b">
                          <div>
                            <div className="font-medium">{item.description}</div>
                            <div className="text-sm text-gray-600">{item.reason}</div>
                          </div>
                          <Badge variant="outline">{item.days} ημέρες</Badge>
                        </div>
                      ))}
                    </div>

                    {/* Balance Details */}
                    <div className="space-y-2 pt-4 border-t">
                      <div className="flex justify-between">
                        <span>Χρησιμοποιημένες:</span>
                        <span className="font-medium">{calculations.balance.usedDays}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Εκκρεμείς:</span>
                        <span className="font-medium">{calculations.balance.pendingDays}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Από προηγούμενο έτος:</span>
                        <span className="font-medium">{employeeData.carriedOverDays}</span>
                      </div>
                      {calculations.balance.carryOverEligible > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Μεταφορά στο επόμενο έτος:</span>
                          <span className="font-medium">{calculations.balance.carryOverEligible}</span>
                        </div>
                      )}
                      {calculations.balance.mustUseBeforeYearEnd > 0 && (
                        <div className="flex justify-between text-red-600">
                          <span>Πρέπει να χρησιμοποιηθούν φέτος:</span>
                          <span className="font-medium">{calculations.balance.mustUseBeforeYearEnd}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Heart className="h-5 w-5" />
                      Άδεια Ασθενείας
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="p-3 bg-red-50 rounded-lg">
                        <div className="text-lg font-bold text-red-600">
                          {calculations.sickLeaveBalance.entitlement}
                        </div>
                        <div className="text-sm text-gray-600">Δικαίωμα</div>
                      </div>

                      <div className="p-3 bg-orange-50 rounded-lg">
                        <div className="text-lg font-bold text-orange-600">
                          {calculations.sickLeaveBalance.used}
                        </div>
                        <div className="text-sm text-gray-600">Χρησιμοποιημένες</div>
                      </div>

                      <div className="p-3 bg-green-50 rounded-lg">
                        <div className="text-lg font-bold text-green-600">
                          {calculations.sickLeaveBalance.remaining}
                        </div>
                        <div className="text-sm text-gray-600">Υπόλοιπο</div>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Χρήση Άδειας Ασθενείας</span>
                        <span>{calculations.sickLeaveBalance.used}/{calculations.sickLeaveBalance.entitlement}</span>
                      </div>
                      <Progress 
                        value={(calculations.sickLeaveBalance.used / calculations.sickLeaveBalance.entitlement) * 100} 
                        className="h-2"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Leave Request */}
        <TabsContent value="request">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Αίτημα Άδειας
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="leaveType">Τύπος Άδειας</Label>
                  <Select 
                    value={leaveRequest.type} 
                    onValueChange={(value) => setLeaveRequest({...leaveRequest, type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="annual">Ετήσια Άδεια</SelectItem>
                      <SelectItem value="sick">Άδεια Ασθενείας</SelectItem>
                      <SelectItem value="maternity">Άδεια Μητρότητας</SelectItem>
                      <SelectItem value="paternity">Άδεια Πατρότητας</SelectItem>
                      <SelectItem value="marriage">Άδεια Γάμου</SelectItem>
                      <SelectItem value="bereavement">Άδεια Θανάτου</SelectItem>
                      <SelectItem value="personal">Προσωπική Άδεια</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Ημερομηνία Έναρξης</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={leaveRequest.startDate}
                      onChange={(e) => setLeaveRequest({...leaveRequest, startDate: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="endDate">Ημερομηνία Λήξης</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={leaveRequest.endDate}
                      onChange={(e) => setLeaveRequest({...leaveRequest, endDate: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="reason">Αιτιολογία</Label>
                  <Input
                    id="reason"
                    placeholder="Προαιρετική αιτιολογία..."
                    value={leaveRequest.reason}
                    onChange={(e) => setLeaveRequest({...leaveRequest, reason: e.target.value})}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="emergencyLeave"
                    checked={leaveRequest.emergencyLeave}
                    onCheckedChange={(checked) => setLeaveRequest({...leaveRequest, emergencyLeave: checked})}
                  />
                  <Label htmlFor="emergencyLeave">Επείγουσα Άδεια</Label>
                </div>

                <Button 
                  onClick={handleValidateLeave} 
                  className="w-full" 
                  size="lg"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Επικύρωση Αιτήματος
                </Button>
              </CardContent>
            </Card>

            {/* Validation Results */}
            {validation && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Αποτελέσματα Επικύρωσης
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Summary */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-lg font-bold text-blue-600">
                        {validation.leaveDays}
                      </div>
                      <div className="text-sm text-gray-600">Ημέρες Άδειας</div>
                    </div>

                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className={`text-lg font-bold ${validation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                        {validation.isValid ? 'Έγκυρο' : 'Μη Έγκυρο'}
                      </div>
                      <div className="text-sm text-gray-600">Κατάσταση</div>
                    </div>
                  </div>

                  {/* Errors */}
                  {validation.errors.length > 0 && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <span className="font-medium text-red-800">Σφάλματα</span>
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                        {validation.errors.map((error: string, index: number) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Warnings */}
                  {validation.warnings.length > 0 && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        <span className="font-medium text-yellow-800">Προειδοποιήσεις</span>
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700">
                        {validation.warnings.map((warning: string, index: number) => (
                          <li key={index}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Suggestions */}
                  {validation.suggestions.length > 0 && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-5 w-5 text-blue-600" />
                        <span className="font-medium text-blue-800">Προτάσεις</span>
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-sm text-blue-700">
                        {validation.suggestions.map((suggestion: string, index: number) => (
                          <li key={index}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Conflicts */}
                  {validation.conflicts.hasConflicts && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <span className="font-medium text-red-800">Συγκρούσεις Αδειών</span>
                      </div>
                      {validation.conflicts.conflicts.map((conflict: any, index: number) => (
                        <div key={index} className="text-sm text-red-700">
                          Επικάλυψη με {conflict.type}: {conflict.startDate} - {conflict.endDate} 
                          ({conflict.overlapDays} ημέρες)
                        </div>
                      ))}
                    </div>
                  )}

                  {validation.isValid && (
                    <Button className="w-full" size="lg">
                      <Plane className="mr-2 h-4 w-4" />
                      Υποβολή Αιτήματος
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Leave Entitlements Reference */}
        <TabsContent value="entitlements">
          <div className="space-y-6">
            {/* Annual Leave */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plane className="h-5 w-5" />
                  Ετήσια Άδεια
                </CardTitle>
                <CardDescription>
                  Δικαιώματα ετήσιας άδειας βάσει ελληνικής νομοθεσίας
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Βασικά Δικαιώματα</h4>
                    <div className="space-y-2">
                      {ANNUAL_LEAVE_ENTITLEMENTS.BASIC.increments.map((increment, index) => (
                        <div key={index} className="flex justify-between p-2 border rounded">
                          <span>{increment.years === 0 ? '0' : increment.years}+ έτη υπηρεσίας</span>
                          <Badge variant="outline">{increment.days} ημέρες</Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Ειδικές Κατηγορίες</h4>
                    <div className="space-y-3">
                      {Object.entries(ANNUAL_LEAVE_ENTITLEMENTS.SPECIAL_CATEGORIES).map(([key, category]) => (
                        <div key={key} className="p-3 border rounded">
                          <div className="font-medium">{category.name}</div>
                          <div className="text-sm text-gray-600 mt-1">{category.description}</div>
                          <Badge variant="default" className="mt-2">+{category.extraDays} ημέρες</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sick Leave */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Άδεια Ασθενείας
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(SICK_LEAVE_ENTITLEMENTS).map(([key, leave]) => (
                    <div key={key} className="p-4 border rounded">
                      <h4 className="font-medium">{leave.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{leave.description}</p>
                      <div className="mt-3 space-y-2">
                        <div className="flex justify-between">
                          <span>Ημέρες:</span>
                          <Badge variant="outline">
                            {(leave as any).daysPerYear || (leave as any).maxDaysPerYear || 'Ανάλογα'}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Πληρωμή:</span>
                          <Badge variant="default">
                            {((leave as any).paymentRate * 100).toFixed(0)}%
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Parental Leave */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Baby className="h-5 w-5" />
                  Γονική Άδεια
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(PARENTAL_LEAVE_ENTITLEMENTS).map(([key, leave]) => (
                    <div key={key} className="p-4 border rounded">
                      <h4 className="font-medium">{leave.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{leave.description}</p>
                      <div className="mt-3 space-y-2">
                        <div className="flex justify-between">
                          <span>Διάρκεια:</span>
                          <Badge variant="outline">
                            {(leave as any).totalDays ? `${(leave as any).totalDays} ημέρες` : 
                             (leave as any).totalMonths ? `${(leave as any).totalMonths} μήνες` : 'Ανάλογα'}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Πληρωμή:</span>
                          <Badge variant="default">
                            {((leave as any).paymentRate * 100).toFixed(0)}%
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Special Leave */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Ειδικές Άδειες
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(SPECIAL_LEAVE_TYPES).map(([key, leave]) => (
                    <div key={key} className="p-4 border rounded">
                      <h4 className="font-medium">{leave.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{leave.description}</p>
                      <div className="mt-3 space-y-2">
                        <div className="flex justify-between">
                          <span>Ημέρες:</span>
                          <Badge variant="outline">
                            {typeof (leave as any).days === 'object' ? 'Ανάλογα' : 
                             (leave as any).days || (leave as any).maxDaysPerYear || 'Ανάλογα'}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Πληρωμή:</span>
                          <Badge variant="default">
                            {((leave as any).paymentRate * 100).toFixed(0)}%
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Calendar View */}
        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Ημερολόγιο Αδειών
              </CardTitle>
              <CardDescription>
                Προβολή προγραμματισμένων αδειών και διαθεσιμότητας
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-gray-500 py-8">
                <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p>Το ημερολόγιο αδειών θα εμφανιστεί εδώ</p>
                <p className="text-sm">Ενσωμάτωση με σύστημα ημερολογίου σε εξέλιξη</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports */}
        <TabsContent value="reports">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Αναφορές Αδειών
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full justify-start">
                  <Plane className="mr-2 h-4 w-4" />
                  Αναφορά Ετήσιων Αδειών
                </Button>
                
                <Button variant="outline" className="w-full justify-start">
                  <Heart className="mr-2 h-4 w-4" />
                  Αναφορά Αδειών Ασθενείας
                </Button>
                
                <Button variant="outline" className="w-full justify-start">
                  <Baby className="mr-2 h-4 w-4" />
                  Αναφορά Γονικών Αδειών
                </Button>
                
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="mr-2 h-4 w-4" />
                  Μηνιαία Αναφορά
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Στατιστικά Τμήματος</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Μέσος όρος αδειών:</span>
                    <span className="font-medium">18.5 ημέρες</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Εκκρεμείς αιτήσεις:</span>
                    <span className="font-medium">7</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Χρήση άδειας ασθενείας:</span>
                    <span className="font-medium">12%</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Αδιάθετο προσωπικό:</span>
                    <span className="font-medium">3 άτομα</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}