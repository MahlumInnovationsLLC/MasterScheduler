import React, { useContext } from 'react';
import { useLocation, Link } from 'wouter';
import {
  LayoutDashboard,
  ListChecks,
  CheckSquare,
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
  ShoppingCart,
  MessageSquare,
  Shield,
  Flag,
  CheckCircle,
  Package,
  Wrench
} from 'lucide-react';
import { SidebarContext } from '@/context/SidebarContext';
import { usePermissions } from '@/components/PermissionsManager';
import { useRolePermissions } from '@/hooks/use-role-permissions';
import { useModuleVisibility } from '@/hooks/use-module-visibility';
import { usePriorityAccess } from '@/hooks/use-priority-access';

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
  // Get module visibility settings for the current user
  const { isModuleVisible } = useModuleVisibility();
  // Get priority access permissions for the current user
  const { canViewPriorities } = usePriorityAccess();



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
    <aside className={`sidebar bg-darkCard border-r border-gray-800 fixed overflow-y-auto transition-all duration-300 z-10 ${isCollapsed ? 'w-[50px]' : 'w-[260px]'}`} style={{ top: '64px', height: 'calc(100vh - 64px)' }}>
      {/* Toggle Button - positioned outside of scrolling area */}
      <button 
        className="nav-button sidebar-button viewer-interactive absolute top-1 -right-4 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900 hover:from-gray-700 hover:via-gray-600 hover:to-gray-800 text-white rounded-full p-2 shadow-lg z-20 border border-gray-600 transition-all duration-200 relative overflow-hidden group"
        onClick={handleToggle}
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {/* Silver shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
        {/* Dark chevron icons */}
        <div className="relative z-10 text-gray-300 group-hover:text-white transition-colors duration-200">
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </div>
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
            {isModuleVisible('dashboard') && (
              <li>
                <SidebarLink href="/" className={`sidebar-nav-item flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive('/') ? 'active' : ''
                } ${isCollapsed ? 'justify-center' : ''}`} title="Dashboard">
                  <LayoutDashboard size={20} className={`${isActive('/') ? 'text-primary' : ''}`} />
                  {!isCollapsed && <span>Dashboard</span>}
                </SidebarLink>
              </li>
            )}
            <li>
              <SidebarLink href="/tasks" className={`sidebar-nav-item flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive('/tasks') ? 'active' : ''
              } ${isCollapsed ? 'justify-center' : ''}`} title="My Tasks">
                <CheckSquare size={20} className={`${isActive('/tasks') ? 'text-primary' : ''}`} />
                {!isCollapsed && <span>My Tasks</span>}
              </SidebarLink>
            </li>
            {isModuleVisible('projects') && (
              <li>
                <SidebarLink href="/projects" className={`sidebar-nav-item flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive('/projects') || locationStartsWith('/project/') ? 'active' : ''
                } ${isCollapsed ? 'justify-center' : ''}`} title="Projects">
                  <ListChecks size={20} className={`${isActive('/projects') || locationStartsWith('/project/') ? 'text-primary' : ''}`} />
                  {!isCollapsed && <span>Projects</span>}
                </SidebarLink>
              </li>
            )}
            {isModuleVisible('calendar') && (
              <li>
                <SidebarLink href="/calendar" className={`sidebar-nav-item flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive('/calendar') ? 'active' : ''
                } ${isCollapsed ? 'justify-center' : ''}`} title="Calendar">
                  <Calendar size={20} className={`${isActive('/calendar') ? 'text-primary' : ''}`} />
                  {!isCollapsed && <span>Calendar</span>}
                </SidebarLink>
              </li>
            )}
            {isModuleVisible('meetings') && (
              <li>
                <SidebarLink href="/meetings" className={`sidebar-nav-item flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive('/meetings') || locationStartsWith('/meetings/') ? 'active' : ''
                } ${isCollapsed ? 'justify-center' : ''}`} title="Tier">
                  <MessageSquare size={20} className={`${isActive('/meetings') || locationStartsWith('/meetings/') ? 'text-primary' : ''}`} />
                  {!isCollapsed && <span>Tier</span>}
                </SidebarLink>
              </li>
            )}
            {canViewPriorities && (
              <li>
                <SidebarLink href="/priorities" className={`sidebar-nav-item flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive('/priorities') ? 'active' : ''
                } ${isCollapsed ? 'justify-center' : ''}`} title="Priorities">
                  <Flag size={20} className={`${isActive('/priorities') ? 'text-primary' : ''}`} />
                  {!isCollapsed && <span>Priorities</span>}
                </SidebarLink>
              </li>
            )}

            {isModuleVisible('reports') && (
              <li>
                <SidebarLink href="/reports" className={`sidebar-nav-item flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive('/reports') ? 'active' : ''
                } ${isCollapsed ? 'justify-center' : ''}`} title="Reports & Analytics">
                  <BarChart3 size={20} className={`${isActive('/reports') ? 'text-primary' : ''}`} />
                  {!isCollapsed && <span>Reports & Analytics</span>}
                </SidebarLink>
              </li>
            )}
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
            {isModuleVisible('quality-assurance') && (
              <li>
                <SidebarLink href="/quality-assurance" className={`sidebar-nav-item flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive('/quality-assurance') ? 'active' : ''
                } ${isCollapsed ? 'justify-center' : ''}`} title="Quality Assurance">
                  <Shield size={20} className={`${isActive('/quality-assurance') ? 'text-primary' : ''}`} />
                  {!isCollapsed && <span>Quality Assurance</span>}
                </SidebarLink>
              </li>
            )}
            {isModuleVisible('bay-scheduling') && (
              <li>
                <SidebarLink href="/bay-scheduling" className={`sidebar-nav-item flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive('/bay-scheduling') ? 'active' : ''
                } ${isCollapsed ? 'justify-center' : ''}`} title="Bay Scheduling">
                  <GanttChart size={20} className={`${isActive('/bay-scheduling') ? 'text-primary' : ''}`} />
                  {!isCollapsed && <span>Bay Scheduling</span>}
                </SidebarLink>
              </li>
            )}
            {isModuleVisible('billing-milestones') && (
              <li>
                <SidebarLink href="/billing" className={`sidebar-nav-item flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive('/billing') ? 'active' : ''
                } ${isCollapsed ? 'justify-center' : ''}`} title="Billing Milestones">
                  <DollarSign size={20} className={`${isActive('/billing') ? 'text-primary' : ''}`} />
                  {!isCollapsed && <span>Billing Milestones</span>}
                </SidebarLink>
              </li>
            )}
            {isModuleVisible('forecast') && (
              <li>
                <SidebarLink href="/forecast" className={`sidebar-nav-item flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive('/forecast') ? 'active' : ''
                } ${isCollapsed ? 'justify-center' : ''}`} title="Forecast">
                  <TrendingUp size={20} className={`${isActive('/forecast') ? 'text-primary' : ''}`} />
                  {!isCollapsed && <span>Forecast</span>}
                </SidebarLink>
              </li>
            )}
            {isModuleVisible('capacity') && (
              <li>
                <SidebarLink href="/capacity-management" className={`sidebar-nav-item flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive('/capacity-management') ? 'active' : ''
                } ${isCollapsed ? 'justify-center' : ''}`} title="Capacity Management">
                  <Users size={20} className={`${isActive('/capacity-management') ? 'text-primary' : ''}`} />
                  {!isCollapsed && <span>Capacity Management</span>}
                </SidebarLink>
              </li>
            )}
            {isModuleVisible('on-time-delivery') && (
              <li>
                <SidebarLink href="/on-time-delivery" className={`sidebar-nav-item flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive('/on-time-delivery') ? 'active' : ''
                } ${isCollapsed ? 'justify-center' : ''}`} title="On Time Delivery">
                  <Clock size={20} className={`${isActive('/on-time-delivery') ? 'text-primary' : ''}`} />
                  {!isCollapsed && <span>On Time Delivery</span>}
                </SidebarLink>
              </li>
            )}
            {isModuleVisible('delivered-projects') && (
              <li>
                <SidebarLink href="/delivered-projects" className={`sidebar-nav-item flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive('/delivered-projects') ? 'active' : ''
                } ${isCollapsed ? 'justify-center' : ''}`} title="Delivered Projects">
                  <Truck size={20} className={`${isActive('/delivered-projects') ? 'text-primary' : ''}`} />
                  {!isCollapsed && <span>Delivered Projects</span>}
                </SidebarLink>
              </li>
            )}
            {isModuleVisible('supply-chain') && (
              <li>
                <SidebarLink href="/supply-chain" className={`sidebar-nav-item flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive('/supply-chain') ? 'active' : ''
                } ${isCollapsed ? 'justify-center' : ''}`} title="Benchmarks">
                  <CheckCircle size={20} className={`${isActive('/supply-chain') ? 'text-primary' : ''}`} />
                  {!isCollapsed && <span>Benchmarks</span>}
                </SidebarLink>
              </li>
            )}
            {isModuleVisible('material-management') && (
              <li>
                <SidebarLink href="/material-management" className={`sidebar-nav-item flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive('/material-management') ? 'active' : ''
                } ${isCollapsed ? 'justify-center' : ''}`} title="Material Management">
                  <Package size={20} className={`${isActive('/material-management') ? 'text-primary' : ''}`} />
                  {!isCollapsed && <span>Material Management</span>}
                </SidebarLink>
              </li>
            )}
            {isModuleVisible('engineering') && (
              <li>
                <SidebarLink href="/engineering" className={`sidebar-nav-item flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive('/engineering') ? 'active' : ''
                } ${isCollapsed ? 'justify-center' : ''}`} title="Engineering Resource Planner">
                  <Wrench size={20} className={`${isActive('/engineering') ? 'text-primary' : ''}`} />
                  {!isCollapsed && <span>Engineering</span>}
                </SidebarLink>
              </li>
            )}
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
            {isModuleVisible('import') && userRole !== 'viewer' && (
              <li>
                <SidebarLink href="/import" className={`sidebar-nav-item flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive('/import') ? 'active' : ''
                } ${isCollapsed ? 'justify-center' : ''}`} title="Import Data">
                  <Upload size={20} className={`${isActive('/import') ? 'text-primary' : ''}`} />
                  {!isCollapsed && <span>Import Data</span>}
                </SidebarLink>
              </li>
            )}
            {isModuleVisible('export-reports') && (
              <li>
                <SidebarLink href="/export-reports" className={`sidebar-nav-item flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive('/export-reports') ? 'active' : ''
                } ${isCollapsed ? 'justify-center' : ''}`} title="Export Reports">
                  <Download size={20} className={`${isActive('/export-reports') ? 'text-primary' : ''}`} />
                  {!isCollapsed && <span>Export Reports</span>}
                </SidebarLink>
              </li>
            )}
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
                <Users size={20} className={`${isActive('/settings/user') ? 'text-primary' : ''}`} />
                {!isCollapsed && <span>User Preferences</span>}
              </SidebarLink>
            </li>
            {isModuleVisible('system-settings') && userRole !== 'viewer' && (
              <li>
                <SidebarLink href="/system-settings" className={`sidebar-nav-item flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive('/system-settings') || isActive('/settings/system') || isActive('/settings') ? 'active' : ''
                } ${isCollapsed ? 'justify-center' : ''}`} title="System Settings">
                  <Settings size={20} className={`${isActive('/system-settings') || isActive('/settings/system') || isActive('/settings') ? 'text-primary' : ''}`} />
                  {!isCollapsed && <span>System Settings</span>}
                </SidebarLink>
              </li>
            )}
          </ul>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;