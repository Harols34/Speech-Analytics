
import React from 'react';
import { useAccount } from '@/context/AccountContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Loader2 } from 'lucide-react';

const AccountFilter: React.FC = () => {
  const { userAccounts, selectedAccountId, setSelectedAccountId, isLoading } = useAccount();

  console.log("AccountFilter - Current state:", {
    userAccounts: userAccounts.length,
    selectedAccountId,
    isLoading
  });

  if (isLoading) {
    return (
      <Card className="mx-4 mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center">
            <Building2 className="h-4 w-4 mr-2" />
            Filtro de Cuenta
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-9 bg-gray-200 animate-pulse rounded flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (userAccounts.length === 0) {
    return (
      <Card className="mx-4 mb-4 border-amber-200 bg-amber-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center text-amber-700">
            <Building2 className="h-4 w-4 mr-2" />
            Estado de Cuenta
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-amber-600">
            Cargando cuentas disponibles...
          </p>
        </CardContent>
      </Card>
    );
  }

  // Determinar valor actual correctamente
  const currentValue = React.useMemo(() => {
    if (userAccounts.length === 1) {
      return userAccounts[0].id;
    }
    return selectedAccountId || 'all';
  }, [selectedAccountId, userAccounts]);

  const handleValueChange = (value: string) => {
    console.log("Changing account filter to:", value);
    setSelectedAccountId(value === 'all' ? null : value);
    
    // Show feedback to user
    const selectedAccount = userAccounts.find(acc => acc.id === value);
    if (selectedAccount) {
      console.log(`Filtrado por cuenta: ${selectedAccount.name}`);
    } else if (value === 'all') {
      console.log("Mostrando todas las cuentas");
    }
  };

  return (
    <Card className="mx-4 mb-4 border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center">
          <Building2 className="h-4 w-4 mr-2" />
          Filtro de Cuenta
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <Select
          value={currentValue}
          onValueChange={handleValueChange}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Seleccionar cuenta" />
          </SelectTrigger>
          <SelectContent>
            {userAccounts.length > 1 && (
              <SelectItem value="all">Todas las cuentas ({userAccounts.length})</SelectItem>
            )}
            {userAccounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${account.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
                  {account.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Enhanced status indicator */}
        <div className="mt-2 text-xs text-muted-foreground">
          {userAccounts.length === 1 
            ? (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>Cuenta única: {userAccounts[0].name}</span>
              </div>
            )
            : (
              <div className="flex items-center justify-between">
                <span>{userAccounts.length} cuentas disponibles</span>
                {selectedAccountId && selectedAccountId !== 'all' && (
                  <span className="text-primary font-medium">
                    Filtrando: {userAccounts.find(acc => acc.id === selectedAccountId)?.name}
                  </span>
                )}
              </div>
            )
          }
        </div>
      </CardContent>
    </Card>
  );
};

export default AccountFilter;
