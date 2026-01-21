import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useSystemModules } from '@/hooks/usePermissions';
import { Search, Users as UsersIcon, Shield, Check, X, RefreshCw } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface RolePermissionSummary {
  role: string;
  displayName: string;
  modules: { name: string; displayName: string; hasAccess: boolean }[];
}

interface UserPermissionSummary {
  userId: string;
  userName: string;
  role: string;
  modules: { name: string; displayName: string; hasAccess: boolean }[];
}

export function PermissionsSummary() {
  const [roleSearch, setRoleSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [rolesSummary, setRolesSummary] = useState<RolePermissionSummary[]>([]);
  const [usersSummary, setUsersSummary] = useState<UserPermissionSummary[]>([]);
  
  const { data: modules } = useSystemModules();

  useEffect(() => {
    loadRolesSummary();
    loadUsersSummary();
  }, [modules]);

  const refreshSummary = () => {
    loadRolesSummary();
    loadUsersSummary();
  };

  const loadRolesSummary = async () => {
    if (!modules) return;

    // Cargar roles del sistema
    const systemRoles = [
      { name: 'superAdmin', displayName: 'Super Administrador' },
      { name: 'admin', displayName: 'Administrador' },
      { name: 'supervisor', displayName: 'Supervisor' },
      { name: 'qualityAnalyst', displayName: 'Analista de Calidad' },
      { name: 'backOffice', displayName: 'Back Office' },
      { name: 'agent', displayName: 'Agente' }
    ];

    // Cargar roles personalizados
    const { data: customRoles } = await supabase
      .from('custom_roles')
      .select('name, display_name')
      .order('display_name');

    const allRoles = [
      ...systemRoles,
      ...(customRoles || []).map(r => ({ name: r.name, displayName: r.display_name }))
    ];

    // Cargar permisos de roles
    const { data: rolePermissions } = await supabase
      .from('role_permissions')
      .select('role, module_id, can_access');

    const summary: RolePermissionSummary[] = allRoles.map(role => {
      const modulesAccess = modules.map(module => {
        // superAdmin tiene acceso a todo
        if (role.name === 'superAdmin') {
          return {
            name: module.name,
            displayName: module.display_name,
            hasAccess: true
          };
        }

        const permission = rolePermissions?.find(
          p => p.role === role.name && p.module_id === module.id
        );

        return {
          name: module.name,
          displayName: module.display_name,
          hasAccess: permission?.can_access || false
        };
      });

      return {
        role: role.name,
        displayName: role.displayName,
        modules: modulesAccess
      };
    });

    setRolesSummary(summary);
  };

  const loadUsersSummary = async () => {
    if (!modules) return;

    // Cargar usuarios
    const { data: users } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .order('full_name');

    if (!users) return;

    // Cargar permisos de usuarios
    const { data: userPermissions } = await supabase
      .from('user_permissions')
      .select('user_id, module_id, can_access');

    // Cargar permisos de roles
    const { data: rolePermissions } = await supabase
      .from('role_permissions')
      .select('role, module_id, can_access');

    const summary: UserPermissionSummary[] = users.map(user => {
      const modulesAccess = modules.map(module => {
        // superAdmin tiene acceso a todo
        if (user.role === 'superAdmin') {
          return {
            name: module.name,
            displayName: module.display_name,
            hasAccess: true
          };
        }

        // Primero buscar override de usuario
        const userPerm = userPermissions?.find(
          p => p.user_id === user.id && p.module_id === module.id
        );

        if (userPerm) {
          return {
            name: module.name,
            displayName: module.display_name,
            hasAccess: userPerm.can_access
          };
        }

        // Si no hay override, usar permiso del rol
        const rolePerm = rolePermissions?.find(
          p => p.role === user.role && p.module_id === module.id
        );

        return {
          name: module.name,
          displayName: module.display_name,
          hasAccess: rolePerm?.can_access || false
        };
      });

      return {
        userId: user.id,
        userName: user.full_name,
        role: user.role,
        modules: modulesAccess
      };
    });

    setUsersSummary(summary);
  };

  const filteredRoles = useMemo(() => {
    return rolesSummary.filter(role =>
      role.displayName.toLowerCase().includes(roleSearch.toLowerCase())
    );
  }, [rolesSummary, roleSearch]);

  const filteredUsers = useMemo(() => {
    return usersSummary.filter(user =>
      user.userName.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.role.toLowerCase().includes(userSearch.toLowerCase())
    );
  }, [usersSummary, userSearch]);

  return (
    <div className="space-y-4">
      <Tabs defaultValue="roles" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Resumen por Roles
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <UsersIcon className="h-4 w-4" />
            Resumen por Usuarios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Resumen de Permisos por Rol</CardTitle>
                  <CardDescription>
                    Vista consolidada de todos los permisos asignados a cada rol
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={refreshSummary}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualizar
                </Button>
              </div>
              <div className="relative mt-4">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar rol..."
                  value={roleSearch}
                  onChange={(e) => setRoleSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Rol</TableHead>
                      <TableHead>Módulos con Acceso</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRoles.map((role) => {
                      const accessCount = role.modules.filter(m => m.hasAccess).length;
                      return (
                        <TableRow key={role.role}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span>{role.displayName}</span>
                              <span className="text-xs text-muted-foreground">{role.role}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {role.modules.map((module) => (
                                <Badge
                                  key={module.name}
                                  variant={module.hasAccess ? "default" : "outline"}
                                  className="text-xs"
                                >
                                  {module.hasAccess ? (
                                    <Check className="h-3 w-3 mr-1" />
                                  ) : (
                                    <X className="h-3 w-3 mr-1" />
                                  )}
                                  {module.displayName}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary">
                              {accessCount}/{role.modules.length}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Resumen de Permisos por Usuario</CardTitle>
                  <CardDescription>
                    Vista consolidada de todos los permisos asignados a cada usuario
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={refreshSummary}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualizar
                </Button>
              </div>
              <div className="relative mt-4">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar usuario..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[250px]">Usuario</TableHead>
                      <TableHead>Módulos con Acceso</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => {
                      const accessCount = user.modules.filter(m => m.hasAccess).length;
                      return (
                        <TableRow key={user.userId}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span>{user.userName}</span>
                              <Badge variant="outline" className="text-xs w-fit mt-1">
                                {user.role}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {user.modules.map((module) => (
                                <Badge
                                  key={module.name}
                                  variant={module.hasAccess ? "default" : "outline"}
                                  className="text-xs"
                                >
                                  {module.hasAccess ? (
                                    <Check className="h-3 w-3 mr-1" />
                                  ) : (
                                    <X className="h-3 w-3 mr-1" />
                                  )}
                                  {module.displayName}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary">
                              {accessCount}/{user.modules.length}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

