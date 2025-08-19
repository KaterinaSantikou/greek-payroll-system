import { 
  glExports, 
  journalEntries, 
  payrollCalculations,
  employees,
  properties,
  GlExport, 
  JournalEntry 
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { format } from "date-fns";

/**
 * General Ledger Export Service for Greek Payroll
 * Supports SoftOne, Epsilon, SAP, Navision, and custom formats
 * Generates journal entries per entity/property with complete GL mapping
 */

export interface GLExportRequest {
  payrollPeriodId: string;
  propertyId?: string; // Optional filter by property
  exportType: 'journal' | 'summary' | 'detailed';
  format: 'csv' | 'xml' | 'json' | 'excel';
  erpSystem: 'SoftOne' | 'Epsilon' | 'SAP' | 'Navision' | 'Custom';
}

export interface AccountMapping {
  sourceType: string;
  accountCode: string;
  accountName: string;
  isDebit: boolean;
}

export interface GLExportResult {
  exportId: string;
  fileName: string;
  filePath: string;
  content: string;
  totalDebits: number;
  totalCredits: number;
  totalEntries: number;
}

export class GLExportService {

  /**
   * Generate GL export for a payroll period
   */
  async generateGLExport(request: GLExportRequest): Promise<GLExportResult> {
    // Get payroll calculations for the period
    const calculations = await this.getPayrollCalculations(
      request.payrollPeriodId, 
      request.propertyId
    );

    if (calculations.length === 0) {
      throw new Error("No payroll calculations found for the specified period");
    }

    // Generate journal entries
    const journalEntriesData = await this.generateJournalEntries(calculations, request.erpSystem);
    
    // Create GL export record
    const glExport = await this.createGLExportRecord(request, journalEntriesData);
    
    // Generate export file content
    const content = await this.generateExportContent(
      journalEntriesData, 
      request.format, 
      request.erpSystem
    );

    // Save journal entries to database
    await this.saveJournalEntries(glExport.exportId, journalEntriesData);

    return {
      exportId: glExport.exportId,
      fileName: glExport.fileName,
      filePath: glExport.filePath,
      content,
      totalDebits: parseFloat(glExport.totalDebits),
      totalCredits: parseFloat(glExport.totalCredits),
      totalEntries: glExport.totalEntries,
    };
  }

  /**
   * Get payroll calculations with employee and property details
   */
  private async getPayrollCalculations(payrollPeriodId: string, propertyId?: string) {
    let whereConditions = [eq(payrollCalculations.periodId, payrollPeriodId)];
    
    if (propertyId) {
      whereConditions.push(eq(employees.defaultPropertyId, propertyId));
    }

    return await db
      .select({
        calculation: payrollCalculations,
        employee: employees,
        property: properties,
      })
      .from(payrollCalculations)
      .innerJoin(employees, eq(payrollCalculations.employeeId, employees.employeeId))
      .leftJoin(properties, eq(employees.defaultPropertyId, properties.propertyId))
      .where(and(...whereConditions));
  }

  /**
   * Generate journal entries from payroll calculations
   */
  private async generateJournalEntries(
    calculations: any[], 
    erpSystem: string
  ): Promise<Omit<JournalEntry, 'entryId' | 'createdAt'>[]> {
    const entries: Omit<JournalEntry, 'entryId' | 'createdAt'>[] = [];
    const accountMappings = this.getAccountMappings(erpSystem);
    let lineNumber = 1;

    for (const calc of calculations) {
      const calculation = calc.calculation;
      const employee = calc.employee;
      const property = calc.property;

      // Salary Expense (Debit)
      const grossPay = parseFloat(calculation.grossPay);
      if (grossPay > 0) {
        entries.push({
          glExportId: '', // Will be set later
          payrollPeriodId: calculation.periodId,
          lineNumber: lineNumber++,
          accountCode: this.getAccountCode(accountMappings, 'salary_expense'),
          accountName: 'Salary Expense',
          debitAmount: grossPay.toFixed(2),
          creditAmount: '0.00',
          description: `Salary - ${employee.firstName} ${employee.lastName}`,
          reference: employee.employeeNumber || '',
          propertyId: property?.propertyId || null,
          costCenter: property?.costCenterCode || null,
          department: null,
          project: null,
          sourceType: 'salary',
          sourceEmployeeId: employee.employeeId,
        });
      }

      // Income Tax Payable (Credit)
      const incomeTax = parseFloat(calculation.incomeTax);
      if (incomeTax > 0) {
        entries.push({
          glExportId: '',
          payrollPeriodId: calculation.periodId,
          lineNumber: lineNumber++,
          accountCode: this.getAccountCode(accountMappings, 'income_tax_payable'),
          accountName: 'Income Tax Payable',
          debitAmount: '0.00',
          creditAmount: incomeTax.toFixed(2),
          description: `Income Tax - ${employee.firstName} ${employee.lastName}`,
          reference: employee.employeeNumber || "",
          propertyId: property?.propertyId || null,
          costCenter: property?.costCenterCode || null,
          department: null,
          project: null,
          sourceType: 'tax',
          sourceEmployeeId: employee.employeeId,
        });
      }

      // EFKA Employee Contributions Payable (Credit)
      const employeeEfkaMain = parseFloat(calculation.employeeEfkaMain);
      const employeeEfkaAux = parseFloat(calculation.employeeEfkaAux);
      const employeeUnemployment = parseFloat(calculation.employeeUnemployment);
      const totalEmployeeEfka = employeeEfkaMain + employeeEfkaAux + employeeUnemployment;
      
      if (totalEmployeeEfka > 0) {
        entries.push({
          glExportId: '',
          payrollPeriodId: calculation.periodId,
          lineNumber: lineNumber++,
          accountCode: this.getAccountCode(accountMappings, 'efka_employee_payable'),
          accountName: 'EFKA Employee Contributions Payable',
          debitAmount: '0.00',
          creditAmount: totalEmployeeEfka.toFixed(2),
          description: `EFKA Employee - ${employee.firstName} ${employee.lastName}`,
          reference: employee.employeeNumber || "",
          propertyId: property?.propertyId || null,
          costCenter: property?.costCenterCode || null,
          department: null,
          project: null,
          sourceType: 'insurance',
          sourceEmployeeId: employee.employeeId,
        });
      }

      // EFKA Employer Contributions (Debit)
      const employerEfkaMain = parseFloat(calculation.employerEfkaMain);
      const employerEfkaAux = parseFloat(calculation.employerEfkaAux);
      const employerUnemployment = parseFloat(calculation.employerUnemployment);
      const totalEmployerEfka = employerEfkaMain + employerEfkaAux + employerUnemployment;
      
      if (totalEmployerEfka > 0) {
        entries.push({
          glExportId: '',
          payrollPeriodId: calculation.periodId,
          lineNumber: lineNumber++,
          accountCode: this.getAccountCode(accountMappings, 'efka_employer_expense'),
          accountName: 'EFKA Employer Contributions',
          debitAmount: totalEmployerEfka.toFixed(2),
          creditAmount: '0.00',
          description: `EFKA Employer - ${employee.firstName} ${employee.lastName}`,
          reference: employee.employeeNumber || "",
          propertyId: property?.propertyId || null,
          costCenter: property?.costCenterCode || null,
          department: null,
          project: null,
          sourceType: 'insurance',
          sourceEmployeeId: employee.employeeId,
        });

        // EFKA Employer Contributions Payable (Credit)
        entries.push({
          glExportId: '',
          payrollPeriodId: calculation.periodId,
          lineNumber: lineNumber++,
          accountCode: this.getAccountCode(accountMappings, 'efka_employer_payable'),
          accountName: 'EFKA Employer Contributions Payable',
          debitAmount: '0.00',
          creditAmount: totalEmployerEfka.toFixed(2),
          description: `EFKA Employer Payable - ${employee.firstName} ${employee.lastName}`,
          reference: employee.employeeNumber || "",
          propertyId: property?.propertyId || null,
          costCenter: property?.costCenterCode || null,
          department: null,
          project: null,
          sourceType: 'insurance',
          sourceEmployeeId: employee.employeeId,
        });
      }

      // Net Pay Payable (Credit)
      const netPay = parseFloat(calculation.netPay);
      if (netPay > 0) {
        entries.push({
          glExportId: '',
          payrollPeriodId: calculation.periodId,
          lineNumber: lineNumber++,
          accountCode: this.getAccountCode(accountMappings, 'salary_payable'),
          accountName: 'Salary Payable',
          debitAmount: '0.00',
          creditAmount: netPay.toFixed(2),
          description: `Net Pay - ${employee.firstName} ${employee.lastName}`,
          reference: employee.employeeNumber || "",
          propertyId: property?.propertyId || null,
          costCenter: property?.costCenterCode || null,
          department: null,
          project: null,
          sourceType: 'salary',
          sourceEmployeeId: employee.employeeId,
        });
      }

      // Benefits in Kind
      const mealVouchers = parseFloat(calculation.mealVouchers);
      const companyCarBenefit = parseFloat(calculation.companyCarBenefit);
      const totalBenefits = mealVouchers + companyCarBenefit;
      
      if (totalBenefits > 0) {
        entries.push({
          glExportId: '',
          payrollPeriodId: calculation.periodId,
          lineNumber: lineNumber++,
          accountCode: this.getAccountCode(accountMappings, 'benefits_expense'),
          accountName: 'Employee Benefits Expense',
          debitAmount: totalBenefits.toFixed(2),
          creditAmount: '0.00',
          description: `Benefits - ${employee.firstName} ${employee.lastName}`,
          reference: employee.employeeNumber || "",
          propertyId: property?.propertyId || null,
          costCenter: property?.costCenterCode || null,
          department: null,
          project: null,
          sourceType: 'benefits',
          sourceEmployeeId: employee.employeeId,
        });

        entries.push({
          glExportId: '',
          payrollPeriodId: calculation.periodId,
          lineNumber: lineNumber++,
          accountCode: this.getAccountCode(accountMappings, 'benefits_payable'),
          accountName: 'Employee Benefits Payable',
          debitAmount: '0.00',
          creditAmount: totalBenefits.toFixed(2),
          description: `Benefits Payable - ${employee.firstName} ${employee.lastName}`,
          reference: employee.employeeNumber || "",
          propertyId: property?.propertyId || null,
          costCenter: property?.costCenterCode || null,
          department: null,
          project: null,
          sourceType: 'benefits',
          sourceEmployeeId: employee.employeeId,
        });
      }
    }

    return entries;
  }

  /**
   * Create GL export record in database
   */
  private async createGLExportRecord(
    request: GLExportRequest,
    journalEntries: Omit<JournalEntry, 'entryId' | 'createdAt'>[]
  ): Promise<GlExport> {
    const totalDebits = journalEntries.reduce((sum, entry) => sum + parseFloat(entry.debitAmount), 0);
    const totalCredits = journalEntries.reduce((sum, entry) => sum + parseFloat(entry.creditAmount), 0);
    
    const fileName = this.generateFileName(request);
    const filePath = `/gl_exports/${fileName}`;

    const [glExport] = await db
      .insert(glExports)
      .values({
        payrollPeriodId: request.payrollPeriodId,
        propertyId: request.propertyId || null,
        exportType: request.exportType,
        format: request.format,
        erpSystem: request.erpSystem,
        fileName,
        filePath,
        fileSize: 0, // Will be updated after content generation
        totalDebits: totalDebits.toFixed(2),
        totalCredits: totalCredits.toFixed(2),
        totalEntries: journalEntries.length,
        accountMappings: this.getAccountMappings(request.erpSystem),
        costCenterMappings: {},
        departmentMappings: {},
        status: 'generated',
      })
      .returning();

    return glExport;
  }

  /**
   * Save journal entries to database
   */
  private async saveJournalEntries(
    glExportId: string,
    entries: Omit<JournalEntry, 'entryId' | 'createdAt'>[]
  ): Promise<void> {
    const entriesWithExportId = entries.map(entry => ({
      ...entry,
      glExportId,
    }));

    await db.insert(journalEntries).values(entriesWithExportId);
  }

  /**
   * Generate export file content based on format
   */
  private async generateExportContent(
    entries: Omit<JournalEntry, 'entryId' | 'createdAt'>[],
    format: string,
    erpSystem: string
  ): Promise<string> {
    switch (format) {
      case 'csv':
        return this.generateCSVContent(entries);
      case 'xml':
        return this.generateXMLContent(entries, erpSystem);
      case 'json':
        return this.generateJSONContent(entries);
      case 'excel':
        return this.generateExcelContent(entries);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Generate CSV format content
   */
  private generateCSVContent(entries: Omit<JournalEntry, 'entryId' | 'createdAt'>[]): string {
    const headers = [
      'LineNumber',
      'AccountCode',
      'AccountName',
      'DebitAmount',
      'CreditAmount',
      'Description',
      'Reference',
      'PropertyId',
      'CostCenter',
      'Department',
      'SourceType',
      'SourceEmployeeId'
    ];

    const csvRows = [
      headers.join(','),
      ...entries.map(entry => [
        entry.lineNumber,
        entry.accountCode,
        `"${entry.accountName}"`,
        entry.debitAmount,
        entry.creditAmount,
        `"${entry.description}"`,
        entry.reference || '',
        entry.propertyId || '',
        entry.costCenter || '',
        entry.department || '',
        entry.sourceType,
        entry.sourceEmployeeId || ''
      ].join(','))
    ];

    return csvRows.join('\n');
  }

  /**
   * Generate XML format content
   */
  private generateXMLContent(
    entries: Omit<JournalEntry, 'entryId' | 'createdAt'>[],
    erpSystem: string
  ): string {
    const totalDebits = entries.reduce((sum, entry) => sum + parseFloat(entry.debitAmount), 0);
    const totalCredits = entries.reduce((sum, entry) => sum + parseFloat(entry.creditAmount), 0);
    const currentDate = format(new Date(), 'yyyy-MM-dd');

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<GLExport>
  <Header>
    <SystemName>PayrollSync</SystemName>
    <ERPSystem>${erpSystem}</ERPSystem>
    <ExportDate>${currentDate}</ExportDate>
    <TotalDebits>${totalDebits.toFixed(2)}</TotalDebits>
    <TotalCredits>${totalCredits.toFixed(2)}</TotalCredits>
    <TotalEntries>${entries.length}</TotalEntries>
  </Header>
  <JournalEntries>`;

    entries.forEach(entry => {
      xml += `
    <JournalEntry>
      <LineNumber>${entry.lineNumber}</LineNumber>
      <AccountCode>${entry.accountCode}</AccountCode>
      <AccountName><![CDATA[${entry.accountName}]]></AccountName>
      <DebitAmount>${entry.debitAmount}</DebitAmount>
      <CreditAmount>${entry.creditAmount}</CreditAmount>
      <Description><![CDATA[${entry.description}]]></Description>
      <Reference>${entry.reference || ''}</Reference>
      <PropertyId>${entry.propertyId || ''}</PropertyId>
      <CostCenter>${entry.costCenter || ''}</CostCenter>
      <Department>${entry.department || ''}</Department>
      <SourceType>${entry.sourceType}</SourceType>
      <SourceEmployeeId>${entry.sourceEmployeeId || ''}</SourceEmployeeId>
    </JournalEntry>`;
    });

    xml += `
  </JournalEntries>
</GLExport>`;

    return xml;
  }

  /**
   * Generate JSON format content
   */
  private generateJSONContent(entries: Omit<JournalEntry, 'entryId' | 'createdAt'>[]): string {
    const totalDebits = entries.reduce((sum, entry) => sum + parseFloat(entry.debitAmount), 0);
    const totalCredits = entries.reduce((sum, entry) => sum + parseFloat(entry.creditAmount), 0);

    return JSON.stringify({
      header: {
        systemName: 'PayrollSync',
        exportDate: format(new Date(), 'yyyy-MM-dd'),
        totalDebits: totalDebits.toFixed(2),
        totalCredits: totalCredits.toFixed(2),
        totalEntries: entries.length,
      },
      journalEntries: entries,
    }, null, 2);
  }

  /**
   * Generate Excel content (simplified CSV format for now)
   */
  private generateExcelContent(entries: Omit<JournalEntry, 'entryId' | 'createdAt'>[]): string {
    // For now, return CSV format. In production, you'd use a proper Excel library
    return this.generateCSVContent(entries);
  }

  /**
   * Get account mappings for different ERP systems
   */
  private getAccountMappings(erpSystem: string): Record<string, AccountMapping> {
    const mappings: Record<string, Record<string, AccountMapping>> = {
      'SoftOne': {
        salary_expense: { sourceType: 'salary', accountCode: '60.00', accountName: 'Salary Expense', isDebit: true },
        salary_payable: { sourceType: 'salary', accountCode: '47.00', accountName: 'Salary Payable', isDebit: false },
        income_tax_payable: { sourceType: 'tax', accountCode: '47.10', accountName: 'Income Tax Payable', isDebit: false },
        efka_employee_payable: { sourceType: 'insurance', accountCode: '47.20', accountName: 'EFKA Employee Payable', isDebit: false },
        efka_employer_expense: { sourceType: 'insurance', accountCode: '60.10', accountName: 'EFKA Employer Expense', isDebit: true },
        efka_employer_payable: { sourceType: 'insurance', accountCode: '47.21', accountName: 'EFKA Employer Payable', isDebit: false },
        benefits_expense: { sourceType: 'benefits', accountCode: '60.20', accountName: 'Benefits Expense', isDebit: true },
        benefits_payable: { sourceType: 'benefits', accountCode: '47.30', accountName: 'Benefits Payable', isDebit: false },
      },
      'SAP': {
        salary_expense: { sourceType: 'salary', accountCode: '480000', accountName: 'Salary Expense', isDebit: true },
        salary_payable: { sourceType: 'salary', accountCode: '230000', accountName: 'Salary Payable', isDebit: false },
        income_tax_payable: { sourceType: 'tax', accountCode: '230100', accountName: 'Income Tax Payable', isDebit: false },
        efka_employee_payable: { sourceType: 'insurance', accountCode: '230200', accountName: 'EFKA Employee Payable', isDebit: false },
        efka_employer_expense: { sourceType: 'insurance', accountCode: '481000', accountName: 'EFKA Employer Expense', isDebit: true },
        efka_employer_payable: { sourceType: 'insurance', accountCode: '230210', accountName: 'EFKA Employer Payable', isDebit: false },
        benefits_expense: { sourceType: 'benefits', accountCode: '482000', accountName: 'Benefits Expense', isDebit: true },
        benefits_payable: { sourceType: 'benefits', accountCode: '230300', accountName: 'Benefits Payable', isDebit: false },
      },
      'Default': {
        salary_expense: { sourceType: 'salary', accountCode: '6000', accountName: 'Salary Expense', isDebit: true },
        salary_payable: { sourceType: 'salary', accountCode: '2100', accountName: 'Salary Payable', isDebit: false },
        income_tax_payable: { sourceType: 'tax', accountCode: '2110', accountName: 'Income Tax Payable', isDebit: false },
        efka_employee_payable: { sourceType: 'insurance', accountCode: '2120', accountName: 'EFKA Employee Payable', isDebit: false },
        efka_employer_expense: { sourceType: 'insurance', accountCode: '6100', accountName: 'EFKA Employer Expense', isDebit: true },
        efka_employer_payable: { sourceType: 'insurance', accountCode: '2121', accountName: 'EFKA Employer Payable', isDebit: false },
        benefits_expense: { sourceType: 'benefits', accountCode: '6200', accountName: 'Benefits Expense', isDebit: true },
        benefits_payable: { sourceType: 'benefits', accountCode: '2130', accountName: 'Benefits Payable', isDebit: false },
      }
    };

    return mappings[erpSystem] || mappings['Default'];
  }

  /**
   * Get account code for a specific mapping
   */
  private getAccountCode(mappings: Record<string, AccountMapping>, key: string): string {
    return mappings[key]?.accountCode || '0000';
  }

  /**
   * Generate file name for export
   */
  private generateFileName(request: GLExportRequest): string {
    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    const propertyPrefix = request.propertyId ? `${request.propertyId}_` : '';
    const extension = request.format === 'excel' ? 'xlsx' : request.format;
    
    return `GL_${request.erpSystem}_${propertyPrefix}${request.payrollPeriodId}_${timestamp}.${extension}`;
  }
}