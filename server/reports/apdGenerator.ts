import { nanoid } from "nanoid";
import { createHash } from "crypto";

/**
 * APD (ΑΠΔ) Generator for e-EFKA Social Security Filing
 * Generates monthly social security contribution declarations
 */

export interface APDRecord {
  afm: string;
  amka: string;
  employeeName: string;
  employmentType: string;
  branchCode: string;
  specialtyCode: string;
  workingDays: number;
  grossEarnings: number;
  contributableEarnings: number;
  mainInsuranceContribution: number;
  auxiliaryInsuranceContribution: number;
  unemploymentContribution: number;
  totalEmployeeContributions: number;
  totalEmployerContributions: number;
  startDate?: string;
  endDate?: string;
  specialCategoryCode?: string;
}

export interface APDFile {
  fileId: string;
  period: string;
  companyAFM: string;
  companyName: string;
  totalRecords: number;
  totalGrossEarnings: number;
  totalEmployeeContributions: number;
  totalEmployerContributions: number;
  records: APDRecord[];
  generatedAt: Date;
  xmlContent: string;
  checksum: string;
}

export interface APDSubmissionReceipt {
  submissionId: string;
  apdFileId: string;
  submittedAt: Date;
  efkaReceiptNumber: string;
  status: 'submitted' | 'accepted' | 'rejected';
  rejectionReasons?: string[];
  receiptXml?: string;
}

// EFKA branch codes for different industries
const EFKA_BRANCH_CODES = {
  'HOTEL_ACCOMMODATION': '601', // Hospitality industry
  'RESTAURANT_SERVICES': '602', // Food service
  'RETAIL_TRADE': '471',
  'OFFICE_ADMINISTRATIVE': '821',
  'CLEANING_SERVICES': '812'
};

// EFKA specialty codes for job roles
const EFKA_SPECIALTY_CODES = {
  'HOTEL_MANAGER': '001',
  'RECEPTIONIST': '002', 
  'HOUSEKEEPER': '003',
  'CHEF': '004',
  'WAITER': '005',
  'BARTENDER': '006',
  'MAINTENANCE': '007',
  'SECURITY': '008',
  'GENERAL_WORKER': '999'
};

class APDGenerator {
  private readonly companyAFM: string;
  private readonly companyName: string;

  constructor() {
    this.companyAFM = process.env.COMPANY_AFM || '123456789';
    this.companyName = process.env.COMPANY_NAME || 'PayrollSync Demo Company';
  }

  /**
   * Generate monthly APD file for e-EFKA submission
   */
  async generateMonthlyAPD(
    period: string, // Format: YYYY-MM
    payrollData: any[]
  ): Promise<APDFile> {
    const fileId = nanoid();
    const [year, month] = period.split('-');
    
    // Transform payroll data to APD records
    const apdRecords: APDRecord[] = payrollData.map(employee => {
      return this.transformToAPDRecord(employee, period);
    });

    // Calculate totals
    const totals = this.calculateAPDTotals(apdRecords);
    
    // Generate XML content
    const xmlContent = this.generateAPDXML({
      fileId,
      period,
      companyAFM: this.companyAFM,
      companyName: this.companyName,
      records: apdRecords,
      ...totals
    });

    // Generate checksum for integrity verification
    const checksum = createHash('sha256').update(xmlContent).digest('hex');

    const apdFile: APDFile = {
      fileId,
      period,
      companyAFM: this.companyAFM,
      companyName: this.companyName,
      totalRecords: apdRecords.length,
      totalGrossEarnings: totals.totalGrossEarnings,
      totalEmployeeContributions: totals.totalEmployeeContributions,
      totalEmployerContributions: totals.totalEmployerContributions,
      records: apdRecords,
      generatedAt: new Date(),
      xmlContent,
      checksum
    };

    return apdFile;
  }

  /**
   * Validate APD file before submission
   */
  validateAPDFile(apdFile: APDFile): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate company information
    if (!this.isValidAFM(apdFile.companyAFM)) {
      errors.push('Invalid company AFM');
    }

    // Validate each employee record
    apdFile.records.forEach((record, index) => {
      if (!this.isValidAFM(record.afm)) {
        errors.push(`Invalid AFM for record ${index + 1}: ${record.afm}`);
      }

      if (!this.isValidAMKA(record.amka)) {
        errors.push(`Invalid AMKA for record ${index + 1}: ${record.amka}`);
      }

      if (record.workingDays < 0 || record.workingDays > 31) {
        errors.push(`Invalid working days for record ${index + 1}: ${record.workingDays}`);
      }

      if (record.grossEarnings < 0) {
        errors.push(`Invalid gross earnings for record ${index + 1}: ${record.grossEarnings}`);
      }

      // Validate contribution calculations
      const expectedEmployeeContrib = this.calculateEmployeeContributions(record.contributableEarnings);
      if (Math.abs(record.totalEmployeeContributions - expectedEmployeeContrib) > 0.01) {
        errors.push(`Employee contribution mismatch for record ${index + 1}`);
      }
    });

    // Validate totals
    const calculatedTotals = this.calculateAPDTotals(apdFile.records);
    if (Math.abs(apdFile.totalGrossEarnings - calculatedTotals.totalGrossEarnings) > 0.01) {
      errors.push('Total gross earnings mismatch');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Submit APD file to e-EFKA (mock implementation)
   */
  async submitToEFKA(apdFile: APDFile): Promise<APDSubmissionReceipt> {
    const submissionId = nanoid();
    
    // Validate file before submission
    const validation = this.validateAPDFile(apdFile);
    if (!validation.isValid) {
      throw new Error(`APD validation failed: ${validation.errors.join(', ')}`);
    }

    // Mock e-EFKA submission (in production, this would use actual API)
    const receipt: APDSubmissionReceipt = {
      submissionId,
      apdFileId: apdFile.fileId,
      submittedAt: new Date(),
      efkaReceiptNumber: `EFKA${Date.now()}`,
      status: 'submitted',
      receiptXml: this.generateReceiptXML(submissionId, apdFile)
    };

    // Log submission for audit trail
    console.log(`APD file ${apdFile.fileId} submitted to e-EFKA with receipt ${receipt.efkaReceiptNumber}`);

    return receipt;
  }

  /**
   * Transform payroll data to APD record format
   */
  private transformToAPDRecord(employeePayroll: any, period: string): APDRecord {
    // Calculate working days from timesheet data
    const workingDays = this.calculateWorkingDays(employeePayroll.timesheets);
    
    // Get industry-specific codes
    const branchCode = EFKA_BRANCH_CODES['HOTEL_ACCOMMODATION'];
    const specialtyCode = EFKA_SPECIALTY_CODES[employeePayroll.jobRole] || EFKA_SPECIALTY_CODES['GENERAL_WORKER'];
    
    // Calculate contributable earnings (subject to caps and exclusions)
    const contributableEarnings = this.calculateContributableEarnings(employeePayroll.grossEarnings);
    
    return {
      afm: employeePayroll.afm,
      amka: employeePayroll.amka,
      employeeName: `${employeePayroll.firstName} ${employeePayroll.lastName}`,
      employmentType: employeePayroll.employmentType,
      branchCode,
      specialtyCode,
      workingDays,
      grossEarnings: employeePayroll.grossEarnings,
      contributableEarnings,
      mainInsuranceContribution: this.calculateMainInsurance(contributableEarnings),
      auxiliaryInsuranceContribution: this.calculateAuxiliaryInsurance(contributableEarnings),
      unemploymentContribution: this.calculateUnemploymentContribution(contributableEarnings),
      totalEmployeeContributions: this.calculateEmployeeContributions(contributableEarnings),
      totalEmployerContributions: this.calculateEmployerContributions(contributableEarnings)
    };
  }

  /**
   * Calculate APD file totals
   */
  private calculateAPDTotals(records: APDRecord[]) {
    return {
      totalGrossEarnings: records.reduce((sum, r) => sum + r.grossEarnings, 0),
      totalEmployeeContributions: records.reduce((sum, r) => sum + r.totalEmployeeContributions, 0),
      totalEmployerContributions: records.reduce((sum, r) => sum + r.totalEmployerContributions, 0)
    };
  }

  /**
   * Generate APD XML file content
   */
  private generateAPDXML(data: any): string {
    const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>`;
    
    return `${xmlHeader}
<APD_File xmlns="http://www.efka.gov.gr/APD">
  <Header>
    <FileId>${data.fileId}</FileId>
    <Period>${data.period}</Period>
    <CompanyAFM>${data.companyAFM}</CompanyAFM>
    <CompanyName><![CDATA[${data.companyName}]]></CompanyName>
    <TotalRecords>${data.records.length}</TotalRecords>
    <TotalGrossEarnings>${data.totalGrossEarnings.toFixed(2)}</TotalGrossEarnings>
    <TotalEmployeeContributions>${data.totalEmployeeContributions.toFixed(2)}</TotalEmployeeContributions>
    <TotalEmployerContributions>${data.totalEmployerContributions.toFixed(2)}</TotalEmployerContributions>
    <GeneratedAt>${new Date().toISOString()}</GeneratedAt>
  </Header>
  <Records>
${data.records.map((record: APDRecord, index: number) => `    <Record>
      <SequenceNumber>${index + 1}</SequenceNumber>
      <EmployeeAFM>${record.afm}</EmployeeAFM>
      <EmployeeAMKA>${record.amka}</EmployeeAMKA>
      <EmployeeName><![CDATA[${record.employeeName}]]></EmployeeName>
      <EmploymentType>${record.employmentType}</EmploymentType>
      <BranchCode>${record.branchCode}</BranchCode>
      <SpecialtyCode>${record.specialtyCode}</SpecialtyCode>
      <WorkingDays>${record.workingDays}</WorkingDays>
      <GrossEarnings>${record.grossEarnings.toFixed(2)}</GrossEarnings>
      <ContributableEarnings>${record.contributableEarnings.toFixed(2)}</ContributableEarnings>
      <MainInsuranceContribution>${record.mainInsuranceContribution.toFixed(2)}</MainInsuranceContribution>
      <AuxiliaryInsuranceContribution>${record.auxiliaryInsuranceContribution.toFixed(2)}</AuxiliaryInsuranceContribution>
      <UnemploymentContribution>${record.unemploymentContribution.toFixed(2)}</UnemploymentContribution>
      <TotalEmployeeContributions>${record.totalEmployeeContributions.toFixed(2)}</TotalEmployeeContributions>
      <TotalEmployerContributions>${record.totalEmployerContributions.toFixed(2)}</TotalEmployerContributions>
    </Record>`).join('\n')}
  </Records>
</APD_File>`;
  }

  /**
   * Generate e-EFKA submission receipt XML
   */
  private generateReceiptXML(submissionId: string, apdFile: APDFile): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<EFKA_Receipt>
  <SubmissionId>${submissionId}</SubmissionId>
  <ReceiptNumber>EFKA${Date.now()}</ReceiptNumber>
  <OriginalFileId>${apdFile.fileId}</OriginalFileId>
  <Status>ACCEPTED</Status>
  <ReceivedAt>${new Date().toISOString()}</ReceivedAt>
  <ProcessingOffice>EFKA Athens Central</ProcessingOffice>
  <RecordCount>${apdFile.totalRecords}</RecordCount>
  <TotalContributions>${(apdFile.totalEmployeeContributions + apdFile.totalEmployerContributions).toFixed(2)}</TotalContributions>
</EFKA_Receipt>`;
  }

  // Greek validation functions
  private isValidAFM(afm: string): boolean {
    return /^\d{9}$/.test(afm) && afm !== '000000000';
  }

  private isValidAMKA(amka: string): boolean {
    return /^\d{11}$/.test(amka) && amka !== '00000000000';
  }

  // Contribution calculation functions (Greek rates for 2025)
  private calculateWorkingDays(timesheets: any[]): number {
    // Calculate from timesheet data - simplified for demo
    return 22; // Average working days per month
  }

  private calculateContributableEarnings(grossEarnings: number): number {
    // Apply EFKA contribution caps and exclusions
    const maxContributableDaily = 205.20; // 2025 daily cap
    const maxMonthly = maxContributableDaily * 30;
    return Math.min(grossEarnings, maxMonthly);
  }

  private calculateMainInsurance(contributableEarnings: number): number {
    return contributableEarnings * 0.0667; // 6.67% employee rate
  }

  private calculateAuxiliaryInsurance(contributableEarnings: number): number {
    return contributableEarnings * 0.03; // 3% employee rate
  }

  private calculateUnemploymentContribution(contributableEarnings: number): number {
    return contributableEarnings * 0.0052; // 0.52% employee rate
  }

  private calculateEmployeeContributions(contributableEarnings: number): number {
    return this.calculateMainInsurance(contributableEarnings) +
           this.calculateAuxiliaryInsurance(contributableEarnings) +
           this.calculateUnemploymentContribution(contributableEarnings);
  }

  private calculateEmployerContributions(contributableEarnings: number): number {
    // Employer rates: 22.29% main + 3% auxiliary + 1.02% unemployment
    return contributableEarnings * 0.2631;
  }
}

export const apdGenerator = new APDGenerator();