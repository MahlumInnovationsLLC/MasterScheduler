import React, { useEffect } from 'react';

/**
 * This component overrides time constraints in sandbox mode
 * to allow free movement of projects in both past and future,
 * and ensures resize handles work properly.
 */
const SandboxTimelineOverride: React.FC<{
  isSandboxMode: boolean;
  dateRange: { start: Date, end: Date };
}> = ({ isSandboxMode, dateRange }) => {
  
  useEffect(() => {
    if (!isSandboxMode) return;
    
    console.log('🔒 MAXIMUM DRAG-DROP OVERRIDE ACTIVE - Projects can now be placed anywhere without restrictions');
    
    // Override the drag and drop time constraints in sandbox mode
    const patchTimeline = () => {
      // Add a global variable to window that can be accessed in drag handlers
      (window as any).sandboxTimelineOverrides = {
        // Flag to indicate sandbox mode is active
        active: true,
        
        // The date range from the parent component
        dateRange: {
          start: dateRange.start,
          end: dateRange.end
        },
        
        // Override function for date validation
        // This always returns true in sandbox mode to bypass date validation
        validateDatePosition: () => true,
        
        // Override for calculating dates from pixel positions
        // This is used for drag & drop operations
        calculateDateFromPixel: (pixelPosition: number, totalWidth: number) => {
          const timeRange = dateRange.end.getTime() - dateRange.start.getTime();
          const msPerPixel = timeRange / totalWidth;
          const dateMs = dateRange.start.getTime() + (pixelPosition * msPerPixel);
          return new Date(dateMs);
        }
      };
      
      // Find all timeline elements and prepare them
      const timelineContainers = document.querySelectorAll('.timeline-container, .bay-row');
      
      timelineContainers.forEach(container => {
        // Mark this container as sandbox-ready
        container.classList.add('sandbox-timeline');
        
        // Find any timeline cells and make sure they accept drops
        const cells = container.querySelectorAll('.time-slot, .day-column, .cell');
        cells.forEach(cell => {
          cell.classList.add('sandbox-cell');
          // Make sure pointer events are enabled
          (cell as HTMLElement).style.pointerEvents = 'auto';
        });
      });
    };
    
    // Run the patch initially
    patchTimeline();
    
    // Set up a MutationObserver to watch for new timeline elements
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.addedNodes.length > 0) {
          // Check for new timeline elements and patch them
          patchTimeline();
        }
      });
    });
    
    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Cleanup function
    return () => {
      // Remove our global overrides
      delete (window as any).sandboxTimelineOverrides;
      
      // Stop observing DOM changes
      observer.disconnect();
      
      // Find and remove the sandbox-specific classes
      document.querySelectorAll('.sandbox-timeline, .sandbox-cell').forEach(el => {
        el.classList.remove('sandbox-timeline', 'sandbox-cell');
      });
      
      console.log('🚫 Sandbox timeline overrides removed');
    };
  }, [isSandboxMode, dateRange]);
  
  // This component doesn't render any visible elements
  return null;
};

export default SandboxTimelineOverride;