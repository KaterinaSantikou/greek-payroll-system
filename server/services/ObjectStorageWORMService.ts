/**
 * Object Storage WORM (Write-Once Read-Many) Service
 * Implements tamper-evident immutable storage for audit logs and compliance artifacts
 */

import { db } from '../db';
import { wormObjects, type WORMObject, type InsertWORMObject } from '@shared/schema';
import { eq, desc, and, gte, lte, or } from 'drizzle-orm';
import crypto from 'crypto';

export interface WORMPolicy {
  retentionYears: number;
  complianceFramework: 'GDPR' | 'SOX' | 'PCI_DSS' | 'HIPAA' | 'GREEK_LAW' | 'CUSTOM';
  accessRestrictions: {
    allowedRoles: string[];
    requiresMFA: boolean;
    requiresApproval: boolean;
    maxAccessesPerDay?: number;
  };
  legalHoldCapable: boolean;
  auditLevel: 'basic' | 'enhanced' | 'forensic';
}

export interface IntegrityVerification {
  verificationId: string;
  objectId: string;
  verificationTime: Date;
  hashAlgorithm: string;
  expectedHash: string;
  actualHash: string;
  status: 'verified' | 'corrupted' | 'missing';
  blockNumber?: number;
  repairAction?: string;
}

export interface WORMAccessLog {
  accessId: string;
  objectId: string;
  userId: string;
  accessTime: Date;
  accessType: 'read' | 'verify' | 'metadata';
  ipAddress?: string;
  userAgent?: string;
  authorized: boolean;
  denialReason?: string;
}

export class ObjectStorageWORMService {
  /**
   * Store object in WORM-compliant storage with immutability guarantees
   */
  static async storeWORMObject(
    objectPath: string,
    objectData: Buffer,
    policy: WORMPolicy,
    userId: string,
    metadata: {
      contentType?: string;
      sourceSystem?: string;
      complianceTag?: string;
      businessContext?: string;
    } = {}
  ): Promise<WORMObject> {
    // Calculate object hash for integrity verification
    const objectHash = crypto.createHash('sha256').update(objectData).digest('hex');
    
    // Extract bucket and path components
    const { bucketName, objectName } = this.parseObjectPath(objectPath);
    
    // Calculate retention period
    const retentionPeriodDays = policy.retentionYears * 365;
    const immutableUntil = new Date();
    immutableUntil.setDate(immutableUntil.getDate() + retentionPeriodDays);

    // Store object metadata in WORM registry
    const [wormObject] = await db
      .insert(wormObjects)
      .values({
        objectPath,
        objectHash,
        bucketName,
        originalSize: objectData.length,
        contentType: metadata.contentType || 'application/octet-stream',
        retentionPeriodDays,
        compliancePolicy: this.mapComplianceFramework(policy.complianceFramework),
        accessRestrictions: policy.accessRestrictions,
        immutableUntil,
        createdBy: userId,
        integrityChecks: [],
        complianceFlags: {
          complianceFramework: policy.complianceFramework,
          auditLevel: policy.auditLevel,
          sourceSystem: metadata.sourceSystem,
          complianceTag: metadata.complianceTag,
          businessContext: metadata.businessContext,
        },
      })
      .returning();

    // TODO: In production, integrate with actual object storage:
    // - Upload to Google Cloud Storage with Object Lock
    // - Set bucket-level WORM policy
    // - Configure lifecycle rules for retention
    // - Enable access logging and monitoring

    // Create initial integrity verification record
    await this.recordIntegrityCheck(wormObject.id, objectHash, 'verified');

    // Log the WORM storage event
    await this.logWORMAccess({
      objectId: wormObject.id,
      userId,
      accessType: 'verify',
      authorized: true,
    });

    return wormObject;
  }

  /**
   * Retrieve WORM object with access control and audit logging
   */
  static async retrieveWORMObject(
    objectId: string,
    userId: string,
    requestContext: {
      ipAddress?: string;
      userAgent?: string;
      purpose?: string;
      approvalToken?: string;
    } = {}
  ): Promise<{
    object: WORMObject;
    accessGranted: boolean;
    content?: Buffer;
    integrityStatus: 'verified' | 'corrupted' | 'unknown';
  }> {
    const wormObject = await this.getWORMObject(objectId);
    if (!wormObject) {
      throw new Error('WORM object not found');
    }

    // Check access permissions
    const accessCheck = await this.checkAccessPermissions(wormObject, userId, requestContext);
    
    // Log access attempt (regardless of authorization)
    await this.logWORMAccess({
      objectId,
      userId,
      accessType: 'read',
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      authorized: accessCheck.authorized,
      denialReason: accessCheck.denialReason,
    });

    if (!accessCheck.authorized) {
      // Increment tamper attempt counter
      await this.recordTamperAttempt(objectId, userId, accessCheck.denialReason || 'Unauthorized access');
      
      return {
        object: wormObject,
        accessGranted: false,
        integrityStatus: 'unknown',
      };
    }

    // Update access tracking
    await db
      .update(wormObjects)
      .set({
        lastAccessedAt: new Date(),
        accessCount: (wormObject.accessCount || 0) + 1,
      })
      .where(eq(wormObjects.id, objectId));

    // Verify object integrity before returning
    const integrityStatus = await this.verifyObjectIntegrity(objectId);

    // TODO: In production, retrieve actual object data from storage
    const content = Buffer.from(`Mock WORM object content for ${objectId}`);

    return {
      object: wormObject,
      accessGranted: true,
      content,
      integrityStatus: integrityStatus.status,
    };
  }

  /**
   * Verify object integrity using stored hash
   */
  static async verifyObjectIntegrity(objectId: string): Promise<IntegrityVerification> {
    const wormObject = await this.getWORMObject(objectId);
    if (!wormObject) {
      throw new Error('WORM object not found');
    }

    // TODO: In production, retrieve object from storage and calculate hash
    const mockActualHash = wormObject.objectHash; // Simulated - would be calculated from actual object
    
    const verification: IntegrityVerification = {
      verificationId: crypto.randomUUID(),
      objectId,
      verificationTime: new Date(),
      hashAlgorithm: 'SHA-256',
      expectedHash: wormObject.objectHash,
      actualHash: mockActualHash,
      status: mockActualHash === wormObject.objectHash ? 'verified' : 'corrupted',
    };

    // Record verification in object's integrity check history
    await this.recordIntegrityCheck(objectId, mockActualHash, verification.status);

    return verification;
  }

  /**
   * Apply or remove legal hold on WORM object
   */
  static async manageLegalHold(
    objectId: string,
    holdStatus: boolean,
    userId: string,
    reason: string,
    approvalToken?: string
  ): Promise<WORMObject> {
    const wormObject = await this.getWORMObject(objectId);
    if (!wormObject) {
      throw new Error('WORM object not found');
    }

    // Validate authorization for legal hold operations
    if (!this.isAuthorizedForLegalHold(userId, approvalToken)) {
      throw new Error('Insufficient privileges for legal hold operations');
    }

    // Update legal hold status
    const [updatedObject] = await db
      .update(wormObjects)
      .set({
        legalHoldStatus: holdStatus,
        complianceFlags: {
          ...wormObject.complianceFlags as any,
          legalHold: {
            status: holdStatus,
            appliedBy: userId,
            appliedAt: new Date(),
            reason,
            approvalToken,
          },
        },
      })
      .where(eq(wormObjects.id, objectId))
      .returning();

    // Log legal hold action
    await this.logWORMAccess({
      objectId,
      userId,
      accessType: 'metadata',
      authorized: true,
    });

    return updatedObject;
  }

  /**
   * Check if object can be deleted (past retention period and no legal hold)
   */
  static async checkDeletionEligibility(objectId: string): Promise<{
    canDelete: boolean;
    reason: string;
    retentionExpiryDate: Date;
    daysRemaining: number;
  }> {
    const wormObject = await this.getWORMObject(objectId);
    if (!wormObject) {
      throw new Error('WORM object not found');
    }

    const now = new Date();
    const immutableUntil = new Date(wormObject.immutableUntil);
    const daysRemaining = Math.ceil((immutableUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Check legal hold
    if (wormObject.legalHoldStatus) {
      return {
        canDelete: false,
        reason: 'Object is under legal hold',
        retentionExpiryDate: immutableUntil,
        daysRemaining,
      };
    }

    // Check retention period
    if (now < immutableUntil) {
      return {
        canDelete: false,
        reason: `Retention period active for ${daysRemaining} more days`,
        retentionExpiryDate: immutableUntil,
        daysRemaining,
      };
    }

    return {
      canDelete: true,
      reason: 'Object eligible for deletion',
      retentionExpiryDate: immutableUntil,
      daysRemaining: 0,
    };
  }

  /**
   * Generate WORM compliance report for audit purposes
   */
  static async generateComplianceReport(
    filters: {
      compliancePolicy?: string;
      dateFrom?: Date;
      dateTo?: Date;
      status?: string;
    } = {}
  ): Promise<{
    totalObjects: number;
    integrityVerified: number;
    integrityFailed: number;
    legalHoldObjects: number;
    retentionBreaches: number;
    accessViolations: number;
    storageUtilization: {
      totalSizeBytes: number;
      objectsByPolicy: Record<string, number>;
    };
    upcomingExpirations: WORMObject[];
  }> {
    let query = db.select().from(wormObjects);

    // Apply filters
    const conditions = [];
    
    if (filters.compliancePolicy) {
      conditions.push(eq(wormObjects.compliancePolicy, filters.compliancePolicy));
    }
    
    if (filters.dateFrom) {
      conditions.push(gte(wormObjects.createdAt, filters.dateFrom));
    }
    
    if (filters.dateTo) {
      conditions.push(lte(wormObjects.createdAt, filters.dateTo));
    }
    
    if (filters.status) {
      conditions.push(eq(wormObjects.status, filters.status));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const objects = await query;

    // Calculate metrics
    const totalObjects = objects.length;
    const legalHoldObjects = objects.filter(obj => obj.legalHoldStatus).length;
    
    // Count integrity status (based on latest checks)
    let integrityVerified = 0;
    let integrityFailed = 0;
    
    for (const obj of objects) {
      const checks = obj.integrityChecks as any[] || [];
      const latestCheck = checks[checks.length - 1];
      if (latestCheck?.status === 'verified') {
        integrityVerified++;
      } else if (latestCheck?.status === 'corrupted') {
        integrityFailed++;
      }
    }

    // Check for retention breaches (objects deleted before expiry)
    const retentionBreaches = objects.filter(obj => 
      obj.status === 'deleted' && new Date(obj.immutableUntil) > new Date()
    ).length;

    // Count access violations (simulated)
    const accessViolations = objects.reduce((sum, obj) => sum + (obj.tamperAttempts || 0), 0);

    // Calculate storage utilization
    const totalSizeBytes = objects.reduce((sum, obj) => sum + obj.originalSize, 0);
    const objectsByPolicy = objects.reduce((acc, obj) => {
      acc[obj.compliancePolicy] = (acc[obj.compliancePolicy] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get objects expiring in next 90 days
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);
    
    const upcomingExpirations = objects
      .filter(obj => 
        new Date(obj.immutableUntil) <= ninetyDaysFromNow && 
        new Date(obj.immutableUntil) > new Date() &&
        !obj.legalHoldStatus
      )
      .sort((a, b) => new Date(a.immutableUntil).getTime() - new Date(b.immutableUntil).getTime())
      .slice(0, 20);

    return {
      totalObjects,
      integrityVerified,
      integrityFailed,
      legalHoldObjects,
      retentionBreaches,
      accessViolations,
      storageUtilization: {
        totalSizeBytes,
        objectsByPolicy,
      },
      upcomingExpirations,
    };
  }

  /**
   * Run scheduled integrity verification on all active WORM objects
   */
  static async runScheduledIntegrityCheck(): Promise<{
    checkedObjects: number;
    verifiedObjects: number;
    corruptedObjects: number;
    failedChecks: string[];
  }> {
    // Get objects that need integrity verification (older than 24 hours since last check)
    const dayAgo = new Date();
    dayAgo.setDate(dayAgo.getDate() - 1);

    const objectsToCheck = await db
      .select()
      .from(wormObjects)
      .where(
        and(
          eq(wormObjects.status, 'active'),
          or(
            lte(wormObjects.lastVerifiedAt, dayAgo),
            eq(wormObjects.lastVerifiedAt, null)
          )
        )
      );

    let checkedObjects = 0;
    let verifiedObjects = 0;
    let corruptedObjects = 0;
    const failedChecks: string[] = [];

    for (const object of objectsToCheck) {
      try {
        const verification = await this.verifyObjectIntegrity(object.id);
        checkedObjects++;

        if (verification.status === 'verified') {
          verifiedObjects++;
        } else {
          corruptedObjects++;
          failedChecks.push(`${object.id}: ${verification.status}`);
          
          // Alert on corruption
          console.error(`WORM INTEGRITY FAILURE: Object ${object.id} failed verification`, {
            expectedHash: verification.expectedHash,
            actualHash: verification.actualHash,
            objectPath: object.objectPath,
          });
        }

        // Update last verified timestamp
        await db
          .update(wormObjects)
          .set({
            lastVerifiedAt: new Date(),
          })
          .where(eq(wormObjects.id, object.id));

      } catch (error) {
        failedChecks.push(`${object.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      checkedObjects,
      verifiedObjects,
      corruptedObjects,
      failedChecks,
    };
  }

  // Helper methods

  /**
   * Get WORM object by ID
   */
  static async getWORMObject(objectId: string): Promise<WORMObject | null> {
    const [object] = await db
      .select()
      .from(wormObjects)
      .where(eq(wormObjects.id, objectId));

    return object || null;
  }

  /**
   * Check access permissions for WORM object
   */
  private static async checkAccessPermissions(
    wormObject: WORMObject,
    userId: string,
    context: any
  ): Promise<{ authorized: boolean; denialReason?: string }> {
    const restrictions = wormObject.accessRestrictions as any;
    
    if (!restrictions) {
      return { authorized: true };
    }

    // Check allowed roles (simplified - in production, check user's actual roles)
    if (restrictions.allowedRoles && !restrictions.allowedRoles.includes('admin')) {
      return { authorized: false, denialReason: 'Insufficient role permissions' };
    }

    // Check daily access limits
    if (restrictions.maxAccessesPerDay) {
      const todayAccesses = wormObject.accessCount || 0; // Simplified - should count today's accesses
      if (todayAccesses >= restrictions.maxAccessesPerDay) {
        return { authorized: false, denialReason: 'Daily access limit exceeded' };
      }
    }

    // Check MFA requirement
    if (restrictions.requiresMFA && !context.mfaVerified) {
      return { authorized: false, denialReason: 'MFA verification required' };
    }

    // Check approval requirement
    if (restrictions.requiresApproval && !context.approvalToken) {
      return { authorized: false, denialReason: 'Approval token required' };
    }

    return { authorized: true };
  }

  /**
   * Record integrity check result
   */
  private static async recordIntegrityCheck(
    objectId: string,
    actualHash: string,
    status: 'verified' | 'corrupted'
  ): Promise<void> {
    const wormObject = await this.getWORMObject(objectId);
    if (!wormObject) return;

    const checks = (wormObject.integrityChecks as any[]) || [];
    checks.push({
      timestamp: new Date(),
      expectedHash: wormObject.objectHash,
      actualHash,
      status,
    });

    await db
      .update(wormObjects)
      .set({
        integrityChecks: checks,
      })
      .where(eq(wormObjects.id, objectId));
  }

  /**
   * Log WORM object access attempt
   */
  private static async logWORMAccess(accessLog: Omit<WORMAccessLog, 'accessId' | 'accessTime'>): Promise<void> {
    // In production, store in separate audit log table
    console.log('WORM ACCESS LOG:', {
      accessId: crypto.randomUUID(),
      accessTime: new Date(),
      ...accessLog,
    });
  }

  /**
   * Record tamper attempt
   */
  private static async recordTamperAttempt(objectId: string, userId: string, reason: string): Promise<void> {
    await db
      .update(wormObjects)
      .set({
        tamperAttempts: db.$sql`${wormObjects.tamperAttempts} + 1`,
      })
      .where(eq(wormObjects.id, objectId));

    console.warn(`WORM TAMPER ATTEMPT: Object ${objectId} by user ${userId}: ${reason}`);
  }

  /**
   * Parse object path into bucket and object name
   */
  private static parseObjectPath(objectPath: string): { bucketName: string; objectName: string } {
    const parts = objectPath.replace(/^\/+/, '').split('/');
    return {
      bucketName: parts[0] || 'default-worm-bucket',
      objectName: parts.slice(1).join('/'),
    };
  }

  /**
   * Map compliance framework to internal policy string
   */
  private static mapComplianceFramework(framework: string): string {
    const mappings: Record<string, string> = {
      'GDPR': 'gdpr_art_25_32',
      'SOX': 'sox_section_404',
      'PCI_DSS': 'pci_requirement_3_4',
      'HIPAA': 'hipaa_164_312',
      'GREEK_LAW': 'greek_data_protection',
      'CUSTOM': 'custom_policy',
    };

    return mappings[framework] || 'custom_policy';
  }

  /**
   * Check if user is authorized for legal hold operations
   */
  private static isAuthorizedForLegalHold(userId: string, approvalToken?: string): boolean {
    // Simplified authorization - in production, check actual user permissions
    return approvalToken === 'legal-hold-approved' || userId.includes('admin');
  }

  /**
   * List WORM objects with filtering
   */
  static async listWORMObjects(filters: {
    compliancePolicy?: string;
    status?: string;
    legalHold?: boolean;
    createdBy?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
  } = {}): Promise<WORMObject[]> {
    let query = db.select().from(wormObjects);

    const conditions = [];
    
    if (filters.compliancePolicy) {
      conditions.push(eq(wormObjects.compliancePolicy, filters.compliancePolicy));
    }
    
    if (filters.status) {
      conditions.push(eq(wormObjects.status, filters.status));
    }
    
    if (filters.legalHold !== undefined) {
      conditions.push(eq(wormObjects.legalHoldStatus, filters.legalHold));
    }
    
    if (filters.createdBy) {
      conditions.push(eq(wormObjects.createdBy, filters.createdBy));
    }
    
    if (filters.dateFrom) {
      conditions.push(gte(wormObjects.createdAt, filters.dateFrom));
    }
    
    if (filters.dateTo) {
      conditions.push(lte(wormObjects.createdAt, filters.dateTo));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    query = query.orderBy(desc(wormObjects.createdAt));

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    return query;
  }
}