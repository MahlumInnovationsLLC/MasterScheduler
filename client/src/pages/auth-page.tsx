import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function AuthPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user, isLoading, loginMutation, registerMutation } = useAuth();

  const [loginData, setLoginData] = useState({
    email: "",
    password: ""
  });

  const [registerData, setRegisterData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: ""
  });

  // If user is already logged in, redirect to home page
  if (user) {
    setLocation("/");
    return null;
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await loginMutation.mutateAsync(loginData);
      navigate("/");
    } catch (error: any) {
      // Error handling is done in the mutation
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await registerMutation.mutateAsync(registerData);
      toast({
        title: "Registration successful",
        description: registerData.email.includes("@example.com") 
          ? "Your account has been created and you are now logged in." 
          : "Your account has been created. An admin will review and approve your account.",
      });
      navigate("/");
    } catch (error: any) {
      // Error handling is done in the mutation
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-muted">
      <div className="flex flex-col justify-center flex-1 px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="w-full max-w-sm mx-auto lg:w-96">
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Tier IV Project Management</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Manage manufacturing projects, billing milestones, and production schedules
            </p>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Login</CardTitle>
                  <CardDescription>Enter your email and password to access your account</CardDescription>
                </CardHeader>
                <form onSubmit={handleLoginSubmit}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="name@company.com" 
                        value={loginData.email}
                        onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                      </div>
                      <Input 
                        id="password" 
                        type="password"
                        value={loginData.password}
                        onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                        required
                      />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Logging in...
                        </>
                      ) : (
                        "Login"
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Register</CardTitle>
                  <CardDescription>Create a new account to access Tier IV Management</CardDescription>
                </CardHeader>
                <form onSubmit={handleRegisterSubmit}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-email">Email</Label>
                      <Input 
                        id="register-email" 
                        type="email" 
                        placeholder="name@company.com" 
                        value={registerData.email}
                        onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input 
                          id="firstName" 
                          value={registerData.firstName}
                          onChange={(e) => setRegisterData({...registerData, firstName: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input 
                          id="lastName" 
                          value={registerData.lastName}
                          onChange={(e) => setRegisterData({...registerData, lastName: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password">Password</Label>
                      <Input 
                        id="register-password" 
                        type="password"
                        value={registerData.password}
                        onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                        required
                      />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <div className="relative flex-1 hidden w-0 lg:block bg-zinc-900">
        <div className="absolute inset-0 flex flex-col justify-center px-10 bg-gradient-to-br from-zinc-900/90 to-zinc-900/40">
          <div className="max-w-md">
            <h2 className="text-3xl font-bold text-white">Manufacturing Project Management</h2>
            <p className="mt-4 text-lg text-zinc-300">
              An integrated system to manage your manufacturing projects, track billing milestones, and coordinate production schedules.
            </p>
            <div className="mt-6 space-y-2">
              <div className="flex items-center">
                <div className="w-2 h-2 mr-2 bg-green-400 rounded-full"></div>
                <p className="text-sm text-zinc-300">Real-time production status updates</p>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 mr-2 bg-green-400 rounded-full"></div>
                <p className="text-sm text-zinc-300">Billing milestone tracking and forecasting</p>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 mr-2 bg-green-400 rounded-full"></div>
                <p className="text-sm text-zinc-300">Automated manufacturing bay scheduling</p>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 mr-2 bg-green-400 rounded-full"></div>
                <p className="text-sm text-zinc-300">AI-powered insights and recommendations</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}