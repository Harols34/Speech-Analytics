import { useState, useEffect, useCallback } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Layout from "@/components/layout/Layout";
import CallList from "@/components/calls/CallList";
import CallUpload from "@/components/calls/CallUpload";
import CallDetail from "@/components/calls/CallDetail";
import CallControlPanel from "@/components/calls/CallControlPanel";
import { Edit, MessageSquare, Plus, ArrowLeft, Settings, RefreshCcw } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { Suspense, lazy } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load components that aren't needed for initial render
const CallControlPanelLazy = lazy(() => import("@/components/calls/CallControlPanel"));

// Placeholder loading component
const LoadingPlaceholder = () => <div className="space-y-4">
    <Skeleton className="h-8 w-64" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-64 w-full" />
  </div>;
export default function CallsPage() {
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user
  } = useUser();

  // Check if user is admin or supervisor
  const isAdmin = user && (user.role === "admin" || user.role === "superAdmin" || user.role === "supervisor");

  // Prevent flickering by using a key based on the location pathname
  const routeKey = location.pathname;
  return <Layout>
      <Routes>
        <Route path="/" element={<div key="calls-list" className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                
                
              </div>
              <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0">
                {isAdmin && <Button variant="outline" onClick={() => setShowAdminPanel(!showAdminPanel)} className="hover-scale">
                    <Settings className="mr-2 h-4 w-4" /> 
                    {showAdminPanel ? "Ocultar Panel" : "Panel Admin"}
                  </Button>}
                
              </div>
            </div>
            
            {/* Admin Panel */}
            {isAdmin && showAdminPanel && <div className="animate-accordion-down">
                <div className="bg-card rounded-lg border p-6">
                  <h2 className="text-lg font-semibold mb-4">Panel de Administración</h2>
                  <Suspense fallback={<LoadingPlaceholder />}>
                    <CallControlPanelLazy />
                  </Suspense>
                </div>
              </div>}
            
            {/* Calls List */}
            <div className="bg-card rounded-lg border">
              <CallList />
            </div>
          </div>} />
        
        <Route path="/upload" element={<div key="calls-upload" className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/calls")} className="hover-scale">
                <ArrowLeft className="h-4 w-4 mr-2" /> 
                Volver
              </Button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Subir Llamadas</h1>
                <p className="text-muted-foreground mt-1">
                  Sube grabaciones de llamadas para análisis
                </p>
              </div>
            </div>
            
            {/* Upload Component */}
            <div className="bg-card rounded-lg border p-6">
              <CallUpload />
            </div>
          </div>} />
        
        <Route path="/:id" element={<div key="calls-detail" className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/calls")} className="hover-scale">
                <ArrowLeft className="h-4 w-4 mr-2" /> 
                Volver
              </Button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Detalles de la Llamada</h1>
                <p className="text-muted-foreground mt-1">
                  Transcripción, análisis y feedback
                </p>
              </div>
            </div>
            
            {/* Call Detail */}
            <CallDetail />
          </div>} />
      </Routes>
    </Layout>;
}