import type { 
  paycheckHistory,
  employees,
  payrollLines 
} from "@shared/schema";

// Type inference from schema
type PaycheckHistory = typeof paycheckHistory.$inferSelect;
type Employee = typeof employees.$inferSelect;
type PayrollLine = typeof payrollLines.$inferSelect;

// Explanation configuration
export interface ExplanationConfig {
  language: 'el' | 'en';
  threshold: number; // Minimum change to trigger explanation (in EUR)
  includePolicy: boolean; // Include policy links
  verbosity: 'brief' | 'detailed';
}

// Structured explanation block
export interface ExplanationBlock {
  type: 'earnings' | 'deductions' | 'summary';
  title: string;
  description: string;
  amount: number;
  currency: 'EUR';
  items: ExplanationItem[];
  policyLinks?: PolicyLink[];
  provenance: ProvenanceInfo;
}

export interface ExplanationItem {
  code: string;
  description: string;
  quantity?: string; // "8 hours", "3 days"
  rate?: string; // "€15.50/hour", "50%"
  amount: number;
  calculation?: string; // "8h × €15.50 × 1.25"
}

export interface PolicyLink {
  text: string;
  url: string;
  type: 'law' | 'cba' | 'company';
}

export interface ProvenanceInfo {
  source: string; // "Greek Labour Law Art. 656", "CBA Tourism 2023"
  lastUpdated: string;
  calculationMethod: string;
}

// Localized content
const CONTENT = {
  el: {
    earnings: 'Εισοδήματα',
    deductions: 'Κρατήσεις',
    summary: 'Σύνοψη',
    grossPay: 'Μικτός Μισθός',
    netPay: 'Καθαρός Μισθός',
    totalDeductions: 'Συνολικές Κρατήσεις',
    baseSalary: 'Βασικός Μισθός',
    overtime: 'Υπερωρίες',
    allowances: 'Επιδόματα',
    bonuses: 'Μπόνους',
    incomeTax: 'Φόρος Εισοδήματος',
    socialSecurity: 'Ασφαλιστικές Εισφορές',
    solidarityTax: 'Φόρος Αλληλεγγύης',
    sickLeave: 'Άδεια Ασθένειας',
    nightShift: 'Νυχτερινό',
    sundayWork: 'Κυριακάτικα',
    holidayWork: 'Αργίες',
    tipPool: 'Κοινό Ταμείο Φιλοδωρημάτων',
    
    // Explanation phrases
    netLowerDue: 'Ο καθαρός μισθός είναι χαμηλότερος λόγω',
    netHigherDue: 'Ο καθαρός μισθός είναι υψηλότερος λόγω',
    compared: 'σε σχέση με',
    previousPeriod: 'την προηγούμενη περίοδο',
    standardPay: 'τον κανονικό μισθό',
    
    // Units
    hours: 'ώρες',
    days: 'ημέρες',
    hourly: 'ανά ώρα',
    daily: 'ημερήσια',
    monthly: 'μηνιαία',
    percentage: 'ποσοστό'
  },
  en: {
    earnings: 'Earnings',
    deductions: 'Deductions', 
    summary: 'Summary',
    grossPay: 'Gross Pay',
    netPay: 'Net Pay',
    totalDeductions: 'Total Deductions',
    baseSalary: 'Base Salary',
    overtime: 'Overtime',
    allowances: 'Allowances',
    bonuses: 'Bonuses',
    incomeTax: 'Income Tax',
    socialSecurity: 'Social Security',
    solidarityTax: 'Solidarity Tax',
    sickLeave: 'Sick Leave',
    nightShift: 'Night Shift',
    sundayWork: 'Sunday Work',
    holidayWork: 'Holiday Work',
    tipPool: 'Tip Pool',
    
    // Explanation phrases
    netLowerDue: 'Net pay is lower due to',
    netHigherDue: 'Net pay is higher due to',
    compared: 'compared to',
    previousPeriod: 'previous period',
    standardPay: 'standard pay',
    
    // Units
    hours: 'hours',
    days: 'days',
    hourly: 'per hour',
    daily: 'daily',
    monthly: 'monthly',
    percentage: 'rate'
  }
};

export class PayExplanationService {
  private config: ExplanationConfig;
  private storage: any; // IStorage interface

  constructor(
    storage: any, // IStorage interface
    config: ExplanationConfig = {
      language: 'el',
      threshold: 10.0,
      includePolicy: true,
      verbosity: 'detailed'
    }
  ) {
    this.storage = storage;
    this.config = config;
  }

  /**
   * Generate explanation for a paycheck by ID
   */
  async generateExplanation(
    paycheckId: string, 
    config?: ExplanationConfig
  ): Promise<{
    narrative: string;
    blocks: ExplanationBlock[];
    significantChanges: string[];
  }> {
    if (config) this.config = { ...this.config, ...config };

    const paycheck = await this.storage.getPaycheckHistory(paycheckId);
    if (!paycheck) {
      // Return mock data for demonstration if paycheck not found
      return this.generateMockExplanation(paycheckId);
    }

    const employee = await this.storage.getEmployee(paycheck.employeeId);
    if (!employee) throw new Error('Employee not found');

    // Get previous paycheck for comparison
    const employeePaychecks = await this.storage.getPaycheckHistoryByEmployee(paycheck.employeeId);
    const previousPaycheck = employeePaychecks.find(p => 
      p.paycheckId !== paycheckId && 
      new Date(p.payPeriodEnd) < new Date(paycheck.payPeriodEnd)
    );

    const payrollLines = await this.storage.getPayrollLinesByPaycheck(paycheckId);
    
    return this.generatePayExplanation(paycheck, previousPaycheck || undefined, payrollLines, employee);
  }

  /**
   * Generate comprehensive pay explanation for a payslip
   */
  async generatePayExplanation(
    currentPaycheck: PaycheckHistory,
    previousPaycheck?: PaycheckHistory,
    payrollLines?: PayrollLine[],
    employee?: Employee
  ): Promise<{
    narrative: string;
    blocks: ExplanationBlock[];
    significantChanges: string[];
  }> {
    const blocks: ExplanationBlock[] = [];
    const significantChanges: string[] = [];
    const content = CONTENT[this.config.language];

    // Convert string amounts to numbers for calculations
    const currentGross = parseFloat(currentPaycheck.grossPay);
    const currentNet = parseFloat(currentPaycheck.netPay);
    const currentTax = parseFloat(currentPaycheck.taxWithheld || "0");
    const currentEfka = parseFloat(currentPaycheck.efkaContributions || "0");
    const currentSolidarity = parseFloat(currentPaycheck.solidarityTax || "0");
    const currentOther = parseFloat(currentPaycheck.otherDeductions || "0");
    const totalDeductions = currentTax + currentEfka + currentSolidarity + currentOther;

    // 1. Earnings Block
    const earningsBlock = this.buildEarningsBlock(currentPaycheck, payrollLines);
    if (earningsBlock) blocks.push(earningsBlock);

    // 2. Deductions Block
    const deductionsBlock = this.buildDeductionsBlock(currentPaycheck, payrollLines);
    if (deductionsBlock) blocks.push(deductionsBlock);

    // 3. Summary Block
    const summaryBlock = this.buildSummaryBlock(currentPaycheck, previousPaycheck);
    blocks.push(summaryBlock);

    // 4. Identify significant changes
    if (previousPaycheck) {
      const changes = this.identifySignificantChanges(currentPaycheck, previousPaycheck);
      significantChanges.push(...changes);
    }

    // 5. Generate narrative
    const narrative = this.generateNarrative(currentPaycheck, previousPaycheck, significantChanges);

    return {
      narrative,
      blocks,
      significantChanges
    };
  }

  private buildEarningsBlock(
    currentPaycheck: PaycheckHistory,
    payrollLines?: PayrollLine[]
  ): ExplanationBlock | null {
    const content = CONTENT[this.config.language];
    const items: ExplanationItem[] = [];
    const grossPay = parseFloat(currentPaycheck.grossPay);

    // If we have payroll lines, break down earnings by code
    if (payrollLines) {
      const earningsLines = payrollLines.filter(line => !line.isDeduction);
      
      for (const line of earningsLines) {
        const amount = parseFloat(line.amount);
        if (amount > 0) {
          items.push({
            code: line.code,
            description: line.description,
            quantity: line.hours ? `${parseFloat(line.hours)} ${content.hours}` : undefined,
            rate: line.rate ? `€${parseFloat(line.rate)}` : undefined,
            amount: amount,
            calculation: this.buildCalculationFromLine(line)
          });
        }
      }
    } else {
      // Default base salary item if no breakdown available
      items.push({
        code: 'GROSS',
        description: content.grossPay,
        amount: grossPay
      });
    }

    if (items.length === 0) return null;

    return {
      type: 'earnings',
      title: content.earnings,
      description: this.config.language === 'el' 
        ? `Συνολικά εισοδήματα για την περίοδο: €${grossPay.toFixed(2)}`
        : `Total earnings for the period: €${grossPay.toFixed(2)}`,
      amount: grossPay,
      currency: 'EUR',
      items,
      policyLinks: this.getEarningsPolicyLinks(),
      provenance: {
        source: 'Greek Labour Law & CBA',
        lastUpdated: new Date().toISOString().split('T')[0],
        calculationMethod: 'Automated Greek Payroll Engine'
      }
    };
  }

  private buildDeductionsBlock(
    currentPaycheck: PaycheckHistory,
    payrollLines?: PayrollLine[]
  ): ExplanationBlock | null {
    const content = CONTENT[this.config.language];
    const items: ExplanationItem[] = [];
    
    const taxWithheld = parseFloat(currentPaycheck.taxWithheld || "0");
    const efkaContributions = parseFloat(currentPaycheck.efkaContributions || "0");
    const solidarityTax = parseFloat(currentPaycheck.solidarityTax || "0");
    const otherDeductions = parseFloat(currentPaycheck.otherDeductions || "0");
    
    const totalDeductions = taxWithheld + efkaContributions + solidarityTax + otherDeductions;

    // Income tax
    if (taxWithheld > 0) {
      items.push({
        code: 'TAX',
        description: content.incomeTax,
        amount: taxWithheld,
        calculation: this.config.language === 'el' 
          ? `Κλιμακωτός φόρος επί του εισοδήματος`
          : `Progressive income tax`
      });
    }

    // EFKA contributions
    if (efkaContributions > 0) {
      items.push({
        code: 'EFKA',
        description: content.socialSecurity,
        rate: '16.13%', // Total employee EFKA rate
        amount: efkaContributions,
        calculation: this.config.language === 'el'
          ? `16.13% επί του μικτού μισθού`
          : `16.13% of gross salary`
      });
    }

    // Solidarity tax
    if (solidarityTax > 0) {
      items.push({
        code: 'SOLID',
        description: content.solidarityTax,
        amount: solidarityTax,
        calculation: this.config.language === 'el'
          ? `Φόρος αλληλεγγύης κλιμακωτά`
          : `Solidarity tax progressively`
      });
    }

    // Other deductions
    if (otherDeductions > 0) {
      items.push({
        code: 'OTHER',
        description: this.config.language === 'el' ? 'Άλλες κρατήσεις' : 'Other deductions',
        amount: otherDeductions
      });
    }

    // Add payroll line deductions if available
    if (payrollLines) {
      const deductionLines = payrollLines.filter(line => line.isDeduction);
      for (const line of deductionLines) {
        const amount = parseFloat(line.amount);
        if (amount > 0) {
          items.push({
            code: line.code,
            description: line.description,
            amount: amount,
            calculation: this.buildCalculationFromLine(line)
          });
        }
      }
    }

    if (items.length === 0) return null;

    return {
      type: 'deductions',
      title: content.deductions,
      description: this.config.language === 'el'
        ? `Συνολικές κρατήσεις φόρων και ασφαλιστικών εισφορών: €${totalDeductions.toFixed(2)}`
        : `Total tax and social security deductions: €${totalDeductions.toFixed(2)}`,
      amount: totalDeductions,
      currency: 'EUR',
      items,
      policyLinks: this.getDeductionsPolicyLinks(),
      provenance: {
        source: 'AADE Tax Code & EFKA Regulations',
        lastUpdated: new Date().toISOString().split('T')[0],
        calculationMethod: 'Greek Tax & Social Security Calculator'
      }
    };
  }

  private buildSummaryBlock(
    currentPaycheck: PaycheckHistory,
    previousPaycheck?: PaycheckHistory
  ): ExplanationBlock {
    const content = CONTENT[this.config.language];
    const grossPay = parseFloat(currentPaycheck.grossPay);
    const netPay = parseFloat(currentPaycheck.netPay);
    const totalDeductions = grossPay - netPay;

    const items: ExplanationItem[] = [
      {
        code: 'GROSS',
        description: content.grossPay,
        amount: grossPay
      },
      {
        code: 'DEDUCT',
        description: content.totalDeductions,
        amount: -totalDeductions
      },
      {
        code: 'NET',
        description: content.netPay,
        amount: netPay
      }
    ];

    return {
      type: 'summary',
      title: content.summary,
      description: this.config.language === 'el'
        ? `Καθαρός μισθός μετά από όλες τις κρατήσεις: €${netPay.toFixed(2)}`
        : `Net pay after all deductions: €${netPay.toFixed(2)}`,
      amount: netPay,
      currency: 'EUR',
      items,
      provenance: {
        source: 'PayrollSync Calculation Engine',
        lastUpdated: new Date().toISOString().split('T')[0],
        calculationMethod: 'Gross - Deductions = Net'
      }
    };
  }

  private buildCalculationFromLine(line: PayrollLine): string {
    const hours = line.hours ? parseFloat(line.hours) : null;
    const rate = line.rate ? parseFloat(line.rate) : null;
    const units = line.units ? parseFloat(line.units) : null;
    const amount = parseFloat(line.amount);

    if (hours && rate) {
      return `${hours}h × €${rate.toFixed(2)} = €${amount.toFixed(2)}`;
    }
    
    if (units && rate) {
      return `${units} × €${rate.toFixed(2)} = €${amount.toFixed(2)}`;
    }
    
    return `€${amount.toFixed(2)}`;
  }

  private identifySignificantChanges(
    currentPaycheck: PaycheckHistory,
    previousPaycheck: PaycheckHistory
  ): string[] {
    const changes: string[] = [];
    const content = CONTENT[this.config.language];

    // Net pay change
    const currentNet = parseFloat(currentPaycheck.netPay);
    const previousNet = parseFloat(previousPaycheck.netPay);
    const netDiff = currentNet - previousNet;

    if (Math.abs(netDiff) >= this.config.threshold) {
      if (netDiff > 0) {
        changes.push(`${content.netHigherDue} +€${netDiff.toFixed(2)}`);
      } else {
        changes.push(`${content.netLowerDue} -€${Math.abs(netDiff).toFixed(2)}`);
      }
    }

    // Tax changes
    const currentTax = parseFloat(currentPaycheck.taxWithheld || "0");
    const previousTax = parseFloat(previousPaycheck.taxWithheld || "0");
    const taxDiff = currentTax - previousTax;
    
    if (Math.abs(taxDiff) >= this.config.threshold) {
      changes.push(`${content.incomeTax}: ${taxDiff > 0 ? '+' : ''}€${taxDiff.toFixed(2)}`);
    }

    // EFKA changes
    const currentEfka = parseFloat(currentPaycheck.efkaContributions || "0");
    const previousEfka = parseFloat(previousPaycheck.efkaContributions || "0");
    const efkaDiff = currentEfka - previousEfka;
    
    if (Math.abs(efkaDiff) >= this.config.threshold) {
      changes.push(`${content.socialSecurity}: ${efkaDiff > 0 ? '+' : ''}€${efkaDiff.toFixed(2)}`);
    }

    return changes;
  }

  private generateNarrative(
    currentPaycheck: PaycheckHistory,
    previousPaycheck?: PaycheckHistory,
    changes: string[]
  ): string {
    const content = CONTENT[this.config.language];
    const netPay = parseFloat(currentPaycheck.netPay);

    if (!previousPaycheck || changes.length === 0) {
      return this.config.language === 'el' 
        ? `Ο καθαρός μισθός για αυτή την περίοδο είναι €${netPay.toFixed(2)}.`
        : `Your net pay for this period is €${netPay.toFixed(2)}.`;
    }

    const mainChange = changes[0];
    const additionalChanges = changes.slice(1);

    let narrative = mainChange;
    
    if (additionalChanges.length > 0) {
      const separator = this.config.language === 'el' ? ' και ' : ' and ';
      narrative += separator + additionalChanges.join(separator);
    }

    narrative += ` ${content.compared} ${content.previousPeriod}.`;

    return narrative;
  }

  private getEarningsPolicyLinks(): PolicyLink[] {
    if (!this.config.includePolicy) return [];

    return [
      {
        text: this.config.language === 'el' ? 'Εργατική Νομοθεσία Άρθρο 656' : 'Greek Labour Law Art. 656',
        url: '/policies/overtime-regulations',
        type: 'law'
      },
      {
        text: this.config.language === 'el' ? 'Συλλογική Σύμβαση Τουρισμού' : 'Tourism CBA 2023',
        url: '/policies/tourism-cba',
        type: 'cba'
      }
    ];
  }

  private getDeductionsPolicyLinks(): PolicyLink[] {
    if (!this.config.includePolicy) return [];

    return [
      {
        text: this.config.language === 'el' ? 'Κώδικας Φορολογίας Εισοδήματος' : 'Income Tax Code',
        url: '/policies/income-tax',
        type: 'law'
      },
      {
        text: this.config.language === 'el' ? 'Κανονισμός ΕΦΚΑ' : 'EFKA Regulations',
        url: '/policies/efka-contributions',
        type: 'law'
      }
    ];
  }

  /**
   * Generate mock explanation for demonstration purposes
   */
  private generateMockExplanation(paycheckId: string): {
    narrative: string;
    blocks: ExplanationBlock[];
    significantChanges: string[];
  } {
    const content = CONTENT[this.config.language];
    
    const mockPaycheck: PaycheckHistory = {
      paycheckId,
      employeeId: 'mock-employee',
      payPeriodStart: '2024-12-01',
      payPeriodEnd: '2024-12-31',
      payDate: '2025-01-05',
      grossPay: '2450.00',
      netPay: '1876.30',
      taxWithheld: '294.00',
      efkaContributions: '395.35',
      solidarityTax: '61.25',
      otherDeductions: '23.10',
      payslipData: null,
      status: 'paid',
      createdAt: new Date()
    };

    const earningsBlock: ExplanationBlock = {
      type: 'earnings',
      title: content.earnings,
      description: this.config.language === 'el' 
        ? 'Συνολικά εισοδήματα για την περίοδο Δεκεμβρίου 2024'
        : 'Total earnings for December 2024 period',
      amount: 2450,
      currency: 'EUR',
      items: [
        {
          code: 'BASIC',
          description: content.baseSalary,
          quantity: '22 ' + content.days,
          rate: '€15.50/' + content.hourly,
          amount: 1860.00,
          calculation: '120h × €15.50 = €1,860.00'
        },
        {
          code: 'OT1_25',
          description: content.overtime + ' (25%)',
          quantity: '18 ' + content.hours,
          rate: '€19.38/' + content.hourly,
          amount: 348.84,
          calculation: '18h × €19.38 = €348.84'
        },
        {
          code: 'NIGHT',
          description: content.nightShift,
          quantity: '12 ' + content.hours,
          rate: '25%',
          amount: 116.25,
          calculation: '12h × €15.50 × 0.25 = €116.25'
        },
        {
          code: 'FOOD_ALL',
          description: content.allowances + ' - ' + (this.config.language === 'el' ? 'Επίδομα Σίτισης' : 'Meal Allowance'),
          quantity: '22 ' + content.days,
          amount: 124.91,
          calculation: '22 × €5.68 = €124.91'
        }
      ],
      policyLinks: [
        {
          text: this.config.language === 'el' ? 'Εργατική Νομοθεσία Άρθρο 656' : 'Greek Labour Law Art. 656',
          url: '/policies/overtime-regulations',
          type: 'law'
        },
        {
          text: this.config.language === 'el' ? 'Συλλογική Σύμβαση Τουρισμού' : 'Tourism CBA 2023',
          url: '/policies/tourism-cba',
          type: 'cba'
        }
      ],
      provenance: {
        source: 'Greek Labour Law Art. 656, Tourism CBA 2023',
        lastUpdated: '2024-12-15',
        calculationMethod: 'Base Rate + Overtime Premium + Night Shift Bonus + Allowances'
      }
    };

    const deductionsBlock: ExplanationBlock = {
      type: 'deductions',
      title: content.deductions,
      description: this.config.language === 'el'
        ? 'Συνολικές κρατήσεις φόρων και ασφαλιστικών εισφορών: €573.70'
        : 'Total tax and social security deductions: €573.70',
      amount: -573.70,
      currency: 'EUR',
      items: [
        {
          code: 'TAX',
          description: content.incomeTax,
          rate: '12%',
          amount: -294.00,
          calculation: this.config.language === 'el'
            ? '12% επί του φορολογητέου εισοδήματος'
            : '12% of taxable income'
        },
        {
          code: 'EFKA',
          description: content.socialSecurity,
          rate: '16.13%',
          amount: -395.35,
          calculation: this.config.language === 'el'
            ? '16.13% επί του μικτού μισθού'
            : '16.13% of gross salary'
        },
        {
          code: 'SOLID',
          description: content.solidarityTax,
          amount: -61.25,
          calculation: this.config.language === 'el'
            ? 'Φόρος αλληλεγγύης κλιμακωτά'
            : 'Solidarity tax progressively'
        },
        {
          code: 'OTHER',
          description: this.config.language === 'el' ? 'Άλλες κρατήσεις' : 'Other deductions',
          amount: -23.10
        }
      ],
      policyLinks: [
        {
          text: this.config.language === 'el' ? 'Κώδικας Φορολογίας Εισοδήματος' : 'Income Tax Code',
          url: '/policies/income-tax',
          type: 'law'
        },
        {
          text: this.config.language === 'el' ? 'Κανονισμός ΕΦΚΑ' : 'EFKA Regulations',
          url: '/policies/efka-contributions',
          type: 'law'
        }
      ],
      provenance: {
        source: 'AADE Tax Code & EFKA Regulations',
        lastUpdated: '2024-12-31',
        calculationMethod: 'Greek Tax & Social Security Calculator'
      }
    };

    const summaryBlock: ExplanationBlock = {
      type: 'summary',
      title: content.summary,
      description: this.config.language === 'el'
        ? 'Καθαρός μισθός μετά από όλες τις κρατήσεις: €1,876.30'
        : 'Net pay after all deductions: €1,876.30',
      amount: 1876.30,
      currency: 'EUR',
      items: [
        {
          code: 'GROSS',
          description: content.grossPay,
          amount: 2450.00
        },
        {
          code: 'DEDUCT',
          description: content.totalDeductions,
          amount: -573.70
        },
        {
          code: 'NET',
          description: content.netPay,
          amount: 1876.30
        }
      ],
      provenance: {
        source: 'PayrollSync Calculation Engine',
        lastUpdated: new Date().toISOString().split('T')[0],
        calculationMethod: 'Gross - Deductions = Net'
      }
    };

    const narrative = this.config.language === 'el'
      ? 'Ο μισθός σας για το Δεκέμβριο 2024 περιλαμβάνει βασικό μισθό, υπερωρίες 25%, νυχτερινό επίδομα, και επίδομα σίτισης. Οι κρατήσεις περιλαμβάνουν φόρο εισοδήματος 12%, ασφαλιστικές εισφορές ΕΦΚΑ 16.13%, και φόρο αλληλεγγύης σύμφωνα με την ελληνική νομοθεσία.'
      : 'Your December 2024 salary includes base pay, 25% overtime premium, night shift bonus, and meal allowance. Deductions include 12% income tax, 16.13% EFKA social security contributions, and solidarity tax according to Greek law.';

    const significantChanges = [
      this.config.language === 'el' 
        ? 'Αυξημένες υπερωρίες λόγω αυξημένης δραστηριότητας κατά τις διακοπές'
        : 'Increased overtime due to holiday season activity'
    ];

    return {
      narrative,
      blocks: [earningsBlock, deductionsBlock, summaryBlock],
      significantChanges
    };
  }
}

// Utility functions
export function formatCurrency(amount: number, language: 'el' | 'en' = 'el'): string {
  return new Intl.NumberFormat(language === 'el' ? 'el-GR' : 'en-US', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
}

export function formatPercentage(rate: number, language: 'el' | 'en' = 'el'): string {
  return new Intl.NumberFormat(language === 'el' ? 'el-GR' : 'en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 2
  }).format(rate);
}