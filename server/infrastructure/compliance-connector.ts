/**
 * Compliance Connector - Infrastructure Layer
 * 
 * Handles external service calls for compliance reporting.
 * Provides interface for ERGANI, EFKA, and other Greek authorities.
 */

import { ERGANI_COMPLIANCE, EFKA_COMPLIANCE } from '../domain/compliance-rules';

export interface ErganiSubmissionData {
  employeeId: string;
  afm: string; // Tax identification number
  amka: string; // Social security number
  firstName: string;
  lastName: string;
  workingHours: number;
  overtimeHours: number;
  grossPay: number;
  workingDays: number;
  period: string;
  submissionType: 'monthly' | 'quarterly' | 'annual';
}

export interface EfkaSubmissionData {
  employeeId: string;
  afm: string;
  amka: string;
  grossPay: number;
  contributionBase: number;
  employeeContributions: {
    main: number;
    auxiliary: number;
    unemployment: number;
  };
  employerContributions: {
    main: number;
    auxiliary: number;
    unemployment: number;
    sickness: number;
    workAccident: number;
  };
  period: string;
}

export interface ComplianceSubmissionResult {
  success: boolean;
  submissionId?: string;
  referenceNumber?: string;
  submittedAt: Date;
  errors?: string[];
  warnings?: string[];
}

export interface ComplianceValidationResult {
  isValid: boolean;
  missingFields: string[];
  invalidFields: Array<{
    field: string;
    reason: string;
  }>;
  warnings: string[];
}

export class ComplianceConnector {

  /**
   * Validate data for ERGANI submission
   */
  validateErganiSubmission(data: ErganiSubmissionData): ComplianceValidationResult {
    const missingFields: string[] = [];
    const invalidFields: Array<{ field: string; reason: string }> = [];
    const warnings: string[] = [];

    // Check required fields
    for (const field of ERGANI_COMPLIANCE.requiredFields) {
      const value = data[field as keyof ErganiSubmissionData];
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        missingFields.push(field);
      }
    }

    // Validate AFM format (Greek tax number - 9 digits)
    if (data.afm && !/^\d{9}$/.test(data.afm)) {
      invalidFields.push({
        field: 'afm',
        reason: 'AFM must be exactly 9 digits'
      });
    }

    // Validate AMKA format (Greek social security number - 11 digits)
    if (data.amka && !/^\d{11}$/.test(data.amka)) {
      invalidFields.push({
        field: 'amka',
        reason: 'AMKA must be exactly 11 digits'
      });
    }

    // Validate working hours
    if (data.workingHours > ERGANI_COMPLIANCE.maxMonthlyHours) {
      warnings.push(`Working hours ${data.workingHours} exceed maximum monthly hours ${ERGANI_COMPLIANCE.maxMonthlyHours}`);
    }

    // Validate overtime hours with pre-approval requirement
    if (data.overtimeHours > 0 && ERGANI_COMPLIANCE.overtimeRequiresPreApproval) {
      warnings.push('Overtime hours require pre-approval for ERGANI compliance');
    }

    // Validate period format
    if (data.period && !/^\d{4}-\d{2}$/.test(data.period)) {
      invalidFields.push({
        field: 'period',
        reason: 'Period must be in YYYY-MM format'
      });
    }

    return {
      isValid: missingFields.length === 0 && invalidFields.length === 0,
      missingFields,
      invalidFields,
      warnings
    };
  }

  /**
   * Submit data to ERGANI system
   */
  async submitToErgani(
    submissions: ErganiSubmissionData[],
    submissionType: 'monthly' | 'quarterly' | 'annual' = 'monthly'
  ): Promise<ComplianceSubmissionResult> {
    try {
      // Validate all submissions first
      for (const submission of submissions) {
        const validation = this.validateErganiSubmission(submission);
        if (!validation.isValid) {
          return {
            success: false,
            submittedAt: new Date(),
            errors: [
              ...validation.missingFields.map(f => `Missing field: ${f}`),
              ...validation.invalidFields.map(f => `Invalid field ${f.field}: ${f.reason}`)
            ]
          };
        }
      }

      // In a real implementation, this would make HTTP calls to ERGANI API
      // For now, we'll simulate the submission
      const submissionId = this.generateSubmissionId();
      const referenceNumber = this.generateReferenceNumber('ERGANI');

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if submission is within deadline
      const now = new Date();
      const deadline = new Date(now.getFullYear(), now.getMonth() + 1, ERGANI_COMPLIANCE.monthlySubmissionDeadline);
      const warnings = [];
      
      if (now > deadline) {
        warnings.push('Submission is past the monthly deadline');
      }

      console.log(`[ERGANI] Simulated submission of ${submissions.length} records`, {
        submissionId,
        referenceNumber,
        submissionType
      });

      return {
        success: true,
        submissionId,
        referenceNumber,
        submittedAt: new Date(),
        warnings
      };

    } catch (error) {
      console.error('[ERGANI] Submission failed:', error);
      return {
        success: false,
        submittedAt: new Date(),
        errors: [`Submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Validate data for EFKA submission
   */
  validateEfkaSubmission(data: EfkaSubmissionData): ComplianceValidationResult {
    const missingFields: string[] = [];
    const invalidFields: Array<{ field: string; reason: string }> = [];
    const warnings: string[] = [];

    // Check required fields
    const requiredFields = ['employeeId', 'afm', 'amka', 'grossPay', 'contributionBase'];
    for (const field of requiredFields) {
      const value = data[field as keyof EfkaSubmissionData];
      if (!value) {
        missingFields.push(field);
      }
    }

    // Validate AFM format
    if (data.afm && !/^\d{9}$/.test(data.afm)) {
      invalidFields.push({
        field: 'afm',
        reason: 'AFM must be exactly 9 digits'
      });
    }

    // Validate AMKA format
    if (data.amka && !/^\d{11}$/.test(data.amka)) {
      invalidFields.push({
        field: 'amka',
        reason: 'AMKA must be exactly 11 digits'
      });
    }

    // Validate contribution base
    if (data.contributionBase < EFKA_COMPLIANCE.minimumContributionBase) {
      invalidFields.push({
        field: 'contributionBase',
        reason: `Contribution base must be at least ${EFKA_COMPLIANCE.minimumContributionBase}`
      });
    }

    if (data.contributionBase > EFKA_COMPLIANCE.maximumContributionBase) {
      warnings.push(`Contribution base ${data.contributionBase} exceeds maximum ${EFKA_COMPLIANCE.maximumContributionBase}`);
    }

    // Validate contribution amounts
    const totalEmployeeContributions = Object.values(data.employeeContributions).reduce((sum, val) => sum + val, 0);
    const totalEmployerContributions = Object.values(data.employerContributions).reduce((sum, val) => sum + val, 0);

    if (totalEmployeeContributions <= 0) {
      invalidFields.push({
        field: 'employeeContributions',
        reason: 'Employee contributions must be greater than zero'
      });
    }

    if (totalEmployerContributions <= 0) {
      invalidFields.push({
        field: 'employerContributions',
        reason: 'Employer contributions must be greater than zero'
      });
    }

    return {
      isValid: missingFields.length === 0 && invalidFields.length === 0,
      missingFields,
      invalidFields,
      warnings
    };
  }

  /**
   * Submit contributions to EFKA system
   */
  async submitToEfka(submissions: EfkaSubmissionData[]): Promise<ComplianceSubmissionResult> {
    try {
      // Validate all submissions first
      for (const submission of submissions) {
        const validation = this.validateEfkaSubmission(submission);
        if (!validation.isValid) {
          return {
            success: false,
            submittedAt: new Date(),
            errors: [
              ...validation.missingFields.map(f => `Missing field: ${f}`),
              ...validation.invalidFields.map(f => `Invalid field ${f.field}: ${f.reason}`)
            ]
          };
        }
      }

      // In a real implementation, this would make HTTP calls to EFKA API
      const submissionId = this.generateSubmissionId();
      const referenceNumber = this.generateReferenceNumber('EFKA');

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Check if submission is within deadline
      const now = new Date();
      const deadline = new Date(now.getFullYear(), now.getMonth() + 1, EFKA_COMPLIANCE.monthlyContributionDeadline);
      const warnings = [];
      
      if (now > deadline) {
        warnings.push('Contribution submission is past the monthly deadline');
      }

      console.log(`[EFKA] Simulated submission of ${submissions.length} contribution records`, {
        submissionId,
        referenceNumber
      });

      return {
        success: true,
        submissionId,
        referenceNumber,
        submittedAt: new Date(),
        warnings
      };

    } catch (error) {
      console.error('[EFKA] Submission failed:', error);
      return {
        success: false,
        submittedAt: new Date(),
        errors: [`Submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Check submission status with external system
   */
  async checkSubmissionStatus(
    submissionId: string,
    system: 'ERGANI' | 'EFKA'
  ): Promise<{
    status: 'pending' | 'accepted' | 'rejected' | 'processing';
    message?: string;
    processedAt?: Date;
  }> {
    try {
      // Simulate API call to check status
      await new Promise(resolve => setTimeout(resolve, 500));

      // Simulate different statuses based on submission ID
      const statuses = ['pending', 'accepted', 'rejected', 'processing'] as const;
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

      console.log(`[${system}] Checked submission status for ${submissionId}: ${randomStatus}`);

      return {
        status: randomStatus,
        message: randomStatus === 'rejected' ? 'Data validation failed' : undefined,
        processedAt: randomStatus === 'accepted' ? new Date() : undefined
      };

    } catch (error) {
      console.error(`[${system}] Failed to check submission status:`, error);
      return {
        status: 'pending',
        message: 'Unable to check status - system unavailable'
      };
    }
  }

  /**
   * Download compliance report from external system
   */
  async downloadComplianceReport(
    period: string,
    reportType: 'payroll' | 'contributions' | 'taxes',
    system: 'ERGANI' | 'EFKA'
  ): Promise<{
    success: boolean;
    reportData?: Buffer;
    fileName?: string;
    error?: string;
  }> {
    try {
      // Simulate report download
      await new Promise(resolve => setTimeout(resolve, 2000));

      const fileName = `${system}_${reportType}_${period}.pdf`;
      
      // In a real implementation, this would download actual report data
      const reportData = Buffer.from(`Mock ${system} ${reportType} report for ${period}`);

      console.log(`[${system}] Downloaded compliance report: ${fileName}`);

      return {
        success: true,
        reportData,
        fileName
      };

    } catch (error) {
      console.error(`[${system}] Failed to download report:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate unique submission ID
   */
  private generateSubmissionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `SUB_${timestamp}_${random}`.toUpperCase();
  }

  /**
   * Generate reference number for external system
   */
  private generateReferenceNumber(system: string): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const sequence = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    
    return `${system}_${year}${month}${day}_${sequence}`;
  }
}

// Export singleton instance
export const complianceConnector = new ComplianceConnector();