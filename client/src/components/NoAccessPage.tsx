import React from 'react';
import { Shield, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

interface NoAccessPageProps {
  title?: string;
  message?: string;
  showBackButton?: boolean;
}

export const NoAccessPage: React.FC<NoAccessPageProps> = ({
  title = "Access Denied",
  message = "You don't have permission to view this page.",
  showBackButton = true
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <div className="flex justify-center mb-6">
            <Shield className="h-16 w-16 text-destructive" />
          </div>
          
          <h1 className="text-2xl font-bold mb-4">{title}</h1>
          <p className="text-muted-foreground mb-6">{message}</p>
          
          {showBackButton && (
            <div className="space-y-2">
              <Link href="/dashboard">
                <Button className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <p className="text-sm text-muted-foreground">
                Contact your administrator if you need access to this feature.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};