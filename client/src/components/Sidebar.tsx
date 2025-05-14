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
  ChevronRight
} from 'lucide-react';
import { SidebarContext } from '../App';

const Sidebar = () => {
  const [location] = useLocation();
  // Use the sidebar context instead of local state
  const { isCollapsed, toggleSidebar } = useContext(SidebarContext);

  const isActive = (path: string) => {
    return location === path;
  };

  // Helper function to check if location starts with a prefix
  const locationStartsWith = (prefix: string) => {
    return location.startsWith(prefix);
  };

  return (
    <aside className={`bg-darkCard border-r border-gray-800 fixed h-screen overflow-y-auto pt-16 transition-all duration-300 z-10 ${isCollapsed ? 'w-[50px]' : 'w-[260px]'}`}>
      {/* Toggle Button - positioned outside of scrolling area */}
      <button 
        className="absolute top-12 right-2 bg-primary hover:bg-primary-dark text-white rounded-full p-2 shadow-lg z-10 border border-gray-700"
        onClick={toggleSidebar}
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>
      
      <nav className={`py-4 ${isCollapsed ? 'px-2' : 'px-4'}`}>
        {/* Main Navigation */}
        <div className="mb-6">
          {!isCollapsed && (
            <h6 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">
              Main Navigation
            </h6>
          )}
          <ul>
            <li>
              <Link href="/" className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2.5 rounded-lg hover:bg-gray-800 mb-1 ${
                isActive('/') ? 'bg-primary bg-opacity-20 text-white' : 'text-gray-700 dark:text-gray-300'
              }`} title="Dashboard">
                <LayoutDashboard className={`text-xl ${isActive('/') ? 'text-primary' : ''}`} />
                {!isCollapsed && <span>Dashboard</span>}
              </Link>
            </li>
            <li>
              <Link href="/projects" className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2.5 rounded-lg hover:bg-gray-800 mb-1 ${
                isActive('/projects') || locationStartsWith('/project/') 
                  ? 'bg-primary bg-opacity-20 text-white' 
                  : 'text-gray-700 dark:text-gray-300'
              }`} title="Projects">
                <ListChecks className={`text-xl ${isActive('/projects') || locationStartsWith('/project/') ? 'text-primary' : ''}`} />
                {!isCollapsed && <span>Projects</span>}
              </Link>
            </li>
            <li>
              <Link href="/calendar" className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2.5 rounded-lg hover:bg-gray-800 mb-1 ${
                isActive('/calendar') ? 'bg-primary bg-opacity-20 text-white' : 'text-gray-700 dark:text-gray-300'
              }`} title="Calendar">
                <Calendar className={`text-xl ${isActive('/calendar') ? 'text-primary' : ''}`} />
                {!isCollapsed && <span>Calendar</span>}
              </Link>
            </li>
            <li>
              <Link href="/reports" className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2.5 rounded-lg hover:bg-gray-800 mb-1 ${
                isActive('/reports') ? 'bg-primary bg-opacity-20 text-white' : 'text-gray-700 dark:text-gray-300'
              }`} title="Reports">
                <BarChart3 className={`text-xl ${isActive('/reports') ? 'text-primary' : ''}`} />
                {!isCollapsed && <span>Reports</span>}
              </Link>
            </li>
          </ul>
        </div>
        
        {/* Modules */}
        <div className="mb-6">
          {!isCollapsed && (
            <h6 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">
              Modules
            </h6>
          )}
          <ul>
            <li>
              <Link href="/sales-forecast" className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2.5 rounded-lg hover:bg-gray-800 mb-1 ${
                isActive('/sales-forecast') ? 'bg-primary bg-opacity-20 text-white' : 'text-gray-700 dark:text-gray-300'
              }`} title="Sales Forecast">
                <TrendingUp className={`text-xl ${isActive('/sales-forecast') ? 'text-primary' : ''}`} />
                {!isCollapsed && <span>Sales Forecast</span>}
              </Link>
            </li>
            <li>
              <Link href="/bay-scheduling" className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2.5 rounded-lg hover:bg-gray-800 mb-1 ${
                isActive('/bay-scheduling') ? 'bg-primary bg-opacity-20 text-white' : 'text-gray-700 dark:text-gray-300'
              }`} title="Bay Scheduling">
                <GanttChart className={`text-xl ${isActive('/bay-scheduling') ? 'text-primary' : ''}`} />
                {!isCollapsed && <span>Bay Scheduling</span>}
              </Link>
            </li>
            <li>
              <Link href="/billing" className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2.5 rounded-lg hover:bg-gray-800 mb-1 ${
                isActive('/billing') ? 'bg-primary bg-opacity-20 text-white' : 'text-gray-700 dark:text-gray-300'
              }`} title="Billing Milestones">
                <DollarSign className={`text-xl ${isActive('/billing') ? 'text-primary' : ''}`} />
                {!isCollapsed && <span>Billing Milestones</span>}
              </Link>
            </li>
            <li>
              <Link href="/delivery-tracking" className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2.5 rounded-lg hover:bg-gray-800 mb-1 ${
                isActive('/delivery-tracking') ? 'bg-primary bg-opacity-20 text-white' : 'text-gray-700 dark:text-gray-300'
              }`} title="On Time Delivery">
                <Clock className={`text-xl ${isActive('/delivery-tracking') ? 'text-primary' : ''}`} />
                {!isCollapsed && <span>On Time Delivery</span>}
              </Link>
            </li>
            <li>
              <Link href="/delivered-projects" className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2.5 rounded-lg hover:bg-gray-800 mb-1 ${
                isActive('/delivered-projects') ? 'bg-primary bg-opacity-20 text-white' : 'text-gray-700 dark:text-gray-300'
              }`} title="Delivered Projects">
                <Truck className={`text-xl ${isActive('/delivered-projects') ? 'text-primary' : ''}`} />
                {!isCollapsed && <span>Delivered Projects</span>}
              </Link>
            </li>
          </ul>
        </div>
        
        {/* Data Management */}
        <div className="mb-6">
          {!isCollapsed && (
            <h6 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">
              Data Management
            </h6>
          )}
          <ul>
            <li>
              <Link href="/import" className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2.5 rounded-lg hover:bg-gray-800 mb-1 ${
                isActive('/import') ? 'bg-primary bg-opacity-20 text-white' : 'text-gray-700 dark:text-gray-300'
              }`} title="Import Data">
                <Upload className={`text-xl ${isActive('/import') ? 'text-primary' : ''}`} />
                {!isCollapsed && <span>Import Data</span>}
              </Link>
            </li>
            <li>
              <Link href="/export" className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2.5 rounded-lg hover:bg-gray-800 mb-1 ${
                isActive('/export') ? 'bg-primary bg-opacity-20 text-white' : 'text-gray-700 dark:text-gray-300'
              }`} title="Export Reports">
                <Download className={`text-xl ${isActive('/export') ? 'text-primary' : ''}`} />
                {!isCollapsed && <span>Export Reports</span>}
              </Link>
            </li>
          </ul>
        </div>
        
        {/* Settings */}
        <div>
          {!isCollapsed && (
            <h6 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">
              Settings
            </h6>
          )}
          <ul>
            <li>
              <Link href="/settings/user" className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2.5 rounded-lg hover:bg-gray-800 mb-1 ${
                isActive('/settings/user') ? 'bg-primary bg-opacity-20 text-white' : 'text-gray-700 dark:text-gray-300'
              }`} title="User Preferences">
                <Users className={`text-xl ${isActive('/settings/user') ? 'text-primary' : ''}`} />
                {!isCollapsed && <span>User Preferences</span>}
              </Link>
            </li>
            <li>
              <Link href="/system-settings" className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2.5 rounded-lg hover:bg-gray-800 mb-1 ${
                isActive('/system-settings') || isActive('/settings/system') || isActive('/settings') ? 'bg-primary bg-opacity-20 text-white' : 'text-gray-700 dark:text-gray-300'
              }`} title="System Settings">
                <Settings className={`text-xl ${isActive('/system-settings') || isActive('/settings/system') || isActive('/settings') ? 'text-primary' : ''}`} />
                {!isCollapsed && <span>System Settings</span>}
              </Link>
            </li>
          </ul>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;