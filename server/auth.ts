import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual, createHash } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

// Generate device fingerprint based on headers and IP
function generateDeviceFingerprint(req: any): string {
  const userAgent = req.headers['user-agent'] || '';
  const acceptLanguage = req.headers['accept-language'] || '';
  const acceptEncoding = req.headers['accept-encoding'] || '';
  const ip = req.ip || req.connection.remoteAddress || '';
  
  // Create a stable fingerprint from device characteristics
  const fingerprint = `${userAgent}|${acceptLanguage}|${acceptEncoding}|${ip}`;
  return createHash('sha256').update(fingerprint).digest('hex');
}

// Check if session has expired based on remember me preference
function isSessionExpired(lastActivity: Date, rememberMe: boolean = false): boolean {
  const now = new Date();
  const sessionDuration = rememberMe 
    ? 30 * 24 * 60 * 60 * 1000  // 30 days for remember me
    : 7 * 24 * 60 * 60 * 1000;  // 7 days for regular sessions
  return (now.getTime() - lastActivity.getTime()) > sessionDuration;
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

async function initializeSessionStore() {
  try {
    console.log('Checking session table...');
    
    // Check if session table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'session'
      );
    `);

    if (!tableExists.rows[0].exists) {
      console.log('Creating session table...');
      await pool.query(`
        CREATE TABLE "session" (
          "sid" varchar NOT NULL PRIMARY KEY,
          "sess" jsonb NOT NULL,
          "expire" timestamp(6) NOT NULL
        );
      `);
      
      await pool.query(`
        CREATE INDEX "IDX_session_expire" ON "session" ("expire");
      `);
      
      console.log('Session table created successfully');
    } else {
      console.log('Session table already exists');
    }
    
    return true;
  } catch (error) {
    console.log('Session table initialization failed:', error.message);
    return false;
  }
}

export async function setupAuth(app: Express) {
  // Initialize session store first
  const storeInitialized = await initializeSessionStore();

  const PostgresSessionStore = connectPg(session);

  let sessionStore;
  if (storeInitialized) {
    try {
      sessionStore = new PostgresSessionStore({ 
        pool: pool, 
        createTableIfMissing: false,
        ttl: 7 * 24 * 60 * 60, // 7 days in seconds (extended from 24 hours)
        errorLog: (error) => {
          // Only log unexpected errors, not connection issues
          if (!error.message.includes('already exists') && 
              !error.message.includes('IDX_session_expire') &&
              !error.code?.includes('42P07')) {
            console.log('Session store notice:', error.message);
          }
        }
      });
      console.log('PostgreSQL session store initialized');
    } catch (storeError) {
      console.log('Using memory session store due to:', storeError.message);
      sessionStore = undefined; // Will use default memory store
    }
  } else {
    console.log('Using memory session store - database not available');
    sessionStore = undefined;
  }

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'tier4-production-secret-key',
    resave: false,
    saveUninitialized: false,
    rolling: true, // Reset expiration on activity
    store: sessionStore,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (extended from 24 hours)
      httpOnly: true,
      sameSite: 'lax' // Better for same-origin requests
    }
  };

  app.use(session(sessionSettings));
  
  // Simplified session activity tracking middleware
  app.use((req: any, res: any, next: any) => {
    // Skip auth routes and static assets
    if (req.path.includes('/api/login') || req.path.includes('/api/register') || 
        req.path.includes('/auth') || req.path.includes('/health') ||
        req.path.includes('/assets/') || req.path.includes('/favicon.ico')) {
      return next();
    }

    // Only update activity for authenticated sessions, don't destroy them here
    if (req.session && req.session.user) {
      const currentFingerprint = generateDeviceFingerprint(req);
      const sessionFingerprint = req.session.deviceFingerprint;
      
      // Update device fingerprint if changed (but don't destroy session)
      if (!sessionFingerprint || sessionFingerprint !== currentFingerprint) {
        req.session.deviceFingerprint = currentFingerprint;
      }
      
      // Update last activity timestamp
      req.session.lastActivity = new Date();
    }
    
    next();
  });
  
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      {
        usernameField: 'username', // Still expect 'username' field from frontend
        passwordField: 'password'
      },
      async (username, password, done) => {
        try {
          console.log(`[AUTH] Attempting login for: ${username}`);
          
          // Try to find user by email first (since frontend sends email as username)
          let user = await storage.getUserByEmail(username);
          console.log(`[AUTH] User found by email: ${user ? 'Yes' : 'No'}`);
          
          // If not found by email, try by username for backward compatibility
          if (!user) {
            user = await storage.getUserByUsername(username);
            console.log(`[AUTH] User found by username: ${user ? 'Yes' : 'No'}`);
          }

          if (!user) {
            console.log(`[AUTH] No user found for: ${username}`);
            return done(null, false, { message: 'Invalid email or password' });
          }

          if (!user.password) {
            console.log(`[AUTH] User found but no password set for: ${username}`);
            return done(null, false, { message: 'Invalid email or password' });
          }

          console.log(`[AUTH] Verifying password for user: ${user.email || user.username}`);
          console.log(`[AUTH] Stored password hash: ${user.password}`);
          console.log(`[AUTH] Input password: ${password}`);
          const passwordMatch = await comparePasswords(password, user.password);
          console.log(`[AUTH] Password match: ${passwordMatch}`);

          if (!passwordMatch) {
            return done(null, false, { message: 'Invalid email or password' });
          }

          console.log(`[AUTH] Login successful for: ${user.email || user.username}`);
          return done(null, user);
        } catch (error) {
          console.error('Authentication error:', error);
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Register endpoint
  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, email, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      const user = await storage.createUser({
        id: crypto.randomUUID(),
        username,
        email,
        password: await hashPassword(password),
        role: 'user',
        isApproved: true
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json({ 
          id: user.id, 
          username: user.username, 
          email: user.email, 
          role: user.role 
        });
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // Login endpoint
  app.post("/api/login", (req, res, next) => {
    const deviceFingerprint = generateDeviceFingerprint(req);
    const rememberMe = req.body.rememberMe || false;
    
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error('Login authentication error:', err);
        return res.status(500).json({ error: "Authentication error: " + err.message });
      }
      if (!user) {
        console.log('Login failed:', info?.message || "Invalid credentials");
        return res.status(401).json({ error: info?.message || "Invalid email or password" });
      }
      
      // Try to login the user
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error('Login session error:', loginErr);
          return res.status(500).json({ error: "Session creation failed" });
        }
        
        // Store device fingerprint and activity time in session
        (req.session as any).deviceFingerprint = deviceFingerprint;
        (req.session as any).lastActivity = new Date();
        (req.session as any).user = user;
        (req.session as any).rememberMe = rememberMe;
        
        // Update last login in the database
        try {
          await storage.updateUser(user.id, { lastLogin: new Date() });
          console.log(`[LOGIN] Updated last login for user: ${user.email || user.username}`);
        } catch (error) {
          console.error('Failed to update last login:', error);
        }
        
        // Set cookie duration based on "Remember Me" preference
        if (rememberMe) {
          // Extended session: 30 days
          req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
          console.log(`[LOGIN] Extended session (30 days) set for user: ${user.email || user.username}`);
        } else {
          // Regular session: 7 days
          req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000;
          console.log(`[LOGIN] Regular session (7 days) set for user: ${user.email || user.username}`);
        }
        
        // Force save session to ensure persistence
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error('Session save error:', saveErr);
            return res.status(500).json({ error: "Session persistence failed" });
          }
          
          console.log(`Login successful for user: ${user.email || user.username} from device: ${deviceFingerprint.substring(0, 8)}...`);
          res.json({ 
            id: user.id, 
            username: user.username, 
            email: user.email, 
            role: user.role 
          });
        });
      });
    })(req, res, next);
  });

  // Logout endpoint
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy((sessionErr) => {
        if (sessionErr) {
          console.error('Session destroy error:', sessionErr);
        }
        res.clearCookie('connect.sid');
        res.json({ message: "Logged out successfully" });
      });
    });
  });

  // Get current user endpoint
  app.get("/api/user", async (req, res) => {
    try {
      // Check session first
      const sessionUser = (req.session as any)?.user;
      if (!sessionUser) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      // Check session expiration only for the /api/user endpoint to avoid frequent checks
      const lastActivity = (req.session as any)?.lastActivity ? new Date((req.session as any).lastActivity) : new Date();
      const rememberMe = (req.session as any)?.rememberMe || false;
      
      // Only check expiration if it's been more than 1 hour since last activity
      const oneHour = 60 * 60 * 1000;
      const timeSinceActivity = new Date().getTime() - lastActivity.getTime();
      
      if (timeSinceActivity > oneHour && isSessionExpired(lastActivity, rememberMe)) {
        const duration = rememberMe ? '30 days' : '7 days';
        console.log(`[USER ENDPOINT] Session expired for user ${sessionUser.email} (${duration} duration, remember me: ${rememberMe})`);
        req.session.destroy((err: any) => {
          if (err) console.error('Session destroy error:', err);
        });
        return res.status(401).json({ error: "Session expired" });
      }
      
      // Update device fingerprint if changed (don't invalidate session)
      const currentFingerprint = generateDeviceFingerprint(req);
      const sessionFingerprint = (req.session as any)?.deviceFingerprint;
      if (sessionFingerprint && sessionFingerprint !== currentFingerprint) {
        console.log(`[USER ENDPOINT] Device fingerprint updated for user ${sessionUser.email}`);
        (req.session as any).deviceFingerprint = currentFingerprint;
      }
      
      // Get fresh user data from database to ensure role is current
      const user = await storage.getUser(sessionUser.id);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      
      // Update last activity
      (req.session as any).lastActivity = new Date();
      
      console.log(`[USER ENDPOINT] Returning user data: ${user.email} with role ${user.role}`);
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      });
    } catch (error) {
      console.error('User endpoint error:', error);
      res.status(401).json({ error: "Authentication error" });
    }
  });

  // Debug endpoint to check if user exists
  app.get("/api/debug/user/:email", async (req, res) => {
    try {
      const email = req.params.email;
      const user = await storage.getUserByEmail(email);
      res.json({
        exists: !!user,
        hasPassword: !!(user?.password),
        email: user?.email,
        username: user?.username,
        role: user?.role
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Debug endpoint to create user (for development)
  app.post("/api/debug/create-user", async (req, res) => {
    try {
      const { email, password, username, role = 'admin' } = req.body;
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }

      const user = await storage.createUser({
        id: crypto.randomUUID(),
        username: username || email.split('@')[0],
        email,
        password: await hashPassword(password),
        role,
        isApproved: true
      });

      res.json({ 
        success: true,
        id: user.id, 
        username: user.username, 
        email: user.email, 
        role: user.role 
      });
    } catch (error) {
      console.error('User creation error:', error);
      res.status(500).json({ error: "User creation failed" });
    }
  });

  // Debug endpoint to reset user password (for development)
  app.post("/api/debug/reset-password", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const hashedPassword = await hashPassword(password);
      await storage.updateUser(user.id, { password: hashedPassword });

      res.json({ 
        success: true,
        message: "Password updated successfully",
        email: user.email 
      });
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({ error: "Password reset failed" });
    }
  });
}

export const isAuthenticated = (req: any, res: any, next: any) => {
  try {
    console.log(`[AUTH MIDDLEWARE] Checking authentication for ${req.method} ${req.url}`);
    
    // Check session user
    const sessionUser = (req.session as any)?.user;
    if (!sessionUser) {
      console.log(`[AUTH MIDDLEWARE] ❌ No session user found`);
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Validate session hasn't expired
    const lastActivity = (req.session as any)?.lastActivity ? new Date((req.session as any).lastActivity) : new Date();
    if (isSessionExpired(lastActivity)) {
      console.log(`[AUTH MIDDLEWARE] ❌ Session expired for ${sessionUser.email}`);
      req.session.destroy((err: any) => {
        if (err) console.error('Session destroy error:', err);
      });
      return res.status(401).json({ message: "Session expired" });
    }
    
    // More lenient device fingerprint validation
    const currentFingerprint = generateDeviceFingerprint(req);
    const sessionFingerprint = (req.session as any)?.deviceFingerprint;
    if (sessionFingerprint && sessionFingerprint !== currentFingerprint) {
      console.log(`[AUTH MIDDLEWARE] ⚠️ Device fingerprint changed for ${sessionUser.email}, updating...`);
      // Update fingerprint instead of destroying session
      (req.session as any).deviceFingerprint = currentFingerprint;
    }
    
    // Update last activity and save session
    (req.session as any).lastActivity = new Date();
    req.user = sessionUser; // Set user for downstream middleware
    
    // Save session to ensure persistence
    req.session.save((err: any) => {
      if (err) {
        console.error('Session save error:', err);
      }
    });
    
    console.log(`[AUTH MIDDLEWARE] ✅ Authentication successful for ${sessionUser.email} with role ${sessionUser.role}`);
    return next();
  } catch (error) {
    console.error('[AUTH MIDDLEWARE] Error in authentication check:', error);
    res.status(401).json({ message: "Authentication error" });
  }
};

// Admin-only middleware
export const requireAdmin = async (req: any, res: any, next: any) => {
  try {
    console.log(`[ADMIN MIDDLEWARE] Checking admin access for ${req.method} ${req.url}`);
    
    // Check session user first (consistent with main auth middleware)
    const sessionUser = (req.session as any)?.user;
    if (!sessionUser) {
      console.log(`[ADMIN MIDDLEWARE] ❌ No session user found`);
      return res.status(401).json({ message: "Authentication required" });
    }

    console.log(`[ADMIN MIDDLEWARE] Session user: ${sessionUser.email} with role ${sessionUser.role}`);

    // Get fresh user data from database to ensure role is current
    const user = await storage.getUser(sessionUser.id);
    if (!user) {
      console.log(`[ADMIN MIDDLEWARE] ❌ User not found in database`);
      return res.status(401).json({ message: "User not found" });
    }

    console.log(`[ADMIN MIDDLEWARE] Fresh user data - ${user.email} has role: ${user.role}`);
    
    if (user.role !== 'admin') {
      console.log(`[ADMIN MIDDLEWARE] ❌ Access denied - user role ${user.role} is not admin`);
      return res.status(403).json({ message: "Admin access required" });
    }

    console.log(`[ADMIN MIDDLEWARE] ✅ Admin access granted for ${user.email}`);
    req.user = user; // Update req.user with fresh data
    return next();
  } catch (error) {
    console.error('[ADMIN MIDDLEWARE] Error in admin check:', error);
    res.status(500).json({ message: "Server error" });
  }
};

// Editor or Admin middleware
export const requireEditor = async (req: any, res: any, next: any) => {
  try {
    console.log(`🔍 Auth middleware: Checking authentication for ${req.method} ${req.url}`);
    
    // Check session user first (consistent with main auth middleware)
    const sessionUser = (req.session as any)?.user;
    if (!sessionUser) {
      console.log(`🔍 Auth middleware: ❌ No session user found`);
      return res.status(401).json({ message: "Authentication required" });
    }

    console.log(`✅ Authenticated user: ${sessionUser.email} with role ${sessionUser.role}`);

    // Get fresh user data from database to ensure role is current
    const user = await storage.getUser(sessionUser.id);
    if (!user) {
      console.log(`🔍 Auth middleware: ❌ User not found in database`);
      return res.status(401).json({ message: "User not found" });
    }

    console.log(`🔍 Auth middleware: Fresh user data - ${user.email} has role: ${user.role}`);
    
    if (user.role !== 'admin' && user.role !== 'editor') {
      console.log(`🔍 Auth middleware: ❌ Access denied - user role ${user.role} is not admin or editor`);
      return res.status(403).json({ message: "Editor or Admin access required" });
    }

    console.log(`✅ Editor access granted for: ${user.email}`);
    req.user = user; // Update req.user with fresh data
    return next();
  } catch (error) {
    console.error('[EDITOR MIDDLEWARE] Error in editor check:', error);
    res.status(500).json({ message: "Server error" });
  }
};