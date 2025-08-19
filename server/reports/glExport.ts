import { nanoid } from "nanoid";
import { createHash } from "crypto";

/**
 * General Ledger Export Service
 * Generates accounting journal entries for ERP integration
 */

export interface GLEntry {
  entryId: string;
  accountCode: string;
  accountName: string;
  debitAmount: number;
  creditAmount: number;
  description: string;
  costCenter?: string;
  department?: string;
  propertyCode?: string;
  referenceNumber: string;
  employeeId?: string;
}

export interface GLJournalExport {
  exportId: string;
  period: string;
  exportDate: Date;
  totalEntries: number;
  totalDebits: number;
  totalCredits: number;
  balanceCheck: boolean;
  entries: GLEntry[];
  mappingRules: GLMappingRule[];
  xmlContent?: string;
  csvContent?: string;
  checksum: string;
}

export interface GLMappingRule {
  ruleId: string;
  payrollComponent: string;
  accountCode: string;
  accountName: string;
  entryType: 'DEBIT' | 'CREDIT';
  description: string;
  isActive: boolean;
}

export interface ERPIntegration {
  erpSystem: 'SAP' | 'ORACLE' | 'SAGE' | 'EPSILON' | 'SINGULAR' | 'CUSTOM';
  exportFormat: 'XML' | 'CSV' | 'JSON' | 'FIXED_WIDTH';
  connectionString?: string;
  ftpDetails?: FTPDetails;
  apiEndpoint?: string;
}

export interface FTPDetails {
  host: string;
  port: number;
  username: string;
  password: string;
  directory: string;
  useSSL: boolean;
}

// Greek Chart of Accounts mapping for payroll
const GREEK_CHART_OF_ACCOUNTS = {
  // Assets
  'CASH_BANK': '511000',
  'EMPLOYEE_ADVANCES': '511100',
  
  // Liabilities
  'SALARY_PAYABLE': '601000',
  'TAX_PAYABLE': '601100',
  'SOCIAL_SECURITY_PAYABLE': '601200',
  'EFKA_PAYABLE': '601210',
  'IKA_MAIN_PAYABLE': '601220',
  'IKA_AUX_PAYABLE': '601230',
  'UNEMPLOYMENT_PAYABLE': '601240',
  
  // Expenses
  'SALARY_EXPENSE': '641000',
  'OVERTIME_EXPENSE': '641100',
  'BONUS_EXPENSE': '641200',
  'ALLOWANCE_EXPENSE': '641300',
  'SOCIAL_SECURITY_EMPLOYER': '641400',
  'PENSION_EXPENSE': '641500',
  
  // Cost Centers
  'FRONT_OFFICE': 'CC001',
  'HOUSEKEEPING': 'CC002',
  'FOOD_BEVERAGE': 'CC003',
  'MAINTENANCE': 'CC004',
  'ADMINISTRATION': 'CC005'
};

// Standard GL mapping rules for Greek payroll
const DEFAULT_MAPPING_RULES: GLMappingRule[] = [
  {
    ruleId: 'RULE_001',
    payrollComponent: 'BASIC_SALARY',
    accountCode: GREEK_CHART_OF_ACCOUNTS.SALARY_EXPENSE,
    accountName: 'Μισθοί και Ημερομίσθια',
    entryType: 'DEBIT',
    description: 'Βασικός μισθός εργαζομένων',
    isActive: true
  },
  {
    ruleId: 'RULE_002',
    payrollComponent: 'OVERTIME',
    accountCode: GREEK_CHART_OF_ACCOUNTS.OVERTIME_EXPENSE,
    accountName: 'Υπερωρίες',
    entryType: 'DEBIT',
    description: 'Αμοιβές υπερωριών',
    isActive: true
  },
  {
    ruleId: 'RULE_003',
    payrollComponent: 'SOCIAL_SECURITY_EMPLOYER',
    accountCode: GREEK_CHART_OF_ACCOUNTS.SOCIAL_SECURITY_EMPLOYER,
    accountName: 'Εργοδοτικές Εισφορές',
    entryType: 'DEBIT',
    description: 'Εργοδοτικές εισφορές ΙΚΑ',
    isActive: true
  },
  {
    ruleId: 'RULE_004',
    payrollComponent: 'NET_PAY',
    accountCode: GREEK_CHART_OF_ACCOUNTS.SALARY_PAYABLE,
    accountName: 'Πληρωτέοι Μισθοί',
    entryType: 'CREDIT',
    description: 'Καθαρές αποδοχές προς πληρωμή',
    isActive: true
  },
  {
    ruleId: 'RULE_005',
    payrollComponent: 'INCOME_TAX',
    accountCode: GREEK_CHART_OF_ACCOUNTS.TAX_PAYABLE,
    accountName: 'Φόρος Εισοδήματος Πληρωτέος',
    entryType: 'CREDIT',
    description: 'Παρακρατηθείς φόρος εισοδήματος',
    isActive: true
  },
  {
    ruleId: 'RULE_006',
    payrollComponent: 'SOCIAL_SECURITY_EMPLOYEE',
    accountCode: GREEK_CHART_OF_ACCOUNTS.SOCIAL_SECURITY_PAYABLE,
    accountName: 'Ασφαλιστικές Εισφορές Πληρωτέες',
    entryType: 'CREDIT',
    description: 'Εργατικές ασφαλιστικές εισφορές',
    isActive: true
  }
];

class GLExportService {
  private mappingRules: GLMappingRule[];

  constructor() {
    this.mappingRules = [...DEFAULT_MAPPING_RULES];
  }

  /**
   * Generate GL journal export from payroll data
   */
  async generateJournalExport(
    payrollData: any[],
    period: string,
    properties: string[] = []
  ): Promise<GLJournalExport> {
    const exportId = nanoid();
    const entries: GLEntry[] = [];

    // Process each employee's payroll data
    for (const employee of payrollData) {
      const employeeEntries = this.createEmployeeGLEntries(employee, period);
      entries.push(...employeeEntries);
    }

    // Calculate totals
    const totalDebits = entries.reduce((sum, entry) => sum + entry.debitAmount, 0);
    const totalCredits = entries.reduce((sum, entry) => sum + entry.creditAmount, 0);
    const balanceCheck = Math.abs(totalDebits - totalCredits) < 0.01;

    // Generate export content
    const csvContent = this.generateCSVContent(entries);
    const xmlContent = this.generateXMLContent(entries, period);
    const checksum = createHash('sha256').update(csvContent).digest('hex');

    const journalExport: GLJournalExport = {
      exportId,
      period,
      exportDate: new Date(),
      totalEntries: entries.length,
      totalDebits,
      totalCredits,
      balanceCheck,
      entries,
      mappingRules: this.mappingRules.filter(rule => rule.isActive),
      xmlContent,
      csvContent,
      checksum
    };

    if (!balanceCheck) {
      console.warn(`GL export ${exportId} failed balance check: Debits=${totalDebits.toFixed(2)}, Credits=${totalCredits.toFixed(2)}`);
    }

    return journalExport;
  }

  /**
   * Create GL entries for individual employee
   */
  private createEmployeeGLEntries(employeeData: any, period: string): GLEntry[] {
    const entries: GLEntry[] = [];
    const referenceNumber = `PAY_${period}_${employeeData.employeeId}`;

    // Basic salary - debit expense
    if (employeeData.basicSalary > 0) {
      entries.push({
        entryId: nanoid(),
        accountCode: GREEK_CHART_OF_ACCOUNTS.SALARY_EXPENSE,
        accountName: 'Μισθοί και Ημερομίσθια',
        debitAmount: employeeData.basicSalary,
        creditAmount: 0,
        description: `Βασικός μισθός ${employeeData.employeeName}`,
        costCenter: this.getCostCenter(employeeData.department),
        department: employeeData.department,
        propertyCode: employeeData.propertyCode,
        referenceNumber,
        employeeId: employeeData.employeeId
      });
    }

    // Overtime - debit expense
    if (employeeData.overtimePay > 0) {
      entries.push({
        entryId: nanoid(),
        accountCode: GREEK_CHART_OF_ACCOUNTS.OVERTIME_EXPENSE,
        accountName: 'Υπερωρίες',
        debitAmount: employeeData.overtimePay,
        creditAmount: 0,
        description: `Υπερωρίες ${employeeData.employeeName}`,
        costCenter: this.getCostCenter(employeeData.department),
        department: employeeData.department,
        propertyCode: employeeData.propertyCode,
        referenceNumber,
        employeeId: employeeData.employeeId
      });
    }

    // Bonuses - debit expense
    if (employeeData.bonusPay > 0) {
      entries.push({
        entryId: nanoid(),
        accountCode: GREEK_CHART_OF_ACCOUNTS.BONUS_EXPENSE,
        accountName: 'Δώρα και Επιδόματα',
        debitAmount: employeeData.bonusPay,
        creditAmount: 0,
        description: `Δώρο/Επίδομα ${employeeData.employeeName}`,
        costCenter: this.getCostCenter(employeeData.department),
        department: employeeData.department,
        propertyCode: employeeData.propertyCode,
        referenceNumber,
        employeeId: employeeData.employeeId
      });
    }

    // Employer social security - debit expense
    if (employeeData.employerSocialSecurity > 0) {
      entries.push({
        entryId: nanoid(),
        accountCode: GREEK_CHART_OF_ACCOUNTS.SOCIAL_SECURITY_EMPLOYER,
        accountName: 'Εργοδοτικές Εισφορές',
        debitAmount: employeeData.employerSocialSecurity,
        creditAmount: 0,
        description: `Εργοδοτικές εισφορές ${employeeData.employeeName}`,
        costCenter: this.getCostCenter(employeeData.department),
        department: employeeData.department,
        propertyCode: employeeData.propertyCode,
        referenceNumber,
        employeeId: employeeData.employeeId
      });
    }

    // Net pay - credit liability
    if (employeeData.netPay > 0) {
      entries.push({
        entryId: nanoid(),
        accountCode: GREEK_CHART_OF_ACCOUNTS.SALARY_PAYABLE,
        accountName: 'Πληρωτέοι Μισθοί',
        debitAmount: 0,
        creditAmount: employeeData.netPay,
        description: `Καθαρές αποδοχές ${employeeData.employeeName}`,
        costCenter: this.getCostCenter(employeeData.department),
        department: employeeData.department,
        propertyCode: employeeData.propertyCode,
        referenceNumber,
        employeeId: employeeData.employeeId
      });
    }

    // Income tax withheld - credit liability
    if (employeeData.incomeTax > 0) {
      entries.push({
        entryId: nanoid(),
        accountCode: GREEK_CHART_OF_ACCOUNTS.TAX_PAYABLE,
        accountName: 'Φόρος Εισοδήματος Πληρωτέος',
        debitAmount: 0,
        creditAmount: employeeData.incomeTax,
        description: `Φόρος εισοδήματος ${employeeData.employeeName}`,
        costCenter: this.getCostCenter(employeeData.department),
        department: employeeData.department,
        propertyCode: employeeData.propertyCode,
        referenceNumber,
        employeeId: employeeData.employeeId
      });
    }

    // Employee social security - credit liability
    if (employeeData.employeeSocialSecurity > 0) {
      entries.push({
        entryId: nanoid(),
        accountCode: GREEK_CHART_OF_ACCOUNTS.SOCIAL_SECURITY_PAYABLE,
        accountName: 'Ασφαλιστικές Εισφορές Πληρωτέες',
        debitAmount: 0,
        creditAmount: employeeData.employeeSocialSecurity,
        description: `Ασφαλιστικές εισφορές ${employeeData.employeeName}`,
        costCenter: this.getCostCenter(employeeData.department),
        department: employeeData.department,
        propertyCode: employeeData.propertyCode,
        referenceNumber,
        employeeId: employeeData.employeeId
      });
    }

    return entries;
  }

  /**
   * Generate CSV content for export
   */
  private generateCSVContent(entries: GLEntry[]): string {
    const headers = [
      'EntryId', 'AccountCode', 'AccountName', 'DebitAmount', 'CreditAmount',
      'Description', 'CostCenter', 'Department', 'PropertyCode', 'ReferenceNumber', 'EmployeeId'
    ];

    const csvRows = [
      headers.join(','),
      ...entries.map(entry => [
        entry.entryId,
        entry.accountCode,
        `"${entry.accountName}"`,
        entry.debitAmount.toFixed(2),
        entry.creditAmount.toFixed(2),
        `"${entry.description}"`,
        entry.costCenter || '',
        entry.department || '',
        entry.propertyCode || '',
        entry.referenceNumber,
        entry.employeeId || ''
      ].join(','))
    ];

    return csvRows.join('\n');
  }

  /**
   * Generate XML content for export
   */
  private generateXMLContent(entries: GLEntry[], period: string): string {
    const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>`;
    
    return `${xmlHeader}
<GLJournalExport xmlns="http://payrollsync.gr/gl-export">
  <Header>
    <Period>${period}</Period>
    <ExportDate>${new Date().toISOString()}</ExportDate>
    <TotalEntries>${entries.length}</TotalEntries>
    <TotalDebits>${entries.reduce((sum, e) => sum + e.debitAmount, 0).toFixed(2)}</TotalDebits>
    <TotalCredits>${entries.reduce((sum, e) => sum + e.creditAmount, 0).toFixed(2)}</TotalCredits>
  </Header>
  <Entries>
${entries.map(entry => `    <Entry>
      <EntryId>${entry.entryId}</EntryId>
      <AccountCode>${entry.accountCode}</AccountCode>
      <AccountName><![CDATA[${entry.accountName}]]></AccountName>
      <DebitAmount>${entry.debitAmount.toFixed(2)}</DebitAmount>
      <CreditAmount>${entry.creditAmount.toFixed(2)}</CreditAmount>
      <Description><![CDATA[${entry.description}]]></Description>
      ${entry.costCenter ? `<CostCenter>${entry.costCenter}</CostCenter>` : ''}
      ${entry.department ? `<Department><![CDATA[${entry.department}]]></Department>` : ''}
      ${entry.propertyCode ? `<PropertyCode>${entry.propertyCode}</PropertyCode>` : ''}
      <ReferenceNumber>${entry.referenceNumber}</ReferenceNumber>
      ${entry.employeeId ? `<EmployeeId>${entry.employeeId}</EmployeeId>` : ''}
    </Entry>`).join('\n')}
  </Entries>
</GLJournalExport>`;
  }

  /**
   * Export to ERP system
   */
  async exportToERP(journalExport: GLJournalExport, integration: ERPIntegration): Promise<boolean> {
    try {
      switch (integration.erpSystem) {
        case 'SAP':
          return await this.exportToSAP(journalExport, integration);
        case 'ORACLE':
          return await this.exportToOracle(journalExport, integration);
        case 'SAGE':
          return await this.exportToSage(journalExport, integration);
        case 'EPSILON':
          return await this.exportToEpsilon(journalExport, integration);
        default:
          return await this.exportGeneric(journalExport, integration);
      }
    } catch (error) {
      console.error(`GL export to ${integration.erpSystem} failed:`, error);
      return false;
    }
  }

  /**
   * Validate GL export before processing
   */
  validateExport(journalExport: GLJournalExport): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check balance
    if (!journalExport.balanceCheck) {
      errors.push('Debits and credits do not balance');
    }

    // Validate entries
    journalExport.entries.forEach((entry, index) => {
      if (!entry.accountCode || entry.accountCode.length < 4) {
        errors.push(`Invalid account code for entry ${index + 1}: ${entry.accountCode}`);
      }

      if (entry.debitAmount < 0 || entry.creditAmount < 0) {
        errors.push(`Negative amount found in entry ${index + 1}`);
      }

      if (entry.debitAmount > 0 && entry.creditAmount > 0) {
        errors.push(`Entry ${index + 1} has both debit and credit amounts`);
      }

      if (entry.debitAmount === 0 && entry.creditAmount === 0) {
        errors.push(`Entry ${index + 1} has zero amounts`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get cost center from department
   */
  private getCostCenter(department: string): string {
    const departmentToCostCenter: Record<string, string> = {
      'Front Office': GREEK_CHART_OF_ACCOUNTS.FRONT_OFFICE,
      'Housekeeping': GREEK_CHART_OF_ACCOUNTS.HOUSEKEEPING,
      'Food & Beverage': GREEK_CHART_OF_ACCOUNTS.FOOD_BEVERAGE,
      'Maintenance': GREEK_CHART_OF_ACCOUNTS.MAINTENANCE,
      'Administration': GREEK_CHART_OF_ACCOUNTS.ADMINISTRATION
    };

    return departmentToCostCenter[department] || GREEK_CHART_OF_ACCOUNTS.ADMINISTRATION;
  }

  // ERP-specific export methods (simplified implementations)
  private async exportToSAP(journalExport: GLJournalExport, integration: ERPIntegration): Promise<boolean> {
    console.log(`Exporting ${journalExport.totalEntries} entries to SAP`);
    // SAP-specific integration logic would go here
    return true;
  }

  private async exportToOracle(journalExport: GLJournalExport, integration: ERPIntegration): Promise<boolean> {
    console.log(`Exporting ${journalExport.totalEntries} entries to Oracle`);
    // Oracle-specific integration logic would go here
    return true;
  }

  private async exportToSage(journalExport: GLJournalExport, integration: ERPIntegration): Promise<boolean> {
    console.log(`Exporting ${journalExport.totalEntries} entries to Sage`);
    // Sage-specific integration logic would go here
    return true;
  }

  private async exportToEpsilon(journalExport: GLJournalExport, integration: ERPIntegration): Promise<boolean> {
    console.log(`Exporting ${journalExport.totalEntries} entries to Epsilon (Greek ERP)`);
    // Epsilon-specific integration logic would go here
    return true;
  }

  private async exportGeneric(journalExport: GLJournalExport, integration: ERPIntegration): Promise<boolean> {
    console.log(`Generic export of ${journalExport.totalEntries} entries`);
    // Generic export logic (FTP, API, etc.)
    return true;
  }
}

export const glExportService = new GLExportService();