import { db } from "../db";
import { eq, and, sql } from "drizzle-orm";
import { 
  glConnections, 
  glMappings, 
  glJournals, 
  glJournalLines, 
  employees,
  payrollLines,
  payrollRuns,
  type GLConnection,
  type GLMapping,
  type GLJournal,
  type InsertGLJournal,
  type InsertGLJournalLine
} from "@shared/schema";
import crypto from "crypto";

/**
 * GL Export Service for Embedded Payroll API
 * Handles journal generation, account mappings, and GL integrations
 */
export class GLExportService {
  /**
   * Generate GL journal entries for a payroll run
   */
  static async generateJournalForPayrollRun(
    connectionId: string,
    payrollRunId: string,
    journalDate: string,
    description: string
  ): Promise<GLJournal> {
    // Get GL connection and verify it's active
    const [connection] = await db
      .select()
      .from(glConnections)
      .where(and(
        eq(glConnections.id, connectionId),
        eq(glConnections.status, "active")
      ));

    if (!connection) {
      throw new Error("GL connection not found or inactive");
    }

    // Get account mappings for this connection
    const mappings = await db
      .select()
      .from(glMappings)
      .where(and(
        eq(glMappings.connectionId, connectionId),
        eq(glMappings.isActive, true)
      ));

    if (mappings.length === 0) {
      throw new Error("No GL account mappings configured");
    }

    // Get payroll run data
    const payrollData = await db
      .select({
        runId: payrollLines.runId,
        employeeId: payrollLines.employeeId,
        code: payrollLines.code,
        description: payrollLines.description,
        amount: payrollLines.amount,
        isDeduction: payrollLines.isDeduction,
        employeeName: employees.name,
        employeeNumber: employees.employeeNumber,
      })
      .from(payrollLines)
      .innerJoin(employees, eq(payrollLines.employeeId, employees.employeeId))
      .where(eq(payrollLines.runId, payrollRunId));

    if (payrollData.length === 0) {
      throw new Error("No payroll data found for run");
    }

    // Generate journal reference
    const journalReference = `PAY-${payrollRunId.slice(-8)}-${new Date().getTime().toString().slice(-6)}`;

    // Create journal entry
    const [journal] = await db
      .insert(glJournals)
      .values({
        connectionId,
        payrollRunId,
        journalReference,
        journalDate: journalDate,
        description,
        status: "draft",
      })
      .returning();

    // Group payroll data by component and generate journal lines
    const componentTotals = new Map<string, { debit: number; credit: number; employees: string[] }>();
    
    for (const line of payrollData) {
      const mapping = mappings.find(m => m.payrollComponent === line.code);
      if (!mapping) {
        console.warn(`No GL mapping found for component: ${line.code}`);
        continue;
      }

      const amount = parseFloat(line.amount) || 0;
      const key = `${mapping.componentType}-${mapping.glAccountCode}`;
      
      if (!componentTotals.has(key)) {
        componentTotals.set(key, { 
          debit: 0, 
          credit: 0, 
          employees: [] 
        });
      }

      const total = componentTotals.get(key)!;
      
      // Determine debit/credit based on component type
      if (["earning", "benefit"].includes(mapping.componentType)) {
        total.debit += amount; // Expense accounts
      } else if (line.isDeduction || ["deduction", "tax"].includes(mapping.componentType)) {
        total.credit += amount; // Liability accounts
      } else {
        total.debit += amount; // Default to debit for earnings
      }
      
      total.employees.push(`${line.employeeNumber} - ${line.employeeName}`);
    }

    // Generate journal lines
    const journalLines: InsertGLJournalLine[] = [];
    let lineNumber = 1;
    let totalDebits = 0;
    let totalCredits = 0;

    // Add component lines
    for (const [key, totals] of Array.from(componentTotals.entries())) {
      const [componentType, accountCode] = key.split('-');
      const mapping = mappings.find(m => 
        m.componentType === componentType && m.glAccountCode === accountCode
      );

      if (!mapping) continue;

      if (totals.debit > 0) {
        journalLines.push({
          journalId: journal.id,
          lineNumber: lineNumber++,
          accountCode: mapping.debitAccount || mapping.glAccountCode,
          accountName: mapping.glAccountName,
          description: `${mapping.payrollComponent} - ${description}`,
          debitAmount: totals.debit.toFixed(2),
          creditAmount: "0.00",
          reference: journalReference,
        });
        totalDebits += totals.debit;
      }

      if (totals.credit > 0) {
        journalLines.push({
          journalId: journal.id,
          lineNumber: lineNumber++,
          accountCode: mapping.creditAccount || mapping.glAccountCode,
          accountName: mapping.glAccountName,
          description: `${mapping.payrollComponent} - ${description}`,
          debitAmount: "0.00",
          creditAmount: totals.credit.toFixed(2),
          reference: journalReference,
        });
        totalCredits += totals.credit;
      }
    }

    // Add balancing entry for net pay (bank account)
    const netPay = totalDebits - totalCredits;
    if (netPay !== 0) {
      const bankMapping = mappings.find(m => 
        m.payrollComponent === "BANK_ACCOUNT" || m.componentType === "bank"
      );
      
      const bankAccountCode = bankMapping?.glAccountCode || "1200"; // Default cash account
      
      journalLines.push({
        journalId: journal.id,
        lineNumber: lineNumber++,
        accountCode: bankAccountCode,
        accountName: "Cash - Payroll Account",
        description: `Net Pay - ${description}`,
        debitAmount: netPay < 0 ? "0.00" : netPay.toFixed(2),
        creditAmount: netPay < 0 ? Math.abs(netPay).toFixed(2) : "0.00",
        reference: journalReference,
      });
      
      if (netPay > 0) {
        totalDebits += netPay;
      } else {
        totalCredits += Math.abs(netPay);
      }
    }

    // Insert all journal lines
    if (journalLines.length > 0) {
      await db.insert(glJournalLines).values(journalLines);
    }

    // Update journal with totals
    const [updatedJournal] = await db
      .update(glJournals)
      .set({
        totalDebit: totalDebits.toFixed(2),
        totalCredit: totalCredits.toFixed(2),
        journalData: JSON.stringify({
          componentTotals: Object.fromEntries(Array.from(componentTotals.entries())),
          linesGenerated: journalLines.length,
          generatedAt: new Date().toISOString(),
        }),
      })
      .where(eq(glJournals.id, journal.id))
      .returning();

    return updatedJournal;
  }

  /**
   * Get GL account mappings for a connection
   */
  static async getGLMappings(connectionId: string): Promise<GLMapping[]> {
    return await db
      .select()
      .from(glMappings)
      .where(and(
        eq(glMappings.connectionId, connectionId),
        eq(glMappings.isActive, true)
      ));
  }

  /**
   * Create or update GL account mapping
   */
  static async upsertGLMapping(
    connectionId: string,
    payrollComponent: string,
    componentType: "earning" | "deduction" | "tax" | "benefit",
    glAccountCode: string,
    glAccountName?: string,
    debitAccount?: string,
    creditAccount?: string
  ): Promise<GLMapping> {
    // Check if mapping exists
    const [existing] = await db
      .select()
      .from(glMappings)
      .where(and(
        eq(glMappings.connectionId, connectionId),
        eq(glMappings.payrollComponent, payrollComponent)
      ));

    if (existing) {
      // Update existing mapping
      const [updated] = await db
        .update(glMappings)
        .set({
          componentType,
          glAccountCode,
          glAccountName,
          debitAccount,
          creditAccount,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(glMappings.id, existing.id))
        .returning();
      
      return updated;
    } else {
      // Create new mapping
      const [created] = await db
        .insert(glMappings)
        .values({
          connectionId,
          payrollComponent,
          componentType,
          glAccountCode,
          glAccountName,
          debitAccount,
          creditAccount,
          isActive: true,
        })
        .returning();

      return created;
    }
  }

  /**
   * Validate journal balances
   */
  static async validateJournal(journalId: string): Promise<{
    isBalanced: boolean;
    totalDebits: number;
    totalCredits: number;
    difference: number;
    errors: string[];
  }> {
    const lines = await db
      .select()
      .from(glJournalLines)
      .where(eq(glJournalLines.journalId, journalId));

    let totalDebits = 0;
    let totalCredits = 0;
    const errors: string[] = [];

    for (const line of lines) {
      const debit = parseFloat(line.debitAmount || "0");
      const credit = parseFloat(line.creditAmount || "0");
      
      totalDebits += debit;
      totalCredits += credit;

      // Validate line has either debit or credit but not both
      if (debit > 0 && credit > 0) {
        errors.push(`Line ${line.lineNumber}: Cannot have both debit and credit amounts`);
      }
      
      if (debit === 0 && credit === 0) {
        errors.push(`Line ${line.lineNumber}: Must have either debit or credit amount`);
      }
      
      if (!line.accountCode) {
        errors.push(`Line ${line.lineNumber}: Missing account code`);
      }
    }

    const difference = Math.abs(totalDebits - totalCredits);
    const isBalanced = difference < 0.01; // Allow for rounding differences

    if (!isBalanced) {
      errors.push(`Journal is not balanced. Difference: ${difference.toFixed(2)}`);
    }

    return {
      isBalanced,
      totalDebits,
      totalCredits,
      difference,
      errors,
    };
  }

  /**
   * Post journal to GL system
   */
  static async postJournal(journalId: string): Promise<GLJournal> {
    // Validate journal first
    const validation = await this.validateJournal(journalId);
    if (!validation.isBalanced) {
      throw new Error(`Cannot post unbalanced journal: ${validation.errors.join(", ")}`);
    }

    // Get journal
    const [journal] = await db
      .select()
      .from(glJournals)
      .where(eq(glJournals.id, journalId));

    if (!journal) {
      throw new Error("Journal not found");
    }

    if (journal.status === "posted") {
      throw new Error("Journal already posted");
    }

    // Get connection details for posting
    const [connection] = await db
      .select()
      .from(glConnections)
      .where(eq(glConnections.id, journal.connectionId));

    if (!connection) {
      throw new Error("GL connection not found");
    }

    let externalId: string | null = null;
    let errorMessage: string | null = null;
    let status: "posted" | "error" = "posted";

    try {
      // Post to external GL system based on provider
      switch (connection.glProvider) {
        case "xero":
          externalId = await this.postToXero(journal, connection);
          break;
        case "quickbooks":
          externalId = await this.postToQuickBooks(journal, connection);
          break;
        case "generic":
          // For generic GL, just mark as posted with journal reference
          externalId = journal.journalReference;
          break;
        default:
          throw new Error(`Unsupported GL provider: ${connection.glProvider}`);
      }
    } catch (error) {
      status = "error";
      errorMessage = error instanceof Error ? error.message : "Unknown error";
    }

    // Update journal status
    const [updatedJournal] = await db
      .update(glJournals)
      .set({
        status,
        externalId,
        errorMessage,
        postedAt: status === "posted" ? new Date() : null,
      })
      .where(eq(glJournals.id, journalId))
      .returning();

    return updatedJournal;
  }

  /**
   * Post journal to Xero (placeholder implementation)
   */
  private static async postToXero(journal: GLJournal, connection: GLConnection): Promise<string> {
    // TODO: Implement Xero API integration
    // This would use Xero's accounting API to create a manual journal
    console.log("Posting to Xero:", { journalId: journal.id, connectionId: connection.id });
    
    // Simulate posting delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return mock external ID
    return `xero-${journal.journalReference}`;
  }

  /**
   * Post journal to QuickBooks (placeholder implementation)
   */
  private static async postToQuickBooks(journal: GLJournal, connection: GLConnection): Promise<string> {
    // TODO: Implement QuickBooks API integration
    // This would use QuickBooks Online API to create a journal entry
    console.log("Posting to QuickBooks:", { journalId: journal.id, connectionId: connection.id });
    
    // Simulate posting delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return mock external ID
    return `qbo-${journal.journalReference}`;
  }

  /**
   * Get journal entries for a GL connection
   */
  static async getJournals(
    connectionId: string,
    status?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<GLJournal[]> {
    let queryConditions = [eq(glJournals.connectionId, connectionId)];
    
    if (status) {
      queryConditions.push(eq(glJournals.status, status));
    }

    const query = db
      .select()
      .from(glJournals)
      .where(and(...queryConditions))
      .limit(limit)
      .offset(offset)
      .orderBy(glJournals.createdAt);

    return await query;
  }

  /**
   * Generate journal export for accounting software
   */
  static async exportJournalData(journalId: string, format: "csv" | "json" | "xlsx"): Promise<{
    data: any;
    filename: string;
    contentType: string;
  }> {
    // Get journal with lines
    const [journal] = await db
      .select()
      .from(glJournals)
      .where(eq(glJournals.id, journalId));

    if (!journal) {
      throw new Error("Journal not found");
    }

    const lines = await db
      .select()
      .from(glJournalLines)
      .where(eq(glJournalLines.journalId, journalId))
      .orderBy(glJournalLines.lineNumber);

    const filename = `journal_${journal.journalReference}_${new Date().toISOString().split('T')[0]}`;

    switch (format) {
      case "json":
        return {
          data: {
            journal: {
              reference: journal.journalReference,
              date: journal.journalDate,
              description: journal.description,
              totalDebit: journal.totalDebit,
              totalCredit: journal.totalCredit,
              status: journal.status,
            },
            lines: lines.map(line => ({
              lineNumber: line.lineNumber,
              accountCode: line.accountCode,
              accountName: line.accountName,
              description: line.description,
              debitAmount: line.debitAmount,
              creditAmount: line.creditAmount,
              reference: line.reference,
            })),
          },
          filename: `${filename}.json`,
          contentType: "application/json",
        };

      case "csv":
        const csvHeader = "Line,AccountCode,AccountName,Description,Debit,Credit,Reference\n";
        const csvLines = lines
          .map(line => 
            `${line.lineNumber},"${line.accountCode}","${line.accountName || ''}","${line.description}",${line.debitAmount || 0},${line.creditAmount || 0},"${line.reference || ''}"`
          )
          .join("\n");
        
        return {
          data: csvHeader + csvLines,
          filename: `${filename}.csv`,
          contentType: "text/csv",
        };

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }
}