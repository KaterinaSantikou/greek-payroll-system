/**
 * GL Export Service with Default Cost Center Mappings
 * 
 * Provides automatic mapping for hotel/F&B cost centers:
 * - Front Office (FO)
 * - Housekeeping (HK) 
 * - Food & Beverage (F&B)
 * - Spa
 * - Maintenance
 */

export interface GLCostCenter {
  costCenterCode: string;
  costCenterName: string;
  department: string;
  sector: 'tourism' | 'fnb' | 'shared';
  accountingCategory: 'revenue_generating' | 'support' | 'administrative';
  defaultAccounts: {
    wageExpense: string;
    allowanceExpense: string;
    premiumExpense: string;
    overtimeExpense: string;
    socialInsuranceExpense: string;
    payrollTaxLiability: string;
    netPayLiability: string;
  };
  budgetCenter?: string;
  profitCenter?: string;
}

// Tourism Hotels Cost Centers
const tourismCostCenters: GLCostCenter[] = [
  {
    costCenterCode: "FO-001",
    costCenterName: "Front Office Operations",
    department: "Front Office",
    sector: "tourism", 
    accountingCategory: "revenue_generating",
    defaultAccounts: {
      wageExpense: "6200-001", // Employee salaries - Front Office
      allowanceExpense: "6201-001", // Employee allowances - Front Office
      premiumExpense: "6202-001", // Premium pay - Front Office
      overtimeExpense: "6203-001", // Overtime - Front Office
      socialInsuranceExpense: "6250-001", // Social insurance - Front Office
      payrollTaxLiability: "2400-001", // Payroll tax payable
      netPayLiability: "2401-001" // Net pay payable
    },
    budgetCenter: "ROOMS-DIV",
    profitCenter: "HOTEL-OPS"
  },
  {
    costCenterCode: "HK-001", 
    costCenterName: "Housekeeping Operations",
    department: "Housekeeping",
    sector: "tourism",
    accountingCategory: "support",
    defaultAccounts: {
      wageExpense: "6200-002", // Employee salaries - Housekeeping
      allowanceExpense: "6201-002", // Employee allowances - Housekeeping  
      premiumExpense: "6202-002", // Premium pay - Housekeeping
      overtimeExpense: "6203-002", // Overtime - Housekeeping
      socialInsuranceExpense: "6250-002", // Social insurance - Housekeeping
      payrollTaxLiability: "2400-002", // Payroll tax payable
      netPayLiability: "2401-002" // Net pay payable
    },
    budgetCenter: "ROOMS-DIV", 
    profitCenter: "HOTEL-OPS"
  },
  {
    costCenterCode: "FB-001",
    costCenterName: "Food & Beverage Service", 
    department: "Food & Beverage",
    sector: "tourism",
    accountingCategory: "revenue_generating",
    defaultAccounts: {
      wageExpense: "6200-003", // Employee salaries - F&B
      allowanceExpense: "6201-003", // Employee allowances - F&B
      premiumExpense: "6202-003", // Premium pay - F&B  
      overtimeExpense: "6203-003", // Overtime - F&B
      socialInsuranceExpense: "6250-003", // Social insurance - F&B
      payrollTaxLiability: "2400-003", // Payroll tax payable
      netPayLiability: "2401-003" // Net pay payable
    },
    budgetCenter: "FB-DIV",
    profitCenter: "HOTEL-OPS"
  },
  {
    costCenterCode: "SPA-001",
    costCenterName: "Spa & Wellness Operations",
    department: "Spa",
    sector: "tourism", 
    accountingCategory: "revenue_generating",
    defaultAccounts: {
      wageExpense: "6200-004", // Employee salaries - Spa
      allowanceExpense: "6201-004", // Employee allowances - Spa
      premiumExpense: "6202-004", // Premium pay - Spa
      overtimeExpense: "6203-004", // Overtime - Spa  
      socialInsuranceExpense: "6250-004", // Social insurance - Spa
      payrollTaxLiability: "2400-004", // Payroll tax payable
      netPayLiability: "2401-004" // Net pay payable
    },
    budgetCenter: "SPA-DIV",
    profitCenter: "HOTEL-OPS"
  },
  {
    costCenterCode: "MAINT-001",
    costCenterName: "Maintenance & Engineering",
    department: "Maintenance",
    sector: "tourism",
    accountingCategory: "support", 
    defaultAccounts: {
      wageExpense: "6200-005", // Employee salaries - Maintenance
      allowanceExpense: "6201-005", // Employee allowances - Maintenance
      premiumExpense: "6202-005", // Premium pay - Maintenance
      overtimeExpense: "6203-005", // Overtime - Maintenance
      socialInsuranceExpense: "6250-005", // Social insurance - Maintenance  
      payrollTaxLiability: "2400-005", // Payroll tax payable
      netPayLiability: "2401-005" // Net pay payable
    },
    budgetCenter: "SUPPORT-DIV",
    profitCenter: "HOTEL-OPS"
  }
];

// F&B Restaurants Cost Centers  
const fnbCostCenters: GLCostCenter[] = [
  {
    costCenterCode: "DINING-001",
    costCenterName: "Main Dining Service",
    department: "Service",
    sector: "fnb",
    accountingCategory: "revenue_generating",
    defaultAccounts: {
      wageExpense: "6200-101", // Employee salaries - Dining
      allowanceExpense: "6201-101", // Employee allowances - Dining
      premiumExpense: "6202-101", // Premium pay - Dining  
      overtimeExpense: "6203-101", // Overtime - Dining
      socialInsuranceExpense: "6250-101", // Social insurance - Dining
      payrollTaxLiability: "2400-101", // Payroll tax payable
      netPayLiability: "2401-101" // Net pay payable  
    },
    budgetCenter: "SERVICE-DIV",
    profitCenter: "RESTAURANT-OPS"
  },
  {
    costCenterCode: "BAR-001", 
    costCenterName: "Bar Operations",
    department: "Bar",
    sector: "fnb",
    accountingCategory: "revenue_generating",
    defaultAccounts: {
      wageExpense: "6200-102", // Employee salaries - Bar
      allowanceExpense: "6201-102", // Employee allowances - Bar
      premiumExpense: "6202-102", // Premium pay - Bar
      overtimeExpense: "6203-102", // Overtime - Bar  
      socialInsuranceExpense: "6250-102", // Social insurance - Bar
      payrollTaxLiability: "2400-102", // Payroll tax payable
      netPayLiability: "2401-102" // Net pay payable
    },
    budgetCenter: "BEVERAGE-DIV", 
    profitCenter: "RESTAURANT-OPS"
  },
  {
    costCenterCode: "KITCHEN-001",
    costCenterName: "Kitchen Operations",
    department: "Kitchen",
    sector: "fnb",
    accountingCategory: "support",
    defaultAccounts: {
      wageExpense: "6200-103", // Employee salaries - Kitchen
      allowanceExpense: "6201-103", // Employee allowances - Kitchen
      premiumExpense: "6202-103", // Premium pay - Kitchen  
      overtimeExpense: "6203-103", // Overtime - Kitchen
      socialInsuranceExpense: "6250-103", // Social insurance - Kitchen
      payrollTaxLiability: "2400-103", // Payroll tax payable
      netPayLiability: "2401-103" // Net pay payable
    },
    budgetCenter: "KITCHEN-DIV",
    profitCenter: "RESTAURANT-OPS"
  }
];

export interface GLJournalEntry {
  entryDate: string;
  referenceNumber: string;
  description: string;
  lines: Array<{
    accountCode: string;
    accountName: string;
    costCenter: string;
    debitAmount: number;
    creditAmount: number;
    description: string;
    employeeId?: string;
    payPeriod?: string;
  }>;
  totalDebits: number;
  totalCredits: number;
  balanced: boolean;
}

export class GLCostCenterService {
  private static costCenters: Map<string, GLCostCenter[]> = new Map([
    ["tourism-hotels", tourismCostCenters],
    ["fnb-restaurants", fnbCostCenters]
  ]);

  /**
   * Get cost centers for a CBA pack/sector
   */
  static getCostCenters(packId: string): GLCostCenter[] {
    return this.costCenters.get(packId) || [];
  }

  /**
   * Get cost center by department
   */
  static getCostCenterByDepartment(packId: string, department: string): GLCostCenter | null {
    const centers = this.getCostCenters(packId);
    return centers.find(c => c.department === department) || null;
  }

  /**
   * Generate GL journal entries from payroll data
   */
  static generateGLEntries(
    packId: string,
    payPeriod: string,
    payrollData: Array<{
      employeeId: string;
      department: string;
      earnings: Array<{
        type: 'base_wage' | 'allowance' | 'premium' | 'overtime';
        code: string;
        amount: number;
      }>;
      deductions: Array<{
        type: 'tax' | 'social_insurance' | 'other';
        code: string; 
        amount: number;
      }>;
      netPay: number;
    }>
  ): GLJournalEntry[] {
    const entries: GLJournalEntry[] = [];
    let entryCounter = 1;

    // Group by cost center/department
    const departmentGroups = new Map<string, typeof payrollData>();
    
    for (const employee of payrollData) {
      if (!departmentGroups.has(employee.department)) {
        departmentGroups.set(employee.department, []);
      }
      departmentGroups.get(employee.department)!.push(employee);
    }

    // Generate journal entry per department
    for (const [department, employees] of Array.from(departmentGroups.entries())) {
      const costCenter = this.getCostCenterByDepartment(packId, department);
      if (!costCenter) {
        console.warn(`No cost center found for department: ${department}`);
        continue;
      }

      const journalLines = [];
      let totalDebits = 0;
      let totalCredits = 0;

      // Aggregate earnings by type
      const earningsAgg = new Map<string, number>();
      const deductionsAgg = new Map<string, number>();
      let totalNetPay = 0;

      for (const employee of employees) {
        // Aggregate earnings
        for (const earning of employee.earnings) {
          const key = earning.type;
          earningsAgg.set(key, (earningsAgg.get(key) || 0) + earning.amount);
        }
        
        // Aggregate deductions
        for (const deduction of employee.deductions) {
          const key = deduction.type;
          deductionsAgg.set(key, (deductionsAgg.get(key) || 0) + deduction.amount);
        }

        totalNetPay += employee.netPay;
      }

      // Create debit entries for expenses
      if (earningsAgg.has('base_wage')) {
        const amount = earningsAgg.get('base_wage')!;
        journalLines.push({
          accountCode: costCenter.defaultAccounts.wageExpense,
          accountName: "Employee Salaries",
          costCenter: costCenter.costCenterCode,
          debitAmount: amount,
          creditAmount: 0,
          description: `${department} - Base wages for ${payPeriod}`,
          payPeriod
        });
        totalDebits += amount;
      }

      if (earningsAgg.has('allowance')) {
        const amount = earningsAgg.get('allowance')!;
        journalLines.push({
          accountCode: costCenter.defaultAccounts.allowanceExpense,
          accountName: "Employee Allowances", 
          costCenter: costCenter.costCenterCode,
          debitAmount: amount,
          creditAmount: 0,
          description: `${department} - Allowances for ${payPeriod}`,
          payPeriod
        });
        totalDebits += amount;
      }

      if (earningsAgg.has('premium')) {
        const amount = earningsAgg.get('premium')!;
        journalLines.push({
          accountCode: costCenter.defaultAccounts.premiumExpense,
          accountName: "Premium Pay",
          costCenter: costCenter.costCenterCode, 
          debitAmount: amount,
          creditAmount: 0,
          description: `${department} - Premium pay for ${payPeriod}`,
          payPeriod
        });
        totalDebits += amount;
      }

      if (earningsAgg.has('overtime')) {
        const amount = earningsAgg.get('overtime')!;
        journalLines.push({
          accountCode: costCenter.defaultAccounts.overtimeExpense,
          accountName: "Overtime Pay",
          costCenter: costCenter.costCenterCode,
          debitAmount: amount,
          creditAmount: 0,
          description: `${department} - Overtime for ${payPeriod}`,
          payPeriod
        });
        totalDebits += amount;
      }

      // Social insurance employer contribution (estimated as 25% of gross)
      const grossPay = Array.from(earningsAgg.values()).reduce((sum, amt) => sum + amt, 0);
      const socialInsuranceExpense = grossPay * 0.25;
      journalLines.push({
        accountCode: costCenter.defaultAccounts.socialInsuranceExpense,
        accountName: "Social Insurance Contributions",
        costCenter: costCenter.costCenterCode,
        debitAmount: socialInsuranceExpense,
        creditAmount: 0,
        description: `${department} - Employer social insurance for ${payPeriod}`,
        payPeriod
      });
      totalDebits += socialInsuranceExpense;

      // Create credit entries for liabilities
      const totalTaxDeductions = deductionsAgg.get('tax') || 0;
      const totalSocialInsDeductions = deductionsAgg.get('social_insurance') || 0;

      if (totalTaxDeductions > 0) {
        journalLines.push({
          accountCode: costCenter.defaultAccounts.payrollTaxLiability,
          accountName: "Payroll Tax Payable",
          costCenter: costCenter.costCenterCode,
          debitAmount: 0,
          creditAmount: totalTaxDeductions,
          description: `${department} - Tax withholdings for ${payPeriod}`,
          payPeriod
        });
        totalCredits += totalTaxDeductions;
      }

      if (totalSocialInsDeductions > 0) {
        journalLines.push({
          accountCode: "2450-001", // Social insurance payable
          accountName: "Social Insurance Payable", 
          costCenter: costCenter.costCenterCode,
          debitAmount: 0,
          creditAmount: totalSocialInsDeductions + socialInsuranceExpense, // Employee + Employer
          description: `${department} - Social insurance payable for ${payPeriod}`,
          payPeriod
        });
        totalCredits += (totalSocialInsDeductions + socialInsuranceExpense);
      }

      // Net pay liability
      journalLines.push({
        accountCode: costCenter.defaultAccounts.netPayLiability,
        accountName: "Net Pay Payable",
        costCenter: costCenter.costCenterCode,
        debitAmount: 0,
        creditAmount: totalNetPay,
        description: `${department} - Net pay payable for ${payPeriod}`,
        payPeriod
      });
      totalCredits += totalNetPay;

      // Create journal entry
      entries.push({
        entryDate: new Date().toISOString().split('T')[0],
        referenceNumber: `PAY-${payPeriod}-${entryCounter.toString().padStart(3, '0')}`,
        description: `Payroll - ${department} - ${payPeriod}`,
        lines: journalLines,
        totalDebits,
        totalCredits,
        balanced: Math.abs(totalDebits - totalCredits) < 0.01 // Allow for rounding
      });

      entryCounter++;
    }

    return entries;
  }

  /**
   * Get chart of accounts for sector
   */
  static getChartOfAccounts(packId: string): Array<{
    accountCode: string;
    accountName: string;
    accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
    costCenters: string[];
  }> {
    const costCenters = this.getCostCenters(packId);
    const accounts = new Map<string, {
      name: string;
      type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
      centers: Set<string>;
    }>();

    // Extract all accounts from cost centers
    for (const center of costCenters) {
      const centerAccounts = [
        { code: center.defaultAccounts.wageExpense, name: "Employee Salaries", type: "expense" as const },
        { code: center.defaultAccounts.allowanceExpense, name: "Employee Allowances", type: "expense" as const },
        { code: center.defaultAccounts.premiumExpense, name: "Premium Pay", type: "expense" as const },
        { code: center.defaultAccounts.overtimeExpense, name: "Overtime Pay", type: "expense" as const },
        { code: center.defaultAccounts.socialInsuranceExpense, name: "Social Insurance", type: "expense" as const },
        { code: center.defaultAccounts.payrollTaxLiability, name: "Payroll Tax Payable", type: "liability" as const },
        { code: center.defaultAccounts.netPayLiability, name: "Net Pay Payable", type: "liability" as const }
      ];

      for (const account of centerAccounts) {
        if (!accounts.has(account.code)) {
          accounts.set(account.code, {
            name: account.name,
            type: account.type,
            centers: new Set()
          });
        }
        accounts.get(account.code)!.centers.add(center.costCenterCode);
      }
    }

    return Array.from(accounts.entries()).map(([code, details]) => ({
      accountCode: code,
      accountName: details.name,
      accountType: details.type,
      costCenters: Array.from(details.centers)
    }));
  }

  /**
   * Validate GL mapping completeness
   */
  static validateGLMapping(packId: string): {
    complete: boolean;
    missing: string[];
    recommendations: string[];
  } {
    const costCenters = this.getCostCenters(packId);
    const missing = [];
    const recommendations = [];

    if (costCenters.length === 0) {
      missing.push(`No cost centers defined for pack: ${packId}`);
    }

    // Check for revenue-generating departments
    const revenueGenerating = costCenters.filter(c => c.accountingCategory === 'revenue_generating');
    if (revenueGenerating.length === 0) {
      recommendations.push('Consider defining revenue-generating cost centers');
    }

    // Sector-specific checks
    if (packId === 'tourism-hotels') {
      const requiredDepts = ['Front Office', 'Housekeeping', 'Food & Beverage'];
      for (const dept of requiredDepts) {
        if (!costCenters.some(c => c.department === dept)) {
          missing.push(`Missing cost center for: ${dept}`);
        }
      }
    }

    return {
      complete: missing.length === 0,
      missing,
      recommendations
    };
  }
}