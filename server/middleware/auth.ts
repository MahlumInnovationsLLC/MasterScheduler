import { Request, Response, NextFunction } from 'express';

// Check if user has edit rights
export const hasEditRights = (req: Request, res: Response, next: NextFunction) => {
  console.log('hasEditRights middleware: checking if user has edit rights');
  
  // Allow in development mode
  if (process.env.NODE_ENV === 'development') {
    console.log('hasEditRights middleware: Development mode detected, granting edit rights');
    return next();
  }

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
  // Allow in development mode
  if (process.env.NODE_ENV === 'development') {
    console.log('Admin check: Development mode detected, granting admin rights');
    return next();
  }

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
  
  // Allow in development mode
  if (process.env.NODE_ENV === 'development') {
    console.log('isAuthenticated middleware: Development mode detected, bypassing authentication');
    return next();
  }
  
  if (req.session.user) {
    return next();
  }
  
  return res.status(401).json({ message: 'Unauthorized: Please log in' });
};