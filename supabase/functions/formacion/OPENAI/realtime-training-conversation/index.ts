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

  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() === "websocket") {
    return handleWebSocketUpgrade(req);
  }

  // Handle session creation for training
  try {
    const { action, scenario, voiceId, config, sessionId } = await req.json();

    if (action === 'start') {
      const sessionUrl = `wss://ejzidvltowbhccxukllc.functions.supabase.co/realtime-training-conversation?scenario=${encodeURIComponent(JSON.stringify(scenario))}&voice=${voiceId}&session=${sessionId}`;
      
      return new Response(
        JSON.stringify({ 
          sessionUrl,
          session_id: sessionId,
          scenario_info: scenario
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in realtime training conversation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function handleWebSocketUpgrade(req: Request) {
  const { socket, response } = Deno.upgradeWebSocket(req);
  
  let openAISocket: WebSocket | null = null;
  let sessionInitialized = false;
  let trainingSession: any = null;

  const url = new URL(req.url);
  const scenarioParam = url.searchParams.get('scenario');
  const voiceParam = url.searchParams.get('voice');
  const sessionParam = url.searchParams.get('session');

  try {
    trainingSession = scenarioParam ? JSON.parse(decodeURIComponent(scenarioParam)) : null;
  } catch (e) {
    console.error('Error parsing scenario:', e);
  }

  socket.onopen = async () => {
    try {
      console.log('Training client connected to realtime conversation');
      console.log(`Session: ${sessionParam}, Voice: ${voiceParam}`);
      console.log(`Scenario: ${trainingSession?.title || 'Unknown'}`);
      
      // Connect to OpenAI Realtime API
      openAISocket = new WebSocket(
        `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`,
        {
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'OpenAI-Beta': 'realtime=v1'
          }
        }
      );

      openAISocket.onopen = () => {
        console.log('Connected to OpenAI Realtime API for training');
        socket.send(JSON.stringify({
          type: 'session.created',
          message: 'Connected to OpenAI Realtime API for training',
          session_id: sessionParam,
          scenario: trainingSession
        }));
      };

      openAISocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        // Initialize training session after connecting
        if (data.type === 'session.created' && !sessionInitialized) {
          initializeTrainingSession(openAISocket, trainingSession, voiceParam);
          sessionInitialized = true;
        }
        
        // Forward all OpenAI messages to client with training context
        socket.send(JSON.stringify({
          ...data,
          training_context: {
            session_id: sessionParam,
            scenario_id: trainingSession?.id,
            scenario_title: trainingSession?.title
          }
        }));
      };

      openAISocket.onerror = (error) => {
        console.error('OpenAI WebSocket error in training:', error);
        socket.send(JSON.stringify({
          type: 'error',
          message: 'OpenAI connection error in training session'
        }));
      };

      openAISocket.onclose = () => {
        console.log('OpenAI connection closed for training session');
        socket.close();
      };

    } catch (error) {
      console.error('Error setting up training WebSocket:', error);
      socket.send(JSON.stringify({
        type: 'error',
        message: 'Failed to establish training connection'
      }));
      socket.close();
    }
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      // Add training context to all messages
      const enhancedMessage = {
        ...data,
        training_metadata: {
          session_id: sessionParam,
          scenario_id: trainingSession?.id,
          timestamp: new Date().toISOString()
        }
      };
      
      if (openAISocket && openAISocket.readyState === WebSocket.OPEN) {
        openAISocket.send(JSON.stringify(enhancedMessage));
      }
    } catch (error) {
      console.error('Error processing training WebSocket message:', error);
    }
  };

  socket.onclose = () => {
    console.log('Training client disconnected');
    if (openAISocket) {
      openAISocket.close();
    }
  };

  socket.onerror = (error) => {
    console.error('Training WebSocket error:', error);
    if (openAISocket) {
      openAISocket.close();
    }
  };

  return response;
}

function initializeTrainingSession(socket: WebSocket, scenario: any, voiceId: string) {
  if (!scenario) return;

  // Build training-specific system prompt
  const trainingPrompt = buildTrainingPrompt(scenario);
  
  const sessionConfig = {
    type: 'session.update',
    session: {
      modalities: ['text', 'audio'],
      instructions: trainingPrompt,
      voice: getVoiceForTraining(voiceId),
      input_audio_format: 'pcm16',
      output_audio_format: 'pcm16',
      input_audio_transcription: {
        model: 'gpt-4o-mini-transcribe'
      },
      turn_detection: {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 1200 // Slightly longer for training scenarios
      },
      temperature: 0.7,
      max_response_output_tokens: 300 // Longer responses for training
    }
  };

  console.log('Initializing training session with config:', {
    scenario: scenario.title,
    voice: getVoiceForTraining(voiceId),
    difficulty: scenario.difficulty
  });

  socket.send(JSON.stringify(sessionConfig));
}

function buildTrainingPrompt(scenario: any): string {
  const basePrompt = `Eres un cliente simulado para un ejercicio de entrenamiento en ${scenario.scenario_type || 'servicio al cliente'}.

INFORMACIÓN DEL ESCENARIO:
- Título: ${scenario.title}
- Descripción: ${scenario.description}
- Categoría: ${scenario.category}
- Nivel de dificultad: ${scenario.difficulty}
- Duración esperada: ${scenario.duration_minutes} minutos

PERSONALIDAD DEL CLIENTE:
${scenario.client_personality ? JSON.stringify(scenario.client_personality) : 'Cliente neutral con expectativas realistas'}

OBJETIVOS DEL ENTRENAMIENTO:
${Array.isArray(scenario.objectives) ? scenario.objectives.join('\n- ') : 'Desarrollar habilidades de comunicación y resolución de problemas'}

CONTEXTO ESPECÍFICO:
${scenario.context || 'Situación típica de servicio al cliente'}

DOCUMENTOS DE CONOCIMIENTO DISPONIBLES:
${Array.isArray(scenario.knowledge_documents) ? scenario.knowledge_documents.join(', ') : 'Información general del producto/servicio'}

INSTRUCCIONES DE COMPORTAMIENTO:
- Actúa como un cliente colombiano real
- Mantén coherencia con la personalidad asignada
- Responde de forma natural y conversacional
- Plantea objeciones o preguntas realistas según el escenario
- Evalúa las respuestas del agente de forma implícita
- No reveles que eres una simulación
- Usa expresiones y modismos colombianos apropiados
- Adapta tu nivel de satisfacción según la calidad de la atención recibida

Esta es una sesión de entrenamiento profesional. Proporciona una experiencia realista y constructiva.`;

  return basePrompt;
}

function getVoiceForTraining(voiceId: string): string {
  // Map training voice IDs to OpenAI Realtime API voices
  const voiceMap: { [key: string]: string } = {
    'alloy': 'alloy',
    'echo': 'echo', 
    'fable': 'fable',
    'onyx': 'onyx',
    'nova': 'nova',
    'shimmer': 'shimmer'
  };

  return voiceMap[voiceId] || 'alloy'; // Default to alloy for training
}