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

  return (
    <aside className="bg-darkCard border-r border-gray-800 h-screen overflow-y-auto pt-16">
      <nav className="py-4 px-4">
        <div className="mb-6">
          <h6 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">
            Main Navigation
          </h6>
          <ul>
            <li>
              <Link href="/">
                <a className={`flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-800 mb-1 ${
                  isActive('/') ? 'bg-primary bg-opacity-20 text-white' : 'text-gray-300'
                }`}>
                  <LayoutDashboard className={`text-xl ${isActive('/') ? 'text-primary' : ''}`} />
                  <span>Dashboard</span>
                </a>
              </Link>
            </li>
            <li>
              <Link href="/projects">
                <a className={`flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-800 mb-1 ${
                  isActive('/projects') || location.startsWith('/projects/') 
                    ? 'bg-primary bg-opacity-20 text-white' 
                    : 'text-gray-300'
                }`}>
                  <ListChecks className={`text-xl ${isActive('/projects') || location.startsWith('/projects/') ? 'text-primary' : ''}`} />
                  <span>Projects</span>
                </a>
              </Link>
            </li>
            <li>
              <Link href="/calendar">
                <a className={`flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-800 mb-1 ${
                  isActive('/calendar') ? 'bg-primary bg-opacity-20 text-white' : 'text-gray-300'
                }`}>
                  <Calendar className="text-xl" />
                  <span>Calendar</span>
                </a>
              </Link>
            </li>
            <li>
              <Link href="/reports">
                <a className={`flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-800 mb-1 ${
                  isActive('/reports') ? 'bg-primary bg-opacity-20 text-white' : 'text-gray-300'
                }`}>
                  <BarChart3 className="text-xl" />
                  <span>Reports</span>
                </a>
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
              <Link href="/projects">
                <a className={`flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-800 mb-1 ${
                  isActive('/projects') ? 'bg-primary bg-opacity-20 text-white' : 'text-gray-300'
                }`}>
                  <ListChecks className="text-xl" />
                  <span>Project Status</span>
                </a>
              </Link>
            </li>
            <li>
              <Link href="/billing">
                <a className={`flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-800 mb-1 ${
                  isActive('/billing') ? 'bg-primary bg-opacity-20 text-white' : 'text-gray-300'
                }`}>
                  <DollarSign className="text-xl" />
                  <span>Billing Milestones</span>
                </a>
              </Link>
            </li>
            <li>
              <Link href="/manufacturing">
                <a className={`flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-800 mb-1 ${
                  isActive('/manufacturing') ? 'bg-primary bg-opacity-20 text-white' : 'text-gray-300'
                }`}>
                  <Building2 className="text-xl" />
                  <span>Manufacturing Bays</span>
                </a>
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
              <Link href="/import">
                <a className={`flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-800 mb-1 ${
                  isActive('/import') ? 'bg-primary bg-opacity-20 text-white' : 'text-gray-300'
                }`}>
                  <Upload className="text-xl" />
                  <span>Import Data</span>
                </a>
              </Link>
            </li>
            <li>
              <Link href="/export">
                <a className={`flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-800 mb-1 ${
                  isActive('/export') ? 'bg-primary bg-opacity-20 text-white' : 'text-gray-300'
                }`}>
                  <Download className="text-xl" />
                  <span>Export Reports</span>
                </a>
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
              <Link href="/settings/user">
                <a className={`flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-800 mb-1 ${
                  isActive('/settings/user') ? 'bg-primary bg-opacity-20 text-white' : 'text-gray-300'
                }`}>
                  <Users className="text-xl" />
                  <span>User Preferences</span>
                </a>
              </Link>
            </li>
            <li>
              <Link href="/settings/system">
                <a className={`flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-800 mb-1 ${
                  isActive('/settings/system') ? 'bg-primary bg-opacity-20 text-white' : 'text-gray-300'
                }`}>
                  <Settings className="text-xl" />
                  <span>System Settings</span>
                </a>
              </Link>
            </li>
          </ul>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;
