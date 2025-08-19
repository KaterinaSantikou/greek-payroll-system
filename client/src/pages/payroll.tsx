import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import PayrollCalculator from "@/components/PayrollCalculator";
import { Calculator, FileText, TrendingUp, Users } from "lucide-react";
import type { Employee, PayrollRecord } from "@shared/schema";

export default function Payroll() {
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  // Fetch employees for payroll calculations
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  // Fetch payroll records for selected month
  const { data: payrollRecords = [] } = useQuery<PayrollRecord[]>({
    queryKey: ["/api/payroll", selectedMonth],
  });

  const totalMonthlyPayroll = payrollRecords.reduce(
    (sum: number, record: PayrollRecord) => sum + parseFloat(record.netPay || "0"),
    0
  );

  const totalEmployerCost = payrollRecords.reduce(
    (sum: number, record: PayrollRecord) => sum + parseFloat(record.totalCost || "0"),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">Μισθοδοσία</h2>
        <p className="text-neutral-600 mt-1">
          Υπολογισμός και διαχείριση μισθοδοσίας εργαζομένων
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Εργαζόμενοι</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
            <p className="text-xs text-muted-foreground">Συνολικοί εργαζόμενοι</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Καθαρές Αποδοχές</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{totalMonthlyPayroll.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Τρέχων μήνας</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Κόστος Εργοδότη</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{totalEmployerCost.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Συνολικό κόστος</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Μισθοδοτικές</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payrollRecords.length}</div>
            <p className="text-xs text-muted-foreground">Αυτό το μήνα</p>
          </CardContent>
        </Card>
      </div>

      {/* Payroll Calculator */}
      <Card>
        <CardHeader>
          <CardTitle>Υπολογιστής Μισθοδοσίας</CardTitle>
          <CardDescription>
            Αυτόματος υπολογισμός φόρων και ασφαλιστικών εισφορών βάσει ελληνικής νομοθεσίας
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PayrollCalculator employees={employees} />
        </CardContent>
      </Card>

      {/* Tax Information */}
      <Card>
        <CardHeader>
          <CardTitle>Φορολογικές Κλίμακες 2024</CardTitle>
          <CardDescription>
            Ισχύουσες φορολογικές κλίμακες για την Ελλάδα
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-primary-50 rounded-lg p-4 border border-primary-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary-600">9%</div>
                <p className="text-sm text-neutral-600">€0 - €10,000</p>
                <p className="text-xs text-neutral-500 mt-1">Πρώτη κλίμακα</p>
              </div>
            </div>
            <div className="bg-primary-50 rounded-lg p-4 border border-primary-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary-600">22%</div>
                <p className="text-sm text-neutral-600">€10,001 - €20,000</p>
                <p className="text-xs text-neutral-500 mt-1">Δεύτερη κλίμακα</p>
              </div>
            </div>
            <div className="bg-primary-50 rounded-lg p-4 border border-primary-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary-600">28%</div>
                <p className="text-sm text-neutral-600">€20,001 - €30,000</p>
                <p className="text-xs text-neutral-500 mt-1">Τρίτη κλίμακα</p>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-neutral-50 rounded-lg">
            <h4 className="font-semibold mb-2">Ασφαλιστικές Εισφορές ΕΦΚΑ</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Εργαζόμενος:</span>
                <span className="ml-2">16% (κύρια + επικουρική)</span>
              </div>
              <div>
                <span className="font-medium">Εργοδότης:</span>
                <span className="ml-2">24.5% (συνολικά)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
