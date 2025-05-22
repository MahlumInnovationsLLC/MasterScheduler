import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth, AuthContextType } from '@/hooks/use-auth';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

// Login form schema
const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function GuaranteedAuthPage() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, user, setUser: updateUser } = useAuth() || { isAuthenticated: false, user: null };
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      setLocation('/dashboard');
    }
    
    // CRITICAL: Force enable all elements on this page
    const enableAllInteractions = () => {
      // Remove any view-only mode classes
      document.body.classList.remove('viewer-mode');
      document.body.classList.remove('role-viewer');
      
      // Add auth page class
      document.body.classList.add('guaranteed-auth');
      
      // Find all interactive elements and force enable them
      document.querySelectorAll('button, input, a, [role="button"]').forEach(el => {
        if (el instanceof HTMLElement) {
          el.style.pointerEvents = 'auto';
          el.style.opacity = '1';
          el.style.filter = 'none';
          el.style.cursor = el.tagName === 'BUTTON' || el.tagName === 'A' ? 'pointer' : 'auto';
          el.removeAttribute('disabled');
        }
      });
    };
    
    // Run immediately
    enableAllInteractions();
    
    // Set up interval
    const intervalId = setInterval(enableAllInteractions, 100);
    
    // Emergency style override
    const style = document.createElement('style');
    style.innerHTML = `
      /* Critical style fixes */
      .guaranteed-auth button,
      .guaranteed-auth input,
      .guaranteed-auth a,
      .guaranteed-auth [role="button"] {
        pointer-events: auto !important;
        opacity: 1 !important;
        cursor: pointer !important;
        filter: none !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      clearInterval(intervalId);
      style.remove();
      document.body.classList.remove('guaranteed-auth');
    };
  }, [isAuthenticated, setLocation]);
  
  // Form definition
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });
  
  // Login mutation
  const loginMutation = useMutation({
    mutationFn: (data: LoginFormValues) => apiRequest('/api/login', 'POST', data),
    onSuccess: (data) => {
      if (updateUser) updateUser(data);
      setLocation('/dashboard');
      toast({
        title: 'Login successful',
        description: 'You have been successfully logged in.',
      });
    },
    onError: (error) => {
      console.error('Login error:', error);
      toast({
        title: 'Login failed',
        description: error instanceof Error ? error.message : 'Invalid email or password',
        variant: 'destructive',
      });
    },
  });
  
  // Submit handler
  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      await loginMutation.mutateAsync(data);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Development-only auto-login (if in development environment)
  const isDevelopment = process.env.NODE_ENV === 'development' || import.meta.env.DEV;
  
  const handleDevLogin = async () => {
    try {
      setIsLoading(true);
      console.log("Attempting dev auto-login...");
      
      // Simple direct login for development
      const response = await fetch("/api/dev-login", {
        method: "GET",
        credentials: "include"
      });
      
      if (!response.ok) {
        throw new Error("Dev login failed");
      }
      
      const userData = await response.json();
      console.log("Dev login successful:", userData);
      
      // Set the user data
      if (updateUser) updateUser(userData);
      
      // Redirect to dashboard
      setLocation("/dashboard");
      
      toast({
        title: "Development Login Successful",
        description: `Auto-logged in as ${userData.email} (${userData.role})`,
      });
    } catch (error) {
      console.error("Dev login error:", error);
      toast({
        title: "Development Login Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="guaranteed-auth flex min-h-screen bg-muted">
      <div className="flex flex-col justify-center flex-1 px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="w-full max-w-sm mx-auto lg:w-96">
          <div className="mb-8">
            <div className="flex items-center mb-3">
              <span className="text-primary font-bold text-3xl font-sans">TIERIV<sup className="text-sm">PRO</sup></span>
            </div>
            <h2 className="text-2xl font-semibold text-foreground">Nomad GCS Project Management</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Manage manufacturing projects, billing milestones, and production schedules
            </p>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Login</CardTitle>
              <CardDescription>Enter your email and password to access your account</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your email" {...field} className="guaranteed-element" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} className="guaranteed-element" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full guaranteed-element" 
                    disabled={isLoading}
                    style={{pointerEvents: 'auto', opacity: 1, cursor: 'pointer'}}
                  >
                    {isLoading ? 'Logging in...' : 'Login'}
                  </Button>
                </form>
              </Form>
            </CardContent>
            <CardFooter className="flex flex-col">
              {isDevelopment && (
                <Button 
                  variant="outline" 
                  className="w-full mt-2 guaranteed-element" 
                  onClick={handleDevLogin} 
                  disabled={isLoading}
                  style={{pointerEvents: 'auto', opacity: 1, cursor: 'pointer'}}
                >
                  {isLoading ? 'Logging in...' : 'Dev Auto-Login'}
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
      
      <div className="relative flex-1 hidden lg:block">
        <div className="absolute inset-0 bg-background">
          <div className="h-full p-8 flex flex-col justify-center">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">Manufacturing Project Management</h2>
            <p className="mb-8 text-foreground/80">
              An integrated system to manage your manufacturing projects, track billing milestones, and coordinate production schedules.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                <p>Real-time production status updates</p>
              </div>
              <div className="flex items-center">
                <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                <p>Billing milestone tracking and forecasting</p>
              </div>
              <div className="flex items-center">
                <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                <p>Automated manufacturing bay scheduling</p>
              </div>
              <div className="flex items-center">
                <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                <p>AI-powered insights and recommendations</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}