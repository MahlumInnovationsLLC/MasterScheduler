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

  const setStage = (newStage: 'authentication' | 'priorities' | 'data' | 'complete') => {
    setStageState(newStage);
    
    // Auto-complete loading when reaching complete stage
    if (newStage === 'complete') {
      setTimeout(() => {
        setIsLoading(false);
      }, 800); // Small delay to show completion
    }
  };

  const setLoading = (loading: boolean) => {
    setIsLoading(loading);
    if (!loading) {
      setStageState('complete');
    }
  };

  // Auto-start authentication stage
  useEffect(() => {
    if (isLoading && stage === 'authentication') {
      // This will be triggered by actual auth checks in the app
      console.log('Loading context initialized - starting authentication phase');
    }
  }, [isLoading, stage]);

  return (
    <LoadingContext.Provider value={{ isLoading, stage, setStage, setLoading }}>
      {children}
    </LoadingContext.Provider>
  );
};