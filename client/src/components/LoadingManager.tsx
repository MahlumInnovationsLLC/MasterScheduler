import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import LoadingOverlay from './LoadingOverlay';

interface LoadingContextType {
  startLoading: (id?: number | string | null, message?: string) => void;
  stopLoading: () => void;
  isLoading: boolean;
  loadingId: number | string | null;
  loadingMessage: string;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

interface LoadingProviderProps {
  children: ReactNode;
  defaultDelay?: number;
}

/**
 * Provider component that manages loading states throughout the application
 * Prevents duplicate loading indicators and provides consistent loading UX
 */
export const LoadingProvider: React.FC<LoadingProviderProps> = ({ 
  children, 
  defaultDelay = 300 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingId, setLoadingId] = useState<number | string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('Loading...');

  const startLoading = useCallback((id: number | string | null = null, message = 'Loading...') => {
    setIsLoading(true);
    setLoadingId(id);
    setLoadingMessage(message);
  }, []);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
    setLoadingId(null);
  }, []);

  return (
    <LoadingContext.Provider
      value={{
        startLoading,
        stopLoading,
        isLoading,
        loadingId,
        loadingMessage
      }}
    >
      {children}
      <LoadingOverlay 
        visible={isLoading}
        message={loadingMessage}
        processingId={loadingId}
        delay={defaultDelay}
      />
    </LoadingContext.Provider>
  );
};

/**
 * Hook to access and control loading states from any component
 */
export const useLoading = (): LoadingContextType => {
  const context = useContext(LoadingContext);
  
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  
  return context;
};