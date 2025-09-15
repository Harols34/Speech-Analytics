
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/context/AuthContext";

const formSchema = z.object({
  email: z.string().email("Ingrese un correo electrónico válido").min(1, "El correo electrónico es requerido"),
  password: z.string().optional(),
  name: z.string().min(1, "El nombre es requerido"),
  role: z.string().min(1, "El rol es requerido"),
  language: z.string().default("es"),
});

interface UserEditModalProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UserEditModal({ userId, isOpen, onClose, onSuccess }: UserEditModalProps) {
  const { user: currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
      name: '',
      role: 'agent',
      language: 'es',
    },
  });

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserData();
    }
  }, [isOpen, userId]);

  const fetchUserData = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("Fetching user data for ID:", userId);
      
      // Get profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profileError) {
        console.log("Profile error:", profileError.message);
        throw new Error("Usuario no encontrado");
      }

      // Get user email from getAllUserEmails function
      const { data: usersData, error: usersError } = await supabase.functions.invoke('getAllUserEmails', {
        body: { timestamp: new Date().getTime() }
      });
      
      if (usersError) {
        console.error("Error fetching user data:", usersError);
        throw usersError;
      }
      
      if (usersData?.userData && usersData.userData[userId]) {
        const userData = usersData.userData[userId];
        console.log("User data obtained:", userData);
        
        form.reset({
          email: userData.email || '',
          password: '',
          name: profileData?.full_name || userData.email.split('@')[0],
          role: profileData?.role || 'agent',
          language: profileData?.language || 'es',
        });
      } else {
        throw new Error("No se encontraron datos del usuario");
      }
    } catch (error: any) {
      console.error("Error fetching user data:", error);
      setError(error.message || "Hubo un problema al cargar los datos del usuario.");
      toast.error("Error al cargar usuario", {
        description: error.message || "Hubo un problema al cargar los datos del usuario.",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = async (values: z.infer<typeof formSchema>) => {
    try {
      console.log("Updating user:", values);
      
      const { error: updateError } = await supabase.functions.invoke('updateUserPassword', {
        body: { 
          userId: userId, 
          password: values.password || null,
          userData: {
            name: values.name,
            role: values.role,
            language: values.language || 'es'
          }
        }
      });
      
      if (updateError) throw updateError;
      
      toast.success("Usuario actualizado exitosamente", {
        description: "La información del usuario ha sido actualizada.",
        duration: 3000,
      });
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error("Error al actualizar usuario", {
        description: "Hubo un problema al actualizar el usuario. Por favor, inténtalo de nuevo.",
        duration: 5000,
      });
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    
    try {
      await updateUser(values);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Usuario</DialogTitle>
        </DialogHeader>
        
        {error ? (
          <div className="p-4 text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={onClose} variant="outline">
              Cerrar
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo Electrónico</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        disabled={true}
                        placeholder="usuario@ejemplo.com"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nueva Contraseña (dejar en blanco para mantener la actual)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="••••••••"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre Completo</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Juan Pérez"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rol</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar rol" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {currentUser?.role === "superAdmin" && (
                          <SelectItem value="superAdmin">Super Administrador</SelectItem>
                        )}
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="qualityAnalyst">Analista de Calidad</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="agent">Agente</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="flex justify-between pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Actualizando...' : 'Actualizar Usuario'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
