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
  horas_adicionales?: number;
}

// Hook para verificar límite de transcripción (subida de llamadas)
export const useTranscriptionLimit = () => {
  const { user } = useAuth();
  const { selectedAccountId } = useAccount();

  return useQuery({
    queryKey: ['transcription-limit', selectedAccountId],
    queryFn: async (): Promise<LimitCheckResult | null> => {
      if (!selectedAccountId || !user) return null;

      try {
        const { data, error } = await supabase.rpc('check_account_limits_v2', {
          p_account_id: selectedAccountId,
          p_tipo: 'transcripcion',
          p_subtipo: null
        });

        if (error) throw error;
        return data?.[0] || null;
      } catch (error) {
        console.error('Error checking transcription limit:', error);
        throw error;
      }
    },
    enabled: !!selectedAccountId && !!user,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    retry: 3,
  });
};

// Hook para verificar límite de minutos de entrenamiento voz
export const useVoiceTrainingLimit = () => {
  const { user } = useAuth();
  const { selectedAccountId } = useAccount();

  return useQuery({
    queryKey: ['voice-training-limit', selectedAccountId],
    queryFn: async (): Promise<LimitCheckResult | null> => {
      if (!selectedAccountId || !user) return null;

      try {
        const { data, error } = await (supabase as any).rpc('check_voice_training_limit', {
          p_account_id: selectedAccountId
        });

        if (error) throw error;
        return data?.[0] || null;
      } catch (error) {
        console.error('Error checking voice training limit:', error);
        throw error;
      }
    },
    enabled: !!selectedAccountId && !!user,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    retry: 3,
  });
};

// Hook para verificar límite de mensajes de chat IA
export const useChatTrainingLimit = () => {
  const { user } = useAuth();
  const { selectedAccountId } = useAccount();

  return useQuery({
    queryKey: ['chat-training-limit', selectedAccountId],
    queryFn: async (): Promise<LimitCheckResult | null> => {
      if (!selectedAccountId || !user) return null;

      try {
        const { data, error } = await (supabase as any).rpc('check_chat_training_limit', {
          p_account_id: selectedAccountId
        });

        if (error) throw error;
        return data?.[0] || null;
      } catch (error) {
        console.error('Error checking chat training limit:', error);
        throw error;
      }
    },
    enabled: !!selectedAccountId && !!user,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    retry: 3,
  });
};

// Hook para verificar límite de consultas chatbot
export const useChatConsultationLimit = () => {
  const { user } = useAuth();
  const { selectedAccountId } = useAccount();

  return useQuery({
    queryKey: ['chat-consultation-limit', selectedAccountId],
    queryFn: async (): Promise<LimitCheckResult | null> => {
      if (!selectedAccountId || !user) return null;

      try {
        const { data, error } = await supabase.rpc('check_account_limits_v2', {
          p_account_id: selectedAccountId,
          p_tipo: 'chat',
          p_subtipo: 'chat_general'
        });

        if (error) throw error;
        return data?.[0] || null;
      } catch (error) {
        console.error('Error checking chat consultation limit:', error);
        throw error;
      }
    },
    enabled: !!selectedAccountId && !!user,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    retry: 3,
  });
};

// Funciones de utilidad para mostrar mensajes de límite alcanzado
export const showTranscriptionLimitMessage = (limitData: LimitCheckResult | null) => {
  if (!limitData?.limite_alcanzado) return false;
  
  toast.error("Límite de transcripción alcanzado", {
    description: "Has alcanzado el límite mensual para cargar grabaciones de llamadas. Contacta al administrador para aumentar el límite.",
    duration: 10000,
  });
  return true;
};

export const showVoiceTrainingLimitMessage = (limitData: LimitCheckResult | null) => {
  if (!limitData?.limite_alcanzado) return false;
  
  toast.error("Límite de entrenamiento voz alcanzado", {
    description: "Has alcanzado el límite mensual para entrenamientos en modo voz. Contacta al administrador para aumentar el límite.",
    duration: 10000,
  });
  return true;
};

export const showChatTrainingLimitMessage = (limitData: LimitCheckResult | null) => {
  if (!limitData?.limite_alcanzado) return false;
  
  toast.error("Límite de mensajes de chat alcanzado", {
    description: "Has alcanzado el límite mensual para entrenamientos en modo chat. Contacta al administrador para aumentar el límite.",
    duration: 10000,
  });
  return true;
};

export const showChatConsultationLimitMessage = (limitData: LimitCheckResult | null) => {
  if (!limitData?.limite_alcanzado) return false;
  
  toast.error("Límite de consultas alcanzado", {
    description: "Has alcanzado el límite mensual para consultas en el módulo IA. Contacta al administrador para aumentar el límite.",
    duration: 10000,
  });
  return true;
};
