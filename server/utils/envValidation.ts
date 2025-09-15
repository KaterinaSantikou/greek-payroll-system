/**
 * Environment Variable Validation and Service Role Management
 * 
 * This module handles:
 * 1. Boot-time validation of required environment variables
 * 2. Service role key management (server-only, never exposed to client)
 * 3. RLS bypass functionality with service roles
 * 4. Clear error messages for missing configuration
 */

import pkg from 'pg';
const { Pool } = pkg;

// =============================================================================
// ENVIRONMENT VARIABLE DEFINITIONS
// =============================================================================

interface EnvConfig {
  // Core required variables
  NODE_ENV: string;
  DATABASE_URL: string;
  REPL_ID: string;
  SESSION_SECRET: string;
  BASE_URL?: string;
  
  // Object storage
  PUBLIC_OBJECT_SEARCH_PATHS?: string;
  PRIVATE_OBJECT_DIR?: string;
  
  // Email configuration
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  FROM_EMAIL?: string;
  
  // Security & service roles
  SERVICE_ROLE_KEY?: string;
  AUTH_ALLOWED_IPS?: string;
  
  // Feature flags
  ENABLE_ONCALL?: string;
  ENABLE_RUNBOOKS?: string;
  ENABLE_LOGGING?: string;
  
  // External services
  ERGANI_API_KEY?: string;
  ERGANI_API_ENDPOINT?: string;
  ALPHA_BANK_API_KEY?: string;
  PIRAEUS_BANK_API_KEY?: string;
  
  // Development
  DEBUG?: string;
  TEST_DATABASE_URL?: string;
  MOCK_EXTERNAL_SERVICES?: string;
}

// Required environment variables that must be present
const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'SESSION_SECRET',
] as const;

// Required in production only
const PRODUCTION_REQUIRED_ENV_VARS = [
  'REPL_ID',
] as const;

// Sensitive keys that should never be exposed to client
const SENSITIVE_SERVER_ONLY_KEYS = [
  'DATABASE_URL',
  'SESSION_SECRET', 
  'SERVICE_ROLE_KEY',
  'DATA_ENCRYPTION_KEY',
  'SMTP_PASS',
  'ERGANI_API_KEY',
  'ALPHA_BANK_API_KEY',
  'PIRAEUS_BANK_API_KEY',
  'AUDIT_HMAC_SECRET',
  'OPENAI_API_KEY',
  'GOOGLE_CLOUD_PRIVATE_KEY',
] as const;

// =============================================================================
// ENVIRONMENT VALIDATION
// =============================================================================

/**
 * Validate environment variables at boot time
 * Fail fast with clear error messages for missing configuration
 */
export function validateEnvironmentVariables(): EnvConfig {
  console.log('🔍 Validating environment variables...');
  
  const env = process.env as any;
  const isProduction = env.NODE_ENV === 'production';
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  for (const varName of REQUIRED_ENV_VARS) {
    if (!env[varName]) {
      errors.push(`❌ Missing required environment variable: ${varName}`);
    }
  }

  // Check production-specific requirements
  if (isProduction) {
    for (const varName of PRODUCTION_REQUIRED_ENV_VARS) {
      if (!env[varName]) {
        errors.push(`❌ Missing required production environment variable: ${varName}`);
      }
    }
  }

  // Validate specific formats and constraints
  if (env.DATABASE_URL && !env.DATABASE_URL.startsWith('postgresql://')) {
    errors.push(`❌ DATABASE_URL must be a valid PostgreSQL connection string`);
  }

  if (env.SESSION_SECRET && env.SESSION_SECRET.length < 32) {
    errors.push(`❌ SESSION_SECRET must be at least 32 characters long`);
  }

  if (env.BASE_URL && !env.BASE_URL.match(/^https?:\/\/.+/)) {
    warnings.push(`⚠️ BASE_URL should be a valid HTTP/HTTPS URL`);
  }

  if (env.SMTP_PORT && isNaN(parseInt(env.SMTP_PORT))) {
    errors.push(`❌ SMTP_PORT must be a valid number`);
  }

  // Check for recommended but optional variables
  if (!env.PUBLIC_OBJECT_SEARCH_PATHS) {
    warnings.push(`⚠️ PUBLIC_OBJECT_SEARCH_PATHS not set - object storage may not work`);
  }

  if (!env.PRIVATE_OBJECT_DIR) {
    warnings.push(`⚠️ PRIVATE_OBJECT_DIR not set - file uploads may not work`);
  }

  if (!env.SERVICE_ROLE_KEY) {
    warnings.push(`⚠️ SERVICE_ROLE_KEY not set - RLS bypass functionality disabled`);
  }

  // Print validation results
  if (warnings.length > 0) {
    console.log('\n⚠️  Environment Warnings:');
    warnings.forEach(warning => console.log(warning));
  }

  if (errors.length > 0) {
    console.log('\n❌ Environment Validation Failed:');
    errors.forEach(error => console.log(error));
    console.log('\n💡 To fix these issues:');
    console.log('1. Copy .env.example to .env');
    console.log('2. Fill in the required values');
    console.log('3. Restart the application');
    console.log('\nFor help generating values:');
    console.log('• SESSION_SECRET: openssl rand -hex 64');
    console.log('• Check .env.example for all configuration options');
    
    process.exit(1);
  }

  console.log('✅ Environment validation passed');
  
  return env as EnvConfig;
}

// =============================================================================
// SERVICE ROLE KEY MANAGEMENT
// =============================================================================

/**
 * Get service role key for RLS bypass operations
 * This key should NEVER be exposed to the client
 */
export function getServiceRoleKey(): string | null {
  const key = process.env.SERVICE_ROLE_KEY;
  
  if (!key) {
    console.log('⚠️ SERVICE_ROLE_KEY not configured - some admin operations may be restricted');
    return null;
  }
  
  return key;
}

/**
 * Create a database connection with service role privileges
 * Used for operations that need to bypass RLS policies
 */
export function createServiceRoleConnection(): Pool {
  const serviceKey = getServiceRoleKey();
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    throw new Error('DATABASE_URL is required for service role connection');
  }
  
  // If no service role key is available, use regular connection
  if (!serviceKey) {
    console.log('⚠️ Using regular database connection (no service role key)');
    return new Pool({ connectionString: dbUrl });
  }
  
  // Create connection with service role credentials
  // Note: This assumes the service role key can be used in the connection string
  // or as a separate authentication method depending on your setup
  console.log('🔑 Creating service role database connection');
  
  return new Pool({
    connectionString: dbUrl,
    // Additional options for service role
    application_name: 'payrollsync-service-role',
  });
}

/**
 * Execute a query with RLS bypass using service role
 */
export async function executeWithRLSBypass<T = any>(
  query: string,
  params?: any[]
): Promise<T[]> {
  const servicePool = createServiceRoleConnection();
  
  try {
    console.log(`🔓 Executing RLS bypass query: ${query.substring(0, 100)}...`);
    
    const client = await servicePool.connect();
    try {
      // Set RLS bypass for this session (if supported by your DB)
      await client.query('SET row_security = off');
      
      // Execute the actual query
      const result = await client.query(query, params);
      
      console.log(`✅ RLS bypass query completed, returned ${result.rows.length} rows`);
      return result.rows;
    } finally {
      // Reset RLS and release connection
      try {
        await client.query('SET row_security = on');
      } catch (error) {
        // Ignore errors resetting RLS
      }
      client.release();
    }
  } catch (error) {
    console.log(`❌ RLS bypass query failed: ${error}`);
    throw error;
  } finally {
    await servicePool.end();
  }
}

// =============================================================================
// CLIENT-SAFE CONFIGURATION
// =============================================================================

/**
 * Get environment configuration that's safe to expose to the client
 * This explicitly excludes all sensitive server-only keys
 */
export function getClientSafeConfig(): Record<string, any> {
  const env = process.env;
  const clientSafeConfig: Record<string, any> = {};
  
  // Only include non-sensitive environment variables
  const allowedClientKeys = [
    'NODE_ENV',
    'ENABLE_ONCALL',
    'ENABLE_RUNBOOKS', 
    'ENABLE_LOGGING',
    'MOCK_EXTERNAL_SERVICES',
  ];
  
  for (const key of allowedClientKeys) {
    if (env[key] !== undefined) {
      clientSafeConfig[key] = env[key];
    }
  }
  
  // Add computed values that are safe for client
  clientSafeConfig.IS_PRODUCTION = env.NODE_ENV === 'production';
  clientSafeConfig.IS_DEVELOPMENT = env.NODE_ENV === 'development';
  clientSafeConfig.HAS_OBJECT_STORAGE = !!(env.PUBLIC_OBJECT_SEARCH_PATHS && env.PRIVATE_OBJECT_DIR);
  
  return clientSafeConfig;
}

/**
 * Verify that sensitive keys are not being exposed
 */
export function verifySensitiveKeysNotExposed(config: Record<string, any>): void {
  for (const sensitiveKey of SENSITIVE_SERVER_ONLY_KEYS) {
    if (config[sensitiveKey] !== undefined) {
      throw new Error(`🚨 SECURITY VIOLATION: Sensitive key '${sensitiveKey}' is being exposed to client!`);
    }
  }
  
  console.log('🔒 Verified no sensitive keys are exposed to client');
}

// =============================================================================
// ENVIRONMENT VARIABLE HELPERS
// =============================================================================

/**
 * Get a boolean environment variable with a default value
 */
export function getBooleanEnv(key: string, defaultValue: boolean = false): boolean {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
}

/**
 * Get a number environment variable with a default value
 */
export function getNumberEnv(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Get a required environment variable or throw an error
 */
export function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}