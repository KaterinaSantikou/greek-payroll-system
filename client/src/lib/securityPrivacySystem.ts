/**
 * Security & Privacy System
 * Roles, SSO, device attestation, data retention, audit logs
 */

// Role-based access control
export const SYSTEM_ROLES = {
  ADMIN: {
    code: 'admin',
    name: 'Διαχειριστής Συστήματος',
    permissions: [
      'system_config',
      'user_management', 
      'all_data_access',
      'audit_logs',
      'integrations',
      'security_settings',
      'data_retention',
      'role_assignment'
    ],
    dataAccess: {
      properties: 'all',
      employees: 'all',
      payroll: 'all',
      compliance: 'all'
    }
  },
  HR_PAYROLL: {
    code: 'hr_payroll',
    name: 'Μισθοδοσία & Προσωπικό',
    permissions: [
      'employee_management',
      'payroll_processing',
      'time_sheet_export',
      'compliance_reports',
      'schedule_management',
      'employee_documents',
      'leave_management'
    ],
    dataAccess: {
      properties: 'assigned',
      employees: 'full',
      payroll: 'full',
      compliance: 'read'
    }
  },
  MANAGER: {
    code: 'manager',
    name: 'Διευθυντής',
    permissions: [
      'department_oversight',
      'schedule_approval',
      'overtime_approval',
      'exception_handling',
      'staff_monitoring',
      'reports_view',
      'leave_approval'
    ],
    dataAccess: {
      properties: 'assigned',
      employees: 'department',
      payroll: 'summary',
      compliance: 'read'
    }
  },
  AUDITOR: {
    code: 'auditor',
    name: 'Ελεγκτής Συμμόρφωσης',
    permissions: [
      'audit_access',
      'compliance_review',
      'violation_tracking',
      'ergani_monitoring',
      'reports_export',
      'data_integrity_check'
    ],
    dataAccess: {
      properties: 'read_only',
      employees: 'audit_view',
      payroll: 'none',
      compliance: 'full'
    }
  },
  EMPLOYEE: {
    code: 'employee',
    name: 'Εργαζόμενος',
    permissions: [
      'clock_in_out',
      'own_schedule_view',
      'own_timesheet_view',
      'break_management',
      'overtime_request',
      'document_upload'
    ],
    dataAccess: {
      properties: 'workplace_only',
      employees: 'self_only',
      payroll: 'own_summary',
      compliance: 'none'
    }
  }
} as const;

// Device attestation for kiosks
export interface DeviceAttestation {
  deviceId: string;
  deviceType: 'kiosk' | 'tablet' | 'mobile' | 'web';
  location: {
    propertyId: string;
    department: string;
    physicalLocation: string;
  };
  
  // Hardware attestation
  hardwareInfo: {
    manufacturer: string;
    model: string;
    serialNumber: string;
    macAddress: string;
    tpmEnabled: boolean;
    secureBootEnabled: boolean;
  };
  
  // Software attestation
  softwareInfo: {
    osVersion: string;
    appVersion: string;
    lastUpdate: string;
    integrityHash: string;
    certificateId: string;
  };
  
  // Security status
  securityStatus: {
    isAttested: boolean;
    lastAttestation: string;
    attestationExpiry: string;
    tamperDetected: boolean;
    trustedDevice: boolean;
  };
  
  // Configuration
  allowedOperations: string[];
  maxSessionDuration: number;
  requiresBiometric: boolean;
  offlineMode: boolean;
}

// SSO Configuration (OIDC/SAML)
export interface SSOConfiguration {
  provider: 'oidc' | 'saml';
  enabled: boolean;
  
  // OIDC Configuration
  oidc?: {
    issuer: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    scopes: string[];
    responseType: string;
    grantType: string;
  };
  
  // SAML Configuration
  saml?: {
    ssoUrl: string;
    certificate: string;
    entityId: string;
    nameIdFormat: string;
    attributeMapping: {
      employeeId: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      department: string;
    };
  };
  
  // Role mapping
  roleMapping: {
    attributeName: string;
    mappings: Record<string, keyof typeof SYSTEM_ROLES>;
  };
  
  // Session configuration
  session: {
    timeout: number;
    refreshTokens: boolean;
    singleSignOut: boolean;
  };
}

// GPS tracking restrictions and geofencing
export interface GeofencePolicy {
  id: string;
  name: string;
  description: string;
  propertyId: string;
  
  // Geofence boundaries
  boundaries: {
    center: {
      lat: number;
      lng: number;
    };
    radius: number; // meters
    polygon?: Array<{lat: number; lng: number}>;
  };
  
  // Privacy settings
  privacySettings: {
    trackOutsideGeofence: boolean;
    trackDuringBreaks: boolean;
    trackAfterShift: boolean;
    retainLocationData: boolean;
    anonymizeAfterDays: number;
  };
  
  // Enforcement
  enforcement: {
    blockClockingOutside: boolean;
    requireJustification: boolean;
    alertSupervisor: boolean;
    logViolations: boolean;
  };
  
  // Compliance
  gdprCompliant: boolean;
  dataProcessingPurpose: string;
  retentionPeriod: number; // days
}

// Data retention aligned to Greek requirements
export interface DataRetentionPolicy {
  category: 'employment' | 'payroll' | 'time_tracking' | 'compliance' | 'personal';
  description: string;
  
  // Retention periods (in years)
  retentionPeriod: number;
  legalBasis: string;
  
  // Greek law references
  legalReferences: {
    law: string;
    article?: string;
    description: string;
  }[];
  
  // Data lifecycle
  lifecycle: {
    activeRetention: number; // years in active storage
    archiveRetention: number; // years in archive
    destructionAfter: number; // total years before destruction
    anonymizationAfter?: number; // years before anonymization
  };
  
  // Special considerations
  specialRules: {
    employeeRequest: boolean; // Can employee request deletion
    regulatoryHold: boolean; // Subject to regulatory hold
    auditRequirement: boolean; // Required for audits
    crossBorderTransfer: boolean; // Transfers outside EU
  };
}

// Tamper-evident audit log
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  
  // Event details
  eventType: 'system' | 'user' | 'data' | 'security' | 'compliance';
  action: string;
  resource: string;
  resourceId?: string;
  
  // Actor information
  userId?: string;
  sessionId?: string;
  deviceId?: string;
  ipAddress: string;
  userAgent?: string;
  
  // Data changes
  changes?: {
    before: any;
    after: any;
    fields: string[];
  };
  
  // Context
  context: {
    propertyId?: string;
    department?: string;
    reason?: string;
    approvedBy?: string;
  };
  
  // Security
  hash: string; // SHA-256 hash for tamper detection
  previousHash?: string; // Chain previous entry
  signature: string; // Digital signature
  
  // Compliance
  gdprCategory?: string;
  retentionCategory: keyof typeof DATA_RETENTION_POLICIES;
  
  // Result
  success: boolean;
  errorMessage?: string;
  
  // Additional metadata
  severity: 'info' | 'warning' | 'error' | 'critical';
  tags: string[];
}

// Greek data retention requirements
export const DATA_RETENTION_POLICIES = {
  EMPLOYMENT_RECORDS: {
    category: 'employment' as const,
    description: 'Αρχεία απασχόλησης και συμβάσεων εργασίας',
    retentionPeriod: 20, // years
    legalBasis: 'Νόμος 4808/2021, Κώδικας Εργασίας',
    legalReferences: [
      {
        law: 'Ν. 4808/2021',
        article: 'Άρθρο 45',
        description: 'Τήρηση αρχείων εργαζομένων'
      }
    ],
    lifecycle: {
      activeRetention: 5,
      archiveRetention: 15,
      destructionAfter: 20
    },
    specialRules: {
      employeeRequest: false,
      regulatoryHold: true,
      auditRequirement: true,
      crossBorderTransfer: false
    }
  },
  PAYROLL_DATA: {
    category: 'payroll' as const,
    description: 'Στοιχεία μισθοδοσίας και εργασιακών παροχών',
    retentionPeriod: 50,
    legalBasis: 'Ν. 4172/2013, Κώδικας Φορολογίας Εισοδήματος',
    legalReferences: [
      {
        law: 'Ν. 4172/2013',
        article: 'Άρθρο 14',
        description: 'Τήρηση φορολογικών στοιχείων'
      }
    ],
    lifecycle: {
      activeRetention: 5,
      archiveRetention: 45,
      destructionAfter: 50
    },
    specialRules: {
      employeeRequest: false,
      regulatoryHold: true,
      auditRequirement: true,
      crossBorderTransfer: false
    }
  },
  TIME_TRACKING: {
    category: 'time_tracking' as const,
    description: 'Στοιχεία παρακολούθησης χρόνου εργασίας',
    retentionPeriod: 5,
    legalBasis: 'Ν. 3996/2011, ΣΕΠΕ',
    legalReferences: [
      {
        law: 'Ν. 3996/2011',
        article: 'Άρθρο 9',
        description: 'Τήρηση στοιχείων χρόνου εργασίας'
      }
    ],
    lifecycle: {
      activeRetention: 2,
      archiveRetention: 3,
      destructionAfter: 5,
      anonymizationAfter: 2
    },
    specialRules: {
      employeeRequest: true,
      regulatoryHold: false,
      auditRequirement: true,
      crossBorderTransfer: false
    }
  },
  COMPLIANCE_LOGS: {
    category: 'compliance' as const,
    description: 'Αρχεία συμμόρφωσης και ελέγχου',
    retentionPeriod: 10,
    legalBasis: 'GDPR, Ν. 4624/2019',
    legalReferences: [
      {
        law: 'Κανονισμός (ΕΕ) 2016/679',
        article: 'Άρθρο 30',
        description: 'Αρχεία δραστηριοτήτων επεξεργασίας'
      }
    ],
    lifecycle: {
      activeRetention: 3,
      archiveRetention: 7,
      destructionAfter: 10
    },
    specialRules: {
      employeeRequest: false,
      regulatoryHold: true,
      auditRequirement: true,
      crossBorderTransfer: false
    }
  }
} as const;

export class SecurityEngine {
  
  // Role-based access control
  static checkPermission(userRole: string, requiredPermission: string): boolean {
    const role = SYSTEM_ROLES[userRole as keyof typeof SYSTEM_ROLES];
    
    if (!role) {
      return false;
    }
    
    return role.permissions.includes(requiredPermission);
  }
  
  static checkDataAccess(
    userRole: string, 
    dataType: 'properties' | 'employees' | 'payroll' | 'compliance',
    resourceId: string,
    userContext: any
  ): boolean {
    const role = SYSTEM_ROLES[userRole as keyof typeof SYSTEM_ROLES];
    
    if (!role) {
      return false;
    }
    
    const accessLevel = role.dataAccess[dataType];
    
    switch (accessLevel) {
      case 'all':
        return true;
      case 'assigned':
        return userContext.assignedProperties?.includes(resourceId);
      case 'department':
        return userContext.department === this.getResourceDepartment(resourceId);
      case 'self_only':
        return userContext.employeeId === resourceId;
      case 'read_only':
        return true; // Read-only access
      case 'none':
        return false;
      default:
        return false;
    }
  }
  
  // Device attestation
  static async attestDevice(deviceId: string): Promise<DeviceAttestation> {
    const deviceInfo = await this.getDeviceInfo(deviceId);
    
    // Verify hardware integrity
    const hardwareVerified = await this.verifyHardware(deviceInfo);
    
    // Verify software integrity
    const softwareVerified = await this.verifySoftware(deviceInfo);
    
    // Check for tampering
    const tamperDetected = await this.detectTampering(deviceInfo);
    
    const attestation: DeviceAttestation = {
      deviceId,
      deviceType: deviceInfo.type,
      location: deviceInfo.location,
      hardwareInfo: deviceInfo.hardware,
      softwareInfo: deviceInfo.software,
      securityStatus: {
        isAttested: hardwareVerified && softwareVerified && !tamperDetected,
        lastAttestation: new Date().toISOString(),
        attestationExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        tamperDetected,
        trustedDevice: hardwareVerified && softwareVerified
      },
      allowedOperations: this.determineAllowedOperations(deviceInfo),
      maxSessionDuration: 8 * 60 * 60, // 8 hours
      requiresBiometric: deviceInfo.type === 'kiosk',
      offlineMode: deviceInfo.capabilities.offlineMode
    };
    
    // Store attestation
    await this.storeAttestation(attestation);
    
    return attestation;
  }
  
  // GPS tracking restrictions
  static checkGeofencePolicy(location: {lat: number; lng: number}, propertyId: string): {
    allowed: boolean;
    policy: GeofencePolicy | null;
    violation?: string;
  } {
    const policy = this.getGeofencePolicy(propertyId);
    
    if (!policy) {
      return { allowed: true, policy: null };
    }
    
    // Check if location is within geofence
    const distance = this.calculateDistance(location, policy.boundaries.center);
    const withinRadius = distance <= policy.boundaries.radius;
    
    if (!withinRadius && policy.enforcement.blockClockingOutside) {
      return {
        allowed: false,
        policy,
        violation: 'Location outside authorized geofence'
      };
    }
    
    return { allowed: true, policy };
  }
  
  // Audit logging
  static async logAuditEvent(event: Omit<AuditLogEntry, 'id' | 'timestamp' | 'hash' | 'signature'>): Promise<void> {
    const auditEntry: AuditLogEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      ...event,
      hash: '',
      signature: ''
    };
    
    // Get previous hash for chaining
    const previousEntry = await this.getLastAuditEntry();
    if (previousEntry) {
      auditEntry.previousHash = previousEntry.hash;
    }
    
    // Calculate hash
    auditEntry.hash = await this.calculateHash(auditEntry);
    
    // Digital signature
    auditEntry.signature = await this.signEntry(auditEntry);
    
    // Store in tamper-evident storage
    await this.storeAuditEntry(auditEntry);
  }
  
  // Data retention compliance
  static async enforceDataRetention(): Promise<void> {
    for (const [policyName, policy] of Object.entries(DATA_RETENTION_POLICIES)) {
      await this.enforceRetentionPolicy(policy);
    }
  }
  
  private static async enforceRetentionPolicy(policy: any): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - policy.retentionPeriod);
    
    // Find data older than retention period
    const expiredData = await this.findExpiredData(policy.category, cutoffDate);
    
    for (const record of expiredData) {
      if (policy.specialRules.anonymizationAfter) {
        const anonymizationDate = new Date();
        anonymizationDate.setFullYear(anonymizationDate.getFullYear() - policy.specialRules.anonymizationAfter);
        
        if (record.createdAt < anonymizationDate) {
          await this.anonymizeRecord(record);
        }
      } else {
        await this.deleteRecord(record);
      }
      
      // Log retention action
      await this.logAuditEvent({
        eventType: 'data',
        action: 'retention_enforcement',
        resource: policy.category,
        resourceId: record.id,
        context: {
          reason: 'automated_retention_policy'
        },
        success: true,
        severity: 'info',
        tags: ['retention', 'compliance'],
        retentionCategory: policyName as keyof typeof DATA_RETENTION_POLICIES
      });
    }
  }
  
  // Helper methods
  private static async getDeviceInfo(deviceId: string): Promise<any> {
    // Implementation would retrieve device information
    return {};
  }
  
  private static async verifyHardware(deviceInfo: any): Promise<boolean> {
    // Hardware integrity verification
    return true;
  }
  
  private static async verifySoftware(deviceInfo: any): Promise<boolean> {
    // Software integrity verification
    return true;
  }
  
  private static async detectTampering(deviceInfo: any): Promise<boolean> {
    // Tamper detection
    return false;
  }
  
  private static determineAllowedOperations(deviceInfo: any): string[] {
    // Determine what operations device is allowed to perform
    return ['clock_in', 'clock_out', 'break_start', 'break_end'];
  }
  
  private static async storeAttestation(attestation: DeviceAttestation): Promise<void> {
    // Store device attestation
  }
  
  private static getGeofencePolicy(propertyId: string): GeofencePolicy | null {
    // Retrieve geofence policy for property
    return null;
  }
  
  private static calculateDistance(point1: {lat: number; lng: number}, point2: {lat: number; lng: number}): number {
    // Haversine formula for distance calculation
    const R = 6371e3; // Earth's radius in meters
    const φ1 = point1.lat * Math.PI/180;
    const φ2 = point2.lat * Math.PI/180;
    const Δφ = (point2.lat-point1.lat) * Math.PI/180;
    const Δλ = (point2.lng-point1.lng) * Math.PI/180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c;
  }
  
  private static getResourceDepartment(resourceId: string): string {
    // Get department for resource
    return '';
  }
  
  private static generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private static async getLastAuditEntry(): Promise<AuditLogEntry | null> {
    // Get last audit entry for hash chaining
    return null;
  }
  
  private static async calculateHash(entry: AuditLogEntry): Promise<string> {
    // Calculate SHA-256 hash of entry
    const data = JSON.stringify({
      timestamp: entry.timestamp,
      eventType: entry.eventType,
      action: entry.action,
      resource: entry.resource,
      userId: entry.userId,
      changes: entry.changes,
      previousHash: entry.previousHash
    });
    
    // In a real implementation, use crypto.subtle.digest
    return `sha256_${Date.now()}`;
  }
  
  private static async signEntry(entry: AuditLogEntry): Promise<string> {
    // Digital signature of entry
    return `sig_${Date.now()}`;
  }
  
  private static async storeAuditEntry(entry: AuditLogEntry): Promise<void> {
    // Store in tamper-evident storage
  }
  
  private static async findExpiredData(category: string, cutoffDate: Date): Promise<any[]> {
    // Find data that has exceeded retention period
    return [];
  }
  
  private static async anonymizeRecord(record: any): Promise<void> {
    // Anonymize personal data while preserving business data
  }
  
  private static async deleteRecord(record: any): Promise<void> {
    // Securely delete record
  }
}