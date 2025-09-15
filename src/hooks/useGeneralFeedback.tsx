import { useState, useCallback } from "react";
import { Call, Feedback } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UseGeneralFeedbackProps {
  call: Call;
  feedback?: Feedback;
  setLocalFeedback?: React.Dispatch<React.SetStateAction<Feedback | undefined>>;
}

export const useGeneralFeedback = ({
  call,
  feedback,
  setLocalFeedback
}: UseGeneralFeedbackProps) => {
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  
  // Function to generate ONLY general feedback - independent of behaviors
  const triggerGeneralFeedback = useCallback(async () => {
    if (!call.id) {
      console.error("No call ID provided");
      return null;
    }
    
    setIsGeneratingFeedback(true);
    setFeedbackError(null);
    
    try {
      console.log("Starting general feedback generation for call:", call.id);
      toast.loading("Generando feedback general...", { id: "generate-feedback" });
      
      const { data, error } = await supabase.functions.invoke("process-call", {
        body: { 
          callId: call.id,
          analysisType: "feedback" // Specify we only want general feedback
        }
      });
      
      if (error) {
        console.error("Error invoking process-call function:", error);
        throw new Error(error.message || "Error al generar feedback");
      }
      
      console.log("General feedback function result:", data);
      
      if (data?.feedback) {
        console.log("Successfully received general feedback");
        
        const newFeedback: Feedback = {
          id: data.feedback.id,
          call_id: call.id,
          score: data.feedback.score || 0,
          positive: data.feedback.positive || [],
          negative: data.feedback.negative || [],
          opportunities: data.feedback.opportunities || [],
          sentiment: data.feedback.sentiment,
          topics: data.feedback.topics || [],
          entities: data.feedback.entities || [],
          created_at: data.feedback.created_at,
          updated_at: data.feedback.updated_at,
          // Keep existing behavior analysis if it exists
          behaviors_analysis: feedback?.behaviors_analysis || []
        };
        
        if (setLocalFeedback) {
          setLocalFeedback(newFeedback);
        }
        
        toast.success("Feedback general generado correctamente", { id: "generate-feedback" });
        
        return newFeedback;
      } else {
        console.error("No feedback in response");
        throw new Error("No se generó feedback");
      }
    } catch (error) {
      console.error("Error generating general feedback:", error);
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      setFeedbackError(errorMessage);
      toast.error("Error generando feedback", { 
        id: "generate-feedback", 
        description: errorMessage
      });
      return null;
    } finally {
      setIsGeneratingFeedback(false);
    }
  }, [call.id, feedback, setLocalFeedback]);
  
  return {
    isGeneratingFeedback,
    feedbackError,
    triggerGeneralFeedback
  };
};
