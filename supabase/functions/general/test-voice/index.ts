import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { voiceId, text, voice_settings } = await req.json();

    if (!voiceId || !text) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'BAD_REQUEST',
          message: 'voiceId y text son requeridos'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try both possible secret names (connector vs manual)
    const apiKey = Deno.env.get('ELEVENLABS_API_KEY_1') || Deno.env.get('ELEVENLABS_API_KEY');
    if (!apiKey) {
      console.error('❌ ELEVENLABS_API_KEY no está configurado (tried ELEVENLABS_API_KEY_1 and ELEVENLABS_API_KEY)');
      return new Response(JSON.stringify({
        success: false,
        error: 'API_KEY_MISSING',
        message: 'La clave API de ElevenLabs no está configurada. Por favor, configúrala en los secretos de Supabase.',
        audioUrl: null
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const settings = {
      stability: 0.6,
      similarity_boost: 0.85,
      style: 0.3,
      use_speaker_boost: true,
      ...voice_settings,
    };

    const payload = {
      text,
      model_id: 'eleven_turbo_v2_5',
      voice_settings: settings,
      optimize_streaming_latency: 2,
      output_format: 'mp3_44100_128',
      apply_text_normalization: 'auto'
    };

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ ElevenLabs API error:', response.status, errorText);
      let code = 'TTS_SERVICE_ERROR';
      let message = 'No se pudo generar audio. Verifica la voz o tu suscripción.';
      if (response.status === 401) {
        code = 'TTS_UNAUTHORIZED';
        message = 'ElevenLabs rechazó la API key (401). Revisa el secreto ELEVENLABS_API_KEY o tu plan.';
      } else if (response.status === 404) {
        code = 'VOICE_NOT_FOUND';
        message = 'Voz no encontrada. Prueba con otra voz.';
      }
      return new Response(
        JSON.stringify({ success: false, error: code, message }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
    const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;

    return new Response(JSON.stringify({ success: true, audioUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Error testing voice:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Error inesperado'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});