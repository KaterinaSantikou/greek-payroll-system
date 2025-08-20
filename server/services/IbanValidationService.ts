/**
 * IBAN Validation Service for Greek Banking
 * Handles server-side validation, secure storage, and audit logging
 */

import { db } from "../db";
import { secureIbanVault, ibanValidationHistory, employees } from "@shared/schema";
import { validateIban, matchAccountHolderName, maskIban, type IbanValidationResult, type NameMatchResult } from "@shared/ibanValidation";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

export interface IbanValidationRequest {
  employeeId: string;
  iban: string;
  accountHolderName: string;
  overrideReason?: string;
}

export interface IbanValidationResponse {
  success: boolean;
  validation: IbanValidationResult;
  nameMatch: NameMatchResult;
  warnings: Array<{
    type: 'name_mismatch' | 'iban_warning' | 'bank_unknown';
    message: string;
    canOverride: boolean;
    severity: 'low' | 'medium' | 'high';
  }>;
  requiresOverride: boolean;
  canSave: boolean;
}

export interface SecureIbanSaveRequest {
  employeeId: string;
  iban: string;
  accountHolderName: string;
  nameOverrideReason?: string;
  validatedBy: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * IBAN Validation Service
 */
export class IbanValidationService {
  
  /**
   * Validate IBAN and name match for employee
   */
  static async validateEmployeeIban(
    request: IbanValidationRequest,
    validatedBy: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<IbanValidationResponse> {
    
    // Get employee information
    const [employee] = await db.select()
      .from(employees)
      .where(eq(employees.employeeId, request.employeeId));
    
    if (!employee) {
      throw new Error('Employee not found');
    }
    
    // Validate IBAN format and checksum
    const ibanValidation = validateIban(request.iban);
    
    // Check name match - parse from name field
    const employeeFullName = employee.name || 'Unknown Employee';
    const nameMatch = matchAccountHolderName(employeeFullName, request.accountHolderName);
    
    // Build warnings array
    const warnings: IbanValidationResponse['warnings'] = [];
    
    // Add IBAN warnings
    for (const warning of ibanValidation.warnings) {
      warnings.push({
        type: 'iban_warning',
        message: warning,
        canOverride: true,
        severity: 'low'
      });
    }
    
    // Add name match warnings
    if (!nameMatch.isMatch) {
      let severity: 'low' | 'medium' | 'high' = 'high';
      
      if (nameMatch.similarity >= 70) {
        severity = 'medium';
      } else if (nameMatch.similarity >= 50) {
        severity = 'medium';
      }
      
      warnings.push({
        type: 'name_mismatch',
        message: `Account holder name "${request.accountHolderName}" does not match employee name "${employeeFullName}" (${nameMatch.similarity}% similarity). ${nameMatch.reason}`,
        canOverride: true,
        severity
      });
    }
    
    // Add bank warnings
    if (!ibanValidation.bankName) {
      warnings.push({
        type: 'bank_unknown',
        message: 'Bank could not be identified from IBAN',
        canOverride: true,
        severity: 'low'
      });
    }
    
    // Determine if override is required
    const requiresOverride = !ibanValidation.isValid || !nameMatch.isMatch;
    const canSave = ibanValidation.isValid && (nameMatch.isMatch || request.overrideReason);
    
    // Log validation attempt
    await this.logValidationAttempt({
      employeeId: request.employeeId,
      maskedIban: maskIban(request.iban),
      validationType: 'full_validation',
      validationResult: canSave ? 'pass' : (requiresOverride ? 'warning' : 'fail'),
      errors: ibanValidation.errors,
      warnings: warnings.map(w => w.message),
      employeeNameUsed: employeeFullName,
      accountHolderNameProvided: request.accountHolderName,
      nameSimilarityScore: nameMatch.similarity,
      validatedBy,
      ipAddress,
      userAgent
    });
    
    return {
      success: ibanValidation.isValid && !ibanValidation.errors.length,
      validation: ibanValidation,
      nameMatch,
      warnings,
      requiresOverride,
      canSave
    };
  }
  
  /**
   * Securely save IBAN to vault after validation
   */
  static async saveSecureIban(request: SecureIbanSaveRequest): Promise<{
    success: boolean;
    vaultId: string;
    maskedIban: string;
  }> {
    
    // Re-validate before saving
    const validation = await this.validateEmployeeIban(
      {
        employeeId: request.employeeId,
        iban: request.iban,
        accountHolderName: request.accountHolderName,
        overrideReason: request.nameOverrideReason
      },
      request.validatedBy,
      request.ipAddress,
      request.userAgent
    );
    
    if (!validation.canSave) {
      throw new Error('IBAN validation failed - cannot save to secure vault');
    }
    
    const cleanIban = request.iban.replace(/\s/g, '').toUpperCase();
    const vaultId = nanoid();
    
    // Deactivate existing IBAN records for this employee
    await db.update(secureIbanVault)
      .set({ 
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(secureIbanVault.employeeId, request.employeeId));
    
    // Save new IBAN record
    const [vaultRecord] = await db.insert(secureIbanVault)
      .values({
        vaultId,
        employeeId: request.employeeId,
        fullIban: cleanIban,
        ibanCountryCode: cleanIban.substring(0, 2),
        bankCode: validation.validation.bankCode,
        bankName: validation.validation.bankName,
        accountHolderName: request.accountHolderName,
        nameMatchScore: validation.nameMatch.similarity,
        nameMatchStatus: validation.nameMatch.isMatch ? 'match' : 'override',
        nameOverrideReason: request.nameOverrideReason,
        ibanValidated: true,
        validatedAt: new Date(),
        validatedBy: request.validatedBy,
        isActive: true as boolean
      })
      .returning();
    
    // Log the save operation
    await this.logValidationAttempt({
      vaultId,
      employeeId: request.employeeId,
      maskedIban: validation.validation.maskedIban || maskIban(cleanIban),
      validationType: 'secure_save',
      validationResult: 'pass',
      errors: [],
      warnings: validation.warnings.map(w => w.message),
      validatedBy: request.validatedBy,
      ipAddress: request.ipAddress,
      userAgent: request.userAgent
    });
    
    return {
      success: true,
      vaultId,
      maskedIban: validation.validation.maskedIban || maskIban(cleanIban)
    };
  }
  
  /**
   * Get employee's active IBAN (masked)
   */
  static async getEmployeeIban(employeeId: string): Promise<{
    vaultId: string;
    maskedIban: string;
    accountHolderName: string;
    bankName?: string;
    nameMatchStatus: string;
    validatedAt?: Date;
  } | null> {
    
    const [vaultRecord] = await db.select()
      .from(secureIbanVault)
      .where(and(
        eq(secureIbanVault.employeeId, employeeId),
        eq(secureIbanVault.isActive, true)
      ))
      .orderBy(desc(secureIbanVault.createdAt));
    
    if (!vaultRecord) {
      return null;
    }
    
    // Update usage tracking
    await db.update(secureIbanVault)
      .set({
        lastUsedAt: new Date(),
        usageCount: (vaultRecord.usageCount || 0) + 1
      })
      .where(eq(secureIbanVault.vaultId, vaultRecord.vaultId));
    
    return {
      vaultId: vaultRecord.vaultId,
      maskedIban: maskIban(vaultRecord.fullIban),
      accountHolderName: vaultRecord.accountHolderName,
      bankName: vaultRecord.bankName || undefined,
      nameMatchStatus: vaultRecord.nameMatchStatus || 'pending',
      validatedAt: vaultRecord.validatedAt || undefined
    };
  }
  
  /**
   * Get full IBAN for authorized operations (payment processing)
   */
  static async getFullIbanForPayment(
    employeeId: string,
    requestedBy: string,
    purpose: string = 'payment_processing'
  ): Promise<{
    vaultId: string;
    fullIban: string;
    accountHolderName: string;
    bankCode?: string;
  } | null> {
    
    const [vaultRecord] = await db.select()
      .from(secureIbanVault)
      .where(and(
        eq(secureIbanVault.employeeId, employeeId),
        eq(secureIbanVault.isActive, true),
        eq(secureIbanVault.ibanValidated, true)
      ))
      .orderBy(desc(secureIbanVault.createdAt));
    
    if (!vaultRecord) {
      return null;
    }
    
    // Log access to full IBAN
    await this.logValidationAttempt({
      vaultId: vaultRecord.vaultId,
      employeeId,
      maskedIban: maskIban(vaultRecord.fullIban),
      validationType: 'full_iban_access',
      validationResult: 'pass',
      errors: [],
      warnings: [`Full IBAN accessed for: ${purpose}`],
      validatedBy: requestedBy
    });
    
    return {
      vaultId: vaultRecord.vaultId,
      fullIban: vaultRecord.fullIban,
      accountHolderName: vaultRecord.accountHolderName,
      bankCode: vaultRecord.bankCode || undefined
    };
  }
  
  /**
   * Get validation history for employee
   */
  static async getValidationHistory(
    employeeId: string,
    limit: number = 20
  ): Promise<Array<{
    validationId: string;
    maskedIban: string;
    validationType: string;
    validationResult: string;
    errors: string[];
    warnings: string[];
    nameSimilarityScore?: number;
    validatedBy: string;
    createdAt: Date;
  }>> {
    
    const history = await db.select()
      .from(ibanValidationHistory)
      .where(eq(ibanValidationHistory.employeeId, employeeId))
      .orderBy(desc(ibanValidationHistory.createdAt))
      .limit(limit);
    
    return history.map(record => ({
      validationId: record.validationId,
      maskedIban: record.maskedIban || 'N/A',
      validationType: record.validationType,
      validationResult: record.validationResult,
      errors: Array.isArray(record.errors) ? record.errors as string[] : [],
      warnings: Array.isArray(record.warnings) ? record.warnings as string[] : [],
      nameSimilarityScore: record.nameSimilarityScore || undefined,
      validatedBy: record.validatedBy,
      createdAt: record.createdAt!
    }));
  }
  
  /**
   * Log validation attempt to audit history
   */
  private static async logValidationAttempt(data: {
    vaultId?: string;
    employeeId: string;
    maskedIban: string;
    validationType: string;
    validationResult: string;
    errors: string[];
    warnings: string[];
    employeeNameUsed?: string;
    accountHolderNameProvided?: string;
    nameSimilarityScore?: number;
    validatedBy: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    
    try {
      await db.insert(ibanValidationHistory)
        .values({
          validationId: nanoid(),
          vaultId: data.vaultId,
          employeeId: data.employeeId,
          maskedIban: data.maskedIban,
          validationType: data.validationType,
          validationResult: data.validationResult,
          errors: data.errors,
          warnings: data.warnings,
          employeeNameUsed: data.employeeNameUsed,
          accountHolderNameProvided: data.accountHolderNameProvided,
          nameSimilarityScore: data.nameSimilarityScore,
          validatedBy: data.validatedBy,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent
        });
    } catch (error) {
      console.error('Failed to log IBAN validation attempt:', error);
      // Don't throw - validation logging shouldn't break the main flow
    }
  }
  
  /**
   * Generate test IBANs for demo purposes
   */
  static generateTestData(): Array<{
    iban: string;
    maskedIban: string;
    bankName: string;
    accountHolderName: string;
  }> {
    const testData = [
      {
        iban: 'GR1601400000000012345678901',
        bankName: 'Alpha Bank',
        accountHolderName: 'ΜΑΡΙΑ ΠΑΠΑΔΟΠΟΥΛΟΥ'
      },
      {
        iban: 'GR3601710020006789012345678',
        bankName: 'Piraeus Bank', 
        accountHolderName: 'ΓΙΑΝΝΗΣ ΚΩΝΣΤΑΝΤΙΝΟΥ'
      },
      {
        iban: 'GR4401100000000001234567890',
        bankName: 'National Bank of Greece',
        accountHolderName: 'ΕΛΕΝΗ ΔΗΜΗΤΡΙΟΥ'
      }
    ];
    
    return testData.map(item => ({
      ...item,
      maskedIban: maskIban(item.iban)
    }));
  }
}