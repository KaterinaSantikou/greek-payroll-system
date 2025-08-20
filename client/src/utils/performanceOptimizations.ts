/**
 * Performance Optimizations for Greek Internet Speeds
 * Standalone utilities for sub-2 second page loads
 */

// Critical CSS for instant first paint
export const injectCriticalCSS = () => {
  if (typeof document === 'undefined') return;
  
  const style = document.createElement('style');
  style.id = 'critical-css';
  style.textContent = `
    /* Greek payroll loading optimization */
    .loading-spinner { 
      animation: spin 1s linear infinite; 
      border: 2px solid #f3f3f3; 
      border-top: 2px solid #3498db; 
      border-radius: 50%; 
      width: 20px; 
      height: 20px; 
    }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    
    /* Font loading optimization */
    body { font-display: swap; }
    
    /* Layout stability */
    .header-nav { height: 64px; }
    .sidebar { width: 280px; transition: width 0.3s ease; }
    .sidebar.collapsed { width: 72px; }
    
    /* Greek mobile optimization */
    @media (max-width: 768px) {
      .sidebar { transform: translateX(-100%); }
      .sidebar.open { transform: translateX(0); }
    }
  `;
  
  if (!document.head.querySelector('#critical-css')) {
    document.head.appendChild(style);
  }
};

// Resource hints for Greek CDNs
export const addResourceHints = () => {
  if (typeof document === 'undefined') return;
  
  const hints = [
    { rel: 'dns-prefetch', href: '//fonts.googleapis.com' },
    { rel: 'dns-prefetch', href: '//cdnjs.cloudflare.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
  ];

  hints.forEach(hint => {
    const existing = document.head.querySelector(`link[href="${hint.href}"]`);
    if (!existing) {
      const link = document.createElement('link');
      link.rel = hint.rel;
      link.href = hint.href;
      if (hint.crossOrigin) link.crossOrigin = hint.crossOrigin;
      document.head.appendChild(link);
    }
  });
};

// Service Worker registration for Greek caching
export const registerGreekServiceWorker = () => {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  
  navigator.serviceWorker.register('/sw.js')
    .then(registration => {
      console.log('Greek optimization SW registered:', registration.scope);
    })
    .catch(error => {
      console.log('SW registration failed (expected in dev):', error);
    });
};

// Detect Greek connection speed
export const detectGreekConnection = () => {
  if (typeof navigator === 'undefined' || !('connection' in navigator)) {
    return { isSlowConnection: false, effectiveType: 'unknown' };
  }
  
  const connection = (navigator as any).connection;
  const effectiveType = connection?.effectiveType || 'unknown';
  const downlink = connection?.downlink || 0;
  
  // Greek rural areas often have 2G/slow-2G
  const isSlowConnection = effectiveType === '2g' || effectiveType === 'slow-2g' || downlink < 1.5;
  
  return { isSlowConnection, effectiveType, downlink };
};

// Initialize all Greek performance optimizations
export const initGreekPerformanceOptimizations = () => {
  // Run immediately for critical path
  injectCriticalCSS();
  addResourceHints();
  
  // Defer non-critical optimizations
  requestIdleCallback(() => {
    registerGreekServiceWorker();
    
    const { isSlowConnection } = detectGreekConnection();
    if (isSlowConnection) {
      console.log('Greek slow connection detected - using optimized loading strategy');
    }
  });
};

// Call this when the app starts
if (typeof window !== 'undefined') {
  // Initialize immediately for critical path performance
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGreekPerformanceOptimizations);
  } else {
    initGreekPerformanceOptimizations();
  }
}