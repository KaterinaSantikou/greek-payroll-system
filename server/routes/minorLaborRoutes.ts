/**
 * Minor Labor Protection Routes
 * 
 * API endpoints for managing and monitoring Greek labor law compliance
 * for workers under 18 years old
 */

import type { Express } from "express";
import { minorLaborProtectionService } from "../services/MinorLaborProtectionService";

export function registerMinorLaborRoutes(app: Express): void {
  
  /**
   * Get work restrictions for a specific age
   */
  app.get("/api/minor-labor/restrictions/:age", (req, res) => {
    try {
      const age = parseInt(req.params.age, 10);
      
      if (isNaN(age) || age < 0 || age > 25) {
        return res.status(400).json({ 
          error: "Invalid age parameter. Must be a number between 0 and 25." 
        });
      }

      const restrictions = minorLaborProtectionService.getWorkRestrictions(age);
      
      res.json({
        age,
        restrictions,
        legalBasis: "Greek Law 1837/1989 - Protection of Minors at Work"
      });
    } catch (error) {
      console.error("Error getting work restrictions:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  /**
   * Validate a shift for a specific employee
   */
  app.post("/api/minor-labor/validate-shift", async (req, res) => {
    try {
      const { employeeId, startTime, endTime, shiftDurationHours } = req.body;
      
      if (!employeeId || !startTime || !endTime || !shiftDurationHours) {
        return res.status(400).json({ 
          error: "Missing required fields: employeeId, startTime, endTime, shiftDurationHours" 
        });
      }

      const validation = await minorLaborProtectionService.validateShiftForEmployee(
        employeeId,
        new Date(startTime),
        new Date(endTime),
        shiftDurationHours
      );
      
      res.json({
        validation,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error validating shift:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  /**
   * Validate weekly hours for an employee
   */
  app.post("/api/minor-labor/validate-weekly-hours", async (req, res) => {
    try {
      const { employeeId, weekStart, proposedAdditionalHours } = req.body;
      
      if (!employeeId || !weekStart || proposedAdditionalHours === undefined) {
        return res.status(400).json({ 
          error: "Missing required fields: employeeId, weekStart, proposedAdditionalHours" 
        });
      }

      const validation = await minorLaborProtectionService.validateWeeklyHours(
        employeeId,
        new Date(weekStart),
        proposedAdditionalHours
      );
      
      res.json({
        validation,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error validating weekly hours:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  /**
   * Get all minor employees
   */
  app.get("/api/minor-labor/employees", async (req, res) => {
    try {
      const minors = await minorLaborProtectionService.getMinorEmployees();
      
      res.json({
        minors,
        count: minors.length,
        timestamp: new Date().toISOString(),
        legalNote: "All minor employees must comply with Greek Law 1837/1989"
      });
    } catch (error) {
      console.error("Error getting minor employees:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  /**
   * Audit shifts for minor compliance
   */
  app.post("/api/minor-labor/audit-shifts", async (req, res) => {
    try {
      const { startDate, endDate } = req.body;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ 
          error: "Missing required fields: startDate, endDate" 
        });
      }

      const violations = await minorLaborProtectionService.auditMinorShifts(
        new Date(startDate),
        new Date(endDate)
      );
      
      res.json({
        auditPeriod: { startDate, endDate },
        violations,
        violationCount: violations.length,
        complianceStatus: violations.length === 0 ? "COMPLIANT" : "VIOLATIONS_FOUND",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error auditing shifts:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  /**
   * Create a manual compliance alert for minor labor violation
   */
  app.post("/api/minor-labor/create-alert", async (req, res) => {
    try {
      const { employeeId, violation, severity = 'HIGH' } = req.body;
      
      if (!employeeId || !violation) {
        return res.status(400).json({ 
          error: "Missing required fields: employeeId, violation" 
        });
      }

      await minorLaborProtectionService.createMinorLaborAlert(
        employeeId,
        violation,
        severity as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
      );
      
      res.json({
        success: true,
        message: "Minor labor compliance alert created",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error creating alert:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  /**
   * Get comprehensive minor labor protection summary
   */
  app.get("/api/minor-labor/summary", async (req, res) => {
    try {
      const minors = await minorLaborProtectionService.getMinorEmployees();
      
      // Calculate statistics
      const ageGroups = {
        under15: minors.filter(m => m.age < 15).length,
        age15to16: minors.filter(m => m.age >= 15 && m.age < 16).length,
        age16to17: minors.filter(m => m.age >= 16 && m.age < 18).length
      };

      const workPermitStatus = {
        required: minors.filter(m => m.restrictions.requiresWorkPermit).length,
        hasPermit: minors.filter(m => m.employee.workPermitNumber).length,
        expired: minors.filter(m => 
          m.employee.workPermitExpiresAt && 
          new Date() > new Date(m.employee.workPermitExpiresAt)
        ).length
      };

      res.json({
        summary: {
          totalMinors: minors.length,
          ageGroups,
          workPermitStatus,
          keyRestrictions: {
            nightWorkProhibited: minors.filter(m => !m.restrictions.canWorkNightShifts).length,
            overtimeProhibited: minors.filter(m => !m.restrictions.canWorkOvertime).length,
            maxDailyHours: {
              sixHours: minors.filter(m => m.restrictions.maxHoursPerDay === 6).length,
              eightHours: minors.filter(m => m.restrictions.maxHoursPerDay === 8).length
            }
          }
        },
        legalFramework: {
          primaryLaw: "Law 1837/1989 - Protection of Minors at Work",
          keyRestrictions: [
            "No night work (10 PM - 6 AM) for anyone under 18",
            "No overtime work for minors",
            "Work permits required for all workers under 18",
            "Maximum 6 hours/day for ages 15-16",
            "Maximum 8 hours/day for ages 16-17"
          ],
          enforcement: "Hellenic Labour Inspectorate (SEPE)"
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error generating summary:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}