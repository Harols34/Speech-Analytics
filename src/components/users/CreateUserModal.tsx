import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useAccount } from "@/context/AccountContext";
import { useCustomRoles } from "@/hooks/useCustomRoles";

export function CreateUserModal({ onUserCreated }: { onUserCreated?: () => void }) {
  const { user } = useAuth();
  const { allAccounts } = useAccount();
  const { allRoles, isLoading: rolesLoading } = useCustomRoles();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    role: "agent",
    language: "es",
  });

  const canCreateUsers = user?.role === "superAdmin" || user?.role === "admin";

  if (!canCreateUsers) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get account names for the selected account IDs
      const accountNames = selectedAccounts.map(id => {
        const account = allAccounts.find(acc => acc.id === id);
        return account?.name || '';
      }).filter(name => name);

      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          role: formData.role,
          language: formData.language,
          accountNames: accountNames.length > 0 ? accountNames : undefined,
        },
      });

      if (error) throw error;

      toast.success("Usuario creado exitosamente", {
        description: selectedAccounts.length > 0 
          ? `Usuario asignado a ${selectedAccounts.length} cuenta(s)`
          : "Usuario creado sin asignación de cuentas"
      });
      
      setOpen(false);
      setFormData({
        email: "",
        password: "",
        fullName: "",
        role: "agent",
        language: "es",
      });
      setSelectedAccounts([]);
      
      if (onUserCreated) onUserCreated();
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast.error(error.message || "Error al crear el usuario");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
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
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Crear Usuario
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Usuario</DialogTitle>
          <DialogDescription>
            Completa la información para crear un nuevo usuario y asignarle cuentas.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="usuario@ejemplo.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                placeholder="Mínimo 6 caracteres"
                minLength={6}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Nombre Completo *</Label>
            <Input
              id="fullName"
              value={formData.fullName}
              onChange={(e) => handleInputChange("fullName", e.target.value)}
              placeholder="Nombre completo del usuario"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role">Rol *</Label>
              <Select 
                value={formData.role} 
                onValueChange={(value) => handleInputChange("role", value)}
                disabled={rolesLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={rolesLoading ? "Cargando roles..." : "Seleccionar rol"} />
                </SelectTrigger>
                <SelectContent>
                  {allRoles.map((role) => {
                    // Solo mostrar superAdmin si el usuario actual es superAdmin
                    if (role.value === 'superAdmin' && user?.role !== 'superAdmin') {
                      return null;
                    }
                    
                    return (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                        {role.isCustom && " (Personalizado)"}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Idioma *</Label>
              <Select value={formData.language} onValueChange={(value) => handleInputChange("language", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar idioma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {activeAccounts.length > 0 && (
            <div className="space-y-3">
              <Label className="text-base font-medium">Asignar a Cuentas</Label>
              <div className="max-h-32 overflow-y-auto border rounded-md p-3 space-y-2">
                {activeAccounts.map((account) => (
                  <div key={account.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`account-${account.id}`}
                      checked={selectedAccounts.includes(account.id)}
                      onCheckedChange={(checked) => 
                        handleAccountToggle(account.id, checked as boolean)
                      }
                    />
                    <Label
                      htmlFor={`account-${account.id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {account.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

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
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? "Creando..." : "Crear Usuario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}