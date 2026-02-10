/**
 * Bootstrap module that performs version checking and cache-busting
 * before loading the main React application.
 */

const VERSION_CHECK_KEY = 'app_version';
const RELOAD_GUARD_KEY = 'app_reload_guard';

async function bootstrap() {
  try {
    // Fetch the current deployed version with cache disabled
    const cacheBuster = Date.now();
    const response = await fetch(`/version.json?t=${cacheBuster}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    });

    if (!response.ok) {
      console.warn('Version check failed, proceeding with app load');
      loadApp();
      return;
    }

    const versionData = await response.json();
    const currentVersion = versionData.version || 'unknown';
    
    // Get the last seen version from localStorage
    const lastSeenVersion = localStorage.getItem(VERSION_CHECK_KEY);
    
    // Check if we've already reloaded for this version in this session
    const reloadGuard = sessionStorage.getItem(RELOAD_GUARD_KEY);
    
    if (lastSeenVersion && lastSeenVersion !== currentVersion && !reloadGuard) {
      // Version changed and we haven't reloaded yet this session
      console.log(`Version changed from ${lastSeenVersion} to ${currentVersion}, reloading...`);
      
      // Set guard to prevent reload loop
      sessionStorage.setItem(RELOAD_GUARD_KEY, currentVersion);
      
      // Update stored version
      localStorage.setItem(VERSION_CHECK_KEY, currentVersion);
      
      // Force reload to get fresh assets
      window.location.reload();
      return;
    }
    
    // Update version if this is first load or versions match
    if (!lastSeenVersion || lastSeenVersion === currentVersion) {
      localStorage.setItem(VERSION_CHECK_KEY, currentVersion);
    }
    
    // Clear reload guard if versions match (normal navigation)
    if (reloadGuard && reloadGuard === currentVersion) {
      sessionStorage.removeItem(RELOAD_GUARD_KEY);
    }
    
    // Load the app
    loadApp();
    
  } catch (error) {
    console.error('Bootstrap error:', error);
    // On error, proceed with loading the app anyway
    loadApp();
  }
}

function loadApp() {
  // Dynamically import the main app entry without extension
  import('./main')
    .catch(err => {
      console.error('Failed to load application:', err);
    });
}

// Start the bootstrap process
bootstrap();
