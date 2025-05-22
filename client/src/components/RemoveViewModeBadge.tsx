import React, { useEffect } from 'react';
import { usePermissions } from './PermissionsManager';

/**
 * Component that ensures all view-only mode badges and restrictions are completely removed
 * for admin users across the entire application
 */
const RemoveViewModeBadge: React.FC = () => {
  const { userRole, canEdit } = usePermissions();
  const isAdmin = userRole === 'admin';
  
  useEffect(() => {
    const removeAllViewOnlyElements = () => {
      // Remove any view-only badges that might exist
      const badges = document.querySelectorAll('#viewer-mode-badge, [data-viewer-badge="true"]');
      badges.forEach(badge => {
        if (badge instanceof HTMLElement) {
          badge.remove();
        }
      });

      // Remove any view-only styles
      const styles = document.querySelectorAll('#viewer-mode-styles, style[data-viewer-styles="true"]');
      styles.forEach(style => style.remove());
      
      // Remove any viewer mode classes from the document body
      document.body.classList.remove('viewer-mode');
      document.body.classList.remove('role-viewer');
      
      // Add admin-specific classes
      document.body.classList.add('admin-mode');
      document.body.classList.add('full-access');
      
      // Re-enable any disabled elements
      const disabledElements = document.querySelectorAll('[disabled="true"], [disabled]');
      disabledElements.forEach(el => {
        if (el instanceof HTMLElement) {
          el.removeAttribute('disabled');
          el.classList.remove('viewer-disabled');
        }
      });
      
      console.log('🔥 ADMIN ACCESS: Successfully removed all view-only mode indicators and restrictions');
    };
    
    // Only run for admin users
    if (isAdmin) {
      // Run immediately
      removeAllViewOnlyElements();
      
      // Also set up an interval to keep checking (some components may add view-only badges dynamically)
      const interval = setInterval(removeAllViewOnlyElements, 500);
      
      return () => clearInterval(interval);
    }
  }, [isAdmin]);
  
  return null; // No UI rendered by this component
};

export default RemoveViewModeBadge;