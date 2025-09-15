
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
import { Loader2, X, PlusCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useBehaviors, Behavior } from "@/hooks/useBehaviors";
import { toast } from "sonner";

const behaviorSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  description: z.string().min(1, "La descripción es obligatoria"),
  status: z.boolean().default(true),
  criteria: z.array(z.string()).default([]),
  prompt: z.string().min(1, "El prompt es obligatorio"),
});

type BehaviorFormValues = z.infer<typeof behaviorSchema>;

interface BehaviorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  behavior?: Behavior | null;
  onSuccess?: () => void;
}

export function BehaviorDialog({ open, onOpenChange, behavior, onSuccess }: BehaviorDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [criteria, setCriteria] = useState<string[]>([]);
  const [newCriterion, setNewCriterion] = useState("");
  const { createBehavior, updateBehavior } = useBehaviors();
  const isEditing = Boolean(behavior);
  
  const form = useForm<BehaviorFormValues>({
    resolver: zodResolver(behaviorSchema),
    defaultValues: {
      name: "",
      description: "",
      prompt: "",
      status: true,
      criteria: [],
    },
  });

  useEffect(() => {
    if (behavior) {
      form.reset({
        name: behavior.name,
        description: behavior.description || "",
        prompt: behavior.prompt || "",
        status: behavior.is_active,
        criteria: [],
      });
      
      try {
        const parsedPrompt = JSON.parse(behavior.prompt || "{}");
        setCriteria(parsedPrompt.criteria || []);
      } catch (e) {
        setCriteria([]);
      }
    } else {
      form.reset({
        name: "",
        description: "",
        prompt: "",
        status: true,
        criteria: [],
      });
      setCriteria([]);
    }
  }, [behavior, form]);

  const onSubmit = async (values: BehaviorFormValues) => {
    setIsSubmitting(true);
    
    try {
      const promptWithCriteria = JSON.stringify({
        description: values.description,
        criteria: criteria,
        instructions: values.prompt
      });

      const behaviorData = {
        name: values.name,
        description: values.description,
        prompt: promptWithCriteria,
        is_active: values.status
      };

      if (isEditing && behavior) {
        await updateBehavior(behavior.id, behaviorData);
        toast.success("Comportamiento actualizado correctamente");
      } else {
        await createBehavior(behaviorData);
        toast.success("Comportamiento creado correctamente");
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error saving behavior:", error);
      toast.error(isEditing 
        ? "Error al actualizar el comportamiento" 
        : "Error al crear el comportamiento"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const addCriterion = () => {
    if (!newCriterion.trim()) return;
    setCriteria([...criteria, newCriterion.trim()]);
    setNewCriterion("");
  };

  const removeCriterion = (index: number) => {
    const updatedCriteria = [...criteria];
    updatedCriteria.splice(index, 1);
    setCriteria(updatedCriteria);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Comportamiento" : "Nuevo Comportamiento"}
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
                    <Input 
                      placeholder="Ej. Empatía con el cliente" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Nombre descriptivo para identificar este comportamiento
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe cómo se evalúa este comportamiento" 
                      rows={3} 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Explica en detalle qué busca evaluar este comportamiento
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="prompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instrucciones para IA</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Instrucciones detalladas para que la IA evalúe este comportamiento" 
                      rows={3} 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Proporciona instrucciones detalladas sobre cómo la IA debe evaluar este comportamiento
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <FormLabel>Criterios de evaluación</FormLabel>
              
              <div className="flex gap-2">
                <Input
                  placeholder="Añadir nuevo criterio"
                  value={newCriterion}
                  onChange={(e) => setNewCriterion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCriterion();
                    }
                  }}
                />
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={addCriterion}
                >
                  <PlusCircle className="h-4 w-4 mr-1" /> Añadir
                </Button>
              </div>
              
              {criteria.length > 0 ? (
                <div className="flex flex-wrap gap-2 mt-2">
                  {criteria.map((item, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary"
                      className="px-3 py-1 text-sm flex items-center gap-1"
                    >
                      {item}
                      <button
                        type="button"
                        onClick={() => removeCriterion(index)}
                        className="text-muted-foreground hover:text-foreground ml-1 focus:outline-none"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No hay criterios definidos. Añade al menos uno para mejorar la evaluación.
                </p>
              )}
              
              <FormDescription>
                Define criterios específicos que la IA evaluará en las llamadas
              </FormDescription>
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2 space-y-0">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1">
                    <FormLabel>Activo</FormLabel>
                    <FormDescription>
                      Determina si este comportamiento debe ser evaluado en llamadas
                    </FormDescription>
                  </div>
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
                {isEditing ? 'Actualizar' : 'Crear'} Comportamiento
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
