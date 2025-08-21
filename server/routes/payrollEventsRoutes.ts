/**
 * Greek Payroll Events API Routes
 * 
 * Handles specialized Greek payroll events:
 * - Sick Leave (50% first 3 days, EFKA reimbursement)
 * - Maternity/Paternity/Parental Leave
 * - Unpaid Leave
 * - Severance/Termination calculations
 */

import type { Express } from "express";
import { isAuthenticated } from "../replitAuth";
import { greekPayrollEventsService } from "../services/GreekPayrollEventsService";
import { storage } from "../storage";

export function registerPayrollEventsRoutes(app: Express): void {

  // Calculate sick leave payments (50% first 3 days, EFKA from day 4)
  app.post('/api/payroll-events/sick-leave/calculate', isAuthenticated, async (req, res) => {
    try {
      const { totalDays, dailySalary, employeeAge } = req.body;
      
      if (!totalDays || !dailySalary || totalDays <= 0 || dailySalary <= 0) {
        return res.status(400).json({ 
          error: 'Valid total days and daily salary are required' 
        });
      }
      
      const calculation = greekPayrollEventsService.calculateSickLeave(
        parseInt(totalDays),
        parseFloat(dailySalary),
        parseInt(employeeAge) || 25
      );
      
      const reimbursementDetails = greekPayrollEventsService.getEfkaReimbursementDetails(
        parseInt(totalDays),
        parseFloat(dailySalary)
      );
      
      res.json({
        ...calculation,
        reimbursementDetails,
        summary: greekPayrollEventsService.getPayrollEventSummary('sick_leave', calculation)
      });
    } catch (error) {
      console.error('Error calculating sick leave:', error);
      res.status(500).json({ error: 'Failed to calculate sick leave' });
    }
  });

  // Calculate maternity/paternity/parental leave
  app.post('/api/payroll-events/family-leave/calculate', isAuthenticated, async (req, res) => {
    try {
      const { leaveType, totalDays, dailySalary, employmentDurationMonths } = req.body;
      
      if (!leaveType || !totalDays || !dailySalary) {
        return res.status(400).json({ 
          error: 'Leave type, total days, and daily salary are required' 
        });
      }
      
      if (!['maternity', 'paternity', 'parental'].includes(leaveType)) {
        return res.status(400).json({ 
          error: 'Leave type must be maternity, paternity, or parental' 
        });
      }
      
      const calculation = greekPayrollEventsService.calculateMaternityLeave(
        leaveType as 'maternity' | 'paternity' | 'parental',
        parseInt(totalDays),
        parseFloat(dailySalary),
        parseInt(employmentDurationMonths) || 0
      );
      
      res.json({
        ...calculation,
        summary: greekPayrollEventsService.getPayrollEventSummary(`${leaveType}_leave`, calculation)
      });
    } catch (error) {
      console.error('Error calculating family leave:', error);
      res.status(500).json({ error: 'Failed to calculate family leave' });
    }
  });

  // Calculate unpaid leave (Άδεια άνευ αποδοχών)
  app.post('/api/payroll-events/unpaid-leave/calculate', isAuthenticated, async (req, res) => {
    try {
      const { totalDays } = req.body;
      
      if (!totalDays || totalDays <= 0) {
        return res.status(400).json({ 
          error: 'Valid total days is required' 
        });
      }
      
      const calculation = greekPayrollEventsService.calculateUnpaidLeave(parseInt(totalDays));
      
      res.json({
        ...calculation,
        summary: greekPayrollEventsService.getPayrollEventSummary('unpaid_leave', calculation)
      });
    } catch (error) {
      console.error('Error calculating unpaid leave:', error);
      res.status(500).json({ error: 'Failed to calculate unpaid leave' });
    }
  });

  // Calculate severance and termination pay (Law 4093/2012)
  app.post('/api/payroll-events/severance/calculate', isAuthenticated, async (req, res) => {
    try {
      const { 
        terminationDate, 
        hireDate, 
        terminationType, 
        monthlySalary, 
        lastPayDate,
        hasUnusedVacation,
        unusedVacationDays 
      } = req.body;
      
      if (!terminationDate || !hireDate || !terminationType || !monthlySalary) {
        return res.status(400).json({ 
          error: 'Termination date, hire date, termination type, and monthly salary are required' 
        });
      }
      
      const terminationDetails = {
        terminationDate: new Date(terminationDate),
        hireDate: new Date(hireDate),
        terminationType: terminationType as 'with_notice' | 'without_notice' | 'mutual' | 'resignation',
        monthlySalary: parseFloat(monthlySalary),
        lastPayDate: lastPayDate ? new Date(lastPayDate) : new Date(),
        hasUnusedVacation: hasUnusedVacation || false,
        unusedVacationDays: unusedVacationDays ? parseInt(unusedVacationDays) : 0
      };
      
      const calculation = greekPayrollEventsService.calculateSeverance(terminationDetails);
      
      res.json({
        ...calculation,
        summary: greekPayrollEventsService.getPayrollEventSummary('severance', calculation)
      });
    } catch (error) {
      console.error('Error calculating severance:', error);
      res.status(500).json({ error: 'Failed to calculate severance' });
    }
  });

  // Validate payroll event eligibility
  app.post('/api/payroll-events/validate', isAuthenticated, async (req, res) => {
    try {
      const { eventType, employeeData, eventDetails } = req.body;
      
      if (!eventType) {
        return res.status(400).json({ error: 'Event type is required' });
      }
      
      const validation = greekPayrollEventsService.validatePayrollEvent(
        eventType,
        employeeData || {},
        eventDetails || {}
      );
      
      res.json({
        eventType,
        ...validation,
        summary: greekPayrollEventsService.getPayrollEventSummary(eventType, {})
      });
    } catch (error) {
      console.error('Error validating payroll event:', error);
      res.status(500).json({ error: 'Failed to validate payroll event' });
    }
  });

  // Get payroll event types and descriptions
  app.get('/api/payroll-events/types', isAuthenticated, async (req, res) => {
    try {
      const eventTypes = [
        {
          id: 'sick_leave',
          name: 'Sick Leave',
          nameGreek: 'Άδεια ασθενείας',
          description: '50% pay for first 3 days (employer), EFKA benefit from day 4',
          maxDays: 30,
          requiresDocuments: ['Medical certificate']
        },
        {
          id: 'maternity_leave',
          name: 'Maternity Leave',
          nameGreek: 'Άδεια μητρότητας',
          description: '8 weeks employer paid, 9 weeks EFKA subsidy',
          maxDays: 119,
          requiresDocuments: ['Medical certificate', 'Birth certificate']
        },
        {
          id: 'paternity_leave',
          name: 'Paternity Leave',
          nameGreek: 'Άδεια πατρότητας',
          description: '14 days fully paid by employer',
          maxDays: 14,
          requiresDocuments: ['Birth certificate']
        },
        {
          id: 'parental_leave',
          name: 'Parental Leave',
          nameGreek: 'Γονική άδεια',
          description: 'Up to 4 months with OAED (ΔΥΠΑ) subsidy',
          maxDays: 120,
          requiresDocuments: ['Birth certificate', 'OAED application']
        },
        {
          id: 'unpaid_leave',
          name: 'Unpaid Leave',
          nameGreek: 'Άδεια άνευ αποδοχών',
          description: 'Zero pay, contract active, no EFKA contributions',
          maxDays: 365,
          requiresDocuments: ['Employee application', 'Employer approval']
        }
      ];
      
      res.json(eventTypes);
    } catch (error) {
      console.error('Error fetching payroll event types:', error);
      res.status(500).json({ error: 'Failed to fetch payroll event types' });
    }
  });

  // Process payroll event (create leave record and calculate impact)
  app.post('/api/payroll-events/process', isAuthenticated, async (req, res) => {
    try {
      const { 
        employeeId, 
        eventType, 
        startDate, 
        endDate, 
        totalDays,
        dailySalary,
        reason,
        documents 
      } = req.body;
      
      if (!employeeId || !eventType || !startDate || !endDate) {
        return res.status(400).json({ 
          error: 'Employee ID, event type, start date, and end date are required' 
        });
      }
      
      // Validate the event
      const validation = greekPayrollEventsService.validatePayrollEvent(
        eventType,
        { employeeId }, // Would normally fetch full employee data
        { totalDays, startDate, endDate }
      );
      
      if (!validation.isValid) {
        return res.status(400).json({ 
          error: 'Event validation failed',
          validationErrors: validation.errors,
          warnings: validation.warnings
        });
      }
      
      // Calculate the payroll impact
      let calculation = {};
      
      switch (eventType) {
        case 'sick_leave':
          calculation = greekPayrollEventsService.calculateSickLeave(
            parseInt(totalDays),
            parseFloat(dailySalary)
          );
          break;
        case 'maternity_leave':
        case 'paternity_leave':
        case 'parental_leave':
          calculation = greekPayrollEventsService.calculateMaternityLeave(
            eventType.replace('_leave', '') as 'maternity' | 'paternity' | 'parental',
            parseInt(totalDays),
            parseFloat(dailySalary),
            12 // Default employment duration
          );
          break;
        case 'unpaid_leave':
          calculation = greekPayrollEventsService.calculateUnpaidLeave(parseInt(totalDays));
          break;
      }
      
      // This would normally create a leave record in the database
      const leaveRecord = {
        leaveId: `leave_${Date.now()}`,
        employeeId,
        eventType,
        startDate,
        endDate,
        totalDays: parseInt(totalDays),
        status: 'processed',
        calculation,
        processedAt: new Date().toISOString()
      };
      
      res.json({
        success: true,
        leaveRecord,
        calculation,
        summary: greekPayrollEventsService.getPayrollEventSummary(eventType, calculation)
      });
    } catch (error) {
      console.error('Error processing payroll event:', error);
      res.status(500).json({ error: 'Failed to process payroll event' });
    }
  });

  // Get EFKA reimbursement applications
  app.get('/api/payroll-events/efka-reimbursements', isAuthenticated, async (req, res) => {
    try {
      const { propertyId, year, month } = req.query;
      
      // This would normally query the database for EFKA reimbursement cases
      const reimbursements = [
        {
          employeeId: 'sample_employee_1',
          employeeName: 'Sample Employee',
          sickLeaveDays: 7,
          employerPaid: 3,
          efkaReimbursed: 4,
          reimbursementAmount: 240.00,
          status: 'pending',
          applicationDate: new Date().toISOString(),
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];
      
      res.json({
        period: `${year}-${month}`,
        propertyId: propertyId || 'all',
        totalReimbursements: reimbursements.length,
        totalAmount: reimbursements.reduce((sum, r) => sum + r.reimbursementAmount, 0),
        reimbursements
      });
    } catch (error) {
      console.error('Error fetching EFKA reimbursements:', error);
      res.status(500).json({ error: 'Failed to fetch EFKA reimbursements' });
    }
  });

  // Generate payroll events compliance report
  app.get('/api/payroll-events/compliance-report', isAuthenticated, async (req, res) => {
    try {
      const { propertyId, year } = req.query;
      
      const report = {
        reportDate: new Date().toISOString(),
        propertyId: propertyId || 'all',
        year: year || new Date().getFullYear(),
        summary: {
          totalEvents: 0,
          byType: {
            sick_leave: { count: 0, totalDays: 0, employerCost: 0, efkaReimbursed: 0 },
            maternity_leave: { count: 0, totalDays: 0, employerCost: 0, subsidyReceived: 0 },
            paternity_leave: { count: 0, totalDays: 0, employerCost: 0 },
            unpaid_leave: { count: 0, totalDays: 0, efkaSavings: 0 },
            severance: { count: 0, totalAmount: 0, taxFreeAmount: 0 }
          }
        },
        complianceIssues: [],
        recommendations: [
          'Ensure all sick leave cases have proper medical certificates',
          'Apply for EFKA reimbursements within 30-day deadline',
          'Report all leave events to ERGANI within required timeframes',
          'Document all family leave subsidies in APD reporting',
          'Track unpaid leave periods for EFKA contribution calculations'
        ],
        erganiSubmissions: {
          pending: 0,
          submitted: 0,
          overdue: 0
        },
        efkaReimbursements: {
          pending: 0,
          approved: 0,
          totalAmount: 0
        }
      };
      
      res.json(report);
    } catch (error) {
      console.error('Error generating compliance report:', error);
      res.status(500).json({ error: 'Failed to generate compliance report' });
    }
  });
}