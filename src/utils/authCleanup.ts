
/**
 * Utility for cleaning up authentication state to prevent limbo states
 */

export const cleanupAuthState = () => {
  try {
    console.log("Cleaning up authentication state...");
    
    // Remove standard auth tokens
    localStorage.removeItem('supabase.auth.token');
    
    // Remove all Supabase auth keys from localStorage
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        console.log(`Removing localStorage key: ${key}`);
        localStorage.removeItem(key);
      }
    });
    
    // Remove from sessionStorage if in use
    if (typeof sessionStorage !== 'undefined') {
      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          console.log(`Removing sessionStorage key: ${key}`);
          sessionStorage.removeItem(key);
        }
      });
    }
    
    // Clear any other potential auth-related storage
    localStorage.removeItem('lastPath');
    
    console.log("Auth state cleanup completed");
  } catch (error) {
    console.error("Error during auth cleanup:", error);
  }
};

export const performGlobalSignOut = async (supabase: any) => {
  try {
    console.log("Performing global sign out...");
    await supabase.auth.signOut({ scope: 'global' });
  } catch (error) {
    console.log("Global sign out failed, continuing anyway:", error);
  }
};
