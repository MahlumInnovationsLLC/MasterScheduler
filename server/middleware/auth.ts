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
  
  // In development mode, always grant admin rights
  if (process.env.NODE_ENV === 'development') {
    console.log('hasEditRights middleware: Development mode detected, granting edit rights');
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
  // In development mode, check the role from URL parameter
  if (process.env.NODE_ENV === 'development') {
    // Extract role from request query parameters or URL
    const urlRole = req.query.role as string;
    console.log(`Admin check: Development mode with role: ${urlRole}`);
    
    // Only grant admin rights to admin role
    if (isAdmin(urlRole)) {
      console.log('Admin check: Development mode - admin rights granted');
      return next();
    } else {
      console.log('Admin check: Development mode - admin rights denied for non-admin role');
      return res.status(403).json({ message: 'Forbidden: Admin rights required' });
    }
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
  
  // In development mode, we'll always allow basic authentication
  // but we'll still check for a valid URL role parameter
  if (process.env.NODE_ENV === 'development') {
    const urlRole = req.query.role as string;
    console.log(`isAuthenticated middleware: Development mode with role: ${urlRole}`);
    
    // Require a valid role to be present
    if (urlRole && [ROLES.ADMIN, ROLES.EDIT, ROLES.VIEW].includes(urlRole as any)) {
      console.log('isAuthenticated middleware: Development mode - authentication passed');
      return next();
    } else {
      console.log('isAuthenticated middleware: Development mode - invalid or missing role parameter');
      // We'll still let it through but log the issue
      // This is for backward compatibility during development
      return next();
    }
  }
  
  // Production mode - actually check the session
  if (req.session.user) {
    return next();
  }
  
  return res.status(401).json({ message: 'Unauthorized: Please log in' });
};

