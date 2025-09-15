/**
 * Compliance Connector Service - Infrastructure Layer
 * 
 * Concrete implementation of CompliancePort that handles compliance validations,
 * government system integrations (ERGANI, EFKA, AADE), and legal requirements.
 */

import { 
  CompliancePort,
  ValidationError,
  PayrollCalculationInput,
  DigitalWorkCard,
  PayrollDomainError
} from '../shared/payrollDomain.js';

import { 
  lawRegistry,
  GreekLawConstants 
} from '../shared/law-constants.js';

import { validateWorkingHours } from '../core/greekRules/workingTime.js';

// =============================================================================
// COMPLIANCE CONNECTOR SERVICE IMPLEMENTATION
// =============================================================================

export class ComplianceConnectorService implements CompliancePort {
  
  constructor(
    private config: {
      erganiEnabled: boolean;
      efkaEnabled: boolean;
      aadeEnabled: boolean;
      apiKeys?: {
        ergani?: string;
        efka?: string;
        aade?: string;
      };
    } = {
      erganiEnabled: false,
      efkaEnabled: false,
      aadeEnabled: false
    }
  ) {}

  // =============================================================================
  // VALIDATION METHODS
  // =============================================================================

  /**
   * Validate overtime caps and working time limits
   */
  async validateOvertimeCaps(input: PayrollCalculationInput): Promise<ValidationError[]> {
    try {
      const errors: ValidationError[] = [];
      
      // Get applicable law version for the period
      const law = lawRegistry.getActiveVersion(input.periodEndDate);
      
      // Validate working hours against Greek labor law
      const workingHoursValidation = validateWorkingHours(input.workingHours, law);
      
      if (!workingHoursValidation.isValid) {
        for (const violation of workingHoursValidation.violations) {
          errors.push({
            code: violation.type,
            field: 'workingHours',
            message: violation.message,
            messageGr: violation.messageGr,
            severity: 'error'
          });
        }
      }
      
      // Add warnings as validation errors with warning severity
      for (const warning of workingHoursValidation.warnings) {
        errors.push({
          code: warning.type,
          field: 'workingHours',
          message: warning.message,
          messageGr: warning.messageGr,
          severity: 'warning'
        });
      }
      
      // Additional overtime-specific validations
      await this.validateOvertimeLimits(input, law, errors);
      
      // Validate against collective agreements (if applicable)
      await this.validateCollectiveAgreementLimits(input, errors);
      
      return errors;
      
    } catch (error) {
      throw new PayrollDomainError(
        'COMPLIANCE_VALIDATION_ERROR',
        'overtimeCaps',
        `Failed to validate overtime caps: ${error instanceof Error ? error.message : String(error)}`,
        { input, originalError: error }
      );
    }
  }

  /**
   * Get law version effective for a specific date
   */
  async getLawVersionForDate(date: Date): Promise<string> {
    try {
      const lawVersion = lawRegistry.getActiveVersion(date);
      return lawVersion.version.versionId;
    } catch (error) {
      throw new PayrollDomainError(
        'LAW_VERSION_ERROR',
        'lawVersion',
        `Failed to get law version for date: ${error instanceof Error ? error.message : String(error)}`,
        { date, originalError: error }
      );
    }
  }

  /**
   * Submit digital work card to ERGANI system
   */
  async submitDigitalWorkCard(card: DigitalWorkCard): Promise<boolean> {
    try {
      if (!this.config.erganiEnabled) {
        console.warn('ERGANI integration is disabled - digital work card not submitted');
        return true; // Return true for disabled integrations to not block payroll
      }
      
      if (!this.config.apiKeys?.ergani) {
        throw new Error('ERGANI API key not configured');
      }
      
      // Validate required fields for ERGANI submission
      const validationErrors = this.validateDigitalWorkCard(card);
      if (validationErrors.length > 0) {
        throw new Error(`Digital work card validation failed: ${validationErrors.map(e => e.message).join(', ')}`);
      }
      
      // Prepare ERGANI submission payload
      const erganiPayload = this.buildErganiPayload(card);
      
      // Submit to ERGANI (mock implementation)
      const response = await this.submitToErgani(erganiPayload);
      
      if (response.success) {
        console.log(`Digital work card submitted to ERGANI for employee ${card.employeeId}`);
        return true;
      } else {
        console.error(`ERGANI submission failed: ${response.error}`);
        return false;
      }
      
    } catch (error) {
      console.error('Failed to submit digital work card:', error);
      throw new PayrollDomainError(
        'ERGANI_SUBMISSION_ERROR',
        'digitalWorkCard',
        `Failed to submit digital work card: ${error instanceof Error ? error.message : String(error)}`,
        { card, originalError: error }
      );
    }
  }

  /**
   * Validate Greek tax identifiers (AFM and AMKA)
   */
  async validateTaxIdentifiers(afm: string, amka: string): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    
    try {
      // Validate AFM (9 digits with checksum)
      const afmErrors = this.validateAFM(afm);
      errors.push(...afmErrors);
      
      // Validate AMKA (11 digits with checksum)
      const amkaErrors = this.validateAMKA(amka);
      errors.push(...amkaErrors);
      
      // If both identifiers are valid, optionally verify against AADE
      if (afmErrors.length === 0 && amkaErrors.length === 0 && this.config.aadeEnabled) {
        const aadeVerification = await this.verifyWithAADE(afm, amka);
        if (!aadeVerification.isValid) {
          errors.push({
            code: 'AADE_VERIFICATION_FAILED',
            field: 'taxIdentifiers',
            message: aadeVerification.message || 'Tax identifier verification failed',
            messageGr: 'Η επαλήθευση των φορολογικών στοιχείων απέτυχε',
            severity: 'error'
          });
        }
      }
      
      return errors;
      
    } catch (error) {
      throw new PayrollDomainError(
        'TAX_ID_VALIDATION_ERROR',
        'taxIdentifiers',
        `Failed to validate tax identifiers: ${error instanceof Error ? error.message : String(error)}`,
        { afm, amka, originalError: error }
      );
    }
  }

  // =============================================================================
  // PRIVATE VALIDATION METHODS
  // =============================================================================

  private async validateOvertimeLimits(
    input: PayrollCalculationInput,
    law: GreekLawConstants,
    errors: ValidationError[]
  ): Promise<void> {
    const { workingHours } = input;
    const limits = law.workingTimeLimits;
    
    // Daily overtime limit (3 hours per day maximum)
    if (workingHours.overtimeHours > 3) {
      errors.push({
        code: 'DAILY_OVERTIME_EXCEEDED',
        field: 'workingHours.overtimeHours',
        message: `Daily overtime hours (${workingHours.overtimeHours}) exceed legal limit of 3 hours`,
        messageGr: `Οι ημερήσιες υπερωρίες (${workingHours.overtimeHours}) υπερβαίνουν το νόμιμο όριο των 3 ωρών`,
        severity: 'error'
      });
    }
    
    // Annual overtime limit (150 hours per year for most employees)
    const annualOvertimeHours = workingHours.overtimeHours * 22; // Approximate monthly to annual
    if (annualOvertimeHours > 150) {
      errors.push({
        code: 'ANNUAL_OVERTIME_EXCEEDED',
        field: 'workingHours.overtimeHours',
        message: `Projected annual overtime (${annualOvertimeHours.toFixed(1)} hours) may exceed legal limit of 150 hours`,
        messageGr: `Οι προβλεπόμενες ετήσιες υπερωρίες (${annualOvertimeHours.toFixed(1)} ώρες) ενδέχεται να υπερβούν το νόμιμο όριο των 150 ωρών`,
        severity: 'warning'
      });
    }
    
    // Night work limitations
    if (workingHours.nightHours > 8) {
      errors.push({
        code: 'NIGHT_HOURS_EXCEEDED',
        field: 'workingHours.nightHours',
        message: `Night work hours (${workingHours.nightHours}) exceed recommended limit of 8 hours`,
        messageGr: `Οι νυχτερινές ώρες εργασίας (${workingHours.nightHours}) υπερβαίνουν το συνιστώμενο όριο των 8 ωρών`,
        severity: 'warning'
      });
    }
  }

  private async validateCollectiveAgreementLimits(
    input: PayrollCalculationInput,
    errors: ValidationError[]
  ): Promise<void> {
    // This would be expanded with specific collective agreement rules
    // For now, we implement basic tourism sector rules as an example
    
    if (input.workingHours.sundayHours > 8) {
      errors.push({
        code: 'SUNDAY_WORK_LIMIT',
        field: 'workingHours.sundayHours',
        message: 'Sunday work hours should not exceed 8 hours without special permission',
        messageGr: 'Οι ώρες εργασίας την Κυριακή δεν πρέπει να υπερβαίνουν τις 8 ώρες χωρίς ειδική άδεια',
        severity: 'warning'
      });
    }
    
    // Hotel/tourism sector may have different limits
    const totalDailyHours = input.workingHours.regularHours + input.workingHours.overtimeHours;
    if (totalDailyHours > 12) {
      errors.push({
        code: 'TOURISM_DAILY_LIMIT',
        field: 'workingHours',
        message: 'Total daily working hours in tourism sector should not exceed 12 hours',
        messageGr: 'Οι συνολικές ημερήσιες ώρες εργασίας στον τουριστικό τομέα δεν πρέπει να υπερβαίνουν τις 12 ώρες',
        severity: 'warning'
      });
    }
  }

  // =============================================================================
  // TAX IDENTIFIER VALIDATION
  // =============================================================================

  private validateAFM(afm: string): ValidationError[] {
    const errors: ValidationError[] = [];
    
    if (!afm || afm.length !== 9) {
      errors.push({
        code: 'INVALID_AFM_LENGTH',
        field: 'afm',
        message: 'AFM must be exactly 9 digits',
        messageGr: 'Το ΑΦΜ πρέπει να αποτελείται από ακριβώς 9 ψηφία',
        severity: 'error'
      });
      return errors;
    }
    
    if (!/^\d{9}$/.test(afm)) {
      errors.push({
        code: 'INVALID_AFM_FORMAT',
        field: 'afm',
        message: 'AFM must contain only digits',
        messageGr: 'Το ΑΦΜ πρέπει να περιέχει μόνο αριθμούς',
        severity: 'error'
      });
      return errors;
    }
    
    // AFM checksum validation
    const digits = afm.split('').map(Number);
    const multipliers = [256, 128, 64, 32, 16, 8, 4, 2];
    
    let sum = 0;
    for (let i = 0; i < 8; i++) {
      sum += digits[i] * multipliers[i];
    }
    
    const checkDigit = sum % 11;
    const expectedCheckDigit = checkDigit < 10 ? checkDigit : 0;
    
    if (digits[8] !== expectedCheckDigit) {
      errors.push({
        code: 'INVALID_AFM_CHECKSUM',
        field: 'afm',
        message: 'AFM checksum validation failed',
        messageGr: 'Αποτυχία επαλήθευσης ελέγχου ΑΦΜ',
        severity: 'error'
      });
    }
    
    return errors;
  }

  private validateAMKA(amka: string): ValidationError[] {
    const errors: ValidationError[] = [];
    
    if (!amka || amka.length !== 11) {
      errors.push({
        code: 'INVALID_AMKA_LENGTH',
        field: 'amka',
        message: 'AMKA must be exactly 11 digits',
        messageGr: 'Το ΑΜΚΑ πρέπει να αποτελείται από ακριβώς 11 ψηφία',
        severity: 'error'
      });
      return errors;
    }
    
    if (!/^\d{11}$/.test(amka)) {
      errors.push({
        code: 'INVALID_AMKA_FORMAT',
        field: 'amka',
        message: 'AMKA must contain only digits',
        messageGr: 'Το ΑΜΚΑ πρέπει να περιέχει μόνο αριθμούς',
        severity: 'error'
      });
      return errors;
    }
    
    // Basic AMKA validation (date part should be valid)
    const dayPart = amka.substring(0, 2);
    const monthPart = amka.substring(2, 4);
    const yearPart = amka.substring(4, 6);
    
    const day = parseInt(dayPart);
    const month = parseInt(monthPart);
    const year = parseInt(yearPart);
    
    if (day < 1 || day > 31) {
      errors.push({
        code: 'INVALID_AMKA_DAY',
        field: 'amka',
        message: 'Invalid day in AMKA',
        messageGr: 'Μη έγκυρη ημέρα στο ΑΜΚΑ',
        severity: 'error'
      });
    }
    
    if (month < 1 || month > 12) {
      errors.push({
        code: 'INVALID_AMKA_MONTH',
        field: 'amka',
        message: 'Invalid month in AMKA',
        messageGr: 'Μη έγκυρος μήνας στο ΑΜΚΑ',
        severity: 'error'
      });
    }
    
    return errors;
  }

  // =============================================================================
  // GOVERNMENT SYSTEM INTEGRATIONS (MOCK IMPLEMENTATIONS)
  // =============================================================================

  private validateDigitalWorkCard(card: DigitalWorkCard): ValidationError[] {
    const errors: ValidationError[] = [];
    
    if (!card.employeeId) {
      errors.push({
        code: 'MISSING_EMPLOYEE_ID',
        field: 'employeeId',
        message: 'Employee ID is required for digital work card',
        messageGr: 'Το ID εργαζομένου είναι υποχρεωτικό για την ψηφιακή κάρτα εργασίας',
        severity: 'error'
      });
    }
    
    if (!card.date) {
      errors.push({
        code: 'MISSING_WORK_DATE',
        field: 'date',
        message: 'Work date is required for digital work card',
        messageGr: 'Η ημερομηνία εργασίας είναι υποχρεωτική για την ψηφιακή κάρτα εργασίας',
        severity: 'error'
      });
    }
    
    if (!card.clockInTime) {
      errors.push({
        code: 'MISSING_CLOCK_IN',
        field: 'clockInTime',
        message: 'Clock in time is required for digital work card',
        messageGr: 'Η ώρα εισόδου είναι υποχρεωτική για την ψηφιακή κάρτα εργασίας',
        severity: 'error'
      });
    }
    
    return errors;
  }

  private buildErganiPayload(card: DigitalWorkCard): any {
    return {
      employeeId: card.employeeId,
      workDate: card.date.toISOString().split('T')[0],
      clockIn: card.clockInTime?.toISOString(),
      clockOut: card.clockOutTime?.toISOString(),
      breakStart: card.breakStartTime?.toISOString(),
      breakEnd: card.breakEndTime?.toISOString(),
      totalHours: card.totalHours,
      location: card.location,
      deviceId: card.deviceId
    };
  }

  private async submitToErgani(payload: any): Promise<{ success: boolean; error?: string }> {
    // Mock ERGANI submission
    // In a real implementation, this would make HTTP requests to ERGANI API
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Mock success response
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  private async verifyWithAADE(afm: string, amka: string): Promise<{ isValid: boolean; message?: string }> {
    // Mock AADE verification
    // In a real implementation, this would call AADE web services
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Mock verification result
      return { isValid: true };
    } catch (error) {
      return { 
        isValid: false, 
        message: error instanceof Error ? error.message : 'AADE verification failed' 
      };
    }
  }

  // =============================================================================
  // HEALTH CHECK
  // =============================================================================

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; integrations: Record<string, boolean> }> {
    const integrations: Record<string, boolean> = {
      ergani: this.config.erganiEnabled && !!this.config.apiKeys?.ergani,
      efka: this.config.efkaEnabled && !!this.config.apiKeys?.efka,
      aade: this.config.aadeEnabled && !!this.config.apiKeys?.aade
    };
    
    const status = Object.values(integrations).some(enabled => enabled) ? 'healthy' : 'unhealthy';
    
    return { status, integrations };
  }
}