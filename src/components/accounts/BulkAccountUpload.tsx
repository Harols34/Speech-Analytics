
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Upload, Download, Plus } from 'lucide-react';
import { useAccount } from '@/context/AccountContext';
import { toast } from 'sonner';

const BulkAccountUpload: React.FC = () => {
  const [accountsText, setAccountsText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { createAccount } = useAccount();

  const handleBulkUpload = async () => {
    if (!accountsText.trim()) {
      toast.error('Ingresa los nombres de las cuentas');
      return;
    }

    const accounts = accountsText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (accounts.length === 0) {
      toast.error('No se encontraron cuentas válidas');
      return;
    }

    setIsLoading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const accountName of accounts) {
      const success = await createAccount(accountName);
      if (success) {
        successCount++;
      } else {
        errorCount++;
      }
    }

    setIsLoading(false);
    setAccountsText('');

    if (successCount > 0) {
      toast.success(`${successCount} cuentas creadas exitosamente`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} cuentas fallaron al crearse`);
    }
  };

  const downloadTemplate = () => {
    const template = `Claro Colombia
Tigo
Movistar
ETB
WOM`;
    
    const blob = new Blob([template], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla-cuentas.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Plantilla descargada');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Upload className="h-5 w-5 mr-2" />
          Carga Masiva de Cuentas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="accounts">Nombres de Cuentas (una por línea)</Label>
          <Textarea
            id="accounts"
            value={accountsText}
            onChange={(e) => setAccountsText(e.target.value)}
            placeholder="Claro Colombia&#10;Tigo&#10;Movistar&#10;ETB"
            rows={6}
            disabled={isLoading}
          />
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={handleBulkUpload}
            disabled={isLoading || !accountsText.trim()}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creando...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Crear Cuentas
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            onClick={downloadTemplate}
            disabled={isLoading}
          >
            <Download className="h-4 w-4 mr-2" />
            Plantilla
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BulkAccountUpload;
