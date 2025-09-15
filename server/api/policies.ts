import { Request, Response } from 'express';

// Policy data structure with JSON configurations
export interface PayrollPolicies {
  version: string;
  effectiveDate: string;
  policies: {
    overtimeCaps: OvertimeCapPolicy;
    nightBand: NightBandPolicy;
    sundaySchedule: SundaySchedulePolicy;
    mealVoucherCap: MealVoucherPolicy;
    tipRules: TipPoolingPolicy;
    leaveAccrual: LeaveAccrualPolicy;
    complianceMonitoring: ComplianceMonitoringPolicy;
  };
  roleMatrix: RoleMatrix;
  metadata: {
    lastUpdated: string;
    updatedBy: string;
    approvalRequired: boolean;
    nextReviewDate: string;
  };
}

interface OvertimeCapPolicy {
  enabled: boolean;
  dailyCap: {
    hours: number;
    hardLimit: boolean; // If true, system prevents scheduling beyond cap
    alertThreshold: number; // Alert when approaching cap
  };
  weeklyCap: {
    hours: number;
    hardLimit: boolean;
    alertThreshold: number;
  };
  monthlyCap: {
    hours: number;
    hardLimit: boolean;
    alertThreshold: number;
  };
  consecutiveDays: {
    maxDays: number;
    mandatoryRestPeriod: number; // Hours of rest required
    exemptions: string[]; // Employee categories exempt from rule
  };
  approvalRequired: {
    dailyThreshold: number;
    weeklyThreshold: number;
    approverRoles: string[];
    escalationMatrix: { hours: number; role: string }[];
  };
}

interface NightBandPolicy {
  timeRange: {
    startTime: string; // "22:00"
    endTime: string; // "06:00"
    timezone: string; // "Europe/Athens"
  };
  premiumRate: number; // 1.25 = 25% premium
  minimumHours: number; // Must work at least X hours in night band
  applicableDays: string[]; // Days when night premium applies
  exemptions: {
    roles: string[];
    employeeCategories: string[];
    departments: string[];
  };
  healthAndSafety: {
    maxConsecutiveNights: number;
    mandatoryBreaks: number; // Minutes per shift
    medicalCheckRequired: boolean;
  };
}

interface SundaySchedulePolicy {
  premiumRate: number; // 1.2 = 20% premium
  voluntaryBasis: boolean; // Must be voluntary
  rotationRequired: boolean; // Rotate Sunday assignments
  maxSundaysPerMonth: number;
  compensatoryTimeOff: boolean; // Offer comp time instead of premium
  exemptions: {
    essentialServices: string[]; // Departments that must operate Sundays
    managementExempt: boolean;
    seasonalOverride: boolean; // Different rules during high season
  };
  approvalWorkflow: {
    managerApproval: boolean;
    employeeConsent: boolean;
    advanceNotice: number; // Days of advance notice required
  };
}

interface MealVoucherPolicy {
  dailyAmount: number; // €11.00
  eligibility: {
    minimumHours: number; // Must work at least X hours
    workingDays: string[]; // Days eligible for vouchers
    excludedShifts: string[]; // Night shifts, split shifts, etc.
  };
  monthlyCapAmount: number; // Max vouchers per month
  taxExemptLimit: number; // Tax-free portion
  distributionMethod: 'electronic' | 'paper' | 'both';
  restrictions: {
    transferable: boolean;
    cashEquivalent: boolean;
    expiryPeriod: number; // Months before expiry
    approvedVendors: string[];
  };
  partTimePolicy: {
    proRatedBasis: boolean;
    minimumHoursQualification: number;
  };
}

interface TipPoolingPolicy {
  enabled: boolean;
  participationBasis: 'mandatory' | 'voluntary';
  distributionMethod:
    | 'equal'
    | 'hours_based'
    | 'performance_based'
    | 'role_based';
  eligibleRoles: string[];
  ineligibleRoles: string[];
  poolingPeriod: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  minimumServiceHours: number;
  distributionRules: {
    serverWeight: number;
    bartenderWeight: number;
    hostessWeight: number;
    busserWeight: number;
    kitchenWeight: number;
  };
  managerParticipation: boolean;
  recordKeeping: {
    detailedLogging: boolean;
    employeeVisibility: boolean;
    auditTrailRequired: boolean;
  };
  taxImplications: {
    reportAsWages: boolean;
    withholding: boolean;
    socialInsuranceSubject: boolean;
  };
}

interface LeaveAccrualPolicy {
  annualLeave: {
    accrualRate: number; // Days per month
    carryOverLimit: number; // Max days to carry forward
    cashOutAllowed: boolean;
    minimumTakeConsecutive: number; // Must take X consecutive days
  };
  sickLeave: {
    accrualRate: number;
    carryOverLimit: number;
    medicalCertificateRequired: number; // Days after which cert required
    familyCareAllowed: boolean;
  };
  personalLeave: {
    daysPerYear: number;
    advanceNoticeRequired: number;
    managerApprovalRequired: boolean;
  };
  specialLeave: {
    maternityCoverage: number; // Weeks
    paternityLeave: number; // Days
    bereavementLeave: number; // Days
    marriageLeave: number; // Days
  };
}

interface ComplianceMonitoringPolicy {
  automaticChecks: {
    overtimeViolations: boolean;
    restPeriodCompliance: boolean;
    workingTimeDirective: boolean;
    erganiValidation: boolean;
  };
  alertThresholds: {
    dailyHoursWarning: number; // Hours before warning
    weeklyHoursWarning: number;
    consecutiveDaysWarning: number;
    restPeriodMinimum: number; // Hours between shifts
  };
  escalationMatrix: {
    level1: { threshold: number; recipients: string[] };
    level2: { threshold: number; recipients: string[] };
    level3: { threshold: number; recipients: string[] };
  };
  reportingFrequency: {
    dailyChecks: boolean;
    weeklyReports: boolean;
    monthlyAudits: boolean;
    quarterlyReview: boolean;
  };
  exceptionHandling: {
    autoCorrection: boolean;
    manualReviewRequired: boolean;
    approvalWorkflow: boolean;
  };
}

interface RoleMatrix {
  employee: {
    payslips: ['read_own'];
    timesheets: ['read_own', 'edit_own_draft'];
    schedules: ['read_own'];
    leave: ['request', 'view_own'];
    overtime: ['request_approval'];
    personal: ['edit_profile', 'view_profile'];
  };
  manager: {
    payslips: ['read_department', 'review'];
    timesheets: ['read_department', 'approve', 'edit_department'];
    schedules: ['create_department', 'modify_department'];
    leave: ['approve_department', 'view_department'];
    overtime: ['approve_department', 'view_reports'];
    reports: ['department_analytics', 'compliance_dashboard'];
    employees: ['view_department', 'performance_review'];
  };
  hr: {
    payslips: ['read_all', 'review', 'approve'];
    timesheets: ['read_all', 'edit_all', 'approve_all'];
    schedules: ['create_all', 'modify_all'];
    leave: ['approve_all', 'policy_management'];
    overtime: ['approve_all', 'policy_management'];
    reports: ['all_analytics', 'compliance_reports', 'audit_trails'];
    employees: ['create', 'edit_all', 'terminate', 'rehire'];
    policies: ['create', 'edit', 'approve'];
    system: ['user_management', 'role_assignment'];
  };
  payroll: {
    payslips: ['create', 'calculate', 'approve', 'distribute'];
    timesheets: ['read_all', 'validate', 'calculate'];
    payments: ['process', 'sepa_generation', 'bank_uploads'];
    reports: ['payroll_reports', 'tax_reports', 'compliance_exports'];
    corrections: ['payroll_adjustments', 'retroactive_changes'];
    compliance: ['ergani_submit', 'efka_report', 'aade_filing'];
    system: ['payroll_configuration', 'rule_management'];
  };
  auditor: {
    payslips: ['read_all', 'audit_trail'];
    timesheets: ['read_all', 'audit_trail'];
    reports: ['all_analytics', 'compliance_reports', 'audit_reports'];
    system: ['audit_logs', 'security_reports', 'data_integrity'];
    compliance: ['compliance_review', 'violation_reports'];
    readonly: true; // Cannot modify data, only view and audit
  };
}

// GET /api/policies/current - Current active policies
export async function getCurrentPolicies(req: Request, res: Response) {
  try {
    const userId = req.user?.claims?.sub;
    const userRole = await getUserRole(userId);

    const policies = await getActivePolicies();
    const filteredPolicies = await applyPolicyRoleFiltering(policies, userRole);

    res.json({
      policies: filteredPolicies,
      retrievedAt: new Date().toISOString(),
      cacheExpiry: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min cache
    });
  } catch (error) {
    console.error('Error fetching policies:', error);
    res.status(500).json({ error: 'Failed to fetch policies' });
  }
}

// GET /api/policies/role-matrix - Role-based access matrix
export async function getRoleMatrix(req: Request, res: Response) {
  try {
    const userId = req.user?.claims?.sub;
    const userRole = await getUserRole(userId);

    // Only HR and auditors can see full role matrix
    if (!['hr', 'auditor'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const policies = await getActivePolicies();

    res.json({
      roleMatrix: policies.roleMatrix,
      retrievedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching role matrix:', error);
    res.status(500).json({ error: 'Failed to fetch role matrix' });
  }
}

// POST /api/policies/validate - Validate policy against current data
export async function validatePolicy(req: Request, res: Response) {
  try {
    const { policyType, employeeId, proposedValue } = req.body;

    const userId = req.user?.claims?.sub;
    const userRole = await getUserRole(userId);

    // Only managers and HR can validate policies
    if (!['manager', 'hr', 'payroll'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const validation = await performPolicyValidation(
      policyType,
      employeeId,
      proposedValue
    );

    res.json({
      valid: validation.isValid,
      violations: validation.violations,
      warnings: validation.warnings,
      suggestedCorrections: validation.corrections,
      validatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error validating policy:', error);
    res.status(500).json({ error: 'Failed to validate policy' });
  }
}

// Helper functions
async function getActivePolicies(): Promise<PayrollPolicies> {
  // Mock comprehensive policy configuration
  return {
    version: '2025.1',
    effectiveDate: '2025-01-01T00:00:00Z',
    policies: {
      overtimeCaps: {
        enabled: true,
        dailyCap: {
          hours: 3.0,
          hardLimit: false, // Warning only, not enforced
          alertThreshold: 2.5,
        },
        weeklyCap: {
          hours: 8.0,
          hardLimit: true, // System prevents scheduling beyond 8h/week
          alertThreshold: 6.0,
        },
        monthlyCap: {
          hours: 32.0,
          hardLimit: true,
          alertThreshold: 28.0,
        },
        consecutiveDays: {
          maxDays: 6,
          mandatoryRestPeriod: 11, // 11 hours rest between shifts
          exemptions: ['management', 'security', 'maintenance'],
        },
        approvalRequired: {
          dailyThreshold: 2.0, // Requires approval for >2h daily OT
          weeklyThreshold: 6.0, // Requires approval for >6h weekly OT
          approverRoles: ['manager', 'hr'],
          escalationMatrix: [
            { hours: 4.0, role: 'manager' },
            { hours: 8.0, role: 'hr' },
            { hours: 12.0, role: 'general_manager' },
          ],
        },
      },
      nightBand: {
        timeRange: {
          startTime: '22:00',
          endTime: '06:00',
          timezone: 'Europe/Athens',
        },
        premiumRate: 1.25,
        minimumHours: 3.0,
        applicableDays: [
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
          'saturday',
          'sunday',
        ],
        exemptions: {
          roles: ['security'],
          employeeCategories: ['part-time-under-20h'],
          departments: ['management'],
        },
        healthAndSafety: {
          maxConsecutiveNights: 5,
          mandatoryBreaks: 30, // 30-minute break per night shift
          medicalCheckRequired: true,
        },
      },
      sundaySchedule: {
        premiumRate: 1.2,
        voluntaryBasis: true,
        rotationRequired: true,
        maxSundaysPerMonth: 3,
        compensatoryTimeOff: false,
        exemptions: {
          essentialServices: ['reception', 'security', 'kitchen'],
          managementExempt: true,
          seasonalOverride: true, // Different rules May-September
        },
        approvalWorkflow: {
          managerApproval: true,
          employeeConsent: true,
          advanceNotice: 7, // 7 days advance notice
        },
      },
      mealVoucherCap: {
        dailyAmount: 11.0,
        eligibility: {
          minimumHours: 6.0,
          workingDays: [
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday',
            'saturday',
          ],
          excludedShifts: ['split-shift-under-4h'],
        },
        monthlyCapAmount: 220.0, // 20 working days × €11
        taxExemptLimit: 11.0,
        distributionMethod: 'electronic',
        restrictions: {
          transferable: false,
          cashEquivalent: false,
          expiryPeriod: 12, // 12 months
          approvedVendors: ['supermarkets', 'restaurants', 'cafeterias'],
        },
        partTimePolicy: {
          proRatedBasis: true,
          minimumHoursQualification: 4.0,
        },
      },
      tipRules: {
        enabled: true,
        participationBasis: 'voluntary',
        distributionMethod: 'hours_based',
        eligibleRoles: ['server', 'bartender', 'hostess', 'busser'],
        ineligibleRoles: ['manager', 'kitchen', 'housekeeping'],
        poolingPeriod: 'weekly',
        minimumServiceHours: 20.0,
        distributionRules: {
          serverWeight: 1.0,
          bartenderWeight: 1.2,
          hostessWeight: 0.8,
          busserWeight: 0.6,
          kitchenWeight: 0.0,
        },
        managerParticipation: false,
        recordKeeping: {
          detailedLogging: true,
          employeeVisibility: true,
          auditTrailRequired: true,
        },
        taxImplications: {
          reportAsWages: true,
          withholding: true,
          socialInsuranceSubject: true,
        },
      },
      leaveAccrual: {
        annualLeave: {
          accrualRate: 2.0, // 2 days per month = 24 days annually
          carryOverLimit: 5, // Max 5 days carry-over
          cashOutAllowed: false,
          minimumTakeConsecutive: 10, // Must take at least 10 consecutive days
        },
        sickLeave: {
          accrualRate: 1.0, // 1 day per month
          carryOverLimit: 0, // Use or lose
          medicalCertificateRequired: 3, // Required after 3 consecutive days
          familyCareAllowed: true,
        },
        personalLeave: {
          daysPerYear: 3,
          advanceNoticeRequired: 48, // 48 hours advance notice
          managerApprovalRequired: true,
        },
        specialLeave: {
          maternityCoverage: 17, // 17 weeks maternity leave
          paternityLeave: 14, // 14 days paternity leave
          bereavementLeave: 5, // 5 days bereavement
          marriageLeave: 6, // 6 days marriage leave
        },
      },
      complianceMonitoring: {
        automaticChecks: {
          overtimeViolations: true,
          restPeriodCompliance: true,
          workingTimeDirective: true,
          erganiValidation: true,
        },
        alertThresholds: {
          dailyHoursWarning: 10.0,
          weeklyHoursWarning: 48.0,
          consecutiveDaysWarning: 6,
          restPeriodMinimum: 11.0,
        },
        escalationMatrix: {
          level1: { threshold: 1, recipients: ['direct_manager'] },
          level2: {
            threshold: 3,
            recipients: ['hr_manager', 'department_head'],
          },
          level3: {
            threshold: 5,
            recipients: ['general_manager', 'compliance_officer'],
          },
        },
        reportingFrequency: {
          dailyChecks: true,
          weeklyReports: true,
          monthlyAudits: true,
          quarterlyReview: true,
        },
        exceptionHandling: {
          autoCorrection: false,
          manualReviewRequired: true,
          approvalWorkflow: true,
        },
      },
    },
    roleMatrix: {
      employee: {
        payslips: ['read_own'],
        timesheets: ['read_own', 'edit_own_draft'],
        schedules: ['read_own'],
        leave: ['request', 'view_own'],
        overtime: ['request_approval'],
        personal: ['edit_profile', 'view_profile'],
      },
      manager: {
        payslips: ['read_department', 'review'],
        timesheets: ['read_department', 'approve', 'edit_department'],
        schedules: ['create_department', 'modify_department'],
        leave: ['approve_department', 'view_department'],
        overtime: ['approve_department', 'view_reports'],
        reports: ['department_analytics', 'compliance_dashboard'],
        employees: ['view_department', 'performance_review'],
      },
      hr: {
        payslips: ['read_all', 'review', 'approve'],
        timesheets: ['read_all', 'edit_all', 'approve_all'],
        schedules: ['create_all', 'modify_all'],
        leave: ['approve_all', 'policy_management'],
        overtime: ['approve_all', 'policy_management'],
        reports: ['all_analytics', 'compliance_reports', 'audit_trails'],
        employees: ['create', 'edit_all', 'terminate', 'rehire'],
        policies: ['create', 'edit', 'approve'],
        system: ['user_management', 'role_assignment'],
      },
      payroll: {
        payslips: ['create', 'calculate', 'approve', 'distribute'],
        timesheets: ['read_all', 'validate', 'calculate'],
        payments: ['process', 'sepa_generation', 'bank_uploads'],
        reports: ['payroll_reports', 'tax_reports', 'compliance_exports'],
        corrections: ['payroll_adjustments', 'retroactive_changes'],
        compliance: ['ergani_submit', 'efka_report', 'aade_filing'],
        system: ['payroll_configuration', 'rule_management'],
      },
      auditor: {
        payslips: ['read_all', 'audit_trail'],
        timesheets: ['read_all', 'audit_trail'],
        reports: ['all_analytics', 'compliance_reports', 'audit_reports'],
        system: ['audit_logs', 'security_reports', 'data_integrity'],
        compliance: ['compliance_review', 'violation_reports'],
        readonly: true,
      },
    },
    metadata: {
      lastUpdated: new Date().toISOString(),
      updatedBy: 'hr-admin',
      approvalRequired: true,
      nextReviewDate: '2025-06-01T00:00:00Z',
    },
  };
}

async function getUserRole(userId: string): Promise<string> {
  return 'manager'; // Mock role
}

async function applyPolicyRoleFiltering(
  policies: PayrollPolicies,
  role: string
): Promise<Partial<PayrollPolicies>> {
  switch (role) {
    case 'employee':
      // Employees see only policies that directly affect them
      return {
        version: policies.version,
        effectiveDate: policies.effectiveDate,
        policies: {
          overtimeCaps: policies.policies.overtimeCaps,
          nightBand: policies.policies.nightBand,
          sundaySchedule: policies.policies.sundaySchedule,
          mealVoucherCap: policies.policies.mealVoucherCap,
          tipRules: policies.policies.tipRules,
          leaveAccrual: policies.policies.leaveAccrual,
          complianceMonitoring: {
            alertThresholds:
              policies.policies.complianceMonitoring.alertThresholds,
            automaticChecks:
              policies.policies.complianceMonitoring.automaticChecks,
            reportingFrequency:
              policies.policies.complianceMonitoring.reportingFrequency,
            escalationMatrix:
              policies.policies.complianceMonitoring.escalationMatrix,
            exceptionHandling:
              policies.policies.complianceMonitoring.exceptionHandling,
          },
        },
      };
    case 'manager':
      // Managers see operational policies and limited role matrix
      return {
        ...policies,
        roleMatrix: {
          employee: policies.roleMatrix.employee,
          manager: policies.roleMatrix.manager,
        },
      };
    case 'hr':
    case 'payroll':
    case 'auditor':
      // Full access to all policies and role matrix
      return policies;
    default:
      throw new Error('Unauthorized access to policies');
  }
}

async function performPolicyValidation(
  policyType: string,
  employeeId: string,
  proposedValue: any
) {
  // Mock policy validation logic
  const violations: string[] = [];
  const warnings: string[] = [];
  const corrections: string[] = [];

  switch (policyType) {
    case 'overtime':
      if (proposedValue.hours > 8.0) {
        violations.push('Weekly overtime exceeds maximum limit of 8 hours');
      }
      if (proposedValue.hours > 6.0) {
        warnings.push(
          'Overtime approaching weekly threshold, manager approval required'
        );
      }
      break;
    case 'schedule':
      if (proposedValue.consecutiveDays > 6) {
        violations.push('Cannot schedule more than 6 consecutive working days');
        corrections.push('Add mandatory rest day after 6th consecutive day');
      }
      break;
  }

  return {
    isValid: violations.length === 0,
    violations,
    warnings,
    corrections,
  };
}

export const policyRoutes = {
  getCurrentPolicies,
  getRoleMatrix,
  validatePolicy,
};
