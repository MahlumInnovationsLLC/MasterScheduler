import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function DevLoginHandler() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [isProcessing, setIsProcessing] = useState(true);
  const [status, setStatus] = useState("Initializing login...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If already authenticated, just redirect to home
    if (isAuthenticated) {
      navigate("/");
      return;
    }

    const completeDevLogin = async () => {
      try {
        // Get token from URL
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get("token");

        if (!token) {
          setError("No login token provided");
          setIsProcessing(false);
          return;
        }

        setStatus("Validating token...");
        console.log("Dev login handler: Processing token", token);

        // Send token to server
        const response = await fetch("/api/complete-dev-login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
          credentials: "include" // Important!
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Login failed");
        }

        const userData = await response.json();
        console.log("Dev login successful:", userData);

        setStatus("Login successful! Redirecting...");
        
        // Show success toast
        toast({
          title: "Login successful",
          description: `Welcome back${userData.firstName ? `, ${userData.firstName}` : ""}!`,
        });

        // Force a hard page reload to make sure session is loaded properly
        setTimeout(() => {
          window.location.href = "/";
        }, 500);
      } catch (error) {
        console.error("Dev login handler error:", error);
        setError(error instanceof Error ? error.message : "Unknown error occurred");
        setIsProcessing(false);
        
        toast({
          title: "Login failed",
          description: error instanceof Error ? error.message : "Unknown error occurred",
          variant: "destructive"
        });
      }
    };

    completeDevLogin();
  }, [isAuthenticated, navigate, toast]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Login Error</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <button 
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            onClick={() => navigate("/auth")}
          >
            Return to Login
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <h1 className="text-xl font-semibold mb-2">Development Login</h1>
        <p className="text-muted-foreground">{status}</p>
      </Card>
    </div>
  );
}