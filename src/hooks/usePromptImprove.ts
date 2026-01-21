
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PromptType } from "./usePrompts";

interface ImprovePromptParams {
  content: string;
  type: PromptType;
  name: string;
}

interface ImprovePromptResult {
  originalContent: string;
  improvedContent: string;
  success: boolean;
}

export function usePromptImprove() {
  const [isImproving, setIsImproving] = useState(false);

  const improvePrompt = async ({ content, type, name }: ImprovePromptParams): Promise<ImprovePromptResult | null> => {
    if (!content.trim()) {
      toast.error("El contenido no puede estar vacío");
      return null;
    }

    setIsImproving(true);
    
    try {
      console.log("Mejorando prompt con IA...");
      
      const { data, error } = await supabase.functions.invoke('improve-prompt', {
        body: {
          content: content.trim(),
          type,
          name
        }
      });

      if (error) {
        console.error("Error al mejorar prompt:", error);
        throw new Error(error.message || "Error al conectar con el servicio de IA");
      }

      if (!data?.success) {
        throw new Error(data?.error || "Error desconocido al mejorar el prompt");
      }

      console.log("Prompt mejorado exitosamente");
      
      return {
        originalContent: content,
        improvedContent: data.improvedContent,
        success: true
      };

    } catch (error) {
      console.error("Error mejorando prompt:", error);
      toast.error(`Error al mejorar el prompt: ${error.message}`);
      return null;
    } finally {
      setIsImproving(false);
    }
  };

  return {
    improvePrompt,
    isImproving
  };
}
