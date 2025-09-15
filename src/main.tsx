
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Clear any app cache on startup to prevent login issues
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
      console.log('Unregistering service worker:', registration);
      registration.unregister();
    });
  });
}

// Simplified startup - remove complex cache clearing
const clearOldCache = () => {
  try {
    // Only remove problematic keys, keep valid sessions
    const keysToRemove = ['session_expired_shown', 'app_cache_cleaned'];
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Mark as cleaned
    localStorage.setItem('app_cache_cleaned', 'true');
    console.log('Startup cache cleaning completed');
  } catch (error) {
    console.error('Error during startup cache clean:', error);
  }
};

// Handle localStorage event dispatch for sidebar collapsed state
const setupSidebarEvents = () => {
  // Create a custom event to notify about sidebar state changes
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function(key, value) {
    // Call the original function first
    const result = originalSetItem.apply(this, arguments);
    
    // Create and dispatch a custom event
    if (key === 'sidebar-collapsed') {
      const event = new StorageEvent('storage', {
        key: key,
        newValue: value,
        oldValue: localStorage.getItem(key),
        storageArea: localStorage,
        url: window.location.href
      });
      window.dispatchEvent(event);
    }
    
    return result;
  };
};

// Execute cleanup at startup
clearOldCache();
setupSidebarEvents();

// Simple version to avoid complications
const appVersion = Date.now();
console.log(`App version: ${appVersion}`);

// Get the root element
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

// Render the application with proper React structure
const root = createRoot(rootElement);
root.render(<App />);
