import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface AdminRouteProps {
  path: string;
  component: React.ComponentType<any>;
}

export function AdminRoute({ path, component: Component }: AdminRouteProps) {
  const { user, isLoading } = useAuth();

  // Handle loading state
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

  // Check if user is logged in at all
  if (!user) {
    return (
      <Route path={path}>
        {() => <Redirect to="/auth" />}
      </Route>
    );
  }

  // Check if user has admin role
  if (user.role !== 'admin') {
    return (
      <Route path={path}>
        {() => (
          <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <Alert variant="destructive" className="max-w-md mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Access Denied</AlertTitle>
              <AlertDescription>
                You do not have permission to access this page. This area is restricted to administrators only.
              </AlertDescription>
            </Alert>
            <Redirect to="/" />
          </div>
        )}
      </Route>
    );
  }

  // User is an admin, allow access
  return (
    <Route path={path}>
      {(params) => <Component params={params} />}
    </Route>
  );
}