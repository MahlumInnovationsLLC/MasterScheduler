import React, { useEffect } from 'react';
import { Route } from 'wouter';

/**
 * UnrestrictedAuthRoute
 * 
 * A special route wrapper for the Auth page that ensures:
 * 1. No permission restrictions are applied
 * 2. No viewer mode restrictions are applied
 * 3. The page is fully interactive for all users
 */
export function UnrestrictedAuthRoute({ path, component: Component }: { path: string; component: React.ComponentType<any> }) {
  // Force enable auth page with no restrictions
  useEffect(() => {
    // Remove any viewer mode or role restrictions
    document.body.classList.remove('viewer-mode');
    document.body.classList.remove('role-viewer');
    
    // Add auth-page class to enable all interactive elements
    document.body.classList.add('auth-page');
    
    console.log("🔓 AUTH ROUTE DETECTED - Ensuring NO view-only restrictions");
    
    // Cleanup function
    return () => {
      document.body.classList.remove('auth-page');
    };
  }, []);
  
  return (
    <Route path={path}>
      {(params) => <Component params={params} />}
    </Route>
  );
}