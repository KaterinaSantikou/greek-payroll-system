/**
 * React hooks for A/B Testing Framework
 * Provides easy integration with components
 */

import { useState, useEffect, useCallback } from 'react';
import { ABTestManager, type ABTest, type ABVariant } from '@/lib/abTesting';

interface UseABTestOptions {
  testId: string;
  userId?: string;
  defaultVariant?: string;
  onImpression?: () => void;
  onConversion?: (value?: number) => void;
}

interface UseABTestResult {
  variant: ABVariant | null;
  isLoading: boolean;
  trackImpression: () => void;
  trackConversion: (value?: number) => void;
  isInTest: boolean;
}

export function useABTest({
  testId,
  userId = 'anonymous',
  defaultVariant,
  onImpression,
  onConversion,
}: UseABTestOptions): UseABTestResult {
  const [variant, setVariant] = useState<ABVariant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasTrackedImpression, setHasTrackedImpression] = useState(false);

  useEffect(() => {
    const test = ABTestManager.getTest(testId);
    if (!test) {
      setIsLoading(false);
      return;
    }

    const assignedVariantId = ABTestManager.assignVariant(testId, userId);

    if (assignedVariantId) {
      const assignedVariant = test.variants.find(
        v => v.id === assignedVariantId
      );
      setVariant(assignedVariant || null);
    } else if (defaultVariant) {
      const defaultVar = test.variants.find(v => v.id === defaultVariant);
      setVariant(defaultVar || null);
    }

    setIsLoading(false);
  }, [testId, userId, defaultVariant]);

  const trackImpression = useCallback(() => {
    if (!variant || hasTrackedImpression) return;

    ABTestManager.trackEvent({
      testId,
      variantId: variant.id,
      userId,
      sessionId: getSessionId(),
      eventType: 'impression',
    });

    setHasTrackedImpression(true);
    onImpression?.();
  }, [testId, variant, userId, hasTrackedImpression, onImpression]);

  const trackConversion = useCallback(
    (value?: number) => {
      if (!variant) return;

      ABTestManager.trackEvent({
        testId,
        variantId: variant.id,
        userId,
        sessionId: getSessionId(),
        eventType: 'conversion',
        eventValue: value,
      });

      onConversion?.(value);
    },
    [testId, variant, userId, onConversion]
  );

  // Auto-track impression when variant is assigned and component mounts
  useEffect(() => {
    if (variant && !hasTrackedImpression) {
      trackImpression();
    }
  }, [variant, trackImpression, hasTrackedImpression]);

  return {
    variant,
    isLoading,
    trackImpression,
    trackConversion,
    isInTest: !!variant,
  };
}

// Hook for managing multiple A/B tests
export function useMultipleABTests(
  testConfigs: UseABTestOptions[]
): Record<string, UseABTestResult> {
  const results: Record<string, UseABTestResult> = {};

  testConfigs.forEach(config => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    results[config.testId] = useABTest(config);
  });

  return results;
}

// Hook for A/B test management (admin interface)
export function useABTestManager() {
  const [tests, setTests] = useState<ABTest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load tests from storage
    const allTests = ABTestManager.getAllTests();
    setTests(allTests);
    setIsLoading(false);
  }, []);

  const createTest = useCallback(
    (testData: Omit<ABTest, 'id' | 'createdAt' | 'updatedAt'>) => {
      const newTest = ABTestManager.createTest(testData);
      setTests(prev => [...prev, newTest]);
      return newTest;
    },
    []
  );

  const startTest = useCallback((testId: string) => {
    const success = ABTestManager.startTest(testId);
    if (success) {
      setTests(prev =>
        prev.map(test =>
          test.id === testId
            ? {
                ...test,
                status: 'running',
                startDate: new Date().toISOString(),
              }
            : test
        )
      );
    }
    return success;
  }, []);

  const stopTest = useCallback((testId: string) => {
    const success = ABTestManager.stopTest(testId);
    if (success) {
      setTests(prev =>
        prev.map(test =>
          test.id === testId
            ? {
                ...test,
                status: 'completed',
                endDate: new Date().toISOString(),
              }
            : test
        )
      );
    }
    return success;
  }, []);

  const getTestResults = useCallback((testId: string) => {
    return ABTestManager.getTestResults(testId);
  }, []);

  const refreshTests = useCallback(() => {
    const allTests = ABTestManager.getAllTests();
    setTests(allTests);
  }, []);

  return {
    tests,
    isLoading,
    createTest,
    startTest,
    stopTest,
    getTestResults,
    refreshTests,
  };
}

// Utility function to get or create session ID
function getSessionId(): string {
  let sessionId = sessionStorage.getItem('ab-test-session-id');
  if (!sessionId) {
    sessionId = Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem('ab-test-session-id', sessionId);
  }
  return sessionId;
}
