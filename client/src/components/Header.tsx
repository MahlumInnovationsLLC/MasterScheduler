import React from 'react';
import { Link } from 'wouter';
import { 
  Bell, 
  Settings, 
  Search,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Header = () => {
  return (
    <header className="bg-darkCard border-b border-gray-800 px-6 py-3 fixed top-0 left-0 right-0 z-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/">
            <a className="text-primary font-bold text-2xl font-sans">
              <span>TIER</span><span className="text-accent">IV</span><span className="text-xs align-top ml-1">PRO</span>
            </a>
          </Link>
          <div className="h-6 border-l border-gray-700 mx-2"></div>
          <div className="flex items-center px-3 py-1.5 bg-darkInput rounded-md">
            <Search className="text-gray-400 mr-2 h-4 w-4" />
            <input 
              type="text" 
              placeholder="Search projects, tasks, milestones..." 
              className="bg-transparent border-none outline-none text-sm w-56 placeholder-gray-500"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5 text-gray-400" />
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
                  <p className="text-gray-400 text-xs mt-1">
                    Gamma Network Upgrade is behind schedule by 15%
                  </p>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex flex-col items-start py-2 cursor-pointer">
                  <div className="flex items-center gap-2 w-full">
                    <div className="h-2 w-2 rounded-full bg-warning"></div>
                    <span className="font-medium">Billing milestone due</span>
                  </div>
                  <p className="text-gray-400 text-xs mt-1">
                    Invoice #INV-1024 for Beta Platform is due in 3 days
                  </p>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex flex-col items-start py-2 cursor-pointer">
                  <div className="flex items-center gap-2 w-full">
                    <div className="h-2 w-2 rounded-full bg-success"></div>
                    <span className="font-medium">Payment received</span>
                  </div>
                  <p className="text-gray-400 text-xs mt-1">
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
          
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5 text-gray-400" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-2 ml-3 cursor-pointer">
                <div className="w-9 h-9 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center">
                  <span className="text-white font-medium">JD</span>
                </div>
                <div className="text-sm">
                  <div className="font-medium text-white">John Doe</div>
                  <div className="text-xs text-gray-400">Project Manager</div>
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer">
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;
