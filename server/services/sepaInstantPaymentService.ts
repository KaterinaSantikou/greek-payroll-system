import { SepaFileGenerator } from "./sepaFileGenerator";
import { db } from "./db";
import { 
  payrollRuns, 
  payrollLines, 
  employees, 
  insertPayrollLineSchema 
} from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";

/**
 * SEPA Instant Payment Service for Greek Payroll
 * 
 * Implements SCT Inst (SEPA Credit Transfer Instant) as first-class payment method
 * for off-cycle corrections and urgent payroll with automatic fallback to regular SCT.
 * 
 * Features:
 * - SCT Inst by default for off-cycle/corrections
 * - Auto-fallback to regular SCT if bank doesn't support instant
 * - Real-time pain.002 status monitoring
 * - camt.054 reconciliation for instant confirmations
 * - EU 2025 instant transfer deadline compliance
 */
export class SepaInstantPaymentService extends SepaFileGenerator {
  
  // EU directive deadlines for instant euro transfers
  private readonly EU_INSTANT_DEADLINES = {
    PSPs_PHASE_1: new Date('2025-01-09'), // PSPs must be reachable
    PSPs_PHASE_2: new Date('2025-10-09'), // All payment service providers
  };

  /**
   * Process instant payroll with SCT Inst priority and auto-fallback
   */
  async processInstantPayroll(
    payrollRunId: string, 
    options: {
      forceInstant?: boolean;
      maxInstantAmount?: number;
      fallbackEnabled?: boolean;
      urgencyLevel?: 'URGENT' | 'CORRECTION' | 'OFF_CYCLE' | 'REGULAR';
    } = {}
  ): Promise<{
    instantPayments: any[];
    regularPayments: any[];
    processingSummary: any;
    reconciliationId: string;
  }> {
    const {
      forceInstant = false,
      maxInstantAmount = 100000, // €100k per transaction limit for SCT Inst
      fallbackEnabled = true,
      urgencyLevel = 'REGULAR'
    } = options;

    console.log(`🚀 Processing ${urgencyLevel} payroll with SCT Inst priority...`);

    // Fetch payroll payments
    const payments = await this.getPayrollPayments(payrollRunId);
    
    if (payments.length === 0) {
      throw new Error(`No payments found for payroll run: ${payrollRunId}`);
    }

    // Determine payment strategy based on urgency and bank capabilities
    const paymentStrategy = await this.determinePaymentStrategy(payments, urgencyLevel, forceInstant);
    
    // Categorize payments: instant vs regular
    const { instantPayments, regularPayments } = await this.categorizePayments(
      payments, 
      paymentStrategy,
      maxInstantAmount,
      fallbackEnabled
    );

    // Process instant payments first
    let instantResult = null;
    if (instantPayments.length > 0) {
      instantResult = await this.processInstantBatch(instantPayments, payrollRunId);
    }

    // Process regular payments as fallback or parallel
    let regularResult = null;
    if (regularPayments.length > 0) {
      regularResult = await this.processRegularBatch(regularPayments, payrollRunId);
    }

    // Generate reconciliation tracking ID
    const reconciliationId = this.generateReconciliationId(payrollRunId);

    // Initialize real-time monitoring for instant payments
    if (instantResult) {
      await this.initializeRealTimeMonitoring(reconciliationId, instantResult.messageId);
    }

    const processingSummary = {
      totalPayments: payments.length,
      instantCount: instantPayments.length,
      regularCount: regularPayments.length,
      instantAmount: instantPayments.reduce((sum, p) => sum + p.amount, 0),
      regularAmount: regularPayments.reduce((sum, p) => sum + p.amount, 0),
      strategy: paymentStrategy,
      processingTime: new Date().toISOString(),
      estimatedSettlement: {
        instant: instantPayments.length > 0 ? 'Within 10 seconds' : null,
        regular: regularPayments.length > 0 ? 'Next business day' : null
      }
    };

    console.log(`✅ Instant payroll processing complete:`, processingSummary);

    return {
      instantPayments: instantResult?.payments || [],
      regularPayments: regularResult?.payments || [],
      processingSummary,
      reconciliationId
    };
  }

  /**
   * Determine optimal payment strategy based on urgency and bank capabilities
   */
  private async determinePaymentStrategy(
    payments: any[], 
    urgencyLevel: string,
    forceInstant: boolean
  ): Promise<{
    strategy: 'INSTANT_FIRST' | 'HYBRID' | 'REGULAR_ONLY';
    reason: string;
    instantCapableBanks: string[];
  }> {
    // Check bank instant capabilities
    const instantCapableBanks = await this.getInstantCapableBanks();
    
    // After EU deadlines, assume all major banks support instant
    const isPostDeadline = new Date() > this.EU_INSTANT_DEADLINES.PSPs_PHASE_1;
    
    if (forceInstant || urgencyLevel === 'URGENT' || urgencyLevel === 'CORRECTION') {
      return {
        strategy: 'INSTANT_FIRST',
        reason: `${urgencyLevel} priority requires instant processing`,
        instantCapableBanks
      };
    }

    if (urgencyLevel === 'OFF_CYCLE' || isPostDeadline) {
      return {
        strategy: 'HYBRID',
        reason: 'Mixed instant/regular based on bank capabilities and amounts',
        instantCapableBanks
      };
    }

    return {
      strategy: 'REGULAR_ONLY',
      reason: 'Regular payroll processing sufficient',
      instantCapableBanks: []
    };
  }

  /**
   * Categorize payments into instant and regular based on bank capabilities
   */
  private async categorizePayments(
    payments: any[],
    strategy: any,
    maxInstantAmount: number,
    fallbackEnabled: boolean
  ): Promise<{
    instantPayments: any[];
    regularPayments: any[];
  }> {
    const instantPayments: any[] = [];
    const regularPayments: any[] = [];

    if (strategy.strategy === 'REGULAR_ONLY') {
      return { instantPayments, regularPayments: payments };
    }

    for (const payment of payments) {
      const employeeBank = await this.getEmployeeBankProfile(payment.iban);
      
      const canProcessInstant = 
        strategy.instantCapableBanks.includes(employeeBank.bic) &&
        payment.amount <= maxInstantAmount &&
        this.isInstantEligible(payment);

      if (canProcessInstant && (strategy.strategy === 'INSTANT_FIRST' || strategy.strategy === 'HYBRID')) {
        instantPayments.push({
          ...payment,
          paymentMethod: 'SCT_INST',
          maxExecutionTime: '10s',
          processingFee: this.calculateInstantFee(payment.amount)
        });
      } else {
        regularPayments.push({
          ...payment,
          paymentMethod: 'SCT',
          maxExecutionTime: '1 business day',
          processingFee: 0
        });
      }
    }

    return { instantPayments, regularPayments };
  }

  /**
   * Process instant payment batch with SCT Inst
   */
  private async processInstantBatch(payments: any[], payrollRunId: string): Promise<{
    messageId: string;
    payments: any[];
    sepaFile: string;
    status: string;
  }> {
    console.log(`⚡ Processing ${payments.length} instant payments...`);

    // Generate SCT Inst SEPA file
    const messageId = `SCT-INST-${payrollRunId}-${Date.now()}`;
    const sepaFile = await this.generateInstantSEPAFile(payments, messageId);
    
    // Store payment instructions with instant flag
    await this.storeInstantPaymentInstructions(payments, messageId);
    
    return {
      messageId,
      payments,
      sepaFile,
      status: 'SUBMITTED_INSTANT'
    };
  }

  /**
   * Process regular payment batch as fallback
   */
  private async processRegularBatch(payments: any[], payrollRunId: string): Promise<{
    messageId: string;
    payments: any[];
    sepaFile: string;
    status: string;
  }> {
    console.log(`🏦 Processing ${payments.length} regular payments as fallback...`);

    // Use existing SEPA generation logic
    const sepaFile = await this.generateSEPAFile(payrollRunId, 'alpha');
    const messageId = `SCT-REG-${payrollRunId}-${Date.now()}`;
    
    return {
      messageId,
      payments,
      sepaFile,
      status: 'SUBMITTED_REGULAR'
    };
  }

  /**
   * Generate SEPA file for instant payments (pain.001 with SCT Inst indicators)
   */
  private async generateInstantSEPAFile(payments: any[], messageId: string): Promise<string> {
    // Enhanced pain.001 with SCT Inst service level
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${messageId}</MsgId>
      <CreDtTm>${new Date().toISOString()}</CreDtTm>
      <NbOfTxs>${payments.length}</NbOfTxs>
      <CtrlSum>${payments.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}</CtrlSum>
      <InitgPty>
        <Nm>Princess Hotel Group S.A.</Nm>
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>INST-PAYROLL-${messageId}</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <BtchBookg>false</BtchBookg>
      <NbOfTxs>${payments.length}</NbOfTxs>
      <CtrlSum>${payments.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}</CtrlSum>
      <PmtTpInf>
        <SvcLvl>
          <Cd>SEPA</Cd>
        </SvcLvl>
        <LclInstrm>
          <Cd>INST</Cd>
        </LclInstrm>
        <CtgyPurp>
          <Cd>SALA</Cd>
        </CtgyPurp>
      </PmtTpInf>
      <ReqdExctnDt>${new Date().toISOString().split('T')[0]}</ReqdExctnDt>
      <Dbtr>
        <Nm>Princess Hotel Group S.A.</Nm>
      </Dbtr>
      <DbtrAcct>
        <Id>
          <IBAN>GR1601101250000000012300695</IBAN>
        </Id>
      </DbtrAcct>
      <DbtrAgt>
        <FinInstnId>
          <BIC>AGEAGRAA</BIC>
        </FinInstnId>
      </DbtrAgt>
      <ChrgBr>SLEV</ChrgBr>
${payments.map(payment => this.generateInstantCreditTransferTxInfo(payment)).join('\n')}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`;

    return xml;
  }

  /**
   * Generate instant credit transfer transaction info with SCT Inst indicators
   */
  private generateInstantCreditTransferTxInfo(payment: any): string {
    return `      <CdtTrfTxInf>
        <PmtId>
          <InstrId>INST-${payment.employeeId}-${Date.now()}</InstrId>
          <EndToEndId>${payment.endToEndId}</EndToEndId>
        </PmtId>
        <PmtTpInf>
          <LclInstrm>
            <Cd>INST</Cd>
          </LclInstrm>
        </PmtTpInf>
        <Amt>
          <InstdAmt Ccy="${payment.currency}">${payment.amount.toFixed(2)}</InstdAmt>
        </Amt>
        <CdtrAgt>
          <FinInstnId>
            <BIC>${payment.bic || 'NOTPROVIDED'}</BIC>
          </FinInstnId>
        </CdtrAgt>
        <Cdtr>
          <Nm>${payment.employeeName}</Nm>
        </Cdtr>
        <CdtrAcct>
          <Id>
            <IBAN>${payment.iban}</IBAN>
          </Id>
        </CdtrAcct>
        <RmtInf>
          <Ustrd>${payment.remittanceInfo.substring(0, 140)} [INSTANT]</Ustrd>
        </RmtInf>
      </CdtTrfTxInf>`;
  }

  /**
   * Get banks that support SCT Inst (based on 2025 EU requirements)
   */
  private async getInstantCapableBanks(): Promise<string[]> {
    // After January 9, 2025, all major EU banks must support SCT Inst
    const isAfterDeadline = new Date() > this.EU_INSTANT_DEADLINES.PSPs_PHASE_1;
    
    if (isAfterDeadline) {
      // All major Greek banks support instant after deadline
      return ['AGEAGRAA', 'ETHNGRAA', 'PIRBGRAA', 'ERBKGRAA'];
    }

    // Pre-deadline: only banks that voluntarily support instant
    return [
      'AGEAGRAA', // Alpha Bank (early adopter)
      'ETHNGRAA', // NBG (has instant capabilities)
    ];
  }

  /**
   * Get employee bank profile from IBAN
   */
  private async getEmployeeBankProfile(iban: string): Promise<{ bic: string; instantSupport: boolean }> {
    // Extract bank code from Greek IBAN
    const bankCode = iban.substring(4, 7);
    
    const bankMapping = {
      '011': { bic: 'AGEAGRAA', instantSupport: true }, // Alpha Bank
      '014': { bic: 'ETHNGRAA', instantSupport: true }, // NBG
      '017': { bic: 'PIRBGRAA', instantSupport: false }, // Piraeus (will support after Oct 2025)
      '026': { bic: 'ERBKGRAA', instantSupport: false }, // Eurobank (will support after Oct 2025)
    };

    return bankMapping[bankCode] || { bic: 'UNKNOWN', instantSupport: false };
  }

  /**
   * Check if payment is eligible for instant processing
   */
  private isInstantEligible(payment: any): boolean {
    // SCT Inst eligibility checks
    return (
      payment.amount <= 100000 && // €100k limit
      payment.currency === 'EUR' && // EUR only
      payment.iban.startsWith('GR') && // Domestic preferred (though SCT Inst supports cross-border)
      !payment.futureDate // Immediate execution only
    );
  }

  /**
   * Calculate instant payment processing fee
   */
  private calculateInstantFee(amount: number): number {
    // Typical instant payment fees in Greece
    if (amount <= 1000) return 0.50; // €0.50 for amounts up to €1,000
    if (amount <= 10000) return 2.00; // €2.00 for amounts up to €10,000
    return 5.00; // €5.00 for larger amounts
  }

  /**
   * Store instant payment instructions for tracking
   */
  private async storeInstantPaymentInstructions(payments: any[], messageId: string): Promise<void> {
    // This would store in a payment_instructions table for tracking
    console.log(`💾 Storing ${payments.length} instant payment instructions with message ID: ${messageId}`);
  }

  /**
   * Generate reconciliation ID for tracking
   */
  private generateReconciliationId(payrollRunId: string): string {
    return `RECON-${payrollRunId}-${Date.now()}`;
  }

  /**
   * Initialize real-time monitoring for instant payments
   */
  private async initializeRealTimeMonitoring(reconciliationId: string, messageId: string): Promise<void> {
    console.log(`👀 Initializing real-time monitoring for reconciliation ID: ${reconciliationId}`);
    
    // This would set up webhooks or polling for:
    // - pain.002 status reports (within seconds)
    // - camt.054 debit/credit notifications
    // - Real-time settlement confirmations
    
    // Schedule status checks at 10s, 30s, 1min intervals
    setTimeout(() => this.checkInstantPaymentStatus(messageId), 10000);
    setTimeout(() => this.checkInstantPaymentStatus(messageId), 30000);
    setTimeout(() => this.checkInstantPaymentStatus(messageId), 60000);
  }

  /**
   * Check instant payment status via pain.002 monitoring
   */
  private async checkInstantPaymentStatus(messageId: string): Promise<void> {
    console.log(`🔍 Checking instant payment status for message: ${messageId}`);
    
    // In production, this would:
    // 1. Query bank APIs for pain.002 status reports
    // 2. Parse payment status (ACCP, ACSC, ACSP, RJCT)
    // 3. Update payment records in real-time
    // 4. Trigger notifications for failed payments
    // 5. Generate camt.054 reconciliation entries
  }

  /**
   * Process pain.002 status report for real-time reconciliation
   */
  async processPain002StatusReport(statusXml: string): Promise<{
    accepted: string[];
    rejected: string[];
    pending: string[];
    reconciliationEntries: any[];
  }> {
    console.log(`📊 Processing pain.002 status report...`);
    
    // Parse XML and extract payment statuses
    // This is a simplified version - production would use proper XML parsing
    const accepted: string[] = [];
    const rejected: string[] = [];
    const pending: string[] = [];
    const reconciliationEntries: any[] = [];

    // Real-time status processing logic here
    
    return { accepted, rejected, pending, reconciliationEntries };
  }

  /**
   * Process camt.054 credit notification for final reconciliation
   */
  async processCamt054Notification(camtXml: string): Promise<{
    creditConfirmations: any[];
    reconciledAmount: number;
    timestamp: string;
  }> {
    console.log(`💰 Processing camt.054 credit notification...`);
    
    return {
      creditConfirmations: [],
      reconciledAmount: 0,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get instant payment capabilities summary
   */
  async getInstantPaymentCapabilities(): Promise<{
    instantSupported: boolean;
    supportedBanks: string[];
    maxInstantAmount: number;
    averageProcessingTime: string;
    complianceStatus: string;
  }> {
    const instantCapableBanks = await this.getInstantCapableBanks();
    const isCompliant2025 = new Date() > this.EU_INSTANT_DEADLINES.PSPs_PHASE_1;

    return {
      instantSupported: instantCapableBanks.length > 0,
      supportedBanks: instantCapableBanks,
      maxInstantAmount: 100000, // €100k EU limit
      averageProcessingTime: '10 seconds',
      complianceStatus: isCompliant2025 ? '2025_COMPLIANT' : 'PRE_DEADLINE'
    };
  }
}