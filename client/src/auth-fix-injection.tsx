import React, { useEffect } from 'react';

/**
 * AuthFixInjection - Direct script injection to ensure auth page functionality
 * This component injects JavaScript directly into the page that will guarantee
 * the auth page works even with viewer mode restrictions
 */
export default function AuthFixInjection() {
  useEffect(() => {
    // Create a script element to insert our fix
    const script = document.createElement('script');
    script.id = 'auth-page-fix-script';
    script.textContent = `
      (function() {
        // Self-executing function that fixes auth page without relying on React
        
        // Helper function to check if we're on the auth page
        function isAuthPage() {
          return window.location.pathname === '/auth' || 
                 window.location.pathname.startsWith('/auth/') ||
                 window.location.pathname === '/reset-password' ||
                 window.location.pathname.startsWith('/reset-password');
        }
        
        // This is the critical fix function - it forces ALL form elements to be interactive
        function forceEnableAuthPage() {
          if (!isAuthPage()) return;
          
          // Remove any view-only classes from body
          document.body.classList.remove('viewer-mode');
          document.body.classList.remove('role-viewer');
          
          // Add override classes
          document.body.classList.add('auth-page-override');
          
          // Find all form elements
          const inputs = document.querySelectorAll('input');
          const buttons = document.querySelectorAll('button');
          const forms = document.querySelectorAll('form');
          const links = document.querySelectorAll('a');
          
          // Force enable all inputs
          inputs.forEach(function(input) {
            input.style.pointerEvents = 'auto';
            input.style.opacity = '1';
            input.style.cursor = 'text';
            input.removeAttribute('disabled');
          });
          
          // Force enable all buttons
          buttons.forEach(function(button) {
            button.style.pointerEvents = 'auto';
            button.style.opacity = '1';
            button.style.cursor = 'pointer';
            button.removeAttribute('disabled');
          });
          
          // Force enable all forms
          forms.forEach(function(form) {
            form.style.pointerEvents = 'auto';
            form.style.opacity = '1';
          });
          
          // Force enable all links
          links.forEach(function(link) {
            link.style.pointerEvents = 'auto';
            link.style.opacity = '1';
            link.style.cursor = 'pointer';
          });
          
          // Reset any custom viewer-mode restrictions
          const restricted = document.querySelectorAll('.viewer-disabled');
          restricted.forEach(function(el) {
            el.classList.remove('viewer-disabled');
            el.removeAttribute('disabled');
            if (el instanceof HTMLElement) {
              el.style.pointerEvents = 'auto';
              el.style.opacity = '1';
              el.style.cursor = 'auto';
              
              if (el.tagName === 'BUTTON' || el.tagName === 'A') {
                el.style.cursor = 'pointer';
              }
            }
          });
        }
        
        // Check right away if we're on auth page
        if (isAuthPage()) {
          forceEnableAuthPage();
        }
        
        // Set up interval to continuously check and fix
        setInterval(forceEnableAuthPage, 100);
        
        // Also observe URL changes to catch SPA navigation
        let lastUrl = window.location.href;
        new MutationObserver(function() {
          if (window.location.href !== lastUrl) {
            lastUrl = window.location.href;
            if (isAuthPage()) {
              forceEnableAuthPage();
            }
          }
        }).observe(document, {subtree: true, childList: true});
        
        // Directly patch click events
        document.addEventListener('click', function(e) {
          if (isAuthPage()) {
            // Let all click events proceed on the auth page
            console.log('Click event:', e.target);
          }
        }, true);
        
        console.log('Auth page fix script loaded and running');
      })();
    `;
    
    // Add the script to the document
    document.head.appendChild(script);
    
    return () => {
      // Clean up if component unmounts
      const script = document.getElementById('auth-page-fix-script');
      if (script) {
        script.remove();
      }
    };
  }, []);
  
  return null; // This is a utility component with no visible UI
}