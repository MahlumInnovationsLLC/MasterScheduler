import React, { useState } from 'react';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Loader2, Check, Settings, BellRing, Calendar, Layout, Monitor, PanelLeft, Eye } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const UserPreferences = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { 
    preferences, 
    isLoading: preferencesLoading,
    updatePreferences,
    isUpdating,
    error
  } = useUserPreferences();
  
  const [formValues, setFormValues] = useState({
    theme: preferences?.theme || 'dark',
    displayDensity: preferences?.displayDensity || 'comfortable',
    defaultView: preferences?.defaultView || 'dashboard',
    showCompletedProjects: preferences?.showCompletedProjects || true,
    dateFormat: preferences?.dateFormat || 'MM/DD/YYYY',
    emailNotifications: preferences?.emailNotifications || true,
  });

  const handleChange = (field: string, value: any) => {
    setFormValues(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updatePreferences(formValues);
  };

  const isLoading = authLoading || preferencesLoading;

  if (isLoading) {
    return (
      <div className="container mx-auto flex items-center justify-center h-[80vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading user preferences...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto py-6 max-w-6xl px-4 sm:px-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>
            You need to be logged in to access your preferences. Please log in to continue.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-6xl px-4 sm:px-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">User Preferences</h1>
      </div>

      <div className="grid gap-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : 'Failed to load user preferences'}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="appearance" className="w-full">
            <TabsList className="grid sm:grid-cols-4 grid-cols-2 mb-6">
              <TabsTrigger value="appearance" className="flex items-center">
                <Monitor className="h-4 w-4 mr-2" />
                <span>Appearance</span>
              </TabsTrigger>
              <TabsTrigger value="display" className="flex items-center">
                <Layout className="h-4 w-4 mr-2" />
                <span>Display</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center">
                <BellRing className="h-4 w-4 mr-2" />
                <span>Notifications</span>
              </TabsTrigger>
              <TabsTrigger value="account" className="flex items-center">
                <Settings className="h-4 w-4 mr-2" />
                <span>Account</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="appearance">
              <Card>
                <CardHeader>
                  <CardTitle>Appearance Settings</CardTitle>
                  <CardDescription>
                    Customize the look and feel of the application.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="theme">Theme</Label>
                      <Select 
                        value={formValues.theme} 
                        onValueChange={(value) => handleChange('theme', value)}
                      >
                        <SelectTrigger id="theme" className="w-full">
                          <SelectValue placeholder="Select theme" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dark">Dark</SelectItem>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="system">System</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-gray-500">
                        Choose your preferred color theme for the application.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="display">
              <Card>
                <CardHeader>
                  <CardTitle>Display Settings</CardTitle>
                  <CardDescription>
                    Customize how information is displayed throughout the application.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="displayDensity">Display Density</Label>
                      <Select 
                        value={formValues.displayDensity} 
                        onValueChange={(value: 'compact' | 'comfortable') => handleChange('displayDensity', value)}
                      >
                        <SelectTrigger id="displayDensity" className="w-full">
                          <SelectValue placeholder="Select display density" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="compact">Compact</SelectItem>
                          <SelectItem value="comfortable">Comfortable</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-gray-500">
                        Choose how densely information is displayed in tables and lists.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="defaultView">Default View</Label>
                      <Select 
                        value={formValues.defaultView} 
                        onValueChange={(value) => handleChange('defaultView', value)}
                      >
                        <SelectTrigger id="defaultView" className="w-full">
                          <SelectValue placeholder="Select default view" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dashboard">Dashboard</SelectItem>
                          <SelectItem value="projects">Projects</SelectItem>
                          <SelectItem value="billing">Billing</SelectItem>
                          <SelectItem value="manufacturing">Manufacturing</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-gray-500">
                        Choose which view to show by default when you log in.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dateFormat">Date Format</Label>
                      <Select 
                        value={formValues.dateFormat} 
                        onValueChange={(value) => handleChange('dateFormat', value)}
                      >
                        <SelectTrigger id="dateFormat" className="w-full">
                          <SelectValue placeholder="Select date format" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                          <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                          <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-gray-500">
                        Choose how dates are displayed throughout the application.
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="showCompletedProjects">Show Completed Projects</Label>
                        <p className="text-sm text-gray-500">
                          Include completed projects in project lists and views.
                        </p>
                      </div>
                      <Switch 
                        id="showCompletedProjects" 
                        checked={formValues.showCompletedProjects}
                        onCheckedChange={(checked) => handleChange('showCompletedProjects', checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Settings</CardTitle>
                  <CardDescription>
                    Configure how and when you receive notifications.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="emailNotifications">Email Notifications</Label>
                      <p className="text-sm text-gray-500">
                        Receive email notifications for important updates and events.
                      </p>
                    </div>
                    <Switch 
                      id="emailNotifications" 
                      checked={formValues.emailNotifications}
                      onCheckedChange={(checked) => handleChange('emailNotifications', checked)}
                    />
                  </div>

                  <div className="pt-4">
                    <p className="text-sm text-amber-500">
                      More notification options will be available in a future update.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="account">
              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>
                    Your account details and preferences.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input 
                        id="username" 
                        value={user?.username || ''} 
                        disabled 
                        className="bg-gray-800 cursor-not-allowed"
                      />
                      <p className="text-sm text-gray-500">
                        Your username cannot be changed.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input 
                        id="email" 
                        value={user?.email || ''} 
                        disabled 
                        className="bg-gray-800 cursor-not-allowed"
                      />
                      <p className="text-sm text-gray-500">
                        Your email address is managed through your account settings.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="mt-6 flex justify-end">
            <Button 
              type="submit" 
              size="lg" 
              disabled={isUpdating}
              className="gap-2"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Save Preferences</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserPreferences;