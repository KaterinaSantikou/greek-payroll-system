import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { createServer as createSecureServer } from "https";
import fs from "fs";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Security middleware for production HTTPS
app.use((req, res, next) => {
  // Security headers for production
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // HTTPS redirect in production
  const isProduction = process.env.NODE_ENV === 'production';
  const forwardedProto = req.headers['x-forwarded-proto'];
  
  if (isProduction && forwardedProto !== 'https' && req.header('host') !== 'localhost') {
    return res.redirect(301, `https://${req.header('host')}${req.url}`);
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
  const isProduction = process.env.NODE_ENV === 'production';
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
    
    if (isProduction && !httpsServer) {
      log(`🔧 Production Checklist:`);
      log(`   ✅ Security headers enabled`);
      log(`   ✅ HTTPS redirect configured`);
      log(`   ⚠️  SSL certificates: Configure for full HTTPS`);
    }
  });
})();
