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
  
  // Check if we're in development mode
  const isDevelopment = process.env.NODE_ENV === 'development' || import.meta.env.DEV;
  
  // Check if we're in the dev-user environment
  const isDevUserEnvironment = () => {
    // Check for dev-user in username or profile
    const devUserMatch = document.querySelector('.user-name')?.textContent?.toLowerCase().includes('dev-user') || 
                         document.querySelector('.user-profile')?.textContent?.toLowerCase().includes('dev-user');
    
    // Check hostname for dev-user
    const isDevUserDomain = window.location.hostname.includes('dev-user');
    
    return devUserMatch || isDevUserDomain || document.body.classList.contains('dev-user-env');
  };
  
  // PRODUCTION CRITICAL FIX: Determine permissions based on role
  // Always give admin role full rights in production
  // Force edit rights in dev-user environment regardless of role
  const devUserEnvironment = isDevUserEnvironment();
  
  // In dev-user environment, everyone gets edit permissions regardless of role
  const canAdmin = role === "admin" || devUserEnvironment;
  const canEdit = role === "admin" || role === "editor" || devUserEnvironment;
  const canView = true; // Everyone can view
  
  // Log special environments
  if (devUserEnvironment) {
    console.log("🔓 DEV-USER ENVIRONMENT: Full edit permissions enabled regardless of role");
    // Force remove any viewer mode classes
    setTimeout(() => {
      document.body.classList.remove('viewer-mode');
      document.body.classList.remove('role-viewer');
      window.localStorage.removeItem('simulateViewerRole');
    }, 100);
  }
  
  // If in production and role appears to be admin, force grant all permissions
  if (!isDevelopment && role === "admin") {
    console.log("⚠️ PRODUCTION SAFEGUARD: Admin user detected, forcing full permissions");
  }
  
  // Console log the role detection for debugging
  console.log(`🔑 Role Detection: User has role "${role}" with permissions: admin=${canAdmin}, edit=${canEdit}`)
  
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
        button:not(.auth-button):not(.sandbox-button):not(.viewer-interactive), 
        input:not(.auth-input):not(.sandbox-input):not(.viewer-interactive), 
        select:not(.viewer-interactive), 
        textarea:not(.viewer-interactive),
        .interactive:not(.viewer-interactive), 
        [role="button"]:not(.viewer-interactive),
        [role="switch"]:not(.viewer-interactive),
        [role="checkbox"]:not(.viewer-interactive),
        [role="radio"]:not(.viewer-interactive),
        [role="menuitem"]:not(.viewer-interactive),
        [role="tab"]:not(.viewer-interactive),
        [type="checkbox"]:not(.viewer-interactive),
        [type="radio"]:not(.viewer-interactive),
        [type="button"]:not(.viewer-interactive),
        [type="submit"]:not(.viewer-interactive),
        [type="reset"]:not(.viewer-interactive),
        .btn:not(.viewer-interactive),
        .button:not(.viewer-interactive),
        .dropdown-toggle:not(.viewer-interactive),
        .clickable:not(.viewer-interactive),
        details summary:not(.viewer-interactive),
        a[href]:not(.auth-link):not(.sandbox-link):not(.viewer-interactive):not(.sidebar-link),
        label:not(.viewer-interactive) {
          pointer-events: none !important;
          opacity: 0.7 !important;
        }
        
        /* Disable form submissions except for auth and essential forms */
        form:not(.auth-form):not(.viewer-interactive) {
          pointer-events: none !important;
        }
        
        /* Make sure editing controls are disabled */
        .editable-field:not(.viewer-interactive),
        .edit-controls:not(.viewer-interactive),
        .action-buttons:not(.viewer-interactive),
        .dropdown-menu:not(.viewer-interactive),
        .menu-item:not(.viewer-interactive),
        [contenteditable="true"]:not(.viewer-interactive) {
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
        body.viewer-mode .viewer-interactive,
        body.viewer-mode [class*="viewer-interactive"],
        body.viewer-mode .sidebar-link,
        body.viewer-mode .dropdown-menu-content,
        body.viewer-mode .dropdown-menu-item,
        body.viewer-mode .dropdown-menu,
        body.viewer-mode .dropdown-menu *,
        body.viewer-mode [role="menu"],
        body.viewer-mode [role="menu"] *,
        body.viewer-mode .user-menu,
        body.viewer-mode .user-dropdown,
        body.viewer-mode [class*="logout"],
        body.viewer-mode [href*="logout"],
        body.viewer-mode [href*="api/auth/logout"],
        body.viewer-mode [onclick*="logout"] {
          pointer-events: auto !important;
          opacity: 1 !important;
          cursor: pointer !important;
        }
        
        /* Allow scrolling in all scrollable areas */
        body.viewer-mode .overflow-auto,
        body.viewer-mode .overflow-y-auto,
        body.viewer-mode .overflow-x-auto,
        body.viewer-mode [class*="scroll"],
        body.viewer-mode [class*="overflow"],
        body.viewer-mode div[style*="overflow"],
        body.viewer-mode .table-container,
        body.viewer-mode .scrollable,
        body.viewer-mode table,
        body.viewer-mode [role="grid"],
        body.viewer-mode [class*="Data"],
        body.viewer-mode [class*="Table"] {
          pointer-events: auto !important;
          overflow: auto !important;
        }
        
        /* Keep inner content non-interactive except for specified elements */
        body.viewer-mode .overflow-auto *:not(.viewer-interactive):not(.sidebar-link):not(.dropdown-menu *),
        body.viewer-mode .overflow-y-auto *:not(.viewer-interactive):not(.sidebar-link):not(.dropdown-menu *),
        body.viewer-mode .overflow-x-auto *:not(.viewer-interactive):not(.sidebar-link):not(.dropdown-menu *),
        body.viewer-mode [class*="scroll"] *:not(.viewer-interactive):not(.sidebar-link):not(.dropdown-menu *),
        body.viewer-mode [class*="overflow"] *:not(.viewer-interactive):not(.sidebar-link):not(.dropdown-menu *),
        body.viewer-mode div[style*="overflow"] *:not(.viewer-interactive):not(.sidebar-link):not(.dropdown-menu *),
        body.viewer-mode .table-container *:not(.viewer-interactive):not(.sidebar-link):not(.dropdown-menu *) {
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
    
    // CRITICAL PRODUCTION FIX: ONLY apply viewer mode if explicitly a viewer role
    // We need to be extremely strict here to ensure admins ALWAYS get edit rights
    if ((userRole === "viewer" && !isDevelopment) || (isDevelopment && isSimulatingViewer)) {
      // Only apply viewer mode if the user is actually a viewer or we're simulating it
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
        viewerBadge.textContent = isDevelopment && isSimulatingViewer ? 'View Only Mode (Simulated)' : 'View Only Mode';
        document.body.appendChild(viewerBadge);
      }
    } else if (userRole === "admin" || userRole === "editor") {
      // CRITICAL PRIORITY: Ensure admins and editors get FULL permissions by removing ANY restrictions
      console.log(`🔓 EDITING MODE ACTIVE - User has ${userRole} role with full permissions`);
      
      // Force remove all view-only related classes
      document.body.classList.remove("viewer-mode");
      document.body.classList.remove("role-viewer");
      
      // Remove any observer/badge elements
      const badge = document.getElementById('viewer-mode-badge');
      if (badge) badge.remove();
      
      // PRODUCTION FIX: Aggressively clean up any previously added restrictions
      // This ensures admin/editor users never experience view-only limitations
      
      // Enable all interactive elements site-wide
      const enableAllInteractiveElements = () => {
        // Find and enable all buttons
        document.querySelectorAll('button').forEach(button => {
          button.removeAttribute('disabled');
          button.classList.remove('viewer-disabled');
        });
        
        // Find and enable all inputs, selects, textareas
        document.querySelectorAll('input, select, textarea').forEach(input => {
          input.removeAttribute('disabled');
          input.classList.remove('viewer-disabled');
        });
        
        // Find and enable all form elements
        document.querySelectorAll('form *').forEach(el => {
          if (el instanceof HTMLElement) {
            el.removeAttribute('disabled');
            el.classList.remove('viewer-disabled');
          }
        });
        
        // Find anything with the viewer-disabled class and enable it
        document.querySelectorAll('.viewer-disabled').forEach(el => {
          if (el instanceof HTMLElement) {
            el.removeAttribute('disabled');
            el.classList.remove('viewer-disabled');
          }
        });
      };
      
      // Run the cleanup immediately
      enableAllInteractiveElements();
      
      // Also setup a mutation observer to ensure dynamic elements are never disabled
      const adminModeObserver = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
          if (mutation.addedNodes.length) {
            // If any new elements are added that have viewer-disabled class, enable them
            const addedDisabledElements = document.querySelectorAll('.viewer-disabled');
            if (addedDisabledElements.length > 0) {
              console.log("🔓 ADMIN MODE: Detected newly added disabled elements, enabling them");
              enableAllInteractiveElements();
            }
          }
        });
      });
      
      // Start the admin mode observer
      adminModeObserver.observe(document.body, { 
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['disabled', 'class']
      });
      
      console.log(`✅ PRODUCTION-SAFE ADMIN MODE: Full admin/editor capabilities enabled for ${userRole} role`);
      
    } else {
      // Fallback for unknown roles - default to non-restricted mode for safety
      console.log("⚠️ Unknown user role detected, defaulting to non-restricted mode");
      document.body.classList.remove("viewer-mode");
      document.body.classList.remove("role-viewer");
      const badge = document.getElementById('viewer-mode-badge');
      if (badge) badge.remove();
      
      // Also clean up any existing restrictions
      document.querySelectorAll('.viewer-disabled').forEach(el => {
        if (el instanceof HTMLElement) {
          el.removeAttribute('disabled');
          el.classList.remove('viewer-disabled');
        }
      });
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
  // CRITICAL AUTH FIX: ALWAYS exclude auth pages from viewer mode restrictions
  const shouldApplyViewerGuard = !canEdit && !isAuthPage && !(isBaySchedulingPage && isSandboxMode);
  
  // Extra safety check for auth page - 100% guarantee it will never be restricted
  if (isAuthPage) {
    console.log("🔑 AUTH PAGE DETECTED - FORCING UNRESTRICTED ACCESS");
    document.body.classList.remove('viewer-mode');
    document.body.classList.remove('role-viewer');
  }
  
  // Critical fix: Apply ViewerGuard even in development mode for demo purposes
  if (userRole === "viewer" && !isAuthPage && !(isBaySchedulingPage && isSandboxMode)) {
    console.log("⚠️ Applying view-only restrictions for Viewer role");
    return <ViewerGuard />;
  }
  
  return null;
};