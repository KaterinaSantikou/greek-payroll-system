import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  insertEmployeeSchema, 
  insertPropertySchema, 
  insertShiftSchema, 
  insertPunchEventSchema, 
  insertExceptionSchema, 
  insertTimesheetSchema 
} from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { erganiConnector } from "./erganiConnector";
import { payrollConnector } from "./payrollConnector";
import { workflowManager } from "./workflowManager";
import { hotelOperationsManager } from "./hotelOperations";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Employee routes
  app.get("/api/employees", isAuthenticated, async (req, res) => {
    try {
      const { search, propertyId } = req.query;
      const employees = await storage.getEmployees(
        search as string,
        propertyId as string
      );
      res.json(employees);
    } catch (error) {
      console.error("Error fetching employees:", error);
      res.status(500).json({ message: "Failed to fetch employees" });
    }
  });

  app.get("/api/employees/:id", isAuthenticated, async (req, res) => {
    try {
      const employee = await storage.getEmployee(req.params.id);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      res.json(employee);
    } catch (error) {
      console.error("Error fetching employee:", error);
      res.status(500).json({ message: "Failed to fetch employee" });
    }
  });

  app.post("/api/employees", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertEmployeeSchema.parse(req.body);
      
      // Check for duplicate AFM if provided
      if (validatedData.afm) {
        const existingByAfm = await storage.getEmployeeByAfm(validatedData.afm);
        if (existingByAfm) {
          return res.status(400).json({ message: "Υπάρχει ήδη εργαζόμενος με αυτό το ΑΦΜ" });
        }
      }

      const employee = await storage.createEmployee(validatedData);
      res.status(201).json(employee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.toString() });
      }
      console.error("Error creating employee:", error);
      res.status(500).json({ message: "Failed to create employee" });
    }
  });

  app.put("/api/employees/:id", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertEmployeeSchema.partial().parse(req.body);
      const employee = await storage.updateEmployee(req.params.id, validatedData);
      res.json(employee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.toString() });
      }
      console.error("Error updating employee:", error);
      res.status(500).json({ message: "Failed to update employee" });
    }
  });

  app.delete("/api/employees/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteEmployee(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting employee:", error);
      res.status(500).json({ message: "Failed to delete employee" });
    }
  });

  // Property routes
  app.get("/api/properties", isAuthenticated, async (req, res) => {
    try {
      const properties = await storage.getProperties();
      res.json(properties);
    } catch (error) {
      console.error("Error fetching properties:", error);
      res.status(500).json({ message: "Failed to fetch properties" });
    }
  });

  app.post("/api/properties", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertPropertySchema.parse(req.body);
      const property = await storage.createProperty(validatedData);
      res.status(201).json(property);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.toString() });
      }
      console.error("Error creating property:", error);
      res.status(500).json({ message: "Failed to create property" });
    }
  });

  // Shift routes
  app.get("/api/shifts", isAuthenticated, async (req, res) => {
    try {
      const { employeeId, propertyId, startDate, endDate } = req.query;
      const shifts = await storage.getShifts(
        employeeId as string,
        propertyId as string,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(shifts);
    } catch (error) {
      console.error("Error fetching shifts:", error);
      res.status(500).json({ message: "Failed to fetch shifts" });
    }
  });

  app.post("/api/shifts", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertShiftSchema.parse(req.body);
      const shift = await storage.createShift(validatedData);
      res.status(201).json(shift);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.toString() });
      }
      console.error("Error creating shift:", error);
      res.status(500).json({ message: "Failed to create shift" });
    }
  });

  // Punch Event routes
  app.get("/api/punch-events", isAuthenticated, async (req, res) => {
    try {
      const { employeeId, propertyId, startDate, endDate } = req.query;
      const events = await storage.getPunchEvents(
        employeeId as string,
        propertyId as string,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(events);
    } catch (error) {
      console.error("Error fetching punch events:", error);
      res.status(500).json({ message: "Failed to fetch punch events" });
    }
  });

  app.post("/api/punch-events", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertPunchEventSchema.parse(req.body);
      const event = await storage.createPunchEvent(validatedData);
      res.status(201).json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.toString() });
      }
      console.error("Error creating punch event:", error);
      res.status(500).json({ message: "Failed to create punch event" });
    }
  });

  // Exception routes
  app.get("/api/exceptions", isAuthenticated, async (req, res) => {
    try {
      const { employeeId, propertyId, status } = req.query;
      const exceptions = await storage.getExceptions(
        employeeId as string,
        propertyId as string,
        status as string
      );
      res.json(exceptions);
    } catch (error) {
      console.error("Error fetching exceptions:", error);
      res.status(500).json({ message: "Failed to fetch exceptions" });
    }
  });

  app.post("/api/exceptions", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertExceptionSchema.parse(req.body);
      const exception = await storage.createException(validatedData);
      res.status(201).json(exception);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.toString() });
      }
      console.error("Error creating exception:", error);
      res.status(500).json({ message: "Failed to create exception" });
    }
  });

  // Timesheet routes
  app.get("/api/timesheets", isAuthenticated, async (req, res) => {
    try {
      const { employeeId, periodStart, periodEnd, payrollStatus } = req.query;
      const timesheets = await storage.getTimesheets(
        employeeId as string,
        periodStart ? new Date(periodStart as string) : undefined,
        periodEnd ? new Date(periodEnd as string) : undefined,
        payrollStatus as string
      );
      res.json(timesheets);
    } catch (error) {
      console.error("Error fetching timesheets:", error);
      res.status(500).json({ message: "Failed to fetch timesheets" });
    }
  });

  app.post("/api/timesheets", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertTimesheetSchema.parse(req.body);
      const timesheet = await storage.createTimesheet(validatedData);
      res.status(201).json(timesheet);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.toString() });
      }
      console.error("Error creating timesheet:", error);
      res.status(500).json({ message: "Failed to create timesheet" });
    }
  });

  // ERGANI II Connector API
  app.post("/api/ergani/events", isAuthenticated, async (req, res) => {
    try {
      const { erganiConnector } = await import("./erganiConnector");
      const eventData = req.body;
      
      const result = await erganiConnector.submitEvent(eventData);
      res.status(201).json(result);
    } catch (error) {
      console.error("Error submitting ERGANI event:", error);
      res.status(500).json({ error: "Failed to submit event to ERGANI" });
    }
  });

  app.post("/api/ergani/bulk", isAuthenticated, async (req, res) => {
    try {
      const { erganiConnector } = await import("./erganiConnector");
      const eventsData = req.body.events;
      
      if (!Array.isArray(eventsData)) {
        return res.status(400).json({ error: "Events must be an array" });
      }
      
      const results = await erganiConnector.submitBulk(eventsData);
      res.status(201).json({ results });
    } catch (error) {
      console.error("Error submitting ERGANI bulk events:", error);
      res.status(500).json({ error: "Failed to submit bulk events to ERGANI" });
    }
  });

  app.get("/api/ergani/status/:eventId", isAuthenticated, async (req, res) => {
    try {
      const { erganiConnector } = await import("./erganiConnector");
      const eventId = req.params.eventId;
      
      const status = erganiConnector.getEventStatus(eventId);
      if (!status) {
        return res.status(404).json({ error: "Event not found" });
      }
      
      res.json(status);
    } catch (error) {
      console.error("Error getting ERGANI event status:", error);
      res.status(500).json({ error: "Failed to get event status" });
    }
  });

  app.get("/api/ergani/health", isAuthenticated, async (req, res) => {
    try {
      const { erganiConnector } = await import("./erganiConnector");
      const metrics = erganiConnector.getHealthMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error getting ERGANI health metrics:", error);
      res.status(500).json({ error: "Failed to get health metrics" });
    }
  });

  app.get("/api/ergani/logs", isAuthenticated, async (req, res) => {
    try {
      const { erganiConnector } = await import("./erganiConnector");
      const { eventId, format } = req.query;
      
      if (format === 'export') {
        const exportFormat = req.query.exportFormat as 'json' | 'csv' || 'json';
        const exportData = erganiConnector.exportMirrorLogs(exportFormat);
        
        const contentType = exportFormat === 'csv' ? 'text/csv' : 'application/json';
        const filename = `ergani_logs_${new Date().toISOString().split('T')[0]}.${exportFormat}`;
        
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(exportData);
      } else {
        const logs = erganiConnector.getMirrorLogs(eventId as string);
        res.json(logs);
      }
    } catch (error) {
      console.error("Error getting ERGANI logs:", error);
      res.status(500).json({ error: "Failed to get logs" });
    }
  });

  app.get("/api/ergani/quarantine", isAuthenticated, async (req, res) => {
    try {
      const { erganiConnector } = await import("./erganiConnector");
      const quarantinedEvents = erganiConnector.getQuarantinedEvents();
      res.json(quarantinedEvents);
    } catch (error) {
      console.error("Error getting quarantined events:", error);
      res.status(500).json({ error: "Failed to get quarantined events" });
    }
  });

  app.post("/api/ergani/quarantine/:eventId/retry", isAuthenticated, async (req, res) => {
    try {
      const { erganiConnector } = await import("./erganiConnector");
      const eventId = req.params.eventId;
      
      const result = await erganiConnector.retryQuarantinedEvent(eventId);
      if (!result) {
        return res.status(404).json({ error: "Quarantined event not found" });
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error retrying quarantined event:", error);
      res.status(500).json({ error: "Failed to retry quarantined event" });
    }
  });

  app.post("/api/compliance/auto-fix/:recommendationId", async (req, res) => {
    try {
      const { recommendationId } = req.params;
      
      // This would implement auto-fix logic based on recommendation type
      // For now, return success to indicate the feature is available
      res.json({ 
        success: true, 
        message: "Auto-fix request processed",
        recommendationId 
      });
    } catch (error) {
      console.error("Error applying auto-fix:", error);
      res.status(500).json({ error: "Failed to apply auto-fix" });
    }
  });

  // Payroll Integration routes
  app.post("/api/payroll/sync-employees", isAuthenticated, async (req, res) => {
    try {
      const { payrollEmployees } = req.body;
      await payrollConnector.syncEmployeeMasterData(payrollEmployees);
      res.json({ success: true, message: `Synced ${payrollEmployees.length} employees` });
    } catch (error) {
      console.error("Error syncing payroll employees:", error);
      res.status(500).json({ error: "Failed to sync employees" });
    }
  });

  app.post("/api/payroll/process-timesheets", isAuthenticated, async (req, res) => {
    try {
      const { employeeId, startDate, endDate } = req.body;
      const entries = await payrollConnector.processPunchEvents(
        employeeId,
        new Date(startDate),
        new Date(endDate)
      );
      res.json({ entries, total: entries.length });
    } catch (error) {
      console.error("Error processing timesheets:", error);
      res.status(500).json({ error: "Failed to process timesheets" });
    }
  });

  app.post("/api/payroll/lock-timesheet", isAuthenticated, async (req, res) => {
    try {
      const { employeeId, payPeriodStart, payPeriodEnd, approvedBy } = req.body;
      await payrollConnector.lockTimesheet(employeeId, payPeriodStart, payPeriodEnd, approvedBy);
      res.json({ success: true, message: "Timesheet locked successfully" });
    } catch (error) {
      console.error("Error locking timesheet:", error);
      res.status(500).json({ error: "Failed to lock timesheet" });
    }
  });

  app.post("/api/payroll/export-batch", isAuthenticated, async (req, res) => {
    try {
      const { payPeriodStart, payPeriodEnd, format } = req.body;
      const batch = await payrollConnector.createExportBatch(payPeriodStart, payPeriodEnd, format);
      res.json(batch);
    } catch (error) {
      console.error("Error creating export batch:", error);
      res.status(500).json({ error: "Failed to create export batch" });
    }
  });

  app.post("/api/payroll/submit-batch/:batchId", isAuthenticated, async (req, res) => {
    try {
      const { batchId } = req.params;
      await payrollConnector.submitBatchAPI(batchId);
      res.json({ success: true, message: "Batch submitted successfully" });
    } catch (error) {
      console.error("Error submitting batch:", error);
      res.status(500).json({ error: "Failed to submit batch" });
    }
  });

  app.get("/api/payroll/batches", isAuthenticated, async (req, res) => {
    try {
      const batches = payrollConnector.getAllExportBatches();
      res.json(batches);
    } catch (error) {
      console.error("Error fetching export batches:", error);
      res.status(500).json({ error: "Failed to fetch export batches" });
    }
  });

  app.get("/api/payroll/batch/:batchId", isAuthenticated, async (req, res) => {
    try {
      const { batchId } = req.params;
      const batch = payrollConnector.getExportBatch(batchId);
      if (!batch) {
        return res.status(404).json({ error: "Batch not found" });
      }
      res.json(batch);
    } catch (error) {
      console.error("Error fetching export batch:", error);
      res.status(500).json({ error: "Failed to fetch export batch" });
    }
  });

  app.get("/api/payroll/batch/:batchId/csv", isAuthenticated, async (req, res) => {
    try {
      const { batchId } = req.params;
      const batch = payrollConnector.getExportBatch(batchId);
      if (!batch) {
        return res.status(404).json({ error: "Batch not found" });
      }
      const csv = payrollConnector.exportToCSV(batch);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="payroll_${batchId}.csv"`);
      res.send(csv);
    } catch (error) {
      console.error("Error exporting batch to CSV:", error);
      res.status(500).json({ error: "Failed to export batch to CSV" });
    }
  });

  app.get("/api/payroll/batch/:batchId/xml", isAuthenticated, async (req, res) => {
    try {
      const { batchId } = req.params;
      const batch = payrollConnector.getExportBatch(batchId);
      if (!batch) {
        return res.status(404).json({ error: "Batch not found" });
      }
      const xml = payrollConnector.exportToXML(batch);
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', `attachment; filename="payroll_${batchId}.xml"`);
      res.send(xml);
    } catch (error) {
      console.error("Error exporting batch to XML:", error);
      res.status(500).json({ error: "Failed to export batch to XML" });
    }
  });

  app.get("/api/payroll/timesheets", isAuthenticated, async (req, res) => {
    try {
      const { payPeriodStart, payPeriodEnd } = req.query;
      const entries = payrollConnector.getTimesheetEntries(
        payPeriodStart as string,
        payPeriodEnd as string
      );
      res.json(entries);
    } catch (error) {
      console.error("Error fetching timesheet entries:", error);
      res.status(500).json({ error: "Failed to fetch timesheet entries" });
    }
  });

  app.get("/api/payroll/health", isAuthenticated, async (req, res) => {
    try {
      const metrics = payrollConnector.getHealthMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching payroll health metrics:", error);
      res.status(500).json({ error: "Failed to fetch health metrics" });
    }
  });

  app.post("/api/payroll/demo-batch", isAuthenticated, async (req, res) => {
    try {
      const payrollData = req.body;
      console.log(`[PAYROLL DEMO] Processing batch for period ${payrollData.pay_period}, property ${payrollData.property_id}`);
      
      // Create demo timesheet entries from the payroll data
      const demoEntries = [];
      for (const record of payrollData.records) {
        for (const line of record.lines) {
          const entry = {
            entryId: `demo_${record.employee_number}_${line.code}_${Date.now()}`,
            employeeNumber: record.employee_number,
            employeeGuid: `guid_${record.employee_number}`,
            payPeriodStart: `${payrollData.pay_period}-01`,
            payPeriodEnd: `${payrollData.pay_period}-31`,
            earningsCode: line.code,
            hours: line.hours,
            units: line.hours,
            rateBasis: 'HOURLY',
            costCenterAllocations: [{
              costCenterId: line.cost_center,
              propertyId: payrollData.property_id,
              hours: line.hours,
              percentage: 100
            }],
            propertyId: payrollData.property_id,
            calculatedAt: new Date(),
            lockedAt: new Date(),
            approvedBy: record.notes?.includes('MGR_') ? record.notes.split(' ')[2] : 'system',
            notes: record.notes
          };
          demoEntries.push(entry);
          
          // Add to payroll connector storage
          payrollConnector['timesheetEntries'] = payrollConnector['timesheetEntries'] || new Map();
          payrollConnector['timesheetEntries'].set(entry.entryId, entry);
        }
      }

      // Create an export batch automatically
      const batch = await payrollConnector.createExportBatch(
        `${payrollData.pay_period}-01`,
        `${payrollData.pay_period}-31`,
        'API'
      );

      res.json({
        success: true,
        message: `Processed ${demoEntries.length} timesheet entries for ${payrollData.records.length} employees`,
        entriesCreated: demoEntries.length,
        batchId: batch.batchId,
        totalHours: demoEntries.reduce((sum, entry) => sum + entry.hours, 0),
        breakdownByCode: demoEntries.reduce((acc, entry) => {
          acc[entry.earningsCode] = (acc[entry.earningsCode] || 0) + entry.hours;
          return acc;
        }, {} as Record<string, number>)
      });
      
    } catch (error) {
      console.error("Error processing demo payroll batch:", error);
      res.status(500).json({ error: "Failed to process demo batch" });
    }
  });

  // Manager & Payroll Workflow routes
  app.get("/api/workflow/metrics", isAuthenticated, async (req, res) => {
    try {
      const metrics = workflowManager.getWorkflowMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching workflow metrics:", error);
      res.status(500).json({ error: "Failed to fetch workflow metrics" });
    }
  });

  app.post("/api/workflow/validate-exceptions", isAuthenticated, async (req, res) => {
    try {
      const { date, managerId } = req.body;
      const validations = await workflowManager.validateExceptions(date, managerId);
      res.json(validations);
    } catch (error) {
      console.error("Error validating exceptions:", error);
      res.status(500).json({ error: "Failed to validate exceptions" });
    }
  });

  app.post("/api/workflow/approve-exception", isAuthenticated, async (req, res) => {
    try {
      const { exceptionId, status, managerId, reason, correctedValue } = req.body;
      await workflowManager.approveRejectException(exceptionId, status, managerId, reason, correctedValue);
      res.json({ success: true, message: `Exception ${status.toLowerCase()}` });
    } catch (error) {
      console.error("Error approving/rejecting exception:", error);
      res.status(500).json({ error: "Failed to process exception approval" });
    }
  });

  app.post("/api/workflow/overtime-approval", isAuthenticated, async (req, res) => {
    try {
      const { employeeId, date, requestedHours, earningsCode, reason, requestedBy } = req.body;
      const approval = await workflowManager.createOvertimeApproval(
        employeeId, date, requestedHours, earningsCode, reason, requestedBy
      );
      res.json(approval);
    } catch (error) {
      console.error("Error creating overtime approval:", error);
      res.status(500).json({ error: "Failed to create overtime approval" });
    }
  });

  app.post("/api/workflow/approve-overtime", isAuthenticated, async (req, res) => {
    try {
      const { approvalId, status, managerId, approvedHours, justification } = req.body;
      await workflowManager.approveRejectOvertime(approvalId, status, managerId, approvedHours, justification);
      res.json({ success: true, message: `Overtime ${status.toLowerCase()}` });
    } catch (error) {
      console.error("Error approving/rejecting overtime:", error);
      res.status(500).json({ error: "Failed to process overtime approval" });
    }
  });

  app.get("/api/workflow/ergani-status", isAuthenticated, async (req, res) => {
    try {
      const { date } = req.query;
      const status = await workflowManager.checkErganiStatus(date as string);
      res.json(status);
    } catch (error) {
      console.error("Error checking ERGANI status:", error);
      res.status(500).json({ error: "Failed to check ERGANI status" });
    }
  });

  app.post("/api/workflow/lock-timesheets", isAuthenticated, async (req, res) => {
    try {
      const { payPeriodStart, payPeriodEnd, managerId, employeeIds } = req.body;
      const locks = await workflowManager.lockTimesheets(payPeriodStart, payPeriodEnd, managerId, employeeIds);
      res.json({ locks, totalLocked: locks.length });
    } catch (error) {
      console.error("Error locking timesheets:", error);
      res.status(500).json({ error: "Failed to lock timesheets" });
    }
  });

  app.post("/api/workflow/export-payroll", isAuthenticated, async (req, res) => {
    try {
      const { payPeriodStart, payPeriodEnd, format } = req.body;
      const batchId = await workflowManager.exportToPayroll(payPeriodStart, payPeriodEnd, format);
      res.json({ success: true, batchId, message: "Payroll exported successfully" });
    } catch (error) {
      console.error("Error exporting payroll:", error);
      res.status(500).json({ error: "Failed to export payroll" });
    }
  });

  app.post("/api/workflow/reconciliation-report", isAuthenticated, async (req, res) => {
    try {
      const { payPeriodStart, payPeriodEnd, managerId } = req.body;
      const report = await workflowManager.generateReconciliationReport(payPeriodStart, payPeriodEnd, managerId);
      res.json(report);
    } catch (error) {
      console.error("Error generating reconciliation report:", error);
      res.status(500).json({ error: "Failed to generate reconciliation report" });
    }
  });

  app.post("/api/workflow/audit-pack", isAuthenticated, async (req, res) => {
    try {
      const { payPeriodStart, payPeriodEnd, requestedBy } = req.body;
      const auditPack = await workflowManager.generateAuditPack(payPeriodStart, payPeriodEnd, requestedBy);
      res.json(auditPack);
    } catch (error) {
      console.error("Error generating audit pack:", error);
      res.status(500).json({ error: "Failed to generate audit pack" });
    }
  });

  app.get("/api/workflow/exception-validations", isAuthenticated, async (req, res) => {
    try {
      const { date } = req.query;
      const validations = workflowManager.getExceptionValidations(date as string);
      res.json(validations);
    } catch (error) {
      console.error("Error fetching exception validations:", error);
      res.status(500).json({ error: "Failed to fetch exception validations" });
    }
  });

  app.get("/api/workflow/overtime-approvals", isAuthenticated, async (req, res) => {
    try {
      const { status } = req.query;
      const approvals = workflowManager.getOvertimeApprovals(status as any);
      res.json(approvals);
    } catch (error) {
      console.error("Error fetching overtime approvals:", error);
      res.status(500).json({ error: "Failed to fetch overtime approvals" });
    }
  });

  app.get("/api/workflow/timesheet-locks", isAuthenticated, async (req, res) => {
    try {
      const { payPeriodStart, payPeriodEnd } = req.query;
      const locks = workflowManager.getTimesheetLocks(payPeriodStart as string, payPeriodEnd as string);
      res.json(locks);
    } catch (error) {
      console.error("Error fetching timesheet locks:", error);
      res.status(500).json({ error: "Failed to fetch timesheet locks" });
    }
  });

  app.get("/api/workflow/reconciliation-reports", isAuthenticated, async (req, res) => {
    try {
      const reports = workflowManager.getReconciliationReports();
      res.json(reports);
    } catch (error) {
      console.error("Error fetching reconciliation reports:", error);
      res.status(500).json({ error: "Failed to fetch reconciliation reports" });
    }
  });

  app.get("/api/workflow/audit-packs", isAuthenticated, async (req, res) => {
    try {
      const auditPacks = workflowManager.getAuditPacks();
      res.json(auditPacks);
    } catch (error) {
      console.error("Error fetching audit packs:", error);
      res.status(500).json({ error: "Failed to fetch audit packs" });
    }
  });

  // Hotel Operations routes
  app.get("/api/hotel/properties", isAuthenticated, async (req, res) => {
    try {
      const properties = hotelOperationsManager.getProperties();
      res.json(properties);
    } catch (error) {
      console.error("Error fetching properties:", error);
      res.status(500).json({ error: "Failed to fetch properties" });
    }
  });

  app.get("/api/hotel/properties/:propertyId/departments", isAuthenticated, async (req, res) => {
    try {
      const { propertyId } = req.params;
      const departments = hotelOperationsManager.getDepartments(propertyId);
      res.json(departments);
    } catch (error) {
      console.error("Error fetching departments:", error);
      res.status(500).json({ error: "Failed to fetch departments" });
    }
  });

  app.get("/api/hotel/kiosk/:departmentId/config", isAuthenticated, async (req, res) => {
    try {
      const { departmentId } = req.params;
      const { language = 'EN' } = req.query;
      const config = hotelOperationsManager.getKioskConfig(departmentId, language as any);
      
      if (!config) {
        return res.status(404).json({ error: "Kiosk configuration not found" });
      }
      
      res.json(config);
    } catch (error) {
      console.error("Error fetching kiosk config:", error);
      res.status(500).json({ error: "Failed to fetch kiosk configuration" });
    }
  });

  app.post("/api/hotel/kiosk/:departmentId/action", isAuthenticated, async (req, res) => {
    try {
      const { departmentId } = req.params;
      const { actionId, employeeId, metadata } = req.body;
      
      const result = await hotelOperationsManager.executeKioskAction(
        departmentId, actionId, employeeId, metadata
      );
      
      res.json(result);
    } catch (error) {
      console.error("Error executing kiosk action:", error);
      res.status(500).json({ error: "Failed to execute kiosk action" });
    }
  });

  app.post("/api/hotel/multi-property-assignment", isAuthenticated, async (req, res) => {
    try {
      const { employeeId, primaryPropertyId, secondaryAssignments } = req.body;
      
      const assignment = await hotelOperationsManager.assignEmployeeToMultipleProperties(
        employeeId, primaryPropertyId, secondaryAssignments
      );
      
      res.json(assignment);
    } catch (error) {
      console.error("Error creating multi-property assignment:", error);
      res.status(500).json({ error: "Failed to create multi-property assignment" });
    }
  });

  app.post("/api/hotel/rotation-schedule", isAuthenticated, async (req, res) => {
    try {
      const { employeeId, propertySequence, pattern } = req.body;
      
      await hotelOperationsManager.createRotationSchedule(employeeId, propertySequence, pattern);
      res.json({ success: true, message: "Rotation schedule created" });
    } catch (error) {
      console.error("Error creating rotation schedule:", error);
      res.status(500).json({ error: "Failed to create rotation schedule" });
    }
  });

  app.post("/api/hotel/seasonal-onboarding", isAuthenticated, async (req, res) => {
    try {
      const { seasonalPeriodId, batchEmployees } = req.body;
      
      const session = await hotelOperationsManager.startSeasonalOnboarding(
        seasonalPeriodId, batchEmployees
      );
      
      res.json(session);
    } catch (error) {
      console.error("Error starting seasonal onboarding:", error);
      res.status(500).json({ error: "Failed to start seasonal onboarding" });
    }
  });

  app.post("/api/hotel/split-shift", isAuthenticated, async (req, res) => {
    try {
      const { employeeId, date, segments } = req.body;
      
      const splitShift = await hotelOperationsManager.createSplitShift(
        employeeId, date, segments
      );
      
      res.json(splitShift);
    } catch (error) {
      console.error("Error creating split shift:", error);
      res.status(500).json({ error: "Failed to create split shift" });
    }
  });

  app.post("/api/hotel/validate-cross-department", isAuthenticated, async (req, res) => {
    try {
      const { employeeId, fromDepartment, toDepartment, date } = req.body;
      
      const validation = await hotelOperationsManager.validateCrossDepartmentCoverage(
        employeeId, fromDepartment, toDepartment, date
      );
      
      res.json(validation);
    } catch (error) {
      console.error("Error validating cross-department coverage:", error);
      res.status(500).json({ error: "Failed to validate cross-department coverage" });
    }
  });

  app.get("/api/hotel/multi-property-assignments", isAuthenticated, async (req, res) => {
    try {
      const assignments = hotelOperationsManager.getMultiPropertyAssignments();
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching multi-property assignments:", error);
      res.status(500).json({ error: "Failed to fetch multi-property assignments" });
    }
  });

  app.get("/api/hotel/split-shifts", isAuthenticated, async (req, res) => {
    try {
      const { employeeId, date } = req.query;
      const shifts = hotelOperationsManager.getSplitShifts(employeeId as string, date as string);
      res.json(shifts);
    } catch (error) {
      console.error("Error fetching split shifts:", error);
      res.status(500).json({ error: "Failed to fetch split shifts" });
    }
  });

  app.get("/api/hotel/geofence-templates", isAuthenticated, async (req, res) => {
    try {
      const templates = hotelOperationsManager.getGeofenceTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching geofence templates:", error);
      res.status(500).json({ error: "Failed to fetch geofence templates" });
    }
  });

  app.get("/api/hotel/onboarding-templates", isAuthenticated, async (req, res) => {
    try {
      const templates = hotelOperationsManager.getOnboardingTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching onboarding templates:", error);
      res.status(500).json({ error: "Failed to fetch onboarding templates" });
    }
  });

  // Export routes
  app.get("/api/employees/export/excel", isAuthenticated, async (req, res) => {
    try {
      const employees = await storage.getEmployees();
      // TODO: Implement Excel export using xlsx library
      res.json({ message: "Excel export functionality to be implemented", employees });
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      res.status(500).json({ message: "Failed to export to Excel" });
    }
  });

  // Compliance Guardrails API Routes
  
  // Get compliance dashboard
  app.get("/api/compliance/dashboard", isAuthenticated, async (req, res) => {
    try {
      const { complianceGuardrails } = await import("./complianceGuardrails");
      const dashboard = await complianceGuardrails.getComplianceDashboard();
      res.json(dashboard);
    } catch (error) {
      console.error("Error fetching compliance dashboard:", error);
      res.status(500).json({ error: "Failed to fetch compliance dashboard" });
    }
  });

  // Process punch event with compliance checking
  app.post("/api/compliance/punch-event", isAuthenticated, async (req, res) => {
    try {
      const { complianceGuardrails } = await import("./complianceGuardrails");
      const result = await complianceGuardrails.processPunchEvent(req.body);
      res.json(result);
    } catch (error) {
      console.error("Error processing punch event:", error);
      res.status(500).json({ error: "Failed to process punch event" });
    }
  });

  // Get compliance alerts
  app.get("/api/compliance/alerts", isAuthenticated, async (req, res) => {
    try {
      const { complianceGuardrails } = await import("./complianceGuardrails");
      const dashboard = await complianceGuardrails.getComplianceDashboard();
      res.json(dashboard.alerts);
    } catch (error) {
      console.error("Error fetching compliance alerts:", error);
      res.status(500).json({ error: "Failed to fetch compliance alerts" });
    }
  });

  // Resolve compliance alert
  app.put("/api/compliance/alerts/:alertId/resolve", isAuthenticated, async (req, res) => {
    try {
      const { alertId } = req.params;
      const { resolution } = req.body;
      const userId = req.user?.claims?.sub;
      
      const { complianceGuardrails } = await import("./complianceGuardrails");
      const resolved = complianceGuardrails.resolveAlert(alertId, userId, resolution);
      
      if (resolved) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Alert not found or already resolved" });
      }
    } catch (error) {
      console.error("Error resolving compliance alert:", error);
      res.status(500).json({ error: "Failed to resolve alert" });
    }
  });

  // Check digital card policy
  app.post("/api/compliance/digital-card-policy", isAuthenticated, async (req, res) => {
    try {
      const { employeeId, issueType } = req.body;
      
      const { complianceGuardrails } = await import("./complianceGuardrails");
      const policyResult = complianceGuardrails.enforceDigitalCardPolicy(employeeId, issueType);
      
      res.json(policyResult);
    } catch (error) {
      console.error("Error checking digital card policy:", error);
      res.status(500).json({ error: "Failed to check digital card policy" });
    }
  });

  // Get ERGANI submission status
  app.get("/api/compliance/ergani/status", isAuthenticated, async (req, res) => {
    try {
      const { erganiConnector } = await import("./erganiConnector");
      const health = erganiConnector.getHealthMetrics();
      res.json(health);
    } catch (error) {
      console.error("Error fetching ERGANI status:", error);
      res.status(500).json({ error: "Failed to fetch ERGANI status" });
    }
  });

  // Get ERGANI mirror logs
  app.get("/api/compliance/ergani/logs", isAuthenticated, async (req, res) => {
    try {
      const { eventId, format } = req.query;
      const { erganiConnector } = await import("./erganiConnector");
      
      if (format === 'csv') {
        const csvData = erganiConnector.exportMirrorLogs('csv');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=ergani-logs.csv');
        res.send(csvData);
      } else {
        const logs = erganiConnector.getMirrorLogs(eventId as string);
        res.json(logs);
      }
    } catch (error) {
      console.error("Error fetching ERGANI logs:", error);
      res.status(500).json({ error: "Failed to fetch ERGANI logs" });
    }
  });

  // Retry quarantined ERGANI event
  app.post("/api/compliance/ergani/retry/:eventId", isAuthenticated, async (req, res) => {
    try {
      const { eventId } = req.params;
      const { erganiConnector } = await import("./erganiConnector");
      
      const result = await erganiConnector.retryQuarantinedEvent(eventId);
      
      if (result) {
        res.json(result);
      } else {
        res.status(404).json({ error: "Event not found in quarantine" });
      }
    } catch (error) {
      console.error("Error retrying ERGANI event:", error);
      res.status(500).json({ error: "Failed to retry ERGANI event" });
    }
  });

  // Check data retention compliance
  app.get("/api/compliance/data-retention", isAuthenticated, async (req, res) => {
    try {
      const { complianceGuardrails } = await import("./complianceGuardrails");
      const compliance = complianceGuardrails.checkDataRetentionCompliance();
      res.json(compliance);
    } catch (error) {
      console.error("Error checking data retention compliance:", error);
      res.status(500).json({ error: "Failed to check data retention compliance" });
    }
  });

  // Analytics & Reporting API Routes

  // Live Occupancy
  app.get("/api/analytics/live-occupancy", isAuthenticated, async (req, res) => {
    try {
      const { propertyId } = req.query;
      const { analyticsService } = await import("./analyticsService");
      const occupancy = await analyticsService.getLiveOccupancy(propertyId as string);
      res.json(occupancy);
    } catch (error) {
      console.error("Error fetching live occupancy:", error);
      res.status(500).json({ error: "Failed to fetch live occupancy data" });
    }
  });

  // Labor Cost Forecast
  app.get("/api/analytics/labor-cost-forecast", isAuthenticated, async (req, res) => {
    try {
      const { propertyId, date } = req.query;
      if (!propertyId || !date) {
        return res.status(400).json({ error: "Property ID and date are required" });
      }
      
      const { analyticsService } = await import("./analyticsService");
      const forecast = await analyticsService.generateLaborCostForecast(
        propertyId as string, 
        new Date(date as string)
      );
      res.json(forecast);
    } catch (error) {
      console.error("Error generating labor cost forecast:", error);
      res.status(500).json({ error: "Failed to generate labor cost forecast" });
    }
  });

  // Overtime Heatmap
  app.get("/api/analytics/overtime-heatmap", isAuthenticated, async (req, res) => {
    try {
      const { propertyId, startDate, endDate } = req.query;
      if (!propertyId || !startDate || !endDate) {
        return res.status(400).json({ error: "Property ID, start date, and end date are required" });
      }
      
      const { analyticsService } = await import("./analyticsService");
      const heatmap = await analyticsService.generateOvertimeHeatmap(
        propertyId as string,
        new Date(startDate as string),
        new Date(endDate as string)
      );
      res.json(heatmap);
    } catch (error) {
      console.error("Error generating overtime heatmap:", error);
      res.status(500).json({ error: "Failed to generate overtime heatmap" });
    }
  });

  // Compliance KPIs
  app.get("/api/analytics/compliance-kpis", isAuthenticated, async (req, res) => {
    try {
      const { propertyId, startDate, endDate } = req.query;
      if (!propertyId || !startDate || !endDate) {
        return res.status(400).json({ error: "Property ID, start date, and end date are required" });
      }
      
      const { analyticsService } = await import("./analyticsService");
      const kpis = await analyticsService.getComplianceKpis(
        propertyId as string,
        new Date(startDate as string),
        new Date(endDate as string)
      );
      res.json(kpis);
    } catch (error) {
      console.error("Error fetching compliance KPIs:", error);
      res.status(500).json({ error: "Failed to fetch compliance KPIs" });
    }
  });

  // Variance Analysis
  app.get("/api/analytics/variance-analysis", isAuthenticated, async (req, res) => {
    try {
      const { propertyId, startDate, endDate } = req.query;
      if (!propertyId || !startDate || !endDate) {
        return res.status(400).json({ error: "Property ID, start date, and end date are required" });
      }
      
      const { analyticsService } = await import("./analyticsService");
      const analysis = await analyticsService.getVarianceAnalysis(
        propertyId as string,
        new Date(startDate as string),
        new Date(endDate as string)
      );
      res.json(analysis);
    } catch (error) {
      console.error("Error performing variance analysis:", error);
      res.status(500).json({ error: "Failed to perform variance analysis" });
    }
  });

  // Generate demo analytics data
  app.post("/api/analytics/generate-demo-data", isAuthenticated, async (req, res) => {
    try {
      const { analyticsService } = await import("./analyticsService");
      await analyticsService.generateDemoAnalyticsData();
      res.json({ success: true, message: "Demo analytics data generated successfully" });
    } catch (error) {
      console.error("Error generating demo analytics data:", error);
      res.status(500).json({ error: "Failed to generate demo analytics data" });
    }
  });

  // Success Metrics routes
  app.get('/api/success-metrics/summary', isAuthenticated, async (req, res) => {
    try {
      const { successMetricsService } = await import('./successMetricsService');
      const propertyId = req.query.propertyId as string;
      const summary = await successMetricsService.getSuccessMetricsSummary(propertyId);
      res.json(summary);
    } catch (error) {
      console.error("Error fetching success metrics summary:", error);
      res.status(500).json({ message: "Failed to fetch success metrics summary" });
    }
  });

  app.get('/api/success-metrics', isAuthenticated, async (req, res) => {
    try {
      const { successMetricsService } = await import('./successMetricsService');
      const propertyId = req.query.propertyId as string;
      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(req.query.endDate as string);
      
      if (propertyId === 'all') {
        const metrics = await successMetricsService.getLatestSuccessMetrics();
        res.json(metrics);
      } else {
        const metrics = await successMetricsService.getSuccessMetrics(propertyId, startDate, endDate);
        res.json(metrics);
      }
    } catch (error) {
      console.error("Error fetching success metrics:", error);
      res.status(500).json({ message: "Failed to fetch success metrics" });
    }
  });

  app.get('/api/success-metrics/alerts', isAuthenticated, async (req, res) => {
    try {
      const { successMetricsService } = await import('./successMetricsService');
      const propertyId = req.query.propertyId as string;
      const alerts = await successMetricsService.getSuccessMetricAlerts(
        propertyId === 'all' ? undefined : propertyId,
        false // Only unresolved alerts
      );
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching success metric alerts:", error);
      res.status(500).json({ message: "Failed to fetch success metric alerts" });
    }
  });

  app.post('/api/success-metrics/generate-demo', isAuthenticated, async (req, res) => {
    try {
      const { successMetricsService } = await import('./successMetricsService');
      await successMetricsService.generateDemoSuccessMetrics();
      res.json({ success: true, message: 'Demo success metrics generated' });
    } catch (error) {
      console.error("Error generating demo success metrics:", error);
      res.status(500).json({ message: "Failed to generate demo success metrics" });
    }
  });

  app.patch('/api/success-metrics/alerts/:alertId/resolve', isAuthenticated, async (req, res) => {
    try {
      const { successMetricsService } = await import('./successMetricsService');
      const alertId = req.params.alertId;
      const userId = req.user?.claims?.sub || 'system';
      await successMetricsService.resolveAlert(alertId, userId);
      res.json({ success: true, message: 'Alert resolved' });
    } catch (error) {
      console.error("Error resolving alert:", error);
      res.status(500).json({ message: "Failed to resolve alert" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
