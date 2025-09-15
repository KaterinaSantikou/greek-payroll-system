/**
 * Payroll Domain Types & Enums
 * 
 * Pure TypeScript domain types and enums for payroll business logic.
 * Completely decoupled from database schema and persistence concerns.
 * Used by domain rules, engine, and services layers.
 */

// =============================================================================
// DOMAIN ENUMS
// =============================================================================

export enum EmploymentType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time', 
  CONTRACT = 'contract',
  TEMPORARY = 'temporary',
  SEASONAL = 'seasonal'
}

export enum ContractType {
  INDEFINITE = 'indefinite',
  FIXED_TERM = 'fixed_term', 
  SEASONAL = 'seasonal'
}

export enum PayrollStatus {
  DRAFT = 'draft',
  CALCULATED = 'calculated',
  APPROVED = 'approved', 
  PAID = 'paid',
  CANCELLED = 'cancelled'
}

export enum LeaveType {
  ANNUAL = 'annual',
  SICK = 'sick',
  MATERNITY = 'maternity',
  PATERNITY = 'paternity',
  SPECIAL = 'special',
  UNPAID = 'unpaid'
}

export enum PaymentMethod {
  BANK_TRANSFER = 'bank_transfer',
  CASH = 'cash',
  CHECK = 'check'
}

export enum FilingStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled'
}

export enum ComplianceSystemType {
  ERGANI = 'ergani',
  EFKA = 'efka', 
  AADE = 'aade',
  GENERAL = 'general'
}

// =============================================================================
// CORE DOMAIN VALUE OBJECTS
// =============================================================================

export interface Money {
  amount: number;
  currency: string;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface WorkingHours {
  regularHours: number;
  overtimeHours: number;
  nightHours: number;
  sundayHours: number;
  holidayHours: number;
}

export interface TaxIdentifiers {
  afm: string;        // Greek Tax ID (9 digits)
  amka: string;       // Social Security Number (11 digits)
}

// =============================================================================
// PAYROLL CALCULATION INPUTS
// =============================================================================

export interface PayrollCalculationInput {
  employeeId: string;
  periodId: string;
  
  // Basic compensation
  baseSalary: number;
  hourlyRate?: number;
  
  // Working hours
  workingHours: WorkingHours;
  
  // Leave hours
  leaveHours: {
    annual?: number;
    sick?: number;
    maternity?: number;
    paternity?: number;
  };
  
  // Additional compensation
  allowances: {
    food?: number;
    transport?: number;
    housing?: number;
    marriage?: number;
    family?: number;
    education?: number;
    experience?: number;
    position?: number;
  };
  
  tips?: number;
  
  // Benefits in kind
  benefitsInKind: {
    mealVouchers?: number;
    companyCar?: number;
    housing?: number;
  };
  
  // Contract details
  contractType: ContractType;
  isFullTime: boolean;
  employmentStartDate: Date;
  periodStartDate: Date;
  periodEndDate: Date;
}

// =============================================================================
// PAYROLL CALCULATION RESULTS
// =============================================================================

export interface PayrollCalculationResult {
  employeeId: string;
  periodId: string;
  
  // Calculation metadata
  calculationDate: Date;
  calculationVersion: string;
  lawVersionId: string;
  
  // Gross pay components
  baseSalary: number;
  regularPay: number;
  overtimeAmount: number;
  nightPremium: number;
  sundayPremium: number;
  holidayPremium: number;
  
  // Allowances and bonuses
  totalAllowances: number;
  allowancesBreakdown: Record<string, number>;
  christmasBonus: number;
  easterBonus: number;
  vacationBonus: number;
  totalBonuses: number;
  
  // Leave pay
  annualLeavePay: number;
  sickLeavePay: number;
  maternityLeavePay: number;
  paternityLeavePay: number;
  totalLeavePay: number;
  
  // Benefits and tips
  taxFreeBenefits: number;
  taxableBenefits: number;
  imputedIncome: number;
  totalTips: number;
  tipsTax: number;
  netTips: number;
  
  // Gross totals
  grossPay: number;
  taxableIncome: number;
  
  // Deductions
  incomeTax: number;
  solidarityTax: number;
  employeeEfkaMain: number;
  employeeEfkaAux: number;
  employeeUnemployment: number;
  totalDeductions: number;
  
  // Employer costs
  employerEfkaMain: number;
  employerEfkaAux: number;
  employerUnemployment: number;
  employerSickness: number;
  employerWorkAccident: number;
  totalEmployerCost: number;
  
  // Final amount
  netPay: number;
  
  // Cap consumption tracking
  capConsumption: Record<string, number>;
  
  // Greek formatted values (for display)
  formatted: {
    baseSalary: string;
    netPay: string;
    grossTotal: string;
    workingPeriod: string;
    calculationDate: string;
    taxAmount: string;
    efkaAmount: string;
  };
}

// =============================================================================
// EMPLOYEE DOMAIN MODEL
// =============================================================================

export interface Employee {
  id: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    dateOfBirth?: Date;
  };
  taxIdentifiers: TaxIdentifiers;
  employment: {
    employeeNumber: string;
    department: string;
    position: string;
    contractType: ContractType;
    employmentType: EmploymentType;
    hireDate: Date;
    terminationDate?: Date;
    isActive: boolean;
  };
  compensation: {
    baseSalary: number;
    hourlyRate?: number;
    paymentMethod: PaymentMethod;
    bankAccount?: string;
  };
}

// =============================================================================
// PAYROLL SCOPE & PROCESSING
// =============================================================================

export interface PayrollScope {
  scopeId: string;
  period: string; // YYYY-MM format
  selectedEmployeeIds: string[];
  status: PayrollStatus;
  createdBy: string;
  createdAt: Date;
  computedAt?: Date;
  approvedAt?: Date;
  employeeCount?: number;
  totalGrossAmount?: string;
  totalNetAmount?: string;
  computationHash?: string;
}

export interface PayrollRunMetrics {
  scopeId: string;
  employeeCount: number;
  processingTimeMs: number;
  memoryUsageMB: number;
  lawVersionUsed: string;
  successfulCalculations: number;
  errors: number;
  warnings: number;
}

// =============================================================================
// BUSINESS RULES & VALIDATION
// =============================================================================

export interface ValidationError {
  code: string;
  field: string;
  message: string;
  messageGr: string;
  severity: 'error' | 'warning' | 'info';
}

export interface BusinessRuleResult {
  isValid: boolean;
  canCreateScope: boolean;
  overallErrors: ValidationError[];
  employeeErrors: Record<string, ValidationError[]>;
  summary: {
    totalEmployees: number;
    validEmployees: number;
    criticalErrors: number;
    warnings: number;
  };
}

// =============================================================================
// COMPLIANCE & FILING
// =============================================================================

export interface ComplianceFiling {
  filingId: string;
  systemType: ComplianceSystemType;
  period: string;
  employeeIds: string[];
  status: FilingStatus;
  submittedAt?: Date;
  acceptedAt?: Date;
  rejectedAt?: Date;
  errorMessage?: string;
  documentUrl?: string;
}

export interface DigitalWorkCard {
  employeeId: string;
  date: Date;
  clockInTime?: Date;
  clockOutTime?: Date;
  breakStartTime?: Date;
  breakEndTime?: Date;
  totalHours?: number;
  location?: string;
  deviceId?: string;
  submittedToErgani: boolean;
  erganiResponse?: any;
}

// =============================================================================
// REPORTING & ANALYTICS
// =============================================================================

export interface PayrollSummary {
  period: string;
  employeeCount: number;
  totalGrossPay: number;
  totalNetPay: number;
  totalTaxes: number;
  totalEfkaEmployee: number;
  totalEfkaEmployer: number;
  totalEmployerCost: number;
  averageSalary: number;
  medianSalary: number;
}

export interface TaxSummary {
  period: string;
  totalIncomeTax: number;
  totalSolidarityTax: number;
  taxableIncome: number;
  taxFreeIncome: number;
  employeeCount: number;
  averageTaxRate: number;
}

// =============================================================================
// PORTS & INTERFACES (for dependency inversion)
// =============================================================================

export interface RepositoryPort {
  getEmployeePayrollInfo(employeeIds: string[]): Promise<Employee[]>;
  getTimesheetData(employeeIds: string[], period: string): Promise<WorkingHours[]>;
  getPayrollScope(scopeId: string): Promise<PayrollScope | null>;
  savePayrollResults(scopeId: string, results: PayrollCalculationResult[]): Promise<void>;
}

export interface CompliancePort {
  validateOvertimeCaps(input: PayrollCalculationInput): Promise<ValidationError[]>;
  getLawVersionForDate(date: Date): Promise<string>;
  submitDigitalWorkCard(card: DigitalWorkCard): Promise<boolean>;
  validateTaxIdentifiers(afm: string, amka: string): Promise<ValidationError[]>;
}

export interface CachePort {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  invalidate(pattern: string): Promise<void>;
  getStats(): Promise<{ hitRate: number; memoryUsage: number }>;
}

// =============================================================================
// ERROR TYPES
// =============================================================================

export class PayrollDomainError extends Error {
  constructor(
    public readonly code: string,
    public readonly field: string,
    message: string,
    public readonly context?: any
  ) {
    super(message);
    this.name = 'PayrollDomainError';
  }
}

export class ValidationRuleError extends PayrollDomainError {
  constructor(field: string, message: string, context?: any) {
    super('VALIDATION_FAILED', field, message, context);
    this.name = 'ValidationRuleError';
  }
}

export class LawVersionError extends PayrollDomainError {
  constructor(message: string, context?: any) {
    super('LAW_VERSION_ERROR', 'lawVersion', message, context);
    this.name = 'LawVersionError';
  }
}