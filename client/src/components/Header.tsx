import React from 'react';
import { Link } from 'wouter';
import { 
  Bell, 
  Settings, 
  Search,
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
import { useAuth } from '@/hooks/useAuth';
import { User as UserType } from '@shared/schema';

const Header = () => {
  const { user, isLoading, isAuthenticated } = useAuth();
  
  const typedUser = user as UserType | undefined;
  
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
    <header className="bg-darkCard border-b border-border px-6 py-3 fixed top-0 left-0 right-0 z-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-primary font-bold text-2xl font-sans">
            <span>TIER</span><span className="text-accent">IV</span><span className="text-xs align-top ml-1">PRO</span>
          </Link>
          <div className="h-6 border-l border-border mx-2"></div>
          <div className="flex items-center px-3 py-1.5 bg-darkInput rounded-md">
            <Search className="text-muted-foreground mr-2 h-4 w-4" />
            <input 
              type="text" 
              placeholder="Search projects, tasks, milestones..." 
              className="bg-transparent border-none outline-none text-sm w-56 text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Always show theme toggle regardless of auth status */}
          <ThemeToggle />

          {isAuthenticated ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    <span className="absolute -top-1 -right-1 bg-danger text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">3</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="max-h-80 overflow-y-auto">
                    <DropdownMenuItem className="flex flex-col items-start py-2 cursor-pointer">
                      <div className="flex items-center gap-2 w-full">
                        <div className="h-2 w-2 rounded-full bg-danger"></div>
                        <span className="font-medium">Project PT-1025 at risk</span>
                      </div>
                      <p className="text-muted-foreground text-xs mt-1">
                        Gamma Network Upgrade is behind schedule by 15%
                      </p>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="flex flex-col items-start py-2 cursor-pointer">
                      <div className="flex items-center gap-2 w-full">
                        <div className="h-2 w-2 rounded-full bg-warning"></div>
                        <span className="font-medium">Billing milestone due</span>
                      </div>
                      <p className="text-muted-foreground text-xs mt-1">
                        Invoice #INV-1024 for Beta Platform is due in 3 days
                      </p>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="flex flex-col items-start py-2 cursor-pointer">
                      <div className="flex items-center gap-2 w-full">
                        <div className="h-2 w-2 rounded-full bg-success"></div>
                        <span className="font-medium">Payment received</span>
                      </div>
                      <p className="text-muted-foreground text-xs mt-1">
                        Payment of $200,000 received for Alpha System
                      </p>
                    </DropdownMenuItem>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="justify-center text-primary font-medium cursor-pointer">
                    View all notifications
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button variant="ghost" size="icon" asChild>
                <Link href="/settings/system">
                  <Settings className="h-5 w-5 text-muted-foreground" />
                </Link>
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center gap-2 ml-3 cursor-pointer">
                    {typedUser?.profileImageUrl ? (
                      <img 
                        src={typedUser.profileImageUrl} 
                        alt={typedUser.username || "User"} 
                        className="w-9 h-9 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center">
                        <span className="text-white font-medium">
                          {getInitials(typedUser?.username)}
                        </span>
                      </div>
                    )}
                    <div className="text-sm">
                      <div className="font-medium text-foreground">{typedUser?.username || 'User'}</div>
                      <div className="text-xs text-muted-foreground">{typedUser?.role || 'User'}</div>
                    </div>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <Link href="/settings/user">
                    <DropdownMenuItem className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      <span>User Preferences</span>
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/settings/system">
                    <DropdownMenuItem className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>System Settings</span>
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="cursor-pointer"
                    onClick={() => window.location.href = '/api/logout'}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button 
              variant="default"
              onClick={() => window.location.href = '/api/login'}
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
