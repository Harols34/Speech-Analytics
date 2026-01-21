
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProcessingStats {
  pending: number;
  processing: number;
  completed: number;
  error: number;
  total: number;
}

interface CallProcessingHook {
  stats: ProcessingStats;
  isAutoProcessing: boolean;
  startAutoProcessing: () => void;
  stopAutoProcessing: () => void;
  processStuckCalls: () => Promise<void>;
  refreshStats: () => Promise<void>;
}

export function useCallProcessing(accountId: string | undefined): CallProcessingHook {
  const [stats, setStats] = useState<ProcessingStats>({
    pending: 0,
    processing: 0,
    completed: 0,
    error: 0,
    total: 0
  });
  const [isAutoProcessing, setIsAutoProcessing] = useState(false);
  const [processingInterval, setProcessingInterval] = useState<NodeJS.Timeout | null>(null);

  const refreshStats = useCallback(async () => {
    if (!accountId) return;

    try {
      const { data: calls, error } = await supabase
        .from('calls')
        .select('status')
        .eq('account_id', accountId);

      if (error) {
        console.error('Error fetching call stats:', error);
        return;
      }

      const statsData = calls?.reduce((acc, call) => {
        acc.total++;
        switch (call.status) {
          case 'pending':
          case 'transcribing':
          case 'analyzing':
            acc.pending++;
            break;
          case 'processing':
            acc.processing++;
            break;
          case 'complete':
            acc.completed++;
            break;
          case 'error':
            acc.error++;
            break;
          default:
            acc.pending++;
        }
        return acc;
      }, { pending: 0, processing: 0, completed: 0, error: 0, total: 0 });

      setStats(statsData || { pending: 0, processing: 0, completed: 0, error: 0, total: 0 });
    } catch (error) {
      console.error('Error in refreshStats:', error);
    }
  }, [accountId]);

  const processStuckCalls = useCallback(async () => {
    if (!accountId) return;

    try {
      console.log('🔄 Iniciando procesamiento de grabaciones pendientes...');
      
      // Obtener grabaciones en estado pendiente o procesando por más de 1 hora
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const { data: stuckCalls, error } = await supabase
        .from('calls')
        .select('id, status, updated_at, audio_url')
        .eq('account_id', accountId)
        .or(`status.eq.pending,status.eq.transcribing,status.eq.analyzing,and(status.eq.processing,updated_at.lt.${oneHourAgo.toISOString()})`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching stuck calls:', error);
        return;
      }

      if (!stuckCalls || stuckCalls.length === 0) {
        console.log('✅ No hay grabaciones pendientes de procesar');
        return;
      }

      console.log(`📊 Encontradas ${stuckCalls.length} grabaciones para procesar`);
      
      // Procesar en lotes de 20 en paralelo
      const CONCURRENT_LIMIT = 20; // Procesar 20 llamadas simultáneamente
      
      let processedCount = 0;
      let errorCount = 0;

      console.log(`🚀 Procesando ${stuckCalls.length} grabaciones en lotes de ${CONCURRENT_LIMIT}`);

      // Dividir en lotes para procesar en paralelo
      for (let i = 0; i < stuckCalls.length; i += CONCURRENT_LIMIT) {
        const batch = stuckCalls.slice(i, i + CONCURRENT_LIMIT);
        const batchNumber = Math.floor(i / CONCURRENT_LIMIT) + 1;
        const totalBatches = Math.ceil(stuckCalls.length / CONCURRENT_LIMIT);
        
        console.log(`🔄 Procesando lote ${batchNumber}/${totalBatches} (${batch.length} grabaciones en paralelo)`);

        // Procesar todas las llamadas del lote en paralelo usando Promise.allSettled
        const batchResults = await Promise.allSettled(
          batch.map(async (call) => {
            try {
              // Verificar que la grabación tenga audio_url
              if (!call.audio_url) {
                console.error(`❌ Grabación ${call.id} sin audio_url`);
                await supabase
                  .from('calls')
                  .update({ 
                    status: 'error',
                    progress: 0,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', call.id);
                throw new Error('Sin audio_url');
              }

              // Marcar como procesando
              await supabase
                .from('calls')
                .update({ 
                  status: 'processing',
                  progress: 5,
                  updated_at: new Date().toISOString()
                })
                .eq('id', call.id);

              // Llamar a la función de procesamiento
              const { error: processError } = await supabase.functions.invoke('process-call', {
                body: {
                  callId: call.id,
                  audioUrl: call.audio_url
                }
              });

              if (processError) {
                console.error(`❌ Error procesando grabación ${call.id}:`, processError);
                await supabase
                  .from('calls')
                  .update({ 
                    status: 'error',
                    progress: 0,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', call.id);
                throw processError;
              }

              console.log(`✅ Grabación ${call.id} enviada para procesamiento`);
              return { success: true, callId: call.id };

            } catch (error) {
              console.error(`❌ Error crítico procesando grabación ${call.id}:`, error);
              await supabase
                .from('calls')
                .update({ 
                  status: 'error',
                  progress: 0,
                  updated_at: new Date().toISOString()
                })
                .eq('id', call.id);
              return { success: false, callId: call.id, error };
            }
          })
        );

        // Contar resultados del lote
        batchResults.forEach(result => {
          if (result.status === 'fulfilled' && result.value.success) {
            processedCount++;
          } else {
            errorCount++;
          }
        });

        console.log(`✅ Lote ${batchNumber} completado: ${processedCount} exitosas, ${errorCount} errores`);

        // Pausa breve entre lotes (solo si hay más lotes)
        if (i + CONCURRENT_LIMIT < stuckCalls.length) {
          console.log(`⏳ Pausa de 3s antes del siguiente lote...`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }

      console.log(`🎉 Procesamiento completado: ${processedCount} enviadas, ${errorCount} errores`);
      
      if (processedCount > 0) {
        toast.success(`Procesamiento iniciado para ${processedCount} grabaciones pendientes`);
      }
      
      if (errorCount > 0) {
        toast.warning(`${errorCount} grabaciones tuvieron errores y se marcaron como fallidas`);
      }

      // Actualizar estadísticas
      await refreshStats();

    } catch (error) {
      console.error('Error en processStuckCalls:', error);
      toast.error('Error al procesar grabaciones pendientes');
    }
  }, [accountId, refreshStats]);

  const startAutoProcessing = useCallback(() => {
    if (processingInterval) return;

    setIsAutoProcessing(true);
    console.log('🚀 Iniciando procesamiento automático cada 5 minutos');
    
    // Ejecutar inmediatamente
    processStuckCalls();
    
    // Programar ejecución cada 5 minutos
    const interval = setInterval(() => {
      processStuckCalls();
    }, 5 * 60 * 1000); // 5 minutos

    setProcessingInterval(interval);
  }, [processStuckCalls, processingInterval]);

  const stopAutoProcessing = useCallback(() => {
    if (processingInterval) {
      clearInterval(processingInterval);
      setProcessingInterval(null);
    }
    setIsAutoProcessing(false);
    console.log('⏹️ Procesamiento automático detenido');
  }, [processingInterval]);

  // Limpiar el intervalo al desmontar el componente
  useEffect(() => {
    return () => {
      if (processingInterval) {
        clearInterval(processingInterval);
      }
    };
  }, [processingInterval]);

  // Actualizar estadísticas al montar y cada 30 segundos
  useEffect(() => {
    refreshStats();
    const statsInterval = setInterval(refreshStats, 30000);
    return () => clearInterval(statsInterval);
  }, [refreshStats]);

  return {
    stats,
    isAutoProcessing,
    startAutoProcessing,
    stopAutoProcessing,
    processStuckCalls,
    refreshStats
  };
}
