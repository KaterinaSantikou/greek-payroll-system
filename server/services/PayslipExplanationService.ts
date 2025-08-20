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
    };
    metadata: {
      generatedAt: string;
      rulePackVersion: string;
      locale: string;
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
}

export class PayslipExplanationService {
  private rulePackVersion = 'v2025.1';

  /**
   * Generate a complete explanation for a payslip
   */
  async generateExplanation(payslipData: PayslipData): Promise<ExplanationResult> {
    const { employeeId, payrollRunId, lines } = payslipData;
    
    // Load active rules for all codes found in the payslip
    const codes = Array.from(new Set(lines.map(line => line.code)));
    const rules = await this.loadRules(codes);
    
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
      }
    }

    // Group items into sections
    const sections = this.groupIntoSections(explainedItems);
    
    // Calculate totals and coverage
    const totalPayslipValue = lines.reduce((sum, line) => sum + Math.abs(parseFloat(line.amount.toString())), 0);
    const coveragePercentage = totalPayslipValue > 0 ? (explainedValue / totalPayslipValue) * 100 : 0;
    
    // Generate summary
    const summary = this.generateSummary(sections);
    
    // Generate text explanations
    const { textEn, textEl } = await this.generateTextExplanation(sections, summary, payslipData.employeeData?.locale || 'en');
    
    // Calculate confidence score based on coverage and rule completeness
    const confidenceScore = this.calculateConfidenceScore(coveragePercentage, rules.length, unexplainedLines.length);

    return {
      explanationJson: {
        sections,
        summary,
        metadata: {
          generatedAt: new Date().toISOString(),
          rulePackVersion: this.rulePackVersion,
          locale: payslipData.employeeData?.locale || 'en',
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
    };
  }

  /**
   * Load explanation rules for the given codes
   */
  private async loadRules(codes: string[]): Promise<ExplanationRule[]> {
    return await db
      .select()
      .from(explanationRules)
      .where(
        and(
          eq(explanationRules.isActive, true),
          sql`${explanationRules.earningsCode} = ANY(${codes})`,
          sql`${explanationRules.effectiveFrom} <= CURRENT_DATE`,
          sql`(${explanationRules.effectiveTo} IS NULL OR ${explanationRules.effectiveTo} >= CURRENT_DATE)`
        )
      )
      .orderBy(desc(explanationRules.ruleVersion));
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
   * Generate human-readable text explanations
   */
  private async generateTextExplanation(
    sections: ExplanationSection[], 
    summary: any, 
    locale: string
  ): Promise<{ textEn: string; textEl: string }> {
    const isGreek = locale === 'el';
    
    let textEn = `Your payslip for this period breaks down as follows:\n\n`;
    let textEl = `Η μισθοδοσία σας για αυτή την περίοδο αναλύεται ως εξής:\n\n`;

    for (const section of sections) {
      textEn += `**${section.title}**\n`;
      textEl += `**${section.titleEl}**\n`;
      
      for (const item of section.items) {
        textEn += `• ${item.label}: €${item.amount.toFixed(2)}\n`;
        textEn += `  ${item.explanation}\n`;
        textEn += `  Formula: ${item.formula}\n\n`;
        
        textEl += `• ${item.labelEl}: €${item.amount.toFixed(2)}\n`;
        textEl += `  ${item.explanationEl}\n`;
        textEl += `  Τύπος: ${item.formulaEl}\n\n`;
      }
      
      textEn += `${section.subtotalLabel}: €${section.subtotal.toFixed(2)}\n\n`;
      textEl += `${section.subtotalLabelEl}: €${section.subtotal.toFixed(2)}\n\n`;
    }

    textEn += `**Summary**\n`;
    textEn += `Gross Pay: €${summary.totalGross.toFixed(2)}\n`;
    textEn += `Total Deductions: €${summary.totalDeductions.toFixed(2)}\n`;
    textEn += `Net Pay: €${summary.netPay.toFixed(2)}`;

    textEl += `**Σύνοψη**\n`;
    textEl += `Μικτές Αποδοχές: €${summary.totalGross.toFixed(2)}\n`;
    textEl += `Σύνολο Κρατήσεων: €${summary.totalDeductions.toFixed(2)}\n`;
    textEl += `Καθαρές Αποδοχές: €${summary.netPay.toFixed(2)}`;

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