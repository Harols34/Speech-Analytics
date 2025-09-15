
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LoginFormProps {
  language?: string;
}

const loginSchema = z.object({
  email: z
    .string()
    .min(1, { message: "El correo es obligatorio" })
    .email({ message: "Ingresa un correo válido" }),
  password: z
    .string()
    .min(6, { message: "La contraseña debe tener al menos 6 caracteres" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginForm({ language = "es" }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      console.log("Attempting login for:", values.email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        console.error("Login error:", error);
        
        let errorMessage = "Error al iniciar sesión";
        
        if (error.message?.includes("Invalid login credentials")) {
          errorMessage = "Credenciales incorrectas. Verifica tu email y contraseña.";
        } else if (error.message?.includes("Email not confirmed")) {
          errorMessage = "Debes confirmar tu email antes de iniciar sesión";
        } else if (error.message?.includes("Too many requests")) {
          errorMessage = "Demasiados intentos. Intenta de nuevo más tarde";
        }
        
        toast.error(errorMessage);
        return;
      }

      if (data.session) {
        console.log("Login successful, session established");
        toast.success(language === "es" ? "Inicio de sesión exitoso" : "Login successful");
        
        // Navigate to analytics
        navigate('/analytics');
      }
    } catch (error: any) {
      console.error("Unexpected login error:", error);
      toast.error("Error inesperado. Intenta nuevamente");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {language === "es" ? "Correo Electrónico" : "Email"}
              </FormLabel>
              <FormControl>
                <Input
                  placeholder={
                    language === "es" ? "tu@correo.com" : "your@email.com"
                  }
                  type="email"
                  autoComplete="email"
                  disabled={isLoading}
                  {...field}
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
                {language === "es" ? "Contraseña" : "Password"}
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="••••••••"
                  type="password"
                  autoComplete="current-password"
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LogIn className="mr-2 h-4 w-4" />
          )}
          {language === "es" ? "Iniciar Sesión" : "Sign In"}
        </Button>
      </form>
    </Form>
  );
}
