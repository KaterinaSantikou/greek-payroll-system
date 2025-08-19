import yaml from 'js-yaml';
import { z } from 'zod';
import { PayrollRule, PayrollRuleSchema, rulesEngine } from './rulesEngine';

// DSL Parser for YAML/JSON rule definitions
export class RulesDSLParser {
  
  // Parse YAML rule definition
  static parseYAML(yamlContent: string): PayrollRule {
    try {
      const parsed = yaml.load(yamlContent) as any;
      return this.validateAndTransform(parsed);
    } catch (error) {
      throw new Error(`YAML parsing failed: ${error}`);
    }
  }

  // Parse JSON rule definition
  static parseJSON(jsonContent: string): PayrollRule {
    try {
      const parsed = JSON.parse(jsonContent);
      return this.validateAndTransform(parsed);
    } catch (error) {
      throw new Error(`JSON parsing failed: ${error}`);
    }
  }

  // Validate and transform rule definition
  private static validateAndTransform(ruleData: any): PayrollRule {
    // Transform shorthand syntax to full structure
    const transformed = this.transformShorthand(ruleData);
    
    // Validate against schema
    const validation = PayrollRuleSchema.safeParse(transformed);
    if (!validation.success) {
      throw new Error(`Rule validation failed: ${validation.error.message}`);
    }
    
    return validation.data;
  }

  // Transform shorthand DSL syntax to full rule structure
  private static transformShorthand(rule: any): any {
    const transformed = { ...rule };
    
    // Transform condition shorthand
    if (rule.condition && typeof rule.condition === 'string') {
      transformed.conditions = this.parseConditionString(rule.condition);
      delete transformed.condition;
    }
    
    // Transform action shorthand
    if (rule.action_on_violation && !Array.isArray(rule.action_on_violation)) {
      transformed.actions = this.parseActionShorthand(rule.action_on_violation);
      delete transformed.action_on_violation;
    } else if (rule.action_on_violation && Array.isArray(rule.action_on_violation)) {
      transformed.actions = rule.action_on_violation.map((action: any) => 
        typeof action === 'string' ? { type: action } : action
      );
      delete transformed.action_on_violation;
    }
    
    // Ensure required fields have defaults
    if (!transformed.priority) transformed.priority = 100;
    if (!transformed.metadata) transformed.metadata = {};
    
    return transformed;
  }

  // Parse condition string like "employee.contract.type in ['indefinite','fixed','seasonal']"
  private static parseConditionString(conditionStr: string): any[] {
    const conditions = [];
    
    // Simple regex-based parsing (extend for more complex expressions)
    const patterns = [
      // field operator value
      /(\S+)\s+(eq|neq|gt|gte|lt|lte|in|not_in|contains|regex)\s+(.+)/,
      // field = value
      /(\S+)\s*=\s*(.+)/,
      // field > value
      /(\S+)\s*>\s*(.+)/,
      // field < value  
      /(\S+)\s*<\s*(.+)/,
      // field >= value
      /(\S+)\s*>=\s*(.+)/,
      // field <= value
      /(\S+)\s*<=\s*(.+)/
    ];

    for (const pattern of patterns) {
      const match = conditionStr.match(pattern);
      if (match) {
        let operator = match[2] || 'eq';
        if (match[0].includes('>=')) operator = 'gte';
        else if (match[0].includes('<=')) operator = 'lte';
        else if (match[0].includes('>')) operator = 'gt';
        else if (match[0].includes('<')) operator = 'lt';
        else if (match[0].includes('=')) operator = 'eq';

        let value: any = match[3] || match[2];
        
        // Parse array values like ['indefinite','fixed','seasonal']
        if (value.startsWith('[') && value.endsWith(']')) {
          value = JSON.parse(value.replace(/'/g, '"'));
        }
        // Parse string values
        else if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.slice(1, -1);
        }
        // Parse numeric values
        else if (!isNaN(Number(value))) {
          value = Number(value);
        }
        // Parse boolean values
        else if (value === 'true' || value === 'false') {
          value = value === 'true';
        }

        conditions.push({
          field: match[1],
          operator,
          value
        });
        break;
      }
    }

    return conditions.length > 0 ? conditions : [
      { field: 'true', operator: 'eq', value: true }
    ];
  }

  // Parse action shorthand
  private static parseActionShorthand(actionData: any): any[] {
    const actions = [];
    
    if (typeof actionData === 'string') {
      actions.push({ type: actionData });
    } else if (Array.isArray(actionData)) {
      for (const action of actionData) {
        if (typeof action === 'string') {
          actions.push({ type: action });
        } else {
          actions.push(action);
        }
      }
    } else if (typeof actionData === 'object') {
      actions.push(actionData);
    }
    
    return actions;
  }

  // Batch load rules from multiple sources
  static async loadRulesFromDirectory(rulesDir: string): Promise<void> {
    // In a real implementation, this would read files from directory
    // For now, we'll simulate with example rule definitions
    const exampleRules = this.getExampleRules();
    
    for (const ruleContent of exampleRules) {
      try {
        const rule = this.parseYAML(ruleContent);
        await rulesEngine.registerRule(rule);
        console.log(`Loaded rule: ${rule.rule} v${rule.version}`);
      } catch (error) {
        console.error(`Failed to load rule: ${error}`);
      }
    }
  }

  // Example rule definitions in YAML format
  private static getExampleRules(): string[] {
    return [
      `
rule: "MinimumWageValidation"
version: "2025.01"
description: "Validates Greek statutory minimum wage compliance"
category: "minimum_wage"
applies_to: ["baseSalary", "base_monthly_salary"]
priority: 1
effective_from: "2025-01-01"
condition: "employee.contract.type in ['indefinite','fixed_term','seasonal']"
threshold: 880.00
action_on_violation:
  - "block_finalize"
  - type: "alert"
    to: "payroll_admin"
    message: "Base pay below statutory minimum (€880/month)"
metadata:
  legal_reference: "Greek Labor Law Article 103"
  last_updated: "2025-01-01"
      `,
      `
rule: "OvertimeCalculation"
version: "2025.01"
description: "Calculate overtime premiums according to Greek law"
category: "overtime"
applies_to: ["overtime_hours"]
priority: 10
effective_from: "2025-01-01"
condition: "overtime_hours > 0"
rate: 1.25
formula: "\${baseSalary} / 173.33 * \${overtime_hours} * 1.25"
action_on_violation:
  - type: "calculate"
    params:
      rate: 1.25
      max_hours_tier1: 20
metadata:
  calculation_basis: "Monthly salary / 173.33 standard hours"
      `,
      `
rule: "NightShiftPremium"
version: "2025.01"
description: "25% premium for night work (22:00-06:00)"
category: "night_premium"
applies_to: ["night_hours"]
priority: 20
effective_from: "2025-01-01"
condition: "shift.start_time >= '22:00' or shift.end_time <= '06:00'"
rate: 0.25
formula: "\${hourly_rate} * \${night_hours} * 0.25"
action_on_violation:
  - type: "calculate"
metadata:
  time_range: "22:00-06:00"
  premium_rate: "25%"
      `,
      `
rule: "CBASalaryMinimum"
version: "2025.01"
description: "Collective Bargaining Agreement minimum salary validation"
category: "minimum_wage"
applies_to: ["base_salary"]
priority: 5
effective_from: "2025-01-01"
condition: "employee.contract.cba_id != null"
threshold: 950.00
action_on_violation:
  - type: "flag_review"
    message: "Salary below CBA minimum - requires HR review"
  - type: "alert"
    to: "hr_manager"
    message: "CBA salary compliance issue detected"
metadata:
  cba_reference: "Hotel Industry CBA 2024-2026"
  minimum_rates:
    entry_level: 950.00
    experienced: 1200.00
    supervisor: 1500.00
      `,
      `
rule: "VacationAllowanceCalculation"
version: "2025.01"
description: "Calculate mandatory vacation allowance (Επίδομα Άδειας)"
category: "allowances"
applies_to: ["vacation_allowance"]
priority: 30
effective_from: "2025-01-01"
condition: "employee.employment_type in ['indefinite', 'fixed_term']"
rate: 0.5
formula: "\${monthly_salary} * 0.5"
action_on_violation:
  - type: "auto_correct"
    message: "Auto-calculated vacation allowance"
metadata:
  legal_basis: "Greek Labor Law - Vacation Allowance"
  calculation: "50% of monthly salary"
  payment_timing: "Before vacation period"
      `
    ];
  }
}

// Rule compiler for optimized execution
export class RulesCompiler {
  
  // Compile rules into executable functions for performance
  static compileRule(rule: PayrollRule): Function {
    const conditionChecks = rule.conditions.map(condition => 
      this.compileCondition(condition)
    ).join(' && ');
    
    const actionExecutions = rule.actions.map(action => 
      this.compileAction(action, rule)
    ).join('; ');
    
    return new Function('context', `
      if (${conditionChecks}) {
        const results = [];
        ${actionExecutions}
        return results;
      }
      return [];
    `);
  }

  private static compileCondition(condition: any): string {
    const field = `this.getNestedValue(context, '${condition.field}')`;
    const value = JSON.stringify(condition.value);
    
    switch (condition.operator) {
      case 'eq': return `${field} === ${value}`;
      case 'neq': return `${field} !== ${value}`;
      case 'gt': return `Number(${field}) > ${value}`;
      case 'gte': return `Number(${field}) >= ${value}`;
      case 'lt': return `Number(${field}) < ${value}`;
      case 'lte': return `Number(${field}) <= ${value}`;
      case 'in': return `${value}.includes(${field})`;
      case 'not_in': return `!${value}.includes(${field})`;
      default: return 'false';
    }
  }

  private static compileAction(action: any, rule: PayrollRule): string {
    switch (action.type) {
      case 'block_finalize':
        return `results.push({
          type: 'violation',
          rule: '${rule.rule}',
          message: '${action.message || 'Rule violation'}',
          blockFinalization: true
        })`;
      case 'calculate':
        return `results.push({
          type: 'calculation',
          rule: '${rule.rule}',
          formula: '${rule.formula || ''}',
          rate: ${rule.rate || 0}
        })`;
      default:
        return `results.push({type: '${action.type}', rule: '${rule.rule}'})`;
    }
  }
}