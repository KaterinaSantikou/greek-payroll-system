import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { calculatePayroll, type PayrollInput, type PayrollResult } from "@/lib/payrollCalculations";
import { Calculator, Save, FileText, Printer } from "lucide-react";
import type { Employee } from "@shared/schema";

interface PayrollCalculatorProps {
  employees: Employee[];
}

interface PayrollFormData {
  employeeId: string;
  payrollMonth: string;
  basicSalary: string;
  bonuses: string;
  overtimeHours: string;
  nightHours: string;
  holidayHours: string;
  collectiveAgreement: string;
}

export default function PayrollCalculator({ employees }: PayrollCalculatorProps) {
  const [payrollResult, setPayrollResult] = useState<PayrollResult | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PayrollFormData>({
    defaultValues: {
      payrollMonth: new Date().toISOString().slice(0, 7),
      basicSalary: "",
      bonuses: "0",
      overtimeHours: "0",
      nightHours: "0",
      holidayHours: "0",
      collectiveAgreement: "general",
    },
  });

  const employeeId = watch("employeeId");

  // Update form when employee is selected
  useEffect(() => {
    if (employeeId) {
      const employee = employees.find(emp => emp.id === employeeId);
      if (employee) {
        setSelectedEmployee(employee);
        setValue("basicSalary", employee.basicSalary);
      }
    }
  }, [employeeId, employees, setValue]);

  const savePayrollMutation = useMutation({
    mutationFn: async (payrollRecord: any) => {
      return await apiRequest("POST", "/api/payroll", payrollRecord);
    },
    onSuccess: () => {
      toast({
        title: "Επιτυχία",
        description: "Η μισθοδοσία αποθηκεύτηκε επιτυχώς",
      });
    },
    onError: (error: any) => {
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
        title: "Σφάλμα",
        description: error.message || "Αποτυχία αποθήκευσης μισθοδοσίας",
        variant: "destructive",
      });
    },
  });

  const onCalculate = (data: PayrollFormData) => {
    if (!selectedEmployee) {
      toast({
        title: "Σφάλμα",
        description: "Παρακαλώ επιλέξτε εργαζόμενο",
        variant: "destructive",
      });
      return;
    }

    const payrollInput: PayrollInput = {
      employeeId: data.employeeId,
      basicSalary: parseFloat(data.basicSalary) || 0,
      bonuses: parseFloat(data.bonuses) || 0,
      overtimeHours: parseFloat(data.overtimeHours) || 0,
      nightHours: parseFloat(data.nightHours) || 0,
      holidayHours: parseFloat(data.holidayHours) || 0,
      collectiveAgreement: data.collectiveAgreement,
    };

    const result = calculatePayroll(payrollInput);
    setPayrollResult(result);
  };

  const onSavePayroll = () => {
    if (!payrollResult || !selectedEmployee) {
      return;
    }

    const payrollRecord = {
      employeeId: selectedEmployee.id,
      payrollMonth: watch("payrollMonth"),
      basicSalary: payrollResult.basicSalary.toString(),
      overtime: payrollResult.overtime.toString(),
      nightShift: payrollResult.nightShift.toString(),
      holidayPay: payrollResult.holidayPay.toString(),
      allowances: "0",
      bonuses: payrollResult.bonuses.toString(),
      grossTotal: payrollResult.grossTotal.toString(),
      incomeTax: payrollResult.incomeTax.toString(),
      employeeInsurance: payrollResult.employeeInsurance.toString(),
      solidarityTax: payrollResult.solidarityTax.toString(),
      totalDeductions: payrollResult.totalDeductions.toString(),
      netPay: payrollResult.netPay.toString(),
      employerInsurance: payrollResult.employerInsurance.toString(),
      totalCost: payrollResult.totalCost.toString(),
      overtimeHours: payrollResult.overtimeHours.toString(),
      nightHours: payrollResult.nightHours.toString(),
      holidayHours: payrollResult.holidayHours.toString(),
    };

    savePayrollMutation.mutate(payrollRecord);
  };

  const onPrintPayslip = () => {
    if (!payrollResult || !selectedEmployee) {
      return;
    }
    
    // TODO: Implement PDF generation using jsPDF
    toast({
      title: "Πληροφορία",
      description: "Η λειτουργία εκτύπωσης μισθοδοτικού θα υλοποιηθεί σύντομα",
    });
  };

  const collectiveAgreements = [
    { value: "general", label: "Γενική ΣΣΕ" },
    { value: "private", label: "Ιδιωτικοί Υπάλληλοι" },
    { value: "banks", label: "Τράπεζες" },
    { value: "technical", label: "Τεχνικές Εταιρείες" },
    { value: "commerce", label: "Εμπόριο" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Input Section */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calculator className="mr-2 h-5 w-5" />
              Στοιχεία Υπολογισμού
            </CardTitle>
            <CardDescription>
              Συμπλήρωση στοιχείων για υπολογισμό μισθοδοσίας
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onCalculate)} className="space-y-4">
              <div>
                <Label htmlFor="employeeId">Εργαζόμενος *</Label>
                <Select onValueChange={(value) => setValue("employeeId", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Επιλέξτε εργαζόμενο" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.firstName} {employee.lastName} - {employee.department}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="payrollMonth">Μήνας Μισθοδοσίας</Label>
                <Input
                  id="payrollMonth"
                  type="month"
                  {...register("payrollMonth")}
                />
              </div>

              <div>
                <Label htmlFor="basicSalary">Μικτός Μισθός (€) *</Label>
                <Input
                  id="basicSalary"
                  type="number"
                  step="0.01"
                  {...register("basicSalary", { required: "Ο μισθός είναι υποχρεωτικός" })}
                  placeholder="2500.00"
                />
                {errors.basicSalary && (
                  <p className="text-red-500 text-sm mt-1">{errors.basicSalary.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="bonuses">Επίδομα/Δώρο (€)</Label>
                <Input
                  id="bonuses"
                  type="number"
                  step="0.01"
                  {...register("bonuses")}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="overtimeHours">Υπερωρίες (ώρες)</Label>
                <Input
                  id="overtimeHours"
                  type="number"
                  step="0.5"
                  {...register("overtimeHours")}
                  placeholder="0"
                  min="0"
                  max="120"
                />
              </div>

              <div>
                <Label htmlFor="nightHours">Νυχτερινές Ώρες</Label>
                <Input
                  id="nightHours"
                  type="number"
                  step="0.5"
                  {...register("nightHours")}
                  placeholder="0"
                  min="0"
                />
              </div>

              <div>
                <Label htmlFor="holidayHours">Ώρες Αργιών</Label>
                <Input
                  id="holidayHours"
                  type="number"
                  step="0.5"
                  {...register("holidayHours")}
                  placeholder="0"
                  min="0"
                />
              </div>

              <div>
                <Label htmlFor="collectiveAgreement">Κλάδος/ΣΣΕ</Label>
                <Select onValueChange={(value) => setValue("collectiveAgreement", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Επιλέξτε συλλογική σύμβαση" />
                  </SelectTrigger>
                  <SelectContent>
                    {collectiveAgreements.map((agreement) => (
                      <SelectItem key={agreement.value} value={agreement.value}>
                        {agreement.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                <Calculator className="mr-2 h-4 w-4" />
                Υπολογισμός Μισθοδοσίας
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Results Section */}
      <div className="space-y-6">
        {payrollResult ? (
          <>
            {/* Gross Earnings */}
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-green-800">Μικτές Αποδοχές</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-green-700">Βασικός Μισθός:</span>
                  <span className="font-semibold text-green-900">€{payrollResult.basicSalary.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Υπερωρίες:</span>
                  <span className="font-semibold text-green-900">€{payrollResult.overtime.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Νυχτερινές:</span>
                  <span className="font-semibold text-green-900">€{payrollResult.nightShift.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Αργίες:</span>
                  <span className="font-semibold text-green-900">€{payrollResult.holidayPay.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Επιδόματα:</span>
                  <span className="font-semibold text-green-900">€{payrollResult.bonuses.toFixed(2)}</span>
                </div>
                <div className="border-t border-green-300 pt-3">
                  <div className="flex justify-between">
                    <span className="text-green-700 font-semibold">Σύνολο Μικτών:</span>
                    <span className="font-bold text-green-900 text-lg">€{payrollResult.grossTotal.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Deductions */}
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-800">Κρατήσεις</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-red-700">Φόρος Εισοδήματος:</span>
                  <span className="font-semibold text-red-900">€{payrollResult.incomeTax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-700">ΕΦΚΑ Εργαζομένου (16%):</span>
                  <span className="font-semibold text-red-900">€{payrollResult.employeeInsurance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-700">Φόρος Αλληλεγγύης:</span>
                  <span className="font-semibold text-red-900">€{payrollResult.solidarityTax.toFixed(2)}</span>
                </div>
                <div className="border-t border-red-300 pt-3">
                  <div className="flex justify-between">
                    <span className="text-red-700 font-semibold">Σύνολο Κρατήσεων:</span>
                    <span className="font-bold text-red-900 text-lg">€{payrollResult.totalDeductions.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Net Pay */}
            <Card className="border-primary-200 bg-primary-50">
              <CardHeader>
                <CardTitle className="text-primary-800">Καθαρές Αποδοχές</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary-900">€{payrollResult.netPay.toFixed(2)}</div>
                  <p className="text-primary-700 mt-2">Καθαρός μισθός προς πληρωμή</p>
                </div>
              </CardContent>
            </Card>

            {/* Employer Costs */}
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="text-amber-800">Κόστος Εργοδότη</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-amber-700">ΕΦΚΑ Εργοδότη (24.5%):</span>
                  <span className="font-semibold text-amber-900">€{payrollResult.employerInsurance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-700">Μικτές Αποδοχές:</span>
                  <span className="font-semibold text-amber-900">€{payrollResult.grossTotal.toFixed(2)}</span>
                </div>
                <div className="border-t border-amber-300 pt-3">
                  <div className="flex justify-between">
                    <span className="text-amber-700 font-semibold">Συνολικό Κόστος:</span>
                    <span className="font-bold text-amber-900 text-lg">€{payrollResult.totalCost.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <Button variant="outline" onClick={onPrintPayslip} className="flex-1">
                <Printer className="mr-2 h-4 w-4" />
                Εκτύπωση
              </Button>
              <Button onClick={onSavePayroll} className="flex-1" disabled={savePayrollMutation.isPending}>
                <Save className="mr-2 h-4 w-4" />
                Αποθήκευση
              </Button>
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Calculator className="mx-auto h-12 w-12 text-neutral-400 mb-4" />
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">Υπολογισμός Μισθοδοσίας</h3>
              <p className="text-neutral-600">
                Συμπληρώστε τα στοιχεία στα αριστερά και πατήστε "Υπολογισμός" για να δείτε τα αποτελέσματα.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
