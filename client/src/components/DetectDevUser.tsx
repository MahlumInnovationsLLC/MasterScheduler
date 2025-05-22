import { useEffect } from 'react';

/**
 * This component auto-detects the dev-user environment and applies necessary DOM classes
 * to ensure view-only mode is disabled in the development user environment
 * 
 * IMPORTANT: This runs immediately and repeatedly to ensure the dev-user environment
 * is always properly detected and view-only mode is disabled
 */
export const DetectDevUser = () => {
  // Function to detect dev-user environment
  const checkForDevUser = () => {
    // Check if view-only mode should be enabled regardless of dev environment
    // Check URL params for a force-viewer flag
    const params = new URLSearchParams(window.location.search);
    const forceViewOnly = params.get('forceViewOnly') === 'true';
    
    if (forceViewOnly) {
      console.log("🔒 FORCING VIEW-ONLY MODE - User requested view-only restrictions");
      return false; // Don't disable view-only mode
    }
    
    // Skip detection if we're on an auth page
    if (window.location.pathname === '/auth' || 
        window.location.pathname === '/login' || 
        window.location.pathname === '/simple-login' ||
        window.location.pathname === '/reset-password') {
      return false; // Don't interfere with auth pages
    }
    
    // For this specific case, we want to force view-only mode ON rather than OFF
    // This is the opposite of the normal behavior
    const enableViewOnly = true;
    
    console.log("🔍 DEV DETECTION - Checking for dev-user environment");
    
    if (!enableViewOnly) {
      console.log("🔓 DEV-USER ENVIRONMENT DETECTED - Disabling View Only Mode");
      
      // Force disable view-only mode
      document.body.classList.add('dev-user-env');
      document.body.classList.remove('viewer-mode');
      document.body.classList.remove('role-viewer');
      
      // Remove any indication of view-only simulation
      const viewOnlyBadge = document.getElementById('viewer-mode-badge');
      if (viewOnlyBadge) viewOnlyBadge.remove();
      
      // Force enable all interactive elements
      document.querySelectorAll('button, input, select, a, [role="button"]').forEach(el => {
        if (el instanceof HTMLElement) {
          el.classList.remove('viewer-disabled');
          el.removeAttribute('disabled');
        }
      });
      
      // Clear any localStorage flags
      window.localStorage.removeItem('simulateViewerRole');
      window.localStorage.removeItem('viewerMode');
      
      // Hide the "Enable View-Only" button in dev-user environment
      document.querySelectorAll('button').forEach(button => {
        if (button.textContent?.includes('View-Only')) {
          button.style.display = 'none';
        }
      });
      
      return true;
    }
    
    return false;
  };
  
  useEffect(() => {
    // Run immediately
    const devDetected = checkForDevUser();
    
    // If dev-user was detected, set up a recurring check to make sure view-only mode stays disabled
    if (devDetected) {
      const intervalId = setInterval(checkForDevUser, 1000);
      return () => clearInterval(intervalId);
    } else {
      // If not immediately detected, try again in 1 second
      // (in case the header with user info hasn't loaded yet)
      const timeoutId = setTimeout(checkForDevUser, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, []);
  
  // Run the check periodically to catch cases where the button is clicked or page changes
  useEffect(() => {
    const intervalId = setInterval(checkForDevUser, 3000);
    return () => clearInterval(intervalId);
  }, []);
  
  return null; // This component doesn't render anything
};

export default DetectDevUser;