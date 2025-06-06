import React, { Suspense, useEffect, useState } from "react";
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
import Meetings from "@/pages/Meetings";
import MeetingDetails from "@/pages/MeetingDetails";
import AuthPage from "@/pages/auth-page";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import NotFound from "@/pages/not-found";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { MobileHeader } from "@/components/MobileHeader";
import { MobileSidebar } from "@/components/MobileSidebar";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { AdminRoute } from "@/lib/admin-route";
import { ViewerRestrictedRoute } from "@/lib/viewer-restricted-route";
// Import SidebarContext and SidebarProvider for managing sidebar state
import { SidebarProvider, SidebarContext } from "@/context/SidebarContext";
import { useContext } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

// Simple Error Boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Auth page error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="border-border bg-darkCard/80 backdrop-blur-sm p-8 text-center rounded-lg">
              <h1 className="text-2xl font-bold mb-4 text-white">Something went wrong</h1>
              <p className="text-gray-300 mb-8">Please try logging in again.</p>
              <button
                onClick={() => window.location.href = '/auth'}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function Router() {
  const [location] = useLocation();
  
  return (
    <Switch>
      <Route path="/auth">
        <div className="auth-routes">
          <ErrorBoundary>
            <AuthPage />
          </ErrorBoundary>
        </div>
      </Route>
      <Route path="/reset-password">
        <div className="auth-routes">
          <ErrorBoundary>
            <ResetPasswordPage />
          </ErrorBoundary>
        </div>
      </Route>
      <Route>
        <SidebarProvider>
          <MainContent />
        </SidebarProvider>
      </Route>
    </Switch>
  );
}

// Separate component to use the sidebar context
function MainContent() {
  const { isCollapsed } = useContext(SidebarContext);
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Get page title based on current route
  const [location] = useLocation();
  const getPageTitle = () => {
    if (location === '/') return 'Dashboard';
    if (location === '/projects') return 'Projects';
    if (location === '/bay-scheduling') return 'Bay Scheduling';
    if (location === '/billing') return 'Billing';
    if (location === '/manufacturing') return 'Manufacturing';
    if (location === '/on-time-delivery') return 'On-Time Delivery';
    if (location === '/calendar') return 'Calendar';
    if (location === '/meetings') return 'Meetings';
    if (location.startsWith('/meetings/')) return 'Meeting Details';
    if (location === '/sales-forecast') return 'Sales Forecast';
    if (location === '/reports') return 'Reports';
    if (location === '/export-reports') return 'Export Reports';
    if (location === '/import') return 'Import Data';
    if (location === '/supply-chain') return 'Supply Chain';
    if (location === '/archived-projects') return 'Archived Projects';
    if (location === '/delivered-projects') return 'Delivered Projects';
    if (location === '/settings/user') return 'Settings';
    return 'Manufacturing';
  };

  if (isMobile) {
    // Mobile Layout
    return (
      <div className="min-h-screen bg-darkBg text-white">
        <MobileHeader 
          onMenuClick={() => setMobileMenuOpen(true)}
          title={getPageTitle()}
        />
        <MobileSidebar 
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />
        <main className="mobile-main-content">
          <Switch>
            <Route path="/" exact>
              <Dashboard />
            </Route>
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
            <ProtectedRoute path="/meetings" component={Meetings} />
            <ProtectedRoute path="/meetings/:id" component={MeetingDetails} />
            <ProtectedRoute path="/sales-forecast" component={SalesForecast} />
            <ProtectedRoute path="/sales-deal/:id/edit" component={SalesDealEdit} />
            <ProtectedRoute path="/reports" component={Reports} />
            <ProtectedRoute path="/export-reports" component={ExportReports} />
            <ProtectedRoute path="/import" component={ImportData} />
            <ProtectedRoute path="/supply-chain" component={SupplyChain} />
            <ProtectedRoute path="/role-test" component={RoleTestPage} />
            <ProtectedRoute path="/settings/user" component={UserPreferences} />
            <Route path="/auth" component={AuthPage} />
            <Route path="/forgot-password" component={ForgotPasswordPage} />
            <Route path="/reset-password" component={ResetPasswordPage} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    );
  }

  // Desktop Layout (unchanged)
  return (
    <div className="min-h-screen flex flex-col bg-darkBg text-white desktop-layout">
      <Header />
      <div className="flex flex-1 h-[calc(100vh-64px)]">
        <Sidebar />
        <main className={`overflow-y-auto flex-1 transition-all duration-300 pt-16 ${isCollapsed ? 'ml-[50px]' : 'ml-[260px]'}`}>
          <Switch>
            <Route path="/" exact>
              <Dashboard />
            </Route>
            <ProtectedRoute path="/projects" component={ProjectStatus} />
            <ProtectedRoute path="/projects/new" component={ProjectCreate} />
            <ProtectedRoute path="/project/:id" component={ProjectDetails} />
            <ProtectedRoute path="/project/:id/edit" component={ProjectEdit} />
            <ProtectedRoute path="/archived-projects" component={ArchivedProjects} />
            <ProtectedRoute path="/delivered-projects" component={DeliveredProjects} />
            <ProtectedRoute path="/billing" component={BillingMilestones} />
            <ProtectedRoute path="/manufacturing" component={ManufacturingBay} />
            <ViewerRestrictedRoute path="/bay-scheduling" component={BaySchedulingPage} redirectPath="/" />
            <ProtectedRoute path="/meetings" component={Meetings} />
            <ProtectedRoute path="/meetings/:id" component={MeetingDetails} />
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
            <Route path="/forgot-password" component={ForgotPasswordPage} />
            <Route path="/reset-password" component={ResetPasswordPage} />
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
              <LoadingProvider>
                <Toaster />
                <Router />
              </LoadingProvider>
            </PermissionsProvider>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;