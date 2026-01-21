import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Upload, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useAccount } from "@/context/AccountContext";

export function BulkUserUpload({ onUsersCreated }: { onUsersCreated?: () => void }) {
  const { user } = useAuth();
  const { allAccounts } = useAccount();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [usersText, setUsersText] = useState("");
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);

  const canCreateUsers = user?.role === "superAdmin" || user?.role === "admin";

  if (!canCreateUsers) return null;

  const downloadTemplate = () => {
    const template = `email,password,fullName,role,language
juan.perez@ejemplo.com,123456,Juan Pérez,agent,es
maria.garcia@ejemplo.com,123456,María García,supervisor,es
carlos.lopez@ejemplo.com,123456,Carlos López,qualityAnalyst,es`;
    
    const blob = new Blob([template], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'plantilla_usuarios.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const parseUsersData = (text: string) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      throw new Error("El formato debe incluir al menos la cabecera y una línea de datos");
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const requiredHeaders = ['email', 'password', 'fullname', 'role', 'language'];
    
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      throw new Error(`Faltan las siguientes columnas: ${missingHeaders.join(', ')}`);
    }

    const users = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length !== headers.length) {
        throw new Error(`Línea ${i + 1}: número incorrecto de columnas`);
      }

      const user: any = {};
      headers.forEach((header, index) => {
        user[header] = values[index];
      });

      // Validaciones básicas
      if (!user.email || !user.password || !user.fullname) {
        throw new Error(`Línea ${i + 1}: email, password y fullName son obligatorios`);
      }

      if (!user.email.includes('@')) {
        throw new Error(`Línea ${i + 1}: formato de email inválido`);
      }

      if (user.password.length < 6) {
        throw new Error(`Línea ${i + 1}: la contraseña debe tener al menos 6 caracteres`);
      }

      const validRoles = ['agent', 'supervisor', 'qualityAnalyst', 'backOffice', 'admin'];
      if (user?.role === "superAdmin" && user.role !== "superAdmin") {
        validRoles.push('superAdmin');
      }

      if (!validRoles.includes(user.role)) {
        throw new Error(`Línea ${i + 1}: rol inválido. Roles válidos: ${validRoles.join(', ')}`);
      }

      users.push({
        email: user.email,
        password: user.password,
        fullName: user.fullname,
        role: user.role,
        language: user.language || 'es'
      });
    }

    return users;
  };

  const handleBulkUpload = async () => {
    if (!usersText.trim()) {
      toast.error("Por favor, ingresa los datos de los usuarios");
      return;
    }

    setLoading(true);

    try {
      const users = parseUsersData(usersText);
      
      // Get account names for the selected account IDs
      const accountNames = selectedAccounts.map(id => {
        const account = allAccounts.find(acc => acc.id === id);
        return account?.name || '';
      }).filter(name => name);

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const userData of users) {
        try {
          const { error } = await supabase.functions.invoke('create-user', {
            body: {
              ...userData,
              accountNames: accountNames.length > 0 ? accountNames : undefined,
            },
          });

          if (error) {
            throw error;
          }
          successCount++;
        } catch (error: any) {
          errorCount++;
          errors.push(`${userData.email}: ${error.message}`);
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} usuario(s) creado(s) exitosamente`, {
          description: selectedAccounts.length > 0 
            ? `Usuarios asignados a ${selectedAccounts.length} cuenta(s)`
            : undefined
        });
      }

      if (errorCount > 0) {
        toast.error(`${errorCount} usuario(s) no pudieron ser creados`, {
          description: errors.slice(0, 3).join('\n') + (errors.length > 3 ? '\n...' : ''),
          duration: 10000,
        });
      }

      if (successCount > 0) {
        setOpen(false);
        setUsersText("");
        setSelectedAccounts([]);
        if (onUsersCreated) onUsersCreated();
      }
    } catch (error: any) {
      console.error("Error parsing users data:", error);
      toast.error("Error en el formato de datos", {
        description: error.message,
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAccountToggle = (accountId: string, checked: boolean) => {
    setSelectedAccounts(prev => 
      checked 
        ? [...prev, accountId]
        : prev.filter(id => id !== accountId)
    );
  };

  const activeAccounts = allAccounts.filter(account => account.status === 'active');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Carga Masiva
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Carga Masiva de Usuarios</DialogTitle>
          <DialogDescription>
            Crea múltiples usuarios usando formato CSV. Descarga la plantilla para ver el formato correcto.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <Label htmlFor="users-data" className="text-base font-medium">
              Datos de Usuarios (formato CSV)
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={downloadTemplate}
            >
              <Download className="mr-2 h-4 w-4" />
              Descargar Plantilla
            </Button>
          </div>

          <Textarea
            id="users-data"
            placeholder="email,password,fullName,role,language
juan.perez@ejemplo.com,123456,Juan Pérez,agent,es
maria.garcia@ejemplo.com,123456,María García,supervisor,es"
            value={usersText}
            onChange={(e) => setUsersText(e.target.value)}
            rows={10}
            className="font-mono text-sm"
          />

          {activeAccounts.length > 0 && (
            <div className="space-y-3">
              <Label className="text-base font-medium">Asignar a Cuentas (Opcional)</Label>
              <div className="max-h-32 overflow-y-auto border rounded-md p-3 space-y-2">
                {activeAccounts.map((account) => (
                  <div key={account.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`bulk-account-${account.id}`}
                      checked={selectedAccounts.includes(account.id)}
                      onCheckedChange={(checked) => 
                        handleAccountToggle(account.id, checked as boolean)
                      }
                    />
                    <Label
                      htmlFor={`bulk-account-${account.id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {account.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-muted/50 p-4 rounded-md">
            <h4 className="font-medium mb-2">Formato requerido:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Primera línea debe contener las cabeceras: email,password,fullName,role,language</li>
              <li>• Email debe ser válido y único</li>
              <li>• Contraseña mínimo 6 caracteres</li>
              <li>• Roles válidos: agent, supervisor, qualityAnalyst, backOffice, admin{user?.role === "superAdmin" && ", superAdmin"}</li>
              <li>• Idiomas válidos: es, en</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex gap-4 pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleBulkUpload}
            disabled={loading || !usersText.trim()}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando Usuarios...
              </>
            ) : (
              "Crear Usuarios"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}