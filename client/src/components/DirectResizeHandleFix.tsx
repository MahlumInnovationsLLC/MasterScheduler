import React, { useEffect } from 'react';

/**
 * DirectResizeHandleFix
 * 
 * A simple component that ensures the existing resize handle functionality
 * properly updates phase rendering in sandbox mode.
 */
const DirectResizeHandleFix: React.FC<{
  isSandboxMode: boolean;
}> = ({ isSandboxMode }) => {
  
  useEffect(() => {
    if (!isSandboxMode) return;
    
    console.log('🔧 Applying direct fix for resize handles in sandbox mode');
    
    // Find the updatePhaseWidthsWithExactFit function in the global scope
    // This function already exists in the codebase
    const script = document.createElement('script');
    script.id = 'direct-resize-fix';
    script.textContent = `
      // Simple direct fix for sandbox mode resize handles
      (function() {
        // Make sure the resize handles call the existing phase update function
        document.addEventListener('mouseup', function(e) {
          if (e.target.closest('.resize-handle-left, .resize-handle-right')) {
            // Find the parent project bar
            const bar = e.target.closest('.big-project-bar');
            if (bar) {
              // Get all phase elements
              const phases = bar.querySelectorAll('.phase');
              const barWidth = parseFloat(bar.style.width);
              
              // Calculate widths based on percentages
              const FAB_PERCENT = 27;
              const PAINT_PERCENT = 7;
              const PROD_PERCENT = 60;
              const IT_PERCENT = 7;
              const NTC_PERCENT = 7; 
              const QC_PERCENT = 7;
              
              // Calculate widths
              let fabWidth = barWidth * (FAB_PERCENT / 100);
              let paintWidth = barWidth * (PAINT_PERCENT / 100);
              let prodWidth = barWidth * (PROD_PERCENT / 100);
              let itWidth = barWidth * (IT_PERCENT / 100);
              let ntcWidth = barWidth * (NTC_PERCENT / 100);
              let qcWidth = barWidth * (QC_PERCENT / 100);
              
              // Set widths and positions
              let position = 0;
              phases.forEach(phase => {
                if (phase.classList.contains('fab')) {
                  phase.style.width = fabWidth + 'px';
                  phase.style.left = position + 'px';
                  position += fabWidth;
                } else if (phase.classList.contains('paint')) {
                  phase.style.width = paintWidth + 'px';
                  phase.style.left = position + 'px';
                  position += paintWidth;
                } else if (phase.classList.contains('production')) {
                  phase.style.width = prodWidth + 'px';
                  phase.style.left = position + 'px';
                  position += prodWidth;
                } else if (phase.classList.contains('it')) {
                  phase.style.width = itWidth + 'px';
                  phase.style.left = position + 'px';
                  position += itWidth;
                } else if (phase.classList.contains('ntc')) {
                  phase.style.width = ntcWidth + 'px';
                  phase.style.left = position + 'px';
                  position += ntcWidth;
                } else if (phase.classList.contains('qc')) {
                  phase.style.width = qcWidth + 'px';
                  phase.style.left = position + 'px';
                  position += qcWidth;
                }
              });
            }
          }
        });
      })();
    `;
    document.head.appendChild(script);
    
    // Also handle phases during mouse move (while resizing)
    const moveScript = document.createElement('script');
    moveScript.id = 'resize-move-fix';
    moveScript.textContent = `
      // Direct fix for phase rendering during resize
      (function() {
        let isResizing = false;
        let resizingBar = null;
        
        document.addEventListener('mousedown', function(e) {
          if (e.target.closest('.resize-handle-left, .resize-handle-right')) {
            isResizing = true;
            resizingBar = e.target.closest('.big-project-bar');
            document.body.classList.add('bar-resizing');
          }
        });
        
        document.addEventListener('mousemove', function(e) {
          if (isResizing && resizingBar) {
            // Get all phase elements
            const phases = resizingBar.querySelectorAll('.phase');
            const barWidth = parseFloat(resizingBar.style.width);
            
            if (!barWidth || phases.length === 0) return;
            
            // Calculate widths based on percentages
            const FAB_PERCENT = 27;
            const PAINT_PERCENT = 7;
            const PROD_PERCENT = 60;
            const IT_PERCENT = 7;
            const NTC_PERCENT = 7; 
            const QC_PERCENT = 7;
            
            // Calculate widths
            let fabWidth = barWidth * (FAB_PERCENT / 100);
            let paintWidth = barWidth * (PAINT_PERCENT / 100);
            let prodWidth = barWidth * (PROD_PERCENT / 100);
            let itWidth = barWidth * (IT_PERCENT / 100);
            let ntcWidth = barWidth * (NTC_PERCENT / 100);
            let qcWidth = barWidth * (QC_PERCENT / 100);
            
            // Set widths and positions
            let position = 0;
            phases.forEach(phase => {
              if (phase.classList.contains('fab')) {
                phase.style.width = fabWidth + 'px';
                phase.style.left = position + 'px';
                position += fabWidth;
              } else if (phase.classList.contains('paint')) {
                phase.style.width = paintWidth + 'px';
                phase.style.left = position + 'px';
                position += paintWidth;
              } else if (phase.classList.contains('production')) {
                phase.style.width = prodWidth + 'px';
                phase.style.left = position + 'px';
                position += prodWidth;
              } else if (phase.classList.contains('it')) {
                phase.style.width = itWidth + 'px';
                phase.style.left = position + 'px';
                position += itWidth;
              } else if (phase.classList.contains('ntc')) {
                phase.style.width = ntcWidth + 'px';
                phase.style.left = position + 'px';
                position += ntcWidth;
              } else if (phase.classList.contains('qc')) {
                phase.style.width = qcWidth + 'px';
                phase.style.left = position + 'px';
                position += qcWidth;
              }
            });
          }
        });
        
        document.addEventListener('mouseup', function() {
          isResizing = false;
          resizingBar = null;
          document.body.classList.remove('bar-resizing');
        });
      })();
    `;
    document.head.appendChild(moveScript);
    
    // Add some styles to make resize handles more visible
    const style = document.createElement('style');
    style.id = 'resize-handle-styles';
    style.textContent = `
      /* Make resize handles more visible */
      .resize-handle-left,
      .resize-handle-right {
        width: 10px !important;
        background-color: rgba(30, 144, 255, 0.6) !important;
        cursor: ew-resize !important;
        z-index: 100 !important;
      }
      
      /* Improve handle visibility on hover */
      .resize-handle-left:hover,
      .resize-handle-right:hover {
        background-color: rgba(30, 144, 255, 1) !important;
        opacity: 1 !important;
      }
      
      /* Visual feedback when resizing */
      .bar-resizing {
        cursor: ew-resize;
      }
    `;
    document.head.appendChild(style);
    
    // Return cleanup function
    return () => {
      const scriptEl = document.getElementById('direct-resize-fix');
      if (scriptEl) scriptEl.remove();
      
      const moveScriptEl = document.getElementById('resize-move-fix');
      if (moveScriptEl) moveScriptEl.remove();
      
      const styleEl = document.getElementById('resize-handle-styles');
      if (styleEl) styleEl.remove();
      
      console.log('🧹 Direct resize handle fix removed');
    };
  }, [isSandboxMode]);
  
  // This component doesn't render anything visible
  return null;
};

export default DirectResizeHandleFix;