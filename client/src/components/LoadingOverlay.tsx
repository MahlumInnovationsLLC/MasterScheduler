import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
  message?: string;
  visible: boolean;
  delay?: number; // Delay in ms before showing the overlay
  fullScreen?: boolean; // Whether to show the overlay full screen or inline
}

/**
 * A loading overlay component that shows a spinner and optional message
 * Can be configured to show after a delay to prevent UI flashing for quick operations
 */
const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
  message = 'Processing, please wait...', 
  visible,
  delay = 0, // No delay by default
  fullScreen = true // Full screen by default
}) => {
  const [showLoader, setShowLoader] = useState(visible && delay === 0);
  
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
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
        <div className="bg-card rounded-lg shadow-lg p-6 max-w-md text-center flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-lg font-medium">{message}</p>
        </div>
      </div>
    );
  }
  
  // Inline overlay
  return (
    <div className="flex items-center justify-center p-4">
      <div className="flex items-center gap-2">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <p className="text-sm font-medium">{message}</p>
      </div>
    </div>
  );
};

export default LoadingOverlay;