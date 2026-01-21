import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Shield, 
  Search, 
  ChevronRight, 
  Check, 
  X,
  UserCircle,
  Users,
  Plus
} from 'lucide-react';
import { useSystemModules, useModuleActions } from '@/hooks/usePermissions';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQueryClient } from '@tanstack/react-query';
import { PermissionsSummary } from './PermissionsSummary';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface User {
  id: string;
  full_name: string;
  role: string;
}

interface Role {
  name: string;
  display_name: string;
  isSystem?: boolean;
}

const SYSTEM_ROLES: Role[] = [
  // superAdmin no se gestiona aquí: acceso total por defecto
  { name: 'admin', display_name: 'Administrador', isSystem: true },
  { name: 'supervisor', display_name: 'Supervisor', isSystem: true },
  { name: 'qualityAnalyst', display_name: 'Analista de Calidad', isSystem: true },
  { name: 'backOffice', display_name: 'Back Office', isSystem: true },
  { name: 'agent', display_name: 'Agente', isSystem: true }
];

export function PermissionsAssignment() {
  const [selectedTarget, setSelectedTarget] = useState<'role' | 'user' | null>(null);
  const [selectedId, setSelectedId] = useState<string>('');
  const [selectedName, setSelectedName] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [customRoles, setCustomRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Record<string, { canAccess: boolean; actions: string[] }>>({});
  const [summaryRefreshKey, setSummaryRefreshKey] = useState(0);
  
  const { data: modules } = useSystemModules();
  const queryClient = useQueryClient();

  // Cargar usuarios
  useEffect(() => {
    loadUsers();
    loadCustomRoles();
  }, []);

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .order('full_name');
    
    if (!error && data) {
      setUsers(data);
    }
  };

  const loadCustomRoles = async () => {
    const { data, error } = await supabase
      .from('custom_roles')
      .select('*')
      .order('display_name');
    
    if (!error && data) {
      setCustomRoles(data.map(r => ({ name: r.name, display_name: r.display_name })));
    }
  };

  const allRoles = [...SYSTEM_ROLES, ...customRoles];

  const filteredUsers = users.filter(u => 
    u.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRoles = allRoles.filter(r =>
    r.display_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectRole = async (role: Role) => {
    setSelectedTarget('role');
    setSelectedId(role.name);
    setSelectedName(role.display_name);
    
    console.log('Cargando permisos para rol:', role.name);
    
    const { data, error } = await supabase.rpc('get_permissions_for_role', { p_role: role.name });
    
    console.log('Permisos cargados (rpc):', data);
    
    if (!error && data) {
      const perms: Record<string, { canAccess: boolean; actions: string[] }> = {};
      data.forEach((row: any) => {
        perms[row.module_name] = {
          canAccess: row.can_access,
          actions: row.allowed_actions || []
        };
      });
      console.log('Permisos procesados:', perms);
      setPermissions(perms);
    } else if (error) {
      console.error('Error cargando permisos (rpc):', error);
      toast.error('Error al cargar permisos del rol');
      setPermissions({});
    }
  };

  const handleSelectUser = async (user: User) => {
    setSelectedTarget('user');
    setSelectedId(user.id);
    setSelectedName(user.full_name);
    
    console.log('Cargando permisos para usuario:', user.full_name, 'Rol:', user.role);
    
    // Cargar permisos del usuario
    const { data: userPerms, error: userError } = await supabase
      .from('user_permissions')
      .select('*, system_modules(*)')
      .eq('user_id', user.id);
    
    // Cargar permisos del rol del usuario
    const { data: rolePerms, error: roleError } = await supabase
      .from('role_permissions')
      .select('*, system_modules(*)')
      .eq('role', user.role);
    
    console.log('Permisos del rol:', rolePerms);
    console.log('Permisos personalizados:', userPerms);
    
    if (!userError && !roleError && modules) {
      const perms: Record<string, { canAccess: boolean; actions: string[] }> = {};
      
      // Primero cargar permisos del rol
      rolePerms?.forEach(perm => {
        const module = modules.find(m => m.id === perm.module_id);
        if (module) {
          perms[module.name] = {
            canAccess: perm.can_access,
            actions: perm.allowed_actions || []
          };
        }
      });
      
      // Sobrescribir con permisos personalizados del usuario
      userPerms?.forEach(perm => {
        const module = modules.find(m => m.id === perm.module_id);
        if (module) {
          perms[module.name] = {
            canAccess: perm.can_access,
            actions: perm.allowed_actions || []
          };
        }
      });
      
      console.log('Permisos finales procesados:', perms);
      setPermissions(perms);
    } else {
      if (userError) console.error('Error cargando permisos de usuario:', userError);
      if (roleError) console.error('Error cargando permisos de rol:', roleError);
      toast.error('Error al cargar permisos del usuario');
      setPermissions({});
    }
  };

  const handleSave = async () => {
    if (!selectedTarget || !selectedId) return;

    try {
      console.log('Guardando permisos:', { selectedTarget, selectedId, permissions });

      if (selectedTarget === 'role') {
        // Eliminar permisos existentes del rol
        const { error: deleteError } = await supabase
          .from('role_permissions')
          .delete()
          .eq('role', selectedId);

        if (deleteError) {
          console.error('Error eliminando permisos anteriores:', deleteError);
          throw deleteError;
        }

        // Preparar permisos a insertar
        const permissionsToInsert = modules
          ?.filter(module => permissions[module.name]?.canAccess)
          .map(module => ({
            role: selectedId,
            module_id: module.id,
            can_access: true,
            allowed_actions: permissions[module.name]?.actions || []
          })) || [];

        console.log('Permisos a insertar:', permissionsToInsert);

        if (permissionsToInsert.length > 0) {
          const { error } = await supabase
            .from('role_permissions')
            .insert(permissionsToInsert);

          if (error) {
            console.error('Error insertando permisos:', error);
            throw error;
          }
        }

        // Invalidar cache de permisos para todos los usuarios con este rol
        queryClient.invalidateQueries({ queryKey: ['effective-permissions'] });
        queryClient.invalidateQueries({ queryKey: ['check-permission'] });
        queryClient.invalidateQueries({ queryKey: ['role-permissions', selectedId] });
        
        // Refrescar resumen
        setSummaryRefreshKey(prev => prev + 1);
        
        toast.success('Permisos del rol guardados correctamente');
      } else {
        // Eliminar permisos personalizados anteriores
        const { error: deleteError } = await supabase
          .from('user_permissions')
          .delete()
          .eq('user_id', selectedId);

        if (deleteError) {
          console.error('Error eliminando permisos anteriores:', deleteError);
          throw deleteError;
        }

        // Preparar permisos a insertar
        const permissionsToInsert = modules
          ?.filter(module => permissions[module.name]?.canAccess)
          .map(module => ({
            user_id: selectedId,
            module_id: module.id,
            can_access: true,
            allowed_actions: permissions[module.name]?.actions || []
          })) || [];

        console.log('Permisos de usuario a insertar:', permissionsToInsert);

        if (permissionsToInsert.length > 0) {
          const { error } = await supabase
            .from('user_permissions')
            .insert(permissionsToInsert);

          if (error) {
            console.error('Error insertando permisos:', error);
            throw error;
          }
        }

        // Invalidar cache de permisos para este usuario
        queryClient.invalidateQueries({ queryKey: ['effective-permissions', selectedId] });
        queryClient.invalidateQueries({ queryKey: ['check-permission'] });
        queryClient.invalidateQueries({ queryKey: ['user-permissions', selectedId] });
        
        // Refrescar resumen
        setSummaryRefreshKey(prev => prev + 1);
        
        toast.success('Permisos del usuario guardados correctamente');
      }

      // Recargar permisos después de guardar
      if (selectedTarget === 'role') {
        const roleToReload = allRoles.find(r => r.name === selectedId);
        if (roleToReload) {
          await handleSelectRole(roleToReload);
        }
      } else {
        const userToReload = users.find(u => u.id === selectedId);
        if (userToReload) {
          await handleSelectUser(userToReload);
        }
      }
    } catch (error: any) {
      console.error('Error saving permissions:', error);
      toast.error('Error al guardar permisos: ' + error.message);
    }
  };

  const toggleModuleAccess = (moduleName: string) => {
    setPermissions(prev => ({
      ...prev,
      [moduleName]: {
        canAccess: !prev[moduleName]?.canAccess,
        actions: prev[moduleName]?.canAccess ? [] : (prev[moduleName]?.actions || [])
      }
    }));
  };

  const toggleAction = (moduleName: string, actionId: string) => {
    setPermissions(prev => {
      const current = prev[moduleName] || { canAccess: true, actions: [] };
      const actions = current.actions.includes(actionId)
        ? current.actions.filter(id => id !== actionId)
        : [...current.actions, actionId];
      
      return {
        ...prev,
        [moduleName]: {
          ...current,
          actions
        }
      };
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-12 gap-6">
        {/* Panel izquierdo - Lista de roles/usuarios */}
        <Card className="col-span-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Seleccionar Objetivo
          </CardTitle>
          <CardDescription>
            Elige un rol o usuario para gestionar permisos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>

          {/* Lista de Roles */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" />
                Roles ({allRoles.length})
              </Label>
              <CreateRoleDialog onRoleCreated={loadCustomRoles} />
            </div>
            <ScrollArea className="h-[200px] border rounded-lg">
              <div className="p-2 space-y-1">
                {filteredRoles.map(role => (
                  <Button
                    key={role.name}
                    variant={selectedTarget === 'role' && selectedId === role.name ? 'default' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => handleSelectRole(role)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>{role.display_name}</span>
                      {role.isSystem && (
                        <Badge variant="outline" className="text-xs">Sistema</Badge>
                      )}
                      <ChevronRight className="h-4 w-4 ml-auto" />
                    </div>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>

          <Separator />

          {/* Lista de Usuarios */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <UserCircle className="h-4 w-4" />
              Usuarios ({users.length})
            </Label>
            <ScrollArea className="h-[200px] border rounded-lg">
              <div className="p-2 space-y-1">
                {filteredUsers.map(user => (
                  <Button
                    key={user.id}
                    variant={selectedTarget === 'user' && selectedId === user.id ? 'default' : 'ghost'}
                    className="w-full justify-start text-left"
                    onClick={() => handleSelectUser(user)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{user.full_name}</span>
                        <span className="text-xs text-muted-foreground">{user.role}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 ml-auto shrink-0" />
                    </div>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>

      {/* Panel derecho - Permisos */}
      <Card className="col-span-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle>Permisos Asignados</CardTitle>
              <CardDescription>
                {selectedName ? `Configurando permisos para: ${selectedName}` : 'Selecciona un rol o usuario'}
              </CardDescription>
              {selectedTarget && modules && (
                <div className="flex gap-2 mt-2">
                  <Badge variant="secondary">
                    {Object.values(permissions).filter(p => p.canAccess).length} de {modules.length} módulos activos
                  </Badge>
                  <Badge variant="outline">
                    {selectedTarget === 'role' ? 'Permisos de Rol' : 'Permisos de Usuario'}
                  </Badge>
                </div>
              )}
            </div>
            {selectedTarget && (
              <Button onClick={handleSave}>
                Guardar Cambios
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!selectedTarget ? (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>Selecciona un rol o usuario de la lista para configurar sus permisos</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-4">
                {modules?.map(module => (
                  <ModulePermissionItem
                    key={module.id}
                    module={module}
                    isActive={permissions[module.name]?.canAccess || false}
                    selectedActions={permissions[module.name]?.actions || []}
                    onToggleModule={() => toggleModuleAccess(module.name)}
                    onToggleAction={(actionId) => toggleAction(module.name, actionId)}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>

    {/* Resumen de Permisos */}
    <PermissionsSummary key={summaryRefreshKey} />
  </div>
  );
}

interface ModulePermissionItemProps {
  module: any;
  isActive: boolean;
  selectedActions: string[];
  onToggleModule: () => void;
  onToggleAction: (actionId: string) => void;
}

function ModulePermissionItem({ module, isActive, selectedActions, onToggleModule, onToggleAction }: ModulePermissionItemProps) {
  const { data: actions } = useModuleActions(module.id);
  const [expanded, setExpanded] = useState(isActive);

  // Auto-expandir si tiene permisos activos
  useEffect(() => {
    if (isActive && selectedActions.length > 0) {
      setExpanded(true);
    }
  }, [isActive, selectedActions]);

  return (
    <Card className={isActive ? 'border-primary bg-primary/5' : 'border-muted'}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <Checkbox
              checked={isActive}
              onCheckedChange={onToggleModule}
            />
            <div className="flex-1">
              <h4 className="font-semibold flex items-center gap-2">
                {module.display_name}
                {isActive ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <X className="h-4 w-4 text-muted-foreground" />
                )}
              </h4>
              {module.description && (
                <p className="text-xs text-muted-foreground">{module.description}</p>
              )}
            </div>
          </div>
          {actions && actions.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              disabled={!isActive}
            >
              {isActive ? (
                <Badge variant="secondary" className="mr-2">
                  {selectedActions.length}/{actions.length} acciones
                </Badge>
              ) : (
                <Badge variant="outline" className="mr-2">
                  {actions.length} acciones disponibles
                </Badge>
              )}
              <ChevronRight className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
            </Button>
          )}
        </div>
      </CardHeader>
      
      {isActive && expanded && actions && actions.length > 0 && (
        <CardContent className="pt-0 border-t">
          <div className="grid grid-cols-2 gap-3 mt-3">
            {actions.map(action => (
              <div key={action.id} className="flex items-start gap-2 p-2 rounded-md border bg-card">
                <Checkbox
                  id={`action-${action.id}`}
                  checked={selectedActions.includes(action.id)}
                  onCheckedChange={() => onToggleAction(action.id)}
                />
                <div className="flex-1">
                  <Label htmlFor={`action-${action.id}`} className="text-sm font-medium cursor-pointer">
                    {action.display_name}
                  </Label>
                  {action.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function CreateRoleDialog({ onRoleCreated }: { onRoleCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [roleName, setRoleName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = async () => {
    if (!roleName.trim() || !displayName.trim()) {
      toast.error('Completa todos los campos requeridos');
      return;
    }

    const { error } = await supabase
      .from('custom_roles')
      .insert({
        name: roleName.toLowerCase().replace(/\s+/g, '_'),
        display_name: displayName,
        description: description || null
      });

    if (error) {
      toast.error('Error al crear rol: ' + error.message);
      return;
    }

    toast.success('Rol creado exitosamente');
    setOpen(false);
    setRoleName('');
    setDisplayName('');
    setDescription('');
    onRoleCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-3 w-3 mr-1" />
          Nuevo
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear Rol Personalizado</DialogTitle>
          <DialogDescription>
            Define un nuevo rol con permisos específicos
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Nombre del Rol *</Label>
            <Input
              id="displayName"
              placeholder="Ej: Supervisor de Calidad"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                setRoleName(e.target.value.toLowerCase().replace(/\s+/g, '_'));
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="roleName">Identificador *</Label>
            <Input
              id="roleName"
              placeholder="supervisor_calidad"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Input
              id="description"
              placeholder="Descripción del rol..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleCreate}>Crear Rol</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
