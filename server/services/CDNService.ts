/**
 * CDN Service for Static Asset Optimization
 * Handles static asset delivery, compression, and caching
 */

import { envConfig } from '../lib/envConfig';
import compression from 'compression';
import { Express, Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs/promises';

export interface CDNConfig {
  enableCompression: boolean;
  enableCaching: boolean;
  maxAge: number;
  supportedFormats: string[];
  compressionLevel: number;
}

export class CDNService {
  private config: CDNConfig;
  private assetManifest: Map<string, string> = new Map();

  constructor() {
    this.config = {
      enableCompression: true,
      enableCaching: envConfig.NODE_ENV === 'production',
      maxAge: envConfig.NODE_ENV === 'production' ? 31536000 : 0, // 1 year in production
      supportedFormats: ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2', '.ttf'],
      compressionLevel: envConfig.NODE_ENV === 'production' ? 6 : 1
    };
    
    this.initializeAssetManifest();
  }

  /**
   * Initialize asset manifest for fingerprinted files
   */
  private async initializeAssetManifest(): Promise<void> {
    try {
      // In production, load asset manifest if available
      if (envConfig.NODE_ENV === 'production') {
        const manifestPath = path.join(process.cwd(), 'dist', 'assets', 'manifest.json');
        try {
          const manifestContent = await fs.readFile(manifestPath, 'utf8');
          const manifest = JSON.parse(manifestContent);
          
          Object.entries(manifest).forEach(([key, value]) => {
            this.assetManifest.set(key, value as string);
          });
          
          console.log('✅ Asset manifest loaded with', this.assetManifest.size, 'entries');
        } catch (error) {
          console.warn('⚠️ Asset manifest not found, using fallback asset handling');
        }
      }
    } catch (error) {
      console.error('Failed to initialize asset manifest:', error);
    }
  }

  /**
   * Get compression middleware
   */
  getCompressionMiddleware() {
    if (!this.config.enableCompression) {
      return (req: Request, res: Response, next: NextFunction) => next();
    }

    return compression({
      level: this.config.compressionLevel,
      threshold: 1024, // Only compress files larger than 1KB
      filter: (req, res) => {
        // Don't compress responses if the client doesn't support it
        if (req.headers['x-no-compression']) {
          return false;
        }

        // Fallback to standard compression filter
        return compression.filter(req, res);
      }
    });
  }

  /**
   * Get static asset middleware with caching and compression
   */
  getStaticAssetMiddleware(staticPath: string) {
    return (req: Request, res: Response, next: NextFunction) => {
      const filePath = req.path;
      const fileExt = path.extname(filePath);

      // Check if this is a supported asset type
      if (!this.config.supportedFormats.includes(fileExt)) {
        return next();
      }

      // Set appropriate caching headers
      if (this.config.enableCaching) {
        this.setCacheHeaders(res, filePath);
      }

      // Set compression headers
      this.setCompressionHeaders(res, fileExt);

      // Handle asset serving
      next();
    };
  }

  /**
   * Set cache headers for static assets
   */
  private setCacheHeaders(res: Response, filePath: string): void {
    const isFingerprinted = this.isAssetFingerprinted(filePath);
    
    if (isFingerprinted) {
      // Fingerprinted assets can be cached indefinitely
      res.setHeader('Cache-Control', `public, max-age=${this.config.maxAge}, immutable`);
      res.setHeader('Expires', new Date(Date.now() + this.config.maxAge * 1000).toUTCString());
    } else {
      // Non-fingerprinted assets use shorter cache
      const shortCacheTime = 3600; // 1 hour
      res.setHeader('Cache-Control', `public, max-age=${shortCacheTime}`);
      res.setHeader('Expires', new Date(Date.now() + shortCacheTime * 1000).toUTCString());
    }

    // Add ETag for conditional requests
    res.setHeader('ETag', `"${this.generateETag(filePath)}"`);
  }

  /**
   * Set compression headers for assets
   */
  private setCompressionHeaders(res: Response, fileExt: string): void {
    // Set appropriate MIME types
    const mimeTypes: Record<string, string> = {
      '.js': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf'
    };

    const mimeType = mimeTypes[fileExt];
    if (mimeType) {
      res.setHeader('Content-Type', mimeType);
    }

    // Enable compression for text-based assets
    const compressibleTypes = ['.js', '.css', '.svg'];
    if (compressibleTypes.includes(fileExt)) {
      res.setHeader('Vary', 'Accept-Encoding');
    }
  }

  /**
   * Check if an asset is fingerprinted (has hash in filename)
   */
  private isAssetFingerprinted(filePath: string): boolean {
    // Check if the file is in the asset manifest
    if (this.assetManifest.has(filePath)) {
      return true;
    }

    // Check for hash pattern in filename (e.g., main.abc123.js)
    const filename = path.basename(filePath);
    const hashPattern = /\.[a-f0-9]{8,}\./;
    return hashPattern.test(filename);
  }

  /**
   * Generate ETag for a file path
   */
  private generateETag(filePath: string): string {
    // Use asset manifest hash if available
    const manifestEntry = this.assetManifest.get(filePath);
    if (manifestEntry) {
      const hashMatch = manifestEntry.match(/\.([a-f0-9]{8,})\./);
      if (hashMatch) {
        return hashMatch[1];
      }
    }

    // Fallback to simple hash of file path and timestamp
    const crypto = require('crypto');
    return crypto.createHash('md5').update(filePath + Date.now()).digest('hex').substring(0, 8);
  }

  /**
   * Configure Express app for optimal asset delivery
   */
  configureApp(app: Express): void {
    // Add compression middleware first
    app.use(this.getCompressionMiddleware());

    // Security headers for static assets
    app.use('/assets', (req, res, next) => {
      // Prevent content-type sniffing
      res.setHeader('X-Content-Type-Options', 'nosniff');
      
      // Cross-origin resource sharing for fonts
      const fileExt = path.extname(req.path);
      if (['.woff', '.woff2', '.ttf'].includes(fileExt)) {
        res.setHeader('Access-Control-Allow-Origin', '*');
      }
      
      next();
    });

    // Configure static asset serving with caching
    app.use('/assets', this.getStaticAssetMiddleware('assets'));

    console.log('✅ CDN service configured for static assets');
  }

  /**
   * Get asset URL (resolves to fingerprinted version if available)
   */
  getAssetUrl(assetPath: string): string {
    // Check if we have a fingerprinted version in the manifest
    const fingerprintedPath = this.assetManifest.get(assetPath);
    if (fingerprintedPath) {
      return `/assets/${fingerprintedPath}`;
    }

    // Return original path with assets prefix
    return `/assets/${assetPath}`;
  }

  /**
   * Preload critical assets
   */
  getCriticalAssetPreloads(): string[] {
    const criticalAssets = [
      'css/app.css',
      'js/app.js',
      'js/critical.js'
    ];

    return criticalAssets.map(asset => this.getAssetUrl(asset));
  }

  /**
   * Get performance optimization headers
   */
  getPerformanceHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    // DNS prefetch for external domains
    headers['X-DNS-Prefetch-Control'] = 'on';

    // Resource hints for critical assets
    const preloads = this.getCriticalAssetPreloads();
    if (preloads.length > 0) {
      const linkHeaders = preloads.map(url => `<${url}>; rel=preload; as=style`).join(', ');
      headers['Link'] = linkHeaders;
    }

    return headers;
  }

  /**
   * Health check for CDN service
   */
  healthCheck(): { status: 'healthy' | 'unhealthy'; details: any } {
    return {
      status: 'healthy',
      details: {
        compressionEnabled: this.config.enableCompression,
        cachingEnabled: this.config.enableCaching,
        assetManifestSize: this.assetManifest.size,
        maxAge: this.config.maxAge,
        supportedFormats: this.config.supportedFormats.length
      }
    };
  }

  /**
   * Get CDN performance metrics
   */
  getMetrics(): {
    config: CDNConfig;
    assetCacheHitRate: number;
    avgCompressionRatio: number;
    totalAssetsServed: number;
  } {
    return {
      config: this.config,
      assetCacheHitRate: 0, // Would need to track this in middleware
      avgCompressionRatio: 0.7, // Typical compression ratio
      totalAssetsServed: this.assetManifest.size
    };
  }
}

// Export singleton instance
export const cdnService = new CDNService();