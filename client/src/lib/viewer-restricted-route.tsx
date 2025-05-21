import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/components/PermissionsManager";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface ViewerRestrictedRouteProps {
  path: string;
  component: React.ComponentType<any>;
  redirectPath?: string;
}

/**
 * Route component that completely restricts access for Viewer role users
 * Redirects viewers to the dashboard with an access denied message
 */
export function ViewerRestrictedRoute({ 
  path, 
  component: Component, 
  redirectPath = "/" 
}: ViewerRestrictedRouteProps) {
  const { user, isLoading } = useAuth();
  const { userRole } = usePermissions();
  
  // Display loading state while authentication is in progress
  if (isLoading) {
    return (
      <Route path={path}>
        {() => (
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-border" />
          </div>
        )}
      </Route>
    );
  }

  // Redirect to auth page if not logged in
  if (!user) {
    return (
      <Route path={path}>
        {() => <Redirect to="/auth" />}
      </Route>
    );
  }

  // If the user is a viewer, redirect to the specified path (default is dashboard)
  if (userRole === "viewer") {
    // Use session storage to show the access denied message once per session
    const showMessage = () => {
      // Store in session storage that we've shown the message
      sessionStorage.setItem('baySchedulingRestricted', 'true');
      
      // Show a toast or alert message
      const message = document.createElement('div');
      message.className = 'fixed top-20 right-4 z-50 w-96 max-w-[90vw] access-denied-alert';
      message.innerHTML = `
        <div class="bg-destructive text-white p-4 rounded-md shadow-lg mb-4">
          <div class="flex items-center gap-2 font-semibold mb-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-alert"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
            Access Restricted
          </div>
          <div class="text-sm">
            Bay Scheduling access is restricted for Viewer accounts. Please contact an administrator for access.
          </div>
        </div>
      `;
      
      document.body.appendChild(message);
      
      // Remove the message after 5 seconds
      setTimeout(() => {
        document.body.removeChild(message);
      }, 5000);
    };
    
    // Only show the message if we haven't shown it this session
    if (!sessionStorage.getItem('baySchedulingRestricted')) {
      setTimeout(showMessage, 500); // Small delay to ensure DOM is ready
    }
    
    return (
      <Route path={path}>
        {() => <Redirect to={redirectPath} />}
      </Route>
    );
  }

  // For other roles, render the component normally
  return (
    <Route path={path}>
      {(params) => <Component params={params} />}
    </Route>
  );
}