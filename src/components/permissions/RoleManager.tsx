import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Shield, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Role {
  value: string;
  label: string;
  isCustom?: boolean;
}

const DEFAULT_ROLES: Role[] = [
  { value: 'superAdmin', label: 'Super Administrador' },
  { value: 'admin', label: 'Administrador' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'qualityAnalyst', label: 'Analista de Calidad' },
  { value: 'backOffice', label: 'Back Office' },
  { value: 'agent', label: 'Agente' }
];

export function RoleManager() {
  const [roles, setRoles] = useState<Role[]>(() => {
    const savedRoles = localStorage.getItem('customRoles');
    return savedRoles ? [...DEFAULT_ROLES, ...JSON.parse(savedRoles)] : DEFAULT_ROLES;
  });
  const [newRoleName, setNewRoleName] = useState('');

  const handleAddRole = () => {
    if (!newRoleName.trim()) {
      toast.error('Ingresa un nombre para el rol');
      return;
    }

    const roleValue = newRoleName.toLowerCase().replace(/\s+/g, '_');
    
    if (roles.some(r => r.value === roleValue)) {
      toast.error('Ya existe un rol con ese nombre');
      return;
    }

    const newRole: Role = {
      value: roleValue,
      label: newRoleName,
      isCustom: true
    };

    const updatedRoles = [...roles, newRole];
    setRoles(updatedRoles);
    
    const customRoles = updatedRoles.filter(r => r.isCustom);
    localStorage.setItem('customRoles', JSON.stringify(customRoles));
    
    setNewRoleName('');
    toast.success('Rol creado exitosamente');
  };

  const handleDeleteRole = (roleValue: string) => {
    const updatedRoles = roles.filter(r => r.value !== roleValue);
    setRoles(updatedRoles);
    
    const customRoles = updatedRoles.filter(r => r.isCustom);
    localStorage.setItem('customRoles', JSON.stringify(customRoles));
    
    toast.success('Rol eliminado exitosamente');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <CardTitle>Gestión de Roles</CardTitle>
        </div>
        <CardDescription>
          Crea y administra roles personalizados para tu organización
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <Label>Roles del Sistema</Label>
          <div className="flex flex-wrap gap-2">
            {roles.filter(r => !r.isCustom).map(role => (
              <Badge key={role.value} variant="secondary" className="text-sm py-1.5 px-3">
                {role.label}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <Label>Roles Personalizados</Label>
          <div className="flex flex-wrap gap-2">
            {roles.filter(r => r.isCustom).map(role => (
              <AlertDialog key={role.value}>
                <AlertDialogTrigger asChild>
                  <Badge 
                    variant="outline" 
                    className="text-sm py-1.5 px-3 cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  >
                    {role.label}
                    <Trash2 className="ml-2 h-3 w-3" />
                  </Badge>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar rol?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción eliminará el rol "{role.label}" y todos sus permisos asociados.
                      Los usuarios con este rol perderán sus permisos.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDeleteRole(role.value)}>
                      Eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ))}
            {roles.filter(r => r.isCustom).length === 0 && (
              <p className="text-sm text-muted-foreground">No hay roles personalizados</p>
            )}
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t">
          <Label>Crear Nuevo Rol</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Nombre del rol (ej: Supervisor de Calidad)"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddRole()}
            />
            <Button onClick={handleAddRole}>
              <Plus className="h-4 w-4 mr-2" />
              Crear
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
