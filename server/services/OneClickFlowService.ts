/**
 * One-Click Flow Service (Disaster Mode: Offline Payroll Kit)
 * Implements emergency payroll kit generation when bank/API systems are down
 */

import crypto from 'crypto';
import { nanoid } from 'nanoid';
import { db } from '../db';
import { 
  paymentBatches, 
  paymentTransactions, 
  bankProfiles 
} from '@shared/payments-schema';
import { eq, and, sql, inArray, ne } from 'drizzle-orm';
import { SafetyComplianceService } from './safetyComplianceService';

export interface FreezeRequest {
  runId: string;
  operatorId: string;
  reason: string;
  emergencyPassword: string; // For AES-256 encryption
  includeSepaXml?: boolean;
}

export interface NetLedgerEntry {
  employee_id: string;
  full_name: string;
  iban: string;
  bic?: string;
  amount_eur: string;
  payment_ref: string;
  property_id: string;
  department: string;
  disbursement_key: string;
}

export interface OfflineKit {
  freezeId: string;
  runId: string;
  freezeHash: string;
  artifacts: {
    netLedger: string; // CSV content
    bankTemplates: Record<string, string>; // Bank profile ID -> CSV/TXT content
    sepaXml?: string; // Optional pain.001 XML
    playbookPdf: string; // Base64 encoded PDF
    reconciliationTemplate: string; // CSV template
  };
  metadata: {
    totalLines: number;
    totalAmount: number;
    bankProfiles: string[];
    generatedAt: string;
    operatorId: string;
    encryptionMethod: string;
  };
}

export interface FreezeResult {
  success: boolean;
  freezeId?: string;
  freezeHash?: string;
  downloadUrl?: string;
  processingTime: number;
  errors?: string[];
  kitSize?: number; // bytes
}

export class OneClickFlowService {

  /**
   * Enter Disaster Mode - Freeze run and generate offline kit
   * Target: < 60s for complete kit generation
   */
  static async freezeRunAndGenerateKit(request: FreezeRequest): Promise<FreezeResult> {
    const startTime = Date.now();
    const freezeId = nanoid(12);
    
    try {
      // Step 1: Validate run status and lock
      await this.validateAndLockRun(request.runId, request.operatorId);
      
      // Step 2: Assemble Net Ledger from finalized payslips (exclude on-hold)
      const netLedger = await this.assembleNetLedger(request.runId, freezeId);
      
      // Step 3: Generate Disbursement Keys per line
      const enrichedLedger = await this.generateDisbursementKeys(netLedger, request.runId);
      
      // Step 4: Compute Freeze Hash over sorted lines
      const freezeHash = this.computeFreezeHash(enrichedLedger, freezeId);
      
      // Step 5: Generate Bank-specific templates
      const bankTemplates = await this.generateBankTemplates(enrichedLedger);
      
      // Step 6: Optional SEPA pain.001 generation
      let sepaXml: string | undefined;
      if (request.includeSepaXml) {
        sepaXml = await this.generateSepaXml(enrichedLedger);
      }
      
      // Step 7: Generate Operator Playbook PDF
      const playbookPdf = await this.generatePlaybookPdf(enrichedLedger, freezeHash, freezeId);
      
      // Step 8: Generate Reconciliation CSV template
      const reconciliationTemplate = this.generateReconciliationTemplate(enrichedLedger);
      
      // Step 9: Create Offline Kit
      const offlineKit: OfflineKit = {
        freezeId,
        runId: request.runId,
        freezeHash,
        artifacts: {
          netLedger: this.generateNetLedgerCSV(enrichedLedger),
          bankTemplates,
          sepaXml,
          playbookPdf,
          reconciliationTemplate
        },
        metadata: {
          totalLines: enrichedLedger.length,
          totalAmount: enrichedLedger.reduce((sum, entry) => sum + parseFloat(entry.amount_eur), 0),
          bankProfiles: Array.from(new Set(enrichedLedger.map(e => this.getBankProfileFromIban(e.iban)))),
          generatedAt: new Date().toISOString(),
          operatorId: request.operatorId,
          encryptionMethod: 'AES-256-GCM'
        }
      };
      
      // Step 10: Encrypt and package kit
      const encryptedKit = await this.encryptAndPackageKit(offlineKit, request.emergencyPassword);
      
      // Step 11: Store metadata and mark instructions frozen_offline
      await this.markInstructionsFrozenOffline(enrichedLedger, freezeId, freezeHash);
      
      // Step 12: Store kit metadata and audit log
      await this.storeKitMetadata(offlineKit, request.operatorId);
      
      const processingTime = Date.now() - startTime;
      
      // Log completion
      await SafetyComplianceService.logAuditEvent({
        eventType: 'disaster_mode_kit_generated',
        operatorId: request.operatorId,
        entityId: request.runId,
        metadata: {
          freezeId,
          freezeHash,
          processingTime,
          totalLines: enrichedLedger.length,
          kitSizeBytes: encryptedKit.size,
          reason: request.reason
        }
      });
      
      return {
        success: true,
        freezeId,
        freezeHash,
        downloadUrl: `/api/offline-kits/${freezeId}/download`, // Will be implemented in routes
        processingTime,
        kitSize: encryptedKit.size
      };
      
    } catch (error) {
      console.error('One-Click Flow failed:', error);
      
      await SafetyComplianceService.logAuditEvent({
        eventType: 'disaster_mode_kit_failed',
        operatorId: request.operatorId,
        entityId: request.runId,
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          processingTime: Date.now() - startTime,
          reason: request.reason
        }
      });
      
      return {
        success: false,
        processingTime: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * Validate run is finalized and lock for disaster mode
   */
  private static async validateAndLockRun(runId: string, operatorId: string): Promise<void> {
    // Check run status = finalized
    const batches = await db
      .select()
      .from(paymentBatches)
      .where(eq(paymentBatches.runId, runId));
    
    if (batches.length === 0) {
      throw new Error(`Run ${runId} not found`);
    }
    
    const hasNonFinalizedBatch = batches.some(batch => batch.status !== 'finalized');
    if (hasNonFinalizedBatch) {
      throw new Error(`Run ${runId} contains non-finalized batches. All batches must be finalized before freeze.`);
    }
    
    // Check for blocking exceptions (missing IBANs, etc.)
    const transactions = await db
      .select()
      .from(paymentTransactions)
      .where(inArray(paymentTransactions.batchId, batches.map(b => b.batchId)));
    
    const missingIbans = transactions.filter(t => !t.creditorAccount || t.creditorAccount.length < 15);
    if (missingIbans.length > 0) {
      throw new Error(`${missingIbans.length} payment lines have missing or invalid IBANs`);
    }
    
    // Update batch status to disaster_freeze (prevents edits)
    await db
      .update(paymentBatches)
      .set({ 
        status: 'disaster_freeze',
        updatedAt: new Date(),
        lockedBy: operatorId,
        lockedAt: new Date()
      })
      .where(inArray(paymentBatches.batchId, batches.map(b => b.batchId)));
  }

  /**
   * Assemble Net Ledger from finalized payslips, excluding on-hold employees
   */
  private static async assembleNetLedger(runId: string, freezeId: string): Promise<NetLedgerEntry[]> {
    const transactions = await db
      .select({
        transactionId: paymentTransactions.transactionId,
        employeeId: paymentTransactions.employeeId,
        creditorName: paymentTransactions.creditorName,
        creditorAccount: paymentTransactions.creditorAccount,
        creditorBic: paymentTransactions.creditorBank,
        amount: paymentTransactions.amount,
        endToEndId: paymentTransactions.endToEndId,
        status: paymentTransactions.status,
        batchId: paymentTransactions.batchId
      })
      .from(paymentTransactions)
      .innerJoin(paymentBatches, eq(paymentTransactions.batchId, paymentBatches.batchId))
      .where(
        and(
          eq(paymentBatches.runId, runId),
          ne(paymentTransactions.status, 'on_hold'), // Exclude on-hold employees
          ne(paymentTransactions.status, 'cancelled')
        )
      );
    
    return transactions.map(tx => ({
      employee_id: tx.employeeId,
      full_name: tx.creditorName || 'Unknown',
      iban: tx.creditorAccount || '',
      bic: tx.creditorBic || undefined,
      amount_eur: tx.amount,
      payment_ref: tx.endToEndId || tx.transactionId,
      property_id: 'default', // Will be enriched from batch/employee data in production
      department: 'payroll', // Would be enriched from employee data in production
      disbursement_key: '' // Will be generated next
    }));
  }

  /**
   * Generate Disbursement Keys per line for double-pay protection
   */
  private static async generateDisbursementKeys(
    ledger: NetLedgerEntry[], 
    runId: string
  ): Promise<NetLedgerEntry[]> {
    const period = new Date().toISOString().substring(0, 7); // YYYY-MM format
    
    return ledger.map(entry => ({
      ...entry,
      disbursement_key: SafetyComplianceService.generateDisbursementKey(
        entry.employee_id,
        period,
        parseFloat(entry.amount_eur),
        runId
      )
    }));
  }

  /**
   * Compute Freeze Hash over sorted lines to prove integrity
   */
  private static computeFreezeHash(ledger: NetLedgerEntry[], freezeId: string): string {
    // Sort by employee_id for deterministic ordering
    const sortedLedger = [...ledger].sort((a, b) => a.employee_id.localeCompare(b.employee_id));
    
    // Create hash payload
    const payload = {
      freezeId,
      totalLines: sortedLedger.length,
      totalAmount: sortedLedger.reduce((sum, entry) => sum + parseFloat(entry.amount_eur), 0),
      entries: sortedLedger.map(entry => ({
        employee_id: entry.employee_id,
        iban: entry.iban,
        amount_eur: entry.amount_eur,
        disbursement_key: entry.disbursement_key
      }))
    };
    
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');
  }

  /**
   * Generate bank-specific CSV/TXT templates for manual portal import
   */
  private static async generateBankTemplates(ledger: NetLedgerEntry[]): Promise<Record<string, string>> {
    // Group by bank profile (detected from IBAN)
    const bankGroups = new Map<string, NetLedgerEntry[]>();
    
    ledger.forEach(entry => {
      const bankProfile = this.getBankProfileFromIban(entry.iban);
      if (!bankGroups.has(bankProfile)) {
        bankGroups.set(bankProfile, []);
      }
      bankGroups.get(bankProfile)!.push(entry);
    });
    
    const templates: Record<string, string> = {};
    
    // Get bank profile configurations
    const profileIds = Array.from(bankGroups.keys());
    const profiles = await db
      .select()
      .from(bankProfiles)
      .where(inArray(bankProfiles.profileId, profileIds));
    
    bankGroups.forEach((entries, profileId) => {
      const profile = profiles.find(p => p.profileId === profileId);
      templates[profileId] = this.generateBankSpecificTemplate(entries, profile);
    });
    
    return templates;
  }

  /**
   * Generate bank-specific template based on bank profile
   */
  private static generateBankSpecificTemplate(
    entries: NetLedgerEntry[], 
    profile: any
  ): string {
    switch (profile?.profileId) {
      case 'alpha':
        return this.generateAlphaBankTemplate(entries);
      case 'piraeus':
        return this.generatePiraeusTemplate(entries);
      case 'eurobank':
        return this.generateEurobankTemplate(entries);
      case 'nbg':
        return this.generateNBGTemplate(entries);
      default:
        return this.generateGenericTemplate(entries);
    }
  }

  /**
   * Alpha Bank CSV template
   */
  private static generateAlphaBankTemplate(entries: NetLedgerEntry[]): string {
    const header = 'IBAN,Name,Amount,Reference,Purpose\n';
    const rows = entries.map(entry => 
      `"${entry.iban}","${entry.full_name}","${entry.amount_eur}","${entry.payment_ref}","Salary Payment"`
    ).join('\n');
    
    return header + rows;
  }

  /**
   * Piraeus e-PPS template
   */
  private static generatePiraeusTemplate(entries: NetLedgerEntry[]): string {
    const header = 'BeneficiaryIBAN,BeneficiaryName,Amount,RemittanceInfo\n';
    const rows = entries.map(entry => 
      `${entry.iban},${entry.full_name},${entry.amount_eur},${entry.payment_ref}`
    ).join('\n');
    
    return header + rows;
  }

  /**
   * Eurobank Corporate template
   */
  private static generateEurobankTemplate(entries: NetLedgerEntry[]): string {
    const header = 'IBAN;NAME;AMOUNT;REFERENCE;CURRENCY\n';
    const rows = entries.map(entry => 
      `${entry.iban};${entry.full_name};${entry.amount_eur};${entry.payment_ref};EUR`
    ).join('\n');
    
    return header + rows;
  }

  /**
   * NBG bulk payment template
   */
  private static generateNBGTemplate(entries: NetLedgerEntry[]): string {
    const header = 'IBAN|NAME|AMOUNT|REFERENCE|BIC\n';
    const rows = entries.map(entry => 
      `${entry.iban}|${entry.full_name}|${entry.amount_eur}|${entry.payment_ref}|${entry.bic || ''}`
    ).join('\n');
    
    return header + rows;
  }

  /**
   * Generic SEPA template
   */
  private static generateGenericTemplate(entries: NetLedgerEntry[]): string {
    const header = 'IBAN,Name,Amount,Reference,BIC\n';
    const rows = entries.map(entry => 
      `${entry.iban},"${entry.full_name}",${entry.amount_eur},"${entry.payment_ref}","${entry.bic || ''}"`
    ).join('\n');
    
    return header + rows;
  }

  /**
   * Generate SEPA pain.001 XML for later upload
   */
  private static async generateSepaXml(ledger: NetLedgerEntry[]): Promise<string> {
    // This would use the existing SepaFileGenerator
    // For now, return a placeholder
    return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03">
  <!-- Disaster Mode SEPA XML would be generated here -->
  <!-- Total transactions: ${ledger.length} -->
  <!-- Total amount: ${ledger.reduce((sum, e) => sum + parseFloat(e.amount_eur), 0)} EUR -->
</Document>`;
  }

  /**
   * Generate Operator Playbook PDF (instructions for manual execution)
   */
  private static async generatePlaybookPdf(
    ledger: NetLedgerEntry[], 
    freezeHash: string, 
    freezeId: string
  ): Promise<string> {
    // In production, this would generate a proper PDF
    // For now, return base64 encoded text content
    const content = `
DISASTER MODE PAYROLL PLAYBOOK
===============================

Freeze ID: ${freezeId}
Freeze Hash: ${freezeHash}
Generated: ${new Date().toISOString()}

VERIFICATION CHECKLIST:
□ Verify freeze hash matches: ${freezeHash}
□ Total payment lines: ${ledger.length}
□ Total amount: ${ledger.reduce((sum, e) => sum + parseFloat(e.amount_eur), 0)} EUR

EXECUTION STEPS:
1. Use bank-specific CSV templates for portal import
2. Verify cut-off times before submission
3. Record transaction IDs in reconciliation template
4. Upload confirmations when systems recover

IMPORTANT: Do not make manual payments outside this kit to prevent double payments.
    `;
    
    return Buffer.from(content).toString('base64');
  }

  /**
   * Generate reconciliation CSV template for importing confirmations
   */
  private static generateReconciliationTemplate(ledger: NetLedgerEntry[]): string {
    const header = 'disbursement_key,employee_id,transaction_id,settlement_date,settlement_time,bank_reference,status\n';
    const rows = ledger.map(entry => 
      `${entry.disbursement_key},${entry.employee_id},,,,,"pending"`
    ).join('\n');
    
    return header + rows;
  }

  /**
   * Generate Net Ledger canonical CSV
   */
  private static generateNetLedgerCSV(ledger: NetLedgerEntry[]): string {
    const header = 'employee_id,full_name,iban,bic,amount_eur,payment_ref,property_id,department,disbursement_key\n';
    const rows = ledger.map(entry => 
      `"${entry.employee_id}","${entry.full_name}","${entry.iban}","${entry.bic || ''}","${entry.amount_eur}","${entry.payment_ref}","${entry.property_id}","${entry.department}","${entry.disbursement_key}"`
    ).join('\n');
    
    return header + rows;
  }

  /**
   * Encrypt and package offline kit
   */
  private static async encryptAndPackageKit(
    kit: OfflineKit, 
    password: string
  ): Promise<{ data: Buffer; size: number }> {
    // Create ZIP-like structure (simplified for implementation)
    const kitData = JSON.stringify(kit);
    
    // AES-256-GCM encryption
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const salt = crypto.randomBytes(32);
    
    // Derive key from password
    const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
    
    const cipher = crypto.createCipher(algorithm, key);
    let encrypted = cipher.update(kitData, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Package with metadata
    const packagedData = {
      algorithm,
      iv: iv.toString('hex'),
      salt: salt.toString('hex'),
      authTag: authTag.toString('hex'),
      data: encrypted
    };
    
    const finalData = Buffer.from(JSON.stringify(packagedData));
    
    return {
      data: finalData,
      size: finalData.length
    };
  }

  /**
   * Mark payment instructions as frozen_offline
   */
  private static async markInstructionsFrozenOffline(
    ledger: NetLedgerEntry[], 
    freezeId: string, 
    freezeHash: string
  ): Promise<void> {
    const employeeIds = ledger.map(entry => entry.employee_id);
    
    await db
      .update(paymentTransactions)
      .set({
        status: 'frozen_offline',
        updatedAt: new Date(),
        freezeId,
        freezeHash
      })
      .where(inArray(paymentTransactions.employeeId, employeeIds));
  }

  /**
   * Store kit metadata in database and audit log
   */
  private static async storeKitMetadata(kit: OfflineKit, operatorId: string): Promise<void> {
    // This would store in a dedicated offline_kits table in production
    // For now, just log to audit
    await SafetyComplianceService.logAuditEvent({
      eventType: 'offline_kit_stored',
      operatorId,
      entityId: kit.runId,
      metadata: {
        freezeId: kit.freezeId,
        freezeHash: kit.freezeHash,
        totalLines: kit.metadata.totalLines,
        totalAmount: kit.metadata.totalAmount,
        bankProfiles: kit.metadata.bankProfiles,
        encryptionMethod: kit.metadata.encryptionMethod
      }
    });
  }

  /**
   * Detect bank profile from IBAN country and bank code
   */
  private static getBankProfileFromIban(iban: string): string {
    if (!iban || iban.length < 8) return 'generic';
    
    const countryCode = iban.substring(0, 2);
    const bankCode = iban.substring(4, 7);
    
    if (countryCode !== 'GR') return 'generic';
    
    // Greek bank codes
    switch (bankCode) {
      case '014': return 'alpha';      // Alpha Bank
      case '017': return 'piraeus';    // Piraeus Bank
      case '026': return 'eurobank';   // Eurobank
      case '011': return 'nbg';        // National Bank of Greece
      default: return 'generic';
    }
  }

  /**
   * Get disaster mode status for a run
   */
  static async getDisasterModeStatus(runId: string): Promise<{
    isInDisasterMode: boolean;
    freezeId?: string;
    freezeHash?: string;
    frozenAt?: string;
  }> {
    const batches = await db
      .select()
      .from(paymentBatches)
      .where(
        and(
          eq(paymentBatches.runId, runId),
          eq(paymentBatches.status, 'disaster_freeze')
        )
      );
    
    if (batches.length === 0) {
      return { isInDisasterMode: false };
    }
    
    const firstBatch = batches[0];
    return {
      isInDisasterMode: true,
      freezeId: firstBatch.freezeId || undefined,
      freezeHash: firstBatch.freezeHash || undefined,
      frozenAt: firstBatch.lockedAt?.toISOString() || undefined
    };
  }
}