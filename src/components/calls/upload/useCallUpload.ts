import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAccount } from "@/context/AccountContext";
import { useAuth } from "@/context/AuthContext";
import { useLimitsCheck, canProcessTranscription } from "@/hooks/useLimitsCheck";

export interface FileItem {
  file: File;
  progress: number;
  id: string;
  status?: "idle" | "uploading" | "uploaded" | "processing" | "success" | "error" | "duplicate";
  info?: string;
  error?: string;
  duration?: number;
}

interface UploadConfig {
  summaryPrompt?: string;
  feedbackPrompt?: string;
  selectedBehaviorIds?: string[];
}

// Función mejorada para obtener duración del audio
const getAudioDuration = (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);
    
    const cleanup = () => {
      URL.revokeObjectURL(url);
      audio.removeEventListener('loadedmetadata', onLoad);
      audio.removeEventListener('error', onError);
    };
    
    const onLoad = () => {
      cleanup();
      resolve(audio.duration || 0);
    };
    
    const onError = () => {
      cleanup();
      console.warn('Could not get audio duration, using default');
      resolve(0); // No fallar por esto
    };
    
    audio.addEventListener('loadedmetadata', onLoad);
    audio.addEventListener('error', onError);
    
    // Timeout para evitar cuelgues
    setTimeout(() => {
      cleanup();
      resolve(0);
    }, 10000);
    
    audio.preload = 'metadata';
    audio.src = url;
  });
};

// Función mejorada para sanitizar nombres de archivo
const sanitizeFileName = (fileName: string): string => {
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 200); // Limitar longitud
};

// Función mejorada para verificar duplicados - ahora retorna el archivo existente completo
const checkDuplicateCall = async (accountId: string, title: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('calls')
      .select('id, title, filename, duration, created_at')
      .eq('account_id', accountId)
      .eq('title', title)
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error checking duplicate call:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error in checkDuplicateCall:', error);
    return false;
  }
};

// Validación mejorada de archivos
const validateFile = (file: File): { isValid: boolean; error?: string } => {
  // Validar tamaño
  const maxSize = 25 * 1024 * 1024; // 25MB límite recomendado
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `Archivo demasiado grande (${Math.round(file.size / (1024 * 1024))}MB). Máximo permitido: 25MB`
    };
  }
  
  if (file.size < 1000) {
    return {
      isValid: false,
      error: `Archivo demasiado pequeño (${file.size} bytes). Mínimo: 1KB`
    };
  }
  
  // Validar tipos de archivo (ampliado)
  const allowedTypes = [
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/mp4',
    'audio/ogg', 'audio/webm', 'audio/flac', 'audio/aac', 'audio/wma'
  ];
  
  const allowedExtensions = [
    '.mp3', '.wav', '.m4a', '.mp4', '.ogg', '.webm', '.flac', '.aac', '.wma'
  ];
  
  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
  const isValidType = allowedTypes.includes(file.type) || allowedExtensions.includes(fileExtension);
  
  if (!isValidType) {
    return {
      isValid: false,
      error: `Formato no soportado. Formatos válidos: MP3, WAV, M4A, MP4, OGG, WEBM, FLAC, AAC, WMA`
    };
  }
  
  return { isValid: true };
};

export const useCallUpload = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { selectedAccountId } = useAccount();
  const { user } = useAuth();

  const { data: limitsData, refetch: refetchLimits } = useLimitsCheck("transcripcion");

  const addFiles = useCallback(async (newFiles: File[]) => {
    console.log(`📁 Processing ${newFiles.length} new files for upload`);
    const filesWithProgress: FileItem[] = [];
    
    // Procesar archivos en paralelo pero limitado para evitar sobrecarga
    const processFile = async (file: File): Promise<FileItem> => {
      const id = Math.random().toString(36).substr(2, 9);
      
      // Validar archivo
      const validation = validateFile(file);
      if (!validation.isValid) {
        return {
          file,
          progress: 0,
          id,
          status: "error" as const,
          error: validation.error,
          duration: 0
        };
      }

      // Crear título base limpio
      const baseTitle = sanitizeFileName(file.name.replace(/\.[^/.]+$/, ''));
      
      // Verificar si ya existe un archivo con este título
      const isDuplicate = await checkDuplicateCall(selectedAccountId!, baseTitle);
      
      if (isDuplicate) {
        console.log(`❌ Archivo duplicado detectado: ${baseTitle}`);
        return {
          file,
          progress: 0,
          id,
          status: "duplicate" as const,
          error: `Ya existe una grabación con el nombre "${baseTitle}". No se puede subir duplicados.`,
          duration: 0
        };
      }
      
      try {
        // Obtener duración con timeout
        const duration = await Promise.race([
          getAudioDuration(file),
          new Promise<number>((resolve) => setTimeout(() => resolve(0), 5000))
        ]);
        
        return {
          file,
          progress: 0,
          id,
          status: "idle" as const,
          duration: Math.round(duration)
        };
      } catch (error) {
        console.warn('Error getting audio duration for', file.name, ':', error);
        return {
          file,
          progress: 0,
          id,
          status: "idle" as const,
          duration: 0
        };
      }
    };
    
    // Procesar archivos en lotes de 10 para evitar sobrecarga
    const BATCH_SIZE = 10;
    for (let i = 0; i < newFiles.length; i += BATCH_SIZE) {
      const batch = newFiles.slice(i, i + BATCH_SIZE);
      const processedBatch = await Promise.all(batch.map(processFile));
      filesWithProgress.push(...processedBatch);
      
      // Pequeña pausa entre lotes
      if (i + BATCH_SIZE < newFiles.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    const duplicateCount = filesWithProgress.filter(f => f.status === 'duplicate').length;
    const validCount = filesWithProgress.filter(f => f.status !== 'error' && f.status !== 'duplicate').length;
    
    console.log(`✅ Procesados ${filesWithProgress.length} archivos: ${validCount} válidos, ${duplicateCount} duplicados, ${filesWithProgress.filter(f => f.status === 'error').length} con errores`);
    
    if (duplicateCount > 0) {
      toast.warning(`${duplicateCount} archivo(s) duplicado(s) detectado(s)`, {
        description: "No se pueden subir grabaciones que ya existen en la plataforma"
      });
    }
    
    setFiles((prev) => [...prev, ...filesWithProgress]);
  }, [selectedAccountId]);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  // Función optimizada para procesamiento EN PARALELO de 20 llamadas simultáneas
  const processCallsSequentially = async (callIds: string[], config: UploadConfig) => {
    console.log(`🔄 Iniciando procesamiento PARALELO de ${callIds.length} llamadas (20 simultáneas)`);
    
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };
    
    // Procesar en lotes de 20 en PARALELO
    const CONCURRENT_LIMIT = 20;
    const batches = [];
    for (let i = 0; i < callIds.length; i += CONCURRENT_LIMIT) {
      batches.push(callIds.slice(i, i + CONCURRENT_LIMIT));
    }

    console.log(`🚀 Procesando ${callIds.length} llamadas en ${batches.length} lotes de hasta ${CONCURRENT_LIMIT} en paralelo`);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const batchNumber = batchIndex + 1;
      const totalBatches = batches.length;
      
      console.log(`🔄 Procesando lote ${batchNumber}/${totalBatches} (${batch.length} llamadas en paralelo)`);
      
      // Procesar todas las llamadas del lote EN PARALELO usando Promise.allSettled
      const batchResults = await Promise.allSettled(
        batch.map(async (callId) => {
          try {
            const { error } = await supabase.functions.invoke('process-call', {
              body: {
                callId: callId,
                audioUrl: null,
                summaryPrompt: config.summaryPrompt,
                feedbackPrompt: config.feedbackPrompt,
                selectedBehaviorIds: config.selectedBehaviorIds
              }
            });
            
            if (error) {
              console.error(`❌ Error procesando llamada ${callId}:`, error);
              
              // Marcar como error en la base de datos
              await supabase
                .from('calls')
                .update({ 
                  status: 'error',
                  progress: 0,
                  updated_at: new Date().toISOString()
                })
                .eq('id', callId);
              
              throw error;
            }
            
            console.log(`✅ Llamada ${callId} enviada para procesamiento exitosamente`);
            return { success: true, callId };
            
          } catch (processError: any) {
            console.error(`❌ Error crítico procesando llamada ${callId}:`, processError);
            
            // Marcar como error en la base de datos
            try {
              await supabase
                .from('calls')
                .update({ 
                  status: 'error',
                  progress: 0,
                  updated_at: new Date().toISOString()
                })
                .eq('id', callId);
            } catch (updateError) {
              console.error(`Error actualizando estado de error para ${callId}:`, updateError);
            }
            
            return { success: false, callId, error: processError };
          }
        })
      );
      
      // Contar resultados del lote
      batchResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value.success) {
          results.successful++;
        } else {
          results.failed++;
          if (result.status === 'rejected') {
            results.errors.push(`unknown: ${result.reason?.message || 'Unknown error'}`);
          } else if (result.status === 'fulfilled' && !result.value.success) {
            results.errors.push(`${result.value.callId || 'unknown'}: ${result.value.error?.message || 'Unknown error'}`);
          }
        }
      });
      
      console.log(`✅ Lote ${batchNumber} completado: ${results.successful} exitosas, ${results.failed} fallidas`);
      
      // Pausa breve entre lotes (solo si hay más lotes)
      if (batchIndex < batches.length - 1) {
        console.log(`⏳ Pausa de 3s antes del siguiente lote...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    console.log(`🎉 Procesamiento secuencial completado: ${results.successful} exitosas, ${results.failed} fallidas`);
    
    // Mostrar resumen optimizado al usuario
    if (results.successful > 0) {
      toast.success(`Procesamiento completado: ${results.successful}/${callIds.length} llamadas procesadas exitosamente`, {
        description: "El análisis continuará en segundo plano de forma automática.",
        duration: 8000
      });
    }
    
    if (results.failed > 0) {
      toast.warning(`${results.failed} llamadas tuvieron errores durante el procesamiento`, {
        description: "Revisa los logs para más detalles. Puedes usar el auto-procesamiento para reintentar.",
        duration: 10000
      });
    }
    
    return results;
  };

  // Función optimizada para subida en lotes con mejor control
  const processBatch = async (batch: FileItem[], config: UploadConfig, batchNumber: number) => {
    console.log(`📦 Procesando lote de subida ${batchNumber} de ${batch.length} archivos`);
    
    const uploadedCalls: string[] = [];
    const batchResults = {
      uploaded: 0,
      failed: 0,
      skipped: 0
    };
    
    for (let i = 0; i < batch.length; i++) {
      const fileData = batch[i];
      const { file } = fileData;

      // Saltar archivos que ya tienen error o son duplicados
      if (fileData.status === "error" || fileData.status === "duplicate") {
        batchResults.skipped++;
        continue;
      }

      try {
        // Verificar límites antes de procesar cada archivo
        const stillCanProcess = await canProcessTranscription(selectedAccountId!);
        if (!stillCanProcess) {
          toast.error("Límite de transcripción alcanzado durante el proceso", {
            description: "Se alcanzó el límite mensual para cargar grabaciones de llamadas.",
            duration: 8000,
          });
          
          // Marcar archivos restantes como error
          setFiles(prev => prev.map(f => {
            if (batch.some(bf => bf.id === f.id)) {
              const currentIndex = batch.findIndex(bf => bf.id === f.id);
              if (currentIndex >= i) {
                return { 
                  ...f, 
                  status: "error" as const, 
                  error: "Límite de transcripción alcanzado" 
                };
              }
            }
            return f;
          }));
          
          break;
        }

        // Actualizar estado a subiendo
        setFiles(prev => prev.map(f => 
          f.id === fileData.id ? { ...f, status: "uploading" as const, progress: 10 } : f
        ));

        // Usar título original sin modificar (ya verificamos que no es duplicado)
        const callTitle = sanitizeFileName(file.name.replace(/\.[^/.]+$/, ''));

        setFiles(prev => prev.map(f => 
          f.id === fileData.id ? { ...f, progress: 25 } : f
        ));

        // Crear nombre de archivo con estructura optimizada
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'mp3';
        const fileName = `${selectedAccountId}/${timestamp}-${sanitizeFileName(file.name)}`;
        
        // Subir a Supabase Storage con reintentos
        let uploadData;
        let uploadAttempts = 0;
        const maxUploadAttempts = 3;
        
        while (uploadAttempts < maxUploadAttempts) {
          try {
            uploadAttempts++;
            const { data, error } = await supabase.storage
              .from('call-recordings')
              .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
              });
            
            if (error) throw error;
            uploadData = data;
            break;
          } catch (uploadError: any) {
            console.error(`Upload attempt ${uploadAttempts} failed:`, uploadError);
            
            if (uploadAttempts === maxUploadAttempts) {
              throw uploadError;
            }
            
            // Esperar antes del siguiente intento
            await new Promise(resolve => setTimeout(resolve, 1000 * uploadAttempts));
          }
        }

        setFiles(prev => prev.map(f => 
          f.id === fileData.id ? { ...f, progress: 50 } : f
        ));

        // Obtener URL pública
        const { data: urlData } = supabase.storage
          .from('call-recordings')
          .getPublicUrl(fileName);

        setFiles(prev => prev.map(f => 
          f.id === fileData.id ? { ...f, progress: 75 } : f
        ));

        // Crear registro en base de datos
        const callData = {
          title: callTitle,
          filename: sanitizeFileName(file.name),
          agent_name: user!.full_name || user!.email || 'Unknown',
          agent_id: user!.id,
          audio_url: urlData.publicUrl,
          account_id: selectedAccountId,
          status: 'pending',
          progress: 0,
          duration: fileData.duration || 0,
          date: new Date().toISOString(),
        };

        const { data: callRecord, error: dbError } = await supabase
          .from('calls')
          .insert(callData)
          .select()
          .single();

        if (dbError) {
          console.error('Database error:', dbError);
          throw dbError;
        }

        setFiles(prev => prev.map(f => 
          f.id === fileData.id ? { 
            ...f, 
            progress: 100, 
            status: "uploaded" as const,
            info: "Subido correctamente. Procesando en segundo plano..." 
          } : f
        ));

        uploadedCalls.push(callRecord.id);
        batchResults.uploaded++;

      } catch (error: any) {
        console.error('Error processing file:', error);
        batchResults.failed++;
        
        setFiles(prev => prev.map(f => 
          f.id === fileData.id ? { 
            ...f, 
            status: "error" as const,
            error: `Error: ${error.message}`
          } : f
        ));
      }
    }

    console.log(`📊 Lote ${batchNumber} completado: ${batchResults.uploaded} subidos, ${batchResults.failed} fallidos, ${batchResults.skipped} omitidos`);

    // Procesar llamadas subidas de forma OPTIMIZADA
    if (uploadedCalls.length > 0) {
      console.log(`🚀 Iniciando procesamiento OPTIMIZADO de ${uploadedCalls.length} llamadas del lote ${batchNumber}`);
      
      // Delay progresivo pero más corto entre lotes
      const batchDelay = Math.min(10000, 2000 * batchNumber); // Máximo 10 segundos
      setTimeout(async () => {
        await processCallsSequentially(uploadedCalls, config);
      }, batchDelay);
    }
    
    return batchResults;
  };

  const uploadFiles = useCallback(async (config: UploadConfig = {}) => {
    if (!selectedAccountId) {
      toast.error("Selecciona una cuenta antes de subir archivos");
      return;
    }

    if (!user) {
      toast.error("Debes estar autenticado para subir archivos");
      return;
    }

    if (files.length === 0) {
      toast.error("No hay archivos para subir");
      return;
    }

    // Verificar límites iniciales
    const canProcess = await canProcessTranscription(selectedAccountId);
    if (!canProcess) {
      toast.error("Límite de transcripción alcanzado", {
        description: "Has alcanzado el límite mensual para cargar grabaciones de llamadas.",
        duration: 8000,
      });
      return;
    }

    // Verificar archivos válidos (excluir duplicados y errores)
    const validFiles = files.filter(f => f.status !== "error" && f.status !== "duplicate");
    if (validFiles.length === 0) {
      toast.error("No hay archivos válidos para subir", {
        description: "Todos los archivos tienen errores o son duplicados"
      });
      return;
    }

    const duplicateFiles = files.filter(f => f.status === "duplicate");
    if (duplicateFiles.length > 0) {
      toast.warning(`${duplicateFiles.length} archivo(s) duplicado(s) omitido(s)`, {
        description: "No se subirán grabaciones que ya existen"
      });
    }

    setIsUploading(true);

    try {
      // Configuración OPTIMIZADA para cargas masivas - máximo 50 por lote
      const BATCH_SIZE = 50;
      const validFiles = files.filter(f => f.status !== "error" && f.status !== "duplicate");
      const batches: FileItem[][] = [];
      
      for (let i = 0; i < validFiles.length; i += BATCH_SIZE) {
        batches.push(validFiles.slice(i, i + BATCH_SIZE));
      }

      console.log(`📋 Procesando ${validFiles.length} archivos válidos en ${batches.length} lotes OPTIMIZADOS de máximo ${BATCH_SIZE} archivos`);

      // Mostrar información mejorada sobre el procesamiento
      toast.info(`Iniciando carga OPTIMIZADA de ${validFiles.length} archivos`, {
        description: `Procesamiento en ${batches.length} lotes de máximo 50 archivos. La transcripción y análisis se realizará automáticamente en segundo plano.`,
        duration: 12000,
      });

      const totalResults = {
        uploaded: 0,
        failed: 0,
        skipped: 0
      };

      // Procesar cada lote con control de velocidad OPTIMIZADO
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`🔄 Procesando lote de subida ${batchIndex + 1}/${batches.length}`);
        
        const batchResults = await processBatch(batch, config, batchIndex + 1);
        
        // Acumular resultados
        totalResults.uploaded += batchResults.uploaded;
        totalResults.failed += batchResults.failed;
        totalResults.skipped += batchResults.skipped;
        
        // Toast de progreso cada 3 lotes o al final
        if ((batchIndex + 1) % 3 === 0 || batchIndex === batches.length - 1) {
          toast.info(`Progreso: ${batchIndex + 1}/${batches.length} lotes procesados`, {
            description: `${totalResults.uploaded} subidos, ${totalResults.failed} fallidos, ${totalResults.skipped} omitidos`,
            duration: 5000
          });
        }
        
        // Pausa OPTIMIZADA entre lotes para evitar sobrecarga
        if (batchIndex < batches.length - 1) {
          const delay = Math.min(3000, 500 * (batchIndex + 1)); // Máximo 3 segundos
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      // Resumen final OPTIMIZADO
      if (totalResults.uploaded > 0) {
        toast.success(`Carga OPTIMIZADA completada: ${totalResults.uploaded} archivos subidos exitosamente`, {
          description: `Las transcripciones y análisis se procesarán automáticamente en lotes de máximo 50. Usa el panel de procesamiento para monitorear el progreso.`,
          duration: 15000,
        });
      }

      if (totalResults.failed > 0) {
        toast.warning(`${totalResults.failed} archivos tuvieron errores durante la subida`, {
          description: "Revisa los archivos marcados en rojo para más detalles."
        });
      }

      if (totalResults.skipped > 0) {
        toast.info(`${totalResults.skipped} archivos omitidos (duplicados o con errores)`);
      }
      
      await refetchLimits();
      
      // Limpiar archivos exitosos después de un tiempo más corto
      setTimeout(() => {
        setFiles(prev => prev.filter(f => f.status === "error" || f.status === "duplicate"));
      }, 10000);

    } catch (error: any) {
      console.error('Upload process failed:', error);
      toast.error("Error en el proceso de carga OPTIMIZADA", {
        description: error.message || "Error desconocido"
      });
    } finally {
      setIsUploading(false);
    }
  }, [files, selectedAccountId, user, refetchLimits]);

  return {
    files,
    isUploading,
    addFiles,
    removeFile,
    uploadFiles,
    limitsData
  };
};
