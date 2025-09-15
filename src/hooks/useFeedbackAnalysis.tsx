
import { useState, useEffect, useCallback } from "react";
import { Call, BehaviorAnalysis, Feedback } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UseFeedbackAnalysisProps {
  call: Call;
  feedback?: Feedback;
  setLocalFeedback?: React.Dispatch<React.SetStateAction<Feedback | undefined>>;
}

// Helper function to validate and convert Json to BehaviorAnalysis
const validateBehaviorsAnalysis = (data: any): BehaviorAnalysis[] => {
  if (!Array.isArray(data)) {
    console.error("Expected an array for behaviors_analysis, got:", typeof data);
    return [];
  }
  
  return data.filter(item => {
    const isValid = item && 
      typeof item === 'object' && 
      typeof item.name === 'string' && 
      (item.evaluation === 'cumple' || item.evaluation === 'no cumple') &&
      typeof item.comments === 'string';
      
    if (!isValid) {
      console.error("Invalid behavior item:", item);
    }
    return isValid;
  }).map(item => ({
    name: item.name,
    evaluation: item.evaluation as "cumple" | "no cumple",
    comments: item.comments
  }));
};

export const useFeedbackAnalysis = ({
  call,
  feedback,
  setLocalFeedback
}: UseFeedbackAnalysisProps) => {
  const [behaviors, setBehaviors] = useState<BehaviorAnalysis[]>([]);
  const [isLoadingBehaviors, setIsLoadingBehaviors] = useState(false);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("summary");
  const [hasActiveBehaviors, setHasActiveBehaviors] = useState(false);
  const [behaviorAnalysisExists, setBehaviorAnalysisExists] = useState(false);
  
  // Check if there are active behaviors on mount
  useEffect(() => {
    const checkActiveBehaviors = async () => {
      try {
        let query = supabase
          .from('behaviors')
          .select('id')
          .eq('is_active', true);

        if (call.account_id) {
          query = query.or(`account_id.eq.${call.account_id},account_id.is.null`);
        }

        const { data, error } = await query.limit(1);
        
        if (error) {
          console.error("Error checking active behaviors:", error);
          throw error;
        }
        
        const hasBehaviors = data && data.length > 0;
        setHasActiveBehaviors(hasBehaviors);
        console.log("Active behaviors check result:", hasBehaviors);
        
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
  }, [call.account_id]);
  
  // Load existing behavior analysis - INDEPENDENT of general feedback
  const loadBehaviorsAnalysis = useCallback(async () => {
    if (!call.id) return false;
    
    setIsLoadingBehaviors(true);
    setAnalysisError(null);
    
    try {
      console.log("Loading existing behaviors analysis for call:", call.id);
      
      // Check if feedback exists and has behaviors_analysis
      if (feedback?.behaviors_analysis && Array.isArray(feedback.behaviors_analysis) && feedback.behaviors_analysis.length > 0) {
        console.log("Found behaviors_analysis in provided feedback");
        const validatedBehaviors = validateBehaviorsAnalysis(feedback.behaviors_analysis);
        setBehaviors(validatedBehaviors);
        setBehaviorAnalysisExists(validatedBehaviors.length > 0);
        return validatedBehaviors.length > 0;
      }
      
      // Check database for existing behavior analysis
      const { data: existingFeedback, error: feedbackError } = await supabase
        .from('feedback')
        .select('behaviors_analysis')
        .eq('call_id', call.id)
        .maybeSingle();
        
      if (feedbackError && feedbackError.code !== 'PGRST116') {
        console.error("Error checking existing feedback:", feedbackError);
        throw feedbackError;
      }
      
      if (existingFeedback?.behaviors_analysis && Array.isArray(existingFeedback.behaviors_analysis) && existingFeedback.behaviors_analysis.length > 0) {
        console.log("Found behaviors_analysis in database");
        const validatedBehaviors = validateBehaviorsAnalysis(existingFeedback.behaviors_analysis);
        setBehaviors(validatedBehaviors);
        setBehaviorAnalysisExists(validatedBehaviors.length > 0);
        return validatedBehaviors.length > 0;
      }
      
      console.log("No existing behaviors analysis found");
      setBehaviorAnalysisExists(false);
      return false;
    } catch (error) {
      console.error("Error loading behaviors analysis:", error);
      setAnalysisError(error instanceof Error ? error.message : "Error desconocido");
      return false;
    } finally {
      setIsLoadingBehaviors(false);
    }
  }, [call.id, feedback]);
  
  // Initial check on component mount
  useEffect(() => {
    loadBehaviorsAnalysis();
  }, [loadBehaviorsAnalysis]);
  
  // Function to generate ONLY behavior analysis - independent of general feedback
  const triggerBehaviorAnalysis = useCallback(async () => {
    if (!call.id) {
      console.error("No call ID provided");
      return [];
    }
    
    if (!hasActiveBehaviors) {
      const errorMsg = "No hay comportamientos activos para analizar";
      console.error(errorMsg);
      toast.error(errorMsg);
      setAnalysisError(errorMsg);
      return [];
    }
    
    setIsGeneratingFeedback(true);
    setAnalysisError(null);
    
    try {
      console.log("Starting behavior analysis generation for call:", call.id);
      toast.loading("Analizando comportamientos...", { id: "generate-behaviors" });
      
      const { data, error } = await supabase.functions.invoke("analyze-call", {
        body: { 
          callId: call.id,
          analysisType: "behaviors" // Specify we only want behavior analysis
        }
      });
      
      if (error) {
        console.error("Error invoking analyze-call function:", error);
        throw new Error(error.message || "Error al analizar comportamientos");
      }
      
      console.log("Behavior analysis function result:", data);
      
      if (data?.behaviors_analysis && Array.isArray(data.behaviors_analysis) && data.behaviors_analysis.length > 0) {
        console.log("Successfully received behaviors analysis");
        const validatedBehaviors = validateBehaviorsAnalysis(data.behaviors_analysis);
        setBehaviors(validatedBehaviors);
        setBehaviorAnalysisExists(true);
        
        // Update local feedback ONLY with behavior analysis
        if (setLocalFeedback && feedback) {
          setLocalFeedback({
            ...feedback,
            behaviors_analysis: validatedBehaviors
          });
        }
        
        toast.success("Análisis de comportamientos generado correctamente", { id: "generate-behaviors" });
        setActiveTab("behaviors");
        
        return validatedBehaviors;
      } else {
        console.error("No behaviors_analysis in response or empty array");
        throw new Error("No se generaron resultados de análisis de comportamientos");
      }
    } catch (error) {
      console.error("Error generating behavior analysis:", error);
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      setAnalysisError(errorMessage);
      toast.error("Error generando análisis de comportamientos", { 
        id: "generate-behaviors", 
        description: errorMessage
      });
      return [];
    } finally {
      setIsGeneratingFeedback(false);
    }
  }, [call.id, hasActiveBehaviors, feedback, setLocalFeedback]);
  
  return {
    behaviors,
    isLoadingBehaviors,
    isGeneratingFeedback,
    triggerAnalysisFunction: triggerBehaviorAnalysis,
    loadBehaviorsAnalysis,
    analysisError,
    activeTab,
    setActiveTab,
    feedbackAlreadyExists: behaviorAnalysisExists,
    hasActiveBehaviors
  };
};
