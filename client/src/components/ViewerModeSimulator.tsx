import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { usePermissions } from './PermissionsManager';

/**
 * ViewerModeSimulator is a development tool that allows testing the view-only mode
 * It adds a floating toggle button to switch between viewer and editor roles
 * Only appears in development mode and can be toggled with ?viewerMode=true in URL
 * NOTE: Disabled for dev-user environment but kept for other development environments
 */
export const ViewerModeSimulator: React.FC = () => {
  const [isViewerMode, setIsViewerMode] = useState(false);
  const { userRole } = usePermissions();
  
  // Check if we're in the dev-user environment
  const isDevUserEnvironment = () => {
    // Check if the current user has dev-user in their name/profile
    const devUserMatch = document.querySelector('.user-name')?.textContent?.toLowerCase().includes('dev-user') || 
                         document.querySelector('.user-profile')?.textContent?.toLowerCase().includes('dev-user');
    
    // Alternatively check the URL for dev-user subdomain
    const isDevUserDomain = window.location.hostname.includes('dev-user');
    
    return devUserMatch || isDevUserDomain;
  };

  // Initialize from URL parameter - but skip for dev-user
  useEffect(() => {
    // Skip enforcing viewer mode in dev-user environment
    if (isDevUserEnvironment()) {
      console.log('🔓 DEV-USER environment detected - View Only Mode disabled');
      // Clear any existing viewer mode
      document.body.classList.remove('viewer-mode');
      document.body.classList.remove('role-viewer');
      window.localStorage.removeItem('simulateViewerRole');
      return;
    }
    
    const params = new URLSearchParams(window.location.search);
    const viewerMode = params.get('viewerMode') === 'true';
    setIsViewerMode(viewerMode);
    
    if (viewerMode) {
      enforceViewerMode();
    }
  }, []);

  // Toggle viewer mode
  const toggleViewerMode = () => {
    // Prevent toggling in dev-user environment
    if (isDevUserEnvironment()) {
      console.log('🔓 Cannot enable View Only Mode in DEV-USER environment');
      // Show a temporary alert
      const alertDiv = document.createElement('div');
      alertDiv.style.cssText = `
        position: fixed;
        top: 80px;
        right: 10px;
        background-color: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px 15px;
        border-radius: 5px;
        z-index: 9999;
        font-size: 14px;
        max-width: 300px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      `;
      alertDiv.textContent = 'View Only Mode is disabled in dev-user environment';
      document.body.appendChild(alertDiv);
      setTimeout(() => alertDiv.remove(), 3000);
      return;
    }
    
    const newMode = !isViewerMode;
    setIsViewerMode(newMode);
    
    // Update URL parameter
    const url = new URL(window.location.href);
    if (newMode) {
      url.searchParams.set('viewerMode', 'true');
      enforceViewerMode();
    } else {
      url.searchParams.delete('viewerMode');
      document.body.classList.remove('viewer-mode');
      document.body.classList.remove('role-viewer');
      const badge = document.getElementById('viewer-mode-badge');
      if (badge) badge.remove();
    }
    
    window.history.replaceState({}, '', url.toString());
    
    // Force reload to ensure all navigation controls get proper class assignments
    window.location.reload();
  };

  // Apply viewer mode restrictions
  const enforceViewerMode = () => {
    document.body.classList.add('viewer-mode');
    // Force the viewer role class for testing
    document.body.classList.add('role-viewer');
    
    console.log('🔒 SIMULATOR: VIEW-ONLY MODE ENABLED - Testing viewer restrictions');
    
    // Disable all interactive elements except sidebar links
    const disableInteractiveElements = () => {
      // Override any development mode bypasses
      window.localStorage.setItem('simulateViewerRole', 'true');
      
      // Disable buttons that aren't in the sidebar
      const buttons = document.querySelectorAll('button:not(.sidebar-button)');
      buttons.forEach(button => {
        if (!button.closest('.sidebar-item')) {
          button.setAttribute('disabled', 'true');
          button.classList.add('viewer-disabled');
        }
      });
      
      // Disable inputs
      const inputs = document.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        input.setAttribute('disabled', 'true');
        input.classList.add('viewer-disabled');
      });
      
      // Add disabled attribute to all form elements
      const formElements = document.querySelectorAll('form *');
      formElements.forEach(el => {
        if (el instanceof HTMLElement) {
          el.setAttribute('disabled', 'true');
          el.classList.add('viewer-disabled');
        }
      });
    };
    
    // Run immediately and set up a mutation observer to catch dynamically added elements
    disableInteractiveElements();
    
    // Set up observer to disable newly added elements
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.addedNodes.length) {
          disableInteractiveElements();
        }
      });
    });
    
    observer.observe(document.body, { 
      childList: true,
      subtree: true
    });
    
    // Add viewer mode badge
    let badge = document.getElementById('viewer-mode-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'viewer-mode-badge';
      badge.style.cssText = `
        position: fixed;
        bottom: 10px;
        right: 10px;
        background-color: rgba(255, 59, 48, 0.9);
        color: white;
        padding: 5px 10px;
        border-radius: 4px;
        font-size: 12px;
        z-index: 9999;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        pointer-events: none;
      `;
      badge.textContent = 'View Only Mode (Testing)';
      document.body.appendChild(badge);
    }
  };

  // Only show in development mode and not on auth page
  const isDevelopment = process.env.NODE_ENV === 'development' || import.meta.env.DEV;
  const isAuthPage = window.location.pathname === '/auth';
  
  if (!isDevelopment || isAuthPage) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 z-50">
      <Button
        variant={isViewerMode ? "destructive" : "default"}
        size="sm"
        onClick={toggleViewerMode}
        className="text-xs font-mono"
      >
        {isViewerMode ? 'Disable View-Only' : 'Enable View-Only'}
      </Button>
      <div className="mt-1 text-xs text-white bg-black bg-opacity-80 p-1 rounded">
        Current Role: {userRole || 'Unknown'}
      </div>
    </div>
  );
};

export default ViewerModeSimulator;