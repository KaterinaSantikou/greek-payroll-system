import { db } from "./db";
import { 
  employees, 
  payrollCalculations, 
  properties, 
  punchEvents,
  timesheets,
  shifts,
  overtimeRequests,
  exceptions
} from "@shared/schema";
import { eq, and, gte, lte, desc, asc } from "drizzle-orm";
import { format, startOfYear, endOfYear, startOfMonth, endOfMonth, subMonths } from "date-fns";

export interface PayslipData {
  payslipId: string;
  employeeId: string;
  period: string;
  grossWages: number;
  netWages: number;
  basicSalary: number;
  allowances: {
    food: number;
    transport: number;
    uniform: number;
    position: number;
    experience: number;
    marriage: number;
    family: number;
  };
  overtime: {
    regular: number;
    sunday: number;
    night: number;
    holiday: number;
  };
  bonuses: {
    christmas: number;
    easter: number;
    vacation: number;
  };
  deductions: {
    incomeTax: number;
    efkaEmployee: number;
    specialTax: number;
  };
  employerContributions: {
    efkaEmployer: number;
    unemploymentFund: number;
  };
  workingDays: number;
  totalHours: number;
  overtimeHours: number;
  leaveHours: number;
  generatedAt: Date;
}

export interface YearEndCertificate {
  certificateId: string;
  employeeId: string;
  year: number;
  totalGrossWages: number;
  totalNetWages: number;
  totalTaxWithheld: number;
  totalEfkaContributions: number;
  totalWorkingDays: number;
  totalHours: number;
  totalOvertimeHours: number;
  totalLeaveHours: number;
  monthlyBreakdown: Array<{
    month: string;
    grossWages: number;
    taxWithheld: number;
    workingDays: number;
  }>;
  generatedAt: Date;
}

export interface EmployeeDashboard {
  employeeId: string;
  currentPeriod: {
    hoursWorked: number;
    overtimeHours: number;
    leaveBalance: {
      annual: number;
      sick: number;
      personal: number;
    };
    upcomingShifts: Array<{
      date: string;
      startTime: string;
      endTime: string;
      department: string;
    }>;
  };
  recentActivity: {
    lastPunchIn?: Date;
    lastPunchOut?: Date;
    pendingExceptions: number;
    pendingLeaveRequests: number;
  };
  quickStats: {
    monthlyHours: number;
    yearlyHours: number;
    totalLeaveUsed: number;
  };
}

export interface ManagerDashboard {
  managerId: string;
  propertyId: string;
  currentlyOnSite: Array<{
    employeeId: string;
    name: string;
    department: string;
    punchInTime: Date;
    expectedEndTime: Date;
    status: 'on_time' | 'overtime' | 'late_start' | 'missing_punch';
  }>;
  pendingApprovals: {
    overtime: number;
    exceptions: number;
    leaveRequests: number;
    scheduleChanges: number;
  };
  todayMetrics: {
    scheduledEmployees: number;
    actuallyWorking: number;
    absentEmployees: number;
    overtimeHours: number;
  };
  departmentSummary: Array<{
    department: string;
    staffCount: number;
    hoursWorked: number;
    overtimeHours: number;
    efficiency: number;
  }>;
}

export interface PunchHistoryEntry {
  punchId: string;
  employeeId: string;
  timestamp: Date;
  type: 'in' | 'out' | 'break_start' | 'break_end';
  location?: string;
  method: 'mobile' | 'kiosk' | 'web' | 'manual';
  status: 'valid' | 'flagged' | 'corrected';
  correction?: {
    originalTimestamp: Date;
    reason: string;
    approvedBy: string;
    approvedAt: Date;
  };
}

export class SelfServiceManager {
  /**
   * Generate employee payslip for specific period
   */
  async generatePayslip(employeeId: string, period: string): Promise<PayslipData> {
    const employee = await db.select().from(employees).where(eq(employees.employeeId, employeeId)).limit(1);
    if (!employee.length) {
      throw new Error('Employee not found');
    }

    const emp = employee[0];
    const startDate = new Date(period + '-01');
    const endDate = endOfMonth(startDate);

    // Calculate basic salary and allowances  
    const basicSalary = parseFloat(emp.salary || '0');
    const allowances = {
      food: 150.00, // Food allowance
      transport: 80.00, // Transport allowance
      uniform: 30.00, // Uniform allowance
      position: 200.00, // Position allowance
      experience: 100.00, // Experience allowance
      marriage: 50.00, // Marriage allowance
      family: 75.00 // Family allowance
    };

    // Calculate overtime (mock data - would come from timesheets)
    const overtime = {
      regular: 180.00, // Regular overtime
      sunday: 120.00, // Sunday premium
      night: 85.00, // Night shift premium
      holiday: 95.00 // Holiday premium
    };

    // Calculate bonuses (Greek mandatory bonuses)
    const bonuses = {
      christmas: period.endsWith('12') ? basicSalary * 0.083 : 0, // Christmas bonus (1/12)
      easter: period.endsWith('04') ? basicSalary * 0.042 : 0, // Easter bonus (1/2 of 1/12)
      vacation: period.endsWith('07') ? basicSalary * 0.042 : 0 // Vacation bonus (1/2 of 1/12)
    };

    // Calculate gross wages
    const totalAllowances = Object.values(allowances).reduce((sum, val) => sum + val, 0);
    const totalOvertime = Object.values(overtime).reduce((sum, val) => sum + val, 0);
    const totalBonuses = Object.values(bonuses).reduce((sum, val) => sum + val, 0);
    const grossWages = basicSalary + totalAllowances + totalOvertime + totalBonuses;

    // Calculate deductions
    const incomeTax = grossWages * 0.22; // 22% income tax
    const efkaEmployee = grossWages * 0.16; // 16% EFKA employee contribution
    const specialTax = grossWages > 12000 ? grossWages * 0.022 : 0; // Solidarity tax

    const deductions = {
      incomeTax,
      efkaEmployee,
      specialTax
    };

    // Calculate employer contributions
    const employerContributions = {
      efkaEmployer: grossWages * 0.2478, // 24.78% EFKA employer contribution
      unemploymentFund: grossWages * 0.006 // 0.6% unemployment fund
    };

    const totalDeductions = Object.values(deductions).reduce((sum, val) => sum + val, 0);
    const netWages = grossWages - totalDeductions;

    const payslip: PayslipData = {
      payslipId: `PAY_${employeeId}_${period}`,
      employeeId,
      period,
      grossWages,
      netWages,
      basicSalary,
      allowances,
      overtime,
      bonuses,
      deductions,
      employerContributions,
      workingDays: 22, // Standard working days
      totalHours: 176, // Standard monthly hours (22 days * 8 hours)
      overtimeHours: 12, // Example overtime hours
      leaveHours: 8, // Example leave hours
      generatedAt: new Date()
    };

    return payslip;
  }

  /**
   * Generate year-end tax certificate
   */
  async generateYearEndCertificate(employeeId: string, year: number): Promise<YearEndCertificate> {
    const employee = await db.select().from(employees).where(eq(employees.employeeId, employeeId)).limit(1);
    if (!employee.length) {
      throw new Error('Employee not found');
    }

    // Generate monthly breakdown for the year
    const monthlyBreakdown = [];
    let totalGrossWages = 0;
    let totalTaxWithheld = 0;
    let totalWorkingDays = 0;

    for (let month = 1; month <= 12; month++) {
      const period = `${year}-${month.toString().padStart(2, '0')}`;
      const payslip = await this.generatePayslip(employeeId, period);
      
      monthlyBreakdown.push({
        month: format(new Date(year, month - 1), 'MMMM'),
        grossWages: payslip.grossWages,
        taxWithheld: payslip.deductions.incomeTax + payslip.deductions.specialTax,
        workingDays: payslip.workingDays
      });

      totalGrossWages += payslip.grossWages;
      totalTaxWithheld += payslip.deductions.incomeTax + payslip.deductions.specialTax;
      totalWorkingDays += payslip.workingDays;
    }

    const certificate: YearEndCertificate = {
      certificateId: `CERT_${employeeId}_${year}`,
      employeeId,
      year,
      totalGrossWages,
      totalNetWages: totalGrossWages - totalTaxWithheld - (totalGrossWages * 0.16), // Minus tax and EFKA
      totalTaxWithheld,
      totalEfkaContributions: totalGrossWages * 0.16,
      totalWorkingDays,
      totalHours: totalWorkingDays * 8, // Assuming 8-hour workday
      totalOvertimeHours: 144, // Example total overtime for year
      totalLeaveHours: 160, // Example total leave hours (20 days * 8 hours)
      monthlyBreakdown,
      generatedAt: new Date()
    };

    return certificate;
  }

  /**
   * Get employee self-service dashboard
   */
  async getEmployeeDashboard(employeeId: string): Promise<EmployeeDashboard> {
    const employee = await db.select().from(employees).where(eq(employees.employeeId, employeeId)).limit(1);
    if (!employee.length) {
      throw new Error('Employee not found');
    }

    // Get current period data
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);

    // Mock upcoming shifts data
    const upcomingShifts = [
      {
        date: format(new Date(Date.now() + 86400000), 'yyyy-MM-dd'),
        startTime: '09:00',
        endTime: '17:00',
        department: 'Front Office'
      },
      {
        date: format(new Date(Date.now() + 2 * 86400000), 'yyyy-MM-dd'),
        startTime: '14:00',
        endTime: '22:00',
        department: 'Housekeeping'
      }
    ];

    const dashboard: EmployeeDashboard = {
      employeeId,
      currentPeriod: {
        hoursWorked: 120, // Current month hours worked
        overtimeHours: 8, // Current month overtime
        leaveBalance: {
          annual: 120, // Annual leave balance in hours
          sick: 40, // Sick leave balance
          personal: 24 // Personal leave balance
        },
        upcomingShifts
      },
      recentActivity: {
        lastPunchIn: new Date(Date.now() - 3600000 * 2), // 2 hours ago
        lastPunchOut: undefined, // Still on shift
        pendingExceptions: 1,
        pendingLeaveRequests: 0
      },
      quickStats: {
        monthlyHours: 176, // Standard monthly hours
        yearlyHours: 1850, // Year-to-date hours
        totalLeaveUsed: 80 // Hours of leave used this year
      }
    };

    return dashboard;
  }

  /**
   * Get manager dashboard with real-time data
   */
  async getManagerDashboard(managerId: string, propertyId: string): Promise<ManagerDashboard> {
    // Get all employees under this manager's property
    const propertyEmployees = await db
      .select()
      .from(employees);

    // Mock currently on-site data
    const currentlyOnSite = propertyEmployees.slice(0, 8).map(emp => ({
      employeeId: emp.employeeId,
      name: `${emp.firstName} ${emp.lastName}`,
      department: emp.position || 'General',
      punchInTime: new Date(Date.now() - Math.random() * 8 * 3600000), // Random punch-in within last 8 hours
      expectedEndTime: new Date(Date.now() + Math.random() * 4 * 3600000), // Random end within next 4 hours
      status: ['on_time', 'overtime', 'late_start'][Math.floor(Math.random() * 3)] as any
    }));

    // Mock department summary
    const departments = ['Front Office', 'Housekeeping', 'F&B', 'Maintenance'];
    const departmentSummary = departments.map(dept => ({
      department: dept,
      staffCount: Math.floor(Math.random() * 15) + 5,
      hoursWorked: Math.floor(Math.random() * 200) + 100,
      overtimeHours: Math.floor(Math.random() * 30) + 5,
      efficiency: Math.floor(Math.random() * 20) + 80
    }));

    const dashboard: ManagerDashboard = {
      managerId,
      propertyId,
      currentlyOnSite,
      pendingApprovals: {
        overtime: 3,
        exceptions: 2,
        leaveRequests: 5,
        scheduleChanges: 1
      },
      todayMetrics: {
        scheduledEmployees: propertyEmployees.length,
        actuallyWorking: currentlyOnSite.length,
        absentEmployees: propertyEmployees.length - currentlyOnSite.length,
        overtimeHours: 24
      },
      departmentSummary
    };

    return dashboard;
  }

  /**
   * Get employee punch history with corrections
   */
  async getPunchHistory(employeeId: string, startDate: Date, endDate: Date): Promise<PunchHistoryEntry[]> {
    // Mock punch history data
    const punchHistory: PunchHistoryEntry[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      // Generate morning punch-in
      const punchIn: PunchHistoryEntry = {
        punchId: `PUNCH_${employeeId}_${currentDate.getTime()}_IN`,
        employeeId,
        timestamp: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 9, 0),
        type: 'in',
        location: 'Main Entrance',
        method: 'mobile',
        status: 'valid'
      };

      // Generate evening punch-out
      const punchOut: PunchHistoryEntry = {
        punchId: `PUNCH_${employeeId}_${currentDate.getTime()}_OUT`,
        employeeId,
        timestamp: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 17, 0),
        type: 'out',
        location: 'Main Entrance',
        method: 'mobile',
        status: 'valid'
      };

      // Occasionally add a correction
      if (Math.random() > 0.9) {
        punchIn.status = 'corrected';
        punchIn.correction = {
          originalTimestamp: new Date(punchIn.timestamp.getTime() - 600000), // 10 minutes earlier
          reason: 'Forgot to punch in on time',
          approvedBy: 'MGR_001',
          approvedAt: new Date(punchIn.timestamp.getTime() + 3600000)
        };
      }

      punchHistory.push(punchIn, punchOut);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return punchHistory.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Submit time correction request
   */
  async submitTimeCorrection(
    employeeId: string,
    punchId: string,
    newTimestamp: Date,
    reason: string
  ): Promise<{ success: boolean; correctionId: string }> {
    const correctionId = `CORR_${Date.now()}`;

    // In a real implementation, this would update the database
    // For now, we'll simulate success
    const success = true;

    return { success, correctionId };
  }

  /**
   * Quick hire functionality for managers
   */
  async quickHire(managerId: string, employeeData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    position: string;
    department: string;
    startDate: Date;
    baseSalary: number;
    propertyId: string;
  }): Promise<{ success: boolean; employeeId: string }> {
    const employeeId = `EMP_QH_${Date.now()}`;

    // In a real implementation, this would create the employee record
    // and trigger onboarding workflows
    const success = true;

    return { success, employeeId };
  }

  /**
   * Approve overtime request
   */
  async approveOvertimeRequest(
    managerId: string,
    requestId: string,
    approved: boolean,
    notes?: string
  ): Promise<{ success: boolean }> {
    // In a real implementation, this would update the overtime request
    // and notify the employee
    const success = true;

    return { success };
  }

  /**
   * Get pending approvals for manager
   */
  async getPendingApprovals(managerId: string, propertyId: string): Promise<{
    overtime: any[];
    exceptions: any[];
    leaveRequests: any[];
    scheduleChanges: any[];
  }> {
    // Mock pending approvals data
    const pendingApprovals = {
      overtime: [
        {
          requestId: 'OT_001',
          employeeId: 'EMP_001',
          employeeName: 'Maria Papadopoulos',
          date: '2025-01-19',
          hours: 4,
          reason: 'Cover for absent colleague',
          requestedAt: new Date(Date.now() - 3600000)
        },
        {
          requestId: 'OT_002',
          employeeId: 'EMP_002',
          employeeName: 'Nikos Konstantinou',
          date: '2025-01-19',
          hours: 2,
          reason: 'Complete maintenance work',
          requestedAt: new Date(Date.now() - 7200000)
        }
      ],
      exceptions: [
        {
          exceptionId: 'EX_001',
          employeeId: 'EMP_003',
          employeeName: 'Sofia Dimitriou',
          type: 'Late arrival',
          date: '2025-01-18',
          reason: 'Traffic jam due to protest',
          requestedAt: new Date(Date.now() - 86400000)
        }
      ],
      leaveRequests: [
        {
          requestId: 'LV_001',
          employeeId: 'EMP_004',
          employeeName: 'Dimitris Nikolaou',
          type: 'Annual Leave',
          startDate: '2025-01-25',
          endDate: '2025-01-27',
          days: 3,
          requestedAt: new Date(Date.now() - 172800000)
        }
      ],
      scheduleChanges: [
        {
          changeId: 'SC_001',
          employeeId: 'EMP_005',
          employeeName: 'Elena Georgiou',
          originalShift: '09:00-17:00',
          requestedShift: '14:00-22:00',
          date: '2025-01-20',
          reason: 'Personal appointment',
          requestedAt: new Date(Date.now() - 43200000)
        }
      ]
    };

    return pendingApprovals;
  }
}