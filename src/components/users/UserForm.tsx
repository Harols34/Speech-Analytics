
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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

export default function UserForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const isEditMode = Boolean(id);
  
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
    if (isEditMode && id) {
      fetchUserData();
    }
  }, [id, isEditMode]);

  const fetchUserData = async () => {
    if (!id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("Fetching user data for ID:", id);
      
      // Get profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
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
      
      if (usersData?.userData && usersData.userData[id]) {
        const userData = usersData.userData[id];
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

  const createUser = async (values: z.infer<typeof formSchema>) => {
    try {
      console.log("Creating user:", values);
      
      if (!values.password) {
        throw new Error("La contraseña es obligatoria para crear un nuevo usuario");
      }
      
      const { data, error: authError } = await supabase.functions.invoke('create-user', {
        body: {
          email: values.email,
          password: values.password,
          fullName: values.name,
          role: values.role,
          language: values.language || 'es'
        }
      });
      
      if (authError) {
        console.error("Error creating user:", authError);
        throw authError;
      }
      
      toast.success("Usuario creado exitosamente", {
        description: "El nuevo usuario ha sido creado y ahora puede iniciar sesión.",
        duration: 3000,
      });
      
      navigate('/users');
    } catch (error: any) {
      console.error("Error creating user:", error);
      
      let errorMessage = "Hubo un problema al crear el usuario. Por favor, inténtalo de nuevo.";
      
      if (error.message?.includes("duplicate key")) {
        errorMessage = "Este correo electrónico ya está registrado. Por favor, utiliza otro.";
      }
      
      toast.error("Error al crear usuario", {
        description: errorMessage,
        duration: 5000,
      });
    }
  };

  const updateUser = async (values: z.infer<typeof formSchema>) => {
    try {
      console.log("Updating user:", values);
      
      const { error: updateError } = await supabase.functions.invoke('updateUserPassword', {
        body: { 
          userId: id, 
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
      
      navigate('/users');
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
      if (isEditMode) {
        await updateUser(values);
      } else {
        await createUser(values);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={() => navigate('/users')} variant="outline">
          Volver a la lista
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>{isEditMode ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</CardTitle>
            <CardDescription>
              {isEditMode 
                ? 'Actualiza la información del usuario a continuación.' 
                : 'Completa los detalles para crear una nueva cuenta de usuario.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                      disabled={isEditMode}
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
                  <FormLabel>
                    {isEditMode ? 'Nueva Contraseña (dejar en blanco para mantener la actual)' : 'Contraseña'}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      placeholder={isEditMode ? '••••••••' : 'Crea una contraseña segura'}
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
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/users')}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Procesando...' : isEditMode ? 'Actualizar Usuario' : 'Crear Usuario'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
