import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSystemModules, useModuleActions, useUserPermissions, useRolePermissions } from '@/hooks/usePermissions';
import { UserCog, Save, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export function UserPermissionsManager() {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [modulePermissions, setModulePermissions] = useState<Record<string, { canAccess: boolean; actions: string[] }>>({});
  
  const { data: modules } = useSystemModules();
  const { data: userPermissions, refetch: refetchUserPermissions } = useUserPermissions(selectedUserId);
  const { data: rolePermissions } = useRolePermissions(selectedUser?.role);

  // Load users
  useEffect(() => {
    const loadUsers = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .order('full_name');
      
      if (error) {
        console.error('Error loading users:', error);
        return;
      }
      
      setUsers(data || []);
    };
    
    loadUsers();
  }, []);

  // Load user and permissions when user changes
  useEffect(() => {
    if (selectedUserId && users.length > 0) {
      const user = users.find(u => u.id === selectedUserId);
      setSelectedUser(user);
      
      // Initialize with role permissions
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
        
        // Override with user-specific permissions
        if (userPermissions) {
          userPermissions.forEach(perm => {
            const module = modules.find(m => m.id === perm.module_id);
            if (module) {
              perms[module.name] = {
                canAccess: perm.can_access,
                actions: perm.allowed_actions || []
              };
            }
          });
        }
        
        setModulePermissions(perms);
      }
    }
  }, [selectedUserId, users, userPermissions, rolePermissions, modules]);

  const handleModuleAccessChange = (moduleName: string, checked: boolean) => {
    setModulePermissions(prev => ({
      ...prev,
      [moduleName]: {
        canAccess: checked,
        actions: checked ? (prev[moduleName]?.actions || []) : []
      }
    }));
  };

  const handleActionChange = (moduleName: string, actionId: string, checked: boolean) => {
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
    if (!selectedUserId) {
      toast.error('Selecciona un usuario primero');
      return;
    }

    try {
      // Delete existing user permissions
      await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', selectedUserId);

      // Get role permissions to compare
      const rolePerms = new Map();
      rolePermissions?.forEach(perm => {
        const module = modules?.find(m => m.id === perm.module_id);
        if (module) {
          rolePerms.set(module.name, {
            canAccess: perm.can_access,
            actions: perm.allowed_actions || []
          });
        }
      });

      // Only save permissions that differ from role permissions
      const permissionsToInsert = modules
        ?.filter(module => {
          const userPerm = modulePermissions[module.name];
          const rolePerm = rolePerms.get(module.name);
          
          // Only save if different from role permission
          if (!userPerm) return false;
          if (!rolePerm) return userPerm.canAccess;
          
          const accessDifferent = userPerm.canAccess !== rolePerm.canAccess;
          const actionsDifferent = JSON.stringify(userPerm.actions.sort()) !== JSON.stringify(rolePerm.actions.sort());
          
          return accessDifferent || actionsDifferent;
        })
        .map(module => ({
          user_id: selectedUserId,
          module_id: module.id,
          can_access: modulePermissions[module.name]?.canAccess || false,
          allowed_actions: modulePermissions[module.name]?.actions || []
        })) || [];

      if (permissionsToInsert.length > 0) {
        const { error } = await supabase
          .from('user_permissions')
          .insert(permissionsToInsert);

        if (error) throw error;
      }

      toast.success('Permisos de usuario guardados correctamente');
      refetchUserPermissions();
    } catch (error: any) {
      console.error('Error saving user permissions:', error);
      toast.error('Error al guardar permisos: ' + error.message);
    }
  };

  const getPermissionSummary = () => {
    if (!selectedUserId) return null;
    const enabledModules = Object.entries(modulePermissions).filter(([_, perm]) => perm.canAccess);
    const totalActions = enabledModules.reduce((sum, [_, perm]) => sum + perm.actions.length, 0);
    const customPermissions = enabledModules.filter(([moduleName]) => {
      const module = modules?.find(m => m.name === moduleName);
      const rolePerm = rolePermissions?.find(p => p.module_id === module?.id);
      const userPerm = modulePermissions[moduleName];
      
      if (!rolePerm) return userPerm.canAccess;
      return userPerm.canAccess !== rolePerm.can_access || 
             JSON.stringify(userPerm.actions.sort()) !== JSON.stringify((rolePerm.allowed_actions || []).sort());
    });
    
    return { 
      modules: enabledModules.length, 
      actions: totalActions,
      customCount: customPermissions.length
    };
  };

  const summary = getPermissionSummary();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            <CardTitle>Permisos Personalizados por Usuario</CardTitle>
          </div>
          {summary && (
            <div className="flex gap-2 text-sm">
              <Badge variant="secondary">
                {summary.modules} módulos
              </Badge>
              <Badge variant="outline">
                {summary.actions} acciones
              </Badge>
              {summary.customCount > 0 && (
                <Badge variant="default">
                  {summary.customCount} personalizados
                </Badge>
              )}
            </div>
          )}
        </div>
        <CardDescription>
          Asigna permisos adicionales o diferentes a usuarios específicos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Seleccionar Usuario</Label>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger>
              <SelectValue placeholder="Elige un usuario..." />
            </SelectTrigger>
            <SelectContent>
              {users.map(user => (
                <SelectItem key={user.id} value={user.id}>
                  <div className="flex items-center gap-2">
                    <span>{user.full_name}</span>
                    <Badge variant="outline" className="text-xs">{user.role}</Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedUser && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Rol base:</strong> {selectedUser.role}<br />
              Solo se guardarán los permisos que difieran de los del rol base.
            </AlertDescription>
          </Alert>
        )}

        {selectedUserId && modules && (
          <>
            <Separator />
            
            <Accordion type="multiple" className="w-full space-y-2">
              {modules.map(module => {
                const rolePerm = rolePermissions?.find(p => p.module_id === module.id);
                const hasRoleAccess = rolePerm?.can_access || false;
                const userPerm = modulePermissions[module.name];
                const isCustomized = userPerm && rolePerm && (
                  userPerm.canAccess !== rolePerm.can_access ||
                  JSON.stringify(userPerm.actions.sort()) !== JSON.stringify((rolePerm.allowed_actions || []).sort())
                );
                
                return (
                  <AccordionItem key={module.id} value={module.id} className="border rounded-lg">
                    <ModulePermissionCard
                      module={module}
                      isAccessible={modulePermissions[module.name]?.canAccess || false}
                      allowedActions={modulePermissions[module.name]?.actions || []}
                      hasRoleAccess={hasRoleAccess}
                      isCustomized={isCustomized}
                      onAccessChange={(checked) => handleModuleAccessChange(module.name, checked)}
                      onActionChange={(actionId, checked) => handleActionChange(module.name, actionId, checked)}
                    />
                  </AccordionItem>
                );
              })}
            </Accordion>

            <Button onClick={handleSave} size="lg" className="w-full">
              <Save className="mr-2 h-4 w-4" />
              Guardar Permisos Personalizados
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
  hasRoleAccess: boolean;
  isCustomized?: boolean;
  onAccessChange: (checked: boolean) => void;
  onActionChange: (actionId: string, checked: boolean) => void;
}

function ModulePermissionCard({
  module,
  isAccessible,
  allowedActions,
  hasRoleAccess,
  isCustomized,
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
              {hasRoleAccess && !isCustomized && (
                <Badge variant="secondary" className="text-xs">
                  Del rol
                </Badge>
              )}
              {isCustomized && (
                <Badge variant="default" className="text-xs">
                  Personalizado
                </Badge>
              )}
            </div>
            {module.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{module.description}</p>
            )}
          </div>
          {isAccessible && actions && actions.length > 0 && (
            <Badge variant="outline" className="ml-auto mr-2">
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
                    id={`user-action-${action.id}`}
                    checked={allowedActions.includes(action.id)}
                    onCheckedChange={(checked) => onActionChange(action.id, checked as boolean)}
                  />
                  <div className="flex-1">
                    <Label 
                      htmlFor={`user-action-${action.id}`}
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
