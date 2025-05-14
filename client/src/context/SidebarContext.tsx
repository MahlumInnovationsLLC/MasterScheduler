import React, { createContext, useState, useEffect } from 'react';

// Define the context type
type SidebarContextType = {
  isCollapsed: boolean;
  toggleSidebar: () => void;
};

// Create the sidebar context with default values
export const SidebarContext = createContext<SidebarContextType>({
  isCollapsed: false,
  toggleSidebar: () => {},
});

// Create the SidebarProvider component
export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load collapsed state from localStorage or default to false
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });

  // Save collapsed state to localStorage whenever it changes
  useEffect(() => {
    console.log("Saving sidebar state to localStorage:", isCollapsed);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  // Toggle sidebar function
  const toggleSidebar = () => {
    console.log("Toggle sidebar called, current state:", isCollapsed);
    setIsCollapsed(prev => !prev);
    console.log("New state should be:", !isCollapsed);
  };

  // Provide the context values to all children
  return (
    <SidebarContext.Provider value={{ isCollapsed, toggleSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
};