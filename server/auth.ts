import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
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

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  try {
    // Handle empty or invalid passwords
    if (!supplied || !stored) {
      console.log('[PASSWORD] Empty password or stored hash');
      return false;
    }

    // Check if stored password has the expected format (hash.salt)
    if (!stored.includes('.')) {
      console.log('[PASSWORD] Invalid stored password format - missing salt separator');
      return false;
    }

    const [hashed, salt] = stored.split(".");
    
    // Validate hash and salt
    if (!hashed || !salt) {
      console.log('[PASSWORD] Invalid stored password format - missing hash or salt');
      return false;
    }

    // Validate hex format
    if (!/^[0-9a-f]+$/i.test(hashed)) {
      console.log('[PASSWORD] Invalid hash format - not hexadecimal');
      return false;
    }

    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    
    const isMatch = timingSafeEqual(hashedBuf, suppliedBuf);
    console.log(`[PASSWORD] Comparison result: ${isMatch}`);
    return isMatch;
  } catch (error) {
    console.error('[PASSWORD] Error during password comparison:', error);
    return false;
  }
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
    
  } catch (error) {
    console.log('Session initialization skipped:', error.message);
    // Don't log as error - this is expected during restarts
  }
}

export async function setupAuth(app: Express) {
  // Initialize session store first
  await initializeSessionStore();

  const PostgresSessionStore = connectPg(session);

  let sessionStore;
  try {
    sessionStore = new PostgresSessionStore({ 
      pool: pool, 
      createTableIfMissing: false,
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

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'your-secret-key-here',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  };

  app.use(session(sessionSettings));
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

          // Check if user is approved and active
          if (user.status === 'archived') {
            console.log(`[AUTH] User account is archived: ${username}`);
            return done(null, false, { message: 'Account has been archived' });
          }

          if (!user.isApproved) {
            console.log(`[AUTH] User account not approved: ${username}`);
            return done(null, false, { message: 'Account is pending approval' });
          }

          if (!user.password) {
            console.log(`[AUTH] User found but no password set for: ${username}`);
            return done(null, false, { message: 'Invalid email or password' });
          }

          console.log(`[AUTH] Verifying password for user: ${user.email || user.username}`);
          console.log(`[AUTH] User status: ${user.status}, isApproved: ${user.isApproved}`);
          console.log(`[AUTH] Password hash length: ${user.password.length}`);
          
          try {
            const passwordMatch = await comparePasswords(password, user.password);
            console.log(`[AUTH] Password match: ${passwordMatch}`);

            if (!passwordMatch) {
              console.log(`[AUTH] Password verification failed for: ${username}`);
              return done(null, false, { message: 'Invalid email or password' });
            }

            // Update last login time
            await storage.updateUserLastLogin(user.id);
            console.log(`[AUTH] Login successful for: ${user.email || user.username}`);
            return done(null, user);
          } catch (passwordError) {
            console.error(`[AUTH] Password comparison error for ${username}:`, passwordError);
            return done(null, false, { message: 'Authentication error' });
          }
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
          // If session fails, still return success but warn
          console.warn('Session creation failed, but user is authenticated');
          return res.json({ 
            id: user.id, 
            username: user.username, 
            email: user.email, 
            role: user.role,
            warning: "Session may not persist"
          });
        }
        console.log('Login successful for user:', user.email || user.username);
        res.json({ 
          id: user.id, 
          username: user.username, 
          email: user.email, 
          role: user.role 
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
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      // Get fresh user data from database to ensure role is current
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      
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

  // Debug endpoint to check user account details
  app.get("/api/debug/check-user/:email", async (req, res) => {
    try {
      const email = req.params.email;
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.json({
          found: false,
          message: "User not found"
        });
      }

      res.json({
        found: true,
        email: user.email,
        username: user.username,
        role: user.role,
        status: user.status,
        isApproved: user.isApproved,
        hasPassword: !!user.password,
        passwordLength: user.password ? user.password.length : 0,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      });
    } catch (error) {
      console.error('User check error:', error);
      res.status(500).json({ error: "Failed to check user" });
    }
  });

  // Debug endpoint to fix user account status
  app.post("/api/debug/fix-user-account", async (req, res) => {
    try {
      const { email } = req.body;
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Fix common issues with user accounts
      const updates: any = {};
      
      if (user.status === 'archived') {
        updates.status = 'active';
      }
      
      if (!user.isApproved) {
        updates.isApproved = true;
      }

      if (Object.keys(updates).length > 0) {
        await storage.updateUser(user.id, updates);
        console.log(`Fixed user account for ${email}:`, updates);
      }

      res.json({ 
        success: true,
        message: "User account fixed",
        email: user.email,
        changesApplied: updates
      });
    } catch (error) {
      console.error('User fix error:', error);
      res.status(500).json({ error: "Failed to fix user account" });
    }
  });
}

export const isAuthenticated = (req: any, res: any, next: any) => {
  try {
    console.log(`[AUTH MIDDLEWARE] Checking authentication for ${req.method} ${req.url}`);
    console.log(`[AUTH MIDDLEWARE] User authenticated: ${req.isAuthenticated()}`);
    console.log(`[AUTH MIDDLEWARE] User object:`, req.user ? {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role
    } : 'No user');

    if (req.isAuthenticated() && req.user) {
      console.log(`[AUTH MIDDLEWARE] ✅ Authentication successful for ${req.user.email} with role ${req.user.role}`);
      return next();
    }
    
    console.log(`[AUTH MIDDLEWARE] ❌ Authentication failed - not authenticated or no user`);
    res.status(401).json({ message: "Unauthorized" });
  } catch (error) {
    console.error('[AUTH MIDDLEWARE] Error in authentication check:', error);
    res.status(401).json({ message: "Authentication error" });
  }
};

// Admin-only middleware
export const requireAdmin = async (req: any, res: any, next: any) => {
  try {
    console.log(`[ADMIN MIDDLEWARE] Checking admin access for ${req.method} ${req.url}`);
    
    if (!req.isAuthenticated() || !req.user) {
      console.log(`[ADMIN MIDDLEWARE] ❌ Not authenticated`);
      return res.status(401).json({ message: "Authentication required" });
    }

    // Get fresh user data from database to ensure role is current
    const user = await storage.getUser(req.user.id);
    if (!user) {
      console.log(`[ADMIN MIDDLEWARE] ❌ User not found in database`);
      return res.status(401).json({ message: "User not found" });
    }

    console.log(`[ADMIN MIDDLEWARE] User ${user.email} has role: ${user.role}`);
    
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
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Get fresh user data from database
    const user = await storage.getUser(req.user.id);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (user.role !== 'admin' && user.role !== 'editor') {
      return res.status(403).json({ message: "Editor or Admin access required" });
    }

    req.user = user; // Update req.user with fresh data
    return next();
  } catch (error) {
    console.error('[EDITOR MIDDLEWARE] Error in editor check:', error);
    res.status(500).json({ message: "Server error" });
  }
};