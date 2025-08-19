import { Router } from "express";
import { z } from "zod";
import { isAuthenticated } from "./replitAuth";
import { rulesEngine, GREEK_PAYROLL_RULES, PayrollRuleSchema } from "./rulesEngine";
import { RulesDSLParser } from "./rulesDSLParser";

const router = Router();

// Get all active rules
router.get('/api/rules', isAuthenticated, async (req, res) => {
  try {
    const category = req.query.category as string;
    const effectiveDate = req.query.effective_date 
      ? new Date(req.query.effective_date as string)
      : new Date();

    await rulesEngine.loadRulesFromDatabase(effectiveDate);
    
    // Return rules from database or predefined rules
    let rules = GREEK_PAYROLL_RULES;
    if (category) {
      rules = rules.filter(rule => rule.category === category);
    }

    res.json({
      rules,
      categories: [
        "minimum_wage",
        "overtime", 
        "night_premium",
        "sunday_premium",
        "holiday_premium",
        "tax_calculation",
        "insurance_calculation",
        "allowances",
        "deductions",
        "compliance_check"
      ],
      effectiveDate: effectiveDate.toISOString().split('T')[0]
    });
  } catch (error) {
    console.error('Error fetching rules:', error);
    res.status(500).json({ error: 'Failed to fetch rules' });
  }
});

// Create or update a rule
router.post('/api/rules', isAuthenticated, async (req, res) => {
  try {
    const ruleData = req.body;
    
    // Validate rule structure
    const validation = PayrollRuleSchema.safeParse(ruleData);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid rule definition',
        details: validation.error.issues
      });
    }

    // Register the rule
    await rulesEngine.registerRule(validation.data);
    
    res.json({
      message: 'Rule registered successfully',
      rule: validation.data.rule,
      version: validation.data.version
    });
  } catch (error) {
    console.error('Error registering rule:', error);
    res.status(500).json({ error: 'Failed to register rule' });
  }
});

// Parse and create rule from YAML/JSON
router.post('/api/rules/parse', isAuthenticated, async (req, res) => {
  try {
    const { content, format = 'yaml' } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Rule content is required' });
    }

    let rule;
    if (format === 'yaml') {
      rule = RulesDSLParser.parseYAML(content);
    } else {
      rule = RulesDSLParser.parseJSON(content);
    }

    // Register the parsed rule
    await rulesEngine.registerRule(rule);
    
    res.json({
      message: 'Rule parsed and registered successfully',
      rule: rule.rule,
      version: rule.version,
      parsedRule: rule
    });
  } catch (error) {
    console.error('Error parsing rule:', error);
    res.status(400).json({ error: `Failed to parse rule: ${error}` });
  }
});

// Validate minimum wage for employee
router.post('/api/rules/validate/minimum-wage', isAuthenticated, async (req, res) => {
  try {
    const { employeeId, baseSalary } = req.body;
    
    if (!employeeId || baseSalary === undefined) {
      return res.status(400).json({ error: 'employeeId and baseSalary are required' });
    }

    const results = await rulesEngine.validateMinimumWage(employeeId, Number(baseSalary));
    
    res.json({
      employeeId,
      baseSalary: Number(baseSalary),
      validationResults: results,
      isValid: !results.some(r => r.blockFinalization),
      violations: results.filter(r => r.type === 'violation'),
      alerts: results.filter(r => r.type === 'alert')
    });
  } catch (error) {
    console.error('Error validating minimum wage:', error);
    res.status(500).json({ error: 'Failed to validate minimum wage' });
  }
});

// Validate overtime hours
router.post('/api/rules/validate/overtime', isAuthenticated, async (req, res) => {
  try {
    const { employeeId, overtimeHours, regularHours } = req.body;
    
    if (!employeeId || overtimeHours === undefined || regularHours === undefined) {
      return res.status(400).json({ 
        error: 'employeeId, overtimeHours, and regularHours are required' 
      });
    }

    const results = await rulesEngine.validateOvertime(
      employeeId, 
      Number(overtimeHours), 
      Number(regularHours)
    );
    
    res.json({
      employeeId,
      overtimeHours: Number(overtimeHours),
      regularHours: Number(regularHours),
      validationResults: results,
      calculations: results.filter(r => r.type === 'calculation'),
      alerts: results.filter(r => r.type === 'alert')
    });
  } catch (error) {
    console.error('Error validating overtime:', error);
    res.status(500).json({ error: 'Failed to validate overtime' });
  }
});

// Validate entire payroll run
router.post('/api/rules/validate/payroll-run', isAuthenticated, async (req, res) => {
  try {
    const { runId } = req.body;
    
    if (!runId) {
      return res.status(400).json({ error: 'runId is required' });
    }

    const results = await rulesEngine.validatePayrollRun(runId);
    
    const violations = results.filter(r => r.blockFinalization);
    const canFinalize = violations.length === 0;
    
    res.json({
      runId,
      canFinalize,
      validationResults: results,
      violations,
      alerts: results.filter(r => r.type === 'alert'),
      calculations: results.filter(r => r.type === 'calculation'),
      reviews: results.filter(r => r.type === 'review'),
      summary: {
        totalIssues: results.length,
        blockingViolations: violations.length,
        warnings: results.filter(r => r.type === 'alert').length,
        calculations: results.filter(r => r.type === 'calculation').length
      }
    });
  } catch (error) {
    console.error('Error validating payroll run:', error);
    res.status(500).json({ error: 'Failed to validate payroll run' });
  }
});

// Get rule evaluation history
router.get('/api/rules/history', isAuthenticated, async (req, res) => {
  try {
    const { employeeId, startDate, endDate, ruleCategory } = req.query;
    
    // This would query rule execution history from database
    // For now, return mock data structure
    res.json({
      history: [],
      filters: {
        employeeId: employeeId as string,
        startDate: startDate as string,
        endDate: endDate as string,
        ruleCategory: ruleCategory as string
      },
      message: "Rule execution history will be implemented with audit logging"
    });
  } catch (error) {
    console.error('Error fetching rule history:', error);
    res.status(500).json({ error: 'Failed to fetch rule history' });
  }
});

// Test rule against sample data
router.post('/api/rules/test', isAuthenticated, async (req, res) => {
  try {
    const { rule, testData } = req.body;
    
    if (!rule || !testData) {
      return res.status(400).json({ error: 'Rule definition and test data are required' });
    }

    // Validate rule
    const validation = PayrollRuleSchema.safeParse(rule);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid rule definition',
        details: validation.error.issues
      });
    }

    // Create temporary rules engine instance for testing
    const testEngine = new (await import('./rulesEngine')).PayrollRulesEngine();
    await testEngine.registerRule(validation.data);
    
    // Run test evaluation
    const results = await testEngine.evaluateRules(
      validation.data.category,
      testData,
      new Date()
    );
    
    res.json({
      rule: validation.data.rule,
      version: validation.data.version,
      testData,
      results,
      passed: results.length === 0 || !results.some(r => r.blockFinalization),
      summary: {
        conditionsMet: results.length > 0,
        actionsTriggered: results.length,
        violations: results.filter(r => r.type === 'violation').length,
        calculations: results.filter(r => r.type === 'calculation').length
      }
    });
  } catch (error) {
    console.error('Error testing rule:', error);
    res.status(500).json({ error: 'Failed to test rule' });
  }
});

// Export example rule templates
router.get('/api/rules/templates', isAuthenticated, async (req, res) => {
  try {
    const templates = {
      minimum_wage: `
rule: "CustomMinimumWage"
version: "2025.01"
description: "Custom minimum wage validation"
category: "minimum_wage"
applies_to: ["baseSalary"]
priority: 10
effective_from: "2025-01-01"
condition: "employee.contract.type in ['indefinite','fixed_term']"
threshold: 880.00
action_on_violation:
  - "block_finalize"
  - type: "alert"
    to: "payroll_admin"
    message: "Custom minimum wage violation detected"
`,
      overtime: `
rule: "CustomOvertime"
version: "2025.01"
description: "Custom overtime calculation"
category: "overtime"
applies_to: ["overtime_hours"]
priority: 20
effective_from: "2025-01-01"
condition: "overtime_hours > 0"
rate: 1.25
formula: "\${baseSalary} / 173.33 * \${overtime_hours} * 1.25"
action_on_violation:
  - type: "calculate"
`,
      allowances: `
rule: "CustomAllowance"
version: "2025.01"
description: "Custom allowance calculation"
category: "allowances"
applies_to: ["custom_allowance"]
priority: 30
effective_from: "2025-01-01"
condition: "employee.department = 'HOUSEKEEPING'"
rate: 50.00
formula: "\${rate}"
action_on_violation:
  - type: "auto_correct"
    message: "Applied department allowance"
`
    };

    res.json({
      templates,
      categories: [
        "minimum_wage",
        "overtime",
        "night_premium", 
        "sunday_premium",
        "holiday_premium",
        "allowances",
        "deductions",
        "tax_calculation",
        "insurance_calculation",
        "compliance_check"
      ],
      operators: [
        "eq", "neq", "gt", "gte", "lt", "lte", 
        "in", "not_in", "contains", "regex"
      ],
      actions: [
        "block_finalize", "alert", "auto_correct", 
        "flag_review", "calculate"
      ]
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

export { router as rulesAPIRouter };