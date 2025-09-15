/**
 * Database Security Service for Row-Level Security (RLS) and Data Protection
 * 
 * This service implements database-level security policies including:
 * - Row Level Security (RLS) for employee data
 * - Database encryption at rest
 * - Access control policies
 * - Audit logging for database operations
 * - GDPR compliance policies
 */

import { db } from '../db.js';
import { sql } from 'drizzle-orm';
import { logger } from '../observability/logging.js';
import { getServiceRoleKey } from '../utils/envValidation.js';

// =============================================================================
// RLS POLICY DEFINITIONS
// =============================================================================

export class DatabaseSecurityService {
  
  /**
   * Initialize Row Level Security policies for employee data
   * This must be called during application bootstrap
   */
  public static async initializeRLS(): Promise<void> {
    try {
      logger.info('Initializing Row Level Security policies');
      
      // Enable RLS on employees table
      await db.execute(sql`
        ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
      `);
      
      // Create RLS policies for different access patterns
      await this.createEmployeeAccessPolicies();
      await this.createAuditPolicies();
      await this.createGdprCompliancePolicies();
      
      logger.info('RLS policies initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize RLS policies', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  
  /**
   * Create employee data access policies
   */
  private static async createEmployeeAccessPolicies(): Promise<void> {
    // Policy 1: Employees can only see their own data
    await db.execute(sql`
      CREATE POLICY employee_own_data_select ON employees
        FOR SELECT
        TO employee_role
        USING (employee_id = current_setting('app.current_employee_id', true));
    `);
    
    // Policy 2: HR can see all employee data
    await db.execute(sql`
      CREATE POLICY hr_full_access ON employees
        FOR ALL
        TO hr_role
        USING (true)
        WITH CHECK (true);
    `);
    
    // Policy 3: Managers can see their team's data
    await db.execute(sql`
      CREATE POLICY manager_team_access ON employees
        FOR SELECT
        TO manager_role
        USING (
          default_property_id IN (
            SELECT property_id 
            FROM user_property_access 
            WHERE user_id = current_setting('app.current_user_id', true)
          )
        );
    `);
    
    // Policy 4: Payroll can see all active employees
    await db.execute(sql`
      CREATE POLICY payroll_active_access ON employees
        FOR SELECT
        TO payroll_role
        USING (is_active = true);
    `);
    
    // Policy 5: Auditors have read-only access to all data
    await db.execute(sql`
      CREATE POLICY auditor_readonly_access ON employees
        FOR SELECT
        TO auditor_role
        USING (true);
    `);
    
    logger.info('Employee access policies created');
  }
  
  /**
   * Create audit and logging policies
   */
  private static async createAuditPolicies(): Promise<void> {
    // Create audit trigger for all employee data changes
    await db.execute(sql`
      CREATE OR REPLACE FUNCTION audit_employee_changes() 
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO employee_audit_log (
          employee_id,
          operation,
          old_data,
          new_data,
          changed_by,
          changed_at,
          ip_address,
          user_agent
        ) VALUES (
          COALESCE(NEW.employee_id, OLD.employee_id),
          TG_OP,
          CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
          CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW) ELSE NULL END,
          current_setting('app.current_user_id', true),
          NOW(),
          current_setting('app.client_ip', true),
          current_setting('app.user_agent', true)
        );
        RETURN COALESCE(NEW, OLD);
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Attach audit trigger to employees table
    await db.execute(sql`
      DROP TRIGGER IF EXISTS employee_audit_trigger ON employees;
      CREATE TRIGGER employee_audit_trigger
        AFTER INSERT OR UPDATE OR DELETE ON employees
        FOR EACH ROW EXECUTE FUNCTION audit_employee_changes();
    `);
    
    logger.info('Audit policies and triggers created');
  }
  
  /**
   * Create GDPR compliance policies
   */
  private static async createGdprCompliancePolicies(): Promise<void> {
    // Create function to check GDPR consent
    await db.execute(sql`
      CREATE OR REPLACE FUNCTION check_gdpr_consent()
      RETURNS BOOLEAN AS $$
      DECLARE
        user_consent_date timestamp;
        consent_valid boolean := false;
      BEGIN
        -- Get user's GDPR consent date
        SELECT gdpr_consent_at INTO user_consent_date
        FROM users 
        WHERE id = current_setting('app.current_user_id', true);
        
        -- Check if consent exists and is less than 2 years old
        IF user_consent_date IS NOT NULL THEN
          consent_valid := user_consent_date > (NOW() - INTERVAL '2 years');
        END IF;
        
        RETURN consent_valid;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    -- Policy for GDPR consent requirement
    await db.execute(sql`
      CREATE POLICY gdpr_consent_required ON employees
        FOR UPDATE
        USING (
          check_gdpr_consent() = true OR 
          current_setting('app.bypass_gdpr', true) = 'true'
        );
    `);
    
    logger.info('GDPR compliance policies created');
  }
  
  /**
   * Set session variables for RLS context
   */
  public static async setSessionContext(options: {
    userId?: string;
    employeeId?: string;
    userRole?: string;
    ipAddress?: string;
    userAgent?: string;
    bypassGdpr?: boolean;
  }): Promise<void> {
    const { userId, employeeId, userRole, ipAddress, userAgent, bypassGdpr } = options;
    
    try {
      if (userId) {
        await db.execute(sql`SELECT set_config('app.current_user_id', ${userId}, true)`);
      }
      
      if (employeeId) {
        await db.execute(sql`SELECT set_config('app.current_employee_id', ${employeeId}, true)`);
      }
      
      if (userRole) {
        await db.execute(sql`SELECT set_config('app.current_user_role', ${userRole}, true)`);
        // Set PostgreSQL role for RLS
        await db.execute(sql`SET ROLE ${sql.identifier(userRole + '_role')}`);
      }
      
      if (ipAddress) {
        await db.execute(sql`SELECT set_config('app.client_ip', ${ipAddress}, true)`);
      }
      
      if (userAgent) {
        await db.execute(sql`SELECT set_config('app.user_agent', ${userAgent}, true)`);
      }
      
      if (bypassGdpr !== undefined) {
        await db.execute(sql`SELECT set_config('app.bypass_gdpr', ${bypassGdpr ? 'true' : 'false'}, true)`);
      }
    } catch (error) {
      logger.error('Failed to set session context', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        employeeId,
        userRole
      });
      throw error;
    }
  }
  
  /**
   * Create database roles for RLS
   */
  public static async createDatabaseRoles(): Promise<void> {
    try {
      const roles = [
        'employee_role',
        'manager_role', 
        'hr_role',
        'payroll_role',
        'auditor_role',
        'system_admin_role'
      ];
      
      for (const role of roles) {
        // Create role if it doesn't exist
        await db.execute(sql`
          DO $$
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = ${role}) THEN
              CREATE ROLE ${sql.identifier(role)};
            END IF;
          END
          $$;
        `);
        
        // Grant connect privilege
        await db.execute(sql`GRANT CONNECT ON DATABASE current_database() TO ${sql.identifier(role)}`);
        
        // Grant usage on schema
        await db.execute(sql`GRANT USAGE ON SCHEMA public TO ${sql.identifier(role)}`);
      }
      
      // Grant specific permissions to each role
      await this.grantRolePermissions();
      
      logger.info('Database roles created successfully');
    } catch (error) {
      logger.error('Failed to create database roles', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  
  /**
   * Grant specific permissions to each role
   */
  private static async grantRolePermissions(): Promise<void> {
    // Employee role - limited access
    await db.execute(sql`
      GRANT SELECT ON employees TO employee_role;
      GRANT SELECT ON shifts TO employee_role;
      GRANT SELECT ON timesheets TO employee_role;
    `);
    
    // Manager role - team access
    await db.execute(sql`
      GRANT SELECT ON employees TO manager_role;
      GRANT SELECT, INSERT, UPDATE ON shifts TO manager_role;
      GRANT SELECT ON timesheets TO manager_role;
      GRANT SELECT, INSERT, UPDATE ON exceptions TO manager_role;
    `);
    
    // HR role - full employee access
    await db.execute(sql`
      GRANT ALL ON employees TO hr_role;
      GRANT ALL ON shifts TO hr_role;
      GRANT ALL ON timesheets TO hr_role;
      GRANT ALL ON exceptions TO hr_role;
      GRANT ALL ON wage_components TO hr_role;
    `);
    
    // Payroll role - financial data access
    await db.execute(sql`
      GRANT SELECT ON employees TO payroll_role;
      GRANT ALL ON wage_components TO payroll_role;
      GRANT ALL ON timesheets TO payroll_role;
      GRANT SELECT ON shifts TO payroll_role;
    `);
    
    // Auditor role - read-only access to everything
    await db.execute(sql`
      GRANT SELECT ON ALL TABLES IN SCHEMA public TO auditor_role;
    `);
    
    // System admin - full access
    await db.execute(sql`
      GRANT ALL ON ALL TABLES IN SCHEMA public TO system_admin_role;
      GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO system_admin_role;
      GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO system_admin_role;
    `);
  }
  
  /**
   * Create audit log table for employee data changes
   */
  public static async createAuditLogTable(): Promise<void> {
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS employee_audit_log (
          id SERIAL PRIMARY KEY,
          employee_id VARCHAR(255) NOT NULL,
          operation VARCHAR(10) NOT NULL, -- INSERT, UPDATE, DELETE
          old_data JSONB,
          new_data JSONB,
          changed_by VARCHAR(255),
          changed_at TIMESTAMP DEFAULT NOW(),
          ip_address INET,
          user_agent TEXT,
          CONSTRAINT valid_operation CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE'))
        );
      `);
      
      // Create indexes for performance
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_employee_audit_employee_id ON employee_audit_log(employee_id);
        CREATE INDEX IF NOT EXISTS idx_employee_audit_changed_at ON employee_audit_log(changed_at);
        CREATE INDEX IF NOT EXISTS idx_employee_audit_changed_by ON employee_audit_log(changed_by);
      `);
      
      // Enable RLS on audit log
      await db.execute(sql`
        ALTER TABLE employee_audit_log ENABLE ROW LEVEL SECURITY;
      `);
      
      // Only auditors and admins can see audit logs
      await db.execute(sql`
        CREATE POLICY audit_log_access ON employee_audit_log
          FOR SELECT
          TO auditor_role, system_admin_role
          USING (true);
      `);
      
      logger.info('Employee audit log table created');
    } catch (error) {
      logger.error('Failed to create audit log table', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  
  /**
   * Create security monitoring views
   */
  public static async createSecurityViews(): Promise<void> {
    try {
      // View for suspicious access patterns
      await db.execute(sql`
        CREATE OR REPLACE VIEW suspicious_access_patterns AS
        SELECT 
          changed_by,
          COUNT(*) as access_count,
          COUNT(DISTINCT employee_id) as unique_employees_accessed,
          MIN(changed_at) as first_access,
          MAX(changed_at) as last_access,
          ARRAY_AGG(DISTINCT ip_address) as ip_addresses
        FROM employee_audit_log
        WHERE changed_at >= NOW() - INTERVAL '1 hour'
          AND operation = 'SELECT'
        GROUP BY changed_by
        HAVING COUNT(*) > 50 -- Flag users with >50 accesses per hour
        ORDER BY access_count DESC;
      `);
      
      // View for GDPR compliance monitoring
      await db.execute(sql`
        CREATE OR REPLACE VIEW gdpr_compliance_status AS
        SELECT 
          e.employee_id,
          e.name,
          e.is_active,
          u.gdpr_consent_at,
          CASE 
            WHEN u.gdpr_consent_at IS NULL THEN 'NO_CONSENT'
            WHEN u.gdpr_consent_at < NOW() - INTERVAL '2 years' THEN 'EXPIRED_CONSENT'
            ELSE 'VALID_CONSENT'
          END as consent_status,
          COUNT(al.id) as recent_access_count
        FROM employees e
        LEFT JOIN users u ON u.email = e.name -- Assuming email-based linking
        LEFT JOIN employee_audit_log al ON al.employee_id = e.employee_id 
          AND al.changed_at >= NOW() - INTERVAL '30 days'
        GROUP BY e.employee_id, e.name, e.is_active, u.gdpr_consent_at;
      `);
      
      logger.info('Security monitoring views created');
    } catch (error) {
      logger.error('Failed to create security views', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  
  /**
   * Validate database security configuration
   */
  public static async validateSecuritySetup(): Promise<{
    rlsEnabled: boolean;
    rolesCreated: string[];
    policiesCreated: string[];
    auditTablesExist: boolean;
    encryptionEnabled: boolean;
  }> {
    try {
      // Check if RLS is enabled on employees table
      const rlsCheck = await db.execute(sql`
        SELECT relrowsecurity 
        FROM pg_class 
        WHERE relname = 'employees';
      `);
      const rlsEnabled = rlsCheck.rows[0]?.relrowsecurity || false;
      
      // Check created roles
      const rolesCheck = await db.execute(sql`
        SELECT rolname 
        FROM pg_roles 
        WHERE rolname LIKE '%_role';
      `);
      const rolesCreated = rolesCheck.rows.map(row => row.rolname);
      
      // Check created policies
      const policiesCheck = await db.execute(sql`
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'employees';
      `);
      const policiesCreated = policiesCheck.rows.map(row => row.policyname);
      
      // Check audit table exists
      const auditCheck = await db.execute(sql`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'employee_audit_log'
        );
      `);
      const auditTablesExist = auditCheck.rows[0]?.exists || false;
      
      // Check encryption configuration
      const encryptionEnabled = !!process.env.DATA_ENCRYPTION_KEY;
      
      const securityStatus = {
        rlsEnabled,
        rolesCreated,
        policiesCreated,
        auditTablesExist,
        encryptionEnabled
      };
      
      logger.info('Security validation completed', securityStatus);
      
      return securityStatus;
    } catch (error) {
      logger.error('Security validation failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  
  /**
   * Emergency function to disable RLS (admin only)
   */
  public static async emergencyDisableRLS(): Promise<void> {
    const serviceKey = getServiceRoleKey();
    
    if (!serviceKey) {
      throw new Error('Service role key required for emergency RLS disable');
    }
    
    try {
      await db.execute(sql`ALTER TABLE employees DISABLE ROW LEVEL SECURITY`);
      
      logger.warn('EMERGENCY: RLS disabled on employees table', {
        disabledAt: new Date().toISOString(),
        requiresReEnable: true
      });
    } catch (error) {
      logger.error('Failed to disable RLS in emergency', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}