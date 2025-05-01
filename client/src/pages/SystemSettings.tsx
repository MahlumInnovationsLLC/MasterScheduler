import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const SystemSettings = () => {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<{
    success: boolean;
    message: string;
    totalDeleted?: number;
  } | null>(null);

  const handleDeleteAllProjects = async () => {
    try {
      setIsDeleting(true);
      setDeleteResult(null);
      
      const response = await fetch('/api/reset-all-projects', {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      setDeleteResult({
        success: result.success,
        message: result.message,
        totalDeleted: result.totalDeleted
      });
      
      toast({
        title: result.success ? "Projects Deleted" : "Deletion Failed",
        description: result.message,
        variant: result.success ? "default" : "destructive"
      });
    } catch (error) {
      setDeleteResult({
        success: false,
        message: "Error deleting projects: " + (error as Error).message
      });
      
      toast({
        title: "Deletion Failed",
        description: "Error deleting projects: " + (error as Error).message,
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="container mx-auto py-6 max-w-6xl px-4 sm:px-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">System Settings</h1>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
            <CardDescription>
              Configure data settings and perform maintenance operations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="border border-destructive/20 rounded-lg p-4 bg-destructive/5">
                <h3 className="font-semibold text-lg mb-2 flex items-center">
                  <AlertTriangle className="mr-2 h-5 w-5 text-destructive" />
                  Danger Zone
                </h3>
                <p className="text-sm mb-4 text-gray-300">
                  These actions are irreversible and will permanently delete data from the system.
                </p>
                
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">Delete All Projects</p>
                    <p className="text-sm text-gray-400">
                      This will remove all projects and their associated data (tasks, billing milestones, manufacturing schedules).
                    </p>
                  </div>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="flex items-center">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete All Projects
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete all projects 
                          and all related data from the database.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteAllProjects}
                          disabled={isDeleting}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {isDeleting ? "Deleting..." : "Yes, Delete Everything"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          </CardContent>
          
          {deleteResult && (
            <CardFooter>
              <Alert className={`w-full ${deleteResult.success ? 'bg-success/20 border-success' : 'bg-destructive/20 border-destructive'}`}>
                {deleteResult.success ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                )}
                <AlertTitle>{deleteResult.success ? 'Success' : 'Error'}</AlertTitle>
                <AlertDescription>
                  {deleteResult.message}
                  {deleteResult.totalDeleted !== undefined && (
                    <p className="mt-1">Total projects deleted: {deleteResult.totalDeleted}</p>
                  )}
                </AlertDescription>
              </Alert>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
};

export default SystemSettings;