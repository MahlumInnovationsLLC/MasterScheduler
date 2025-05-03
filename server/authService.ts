import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { Express } from "express";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { z } from "zod";
import { db } from "./db";
import { storage } from "./storage";
import { eq } from "drizzle-orm";
import { users, type User } from "@shared/schema";
import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { ParamsDictionary } from "express-serve-static-core";
import { ParsedQs } from "qs";
import { sendPasswordResetEmail } from "./emailService";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      userRole?: string;
      userDetails?: any;
      hasEditRights?: boolean;
    }
    
    // SessionUser interface for session
    interface User {
      id: string;
      username: string;
      email?: string | null;
      role?: string | null;
      isApproved?: boolean | null;
      firstName?: string | null;
      lastName?: string | null;
      lastLogin?: Date | null;
      // Sensitive fields - will be omitted when sending to client
      password?: string | null;
      passwordResetToken?: string | null;
      passwordResetExpires?: Date | null;
      createdAt?: Date | null;
      updatedAt?: Date | null;
    }
  }
}

const scryptAsync = promisify(scrypt);

// Password hashing functions
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  if (!stored || !supplied) {
    console.log("DEBUG: Missing password or stored hash");
    return false;
  }
  
  const [hashed, salt] = stored.split(".");
  if (!hashed || !salt) {
    console.log("DEBUG: Invalid stored hash format (missing salt)");
    return false;
  }
  
  try {
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    
    // Add debug info
    console.log("DEBUG: Password comparison");
    console.log("DEBUG: Hash length:", hashedBuf.length);
    console.log("DEBUG: Input hash length:", suppliedBuf.length);
    
    const result = timingSafeEqual(hashedBuf, suppliedBuf);
    console.log("DEBUG: Password comparison result:", result);
    
    return result;
  } catch (error) {
    console.error("DEBUG: Error in password comparison:", error);
    return false;
  }
}

// Auth setup
export function setupSession(app: Express) {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  app.set("trust proxy", 1);
  
  // Make sure SESSION_SECRET exists in production
  if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
    console.error("SESSION_SECRET environment variable is required in production");
    process.env.SESSION_SECRET = randomBytes(32).toString('hex');
  }
  
  app.use(session({
    secret: process.env.SESSION_SECRET || "tier4-app-secret-key",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      // Set secure based on protocol - only set to true if using HTTPS
      secure: process.env.NODE_ENV === "production" && process.env.REPLIT_DOMAINS !== undefined,
      maxAge: sessionTtl,
      // Add SameSite attribute to improve cookie handling across browsers
      sameSite: process.env.NODE_ENV === "production" ? 'none' : 'lax',
      // Allow cookies to be used across subdomains
      domain: process.env.NODE_ENV === "production" ? 
        (process.env.REPLIT_DOMAINS ? `.${process.env.REPLIT_DOMAINS.split(',')[0]}` : undefined) : undefined,
    },
  }));
  
  app.use(passport.initialize());
  app.use(passport.session());
}

// Setup local auth
export function setupLocalAuth(app: Express) {
  // Local strategy for email/password login
  passport.use(new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
    },
    async (email, password, done) => {
      try {
        // Find the user by email
        const [user] = await db.select().from(users).where(eq(users.email, email));
        
        if (!user) {
          return done(null, false, { message: 'Email not registered' });
        }
        
        // Check if the user has a password (might not if using Replit auth previously)
        if (!user.password) {
          return done(null, false, { message: 'Please reset your password' });
        }
        
        // Verify password
        const isValid = await comparePasswords(password, user.password);
        if (!isValid) {
          return done(null, false, { message: 'Incorrect password' });
        }
        
        // Update last login timestamp
        await storage.updateUserLastLogin(user.id);
        
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  ));
  
  // Serialize user to session
  passport.serializeUser((user: any, done) => {
    console.log('Serializing user:', user.id);
    done(null, user.id);
  });
  
  // Deserialize user from session
  passport.deserializeUser(async (id: string, done) => {
    try {
      console.log('Deserializing user ID:', id);
      const user = await storage.getUser(id);
      
      if (!user) {
        console.log('User not found during deserialization. ID:', id);
        return done(null, false);
      }
      
      console.log('User successfully deserialized:', user.id);
      done(null, user);
    } catch (error) {
      console.error('Error deserializing user:', error);
      done(error);
    }
  });
  
  // Registration validation schema
  const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
  });
  
  // Login validation schema
  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
  });
  
  // Reset password request schema
  const resetRequestSchema = z.object({
    email: z.string().email(),
  });
  
  // Reset password validation schema
  const resetPasswordSchema = z.object({
    token: z.string(),
    password: z.string().min(8),
  });
  
  // Define auth routes
  
  // Login route
  app.post('/api/auth/login', (req, res, next) => {
    try {
      // Validate request
      const result = loginSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid login data", 
          errors: result.error.errors 
        });
      }
      
      passport.authenticate('local', (err: any, user: any, info: any) => {
        if (err) {
          return next(err);
        }
        
        if (!user) {
          return res.status(401).json({ message: info.message || 'Authentication failed' });
        }
        
        // Check if user is approved
        if (!user.isApproved) {
          return res.status(403).json({ 
            message: "Your account is pending approval", 
            status: "pending_approval" 
          });
        }
        
        req.login(user, (loginErr) => {
          if (loginErr) {
            return next(loginErr);
          }
          
          // Return user info without sensitive data
          const { password, passwordResetToken, passwordResetExpires, ...safeUser } = user;
          return res.json(safeUser);
        });
      })(req, res, next);
    } catch (error) {
      next(error);
    }
  });
  
  // Register route
  app.post('/api/auth/register', async (req, res, next) => {
    try {
      // Validate request
      const result = registerSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid registration data", 
          errors: result.error.errors 
        });
      }
      
      const { email, password, firstName, lastName } = req.body;
      
      // Check if email already exists
      const existingUser = await db.select().from(users).where(eq(users.email, email));
      if (existingUser.length > 0) {
        return res.status(400).json({ message: "Email already registered" });
      }
      
      // Check if email is allowed
      const emailCheck = await storage.checkIsEmailAllowed(email);
      if (!emailCheck || !emailCheck.allowed) {
        return res.status(403).json({ message: "Email domain not allowed for registration" });
      }
      
      // Hash password
      const hashedPassword = await hashPassword(password);
      
      // Get all users to check if this is the first user
      const allUsers = await storage.getUsers();
      
      // Create user
      const newUser = await storage.createUser({
        id: randomUUID(),
        username: email.split('@')[0] || email, // Use email username part as username
        email,
        password: hashedPassword,
        firstName: firstName || "",
        lastName: lastName || "",
        role: allUsers.length === 0 ? "admin" : (emailCheck.defaultRole || "pending"),
        isApproved: allUsers.length === 0 ? true : (emailCheck.autoApprove || false),
        lastLogin: new Date(),
      });
      
      // Auto-login if user is approved
      if (newUser.isApproved) {
        req.login(newUser, (loginErr) => {
          if (loginErr) {
            return next(loginErr);
          }
          
          // Return user info without sensitive data
          const { password, passwordResetToken, passwordResetExpires, ...safeUser } = newUser;
          return res.status(201).json(safeUser);
        });
      } else {
        // Don't auto-login pending users
        const { password, passwordResetToken, passwordResetExpires, ...safeUser } = newUser;
        return res.status(201).json({
          ...safeUser,
          message: "Registration successful. Your account is pending approval.",
          status: "pending_approval"
        });
      }
    } catch (error) {
      next(error);
    }
  });
  
  // Logout route
  app.post('/api/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });
  
  // Get current user route
  app.get('/api/auth/user', async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const user = req.user as any;
      
      // Fetch the user from the database if we have a sub claim
      if (user.claims?.sub) {
        const dbUser = await storage.getUser(user.claims.sub);
        
        if (dbUser) {
          // Remove sensitive information
          const { password, passwordResetToken, passwordResetExpires, ...safeUser } = dbUser;
          
          // Add session info to the user object
          return res.json({
            ...safeUser,
            isAuthenticated: true,
            // Include any other session info needed
            sessionInfo: {
              expires_at: user.expires_at
            }
          });
        }
      }
      
      // If we don't have a sub claim or can't find the user in the database
      // just return the session user info
      const { password, passwordResetToken, passwordResetExpires, ...safeUser } = user;
      return res.json({
        ...safeUser,
        isAuthenticated: true
      });
    } catch (error) {
      console.error("Error retrieving user information:", error);
      return res.status(500).json({ message: "Failed to retrieve user information" });
    }
  });
  
  // Request password reset route
  app.post('/api/auth/reset-request', async (req, res, next) => {
    try {
      // Validate request
      const result = resetRequestSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid email", 
          errors: result.error.errors 
        });
      }
      
      const { email } = req.body;
      
      // Find user by email
      const [user] = await db.select().from(users).where(eq(users.email, email));
      if (!user) {
        // Don't reveal if email exists
        return res.json({ message: "If your email is registered, you will receive password reset instructions." });
      }
      
      // Generate reset token
      const resetToken = randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 3600000); // 1 hour
      
      // Save token to database
      await db.update(users)
        .set({
          passwordResetToken: resetToken,
          passwordResetExpires: resetExpires,
        })
        .where(eq(users.id, user.id));
      
      // Send email with reset link
      const appBaseUrl = `${req.protocol}://${req.hostname}`;
      // Ensure email is not null before sending
      const emailSent = user.email && typeof user.email === 'string'
        ? await sendPasswordResetEmail(user.email, resetToken, appBaseUrl)
        : false;
      
      if (process.env.NODE_ENV === "production") {
        // In production, don't expose the token
        res.json({ 
          message: "If your email is registered, you will receive password reset instructions.",
          emailSent
        });
      } else {
        // In development, still return the link for easier testing
        const resetLink = `${appBaseUrl}/reset-password?token=${resetToken}`;
        res.json({ 
          message: emailSent ? "Password reset email sent" : "Failed to send email, but reset link generated", 
          resetLink,
          emailSent
        });
      }
    } catch (error) {
      next(error);
    }
  });
  
  // Reset password route
  app.post('/api/auth/reset-password', async (req, res, next) => {
    try {
      // Validate request
      const result = resetPasswordSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid reset data", 
          errors: result.error.errors 
        });
      }
      
      const { token, password } = req.body;
      
      // Find user by token
      const [user] = await db.select().from(users).where(eq(users.passwordResetToken, token));
      
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired token" });
      }
      
      // Check if token has expired
      if (user.passwordResetExpires && new Date(user.passwordResetExpires) < new Date()) {
        return res.status(400).json({ message: "Reset token has expired" });
      }
      
      // Hash new password
      const hashedPassword = await hashPassword(password);
      
      // Update user
      await db.update(users)
        .set({
          password: hashedPassword,
          passwordResetToken: null,
          passwordResetExpires: null,
        })
        .where(eq(users.id, user.id));
      
      res.json({ message: "Password has been reset successfully. You can now log in." });
    } catch (error) {
      next(error);
    }
  });
}

// Middleware to check if user is authenticated
export const isAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Check if user is approved in the database
  const user = req.user as any;
  if (!user.isApproved) {
    return res.status(403).json({ 
      message: "Your account is pending approval", 
      status: "pending_approval" 
    });
  }
  
  // Add user details to the request
  req.userRole = user.role || "pending";
  req.userDetails = user;
  
  next();
};

// Middleware to check if user has edit permissions
export const hasEditRights = async (req: Request, res: Response, next: NextFunction) => {
  // Default - no edit rights
  req.hasEditRights = false;
  req.userRole = undefined;
  
  // Check if authenticated
  if (req.isAuthenticated() && req.user) {
    const user = req.user as any;
    
    if (user.isApproved) {
      req.hasEditRights = true;
      req.userRole = user.role;
      req.userDetails = user;
    }
  }
  
  // Continue with the request regardless of authentication
  next();
};

// Check if user has admin role
export const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  // First check if authenticated
  if (!req.isAuthenticated() || !req.user) {
    console.log("Admin check: User not authenticated");
    return res.status(401).json({ message: "Authentication required" });
  }
  
  const user = req.user as any;
  console.log("Admin check: User authenticated, checking role...", user);
  
  // If user has claims (from Replit Auth) we need to get the DB user
  if (user.claims?.sub) {
    console.log("Admin check: Getting user from DB with ID", user.claims.sub);
    const dbUser = await storage.getUser(user.claims.sub);
    
    if (!dbUser) {
      console.log("Admin check: User not found in database");
      return res.status(403).json({ message: "User not found in database" });
    }
    
    if (!dbUser.isApproved) {
      console.log("Admin check: User not approved");
      return res.status(403).json({ message: "Your account is pending approval" });
    }
    
    if (dbUser.role !== "admin") {
      console.log("Admin check: User role is not admin, it's", dbUser.role);
      return res.status(403).json({ message: "Admin access required" });
    }
    
    // User is admin, proceed
    console.log("Admin check: User is admin, proceeding");
    req.userRole = "admin";
    req.userDetails = dbUser;
    return next();
  }
  
  // Regular auth (not Replit Auth)
  if (!user.isApproved) {
    console.log("Admin check: User not approved");
    return res.status(403).json({ message: "Your account is pending approval" });
  }
  
  if (user.role !== "admin") {
    console.log("Admin check: User role is not admin, it's", user.role);
    return res.status(403).json({ message: "Admin access required" });
  }
  
  // User is admin, proceed
  console.log("Admin check: User is admin, proceeding");
  req.userRole = "admin";
  req.userDetails = user;
  next();
};

// Check if user has at least editor role
export const isEditor = async (req: Request, res: Response, next: NextFunction) => {
  // First check if authenticated
  if (!req.isAuthenticated() || !req.user) {
    console.log("Editor check: User not authenticated");
    return res.status(401).json({ message: "Authentication required" });
  }
  
  const user = req.user as any;
  console.log("Editor check: User authenticated, checking role...", user);
  
  // If user has claims (from Replit Auth) we need to get the DB user
  if (user.claims?.sub) {
    console.log("Editor check: Getting user from DB with ID", user.claims.sub);
    const dbUser = await storage.getUser(user.claims.sub);
    
    if (!dbUser) {
      console.log("Editor check: User not found in database");
      return res.status(403).json({ message: "User not found in database" });
    }
    
    if (!dbUser.isApproved) {
      console.log("Editor check: User not approved");
      return res.status(403).json({ message: "Your account is pending approval" });
    }
    
    if (dbUser.role !== "admin" && dbUser.role !== "editor") {
      console.log("Editor check: User role is not admin or editor, it's", dbUser.role);
      return res.status(403).json({ message: "Editor or admin access required" });
    }
    
    // User is admin or editor, proceed
    console.log("Editor check: User is admin or editor, proceeding");
    req.userRole = dbUser.role;
    req.userDetails = dbUser;
    return next();
  }
  
  // Regular auth (not Replit Auth)
  if (!user.isApproved) {
    console.log("Editor check: User not approved");
    return res.status(403).json({ message: "Approved user access required" });
  }
  
  if (user.role !== "admin" && user.role !== "editor") {
    console.log("Editor check: User role is not admin or editor, it's", user.role);
    return res.status(403).json({ message: "Editor or admin access required" });
  }
  
  // User is admin or editor, proceed
  console.log("Editor check: User is admin or editor, proceeding");
  req.userRole = user.role;
  req.userDetails = user;
  next();
};