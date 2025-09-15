
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { corsHeaders } from "./utils/cors.ts";
import { transcribeAudio } from "./services/transcriptionService.ts";
import { generateSummary } from "./services/summaryService.ts";
import { generateFeedback } from "./services/feedbackService.ts";
import { updateCallInDatabase } from "./services/databaseService.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { callId, audioUrl, summaryPrompt, feedbackPrompt, selectedBehaviorIds } = await req.json();
    
    console.log('🚀 Processing call request:', { 
      callId, 
      audioUrl: audioUrl ? 'provided' : 'missing', 
      summaryPrompt: summaryPrompt ? 'provided' : 'not provided', 
      feedbackPrompt: feedbackPrompt ? 'provided' : 'not provided',
      behaviorIds: selectedBehaviorIds ? selectedBehaviorIds.length : 0
    });
    
    if (!callId) {
      throw new Error('Missing required parameter: callId');
    }

    if (!audioUrl || audioUrl === 'undefined' || audioUrl.trim() === '') {
      throw new Error('Missing or invalid audioUrl parameter');
    }

    // Get call data to ensure we have the account_id
    const { data: callData, error: callFetchError } = await supabase
      .from('calls')
      .select('account_id, title')
      .eq('id', callId)
      .single();

    if (callFetchError) {
      console.error('Error fetching call data:', callFetchError);
      throw new Error('Could not fetch call data');
    }

    console.log(`📞 Starting processing for call ${callId} (${callData.title}) in account: ${callData.account_id}`);

    // === STAGE 1: PURE TRANSCRIPTION ONLY ===
    console.log('🎤 Starting transcription stage...');
    await updateCallInDatabase(supabase, callId, {
      status: 'transcribing',
      progress: 10
    });

    const transcription = await transcribeAudio(audioUrl);
    console.log(`📝 Transcription completed: ${transcription.length} characters`);

    // Save ONLY the transcription, nothing else
    await updateCallInDatabase(supabase, callId, {
      transcription: transcription, // Pure transcription text only
      status: (transcription && !transcription.includes('No hay transcripción disponible') && transcription.trim().length > 100) ? 'analyzing' : 'complete',
      progress: (transcription && !transcription.includes('No hay transcripción disponible') && transcription.trim().length > 100) ? 40 : 100
    });

    // === VALIDATE TRANSCRIPTION QUALITY ===
    const isValidTranscription = transcription &&
      !transcription.includes('No hay transcripción disponible') &&
      transcription.trim().length > 100 &&
      (transcription.includes('Asesor:') || transcription.includes('Cliente:'));

    if (!isValidTranscription) {
      console.log('❌ Invalid or insufficient transcription, marking call as complete with no analysis');
      console.log(`Transcription preview: ${transcription.substring(0, 200)}...`);
      
      // Store minimal feedback for non-analyzable content
      await supabase
        .from('feedback')
        .insert({
          call_id: callId,
          account_id: callData.account_id,
          score: 0,
          positive: [],
          negative: ['No hay contenido analizable en la grabación'],
          opportunities: ['Verificar calidad del audio y contenido de la llamada'],
          sentiment: 'neutral',
          entities: [],
          topics: [],
          behaviors_analysis: []
        });

      return new Response(
        JSON.stringify({ 
          success: true, 
          callId,
          accountId: callData.account_id,
          message: 'Call processed - no analyzable content found',
          transcriptionAvailable: false,
          transcriptionLength: transcription.length
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    console.log('✅ Valid transcription found, proceeding with analysis...');

    // === STAGE 2: SUMMARY GENERATION ===
    console.log('📊 Starting summary generation...');
    const summary = await generateSummary(transcription, summaryPrompt || undefined);
    console.log(`📄 Summary generated: ${summary.length} characters`);
    
    await updateCallInDatabase(supabase, callId, { 
      summary: summary, 
      progress: 70 
    });

    // === STAGE 3: FEEDBACK GENERATION ===
    console.log('🔍 Starting feedback generation...');
    const feedbackResult = await generateFeedback(transcription, summary, feedbackPrompt || undefined, selectedBehaviorIds || []);
    console.log(`💬 Feedback generated with score: ${feedbackResult.score}`);
    
    await updateCallInDatabase(supabase, callId, {
      status: 'complete',
      progress: 100,
      sentiment: feedbackResult.sentiment,
      entities: feedbackResult.entities,
      topics: feedbackResult.topics
    });

    // Save complete feedback
    const { error: feedbackError } = await supabase
      .from('feedback')
      .insert({
        call_id: callId,
        account_id: callData.account_id,
        score: feedbackResult.score,
        positive: feedbackResult.positive,
        negative: feedbackResult.negative,
        opportunities: feedbackResult.opportunities,
        sentiment: feedbackResult.sentiment,
        entities: feedbackResult.entities,
        topics: feedbackResult.topics,
        behaviors_analysis: feedbackResult.behaviors_analysis || []
      });

    if (feedbackError) {
      console.error('Error inserting feedback:', feedbackError);
    }

    console.log(`✅ Successfully processed call ${callId} for account ${callData.account_id}`);
    console.log(`📈 Final stats: transcription=${transcription.length} chars, summary=${summary.length} chars, score=${feedbackResult.score}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        callId,
        accountId: callData.account_id,
        message: 'Call processed successfully with complete transcription and analysis',
        transcriptionLength: transcription.length,
        summaryLength: summary.length,
        feedbackScore: feedbackResult.score,
        usedCustomPrompts: {
          summary: !!summaryPrompt,
          feedback: !!feedbackPrompt
        },
        analyzedBehaviors: selectedBehaviorIds?.length || 0,
        transcriptionAvailable: true
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('❌ Error processing call:', error);
    
    // Try to update call status to error if we have callId
    const requestBody = await req.json().catch(() => ({}));
    if (requestBody.callId) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await updateCallInDatabase(supabase, requestBody.callId, {
          status: 'error',
          progress: 0
        });
        console.log(`Updated call ${requestBody.callId} status to error`);
      } catch (updateError) {
        console.error('Error updating call status to error:', updateError);
      }
    }

    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
