/**
 * Payslip Rendering Integration for Garnishments
 * 
 * Renders garnishment deductions as line items on employee payslips.
 * Integrates with existing payslip system to show multi-line garnishment details.
 */

export interface GarnishmentPayslipLine {
  code: string;
  description: string;
  category: 'deductions';
  units: number;
  rate: number;
  amount: number;
  taxable: boolean;
  socialInsuranceSubject: boolean;
  effectiveDate: string;
  ruleReference: string;
  // Garnishment-specific fields
  creditorName: string;
  orderRef: string;
  remainingBalance: number;
  courtOrderDate?: string;
  priority: number;
  protectedFloorApplied: boolean;
}

export interface GarnishmentPayslipSummary {
  totalGarnishments: number;
  garnishmentCount: number;
  highestPriority: number;
  activeOrders: Array<{
    orderRef: string;
    creditorName: string;
    totalBalance: number;
    remainingBalance: number;
    status: string;
  }>;
  warnings: Array<{
    type: 'capped' | 'skipped';
    message: string;
    orderRef: string;
  }>;
}

/**
 * Payslip Garnishment Renderer Service
 */
export class PayslipGarnishmentRenderer {
  
  /**
   * Generate garnishment payslip lines from calculation results
   */
  static generateGarnishmentLines(
    garnishmentResults: Array<{
      type: string;
      creditor: string;
      orderRef: string;
      amount: number;
      remainingBalance: number;
      glAccount: string;
      description: string;
    }>,
    payPeriod: string,
    employeeId: string
  ): GarnishmentPayslipLine[] {
    
    return garnishmentResults.map((result, index) => ({
      code: result.type,
      description: result.description,
      category: 'deductions' as const,
      units: 1,
      rate: result.amount,
      amount: -result.amount, // Negative for deduction display
      taxable: false, // Garnishments are post-tax
      socialInsuranceSubject: false, // Garnishments are post-social insurance
      effectiveDate: payPeriod,
      ruleReference: result.orderRef,
      // Garnishment-specific
      creditorName: result.creditor,
      orderRef: result.orderRef,
      remainingBalance: result.remainingBalance,
      priority: index + 1, // Display order as priority
      protectedFloorApplied: result.amount === 0 // Simplified check
    }));
  }
  
  /**
   * Generate garnishment summary section for payslip
   */
  static generateGarnishmentSummary(
    garnishmentLines: GarnishmentPayslipLine[],
    warnings: Array<{ type: 'capped' | 'skipped'; message: string; orderRef: string; }>,
    activeOrders?: Array<{
      orderRef: string;
      creditorName: string;
      totalBalance: number;
      remainingBalance: number;
      status: string;
    }>
  ): GarnishmentPayslipSummary {
    
    return {
      totalGarnishments: garnishmentLines.reduce((sum, line) => sum + Math.abs(line.amount), 0),
      garnishmentCount: garnishmentLines.length,
      highestPriority: Math.max(...garnishmentLines.map(line => line.priority), 0),
      activeOrders: activeOrders || garnishmentLines.map(line => ({
        orderRef: line.orderRef,
        creditorName: line.creditorName,
        totalBalance: line.remainingBalance + Math.abs(line.amount),
        remainingBalance: line.remainingBalance,
        status: line.remainingBalance > 0 ? 'active' : 'completed'
      })),
      warnings
    };
  }
  
  /**
   * Format garnishment lines for Greek payslip display
   * Includes localized descriptions and proper formatting
   */
  static formatForGreekPayslip(
    garnishmentLines: GarnishmentPayslipLine[],
    language: 'el' | 'en' = 'el'
  ): Array<{
    displayCode: string;
    displayDescription: string;
    displayAmount: string;
    displayBalance: string;
    displayCreditor: string;
    sortOrder: number;
  }> {
    
    const translations = {
      el: {
        'GARN_WAGE_GARNISHMENT': 'Κατάσχεση Μισθού',
        'GARN_CHILD_SUPPORT': 'Διατροφή Τέκνων',
        'GARN_TAX_LEVY': 'Κατάσχεση Φόρων',
        'GARN_STUDENT_LOAN': 'Φοιτητικό Δάνειο',
        'balance_remaining': 'Υπόλοιπο',
        'completed': 'Ολοκληρώθηκε'
      },
      en: {
        'GARN_WAGE_GARNISHMENT': 'Wage Garnishment',
        'GARN_CHILD_SUPPORT': 'Child Support',
        'GARN_TAX_LEVY': 'Tax Levy',
        'GARN_STUDENT_LOAN': 'Student Loan',
        'balance_remaining': 'Balance Remaining',
        'completed': 'Completed'
      }
    };
    
    const t = translations[language];
    
    return garnishmentLines.map((line, index) => ({
      displayCode: line.code,
      displayDescription: t[line.code as keyof typeof t] || line.description,
      displayAmount: `€${Math.abs(line.amount).toFixed(2)}`,
      displayBalance: line.remainingBalance > 0 
        ? `${t.balance_remaining}: €${line.remainingBalance.toFixed(2)}`
        : t.completed,
      displayCreditor: line.creditorName,
      sortOrder: line.priority
    })).sort((a, b) => a.sortOrder - b.sortOrder);
  }
  
  /**
   * Generate garnishment disclosure text for payslip footer
   */
  static generateGarnishmentDisclosure(
    garnishmentSummary: GarnishmentPayslipSummary,
    language: 'el' | 'en' = 'el'
  ): string {
    
    if (garnishmentSummary.garnishmentCount === 0) {
      return '';
    }
    
    const disclosures = {
      el: {
        main: `Συνολικές κατασχέσεις: €${garnishmentSummary.totalGarnishments.toFixed(2)} από ${garnishmentSummary.garnishmentCount} εντολή(ές)`,
        protected: 'Εφαρμόστηκε προστασία καθαρού μισθού σύμφωνα με την ελληνική νομοθεσία',
        contact: 'Για ερωτήσεις σχετικά με κατασχέσεις, επικοινωνήστε με το τμήμα μισθοδοσίας'
      },
      en: {
        main: `Total garnishments: €${garnishmentSummary.totalGarnishments.toFixed(2)} from ${garnishmentSummary.garnishmentCount} order(s)`,
        protected: 'Net pay protection applied in accordance with Greek law',
        contact: 'For questions about garnishments, contact the payroll department'
      }
    };
    
    const d = disclosures[language];
    let disclosure = d.main;
    
    // Add protection notice if applicable
    if (garnishmentSummary.warnings.some(w => w.type === 'capped')) {
      disclosure += '. ' + d.protected;
    }
    
    disclosure += '. ' + d.contact;
    
    return disclosure;
  }
  
  /**
   * Generate detailed garnishment breakdown for employee self-service
   */
  static generateDetailedBreakdown(
    garnishmentLines: GarnishmentPayslipLine[],
    garnishmentSummary: GarnishmentPayslipSummary,
    language: 'el' | 'en' = 'el'
  ): {
    overview: {
      totalDeducted: number;
      activeOrders: number;
      nextExpectedDeduction: number;
    };
    orderDetails: Array<{
      orderRef: string;
      creditorName: string;
      deductedThisPeriod: number;
      remainingBalance: number;
      estimatedCompletionMonths: number;
      status: 'active' | 'completed' | 'suspended';
    }>;
    legalNotices: string[];
  } {
    
    const legalNotices = language === 'el' ? [
      'Οι κατασχέσεις εφαρμόζονται σύμφωνα με τις δικαστικές αποφάσεις',
      'Το προστατευόμενο καθαρό εισόδημα υπολογίζεται σύμφωνα με τον Ελληνικό νόμο',
      'Για αμφισβητήσεις, επικοινωνήστε απευθείας με το δικαστήριο ή τον πιστωτή'
    ] : [
      'Garnishments are applied in accordance with court orders',
      'Protected net income calculated per Greek law',
      'For disputes, contact the court or creditor directly'
    ];
    
    const orderDetails = garnishmentSummary.activeOrders.map(order => {
      const lineForOrder = garnishmentLines.find(line => line.orderRef === order.orderRef);
      const monthlyDeduction = Math.abs(lineForOrder?.amount || 0);
      
      return {
        orderRef: order.orderRef,
        creditorName: order.creditorName,
        deductedThisPeriod: monthlyDeduction,
        remainingBalance: order.remainingBalance,
        estimatedCompletionMonths: monthlyDeduction > 0 
          ? Math.ceil(order.remainingBalance / monthlyDeduction)
          : 0,
        status: order.status as 'active' | 'completed' | 'suspended'
      };
    });
    
    return {
      overview: {
        totalDeducted: garnishmentSummary.totalGarnishments,
        activeOrders: garnishmentSummary.garnishmentCount,
        nextExpectedDeduction: garnishmentSummary.totalGarnishments // Simplified estimate
      },
      orderDetails,
      legalNotices
    };
  }
}