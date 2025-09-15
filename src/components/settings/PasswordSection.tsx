
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/hooks/useUser";

export default function PasswordSection() {
  const { user } = useUser();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleChangePassword = async () => {
    if (!user?.id) {
      toast.error("Debes iniciar sesión para cambiar la contraseña");
      return;
    }
    
    if (!newPassword || !confirmPassword) {
      toast.error("Por favor complete todos los campos");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    
    setIsChangingPassword(true);
    try {
      // Use the updateUserPassword edge function to change password
      const { error } = await supabase.functions.invoke('updateUserPassword', {
        body: { 
          userId: user?.id,
          password: newPassword 
        }
      });
      
      if (error) throw error;
      
      toast.success("Contraseña actualizada correctamente");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Error al cambiar la contraseña:", error);
      toast.error("Error al cambiar la contraseña", {
        description: error.message || "Intente nuevamente más tarde"
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cambiar Contraseña</CardTitle>
        <CardDescription>
          Actualiza tu contraseña de acceso
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">  
        <div className="space-y-2">
          <Label htmlFor="newPassword">Nueva contraseña</Label>
          <Input 
            id="newPassword"
            type="password" 
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
          <Input 
            id="confirmPassword" 
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        
        <Button 
          onClick={handleChangePassword}
          disabled={isChangingPassword || !newPassword || !confirmPassword}
        >
          {isChangingPassword ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Cambiando...
            </>
          ) : "Cambiar contraseña"}
        </Button>
      </CardContent>
    </Card>
  );
}
