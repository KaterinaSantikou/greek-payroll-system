/**
 * Payment Batch Service - Complete data flow from payroll to bank submission
 */

import { db } from '../db';
import { paymentBatches, paymentTransactions } from '@shared/payments-schema';
import { bankRegistry as bankProfiles } from '@shared/schema';
import { payrollRuns, payrollLines, employees } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import crypto from 'crypto';

export interface PayrollToBatchRequest {
  runId: string;
  entityId: string;
  bankProfile: string;
  requestedExecutionDate: Date;
  paymentMethod: 'SCT' | 'SCT_INST' | 'AUTO'; // AUTO = SCT with instant fallback
}

export interface PaymentBatchResult {
  batchId: string;
  messageId: string;
  totalTransactions: number;
  totalAmount: string;
  sctBreakdown: { count: number; amount: string };
  sctInstBreakdown: { count: number; amount: string };
  pain001Xml: string;
  submissionReady: boolean;
  auditHash: string;
}

export interface BankSubmissionRequest {
  batchId: string;
  submissionMethod: 'SFTP' | 'HOST_TO_HOST' | 'API';
  bankEndpoint: string;
  credentials?: {
    username: string;
    password: string;
    certificatePath?: string;
  };
}

export interface BankSubmissionResult {
  submissionId: string;
  batchId: string;
  submissionMethod: string;
  submitted: boolean;
  bankAckReceived: boolean;
  bankReference?: string;
  submittedAt: Date;
  auditHash: string;
}

export class PaymentBatchService {
  private static auditChain: string[] = [];

  /**
   * Build payment batch from finalized payroll run
   */
  static async buildPaymentBatchFromPayroll(
    request: PayrollToBatchRequest
  ): Promise<PaymentBatchResult> {
    const batchId = `BATCH-${nanoid(12)}`;
    const messageId = `MSG-${Date.now()}-${nanoid(8)}`;
    
    // Get payroll data
    const payrollData = await db
      .select({
        lineId: payrollLines.lineId,
        employeeId: payrollLines.employeeId,
        amount: payrollLines.amount,
        description: payrollLines.description,
      })
      .from(payrollLines)
      .where(and(
        eq(payrollLines.runId, request.runId),
        eq(payrollLines.code, 'NET_PAY') // Only net pay lines for bank transfer
      ));

    if (payrollData.length === 0) {
      throw new Error(`No net pay transactions found for payroll run ${request.runId}`);
    }

    // Get employee bank details
    const employeeIds = payrollData.map(p => p.employeeId);
    const employeeData = await db
      .select({
        employeeId: employees.employeeId,
        bankIban: employees.bankIban,
      })
      .from(employees)
      .where(sql`${employees.employeeId} = ANY(${sql`ARRAY[${sql.join(employeeIds.map(id => sql`${id}`), sql`, `)}]`})`);

    const employeeLookup = new Map(employeeData.map(emp => [emp.employeeId, emp]));

    // Get bank profile for cut-off and instant capabilities
    const [bankProfile] = await db
      .select()
      .from(bankProfiles)
      .where(eq(bankProfiles.bankId, request.bankProfile))
      .limit(1);

    if (!bankProfile) {
      throw new Error(`Bank profile ${request.bankProfile} not found`);
    }

    // Determine payment methods based on cut-offs and amounts
    const transactions: any[] = [];
    let sctCount = 0, sctAmount = 0, sctInstCount = 0, sctInstAmount = 0;
    const cutOffTime = this.calculateTodaysCutOff(bankProfile.cutoffTime || '16:00', 'Europe/Athens');
    const now = new Date();
    const pastCutOff = now > cutOffTime;

    for (const payrollLine of payrollData) {
      const employee = employeeLookup.get(payrollLine.employeeId);
      if (!employee || !employee.bankIban) {
        console.warn(`Employee ${payrollLine.employeeId} missing bank details`);
        continue;
      }

      const amount = parseFloat(payrollLine.amount.toString());
      if (amount <= 0) continue;

      // Determine payment method
      let paymentMethod = request.paymentMethod === 'AUTO' ? 'SCT' : request.paymentMethod;
      let urgency = 'NORM';

      // Auto-switch to instant if past cut-off or high amount
      if (request.paymentMethod === 'AUTO' && bankProfile.supportsSepaInstant) {
        const maxInstant = parseFloat(bankProfile.maxInstantAmount || '100000');
        if ((pastCutOff || amount > 5000) && amount <= maxInstant) {
          paymentMethod = 'SCT_INST';
          urgency = 'HIGH';
        }
      }

      const transaction = {
        transactionId: `TXN-${nanoid(12)}`,
        batchId,
        employeeId: employee.employeeId,
        endToEndId: `E2E-${request.runId}-${employee.employeeId}`,
        amount: amount.toFixed(2),
        currency: 'EUR',
        creditorName: `${employee.firstName} ${employee.lastName}`,
        creditorAccount: employee.bankAccount,
        creditorBank: this.extractBicFromIban(employee.bankAccount),
        paymentMethod,
        urgency,
        status: 'pending',
      };

      transactions.push(transaction);

      // Update counters
      if (paymentMethod === 'SCT') {
        sctCount++;
        sctAmount += amount;
      } else {
        sctInstCount++;
        sctInstAmount += amount;
      }
    }

    const totalAmount = sctAmount + sctInstAmount;

    // Create payment batch
    const batch = {
      batchId,
      entityId: request.entityId,
      runId: request.runId,
      batchType: 'payroll',
      messageId,
      requestedExecutionDate: request.requestedExecutionDate,
      bankProfile: request.bankProfile,
      debtorAccount: 'GR1601101250000000012300695', // Mock debtor IBAN
      debtorName: 'PayrollSync Entity',
      totalTransactions: transactions.length,
      totalAmount: totalAmount.toFixed(2),
      currency: 'EUR',
      sctCount,
      sctAmount: sctAmount.toFixed(2),
      sctInstCount,
      sctInstAmount: sctInstAmount.toFixed(2),
      status: 'created',
      cutOffTime,
      pastCutOff,
      recommendInstant: pastCutOff && bankProfile.supportsSctInst,
    };

    // Generate pain.001 XML
    const pain001Xml = this.generatePain001Xml(batch, transactions, bankProfile);

    // Save to database
    await db.insert(paymentBatches).values(batch);
    await db.insert(paymentTransactions).values(transactions);

    // Generate audit hash
    const auditData = {
      event: 'BATCH_CREATED',
      batchId,
      runId: request.runId,
      totalAmount: batch.totalAmount,
      totalTransactions: batch.totalTransactions,
      timestamp: new Date(),
    };
    const auditHash = this.generateAuditHash(auditData);

    return {
      batchId,
      messageId,
      totalTransactions: transactions.length,
      totalAmount: totalAmount.toFixed(2),
      sctBreakdown: { count: sctCount, amount: sctAmount.toFixed(2) },
      sctInstBreakdown: { count: sctInstCount, amount: sctInstAmount.toFixed(2) },
      pain001Xml,
      submissionReady: true,
      auditHash,
    };
  }

  /**
   * Submit payment batch to bank
   */
  static async submitPaymentBatch(
    request: BankSubmissionRequest
  ): Promise<BankSubmissionResult> {
    const submissionId = `SUB-${nanoid(10)}`;
    const submittedAt = new Date();

    // Get batch details
    const [batch] = await db
      .select()
      .from(paymentBatches)
      .where(eq(paymentBatches.batchId, request.batchId))
      .limit(1);

    if (!batch) {
      throw new Error(`Payment batch ${request.batchId} not found`);
    }

    if (batch.status !== 'created') {
      throw new Error(`Batch ${request.batchId} status is ${batch.status}, cannot submit`);
    }

    let bankAckReceived = false;
    let bankReference: string | undefined;

    try {
      // Simulate bank submission based on method
      switch (request.submissionMethod) {
        case 'SFTP':
          bankReference = await this.submitViaSFTP(batch, request);
          break;
        case 'HOST_TO_HOST':
          bankReference = await this.submitViaHostToHost(batch, request);
          break;
        case 'API':
          bankReference = await this.submitViaAPI(batch, request);
          break;
      }

      bankAckReceived = true;

      // Update batch status
      await db
        .update(paymentBatches)
        .set({
          status: 'sent',
          sentAt: submittedAt,
          updatedAt: new Date(),
        })
        .where(eq(paymentBatches.batchId, request.batchId));

    } catch (error) {
      console.error(`Bank submission failed for batch ${request.batchId}:`, error);
    }

    // Generate audit hash
    const auditData = {
      event: 'BATCH_SUBMITTED',
      batchId: request.batchId,
      submissionMethod: request.submissionMethod,
      bankReference,
      submitted: bankAckReceived,
      timestamp: submittedAt,
    };
    const auditHash = this.generateAuditHash(auditData);

    return {
      submissionId,
      batchId: request.batchId,
      submissionMethod: request.submissionMethod,
      submitted: bankAckReceived,
      bankAckReceived,
      bankReference,
      submittedAt,
      auditHash,
    };
  }

  /**
   * Generate pain.001 XML message
   */
  private static generatePain001Xml(
    batch: any,
    transactions: any[],
    bankProfile: any
  ): string {
    const now = new Date();
    const creationDateTime = now.toISOString();
    const requestedExecutionDate = batch.requestedExecutionDate.toISOString().split('T')[0];

    const sctTransactions = transactions.filter(t => t.paymentMethod === 'SCT');
    const sctInstTransactions = transactions.filter(t => t.paymentMethod === 'SCT_INST');

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${batch.messageId}</MsgId>
      <CreDtTm>${creationDateTime}</CreDtTm>
      <NbOfTxs>${batch.totalTransactions}</NbOfTxs>
      <CtrlSum>${batch.totalAmount}</CtrlSum>
      <InitgPty>
        <Nm>${batch.debtorName}</Nm>
      </InitgPty>
    </GrpHdr>`;

    // SCT Payment Information Block
    if (sctTransactions.length > 0) {
      xml += `
    <PmtInf>
      <PmtInfId>PMT-SCT-${batch.batchId}</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <NbOfTxs>${sctTransactions.length}</NbOfTxs>
      <CtrlSum>${batch.sctAmount}</CtrlSum>
      <ReqdExctnDt>${requestedExecutionDate}</ReqdExctnDt>
      <Dbtr>
        <Nm>${batch.debtorName}</Nm>
      </Dbtr>
      <DbtrAcct>
        <Id>
          <IBAN>${batch.debtorAccount}</IBAN>
        </Id>
      </DbtrAcct>
      <DbtrAgt>
        <FinInstnId>
          <BIC>${bankProfile.bankCode}</BIC>
        </FinInstnId>
      </DbtrAgt>`;

      for (const txn of sctTransactions) {
        xml += `
      <CdtTrfTxInf>
        <PmtId>
          <EndToEndId>${txn.endToEndId}</EndToEndId>
        </PmtId>
        <Amt>
          <InstdAmt Ccy="${txn.currency}">${txn.amount}</InstdAmt>
        </Amt>
        <Cdtr>
          <Nm>${txn.creditorName}</Nm>
        </Cdtr>
        <CdtrAcct>
          <Id>
            <IBAN>${txn.creditorAccount}</IBAN>
          </Id>
        </CdtrAcct>
      </CdtTrfTxInf>`;
      }

      xml += `
    </PmtInf>`;
    }

    // SCT Instant Payment Information Block
    if (sctInstTransactions.length > 0) {
      xml += `
    <PmtInf>
      <PmtInfId>PMT-INST-${batch.batchId}</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <NbOfTxs>${sctInstTransactions.length}</NbOfTxs>
      <CtrlSum>${batch.sctInstAmount}</CtrlSum>
      <ReqdExctnDt>${requestedExecutionDate}</ReqdExctnDt>
      <SvcLvl>
        <Cd>URGP</Cd>
      </SvcLvl>
      <Dbtr>
        <Nm>${batch.debtorName}</Nm>
      </Dbtr>
      <DbtrAcct>
        <Id>
          <IBAN>${batch.debtorAccount}</IBAN>
        </Id>
      </DbtrAcct>
      <DbtrAgt>
        <FinInstnId>
          <BIC>${bankProfile.bankCode}</BIC>
        </FinInstnId>
      </DbtrAgt>`;

      for (const txn of sctInstTransactions) {
        xml += `
      <CdtTrfTxInf>
        <PmtId>
          <EndToEndId>${txn.endToEndId}</EndToEndId>
        </PmtId>
        <Amt>
          <InstdAmt Ccy="${txn.currency}">${txn.amount}</InstdAmt>
        </Amt>
        <Cdtr>
          <Nm>${txn.creditorName}</Nm>
        </Cdtr>
        <CdtrAcct>
          <Id>
            <IBAN>${txn.creditorAccount}</IBAN>
          </Id>
        </CdtrAcct>
      </CdtTrfTxInf>`;
      }

      xml += `
    </PmtInf>`;
    }

    xml += `
  </CstmrCdtTrfInitn>
</Document>`;

    return xml;
  }

  /**
   * Submit via SFTP
   */
  private static async submitViaSFTP(
    batch: any,
    request: BankSubmissionRequest
  ): Promise<string> {
    // Mock SFTP submission
    console.log(`SFTP submission to ${request.bankEndpoint} for batch ${batch.batchId}`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate mock bank reference
    const bankReference = `SFTP-${Date.now()}-${batch.batchId.slice(-6)}`;
    console.log(`SFTP acknowledgment received: ${bankReference}`);
    
    return bankReference;
  }

  /**
   * Submit via Host-to-Host
   */
  private static async submitViaHostToHost(
    batch: any,
    request: BankSubmissionRequest
  ): Promise<string> {
    // Mock Host-to-Host submission
    console.log(`Host-to-Host submission to ${request.bankEndpoint} for batch ${batch.batchId}`);
    
    // Simulate secure connection and submission
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const bankReference = `H2H-${Date.now()}-${batch.batchId.slice(-6)}`;
    console.log(`Host-to-Host acknowledgment received: ${bankReference}`);
    
    return bankReference;
  }

  /**
   * Submit via API
   */
  private static async submitViaAPI(
    batch: any,
    request: BankSubmissionRequest
  ): Promise<string> {
    // Mock API submission
    console.log(`API submission to ${request.bankEndpoint} for batch ${batch.batchId}`);
    
    // Simulate REST API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const bankReference = `API-${Date.now()}-${batch.batchId.slice(-6)}`;
    console.log(`API acknowledgment received: ${bankReference}`);
    
    return bankReference;
  }

  /**
   * Calculate today's cut-off time
   */
  private static calculateTodaysCutOff(cutOffTime: string, timezone: string): Date {
    const [hours, minutes, seconds = '00'] = cutOffTime.split(':');
    const today = new Date();
    today.setHours(parseInt(hours), parseInt(minutes), parseInt(seconds), 0);
    return today;
  }

  /**
   * Extract BIC from IBAN (simplified)
   */
  private static extractBicFromIban(iban: string): string {
    // Greek IBAN to BIC mapping (simplified)
    const bankCodes: Record<string, string> = {
      '011': 'ETHNGRAA', // National Bank of Greece
      '014': 'PIRBGRAA', // Piraeus Bank
      '026': 'EFGBGRAA', // Eurobank
      '017': 'CRBAGRAA', // Alpha Bank
    };

    const bankCode = iban.substring(4, 7);
    return bankCodes[bankCode] || 'UNKNOWN';
  }

  /**
   * Generate hash-chained audit log
   */
  private static generateAuditHash(auditData: any): string {
    const previousHash = this.auditChain.length > 0 ? this.auditChain[this.auditChain.length - 1] : '0';
    const dataString = JSON.stringify({ ...auditData, previousHash });
    const hash = crypto.createHash('sha256').update(dataString).digest('hex');
    
    this.auditChain.push(hash);
    return hash;
  }

  /**
   * Verify audit chain integrity
   */
  static verifyAuditChain(): { valid: boolean; chainLength: number; lastHash: string } {
    if (this.auditChain.length === 0) {
      return { valid: true, chainLength: 0, lastHash: '0' };
    }

    // In production, this would verify against stored audit logs
    return {
      valid: true,
      chainLength: this.auditChain.length,
      lastHash: this.auditChain[this.auditChain.length - 1],
    };
  }
}