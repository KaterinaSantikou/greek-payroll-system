import type { SectorPackDefinition } from './CbaPackService';

/**
 * Predefined Sector Pack Definitions for Greek Industries
 * 
 * These are ready-to-install CBA packs with industry-specific rules
 * for Tourism (Hotels) and Food & Beverage (Restaurants/Bars)
 */

/**
 * Greek Tourism (Hotels) CBA Pack
 * Based on Greek Hotel Workers' Collective Agreement
 * 
 * Features:
 * - Seasonal employment patterns
 * - Accommodation and meal allowances
 * - Split shift support
 * - Tourism-specific ERGANI profiles
 */
export const TOURISM_HOTELS_PACK: SectorPackDefinition = {
  pack: {
    name: "Greek Tourism - Hotels CBA Pack",
    sector: "tourism_hotels",
    authorityRef: "Greek Hotel Workers Federation Agreement 2025-2027",
    effectiveFrom: new Date('2025-05-01'),
    effectiveTo: new Date('2027-04-30'),
    version: "2025.08.1",
    docHash: "sha256:tourism_hotels_2025_08_1",
    status: "published"
  },
  
  wageTables: [
    // Front Office Staff
    {
      category: "Front Office",
      grade: "B",
      seniorityStep: 0,
      baseMonthly: "980.00",
      unit: "monthly",
      notes: "Senior front office staff - updated 2025.08.1"
    },
    
    // Housekeeping
    {
      category: "Housekeeping",
      grade: "C",
      seniorityStep: 0,
      baseMonthly: "920.00",
      unit: "monthly",
      notes: "Senior housekeeping staff - updated 2025.08.1"
    }
  ],

  premiumRules: [
    {
      code: "NIGHT_25",
      name: "Night Shift Premium",
      rateType: "percent",
      value: "25.0000",
      bands: {
        "start": "22:00",
        "end": "06:00"
      },
      stackable: true,
      appliesTo: "hours_worked",
      priority: 10
    },
    {
      code: "SUNDAY_75",
      name: "Sunday Work Premium",
      rateType: "percent",
      value: "75.0000",
      bands: null,
      stackable: true,
      appliesTo: "hours_worked",
      priority: 20
    },
    {
      code: "HOLIDAY_75",
      name: "Holiday Work Premium",
      rateType: "percent",
      value: "75.0000",
      bands: null,
      stackable: true,
      appliesTo: "holidays",
      priority: 30
    },
    {
      code: "SIXTH_DAY_40",
      name: "Sixth Day Premium",
      rateType: "percent",
      value: "40.0000",
      bands: {
        "enabled": false,
        "note": "tourism default: disabled unless entity override"
      },
      stackable: true,
      appliesTo: "hours_worked",
      priority: 15
    }
  ],

  allowanceRules: [
    {
      code: "MEAL_ALLOW",
      name: "Meal Allowance",
      calc: "per_day",
      amount: "6.00",
      taxTreatment: "split",
      contributory: "no",
      conditions: {
        "note": "up to 6€/day exempt; engine splits overage"
      }
    },
    {
      code: "ACCOM_ALLOW",
      name: "Accommodation Allowance",
      calc: "per_day",
      amount: "10.00",
      taxTreatment: "taxable",
      contributory: "yes",
      conditions: {}
    },
    {
      code: "UNIFORM_ALLOW",
      name: "Uniform Allowance",
      calc: "fixed_monthly",
      amount: "20.00",
      taxTreatment: "taxable",
      contributory: "yes",
      conditions: {}
    }
  ],

  schedulingConstraints: [
    {
      maxHoursDay: 10,
      maxHoursWeekAvg: 48,
      restMinHours: 11,
      weeklyRest: 24,
      splitShift: "allowed",
      breakMinMinutes: 15,
      sixthDay: "sector_exemption",
      specialRules: {
        "ref_period": "4_month",
        "lawful_overtime": true,
        "default_off": "per_entity_switch_only_if_legally_eligible"
      }
    }
  ],

  erganiProfiles: [
    {
      eventMap: {
        "schedule": {
          "mode": "pre_announce"
        },
        "overtime": {
          "event": "required"
        }
      },
      requiredLeadTimes: {
        "schedule_change": "before_shift_start",
        "overtime": "same_day_before_start"
      },
      reasonCodes: {},
      documentTemplates: {},
      autoSubmission: true,
      validationRules: {}
    }
  ],

  tipPolicies: [
    {
      pool_source: "pos_revenue_percent",
      source_percentage: "5.00",
      distribution_method: "points",
      role_points: {
        "Waiter": 2.0,
        "Bartender": 2.0,
        "Host": 1.0,
        "Runner": 1.0
      },
      employer_topup: "0.00",
      tax_mapping: {},
      contrib_mapping: {},
      payout_frequency: "weekly"
    }
  ]
};

/**
 * Greek Food & Beverage (Restaurants/Bars) CBA Pack
 * Based on Greek Restaurant & Bar Workers' Collective Agreement
 * 
 * Features:
 * - Tip pooling and distribution
 * - Sunday/holiday premiums for hospitality
 * - Late night service allowances
 * - F&B specific ERGANI requirements
 */
export const FNB_RESTAURANTS_PACK: SectorPackDefinition = {
  pack: {
    name: "Greek Food & Beverage - Restaurants/Bars CBA Pack",
    sector: "fnb_restaurants",
    authorityRef: "Greek Restaurant Workers Union Agreement 2024-2025",
    effectiveFrom: new Date('2024-01-01'),
    effectiveTo: new Date('2025-12-31'),
    version: "2024.2",
    docHash: "sha256:fnb_restaurants_2024_2",
    status: "published"
  },
  
  wageTables: [
    // Service Staff
    {
      category: "service",
      grade: "A", // Entry level server
      seniorityStep: 0,
      baseMonthly: "770.00",
      unit: "monthly",
      notes: "Server, busser"
    },
    {
      category: "service",
      grade: "B", // Experienced server
      seniorityStep: 2,
      baseMonthly: "850.00",
      unit: "monthly",
      notes: "Senior server, wine server"
    },
    {
      category: "service",
      grade: "C", // Head server/manager
      seniorityStep: 4,
      baseMonthly: "1100.00",
      unit: "monthly",
      notes: "Head server, floor manager"
    },
    
    // Bar Staff
    {
      category: "bar",
      grade: "A",
      seniorityStep: 0,
      baseMonthly: "780.00",
      unit: "monthly",
      notes: "Barback, bar helper"
    },
    {
      category: "bar",
      grade: "B",
      seniorityStep: 1,
      baseMonthly: "920.00",
      unit: "monthly",
      notes: "Bartender"
    },
    {
      category: "bar",
      grade: "C",
      seniorityStep: 3,
      baseMonthly: "1150.00",
      unit: "monthly",
      notes: "Head bartender, bar manager"
    },
    
    // Kitchen Staff
    {
      category: "kitchen",
      grade: "A",
      seniorityStep: 0,
      baseMonthly: "760.00",
      unit: "monthly",
      notes: "Prep cook, dishwasher"
    },
    {
      category: "kitchen",
      grade: "B",
      seniorityStep: 2,
      baseMonthly: "950.00",
      unit: "monthly",
      notes: "Line cook, grill cook"
    },
    {
      category: "kitchen",
      grade: "C",
      seniorityStep: 5,
      baseMonthly: "1250.00",
      unit: "monthly",
      notes: "Chef, kitchen manager"
    }
  ],

  premiumRules: [
    {
      code: "NIGHT_30",
      name: "Late Night Premium (Bars)",
      rateType: "percent",
      value: "30.0000",
      bands: {
        "start": "23:00",
        "end": "05:00"
      },
      stackable: true,
      appliesTo: "hours_worked",
      priority: 10
    },
    {
      code: "WEEKEND_50",
      name: "Weekend Premium",
      rateType: "percent",
      value: "50.0000",
      bands: {
        "days": ["saturday", "sunday"]
      },
      stackable: true,
      appliesTo: "hours_worked",
      priority: 15
    },
    {
      code: "HOLIDAY_100",
      name: "Public Holiday Premium",
      rateType: "percent",
      value: "100.0000",
      bands: null,
      stackable: false,
      appliesTo: "holidays",
      priority: 30
    },
    {
      code: "SPECIAL_EVENT",
      name: "Special Event Premium",
      rateType: "percent",
      value: "25.0000",
      bands: null,
      stackable: true,
      appliesTo: "hours_worked",
      priority: 20
    }
  ],

  allowanceRules: [
    {
      code: "MEAL_ALLOW",
      name: "Staff Meal Allowance",
      calc: "per_shift",
      amount: "7.00",
      taxTreatment: "exempt",
      contributory: "no",
      conditions: {
        "shift_length_hours": ">= 6",
        "meal_provided": false
      }
    },
    {
      code: "UNIFORM_MAINT",
      name: "Uniform & Appearance",
      calc: "fixed_monthly",
      amount: "30.00",
      taxTreatment: "exempt",
      contributory: "no",
      conditions: {
        "dress_code_required": true
      }
    },
    {
      code: "TRANSPORT_LATE",
      name: "Late Night Transportation",
      calc: "per_shift",
      amount: "12.00",
      taxTreatment: "exempt",
      contributory: "no",
      conditions: {
        "end_time": ">= 01:00",
        "public_transport_unavailable": true
      }
    }
  ],

  schedulingConstraints: [
    {
      maxHoursDay: 10,
      maxHoursWeekAvg: 44,
      restMinHours: 11,
      weeklyRest: 24,
      splitShift: "allowed",
      breakMinMinutes: 15,
      sixthDay: "allowed",
      specialRules: {
        "split_shift_premium": "10_percent",
        "consecutive_late_shifts": "max_3",
        "weekend_rotation": "mandatory",
        "break_during_rush": "flexible"
      }
    }
  ],

  erganiProfiles: [
    {
      eventMap: {
        "hire": {
          "advance_notice_hours": 24,
          "required_docs": ["contract", "id", "health_certificate", "food_safety_cert"]
        },
        "schedule": {
          "advance_notice_hours": 72,
          "weekend_schedule_locked": true
        },
        "overtime": {
          "auto_report": true,
          "threshold_daily": 8,
          "split_shift_tracking": true
        }
      },
      requiredLeadTimes: {
        "schedule_change": "72_hours",
        "additional_shift": "24_hours"
      },
      reasonCodes: {
        "special_event": "501",
        "high_volume": "502",
        "staff_shortage": "503"
      },
      documentTemplates: {
        "fnb_contract": "restaurant_contract_template_2024",
        "health_certificate": "food_handler_cert_template"
      },
      autoSubmission: true,
      validationRules: {
        "food_safety_cert": "mandatory",
        "alcohol_service_license": "if_bar_staff",
        "health_certificate_6month": true
      }
    }
  ],

  tipPolicies: [
    {
      pool_source: "pos_revenue_pct",
      source_percentage: "10.00", // 10% of POS revenue goes to tip pool
      distribution_method: "points",
      role_points: {
        "service_A": 1.0,
        "service_B": 1.5,
        "service_C": 2.0,
        "bar_A": 1.2,
        "bar_B": 1.8,
        "bar_C": 2.2,
        "kitchen_A": 0.8,
        "kitchen_B": 1.0,
        "kitchen_C": 1.3
      },
      employer_topup: "5.00", // Employer adds 5% on top
      tax_mapping: {
        "tip_portion": "taxable",
        "service_charge": "subject_to_full_tax"
      },
      contrib_mapping: {
        "tip_portion": "no_contributions",
        "service_charge": "full_contributions"
      },
      payout_frequency: "weekly"
    }
  ]
};

/**
 * Get all available sector pack definitions
 */
export function getAllSectorPackDefinitions(): SectorPackDefinition[] {
  return [
    TOURISM_HOTELS_PACK,
    FNB_RESTAURANTS_PACK
  ];
}

/**
 * Get sector pack by sector type
 */
export function getSectorPackBySector(sector: string): SectorPackDefinition | undefined {
  switch (sector) {
    case 'tourism_hotels':
      return TOURISM_HOTELS_PACK;
    case 'fnb_restaurants':
      return FNB_RESTAURANTS_PACK;
    default:
      return undefined;
  }
}