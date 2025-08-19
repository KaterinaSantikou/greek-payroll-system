import { SepaFileGenerator } from './sepaFileGenerator';

export interface EngineValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  processingMode: string;
  executionDate: Date;
  correlationId: string;
}

export interface PaymentData {
  id: string;
  employeeName: string;
  iban: string;
  bic?: string;
  amount: number;
  remittanceInfo: string;
  paymentType: 'REGULAR' | 'URGENT' | 'CORRECTION';
}

export class SepaEngineValidator {
  private sepaGenerator: SepaFileGenerator;

  constructor() {
    this.sepaGenerator = new SepaFileGenerator();
  }

  /**
   * Comprehensive engine behavior validation per bank profile
   * Validates pain.001 schema & bank-specific rules (IBAN, BIC, length limits)
   * Enforces cut-off windows and schedules ReqdExctnDt accordingly
   * Generates pain.002 correlation and auto-retries on transient errors
   * Optional SCT Inst switch for urgent off-cycle payments
   */
  async validateEngineExecution(
    bankProfile: string,
    payments: PaymentData[],
    requestedExecutionDate?: Date
  ): Promise<EngineValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Step 1: Validate pain.001 schema & bank-specific rules
    const schemaValidation = this.validatePaymentsSchema(bankProfile, payments);
    if (!schemaValidation.valid) {
      errors.push(...schemaValidation.schemaErrors);
      errors.push(...schemaValidation.bankSpecificErrors);
    }

    // Step 2: Enforce cut-off windows and schedule ReqdExctnDt
    const cutoffResult = this.sepaGenerator.enforceCutoffWindows(bankProfile, requestedExecutionDate);
    if (!cutoffResult.withinCutoff) {
      warnings.push(`Request submitted after ${cutoffResult.cutoffTime} cut-off, scheduled for ${cutoffResult.processingMode}`);
    }

    // Step 3: Generate pain.002 correlation for tracking
    const messageId = `PAYROLL-${Date.now()}`;
    const correlationResult = this.sepaGenerator.generatePain002Correlation(messageId, bankProfile);

    // Step 4: Evaluate SCT Instant switch for urgent payments
    const urgentPayments = payments.filter(p => p.paymentType === 'URGENT' || p.paymentType === 'CORRECTION');
    let finalProcessingMode = cutoffResult.processingMode;

    if (urgentPayments.length > 0) {
      const sctEvaluation = this.sepaGenerator.evaluateSCTInstantSwitch(
        bankProfile, 
        urgentPayments[0].paymentType,
        urgentPayments.reduce((sum, p) => sum + p.amount, 0)
      );
      
      if (sctEvaluation.sctInstantEnabled) {
        finalProcessingMode = 'SCT_INST';
        warnings.push(`Switched to SCT Instant for urgent payments: ${sctEvaluation.reason}`);
      } else {
        warnings.push(`SCT Instant not available: ${sctEvaluation.reason}, using ${sctEvaluation.recommendedMode}`);
      }
    }

    // Step 5: Final validation summary
    const valid = errors.length === 0;

    return {
      valid,
      errors,
      warnings,
      processingMode: finalProcessingMode,
      executionDate: cutoffResult.executionDate,
      correlationId: correlationResult.correlationId
    };
  }

  private validatePaymentsSchema(bankProfile: string, payments: PaymentData[]): {
    valid: boolean;
    schemaErrors: string[];
    bankSpecificErrors: string[];
  } {
    const sepaData = {
      Document: {
        CstmrCdtTrfInitn: {
          GrpHdr: { MsgId: `PAYROLL-${Date.now()}` },
          PmtInf: payments
        }
      },
      payments
    };

    return this.sepaGenerator.validatePain001Schema(bankProfile, sepaData);
  }

  /**
   * Auto-retry logic for transient errors with exponential backoff
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    bankProfile: string,
    maxRetries: number = 3
  ): Promise<T> {
    const correlationResult = this.sepaGenerator.generatePain002Correlation(
      `RETRY-${Date.now()}`, 
      bankProfile
    );

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Check if error is transient
        const isTransient = correlationResult.retryPolicy.transientErrorCodes.some(code => 
          lastError?.message.includes(code)
        );

        if (!isTransient || attempt === maxRetries) {
          throw lastError;
        }

        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Surface rejects and generate actionable error messages
   */
  surfaceRejects(pain002Response: any): {
    rejectedPayments: Array<{
      paymentId: string;
      rejectReason: string;
      actionRequired: string;
    }>;
    acceptedPayments: string[];
  } {
    const rejectedPayments: Array<{
      paymentId: string;
      rejectReason: string;
      actionRequired: string;
    }> = [];
    const acceptedPayments: string[] = [];

    // Parse pain.002 status report
    if (pain002Response?.Document?.CstmrPmtStsRpt?.OrgnlPmtInfAndSts) {
      const statusInfo = pain002Response.Document.CstmrPmtStsRpt.OrgnlPmtInfAndSts;
      
      statusInfo.TxInfAndSts?.forEach((txStatus: any) => {
        const paymentId = txStatus.OrgnlTxRef?.MsgId || 'UNKNOWN';
        const statusCode = txStatus.TxSts;

        if (statusCode === 'RJCT') {
          const reasonCode = txStatus.StsRsnInf?.Rsn?.Cd || 'UNKNOWN';
          rejectedPayments.push({
            paymentId,
            rejectReason: this.mapRejectReason(reasonCode),
            actionRequired: this.getActionRequired(reasonCode)
          });
        } else if (['ACCP', 'ACSC', 'ACSP'].includes(statusCode)) {
          acceptedPayments.push(paymentId);
        }
      });
    }

    return { rejectedPayments, acceptedPayments };
  }

  private mapRejectReason(code: string): string {
    const reasonMap: Record<string, string> = {
      'AC01': 'Incorrect account number',
      'AC04': 'Closed account number',
      'AC06': 'Blocked account',
      'AG01': 'Credit transfer forbidden on this type of account',
      'AM01': 'Zero amount not allowed',
      'AM02': 'Amount exceeds agreed limit',
      'BE01': 'Inconsistent with end customer',
      'CURR': 'Incorrect currency',
      'DT01': 'Invalid date',
      'RF01': 'Not unique transaction reference',
      'RR01': 'Missing debtor address',
      'RR02': 'Missing debtor name or identification',
      'RR03': 'Missing creditor name or identification',
      'RR04': 'Regulatory reason'
    };

    return reasonMap[code] || `Unknown reject reason: ${code}`;
  }

  private getActionRequired(code: string): string {
    const actionMap: Record<string, string> = {
      'AC01': 'Verify and correct IBAN',
      'AC04': 'Contact employee for updated bank details',
      'AC06': 'Contact employee - account may be frozen',
      'AG01': 'Use different account type',
      'AM01': 'Check payroll calculation - zero amount detected',
      'AM02': 'Split payment or increase account limit',
      'BE01': 'Verify employee details match bank records',
      'CURR': 'Ensure EUR currency is used',
      'DT01': 'Check execution date format',
      'RF01': 'Generate unique payment reference',
      'RR01': 'Add complete debtor address',
      'RR02': 'Verify debtor identification',
      'RR03': 'Verify creditor identification',
      'RR04': 'Contact bank for regulatory requirements'
    };

    return actionMap[code] || 'Contact bank for resolution';
  }
}