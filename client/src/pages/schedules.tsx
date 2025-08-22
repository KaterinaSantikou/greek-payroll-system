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
import { Calendar, Clock, Users, AlertTriangle, CheckCircle, Settings, Timer, Calculator, FileText, DollarSign } from "lucide-react";
import { 
  CONTRACT_TYPES,
  SCHEDULE_TYPES,
  WORKING_TIME_ARRANGEMENTS,
  EU_WORKING_TIME_LIMITS,
  GREEK_LABOR_REQUIREMENTS,
  calculateTrialPeriod,
  validateWorkingTimeCompliance,
  generateWeeklySchedulePattern,
  calculatePremiumRates,
  getContractTypeOptions,
  getScheduleTypeOptions,
  getWorkingTimeArrangementOptions
} from "@/lib/workingTimeCalculations";

export default function SchedulesPage() {
  const [scheduleData, setScheduleData] = useState({
    // Employee Selection
    employeeId: "",
    
    // Contract Information
    contractType: "full-time",
    contractStartDate: "",
    contractEndDate: "",
    
    // Trial Period
    trialPeriodRequired: true,
    trialPeriodStartDate: "",
    trialPeriodDuration: 6,
    
    // Working Time Arrangement
    scheduleType: "predictable",
    workingTimeArrangement: "standard",
    standardWeeklyHours: 40,
    contractedHours: 40,
    maxWeeklyHours: 48,
    
    // Schedule Flexibility
    flexibleWorkArrangement: false,
    remoteWorkDays: 0,
    flexibleStartTime: "",
    flexibleEndTime: "",
    coreWorkingHours: "10:00-15:00",
    compressedWorkweek: false,
    
    // Daily Schedule
    dailyHours: 8,
    workDays: [1, 2, 3, 4, 5], // Monday-Friday
    startTime: "09:00",
    endTime: "17:00",
    
    // Breaks and Rest
    lunchBreakDuration: 30,
    shortBreakDuration: 15,
    minRestPeriod: 11,
    maxConsecutiveDays: 6,
    
    // Premium Conditions
    nightWork: false,
    weekendWork: false,
    holidayWork: false,
    hazardousWork: false
  });

  const [calculatedData, setCalculatedData] = useState<any>(null);
  const [complianceCheck, setComplianceCheck] = useState<any>(null);

  const handleCalculateSchedule = () => {
    // Calculate trial period if required
    let trialPeriodData = null;
    if (scheduleData.trialPeriodRequired && scheduleData.contractStartDate) {
      trialPeriodData = calculateTrialPeriod(
        scheduleData.contractType,
        "General Position", // This would come from employee data
        new Date(scheduleData.contractStartDate)
      );
    }

    // Generate weekly schedule pattern
    const schedulePattern = generateWeeklySchedulePattern(
      scheduleData.scheduleType,
      scheduleData.dailyHours,
      scheduleData.workDays
    );

    // Calculate premium rates
    const premiumData = calculatePremiumRates({
      isNightWork: scheduleData.nightWork,
      isWeekendWork: scheduleData.weekendWork,
      isHolidayWork: scheduleData.holidayWork,
      isHazardousWork: scheduleData.hazardousWork,
      scheduleType: scheduleData.scheduleType
    });

    // Validate compliance
    const compliance = validateWorkingTimeCompliance({
      weeklyHours: scheduleData.standardWeeklyHours,
      dailyHours: scheduleData.dailyHours,
      consecutiveDays: scheduleData.maxConsecutiveDays,
      restBetweenShifts: scheduleData.minRestPeriod,
      weekendWork: scheduleData.weekendWork,
      contractType: scheduleData.contractType
    });

    setCalculatedData({
      trialPeriod: trialPeriodData,
      schedulePattern,
      premiums: premiumData
    });

    setComplianceCheck(compliance);
  };

  const contractTypeInfo = CONTRACT_TYPES[scheduleData.contractType as keyof typeof CONTRACT_TYPES];
  const scheduleTypeInfo = SCHEDULE_TYPES[scheduleData.scheduleType as keyof typeof SCHEDULE_TYPES];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Calendar className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">Διαχείριση Ωραρίων Εργασίας</h1>
          <p className="text-gray-600">Ρύθμιση ωραρίων και συμβάσεων εργασίας σύμφωνα με το ελληνικό εργατικό δίκαιο</p>
        </div>
      </div>

      <Tabs defaultValue="schedule" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="schedule">Ωράριο Εργασίας</TabsTrigger>
          <TabsTrigger value="contract">Σύμβαση</TabsTrigger>
          <TabsTrigger value="trial">Δοκιμαστική Περίοδος</TabsTrigger>
          <TabsTrigger value="compliance">Συμμόρφωση</TabsTrigger>
        </TabsList>

        {/* Schedule Configuration */}
        <TabsContent value="schedule">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Διαμόρφωση Ωραρίου
                </CardTitle>
                <CardDescription>
                  Ρυθμίστε το εβδομαδιαίο πρόγραμμα εργασίας
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Schedule Type */}
                <div>
                  <Label>Τύπος Ωραρίου</Label>
                  <Select 
                    value={scheduleData.scheduleType} 
                    onValueChange={(value) => setScheduleData({...scheduleData, scheduleType: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getScheduleTypeOptions().map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {scheduleTypeInfo && (
                    <p className="text-sm text-gray-600 mt-1">{scheduleTypeInfo.description}</p>
                  )}
                </div>

                {/* Working Time Arrangement */}
                <div>
                  <Label>Διάταξη Εργασίας</Label>
                  <Select 
                    value={scheduleData.workingTimeArrangement} 
                    onValueChange={(value) => setScheduleData({...scheduleData, workingTimeArrangement: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getWorkingTimeArrangementOptions().map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Working Hours */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="standardWeeklyHours">Εβδομαδιαίες Ώρες</Label>
                    <Input
                      id="standardWeeklyHours"
                      type="number"
                      min="1"
                      max="48"
                      value={scheduleData.standardWeeklyHours}
                      onChange={(e) => setScheduleData({...scheduleData, standardWeeklyHours: parseInt(e.target.value)})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="dailyHours">Ημερήσιες Ώρες</Label>
                    <Input
                      id="dailyHours"
                      type="number"
                      min="1"
                      max="12"
                      step="0.5"
                      value={scheduleData.dailyHours}
                      onChange={(e) => setScheduleData({...scheduleData, dailyHours: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>

                {/* Schedule Times */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startTime">Ώρα Έναρξης</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={scheduleData.startTime}
                      onChange={(e) => setScheduleData({...scheduleData, startTime: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="endTime">Ώρα Λήξης</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={scheduleData.endTime}
                      onChange={(e) => setScheduleData({...scheduleData, endTime: e.target.value})}
                    />
                  </div>
                </div>

                {/* Flexible Work Options */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="flexibleWork"
                      checked={scheduleData.flexibleWorkArrangement}
                      onCheckedChange={(checked) => setScheduleData({...scheduleData, flexibleWorkArrangement: checked})}
                    />
                    <Label htmlFor="flexibleWork">Ευέλικτη Εργασία</Label>
                  </div>

                  {scheduleData.flexibleWorkArrangement && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="remoteWorkDays">Ημέρες Τηλεργασίας/Εβδομάδα</Label>
                        <Input
                          id="remoteWorkDays"
                          type="number"
                          min="0"
                          max="5"
                          value={scheduleData.remoteWorkDays}
                          onChange={(e) => setScheduleData({...scheduleData, remoteWorkDays: parseInt(e.target.value)})}
                        />
                      </div>

                      <div>
                        <Label htmlFor="coreWorkingHours">Κεντρικές Ώρες</Label>
                        <Input
                          id="coreWorkingHours"
                          placeholder="10:00-15:00"
                          value={scheduleData.coreWorkingHours}
                          onChange={(e) => setScheduleData({...scheduleData, coreWorkingHours: e.target.value})}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Special Conditions */}
                <div className="space-y-3">
                  <h4 className="font-medium">Ειδικές Συνθήκες Εργασίας</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="nightWork"
                        checked={scheduleData.nightWork}
                        onCheckedChange={(checked) => setScheduleData({...scheduleData, nightWork: checked})}
                      />
                      <Label htmlFor="nightWork">Νυχτερινή Εργασία</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="weekendWork"
                        checked={scheduleData.weekendWork}
                        onCheckedChange={(checked) => setScheduleData({...scheduleData, weekendWork: checked})}
                      />
                      <Label htmlFor="weekendWork">Εργασία Σαββατοκύριακου</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="hazardousWork"
                        checked={scheduleData.hazardousWork}
                        onCheckedChange={(checked) => setScheduleData({...scheduleData, hazardousWork: checked})}
                      />
                      <Label htmlFor="hazardousWork">Επικίνδυνη Εργασία</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="compressedWorkweek"
                        checked={scheduleData.compressedWorkweek}
                        onCheckedChange={(checked) => setScheduleData({...scheduleData, compressedWorkweek: checked})}
                      />
                      <Label htmlFor="compressedWorkweek">Τετραήμερη Εργασία</Label>
                    </div>
                  </div>
                </div>

                <Button onClick={handleCalculateSchedule} className="w-full" size="lg">
                  <Calculator className="mr-2 h-4 w-4" />
                  Υπολογισμός Ωραρίου
                </Button>
              </CardContent>
            </Card>

            {/* EU Working Time Limits */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Όρια Εργατικού Δικαίου
                </CardTitle>
                <CardDescription>
                  Ευρωπαϊκή Οδηγία και Ελληνική Νομοθεσία
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <h4 className="font-medium">Ευρωπαϊκή Οδηγία Χρόνου Εργασίας</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Μέγιστες εβδομαδιαίες ώρες</span>
                      <Badge variant="outline">{EU_WORKING_TIME_LIMITS.MAX_WEEKLY_HOURS}h</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Μέγιστες ημερήσιες ώρες</span>
                      <Badge variant="outline">{EU_WORKING_TIME_LIMITS.MAX_DAILY_HOURS}h</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Ελάχιστη ανάπαυση μεταξύ βαρδιών</span>
                      <Badge variant="outline">{EU_WORKING_TIME_LIMITS.MIN_REST_BETWEEN_SHIFTS}h</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Μέγιστες συνεχόμενες ημέρες</span>
                      <Badge variant="outline">{EU_WORKING_TIME_LIMITS.MAX_CONSECUTIVE_DAYS}</Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium">Ελληνικές Απαιτήσεις</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Κατώτατος μισθός 2025</span>
                      <Badge variant="secondary">€{GREEK_LABOR_REQUIREMENTS.MINIMUM_WAGE_2025}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Ημέρες ετήσιας άδειας</span>
                      <Badge variant="secondary">{GREEK_LABOR_REQUIREMENTS.ANNUAL_LEAVE_DAYS}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Μέγιστη δοκιμαστική περίοδος</span>
                      <Badge variant="secondary">{GREEK_LABOR_REQUIREMENTS.MAX_TRIAL_PERIOD_MONTHS} μήνες</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Επίδομα Κυριακής</span>
                      <Badge variant="secondary">{(GREEK_LABOR_REQUIREMENTS.SUNDAY_WORK_PREMIUM * 100)}%</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Contract Type Configuration */}
        <TabsContent value="contract">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Τύπος Σύμβασης
              </CardTitle>
              <CardDescription>
                Επιλέξτε και διαμορφώστε τον τύπο σύμβασης εργασίας
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Τύπος Σύμβασης</Label>
                <Select 
                  value={scheduleData.contractType} 
                  onValueChange={(value) => setScheduleData({...scheduleData, contractType: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getContractTypeOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {contractTypeInfo && (
                  <p className="text-sm text-gray-600 mt-2">{contractTypeInfo.description}</p>
                )}
              </div>

              {contractTypeInfo && (
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-medium">Χαρακτηριστικά Σύμβασης</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Ελάχιστες εβδομαδιαίες ώρες</span>
                        <Badge variant="outline">{contractTypeInfo.minWeeklyHours || 'Δ/Ι'}h</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Μέγιστες εβδομαδιαίες ώρες</span>
                        <Badge variant="outline">{contractTypeInfo.maxWeeklyHours || 'Δ/Ι'}h</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Πλήρη παροχές</span>
                        <Badge variant={contractTypeInfo.fullBenefits ? "default" : "secondary"}>
                          {contractTypeInfo.fullBenefits ? 'Ναι' : 'Αναλογικά'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium">Δοκιμαστική Περίοδος</h4>
                    <div className="space-y-2">
                      {contractTypeInfo.trialPeriodMonths && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-sm">Ελάχιστη διάρκεια</span>
                            <Badge variant="outline">{contractTypeInfo.trialPeriodMonths.min} μήνες</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Μέγιστη διάρκεια</span>
                            <Badge variant="outline">{contractTypeInfo.trialPeriodMonths.max} μήνες</Badge>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contractStartDate">Ημερομηνία Έναρξης</Label>
                  <Input
                    id="contractStartDate"
                    type="date"
                    value={scheduleData.contractStartDate}
                    onChange={(e) => setScheduleData({...scheduleData, contractStartDate: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="contractEndDate">Ημερομηνία Λήξης (για ορισμένου χρόνου)</Label>
                  <Input
                    id="contractEndDate"
                    type="date"
                    value={scheduleData.contractEndDate}
                    onChange={(e) => setScheduleData({...scheduleData, contractEndDate: e.target.value})}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trial Period Management */}
        <TabsContent value="trial">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-5 w-5" />
                Δοκιμαστική Περίοδος
              </CardTitle>
              <CardDescription>
                Διαχείριση και παρακολούθηση δοκιμαστικής περιόδου
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="trialPeriodRequired"
                  checked={scheduleData.trialPeriodRequired}
                  onCheckedChange={(checked) => setScheduleData({...scheduleData, trialPeriodRequired: checked})}
                />
                <Label htmlFor="trialPeriodRequired">Απαιτείται δοκιμαστική περίοδος</Label>
              </div>

              {scheduleData.trialPeriodRequired && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="trialPeriodStartDate">Ημερομηνία Έναρξης</Label>
                      <Input
                        id="trialPeriodStartDate"
                        type="date"
                        value={scheduleData.trialPeriodStartDate}
                        onChange={(e) => setScheduleData({...scheduleData, trialPeriodStartDate: e.target.value})}
                      />
                    </div>

                    <div>
                      <Label htmlFor="trialPeriodDuration">Διάρκεια (μήνες)</Label>
                      <Input
                        id="trialPeriodDuration"
                        type="number"
                        min="1"
                        max="12"
                        value={scheduleData.trialPeriodDuration}
                        onChange={(e) => setScheduleData({...scheduleData, trialPeriodDuration: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>

                  {calculatedData?.trialPeriod && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Υπολογισμένη Δοκιμαστική Περίοδος</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm text-gray-600">Συνιστώμενη διάρκεια:</span>
                          <p className="font-medium">{calculatedData.trialPeriod.recommendedDuration} μήνες</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Ημερομηνία λήξης:</span>
                          <p className="font-medium">{calculatedData.trialPeriod.endDate.toLocaleDateString('el-GR')}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Παράταση επιτρέπεται:</span>
                          <Badge variant={calculatedData.trialPeriod.extensionAllowed ? "default" : "secondary"}>
                            {calculatedData.trialPeriod.extensionAllowed ? 'Ναι' : 'Όχι'}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Αξιολογήσεις:</span>
                          <p className="font-medium">{calculatedData.trialPeriod.reviewDates.length} προγραμματισμένες</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Check */}
        <TabsContent value="compliance">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Compliance Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {complianceCheck?.isCompliant ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  )}
                  Κατάσταση Συμμόρφωσης
                </CardTitle>
                <CardDescription>
                  Έλεγχος συμμόρφωσης με το εργατικό δίκαιο
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {complianceCheck ? (
                  <>
                    <div className={`p-3 rounded-lg ${complianceCheck.isCompliant ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                      <div className="flex items-center gap-2">
                        {complianceCheck.isCompliant ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        )}
                        <span className={`font-medium ${complianceCheck.isCompliant ? 'text-green-800' : 'text-red-800'}`}>
                          {complianceCheck.isCompliant ? 'Συμμορφούται πλήρως' : 'Εντοπίστηκαν παραβάσεις'}
                        </span>
                      </div>
                    </div>

                    {complianceCheck.violations.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-red-600">Παραβάσεις:</h4>
                        {complianceCheck.violations.map((violation: string, index: number) => (
                          <div key={index} className="flex items-start gap-2 text-sm">
                            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                            <span className="text-red-700">{violation}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {complianceCheck.warnings.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-orange-600">Προειδοποιήσεις:</h4>
                        {complianceCheck.warnings.map((warning: string, index: number) => (
                          <div key={index} className="flex items-start gap-2 text-sm">
                            <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                            <span className="text-orange-700">{warning}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-gray-500">Κάντε υπολογισμό ωραρίου για έλεγχο συμμόρφωσης</p>
                )}
              </CardContent>
            </Card>

            {/* Premium Rates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Επιδόματα και Προσαυξήσεις
                </CardTitle>
                <CardDescription>
                  Υπολογισμός επιδομάτων για ειδικές συνθήκες εργασίας
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {calculatedData?.premiums ? (
                  <>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {(calculatedData.premiums.totalPremiumRate * 100).toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-600">Συνολική Προσαύξηση</div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium">Ανάλυση Επιδομάτων:</h4>
                      {calculatedData.premiums.premiumBreakdown.map((premium: any, index: number) => (
                        <div key={index} className="flex justify-between items-center">
                          <div>
                            <span className="font-medium">{premium.type}</span>
                            <p className="text-xs text-gray-600">{premium.description}</p>
                          </div>
                          <Badge variant="outline">
                            {(premium.rate * 100).toFixed(1)}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-gray-500">Κάντε υπολογισμό ωραρίου για προβολή επιδομάτων</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Weekly Schedule Pattern */}
      {calculatedData?.schedulePattern && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Εβδομαδιαίο Πρόγραμμα
            </CardTitle>
            <CardDescription>
              Λεπτομερές ημερήσιο πρόγραμμα εργασίας
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {calculatedData.schedulePattern.pattern.map((day: any, index: number) => (
                <div key={index} className={`p-3 rounded-lg border ${day.workHours > 0 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="text-center">
                    <div className="font-medium text-sm">{day.dayName}</div>
                    {day.workHours > 0 ? (
                      <>
                        <div className="text-xs text-gray-600 mt-1">
                          {day.startTime} - {day.endTime}
                        </div>
                        <div className="text-xs font-medium text-blue-600">
                          {day.workHours}h
                        </div>
                        {day.breaks.length > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            {day.breaks.length} διάλειμμα
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-xs text-gray-400 mt-1">Ανάπαυση</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-center">
              <Badge variant="secondary" className="text-lg">
                Σύνολο: {calculatedData.schedulePattern.totalWeeklyHours} ώρες/εβδομάδα
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}