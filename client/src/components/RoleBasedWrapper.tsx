import React, { ReactNode } from 'react';
import { useRolePermissions } from '../hooks/use-role-permissions';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface RoleBasedWrapperProps {
  children: ReactNode;
  requiresEdit?: boolean;
  requiresAdmin?: boolean;
  fallback?: ReactNode;
  showTooltip?: boolean;
  className?: string;
}

export const RoleBasedWrapper: React.FC<RoleBasedWrapperProps> = ({
  children,
  requiresEdit = false,
  requiresAdmin = false,
  fallback = null,
  showTooltip = true,
  className
}) => {
  const { isViewOnly, canEdit, isAdmin, getDisabledTooltip } = useRolePermissions();
  
  // Check permissions
  const hasPermission = () => {
    if (requiresAdmin) return isAdmin;
    if (requiresEdit) return canEdit;
    return true; // No special permissions required
  };
  
  const shouldShow = hasPermission();
  
  if (!shouldShow) {
    return <>{fallback}</>;
  }
  
  // If VIEW user and this requires edit permissions, disable the element
  if (isViewOnly && (requiresEdit || requiresAdmin)) {
    const disabledElement = (
      <div className={`${className || ''} opacity-50 pointer-events-none`}>
        {children}
      </div>
    );
    
    if (showTooltip) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {disabledElement}
            </TooltipTrigger>
            <TooltipContent>
              <p>{getDisabledTooltip()}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    
    return disabledElement;
  }
  
  return <div className={className}>{children}</div>;
};