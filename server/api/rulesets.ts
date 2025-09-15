import { Request, Response } from 'express';
import { z } from 'zod';

// Ruleset data contract with effective dates
export interface PayrollRuleset {
  version: string;
  effectiveDate: string;
  expiryDate?: string;
  rules: {
    overtime: OvertimeRules;
    nightPremium: NightPremiumRules;
    sundayPremium: SundayPremiumRules;
    minimumWage: MinimumWageRules;
    mealVouchers: MealVoucherRules;
    tipPooling: TipPoolingRules;
    deductions: DeductionRules;
  };
  metadata: {
    createdBy: string;
    createdAt: string;
    approvalStatus: 'draft' | 'approved' | 'active' | 'expired';
    complianceFramework: string[];
    lastAuditDate: string;
  };
}

interface OvertimeRules {
  dailyThreshold: number; // Hours before overtime kicks in
  weeklyThreshold: number;
  multiplier: number; // e.g., 1.5 for time-and-a-half
  maxDailyOT: number; // Maximum overtime hours per day
  maxWeeklyOT: number; // Maximum overtime hours per week
  consecutiveDayLimit: number; // Max consecutive days with OT
  weekendMultiplier?: number; // Additional weekend premium
  holidayMultiplier?: number; // Holiday overtime multiplier
}

interface NightPremiumRules {
  startTime: string; // "22:00"
  endTime: string; // "06:00"
  multiplier: number; // e.g., 1.25 for 25% night premium
  minimumHours: number; // Minimum hours to qualify
  applicableDays: string[]; // ["monday", "tuesday", ...]
}

interface SundayPremiumRules {
  multiplier: number; // e.g., 1.2 for 20% Sunday premium
  applicableEmployeeTypes: string[];
  exemptCategories: string[];
  minimumHours: number;
}

interface MinimumWageRules {
  baseRate: number; // Current minimum wage
  youthmultiplier?: number; // Under 18 rate
  apprenticeMultiplier?: number; // Apprentice rate
  effectiveRegions: string[];
  annualIncreaseDate: string;
}

interface MealVoucherRules {
  dailyAmount: number; // €11.00 per day in Greece
  eligibilityMinHours: number; // Minimum hours to qualify
  maxPerMonth: number; // Monthly cap
  taxExemptAmount: number; // Tax-free portion
}

interface TipPoolingRules {
  enabled: boolean;
  distributionMethod: 'equal' | 'hours_based' | 'performance_based';
  eligibleRoles: string[];
  managerParticipation: boolean;
  minimumShiftHours: number;
  distributionFrequency: 'daily' | 'weekly' | 'monthly';
}

interface DeductionRules {
  incomeTax: {
    brackets: { min: number; max: number; rate: number }[];
    personalAllowance: number;
    solidarityTax?: { threshold: number; rate: number };
  };
  socialInsurance: {
    employeeRate: number; // EFKA employee contribution
    employerRate: number; // EFKA employer contribution
    maxEarnings: number; // Ceiling for contributions
    categories: Record<string, number>; // Different rates by employee category
  };
  other: {
    unionDues?: number;
    parkingFee?: number;
    advancePayments?: boolean;
  };
}

// GET /api/rulesets/current - Current active ruleset
export async function getCurrentRuleset(req: Request, res: Response) {
  try {
    const currentRuleset = await getActiveRuleset();

    // Apply role-based field filtering
    const userId = req.user?.claims?.sub;
    const userRole = await getUserRole(userId);
    const filteredRuleset = await applyRulesetRoleFiltering(
      currentRuleset,
      userRole
    );

    res.json({
      ruleset: filteredRuleset,
      retrievedAt: new Date().toISOString(),
      cacheExpiry: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min cache
    });
  } catch (error) {
    console.error('Error fetching current ruleset:', error);
    res.status(500).json({ error: 'Failed to fetch ruleset' });
  }
}

// GET /api/rulesets/effective/{date} - Ruleset effective on specific date
export async function getRulesetByDate(req: Request, res: Response) {
  try {
    const { date } = req.params;
    const effectiveDate = new Date(date);

    if (isNaN(effectiveDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const ruleset = await getRulesetForDate(effectiveDate);

    if (!ruleset) {
      return res
        .status(404)
        .json({ error: 'No ruleset found for specified date' });
    }

    const userId = req.user?.claims?.sub;
    const userRole = await getUserRole(userId);
    const filteredRuleset = await applyRulesetRoleFiltering(ruleset, userRole);

    res.json({
      requestedDate: date,
      ruleset: filteredRuleset,
      retrievedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching ruleset by date:', error);
    res.status(500).json({ error: 'Failed to fetch ruleset' });
  }
}

// GET /api/rulesets/history - Ruleset change history
export async function getRulesetHistory(req: Request, res: Response) {
  try {
    const { limit = 10, offset = 0 } = req.query;

    const userId = req.user?.claims?.sub;
    const userRole = await getUserRole(userId);

    // Only HR and Auditors can see full history
    if (!['hr', 'auditor', 'payroll'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const history = await getRulesetChangeHistory(
      parseInt(limit as string),
      parseInt(offset as string)
    );

    res.json({
      history,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        total: history.length,
      },
      retrievedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching ruleset history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
}

// Helper functions
async function getActiveRuleset(): Promise<PayrollRuleset> {
  // Mock current Greek payroll ruleset
  return {
    version: '2025.1',
    effectiveDate: '2025-01-01T00:00:00Z',
    rules: {
      overtime: {
        dailyThreshold: 8.0,
        weeklyThreshold: 40.0,
        multiplier: 1.5,
        maxDailyOT: 3.0, // Max 3 hours OT per day
        maxWeeklyOT: 8.0, // Max 8 hours OT per week
        consecutiveDayLimit: 6,
        weekendMultiplier: 1.75, // Weekend OT gets additional premium
        holidayMultiplier: 2.0,
      },
      nightPremium: {
        startTime: '22:00',
        endTime: '06:00',
        multiplier: 1.25,
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
      },
      sundayPremium: {
        multiplier: 1.2,
        applicableEmployeeTypes: ['full-time', 'part-time'],
        exemptCategories: ['management'],
        minimumHours: 4.0,
      },
      minimumWage: {
        baseRate: 760.0, // Monthly minimum wage in Greece (2025)
        youthmultiplier: 0.87, // Under 18 rate (87% of minimum)
        apprenticeMultiplier: 0.75, // Apprentice rate
        effectiveRegions: ['GR'],
        annualIncreaseDate: '2025-01-01',
      },
      mealVouchers: {
        dailyAmount: 11.0, // €11 per day
        eligibilityMinHours: 6.0,
        maxPerMonth: 220.0, // 20 working days × €11
        taxExemptAmount: 11.0, // Fully tax-exempt up to €11/day
      },
      tipPooling: {
        enabled: true,
        distributionMethod: 'hours_based',
        eligibleRoles: ['server', 'bartender', 'housekeeping'],
        managerParticipation: false,
        minimumShiftHours: 4.0,
        distributionFrequency: 'weekly',
      },
      deductions: {
        incomeTax: {
          brackets: [
            { min: 0, max: 10000, rate: 0.09 },
            { min: 10000, max: 20000, rate: 0.22 },
            { min: 20000, max: 30000, rate: 0.28 },
            { min: 30000, max: 40000, rate: 0.36 },
            { min: 40000, max: Number.MAX_VALUE, rate: 0.44 },
          ],
          personalAllowance: 3500, // €3,500 annual personal allowance
          solidarityTax: { threshold: 12000, rate: 0.0225 }, // 2.25% on income > €12k
        },
        socialInsurance: {
          employeeRate: 0.1597, // 15.97% employee EFKA contribution
          employerRate: 0.2437, // 24.37% employer EFKA contribution
          maxEarnings: 72600, // Annual ceiling for 2025
          categories: {
            main: 0.1597,
            'heavy-hazardous': 0.1697, // +1% for heavy/hazardous work
            media: 0.1497, // -1% for media workers
          },
        },
        other: {
          unionDues: 15.0, // Monthly union dues if applicable
          parkingFee: 25.0, // Monthly parking if applicable
          advancePayments: true, // Allow advance deductions
        },
      },
    },
    metadata: {
      createdBy: 'system',
      createdAt: '2024-12-01T00:00:00Z',
      approvalStatus: 'active',
      complianceFramework: [
        'Greek-Labor-Law-2025',
        'EFKA-Regulations',
        'AADE-Tax-Code',
      ],
      lastAuditDate: '2025-01-15T00:00:00Z',
    },
  };
}

async function getRulesetForDate(date: Date): Promise<PayrollRuleset | null> {
  // In production, would query historical rulesets
  const activeRuleset = await getActiveRuleset();

  // Check if date falls within active ruleset period
  const effectiveDate = new Date(activeRuleset.effectiveDate);
  const expiryDate = activeRuleset.expiryDate
    ? new Date(activeRuleset.expiryDate)
    : new Date('2025-12-31');

  if (date >= effectiveDate && date <= expiryDate) {
    return activeRuleset;
  }

  return null; // No ruleset found for date
}

async function getRulesetChangeHistory(limit: number, offset: number) {
  // Mock ruleset history
  return [
    {
      version: '2025.1',
      effectiveDate: '2025-01-01T00:00:00Z',
      changes: [
        'Updated minimum wage to €760',
        'Adjusted EFKA rates',
        'New solidarity tax threshold',
      ],
      changedBy: 'hr-admin',
      approvedBy: 'payroll-manager',
      status: 'active',
    },
    {
      version: '2024.4',
      effectiveDate: '2024-12-01T00:00:00Z',
      expiryDate: '2024-12-31T23:59:59Z',
      changes: ['Year-end tax adjustments', 'Holiday overtime rates'],
      changedBy: 'hr-admin',
      approvedBy: 'payroll-manager',
      status: 'expired',
    },
  ].slice(offset, offset + limit);
}

async function getUserRole(userId: string): Promise<string> {
  // Mock role resolution
  return 'manager';
}

async function applyRulesetRoleFiltering(
  ruleset: PayrollRuleset,
  role: string
): Promise<Partial<PayrollRuleset>> {
  switch (role) {
    case 'employee':
      // Employees get limited view - only basic rates and thresholds
      return {
        version: ruleset.version,
        effectiveDate: ruleset.effectiveDate,
        rules: {
          overtime: {
            dailyThreshold: ruleset.rules.overtime.dailyThreshold,
            weeklyThreshold: ruleset.rules.overtime.weeklyThreshold,
            multiplier: ruleset.rules.overtime.multiplier,
            maxDailyOT: ruleset.rules.overtime.maxDailyOT,
            maxWeeklyOT: ruleset.rules.overtime.maxWeeklyOT,
            consecutiveDayLimit: ruleset.rules.overtime.consecutiveDayLimit,
            weekendMultiplier: ruleset.rules.overtime.weekendMultiplier,
            holidayMultiplier: ruleset.rules.overtime.holidayMultiplier,
          },
          nightPremium: ruleset.rules.nightPremium,
          sundayPremium: ruleset.rules.sundayPremium,
          minimumWage: {
            baseRate: ruleset.rules.minimumWage.baseRate,
            effectiveRegions: ruleset.rules.minimumWage.effectiveRegions,
            annualIncreaseDate: ruleset.rules.minimumWage.annualIncreaseDate,
            youthmultiplier: ruleset.rules.minimumWage.youthmultiplier,
            apprenticeMultiplier:
              ruleset.rules.minimumWage.apprenticeMultiplier,
          },
          mealVouchers: ruleset.rules.mealVouchers,
          tipPooling: ruleset.rules.tipPooling,
          deductions: ruleset.rules.deductions,
        },
      };
    case 'manager':
      // Managers get full operational rules but not system metadata
      return {
        version: ruleset.version,
        effectiveDate: ruleset.effectiveDate,
        expiryDate: ruleset.expiryDate,
        rules: ruleset.rules,
      };
    case 'hr':
    case 'payroll':
    case 'auditor':
      // Full access to all ruleset data
      return ruleset;
    default:
      throw new Error('Unauthorized access to rulesets');
  }
}

export const rulesetRoutes = {
  getCurrentRuleset,
  getRulesetByDate,
  getRulesetHistory,
};
