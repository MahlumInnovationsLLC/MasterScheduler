import { useEffect } from 'react';
import { usePermissions } from './PermissionsManager';

/**
 * GlobalPermissionsHandler handles permissions on a global level
 * This applies necessary CSS classes to the body based on permissions
 * IMPORTANT: The /auth page is explicitly exempted from view-only mode
 */
export const GlobalPermissionsHandler = () => {
  const { canEdit, userRole } = usePermissions();
  
  // FIRST PRIORITY: Make auth page fully interactive for ALL users
  // This effect runs immediately at component mount and every 300ms
  useEffect(() => {
    // Function to remove all restrictions from auth page
    const forceAuthPageAccessibility = () => {
      const isAuthPage = window.location.pathname === '/auth' || 
                        window.location.pathname.includes('/auth/') ||
                        window.location.pathname.startsWith('/api/auth');
      
      if (isAuthPage) {
        console.log("🔓 AUTH PAGE DETECTED - FORCING FULL INTERACTIVITY");
        
        // CRITICAL: Remove ALL restrictive classes from the body and all child elements
        document.body.classList.remove('viewer-mode');
        document.body.classList.remove('role-viewer');
        document.body.classList.add('auth-page');
        document.body.classList.add('auth-page-force-interactive');
        
        // Force enable ALL inputs, buttons, and interactive elements
        const interactiveElements = document.querySelectorAll('button, input, select, a, [role="button"], form, [type="submit"], [type="button"], .login-btn');
        interactiveElements.forEach(el => {
          if (el instanceof HTMLElement) {
            // Add positive interactive class
            el.classList.add('auth-element');
            
            // Remove all potential restricting classes
            el.classList.remove('viewer-disabled');
            el.classList.remove('disabled');
            el.classList.remove('pointer-events-none');
            
            // Clear any disabled attributes
            el.removeAttribute('disabled');
            el.removeAttribute('readonly');
            el.style.pointerEvents = 'auto';
            el.style.opacity = '1';
            el.style.cursor = 'pointer';
          }
        });
        
        // Special handling for login form elements - extremely important!
        const loginElements = document.querySelectorAll('.login-page input, .login-page button, form input, form button');
        loginElements.forEach(el => {
          if (el instanceof HTMLElement) {
            el.classList.add('auth-force-interactive');
            el.style.pointerEvents = 'auto';
            el.style.opacity = '1';
            el.style.cursor = 'pointer';
          }
        });
      }
    };
    
    // Run immediately
    forceAuthPageAccessibility();
    
    // Run on location changes
    const locationObserver = () => {
      forceAuthPageAccessibility();
    };
    
    window.addEventListener('popstate', locationObserver);
    window.addEventListener('hashchange', locationObserver);
    window.addEventListener('pushState', locationObserver);
    
    // Critical: Check frequently for auth page and force interactivity
    const intervalId = setInterval(forceAuthPageAccessibility, 300);
    
    return () => {
      window.removeEventListener('popstate', locationObserver);
      window.removeEventListener('hashchange', locationObserver);
      window.removeEventListener('pushState', locationObserver);
      clearInterval(intervalId);
    };
  }, []);
  
  // For non-auth pages, apply normal permissions logic
  useEffect(() => {
    const isAuthPage = window.location.pathname === '/auth' || 
                      window.location.pathname.includes('/auth/') ||
                      window.location.pathname.startsWith('/api/auth');
    
    // Skip permission logic for auth pages
    if (isAuthPage) {
      return;
    }
    
    // Regular permission handling for non-auth pages
    if (userRole === 'viewer' && !canEdit) {
      console.log("⚠️ Applying view-only restrictions for Viewer role");
      document.body.classList.add('role-viewer');
    } else {
      document.body.classList.remove('role-viewer');
    }
    
    // Log the application of viewer mode
    if (document.body.classList.contains('viewer-mode') || document.body.classList.contains('role-viewer')) {
      console.log("🔒 VIEW ONLY MODE ACTIVE - User has Viewer role with restricted permissions");
    }
  }, [canEdit, userRole]);
  
  return null;
};

export default GlobalPermissionsHandler;