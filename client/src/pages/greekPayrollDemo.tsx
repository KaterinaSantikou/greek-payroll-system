import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  AlertCircle,
  Calculator,
  Clock,
  Euro,
  FileText,
  Users,
} from 'lucide-react';

interface GreekPayrollScenario {
  id: string;
  name: string;
  description: string;
  employeeProfile: {
    name: string;
    role: string;
    baseHourlyRate: number;
    tenure: string;
    workPattern: string;
  };
  payrollLines: Array<{
    code: string;
    name: string;
    hours?: number;
    amount: number;
    calculation: string;
    taxable: boolean;
    efkaContributory: boolean;
    apdIncluded: boolean;
  }>;
  totals: {
    grossPay: number;
    taxableAmount: number;
    efkaBase: number;
    apdAmount: number;
    incomeTax: number;
    efkaEmployee: number;
    netPay: number;
  };
}

const GREEK_PAYROLL_SCENARIOS: GreekPayrollScenario[] = [
  {
    id: 'hotel-server',
    name: 'Hotel Server - Complex Week',
    description:
      'Server with night shifts, Sunday work, overtime, Easter bonus, and tips',
    employeeProfile: {
      name: 'Maria Konstantinou',
      role: 'Hotel Server',
      baseHourlyRate: 15.5,
      tenure: '2 years',
      workPattern: 'Split shifts, weekends',
    },
    payrollLines: [
      {
        code: 'REG',
        name: 'Regular Hours',
        hours: 40,
        amount: 620.0,
        calculation: '40 × €15.50',
        taxable: true,
        efkaContributory: true,
        apdIncluded: true,
      },
      {
        code: 'NIGHT_25',
        name: 'Night Premium (25%)',
        hours: 12,
        amount: 46.5,
        calculation: '12 × €15.50 × 25%',
        taxable: true,
        efkaContributory: true,
        apdIncluded: true,
      },
      {
        code: 'SUNDAY_75',
        name: 'Sunday Premium (75%)',
        hours: 8,
        amount: 93.0,
        calculation: '8 × €15.50 × 75%',
        taxable: true,
        efkaContributory: true,
        apdIncluded: true,
      },
      {
        code: 'OT_TIER1_40',
        name: 'Overtime Tier 1 (40%)',
        hours: 5,
        amount: 31.0,
        calculation: '5 × €15.50 × 40%',
        taxable: true,
        efkaContributory: true,
        apdIncluded: true,
      },
      {
        code: 'BONUS_EASTER',
        name: 'Easter Bonus (Δώρο Πάσχα)',
        amount: 650.0,
        calculation: 'Tenure-based calculation',
        taxable: true,
        efkaContributory: true,
        apdIncluded: true,
      },
      {
        code: 'TIPS_DISTRIBUTED',
        name: 'Tips Distributed',
        amount: 85.0,
        calculation: 'Pooled tips allocation',
        taxable: true,
        efkaContributory: true,
        apdIncluded: true,
      },
      {
        code: 'MEAL_VOUCHER',
        name: 'Meal Vouchers',
        amount: 120.0,
        calculation: '20 days × €6.00 (tax-free)',
        taxable: false,
        efkaContributory: false,
        apdIncluded: true,
      },
    ],
    totals: {
      grossPay: 1645.5,
      taxableAmount: 1525.5,
      efkaBase: 1525.5,
      apdAmount: 1645.5,
      incomeTax: 183.06,
      efkaEmployee: 244.08,
      netPay: 1098.36,
    },
  },
  {
    id: 'kitchen-staff',
    name: 'Kitchen Staff - Holiday Period',
    description:
      'Cook with public holiday work, hazard pay, and sick leave coverage',
    employeeProfile: {
      name: 'Dimitris Papadakis',
      role: 'Kitchen Cook',
      baseHourlyRate: 17.0,
      tenure: '5 years',
      workPattern: 'Early shifts, holidays',
    },
    payrollLines: [
      {
        code: 'REG',
        name: 'Regular Hours',
        hours: 35,
        amount: 595.0,
        calculation: '35 × €17.00',
        taxable: true,
        efkaContributory: true,
        apdIncluded: true,
      },
      {
        code: 'HOLIDAY_75',
        name: 'Holiday Premium (75%)',
        hours: 8,
        amount: 102.0,
        calculation: '8 × €17.00 × 75%',
        taxable: true,
        efkaContributory: true,
        apdIncluded: true,
      },
      {
        code: 'SICK_EMP_50',
        name: 'Employer Sick Pay (50%)',
        hours: 16,
        amount: 136.0,
        calculation: '16 × €17.00 × 50%',
        taxable: true,
        efkaContributory: true,
        apdIncluded: true,
      },
      {
        code: 'BONUS_CHRISTMAS',
        name: 'Christmas Bonus',
        amount: 720.0,
        calculation: 'Tenure-based (prorated)',
        taxable: true,
        efkaContributory: true,
        apdIncluded: true,
      },
      {
        code: 'TRAVEL_PER_DIEM',
        name: 'Travel Per Diem',
        amount: 45.0,
        calculation: 'Within statutory limits',
        taxable: false,
        efkaContributory: false,
        apdIncluded: false,
      },
      {
        code: 'MEAL_VOUCHER',
        name: 'Meal Vouchers',
        amount: 132.0,
        calculation: '22 days × €6.00',
        taxable: false,
        efkaContributory: false,
        apdIncluded: true,
      },
    ],
    totals: {
      grossPay: 1730.0,
      taxableAmount: 1553.0,
      efkaBase: 1553.0,
      apdAmount: 1685.0,
      incomeTax: 186.36,
      efkaEmployee: 248.48,
      netPay: 1118.16,
    },
  },
  {
    id: 'maintenance-tech',
    name: 'Maintenance - Exceptional Overtime',
    description:
      'Technician with exceptional overtime and sixth-day work during peak season',
    employeeProfile: {
      name: 'Nikos Georgiadis',
      role: 'Maintenance Technician',
      baseHourlyRate: 19.5,
      tenure: '3 years',
      workPattern: 'On-call, emergency repairs',
    },
    payrollLines: [
      {
        code: 'REG',
        name: 'Regular Hours',
        hours: 40,
        amount: 780.0,
        calculation: '40 × €19.50',
        taxable: true,
        efkaContributory: true,
        apdIncluded: true,
      },
      {
        code: 'OT_TIER2_60',
        name: 'Overtime Above Cap (60%)',
        hours: 8,
        amount: 93.6,
        calculation: '8 × €19.50 × 60%',
        taxable: true,
        efkaContributory: true,
        apdIncluded: true,
      },
      {
        code: 'OT_EXCEPTIONAL_80',
        name: 'Exceptional Overtime (80%)',
        hours: 4,
        amount: 62.4,
        calculation: '4 × €19.50 × 80% ⚠️',
        taxable: true,
        efkaContributory: true,
        apdIncluded: true,
      },
      {
        code: 'SIXTH_DAY_40',
        name: 'Sixth Day Premium (40%)',
        hours: 6,
        amount: 46.8,
        calculation: '6 × €19.50 × 40%',
        taxable: true,
        efkaContributory: true,
        apdIncluded: true,
      },
      {
        code: 'ALLOWANCE_LEAVE',
        name: 'Leave Allowance',
        amount: 480.0,
        calculation: 'Based on tenure and earnings',
        taxable: true,
        efkaContributory: true,
        apdIncluded: true,
      },
      {
        code: 'MEAL_VOUCHER',
        name: 'Meal Vouchers',
        amount: 126.0,
        calculation: '21 days × €6.00',
        taxable: false,
        efkaContributory: false,
        apdIncluded: true,
      },
    ],
    totals: {
      grossPay: 1588.8,
      taxableAmount: 1462.8,
      efkaBase: 1462.8,
      apdAmount: 1588.8,
      incomeTax: 175.54,
      efkaEmployee: 234.05,
      netPay: 1053.21,
    },
  },
];

export default function GreekPayrollDemoPage() {
  const [selectedScenario, setSelectedScenario] = useState('hotel-server');

  const scenario = GREEK_PAYROLL_SCENARIOS.find(s => s.id === selectedScenario);

  const calculateTaxBreakdown = (taxableAmount: number) => {
    // Greek income tax brackets 2025
    let tax = 0;
    if (taxableAmount > 10000) {
      tax += (Math.min(taxableAmount, 20000) - 10000) * 0.09;
    }
    if (taxableAmount > 20000) {
      tax += (Math.min(taxableAmount, 30000) - 20000) * 0.22;
    }
    if (taxableAmount > 30000) {
      tax += (taxableAmount - 30000) * 0.28;
    }
    return tax;
  };

  const calculateEFKAContribution = (contributoryAmount: number) => {
    return contributoryAmount * 0.16; // Employee EFKA contribution 16%
  };

  if (!scenario) return null;

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Greek Payroll Demo
        </h1>
        <p className="text-muted-foreground">
          Real-world Greek payroll scenarios with complete tax calculations and
          compliance
        </p>
      </div>

      <Tabs defaultValue="scenarios" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="scenarios">Payroll Scenarios</TabsTrigger>
          <TabsTrigger value="calculator">Greek Tax Calculator</TabsTrigger>
        </TabsList>

        <TabsContent value="scenarios" className="space-y-6">
          {/* Scenario Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Select Greek Payroll Scenario
              </CardTitle>
              <CardDescription>
                Choose from realistic hotel industry payroll scenarios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedScenario}
                onValueChange={setSelectedScenario}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a payroll scenario" />
                </SelectTrigger>
                <SelectContent>
                  {GREEK_PAYROLL_SCENARIOS.map(scenario => (
                    <SelectItem key={scenario.id} value={scenario.id}>
                      {scenario.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Employee Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Employee Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Name</Label>
                  <p className="text-lg font-semibold">
                    {scenario.employeeProfile.name}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Role</Label>
                  <Badge variant="outline">
                    {scenario.employeeProfile.role}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Base Hourly Rate
                  </Label>
                  <p className="text-lg font-mono">
                    €{scenario.employeeProfile.baseHourlyRate.toFixed(2)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Tenure</Label>
                  <p>{scenario.employeeProfile.tenure}</p>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label className="text-sm font-medium">Work Pattern</Label>
                  <p className="text-sm text-muted-foreground">
                    {scenario.employeeProfile.workPattern}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payroll Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Greek Payroll Breakdown
              </CardTitle>
              <CardDescription>{scenario.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {scenario.payrollLines.map((line, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs">
                          {line.code}
                        </Badge>
                        <span className="font-medium">{line.name}</span>
                        {line.code === 'OT_EXCEPTIONAL_80' && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Compliance Alert
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {line.calculation}
                      </p>
                      <div className="flex gap-2">
                        {line.taxable ? (
                          <Badge variant="destructive" className="text-xs">
                            Taxable
                          </Badge>
                        ) : (
                          <Badge
                            variant="default"
                            className="text-xs bg-green-100 text-green-800"
                          >
                            Tax-Free
                          </Badge>
                        )}
                        {line.efkaContributory && (
                          <Badge variant="secondary" className="text-xs">
                            EFKA
                          </Badge>
                        )}
                        {line.apdIncluded && (
                          <Badge variant="outline" className="text-xs">
                            APD
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {line.hours && (
                        <p className="text-sm text-muted-foreground">
                          {line.hours}h
                        </p>
                      )}
                      <p className="text-lg font-semibold">
                        €{line.amount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Summary Totals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Euro className="h-5 w-5" />
                Payroll Summary & Greek Tax Calculation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm">Gross Pay</span>
                    <span className="font-mono font-semibold">
                      €{scenario.totals.grossPay.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Taxable Amount</span>
                    <span className="font-mono">
                      €{scenario.totals.taxableAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">EFKA Contributory Base</span>
                    <span className="font-mono">
                      €{scenario.totals.efkaBase.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">APD Reported Amount</span>
                    <span className="font-mono">
                      €{scenario.totals.apdAmount.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <Separator />
                  <div className="flex justify-between text-red-600">
                    <span className="text-sm">Income Tax (12%)</span>
                    <span className="font-mono">
                      -€{scenario.totals.incomeTax.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span className="text-sm">EFKA Employee (16%)</span>
                    <span className="font-mono">
                      -€{scenario.totals.efkaEmployee.toFixed(2)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Net Pay</span>
                    <span className="font-mono text-green-600">
                      €{scenario.totals.netPay.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calculator" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Greek Tax & EFKA Calculator
              </CardTitle>
              <CardDescription>
                Calculate Greek income tax and EFKA contributions for 2025
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Annual Taxable Income</Label>
                    <Input type="number" placeholder="25000" />
                  </div>
                  <div className="space-y-2">
                    <Label>EFKA Contributory Base</Label>
                    <Input type="number" placeholder="25000" />
                  </div>
                  <div className="space-y-2">
                    <Label>Employee Category</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">
                          General Employee
                        </SelectItem>
                        <SelectItem value="heavy">
                          Heavy/Hazardous Work
                        </SelectItem>
                        <SelectItem value="maritime">Maritime</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button className="w-full">
                  <Calculator className="mr-2 h-4 w-4" />
                  Calculate Greek Taxes & Contributions
                </Button>

                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">
                    Greek Tax Brackets 2025:
                  </p>
                  <ul className="text-sm space-y-1">
                    <li>Up to €10,000: 0% tax</li>
                    <li>€10,001 - €20,000: 9% tax</li>
                    <li>€20,001 - €30,000: 22% tax</li>
                    <li>Above €30,000: 28% tax</li>
                    <li>EFKA Employee: 16% on contributory income</li>
                    <li>EFKA Employer: ~24-28% on contributory income</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
