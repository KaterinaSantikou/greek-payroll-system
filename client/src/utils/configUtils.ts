/**
 * Client Configuration Utilities
 * 
 * Safely fetches server configuration that's appropriate for client use.
 * No sensitive server-only data is ever exposed to the client.
 */

interface ClientConfig {
  NODE_ENV: string;
  ENABLE_ONCALL?: boolean;
  ENABLE_RUNBOOKS?: boolean;
  ENABLE_LOGGING?: boolean;
  MOCK_EXTERNAL_SERVICES?: boolean;
  IS_PRODUCTION: boolean;
  IS_DEVELOPMENT: boolean;
  HAS_OBJECT_STORAGE: boolean;
}

interface ConfigResponse {
  success: boolean;
  config: ClientConfig;
  timestamp: string;
  error?: string;
  message?: string;
}

let cachedConfig: ClientConfig | null = null;
let configFetchTime: number = 0;
const CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch client-safe configuration from the server
 * Results are cached for 5 minutes to reduce server load
 */
export async function fetchClientConfig(): Promise<ClientConfig> {
  const now = Date.now();
  
  // Return cached config if still valid
  if (cachedConfig && (now - configFetchTime) < CONFIG_CACHE_TTL) {
    return cachedConfig;
  }
  
  try {
    const response = await fetch('/api/config', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data: ConfigResponse = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch configuration');
    }
    
    // Cache the successful response
    cachedConfig = data.config;
    configFetchTime = now;
    
    return data.config;
    
  } catch (error) {
    console.error('Failed to fetch client config:', error);
    
    // Return fallback configuration if server request fails
    const fallbackConfig: ClientConfig = {
      NODE_ENV: 'development',
      ENABLE_ONCALL: false,
      ENABLE_RUNBOOKS: false,
      ENABLE_LOGGING: true,
      MOCK_EXTERNAL_SERVICES: true,
      IS_PRODUCTION: false,
      IS_DEVELOPMENT: true,
      HAS_OBJECT_STORAGE: false,
    };
    
    return fallbackConfig;
  }
}

/**
 * Get a specific configuration value with a fallback
 */
export async function getConfigValue<K extends keyof ClientConfig>(
  key: K,
  fallback: ClientConfig[K]
): Promise<ClientConfig[K]> {
  try {
    const config = await fetchClientConfig();
    return config[key] ?? fallback;
  } catch (error) {
    console.warn(`Failed to get config value '${key}', using fallback:`, fallback);
    return fallback;
  }
}

/**
 * Check if a feature is enabled
 */
export async function isFeatureEnabled(feature: string): Promise<boolean> {
  try {
    const config = await fetchClientConfig();
    
    switch (feature.toLowerCase()) {
      case 'oncall':
        return config.ENABLE_ONCALL === true;
      case 'runbooks':
        return config.ENABLE_RUNBOOKS === true;
      case 'logging':
        return config.ENABLE_LOGGING === true;
      case 'object-storage':
      case 'objectstorage':
        return config.HAS_OBJECT_STORAGE === true;
      case 'mock-services':
      case 'mockservices':
        return config.MOCK_EXTERNAL_SERVICES === true;
      default:
        console.warn(`Unknown feature: ${feature}`);
        return false;
    }
  } catch (error) {
    console.warn(`Failed to check feature '${feature}', assuming disabled`);
    return false;
  }
}

/**
 * Check if we're running in production
 */
export async function isProduction(): Promise<boolean> {
  return getConfigValue('IS_PRODUCTION', false);
}

/**
 * Check if we're running in development
 */
export async function isDevelopment(): Promise<boolean> {
  return getConfigValue('IS_DEVELOPMENT', true);
}

/**
 * Clear cached configuration (useful for testing or when config changes)
 */
export function clearConfigCache(): void {
  cachedConfig = null;
  configFetchTime = 0;
}

/**
 * Hook for React components to use configuration
 */
export function useClientConfig() {
  const [config, setConfig] = React.useState<ClientConfig | null>(cachedConfig);
  const [loading, setLoading] = React.useState(!cachedConfig);
  const [error, setError] = React.useState<string | null>(null);
  
  React.useEffect(() => {
    let mounted = true;
    
    fetchClientConfig()
      .then((fetchedConfig) => {
        if (mounted) {
          setConfig(fetchedConfig);
          setError(null);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });
    
    return () => {
      mounted = false;
    };
  }, []);
  
  return { config, loading, error };
}

// Note: React import would be added by the build system
declare const React: any;