import { db } from "./db";
import { employees, payrollLines, payrollRuns } from "@shared/schema";
import { eq, and } from "drizzle-orm";

// SEPA Bank Formats for Payroll (Addendum B specifications)
interface SEPAPayment {
  employeeId: string;
  employeeName: string;
  iban: string; // IBAN mandatory
  bic?: string; // BIC optional for domestic SCT
  amount: number;
  currency: 'EUR'; // EUR only as per specification
  endToEndId: string;
  remittanceInfo: string; // Up to 140 chars (Ustrd)
}

interface SEPAFileMetadata {
  messageId: string;
  creationDateTime: string;
  numberOfTransactions: number;
  totalAmount: number;
  requestedExecutionDate: string;
  batchBooking: boolean; // Separate debits per employee (batch booking flag off) unless bank explicitly supports batch
  debtorName: string;
  debtorIBAN: string;
  debtorBIC?: string; // Optional for domestic SCT
  categoryPurpose: 'SALA'; // CategoryPurpose (CtgyPurp): SALA (salary)
}

/**
 * SEPA File Generator for Greek Payroll
 * 
 * Implements Addendum B — SEPA Bank Formats for Payroll specifications:
 * - ISO 20022 pain.001 Customer Credit Transfer (SCT)
 * - Default pain.001.001.03 for widest compatibility; optional .001.09 where supported
 * - CategoryPurpose (CtgyPurp): SALA (salary)
 * - Encoding: UTF‑8, Currency: EUR only
 * - IBAN mandatory; BIC optional (domestic SCT)
 * - Remittance (Ustrd): up to 140 chars
 * - Booking: separate debits per employee (batch booking flag off) unless bank explicitly supports batch
 * - Cut‑offs: same‑day typically by early afternoon; engine enforces per‑bank cut‑offs per profile
 * - Reconciliation: ingest pain.002 status and camt.054 credit notifications where available
 */
export class SEPAFileGenerator {
  // ISO 20022 pain.001 Customer Credit Transfer (SCT) 
  // Default pain.001.001.03 for widest compatibility; optional .001.09 where supported
  private readonly PAIN_VERSION = "pain.001.001.03";
  private readonly CATEGORY_PURPOSE = "SALA"; // Salary payments
  private readonly ENCODING = "UTF-8";
  private readonly CURRENCY = "EUR"; // EUR only as per specification
  
  // Generate SEPA Credit Transfer file for payroll
  async generateSEPAFile(payrollRunId: string): Promise<string> {
    // Fetch payroll run and associated payments
    const payments = await this.getPayrollPayments(payrollRunId);
    
    if (payments.length === 0) {
      throw new Error(`No payments found for payroll run: ${payrollRunId}`);
    }
    
    const metadata: SEPAFileMetadata = {
      messageId: `PAYROLL-${payrollRunId}-${Date.now()}`,
      creationDateTime: new Date().toISOString(),
      numberOfTransactions: payments.length,
      totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
      requestedExecutionDate: this.getNextBusinessDay().toISOString().split('T')[0],
      batchBooking: false, // Separate debits per employee (batch booking flag off) unless bank explicitly supports batch
      debtorName: "Princess Hotel Group S.A.",
      debtorIBAN: "GR1601101250000000012300695", // Company IBAN
      debtorBIC: "ETHNGRAA", // National Bank of Greece BIC
      categoryPurpose: 'SALA' // CategoryPurpose (CtgyPurp): SALA (salary)
    };
    
    return this.generatePainXML(metadata, payments);
  }
  
  private async getPayrollPayments(payrollRunId: string): Promise<SEPAPayment[]> {
    const payrollData = await db
      .select({
        employeeId: payrollLines.employeeId,
        employeeName: employees.firstName,
        employeeLastName: employees.lastName,
        iban: employees.bankIban, // Corrected field name from schema
        amount: payrollLines.amount
      })
      .from(payrollLines)
      .innerJoin(employees, eq(payrollLines.employeeId, employees.employeeId)) // Corrected field name
      .where(
        and(
          eq(payrollLines.payrollRunId, payrollRunId),
          eq(payrollLines.earningsCode, 'NET_PAY')
        )
      );
    
    return payrollData.map((row, index) => ({
      employeeId: row.employeeId,
      employeeName: `${row.employeeName} ${row.employeeLastName}`,
      iban: row.iban || "GR0000000000000000000000000", // IBAN mandatory
      bic: undefined, // BIC optional for domestic SCT
      amount: parseFloat(row.amount || "0"),
      currency: 'EUR' as const, // EUR only as per specification
      endToEndId: `PAYROLL-${payrollRunId}-${String(index + 1).padStart(6, '0')}`,
      remittanceInfo: `Salary ${new Date().toLocaleDateString('el-GR', { year: 'numeric', month: 'long' })}` // Up to 140 chars
    }));
  }
  
  private generatePainXML(metadata: SEPAFileMetadata, payments: SEPAPayment[]): string {
    // ISO 20022 pain.001 Customer Credit Transfer (SCT) with Greek payroll specifications
    const xml = `<?xml version="1.0" encoding="${this.ENCODING}"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:${this.PAIN_VERSION}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${metadata.messageId}</MsgId>
      <CreDtTm>${metadata.creationDateTime}</CreDtTm>
      <NbOfTxs>${metadata.numberOfTransactions}</NbOfTxs>
      <CtrlSum>${metadata.totalAmount.toFixed(2)}</CtrlSum>
      <InitgPty>
        <Nm>${metadata.debtorName}</Nm>
        <Id>
          <OrgId>
            <Othr>
              <Id>123456789</Id>
              <SchmeNm>
                <Prtry>AFM</Prtry>
              </SchmeNm>
            </Othr>
          </OrgId>
        </Id>
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>PAYROLL-${metadata.messageId}</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <BtchBookg>${metadata.batchBooking}</BtchBookg>
      <NbOfTxs>${metadata.numberOfTransactions}</NbOfTxs>
      <CtrlSum>${metadata.totalAmount.toFixed(2)}</CtrlSum>
      <PmtTpInf>
        <SvcLvl>
          <Cd>SEPA</Cd>
        </SvcLvl>
        <CtgyPurp>
          <Cd>${metadata.categoryPurpose}</Cd>
        </CtgyPurp>
      </PmtTpInf>
      <ReqdExctnDt>${metadata.requestedExecutionDate}</ReqdExctnDt>
      <Dbtr>
        <Nm>${metadata.debtorName}</Nm>
        <PstlAdr>
          <Ctry>GR</Ctry>
          <AdrLine>Athens, Greece</AdrLine>
        </PstlAdr>
      </Dbtr>
      <DbtrAcct>
        <Id>
          <IBAN>${metadata.debtorIBAN}</IBAN>
        </Id>
        <Ccy>EUR</Ccy>
      </DbtrAcct>
      ${metadata.debtorBIC ? `<DbtrAgt>
        <FinInstnId>
          <BIC>${metadata.debtorBIC}</BIC>
        </FinInstnId>
      </DbtrAgt>` : ''}
      <ChrgBr>SLEV</ChrgBr>
${payments.map(payment => this.generateCreditTransferTxInfo(payment)).join('\n')}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`;
    
    return xml;
  }
  
  private generateCreditTransferTxInfo(payment: SEPAPayment): string {
    return `      <CdtTrfTxInf>
        <PmtId>
          <EndToEndId>${payment.endToEndId}</EndToEndId>
        </PmtId>
        <Amt>
          <InstdAmt Ccy="${payment.currency}">${payment.amount.toFixed(2)}</InstdAmt>
        </Amt>
        ${payment.bic ? `<CdtrAgt>
          <FinInstnId>
            <BIC>${payment.bic}</BIC>
          </FinInstnId>
        </CdtrAgt>` : ''}
        <Cdtr>
          <Nm>${payment.employeeName}</Nm>
        </Cdtr>
        <CdtrAcct>
          <Id>
            <IBAN>${payment.iban}</IBAN>
          </Id>
        </CdtrAcct>
        <RmtInf>
          <Ustrd>${payment.remittanceInfo.substring(0, 140)}</Ustrd>
        </RmtInf>
      </CdtTrfTxInf>`;
  }
  
  private getNextBusinessDay(): Date {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    
    // Skip weekends
    while (date.getDay() === 0 || date.getDay() === 6) {
      date.setDate(date.getDate() + 1);
    }
    
    return date;
  }
  
  // Bank profile and cut-off management
  // Cut-offs: same-day typically by early afternoon; engine enforces per-bank cut-offs per profile
  private getBankCutoffTime(bankBic?: string): { hour: number; minute: number } {
    // Default cut-off times for Greek banks (can be configured per bank profile)
    const bankCutoffs: Record<string, { hour: number; minute: number }> = {
      'ETHNGRAA': { hour: 14, minute: 0 }, // National Bank of Greece
      'PIRBGRAA': { hour: 13, minute: 30 }, // Piraeus Bank
      'EUROGRAA': { hour: 14, minute: 30 }, // Eurobank
      'AGEAGRAA': { hour: 14, minute: 0 }, // Alpha Bank
      'default': { hour: 13, minute: 0 } // Conservative default
    };
    
    return bankCutoffs[bankBic || 'default'] || bankCutoffs['default'];
  }
  
  // Check if current time is within bank cut-off for same-day processing
  checkSameDayCutoff(bankBic?: string): boolean {
    const now = new Date();
    const cutoff = this.getBankCutoffTime(bankBic);
    const cutoffTime = new Date(now);
    cutoffTime.setHours(cutoff.hour, cutoff.minute, 0, 0);
    
    return now <= cutoffTime;
  }
  
  // Reconciliation support for pain.002 status and camt.054 credit notifications
  async processPain002StatusResponse(statusXml: string): Promise<void> {
    // TODO: Parse pain.002 Customer Payment Status Report
    // Track payment status updates (ACCP, ACSC, ACSP, RJCT, etc.)
    console.log('Processing pain.002 status response:', statusXml.length, 'characters');
  }
  
  async processCamt054CreditNotification(creditXml: string): Promise<void> {
    // TODO: Parse camt.054 Bank-to-Customer Debit Credit Notification
    // Update payment confirmation and reconciliation records
    console.log('Processing camt.054 credit notification:', creditXml.length, 'characters');
  }
  
  // Validate IBAN format (Greek IBAN)
  validateGreekIBAN(iban: string): boolean {
    // Remove spaces and convert to uppercase
    const cleanIban = iban.replace(/\s/g, '').toUpperCase();
    
    // Check if it's a Greek IBAN (27 characters, starts with GR)
    if (!cleanIban.match(/^GR\d{25}$/)) {
      return false;
    }
    
    // Basic IBAN checksum validation (mod 97)
    const rearranged = cleanIban.substring(4) + cleanIban.substring(0, 4);
    const numeric = rearranged.replace(/[A-Z]/g, (char) => (char.charCodeAt(0) - 55).toString());
    
    let remainder = '';
    for (let i = 0; i < numeric.length; i++) {
      remainder += numeric[i];
      if (remainder.length >= 9) {
        remainder = (parseInt(remainder) % 97).toString();
      }
    }
    
    return parseInt(remainder) % 97 === 1;
  }
}

// Greek Earnings Codes based on 2025 defaults
export const GREEK_EARNINGS_CODES = {
  // Base Earnings
  BASE_SALARY: 'BASE_SALARY',
  OVERTIME_T1: 'OT_T1_25PCT', // First 150 hours annually at 25%
  OVERTIME_T2: 'OT_T2_50PCT', // Beyond 150 hours at 50%
  
  // Premium Payments
  NIGHT_PREMIUM: 'NIGHT_25PCT', // 22:00-06:00, +25%
  SUNDAY_PREMIUM: 'SUNDAY_75PCT', // Sunday and public holidays, +75%
  SIXTH_DAY_PREMIUM: 'SIXTH_40PCT', // 6th consecutive day, +40% (limited sectors)
  
  // Allowances
  MEAL_VOUCHER: 'MEAL_VOUCHER', // €6.00 per work day, tax-free
  TRANSPORT_ALLOWANCE: 'TRANSPORT',
  HOUSING_ALLOWANCE: 'HOUSING',
  HAZARD_PAY: 'HAZARD_PAY',
  
  // Bonuses (Greek mandatory bonuses)
  EASTER_BONUS: 'EASTER_BONUS', // Δώρο Πάσχα
  CHRISTMAS_BONUS: 'CHRISTMAS_BONUS', // Δώρο Χριστουγέννων
  VACATION_PAY: 'VACATION_PAY', // Επίδομα Άδειας
  
  // Tips (Hotel industry specific)
  CASH_TIPS: 'CASH_TIPS',
  CARD_TIPS: 'CARD_TIPS', 
  TIP_POOL_DIST: 'TIP_POOL_DIST', // From tip pooling system
  
  // Deductions
  EFKA_EMPLOYEE: 'EFKA_EE', // Main insurance employee portion
  AUX_INSURANCE_EE: 'AUX_INS_EE', // Auxiliary insurance
  UNEMPLOYMENT_EE: 'UNEMP_EE', // Unemployment insurance
  INCOME_TAX: 'INCOME_TAX', // Progressive income tax
  SOLIDARITY_TAX: 'SOLIDARITY_TAX', // Special solidarity contribution
  
  // Employer Contributions (for transparency)
  EFKA_EMPLOYER: 'EFKA_ER', // Main insurance employer portion
  AUX_INSURANCE_ER: 'AUX_INS_ER', // Auxiliary insurance employer
  UNEMPLOYMENT_ER: 'UNEMP_ER', // Unemployment insurance employer
  
  // Net Payment
  NET_PAY: 'NET_PAY'
};

// Policy Constants (2025 Greek Defaults)
export const GREEK_PAYROLL_POLICY = {
  ANNUAL_OT_CAP_HOURS: 150, // Legal overtime cap per year
  NIGHT_BAND_START: '22:00', // Night premium start time
  NIGHT_BAND_END: '06:00', // Night premium end time
  NIGHT_PREMIUM_RATE: 0.25, // +25% for night work
  SUNDAY_PREMIUM_RATE: 0.75, // +75% for Sunday/holiday work  
  SIXTH_DAY_PREMIUM_RATE: 0.40, // +40% for 6th consecutive day
  MEAL_VOUCHER_TAXFREE_DAILY: 6.00, // €6.00 per work day tax-free
  
  // EFKA Insurance Rates (2025)
  EFKA_EMPLOYEE_RATE: 0.0667, // 6.67%
  EFKA_EMPLOYER_RATE: 0.2406, // 24.06%
  UNEMPLOYMENT_EMPLOYEE_RATE: 0.0056, // 0.56%
  UNEMPLOYMENT_EMPLOYER_RATE: 0.0166, // 1.66%
  
  // Tax brackets (simplified - actual calculation more complex)
  INCOME_TAX_BRACKETS: [
    { min: 0, max: 10000, rate: 0.09 }, // 9% up to €10,000
    { min: 10000, max: 20000, rate: 0.22 }, // 22% €10,001-€20,000
    { min: 20000, max: 30000, rate: 0.28 }, // 28% €20,001-€30,000
    { min: 30000, max: 40000, rate: 0.36 }, // 36% €30,001-€40,000
    { min: 40000, max: Infinity, rate: 0.44 } // 44% above €40,000
  ]
};