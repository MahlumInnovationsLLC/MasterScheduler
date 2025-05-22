import { useEffect } from 'react';
import { useLocation } from 'wouter';

/**
 * AuthPageUnrestrictor component
 * 
 * This component specifically targets the auth page and ensures it is ALWAYS 
 * fully interactive regardless of any viewer mode settings.
 * This has the highest priority over any other permission restrictions.
 */
export function AuthPageUnrestrictor() {
  const [location] = useLocation();
  
  useEffect(() => {
    // Check if current location is auth page or reset password page
    const isAuthPage = location === '/auth' || 
                      location.startsWith('/auth/') ||
                      location === '/reset-password' ||
                      location.startsWith('/reset-password?');
    
    if (isAuthPage) {
      console.log("🔓🔓 AUTH PAGE DETECTED - FORCING UNRESTRICTED ACCESS");
      
      // Remove ALL restriction classes
      document.body.classList.remove('viewer-mode');
      document.body.classList.remove('role-viewer');
      
      // Add auth page marker classes
      document.body.classList.add('auth-page');
      document.body.classList.add('full-access');
      
      // Make all elements interactive
      const makeAllInteractive = () => {
        document.querySelectorAll('button, input, select, textarea, a, [role="button"]').forEach(el => {
          if (el instanceof HTMLElement) {
            el.classList.add('auth-element');
            el.classList.remove('viewer-disabled');
            el.removeAttribute('disabled');
            el.style.pointerEvents = 'auto';
            el.style.opacity = '1';
            el.style.cursor = el.tagName === 'BUTTON' || el.tagName === 'A' ? 'pointer' : 'auto';
          }
        });
      };
      
      // Run immediately
      makeAllInteractive();
      
      // Also set up a monitoring interval to continuously ensure auth page is unrestricted
      const intervalId = setInterval(makeAllInteractive, 100);
      
      // Clean up function to remove classes when navigating away
      return () => {
        clearInterval(intervalId);
        if (!isAuthPage) {
          document.body.classList.remove('auth-page');
          document.body.classList.remove('full-access');
        }
      };
    }
  }, [location]);
  
  return null; // This is a utility component with no UI
}

export default AuthPageUnrestrictor;