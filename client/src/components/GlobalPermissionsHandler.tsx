import { useEffect } from 'react';
import { usePermissions } from './PermissionsManager';
import { useLocation } from 'wouter';

/**
 * GlobalPermissionsHandler handles permissions on a global level
 * This applies necessary CSS classes to the body based on permissions
 * IMPORTANT: The /auth page is explicitly exempted from view-only mode
 */
export const GlobalPermissionsHandler = () => {
  const { canEdit, userRole } = usePermissions();
  const [location] = useLocation();
  
  // Check if we're on an auth page
  const isAuthPage = location === '/auth' || 
                    location.includes('/auth/') ||
                    location.startsWith('/api/auth');
  
  // Special effect for auth pages - applies every time location changes
  useEffect(() => {
    if (isAuthPage) {
      // Fully exempt auth page from any restrictions
      console.log("🔓 Auth page detected - removing all view restrictions");
      document.body.classList.remove('viewer-mode');
      document.body.classList.remove('role-viewer');
    }
  }, [isAuthPage, location]);
  
  // Regular permission handling - always run
  useEffect(() => {
    // Skip for auth pages
    if (isAuthPage) {
      return;
    }
    
    // Apply regular permissions for non-auth pages
    if (userRole === 'viewer' && !canEdit) {
      console.log("⚠️ Applying view-only restrictions for Viewer role");
      document.body.classList.add('role-viewer');
    } else {
      document.body.classList.remove('role-viewer');
    }
  }, [canEdit, userRole, isAuthPage]);
  
  return null;
};

export default GlobalPermissionsHandler;