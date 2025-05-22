import { useEffect } from 'react';

/**
 * This component overrides time constraints in sandbox mode
 * to allow free movement of projects in both past and future,
 * and ensures resize handles work properly.
 */
const SandboxTimelineOverride: React.FC<{
  isSandboxMode: boolean;
}> = ({ isSandboxMode }) => {

  useEffect(() => {
    if (!isSandboxMode) return;
    
    // Apply sandbox overrides when the component mounts
    const applySandboxOverrides = () => {
      console.log('🔧 Applying sandbox timeline overrides - allowing complete timeline freedom');
      
      // Add a special class to body for CSS overrides
      document.body.classList.add('sandbox-timeline-override');
      
      // Setup CSS overrides for sandbox mode
      const styleElement = document.createElement('style');
      styleElement.id = 'sandbox-timeline-overrides';
      styleElement.textContent = `
        /* Allow projects to be moved anywhere in the timeline without constraints */
        body.sandbox-timeline-override .big-project-bar {
          cursor: move !important;
        }
        
        /* Make resize handles more visible */
        body.sandbox-timeline-override .resize-handle-left,
        body.sandbox-timeline-override .resize-handle-right {
          width: 12px !important;
          height: 100% !important;
          background-color: rgba(0, 100, 255, 0.4) !important;
          border-radius: 4px !important;
          opacity: 0.7 !important;
        }
        
        /* Brighten handles on hover */
        body.sandbox-timeline-override .resize-handle-left:hover,
        body.sandbox-timeline-override .resize-handle-right:hover {
          background-color: rgba(0, 100, 255, 0.6) !important;
          opacity: 1 !important;
        }
        
        /* Highlight handle that's being dragged */
        body.sandbox-timeline-override .resizing-active .resize-handle-left,
        body.sandbox-timeline-override .resizing-active .resize-handle-right {
          background-color: rgba(0, 100, 255, 0.8) !important;
        }
        
        /* Add visual feedback for the project being resized */
        body.sandbox-timeline-override .resizing-active {
          outline: 2px solid #0066ff !important;
          z-index: 1000 !important;
        }
        
        /* Fix for dragging operations */
        body.sandbox-timeline-override.dragging-active {
          cursor: grabbing !important;
        }
      `;
      
      // Add the style element to the head
      document.head.appendChild(styleElement);
      
      // Add a special attribute to the body for JavaScript detection
      document.body.setAttribute('data-sandbox-timeline', 'true');
    };
    
    // Apply overrides on mount
    applySandboxOverrides();
    
    // Patch resize handlers through DOM manipulation
    const patchResizeHandlers = () => {
      // Find all resize handles
      const leftHandles = document.querySelectorAll('.resize-handle-left');
      const rightHandles = document.querySelectorAll('.resize-handle-right');
      
      // Add special class to all handles for visibility
      leftHandles.forEach(handle => {
        handle.classList.add('sandbox-enhanced-handle');
      });
      
      rightHandles.forEach(handle => {
        handle.classList.add('sandbox-enhanced-handle');
      });
      
      console.log(`🔧 Enhanced ${leftHandles.length + rightHandles.length} resize handles for sandbox mode`);
    };
    
    // Setup a mutation observer to detect when new project elements are added
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.addedNodes.length > 0) {
          // Check if any project bars were added
          mutation.addedNodes.forEach(node => {
            if (node instanceof HTMLElement) {
              if (node.classList.contains('big-project-bar') || 
                  node.querySelector('.big-project-bar')) {
                // Patch the new elements
                patchResizeHandlers();
              }
            }
          });
        }
      });
    });
    
    // Start observing after a short delay to ensure the component is mounted
    setTimeout(() => {
      patchResizeHandlers();
      
      // Observe the schedule container for changes
      const scheduleContainer = document.querySelector('.timeline-container');
      if (scheduleContainer) {
        observer.observe(scheduleContainer, { 
          childList: true,
          subtree: true
        });
        console.log('🔧 Sandbox observer active - watching for new project elements');
      }
    }, 1000);
    
    // Cleanup function
    return () => {
      // Remove the style element
      const styleElement = document.getElementById('sandbox-timeline-overrides');
      if (styleElement) {
        styleElement.remove();
      }
      
      // Remove the special class from body
      document.body.classList.remove('sandbox-timeline-override');
      
      // Remove the special attribute
      document.body.removeAttribute('data-sandbox-timeline');
      
      // Disconnect the observer
      observer.disconnect();
      
      console.log('🧹 Sandbox timeline overrides removed');
    };
  }, [isSandboxMode]);
  
  // This component doesn't render anything
  return null;
};

export default SandboxTimelineOverride;