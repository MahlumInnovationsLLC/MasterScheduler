import React, { useEffect } from 'react';
import { useLocation } from 'wouter';

/**
 * EmergencyAuthPageFix - CRITICAL COMPONENT FOR AUTH PAGE
 * This is a last-resort measure to ensure the auth page is always interactive
 * regardless of any other settings in the application
 */
const EmergencyAuthPageFix: React.FC = () => {
  const [location] = useLocation();
  
  useEffect(() => {
    // Only run on auth pages
    if (location === '/auth' || location.includes('/auth/') || location.includes('/reset-password')) {
      console.log("🚨 EMERGENCY AUTH PAGE FIX ACTIVATED");
      
      // Create emergency style overrides
      const createEmergencyStyles = () => {
        let styleEl = document.getElementById('emergency-auth-fix');
        if (!styleEl) {
          styleEl = document.createElement('style');
          styleEl.id = 'emergency-auth-fix';
          styleEl.innerHTML = `
            /* Emergency auth page overrides */
            body {
              pointer-events: auto !important;
            }
            input, button, a, [role="button"], [type="submit"], form * {
              pointer-events: auto !important;
              opacity: 1 !important;
              cursor: auto !important;
              user-select: auto !important;
              touch-action: auto !important;
              filter: none !important;
            }
            button, a, [role="button"], [type="submit"] {
              cursor: pointer !important;
            }
            
            /* Override all viewer mode restrictions */
            body.viewer-mode input,
            body.viewer-mode button,
            body.viewer-mode a,
            body.viewer-mode [role="button"],
            body.viewer-mode select,
            body.viewer-mode form,
            body.viewer-mode textarea,
            body.role-viewer input,
            body.role-viewer button,
            body.role-viewer a,
            body.role-viewer [role="button"],
            body.role-viewer select,
            body.role-viewer form,
            body.role-viewer textarea {
              pointer-events: auto !important;
              opacity: 1 !important;
              cursor: auto !important;
              filter: none !important;
            }
            
            /* Fix specific form interaction */
            form[action*="login"] *,
            form[action*="auth"] *,
            .auth-form *,
            form input,
            form button {
              pointer-events: auto !important;
              opacity: 1 !important;
            }
            
            /* Make sure body classes are properly set */
            html, body {
              background-color: unset !important;
            }
          `;
          document.head.appendChild(styleEl);
        }
      };
      
      // Active direct DOM manipulation to force interaction
      const makeElementsInteractive = () => {
        // Set critical body classes
        document.body.classList.remove('viewer-mode');
        document.body.classList.remove('role-viewer');
        document.body.classList.add('auth-page');
        document.body.classList.add('full-access');
        
        // Find all interactive elements and forcibly make them interactive
        document.querySelectorAll('input, button, a, [role="button"], form, select, textarea').forEach(el => {
          if (el instanceof HTMLElement) {
            // Direct style overrides
            el.style.pointerEvents = 'auto';
            el.style.opacity = '1';
            el.style.cursor = el.tagName === 'BUTTON' || el.tagName === 'A' ? 'pointer' : 'auto';
            
            // Remove disabled attribute
            el.removeAttribute('disabled');
            
            // Add marker classes
            el.classList.add('auth-element');
            el.classList.add('full-access');
            
            // Remove restriction classes
            el.classList.remove('viewer-disabled');
          }
        });
      };
      
      // Run immediately and on a frequent interval
      createEmergencyStyles();
      makeElementsInteractive();
      
      // Check every 20ms to defeat any competing code
      const intervalId = setInterval(() => {
        createEmergencyStyles();
        makeElementsInteractive();
      }, 20);
      
      // Cleanup function
      return () => {
        clearInterval(intervalId);
        const styleEl = document.getElementById('emergency-auth-fix');
        if (styleEl) {
          styleEl.remove();
        }
      };
    }
  }, [location]);
  
  return null; // No visual component
};

export default EmergencyAuthPageFix;