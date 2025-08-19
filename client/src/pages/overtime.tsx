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
import { Clock, DollarSign, AlertTriangle, Calendar, Calculator, Sun, Moon, Zap } from "lucide-react";
import { 
  calculateOvertime,
  calculateSundayPremium,
  calculateNightShiftPremium,
  calculateHolidayPremium,
  calculateSpecialConditionsPremium,
  calculateTotalPremiumPay,
  isGreekHoliday,
  getOvertimeAndPremiumRates,
  OVERTIME_RATES,
  SUNDAY_RATES,
  NIGHT_SHIFT_RATES,
  HOLIDAY_RATES,
  SPECIAL_CONDITIONS
} from "@/lib/overtimeCalculations";

export default function OvertimePage() {
  const [employeeData, setEmployeeData] = useState({
    baseSalary: 1200,
    sector: "general",
    age: 30,
    hasHealthClearance: true,
    hasSpecialTraining: false,
    weeklyHoursWorked: 40,
    annualOvertimeHours: 50,
    monthlySundaysWorked: 1
  });

  const [workSession, setWorkSession] = useState({
    workDate: new Date().toISOString().split('T')[0],
    workStartTime: "08:00",
    workEndTime: "16:00",
    workingHours: 8,
    isOvertime: false,
    overtimeHours: 0,
    isSunday: false,
    isNightShift: false,
    hasSpecialConditions: false,
    specialConditionType: "" as keyof typeof SPECIAL_CONDITIONS
  });

  const [calculationResults, setCalculationResults] = useState<any>(null);

  const rates = getOvertimeAndPremiumRates();

  const handleCalculatePremium = () => {
    const hourlyRate = employeeData.baseSalary / (40 * 4.33);
    
    const results = calculateTotalPremiumPay(
      employeeData.baseSalary,
      workSession.workingHours,
      workSession.workDate,
      workSession.workStartTime,
      workSession.workEndTime,
      {
        isOvertime: workSession.isOvertime,
        overtimeHours: workSession.overtimeHours,
        isSunday: workSession.isSunday,
        isNightShift: workSession.isNightShift,
        hasSpecialConditions: workSession.hasSpecialConditions ? workSession.specialConditionType : undefined,
        employeeData: employeeData
      }
    );

    const holidayInfo = isGreekHoliday(workSession.workDate);
    
    setCalculationResults({
      ...results,
      hourlyRate,
      holidayInfo
    });
  };

  const calculateHours = () => {
    const start = new Date(`2000-01-01T${workSession.workStartTime}`);
    const end = new Date(`2000-01-01T${workSession.workEndTime}`);
    let hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    
    if (hours < 0) hours += 24; // Handle overnight shifts
    
    setWorkSession({
      ...workSession,
      workingHours: hours,
      overtimeHours: Math.max(0, hours - 8),
      isOvertime: hours > 8
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Clock className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">Υπερωρίες & Ειδικές Ώρες</h1>
          <p className="text-gray-600">Υπολογισμός υπερωριών και προσαυξήσεων σύμφωνα με το ελληνικό εργατικό δίκαιο</p>
        </div>
      </div>

      <Tabs defaultValue="calculator" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="calculator">Υπολογιστής</TabsTrigger>
          <TabsTrigger value="rates">Συντελεστές</TabsTrigger>
          <TabsTrigger value="holidays">Αργίες 2025</TabsTrigger>
          <TabsTrigger value="compliance">Συμμόρφωση</TabsTrigger>
        </TabsList>

        {/* Premium Calculator */}
        <TabsContent value="calculator">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              {/* Employee Data */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Στοιχεία Εργαζομένου
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="baseSalary">Βασικός Μισθός (€)</Label>
                    <Input
                      id="baseSalary"
                      type="number"
                      value={employeeData.baseSalary}
                      onChange={(e) => setEmployeeData({...employeeData, baseSalary: parseFloat(e.target.value)})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="sector">Κλάδος Εργασίας</Label>
                    <Select 
                      value={employeeData.sector} 
                      onValueChange={(value) => setEmployeeData({...employeeData, sector: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">Γενικός</SelectItem>
                        <SelectItem value="construction">Οικοδομικός</SelectItem>
                        <SelectItem value="healthcare">Υγειονομικός</SelectItem>
                        <SelectItem value="tourism">Τουριστικός</SelectItem>
                        <SelectItem value="transportation">Μεταφορές</SelectItem>
                        <SelectItem value="security">Ασφάλεια</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="age">Ηλικία</Label>
                    <Input
                      id="age"
                      type="number"
                      value={employeeData.age}
                      onChange={(e) => setEmployeeData({...employeeData, age: parseInt(e.target.value)})}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="healthClearance"
                        checked={employeeData.hasHealthClearance}
                        onCheckedChange={(checked) => setEmployeeData({...employeeData, hasHealthClearance: checked})}
                      />
                      <Label htmlFor="healthClearance">Ιατρική Εξέταση</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="specialTraining"
                        checked={employeeData.hasSpecialTraining}
                        onCheckedChange={(checked) => setEmployeeData({...employeeData, hasSpecialTraining: checked})}
                      />
                      <Label htmlFor="specialTraining">Ειδική Εκπαίδευση</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Work Session */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Βάρδια Εργασίας
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="workDate">Ημερομηνία</Label>
                    <Input
                      id="workDate"
                      type="date"
                      value={workSession.workDate}
                      onChange={(e) => setWorkSession({...workSession, workDate: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startTime">Ώρα Έναρξης</Label>
                      <Input
                        id="startTime"
                        type="time"
                        value={workSession.workStartTime}
                        onChange={(e) => setWorkSession({...workSession, workStartTime: e.target.value})}
                        onBlur={calculateHours}
                      />
                    </div>

                    <div>
                      <Label htmlFor="endTime">Ώρα Λήξης</Label>
                      <Input
                        id="endTime"
                        type="time"
                        value={workSession.workEndTime}
                        onChange={(e) => setWorkSession({...workSession, workEndTime: e.target.value})}
                        onBlur={calculateHours}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="workingHours">Συνολικές Ώρες</Label>
                    <Input
                      id="workingHours"
                      type="number"
                      step="0.5"
                      value={workSession.workingHours}
                      onChange={(e) => setWorkSession({...workSession, workingHours: parseFloat(e.target.value)})}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isSunday"
                        checked={workSession.isSunday}
                        onCheckedChange={(checked) => setWorkSession({...workSession, isSunday: checked})}
                      />
                      <Label htmlFor="isSunday">Κυριακάτικη Εργασία</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isNightShift"
                        checked={workSession.isNightShift}
                        onCheckedChange={(checked) => setWorkSession({...workSession, isNightShift: checked})}
                      />
                      <Label htmlFor="isNightShift">Νυχτερινή Βάρδια</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="hasSpecialConditions"
                        checked={workSession.hasSpecialConditions}
                        onCheckedChange={(checked) => setWorkSession({...workSession, hasSpecialConditions: checked})}
                      />
                      <Label htmlFor="hasSpecialConditions">Ειδικές Συνθήκες</Label>
                    </div>

                    {workSession.hasSpecialConditions && (
                      <div>
                        <Label htmlFor="specialCondition">Τύπος Ειδικών Συνθηκών</Label>
                        <Select 
                          value={workSession.specialConditionType} 
                          onValueChange={(value) => setWorkSession({...workSession, specialConditionType: value as keyof typeof SPECIAL_CONDITIONS})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Επιλέξτε τύπο" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="HAZARDOUS_WORK">Επικίνδυνη Εργασία</SelectItem>
                            <SelectItem value="EXTREME_WEATHER">Ακραίες Καιρικές Συνθήκες</SelectItem>
                            <SelectItem value="REMOTE_LOCATION">Απομακρυσμένη Τοποθεσία</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <Button 
                    onClick={handleCalculatePremium} 
                    className="w-full" 
                    size="lg"
                  >
                    <Calculator className="mr-2 h-4 w-4" />
                    Υπολογισμός Προσαυξήσεων
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Calculation Results */}
            {calculationResults && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Αποτελέσματα Υπολογισμού
                  </CardTitle>
                  <CardDescription>
                    Αναλυτικός υπολογισμός υπερωριών και προσαυξήσεων
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Summary */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-lg font-bold text-blue-600">
                        €{calculationResults.hourlyRate.toFixed(2)}/ώρα
                      </div>
                      <div className="text-sm text-gray-600">Ωριαίος Μισθός</div>
                    </div>

                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-lg font-bold text-green-600">
                        €{calculationResults.totalPay.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-600">Συνολική Αμοιβή</div>
                    </div>
                  </div>

                  {/* Holiday Check */}
                  {calculationResults.holidayInfo.isHoliday && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-red-600" />
                        <span className="font-medium text-red-800">
                          {calculationResults.holidayInfo.holidayName}
                        </span>
                        <Badge variant="destructive">
                          {calculationResults.holidayInfo.holidayType === 'national' ? 'Εθνική Εορτή' : 'Θρησκευτική Εορτή'}
                        </Badge>
                      </div>
                    </div>
                  )}

                  {/* Breakdown */}
                  <div className="space-y-3">
                    <h4 className="font-medium">Ανάλυση Αμοιβής</h4>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Βασική Αμοιβή:</span>
                        <span className="font-medium">€{calculationResults.basePay.toFixed(2)}</span>
                      </div>
                      
                      {calculationResults.overtimePay > 0 && (
                        <div className="flex justify-between text-orange-600">
                          <span>Υπερωρίες:</span>
                          <span className="font-medium">€{calculationResults.overtimePay.toFixed(2)}</span>
                        </div>
                      )}
                      
                      {calculationResults.sundayPremium > 0 && (
                        <div className="flex justify-between text-purple-600">
                          <span>Κυριακάτικη Προσαύξηση:</span>
                          <span className="font-medium">€{calculationResults.sundayPremium.toFixed(2)}</span>
                        </div>
                      )}
                      
                      {calculationResults.nightPremium > 0 && (
                        <div className="flex justify-between text-blue-600">
                          <span>Νυχτερινή Προσαύξηση:</span>
                          <span className="font-medium">€{calculationResults.nightPremium.toFixed(2)}</span>
                        </div>
                      )}
                      
                      {calculationResults.holidayPremium > 0 && (
                        <div className="flex justify-between text-red-600">
                          <span>Αργιακή Προσαύξηση:</span>
                          <span className="font-medium">€{calculationResults.holidayPremium.toFixed(2)}</span>
                        </div>
                      )}
                      
                      {calculationResults.specialConditionsPremium > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Ειδικές Συνθήκες:</span>
                          <span className="font-medium">€{calculationResults.specialConditionsPremium.toFixed(2)}</span>
                        </div>
                      )}
                      
                      <Separator />
                      
                      <div className="flex justify-between font-bold text-lg">
                        <span>Σύνολο Προσαυξήσεων:</span>
                        <span className="text-green-600">€{calculationResults.totalPremiumPay.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Violations and Approvals */}
                  {calculationResults.violations.length > 0 && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <span className="font-medium text-red-800">Παραβάσεις Νομοθεσίας</span>
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                        {calculationResults.violations.map((violation: string, index: number) => (
                          <li key={index}>{violation}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {calculationResults.approvalRequired && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        <span className="font-medium text-yellow-800">
                          Απαιτείται Έγκριση από τη Διοίκηση
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Rates Reference */}
        <TabsContent value="rates">
          <div className="space-y-6">
            {/* Overtime Rates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Συντελεστές Υπερωριών
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(OVERTIME_RATES).map(([key, rate]) => (
                    <div key={key} className="p-4 border rounded-lg">
                      <h4 className="font-medium">{rate.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{rate.description}</p>
                      <div className="mt-3 space-y-2">
                        <div className="flex justify-between">
                          <span>Προσαύξηση:</span>
                          <Badge variant="default">{((rate.multiplier - 1) * 100).toFixed(0)}%</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Μέγ. ημερήσιες ώρες:</span>
                          <span>{rate.maxDailyHours}h</span>
                        </div>
                        {(rate as any).maxWeeklyHours && (
                          <div className="flex justify-between">
                            <span>Μέγ. εβδομαδιαίες ώρες:</span>
                            <span>{(rate as any).maxWeeklyHours}h</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Sunday Rates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sun className="h-5 w-5" />
                  Συντελεστές Κυριακάτικης Εργασίας
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(SUNDAY_RATES).map(([key, rate]) => (
                    <div key={key} className="p-4 border rounded-lg">
                      <h4 className="font-medium">{rate.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{rate.description}</p>
                      <div className="mt-3 space-y-2">
                        <div className="flex justify-between">
                          <span>Προσαύξηση:</span>
                          <Badge variant="default">{((rate.multiplier - 1) * 100).toFixed(0)}%</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Εναλλακτική ανάπαυση:</span>
                          <Badge variant={rate.alternativeRest ? "default" : "secondary"}>
                            {rate.alternativeRest ? 'Ναι' : 'Όχι'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Night Shift Rates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Moon className="h-5 w-5" />
                  Συντελεστές Νυχτερινής Εργασίας
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(NIGHT_SHIFT_RATES).map(([key, rate]) => (
                    <div key={key} className="p-4 border rounded-lg">
                      <h4 className="font-medium">{rate.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{rate.description}</p>
                      <div className="mt-3 space-y-2">
                        <div className="flex justify-between">
                          <span>Προσαύξηση:</span>
                          <Badge variant="default">{((rate.multiplier - 1) * 100).toFixed(0)}%</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Ώρες:</span>
                          <span>{rate.startTime} - {rate.endTime}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Ελάχιστες ώρες:</span>
                          <span>{rate.minimumHours}h</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Greek Holidays 2025 */}
        <TabsContent value="holidays">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Ελληνικές Αργίες 2025
              </CardTitle>
              <CardDescription>
                Επίσημες αργίες με διπλή αμοιβή ή εναλλακτικό ρεπό
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rates.holidays.map((holiday, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">{holiday.name}</h4>
                      <Badge variant={holiday.type === 'national' ? 'destructive' : 'default'}>
                        {holiday.type === 'national' ? 'Εθνική' : 'Θρησκευτική'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      {new Date(holiday.date).toLocaleDateString('el-GR', { 
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                    <div className="mt-2">
                      <Badge variant="outline">
                        Προσαύξηση: {holiday.type === 'national' ? '100%' : '75%'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Information */}
        <TabsContent value="compliance">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Όρια Εργατικού Δικαίου
                </CardTitle>
                <CardDescription>
                  Νόμιμα όρια και περιορισμοί για υπερωρίες και ειδικές συνθήκες
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Ημερήσια Όρια</h4>
                    <ul className="space-y-2 text-sm">
                      <li>• Κανονικές ώρες: 8 ώρες/ημέρα</li>
                      <li>• Μέγιστες υπερωρίες: 2 ώρες/ημέρα</li>
                      <li>• Επείγουσες υπερωρίες: 4 ώρες/ημέρα</li>
                      <li>• Νυχτερινή εργασία: Ελάχιστο 3 ώρες</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Εβδομαδιαία Όρια</h4>
                    <ul className="space-y-2 text-sm">
                      <li>• Κανονικές ώρες: 40 ώρες/εβδομάδα</li>
                      <li>• Μέγιστες υπερωρίες: 8 ώρες/εβδομάδα</li>
                      <li>• Μέγιστο EU όριο: 48 ώρες/εβδομάδα</li>
                      <li>• Κυριακάτικη εργασία: Μέγιστο 4 Κυριακές/μήνα</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Ετήσια Όρια</h4>
                    <ul className="space-y-2 text-sm">
                      <li>• Μέγιστες υπερωρίες: 150 ώρες/έτος</li>
                      <li>• Επείγουσες υπερωρίες: Επιπλέον 50 ώρες/έτος</li>
                      <li>• Νυχτερινές βάρδιες: Ιατρικός έλεγχος</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Ειδικές Απαιτήσεις</h4>
                    <ul className="space-y-2 text-sm">
                      <li>• Έγκριση για υπερωρίες</li>
                      <li>• Ιατρική εξέταση για νυχτερινή εργασία</li>
                      <li>• Εναλλακτική ανάπαυση για Κυριακές</li>
                      <li>• Ειδική εκπαίδευση για επικίνδυνη εργασία</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Προσαυξήσεις Αμοιβής</CardTitle>
                <CardDescription>
                  Υποχρεωτικές προσαυξήσεις σύμφωνα με το Ν. 2874/2000 και συλλογικές συμβάσεις
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">25%</div>
                    <div className="text-sm text-gray-600">Κανονικές Υπερωρίες</div>
                  </div>

                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">75%</div>
                    <div className="text-sm text-gray-600">Κυριακάτικη Εργασία</div>
                  </div>

                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">25%</div>
                    <div className="text-sm text-gray-600">Νυχτερινή Βάρδια</div>
                  </div>

                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">100%</div>
                    <div className="text-sm text-gray-600">Εθνικές Αργίες</div>
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