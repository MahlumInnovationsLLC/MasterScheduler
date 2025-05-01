import { Switch, Route } from "wouter";
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
import CalendarPage from "@/pages/Calendar";
import Reports from "@/pages/Reports";
import ImportData from "@/pages/ImportData";
import NotFound from "@/pages/not-found";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";

function Router() {
  return (
    <div className="min-h-screen flex flex-col bg-darkBg text-white">
      <Header />
      <div className="flex-1 grid grid-cols-[260px_1fr]">
        <Sidebar />
        <main className="overflow-y-auto h-screen pt-16">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/projects" component={ProjectStatus} />
            <Route path="/projects/:id" component={ProjectDetails} />
            <Route path="/billing" component={BillingMilestones} />
            <Route path="/manufacturing" component={ManufacturingBay} />
            <Route path="/calendar" component={CalendarPage} />
            <Route path="/reports" component={Reports} />
            <Route path="/import" component={ImportData} />
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
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
