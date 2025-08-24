/**
 * Service Role Utilities for RLS Bypass
 * 
 * This module provides secure server-side utilities for bypassing RLS
 * when administrative operations require elevated privileges.
 * 
 * SECURITY: Service role keys are NEVER exposed to the client
 */

import pkg from 'pg';
const { Pool } = pkg;
import type { PoolClient } from 'pg';
import { getServiceRoleKey } from './envValidation';

/**
 * Create a database connection with service role privileges
 * Used for operations that need to bypass Row Level Security (RLS)
 */
export class ServiceRoleDB {
  private static pool: Pool | null = null;
  
  private static getPool(): Pool {
    if (!ServiceRoleDB.pool) {
      const dbUrl = process.env.DATABASE_URL;
      
      if (!dbUrl) {
        throw new Error('DATABASE_URL is required for service role operations');
      }
      
      ServiceRoleDB.pool = new Pool({
        connectionString: dbUrl,
        application_name: 'payrollsync-service-role',
        max: 5, // Limit connections for service role
        idleTimeoutMillis: 30000,
      });
    }
    
    return ServiceRoleDB.pool;
  }
  
  /**
   * Execute a query with RLS bypass privileges
   */
  static async executeWithRLSBypass<T = any>(
    query: string,
    params?: any[]
  ): Promise<T[]> {
    const serviceKey = getServiceRoleKey();
    
    if (!serviceKey) {
      console.warn('⚠️ No service role key available, using regular database connection');
      // Fall back to regular query (with RLS enabled)
      return ServiceRoleDB.executeRegular<T>(query, params);
    }
    
    const pool = ServiceRoleDB.getPool();
    const client = await pool.connect();
    
    try {
      console.log(`🔓 Executing RLS bypass query: ${query.substring(0, 100)}...`);
      
      // Set service role context (implementation depends on your DB setup)
      // This might involve setting a custom variable or role
      await client.query(`SET LOCAL application.service_role_key = $1`, [serviceKey]);
      
      // For PostgreSQL RLS bypass, you might need to:
      // 1. Set a specific role
      // 2. Set row_security = off (if permissions allow)
      // 3. Use a service account with bypass privileges
      
      try {
        // Attempt to disable RLS if the service role has permission
        await client.query('SET LOCAL row_security = off');
        console.log('🔓 RLS disabled for this query');
      } catch (error) {
        console.warn('⚠️ Could not disable RLS, proceeding with service role privileges');
      }
      
      // Execute the actual query
      const result = await client.query(query, params);
      
      console.log(`✅ RLS bypass query completed, returned ${result.rows.length} rows`);
      return result.rows;
      
    } catch (error) {
      console.error('❌ RLS bypass query failed:', error);
      throw error;
    } finally {
      // Clean up and release connection
      try {
        await client.query('RESET ALL');
      } catch (error) {
        // Ignore reset errors
      }
      client.release();
    }
  }
  
  /**
   * Execute query with regular permissions (RLS enabled)
   */
  static async executeRegular<T = any>(
    query: string,
    params?: any[]
  ): Promise<T[]> {
    const pool = ServiceRoleDB.getPool();
    const client = await pool.connect();
    
    try {
      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }
  
  /**
   * Get a client connection with service role privileges
   * For more complex transactions that need multiple queries
   */
  static async getServiceRoleClient(): Promise<{
    client: PoolClient;
    release: () => void;
  }> {
    const serviceKey = getServiceRoleKey();
    const pool = ServiceRoleDB.getPool();
    const client = await pool.connect();
    
    if (serviceKey) {
      await client.query(`SET LOCAL application.service_role_key = $1`, [serviceKey]);
      
      try {
        await client.query('SET LOCAL row_security = off');
      } catch (error) {
        // Service role might not have RLS bypass permissions
        console.warn('⚠️ RLS bypass not available for this service role');
      }
    }
    
    return {
      client,
      release: () => {
        try {
          client.query('RESET ALL');
        } catch (error) {
          // Ignore reset errors
        }
        client.release();
      }
    };
  }
  
  /**
   * Verify service role access for administrative operations
   */
  static async verifyServiceRoleAccess(): Promise<boolean> {
    try {
      const result = await ServiceRoleDB.executeWithRLSBypass(
        'SELECT current_user, session_user, current_setting(\'application.service_role_key\', true) as service_key'
      );
      
      console.log('🔑 Service role verification:', result[0]);
      return true;
    } catch (error) {
      console.error('❌ Service role verification failed:', error);
      return false;
    }
  }
  
  /**
   * Clean up database connections
   */
  static async cleanup(): Promise<void> {
    if (ServiceRoleDB.pool) {
      await ServiceRoleDB.pool.end();
      ServiceRoleDB.pool = null;
    }
  }
}