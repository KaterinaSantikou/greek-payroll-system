import { db } from "../db";
import { 
  garnishmentOrders, 
  garnishmentTransactions,
  garnishmentBalances,
  type GarnishmentOrder,
  type GarnishmentTransaction,
  type GarnishmentCalculationInputs,
  type GarnishmentCalculationResult,
  type InsertGarnishmentOrder,
  type InsertGarnishmentTransaction,
  type InsertGarnishmentBalance
} from "../../shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";

/**
 * GarnishmentService - Court Order & Wage Garnishment Processing
 * 
 * Handles creation, calculation, and processing of court-ordered deductions
 * with proper net pay protection and priority stacking.
 * 
 * Features:
 * - Multi-priority garnishment stacking
 * - Net pay protection floors  
 * - Carry-forward for uncollected amounts
 * - GL liability posting integration
 * - Compliance audit trails
 */
export class GarnishmentService {
  
  /**
   * Calculate garnishments for a payroll period with net pay protection
   * Implements proper stacking order and legal protection limits
   */
  static async calculateGarnishments(inputs: GarnishmentCalculationInputs): Promise<GarnishmentCalculationResult> {
    const calculationLog: string[] = [];
    const garnishmentDetails: any[] = [];
    
    calculationLog.push(`Starting garnishment calculation for employee ${inputs.employeeId}`);
    calculationLog.push(`Gross Pay: $${inputs.grossPay.toFixed(2)}, Disposable Income: $${inputs.disposableIncome.toFixed(2)}`);
    calculationLog.push(`Net Pay Before Garnishments: $${inputs.netPayBeforeGarnishments.toFixed(2)}`);
    
    // Sort garnishments by priority (1 = highest priority)
    const sortedGarnishments = [...inputs.activeGarnishments].sort((a, b) => a.priority - b.priority);
    calculationLog.push(`Processing ${sortedGarnishments.length} garnishments in priority order`);
    
    let remainingNetPay = inputs.netPayBeforeGarnishments;
    let totalGarnishmentAmount = 0;
    let totalCarriedForward = 0;
    let totalProtectedAmount = 0;
    
    // Apply federal/state minimum protection (typically 30x federal minimum wage per week)
    const FEDERAL_MIN_WAGE = 7.25;
    const WEEKLY_PROTECTION_MULTIPLIER = 30;
    const federalProtectionFloor = FEDERAL_MIN_WAGE * WEEKLY_PROTECTION_MULTIPLIER; // $217.50/week
    
    // Calculate per-pay-period protection (assuming bi-weekly)
    const payPeriodProtectionFloor = federalProtectionFloor * 2; // $435 bi-weekly
    calculationLog.push(`Federal protection floor: $${payPeriodProtectionFloor.toFixed(2)} per pay period`);
    
    // Process each garnishment in priority order
    for (const garnishment of sortedGarnishments) {
      calculationLog.push(`--- Processing Garnishment: ${garnishment.orderNumber} (${garnishment.creditorName}) ---`);
      
      // Calculate base deduction amount
      let calculatedAmount = 0;
      let calculationMethod = '';
      
      if (garnishment.deductionType === 'fixed_amount' && garnishment.deductionAmount) {
        calculatedAmount = garnishment.deductionAmount;
        calculationMethod = `Fixed amount: $${garnishment.deductionAmount}`;
        
      } else if (garnishment.deductionType === 'percentage' && garnishment.deductionPercentage) {
        calculatedAmount = inputs.disposableIncome * (garnishment.deductionPercentage / 100);
        calculationMethod = `${garnishment.deductionPercentage}% of disposable income ($${inputs.disposableIncome.toFixed(2)})`;
        
      } else if (garnishment.deductionType === 'percentage_with_cap' && garnishment.deductionPercentage) {
        calculatedAmount = inputs.disposableIncome * (garnishment.deductionPercentage / 100);
        if (garnishment.maximumAmount && calculatedAmount > garnishment.maximumAmount) {
          calculatedAmount = garnishment.maximumAmount;
          calculationMethod = `${garnishment.deductionPercentage}% of disposable income, capped at $${garnishment.maximumAmount}`;
        } else {
          calculationMethod = `${garnishment.deductionPercentage}% of disposable income ($${inputs.disposableIncome.toFixed(2)})`;
        }
      }
      
      calculationLog.push(`Calculated amount: $${calculatedAmount.toFixed(2)} (${calculationMethod})`);
      
      // Apply per-period maximum if set
      if (garnishment.maximumAmount && calculatedAmount > garnishment.maximumAmount) {
        calculatedAmount = garnishment.maximumAmount;
        calculationLog.push(`Applied per-period cap: $${calculatedAmount.toFixed(2)}`);
      }
      
      // Add any carried forward amount from previous periods
      const totalOwedThisPeriod = calculatedAmount + (garnishment.carriedForwardAmount || 0);
      calculationLog.push(`Total owed (including carry-forward $${(garnishment.carriedForwardAmount || 0).toFixed(2)}): $${totalOwedThisPeriod.toFixed(2)}`);
      
      // Determine protected amount for this employee's specific garnishment
      let specificProtectedAmount = payPeriodProtectionFloor;
      
      if (garnishment.protectedNetAmount) {
        specificProtectedAmount = Math.max(specificProtectedAmount, garnishment.protectedNetAmount);
        calculationLog.push(`Using order-specific protection amount: $${garnishment.protectedNetAmount.toFixed(2)}`);
      } else if (garnishment.protectedPercentage) {
        const percentageProtection = inputs.grossPay * (garnishment.protectedPercentage / 100);
        specificProtectedAmount = Math.max(specificProtectedAmount, percentageProtection);
        calculationLog.push(`Using order-specific protection percentage: ${garnishment.protectedPercentage}% of gross ($${percentageProtection.toFixed(2)})`);
      }
      
      // Calculate maximum deductible without violating net pay protection
      const maxDeductible = Math.max(0, remainingNetPay - specificProtectedAmount);
      calculationLog.push(`Remaining net pay: $${remainingNetPay.toFixed(2)}, Protected amount: $${specificProtectedAmount.toFixed(2)}`);
      calculationLog.push(`Maximum deductible: $${maxDeductible.toFixed(2)}`);
      
      // Determine actual deduction amount
      let actualDeduction = Math.min(totalOwedThisPeriod, maxDeductible);
      let carriedForwardAmount = Math.max(0, totalOwedThisPeriod - actualDeduction);
      
      // Handle balance limits (don't deduct more than remaining balance)
      if (garnishment.currentBalance > 0 && actualDeduction > garnishment.currentBalance) {
        carriedForwardAmount = 0; // No carry forward if balance is fully satisfied
        actualDeduction = garnishment.currentBalance;
        calculationLog.push(`Limited deduction to remaining balance: $${actualDeduction.toFixed(2)}`);
      }
      
      calculationLog.push(`Actual deduction: $${actualDeduction.toFixed(2)}, Carried forward: $${carriedForwardAmount.toFixed(2)}`);
      
      // Update running totals
      totalGarnishmentAmount += actualDeduction;
      totalCarriedForward += carriedForwardAmount;
      totalProtectedAmount += (totalOwedThisPeriod - actualDeduction); // Amount protected from deduction
      remainingNetPay -= actualDeduction;
      
      // Store garnishment details
      garnishmentDetails.push({
        garnishmentId: garnishment.id,
        orderNumber: garnishment.orderNumber,
        creditorName: garnishment.creditorName,
        calculatedAmount,
        deductedAmount: actualDeduction,
        carriedForwardAmount,
        protectedAmount: totalOwedThisPeriod - actualDeduction,
        calculationMethod,
        glAccount: garnishment.creditorAccountCode || `2200-${garnishment.orderType.toUpperCase()}` // Default GL liability account
      });
    }
    
    calculationLog.push(`--- Final Totals ---`);
    calculationLog.push(`Total Garnishment Amount: $${totalGarnishmentAmount.toFixed(2)}`);
    calculationLog.push(`Net Pay After Garnishments: $${remainingNetPay.toFixed(2)}`);
    calculationLog.push(`Total Carried Forward: $${totalCarriedForward.toFixed(2)}`);
    
    return {
      totalGarnishmentAmount,
      netPayAfterGarnishments: remainingNetPay,
      garnishmentDetails,
      protectionSummary: {
        totalProtectedAmount,
        netPayFloorApplied: totalProtectedAmount > 0,
        carriedForwardTotal: totalCarriedForward
      },
      calculationLog
    };
  }
  
  /**
   * Process garnishment transactions for a payroll run
   * Creates transaction records and updates balances
   */
  static async processGarnishmentTransactions(
    employeeId: string,
    payrollRunId: string,
    calculationResult: GarnishmentCalculationResult,
    payPeriodStart: string,
    payPeriodEnd: string,
    grossPay: number,
    disposableIncome: number,
    netPayBefore: number
  ): Promise<GarnishmentTransaction[]> {
    const transactions: GarnishmentTransaction[] = [];
    
    for (const detail of calculationResult.garnishmentDetails) {
      if (detail.deductedAmount > 0 || detail.carriedForwardAmount > 0) {
        
        // Create transaction record
        const [transaction] = await db.insert(garnishmentTransactions).values({
          garnishmentOrderId: detail.garnishmentId,
          employeeId,
          payrollRunId,
          payPeriodStart: new Date(payPeriodStart),
          payPeriodEnd: new Date(payPeriodEnd),
          grossPay,
          disposableIncome,
          calculatedAmount: detail.calculatedAmount,
          deductedAmount: detail.deductedAmount,
          carriedForwardAmount: detail.carriedForwardAmount,
          netPayBeforeGarnishment: netPayBefore,
          protectedAmount: detail.protectedAmount,
          netPayAfterGarnishment: calculationResult.netPayAfterGarnishments,
          calculationLog: {
            method: detail.calculationMethod,
            steps: calculationResult.calculationLog,
            protectionApplied: detail.protectedAmount > 0
          }
        }).returning();
        
        transactions.push(transaction);
        
        // Update garnishment order balance
        await db
          .update(garnishmentOrders)
          .set({
            totalDeducted: sql`total_deducted + ${detail.deductedAmount}`,
            currentBalance: sql`GREATEST(0, current_balance - ${detail.deductedAmount})`,
            updatedAt: new Date()
          })
          .where(eq(garnishmentOrders.id, detail.garnishmentId));
        
        // Update or create balance record
        const existingBalance = await db
          .select()
          .from(garnishmentBalances)
          .where(eq(garnishmentBalances.garnishmentOrderId, detail.garnishmentId))
          .limit(1);
        
        if (existingBalance.length > 0) {
          await db
            .update(garnishmentBalances)
            .set({
              totalDeducted: sql`total_deducted + ${detail.deductedAmount}`,
              currentBalance: sql`GREATEST(0, current_balance - ${detail.deductedAmount})`,
              carriedForwardAmount: detail.carriedForwardAmount,
              lastUpdated: new Date(),
              lastTransactionId: transaction.id
            })
            .where(eq(garnishmentBalances.garnishmentOrderId, detail.garnishmentId));
        } else {
          // Create new balance record
          const garnishmentOrder = await this.getGarnishmentOrder(detail.garnishmentId);
          if (garnishmentOrder) {
            await db.insert(garnishmentBalances).values({
              garnishmentOrderId: detail.garnishmentId,
              employeeId,
              totalOrderAmount: garnishmentOrder.totalOrderAmount,
              totalDeducted: detail.deductedAmount,
              currentBalance: garnishmentOrder.totalOrderAmount ? 
                Number(garnishmentOrder.totalOrderAmount) - detail.deductedAmount : 0,
              carriedForwardAmount: detail.carriedForwardAmount,
              lastTransactionId: transaction.id
            });
          }
        }
      }
    }
    
    return transactions;
  }
  
  /**
   * Create a new garnishment order
   */
  static async createGarnishmentOrder(orderData: InsertGarnishmentOrder): Promise<GarnishmentOrder> {
    const [garnishmentOrder] = await db
      .insert(garnishmentOrders)
      .values({
        ...orderData,
        currentBalance: orderData.totalOrderAmount || 0,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    return garnishmentOrder;
  }
  
  /**
   * Update garnishment order
   */
  static async updateGarnishmentOrder(
    garnishmentId: string, 
    updates: Partial<InsertGarnishmentOrder>
  ): Promise<GarnishmentOrder | null> {
    const [updated] = await db
      .update(garnishmentOrders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(garnishmentOrders.id, garnishmentId))
      .returning();
    
    return updated || null;
  }
  
  /**
   * Get garnishment order by ID
   */
  static async getGarnishmentOrder(garnishmentId: string): Promise<GarnishmentOrder | null> {
    const [garnishment] = await db
      .select()
      .from(garnishmentOrders)
      .where(eq(garnishmentOrders.id, garnishmentId))
      .limit(1);
    
    return garnishment || null;
  }
  
  /**
   * Get active garnishments for an employee
   */
  static async getActiveGarnishments(employeeId: string): Promise<GarnishmentOrder[]> {
    return await db
      .select()
      .from(garnishmentOrders)
      .where(
        and(
          eq(garnishmentOrders.employeeId, employeeId),
          eq(garnishmentOrders.status, 'active')
        )
      )
      .orderBy(garnishmentOrders.priority);
  }
  
  /**
   * Get garnishment transactions for an employee
   */
  static async getGarnishmentTransactions(
    employeeId: string, 
    limit?: number
  ): Promise<GarnishmentTransaction[]> {
    let query = db
      .select()
      .from(garnishmentTransactions)
      .where(eq(garnishmentTransactions.employeeId, employeeId))
      .orderBy(desc(garnishmentTransactions.processedAt));
    
    if (limit) {
      query = query.limit(limit);
    }
    
    return await query;
  }
  
  /**
   * Generate GL posting entries for garnishment transactions
   * Creates liability entries for each creditor
   */
  static generateGLEntries(
    transactions: GarnishmentTransaction[],
    companyCode: string = '001'
  ): any[] {
    const glEntries: any[] = [];
    
    for (const transaction of transactions) {
      if (transaction.deductedAmount && Number(transaction.deductedAmount) > 0) {
        // Get garnishment details for GL account mapping
        const garnishmentDetails = transaction.calculationLog as any;
        const creditorGLAccount = garnishmentDetails?.glAccount || '2200-GARNISHMENT';
        
        // Credit: Garnishment Liability (what we owe the creditor)
        glEntries.push({
          accountCode: creditorGLAccount,
          accountName: `Garnishment Liability - ${transaction.garnishmentOrderId}`,
          debitAmount: 0,
          creditAmount: Number(transaction.deductedAmount),
          description: `Garnishment deduction - Employee ${transaction.employeeId}`,
          referenceId: transaction.id,
          transactionDate: transaction.processedAt,
          companyCode
        });
        
        // Debit: Payroll Expense or Wages Payable (reducing net pay)
        glEntries.push({
          accountCode: '5100-WAGES',
          accountName: 'Wages Expense',
          debitAmount: Number(transaction.deductedAmount),
          creditAmount: 0,
          description: `Garnishment deduction - Employee ${transaction.employeeId}`,
          referenceId: transaction.id,
          transactionDate: transaction.processedAt,
          companyCode
        });
      }
    }
    
    return glEntries;
  }
  
  /**
   * Validate garnishment order data
   */
  static validateGarnishmentOrder(orderData: InsertGarnishmentOrder): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Required fields
    if (!orderData.employeeId) errors.push('Employee ID is required');
    if (!orderData.orderNumber) errors.push('Order number is required');
    if (!orderData.creditorName) errors.push('Creditor name is required');
    if (!orderData.orderType) errors.push('Order type is required');
    if (!orderData.orderDate) errors.push('Order date is required');
    if (!orderData.effectiveDate) errors.push('Effective date is required');
    
    // Deduction configuration validation
    if (!orderData.deductionType) {
      errors.push('Deduction type is required');
    } else {
      if (orderData.deductionType === 'fixed_amount' && !orderData.deductionAmount) {
        errors.push('Deduction amount is required for fixed amount type');
      }
      if (['percentage', 'percentage_with_cap'].includes(orderData.deductionType) && !orderData.deductionPercentage) {
        errors.push('Deduction percentage is required for percentage-based types');
      }
    }
    
    // Validate percentage ranges
    if (orderData.deductionPercentage && (orderData.deductionPercentage <= 0 || orderData.deductionPercentage > 100)) {
      errors.push('Deduction percentage must be between 0 and 100');
    }
    
    // Validate amounts
    if (orderData.deductionAmount && orderData.deductionAmount <= 0) {
      errors.push('Deduction amount must be greater than 0');
    }
    
    if (orderData.totalOrderAmount && orderData.totalOrderAmount <= 0) {
      errors.push('Total order amount must be greater than 0');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}