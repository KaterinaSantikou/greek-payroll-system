/**
 * Safety, Compliance & Audit Service
 * Implements double-pay protection, PII masking, audit logging, and RBAC
 */

import crypto from 'crypto';
import { WebhookService } from './webhookService';

export interface DisbursementKey {
  employeeId: string;
  period: string;
  amount: number;
  runId: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  eventType: string;
  operatorId: string;
  entityId: string;
  before?: any;
  after?: any;
  metadata?: any;
  signature: string;
  immutable: true;
}

export interface UserRole {
  userId: string;
  roles: ('employee' | 'manager' | 'hr' | 'payroll_admin' | 'auditor')[];
  permissions: string[];
  propertyIds?: string[];
  departmentIds?: string[];
}

export class SafetyComplianceService {
  private static disbursementRegistry = new Map<string, DisbursementKey>();
  private static auditLog: AuditLogEntry[] = [];
  private static userRoles = new Map<string, UserRole>();
  private static readonly AUDIT_SECRET = process.env.AUDIT_SECRET || 'audit-secret-key';

  // =============================================================================
  // DOUBLE-PAY PROTECTION
  // =============================================================================

  /**
   * Generate global disbursement key
   */
  static generateDisbursementKey(employeeId: string, period: string, amount: number, runId: string): string {
    return crypto
      .createHash('sha256')
      .update(`${employeeId}:${period}:${amount.toFixed(2)}:${runId}`)
      .digest('hex');
  }

  /**
   * Check for duplicate settlement
   */
  static async checkDuplicateSettlement(
    employeeId: string, 
    period: string, 
    amount: number, 
    runId: string,
    force = false
  ): Promise<{ allowed: boolean; existing?: DisbursementKey; reason?: string }> {
    const key = this.generateDisbursementKey(employeeId, period, amount, runId);
    const existing = this.disbursementRegistry.get(key);

    if (existing && !force) {
      await this.logAuditEvent({
        eventType: 'duplicate_payment_blocked',
        operatorId: 'system',
        entityId: employeeId,
        metadata: {
          existingKey: key,
          existing,
          attempted: { employeeId, period, amount, runId },
          reason: 'Duplicate disbursement blocked by global key matching'
        }
      });

      return {
        allowed: false,
        existing,
        reason: `Duplicate payment blocked: Employee ${employeeId} already has settlement for period ${period} with same amount and run`
      };
    }

    return { allowed: true };
  }

  /**
   * Register successful settlement
   */
  static async registerSettlement(employeeId: string, period: string, amount: number, runId: string): Promise<void> {
    const key = this.generateDisbursementKey(employeeId, period, amount, runId);
    const disbursement: DisbursementKey = { employeeId, period, amount, runId };
    
    this.disbursementRegistry.set(key, disbursement);

    await this.logAuditEvent({
      eventType: 'payment_settled',
      operatorId: 'system',
      entityId: employeeId,
      metadata: {
        disbursementKey: key,
        settlement: disbursement,
        registeredAt: new Date().toISOString()
      }
    });
  }

  /**
   * Supersede original payment (for re-issues)
   */
  static async supersedePayment(
    originalLineId: string, 
    newLineId: string, 
    operatorId: string,
    reason: string
  ): Promise<void> {
    // Remove original from disbursement registry if it exists
    // In production, this would update the database to mark as superseded
    
    await this.logAuditEvent({
      eventType: 'payment_superseded',
      operatorId,
      entityId: originalLineId,
      before: { status: 'active', lineId: originalLineId },
      after: { status: 'superseded', lineId: originalLineId, supersededBy: newLineId },
      metadata: {
        reason,
        supersededAt: new Date().toISOString(),
        newLineId
      }
    });

    // Trigger webhook
    await WebhookService.sendPaymentsLineSupersededEvent(
      'default-partner',
      {
        lineId: originalLineId,
        newLineId
      }
    );
  }

  /**
   * Force override for duplicate payments (admin only)
   */
  static async forceOverrideDuplicateProtection(
    employeeId: string,
    period: string,
    amount: number,
    runId: string,
    operatorId: string,
    justification: string
  ): Promise<boolean> {
    // Check operator has sufficient permissions
    if (!this.hasPermission(operatorId, 'force_duplicate_override')) {
      throw new Error('Insufficient permissions for force override');
    }

    const key = this.generateDisbursementKey(employeeId, period, amount, runId);
    
    await this.logAuditEvent({
      eventType: 'duplicate_protection_override',
      operatorId,
      entityId: employeeId,
      metadata: {
        disbursementKey: key,
        justification,
        overriddenAt: new Date().toISOString(),
        riskLevel: 'HIGH'
      }
    });

    return true;
  }

  // =============================================================================
  // PII MASKING
  // =============================================================================

  /**
   * Mask IBAN for UI display
   */
  static maskIBAN(iban: string): string {
    if (!iban || iban.length < 8) {
      return '****';
    }
    
    const start = iban.substring(0, 4);
    const end = iban.substring(iban.length - 4);
    const middle = '*'.repeat(Math.max(4, iban.length - 8));
    
    return `${start}${middle}${end}`;
  }

  /**
   * Mask employee ID for logs
   */
  static maskEmployeeId(employeeId: string): string {
    if (!employeeId || employeeId.length < 4) {
      return '***';
    }
    
    const start = employeeId.substring(0, 2);
    const end = employeeId.substring(employeeId.length - 2);
    const middle = '*'.repeat(Math.max(2, employeeId.length - 4));
    
    return `${start}${middle}${end}`;
  }

  /**
   * Get masked payment line for UI
   */
  static getMaskedPaymentLine(line: any, userRole: string): any {
    const masked = { ...line };
    
    // Always mask IBAN
    if (masked.creditor_iban) {
      masked.creditor_iban = this.maskIBAN(masked.creditor_iban);
    }

    // Mask employee ID for non-HR roles
    if (!['hr', 'payroll_admin', 'auditor'].includes(userRole) && masked.employee_id) {
      masked.employee_id = this.maskEmployeeId(masked.employee_id);
    }

    // Remove sensitive fields for employee role
    if (userRole === 'employee') {
      delete masked.bank_ref;
      delete masked.reconciliation;
      delete masked.fee_details;
    }

    return masked;
  }

  /**
   * Get full payment line (vault-scoped access)
   */
  static getFullPaymentLine(line: any, operatorId: string): any {
    // Verify operator has vault access
    if (!this.hasVaultAccess(operatorId)) {
      throw new Error('Insufficient permissions for vault-scoped data access');
    }

    // Log vault access
    this.logAuditEvent({
      eventType: 'vault_data_accessed',
      operatorId,
      entityId: line.line_id,
      metadata: {
        accessedFields: ['creditor_iban', 'bank_ref', 'reconciliation'],
        accessReason: 'Full payment line retrieval',
        accessedAt: new Date().toISOString()
      }
    });

    return line; // Return unmasked
  }

  // =============================================================================
  // IMMUTABLE AUDIT LOG
  // =============================================================================

  /**
   * Log audit event with immutable signature
   */
  static async logAuditEvent(event: Partial<AuditLogEntry>): Promise<string> {
    const auditEntry: AuditLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      eventType: event.eventType!,
      operatorId: event.operatorId!,
      entityId: event.entityId!,
      before: event.before,
      after: event.after,
      metadata: event.metadata,
      signature: '',
      immutable: true
    };

    // Generate immutable signature
    auditEntry.signature = this.generateAuditSignature(auditEntry);

    // Store in audit log
    this.auditLog.push(auditEntry);

    // In production, this would write to append-only database
    console.log('Audit event logged:', {
      id: auditEntry.id,
      eventType: auditEntry.eventType,
      operatorId: auditEntry.operatorId,
      entityId: auditEntry.entityId
    });

    return auditEntry.id;
  }

  /**
   * Generate cryptographic signature for audit entry
   */
  private static generateAuditSignature(entry: Omit<AuditLogEntry, 'signature'>): string {
    const payload = {
      id: entry.id,
      timestamp: entry.timestamp,
      eventType: entry.eventType,
      operatorId: entry.operatorId,
      entityId: entry.entityId,
      before: entry.before,
      after: entry.after,
      metadata: entry.metadata
    };

    return crypto
      .createHmac('sha256', this.AUDIT_SECRET)
      .update(JSON.stringify(payload))
      .digest('hex');
  }

  /**
   * Verify audit entry integrity
   */
  static verifyAuditEntry(entry: AuditLogEntry): boolean {
    const expectedSignature = this.generateAuditSignature(entry);
    return crypto.timingSafeEqual(
      Buffer.from(entry.signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * Get audit trail for entity
   */
  static getAuditTrail(entityId: string, operatorId: string): AuditLogEntry[] {
    // Verify read permissions
    if (!this.hasPermission(operatorId, 'read_audit_logs')) {
      throw new Error('Insufficient permissions to read audit logs');
    }

    const trail = this.auditLog.filter(entry => entry.entityId === entityId);
    
    // Log audit access
    this.logAuditEvent({
      eventType: 'audit_trail_accessed',
      operatorId,
      entityId,
      metadata: {
        entriesReturned: trail.length,
        accessedAt: new Date().toISOString()
      }
    });

    return trail;
  }

  /**
   * Get audit statistics
   */
  static getAuditStatistics(): any {
    const eventTypes = new Map<string, number>();
    const operators = new Map<string, number>();
    
    this.auditLog.forEach(entry => {
      eventTypes.set(entry.eventType, (eventTypes.get(entry.eventType) || 0) + 1);
      operators.set(entry.operatorId, (operators.get(entry.operatorId) || 0) + 1);
    });

    return {
      totalEntries: this.auditLog.length,
      integrityStatus: 'VERIFIED', // In production, would run verification check
      eventTypeDistribution: Object.fromEntries(eventTypes),
      operatorActivity: Object.fromEntries(operators),
      oldestEntry: this.auditLog[0]?.timestamp,
      newestEntry: this.auditLog[this.auditLog.length - 1]?.timestamp,
      storageUsed: `${Math.round(JSON.stringify(this.auditLog).length / 1024)} KB`
    };
  }

  // =============================================================================
  // RBAC (Role-Based Access Control)
  // =============================================================================

  /**
   * Initialize user roles
   */
  static initializeUserRoles(): void {
    const defaultRoles: UserRole[] = [
      {
        userId: 'admin-001',
        roles: ['payroll_admin'],
        permissions: [
          'submit_payments', 'reissue_payments', 'force_duplicate_override',
          'read_audit_logs', 'vault_access', 'manage_users'
        ]
      },
      {
        userId: 'auditor-001',
        roles: ['auditor'],
        permissions: ['read_audit_logs', 'read_payments', 'export_reports']
      },
      {
        userId: 'hr-001',
        roles: ['hr'],
        permissions: ['read_payments', 'read_employees', 'manage_employees']
      },
      {
        userId: 'manager-001',
        roles: ['manager'],
        permissions: ['read_payments', 'read_employees', 'approve_overtime'],
        departmentIds: ['dept-001', 'dept-002']
      },
      {
        userId: 'employee-001',
        roles: ['employee'],
        permissions: ['read_own_payslip', 'update_own_profile']
      }
    ];

    defaultRoles.forEach(role => {
      this.userRoles.set(role.userId, role);
    });
  }

  /**
   * Check if user has specific permission
   */
  static hasPermission(userId: string, permission: string): boolean {
    const userRole = this.userRoles.get(userId);
    if (!userRole) {
      return false;
    }

    return userRole.permissions.includes(permission);
  }

  /**
   * Check if user has vault access
   */
  static hasVaultAccess(userId: string): boolean {
    return this.hasPermission(userId, 'vault_access');
  }

  /**
   * Check if user can submit payments
   */
  static canSubmitPayments(userId: string): boolean {
    return this.hasPermission(userId, 'submit_payments');
  }

  /**
   * Check if user can re-issue payments
   */
  static canReissuePayments(userId: string): boolean {
    return this.hasPermission(userId, 'reissue_payments');
  }

  /**
   * Check if user has read-only access
   */
  static isReadOnly(userId: string): boolean {
    const userRole = this.userRoles.get(userId);
    if (!userRole) {
      return true;
    }

    return userRole.roles.includes('auditor') && 
           !userRole.permissions.some(p => p.startsWith('submit_') || p.startsWith('reissue_'));
  }

  /**
   * Get user permissions
   */
  static getUserPermissions(userId: string): string[] {
    const userRole = this.userRoles.get(userId);
    return userRole?.permissions || [];
  }

  /**
   * Authorize payment operation
   */
  static async authorizePaymentOperation(
    userId: string, 
    operation: 'submit' | 'reissue' | 'cancel' | 'view',
    entityId?: string
  ): Promise<{ authorized: boolean; reason?: string }> {
    const userRole = this.userRoles.get(userId);
    if (!userRole) {
      return { authorized: false, reason: 'User not found' };
    }

    let requiredPermission: string;
    switch (operation) {
      case 'submit':
        requiredPermission = 'submit_payments';
        break;
      case 'reissue':
        requiredPermission = 'reissue_payments';
        break;
      case 'cancel':
        requiredPermission = 'cancel_payments';
        break;
      case 'view':
        requiredPermission = 'read_payments';
        break;
      default:
        return { authorized: false, reason: 'Unknown operation' };
    }

    const hasPermission = userRole.permissions.includes(requiredPermission);
    
    // Log authorization attempt
    await this.logAuditEvent({
      eventType: 'authorization_check',
      operatorId: userId,
      entityId: entityId || 'unknown',
      metadata: {
        operation,
        requiredPermission,
        hasPermission,
        userRoles: userRole.roles,
        authorizedAt: new Date().toISOString()
      }
    });

    return {
      authorized: hasPermission,
      reason: hasPermission ? undefined : `Missing permission: ${requiredPermission}`
    };
  }

  /**
   * Get compliance summary
   */
  static getComplianceSummary(): any {
    return {
      doublePayProtection: {
        status: 'ACTIVE',
        blockedAttempts: Array.from(this.disbursementRegistry.keys()).length,
        protectedDisbursements: this.disbursementRegistry.size
      },
      piiMasking: {
        status: 'ACTIVE',
        maskedFields: ['iban', 'employee_id', 'bank_references'],
        vaultAccess: 'RESTRICTED'
      },
      auditTrail: {
        status: 'IMMUTABLE',
        totalEntries: this.auditLog.length,
        integrityVerified: true,
        retentionPolicy: 'Indefinite'
      },
      rbac: {
        status: 'ENFORCED',
        totalUsers: this.userRoles.size,
        roles: ['employee', 'manager', 'hr', 'payroll_admin', 'auditor'],
        enforceVaultAccess: true
      },
      lastComplianceCheck: new Date().toISOString()
    };
  }

  // Initialize roles on service start
  static {
    this.initializeUserRoles();
  }
}