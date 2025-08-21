/**
 * Greek Employment Types API Routes
 * 
 * Handles specialized Greek employment contracts:
 * - Apprenticeships (Μαθητεία ΕΠΑΛ/ΙΕΚ)
 * - Part-time variable hours (εκ περιτροπής εργασία)
 * - Seasonal employees (ξενοδοχεία/τουρισμός)
 * - Multiple employers (πολλαπλή απασχόληση)
 */

import type { Express } from "express";
import { isAuthenticated } from "../replitAuth";
import { greekEmploymentTypesService } from "../services/GreekEmploymentTypesService";
import { storage } from "../storage";

export function registerEmploymentTypesRoutes(app: Express): void {
  
  // Get all supported employment types
  app.get('/api/employment-types', isAuthenticated, async (req, res) => {
    try {
      const types = [
        'indefinite',
        'fixed-term', 
        'seasonal',
        'apprenticeship',
        'part_time_variable',
        'multiple_employers'
      ].map(type => ({
        id: type,
        ...greekEmploymentTypesService.getEmploymentTypeInfo(type)
      }));
      
      res.json(types);
    } catch (error) {
      console.error('Error fetching employment types:', error);
      res.status(500).json({ error: 'Failed to fetch employment types' });
    }
  });

  // Calculate apprenticeship wages
  app.post('/api/employment-types/apprenticeship/calculate', isAuthenticated, async (req, res) => {
    try {
      const { baseSalary, monthsCompleted } = req.body;
      
      if (!baseSalary || baseSalary <= 0) {
        return res.status(400).json({ error: 'Valid base salary is required' });
      }
      
      const calculation = greekEmploymentTypesService.calculateApprenticeshipWages(
        parseFloat(baseSalary),
        parseInt(monthsCompleted) || 0
      );
      
      res.json({
        ...calculation,
        legalBasis: 'Law 3475/2006 - Apprenticeships',
        description: '75% of minimum wage (€830), reduced EFKA contributions'
      });
    } catch (error) {
      console.error('Error calculating apprenticeship wages:', error);
      res.status(500).json({ error: 'Failed to calculate apprenticeship wages' });
    }
  });

  // Calculate variable hours wages
  app.post('/api/employment-types/variable-hours/calculate', isAuthenticated, async (req, res) => {
    try {
      const { 
        contractedHours, 
        actualHours, 
        baseSalary, 
        nightHours = 0, 
        sundayHours = 0, 
        overtimeHours = 0 
      } = req.body;
      
      if (!contractedHours || !actualHours || !baseSalary) {
        return res.status(400).json({ 
          error: 'Contracted hours, actual hours, and base salary are required' 
        });
      }
      
      const calculation = greekEmploymentTypesService.calculateVariableHours(
        parseFloat(contractedHours),
        parseFloat(actualHours),
        parseFloat(baseSalary),
        parseFloat(nightHours),
        parseFloat(sundayHours),
        parseFloat(overtimeHours)
      );
      
      res.json({
        ...calculation,
        totalPay: calculation.proratedSalary + calculation.nightPremium + 
                  calculation.sundayPremium + calculation.overtimePremium,
        description: 'Εκ περιτροπής εργασία - Prorated salary with premiums on actual hours'
      });
    } catch (error) {
      console.error('Error calculating variable hours wages:', error);
      res.status(500).json({ error: 'Failed to calculate variable hours wages' });
    }
  });

  // Calculate seasonal employee severance
  app.post('/api/employment-types/seasonal/calculate-severance', isAuthenticated, async (req, res) => {
    try {
      const { 
        contractStart, 
        contractEnd, 
        actualTermination, 
        monthlySalary, 
        terminationReason 
      } = req.body;
      
      if (!contractStart || !contractEnd || !monthlySalary) {
        return res.status(400).json({ 
          error: 'Contract start, end dates, and monthly salary are required' 
        });
      }
      
      const calculation = greekEmploymentTypesService.calculateSeasonalSeverance(
        new Date(contractStart),
        new Date(contractEnd),
        actualTermination ? new Date(actualTermination) : null,
        parseFloat(monthlySalary),
        terminationReason as 'employer' | 'employee' | 'mutual' | 'natural'
      );
      
      res.json({
        ...calculation,
        legalBasis: 'Law 1346/1983 - Seasonal Employment',
        description: 'Early termination severance calculation for seasonal workers'
      });
    } catch (error) {
      console.error('Error calculating seasonal severance:', error);
      res.status(500).json({ error: 'Failed to calculate seasonal severance' });
    }
  });

  // Calculate multiple employers tax
  app.post('/api/employment-types/multiple-employers/calculate-tax', isAuthenticated, async (req, res) => {
    try {
      const { employeeAfm, currentGross, existingEmployersData } = req.body;
      
      if (!employeeAfm || !currentGross) {
        return res.status(400).json({ 
          error: 'Employee AFM and current gross salary are required' 
        });
      }
      
      // For demo, using provided data or defaults
      const multipleEmployersData = existingEmployersData || {
        cumulativeGross: 0,
        cumulativeTax: 0,
        allEmployers: []
      };
      
      const calculation = greekEmploymentTypesService.calculateMultipleEmployersTax(
        employeeAfm,
        parseFloat(currentGross),
        multipleEmployersData
      );
      
      res.json({
        ...calculation,
        employeeAfm,
        currentGross: parseFloat(currentGross),
        description: 'Πολλαπλή απασχόληση - Tax calculation across multiple employers',
        note: 'Tax-free threshold (€9,200) applies per person, not per employer'
      });
    } catch (error) {
      console.error('Error calculating multiple employers tax:', error);
      res.status(500).json({ error: 'Failed to calculate multiple employers tax' });
    }
  });

  // Validate employment type configuration
  app.post('/api/employment-types/validate', isAuthenticated, async (req, res) => {
    try {
      const { employmentType, contractData, employeeAge } = req.body;
      
      if (!employmentType) {
        return res.status(400).json({ error: 'Employment type is required' });
      }
      
      const validation = greekEmploymentTypesService.validateEmploymentType(
        employmentType,
        contractData || {},
        employeeAge
      );
      
      res.json({
        employmentType,
        ...validation,
        typeInfo: greekEmploymentTypesService.getEmploymentTypeInfo(employmentType)
      });
    } catch (error) {
      console.error('Error validating employment type:', error);
      res.status(500).json({ error: 'Failed to validate employment type' });
    }
  });

  // Get employees by employment type
  app.get('/api/employment-types/:type/employees', isAuthenticated, async (req, res) => {
    try {
      const { type } = req.params;
      const { propertyId } = req.query;
      
      // This would typically query the database for employees with specific employment type
      // For now, returning a structured response
      res.json({
        employmentType: type,
        typeInfo: greekEmploymentTypesService.getEmploymentTypeInfo(type),
        employees: [], // Would be populated from actual database query
        totalCount: 0,
        summary: {
          active: 0,
          terminated: 0,
          total: 0
        }
      });
    } catch (error) {
      console.error('Error fetching employees by type:', error);
      res.status(500).json({ error: 'Failed to fetch employees by type' });
    }
  });

  // Update multiple employers tracking
  app.post('/api/employment-types/multiple-employers/update', isAuthenticated, async (req, res) => {
    try {
      const { 
        employeeAfm, 
        taxYear, 
        employerAfm, 
        grossEarnings, 
        taxDeducted, 
        efkaContributions,
        isPrimaryEmployer 
      } = req.body;
      
      if (!employeeAfm || !taxYear || !employerAfm) {
        return res.status(400).json({ 
          error: 'Employee AFM, tax year, and employer AFM are required' 
        });
      }
      
      // This would update the multipleEmployers table
      // For now, returning success response
      res.json({
        success: true,
        employeeAfm,
        taxYear,
        employerAfm,
        updated: new Date().toISOString(),
        message: 'Multiple employers data updated successfully'
      });
    } catch (error) {
      console.error('Error updating multiple employers data:', error);
      res.status(500).json({ error: 'Failed to update multiple employers data' });
    }
  });

  // Employment type compliance report
  app.get('/api/employment-types/compliance-report', isAuthenticated, async (req, res) => {
    try {
      const { propertyId, year } = req.query;
      
      // This would generate a comprehensive compliance report
      const report = {
        reportDate: new Date().toISOString(),
        propertyId: propertyId || 'all',
        year: year || new Date().getFullYear(),
        summary: {
          totalEmployees: 0,
          byType: {
            apprenticeship: { count: 0, compliant: 0, issues: 0 },
            part_time_variable: { count: 0, compliant: 0, issues: 0 },
            seasonal: { count: 0, compliant: 0, issues: 0 },
            multiple_employers: { count: 0, compliant: 0, issues: 0 }
          }
        },
        complianceIssues: [],
        recommendations: [
          'Ensure all apprentices receive at least 75% of minimum wage',
          'Verify work permits for all employees under 18',
          'Track cumulative earnings for multiple employer situations',
          'Document seasonal contract end dates properly'
        ]
      };
      
      res.json(report);
    } catch (error) {
      console.error('Error generating compliance report:', error);
      res.status(500).json({ error: 'Failed to generate compliance report' });
    }
  });
}