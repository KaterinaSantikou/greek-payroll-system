import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "./db";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
  // PREFLIGHT: Run DDL checks before starting services
  console.log('[Boot] Running preflight DDL checks...');
  await preflightDDLCheck();
  
  // Set environment variables if not set (for development)
  if (!process.env.ENABLE_ONCALL) process.env.ENABLE_ONCALL = 'true';
  if (!process.env.ENABLE_RUNBOOKS) process.env.ENABLE_RUNBOOKS = 'true';  
  if (!process.env.ENABLE_LOGGING) process.env.ENABLE_LOGGING = 'true';
  
  console.log('[Boot] Feature flags:', {
    ENABLE_ONCALL: process.env.ENABLE_ONCALL,
    ENABLE_RUNBOOKS: process.env.ENABLE_RUNBOOKS, 
    ENABLE_LOGGING: process.env.ENABLE_LOGGING
  });

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
    log(`serving on port ${port}`);
  });
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
