import React, { useEffect } from 'react';

/**
 * DirectSandboxFix
 * 
 * A simpler, more direct approach to fixing sandbox mode by:
 * 1. Using the exact same drag and drop logic as normal mode
 * 2. Ensuring resize updates the UI properly
 */
const DirectSandboxFix: React.FC<{
  isSandboxMode: boolean;
}> = ({ isSandboxMode }) => {
  
  useEffect(() => {
    if (!isSandboxMode) return;
    
    console.log('🔧 DirectSandboxFix: Applying simplified sandbox mode fixes');
    
    // Direct fix for the resize UI update issue
    const fixResizeUI = () => {
      // Create a mutation observer to watch for style changes on project bars
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && 
              mutation.attributeName === 'style' && 
              mutation.target instanceof HTMLElement) {
            
            const bar = mutation.target;
            
            // Check if this is a project bar being resized
            if (bar.classList.contains('big-project-bar') && 
                (bar.classList.contains('resizing') || document.body.classList.contains('resizing-active'))) {
              
              // Calculate the current width of the bar
              const width = parseFloat(bar.style.width);
              
              // Find all phase elements inside this bar
              const phases = bar.querySelectorAll('.phase');
              
              // If we have phase elements, recalculate their widths
              if (phases.length > 0) {
                // Get phase percentages
                const percentages = [];
                phases.forEach(phase => {
                  const percent = parseFloat(phase.getAttribute('data-percent') || '0');
                  percentages.push(percent);
                });
                
                // Calculate new widths based on current bar width
                let currentPosition = 0;
                phases.forEach((phase, index) => {
                  if (phase instanceof HTMLElement) {
                    const phaseWidth = (percentages[index] / 100) * width;
                    phase.style.width = `${phaseWidth}px`;
                    phase.style.left = `${currentPosition}px`;
                    currentPosition += phaseWidth;
                  }
                });
              }
            }
          }
        });
      });
      
      // Observe all current and future project bars
      const startObserving = () => {
        // Find all project bars
        const projectBars = document.querySelectorAll('.big-project-bar');
        projectBars.forEach(bar => {
          observer.observe(bar, { attributes: true, attributeFilter: ['style'] });
        });
        
        // Add a flag to the document to avoid duplicate observers
        document.body.setAttribute('data-sandbox-resize-fixed', 'true');
      };
      
      // Start observing immediately
      startObserving();
      
      // Also set up a timer to periodically check for new bars
      const intervalId = setInterval(() => {
        startObserving();
      }, 2000);
      
      // Return cleanup function
      return () => {
        clearInterval(intervalId);
        observer.disconnect();
        document.body.removeAttribute('data-sandbox-resize-fixed');
      };
    };
    
    // Apply the resize UI fix
    const cleanup = fixResizeUI();
    
    // Inject a small script to handle date-related constraints
    const script = document.createElement('script');
    script.id = 'direct-sandbox-fix';
    script.textContent = `
      // Simple flag to detect sandbox mode
      window.isSandboxMode = true;
      
      // Create a custom event that will fire when project bars are resized
      window.dispatchEvent(new CustomEvent('sandbox-ui-needs-update'));
      
      // Override date validation in sandbox mode to allow free movement
      document.addEventListener('dragover', function(e) {
        if (window.isSandboxMode && e.dataTransfer) {
          // Always allow drops in sandbox mode
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }
      }, true);
      
      // Fix for phase rendering when resizing
      document.body.addEventListener('mouseup', function(e) {
        if (window.isSandboxMode && document.body.classList.contains('resizing-active')) {
          // Force phase recalculation after resize ends
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('sandbox-ui-needs-update'));
            
            // Find all bars with the resizing class
            document.querySelectorAll('.big-project-bar.resizing').forEach(bar => {
              // Manually trigger a resize event to update phases
              const event = new CustomEvent('resize-complete', { detail: { target: bar } });
              document.dispatchEvent(event);
            });
          }, 50);
        }
      }, true);
      
      console.log('🔧 Direct sandbox fix script added - UI updates enabled for resize operations');
    `;
    document.head.appendChild(script);
    
    // Return a cleanup function
    return () => {
      if (cleanup) cleanup();
      
      const scriptEl = document.getElementById('direct-sandbox-fix');
      if (scriptEl) scriptEl.remove();
      
      delete window.isSandboxMode;
      
      console.log('🧹 Direct sandbox fixes removed');
    };
  }, [isSandboxMode]);
  
  // This component doesn't render anything visible
  return null;
};

export default DirectSandboxFix;