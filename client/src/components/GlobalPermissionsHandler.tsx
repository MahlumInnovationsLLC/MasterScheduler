import { useEffect } from 'react';
import { usePermissions } from './PermissionsManager';

/**
 * GlobalPermissionsHandler handles permissions on a global level
 * This applies necessary CSS classes to the body based on permissions
 * IMPORTANT: The /auth page is explicitly exempted from view-only mode
 */
export const GlobalPermissionsHandler = () => {
  const { canEdit, userRole } = usePermissions();
  
  useEffect(() => {
    // Check if we're on the auth page - NEVER apply view-only mode
    const isAuthPage = window.location.pathname === '/auth' || 
                       window.location.pathname.includes('/auth/') ||
                       window.location.pathname.startsWith('/api/auth');
                       
    // If on auth page, ensure NO view-only restrictions are applied
    if (isAuthPage) {
      console.log("🔓 AUTH PAGE DETECTED - Ensuring NO view-only restrictions");
      document.body.classList.remove('viewer-mode');
      document.body.classList.remove('role-viewer');
      
      // Add special auth page class
      document.body.classList.add('auth-page');
      
      // Ensure all auth elements are clickable
      document.querySelectorAll('button, input, select, a, [role="button"]').forEach(el => {
        if (el instanceof HTMLElement) {
          el.classList.add('auth-element');
          el.classList.remove('viewer-disabled');
          el.removeAttribute('disabled');
        }
      });
      
      return; // Stop here - do not apply any view-only restrictions
    }
    
    // Not on auth page - apply normal permissions logic
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
  
  // Also listen for URL changes to ensure auth page is never restricted
  useEffect(() => {
    // Function to check if auth page and remove restrictions
    const checkForAuthPage = () => {
      const isAuthPage = window.location.pathname === '/auth' || 
                         window.location.pathname.includes('/auth/') ||
                         window.location.pathname.startsWith('/api/auth');
                         
      if (isAuthPage) {
        console.log("🔓 AUTH PAGE DETECTED - Ensuring NO view-only restrictions");
        document.body.classList.remove('viewer-mode');
        document.body.classList.remove('role-viewer');
        document.body.classList.add('auth-page');
      } else {
        document.body.classList.remove('auth-page');
      }
    };
    
    // Check immediately
    checkForAuthPage();
    
    // Also set up a listener for URL changes
    const handleUrlChange = () => {
      checkForAuthPage();
    };
    
    window.addEventListener('popstate', handleUrlChange);
    
    // Set up a periodic check as a failsafe
    const intervalId = setInterval(checkForAuthPage, 1000);
    
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      clearInterval(intervalId);
    };
  }, []);
  
  return null;
};

export default GlobalPermissionsHandler;