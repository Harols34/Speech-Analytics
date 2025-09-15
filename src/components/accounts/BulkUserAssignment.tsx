
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { UserCheck, Users2, Building2 } from 'lucide-react';
import { useAccount } from '@/context/AccountContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface User {
  id: string;
  full_name: string;
  role: string;
}

const BulkUserAssignment: React.FC = () => {
  const { allAccounts, assignUserToAccount } = useAccount();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .order('full_name');

      if (error) throw error;
      setUsers(profiles || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Error al cargar usuarios');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleUserToggle = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const handleAccountToggle = (accountId: string, checked: boolean) => {
    if (checked) {
      setSelectedAccounts(prev => [...prev, accountId]);
    } else {
      setSelectedAccounts(prev => prev.filter(id => id !== accountId));
    }
  };

  const handleBulkAssignment = async () => {
    if (selectedUsers.length === 0 || selectedAccounts.length === 0) {
      toast.error('Selecciona al menos un usuario y una cuenta');
      return;
    }

    setIsLoading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const userId of selectedUsers) {
      for (const accountId of selectedAccounts) {
        const success = await assignUserToAccount(userId, accountId);
        if (success) {
          successCount++;
        } else {
          errorCount++;
        }
      }
    }

    setIsLoading(false);
    setSelectedUsers([]);
    setSelectedAccounts([]);

    if (successCount > 0) {
      toast.success(`${successCount} asignaciones creadas exitosamente`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} asignaciones fallaron`);
    }
  };

  const selectAllUsers = () => {
    setSelectedUsers(users.map(user => user.id));
  };

  const clearUserSelection = () => {
    setSelectedUsers([]);
  };

  const selectAllAccounts = () => {
    setSelectedAccounts(allAccounts.filter(account => account.status === 'active').map(account => account.id));
  };

  const clearAccountSelection = () => {
    setSelectedAccounts([]);
  };

  if (loadingUsers) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Cargando usuarios...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <UserCheck className="h-5 w-5 mr-2" />
          Asignación Múltiple
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Selección de usuarios */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center">
              <Users2 className="h-4 w-4 mr-2" />
              Usuarios ({selectedUsers.length} seleccionados)
            </Label>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAllUsers}>
                Todos
              </Button>
              <Button variant="outline" size="sm" onClick={clearUserSelection}>
                Ninguno
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3">
            {users.map((user) => (
              <div key={user.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`user-${user.id}`}
                  checked={selectedUsers.includes(user.id)}
                  onCheckedChange={(checked) => handleUserToggle(user.id, checked as boolean)}
                />
                <label 
                  htmlFor={`user-${user.id}`} 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                >
                  {user.full_name || 'Sin nombre'} ({user.role})
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Selección de cuentas */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center">
              <Building2 className="h-4 w-4 mr-2" />
              Cuentas ({selectedAccounts.length} seleccionadas)
            </Label>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAllAccounts}>
                Todas
              </Button>
              <Button variant="outline" size="sm" onClick={clearAccountSelection}>
                Ninguna
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-lg p-3">
            {allAccounts.filter(account => account.status === 'active').map((account) => (
              <div key={account.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`account-${account.id}`}
                  checked={selectedAccounts.includes(account.id)}
                  onCheckedChange={(checked) => handleAccountToggle(account.id, checked as boolean)}
                />
                <label 
                  htmlFor={`account-${account.id}`} 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                >
                  {account.name}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Botón de asignación */}
        <Button
          onClick={handleBulkAssignment}
          disabled={isLoading || selectedUsers.length === 0 || selectedAccounts.length === 0}
          className="w-full"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Asignando...
            </>
          ) : (
            <>
              <UserCheck className="h-4 w-4 mr-2" />
              Asignar {selectedUsers.length} usuarios a {selectedAccounts.length} cuentas
            </>
          )}
        </Button>

        {selectedUsers.length > 0 && selectedAccounts.length > 0 && (
          <div className="text-sm text-muted-foreground text-center">
            Se crearán {selectedUsers.length * selectedAccounts.length} asignaciones
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BulkUserAssignment;
