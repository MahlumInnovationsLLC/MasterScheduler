/**
 * Force View Only Mode
 * 
 * This utility forces view-only mode across the application except for auth pages
 * It allows sidebar navigation while restricting interactive elements
 */

/**
 * Enables view-only mode across the application
 */
export function enableViewOnlyMode() {
  // Skip enforcing restrictions on auth pages
  if (window.location.pathname === '/auth' || 
      window.location.pathname === '/login' || 
      window.location.pathname === '/simple-login' ||
      window.location.pathname === '/reset-password' ||
      window.location.pathname.startsWith('/reset-password?')) {
    console.log('🔑 AUTH PAGE DETECTED - Skipping view-only mode');
    document.body.classList.remove('viewer-mode');
    document.body.classList.remove('role-viewer');
    return;
  }

  console.log('🔒 MAXIMUM DRAG-DROP OVERRIDE ACTIVE - Projects can now be placed anywhere without restrictions');
  console.log('⚠️ Applying view-only restrictions for Viewer role');
  console.log('🔒 VIEW ONLY MODE ACTIVE - User has Viewer role with restricted permissions');
  
  // Add viewer mode classes
  document.body.classList.add('viewer-mode');
  document.body.classList.add('role-viewer');
  
  // Set up and run a mutation observer for dynamic elements
  setupViewOnlyObserver();
  
  // Add viewer badge
  addViewerBadge();
}

/**
 * Sets up a mutation observer to catch dynamically added elements
 */
function setupViewOnlyObserver() {
  console.log('🔒 VIEW ONLY MODE MutationObserver active - watching for dynamic elements');
  
  // Remove any existing observer
  const existingObserver = window.viewerModeObserver;
  if (existingObserver) {
    existingObserver.disconnect();
  }
  
  // Create new observer
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      if (mutation.addedNodes.length) {
        // Make sidebar items interactive
        const sidebarElements = document.querySelectorAll('.sidebar-item, .sidebar a, .sidebar button');
        sidebarElements.forEach(el => {
          if (el instanceof HTMLElement) {
            el.classList.add('viewer-interactive');
          }
        });
      }
    });
  });
  
  // Start observing
  observer.observe(document.body, { 
    childList: true,
    subtree: true
  });
  
  // Store the observer for later cleanup
  window.viewerModeObserver = observer;
}

/**
 * Adds a badge to indicate view-only mode
 */
function addViewerBadge() {
  // Remove any existing badge
  const existingBadge = document.getElementById('viewer-mode-badge');
  if (existingBadge) {
    existingBadge.remove();
  }
  
  // Create new badge
  const badge = document.createElement('div');
  badge.id = 'viewer-mode-badge';
  badge.style.cssText = `
    position: fixed;
    bottom: 10px;
    right: 10px;
    background-color: rgba(255, 59, 48, 0.9);
    color: white;
    padding: 5px 10px;
    border-radius: 4px;
    font-size: 12px;
    z-index: 9999;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    pointer-events: none;
  `;
  badge.textContent = 'View Only Mode';
  document.body.appendChild(badge);
}

// Define the observer property on the window object
declare global {
  interface Window {
    viewerModeObserver?: MutationObserver;
  }
}