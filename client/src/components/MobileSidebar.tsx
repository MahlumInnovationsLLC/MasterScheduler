import React from 'react';
import { useLocation, Link } from 'wouter';
import { X, Home, FolderOpen, CheckSquare, Calendar, BarChart3, Settings, Package, Truck, Calculator, FileText, Archive, CheckCircle, Clock, DollarSign, Building2, TrendingUp, Package2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from "@/components/PermissionsManager";
import { useModuleVisibility } from "@/hooks/use-module-visibility";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const [location] = useLocation();
  const { hasAccess } = usePermissions();
  const { isModuleVisible } = useModuleVisibility();
  const { user } = useAuth();

  const navigationItems = [
    { id: "dashboard", icon: Home, label: 'Dashboard', path: '/' },
    { id: "my-tasks", icon: CheckSquare, label: 'My Tasks', path: '/tasks' },
    { id: "projects", icon: FolderOpen, label: 'Projects', path: '/projects' },
    { id: "bay-scheduling", icon: Building2, label: 'Bay Scheduling', path: '/bay-scheduling' },
    { id: "billing", icon: DollarSign, label: 'Billing', path: '/billing' },
    { id: "manufacturing", icon: Package, label: 'Manufacturing', path: '/manufacturing' },
    { id: "on-time-delivery", icon: Clock, label: 'On-Time Delivery', path: '/on-time-delivery' },
    { id: "calendar", icon: Calendar, label: 'Calendar', path: '/calendar' },
    { id: "sales-forecast", icon: TrendingUp, label: 'Sales Forecast', path: '/sales-forecast' },
    { id: "reports", icon: BarChart3, label: 'Reports', path: '/reports' },
    { id: "export-reports", icon: FileText, label: 'Export Reports', path: '/export-reports' },
    { id: "import", icon: Package2, label: 'Import Data', path: '/import' },
    { id: "supply-chain", icon: Truck, label: 'Supply Chain', path: '/supply-chain' },
    { id: "archived-projects", icon: Archive, label: 'Archived Projects', path: '/archived-projects' },
    { id: "delivered-projects", icon: CheckCircle, label: 'Delivered Projects', path: '/delivered-projects' },
    { id: "quality-assurance", icon: Shield, label: 'Quality Assurance', path: '/quality-assurance' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location === '/';
    return location.startsWith(path);
  };

  const filteredNavItems = navigationItems.filter(item => {
    // For mobile sidebar, we'll use the module visibility check
    // since hasAccess might not be available in this context
    // My Tasks should always be visible as it's a core functionality
    if (item.id === "my-tasks") return true;
    return isModuleVisible(item.id);
  });

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
      <div className={`mobile-sidebar-drawer ${isOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
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
          <div className="p-4 border-b border-gray-700">
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

        {/* Navigation */}
        <ScrollArea className="flex-1 px-2 py-4">
          <div className="space-y-1">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <Link key={item.path} href={item.path}>
                  <button
                    onClick={onClose}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors
                      ${active 
                        ? 'bg-blue-600 text-white' 
                        : 'text-gray-300 hover:text-white hover:bg-gray-800'
                      }
                    `}
                  >
                    <Icon size={18} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                </Link>
              );
            })}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700">
          <Link href="/settings/user">
            <button
              onClick={onClose}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors text-gray-300 hover:text-white hover:bg-gray-800"
            >
              <Settings size={18} />
              <span className="text-sm font-medium">Settings</span>
            </button>
          </Link>
        </div>
      </div>
    </>
  );
}