import React from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { RotateCcw, Save, FileWarning, AlertTriangle } from "lucide-react";

interface SandboxModeBannerProps {
  isActive: boolean;
  onToggle: () => void;
  onSave: () => Promise<void>;
  onDiscard: () => void;
  hasChanges: boolean;
}

export function SandboxModeBanner({ 
  isActive, 
  onToggle, 
  onSave, 
  onDiscard, 
  hasChanges 
}: SandboxModeBannerProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSave = async () => {
    if (!hasChanges) {
      toast({
        title: "No changes to save",
        description: "Make some changes to the schedule first",
        variant: "default"
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSave();
      toast({
        title: "Changes saved",
        description: "Your schedule changes have been applied to the actual schedule",
        variant: "default"
      });
    } catch (error) {
      console.error('Error saving sandbox changes:', error);
      toast({
        title: "Failed to save changes",
        description: "There was an error applying your changes to the actual schedule",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    if (!hasChanges) {
      onDiscard();
      return;
    }

    if (confirm("Are you sure you want to discard all changes? This cannot be undone.")) {
      onDiscard();
      toast({
        title: "Changes discarded",
        description: "All sandbox changes have been discarded",
        variant: "default"
      });
    }
  };

  return (
    <div className={`w-full p-4 mb-4 rounded-lg border ${isActive ? 'bg-amber-50 border-amber-300 dark:bg-amber-950/30 dark:border-amber-800' : 'bg-gray-50 border-gray-200 dark:bg-gray-800/30 dark:border-gray-700'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {isActive ? (
            <AlertTriangle className="h-6 w-6 text-amber-500" />
          ) : (
            <FileWarning className="h-6 w-6 text-gray-500 dark:text-gray-400" />
          )}
          <div>
            <h3 className={`font-semibold ${isActive ? 'text-amber-700 dark:text-amber-400' : 'text-gray-700 dark:text-gray-300'}`}>
              {isActive ? 'Sandbox Mode Active' : 'Sandbox Mode'}
            </h3>
            <p className={`text-sm ${isActive ? 'text-amber-600 dark:text-amber-300/70' : 'text-gray-500 dark:text-gray-400'}`}>
              {isActive 
                ? 'Changes in this mode won\'t affect the actual database until you save them.'
                : 'Enable to test schedule changes without affecting the actual database.'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {isActive && (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDiscard}
                className="border-amber-300 bg-white text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:border-amber-800 dark:bg-transparent dark:text-amber-400 dark:hover:bg-amber-900/30"
              >
                <RotateCcw className="mr-1 h-3.5 w-3.5" />
                Discard
              </Button>
              
              <Button 
                variant="default" 
                size="sm"
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className="bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700"
              >
                <Save className="mr-1 h-3.5 w-3.5" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </>
          )}
          
          <Button 
            variant={isActive ? "outline" : "default"}
            size="sm" 
            onClick={onToggle}
            className={isActive 
              ? "border-amber-300 bg-white text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:border-amber-800 dark:bg-transparent dark:text-amber-400 dark:hover:bg-amber-900/30" 
              : ""}
          >
            {isActive ? "Exit Sandbox" : "Enter Sandbox Mode"}
          </Button>
        </div>
      </div>
    </div>
  );
}