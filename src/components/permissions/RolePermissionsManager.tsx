import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSystemModules, useModuleActions, useRolePermissions } from '@/hooks/usePermissions';
import { Shield, Save, CheckCircle2, XCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useQueryClient } from '@tanstack/react-query';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription } from '@/components/ui/alert';

const DEFAULT_ROLES = [
  // superAdmin no se gestiona aquí: tiene acceso total implícito
  { value: 'admin', label: 'Administrador' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'qualityAnalyst', label: 'Analista de Calidad' },
  { value: 'backOffice', label: 'Back Office' },
  { value: 'agent', label: 'Agente' }
];

export function RolePermissionsManager() {
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [modulePermissions, setModulePermissions] = useState<Record<string, { canAccess: boolean; actions: string[] }>>({});
  const [roles, setRoles] = useState(DEFAULT_ROLES);
  
  const { data: modules } = useSystemModules();
  const { data: rolePermissions, refetch: refetchPermissions } = useRolePermissions(selectedRole);
  const queryClient = useQueryClient();
  
  // Load custom roles
  useEffect(() => {
    const savedRoles = localStorage.getItem('customRoles');
    if (savedRoles) {
      setRoles([...DEFAULT_ROLES, ...JSON.parse(savedRoles)]);
    }
  }, []);
  
  // Load permissions when role changes
  useEffect(() => {
    if (rolePermissions && modules) {
      const perms: Record<string, { canAccess: boolean; actions: string[] }> = {};
      
      rolePermissions.forEach(perm => {
        const module = modules.find(m => m.id === perm.module_id);
        if (module) {
          perms[module.name] = {
            canAccess: perm.can_access,
            actions: perm.allowed_actions || []
          };
        }
      });
      
      setModulePermissions(perms);
    }
  }, [rolePermissions, modules]);

  const handleModuleAccessChange = (moduleName: string, checked: boolean) => {
    setModulePermissions(prev => ({
      ...prev,
      [moduleName]: {
        canAccess: checked,
        actions: checked ? (prev[moduleName]?.actions || []) : []
      }
    }));
  };

  const handleActionChange = async (moduleName: string, actionId: string, checked: boolean) => {
    setModulePermissions(prev => {
      const current = prev[moduleName] || { canAccess: true, actions: [] };
      const actions = checked
        ? [...current.actions, actionId]
        : current.actions.filter(id => id !== actionId);
      
      return {
        ...prev,
        [moduleName]: {
          ...current,
          actions
        }
      };
    });
  };

  const handleSave = async () => {
    if (!selectedRole) {
      toast.error('Selecciona un rol primero');
      return;
    }

    try {
      // Delete existing permissions for this role
      await supabase
        .from('role_permissions')
        .delete()
        .eq('role', selectedRole);

      // Insert new permissions
      const permissionsToInsert = modules
        ?.filter(module => modulePermissions[module.name]?.canAccess)
        .map(module => ({
          role: selectedRole,
          module_id: module.id,
          can_access: true,
          allowed_actions: modulePermissions[module.name]?.actions || []
        })) || [];

      if (permissionsToInsert.length > 0) {
        const { error } = await supabase
          .from('role_permissions')
          .insert(permissionsToInsert);

        if (error) throw error;
      }

      // Invalidar cache de permisos
      queryClient.invalidateQueries({ queryKey: ['effective-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['check-permission'] });
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      
      toast.success('Permisos guardados correctamente');
      refetchPermissions();
    } catch (error: any) {
      console.error('Error saving permissions:', error);
      toast.error('Error al guardar permisos: ' + error.message);
    }
  };

  const getPermissionSummary = () => {
    const enabledModules = Object.entries(modulePermissions).filter(([_, perm]) => perm.canAccess);
    const totalActions = enabledModules.reduce((sum, [_, perm]) => sum + perm.actions.length, 0);
    return { modules: enabledModules.length, actions: totalActions };
  };

  const summary = selectedRole ? getPermissionSummary() : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle>Gestión de Permisos por Rol</CardTitle>
          </div>
          {summary && (
            <div className="flex gap-4 text-sm">
              <Badge variant="secondary">
                {summary.modules} módulos activos
              </Badge>
              <Badge variant="outline">
                {summary.actions} acciones permitidas
              </Badge>
            </div>
          )}
        </div>
        <CardDescription>
          Configura los permisos de acceso y acciones disponibles para cada rol
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Seleccionar Rol</Label>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger>
              <SelectValue placeholder="Elige un rol..." />
            </SelectTrigger>
            <SelectContent>
              {roles.map(role => (
                <SelectItem key={role.value} value={role.value}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedRole && modules && (
          <>
            <Separator />
            
            <Alert>
              <AlertDescription>
                Los permisos configurados aquí aplicarán a todos los usuarios con el rol <strong>{roles.find(r => r.value === selectedRole)?.label}</strong>
              </AlertDescription>
            </Alert>

            <Accordion type="multiple" className="w-full space-y-2">
              {modules.map(module => (
                <AccordionItem key={module.id} value={module.id} className="border rounded-lg">
                  <ModulePermissionCard
                    module={module}
                    isAccessible={modulePermissions[module.name]?.canAccess || false}
                    allowedActions={modulePermissions[module.name]?.actions || []}
                    onAccessChange={(checked) => handleModuleAccessChange(module.name, checked)}
                    onActionChange={(actionId, checked) => handleActionChange(module.name, actionId, checked)}
                  />
                </AccordionItem>
              ))}
            </Accordion>

            <Button onClick={handleSave} size="lg" className="w-full">
              <Save className="mr-2 h-4 w-4" />
              Guardar Permisos del Rol
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface ModulePermissionCardProps {
  module: any;
  isAccessible: boolean;
  allowedActions: string[];
  onAccessChange: (checked: boolean) => void;
  onActionChange: (actionId: string, checked: boolean) => void;
}

function ModulePermissionCard({
  module,
  isAccessible,
  allowedActions,
  onAccessChange,
  onActionChange
}: ModulePermissionCardProps) {
  const { data: actions } = useModuleActions(module.id);

  return (
    <>
      <AccordionTrigger className="px-4 hover:no-underline">
        <div className="flex items-center gap-3 w-full">
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={isAccessible}
              onCheckedChange={(checked) => onAccessChange(checked as boolean)}
            />
          </div>
          <div className="flex-1 text-left">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{module.display_name}</span>
              {isAccessible ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            {module.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{module.description}</p>
            )}
          </div>
          {isAccessible && actions && actions.length > 0 && (
            <Badge variant="secondary" className="ml-auto mr-2">
              {allowedActions.length}/{actions.length} acciones
            </Badge>
          )}
        </div>
      </AccordionTrigger>
      
      {isAccessible && actions && actions.length > 0 && (
        <AccordionContent className="px-4 pb-4">
          <div className="pl-9 space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Acciones Disponibles</Label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => actions.forEach(a => onActionChange(a.id, true))}
                  className="h-7 text-xs"
                >
                  Seleccionar todas
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => actions.forEach(a => onActionChange(a.id, false))}
                  className="h-7 text-xs"
                >
                  Limpiar
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {actions.map(action => (
                <div key={action.id} className="flex items-start gap-2 p-2 rounded-md border bg-card hover:bg-accent transition-colors">
                  <Checkbox
                    id={`action-${action.id}`}
                    checked={allowedActions.includes(action.id)}
                    onCheckedChange={(checked) => onActionChange(action.id, checked as boolean)}
                  />
                  <div className="flex-1">
                    <Label 
                      htmlFor={`action-${action.id}`}
                      className="text-sm font-medium cursor-pointer leading-tight"
                    >
                      {action.display_name}
                    </Label>
                    {action.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AccordionContent>
      )}
    </>
  );
}
