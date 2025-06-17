import React, { createContext, useContext, useState, useEffect } from 'react';

interface LoadingContextType {
  isLoading: boolean;
  stage: 'authentication' | 'priorities' | 'data' | 'complete';
  setStage: (stage: 'authentication' | 'priorities' | 'data' | 'complete') => void;
  setLoading: (loading: boolean) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

interface LoadingProviderProps {
  children: React.ReactNode;
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [stage, setStageState] = useState<'authentication' | 'priorities' | 'data' | 'complete'>('authentication');
  const [hasCompletedInitialLoad, setHasCompletedInitialLoad] = useState(false);

  const setStage = (newStage: 'authentication' | 'priorities' | 'data' | 'complete') => {
    // Don't show loading screen if we've already completed initial load
    if (hasCompletedInitialLoad && newStage !== 'complete') {
      return;
    }
    
    setStageState(newStage);
    
    // Auto-complete loading when reaching complete stage
    if (newStage === 'complete') {
      setTimeout(() => {
        setIsLoading(false);
        setHasCompletedInitialLoad(true);
      }, 800); // Small delay to show completion
    }
  };

  const setLoading = (loading: boolean) => {
    // Don't show loading screen if we've already completed initial load
    if (hasCompletedInitialLoad && loading) {
      return;
    }
    
    setIsLoading(loading);
    if (!loading) {
      setStageState('complete');
      setHasCompletedInitialLoad(true);
    }
  };

  // Auto-start authentication stage only on first load
  useEffect(() => {
    if (isLoading && stage === 'authentication' && !hasCompletedInitialLoad) {
      console.log('Loading context initialized - starting authentication phase');
    }
  }, [isLoading, stage, hasCompletedInitialLoad]);

  return (
    <LoadingContext.Provider value={{ isLoading, stage, setStage, setLoading }}>
      {children}
    </LoadingContext.Provider>
  );
};