import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler, Response, NextFunction } from "express";
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
    secret: process.env.SESSION_SECRET || "tier4-app-secret-key",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
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
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  // Disabled to avoid conflict with POST /api/login in routes.ts
  /*
  app.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });
  */

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  // Support both standard and auth-prefixed paths for logout route
  app.get("/api/logout", (req, res) => {
    console.log('Logout initiated for user:', req.user);
    
    // Store the session ID in a blacklist to prevent reuse
    const sessionId = req.sessionID;
    if (sessionId) {
      // Store blacklisted session (in production, use Redis or database)
      global.blacklistedSessions = global.blacklistedSessions || new Set();
      global.blacklistedSessions.add(sessionId);
      console.log('Blacklisted session:', sessionId);
    }
    
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
      }
      req.session.destroy((sessionErr) => {
        if (sessionErr) {
          console.error('Session destroy error:', sessionErr);
        }
        res.clearCookie('connect.sid');
        res.clearCookie('replit.sid'); // Clear any Replit-specific cookies
        
        // Redirect to a logout confirmation page that clears all auth state
        res.redirect(`${req.protocol}://${req.hostname}/logout-complete`);
      });
    });
  });
  
  // Add /api/auth/logout endpoint for Replit Auth
  app.get("/api/auth/logout", (req, res) => {
    console.log('Auth logout initiated for user:', req.user);
    
    // Store the session ID in a blacklist to prevent reuse
    const sessionId = req.sessionID;
    if (sessionId) {
      // Store blacklisted session (in production, use Redis or database)
      global.blacklistedSessions = global.blacklistedSessions || new Set();
      global.blacklistedSessions.add(sessionId);
      console.log('Blacklisted session:', sessionId);
    }
    
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
      }
      req.session.destroy((sessionErr) => {
        if (sessionErr) {
          console.error('Session destroy error:', sessionErr);
        }
        res.clearCookie('connect.sid');
        res.clearCookie('replit.sid'); // Clear any Replit-specific cookies
        
        // Redirect to a logout confirmation page that clears all auth state
        res.redirect(`${req.protocol}://${req.hostname}/logout-complete`);
      });
    });
  });

  // Add logout completion page
  app.get("/logout-complete", (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Logged Out</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            height: 100vh; 
            margin: 0; 
            background-color: #f5f5f5; 
          }
          .container { 
            text-align: center; 
            background: white; 
            padding: 2rem; 
            border-radius: 8px; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
          }
          .btn { 
            background: #007cba; 
            color: white; 
            padding: 10px 20px; 
            text-decoration: none; 
            border-radius: 4px; 
            display: inline-block; 
            margin-top: 1rem; 
          }
        </style>
        <script>
          // Clear any remaining authentication state
          localStorage.clear();
          sessionStorage.clear();
          
          // Clear all cookies
          document.cookie.split(";").forEach(function(c) { 
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
          });
        </script>
      </head>
      <body>
        <div class="container">
          <h2>You have been logged out</h2>
          <p>Your session has been terminated and all authentication data has been cleared.</p>
          <a href="/api/login" class="btn">Sign In Again</a>
        </div>
      </body>
      </html>
    `);
  });
}

// Clean authentication - will be rebuilt from scratch

// Strict authentication check - requires authentication
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  // Check if isAuthenticated function exists (Passport properly initialized)
  if (!req.isAuthenticated || typeof req.isAuthenticated !== 'function') {
    console.error('Passport not properly initialized - req.isAuthenticated is not a function');
    return res.status(500).json({ message: "Authentication system not initialized" });
  }

  if (!req.isAuthenticated() || !user?.expires_at) {
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