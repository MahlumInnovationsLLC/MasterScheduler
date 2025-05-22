import { useEffect } from 'react';

/**
 * This component auto-detects the dev-user environment and applies necessary DOM classes
 * to ensure view-only mode is disabled in the development user environment
 */
export const DetectDevUser = () => {
  useEffect(() => {
    // Check if we should mark this as a dev-user environment
    const isDevelopment = process.env.NODE_ENV === 'development' || import.meta.env.DEV;
    const username = document.querySelector('.user-name')?.textContent?.toLowerCase() || '';
    const profileText = document.querySelector('.user-profile')?.textContent?.toLowerCase() || '';
    const hostname = window.location.hostname;
    
    const isDevUser = 
      username.includes('dev-user') || 
      profileText.includes('dev-user') ||
      hostname.includes('dev-user') ||
      document.querySelector('.dev-user') !== null;
      
    if (isDevUser || (isDevelopment && document.querySelector('.dev-user-container'))) {
      // We're in a dev-user environment
      console.log("🔓 DEV-USER ENVIRONMENT DETECTED - Disabling View Only Mode");
      
      // Add the dev-user-env class to body
      document.body.classList.add('dev-user-env');
      
      // Remove any viewer mode restrictions
      document.body.classList.remove('viewer-mode');
      document.body.classList.remove('role-viewer');
      
      // Clear any local storage flags that might enforce viewer mode
      window.localStorage.removeItem('simulateViewerRole');
    }
  }, []);
  
  return null; // This component doesn't render anything
};

export default DetectDevUser;