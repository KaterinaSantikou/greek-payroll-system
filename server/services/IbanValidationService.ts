/**
 * IBAN Validation Service for Greek Banking
 * Handles server-side validation, secure storage, and audit logging
 */

import { db } from "../db";
import { secureIbanVault, ibanValidationHistory, employees } from "@shared/schema";
import { validateIbanEnhanced, maskIbanSecurely, type EnhancedIbanValidationResult } from "@shared/ibanValidationEnhanced";
import { matchGreekNames, type NameMatchResult } from "@shared/greekNameNormalization";
import { ibanI18n, type Language } from "@shared/ibanI18n";
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
  validation: EnhancedIbanValidationResult;
  requiresOverride: boolean;
  canSave: boolean;
  maskedIban: string;
  validationTimeMs: number;
  localized: {
    summary: string;
    errors: string[];
    warnings: string[];
  };
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
    userAgent?: string,
    language: Language = 'en'
  ): Promise<IbanValidationResponse> {
    
    // Set language for localization
    ibanI18n.setLanguage(language);
    
    // Get employee information
    const [employee] = await db.select()
      .from(employees)
      .where(eq(employees.employeeId, request.employeeId));
    
    if (!employee) {
      throw new Error('Employee not found');
    }
    
    // Get employee name
    const employeeFullName = employee.name || 'Unknown Employee';
    
    // Enhanced IBAN validation with Greek name matching
    const validation = validateIbanEnhanced(
      request.iban,
      employeeFullName,
      request.accountHolderName
    );
    
    // Determine save capability
    const requiresOverride = validation.decision === 'warn';
    const canSave = validation.decision !== 'fail' && 
                   (validation.decision === 'pass' || request.overrideReason);
    
    // Localize messages
    const localizedErrors = validation.errors.map(error => 
      ibanI18n.getValidationErrorMessage(error)
    );
    
    const localizedWarnings = validation.warnings.map(warning => 
      ibanI18n.getValidationErrorMessage(warning.message)
    );
    
    const summary = ibanI18n.formatValidationSummary(
      validation.decision,
      validation.validationTimeMs,
      validation.nameMatch?.score
    );
    
    // Log validation attempt with enhanced metrics
    await this.logValidationAttempt({
      employeeId: request.employeeId,
      maskedIban: validation.maskedIban,
      validationType: 'enhanced_validation',
      validationResult: validation.decision,
      errors: validation.errors,
      warnings: validation.warnings.map(w => w.message),
      employeeNameUsed: employeeFullName,
      accountHolderNameProvided: request.accountHolderName,
      nameSimilarityScore: validation.nameMatch?.score || 0,
      validatedBy,
      ipAddress,
      userAgent
    });
    
    return {
      success: validation.isValid,
      validation,
      requiresOverride,
      canSave,
      maskedIban: validation.maskedIban,
      validationTimeMs: validation.validationTimeMs,
      localized: {
        summary,
        errors: localizedErrors,
        warnings: localizedWarnings
      }
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
    
    // Save new IBAN record with enhanced validation data
    const [vaultRecord] = await db.insert(secureIbanVault)
      .values({
        vaultId,
        employeeId: request.employeeId,
        fullIban: cleanIban,
        ibanCountryCode: cleanIban.substring(0, 2),
        bankCode: validation.validation.bankInfo?.bankCode,
        bankName: validation.validation.bankInfo?.bankName,
        accountHolderName: request.accountHolderName,
        nameMatchScore: validation.validation.nameMatch?.score || 0,
        nameMatchStatus: validation.validation.nameMatch?.isAcceptable ? 'match' : 'override',
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
      maskedIban: validation.validation.maskedIban
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