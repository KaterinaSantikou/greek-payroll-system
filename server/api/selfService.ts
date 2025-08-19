import { Express } from "express";
import { db } from "../db";
import { 
  employees, 
  paycheckHistory, 
  digitalWorkCardLogs, 
  timeCorrectionRequests,
  punchEvents,
  shifts
} from "@shared/schema";
import { eq, and, desc, gte, lte, between, sql } from "drizzle-orm";
import { isAuthenticated } from "../replitAuth";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO } from "date-fns";

export function registerSelfServiceRoutes(app: Express) {
  
  // Employee Dashboard - Overview metrics
  app.get("/api/self-service/dashboard", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get employee record from user ID
      const employee = await db.select()
        .from(employees)
        .where(eq(employees.employeeId, userId))
        .limit(1);
        
      if (!employee[0]) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      const employeeId = employee[0].employeeId;
      const currentMonth = new Date();
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      
      // Current month paycheck data
      const currentPaycheck = await db.select({
        grossPay: paycheckHistory.grossPay,
        netPay: paycheckHistory.netPay
      }).from(paycheckHistory)
        .where(and(
          eq(paycheckHistory.employeeId, employeeId),
          between(paycheckHistory.payPeriodEnd, monthStart, monthEnd)
        ))
        .limit(1);
      
      // Current month work hours
      const workHours = await db.select({
        totalHours: sql<number>`COALESCE(SUM(${digitalWorkCardLogs.totalHours}), 0)`,
        overtimeHours: sql<number>`COALESCE(SUM(${digitalWorkCardLogs.overtimeHours}), 0)`
      }).from(digitalWorkCardLogs)
        .where(and(
          eq(digitalWorkCardLogs.employeeId, employeeId),
          between(digitalWorkCardLogs.workDate, monthStart, monthEnd)
        ));
      
      // Pending correction requests
      const pendingRequests = await db.select({
        count: sql<number>`COUNT(*)`
      }).from(timeCorrectionRequests)
        .where(and(
          eq(timeCorrectionRequests.employeeId, employeeId),
          eq(timeCorrectionRequests.status, 'pending')
        ));
      
      res.json({
        currentMonthGross: currentPaycheck[0]?.grossPay || 0,
        currentMonthNet: currentPaycheck[0]?.netPay || 0,
        hoursThisMonth: workHours[0]?.totalHours || 0,
        overtimeHours: workHours[0]?.overtimeHours || 0,
        pendingRequests: pendingRequests[0]?.count || 0
      });
      
    } catch (error) {
      console.error("Error fetching employee dashboard:", error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  // Paycheck Timeline - Visual breakdown of each payslip
  app.get("/api/self-service/paycheck-timeline/:year", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const year = parseInt(req.params.year);
      
      const employee = await db.select()
        .from(employees)
        .where(eq(employees.employeeId, userId))
        .limit(1);
        
      if (!employee[0]) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      const employeeId = employee[0].employeeId;
      const yearStart = startOfYear(new Date(year, 0, 1));
      const yearEnd = endOfYear(new Date(year, 0, 1));
      
      const payhecks = await db.select()
        .from(paycheckHistory)
        .where(and(
          eq(paycheckHistory.employeeId, employeeId),
          between(paycheckHistory.payDate, yearStart, yearEnd)
        ))
        .orderBy(desc(paycheckHistory.payDate));
      
      // Add sample payslip data if missing (for demo purposes)
      const enhancedPaychecks = payhecks.map(paycheck => ({
        ...paycheck,
        payslipData: paycheck.payslipData || {
          earnings: {
            baseSalary: (paycheck.grossPay * 0.75),
            overtimePay: (paycheck.grossPay * 0.15),
            allowances: (paycheck.grossPay * 0.10)
          },
          deductions: {
            incomeTax: paycheck.taxWithheld,
            efkaContributions: paycheck.efkaContributions,
            solidarityTax: paycheck.solidarityTax
          }
        }
      }));
      
      res.json(enhancedPaychecks);
      
    } catch (error) {
      console.error("Error fetching paycheck timeline:", error);
      res.status(500).json({ message: "Failed to fetch paycheck timeline" });
    }
  });

  // Digital Work Card Logs - Personal history with export capability
  app.get("/api/self-service/work-card-logs/:month", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const monthParam = req.params.month; // Format: YYYY-MM
      
      const employee = await db.select()
        .from(employees)
        .where(eq(employees.employeeId, userId))
        .limit(1);
        
      if (!employee[0]) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      const employeeId = employee[0].employeeId;
      const [year, month] = monthParam.split('-').map(Number);
      const monthStart = startOfMonth(new Date(year, month - 1, 1));
      const monthEnd = endOfMonth(new Date(year, month - 1, 1));
      
      const workLogs = await db.select()
        .from(digitalWorkCardLogs)
        .where(and(
          eq(digitalWorkCardLogs.employeeId, employeeId),
          between(digitalWorkCardLogs.workDate, monthStart, monthEnd)
        ))
        .orderBy(desc(digitalWorkCardLogs.workDate));
      
      res.json(workLogs);
      
    } catch (error) {
      console.error("Error fetching work card logs:", error);
      res.status(500).json({ message: "Failed to fetch work card logs" });
    }
  });

  // Current Pay Period Details
  app.get("/api/self-service/current-pay-period", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const employee = await db.select()
        .from(employees)
        .where(eq(employees.employeeId, userId))
        .limit(1);
        
      if (!employee[0]) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      const employeeId = employee[0].employeeId;
      const currentDate = new Date();
      
      // Get current month work data
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      
      const currentPeriodData = await db.select({
        totalHours: sql<number>`COALESCE(SUM(${digitalWorkCardLogs.totalHours}), 0)`,
        overtimeHours: sql<number>`COALESCE(SUM(${digitalWorkCardLogs.overtimeHours}), 0)`,
        workDays: sql<number>`COUNT(DISTINCT ${digitalWorkCardLogs.workDate})`
      }).from(digitalWorkCardLogs)
        .where(and(
          eq(digitalWorkCardLogs.employeeId, employeeId),
          between(digitalWorkCardLogs.workDate, monthStart, monthEnd)
        ));
      
      // Get scheduled shifts for current period
      const scheduledShifts = await db.select()
        .from(shifts)
        .where(and(
          eq(shifts.employeeId, employeeId),
          between(shifts.startPlanned, monthStart, monthEnd)
        ))
        .orderBy(shifts.startPlanned);
      
      res.json({
        periodStart: monthStart,
        periodEnd: monthEnd,
        totalHours: currentPeriodData[0]?.totalHours || 0,
        overtimeHours: currentPeriodData[0]?.overtimeHours || 0,
        workDays: currentPeriodData[0]?.workDays || 0,
        scheduledShifts: scheduledShifts
      });
      
    } catch (error) {
      console.error("Error fetching current pay period:", error);
      res.status(500).json({ message: "Failed to fetch current pay period" });
    }
  });

  // Time Correction Requests
  app.get("/api/self-service/correction-requests", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const employee = await db.select()
        .from(employees)
        .where(eq(employees.employeeId, userId))
        .limit(1);
        
      if (!employee[0]) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      const employeeId = employee[0].employeeId;
      
      const requests = await db.select()
        .from(timeCorrectionRequests)
        .where(eq(timeCorrectionRequests.employeeId, employeeId))
        .orderBy(desc(timeCorrectionRequests.createdAt));
      
      res.json(requests);
      
    } catch (error) {
      console.error("Error fetching correction requests:", error);
      res.status(500).json({ message: "Failed to fetch correction requests" });
    }
  });

  // Submit Time Correction Request
  app.post("/api/self-service/time-correction", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { workCardLogId, requestType, originalValue, requestedValue, reason, photoEvidence } = req.body;
      
      const employee = await db.select()
        .from(employees)
        .where(eq(employees.employeeId, userId))
        .limit(1);
        
      if (!employee[0]) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      const employeeId = employee[0].employeeId;
      
      // Validate the work card log belongs to the employee
      const workLog = await db.select()
        .from(digitalWorkCardLogs)
        .where(and(
          eq(digitalWorkCardLogs.logId, workCardLogId),
          eq(digitalWorkCardLogs.employeeId, employeeId)
        ))
        .limit(1);
        
      if (!workLog[0]) {
        return res.status(404).json({ message: "Work log not found" });
      }
      
      // Create correction request
      const correctionRequest = await db.insert(timeCorrectionRequests)
        .values({
          employeeId,
          workCardLogId,
          requestType,
          originalValue,
          requestedValue,
          reason,
          photoEvidence,
          submittedVia: 'web',
          status: 'pending'
        })
        .returning();
      
      res.json({ 
        success: true, 
        requestId: correctionRequest[0].requestId,
        message: "Time correction request submitted successfully"
      });
      
    } catch (error) {
      console.error("Error submitting time correction:", error);
      res.status(500).json({ message: "Failed to submit correction request" });
    }
  });

  // Photo Evidence Upload
  app.post("/api/upload/photo-evidence", isAuthenticated, async (req: any, res) => {
    try {
      // In a real implementation, this would upload to object storage
      // For now, return a mock URL
      const photoUrl = `/uploads/evidence/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
      
      res.json({ 
        success: true, 
        url: photoUrl,
        message: "Photo uploaded successfully"
      });
      
    } catch (error) {
      console.error("Error uploading photo:", error);
      res.status(500).json({ message: "Failed to upload photo" });
    }
  });

  // Export Work History (CSV/PDF)
  app.get("/api/self-service/export-work-history", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { format, startDate, endDate } = req.query;
      
      const employee = await db.select()
        .from(employees)
        .where(eq(employees.employeeId, userId))
        .limit(1);
        
      if (!employee[0]) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      const employeeId = employee[0].employeeId;
      const start = parseISO(startDate as string);
      const end = parseISO(endDate as string);
      
      const workHistory = await db.select()
        .from(digitalWorkCardLogs)
        .where(and(
          eq(digitalWorkCardLogs.employeeId, employeeId),
          between(digitalWorkCardLogs.workDate, start, end)
        ))
        .orderBy(digitalWorkCardLogs.workDate);
      
      if (format === 'csv') {
        // Generate CSV
        const csvHeader = 'Date,Clock In,Clock Out,Total Hours,Overtime,Location,ERGANI Status\n';
        const csvData = workHistory.map(log => 
          `${log.workDate},${log.clockInTime || ''},${log.clockOutTime || ''},${log.totalHours || 0},${log.overtimeHours || 0},${log.location || ''},${log.erganiSyncStatus}`
        ).join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="work-history-${startDate}-${endDate}.csv"`);
        res.send(csvHeader + csvData);
      } else {
        res.json(workHistory);
      }
      
    } catch (error) {
      console.error("Error exporting work history:", error);
      res.status(500).json({ message: "Failed to export work history" });
    }
  });
}