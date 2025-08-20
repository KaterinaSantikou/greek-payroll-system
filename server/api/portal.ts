import { Router } from "express";
import { db } from "../db";
import { employees, payrollRuns, timesheets, shifts, punchEvents, properties } from "@shared/schema";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { isAuthenticated } from "../replitAuth";
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

const router = Router();

// Helper function to get current employee from auth
async function getCurrentEmployee(req: any) {
  const userId = req.user?.claims?.sub;
  if (!userId) {
    throw new Error('Not authenticated');
  }
  
  // For demo purposes, return a mock employee
  // In production, this would query the actual database
  const mockEmployee = {
    id: `emp-${userId}`,
    name: 'Katerina Santikos',
    email: 'katerina@santikoshotel.gr',
    afm: '123456789',
    amka: '12345678901',
    bankIban: 'GR1234567890123456789012',
    status: 'active' as const,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  return mockEmployee;
}

// Helper to format currency with locale
function formatCurrencyValue(amount: number, locale: string = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

// Helper to mask IBAN (show only last 4 digits)
function maskIban(iban: string): string {
  if (!iban || iban.length < 4) return '****';
  return '****' + iban.slice(-4);
}

// Main aggregate dashboard endpoint
router.get('/employee/dashboard', isAuthenticated, async (req, res) => {
  try {
    const employee = await getCurrentEmployee(req);
    const period = req.query.period as string || format(new Date(), 'yyyy-MM');
    const week = req.query.week as string || format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-'W'II");
    const lang = req.query.lang as string || 'en-US';
    const locale = lang === 'el-GR' ? 'el-GR' : 'en-US';

    // Generate mock data that follows the contract
    const currentDate = new Date();
    const payDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 25);
    
    // Payday information
    const payday = {
      date: format(payDate, 'yyyy-MM-dd'),
      status: 'finalized' as const,
      net_estimate: 1482.30,
      currency: 'EUR' as const,
      is_late: false,
      split_payouts: false
    };

    // Hours information
    const hours = {
      worked: 38.5,
      scheduled: 40.0,
      exceptions: 0,
      status: 'approved' as const,
      week_start: format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    };

    // Leave balance
    const yearsOfService = 2;
    let annualEntitlement = 20;
    if (yearsOfService >= 2) annualEntitlement += 1;
    if (yearsOfService >= 10) annualEntitlement += 1;
    if (yearsOfService >= 15) annualEntitlement += 1;

    const leave = {
      remaining_days: 8.0,
      used_days: 13.0,
      entitlement_days: annualEntitlement,
      pending: 0,
      next_holiday: {
        name: 'Επιφάνεια',
        name_en: 'Epiphany',
        date: '2025-01-06'
      }
    };

    // Explain-Your-Pay information
    const explain = {
      payslip_id: 'PS-2025-08-00123',
      period: period,
      deltas: [
        { type: 'overtime', description: '+4h overtime', description_el: '+4ω υπερωρίες', amount: 85.20 },
        { type: 'leave', description: '-2 leave days', description_el: '-2 ημέρες άδειας', amount: -120.00 }
      ],
      coverage_pct: 98.7,
      has_changes: true
    };

    // Upcoming shifts
    const shifts = [
      {
        date: format(new Date(Date.now() + 86400000), 'yyyy-MM-dd'), // Tomorrow
        start: '14:00',
        end: '22:00',
        site: 'Glyfada',
        site_el: 'Γλυφάδα',
        property_id: 'prop-1',
        department: 'Reception',
        department_el: 'Υποδοχή',
        warnings: []
      }
    ];

    // Digital Work Card status
    const dwc = {
      coverage_pct: 96.7,
      last_sync: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
      drift: 0,
      expected_punches: 4,
      actual_punches: 4,
      discrepancies: []
    };

    // To-dos (missing information)
    const todos = [];
    
    if (!employee.bankIban) {
      todos.push({
        id: 'bank_iban_missing',
        type: 'document',
        label: 'Add IBAN',
        label_el: 'Προσθήκη IBAN',
        description: 'Bank account required for salary payments',
        description_el: 'Απαιτείται λογαριασμός τράπεζας για πληρωμή μισθού',
        priority: 'high',
        link: '/me/banking',
        estimated_time: '2min'
      });
    }
    
    if (!employee.afm) {
      todos.push({
        id: 'tax_id_missing',
        type: 'document',
        label: 'Add Tax ID (AFM)',
        label_el: 'Προσθήκη ΑΦΜ',
        description: 'Greek tax identification required',
        description_el: 'Απαιτείται ελληνικός ΑΦΜ',
        priority: 'high',
        link: '/me/tax-info',
        estimated_time: '1min'
      });
    }

    if (!employee.amka) {
      todos.push({
        id: 'amka_missing',
        type: 'document',
        label: 'Add Social Security (AMKA)',
        label_el: 'Προσθήκη ΑΜΚΑ',
        description: 'Social security number required',
        description_el: 'Απαιτείται ΑΜΚΑ',
        priority: 'high',
        link: '/me/insurance',
        estimated_time: '1min'
      });
    }

    // Recent payslips
    const payslips = [
      {
        payslip_id: 'PS-2025-01-001',
        month: '2025-01',
        period: 'January 2025',
        period_el: 'Ιανουάριος 2025',
        net: 1460.10,
        gross: 1650.00,
        pdf_url: '/api/portal/payslips/PS-2025-01-001/download',
        preview_url: '/api/portal/payslips/PS-2025-01-001/preview',
        is_final: true,
        generated_at: new Date(2025, 0, 31).toISOString()
      }
    ];

    // HR Announcements
    const announcements = [
      {
        id: 'ann-holiday-2025',
        title: 'Holiday Schedule Update',
        title_el: 'Ενημέρωση Προγράμματος Διακοπών',
        summary: 'Updated holiday schedule for 2025',
        summary_el: 'Ενημερωμένο πρόγραμμα διακοπών για το 2025',
        link: '/announcements/holiday-2025',
        priority: 'normal',
        valid_until: '2025-12-31',
        created_at: new Date().toISOString()
      }
    ];

    // Employee context (for multi-employment scenarios)
    const context = {
      employee_id: employee.id,
      property_name: 'Hotel Athena',
      property_name_el: 'Ξενοδοχείο Αθηνά',
      role: 'Front Desk Agent',
      role_el: 'Υπάλληλος Υποδοχής',
      employment_status: 'active',
      access_level: 'employee',
      last_login: new Date(Date.now() - 2 * 3600000).toISOString(), // 2 hours ago
      session_expires_at: new Date(Date.now() + 8 * 3600000).toISOString() // 8 hours from now
    };

    const response = {
      payday,
      hours,
      leave,
      explain,
      shifts,
      dwc,
      todos,
      payslips,
      announcements,
      context,
      metadata: {
        generated_at: new Date().toISOString(),
        locale,
        period,
        week,
        cache_duration: 300, // 5 minutes
        data_freshness: {
          payday: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
          hours: new Date(Date.now() - 120000).toISOString(), // 2 minutes ago
          dwc: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
          general: new Date(Date.now() - 60000).toISOString() // 1 minute ago
        }
      }
    };

    // Add cache headers for performance
    res.set({
      'Cache-Control': 'private, max-age=300', // 5 minutes
      'ETag': `"${Buffer.from(JSON.stringify(response.metadata)).toString('base64')}"`
    });

    res.json(response);
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    res.status(500).json({ 
      error: 'Failed to get dashboard data',
      code: 'DASHBOARD_ERROR'
    });
  }
});

// Individual widget endpoints for targeted updates
router.get('/payday', isAuthenticated, async (req, res) => {
  try {
    const employee = await getCurrentEmployee(req);
    const period = req.query.period as string || format(new Date(), 'yyyy-MM');
    
    const currentDate = new Date();
    const payDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 25);
    
    const response = {
      date: format(payDate, 'yyyy-MM-dd'),
      status: 'finalized',
      net_estimate: 1482.30,
      currency: 'EUR',
      is_late: false,
      split_payouts: false,
      updated_at: new Date(Date.now() - 60000).toISOString()
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting payday info:', error);
    res.status(500).json({ error: 'Failed to get payday information' });
  }
});

router.get('/timesheets/summary', isAuthenticated, async (req, res) => {
  try {
    const employee = await getCurrentEmployee(req);
    const week = req.query.week as string || format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-'W'II");
    
    const response = {
      worked: 38.5,
      scheduled: 40.0,
      exceptions: 0,
      status: 'approved',
      week_start: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      updated_at: new Date(Date.now() - 120000).toISOString()
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting timesheet summary:', error);
    res.status(500).json({ error: 'Failed to get timesheet summary' });
  }
});

router.get('/dwc/coverage', isAuthenticated, async (req, res) => {
  try {
    const employee = await getCurrentEmployee(req);
    
    const response = {
      coverage_pct: 96.7,
      last_sync: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      drift: 0,
      expected_punches: 4,
      actual_punches: 4,
      discrepancies: [],
      updated_at: new Date(Date.now() - 900000).toISOString()
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting DWC coverage:', error);
    res.status(500).json({ error: 'Failed to get Digital Work Card coverage' });
  }
});

// Event tracking endpoint
router.post('/events', isAuthenticated, async (req, res) => {
  try {
    const employee = await getCurrentEmployee(req);
    const { event, properties, timestamp } = req.body;
    
    // Log the event (in a real system, this would go to analytics)
    console.log(`📊 Dashboard Event: ${event}`, {
      employee_id: employee.id,
      properties,
      timestamp: timestamp || new Date().toISOString(),
      user_agent: req.get('User-Agent'),
      ip: req.ip
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking event:', error);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

// Audit trail for sensitive actions (payslip downloads, etc.)
router.post('/audit', isAuthenticated, async (req, res) => {
  try {
    const employee = await getCurrentEmployee(req);
    const { action, resource_id, details } = req.body;
    
    // Log audit event (in a real system, this would be stored securely)
    console.log(`🔒 Audit Log: ${action}`, {
      employee_id: employee.id,
      resource_id,
      details,
      timestamp: new Date().toISOString(),
      ip: req.ip,
      user_agent: req.get('User-Agent')
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error logging audit event:', error);
    res.status(500).json({ error: 'Failed to log audit event' });
  }
});

export default router;