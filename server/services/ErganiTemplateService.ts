import { z } from "zod";

/**
 * ERGANI II Event Templates and Validators bundled per CBA pack
 */

export interface ErganiEventTemplate {
  templateId: string;
  packId: string;
  sector: string;
  eventType: 'work_declaration' | 'overtime_declaration' | 'leave_declaration' | 'termination_declaration';
  template: {
    mandatory_fields: string[];
    optional_fields: string[];
    validation_rules: Record<string, any>;
    default_values: Record<string, any>;
    reason_codes: Record<string, string>;
  };
  validators: {
    field_validators: Record<string, z.ZodSchema>;
    business_rules: Array<{
      rule_name: string;
      condition: string;
      error_message: string;
    }>;
  };
}

// Tourism Hotels ERGANI Templates
const tourismHotelsTemplates: ErganiEventTemplate[] = [
  {
    templateId: "tourism-work-declaration",
    packId: "tourism-hotels",
    sector: "tourism",
    eventType: "work_declaration",
    template: {
      mandatory_fields: [
        "worker_id", "employer_vat", "work_date", "start_time", "end_time", 
        "work_type", "department_code", "job_category"
      ],
      optional_fields: [
        "overtime_hours", "premium_codes", "allowance_codes", "work_location_code",
        "shift_pattern", "equipment_codes"
      ],
      validation_rules: {
        work_date: { format: "YYYY-MM-DD", not_future: true },
        start_time: { format: "HH:MM", range: "00:00-23:59" },
        end_time: { format: "HH:MM", range: "00:00-23:59" },
        daily_hours_max: 10,
        weekly_hours_max: 48,
        rest_period_min: 11
      },
      default_values: {
        work_type: "REGULAR",
        department_code: "HOTEL_OPS",
        overtime_threshold: 8
      },
      reason_codes: {
        regular: "01_REGULAR_WORK",
        overtime: "02_OVERTIME_TOURISM",
        sunday: "03_SUNDAY_TOURISM",
        holiday: "04_HOLIDAY_TOURISM",
        night: "05_NIGHT_SHIFT_TOURISM",
        seasonal: "06_SEASONAL_TOURISM"
      }
    },
    validators: {
      field_validators: {
        worker_id: z.string().uuid(),
        employer_vat: z.string().regex(/^[0-9]{9}$/),
        work_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        daily_hours: z.number().min(0).max(16),
        job_category: z.enum(["FRONT_OFFICE", "HOUSEKEEPING", "FB_SERVICE", "FB_KITCHEN", "MAINTENANCE", "SPA"])
      },
      business_rules: [
        {
          rule_name: "daily_hours_limit",
          condition: "daily_hours <= 10 OR overtime_approved = true",
          error_message: "Daily hours exceed 10 without overtime approval"
        },
        {
          rule_name: "rest_period_check", 
          condition: "hours_since_last_shift >= 11",
          error_message: "Insufficient rest period between shifts (minimum 11 hours required)"
        },
        {
          rule_name: "sunday_premium_required",
          condition: "work_day = 'SUNDAY' IMPLIES premium_codes CONTAINS 'SUNDAY_75'",
          error_message: "Sunday work requires SUNDAY_75 premium code"
        },
        {
          rule_name: "night_premium_required",
          condition: "(start_time >= '22:00' OR end_time <= '06:00') IMPLIES premium_codes CONTAINS 'NIGHT_25'",
          error_message: "Night work (22:00-06:00) requires NIGHT_25 premium code"
        }
      ]
    }
  },
  {
    templateId: "tourism-overtime-declaration",
    packId: "tourism-hotels",
    sector: "tourism", 
    eventType: "overtime_declaration",
    template: {
      mandatory_fields: [
        "worker_id", "employer_vat", "work_date", "overtime_hours", 
        "overtime_reason", "supervisor_approval", "job_category"
      ],
      optional_fields: [
        "overtime_rate_override", "business_justification", "peak_season_flag"
      ],
      validation_rules: {
        overtime_hours_max: 3,
        weekly_overtime_max: 8,
        supervisor_approval: "required",
        advance_notice_hours: 24
      },
      default_values: {
        overtime_rate: 1.25,
        overtime_reason: "OPERATIONAL_NEED"
      },
      reason_codes: {
        operational: "OT_01_OPERATIONAL",
        seasonal: "OT_02_SEASONAL_PEAK",
        emergency: "OT_03_EMERGENCY",
        coverage: "OT_04_STAFF_COVERAGE"
      }
    },
    validators: {
      field_validators: {
        overtime_hours: z.number().min(0.5).max(6),
        supervisor_approval: z.string().uuid(),
        overtime_reason: z.enum(["OPERATIONAL_NEED", "SEASONAL_PEAK", "EMERGENCY", "STAFF_COVERAGE"])
      },
      business_rules: [
        {
          rule_name: "daily_overtime_limit",
          condition: "overtime_hours <= 3",
          error_message: "Daily overtime cannot exceed 3 hours"
        },
        {
          rule_name: "weekly_overtime_limit", 
          condition: "weekly_overtime_total <= 8",
          error_message: "Weekly overtime cannot exceed 8 hours"
        },
        {
          rule_name: "supervisor_approval_required",
          condition: "supervisor_approval IS NOT NULL",
          error_message: "Supervisor approval required for all overtime"
        }
      ]
    }
  }
];

// F&B Restaurants ERGANI Templates  
const fnbRestaurantsTemplates: ErganiEventTemplate[] = [
  {
    templateId: "fnb-work-declaration",
    packId: "fnb-restaurants",
    sector: "fnb",
    eventType: "work_declaration",
    template: {
      mandatory_fields: [
        "worker_id", "employer_vat", "work_date", "start_time", "end_time",
        "work_type", "service_area", "tip_eligible"
      ],
      optional_fields: [
        "tips_declared", "tip_pool_share", "split_shift_flag", "banquet_event_code"
      ],
      validation_rules: {
        split_shift_gap_min: 3, // Minimum 3 hours between split shifts
        tip_declaration_required: true,
        service_charge_rate: 0.1
      },
      default_values: {
        service_area: "MAIN_DINING",
        tip_eligible: true
      },
      reason_codes: {
        regular: "01_REGULAR_SERVICE",
        banquet: "02_BANQUET_EVENT", 
        catering: "03_CATERING_SERVICE",
        preparation: "04_PREP_KITCHEN"
      }
    },
    validators: {
      field_validators: {
        service_area: z.enum(["MAIN_DINING", "BAR", "KITCHEN", "PREP", "BANQUET", "DELIVERY"]),
        tip_eligible: z.boolean(),
        tips_declared: z.number().min(0).optional()
      },
      business_rules: [
        {
          rule_name: "tip_declaration_service_staff",
          condition: "service_area IN ['MAIN_DINING', 'BAR'] IMPLIES tips_declared IS NOT NULL",
          error_message: "Service staff must declare tips"
        },
        {
          rule_name: "split_shift_gap",
          condition: "split_shift_flag = true IMPLIES shift_gap >= 3",
          error_message: "Split shifts must have minimum 3-hour gap"
        }
      ]
    }
  }
];

export class ErganiTemplateService {
  private static templates: Map<string, ErganiEventTemplate[]> = new Map([
    ["tourism-hotels", tourismHotelsTemplates],
    ["fnb-restaurants", fnbRestaurantsTemplates]
  ]);

  /**
   * Get ERGANI templates for a specific CBA pack
   */
  static getTemplatesForPack(packId: string): ErganiEventTemplate[] {
    return this.templates.get(packId) || [];
  }

  /**
   * Get specific template by pack and event type
   */
  static getTemplate(packId: string, eventType: string): ErganiEventTemplate | null {
    const packTemplates = this.getTemplatesForPack(packId);
    return packTemplates.find(t => t.eventType === eventType) || null;
  }

  /**
   * Validate ERGANI payload against pack template
   */
  static async validatePayload(packId: string, eventType: string, payload: any): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const template = this.getTemplate(packId, eventType);
    if (!template) {
      return {
        valid: false,
        errors: [`No template found for pack ${packId} and event type ${eventType}`],
        warnings: []
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check mandatory fields
    for (const field of template.template.mandatory_fields) {
      if (!payload[field]) {
        errors.push(`Missing mandatory field: ${field}`);
      }
    }

    // Validate field formats using Zod validators
    for (const [field, validator] of Object.entries(template.validators.field_validators)) {
      if (payload[field] !== undefined) {
        try {
          validator.parse(payload[field]);
        } catch (e: any) {
          errors.push(`Invalid ${field}: ${e.message}`);
        }
      }
    }

    // Check business rules
    for (const rule of template.validators.business_rules) {
      const ruleResult = this.evaluateBusinessRule(rule, payload);
      if (!ruleResult.valid) {
        if (ruleResult.severity === 'error') {
          errors.push(ruleResult.message);
        } else {
          warnings.push(ruleResult.message);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Generate ERGANI payload from template with defaults
   */
  static generatePayloadFromTemplate(
    packId: string,
    eventType: string,
    inputData: Record<string, any>
  ): Record<string, any> {
    const template = this.getTemplate(packId, eventType);
    if (!template) {
      throw new Error(`No template found for pack ${packId} and event type ${eventType}`);
    }

    // Start with template defaults
    const payload = { ...template.template.default_values };

    // Overlay input data
    Object.assign(payload, inputData);

    // Apply sector-specific transformations
    if (packId === "tourism-hotels") {
      payload.sector_code = "55"; // Tourism accommodation
      payload.collective_agreement_ref = "TOURISM_HOTELS_2024";
    } else if (packId === "fnb-restaurants") {
      payload.sector_code = "56"; // Food and beverage services
      payload.collective_agreement_ref = "FNB_RESTAURANTS_2024";
    }

    return payload;
  }

  /**
   * Evaluate business rule against payload data
   */
  private static evaluateBusinessRule(
    rule: { rule_name: string; condition: string; error_message: string },
    payload: any
  ): { valid: boolean; severity: 'error' | 'warning'; message: string } {
    
    // Simple rule evaluation (in production, use a proper rules engine)
    try {
      switch (rule.rule_name) {
        case "daily_hours_limit":
          const dailyHours = payload.daily_hours || 0;
          const overtimeApproved = payload.overtime_approved || false;
          return {
            valid: dailyHours <= 10 || overtimeApproved,
            severity: 'error',
            message: rule.error_message
          };

        case "rest_period_check":
          const hoursSinceLastShift = payload.hours_since_last_shift || 24;
          return {
            valid: hoursSinceLastShift >= 11,
            severity: 'error', 
            message: rule.error_message
          };

        case "tip_declaration_service_staff":
          const serviceArea = payload.service_area;
          const tipsService = ["MAIN_DINING", "BAR"].includes(serviceArea);
          const tipsDeclared = payload.tips_declared !== undefined;
          return {
            valid: !tipsService || tipsDeclared,
            severity: 'warning',
            message: rule.error_message
          };

        default:
          return { valid: true, severity: 'warning', message: '' };
      }
    } catch (error) {
      return {
        valid: false,
        severity: 'error',
        message: `Rule evaluation error: ${error}`
      };
    }
  }

  /**
   * Get available reason codes for pack and event type
   */
  static getReasonCodes(packId: string, eventType: string): Record<string, string> {
    const template = this.getTemplate(packId, eventType);
    return template?.template.reason_codes || {};
  }

  /**
   * Get validation summary for pack
   */
  static getPackValidationSummary(packId: string): {
    templates: number;
    mandatory_fields: string[];
    business_rules: number;
    reason_codes: number;
  } {
    const templates = this.getTemplatesForPack(packId);
    
    const allMandatoryFields = new Set<string>();
    let totalBusinessRules = 0;
    let totalReasonCodes = 0;

    for (const template of templates) {
      template.template.mandatory_fields.forEach(field => allMandatoryFields.add(field));
      totalBusinessRules += template.validators.business_rules.length;
      totalReasonCodes += Object.keys(template.template.reason_codes).length;
    }

    return {
      templates: templates.length,
      mandatory_fields: Array.from(allMandatoryFields),
      business_rules: totalBusinessRules,
      reason_codes: totalReasonCodes
    };
  }
}