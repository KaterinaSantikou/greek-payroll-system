// =============================================================================
// META TAGS & OPEN GRAPH UTILITIES
// =============================================================================

export interface MetaTagsConfig {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  siteName?: string;
  locale?: string;
  environment?: string;
}

/**
 * Generate Open Graph and Twitter meta tags
 */
export function generateMetaTags(config: MetaTagsConfig = {}): string {
  const {
    title = 'PayrollSync - Greek HR & Payroll Management System',
    description = 'Complete Greek payroll management with ERGANI compliance, automated calculations, and enterprise-grade security. Built for Greek businesses.',
    image = '/og-image.jpg',
    url = '',
    type = 'website',
    siteName = 'PayrollSync',
    locale = 'el_GR',
    environment = process.env.NODE_ENV || 'development'
  } = config;

  // Block indexing for non-production environments
  const robotsContent = environment === 'production' ? 'index,follow' : 'noindex,nofollow,noarchive,nosnippet';
  
  // Environment indicator for staging
  const envTitle = environment !== 'production' ? `[${environment.toUpperCase()}] ${title}` : title;
  const envDescription = environment !== 'production' 
    ? `⚠️ ${environment.toUpperCase()} ENVIRONMENT - ${description}` 
    : description;

  return `
    <!-- Basic Meta Tags -->
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1">
    <meta name="description" content="${envDescription}">
    <meta name="robots" content="${robotsContent}">
    <meta name="googlebot" content="${robotsContent}">
    <meta name="author" content="PayrollSync Team">
    <meta name="language" content="Greek">
    
    <!-- Environment Safety -->
    ${environment !== 'production' ? `
    <meta name="environment" content="${environment}">
    <meta http-equiv="X-Robots-Tag" content="noindex">
    ` : ''}
    
    <!-- Open Graph -->
    <meta property="og:title" content="${envTitle}">
    <meta property="og:description" content="${envDescription}">
    <meta property="og:image" content="${image}">
    <meta property="og:url" content="${url}">
    <meta property="og:type" content="${type}">
    <meta property="og:site_name" content="${siteName}">
    <meta property="og:locale" content="${locale}">
    <meta property="og:locale:alternate" content="en_US">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${envTitle}">
    <meta name="twitter:description" content="${envDescription}">
    <meta name="twitter:image" content="${image}">
    <meta name="twitter:site" content="@PayrollSync">
    <meta name="twitter:creator" content="@PayrollSync">
    
    <!-- Additional SEO -->
    <meta name="theme-color" content="#2563eb">
    <meta name="msapplication-TileColor" content="#2563eb">
    <meta name="application-name" content="${siteName}">
    <meta name="apple-mobile-web-app-title" content="${siteName}">
    
    <!-- Security -->
    <meta name="csrf-token" content="auto-generated-csrf-token">
    <meta http-equiv="X-Content-Type-Options" content="nosniff">
    <meta http-equiv="X-Frame-Options" content="DENY">
    <meta http-equiv="X-XSS-Protection" content="1; mode=block">
    
    <!-- Performance Hints -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="dns-prefetch" href="//fonts.googleapis.com">
    <link rel="dns-prefetch" href="//fonts.gstatic.com">
  `.trim();
}

/**
 * Generate cache control headers for different asset types
 */
export function getCacheHeaders(assetType: 'html' | 'hashed-assets' | 'api' | 'static'): Record<string, string> {
  switch (assetType) {
    case 'html':
      return {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'ETag': `"${Date.now()}"` // Force revalidation
      };
    
    case 'hashed-assets':
      return {
        'Cache-Control': 'public, max-age=31536000, immutable', // 1 year
        'Expires': new Date(Date.now() + 31536000000).toUTCString()
      };
    
    case 'api':
      return {
        'Cache-Control': 'no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache'
      };
    
    case 'static':
      return {
        'Cache-Control': 'public, max-age=3600', // 1 hour
        'Expires': new Date(Date.now() + 3600000).toUTCString()
      };
    
    default:
      return {
        'Cache-Control': 'no-cache'
      };
  }
}