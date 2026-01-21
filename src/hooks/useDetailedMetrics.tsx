
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

interface DetailedMetrics {
  account_id: string;
  account_name: string;
  limite_horas: number;
  limite_consultas: number;
  limite_minutos_entrenamiento: number;
  limite_mensajes_chat: number;
  horas_adicionales: number;
  uso_transcripcion_mes: number;
  uso_consultas_mes: number;
  uso_chat_llamada_mes: number;
  uso_chat_general_mes: number;
  uso_minutos_entrenamiento_mes: number;
  uso_mensajes_chat_mes: number;
  tokens_totales_mes: number;
  costo_total_mes: number;
  total_grabaciones: number;
  porcentaje_transcripcion: number;
  porcentaje_consultas: number;
  porcentaje_entrenamiento: number;
  porcentaje_mensajes_chat: number;
}

export const useDetailedMetrics = (
  selectedAccount: string = "all",
  dateFrom: string,
  dateTo: string
) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['detailed-metrics', selectedAccount, dateFrom, dateTo],
    queryFn: async (): Promise<DetailedMetrics[]> => {
      if (!user) {
        console.log('No user authenticated');
        return [];
      }

      console.log('Fetching detailed metrics using SQL function for:', { selectedAccount, dateFrom, dateTo });

      try {
        // Usar la función SQL para obtener métricas reales
        const { data: metricsData, error: metricsError } = await supabase.rpc('get_account_detailed_metrics', {
          p_account_id: selectedAccount === "all" ? null : selectedAccount,
          p_date_from: dateFrom,
          p_date_to: dateTo
        });

        if (metricsError) {
          console.error('Error fetching metrics from SQL function:', metricsError);
          throw metricsError;
        }

        if (!metricsData || metricsData.length === 0) {
        console.log('No metrics data returned from SQL function');
          return [];
        }

        console.log(`Found ${metricsData.length} accounts with metrics data:`, metricsData);

        // Retornar directamente los datos de la función SQL
        const processedMetrics: DetailedMetrics[] = metricsData.map(metrics => ({
          account_id: metrics.account_id,
          account_name: metrics.account_name,
          limite_horas: metrics.limite_horas,
          limite_consultas: metrics.limite_consultas,
          limite_minutos_entrenamiento: metrics.limite_minutos_entrenamiento,
          limite_mensajes_chat: metrics.limite_mensajes_chat,
          horas_adicionales: metrics.horas_adicionales,
          uso_transcripcion_mes: metrics.uso_transcripcion_mes,
          uso_consultas_mes: metrics.uso_consultas_mes,
          uso_chat_llamada_mes: metrics.uso_chat_llamada_mes,
          uso_chat_general_mes: metrics.uso_chat_general_mes,
          uso_minutos_entrenamiento_mes: metrics.uso_minutos_entrenamiento_mes,
          uso_mensajes_chat_mes: metrics.uso_mensajes_chat_mes,
          tokens_totales_mes: metrics.tokens_totales_mes,
          costo_total_mes: metrics.costo_total_mes,
          total_grabaciones: metrics.total_grabaciones,
          porcentaje_transcripcion: metrics.porcentaje_transcripcion,
          porcentaje_consultas: metrics.porcentaje_consultas,
          porcentaje_entrenamiento: metrics.porcentaje_entrenamiento,
          porcentaje_mensajes_chat: metrics.porcentaje_mensajes_chat
        }));

        console.log('All processed metrics:', processedMetrics);
        return processedMetrics;
        
      } catch (error) {
        console.error('Error in detailed metrics query:', error);
        throw error;
      }
    },
    enabled: !!user,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // 1 minute
    retry: 3,
    retryDelay: 1000,
  });
};

// Hook para verificar límites en tiempo real usando la nueva función
export const useRealTimeLimits = (accountId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['real-time-limits', accountId],
    queryFn: async () => {
      if (!accountId || !user) return null;

      try {
        // Verificar límites de transcripción
        const { data: transcriptionLimits, error: transcriptionError } = await supabase.rpc('check_account_limits_v2', {
          p_account_id: accountId,
          p_tipo: 'transcripcion',
          p_subtipo: null
        });

        if (transcriptionError) {
          console.error('Error checking transcription limits:', transcriptionError);
          throw transcriptionError;
        }

        // Verificar límites de chat
        const { data: chatLimits, error: chatError } = await supabase.rpc('check_account_limits_v2', {
          p_account_id: accountId,
          p_tipo: 'chat',
          p_subtipo: null
        });

        if (chatError) {
          console.error('Error checking chat limits:', chatError);
          throw chatError;
        }

        return {
          transcription: transcriptionLimits?.[0] || null,
          chat: chatLimits?.[0] || null
        };
      } catch (error) {
        console.error('Error in real-time limits check:', error);
        throw error;
      }
    },
    enabled: !!user && !!accountId,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // 1 minute
    retry: 3,
    retryDelay: 1000,
  });
};
