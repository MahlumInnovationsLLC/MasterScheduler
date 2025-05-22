import React, { useEffect } from 'react';

/**
 * AuthFixInjection - A direct solution to ensure the auth page is fully clickable
 */
export default function AuthFixInjection() {
  useEffect(() => {
    // Create a script element to inject direct DOM manipulations
    const script = document.createElement('script');
    script.id = 'auth-page-fix-script';
    script.innerHTML = `
      // Self-contained authentication page fix script
      // This runs completely independent of React
      (function() {
        // Check if we're on the auth page
        function isAuthPage() {
          return window.location.pathname === '/auth' || 
                window.location.pathname.includes('/auth/') ||
                window.location.pathname.includes('/reset-password');
        }
        
        // Make all form elements interactive
        function makeInteractive() {
          if (!isAuthPage()) return;
          
          // Force body classes
          document.body.classList.remove('viewer-mode');
          document.body.classList.remove('role-viewer');
          document.body.classList.add('auth-page');
          document.body.classList.add('full-access');
          
          // Find and fix all interactive elements
          var elements = document.querySelectorAll('input, button, a, form, [role="button"]');
          for (var i = 0; i < elements.length; i++) {
            var el = elements[i];
            
            // Apply direct style overrides
            el.style.pointerEvents = 'auto';
            el.style.opacity = '1';
            el.style.filter = 'none';
            
            // Set correct cursor
            if (el.tagName === 'BUTTON' || el.tagName === 'A' || el.getAttribute('role') === 'button') {
              el.style.cursor = 'pointer';
            } else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
              el.style.cursor = 'text';
            } else {
              el.style.cursor = 'auto';
            }
            
            // Remove any disabled attributes
            el.removeAttribute('disabled');
            
            // Add marker classes
            el.className += ' auth-element full-access';
            
            // Ensure click events work
            if (el.tagName === 'BUTTON' || el.tagName === 'A' || el.getAttribute('role') === 'button') {
              el.onclick = function(e) {
                // Just let the event proceed normally
                console.log('Element clicked', e.target);
              };
            }
          }
        }
        
        // Apply emergency styles
        function applyEmergencyStyles() {
          if (!document.getElementById('auth-emergency-styles')) {
            var style = document.createElement('style');
            style.id = 'auth-emergency-styles';
            style.innerHTML = \`
              /* Global overrides */
              body.auth-page input, 
              body.auth-page button, 
              body.auth-page a, 
              body.auth-page [role="button"], 
              body.auth-page form, 
              body.auth-page select, 
              body.auth-page textarea {
                pointer-events: auto !important;
                opacity: 1 !important;
                filter: none !important;
              }
              
              /* Cursor fixes */
              body.auth-page button, 
              body.auth-page a, 
              body.auth-page [role="button"], 
              body.auth-page [type="submit"] {
                cursor: pointer !important;
              }
              
              body.auth-page input, 
              body.auth-page textarea, 
              body.auth-page select {
                cursor: text !important;
              }
              
              /* Override nested selectors */
              body.viewer-mode button,
              body.viewer-mode input,
              body.viewer-mode a,
              body.viewer-mode [role="button"],
              body.role-viewer button,
              body.role-viewer input,
              body.role-viewer a,
              body.role-viewer [role="button"] {
                pointer-events: auto !important;
                opacity: 1 !important;
                filter: none !important;
              }
            \`;
            document.head.appendChild(style);
          }
        }
        
        // Run immediately
        makeInteractive();
        applyEmergencyStyles();
        
        // Run at frequent intervals
        setInterval(function() {
          makeInteractive();
        }, 100);
        
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