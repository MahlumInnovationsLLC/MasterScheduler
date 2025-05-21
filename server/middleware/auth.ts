import { Request, Response, NextFunction } from 'express';

// Check if user has edit rights
export const hasEditRights = (req: Request, res: Response, next: NextFunction) => {
  console.log('hasEditRights middleware: checking if user has edit rights');
  
  // In development mode, check the role from URL parameter
  if (process.env.NODE_ENV === 'development') {
    // Extract role from request query parameters or URL
    const urlRole = req.query.role as string;
    console.log(`hasEditRights middleware: Development mode with role: ${urlRole}`);
    
    // Only grant edit rights to admin or editor roles
    if (urlRole === 'admin' || urlRole === 'editor') {
      console.log('hasEditRights middleware: Development mode - edit rights granted for admin/editor');
      return next();
    } else {
      console.log('hasEditRights middleware: Development mode - edit rights denied for viewer/other role');
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }
  }

  // Production mode
  if (!req.session.user) {
    return res.status(401).json({ message: 'Unauthorized: Not logged in' });
  }

  const userRole = req.session.user.role;
  if (userRole === 'admin' || userRole === 'editor') {
    return next();
  }

  return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
};

// Check if user has admin rights
export const hasAdminRights = (req: Request, res: Response, next: NextFunction) => {
  // In development mode, check the role from URL parameter
  if (process.env.NODE_ENV === 'development') {
    // Extract role from request query parameters or URL
    const urlRole = req.query.role as string;
    console.log(`Admin check: Development mode with role: ${urlRole}`);
    
    // Only grant admin rights to admin role
    if (urlRole === 'admin') {
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
  if (userRole === 'admin') {
    return next();
  }

  return res.status(403).json({ message: 'Forbidden: Admin rights required' });
};

// For endpoints that require authentication
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  console.log('isAuthenticated middleware: Checking authentication');
  
  // In development mode, we'll always allow basic authentication
  // but we'll still check for a valid URL role parameter
  if (process.env.NODE_ENV === 'development') {
    const urlRole = req.query.role as string;
    console.log(`isAuthenticated middleware: Development mode with role: ${urlRole}`);
    
    // Require a valid role to be present
    if (urlRole && ['admin', 'editor', 'viewer'].includes(urlRole)) {
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