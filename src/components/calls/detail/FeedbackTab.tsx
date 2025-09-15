
import React, { useState, useEffect } from "react";
import { Call } from "@/lib/types";
import FeedbackLoading from "./feedback/FeedbackLoading";
import FeedbackContent from "./feedback/FeedbackContent";
import { useFeedbackAnalysis } from "@/hooks/useFeedbackAnalysis";
import { useGeneralFeedback } from "@/hooks/useGeneralFeedback";
import { toast } from "sonner";

interface FeedbackTabProps {
  call: Call;
}

export default function FeedbackTab({ call }: FeedbackTabProps) {
  const feedback = call.feedback;
  const [localFeedback, setLocalFeedback] = useState(feedback);
  const [showBehaviorLoadingScreen, setShowBehaviorLoadingScreen] = useState(true);
  
  // Update local feedback state when call feedback changes
  useEffect(() => {
    if (feedback) {
      setLocalFeedback(feedback);
    }
  }, [feedback]);

  // Use hooks for behavior analysis and general feedback separately
  const behaviorAnalysisManager = useFeedbackAnalysis({
    call,
    feedback: localFeedback,
    setLocalFeedback
  });

  const generalFeedbackManager = useGeneralFeedback({
    call,
    feedback: localFeedback,
    setLocalFeedback
  });

  const {
    behaviors,
    isLoadingBehaviors,
    isGeneratingFeedback: isGeneratingBehaviors,
    triggerAnalysisFunction: triggerBehaviorAnalysis,
    analysisError,
    activeTab, 
    setActiveTab,
    feedbackAlreadyExists: behaviorAnalysisExists,
    hasActiveBehaviors
  } = behaviorAnalysisManager;

  const {
    isGeneratingFeedback: isGeneratingGeneralFeedback,
    feedbackError,
    triggerGeneralFeedback
  } = generalFeedbackManager;

  // Determine if we should show behavior loading screen
  useEffect(() => {
    const hasBehaviorsAnalysis = behaviors.length > 0 || (localFeedback?.behaviors_analysis && localFeedback.behaviors_analysis.length > 0);
    
    if (hasBehaviorsAnalysis || isGeneratingBehaviors) {
      setShowBehaviorLoadingScreen(false);
    } else if (localFeedback && !hasBehaviorsAnalysis) {
      setShowBehaviorLoadingScreen(true);
    } else if (!localFeedback) {
      setShowBehaviorLoadingScreen(true);
    }
  }, [behaviors, localFeedback, isGeneratingBehaviors]);

  // Handle manual generation of behavior analysis - INDEPENDENT
  const handleManualBehaviorGeneration = async () => {
    if (!hasActiveBehaviors) {
      toast.error("No hay comportamientos activos para analizar");
      return;
    }
    
    try {
      console.log("Manual behavior generation triggered");
      setShowBehaviorLoadingScreen(true);
      await triggerBehaviorAnalysis();
    } catch (error) {
      console.error("Error in manual behavior generation:", error);
    } finally {
      setShowBehaviorLoadingScreen(false);
    }
  };

  // Handle manual generation of general feedback - INDEPENDENT
  const handleManualFeedbackGeneration = async () => {
    try {
      console.log("Manual feedback generation triggered");
      await triggerGeneralFeedback();
    } catch (error) {
      console.error("Error in manual feedback generation:", error);
    }
  };

  // Show behavior loading screen when appropriate
  if (showBehaviorLoadingScreen && behaviors.length === 0) {
    return (
      <FeedbackLoading 
        isLoading={isGeneratingBehaviors}
        onGenerateClick={handleManualBehaviorGeneration}
        error={analysisError}
        feedbackExists={behaviorAnalysisExists}
        autoGenerating={isGeneratingBehaviors}
        title="Análisis de Comportamientos"
        description="Genere el análisis de comportamientos para evaluar el cumplimiento de los criterios específicos"
      />
    );
  }

  // Determine behaviors to display
  const displayBehaviors = behaviors.length > 0 
    ? behaviors 
    : (localFeedback?.behaviors_analysis || []);

  // Show feedback content when available
  return (
    <FeedbackContent
      call={call}
      localFeedback={localFeedback}
      behaviorsToDisplay={displayBehaviors}
      isLoadingBehaviors={isLoadingBehaviors}
      analysisError={analysisError}
      onRefreshAnalysis={behaviorAnalysisExists ? null : handleManualBehaviorGeneration}
      onRefreshFeedback={handleManualFeedbackGeneration}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      isGeneratingGeneralFeedback={isGeneratingGeneralFeedback}
      feedbackError={feedbackError}
    />
  );
}
