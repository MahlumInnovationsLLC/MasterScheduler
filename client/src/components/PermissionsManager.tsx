import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';

interface PermissionsContextType {
  canEdit: boolean;
  canCreate: boolean;
  canDelete: boolean;
  canImport: boolean;
  canExport: boolean;
  canViewReports: boolean;
  canManageUsers: boolean;
  canManageSettings: boolean;
  userRole: string | null;
}

const PermissionsContext = createContext<PermissionsContextType>({
  canEdit: false,
  canCreate: false,
  canDelete: false,
  canImport: false,
  canExport: false,
  canViewReports: false,
  canManageUsers: false,
  canManageSettings: false,
  userRole: null,
});

export const usePermissions = () => useContext(PermissionsContext);

export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [permissions, setPermissions] = useState<PermissionsContextType>({
    canEdit: false,
    canCreate: false,
    canDelete: false,
    canImport: false,
    canExport: false,
    canViewReports: false,
    canManageUsers: false,
    canManageSettings: false,
    userRole: null,
  });

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setPermissions({
        canEdit: false,
        canCreate: false,
        canDelete: false,
        canImport: false,
        canExport: false,
        canViewReports: false,
        canManageUsers: false,
        canManageSettings: false,
        userRole: null,
      });
      return;
    }

    const userRole = user.role || 'viewer';
    console.log(`🔑 Role Detection: User has role "${userRole}"`);

    // Set permissions based on role
    const newPermissions: PermissionsContextType = {
      userRole,
      canEdit: userRole === 'admin' || userRole === 'editor',
      canCreate: userRole === 'admin' || userRole === 'editor',
      canDelete: userRole === 'admin',
      canImport: userRole === 'admin' || userRole === 'editor',
      canExport: userRole === 'admin' || userRole === 'editor' || userRole === 'viewer',
      canViewReports: true, // All authenticated users can view reports
      canManageUsers: userRole === 'admin',
      canManageSettings: userRole === 'admin',
    };

    console.log(`🔑 Role Detection: User has role "${userRole}" with permissions:`, {
      admin: userRole === 'admin',
      edit: newPermissions.canEdit
    });

    setPermissions(newPermissions);
  }, [user, isAuthenticated]);

  return (
    <PermissionsContext.Provider value={permissions}>
      {children}
    </PermissionsContext.Provider>
  );
};

// Simple component that doesn't enforce any visual restrictions
export const GlobalPermissionsHandler: React.FC = () => {
  const { userRole } = usePermissions();

  useEffect(() => {
    // Simply log the user role, no visual restrictions
    if (userRole) {
      console.log(`🔑 User authenticated with role: ${userRole}`);
    }
  }, [userRole]);

  return null;
};