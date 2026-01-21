
import "https://deno.land/x/xhr@0.3.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { corsHeaders } from "./utils/cors.ts";
import { transcribeAudio } from "./services/transcriptionService.ts";
import { generateSummary, detectCallTopic } from "./services/summaryService.ts";
import { generateFeedback } from "./services/feedbackService.ts";
import { updateCallInDatabase } from "./services/databaseService.ts";
import { generateContentEmbedding, prepareContentForEmbedding } from "./services/vectorizationService.ts";

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
    
    console.log('🚀 Processing call request ENHANCED:', { 
      callId, 
      audioUrl: audioUrl ? 'provided' : 'from database', 
      summaryPrompt: summaryPrompt ? 'provided' : 'not provided', 
      feedbackPrompt: feedbackPrompt ? 'provided' : 'not provided',
      behaviorIds: selectedBehaviorIds ? selectedBehaviorIds.length : 0
    });
    
    if (!callId) {
      throw new Error('Missing required parameter: callId');
    }

    // Get call data
    const { data: callData, error: callFetchError } = await supabase
      .from('calls')
      .select('account_id, title, audio_url, duration, status, agent_name')
      .eq('id', callId)
      .single();

    if (callFetchError) {
      console.error('❌ Error fetching call data:', callFetchError);
      throw new Error('Could not fetch call data');
    }

    // Verificar si la llamada ya está completada
    if (callData.status === 'complete') {
      console.log('✅ Call already completed, skipping processing:', callId);
      return new Response(
        JSON.stringify({ 
          success: true, 
          callId,
          accountId: callData.account_id,
          message: 'Call already completed',
          alreadyCompleted: true
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    const finalAudioUrl = audioUrl || callData.audio_url;
    
    if (!finalAudioUrl || finalAudioUrl === 'undefined' || finalAudioUrl.trim() === '') {
      throw new Error('Missing or invalid audioUrl parameter');
    }

    // Validación de accesibilidad de URL de audio
    try {
      console.log('🔍 Validating audio URL accessibility:', finalAudioUrl);
      
      let audioResponse;
      let attempts = 0;
      const maxAttempts = 2;
      
      while (attempts < maxAttempts) {
        try {
          attempts++;
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);
          
          audioResponse = await fetch(finalAudioUrl, { 
            method: 'HEAD',
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; Supabase-Functions/1.0)'
            },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (audioResponse.ok) break;
          
          if (attempts === maxAttempts) {
            throw new Error(`Audio URL not accessible: ${audioResponse.status} ${audioResponse.statusText}`);
          }
          
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (fetchError: any) {
          if (attempts === maxAttempts) {
            throw fetchError;
          }
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      const contentLength = audioResponse!.headers.get('content-length');
      if (contentLength) {
        const sizeMB = parseInt(contentLength) / (1024 * 1024);
        console.log(`✅ Audio URL is accessible, size: ${Math.round(sizeMB * 100) / 100}MB`);
        
        if (sizeMB > 100) {
          console.error(`❌ File too large: ${Math.round(sizeMB * 100) / 100}MB > 100MB`);
          throw new Error(`Audio file too large: ${Math.round(sizeMB * 100) / 100}MB (max 100MB)`);
        }
      } else {
        console.log('✅ Audio URL is accessible (size unknown)');
      }
    } catch (urlError: any) {
      console.error('❌ Audio URL validation failed:', urlError);
      
      await updateCallInDatabase(supabase, callId, {
        status: 'error',
        progress: 0
      });
      
      throw new Error(`Audio URL validation failed: ${urlError.message}`);
    }

    console.log(`📞 Starting ENHANCED processing for call ${callId} (${callData.title}) in account: ${callData.account_id}`);

    // === STAGE 1: TRANSCRIPCIÓN ===
    console.log('🎤 Starting transcription stage...');
    await updateCallInDatabase(supabase, callId, {
      status: 'transcribing',
      progress: 10
    });

    const startTime = Date.now();
    
    let transcription;
    try {
      transcription = await transcribeAudio(finalAudioUrl);
    } catch (transcriptionError: any) {
      console.error('❌ Transcription failed:', transcriptionError);
      
      await updateCallInDatabase(supabase, callId, {
        status: 'error',
        progress: 0
      });
      
      throw new Error(`Transcription failed: ${transcriptionError.message}`);
    }
    
    const transcriptionTime = Math.round((Date.now() - startTime) / 1000);
    console.log(`📝 Transcription completed in ${transcriptionTime} seconds: ${transcription.length} characters`);

    // Validación de calidad de transcripción
    const isValidTranscription = transcription &&
      !transcription.includes('No hay transcripción disponible') &&
      transcription.trim().length > 100 &&
      (transcription.includes('Asesor:') || transcription.includes('Cliente:') || transcription.includes('['));

    if (!isValidTranscription) {
      console.log('❌ Invalid or insufficient transcription, marking call as complete with basic feedback');
      
      await updateCallInDatabase(supabase, callId, {
        transcription: transcription,
        status: 'complete',
        progress: 100,
        call_topic: 'Sin contenido analizable',
        sentiment: 'neutral',
        entities: [],
        topics: []
      });

      await supabase
        .from('feedback')
        .insert({
          call_id: callId,
          account_id: callData.account_id,
          score: 0,
          positive: [],
          negative: ['No hay contenido analizable en la grabación - transcripción insuficiente o inválida'],
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
          transcriptionAvailable: false
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    // Guardar transcripción inicialmente
    await updateCallInDatabase(supabase, callId, {
      transcription: transcription,
      status: 'analyzing',
      progress: 30
    });

    console.log('✅ Valid transcription found, proceeding with analysis...');

    // === STAGE 2: GENERACIÓN DE RESUMEN ===
    console.log('📊 Starting summary generation...');
    const summaryStartTime = Date.now();
    
    let summary;
    try {
      summary = await generateSummary(transcription, summaryPrompt || undefined);
    } catch (summaryError: any) {
      console.error('❌ Error generating summary:', summaryError);
      summary = `Resumen automático: ${transcription.substring(0, 300)}...`;
    }
    
    const summaryTime = Math.round((Date.now() - summaryStartTime) / 1000);
    console.log(`📄 Summary generated in ${summaryTime} seconds: ${summary.length} characters`);
    
    // === STAGE 3: DETECCIÓN DE TEMA ===
    console.log('🎯 Starting topic detection...');
    const topicStartTime = Date.now();
    
    let callTopic;
    try {
      callTopic = await detectCallTopic(transcription, summary);
    } catch (topicError: any) {
      console.error('❌ Error detecting topic:', topicError);
      callTopic = 'Consultas generales';
    }
    
    const topicTime = Math.round((Date.now() - topicStartTime) / 1000);
    console.log(`🎯 Topic detected in ${topicTime} seconds: ${callTopic}`);
    
    // Actualizar con resumen y tema - SEPARAR CAMPOS CORRECTAMENTE
    await updateCallInDatabase(supabase, callId, { 
      summary: summary,
      call_topic: callTopic,
      progress: 50 
    });

    // === STAGE 4: GENERACIÓN DE FEEDBACK ===
    console.log('🔍 Starting feedback generation...');
    const feedbackStartTime = Date.now();
    
    let feedbackResult;
    try {
      feedbackResult = await generateFeedback(transcription, summary, feedbackPrompt || undefined, selectedBehaviorIds || []);
    } catch (feedbackError: any) {
      console.error('❌ Error generating feedback:', feedbackError);
      feedbackResult = {
        score: 50,
        positive: ['Transcripción procesada exitosamente'],
        negative: ['Error en el análisis detallado'],
        opportunities: ['Revisar configuración de análisis'],
        sentiment: 'neutral',
        entities: [],
        topics: [],
        behaviors_analysis: []
      };
    }
    
    const feedbackTime = Math.round((Date.now() - feedbackStartTime) / 1000);
    console.log(`💬 Feedback generated in ${feedbackTime} seconds with score: ${feedbackResult.score}`);
    
    // === STAGE 5: GENERACIÓN DE EMBEDDING ===
    console.log('🧠 Starting content embedding generation...');
    const embeddingStartTime = Date.now();
    
    // Preparar contenido completo para embedding
    const contentForEmbedding = prepareContentForEmbedding({
      title: callData.title,
      agent_name: callData.agent_name || '',
      summary: summary,
      transcription: transcription,
      call_topic: callTopic,
      topics: feedbackResult.topics,
      entities: feedbackResult.entities
    });
    
    let contentEmbedding = null;
    try {
      const embeddingArray = await generateContentEmbedding(contentForEmbedding);
      if (embeddingArray && embeddingArray.length > 0) {
        contentEmbedding = `[${embeddingArray.join(',')}]`;
        console.log('✅ Content embedding generated successfully:', contentEmbedding.length, 'characters');
      } else {
        console.warn('⚠️ No embedding generated');
      }
    } catch (embeddingError: any) {
      console.error('❌ Error generating embedding:', embeddingError);
    }
    
    const embeddingTime = Math.round((Date.now() - embeddingStartTime) / 1000);
    console.log(`🧠 Embedding generation completed in ${embeddingTime} seconds`);
    
    // === ACTUALIZACIÓN FINAL ===
    await updateCallInDatabase(supabase, callId, {
      status: 'complete',
      progress: 100,
      sentiment: feedbackResult.sentiment,
      entities: feedbackResult.entities,
      topics: feedbackResult.topics,
      content_embedding: contentEmbedding
    });

    // Guardar feedback completo
    try {
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
        console.error('❌ Error inserting feedback:', feedbackError);
      }
    } catch (insertError) {
      console.error('❌ Critical error inserting feedback:', insertError);
    }

    const totalTime = Math.round((Date.now() - startTime) / 1000);
    console.log(`✅ Successfully processed call ${callId} for account ${callData.account_id} in ${totalTime} seconds`);
    console.log(`📈 Final stats: transcription=${transcription.length} chars (${transcriptionTime}s), summary=${summary.length} chars (${summaryTime}s), topic=${callTopic} (${topicTime}s), score=${feedbackResult.score} (${feedbackTime}s), embedding=${embeddingTime}s`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        callId,
        accountId: callData.account_id,
        message: 'Call processed successfully with complete analysis and vectorization',
        transcriptionLength: transcription.length,
        summaryLength: summary.length,
        feedbackScore: feedbackResult.score,
        callTopic: callTopic,
        hasEmbedding: !!contentEmbedding,
        usedCustomPrompts: {
          summary: !!summaryPrompt,
          feedback: !!feedbackPrompt
        },
        analyzedBehaviors: selectedBehaviorIds?.length || 0,
        transcriptionAvailable: true,
        duration: callData.duration,
        processingTime: {
          total: totalTime,
          transcription: transcriptionTime,
          summary: summaryTime,
          topic: topicTime,
          feedback: feedbackTime,
          embedding: embeddingTime
        }
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error: any) {
    console.error('❌ Error processing call:', error);
    
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
        error: "Error interno del servidor",
        timestamp: new Date().toISOString(),
        callId: requestBody.callId || 'unknown'
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
