
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";
import { useEffectivePermissions, useSystemModules } from "@/hooks/usePermissions";

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading, user } = useAuth();
  const [hasRedirected, setHasRedirected] = useState(false);
  const { data: effectivePerms } = useEffectivePermissions();
  const { data: modules } = useSystemModules();

  const firstAuthorizedRoute = useMemo(() => {
    if (!modules || modules.length === 0) return null;
    // superAdmin: primer módulo por orden
    if (user?.role === 'superAdmin') {
      const sorted = [...modules].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
      return sorted[0]?.route || '/analytics';
    }
    // otros roles: primer módulo con permiso efectivo
    const allowedModuleNames = new Set((effectivePerms || []).filter(p => p.can_access).map(p => p.module_name));
    const allowedModules = modules
      .filter(m => allowedModuleNames.has(m.name))
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    return allowedModules[0]?.route || null;
  }, [user, modules, effectivePerms]);

  useEffect(() => {
    if (hasRedirected) return;

    // Wait for auth to finish loading
    if (loading) return;

    // Esperar datos de permisos y módulos antes de decidir
    if (isAuthenticated && user) {
      if (!modules) return; // esperar módulos
      if (user.role !== 'superAdmin' && !effectivePerms) return; // esperar permisos efectivos
      const target = firstAuthorizedRoute;
      setHasRedirected(true);
      if (target) {
        navigate(target, { replace: true });
      } else {
        // Sin módulos autorizados
        navigate("/login", { replace: true });
      }
    } else {
      setHasRedirected(true);
      console.log("User not authenticated, redirecting to login");
      navigate("/login", { replace: true });
    }
  }, [navigate, isAuthenticated, loading, user, hasRedirected, modules, effectivePerms, firstAuthorizedRoute]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">
          {loading ? "Verificando autenticación..." : "Preparando aplicación..."}
        </p>
      </div>
    </div>
  );
};

export default Index;
