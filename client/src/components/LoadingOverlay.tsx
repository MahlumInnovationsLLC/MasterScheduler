import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingOverlayProps {
  message?: string;
  visible: boolean;
  delay?: number; // Delay in ms before showing the overlay
  fullScreen?: boolean; // Whether to show the overlay full screen or inline
  className?: string; // Additional class names
  processingId?: number | string | null; // Optional ID of the item being processed
}

/**
 * A loading overlay component that shows a spinner and optional message
 * Can be configured to show after a delay to prevent UI flashing for quick operations
 */
const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
  message = 'Processing, please wait...', 
  visible,
  delay = 300, // Default delay of 300ms to prevent flashing for quick operations
  fullScreen = true, // Full screen by default
  className = '',
  processingId = null
}) => {
  const [showLoader, setShowLoader] = useState(visible && delay === 0);
  
  // Handle the case where processingId is provided for context-specific loading
  const displayMessage = processingId 
    ? `Processing ${typeof processingId === 'number' ? `#${processingId}` : processingId}...` 
    : message;
  
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    
    if (visible && delay > 0) {
      timer = setTimeout(() => {
        setShowLoader(true);
      }, delay);
    } else {
      setShowLoader(visible);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [visible, delay]);
  
  if (!showLoader) return null;
  
  // Full screen overlay
  if (fullScreen) {
    return (
      <div className={cn(
        "fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center transition-opacity duration-200",
        className
      )}>
        <div className="bg-card rounded-lg shadow-lg p-6 max-w-md text-center flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-lg font-medium">{displayMessage}</p>
          {processingId && <p className="text-sm text-muted-foreground">ID: {processingId}</p>}
        </div>
      </div>
    );
  }
  
  // Inline overlay
  return (
    <div className={cn("flex items-center justify-center p-4", className)}>
      <div className="flex items-center gap-2">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <p className="text-sm font-medium">{displayMessage}</p>
      </div>
    </div>
  );
};

export default LoadingOverlay;