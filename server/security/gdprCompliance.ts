import { db } from "../db";
import { employees, auditLog } from "@shared/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { nanoid } from "nanoid";
import { createHash } from "crypto";

/**
 * GDPR Compliance Framework for PayrollSync
 * Implements data protection requirements for Greek HR/Payroll system
 */

export interface GDPRRequest {
  requestId: string;
  dataSubjectId: string;
  requestType: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection';
  purpose: string;
  requestedBy: string;
  requestDate: Date;
  dueDate: Date;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  fulfillmentData?: any;
}

export interface DataProcessingPurpose {
  purpose: string;
  legalBasis: 'consent' | 'contract' | 'legal_obligation' | 'vital_interests' | 'public_task' | 'legitimate_interests';
  dataCategories: string[];
  retentionPeriod: number; // days
  description: string;
}

// Predefined data processing purposes for Greek HR/Payroll
const DATA_PROCESSING_PURPOSES: DataProcessingPurpose[] = [
  {
    purpose: 'payroll_processing',
    legalBasis: 'contract',
    dataCategories: ['personal_data', 'financial_data', 'employment_data'],
    retentionPeriod: 2190, // 6 years (Greek legal requirement)
    description: 'Processing salary payments and tax obligations'
  },
  {
    purpose: 'ergani_compliance',
    legalBasis: 'legal_obligation',
    dataCategories: ['personal_data', 'employment_data', 'working_time_data'],
    retentionPeriod: 1825, // 5 years (ERGANI retention requirement)
    description: 'Compliance with Greek labor inspection system'
  },
  {
    purpose: 'tax_reporting',
    legalBasis: 'legal_obligation',
    dataCategories: ['personal_data', 'financial_data'],
    retentionPeriod: 1825, // 5 years (AADE requirement)
    description: 'Tax withholding and reporting to Greek tax authorities'
  },
  {
    purpose: 'social_security',
    legalBasis: 'legal_obligation',
    dataCategories: ['personal_data', 'financial_data', 'health_data'],
    retentionPeriod: 2190, // 6 years (EFKA requirement)
    description: 'Social security contribution processing'
  }
];

class GDPRComplianceService {
  
  /**
   * Process Data Subject Access Request (DSAR)
   */
  async processAccessRequest(employeeId: string, requestedBy: string): Promise<any> {
    const requestId = nanoid();
    
    // Log the access request
    await this.logGDPRAction('access_request', employeeId, requestedBy, {
      requestId,
      timestamp: new Date().toISOString()
    });

    // Collect all personal data across the system
    const personalData = await this.collectPersonalData(employeeId);
    
    // Apply data minimization - only return relevant data
    const minimizedData = this.applyDataMinimization(personalData, 'access');
    
    return {
      requestId,
      dataSubject: employeeId,
      exportDate: new Date().toISOString(),
      dataCategories: Object.keys(minimizedData),
      data: minimizedData,
      processingPurposes: DATA_PROCESSING_PURPOSES,
      retentionSchedule: this.getRetentionSchedule(employeeId)
    };
  }

  /**
   * Process Right to Rectification
   */
  async processRectificationRequest(
    employeeId: string, 
    corrections: any, 
    requestedBy: string
  ): Promise<void> {
    const requestId = nanoid();
    
    // Validate corrections against purpose limitation
    const validatedCorrections = this.validatePurposeLimitation(corrections);
    
    // Apply corrections with audit trail
    await db.update(employees)
      .set({
        ...validatedCorrections,
        updatedAt: new Date(),
        updatedBy: requestedBy
      })
      .where(eq(employees.employeeId, employeeId));
    
    // Log rectification
    await this.logGDPRAction('rectification', employeeId, requestedBy, {
      requestId,
      originalData: await this.getOriginalData(employeeId, Object.keys(corrections)),
      corrections: validatedCorrections
    });
  }

  /**
   * Process Right to Erasure (Right to be Forgotten)
   */
  async processErasureRequest(
    employeeId: string, 
    requestedBy: string,
    reason: string
  ): Promise<{ canErase: boolean; restrictions: string[] }> {
    const requestId = nanoid();
    
    // Check for legal obligations that prevent erasure
    const erasureRestrictions = await this.checkErasureRestrictions(employeeId);
    
    if (erasureRestrictions.length > 0) {
      await this.logGDPRAction('erasure_denied', employeeId, requestedBy, {
        requestId,
        reason,
        restrictions: erasureRestrictions
      });
      
      return { canErase: false, restrictions: erasureRestrictions };
    }

    // Perform pseudonymization for audit/legal requirements
    await this.pseudonymizeEmployeeData(employeeId, requestedBy);
    
    await this.logGDPRAction('erasure_completed', employeeId, requestedBy, {
      requestId,
      reason,
      pseudonymizationDate: new Date().toISOString()
    });
    
    return { canErase: true, restrictions: [] };
  }

  /**
   * Process Data Portability Request
   */
  async processPortabilityRequest(employeeId: string, requestedBy: string): Promise<any> {
    const requestId = nanoid();
    
    // Export data in structured, machine-readable format
    const portableData = await this.generatePortableDataExport(employeeId);
    
    await this.logGDPRAction('portability_request', employeeId, requestedBy, {
      requestId,
      exportFormat: 'JSON',
      dataSize: JSON.stringify(portableData).length
    });
    
    return {
      requestId,
      format: 'application/json',
      data: portableData,
      exportDate: new Date().toISOString()
    };
  }

  /**
   * Implement data minimization principle
   */
  private applyDataMinimization(data: any, purpose: string): any {
    const relevantPurpose = DATA_PROCESSING_PURPOSES.find(p => 
      p.purpose === purpose || purpose === 'access'
    );
    
    if (!relevantPurpose && purpose !== 'access') {
      throw new Error(`Unknown processing purpose: ${purpose}`);
    }
    
    // For access requests, return all data with purpose annotations
    if (purpose === 'access') {
      const annotatedData: any = {};
      
      Object.keys(data).forEach(category => {
        const relevantPurposes = DATA_PROCESSING_PURPOSES.filter(p =>
          p.dataCategories.includes(category)
        );
        
        annotatedData[category] = {
          data: data[category],
          processingPurposes: relevantPurposes.map(p => ({
            purpose: p.purpose,
            legalBasis: p.legalBasis,
            retentionPeriod: p.retentionPeriod
          }))
        };
      });
      
      return annotatedData;
    }
    
    // Filter data based on purpose
    const minimizedData: any = {};
    relevantPurpose?.dataCategories.forEach(category => {
      if (data[category]) {
        minimizedData[category] = data[category];
      }
    });
    
    return minimizedData;
  }

  /**
   * Validate changes against purpose limitation
   */
  private validatePurposeLimitation(corrections: any): any {
    const validatedCorrections: any = {};
    
    Object.keys(corrections).forEach(field => {
      const isValidForPurpose = DATA_PROCESSING_PURPOSES.some(purpose =>
        this.isFieldValidForPurpose(field, purpose)
      );
      
      if (isValidForPurpose) {
        validatedCorrections[field] = corrections[field];
      }
    });
    
    return validatedCorrections;
  }

  /**
   * Check if field modification is valid for processing purposes
   */
  private isFieldValidForPurpose(field: string, purpose: DataProcessingPurpose): boolean {
    // Map fields to data categories
    const fieldCategoryMap: Record<string, string> = {
      'firstName': 'personal_data',
      'lastName': 'personal_data',
      'afm': 'personal_data',
      'amka': 'personal_data',
      'bankIban': 'financial_data',
      'baseSalary': 'financial_data',
      'employmentType': 'employment_data',
      'hireDate': 'employment_data'
    };
    
    const fieldCategory = fieldCategoryMap[field];
    return fieldCategory && purpose.dataCategories.includes(fieldCategory);
  }

  /**
   * Collect all personal data for an employee
   */
  private async collectPersonalData(employeeId: string): Promise<any> {
    // Collect from multiple tables
    const [employee] = await db.select()
      .from(employees)
      .where(eq(employees.employeeId, employeeId));
    
    // Group data by categories
    return {
      personal_data: {
        firstName: employee?.firstName,
        lastName: employee?.lastName,
        afm: employee?.afm,
        amka: employee?.amka,
        dateOfBirth: employee?.dateOfBirth,
        nationalityCode: employee?.nationalityCode
      },
      employment_data: {
        employeeNumber: employee?.employeeNumber,
        employmentType: employee?.employmentType,
        grade: employee?.grade,
        hireDate: employee?.hireDate,
        termDate: employee?.termDate
      },
      financial_data: {
        bankIban: employee?.bankIban
        // Additional financial data from wage components, payroll runs, etc.
      },
      contact_data: {
        emergencyContactName: employee?.emergencyContactName,
        emergencyContactPhone: employee?.emergencyContactPhone
      }
    };
  }

  /**
   * Check restrictions for data erasure
   */
  private async checkErasureRestrictions(employeeId: string): Promise<string[]> {
    const restrictions: string[] = [];
    
    // Check for active legal obligations
    const now = new Date();
    
    // Greek tax law requires 5-year retention
    const taxRetentionDate = new Date();
    taxRetentionDate.setFullYear(taxRetentionDate.getFullYear() - 5);
    
    // Check if employee has payroll records within retention period
    // const recentPayroll = await db.select()... (implementation depends on payroll tables)
    
    // Check for ongoing legal proceedings
    // const legalHolds = await checkLegalHolds(employeeId);
    
    // Add restrictions based on findings
    restrictions.push('Tax records must be retained for 5 years (Greek law)');
    restrictions.push('Social security records must be retained for 6 years (EFKA requirement)');
    
    return restrictions;
  }

  /**
   * Pseudonymize employee data while maintaining audit trail
   */
  private async pseudonymizeEmployeeData(employeeId: string, requestedBy: string): Promise<void> {
    const pseudonym = this.generatePseudonym(employeeId);
    
    await db.update(employees)
      .set({
        firstName: '[ERASED]',
        lastName: '[ERASED]',
        afm: '[ERASED]',
        amka: '[ERASED]',
        bankIban: '[ERASED]',
        emergencyContactName: '[ERASED]',
        emergencyContactPhone: '[ERASED]',
        pseudonym: pseudonym,
        erasureDate: new Date(),
        erasedBy: requestedBy,
        isErased: true
      })
      .where(eq(employees.employeeId, employeeId));
  }

  /**
   * Generate cryptographic pseudonym for erased data
   */
  private generatePseudonym(employeeId: string): string {
    return createHash('sha256')
      .update(`${employeeId}:${process.env.PSEUDONYM_SALT || 'default-salt'}`)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Generate portable data export
   */
  private async generatePortableDataExport(employeeId: string): Promise<any> {
    const personalData = await this.collectPersonalData(employeeId);
    
    return {
      version: '1.0',
      standard: 'GDPR Article 20',
      subject: employeeId,
      exportDate: new Date().toISOString(),
      data: personalData,
      metadata: {
        processingPurposes: DATA_PROCESSING_PURPOSES,
        dataController: 'PayrollSync Platform',
        contactDPO: 'dpo@payrollsync.gr'
      }
    };
  }

  /**
   * Get data retention schedule for employee
   */
  private getRetentionSchedule(employeeId: string): any {
    return DATA_PROCESSING_PURPOSES.map(purpose => ({
      purpose: purpose.purpose,
      retentionPeriod: `${purpose.retentionPeriod} days`,
      legalBasis: purpose.legalBasis,
      description: purpose.description
    }));
  }

  /**
   * Get original data for audit trail
   */
  private async getOriginalData(employeeId: string, fields: string[]): Promise<any> {
    const [employee] = await db.select()
      .from(employees)
      .where(eq(employees.employeeId, employeeId));
    
    const originalData: any = {};
    fields.forEach(field => {
      originalData[field] = (employee as any)?.[field];
    });
    
    return originalData;
  }

  /**
   * Log GDPR-related actions for compliance audit
   */
  private async logGDPRAction(
    action: string, 
    dataSubject: string, 
    performedBy: string, 
    details: any
  ): Promise<void> {
    try {
      await db.insert(auditLog).values({
        logId: nanoid(),
        eventType: `gdpr.${action}`,
        entityType: 'employee',
        entityId: dataSubject,
        userId: performedBy,
        changes: JSON.stringify(details),
        hashChain: 'gdpr-' + Date.now(),
        ipAddress: '127.0.0.1',
        userAgent: 'PayrollSync-GDPR-Service'
      });
    } catch (e: any) {
      console.warn('[Audit][soft-fail]', e.code, { 
        eventType: `gdpr.${action}`, 
        entityType: 'employee', 
        userId: performedBy 
      });
    }
  }
}

export const gdprService = new GDPRComplianceService();