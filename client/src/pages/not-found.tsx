import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { AlertOctagon, Home, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  const goBack = () => {
    // Go back in history, or to home if there's no history
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation("/");
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md fade-in">
        <Card className="border-none shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-red-500/20 to-red-400/10 border-b pb-8">
            <div className="flex flex-col items-center text-center">
              <div className="rounded-full bg-red-100 p-3 mb-3">
                <AlertOctagon className="h-10 w-10 text-red-500" />
              </div>
              <h1 className="text-3xl font-bold text-foreground slide-in-up">404</h1>
              <p className="text-xl font-medium mt-2 text-muted-foreground enter-from-bottom">
                Page Not Found
              </p>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground mb-4">
              We couldn't find the page you're looking for. It might have been moved or deleted.
            </p>
            
            <div className="space-y-2 mt-6">
              <ul className="text-sm space-y-1.5 text-muted-foreground">
                <li>• Check the URL for typos</li>
                <li>• Go back to the previous page</li>
                <li>• Navigate to the Dashboard</li>
              </ul>
            </div>
          </CardContent>
          <CardFooter className="flex gap-3 justify-center pb-6">
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
              onClick={goBack}
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Button>
            <Button 
              className="flex items-center gap-2"
              onClick={() => setLocation("/")}
            >
              <Home className="h-4 w-4" />
              Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
