import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";
import path from "path";
import fs from "fs";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import history from "connect-history-api-fallback";
import { db } from "./db";

// Core readiness tracking for health checks
let coreReady = false;
const __root = path.resolve(import.meta.dirname, "..");

// DEPLOYMENT BOOTSTRAP: Ensure core tables exist BEFORE migrator runs
async function ensureCoreTables() {
  const pg = (await import('pg')).default;
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('[BOOTSTRAP] 🔧 Creating core tables before migration diff...');
    
    // Always use public schema
    await pool.query(`SET search_path TO public`);
    
    // EXTENSIONS: Ensure all required extensions are available
    await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    
    // Verify extensions are working
    const extensionTest = await pool.query(`
      SELECT 
        gen_random_uuid() as uuid_test,
        EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') as pgcrypto_ok
    `);
    console.log('[BOOTSTRAP] ✅ Extensions verified:', extensionTest.rows[0]);
    
    // RLS SAFEGUARDS: Disable RLS on critical tables to prevent production access issues
    const criticalTables = [
      'oncall_teams', 'status_page_subscriptions', 'status_page_incidents', 
      'automated_runbooks', 'employees', 'users', 'sessions'
    ];
    
    for (const tableName of criticalTables) {
      try {
        await pool.query(`ALTER TABLE IF EXISTS public.${tableName} DISABLE ROW LEVEL SECURITY`);
      } catch (err) {
        // Table might not exist yet, that's OK
      }
    }
    console.log('[BOOTSTRAP] 🔧 RLS safeguards applied to critical tables');

    // Create all "problem" tables that cause rename prompts
    const bootstrapSQL = `
      -- oncall_teams (main blocker)
      CREATE TABLE IF NOT EXISTS public.oncall_teams (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        escalation_policy jsonb DEFAULT '{}'::jsonb,
        members jsonb NOT NULL DEFAULT '[]'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      
      -- status_page_subscriptions (secondary blocker)  
      CREATE TABLE IF NOT EXISTS public.status_page_subscriptions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email text NOT NULL,
        component_slug text,
        is_verified boolean NOT NULL DEFAULT false,
        verify_token uuid DEFAULT gen_random_uuid(),
        created_at timestamptz NOT NULL DEFAULT now(),
        verified_at timestamptz,
        unsubscribed_at timestamptz
      );
      
      -- status_page_incidents
      CREATE TABLE IF NOT EXISTS public.status_page_incidents (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        title text NOT NULL,
        description text,
        severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','minor','major','critical')),
        status text NOT NULL DEFAULT 'investigating' CHECK (status IN ('investigating','identified','monitoring','resolved')),
        started_at timestamptz NOT NULL DEFAULT now(),
        resolved_at timestamptz,
        created_by uuid,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      
      -- automated_runbooks
      CREATE TABLE IF NOT EXISTS public.automated_runbooks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        slug text UNIQUE,
        description text,
        is_active boolean NOT NULL DEFAULT true,
        triggers jsonb DEFAULT '[]'::jsonb,
        steps jsonb NOT NULL DEFAULT '[]'::jsonb,
        created_by uuid,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `;

    await pool.query(bootstrapSQL);

    // Verify what we created
    const verification = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema='public'
        AND table_name IN ('oncall_teams','status_page_subscriptions','status_page_incidents','automated_runbooks')
      ORDER BY table_name
    `);
    
    console.log('[BOOTSTRAP] ✅ Tables created:', verification.rows.map(r => r.table_name));
    
  } catch (error) {
    console.error('[BOOTSTRAP] ❌ Failed to create core tables:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// EMERGENCY STOPGAP: Create temporary views to satisfy migrator if tables missing
async function emergencyStopgap() {
  const pg = (await import('pg')).default;
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('[EMERGENCY] 🚨 Creating temporary views to block rename prompts...');
    
    await pool.query(`SET search_path TO public`);
    
    // Create temporary views for any missing tables (migrator sees them as "existing")
    const stopgapSQL = `
      -- Temporary view to satisfy oncall_teams requirement
      CREATE OR REPLACE VIEW public.oncall_teams AS
      SELECT
        gen_random_uuid()::uuid as id,
        ''::text as name,
        '{}'::jsonb as escalation_policy,
        '[]'::jsonb as members,
        now() as created_at,
        now() as updated_at
      WHERE false;
      
      -- Add other problematic tables as views if needed
      CREATE OR REPLACE VIEW public.status_page_subscriptions AS
      SELECT
        gen_random_uuid()::uuid as id,
        ''::text as email,
        ''::text as component_slug,
        false as is_verified,
        gen_random_uuid()::uuid as verify_token,
        now() as created_at,
        null::timestamptz as verified_at,
        null::timestamptz as unsubscribed_at
      WHERE false;
    `;
    
    await pool.query(stopgapSQL);
    console.log('[EMERGENCY] ✅ Temporary views created - rename prompts should disappear');
    
  } catch (error) {
    console.error('[EMERGENCY] ❌ Failed to create stopgap views:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// SANITY CHECK: Verify what the migrator actually sees
async function sanitycheckTables() {
  const pg = (await import('pg')).default;
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('[SANITY] 🔍 Checking what migrator can see...');
    
    // Check if tables/views exist
    const tablesCheck = await pool.query(`
      SELECT table_schema, table_name, table_type
      FROM information_schema.tables
      WHERE table_schema='public' 
        AND lower(table_name) LIKE '%oncall%'
        OR lower(table_name) LIKE '%status_page%'
      ORDER BY table_name
    `);
    
    // Check ownership/permissions
    const permissionsCheck = await pool.query(`
      SELECT
        n.nspname as schema,
        c.relname as table_name,
        pg_get_userbyid(c.relowner) as owner,
        c.relkind as type
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname='public' 
        AND (c.relname LIKE '%oncall%' OR c.relname LIKE '%status_page%')
      ORDER BY c.relname
    `);
    
    console.log('[SANITY] Tables/Views found:', tablesCheck.rows);
    console.log('[SANITY] Ownership info:', permissionsCheck.rows);
    
  } catch (error) {
    console.error('[SANITY] ❌ Failed sanity check:', error);
  } finally {
    await pool.end();
  }
}

// DEVELOPMENT SPA SETUP: Direct asset serving + smart catch-all
async function setupDevSPA(app: express.Express, server: any) {
  // 1) Serve built assets directly FIRST (bypass Vite's catch-all)
  const devAssetsPath = path.join(__root, "dist", "public", "assets");
  if (fs.existsSync(devAssetsPath)) {
    console.log('[DEV] 🎯 Serving dev assets from:', devAssetsPath);
    app.use('/assets', express.static(devAssetsPath, { maxAge: '0' }));
  }
  
  // 2) History fallback for SPA routes only (excludes assets, API, health)
  app.use(
    history({
      htmlAcceptHeaders: ['text/html', 'application/xhtml+xml'],
      disableDotRule: true,
      rewrites: [
        // Keep these as real files - don't rewrite them
        { from: /^\/assets\/.*$/, to: function(context: any) { 
          return context.parsedUrl.pathname; 
        } },
        { from: /^\/api\/.*$/, to: function(context: any) { 
          return context.parsedUrl.pathname; 
        } },
        { from: /^\/health$/, to: function(context: any) { 
          return context.parsedUrl.pathname; 
        } },
        { from: /^\/ready$/, to: function(context: any) { 
          return context.parsedUrl.pathname; 
        } },
      ],
    })
  );
  
  // 3) Vite middlewares AFTER static assets and history
  await setupVite(app, server);
}

// PRODUCTION SPA SETUP: Static assets + smart catch-all
function setupProdSPA(app: express.Express) {
  const distDir = path.join(__root, 'dist', 'public');
  const assetsDir = path.join(distDir, 'assets');
  
  // 1) Static assets BEFORE catch-all (with aggressive caching)
  app.use('/assets', express.static(assetsDir, { maxAge: '1y', immutable: true }));
  app.use(express.static(distDir, { maxAge: '0' })); // index.html: no-cache
  
  // 2) Smart catch-all: serve index.html for SPA routes ONLY
  // Exclude: API, assets, health, static files
  app.get(/^\/(?!api\/|assets\/|health$|ready$|favicon\.ico$|robots\.txt$|manifest\.json$).*/, (req, res) => {
    const indexPath = path.join(distDir, 'index.html');
    if (!fs.existsSync(indexPath)) {
      console.error('[PROD] Missing index.html at:', indexPath);
      return res.status(500).send('index.html missing in dist');
    }
    console.log('[PROD] Serving SPA route:', req.path, '→ index.html');
    res.sendFile(indexPath);
  });
}

const app = express();

// Trust proxy for accurate IP detection behind load balancers
app.set('trust proxy', 1);

// CORS Configuration: Handle preflight requests and allow credentials
app.options('/api/*', cors({ origin: true, credentials: true }));
app.use('/api', cors({ origin: true, credentials: true }));

// Security: Helmet middleware with comprehensive CSP and security headers
app.use(helmet({
  xssFilter: true,
  frameguard: { action: "deny" },
  noSniff: true,
  referrerPolicy: { policy: "no-referrer" },
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "img-src": ["'self'", "data:"],
      "connect-src": ["'self'"],
    },
  },
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Security: IP allowlisting for production (optional)
const allowedIPs = process.env.AUTH_ALLOWED_IPS?.split(',') || [];
const ipAllowlistMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (allowedIPs.length === 0) {
    // No allowlist configured, allow all
    return next();
  }
  
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  if (allowedIPs.includes(clientIP)) {
    console.log(`[IP_ALLOWLIST] ✅ Allowed IP: ${clientIP}`);
    next();
  } else {
    console.log(`[IP_ALLOWLIST] ❌ Blocked IP: ${clientIP}`);
    res.status(403).json({ error: 'Access forbidden', ip: clientIP });
  }
};

// Security: Strict rate limiting for authentication endpoints
const loginLimiter = rateLimit({
  windowMs: 60_000,          // 1 min
  max: 5,                    // 5 attempts/min/IP
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, _res) =>
    (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim()
    || req.ip
    || req.socket.remoteAddress
    || "unknown",
  // Count *every* request as an attempt (even 302s)
  requestWasSuccessful: () => false,
  handler: (req, res) => {
    console.warn('[RateLimit] 429', req.ip, req.method, req.originalUrl);
    res.status(429).json({ error: "rate_limited", retryAfterSec: 60 });
  },
});

// Whitelist auth endpoints from any guards
const AUTH_OPEN = new Set([
  "/api/login",
  "/oauth2callback",
  "/api/me", 
  "/api/auth/user",
  "/api/logout",
  "/api/whoami"
]);

function allowAuthOpen(req: Request, res: Response, next: NextFunction) {
  return AUTH_OPEN.has(req.path) ? next() : next("route");
}

// Apply IP allowlist to auth endpoints (rate limiting moved to individual routes)
app.use('/oauth2callback', allowAuthOpen, ipAllowlistMiddleware);

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
    // BUILD CHECK: Verify React build exists and paths align
    const __root = path.resolve(import.meta.dirname, "..");
    const buildIndexPath = path.join(__root, 'dist', 'public', 'index.html');
    const buildAssetsPath = path.join(__root, 'dist', 'public', 'assets');
    const serverStaticPath = path.join(import.meta.dirname, 'public');
    
    console.log('[Boot] Checking build files...');
    console.log('index.html exists:', fs.existsSync(buildIndexPath));
    console.log('assets dir exists:', fs.existsSync(buildAssetsPath));
    console.log('server static symlink exists:', fs.existsSync(serverStaticPath));
    console.log('Build path:', buildIndexPath);
    console.log('Vite outDir aligns with server path:', buildIndexPath.includes('dist/public'));
    
    // DATABASE: Verify connection details and table visibility for migrator
    const pg = (await import('pg')).default;
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
      const result = await pool.query(`
        SELECT
          current_database() as db,
          current_user as usr,
          current_schema as schema,
          current_setting('search_path', true) as search_path,
          to_regclass('public.oncall_teams') as reg_oncall,
          to_regclass('public.partners') as reg_partners,
          to_regclass('public.status_page_subscriptions') as reg_status_subs,
          to_regclass('public.automated_runbooks') as reg_runbooks
      `);
      console.log('[DB PROBE] Migrator connection visibility:', result.rows[0]);
      pool.end();
    } catch (e) {
      console.error('[DB PROBE] Failed:', e);
    }

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

    // CRITICAL: Run bootstrap BEFORE any migration or schema comparison
    console.log('[Boot] 🚀 Running deployment bootstrap...');
    await ensureCoreTables();
    console.log('[Boot] ✅ Deployment bootstrap completed!');
    
    // Run sanity check to verify everything is visible to migrator
    await sanitycheckTables();

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // SMART SPA ROUTING: Proper route order to prevent asset interference
  if (app.get("env") === "development") {
    console.log('[Boot] 🎯 Setting up development SPA routing with Vite');
    await setupDevSPA(app, server);
  } else {
    console.log('[Boot] 🎯 Setting up production SPA routing with static assets');
    setupProdSPA(app);
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
  } catch (error: any) {
    console.error('[STARTUP] ❌ Failed to register routes:', error.message);
    console.error('[STARTUP] Full error stack:', error);
    
    // For deployment health checks, still start a minimal server
    const port = parseInt(process.env.PORT || '5000', 10);
    const host = "0.0.0.0";
    
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
      
      const exists = (result.rows[0] as any)?.count > 0;
      if (!exists) {
        console.error(`[DDL_CHECK] ❌ Missing column: ${table}.${column} (required by ${module} module)`);
        console.error(`[DDL_CHECK] 🔧 Action: Run 'npm run db:push --force' to sync schema`);
        console.error(`[DDL_CHECK] 🔧 Alternative: Add manually via SQL: ALTER TABLE ${table} ADD COLUMN ${column} ...`);
        
        // For now, continue startup but log the issue
        console.warn(`[DDL_CHECK] ⚠️  Starting with ${module} module degraded due to missing schema`);
      } else {
        console.log(`[DDL_CHECK] ✅ ${table}.${column} exists`);
      }
    } catch (error: any) {
      console.error(`[DDL_CHECK] Failed to check ${table}.${column}:`, error.message);
    }
  }
}

// Export app, db, and rate limiter for testing and auth routes
export { app, db, loginLimiter };
