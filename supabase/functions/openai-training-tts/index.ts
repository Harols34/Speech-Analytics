import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { text, voice, speed = 1.0, model = 'tts-1' } = await req.json();
    
    console.log('OpenAI TTS request:', { voice, textLength: text?.length, speed, model });

    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY_FORMACIÓN');
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY_FORMACIÓN not configured');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key for training not configured' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Valid OpenAI TTS voices - Todas las voces disponibles
    const validVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer', 'ash', 'ballad', 'coral', 'sage', 'verse'];
    const selectedVoice = validVoices.includes(voice) ? voice : 'alloy';

    // Valid OpenAI TTS models
    const validModels = ['tts-1', 'tts-1-hd', 'gpt-4o-mini-tts'];
    const selectedModel = validModels.includes(model) ? model : 'tts-1';

    console.log('Calling OpenAI TTS API with voice:', selectedVoice, 'model:', selectedModel);

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: selectedModel,
        input: text,
        voice: selectedVoice,
        speed: speed || 1.0,
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI TTS API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI TTS generation failed',
          details: errorText,
          status: response.status
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('OpenAI TTS response OK, streaming audio directly');

    // Stream audio directly without buffering for minimum latency
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=3600', // Cache 1 hour
        'X-Provider': 'openai',
        'X-Model': selectedModel,
      },
    });
  } catch (error) {
    console.error('Error in openai-training-tts function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
