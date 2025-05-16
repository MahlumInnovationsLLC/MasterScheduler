// EMERGENCY FIX: Allow multiple projects to be placed in bays
// This script will run on page load to fix the drag and drop issue

(function() {
  // Run when DOM is loaded
  window.addEventListener('DOMContentLoaded', function() {
    console.log('🚨 EMERGENCY BAY SCHEDULING FIX: Loading...');
    
    // Force all elements to accept drops
    document.addEventListener('dragover', function(e) {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move';
      }
    }, true);
    
    // Add special drop zone logic to all bay cells
    function initializeAllBayCells() {
      // Find all cells that should accept drops
      const bayCells = document.querySelectorAll('[data-bay-id][data-date]');
      
      if (bayCells.length > 0) {
        console.log(`🔧 Found ${bayCells.length} bay cells to fix!`);
        
        bayCells.forEach(cell => {
          // Add force-drop-enabled class
          cell.classList.add('force-drop-enabled');
          
          // Enhance dragover behavior
          cell.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            if (e.dataTransfer) {
              e.dataTransfer.dropEffect = 'move';
            }
            
            // Visual feedback
            this.classList.add('drop-highlight');
          }, true);
          
          // Enhance drop behavior
          cell.addEventListener('drop', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Get data
            const data = e.dataTransfer.getData('text/plain');
            
            // When we have dropped something
            if (data) {
              const bayId = this.getAttribute('data-bay-id');
              const date = this.getAttribute('data-date');
              
              console.log(`🎯 DROP DETECTED in bay ${bayId} at date ${date}: Item ${data}`);
              
              // Create new event to trigger the original drop handler
              const customEvent = new CustomEvent('bay-drop', {
                detail: {
                  originalEvent: e,
                  data: data,
                  bayId: parseInt(bayId),
                  date: date
                },
                bubbles: true
              });
              
              // Dispatch custom event
              this.dispatchEvent(customEvent);
            }
            
            // Remove highlight
            this.classList.remove('drop-highlight');
          }, true);
        });
        
        console.log('✅ Bay cell drop handlers installed!');
      } else {
        // If cells aren't ready yet, try again in a moment
        setTimeout(initializeAllBayCells, 500);
      }
    }
    
    // Setup for unassigned projects
    function fixUnassignedProjectCards() {
      const unassignedCards = document.querySelectorAll('.unassigned-project-card');
      
      if (unassignedCards.length > 0) {
        console.log(`🔧 Found ${unassignedCards.length} unassigned projects to fix`);
        
        unassignedCards.forEach(card => {
          // Enhance dragstart behavior for all unassigned projects
          card.addEventListener('dragstart', function(e) {
            // Get project ID from the card
            const projectId = this.getAttribute('data-project-id') || 
                             this.getAttribute('id')?.replace('unassigned-', '') || 
                             '-999'; // Fallback ID if none found
            
            console.log(`🔄 DRAG STARTED for project: ${projectId}`);
            
            // Set drag data in multiple formats to ensure compatibility
            e.dataTransfer.setData('text/plain', `-${projectId}`);
            e.dataTransfer.setData('application/json', JSON.stringify({id: `-${projectId}`}));
            e.dataTransfer.setData('text/project-id', projectId);
            
            // Force move effect
            e.dataTransfer.effectAllowed = 'all';
            
            // Visual feedback during drag
            document.body.setAttribute('data-dragging-project', projectId);
            document.body.classList.add('project-dragging');
            
            // Extra insurance to prevent the no-drop cursor
            document.querySelectorAll('[data-bay-id]').forEach(el => {
              el.setAttribute('data-accepts-drop', 'true');
            });
          }, true);
          
          // Clean up after drag
          card.addEventListener('dragend', function() {
            document.body.removeAttribute('data-dragging-project');
            document.body.classList.remove('project-dragging');
            
            // Remove all drop highlights
            document.querySelectorAll('.drop-highlight').forEach(el => {
              el.classList.remove('drop-highlight');
            });
          }, true);
        });
        
        console.log('✅ Unassigned project cards fixed!');
      } else {
        // If unassigned projects aren't ready yet, try again in a moment
        setTimeout(fixUnassignedProjectCards, 500);
      }
    }
    
    // Add CSS styles for drop operations
    function addFixStyles() {
      const style = document.createElement('style');
      style.textContent = `
        /* Emergency Bay Scheduling Fix Styles */
        .force-drop-enabled {
          cursor: default !important;
          pointer-events: all !important;
        }
        
        .force-drop-enabled.drop-highlight {
          background-color: rgba(16, 185, 129, 0.3) !important;
          outline: 2px dashed rgb(16, 185, 129) !important;
        }
        
        body.project-dragging * {
          pointer-events: all !important;
        }
        
        body.project-dragging [data-accepts-drop="true"] {
          cursor: move !important;
        }
        
        .unassigned-project-card {
          cursor: grab !important;
          z-index: 9999 !important;
          user-select: none !important;
        }
      `;
      
      document.head.appendChild(style);
      console.log('✅ Emergency bay scheduling fix styles added!');
    }
    
    // Initialize the fix
    addFixStyles();
    
    // Run these after a short delay to ensure the components are mounted
    setTimeout(() => {
      initializeAllBayCells();
      fixUnassignedProjectCards();
      console.log('🚨 EMERGENCY BAY SCHEDULING FIX: Applied successfully!');
    }, 1000);
    
    // Also run these whenever the DOM changes significantly
    const observer = new MutationObserver(() => {
      initializeAllBayCells();
      fixUnassignedProjectCards();
    });
    
    observer.observe(document.body, { 
      childList: true, 
      subtree: true 
    });
  });
})();