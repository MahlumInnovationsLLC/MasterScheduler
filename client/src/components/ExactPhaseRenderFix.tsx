import React, { useEffect } from 'react';

/**
 * ExactPhaseRenderFix
 * 
 * A direct, targeted fix for the phase rendering issue in sandbox mode.
 * This component adds the necessary DOM manipulation to ensure that
 * phases (FAB, PAINT, PROD, etc.) properly adjust when the project bar is resized.
 */
const ExactPhaseRenderFix: React.FC<{
  isSandboxMode: boolean;
}> = ({ isSandboxMode }) => {
  
  useEffect(() => {
    if (!isSandboxMode) return;
    
    console.log('🔧 CRITICAL FIX: Applying exact phase render fix for resize operations');
    
    // Function to directly fix the phases within a project bar
    const fixPhasesForBar = (bar: HTMLElement) => {
      // Get the current width of the bar from its style
      let barWidth = parseFloat(bar.style.width || '0');
      if (!barWidth) {
        barWidth = bar.getBoundingClientRect().width;
      }
      
      // Find all phase elements within this bar
      const phases = bar.querySelectorAll('.phase');
      if (!phases.length) return;
      
      // Extract the percentages from each phase element
      const percentages: number[] = [];
      phases.forEach(phase => {
        // Get original percentage from data attribute or CSS
        let percent = 0;
        
        if (phase.hasAttribute('data-percent')) {
          percent = parseFloat(phase.getAttribute('data-percent') || '0');
        } else {
          // Determine phase type from class name
          if (phase.classList.contains('fab')) percent = 27;
          else if (phase.classList.contains('paint')) percent = 7;
          else if (phase.classList.contains('production')) percent = 60;
          else if (phase.classList.contains('it')) percent = 7;
          else if (phase.classList.contains('ntc')) percent = 7;
          else if (phase.classList.contains('qc')) percent = 7;
          else percent = 10; // Default fallback
        }
        
        percentages.push(percent);
      });
      
      // Calculate total percentage (should be 100%, but verify)
      const totalPercent = percentages.reduce((sum, p) => sum + p, 0);
      
      // Normalize percentages if needed
      if (totalPercent !== 100 && totalPercent > 0) {
        for (let i = 0; i < percentages.length; i++) {
          percentages[i] = (percentages[i] / totalPercent) * 100;
        }
      }
      
      // Now apply the correct widths to each phase
      let currentPosition = 0;
      phases.forEach((phase, index) => {
        if (phase instanceof HTMLElement) {
          const phaseWidth = (percentages[index] / 100) * barWidth;
          
          // Apply the calculated width and position
          phase.style.width = `${phaseWidth}px`;
          phase.style.left = `${currentPosition}px`;
          
          // Store the percentage for future reference
          phase.setAttribute('data-percent', percentages[index].toString());
          
          // Update position for next phase
          currentPosition += phaseWidth;
        }
      });
    };
    
    // This function directly injects the phase rendering fix into the page
    const injectDirectPhaseFix = () => {
      const script = document.createElement('script');
      script.id = 'exact-phase-fix';
      script.textContent = `
        // Direct phase rendering fix for sandbox mode
        (function() {
          // Function to fix phases for a specific bar
          function fixPhasesForBar(bar) {
            if (!bar) return;
            
            // Get the current width of the bar
            const barWidth = parseFloat(bar.style.width || '0');
            if (!barWidth) return;
            
            // Find all phase elements within this bar
            const phases = bar.querySelectorAll('.phase');
            if (!phases.length) return;
            
            // Default percentages for each phase type
            const defaultPercentages = {
              'fab': 27,
              'paint': 7,
              'production': 60,
              'it': 7,
              'ntc': 7,
              'qc': 7
            };
            
            // Determine the percentage for each phase
            const percentages = [];
            phases.forEach(phase => {
              let percent = 0;
              
              // Try to get from data attribute first
              if (phase.hasAttribute('data-percent')) {
                percent = parseFloat(phase.getAttribute('data-percent'));
              } else {
                // Otherwise determine from class
                for (const [type, defaultPercent] of Object.entries(defaultPercentages)) {
                  if (phase.classList.contains(type)) {
                    percent = defaultPercent;
                    break;
                  }
                }
              }
              
              percentages.push(percent);
            });
            
            // Calculate total percentage
            const totalPercent = percentages.reduce((sum, p) => sum + p, 0);
            
            // Normalize percentages if needed
            if (totalPercent !== 100 && totalPercent > 0) {
              for (let i = 0; i < percentages.length; i++) {
                percentages[i] = (percentages[i] / totalPercent) * 100;
              }
            }
            
            // Apply the correct widths to each phase
            let currentPosition = 0;
            phases.forEach((phase, index) => {
              const phaseWidth = (percentages[index] / 100) * barWidth;
              
              // Apply the calculated width and position
              phase.style.width = phaseWidth + 'px';
              phase.style.left = currentPosition + 'px';
              
              // Store the percentage for future reference
              phase.setAttribute('data-percent', percentages[index].toString());
              
              // Update position for next phase
              currentPosition += phaseWidth;
            });
          }
          
          // Function to handle mousedown on resize handles
          function handleMouseDown(e) {
            // Find the parent project bar
            let bar = e.target.closest('.big-project-bar');
            if (!bar) return;
            
            // Mark this bar as being resized
            bar.classList.add('resizing');
            document.body.classList.add('resizing-active');
            
            // Add handlers for mousemove and mouseup
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            
            // Store original width for reference
            bar.setAttribute('data-original-width', bar.style.width);
          }
          
          // Function to handle mousemove during resize
          function handleMouseMove(e) {
            // Find any bars being resized
            const resizingBars = document.querySelectorAll('.big-project-bar.resizing');
            resizingBars.forEach(bar => {
              fixPhasesForBar(bar);
            });
          }
          
          // Function to handle mouseup after resize
          function handleMouseUp(e) {
            // Find any bars being resized
            const resizingBars = document.querySelectorAll('.big-project-bar.resizing');
            resizingBars.forEach(bar => {
              bar.classList.remove('resizing');
              fixPhasesForBar(bar);
            });
            
            // Remove global flag
            document.body.classList.remove('resizing-active');
            
            // Clean up event listeners
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
          }
          
          // Add mousedown listeners to all resize handles
          function addResizeHandlers() {
            const handles = document.querySelectorAll('.resize-handle-left, .resize-handle-right');
            handles.forEach(handle => {
              // Remove any existing listeners first to avoid duplicates
              handle.removeEventListener('mousedown', handleMouseDown);
              
              // Add our listener
              handle.addEventListener('mousedown', handleMouseDown);
              
              // Mark this handle as enhanced
              handle.setAttribute('data-enhanced', 'true');
              
              // Make handle more visible
              if (handle instanceof HTMLElement) {
                handle.style.width = '12px';
                handle.style.backgroundColor = 'rgba(30, 144, 255, 0.7)';
                handle.style.zIndex = '100';
              }
            });
          }
          
          // Initialize by adding handlers to all existing resize handles
          addResizeHandlers();
          
          // Set up a MutationObserver to watch for new resize handles
          const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
              if (mutation.addedNodes.length) {
                // Check if any new resize handles were added
                addResizeHandlers();
              }
            });
          });
          
          // Start observing the document body
          observer.observe(document.body, {
            childList: true,
            subtree: true
          });
          
          // Also patch the existing applyPhaseWidthsToDom function if it exists
          if (typeof window.applyPhaseWidthsToDom === 'function') {
            const originalFn = window.applyPhaseWidthsToDom;
            window.applyPhaseWidthsToDom = function(scheduleBar, ...args) {
              // Call the original function first
              const result = originalFn(scheduleBar, ...args);
              
              // Then apply our fix
              if (scheduleBar && document.body.classList.contains('sandbox-active')) {
                fixPhasesForBar(scheduleBar);
              }
              
              return result;
            };
          }
          
          // Also directly handle the case when a bar is resized from either end
          document.addEventListener('mouseup', function(e) {
            // Small delay to allow resize operation to complete
            setTimeout(() => {
              const bars = document.querySelectorAll('.big-project-bar');
              bars.forEach(bar => {
                fixPhasesForBar(bar);
              });
            }, 50);
          });
          
          // Mark body to indicate our fix is active
          document.body.classList.add('sandbox-active');
          document.body.classList.add('phase-fix-active');
          
          console.log('🔥 EXACT PHASE FIX: Direct DOM manipulation active for phase rendering');
        })();
      `;
      document.head.appendChild(script);
    };
    
    // Inject the direct phase fix immediately
    injectDirectPhaseFix();
    
    // Add a global style to make the resize handles more obvious
    const style = document.createElement('style');
    style.id = 'exact-phase-fix-styles';
    style.textContent = `
      /* Make resize handles more visible */
      .sandbox-active .resize-handle-left,
      .sandbox-active .resize-handle-right {
        width: 12px !important;
        background-color: rgba(30, 144, 255, 0.7) !important;
        cursor: ew-resize !important;
        z-index: 100 !important;
      }
      
      /* Improve handle visibility on hover */
      .sandbox-active .resize-handle-left:hover,
      .sandbox-active .resize-handle-right:hover {
        background-color: rgba(30, 144, 255, 1) !important;
        box-shadow: 0 0 0 1px white !important;
        opacity: 1 !important;
      }
      
      /* Visual feedback for project being resized */
      .sandbox-active .big-project-bar.resizing {
        outline: 2px solid #1e90ff !important;
        z-index: 1000 !important;
      }
    `;
    document.head.appendChild(style);
    
    // Mark the document body to indicate sandbox mode is active
    document.body.classList.add('sandbox-active');
    
    // Return cleanup function
    return () => {
      // Remove script and style elements
      const scriptEl = document.getElementById('exact-phase-fix');
      if (scriptEl) scriptEl.remove();
      
      const styleEl = document.getElementById('exact-phase-fix-styles');
      if (styleEl) styleEl.remove();
      
      // Remove sandbox class from body
      document.body.classList.remove('sandbox-active');
      document.body.classList.remove('phase-fix-active');
      
      console.log('🧹 Exact phase fix removed');
    };
  }, [isSandboxMode]);
  
  // This component doesn't render anything visible
  return null;
};

export default ExactPhaseRenderFix;