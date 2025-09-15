import { useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Calculator,
  DollarSign,
  FileText,
  TrendingUp,
  Users,
  AlertTriangle,
} from 'lucide-react';
import {
  calculateCompletePayroll,
  calculateCollectiveAgreementWage,
  COLLECTIVE_AGREEMENTS,
  getIndustrySectors,
  validateMinimumWage,
  GREEK_TAX_BRACKETS,
  EFKA_RATES,
  TAX_FREE_ALLOWANCES,
} from '@/lib/payrollCalculations';

export default function PayrollPage() {
  const [payrollData, setPayrollData] = useState({
    grossSalary: '',
    annualIncome: '',
    maritalStatus: 'SINGLE',
    children: 0,
    hasDisability: false,
    specialInsuranceCategory: '',
    overtimeHours: 0,
    sundayHours: 0,
    allowances: 0,
    bonuses: 0,
    collectiveAgreement: 'GENERAL',
    experienceYears: 0,
    education: 'HIGH_SCHOOL',
  });

  const [calculation, setCalculation] = useState<any>(null);
  const [collectiveWage, setCollectiveWage] = useState<any>(null);

  const handleCalculatePayroll = () => {
    if (!payrollData.grossSalary) return;

    const grossSalary = parseFloat(payrollData.grossSalary);
    const annualIncome =
      parseFloat(payrollData.annualIncome) || grossSalary * 12;

    // Calculate collective agreement wage
    const caWage = calculateCollectiveAgreementWage(
      payrollData.collectiveAgreement as keyof typeof COLLECTIVE_AGREEMENTS,
      payrollData.experienceYears,
      payrollData.education,
      payrollData.maritalStatus,
      payrollData.children
    );

    // Use the higher of entered salary or collective agreement minimum
    const adjustedSalary = Math.max(grossSalary, caWage.totalWage);

    const result = calculateCompletePayroll({
      grossSalary: adjustedSalary,
      annualIncome,
      maritalStatus: payrollData.maritalStatus,
      children: payrollData.children,
      hasDisability: payrollData.hasDisability,
      specialInsuranceCategory:
        payrollData.specialInsuranceCategory || undefined,
      overtimeHours: payrollData.overtimeHours,
      sundayHours: payrollData.sundayHours,
      allowances: payrollData.allowances,
      bonuses: payrollData.bonuses,
    });

    setCalculation(result);
    setCollectiveWage(caWage);
  };

  const minimumWageCheck = payrollData.grossSalary
    ? validateMinimumWage(
        parseFloat(payrollData.grossSalary),
        payrollData.collectiveAgreement
      )
    : null;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Calculator className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">Υπολογισμός Μισθοδοσίας</h1>
          <p className="text-gray-600">
            Ελληνικό σύστημα φόρων και εργοδοτικών εισφορών 2025
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Στοιχεία Υπολογισμού
            </CardTitle>
            <CardDescription>
              Συμπληρώστε τα στοιχεία για τον υπολογισμό της μισθοδοσίας
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Basic Salary */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="grossSalary">Μικτός Μισθός (€)</Label>
                <Input
                  id="grossSalary"
                  type="number"
                  placeholder="1200"
                  value={payrollData.grossSalary}
                  onChange={e =>
                    setPayrollData({
                      ...payrollData,
                      grossSalary: e.target.value,
                    })
                  }
                />
                {minimumWageCheck && !minimumWageCheck.isCompliant && (
                  <p className="text-red-500 text-sm mt-1">
                    Κατώτατος μισθός: €{minimumWageCheck.minimumRequired}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="annualIncome">Ετήσιο Εισόδημα (€)</Label>
                <Input
                  id="annualIncome"
                  type="number"
                  placeholder="14400"
                  value={payrollData.annualIncome}
                  onChange={e =>
                    setPayrollData({
                      ...payrollData,
                      annualIncome: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            {/* Collective Agreement */}
            <div>
              <Label>Συλλογική Σύμβαση</Label>
              <Select
                value={payrollData.collectiveAgreement}
                onValueChange={value =>
                  setPayrollData({ ...payrollData, collectiveAgreement: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getIndustrySectors().map(sector => (
                    <SelectItem key={sector.value} value={sector.value}>
                      {sector.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Personal Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Οικογενειακή Κατάσταση</Label>
                <Select
                  value={payrollData.maritalStatus}
                  onValueChange={value =>
                    setPayrollData({ ...payrollData, maritalStatus: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SINGLE">Άγαμος/η</SelectItem>
                    <SelectItem value="MARRIED">Έγγαμος/η</SelectItem>
                    <SelectItem value="DIVORCED">Διαζευγμένος/η</SelectItem>
                    <SelectItem value="WIDOWED">Χήρος/α</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="children">Αριθμός Τέκνων</Label>
                <Input
                  id="children"
                  type="number"
                  min="0"
                  max="10"
                  value={payrollData.children}
                  onChange={e =>
                    setPayrollData({
                      ...payrollData,
                      children: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            {/* Professional Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="experienceYears">Χρόνια Προϋπηρεσίας</Label>
                <Input
                  id="experienceYears"
                  type="number"
                  min="0"
                  max="50"
                  value={payrollData.experienceYears}
                  onChange={e =>
                    setPayrollData({
                      ...payrollData,
                      experienceYears: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div>
                <Label>Επίπεδο Εκπαίδευσης</Label>
                <Select
                  value={payrollData.education}
                  onValueChange={value =>
                    setPayrollData({ ...payrollData, education: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HIGH_SCHOOL">Λύκειο</SelectItem>
                    <SelectItem value="TECHNICAL">
                      Τεχνική Εκπαίδευση
                    </SelectItem>
                    <SelectItem value="UNIVERSITY">Πανεπιστήμιο</SelectItem>
                    <SelectItem value="MASTERS">Μεταπτυχιακό</SelectItem>
                    <SelectItem value="PHD">Διδακτορικό</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Extra Hours and Allowances */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="overtimeHours">Ώρες Υπερεργασίας</Label>
                <Input
                  id="overtimeHours"
                  type="number"
                  min="0"
                  max="120"
                  step="0.5"
                  value={payrollData.overtimeHours}
                  onChange={e =>
                    setPayrollData({
                      ...payrollData,
                      overtimeHours: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div>
                <Label htmlFor="sundayHours">Κυριακάτικες Ώρες</Label>
                <Input
                  id="sundayHours"
                  type="number"
                  min="0"
                  max="40"
                  step="0.5"
                  value={payrollData.sundayHours}
                  onChange={e =>
                    setPayrollData({
                      ...payrollData,
                      sundayHours: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="allowances">Επιδόματα (€)</Label>
                <Input
                  id="allowances"
                  type="number"
                  min="0"
                  value={payrollData.allowances}
                  onChange={e =>
                    setPayrollData({
                      ...payrollData,
                      allowances: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div>
                <Label htmlFor="bonuses">Μπόνους (€)</Label>
                <Input
                  id="bonuses"
                  type="number"
                  min="0"
                  value={payrollData.bonuses}
                  onChange={e =>
                    setPayrollData({
                      ...payrollData,
                      bonuses: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            <Button
              onClick={handleCalculatePayroll}
              className="w-full"
              size="lg"
            >
              <Calculator className="mr-2 h-4 w-4" />
              Υπολογισμός Μισθοδοσίας
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-4">
          {/* Tax Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Φορολογικές Κλίμακες 2025
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {GREEK_TAX_BRACKETS.map((bracket, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center"
                  >
                    <span className="text-sm">
                      €{bracket.min.toLocaleString()} -{' '}
                      {bracket.max === Infinity
                        ? '∞'
                        : `€${bracket.max.toLocaleString()}`}
                    </span>
                    <Badge variant="outline">
                      {(bracket.rate * 100).toFixed(0)}%
                    </Badge>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              <div className="space-y-2">
                <h4 className="font-medium">Αφορολόγητα Όρια</h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Προσωπικό</span>
                    <span>
                      €{TAX_FREE_ALLOWANCES.personal.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Έγγαμος/η</span>
                    <span>€{TAX_FREE_ALLOWANCES.married.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ανά τέκνο</span>
                    <span>€{TAX_FREE_ALLOWANCES.child.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Αναπηρία</span>
                    <span>
                      €{TAX_FREE_ALLOWANCES.disability.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* EFKA Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Εισφορές ΕΦΚΑ 2025
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span>Εργαζόμενος</span>
                  <Badge>{(EFKA_RATES.employee.main * 100).toFixed(1)}%</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Εργοδότης</span>
                  <Badge variant="secondary">
                    {(EFKA_RATES.employer.main * 100).toFixed(2)}%
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Ανεργία (Εργαζόμενος)</span>
                  <Badge variant="outline">
                    {(EFKA_RATES.employee.unemployment * 100).toFixed(1)}%
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Ανεργία (Εργοδότης)</span>
                  <Badge variant="outline">
                    {(EFKA_RATES.employer.unemployment * 100).toFixed(2)}%
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Οικογενειακά Επιδόματα</span>
                  <Badge variant="outline">
                    {(EFKA_RATES.employer.family * 100).toFixed(1)}%
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Calculation Results */}
      {calculation && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Gross Earnings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <DollarSign className="h-5 w-5" />
                Μικτές Αποδοχές
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span>Βασικός Μισθός</span>
                <span className="font-medium">
                  €{calculation.gross.salary.toFixed(2)}
                </span>
              </div>
              {calculation.gross.overtime > 0 && (
                <div className="flex justify-between">
                  <span>Υπερεργασία</span>
                  <span className="font-medium">
                    €{calculation.gross.overtime.toFixed(2)}
                  </span>
                </div>
              )}
              {calculation.gross.sunday > 0 && (
                <div className="flex justify-between">
                  <span>Κυριακάτικα</span>
                  <span className="font-medium">
                    €{calculation.gross.sunday.toFixed(2)}
                  </span>
                </div>
              )}
              {calculation.gross.allowances > 0 && (
                <div className="flex justify-between">
                  <span>Επιδόματα</span>
                  <span className="font-medium">
                    €{calculation.gross.allowances.toFixed(2)}
                  </span>
                </div>
              )}
              {calculation.gross.bonuses > 0 && (
                <div className="flex justify-between">
                  <span>Μπόνους</span>
                  <span className="font-medium">
                    €{calculation.gross.bonuses.toFixed(2)}
                  </span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Σύνολο Μικτών</span>
                <span>€{calculation.gross.total.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Deductions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Κρατήσεις
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span>Φόρος Εισοδήματος</span>
                <span className="font-medium">
                  €{calculation.deductions.incomeTax.toFixed(2)}
                </span>
              </div>
              {calculation.deductions.solidarityTax > 0 && (
                <div className="flex justify-between">
                  <span>Έκτακτη Εισφορά Αλληλεγγύης</span>
                  <span className="font-medium">
                    €{calculation.deductions.solidarityTax.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Εισφορές ΕΦΚΑ</span>
                <span className="font-medium">
                  €{calculation.deductions.efkaEmployee.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Ανεργία</span>
                <span className="font-medium">
                  €{calculation.deductions.unemployment.toFixed(2)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Σύνολο Κρατήσεων</span>
                <span>€{calculation.deductions.total.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Net Pay & Employer Costs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-600">
                <Calculator className="h-5 w-5" />
                Καθαρά & Κόστος Εργοδότη
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-green-50 rounded-lg border-2 border-green-200">
                <div className="flex justify-between font-bold text-lg text-green-800">
                  <span>Καθαρός Μισθός</span>
                  <span>€{calculation.net.toFixed(2)}</span>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-medium text-gray-700">Κόστος Εργοδότη</h4>
                <div className="flex justify-between">
                  <span>Εισφορές ΕΦΚΑ</span>
                  <span className="font-medium">
                    €{calculation.employer.efkaEmployer.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Ανεργία</span>
                  <span className="font-medium">
                    €{calculation.employer.unemployment.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Οικογενειακά</span>
                  <span className="font-medium">
                    €{calculation.employer.family.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between font-bold border-t pt-2">
                  <span>Συνολικό Κόστος</span>
                  <span>
                    €
                    {(
                      calculation.gross.total + calculation.employer.total
                    ).toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Collective Agreement Results */}
      {collectiveWage && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Προσαρμογές Συλλογικής Σύμβασης
            </CardTitle>
            <CardDescription>
              Υπολογισμός βάσει{' '}
              {
                COLLECTIVE_AGREEMENTS[
                  payrollData.collectiveAgreement as keyof typeof COLLECTIVE_AGREEMENTS
                ]?.name
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  €{collectiveWage.baseWage}
                </div>
                <div className="text-sm text-gray-600">Βασικός Μισθός</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  €{collectiveWage.experienceBonus}
                </div>
                <div className="text-sm text-gray-600">
                  Επίδομα Προϋπηρεσίας
                </div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  €{collectiveWage.educationBonus}
                </div>
                <div className="text-sm text-gray-600">Επίδομα Μόρφωσης</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  €{collectiveWage.maritalBonus}
                </div>
                <div className="text-sm text-gray-600">
                  Οικογενειακό Επίδομα
                </div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium">
                  Συνολικός Μισθός Συλλογικής Σύμβασης
                </span>
                <span className="text-xl font-bold">
                  €{collectiveWage.totalWage}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
