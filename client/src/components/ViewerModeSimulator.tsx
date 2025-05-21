import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { usePermissions } from './PermissionsManager';

/**
 * ViewerModeSimulator is a development tool that allows testing the view-only mode
 * It adds a floating toggle button to switch between viewer and editor roles
 * Only appears in development mode and can be toggled with ?viewerMode=true in URL
 */
export const ViewerModeSimulator: React.FC = () => {
  const [isViewerMode, setIsViewerMode] = useState(false);
  const { userRole } = usePermissions();

  // Initialize from URL parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewerMode = params.get('viewerMode') === 'true';
    setIsViewerMode(viewerMode);
    
    if (viewerMode) {
      enforceViewerMode();
    }
  }, []);

  // Toggle viewer mode
  const toggleViewerMode = () => {
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
    console.log('🔒 SIMULATOR: VIEW-ONLY MODE ENABLED - Testing viewer restrictions');
    
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