/**
 * Edge Case Handler - Robust handling for payment system edge cases
 */

import { SafetyComplianceService } from './safetyComplianceService';
import { WebhookService } from './webhookService';

export interface MultiEntityMapping {
  entityId: string;
  propertyId?: string;
  accountMappings: Record<string, string>;
  dimensionMappings: Record<string, string>;
  priority: number; // Higher priority overrides lower
}

export interface TipHandlingRule {
  type: 'expense_liability' | 'pass_through';
  expenseAccount?: string;
  liabilityAccount?: string;
  passThrough?: {
    receivableAccount: string;
    payableAccount: string;
  };
}

export interface BonusMapping {
  code: string; // XMAS_BONUS, EASTER_BONUS, etc.
  name: string;
  greekName: string; // δώρα/επιδόματα
  accountCode: string;
  separateFromWages: boolean;
}

export interface BackdatedPolicy {
  allowBackPost: boolean;
  currentPeriodReference: boolean;
  maxBackDays: number;
  requireApproval: boolean;
}

export interface PostingWindow {
  entityId: string;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string;
  isLocked: boolean;
  lockDate?: string;
  erpLockStatus: 'open' | 'locked' | 'closed';
}

export class EdgeCaseHandler {

  /**
   * Resolve account mapping with multi-entity/property hierarchy
   */
  static resolveAccountMapping(
    entityId: string,
    propertyId: string | null,
    earningsCode: string,
    mappings: MultiEntityMapping[]
  ): { accountCode: string; dimensions: Record<string, string> } | null {
    
    // Sort by priority (higher first), then by specificity (property-specific first)
    const sortedMappings = mappings
      .filter(m => m.entityId === entityId)
      .sort((a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority;
        if (a.propertyId && !b.propertyId) return -1;
        if (!a.propertyId && b.propertyId) return 1;
        return 0;
      });

    // Find matching mapping (property-specific first, then entity-level)
    for (const mapping of sortedMappings) {
      if (mapping.propertyId && mapping.propertyId !== propertyId) continue;
      
      const accountCode = mapping.accountMappings[earningsCode];
      if (accountCode) {
        const dimensions: Record<string, string> = { ...mapping.dimensionMappings };
        if (propertyId) dimensions.property_id = propertyId;
        
        return { accountCode, dimensions };
      }
    }

    return null;
  }

  /**
   * Handle tip allocation scenarios
   */
  static generateTipJournalLines(
    tipAmount: number,
    employeeId: string,
    propertyId: string,
    rule: TipHandlingRule,
    description: string
  ): Array<{
    accountCode: string;
    debit: string;
    credit: string;
    description: string;
    dimensions: Record<string, string>;
  }> {
    const lines = [];
    const dimensions = { employee_id: employeeId, property_id: propertyId };

    if (rule.type === 'expense_liability') {
      // Employer holds tips: Expense + Liability
      lines.push({
        accountCode: rule.expenseAccount!,
        debit: tipAmount.toFixed(2),
        credit: '0.00',
        description: `${description} - Expense`,
        dimensions,
      });
      
      lines.push({
        accountCode: rule.liabilityAccount!,
        debit: '0.00',
        credit: tipAmount.toFixed(2),
        description: `${description} - Owed to Employee`,
        dimensions,
      });
    } else if (rule.type === 'pass_through') {
      // Pass-through: Customer tips go directly to employee
      lines.push({
        accountCode: rule.passThrough!.receivableAccount,
        debit: tipAmount.toFixed(2),
        credit: '0.00',
        description: `${description} - Customer Tips`,
        dimensions,
      });
      
      lines.push({
        accountCode: rule.passThrough!.payableAccount,
        debit: '0.00',
        credit: tipAmount.toFixed(2),
        description: `${description} - Payable to Employee`,
        dimensions,
      });
    }

    return lines;
  }

  /**
   * Generate bonus journal lines with separate accounts
   */
  static generateBonusJournalLines(
    bonusAmount: number,
    employeeId: string,
    bonusMapping: BonusMapping,
    taxWithholding: number,
    netAmount: number,
    dimensions: Record<string, string> = {}
  ): Array<{
    accountCode: string;
    debit: string;
    credit: string;
    description: string;
    dimensions: Record<string, string>;
  }> {
    const lines = [];
    const baseDimensions = { employee_id: employeeId, ...dimensions };

    // Bonus expense (separate from regular wages)
    lines.push({
      accountCode: bonusMapping.accountCode,
      debit: bonusAmount.toFixed(2),
      credit: '0.00',
      description: `${bonusMapping.greekName} - ${bonusMapping.name}`,
      dimensions: baseDimensions,
    });

    // Tax withholding liability
    if (taxWithholding > 0) {
      lines.push({
        accountCode: '3320', // AADE ΦΜΥ liability
        debit: '0.00',
        credit: taxWithholding.toFixed(2),
        description: `Φόρος ${bonusMapping.greekName}`,
        dimensions: baseDimensions,
      });
    }

    // Net payable
    lines.push({
      accountCode: '3800', // Payroll clearing
      debit: '0.00',
      credit: netAmount.toFixed(2),
      description: `Καθαρό ${bonusMapping.greekName}`,
      dimensions: baseDimensions,
    });

    return lines;
  }

  /**
   * Handle back-dated adjustments
   */
  static async createBackdatedAdjustment(
    originalJournalId: string,
    adjustmentData: any,
    policy: BackdatedPolicy
  ): Promise<{
    journalId: string;
    isBackPosted: boolean;
    currentPeriodReference: boolean;
    requiresApproval: boolean;
  }> {
    const adjustmentId = `ADJ-${nanoid(8)}`;
    const today = new Date();
    const currentPeriod = today.toISOString().substring(0, 7); // YYYY-MM

    // Check if back-posting is allowed
    const backPostDays = Math.floor((today.getTime() - new Date(adjustmentData.originalPeriod + '-01').getTime()) / (1000 * 60 * 60 * 24));
    const canBackPost = policy.allowBackPost && backPostDays <= policy.maxBackDays;

    let journalPeriod = currentPeriod;
    let currentPeriodReference = true;

    if (canBackPost && !policy.currentPeriodReference) {
      journalPeriod = adjustmentData.originalPeriod;
      currentPeriodReference = false;
    }

    // Create adjustment journal
    const adjustmentJournal = {
      journalId: adjustmentId,
      entityId: adjustmentData.entityId,
      period: journalPeriod,
      currency: 'EUR' as const,
      description: currentPeriodReference 
        ? `Adjustment for ${adjustmentData.originalPeriod} (Posted in ${currentPeriod})`
        : `Back-dated Adjustment for ${adjustmentData.originalPeriod}`,
      runId: adjustmentData.runId,
      status: 'draft' as const,
      originalJournalId: originalJournalId,
      adjustmentType: 'backdated',
      createdAt: today,
      updatedAt: today,
    };

    return {
      journalId: adjustmentId,
      isBackPosted: !currentPeriodReference,
      currentPeriodReference,
      requiresApproval: policy.requireApproval,
    };
  }

  /**
   * Check posting window and ERP lock status
   */
  static async validatePostingWindow(
    entityId: string,
    period: string
  ): Promise<{
    canPost: boolean;
    lockStatus: 'open' | 'locked' | 'closed';
    shouldCreateDraft: boolean;
    message: string;
  }> {
    // Mock ERP lock date check (in production, call actual ERP APIs)
    const mockLockDates = new Map([
      ['princess-hotel', '2025-07-31'], // July and earlier locked
      ['santikos-corp', '2025-06-30'], // June and earlier locked
    ]);

    const lockDate = mockLockDates.get(entityId);
    if (!lockDate) {
      return {
        canPost: true,
        lockStatus: 'open',
        shouldCreateDraft: false,
        message: 'Period is open for posting',
      };
    }

    const periodDate = new Date(period + '-01');
    const lockDateTime = new Date(lockDate);

    if (periodDate <= lockDateTime) {
      return {
        canPost: false,
        lockStatus: 'locked',
        shouldCreateDraft: true,
        message: `Period ${period} is locked. Journal will be created as draft. Contact administrator to unlock.`,
      };
    }

    return {
      canPost: true,
      lockStatus: 'open',
      shouldCreateDraft: false,
      message: 'Period is open for posting',
    };
  }

  /**
   * Handle payroll re-run scenario
   */
  static async handlePayrollRerun(
    entityId: string,
    runId: string,
    period: string
  ): Promise<{
    reversalJournalId?: string;
    newJournalId: string;
    reversalRequired: boolean;
    message: string;
  }> {
    // Find existing posted journal for this run
    const existingJournals = await db
      .select()
      .from(glJournalHeaders)
      .where(
        and(
          eq(glJournalHeaders.entityId, entityId),
          eq(glJournalHeaders.runId, runId),
          eq(glJournalHeaders.period, period),
          eq(glJournalHeaders.status, 'posted')
        )
      )
      .orderBy(desc(glJournalHeaders.createdAt));

    const newJournalId = `${runId}-RERUN-${nanoid(6)}`;

    if (existingJournals.length > 0) {
      const originalJournal = existingJournals[0];
      const reversalId = `REV-${originalJournal.journalId}`;

      // Get original journal lines for reversal
      const originalLines = await db
        .select()
        .from(glJournalLinesCanonical)
        .where(eq(glJournalLinesCanonical.journalId, originalJournal.journalId));

      // Create reversal journal (flip debits/credits)
      const reversalLines = originalLines.map(line => ({
        ...line,
        lineId: `REV-${line.lineId}`,
        journalId: reversalId,
        debit: line.credit, // Flip
        credit: line.debit, // Flip
        description: `REVERSAL: ${line.description}`,
      }));

      // In production, save reversal journal to database
      console.log(`Creating reversal journal ${reversalId} for ${originalJournal.journalId}`);

      return {
        reversalJournalId: reversalId,
        newJournalId,
        reversalRequired: true,
        message: `Previous payroll run found. Created reversal journal ${reversalId}. New journal: ${newJournalId}`,
      };
    }

    return {
      newJournalId,
      reversalRequired: false,
      message: `No previous posted journal found. Creating new journal: ${newJournalId}`,
    };
  }

  /**
   * Get Greek bonus mappings
   */
  static getGreekBonusMappings(): BonusMapping[] {
    return [
      {
        code: 'XMAS_BONUS',
        name: 'Christmas Bonus',
        greekName: 'Δώρο Χριστουγέννων',
        accountCode: '6010',
        separateFromWages: true,
      },
      {
        code: 'EASTER_BONUS',
        name: 'Easter Bonus', 
        greekName: 'Δώρο Πάσχα',
        accountCode: '6011',
        separateFromWages: true,
      },
      {
        code: 'VACATION_ALLOWANCE',
        name: 'Vacation Allowance',
        greekName: 'Επίδομα Αδείας',
        accountCode: '6012',
        separateFromWages: true,
      },
      {
        code: 'PERFORMANCE_BONUS',
        name: 'Performance Bonus',
        greekName: 'Επίδομα Απόδοσης',
        accountCode: '6013',
        separateFromWages: true,
      },
      {
        code: 'SENIORITY_BONUS',
        name: 'Seniority Bonus',
        greekName: 'Επίδομα Αρχαιότητας',
        accountCode: '6014',
        separateFromWages: true,
      },
    ];
  }

  /**
   * Get default tip handling rules by industry
   */
  static getTipHandlingRules(): Record<string, TipHandlingRule> {
    return {
      hotel: {
        type: 'expense_liability',
        expenseAccount: '6020',
        liabilityAccount: '3850',
      },
      restaurant: {
        type: 'pass_through',
        passThrough: {
          receivableAccount: '1350',
          payableAccount: '3851',
        },
      },
      default: {
        type: 'expense_liability',
        expenseAccount: '6020',
        liabilityAccount: '3850',
      },
    };
  }

  /**
   * Get default back-dated policy
   */
  static getDefaultBackdatedPolicy(): BackdatedPolicy {
    return {
      allowBackPost: true,
      currentPeriodReference: true, // Post in current period with reference
      maxBackDays: 90,
      requireApproval: true,
    };
  }
}