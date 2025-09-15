/**
 * A/B Test Component - Wrapper for easy A/B testing of any component
 */

import React from 'react';
import { useABTest } from '@/hooks/useABTest';
import { useABTestContext } from '@/components/ABTestProvider';

interface ABTestComponentProps {
  testId: string;
  children:
    | React.ReactNode
    | ((props: {
        variant?: any;
        trackConversion?: (value?: number) => void;
        isInTest: boolean;
      }) => React.ReactNode);
  fallback?: React.ReactNode;
  onImpression?: () => void;
  onConversion?: (value?: number) => void;
}

export function ABTestComponent({
  testId,
  children,
  fallback,
  onImpression,
  onConversion,
}: ABTestComponentProps) {
  const { getUserId } = useABTestContext();
  const { variant, isLoading, trackConversion, isInTest } = useABTest({
    testId,
    userId: getUserId(),
    onImpression,
    onConversion,
  });

  if (isLoading) {
    return fallback ? <>{fallback}</> : null;
  }

  if (!isInTest || !variant) {
    return fallback ? <>{fallback}</> : null;
  }

  // Pass variant config and tracking functions to children
  const childProps = {
    variant: variant.config,
    trackConversion,
    isInTest: true,
  };

  return (
    <div data-ab-test={testId} data-ab-variant={variant.id}>
      {typeof children === 'function'
        ? (children as (props: typeof childProps) => React.ReactNode)(
            childProps
          )
        : children}
    </div>
  );
}

// Higher-order component for A/B testing
export function withABTest<P extends object>(
  Component: React.ComponentType<P>,
  testId: string,
  fallbackComponent?: React.ComponentType<P>
) {
  return function ABTestedComponent(props: P) {
    const { getUserId } = useABTestContext();
    const { variant, isLoading, trackConversion, isInTest } = useABTest({
      testId,
      userId: getUserId(),
    });

    if (isLoading) {
      return fallbackComponent ? <fallbackComponent {...props} /> : null;
    }

    if (!isInTest || !variant) {
      return fallbackComponent ? <fallbackComponent {...props} /> : null;
    }

    const enhancedProps = {
      ...props,
      abTestVariant: variant.config,
      trackConversion,
    } as P & { abTestVariant: any; trackConversion: (value?: number) => void };

    return <Component {...enhancedProps} />;
  };
}
