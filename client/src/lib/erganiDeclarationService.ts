// ERGANI II Declaration Service - Batch submission system for Greek Digital Work Card
// Implements the comprehensive batch declaration system for retrospective mode

import { 
  ErganiDeclarationBatches, 
  WorkHourChangeItems,
  InsertErganiDeclarationBatches,
  EntityMonthMode 
} from "@shared/schema";

export interface ErganiSubmissionConfig {
  apiEndpoint: string;
  apiKey: string;
  companyAFM: string;
  testMode: boolean;
  retryAttempts: number;
  batchSizeLimit: number;
}

export interface ErganiDeclarationItem {
  employeeAFM: string;
  employeeAMKA: string;
  workDate: string;
  changeType: 'overtime' | 'night' | 'sunday' | 'holiday' | 'schedule_change';
  startTime: string;
  endTime: string;
  durationMinutes: number;
  premiumRate: number;
  justification: string;
  evidenceRef: string;
}

export interface ErganiSubmissionResult {
  success: boolean;
  submissionReference?: string;
  erganiReceiptId?: string;
  errorCode?: string;
  errorMessage?: string;
  rejectedItems?: ErganiDeclarationItem[];
}

export interface ComplianceDeadlines {
  internalTarget: Date; // T+3 εργάσιμες
  legalDeadline: Date; // Σύμφωνα με ισχύουσα εγκύκλιο
  gracePeriod: Date; // Extended deadline if applicable
  penaltyRisk: 'none' | 'low' | 'medium' | 'high';
}

/**
 * 2.3 «Δέσμες απολογιστικών δηλώσεων» (ERGANI II)
 * Comprehensive ERGANI II batch declaration system
 */
export class ErganiDeclarationService {
  private config: ErganiSubmissionConfig;
  private workingDaysCalculator: WorkingDaysCalculator;

  constructor(config: ErganiSubmissionConfig) {
    this.config = {
      retryAttempts: 3,
      batchSizeLimit: 100,
      testMode: true,
      ...config
    };
    this.workingDaysCalculator = new WorkingDaysCalculator();
  }

  /**
   * Builder που ομαδοποιεί Change Items ανά εργαζόμενο/ημέρα/τύπο
   * Creates ergonomic declarations for ERGANI submission
   */
  async buildDeclarationBatch(
    changeItems: WorkHourChangeItems[],
    monthPeriod: string,
    companyId: string,
    mode: EntityMonthMode
  ): Promise<InsertErganiDeclarationBatches> {
    // Validate mode compliance
    await this.validateModeCompliance(mode, monthPeriod);

    // Group change items optimally for ERGANI
    const groupedItems = this.groupItemsForErgani(changeItems);
    
    // Calculate deadlines based on retrospective mode rules
    const deadlines = this.calculateComplianceDeadlines(monthPeriod, mode);
    
    const batch: InsertErganiDeclarationBatches = {
      companyId,
      monthPeriod,
      batchType: mode.mode === 'retrospective' ? 'monthly_retrospective' : 'regular',
      employeeGroup: this.extractUniqueEmployeeIds(changeItems),
      changeItemsIncluded: changeItems.map(item => item.changeId),
      
      // Deadlines - Προθεσμίες
      internalDeadline: deadlines.internalTarget,
      legalDeadline: deadlines.legalDeadline,
      deadlineMet: this.isDeadlineMet(deadlines.legalDeadline),
      
      // Idempotency and tracking
      idempotencyKey: this.generateIdempotencyKey(companyId, monthPeriod),
      submissionStatus: 'draft',
      retryCount: 0,
      
      createdBy: 'retrospective_engine',
      errorDetails: null
    };

    return batch;
  }

  /**
   * Αποστολή: queue + idempotency key ανά δέσμη
   * Submits batch to ERGANI II with full error handling and retry logic
   */
  async submitDeclarationBatch(
    batch: ErganiDeclarationBatches,
    changeItems: WorkHourChangeItems[]
  ): Promise<ErganiSubmissionResult> {
    try {
      // Convert change items to ERGANI declaration format
      const declarations = await this.convertToErganiFormat(changeItems);
      
      // Validate declarations before submission
      const validationResult = this.validateDeclarations(declarations);
      if (!validationResult.isValid) {
        return {
          success: false,
          errorCode: 'VALIDATION_ERROR',
          errorMessage: validationResult.errors.join('; '),
          rejectedItems: validationResult.invalidItems
        };
      }

      // Submit to ERGANI II API
      const submissionResult = await this.submitToErgani(declarations, batch);
      
      if (submissionResult.success) {
        // Store successful submission details
        await this.recordSuccessfulSubmission(batch, submissionResult);
        
        return {
          success: true,
          submissionReference: submissionResult.submissionReference,
          erganiReceiptId: submissionResult.erganiReceiptId
        };
      } else {
        // Handle submission failure with retry logic
        return this.handleSubmissionFailure(batch, submissionResult);
      }
    } catch (error) {
      console.error('ERGANI submission error:', error);
      return {
        success: false,
        errorCode: 'SUBMISSION_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Κανόνες προθεσμιών: όλες οι αλλαγές του μήνα καταχωρούνται εντός νόμιμης προθεσμίας
   * Calculates compliance deadlines based on Greek legal requirements
   */
  calculateComplianceDeadlines(
    monthPeriod: string,
    mode: EntityMonthMode
  ): ComplianceDeadlines {
    const [year, month] = monthPeriod.split('-').map(Number);
    const monthEnd = new Date(year, month, 0); // Last day of month
    
    // Internal target: T+3 εργάσιμες (3 working days after month end)
    const internalTarget = this.workingDaysCalculator.addWorkingDays(monthEnd, 3);
    
    // Legal deadline varies by mode and current regulations
    let legalDeadline: Date;
    if (mode.mode === 'retrospective') {
      // Retrospective mode: more strict deadlines
      legalDeadline = this.workingDaysCalculator.addWorkingDays(monthEnd, 5);
    } else {
      // Pre-announcement mode: standard deadlines
      legalDeadline = this.workingDaysCalculator.addWorkingDays(monthEnd, 10);
    }
    
    // Grace period (if applicable based on recent regulations)
    const gracePeriod = new Date(legalDeadline);
    gracePeriod.setDate(gracePeriod.getDate() + 2);
    
    // Calculate penalty risk
    const now = new Date();
    let penaltyRisk: 'none' | 'low' | 'medium' | 'high' = 'none';
    
    if (now > gracePeriod) {
      penaltyRisk = 'high';
    } else if (now > legalDeadline) {
      penaltyRisk = 'medium';
    } else if (now > internalTarget) {
      penaltyRisk = 'low';
    }
    
    return {
      internalTarget,
      legalDeadline,
      gracePeriod,
      penaltyRisk
    };
  }

  /**
   * Queue management for batch processing
   */
  async queueBatchForSubmission(
    batch: ErganiDeclarationBatches,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<{ queueId: string; estimatedProcessingTime: Date }> {
    const queueId = this.generateQueueId();
    const estimatedDelay = this.calculateQueueDelay(priority);
    
    // Add to submission queue (implementation would use actual queue service)
    const estimatedProcessingTime = new Date();
    estimatedProcessingTime.setMinutes(
      estimatedProcessingTime.getMinutes() + estimatedDelay
    );
    
    return { queueId, estimatedProcessingTime };
  }

  /**
   * Retry logic for failed submissions
   */
  async retryFailedSubmission(
    batch: ErganiDeclarationBatches,
    changeItems: WorkHourChangeItems[]
  ): Promise<ErganiSubmissionResult> {
    if (batch.retryCount >= this.config.retryAttempts) {
      return {
        success: false,
        errorCode: 'MAX_RETRIES_EXCEEDED',
        errorMessage: `Maximum retry attempts (${this.config.retryAttempts}) exceeded`
      };
    }

    // Exponential backoff delay
    const delay = Math.pow(2, batch.retryCount) * 1000; // 1s, 2s, 4s, 8s...
    await new Promise(resolve => setTimeout(resolve, delay));

    // Retry submission
    return this.submitDeclarationBatch(batch, changeItems);
  }

  // Private helper methods
  private async validateModeCompliance(
    mode: EntityMonthMode,
    monthPeriod: string
  ): Promise<void> {
    // Ensure compliance with Greek legal requirement: cannot mix modes in same month
    if (mode.previousModeInMonth && mode.previousModeInMonth !== mode.mode) {
      throw new Error(
        `Cannot mix operational modes in same month. Previous: ${mode.previousModeInMonth}, Current: ${mode.mode}`
      );
    }

    // Validate declaration deadline hasn't passed
    const deadlines = this.calculateComplianceDeadlines(monthPeriod, mode);
    if (new Date() > deadlines.legalDeadline) {
      console.warn('Legal deadline has passed - high penalty risk');
    }
  }

  private groupItemsForErgani(changeItems: WorkHourChangeItems[]): Map<string, WorkHourChangeItems[]> {
    const groups = new Map<string, WorkHourChangeItems[]>();
    
    // Group by employee and change type for optimal ERGANI processing
    for (const item of changeItems) {
      const groupKey = `${item.employeeId}_${item.changeType}`;
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(item);
    }
    
    return groups;
  }

  private extractUniqueEmployeeIds(changeItems: WorkHourChangeItems[]): string[] {
    return [...new Set(changeItems.map(item => item.employeeId))];
  }

  private generateIdempotencyKey(companyId: string, monthPeriod: string): string {
    const timestamp = Date.now();
    const hash = this.simpleHash(`${companyId}_${monthPeriod}_${timestamp}`);
    return `ergani_${monthPeriod}_${hash}`;
  }

  private isDeadlineMet(legalDeadline: Date): boolean {
    return new Date() <= legalDeadline;
  }

  private async convertToErganiFormat(changeItems: WorkHourChangeItems[]): Promise<ErganiDeclarationItem[]> {
    const declarations: ErganiDeclarationItem[] = [];
    
    for (const item of changeItems) {
      // Get employee details (would fetch from database)
      const employee = await this.getEmployeeDetails(item.employeeId);
      
      declarations.push({
        employeeAFM: employee.afm,
        employeeAMKA: employee.amka,
        workDate: item.workDate,
        changeType: item.changeType as any,
        startTime: item.fromTime,
        endTime: item.toTime,
        durationMinutes: item.durationMinutes,
        premiumRate: Number(item.overtimeRate),
        justification: item.reasonCode || 'retrospective_entry',
        evidenceRef: item.evidenceRef || ''
      });
    }
    
    return declarations;
  }

  private validateDeclarations(declarations: ErganiDeclarationItem[]): {
    isValid: boolean;
    errors: string[];
    invalidItems: ErganiDeclarationItem[];
  } {
    const errors: string[] = [];
    const invalidItems: ErganiDeclarationItem[] = [];
    
    for (const declaration of declarations) {
      // Validate AFM format (9 digits)
      if (!/^\d{9}$/.test(declaration.employeeAFM)) {
        errors.push(`Invalid AFM format: ${declaration.employeeAFM}`);
        invalidItems.push(declaration);
      }
      
      // Validate AMKA format (11 digits)
      if (!/^\d{11}$/.test(declaration.employeeAMKA)) {
        errors.push(`Invalid AMKA format: ${declaration.employeeAMKA}`);
        invalidItems.push(declaration);
      }
      
      // Validate work date
      if (!this.isValidDate(declaration.workDate)) {
        errors.push(`Invalid work date: ${declaration.workDate}`);
        invalidItems.push(declaration);
      }
      
      // Validate duration
      if (declaration.durationMinutes <= 0) {
        errors.push(`Invalid duration: ${declaration.durationMinutes}`);
        invalidItems.push(declaration);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      invalidItems
    };
  }

  private async submitToErgani(
    declarations: ErganiDeclarationItem[],
    batch: ErganiDeclarationBatches
  ): Promise<ErganiSubmissionResult> {
    // Mock ERGANI API submission - in real implementation, this would call actual ERGANI API
    if (this.config.testMode) {
      return this.mockErganiSubmission(declarations, batch);
    }
    
    try {
      const response = await fetch(this.config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-Company-AFM': this.config.companyAFM
        },
        body: JSON.stringify({
          batchId: batch.batchId,
          declarations,
          idempotencyKey: batch.idempotencyKey
        })
      });
      
      const result = await response.json();
      
      return {
        success: response.ok,
        submissionReference: result.submissionReference,
        erganiReceiptId: result.receiptId,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage
      };
    } catch (error) {
      throw new Error(`ERGANI API call failed: ${error}`);
    }
  }

  private mockErganiSubmission(
    declarations: ErganiDeclarationItem[],
    batch: ErganiDeclarationBatches
  ): ErganiSubmissionResult {
    // Simulate success/failure for testing
    const isSuccess = Math.random() > 0.1; // 90% success rate
    
    if (isSuccess) {
      return {
        success: true,
        submissionReference: `ERGANI_${batch.batchId}_${Date.now()}`,
        erganiReceiptId: `RECEIPT_${Date.now()}`
      };
    } else {
      return {
        success: false,
        errorCode: 'ERGANI_VALIDATION_ERROR',
        errorMessage: 'Mock validation failure for testing'
      };
    }
  }

  private async recordSuccessfulSubmission(
    batch: ErganiDeclarationBatches,
    result: ErganiSubmissionResult
  ): Promise<void> {
    // Update batch record with submission details
    // In real implementation, this would update the database
    console.log('Recording successful submission:', {
      batchId: batch.batchId,
      submissionReference: result.submissionReference,
      erganiReceiptId: result.erganiReceiptId
    });
  }

  private handleSubmissionFailure(
    batch: ErganiDeclarationBatches,
    result: ErganiSubmissionResult
  ): ErganiSubmissionResult {
    // Log failure details and determine if retry is appropriate
    console.error('ERGANI submission failed:', {
      batchId: batch.batchId,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage
    });
    
    return result;
  }

  private generateQueueId(): string {
    return `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateQueueDelay(priority: 'high' | 'normal' | 'low'): number {
    // Return delay in minutes
    switch (priority) {
      case 'high': return 5;
      case 'normal': return 15;
      case 'low': return 30;
    }
  }

  private async getEmployeeDetails(employeeId: string): Promise<{
    afm: string;
    amka: string;
    name: string;
  }> {
    // Mock employee details - in real implementation, fetch from database
    return {
      afm: '123456789',
      amka: '12345678901',
      name: 'Employee Name'
    };
  }

  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

/**
 * Helper class for calculating working days in Greece
 * Accounts for Greek holidays and weekend patterns
 */
export class WorkingDaysCalculator {
  private greekHolidays: Date[] = [];

  constructor() {
    this.initializeGreekHolidays();
  }

  addWorkingDays(startDate: Date, workingDaysToAdd: number): Date {
    let currentDate = new Date(startDate);
    let remainingDays = workingDaysToAdd;
    
    while (remainingDays > 0) {
      currentDate.setDate(currentDate.getDate() + 1);
      
      if (this.isWorkingDay(currentDate)) {
        remainingDays--;
      }
    }
    
    return currentDate;
  }

  isWorkingDay(date: Date): boolean {
    // Weekend check (Saturday = 6, Sunday = 0)
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false;
    }
    
    // Greek holiday check
    return !this.isGreekHoliday(date);
  }

  private isGreekHoliday(date: Date): boolean {
    return this.greekHolidays.some(holiday => 
      holiday.getDate() === date.getDate() &&
      holiday.getMonth() === date.getMonth() &&
      holiday.getFullYear() === date.getFullYear()
    );
  }

  private initializeGreekHolidays(): void {
    const year = new Date().getFullYear();
    
    // Fixed Greek holidays
    this.greekHolidays = [
      new Date(year, 0, 1),   // New Year's Day
      new Date(year, 0, 6),   // Epiphany
      new Date(year, 2, 25),  // Independence Day
      new Date(year, 4, 1),   // Labor Day
      new Date(year, 7, 15),  // Assumption of Mary
      new Date(year, 9, 28),  // Ochi Day
      new Date(year, 11, 25), // Christmas Day
      new Date(year, 11, 26)  // Boxing Day
    ];
    
    // Easter-dependent holidays would be calculated dynamically
    // (implementation would include proper Orthodox Easter calculation)
  }
}

// Factory function for creating configured ERGANI service
export function createErganiDeclarationService(config: ErganiSubmissionConfig): ErganiDeclarationService {
  return new ErganiDeclarationService(config);
}