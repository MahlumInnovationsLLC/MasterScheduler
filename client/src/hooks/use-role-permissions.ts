import { useAuth } from './use-auth';
import { ROLES, isViewOnlyUser, canEdit, isAdmin, ROLE_LABELS } from '../../../shared/roles';

export const useRolePermissions = () => {
  const { user } = useAuth();
  const userRole = user?.role || ROLES.PENDING;

  return {
    userRole,
    isViewOnly: isViewOnlyUser(userRole),
    canEdit: canEdit(userRole),
    isAdmin: isAdmin(userRole),
    roleLabel: ROLE_LABELS[userRole as keyof typeof ROLE_LABELS] || 'Unknown',
    
    // Helper methods for UI conditional rendering
    shouldDisableInput: () => isViewOnlyUser(userRole),
    shouldHideEditButton: () => isViewOnlyUser(userRole),
    shouldHideDeleteButton: () => isViewOnlyUser(userRole),
    shouldHideCreateButton: () => isViewOnlyUser(userRole),
    
    // Get tooltip text for disabled elements
    getDisabledTooltip: () => isViewOnlyUser(userRole) ? "Read-only mode: you cannot edit" : "",
  };
};