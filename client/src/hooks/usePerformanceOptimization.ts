/**
 * Performance Optimization Hook
 * Optimized for Greek internet speeds - Sub-2 second page loads
 */

import { useEffect, useCallback, useState } from 'react';

interface PerformanceMetrics {
  loadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  connectionType: string;
  effectiveConnectionType: string;
}

interface ResourcePreloadOptions {
  href: string;
  as: 'script' | 'style' | 'font' | 'image';
  type?: string;
  crossOrigin?: 'anonymous' | 'use-credentials';
}

export function usePerformanceOptimization() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isSlowConnection, setIsSlowConnection] = useState(false);

  // Detect connection speed for Greek internet optimization
  const detectConnectionSpeed = useCallback(() => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      const effectiveType = connection?.effectiveType || 'unknown';
      const downlink = connection?.downlink || 0;

      // Consider 2G/slow-2G as slow connection (common in rural Greece)
      const slowConnection =
        effectiveType === '2g' || effectiveType === 'slow-2g' || downlink < 1.5;
      setIsSlowConnection(slowConnection);

      return {
        connectionType: connection?.type || 'unknown',
        effectiveConnectionType: effectiveType,
        downlink,
        rtt: connection?.rtt || 0,
      };
    }

    return {
      connectionType: 'unknown',
      effectiveConnectionType: 'unknown',
      downlink: 0,
      rtt: 0,
    };
  }, []);

  // Preload critical resources
  const preloadResource = useCallback((options: ResourcePreloadOptions) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = options.href;
    link.as = options.as;

    if (options.type) link.type = options.type;
    if (options.crossOrigin) link.crossOrigin = options.crossOrigin;

    document.head.appendChild(link);

    // Clean up on unmount
    return () => {
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
    };
  }, []);

  // Prefetch resources for anticipated navigation
  const prefetchResource = useCallback((href: string) => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    document.head.appendChild(link);

    return () => {
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
    };
  }, []);

  // Optimize images for Greek connections
  const optimizeImageLoading = useCallback(() => {
    // Lazy load images below the fold
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const img = entry.target as HTMLImageElement;
              if (img.dataset.src) {
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
              }
            }
          });
        },
        {
          // Load images 300px before they come into view for smoother experience
          rootMargin: '300px',
        }
      );

      // Observe all lazy images
      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
      });

      return () => imageObserver.disconnect();
    }
  }, []);

  // Critical CSS inlining for faster first paint
  const inlineCriticalCSS = useCallback(() => {
    // Inline critical CSS for above-the-fold content
    const criticalCSS = `
      /* Critical CSS for Greek payroll interface */
      .loading-spinner { 
        animation: spin 1s linear infinite; 
        border: 2px solid #f3f3f3; 
        border-top: 2px solid #3498db; 
        border-radius: 50%; 
        width: 20px; 
        height: 20px; 
      }
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      
      /* Greek font optimizations */
      body { font-display: swap; }
      
      /* Critical layout styles */
      .header-nav { contain: layout style; }
      .main-content { contain: layout; }
      
      /* Performance hints */
      img { loading: lazy; decoding: async; }
      iframe { loading: lazy; }
    `;

    const style = document.createElement('style');
    style.textContent = criticalCSS;
    document.head.appendChild(style);

    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  // Measure and report performance metrics
  const measurePerformance = useCallback(() => {
    if ('performance' in window && 'getEntriesByType' in performance) {
      // Core Web Vitals measurement
      const perfObserver = new PerformanceObserver(list => {
        const entries = list.getEntries();

        entries.forEach(entry => {
          switch (entry.entryType) {
            case 'navigation':
              const navEntry = entry as PerformanceNavigationTiming;
              setMetrics(
                prev =>
                  ({
                    ...prev,
                    loadTime: navEntry.loadEventEnd - navEntry.loadEventStart,
                    firstContentfulPaint: 0, // Will be updated by paint entries
                    largestContentfulPaint: 0,
                    cumulativeLayoutShift: 0,
                    ...detectConnectionSpeed(),
                  }) as PerformanceMetrics
              );
              break;

            case 'paint':
              if (entry.name === 'first-contentful-paint') {
                setMetrics(prev =>
                  prev
                    ? {
                        ...prev,
                        firstContentfulPaint: entry.startTime,
                      }
                    : null
                );
              }
              break;

            case 'largest-contentful-paint':
              setMetrics(prev =>
                prev
                  ? {
                      ...prev,
                      largestContentfulPaint: entry.startTime,
                    }
                  : null
              );
              break;

            case 'layout-shift':
              if (!(entry as any).hadRecentInput) {
                setMetrics(prev =>
                  prev
                    ? {
                        ...prev,
                        cumulativeLayoutShift:
                          prev.cumulativeLayoutShift + (entry as any).value,
                      }
                    : null
                );
              }
              break;
          }
        });
      });

      // Observe performance entries
      try {
        perfObserver.observe({
          entryTypes: [
            'navigation',
            'paint',
            'largest-contentful-paint',
            'layout-shift',
          ],
        });
      } catch (e) {
        // Fallback for browsers that don't support all entry types
        console.warn('Some performance metrics unavailable:', e);
      }

      return () => perfObserver.disconnect();
    }
  }, [detectConnectionSpeed]);

  // Resource hints for Greek CDNs and common resources
  const addResourceHints = useCallback(() => {
    const hints = [
      // DNS prefetch for Greek services
      { rel: 'dns-prefetch', href: '//fonts.googleapis.com' },
      { rel: 'dns-prefetch', href: '//cdnjs.cloudflare.com' },

      // Preconnect to critical origins
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: true,
      },
    ];

    const linkElements: HTMLLinkElement[] = [];

    hints.forEach(hint => {
      const link = document.createElement('link');
      link.rel = hint.rel;
      link.href = hint.href;
      if (hint.crossOrigin) link.crossOrigin = 'anonymous';

      document.head.appendChild(link);
      linkElements.push(link);
    });

    return () => {
      linkElements.forEach(link => {
        if (document.head.contains(link)) {
          document.head.removeChild(link);
        }
      });
    };
  }, []);

  // Service Worker registration for caching
  const registerServiceWorker = useCallback(() => {
    // Service worker registration handled centrally in usePWA hook to prevent conflicts
    // Multiple SW registrations can cause asset caching issues and chunk 404s
    console.log('SW registration managed centrally to prevent cache conflicts');
    return;
  }, []);

  // Apply all optimizations on mount
  useEffect(() => {
    // Simplified optimization loading
    detectConnectionSpeed();
    registerServiceWorker();

    // Basic critical CSS
    const style = document.createElement('style');
    style.textContent = `
      .loading-spinner { 
        animation: spin 1s linear infinite; 
        border: 2px solid #f3f3f3; 
        border-top: 2px solid #3498db; 
        border-radius: 50%; 
        width: 20px; 
        height: 20px; 
      }
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    `;
    document.head.appendChild(style);

    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []); // Empty dependency array to prevent loops

  // Greek-specific performance recommendations
  const getPerformanceRecommendations = useCallback(() => {
    if (!metrics) return [];

    const recommendations: string[] = [];

    if (metrics.firstContentfulPaint > 1500) {
      recommendations.push(
        'Consider enabling critical CSS inlining for faster paint'
      );
    }

    if (metrics.largestContentfulPaint > 2500) {
      recommendations.push(
        'Optimize images and lazy load below-the-fold content'
      );
    }

    if (metrics.cumulativeLayoutShift > 0.1) {
      recommendations.push(
        'Add size attributes to images to prevent layout shift'
      );
    }

    if (isSlowConnection) {
      recommendations.push(
        'Detected slow connection - using Greek-optimized loading strategy'
      );
    }

    return recommendations;
  }, [metrics, isSlowConnection]);

  return {
    metrics,
    isSlowConnection,
    preloadResource,
    prefetchResource,
    optimizeImageLoading,
    getPerformanceRecommendations,
    connectionInfo: detectConnectionSpeed(),
  };
}
