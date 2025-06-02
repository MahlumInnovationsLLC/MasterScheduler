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
  // Check if this is a new user or existing user
  const existingUser = await storage.getUser(claims["sub"]);
  const email = claims["email"];
  
  if (!existingUser && email) {
    // Check if the email is in our allowed list
    const emailCheck = await storage.checkIsEmailAllowed(email);
    console.log(`[REPLIT AUTH] Email check result for ${email}:`, emailCheck);
    
    // Handle first user as admin
    const allUsers = await storage.getUsers();
    const isFirstUser = allUsers.length === 0;
    
    // Determine role and approval status
    let userRole = "pending";
    let isApproved = false;
    
    if (isFirstUser) {
      userRole = "admin";
      isApproved = true;
      console.log(`[REPLIT AUTH] First user detected, setting as admin`);
    } else if (emailCheck && emailCheck.allowed) {
      userRole = emailCheck.defaultRole || "viewer";
      isApproved = emailCheck.autoApprove === true;
      console.log(`[REPLIT AUTH] Email pattern matched - Role: ${userRole}, Auto-approved: ${isApproved}`);
    } else {
      console.log(`[REPLIT AUTH] No email pattern match, user needs manual approval`);
    }
    
    // First-time login, check if we should auto-approve based on email pattern
    const userData = {
      id: claims["sub"],
      username: claims["username"],
      email: email,
      firstName: claims["first_name"],
      lastName: claims["last_name"],
      bio: claims["bio"],
      profileImageUrl: claims["profile_image_url"],
      role: userRole,
      isApproved: isApproved,
      lastLogin: new Date(),
    };
    
    console.log(`[REPLIT AUTH] Creating user with data:`, userData);
    await storage.upsertUser(userData);
  } else if (existingUser) {
    // Existing user - update last login
    await storage.updateUserLastLogin(claims["sub"]);
  } else {
    // Fallback for users without email
    await storage.upsertUser({
      id: claims["sub"],
      username: claims["username"],
      email: claims["email"],
      firstName: claims["first_name"],
      lastName: claims["last_name"],
      bio: claims["bio"],
      profileImageUrl: claims["profile_image_url"],
      role: "pending",
      isApproved: false,
      lastLogin: new Date(),
    });
  }
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

  app.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  // Support both standard and auth-prefixed paths for logout route
  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
  
  // Add /api/auth/logout endpoint for Replit Auth
  app.get("/api/auth/logout", (req, res) => {
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

// Optional authentication middleware that populates user info when available but doesn't require auth
export const withAuthInfo: RequestHandler = (req, res, next) => {
  // Continue with request whether authenticated or not
  next();
};

// Middleware to check if user has edit permissions, but don't block if not
export const hasEditRights = async (req: any, res: Response, next: NextFunction) => {
  console.log('hasEditRights middleware: checking if user has edit rights');
  
  // Default - no edit rights
  req.hasEditRights = false;
  req.userRole = null;
  
  // Development mode bypass
  if (process.env.NODE_ENV === 'development') {
    console.log('hasEditRights middleware: Development mode detected, granting edit rights');
    req.hasEditRights = true;
    req.userRole = 'admin';
    req.userDetails = { id: 'dev-user', role: 'admin', isApproved: true };
    return next();
  }
  
  // Check if authenticated
  if (req.isAuthenticated() && req.user && req.user.claims && req.user.claims.sub) {
    // Look up the DB user to check approval status and role
    const dbUser = await storage.getUser(req.user.claims.sub);
    
    if (dbUser && dbUser.isApproved) {
      req.hasEditRights = true;
      req.userRole = dbUser.role;
      req.userDetails = dbUser;
    }
  }
  
  // Continue with the request regardless of authentication
  next();
};

// Check if user has admin role
export const isAdmin = async (req: any, res: Response, next: NextFunction) => {
  // Development mode bypass
  if (process.env.NODE_ENV === 'development') {
    req.userRole = "admin";
    req.userDetails = { id: 'dev-user', role: 'admin', isApproved: true };
    return next();
  }

  // First check if authenticated and approved
  if (!req.isAuthenticated() || !req.user || !req.user.claims || !req.user.claims.sub) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  // Look up the DB user to check role
  const dbUser = await storage.getUser(req.user.claims.sub);
  
  if (!dbUser || !dbUser.isApproved || dbUser.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  
  // User is admin, proceed
  req.userRole = "admin";
  req.userDetails = dbUser;
  next();
};

// Check if user has at least editor role
export const isEditor = async (req: any, res: Response, next: NextFunction) => {
  // Development mode bypass
  if (process.env.NODE_ENV === 'development') {
    req.userRole = "admin";
    req.userDetails = { id: 'dev-user', role: 'admin', isApproved: true };
    return next();
  }

  // First check if authenticated and approved
  if (!req.isAuthenticated() || !req.user || !req.user.claims || !req.user.claims.sub) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  // Look up the DB user to check role
  const dbUser = await storage.getUser(req.user.claims.sub);
  
  if (!dbUser || !dbUser.isApproved) {
    return res.status(403).json({ message: "Approved user access required" });
  }
  
  if (dbUser.role !== "admin" && dbUser.role !== "editor") {
    return res.status(403).json({ message: "Editor or admin access required" });
  }
  
  // User is editor or admin, proceed
  req.userRole = dbUser.role;
  req.userDetails = dbUser;
  next();
};

// Strict authentication check - requires authentication
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // Development mode bypass
  if (process.env.NODE_ENV === 'development') {
    console.log('isAuthenticated middleware: Development mode detected, bypassing authentication');
    return next();
  }

  const user = req.user as any;

  if (!req.isAuthenticated() || !user || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    // Check if user is approved in the database
    if (user.claims?.sub) {
      const dbUser = await storage.getUser(user.claims.sub);
      if (dbUser && !dbUser.isApproved) {
        return res.status(403).json({ 
          message: "Your account is pending approval", 
          status: "pending_approval" 
        });
      }
      
      // Add user details to the request
      req.userRole = dbUser?.role || "pending";
      req.userDetails = dbUser;
    }
    
    return next();
  }

  // Try refreshing the token if expired
  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    return res.redirect("/api/login");
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    
    // Check if user is approved after refresh
    if (user.claims?.sub) {
      const dbUser = await storage.getUser(user.claims.sub);
      if (dbUser && !dbUser.isApproved) {
        return res.status(403).json({ 
          message: "Your account is pending approval", 
          status: "pending_approval" 
        });
      }
      
      // Add user details to the request
      req.userRole = dbUser?.role || "pending";
      req.userDetails = dbUser;
    }
    
    return next();
  } catch (error) {
    return res.redirect("/api/login");
  }
};