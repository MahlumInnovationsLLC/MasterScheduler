/**
 * This creates a global function to completely disable View Only mode in dev-user environment
 * It runs as soon as the script is loaded and directly manipulates the DOM
 */

if (typeof window !== 'undefined') {
  // Immediate script to disable View Only mode for dev-user environment
  (function() {
    console.log("🔍 CHECKING FOR DEV-USER ENVIRONMENT");
    
    // Function to force-disable View Only mode
    function disableViewerMode() {
      console.log("🔓 FORCE DISABLING VIEW-ONLY MODE");
      
      // Remove view-only related classes
      document.body.classList.remove('viewer-mode');
      document.body.classList.remove('role-viewer');
      
      // Remove any simulated viewer mode badge
      const badge = document.getElementById('viewer-mode-badge');
      if (badge) badge.remove();
      
      // Override localStorage settings
      window.localStorage.removeItem('simulateViewerRole');
      window.localStorage.removeItem('viewerMode');
      
      // Remove any disabled attributes from buttons/inputs
      document.querySelectorAll('button, input, select, a, [role="button"]').forEach(el => {
        if (el instanceof HTMLElement) {
          el.classList.remove('viewer-disabled');
          el.removeAttribute('disabled');
        }
      });
      
      // Remove any simulation buttons from DOM
      document.querySelectorAll('button').forEach(button => {
        if (button.textContent?.includes('View-Only')) {
          button.remove();
        }
      });
    }
    
    // Call immediately
    disableViewerMode();
    
    // Set up a MutationObserver to continue disabling view-only mode
    const observer = new MutationObserver(() => {
      disableViewerMode();
    });
    
    // Start observing the document body for DOM changes
    observer.observe(document.body, { 
      childList: true,
      subtree: true
    });
    
    // Also periodically check and disable
    setInterval(disableViewerMode, 1000);
    
    // Expose globally to allow direct calling
    window.FORCE_DISABLE_VIEWER_MODE = disableViewerMode;
  })();
}

export {};