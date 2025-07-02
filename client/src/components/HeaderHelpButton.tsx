import React, { useState } from 'react';
import { HelpCircle, User, Shield, ShieldCheck, Eye, Settings, Bell, Calendar, Search, Sun, Moon, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export const HeaderHelpButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-10 w-10 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <HelpCircle className="h-5 w-5 text-muted-foreground" />
                <span className="sr-only">Header Help</span>
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Header Help & Navigation Guide</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-blue-600" />
            Header & Navigation Guide
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[70vh] pr-4">
          <div className="space-y-6">
            
            {/* Search Functionality */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-green-600" />
                  Global Search
                </CardTitle>
                <CardDescription>
                  Quickly find projects, tasks, and milestones across the entire application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p>The search bar allows you to:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Search by project number (e.g., "804287")</li>
                  <li>Search by project name or description</li>
                  <li>Find specific tasks or milestones</li>
                  <li>Search across all modules simultaneously</li>
                </ul>
                <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md">
                  <p className="text-sm"><strong>Tip:</strong> Use partial matches - typing "804" will find all projects starting with 804</p>
                </div>
              </CardContent>
            </Card>

            {/* Theme Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sun className="h-4 w-4 text-yellow-600" />
                  Theme Settings
                </CardTitle>
                <CardDescription>
                  Customize your visual experience with light, dark, or system themes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex items-center gap-2 p-2 border rounded">
                    <Sun className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium">Light Mode</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 border rounded">
                    <Moon className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Dark Mode</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 border rounded">
                    <Monitor className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium">System</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  System mode automatically switches between light and dark based on your device settings.
                </p>
              </CardContent>
            </Card>

            {/* User Access Levels */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-purple-600" />
                  User Access Levels
                </CardTitle>
                <CardDescription>
                  Understanding your permissions and access level in the system
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <ShieldCheck className="h-5 w-5 text-red-600" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Admin</span>
                        <Badge variant="destructive">Full Access</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">Complete system access, user management, system settings</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Settings className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Editor</span>
                        <Badge variant="default">Edit Access</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">Create, edit, and manage projects, tasks, and schedules</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Eye className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Viewer</span>
                        <Badge variant="outline">Read Only</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">View-only access to projects, reports, and dashboards</p>
                    </div>
                  </div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-md">
                  <p className="text-sm"><strong>Your current role is displayed</strong> in the user profile section in the top-right corner</p>
                </div>
              </CardContent>
            </Card>

            {/* Navigation Icons */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-orange-600" />
                  Header Icons Guide
                </CardTitle>
                <CardDescription>
                  Understanding all the icons and functions in the header bar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-2 border rounded">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <div>
                      <span className="font-medium text-sm">My Tasks</span>
                      <p className="text-xs text-muted-foreground">Personal task management</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-2 border rounded">
                    <Bell className="h-4 w-4 text-orange-600" />
                    <div>
                      <span className="font-medium text-sm">Notifications</span>
                      <p className="text-xs text-muted-foreground">System alerts and updates</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-2 border rounded">
                    <Settings className="h-4 w-4 text-gray-600" />
                    <div>
                      <span className="font-medium text-sm">Settings</span>
                      <p className="text-xs text-muted-foreground">System configuration (Admin only)</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-2 border rounded">
                    <User className="h-4 w-4 text-purple-600" />
                    <div>
                      <span className="font-medium text-sm">User Profile</span>
                      <p className="text-xs text-muted-foreground">Account settings and logout</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common tasks you can perform from the header
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <span className="text-sm">Click the TIER IV PRO logo to return to Dashboard</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    <span className="text-sm">Use global search to quickly navigate to specific projects</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                    <span className="text-sm">Check notifications for important project updates</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                    <span className="text-sm">Access your personal tasks for daily workflow management</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default HeaderHelpButton;