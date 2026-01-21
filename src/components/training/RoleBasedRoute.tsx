import React, { useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { useEffectivePermissions, useSystemModules } from '@/hooks/usePermissions';
import { useLocation, useNavigate } from 'react-router-dom';

interface RoleBasedRouteProps {
  allowedRoles?: string[];
  children: React.ReactNode;
  fallbackMessage?: string;
  moduleName?: string; // opcional: valida permiso por módulo
  actionKey?: string;  // opcional: valida acción específica del módulo
}

export function RoleBasedRoute({ 
  allowedRoles = [], 
  children, 
  fallbackMessage = "No tienes permisos para acceder a esta sección",
  moduleName,
  actionKey
}: RoleBasedRouteProps) {
  const { user } = useAuth();
  const { data: effectivePerms } = useEffectivePermissions();
  const { data: modules } = useSystemModules();
  const navigate = useNavigate();
  const location = useLocation();

  const isSuperAdmin = user?.role === 'superAdmin';
  let hasAccess: boolean | undefined = undefined;
  if (isSuperAdmin) {
    hasAccess = true;
  } else if (moduleName) {
    if (!effectivePerms) {
      hasAccess = undefined; // esperar permisos efectivos
    } else {
      const allowedNames = new Set(effectivePerms.filter(p => p.can_access).map(p => p.module_name));
      hasAccess = allowedNames.has(moduleName);
    }
  } else if (allowedRoles && allowedRoles.length > 0) {
    hasAccess = !!user?.role && allowedRoles.includes(user.role);
  } else {
    hasAccess = false;
  }

  // Calcular primera ruta autorizada según permisos efectivos o por orden si es superAdmin
  const firstAuthorizedRoute = useMemo(() => {
    if (!modules || modules.length === 0) return null;
    if (isSuperAdmin) {
      const sorted = [...modules].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
      return sorted[0]?.route || null;
    }
    if (!effectivePerms) return null;
    const allowedNames = new Set(effectivePerms.filter(p => p.can_access).map(p => p.module_name));
    const allowedModules = modules
      .filter(m => m.route && allowedNames.has(m.name))
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    return allowedModules[0]?.route || null;
  }, [modules, effectivePerms, isSuperAdmin]);

  // Si no tiene acceso al módulo actual, redirigir automáticamente al primer módulo autorizado
  useEffect(() => {
    // Evitar redirecciones mientras los datos aún no están listos
    if (!moduleName) return; // si no hay módulo específico, no auto-redirigir aquí
    if (!modules || (user?.role !== 'superAdmin' && !effectivePerms)) return;
    if (hasAccess === false && firstAuthorizedRoute && location.pathname !== firstAuthorizedRoute) {
      navigate(firstAuthorizedRoute, { replace: true });
    }
  }, [hasAccess, firstAuthorizedRoute, location.pathname, navigate, modules, effectivePerms, moduleName, user?.role]);

  if (hasAccess === undefined) {
    // Estado intermedio silencioso para evitar parpadeos
    return null;
  }

  if (hasAccess === false) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Acceso Restringido</h3>
            <p className="text-sm text-muted-foreground text-center">
              {fallbackMessage}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Tu rol actual: {user?.role || 'No definido'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}