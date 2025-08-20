/**
 * APD/ΦΜΥ (Social Security/Tax) Earnings Code Mapping Service
 * 
 * Maps CBA pack earnings to official Greek APD categories automatically.
 * No manual mapping required - codes are predefined per sector.
 */

export interface APDEarningsMapping {
  cbaCode: string;
  cbaName: string;
  apdCategory: string;
  apdCode: string;
  apdDescription: string;
  taxTreatment: 'taxable' | 'tax_exempt' | 'split' | 'reduced_rate';
  socialInsuranceContribution: boolean;
  pensionContribution: boolean;
  unemploymentContribution: boolean;
  withholdingTaxRate: number; // Percentage
  specialHandling?: {
    maxAnnualAmount?: number;
    seasonalRules?: boolean;
    frequencyRestrictions?: string[];
  };
}

// Tourism Hotels APD Mappings
const tourismHotelsAPDMappings: APDEarningsMapping[] = [
  // Base Wages
  {
    cbaCode: "BASE_WAGE",
    cbaName: "Base Monthly Wage", 
    apdCategory: "REGULAR_EARNINGS",
    apdCode: "101",
    apdDescription: "Τακτικές αποδοχές - Regular wages",
    taxTreatment: "taxable",
    socialInsuranceContribution: true,
    pensionContribution: true,
    unemploymentContribution: true,
    withholdingTaxRate: 22.0
  },

  // Allowances
  {
    cbaCode: "MEAL_ALLOW",
    cbaName: "Meal Allowance",
    apdCategory: "ALLOWANCES_SPLIT",
    apdCode: "201",
    apdDescription: "Επίδομα σίτισης - Meal allowance (split treatment)",
    taxTreatment: "split", // €6/day exempt, excess taxable
    socialInsuranceContribution: false, // For exempt portion
    pensionContribution: false,
    unemploymentContribution: false,
    withholdingTaxRate: 0.0,
    specialHandling: {
      maxAnnualAmount: 1560, // €6 × 260 working days
      frequencyRestrictions: ["daily", "monthly"]
    }
  },
  {
    cbaCode: "ACCOM_ALLOW", 
    cbaName: "Accommodation Allowance",
    apdCategory: "ALLOWANCES_TAXABLE",
    apdCode: "202",
    apdDescription: "Επίδομα στέγασης - Accommodation allowance",
    taxTreatment: "taxable",
    socialInsuranceContribution: true,
    pensionContribution: true,
    unemploymentContribution: true,
    withholdingTaxRate: 22.0
  },
  {
    cbaCode: "UNIFORM_ALLOW",
    cbaName: "Uniform Allowance", 
    apdCategory: "ALLOWANCES_EXEMPT",
    apdCode: "203",
    apdDescription: "Επίδομα ένδυσης - Uniform allowance (exempt)",
    taxTreatment: "tax_exempt",
    socialInsuranceContribution: false,
    pensionContribution: false,
    unemploymentContribution: false,
    withholdingTaxRate: 0.0,
    specialHandling: {
      maxAnnualAmount: 600, // Annual limit for exemption
      frequencyRestrictions: ["monthly", "quarterly", "annual"]
    }
  },

  // Premiums
  {
    cbaCode: "NIGHT_25",
    cbaName: "Night Shift Premium (25%)",
    apdCategory: "PREMIUM_WAGES",
    apdCode: "301",
    apdDescription: "Νυχτερινό επίδομα 25% - Night premium", 
    taxTreatment: "taxable",
    socialInsuranceContribution: true,
    pensionContribution: true,
    unemploymentContribution: true,
    withholdingTaxRate: 22.0
  },
  {
    cbaCode: "SUNDAY_75",
    cbaName: "Sunday Work Premium (75%)",
    apdCategory: "PREMIUM_WAGES",
    apdCode: "302", 
    apdDescription: "Κυριακάτικο επίδομα 75% - Sunday premium",
    taxTreatment: "taxable",
    socialInsuranceContribution: true,
    pensionContribution: true,
    unemploymentContribution: true,
    withholdingTaxRate: 22.0
  },
  {
    cbaCode: "HOLIDAY_75",
    cbaName: "Holiday Work Premium (75%)",
    apdCategory: "PREMIUM_WAGES", 
    apdCode: "303",
    apdDescription: "Αργιακό επίδομα 75% - Holiday premium",
    taxTreatment: "taxable",
    socialInsuranceContribution: true,
    pensionContribution: true,
    unemploymentContribution: true,
    withholdingTaxRate: 22.0
  },
  {
    cbaCode: "SIXTH_DAY_40",
    cbaName: "Sixth Day Premium (40%)",
    apdCategory: "PREMIUM_WAGES",
    apdCode: "304",
    apdDescription: "Επίδομα έκτης ημέρας 40% - Sixth day premium",
    taxTreatment: "taxable", 
    socialInsuranceContribution: true,
    pensionContribution: true,
    unemploymentContribution: true,
    withholdingTaxRate: 22.0
  },

  // Overtime
  {
    cbaCode: "OVERTIME_125",
    cbaName: "Overtime Premium (25%)",
    apdCategory: "OVERTIME_WAGES",
    apdCode: "401",
    apdDescription: "Υπερωρίες 25% - Overtime premium",
    taxTreatment: "taxable",
    socialInsuranceContribution: true,
    pensionContribution: true, 
    unemploymentContribution: true,
    withholdingTaxRate: 22.0
  }
];

// F&B Restaurants APD Mappings
const fnbRestaurantsAPDMappings: APDEarningsMapping[] = [
  // Base Wages  
  {
    cbaCode: "BASE_WAGE",
    cbaName: "Base Monthly Wage",
    apdCategory: "REGULAR_EARNINGS", 
    apdCode: "101",
    apdDescription: "Τακτικές αποδοχές - Regular wages",
    taxTreatment: "taxable",
    socialInsuranceContribution: true,
    pensionContribution: true,
    unemploymentContribution: true,
    withholdingTaxRate: 22.0
  },

  // Allowances
  {
    cbaCode: "MEAL_ALLOW",
    cbaName: "Meal Allowance",
    apdCategory: "ALLOWANCES_SPLIT",
    apdCode: "201", 
    apdDescription: "Επίδομα σίτισης - Meal allowance (split treatment)",
    taxTreatment: "split", // €8/day exempt, excess taxable
    socialInsuranceContribution: false,
    pensionContribution: false,
    unemploymentContribution: false,
    withholdingTaxRate: 0.0,
    specialHandling: {
      maxAnnualAmount: 2080, // €8 × 260 working days  
      frequencyRestrictions: ["daily", "monthly"]
    }
  },

  // Tips and Service Charges
  {
    cbaCode: "TIPS_DECLARED",
    cbaName: "Declared Tips",
    apdCategory: "TIPS_SERVICE_CHARGES",
    apdCode: "501", 
    apdDescription: "Δηλωθέντα φιλοδωρήματα - Declared tips",
    taxTreatment: "reduced_rate", // 13% tax rate for tips
    socialInsuranceContribution: true,
    pensionContribution: true,
    unemploymentContribution: true, 
    withholdingTaxRate: 13.0,
    specialHandling: {
      seasonalRules: true,
      frequencyRestrictions: ["daily", "weekly", "monthly"]
    }
  },
  {
    cbaCode: "SERVICE_CHARGE",
    cbaName: "Service Charge Distribution",
    apdCategory: "TIPS_SERVICE_CHARGES",
    apdCode: "502",
    apdDescription: "Διανομή service charge - Service charge distribution", 
    taxTreatment: "reduced_rate",
    socialInsuranceContribution: true,
    pensionContribution: true,
    unemploymentContribution: true,
    withholdingTaxRate: 13.0
  },

  // Premiums
  {
    cbaCode: "NIGHT_25", 
    cbaName: "Night Shift Premium (25%)",
    apdCategory: "PREMIUM_WAGES",
    apdCode: "301",
    apdDescription: "Νυχτερινό επίδομα 25% - Night premium",
    taxTreatment: "taxable",
    socialInsuranceContribution: true,
    pensionContribution: true,
    unemploymentContribution: true,
    withholdingTaxRate: 22.0
  },
  {
    cbaCode: "HOLIDAY_100", 
    cbaName: "Holiday Work Premium (100%)",
    apdCategory: "PREMIUM_WAGES",
    apdCode: "305",
    apdDescription: "Αργιακό επίδομα 100% - Holiday premium (F&B)",
    taxTreatment: "taxable",
    socialInsuranceContribution: true,
    pensionContribution: true,
    unemploymentContribution: true,
    withholdingTaxRate: 22.0
  }
];

export class APDMappingService {
  private static mappings: Map<string, APDEarningsMapping[]> = new Map([
    ["tourism-hotels", tourismHotelsAPDMappings],
    ["fnb-restaurants", fnbRestaurantsAPDMappings] 
  ]);

  /**
   * Get APD mappings for a CBA pack
   */
  static getMappingsForPack(packId: string): APDEarningsMapping[] {
    return this.mappings.get(packId) || [];
  }

  /**
   * Get specific APD mapping for a CBA code
   */
  static getMapping(packId: string, cbaCode: string): APDEarningsMapping | null {
    const packMappings = this.getMappingsForPack(packId);
    return packMappings.find(m => m.cbaCode === cbaCode) || null;
  }

  /**
   * Generate APD export data for payroll
   */
  static generateAPDExport(packId: string, payrollData: Array<{
    employeeId: string;
    employeeAFM: string;
    earnings: Array<{
      code: string;
      amount: number;
      period: string;
    }>;
  }>): {
    exportData: Array<{
      employeeAFM: string;
      apdCode: string;
      apdCategory: string;
      grossAmount: number;
      taxableAmount: number;
      socialInsuranceBase: number;
      withholdingTax: number;
      netAmount: number;
      specialHandling?: any;
    }>;
    summary: {
      totalEmployees: number;
      totalGrossAmount: number;
      totalTaxableAmount: number;
      totalWithholdingTax: number;
      totalNetAmount: number;
    };
  } {
    const exportData = [];
    let totalGrossAmount = 0;
    let totalTaxableAmount = 0;
    let totalWithholdingTax = 0;
    let totalNetAmount = 0;

    for (const employee of payrollData) {
      for (const earning of employee.earnings) {
        const mapping = this.getMapping(packId, earning.code);
        if (!mapping) {
          console.warn(`No APD mapping found for code: ${earning.code}`);
          continue;
        }

        const grossAmount = earning.amount;
        let taxableAmount = grossAmount;
        let socialInsuranceBase = grossAmount;

        // Apply special handling for split treatment (e.g., meal allowances)
        if (mapping.taxTreatment === 'split' && mapping.specialHandling?.maxAnnualAmount) {
          const exemptPortion = Math.min(grossAmount, mapping.specialHandling.maxAnnualAmount / 12);
          taxableAmount = Math.max(0, grossAmount - exemptPortion);
          socialInsuranceBase = taxableAmount; // Only taxable portion contributes
        }

        // Apply tax exemptions
        if (mapping.taxTreatment === 'tax_exempt') {
          taxableAmount = 0;
          socialInsuranceBase = 0;
        }

        const withholdingTax = taxableAmount * (mapping.withholdingTaxRate / 100);
        const netAmount = grossAmount - withholdingTax;

        exportData.push({
          employeeAFM: employee.employeeAFM,
          apdCode: mapping.apdCode,
          apdCategory: mapping.apdCategory,
          grossAmount,
          taxableAmount,
          socialInsuranceBase,
          withholdingTax,
          netAmount,
          specialHandling: mapping.specialHandling
        });

        totalGrossAmount += grossAmount;
        totalTaxableAmount += taxableAmount;
        totalWithholdingTax += withholdingTax;
        totalNetAmount += netAmount;
      }
    }

    return {
      exportData,
      summary: {
        totalEmployees: payrollData.length,
        totalGrossAmount,
        totalTaxableAmount, 
        totalWithholdingTax,
        totalNetAmount
      }
    };
  }

  /**
   * Generate ΦΜΥ (Tax Authority) declaration format
   */
  static generateFMYDeclaration(packId: string, month: number, year: number, payrollData: any[]): {
    header: {
      declarationType: string;
      period: string;
      submissionDate: string;
      employerAFM: string;
    };
    employees: Array<{
      employeeAFM: string;
      surname: string;
      firstName: string;
      totalGrossEarnings: number;
      totalTaxableEarnings: number;
      totalWithholdingTax: number;
      earningsBreakdown: Array<{
        apdCode: string;
        description: string;
        amount: number;
        taxableAmount: number;
        withholdingTax: number;
      }>;
    }>;
    totals: {
      employeeCount: number;
      totalGrossEarnings: number;
      totalTaxableEarnings: number;
      totalWithholdingTax: number;
    };
  } {
    // Generate standard ΦΜΥ format
    return {
      header: {
        declarationType: "MONTHLY_PAYROLL_DECLARATION",
        period: `${year}-${month.toString().padStart(2, '0')}`,
        submissionDate: new Date().toISOString().split('T')[0],
        employerAFM: process.env.COMPANY_AFM || "999999999"
      },
      employees: [], // Would be populated from actual payroll data
      totals: {
        employeeCount: 0,
        totalGrossEarnings: 0,
        totalTaxableEarnings: 0,
        totalWithholdingTax: 0
      }
    };
  }

  /**
   * Get available APD categories for pack
   */
  static getAPDCategories(packId: string): Array<{
    category: string;
    codes: Array<{
      code: string;
      description: string;
      count: number;
    }>;
  }> {
    const mappings = this.getMappingsForPack(packId);
    const categories = new Map<string, Array<{code: string; description: string}>>();

    for (const mapping of mappings) {
      if (!categories.has(mapping.apdCategory)) {
        categories.set(mapping.apdCategory, []);
      }
      categories.get(mapping.apdCategory)!.push({
        code: mapping.apdCode,
        description: mapping.apdDescription
      });
    }

    return Array.from(categories.entries()).map(([category, codes]) => ({
      category,
      codes: codes.map(code => ({ ...code, count: 1 }))
    }));
  }

  /**
   * Validate APD compliance for pack
   */
  static validateAPDCompliance(packId: string): {
    compliant: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const mappings = this.getMappingsForPack(packId);
    const issues = [];
    const recommendations = [];

    // Check for missing base wage mapping
    const hasBaseWage = mappings.some(m => m.cbaCode === 'BASE_WAGE');
    if (!hasBaseWage) {
      issues.push('Missing base wage APD mapping');
    }

    // Check for proper tax treatment
    const splitTreatmentItems = mappings.filter(m => m.taxTreatment === 'split');
    for (const item of splitTreatmentItems) {
      if (!item.specialHandling?.maxAnnualAmount) {
        issues.push(`Split treatment item ${item.cbaCode} missing annual limit`);
      }
    }

    // Sector-specific checks
    if (packId === 'fnb-restaurants') {
      const hasTipsMapping = mappings.some(m => m.apdCategory === 'TIPS_SERVICE_CHARGES');
      if (!hasTipsMapping) {
        recommendations.push('Consider adding tips/service charge mappings for F&B sector');
      }
    }

    return {
      compliant: issues.length === 0,
      issues,
      recommendations
    };
  }
}