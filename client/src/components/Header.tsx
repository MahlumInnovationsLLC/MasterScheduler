import React, { useState } from 'react';
import { Link } from 'wouter';
import { 
  Bell, 
  Settings, 
  Search,
  User,
  LogOut,
  AlertCircle,
  FileText,
  HelpCircle
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from '@/hooks/useAuth';

const Header = () => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  
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
          {isAuthenticated ? (
            <>
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
              
              <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Settings className="h-5 w-5 text-gray-400" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[525px]">
                  <DialogHeader>
                    <DialogTitle>Settings</DialogTitle>
                    <DialogDescription>
                      Configure your application preferences and settings
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Tabs defaultValue="account" className="mt-4">
                    <TabsList className="grid grid-cols-4">
                      <TabsTrigger value="account">Account</TabsTrigger>
                      <TabsTrigger value="appearance">Appearance</TabsTrigger>
                      <TabsTrigger value="notifications">Notifications</TabsTrigger>
                      <TabsTrigger value="system">System</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="account" className="space-y-4 py-4">
                      <div className="space-y-2">
                        <h3 className="text-lg font-medium">Account Information</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="name">Name</Label>
                            <div className="py-2">{user?.username || 'Not available'}</div>
                          </div>
                          <div>
                            <Label htmlFor="email">Email</Label>
                            <div className="py-2">{user?.email || 'Not available'}</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="text-lg font-medium">Two-Factor Authentication</h3>
                        <div className="flex items-center space-x-2">
                          <Switch id="two-factor" />
                          <Label htmlFor="two-factor">Enable two-factor authentication</Label>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="appearance" className="space-y-4 py-4">
                      <div className="space-y-2">
                        <h3 className="text-lg font-medium">Theme</h3>
                        <div className="flex items-center space-x-2">
                          <Switch id="dark-mode" defaultChecked />
                          <Label htmlFor="dark-mode">Dark mode</Label>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="text-lg font-medium">Dashboard Layout</h3>
                        <div className="flex items-center space-x-2">
                          <Switch id="compact-view" />
                          <Label htmlFor="compact-view">Compact view</Label>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="notifications" className="space-y-4 py-4">
                      <div className="space-y-2">
                        <h3 className="text-lg font-medium">Notification Preferences</h3>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Switch id="email-notifications" defaultChecked />
                            <Label htmlFor="email-notifications">Email notifications</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch id="push-notifications" defaultChecked />
                            <Label htmlFor="push-notifications">In-app notifications</Label>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="system" className="space-y-4 py-4">
                      <div className="space-y-2">
                        <h3 className="text-lg font-medium">System Settings</h3>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Switch id="auto-refresh" defaultChecked />
                            <Label htmlFor="auto-refresh">Auto refresh data</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch id="ai-features" defaultChecked />
                            <Label htmlFor="ai-features">AI-powered insights</Label>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setSettingsOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => setSettingsOpen(false)}>
                      Save Changes
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center gap-2 ml-3 cursor-pointer">
                    {user?.profileImageUrl ? (
                      <img 
                        src={user.profileImageUrl} 
                        alt={user.username || "User"} 
                        className="w-9 h-9 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center">
                        <span className="text-white font-medium">
                          {getInitials(user?.username)}
                        </span>
                      </div>
                    )}
                    <div className="text-sm">
                      <div className="font-medium text-white">{user?.username || 'User'}</div>
                      <div className="text-xs text-gray-400">{user?.role || 'User'}</div>
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
                  <DropdownMenuItem 
                    className="cursor-pointer" 
                    onClick={() => setSettingsOpen(true)}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
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
