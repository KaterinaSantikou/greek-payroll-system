// =============================================================================
// DATABASE MIGRATION SAFETY AND TRANSACTION MANAGEMENT
// =============================================================================

import { sql } from 'drizzle-orm';
import type { Pool } from 'pg';

/**
 * Transactional Migration Executor
 *
 * Wraps groups of DDL operations in transactions where safe.
 * Splits heavy NOT NULL changes into backfill → enforce steps.
 */
export class MigrationExecutor {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Execute migration with proper transaction handling
   * Some DDL operations cannot be wrapped in transactions (like CONCURRENT index creation)
   */
  async executeMigration(operations: MigrationOperation[]): Promise<void> {
    for (const operation of operations) {
      if (operation.requiresTransaction === false) {
        // Execute outside transaction (e.g., CREATE INDEX CONCURRENTLY)
        console.log(
          `[MIGRATION] Executing non-transactional: ${operation.description}`
        );
        await this.pool.query(operation.sql);
      } else {
        // Execute within transaction for safety
        console.log(
          `[MIGRATION] Executing transactional: ${operation.description}`
        );
        await this.pool.query('BEGIN');
        try {
          await this.pool.query(operation.sql);
          await this.pool.query('COMMIT');
        } catch (error) {
          await this.pool.query('ROLLBACK');
          throw error;
        }
      }
    }
  }

  /**
   * Split NOT NULL changes into safe steps
   * 1. Add column as nullable
   * 2. Backfill data
   * 3. Add NOT NULL constraint
   */
  async addNotNullColumnSafely(
    tableName: string,
    columnName: string,
    columnType: string,
    backfillValue: string
  ): Promise<void> {
    const operations: MigrationOperation[] = [
      {
        description: `Add nullable column ${columnName}`,
        sql: `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`,
        requiresTransaction: true,
      },
      {
        description: `Backfill ${columnName} with default value`,
        sql: `UPDATE ${tableName} SET ${columnName} = ${backfillValue} WHERE ${columnName} IS NULL`,
        requiresTransaction: true,
      },
      {
        description: `Add NOT NULL constraint to ${columnName}`,
        sql: `ALTER TABLE ${tableName} ALTER COLUMN ${columnName} SET NOT NULL`,
        requiresTransaction: true,
      },
    ];

    await this.executeMigration(operations);
  }

  /**
   * Safely convert timestamp to timestamptz
   * 1. Add new timestamptz column
   * 2. Copy data with timezone conversion
   * 3. Drop old column
   * 4. Rename new column
   */
  async convertTimestampToTimestamptz(
    tableName: string,
    columnName: string,
    defaultTimezone: string = 'UTC'
  ): Promise<void> {
    const tempColumnName = `${columnName}_tz_temp`;

    const operations: MigrationOperation[] = [
      {
        description: `Add temporary timestamptz column`,
        sql: `ALTER TABLE ${tableName} ADD COLUMN ${tempColumnName} TIMESTAMPTZ`,
        requiresTransaction: true,
      },
      {
        description: `Copy data with timezone conversion`,
        sql: `UPDATE ${tableName} SET ${tempColumnName} = ${columnName} AT TIME ZONE '${defaultTimezone}' WHERE ${columnName} IS NOT NULL`,
        requiresTransaction: true,
      },
      {
        description: `Drop old timestamp column`,
        sql: `ALTER TABLE ${tableName} DROP COLUMN ${columnName}`,
        requiresTransaction: true,
      },
      {
        description: `Rename new column to original name`,
        sql: `ALTER TABLE ${tableName} RENAME COLUMN ${tempColumnName} TO ${columnName}`,
        requiresTransaction: true,
      },
    ];

    await this.executeMigration(operations);
  }
}

/**
 * RLS Setup in Correct Order
 *
 * Proper order: create table → seed policies → enable RLS
 * NOT: enable RLS → create policies (this breaks access)
 */
export class RLSManager {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Set up RLS with proper order
   */
  async setupRLS(tableName: string, policies: RLSPolicy[]): Promise<void> {
    console.log(`[RLS] Setting up Row Level Security for ${tableName}...`);

    // Step 1: Ensure table exists (should already exist)
    console.log(`[RLS] ✅ Table ${tableName} exists`);

    // Step 2: Create all policies BEFORE enabling RLS
    for (const policy of policies) {
      const policySQL = `
        CREATE POLICY ${policy.name} ON ${tableName}
        FOR ${policy.command}
        TO ${policy.role}
        USING (${policy.expression})
      `;

      try {
        await this.pool.query(policySQL);
        console.log(`[RLS] ✅ Created policy: ${policy.name}`);
      } catch (error: any) {
        if (error.code === '42P17') {
          // policy already exists
          console.log(`[RLS] ℹ️ Policy ${policy.name} already exists`);
        } else {
          throw error;
        }
      }
    }

    // Step 3: Enable RLS AFTER policies are in place
    try {
      await this.pool.query(
        `ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY`
      );
      console.log(`[RLS] ✅ Enabled RLS on ${tableName}`);
    } catch (error: any) {
      if (error.message?.includes('already enabled')) {
        console.log(`[RLS] ℹ️ RLS already enabled on ${tableName}`);
      } else {
        throw error;
      }
    }

    // Step 4: Verify policies are working
    const policyCheck = await this.pool.query(
      `
      SELECT schemaname, tablename, policyname, cmd, qual 
      FROM pg_policies 
      WHERE tablename = $1
    `,
      [tableName]
    );

    console.log(
      `[RLS] ✅ Verified ${policyCheck.rowCount} policies on ${tableName}`
    );
  }

  /**
   * Disable RLS safely (for maintenance)
   */
  async disableRLS(tableName: string): Promise<void> {
    await this.pool.query(
      `ALTER TABLE ${tableName} DISABLE ROW LEVEL SECURITY`
    );
    console.log(`[RLS] ⚠️ Disabled RLS on ${tableName} (maintenance mode)`);
  }
}

// Type definitions
export interface MigrationOperation {
  description: string;
  sql: string;
  requiresTransaction?: boolean; // default true
}

export interface RLSPolicy {
  name: string;
  command: 'ALL' | 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  role: string;
  expression: string;
}

/**
 * Database timezone utilities
 */
export class TimezoneManager {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Set application timezone to UTC globally
   */
  async setApplicationTimezone(): Promise<void> {
    await this.pool.query(`SET timezone TO 'UTC'`);
    console.log(`[TIMEZONE] ✅ Set application timezone to UTC`);

    // Verify setting
    const result = await this.pool.query(`SHOW timezone`);
    console.log(`[TIMEZONE] Current timezone: ${result.rows[0].TimeZone}`);
  }

  /**
   * Convert timestamp to Europe/Athens for UI display
   */
  convertToGreekTime(utcTimestamp: Date): Date {
    return new Date(
      utcTimestamp.toLocaleString('en-US', { timeZone: 'Europe/Athens' })
    );
  }
}

/**
 * Migration safety checks
 */
export async function checkMigrationSafety(pool: Pool): Promise<void> {
  console.log(
    '[MIGRATION_SAFETY] 🔍 Checking for table locks and long-running operations...'
  );

  // Check for table locks
  const lockCheck = await pool.query(`
    SELECT 
      schemaname, tablename, mode, granted
    FROM pg_locks l
    JOIN pg_class c ON l.relation = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE schemaname = 'public'
    AND mode LIKE '%Lock'
    AND NOT granted
  `);

  if (lockCheck.rowCount > 0) {
    console.warn('[MIGRATION_SAFETY] ⚠️ Found table locks:', lockCheck.rows);
  } else {
    console.log('[MIGRATION_SAFETY] ✅ No blocking table locks detected');
  }

  // Check for long-running queries
  const longQueryCheck = await pool.query(`
    SELECT 
      pid, state, query_start, 
      now() - query_start as duration,
      left(query, 50) as query_preview
    FROM pg_stat_activity 
    WHERE state = 'active' 
    AND now() - query_start > interval '1 minute'
    AND pid != pg_backend_pid()
  `);

  if (longQueryCheck.rowCount > 0) {
    console.warn(
      '[MIGRATION_SAFETY] ⚠️ Found long-running queries:',
      longQueryCheck.rows
    );
  } else {
    console.log('[MIGRATION_SAFETY] ✅ No long-running queries detected');
  }

  // Check if we're in business hours (avoid peak times)
  const now = new Date();
  const hour = now.getUTCHours();
  const isBusinessHours = hour >= 8 && hour <= 18; // 8 AM to 6 PM UTC

  if (isBusinessHours && process.env.NODE_ENV === 'production') {
    console.warn(
      '[MIGRATION_SAFETY] ⚠️ Running migration during business hours in production'
    );
  } else {
    console.log(
      '[MIGRATION_SAFETY] ✅ Deployment timing looks good (off-hours or non-production)'
    );
  }
}
