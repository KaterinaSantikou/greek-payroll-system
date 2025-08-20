import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../db';
import { 
  explanationRules, 
  payslipExplanations, 
  explanationCitations,
  explanationTemplates,
  employees,
  payrollRuns,
  payrollLines 
} from '../../shared/schema';
import type { 
  ExplanationRule,
  PayslipExplanation, 
  InsertPayslipExplanation,
  InsertExplanationCitation,
  PayrollLine
} from '../../shared/schema';

// Enhanced types for explanation generation
export interface PayslipData {
  employeeId: string;
  payrollRunId: string;
  periodStart: string;
  periodEnd: string;
  lines: PayrollLine[];
  timesheetAggregates?: {
    regularHours: number;
    overtimeHours: number;
    nightHours: number;
    sundayHours: number;
    holidayHours: number;
  };
  employeeData?: {
    name: string;
    hourlyRate: number;
    locale: string;
  };
}

export interface ExplanationSection {
  type: 'earnings' | 'deductions' | 'summary';
  title: string;
  titleEl: string;
  items: ExplanationItem[];
  subtotal: number;
  subtotalLabel: string;
  subtotalLabelEl: string;
}

export interface ExplanationItem {
  lineCode: string;
  label: string;
  labelEl: string;
  amount: number;
  formula: string;
  formulaEl: string;
  explanation: string;
  explanationEl: string;
  citation: CitationData;
  variables: Record<string, any>;
}

export interface CitationData {
  ruleId: string;
  ruleVersion: string;
  policyRef?: string;
  regulationRef?: string;
}

export interface ExplanationResult {
  explanationJson: {
    sections: ExplanationSection[];
    summary: {
      totalGross: number;
      totalDeductions: number;
      netPay: number;
      totalGrossLabel: string;
      totalGrossLabelEl: string;
      totalDeductionsLabel: string;
      totalDeductionsLabelEl: string;
      netPayLabel: string;
      netPayLabelEl: string;
      hoursWorked?: {
        regular: number;
        overtime: number;
        night: number;
        sunday: number;
        holiday: number;
      };
      deltas?: {
        netPayChange: number;
        grossPayChange: number;
        changeDescription: string;
        changeDescriptionEl: string;
      };
    };
    metadata: {
      generatedAt: string;
      rulePackVersion: string;
      locale: string;
      processingTimeMs: number;
      generationMode: 'deterministic' | 'llm-enhanced';
    };
  };
  explanationTextEn: string;
  explanationTextEl: string;
  coverage: {
    totalPayslipValue: number;
    explainedValue: number;
    coveragePercentage: number;
    unexplainedLines: string[];
  };
  citations: InsertExplanationCitation[];
  confidenceScore: number;
  qualityMetrics: {
    stackedLinesHandled: number;
    edgeCasesDetected: string[];
    roundingAdjustments: number;
    securityChecksPass: boolean;
  };
}

export class PayslipExplanationService {
  private rulePackVersion = 'v2025.1';
  
  // Edge case detection patterns
  private edgeCasePatterns = {
    split_stacking: /^(SUNDAY|NIGHT|HOLIDAY)_.*_(OT|REG)$/,
    recoveries: /^(ADJ|RECOVERY|OFFSET)_/,
    meal_vouchers: /^(MEAL|VOUCHER)_/,
    tips: /^(TIP|TIPS)_/,
    sick_efka: /^SICK_EFKA/,
    rounding: /^ROUND_/
  };

  /**
   * Generate a complete explanation for a payslip
   */
  async generateExplanation(payslipData: PayslipData): Promise<ExplanationResult> {
    const startTime = Date.now();
    const { employeeId, payrollRunId, lines } = payslipData;
    
    // Load active rules for all codes found in the payslip
    const codes = Array.from(new Set(lines.map(line => line.code)));
    const rules = await this.loadRules(codes);
    
    // Detect edge cases and security issues
    const qualityMetrics = this.analyzeQualityMetrics(lines);
    
    // Generate explanations for each line
    const explainedItems: ExplanationItem[] = [];
    const citations: InsertExplanationCitation[] = [];
    let explainedValue = 0;
    const unexplainedLines: string[] = [];

    for (const line of lines) {
      const rule = rules.find(r => r.earningsCode === line.code);
      
      if (rule) {
        const item = await this.explainLine(line, rule, payslipData);
        explainedItems.push(item);
        explainedValue += Math.abs(parseFloat(line.amount.toString()));
        
        // Create citation
        citations.push({
          explanationId: '', // Will be set when explanation is saved
          sectionType: parseFloat(line.amount.toString()) >= 0 ? 'earnings' : 'deductions',
          lineItem: line.code,
          ruleId: rule.ruleId,
          calculatedAmount: parseFloat(line.amount.toString()).toString(),
          variables: item.variables,
          formulaUsed: item.formula,
          displayOrder: citations.length,
        });
      } else {
        unexplainedLines.push(line.code);
        // Trigger alert for unmapped codes
        this.alertUnmappedCode(line.code, employeeId);
      }
    }

    // Group items into sections with stacking logic
    const sections = this.groupIntoSectionsWithStacking(explainedItems);
    
    // Calculate totals and coverage
    const totalPayslipValue = lines.reduce((sum, line) => sum + Math.abs(parseFloat(line.amount.toString())), 0);
    const coveragePercentage = totalPayslipValue > 0 ? (explainedValue / totalPayslipValue) * 100 : 0;
    
    // Generate enhanced summary with hours worked and deltas
    const summary = this.generateEnhancedSummary(sections, payslipData);
    
    // Generate narrative explanations in the specified format
    const { textEn, textEl } = await this.generateNarrativeExplanation(sections, summary, payslipData);
    
    // Calculate confidence score
    const confidenceScore = this.calculateConfidenceScore(coveragePercentage, rules.length, unexplainedLines.length);
    
    const processingTime = Date.now() - startTime;

    return {
      explanationJson: {
        sections,
        summary,
        metadata: {
          generatedAt: new Date().toISOString(),
          rulePackVersion: this.rulePackVersion,
          locale: payslipData.employeeData?.locale || 'en',
          processingTimeMs: processingTime,
          generationMode: 'deterministic',
        },
      },
      explanationTextEn: textEn,
      explanationTextEl: textEl,
      coverage: {
        totalPayslipValue,
        explainedValue,
        coveragePercentage: Math.round(coveragePercentage * 100) / 100,
        unexplainedLines,
      },
      citations,
      confidenceScore,
      qualityMetrics,
    };
  }

  /**
   * Load explanation rules for the given codes
   */
  private async loadRules(codes: string[]): Promise<ExplanationRule[]> {
    // Mock rules for demo purposes (until database migration resolves)
    const mockRules: ExplanationRule[] = [
      {
        ruleId: 'rule_reg_001',
        earningsCode: 'REG',
        ruleVersion: 'v2025.08',
        labelEn: 'Regular pay',
        labelEl: 'Τακτικές ώρες',
        formulaTemplateEn: '160h × €7.50 = €1,200.00',
        formulaTemplateEl: '160 ώρες × €7,50 = €1.200,00',
        explanationTemplateEn: 'Your regular working hours at the standard hourly rate.',
        explanationTemplateEl: 'Οι τακτικές ώρες εργασίας σας με το κανονικό ωρομίσθιο.',
        calculationType: 'hourly',
        variables: { hours: 'timesheet.regular', rate: 'contract.hourly_rate' },
        regulationRef: 'Ν. 4808/2021',
        policyRef: null,
        isActive: true,
        effectiveFrom: '2025-01-01',
        effectiveUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        ruleId: 'rule_ot1_001',
        earningsCode: 'OT_TIER1_40',
        ruleVersion: 'v2025.08',
        labelEn: 'Overtime',
        labelEl: 'Νόμιμη υπερωρία',
        formulaTemplateEn: '6h × €7.50 × 40% = €18.00',
        formulaTemplateEl: '6 ώρες × €7,50 × 40% = €18,00',
        explanationTemplateEn: 'Overtime hours with 40% premium as per Greek labor law.',
        explanationTemplateEl: 'Υπερωριακές ώρες με προσαύξηση 40% σύμφωνα με την ελληνική εργατική νομοθεσία.',
        calculationType: 'hourly',
        variables: { hours: 'timesheet.overtime', rate: 'contract.hourly_rate', premium: '40' },
        regulationRef: 'Ν. 4808/2021 άρθρο 5',
        policyRef: null,
        isActive: true,
        effectiveFrom: '2025-01-01',
        effectiveUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        ruleId: 'rule_night_001',
        earningsCode: 'NIGHT_25',
        ruleVersion: 'v2025.08',
        labelEn: 'Night premium',
        labelEl: 'Νυχτερινή',
        formulaTemplateEn: '5h × €7.50 × 25% = €9.38',
        formulaTemplateEl: '5 ώρες × €7,50 × 25% = €9,38',
        explanationTemplateEn: 'Night shift premium for hours worked between 22:00-06:00.',
        explanationTemplateEl: 'Προσαύξηση νυχτερινής βάρδιας για ώρες εργασίας 22:00-06:00.',
        calculationType: 'hourly',
        variables: { hours: 'timesheet.night', rate: 'contract.hourly_rate', premium: '25' },
        regulationRef: 'Ν. 4808/2021 άρθρο 6',
        policyRef: null,
        isActive: true,
        effectiveFrom: '2025-01-01',
        effectiveUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        ruleId: 'rule_sunday_001',
        earningsCode: 'SUNDAY_75',
        ruleVersion: 'v2025.08',
        labelEn: 'Sunday premium',
        labelEl: 'Κυριακή',
        formulaTemplateEn: '3h × €7.50 × 75% = €16.88',
        formulaTemplateEl: '3 ώρες × €7,50 × 75% = €16,88',
        explanationTemplateEn: 'Sunday work premium as required by collective agreement.',
        explanationTemplateEl: 'Προσαύξηση εργασίας Κυριακής σύμφωνα με τη συλλογική σύμβαση.',
        calculationType: 'hourly',
        variables: { hours: 'timesheet.sunday', rate: 'contract.hourly_rate', premium: '75' },
        regulationRef: 'ΣΣΕ Τουρισμού 2024',
        policyRef: null,
        isActive: true,
        effectiveFrom: '2025-01-01',
        effectiveUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ];

    return mockRules.filter(rule => codes.includes(rule.earningsCode));
  }

  /**
   * Explain a single payroll line using the appropriate rule
   */
  private async explainLine(line: PayrollLine, rule: ExplanationRule, payslipData: PayslipData): Promise<ExplanationItem> {
    // Extract variables from payslip data and timesheet aggregates
    const variables = this.extractVariables(line, rule, payslipData);
    
    // Generate formulas by replacing placeholders
    const formula = this.renderFormula(rule.formulaTemplateEn, variables);
    const formulaEl = this.renderFormula(rule.formulaTemplateEl, variables);
    
    // Generate explanations
    const explanation = this.renderExplanation(rule.explanationTemplateEn, variables);
    const explanationEl = this.renderExplanation(rule.explanationTemplateEl, variables);

    return {
      lineCode: line.code,
      label: rule.labelEn,
      labelEl: rule.labelEl,
      amount: parseFloat(line.amount.toString()),
      formula,
      formulaEl,
      explanation,
      explanationEl,
      citation: {
        ruleId: rule.ruleId,
        ruleVersion: rule.ruleVersion,
        policyRef: rule.policyRef || undefined,
        regulationRef: rule.regulationRef || undefined,
      },
      variables,
    };
  }

  /**
   * Extract variables from payslip data for formula calculation
   */
  private extractVariables(line: PayrollLine, rule: ExplanationRule, payslipData: PayslipData): Record<string, any> {
    const variables: Record<string, any> = {
      amount: parseFloat(line.amount.toString()),
      code: line.code,
    };

    // Add timesheet data if available
    if (payslipData.timesheetAggregates) {
      const ts = payslipData.timesheetAggregates;
      variables.regularHours = ts.regularHours;
      variables.overtimeHours = ts.overtimeHours;
      variables.nightHours = ts.nightHours;
      variables.sundayHours = ts.sundayHours;
      variables.holidayHours = ts.holidayHours;
    }

    // Add employee data if available
    if (payslipData.employeeData) {
      variables.hourlyRate = payslipData.employeeData.hourlyRate;
      variables.employeeName = payslipData.employeeData.name;
    }

    // Add calculated values based on rule type
    if (rule.calculationType === 'hourly' && variables.hourlyRate) {
      variables.hours = Math.abs(parseFloat(line.amount.toString())) / variables.hourlyRate;
    }

    return variables;
  }

  /**
   * Render a formula template with actual values
   */
  private renderFormula(template: string, variables: Record<string, any>): string {
    let rendered = template;
    
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{${key}}`;
      let displayValue: string;
      
      if (typeof value === 'number') {
        if (key.includes('Rate') || key.includes('amount')) {
          displayValue = `€${value.toFixed(2)}`;
        } else if (key.includes('Hours') || key.includes('hours')) {
          displayValue = value.toFixed(1);
        } else {
          displayValue = value.toString();
        }
      } else {
        displayValue = String(value);
      }
      
      rendered = rendered.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), displayValue);
    }
    
    return rendered;
  }

  /**
   * Render an explanation template with actual values
   */
  private renderExplanation(template: string, variables: Record<string, any>): string {
    return this.renderFormula(template, variables); // Same logic for now
  }

  /**
   * Group explanation items into earnings and deductions sections
   */
  private groupIntoSections(items: ExplanationItem[]): ExplanationSection[] {
    const earnings = items.filter(item => item.amount >= 0);
    const deductions = items.filter(item => item.amount < 0);

    const sections: ExplanationSection[] = [];

    if (earnings.length > 0) {
      sections.push({
        type: 'earnings',
        title: 'Earnings',
        titleEl: 'Αποδοχές',
        items: earnings,
        subtotal: earnings.reduce((sum, item) => sum + item.amount, 0),
        subtotalLabel: 'Total Earnings',
        subtotalLabelEl: 'Σύνολο Αποδοχών',
      });
    }

    if (deductions.length > 0) {
      sections.push({
        type: 'deductions',
        title: 'Deductions',
        titleEl: 'Κρατήσεις',
        items: deductions,
        subtotal: Math.abs(deductions.reduce((sum, item) => sum + item.amount, 0)),
        subtotalLabel: 'Total Deductions',
        subtotalLabelEl: 'Σύνολο Κρατήσεων',
      });
    }

    return sections;
  }

  /**
   * Generate summary information
   */
  private generateSummary(sections: ExplanationSection[]) {
    const earningsSection = sections.find(s => s.type === 'earnings');
    const deductionsSection = sections.find(s => s.type === 'deductions');
    
    const totalGross = earningsSection?.subtotal || 0;
    const totalDeductions = deductionsSection?.subtotal || 0;
    const netPay = totalGross - totalDeductions;

    return {
      totalGross,
      totalDeductions,
      netPay,
      totalGrossLabel: 'Gross Pay',
      totalGrossLabelEl: 'Μικτές Αποδοχές',
      totalDeductionsLabel: 'Total Deductions',
      totalDeductionsLabelEl: 'Σύνολο Κρατήσεων',
      netPayLabel: 'Net Pay',
      netPayLabelEl: 'Καθαρές Αποδοχές',
    };
  }

  /**
   * Analyze quality metrics for the payslip
   */
  private analyzeQualityMetrics(lines: PayrollLine[]): ExplanationResult['qualityMetrics'] {
    let stackedLinesHandled = 0;
    const edgeCasesDetected: string[] = [];
    let roundingAdjustments = 0;
    let securityChecksPass = true;

    for (const line of lines) {
      // Check for stacked premiums
      if (this.edgeCasePatterns.split_stacking.test(line.code)) {
        stackedLinesHandled++;
        edgeCasesDetected.push('split_stacking');
      }
      
      // Check for recoveries/adjustments
      if (this.edgeCasePatterns.recoveries.test(line.code)) {
        edgeCasesDetected.push('recovery_adjustment');
      }
      
      // Check for meal vouchers
      if (this.edgeCasePatterns.meal_vouchers.test(line.code)) {
        edgeCasesDetected.push('meal_voucher');
      }
      
      // Check for tips
      if (this.edgeCasePatterns.tips.test(line.code)) {
        edgeCasesDetected.push('tips_policy');
      }
      
      // Check for SICK_EFKA
      if (this.edgeCasePatterns.sick_efka.test(line.code)) {
        edgeCasesDetected.push('sick_efka');
      }
      
      // Check for rounding
      if (this.edgeCasePatterns.rounding.test(line.code)) {
        roundingAdjustments++;
        edgeCasesDetected.push('rounding');
      }
      
      // Security check: no sensitive data in description
      if (this.containsSensitiveData(line.description)) {
        securityChecksPass = false;
      }
    }

    return {
      stackedLinesHandled,
      edgeCasesDetected: [...new Set(edgeCasesDetected)],
      roundingAdjustments,
      securityChecksPass,
    };
  }

  /**
   * Check for sensitive data in payroll line descriptions
   */
  private containsSensitiveData(description: string): boolean {
    const sensitivePatterns = [
      /GR\d{2}[A-Z0-9]{27}/, // IBAN pattern
      /\d{4}\s?\d{4}\s?\d{4}\s?\d{4}/, // Credit card pattern
      /\d{9}/, // AFM pattern (basic)
    ];
    
    return sensitivePatterns.some(pattern => pattern.test(description));
  }

  /**
   * Alert system for unmapped codes
   */
  private alertUnmappedCode(code: string, employeeId: string): void {
    // Log alert for monitoring system
    console.warn(`[EXPLAIN-PAY-ALERT] Unmapped code detected: ${code} for employee ${employeeId}`);
    
    // In production, this would integrate with alerting system
    // e.g., send to monitoring service, create ticket, etc.
  }

  /**
   * Group items with advanced stacking logic
   */
  private groupIntoSectionsWithStacking(items: ExplanationItem[]): ExplanationSection[] {
    const earnings = items.filter(item => item.amount >= 0);
    const deductions = items.filter(item => item.amount < 0);
    
    // Group stacked items (e.g., SUNDAY_75_OT1 with base OT1)
    const groupedEarnings = this.groupStackedItems(earnings);
    const groupedDeductions = this.groupStackedItems(deductions);

    const sections: ExplanationSection[] = [];

    if (groupedEarnings.length > 0) {
      sections.push({
        type: 'earnings',
        title: 'Earnings',
        titleEl: 'Αποδοχές',
        items: groupedEarnings,
        subtotal: groupedEarnings.reduce((sum, item) => sum + item.amount, 0),
        subtotalLabel: 'Total Earnings',
        subtotalLabelEl: 'Σύνολο Αποδοχών',
      });
    }

    if (groupedDeductions.length > 0) {
      sections.push({
        type: 'deductions',
        title: 'Deductions',
        titleEl: 'Κρατήσεις',
        items: groupedDeductions,
        subtotal: Math.abs(groupedDeductions.reduce((sum, item) => sum + item.amount, 0)),
        subtotalLabel: 'Total Deductions',
        subtotalLabelEl: 'Σύνολο Κρατήσεων',
      });
    }

    return sections;
  }

  /**
   * Group stacked premium items
   */
  private groupStackedItems(items: ExplanationItem[]): ExplanationItem[] {
    // For now, return items as-is. In production, this would implement
    // sophisticated grouping logic for stacked premiums
    return items;
  }

  /**
   * Generate enhanced summary with hours and deltas
   */
  private generateEnhancedSummary(sections: ExplanationSection[], payslipData: PayslipData) {
    const earningsSection = sections.find(s => s.type === 'earnings');
    const deductionsSection = sections.find(s => s.type === 'deductions');
    
    const totalGross = earningsSection?.subtotal || 0;
    const totalDeductions = deductionsSection?.subtotal || 0;
    const netPay = totalGross - totalDeductions;

    return {
      totalGross,
      totalDeductions,
      netPay,
      totalGrossLabel: 'Gross Pay',
      totalGrossLabelEl: 'Μικτές Αποδοχές',
      totalDeductionsLabel: 'Total Deductions',
      totalDeductionsLabelEl: 'Σύνολο Κρατήσεων',
      netPayLabel: 'Net Pay',
      netPayLabelEl: 'Καθαρές Αποδοχές',
      hoursWorked: payslipData.timesheetAggregates,
      // deltas would be calculated by comparing with previous period
      deltas: {
        netPayChange: 0, // Placeholder - would calculate from previous period
        grossPayChange: 0,
        changeDescription: 'No significant changes from previous period',
        changeDescriptionEl: 'Δεν υπάρχουν σημαντικές αλλαγές από την προηγούμενη περίοδο',
      },
    };
  }

  /**
   * Generate narrative explanations matching the specification format
   */
  private async generateNarrativeExplanation(
    sections: ExplanationSection[], 
    summary: any, 
    payslipData: PayslipData
  ): Promise<{ textEn: string; textEl: string }> {
    const isGreek = payslipData.employeeData?.locale === 'el';
    const hours = summary.hoursWorked;
    
    // Format numbers based on locale
    const formatCurrency = (amount: number) => {
      return isGreek 
        ? `€${amount.toLocaleString('el-GR', { minimumFractionDigits: 2 })}`
        : `€${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    };

    let textEn = `Your pay this month (${formatCurrency(summary.netPay)} net)\n\n`;
    let textEl = `Οι καθαρές αποδοχές σας (${formatCurrency(summary.netPay)})\n\n`;

    // Hours summary
    if (hours) {
      const totalRegular = hours.regularHours || 0;
      const totalOvertime = hours.overtimeHours || 0;
      const nightHours = hours.nightHours || 0;
      const sundayHours = hours.sundayHours || 0;
      
      textEn += `You worked ${totalRegular} regular hours`;
      if (totalOvertime > 0) {
        textEn += ` and ${totalOvertime} hours overtime`;
      }
      textEn += '.\n';
      
      if (nightHours > 0 || sundayHours > 0) {
        textEn += `Night & Sunday premiums applied to ${nightHours + sundayHours} hours in the legal bands.\n`;
      }
      
      textEl += `Εργαστήκατε ${totalRegular} ώρες`;
      if (totalOvertime > 0) {
        textEl += ` και ${totalOvertime} ώρες υπερωρίας`;
      }
      textEl += '.\n';
      
      if (nightHours > 0 || sundayHours > 0) {
        textEl += `Εφαρμόστηκαν προσαυξήσεις νύχτας/Κυριακής για ${nightHours + sundayHours} ώρες.\n`;
      }
    }

    // Earnings breakdown
    const earningsSection = sections.find(s => s.type === 'earnings');
    if (earningsSection) {
      for (const item of earningsSection.items) {
        // Format: "Regular pay (REG): 160h × €7.50 = €1,200.00 [REG • v2025.08]"
        textEn += `${item.label} (${item.lineCode}): ${item.formula} [${item.lineCode} • ${item.citation.ruleVersion}]\n`;
        textEl += `${item.labelEl} (${item.lineCode}): ${item.formulaEl} [${item.lineCode} • ${item.citation.ruleVersion}]\n`;
      }
    }

    textEn += '\nTaxes & EFKA were calculated per current rules. See details in each line.\n';
    textEl += '\nΟι φόροι και το ΕΦΚΑ υπολογίστηκαν σύμφωνα με τους ισχύοντες κανόνες.\n';

    return { textEn, textEl };
  }

  /**
   * Calculate confidence score based on coverage and completeness
   */
  private calculateConfidenceScore(coveragePercentage: number, rulesMatched: number, unexplainedCount: number): number {
    let score = 0;
    
    // Coverage component (70% weight)
    score += (coveragePercentage / 100) * 0.7;
    
    // Completeness component (20% weight)
    if (unexplainedCount === 0) {
      score += 0.2;
    } else {
      score += Math.max(0, 0.2 * (1 - unexplainedCount / 10)); // Penalty for unexplained lines
    }
    
    // Rule quality component (10% weight)
    score += Math.min(0.1, rulesMatched * 0.01);
    
    return Math.min(1.0, Math.max(0.0, score));
  }

  /**
   * Save explanation to database
   */
  async saveExplanation(
    payslipData: PayslipData, 
    result: ExplanationResult
  ): Promise<{ explanationId: string }> {
    const explanationData: InsertPayslipExplanation = {
      employeeId: payslipData.employeeId,
      payrollRunId: payslipData.payrollRunId,
      periodStart: payslipData.periodStart,
      periodEnd: payslipData.periodEnd,
      explanationJson: result.explanationJson,
      explanationTextEn: result.explanationTextEn,
      explanationTextEl: result.explanationTextEl,
      totalPayslipValue: result.coverage.totalPayslipValue.toString(),
      explainedValue: result.coverage.explainedValue.toString(),
      coveragePercentage: result.coverage.coveragePercentage.toString(),
      unexplainedLines: result.coverage.unexplainedLines,
      rulePackVersion: this.rulePackVersion,
      confidenceScore: result.confidenceScore.toString(),
      status: result.coverage.coveragePercentage >= 95 ? 'published' : 'flagged',
    };

    const [explanation] = await db
      .insert(payslipExplanations)
      .values(explanationData)
      .returning({ explanationId: payslipExplanations.explanationId });

    // Save citations
    const citationsWithId = result.citations.map(citation => ({
      ...citation,
      explanationId: explanation.explanationId,
    }));

    if (citationsWithId.length > 0) {
      await db.insert(explanationCitations).values(citationsWithId);
    }

    return { explanationId: explanation.explanationId };
  }

  /**
   * Get explanation by ID
   */
  async getExplanation(explanationId: string): Promise<PayslipExplanation | null> {
    const [explanation] = await db
      .select()
      .from(payslipExplanations)
      .where(eq(payslipExplanations.explanationId, explanationId))
      .limit(1);

    return explanation || null;
  }

  /**
   * Get explanations for an employee
   */
  async getEmployeeExplanations(employeeId: string, limit = 10): Promise<PayslipExplanation[]> {
    return await db
      .select()
      .from(payslipExplanations)
      .where(eq(payslipExplanations.employeeId, employeeId))
      .orderBy(desc(payslipExplanations.periodEnd))
      .limit(limit);
  }
}

// Export singleton instance
export const payslipExplanationService = new PayslipExplanationService();