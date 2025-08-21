/**
 * Environment Variable Management System
 * Validates, loads, and manages all environment variables for production deployment
 */

export interface EnvironmentConfig {
  // Core Application
  NODE_ENV: 'development' | 'production' | 'staging';
  PORT: number;
  
  // Database
  DATABASE_URL: string;
  
  // Authentication & Security
  SESSION_SECRET: string;
  JWT_SECRET: string;
  MFA_ISSUER?: string;
  
  // Domain Configuration
  PRODUCTION_DOMAIN?: string;
  REPLIT_DOMAIN?: string;
  ALLOWED_ORIGINS?: string;
  
  // SSL/TLS
  SSL_CERT_PATH?: string;
  SSL_KEY_PATH?: string;
  HTTPS_PORT?: number;
  
  // Greek Government Systems
  ERGANI_API_KEY?: string;
  ERGANI_BASE_URL?: string;
  AADE_API_KEY?: string;
  EFKA_API_KEY?: string;
  
  // Email & Communications
  SMTP_HOST?: string;
  SMTP_PORT?: number;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SENDGRID_API_KEY?: string;
  
  // External Services
  GOOGLE_CLOUD_PROJECT_ID?: string;
  GOOGLE_CLOUD_KEY_FILE?: string;
  STRIPE_SECRET_KEY?: string;
  SLACK_BOT_TOKEN?: string;
  
  // Monitoring & Logging
  LOG_LEVEL?: string;
  SENTRY_DSN?: string;
  
  // Feature Flags
  ENABLE_ANALYTICS?: boolean;
  ENABLE_MONITORING?: boolean;
  ENABLE_COMPLIANCE_ALERTS?: boolean;
}

/**
 * Required environment variables that must be set for the application to function
 */
const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'SESSION_SECRET'
] as const;

/**
 * Required environment variables specifically for production
 */
const PRODUCTION_REQUIRED_ENV_VARS = [
  'JWT_SECRET',
  'NODE_ENV'
] as const;

/**
 * Load and validate environment variables
 */
export function loadEnvironmentConfig(): EnvironmentConfig {
  const env = process.env;
  const isProduction = env.NODE_ENV === 'production';
  
  // Validate required variables
  const missingRequired = REQUIRED_ENV_VARS.filter(key => !env[key]);
  if (missingRequired.length > 0) {
    throw new Error(`Missing required environment variables: ${missingRequired.join(', ')}`);
  }
  
  // Validate production-specific variables
  if (isProduction) {
    const missingProduction = PRODUCTION_REQUIRED_ENV_VARS.filter(key => !env[key]);
    if (missingProduction.length > 0) {
      console.warn(`⚠️ Missing production environment variables: ${missingProduction.join(', ')}`);
    }
  }
  
  return {
    // Core Application
    NODE_ENV: (env.NODE_ENV as any) || 'development',
    PORT: parseInt(env.PORT || '5000', 10),
    
    // Database
    DATABASE_URL: env.DATABASE_URL!,
    
    // Authentication & Security
    SESSION_SECRET: env.SESSION_SECRET!,
    JWT_SECRET: env.JWT_SECRET || generateFallbackSecret(),
    MFA_ISSUER: env.MFA_ISSUER || 'PayrollSync',
    
    // Domain Configuration
    PRODUCTION_DOMAIN: env.PRODUCTION_DOMAIN,
    REPLIT_DOMAIN: env.REPLIT_DOMAIN,
    ALLOWED_ORIGINS: env.ALLOWED_ORIGINS,
    
    // SSL/TLS
    SSL_CERT_PATH: env.SSL_CERT_PATH,
    SSL_KEY_PATH: env.SSL_KEY_PATH,
    HTTPS_PORT: env.HTTPS_PORT ? parseInt(env.HTTPS_PORT, 10) : undefined,
    
    // Greek Government Systems
    ERGANI_API_KEY: env.ERGANI_API_KEY,
    ERGANI_BASE_URL: env.ERGANI_BASE_URL || 'https://api.ergani.gov.gr',
    AADE_API_KEY: env.AADE_API_KEY,
    EFKA_API_KEY: env.EFKA_API_KEY,
    
    // Email & Communications
    SMTP_HOST: env.SMTP_HOST,
    SMTP_PORT: env.SMTP_PORT ? parseInt(env.SMTP_PORT, 10) : undefined,
    SMTP_USER: env.SMTP_USER,
    SMTP_PASS: env.SMTP_PASS,
    SENDGRID_API_KEY: env.SENDGRID_API_KEY,
    
    // External Services
    GOOGLE_CLOUD_PROJECT_ID: env.GOOGLE_CLOUD_PROJECT_ID,
    GOOGLE_CLOUD_KEY_FILE: env.GOOGLE_CLOUD_KEY_FILE,
    STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY,
    SLACK_BOT_TOKEN: env.SLACK_BOT_TOKEN,
    
    // Monitoring & Logging
    LOG_LEVEL: env.LOG_LEVEL || 'info',
    SENTRY_DSN: env.SENTRY_DSN,
    
    // Feature Flags
    ENABLE_ANALYTICS: env.ENABLE_ANALYTICS === 'true',
    ENABLE_MONITORING: env.ENABLE_MONITORING !== 'false', // Default true
    ENABLE_COMPLIANCE_ALERTS: env.ENABLE_COMPLIANCE_ALERTS !== 'false' // Default true
  };
}

/**
 * Generate a fallback JWT secret for development (not for production use)
 */
function generateFallbackSecret(): string {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production environment');
  }
  
  console.warn('⚠️ Using generated JWT_SECRET for development. Set JWT_SECRET environment variable for production.');
  return 'dev-jwt-secret-' + Math.random().toString(36).substr(2, 9);
}

/**
 * Get environment-specific configuration
 */
export function getEnvironmentInfo() {
  const config = loadEnvironmentConfig();
  
  return {
    environment: config.NODE_ENV,
    isProduction: config.NODE_ENV === 'production',
    isDevelopment: config.NODE_ENV === 'development',
    port: config.PORT,
    domain: config.PRODUCTION_DOMAIN || config.REPLIT_DOMAIN,
    hasSSL: !!(config.SSL_CERT_PATH && config.SSL_KEY_PATH),
    features: {
      analytics: config.ENABLE_ANALYTICS,
      monitoring: config.ENABLE_MONITORING,
      complianceAlerts: config.ENABLE_COMPLIANCE_ALERTS
    }
  };
}

/**
 * Validate environment configuration at startup
 */
export function validateEnvironment(): void {
  try {
    const config = loadEnvironmentConfig();
    const envInfo = getEnvironmentInfo();
    
    console.log(`🔧 Environment: ${envInfo.environment}`);
    console.log(`🌐 Domain: ${envInfo.domain || 'localhost'}`);
    console.log(`🔒 SSL: ${envInfo.hasSSL ? 'Configured' : 'Not configured'}`);
    
    if (envInfo.isProduction) {
      console.log('🔍 Production Environment Validation:');
      console.log(`   ${config.JWT_SECRET.startsWith('dev-') ? '❌' : '✅'} JWT Secret: ${config.JWT_SECRET.startsWith('dev-') ? 'Use production secret' : 'Configured'}`);
      console.log(`   ${config.PRODUCTION_DOMAIN ? '✅' : '⚠️'} Production Domain: ${config.PRODUCTION_DOMAIN || 'Set PRODUCTION_DOMAIN'}`);
      console.log(`   ${config.ERGANI_API_KEY ? '✅' : '⚠️'} ERGANI API: ${config.ERGANI_API_KEY ? 'Configured' : 'Set for compliance'}`);
      console.log(`   ${config.SMTP_HOST || config.SENDGRID_API_KEY ? '✅' : '⚠️'} Email Service: ${config.SMTP_HOST || config.SENDGRID_API_KEY ? 'Configured' : 'Configure SMTP or SendGrid'}`);
    }
    
  } catch (error) {
    console.error('❌ Environment validation failed:', error);
    throw error;
  }
}

// Global environment configuration instance
export const envConfig = loadEnvironmentConfig();