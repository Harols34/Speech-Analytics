import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Try both possible secret names (connector vs manual)
const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY_1') || Deno.env.get('ELEVENLABS_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    let text: string | undefined;
    let voice_id: string | undefined;
    let voice_settings: any;
    let sessionId: string | undefined;
    let scenarioId: string | undefined;

    if (req.method === 'GET') {
      const url = new URL(req.url);
      text = url.searchParams.get('text') || '';
      voice_id = url.searchParams.get('voice_id') || 'XB0fDUnXU5powFXDhCwa';
      sessionId = url.searchParams.get('sessionId') || '';
      scenarioId = url.searchParams.get('scenarioId') || '';
    } else {
      const body = await req.json();
      text = body.text;
      voice_id = body.voice_id;
      voice_settings = body.voice_settings;
      sessionId = body.sessionId;
      scenarioId = body.scenarioId;
    }

    if (!text) {
      throw new Error('Text is required');
    }

    console.log('[TTS] elevenlabs →', {
      voice_id,
      model_id: 'eleven_flash_v2_5',
      output_format: 'mp3_22050_32',
      text_len: text.length,
      sessionId: sessionId || '',
      scenarioId: scenarioId || '',
      settings: voice_settings || 'default'
    });

    if (!elevenLabsApiKey) {
      console.error('[TTS] ElevenLabs API key not configured');
      return new Response(
        JSON.stringify({ 
          error: 'TTS_API_KEY_MISSING',
          message: 'ElevenLabs API key no configurada.',
          sessionId,
          scenarioId
        }),
        {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Optimized settings for lowest latency
    const trainingSettings = {
      stability: voice_settings?.stability ?? 0.5,
      similarity_boost: voice_settings?.similarity_boost ?? 0.75,
      style: voice_settings?.style ?? 0,
      use_speaker_boost: voice_settings?.use_speaker_boost ?? true,
    };

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}/stream`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': elevenLabsApiKey,
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_flash_v2_5',
        voice_settings: trainingSettings,
        optimize_streaming_latency: 4,
        output_format: 'mp3_22050_32',
        apply_text_normalization: 'auto'
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[TTS] ElevenLabs upstream error:', response.status, errorText);
      
      return new Response(
        JSON.stringify({ 
          error: 'TTS_SERVICE_ERROR',
          message: 'Servicio de voz ElevenLabs no disponible. Por favor selecciona una voz de OpenAI (OP).',
          sessionId,
          scenarioId,
          providerStatus: response.status,
          errText: errorText
        }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const ttfb = Date.now();
    console.log('[TTS] upstream ok, TTFB(ms):', ttfb);

    return new Response(response.body, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('[TTS] unhandled error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'TTS_GENERATION_ERROR',
        message: error.message || 'Error generando audio',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
