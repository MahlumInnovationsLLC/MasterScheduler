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
          "sid" varchar NOT NULL COLLATE "default",
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
      await pool.query(`
        ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid");
      `);
      console.log('Session primary key added successfully');
    }

  } catch (error) {
    console.error('Error initializing session store:', error.message);
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
          // Try to find user by email first (since frontend sends email as username)
          let user = await storage.getUserByEmail(username);
          
          // If not found by email, try by username for backward compatibility
          if (!user) {
            user = await storage.getUserByUsername(username);
          }

          if (!user) {
            return done(null, false, { message: 'Invalid email or password' });
          }

          if (!user.password) {
            return done(null, false, { message: 'Invalid email or password' });
          }

          const passwordMatch = await comparePasswords(password, user.password);

          if (!passwordMatch) {
            return done(null, false, { message: 'Invalid email or password' });
          }

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
}

export const isAuthenticated = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};