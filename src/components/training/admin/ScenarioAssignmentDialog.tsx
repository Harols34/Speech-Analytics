import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Users, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TrainingScenario } from '@/lib/types/training';
import { useAccount } from '@/context/AccountContext';

interface User {
  id: string;
  full_name: string;
  role: string;
}

interface ScenarioAssignmentDialogProps {
  scenario: TrainingScenario | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign: (scenarioId: string, userIds: string[]) => void;
}

export function ScenarioAssignmentDialog({ 
  scenario, 
  open, 
  onOpenChange, 
  onAssign 
}: ScenarioAssignmentDialogProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const { selectedAccountId } = useAccount();

  const fetchUsers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!currentUserProfile) return;

      const currentRole = currentUserProfile.role;

      // Todos los roles excepto 'agent' pueden ver todos los usuarios de la cuenta
      const isElevatedRole = currentRole !== 'agent';

      // Si es rol elevado y hay cuenta seleccionada, usar RPC
      if (isElevatedRole && selectedAccountId && selectedAccountId !== 'all') {
        const { data, error } = await supabase
          .rpc('get_users_for_account', { p_account_id: selectedAccountId });
        
        if (error) throw error;
        setUsers(data || []);
      } else if (!isElevatedRole) {
        // Si es agent, solo mostrar al usuario mismo
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .eq('id', user.id)
          .single();
        
        if (error) throw error;
        setUsers(data ? [data] : []);
      } else {
        // SuperAdmin sin cuenta seleccionada ve todos
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .neq('role', 'superAdmin')
          .order('full_name');
        
        if (error) throw error;
        setUsers(data || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Error al cargar usuarios');
    }
  };

  useEffect(() => {
    if (open) {
      fetchUsers();
      setSelectedUsers([]);
      setSearchTerm('');
    }
  }, [open, selectedAccountId]);

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUserToggle = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(u => u.id));
    }
  };

  const handleAssign = async () => {
    if (!scenario || selectedUsers.length === 0) {
      toast.error('Selecciona al menos un usuario');
      return;
    }

    setLoading(true);
    try {
      await onAssign(scenario.id, selectedUsers);
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in the parent component
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role: string) => {
    const systemRoleLabels: Record<string, string> = {
      'superAdmin': 'Super Administrador',
      'admin': 'Administrador',
      'supervisor': 'Supervisor',
      'qualityAnalyst': 'Analista de Calidad',
      'backOffice': 'Back Office',
      'agent': 'Agente'
    };
    
    // If it's a system role, return the label
    if (systemRoleLabels[role]) {
      return systemRoleLabels[role];
    }
    
    // Otherwise, it's a custom role - show it with "(Personalizado)"
    return `${role} (Personalizado)`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Asignar Escenario: {scenario?.name}
          </DialogTitle>
          <DialogDescription>
            Selecciona uno o varios usuarios para asignar este escenario como obligatorio.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Buscar usuarios</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o rol..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label>Usuarios disponibles ({filteredUsers.length})</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
            >
              {selectedUsers.length === filteredUsers.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
            </Button>
          </div>

          <div className="max-h-80 overflow-y-auto border rounded-md">
            {filteredUsers.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mb-2" />
                <p>No se encontraron usuarios</p>
              </div>
            ) : (
              <div className="space-y-2 p-4">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="flex items-center space-x-3 p-2 hover:bg-muted rounded">
                    <Checkbox
                      id={user.id}
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={() => handleUserToggle(user.id)}
                    />
                    <div className="flex-1">
                      <Label htmlFor={user.id} className="font-normal cursor-pointer">
                        <div>
                          <p className="font-medium">{user.full_name || 'Sin nombre'}</p>
                          <p className="text-sm text-muted-foreground">
                            {getRoleLabel(user.role)}
                          </p>
                        </div>
                      </Label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {selectedUsers.length} usuario{selectedUsers.length !== 1 ? 's' : ''} seleccionado{selectedUsers.length !== 1 ? 's' : ''}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleAssign} 
                disabled={selectedUsers.length === 0 || loading}
              >
                {loading ? 'Asignando...' : 'Asignar Escenario'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}