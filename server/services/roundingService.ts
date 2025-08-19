/**
 * Rounding Service - Configurable rounding and reconciliation
 */

export type RoundingMethod = 'bankers' | 'round_half_up';

export interface RoundingConfig {
  method: RoundingMethod;
  precision: number; // decimal places, default 2
  enforceBalance: boolean;
}

export interface ReconciliationEntry {
  category: string;
  description: string;
  payrollAmount: number;
  journalAmount: number;
  delta: number;
  isReconciled: boolean;
}

export interface ReconciliationReport {
  totalPayroll: number;
  totalJournal: number;
  overallDelta: number;
  isFullyReconciled: boolean;
  entries: ReconciliationEntry[];
  warnings: string[];
  currency: string;
  roundingMethod: RoundingMethod;
  generatedAt: Date;
}

export class RoundingService {
  
  /**
   * Apply rounding using specified method
   */
  static round(value: number, config: RoundingConfig): number {
    const multiplier = Math.pow(10, config.precision);
    
    if (config.method === 'bankers') {
      // Banker's rounding (round half to even)
      const scaled = value * multiplier;
      const truncated = Math.trunc(scaled);
      const fractional = scaled - truncated;
      
      if (Math.abs(fractional) === 0.5) {
        // If exactly halfway, round to nearest even number
        return truncated % 2 === 0 ? truncated / multiplier : (truncated + Math.sign(fractional)) / multiplier;
      } else {
        // Standard rounding for non-halfway cases
        return Math.round(scaled) / multiplier;
      }
    } else {
      // Standard round half up
      return Math.round(value * multiplier) / multiplier;
    }
  }

  /**
   * Apply rounding to journal lines and ensure balance
   */
  static roundJournalLines(
    lines: Array<{debit: string; credit: string; description: string}>, 
    config: RoundingConfig
  ): {
    lines: Array<{debit: string; credit: string; description: string}>;
    totalDebits: number;
    totalCredits: number;
    isBalanced: boolean;
    adjustmentMade: boolean;
  } {
    const roundedLines = lines.map(line => ({
      ...line,
      debit: this.round(parseFloat(line.debit || '0'), config).toFixed(config.precision),
      credit: this.round(parseFloat(line.credit || '0'), config).toFixed(config.precision),
    }));

    let totalDebits = roundedLines.reduce((sum, line) => sum + parseFloat(line.debit), 0);
    let totalCredits = roundedLines.reduce((sum, line) => sum + parseFloat(line.credit), 0);
    
    const delta = totalDebits - totalCredits;
    const tolerance = 1 / Math.pow(10, config.precision);
    let adjustmentMade = false;

    if (config.enforceBalance && Math.abs(delta) > tolerance) {
      // Find largest line to apply adjustment
      const largestLineIndex = roundedLines.reduce((maxIndex, line, index, arr) => {
        const currentAmount = Math.max(parseFloat(line.debit), parseFloat(line.credit));
        const maxAmount = Math.max(parseFloat(arr[maxIndex].debit), parseFloat(arr[maxIndex].credit));
        return currentAmount > maxAmount ? index : maxIndex;
      }, 0);

      // Apply adjustment to balance
      const adjustment = this.round(delta, config);
      if (parseFloat(roundedLines[largestLineIndex].debit) > 0) {
        const newDebit = parseFloat(roundedLines[largestLineIndex].debit) - adjustment;
        roundedLines[largestLineIndex].debit = Math.max(0, newDebit).toFixed(config.precision);
      } else {
        const newCredit = parseFloat(roundedLines[largestLineIndex].credit) + adjustment;
        roundedLines[largestLineIndex].credit = Math.max(0, newCredit).toFixed(config.precision);
      }

      // Recalculate totals
      totalDebits = roundedLines.reduce((sum, line) => sum + parseFloat(line.debit), 0);
      totalCredits = roundedLines.reduce((sum, line) => sum + parseFloat(line.credit), 0);
      adjustmentMade = true;
    }

    return {
      lines: roundedLines,
      totalDebits: this.round(totalDebits, config),
      totalCredits: this.round(totalCredits, config),
      isBalanced: Math.abs(totalDebits - totalCredits) <= tolerance,
      adjustmentMade,
    };
  }

  /**
   * Generate comprehensive reconciliation report
   */
  static generateReconciliationReport(
    payrollSummary: {
      regularWages: number;
      overtime: number;
      grossPay: number;
      efkaEmployee: number;
      efkaEmployer: number;
      taxWithholding: number;
      netPay: number;
      totalDeductions: number;
      totalEmployerCosts: number;
    },
    journalLines: Array<{
      accountCode: string;
      debit: string;
      credit: string;
      description: string;
    }>,
    config: { currency: string; roundingMethod: RoundingMethod }
  ): ReconciliationReport {
    
    const entries: ReconciliationEntry[] = [];
    const warnings: string[] = [];

    // Group journal lines by category
    const journalSummary = {
      wages: 0,
      efkaEmployer: 0,
      efkaEmployee: 0,
      taxWithholding: 0,
      netPay: 0,
    };

    journalLines.forEach(line => {
      const debit = parseFloat(line.debit || '0');
      const credit = parseFloat(line.credit || '0');
      const description = line.description.toUpperCase();

      if (description.includes('REG') || description.includes('WAGE')) {
        journalSummary.wages += debit;
      } else if (description.includes('EFKA') && description.includes('EMPLOYER')) {
        journalSummary.efkaEmployer += debit;
      } else if (description.includes('EFKA') && description.includes('EMPLOYEE')) {
        journalSummary.efkaEmployee += credit;
      } else if (description.includes('TAX') || description.includes('AADE') || description.includes('ΦΜΥ')) {
        journalSummary.taxWithholding += credit;
      } else if (description.includes('NET') || description.includes('CLEARING')) {
        journalSummary.netPay += credit;
      }
    });

    // Compare payroll vs journal amounts
    const comparisons = [
      {
        category: 'Regular Wages',
        description: 'Base wages and salaries',
        payrollAmount: payrollSummary.regularWages,
        journalAmount: journalSummary.wages,
      },
      {
        category: 'EFKA Employer',
        description: 'Employer social security contributions',
        payrollAmount: payrollSummary.efkaEmployer,
        journalAmount: journalSummary.efkaEmployer,
      },
      {
        category: 'EFKA Employee',
        description: 'Employee social security deductions',
        payrollAmount: payrollSummary.efkaEmployee,
        journalAmount: journalSummary.efkaEmployee,
      },
      {
        category: 'Tax Withholding',
        description: 'AADE ΦΜΥ tax withholding',
        payrollAmount: payrollSummary.taxWithholding,
        journalAmount: journalSummary.taxWithholding,
      },
      {
        category: 'Net Pay',
        description: 'Net amount to employees',
        payrollAmount: payrollSummary.netPay,
        journalAmount: journalSummary.netPay,
      },
    ];

    // Generate reconciliation entries
    comparisons.forEach(comp => {
      const delta = Math.abs(comp.payrollAmount - comp.journalAmount);
      const isReconciled = delta < 0.01; // 1 cent tolerance
      
      entries.push({
        category: comp.category,
        description: comp.description,
        payrollAmount: comp.payrollAmount,
        journalAmount: comp.journalAmount,
        delta,
        isReconciled,
      });

      if (!isReconciled) {
        warnings.push(`${comp.category} variance: €${delta.toFixed(2)}`);
      }
    });

    // Calculate totals
    const totalJournalDebits = journalLines.reduce((sum, line) => sum + parseFloat(line.debit || '0'), 0);
    const totalJournalCredits = journalLines.reduce((sum, line) => sum + parseFloat(line.credit || '0'), 0);
    const totalPayroll = payrollSummary.grossPay + payrollSummary.totalEmployerCosts;
    const overallDelta = Math.abs(totalPayroll - totalJournalDebits);

    // Add journal balance check
    if (Math.abs(totalJournalDebits - totalJournalCredits) > 0.01) {
      warnings.push(`Journal is not balanced: Debits €${totalJournalDebits.toFixed(2)} ≠ Credits €${totalJournalCredits.toFixed(2)}`);
    }

    // Currency validation
    if (config.currency !== 'EUR') {
      warnings.push(`Currency mismatch: Expected EUR, found ${config.currency}`);
    }

    return {
      totalPayroll,
      totalJournal: totalJournalDebits,
      overallDelta,
      isFullyReconciled: entries.every(e => e.isReconciled) && Math.abs(totalJournalDebits - totalJournalCredits) <= 0.01,
      entries,
      warnings,
      currency: config.currency,
      roundingMethod: config.roundingMethod,
      generatedAt: new Date(),
    };
  }

  /**
   * Get default rounding configuration
   */
  static getDefaultConfig(): RoundingConfig {
    return {
      method: 'bankers',
      precision: 2,
      enforceBalance: true,
    };
  }

  /**
   * Validate currency configuration
   */
  static validateCurrency(journalCurrency: string, systemCurrency: string = 'EUR'): {
    isValid: boolean;
    warning?: string;
  } {
    if (journalCurrency !== systemCurrency) {
      return {
        isValid: false,
        warning: `Currency mismatch: System uses ${systemCurrency}, but journal uses ${journalCurrency}. Currency conversion may be required.`,
      };
    }
    return { isValid: true };
  }

  /**
   * Apply zero-line collapse (remove lines with zero amounts)
   */
  static collapseZeroLines(
    lines: Array<{debit: string; credit: string; description: string}>
  ): Array<{debit: string; credit: string; description: string}> {
    return lines.filter(line => {
      const debit = parseFloat(line.debit || '0');
      const credit = parseFloat(line.credit || '0');
      return debit !== 0 || credit !== 0;
    });
  }
}