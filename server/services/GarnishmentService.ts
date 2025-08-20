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
   * Calc Hook (Engine Internal)
   * 
   * Input: employee_id, run_context (period, run_type), pre_tax, taxes, contribs, net_before_garnishments.
   * Output: garnishment_lines[], net_after_garnishments.
   * 
   * Calculation Logic (per employee, per run)
   */
  static async calculateGarnishments(inputs: {
    employeeId: string;
    runContext: { period: string; runType: string; };
    preTax: number;
    taxes: number;
    contribs: number;
    netBeforeGarnishments: number;
    activeGarnishments?: any[];
  }): Promise<{
    garnishmentLines: Array<{
      type: string;
      creditor: string;
      orderRef: string;
      amount: number;
      remainingBalance: number;
      glAccount: string;
      description: string;
    }>;
    netAfterGarnishments: number;
    calculationLog: string[];
  }> {
    const calculationLog: string[] = [];
    const garnishmentLines: Array<{
      type: string;
      creditor: string;
      orderRef: string;
      amount: number;
      remainingBalance: number;
      glAccount: string;
      description: string;
    }> = [];
    
    calculationLog.push(`Starting garnishment calculation for employee ${inputs.employeeId}`);
    calculationLog.push(`Pre-tax: €${inputs.preTax.toFixed(2)}, Taxes: €${inputs.taxes.toFixed(2)}, Contribs: €${inputs.contribs.toFixed(2)}`);
    calculationLog.push(`Net Before Garnishments: €${inputs.netBeforeGarnishments.toFixed(2)}`);
    
    // Definitions: DisposableNet = Net after taxes & statutory contributions, before any garnishments.
    let disposableNet = inputs.netBeforeGarnishments;
    calculationLog.push(`DisposableNet: €${disposableNet.toFixed(2)}`);
    
    // Get active garnishments for this employee
    const activeGarnishments = inputs.activeGarnishments || 
      await this.getActiveGarnishments(inputs.employeeId);
    
    // Orders processed by ascending priority, then by created_at.
    const sortedOrders = [...activeGarnishments].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    
    calculationLog.push(`Processing ${sortedOrders.length} orders by priority, then created_at`);
    
    let collectedYtd = 0; // Track year-to-date collections
    
    // For each active order
    for (const order of sortedOrders) {
      calculationLog.push(`--- Processing Order: ${order.orderRef} (${order.creditorName}) Priority ${order.priority} ---`);
      
      // Skip if DisposableNet is at or below protected floor
      const protectedNetFloor = order.protectedNetFloor || 0;
      if (disposableNet <= protectedNetFloor) {
        calculationLog.push(`Skipping - DisposableNet (€${disposableNet.toFixed(2)}) <= protected floor (€${protectedNetFloor.toFixed(2)})`);
        continue;
      }
      
      // Compute candidate
      let candidate = 0;
      
      if (order.method === 'fixed_amount') {
        candidate = Number(order.amount || 0);
        calculationLog.push(`Fixed amount candidate: €${candidate.toFixed(2)}`);
        
      } else if (order.method === 'percent_of_disposable_net') {
        const basePercent = Number(order.percent || 0) / 100;
        const maxPercentCap = order.maxPercentCap ? Number(order.maxPercentCap) / 100 : 1.0;
        
        candidate = Math.min(
          disposableNet * basePercent,
          disposableNet * maxPercentCap
        );
        
        calculationLog.push(`Percent candidate: min(€${disposableNet.toFixed(2)} * ${(basePercent*100).toFixed(2)}%, €${disposableNet.toFixed(2)} * ${(maxPercentCap*100).toFixed(2)}%) = €${candidate.toFixed(2)}`);
      }
      
      // Apply per-run cap if set
      if (order.perRunCap && candidate > Number(order.perRunCap)) {
        candidate = Number(order.perRunCap);
        calculationLog.push(`Applied per-run cap: €${candidate.toFixed(2)}`);
      }
      
      // Ensure protected net floor: deduction = min(candidate, max(0, DisposableNet - protected_net_floor))
      const maxDeductible = Math.max(0, disposableNet - protectedNetFloor);
      let deduction = Math.min(candidate, maxDeductible);
      
      calculationLog.push(`Protected floor enforcement: min(€${candidate.toFixed(2)}, max(0, €${disposableNet.toFixed(2)} - €${protectedNetFloor.toFixed(2)})) = €${deduction.toFixed(2)}`);
      
      // If total_balance present: deduction = min(deduction, total_balance - collected_ytd)
      if (order.totalBalance && deduction > 0) {
        const remainingBalance = Number(order.totalBalance) - collectedYtd;
        if (deduction > remainingBalance) {
          deduction = Math.max(0, remainingBalance);
          calculationLog.push(`Limited by remaining balance: €${deduction.toFixed(2)} (€${order.totalBalance} - €${collectedYtd.toFixed(2)} collected YTD)`);
        }
      }
      
      // Update running totals
      if (deduction > 0) {
        disposableNet -= deduction;
        collectedYtd += deduction;
        
        const remainingBalance = order.totalBalance ? 
          Math.max(0, Number(order.totalBalance) - collectedYtd) : 0;
        
        // Emit payslip line: GARN_{type} with creditor + ref, amount, and remaining balance
        garnishmentLines.push({
          type: `GARN_${order.type.toUpperCase()}`,
          creditor: order.creditorName,
          orderRef: order.orderRef,
          amount: deduction,
          remainingBalance,
          glAccount: order.creditorIban || `2200-GARN-${order.type.toUpperCase()}`,
          description: `Garnishment - ${order.creditorName} - Ref ${order.orderRef}`
        });
        
        calculationLog.push(`Deducted: €${deduction.toFixed(2)}, DisposableNet now: €${disposableNet.toFixed(2)}, Remaining balance: €${remainingBalance.toFixed(2)}`);
      } else {
        calculationLog.push(`No deduction this run - insufficient DisposableNet after protection`);
      }
      
      // Guarantee: DisposableNet never < protected_net_floor and never negative
      if (disposableNet < 0) {
        calculationLog.push(`ERROR: DisposableNet went negative (€${disposableNet.toFixed(2)}) - this should not happen`);
        disposableNet = Math.max(disposableNet, 0);
      }
    }
    
    const totalGarnishmentAmount = garnishmentLines.reduce((sum, line) => sum + line.amount, 0);
    
    calculationLog.push(`--- Final Results ---`);
    calculationLog.push(`Total Garnishment Amount: €${totalGarnishmentAmount.toFixed(2)}`);
    calculationLog.push(`Net After Garnishments: €${disposableNet.toFixed(2)}`);
    calculationLog.push(`Generated ${garnishmentLines.length} payslip lines`);
    
    return {
      garnishmentLines,
      netAfterGarnishments: disposableNet,
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
   * GL Posting (journal builder)
   * 
   * Debit: Payroll Clearing / Wages (per mapping)
   * Credit: Garnishment Payable — {Creditor} (liability)
   * Dimensions: property/department if available.
   * Reference: employee_id, order_ref.
   */
  static generateGLEntries(
    garnishmentLines: Array<{
      type: string;
      creditor: string;
      orderRef: string;
      amount: number;
      glAccount: string;
      description: string;
    }>,
    employeeId: string,
    property?: string,
    department?: string
  ): Array<{
    account: string;
    debit?: number;
    credit?: number;
    description: string;
    reference: string;
    dimensions?: any;
  }> {
    const glEntries: Array<{
      account: string;
      debit?: number;
      credit?: number;
      description: string;
      reference: string;
      dimensions?: any;
    }> = [];
    
    for (const line of garnishmentLines) {
      if (line.amount > 0) {
        const dimensions: any = {};
        if (property) dimensions.property = property;
        if (department) dimensions.department = department;
        
        // Debit: Payroll Clearing / Wages (per mapping)
        glEntries.push({
          account: '33.50.210', // Payroll Clearing account
          debit: line.amount,
          description: `Garnishment - ${line.orderRef} - ${employeeId}`,
          reference: `${employeeId}:${line.orderRef}`,
          dimensions
        });
        
        // Credit: Garnishment Payable — {Creditor} (liability)
        glEntries.push({
          account: line.glAccount,
          credit: line.amount,
          description: `Garnishment - ${line.creditor} - Ref ${line.orderRef} - ${employeeId}`,
          reference: `${employeeId}:${line.orderRef}`,
          dimensions
        });
      }
    }
    
    return glEntries;
  }
  
  /**
   * Edge Cases & Rules
   */
  static handleEdgeCases({
    disposableNet,
    protectedFloor,
    orders,
    runContext,
    employeeId
  }: {
    disposableNet: number;
    protectedFloor: number;
    orders: any[];
    runContext: { runType: string; endDate?: string; };
    employeeId: string;
  }) {
    const log: string[] = [];
    
    // If DisposableNet ≤ protected floor, skip deduction and log reason.
    if (disposableNet <= protectedFloor) {
      log.push(`EDGE CASE: DisposableNet (€${disposableNet.toFixed(2)}) <= protected floor (€${protectedFloor.toFixed(2)}) - no deductions this run`);
      return { canProceed: false, log };
    }
    
    // Stop conditions: end_date passed OR total_balance reached → status completed.
    const now = new Date();
    for (const order of orders) {
      if (order.endDate && new Date(order.endDate) < now) {
        log.push(`EDGE CASE: Order ${order.orderRef} end date passed - marking completed`);
        // Would update order status to 'completed' here
      }
      
      if (order.totalBalance && order.collectedYtd >= order.totalBalance) {
        log.push(`EDGE CASE: Order ${order.orderRef} total balance reached - marking completed`);
        // Would update order status to 'completed' here
      }
    }
    
    // Off-cycle: respect apply_scope (e.g., only regular).
    if (runContext.runType !== 'regular') {
      const applicableOrders = orders.filter(order => {
        if (order.applyTo === 'regular_only' && runContext.runType !== 'regular') {
          log.push(`EDGE CASE: Order ${order.orderRef} applies to regular runs only - skipping ${runContext.runType} run`);
          return false;
        }
        return true;
      });
      return { canProceed: true, log, filteredOrders: applicableOrders };
    }
    
    // Name/IBAN missing: allow creation (for liability), block payment file generation until provided.
    for (const order of orders) {
      if (!order.creditorIban || !order.creditorName) {
        log.push(`EDGE CASE: Order ${order.orderRef} missing creditor details - liability OK, payment blocked`);
      }
    }
    
    return { canProceed: true, log, filteredOrders: orders };
  }
  
  /**
   * Reversal: if payroll run reversed, restore collected_ytd and reopen balance.
   */
  static async reversePayrollRun(payrollRunId: string, employeeId: string): Promise<void> {
    // Find all garnishment transactions for this payroll run
    const transactions = await db
      .select()
      .from(garnishmentTransactions)
      .where(
        and(
          eq(garnishmentTransactions.payrollRunId, payrollRunId),
          eq(garnishmentTransactions.employeeId, employeeId)
        )
      );
    
    // Reverse each transaction
    for (const transaction of transactions) {
      if (transaction.deductedAmount) {
        // Restore collected_ytd and reopen balance
        await db
          .update(garnishmentOrders)
          .set({
            totalDeducted: sql`total_deducted - ${transaction.deductedAmount}`,
            currentBalance: sql`current_balance + ${transaction.deductedAmount}`,
            status: 'active', // Reopen if it was completed
            updatedAt: new Date()
          })
          .where(eq(garnishmentOrders.id, transaction.garnishmentOrderId));
      }
    }
    
    // Mark transactions as reversed
    await db
      .update(garnishmentTransactions)
      .set({ 
        status: 'reversed',
        reversedAt: new Date()
      })
      .where(
        and(
          eq(garnishmentTransactions.payrollRunId, payrollRunId),
          eq(garnishmentTransactions.employeeId, employeeId)
        )
      );
  }
}