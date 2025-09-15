import { nanoid } from 'nanoid';

/**
 * Configuration Service for PayrollSync Implementation
 * Handles policies, wage tables, overtime bands, and tip scheme configuration
 */

export interface SystemConfiguration {
  configId: string;
  propertyCode: string;
  configurationDate: Date;
  configuredBy: string;
  policies: PolicyConfiguration;
  wageStructure: WageStructureConfiguration;
  overtimeBands: OvertimeBandConfiguration[];
  nightShiftConfig: NightShiftConfiguration;
  tipScheme: TipSchemeConfiguration;
  holidayCalendar: HolidayConfiguration[];
  breakRules: BreakRuleConfiguration[];
  leaveTypes: LeaveTypeConfiguration[];
  validationRules: ValidationRuleConfiguration[];
  status: 'DRAFT' | 'UNDER_REVIEW' | 'APPROVED' | 'ACTIVE';
}

export interface PolicyConfiguration {
  payrollPolicies: PayrollPolicyConfig;
  timekeepingPolicies: TimekeepingPolicyConfig;
  compliancePolicies: CompliancePolicyConfig;
  approvalWorkflows: ApprovalWorkflowConfig;
}

export interface PayrollPolicyConfig {
  payFrequency: 'MONTHLY' | 'BI_WEEKLY' | 'WEEKLY';
  cutoffDay: number; // Day of month for payroll cutoff
  payDay: number; // Day of month for payment
  rounding: {
    method: 'ROUND_UP' | 'ROUND_DOWN' | 'ROUND_NEAREST';
    precision: number; // decimal places
  };
  retroactivePayLimit: number; // months
  advancePaymentLimit: number; // percentage of monthly salary
  currencyCode: 'EUR';
  taxYear: number;
}

export interface TimekeepingPolicyConfig {
  clockInGracePeriod: number; // minutes
  clockOutGracePeriod: number; // minutes
  missedPunchPolicy: 'AUTO_CORRECT' | 'MANAGER_APPROVAL' | 'NO_PAY';
  overtimePreApproval: boolean;
  breakDeduction: boolean;
  geofencing: {
    enabled: boolean;
    radiusMeters: number;
    strictMode: boolean;
  };
  biometricRequired: boolean;
}

export interface CompliancePolicyConfig {
  erganiAutoSubmission: boolean;
  erganiSubmissionBuffer: number; // hours before deadline
  digitalWorkCard: boolean;
  auditRetention: number; // years
  documentRetention: number; // years
  dataBackup: {
    frequency: 'DAILY' | 'WEEKLY';
    retentionDays: number;
  };
}

export interface ApprovalWorkflowConfig {
  timesheetApproval: {
    required: boolean;
    approverRole: string;
    deadline: number; // days
  };
  overtimeApproval: {
    required: boolean;
    approverRole: string;
    thresholdHours: number;
  };
  payrollApproval: {
    dualApproval: boolean;
    firstApprover: string;
    secondApprover: string;
  };
  leaveApproval: {
    managerApproval: boolean;
    hrApproval: boolean;
    advanceNoticeDays: number;
  };
}

export interface WageStructureConfiguration {
  baseCurrency: 'EUR';
  minimumWageTables: MinimumWageTable[];
  gradeStructure: WageGradeStructure[];
  allowanceStructure: AllowanceStructure[];
  cbaMapping: CBAMappingConfig;
  effectiveDate: Date;
  reviewFrequency: 'QUARTERLY' | 'ANNUALLY';
}

export interface MinimumWageTable {
  tableId: string;
  tableName: string;
  effectiveDate: Date;
  expiryDate?: Date;
  applicableRegions: string[];
  ageGroups: AgeGroupWage[];
  experienceGroups: ExperienceGroupWage[];
  sectorModifiers: SectorModifierWage[];
}

export interface AgeGroupWage {
  ageMin: number;
  ageMax: number;
  monthlyWage: number;
  dailyWage: number;
  hourlyWage: number;
  description: string;
}

export interface ExperienceGroupWage {
  experienceMin: number; // months
  experienceMax: number; // months
  multiplier: number;
  description: string;
}

export interface SectorModifierWage {
  sectorCode: string;
  sectorName: string;
  modifier: number; // percentage
  minimumAmount: number;
}

export interface WageGradeStructure {
  gradeCode: string;
  gradeName: string;
  baseWage: number;
  experienceIncrements: ExperienceIncrement[];
  qualificationBonuses: QualificationBonus[];
  performanceRanges: PerformanceRange[];
  effectiveDate: Date;
}

export interface ExperienceIncrement {
  fromYears: number;
  toYears: number;
  incrementAmount: number;
  incrementPercentage: number;
}

export interface QualificationBonus {
  qualificationCode: string;
  qualificationName: string;
  bonusAmount: number;
  bonusPercentage: number;
  required: boolean;
}

export interface PerformanceRange {
  performanceLevel:
    | 'BELOW_EXPECTATIONS'
    | 'MEETS_EXPECTATIONS'
    | 'EXCEEDS_EXPECTATIONS'
    | 'OUTSTANDING';
  multiplier: number;
  reviewFrequency: 'QUARTERLY' | 'ANNUALLY';
}

export interface AllowanceStructure {
  allowanceCode: string;
  allowanceName: string;
  allowanceType: 'FIXED_AMOUNT' | 'PERCENTAGE' | 'PER_UNIT' | 'CONDITIONAL';
  defaultAmount: number;
  taxable: boolean;
  socialSecuritySubject: boolean;
  conditions: AllowanceCondition[];
  eligibilityCriteria: string[];
}

export interface AllowanceCondition {
  conditionType:
    | 'DEPARTMENT'
    | 'ROLE'
    | 'SHIFT_TYPE'
    | 'WORKING_HOURS'
    | 'LOCATION';
  conditionValue: string;
  conditionAmount: number;
}

export interface CBAMappingConfig {
  cbaId: string;
  cbaName: string;
  applicableDepartments: string[];
  overrideRules: CBAOverrideRule[];
  escalationMatrix: CBAEscalationRule[];
}

export interface CBAOverrideRule {
  componentType: 'WAGE' | 'ALLOWANCE' | 'OVERTIME' | 'BONUS';
  componentCode: string;
  overrideValue: number;
  reason: string;
}

export interface CBAEscalationRule {
  escalationTrigger: string;
  escalationAmount: number;
  escalationDate: Date;
  automatic: boolean;
}

export interface OvertimeBandConfiguration {
  bandId: string;
  bandName: string;
  triggerType: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  thresholdHours: number;
  premiumRate: number; // percentage above base rate
  maxHours?: number;
  compoundingRules: CompoundingRule[];
  applicableDays: DayRule[];
  restrictionRules: RestrictionRule[];
}

export interface CompoundingRule {
  compoundWith: string; // other overtime band ID
  compoundingMethod: 'ADDITIVE' | 'MULTIPLICATIVE' | 'HIGHEST_RATE';
  priority: number;
}

export interface DayRule {
  dayType: 'WEEKDAY' | 'SATURDAY' | 'SUNDAY' | 'HOLIDAY';
  applicable: boolean;
  modifierRate?: number;
}

export interface RestrictionRule {
  restrictionType:
    | 'DAILY_MAX'
    | 'WEEKLY_MAX'
    | 'MONTHLY_MAX'
    | 'CONSECUTIVE_DAYS';
  restrictionValue: number;
  enforcementLevel: 'WARNING' | 'BLOCK' | 'APPROVAL_REQUIRED';
}

export interface NightShiftConfiguration {
  nightShiftStart: string; // HH:MM format
  nightShiftEnd: string; // HH:MM format
  premiumRate: number; // percentage
  minimumHours: number; // minimum hours to qualify
  compoundWithOvertime: boolean;
  weekendModifier: number; // additional percentage for weekends
  holidayModifier: number; // additional percentage for holidays
}

export interface TipSchemeConfiguration {
  schemeId: string;
  schemeName: string;
  schemeType: 'INDIVIDUAL' | 'DEPARTMENT_POOL' | 'PROPERTY_POOL' | 'MIXED';
  distributionMethod: 'EQUAL' | 'HOURS_WORKED' | 'PERFORMANCE' | 'CUSTOM';
  eligibleDepartments: string[];
  excludedRoles: string[];
  distributionRules: TipDistributionRule[];
  taxTreatment: TipTaxTreatment;
  reportingRequirements: TipReportingConfig;
}

export interface TipDistributionRule {
  ruleId: string;
  ruleName: string;
  department: string;
  role: string;
  sharePercentage: number;
  minimumHours: number;
  performanceWeight: number;
}

export interface TipTaxTreatment {
  taxable: boolean;
  socialSecuritySubject: boolean;
  withholdingRate: number;
  reportingThreshold: number; // monthly amount
  declarationMethod: 'AUTOMATIC' | 'EMPLOYEE_DECLARED';
}

export interface TipReportingConfig {
  dailyReporting: boolean;
  managerApproval: boolean;
  auditTrail: boolean;
  erganiIntegration: boolean;
}

export interface HolidayConfiguration {
  holidayId: string;
  holidayName: string;
  holidayDate: string; // YYYY-MM-DD or MM-DD for recurring
  holidayType: 'PUBLIC' | 'RELIGIOUS' | 'COMPANY' | 'REGIONAL';
  recurring: boolean;
  paidHoliday: boolean;
  workPremium: number; // percentage for working on holiday
  compulsoryDay: boolean; // true if work is not allowed
  alternateDate?: string; // if holiday is moved
}

export interface BreakRuleConfiguration {
  ruleId: string;
  ruleName: string;
  workHoursThreshold: number;
  breakDuration: number; // minutes
  breakType: 'PAID' | 'UNPAID';
  mandatory: boolean;
  maxContinuousWork: number; // hours without break
  breakWindows: BreakWindow[];
}

export interface BreakWindow {
  startHour: number;
  endHour: number;
  description: string;
  priority: number;
}

export interface LeaveTypeConfiguration {
  leaveTypeId: string;
  leaveTypeName: string;
  category:
    | 'ANNUAL'
    | 'SICK'
    | 'MATERNITY'
    | 'PATERNITY'
    | 'SPECIAL'
    | 'UNPAID';
  entitlementRules: LeaveEntitlementRule[];
  accrualRules: LeaveAccrualRule[];
  carryOverRules: LeaveCarryOverRule;
  compensationRules: LeaveCompensationRule;
  approvalRequired: boolean;
  advanceNotice: number; // days
  blackoutPeriods: BlackoutPeriod[];
}

export interface LeaveEntitlementRule {
  serviceYears: number;
  entitlementDays: number;
  proRataRules: boolean;
}

export interface LeaveAccrualRule {
  accrualFrequency: 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
  accrualRate: number; // days per period
  maxAccrual: number;
  accrualStart: 'HIRE_DATE' | 'CALENDAR_YEAR' | 'ANNIVERSARY';
}

export interface LeaveCarryOverRule {
  maxCarryOver: number;
  carryOverExpiry: number; // months
  useItOrLoseIt: boolean;
}

export interface LeaveCompensationRule {
  paymentPercentage: number;
  baseSalaryOnly: boolean;
  includeAllowances: boolean;
  averagingPeriod: number; // months for calculation
}

export interface BlackoutPeriod {
  startDate: string;
  endDate: string;
  description: string;
  exception: string[]; // roles that can still take leave
}

export interface ValidationRuleConfiguration {
  ruleId: string;
  ruleName: string;
  ruleType: 'DATA_VALIDATION' | 'BUSINESS_RULE' | 'COMPLIANCE_CHECK';
  applicableEntity: 'EMPLOYEE' | 'TIMESHEET' | 'PAYROLL' | 'FILING';
  validationLogic: string;
  errorMessage: string;
  warningMessage?: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  bypassable: boolean;
  bypassRoles: string[];
}

class ConfigurationService {
  /**
   * Create system configuration for a property
   */
  async createSystemConfiguration(
    propertyCode: string,
    configuredBy: string,
    cbaRequirements?: string
  ): Promise<SystemConfiguration> {
    const configId = nanoid();

    // Generate default policies
    const policies = this.generateDefaultPolicies();

    // Create wage structure based on Greek minimum wage
    const wageStructure = await this.createWageStructure(cbaRequirements);

    // Configure overtime bands
    const overtimeBands = this.createOvertimeBands();

    // Set up night shift configuration
    const nightShiftConfig = this.createNightShiftConfig();

    // Configure tip scheme for hotels
    const tipScheme = this.createHotelTipScheme();

    // Set up Greek holiday calendar
    const holidayCalendar = this.createGreekHolidayCalendar();

    // Configure break rules per Greek labor law
    const breakRules = this.createGreekBreakRules();

    // Set up leave types
    const leaveTypes = this.createGreekLeaveTypes();

    // Create validation rules
    const validationRules = this.createValidationRules();

    const configuration: SystemConfiguration = {
      configId,
      propertyCode,
      configurationDate: new Date(),
      configuredBy,
      policies,
      wageStructure,
      overtimeBands,
      nightShiftConfig,
      tipScheme,
      holidayCalendar,
      breakRules,
      leaveTypes,
      validationRules,
      status: 'DRAFT',
    };

    console.log(`Configuration created for property ${propertyCode}`);
    return configuration;
  }

  /**
   * Generate default policies based on Greek labor law
   */
  private generateDefaultPolicies(): PolicyConfiguration {
    return {
      payrollPolicies: {
        payFrequency: 'MONTHLY',
        cutoffDay: 25, // 25th of each month
        payDay: 30, // Last day of month
        rounding: {
          method: 'ROUND_NEAREST',
          precision: 2,
        },
        retroactivePayLimit: 6,
        advancePaymentLimit: 50,
        currencyCode: 'EUR',
        taxYear: new Date().getFullYear(),
      },
      timekeepingPolicies: {
        clockInGracePeriod: 5,
        clockOutGracePeriod: 5,
        missedPunchPolicy: 'MANAGER_APPROVAL',
        overtimePreApproval: true,
        breakDeduction: true,
        geofencing: {
          enabled: true,
          radiusMeters: 100,
          strictMode: false,
        },
        biometricRequired: false,
      },
      compliancePolicies: {
        erganiAutoSubmission: true,
        erganiSubmissionBuffer: 2,
        digitalWorkCard: true,
        auditRetention: 6,
        documentRetention: 6,
        dataBackup: {
          frequency: 'DAILY',
          retentionDays: 90,
        },
      },
      approvalWorkflows: {
        timesheetApproval: {
          required: true,
          approverRole: 'Department Manager',
          deadline: 3,
        },
        overtimeApproval: {
          required: true,
          approverRole: 'Department Manager',
          thresholdHours: 2,
        },
        payrollApproval: {
          dualApproval: true,
          firstApprover: 'Payroll Manager',
          secondApprover: 'Finance Controller',
        },
        leaveApproval: {
          managerApproval: true,
          hrApproval: false,
          advanceNoticeDays: 7,
        },
      },
    };
  }

  /**
   * Create wage structure based on Greek minimum wage and CBA
   */
  private async createWageStructure(
    cbaRequirements?: string
  ): Promise<WageStructureConfiguration> {
    return {
      baseCurrency: 'EUR',
      minimumWageTables: [
        {
          tableId: 'GR_MIN_WAGE_2025',
          tableName: 'Greek Minimum Wage 2025',
          effectiveDate: new Date('2025-01-01'),
          applicableRegions: ['ALL_GREECE'],
          ageGroups: [
            {
              ageMin: 18,
              ageMax: 24,
              monthlyWage: 880, // 2025 minimum wage
              dailyWage: 29.33,
              hourlyWage: 4.07,
              description: 'Standard minimum wage',
            },
            {
              ageMin: 17,
              ageMax: 17,
              monthlyWage: 748, // Youth wage (15% reduction)
              dailyWage: 24.93,
              hourlyWage: 3.46,
              description: 'Youth minimum wage',
            },
          ],
          experienceGroups: [
            {
              experienceMin: 0,
              experienceMax: 24,
              multiplier: 1.0,
              description: 'Entry level',
            },
            {
              experienceMin: 25,
              experienceMax: 60,
              multiplier: 1.05,
              description: '2-5 years experience',
            },
            {
              experienceMin: 61,
              experienceMax: 999,
              multiplier: 1.1,
              description: '5+ years experience',
            },
          ],
          sectorModifiers: [
            {
              sectorCode: 'HOTEL_TOURISM',
              sectorName: 'Hotels & Tourism',
              modifier: 5, // 5% above minimum
              minimumAmount: 50,
            },
          ],
        },
      ],
      gradeStructure: [
        {
          gradeCode: 'UNSKILLED',
          gradeName: 'Unskilled Worker',
          baseWage: 880,
          experienceIncrements: [
            {
              fromYears: 0,
              toYears: 2,
              incrementAmount: 0,
              incrementPercentage: 0,
            },
            {
              fromYears: 3,
              toYears: 5,
              incrementAmount: 50,
              incrementPercentage: 5.7,
            },
            {
              fromYears: 6,
              toYears: 10,
              incrementAmount: 100,
              incrementPercentage: 11.4,
            },
          ],
          qualificationBonuses: [
            {
              qualificationCode: 'LANGUAGE',
              qualificationName: 'Foreign Language',
              bonusAmount: 30,
              bonusPercentage: 3.4,
              required: false,
            },
          ],
          performanceRanges: [
            {
              performanceLevel: 'MEETS_EXPECTATIONS',
              multiplier: 1.0,
              reviewFrequency: 'ANNUALLY',
            },
            {
              performanceLevel: 'EXCEEDS_EXPECTATIONS',
              multiplier: 1.05,
              reviewFrequency: 'ANNUALLY',
            },
          ],
          effectiveDate: new Date('2025-01-01'),
        },
      ],
      allowanceStructure: [
        {
          allowanceCode: 'MEAL_ALLOWANCE',
          allowanceName: 'Meal Allowance',
          allowanceType: 'FIXED_AMOUNT',
          defaultAmount: 11,
          taxable: false,
          socialSecuritySubject: false,
          conditions: [
            {
              conditionType: 'WORKING_HOURS',
              conditionValue: '8',
              conditionAmount: 11,
            },
          ],
          eligibilityCriteria: [
            'Full-time employees',
            'Part-time over 6 hours',
          ],
        },
        {
          allowanceCode: 'TRANSPORT_ALLOWANCE',
          allowanceName: 'Transport Allowance',
          allowanceType: 'FIXED_AMOUNT',
          defaultAmount: 50,
          taxable: false,
          socialSecuritySubject: false,
          conditions: [],
          eligibilityCriteria: ['All employees'],
        },
      ],
      cbaMapping: {
        cbaId: cbaRequirements || 'HOTEL_TOURISM_CBA_2024',
        cbaName: 'Hotel & Tourism CBA 2024',
        applicableDepartments: ['ALL'],
        overrideRules: [],
        escalationMatrix: [],
      },
      effectiveDate: new Date('2025-01-01'),
      reviewFrequency: 'ANNUALLY',
    };
  }

  /**
   * Create overtime band configurations
   */
  private createOvertimeBands(): OvertimeBandConfiguration[] {
    return [
      {
        bandId: 'DAILY_OT_25',
        bandName: 'Daily Overtime 25%',
        triggerType: 'DAILY',
        thresholdHours: 8,
        premiumRate: 25,
        maxHours: 2,
        compoundingRules: [],
        applicableDays: [
          { dayType: 'WEEKDAY', applicable: true },
          { dayType: 'SATURDAY', applicable: true },
          { dayType: 'SUNDAY', applicable: false },
          { dayType: 'HOLIDAY', applicable: false },
        ],
        restrictionRules: [
          {
            restrictionType: 'DAILY_MAX',
            restrictionValue: 10,
            enforcementLevel: 'APPROVAL_REQUIRED',
          },
        ],
      },
      {
        bandId: 'DAILY_OT_50',
        bandName: 'Daily Overtime 50%',
        triggerType: 'DAILY',
        thresholdHours: 10,
        premiumRate: 50,
        compoundingRules: [],
        applicableDays: [
          { dayType: 'WEEKDAY', applicable: true },
          { dayType: 'SATURDAY', applicable: true },
        ],
        restrictionRules: [
          {
            restrictionType: 'DAILY_MAX',
            restrictionValue: 12,
            enforcementLevel: 'BLOCK',
          },
        ],
      },
      {
        bandId: 'SUNDAY_PREMIUM',
        bandName: 'Sunday Work Premium',
        triggerType: 'DAILY',
        thresholdHours: 0,
        premiumRate: 75,
        compoundingRules: [
          {
            compoundWith: 'DAILY_OT_25',
            compoundingMethod: 'ADDITIVE',
            priority: 1,
          },
        ],
        applicableDays: [{ dayType: 'SUNDAY', applicable: true }],
        restrictionRules: [],
      },
      {
        bandId: 'HOLIDAY_PREMIUM',
        bandName: 'Holiday Work Premium',
        triggerType: 'DAILY',
        thresholdHours: 0,
        premiumRate: 100,
        compoundingRules: [],
        applicableDays: [{ dayType: 'HOLIDAY', applicable: true }],
        restrictionRules: [],
      },
    ];
  }

  /**
   * Create night shift configuration
   */
  private createNightShiftConfig(): NightShiftConfiguration {
    return {
      nightShiftStart: '22:00',
      nightShiftEnd: '06:00',
      premiumRate: 25, // 25% premium for night shift
      minimumHours: 3, // Must work at least 3 hours during night period
      compoundWithOvertime: true,
      weekendModifier: 10, // Additional 10% for weekend nights
      holidayModifier: 25, // Additional 25% for holiday nights
    };
  }

  /**
   * Create hotel-specific tip scheme
   */
  private createHotelTipScheme(): TipSchemeConfiguration {
    return {
      schemeId: 'HOTEL_TIP_SCHEME',
      schemeName: 'Hotel Department Tip Pooling',
      schemeType: 'DEPARTMENT_POOL',
      distributionMethod: 'HOURS_WORKED',
      eligibleDepartments: ['FRONT_OFFICE', 'FOOD_BEVERAGE', 'HOUSEKEEPING'],
      excludedRoles: ['MANAGER', 'ASSISTANT_MANAGER'],
      distributionRules: [
        {
          ruleId: 'FRONT_OFFICE_TIPS',
          ruleName: 'Front Office Tips',
          department: 'FRONT_OFFICE',
          role: 'ALL',
          sharePercentage: 100,
          minimumHours: 4,
          performanceWeight: 0,
        },
        {
          ruleId: 'FB_TIPS',
          ruleName: 'Food & Beverage Tips',
          department: 'FOOD_BEVERAGE',
          role: 'ALL',
          sharePercentage: 100,
          minimumHours: 4,
          performanceWeight: 0,
        },
      ],
      taxTreatment: {
        taxable: true,
        socialSecuritySubject: true,
        withholdingRate: 20,
        reportingThreshold: 150, // Monthly threshold
        declarationMethod: 'AUTOMATIC',
      },
      reportingRequirements: {
        dailyReporting: true,
        managerApproval: true,
        auditTrail: true,
        erganiIntegration: true,
      },
    };
  }

  /**
   * Create Greek holiday calendar
   */
  private createGreekHolidayCalendar(): HolidayConfiguration[] {
    return [
      {
        holidayId: 'NEW_YEAR',
        holidayName: 'Πρωτοχρονιά',
        holidayDate: '01-01',
        holidayType: 'PUBLIC',
        recurring: true,
        paidHoliday: true,
        workPremium: 100,
        compulsoryDay: true,
      },
      {
        holidayId: 'EPIPHANY',
        holidayName: 'Θεοφάνεια',
        holidayDate: '01-06',
        holidayType: 'RELIGIOUS',
        recurring: true,
        paidHoliday: true,
        workPremium: 100,
        compulsoryDay: false,
      },
      {
        holidayId: 'INDEPENDENCE_DAY',
        holidayName: '25η Μαρτίου',
        holidayDate: '03-25',
        holidayType: 'PUBLIC',
        recurring: true,
        paidHoliday: true,
        workPremium: 100,
        compulsoryDay: true,
      },
      {
        holidayId: 'LABOR_DAY',
        holidayName: 'Εργατική Πρωτομαγιά',
        holidayDate: '05-01',
        holidayType: 'PUBLIC',
        recurring: true,
        paidHoliday: true,
        workPremium: 100,
        compulsoryDay: true,
      },
      {
        holidayId: 'OHI_DAY',
        holidayName: '28η Οκτωβρίου',
        holidayDate: '10-28',
        holidayType: 'PUBLIC',
        recurring: true,
        paidHoliday: true,
        workPremium: 100,
        compulsoryDay: true,
      },
      {
        holidayId: 'CHRISTMAS',
        holidayName: 'Χριστούγεννα',
        holidayDate: '12-25',
        holidayType: 'RELIGIOUS',
        recurring: true,
        paidHoliday: true,
        workPremium: 100,
        compulsoryDay: true,
      },
      {
        holidayId: 'BOXING_DAY',
        holidayName: 'Δεύτερη μέρα Χριστουγέννων',
        holidayDate: '12-26',
        holidayType: 'RELIGIOUS',
        recurring: true,
        paidHoliday: true,
        workPremium: 100,
        compulsoryDay: false,
      },
    ];
  }

  /**
   * Create Greek break rules per labor law
   */
  private createGreekBreakRules(): BreakRuleConfiguration[] {
    return [
      {
        ruleId: 'MANDATORY_BREAK_6H',
        ruleName: 'Mandatory Break for 6+ Hours',
        workHoursThreshold: 6,
        breakDuration: 15,
        breakType: 'PAID',
        mandatory: true,
        maxContinuousWork: 6,
        breakWindows: [
          {
            startHour: 10,
            endHour: 11,
            description: 'Morning Break',
            priority: 1,
          },
          {
            startHour: 14,
            endHour: 16,
            description: 'Afternoon Break',
            priority: 2,
          },
        ],
      },
      {
        ruleId: 'LUNCH_BREAK_8H',
        ruleName: 'Lunch Break for 8+ Hours',
        workHoursThreshold: 8,
        breakDuration: 30,
        breakType: 'UNPAID',
        mandatory: true,
        maxContinuousWork: 6,
        breakWindows: [
          {
            startHour: 12,
            endHour: 14,
            description: 'Lunch Break',
            priority: 1,
          },
          {
            startHour: 14,
            endHour: 16,
            description: 'Late Lunch',
            priority: 2,
          },
        ],
      },
    ];
  }

  /**
   * Create Greek leave types
   */
  private createGreekLeaveTypes(): LeaveTypeConfiguration[] {
    return [
      {
        leaveTypeId: 'ANNUAL_LEAVE',
        leaveTypeName: 'Annual Leave',
        category: 'ANNUAL',
        entitlementRules: [
          { serviceYears: 1, entitlementDays: 20, proRataRules: true },
          { serviceYears: 10, entitlementDays: 25, proRataRules: true },
        ],
        accrualRules: {
          accrualFrequency: 'MONTHLY',
          accrualRate: 1.67, // 20 days / 12 months
          maxAccrual: 40,
          accrualStart: 'HIRE_DATE',
        },
        carryOverRules: {
          maxCarryOver: 10,
          carryOverExpiry: 6,
          useItOrLoseIt: true,
        },
        compensationRules: {
          paymentPercentage: 100,
          baseSalaryOnly: false,
          includeAllowances: true,
          averagingPeriod: 3,
        },
        approvalRequired: true,
        advanceNotice: 7,
        blackoutPeriods: [
          {
            startDate: '12-20',
            endDate: '01-10',
            description: 'Holiday Season Blackout',
            exception: ['MANAGER'],
          },
        ],
      },
      {
        leaveTypeId: 'SICK_LEAVE',
        leaveTypeName: 'Sick Leave',
        category: 'SICK',
        entitlementRules: [
          { serviceYears: 0, entitlementDays: 15, proRataRules: false },
        ],
        accrualRules: {
          accrualFrequency: 'ANNUALLY',
          accrualRate: 15,
          maxAccrual: 30,
          accrualStart: 'CALENDAR_YEAR',
        },
        carryOverRules: {
          maxCarryOver: 15,
          carryOverExpiry: 12,
          useItOrLoseIt: false,
        },
        compensationRules: {
          paymentPercentage: 100,
          baseSalaryOnly: true,
          includeAllowances: false,
          averagingPeriod: 1,
        },
        approvalRequired: false,
        advanceNotice: 0,
        blackoutPeriods: [],
      },
      {
        leaveTypeId: 'MATERNITY_LEAVE',
        leaveTypeName: 'Maternity Leave',
        category: 'MATERNITY',
        entitlementRules: [
          { serviceYears: 0, entitlementDays: 119, proRataRules: false },
        ],
        accrualRules: {
          accrualFrequency: 'ANNUALLY',
          accrualRate: 119,
          maxAccrual: 119,
          accrualStart: 'ANNIVERSARY',
        },
        carryOverRules: {
          maxCarryOver: 0,
          carryOverExpiry: 0,
          useItOrLoseIt: false,
        },
        compensationRules: {
          paymentPercentage: 100,
          baseSalaryOnly: false,
          includeAllowances: true,
          averagingPeriod: 6,
        },
        approvalRequired: true,
        advanceNotice: 30,
        blackoutPeriods: [],
      },
    ];
  }

  /**
   * Create validation rules
   */
  private createValidationRules(): ValidationRuleConfiguration[] {
    return [
      {
        ruleId: 'AFM_VALIDATION',
        ruleName: 'Greek AFM Validation',
        ruleType: 'DATA_VALIDATION',
        applicableEntity: 'EMPLOYEE',
        validationLogic: '/^\\d{9}$/.test(value) && value !== "000000000"',
        errorMessage: 'AFM must be exactly 9 digits and not all zeros',
        severity: 'ERROR',
        bypassable: false,
        bypassRoles: [],
      },
      {
        ruleId: 'AMKA_VALIDATION',
        ruleName: 'Greek AMKA Validation',
        ruleType: 'DATA_VALIDATION',
        applicableEntity: 'EMPLOYEE',
        validationLogic: '/^\\d{11}$/.test(value) && value !== "00000000000"',
        errorMessage: 'AMKA must be exactly 11 digits and not all zeros',
        severity: 'ERROR',
        bypassable: false,
        bypassRoles: [],
      },
      {
        ruleId: 'DAILY_HOURS_LIMIT',
        ruleName: 'Daily Working Hours Limit',
        ruleType: 'BUSINESS_RULE',
        applicableEntity: 'TIMESHEET',
        validationLogic: 'totalHours <= 12',
        errorMessage: 'Daily working hours cannot exceed 12 hours',
        warningMessage:
          'Daily working hours exceed 10 hours - overtime approval required',
        severity: 'WARNING',
        bypassable: true,
        bypassRoles: ['MANAGER', 'HR_ADMIN'],
      },
      {
        ruleId: 'ERGANI_DEADLINE',
        ruleName: 'ERGANI Submission Deadline',
        ruleType: 'COMPLIANCE_CHECK',
        applicableEntity: 'FILING',
        validationLogic: 'submissionDate <= deadlineDate',
        errorMessage: 'ERGANI submission is past the legal deadline',
        severity: 'CRITICAL',
        bypassable: false,
        bypassRoles: [],
      },
    ];
  }

  /**
   * Validate configuration completeness
   */
  async validateConfiguration(
    config: SystemConfiguration
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Validate wage structure
    if (!config.wageStructure.minimumWageTables.length) {
      errors.push('At least one minimum wage table is required');
    }

    // Validate overtime bands
    if (!config.overtimeBands.length) {
      errors.push('At least one overtime band must be configured');
    }

    // Validate holiday calendar
    const requiredHolidays = ['NEW_YEAR', 'LABOR_DAY', 'CHRISTMAS'];
    const configuredHolidays = config.holidayCalendar.map(h => h.holidayId);
    const missingHolidays = requiredHolidays.filter(
      h => !configuredHolidays.includes(h)
    );

    if (missingHolidays.length > 0) {
      errors.push(`Missing required holidays: ${missingHolidays.join(', ')}`);
    }

    // Validate leave types
    const requiredLeaveTypes = ['ANNUAL_LEAVE', 'SICK_LEAVE'];
    const configuredLeaveTypes = config.leaveTypes.map(l => l.leaveTypeId);
    const missingLeaveTypes = requiredLeaveTypes.filter(
      l => !configuredLeaveTypes.includes(l)
    );

    if (missingLeaveTypes.length > 0) {
      errors.push(
        `Missing required leave types: ${missingLeaveTypes.join(', ')}`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Apply configuration to property
   */
  async applyConfiguration(config: SystemConfiguration): Promise<boolean> {
    try {
      // Validate configuration first
      const validation = await this.validateConfiguration(config);
      if (!validation.isValid) {
        throw new Error(
          `Configuration validation failed: ${validation.errors.join(', ')}`
        );
      }

      // Apply configuration changes
      console.log(
        `Applying configuration ${config.configId} to property ${config.propertyCode}`
      );

      // In production, this would update the actual system configuration
      config.status = 'ACTIVE';

      console.log(
        `Configuration applied successfully for property ${config.propertyCode}`
      );
      return true;
    } catch (error) {
      console.error('Error applying configuration:', error);
      return false;
    }
  }
}

export const configurationService = new ConfigurationService();
