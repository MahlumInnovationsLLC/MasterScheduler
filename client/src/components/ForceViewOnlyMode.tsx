import React, { useEffect } from 'react';

/**
 * ⚠️⚠️⚠️ EMERGENCY OVERRIDE ⚠️⚠️⚠️
 * VIEW-ONLY MODE COMPLETELY DISABLED
 * All restrictions have been removed
 */
export const ForceViewOnlyMode: React.FC = () => {
  // Super aggressive fix that runs on component mount
  useEffect(() => {
    console.log('🔓 ALL VIEW-ONLY RESTRICTIONS PERMANENTLY DISABLED');
    
    // Remove any view-only badges
    document.querySelectorAll('#viewer-mode-badge, .viewer-badge, .view-only-badge').forEach(badge => {
      if (badge.parentNode) badge.parentNode.removeChild(badge);
    });
    
    // Remove all view-only classes
    document.body.classList.remove('viewer-mode');
    document.body.classList.remove('role-viewer');
    document.body.classList.remove('view-only');
    
    // Add admin access classes
    document.body.classList.add('full-access');
    document.body.classList.add('admin-access');
    document.body.classList.add('dev-mode');
    
    // Set global flags
    (window as any).__DEV_MODE_NO_RESTRICTIONS = true;
    (window as any).__MOCK_ADMIN_USER = true;
    (window as any).isAdmin = true;
    
    // Force enable ALL interactive elements
    const enableAllInteractions = () => {
      document.querySelectorAll('button, input, select, textarea, a, [role="button"], form, [data-interactive]').forEach(el => {
        if (el instanceof HTMLElement) {
          el.removeAttribute('disabled');
          el.style.pointerEvents = 'auto';
          el.classList.remove('viewer-disabled', 'disabled', 'view-only-disabled');
          el.classList.add('interactive', 'admin-enabled');
        }
      });
    };
    
    // Run immediately and repeatedly
    enableAllInteractions();
    const interval = setInterval(enableAllInteractions, 500);
    
    // Clear any view-only settings
    localStorage.removeItem('viewerMode');
    localStorage.removeItem('simulateViewerRole');
    
    // Set admin flags
    localStorage.setItem('adminMode', 'true');
    localStorage.setItem('isAdmin', 'true');
    
    return () => clearInterval(interval);
  }, []);
  
  return null;
};

export default ForceViewOnlyMode;