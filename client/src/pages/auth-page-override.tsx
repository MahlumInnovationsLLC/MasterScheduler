import React, { useEffect } from 'react';

/**
 * AuthPageOverride - Forcibly makes all auth page elements interactive
 * This component injects direct DOM manipulation code specifically to make
 * the auth page form elements clickable and interactive
 */
export default function AuthPageOverride() {
  useEffect(() => {
    // Direct DOM manipulations to force interactivity
    const makeAuthPageInteractive = () => {
      // Create and inject a special script element to run at highest priority
      const script = document.createElement('script');
      script.textContent = `
        // Auth page fix - direct manipulation with native browser APIs
        (function() {
          // Run at highest priority interval
          setInterval(function() {
            // Check if we're on the auth page
            if (window.location.pathname === '/auth' || 
                window.location.pathname.includes('/auth/') ||
                window.location.pathname.includes('/reset-password')) {
              
              // Select all interactive elements
              var inputs = document.querySelectorAll('input');
              var buttons = document.querySelectorAll('button');
              var forms = document.querySelectorAll('form');
              var links = document.querySelectorAll('a');
              
              // Make inputs work
              inputs.forEach(function(input) {
                input.style.pointerEvents = 'auto';
                input.style.opacity = '1';
                input.style.cursor = 'text';
                input.removeAttribute('disabled');
                // Override any click handlers
                input.onclick = function(e) {
                  e.stopPropagation();
                };
              });
              
              // Make buttons work
              buttons.forEach(function(button) {
                button.style.pointerEvents = 'auto';
                button.style.opacity = '1';
                button.style.cursor = 'pointer';
                button.removeAttribute('disabled');
                // Ensure click events work
                button.addEventListener('click', function(e) {
                  console.log('Button clicked', e.target);
                }, { capture: true });
              });
              
              // Make forms work
              forms.forEach(function(form) {
                form.style.pointerEvents = 'auto';
                form.style.opacity = '1';
                
                // Ensure form submission works
                form.addEventListener('submit', function(e) {
                  console.log('Form submitted', e.target);
                }, { capture: true });
              });
              
              // Make links work
              links.forEach(function(link) {
                link.style.pointerEvents = 'auto';
                link.style.opacity = '1';
                link.style.cursor = 'pointer';
              });
              
              // Remove all restrictive classes from body
              document.body.classList.remove('viewer-mode');
              document.body.classList.remove('role-viewer');
              
              // Add auth-specific classes
              document.body.classList.add('auth-page');
              document.body.classList.add('full-access');
            }
          }, 100);
        })();
      `;
      
      // Add script to page
      document.head.appendChild(script);
      
      // Create direct style override
      const style = document.createElement('style');
      style.textContent = `
        /* Master override for auth page */
        body[class] form,
        body[class] input,
        body[class] button,
        body[class] a,
        body[class] select,
        body[class] textarea {
          pointer-events: auto !important;
          opacity: 1 !important;
          filter: none !important;
        }
        
        /* Specific cursor fixes */
        body[class] button, 
        body[class] a, 
        body[class] [role="button"] {
          cursor: pointer !important;
        }
        
        body[class] input, 
        body[class] textarea {
          cursor: text !important;
        }
      `;
      document.head.appendChild(style);
    };
    
    // Only run once
    makeAuthPageInteractive();
    
    // No cleanup needed - we want this to persist even if component unmounts
  }, []);
  
  return null;
}