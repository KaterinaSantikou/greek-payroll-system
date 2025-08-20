/**
 * Edge Case Handler - Robust handling for payment system edge cases
 */

import { SafetyComplianceService } from './safetyComplianceService';
import { WebhookService } from './webhookService';

export interface PartialRejectResult {
  batch_id: string;
  status: 'partially_accepted';
  totals: {
    submitted: number;
    accepted: number;
    rejected: number;
  };
  rejected_lines: Array<{
    line_id: string;
    employee_id: string;
    reason_code: string;
    reason_description: string;
    amount: number;
    suggested_action: string;
  }>;
  accepted_lines: Array<{
    line_id: string;
    employee_id: string;
    amount: number;
    status: 'accepted';
  }>;
  next_steps: string[];
}

export interface BankOfflineStatus {
  bank_id: string;
  bank_name: string;
  status: 'offline' | 'degraded' | 'online';
  last_successful_contact: string;
  offline_duration_minutes: number;
  ingestion_paused: boolean;
  allow_reissue: boolean;
  stale_badge: boolean;
  pending_reconciliations: number;
  estimated_recovery: string;
}

export interface InstantLimitCheck {
  amount: number;
  currency: string;
  bank_id: string;
  instant_limit: number;
  over_limit: boolean;
  can_process_instant: boolean;
  explanation: string;
  alternatives: string[];
}

export interface IBANCorrectionWorkflow {
  line_id: string;
  original_iban: string;
  reason_code: 'AC04' | 'FF05';
  reason_description: string;
  suggested_corrections: Array<{
    corrected_iban: string;
    confidence_score: number;
    validation_result: 'valid' | 'invalid' | 'suspicious';
    correction_type: 'checksum_fix' | 'format_fix' | 'bank_lookup' | 'manual_review';
  }>;
  workflow_actions: string[];
  requires_approval: boolean;
}

export interface TimeZoneInfo {
  athens_time: string;
  utc_time: string;
  dst_active: boolean;
  cutoff_athens: string;
  cutoff_utc: string;
  time_to_cutoff_minutes: number;
}

export class EdgeCaseHandler {
  private static bankStatuses = new Map<string, BankOfflineStatus>();
  private static instantLimits = new Map<string, number>();

  static {
    // Initialize bank limits and statuses
    this.initializeBankData();
  }

  // =============================================================================
  // PARTIAL REJECTS HANDLING
  // =============================================================================

  /**
   * Process partial batch rejection
   */
  static async handlePartialReject(
    batchId: string,
    submittedLines: any[],
    acceptedLineIds: string[],
    rejectedLines: Array<{ line_id: string; reason_code: string; employee_id: string; amount: number }>
  ): Promise<PartialRejectResult> {
    const accepted = submittedLines.filter(line => acceptedLineIds.includes(line.line_id));
    const rejected = rejectedLines.map(reject => {
      const line = submittedLines.find(l => l.line_id === reject.line_id);
      return {
        ...reject,
        reason_description: this.getReasonDescription(reject.reason_code),
        suggested_action: this.getSuggestedAction(reject.reason_code)
      };
    });

    const result: PartialRejectResult = {
      batch_id: batchId,
      status: 'partially_accepted',
      totals: {
        submitted: submittedLines.length,
        accepted: accepted.length,
        rejected: rejected.length
      },
      rejected_lines: rejected,
      accepted_lines: accepted.map(line => ({
        line_id: line.line_id,
        employee_id: line.employee_id,
        amount: line.amount,
        status: 'accepted' as const
      })),
      next_steps: this.generatePartialRejectNextSteps(rejected)
    };

    // Log audit event for partial rejection
    await SafetyComplianceService.logAuditEvent({
      eventType: 'batch_partial_reject',
      operatorId: 'system',
      entityId: batchId,
      metadata: {
        total_lines: submittedLines.length,
        accepted_count: accepted.length,
        rejected_count: rejected.length,
        reject_reasons: rejected.map(r => r.reason_code)
      }
    });

    // Trigger webhook for partial rejection
    await WebhookService.sendPaymentsBatchUpdatedEvent('default-partner', {
      batchId,
      status: 'partially_accepted',
      counters: result.totals
    });

    return result;
  }

  private static getReasonDescription(reasonCode: string): string {
    const descriptions: { [key: string]: string } = {
      'AC04': 'Closed account - Account has been closed by the beneficiary bank',
      'AC06': 'Account blocked - Account is temporarily or permanently blocked',
      'AM04': 'Insufficient funds - Debtor account has insufficient funds',
      'FF05': 'Invalid IBAN format - IBAN format is incorrect or invalid',
      'AG01': 'Transaction not supported - Credit transfer not supported',
      'BE05': 'Unrecognized beneficiary - Beneficiary details not recognized',
      'RR01': 'Regulatory reason - Transaction blocked for regulatory compliance',
      'DT01': 'Invalid date/time - Transaction date/time is invalid'
    };
    return descriptions[reasonCode] || 'Unknown rejection reason';
  }

  private static getSuggestedAction(reasonCode: string): string {
    const actions: { [key: string]: string } = {
      'AC04': 'Request updated account details from employee',
      'AC06': 'Contact employee to resolve account blocking',
      'AM04': 'Verify debtor account balance before retry',
      'FF05': 'Validate and correct IBAN format',
      'AG01': 'Use alternative payment method or bank',
      'BE05': 'Verify beneficiary name and account details',
      'RR01': 'Review transaction for compliance requirements',
      'DT01': 'Adjust transaction timing and resubmit'
    };
    return actions[reasonCode] || 'Contact bank for resolution guidance';
  }

  private static generatePartialRejectNextSteps(rejectedLines: any[]): string[] {
    const steps = ['Review rejected payment lines for correction opportunities'];
    
    if (rejectedLines.some(r => ['AC04', 'FF05'].includes(r.reason_code))) {
      steps.push('Initialize IBAN correction workflows for invalid accounts');
    }
    
    if (rejectedLines.some(r => r.reason_code === 'AM04')) {
      steps.push('Verify debtor account balance before re-processing');
    }
    
    steps.push('Create corrective batch for rejected lines after fixes');
    steps.push('Continue monitoring accepted lines for settlement');
    
    return steps;
  }

  // =============================================================================
  // BANK OFFLINE HANDLING  
  // =============================================================================

  /**
   * Set bank offline status
   */
  static setBankOfflineStatus(bankId: string, status: 'offline' | 'degraded' | 'online'): void {
    const existing = this.bankStatuses.get(bankId);
    const now = new Date();
    
    if (existing) {
      existing.status = status;
      if (status === 'offline' || status === 'degraded') {
        existing.ingestion_paused = true;
        existing.allow_reissue = false;
        existing.stale_badge = true;
        existing.offline_duration_minutes = Math.round(
          (now.getTime() - new Date(existing.last_successful_contact).getTime()) / (1000 * 60)
        );
      } else {
        existing.ingestion_paused = false;
        existing.allow_reissue = true;
        existing.stale_badge = false;
        existing.last_successful_contact = now.toISOString();
        existing.offline_duration_minutes = 0;
      }
    }
  }

  /**
   * Get bank offline status
   */
  static getBankOfflineStatus(bankId: string): BankOfflineStatus | undefined {
    return this.bankStatuses.get(bankId);
  }

  /**
   * Check if re-issue allowed for bank
   */
  static isReissueAllowedForBank(bankId: string): { allowed: boolean; reason?: string } {
    const status = this.bankStatuses.get(bankId);
    
    if (!status) {
      return { allowed: false, reason: 'Bank status unknown' };
    }
    
    if (status.status === 'offline') {
      return { 
        allowed: false, 
        reason: 'Bank is offline - reissue blocked to prevent double debit' 
      };
    }
    
    if (status.status === 'degraded') {
      return {
        allowed: false,
        reason: 'Bank connection degraded - waiting for reconciliation before allowing reissue'
      };
    }
    
    return { allowed: true };
  }

  /**
   * Get all bank statuses
   */
  static getAllBankStatuses(): BankOfflineStatus[] {
    return Array.from(this.bankStatuses.values());
  }

  // =============================================================================
  // INSTANT LIMIT CHECKING
  // =============================================================================

  /**
   * Check amount against instant limits
   */
  static checkInstantLimit(amount: number, currency: string, bankId: string): InstantLimitCheck {
    const limit = this.instantLimits.get(bankId) || 15000; // Default €15,000 for most EU banks
    const overLimit = amount > limit;
    
    const result: InstantLimitCheck = {
      amount,
      currency,
      bank_id: bankId,
      instant_limit: limit,
      over_limit: overLimit,
      can_process_instant: !overLimit,
      explanation: overLimit 
        ? `Amount €${amount.toLocaleString()} exceeds instant payment limit of €${limit.toLocaleString()} for ${bankId}`
        : `Amount €${amount.toLocaleString()} is within instant payment limit of €${limit.toLocaleString()}`,
      alternatives: overLimit ? [
        'Process as standard SCT (next business day settlement)',
        'Split into multiple instant payments under limit',
        'Request instant limit increase from bank',
        'Use high-value payment channel if available'
      ] : []
    };

    return result;
  }

  /**
   * Block instant re-issue if over limit
   */
  static validateInstantReissue(amount: number, bankId: string): { allowed: boolean; reason?: string; limit_info?: InstantLimitCheck } {
    const limitCheck = this.checkInstantLimit(amount, 'EUR', bankId);
    
    if (limitCheck.over_limit) {
      return {
        allowed: false,
        reason: `Instant reissue blocked: ${limitCheck.explanation}`,
        limit_info: limitCheck
      };
    }
    
    return { allowed: true };
  }

  // =============================================================================
  // IBAN CORRECTION WORKFLOWS
  // =============================================================================

  /**
   * Create IBAN correction workflow
   */
  static async createIBANCorrectionWorkflow(
    lineId: string, 
    originalIBAN: string, 
    reasonCode: 'AC04' | 'FF05'
  ): Promise<IBANCorrectionWorkflow> {
    const suggestions = this.generateIBANSuggestions(originalIBAN, reasonCode);
    
    const workflow: IBANCorrectionWorkflow = {
      line_id: lineId,
      original_iban: originalIBAN,
      reason_code: reasonCode,
      reason_description: this.getReasonDescription(reasonCode),
      suggested_corrections: suggestions,
      workflow_actions: this.generateCorrectionActions(reasonCode, suggestions),
      requires_approval: suggestions.some(s => s.confidence_score < 90)
    };

    // Log correction workflow creation
    await SafetyComplianceService.logAuditEvent({
      eventType: 'iban_correction_workflow_created',
      operatorId: 'system',
      entityId: lineId,
      metadata: {
        original_iban: originalIBAN,
        reason_code: reasonCode,
        suggestions_count: suggestions.length,
        requires_approval: workflow.requires_approval
      }
    });

    return workflow;
  }

  private static generateIBANSuggestions(originalIBAN: string, reasonCode: 'AC04' | 'FF05'): Array<{
    corrected_iban: string;
    confidence_score: number;
    validation_result: 'valid' | 'invalid' | 'suspicious';
    correction_type: 'checksum_fix' | 'format_fix' | 'bank_lookup' | 'manual_review';
  }> {
    const suggestions = [];
    
    if (reasonCode === 'FF05') {
      // Format issues - try to fix
      if (originalIBAN.length < 15) {
        suggestions.push({
          corrected_iban: originalIBAN.padEnd(27, '0'),
          confidence_score: 60,
          validation_result: 'suspicious' as const,
          correction_type: 'format_fix' as const
        });
      }
      
      // Try checksum correction
      const checksumFixed = this.attemptChecksumFix(originalIBAN);
      if (checksumFixed !== originalIBAN) {
        suggestions.push({
          corrected_iban: checksumFixed,
          confidence_score: 75,
          validation_result: 'valid' as const,
          correction_type: 'checksum_fix' as const
        });
      }
    }

    if (reasonCode === 'AC04') {
      // Closed account - suggest manual review
      suggestions.push({
        corrected_iban: originalIBAN,
        confidence_score: 10,
        validation_result: 'invalid' as const,
        correction_type: 'manual_review' as const
      });
    }

    return suggestions;
  }

  private static attemptChecksumFix(iban: string): string {
    // Simplified IBAN checksum fix - in production would use proper IBAN validation library
    if (iban.length >= 4) {
      const countryCode = iban.substring(0, 2);
      const accountNumber = iban.substring(4);
      
      // Mock checksum calculation
      const newCheckDigits = '16'; // Placeholder
      return `${countryCode}${newCheckDigits}${accountNumber}`;
    }
    return iban;
  }

  private static generateCorrectionActions(reasonCode: string, suggestions: any[]): string[] {
    const baseActions = [
      'Review original IBAN for data entry errors',
      'Contact employee for updated account information'
    ];

    if (reasonCode === 'FF05' && suggestions.length > 0) {
      baseActions.push('Apply suggested format corrections automatically');
      baseActions.push('Validate corrected IBAN through bank verification service');
    }

    if (reasonCode === 'AC04') {
      baseActions.push('Request new active account details from employee');
      baseActions.push('Verify account closure reason with beneficiary bank');
    }

    baseActions.push('Create corrective payment line for batch resubmission');
    return baseActions;
  }

  // =============================================================================
  // TIME ZONE & DST HANDLING
  // =============================================================================

  /**
   * Get current time zone information for Europe/Athens
   */
  static getTimeZoneInfo(cutoffTime: string = '16:00'): TimeZoneInfo {
    const now = new Date();
    
    // Create Athens time
    const athensTime = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Athens',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(now);

    // Check if DST is active in Athens
    const winterTime = new Date(now.getFullYear(), 0, 1); // January 1st
    const summerTime = new Date(now.getFullYear(), 6, 1); // July 1st
    
    const winterOffset = this.getTimezoneOffset(winterTime, 'Europe/Athens');
    const summerOffset = this.getTimezoneOffset(summerTime, 'Europe/Athens');
    const currentOffset = this.getTimezoneOffset(now, 'Europe/Athens');
    
    const dstActive = currentOffset !== winterOffset;

    // Calculate cut-off times
    const [cutoffHour, cutoffMinute] = cutoffTime.split(':').map(Number);
    const cutoffAthens = new Date(now);
    cutoffAthens.setHours(cutoffHour, cutoffMinute, 0, 0);

    // Convert to UTC
    const cutoffUtc = new Date(cutoffAthens.getTime() - (currentOffset * 60 * 1000));

    // Time to cut-off
    const timeToCutoff = Math.max(0, cutoffAthens.getTime() - now.getTime());
    const minutesToCutoff = Math.floor(timeToCutoff / (1000 * 60));

    return {
      athens_time: athensTime,
      utc_time: now.toISOString(),
      dst_active: dstActive,
      cutoff_athens: cutoffTime,
      cutoff_utc: cutoffUtc.toISOString().substring(11, 16), // HH:MM format
      time_to_cutoff_minutes: minutesToCutoff
    };
  }

  private static getTimezoneOffset(date: Date, timeZone: string): number {
    const utcDate = new Date(date.toLocaleString('en-US', {timeZone: 'UTC'}));
    const localDate = new Date(date.toLocaleString('en-US', {timeZone}));
    return (utcDate.getTime() - localDate.getTime()) / (1000 * 60); // minutes
  }

  /**
   * Validate cut-off compliance with DST consideration
   */
  static validateCutoffCompliance(
    submitTime: Date = new Date(),
    cutoffTime: string = '16:00',
    bankId: string
  ): {
    submitted_before_cutoff: boolean;
    cutoff_info: TimeZoneInfo;
    time_until_cutoff_minutes: number;
    warning?: string;
  } {
    const tzInfo = this.getTimeZoneInfo(cutoffTime);
    const submitTimeAthens = new Date(submitTime.toLocaleString('en-US', {timeZone: 'Europe/Athens'}));
    
    const [cutoffHour, cutoffMinute] = cutoffTime.split(':').map(Number);
    const cutoffDateTime = new Date(submitTimeAthens);
    cutoffDateTime.setHours(cutoffHour, cutoffMinute, 0, 0);
    
    const beforeCutoff = submitTimeAthens <= cutoffDateTime;
    const minutesUntilCutoff = Math.floor((cutoffDateTime.getTime() - submitTimeAthens.getTime()) / (1000 * 60));
    
    let warning: string | undefined;
    if (!beforeCutoff) {
      warning = `Submission after cut-off (${cutoffTime} Athens time). Payment will be processed next business day.`;
    } else if (minutesUntilCutoff < 30) {
      warning = `Approaching cut-off time. Only ${minutesUntilCutoff} minutes remaining for same-day processing.`;
    }

    return {
      submitted_before_cutoff: beforeCutoff,
      cutoff_info: tzInfo,
      time_until_cutoff_minutes: minutesUntilCutoff,
      warning
    };
  }

  // =============================================================================
  // INITIALIZATION
  // =============================================================================

  private static initializeBankData(): void {
    // Initialize bank offline statuses
    const banks = [
      { id: 'alpha', name: 'Alpha Bank', limit: 15000 },
      { id: 'piraeus', name: 'Piraeus Bank', limit: 20000 },
      { id: 'eurobank', name: 'Eurobank', limit: 15000 },
      { id: 'nbg', name: 'National Bank of Greece', limit: 25000 }
    ];

    banks.forEach(bank => {
      this.bankStatuses.set(bank.id, {
        bank_id: bank.id,
        bank_name: bank.name,
        status: 'online',
        last_successful_contact: new Date().toISOString(),
        offline_duration_minutes: 0,
        ingestion_paused: false,
        allow_reissue: true,
        stale_badge: false,
        pending_reconciliations: 0,
        estimated_recovery: 'N/A'
      });

      this.instantLimits.set(bank.id, bank.limit);
    });

    console.log('Edge case handler initialized with bank data');
  }

  /**
   * Get comprehensive edge case status
   */
  static getEdgeCaseStatus(): {
    partial_rejects: {
      total_partial_batches: number;
      pending_corrections: number;
    };
    bank_connectivity: {
      online_banks: number;
      offline_banks: number;
      degraded_banks: number;
    };
    instant_limits: {
      banks_with_limits: number;
      average_limit: number;
      blocked_reissues: number;
    };
    iban_corrections: {
      active_workflows: number;
      pending_approvals: number;
    };
    timezone_compliance: {
      athens_time: string;
      dst_active: boolean;
      next_cutoff: string;
    };
  } {
    const bankStatuses = Array.from(this.bankStatuses.values());
    const tzInfo = this.getTimeZoneInfo();
    
    return {
      partial_rejects: {
        total_partial_batches: 12, // Mock data
        pending_corrections: 8
      },
      bank_connectivity: {
        online_banks: bankStatuses.filter(b => b.status === 'online').length,
        offline_banks: bankStatuses.filter(b => b.status === 'offline').length,
        degraded_banks: bankStatuses.filter(b => b.status === 'degraded').length
      },
      instant_limits: {
        banks_with_limits: this.instantLimits.size,
        average_limit: Array.from(this.instantLimits.values()).reduce((a, b) => a + b, 0) / this.instantLimits.size,
        blocked_reissues: 3 // Mock data
      },
      iban_corrections: {
        active_workflows: 5, // Mock data
        pending_approvals: 2
      },
      timezone_compliance: {
        athens_time: tzInfo.athens_time,
        dst_active: tzInfo.dst_active,
        next_cutoff: tzInfo.cutoff_athens
      }
    };
  }
}