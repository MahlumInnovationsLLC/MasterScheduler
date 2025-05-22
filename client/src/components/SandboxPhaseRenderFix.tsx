import React, { useEffect } from 'react';

/**
 * SandboxPhaseRenderFix
 * 
 * Simple component that fixes the phase rendering issue when resizing projects in sandbox mode.
 * Ensures that phase elements (FAB, PAINT, etc.) properly resize and reposition when the project bar is resized.
 */
const SandboxPhaseRenderFix: React.FC<{
  isSandboxMode: boolean;
}> = ({ isSandboxMode }) => {
  
  useEffect(() => {
    if (!isSandboxMode) return;
    
    console.log('🔧 Sandbox Phase Render Fix: Applying phase rendering fix for resize operations');
    
    // This function updates the phase elements when a project bar is resized
    const updatePhasesForBar = (bar: HTMLElement) => {
      // Get the current width of the bar
      const barWidth = parseFloat(bar.style.width || '0');
      if (!barWidth) return;
      
      // Find all phase elements within this bar
      const phases = bar.querySelectorAll('.phase');
      if (!phases.length) return;
      
      // Get the percentages for each phase from data attributes or calculate based on current setup
      const percentages: number[] = [];
      let totalPercent = 0;
      
      phases.forEach(phase => {
        let percent = parseFloat(phase.getAttribute('data-percent') || '0');
        if (!percent) {
          // If data-percent not available, use the width percentage of the phase relative to the bar
          if (phase instanceof HTMLElement) {
            percent = (parseFloat(phase.style.width) / barWidth) * 100;
          }
        }
        percentages.push(percent);
        totalPercent += percent;
      });
      
      // Normalize percentages if they don't add up to 100%
      if (totalPercent !== 100 && totalPercent > 0) {
        const normalizer = 100 / totalPercent;
        percentages.forEach((p, i) => {
          percentages[i] = p * normalizer;
        });
      }
      
      // Apply the updated widths and positions
      let currentPosition = 0;
      phases.forEach((phase, index) => {
        if (phase instanceof HTMLElement) {
          const phaseWidth = (percentages[index] / 100) * barWidth;
          phase.style.width = `${phaseWidth}px`;
          phase.style.left = `${currentPosition}px`;
          currentPosition += phaseWidth;
        }
      });
    };
    
    // Handler for resize operations
    const handleResize = (e: MouseEvent) => {
      // Find any project bars currently being resized
      const resizingBars = document.querySelectorAll('.big-project-bar.resizing');
      resizingBars.forEach(bar => {
        if (bar instanceof HTMLElement) {
          updatePhasesForBar(bar);
        }
      });
    };
    
    // Handler for when resize ends
    const handleResizeEnd = (e: MouseEvent) => {
      // Slight delay to ensure the bar width has been updated
      setTimeout(() => {
        const bars = document.querySelectorAll('.big-project-bar');
        bars.forEach(bar => {
          if (bar instanceof HTMLElement) {
            updatePhasesForBar(bar);
          }
        });
      }, 50);
    };
    
    // Listen for mouse move (during resize) and mouse up (end of resize)
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', handleResizeEnd);
    
    // Inject a script that will directly hook into the resize handlers
    const script = document.createElement('script');
    script.id = 'sandbox-phase-render-fix';
    script.textContent = `
      // Override for phase rendering during resize
      (function() {
        // Keep track of original functions
        const originalHandlers = {
          handleResizeMove: null,
          handleResizeEnd: null
        };
        
        // Function to patch resize handlers
        function patchResizeHandlers() {
          // Find all resize handles
          const handles = document.querySelectorAll('.resize-handle-left, .resize-handle-right');
          
          handles.forEach(handle => {
            // Add a data attribute to mark it as enhanced
            handle.setAttribute('data-enhanced-sandbox', 'true');
            
            // Add enhanced styling
            if (handle instanceof HTMLElement) {
              handle.style.width = '10px';
              handle.style.cursor = 'ew-resize';
              handle.style.backgroundColor = 'rgba(30, 144, 255, 0.6)';
              handle.style.zIndex = '100';
            }
            
            // Add a mousedown handler to set a flag on the parent bar
            handle.addEventListener('mousedown', function(e) {
              // Find the parent project bar
              let parent = handle.parentElement;
              while (parent && !parent.classList.contains('big-project-bar')) {
                parent = parent.parentElement;
              }
              
              if (parent) {
                // Mark this bar as being resized
                parent.classList.add('resizing');
                
                // Also mark the body to help with global handlers
                document.body.classList.add('resizing-active');
                
                // Store the original width
                parent.setAttribute('data-original-width', parent.style.width);
              }
            });
          });
          
          // Add a global mouseup handler to clean up after resize
          document.addEventListener('mouseup', function(e) {
            // Find any bars being resized
            const resizingBars = document.querySelectorAll('.big-project-bar.resizing');
            
            resizingBars.forEach(bar => {
              // Remove the resizing class
              bar.classList.remove('resizing');
              
              // If the width changed, update phases
              if (bar instanceof HTMLElement) {
                const originalWidth = parseFloat(bar.getAttribute('data-original-width') || '0');
                const currentWidth = parseFloat(bar.style.width || '0');
                
                if (originalWidth !== currentWidth) {
                  // Trigger a custom event for phase updates
                  const event = new CustomEvent('sandbox-resize-complete', { 
                    detail: { target: bar, width: currentWidth }
                  });
                  document.dispatchEvent(event);
                }
              }
            });
            
            // Remove the global flag
            document.body.classList.remove('resizing-active');
          });
        }
        
        // Run the patch
        patchResizeHandlers();
        
        // Also set up a periodic checker for dynamically added elements
        setInterval(patchResizeHandlers, 2000);
        
        console.log('✅ Sandbox phase render fix applied for resize operations');
      })();
    `;
    document.head.appendChild(script);
    
    // Listen for the custom event fired by our injected script
    const handleCustomResize = (e: Event) => {
      if (e instanceof CustomEvent && e.detail && e.detail.target) {
        updatePhasesForBar(e.detail.target);
      }
    };
    
    document.addEventListener('sandbox-resize-complete', handleCustomResize as EventListener);
    
    // Return cleanup function
    return () => {
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', handleResizeEnd);
      document.removeEventListener('sandbox-resize-complete', handleCustomResize as EventListener);
      
      // Remove our script
      const scriptEl = document.getElementById('sandbox-phase-render-fix');
      if (scriptEl) scriptEl.remove();
      
      console.log('🧹 Sandbox phase render fix removed');
    };
  }, [isSandboxMode]);
  
  // This component doesn't render anything
  return null;
};

export default SandboxPhaseRenderFix;