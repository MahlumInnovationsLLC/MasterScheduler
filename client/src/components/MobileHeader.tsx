import React, { useState } from 'react';
import { Menu, X, Bell, Settings, User, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MobileHeaderProps {
  onMenuClick: () => void;
  title?: string;
}

export function MobileHeader({ onMenuClick, title = "Manufacturing" }: MobileHeaderProps) {
  const { user, logoutMutation } = useAuth();

  return (
    <div className="mobile-nav-wrapper h-14 px-4 flex items-center justify-between bg-gray-900 border-b border-gray-700">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onMenuClick}
          className="p-2 text-gray-300 hover:text-white hover:bg-gray-800"
        >
          <Menu size={20} />
        </Button>
        <h1 className="text-lg font-semibold text-white truncate">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="p-2 text-gray-300 hover:text-white hover:bg-gray-800"
        >
          <Bell size={18} />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-gray-300 hover:text-white hover:bg-gray-800"
            >
              <User size={18} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5 text-sm text-gray-700">
              {user?.username || 'User'}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}