import React, { Suspense, useEffect } from "react";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LoadingProvider } from "@/components/LoadingManager";
import { PermissionsProvider } from "@/components/PermissionsManager";
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
// Import SidebarContext and SidebarProvider for managing sidebar state
import { SidebarProvider, SidebarContext } from "@/context/SidebarContext";
import { useContext } from "react";

function Router() {
  const [location] = useLocation();
  const isAuthPage = location === "/auth";
  const isResetPasswordPage = location === "/reset-password" || location.startsWith("/reset-password?");

  // If we're on the auth page or reset password page, render without the app layout
  if (isAuthPage || isResetPasswordPage) {
    return (
      <div className="auth-routes">
        <Switch>
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
  const { isCollapsed } = useContext(SidebarContext);

  return (
    <div className="min-h-screen flex flex-col bg-darkBg text-white">
      <Header />
      <div className="flex flex-1 h-[calc(100vh-64px)]">
        <Sidebar />
        <main className={`overflow-y-auto flex-1 transition-all duration-300 pt-16 ${isCollapsed ? 'ml-[50px]' : 'ml-[260px]'}`}>
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
            <PermissionsProvider>
              <Toaster />
              <Router />
            </PermissionsProvider>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;