
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.5.0";
import { generateOpportunities, generatePositives } from "../utils/feedbackGenerator.ts";

/**
 * Maneja el caso donde ya existe feedback para una llamada
 */
export async function handleExistingFeedback(supabase: any, callId: string) {
  try {
    // Verificar si ya existe feedback para la llamada
    const { data: existingFeedback, error: feedbackError } = await supabase
      .from('feedback')
      .select('*')
      .eq('call_id', callId)
      .maybeSingle();

    return { existingFeedback, feedbackError };
  } catch (error) {
    console.error("Error handling existing feedback:", error);
    return { existingFeedback: null, feedbackError: error };
  }
}

/**
 * Crea o actualiza el feedback para una llamada en base al análisis de comportamientos
 */
export async function createOrUpdateFeedback(
  supabase: any,
  existingFeedback: any,
  callId: string,
  totalBehaviors: number,
  behaviorsAnalysis: any[],
  score: number,
  positives: string[],
  opportunities: string[]
) {
  try {
    // Get call data including account_id
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select('summary, account_id')
      .eq('id', callId)
      .single();
    
    if (callError) {
      console.error("Error fetching call data:", callError);
    }
    
    const summary = call?.summary || "";
    const accountId = call?.account_id || null;
    
    // Enriquecemos los aspectos positivos y oportunidades con el resumen de la llamada
    const enhancedPositives = generatePositives(behaviorsAnalysis, score, summary);
    const enhancedOpportunities = generateOpportunities(behaviorsAnalysis, summary);
    
    // Lista de aspectos negativos derivados de comportamientos no cumplidos
    const negatives = behaviorsAnalysis
      .filter(b => b.evaluation === "no cumple")
      .map(b => {
        // Extrae la primera parte del comentario hasta el primer punto o coma
        const comment = b.comments || "";
        const firstSentence = comment.split(/[.,]/).filter(Boolean)[0] || "";
        return firstSentence || `Mejorar en: ${b.name}`;
      });
    
    // Crear o actualizar el feedback
    const feedbackData = {
      call_id: callId,
      account_id: accountId, // Include account_id
      score,
      positive: enhancedPositives,
      negative: negatives.length > 0 ? negatives.slice(0, 5) : ["Se identificaron oportunidades de mejora"],
      opportunities: enhancedOpportunities,
      behaviors_analysis: behaviorsAnalysis,
      updated_at: new Date().toISOString()
    };

    // If feedback exists, update it, otherwise create new
    let result;
    if (existingFeedback) {
      const { data, error } = await supabase
        .from('feedback')
        .update(feedbackData)
        .eq('call_id', callId)
        .select('*')
        .single();
        
      if (error) throw new Error(`Error updating feedback: ${error.message || "Unknown error"}`);
      result = data;
    } else {
      const { data, error } = await supabase
        .from('feedback')
        .insert({
          ...feedbackData,
          created_at: new Date().toISOString()
        })
        .select('*')
        .single();
        
      if (error) throw new Error(`Error creating feedback: ${error.message || "Unknown error"}`);
      result = data;
    }

    console.log(`Feedback ${existingFeedback ? 'updated' : 'created'} for call ${callId} with account ${accountId}`);

    // Prepare the success response
    return {
      success: true,
      message: existingFeedback ? "Feedback actualizado con nuevos análisis" : "Feedback creado exitosamente",
      feedback: result,
      behaviors_analysis: behaviorsAnalysis,
      score,
      scoreText: mapScoreToText(score),
      positive: enhancedPositives,
      negative: negatives.slice(0, 5),
      opportunities: enhancedOpportunities,
      totalBehaviors,
      behaviorsMet: behaviorsAnalysis.filter(b => b.evaluation === "cumple").length,
      behaviorsNotMet: behaviorsAnalysis.filter(b => b.evaluation === "no cumple").length
    };
  } catch (error) {
    console.error("Error creating/updating feedback:", error);
    throw error;
  }
}

/**
 * Maps a numerical score to a descriptive text
 */
function mapScoreToText(score: number): string {
  if (score >= 90) return "Excelente";
  if (score >= 80) return "Muy bueno";
  if (score >= 70) return "Bueno";
  if (score >= 60) return "Aceptable";
  if (score >= 50) return "Regular";
  return "Necesita mejorar";
}
