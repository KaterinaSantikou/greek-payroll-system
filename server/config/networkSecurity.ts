/**
 * Network Security Configuration
 * Centralized configuration for firewall rules and network policies
 */

export interface NetworkSecurityConfig {
  // Office/trusted internal networks
  officeNetworks: string[];
  
  // Trusted external networks (banks, government)
  trustedExternal: string[];
  
  // Blocked countries
  blockedCountries: string[];
  
  // Blocked IP ranges
  blockedIPRanges: string[];
  
  // Environment-specific settings
  enforceHTTPS: boolean;
  enableGeoBlocking: boolean;
  enableIPWhitelisting: boolean;
  
  // Rate limiting overrides
  rateLimits: {
    basic: { requests: number; window: number };
    auth: { requests: number; window: number };
    payroll: { requests: number; window: number };
  };
}

// Default configuration for development
const developmentConfig: NetworkSecurityConfig = {
  officeNetworks: [
    '127.0.0.1/32',        // Localhost
    '192.168.0.0/16',      // Private networks
    '10.0.0.0/8',
    '172.16.0.0/12'
  ],
  
  trustedExternal: [
    // Add your trusted external IPs here in production
  ],
  
  blockedCountries: [
    // Relaxed for development - add high-risk countries in production
  ],
  
  blockedIPRanges: [
    '0.0.0.0/8',           // Invalid range
    '224.0.0.0/4',         // Multicast range
  ],
  
  enforceHTTPS: false,        // Allow HTTP in development
  enableGeoBlocking: false,   // Disable geo-blocking in dev
  enableIPWhitelisting: false, // Disable strict IP whitelisting in dev
  
  rateLimits: {
    basic: { requests: 1000, window: 15 * 60 * 1000 },    // 1000/15min
    auth: { requests: 50, window: 15 * 60 * 1000 },       // 50/15min  
    payroll: { requests: 100, window: 5 * 60 * 1000 }     // 100/5min
  }
};

// Production configuration
const productionConfig: NetworkSecurityConfig = {
  officeNetworks: [
    // Replace with your actual office network ranges
    '203.0.113.0/24',      // Example office network
    '198.51.100.0/24',     // Example office network 2
  ],
  
  trustedExternal: [
    // Greek banking networks (examples - replace with actual ranges)
    '194.177.192.0/24',    // National Bank of Greece (example)
    '195.251.0.0/16',      // Alpha Bank (example)
    '212.205.0.0/16',      // Piraeus Bank (example)
    
    // Government systems
    '62.75.216.0/24',      // ERGANI II system (example)
    '195.130.105.0/24',    // e-EFKA system (example)
    '83.138.144.0/24',     // AADE tax system (example)
  ],
  
  blockedCountries: [
    'CN', 'RU', 'KP', 'IR', 'SY', 'AF', 'IQ', 'LY', 'YE', 'SO'
  ],
  
  blockedIPRanges: [
    '0.0.0.0/8',           // Invalid range
    '224.0.0.0/4',         // Multicast range
    '240.0.0.0/4',         // Reserved range
    // Add known malicious IP ranges here
  ],
  
  enforceHTTPS: true,         // Enforce HTTPS in production
  enableGeoBlocking: true,    // Enable geo-blocking
  enableIPWhitelisting: true, // Enable IP whitelisting for admin
  
  rateLimits: {
    basic: { requests: 100, window: 15 * 60 * 1000 },     // 100/15min
    auth: { requests: 5, window: 15 * 60 * 1000 },        // 5/15min
    payroll: { requests: 10, window: 5 * 60 * 1000 }      // 10/5min
  }
};

// Test configuration
const testConfig: NetworkSecurityConfig = {
  ...developmentConfig,
  enableGeoBlocking: true,    // Test geo-blocking
  enableIPWhitelisting: true, // Test IP whitelisting
  
  rateLimits: {
    basic: { requests: 10, window: 60 * 1000 },     // 10/min for testing
    auth: { requests: 3, window: 60 * 1000 },       // 3/min for testing
    payroll: { requests: 5, window: 60 * 1000 }     // 5/min for testing
  }
};

// Get configuration based on environment
export function getNetworkSecurityConfig(): NetworkSecurityConfig {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return productionConfig;
    case 'test':
      return testConfig;
    case 'development':
    default:
      return developmentConfig;
  }
}

// Validate network configuration
export function validateNetworkConfig(config: NetworkSecurityConfig): boolean {
  try {
    // Validate CIDR ranges
    const allRanges = [
      ...config.officeNetworks,
      ...config.trustedExternal,
      ...config.blockedIPRanges
    ];
    
    for (const range of allRanges) {
      if (!/^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/.test(range)) {
        console.error(`Invalid CIDR range: ${range}`);
        return false;
      }
    }
    
    // Validate country codes
    for (const country of config.blockedCountries) {
      if (!/^[A-Z]{2}$/.test(country)) {
        console.error(`Invalid country code: ${country}`);
        return false;
      }
    }
    
    // Validate rate limits
    if (config.rateLimits.basic.requests <= 0 || config.rateLimits.basic.window <= 0) {
      console.error('Invalid basic rate limit configuration');
      return false;
    }
    
    console.log('✅ Network security configuration validated successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Network security configuration validation failed:', error);
    return false;
  }
}

// Export current configuration
export const networkConfig = getNetworkSecurityConfig();

// Log configuration on startup
if (process.env.NODE_ENV !== 'test') {
  console.log(`🔒 Network security config loaded for environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   - Office networks: ${networkConfig.officeNetworks.length} ranges`);
  console.log(`   - Trusted external: ${networkConfig.trustedExternal.length} ranges`);
  console.log(`   - Blocked countries: ${networkConfig.blockedCountries.length} countries`);
  console.log(`   - HTTPS enforcement: ${networkConfig.enforceHTTPS ? 'enabled' : 'disabled'}`);
  console.log(`   - Geo-blocking: ${networkConfig.enableGeoBlocking ? 'enabled' : 'disabled'}`);
  console.log(`   - IP whitelisting: ${networkConfig.enableIPWhitelisting ? 'enabled' : 'disabled'}`);
  
  validateNetworkConfig(networkConfig);
}