
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.5.0";
import { corsHeaders } from "./utils/cors.ts";
import { scoreFromEvaluations, mapScoreToText } from "./utils/scoring.ts";
import { generateOpportunities, generatePositives } from "./utils/feedbackGenerator.ts";
import { analyzeBehaviors } from "./services/behaviorAnalyzer.ts";
import { handleExistingFeedback, createOrUpdateFeedback } from "./services/feedbackService.ts";

// Main handler function
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify that it's a POST request
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: "Método no permitido" }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get the call ID from the request body
    const { callId } = await req.json();
    
    if (!callId) {
      return new Response(JSON.stringify({ error: "ID de llamada no proporcionado" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Starting behavior analysis for call: ${callId}`);

    // Create Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Check if feedback already exists
    const { existingFeedback, feedbackError } = await handleExistingFeedback(supabaseAdmin, callId);
    
    if (feedbackError && feedbackError.code !== 'PGRST116') {
      console.error("Error checking existing feedback:", feedbackError);
    }
    
    // If feedback with behaviors_analysis already exists, return it
    if (existingFeedback && existingFeedback.behaviors_analysis && 
        Array.isArray(existingFeedback.behaviors_analysis) && 
        existingFeedback.behaviors_analysis.length > 0) {
      console.log("Complete feedback already exists for call:", callId);
      
      return new Response(JSON.stringify({
        success: true,
        message: "Feedback ya existe con análisis de comportamientos",
        feedback: existingFeedback,
        behaviors_analysis: existingFeedback.behaviors_analysis,
        score: existingFeedback.score,
        scoreText: mapScoreToText(existingFeedback.score),
        positive: existingFeedback.positive || [],
        negative: existingFeedback.negative || [],
        opportunities: existingFeedback.opportunities || []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get call data including account_id
    const { data: call, error: callError } = await supabaseAdmin
      .from('calls')
      .select('*')
      .eq('id', callId)
      .single();

    if (callError) {
      console.error("Error fetching call:", callError);
      return new Response(JSON.stringify({ error: "Error al obtener datos de la llamada" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Call found: ${call.title}, account: ${call.account_id}`);

    // Verify call has transcription
    if (!call.transcription) {
      console.error("Call has no transcription");
      return new Response(JSON.stringify({ error: "La llamada no tiene transcripción" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get active behaviors - filter by account if call has account_id
    console.log("Fetching active behaviors for analysis...");
    let behaviorsQuery = supabaseAdmin
      .from('behaviors')
      .select('*')
      .eq('is_active', true);

    // If call has account_id, get behaviors for that account or global behaviors
    if (call.account_id) {
      behaviorsQuery = behaviorsQuery.or(`account_id.eq.${call.account_id},account_id.is.null`);
      console.log(`Filtering behaviors by account: ${call.account_id}`);
    }

    const { data: behaviors, error: behaviorsError } = await behaviorsQuery;

    if (behaviorsError) {
      console.error("Error fetching behaviors:", behaviorsError);
      return new Response(JSON.stringify({ error: "Error al obtener comportamientos activos" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!behaviors || behaviors.length === 0) {
      console.warn("No active behaviors found for analysis");
      return new Response(JSON.stringify({ error: "No hay comportamientos activos para analizar" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Found ${behaviors.length} active behaviors for analysis`);

    // Analyze behaviors
    console.log("Starting behavior analysis...");
    const behaviorsAnalysis = await analyzeBehaviors(call, behaviors);
    console.log("Behavior analysis completed:", behaviorsAnalysis);

    // Calculate score and generate feedback details
    const score = scoreFromEvaluations(behaviorsAnalysis);
    const opportunities = generateOpportunities(behaviorsAnalysis);
    const positives = generatePositives(behaviorsAnalysis, score);
    
    console.log(`Generated score: ${score}, positives: ${positives.length}, opportunities: ${opportunities.length}`);
    
    // Create or update feedback with account_id
    const response = await createOrUpdateFeedback(
      supabaseAdmin, 
      existingFeedback, 
      callId, 
      behaviors.length,
      behaviorsAnalysis, 
      score, 
      positives, 
      opportunities
    );

    console.log("Feedback created/updated successfully");

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error("Unexpected error in analyze-call:", error);
    return new Response(JSON.stringify({ 
      error: error.message || "Error inesperado",
      details: error.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
