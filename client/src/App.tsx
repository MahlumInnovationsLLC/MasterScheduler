import React from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import Dashboard from "@/pages/Dashboard";
import ProjectStatus from "@/pages/ProjectStatus";
import BillingMilestones from "@/pages/BillingMilestones";
import ManufacturingBay from "@/pages/ManufacturingBay";
import ProjectDetails from "@/pages/ProjectDetails";
import ProjectEdit from "@/pages/ProjectEdit";
// ArchivedProjects moved to Project Status module as a tab
import OnTimeDelivery from "@/pages/OnTimeDelivery";
import CalendarPage from "@/pages/Calendar";
import Reports from "@/pages/Reports";
import ImportData from "@/pages/ImportData";
import SystemSettings from "@/pages/SystemSettings";
import UserPreferences from "@/pages/UserPreferences";
import AuthPage from "@/pages/auth-page";
import ResetPasswordPage from "@/pages/reset-password-page";
import NotFound from "@/pages/not-found";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";

function Router() {
  const [location, navigate] = useLocation();
  const isAuthPage = location === "/auth";
  const isResetPasswordPage = location === "/reset-password" || location.startsWith("/reset-password?");
  
  // Redirect from old archived-projects page to projects with tab
  React.useEffect(() => {
    if (location === "/archived-projects") {
      navigate("/projects");
    }
  }, [location, navigate]);

  // If we're on the auth page or reset password page, render without the app layout
  if (isAuthPage || isResetPasswordPage) {
    return (
      <Switch>
        <Route path="/auth" component={AuthPage} />
        <Route path="/reset-password" component={ResetPasswordPage} />
      </Switch>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-darkBg text-white">
      <Header />
      <div className="flex-1 grid grid-cols-[260px_1fr]">
        <Sidebar />
        <main className="overflow-y-auto h-screen pt-16">
          <Switch>
            <ProtectedRoute path="/" component={Dashboard} />
            <ProtectedRoute path="/projects" component={ProjectStatus} />
            <ProtectedRoute path="/project/:id" component={ProjectDetails} />
            <ProtectedRoute path="/project/:id/edit" component={ProjectEdit} />
            {/* Archived Projects moved to Project Status module as a tab */}
            <ProtectedRoute path="/billing" component={BillingMilestones} />
            <ProtectedRoute path="/manufacturing" component={ManufacturingBay} />
            <ProtectedRoute path="/calendar" component={CalendarPage} />
            <ProtectedRoute path="/reports" component={Reports} />
            <ProtectedRoute path="/import" component={ImportData} />
            <ProtectedRoute path="/settings/system" component={SystemSettings} />
            <ProtectedRoute path="/system-settings" component={SystemSettings} />
            <ProtectedRoute path="/settings" component={SystemSettings} />
            <ProtectedRoute path="/settings/user" component={UserPreferences} />
            <Route path="/auth" component={AuthPage} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Router />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
