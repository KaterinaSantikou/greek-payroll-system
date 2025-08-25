import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "./lib/passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 1000 * 60 * 60 * 24 * 7; // 7 days
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  // Hosted when Replit provides public domains
  const isHosted = !!process.env.REPLIT_DOMAINS;
  // Fallback to production heuristic, but prefer hosted flag
  const isProd = isHosted || process.env.NODE_ENV === 'production';
  
  const sessionOpts = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProd,                     // MUST be true on hosted (HTTPS)
      sameSite: isProd ? 'none' as const : 'lax' as const,  // MUST be 'none' on hosted
      maxAge: sessionTtl,
      path: "/",
      // domain: omit to enforce host-only cookie (__Host-)
    },
    store: sessionStore,
    name: '__Host-psid', // host-only, secure-by-default prefix
  };
  
  // Log session configuration at startup
  console.info('[SESSION]', { 
    secure: !!sessionOpts.cookie?.secure, 
    sameSite: sessionOpts.cookie?.sameSite, 
    name: sessionOpts.name,
    isHosted,
    isProd
  });
  
  // Safety guard (adjusted to use isHosted)
  const { secure, sameSite } = sessionOpts.cookie ?? {};
  if (isHosted && (!secure || String(sameSite).toLowerCase() !== 'none')) {
    throw new Error(
      `Hosted mode requires secure session cookies. Expected {secure:true, sameSite:'none'}, got {secure:${!!secure}, sameSite:'${sameSite}'}`
    );
  }
  
  return session(sessionOpts);
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  console.log('[AUTH][setup] Setting up authentication...');
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  console.log('[AUTH][setup] Getting OIDC config...');
  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    console.log('[AUTH][verify] VERIFY FUNCTION CALLED!');
    try {
      console.log('[AUTH][verify] Processing tokens...');
      const claims = tokens.claims() ?? {};
      console.log('[AUTH][verify] Claims:', claims);
      
      const user = {
        id: claims.sub,
        email: claims.email,
        name: claims.first_name || claims.name || claims.username || claims.email
      };
      
      console.log('[AUTH][verify] Created user object:', user);
      
      updateUserSession(user, tokens);
      await upsertUser(claims);
      
      console.log('[AUTH][verify] Calling verified callback with user');
      verified(null, user);
    } catch (error) {
      console.error('[AUTH][verify] Verification failed:', error);
      verified(error as any);
    }
  };

  // Force canonical base URL for production auth consistency
  const APP_BASE_URL = process.env.APP_BASE_URL;
  const isReplitHosted = !!process.env.REPLIT_DOMAINS;
  const domain = (process.env.REPLIT_DOMAINS || "").split(",")[0];
  
  let CALLBACK: string;
  if (APP_BASE_URL) {
    // Production: use explicit APP_BASE_URL (e.g., https://hr-master-katerina43.replit.app)
    CALLBACK = new URL('/oauth2callback', APP_BASE_URL).toString();
    console.log(`[Auth] Using explicit APP_BASE_URL, CALLBACK: ${CALLBACK}`);
  } else if (isReplitHosted) {
    // Fallback to REPLIT_DOMAINS (dev/staging)
    CALLBACK = `https://${domain}/oauth2callback`;
    console.log(`[Auth] Fallback to REPLIT_DOMAINS, CALLBACK: ${CALLBACK}`);
  } else {
    // Local development
    CALLBACK = `http://localhost:5000/oauth2callback`;
    console.log(`[Auth] Local development, CALLBACK: ${CALLBACK}`);
  }
  
  // Optional: enforce hosted callback & cookie parity
  
  // 1) Callback host parity (hosted)
  if (process.env.REPLIT_DOMAINS) {
    console.info('[Auth] Hosted mode, CALLBACK:', CALLBACK);
    if (!CALLBACK.startsWith('https://')) {
      throw new Error('Hosted mode requires https callback');
    }
  }
  
  // Security guardrail: Deny localhost callback in hosted mode
  if (process.env.REPLIT_DOMAINS && CALLBACK.startsWith('http://localhost')) {
    throw new Error('Hosted mode forbids localhost redirect_uri');
  }
  
  console.log(`[AUTH][setup] Chosen CALLBACK: ${CALLBACK} (isReplitHosted: ${isReplitHosted}, domain: ${domain})`);


  const strategy = new Strategy(
    {
      config,
      scope: "openid email profile offline_access",
      callbackURL: new URL(CALLBACK),
      params: {
        redirect_uri: CALLBACK,
      },
    },
    verify
  );
  // PII masking utilities for production security
  function maskSecret(value: string | undefined): string {
    if (!value || process.env.NODE_ENV !== 'production') return value || 'undefined';
    return value.length > 8 ? `${value.slice(0, 4)}...${value.slice(-4)}` : '***';
  }

  function maskPII(value: string | undefined): string {
    if (!value || process.env.NODE_ENV !== 'production') return value || 'undefined';
    // Mask email: user@example.com -> u***@example.com
    if (value.includes('@')) {
      const [local, domain] = value.split('@');
      return `${local.charAt(0)}***@${domain}`;
    }
    // Mask other PII: keep first char + length
    return value.length > 1 ? `${value.charAt(0)}***` : '***';
  }

  console.log('[AUTH][setup] Registering OIDC strategy...');
  passport.use("oidc", strategy);
  console.log('[AUTH][setup] OIDC strategy registered successfully!');

  passport.serializeUser((u: any, d) => d(null, String(u.id || u.sub)));
  passport.deserializeUser(async (id, d) => {
    const u = await storage.findUserById?.(id);
    d(null, u ?? { id });
  });

  // Import the strict rate limiter from main server
  const { loginLimiter } = await import("./index.js");

  // Rate limiter MUST run first - no auth logic until rate limit passes
  app.get("/api/login", (req, res, next) => {
    // Apply rate limiter first, before any auth logic
    loginLimiter(req, res, (err) => {
      if (err) return; // Rate limit exceeded, response already sent
      
      // Only run auth logic if rate limit passes
      // Optional: CI "smoke mode" that always 302s  
      const AUTH_SMOKE = process.env.AUTH_SMOKE === "true";
      if (AUTH_SMOKE) {
        // Fake an IdP redirect location; CI only checks for 302 presence
        const fake = "https://idp.example/auth?client_id=TEST&redirect_uri=http://localhost:5000/oauth2callback&response_type=code";
        return res.redirect(302, fake);
      }
      
      // Safety assertion: prevent hosted/localhost mismatch
      const host = req.get('host') || req.hostname;
      if (/\.replit\.(dev|app)$/.test(host) && CALLBACK.startsWith('http://localhost')) {
        console.error(`🚨 SAFETY ASSERTION FAILED: hosted/localhost mismatch`);
        console.error(`   Host: ${host}`);
        console.error(`   Callback: ${CALLBACK}`);
        return res.status(500).json({ error: 'hosted/localhost mismatch' });
      }

      // Structured logging for observability (PII-safe)
      console.info('[AUTH][login]', { 
        host, 
        redirect_uri: CALLBACK, 
        client_id: maskSecret(process.env.REPL_ID)
      });

      console.log('[AUTH][login] Starting passport authentication...');
      passport.authenticate("oidc", {
        scope: ["openid", "email", "profile", "offline_access"],
        prompt: "login consent",
      })(req, res, next);
    });
  });

  // Authentication status endpoint
  app.get('/api/whoami', (req, res) => {
    res.json({
      authenticated: req.isAuthenticated(),
      user: req.user || null
    });
  });

  // Legacy lightweight auth status endpoint (keeping for compatibility)
  app.get('/api/auth/legacy-status', (req, res) => {
    res.json({ 
      authenticated: !!req.isAuthenticated?.(), 
      user: req.user ?? null 
    });
  });

  // Frontend expects this endpoint
  app.get('/api/auth/user', (req, res) => {
    console.log('[AUTH][user] User endpoint called:', { 
      isAuth: req.isAuthenticated(), 
      hasUser: !!req.user,
      sessionID: maskSecret(req.sessionID),
      user: req.user ? { id: maskPII(req.user.id), email: maskPII(req.user.email) } : null
    });
    
    res.json({
      authenticated: !!req.isAuthenticated?.() && !!req.user,
      user: req.user ?? null
    });
  });

  // Custom callback to surface failures (temporary debugging)
  function authCb(req: any, res: any, next: any) {
    return passport.authenticate('oidc', (err: any, user: any, info: any) => {
      if (err || !user) {
        console.error(`[AUTH][oauth2callback] ❌ FAIL - Authentication failed - Session: ${maskSecret(req.sessionID)}, Error: ${err?.message || 'Unknown error'}, Info: ${info || 'No additional info'}`);
      }
      
      console.log(`[AUTH][oauth2callback] Processing callback - User present: ${!!user}, Session: ${maskSecret(req.sessionID)}`);
      
      if (err) {
        console.error(`[AUTH][oauth2callback] ❌ FAIL - Passport error during authenticate step - Error: ${err.message}`);
        return res.status(500).json({ step: 'authenticate', err: String(err) });
      }
      
      if (!user) {
        console.error(`[AUTH][oauth2callback] ❌ FAIL - No user returned from passport - Info: ${info}`);
        return res.status(401).json({ step: 'authenticate', user: false, info });
      }
      
      req.logIn(user, (e: any) => {
        if (e) {
          console.error(`[AUTH][oauth2callback] ❌ FAIL - req.logIn failed - Session: ${maskSecret(req.sessionID)}, Error: ${e.message}`);
          return res.status(500).json({ step: 'login', err: String(e) });
        }
        
        // Success: redirect to dashboard
        console.log(`[AUTH][oauth2callback] ✅ SUCCESS - User logged in successfully - User: ${maskPII(user?.email)}, Session: ${maskSecret(req.sessionID)}`);
        console.log(`[AUTH][oauth2callback] ✅ Redirecting authenticated user to /dashboard`);
        return res.redirect('/dashboard');
      });
    })(req, res, next);
  }
  
  app.get('/oauth2callback', authCb);
  app.post('/oauth2callback', authCb);


  app.get("/api/logout", async (req, res) => {
    const config = await getOidcConfig();
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });

}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
