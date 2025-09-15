
import React, { useState, useEffect } from 'react';
import { useAccount } from '@/context/AccountContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Building2, Calendar, Users } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

const AccountList: React.FC = () => {
  const { allAccounts, loadAccounts, updateAccountStatus, isLoading } = useAccount();
  const [updatingAccount, setUpdatingAccount] = useState<string | null>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleStatusToggle = async (accountId: string, currentStatus: string) => {
    setUpdatingAccount(accountId);
    // Ensure we're casting to the correct union type
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    const success = await updateAccountStatus(accountId, newStatus as 'active' | 'inactive');
    if (success) {
      toast.success(`Cuenta ${newStatus === 'active' ? 'activada' : 'desactivada'} correctamente`);
    }
    
    setUpdatingAccount(null);
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
                  <TableHead>Acciones</TableHead>
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
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={account.status === 'active'}
                          onCheckedChange={() => handleStatusToggle(account.id, account.status)}
                          disabled={updatingAccount === account.id}
                        />
                        <span className="text-sm text-muted-foreground">
                          {updatingAccount === account.id ? 'Actualizando...' : 'Activa'}
                        </span>
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
  );
};

export default AccountList;
