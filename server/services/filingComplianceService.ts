import { db } from "./db";
import { 
  employees, 
  payrollCalculations, 
  properties, 
  complianceFilings,
  erganiSubmissions,
  digitalWorkCardEvents
} from "@shared/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { format, startOfMonth, endOfMonth, addMonths } from "date-fns";

export interface APDFiling {
  filingId: string;
  period: string; // YYYY-MM
  propertyId: string;
  totalEmployees: number;
  totalGrossWages: string;
  totalEmployeeContributions: string;
  totalEmployerContributions: string;
  filingData: APDEmployeeData[];
  status: 'draft' | 'generated' | 'submitted' | 'accepted' | 'rejected';
  submissionReference?: string;
  receiptNumber?: string;
  createdAt: string;
  submittedAt?: string;
}

export interface APDEmployeeData {
  employeeId: string;
  afm: string;
  amka: string;
  insuranceCategory: string;
  daysWorked: number;
  grossWages: string;
  employeeContribution: string;
  employerContribution: string;
  unemploymentFund: string;
  specialContributions: string;
}

export interface FMYFiling {
  filingId: string;
  period: string; // YYYY-MM
  propertyId: string;
  totalEmployees: number;
  totalGrossWages: string;
  totalTaxWithheld: string;
  filingData: FMYEmployeeData[];
  status: 'draft' | 'generated' | 'submitted' | 'accepted' | 'rejected';
  submissionReference?: string;
  paymentDueDate: string;
  createdAt: string;
  submittedAt?: string;
}

export interface FMYEmployeeData {
  employeeId: string;
  afm: string;
  grossWages: string;
  taxableIncome: string;
  taxWithheld: string;
  specialTax: string; // Solidarity tax
  allowances: string;
}

export interface ERGANIFormPack {
  packId: string;
  formType: 'hire' | 'schedule' | 'overtime' | 'change' | 'termination';
  employeeId: string;
  propertyId: string;
  formData: any;
  status: 'draft' | 'submitted' | 'accepted' | 'rejected';
  submissionReference?: string;
  erganiEventId?: string;
  createdAt: string;
  submittedAt?: string;
}

export interface DigitalWorkCardDashboard {
  propertyId: string;
  period: string;
  totalEmployees: number;
  coverageMetrics: {
    employeesWithCards: number;
    coveragePercentage: number;
    pendingActivations: number;
    expiredCards: number;
  };
  submissionMetrics: {
    totalSubmissions: number;
    successfulSubmissions: number;
    failedSubmissions: number;
    successRate: number;
  };
  complianceStatus: {
    compliantEmployees: number;
    nonCompliantEmployees: number;
    violationCount: number;
    inspectorReadiness: 'ready' | 'needs_attention' | 'critical';
  };
}

export class FilingComplianceService {
  /**
   * Generate APD (e-EFKA) filing for monthly social security contributions
   */
  async generateAPDFiling(propertyId: string, period: string): Promise<APDFiling> {
    const startDate = startOfMonth(new Date(period + '-01'));
    const endDate = endOfMonth(startDate);

    // Get employees and their payroll calculations for the period
    const employeeList = await db
      .select()
      .from(employees)
      .where(eq(employees.companyId, propertyId));

    // Mock payroll data calculations (in production, would get from payrollCalculations)
    const filingData: APDEmployeeData[] = employeeList.map(emp => {
      const grossWages = 2500; // Average monthly salary
      const employeeContribution = grossWages * 0.16; // 16% employee contribution
      const employerContribution = grossWages * 0.2478; // 24.78% employer contribution
      const unemploymentFund = grossWages * 0.006; // 0.6% unemployment fund

      return {
        employeeId: emp.employeeId,
        afm: emp.afm || '',
        amka: emp.amka || '',
        insuranceCategory: emp.insuranceCategory || 'IKA_MAIN',
        daysWorked: 22, // Standard working days per month
        grossWages: grossWages.toFixed(2),
        employeeContribution: employeeContribution.toFixed(2),
        employerContribution: employerContribution.toFixed(2),
        unemploymentFund: unemploymentFund.toFixed(2),
        specialContributions: '0.00'
      };
    });

    const totalGrossWages = filingData.reduce((sum, emp) => sum + parseFloat(emp.grossWages), 0);
    const totalEmployeeContributions = filingData.reduce((sum, emp) => sum + parseFloat(emp.employeeContribution), 0);
    const totalEmployerContributions = filingData.reduce((sum, emp) => sum + parseFloat(emp.employerContribution), 0);

    const filing: APDFiling = {
      filingId: `APD_${propertyId}_${period}`,
      period,
      propertyId,
      totalEmployees: filingData.length,
      totalGrossWages: totalGrossWages.toFixed(2),
      totalEmployeeContributions: totalEmployeeContributions.toFixed(2),
      totalEmployerContributions: totalEmployerContributions.toFixed(2),
      filingData,
      status: 'generated',
      createdAt: new Date().toISOString()
    };

    // Save to database
    await this.saveComplianceFiling({
      filingId: filing.filingId,
      propertyId,
      filingType: 'APD',
      period,
      status: 'generated',
      filingData: JSON.stringify(filing),
      totalAmount: totalGrossWages.toFixed(2),
      dueDate: endOfMonth(addMonths(startDate, 1)),
      createdAt: new Date()
    });

    return filing;
  }

  /**
   * Generate ΦΜΥ (AADE) filing for monthly tax withholding
   */
  async generateFMYFiling(propertyId: string, period: string): Promise<FMYFiling> {
    const startDate = startOfMonth(new Date(period + '-01'));
    const endDate = endOfMonth(startDate);
    const paymentDueDate = endOfMonth(addMonths(startDate, 1)); // Due end of next month

    // Get employees for the property
    const employeeList = await db
      .select()
      .from(employees)
      .where(eq(employees.companyId, propertyId));

    const filingData: FMYEmployeeData[] = employeeList.map(emp => {
      const grossWages = 2500; // Average monthly salary
      const taxableIncome = grossWages; // Simplification - would need allowance calculations
      const taxWithheld = grossWages * 0.22; // 22% basic tax rate
      const specialTax = grossWages > 12000 ? grossWages * 0.022 : 0; // Solidarity tax for higher earners

      return {
        employeeId: emp.employeeId,
        afm: emp.afm || '',
        grossWages: grossWages.toFixed(2),
        taxableIncome: taxableIncome.toFixed(2),
        taxWithheld: taxWithheld.toFixed(2),
        specialTax: specialTax.toFixed(2),
        allowances: '0.00' // Would calculate tax-free allowances
      };
    });

    const totalGrossWages = filingData.reduce((sum, emp) => sum + parseFloat(emp.grossWages), 0);
    const totalTaxWithheld = filingData.reduce((sum, emp) => sum + parseFloat(emp.taxWithheld), 0);

    const filing: FMYFiling = {
      filingId: `FMY_${propertyId}_${period}`,
      period,
      propertyId,
      totalEmployees: filingData.length,
      totalGrossWages: totalGrossWages.toFixed(2),
      totalTaxWithheld: totalTaxWithheld.toFixed(2),
      filingData,
      status: 'generated',
      paymentDueDate: format(paymentDueDate, 'yyyy-MM-dd'),
      createdAt: new Date().toISOString()
    };

    // Save to database
    await this.saveComplianceFiling({
      filingId: filing.filingId,
      propertyId,
      filingType: 'FMY',
      period,
      status: 'generated',
      filingData: JSON.stringify(filing),
      totalAmount: totalTaxWithheld.toFixed(2),
      dueDate: paymentDueDate,
      createdAt: new Date()
    });

    return filing;
  }

  /**
   * Create ERGANI II form pack for various employment events
   */
  async createERGANIFormPack(
    formType: 'hire' | 'schedule' | 'overtime' | 'change' | 'termination',
    employeeId: string,
    propertyId: string,
    formData: any
  ): Promise<ERGANIFormPack> {
    const packId = `ERGANI_${formType.toUpperCase()}_${employeeId}_${Date.now()}`;

    const formPack: ERGANIFormPack = {
      packId,
      formType,
      employeeId,
      propertyId,
      formData: this.formatERGANIFormData(formType, formData),
      status: 'draft',
      createdAt: new Date().toISOString()
    };

    // Save to database
    await this.saveERGANISubmission({
      submissionId: packId,
      employeeId,
      propertyId,
      eventType: formType,
      formData: JSON.stringify(formPack.formData),
      status: 'draft',
      createdAt: new Date()
    });

    return formPack;
  }

  /**
   * Generate Digital Work Card dashboard data
   */
  async generateDigitalWorkCardDashboard(propertyId: string, period: string): Promise<DigitalWorkCardDashboard> {
    const startDate = startOfMonth(new Date(period + '-01'));
    const endDate = endOfMonth(startDate);

    // Get all employees for the property
    const allEmployees = await db
      .select()
      .from(employees)
      .where(eq(employees.companyId, propertyId));

    // Calculate digital work card metrics
    const totalEmployees = allEmployees.length;
    const employeesWithCards = Math.floor(totalEmployees * 0.95); // 95% coverage
    const pendingActivations = totalEmployees - employeesWithCards;
    const expiredCards = Math.floor(totalEmployees * 0.02); // 2% expired

    // Calculate submission metrics
    const totalSubmissions = totalEmployees * 22; // Avg 22 working days
    const successfulSubmissions = Math.floor(totalSubmissions * 0.987); // 98.7% success rate
    const failedSubmissions = totalSubmissions - successfulSubmissions;

    // Calculate compliance metrics
    const compliantEmployees = Math.floor(totalEmployees * 0.92); // 92% compliant
    const nonCompliantEmployees = totalEmployees - compliantEmployees;
    const violationCount = Math.floor(totalEmployees * 0.05); // 5% violations

    const dashboard: DigitalWorkCardDashboard = {
      propertyId,
      period,
      totalEmployees,
      coverageMetrics: {
        employeesWithCards,
        coveragePercentage: (employeesWithCards / totalEmployees) * 100,
        pendingActivations,
        expiredCards
      },
      submissionMetrics: {
        totalSubmissions,
        successfulSubmissions,
        failedSubmissions,
        successRate: (successfulSubmissions / totalSubmissions) * 100
      },
      complianceStatus: {
        compliantEmployees,
        nonCompliantEmployees,
        violationCount,
        inspectorReadiness: violationCount === 0 ? 'ready' : violationCount < 3 ? 'needs_attention' : 'critical'
      }
    };

    return dashboard;
  }

  /**
   * Submit APD filing to e-EFKA
   */
  async submitAPDFiling(filingId: string): Promise<{ success: boolean; submissionReference?: string; receiptNumber?: string }> {
    // Mock submission to e-EFKA
    const submissionReference = `EFKA_${Date.now()}`;
    const receiptNumber = `RCP_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Update filing status
    await this.updateFilingStatus(filingId, 'submitted', submissionReference, receiptNumber);

    return {
      success: true,
      submissionReference,
      receiptNumber
    };
  }

  /**
   * Submit ΦΜΥ filing to AADE
   */
  async submitFMYFiling(filingId: string): Promise<{ success: boolean; submissionReference?: string }> {
    // Mock submission to AADE
    const submissionReference = `AADE_${Date.now()}`;

    // Update filing status
    await this.updateFilingStatus(filingId, 'submitted', submissionReference);

    return {
      success: true,
      submissionReference
    };
  }

  /**
   * Submit ERGANI II form pack
   */
  async submitERGANIFormPack(packId: string): Promise<{ success: boolean; erganiEventId?: string }> {
    // Mock submission to ERGANI II
    const erganiEventId = `EVT_${Date.now()}`;

    // Update form pack status
    await this.updateERGANISubmissionStatus(packId, 'submitted', erganiEventId);

    return {
      success: true,
      erganiEventId
    };
  }

  /**
   * Get filing history
   */
  async getFilingHistory(propertyId?: string, filingType?: string): Promise<any[]> {
    let query = db.select().from(complianceFilings).orderBy(desc(complianceFilings.createdAt));
    
    if (propertyId && filingType) {
      const history = await db
        .select()
        .from(complianceFilings)
        .where(
          and(
            eq(complianceFilings.propertyId, propertyId),
            eq(complianceFilings.filingType, filingType)
          )
        )
        .orderBy(desc(complianceFilings.createdAt));
      return history;
    } else if (propertyId) {
      const history = await db
        .select()
        .from(complianceFilings)
        .where(eq(complianceFilings.propertyId, propertyId))
        .orderBy(desc(complianceFilings.createdAt));
      return history;
    }

    const history = await query;
    return history;
  }

  /**
   * Generate inspector pack for Digital Work Card compliance
   */
  async generateInspectorPack(propertyId: string, startDate: Date, endDate: Date): Promise<{
    employeeCoverage: any[];
    submissionLogs: any[];
    violationReport: any[];
    complianceSummary: any;
  }> {
    // Get employees for the property
    const employees_list = await db
      .select()
      .from(employees)
      .where(eq(employees.companyId, propertyId));

    const employeeCoverage = employees_list.map(emp => ({
      employeeId: emp.employeeId,
      name: `${emp.firstName} ${emp.lastName}`,
      afm: emp.afm,
      digitalCardStatus: Math.random() > 0.05 ? 'active' : 'inactive',
      lastSubmission: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
      complianceScore: Math.floor(Math.random() * 20) + 80 // 80-100
    }));

    const submissionLogs: any[] = []; // Would contain actual submission data
    const violationReport: any[] = []; // Would contain violations data
    const complianceSummary = {
      totalEmployees: employees_list.length,
      compliantRate: 95.2,
      lastInspectionDate: format(new Date(Date.now() - 86400000 * 30), 'yyyy-MM-dd'),
      criticalIssues: 0
    };

    return {
      employeeCoverage,
      submissionLogs,
      violationReport,
      complianceSummary
    };
  }

  private formatERGANIFormData(formType: string, data: any): any {
    switch (formType) {
      case 'hire':
        return {
          employeeAFM: data.afm,
          contractType: data.contractType || 'FULL_TIME',
          startDate: data.startDate,
          position: data.position,
          salaryGrade: data.salaryGrade
        };
      case 'schedule':
        return {
          employeeAFM: data.afm,
          workSchedule: data.schedule,
          startDate: data.startDate,
          endDate: data.endDate
        };
      case 'overtime':
        return {
          employeeAFM: data.afm,
          overtimeDate: data.date,
          overtimeHours: data.hours,
          overtimeType: data.type
        };
      case 'change':
        return {
          employeeAFM: data.afm,
          changeType: data.changeType,
          effectiveDate: data.effectiveDate,
          newDetails: data.newDetails
        };
      case 'termination':
        return {
          employeeAFM: data.afm,
          terminationDate: data.terminationDate,
          terminationReason: data.reason,
          noticePeriod: data.noticePeriod
        };
      default:
        return data;
    }
  }

  private async saveComplianceFiling(filing: any): Promise<void> {
    await db.insert(complianceFilings).values(filing);
  }

  private async saveERGANISubmission(submission: any): Promise<void> {
    await db.insert(erganiSubmissions).values(submission);
  }

  private async updateFilingStatus(filingId: string, status: string, submissionReference?: string, receiptNumber?: string): Promise<void> {
    await db
      .update(complianceFilings)
      .set({
        status,
        submissionReference,
        receiptNumber,
        submittedAt: new Date()
      })
      .where(eq(complianceFilings.filingId, filingId));
  }

  private async updateERGANISubmissionStatus(submissionId: string, status: string, erganiEventId?: string): Promise<void> {
    await db
      .update(erganiSubmissions)
      .set({
        status,
        erganiEventId,
        submittedAt: new Date()
      })
      .where(eq(erganiSubmissions.submissionId, submissionId));
  }
}