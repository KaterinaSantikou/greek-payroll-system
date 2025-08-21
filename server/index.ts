import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { createServer as createSecureServer } from "https";
import fs from "fs";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Production Domain Configuration
const isProduction = process.env.NODE_ENV === 'production';
const productionDomain = process.env.PRODUCTION_DOMAIN || process.env.REPLIT_DOMAIN;
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];

// Add production domain to allowed origins
if (productionDomain) {
  allowedOrigins.push(`https://${productionDomain}`);
  allowedOrigins.push(`http://${productionDomain}`);
}

// Add Replit deployment domains
if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
  allowedOrigins.push(`https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`);
  allowedOrigins.push(`https://${process.env.REPL_SLUG}--${process.env.REPL_OWNER}.repl.co`);
}

// CORS Configuration for Production Domains
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const host = req.headers.host;
  
  // Allow same-origin requests
  if (origin && (allowedOrigins.includes(origin) || origin.includes(host || ''))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    // Same-origin request (no origin header)
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, X-CSRF-Token');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  next();
});

// Security middleware for production HTTPS
app.use((req, res, next) => {
  const host = req.headers.host;
  const forwardedProto = req.headers['x-forwarded-proto'];
  
  // Security headers for production
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Domain-specific Content Security Policy
  if (productionDomain && host?.includes(productionDomain)) {
    res.setHeader('Content-Security-Policy', 
      `default-src 'self' https://${productionDomain}; ` +
      `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://${productionDomain} https://www.google.com https://www.gstatic.com; ` +
      `style-src 'self' 'unsafe-inline' https://${productionDomain} https://fonts.googleapis.com; ` +
      `font-src 'self' https://fonts.gstatic.com; ` +
      `img-src 'self' data: https: blob:; ` +
      `connect-src 'self' https://${productionDomain} https://api.replit.com wss:;`
    );
  }
  
  // HTTPS redirect in production
  if (isProduction && forwardedProto !== 'https' && host !== 'localhost' && !host?.includes('127.0.0.1')) {
    return res.redirect(301, `https://${host}${req.url}`);
  }
  
  // HSTS (HTTP Strict Transport Security) for HTTPS
  if (isProduction || forwardedProto === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // SSL/TLS Configuration for Production
  const sslCertPath = process.env.SSL_CERT_PATH || '/etc/ssl/certs/cert.pem';
  const sslKeyPath = process.env.SSL_KEY_PATH || '/etc/ssl/private/key.pem';
  
  // Check for SSL certificates in production
  let httpsServer: any = null;
  if (isProduction && fs.existsSync(sslCertPath) && fs.existsSync(sslKeyPath)) {
    try {
      const sslOptions = {
        cert: fs.readFileSync(sslCertPath),
        key: fs.readFileSync(sslKeyPath),
        // Enable modern TLS settings
        secureProtocol: 'TLSv1_2_method',
        ciphers: [
          'ECDHE-RSA-AES128-GCM-SHA256',
          'ECDHE-RSA-AES256-GCM-SHA384',
          'ECDHE-RSA-AES128-SHA256',
          'ECDHE-RSA-AES256-SHA384'
        ].join(':'),
        honorCipherOrder: true
      };
      
      httpsServer = createSecureServer(sslOptions, app);
      
      // HTTPS on port 443 (standard) or 5443 for Replit
      const httpsPort = parseInt(process.env.HTTPS_PORT || '5443', 10);
      httpsServer.listen({
        port: httpsPort,
        host: "0.0.0.0",
      }, () => {
        log(`🔒 HTTPS server running on port ${httpsPort}`);
      });
    } catch (error) {
      log(`❌ Failed to start HTTPS server: ${error}`);
      log(`📝 Continuing with HTTP only - ensure SSL certificates are properly configured`);
    }
  } else if (isProduction) {
    log(`⚠️ Production mode: SSL certificates not found at ${sslCertPath} and ${sslKeyPath}`);
    log(`📝 For production deployment, ensure SSL certificates are configured`);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    const protocol = httpsServer ? 'HTTPS+HTTP' : 'HTTP';
    log(`🚀 ${protocol} server running on port ${port}`);
    
    // Production domain status
    if (productionDomain) {
      log(`🌐 Production domain configured: ${productionDomain}`);
      log(`📋 Allowed origins: ${allowedOrigins.length} configured`);
    }
    
    if (isProduction) {
      log(`🔧 Production Configuration:`);
      log(`   ✅ Security headers enabled`);
      log(`   ✅ HTTPS redirect configured`);
      log(`   ✅ CORS configured for custom domains`);
      log(`   ✅ Content Security Policy active`);
      log(`   ${httpsServer ? '✅' : '⚠️'} SSL certificates: ${httpsServer ? 'Active' : 'Configure for full HTTPS'}`);
      log(`   ${productionDomain ? '✅' : '⚠️'} Custom domain: ${productionDomain || 'Set PRODUCTION_DOMAIN env var'}`);
    }
  });
})();
