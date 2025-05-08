import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
  message?: string;
  visible: boolean;
}

/**
 * A full-screen loading overlay component that shows a spinner and optional message
 */
const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
  message = 'Processing, please wait...', 
  visible 
}) => {
  if (!visible) return null;
  
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
      <div className="bg-card rounded-lg shadow-lg p-6 max-w-md text-center flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-lg font-medium">{message}</p>
      </div>
    </div>
  );
};

export default LoadingOverlay;