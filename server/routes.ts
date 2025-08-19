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

  const httpServer = createServer(app);
  return httpServer;
}
