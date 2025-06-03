import React, { useEffect } from 'react';
import { usePermissions } from './PermissionsManager';

/**
 * Simplified permissions handler that only logs user roles
 * No visual restrictions or view-only mode enforcement
 */
export const GlobalPermissionsHandler: React.FC = () => {
  const { userRole, canEdit } = usePermissions();

  useEffect(() => {
    if (userRole) {
      console.log(`🔑 User authenticated with role: ${userRole}, canEdit: ${canEdit}`);

      // Remove any leftover view-only classes that might persist
      document.body.classList.remove('viewer-mode', 'role-viewer');

      // Remove any view-only badges
      const badge = document.getElementById('viewer-mode-badge');
      if (badge) badge.remove();
    }
  }, [userRole, canEdit]);

  return null;
};

export default GlobalPermissionsHandler;