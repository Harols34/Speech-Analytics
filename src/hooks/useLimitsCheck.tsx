
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useAccount } from "@/context/AccountContext";
import { toast } from "sonner";

interface LimitCheckResult {
  limite_alcanzado: boolean;
  uso_actual: number;
  limite_total: number;
  porcentaje_uso: number;
  horas_adicionales: number;
}

export const useLimitsCheck = (tipo: "transcripcion" | "chat", subtipo?: "chat_llamada" | "chat_general") => {
  const { user } = useAuth();
  const { selectedAccountId } = useAccount();

  return useQuery({
    queryKey: ['limits-check', selectedAccountId, tipo, subtipo],
    queryFn: async (): Promise<LimitCheckResult | null> => {
      if (!selectedAccountId || !user) {
        console.log('useLimitsCheck: No selectedAccountId or user found');
        return null;
      }

      console.log(`useLimitsCheck: Checking ${tipo} limits for account ${selectedAccountId}, subtipo: ${subtipo}`);

      try {
        const { data, error } = await supabase.rpc('check_account_limits_v2', {
          p_account_id: selectedAccountId,
          p_tipo: tipo,
          p_subtipo: subtipo || null
        });

        if (error) {
          console.error(`useLimitsCheck: Error checking ${tipo} limits for account ${selectedAccountId}:`, error);
          throw error;
        }

        const result = data?.[0] || null;
        console.log(`useLimitsCheck: ${tipo} limits result for account ${selectedAccountId}:`, result);
        return result;
      } catch (error) {
        console.error(`useLimitsCheck: Failed to check ${tipo} limits for account ${selectedAccountId}:`, error);
        throw error;
      }
    },
    enabled: !!selectedAccountId && !!user,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refresh every minute
    retry: 3,
    retryDelay: 1000,
  });
};

export const checkLimitAndShowWarning = (limitData: LimitCheckResult | null, tipo: string) => {
  if (!limitData) return false;

  console.log('checkLimitAndShowWarning: Checking warning for:', { limitData, tipo });

  if (limitData.limite_alcanzado) {
    if (tipo === "transcripcion") {
      toast.error("Límite de transcripción alcanzado", {
        description: `Has alcanzado el límite mensual para cargar grabaciones de llamadas (${limitData.uso_actual}/${limitData.limite_total} horas). Intenta nuevamente el próximo mes.`,
        duration: 10000,
      });
    } else {
      toast.error("Límite de consultas alcanzado", {
        description: `Has alcanzado el límite mensual para interacciones con el chatbot (${limitData.uso_actual}/${limitData.limite_total} consultas). Intenta nuevamente el próximo mes.`,
        duration: 10000,
      });
    }
    return true;
  }

  // Warning at 90%
  if (limitData.porcentaje_uso >= 90) {
    const tipoText = tipo === "transcripcion" ? "transcripción de grabaciones" : "consultas al chatbot";
    toast.warning("Límite casi alcanzado", {
      description: `Has usado el ${limitData.porcentaje_uso.toFixed(1)}% de tu límite mensual de ${tipoText} (${limitData.uso_actual}/${limitData.limite_total}).`,
      duration: 8000,
    });
  }

  // Warning at 75%
  else if (limitData.porcentaje_uso >= 75) {
    const tipoText = tipo === "transcripcion" ? "transcripción de grabaciones" : "consultas al chatbot";
    toast.warning("Advertencia de límite", {
      description: `Has usado el ${limitData.porcentaje_uso.toFixed(1)}% de tu límite mensual de ${tipoText} (${limitData.uso_actual}/${limitData.limite_total}).`,
      duration: 5000,
    });
  }

  return false;
};

// Función ESPECÍFICA para verificar si una cuenta puede procesar más TRANSCRIPCIONES usando las nuevas funciones de BD
export const canProcessTranscription = async (accountId: string): Promise<boolean> => {
  if (!accountId) {
    console.error('canProcessTranscription: No accountId provided');
    return false;
  }

  try {
    console.log(`canProcessTranscription: Using new DB function for account ${accountId}`);
    
    const { data, error } = await supabase.rpc('can_transcribe_for_account', {
      p_account_id: accountId
    });

    if (error) {
      console.error('canProcessTranscription: Error checking transcription limits with new function:', error);
      return false;
    }

    console.log(`canProcessTranscription: Account ${accountId} can process transcription: ${data}`);
    return data;
  } catch (error) {
    console.error('canProcessTranscription: Failed to check transcription limits:', error);
    return false;
  }
};

// Función ESPECÍFICA para verificar si una cuenta puede hacer más CONSULTAS usando las nuevas funciones de BD
export const canProcessChat = async (accountId: string, subtipo?: "chat_llamada" | "chat_general"): Promise<boolean> => {
  if (!accountId) {
    console.error('canProcessChat: No accountId provided');
    return false;
  }

  try {
    console.log(`canProcessChat: Using new DB function for account ${accountId}, subtipo: ${subtipo}`);
    
    const { data, error } = await supabase.rpc('can_chat_for_account', {
      p_account_id: accountId,
      p_subtipo: subtipo || null
    });

    if (error) {
      console.error('canProcessChat: Error checking chat limits with new function:', error);
      return false;
    }

    console.log(`canProcessChat: Account ${accountId} can process chat: ${data}`);
    return data;
  } catch (error) {
    console.error('canProcessChat: Failed to check chat limits:', error);
    return false;
  }
};
