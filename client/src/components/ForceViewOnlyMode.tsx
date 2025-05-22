import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';

/**
 * This component forces view-only mode throughout the application
 * except for auth pages, while still allowing sidebar navigation
 * BUT ONLY FOR VIEWER ROLE USERS - ADMINS HAVE FULL ACCESS
 */
export const ForceViewOnlyMode: React.FC = () => {
  const [location] = useLocation();
  const { user } = useAuth(); // Get user to check if they're an admin
  
  // Check if we're on an auth page
  const isAuthPage = location === '/auth' || 
                     location === '/login' || 
                     location === '/simple-login' || 
                     location === '/reset-password' ||
                     location.startsWith('/reset-password?');
  
  // CRITICAL: Check if user is an admin
  const isAdmin = user?.role === 'admin' || 
                  user?.userType === 'admin' || 
                  user?.permissions?.admin === true ||
                  // Special case for when the mock admin user is active
                  (window as any).__MOCK_ADMIN_USER === true ||
                  // For development mode - ALWAYS TRUE in dev environment
                  (process.env.NODE_ENV === 'development' || import.meta.env.DEV);
                  
  // Debug output to help troubleshoot admin detection
  console.log(`🔑 Role Detection: User has role "${user?.role}" with permissions: admin=${!!user?.permissions?.admin}, edit=${!!user?.permissions?.edit}`);
  
  // Enable view-only mode for non-auth pages IF NOT ADMIN
  useEffect(() => {
    // For auth pages, IMMEDIATELY add special script to remove ALL restrictions
    if (isAuthPage) {
      console.log('AUTH FIX SCRIPT LOADED - Will enable all interactions on auth page');
      console.log('AUTH PAGE FIX SCRIPT LOADED - Will completely remove all restrictions on auth page');
      
      // Immediately remove all view-only classes that might block login
      document.body.classList.remove('viewer-mode');
      document.body.classList.remove('role-viewer');
      document.body.classList.add('auth-page');
      document.body.classList.add('full-access');
      
      // CRITICAL FIX: Make ALL elements on auth page interactive
      const enableAllInteractions = () => {
        document.querySelectorAll('*').forEach(el => {
          if (el instanceof HTMLElement) {
            // Remove any disabled attributes
            el.removeAttribute('disabled');
            // Remove any pointer-events: none
            el.style.pointerEvents = 'auto';
            // Add special interactive class
            el.classList.add('auth-interactive');
          }
        });
      };
      
      // Run immediately and set up for dynamically added elements
      enableAllInteractions();
      
      // Run enableAllInteractions every 500ms to ensure ALL form fields work
      const authPageInterval = setInterval(enableAllInteractions, 500);
      
      // Clean up on unmount
      return () => {
        clearInterval(authPageInterval);
      };
    }
    
    // Remove any previous viewer badge
    const viewerBadge = document.getElementById('viewer-mode-badge');
    if (viewerBadge) viewerBadge.remove();
    
    // Clear all viewer mode classes
    document.body.classList.remove('viewer-mode');
    document.body.classList.remove('role-viewer');
    
    // Auth pages or admin users get full access - skip view-only mode
    if (isAuthPage || isAdmin) {
      document.body.classList.add('auth-page');
      document.body.classList.add('full-access');
      
      if (isAdmin && !isAuthPage) {
        console.log('🔧 Development mode: Using mock ADMIN user with FULL permissions');
        console.log('🔑 Role Detection: User has role "admin" with permissions: admin=true, edit=true');
        console.log('Development mode detected, bypassing viewer restrictions (not viewer role)');
      } else if (isAuthPage) {
        console.log('🔑 AUTH PAGE DETECTED - FORCING UNRESTRICTED ACCESS');
      }
      
      return;
    }
    
    // ONLY apply view-only mode for non-admins on non-auth pages
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
  }, [isAuthPage, isAdmin, user]);
  
  return null; // This component doesn't render anything
};

export default ForceViewOnlyMode;