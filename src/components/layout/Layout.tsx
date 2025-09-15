
import React, { useState, useEffect, useCallback, useMemo } from "react";
import Sidebar from "./Sidebar";
import GlobalSearch from "./GlobalSearch";
import { Button } from "@/components/ui/button";
import { Menu, Search } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Memoized keyboard shortcuts to prevent re-creation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ctrl/Cmd + K for search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      setSearchOpen(true);
    }

    // Ctrl/Cmd + B for sidebar toggle on mobile
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      setSidebarOpen(prev => !prev);
    }

    // Escape to close search
    if (e.key === 'Escape' && searchOpen) {
      e.preventDefault();
      setSearchOpen(false);
    }
  }, [searchOpen]);

  // Enhanced global keyboard shortcuts with optimized event handling
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  // Memoized loading component to prevent re-renders
  const loadingComponent = useMemo(() => (
    <div className="w-full h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    </div>
  ), []);

  if (!isMounted) {
    return loadingComponent;
  }

  return (
    <div className="w-full h-screen flex bg-background overflow-hidden">
      {/* Sidebar with optimized rendering */}
      <div className={`
        fixed inset-y-0 left-0 z-50 transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 md:static md:inset-0
      `}>
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay - only render when needed */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" 
          onClick={closeSidebar} 
        />
      )}
      
      {/* Main content */}
      <div className="flex-1 flex flex-col w-full h-full overflow-hidden">
        {/* Mobile top bar - memoized to prevent re-renders */}
        <div className="md:hidden sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 shadow-sm shrink-0">
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-9 w-9">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
          
          <div className="flex-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img 
                src="https://www.convertia.com/favicon/favicon-convertia.png" 
                alt="Convert-IA Logo" 
                className="h-6 w-6" 
              />
              <span className="font-bold text-lg text-primary">Convert-IA</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setSearchOpen(true)} 
                className="h-9 w-9"
              >
                <Search className="h-4 w-4" />
                <span className="sr-only">Buscar</span>
              </Button>
              
              {/* Ctrl+K hint for mobile */}
              <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">⌘K</kbd>
              </div>
            </div>
          </div>
        </div>

        {/* Page content - optimized for performance */}
        <main className="flex-1 w-full h-full overflow-auto">
          <div className="w-full h-full px-[7px]">
            {children}
          </div>
        </main>
      </div>

      {/* Global Search Dialog - only render when needed */}
      {searchOpen && (
        <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      )}
    </div>
  );
};

export default React.memo(Layout);
