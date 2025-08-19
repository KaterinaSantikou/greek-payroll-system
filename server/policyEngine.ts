/**
 * Policy Engine Architecture
 * Country/CBA rules (breaks, rest periods, premiums) + per-property overrides
 */

// Core policy definition structure
export interface PolicyRule {
  ruleId: string;
  name: string;
  description: string;
  category: 'labor_law' | 'cba' | 'company' | 'property' | 'department';
  
  // Applicability
  applicableTo: {
    country: string[];
    regions?: string[];
    industries?: string[];
    propertyTypes?: string[];
    contractTypes?: string[];
    employeeCategories?: string[];
  };
  
  // Rule definition
  rule: {
    type: 'max_hours' | 'min_break' | 'rest_period' | 'overtime_threshold' | 'premium_rate' | 'schedule_constraint';
    condition: PolicyCondition;
    enforcement: 'mandatory' | 'recommended' | 'optional';
    violation: {
      severity: 'info' | 'warning' | 'error' | 'critical';
      action: 'log' | 'warn' | 'block' | 'escalate';
      message: string;
    };
  };
  
  // Temporal validity
  effectiveFrom: string;
  effectiveTo?: string;
  
  // Override hierarchy
  priority: number;
  overrides?: string[]; // Rule IDs this rule overrides
  canBeOverridden: boolean;
  
  // Compliance references
  legalReferences: {
    law: string;
    article?: string;
    url?: string;
    description: string;
  }[];
  
  // Implementation
  implementation: {
    formula?: string;
    parameters: Record<string, any>;
    exceptions: PolicyException[];
  };
}

export interface PolicyCondition {
  expression: string; // JSON Logic or similar expression
  parameters: Record<string, any>;
  contextRequired: string[]; // Required context variables
}

export interface PolicyException {
  name: string;
  condition: PolicyCondition;
  override: {
    newValue?: any;
    multiplier?: number;
    exemption?: boolean;
  };
}

// Greek labor law policies
export class GreekLaborLawPolicies {
  
  static getPolicies(): PolicyRule[] {
    return [
      // Daily working hours limit
      {
        ruleId: 'GR_MAX_DAILY_HOURS',
        name: 'Maximum Daily Working Hours',
        description: 'Greek labor law maximum 8 hours per day without overtime',
        category: 'labor_law',
        applicableTo: {
          country: ['GR'],
          contractTypes: ['full_time', 'part_time']
        },
        rule: {
          type: 'max_hours',
          condition: {
            expression: 'daily_hours <= max_regular_hours',
            parameters: { max_regular_hours: 8 },
            contextRequired: ['daily_hours', 'overtime_approved']
          },
          enforcement: 'mandatory',
          violation: {
            severity: 'error',
            action: 'block',
            message: 'Daily hours exceed 8 without overtime approval'
          }
        },
        effectiveFrom: '2019-07-01T00:00:00Z',
        priority: 1,
        canBeOverridden: false,
        legalReferences: [
          {
            law: 'Ν. 4808/2021',
            article: 'Άρθρο 10',
            description: 'Διάρκεια εργασίας'
          }
        ],
        implementation: {
          parameters: {
            maxRegularHours: 8,
            overtimeThreshold: 8,
            maxDailyHours: 10
          },
          exceptions: [
            {
              name: 'Emergency Work',
              condition: {
                expression: 'emergency_declared == true',
                parameters: {},
                contextRequired: ['emergency_declared']
              },
              override: {
                newValue: 12
              }
            }
          ]
        }
      },

      // Weekly working hours limit
      {
        ruleId: 'GR_MAX_WEEKLY_HOURS',
        name: 'Maximum Weekly Working Hours',
        description: 'Greek labor law maximum 40 hours per week',
        category: 'labor_law',
        applicableTo: {
          country: ['GR'],
          contractTypes: ['full_time']
        },
        rule: {
          type: 'max_hours',
          condition: {
            expression: 'weekly_hours <= max_weekly_hours',
            parameters: { max_weekly_hours: 40 },
            contextRequired: ['weekly_hours']
          },
          enforcement: 'mandatory',
          violation: {
            severity: 'warning',
            action: 'warn',
            message: 'Weekly hours exceed 40, overtime rates apply'
          }
        },
        effectiveFrom: '2019-07-01T00:00:00Z',
        priority: 2,
        canBeOverridden: false,
        legalReferences: [
          {
            law: 'Ν. 4808/2021',
            article: 'Άρθρο 10',
            description: 'Εβδομαδιαία διάρκεια εργασίας'
          }
        ],
        implementation: {
          parameters: {
            maxWeeklyHours: 40,
            overtimeWeeklyThreshold: 40
          },
          exceptions: []
        }
      },

      // Mandatory break periods
      {
        ruleId: 'GR_MANDATORY_BREAKS',
        name: 'Mandatory Break Periods',
        description: 'Required break after 6 hours of continuous work',
        category: 'labor_law',
        applicableTo: {
          country: ['GR']
        },
        rule: {
          type: 'min_break',
          condition: {
            expression: 'continuous_hours <= 6 OR break_taken == true',
            parameters: { max_continuous_hours: 6, min_break_duration: 15 },
            contextRequired: ['continuous_hours', 'break_taken', 'last_break_time']
          },
          enforcement: 'mandatory',
          violation: {
            severity: 'error',
            action: 'escalate',
            message: 'Mandatory break required after 6 hours of continuous work'
          }
        },
        effectiveFrom: '2019-07-01T00:00:00Z',
        priority: 1,
        canBeOverridden: false,
        legalReferences: [
          {
            law: 'Ν. 4808/2021',
            article: 'Άρθρο 12',
            description: 'Διαλείμματα εργασίας'
          }
        ],
        implementation: {
          parameters: {
            maxContinuousHours: 6,
            minBreakDuration: 15,
            mandatoryBreakAfter: 6
          },
          exceptions: []
        }
      },

      // Sunday work premium
      {
        ruleId: 'GR_SUNDAY_PREMIUM',
        name: 'Sunday Work Premium',
        description: 'Sunday work requires 75% premium in hospitality',
        category: 'labor_law',
        applicableTo: {
          country: ['GR'],
          industries: ['hospitality', 'tourism']
        },
        rule: {
          type: 'premium_rate',
          condition: {
            expression: 'day_of_week == "Sunday"',
            parameters: { premium_rate: 1.75 },
            contextRequired: ['day_of_week', 'industry']
          },
          enforcement: 'mandatory',
          violation: {
            severity: 'error',
            action: 'block',
            message: 'Sunday work must be paid at 75% premium rate'
          }
        },
        effectiveFrom: '2019-07-01T00:00:00Z',
        priority: 1,
        canBeOverridden: false,
        legalReferences: [
          {
            law: 'Ν. 4808/2021',
            article: 'Άρθρο 15',
            description: 'Κυριακάτικη εργασία'
          }
        ],
        implementation: {
          parameters: {
            sundayPremiumRate: 1.75,
            applicableIndustries: ['hospitality', 'tourism']
          },
          exceptions: []
        }
      },

      // Night shift premium
      {
        ruleId: 'GR_NIGHT_PREMIUM',
        name: 'Night Shift Premium',
        description: 'Night work (22:00-06:00) requires 25% premium',
        category: 'labor_law',
        applicableTo: {
          country: ['GR']
        },
        rule: {
          type: 'premium_rate',
          condition: {
            expression: 'night_hours > 0',
            parameters: { premium_rate: 1.25, night_start: '22:00', night_end: '06:00' },
            contextRequired: ['work_start_time', 'work_end_time']
          },
          enforcement: 'mandatory',
          violation: {
            severity: 'warning',
            action: 'warn',
            message: 'Night work must be paid at 25% premium rate'
          }
        },
        effectiveFrom: '2019-07-01T00:00:00Z',
        priority: 2,
        canBeOverridden: false,
        legalReferences: [
          {
            law: 'Ν. 4808/2021',
            article: 'Άρθρο 16',
            description: 'Νυχτερινή εργασία'
          }
        ],
        implementation: {
          parameters: {
            nightPremiumRate: 1.25,
            nightStartTime: '22:00',
            nightEndTime: '06:00'
          },
          exceptions: []
        }
      }
    ];
  }
}

// Hotel industry CBA policies
export class HotelCBAPolicies {
  
  static getPolicies(): PolicyRule[] {
    return [
      // Hotel-specific break rules
      {
        ruleId: 'HOTEL_MEAL_BREAK',
        name: 'Hotel Meal Break Requirements',
        description: 'Hotel workers entitled to 30-minute meal break after 5 hours',
        category: 'cba',
        applicableTo: {
          country: ['GR'],
          industries: ['hospitality'],
          propertyTypes: ['hotel', 'resort']
        },
        rule: {
          type: 'min_break',
          condition: {
            expression: 'continuous_hours <= 5 OR meal_break_taken == true',
            parameters: { max_continuous_hours: 5, min_meal_break: 30 },
            contextRequired: ['continuous_hours', 'meal_break_taken']
          },
          enforcement: 'mandatory',
          violation: {
            severity: 'warning',
            action: 'warn',
            message: 'Meal break required after 5 hours for hotel workers'
          }
        },
        effectiveFrom: '2023-01-01T00:00:00Z',
        priority: 3,
        canBeOverridden: true,
        legalReferences: [
          {
            law: 'Hotel Workers CBA 2023',
            description: 'Συλλογική σύμβαση εργαζομένων ξενοδοχείων'
          }
        ],
        implementation: {
          parameters: {
            maxContinuousHours: 5,
            minMealBreakDuration: 30,
            paidBreak: false
          },
          exceptions: [
            {
              name: 'Peak Season Exception',
              condition: {
                expression: 'peak_season == true AND manager_approval == true',
                parameters: {},
                contextRequired: ['peak_season', 'manager_approval']
              },
              override: {
                newValue: 6
              }
            }
          ]
        }
      },

      // Seasonal overtime rules
      {
        ruleId: 'HOTEL_SEASONAL_OVERTIME',
        name: 'Hotel Seasonal Overtime Rules',
        description: 'Enhanced overtime rates during peak season',
        category: 'cba',
        applicableTo: {
          country: ['GR'],
          industries: ['hospitality'],
          propertyTypes: ['hotel', 'resort']
        },
        rule: {
          type: 'overtime_threshold',
          condition: {
            expression: 'peak_season == true',
            parameters: { enhanced_overtime_rate: 2.0 },
            contextRequired: ['peak_season', 'overtime_hours']
          },
          enforcement: 'recommended',
          violation: {
            severity: 'info',
            action: 'log',
            message: 'Peak season enhanced overtime rates applicable'
          }
        },
        effectiveFrom: '2023-01-01T00:00:00Z',
        priority: 4,
        canBeOverridden: true,
        legalReferences: [
          {
            law: 'Hotel Workers CBA 2023',
            article: 'Section 4.2',
            description: 'Seasonal work provisions'
          }
        ],
        implementation: {
          parameters: {
            peakSeasonMultiplier: 2.0,
            peakSeasonMonths: ['June', 'July', 'August', 'September']
          },
          exceptions: []
        }
      }
    ];
  }
}

// Policy engine implementation
export class PolicyEngine {
  private static policies: Map<string, PolicyRule> = new Map();
  private static propertyOverrides: Map<string, PropertyPolicyOverride[]> = new Map();

  // Initialize policy engine with all rule sets
  static async initialize(): Promise<void> {
    const allPolicies = [
      ...GreekLaborLawPolicies.getPolicies(),
      ...HotelCBAPolicies.getPolicies()
    ];

    // Load policies into engine
    for (const policy of allPolicies) {
      this.policies.set(policy.ruleId, policy);
    }

    // Load property-specific overrides
    await this.loadPropertyOverrides();

    console.log(`Policy Engine initialized with ${this.policies.size} policies`);
  }

  // Evaluate policies against context
  static async evaluatePolicies(
    context: PolicyEvaluationContext
  ): Promise<PolicyEvaluationResult> {
    const violations: PolicyViolation[] = [];
    const warnings: PolicyWarning[] = [];
    const applicablePolicies = this.getApplicablePolicies(context);

    for (const policy of applicablePolicies) {
      try {
        const result = await this.evaluatePolicy(policy, context);
        
        if (!result.compliant) {
          if (policy.rule.violation.severity === 'error' || policy.rule.violation.severity === 'critical') {
            violations.push({
              ruleId: policy.ruleId,
              message: policy.rule.violation.message,
              severity: policy.rule.violation.severity,
              action: policy.rule.violation.action,
              context: result.context
            });
          } else {
            warnings.push({
              ruleId: policy.ruleId,
              message: policy.rule.violation.message,
              severity: policy.rule.violation.severity,
              context: result.context
            });
          }
        }
      } catch (error) {
        console.error(`Policy evaluation failed for ${policy.ruleId}:`, error);
      }
    }

    return {
      compliant: violations.length === 0,
      violations,
      warnings,
      evaluatedPolicies: applicablePolicies.length,
      timestamp: new Date().toISOString()
    };
  }

  // Get applicable policies based on context
  private static getApplicablePolicies(context: PolicyEvaluationContext): PolicyRule[] {
    const applicable: PolicyRule[] = [];

    for (const policy of this.policies.values()) {
      if (this.isPolicyApplicable(policy, context)) {
        // Check for property overrides
        const override = this.getPropertyOverride(context.propertyId, policy.ruleId);
        if (override) {
          applicable.push(this.applyPropertyOverride(policy, override));
        } else {
          applicable.push(policy);
        }
      }
    }

    // Sort by priority (lower number = higher priority)
    return applicable.sort((a, b) => a.priority - b.priority);
  }

  // Check if policy is applicable to context
  private static isPolicyApplicable(policy: PolicyRule, context: PolicyEvaluationContext): boolean {
    const { applicableTo } = policy;

    // Check country
    if (applicableTo.country && !applicableTo.country.includes(context.country)) {
      return false;
    }

    // Check industry
    if (applicableTo.industries && !applicableTo.industries.includes(context.industry)) {
      return false;
    }

    // Check property type
    if (applicableTo.propertyTypes && !applicableTo.propertyTypes.includes(context.propertyType)) {
      return false;
    }

    // Check contract type
    if (applicableTo.contractTypes && !applicableTo.contractTypes.includes(context.contractType)) {
      return false;
    }

    // Check effective dates
    const now = new Date();
    const effectiveFrom = new Date(policy.effectiveFrom);
    if (now < effectiveFrom) {
      return false;
    }

    if (policy.effectiveTo) {
      const effectiveTo = new Date(policy.effectiveTo);
      if (now > effectiveTo) {
        return false;
      }
    }

    return true;
  }

  // Evaluate individual policy
  private static async evaluatePolicy(
    policy: PolicyRule,
    context: PolicyEvaluationContext
  ): Promise<PolicyEvaluationDetailResult> {
    
    // Build evaluation context with policy parameters
    const evalContext = {
      ...context.data,
      ...policy.implementation.parameters
    };

    // Check if all required context is available
    for (const required of policy.rule.condition.contextRequired) {
      if (!(required in evalContext)) {
        throw new Error(`Required context variable '${required}' not provided`);
      }
    }

    // Evaluate condition using expression engine
    const conditionResult = await this.evaluateExpression(
      policy.rule.condition.expression,
      evalContext
    );

    // Check for exceptions
    for (const exception of policy.implementation.exceptions) {
      const exceptionResult = await this.evaluateExpression(
        exception.condition.expression,
        evalContext
      );

      if (exceptionResult) {
        // Apply exception override
        return {
          compliant: true,
          context: {
            appliedException: exception.name,
            originalResult: conditionResult
          }
        };
      }
    }

    return {
      compliant: conditionResult,
      context: {
        evaluationData: evalContext,
        expression: policy.rule.condition.expression
      }
    };
  }

  // Simple expression evaluator (in production, use a proper expression engine)
  private static async evaluateExpression(expression: string, context: any): Promise<boolean> {
    try {
      // This is a simplified evaluator - in production use JSONLogic or similar
      const sanitizedExpression = expression
        .replace(/(\w+)/g, (match) => {
          if (match in context) {
            const value = context[match];
            return typeof value === 'string' ? `"${value}"` : String(value);
          }
          return match;
        });

      // Very basic evaluation - replace with proper expression engine
      return eval(sanitizedExpression.replace(/==/g, '===').replace(/AND/g, '&&').replace(/OR/g, '||'));
    } catch (error) {
      console.error('Expression evaluation failed:', error);
      return false;
    }
  }

  // Property override management
  private static async loadPropertyOverrides(): Promise<void> {
    // Load property-specific policy overrides from database
    // This would typically fetch from a configuration table
  }

  private static getPropertyOverride(propertyId: string, ruleId: string): PropertyPolicyOverride | null {
    const overrides = this.propertyOverrides.get(propertyId) || [];
    return overrides.find(override => override.ruleId === ruleId) || null;
  }

  private static applyPropertyOverride(policy: PolicyRule, override: PropertyPolicyOverride): PolicyRule {
    const overriddenPolicy = { ...policy };
    
    if (override.parameters) {
      overriddenPolicy.implementation.parameters = {
        ...policy.implementation.parameters,
        ...override.parameters
      };
    }

    if (override.enforcement) {
      overriddenPolicy.rule.enforcement = override.enforcement;
    }

    return overriddenPolicy;
  }
}

// Supporting interfaces
export interface PolicyEvaluationContext {
  propertyId: string;
  employeeId: string;
  country: string;
  industry: string;
  propertyType: string;
  contractType: string;
  department: string;
  data: Record<string, any>; // Context data for evaluation
}

export interface PolicyEvaluationResult {
  compliant: boolean;
  violations: PolicyViolation[];
  warnings: PolicyWarning[];
  evaluatedPolicies: number;
  timestamp: string;
}

export interface PolicyEvaluationDetailResult {
  compliant: boolean;
  context: Record<string, any>;
}

export interface PolicyViolation {
  ruleId: string;
  message: string;
  severity: 'error' | 'critical';
  action: 'log' | 'warn' | 'block' | 'escalate';
  context: Record<string, any>;
}

export interface PolicyWarning {
  ruleId: string;
  message: string;
  severity: 'info' | 'warning';
  context: Record<string, any>;
}

export interface PropertyPolicyOverride {
  propertyId: string;
  ruleId: string;
  parameters?: Record<string, any>;
  enforcement?: 'mandatory' | 'recommended' | 'optional';
  reason: string;
  approvedBy: string;
  effectiveFrom: string;
  effectiveTo?: string;
}