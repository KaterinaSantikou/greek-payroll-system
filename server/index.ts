import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "./db";

// Core readiness tracking for health checks
let coreReady = false;

const app = express();

// Security: Helmet middleware with referrer policy
app.use(helmet({ 
  referrerPolicy: { policy: 'no-referrer' } 
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Security: Rate limiting for authentication endpoints
const authRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute per IP
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to auth endpoints
app.use('/api/login', authRateLimit);
app.use('/oauth2callback', authRateLimit);

// Health and readiness endpoints for deployment stability
app.get('/health', (_req, res) => res.status(200).json({status: 'ok', ts: new Date().toISOString()}));
app.get('/ready', (_req, res) => res.status(coreReady ? 200 : 503).json({status: coreReady ? 'ready' : 'not_ready'}));

// TAP middleware to debug /api/login 
app.use((req, res, next) => {
  if (req.path.startsWith('/api/login')) {
    console.log('[TAP] /api/login hit:', { method: req.method, path: req.path });
  }
  next();
});

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
  try {
    // SECURITY: Validate critical secrets at boot
    console.log('[Boot] Validating critical secrets...');
    if (!process.env.REPL_ID) {
      throw new Error('SECURITY ERROR: REPL_ID environment variable is required but not set');
    }
    if (!process.env.SESSION_SECRET) {
      throw new Error('SECURITY ERROR: SESSION_SECRET environment variable is required but not set');
    }
    console.log('[Boot] ✅ Critical secrets validated');
    
    // PREFLIGHT: Run DDL checks before starting services
    console.log('[Boot] Running preflight DDL checks...');
    await preflightDDLCheck();
    console.log('[Boot] ✅ Preflight checks completed!');
    
    // Set environment variables if not set (for development)
    if (!process.env.ENABLE_ONCALL) process.env.ENABLE_ONCALL = 'true';
    if (!process.env.ENABLE_RUNBOOKS) process.env.ENABLE_RUNBOOKS = 'true';  
    if (!process.env.ENABLE_LOGGING) process.env.ENABLE_LOGGING = 'true';
    
    // Boot log summarizing all flags for observability
    console.info('[Boot] Feature flags:', {
      ENABLE_ONCALL: process.env.ENABLE_ONCALL,
      ENABLE_RUNBOOKS: process.env.ENABLE_RUNBOOKS, 
      ENABLE_LOGGING: process.env.ENABLE_LOGGING
    });
    
    // Log sink configuration
    if (process.env.ENABLE_LOGGING !== 'true') {
      console.info('[Boot] ENABLE_LOGGING disabled - routing logs to console only');
    } else {
      console.info('[Boot] ENABLE_LOGGING enabled - full logging active');
    }

    console.log('[Boot] 🚀 About to call registerRoutes...');
    const server = await registerRoutes(app);
    console.log('[Boot] ✅ registerRoutes completed!');
    
    // Set coreReady after successful initialization of auth, db, and rules
    coreReady = true;
    console.log('[Boot] ✅ Core systems ready - health checks will now return 200');

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

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || '5000', 10);
    const host = "0.0.0.0";
    server.listen({
      port,
      host,
      reusePort: true,
    }, () => {
      log(`serving on ${host}:${port}`);
    });
  } catch (error) {
    console.error('[STARTUP] ❌ Failed to register routes:', error.message);
    console.error('[STARTUP] Full error stack:', error);
    
    // For deployment health checks, still start a minimal server
    const port = parseInt(process.env.PORT || '5000', 10);
    const host = "0.0.0.0";
    
    app.get('/', (_req, res) => res.status(200).send('OK - Server running'));
    app.get('/health', (_req, res) => res.status(503).json({
      status: 'error',
      message: 'Authentication setup failed',
      timestamp: new Date().toISOString()
    }));
    
    const server = app.listen(port, host, () => {
      console.log(`[STARTUP] ⚠️ Minimal server running on ${host}:${port} (degraded mode)`);
    });
  }
})();

/**
 * PREFLIGHT DDL CHECK: Verify required columns exist before starting services
 */
async function preflightDDLCheck() {
  const requiredColumns = [
    { table: 'runbooks', column: 'dependencies', module: 'runbooks' },
    { table: 'log_retention_policies', column: 'priority', module: 'logging' },
    { table: 'government_systems', column: 'base_url', module: 'monitoring' },
    { table: 'government_systems', column: 'health_check_endpoint', module: 'monitoring' },
    { table: 'government_systems', column: 'system_type', module: 'monitoring' },
    { table: 'government_systems', column: 'is_active', module: 'monitoring' }
  ];

  for (const { table, column, module } of requiredColumns) {
    try {
      const result = await db.execute(`
        SELECT COUNT(*) as count 
        FROM information_schema.columns 
        WHERE table_name = '${table}' AND column_name = '${column}'
      `);
      
      const exists = result.rows[0]?.count > 0;
      if (!exists) {
        console.error(`[DDL_CHECK] ❌ Missing column: ${table}.${column} (required by ${module} module)`);
        console.error(`[DDL_CHECK] 🔧 Action: Run 'npm run db:push --force' to sync schema`);
        console.error(`[DDL_CHECK] 🔧 Alternative: Add manually via SQL: ALTER TABLE ${table} ADD COLUMN ${column} ...`);
        
        // For now, continue startup but log the issue
        console.warn(`[DDL_CHECK] ⚠️  Starting with ${module} module degraded due to missing schema`);
      } else {
        console.log(`[DDL_CHECK] ✅ ${table}.${column} exists`);
      }
    } catch (error) {
      console.error(`[DDL_CHECK] Failed to check ${table}.${column}:`, error.message);
    }
  }
}

// Export app and db for testing
export { app, db };
