
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading, user } = useAuth();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    if (hasRedirected) return;

    // Wait for auth to finish loading
    if (loading) return;

    setHasRedirected(true);

    if (isAuthenticated && user) {
      console.log("User authenticated, navigating to analytics");
      navigate("/analytics", { replace: true });
    } else {
      console.log("User not authenticated, redirecting to login");
      navigate("/login", { replace: true });
    }
  }, [navigate, isAuthenticated, loading, user, hasRedirected]);

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
