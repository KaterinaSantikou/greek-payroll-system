import { Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { isAuthenticated } from '../replitAuth';

// Normalized timesheet data contract
export interface TimesheetData {
  employeeId: string;
  period: string;
  totalHours: number;
  earningsBreakdown: {
    [earningsCode: string]: {
      hours: number;
      rate: number;
      amount: number;
      description: string;
      effectiveDate: string;
    };
  };
  deductions: {
    [deductionCode: string]: {
      amount: number;
      description: string;
      mandatory: boolean;
    };
  };
  metadata: {
    lastUpdated: string;
    dataSource: 'final' | 'draft';
    approvalStatus: 'pending' | 'approved' | 'rejected';
    complianceFlags: string[];
  };
}

const periodSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  payrollPeriod: z.enum(['weekly', 'biweekly', 'monthly'])
});

// GET /api/timesheets/{period} - Normalized hours by earnings code
export async function getTimesheetsByPeriod(req: Request, res: Response) {
  try {
    const { period } = req.params;
    const { employeeId, departmentId } = req.query;
    
    // Parse period parameter (YYYY-MM-DD or period identifier)
    const periodData = parsePeriod(period);
    
    // Get timesheets with normalized earnings breakdown
    const timesheets = await getNormalizedTimesheets(
      periodData,
      employeeId as string,
      departmentId as string
    );

    // Apply role-based filtering
    const userId = req.user?.claims?.sub;
    const userRole = await getUserRole(userId);
    const filteredTimesheets = await applyRoleBasedFiltering(timesheets, userRole, userId);

    res.json({
      period: periodData,
      timesheets: filteredTimesheets,
      metadata: {
        totalRecords: filteredTimesheets.length,
        lastUpdated: new Date().toISOString(),
        dataIntegrity: 'final',
        complianceStatus: 'validated'
      }
    });
  } catch (error) {
    console.error('Error fetching timesheets:', error);
    res.status(500).json({ error: 'Failed to fetch timesheets' });
  }
}

// GET /api/timesheets/{period}/summary - Aggregated summary by earnings codes
export async function getTimesheetSummary(req: Request, res: Response) {
  try {
    const { period } = req.params;
    const periodData = parsePeriod(period);
    
    const summary = await generateTimesheetSummary(periodData);
    
    res.json({
      period: periodData,
      summary,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating timesheet summary:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
}

// Helper functions
async function getNormalizedTimesheets(
  period: any, 
  employeeId?: string, 
  departmentId?: string
): Promise<TimesheetData[]> {
  // Mock normalized timesheet data with proper earnings code breakdown
  const mockTimesheets: TimesheetData[] = [
    {
      employeeId: 'emp-001',
      period: period.identifier,
      totalHours: 42.5,
      earningsBreakdown: {
        'REG': {
          hours: 40.0,
          rate: 15.00,
          amount: 600.00,
          description: 'Regular Hours',
          effectiveDate: '2025-01-01T00:00:00Z'
        },
        'OT': {
          hours: 2.5,
          rate: 22.50, // 1.5x overtime rate
          amount: 56.25,
          description: 'Overtime Premium',
          effectiveDate: '2025-01-01T00:00:00Z'
        },
        'MEAL': {
          hours: 0,
          rate: 0,
          amount: 11.00,
          description: 'Meal Voucher',
          effectiveDate: '2025-01-01T00:00:00Z'
        }
      },
      deductions: {
        'TAX': {
          amount: 139.65,
          description: 'Income Tax',
          mandatory: true
        },
        'EFKA': {
          amount: 43.56,
          description: 'EFKA Social Insurance',
          mandatory: true
        }
      },
      metadata: {
        lastUpdated: new Date().toISOString(),
        dataSource: 'final',
        approvalStatus: 'approved',
        complianceFlags: []
      }
    },
    {
      employeeId: 'emp-002',
      period: period.identifier,
      totalHours: 48.0,
      earningsBreakdown: {
        'REG': {
          hours: 40.0,
          rate: 14.50,
          amount: 580.00,
          description: 'Regular Hours',
          effectiveDate: '2025-01-01T00:00:00Z'
        },
        'OT': {
          hours: 6.0,
          rate: 21.75,
          amount: 130.50,
          description: 'Overtime Premium',
          effectiveDate: '2025-01-01T00:00:00Z'
        },
        'SUN': {
          hours: 2.0,
          rate: 17.40, // 1.2x Sunday premium
          amount: 34.80,
          description: 'Sunday Premium',
          effectiveDate: '2025-01-01T00:00:00Z'
        },
        'MEAL': {
          hours: 0,
          rate: 0,
          amount: 11.00,
          description: 'Meal Voucher',
          effectiveDate: '2025-01-01T00:00:00Z'
        }
      },
      deductions: {
        'TAX': {
          amount: 158.37,
          description: 'Income Tax',
          mandatory: true
        },
        'EFKA': {
          amount: 49.44,
          description: 'EFKA Social Insurance',
          mandatory: true
        }
      },
      metadata: {
        lastUpdated: new Date().toISOString(),
        dataSource: 'final',
        approvalStatus: 'approved',
        complianceFlags: ['excessive-overtime']
      }
    }
  ];

  // Filter by employee or department if specified
  return mockTimesheets.filter(timesheet => {
    if (employeeId && timesheet.employeeId !== employeeId) return false;
    // In real implementation, would check department membership
    return true;
  });
}

async function generateTimesheetSummary(period: any) {
  const timesheets = await getNormalizedTimesheets(period);
  
  const summary = {
    totalEmployees: timesheets.length,
    totalHours: timesheets.reduce((sum, t) => sum + t.totalHours, 0),
    totalGrossPay: 0,
    earningsCodeBreakdown: {} as Record<string, { hours: number; amount: number; employees: number }>,
    complianceIssues: 0
  };

  // Aggregate earnings by code
  timesheets.forEach(timesheet => {
    Object.entries(timesheet.earningsBreakdown).forEach(([code, data]) => {
      if (!summary.earningsCodeBreakdown[code]) {
        summary.earningsCodeBreakdown[code] = { hours: 0, amount: 0, employees: 0 };
      }
      summary.earningsCodeBreakdown[code].hours += data.hours;
      summary.earningsCodeBreakdown[code].amount += data.amount;
      summary.earningsCodeBreakdown[code].employees++;
    });
    
    summary.totalGrossPay += Object.values(timesheet.earningsBreakdown)
      .reduce((sum, earning) => sum + earning.amount, 0);
    
    if (timesheet.metadata.complianceFlags.length > 0) {
      summary.complianceIssues++;
    }
  });

  return summary;
}

function parsePeriod(period: string) {
  // Parse period string (e.g., "2025-W03", "2025-01", "2025-01-15")
  if (period.includes('W')) {
    // Weekly period
    const [year, week] = period.split('-W');
    return {
      identifier: period,
      type: 'weekly',
      year: parseInt(year),
      week: parseInt(week),
      startDate: getWeekStartDate(parseInt(year), parseInt(week)),
      endDate: getWeekEndDate(parseInt(year), parseInt(week))
    };
  } else if (period.length === 7) {
    // Monthly period (YYYY-MM)
    const [year, month] = period.split('-');
    return {
      identifier: period,
      type: 'monthly',
      year: parseInt(year),
      month: parseInt(month),
      startDate: new Date(parseInt(year), parseInt(month) - 1, 1),
      endDate: new Date(parseInt(year), parseInt(month), 0)
    };
  } else {
    // Daily period (YYYY-MM-DD)
    return {
      identifier: period,
      type: 'daily',
      startDate: new Date(period),
      endDate: new Date(period)
    };
  }
}

function getWeekStartDate(year: number, week: number): Date {
  const firstDayOfYear = new Date(year, 0, 1);
  const daysToAdd = (week - 1) * 7 - firstDayOfYear.getDay() + 1;
  return new Date(year, 0, 1 + daysToAdd);
}

function getWeekEndDate(year: number, week: number): Date {
  const startDate = getWeekStartDate(year, week);
  return new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000);
}

async function getUserRole(userId: string): Promise<string> {
  // In production, would query user role from database
  return 'manager'; // Mock role
}

async function applyRoleBasedFiltering(
  timesheets: TimesheetData[], 
  role: string, 
  userId: string
): Promise<TimesheetData[]> {
  // Apply role-based data filtering
  switch (role) {
    case 'employee':
      // Employees can only see their own timesheets
      return timesheets.filter(t => t.employeeId === userId);
    case 'manager':
      // Managers can see their department's timesheets
      return timesheets; // Mock: return all for demo
    case 'hr':
    case 'payroll':
    case 'auditor':
      // Full access
      return timesheets;
    default:
      return [];
  }
}

export const timesheetRoutes = {
  getTimesheetsByPeriod,
  getTimesheetSummary
};