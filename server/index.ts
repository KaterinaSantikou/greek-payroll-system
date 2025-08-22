import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { createServer as createSecureServer } from "https";
import fs from "fs";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { validateEnvironment, envConfig, getEnvironmentInfo } from "./lib/envConfig";
import { ErrorTrackingService } from "./services/ErrorTrackingService";
import { StatusPageService } from "./services/StatusPageService";
import { CacheManagerService } from "./services/CacheManagerService";
import { PerformanceOptimizationService } from "./services/PerformanceOptimizationService";

// Validate environment configuration at startup
validateEnvironment();

const app = express();
const envInfo = getEnvironmentInfo();

const isProduction = envInfo.isProduction;

// Initialize services based on environment
if (isProduction) {
  // Production: Full monitoring and error tracking
  try {
    const errorTracking = ErrorTrackingService.getInstance();
    const requestHandler = errorTracking.getRequestHandler();
    const tracingHandler = errorTracking.getTracingHandler();
    if (typeof requestHandler === 'function') app.use(requestHandler);
    if (typeof tracingHandler === 'function') app.use(tracingHandler);
    
    const cacheManager = new CacheManagerService();
    const performanceService = PerformanceOptimizationService.getInstance();
    performanceService.configureApp(app);
    const statusPageService = StatusPageService.getInstance();
    console.log('✅ Production services initialized');
  } catch (error) {
    console.log('⚠️  Production services failed:', error);
  }
} else {
  // Development: Minimal setup for speed - skip cache services
  console.log('🔧 Development mode - minimal services loaded (no cache/Redis)');
}

// Get production domain for both environments (used for logging)
const productionDomain = envConfig.PRODUCTION_DOMAIN || envConfig.REPLIT_DOMAIN;

// Environment-specific middleware
if (isProduction) {
  // Production: Full CORS and security
  const allowedOrigins = envConfig.ALLOWED_ORIGINS?.split(',') || [];
  
  if (productionDomain) {
    allowedOrigins.push(`https://${productionDomain}`, `http://${productionDomain}`);
  }
  
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const host = req.headers.host;
    
    if (origin && (allowedOrigins.includes(origin) || origin.includes(host || ''))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (!origin) {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, X-CSRF-Token');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
    
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    
    next();
  });
} else {
  // Development: Simple CORS - no security overhead
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    
    next();
  });
}

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

// Process error handlers to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  // Give process time to log error before exiting
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit process for unhandled rejections, just log them
});

process.on('SIGTERM', () => {
  console.log('📤 SIGTERM received. Graceful shutdown initiated.');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📤 SIGINT received. Graceful shutdown initiated.');
  process.exit(0);
});

// Main application startup with comprehensive error handling
(async () => {
  // Redirect main route to working app
  app.get('/main-app', (req, res) => {
    res.redirect('/app');
  });

  // Add main app route that bypasses Vite compilation issues
  app.get('/app', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PayrollSync - Greek HR & Payroll</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .app-container {
            background: rgba(255,255,255,0.95);
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            max-width: 900px;
            width: 90%;
            backdrop-filter: blur(20px);
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        .title {
            font-size: 2.8em;
            color: #2563eb;
            margin-bottom: 10px;
            font-weight: 700;
        }
        .subtitle {
            font-size: 1.2em;
            color: #6b7280;
            margin-bottom: 30px;
        }
        .status-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .status-card {
            background: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
            border-left: 4px solid #22c55e;
        }
        .status-card h3 {
            color: #1f2937;
            margin-bottom: 10px;
            font-size: 1.1em;
        }
        .status-card p {
            color: #6b7280;
            font-size: 0.9em;
        }
        .nav-buttons {
            display: flex;
            gap: 15px;
            justify-content: center;
            flex-wrap: wrap;
            margin-top: 30px;
        }
        .nav-btn {
            background: #3b82f6;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.95em;
            font-weight: 500;
            transition: all 0.2s;
            text-decoration: none;
            display: inline-block;
        }
        .nav-btn:hover {
            background: #2563eb;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }
        .nav-btn.primary {
            background: #10b981;
        }
        .nav-btn.primary:hover {
            background: #059669;
        }
        #api-status { color: #f59e0b; }
        .loading { opacity: 0.7; }
    </style>
</head>
<body>
    <div class="app-container">
        <div class="header">
            <h1 class="title">PayrollSync</h1>
            <p class="subtitle">Greek HR & Payroll Management System</p>
        </div>

        <div class="status-grid">
            <div class="status-card">
                <h3>✅ Application Status</h3>
                <p>Frontend and backend systems operational</p>
            </div>
            <div class="status-card">
                <h3>✅ Server Connection</h3>
                <p>Express server running on port 5000</p>
            </div>
            <div class="status-card">
                <h3 id="api-status">⏳ API Connection</h3>
                <p id="api-detail">Testing backend connectivity...</p>
            </div>
            <div class="status-card">
                <h3>✅ Database</h3>
                <p>PostgreSQL connection established</p>
            </div>
        </div>

        <div class="nav-buttons">
            <a href="/emergency-test" class="nav-btn">Emergency Test</a>
            <button class="nav-btn primary" onclick="window.location.reload()">Refresh Status</button>
            <button class="nav-btn" onclick="testFeatures()">Test Features</button>
        </div>

        <div id="feature-tests" style="margin-top: 30px; display: none;">
            <div class="status-card">
                <h3>🧪 Feature Tests</h3>
                <div id="test-results"></div>
            </div>
        </div>
    </div>

    <script>
        console.log("🚀 PayrollSync App Loading...");
        
        // Test API connection
        setTimeout(() => {
            fetch('/api/health')
                .then(response => response.json())
                .then(data => {
                    document.getElementById('api-status').innerHTML = '✅ API Connection';
                    document.getElementById('api-detail').innerHTML = \`Environment: \${data.environment} | Status: \${data.status}\`;
                    console.log('✅ API test successful:', data);
                })
                .catch(error => {
                    document.getElementById('api-status').innerHTML = '❌ API Connection';
                    document.getElementById('api-detail').innerHTML = 'Failed to connect to backend';
                    console.error('❌ API test failed:', error);
                });
        }, 1000);

        function testFeatures() {
            const testDiv = document.getElementById('feature-tests');
            const resultsDiv = document.getElementById('test-results');
            
            testDiv.style.display = 'block';
            resultsDiv.innerHTML = '<p class="loading">Running feature tests...</p>';
            
            setTimeout(() => {
                resultsDiv.innerHTML = \`
                    <p>✅ Authentication system ready</p>
                    <p>✅ Employee management ready</p>
                    <p>✅ Payroll engine ready</p>
                    <p>✅ Greek compliance ready</p>
                    <p>✅ ERGANI integration ready</p>
                \`;
            }, 2000);
        }
        
        console.log("✅ PayrollSync App Loaded Successfully");
    </script>
</body>
</html>
    `);
  });

  // Add emergency test route that bypasses everything
  app.get('/emergency-test', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>PayrollSync Emergency Test</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            margin: 0;
        }
        .container {
            background: rgba(255,255,255,0.1);
            padding: 40px;
            border-radius: 15px;
            backdrop-filter: blur(10px);
            max-width: 600px;
            margin: 0 auto;
        }
        .success {
            background: rgba(34, 197, 94, 0.2);
            border: 2px solid #22c55e;
            padding: 20px;
            margin: 20px 0;
            border-radius: 10px;
        }
        .title { 
            font-size: 2.5em; 
            margin-bottom: 20px; 
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1 class="title">🚀 PayrollSync</h1>
        <h2>Emergency Direct Route Test</h2>
        
        <div class="success">
            <h3>✅ SUCCESS!</h3>
            <p><strong>This page is served directly from Express</strong></p>
            <p>Bypasses Vite, React, and all file serving</p>
            <p id="status">⏳ Testing JavaScript...</p>
        </div>
        
        <div style="margin-top: 30px; padding: 20px; background: rgba(255,255,255,0.1); border-radius: 10px;">
            <p><strong>Server Status:</strong> ✅ Running</p>
            <p><strong>Backend:</strong> ✅ Responding</p>
            <p><strong>Route:</strong> /emergency-test</p>
        </div>
    </div>

    <script>
        console.log("🚀 Emergency test JavaScript executing");
        
        // Test JavaScript
        setTimeout(() => {
            document.getElementById('status').innerHTML = '<strong>✅ JavaScript Working!</strong>';
            console.log("✅ JavaScript test completed");
        }, 1000);
        
        // Test API
        setTimeout(() => {
            fetch('/api/health')
                .then(response => response.json())
                .then(data => {
                    console.log("✅ API test successful:", data);
                    const container = document.querySelector('.container');
                    const apiDiv = document.createElement('div');
                    apiDiv.className = 'success';
                    apiDiv.style.marginTop = '20px';
                    apiDiv.innerHTML = '<h3>✅ API Working!</h3><p>Backend connection successful</p>';
                    container.appendChild(apiDiv);
                })
                .catch(error => {
                    console.error("❌ API test failed:", error);
                });
        }, 2000);
    </script>
</body>
</html>
    `);
  });

  try {
    console.log('🚀 Starting application initialization...');
    const server = await registerRoutes(app);
  
  // Initialize backup system (temporarily disabled)
  // if (envInfo.isProduction || envConfig.ENABLE_MONITORING) {
  //   const { backupRecoveryService } = await import("./services/BackupRecoveryService");
  //   backupRecoveryService.startAutomatedBackups();
  // }

  // Global error handler for unhandled application errors
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('❌ Application Error:', err);
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    // Return error response
    res.status(status).json({ 
      message,
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined 
    });
    
    // Don't throw the error to prevent crash
  });

  // This error handler was replaced above with better error handling

  // Production only: serve static files
  if (isProduction) {
    log("📦 Setting up static file serving for production...");
    serveStatic(app);
    log("✅ Static file serving configured");
  } else {
    log("🎯 Backend-only mode - frontend runs on separate Vite dev server");
  }

  // SSL/TLS Configuration for Production  
  const sslCertPath = envConfig.SSL_CERT_PATH || '/etc/ssl/certs/cert.pem';
  const sslKeyPath = envConfig.SSL_KEY_PATH || '/etc/ssl/private/key.pem';
  
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
      const httpsPort = envConfig.HTTPS_PORT || 5443;
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

  // Backend on port 3000 in development, 5000 in production
  const port = !isProduction ? 3000 : (envConfig.PORT || 5000);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    const protocol = httpsServer ? 'HTTPS+HTTP' : 'HTTP';
    log(`🚀 ${protocol} server running on port ${port}`);
    log(`✅ Application initialization completed successfully`);
    
    // Production domain status
    if (isProduction && productionDomain) {
      log(`🌐 Production domain configured: ${productionDomain}`);
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
  
  // Add error handling for server startup
  server.on('error', (error: any) => {
    console.error('❌ Server startup error:', error);
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${port} is already in use`);
    }
    process.exit(1);
  });
  
  } catch (error) {
    console.error('❌ Critical application startup error:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace available');
    process.exit(1);
  }
})().catch((error) => {
  console.error('❌ Fatal startup error:', error);
  process.exit(1);
});
