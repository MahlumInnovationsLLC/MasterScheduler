import { useEffect } from 'react';

/**
 * AuthUnlocker is a special component that ensures auth pages are 
 * always fully interactive for all users regardless of role.
 * 
 * It's injected directly into the auth page routes and runs with maximum priority.
 */
export const AuthUnlocker = () => {
  useEffect(() => {
    // IMMEDIATE EXECUTION - Unlock auth page elements
    const unlockAuthPage = () => {
      console.log("🔓 AUTH PAGE UNLOCKER - FORCING ALL ELEMENTS INTERACTIVE");
      
      // Force the auth page to be fully interactive
      document.body.classList.add('auth-page');
      document.body.classList.add('auth-page-force-interactive');
      
      // Remove any view-only restrictions
      document.body.classList.remove('viewer-mode');
      document.body.classList.remove('role-viewer');
      
      // Find and unlock all interactive elements 
      const allElements = document.querySelectorAll('button, input, select, textarea, a, [role="button"], form, [type="submit"]');
      allElements.forEach(el => {
        if (el instanceof HTMLElement) {
          // Add special auth-only classes
          el.classList.add('auth-element');
          
          // Remove restrictions
          el.classList.remove('viewer-disabled');
          el.classList.remove('disabled');
          el.classList.remove('pointer-events-none');
          
          // Clear attributes that might disable elements
          el.removeAttribute('disabled');
          el.removeAttribute('readonly');
          
          // Force enable interactive styles
          el.style.pointerEvents = 'auto';
          el.style.opacity = '1';
          el.style.cursor = 'pointer';
          el.style.userSelect = 'auto';
          
          // For form controls specifically
          if (el.tagName === 'INPUT' || el.tagName === 'BUTTON') {
            el.style.display = 'block';
            el.style.visibility = 'visible';
          }
        }
      });
    };

    // Run immediately
    unlockAuthPage();
    
    // Then run again after a short delay to catch any elements that might load later
    setTimeout(unlockAuthPage, 100);
    setTimeout(unlockAuthPage, 500);
    
    // Set up a continuous check to ensure auth page remains interactive
    const intervalId = setInterval(unlockAuthPage, 300);
    
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  return null;
};

export default AuthUnlocker;