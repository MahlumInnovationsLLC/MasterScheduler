import React, { useEffect } from 'react';

/**
 * SandboxDragAndDropFix
 * 
 * This component directly patches the drag and drop functionality in the ResizableBaySchedule
 * component to enable free movement of projects in both horizontal (date) and vertical (row) directions.
 */
const SandboxDragAndDropFix: React.FC<{
  isSandboxMode: boolean;
}> = ({ isSandboxMode }) => {
  
  useEffect(() => {
    if (!isSandboxMode) return;
    
    console.log('🛠️ SANDBOX DROP FIX: Applying drag and drop horizontal movement patches');
    
    // Function to apply the fixes for horizontal movement
    const applyHorizontalDragFix = () => {
      // This patch ensures the necessary DOM is available for drag-drop operations
      // We add a data attribute to all potential drop zones
      const updateDropZones = () => {
        // Find all timeline cells
        const cells = document.querySelectorAll('.time-slot, .day-column, .bay-cell');
        
        cells.forEach(cell => {
          // Mark this cell as a valid drop target for sandbox mode
          cell.setAttribute('data-sandbox-drop-target', 'true');
          
          // Make sure it accepts all drops
          (cell as HTMLElement).style.pointerEvents = 'auto';
          
          // Add a class to ensure styling is consistent
          cell.classList.add('sandbox-drop-zone');
        });
      };
      
      // Apply the fixes
      updateDropZones();
      
      // Create a global object in window to store overridden functions
      (window as any).sandboxDragFixes = {
        active: true,
        
        // This flag indicates that date constraints should be bypassed
        bypassDateConstraints: true,
        
        // Original implementation of calculateBarPosition (to be patched)
        originalCalculateBarPosition: null,
        
        // This function will be used to track drag events
        logDragEvent: (event: string, data: any) => {
          console.log(`🛠️ SANDBOX DRAG EVENT [${event}]:`, data);
        }
      };
      
      // Add a style element to ensure drop zones are always visible and accept drops
      const styleElement = document.createElement('style');
      styleElement.id = 'sandbox-drop-fix-styles';
      styleElement.textContent = `
        /* Force all drop zones to accept drops */
        .sandbox-drop-zone {
          position: relative;
          z-index: 10;
        }
        
        /* Ensure dragged items are visible */
        .dragging {
          opacity: 0.8 !important;
          z-index: 1000 !important;
        }
        
        /* Ensure drop targets are highlighted */
        [data-sandbox-drop-target="true"] {
          cursor: pointer !important;
        }
        
        /* Highlight drop targets when dragging */
        body.dragging-active [data-sandbox-drop-target="true"]:hover {
          background-color: rgba(59, 130, 246, 0.2) !important;
          box-shadow: inset 0 0 0 2px #3b82f6 !important;
        }
        
        /* Prevent pointer-events: none from blocking drops */
        .dragging-active * {
          pointer-events: auto !important;
        }
        
        /* Ensure dates can be calculated even on days outside visible range */
        .timeline-date-marker {
          pointer-events: auto !important;
        }
      `;
      document.head.appendChild(styleElement);
      
      // Create a global function that will be called by the drag handlers
      // This overrides the date constraint checks
      (window as any).isSandboxModeActive = () => {
        return true;
      };
      
      // Add direct DOM event listeners to ensure all elements accept drops
      document.addEventListener('dragover', (e) => {
        if (isSandboxMode) {
          // In sandbox mode, allow drops everywhere
          e.preventDefault();
        }
      }, true);
      
      // Monkey-patch the ResizableBaySchedule component's handleDrop function
      // to ensure it allows date movement in sandbox mode
      const monkeyPatchHandleDrop = () => {
        // We need to wait until the timeline is rendered
        const timeline = document.querySelector('.timeline-container');
        if (!timeline) return false;
        
        // Add data attributes to all project bars 
        const projectBars = document.querySelectorAll('.big-project-bar');
        projectBars.forEach(bar => {
          bar.setAttribute('data-sandbox-draggable', 'true');
        });
        
        // Add a global hook that will be checked by the drop handlers
        document.body.setAttribute('data-sandbox-active', 'true');
        
        return true;
      };
      
      // Try to apply the monkey patch, retry if timeline isn't loaded yet
      const applyMonkeyPatch = () => {
        if (!monkeyPatchHandleDrop()) {
          // Timeline not found, retry after a delay
          setTimeout(applyMonkeyPatch, 500);
        }
      };
      
      // Start the patching process
      applyMonkeyPatch();
      
      // Set up a MutationObserver to handle dynamically added elements
      const observer = new MutationObserver(mutations => {
        // Check for new elements that need to be patched
        let needsUpdate = false;
        
        mutations.forEach(mutation => {
          if (mutation.addedNodes.length > 0) {
            // Check if any added nodes are timeline-related
            mutation.addedNodes.forEach(node => {
              if (node instanceof HTMLElement) {
                if (
                  node.classList.contains('time-slot') || 
                  node.classList.contains('day-column') ||
                  node.classList.contains('bay-row') ||
                  node.classList.contains('big-project-bar')
                ) {
                  needsUpdate = true;
                }
              }
            });
          }
        });
        
        if (needsUpdate) {
          // Apply the fixes again for new elements
          updateDropZones();
          monkeyPatchHandleDrop();
        }
      });
      
      // Start observing the entire document
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      // Return cleanup function
      return () => {
        observer.disconnect();
        
        // Remove the style element
        const styleEl = document.getElementById('sandbox-drop-fix-styles');
        if (styleEl) styleEl.remove();
        
        // Remove global objects
        delete (window as any).sandboxDragFixes;
        delete (window as any).isSandboxModeActive;
        
        // Remove data attributes
        document.querySelectorAll('[data-sandbox-drop-target]').forEach(el => {
          el.removeAttribute('data-sandbox-drop-target');
          el.classList.remove('sandbox-drop-zone');
        });
        
        document.querySelectorAll('[data-sandbox-draggable]').forEach(el => {
          el.removeAttribute('data-sandbox-draggable');
        });
        
        document.body.removeAttribute('data-sandbox-active');
        
        console.log('🧹 Sandbox drag and drop fixes removed');
      };
    };
    
    // Apply the drag-drop fixes
    const cleanup = applyHorizontalDragFix();
    
    // Create a script element to directly patch the drag-drop behaviors
    const patchScript = document.createElement('script');
    patchScript.id = 'sandbox-date-movement-fix';
    patchScript.textContent = `
      // Direct patch for drag-drop functionality in sandbox mode
      (function() {
        // Override the date validation in ResizableBaySchedule
        window.bypassDateValidationInSandbox = true;
        
        // Helper function that will be called to check if we're in sandbox mode
        window.isInSandboxMode = function() {
          return document.body.hasAttribute('data-sandbox-active');
        };
        
        // Helper to override the date calculation in the drop handler
        window.calculateDateFromPixelOverride = function(xPosition, containerWidth, startDate, endDate) {
          // Total milliseconds in the date range
          const rangeMs = endDate.getTime() - startDate.getTime();
          
          // Milliseconds per pixel
          const msPerPixel = rangeMs / containerWidth;
          
          // Calculate the date at x position
          const offsetMs = xPosition * msPerPixel;
          return new Date(startDate.getTime() + offsetMs);
        };
        
        console.log('🔧 Direct sandbox drag-drop patches applied for horizontal date movement');
        
        // Create a MutationObserver to watch for drag operations
        const dragObserver = new MutationObserver(mutations => {
          mutations.forEach(mutation => {
            // Look for dragging classes being added
            if (mutation.attributeName === 'class') {
              const target = mutation.target;
              if (target instanceof HTMLElement) {
                if (target.classList.contains('dragging')) {
                  // Force the dragged element to be visible and interactive
                  target.style.opacity = '0.8';
                  target.style.zIndex = '9999';
                  
                  // Make sure all drop targets accept drops
                  document.querySelectorAll('[data-sandbox-drop-target]').forEach(el => {
                    if (el instanceof HTMLElement) {
                      el.style.pointerEvents = 'auto';
                    }
                  });
                }
              }
            }
          });
        });
        
        // Start observing the document body
        dragObserver.observe(document.body, {
          attributes: true,
          attributeFilter: ['class'],
          subtree: true
        });
        
        // Add a global event listener to ensure drops are always allowed in sandbox mode
        document.addEventListener('dragover', function(e) {
          if (window.isInSandboxMode()) {
            e.preventDefault();
            
            // Set the drop effect to 'move'
            if (e.dataTransfer) {
              e.dataTransfer.dropEffect = 'move';
            }
          }
        }, true);
        
        // Add a DOM attribute that can be checked by React components
        document.documentElement.setAttribute('data-sandbox-date-movement-enabled', 'true');
      })();
    `;
    document.head.appendChild(patchScript);
    
    // Return cleanup function
    return () => {
      if (cleanup) cleanup();
      
      // Remove the script element
      const scriptEl = document.getElementById('sandbox-date-movement-fix');
      if (scriptEl) scriptEl.remove();
      
      // Remove the global attribute
      document.documentElement.removeAttribute('data-sandbox-date-movement-enabled');
      
      console.log('🧹 Sandbox date movement fixes removed');
    };
  }, [isSandboxMode]);
  
  // This component doesn't render anything visible
  return null;
};

export default SandboxDragAndDropFix;