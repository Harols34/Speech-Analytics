import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY_FORMACIÓN');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { audio, language = 'es', sessionId, scenarioId } = await req.json();
    
    if (!audio) {
      throw new Error('No audio data provided');
    }

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('Processing training speech-to-text request');
    console.log(`Session ID: ${sessionId || 'N/A'}`);
    console.log(`Scenario ID: ${scenarioId || 'N/A'}`);
    console.log(`Language: ${language}`);

    // Convert base64 to binary
    const binaryString = atob(audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    console.log(`Audio data size: ${bytes.length} bytes`);
    
    // Prepare form data
    const formData = new FormData();
    const blob = new Blob([bytes], { type: 'audio/webm' });
    formData.append('file', blob, 'training-audio.webm');
    formData.append('model', 'gpt-4o-mini-transcribe');
    formData.append('language', language);
    formData.append('response_format', 'verbose_json');
    formData.append('temperature', '0.2'); // Lower temperature for better accuracy

    // Send to OpenAI Whisper
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI Whisper API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    
    console.log('Speech-to-text conversion successful');
    console.log(`Transcribed text length: ${result.text?.length || 0} characters`);
    console.log(`Detection confidence: ${result.segments?.[0]?.avg_logprob || 'N/A'}`);

    // Calculate confidence score from logprob if available
    let confidence = 1.0;
    if (result.segments && result.segments.length > 0) {
      const avgLogprob = result.segments.reduce((sum: number, seg: any) => 
        sum + (seg.avg_logprob || 0), 0) / result.segments.length;
      // Convert logprob to confidence (rough approximation)
      confidence = Math.max(0.1, Math.min(1.0, Math.exp(avgLogprob / 2) + 0.5));
    }

    return new Response(
      JSON.stringify({ 
        text: result.text || '',
        confidence: confidence,
        language: result.language || language,
        duration: result.duration || null,
        segments: result.segments || [],
        session_id: sessionId,
        scenario_id: scenarioId,
        timestamp: new Date().toISOString(),
        processing_info: {
          model: 'gpt-4o-mini-transcribe',
          audio_format: 'webm',
          audio_size_bytes: bytes.length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in training speech-to-text function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        text: '', // Fallback empty text
        confidence: 0.0,
        timestamp: new Date().toISOString(),
        session_id: req.body?.sessionId || null,
        scenario_id: req.body?.scenarioId || null
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});