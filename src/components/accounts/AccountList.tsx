
import React, { useState, useEffect } from 'react';
import { useAccount } from '@/context/AccountContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Building2, Calendar, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const AccountList: React.FC = () => {
  const { allAccounts, loadAccounts, updateAccountStatus, isLoading } = useAccount();
  const [updatingAccount, setUpdatingAccount] = useState<string | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<string | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleStatusToggle = async (accountId: string, currentStatus: string) => {
    setUpdatingAccount(accountId);
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    const success = await updateAccountStatus(accountId, newStatus as 'active' | 'inactive');
    if (success) {
      toast.success(`Cuenta ${newStatus === 'active' ? 'activada' : 'desactivada'} correctamente`);
    }
    
    setUpdatingAccount(null);
  };

  const handleDeleteAccount = async () => {
    if (!accountToDelete) return;

    setDeletingAccount(accountToDelete.id);

    try {
      // First, delete related user_accounts
      const { error: userAccountsError } = await supabase
        .from('user_accounts')
        .delete()
        .eq('account_id', accountToDelete.id);

      if (userAccountsError) throw userAccountsError;

      // Then delete the account
      const { error: accountError } = await supabase
        .from('accounts')
        .delete()
        .eq('id', accountToDelete.id);

      if (accountError) throw accountError;

      toast.success('Cuenta eliminada correctamente');
      loadAccounts();
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast.error('Error al eliminar la cuenta', {
        description: error.message || 'No se pudo eliminar la cuenta'
      });
    } finally {
      setDeletingAccount(null);
      setAccountToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building2 className="h-5 w-5 mr-2" />
            Cuentas del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-200 animate-pulse rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building2 className="h-5 w-5 mr-2" />
            Cuentas del Sistema ({allAccounts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allAccounts.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No hay cuentas registradas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha de Creación</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allAccounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                          {account.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={account.status === 'active' ? 'default' : 'secondary'}>
                          {account.status === 'active' ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4 mr-1" />
                          {format(new Date(account.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Switch
                            checked={account.status === 'active'}
                            onCheckedChange={() => handleStatusToggle(account.id, account.status)}
                            disabled={updatingAccount === account.id}
                          />
                          <span className="text-sm text-muted-foreground">
                            {updatingAccount === account.id ? 'Actualizando...' : 'Activa'}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAccountToDelete({ id: account.id, name: account.name })}
                            disabled={deletingAccount === account.id}
                            className="ml-2"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!accountToDelete} onOpenChange={() => setAccountToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cuenta?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar la cuenta "{accountToDelete?.name}"? 
              Esta acción eliminará también todas las asignaciones de usuarios a esta cuenta y no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!!deletingAccount}
            >
              {deletingAccount ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AccountList;
