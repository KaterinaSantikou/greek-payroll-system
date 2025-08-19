/**
 * Payroll Connector Architecture
 * Normalized timesheets → earnings codes & cost centers → push to payroll
 */

// Normalized timesheet structure
export interface NormalizedTimesheet {
  timesheetId: string;
  employeeId: string;
  afm: string;
  payPeriod: {
    startDate: string;
    endDate: string;
    payrollCycle: 'weekly' | 'biweekly' | 'monthly';
  };
  
  // Time summary
  timeSummary: {
    regularHours: number;
    overtimeHours: number;
    sundayHours: number;
    holidayHours: number;
    nightShiftHours: number;
    breakHours: number;
    paidBreakHours: number;
    totalWorkedHours: number;
    scheduledHours: number;
    absentHours: number;
  };

  // Daily breakdown
  dailyRecords: DailyTimeRecord[];
  
  // Earnings breakdown
  earnings: EarningsCalculation[];
  
  // Cost center allocation
  costCenterAllocation: CostCenterAllocation[];
  
  // Compliance flags
  complianceFlags: ComplianceFlag[];
  
  // Metadata
  metadata: {
    generatedAt: string;
    approvedBy?: string;
    approvedAt?: string;
    exported: boolean;
    exportedAt?: string;
    payrollSystemRef?: string;
  };
}

export interface DailyTimeRecord {
  date: string;
  clockIn?: string;
  clockOut?: string;
  breaks: BreakRecord[];
  
  // Calculated times
  regularHours: number;
  overtimeHours: number;
  specialPremiumHours: {
    sunday: number;
    holiday: number;
    nightShift: number;
    hazardous: number;
  };
  
  // Work details
  department: string;
  jobCode: string;
  costCenter: string;
  location: string;
  
  // Exceptions and adjustments
  exceptions: TimeException[];
  adjustments: TimeAdjustment[];
  
  // Approval status
  approved: boolean;
  approvedBy?: string;
}

export interface BreakRecord {
  startTime: string;
  endTime: string;
  duration: number; // minutes
  paid: boolean;
  type: 'meal' | 'rest' | 'smoke' | 'personal';
}

export interface TimeException {
  type: 'late_arrival' | 'early_departure' | 'missed_punch' | 'unauthorized_overtime';
  description: string;
  impact: 'none' | 'deduction' | 'warning';
  resolved: boolean;
}

export interface TimeAdjustment {
  type: 'manual_correction' | 'supervisor_override' | 'system_correction';
  originalValue: number;
  adjustedValue: number;
  reason: string;
  approvedBy: string;
  timestamp: string;
}

// Earnings calculation with Greek payroll codes
export interface EarningsCalculation {
  earningsCode: string;
  description: string;
  category: 'regular' | 'overtime' | 'premium' | 'allowance' | 'bonus';
  
  // Calculation details
  hours?: number;
  rate?: number;
  amount: number;
  
  // Greek-specific codes
  greekPayrollCodes: {
    aadeCode?: string; // AADE tax reporting code
    efkaCode?: string; // EFKA insurance code
    erganiCode?: string; // ERGANI reporting code
  };
  
  // Tax treatment
  taxable: boolean;
  socialSecuritySubject: boolean;
  
  // Cost center assignment
  costCenter: string;
  department: string;
}

export interface CostCenterAllocation {
  costCenter: string;
  department: string;
  percentage: number;
  hours: number;
  amount: number;
  
  // Project/job tracking
  project?: string;
  jobCode?: string;
  taskCode?: string;
  
  // Greek accounting integration
  analyticalAccount?: string;
  budgetCategory?: string;
}

export interface ComplianceFlag {
  type: 'labor_law' | 'cba_violation' | 'ergani_missing' | 'tax_issue';
  severity: 'info' | 'warning' | 'error' | 'critical';
  description: string;
  recommendation: string;
  autoResolvable: boolean;
}

// Greek payroll system integration
export class PayrollConnector {
  private static EARNINGS_CODES = {
    // Regular earnings
    REGULAR_PAY: { code: 'REG001', description: 'Τακτικός μισθός', aadeCode: '101' },
    OVERTIME_50: { code: 'OT050', description: 'Υπερωρίες 50%', aadeCode: '201' },
    OVERTIME_75: { code: 'OT075', description: 'Υπερωρίες 75%', aadeCode: '202' },
    
    // Sunday and holiday premiums
    SUNDAY_PREMIUM: { code: 'SUN001', description: 'Κυριακάτικο επίδομα', aadeCode: '301' },
    HOLIDAY_PREMIUM: { code: 'HOL001', description: 'Επίδομα αργίας', aadeCode: '302' },
    NIGHT_PREMIUM: { code: 'NGT001', description: 'Νυχτερινό επίδομα', aadeCode: '303' },
    
    // Greek holiday bonuses
    CHRISTMAS_BONUS: { code: 'CHR001', description: 'Δώρο Χριστουγέννων', aadeCode: '401' },
    EASTER_BONUS: { code: 'EAS001', description: 'Δώρο Πάσχα', aadeCode: '402' },
    VACATION_BONUS: { code: 'VAC001', description: 'Επίδομα αδείας', aadeCode: '403' },
    
    // Allowances
    MEAL_ALLOWANCE: { code: 'MEL001', description: 'Επίδομα σίτισης', aadeCode: '501' },
    TRANSPORT_ALLOWANCE: { code: 'TRP001', description: 'Επίδομα μεταφοράς', aadeCode: '502' },
    EDUCATION_ALLOWANCE: { code: 'EDU001', description: 'Επίδομα μόρφωσης', aadeCode: '503' },
    
    // Deductions
    INCOME_TAX: { code: 'TAX001', description: 'Φόρος εισοδήματος', aadeCode: '801' },
    EFKA_EMPLOYEE: { code: 'EFK001', description: 'Ασφαλιστικές εισφορές', aadeCode: '802' },
    SOLIDARITY_TAX: { code: 'SOL001', description: 'Εισφορά αλληλεγγύης', aadeCode: '803' }
  };

  // Generate normalized timesheet from time events
  static async generateTimesheet(
    employeeId: string,
    payPeriod: { startDate: string; endDate: string }
  ): Promise<NormalizedTimesheet> {
    
    // Fetch time events for period
    const timeEvents = await this.getTimeEventsForPeriod(employeeId, payPeriod);
    
    // Fetch employee details
    const employee = await this.getEmployeeDetails(employeeId);
    
    // Calculate daily records
    const dailyRecords = await this.calculateDailyRecords(timeEvents, employee);
    
    // Calculate time summary
    const timeSummary = this.calculateTimeSummary(dailyRecords);
    
    // Calculate earnings
    const earnings = await this.calculateEarnings(dailyRecords, employee);
    
    // Allocate to cost centers
    const costCenterAllocation = this.calculateCostCenterAllocation(dailyRecords, earnings);
    
    // Check compliance
    const complianceFlags = await this.checkCompliance(dailyRecords, timeSummary, employee);

    const timesheetId = `ts_${employeeId}_${payPeriod.startDate.replace(/-/g, '')}`;

    return {
      timesheetId,
      employeeId,
      afm: employee.afm,
      payPeriod: {
        ...payPeriod,
        payrollCycle: 'monthly' // Greek standard
      },
      timeSummary,
      dailyRecords,
      earnings,
      costCenterAllocation,
      complianceFlags,
      metadata: {
        generatedAt: new Date().toISOString(),
        exported: false
      }
    };
  }

  // Export to external payroll system
  static async exportToPayrollSystem(timesheet: NormalizedTimesheet): Promise<PayrollExportResult> {
    try {
      // Transform to payroll system format
      const payrollData = this.transformToPayrollFormat(timesheet);
      
      // Submit to payroll system
      const result = await this.submitToPayrollSystem(payrollData);
      
      // Update timesheet metadata
      timesheet.metadata.exported = true;
      timesheet.metadata.exportedAt = new Date().toISOString();
      timesheet.metadata.payrollSystemRef = result.payrollRef;
      
      // Save updated timesheet
      await this.saveTimesheet(timesheet);
      
      return {
        success: true,
        timesheetId: timesheet.timesheetId,
        payrollRef: result.payrollRef,
        exportedAt: timesheet.metadata.exportedAt,
        summary: {
          totalEarnings: timesheet.earnings.reduce((sum, e) => sum + e.amount, 0),
          regularHours: timesheet.timeSummary.regularHours,
          overtimeHours: timesheet.timeSummary.overtimeHours,
          complianceIssues: timesheet.complianceFlags.filter(f => f.severity === 'error').length
        }
      };

    } catch (error) {
      console.error('Payroll export failed:', error);
      return {
        success: false,
        timesheetId: timesheet.timesheetId,
        error: error.message,
        retryable: this.isRetryableError(error)
      };
    }
  }

  // Batch export for payroll processing
  static async batchExportTimesheets(
    timesheetIds: string[]
  ): Promise<BatchExportResult> {
    const results: PayrollExportResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const timesheetId of timesheetIds) {
      try {
        const timesheet = await this.getTimesheet(timesheetId);
        const result = await this.exportToPayrollSystem(timesheet);
        
        results.push(result);
        
        if (result.success) {
          successCount++;
        } else {
          failureCount++;
        }
        
      } catch (error) {
        results.push({
          success: false,
          timesheetId,
          error: error.message,
          retryable: false
        });
        failureCount++;
      }
    }

    return {
      batchId: `batch_${Date.now()}`,
      totalTimesheets: timesheetIds.length,
      successCount,
      failureCount,
      results,
      completedAt: new Date().toISOString()
    };
  }

  // Calculate earnings based on Greek labor law and CBA
  private static async calculateEarnings(
    dailyRecords: DailyTimeRecord[],
    employee: any
  ): Promise<EarningsCalculation[]> {
    const earnings: EarningsCalculation[] = [];
    
    // Calculate totals
    const totalRegular = dailyRecords.reduce((sum, day) => sum + day.regularHours, 0);
    const totalOvertime = dailyRecords.reduce((sum, day) => sum + day.overtimeHours, 0);
    const totalSunday = dailyRecords.reduce((sum, day) => sum + day.specialPremiumHours.sunday, 0);
    const totalHoliday = dailyRecords.reduce((sum, day) => sum + day.specialPremiumHours.holiday, 0);
    const totalNight = dailyRecords.reduce((sum, day) => sum + day.specialPremiumHours.nightShift, 0);

    // Regular pay
    if (totalRegular > 0) {
      earnings.push({
        earningsCode: this.EARNINGS_CODES.REGULAR_PAY.code,
        description: this.EARNINGS_CODES.REGULAR_PAY.description,
        category: 'regular',
        hours: totalRegular,
        rate: employee.hourlyRate,
        amount: totalRegular * employee.hourlyRate,
        greekPayrollCodes: {
          aadeCode: this.EARNINGS_CODES.REGULAR_PAY.aadeCode
        },
        taxable: true,
        socialSecuritySubject: true,
        costCenter: employee.defaultCostCenter,
        department: employee.department
      });
    }

    // Overtime (50% premium)
    if (totalOvertime > 0) {
      const overtimeRate = employee.hourlyRate * 1.5;
      earnings.push({
        earningsCode: this.EARNINGS_CODES.OVERTIME_50.code,
        description: this.EARNINGS_CODES.OVERTIME_50.description,
        category: 'overtime',
        hours: totalOvertime,
        rate: overtimeRate,
        amount: totalOvertime * overtimeRate,
        greekPayrollCodes: {
          aadeCode: this.EARNINGS_CODES.OVERTIME_50.aadeCode
        },
        taxable: true,
        socialSecuritySubject: true,
        costCenter: employee.defaultCostCenter,
        department: employee.department
      });
    }

    // Sunday premium (75% in hotels)
    if (totalSunday > 0) {
      const sundayRate = employee.hourlyRate * 1.75;
      earnings.push({
        earningsCode: this.EARNINGS_CODES.SUNDAY_PREMIUM.code,
        description: this.EARNINGS_CODES.SUNDAY_PREMIUM.description,
        category: 'premium',
        hours: totalSunday,
        rate: sundayRate,
        amount: totalSunday * sundayRate,
        greekPayrollCodes: {
          aadeCode: this.EARNINGS_CODES.SUNDAY_PREMIUM.aadeCode
        },
        taxable: true,
        socialSecuritySubject: true,
        costCenter: employee.defaultCostCenter,
        department: employee.department
      });
    }

    // Holiday premium
    if (totalHoliday > 0) {
      const holidayRate = employee.hourlyRate * 2.0; // Double pay on holidays
      earnings.push({
        earningsCode: this.EARNINGS_CODES.HOLIDAY_PREMIUM.code,
        description: this.EARNINGS_CODES.HOLIDAY_PREMIUM.description,
        category: 'premium',
        hours: totalHoliday,
        rate: holidayRate,
        amount: totalHoliday * holidayRate,
        greekPayrollCodes: {
          aadeCode: this.EARNINGS_CODES.HOLIDAY_PREMIUM.aadeCode
        },
        taxable: true,
        socialSecuritySubject: true,
        costCenter: employee.defaultCostCenter,
        department: employee.department
      });
    }

    // Night shift premium (25%)
    if (totalNight > 0) {
      const nightRate = employee.hourlyRate * 1.25;
      earnings.push({
        earningsCode: this.EARNINGS_CODES.NIGHT_PREMIUM.code,
        description: this.EARNINGS_CODES.NIGHT_PREMIUM.description,
        category: 'premium',
        hours: totalNight,
        rate: nightRate,
        amount: totalNight * nightRate,
        greekPayrollCodes: {
          aadeCode: this.EARNINGS_CODES.NIGHT_PREMIUM.aadeCode
        },
        taxable: true,
        socialSecuritySubject: true,
        costCenter: employee.defaultCostCenter,
        department: employee.department
      });
    }

    return earnings;
  }

  // Transform to external payroll system format
  private static transformToPayrollFormat(timesheet: NormalizedTimesheet): any {
    return {
      employeeId: timesheet.employeeId,
      afm: timesheet.afm,
      payPeriod: timesheet.payPeriod,
      
      // Earnings lines
      earningsLines: timesheet.earnings.map(earning => ({
        code: earning.earningsCode,
        description: earning.description,
        hours: earning.hours,
        rate: earning.rate,
        amount: earning.amount,
        taxable: earning.taxable,
        socialSecuritySubject: earning.socialSecuritySubject,
        costCenter: earning.costCenter,
        aadeCode: earning.greekPayrollCodes.aadeCode
      })),
      
      // Time summary
      timeSummary: timesheet.timeSummary,
      
      // Cost center allocations
      costCenters: timesheet.costCenterAllocation,
      
      // Compliance notes
      complianceNotes: timesheet.complianceFlags.map(flag => ({
        type: flag.type,
        severity: flag.severity,
        description: flag.description
      }))
    };
  }

  // Helper methods
  private static async getTimeEventsForPeriod(employeeId: string, payPeriod: any): Promise<any[]> {
    // Fetch time events from time service
    return [];
  }

  private static async getEmployeeDetails(employeeId: string): Promise<any> {
    // Fetch employee from employee service
    return {
      employeeId,
      afm: '123456789',
      hourlyRate: 12.50,
      department: 'Reception',
      defaultCostCenter: 'CC001'
    };
  }

  private static async calculateDailyRecords(timeEvents: any[], employee: any): Promise<DailyTimeRecord[]> {
    // Process time events into daily records
    return [];
  }

  private static calculateTimeSummary(dailyRecords: DailyTimeRecord[]): any {
    return {
      regularHours: dailyRecords.reduce((sum, day) => sum + day.regularHours, 0),
      overtimeHours: dailyRecords.reduce((sum, day) => sum + day.overtimeHours, 0),
      sundayHours: dailyRecords.reduce((sum, day) => sum + day.specialPremiumHours.sunday, 0),
      holidayHours: dailyRecords.reduce((sum, day) => sum + day.specialPremiumHours.holiday, 0),
      nightShiftHours: dailyRecords.reduce((sum, day) => sum + day.specialPremiumHours.nightShift, 0),
      totalWorkedHours: 0,
      scheduledHours: 0,
      absentHours: 0,
      breakHours: 0,
      paidBreakHours: 0
    };
  }

  private static calculateCostCenterAllocation(
    dailyRecords: DailyTimeRecord[],
    earnings: EarningsCalculation[]
  ): CostCenterAllocation[] {
    // Calculate cost center allocation
    return [];
  }

  private static async checkCompliance(
    dailyRecords: DailyTimeRecord[],
    timeSummary: any,
    employee: any
  ): Promise<ComplianceFlag[]> {
    // Check various compliance rules
    return [];
  }

  private static async submitToPayrollSystem(payrollData: any): Promise<any> {
    // Submit to external payroll system
    return {
      payrollRef: `PR_${Date.now()}`
    };
  }

  private static async saveTimesheet(timesheet: NormalizedTimesheet): Promise<void> {
    // Save timesheet to database
  }

  private static async getTimesheet(timesheetId: string): Promise<NormalizedTimesheet> {
    // Retrieve timesheet from database
    throw new Error('Timesheet not found');
  }

  private static isRetryableError(error: any): boolean {
    // Determine if error is retryable
    return error.code !== 'VALIDATION_ERROR';
  }
}

// Result interfaces
export interface PayrollExportResult {
  success: boolean;
  timesheetId: string;
  payrollRef?: string;
  exportedAt?: string;
  error?: string;
  retryable?: boolean;
  summary?: {
    totalEarnings: number;
    regularHours: number;
    overtimeHours: number;
    complianceIssues: number;
  };
}

export interface BatchExportResult {
  batchId: string;
  totalTimesheets: number;
  successCount: number;
  failureCount: number;
  results: PayrollExportResult[];
  completedAt: string;
}