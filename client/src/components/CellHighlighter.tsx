import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Check, X, AlertTriangle } from 'lucide-react';

// Define highlight color options
export type HighlightColor = 'none' | 'yellow' | 'orange' | 'red';

interface CellHighlighterProps {
  rowId: number;
  columnId: string;
  children: React.ReactNode;
  className?: string;
}

// Store cell highlight state across the app
// This could be replaced with a more robust state management solution in production
const cellHighlightState = new Map<string, HighlightColor>();

export const CellHighlighter: React.FC<CellHighlighterProps> = ({ 
  rowId, 
  columnId, 
  children, 
  className
}) => {
  const cellId = `${rowId}-${columnId}`;
  const [highlightColor, setHighlightColor] = useState<HighlightColor>(
    cellHighlightState.get(cellId) || 'none'
  );
  const [showMenu, setShowMenu] = useState(false);

  // Update the global state when this component's state changes
  useEffect(() => {
    if (highlightColor === 'none') {
      cellHighlightState.delete(cellId);
    } else {
      cellHighlightState.set(cellId, highlightColor);
    }
  }, [highlightColor, cellId]);

  const handleHighlightChange = (color: HighlightColor) => {
    setHighlightColor(color);
    setShowMenu(false);
  };

  const getBackgroundColor = () => {
    switch (highlightColor) {
      case 'yellow':
        return 'bg-yellow-300/30 dark:bg-yellow-500/20 border-l-4 border-l-yellow-500';
      case 'orange':
        return 'bg-orange-300/30 dark:bg-orange-500/20 border-l-4 border-l-orange-500';
      case 'red':
        return 'bg-red-300/30 dark:bg-red-500/20 border-l-4 border-l-red-500';
      default:
        return '';
    }
  };

  // Display indicator based on highlight color
  const getIndicator = () => {
    switch (highlightColor) {
      case 'yellow':
        return <div className="absolute bottom-1 left-1 text-yellow-500"><AlertTriangle size={14} /></div>;
      case 'orange':
        return <div className="absolute bottom-1 left-1 text-orange-500"><AlertTriangle size={14} /></div>;
      case 'red':
        return <div className="absolute bottom-1 left-1 text-red-500"><X size={14} /></div>;
      default:
        return null;
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
      className={cn(
        "relative group h-full w-full transition-colors", 
        getBackgroundColor(),
        className
      )}
      onMouseLeave={hideColorMenu}
    >
      {/* The cell content */}
      {children}
      
      {/* Display icon based on highlight state */}
      {getIndicator()}
      
      {/* The color picker button */}
      <button
        className="absolute bottom-1 right-1 w-5 h-5 rounded border-2 border-gray-300 dark:border-gray-500 opacity-0 group-hover:opacity-100 bg-white dark:bg-gray-800 shadow-md z-10 flex items-center justify-center hover:scale-110 transition-transform"
        onClick={showColorMenu}
        aria-label="Set highlight color"
      >
        <div 
          className={cn(
            "w-3 h-3 rounded-sm",
            highlightColor === 'yellow' ? 'bg-yellow-400' : 
            highlightColor === 'orange' ? 'bg-orange-400' : 
            highlightColor === 'red' ? 'bg-red-400' : 
            'bg-gray-200 dark:bg-gray-600 border border-gray-400 dark:border-gray-500'
          )}
        />
      </button>
      
      {/* The color menu */}
      {showMenu && (
        <div className="absolute bottom-6 right-1 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded shadow-md p-1.5 z-20 flex gap-2">
          <button 
            className="w-7 h-7 rounded-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center"
            onClick={() => handleHighlightChange('none')}
            aria-label="No highlight"
          >
            <div className="w-5 h-5 border-2 border-gray-400 dark:border-gray-400 rounded-sm" />
          </button>
          <button 
            className="w-7 h-7 rounded-sm bg-yellow-400 hover:bg-yellow-500 ring-2 ring-gray-300 dark:ring-gray-600"
            onClick={() => handleHighlightChange('yellow')}
            aria-label="Yellow highlight"
          />
          <button 
            className="w-7 h-7 rounded-sm bg-orange-400 hover:bg-orange-500 ring-2 ring-gray-300 dark:ring-gray-600"
            onClick={() => handleHighlightChange('orange')}
            aria-label="Orange highlight"
          />
          <button 
            className="w-7 h-7 rounded-sm bg-red-400 hover:bg-red-500 ring-2 ring-gray-300 dark:ring-gray-600"
            onClick={() => handleHighlightChange('red')}
            aria-label="Red highlight"
          />
        </div>
      )}
    </div>
  );
};