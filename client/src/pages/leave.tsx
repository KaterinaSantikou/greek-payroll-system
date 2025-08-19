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
  calculateEnhancedParentalLeave,
  calculateSpecialMaternityLeaveTransfer,
  calculateCarersLeave,
  calculateForceMajeureLeave,
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

  // Law 5089/2024 specific state
  const [parentalData2024, setParentalData2024] = useState({
    monthsEmployed: 18,
    children: [
      { birthDate: '2020-03-15', age: 4 },
      { birthDate: '2022-08-20', age: 2 }
    ],
    isParent: true,
    contractType: 'permanent' as 'fixed_term' | 'permanent' | 'temporary',
    hasEligibleCareRecipient: true,
    careRecipientRelation: 'relative' as 'relative' | 'household_member',
    medicalDocumentationAvailable: true,
    isParentOrCarer: true,
    usedOccurrencesThisYear: 0,
    emergencyType: 'illness' as 'illness' | 'accident' | 'emergency_care' | 'other',
    hasMedicalCertificate: true,
    familyMemberAffected: 'child' as 'spouse' | 'child' | 'parent' | 'sibling' | 'other'
  });

  const [maternityTransfer, setMaternityTransfer] = useState({
    isEligibleMother: true,
    motherType: 'birth_mother' as 'birth_mother' | 'adoptive_mother' | 'surrogacy_mother' | 'presumed_mother',
    monthsToTransfer: 3,
    partnerEligible: true
  });

  const [law2024Results, setLaw2024Results] = useState<any>(null);

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

  const handleCalculateLaw2024 = () => {
    const enhancedParental = calculateEnhancedParentalLeave(parentalData2024);
    const maternityTransferCalc = calculateSpecialMaternityLeaveTransfer(
      { isEligibleMother: maternityTransfer.isEligibleMother, motherType: maternityTransfer.motherType },
      { monthsToTransfer: maternityTransfer.monthsToTransfer, partnerEligible: maternityTransfer.partnerEligible }
    );
    const carersLeave = calculateCarersLeave(parentalData2024);
    const forceMajeureLeave = calculateForceMajeureLeave(parentalData2024);

    setLaw2024Results({
      enhancedParental,
      maternityTransfer: maternityTransferCalc,
      carersLeave,
      forceMajeureLeave
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
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="balance">Υπόλοιπα</TabsTrigger>
          <TabsTrigger value="request">Αίτημα Άδειας</TabsTrigger>
          <TabsTrigger value="entitlements">Δικαιώματα</TabsTrigger>
          <TabsTrigger value="parental-2024">Ν. 5089/2024</TabsTrigger>
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

        {/* Law 5089/2024 Parental & Family Leave Enhancements */}
        <TabsContent value="parental-2024">
          <div className="space-y-6">
            {/* Input Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Baby className="h-5 w-5" />
                  Νόμος 5089/2024 - Βελτιώσεις Γονικών & Οικογενειακών Αδειών
                </CardTitle>
                <CardDescription>
                  Νέες βελτιώσεις: Ενισχυμένη γονική άδεια, ειδική άδεια μητρότητας, άδεια φροντιστή, άδεια ανωτέρας βίας
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="monthsEmployed">Μήνες Απασχόλησης</Label>
                    <Input
                      id="monthsEmployed"
                      type="number"
                      value={parentalData2024.monthsEmployed}
                      onChange={(e) => setParentalData2024({...parentalData2024, monthsEmployed: parseInt(e.target.value) || 0})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="contractType">Τύπος Σύμβασης</Label>
                    <Select value={parentalData2024.contractType} onValueChange={(value: any) => setParentalData2024({...parentalData2024, contractType: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="permanent">Αορίστου Χρόνου</SelectItem>
                        <SelectItem value="fixed_term">Ορισμένου Χρόνου</SelectItem>
                        <SelectItem value="temporary">Προσωρινή</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="emergencyType">Τύπος Επείγουσας Κατάστασης</Label>
                    <Select value={parentalData2024.emergencyType} onValueChange={(value: any) => setParentalData2024({...parentalData2024, emergencyType: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="illness">Ασθένεια</SelectItem>
                        <SelectItem value="accident">Ατύχημα</SelectItem>
                        <SelectItem value="emergency_care">Επείγουσα Φροντίδα</SelectItem>
                        <SelectItem value="other">Άλλο</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="familyMember">Μέλος Οικογένειας</Label>
                    <Select value={parentalData2024.familyMemberAffected} onValueChange={(value: any) => setParentalData2024({...parentalData2024, familyMemberAffected: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="spouse">Σύζυγος</SelectItem>
                        <SelectItem value="child">Παιδί</SelectItem>
                        <SelectItem value="parent">Γονέας</SelectItem>
                        <SelectItem value="sibling">Αδελφός/ή</SelectItem>
                        <SelectItem value="other">Άλλο</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="monthsToTransfer">Μήνες προς Μεταφορά (Ειδική Άδεια Μητρότητας)</Label>
                    <Input
                      id="monthsToTransfer"
                      type="number"
                      min="0"
                      max="7"
                      value={maternityTransfer.monthsToTransfer}
                      onChange={(e) => setMaternityTransfer({...maternityTransfer, monthsToTransfer: parseInt(e.target.value) || 0})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="motherType">Τύπος Μητρότητας</Label>
                    <Select value={maternityTransfer.motherType} onValueChange={(value: any) => setMaternityTransfer({...maternityTransfer, motherType: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="birth_mother">Βιολογική Μητέρα</SelectItem>
                        <SelectItem value="adoptive_mother">Υιοθετούσα Μητέρα</SelectItem>
                        <SelectItem value="surrogacy_mother">Παρένθετη Μητέρα</SelectItem>
                        <SelectItem value="presumed_mother">Θεωρούμενη Μητέρα</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isParent"
                      checked={parentalData2024.isParent}
                      onCheckedChange={(checked) => setParentalData2024({...parentalData2024, isParent: checked})}
                    />
                    <Label htmlFor="isParent">Είναι Γονέας</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="hasEligibleCareRecipient"
                      checked={parentalData2024.hasEligibleCareRecipient}
                      onCheckedChange={(checked) => setParentalData2024({...parentalData2024, hasEligibleCareRecipient: checked})}
                    />
                    <Label htmlFor="hasEligibleCareRecipient">Έχει Επιλέξιμο Δικαιούχο Φροντίδας</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="medicalDocumentationAvailable"
                      checked={parentalData2024.medicalDocumentationAvailable}
                      onCheckedChange={(checked) => setParentalData2024({...parentalData2024, medicalDocumentationAvailable: checked})}
                    />
                    <Label htmlFor="medicalDocumentationAvailable">Ιατρική Τεκμηρίωση Διαθέσιμη</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="partnerEligible"
                      checked={maternityTransfer.partnerEligible}
                      onCheckedChange={(checked) => setMaternityTransfer({...maternityTransfer, partnerEligible: checked})}
                    />
                    <Label htmlFor="partnerEligible">Σύντροφος Επιλέξιμος</Label>
                  </div>
                </div>

                <Button onClick={handleCalculateLaw2024} className="w-full" size="lg">
                  <Calculator className="mr-2 h-4 w-4" />
                  Υπολογισμός Δικαιωμάτων Νόμου 5089/2024
                </Button>
              </CardContent>
            </Card>

            {/* Results Display */}
            {law2024Results && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Enhanced Parental Leave */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Baby className="h-5 w-5" />
                      Ενισχυμένη Γονική Άδεια
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`p-4 rounded-lg border-l-4 ${
                      law2024Results.enhancedParental.isEligible 
                        ? 'bg-green-50 border-green-500' 
                        : 'bg-red-50 border-red-500'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        {law2024Results.enhancedParental.isEligible ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        )}
                        <span className="font-medium">
                          {law2024Results.enhancedParental.isEligible ? 'Επιλέξιμος' : 'Μη Επιλέξιμος'}
                        </span>
                      </div>
                      
                      {law2024Results.enhancedParental.isEligible && (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span>Διαθέσιμοι μήνες:</span>
                            <Badge variant="default">
                              {law2024Results.enhancedParental.totalMonthsAvailable} μήνες
                            </Badge>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span>Επιλέξιμα τέκνα:</span>
                            <Badge variant="outline">
                              {law2024Results.enhancedParental.eligibleChildren.length}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap gap-1">
                            {law2024Results.enhancedParental.canBeSharedWithPartner && (
                              <Badge variant="secondary" className="text-xs">Διαμοιραζόμενη</Badge>
                            )}
                            {law2024Results.enhancedParental.canBeTakenInParts && (
                              <Badge variant="secondary" className="text-xs">Τμηματική</Badge>
                            )}
                          </div>
                          
                          {law2024Results.enhancedParental.benefits.length > 0 && (
                            <div>
                              <h5 className="font-medium mb-2">Παροχές:</h5>
                              <ul className="list-disc list-inside space-y-1 text-sm">
                                {law2024Results.enhancedParental.benefits.map((benefit: string, index: number) => (
                                  <li key={index}>{benefit}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {law2024Results.enhancedParental.restrictions.length > 0 && (
                        <div className="mt-3">
                          <h5 className="font-medium mb-2 text-red-600">Περιορισμοί:</h5>
                          <ul className="list-disc list-inside space-y-1 text-sm text-red-600">
                            {law2024Results.enhancedParental.restrictions.map((restriction: string, index: number) => (
                              <li key={index}>{restriction}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Special Maternity Leave Transfer */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Heart className="h-5 w-5" />
                      Ειδική Άδεια Μητρότητας
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`p-4 rounded-lg border-l-4 ${
                      law2024Results.maternityTransfer.isTransferValid 
                        ? 'bg-green-50 border-green-500' 
                        : 'bg-red-50 border-red-500'
                    }`}>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-2 bg-blue-50 rounded">
                            <div className="text-lg font-bold text-blue-600">
                              {law2024Results.maternityTransfer.motherRetainsMonths}
                            </div>
                            <div className="text-xs text-gray-600">Μήνες Μητέρας</div>
                          </div>
                          
                          <div className="text-center p-2 bg-green-50 rounded">
                            <div className="text-lg font-bold text-green-600">
                              {law2024Results.maternityTransfer.partnerReceivesMonths}
                            </div>
                            <div className="text-xs text-gray-600">Μήνες Συντρόφου</div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <span>Μέγιστη μεταφορά:</span>
                          <Badge variant="outline">
                            {law2024Results.maternityTransfer.maxTransferableMonths} μήνες
                          </Badge>
                        </div>

                        {law2024Results.maternityTransfer.warnings.length > 0 && (
                          <div>
                            <h5 className="font-medium mb-2 text-yellow-600">Προειδοποιήσεις:</h5>
                            <ul className="list-disc list-inside space-y-1 text-sm text-yellow-600">
                              {law2024Results.maternityTransfer.warnings.map((warning: string, index: number) => (
                                <li key={index}>{warning}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {law2024Results.maternityTransfer.errors.length > 0 && (
                          <div>
                            <h5 className="font-medium mb-2 text-red-600">Σφάλματα:</h5>
                            <ul className="list-disc list-inside space-y-1 text-sm text-red-600">
                              {law2024Results.maternityTransfer.errors.map((error: string, index: number) => (
                                <li key={index}>{error}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Carer's Leave */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Άδεια Φροντιστή
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`p-4 rounded-lg border-l-4 ${
                      law2024Results.carersLeave.isEligible 
                        ? 'bg-green-50 border-green-500' 
                        : 'bg-red-50 border-red-500'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        {law2024Results.carersLeave.isEligible ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        )}
                        <span className="font-medium">
                          {law2024Results.carersLeave.isEligible ? 'Επιλέξιμος' : 'Μη Επιλέξιμος'}
                        </span>
                      </div>

                      {law2024Results.carersLeave.isEligible && (
                        <div className="flex justify-between items-center mb-3">
                          <span>Διαθέσιμες ημέρες:</span>
                          <Badge variant="default">
                            {law2024Results.carersLeave.totalDaysAvailable} ημέρες
                          </Badge>
                        </div>
                      )}

                      {law2024Results.carersLeave.requirements.length > 0 && (
                        <div className="mb-3">
                          <h5 className="font-medium mb-2">Απαιτήσεις:</h5>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            {law2024Results.carersLeave.requirements.map((req: string, index: number) => (
                              <li key={index}>{req}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {law2024Results.carersLeave.restrictions.length > 0 && (
                        <div>
                          <h5 className="font-medium mb-2 text-gray-600">Περιορισμοί:</h5>
                          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                            {law2024Results.carersLeave.restrictions.map((restriction: string, index: number) => (
                              <li key={index}>{restriction}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Force Majeure Leave */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Άδεια Ανωτέρας Βίας
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`p-4 rounded-lg border-l-4 ${
                      law2024Results.forceMajeureLeave.isEligible 
                        ? 'bg-green-50 border-green-500' 
                        : 'bg-red-50 border-red-500'
                    }`}>
                      <div className="flex items-center gap-2 mb-3">
                        {law2024Results.forceMajeureLeave.isEligible ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        )}
                        <span className="font-medium">
                          {law2024Results.forceMajeureLeave.isEligible ? 'Επιλέξιμος' : 'Μη Επιλέξιμος'}
                        </span>
                        {law2024Results.forceMajeureLeave.isPaid && (
                          <Badge variant="default" className="text-xs">Αμειβόμενη</Badge>
                        )}
                      </div>

                      {law2024Results.forceMajeureLeave.isEligible && (
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div className="text-center p-2 bg-blue-50 rounded">
                            <div className="text-lg font-bold text-blue-600">
                              {law2024Results.forceMajeureLeave.remainingOccurrences}
                            </div>
                            <div className="text-xs text-gray-600">Περιστατικά</div>
                          </div>
                          
                          <div className="text-center p-2 bg-green-50 rounded">
                            <div className="text-lg font-bold text-green-600">
                              {law2024Results.forceMajeureLeave.remainingDays}
                            </div>
                            <div className="text-xs text-gray-600">Ημέρες</div>
                          </div>
                        </div>
                      )}

                      {law2024Results.forceMajeureLeave.nextSteps.length > 0 && (
                        <div className="mb-3">
                          <h5 className="font-medium mb-2 text-green-600">Επόμενα Βήματα:</h5>
                          <ul className="list-disc list-inside space-y-1 text-sm text-green-600">
                            {law2024Results.forceMajeureLeave.nextSteps.map((step: string, index: number) => (
                              <li key={index}>{step}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {law2024Results.forceMajeureLeave.eligibilityIssues.length > 0 && (
                        <div>
                          <h5 className="font-medium mb-2 text-red-600">Προβλήματα Επιλεξιμότητας:</h5>
                          <ul className="list-disc list-inside space-y-1 text-sm text-red-600">
                            {law2024Results.forceMajeureLeave.eligibilityIssues.map((issue: string, index: number) => (
                              <li key={index}>{issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}