import React, { useState, useEffect, useRef, useCallback } from 'react';

// Auto-scroll functionality for bay scheduling drag operations
export const useAutoScroll = () => {
  const autoScrollRef = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Auto-scroll functionality
  const startAutoScroll = useCallback((direction: 'up' | 'down') => {
    if (autoScrollRef.current) return; // Already scrolling
    
    const SCROLL_SPEED = 8; // pixels per frame
    const scroll = () => {
      const scrollAmount = direction === 'up' ? -SCROLL_SPEED : SCROLL_SPEED;
      window.scrollBy(0, scrollAmount);
      autoScrollRef.current = requestAnimationFrame(scroll);
    };
    
    autoScrollRef.current = requestAnimationFrame(scroll);
  }, []);
  
  const stopAutoScroll = useCallback(() => {
    if (autoScrollRef.current) {
      cancelAnimationFrame(autoScrollRef.current);
      autoScrollRef.current = null;
    }
  }, []);
  
  // Handle global mouse movement during drag for auto-scrolling
  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const SCROLL_ZONE = 100; // pixels from edge to trigger scroll
    const viewportHeight = window.innerHeight;
    
    if (e.clientY < SCROLL_ZONE) {
      // Near top edge - scroll up
      startAutoScroll('up');
    } else if (e.clientY > viewportHeight - SCROLL_ZONE) {
      // Near bottom edge - scroll down
      startAutoScroll('down');
    } else {
      // In safe zone - stop scrolling
      stopAutoScroll();
    }
  }, [isDragging, startAutoScroll, stopAutoScroll]);
  
  // Global drag end handler
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    stopAutoScroll();
  }, [stopAutoScroll]);
  
  // Set up global event listeners for drag operations
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('dragend', handleDragEnd);
      document.addEventListener('drop', handleDragEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('dragend', handleDragEnd);
        document.removeEventListener('drop', handleDragEnd);
        stopAutoScroll();
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd, stopAutoScroll]);
  
  return {
    isDragging,
    setIsDragging,
    startAutoScroll,
    stopAutoScroll,
    handleDragEnd
  };
};

// Enhanced drag start handler with auto-scroll
export const createAutoScrollDragHandler = (
  originalHandler: (e: React.DragEvent, ...args: any[]) => void,
  setIsDragging: (dragging: boolean) => void
) => {
  return (e: React.DragEvent, ...args: any[]) => {
    setIsDragging(true);
    console.log('🎯 AUTO-SCROLL ENABLED: Starting drag operation');
    originalHandler(e, ...args);
  };
};

// Enhanced drag end handler with auto-scroll cleanup
export const createAutoScrollDragEndHandler = (
  originalHandler: ((e: React.DragEvent, ...args: any[]) => void) | undefined,
  handleDragEnd: () => void
) => {
  return (e: React.DragEvent, ...args: any[]) => {
    handleDragEnd();
    console.log('🎯 AUTO-SCROLL DISABLED: Drag operation ended');
    if (originalHandler) originalHandler(e, ...args);
  };
};