
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

/**
 * RouteObserver component for tracking route changes
 * This is used in App.tsx to monitor and react to route changes
 */
export default function RouteObserver() {
  const location = useLocation();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    // Log navigation for tracking purposes
    console.log(`Navigation to: ${location.pathname}`);
    console.log(`Auth state: ${isAuthenticated ? "Authenticated" : "Not authenticated"}, Loading: ${loading}`);
    
    // Store last path for redirects after login (excluding login and dashboard paths)
    if (!isAuthenticated && 
        !loading && 
        location.pathname !== '/login' && 
        location.pathname !== '/' &&
        !location.pathname.includes('undefined')) {
      localStorage.setItem('lastPath', location.pathname);
      console.log(`Stored last path: ${location.pathname}`);
    }
    
    // Scroll to top on route change
    window.scrollTo(0, 0);
    
    // Send analytics event (can be extended later)
    const sendPageView = () => {
      console.log(`Page view: ${location.pathname}`);
    };

    sendPageView();
  }, [location, isAuthenticated, loading]);

  // This component doesn't render anything
  return null;
}
