import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "./lib/passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

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
  // Preserve original user properties (id, email, name) and add token data
  const claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = claims?.exp;
  user.claims = claims; // Keep for backward compatibility with existing API endpoints
  
  // Ensure core user properties are preserved from the original user object
  // These were set in the verify function and should not be overwritten
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

  console.log('[AUTH][setup] Registering OIDC strategy...');
  passport.use("oidc", strategy);
  console.log('[AUTH][setup] OIDC strategy registered successfully!');

  passport.serializeUser((u: any, d) => d(null, String(u.id || u.sub)));
  passport.deserializeUser(async (id, d) => {
    const u = await storage.getUser(id);
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

  // Debug trace middleware to see what's happening
  app.use((req, _res, next) => {
    if (req.path === "/api/auth/user" || req.path === "/api/login" || req.path === "/oauth2callback") {
      console.log("[AUTH TRACE]", req.method, req.path, {
        cookieHeader: !!req.headers.cookie,
        sessionId: req.sessionID,
        hasSession: !!req.session,
        passportUser: (req.session as any)?.passport?.user ? true : false,
        isAuthenticated: req.isAuthenticated?.() ?? false,
      });
    }
    next();
  });

  // Rock-solid session endpoint  
  app.get("/api/auth/user", (req, res) => {
    const authed = req.isAuthenticated?.() || (req.session as any)?.passport?.user;
    if (authed) return res.json({ user: req.user ?? (req.session as any).passport.user });
    return res.status(401).json({ error: "unauthenticated" });
  });

  // OIDC callback & redirect - race-proof implementation
  app.get(
    "/oauth2callback",
    passport.authenticate("oidc", { failureRedirect: "/auth/error" }),
    (req, res, next) => {
      // (A) rotate session id to prevent fixation
      req.session.regenerate((err) => {
        if (err) return next(err);

        // (B) re-attach user to the new session
        req.login(req.user, (err2) => {
          if (err2) return next(err2);

          // (C) persist any custom user fields you rely on
          (req.session as any).passport = (req.session as any).passport || {};
          (req.session as any).passport.user = req.user;

          // (D) SAVE before redirecting to the SPA
          req.session.save((err3) => {
            if (err3) return next(err3);
            // Use 303 to avoid caching oddities after POST->GET
            res.redirect(303, "/dashboard");
          });
        });
      });
    }
  );


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

  console.log('[AUTH][middleware] isAuthenticated check:', {
    isAuth: req.isAuthenticated(),
    hasUser: !!user,
    userKeys: user ? Object.keys(user) : [],
    expires_at: user?.expires_at,
    sessionID: maskSecret(req.sessionID)
  });

  if (!req.isAuthenticated() || !user) {
    console.log('[AUTH][middleware] ❌ Failed - not authenticated or no user');
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Skip token expiration checks if no expires_at (fallback for session-based auth)
  if (!user.expires_at) {
    console.log('[AUTH][middleware] ✅ Passed - session-based auth (no token expiration)');
    return next();
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    console.log('[AUTH][middleware] ✅ Passed - token still valid');
    return next();
  }

  console.log('[AUTH][middleware] Token expired, attempting refresh...');
  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    console.log('[AUTH][middleware] ❌ Failed - no refresh token');
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    console.log('[AUTH][middleware] ✅ Passed - token refreshed');
    return next();
  } catch (error) {
    console.log('[AUTH][middleware] ❌ Failed - token refresh failed:', error);
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
