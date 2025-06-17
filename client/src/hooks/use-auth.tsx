import { createContext, ReactNode, useContext, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User as SelectUser, InsertUser } from "@shared/schema";
import { apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLoading } from "@/context/LoadingContext";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
};

type LoginData = Pick<InsertUser, "username" | "password">;

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const { setStage, setLoading, startLoadingScreen } = useLoading();
  
  const { data: user, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/user"],
    queryFn: async () => {
      try {
        console.log("🔍 AUTH: Fetching user data...");
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const response = await fetch("/api/user", {
          credentials: "include",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 401) {
            const errorData = await response.json().catch(() => ({}));

            // Handle specific session expiration cases
            if (errorData.error === "Session expired") {
              console.log("🔍 AUTH: Session expired, redirecting to login");
              toast({
                title: "Session Expired",
                description: "Your session has expired. Please log in again.",
                variant: "destructive",
              });
            } else if (errorData.error === "Device validation failed") {
              console.log("🔍 AUTH: Device validation failed, redirecting to login");
              toast({
                title: "New Device Detected",
                description: "Please log in again from this device.",
                variant: "destructive",
              });
            } else {
              console.log("🔍 AUTH: User not authenticated (401)");
            }

            return null;
          }
          throw new Error(`Failed to fetch user: ${response.status}`);
        }

        const userData = await response.json();
        console.log("✅ AUTH: User data fetched successfully:", userData);
        return userData;
      } catch (err) {
        // Handle network errors gracefully
        console.log("❌ AUTH: Auth check failed:", err);
        if (err.name === 'AbortError') {
          console.log("❌ AUTH: Request timed out");
        }
        return null;
      }
    },
    retry: (failureCount, error) => {
      // Don't retry on 401 errors (authentication failures)
      if (error?.message?.includes('401')) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: 1000,
    staleTime: 10 * 60 * 1000, // 10 minutes (less frequent checks)
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: true, // Check session when window regains focus
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchInterval: 15 * 60 * 1000, // Check session every 15 minutes (less frequent)
  });

  const loginMutation = useMutation({
    mutationFn: async (data: { username: string; password: string }) => {
      console.log("🔐 Login mutation called with:", { username: data.username, hasPassword: !!data.password });

      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: data.username, // Map username to email for backend compatibility
          password: data.password 
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        console.log("❌ Login failed:", error.message);
        throw new Error(error.message || "Login failed");
      }

      const result = await response.json();
      console.log("✅ Login successful:", result);
      return result;
    },
    onSuccess: (data) => {
      console.log("✅ AUTH: Login successful, user data:", data);
      console.log("🔄 LOADING: Attempting to start loading screen...");
      
      // Set user data immediately to avoid delay
      queryClient.setQueryData(["/api/user"], data);
      
      // Start the loading screen after successful login
      try {
        console.log("🔄 LOADING: Calling startLoadingScreen function...");
        startLoadingScreen();
        console.log("✅ LOADING: startLoadingScreen called successfully");
      } catch (error) {
        console.error("❌ LOADING: Error starting loading screen:", error);
      }
      
      // Invalidate to ensure fresh data on next request
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      }, 100);
    },
    onError: (error) => {
      console.log("❌ AUTH: Login error:", error);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: { username: string; email: string; password: string }) => {
      try {
        const response = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Registration failed" }));
          throw new Error(errorData.error || "Registration failed");
        }

        return response.json();
      } catch (err) {
        console.error("Registration request failed:", err);
        throw new Error(err instanceof Error ? err.message : "Registration failed");
      }
    },
    onSuccess: () => {
      // Use setTimeout to prevent state update conflicts
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      }, 0);
    },
    onError: (error) => {
      console.log("Registration error:", error);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        isAuthenticated,
        error,
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