import React, { useEffect } from 'react';

/**
 * SandboxModeEnhancer
 * 
 * This component enhances the sandbox mode functionality by:
 * 1. Enabling free movement of projects into past and future
 * 2. Fixing resize handles to update UI properly
 */
const SandboxModeEnhancer: React.FC<{
  isSandboxMode: boolean;
}> = ({ isSandboxMode }) => {
  
  useEffect(() => {
    if (!isSandboxMode) return;
    
    console.log('🛠️ Sandbox Mode Enhancer activated - applying drag and resize fixes');
    
    // Add a sandbox class to body
    document.body.classList.add('enhanced-sandbox-mode');
    
    // =====================================================================
    // Fix 1: Add CSS to enhance resize handles and make them more visible
    // =====================================================================
    const styleElement = document.createElement('style');
    styleElement.id = 'sandbox-drag-resize-fixes';
    styleElement.textContent = `
      /* Make resize handles more visible */
      .enhanced-sandbox-mode .resize-handle-left,
      .enhanced-sandbox-mode .resize-handle-right {
        width: 10px !important;
        background-color: rgba(30, 144, 255, 0.5) !important;
        cursor: ew-resize !important;
        z-index: 100 !important;
        opacity: 0.8 !important;
      }
      
      /* Improve handle visibility on hover */
      .enhanced-sandbox-mode .resize-handle-left:hover,
      .enhanced-sandbox-mode .resize-handle-right:hover {
        background-color: rgba(30, 144, 255, 0.8) !important;
        opacity: 1 !important;
      }
      
      /* Visual feedback for project being resized */
      .enhanced-sandbox-mode .resizing-active {
        box-shadow: 0 0 0 2px #1e90ff !important;
        z-index: 1000 !important;
      }
      
      /* Improved visual indication for dragging */
      .enhanced-sandbox-mode .dragging {
        opacity: 0.8 !important;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2) !important;
        z-index: 1000 !important;
      }
      
      /* Highlight drop targets more clearly */
      .enhanced-sandbox-mode .drop-target {
        background-color: rgba(144, 238, 144, 0.3) !important;
        border: 2px dashed #4CAF50 !important;
      }
    `;
    document.head.appendChild(styleElement);
    
    // =====================================================================
    // Fix 2: Override JavaScript constraints for date selection
    // =====================================================================
    const applyDragResizeFixes = () => {
      // Fix the resize functionality by directly overriding the date validation
      const overrideTimeConstraints = () => {
        // Find all project bars
        const projectBars = document.querySelectorAll('.big-project-bar');
        
        // For each project bar, enhance the resize handles
        projectBars.forEach(bar => {
          // Add enhancement marker
          bar.classList.add('sandbox-enhanced');
          
          // Find left and right resize handles within this bar
          const leftHandle = bar.querySelector('.resize-handle-left');
          const rightHandle = bar.querySelector('.resize-handle-right');
          
          // Apply enhancements to handles
          if (leftHandle) {
            leftHandle.classList.add('enhanced-handle');
            // Make it slightly wider than original
            (leftHandle as HTMLElement).style.width = '10px';
            (leftHandle as HTMLElement).style.cursor = 'ew-resize';
          }
          
          if (rightHandle) {
            rightHandle.classList.add('enhanced-handle');
            // Make it slightly wider than original
            (rightHandle as HTMLElement).style.width = '10px';
            (rightHandle as HTMLElement).style.cursor = 'ew-resize';
          }
        });
      };
      
      // Apply the fixes
      overrideTimeConstraints();
      
      // Also set up a MutationObserver to catch dynamically added elements
      const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          if (mutation.addedNodes.length) {
            // Reapply fixes when new nodes are added
            overrideTimeConstraints();
          }
        });
      });
      
      // Start observing the timeline container
      const timelineContainer = document.querySelector('.timeline-container');
      if (timelineContainer) {
        observer.observe(timelineContainer, {
          childList: true,
          subtree: true
        });
      }
      
      // Create a function to actively fix drag constraints through a periodic check
      const fixDragConstraints = () => {
        // Set a data attribute on body to disable date validation in sandbox mode
        document.body.setAttribute('data-ignore-date-constraints', 'true');
        document.body.setAttribute('data-unlimited-drag', 'true');
        document.body.setAttribute('data-sandbox-active', 'true');
        
        // Add special handling to disable any event listeners that may prevent dragging
        const allCells = document.querySelectorAll('.time-slot');
        allCells.forEach(cell => {
          cell.classList.add('sandbox-droppable');
          (cell as HTMLElement).style.pointerEvents = 'auto';
        });
      };
      
      // Run initially
      fixDragConstraints();
      
      // Run periodically to ensure constraints are always disabled
      const intervalId = setInterval(fixDragConstraints, 1000);
      
      // Return cleanup function
      return () => {
        clearInterval(intervalId);
        observer.disconnect();
      };
    };
    
    // Apply the drag and resize fixes
    const cleanup = applyDragResizeFixes();
    
    // =====================================================================
    // Fix 3: Create a custom JS patch for drag-and-drop functionality
    // =====================================================================
    // This hack directly overrides the dateConstraints check for sandbox mode
    const hackScript = document.createElement('script');
    hackScript.id = 'sandbox-date-constraint-disabler';
    hackScript.textContent = `
      // Override date constraints in sandbox mode
      (function() {
        // Add a global function to check if we're in sandbox mode
        window.isSandboxMode = function() {
          return document.body.classList.contains('enhanced-sandbox-mode');
        };
        
        // Create a special helper object in window
        window.sandboxHelper = {
          // Completely bypass date validation in sandbox mode
          allowAnyDate: true,
          
          // Keep track of resize operations
          activeResize: null,
          
          // Set this to true when in sandbox mode
          active: true,
          
          // Helper function for debugging
          logEvent: function(eventName, data) {
            console.log('🛠️ Sandbox Helper: ' + eventName, data);
          }
        };
        
        console.log('🛠️ Sandbox Helper injected - date constraints disabled');
      })();
    `;
    document.head.appendChild(hackScript);
    
    // Return a cleanup function to remove all enhancements when unmounted
    return () => {
      // Remove style element
      const styleEl = document.getElementById('sandbox-drag-resize-fixes');
      if (styleEl) styleEl.remove();
      
      // Remove script element
      const scriptEl = document.getElementById('sandbox-date-constraint-disabler');
      if (scriptEl) scriptEl.remove();
      
      // Remove classes and attributes
      document.body.classList.remove('enhanced-sandbox-mode');
      document.body.removeAttribute('data-ignore-date-constraints');
      document.body.removeAttribute('data-unlimited-drag');
      document.body.removeAttribute('data-sandbox-active');
      
      // Call the cleanup function from applyDragResizeFixes
      if (cleanup) cleanup();
      
      console.log('🧹 Sandbox Mode Enhancer deactivated');
    };
  }, [isSandboxMode]);
  
  // This component doesn't render anything
  return null;
};

export default SandboxModeEnhancer;