import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Palette } from 'lucide-react';

type HighlightColor = 'none' | 'yellow' | 'orange' | 'red' | 'green' | 'blue' | 'purple';

// Global state for project bar highlights
const projectBarHighlightState = new Map<string, HighlightColor>();

interface ProjectBarHighlighterProps {
  projectId: number;
  className?: string;
  children: React.ReactNode;
}

export const ProjectBarHighlighter: React.FC<ProjectBarHighlighterProps> = ({ 
  projectId, 
  className,
  children 
}) => {
  const highlightId = `project-${projectId}`;
  const [highlightColor, setHighlightColor] = useState<HighlightColor>(
    projectBarHighlightState.get(highlightId) || 'none'
  );
  const [showMenu, setShowMenu] = useState(false);

  // Update the global state when this component's state changes
  useEffect(() => {
    if (highlightColor === 'none') {
      projectBarHighlightState.delete(highlightId);
    } else {
      projectBarHighlightState.set(highlightId, highlightColor);
    }
  }, [highlightColor, highlightId]);

  const handleHighlightChange = (color: HighlightColor) => {
    setHighlightColor(color);
    setShowMenu(false);
  };

  const getGlowStyles = () => {
    switch (highlightColor) {
      case 'yellow':
        return {
          boxShadow: '0 0 0 2px #eab308, 0 0 20px rgba(234, 179, 8, 0.5)',
          border: '2px solid #eab308'
        };
      case 'orange':
        return {
          boxShadow: '0 0 0 2px #ea580c, 0 0 20px rgba(234, 88, 12, 0.5)',
          border: '2px solid #ea580c'
        };
      case 'red':
        return {
          boxShadow: '0 0 0 2px #dc2626, 0 0 20px rgba(220, 38, 38, 0.5)',
          border: '2px solid #dc2626'
        };
      case 'green':
        return {
          boxShadow: '0 0 0 2px #16a34a, 0 0 20px rgba(22, 163, 74, 0.5)',
          border: '2px solid #16a34a'
        };
      case 'blue':
        return {
          boxShadow: '0 0 0 2px #2563eb, 0 0 20px rgba(37, 99, 235, 0.5)',
          border: '2px solid #2563eb'
        };
      case 'purple':
        return {
          boxShadow: '0 0 0 2px #9333ea, 0 0 20px rgba(147, 51, 234, 0.5)',
          border: '2px solid #9333ea'
        };
      default:
        return {};
    }
  };

  const getButtonColor = () => {
    switch (highlightColor) {
      case 'yellow': return 'bg-yellow-500';
      case 'orange': return 'bg-orange-500';
      case 'red': return 'bg-red-500';
      case 'green': return 'bg-green-500';
      case 'blue': return 'bg-blue-500';
      case 'purple': return 'bg-purple-500';
      default: return 'bg-gray-200 dark:bg-gray-600 border border-gray-400 dark:border-gray-500';
    }
  };

  // Functions to handle menu visibility
  const showColorMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(true);
  };

  const hideColorMenu = () => {
    setShowMenu(false);
  };

  return (
    <div 
      className={cn("relative group", className)}
      style={getGlowStyles()}
      onMouseLeave={hideColorMenu}
    >
      {/* The project bar content */}
      {children}
      
      {/* The color picker button - positioned to the right of project number */}
      <button
        className="absolute top-1 right-1 w-5 h-5 rounded border-2 border-white/80 opacity-0 group-hover:opacity-100 bg-white/90 dark:bg-gray-800/90 shadow-lg z-30 flex items-center justify-center hover:scale-110 transition-all duration-200"
        onClick={showColorMenu}
        aria-label="Set highlight color"
      >
        <div 
          className={cn(
            "w-3 h-3 rounded-sm",
            getButtonColor()
          )}
        />
      </button>
      
      {/* The color menu */}
      {showMenu && (
        <div className="absolute top-7 right-1 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-md shadow-xl p-2 z-40 flex gap-1.5">
          {/* No highlight */}
          <button 
            className="w-6 h-6 rounded-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center border border-gray-300 dark:border-gray-500"
            onClick={() => handleHighlightChange('none')}
            aria-label="No highlight"
            title="Remove highlight"
          >
            <div className="w-4 h-4 border-2 border-gray-400 dark:border-gray-400 rounded-sm" />
          </button>
          
          {/* Yellow */}
          <button 
            className="w-6 h-6 rounded-sm bg-yellow-500 hover:bg-yellow-600 ring-2 ring-gray-300 dark:ring-gray-600"
            onClick={() => handleHighlightChange('yellow')}
            aria-label="Yellow highlight"
            title="Yellow highlight"
          />
          
          {/* Orange */}
          <button 
            className="w-6 h-6 rounded-sm bg-orange-500 hover:bg-orange-600 ring-2 ring-gray-300 dark:ring-gray-600"
            onClick={() => handleHighlightChange('orange')}
            aria-label="Orange highlight"
            title="Orange highlight"
          />
          
          {/* Red */}
          <button 
            className="w-6 h-6 rounded-sm bg-red-500 hover:bg-red-600 ring-2 ring-gray-300 dark:ring-gray-600"
            onClick={() => handleHighlightChange('red')}
            aria-label="Red highlight"
            title="Red highlight"
          />
          
          {/* Green */}
          <button 
            className="w-6 h-6 rounded-sm bg-green-500 hover:bg-green-600 ring-2 ring-gray-300 dark:ring-gray-600"
            onClick={() => handleHighlightChange('green')}
            aria-label="Green highlight"
            title="Green highlight"
          />
          
          {/* Blue */}
          <button 
            className="w-6 h-6 rounded-sm bg-blue-500 hover:bg-blue-600 ring-2 ring-gray-300 dark:ring-gray-600"
            onClick={() => handleHighlightChange('blue')}
            aria-label="Blue highlight"
            title="Blue highlight"
          />
          
          {/* Purple */}
          <button 
            className="w-6 h-6 rounded-sm bg-purple-500 hover:bg-purple-600 ring-2 ring-gray-300 dark:ring-gray-600"
            onClick={() => handleHighlightChange('purple')}
            aria-label="Purple highlight"
            title="Purple highlight"
          />
        </div>
      )}
    </div>
  );
};

// Export function to get current highlight state for a project
export const getProjectHighlight = (projectId: number): HighlightColor => {
  return projectBarHighlightState.get(`project-${projectId}`) || 'none';
};

// Export function to clear all highlights
export const clearAllProjectHighlights = () => {
  projectBarHighlightState.clear();
};