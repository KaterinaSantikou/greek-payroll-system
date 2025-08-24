import type { Express, Request, Response } from "express";
import type { Server } from "http";

// Minimal working registerRoutes function to fix startup
export async function registerRoutes(app: Express): Promise<Server> {
  console.log('[ROUTES] 🚀 registerRoutes function started!');
  
  // Environment-aware robots.txt endpoint
  app.get('/robots.txt', (req: Request, res: Response) => {
    const isProduction = process.env.NODE_ENV === 'production';
    
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour cache
    
    if (isProduction) {
      // Production robots.txt - allow indexing with restrictions
      res.send(`# PayrollSync Robots.txt - Production

User-agent: *

# Allow main content
Allow: /
Allow: /about
Allow: /features
Allow: /pricing
Allow: /contact
Allow: /blog

# Block sensitive areas
Disallow: /api/
Disallow: /admin/
Disallow: /debug/
Disallow: /.env*
Disallow: /config/
Disallow: /logs/
Disallow: /backup/
Disallow: /tmp/
Disallow: /uploads/private/
Disallow: /health/
Disallow: /metrics/
Disallow: /*.json$

# Sitemap for production
Sitemap: https://payrollsync.com/sitemap.xml

# Performance
Crawl-delay: 1`);
    } else {
      // Staging/Development - block all indexing
      res.send(`# PayrollSync Robots.txt - ${process.env.NODE_ENV?.toUpperCase() || 'DEVELOPMENT'} ENVIRONMENT
# ⚠️ NON-PRODUCTION DEPLOYMENT - DO NOT INDEX

User-agent: *

# Block all indexing for non-production environments
Disallow: /

# Security - block sensitive areas
Disallow: /api/
Disallow: /.env*
Disallow: /config/
Disallow: /logs/
Disallow: /backup/
Disallow: /tmp/
Disallow: /uploads/private/
Disallow: /health/
Disallow: /metrics/
Disallow: /debug/

# Performance - limit crawling even when blocked
Crawl-delay: 10

# No sitemap for non-production environments`);
    }
  });

  // Basic health endpoint for now
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0'
    });
  });

  // Enhanced health checks will be loaded by observability module
  console.log('[ROUTES] ✅ Basic routes registered');
  
  // Return a placeholder server object for now
  // The real server setup happens in index.ts
  return null as any;
}