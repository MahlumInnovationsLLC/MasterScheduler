import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

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
        return 'bg-yellow-50';
      case 'orange':
        return 'bg-orange-50';
      case 'red':
        return 'bg-red-50';
      default:
        return '';
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
      
      {/* The color picker button */}
      <button
        className="absolute bottom-1 left-1 w-4 h-4 rounded border border-gray-300 opacity-0 group-hover:opacity-100 bg-white shadow-sm z-10 flex items-center justify-center"
        onClick={showColorMenu}
        aria-label="Set highlight color"
      >
        <div 
          className={cn(
            "w-2 h-2 rounded-sm",
            highlightColor === 'yellow' ? 'bg-yellow-400' : 
            highlightColor === 'orange' ? 'bg-orange-400' : 
            highlightColor === 'red' ? 'bg-red-400' : 
            'bg-gray-200'
          )}
        />
      </button>
      
      {/* The color menu */}
      {showMenu && (
        <div className="absolute bottom-6 left-1 bg-white border border-gray-200 rounded shadow-md p-1 z-20 flex gap-1">
          <button 
            className="w-6 h-6 rounded-sm bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
            onClick={() => handleHighlightChange('none')}
            aria-label="No highlight"
          >
            <div className="w-4 h-4 bg-white border border-gray-300 rounded-sm" />
          </button>
          <button 
            className="w-6 h-6 rounded-sm bg-yellow-400 hover:bg-yellow-500"
            onClick={() => handleHighlightChange('yellow')}
            aria-label="Yellow highlight"
          />
          <button 
            className="w-6 h-6 rounded-sm bg-orange-400 hover:bg-orange-500"
            onClick={() => handleHighlightChange('orange')}
            aria-label="Orange highlight"
          />
          <button 
            className="w-6 h-6 rounded-sm bg-red-400 hover:bg-red-500"
            onClick={() => handleHighlightChange('red')}
            aria-label="Red highlight"
          />
        </div>
      )}
    </div>
  );
};