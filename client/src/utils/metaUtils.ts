// =============================================================================
// META TAGS & OPEN GRAPH UTILITIES - Client-side
// =============================================================================

export interface PageMetaConfig {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  siteName?: string;
  locale?: string;
  keywords?: string[];
  author?: string;
  noIndex?: boolean;
}

/**
 * Update page meta tags dynamically (client-side)
 */
export function updatePageMeta(config: PageMetaConfig): void {
  const {
    title = 'PayrollSync - Greek HR & Payroll Management System',
    description = 'Complete Greek payroll management with ERGANI compliance, automated calculations, and enterprise-grade security.',
    image = '/og-image.jpg',
    url = window.location.href,
    type = 'website',
    siteName = 'PayrollSync',
    locale = 'el_GR',
    keywords = ['payroll', 'HR', 'Greece', 'ERGANI', 'compliance'],
    author = 'PayrollSync Team',
    noIndex = false,
  } = config;

  // Environment detection - add warning for non-production
  const isDev = import.meta.env.MODE !== 'production';
  const envTitle = isDev
    ? `[${import.meta.env.MODE?.toUpperCase()}] ${title}`
    : title;
  const envDescription = isDev
    ? `⚠️ ${import.meta.env.MODE?.toUpperCase()} ENVIRONMENT - ${description}`
    : description;

  // Update document title
  document.title = envTitle;

  // Helper function to update or create meta tag
  const updateMetaTag = (selector: string, content: string) => {
    let meta = document.querySelector(selector) as HTMLMetaElement;
    if (!meta) {
      meta = document.createElement('meta');
      if (selector.includes('property')) {
        const property = selector.match(/property="([^"]*)"/)![1];
        meta.setAttribute('property', property);
      } else if (selector.includes('name')) {
        const name = selector.match(/name="([^"]*)"/)![1];
        meta.setAttribute('name', name);
      }
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', content);
  };

  // Basic meta tags
  updateMetaTag('meta[name="description"]', envDescription);
  updateMetaTag('meta[name="keywords"]', keywords.join(', '));
  updateMetaTag('meta[name="author"]', author);

  // Environment-based indexing control
  const robotsContent =
    isDev || noIndex ? 'noindex,nofollow,noarchive,nosnippet' : 'index,follow';
  updateMetaTag('meta[name="robots"]', robotsContent);
  updateMetaTag('meta[name="googlebot"]', robotsContent);

  // Open Graph tags
  updateMetaTag('meta[property="og:title"]', envTitle);
  updateMetaTag('meta[property="og:description"]', envDescription);
  updateMetaTag('meta[property="og:image"]', image);
  updateMetaTag('meta[property="og:url"]', url);
  updateMetaTag('meta[property="og:type"]', type);
  updateMetaTag('meta[property="og:site_name"]', siteName);
  updateMetaTag('meta[property="og:locale"]', locale);

  // Twitter Card tags
  updateMetaTag('meta[name="twitter:card"]', 'summary_large_image');
  updateMetaTag('meta[name="twitter:title"]', envTitle);
  updateMetaTag('meta[name="twitter:description"]', envDescription);
  updateMetaTag('meta[name="twitter:image"]', image);
  updateMetaTag('meta[name="twitter:site"]', '@PayrollSync');

  // Environment indicator
  if (isDev) {
    updateMetaTag(
      'meta[name="environment"]',
      import.meta.env.MODE || 'development'
    );
    // Additional meta tag to prevent indexing
    updateMetaTag('meta[http-equiv="X-Robots-Tag"]', 'noindex');
  } else {
    // Remove environment meta in production
    const envMeta = document.querySelector('meta[name="environment"]');
    if (envMeta) envMeta.remove();
    const robotsMeta = document.querySelector(
      'meta[http-equiv="X-Robots-Tag"]'
    );
    if (robotsMeta) robotsMeta.remove();
  }

  // Canonical URL (prevent duplicate content)
  let canonicalLink = document.querySelector(
    'link[rel="canonical"]'
  ) as HTMLLinkElement;
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.setAttribute('href', url);
}

/**
 * React hook for managing page meta tags
 */
export function usePageMeta(config: PageMetaConfig): void {
  React.useEffect(() => {
    updatePageMeta(config);

    // Store original title to restore on unmount
    const originalTitle = document.title;
    return () => {
      if (config.title) {
        document.title = originalTitle;
      }
    };
  }, [config.title, config.description, config.image, config.url, config.type]);
}

/**
 * Get current environment-aware sharing URL
 */
export function getCurrentSharingUrl(path: string = ''): string {
  const baseUrl =
    import.meta.env.MODE === 'production'
      ? 'https://payrollsync.com'
      : window.location.origin;

  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Generate structured data for SEO (JSON-LD)
 */
export function generateStructuredData(config: {
  type: 'WebApplication' | 'SoftwareApplication' | 'Organization';
  name: string;
  description: string;
  url: string;
  logo?: string;
  author?: string;
}): string {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': config.type,
    name: config.name,
    description: config.description,
    url: config.url,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web Browser',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
    },
  };

  if (config.logo) {
    (structuredData as any).logo = config.logo;
  }

  if (config.author) {
    (structuredData as any).author = {
      '@type': 'Organization',
      name: config.author,
    };
  }

  return JSON.stringify(structuredData, null, 2);
}

/**
 * Add structured data to page
 */
export function addStructuredData(data: string): void {
  // Remove existing structured data
  const existing = document.querySelector('script[type="application/ld+json"]');
  if (existing) {
    existing.remove();
  }

  // Add new structured data
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = data;
  document.head.appendChild(script);
}

// Re-export React for the usePageMeta hook
import React from 'react';
