import { useEffect } from 'react';
import { useLocation } from 'wouter';

/**
 * useAuthPageFix - A direct auth page interaction enabler
 * This hook ensures that regardless of any view-only mode restrictions,
 * the auth page remains fully interactive
 */
export function useAuthPageFix() {
  const [location] = useLocation();
  
  useEffect(() => {
    // Only run on auth pages
    const isAuthPage = location === '/auth' || 
                       location.startsWith('/auth/') || 
                       location === '/reset-password' || 
                       location.startsWith('/reset-password');
    
    if (!isAuthPage) return;
    
    // CRITICAL FIX: Directly find and enable all interactive elements on the page
    const enableInteractions = () => {
      try {
        // 1. Force global permissions
        document.body.classList.remove('viewer-mode', 'role-viewer');
        document.body.classList.add('auth-page', 'full-access');
        
        // 2. Direct selector targeting of login form elements
        const forms = document.querySelectorAll('form');
        const inputs = document.querySelectorAll('input');
        const buttons = document.querySelectorAll('button, [type="submit"], [role="button"]');
        
        // 3. Make all form elements interactive
        forms.forEach(form => {
          if (form instanceof HTMLElement) {
            form.style.pointerEvents = 'auto';
            form.setAttribute('data-auth-fixed', 'true');
          }
        });
        
        // 4. Make all inputs interactive
        inputs.forEach(input => {
          if (input instanceof HTMLElement) {
            input.style.pointerEvents = 'auto';
            input.style.opacity = '1';
            input.style.cursor = 'text';
            input.removeAttribute('disabled');
            input.setAttribute('data-auth-fixed', 'true');
          }
        });
        
        // 5. Make all buttons interactive
        buttons.forEach(button => {
          if (button instanceof HTMLElement) {
            button.style.pointerEvents = 'auto';
            button.style.opacity = '1';
            button.style.cursor = 'pointer';
            button.removeAttribute('disabled');
            button.setAttribute('data-auth-fixed', 'true');
            
            // Add click handler to bypass any preventDefault
            if (!button.getAttribute('data-has-direct-handler')) {
              button.setAttribute('data-has-direct-handler', 'true');
              button.addEventListener('click', (e) => {
                // Let the default form submit behavior proceed
                console.log('Direct button click on auth page', e.target);
              });
            }
          }
        });
        
        // 6. Find login button specifically and make it extra interactive
        const loginButtons = document.querySelectorAll('button:contains("Login"), button:contains("Sign in"), [type="submit"]');
        loginButtons.forEach(button => {
          if (button instanceof HTMLElement) {
            button.style.pointerEvents = 'auto';
            button.style.opacity = '1';
            button.style.cursor = 'pointer';
            button.style.backgroundColor = button.style.backgroundColor || '#4a65d5';
            button.removeAttribute('disabled');
            
            // Direct click ability
            if (!button.getAttribute('data-has-login-handler')) {
              button.setAttribute('data-has-login-handler', 'true');
              button.addEventListener('click', (e) => {
                console.log('Login button clicked', e.target);
                // Allow propagation and default
              });
            }
          }
        });
        
        // 7. Insert emergency auth style
        if (!document.getElementById('auth-emergency-fix')) {
          const style = document.createElement('style');
          style.id = 'auth-emergency-fix';
          style.textContent = `
            /* SUPER EMERGENCY AUTH FIX */
            .auth-page form, .auth-page input, .auth-page button, 
            form[data-auth-fixed], input[data-auth-fixed], button[data-auth-fixed],
            [data-has-direct-handler], [data-has-login-handler] {
              pointer-events: auto !important;
              opacity: 1 !important;
              cursor: auto !important;
              filter: none !important;
            }
            
            /* Make buttons clickable */
            button[data-auth-fixed], [data-has-direct-handler], [data-has-login-handler] {
              cursor: pointer !important;
            }
            
            /* Specific auth page fixes */
            body[class*="viewer"] .auth-form button,
            body[class*="viewer"] .auth-form input,
            body[class*="viewer"] .auth-form a,
            body[class*="viewer"] form input,
            body[class*="viewer"] form button,
            body[class*="viewer"] form a {
              pointer-events: auto !important;
              opacity: 1 !important;
              cursor: auto !important;
            }
            
            body[class*="viewer"] button[type="submit"],
            body[class*="viewer"] [role="button"],
            body[class*="viewer"] a {
              cursor: pointer !important;
            }
          `;
          document.head.appendChild(style);
        }
      } catch (error) {
        console.error('Error in auth page fix:', error);
      }
    };
    
    // Run immediately
    enableInteractions();
    
    // Run frequently to catch any new elements or changes
    const intervalId = setInterval(enableInteractions, 50);
    
    // Cleanup when component unmounts
    return () => {
      clearInterval(intervalId);
      if (!isAuthPage) {
        const style = document.getElementById('auth-emergency-fix');
        if (style) style.remove();
      }
    };
  }, [location]);
}