import { useAuth } from './use-auth';

export const useRolePermissions = () => {
  const { user, isAuthenticated } = useAuth();
  const userRole = user?.role || 'pending';

  // Simple role checks for clean authentication
  const isViewOnly = userRole === 'viewer';
  const canEditData = isAuthenticated && userRole !== 'viewer';
  const isAdminUser = userRole === 'admin';

  return {
    userRole,
    isViewOnly,
    canEdit: canEditData,
    isAdmin: isAdminUser,
    roleLabel: userRole || 'Unknown',
    
    // Helper methods for UI conditional rendering
    shouldDisableInput: () => isViewOnly,
    shouldHideEditButton: () => isViewOnly,
    shouldHideDeleteButton: () => isViewOnly,
    shouldHideCreateButton: () => isViewOnly,
    
    // Get tooltip text for disabled elements
    getDisabledTooltip: () => isViewOnly ? "Read-only mode: you cannot edit" : "",
  };
};