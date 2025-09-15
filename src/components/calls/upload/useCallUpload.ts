
import { useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useAccount } from "@/context/AccountContext";

export interface FileItem {
  id: string;
  file: File;
  status: "idle" | "uploading" | "uploaded" | "processing" | "success" | "error";
  progress: number;
  error?: string;
  info?: string;
}

// Function to get audio duration
const getAudioDuration = (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);
    
    audio.addEventListener('loadedmetadata', () => {
      URL.revokeObjectURL(url);
      resolve(Math.round(audio.duration) || 0);
    });
    
    audio.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      resolve(0); // Return 0 if duration can't be determined
    });
    
    audio.src = url;
  });
};

// Function to sanitize file names for storage
const sanitizeFileName = (fileName: string): string => {
  const lastDotIndex = fileName.lastIndexOf('.');
  const name = lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;
  const extension = lastDotIndex > 0 ? fileName.substring(lastDotIndex) : '';
  
  const sanitizedName = name
    .replace(/[{}[\]()]/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  
  return sanitizedName + extension;
};

// Enhanced batch processing utility
const processBatch = async <T>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<void>,
  onProgress?: (completed: number, total: number) => void
): Promise<void> => {
  let completed = 0;
  const total = items.length;
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await processor(batch);
    completed += batch.length;
    onProgress?.(completed, total);
    
    if (batch.length === batchSize && i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
};

export function useCallUpload() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { user } = useAuth();
  const { selectedAccountId } = useAccount();

  const addFiles = useCallback((newFiles: File[]) => {
    const fileItems: FileItem[] = newFiles.map((file) => ({
      id: uuidv4(),
      file,
      status: "idle",
      progress: 0,
    }));
    
    setFiles((prev) => [...prev, ...fileItems]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== id));
  }, []);

  // Background analysis function
  const startBackgroundAnalysis = async (callId: string, audioUrl: string, config?: { 
    summaryPrompt?: string; 
    feedbackPrompt?: string;
    selectedBehaviorIds?: string[];
  }) => {
    try {
      console.log(`Starting background analysis for call ${callId}`);
      
      // Call the analysis function in background without awaiting
      supabase.functions.invoke('process-call', {
        body: {
          callId,
          audioUrl,
          summaryPrompt: config?.summaryPrompt,
          feedbackPrompt: config?.feedbackPrompt,
          selectedBehaviorIds: config?.selectedBehaviorIds || []
        }
      }).then(({ error: processError }) => {
        if (processError) {
          console.error(`Background analysis failed for call ${callId}:`, processError);
        } else {
          console.log(`Background analysis completed for call ${callId}`);
        }
      }).catch((error) => {
        console.error(`Background analysis error for call ${callId}:`, error);
      });
      
    } catch (error) {
      console.error(`Error starting background analysis for call ${callId}:`, error);
    }
  };

  const uploadFiles = useCallback(async (config?: { 
    summaryPrompt?: string; 
    feedbackPrompt?: string;
    selectedBehaviorIds?: string[];
  }) => {
    if (!user) {
      toast.error("Debes estar autenticado para subir archivos");
      return;
    }

    console.log("Current selectedAccountId:", selectedAccountId);

    if (!selectedAccountId || selectedAccountId === 'all') {
      toast.error("Debes seleccionar una cuenta específica antes de subir archivos");
      return;
    }

    setIsUploading(true);
    
    try {
      const filesToProcess = files.filter(f => f.status !== "success");
      const totalFiles = filesToProcess.length;
      
      if (totalFiles === 0) {
        toast.info("No hay archivos para procesar");
        return;
      }

      console.log(`Starting batch upload of ${totalFiles} files`);
      
      // Increase batch size for faster upload
      let UPLOAD_BATCH_SIZE = 20;
      if (totalFiles >= 100) {
        UPLOAD_BATCH_SIZE = 50;
        toast.info(`Procesando ${totalFiles} archivos en modo rápido`);
      }

      let uploadedCount = 0;
      const callsToAnalyze: Array<{callId: string, audioUrl: string}> = [];

      await processBatch(
        filesToProcess, 
        UPLOAD_BATCH_SIZE, 
        async (batch) => {
          // Process uploads concurrently
          const uploadPromises = batch.map(async (fileItem) => {
            try {
              setFiles(prev => prev.map(f => 
                f.id === fileItem.id 
                  ? { ...f, status: "uploading", progress: 20, info: "Subiendo archivo..." }
                  : f
              ));

              const sanitizedName = sanitizeFileName(fileItem.file.name);
              const fileName = `${Date.now()}-${sanitizedName}`;
              
              console.log('Uploading file:', sanitizedName);
              
              // Get audio duration
              const duration = await getAudioDuration(fileItem.file);
              console.log(`Audio duration for ${sanitizedName}: ${duration} seconds`);
              
              // Upload with retry logic
              let uploadAttempts = 0;
              let uploadData, uploadError;
              
              while (uploadAttempts < 2) { // Reduced retries for speed
                const result = await supabase.storage
                  .from('call-recordings')
                  .upload(`${selectedAccountId}/${fileName}`, fileItem.file);
                
                uploadData = result.data;
                uploadError = result.error;
                
                if (!uploadError) break;
                
                uploadAttempts++;
                if (uploadAttempts < 2) {
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
              }

              if (uploadError) {
                console.error('Storage upload error:', uploadError);
                throw new Error(`Error uploading file: ${uploadError.message}`);
              }

              setFiles(prev => prev.map(f => 
                f.id === fileItem.id 
                  ? { ...f, progress: 60, info: "Creando registro..." }
                  : f
              ));

              // Get public URL
              const { data: { publicUrl } } = supabase.storage
                .from('call-recordings')
                .getPublicUrl(`${selectedAccountId}/${fileName}`);

              console.log('Creating call record...');

              // Create call record with duration
              const { data: callData, error: callError } = await supabase
                .from('calls')
                .insert({
                  title: sanitizedName.replace(/\.[^/.]+$/, ""),
                  filename: sanitizedName,
                  agent_name: user.full_name || user.name || user.email || 'Usuario',
                  agent_id: user.id,
                  account_id: selectedAccountId,
                  audio_url: publicUrl,
                  status: 'pending',
                  progress: 0,
                  duration: duration // Save the calculated duration
                })
                .select()
                .single();

              if (callError) {
                console.error('Call record creation error:', callError);
                throw new Error(`Error creating call record: ${callError.message}`);
              }

              // Mark as uploaded and ready for background processing
              setFiles(prev => prev.map(f => 
                f.id === fileItem.id 
                  ? { ...f, status: "uploaded", progress: 100, info: "Subido - Análisis en segundo plano" }
                  : f
              ));

              // Add to background analysis queue
              callsToAnalyze.push({
                callId: callData.id,
                audioUrl: publicUrl
              });

              uploadedCount++;
              console.log(`File ${uploadedCount}/${totalFiles} uploaded successfully with duration ${duration}s`);

            } catch (error) {
              console.error(`Error uploading file ${fileItem.file.name}:`, error);
              setFiles(prev => prev.map(f => 
                f.id === fileItem.id 
                  ? { 
                      ...f, 
                      status: "error", 
                      error: error instanceof Error ? error.message : 'Error desconocido',
                      info: "Error en la subida"
                    }
                  : f
              ));
            }
          });

          await Promise.allSettled(uploadPromises);
        },
        (completed, total) => {
          if (total >= 50) {
            const percentage = Math.round((completed / total) * 100);
            toast.info(`Subida: ${completed}/${total} archivos (${percentage}%)`);
          }
        }
      );

      // Start background analysis for all uploaded calls
      if (callsToAnalyze.length > 0) {
        console.log(`Starting background analysis for ${callsToAnalyze.length} calls`);
        toast.success(`${uploadedCount} archivos subidos. Análisis iniciado en segundo plano.`);
        
        // Process analysis in smaller batches to avoid overwhelming the system
        const ANALYSIS_BATCH_SIZE = 5;
        let analysisIndex = 0;
        
        const processAnalysisBatch = async () => {
          const batch = callsToAnalyze.slice(analysisIndex, analysisIndex + ANALYSIS_BATCH_SIZE);
          if (batch.length === 0) return;
          
          // Start analysis for this batch
          batch.forEach(({ callId, audioUrl }) => {
            startBackgroundAnalysis(callId, audioUrl, config);
          });
          
          analysisIndex += ANALYSIS_BATCH_SIZE;
          
          // Schedule next batch after a small delay
          if (analysisIndex < callsToAnalyze.length) {
            setTimeout(processAnalysisBatch, 2000); // 2 second delay between batches
          }
        };
        
        // Start the analysis process
        processAnalysisBatch();
      }

      const errorCount = files.filter(f => f.status === "error").length;
      
      if (errorCount === 0) {
        toast.success(`${uploadedCount} archivos procesados exitosamente. Análisis en progreso.`);
      } else {
        toast.warning(`${uploadedCount} archivos subidos, ${errorCount} con errores. Análisis en progreso.`);
      }

    } catch (error) {
      console.error("Batch upload error:", error);
      toast.error(`Error en el procesamiento: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsUploading(false);
    }
  }, [files, user, selectedAccountId]);

  return {
    files,
    isUploading,
    addFiles,
    removeFile,
    uploadFiles
  };
}
