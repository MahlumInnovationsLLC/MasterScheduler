import React, { useEffect } from 'react';

/**
 * AuthFix component - Emergency fix for auth page
 * This component directly modifies the DOM to ensure the auth page is 
 * always fully interactive regardless of other settings
 */
export default function AuthFix() {
  useEffect(() => {
    // Function to check if we're on the auth page
    const isAuthPage = () => {
      return window.location.pathname === '/auth' || 
             window.location.pathname.includes('/auth/') ||
             window.location.pathname === '/reset-password' ||
             window.location.pathname.includes('/reset-password');
    };

    // Force disable viewer mode on auth pages
    const forceDisableViewerMode = () => {
      if (isAuthPage()) {
        // Remove ALL restriction classes
        document.body.classList.remove('viewer-mode');
        document.body.classList.remove('role-viewer');
        
        // Add special auth classes
        document.body.classList.add('auth-page');
        document.body.classList.add('full-access');
        document.body.dataset.currentUrl = window.location.pathname;
        
        // Make all elements on auth page interactive
        const elements = document.querySelectorAll('button, input, a, [role="button"], form, select, textarea');
        elements.forEach(el => {
          if (el instanceof HTMLElement) {
            el.style.pointerEvents = 'auto';
            el.style.opacity = '1';
            el.style.cursor = 'auto';
            if (el.tagName === 'BUTTON' || el.tagName === 'A' || el.getAttribute('role') === 'button') {
              el.style.cursor = 'pointer';
            }
            
            // Remove disabled attribute
            el.removeAttribute('disabled');
            
            // Add auth marker class
            el.classList.add('auth-element');
            el.classList.add('full-access');
            
            // Remove any viewer restriction classes
            el.classList.remove('viewer-disabled');
          }
        });
        
        // Create style override
        if (!document.getElementById('auth-page-style-fix')) {
          const style = document.createElement('style');
          style.id = 'auth-page-style-fix';
          style.textContent = `
            /* EMERGENCY AUTH PAGE FIX */
            input, button, a, [role="button"], select, textarea, form * {
              pointer-events: auto !important;
              opacity: 1 !important;
              cursor: auto !important;
            }
            button, a, [role="button"], [type="submit"] {
              cursor: pointer !important;
            }
          `;
          document.head.appendChild(style);
        }
        
        // For good measure, add a body background patch
        document.body.style.position = 'relative';
        
        // Create a patch element that sits on top of everything and captures events
        let patch = document.getElementById('auth-page-patch');
        if (!patch) {
          patch = document.createElement('div');
          patch.id = 'auth-page-patch';
          patch.style.display = 'none';
          document.body.appendChild(patch);
        }
      }
    };
    
    // Run immediately
    forceDisableViewerMode();
    
    // Run on interval
    const intervalId = setInterval(forceDisableViewerMode, 100);
    
    // Clean up
    return () => {
      clearInterval(intervalId);
      const style = document.getElementById('auth-page-style-fix');
      if (style) {
        style.remove();
      }
      const patch = document.getElementById('auth-page-patch');
      if (patch) {
        patch.remove();
      }
    };
  }, []);
  
  return null; // No visual component
}