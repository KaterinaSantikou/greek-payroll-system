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
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    name: 'connect.sid', // Explicit session cookie name
    cookie: {
      httpOnly: true,
      secure: false, // Force false for Replit hosted environment
      sameSite: 'lax', // Always use lax for OAuth redirects
      maxAge: sessionTtl,
      path: '/', // Ensure cookie works for all paths
    },
  });
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
      const claims = tokens.claims();
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

  // Replit environment detection - use HTTPS callback when REPLIT_DOMAINS exists
  const isReplitHosted = !!process.env.REPLIT_DOMAINS;
  const domain = (process.env.REPLIT_DOMAINS || "").split(",")[0];
  const REPLIT_CALLBACK = `https://${domain}/oauth2callback`;
  const DEV_CALLBACK = `http://localhost:5000/oauth2callback`;
  const CALLBACK = isReplitHosted ? REPLIT_CALLBACK : DEV_CALLBACK;


  const strategy = new Strategy(
    {
      config,
      scope: "openid email profile offline_access",
      callbackURL: new URL(CALLBACK),
    },
    verify
  );
  console.log('[AUTH][setup] Registering OIDC strategy...');
  passport.use("oidc", strategy);
  console.log('[AUTH][setup] OIDC strategy registered successfully!');

  passport.serializeUser((u: any, d) => d(null, String(u.id || u.sub)));
  passport.deserializeUser(async (id, d) => {
    const u = await storage.findUserById?.(id);
    d(null, u ?? { id });
  });

  app.get("/api/login", (req, res, next) => {
    // Safety assertion: prevent hosted/localhost mismatch
    const host = req.get('host') || req.hostname;
    if (/\.replit\.(dev|app)$/.test(host) && CALLBACK.startsWith('http://localhost')) {
      console.error(`🚨 SAFETY ASSERTION FAILED: hosted/localhost mismatch`);
      console.error(`   Host: ${host}`);
      console.error(`   Callback: ${CALLBACK}`);
      return res.status(500).json({ error: 'hosted/localhost mismatch' });
    }

    // Log authentication attempt
    console.log(`🔐 Auth attempt: {host: "${host}", redirect_uri: "${CALLBACK}", client_id: "${process.env.REPL_ID}"}`);

    console.log('[AUTH][login] Starting passport authentication...');
    passport.authenticate("oidc")(req, res, next);
  });

  // Authentication status endpoint
  app.get('/api/whoami', (req, res) => {
    res.json({
      authenticated: req.isAuthenticated(),
      user: req.user || null
    });
  });

  // Frontend expects this endpoint
  app.get('/api/auth/user', (req, res) => {
    console.log('[AUTH][user] User endpoint called:', { 
      isAuth: req.isAuthenticated(), 
      hasUser: !!req.user,
      sessionID: req.sessionID,
      user: req.user 
    });
    
    res.json({
      authenticated: !!req.isAuthenticated?.() && !!req.user,
      user: req.user ?? null
    });
  });

  // Custom callback to surface failures (temporary debugging)
  function authCb(req: any, res: any, next: any) {
    return passport.authenticate('oidc', (err: any, user: any, info: any) => {
      console.error('[AUTH][cb]', { 
        err: err?.message, 
        hasUser: !!user, 
        info, 
        sid: req.sessionID 
      });
      if (err) return res.status(500).json({ step: 'authenticate', err: String(err) });
      if (!user) return res.status(401).json({ step: 'authenticate', user: false, info });
      req.logIn(user, (e: any) => {
        if (e) return res.status(500).json({ step: 'login', err: String(e) });
        // Success: redirect to dashboard
        console.log('[AUTH][cb] Login successful, redirecting to /dashboard');
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
