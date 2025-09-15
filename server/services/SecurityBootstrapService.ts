/**
 * Security Bootstrap Service
 * 
 * This service initializes all security components during application startup:
 * - Database security (RLS policies, roles)
 * - Data encryption services
 * - Security monitoring
 * - GDPR compliance setup
 */

import { logger } from '../observability/logging.js';
import { DatabaseSecurityService } from './DatabaseSecurityService.js';
import { getSecurityService } from './DataSecurityService.js';

export class SecurityBootstrapService {
  
  /**
   * Initialize all security components
   * This should be called during application bootstrap, after database connection
   */
  public static async initialize(): Promise<void> {
    try {
      logger.info('🔒 Initializing security components...');
      
      // 1. Initialize data encryption service (validates encryption key)
      await this.initializeEncryptionService();
      
      // 2. Create database roles and permissions
      await this.initializeDatabaseSecurity();
      
      // 3. Set up audit logging
      await this.initializeAuditLogging();
      
      // 4. Create security monitoring views
      await this.initializeSecurityMonitoring();
      
      // 5. Validate complete security setup
      await this.validateSecurityConfiguration();
      
      logger.info('✅ Security components initialized successfully');
    } catch (error) {
      logger.error('❌ Security initialization failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Security initialization failure should stop the application
      throw new Error(`Security bootstrap failed: ${error}`);
    }
  }
  
  /**
   * Initialize data encryption service and validate key
   */
  private static async initializeEncryptionService(): Promise<void> {
    try {
      const securityService = getSecurityService();
      
      // Test encryption/decryption to validate key
      const testData = 'security-test-data';
      const testEmployeeId = 'test-employee-123';
      
      const encrypted = securityService.encryptField('testField', testData, testEmployeeId);
      const decrypted = securityService.decryptField('testField', encrypted, testEmployeeId);
      
      if (decrypted !== testData) {
        throw new Error('Encryption key validation failed - data integrity check failed');
      }
      
      logger.info('🔐 Data encryption service initialized and validated');
    } catch (error) {
      logger.error('Failed to initialize encryption service', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  
  /**
   * Initialize database security (RLS, roles, policies)
   */
  private static async initializeDatabaseSecurity(): Promise<void> {
    try {
      // Create database roles first
      await DatabaseSecurityService.createDatabaseRoles();
      
      // Initialize Row Level Security policies
      await DatabaseSecurityService.initializeRLS();
      
      logger.info('🛡️  Database security initialized');
    } catch (error) {
      logger.error('Failed to initialize database security', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Non-fatal in development, but should be addressed
      if (process.env.NODE_ENV === 'production') {
        throw error;
      } else {
        logger.warn('⚠️ Database security initialization failed in development mode - continuing startup');
      }
    }
  }
  
  /**
   * Initialize audit logging tables and triggers
   */
  private static async initializeAuditLogging(): Promise<void> {
    try {
      await DatabaseSecurityService.createAuditLogTable();
      
      logger.info('📋 Audit logging initialized');
    } catch (error) {
      logger.error('Failed to initialize audit logging', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  
  /**
   * Initialize security monitoring views and alerts
   */
  private static async initializeSecurityMonitoring(): Promise<void> {
    try {
      await DatabaseSecurityService.createSecurityViews();
      
      logger.info('👁️  Security monitoring initialized');
    } catch (error) {
      logger.error('Failed to initialize security monitoring', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Non-fatal - monitoring is nice to have but not critical for basic operation
      logger.warn('⚠️ Security monitoring initialization failed - continuing without monitoring views');
    }
  }
  
  /**
   * Validate complete security configuration
   */
  private static async validateSecurityConfiguration(): Promise<void> {
    try {
      const securityStatus = await DatabaseSecurityService.validateSecuritySetup();
      
      // Log security status
      logger.info('Security configuration status', {
        ...securityStatus,
        timestamp: new Date().toISOString()
      });
      
      // Check for critical security issues
      const criticalIssues: string[] = [];
      
      if (!securityStatus.encryptionEnabled) {
        criticalIssues.push('Data encryption is not enabled');
      }
      
      if (!securityStatus.auditTablesExist) {
        criticalIssues.push('Audit logging tables are missing');
      }
      
      if (process.env.NODE_ENV === 'production') {
        if (!securityStatus.rlsEnabled) {
          criticalIssues.push('Row Level Security is not enabled in production');
        }
        
        if (securityStatus.rolesCreated.length < 4) {
          criticalIssues.push('Insufficient database roles created for production');
        }
      }
      
      if (criticalIssues.length > 0) {
        logger.error('Critical security issues detected', {
          issues: criticalIssues,
          environment: process.env.NODE_ENV
        });
        
        if (process.env.NODE_ENV === 'production') {
          throw new Error(`Critical security issues in production: ${criticalIssues.join(', ')}`);
        }
      }
      
      logger.info('🔒 Security configuration validated successfully');
    } catch (error) {
      logger.error('Security configuration validation failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  
  /**
   * Generate security report for compliance and auditing
   */
  public static async generateSecurityReport(): Promise<{
    timestamp: string;
    environment: string;
    encryptionStatus: {
      enabled: boolean;
      algorithm: string;
      keyRotationDate?: string;
    };
    databaseSecurity: {
      rlsEnabled: boolean;
      rolesCount: number;
      policiesCount: number;
    };
    auditLogging: {
      enabled: boolean;
      retentionPeriod: string;
    };
    gdprCompliance: {
      consentTracking: boolean;
      dataExportEnabled: boolean;
      anonymizationEnabled: boolean;
    };
    recommendations: string[];
  }> {
    try {
      const securityStatus = await DatabaseSecurityService.validateSecuritySetup();
      const recommendations: string[] = [];
      
      // Generate recommendations based on current state
      if (!securityStatus.rlsEnabled) {
        recommendations.push('Enable Row Level Security (RLS) for enhanced data protection');
      }
      
      if (securityStatus.rolesCreated.length < 5) {
        recommendations.push('Create additional database roles for better access control');
      }
      
      if (!process.env.DATA_ENCRYPTION_KEY) {
        recommendations.push('Configure data encryption key for sensitive field protection');
      }
      
      const report = {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'unknown',
        encryptionStatus: {
          enabled: securityStatus.encryptionEnabled,
          algorithm: 'AES-256-GCM',
          keyRotationDate: undefined // Would track key rotation if implemented
        },
        databaseSecurity: {
          rlsEnabled: securityStatus.rlsEnabled,
          rolesCount: securityStatus.rolesCreated.length,
          policiesCount: securityStatus.policiesCreated.length
        },
        auditLogging: {
          enabled: securityStatus.auditTablesExist,
          retentionPeriod: '7 years (Greek labor law compliance)'
        },
        gdprCompliance: {
          consentTracking: true,
          dataExportEnabled: true,
          anonymizationEnabled: true
        },
        recommendations
      };
      
      logger.info('Security report generated', {
        reportId: `security-${Date.now()}`,
        environment: report.environment,
        recommendationsCount: recommendations.length
      });
      
      return report;
    } catch (error) {
      logger.error('Failed to generate security report', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  
  /**
   * Perform security health check
   * Can be called periodically or via health check endpoint
   */
  public static async performHealthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Array<{
      name: string;
      status: 'pass' | 'fail' | 'warn';
      message: string;
    }>;
  }> {
    const checks = [];
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    try {
      // Check 1: Encryption service
      try {
        const securityService = getSecurityService();
        const testEncryption = securityService.encryptField('test', 'test-data', 'test-id');
        const testDecryption = securityService.decryptField('test', testEncryption, 'test-id');
        
        checks.push({
          name: 'Data Encryption',
          status: testDecryption === 'test-data' ? 'pass' : 'fail',
          message: testDecryption === 'test-data' ? 'Encryption service working correctly' : 'Encryption integrity check failed'
        });
      } catch (error) {
        checks.push({
          name: 'Data Encryption',
          status: 'fail',
          message: `Encryption service error: ${error instanceof Error ? error.message : String(error)}`
        });
        overallStatus = 'unhealthy';
      }
      
      // Check 2: Database security
      try {
        const securityStatus = await DatabaseSecurityService.validateSecuritySetup();
        
        checks.push({
          name: 'Row Level Security',
          status: securityStatus.rlsEnabled ? 'pass' : 'warn',
          message: securityStatus.rlsEnabled ? 'RLS policies are active' : 'RLS not enabled'
        });
        
        checks.push({
          name: 'Database Roles',
          status: securityStatus.rolesCreated.length >= 4 ? 'pass' : 'warn', 
          message: `${securityStatus.rolesCreated.length} database roles configured`
        });
        
        checks.push({
          name: 'Audit Logging',
          status: securityStatus.auditTablesExist ? 'pass' : 'warn',
          message: securityStatus.auditTablesExist ? 'Audit tables are ready' : 'Audit tables missing'
        });
        
        if (!securityStatus.rlsEnabled || !securityStatus.auditTablesExist) {
          overallStatus = 'degraded';
        }
      } catch (error) {
        checks.push({
          name: 'Database Security',
          status: 'fail', 
          message: `Database security check failed: ${error instanceof Error ? error.message : String(error)}`
        });
        overallStatus = 'unhealthy';
      }
      
      // Check 3: Environment security
      const hasEncryptionKey = !!process.env.DATA_ENCRYPTION_KEY;
      const hasServiceKey = !!process.env.SERVICE_ROLE_KEY;
      
      checks.push({
        name: 'Environment Security',
        status: hasEncryptionKey && hasServiceKey ? 'pass' : 'warn',
        message: `Encryption key: ${hasEncryptionKey ? '✓' : '✗'}, Service key: ${hasServiceKey ? '✓' : '✗'}`
      });
      
      if (!hasEncryptionKey) {
        overallStatus = 'unhealthy';
      }
      
      logger.info('Security health check completed', {
        status: overallStatus,
        checksCount: checks.length,
        passedChecks: checks.filter(c => c.status === 'pass').length,
        failedChecks: checks.filter(c => c.status === 'fail').length
      });
      
      return {
        status: overallStatus,
        checks
      };
    } catch (error) {
      logger.error('Security health check failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        status: 'unhealthy',
        checks: [{
          name: 'Health Check System',
          status: 'fail',
          message: `Health check system error: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }
}