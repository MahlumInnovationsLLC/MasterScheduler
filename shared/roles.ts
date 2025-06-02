// Central role definitions for the application
export const ROLES = {
  VIEW: "viewer",
  EDIT: "editor", 
  ADMIN: "admin",
  PENDING: "pending"
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];

// Role hierarchy - higher roles include permissions of lower roles
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [ROLES.PENDING]: 0,
  [ROLES.VIEW]: 1,
  [ROLES.EDIT]: 2,
  [ROLES.ADMIN]: 3,
};

// Helper functions for role checking
export const hasRole = (userRole: string, requiredRole: UserRole): boolean => {
  const userLevel = ROLE_HIERARCHY[userRole as UserRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole];
  return userLevel >= requiredLevel;
};

export const isViewOnlyUser = (userRole: string): boolean => {
  return userRole === ROLES.VIEW;
};

export const canEdit = (userRole: string): boolean => {
  return hasRole(userRole, ROLES.EDIT);
};

export const isAdmin = (userRole: string): boolean => {
  return userRole === ROLES.ADMIN;
};

// Role display names
export const ROLE_LABELS: Record<UserRole, string> = {
  [ROLES.PENDING]: "Pending",
  [ROLES.VIEW]: "View Only",
  [ROLES.EDIT]: "Editor",
  [ROLES.ADMIN]: "Administrator",
};