import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { 
      sessionId, 
      scenarioId, 
      userId, 
      accountId,
      type, 
      messages, 
      finalScore,
      startedAt,
      completedAt,
      durationSeconds,
      insights,
      recommendations 
    } = await req.json();

    if (!sessionId || !scenarioId || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save training session
    const { data: sessionData, error: sessionError } = await supabaseClient
      .from('training_sessions')
      .insert({
        id: sessionId,
        scenario_id: scenarioId,
        user_id: userId,
        account_id: accountId,
        type: type,
        status: 'completed',
        started_at: startedAt,
        completed_at: completedAt || new Date().toISOString(),
        duration_seconds: durationSeconds,
        conversation: messages,
        performance_score: finalScore,
        ai_summary: `Entrenamiento completado con una puntuación de ${finalScore}/100`,
        insights: insights || [],
        recommendations: recommendations || []
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error saving session:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Failed to save session', details: sessionError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save individual messages
    if (Array.isArray(messages) && messages.length > 0) {
      const messagesForDb = messages.map((msg: any) => ({
        session_id: sessionId,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp).toISOString()
      }));

      const { error: messagesError } = await supabaseClient
        .from('training_messages')
        .insert(messagesForDb);

      if (messagesError) {
        console.error('Error saving messages:', messagesError);
        // Don't fail the whole operation if messages fail
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sessionId: sessionData.id,
        message: 'Training session saved successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in save-training-session:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
