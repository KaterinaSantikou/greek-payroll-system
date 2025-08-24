// =============================================================================
// FEATURE FLAGS SYSTEM - Environment-based UI toggles
// =============================================================================

import React from 'react';

interface BackendHealthCheck {
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  lastCheck: Date;
  services: {
    database: boolean;
    auth: boolean;
    payroll: boolean;
    ergani: boolean;
    notifications: boolean;
  };
}

interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  requiresBackend: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  rolloutPercentage: number;
  dependencies?: string[];
}

/**
 * Feature flags configuration
 */
const FEATURE_FLAGS: Record<string, FeatureFlag> = {
  // High-risk backend-dependent features
  realTimePayrollCalculations: {
    key: 'realTimePayrollCalculations',
    name: 'Real-time Payroll Calculations',
    description: 'Live payroll calculation as user types',
    enabled: false, // Disabled by default - requires stable backend
    requiresBackend: true,
    riskLevel: 'high',
    rolloutPercentage: 0,
    dependencies: ['payrollEngine', 'database']
  },

  erganiIntegration: {
    key: 'erganiIntegration',
    name: 'ΕΡΓΑΝΗ Integration',
    description: 'Live ΕΡΓΑΝΗ submissions and validations',
    enabled: false,
    requiresBackend: true,
    riskLevel: 'high',
    rolloutPercentage: 0,
    dependencies: ['erganiAPI', 'auth']
  },

  bulkEmployeeImport: {
    key: 'bulkEmployeeImport',
    name: 'Bulk Employee Import',
    description: 'CSV/Excel employee data import',
    enabled: false,
    requiresBackend: true,
    riskLevel: 'high',
    rolloutPercentage: 25,
    dependencies: ['fileUpload', 'validation']
  },

  // Medium-risk features
  advancedReporting: {
    key: 'advancedReporting',
    name: 'Advanced Reporting',
    description: 'Complex payroll and compliance reports',
    enabled: true,
    requiresBackend: true,
    riskLevel: 'medium',
    rolloutPercentage: 50,
    dependencies: ['database']
  },

  notificationCenter: {
    key: 'notificationCenter',
    name: 'Notification Center',
    description: 'In-app notifications and alerts',
    enabled: true,
    requiresBackend: true,
    riskLevel: 'medium',
    rolloutPercentage: 75,
    dependencies: ['notifications', 'auth']
  },

  // Low-risk UI-only features
  darkMode: {
    key: 'darkMode',
    name: 'Dark Mode',
    description: 'Dark theme support',
    enabled: true,
    requiresBackend: false,
    riskLevel: 'low',
    rolloutPercentage: 100
  },

  enhancedSearch: {
    key: 'enhancedSearch',
    name: 'Enhanced Search',
    description: 'Advanced search with filters',
    enabled: true,
    requiresBackend: false,
    riskLevel: 'low',
    rolloutPercentage: 100
  },

  mobileOptimizations: {
    key: 'mobileOptimizations',
    name: 'Mobile Optimizations',
    description: 'Enhanced mobile UI/UX',
    enabled: true,
    requiresBackend: false,
    riskLevel: 'low',
    rolloutPercentage: 100
  },

  betaFeatures: {
    key: 'betaFeatures',
    name: 'Beta Features',
    description: 'Experimental features for testing',
    enabled: false,
    requiresBackend: false,
    riskLevel: 'medium',
    rolloutPercentage: 10
  }
};

/**
 * Environment-based feature flag overrides
 */
const ENV_OVERRIDES: Record<string, Partial<Record<string, boolean>>> = {
  development: {
    // Enable all features in development for testing
    realTimePayrollCalculations: true,
    erganiIntegration: false, // Keep risky external integrations off
    bulkEmployeeImport: true,
    advancedReporting: true,
    notificationCenter: true,
    betaFeatures: true
  },
  
  staging: {
    // Conservative staging - only stable features
    realTimePayrollCalculations: false,
    erganiIntegration: false,
    bulkEmployeeImport: true,
    advancedReporting: true,
    notificationCenter: true,
    betaFeatures: false
  },
  
  production: {
    // Production follows rollout percentages
    // No overrides - use default rollout settings
  }
};

class FeatureFlagManager {
  private backendHealth: BackendHealthCheck = {
    status: 'unknown',
    lastCheck: new Date(),
    services: {
      database: false,
      auth: false,
      payroll: false,
      ergani: false,
      notifications: false
    }
  };

  private userId?: string;
  private environment: string = import.meta.env.MODE || 'development';

  constructor() {
    this.checkBackendHealth();
    // Re-check backend health every 30 seconds
    setInterval(() => this.checkBackendHealth(), 30000);
  }

  /**
   * Check if a feature flag is enabled
   */
  isEnabled(flagKey: string, userId?: string): boolean {
    const flag = FEATURE_FLAGS[flagKey];
    if (!flag) {
      console.warn(`[FeatureFlags] Unknown flag: ${flagKey}`);
      return false;
    }

    // Environment override check
    const envOverride = ENV_OVERRIDES[this.environment]?.[flagKey];
    if (envOverride !== undefined) {
      return envOverride;
    }

    // If feature requires backend and backend is not healthy, disable
    if (flag.requiresBackend && this.backendHealth.status !== 'healthy') {
      return false;
    }

    // Check dependencies
    if (flag.dependencies) {
      const dependenciesHealthy = flag.dependencies.every(dep => 
        this.backendHealth.services[dep as keyof typeof this.backendHealth.services]
      );
      if (!dependenciesHealthy) {
        return false;
      }
    }

    // Rollout percentage check (deterministic based on userId or session)
    const rolloutSeed = userId || this.generateSessionSeed();
    const rolloutHash = this.hashString(rolloutSeed + flagKey);
    const rolloutValue = rolloutHash % 100;
    
    return flag.enabled && rolloutValue < flag.rolloutPercentage;
  }

  /**
   * Get all enabled features for current user
   */
  getEnabledFeatures(userId?: string): string[] {
    return Object.keys(FEATURE_FLAGS).filter(key => 
      this.isEnabled(key, userId)
    );
  }

  /**
   * Get feature flag details
   */
  getFlag(flagKey: string): FeatureFlag | undefined {
    return FEATURE_FLAGS[flagKey];
  }

  /**
   * Get backend health status
   */
  getBackendHealth(): BackendHealthCheck {
    return { ...this.backendHealth };
  }

  /**
   * Check backend health status
   */
  private async checkBackendHealth(): Promise<void> {
    try {
      const response = await fetch('/health/ready', { 
        method: 'GET',
        credentials: 'include',
        cache: 'no-cache'
      });

      if (response.ok) {
        const health = await response.json();
        this.backendHealth = {
          status: health.status === 'ready' ? 'healthy' : 'degraded',
          lastCheck: new Date(),
          services: {
            database: health.database || false,
            auth: health.auth || false,
            payroll: health.payroll || false,
            ergani: health.ergani || false,
            notifications: health.notifications || false
          }
        };
      } else {
        this.backendHealth = {
          status: 'down',
          lastCheck: new Date(),
          services: {
            database: false,
            auth: false,
            payroll: false,
            ergani: false,
            notifications: false
          }
        };
      }
    } catch (error) {
      console.warn('[FeatureFlags] Backend health check failed:', error);
      this.backendHealth = {
        status: 'unknown',
        lastCheck: new Date(),
        services: {
          database: false,
          auth: false,
          payroll: false,
          ergani: false,
          notifications: false
        }
      };
    }
  }

  /**
   * Generate deterministic session seed for rollout
   */
  private generateSessionSeed(): string {
    // Use session storage for consistent rollout within session
    let seed = sessionStorage.getItem('feature-flag-seed');
    if (!seed) {
      seed = Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem('feature-flag-seed', seed);
    }
    return seed;
  }

  /**
   * Simple hash function for rollout distribution
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Force refresh backend health (for testing)
   */
  refreshBackendHealth(): Promise<void> {
    return this.checkBackendHealth();
  }

  /**
   * Set user ID for personalized rollouts
   */
  setUserId(userId: string): void {
    this.userId = userId;
  }
}

// Singleton instance
export const featureFlags = new FeatureFlagManager();

/**
 * React hook for feature flags
 */
export function useFeatureFlag(flagKey: string, userId?: string): boolean {
  const [isEnabled, setIsEnabled] = React.useState(
    () => featureFlags.isEnabled(flagKey, userId)
  );

  React.useEffect(() => {
    // Re-check feature flag when backend health changes
    const interval = setInterval(() => {
      const enabled = featureFlags.isEnabled(flagKey, userId);
      setIsEnabled(enabled);
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [flagKey, userId]);

  return isEnabled;
}

/**
 * React hook for backend health
 */
export function useBackendHealth(): BackendHealthCheck {
  const [health, setHealth] = React.useState(
    () => featureFlags.getBackendHealth()
  );

  React.useEffect(() => {
    const interval = setInterval(() => {
      setHealth(featureFlags.getBackendHealth());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return health;
}

// Environment configuration
export const FEATURE_FLAG_CONFIG = {
  environment: import.meta.env.MODE || 'development',
  debugMode: import.meta.env.MODE === 'development',
  refreshInterval: 30000, // 30 seconds
  rolloutRefreshInterval: 5000 // 5 seconds for UI updates
};

export default featureFlags;