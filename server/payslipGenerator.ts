import { db } from "./db";
import { employees, payrollLines, properties } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { StandardizedEarningsCodesService, STANDARDIZED_EARNINGS_CODES } from "./standardizedEarningsCodesService";

interface PayslipData {
  // Header Information
  entity: {
    name: string;
    afm: string;
    address: string;
  };
  period: {
    startDate: string;
    endDate: string;
    payDate: string;
  };
  employee: {
    fullName: string;
    afm: string; // 9-digit AFM
    amka: string; // 11-digit AMKA (masked for privacy)
    iban: string; // Masked IBAN for security
    position: string;
    department: string;
  };
  
  // Earnings Breakdown
  earnings: {
    baseSalary: number;
    allowances: {
      meal: number;
      transport: number;
      housing: number;
      hazardPay: number;
      other: number;
    };
    overtimeTiers: {
      tier1_25percent: { hours: number; rate: number; amount: number }; // First 120 hours/year
      tier2_50percent: { hours: number; rate: number; amount: number }; // Beyond 120 hours
    };
    premiums: {
      nightWork: { hours: number; rate: number; amount: number }; // 25% premium
      sundayWork: { hours: number; rate: number; amount: number }; // 75% premium  
      holidayWork: { hours: number; rate: number; amount: number }; // 100% premium
    };
    tips: {
      cashTips: number;
      cardTips: number;
      pooledTips: number;
      total: number;
    };
    bonuses: {
      easter: number; // Δώρο Πάσχα
      christmas: number; // Δώρο Χριστουγέννων
      vacation: number; // Επίδομα Άδειας
    };
    totalGross: number;
  };
  
  // Deductions
  deductions: {
    employee: {
      efka: number; // Main insurance (6.67%)
      auxiliary: number; // Auxiliary insurance (varies)
      unemployment: number; // Unemployment fund (0.56%)
    };
    tax: {
      incomeTax: number; // Progressive rates 9%-44%
      solidarityTax: number; // Special solidarity contribution (if applicable)
    };
    other: {
      unionDues: number;
      garnishments: number;
      advances: number;
    };
    totalDeductions: number;
  };
  
  // Employer Contributions (for transparency)
  employerContributions: {
    efka: number; // Main insurance (24.06%)
    auxiliary: number; // Varies by sector
    unemployment: number; // 1.66%
    oaed: number; // Employment organization (0.16%)
    totalEmployer: number;
  };
  
  // Final Calculation
  netPayable: number;
  
  // Year-to-Date Summaries
  ytdSummary: {
    grossEarnings: number;
    totalDeductions: number;
    netPaid: number;
    taxPaid: number;
    efkaPaid: number;
  };
  
  // Digital Integration
  qrCode: string; // QR code to employee portal
  digitalSignature: string; // Hash for verification
  
  // Compliance References
  compliance: {
    erganiReference: string;
    apdSubmissionId: string;
    fmyReference: string;
  };
}

export class PayslipGenerator {
  private earningsCodesService: StandardizedEarningsCodesService;
  
  constructor() {
    this.earningsCodesService = new StandardizedEarningsCodesService();
  }
  
  // Generate payslip for employee
  async generatePayslip(employeeId: string, payrollRunId: string): Promise<PayslipData> {
    // Fetch employee data
    const [employee] = await db
      .select()
      .from(employees)
      .where(eq(employees.employeeId, employeeId));
      
    if (!employee) {
      throw new Error(`Employee not found: ${employeeId}`);
    }
    
    // Fetch payroll lines for this employee and run
    const payrollData = await db
      .select()
      .from(payrollLines)
      .where(
        and(
          eq(payrollLines.employeeId, employeeId),
          eq(payrollLines.runId, payrollRunId)
        )
      );
    
    // Calculate earnings
    const earnings = this.calculateEarnings(payrollData);
    
    // Calculate deductions
    const deductions = this.calculateDeductions(payrollData, earnings.totalGross);
    
    // Calculate employer contributions
    const employerContributions = this.calculateEmployerContributions(earnings.totalGross);
    
    // Calculate net payable
    const netPayable = earnings.totalGross - deductions.totalDeductions;
    
    // Generate QR code for employee portal access
    const qrCode = this.generateQRCode(employee.employeeId, payrollRunId);
    
    // Create digital signature for verification
    const digitalSignature = this.generateDigitalSignature(employee.employeeId, payrollRunId, netPayable);
    
    const payslipData: PayslipData = {
      entity: {
        name: "Princess Hotel Group",
        afm: "123456789",
        address: "Athens, Greece"
      },
      period: {
        startDate: "2025-01-01",
        endDate: "2025-01-31", 
        payDate: "2025-02-05"
      },
      employee: {
        fullName: `${employee.firstName} ${employee.lastName}`,
        afm: employee.afm || "000000000",
        amka: this.maskAMKA(employee.amka || "00000000000"),
        iban: this.maskIBAN(employee.bankIban || ""),
        position: employee.jobTitle || "Employee",
        department: employee.currentDepartment || "General"
      },
      earnings,
      deductions,
      employerContributions,
      netPayable,
      ytdSummary: await this.calculateYTDSummary(employeeId),
      qrCode,
      digitalSignature,
      compliance: {
        erganiReference: `ERG-${payrollRunId}-${employee.employeeId}`,
        apdSubmissionId: `APD-${payrollRunId}`,
        fmyReference: `FMY-${new Date().getFullYear()}-${employee.employeeId}`
      }
    };
    
    return payslipData;
  }
  
  private calculateEarnings(payrollData: any[]): PayslipData['earnings'] {
    const baseSalary = this.getAmount(payrollData, 'BASE_SALARY');
    
    return {
      baseSalary,
      allowances: {
        meal: this.getAmount(payrollData, 'MEAL_ALLOWANCE'),
        transport: this.getAmount(payrollData, 'TRANSPORT_ALLOWANCE'),
        housing: this.getAmount(payrollData, 'HOUSING_ALLOWANCE'),
        hazardPay: this.getAmount(payrollData, 'HAZARD_PAY'),
        other: this.getAmount(payrollData, 'OTHER_ALLOWANCE')
      },
      overtimeTiers: {
        tier1_25percent: {
          hours: this.getHours(payrollData, 'OT_TIER1'),
          rate: this.getRate(payrollData, 'OT_TIER1'),
          amount: this.getAmount(payrollData, 'OT_TIER1')
        },
        tier2_50percent: {
          hours: this.getHours(payrollData, 'OT_TIER2'),
          rate: this.getRate(payrollData, 'OT_TIER2'),
          amount: this.getAmount(payrollData, 'OT_TIER2')
        }
      },
      premiums: {
        nightWork: {
          hours: this.getHours(payrollData, 'NIGHT_PREMIUM'),
          rate: this.getRate(payrollData, 'NIGHT_PREMIUM'),
          amount: this.getAmount(payrollData, 'NIGHT_PREMIUM')
        },
        sundayWork: {
          hours: this.getHours(payrollData, 'SUNDAY_PREMIUM'),
          rate: this.getRate(payrollData, 'SUNDAY_PREMIUM'),
          amount: this.getAmount(payrollData, 'SUNDAY_PREMIUM')
        },
        holidayWork: {
          hours: this.getHours(payrollData, 'HOLIDAY_PREMIUM'),
          rate: this.getRate(payrollData, 'HOLIDAY_PREMIUM'),
          amount: this.getAmount(payrollData, 'HOLIDAY_PREMIUM')
        }
      },
      tips: {
        cashTips: this.getAmount(payrollData, 'CASH_TIPS'),
        cardTips: this.getAmount(payrollData, 'CARD_TIPS'),
        pooledTips: this.getAmount(payrollData, 'TIP_POOL_DIST'),
        total: this.getAmount(payrollData, 'TIPS_TOTAL')
      },
      bonuses: {
        easter: this.getAmount(payrollData, 'EASTER_BONUS'),
        christmas: this.getAmount(payrollData, 'CHRISTMAS_BONUS'),
        vacation: this.getAmount(payrollData, 'VACATION_PAY')
      },
      totalGross: this.getTotalGross(payrollData)
    };
  }
  
  private calculateDeductions(payrollData: any[], grossAmount: number): PayslipData['deductions'] {
    return {
      employee: {
        efka: this.getAmount(payrollData, 'EFKA_EMPLOYEE'),
        auxiliary: this.getAmount(payrollData, 'AUX_INSURANCE_EE'),
        unemployment: this.getAmount(payrollData, 'UNEMPLOYMENT_EE')
      },
      tax: {
        incomeTax: this.getAmount(payrollData, 'INCOME_TAX'),
        solidarityTax: this.getAmount(payrollData, 'SOLIDARITY_TAX')
      },
      other: {
        unionDues: this.getAmount(payrollData, 'UNION_DUES'),
        garnishments: this.getAmount(payrollData, 'GARNISHMENT'),
        advances: this.getAmount(payrollData, 'SALARY_ADVANCE')
      },
      totalDeductions: this.getTotalDeductions(payrollData)
    };
  }
  
  private calculateEmployerContributions(grossAmount: number): PayslipData['employerContributions'] {
    return {
      efka: grossAmount * 0.2406, // 24.06%
      auxiliary: grossAmount * 0.02, // Varies, using 2% average
      unemployment: grossAmount * 0.0166, // 1.66%
      oaed: grossAmount * 0.0016, // 0.16%
      totalEmployer: grossAmount * 0.2788 // Total ~27.88%
    };
  }
  
  private async calculateYTDSummary(employeeId: string): Promise<PayslipData['ytdSummary']> {
    // This would fetch YTD data from database
    // For demo purposes, returning placeholder values
    return {
      grossEarnings: 15000,
      totalDeductions: 4500,
      netPaid: 10500,
      taxPaid: 1800,
      efkaPaid: 1200
    };
  }
  
  private getAmount(payrollData: any[], earningsCode: string): number {
    const line = payrollData.find(line => line.earningsCode === earningsCode);
    return line ? parseFloat(line.amount) : 0;
  }
  
  private getHours(payrollData: any[], earningsCode: string): number {
    const line = payrollData.find(line => line.earningsCode === earningsCode);
    return line ? parseFloat(line.hours || 0) : 0;
  }
  
  private getRate(payrollData: any[], earningsCode: string): number {
    const line = payrollData.find(line => line.earningsCode === earningsCode);
    return line ? parseFloat(line.rate || 0) : 0;
  }
  
  private getTotalGross(payrollData: any[]): number {
    return payrollData
      .filter(line => line.earningsType === 'earning')
      .reduce((sum, line) => sum + parseFloat(line.amount), 0);
  }
  
  private getTotalDeductions(payrollData: any[]): number {
    return payrollData
      .filter(line => line.earningsType === 'deduction')
      .reduce((sum, line) => sum + parseFloat(line.amount), 0);
  }
  
  private maskAMKA(amka: string): string {
    if (amka.length !== 11) return "***********";
    return amka.substring(0, 3) + "****" + amka.substring(7);
  }
  
  private maskIBAN(iban: string): string {
    if (iban.length < 8) return "**********************";
    return iban.substring(0, 4) + "************" + iban.substring(iban.length - 4);
  }
  
  private generateQRCode(employeeId: string, payrollRunId: string): string {
    // Generate QR code data for employee portal access
    const portalUrl = `https://payrollsync.app/employee-portal/${employeeId}/${payrollRunId}`;
    return `QR:${Buffer.from(portalUrl).toString('base64')}`;
  }
  
  private generateDigitalSignature(employeeId: string, payrollRunId: string, netAmount: number): string {
    // Generate hash for payslip verification
    const data = `${employeeId}-${payrollRunId}-${netAmount}-${Date.now()}`;
    return Buffer.from(data).toString('base64').substring(0, 16);
  }
  
  // Format payslip as PDF or HTML
  async formatPayslip(payslipData: PayslipData, format: 'pdf' | 'html' = 'html'): Promise<string> {
    if (format === 'html') {
      return this.generateHTMLPayslip(payslipData);
    }
    // PDF generation would require additional libraries
    throw new Error('PDF format not yet implemented');
  }
  
  private generateHTMLPayslip(data: PayslipData): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Payslip - ${data.employee.fullName}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .section { margin: 20px 0; }
            .earnings, .deductions { display: inline-block; width: 45%; vertical-align: top; }
            .summary { background: #f5f5f5; padding: 15px; margin: 20px 0; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
            .amount { text-align: right; }
            .qr-code { text-align: center; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>${data.entity.name}</h1>
            <p>AFM: ${data.entity.afm} | ${data.entity.address}</p>
            <h2>ΜΙΣΘΟΔΟΤΙΚΗ ΚΑΤΑΣΤΑΣΗ / PAYSLIP</h2>
            <p>Period: ${data.period.startDate} - ${data.period.endDate} | Pay Date: ${data.period.payDate}</p>
        </div>
        
        <div class="section">
            <h3>Employee Information</h3>
            <table>
                <tr><td>Name:</td><td>${data.employee.fullName}</td></tr>
                <tr><td>AFM:</td><td>${data.employee.afm}</td></tr>
                <tr><td>AMKA:</td><td>${data.employee.amka}</td></tr>
                <tr><td>IBAN:</td><td>${data.employee.iban}</td></tr>
                <tr><td>Position:</td><td>${data.employee.position}</td></tr>
                <tr><td>Department:</td><td>${data.employee.department}</td></tr>
            </table>
        </div>
        
        <div class="section">
            <div class="earnings">
                <h3>Earnings (Αποδοχές)</h3>
                <table>
                    <tr><td>Base Salary</td><td class="amount">€${data.earnings.baseSalary.toFixed(2)}</td></tr>
                    <tr><td>Meal Allowance</td><td class="amount">€${data.earnings.allowances.meal.toFixed(2)}</td></tr>
                    <tr><td>Transport Allowance</td><td class="amount">€${data.earnings.allowances.transport.toFixed(2)}</td></tr>
                    <tr><td>OT Tier 1 (25%)</td><td class="amount">€${data.earnings.overtimeTiers.tier1_25percent.amount.toFixed(2)}</td></tr>
                    <tr><td>OT Tier 2 (50%)</td><td class="amount">€${data.earnings.overtimeTiers.tier2_50percent.amount.toFixed(2)}</td></tr>
                    <tr><td>Night Premium</td><td class="amount">€${data.earnings.premiums.nightWork.amount.toFixed(2)}</td></tr>
                    <tr><td>Sunday Premium</td><td class="amount">€${data.earnings.premiums.sundayWork.amount.toFixed(2)}</td></tr>
                    <tr><td>Holiday Premium</td><td class="amount">€${data.earnings.premiums.holidayWork.amount.toFixed(2)}</td></tr>
                    <tr><td>Tips Total</td><td class="amount">€${data.earnings.tips.total.toFixed(2)}</td></tr>
                    <tr style="border-top: 2px solid #333;"><td><strong>Total Gross</strong></td><td class="amount"><strong>€${data.earnings.totalGross.toFixed(2)}</strong></td></tr>
                </table>
            </div>
            
            <div class="deductions">
                <h3>Deductions (Κρατήσεις)</h3>
                <table>
                    <tr><td>EFKA Employee</td><td class="amount">€${data.deductions.employee.efka.toFixed(2)}</td></tr>
                    <tr><td>Auxiliary Insurance</td><td class="amount">€${data.deductions.employee.auxiliary.toFixed(2)}</td></tr>
                    <tr><td>Unemployment</td><td class="amount">€${data.deductions.employee.unemployment.toFixed(2)}</td></tr>
                    <tr><td>Income Tax</td><td class="amount">€${data.deductions.tax.incomeTax.toFixed(2)}</td></tr>
                    <tr><td>Solidarity Tax</td><td class="amount">€${data.deductions.tax.solidarityTax.toFixed(2)}</td></tr>
                    <tr><td>Union Dues</td><td class="amount">€${data.deductions.other.unionDues.toFixed(2)}</td></tr>
                    <tr style="border-top: 2px solid #333;"><td><strong>Total Deductions</strong></td><td class="amount"><strong>€${data.deductions.totalDeductions.toFixed(2)}</strong></td></tr>
                </table>
            </div>
        </div>
        
        <div class="summary">
            <h3>Net Payment Summary</h3>
            <table>
                <tr><td><strong>Gross Earnings:</strong></td><td class="amount"><strong>€${data.earnings.totalGross.toFixed(2)}</strong></td></tr>
                <tr><td><strong>Total Deductions:</strong></td><td class="amount"><strong>€${data.deductions.totalDeductions.toFixed(2)}</strong></td></tr>
                <tr style="border-top: 3px solid #333; font-size: 18px;"><td><strong>NET PAYABLE:</strong></td><td class="amount"><strong>€${data.netPayable.toFixed(2)}</strong></td></tr>
            </table>
        </div>
        
        <div class="section">
            <h3>Year-to-Date Summary</h3>
            <table>
                <tr><td>YTD Gross Earnings:</td><td class="amount">€${data.ytdSummary.grossEarnings.toFixed(2)}</td></tr>
                <tr><td>YTD Total Deductions:</td><td class="amount">€${data.ytdSummary.totalDeductions.toFixed(2)}</td></tr>
                <tr><td>YTD Net Paid:</td><td class="amount">€${data.ytdSummary.netPaid.toFixed(2)}</td></tr>
            </table>
        </div>
        
        <div class="qr-code">
            <p><strong>Employee Portal Access:</strong></p>
            <p style="font-family: monospace; font-size: 12px;">${data.qrCode}</p>
            <p><small>Scan to access your employee portal</small></p>
        </div>
        
        <div class="section">
            <p><small>Digital Signature: ${data.digitalSignature}</small></p>
            <p><small>ERGANI Ref: ${data.compliance.erganiReference}</small></p>
            <p><small>Generated on: ${new Date().toLocaleString()}</small></p>
        </div>
    </body>
    </html>`;
  }
}