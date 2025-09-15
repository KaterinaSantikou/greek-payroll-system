import { nanoid } from 'nanoid';

/**
 * Migration Service for PayrollSync Implementation
 * Handles employee/contract migration, balance transfers, and historical filing preservation
 */

export interface MigrationPlan {
  migrationId: string;
  propertyCode: string;
  sourceSystem: SourceSystemInfo;
  migrationPhases: MigrationPhase[];
  dataMapping: DataMappingConfig;
  validationRules: MigrationValidationRule[];
  rollbackPlan: MigrationRollbackPlan;
  timeline: MigrationTimeline;
  createdDate: Date;
  status: 'PLANNED' | 'IN_PROGRESS' | 'VALIDATION' | 'COMPLETED' | 'FAILED';
}

export interface SourceSystemInfo {
  systemName: string;
  vendor: string;
  version: string;
  databaseType:
    | 'MYSQL'
    | 'POSTGRESQL'
    | 'SQL_SERVER'
    | 'ORACLE'
    | 'ACCESS'
    | 'EXCEL';
  connectionString?: string;
  exportCapability:
    | 'DATABASE_DIRECT'
    | 'CSV_EXPORT'
    | 'XML_EXPORT'
    | 'API'
    | 'MANUAL';
  dataRetentionPeriod: number; // months
  lastBackupDate: Date;
  recordCount: SystemRecordCount;
}

export interface SystemRecordCount {
  employees: number;
  contracts: number;
  payrollRuns: number;
  timesheets: number;
  filings: number;
  payments: number;
}

export interface MigrationPhase {
  phaseId: string;
  phaseName: string;
  phaseType:
    | 'EXTRACTION'
    | 'TRANSFORMATION'
    | 'VALIDATION'
    | 'LOADING'
    | 'VERIFICATION';
  dataTypes: string[];
  dependencies: string[];
  estimatedDuration: number; // hours
  criticalPhase: boolean;
  rollbackSupported: boolean;
  validationRequired: boolean;
}

export interface DataMappingConfig {
  employeeMapping: FieldMapping[];
  contractMapping: FieldMapping[];
  payrollMapping: FieldMapping[];
  timesheetMapping: FieldMapping[];
  filingMapping: FieldMapping[];
  customTransformations: CustomTransformation[];
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  dataType: 'STRING' | 'NUMBER' | 'DATE' | 'BOOLEAN' | 'DECIMAL' | 'CURRENCY';
  required: boolean;
  transformation?: string;
  defaultValue?: string;
  validationRules: string[];
}

export interface CustomTransformation {
  transformationId: string;
  name: string;
  sourceFields: string[];
  targetField: string;
  transformationLogic: string;
  description: string;
}

export interface MigrationValidationRule {
  ruleId: string;
  ruleName: string;
  ruleType: 'DATA_QUALITY' | 'BUSINESS_LOGIC' | 'COMPLIANCE' | 'COMPLETENESS';
  entityType: 'EMPLOYEE' | 'CONTRACT' | 'PAYROLL' | 'TIMESHEET' | 'FILING';
  validationLogic: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  blockingRule: boolean;
}

export interface MigrationRollbackPlan {
  rollbackSupported: boolean;
  rollbackScenarios: RollbackScenario[];
  backupRetention: number; // days
  recoveryProcedures: RecoveryProcedure[];
}

export interface RollbackScenario {
  scenarioId: string;
  scenarioName: string;
  triggers: string[];
  impact: 'PARTIAL' | 'FULL';
  estimatedRecoveryTime: number; // hours
}

export interface RecoveryProcedure {
  procedureId: string;
  procedureName: string;
  steps: string[];
  automation: 'MANUAL' | 'SEMI_AUTO' | 'AUTOMATIC';
  validationSteps: string[];
}

export interface MigrationTimeline {
  totalDuration: number; // days
  phases: PhaseTimeline[];
  criticalPath: string[];
  bufferTime: number; // days
}

export interface PhaseTimeline {
  phaseId: string;
  startDate: Date;
  endDate: Date;
  dependencies: string[];
  resources: string[];
  risks: string[];
}

export interface MigrationResult {
  migrationId: string;
  status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED';
  summary: MigrationSummary;
  dataQualityReport: DataQualityReport;
  migrationLog: MigrationLogEntry[];
  completedDate: Date;
}

export interface MigrationSummary {
  totalRecords: number;
  migratedRecords: number;
  skippedRecords: number;
  errorRecords: number;
  validationErrors: number;
  warningsCount: number;
  duration: number; // minutes
}

export interface DataQualityReport {
  overallQuality: number; // percentage
  qualityByEntity: EntityQualityMetric[];
  criticalIssues: DataQualityIssue[];
  recommendations: string[];
}

export interface EntityQualityMetric {
  entityType: string;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  qualityScore: number; // percentage
  commonIssues: string[];
}

export interface DataQualityIssue {
  issueId: string;
  issueType:
    | 'MISSING_REQUIRED_FIELD'
    | 'INVALID_FORMAT'
    | 'BUSINESS_RULE_VIOLATION'
    | 'DUPLICATE_RECORD';
  entityType: string;
  recordId: string;
  fieldName: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  suggestedFix: string;
}

export interface MigrationLogEntry {
  logId: string;
  timestamp: Date;
  level: 'INFO' | 'WARNING' | 'ERROR';
  phase: string;
  entityType: string;
  recordId?: string;
  message: string;
  details?: any;
}

export interface EmployeeMigrationRecord {
  sourceEmployeeId: string;
  targetEmployeeId: string;
  personalInfo: EmployeePersonalInfo;
  employmentInfo: EmploymentInfo;
  bankingInfo: BankingInfo;
  contractHistory: ContractRecord[];
  payrollHistory: PayrollHistoryRecord[];
  migrationStatus: 'PENDING' | 'MIGRATED' | 'ERROR' | 'SKIPPED';
  migrationNotes?: string;
}

export interface EmployeePersonalInfo {
  firstName: string;
  lastName: string;
  afm: string;
  amka: string;
  dateOfBirth?: Date;
  nationalityCode?: string;
  address?: string;
  phone?: string;
  email?: string;
  emergencyContact?: EmergencyContact;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface EmploymentInfo {
  employeeNumber: string;
  hireDate: Date;
  termDate?: Date;
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'SEASONAL' | 'TEMPORARY';
  department: string;
  jobTitle: string;
  grade?: string;
  manager?: string;
}

export interface BankingInfo {
  bankIban?: string;
  bankName?: string;
  paymentMethod: 'BANK_TRANSFER' | 'CASH' | 'CHECK';
}

export interface ContractRecord {
  contractId: string;
  contractType: string;
  startDate: Date;
  endDate?: Date;
  baseSalary: number;
  workingHours: number;
  cbaReference?: string;
  allowances: ContractAllowance[];
}

export interface ContractAllowance {
  allowanceCode: string;
  allowanceName: string;
  amount: number;
  frequency: 'MONTHLY' | 'DAILY' | 'HOURLY' | 'ANNUAL';
}

export interface PayrollHistoryRecord {
  payrollPeriod: string;
  grossPay: number;
  netPay: number;
  incomeTax: number;
  socialSecurity: number;
  payDate: Date;
}

export interface FilingMigrationRecord {
  filingId: string;
  filingType: 'APD' | 'FMY' | 'ERGANI' | 'CUSTOM';
  period: string;
  submissionDate: Date;
  receiptNumber?: string;
  status: 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
  originalFile?: Buffer;
  receiptFile?: Buffer;
  migrationStatus: 'PENDING' | 'MIGRATED' | 'ERROR';
}

class MigrationService {
  /**
   * Create comprehensive migration plan
   */
  async createMigrationPlan(
    propertyCode: string,
    sourceSystem: SourceSystemInfo
  ): Promise<MigrationPlan> {
    const migrationId = nanoid();

    console.log(
      `Creating migration plan for property ${propertyCode} from ${sourceSystem.systemName}`
    );

    // Define migration phases
    const migrationPhases = this.defineMigrationPhases();

    // Create data mapping configuration
    const dataMapping = this.createDataMapping(sourceSystem);

    // Define validation rules
    const validationRules = this.createValidationRules();

    // Create rollback plan
    const rollbackPlan = this.createMigrationRollbackPlan();

    // Generate timeline
    const timeline = this.createMigrationTimeline(migrationPhases);

    const plan: MigrationPlan = {
      migrationId,
      propertyCode,
      sourceSystem,
      migrationPhases,
      dataMapping,
      validationRules,
      rollbackPlan,
      timeline,
      createdDate: new Date(),
      status: 'PLANNED',
    };

    console.log(`Migration plan created with ${migrationPhases.length} phases`);
    return plan;
  }

  /**
   * Execute employee and contract migration
   */
  async executeEmployeeMigration(
    migrationPlan: MigrationPlan,
    sourceData: any[]
  ): Promise<MigrationResult> {
    const migrationId = migrationPlan.migrationId;
    const migrationLog: MigrationLogEntry[] = [];
    const startTime = Date.now();

    console.log(`Starting employee migration for ${sourceData.length} records`);

    let migratedRecords = 0;
    let errorRecords = 0;
    let skippedRecords = 0;
    const validationErrors: DataQualityIssue[] = [];

    // Process each employee record
    for (const sourceEmployee of sourceData) {
      try {
        // Transform source data to target format
        const transformedEmployee = await this.transformEmployeeData(
          sourceEmployee,
          migrationPlan.dataMapping
        );

        // Validate transformed data
        const validationResult = await this.validateEmployeeData(
          transformedEmployee,
          migrationPlan.validationRules
        );

        if (validationResult.isValid) {
          // Migrate employee and contracts
          await this.migrateEmployeeRecord(transformedEmployee);
          migratedRecords++;

          migrationLog.push({
            logId: nanoid(),
            timestamp: new Date(),
            level: 'INFO',
            phase: 'EMPLOYEE_MIGRATION',
            entityType: 'EMPLOYEE',
            recordId: transformedEmployee.sourceEmployeeId,
            message: 'Employee migrated successfully',
          });
        } else {
          errorRecords++;
          validationErrors.push(...validationResult.errors);

          migrationLog.push({
            logId: nanoid(),
            timestamp: new Date(),
            level: 'ERROR',
            phase: 'EMPLOYEE_MIGRATION',
            entityType: 'EMPLOYEE',
            recordId: sourceEmployee.id,
            message: `Validation failed: ${validationResult.errors.map(e => e.description).join(', ')}`,
          });
        }
      } catch (error) {
        errorRecords++;
        migrationLog.push({
          logId: nanoid(),
          timestamp: new Date(),
          level: 'ERROR',
          phase: 'EMPLOYEE_MIGRATION',
          entityType: 'EMPLOYEE',
          recordId: sourceEmployee.id,
          message: `Migration error: ${error}`,
          details: error,
        });
      }
    }

    const duration = Math.floor((Date.now() - startTime) / 1000 / 60);

    // Generate data quality report
    const dataQualityReport = this.generateDataQualityReport(
      sourceData.length,
      migratedRecords,
      validationErrors
    );

    const result: MigrationResult = {
      migrationId,
      status:
        errorRecords === 0
          ? 'SUCCESS'
          : migratedRecords > 0
            ? 'PARTIAL_SUCCESS'
            : 'FAILED',
      summary: {
        totalRecords: sourceData.length,
        migratedRecords,
        skippedRecords,
        errorRecords,
        validationErrors: validationErrors.length,
        warningsCount: migrationLog.filter(l => l.level === 'WARNING').length,
        duration,
      },
      dataQualityReport,
      migrationLog,
      completedDate: new Date(),
    };

    console.log(
      `Employee migration completed: ${migratedRecords}/${sourceData.length} records migrated`
    );
    return result;
  }

  /**
   * Migrate payroll balances and year-to-date totals
   */
  async migratePayrollBalances(
    migrationPlan: MigrationPlan,
    balanceData: any[]
  ): Promise<MigrationResult> {
    const migrationId = migrationPlan.migrationId;
    const migrationLog: MigrationLogEntry[] = [];
    const startTime = Date.now();

    console.log(
      `Migrating payroll balances for ${balanceData.length} employees`
    );

    let migratedRecords = 0;
    let errorRecords = 0;

    for (const employeeBalance of balanceData) {
      try {
        // Transform balance data
        const transformedBalance =
          this.transformPayrollBalance(employeeBalance);

        // Validate balance data
        if (this.validatePayrollBalance(transformedBalance)) {
          // Store balance information
          await this.storePayrollBalance(transformedBalance);
          migratedRecords++;

          migrationLog.push({
            logId: nanoid(),
            timestamp: new Date(),
            level: 'INFO',
            phase: 'BALANCE_MIGRATION',
            entityType: 'PAYROLL',
            recordId: employeeBalance.employeeId,
            message: 'Payroll balance migrated successfully',
          });
        } else {
          errorRecords++;
          migrationLog.push({
            logId: nanoid(),
            timestamp: new Date(),
            level: 'ERROR',
            phase: 'BALANCE_MIGRATION',
            entityType: 'PAYROLL',
            recordId: employeeBalance.employeeId,
            message: 'Balance validation failed',
          });
        }
      } catch (error) {
        errorRecords++;
        migrationLog.push({
          logId: nanoid(),
          timestamp: new Date(),
          level: 'ERROR',
          phase: 'BALANCE_MIGRATION',
          entityType: 'PAYROLL',
          recordId: employeeBalance.employeeId,
          message: `Balance migration error: ${error}`,
        });
      }
    }

    const duration = Math.floor((Date.now() - startTime) / 1000 / 60);

    return {
      migrationId,
      status: errorRecords === 0 ? 'SUCCESS' : 'PARTIAL_SUCCESS',
      summary: {
        totalRecords: balanceData.length,
        migratedRecords,
        skippedRecords: 0,
        errorRecords,
        validationErrors: 0,
        warningsCount: 0,
        duration,
      },
      dataQualityReport: {
        overallQuality: (migratedRecords / balanceData.length) * 100,
        qualityByEntity: [],
        criticalIssues: [],
        recommendations: [],
      },
      migrationLog,
      completedDate: new Date(),
    };
  }

  /**
   * Migrate historical filings and receipts
   */
  async migrateHistoricalFilings(
    migrationPlan: MigrationPlan,
    filingData: FilingMigrationRecord[]
  ): Promise<MigrationResult> {
    const migrationId = migrationPlan.migrationId;
    const migrationLog: MigrationLogEntry[] = [];
    const startTime = Date.now();

    console.log(`Migrating historical filings: ${filingData.length} records`);

    let migratedRecords = 0;
    let errorRecords = 0;

    for (const filing of filingData) {
      try {
        // Store filing record and associated documents
        await this.storeHistoricalFiling(filing);
        migratedRecords++;

        migrationLog.push({
          logId: nanoid(),
          timestamp: new Date(),
          level: 'INFO',
          phase: 'FILING_MIGRATION',
          entityType: 'FILING',
          recordId: filing.filingId,
          message: `${filing.filingType} filing migrated for period ${filing.period}`,
        });
      } catch (error) {
        errorRecords++;
        filing.migrationStatus = 'ERROR';

        migrationLog.push({
          logId: nanoid(),
          timestamp: new Date(),
          level: 'ERROR',
          phase: 'FILING_MIGRATION',
          entityType: 'FILING',
          recordId: filing.filingId,
          message: `Filing migration error: ${error}`,
        });
      }
    }

    const duration = Math.floor((Date.now() - startTime) / 1000 / 60);

    return {
      migrationId,
      status: errorRecords === 0 ? 'SUCCESS' : 'PARTIAL_SUCCESS',
      summary: {
        totalRecords: filingData.length,
        migratedRecords,
        skippedRecords: 0,
        errorRecords,
        validationErrors: 0,
        warningsCount: 0,
        duration,
      },
      dataQualityReport: {
        overallQuality: (migratedRecords / filingData.length) * 100,
        qualityByEntity: [],
        criticalIssues: [],
        recommendations: [],
      },
      migrationLog,
      completedDate: new Date(),
    };
  }

  // Private helper methods
  private defineMigrationPhases(): MigrationPhase[] {
    return [
      {
        phaseId: 'PHASE_1',
        phaseName: 'Data Extraction',
        phaseType: 'EXTRACTION',
        dataTypes: ['EMPLOYEE', 'CONTRACT', 'PAYROLL', 'TIMESHEET', 'FILING'],
        dependencies: [],
        estimatedDuration: 8,
        criticalPhase: true,
        rollbackSupported: true,
        validationRequired: true,
      },
      {
        phaseId: 'PHASE_2',
        phaseName: 'Data Transformation',
        phaseType: 'TRANSFORMATION',
        dataTypes: ['EMPLOYEE', 'CONTRACT', 'PAYROLL'],
        dependencies: ['PHASE_1'],
        estimatedDuration: 16,
        criticalPhase: true,
        rollbackSupported: true,
        validationRequired: true,
      },
      {
        phaseId: 'PHASE_3',
        phaseName: 'Data Validation',
        phaseType: 'VALIDATION',
        dataTypes: ['EMPLOYEE', 'CONTRACT', 'PAYROLL'],
        dependencies: ['PHASE_2'],
        estimatedDuration: 4,
        criticalPhase: true,
        rollbackSupported: false,
        validationRequired: false,
      },
      {
        phaseId: 'PHASE_4',
        phaseName: 'Data Loading',
        phaseType: 'LOADING',
        dataTypes: ['EMPLOYEE', 'CONTRACT', 'PAYROLL', 'FILING'],
        dependencies: ['PHASE_3'],
        estimatedDuration: 12,
        criticalPhase: true,
        rollbackSupported: true,
        validationRequired: true,
      },
      {
        phaseId: 'PHASE_5',
        phaseName: 'Data Verification',
        phaseType: 'VERIFICATION',
        dataTypes: ['ALL'],
        dependencies: ['PHASE_4'],
        estimatedDuration: 8,
        criticalPhase: false,
        rollbackSupported: false,
        validationRequired: false,
      },
    ];
  }

  private createDataMapping(sourceSystem: SourceSystemInfo): DataMappingConfig {
    return {
      employeeMapping: [
        {
          sourceField: 'emp_id',
          targetField: 'employeeId',
          dataType: 'STRING',
          required: true,
          validationRules: ['NOT_NULL', 'UNIQUE'],
        },
        {
          sourceField: 'first_name',
          targetField: 'firstName',
          dataType: 'STRING',
          required: true,
          validationRules: ['NOT_NULL', 'MIN_LENGTH:2'],
        },
        {
          sourceField: 'last_name',
          targetField: 'lastName',
          dataType: 'STRING',
          required: true,
          validationRules: ['NOT_NULL', 'MIN_LENGTH:2'],
        },
        {
          sourceField: 'tax_id',
          targetField: 'afm',
          dataType: 'STRING',
          required: true,
          transformation: 'REMOVE_SPACES',
          validationRules: ['AFM_FORMAT'],
        },
        {
          sourceField: 'social_security_no',
          targetField: 'amka',
          dataType: 'STRING',
          required: true,
          transformation: 'REMOVE_SPACES',
          validationRules: ['AMKA_FORMAT'],
        },
      ],
      contractMapping: [
        {
          sourceField: 'contract_id',
          targetField: 'contractId',
          dataType: 'STRING',
          required: true,
          validationRules: ['NOT_NULL', 'UNIQUE'],
        },
        {
          sourceField: 'start_date',
          targetField: 'startDate',
          dataType: 'DATE',
          required: true,
          validationRules: ['VALID_DATE'],
        },
        {
          sourceField: 'salary',
          targetField: 'baseSalary',
          dataType: 'DECIMAL',
          required: true,
          validationRules: ['POSITIVE_NUMBER', 'MIN_WAGE_CHECK'],
        },
      ],
      payrollMapping: [],
      timesheetMapping: [],
      filingMapping: [],
      customTransformations: [
        {
          transformationId: 'FULL_NAME_SPLIT',
          name: 'Split Full Name',
          sourceFields: ['full_name'],
          targetField: 'firstName,lastName',
          transformationLogic: 'SPLIT_ON_SPACE',
          description: 'Split full name into first and last name',
        },
      ],
    };
  }

  private createValidationRules(): MigrationValidationRule[] {
    return [
      {
        ruleId: 'AFM_VALIDATION',
        ruleName: 'Greek AFM Validation',
        ruleType: 'COMPLIANCE',
        entityType: 'EMPLOYEE',
        validationLogic: '/^\\d{9}$/.test(afm) && afm !== "000000000"',
        severity: 'ERROR',
        blockingRule: true,
      },
      {
        ruleId: 'AMKA_VALIDATION',
        ruleName: 'Greek AMKA Validation',
        ruleType: 'COMPLIANCE',
        entityType: 'EMPLOYEE',
        validationLogic: '/^\\d{11}$/.test(amka) && amka !== "00000000000"',
        severity: 'ERROR',
        blockingRule: true,
      },
      {
        ruleId: 'MINIMUM_WAGE_CHECK',
        ruleName: 'Minimum Wage Validation',
        ruleType: 'BUSINESS_LOGIC',
        entityType: 'CONTRACT',
        validationLogic: 'baseSalary >= 880', // 2025 Greek minimum wage
        severity: 'WARNING',
        blockingRule: false,
      },
      {
        ruleId: 'EMPLOYMENT_DATE_VALIDATION',
        ruleName: 'Employment Date Validation',
        ruleType: 'DATA_QUALITY',
        entityType: 'EMPLOYEE',
        validationLogic: 'hireDate <= new Date()',
        severity: 'ERROR',
        blockingRule: true,
      },
    ];
  }

  private createMigrationRollbackPlan(): MigrationRollbackPlan {
    return {
      rollbackSupported: true,
      rollbackScenarios: [
        {
          scenarioId: 'DATA_CORRUPTION',
          scenarioName: 'Data Corruption Detected',
          triggers: [
            'Invalid AFM/AMKA',
            'Duplicate employees',
            'Missing required fields',
          ],
          impact: 'FULL',
          estimatedRecoveryTime: 4,
        },
        {
          scenarioId: 'VALIDATION_FAILURES',
          scenarioName: 'High Validation Failure Rate',
          triggers: [
            'Validation failures > 20%',
            'Critical business rule violations',
          ],
          impact: 'PARTIAL',
          estimatedRecoveryTime: 2,
        },
      ],
      backupRetention: 90,
      recoveryProcedures: [
        {
          procedureId: 'FULL_ROLLBACK',
          procedureName: 'Full Migration Rollback',
          steps: [
            'Stop migration process',
            'Restore database from pre-migration backup',
            'Validate data integrity',
            'Notify stakeholders',
          ],
          automation: 'SEMI_AUTO',
          validationSteps: ['Data count verification', 'Key field validation'],
        },
      ],
    };
  }

  private createMigrationTimeline(phases: MigrationPhase[]): MigrationTimeline {
    const totalDuration = phases.reduce(
      (sum, phase) => sum + Math.ceil(phase.estimatedDuration / 8),
      0
    );
    const startDate = new Date();

    const phaseTimelines: PhaseTimeline[] = phases.map((phase, index) => {
      const phaseStart = new Date(startDate);
      phaseStart.setDate(phaseStart.getDate() + index * 2); // 2 days between phases

      const phaseEnd = new Date(phaseStart);
      phaseEnd.setDate(
        phaseEnd.getDate() + Math.ceil(phase.estimatedDuration / 8)
      );

      return {
        phaseId: phase.phaseId,
        startDate: phaseStart,
        endDate: phaseEnd,
        dependencies: phase.dependencies,
        resources: ['Migration Specialist', 'Data Analyst'],
        risks: ['Data quality issues', 'System downtime'],
      };
    });

    return {
      totalDuration,
      phases: phaseTimelines,
      criticalPath: phases.filter(p => p.criticalPhase).map(p => p.phaseId),
      bufferTime: 3, // 3 days buffer
    };
  }

  private async transformEmployeeData(
    sourceEmployee: any,
    dataMapping: DataMappingConfig
  ): Promise<EmployeeMigrationRecord> {
    // Apply field mappings and transformations
    const transformed: EmployeeMigrationRecord = {
      sourceEmployeeId: sourceEmployee.emp_id,
      targetEmployeeId: nanoid(),
      personalInfo: {
        firstName: sourceEmployee.first_name?.trim(),
        lastName: sourceEmployee.last_name?.trim(),
        afm: sourceEmployee.tax_id?.replace(/\s/g, ''),
        amka: sourceEmployee.social_security_no?.replace(/\s/g, ''),
        dateOfBirth: sourceEmployee.birth_date
          ? new Date(sourceEmployee.birth_date)
          : undefined,
        nationalityCode: sourceEmployee.nationality || 'GR',
        address: sourceEmployee.address,
        phone: sourceEmployee.phone,
        email: sourceEmployee.email,
      },
      employmentInfo: {
        employeeNumber: sourceEmployee.employee_number,
        hireDate: new Date(sourceEmployee.hire_date),
        termDate: sourceEmployee.term_date
          ? new Date(sourceEmployee.term_date)
          : undefined,
        employmentType: sourceEmployee.employment_type || 'FULL_TIME',
        department: sourceEmployee.department,
        jobTitle: sourceEmployee.job_title,
        grade: sourceEmployee.grade,
      },
      bankingInfo: {
        bankIban: sourceEmployee.bank_iban,
        bankName: sourceEmployee.bank_name,
        paymentMethod: 'BANK_TRANSFER',
      },
      contractHistory: [],
      payrollHistory: [],
      migrationStatus: 'PENDING',
    };

    return transformed;
  }

  private async validateEmployeeData(
    employee: EmployeeMigrationRecord,
    validationRules: MigrationValidationRule[]
  ): Promise<{ isValid: boolean; errors: DataQualityIssue[] }> {
    const errors: DataQualityIssue[] = [];

    // Validate AFM
    if (
      !/^\d{9}$/.test(employee.personalInfo.afm) ||
      employee.personalInfo.afm === '000000000'
    ) {
      errors.push({
        issueId: nanoid(),
        issueType: 'INVALID_FORMAT',
        entityType: 'EMPLOYEE',
        recordId: employee.sourceEmployeeId,
        fieldName: 'afm',
        description: 'Invalid AFM format',
        severity: 'CRITICAL',
        suggestedFix: 'Provide valid 9-digit AFM',
      });
    }

    // Validate AMKA
    if (
      !/^\d{11}$/.test(employee.personalInfo.amka) ||
      employee.personalInfo.amka === '00000000000'
    ) {
      errors.push({
        issueId: nanoid(),
        issueType: 'INVALID_FORMAT',
        entityType: 'EMPLOYEE',
        recordId: employee.sourceEmployeeId,
        fieldName: 'amka',
        description: 'Invalid AMKA format',
        severity: 'CRITICAL',
        suggestedFix: 'Provide valid 11-digit AMKA',
      });
    }

    // Validate required fields
    if (
      !employee.personalInfo.firstName ||
      employee.personalInfo.firstName.length < 2
    ) {
      errors.push({
        issueId: nanoid(),
        issueType: 'MISSING_REQUIRED_FIELD',
        entityType: 'EMPLOYEE',
        recordId: employee.sourceEmployeeId,
        fieldName: 'firstName',
        description: 'First name is required and must be at least 2 characters',
        severity: 'HIGH',
        suggestedFix: 'Provide valid first name',
      });
    }

    return {
      isValid:
        errors.filter(e => e.severity === 'CRITICAL' || e.severity === 'HIGH')
          .length === 0,
      errors,
    };
  }

  private async migrateEmployeeRecord(
    employee: EmployeeMigrationRecord
  ): Promise<void> {
    // Mock implementation - would insert into actual database
    console.log(
      `Migrating employee ${employee.personalInfo.firstName} ${employee.personalInfo.lastName}`
    );
    employee.migrationStatus = 'MIGRATED';
  }

  private transformPayrollBalance(balanceData: any): any {
    return {
      employeeId: balanceData.employee_id,
      year: balanceData.year,
      grossPay: balanceData.gross_pay || 0,
      netPay: balanceData.net_pay || 0,
      incomeTax: balanceData.income_tax || 0,
      socialSecurity: balanceData.social_security || 0,
      leaveBalance: balanceData.leave_balance || 0,
    };
  }

  private validatePayrollBalance(balance: any): boolean {
    return (
      balance.employeeId &&
      balance.year &&
      balance.grossPay >= 0 &&
      balance.netPay >= 0
    );
  }

  private async storePayrollBalance(balance: any): Promise<void> {
    // Mock implementation - would store in database
    console.log(`Storing payroll balance for employee ${balance.employeeId}`);
  }

  private async storeHistoricalFiling(
    filing: FilingMigrationRecord
  ): Promise<void> {
    // Mock implementation - would store filing and documents
    console.log(
      `Storing ${filing.filingType} filing for period ${filing.period}`
    );
    filing.migrationStatus = 'MIGRATED';
  }

  private generateDataQualityReport(
    totalRecords: number,
    migratedRecords: number,
    validationErrors: DataQualityIssue[]
  ): DataQualityReport {
    const overallQuality = (migratedRecords / totalRecords) * 100;

    return {
      overallQuality,
      qualityByEntity: [
        {
          entityType: 'EMPLOYEE',
          totalRecords,
          validRecords: migratedRecords,
          invalidRecords: totalRecords - migratedRecords,
          qualityScore: overallQuality,
          commonIssues: validationErrors.map(e => e.description).slice(0, 5),
        },
      ],
      criticalIssues: validationErrors.filter(e => e.severity === 'CRITICAL'),
      recommendations: [
        'Validate AFM/AMKA formats before migration',
        'Ensure all required fields are populated',
        'Review business rule violations',
      ],
    };
  }
}

export const migrationService = new MigrationService();
