import React, { createContext, useContext, useEffect, useState } from 'react';
import { featureFlags, useFeatureFlag, useBackendHealth } from '@/lib/featureFlags';
import type { BackendHealthCheck } from '@/lib/featureFlags';

interface FeatureFlagContextType {
  isEnabled: (flagKey: string) => boolean;
  backendHealth: BackendHealthCheck;
  refreshHealth: () => void;
  enabledFeatures: string[];
}

const FeatureFlagContext = createContext<FeatureFlagContextType | undefined>(undefined);

interface FeatureFlagProviderProps {
  children: React.ReactNode;
  userId?: string;
}

export function FeatureFlagProvider({ children, userId }: FeatureFlagProviderProps) {
  const backendHealth = useBackendHealth();
  const [enabledFeatures, setEnabledFeatures] = useState<string[]>([]);

  useEffect(() => {
    if (userId) {
      featureFlags.setUserId(userId);
    }
    
    // Update enabled features list
    const updateFeatures = () => {
      const features = featureFlags.getEnabledFeatures(userId);
      setEnabledFeatures(features);
    };
    
    updateFeatures();
    
    // Refresh every 10 seconds
    const interval = setInterval(updateFeatures, 10000);
    return () => clearInterval(interval);
  }, [userId]);

  const isEnabled = (flagKey: string) => {
    return featureFlags.isEnabled(flagKey, userId);
  };

  const refreshHealth = async () => {
    await featureFlags.refreshBackendHealth();
  };

  const contextValue: FeatureFlagContextType = {
    isEnabled,
    backendHealth,
    refreshHealth,
    enabledFeatures,
  };

  return (
    <FeatureFlagContext.Provider value={contextValue}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

export function useFeatureFlags(): FeatureFlagContextType {
  const context = useContext(FeatureFlagContext);
  if (context === undefined) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagProvider');
  }
  return context;
}

// Convenience hook for specific feature flags
export function useFeature(flagKey: string): boolean {
  const { isEnabled } = useFeatureFlags();
  return isEnabled(flagKey);
}

// Component wrapper for conditional feature rendering
interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showDebug?: boolean;
}

export function FeatureGate({ feature, children, fallback = null, showDebug = false }: FeatureGateProps) {
  const isEnabled = useFeature(feature);
  const { backendHealth } = useFeatureFlags();

  if (!isEnabled) {
    if (showDebug && process.env.NODE_ENV === 'development') {
      return (
        <div className="p-4 border border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
          <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            🚧 Feature Disabled: {feature}
          </div>
          <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
            Backend Status: {backendHealth.status} | 
            Last Check: {backendHealth.lastCheck.toLocaleTimeString()}
          </div>
          {fallback && (
            <div className="mt-2 border-t border-yellow-300 pt-2">
              {fallback}
            </div>
          )}
        </div>
      );
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Backend health indicator component
export function BackendHealthIndicator() {
  const { backendHealth, refreshHealth } = useFeatureFlags();
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 dark:text-green-400';
      case 'degraded': return 'text-yellow-600 dark:text-yellow-400';
      case 'down': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '●';
      case 'degraded': return '◐';
      case 'down': return '○';
      default: return '?';
    }
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`${getStatusColor(backendHealth.status)} font-mono`}>
        {getStatusIcon(backendHealth.status)}
      </span>
      <span className="text-gray-700 dark:text-gray-300">
        Backend: {backendHealth.status}
      </span>
      <button
        onClick={refreshHealth}
        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        data-testid="button-refresh-health"
      >
        Refresh
      </button>
    </div>
  );
}