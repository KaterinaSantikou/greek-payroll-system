// Landing page performance optimizations
// Implements sub-2.5s load time and LCP requirements

// Preload critical resources
export const preloadCriticalResources = () => {
  // Preload hero section fonts and images
  const preloadFont = (href: string) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'font';
    link.type = 'font/woff2';
    link.crossOrigin = 'anonymous';
    link.href = href;
    document.head.appendChild(link);
  };

  // Preload critical images
  const preloadImage = (src: string) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;
    document.head.appendChild(link);
  };

  // Preload hero section background and icons
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // Add any critical image preloads here
    });
  }
};

// Intersection Observer for lazy loading sections
export const setupLazyLoading = () => {
  const observerOptions = {
    root: null,
    rootMargin: '50px 0px', // Start loading 50px before entering viewport
    threshold: 0.1
  };

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const target = entry.target as HTMLElement;
        
        // Add fade-in animation
        target.style.opacity = '1';
        target.style.transform = 'translateY(0)';
        
        // Unobserve after loading
        sectionObserver.unobserve(target);
      }
    });
  }, observerOptions);

  // Observe all sections below the fold
  const sections = document.querySelectorAll('[data-lazy-section]');
  sections.forEach(section => {
    const element = section as HTMLElement;
    element.style.opacity = '0';
    element.style.transform = 'translateY(20px)';
    element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    sectionObserver.observe(element);
  });
};

// Critical CSS inlining for above-the-fold content
export const inlineCriticalCSS = () => {
  const criticalCSS = `
    .hero-section {
      background: linear-gradient(135deg, rgb(239 246 255) 0%, rgb(224 231 255) 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .hero-text {
      font-size: clamp(2rem, 5vw, 4rem);
      font-weight: 700;
      line-height: 1.2;
      margin-bottom: 1.5rem;
    }
    
    .hero-cta {
      background: rgb(37 99 235);
      color: white;
      padding: 1rem 2rem;
      border-radius: 0.5rem;
      border: none;
      font-size: 1.125rem;
      font-weight: 600;
      transition: background-color 0.2s;
      cursor: pointer;
    }
    
    .hero-cta:hover {
      background: rgb(29 78 216);
    }
    
    @media (max-width: 640px) {
      .hero-text {
        font-size: 2rem;
        text-align: center;
      }
      
      .hero-cta {
        width: 100%;
        padding: 1.25rem;
      }
    }
  `;

  const style = document.createElement('style');
  style.textContent = criticalCSS;
  document.head.appendChild(style);
};

// Service Worker registration for caching
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('SW registered:', registration);
    } catch (error) {
      console.log('SW registration failed:', error);
    }
  }
};

// Prefetch next likely pages
export const prefetchRoutes = () => {
  const routes = ['/auth/signup', '/auth/login', '/pricing'];
  
  routes.forEach(route => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = route;
    document.head.appendChild(link);
  });
};

// Initialize all optimizations
export const initLandingOptimizations = () => {
  // Run immediately
  preloadCriticalResources();
  inlineCriticalCSS();
  
  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setupLazyLoading();
      prefetchRoutes();
    });
  } else {
    setupLazyLoading();
    prefetchRoutes();
  }
  
  // Register service worker
  window.addEventListener('load', () => {
    registerServiceWorker();
  });
};

// Analytics helper for conversion tracking
export const trackConversion = (event: string, properties: Record<string, any> = {}) => {
  // Google Analytics 4
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', event, {
      event_category: 'landing',
      event_label: properties.label,
      value: properties.value,
      ...properties
    });
  }
  
  // Mixpanel
  if (typeof window !== 'undefined' && (window as any).mixpanel) {
    (window as any).mixpanel.track(event, {
      page: 'landing',
      ...properties
    });
  }
  
  // Facebook Pixel
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('track', event, properties);
  }
};

// Real User Monitoring (RUM) for performance tracking
export const initPerformanceTracking = () => {
  // Web Vitals tracking
  const trackWebVital = (name: string, value: number) => {
    trackConversion('web_vital', { name, value: Math.round(value) });
  };

  // LCP (Largest Contentful Paint)
  const observeLCP = () => {
    let lcp = 0;
    const po = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      lcp = lastEntry.startTime;
      trackWebVital('LCP', lcp);
    });
    po.observe({ entryTypes: ['largest-contentful-paint'] });
  };

  // FID (First Input Delay)
  const observeFID = () => {
    const po = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        const eventEntry = entry as any; // PerformanceEventTiming
        trackWebVital('FID', eventEntry.processingStart - eventEntry.startTime);
      }
    });
    po.observe({ entryTypes: ['first-input'] });
  };

  // CLS (Cumulative Layout Shift)
  const observeCLS = () => {
    let cls = 0;
    const po = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          cls += (entry as any).value;
        }
      }
      trackWebVital('CLS', cls);
    });
    po.observe({ entryTypes: ['layout-shift'] });
  };

  // Initialize all observers
  observeLCP();
  observeFID();
  observeCLS();

  // Track page load time
  window.addEventListener('load', () => {
    const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
    trackWebVital('PLT', loadTime); // Page Load Time
  });
};