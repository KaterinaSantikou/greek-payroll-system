import { Router } from "express";
import { db } from "../db";
import { employees, payrollRuns, timesheets, shifts, punchEvents, properties } from "@shared/schema";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { isAuthenticated } from "../replitAuth";
import { format, parseISO, startOfWeek, endOfWeek } from "date-fns";

const router = Router();

// Helper function to get current employee from auth
async function getCurrentEmployee(req: any) {
  const userId = req.user?.claims?.sub;
  if (!userId) {
    throw new Error('Not authenticated');
  }
  
  const [employee] = await db
    .select()
    .from(employees)
    .where(eq(employees.name, userId)) // Using name as lookup for now
    .limit(1);
    
  if (!employee) {
    throw new Error('Employee not found');
  }
  
  return employee;
}

// Get next payday information
router.get('/payday', isAuthenticated, async (req, res) => {
  try {
    const employee = await getCurrentEmployee(req);
    const period = req.query.period as string || format(new Date(), 'yyyy-MM');
    const lang = req.query.lang as string || 'en';

    // Simplified payday response
    const nextPayday = new Date();
    nextPayday.setDate(25); // Assume 25th of month

    const response = {
      period,
      payDate: nextPayday,
      status: 'planned',
      netEstimate: 2850.00, // Example amount
      isLate: false,
      splitPayouts: false,
      currency: 'EUR',
      locale: lang === 'el' ? 'el-GR' : 'en-US'
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting payday info:', error);
    res.status(500).json({ error: 'Failed to get payday information' });
  }
});

// Get timesheet summary for current week
router.get('/timesheets/summary', isAuthenticated, async (req, res) => {
  try {
    const employee = await getCurrentEmployee(req);
    const weekParam = req.query.week as string;
    const lang = req.query.lang as string || 'en';
    
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

    // Simplified summary
    const response = {
      week: format(weekStart, "yyyy-'W'II"),
      weekStart,
      weekEnd,
      scheduled: 40.0,
      worked: 38.5,
      approved: 38.5,
      pending: 0,
      exceptions: 0,
      hasExceptions: false,
      locale: lang === 'el' ? 'el-GR' : 'en-US'
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting timesheet summary:', error);
    res.status(500).json({ error: 'Failed to get timesheet summary' });
  }
});

// Get leave balance
router.get('/leave/balance', isAuthenticated, async (req, res) => {
  try {
    const employee = await getCurrentEmployee(req);
    const currentYear = new Date().getFullYear();
    
    // Greek leave entitlement calculation
    const yearsOfService = 2; // Example
    let annualEntitlement = 20; // Base 20 days
    
    if (yearsOfService >= 2) annualEntitlement += 1;
    if (yearsOfService >= 10) annualEntitlement += 1;
    if (yearsOfService >= 15) annualEntitlement += 1;

    const used = 5; // Example used days
    const remaining = Math.max(0, annualEntitlement - used);

    const nextHoliday = {
      name: 'Επιφάνεια',
      date: new Date('2025-01-06'),
      nameEn: 'Epiphany'
    };

    const response = {
      year: currentYear,
      entitlement: annualEntitlement,
      used,
      remaining,
      pendingRequests: [],
      nextHoliday,
      yearsOfService
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting leave balance:', error);
    res.status(500).json({ error: 'Failed to get leave balance' });
  }
});

// Get pending leave requests
router.get('/leave/requests', isAuthenticated, async (req, res) => {
  try {
    const employee = await getCurrentEmployee(req);
    const status = req.query.status as string;
    
    // Return empty requests for now
    res.json([]);
  } catch (error) {
    console.error('Error getting leave requests:', error);
    res.status(500).json({ error: 'Failed to get leave requests' });
  }
});

// Get upcoming shifts
router.get('/schedule/upcoming', isAuthenticated, async (req, res) => {
  try {
    const employee = await getCurrentEmployee(req);
    const limit = parseInt(req.query.limit as string) || 3;
    
    // Example upcoming shifts
    const upcomingShifts = [
      {
        shiftId: 'shift-1',
        date: new Date(),
        startTime: '09:00',
        endTime: '17:00',
        propertyId: 'prop-1',
        propertyName: 'Hotel Athena',
        departmentId: 'dept-1',
        warnings: [],
        duration: 8
      }
    ];

    res.json(upcomingShifts);
  } catch (error) {
    console.error('Error getting upcoming shifts:', error);
    res.status(500).json({ error: 'Failed to get upcoming shifts' });
  }
});

// Get Digital Work Card coverage
router.get('/dwc/coverage', isAuthenticated, async (req, res) => {
  try {
    const employee = await getCurrentEmployee(req);
    const dateParam = req.query.date as string || format(new Date(), 'yyyy-MM-dd');
    
    const response = {
      date: dateParam,
      coveragePercent: 95,
      lastSync: new Date(Date.now() - 300000), // 5 minutes ago
      discrepancies: [],
      punchCount: 4,
      expectedPunches: 4,
      timelineEvents: [
        { time: new Date(), type: 'in', location: 'Main Entrance', status: 'verified' },
        { time: new Date(), type: 'out', location: 'Main Entrance', status: 'verified' }
      ]
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting DWC coverage:', error);
    res.status(500).json({ error: 'Failed to get Digital Work Card coverage' });
  }
});

// Get employee tasks/to-dos
router.get('/tasks', isAuthenticated, async (req, res) => {
  try {
    const employee = await getCurrentEmployee(req);
    const limit = parseInt(req.query.limit as string) || 5;
    
    const tasks = [];
    
    // Check for missing bank details (use available fields)
    if (!employee.bankIban) {
      tasks.push({
        id: 'bank_iban',
        type: 'document',
        title: 'Add Bank IBAN',
        titleEl: 'Προσθήκη IBAN Τράπεζας',
        description: 'Bank account required for salary payments',
        descriptionEl: 'Απαιτείται λογαριασμός τράπεζας για πληρωμή μισθού',
        priority: 'high',
        deepLink: '/employee/profile#banking'
      });
    }
    
    if (!employee.afm) {
      tasks.push({
        id: 'tax_id',
        type: 'document',
        title: 'Add Tax ID (AFM)',
        titleEl: 'Προσθήκη ΑΦΜ',
        description: 'Greek tax identification number required',
        descriptionEl: 'Απαιτείται ελληνικός αριθμός φορολογικού μητρώου',
        priority: 'high',
        deepLink: '/employee/profile#tax'
      });
    }

    if (!employee.amka) {
      tasks.push({
        id: 'amka',
        type: 'document',
        title: 'Add Social Security Number (AMKA)',
        titleEl: 'Προσθήκη ΑΜΚΑ',
        description: 'Social security number required for insurance',
        descriptionEl: 'Απαιτείται αριθμός κοινωνικής ασφάλισης',
        priority: 'high',
        deepLink: '/employee/profile#insurance'
      });
    }

    const limitedTasks = tasks.slice(0, limit);

    res.json({
      tasks: limitedTasks,
      totalCount: tasks.length
    });
  } catch (error) {
    console.error('Error getting employee tasks:', error);
    res.status(500).json({ error: 'Failed to get employee tasks' });
  }
});

// Get recent payslips
router.get('/payslips', isAuthenticated, async (req, res) => {
  try {
    const employee = await getCurrentEmployee(req);
    const limit = parseInt(req.query.limit as string) || 6;
    
    // Example payslips
    const recentPayslips = [
      {
        payslipId: 'pay-2025-01',
        period: '2025-01',
        netPay: '2850.00',
        grossPay: '3200.00',
        status: 'final',
        generatedAt: new Date(),
        downloadUrl: '/api/portal/payslips/pay-2025-01/download',
        previewUrl: '/api/portal/payslips/pay-2025-01/preview',
        isWatermarked: false
      }
    ];

    res.json(recentPayslips);
  } catch (error) {
    console.error('Error getting recent payslips:', error);
    res.status(500).json({ error: 'Failed to get recent payslips' });
  }
});

// Get announcements
router.get('/announcements', isAuthenticated, async (req, res) => {
  try {
    const employee = await getCurrentEmployee(req);
    const limit = parseInt(req.query.limit as string) || 3;
    
    // Example announcements
    const announcements = [
      {
        id: 'ann-1',
        title: 'Holiday Schedule Update',
        titleEl: 'Ενημέρωση Προγράμματος Διακοπών',
        content: 'Updated holiday schedule for 2025',
        contentEl: 'Ενημερωμένο πρόγραμμα διακοπών για το 2025',
        isActive: true,
        validUntil: new Date('2025-12-31'),
        createdAt: new Date()
      }
    ];

    res.json(announcements);
  } catch (error) {
    console.error('Error getting announcements:', error);
    res.status(500).json({ error: 'Failed to get announcements' });
  }
});

// Explain-Your-Pay endpoint
router.get('/explain/:payslipId', isAuthenticated, async (req, res) => {
  try {
    const employee = await getCurrentEmployee(req);
    const { payslipId } = req.params;
    const lang = req.query.lang as string || 'en';
    
    // Example explanation
    const highlights = [
      {
        type: 'gross_change',
        amount: 100.00,
        direction: 'increase',
        description: lang === 'el' ? 
          'Αύξηση μικτών αποδοχών κατά €100.00' :
          'Gross pay increase of €100.00',
        reason: 'Base salary adjustment'
      }
    ];

    const response = {
      payslipId,
      period: '2025-01',
      highlights,
      fullExplanationUrl: `/api/explanations/${payslipId}?lang=${lang}`,
      comparison: {
        current: {
          gross: 3200.00,
          net: 2850.00
        },
        previous: {
          gross: 3100.00,
          net: 2750.00,
          period: '2024-12'
        },
        deltas: {
          gross: 100.00,
          net: 100.00
        }
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error explaining payslip:', error);
    res.status(500).json({ error: 'Failed to explain payslip' });
  }
});

export default router;