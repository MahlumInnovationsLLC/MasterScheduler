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
  
  // Add CSS rules to disable dragging and interactions for viewers
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
        
        /* Disable all forms, inputs and interactive controls */
        button:not(.auth-button):not(.sandbox-button), 
        input:not(.auth-input):not(.sandbox-input), 
        select, 
        textarea,
        .interactive, 
        [role="button"],
        [role="switch"],
        [role="checkbox"],
        [role="radio"],
        [role="menuitem"],
        [role="tab"],
        [type="checkbox"],
        [type="radio"],
        [type="button"],
        [type="submit"],
        [type="reset"],
        .btn,
        .button,
        .dropdown-toggle,
        .clickable,
        details summary,
        a[href]:not(.auth-link):not(.sandbox-link),
        label {
          pointer-events: none !important;
          opacity: 0.7 !important;
        }
        
        /* Disable form submissions */
        form {
          pointer-events: none !important;
        }
        
        /* Make sure editing controls are disabled */
        .editable-field,
        .edit-controls,
        .action-buttons,
        .dropdown-menu,
        .menu-item,
        [contenteditable="true"] {
          pointer-events: none !important;
          opacity: 0.7 !important;
        }
        
        /* Prevent context menus for viewers */
        body.viewer-mode {
          -webkit-user-select: text !important; /* Still allow text selection */
          user-select: text !important;
        }
        
        /* Override cursor for viewers */
        body.viewer-mode *:not(a):not(button):not(input):not(select):not(textarea) {
          cursor: default !important;
        }
        
        body.viewer-mode a,
        body.viewer-mode button,
        body.viewer-mode input,
        body.viewer-mode select,
        body.viewer-mode textarea,
        body.viewer-mode [role="button"] {
          cursor: not-allowed !important;
        }
        
        /* Explicitly allow interaction on a few specific elements */
        body.viewer-mode .viewer-interactive {
          pointer-events: auto !important;
          opacity: 1 !important;
          cursor: pointer !important;
        }
        
        /* Allow scrolling but not clicking */
        body.viewer-mode .overflow-auto,
        body.viewer-mode .overflow-y-auto,
        body.viewer-mode .overflow-x-auto,
        body.viewer-mode [class*="scroll"] {
          pointer-events: auto !important;
        }
        
        /* Ensure scroll areas can still be scrolled */
        body.viewer-mode .overflow-auto *,
        body.viewer-mode .overflow-y-auto *,
        body.viewer-mode .overflow-x-auto *,
        body.viewer-mode [class*="scroll"] * {
          pointer-events: none !important;
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
  
  // Check if we're on the auth page - never restrict the auth page
  const isAuthPage = window.location.pathname === "/auth";
  
  // Check if we're on the Bay Scheduling page where sandbox mode may be enabled
  const isBaySchedulingPage = window.location.pathname === "/bay-scheduling";
  
  // Variable to track if sandbox mode is active in Bay Scheduling
  const [isSandboxMode, setIsSandboxMode] = React.useState(false);

  // Listen for sandbox mode activation in Bay Scheduling
  React.useEffect(() => {
    const checkForSandboxMode = () => {
      // Check for custom attributes or classes that might indicate sandbox mode
      const sandboxEnabled = 
        document.body.classList.contains('allow-multiple-projects') ||
        document.body.classList.contains('force-accept-drop') ||
        document.body.classList.contains('unlimited-drops') ||
        document.body.hasAttribute('data-sandbox-mode');
      
      setIsSandboxMode(sandboxEnabled);
    };

    // Initial check
    checkForSandboxMode();

    // Set up an observer to monitor for sandbox mode changes
    const observer = new MutationObserver(checkForSandboxMode);
    
    // Watch for class and attribute changes on body
    observer.observe(document.body, { 
      attributes: true, 
      attributeFilter: ['class', 'data-sandbox-mode']
    });

    return () => observer.disconnect();
  }, []);
  
  // Add a class to the body element based on user role
  React.useEffect(() => {
    // Skip all restrictions for auth page or sandbox mode in Bay Scheduling
    const shouldSkipRestrictions = isAuthPage || (isBaySchedulingPage && isSandboxMode);
    
    // In development mode, we need special handling to allow testing viewer mode
    const isDevelopment = process.env.NODE_ENV === 'development' || import.meta.env.DEV;
    
    // Check for manually set viewer role simulation
    const isSimulatingViewer = window.localStorage.getItem('simulateViewerRole') === 'true';
    
    // Only bypass if it's development mode AND not viewer role AND not simulating viewer AND not auth page
    // This is critical to ensure we can test viewer mode in development
    if (isDevelopment && !isAuthPage && userRole !== "viewer" && !isSimulatingViewer) {
      console.log("Development mode detected, bypassing viewer restrictions (not viewer role)");
      document.body.classList.remove("viewer-mode");
      document.body.classList.remove("role-viewer");
      const badge = document.getElementById('viewer-mode-badge');
      if (badge) badge.remove();
      const existingStyle = document.getElementById('viewer-mode-styles');
      if (existingStyle) existingStyle.remove();
      return;
    }
    
    // If simulating viewer mode in development, force apply viewer restrictions
    if (isDevelopment && isSimulatingViewer) {
      console.log("🔒 FORCING VIEW-ONLY MODE - Development simulation active");
      document.body.classList.add("viewer-mode");
      document.body.classList.add("role-viewer");
    }
    
    if (shouldSkipRestrictions) {
      document.body.classList.remove("viewer-mode");
      const badge = document.getElementById('viewer-mode-badge');
      if (badge) badge.remove();
      const existingStyle = document.getElementById('viewer-mode-styles');
      if (existingStyle) existingStyle.remove();
      return;
    }
    
    // CRITICAL FIX: Always force apply viewer mode if role is viewer
    // This ensures the CSS restrictions apply globally
    if (userRole === "viewer") {
      // Add both classes to ensure our CSS selectors work properly
      document.body.classList.add("viewer-mode");
      document.body.classList.add("role-viewer");
      console.log("🔒 VIEW ONLY MODE ACTIVE - User has Viewer role with restricted permissions");
      
      // Disable all interactive elements except sidebar links
      const disableInteractiveElements = () => {
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
      
      // Add a viewer badge to show the current mode
      let viewerBadge = document.getElementById('viewer-mode-badge');
      
      if (!viewerBadge) {
        viewerBadge = document.createElement('div');
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
          pointer-events: none;
        `;
        viewerBadge.textContent = 'View Only Mode';
        document.body.appendChild(viewerBadge);
      }
    } else {
      document.body.classList.remove("viewer-mode");
      document.body.classList.remove("role-viewer");
      const badge = document.getElementById('viewer-mode-badge');
      if (badge) badge.remove();
    }
    
    // Store the observer reference so we can disconnect it later
    let observerRef: MutationObserver | null = null;
    
    if (userRole === "viewer") {
      // Set up observer to disable newly added elements
      observerRef = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
          if (mutation.addedNodes.length) {
            // Re-apply the disabling logic
            const disableInteractiveElements = () => {
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
            
            disableInteractiveElements();
          }
        });
      });
      
      observerRef.observe(document.body, { 
        childList: true,
        subtree: true
      });
      
      console.log("🔒 VIEW ONLY MODE MutationObserver active - watching for dynamic elements");
    }
    
    return () => {
      // Clean up all viewer mode traces
      document.body.classList.remove("viewer-mode");
      document.body.classList.remove("role-viewer");
      
      // Remove the badge if it exists
      const badge = document.getElementById('viewer-mode-badge');
      if (badge) badge.remove();
      
      // Disconnect the observer if it was created
      if (observerRef) {
        observerRef.disconnect();
        console.log("🔓 VIEW ONLY MODE MutationObserver disconnected");
      }
      
      // Remove viewer-disabled class from all elements
      const disabledElements = document.querySelectorAll('.viewer-disabled');
      disabledElements.forEach(el => {
        if (el instanceof HTMLElement) {
          el.removeAttribute('disabled');
          el.classList.remove('viewer-disabled');
        }
      });
    };
  }, [userRole, isAuthPage, isBaySchedulingPage, isSandboxMode]);
  
  // Apply the ViewerGuard component which contains the CSS rules
  // for restricting interactions
  const shouldApplyViewerGuard = !canEdit && !isAuthPage && !(isBaySchedulingPage && isSandboxMode);
  
  // Critical fix: Apply ViewerGuard even in development mode for demo purposes
  if (userRole === "viewer" && !isAuthPage && !(isBaySchedulingPage && isSandboxMode)) {
    console.log("⚠️ Applying view-only restrictions for Viewer role");
    return <ViewerGuard />;
  }
  
  return null;
};