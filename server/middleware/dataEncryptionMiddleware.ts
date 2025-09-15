/**
 * Data Encryption Middleware for Database Operations
 * 
 * This middleware automatically handles encryption and decryption of sensitive fields
 * during database read/write operations, ensuring transparent security for all
 * employee personal data access.
 * 
 * FEATURES:
 * - Automatic encryption before database writes
 * - Automatic decryption after database reads  
 * - Field-level access control based on user roles
 * - Audit logging for all sensitive data access
 * - GDPR compliance for data processing
 */

import { Request, Response, NextFunction } from 'express';
import { getSecurityService, SENSITIVE_FIELDS } from '../services/DataSecurityService.js';
import { logger } from '../observability/logging.js';

// =============================================================================
// ROLE-BASED FIELD ACCESS CONTROL
// =============================================================================

// Define which roles can access which sensitive fields
const FIELD_ACCESS_MATRIX = {
  afm: ['hr', 'payroll', 'auditor'], // Tax ID - restricted to HR, payroll, and auditors
  amka: ['hr', 'payroll', 'auditor'], // Social Security - restricted access
  paaypa: ['hr', 'payroll'], // Unified registry - HR and payroll only
  bankIban: ['payroll'], // Bank details - payroll department only
  dateOfBirth: ['hr', 'payroll', 'manager'], // Birth date - broader access
  personalPhoneNumber: ['hr', 'manager'], // Personal phone - HR and managers
  emergencyContactPhone: ['hr', 'manager'], // Emergency contact - HR and managers
  homeAddress: ['hr'], // Home address - HR only
} as const;

// User roles that have full decryption access (for system administration)
const FULL_ACCESS_ROLES = ['system_admin', 'data_controller', 'auditor'];

// =============================================================================
// ENCRYPTION MIDDLEWARE FUNCTIONS
// =============================================================================

/**
 * Middleware to automatically encrypt sensitive fields before database writes
 */
export function encryptSensitiveData() {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const securityService = getSecurityService();
      
      // Only process requests that contain employee data
      if (req.body && (req.body.employeeId || req.params.employeeId)) {
        const employeeId = req.body.employeeId || req.params.employeeId;
        
        // Check if request contains any sensitive fields
        const hasSensitiveFields = Object.keys(SENSITIVE_FIELDS).some(field => 
          req.body[field] !== undefined
        );
        
        if (hasSensitiveFields) {
          // Encrypt sensitive fields in the request body
          req.body = securityService.encryptEmployeeData(req.body, employeeId);
          
          // Log encryption event
          logger.info('Request data encrypted', {
            employeeId,
            userId: req.user?.id,
            endpoint: req.route?.path,
            method: req.method,
            sensitiveFieldsCount: Object.keys(SENSITIVE_FIELDS).filter(field => 
              req.body[field]
            ).length
          });
        }
      }
      
      next();
    } catch (error) {
      logger.error('Data encryption middleware failed', {
        error: error instanceof Error ? error.message : String(error),
        path: req.path,
        method: req.method
      });
      
      res.status(500).json({
        error: 'Data security processing failed',
        code: 'ENCRYPTION_ERROR'
      });
    }
  };
}

/**
 * Middleware to automatically decrypt sensitive fields after database reads
 */
export function decryptSensitiveData() {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const securityService = getSecurityService();
      const userRole = req.user?.role || 'employee';
      
      // Store original res.json to intercept response
      const originalJson = res.json;
      
      res.json = function(data: any) {
        try {
          // Process response data if it contains employee information
          const processedData = processResponseData(data, userRole, req.user?.id, securityService);
          return originalJson.call(this, processedData);
        } catch (error) {
          logger.error('Response data decryption failed', {
            error: error instanceof Error ? error.message : String(error),
            path: req.path,
            userId: req.user?.id
          });
          return originalJson.call(this, data);
        }
      };
      
      next();
    } catch (error) {
      logger.error('Data decryption middleware failed', {
        error: error instanceof Error ? error.message : String(error),
        path: req.path,
        method: req.method
      });
      next();
    }
  };
}

/**
 * Process response data to decrypt allowed fields based on user role
 */
function processResponseData(data: any, userRole: string, userId: string, securityService: any): any {
  if (!data) return data;
  
  // Handle single employee object
  if (data.employeeId) {
    return decryptEmployeeDataByRole(data, userRole, userId, securityService);
  }
  
  // Handle array of employee objects
  if (Array.isArray(data) && data.length > 0 && data[0]?.employeeId) {
    return data.map(employee => 
      decryptEmployeeDataByRole(employee, userRole, userId, securityService)
    );
  }
  
  // Handle nested data structures
  if (typeof data === 'object') {
    const processed = { ...data };
    
    // Check common response patterns
    if (processed.employees && Array.isArray(processed.employees)) {
      processed.employees = processed.employees.map((employee: any) => 
        decryptEmployeeDataByRole(employee, userRole, userId, securityService)
      );
    }
    
    if (processed.employee && processed.employee.employeeId) {
      processed.employee = decryptEmployeeDataByRole(processed.employee, userRole, userId, securityService);
    }
    
    return processed;
  }
  
  return data;
}

/**
 * Decrypt employee data based on user role permissions
 */
function decryptEmployeeDataByRole(
  encryptedEmployee: any, 
  userRole: string, 
  userId: string, 
  securityService: any
): any {
  if (!encryptedEmployee?.employeeId) return encryptedEmployee;
  
  const employeeId = encryptedEmployee.employeeId;
  const decrypted = { ...encryptedEmployee };
  
  // Full access roles can decrypt all fields
  if (FULL_ACCESS_ROLES.includes(userRole)) {
    const fullyDecrypted = securityService.decryptEmployeeData(decrypted, employeeId);
    
    // Log full access event
    logger.info('Full employee data access', {
      employeeId,
      accessedBy: userId,
      userRole,
      timestamp: new Date().toISOString(),
      accessType: 'full_decrypt'
    });
    
    return fullyDecrypted;
  }
  
  // Partial access - decrypt only allowed fields
  const decryptedFields: string[] = [];
  
  for (const [fieldName, allowedRoles] of Object.entries(FIELD_ACCESS_MATRIX)) {
    if (allowedRoles.includes(userRole as any) && decrypted[fieldName]) {
      try {
        decrypted[fieldName] = securityService.decryptField(fieldName, decrypted[fieldName], employeeId);
        decryptedFields.push(fieldName);
      } catch (error) {
        logger.error('Field decryption failed', {
          fieldName,
          employeeId,
          userRole,
          error: error instanceof Error ? error.message : String(error)
        });
        // Leave field encrypted if decryption fails
      }
    } else if (decrypted[fieldName]) {
      // Field exists but user doesn't have access - show redacted value
      decrypted[fieldName] = '[REDACTED]';
    }
  }
  
  // Log partial access event
  if (decryptedFields.length > 0) {
    logger.info('Partial employee data access', {
      employeeId,
      accessedBy: userId,
      userRole,
      decryptedFields,
      timestamp: new Date().toISOString(),
      accessType: 'role_based_decrypt'
    });
    
    // Log security event
    securityService.logSecurityEvent({
      type: 'access',
      employeeId,
      userId,
      fieldName: decryptedFields.join(','),
      success: true,
      details: { userRole, accessType: 'role_based' }
    });
  }
  
  return decrypted;
}

// =============================================================================
// GDPR CONSENT AND DATA ACCESS MIDDLEWARE
// =============================================================================

/**
 * Middleware to check GDPR consent before processing personal data
 */
export function checkGdprConsent() {
  return (req: Request, res: Response, next: NextFunction) => {
    // For API requests affecting personal data
    const affectsPersonalData = req.method !== 'GET' && 
      (req.body?.employeeId || req.params.employeeId) &&
      Object.keys(SENSITIVE_FIELDS).some(field => req.body?.[field] !== undefined);
    
    if (affectsPersonalData) {
      // Check if user has provided GDPR consent
      if (!req.user?.gdprConsentAt) {
        return res.status(403).json({
          error: 'GDPR consent required',
          code: 'GDPR_CONSENT_REQUIRED',
          message: 'Processing personal data requires explicit GDPR consent',
          consentUrl: '/api/auth/gdpr-consent'
        });
      }
      
      // Check if consent is still valid (refresh every 2 years)
      const consentDate = new Date(req.user.gdprConsentAt);
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      
      if (consentDate < twoYearsAgo) {
        return res.status(403).json({
          error: 'GDPR consent expired',
          code: 'GDPR_CONSENT_EXPIRED', 
          message: 'GDPR consent must be renewed every 2 years',
          consentUrl: '/api/auth/gdpr-consent'
        });
      }
    }
    
    next();
  };
}

/**
 * Middleware to log data access for audit trail
 */
export function auditDataAccess() {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log data access after successful response
      if (res.statusCode < 400) {
        const employeeId = req.body?.employeeId || req.params.employeeId;
        
        if (employeeId) {
          logger.info('Employee data accessed', {
            employeeId,
            userId: req.user?.id,
            userRole: req.user?.role,
            method: req.method,
            path: req.path,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString(),
            statusCode: res.statusCode
          });
        }
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  };
}

// =============================================================================
// DATA MINIMIZATION MIDDLEWARE
// =============================================================================

/**
 * Middleware to ensure data minimization - only return necessary fields
 */
export function enforceDataMinimization() {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json;
    
    res.json = function(data: any) {
      const userRole = req.user?.role || 'employee';
      
      // Define field restrictions by endpoint and role
      const restrictedData = minimizeDataByRole(data, userRole, req.path);
      
      return originalJson.call(this, restrictedData);
    };
    
    next();
  };
}

/**
 * Remove unnecessary fields based on user role and context
 */
function minimizeDataByRole(data: any, userRole: string, endpoint: string): any {
  if (!data || typeof data !== 'object') return data;
  
  // Define fields that should never be exposed to certain roles
  const NEVER_EXPOSE = {
    employee: ['encryptionVersion', 'encryptedAt', 'encryptedFields', 'auditLog'],
    manager: ['encryptionVersion', 'encryptedAt', 'encryptedFields'],
    hr: [], // HR can see metadata
    payroll: [], // Payroll can see metadata
    auditor: [], // Auditors need full visibility
  };
  
  const fieldsToRemove = NEVER_EXPOSE[userRole as keyof typeof NEVER_EXPOSE] || [];
  
  // Process single objects or arrays
  if (Array.isArray(data)) {
    return data.map(item => removeFields(item, fieldsToRemove));
  } else {
    return removeFields(data, fieldsToRemove);
  }
}

function removeFields(obj: any, fieldsToRemove: string[]): any {
  if (!obj || typeof obj !== 'object') return obj;
  
  const cleaned = { ...obj };
  
  fieldsToRemove.forEach(field => {
    delete cleaned[field];
  });
  
  return cleaned;
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  FIELD_ACCESS_MATRIX,
  FULL_ACCESS_ROLES,
  SENSITIVE_FIELDS
};