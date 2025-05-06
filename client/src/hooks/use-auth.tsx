import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export type User = {
  id: string;
  username: string;
  email?: string | null;
  role?: string | null;
  isApproved?: boolean | null;
  firstName?: string | null;
  lastName?: string | null;
  lastLogin?: Date | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
};

type LoginData = {
  email: string;
  password: string;
};

type RegisterData = {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, RegisterData>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development' || import.meta.env.DEV;

// Mock user for development environment
const DEV_MOCK_USER: User = {
  id: "dev-user-id",
  username: "dev-admin",
  email: "dev@example.com",
  role: "admin",
  isApproved: true,
  firstName: "Development",
  lastName: "User"
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  // In development mode, directly use the mock user
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | null, Error>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      // For development mode, return mock user immediately
      if (isDevelopment) {
        console.log("🔧 Development mode: Using mock admin user");
        return DEV_MOCK_USER;
      }
      
      // Normal authentication for production
      try {
        console.log("Fetching current user data...");
        const res = await fetch("/api/auth/user", {
          credentials: "include", // Critical for sending the session cookie
        });
        if (!res.ok) {
          if (res.status === 401) {
            console.log("User not authenticated");
            return null;
          }
          const errorData = await res.json();
          console.error("Error fetching user:", errorData);
          throw new Error(errorData.message || "Failed to fetch user");
        }
        const userData = await res.json();
        console.log("User data retrieved:", userData);
        return userData;
      } catch (error) {
        console.error("Exception when fetching user:", error);
        return null;
      }
    },
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      console.log("Attempting login with:", credentials.email);
      
      // Log the exact request details for debugging
      console.log("Login Request Details:", {
        url: "/api/auth/login",
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: credentials
      });
      
      // First try the /api/auth/login endpoint (from authService.ts)
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(credentials),
          credentials: "include" // Make sure cookies are sent with the request
        });
        
        console.log("Login response status:", res.status);
        
        if (!res.ok) {
          const errorData = await res.json();
          console.error("Login failed with /api/auth/login:", errorData);
          throw new Error(errorData.message || "Login failed");
        }
        
        const userData = await res.json();
        console.log("Login successful with /api/auth/login:", userData);
        return userData;
      } catch (firstError) {
        console.log("First login attempt failed, trying backup endpoint...");
        
        // If the first endpoint fails, try the /api/login endpoint (from routes.ts)
        const res = await fetch("/api/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(credentials),
          credentials: "include" // Make sure cookies are sent with the request
        });
        
        console.log("Backup login response status:", res.status);
        
        if (!res.ok) {
          const errorData = await res.json();
          console.error("Login error with backup endpoint:", errorData);
          throw new Error(errorData.message || "Login failed");
        }
        
        const userData = await res.json();
        console.log("Login successful with backup endpoint:", userData);
        return userData;
      }
    },
    onSuccess: (user: User) => {
      console.log("Login successful, refreshing user data in cache");
      // Invalidate the auth user query so it will be refetched with the session cookie
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Login successful",
        description: `Welcome back${user.firstName ? `, ${user.firstName}` : ""}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      console.log("Attempting registration with:", data.email);
      
      // First try the /api/auth/register endpoint
      try {
        console.log("Trying /api/auth/register endpoint");
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
          credentials: "include" // Make sure cookies are sent with the request
        });
        
        console.log("Registration response status:", res.status);
        
        if (!res.ok) {
          const errorData = await res.json();
          console.error("Registration failed with /api/auth/register:", errorData);
          throw new Error(errorData.message || "Registration failed");
        }
        
        const userData = await res.json();
        console.log("Registration successful with /api/auth/register:", userData);
        return userData;
      } catch (firstError) {
        console.log("First registration attempt failed, trying backup endpoint...");
        
        // If the first endpoint fails, try the /api/register endpoint
        const res = await fetch("/api/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
          credentials: "include" // Make sure cookies are sent with the request
        });
        
        console.log("Backup registration response status:", res.status);
        
        if (!res.ok) {
          const errorData = await res.json();
          console.error("Registration error with backup endpoint:", errorData);
          throw new Error(errorData.message || "Registration failed");
        }
        
        const userData = await res.json();
        console.log("Registration successful with backup endpoint:", userData);
        return userData;
      }
    },
    onSuccess: (user: User) => {
      console.log("Registration successful, user approval status:", user.isApproved);
      if (user.isApproved) {
        // Invalidate the auth user query so it will be refetched with the session cookie
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      console.log("Attempting logout");
      
      // NOTE: We're now using a direct window navigation approach 
      // instead of fetch requests, as our logout endpoint uses a redirect response
      // window.location.href = '/api/auth/logout';
      
      // But for completeness, we'll try both GET and POST methods
      // in case someone is using this mutation directly
      try {
        // First try GET method (what the Header component uses)
        window.location.href = '/api/auth/logout';
        return; // This will navigate away, but needed for TypeScript
      } catch (firstError) {
        console.log("Navigation approach failed, trying fetch API as fallback");
        
        // Try both POST and GET with fetch API as fallback
        try {
          const res = await fetch("/api/auth/logout", {
            method: "POST",
            credentials: "include" // Make sure cookies are sent with the request
          });
          
          console.log("Logout response status:", res.status);
          
          if (!res.ok) {
            const errorData = await res.json();
            console.error("Logout failed with POST to /api/auth/logout:", errorData);
            throw new Error(errorData.message || "Logout failed");
          }
          
          console.log("Logout successful with /api/auth/logout POST request");
          window.location.href = '/'; // Redirect to home page
          return;
        } catch (secondError) {
          console.log("POST request failed, trying GET method...");
          
          // Final attempt with GET method
          const res = await fetch("/api/auth/logout", {
            method: "GET",
            credentials: "include"
          });
          
          console.log("GET logout response status:", res.status);
          
          if (!res.ok) {
            const errorData = await res.json();
            console.error("Logout error with GET request:", errorData);
            throw new Error(errorData.message || "Logout failed");
          }
          
          console.log("Logout successful with GET request");
          window.location.href = '/'; // Redirect to home page
        }
      }
    },
    onSuccess: () => {
      console.log("Logout successful, clearing user data from cache");
      queryClient.setQueryData(["/api/auth/user"], null);
      // Invalidate and refetch any queries that might contain user-specific data
      queryClient.invalidateQueries();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        error,
        isAuthenticated: !!user,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}