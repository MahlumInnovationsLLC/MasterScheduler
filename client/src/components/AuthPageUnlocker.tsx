import React, { useEffect } from 'react';

/**
 * AuthPageUnlocker - Completely removes all view-only restrictions on auth pages
 * 
 * This component uses multiple approaches to ensure the auth page is never affected
 * by any viewer mode restrictions, regardless of user role.
 */
const AuthPageUnlocker = () => {
  // Completely disable all view-only restrictions for auth pages on mount
  useEffect(() => {
    // Force remove any viewer mode classes from the document
    document.body.classList.remove('viewer-mode');
    document.body.classList.remove('role-viewer');
    
    // Add auth page marker classes
    document.body.classList.add('auth-page');
    document.body.classList.add('no-restrictions');
    
    // Find and remove any view-only mode styles
    const viewerStyleElement = document.getElementById('viewer-mode-styles');
    if (viewerStyleElement) {
      viewerStyleElement.remove();
    }
    
    // Remove any viewer mode badge
    const viewerBadge = document.getElementById('viewer-mode-badge');
    if (viewerBadge) {
      viewerBadge.remove();
    }
    
    // Add our own style element that forces all auth elements to be interactive
    const authStyleElement = document.createElement('style');
    authStyleElement.id = 'auth-page-no-restrictions';
    authStyleElement.textContent = `
      /* Force ALL buttons on auth page to be interactive */
      button, [role="button"], input[type="submit"], [type="button"] {
        pointer-events: auto !important;
        opacity: 1 !important;
        cursor: pointer !important;
        user-select: auto !important;
        -webkit-user-select: auto !important;
        visibility: visible !important;
        display: block !important;
        color: inherit !important;
        text-decoration: auto !important;
        font-weight: inherit !important;
      }
      
      /* Force inputs to work */
      input, select, textarea {
        pointer-events: auto !important;
        opacity: 1 !important;
        cursor: auto !important;
        user-select: auto !important;
        -webkit-user-select: auto !important;
        visibility: visible !important;
        display: block !important;
      }
      
      /* Force tab controls to work */
      [role="tab"], [role="tablist"], [role="tabpanel"] {
        pointer-events: auto !important;
        opacity: 1 !important;
        cursor: pointer !important;
        visibility: visible !important;
      }
      
      /* Force all interactive elements to be clickable */
      a, .interactive, .link, [class*="link"], [class*="btn"], [class*="button"] {
        pointer-events: auto !important;
        opacity: 1 !important;
        cursor: pointer !important;
        visibility: visible !important;
        color: inherit !important;
        text-decoration: auto !important;
      }
      
      /* Force all form-related elements to be interactive */
      form, fieldset, label {
        pointer-events: auto !important;
        opacity: 1 !important;
        cursor: auto !important;
        visibility: visible !important;
      }
      
      /* Ensure no disabled attributes exist */
      [disabled] {
        pointer-events: auto !important;
        opacity: 1 !important;
        cursor: pointer !important;
      }
    `;
    document.head.appendChild(authStyleElement);
    
    // Force enable all interactive elements
    const makeElementsInteractive = () => {
      // Find all interactive elements
      const elements = document.querySelectorAll('button, input, [role="tab"], a, [role="button"], [type="submit"]');
      
      // Add auth-interactive class to all of them and remove disabled attribute
      elements.forEach(el => {
        el.classList.add('auth-interactive');
        el.classList.add('viewer-interactive');
        if (el.hasAttribute('disabled')) {
          el.removeAttribute('disabled');
        }
      });
    };
    
    // Initial run
    makeElementsInteractive();
    
    // Set up observer to catch any dynamically added elements
    const observer = new MutationObserver(() => {
      makeElementsInteractive();
    });
    
    // Watch for changes to the DOM
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Clean up function
    return () => {
      // Remove the auth style element when unmounting
      const authStyle = document.getElementById('auth-page-no-restrictions');
      if (authStyle) {
        authStyle.remove();
      }
      
      // Disconnect the observer
      observer.disconnect();
    };
  }, []);
  
  return null; // This is a utility component with no UI
};

export default AuthPageUnlocker;