
import React, { useEffect, useState } from "react";
import { Call, BehaviorAnalysis } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { validateBehaviorsAnalysis, triggerBehaviorAnalysis } from "./feedbackUtils";

interface FeedbackAnalysisManagerProps {
  call: Call;
  onFeedbackUpdate?: () => void;
  feedback: Call['feedback'];
  setLocalFeedback: (feedback: any) => void;
}

export function FeedbackAnalysisManager({ 
  call, 
  onFeedbackUpdate, 
  feedback, 
  setLocalFeedback 
}: FeedbackAnalysisManagerProps) {
  const [isLoadingBehaviors, setIsLoadingBehaviors] = useState(false);
  const [behaviors, setBehaviors] = useState<BehaviorAnalysis[]>([]);
  const [analysisAttempted, setAnalysisAttempted] = useState(false);
  const [hasActiveBehaviors, setHasActiveBehaviors] = useState(true);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Check if there are active behaviors on mount
  useEffect(() => {
    const checkActiveBehaviors = async () => {
      try {
        const { data, error } = await supabase
          .from('behaviors')
          .select('id')
          .eq('is_active', true)
          .limit(1);
        
        if (error) throw error;
        const hasBehaviors = data && data.length > 0;
        setHasActiveBehaviors(hasBehaviors);
        console.log("Active behaviors check:", hasBehaviors ? "Found" : "None found");
        
        // If no active behaviors, set an error
        if (!hasBehaviors) {
          setAnalysisError("No hay comportamientos activos para analizar. Agregue al menos un comportamiento activo.");
        }
      } catch (error) {
        console.error("Error checking active behaviors:", error);
        setHasActiveBehaviors(false);
        setAnalysisError("Error al verificar comportamientos activos.");
      }
    };
    
    checkActiveBehaviors();
  }, []);

  useEffect(() => {
    // Load behaviors analysis for the call when the component mounts
    if (call.id) {
      console.log("Initial load of behaviors analysis for call:", call.id);
      loadBehaviorsAnalysis();
    }
  }, [call.id]);

  // Auto-trigger feedback generation if needed
  useEffect(() => {
    const shouldGenerateFeedback = 
      !feedback && 
      call.id && 
      call.transcription && 
      !analysisAttempted &&
      hasActiveBehaviors &&
      !isGeneratingFeedback;
      
    if (shouldGenerateFeedback) {
      console.log("Auto-triggering feedback generation for call with transcription");
      const generateFeedback = async () => {
        setIsGeneratingFeedback(true);
        try {
          await triggerAnalysisFunction();
        } catch (error) {
          console.error("Error generating automatic feedback:", error);
        } finally {
          setIsGeneratingFeedback(false);
        }
      };
      
      generateFeedback();
    }
  }, [call.id, call.transcription, feedback, analysisAttempted, hasActiveBehaviors, isGeneratingFeedback]);

  const triggerAnalysisFunction = async () => {
    if (!call.id) return;
    
    // First check if we have active behaviors
    if (!hasActiveBehaviors) {
      toast.error("No hay comportamientos activos para analizar");
      setAnalysisError("No hay comportamientos activos definidos en el sistema. Agregue al menos un comportamiento activo para poder realizar el análisis.");
      return;
    }

    // Verify the call has transcription
    if (!call.transcription) {
      toast.error("La llamada no tiene transcripción para analizar");
      setAnalysisError("La llamada no tiene transcripción disponible. No se puede realizar el análisis de comportamientos.");
      return;
    }
    
    console.log("Triggering behavior analysis for call:", call.id, "with transcription length:", call.transcription.length);
    setIsLoadingBehaviors(true);
    setIsGeneratingFeedback(true);
    setAnalysisAttempted(true);
    setAnalysisError(null);
    
    try {
      // Show feedback to user
      toast.loading('Analizando comportamientos basados en la transcripción real...', {
        id: 'analysis-loading'
      });
      
      const newBehaviors = await triggerBehaviorAnalysis(call.id);
      
      if (newBehaviors && newBehaviors.length > 0) {
        console.log("Analysis generated successfully based on real transcription:", newBehaviors);
        setBehaviors(newBehaviors);
        
        // Fetch the updated feedback data from Supabase
        const { data: updatedFeedback, error: feedbackError } = await supabase
          .from('feedback')
          .select('*')
          .eq('call_id', call.id)
          .single();
          
        if (!feedbackError && updatedFeedback) {
          // Transform feedback data to match the expected format
          const formattedFeedback = {
            positive: updatedFeedback.positive || [],
            negative: updatedFeedback.negative || [],
            opportunities: updatedFeedback.opportunities || [],
            score: updatedFeedback.score || 0,
            // Fix: Ensure behaviors_analysis is an array before passing to validateBehaviorsAnalysis
            behaviors_analysis: validateBehaviorsAnalysis(
              Array.isArray(updatedFeedback.behaviors_analysis) 
                ? updatedFeedback.behaviors_analysis 
                : []
            ),
            call_id: updatedFeedback.call_id,
            id: updatedFeedback.id,
            created_at: updatedFeedback.created_at,
            updated_at: updatedFeedback.updated_at,
            sentiment: updatedFeedback.sentiment,
            topics: updatedFeedback.topics,
            entities: updatedFeedback.entities
          };
          
          // Update local state without page refresh
          setLocalFeedback(formattedFeedback);
          
          // Notify parent component
          if (onFeedbackUpdate) {
            onFeedbackUpdate();
          }
        }
        
        toast.success('Análisis generado correctamente basado en la transcripción', {
          id: 'analysis-loading'
        });
      } else {
        console.warn("No behaviors analysis returned");
        if (!analysisError) {
          setAnalysisError("No se pudieron analizar comportamientos. Verifica que haya comportamientos activos y que el Modelo_convert-IA esté configurado correctamente.");
        }
        toast.error('No se pudo generar el análisis', {
          id: 'analysis-loading',
          description: "No hay comportamientos activos para analizar"
        });
      }
    } catch (error) {
      console.error("Error calling analyze-call function:", error);
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      setAnalysisError(`Error: ${errorMessage}`);
      toast.error("Error al analizar la llamada", {
        id: 'analysis-loading',
        description: "Verifica que el Modelo_convert-IA esté configurado correctamente en el backend"
      });
    } finally {
      setIsLoadingBehaviors(false);
      setIsGeneratingFeedback(false);
    }
  };

  const loadBehaviorsAnalysis = async () => {
    if (!call.id) return;
    
    setIsLoadingBehaviors(true);
    try {
      console.log("Loading behaviors analysis for call:", call.id);
      
      // First check if there's existing feedback with behaviors_analysis
      let existingBehaviors: BehaviorAnalysis[] = [];
      
      if (feedback?.behaviors_analysis && Array.isArray(feedback.behaviors_analysis) && feedback.behaviors_analysis.length > 0) {
        console.log("Found existing behaviors analysis:", feedback.behaviors_analysis);
        
        // Ensure behaviors are properly validated
        existingBehaviors = validateBehaviorsAnalysis(feedback.behaviors_analysis);
        setBehaviors(existingBehaviors);
        console.log("Validated behaviors:", existingBehaviors);
        setIsLoadingBehaviors(false);
        return;
      }
      
      // If no existing analysis and we have a transcription but no attempted analysis yet,
      // generate one automatically if we have active behaviors
      if (!existingBehaviors.length && call.transcription && hasActiveBehaviors && !analysisAttempted) {
        console.log("No existing analysis, but have transcription. Auto-generating analysis based on real content.");
        await triggerAnalysisFunction();
      } else {
        console.log("No auto-generation: hasExisting:", existingBehaviors.length > 0, 
          "hasTranscription:", !!call.transcription, 
          "hasActiveBehaviors:", hasActiveBehaviors, 
          "analysisAttempted:", analysisAttempted);
        setIsLoadingBehaviors(false);
      }
    } catch (error) {
      console.error("Error loading behaviors analysis:", error);
      toast.error("Error al cargar análisis de comportamientos");
      setIsLoadingBehaviors(false);
    }
  };

  return {
    behaviors,
    isLoadingBehaviors,
    isGeneratingFeedback,
    triggerAnalysisFunction,
    analysisError,
    hasActiveBehaviors,
    loadBehaviorsAnalysis
  };
}
