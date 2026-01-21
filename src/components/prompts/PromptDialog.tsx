import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles } from "lucide-react";
import { usePrompts, Prompt, PromptType } from "@/hooks/usePrompts";
import { usePromptImprove } from "@/hooks/usePromptImprove";
import { PromptComparisonDialog } from "./PromptComparisonDialog";
import { toast } from "sonner";

const formSchema = z.object({
  name: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres" }),
  content: z.string().min(10, { message: "El contenido debe tener al menos 10 caracteres" }),
  type: z.enum(["summary", "feedback"], { message: "El tipo debe ser resumen o feedback" }),
  active: z.boolean().default(false),
});

type PromptFormValues = z.infer<typeof formSchema>;

interface PromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prompt?: Prompt | null;
  onSuccess?: () => void;
}

export function PromptDialog({ open, onOpenChange, prompt, onSuccess }: PromptDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonData, setComparisonData] = useState<{
    originalContent: string;
    improvedContent: string;
  } | null>(null);
  
  const { createPrompt, updatePrompt } = usePrompts();
  const { improvePrompt, isImproving } = usePromptImprove();
  const isEditing = Boolean(prompt);
  
  const form = useForm<PromptFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      content: "",
      type: "summary" as PromptType,
      active: false,
    },
  });

  useEffect(() => {
    if (prompt) {
      form.reset({
        name: prompt.name,
        content: prompt.content,
        type: prompt.type,
        active: prompt.active,
      });
    } else {
      form.reset({
        name: "",
        content: "",
        type: "summary" as PromptType,
        active: false,
      });
    }
  }, [prompt, form]);

  const handleImprovePrompt = async () => {
    const currentContent = form.getValues("content");
    const currentType = form.getValues("type");
    const currentName = form.getValues("name") || "Nuevo prompt";

    if (!currentContent.trim()) {
      toast.error("Primero escribe algo de contenido para mejorar");
      return;
    }

    const result = await improvePrompt({
      content: currentContent,
      type: currentType,
      name: currentName
    });

    if (result?.success) {
      setComparisonData({
        originalContent: result.originalContent,
        improvedContent: result.improvedContent
      });
      setShowComparison(true);
    }
  };

  const handleAcceptImprovement = () => {
    if (comparisonData) {
      form.setValue("content", comparisonData.improvedContent);
      toast.success("Prompt mejorado aplicado");
    }
    setShowComparison(false);
    setComparisonData(null);
  };

  const handleRejectImprovement = () => {
    setShowComparison(false);
    setComparisonData(null);
  };

  const onSubmit = async (values: PromptFormValues) => {
    setIsSubmitting(true);
    
    try {
      if (isEditing && prompt) {
        await updatePrompt(prompt.id, {
          name: values.name,
          content: values.content,
          type: values.type,
          active: values.active,
        });
        toast.success("Prompt actualizado correctamente");
      } else {
        await createPrompt({
          name: values.name,
          content: values.content,
          type: values.type,
          active: values.active,
        });
        toast.success("Prompt creado correctamente");
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error saving prompt:", error);
      toast.error(isEditing 
        ? "Error al actualizar el prompt" 
        : "Error al crear el prompt"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar Prompt" : "Nuevo Prompt"}
            </DialogTitle>
          </DialogHeader>
          
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
                    <div className="flex items-center justify-between">
                      <FormLabel>Contenido</FormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleImprovePrompt}
                        disabled={isImproving}
                        className="ml-2"
                      >
                        {isImproving ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Sparkles className="h-4 w-4 mr-2" />
                        )}
                        {isImproving ? "Mejorando..." : "Mejorar con IA"}
                      </Button>
                    </div>
                    <FormControl>
                      <Textarea
                        placeholder="Escribe el contenido del prompt..."
                        className="min-h-32 resize-y"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      El texto del prompt que se usará para generar respuestas. Usa el botón "Mejorar con IA" 
                      para optimizar automáticamente tu prompt con enfoques de ventas, comercial e insights estratégicos.
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

              <div className="flex gap-2 justify-end">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditing ? 'Actualizar' : 'Crear'} Prompt
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Comparación */}
      {comparisonData && (
        <PromptComparisonDialog
          open={showComparison}
          onOpenChange={setShowComparison}
          originalContent={comparisonData.originalContent}
          improvedContent={comparisonData.improvedContent}
          promptName={form.getValues("name") || "Nuevo prompt"}
          promptType={form.getValues("type")}
          onAccept={handleAcceptImprovement}
          onReject={handleRejectImprovement}
        />
      )}
    </>
  );
}
