import React, { useContext } from 'react';
import { useLocation, Link } from 'wouter';
import {
  LayoutDashboard,
  ListChecks,
  Calendar,
  BarChart3,
  DollarSign,
  Upload,
  Download,
  Settings,
  Users,
  Clock,
  Truck,
  TrendingUp,
  GanttChart,
  ChevronLeft,
  ChevronRight,
  ShoppingCart
} from 'lucide-react';
import { SidebarContext } from '@/context/SidebarContext';
import { usePermissions } from '@/components/PermissionsManager';
import { useRolePermissions } from '@/hooks/use-role-permissions';
import { RoleBasedWrapper } from '@/components/RoleBasedWrapper';

// Custom Link component that adds sidebar-item class for view-only mode support
const SidebarLink = ({ href, className, title, children }: { 
  href: string; 
  className: string; 
  title: string;
  children: React.ReactNode 
}) => {
  return (
    <Link href={href} className={`sidebar-item viewer-interactive sidebar-link ${className}`} title={title}>
      {children}
    </Link>
  );
};

const Sidebar = () => {
  const [location] = useLocation();
  // Use the sidebar context instead of local state
  const { isCollapsed, toggleSidebar } = useContext(SidebarContext);
  // Get user role to conditionally hide bay scheduling
  const { userRole } = usePermissions();

  // Directly call toggleSidebar from context
  const handleToggle = () => {
    console.log("Sidebar toggle button clicked");
    console.log("Before toggle - isCollapsed:", isCollapsed);
    toggleSidebar();
    // Log after state change attempt
    console.log("Toggle function called");
  };

  const isActive = (path: string) => {
    return location === path;
  };

  // Helper function to check if location starts with a prefix
  const locationStartsWith = (prefix: string) => {
    return location.startsWith(prefix);
  };

  return (
    <aside className={`sidebar bg-darkCard border-r border-gray-800 fixed h-screen overflow-y-auto transition-all duration-300 z-10 ${isCollapsed ? 'w-[50px]' : 'w-[260px]'}`} style={{ top: '64px' }}>
      {/* Toggle Button - positioned outside of scrolling area */}
      <button 
        className="nav-button sidebar-button viewer-interactive absolute top-1 right-2 bg-primary hover:bg-primary-dark text-white rounded-full p-2 shadow-lg z-20 border border-gray-700"
        onClick={handleToggle}
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>

      <nav className={`py-4 ${isCollapsed ? 'px-2' : 'px-4'}`}>
        {/* Main Navigation */}
        <div className="mb-6">
          {!isCollapsed && (
            <h6 className="sidebar-section-header text-xs font-semibold uppercase tracking-wider mb-2 px-3">
              Main Navigation
            </h6>
          )}
          <ul>
            <li>
              <SidebarLink href="/" className={`sidebar-nav-item flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive('/') ? 'active' : ''
              } ${isCollapsed ? 'justify-center' : ''}`} title="Dashboard">
                <LayoutDashboard className={`text-xl ${isActive('/') ? 'text-primary' : ''}`} />
                {!isCollapsed && <span>Dashboard</span>}
              </SidebarLink>
            </li>
            <li>
              <SidebarLink href="/projects" className={`sidebar-nav-item flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive('/projects') || locationStartsWith('/project/') ? 'active' : ''
              } ${isCollapsed ? 'justify-center' : ''}`} title="Projects">
                <ListChecks className={`text-xl ${isActive('/projects') || locationStartsWith('/project/') ? 'text-primary' : ''}`} />
                {!isCollapsed && <span>Projects</span>}
              </SidebarLink>
            </li>
            <li>
              <SidebarLink href="/calendar" className={`sidebar-nav-item flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive('/calendar') ? 'active' : ''
              } ${isCollapsed ? 'justify-center' : ''}`} title="Calendar">
                <Calendar className={`text-xl ${isActive('/calendar') ? 'text-primary' : ''}`} />
                {!isCollapsed && <span>Calendar</span>}
              </SidebarLink>
            </li>
            <li>
              <SidebarLink href="/reports" className={`sidebar-nav-item flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive('/reports') ? 'active' : ''
              } ${isCollapsed ? 'justify-center' : ''}`} title="Reports">
                <BarChart3 className={`text-xl ${isActive('/reports') ? 'text-primary' : ''}`} />
                {!isCollapsed && <span>Reports</span>}
              </SidebarLink>
            </li>
          </ul>
        </div>

        {/* Modules */}
        <div className="mb-6">
          {!isCollapsed && (
            <h6 className="sidebar-section-header text-xs font-semibold uppercase tracking-wider mb-2 px-3">
              Modules
            </h6>
          )}
          <ul>
            <li>
              <SidebarLink href="/sales-forecast" className={`sidebar-nav-item flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive('/sales-forecast') ? 'active' : ''
              } ${isCollapsed ? 'justify-center' : ''}`} title="Sales Forecast">
                <TrendingUp className={`text-xl ${isActive('/sales-forecast') ? 'text-primary' : ''}`} />
                {!isCollapsed && <span>Sales Forecast</span>}
              </SidebarLink>
            </li>
            {/* Hide Bay Scheduling from Viewer role users */}
            {userRole !== "viewer" && (
              <li>
                <SidebarLink href="/bay-scheduling" className={`sidebar-nav-item flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive('/bay-scheduling') ? 'active' : ''
                } ${isCollapsed ? 'justify-center' : ''}`} title="Bay Scheduling">
                  <GanttChart className={`text-xl ${isActive('/bay-scheduling') ? 'text-primary' : ''}`} />
                  {!isCollapsed && <span>Bay Scheduling</span>}
                </SidebarLink>
              </li>
            )}
            <li>
              <SidebarLink href="/billing" className={`sidebar-nav-item flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive('/billing') ? 'active' : ''
              } ${isCollapsed ? 'justify-center' : ''}`} title="Billing Milestones">
                <DollarSign className={`text-xl ${isActive('/billing') ? 'text-primary' : ''}`} />
                {!isCollapsed && <span>Billing Milestones</span>}
              </SidebarLink>
            </li>
            <li>
              <SidebarLink href="/on-time-delivery" className={`sidebar-nav-item flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive('/on-time-delivery') ? 'active' : ''
              } ${isCollapsed ? 'justify-center' : ''}`} title="On Time Delivery">
                <Clock className={`text-xl ${isActive('/on-time-delivery') ? 'text-primary' : ''}`} />
                {!isCollapsed && <span>On Time Delivery</span>}
              </SidebarLink>
            </li>
            <li>
              <SidebarLink href="/delivered-projects" className={`sidebar-nav-item flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive('/delivered-projects') ? 'active' : ''
              } ${isCollapsed ? 'justify-center' : ''}`} title="Delivered Projects">
                <Truck className={`text-xl ${isActive('/delivered-projects') ? 'text-primary' : ''}`} />
                {!isCollapsed && <span>Delivered Projects</span>}
              </SidebarLink>
            </li>
            <li>
              <SidebarLink href="/supply-chain" className={`sidebar-nav-item flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive('/supply-chain') ? 'active' : ''
              } ${isCollapsed ? 'justify-center' : ''}`} title="Supply Chain">
                <ShoppingCart className={`text-xl ${isActive('/supply-chain') ? 'text-primary' : ''}`} />
                {!isCollapsed && <span>Supply Chain</span>}
              </SidebarLink>
            </li>
          </ul>
        </div>

        {/* Data Management */}
        <div className="mb-6">
          {!isCollapsed && (
            <h6 className="sidebar-section-header text-xs font-semibold uppercase tracking-wider mb-2 px-3">
              Data Management
            </h6>
          )}
          <ul>
            <li>
              <RoleBasedWrapper requiresEdit={true}>
                <SidebarLink href="/import" className={`sidebar-nav-item flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive('/import') ? 'active' : ''
                } ${isCollapsed ? 'justify-center' : ''}`} title="Import Data">
                  <Upload className={`text-xl ${isActive('/import') ? 'text-primary' : ''}`} />
                  {!isCollapsed && <span>Import Data</span>}
                </SidebarLink>
              </RoleBasedWrapper>
            </li>
            <li>
              <SidebarLink href="/export-reports" className={`sidebar-nav-item flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive('/export-reports') ? 'active' : ''
              } ${isCollapsed ? 'justify-center' : ''}`} title="Export Reports">
                <Download className={`text-xl ${isActive('/export-reports') ? 'text-primary' : ''}`} />
                {!isCollapsed && <span>Export Reports</span>}
              </SidebarLink>
            </li>
          </ul>
        </div>

        {/* Settings */}
        <div>
          {!isCollapsed && (
            <h6 className="sidebar-section-header text-xs font-semibold uppercase tracking-wider mb-2 px-3">
              Settings
            </h6>
          )}
          <ul>
            <li>
              <SidebarLink href="/settings/user" className={`sidebar-nav-item flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive('/settings/user') ? 'active' : ''
              } ${isCollapsed ? 'justify-center' : ''}`} title="User Preferences">
                <Users className={`text-xl ${isActive('/settings/user') ? 'text-primary' : ''}`} />
                {!isCollapsed && <span>User Preferences</span>}
              </SidebarLink>
            </li>
            <RoleBasedWrapper requiresAdmin={true} fallback={null}>
              <li>
                <SidebarLink href="/system-settings" className={`sidebar-nav-item flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive('/system-settings') || isActive('/settings/system') || isActive('/settings') ? 'active' : ''
                } ${isCollapsed ? 'justify-center' : ''}`} title="System Settings">
                  <Settings className={`text-xl ${isActive('/system-settings') || isActive('/settings/system') || isActive('/settings') ? 'text-primary' : ''}`} />
                  {!isCollapsed && <span>System Settings</span>}
                </SidebarLink>
              </li>
            </RoleBasedWrapper>
          </ul>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;