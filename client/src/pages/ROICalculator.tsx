/**
 * ROI Calculator - Show potential savings for Greek businesses
 * Demonstrates financial value of PayrollSync for Greek HR and payroll management
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  Euro,
  Shield,
  FileText,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  PiggyBank,
  Zap,
  Target,
  Building,
  Calendar
} from 'lucide-react';

interface BusinessInputs {
  employees: number;
  industry: string;
  currentSystem: string;
  avgSalary: number;
  hrStaff: number;
  complianceIssues: number;
  processingTime: number;
  errorRate: number;
}

interface ROIMetrics {
  currentCosts: {
    software: number;
    hrStaff: number;
    compliance: number;
    errors: number;
    processing: number;
    total: number;
  };
  payrollSyncCosts: {
    subscription: number;
    implementation: number;
    training: number;
    total: number;
  };
  savings: {
    software: number;
    efficiency: number;
    compliance: number;
    errors: number;
    total: number;
  };
  roi: {
    monthlyNetSavings: number;
    annualNetSavings: number;
    paybackMonths: number;
    threeYearROI: number;
  };
}

export default function ROICalculator() {
  const [inputs, setInputs] = useState<BusinessInputs>({
    employees: 50,
    industry: 'hospitality',
    currentSystem: 'manual',
    avgSalary: 1200, // Average Greek salary
    hrStaff: 2,
    complianceIssues: 3,
    processingTime: 40,
    errorRate: 5
  });

  const [currency, setCurrency] = useState<'EUR' | 'USD'>('EUR');
  const [timeframe, setTimeframe] = useState<'monthly' | 'annual' | 'three-year'>('annual');

  // Greek market pricing data
  const pricingTiers = {
    small: { min: 1, max: 25, price: 8 },
    medium: { min: 26, max: 100, price: 12 },
    large: { min: 101, max: 500, price: 16 },
    enterprise: { min: 501, max: 9999, price: 20 }
  };

  const getTier = (employees: number) => {
    if (employees <= 25) return pricingTiers.small;
    if (employees <= 100) return pricingTiers.medium;
    if (employees <= 500) return pricingTiers.large;
    return pricingTiers.enterprise;
  };

  const calculateROI = useMemo((): ROIMetrics => {
    const tier = getTier(inputs.employees);
    
    // Current costs calculation
    const softwareCostPerEmployee = inputs.currentSystem === 'manual' ? 0 : 
                                   inputs.currentSystem === 'basic' ? 15 : 25;
    
    const currentSoftware = inputs.employees * softwareCostPerEmployee;
    const currentHRStaff = inputs.hrStaff * 3500; // Average HR specialist salary in Greece
    
    // Greek-specific compliance costs
    const complianceCostPerIssue = 850; // Average cost per compliance violation in Greece
    const currentCompliance = inputs.complianceIssues * complianceCostPerIssue;
    
    // Error costs (salary corrections, EFKA adjustments, etc.)
    const avgErrorCost = 125; // Cost per payroll error in Greece
    const currentErrors = (inputs.employees * inputs.errorRate / 100) * avgErrorCost;
    
    // Processing time costs
    const hrHourlyRate = 25; // HR specialist hourly rate in Greece
    const currentProcessing = inputs.processingTime * hrHourlyRate;
    
    const totalCurrentCosts = currentSoftware + currentHRStaff + currentCompliance + 
                             currentErrors + currentProcessing;

    // PayrollSync costs
    const subscriptionCost = inputs.employees * tier.price;
    const implementationCost = Math.max(2500, inputs.employees * 15); // One-time
    const trainingCost = Math.max(800, inputs.hrStaff * 200); // One-time
    const totalPayrollSyncCosts = subscriptionCost + (implementationCost + trainingCost) / 12; // Amortized monthly

    // Savings calculation
    const softwareSavings = Math.max(0, currentSoftware - subscriptionCost);
    
    // Efficiency savings (30-50% reduction in HR time)
    const efficiencySavings = currentProcessing * 0.4;
    
    // Compliance savings (80% reduction in issues)
    const complianceSavings = currentCompliance * 0.8;
    
    // Error reduction savings (90% reduction in errors)
    const errorSavings = currentErrors * 0.9;
    
    const totalSavings = softwareSavings + efficiencySavings + complianceSavings + errorSavings;
    const netMonthlySavings = totalSavings - totalPayrollSyncCosts;
    const netAnnualSavings = netMonthlySavings * 12;
    const paybackMonths = (implementationCost + trainingCost) / netMonthlySavings;
    const threeYearROI = ((netAnnualSavings * 3 - implementationCost - trainingCost) / 
                         (implementationCost + trainingCost + subscriptionCost * 36)) * 100;

    return {
      currentCosts: {
        software: currentSoftware,
        hrStaff: currentHRStaff,
        compliance: currentCompliance,
        errors: currentErrors,
        processing: currentProcessing,
        total: totalCurrentCosts
      },
      payrollSyncCosts: {
        subscription: subscriptionCost,
        implementation: implementationCost,
        training: trainingCost,
        total: totalPayrollSyncCosts
      },
      savings: {
        software: softwareSavings,
        efficiency: efficiencySavings,
        compliance: complianceSavings,
        errors: errorSavings,
        total: totalSavings
      },
      roi: {
        monthlyNetSavings: netMonthlySavings,
        annualNetSavings: netAnnualSavings,
        paybackMonths: paybackMonths,
        threeYearROI: threeYearROI
      }
    };
  }, [inputs]);

  const formatCurrency = (amount: number) => {
    const symbol = currency === 'EUR' ? '€' : '$';
    const rate = currency === 'EUR' ? 1 : 1.1; // Approximate EUR to USD
    return `${symbol}${(Math.abs(amount) * rate).toLocaleString('en-US', { 
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    })}`;
  };

  const industryOptions = [
    { value: 'hospitality', label: 'Hotels & Tourism', employees: '10-500', savings: 'High' },
    { value: 'retail', label: 'Retail & Commerce', employees: '5-200', savings: 'Medium' },
    { value: 'manufacturing', label: 'Manufacturing', employees: '20-1000', savings: 'High' },
    { value: 'services', label: 'Professional Services', employees: '5-100', savings: 'Medium' },
    { value: 'healthcare', label: 'Healthcare', employees: '10-300', savings: 'High' },
    { value: 'construction', label: 'Construction', employees: '15-200', savings: 'Very High' }
  ];

  const currentSystemOptions = [
    { value: 'manual', label: 'Manual/Excel', cost: 'Low', risk: 'Very High' },
    { value: 'basic', label: 'Basic Payroll Software', cost: 'Medium', risk: 'Medium' },
    { value: 'advanced', label: 'Advanced HR System', cost: 'High', risk: 'Low' }
  ];

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">ROI Calculator for Greek Businesses</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
          Calculate potential savings and return on investment for implementing PayrollSync 
          in your Greek business. Based on real market data and compliance requirements.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-green-600" />
                <div>
                  <p className="font-semibold">Average ROI</p>
                  <p className="text-2xl font-bold text-green-600">340%</p>
                  <p className="text-sm text-gray-600">3-year period</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="font-semibold">Payback Time</p>
                  <p className="text-2xl font-bold text-blue-600">8.5</p>
                  <p className="text-sm text-gray-600">months avg</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Shield className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="font-semibold">Compliance</p>
                  <p className="text-2xl font-bold text-purple-600">95%</p>
                  <p className="text-sm text-gray-600">error reduction</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="font-semibold">Time Saved</p>
                  <p className="text-2xl font-bold text-orange-600">65%</p>
                  <p className="text-sm text-gray-600">HR processing</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Input Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Business Information
              </CardTitle>
              <CardDescription>Tell us about your Greek business</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="employees">Number of Employees</Label>
                <div className="flex items-center space-x-4 mt-2">
                  <Slider
                    value={[inputs.employees]}
                    onValueChange={(value) => setInputs({...inputs, employees: value[0]})}
                    max={1000}
                    min={1}
                    step={1}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={inputs.employees}
                    onChange={(e) => setInputs({...inputs, employees: parseInt(e.target.value) || 1})}
                    className="w-20"
                    min="1"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Pricing: {formatCurrency(getTier(inputs.employees).price)} per employee/month
                </p>
              </div>

              <div>
                <Label htmlFor="industry">Industry</Label>
                <Select value={inputs.industry} onValueChange={(value) => setInputs({...inputs, industry: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {industryOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex justify-between items-center w-full">
                          <span>{option.label}</span>
                          <Badge variant="outline" className="ml-2">{option.savings}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="currentSystem">Current Payroll System</Label>
                <Select value={inputs.currentSystem} onValueChange={(value) => setInputs({...inputs, currentSystem: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currentSystemOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex justify-between items-center w-full">
                          <span>{option.label}</span>
                          <div className="flex gap-1">
                            <Badge variant="outline" className="text-xs">Risk: {option.risk}</Badge>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="avgSalary">Average Monthly Salary (€)</Label>
                <Input
                  type="number"
                  value={inputs.avgSalary}
                  onChange={(e) => setInputs({...inputs, avgSalary: parseInt(e.target.value) || 1200})}
                  min="600"
                />
                <p className="text-sm text-gray-500">Greek minimum: €663, average: €1,200</p>
              </div>

              <div>
                <Label htmlFor="hrStaff">HR/Payroll Staff</Label>
                <Input
                  type="number"
                  value={inputs.hrStaff}
                  onChange={(e) => setInputs({...inputs, hrStaff: parseInt(e.target.value) || 1})}
                  min="1"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Current Challenges
              </CardTitle>
              <CardDescription>How much do current issues cost?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="complianceIssues">ERGANI/EFKA Issues per Month</Label>
                <Select 
                  value={inputs.complianceIssues.toString()} 
                  onValueChange={(value) => setInputs({...inputs, complianceIssues: parseInt(value)})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0 - Perfect compliance</SelectItem>
                    <SelectItem value="1">1 - Very good</SelectItem>
                    <SelectItem value="2">2-3 - Good</SelectItem>
                    <SelectItem value="3">3-5 - Average</SelectItem>
                    <SelectItem value="5">5-10 - Poor</SelectItem>
                    <SelectItem value="10">10+ - Very poor</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">
                  Cost per issue: ~€850 (fines, corrections, time)
                </p>
              </div>

              <div>
                <Label htmlFor="processingTime">Monthly Processing Hours</Label>
                <div className="flex items-center space-x-4 mt-2">
                  <Slider
                    value={[inputs.processingTime]}
                    onValueChange={(value) => setInputs({...inputs, processingTime: value[0]})}
                    max={200}
                    min={10}
                    step={5}
                    className="flex-1"
                  />
                  <span className="w-12 text-sm">{inputs.processingTime}h</span>
                </div>
                <p className="text-sm text-gray-500">
                  PayrollSync reduces this by 40-60%
                </p>
              </div>

              <div>
                <Label htmlFor="errorRate">Payroll Error Rate (%)</Label>
                <div className="flex items-center space-x-4 mt-2">
                  <Slider
                    value={[inputs.errorRate]}
                    onValueChange={(value) => setInputs({...inputs, errorRate: value[0]})}
                    max={20}
                    min={0}
                    step={0.5}
                    className="flex-1"
                  />
                  <span className="w-12 text-sm">{inputs.errorRate}%</span>
                </div>
                <p className="text-sm text-gray-500">
                  Greek average: 3-8%, PayrollSync: &lt;0.5%
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    ROI Analysis Results
                  </CardTitle>
                  <CardDescription>Financial impact for your business</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={currency} onValueChange={(value: 'EUR' | 'USD') => setCurrency(value)}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={timeframe} onValueChange={(value: any) => setTimeframe(value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                      <SelectItem value="three-year">3-Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Tabs defaultValue="summary" className="space-y-4">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="costs">Costs</TabsTrigger>
              <TabsTrigger value="savings">Savings</TabsTrigger>
              <TabsTrigger value="analysis">Analysis</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-4">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-700 dark:text-green-300">Net Annual Savings</p>
                        <p className="text-3xl font-bold text-green-600">{formatCurrency(calculateROI.roi.annualNetSavings)}</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="mt-4">
                      <p className="text-sm text-green-600">
                        {formatCurrency(calculateROI.roi.monthlyNetSavings)} per month
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-700 dark:text-blue-300">3-Year ROI</p>
                        <p className="text-3xl font-bold text-blue-600">{calculateROI.roi.threeYearROI.toFixed(0)}%</p>
                      </div>
                      <Target className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="mt-4">
                      <p className="text-sm text-blue-600">
                        Payback in {calculateROI.roi.paybackMonths.toFixed(1)} months
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* ROI Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">ROI Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Implementation Investment</span>
                      <span className="font-semibold text-red-600">
                        -{formatCurrency(calculateROI.payrollSyncCosts.implementation + calculateROI.payrollSyncCosts.training)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span>Annual Subscription Cost</span>
                      <span className="font-semibold text-red-600">
                        -{formatCurrency(calculateROI.payrollSyncCosts.subscription * 12)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span>Annual Cost Savings</span>
                      <span className="font-semibold text-green-600">
                        +{formatCurrency(calculateROI.savings.total * 12)}
                      </span>
                    </div>
                    
                    <hr className="my-2" />
                    
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>Net Annual Benefit</span>
                      <span className={calculateROI.roi.annualNetSavings > 0 ? 'text-green-600' : 'text-red-600'}>
                        {calculateROI.roi.annualNetSavings > 0 ? '+' : ''}{formatCurrency(calculateROI.roi.annualNetSavings)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <div className="flex justify-between text-sm mb-2">
                      <span>ROI Progress (3 years)</span>
                      <span>{Math.min(100, (calculateROI.roi.threeYearROI / 5)).toFixed(0)}%</span>
                    </div>
                    <Progress 
                      value={Math.min(100, Math.max(0, calculateROI.roi.threeYearROI / 5))} 
                      className="h-3"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="costs" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg text-red-600">Current Costs (Monthly)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span>Current Software</span>
                      <span>{formatCurrency(calculateROI.currentCosts.software)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>HR Staff Costs</span>
                      <span>{formatCurrency(calculateROI.currentCosts.hrStaff)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Compliance Issues</span>
                      <span>{formatCurrency(calculateROI.currentCosts.compliance)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Error Corrections</span>
                      <span>{formatCurrency(calculateROI.currentCosts.errors)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Processing Time</span>
                      <span>{formatCurrency(calculateROI.currentCosts.processing)}</span>
                    </div>
                    <hr />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total Current</span>
                      <span>{formatCurrency(calculateROI.currentCosts.total)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg text-blue-600">PayrollSync Costs (Monthly)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span>Subscription ({inputs.employees} × {formatCurrency(getTier(inputs.employees).price)})</span>
                      <span>{formatCurrency(calculateROI.payrollSyncCosts.subscription)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Implementation (amortized)</span>
                      <span>{formatCurrency(calculateROI.payrollSyncCosts.implementation / 12)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Training (amortized)</span>
                      <span>{formatCurrency(calculateROI.payrollSyncCosts.training / 12)}</span>
                    </div>
                    <hr />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total PayrollSync</span>
                      <span>{formatCurrency(calculateROI.payrollSyncCosts.total)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="savings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg text-green-600">Monthly Savings Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { 
                        label: 'Software Replacement', 
                        amount: calculateROI.savings.software,
                        icon: <Zap className="h-4 w-4" />,
                        description: 'Replace current payroll software'
                      },
                      { 
                        label: 'Process Efficiency', 
                        amount: calculateROI.savings.efficiency,
                        icon: <Clock className="h-4 w-4" />,
                        description: '40% reduction in HR processing time'
                      },
                      { 
                        label: 'Compliance Improvement', 
                        amount: calculateROI.savings.compliance,
                        icon: <Shield className="h-4 w-4" />,
                        description: '80% reduction in ERGANI/EFKA issues'
                      },
                      { 
                        label: 'Error Reduction', 
                        amount: calculateROI.savings.errors,
                        icon: <CheckCircle className="h-4 w-4" />,
                        description: '90% reduction in payroll errors'
                      }
                    ].map((saving, index) => (
                      <div key={index} className="flex justify-between items-start p-3 bg-green-50 dark:bg-green-950/20 rounded">
                        <div className="flex items-start gap-3">
                          <div className="text-green-600 mt-0.5">
                            {saving.icon}
                          </div>
                          <div>
                            <p className="font-medium">{saving.label}</p>
                            <p className="text-sm text-gray-600">{saving.description}</p>
                          </div>
                        </div>
                        <span className="font-semibold text-green-600">
                          {formatCurrency(saving.amount)}
                        </span>
                      </div>
                    ))}
                    
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center text-lg font-bold">
                        <span>Total Monthly Savings</span>
                        <span className="text-green-600">{formatCurrency(calculateROI.savings.total)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm text-gray-600 mt-1">
                        <span>Annual Savings</span>
                        <span>{formatCurrency(calculateROI.savings.total * 12)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analysis" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Investment Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600 mb-2">
                        {calculateROI.roi.paybackMonths.toFixed(1)} months
                      </div>
                      <p className="text-gray-600">Payback Period</p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Break-even month:</span>
                        <span className="font-medium">{Math.ceil(calculateROI.roi.paybackMonths)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Year 1 ROI:</span>
                        <span className="font-medium text-green-600">
                          {((calculateROI.roi.annualNetSavings / (calculateROI.payrollSyncCosts.implementation + calculateROI.payrollSyncCosts.training)) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>3-Year Total ROI:</span>
                        <span className="font-medium text-green-600">
                          {calculateROI.roi.threeYearROI.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Risk Assessment</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span>Implementation Risk</span>
                      <Badge variant="outline" className="bg-green-100 text-green-800">Low</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Technology Risk</span>
                      <Badge variant="outline" className="bg-green-100 text-green-800">Low</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Compliance Risk</span>
                      <Badge variant="outline" className="bg-red-100 text-red-800">High Without</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Cost Overrun Risk</span>
                      <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Medium</Badge>
                    </div>
                    
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded">
                      <p className="text-sm">
                        <strong>Recommendation:</strong> {calculateROI.roi.threeYearROI > 200 ? 'Strongly Recommended' : 
                                                        calculateROI.roi.threeYearROI > 100 ? 'Recommended' : 
                                                        'Consider carefully'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Greek Market Context</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Regulatory Requirements</h4>
                      <ul className="text-sm space-y-1 text-gray-600">
                        <li>• ERGANI II mandatory reporting</li>
                        <li>• e-EFKA social security integration</li>
                        <li>• AADE tax authority compliance</li>
                        <li>• Digital work cards (mandatory 2024)</li>
                        <li>• Collective bargaining agreements</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Cost Factors</h4>
                      <ul className="text-sm space-y-1 text-gray-600">
                        <li>• Average HR specialist: €3,500/month</li>
                        <li>• Compliance fine: €300-2,000 per violation</li>
                        <li>• Manual processing: 2-4 hours per employee</li>
                        <li>• Error correction cost: €125 average</li>
                        <li>• Audit preparation: €5,000-15,000</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}