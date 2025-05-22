import React, { useEffect } from 'react';
import { useLocation } from 'wouter';

/**
 * This component forces view-only mode throughout the application
 * except for auth pages, while still allowing sidebar navigation
 * BUT NEVER affects admin users under any circumstances
 */
export const ForceViewOnlyMode: React.FC = () => {
  const [location] = useLocation();
  
  // NEVER ENABLE THIS COMPONENT, COMPLETELY DISABLING IT
  // IT CAUSES SERIOUS ISSUES WITH ADMIN PERMISSIONS
  return null;
  
  // Check if we're on an auth page
  const isAuthPage = location === '/auth' || 
                     location === '/login' || 
                     location === '/simple-login' || 
                     location === '/reset-password' ||
                     location.startsWith('/reset-password?');
  
  // Enable view-only mode for non-auth pages
  useEffect(() => {
    if (isAuthPage) {
      // Remove viewer restrictions on auth pages
      document.body.classList.remove('viewer-mode');
      document.body.classList.remove('role-viewer');
      document.body.classList.add('auth-page');
      document.body.classList.add('full-access');
      console.log('🔑 AUTH PAGE DETECTED - FORCING UNRESTRICTED ACCESS');
      
      // Remove any viewer badge
      const viewerBadge = document.getElementById('viewer-mode-badge');
      if (viewerBadge) viewerBadge.remove();
      
      return;
    }
    
    // Apply view-only mode for non-auth pages
    console.log('⚠️ Applying view-only restrictions for Viewer role');
    document.body.classList.add('viewer-mode');
    document.body.classList.add('role-viewer');
    
    // Make sidebar items interactive by adding a special class
    const makeSidebarItemsInteractive = () => {
      const sidebarItems = document.querySelectorAll('.sidebar-item, .sidebar a, .sidebar button, .sidebar-button');
      sidebarItems.forEach(item => {
        if (item instanceof HTMLElement) {
          item.classList.add('viewer-interactive');
        }
      });
    };
    
    // Run immediately and set up a mutation observer
    makeSidebarItemsInteractive();
    
    // Create and add viewer badge if it doesn't exist
    if (!document.getElementById('viewer-mode-badge')) {
      const badge = document.createElement('div');
      badge.id = 'viewer-mode-badge';
      badge.style.cssText = `
        position: fixed;
        bottom: 10px;
        right: 10px;
        background-color: rgba(255, 59, 48, 0.9);
        color: white;
        padding: 5px 10px;
        border-radius: 4px;
        font-size: 12px;
        z-index: 9999;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        pointer-events: none;
      `;
      badge.textContent = 'View Only Mode';
      document.body.appendChild(badge);
    }
    
    // Set up observer to catch dynamically added elements
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.addedNodes.length) {
          makeSidebarItemsInteractive();
        }
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    console.log('🔒 VIEW ONLY MODE MutationObserver active - watching for dynamic elements');
    
    return () => {
      observer.disconnect();
      console.log('🔓 VIEW ONLY MODE MutationObserver disconnected');
    };
  }, [isAuthPage]);
  
  return null; // This component doesn't render anything
};

export default ForceViewOnlyMode;