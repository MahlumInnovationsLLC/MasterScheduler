import { createContext, ReactNode, useContext } from "react";
import { useQuery } from "@tanstack/react-query";

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

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const logout = () => {
    window.location.href = "/api/auth/logout";
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}