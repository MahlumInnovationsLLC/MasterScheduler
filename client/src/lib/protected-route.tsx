import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route, RouteComponentProps } from "wouter";

interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType<any>;
}

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development' || import.meta.env.DEV;

// Admin mock user for development mode
const DEV_MOCK_USER = {
  id: "dev-user-id",
  username: "dev-admin",
  email: "dev@example.com",
  role: "admin",
  isApproved: true,
  firstName: "Development",
  lastName: "User",
  isAuthenticated: true
};

export function ProtectedRoute({ path, component: Component }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  // Skip authentication in development mode
  if (isDevelopment) {
    console.log("🔧 Development mode: Authentication bypassed");
    return (
      <Route path={path}>
        {(params) => <Component params={params} devUser={DEV_MOCK_USER} />}
      </Route>
    );
  }

  // Production mode - normal authentication flow
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

  if (!user) {
    return (
      <Route path={path}>
        {() => <Redirect to="/auth" />}
      </Route>
    );
  }

  return (
    <Route path={path}>
      {(params) => <Component params={params} />}
    </Route>
  );
}