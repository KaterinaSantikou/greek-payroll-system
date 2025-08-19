import { createHash, randomBytes } from "crypto";
import { nanoid } from "nanoid";

/**
 * Data Residency and Backup Service
 * Implements EU-zone data residency with configurable backup and restore capabilities
 */

export interface DataResidencyConfig {
  primaryRegion: 'eu-west-1' | 'eu-central-1' | 'eu-south-1';
  backupRegions: string[];
  encryptionAtRest: boolean;
  encryptionInTransit: boolean;
  dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
  retentionPeriodDays: number;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  pointInTimeRecovery: boolean;
}

export interface BackupMetadata {
  backupId: string;
  timestamp: Date;
  backupType: 'full' | 'incremental' | 'differential';
  dataSize: number;
  compressionRatio: number;
  encryptionKey: string;
  checksumSHA256: string;
  region: string;
  retentionUntil: Date;
  tables: string[];
  recordCount: number;
}

export interface RestorePoint {
  restoreId: string;
  timestamp: Date;
  backupId: string;
  restoreType: '30day' | '60day' | '90day' | 'custom';
  targetEnvironment: 'production' | 'staging' | 'development';
  status: 'requested' | 'in_progress' | 'completed' | 'failed';
  estimatedSizeGB: number;
  approvedBy: string;
  requestedBy: string;
}

export interface DataClassificationTag {
  fieldName: string;
  classification: 'public' | 'internal' | 'confidential' | 'restricted';
  encryptionRequired: boolean;
  accessControls: string[];
  retentionPeriod: number;
  gdprCategory?: 'personal_data' | 'special_category' | 'pseudonymized';
}

// Greek/EU specific data residency requirements
const EU_REGIONS = [
  'eu-west-1',      // Ireland
  'eu-central-1',   // Frankfurt  
  'eu-south-1',     // Milan
  'eu-west-2',      // London (post-Brexit considerations)
  'eu-west-3',      // Paris
  'eu-north-1'      // Stockholm
];

// Data classification for Greek HR/Payroll
const PAYROLL_DATA_CLASSIFICATION: DataClassificationTag[] = [
  {
    fieldName: 'afm',
    classification: 'confidential',
    encryptionRequired: true,
    accessControls: ['hr_admin', 'payroll_manager'],
    retentionPeriod: 2190, // 6 years
    gdprCategory: 'personal_data'
  },
  {
    fieldName: 'amka', 
    classification: 'restricted',
    encryptionRequired: true,
    accessControls: ['hr_admin'],
    retentionPeriod: 2190,
    gdprCategory: 'personal_data'
  },
  {
    fieldName: 'bankIban',
    classification: 'restricted',
    encryptionRequired: true,
    accessControls: ['finance_controller', 'payroll_manager'],
    retentionPeriod: 2190,
    gdprCategory: 'personal_data'
  },
  {
    fieldName: 'baseSalary',
    classification: 'confidential',
    encryptionRequired: true,
    accessControls: ['hr_admin', 'payroll_manager', 'finance_controller'],
    retentionPeriod: 2190,
    gdprCategory: 'personal_data'
  },
  {
    fieldName: 'firstName',
    classification: 'internal',
    encryptionRequired: false,
    accessControls: ['hr_admin', 'payroll_manager', 'property_manager'],
    retentionPeriod: 2190,
    gdprCategory: 'personal_data'
  },
  {
    fieldName: 'lastName',
    classification: 'internal',
    encryptionRequired: false,
    accessControls: ['hr_admin', 'payroll_manager', 'property_manager'],
    retentionPeriod: 2190,
    gdprCategory: 'personal_data'
  }
];

class DataResidencyService {
  private readonly encryptionKey: string;
  private readonly defaultConfig: DataResidencyConfig;

  constructor() {
    this.encryptionKey = process.env.DATA_ENCRYPTION_KEY || this.generateEncryptionKey();
    this.defaultConfig = {
      primaryRegion: 'eu-central-1', // Frankfurt for Greek operations
      backupRegions: ['eu-west-1', 'eu-south-1'],
      encryptionAtRest: true,
      encryptionInTransit: true,
      dataClassification: 'confidential',
      retentionPeriodDays: 2190, // 6 years for Greek payroll
      backupFrequency: 'daily',
      pointInTimeRecovery: true
    };
  }

  /**
   * Encrypt sensitive data at rest using AES-256
   */
  async encryptSensitiveData(data: any, fieldName: string): Promise<string> {
    const classification = this.getDataClassification(fieldName);
    
    if (!classification.encryptionRequired) {
      return data; // No encryption needed for this field
    }

    const iv = randomBytes(16);
    const cipher = createCipher('aes-256-gcm', this.encryptionKey);
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = (cipher as any).getAuthTag();
    
    return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
  }

  /**
   * Decrypt sensitive data
   */
  async decryptSensitiveData(encryptedData: string, fieldName: string): Promise<any> {
    const classification = this.getDataClassification(fieldName);
    
    if (!classification.encryptionRequired) {
      return encryptedData; // No decryption needed
    }

    try {
      const [ivHex, encrypted, authTagHex] = encryptedData.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      
      const decipher = createDecipher('aes-256-gcm', this.encryptionKey);
      (decipher as any).setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      throw new Error(`Failed to decrypt data for field ${fieldName}: ${error}`);
    }
  }

  /**
   * Create full database backup with EU residency compliance
   */
  async createFullBackup(requestedBy: string): Promise<BackupMetadata> {
    const backupId = nanoid();
    const timestamp = new Date();
    
    // Validate EU region compliance
    if (!EU_REGIONS.includes(this.defaultConfig.primaryRegion)) {
      throw new Error(`Primary region ${this.defaultConfig.primaryRegion} is not EU-compliant`);
    }

    // Create backup metadata
    const backupMetadata: BackupMetadata = {
      backupId,
      timestamp,
      backupType: 'full',
      dataSize: 0, // Will be calculated
      compressionRatio: 0.7, // Estimated
      encryptionKey: this.generateBackupEncryptionKey(),
      checksumSHA256: '',
      region: this.defaultConfig.primaryRegion,
      retentionUntil: this.calculateRetentionDate(timestamp),
      tables: [
        'employees',
        'contracts', 
        'wage_components',
        'punch_events',
        'timesheets',
        'payroll_runs',
        'payroll_lines',
        'filings',
        'payment_instructions'
      ],
      recordCount: 0
    };

    // Simulate backup process (in production, this would use cloud provider APIs)
    const backupData = await this.performDatabaseDump(backupMetadata.tables);
    
    // Calculate actual metrics
    backupMetadata.dataSize = Buffer.byteLength(JSON.stringify(backupData));
    backupMetadata.recordCount = this.calculateRecordCount(backupData);
    backupMetadata.checksumSHA256 = createHash('sha256')
      .update(JSON.stringify(backupData))
      .digest('hex');

    // Store backup in EU-compliant storage
    await this.storeBackupInEURegion(backupMetadata, backupData);
    
    // Log backup creation for audit
    console.log(`Full backup ${backupId} created by ${requestedBy} in region ${backupMetadata.region}`);
    
    return backupMetadata;
  }

  /**
   * Create point-in-time restore point
   */
  async createRestorePoint(
    timestamp: Date,
    restoreType: '30day' | '60day' | '90day',
    requestedBy: string,
    approvedBy: string
  ): Promise<RestorePoint> {
    const restoreId = nanoid();
    
    // Find appropriate backup for the requested timestamp
    const availableBackups = await this.findBackupsForTimestamp(timestamp);
    if (availableBackups.length === 0) {
      throw new Error(`No backups available for timestamp ${timestamp.toISOString()}`);
    }

    const selectedBackup = availableBackups[0]; // Use most recent backup before timestamp
    
    const restorePoint: RestorePoint = {
      restoreId,
      timestamp,
      backupId: selectedBackup.backupId,
      restoreType,
      targetEnvironment: 'staging', // Default to staging for safety
      status: 'requested',
      estimatedSizeGB: selectedBackup.dataSize / (1024 * 1024 * 1024),
      approvedBy,
      requestedBy
    };

    // Log restore point creation
    console.log(`Restore point ${restoreId} created for ${timestamp.toISOString()}`);
    
    return restorePoint;
  }

  /**
   * Execute point-in-time recovery
   */
  async executeRestore(restorePoint: RestorePoint): Promise<void> {
    if (restorePoint.status !== 'requested') {
      throw new Error(`Cannot execute restore in status: ${restorePoint.status}`);
    }

    restorePoint.status = 'in_progress';
    
    try {
      // Retrieve backup data
      const backupData = await this.retrieveBackupData(restorePoint.backupId);
      
      // Validate backup integrity
      const isValid = await this.validateBackupIntegrity(backupData);
      if (!isValid) {
        throw new Error('Backup integrity validation failed');
      }

      // Execute restore (in production, this would restore to target environment)
      await this.restoreDatabase(backupData, restorePoint.targetEnvironment);
      
      restorePoint.status = 'completed';
      
      console.log(`Restore ${restorePoint.restoreId} completed successfully`);
    } catch (error) {
      restorePoint.status = 'failed';
      throw new Error(`Restore failed: ${error}`);
    }
  }

  /**
   * Validate data residency compliance
   */
  async validateDataResidencyCompliance(): Promise<{
    compliant: boolean;
    violations: string[];
    recommendations: string[];
  }> {
    const violations: string[] = [];
    const recommendations: string[] = [];

    // Check primary region
    if (!EU_REGIONS.includes(this.defaultConfig.primaryRegion)) {
      violations.push(`Primary region ${this.defaultConfig.primaryRegion} is outside EU`);
    }

    // Check backup regions
    this.defaultConfig.backupRegions.forEach(region => {
      if (!EU_REGIONS.includes(region)) {
        violations.push(`Backup region ${region} is outside EU`);
      }
    });

    // Check encryption settings
    if (!this.defaultConfig.encryptionAtRest) {
      violations.push('Encryption at rest is disabled');
    }
    
    if (!this.defaultConfig.encryptionInTransit) {
      violations.push('Encryption in transit is disabled');
    }

    // Generate recommendations
    if (this.defaultConfig.primaryRegion === 'eu-west-2') {
      recommendations.push('Consider moving from London (eu-west-2) to Frankfurt (eu-central-1) for optimal Greek operations');
    }

    return {
      compliant: violations.length === 0,
      violations,
      recommendations
    };
  }

  /**
   * Get backup retention schedule
   */
  getBackupRetentionSchedule(): any {
    const now = new Date();
    
    return {
      daily: {
        frequency: 'Every day at 02:00 UTC',
        retention: '30 days',
        nextBackup: new Date(now.getTime() + 24 * 60 * 60 * 1000)
      },
      weekly: {
        frequency: 'Every Sunday at 01:00 UTC',
        retention: '12 weeks',
        nextBackup: this.getNextSunday()
      },
      monthly: {
        frequency: 'First Sunday of each month at 00:00 UTC',
        retention: '12 months',
        nextBackup: this.getFirstSundayOfNextMonth()
      },
      yearly: {
        frequency: 'January 1st at 00:00 UTC',
        retention: '7 years (Greek legal requirement)',
        nextBackup: new Date(now.getFullYear() + 1, 0, 1)
      }
    };
  }

  /**
   * Private helper methods
   */
  private generateEncryptionKey(): string {
    return randomBytes(32).toString('hex');
  }

  private generateBackupEncryptionKey(): string {
    return randomBytes(32).toString('hex');
  }

  private getDataClassification(fieldName: string): DataClassificationTag {
    const classification = PAYROLL_DATA_CLASSIFICATION.find(tag => tag.fieldName === fieldName);
    
    // Default classification for unknown fields
    return classification || {
      fieldName,
      classification: 'internal',
      encryptionRequired: false,
      accessControls: ['hr_admin'],
      retentionPeriod: 2190,
      gdprCategory: 'personal_data'
    };
  }

  private calculateRetentionDate(timestamp: Date): Date {
    const retentionDate = new Date(timestamp);
    retentionDate.setDate(retentionDate.getDate() + this.defaultConfig.retentionPeriodDays);
    return retentionDate;
  }

  private async performDatabaseDump(tables: string[]): Promise<any> {
    // Mock implementation - in production, this would use pg_dump or similar
    const mockData: any = {};
    
    tables.forEach(table => {
      mockData[table] = {
        schema: `CREATE TABLE ${table} (...)`,
        data: [], // Actual table data would go here
        indexes: [],
        constraints: []
      };
    });
    
    return mockData;
  }

  private calculateRecordCount(backupData: any): number {
    let totalRecords = 0;
    
    Object.values(backupData).forEach((tableData: any) => {
      if (tableData.data && Array.isArray(tableData.data)) {
        totalRecords += tableData.data.length;
      }
    });
    
    return totalRecords;
  }

  private async storeBackupInEURegion(metadata: BackupMetadata, data: any): Promise<void> {
    // Mock implementation - in production, this would use AWS S3, Azure Blob, or GCP Storage
    console.log(`Storing backup ${metadata.backupId} in region ${metadata.region}`);
    console.log(`Backup size: ${metadata.dataSize} bytes`);
    console.log(`Encryption key: ${metadata.encryptionKey.substring(0, 8)}...`);
  }

  private async findBackupsForTimestamp(timestamp: Date): Promise<BackupMetadata[]> {
    // Mock implementation - would query backup metadata
    return [{
      backupId: 'backup_123',
      timestamp: new Date(timestamp.getTime() - 60 * 60 * 1000), // 1 hour before
      backupType: 'full',
      dataSize: 1024 * 1024 * 100, // 100MB
      compressionRatio: 0.7,
      encryptionKey: 'mock_key',
      checksumSHA256: 'mock_checksum',
      region: 'eu-central-1',
      retentionUntil: new Date(timestamp.getTime() + 90 * 24 * 60 * 60 * 1000),
      tables: ['employees', 'payroll_runs'],
      recordCount: 1000
    }];
  }

  private async retrieveBackupData(backupId: string): Promise<any> {
    // Mock implementation - would retrieve from cloud storage
    console.log(`Retrieving backup data for ${backupId}`);
    return { mockBackupData: true };
  }

  private async validateBackupIntegrity(backupData: any): Promise<boolean> {
    // Mock implementation - would validate checksums and structure
    return true;
  }

  private async restoreDatabase(backupData: any, targetEnvironment: string): Promise<void> {
    // Mock implementation - would execute restore commands
    console.log(`Restoring database to ${targetEnvironment}`);
  }

  private getNextSunday(): Date {
    const now = new Date();
    const daysUntilSunday = 7 - now.getDay();
    const nextSunday = new Date(now);
    nextSunday.setDate(now.getDate() + daysUntilSunday);
    nextSunday.setHours(1, 0, 0, 0);
    return nextSunday;
  }

  private getFirstSundayOfNextMonth(): Date {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    
    // Find first Sunday of next month
    while (nextMonth.getDay() !== 0) {
      nextMonth.setDate(nextMonth.getDate() + 1);
    }
    
    nextMonth.setHours(0, 0, 0, 0);
    return nextMonth;
  }
}

export const dataResidencyService = new DataResidencyService();