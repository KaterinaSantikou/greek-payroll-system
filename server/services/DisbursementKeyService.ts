import { createHash } from 'crypto';
import { db } from "../db";
import { 
  paymentBatches,
  payrollScopeLines,
  employees
} from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

export interface DisbursementKey {
  key: string;
  tenant: string;
  employeeId: string;
  period: string;
  netAmount: string;
  currency: string;
  scopeId: string;
}

export interface PaymentDuplicateCheck {
  isDuplicate: boolean;
  existingPayment?: {
    id: string;
    batchId: string;
    disbursementKey: string;
    status: string;
    createdAt: Date;
  };
}

export class DisbursementKeyService {
  
  /**
   * Generate SHA256 disbursement key
   * Format: SHA256(tenant|employee|period|net|currency|scope_id)
   */
  generateDisbursementKey(params: {
    tenant: string;
    employeeId: string;
    period: string;
    netAmount: string;
    currency: string;
    scopeId: string;
  }): string {
    const { tenant, employeeId, period, netAmount, currency, scopeId } = params;
    
    // Normalize net amount to consistent decimal format (2 decimal places)
    const normalizedNet = parseFloat(netAmount).toFixed(2);
    
    // Create deterministic string for hashing
    const keyString = `${tenant}|${employeeId}|${period}|${normalizedNet}|${currency}|${scopeId}`;
    
    // Generate SHA256 hash
    return createHash('sha256').update(keyString, 'utf8').digest('hex');
  }

  /**
   * Check if a disbursement key already exists (duplicate payment detection)
   */
  async checkForDuplicatePayment(disbursementKey: string): Promise<PaymentDuplicateCheck> {
    const existingPayments = await db
      .select({
        id: paymentBatches.batchId,
        batchId: paymentBatches.batchId,
        disbursementKey: paymentBatches.disbursementKey,
        status: paymentBatches.status,
        createdAt: paymentBatches.createdAt
      })
      .from(paymentBatches)
      .where(eq(paymentBatches.disbursementKey, disbursementKey))
      .limit(1);

    if (existingPayments.length > 0) {
      const existing = existingPayments[0];
      
      // Only consider it a duplicate if the existing payment is not cancelled/superseded
      const activeDuplicateStatuses = ['pending', 'approved', 'processing', 'completed'];
      const isDuplicate = activeDuplicateStatuses.includes(existing.status);
      
      return {
        isDuplicate,
        existingPayment: existing
      };
    }

    return {
      isDuplicate: false
    };
  }

  /**
   * Generate disbursement keys for all employees in a scope
   */
  async generateScopePaymentKeys(
    scopeId: string,
    period: string,
    tenant: string = 'default',
    currency: string = 'EUR'
  ): Promise<Map<string, DisbursementKey>> {
    // Get all finalized payroll lines for this scope
    const scopeLines = await db
      .select({
        employeeId: payrollScopeLines.employeeId,
        netAmount: sql<string>`SUM(CASE WHEN ${payrollScopeLines.category} = 'net_pay' THEN ${payrollScopeLines.amount} ELSE 0 END)`,
      })
      .from(payrollScopeLines)
      .where(and(
        eq(payrollScopeLines.scopeId, scopeId),
        sql`${payrollScopeLines.category} = 'net_pay'`
      ))
      .groupBy(payrollScopeLines.employeeId);

    const disbursementKeys = new Map<string, DisbursementKey>();

    for (const line of scopeLines) {
      const netAmount = line.netAmount || '0.00';
      
      // Skip zero-net payments if configured to do so
      if (parseFloat(netAmount) === 0) {
        continue;
      }

      const key = this.generateDisbursementKey({
        tenant,
        employeeId: line.employeeId,
        period,
        netAmount,
        currency,
        scopeId
      });

      disbursementKeys.set(line.employeeId, {
        key,
        tenant,
        employeeId: line.employeeId,
        period,
        netAmount,
        currency,
        scopeId
      });
    }

    return disbursementKeys;
  }

  /**
   * Validate payment batch for duplicate disbursement keys
   */
  async validatePaymentBatch(paymentLines: Array<{
    employeeId: string;
    netAmount: string;
    scopeId: string;
    period: string;
  }>): Promise<{
    isValid: boolean;
    duplicates: Array<{
      employeeId: string;
      disbursementKey: string;
      existingPayment: any;
    }>;
  }> {
    const duplicates = [];
    
    for (const line of paymentLines) {
      const key = this.generateDisbursementKey({
        tenant: 'default', // TODO: Get from tenant context
        employeeId: line.employeeId,
        period: line.period,
        netAmount: line.netAmount,
        currency: 'EUR',
        scopeId: line.scopeId
      });

      const duplicateCheck = await this.checkForDuplicatePayment(key);
      
      if (duplicateCheck.isDuplicate) {
        duplicates.push({
          employeeId: line.employeeId,
          disbursementKey: key,
          existingPayment: duplicateCheck.existingPayment
        });
      }
    }

    return {
      isValid: duplicates.length === 0,
      duplicates
    };
  }

  /**
   * Cancel/supersede an existing payment to allow a new one
   */
  async supersedeDisbursement(
    disbursementKey: string,
    reason: string,
    supersededBy?: string
  ): Promise<boolean> {
    try {
      const result = await db
        .update(paymentBatches)
        .set({
          status: 'superseded',
          supersededReason: reason,
          supersededBy: supersededBy,
          supersededAt: sql`NOW()`,
          updatedAt: sql`NOW()`
        })
        .where(and(
          eq(paymentBatches.disbursementKey, disbursementKey),
          sql`${paymentBatches.status} NOT IN ('completed', 'cancelled', 'superseded')`
        ));

      return result.rowCount > 0;
    } catch (error) {
      console.error('Error superseding disbursement:', error);
      return false;
    }
  }

  /**
   * Get payment history for an employee in a period
   */
  async getEmployeePaymentHistory(
    employeeId: string,
    period: string
  ): Promise<Array<{
    disbursementKey: string;
    amount: string;
    status: string;
    scopeId: string;
    createdAt: Date;
  }>> {
    const payments = await db
      .select({
        disbursementKey: paymentBatches.disbursementKey,
        amount: paymentBatches.totalAmount,
        status: paymentBatches.status,
        scopeId: paymentBatches.scopeId,
        createdAt: paymentBatches.createdAt
      })
      .from(paymentBatches)
      .where(and(
        sql`${paymentBatches.disbursementKey} LIKE '%|${employeeId}|${period}|%'`
      ))
      .orderBy(paymentBatches.createdAt);

    return payments;
  }

  /**
   * Detect potential adjustment scenarios (same employee, different scope, same period)
   */
  async detectAdjustmentScenarios(
    employeeId: string,
    period: string,
    currentScopeId: string
  ): Promise<{
    hasExistingPayment: boolean;
    existingPayments: Array<{
      scopeId: string;
      netAmount: string;
      status: string;
      disbursementKey: string;
    }>;
    suggestedAction: 'allow' | 'supersede' | 'consolidate';
  }> {
    const existingPayments = await this.getEmployeePaymentHistory(employeeId, period);
    const activePayments = existingPayments.filter(p => 
      !['cancelled', 'superseded', 'failed'].includes(p.status) && 
      p.scopeId !== currentScopeId
    );

    let suggestedAction: 'allow' | 'supersede' | 'consolidate' = 'allow';

    if (activePayments.length > 0) {
      // If there are existing active payments, suggest superseding for adjustments
      suggestedAction = 'supersede';
    } else if (existingPayments.length > 1) {
      // Multiple payment history might benefit from consolidation
      suggestedAction = 'consolidate';
    }

    return {
      hasExistingPayment: activePayments.length > 0,
      existingPayments: activePayments.map(p => ({
        scopeId: p.scopeId,
        netAmount: p.amount,
        status: p.status,
        disbursementKey: p.disbursementKey
      })),
      suggestedAction
    };
  }

  /**
   * Generate human-readable disbursement key summary
   */
  parseDisbursementKey(disbursementKey: string): {
    key: string;
    isValid: boolean;
    summary?: string;
  } {
    // Since the key is a hash, we can't reverse it
    // This would require storing the original parameters or using a different approach
    return {
      key: disbursementKey,
      isValid: /^[a-f0-9]{64}$/i.test(disbursementKey),
      summary: `Payment key: ${disbursementKey.substring(0, 8)}...${disbursementKey.substring(-8)}`
    };
  }

  /**
   * Bulk generate and validate disbursement keys for multiple scopes
   */
  async bulkValidateScopes(
    scopeIds: string[],
    period: string
  ): Promise<{
    validScopes: string[];
    duplicateConflicts: Array<{
      scopeId: string;
      employeeId: string;
      conflictWithScopeId: string;
      disbursementKey: string;
    }>;
  }> {
    const duplicateConflicts = [];
    const validScopes = [];
    const allKeys = new Map<string, { scopeId: string; employeeId: string }>();

    for (const scopeId of scopeIds) {
      const scopeKeys = await this.generateScopePaymentKeys(scopeId, period);
      let scopeHasDuplicates = false;

      for (const [employeeId, keyData] of scopeKeys) {
        // Check against database
        const duplicateCheck = await this.checkForDuplicatePayment(keyData.key);
        
        if (duplicateCheck.isDuplicate) {
          duplicateConflicts.push({
            scopeId,
            employeeId,
            conflictWithScopeId: 'external', // From database
            disbursementKey: keyData.key
          });
          scopeHasDuplicates = true;
        }

        // Check against other scopes in this batch
        const existingKey = allKeys.get(keyData.key);
        if (existingKey) {
          duplicateConflicts.push({
            scopeId,
            employeeId,
            conflictWithScopeId: existingKey.scopeId,
            disbursementKey: keyData.key
          });
          scopeHasDuplicates = true;
        } else {
          allKeys.set(keyData.key, { scopeId, employeeId });
        }
      }

      if (!scopeHasDuplicates) {
        validScopes.push(scopeId);
      }
    }

    return {
      validScopes,
      duplicateConflicts
    };
  }
}

export const disbursementKeyService = new DisbursementKeyService();