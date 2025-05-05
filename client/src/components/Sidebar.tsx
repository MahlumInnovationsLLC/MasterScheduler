import React from 'react';
import { useLocation, Link } from 'wouter';
import {
  LayoutDashboard,
  ListChecks,
  Calendar,
  BarChart3,
  DollarSign,
  Building2,
  Upload,
  Download,
  Settings,
  Users
} from 'lucide-react';

const Sidebar = () => {
  const [location] = useLocation();

  const isActive = (path: string) => {
    return location === path;
  };
  
  // Helper function for menu item classes
  const getMenuItemClasses = (isItemActive: boolean) => {
    return isItemActive 
      ? 'bg-primary bg-opacity-20 text-white' 
      : 'text-gray-700 dark:text-gray-300';
  };

  return (
    <aside className="bg-darkCard border-r border-gray-800 h-screen overflow-y-auto pt-16">
      <nav className="py-4 px-4">
        <div className="mb-6">
          <h6 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">
            Main Navigation
          </h6>
          <ul>
            <li>
              <Link href="/" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-800 mb-1 ${
                isActive('/') ? 'bg-primary bg-opacity-20 text-white' : 'text-gray-700 dark:text-gray-300'
              }`}>
                <LayoutDashboard className={`text-xl ${isActive('/') ? 'text-primary' : ''}`} />
                <span>Dashboard</span>
              </Link>
            </li>
            <li>
              <Link href="/projects" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-800 mb-1 ${
                isActive('/projects') || location.startsWith('/project/') 
                  ? 'bg-primary bg-opacity-20 text-white' 
                  : 'text-gray-700 dark:text-gray-300'
              }`}>
                <ListChecks className={`text-xl ${isActive('/projects') || location.startsWith('/project/') ? 'text-primary' : ''}`} />
                <span>Projects</span>
              </Link>
            </li>
            <li>
              <Link href="/calendar" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-800 mb-1 ${
                isActive('/calendar') ? 'bg-primary bg-opacity-20 text-white' : 'text-gray-700 dark:text-gray-300'
              }`}>
                <Calendar className={`text-xl ${isActive('/calendar') ? 'text-primary' : ''}`} />
                <span>Calendar</span>
              </Link>
            </li>
            <li>
              <Link href="/reports" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-800 mb-1 ${
                isActive('/reports') ? 'bg-primary bg-opacity-20 text-white' : 'text-gray-700 dark:text-gray-300'
              }`}>
                <BarChart3 className={`text-xl ${isActive('/reports') ? 'text-primary' : ''}`} />
                <span>Reports</span>
              </Link>
            </li>
          </ul>
        </div>
        
        <div className="mb-6">
          <h6 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">
            Modules
          </h6>
          <ul>
            <li>
              <Link href="/projects" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-800 mb-1 ${
                isActive('/projects') || location.startsWith('/project/') ? 'bg-primary bg-opacity-20 text-white' : 'text-gray-700 dark:text-gray-300'
              }`}>
                <ListChecks className={`text-xl ${isActive('/projects') || location.startsWith('/project/') ? 'text-primary' : ''}`} />
                <span>Project Status</span>
              </Link>
            </li>
            <li>
              <Link href="/billing" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-800 mb-1 ${
                isActive('/billing') ? 'bg-primary bg-opacity-20 text-white' : 'text-gray-700 dark:text-gray-300'
              }`}>
                <DollarSign className={`text-xl ${isActive('/billing') ? 'text-primary' : ''}`} />
                <span>Billing Milestones</span>
              </Link>
            </li>
            <li>
              <Link href="/manufacturing" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-800 mb-1 ${
                isActive('/manufacturing') ? 'bg-primary bg-opacity-20 text-white' : 'text-gray-700 dark:text-gray-300'
              }`}>
                <Building2 className={`text-xl ${isActive('/manufacturing') ? 'text-primary' : ''}`} />
                <span>Manufacturing Bays</span>
              </Link>
            </li>
          </ul>
        </div>
        
        <div className="mb-6">
          <h6 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">
            Data Management
          </h6>
          <ul>
            <li>
              <Link href="/import" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-800 mb-1 ${
                isActive('/import') ? 'bg-primary bg-opacity-20 text-white' : 'text-gray-700 dark:text-gray-300'
              }`}>
                <Upload className={`text-xl ${isActive('/import') ? 'text-primary' : ''}`} />
                <span>Import Data</span>
              </Link>
            </li>
            <li>
              <Link href="/export" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-800 mb-1 ${
                isActive('/export') ? 'bg-primary bg-opacity-20 text-white' : 'text-gray-700 dark:text-gray-300'
              }`}>
                <Download className={`text-xl ${isActive('/export') ? 'text-primary' : ''}`} />
                <span>Export Reports</span>
              </Link>
            </li>
          </ul>
        </div>
        
        <div>
          <h6 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">
            Settings
          </h6>
          <ul>
            <li>
              <Link href="/settings/user" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-800 mb-1 ${
                isActive('/settings/user') ? 'bg-primary bg-opacity-20 text-white' : 'text-gray-700 dark:text-gray-300'
              }`}>
                <Users className={`text-xl ${isActive('/settings/user') ? 'text-primary' : ''}`} />
                <span>User Preferences</span>
              </Link>
            </li>
            <li>
              <Link href="/system-settings" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-800 mb-1 ${
                isActive('/system-settings') || isActive('/settings/system') || isActive('/settings') ? 'bg-primary bg-opacity-20 text-white' : 'text-gray-700 dark:text-gray-300'
              }`}>
                <Settings className={`text-xl ${isActive('/system-settings') || isActive('/settings/system') || isActive('/settings') ? 'text-primary' : ''}`} />
                <span>System Settings</span>
              </Link>
            </li>
          </ul>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;