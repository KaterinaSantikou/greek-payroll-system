/**
 * Performance Optimizer Component
 * Critical performance optimizations for Greek internet speeds
 */

import React, { useEffect, useState } from 'react';
import { usePerformanceOptimization } from '@/hooks/usePerformanceOptimization';

interface PerformanceOptimizerProps {
  children: React.ReactNode;
  enableDevMetrics?: boolean;
}

export default function PerformanceOptimizer({
  children,
  enableDevMetrics = false,
}: PerformanceOptimizerProps) {
  const { metrics, isSlowConnection, getPerformanceRecommendations } =
    usePerformanceOptimization();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simple loading timeout without external dependencies
    const timer = setTimeout(() => setIsLoading(false), 200);
    return () => clearTimeout(timer);
  }, []);

  // Development performance metrics display
  const DevMetrics = () => {
    if (!enableDevMetrics || !metrics) return null;

    const recommendations = getPerformanceRecommendations();

    return (
      <div
        style={{
          position: 'fixed',
          top: 10,
          right: 10,
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '10px',
          fontSize: '12px',
          borderRadius: '4px',
          zIndex: 9999,
          maxWidth: '300px',
        }}
      >
        <div>
          <strong>🇬🇷 Greek Performance Metrics</strong>
        </div>
        <div>FCP: {metrics.firstContentfulPaint.toFixed(0)}ms</div>
        <div>LCP: {metrics.largestContentfulPaint.toFixed(0)}ms</div>
        <div>CLS: {metrics.cumulativeLayoutShift.toFixed(3)}</div>
        <div>Connection: {metrics.effectiveConnectionType}</div>
        {isSlowConnection && (
          <div style={{ color: '#ff6b6b' }}>🐌 Slow connection detected</div>
        )}

        {recommendations.length > 0 && (
          <div style={{ marginTop: '8px', fontSize: '11px' }}>
            <div>
              <strong>Recommendations:</strong>
            </div>
            {recommendations.map((rec, i) => (
              <div key={i}>• {rec}</div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Loading state optimized for Greek connections
  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            className="loading-spinner"
            style={{ margin: '0 auto 16px' }}
          ></div>
          <div style={{ fontSize: '18px', marginBottom: '8px' }}>
            PayrollSync
          </div>
          <div style={{ fontSize: '14px', opacity: 0.8 }}>
            {isSlowConnection
              ? 'Optimizing for Greek internet...'
              : 'Loading...'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
      <DevMetrics />
    </>
  );
}
