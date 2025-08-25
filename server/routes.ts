import type { Express, Request, Response } from "express";
import type { Server } from "http";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { getClientSafeConfig, verifySensitiveKeysNotExposed } from "./utils/envValidation";
import healthRouter from "./api/health";
import { registerPropertiesRoutes } from "./api/properties";

// Enhanced registerRoutes function with object storage support
export async function registerRoutes(app: Express): Promise<Server> {
  console.log('[ROUTES] 🚀 registerRoutes function started with object storage!');
  
  // Mount health endpoints FIRST - before auth to avoid conflicts
  app.use('/api', healthRouter);
  console.log('[ROUTES] ✅ Health endpoints mounted first');
  
  // Auth middleware setup - required for protected file operations
  try {
    await setupAuth(app);
    console.log('[ROUTES] ✅ Authentication setup completed');
  } catch (error) {
    console.warn('[ROUTES] ⚠️ Auth setup failed, continuing without auth:', error);
  }
  
  // CORS preflight for object storage endpoints
  app.options('/api/objects/*', (req: Request, res: Response) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.status(200).end();
  });
  
  // Serving private objects with ACL checks (protected endpoint)
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: Request, res: Response) => {
    const userId = req.user?.claims?.sub;
    const objectStorageService = new ObjectStorageService();
    
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      
      if (!canAccess) {
        return res.status(401).json({ 
          error: "Access denied",
          message: "You don't have permission to access this file"
        });
      }
      
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error accessing object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "File not found" });
      }
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get signed upload URL endpoint (protected)
  app.post("/api/objects/upload", isAuthenticated, async (req: Request, res: Response) => {
    const { contentType, maxSizeBytes, ttlSeconds } = req.body;
    
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadResult = await objectStorageService.getObjectEntityUploadURL({
        contentType,
        maxSizeBytes: maxSizeBytes || 10 * 1024 * 1024, // 10MB default
        ttlSeconds: ttlSeconds || 900, // 15 minutes default
      });
      
      res.json({
        method: 'PUT',
        url: uploadResult.uploadURL,
        objectPath: uploadResult.objectPath,
        expiresAt: uploadResult.expiresAt,
      });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ 
        error: "Failed to generate upload URL",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Set object ACL policy after upload (protected)
  app.put("/api/objects/acl", isAuthenticated, async (req: Request, res: Response) => {
    const { objectURL, visibility = "private", aclRules = [] } = req.body;
    const userId = req.user?.claims?.sub;

    if (!objectURL || !userId) {
      return res.status(400).json({ 
        error: "Missing required fields",
        message: "objectURL and authenticated user required"
      });
    }

    try {
      const objectStorageService = new ObjectStorageService();
      const normalizedPath = await objectStorageService.trySetObjectEntityAclPolicy(
        objectURL,
        {
          owner: userId,
          visibility: visibility as "public" | "private",
          aclRules,
        }
      );

      res.json({
        success: true,
        objectPath: normalizedPath,
        message: "ACL policy set successfully",
      });
    } catch (error) {
      console.error("Error setting ACL policy:", error);
      res.status(500).json({ 
        error: "Failed to set ACL policy",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Public file serving endpoint (no auth required)
  app.get("/public-objects/:filePath(*)", async (req: Request, res: Response) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ 
          error: "File not found",
          message: `Public file '${filePath}' does not exist`
        });
      }
      
      await objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error serving public object:", error);
      return res.status(500).json({ 
        error: "Internal server error",
        message: "Failed to serve public file"
      });
    }
  });

  // Object storage cleanup endpoint (admin only)
  app.post("/api/admin/cleanup-storage", isAuthenticated, async (req: Request, res: Response) => {
    const { olderThanHours = 24 } = req.body;
    const userId = req.user?.claims?.sub;
    
    // Basic admin check (in production, use proper role checking)
    if (!userId?.includes('admin')) {
      return res.status(403).json({ 
        error: "Admin access required",
        message: "Only administrators can cleanup storage"
      });
    }
    
    try {
      const objectStorageService = new ObjectStorageService();
      const cleanedCount = await objectStorageService.cleanupExpiredObjects(olderThanHours);
      
      res.json({
        success: true,
        cleanedObjects: cleanedCount,
        message: `Cleaned up ${cleanedCount} expired objects older than ${olderThanHours} hours`,
      });
    } catch (error) {
      console.error("Error cleaning up storage:", error);
      res.status(500).json({ 
        error: "Cleanup failed",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Client-safe configuration endpoint (no sensitive data exposed)
  app.get('/api/config', (req: Request, res: Response) => {
    try {
      const clientConfig = getClientSafeConfig();
      
      // Verify no sensitive keys are being exposed
      verifySensitiveKeysNotExposed(clientConfig);
      
      res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minute cache
      res.json({
        success: true,
        config: clientConfig,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error getting client config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get configuration',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
  
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

  // Health endpoints already mounted above

  // Register properties routes
  registerPropertiesRoutes(app);
  
  // Enhanced health checks will be loaded by observability module
  console.log('[ROUTES] ✅ Basic routes registered');
  
  // Return a placeholder server object for now
  // The real server setup happens in index.ts
  return null as any;
}