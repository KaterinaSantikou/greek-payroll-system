import { Request, Response } from 'express';
import { z } from 'zod';

// Payslip data contract with line items and deltas
export interface PayslipData {
  employeeId: string;
  employeeName: string;
  period: string;
  payDate: string;
  lineItems: PayslipLineItem[];
  summary: PayslipSummary;
  deltas: PayslipDeltas;
  metadata: PayslipMetadata;
  complianceInfo: ComplianceInfo;
}

interface PayslipLineItem {
  code: string;
  description: string;
  category: 'earnings' | 'deductions' | 'employer_contributions';
  units: number; // Hours, days, or quantity
  rate: number;
  amount: number;
  taxable: boolean;
  socialInsuranceSubject: boolean;
  effectiveDate: string;
  ruleReference: string; // Reference to ruleset version
}

interface PayslipSummary {
  totalEarnings: number;
  totalDeductions: number;
  netPay: number;
  taxableIncome: number;
  socialInsuranceBasis: number;
  employerCosts: number;
  ytdTotals: {
    grossPay: number;
    netPay: number;
    taxes: number;
    socialInsurance: number;
  };
}

interface PayslipDeltas {
  previousPeriod: string;
  changes: {
    [lineItemCode: string]: {
      previousAmount: number;
      currentAmount: number;
      delta: number;
      deltaPercentage: number;
      reason?: string;
    };
  };
  netPayDelta: number;
  netPayDeltaPercentage: number;
}

interface PayslipMetadata {
  generatedAt: string;
  generatedBy: string;
  payrollRunId: string;
  approvalStatus: 'draft' | 'approved' | 'paid' | 'voided';
  approvedBy?: string;
  approvalDate?: string;
  distributionMethod: 'bank_transfer' | 'cash' | 'check';
  bankAccount?: string;
  sepaReference?: string;
}

interface ComplianceInfo {
  erganiSubmitted: boolean;
  erganiSubmissionDate?: string;
  efkaReported: boolean;
  efkaReportDate?: string;
  aadeReported: boolean;
  aadeReportDate?: string;
  complianceFlags: string[];
  auditTrail: {
    timestamp: string;
    action: string;
    userId: string;
    details: string;
  }[];
}

// GET /api/payslips/{employee}/{period} - Individual payslip
export async function getPayslip(req: Request, res: Response) {
  try {
    const { employee, period } = req.params;
    const { includeDeltas = 'true', includePriorPeriods } = req.query;

    // Validate employee access
    const userId = req.user?.claims?.sub;
    const userRole = await getUserRole(userId);

    if (!(await canAccessPayslip(userId, userRole, employee))) {
      return res.status(403).json({ error: 'Unauthorized access to payslip' });
    }

    const payslip = await generatePayslip(
      employee,
      period,
      includeDeltas === 'true'
    );

    // Apply role-based filtering
    const filteredPayslip = await applyPayslipRoleFiltering(payslip, userRole);

    res.json({
      payslip: filteredPayslip,
      retrievedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching payslip:', error);
    res.status(500).json({ error: 'Failed to fetch payslip' });
  }
}

// GET /api/payslips/{employee}/history - Employee payslip history
export async function getPayslipHistory(req: Request, res: Response) {
  try {
    const { employee } = req.params;
    const { limit = 12, year } = req.query; // Default to 12 months

    const userId = req.user?.claims?.sub;
    const userRole = await getUserRole(userId);

    if (!(await canAccessPayslip(userId, userRole, employee))) {
      return res.status(403).json({ error: 'Unauthorized access to payslips' });
    }

    const history = await getPayslipHistoryData(
      employee,
      parseInt(limit as string),
      year as string
    );

    res.json({
      employeeId: employee,
      history: history.map(p => applyPayslipRoleFiltering(p, userRole)),
      retrievedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching payslip history:', error);
    res.status(500).json({ error: 'Failed to fetch payslip history' });
  }
}

// GET /api/payslips/bulk/{period} - Bulk payslips for period
export async function getBulkPayslips(req: Request, res: Response) {
  try {
    const { period } = req.params;
    const { department, status } = req.query;

    const userId = req.user?.claims?.sub;
    const userRole = await getUserRole(userId);

    // Only managers, HR, payroll can access bulk payslips
    if (!['manager', 'hr', 'payroll'].includes(userRole)) {
      return res
        .status(403)
        .json({ error: 'Insufficient permissions for bulk access' });
    }

    const payslips = await getBulkPayslipData(
      period,
      department as string,
      status as string
    );

    // Apply role filtering to each payslip
    const filteredPayslips = payslips.map(p =>
      applyPayslipRoleFiltering(p, userRole)
    );

    res.json({
      period,
      payslips: filteredPayslips,
      summary: generateBulkSummary(filteredPayslips),
      retrievedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching bulk payslips:', error);
    res.status(500).json({ error: 'Failed to fetch bulk payslips' });
  }
}

// Helper functions
async function generatePayslip(
  employeeId: string,
  period: string,
  includeDeltas: boolean
): Promise<PayslipData> {
  // Mock payslip generation
  const mockPayslip: PayslipData = {
    employeeId,
    employeeName: 'Maria Papadopoulos',
    period,
    payDate: '2025-01-31',
    lineItems: [
      {
        code: 'REG',
        description: 'Regular Hours (160 hours)',
        category: 'earnings',
        units: 160.0,
        rate: 15.0,
        amount: 2400.0,
        taxable: true,
        socialInsuranceSubject: true,
        effectiveDate: '2025-01-01T00:00:00Z',
        ruleReference: '2025.1',
      },
      {
        code: 'OT',
        description: 'Overtime Premium (12 hours)',
        category: 'earnings',
        units: 12.0,
        rate: 22.5,
        amount: 270.0,
        taxable: true,
        socialInsuranceSubject: true,
        effectiveDate: '2025-01-01T00:00:00Z',
        ruleReference: '2025.1',
      },
      {
        code: 'MEAL',
        description: 'Meal Vouchers (20 days)',
        category: 'earnings',
        units: 20.0,
        rate: 11.0,
        amount: 220.0,
        taxable: false,
        socialInsuranceSubject: false,
        effectiveDate: '2025-01-01T00:00:00Z',
        ruleReference: '2025.1',
      },
      {
        code: 'TAX',
        description: 'Income Tax',
        category: 'deductions',
        units: 1.0,
        rate: 0.22,
        amount: -587.4,
        taxable: false,
        socialInsuranceSubject: false,
        effectiveDate: '2025-01-01T00:00:00Z',
        ruleReference: '2025.1',
      },
      {
        code: 'EFKA_EE',
        description: 'EFKA Employee Contribution',
        category: 'deductions',
        units: 1.0,
        rate: 0.1597,
        amount: -426.54,
        taxable: false,
        socialInsuranceSubject: false,
        effectiveDate: '2025-01-01T00:00:00Z',
        ruleReference: '2025.1',
      },
      {
        code: 'EFKA_ER',
        description: 'EFKA Employer Contribution',
        category: 'employer_contributions',
        units: 1.0,
        rate: 0.2437,
        amount: 651.08,
        taxable: false,
        socialInsuranceSubject: false,
        effectiveDate: '2025-01-01T00:00:00Z',
        ruleReference: '2025.1',
      },
    ],
    summary: {
      totalEarnings: 2890.0,
      totalDeductions: 1013.94,
      netPay: 1876.06,
      taxableIncome: 2670.0,
      socialInsuranceBasis: 2670.0,
      employerCosts: 651.08,
      ytdTotals: {
        grossPay: 2890.0,
        netPay: 1876.06,
        taxes: 587.4,
        socialInsurance: 426.54,
      },
    },
    deltas: includeDeltas
      ? {
          previousPeriod: '2024-12',
          changes: {
            REG: {
              previousAmount: 2300.0,
              currentAmount: 2400.0,
              delta: 100.0,
              deltaPercentage: 4.35,
              reason: 'Minimum wage increase',
            },
            OT: {
              previousAmount: 225.0,
              currentAmount: 270.0,
              delta: 45.0,
              deltaPercentage: 20.0,
              reason: 'Additional overtime hours',
            },
          },
          netPayDelta: 120.15,
          netPayDeltaPercentage: 6.84,
        }
      : {
          previousPeriod: '',
          changes: {},
          netPayDelta: 0,
          netPayDeltaPercentage: 0,
        },
    metadata: {
      generatedAt: new Date().toISOString(),
      generatedBy: 'payroll-system',
      payrollRunId: `PR-${period}-001`,
      approvalStatus: 'approved',
      approvedBy: 'payroll-manager',
      approvalDate: '2025-01-30T14:30:00Z',
      distributionMethod: 'bank_transfer',
      bankAccount: 'GR16 0140 1050 1050 0200 5000 796',
      sepaReference: `SEPA-${period}-${employeeId}`,
    },
    complianceInfo: {
      erganiSubmitted: true,
      erganiSubmissionDate: '2025-01-30T16:00:00Z',
      efkaReported: true,
      efkaReportDate: '2025-01-30T16:15:00Z',
      aadeReported: true,
      aadeReportDate: '2025-01-30T16:30:00Z',
      complianceFlags: [],
      auditTrail: [
        {
          timestamp: '2025-01-30T14:30:00Z',
          action: 'payslip_approved',
          userId: 'payroll-manager',
          details: 'Monthly payslip approved for payment',
        },
        {
          timestamp: '2025-01-30T16:00:00Z',
          action: 'ergani_submitted',
          userId: 'system',
          details: 'Employee data submitted to ERGANI II',
        },
      ],
    },
  };

  return mockPayslip;
}

async function getPayslipHistoryData(
  employeeId: string,
  limit: number,
  year?: string
): Promise<PayslipData[]> {
  // Mock history generation
  const periods = ['2025-01', '2024-12', '2024-11', '2024-10'].slice(0, limit);

  return Promise.all(
    periods.map(period => generatePayslip(employeeId, period, true))
  );
}

async function getBulkPayslipData(
  period: string,
  department?: string,
  status?: string
): Promise<PayslipData[]> {
  // Mock bulk payslip data
  const employees = ['emp-001', 'emp-002', 'emp-003'];

  return Promise.all(employees.map(emp => generatePayslip(emp, period, false)));
}

function generateBulkSummary(payslips: Partial<PayslipData>[]) {
  return {
    totalEmployees: payslips.length,
    totalGrossPay: payslips.reduce(
      (sum, p) => sum + (p.summary?.totalEarnings || 0),
      0
    ),
    totalNetPay: payslips.reduce((sum, p) => sum + (p.summary?.netPay || 0), 0),
    totalTaxes: payslips.reduce(
      (sum, p) => sum + (p.summary?.ytdTotals?.taxes || 0),
      0
    ),
    totalEmployerCosts: payslips.reduce(
      (sum, p) => sum + (p.summary?.employerCosts || 0),
      0
    ),
  };
}

async function getUserRole(userId: string): Promise<string> {
  return 'manager'; // Mock role
}

async function canAccessPayslip(
  userId: string,
  role: string,
  employeeId: string
): Promise<boolean> {
  switch (role) {
    case 'employee':
      return userId === employeeId; // Can only access own payslip
    case 'manager':
    case 'hr':
    case 'payroll':
    case 'auditor':
      return true; // Can access all payslips
    default:
      return false;
  }
}

async function applyPayslipRoleFiltering(
  payslip: PayslipData,
  role: string
): Promise<Partial<PayslipData>> {
  switch (role) {
    case 'employee':
      // Employees get full payslip but no system metadata
      return {
        employeeId: payslip.employeeId,
        employeeName: payslip.employeeName,
        period: payslip.period,
        payDate: payslip.payDate,
        lineItems: payslip.lineItems,
        summary: payslip.summary,
        deltas: payslip.deltas,
        metadata: {
          payrollRunId: payslip.metadata.payrollRunId,
          approvalStatus: payslip.metadata.approvalStatus,
          distributionMethod: payslip.metadata.distributionMethod,
          bankAccount: payslip.metadata.bankAccount?.replace(
            /(.{4})(.*)(.{4})/,
            '$1****$3'
          ), // Mask bank account
          generatedAt: payslip.metadata.generatedAt,
          generatedBy: payslip.metadata.generatedBy,
          approvedBy: payslip.metadata.approvedBy,
          approvalDate: payslip.metadata.approvalDate,
          sepaReference: payslip.metadata.sepaReference,
        },
      };
    case 'manager':
      // Managers get full payslip but limited audit trail
      return {
        ...payslip,
        complianceInfo: {
          erganiSubmitted: payslip.complianceInfo.erganiSubmitted,
          efkaReported: payslip.complianceInfo.efkaReported,
          aadeReported: payslip.complianceInfo.aadeReported,
          complianceFlags: payslip.complianceInfo.complianceFlags,
          erganiSubmissionDate: payslip.complianceInfo.erganiSubmissionDate,
          efkaReportDate: payslip.complianceInfo.efkaReportDate,
          aadeReportDate: payslip.complianceInfo.aadeReportDate,
          auditTrail: payslip.complianceInfo.auditTrail.filter(entry =>
            ['payslip_approved', 'payment_processed'].includes(entry.action)
          ),
        },
      };
    case 'hr':
    case 'payroll':
    case 'auditor':
      // Full access to all payslip data
      return payslip;
    default:
      throw new Error('Unauthorized access to payslip');
  }
}

export const payslipRoutes = {
  getPayslip,
  getPayslipHistory,
  getBulkPayslips,
};
