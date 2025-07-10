import React from 'react';
import { useLocation, Link } from 'wouter';
import { 
  X, 
  LayoutDashboard, 
  ListChecks, 
  CheckSquare, 
  Calendar, 
  BarChart3, 
  Settings, 
  Package, 
  Truck, 
  FileText, 
  Archive, 
  CheckCircle, 
  Clock, 
  DollarSign, 
  GanttChart, 
  TrendingUp, 
  Upload, 
  Download, 
  Shield,
  MessageSquare,
  Flag,
  Users,
  Wrench,
  Factory
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from "@/components/PermissionsManager";
import { useModuleVisibility } from "@/hooks/use-module-visibility";
import { usePriorityAccess } from '@/hooks/use-priority-access';
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const [location] = useLocation();
  const { userRole } = usePermissions();
  const { isModuleVisible } = useModuleVisibility();
  const { canViewPriorities } = usePriorityAccess();
  const { user } = useAuth();

  const isActive = (path: string) => {
    if (path === '/') return location === '/';
    return location.startsWith(path);
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="mobile-sidebar-overlay"
          onClick={onClose}
        />
      )}

      {/* Sidebar Drawer */}
      <div className={`mobile-sidebar-drawer ${isOpen ? 'open' : ''} flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-white">Manufacturing</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <X size={18} />
          </Button>
        </div>

        {/* User Info */}
        {user && (
          <div className="p-4 border-b border-gray-700 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {user.username?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div>
                <div className="text-sm font-medium text-white">
                  {user.username || 'User'}
                </div>
                <div className="text-xs text-gray-400 capitalize">
                  {user.role || 'User'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation - Scrollable Content */}
        <ScrollArea className="flex-1 px-2 py-4 overflow-y-auto">
          <div className="space-y-6">
            {/* Main Navigation */}
            <div>
              <h6 className="text-xs font-semibold uppercase tracking-wider mb-2 px-3 text-gray-400">
                Main Navigation
              </h6>
              <div className="space-y-1">
                {isModuleVisible('dashboard') && (
                  <Link href="/">
                    <button
                      onClick={onClose}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        isActive('/') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-800'
                      }`}
                    >
                      <LayoutDashboard size={18} />
                      <span className="text-sm font-medium">Dashboard</span>
                    </button>
                  </Link>
                )}
                
                <Link href="/tasks">
                  <button
                    onClick={onClose}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      isActive('/tasks') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    <CheckSquare size={18} />
                    <span className="text-sm font-medium">My Tasks</span>
                  </button>
                </Link>

                {isModuleVisible('projects') && (
                  <Link href="/projects">
                    <button
                      onClick={onClose}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        isActive('/projects') || location.startsWith('/project/') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-800'
                      }`}
                    >
                      <ListChecks size={18} />
                      <span className="text-sm font-medium">Projects</span>
                    </button>
                  </Link>
                )}

                {isModuleVisible('calendar') && (
                  <Link href="/calendar">
                    <button
                      onClick={onClose}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        isActive('/calendar') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-800'
                      }`}
                    >
                      <Calendar size={18} />
                      <span className="text-sm font-medium">Calendar</span>
                    </button>
                  </Link>
                )}

                {isModuleVisible('meetings') && (
                  <Link href="/meetings">
                    <button
                      onClick={onClose}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        isActive('/meetings') || location.startsWith('/meetings/') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-800'
                      }`}
                    >
                      <MessageSquare size={18} />
                      <span className="text-sm font-medium">Tier</span>
                    </button>
                  </Link>
                )}

                {canViewPriorities && (
                  <Link href="/priorities">
                    <button
                      onClick={onClose}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        isActive('/priorities') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-800'
                      }`}
                    >
                      <Flag size={18} />
                      <span className="text-sm font-medium">Priorities</span>
                    </button>
                  </Link>
                )}

                {isModuleVisible('reports') && (
                  <Link href="/reports">
                    <button
                      onClick={onClose}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        isActive('/reports') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-800'
                      }`}
                    >
                      <BarChart3 size={18} />
                      <span className="text-sm font-medium">Reports & Analytics</span>
                    </button>
                  </Link>
                )}
              </div>
            </div>

            {/* Modules */}
            <div>
              <h6 className="text-xs font-semibold uppercase tracking-wider mb-2 px-3 text-gray-400">
                Modules
              </h6>
              <div className="space-y-1">
                {isModuleVisible('quality-assurance') && (
                  <Link href="/quality-assurance">
                    <button
                      onClick={onClose}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        isActive('/quality-assurance') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-800'
                      }`}
                    >
                      <Shield size={18} />
                      <span className="text-sm font-medium">Quality Assurance</span>
                    </button>
                  </Link>
                )}

                {isModuleVisible('bay-scheduling') && (
                  <Link href="/bay-scheduling">
                    <button
                      onClick={onClose}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        isActive('/bay-scheduling') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-800'
                      }`}
                    >
                      <GanttChart size={18} />
                      <span className="text-sm font-medium">Bay Scheduling</span>
                    </button>
                  </Link>
                )}

                {isModuleVisible('billing-milestones') && (
                  <Link href="/billing">
                    <button
                      onClick={onClose}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        isActive('/billing') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-800'
                      }`}
                    >
                      <DollarSign size={18} />
                      <span className="text-sm font-medium">Billing Milestones</span>
                    </button>
                  </Link>
                )}

                {isModuleVisible('forecast') && (
                  <Link href="/forecast">
                    <button
                      onClick={onClose}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        isActive('/forecast') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-800'
                      }`}
                    >
                      <TrendingUp size={18} />
                      <span className="text-sm font-medium">Forecast</span>
                    </button>
                  </Link>
                )}
                {isModuleVisible('capacity') && (
                  <Link href="/capacity-management">
                    <button
                      onClick={onClose}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        isActive('/capacity-management') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-800'
                      }`}
                    >
                      <Users size={18} />
                      <span className="text-sm font-medium">Capacity Management</span>
                    </button>
                  </Link>
                )}

                {isModuleVisible('department-schedules') && (
                  <Link href="/department-schedules">
                    <button
                      onClick={onClose}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        isActive('/department-schedules') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-800'
                      }`}
                    >
                      <Factory size={18} />
                      <span className="text-sm font-medium">Department Schedules</span>
                    </button>
                  </Link>
                )}

                {isModuleVisible('on-time-delivery') && (
                  <Link href="/on-time-delivery">
                    <button
                      onClick={onClose}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        isActive('/on-time-delivery') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-800'
                      }`}
                    >
                      <Clock size={18} />
                      <span className="text-sm font-medium">On Time Delivery</span>
                    </button>
                  </Link>
                )}

                {isModuleVisible('delivered-projects') && (
                  <Link href="/delivered-projects">
                    <button
                      onClick={onClose}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        isActive('/delivered-projects') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-800'
                      }`}
                    >
                      <Truck size={18} />
                      <span className="text-sm font-medium">Delivered Projects</span>
                    </button>
                  </Link>
                )}

                {isModuleVisible('supply-chain') && (
                  <Link href="/supply-chain">
                    <button
                      onClick={onClose}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        isActive('/supply-chain') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-800'
                      }`}
                    >
                      <CheckCircle size={18} />
                      <span className="text-sm font-medium">Benchmarks</span>
                    </button>
                  </Link>
                )}

                {isModuleVisible('material-management') && (
                  <Link href="/material-management">
                    <button
                      onClick={onClose}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        isActive('/material-management') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-800'
                      }`}
                    >
                      <Package size={18} />
                      <span className="text-sm font-medium">Material Management</span>
                    </button>
                  </Link>
                )}

                {isModuleVisible('engineering') && (
                  <Link href="/engineering">
                    <button
                      onClick={onClose}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        isActive('/engineering') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-800'
                      }`}
                    >
                      <Wrench size={18} />
                      <span className="text-sm font-medium">Engineering</span>
                    </button>
                  </Link>
                )}
              </div>
            </div>

            {/* Data Management */}
            <div>
              <h6 className="text-xs font-semibold uppercase tracking-wider mb-2 px-3 text-gray-400">
                Data Management
              </h6>
              <div className="space-y-1">
                {isModuleVisible('import') && userRole !== 'viewer' && (
                  <Link href="/import">
                    <button
                      onClick={onClose}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        isActive('/import') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-800'
                      }`}
                    >
                      <Upload size={18} />
                      <span className="text-sm font-medium">Import Data</span>
                    </button>
                  </Link>
                )}

                {isModuleVisible('export-reports') && (
                  <Link href="/export-reports">
                    <button
                      onClick={onClose}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        isActive('/export-reports') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-800'
                      }`}
                    >
                      <Download size={18} />
                      <span className="text-sm font-medium">Export Reports</span>
                    </button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Settings Footer */}
        <div className="p-4 border-t border-gray-700 space-y-1 flex-shrink-0">
          <h6 className="text-xs font-semibold uppercase tracking-wider mb-2 px-3 text-gray-400">
            Settings
          </h6>
          <Link href="/settings/user">
            <button
              onClick={onClose}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                isActive('/settings/user') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Users size={18} />
              <span className="text-sm font-medium">User Preferences</span>
            </button>
          </Link>
          
          {isModuleVisible('system-settings') && userRole !== 'viewer' && (
            <Link href="/system-settings">
              <button
                onClick={onClose}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                  isActive('/system-settings') || isActive('/settings/system') || isActive('/settings') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-800'
                }`}
              >
                <Settings size={18} />
                <span className="text-sm font-medium">System Settings</span>
              </button>
            </Link>
          )}
        </div>
      </div>
    </>
  );
}