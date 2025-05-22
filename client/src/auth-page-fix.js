// Direct script to COMPLETELY disable any view-only restrictions on the auth page
// This script will be loaded directly in the HTML before React

(function() {
  // Function to make the auth page fully interactive
  function makeAuthPageFullyInteractive() {
    // Check if we're on the auth page
    if (window.location.pathname === '/auth' || window.location.pathname.startsWith('/auth/')) {
      console.log("AUTH PAGE DETECTED - COMPLETELY REMOVING ALL RESTRICTIONS");
      
      // Remove all viewer mode classes from body
      document.body.classList.remove('viewer-mode');
      document.body.classList.remove('role-viewer');
      
      // Add unrestricted class
      document.body.classList.add('auth-fully-interactive');
      
      // Override all styles directly on every element
      const allElements = document.querySelectorAll('*');
      allElements.forEach(function(el) {
        if (el instanceof HTMLElement) {
          el.style.pointerEvents = 'auto';
          el.style.opacity = '1';
          el.style.filter = 'none';
          el.style.userSelect = 'auto';
          
          // Set appropriate cursors
          if (el.tagName === 'BUTTON' || el.tagName === 'A' || el.getAttribute('role') === 'button') {
            el.style.cursor = 'pointer';
          } else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            el.style.cursor = 'text';
          } else {
            el.style.cursor = 'auto';
          }
          
          // Remove disabled attribute
          el.removeAttribute('disabled');
          
          // Remove any classes that might disable interaction
          el.classList.remove('viewer-disabled');
          el.classList.remove('disabled');
        }
      });
      
      // Create a style element to force all elements to be interactive
      let styleElement = document.getElementById('auth-page-force-enable');
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = 'auth-page-force-enable';
        styleElement.innerHTML = `
          /* MAXIMUM OVERRIDE FOR AUTH PAGE - NOTHING CAN DISABLE THESE RULES */
          body.auth-fully-interactive * {
            pointer-events: auto !important;
            opacity: 1 !important;
            filter: none !important;
            user-select: auto !important;
            -webkit-user-select: auto !important;
            cursor: auto !important;
          }
          
          body.auth-fully-interactive button,
          body.auth-fully-interactive a,
          body.auth-fully-interactive [role="button"],
          body.auth-fully-interactive [type="submit"] {
            cursor: pointer !important;
          }
          
          body.auth-fully-interactive input,
          body.auth-fully-interactive textarea {
            cursor: text !important;
          }
          
          /* Override any possible viewer-mode styles */
          body.viewer-mode.auth-fully-interactive * {
            pointer-events: auto !important;
            opacity: 1 !important;
            filter: none !important;
          }
          
          /* Make sure forms are interactive */
          body.auth-fully-interactive form * {
            pointer-events: auto !important;
            opacity: 1 !important;
          }
        `;
        document.head.appendChild(styleElement);
      }
    }
  }
  
  // Run immediately
  makeAuthPageFullyInteractive();
  
  // Set up to run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', makeAuthPageFullyInteractive);
  }
  
  // Also run on any navigation
  window.addEventListener('popstate', makeAuthPageFullyInteractive);
  
  // Run continuously to catch any dynamic changes
  setInterval(makeAuthPageFullyInteractive, 100);
  
  // Watch for DOM changes that might affect the auth page
  const observer = new MutationObserver(function(mutations) {
    makeAuthPageFullyInteractive();
  });
  
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'disabled']
  });
  
  console.log("AUTH PAGE FIX SCRIPT LOADED - Will completely remove all restrictions on auth page");
})();