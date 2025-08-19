import { nanoid } from "nanoid";
import { createHash } from "crypto";

/**
 * ΦΜΥ (FMY) Withholding File Generator for AADE Tax Reporting
 * Generates monthly tax withholding statements
 */

export interface FMYRecord {
  afm: string;
  amka: string;
  employeeName: string;
  grossIncome: number;
  taxableIncome: number;
  taxWithheld: number;
  socialSecurityContributions: number;
  netIncome: number;
  paymentDate: string;
  incomeCategory: string;
  specialCategoryCode?: string;
  foreignTaxCredit?: number;
}

export interface FMYFile {
  fileId: string;
  period: string;
  companyAFM: string;
  companyName: string;
  totalRecords: number;
  totalGrossIncome: number;
  totalTaxWithheld: number;
  totalSocialSecurityContributions: number;
  records: FMYRecord[];
  generatedAt: Date;
  xmlContent: string;
  checksum: string;
}

export interface FMYMergeUtility {
  originalFiles: string[];
  mergedFileId: string;
  totalRecords: number;
  mergedAt: Date;
  duplicatesRemoved: number;
}

export interface AADESubmissionReceipt {
  submissionId: string;
  fmyFileId: string;
  submittedAt: Date;
  aadeReceiptNumber: string;
  status: 'submitted' | 'accepted' | 'rejected';
  rejectionReasons?: string[];
  receiptXml?: string;
}

// Greek tax income categories
const INCOME_CATEGORIES = {
  'SALARY_WAGES': 'E1',        // Employment income
  'PENSION': 'E2',             // Pension income
  'FREELANCE': 'E3',           // Freelance/professional income
  'BUSINESS': 'E4',            // Business income
  'CAPITAL_GAINS': 'E5',       // Capital gains
  'RENTAL': 'E6',              // Rental income
  'OTHER': 'E7'                // Other income
};

// Greek tax brackets for 2025
const TAX_BRACKETS = [
  { min: 0, max: 10000, rate: 0.09 },         // 9% up to €10,000
  { min: 10000, max: 20000, rate: 0.22 },     // 22% from €10,001 to €20,000
  { min: 20000, max: 30000, rate: 0.28 },     // 28% from €20,001 to €30,000
  { min: 30000, max: 40000, rate: 0.36 },     // 36% from €30,001 to €40,000
  { min: 40000, max: Infinity, rate: 0.44 }   // 44% over €40,000
];

// Solidarity tax brackets (additional tax on higher incomes)
const SOLIDARITY_TAX_BRACKETS = [
  { min: 0, max: 30000, rate: 0 },           // No solidarity tax up to €30,000
  { min: 30000, max: 40000, rate: 0.022 },   // 2.2% from €30,001 to €40,000
  { min: 40000, max: 65000, rate: 0.05 },    // 5% from €40,001 to €65,000
  { min: 65000, max: 220000, rate: 0.065 },  // 6.5% from €65,001 to €220,000
  { min: 220000, max: Infinity, rate: 0.09 } // 9% over €220,000
];

class FMYGenerator {
  private readonly companyAFM: string;
  private readonly companyName: string;

  constructor() {
    this.companyAFM = process.env.COMPANY_AFM || '123456789';
    this.companyName = process.env.COMPANY_NAME || 'PayrollSync Demo Company';
  }

  /**
   * Generate monthly FMY withholding file for AADE submission
   */
  async generateMonthlyFMY(
    period: string, // Format: YYYY-MM
    payrollData: any[]
  ): Promise<FMYFile> {
    const fileId = nanoid();
    
    // Transform payroll data to FMY records
    const fmyRecords: FMYRecord[] = payrollData.map(employee => {
      return this.transformToFMYRecord(employee, period);
    });

    // Calculate totals
    const totals = this.calculateFMYTotals(fmyRecords);
    
    // Generate XML content
    const xmlContent = this.generateFMYXML({
      fileId,
      period,
      companyAFM: this.companyAFM,
      companyName: this.companyName,
      records: fmyRecords,
      ...totals
    });

    // Generate checksum for integrity verification
    const checksum = createHash('sha256').update(xmlContent).digest('hex');

    const fmyFile: FMYFile = {
      fileId,
      period,
      companyAFM: this.companyAFM,
      companyName: this.companyName,
      totalRecords: fmyRecords.length,
      totalGrossIncome: totals.totalGrossIncome,
      totalTaxWithheld: totals.totalTaxWithheld,
      totalSocialSecurityContributions: totals.totalSocialSecurityContributions,
      records: fmyRecords,
      generatedAt: new Date(),
      xmlContent,
      checksum
    };

    return fmyFile;
  }

  /**
   * Merge multiple FMY files utility
   */
  async mergeFMYFiles(files: FMYFile[]): Promise<{ mergedFile: FMYFile; utility: FMYMergeUtility }> {
    const mergedFileId = nanoid();
    let allRecords: FMYRecord[] = [];
    let duplicatesRemoved = 0;

    // Combine all records and remove duplicates
    const seenEmployees = new Set<string>();
    
    files.forEach(file => {
      file.records.forEach(record => {
        const employeeKey = `${record.afm}_${record.amka}`;
        if (seenEmployees.has(employeeKey)) {
          duplicatesRemoved++;
        } else {
          seenEmployees.add(employeeKey);
          allRecords.push(record);
        }
      });
    });

    // Sort records by AFM for consistent ordering
    allRecords.sort((a, b) => a.afm.localeCompare(b.afm));

    // Calculate merged totals
    const totals = this.calculateFMYTotals(allRecords);
    
    // Generate merged XML
    const xmlContent = this.generateFMYXML({
      fileId: mergedFileId,
      period: files[0].period, // Use period from first file
      companyAFM: this.companyAFM,
      companyName: this.companyName,
      records: allRecords,
      ...totals
    });

    const checksum = createHash('sha256').update(xmlContent).digest('hex');

    const mergedFile: FMYFile = {
      fileId: mergedFileId,
      period: files[0].period,
      companyAFM: this.companyAFM,
      companyName: this.companyName,
      totalRecords: allRecords.length,
      totalGrossIncome: totals.totalGrossIncome,
      totalTaxWithheld: totals.totalTaxWithheld,
      totalSocialSecurityContributions: totals.totalSocialSecurityContributions,
      records: allRecords,
      generatedAt: new Date(),
      xmlContent,
      checksum
    };

    const utility: FMYMergeUtility = {
      originalFiles: files.map(f => f.fileId),
      mergedFileId,
      totalRecords: allRecords.length,
      mergedAt: new Date(),
      duplicatesRemoved
    };

    return { mergedFile, utility };
  }

  /**
   * Validate FMY file before submission
   */
  validateFMYFile(fmyFile: FMYFile): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate company information
    if (!this.isValidAFM(fmyFile.companyAFM)) {
      errors.push('Invalid company AFM');
    }

    // Validate each employee record
    fmyFile.records.forEach((record, index) => {
      if (!this.isValidAFM(record.afm)) {
        errors.push(`Invalid AFM for record ${index + 1}: ${record.afm}`);
      }

      if (!this.isValidAMKA(record.amka)) {
        errors.push(`Invalid AMKA for record ${index + 1}: ${record.amka}`);
      }

      if (record.grossIncome < 0) {
        errors.push(`Invalid gross income for record ${index + 1}: ${record.grossIncome}`);
      }

      if (record.taxWithheld < 0) {
        errors.push(`Invalid tax withheld for record ${index + 1}: ${record.taxWithheld}`);
      }

      // Validate tax calculation
      const expectedTax = this.calculateIncomeTax(record.taxableIncome);
      if (Math.abs(record.taxWithheld - expectedTax.totalTax) > 0.01) {
        errors.push(`Tax calculation mismatch for record ${index + 1}`);
      }

      // Validate net income calculation
      const expectedNet = record.grossIncome - record.taxWithheld - record.socialSecurityContributions;
      if (Math.abs(record.netIncome - expectedNet) > 0.01) {
        errors.push(`Net income calculation mismatch for record ${index + 1}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Submit FMY file to AADE (mock implementation)
   */
  async submitToAADE(fmyFile: FMYFile): Promise<AADESubmissionReceipt> {
    const submissionId = nanoid();
    
    // Validate file before submission
    const validation = this.validateFMYFile(fmyFile);
    if (!validation.isValid) {
      throw new Error(`FMY validation failed: ${validation.errors.join(', ')}`);
    }

    // Mock AADE submission
    const receipt: AADESubmissionReceipt = {
      submissionId,
      fmyFileId: fmyFile.fileId,
      submittedAt: new Date(),
      aadeReceiptNumber: `AADE${Date.now()}`,
      status: 'submitted',
      receiptXml: this.generateAADEReceiptXML(submissionId, fmyFile)
    };

    console.log(`FMY file ${fmyFile.fileId} submitted to AADE with receipt ${receipt.aadeReceiptNumber}`);

    return receipt;
  }

  /**
   * Transform payroll data to FMY record format
   */
  private transformToFMYRecord(employeePayroll: any, period: string): FMYRecord {
    const grossIncome = employeePayroll.grossEarnings;
    
    // Calculate taxable income (gross minus social security contributions)
    const socialSecurityContributions = this.calculateSocialSecurityContributions(grossIncome);
    const taxableIncome = grossIncome - socialSecurityContributions;
    
    // Calculate income tax and solidarity tax
    const taxCalculation = this.calculateIncomeTax(taxableIncome);
    const taxWithheld = taxCalculation.totalTax;
    
    // Calculate net income
    const netIncome = grossIncome - taxWithheld - socialSecurityContributions;
    
    return {
      afm: employeePayroll.afm,
      amka: employeePayroll.amka,
      employeeName: `${employeePayroll.firstName} ${employeePayroll.lastName}`,
      grossIncome,
      taxableIncome,
      taxWithheld,
      socialSecurityContributions,
      netIncome,
      paymentDate: this.getPaymentDate(period),
      incomeCategory: INCOME_CATEGORIES['SALARY_WAGES']
    };
  }

  /**
   * Calculate Greek income tax with progressive brackets
   */
  private calculateIncomeTax(taxableIncome: number): { incomeTax: number; solidarityTax: number; totalTax: number } {
    let incomeTax = 0;
    let solidarityTax = 0;
    
    // Calculate progressive income tax
    for (const bracket of TAX_BRACKETS) {
      if (taxableIncome > bracket.min) {
        const taxableInBracket = Math.min(taxableIncome - bracket.min, bracket.max - bracket.min);
        incomeTax += taxableInBracket * bracket.rate;
      }
    }
    
    // Calculate solidarity tax
    for (const bracket of SOLIDARITY_TAX_BRACKETS) {
      if (taxableIncome > bracket.min) {
        const taxableInBracket = Math.min(taxableIncome - bracket.min, bracket.max - bracket.min);
        solidarityTax += taxableInBracket * bracket.rate;
      }
    }
    
    return {
      incomeTax,
      solidarityTax,
      totalTax: incomeTax + solidarityTax
    };
  }

  /**
   * Calculate social security contributions for tax purposes
   */
  private calculateSocialSecurityContributions(grossIncome: number): number {
    // Employee social security rates (approximate)
    const mainInsuranceRate = 0.0667;  // 6.67%
    const auxiliaryRate = 0.03;        // 3%
    const unemploymentRate = 0.0052;   // 0.52%
    
    const totalRate = mainInsuranceRate + auxiliaryRate + unemploymentRate;
    return grossIncome * totalRate;
  }

  /**
   * Calculate FMY file totals
   */
  private calculateFMYTotals(records: FMYRecord[]) {
    return {
      totalGrossIncome: records.reduce((sum, r) => sum + r.grossIncome, 0),
      totalTaxWithheld: records.reduce((sum, r) => sum + r.taxWithheld, 0),
      totalSocialSecurityContributions: records.reduce((sum, r) => sum + r.socialSecurityContributions, 0)
    };
  }

  /**
   * Generate FMY XML file content
   */
  private generateFMYXML(data: any): string {
    const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>`;
    
    return `${xmlHeader}
<FMY_File xmlns="http://www.aade.gr/FMY">
  <Header>
    <FileId>${data.fileId}</FileId>
    <Period>${data.period}</Period>
    <CompanyAFM>${data.companyAFM}</CompanyAFM>
    <CompanyName><![CDATA[${data.companyName}]]></CompanyName>
    <TotalRecords>${data.records.length}</TotalRecords>
    <TotalGrossIncome>${data.totalGrossIncome.toFixed(2)}</TotalGrossIncome>
    <TotalTaxWithheld>${data.totalTaxWithheld.toFixed(2)}</TotalTaxWithheld>
    <TotalSocialSecurityContributions>${data.totalSocialSecurityContributions.toFixed(2)}</TotalSocialSecurityContributions>
    <GeneratedAt>${new Date().toISOString()}</GeneratedAt>
  </Header>
  <Records>
${data.records.map((record: FMYRecord, index: number) => `    <Record>
      <SequenceNumber>${index + 1}</SequenceNumber>
      <EmployeeAFM>${record.afm}</EmployeeAFM>
      <EmployeeAMKA>${record.amka}</EmployeeAMKA>
      <EmployeeName><![CDATA[${record.employeeName}]]></EmployeeName>
      <GrossIncome>${record.grossIncome.toFixed(2)}</GrossIncome>
      <TaxableIncome>${record.taxableIncome.toFixed(2)}</TaxableIncome>
      <TaxWithheld>${record.taxWithheld.toFixed(2)}</TaxWithheld>
      <SocialSecurityContributions>${record.socialSecurityContributions.toFixed(2)}</SocialSecurityContributions>
      <NetIncome>${record.netIncome.toFixed(2)}</NetIncome>
      <PaymentDate>${record.paymentDate}</PaymentDate>
      <IncomeCategory>${record.incomeCategory}</IncomeCategory>
    </Record>`).join('\n')}
  </Records>
</FMY_File>`;
  }

  /**
   * Generate AADE submission receipt XML
   */
  private generateAADEReceiptXML(submissionId: string, fmyFile: FMYFile): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<AADE_Receipt>
  <SubmissionId>${submissionId}</SubmissionId>
  <ReceiptNumber>AADE${Date.now()}</ReceiptNumber>
  <OriginalFileId>${fmyFile.fileId}</OriginalFileId>
  <Status>ACCEPTED</Status>
  <ReceivedAt>${new Date().toISOString()}</ReceivedAt>
  <ProcessingOffice>AADE Athens</ProcessingOffice>
  <RecordCount>${fmyFile.totalRecords}</RecordCount>
  <TotalTaxWithheld>${fmyFile.totalTaxWithheld.toFixed(2)}</TotalTaxWithheld>
</AADE_Receipt>`;
  }

  // Helper functions
  private isValidAFM(afm: string): boolean {
    return /^\d{9}$/.test(afm) && afm !== '000000000';
  }

  private isValidAMKA(amka: string): boolean {
    return /^\d{11}$/.test(amka) && amka !== '00000000000';
  }

  private getPaymentDate(period: string): string {
    // Assume salary is paid on last day of month
    const [year, month] = period.split('-');
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    return `${year}-${month}-${lastDay.toString().padStart(2, '0')}`;
  }
}

export const fmyGenerator = new FMYGenerator();