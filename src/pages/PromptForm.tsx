import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Layout from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { PromptType } from "@/hooks/usePrompts";

// Define el esquema de validación con Zod
const formSchema = z.object({
  name: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres" }),
  content: z.string().min(10, { message: "El contenido debe tener al menos 10 caracteres" }),
  type: z.enum(["summary", "feedback"], { message: "El tipo debe ser resumen o feedback" }),
  active: z.boolean().default(false),
});

export default function PromptForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();
  const isEditMode = Boolean(id);

  // Initialize the form with default values
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      content: "",
      type: "summary" as PromptType,
      active: false,
    },
  });

  useEffect(() => {
    const checkAuth = async () => {
      if (!isAuthenticated && !loading) {
        toast.error("Sesión expirada", {
          description: "Por favor inicia sesión para continuar"
        });
        navigate("/login", { replace: true });
        return false;
      }
      return true;
    };

    const timer = setTimeout(() => {
      checkAuth();
    }, 500);

    return () => clearTimeout(timer);
  }, [isAuthenticated, loading, navigate]);

  // Fetch prompt data if in edit mode
  useEffect(() => {
    const fetchPrompt = async () => {
      if (isEditMode) {
        setIsLoading(true);
        try {
          const { data, error } = await supabase
            .from("prompts")
            .select("*")
            .eq("id", id)
            .single();

          if (error) throw error;
          
          if (data) {
            // Actualiza los valores del formulario
            form.reset({
              name: data.name,
              content: data.content,
              type: data.type as PromptType,
              active: data.active,
            });
          }
        } catch (error) {
          console.error("Error al cargar el prompt:", error);
          toast.error("Error al cargar el prompt");
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchPrompt();
  }, [id, isEditMode, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      let response;
      
      if (isEditMode) {
        // Si estamos editando un prompt existente
        response = await supabase
          .from("prompts")
          .update({
            name: values.name,
            content: values.content,
            type: values.type,
            active: values.active,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);
      } else {
        // Si estamos creando un nuevo prompt
        response = await supabase
          .from("prompts")
          .insert({
            name: values.name,
            content: values.content,
            type: values.type,
            active: values.active,
          });
      }

      if (response.error) throw response.error;

      toast.success(isEditMode ? "Prompt actualizado" : "Prompt creado", {
        description: isEditMode ? "El prompt se actualizó correctamente" : "El prompt se creó correctamente",
      });

      navigate("/prompts");
    } catch (error) {
      console.error("Error al guardar el prompt:", error);
      toast.error("Error al guardar el prompt");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-start gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/prompts")}
            className="mt-1"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              {isEditMode ? "Editar Prompt" : "Nuevo Prompt"}
            </h2>
            <p className="text-muted-foreground">
              {isEditMode
                ? "Actualiza los detalles del prompt"
                : "Crea un nuevo prompt para análisis y resúmenes de llamadas"}
            </p>
          </div>
        </div>

        <Card className="max-w-3xl mx-auto">
          <CardContent className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre del prompt" {...field} />
                      </FormControl>
                      <FormDescription>
                        Nombre descriptivo para identificar el prompt.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona el tipo de prompt" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="summary">Resumen</SelectItem>
                          <SelectItem value="feedback">Feedback</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Selecciona si este prompt es para generar resúmenes o feedback.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contenido</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Escribe el contenido del prompt..."
                          className="min-h-32 resize-y"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        El texto del prompt que se usará para generar respuestas.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Activo</FormLabel>
                        <FormDescription>
                          Determina si este prompt está disponible para ser utilizado.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/prompts")}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Guardando...
                      </>
                    ) : isEditMode ? (
                      "Actualizar"
                    ) : (
                      "Crear"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
