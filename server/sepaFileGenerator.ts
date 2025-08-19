import { db } from "./db";
import { employees, payrollLines, payrollRuns } from "@shared/schema";
import { eq, and } from "drizzle-orm";

interface SEPAPayment {
  employeeId: string;
  employeeName: string;
  iban: string;
  bic: string;
  amount: number;
  endToEndId: string;
  reference: string;
}

interface SEPAFileMetadata {
  messageId: string;
  creationDateTime: string;
  numberOfTransactions: number;
  totalAmount: number;
  requestedExecutionDate: string;
  batchBooking: boolean;
  debtorName: string;
  debtorIBAN: string;
  debtorBIC: string;
}

export class SEPAFileGenerator {
  private readonly PAIN_VERSION = "pain.001.001.03";
  
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
      batchBooking: true,
      debtorName: "Princess Hotel Group S.A.",
      debtorIBAN: "GR1601101250000000012300695", // Company IBAN
      debtorBIC: "ETHNGRAA" // National Bank of Greece BIC
    };
    
    return this.generatePainXML(metadata, payments);
  }
  
  private async getPayrollPayments(payrollRunId: string): Promise<SEPAPayment[]> {
    const payrollData = await db
      .select({
        employeeId: payrollLines.employeeId,
        employeeName: employees.firstName,
        employeeLastName: employees.lastName,
        iban: employees.iban,
        bic: employees.bankBic,
        amount: payrollLines.amount,
        netPay: payrollLines.netPay
      })
      .from(payrollLines)
      .innerJoin(employees, eq(payrollLines.employeeId, employees.id))
      .where(
        and(
          eq(payrollLines.payrollRunId, payrollRunId),
          eq(payrollLines.earningsCode, 'NET_PAY')
        )
      );
    
    return payrollData.map((row, index) => ({
      employeeId: row.employeeId,
      employeeName: `${row.employeeName} ${row.employeeLastName}`,
      iban: row.iban || "GR0000000000000000000000000",
      bic: row.bic || "ETHNGRAA",
      amount: parseFloat(row.netPay || row.amount || "0"),
      endToEndId: `PAYROLL-${payrollRunId}-${String(index + 1).padStart(6, '0')}`,
      reference: `Salary ${new Date().toLocaleDateString('el-GR', { year: 'numeric', month: 'long' })}`
    }));
  }
  
  private generatePainXML(metadata: SEPAFileMetadata, payments: SEPAPayment[]): string {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
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
          <Cd>SALA</Cd>
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
      <DbtrAgt>
        <FinInstnId>
          <BIC>${metadata.debtorBIC}</BIC>
        </FinInstnId>
      </DbtrAgt>
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
          <InstdAmt Ccy="EUR">${payment.amount.toFixed(2)}</InstdAmt>
        </Amt>
        <CdtrAgt>
          <FinInstnId>
            <BIC>${payment.bic}</BIC>
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
          <Ustrd>${payment.reference}</Ustrd>
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
  
  // Generate SEPA file metadata summary
  generateSEPAMetadata(payrollRunId: string, payments: SEPAPayment[]): SEPAFileMetadata {
    return {
      messageId: `PAYROLL-${payrollRunId}-${Date.now()}`,
      creationDateTime: new Date().toISOString(),
      numberOfTransactions: payments.length,
      totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
      requestedExecutionDate: this.getNextBusinessDay().toISOString().split('T')[0],
      batchBooking: true,
      debtorName: "Princess Hotel Group S.A.",
      debtorIBAN: "GR1601101250000000012300695",
      debtorBIC: "ETHNGRAA"
    };
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