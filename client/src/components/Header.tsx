import React from 'react';
import { Link } from 'wouter';
import { 
  Settings, 
  User,
  LogOut
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/use-auth';
import { User as UserType } from '@shared/schema';
import { NotificationBell } from '@/components/ui/notification/NotificationBell';
import { MyTasks } from '@/components/MyTasks';
import { HeaderHelpButton } from './HeaderHelpButton';
import GlobalSearch from './GlobalSearch';
import { ShipmentBanner } from './ShipmentBanner';

const Header = () => {
  const { user, isLoading } = useAuth();
  
  const typedUser = user as UserType | undefined;
  const isAuthenticated = !!user;
  
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  
  return (
    <header className="bg-white dark:bg-gray-900 border-b border-border px-6 py-3 fixed top-0 left-0 right-0 z-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <Link href="/" className="text-primary font-bold text-2xl font-sans">
            <span>TIER</span><span className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text text-transparent bg-[length:200%_200%] animate-[shimmer_2s_ease-in-out_infinite]">IV</span><span className="text-xs align-top ml-1 bg-gradient-to-r from-gray-300 via-gray-100 to-gray-400 bg-clip-text text-transparent bg-[length:200%_200%] animate-[shimmer_2s_ease-in-out_infinite]">PRO</span>
          </Link>
          <div className="h-6 border-l border-border mx-2"></div>
          <GlobalSearch />
          <div className="flex-1 mx-4">
            <ShipmentBanner />
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Always show help and theme toggle regardless of auth status */}
          <HeaderHelpButton />
          <ThemeToggle />

          {isAuthenticated ? (
            <>
              <MyTasks />
              <NotificationBell />
              
              {typedUser?.role === 'admin' && (
                <Button variant="ghost" size="icon" asChild>
                  <Link href="/system-settings">
                    <Settings className="h-5 w-5 text-muted-foreground" />
                  </Link>
                </Button>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center gap-2 ml-3 cursor-pointer viewer-interactive">
                    {typedUser?.profileImageUrl ? (
                      <img 
                        src={typedUser.profileImageUrl} 
                        alt={typedUser.username || "User"} 
                        className="w-9 h-9 rounded-full object-cover viewer-interactive"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center viewer-interactive">
                        <span className="text-white font-medium viewer-interactive">
                          {getInitials(typedUser?.username)}
                        </span>
                      </div>
                    )}
                    <div className="text-sm viewer-interactive">
                      <div className="font-medium text-foreground viewer-interactive">{typedUser?.username || 'User'}</div>
                      <div className="text-xs text-muted-foreground viewer-interactive">{typedUser?.role || 'User'}</div>
                    </div>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="viewer-interactive">
                  <DropdownMenuLabel className="viewer-interactive">My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator className="viewer-interactive" />
                  <Link href="/settings/user" className="viewer-interactive">
                    <DropdownMenuItem className="cursor-pointer viewer-interactive">
                      <User className="mr-2 h-4 w-4 viewer-interactive" />
                      <span className="viewer-interactive">User Preferences</span>
                    </DropdownMenuItem>
                  </Link>
                  {typedUser?.role === 'admin' && (
                    <Link href="/system-settings" className="viewer-interactive">
                      <DropdownMenuItem className="cursor-pointer viewer-interactive">
                        <Settings className="mr-2 h-4 w-4 viewer-interactive" />
                        <span className="viewer-interactive">System Settings</span>
                      </DropdownMenuItem>
                    </Link>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="cursor-pointer viewer-interactive"
                    onClick={() => {
                      fetch('/api/logout', { 
                        method: 'POST', 
                        credentials: 'include' 
                      }).then(() => {
                        window.location.href = '/auth';
                      });
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4 viewer-interactive" />
                    <span className="viewer-interactive">Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button 
              variant="default"
              onClick={() => window.location.href = '/auth'}
            >
              Log In
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
