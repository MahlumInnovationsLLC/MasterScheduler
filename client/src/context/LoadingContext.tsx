import React, { createContext, useContext, useState, useEffect } from 'react';

interface LoadingContextType {
  isLoading: boolean;
  stage: 'authentication' | 'priorities' | 'data' | 'complete';
  setStage: (stage: 'authentication' | 'priorities' | 'data' | 'complete') => void;
  setLoading: (loading: boolean) => void;
  startLoadingScreen: () => void;
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
  const [isLoading, setIsLoading] = useState(false);
  const [stage, setStageState] = useState<'authentication' | 'priorities' | 'data' | 'complete'>('authentication');
  const [hasShownLoadingScreen, setHasShownLoadingScreen] = useState(false);

  const setStage = (newStage: 'authentication' | 'priorities' | 'data' | 'complete') => {
    setStageState(newStage);
  };

  const startLoadingScreen = () => {
    if (hasShownLoadingScreen) {
      return; // Don't show again if already shown
    }
    
    setHasShownLoadingScreen(true);
    setIsLoading(true);
    setStageState('authentication');
    
    // Progress through stages
    setTimeout(() => setStageState('priorities'), 1500);
    setTimeout(() => setStageState('data'), 3000);
    setTimeout(() => {
      setStageState('complete');
      setIsLoading(false);
    }, 5000);
  };

  const setLoading = (loading: boolean) => {
    // This method is kept for compatibility but not used
    if (!hasShownLoadingScreen && loading) {
      startLoadingScreen();
    }
  };

  return (
    <LoadingContext.Provider value={{ isLoading, stage, setStage, setLoading, startLoadingScreen }}>
      {children}
    </LoadingContext.Provider>
  );
};