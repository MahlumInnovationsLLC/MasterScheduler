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
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

async function initializeSessionStore() {
  try {
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
          "sid" varchar NOT NULL COLLATE "default" PRIMARY KEY,
          "sess" jsonb NOT NULL,
          "expire" timestamp(6) NOT NULL
        )
        WITH (OIDS=FALSE);
      `);
      console.log('Session table created successfully');
    }

    // Check if index exists
    const indexExists = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'session' 
        AND indexname = 'IDX_session_expire'
      );
    `);

    if (!indexExists.rows[0].exists) {
      console.log('Creating session index...');
      await pool.query(`
        CREATE INDEX "IDX_session_expire" ON "session" ("expire");
      `);
      console.log('Session index created successfully');
    }

    // Ensure primary key exists
    const pkExists = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'session' 
        AND constraint_type = 'PRIMARY KEY'
      );
    `);

    if (!pkExists.rows[0].exists) {
      console.log('Adding primary key to session table...');
      try {
        await pool.query(`
          ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid");
        `);
        console.log('Session primary key added successfully');
      } catch (pkError) {
        if (pkError.code === '42P16') {
          // Primary key already exists, ignore
          console.log('Primary key already exists (expected)');
        } else {
          throw pkError;
        }
      }
    }

  } catch (error) {
    console.error('Error initializing session store:', error.message);
    
    // If we have constraint issues, try to recreate the session table
    if (error.code === '42P10' || error.message.includes('ON CONFLICT')) {
      try {
        console.log('Attempting to fix session table...');
        await pool.query('DROP TABLE IF EXISTS "session";');
        await pool.query(`
          CREATE TABLE "session" (
            "sid" varchar NOT NULL COLLATE "default" PRIMARY KEY,
            "sess" jsonb NOT NULL,
            "expire" timestamp(6) NOT NULL
          )
          WITH (OIDS=FALSE);
        `);
        await pool.query(`
          CREATE INDEX "IDX_session_expire" ON "session" ("expire");
        `);
        console.log('Session table recreated successfully');
      } catch (recreateError) {
        console.error('Failed to recreate session table:', recreateError.message);
      }
    }
    // Don't throw the error to prevent server crash
  }
}

export async function setupAuth(app: Express) {
  // Initialize session store first
  await initializeSessionStore();

  const PostgresSessionStore = connectPg(session);

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'your-secret-key-here',
    resave: false,
    saveUninitialized: false,
    store: new PostgresSessionStore({ 
      pool: pool, 
      createTableIfMissing: false, // We handle table creation manually
      errorLog: (error) => {
        console.error('Session store error:', error.message);
      }
    }),
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

          if (!user.password) {
            console.log(`[AUTH] User found but no password set for: ${username}`);
            return done(null, false, { message: 'Invalid email or password' });
          }

          console.log(`[AUTH] Verifying password for user: ${user.email || user.username}`);
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
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error('Login authentication error:', err);
        return res.status(500).json({ error: "Authentication error" });
      }
      if (!user) {
        console.log('Login failed:', info?.message || "Invalid credentials");
        return res.status(401).json({ error: info?.message || "Invalid email or password" });
      }
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error('Login session error:', loginErr);
          return res.status(500).json({ error: "Login failed" });
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
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json({
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role
    });
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
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};