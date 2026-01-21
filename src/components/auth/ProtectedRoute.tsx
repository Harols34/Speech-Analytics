import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  allowedRoles = [], 
  redirectTo = '/login' 
}: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();

  // Mostrar loading mientras verificamos autenticación
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  // Redirigir si no está autenticado
  if (!isAuthenticated || !user) {
    return <Navigate to={redirectTo} replace />;
  }

  // Si se especifican roles, verificar que el usuario tenga el rol correcto
  if (allowedRoles.length > 0 && user.role && !allowedRoles.includes(user.role)) {
    // Si es agente y no tiene acceso, enviarlo siempre a formación
    if (user.role === 'agent') {
      return <Navigate to="/formacion" replace />;
    }
    // Otros roles sin acceso se redirigen al dashboard/analytics
    return <Navigate to="/analytics" replace />;
  }

  return <>{children}</>;
}
