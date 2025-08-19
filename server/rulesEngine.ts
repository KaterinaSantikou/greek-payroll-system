import { z } from "zod";
import { db } from "./db";
import { employees, contracts, payrollLines, payrollRuns } from "@shared/schema";
import { eq, and, gte, lte, or, sql } from "drizzle-orm";

// DSL Schema Definition
export const RuleConditionSchema = z.object({
  field: z.string(),
  operator: z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "in", "not_in", "contains", "regex"]),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.union([z.string(), z.number()]))]),
});

export const TimeBandSchema = z.object({
  start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/), // HH:MM format
  end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  crossesMidnight: z.boolean().optional().default(false),
});

export const ErganiModeSchema = z.object({
  mode: z.enum(["pre_announcement", "reporting"]),
  entity_routing: z.record(z.string()).optional(), // entity_id -> mode mapping
  auto_routing: z.boolean().default(true),
});

export const RuleActionSchema = z.object({
  type: z.enum(["block_finalize", "alert", "auto_correct", "flag_review", "calculate", "route_ergani"]),
  params: z.record(z.any()).optional(),
  to: z.string().optional(), // For alerts
  message: z.string().optional(),
  ergani_config: ErganiModeSchema.optional(),
});

export const PayrollRuleSchema = z.object({
  rule: z.string(),
  version: z.string(), // Format: YYYY.MM or YYYY.MM.DD
  description: z.string().optional(),
  category: z.enum([
    "minimum_wage", 
    "overtime", 
    "night_premium", 
    "sunday_premium", 
    "holiday_premium",
    "tax_calculation",
    "insurance_calculation",
    "allowances",
    "deductions",
    "compliance_check",
    "time_bands",
    "ergani_routing"
  ]),
  applies_to: z.array(z.string()), // Fields or calculation types
  priority: z.number().default(100), // Lower = higher priority
  effective_from: z.string(), // ISO date
  effective_to: z.string().optional(), // ISO date, null = indefinite
  conditions: z.array(RuleConditionSchema),
  actions: z.array(RuleActionSchema),
  threshold: z.number().optional(),
  rate: z.number().optional(),
  premium: z.number().optional(), // Premium rate for time bands
  formula: z.string().optional(), // Mathematical expression
  band: TimeBandSchema.optional(), // Time band definition
  ergani_mode: ErganiModeSchema.optional(), // ERGANI routing configuration
  metadata: z.record(z.any()).default({}),
});

export type PayrollRule = z.infer<typeof PayrollRuleSchema>;
export type RuleCondition = z.infer<typeof RuleConditionSchema>;
export type RuleAction = z.infer<typeof RuleActionSchema>;
export type TimeBand = z.infer<typeof TimeBandSchema>;
export type ErganiMode = z.infer<typeof ErganiModeSchema>;

// Rules Storage Table Schema
export const rulesRegistry = `
CREATE TABLE IF NOT EXISTS payroll_rules (
  rule_id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name VARCHAR(100) NOT NULL,
  version VARCHAR(20) NOT NULL,
  category VARCHAR(50) NOT NULL,
  priority INTEGER DEFAULT 100,
  effective_from DATE NOT NULL,
  effective_to DATE,
  rule_definition JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(rule_name, version)
);

CREATE INDEX IF NOT EXISTS idx_payroll_rules_effective ON payroll_rules (effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_payroll_rules_category ON payroll_rules (category);
CREATE INDEX IF NOT EXISTS idx_payroll_rules_active ON payroll_rules (is_active);
`;

// Rules Engine Implementation
export class PayrollRulesEngine {
  private rules: Map<string, PayrollRule[]> = new Map();
  private evaluationContext: any = {};

  constructor() {
    this.loadRulesFromDatabase();
  }

  // Load rules from database with versioning
  async loadRulesFromDatabase(effectiveDate: Date = new Date()): Promise<void> {
    try {
      const dateStr = effectiveDate.toISOString().split('T')[0];
      const query = `
        SELECT rule_name, version, category, priority, effective_from, effective_to, rule_definition
        FROM payroll_rules 
        WHERE is_active = true 
          AND effective_from <= '${dateStr}' 
          AND (effective_to IS NULL OR effective_to >= '${dateStr}')
        ORDER BY priority ASC, version DESC
      `;
      
      const result = await db.execute(sql.raw(query));
      
      this.rules.clear();
      for (const row of result.rows as any[]) {
        const rule = PayrollRuleSchema.parse(row.rule_definition);
        const categoryRules = this.rules.get(rule.category) || [];
        categoryRules.push(rule);
        this.rules.set(rule.category, categoryRules);
      }
    } catch (error) {
      console.error("Failed to load rules from database:", error);
    }
  }

  // Register a new rule with versioning
  async registerRule(rule: PayrollRule): Promise<void> {
    const validation = PayrollRuleSchema.safeParse(rule);
    if (!validation.success) {
      throw new Error(`Invalid rule definition: ${validation.error.message}`);
    }

    try {
      const query = `
        INSERT INTO payroll_rules (rule_name, version, category, priority, effective_from, effective_to, rule_definition)
        VALUES ('${rule.rule}', '${rule.version}', '${rule.category}', ${rule.priority}, '${rule.effective_from}', ${rule.effective_to ? "'" + rule.effective_to + "'" : 'NULL'}, '${JSON.stringify(rule).replace(/'/g, "''")}')
        ON CONFLICT (rule_name, version) DO UPDATE SET
          rule_definition = EXCLUDED.rule_definition,
          updated_at = NOW()
      `;
      await db.execute(sql.raw(query));

      // Update in-memory cache
      const categoryRules = this.rules.get(rule.category) || [];
      const existingIndex = categoryRules.findIndex(r => r.rule === rule.rule && r.version === rule.version);
      if (existingIndex >= 0) {
        categoryRules[existingIndex] = rule;
      } else {
        categoryRules.push(rule);
        categoryRules.sort((a, b) => a.priority - b.priority);
      }
      this.rules.set(rule.category, categoryRules);
    } catch (error) {
      throw new Error(`Failed to register rule: ${error}`);
    }
  }

  // Evaluate conditions against context
  private evaluateCondition(condition: RuleCondition, context: any): boolean {
    const fieldValue = this.getNestedValue(context, condition.field);
    
    switch (condition.operator) {
      case "eq":
        return fieldValue === condition.value;
      case "neq":
        return fieldValue !== condition.value;
      case "gt":
        return Number(fieldValue) > Number(condition.value);
      case "gte":
        return Number(fieldValue) >= Number(condition.value);
      case "lt":
        return Number(fieldValue) < Number(condition.value);
      case "lte":
        return Number(fieldValue) <= Number(condition.value);
      case "in":
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case "not_in":
        return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
      case "contains":
        return String(fieldValue).includes(String(condition.value));
      case "regex":
        return new RegExp(String(condition.value)).test(String(fieldValue));
      default:
        return false;
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  // Check if time falls within band (handles midnight crossing)
  private isTimeInBand(time: string, band: TimeBand): boolean {
    const timeMinutes = this.timeToMinutes(time);
    const startMinutes = this.timeToMinutes(band.start);
    const endMinutes = this.timeToMinutes(band.end);
    
    if (startMinutes <= endMinutes) {
      // Normal case: 09:00-17:00
      return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
    } else {
      // Midnight crossing: 22:00-06:00
      return timeMinutes >= startMinutes || timeMinutes <= endMinutes;
    }
  }
  
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
  
  // Calculate time-based premium
  private calculateTimeBandPremium(rule: PayrollRule, context: any): number {
    if (!rule.band || !rule.premium) return 0;
    
    const workStart = this.getNestedValue(context, 'shift.start_time');
    const workEnd = this.getNestedValue(context, 'shift.end_time');
    const totalHours = this.getNestedValue(context, 'shift.total_hours') || 8;
    
    if (!workStart || !workEnd) return 0;
    
    // Calculate overlapping hours with premium band
    const overlapHours = this.calculateTimeOverlap(workStart, workEnd, rule.band);
    const baseHourlyRate = this.getNestedValue(context, 'employee.hourly_rate') || 0;
    
    return overlapHours * baseHourlyRate * rule.premium;
  }
  
  private calculateTimeOverlap(workStart: string, workEnd: string, band: TimeBand): number {
    const workStartMinutes = this.timeToMinutes(workStart);
    const workEndMinutes = this.timeToMinutes(workEnd);
    const bandStartMinutes = this.timeToMinutes(band.start);
    const bandEndMinutes = this.timeToMinutes(band.end);
    
    let overlapMinutes = 0;
    
    if (bandStartMinutes <= bandEndMinutes) {
      // Normal band (no midnight crossing)
      const overlapStart = Math.max(workStartMinutes, bandStartMinutes);
      const overlapEnd = Math.min(workEndMinutes, bandEndMinutes);
      overlapMinutes = Math.max(0, overlapEnd - overlapStart);
    } else {
      // Midnight crossing band
      // Check overlap with evening portion (band start to midnight)
      if (workStartMinutes >= bandStartMinutes || workEndMinutes >= bandStartMinutes) {
        const eveningStart = Math.max(workStartMinutes, bandStartMinutes);
        const eveningEnd = Math.min(workEndMinutes, 24 * 60); // Midnight
        overlapMinutes += Math.max(0, eveningEnd - eveningStart);
      }
      // Check overlap with morning portion (midnight to band end)
      if (workStartMinutes <= bandEndMinutes || workEndMinutes <= bandEndMinutes) {
        const morningStart = Math.max(workStartMinutes, 0); // Midnight
        const morningEnd = Math.min(workEndMinutes, bandEndMinutes);
        overlapMinutes += Math.max(0, morningEnd - morningStart);
      }
    }
    
    return overlapMinutes / 60; // Convert to hours
  }

  // Execute rule actions
  private async executeActions(actions: RuleAction[], context: any, rule: PayrollRule): Promise<any[]> {
    const results = [];
    
    for (const action of actions) {
      switch (action.type) {
        case "block_finalize":
          results.push({
            type: "violation",
            rule: rule.rule,
            version: rule.version,
            message: action.message || `Rule violation: ${rule.rule}`,
            severity: "error",
            blockFinalization: true
          });
          break;
          
        case "alert":
          results.push({
            type: "alert",
            rule: rule.rule,
            version: rule.version,
            to: action.to || "payroll_admin",
            message: action.message || `Rule alert: ${rule.rule}`,
            severity: "warning"
          });
          break;
          
        case "auto_correct":
          const correctedValue = this.calculateCorrection(rule, context);
          results.push({
            type: "correction",
            rule: rule.rule,
            version: rule.version,
            field: rule.applies_to[0],
            originalValue: this.getNestedValue(context, rule.applies_to[0]),
            correctedValue,
            message: `Auto-corrected by rule: ${rule.rule}`
          });
          break;
          
        case "flag_review":
          results.push({
            type: "review",
            rule: rule.rule,
            version: rule.version,
            message: action.message || `Requires review: ${rule.rule}`,
            severity: "info"
          });
          break;
          
        case "calculate":
          let calculatedValue;
          if (rule.band && rule.premium) {
            calculatedValue = this.calculateTimeBandPremium(rule, context);
          } else {
            calculatedValue = this.evaluateFormula(rule.formula || "", context);
          }
          results.push({
            type: "calculation",
            rule: rule.rule,
            version: rule.version,
            field: rule.applies_to[0],
            calculatedValue,
            formula: rule.formula,
            timeBand: rule.band,
            premium: rule.premium
          });
          break;
          
        case "route_ergani":
          const erganiRouting = this.determineErganiRouting(action.ergani_config, context);
          results.push({
            type: "ergani_routing",
            rule: rule.rule,
            version: rule.version,
            routing: erganiRouting,
            message: `ERGANI routing determined: ${erganiRouting.mode}`
          });
          break;
      }
    }
    
    return results;
  }
  
  // Determine ERGANI routing mode based on entity and configuration
  private determineErganiRouting(config: ErganiMode | undefined, context: any): any {
    if (!config) {
      return { mode: "reporting", auto_routing: false };
    }
    
    const entityId = this.getNestedValue(context, 'entity.id') || 'default';
    
    // Check for entity-specific routing
    if (config.entity_routing && config.entity_routing[entityId]) {
      return {
        mode: config.entity_routing[entityId],
        entity_id: entityId,
        auto_routing: config.auto_routing
      };
    }
    
    // Use default mode
    return {
      mode: config.mode,
      entity_id: entityId,
      auto_routing: config.auto_routing
    };
  }

  private calculateCorrection(rule: PayrollRule, context: any): number {
    if (rule.threshold !== undefined) {
      const currentValue = this.getNestedValue(context, rule.applies_to[0]);
      return Math.max(Number(currentValue), rule.threshold);
    }
    return 0;
  }

  private evaluateFormula(formula: string, context: any): number {
    // Simple formula evaluator - in production, use a proper expression parser
    try {
      // Replace context variables in formula
      let processedFormula = formula;
      const variables = formula.match(/\$\{([^}]+)\}/g);
      
      if (variables) {
        for (const variable of variables) {
          const path = variable.slice(2, -1); // Remove ${ and }
          const value = this.getNestedValue(context, path);
          processedFormula = processedFormula.replace(variable, String(value || 0));
        }
      }
      
      // Basic math evaluation (extend as needed)
      return Function(`"use strict"; return (${processedFormula})`)();
    } catch (error) {
      console.error(`Formula evaluation error: ${error}`);
      return 0;
    }
  }

  // Main evaluation method
  async evaluateRules(
    category: string, 
    context: any, 
    effectiveDate: Date = new Date()
  ): Promise<any[]> {
    await this.loadRulesFromDatabase(effectiveDate);
    
    const categoryRules = this.rules.get(category) || [];
    const results = [];
    
    for (const rule of categoryRules) {
      // Check if all conditions are met
      const allConditionsMet = rule.conditions.every(condition => 
        this.evaluateCondition(condition, context)
      );
      
      if (allConditionsMet) {
        const actionResults = await this.executeActions(rule.actions, context, rule);
        results.push(...actionResults);
      }
    }
    
    return results;
  }

  // Time band validation for shift schedules
  async validateTimeBands(shiftData: any): Promise<any[]> {
    const context = {
      shift: shiftData,
      employee: shiftData.employee,
      entity: shiftData.entity
    };

    return this.evaluateRules("time_bands", context);
  }

  // ERGANI routing evaluation
  async evaluateErganiRouting(entityData: any, submissionType: string): Promise<any[]> {
    const context = {
      entity: entityData,
      submission_type: submissionType,
      timestamp: new Date().toISOString()
    };

    return this.evaluateRules("ergani_routing", context);
  }

  // Specific payroll validation methods
  async validateMinimumWage(employeeId: string, baseSalary: number): Promise<any[]> {
    const employee = await db.select()
      .from(employees)
      .where(eq(employees.employeeId, employeeId))
      .limit(1);

    if (!employee.length) return [];

    const context = {
      employee: employee[0],
      baseSalary,
      date: new Date()
    };

    return this.evaluateRules("minimum_wage", context);
  }

  async validateOvertime(employeeId: string, overtimeHours: number, regularHours: number): Promise<any[]> {
    const context = {
      employee: { id: employeeId },
      overtimeHours,
      regularHours,
      totalHours: overtimeHours + regularHours
    };

    return this.evaluateRules("overtime", context);
  }

  async validatePayrollRun(runId: string): Promise<any[]> {
    const payrollData = await db.select()
      .from(payrollRuns)
      .leftJoin(payrollLines, eq(payrollRuns.runId, payrollLines.runId))
      .where(eq(payrollRuns.runId, runId));

    const results = [];
    for (const entry of payrollData) {
      const context = {
        payrollRun: entry.payroll_runs,
        payrollLine: entry.payroll_lines
      };

      // Validate multiple categories
      const categories = ["minimum_wage", "overtime", "tax_calculation", "compliance_check"];
      for (const category of categories) {
        const categoryResults = await this.evaluateRules(category, context);
        results.push(...categoryResults);
      }
    }

    return results;
  }
}

// Predefined Greek Payroll Rules
export const GREEK_PAYROLL_RULES: PayrollRule[] = [
  {
    rule: "MinimumWage",
    version: "2025.01",
    description: "Greek statutory minimum wage validation",
    category: "minimum_wage",
    applies_to: ["baseSalary"],
    priority: 1,
    effective_from: "2025-01-01",
    conditions: [
      {
        field: "employee.employmentType",
        operator: "in",
        value: ["indefinite", "fixed_term", "seasonal"]
      }
    ],
    actions: [
      {
        type: "block_finalize",
        message: "Base salary below statutory minimum wage (€880/month)"
      },
      {
        type: "alert",
        to: "payroll_admin",
        message: "Employee salary below minimum wage threshold"
      }
    ],
    threshold: 880.00,
    metadata: {
      legal_reference: "Greek Labor Law Article 103",
      last_updated: "2025-01-01"
    }
  },
  {
    rule: "NightHours",
    version: "2025.01",
    description: "25% premium for night work hours (22:00-06:00)",
    category: "time_bands",
    applies_to: ["nightPremium"],
    priority: 15,
    effective_from: "2025-01-01",
    conditions: [
      {
        field: "shift.overlaps_night_band",
        operator: "eq",
        value: true
      }
    ],
    actions: [
      {
        type: "calculate"
      }
    ],
    premium: 0.25,
    band: {
      start: "22:00",
      end: "06:00",
      crossesMidnight: true
    },
    metadata: {
      calculation_method: "hourly overlap with 25% premium",
      legal_reference: "Greek Labor Law - Night Work Premium"
    }
  },
  {
    rule: "ErganiPreAnnouncement",
    version: "2025.01",
    description: "ERGANI pre-announcement routing for large entities",
    category: "ergani_routing",
    applies_to: ["ergani_submission"],
    priority: 5,
    effective_from: "2025-01-01",
    conditions: [
      {
        field: "entity.employee_count",
        operator: "gte",
        value: 50
      }
    ],
    actions: [
      {
        type: "route_ergani",
        ergani_config: {
          mode: "pre_announcement",
          auto_routing: true,
          entity_routing: {
            "HOTEL_CHAIN_001": "pre_announcement",
            "HOTEL_BOUTIQUE_002": "reporting"
          }
        }
      }
    ],
    metadata: {
      routing_logic: "Large entities use pre-announcement mode",
      compliance_requirement: "ERGANI II Article 15"
    }
  },
  {
    rule: "OvertimeTier1",
    version: "2025.01",
    description: "First 20 hours overtime at 125% rate",
    category: "overtime",
    applies_to: ["overtimeHours"],
    priority: 10,
    effective_from: "2025-01-01",
    conditions: [
      {
        field: "overtimeHours",
        operator: "gt",
        value: 0
      },
      {
        field: "overtimeHours",
        operator: "lte",
        value: 20
      }
    ],
    actions: [
      {
        type: "calculate",
        params: { rate: 1.25 }
      }
    ],
    rate: 1.25,
    formula: "${baseSalary} / 173.33 * ${overtimeHours} * 1.25",
    metadata: {
      calculation_basis: "Monthly salary / 173.33 standard hours"
    }
  },
  {
    rule: "NightPremium",
    version: "2025.01",
    description: "25% premium for night shifts (22:00-06:00)",
    category: "night_premium",
    applies_to: ["nightHours"],
    priority: 20,
    effective_from: "2025-01-01",
    conditions: [
      {
        field: "nightHours",
        operator: "gt",
        value: 0
      }
    ],
    actions: [
      {
        type: "calculate"
      }
    ],
    rate: 0.25,
    formula: "${baseSalary} / 173.33 * ${nightHours} * 0.25",
    metadata: {
      time_range: "22:00-06:00",
      premium_rate: "25%"
    }
  },
  {
    rule: "SundayPremium",
    version: "2025.01",
    description: "75% premium for Sunday work",
    category: "sunday_premium",
    applies_to: ["sundayHours"],
    priority: 25,
    effective_from: "2025-01-01",
    conditions: [
      {
        field: "sundayHours",
        operator: "gt",
        value: 0
      }
    ],
    actions: [
      {
        type: "calculate"
      }
    ],
    rate: 0.75,
    formula: "${baseSalary} / 173.33 * ${sundayHours} * 0.75",
    metadata: {
      premium_type: "Sunday work",
      premium_rate: "75%"
    }
  },
  {
    rule: "HolidayPremium",
    version: "2025.01",
    description: "100% premium for holiday work",
    category: "holiday_premium",
    applies_to: ["holidayHours"],
    priority: 30,
    effective_from: "2025-01-01",
    conditions: [
      {
        field: "holidayHours",
        operator: "gt",
        value: 0
      }
    ],
    actions: [
      {
        type: "calculate"
      }
    ],
    rate: 1.00,
    formula: "${baseSalary} / 173.33 * ${holidayHours} * 1.00",
    metadata: {
      premium_type: "Holiday work",
      premium_rate: "100%"
    }
  }
];

// Initialize the rules engine
export const rulesEngine = new PayrollRulesEngine();

// Load predefined rules on startup
export async function initializeRulesEngine(): Promise<void> {
  for (const rule of GREEK_PAYROLL_RULES) {
    try {
      await rulesEngine.registerRule(rule);
    } catch (error) {
      console.error(`Failed to register rule ${rule.rule}:`, error);
    }
  }
}