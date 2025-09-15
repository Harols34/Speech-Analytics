import { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Layout from "@/components/layout/Layout";
import BehaviorList from "@/components/behaviors/BehaviorList";
import BehaviorForm from "@/components/behaviors/BehaviorForm";
import { ArrowLeft, Brain } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
export default function BehaviorsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    isAuthenticated,
    loading,
    user
  } = useAuth();
  useEffect(() => {
    console.log("Behaviors page mounted, path:", location.pathname);
    console.log("Auth state on Behaviors page:", {
      isAuthenticated,
      loading,
      userRole: user?.role
    });
    const checkAuth = async () => {
      if (!isAuthenticated && !loading) {
        console.log("Not authenticated, redirecting to login");
        toast.error("Sesión expirada", {
          description: "Por favor inicia sesión para continuar"
        });
        navigate("/login", {
          replace: true
        });
        return false;
      }
      setIsLoading(false);
      return true;
    };
    const timer = setTimeout(() => {
      checkAuth();
    }, 500);
    return () => clearTimeout(timer);
  }, [isAuthenticated, loading, navigate, user, location]);
  if (loading || isLoading) {
    return <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>;
  }
  return <Layout>
      <Routes>
        <Route path="/*" element={<div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Comportamientos</h2>
                <p className="text-muted-foreground">Crea y gestiona comportamientos para que la IA los evalúe por ti</p>
              </div>
              
            </div>
            <BehaviorList />
          </div>} />
        <Route path="/new" element={<div className="space-y-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/behaviors")}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Volver
              </Button>
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Nuevo Comportamiento</h2>
                <p className="text-muted-foreground">
                  Crear un nuevo comportamiento de análisis de IA
                </p>
              </div>
            </div>
            <BehaviorForm />
          </div>} />
        <Route path="/edit/:id" element={<div className="space-y-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/behaviors")}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Volver
              </Button>
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Editar Comportamiento</h2>
                <p className="text-muted-foreground">
                  Modificar comportamiento de análisis de IA
                </p>
              </div>
            </div>
            <BehaviorForm />
          </div>} />
      </Routes>
    </Layout>;
}