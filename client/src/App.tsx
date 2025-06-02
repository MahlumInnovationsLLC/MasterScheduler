import React, { Suspense, useEffect } from "react";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LoadingProvider } from "@/components/LoadingManager";
import { PermissionsProvider, GlobalPermissionsHandler } from "@/components/PermissionsManager";

import Dashboard from "@/pages/Dashboard";
import ProjectStatus from "@/pages/ProjectStatus";
import BillingMilestones from "@/pages/BillingMilestones";
import ManufacturingBay from "@/pages/ManufacturingBay";
import BaySchedulingPage from "@/pages/BaySchedulingPage";
import ProjectDetails from "@/pages/ProjectDetails";
import ProjectEdit from "@/pages/ProjectEdit";
import ProjectCreate from "@/pages/ProjectCreate";
import ArchivedProjects from "@/pages/ArchivedProjects";
import DeliveredProjects from "@/pages/DeliveredProjects";
import OnTimeDelivery from "@/pages/OnTimeDelivery";
import CalendarPage from "@/pages/Calendar";
import Reports from "@/pages/Reports";
import ExportReports from "@/pages/ExportReports";
import ImportData from "@/pages/ImportData";
import SystemSettings from "@/pages/SystemSettings";
import UserPreferences from "@/pages/UserPreferences";
import SalesForecast from "@/pages/SalesForecast";
import SalesDealEdit from "@/pages/SalesDealEdit";
import SupplyChain from "@/pages/SupplyChain";
import RoleTestPage from "@/pages/RoleTestPage";
import AuthPage from "@/pages/auth-page";
import ResetPasswordPage from "@/pages/reset-password-page";
import NotFound from "@/pages/not-found";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { AdminRoute } from "@/lib/admin-route";
import { ViewerRestrictedRoute } from "@/lib/viewer-restricted-route";
import { UnrestrictedAuthRoute } from "@/lib/unrestricted-auth-route";
// Import SidebarContext and SidebarProvider for managing sidebar state
import { SidebarProvider, SidebarContext } from "@/context/SidebarContext";
import { useContext } from "react";

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development' || import.meta.env.DEV;

function Router() {
  const [location] = useLocation();
  const isAuthPage = location === "/auth";
  
  // GLOBAL AUTH PAGE FIX - Run continuously to prevent view-only mode
  useEffect(() => {
    const forceAuthPageInteractive = () => {
      const currentPath = window.location.pathname;
      const isAnyAuthPage = currentPath === '/auth' || 
                           currentPath === '/login' || 
                           currentPath === '/simple-login' || 
                           currentPath.includes('/auth') ||
                           currentPath.includes('/reset-password');
      
      if (isAnyAuthPage) {
        // Remove all view-only restrictions immediately
        document.body.classList.remove('viewer-mode', 'role-viewer');
        document.body.classList.add('auth-page', 'full-access', 'auth-routes', 'no-restrictions');
        
        // Set data attributes for CSS targeting
        document.body.setAttribute('data-current-url', currentPath);
        document.body.setAttribute('data-page', 'auth');
        
        // Force enable all interactive elements
        document.querySelectorAll('input, button, form, a, select, textarea, [role="button"]').forEach(el => {
          if (el instanceof HTMLElement) {
            el.style.pointerEvents = 'auto';
            el.style.opacity = '1';
            el.style.filter = 'none';
            el.style.cursor = 'auto';
            el.removeAttribute('disabled');
            el.removeAttribute('readonly');
            
            if (el.tagName === 'BUTTON' || el.tagName === 'A' || el.getAttribute('role') === 'button') {
              el.style.cursor = 'pointer';
            }
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
              el.style.cursor = 'text';
            }
          }
        });
      }
    };
    
    // Run immediately and every 50ms
    forceAuthPageInteractive();
    const interval = setInterval(forceAuthPageInteractive, 50);
    
    return () => clearInterval(interval);
  }, [location]);
  
  // Allow auth page access in development for testing
  // if (isDevelopment && isAuthPage) {
  //   return <Redirect to="/" />;
  // }
  const isResetPasswordPage = location === "/reset-password" || location.startsWith("/reset-password?");

  // If we're on the auth page or reset password page, render without the app layout
  // and without any permissions restrictions
  if (isAuthPage || isResetPasswordPage) {
    // CRITICAL: Force body classes to be completely unrestricted for auth pages
    document.body.classList.remove('viewer-mode');
    document.body.classList.remove('role-viewer');
    document.body.classList.add('auth-page');
    document.body.classList.add('full-access');
    
    // Don't apply any permissions restrictions to authentication routes
    return (
      <div className="auth-routes no-restrictions">
        <Switch>
          {/* Single auth page */}
          <Route path="/auth" component={AuthPage} />
          <Route path="/reset-password" component={ResetPasswordPage} />
        </Switch>
      </div>
    );
  }
  
  return (
    <SidebarProvider>
      <MainContent />
    </SidebarProvider>
  );
}

// Separate component to use the sidebar context
function MainContent() {
  // Now we can safely use the sidebar context
  const { isCollapsed } = useContext(SidebarContext);
  
  return (
    <div className="min-h-screen flex flex-col bg-darkBg text-white">
      <Header />
      <div className="flex flex-1 h-[calc(100vh-64px)]">
        <Sidebar />
        <main className={`overflow-y-auto flex-1 transition-all duration-300 pt-16 ${isCollapsed ? 'ml-[50px]' : 'ml-[260px]'}`}>
          {/* Main content margin adjusts based on sidebar width */}
          <Switch>
            <ProtectedRoute path="/" component={Dashboard} />
            <ProtectedRoute path="/projects" component={ProjectStatus} />
            <ProtectedRoute path="/projects/new" component={ProjectCreate} />
            <ProtectedRoute path="/project/:id" component={ProjectDetails} />
            <ProtectedRoute path="/project/:id/edit" component={ProjectEdit} />
            <ProtectedRoute path="/archived-projects" component={ArchivedProjects} />
            <ProtectedRoute path="/delivered-projects" component={DeliveredProjects} />
            <ProtectedRoute path="/billing" component={BillingMilestones} />
            <ProtectedRoute path="/manufacturing" component={ManufacturingBay} />
            <ViewerRestrictedRoute path="/bay-scheduling" component={BaySchedulingPage} redirectPath="/" />
            <ProtectedRoute path="/on-time-delivery" component={OnTimeDelivery} />
            <ProtectedRoute path="/calendar" component={CalendarPage} />
            <ProtectedRoute path="/sales-forecast" component={SalesForecast} />
            <ProtectedRoute path="/sales-deal/:id/edit" component={SalesDealEdit} />
            <ProtectedRoute path="/reports" component={Reports} />
            <ProtectedRoute path="/export-reports" component={ExportReports} />
            <ProtectedRoute path="/import" component={ImportData} />
            <ProtectedRoute path="/supply-chain" component={SupplyChain} />
            <ProtectedRoute path="/role-test" component={RoleTestPage} />
            <AdminRoute path="/settings/system" component={SystemSettings} />
            <AdminRoute path="/system-settings" component={SystemSettings} />
            <AdminRoute path="/settings" component={SystemSettings} />
            <ProtectedRoute path="/settings/user" component={UserPreferences} />
            <UnrestrictedAuthRoute path="/auth" component={AuthPage} />
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
            <PermissionsProvider>
              <Toaster />
              <GlobalPermissionsHandler />
              {/* Auth page now handled by the single /auth route */}
              <Router />
              
              {/* Custom styles for viewer mode exceptions */}
              <style dangerouslySetInnerHTML={{
                __html: `
                  /* Auth elements need to be clickable even in viewer mode */
                  body.viewer-mode .auth-form input,
                  body.viewer-mode .auth-form button,
                  body.viewer-mode .auth-form select {
                    pointer-events: auto !important;
                    opacity: 1 !important;
                    cursor: pointer !important;
                  }
                  
                  /* Bay Scheduling sandbox mode elements need to be clickable in viewer mode */
                  body.viewer-mode .sandbox-mode button,
                  body.viewer-mode .sandbox-mode input,
                  body.viewer-mode .sandbox-mode select {
                    pointer-events: auto !important;
                    opacity: 1 !important;
                    cursor: pointer !important;
                  }
                `
              }} />
            </PermissionsProvider>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
