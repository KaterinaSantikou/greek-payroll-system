/**
 * Production Domain Configuration
 * Handles domain-specific settings and validation for production deployment
 */

export interface DomainConfig {
  productionDomain?: string;
  replitDomain?: string;
  allowedOrigins: string[];
  isProduction: boolean;
  baseUrl: string;
}

export function getDomainConfig(): DomainConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  const productionDomain = process.env.PRODUCTION_DOMAIN;
  const replitDomain = process.env.REPLIT_DOMAIN;
  
  // Build allowed origins list
  const allowedOrigins: string[] = [];
  
  if (productionDomain) {
    allowedOrigins.push(`https://${productionDomain}`);
    allowedOrigins.push(`http://${productionDomain}`);
  }
  
  if (replitDomain) {
    allowedOrigins.push(`https://${replitDomain}`);
  }
  
  // Add Replit automatic domains
  if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    allowedOrigins.push(`https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`);
    allowedOrigins.push(`https://${process.env.REPL_SLUG}--${process.env.REPL_OWNER}.repl.co`);
  }
  
  // Add any additional origins from environment
  if (process.env.ALLOWED_ORIGINS) {
    allowedOrigins.push(...process.env.ALLOWED_ORIGINS.split(','));
  }
  
  // Determine base URL for API calls
  let baseUrl = 'http://localhost:5000';
  if (isProduction) {
    if (productionDomain) {
      baseUrl = `https://${productionDomain}`;
    } else if (replitDomain) {
      baseUrl = `https://${replitDomain}`;
    }
  }
  
  return {
    productionDomain,
    replitDomain,
    allowedOrigins,
    isProduction,
    baseUrl
  };
}

/**
 * Validates if a request is from an allowed domain
 */
export function isAllowedOrigin(origin: string | undefined, host: string | undefined, config: DomainConfig): boolean {
  if (!origin) return true; // Same-origin request
  
  // Check against allowed origins
  if (config.allowedOrigins.includes(origin)) return true;
  
  // Check if origin matches host
  if (host && origin.includes(host)) return true;
  
  // Allow localhost in development
  if (!config.isProduction && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
    return true;
  }
  
  return false;
}

/**
 * Generate deployment-ready environment variables list
 */
export function getDeploymentEnvVars(): Record<string, string> {
  return {
    NODE_ENV: 'production',
    PRODUCTION_DOMAIN: 'your-domain.com',
    REPLIT_DOMAIN: 'your-repl.username.repl.co',
    ALLOWED_ORIGINS: 'https://your-domain.com,https://api.your-domain.com',
    SSL_CERT_PATH: '/etc/ssl/certs/cert.pem',
    SSL_KEY_PATH: '/etc/ssl/private/key.pem',
    HTTPS_PORT: '5443'
  };
}