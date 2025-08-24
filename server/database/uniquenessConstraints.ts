// =============================================================================
// UNIQUENESS CONSTRAINTS TO PREVENT DUPLICATES
// =============================================================================

import { sql } from 'drizzle-orm';
import type { Pool } from 'pg';

/**
 * Advanced uniqueness constraint manager
 * Handles case-insensitive constraints and nullable field combinations
 */
export class UniquenessConstraintManager {
  private pool: Pool;
  
  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Add case-insensitive unique constraint on email fields
   * Prevents john@example.com and JOHN@example.com from being different users
   */
  async addCaseInsensitiveEmailConstraint(
    tableName: string, 
    emailColumnName: string = 'email'
  ): Promise<void> {
    const constraintName = `${tableName}_${emailColumnName}_ci_unique`;
    const indexName = `${tableName}_${emailColumnName}_ci_idx`;
    
    try {
      // Create unique index on LOWER(email)
      await this.pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS ${indexName}
        ON ${tableName} (LOWER(${emailColumnName}))
        WHERE ${emailColumnName} IS NOT NULL
      `);
      
      console.log(`[CONSTRAINTS] ✅ Created case-insensitive unique constraint on ${tableName}.${emailColumnName}`);
    } catch (error: any) {
      if (error.code === '23505') { // unique violation
        console.warn(`[CONSTRAINTS] ⚠️ Found duplicate emails in ${tableName}, please clean up data first`);
        throw new Error(`Duplicate emails found in ${tableName}. Please resolve duplicates before adding constraint.`);
      }
      throw error;
    }
  }

  /**
   * Add unique constraint with COALESCE for nullable fields
   * E.g., COALESCE(component_slug, '') to treat NULL as empty string for uniqueness
   */
  async addNullableUniqueConstraint(
    tableName: string,
    columnName: string,
    defaultValue: string = '',
    additionalColumns: string[] = []
  ): Promise<void> {
    const constraintName = `${tableName}_${columnName}_coalesce_unique`;
    
    // Build the constraint expression
    const coalesceExpr = `COALESCE(${columnName}, '${defaultValue}')`;
    const allColumns = [coalesceExpr, ...additionalColumns];
    const indexExpr = allColumns.join(', ');
    
    try {
      await this.pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS ${constraintName}
        ON ${tableName} (${indexExpr})
      `);
      
      console.log(`[CONSTRAINTS] ✅ Created nullable unique constraint on ${tableName}.${columnName}`);
    } catch (error: any) {
      if (error.code === '23505') { // unique violation
        console.warn(`[CONSTRAINTS] ⚠️ Found duplicate values in ${tableName}.${columnName}`);
        
        // Show the duplicates for debugging
        const duplicates = await this.pool.query(`
          SELECT ${columnName}, COUNT(*) as count
          FROM ${tableName}
          WHERE ${columnName} IS NOT NULL
          GROUP BY ${columnName}
          HAVING COUNT(*) > 1
          LIMIT 10
        `);
        
        console.log('[CONSTRAINTS] Duplicate values:', duplicates.rows);
        throw new Error(`Duplicate values found in ${tableName}.${columnName}. Please resolve duplicates first.`);
      }
      throw error;
    }
  }

  /**
   * Add composite unique constraint for complex business rules
   */
  async addCompositeUniqueConstraint(
    tableName: string,
    columns: string[],
    constraintName?: string
  ): Promise<void> {
    const name = constraintName || `${tableName}_${columns.join('_')}_unique`;
    
    try {
      await this.pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS ${name}
        ON ${tableName} (${columns.join(', ')})
      `);
      
      console.log(`[CONSTRAINTS] ✅ Created composite unique constraint on ${tableName}(${columns.join(', ')})`);
    } catch (error) {
      console.error(`[CONSTRAINTS] ❌ Failed to create composite constraint ${name}:`, error);
      throw error;
    }
  }

  /**
   * Setup all PayrollSync-specific uniqueness constraints
   */
  async setupPayrollSyncConstraints(): Promise<void> {
    console.log('[CONSTRAINTS] 🔧 Setting up PayrollSync uniqueness constraints...');
    
    // Users: case-insensitive email uniqueness
    await this.addCaseInsensitiveEmailConstraint('users', 'email');
    
    // Status page subscriptions: email + component_slug uniqueness
    await this.addNullableUniqueConstraint(
      'status_page_subscriptions', 
      'component_slug', 
      '', 
      ['LOWER(email)']
    );
    
    // Employees: AFM (Greek tax number) uniqueness per company
    try {
      await this.addCompositeUniqueConstraint(
        'employees',
        ['company_id', 'afm'],
        'employees_company_afm_unique'
      );
    } catch (error) {
      console.warn('[CONSTRAINTS] ⚠️ Employee AFM constraint may need data cleanup');
    }
    
    // Employee numbers: unique within company (nullable)
    try {
      await this.addNullableUniqueConstraint(
        'employees',
        'employee_number',
        '',
        ['company_id']
      );
    } catch (error) {
      console.warn('[CONSTRAINTS] ⚠️ Employee number constraint may need data cleanup');
    }
    
    // WebAuthn credentials: ensure credentialId uniqueness
    await this.addCaseInsensitiveEmailConstraint('webauthn_credentials', 'credential_id');
    
    // Session tokens: ensure uniqueness
    await this.pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS user_sessions_token_unique
      ON user_sessions (session_token)
      WHERE session_token IS NOT NULL
    `);
    
    // SSO connections: one connection per provider per user
    await this.addCompositeUniqueConstraint(
      'user_sso_connections',
      ['user_id', 'provider_id'],
      'user_sso_unique'
    );
    
    console.log('[CONSTRAINTS] ✅ PayrollSync uniqueness constraints setup complete');
  }

  /**
   * Validate existing data before adding constraints
   */
  async validateDataForConstraints(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    // Check for duplicate emails (case-insensitive)
    const emailDupes = await this.pool.query(`
      SELECT LOWER(email) as email_lower, COUNT(*) as count, 
             array_agg(id) as user_ids
      FROM users 
      WHERE email IS NOT NULL
      GROUP BY LOWER(email)
      HAVING COUNT(*) > 1
    `);
    
    if (emailDupes.rowCount > 0) {
      results.push({
        table: 'users',
        field: 'email',
        issue: 'case_insensitive_duplicates',
        count: emailDupes.rowCount,
        examples: emailDupes.rows.slice(0, 5)
      });
    }
    
    // Check for null/empty component_slug duplicates in subscriptions
    const componentDupes = await this.pool.query(`
      SELECT email, COALESCE(component_slug, '') as component,
             COUNT(*) as count, array_agg(id) as sub_ids
      FROM status_page_subscriptions
      GROUP BY email, COALESCE(component_slug, '')
      HAVING COUNT(*) > 1
    `);
    
    if (componentDupes.rowCount > 0) {
      results.push({
        table: 'status_page_subscriptions',
        field: 'email,component_slug',
        issue: 'composite_duplicates',
        count: componentDupes.rowCount,
        examples: componentDupes.rows.slice(0, 5)
      });
    }
    
    return results;
  }

  /**
   * Clean up duplicate data before adding constraints
   */
  async cleanupDuplicates(tableName: string, strategy: 'keep_latest' | 'keep_first' | 'manual'): Promise<void> {
    if (strategy === 'manual') {
      throw new Error('Manual cleanup required. Please resolve duplicates manually.');
    }
    
    console.log(`[CLEANUP] 🧹 Cleaning up duplicates in ${tableName} using ${strategy} strategy...`);
    
    // Implementation depends on specific table and strategy
    switch (tableName) {
      case 'users':
        if (strategy === 'keep_latest') {
          await this.pool.query(`
            DELETE FROM users u1
            WHERE EXISTS (
              SELECT 1 FROM users u2
              WHERE LOWER(u1.email) = LOWER(u2.email)
              AND u1.created_at < u2.created_at
            )
          `);
        }
        break;
        
      case 'status_page_subscriptions':
        if (strategy === 'keep_latest') {
          await this.pool.query(`
            DELETE FROM status_page_subscriptions s1
            WHERE EXISTS (
              SELECT 1 FROM status_page_subscriptions s2
              WHERE s1.email = s2.email
              AND COALESCE(s1.component_slug, '') = COALESCE(s2.component_slug, '')
              AND s1.created_at < s2.created_at
            )
          `);
        }
        break;
    }
    
    console.log(`[CLEANUP] ✅ Duplicate cleanup completed for ${tableName}`);
  }
}

// Type definitions
export interface ValidationResult {
  table: string;
  field: string;
  issue: string;
  count: number;
  examples: any[];
}

/**
 * Greek-specific validation constraints
 */
export class GreekValidationConstraints {
  private pool: Pool;
  
  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Add AFM (Greek tax number) validation constraint
   * AFM must be exactly 9 digits
   */
  async addAFMConstraint(tableName: string = 'employees'): Promise<void> {
    const constraintName = `${tableName}_afm_format_check`;
    
    await this.pool.query(`
      ALTER TABLE ${tableName}
      ADD CONSTRAINT IF NOT EXISTS ${constraintName}
      CHECK (afm IS NULL OR (afm ~ '^[0-9]{9}$'))
    `);
    
    console.log(`[CONSTRAINTS] ✅ Added AFM format validation to ${tableName}`);
  }

  /**
   * Add AMKA (Greek social security number) validation
   * AMKA must be exactly 11 digits
   */
  async addAMKAConstraint(tableName: string = 'employees'): Promise<void> {
    const constraintName = `${tableName}_amka_format_check`;
    
    await this.pool.query(`
      ALTER TABLE ${tableName}
      ADD CONSTRAINT IF NOT EXISTS ${constraintName}
      CHECK (amka IS NULL OR (amka ~ '^[0-9]{11}$'))
    `);
    
    console.log(`[CONSTRAINTS] ✅ Added AMKA format validation to ${tableName}`);
  }
}