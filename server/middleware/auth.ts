import { Request, Response, NextFunction } from 'express';
import { ROLES, canEdit, isAdmin, isViewOnlyUser } from '../../shared/roles';

// Extend session type to include user
declare module 'express-session' {
  interface SessionData {
    user?: {
      id: string;
      email: string;
      role: string;
      firstName?: string;
      lastName?: string;
    };
  }
}

// Check if user has edit rights
export const hasEditRights = (req: Request, res: Response, next: NextFunction) => {
  console.log('hasEditRights middleware: checking if user has edit rights');
  
  // In development mode, always grant edit rights
  if (process.env.NODE_ENV === 'development') {
    console.log('hasEditRights middleware: Development mode detected, granting edit rights');
    // Ensure we have a mock user session
    if (!req.session.user) {
      req.session.user = {
        id: 'dev-user',
        email: 'dev@example.com',
        role: ROLES.ADMIN,
        firstName: 'Dev',
        lastName: 'User'
      };
    }
    return next();
  }

  // Production mode
  if (!req.session.user) {
    return res.status(401).json({ message: 'Unauthorized: Not logged in' });
  }

  const userRole = req.session.user.role;
  if (canEdit(userRole)) {
    return next();
  }

  return res.status(403).json({ message: 'Read-only users cannot modify data.' });
};

// Check if user has admin rights
export const hasAdminRights = (req: Request, res: Response, next: NextFunction) => {
  // In development mode, always grant admin rights
  if (process.env.NODE_ENV === 'development') {
    console.log('hasAdminRights middleware: Development mode detected, granting admin rights');
    // Ensure we have a mock user session with admin role
    if (!req.session.user) {
      req.session.user = {
        id: 'dev-user',
        email: 'dev@example.com',
        role: ROLES.ADMIN,
        firstName: 'Dev',
        lastName: 'User'
      };
    }
    return next();
  }

  // Production mode
  if (!req.session.user) {
    return res.status(401).json({ message: 'Unauthorized: Not logged in' });
  }

  const userRole = req.session.user.role;
  if (isAdmin(userRole)) {
    return next();
  }

  return res.status(403).json({ message: 'Forbidden: Admin rights required' });
};

// Extend session type to include user
declare module 'express-session' {
  interface SessionData {
    user?: {
      id: string;
      email: string;
      role: string;
      firstName?: string;
      lastName?: string;
    };
  }
}

// For endpoints that require authentication  
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  console.log('isAuthenticated middleware: Checking authentication');
  
  // In development mode, always bypass authentication
  if (process.env.NODE_ENV === 'development') {
    console.log('isAuthenticated middleware: Development mode detected, bypassing authentication');
    // Create a mock user session for consistency
    if (!req.session.user) {
      req.session.user = {
        id: 'dev-user',
        email: 'dev@example.com',
        role: ROLES.ADMIN,
        firstName: 'Dev',
        lastName: 'User'
      };
    }
    return next();
  }
  
  // Production mode - actually check the session
  if (req.session.user) {
    return next();
  }
  
  return res.status(401).json({ message: 'Unauthorized: Please log in' });
};

// Middleware to block write operations for VIEW users
export const blockViewUserWrites = (req: Request, res: Response, next: NextFunction) => {
  // Skip for GET requests (read operations)
  if (req.method === 'GET') {
    return next();
  }
  
  // In development mode, always allow writes
  if (process.env.NODE_ENV === 'development') {
    // Ensure we have a mock user session
    if (!req.session.user) {
      req.session.user = {
        id: 'dev-user',
        email: 'dev@example.com',
        role: ROLES.ADMIN,
        firstName: 'Dev',
        lastName: 'User'
      };
    }
    return next();
  }
  
  // Production mode - check session user role
  if (req.session.user && isViewOnlyUser(req.session.user.role)) {
    console.log('blockViewUserWrites: Blocking write operation for VIEW user');
    return res.status(403).json({ message: 'Read-only users cannot modify data.' });
  }
  
  return next();
};