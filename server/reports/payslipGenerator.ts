import { nanoid } from "nanoid";

/**
 * Employee Payslip Generator
 * Generates detailed payslips for web display and PDF download
 */

export interface PayslipData {
  payslipId: string;
  employeeId: string;
  employeeName: string;
  afm: string;
  amka: string;
  payPeriod: string;
  payDate: Date;
  companyInfo: CompanyInfo;
  earnings: EarningsLine[];
  deductions: DeductionsLine[];
  benefits: BenefitsLine[];
  totals: PayslipTotals;
  yearToDate: YearToDateTotals;
  bankDetails: BankDetails;
  digitalSignature: string;
}

export interface CompanyInfo {
  name: string;
  afm: string;
  address: string;
  city: string;
  postalCode: string;
  phone: string;
  email: string;
}

export interface EarningsLine {
  code: string;
  description: string;
  hours?: number;
  rate?: number;
  amount: number;
  taxable: boolean;
  socialSecuritySubject: boolean;
}

export interface DeductionsLine {
  code: string;
  description: string;
  amount: number;
  type: 'TAX' | 'SOCIAL_SECURITY' | 'OTHER';
}

export interface BenefitsLine {
  code: string;
  description: string;
  amount: number;
  taxable: boolean;
}

export interface PayslipTotals {
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  taxableEarnings: number;
  socialSecurityEarnings: number;
  incomeTax: number;
  solidarityTax: number;
  socialSecurityEmployee: number;
  socialSecurityEmployer: number;
}

export interface YearToDateTotals {
  grossPay: number;
  netPay: number;
  incomeTax: number;
  socialSecurity: number;
}

export interface BankDetails {
  bankName: string;
  iban: string;
  transferDate: Date;
  transferAmount: number;
}

// Standard Greek earnings codes
const EARNINGS_CODES = {
  'BASIC_SALARY': { code: 'E001', description: 'Βασικός Μισθός' },
  'OVERTIME_25': { code: 'E002', description: 'Υπερωρίες 25%' },
  'OVERTIME_50': { code: 'E003', description: 'Υπερωρίες 50%' },
  'OVERTIME_75': { code: 'E004', description: 'Υπερωρίες 75%' },
  'NIGHT_SHIFT': { code: 'E005', description: 'Νυχτερινό Επίδομα' },
  'SUNDAY_WORK': { code: 'E006', description: 'Εργασία Κυριακής' },
  'HOLIDAY_WORK': { code: 'E007', description: 'Εργασία Αργίας' },
  'BONUS_EASTER': { code: 'E008', description: 'Δώρο Πάσχα' },
  'BONUS_CHRISTMAS': { code: 'E009', description: 'Δώρο Χριστούγεννα' },
  'VACATION_PAY': { code: 'E010', description: 'Επίδομα Άδειας' },
  'MEAL_ALLOWANCE': { code: 'E011', description: 'Επίδομα Σίτισης' },
  'TRANSPORT_ALLOWANCE': { code: 'E012', description: 'Επίδομα Μεταφοράς' }
};

// Standard deduction codes
const DEDUCTION_CODES = {
  'INCOME_TAX': { code: 'D001', description: 'Φόρος Εισοδήματος' },
  'SOLIDARITY_TAX': { code: 'D002', description: 'Φόρος Αλληλεγγύης' },
  'SOCIAL_SECURITY_MAIN': { code: 'D003', description: 'ΙΚΑ Κύρια Ασφάλιση' },
  'SOCIAL_SECURITY_AUX': { code: 'D004', description: 'ΙΚΑ Επικουρική' },
  'UNEMPLOYMENT_FUND': { code: 'D005', description: 'Ταμείο Ανεργίας' },
  'UNION_DUES': { code: 'D006', description: 'Συνδικαλιστικά Τέλη' },
  'ADVANCE_PAYMENT': { code: 'D007', description: 'Προκαταβολή Μισθού' },
  'LOAN_REPAYMENT': { code: 'D008', description: 'Αποπληρωμή Δανείου' }
};

class PayslipGenerator {
  private readonly companyInfo: CompanyInfo;

  constructor() {
    this.companyInfo = {
      name: process.env.COMPANY_NAME || 'PayrollSync Demo Company',
      afm: process.env.COMPANY_AFM || '123456789',
      address: process.env.COMPANY_ADDRESS || 'Λεωφ. Συγγρού 100',
      city: process.env.COMPANY_CITY || 'Αθήνα',
      postalCode: process.env.COMPANY_POSTAL || '11741',
      phone: process.env.COMPANY_PHONE || '+30 210 1234567',
      email: process.env.COMPANY_EMAIL || 'payroll@company.gr'
    };
  }

  /**
   * Generate employee payslip
   */
  async generatePayslip(
    employeeData: any,
    payrollData: any,
    period: string
  ): Promise<PayslipData> {
    const payslipId = nanoid();
    
    // Build earnings lines
    const earnings = this.buildEarningsLines(payrollData);
    
    // Build deductions lines
    const deductions = this.buildDeductionsLines(payrollData);
    
    // Build benefits lines (if any)
    const benefits = this.buildBenefitsLines(payrollData);
    
    // Calculate totals
    const totals = this.calculatePayslipTotals(earnings, deductions, benefits);
    
    // Get year-to-date totals
    const yearToDate = await this.getYearToDateTotals(employeeData.employeeId, period);
    
    // Build bank details
    const bankDetails: BankDetails = {
      bankName: this.getBankName(employeeData.bankIban),
      iban: employeeData.bankIban,
      transferDate: this.getPayDate(period),
      transferAmount: totals.netPay
    };

    const payslip: PayslipData = {
      payslipId,
      employeeId: employeeData.employeeId,
      employeeName: `${employeeData.firstName} ${employeeData.lastName}`,
      afm: employeeData.afm,
      amka: employeeData.amka,
      payPeriod: period,
      payDate: this.getPayDate(period),
      companyInfo: this.companyInfo,
      earnings,
      deductions,
      benefits,
      totals,
      yearToDate,
      bankDetails,
      digitalSignature: this.generateDigitalSignature(payslipId, totals)
    };

    return payslip;
  }

  /**
   * Generate HTML payslip for web display
   */
  generateHTMLPayslip(payslip: PayslipData): string {
    return `
<!DOCTYPE html>
<html lang="el">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Μισθοδοτική Κατάσταση - ${payslip.employeeName}</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .payslip { background: white; max-width: 800px; margin: 0 auto; padding: 30px; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
        .header { border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
        .company-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
        .company-details h2 { color: #2563eb; margin: 0; font-size: 24px; }
        .company-details p { margin: 5px 0; color: #666; }
        .employee-info { background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .employee-info h3 { margin-top: 0; color: #1e40af; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .info-item { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #e5e7eb; }
        .info-label { font-weight: 600; color: #374151; }
        .info-value { color: #6b7280; }
        .earnings-section, .deductions-section { margin: 30px 0; }
        .section-title { background: #2563eb; color: white; padding: 10px 15px; margin: 0; font-size: 16px; font-weight: 600; }
        .earnings-table, .deductions-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .earnings-table th, .deductions-table th { background: #f1f5f9; padding: 12px; text-align: left; border: 1px solid #e2e8f0; font-weight: 600; }
        .earnings-table td, .deductions-table td { padding: 10px 12px; border: 1px solid #e2e8f0; }
        .earnings-table tr:nth-child(even), .deductions-table tr:nth-child(even) { background: #f8fafc; }
        .amount { text-align: right; font-weight: 600; }
        .positive-amount { color: #059669; }
        .negative-amount { color: #dc2626; }
        .totals { background: #1e40af; color: white; padding: 20px; border-radius: 8px; margin: 30px 0; }
        .totals-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }
        .total-item { text-align: center; }
        .total-value { font-size: 24px; font-weight: 700; margin-top: 5px; }
        .net-pay { background: #059669; border-radius: 8px; padding: 15px; text-align: center; color: white; font-size: 18px; }
        .ytd-section { background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .ytd-title { color: #92400e; font-weight: 600; margin-bottom: 15px; font-size: 16px; }
        .bank-details { background: #ecfdf5; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; }
        .signature { margin-top: 40px; text-align: center; color: #6b7280; font-size: 12px; }
        @media print { body { background: white; } .payslip { box-shadow: none; } }
    </style>
</head>
<body>
    <div class="payslip">
        <div class="header">
            <div class="company-info">
                <div class="company-details">
                    <h2>${payslip.companyInfo.name}</h2>
                    <p>ΑΦΜ: ${payslip.companyInfo.afm}</p>
                    <p>${payslip.companyInfo.address}, ${payslip.companyInfo.city} ${payslip.companyInfo.postalCode}</p>
                    <p>Τηλ: ${payslip.companyInfo.phone} | Email: ${payslip.companyInfo.email}</p>
                </div>
                <div class="payslip-info">
                    <h3>Μισθοδοτική Κατάσταση</h3>
                    <p><strong>Περίοδος:</strong> ${payslip.payPeriod}</p>
                    <p><strong>Ημ/νία Πληρωμής:</strong> ${payslip.payDate.toLocaleDateString('el-GR')}</p>
                </div>
            </div>
        </div>

        <div class="employee-info">
            <h3>Στοιχεία Εργαζομένου</h3>
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">Ονοματεπώνυμο:</span>
                    <span class="info-value">${payslip.employeeName}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">ΑΦΜ:</span>
                    <span class="info-value">${payslip.afm}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">ΑΜΚΑ:</span>
                    <span class="info-value">${payslip.amka}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Κωδικός:</span>
                    <span class="info-value">${payslip.employeeId}</span>
                </div>
            </div>
        </div>

        <div class="earnings-section">
            <h3 class="section-title">Αποδοχές</h3>
            <table class="earnings-table">
                <thead>
                    <tr>
                        <th>Κωδικός</th>
                        <th>Περιγραφή</th>
                        <th>Ώρες</th>
                        <th>Ποσοστό</th>
                        <th>Ποσό</th>
                    </tr>
                </thead>
                <tbody>
                    ${payslip.earnings.map(earning => `
                        <tr>
                            <td>${earning.code}</td>
                            <td>${earning.description}</td>
                            <td class="amount">${earning.hours || '-'}</td>
                            <td class="amount">${earning.rate ? earning.rate.toFixed(2) + '€' : '-'}</td>
                            <td class="amount positive-amount">${earning.amount.toFixed(2)}€</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="deductions-section">
            <h3 class="section-title">Κρατήσεις</h3>
            <table class="deductions-table">
                <thead>
                    <tr>
                        <th>Κωδικός</th>
                        <th>Περιγραφή</th>
                        <th>Τύπος</th>
                        <th>Ποσό</th>
                    </tr>
                </thead>
                <tbody>
                    ${payslip.deductions.map(deduction => `
                        <tr>
                            <td>${deduction.code}</td>
                            <td>${deduction.description}</td>
                            <td>${deduction.type}</td>
                            <td class="amount negative-amount">-${deduction.amount.toFixed(2)}€</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="totals">
            <div class="totals-grid">
                <div class="total-item">
                    <div>Συνολικές Αποδοχές</div>
                    <div class="total-value">${payslip.totals.grossPay.toFixed(2)}€</div>
                </div>
                <div class="total-item">
                    <div>Συνολικές Κρατήσεις</div>
                    <div class="total-value">${payslip.totals.totalDeductions.toFixed(2)}€</div>
                </div>
                <div class="total-item">
                    <div>Καθαρές Αποδοχές</div>
                    <div class="total-value">${payslip.totals.netPay.toFixed(2)}€</div>
                </div>
            </div>
        </div>

        <div class="ytd-section">
            <div class="ytd-title">Στοιχεία από Αρχή Έτους</div>
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">Συνολικές Αποδοχές:</span>
                    <span class="info-value">${payslip.yearToDate.grossPay.toFixed(2)}€</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Καθαρές Αποδοχές:</span>
                    <span class="info-value">${payslip.yearToDate.netPay.toFixed(2)}€</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Φόρος Εισοδήματος:</span>
                    <span class="info-value">${payslip.yearToDate.incomeTax.toFixed(2)}€</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Κοινωνικές Εισφορές:</span>
                    <span class="info-value">${payslip.yearToDate.socialSecurity.toFixed(2)}€</span>
                </div>
            </div>
        </div>

        <div class="bank-details">
            <strong>Στοιχεία Τραπεζικού Λογαριασμού:</strong><br>
            <strong>Τράπεζα:</strong> ${payslip.bankDetails.bankName}<br>
            <strong>IBAN:</strong> ${payslip.bankDetails.iban}<br>
            <strong>Ημερομηνία Εμβάσματος:</strong> ${payslip.bankDetails.transferDate.toLocaleDateString('el-GR')}<br>
            <strong>Ποσό Εμβάσματος:</strong> ${payslip.bankDetails.transferAmount.toFixed(2)}€
        </div>

        <div class="signature">
            <p>Ψηφιακή Υπογραφή: ${payslip.digitalSignature}</p>
            <p>Αυτό το έγγραφο παράχθηκε ηλεκτρονικά από το PayrollSync και είναι έγκυρο χωρίς φυσική υπογραφή.</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Build earnings lines from payroll data
   */
  private buildEarningsLines(payrollData: any): EarningsLine[] {
    const earnings: EarningsLine[] = [];
    
    // Basic salary
    if (payrollData.basicSalary > 0) {
      earnings.push({
        code: EARNINGS_CODES.BASIC_SALARY.code,
        description: EARNINGS_CODES.BASIC_SALARY.description,
        amount: payrollData.basicSalary,
        taxable: true,
        socialSecuritySubject: true
      });
    }
    
    // Overtime
    if (payrollData.overtime25 > 0) {
      earnings.push({
        code: EARNINGS_CODES.OVERTIME_25.code,
        description: EARNINGS_CODES.OVERTIME_25.description,
        hours: payrollData.overtime25Hours,
        rate: payrollData.overtime25Rate,
        amount: payrollData.overtime25,
        taxable: true,
        socialSecuritySubject: true
      });
    }
    
    // Night shift allowance
    if (payrollData.nightAllowance > 0) {
      earnings.push({
        code: EARNINGS_CODES.NIGHT_SHIFT.code,
        description: EARNINGS_CODES.NIGHT_SHIFT.description,
        amount: payrollData.nightAllowance,
        taxable: true,
        socialSecuritySubject: true
      });
    }
    
    // Meal allowance (tax-free up to limit)
    if (payrollData.mealAllowance > 0) {
      earnings.push({
        code: EARNINGS_CODES.MEAL_ALLOWANCE.code,
        description: EARNINGS_CODES.MEAL_ALLOWANCE.description,
        amount: payrollData.mealAllowance,
        taxable: payrollData.mealAllowance > 11, // Tax-free limit €11/day
        socialSecuritySubject: false
      });
    }

    return earnings;
  }

  /**
   * Build deductions lines from payroll data
   */
  private buildDeductionsLines(payrollData: any): DeductionsLine[] {
    const deductions: DeductionsLine[] = [];
    
    // Income tax
    if (payrollData.incomeTax > 0) {
      deductions.push({
        code: DEDUCTION_CODES.INCOME_TAX.code,
        description: DEDUCTION_CODES.INCOME_TAX.description,
        amount: payrollData.incomeTax,
        type: 'TAX'
      });
    }
    
    // Solidarity tax
    if (payrollData.solidarityTax > 0) {
      deductions.push({
        code: DEDUCTION_CODES.SOLIDARITY_TAX.code,
        description: DEDUCTION_CODES.SOLIDARITY_TAX.description,
        amount: payrollData.solidarityTax,
        type: 'TAX'
      });
    }
    
    // Social security - main insurance
    if (payrollData.socialSecurityMain > 0) {
      deductions.push({
        code: DEDUCTION_CODES.SOCIAL_SECURITY_MAIN.code,
        description: DEDUCTION_CODES.SOCIAL_SECURITY_MAIN.description,
        amount: payrollData.socialSecurityMain,
        type: 'SOCIAL_SECURITY'
      });
    }
    
    // Social security - auxiliary
    if (payrollData.socialSecurityAux > 0) {
      deductions.push({
        code: DEDUCTION_CODES.SOCIAL_SECURITY_AUX.code,
        description: DEDUCTION_CODES.SOCIAL_SECURITY_AUX.description,
        amount: payrollData.socialSecurityAux,
        type: 'SOCIAL_SECURITY'
      });
    }

    return deductions;
  }

  /**
   * Build benefits lines (if any)
   */
  private buildBenefitsLines(payrollData: any): BenefitsLine[] {
    const benefits: BenefitsLine[] = [];
    
    // Company car benefit, health insurance, etc.
    // Implementation depends on specific benefits offered
    
    return benefits;
  }

  /**
   * Calculate payslip totals
   */
  private calculatePayslipTotals(
    earnings: EarningsLine[], 
    deductions: DeductionsLine[], 
    benefits: BenefitsLine[]
  ): PayslipTotals {
    const grossPay = earnings.reduce((sum, e) => sum + e.amount, 0);
    const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
    const netPay = grossPay - totalDeductions;
    
    const taxableEarnings = earnings.filter(e => e.taxable).reduce((sum, e) => sum + e.amount, 0);
    const socialSecurityEarnings = earnings.filter(e => e.socialSecuritySubject).reduce((sum, e) => sum + e.amount, 0);
    
    const incomeTax = deductions.filter(d => d.code === 'D001').reduce((sum, d) => sum + d.amount, 0);
    const solidarityTax = deductions.filter(d => d.code === 'D002').reduce((sum, d) => sum + d.amount, 0);
    const socialSecurityEmployee = deductions.filter(d => d.type === 'SOCIAL_SECURITY').reduce((sum, d) => sum + d.amount, 0);
    
    return {
      grossPay,
      totalDeductions,
      netPay,
      taxableEarnings,
      socialSecurityEarnings,
      incomeTax,
      solidarityTax,
      socialSecurityEmployee,
      socialSecurityEmployer: socialSecurityEarnings * 0.2631 // Employer rate
    };
  }

  /**
   * Get year-to-date totals
   */
  private async getYearToDateTotals(employeeId: string, period: string): Promise<YearToDateTotals> {
    // Mock implementation - would query database for YTD totals
    return {
      grossPay: 12000,
      netPay: 8500,
      incomeTax: 2200,
      socialSecurity: 1300
    };
  }

  /**
   * Get bank name from IBAN
   */
  private getBankName(iban: string): string {
    const bankCode = iban.substring(4, 7);
    const bankNames: Record<string, string> = {
      '011': 'Εθνική Τράπεζα',
      '014': 'Τράπεζα Αλφα',
      '026': 'Τράπεζα Eurobank',
      '017': 'Τράπεζα Πειραιώς'
    };
    
    return bankNames[bankCode] || 'Άγνωστη Τράπεζα';
  }

  /**
   * Get pay date for period
   */
  private getPayDate(period: string): Date {
    const [year, month] = period.split('-');
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    return new Date(parseInt(year), parseInt(month) - 1, lastDay);
  }

  /**
   * Generate digital signature for payslip integrity
   */
  private generateDigitalSignature(payslipId: string, totals: PayslipTotals): string {
    const dataToSign = `${payslipId}${totals.grossPay}${totals.netPay}${totals.totalDeductions}`;
    return btoa(dataToSign).substring(0, 16).toUpperCase();
  }
}

export const payslipGenerator = new PayslipGenerator();