import React, { createContext, useContext, ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { 
  Alert, 
  AlertDescription,
  AlertTitle 
} from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

// Define the permissions context type
type PermissionsContextType = {
  canEdit: boolean;
  canAdmin: boolean;
  canView: boolean;
  userRole: string | null;
};

// Create the context with default values
const PermissionsContext = createContext<PermissionsContextType>({
  canEdit: false,
  canAdmin: false,
  canView: true,
  userRole: null
});

// Hook to use permissions context
export const usePermissions = () => useContext(PermissionsContext);

// Props for the provider component
interface PermissionsProviderProps {
  children: ReactNode;
}

// Provider component that will wrap the application
export const PermissionsProvider = ({ children }: PermissionsProviderProps) => {
  // Get user from auth context
  const { user } = useAuth();
  const role = user?.role || "viewer"; // Default to viewer for maximum security
  
  // Determine permissions based on role
  const canAdmin = role === "admin";
  const canEdit = role === "admin" || role === "editor";
  const canView = true; // Everyone can view
  
  // Context value
  const value = {
    canEdit,
    canAdmin,
    canView,
    userRole: role
  };
  
  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
};

// Higher-order component to restrict editing
interface EditRestrictedProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export const EditRestricted = ({ children, fallback }: EditRestrictedProps) => {
  const { canEdit, userRole } = usePermissions();
  
  if (canEdit) {
    return <>{children}</>;
  }
  
  // Default fallback message
  const defaultFallback = (
    <Alert variant="destructive" className="my-2">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>View Only Mode</AlertTitle>
      <AlertDescription>
        You are in view-only mode. Contact an administrator for edit access.
      </AlertDescription>
    </Alert>
  );
  
  return <>{fallback || defaultFallback}</>;
};

// Component that disables drag operations for viewers
interface DragRestrictedProps {
  children: ReactNode;
  className?: string;
}

export const DragRestricted = ({ children, className }: DragRestrictedProps) => {
  const { canEdit } = usePermissions();
  
  // Apply a special class that will disable pointer events when not allowed to edit
  const restrictedClass = !canEdit ? 'pointer-events-none' : '';
  
  return (
    <div className={`${className || ''} ${restrictedClass}`}>
      {!canEdit && (
        <div className="absolute inset-0 bg-gray-500 bg-opacity-10 z-10 flex items-center justify-center">
          <Alert variant="destructive" className="w-fit">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>View Only</AlertTitle>
            <AlertDescription>
              Editing is disabled for viewer accounts
            </AlertDescription>
          </Alert>
        </div>
      )}
      {children}
    </div>
  );
};

// Component to block UI interactions for viewers
export const ViewerGuard = () => {
  const { canEdit } = usePermissions();
  
  if (canEdit) {
    return null; // Return nothing if the user can edit
  }
  
  // Add CSS rules to disable dragging for viewers
  React.useEffect(() => {
    if (!canEdit) {
      // Create a style element
      const styleEl = document.createElement('style');
      styleEl.id = 'viewer-mode-styles';
      styleEl.textContent = `
        /* Global CSS to disable dragging for viewers */
        [draggable] {
          -webkit-user-drag: none !important;
          user-drag: none !important;
          pointer-events: none !important;
        }
        
        /* Make sure dropzones don't accept drops */
        .droppable-area, .bay-row, .drop-zone, .schedule-bar {
          pointer-events: none !important;
        }
        
        /* Disable buttons and interactive controls */
        button, input, select, .interactive, [role="button"] {
          pointer-events: none !important;
          opacity: 0.7;
        }
        
        /* Override cursor for viewers */
        body.viewer-mode * {
          cursor: default !important;
        }
      `;
      
      // Add it to the head
      document.head.appendChild(styleEl);
      
      // Clean up on unmount
      return () => {
        const existingStyle = document.getElementById('viewer-mode-styles');
        if (existingStyle) {
          existingStyle.remove();
        }
      };
    }
  }, [canEdit]);
  
  return null;
};

// To be used in App.tsx to apply global interaction restrictions for viewers
export const GlobalPermissionsHandler = () => {
  const { userRole, canEdit } = usePermissions();
  
  // Add a class to the body element based on user role
  React.useEffect(() => {
    if (userRole === "viewer") {
      document.body.classList.add("viewer-mode");
      
      // Add a viewer badge to show the current mode
      const viewerBadge = document.createElement('div');
      viewerBadge.id = 'viewer-mode-badge';
      viewerBadge.style.cssText = `
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
      `;
      viewerBadge.textContent = 'View Only Mode';
      document.body.appendChild(viewerBadge);
    } else {
      document.body.classList.remove("viewer-mode");
      const badge = document.getElementById('viewer-mode-badge');
      if (badge) badge.remove();
    }
    
    return () => {
      document.body.classList.remove("viewer-mode");
      const badge = document.getElementById('viewer-mode-badge');
      if (badge) badge.remove();
    };
  }, [userRole]);
  
  // Use direct DOM methods instead of JSX to avoid React warnings
  if (!canEdit) {
    return <ViewerGuard />;
  }
  
  return null;
};