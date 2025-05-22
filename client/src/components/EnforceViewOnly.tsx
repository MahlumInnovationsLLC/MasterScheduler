import React, { useEffect } from 'react';
import { useLocation } from 'wouter';

/**
 * This component strictly enforces view-only mode across all pages
 * except authentication pages, while allowing sidebar navigation.
 * 
 * It overrides any detection logic and implements a simple "View Only" mode
 * that prevents interaction with editable elements.
 */
export const EnforceViewOnly: React.FC = () => {
  const [location] = useLocation();
  
  // Check if current page is an auth page
  const isAuthPage = location === '/auth' || 
                     location === '/login' || 
                     location === '/simple-login' || 
                     location === '/reset-password' ||
                     location.startsWith('/reset-password?');
  
  useEffect(() => {
    // Exit early if on auth page - never restrict auth pages
    if (isAuthPage) {
      console.log('🔑 AUTH PAGE DETECTED - Removing all restrictions');
      document.body.classList.remove('viewer-mode');
      document.body.classList.remove('role-viewer');
      document.body.classList.add('auth-page');
      
      // Make sure all auth page elements are interactive
      document.querySelectorAll('button, input, a, select, textarea').forEach(el => {
        if (el instanceof HTMLElement) {
          el.style.pointerEvents = 'auto';
          el.style.opacity = '1';
          el.removeAttribute('disabled');
        }
      });
      
      return;
    }
    
    // For non-auth pages, enforce strict view-only mode
    console.log('🔒 MAXIMUM DRAG-DROP OVERRIDE ACTIVE - Projects can now be placed anywhere without restrictions');
    console.log('⚠️ Applying view-only restrictions for Viewer role');
    console.log('🔒 VIEW ONLY MODE ACTIVE - User has Viewer role with restricted permissions');
    
    // Add required classes
    document.body.classList.add('viewer-mode');
    document.body.classList.add('role-viewer');
    
    // Add CSS to ensure sidebar items remain clickable
    const style = document.createElement('style');
    style.id = 'view-only-sidebar-styles';
    style.textContent = `
      /* Make sidebar items clickable in view-only mode */
      body.viewer-mode .sidebar a,
      body.viewer-mode .sidebar button,
      body.viewer-mode .sidebar-item,
      body.viewer-mode .sidebar [role="button"],
      body.viewer-mode a.sidebar-item {
        pointer-events: auto !important;
        opacity: 1 !important;
        cursor: pointer !important;
        user-select: auto !important;
      }
      
      /* Strictly disable all other interactive elements */
      body.viewer-mode button:not(.sidebar button):not(.sidebar-item),
      body.viewer-mode input:not(.auth-input),
      body.viewer-mode select:not(.auth-select),
      body.viewer-mode textarea,
      body.viewer-mode a[href]:not(.sidebar a):not(.sidebar-item),
      body.viewer-mode [role="button"]:not(.sidebar [role="button"]),
      body.viewer-mode [role="switch"],
      body.viewer-mode [role="checkbox"],
      body.viewer-mode [role="radio"],
      body.viewer-mode [role="menuitem"],
      body.viewer-mode [role="tab"],
      body.viewer-mode [type="checkbox"],
      body.viewer-mode [type="radio"],
      body.viewer-mode [type="button"]:not(.sidebar [type="button"]),
      body.viewer-mode [type="submit"],
      body.viewer-mode [type="reset"],
      body.viewer-mode .dropdown-toggle,
      body.viewer-mode .clickable:not(.sidebar-item),
      body.viewer-mode .editable-field,
      body.viewer-mode .edit-controls,
      body.viewer-mode .action-button:not(.sidebar-item),
      body.viewer-mode [contenteditable="true"] {
        pointer-events: none !important;
        opacity: 0.7 !important;
        cursor: not-allowed !important;
        user-select: none !important;
      }
    `;
    
    // Add the style to the document
    if (!document.getElementById('view-only-sidebar-styles')) {
      document.head.appendChild(style);
    }
    
    // Add a view-only badge
    if (!document.getElementById('view-only-badge')) {
      const badge = document.createElement('div');
      badge.id = 'view-only-badge';
      badge.style.cssText = `
        position: fixed;
        bottom: 10px;
        right: 10px;
        background-color: rgba(255, 0, 0, 0.7);
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 12px;
        z-index: 9999;
        pointer-events: none;
      `;
      badge.textContent = 'View Only Mode';
      document.body.appendChild(badge);
    }
    
    return () => {
      // Clean up when component unmounts
      const styleElement = document.getElementById('view-only-sidebar-styles');
      if (styleElement) styleElement.remove();
      
      const badge = document.getElementById('view-only-badge');
      if (badge) badge.remove();
    };
  }, [isAuthPage, location]);
  
  // This hook runs on every page change to re-apply restrictions
  useEffect(() => {
    // Exit early if on auth page
    if (isAuthPage) return;
    
    // Make sidebar elements interactive
    const makeSidebarInteractive = () => {
      document.querySelectorAll('.sidebar a, .sidebar button, .sidebar-item').forEach(el => {
        if (el instanceof HTMLElement) {
          el.style.pointerEvents = 'auto';
          el.style.opacity = '1';
          el.style.cursor = 'pointer';
        }
      });
    };
    
    // Run immediately and after a delay to catch dynamically rendered elements
    makeSidebarInteractive();
    setTimeout(makeSidebarInteractive, 500);
  }, [location, isAuthPage]);
  
  return null;
};

export default EnforceViewOnly;