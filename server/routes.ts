import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertEmployeeSchema, insertPayrollRecordSchema } from "@shared/schema";
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
      const { search, department, position } = req.query;
      const employees = await storage.getEmployees(
        search as string,
        department as string,
        position as string
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
      
      // Check for duplicate AFM
      const existingByAfm = await storage.getEmployeeByAfm(validatedData.afm);
      if (existingByAfm) {
        return res.status(400).json({ message: "Υπάρχει ήδη εργαζόμενος με αυτό το ΑΦΜ" });
      }

      // Check for duplicate AMKA
      const existingByAmka = await storage.getEmployeeByAmka(validatedData.amka);
      if (existingByAmka) {
        return res.status(400).json({ message: "Υπάρχει ήδη εργαζόμενος με αυτό το ΑΜΚΑ" });
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

  // Payroll routes
  app.get("/api/payroll", isAuthenticated, async (req, res) => {
    try {
      const { employeeId, month } = req.query;
      const records = await storage.getPayrollRecords(
        employeeId as string,
        month as string
      );
      res.json(records);
    } catch (error) {
      console.error("Error fetching payroll records:", error);
      res.status(500).json({ message: "Failed to fetch payroll records" });
    }
  });

  app.post("/api/payroll", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertPayrollRecordSchema.parse(req.body);
      const record = await storage.createPayrollRecord(validatedData);
      res.status(201).json(record);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.toString() });
      }
      console.error("Error creating payroll record:", error);
      res.status(500).json({ message: "Failed to create payroll record" });
    }
  });

  // Collective agreements routes
  app.get("/api/collective-agreements", isAuthenticated, async (req, res) => {
    try {
      const agreements = await storage.getCollectiveAgreements();
      res.json(agreements);
    } catch (error) {
      console.error("Error fetching collective agreements:", error);
      res.status(500).json({ message: "Failed to fetch collective agreements" });
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
