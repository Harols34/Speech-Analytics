
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import LoginForm from "@/components/auth/LoginForm";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();
  const [redirecting, setRedirecting] = useState(false);

  // Handle redirection for authenticated users
  useEffect(() => {
    if (!loading && isAuthenticated && !redirecting) {
      console.log("User is authenticated, redirecting to analytics");
      setRedirecting(true);
      
      // Get last path with proper validation
      const lastPath = localStorage.getItem('lastPath');
      const validLastPath = lastPath && 
                          lastPath !== '/login' && 
                          lastPath !== '/' && 
                          !lastPath.includes('undefined') &&
                          !lastPath.includes('null');
      
      if (validLastPath) {
        console.log("Redirecting to saved path:", lastPath);
        localStorage.removeItem('lastPath');
        navigate(lastPath, { replace: true });
      } else {
        console.log("Redirecting to analytics");
        navigate("/analytics", { replace: true });
      }
    }
  }, [isAuthenticated, loading, navigate, redirecting]);

  // Show loading while checking authentication or redirecting
  if (loading || (isAuthenticated && !redirecting)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">
            {loading ? "Verificando sesión..." : "Redirigiendo..."}
          </p>
        </div>
      </div>
    );
  }

  // Don't render login form if user is authenticated
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-secondary to-background p-4">
      <div className="w-full max-w-md glass-card p-8 space-y-8 bg-card shadow-xl rounded-xl border border-border">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-primary">Bienvenido a ConvertIA Analytics</h1>
          <p className="text-muted-foreground">Inicia sesión para acceder a tu cuenta</p>
        </div>
        
        <LoginForm language="es" />
        
        <div className="pt-4 text-center text-sm text-muted-foreground">
          <p>Análisis inteligente y transformación de conversaciones</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
