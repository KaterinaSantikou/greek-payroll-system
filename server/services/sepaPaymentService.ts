import { 
  paymentInstructions, 
  sepaPaymentFiles, 
  bankRegistry, 
  PaymentInstruction, 
  SepaPaymentFile, 
  BankRegistry 
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { format, parseISO } from "date-fns";

/**
 * SEPA pain.001 Payment Service for Greek Banks
 * Supports Alpha Bank, Eurobank, NBG, and Piraeus Bank
 * Handles standard and instant payments with multi-IBAN splits
 */

export interface SepaPaymentRequest {
  payrollPeriodId: string;
  debitAccount: string; // Company IBAN
  creditorId?: string; // SEPA Direct Debit Identifier
  requestedExecutionDate: string;
  urgentOnly?: boolean; // Generate only SEPA Instant payments
}

export interface Pain001FileContent {
  messageId: string;
  fileName: string;
  xmlContent: string;
  totalAmount: number;
  totalTransactions: number;
  urgentTransactions: number;
}

export class SepaPaymentService {
  
  /**
   * Generate SEPA pain.001 XML file for a payroll period
   */
  async generatePain001File(request: SepaPaymentRequest): Promise<Pain001FileContent> {
    // Get all payment instructions for the period
    const payments = await db
      .select()
      .from(paymentInstructions)
      .where(
        and(
          eq(paymentInstructions.payrollPeriodId, request.payrollPeriodId),
          eq(paymentInstructions.status, "pending"),
          request.urgentOnly ? eq(paymentInstructions.urgentPayment, true) : undefined
        )
      );

    if (payments.length === 0) {
      throw new Error("No pending payment instructions found for the period");
    }

    // Generate message ID and filename
    const messageId = this.generateMessageId();
    const fileName = `pain001_${request.payrollPeriodId}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xml`;
    
    // Calculate totals
    const totalAmount = payments.reduce((sum, payment) => sum + parseFloat(payment.netPayAmount), 0);
    const totalTransactions = this.calculateTotalTransactions(payments);
    const urgentTransactions = payments.filter(p => p.urgentPayment).length;

    // Generate XML content
    const xmlContent = await this.generatePain001XML({
      messageId,
      payments,
      debitAccount: request.debitAccount,
      creditorId: request.creditorId,
      requestedExecutionDate: request.requestedExecutionDate,
      totalAmount,
      totalTransactions,
    });

    return {
      messageId,
      fileName,
      xmlContent,
      totalAmount,
      totalTransactions,
      urgentTransactions,
    };
  }

  /**
   * Save SEPA payment file to database
   */
  async saveSepaPaymentFile(
    fileContent: Pain001FileContent,
    request: SepaPaymentRequest
  ): Promise<SepaPaymentFile> {
    const [sepaFile] = await db
      .insert(sepaPaymentFiles)
      .values({
        payrollPeriodId: request.payrollPeriodId,
        fileName: fileContent.fileName,
        filePath: `/sepa_files/${fileContent.fileName}`,
        fileSize: Buffer.byteLength(fileContent.xmlContent, 'utf8'),
        messageId: fileContent.messageId,
        totalAmount: fileContent.totalAmount.toFixed(2),
        totalTransactions: fileContent.totalTransactions,
        urgentTransactions: fileContent.urgentTransactions,
        debitAccount: request.debitAccount,
        creditorId: request.creditorId || null,
        requestedExecutionDate: request.requestedExecutionDate,
        paymentMethod: request.urgentOnly ? "INST" : "TRF",
        status: "generated",
      })
      .returning();

    return sepaFile;
  }

  /**
   * Update payment instructions status after file generation
   */
  async updatePaymentInstructionsStatus(payrollPeriodId: string, filePath: string): Promise<void> {
    await db
      .update(paymentInstructions)
      .set({
        status: "queued",
        pain001Generated: true,
        pain001FilePath: filePath,
        pain001GeneratedAt: new Date(),
      })
      .where(
        and(
          eq(paymentInstructions.payrollPeriodId, payrollPeriodId),
          eq(paymentInstructions.status, "pending")
        )
      );
  }

  /**
   * Get Greek bank configuration
   */
  async getGreekBankConfig(bankCode: string): Promise<BankRegistry | null> {
    const [bank] = await db
      .select()
      .from(bankRegistry)
      .where(
        and(
          eq(bankRegistry.bankCode, bankCode),
          eq(bankRegistry.isActive, true)
        )
      );

    return bank || null;
  }

  /**
   * Initialize Greek bank registry with default configurations
   */
  async initializeGreekBanks(): Promise<void> {
    const greekBanks = [
      {
        bankCode: "ALPHA",
        bankName: "Alpha Bank",
        bic: "CRBAGRAA",
        supportsSepaInstant: true,
        maxInstantAmount: "100000.00",
        pain001Version: "pain.001.001.03",
        standardProcessingHours: 24,
        instantProcessingSeconds: 10,
        cutoffTime: "17:00:00",
      },
      {
        bankCode: "EUROBANK",
        bankName: "Eurobank",
        bic: "ERBKGRAA",
        supportsSepaInstant: true,
        maxInstantAmount: "100000.00",
        pain001Version: "pain.001.001.03",
        standardProcessingHours: 24,
        instantProcessingSeconds: 15,
        cutoffTime: "16:30:00",
      },
      {
        bankCode: "NBG",
        bankName: "National Bank of Greece",
        bic: "ETHNGRAA",
        supportsSepaInstant: true,
        maxInstantAmount: "100000.00",
        pain001Version: "pain.001.001.03",
        standardProcessingHours: 24,
        instantProcessingSeconds: 10,
        cutoffTime: "17:00:00",
      },
      {
        bankCode: "PIRAEUS",
        bankName: "Piraeus Bank",
        bic: "PIRBGRAA",
        supportsSepaInstant: true,
        maxInstantAmount: "100000.00",
        pain001Version: "pain.001.001.03",
        standardProcessingHours: 24,
        instantProcessingSeconds: 10,
        cutoffTime: "16:45:00",
      },
    ];

    for (const bank of greekBanks) {
      await db
        .insert(bankRegistry)
        .values(bank)
        .onConflictDoUpdate({
          target: bankRegistry.bankCode,
          set: {
            ...bank,
            updatedAt: new Date(),
          },
        });
    }
  }

  /**
   * Generate SEPA pain.001 XML content
   */
  private async generatePain001XML(params: {
    messageId: string;
    payments: PaymentInstruction[];
    debitAccount: string;
    creditorId?: string;
    requestedExecutionDate: string;
    totalAmount: number;
    totalTransactions: number;
  }): Promise<string> {
    const {
      messageId,
      payments,
      debitAccount,
      creditorId,
      requestedExecutionDate,
      totalAmount,
      totalTransactions,
    } = params;

    const creationDateTime = new Date().toISOString();
    const executionDate = format(parseISO(requestedExecutionDate), 'yyyy-MM-dd');
    
    // Group payments by urgency (standard vs instant)
    const standardPayments = payments.filter(p => !p.urgentPayment);
    const instantPayments = payments.filter(p => p.urgentPayment);

    let paymentInfoSections = '';
    let paymentIndex = 1;

    // Generate standard payments section
    if (standardPayments.length > 0) {
      const standardTotal = standardPayments.reduce((sum, p) => sum + parseFloat(p.netPayAmount), 0);
      paymentInfoSections += this.generatePaymentInfoSection({
        paymentId: `PMT-STD-${messageId}`,
        payments: standardPayments,
        totalAmount: standardTotal,
        debitAccount,
        executionDate,
        serviceLevel: 'SEPA',
        startIndex: paymentIndex,
      });
      paymentIndex += this.calculateTransactionsCount(standardPayments);
    }

    // Generate instant payments section
    if (instantPayments.length > 0) {
      const instantTotal = instantPayments.reduce((sum, p) => sum + parseFloat(p.netPayAmount), 0);
      paymentInfoSections += this.generatePaymentInfoSection({
        paymentId: `PMT-INST-${messageId}`,
        payments: instantPayments,
        totalAmount: instantTotal,
        debitAccount,
        executionDate,
        serviceLevel: 'INST',
        startIndex: paymentIndex,
      });
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${messageId}</MsgId>
      <CreDtTm>${creationDateTime}</CreDtTm>
      <NbOfTxs>${totalTransactions}</NbOfTxs>
      <CtrlSum>${totalAmount.toFixed(2)}</CtrlSum>
      <InitgPty>
        <Nm>PayrollSync Hotel Operations</Nm>
        <Id>
          <OrgId>
            <Othr>
              <Id>${creditorId || 'PAYROLLSYNC001'}</Id>
            </Othr>
          </OrgId>
        </Id>
      </InitgPty>
    </GrpHdr>
    ${paymentInfoSections}
  </CstmrCdtTrfInitn>
</Document>`;
  }

  /**
   * Generate payment information section for a group of payments
   */
  private generatePaymentInfoSection(params: {
    paymentId: string;
    payments: PaymentInstruction[];
    totalAmount: number;
    debitAccount: string;
    executionDate: string;
    serviceLevel: 'SEPA' | 'INST';
    startIndex: number;
  }): string {
    const {
      paymentId,
      payments,
      totalAmount,
      debitAccount,
      executionDate,
      serviceLevel,
      startIndex,
    } = params;

    const transactionCount = this.calculateTransactionsCount(payments);
    
    let creditTransferTransactions = '';
    let transactionIndex = startIndex;

    payments.forEach(payment => {
      // Generate transactions for multi-IBAN splits
      const transactions = this.generateTransactionsForPayment(payment, transactionIndex);
      creditTransferTransactions += transactions.content;
      transactionIndex += transactions.count;
    });

    return `
    <PmtInf>
      <PmtInfId>${paymentId}</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <NbOfTxs>${transactionCount}</NbOfTxs>
      <CtrlSum>${totalAmount.toFixed(2)}</CtrlSum>
      <PmtTpInf>
        <SvcLvl>
          <Cd>${serviceLevel}</Cd>
        </SvcLvl>
      </PmtTpInf>
      <ReqdExctnDt>${executionDate}</ReqdExctnDt>
      <Dbtr>
        <Nm>PayrollSync Hotel Operations</Nm>
      </Dbtr>
      <DbtrAcct>
        <Id>
          <IBAN>${debitAccount}</IBAN>
        </Id>
      </DbtrAcct>
      <DbtrAgt>
        <FinInstnId>
          <BIC>${this.getBICFromIBAN(debitAccount)}</BIC>
        </FinInstnId>
      </DbtrAgt>
      ${creditTransferTransactions}
    </PmtInf>`;
  }

  /**
   * Generate credit transfer transactions for a payment (handles IBAN splits)
   */
  private generateTransactionsForPayment(
    payment: PaymentInstruction,
    startIndex: number
  ): { content: string; count: number } {
    let transactions = '';
    let transactionCount = 0;

    // Primary IBAN transaction
    if (parseFloat(payment.primaryAmount) > 0) {
      transactions += this.generateCreditTransferTransaction({
        endToEndId: `${payment.endToEndId}-1`,
        amount: parseFloat(payment.primaryAmount),
        beneficiaryName: payment.beneficiaryName,
        beneficiaryIBAN: payment.primaryIban,
        remittanceInfo: payment.remittanceInfo || `Salary Payment - ${payment.paymentType}`,
        transactionIndex: startIndex + transactionCount,
      });
      transactionCount++;
    }

    // Secondary IBAN transaction
    if (payment.secondaryIban && parseFloat(payment.secondaryAmount || "0") > 0) {
      transactions += this.generateCreditTransferTransaction({
        endToEndId: `${payment.endToEndId}-2`,
        amount: parseFloat(payment.secondaryAmount || "0"),
        beneficiaryName: payment.beneficiaryName,
        beneficiaryIBAN: payment.secondaryIban,
        remittanceInfo: payment.remittanceInfo || `Salary Payment - ${payment.paymentType} (Split 2)`,
        transactionIndex: startIndex + transactionCount,
      });
      transactionCount++;
    }

    // Tertiary IBAN transaction
    if (payment.tertiaryIban && parseFloat(payment.tertiaryAmount || "0") > 0) {
      transactions += this.generateCreditTransferTransaction({
        endToEndId: `${payment.endToEndId}-3`,
        amount: parseFloat(payment.tertiaryAmount || "0"),
        beneficiaryName: payment.beneficiaryName,
        beneficiaryIBAN: payment.tertiaryIban,
        remittanceInfo: payment.remittanceInfo || `Salary Payment - ${payment.paymentType} (Split 3)`,
        transactionIndex: startIndex + transactionCount,
      });
      transactionCount++;
    }

    return { content: transactions, count: transactionCount };
  }

  /**
   * Generate individual credit transfer transaction XML
   */
  private generateCreditTransferTransaction(params: {
    endToEndId: string;
    amount: number;
    beneficiaryName: string;
    beneficiaryIBAN: string;
    remittanceInfo: string;
    transactionIndex: number;
  }): string {
    const {
      endToEndId,
      amount,
      beneficiaryName,
      beneficiaryIBAN,
      remittanceInfo,
      transactionIndex,
    } = params;

    return `
      <CdtTrfTxInf>
        <PmtId>
          <InstrId>TXN-${transactionIndex.toString().padStart(6, '0')}</InstrId>
          <EndToEndId>${endToEndId}</EndToEndId>
        </PmtId>
        <Amt>
          <InstdAmt Ccy="EUR">${amount.toFixed(2)}</InstdAmt>
        </Amt>
        <CdtrAgt>
          <FinInstnId>
            <BIC>${this.getBICFromIBAN(beneficiaryIBAN)}</BIC>
          </FinInstnId>
        </CdtrAgt>
        <Cdtr>
          <Nm>${this.sanitizeXMLText(beneficiaryName)}</Nm>
        </Cdtr>
        <CdtrAcct>
          <Id>
            <IBAN>${beneficiaryIBAN}</IBAN>
          </Id>
        </CdtrAcct>
        <RmtInf>
          <Ustrd>${this.sanitizeXMLText(remittanceInfo)}</Ustrd>
        </RmtInf>
      </CdtTrfTxInf>`;
  }

  /**
   * Calculate total number of transactions including IBAN splits
   */
  private calculateTotalTransactions(payments: PaymentInstruction[]): number {
    return payments.reduce((total, payment) => {
      return total + this.calculateTransactionsCount([payment]);
    }, 0);
  }

  /**
   * Calculate transaction count for specific payments
   */
  private calculateTransactionsCount(payments: PaymentInstruction[]): number {
    return payments.reduce((total, payment) => {
      let count = 0;
      if (parseFloat(payment.primaryAmount) > 0) count++;
      if (payment.secondaryIban && parseFloat(payment.secondaryAmount || "0") > 0) count++;
      if (payment.tertiaryIban && parseFloat(payment.tertiaryAmount || "0") > 0) count++;
      return total + count;
    }, 0);
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    const timestamp = format(new Date(), 'yyyyMMddHHmmss');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `PAYROLL-${timestamp}-${random}`;
  }

  /**
   * Get BIC code from IBAN (simplified for Greek banks)
   */
  private getBICFromIBAN(iban: string): string {
    const bankIdentifier = iban.substring(4, 7);
    
    const bicMapping: Record<string, string> = {
      '014': 'CRBAGRAA', // Alpha Bank
      '026': 'ERBKGRAA', // Eurobank
      '011': 'ETHNGRAA', // NBG
      '017': 'PIRBGRAA', // Piraeus Bank
    };

    return bicMapping[bankIdentifier] || 'UNKNGRAA';
  }

  /**
   * Sanitize text for XML compliance
   */
  private sanitizeXMLText(text: string): string {
    return text
      .replace(/[&]/g, '&amp;')
      .replace(/[<]/g, '&lt;')
      .replace(/[>]/g, '&gt;')
      .replace(/["]/g, '&quot;')
      .replace(/[']/g, '&apos;')
      .substring(0, 140); // SEPA length limit
  }
}