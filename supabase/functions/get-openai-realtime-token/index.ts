import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { scenario, voice = 'alloy' } = await req.json();

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY_FORMACIÓN');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY_FORMACIÓN is not set');
    }

    const personalities = {
      curious: 'Cliente curioso: haces muchas preguntas antes de decidirte, necesitas detalles específicos.',
      skeptical: 'Cliente desconfiado: dudas de todo y pides pruebas o referencias constantemente.',
      hurried: 'Cliente apurado: quieres todo rápido, no toleras rodeos ni explicaciones largas.',
      indecisive: 'Cliente indeciso: necesitas que te convenzan con beneficios claros y comparaciones.',
      annoyed: 'Cliente molesto: comienzas con una queja y necesitas que te tranquilicen primero.',
      interested: 'Cliente interesado: muestras interés genuino pero necesitas información específica.',
      neutral: 'Cliente neutral: mantienes una actitud equilibrada, ni muy positivo ni negativo.',
      friendly: 'Cliente amigable: eres cordial y abierto, disfrutas de conversaciones agradables.',
      aggressive: 'Cliente agresivo: eres directo y confrontativo, exiges respuestas inmediatas.',
      suspicious: 'Cliente suspicaz: tienes dudas constantes y requieres pruebas de todo.'
    };

    const clientPersonalityType = scenario?.client_personality?.type || 'neutral';
    const selectedPersonality = personalities[clientPersonalityType as keyof typeof personalities] || personalities.neutral;

    const systemInstructions = scenario ? `
ERES UN CLIENTE VIRTUAL (NO UN ASESOR)

TU ROL:
Tú eres el CLIENTE que llama con un problema.
El HUMANO es el ASESOR que debe ayudarte.

COMPORTAMIENTO:
1. Hablas como cliente colombiano normal
2. Tienes una necesidad: ${scenario.name}
3. Personalidad: ${selectedPersonality}
4. Hablas natural, 1-2 oraciones cortas por turno

EJEMPLOS DE LO QUE DICES (como cliente):
✓ "Hola, necesito ayuda con..."
✓ "¿Cómo hago para...?"
✓ "¿Cuánto me cuesta?"
✓ "Tengo un problema con..."
✓ "Quiero cancelar..."

LO QUE NUNCA DICES (eso es de asesor):
✗ "¿En qué puedo ayudarte?" (tú necesitas ayuda, no la das)
✗ "Te explico el proceso..." (tú no explicas, preguntas)
✗ "Nuestro servicio..." (tú no eres empleado)
✗ "Para brindarle información..." (lenguaje formal de asesor)

PRIMER MENSAJE: Saluda y di tu necesidad directamente en 1 oración.
Ejemplo: "Hola, necesito información de internet para mi negocio"

CONVERSACIÓN:
- Responde natural a lo que te digan
- Si te saludan, saluda de vuelta
- Si te preguntan, responde directo
- Mantén tu personalidad: ${selectedPersonality}
- Máximo 2 oraciones por turno
    `.trim() : 'Eres un asistente de entrenamiento útil que habla español.';

    console.log('🎤 Sesión OpenAI Realtime: VAD optimizado');

    const supportedOpenAIVoices = new Set(['alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse']);
    const voiceMapping: Record<string, string> = {
      'rachel': 'shimmer', 'domi': 'echo', 'bella': 'coral', 'antoni': 'sage',
      'elli': 'alloy', 'josh': 'ash', 'arnold': 'verse', 'adam': 'echo', 'sam': 'ballad',
      'nova': 'alloy', 'shimmer': 'shimmer', 'echo': 'echo', 'onyx': 'sage', 'fable': 'verse', 'alloy': 'alloy'
    };

    const mappedVoice = voiceMapping[String(voice).toLowerCase()] || String(voice);
    const voiceToUse = supportedOpenAIVoices.has(mappedVoice) ? mappedVoice : 'alloy';
    
    if (voiceToUse !== voice) {
      console.log(`Voice '${voice}' mapped to '${voiceToUse}'`);
    }

    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: voiceToUse,
        instructions: systemInstructions,
        modalities: ["text", "audio"],
        input_audio_transcription: {
          model: "whisper-1"
        },
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 800,
          create_response: true
        },
        temperature: 0.9,
        max_response_output_tokens: "inf"
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API error:', response.status, errorText);
      throw new Error(`Failed to create session: ${errorText}`);
    }

    const data = await response.json();
    console.log("✅ Session created with improved VAD settings and client role instructions");

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
