/**
 * Environment Variable Validation Utility
 * Validates required environment variables and logs warnings for missing ones
 */

interface EnvConfig {
  required: string[];
  optional: string[];
  sensitive: string[];
}

const ENV_CONFIG: EnvConfig = {
  // Critical environment variables that must be present
  required: [
    'DATABASE_URL',
    'SESSION_SECRET',
    'REPL_ID'
  ],

  // Optional environment variables with fallbacks
  optional: [
    'NODE_ENV',
    'PORT',
    'REPLIT_DOMAINS',
    'ISSUER_URL',
    'AUTH_SMOKE',
    'ENABLE_SECRET_ROTATION',
    'ENABLE_STATUS_MONITORING',
    'ENABLE_SECURITY_CLEANUP',
    'STRICT_AUDIT',
    'AUDIT_HMAC_SECRET',
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
    'OPENAI_API_KEY',
    'GOOGLE_CLOUD_PROJECT_ID',
    'GOOGLE_CLOUD_PRIVATE_KEY_ID',
    'GOOGLE_CLOUD_PRIVATE_KEY',
    'GOOGLE_CLOUD_CLIENT_EMAIL',
    'GOOGLE_CLOUD_CLIENT_ID',
    'ALPHA_BANK_CLIENT_ID',
    'PIRAEUS_BANK_CLIENT_ID',
    'EUROBANK_CLIENT_ID',
    'NBG_CLIENT_ID',
    'ERGANI_API_KEY',
    'EFKA_API_KEY',
    'AADE_API_KEY',
    'DEBUG',
    'LOG_LEVEL'
  ],

  // Sensitive vars that should be masked in logs
  sensitive: [
    'SESSION_SECRET',
    'DATABASE_URL',
    'AUDIT_HMAC_SECRET',
    'SMTP_PASS',
    'OPENAI_API_KEY',
    'GOOGLE_CLOUD_PRIVATE_KEY',
    'ALPHA_BANK_CLIENT_ID',
    'PIRAEUS_BANK_CLIENT_ID',
    'EUROBANK_CLIENT_ID',
    'NBG_CLIENT_ID',
    'ERGANI_API_KEY',
    'EFKA_API_KEY',
    'AADE_API_KEY'
  ]
};

function maskValue(value: string, key: string): string {
  if (!ENV_CONFIG.sensitive.includes(key)) return value;
  if (!value) return 'undefined';
  
  // Special handling for DATABASE_URL
  if (key === 'DATABASE_URL') {
    try {
      const url = new URL(value);
      return `${url.protocol}//${url.username}:***@${url.host}${url.pathname}`;
    } catch {
      return value.length > 20 ? `${value.substring(0, 10)}...${value.slice(-4)}` : '***';
    }
  }
  
  // General masking for other sensitive values
  if (value.length <= 8) return '***';
  return `${value.substring(0, 4)}...${value.slice(-4)}`;
}

export interface ValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
  summary: {
    required: { present: number; total: number };
    optional: { present: number; total: number };
  };
}

export function validateEnvironmentVariables(): ValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  for (const key of ENV_CONFIG.required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  // Check optional variables and log warnings
  const missingOptional: string[] = [];
  for (const key of ENV_CONFIG.optional) {
    if (!process.env[key]) {
      missingOptional.push(key);
    }
  }

  if (missingOptional.length > 0) {
    warnings.push(`Optional environment variables not set: ${missingOptional.join(', ')}`);
  }

  const result: ValidationResult = {
    valid: missing.length === 0,
    missing,
    warnings,
    summary: {
      required: {
        present: ENV_CONFIG.required.length - missing.length,
        total: ENV_CONFIG.required.length
      },
      optional: {
        present: ENV_CONFIG.optional.length - missingOptional.length,
        total: ENV_CONFIG.optional.length
      }
    }
  };

  return result;
}

export function logEnvironmentStatus(): void {
  console.log('[ENV] Starting environment validation...');
  const result = validateEnvironmentVariables();

  console.log('\n🔧 Environment Variable Status:');
  console.log(`   Required: ${result.summary.required.present}/${result.summary.required.total} present`);
  console.log(`   Optional: ${result.summary.optional.present}/${result.summary.optional.total} present`);

  if (!result.valid) {
    console.error('\n❌ Missing REQUIRED environment variables:');
    result.missing.forEach(key => {
      console.error(`   - ${key}: ${maskValue(process.env[key] || '', key)}`);
    });
    console.error('\n💡 Create a .env file or set these in Replit Secrets');
    console.error('   See .env.example for all available configuration options');
  }

  if (result.warnings.length > 0) {
    console.warn('\n⚠️  Environment warnings:');
    result.warnings.forEach(warning => {
      console.warn(`   - ${warning}`);
    });
  }

  // Log present environment variables (masked)
  if (process.env.DEBUG === 'true' || process.env.NODE_ENV !== 'production') {
    console.log('\n📋 Environment variables (masked):');
    [...ENV_CONFIG.required, ...ENV_CONFIG.optional]
      .filter(key => process.env[key])
      .forEach(key => {
        console.log(`   ${key}: ${maskValue(process.env[key]!, key)}`);
      });
  }

  if (result.valid) {
    console.log('✅ All required environment variables present');
  }
  
  console.log(''); // Add spacing
}

/**
 * Get environment variable with validation and fallback
 */
export function getEnvVar(key: string, fallback?: string, required: boolean = false): string {
  const value = process.env[key];
  
  if (!value) {
    if (required) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    if (fallback !== undefined) {
      return fallback;
    }
    console.warn(`[ENV] Missing optional variable ${key}, using undefined`);
    return '';
  }
  
  return value;
}

/**
 * Validate a specific service's environment variables
 */
export function validateServiceEnv(serviceName: string, requiredVars: string[]): boolean {
  const missing = requiredVars.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error(`❌ [${serviceName}] Missing required environment variables: ${missing.join(', ')}`);
    console.error(`   Service may not function properly. Check .env.example for configuration.`);
    return false;
  }
  
  console.log(`✅ [${serviceName}] All required environment variables present`);
  return true;
}