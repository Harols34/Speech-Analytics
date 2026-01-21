import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ConversationRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  scenario: {
    id: string;
    title: string;
    description: string;
    scenario_type: string;
    prompt_instructions?: string;
    difficulty_level: number;
  };
  knowledgeBase: Array<{
    title: string;
    content: string;
    document_type: string;
  }>;
  clientPersonality?: string;
  evaluationMode?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { messages, scenario, knowledgeBase, clientPersonality = 'neutral', evaluationMode = false }: ConversationRequest = await req.json()

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY_FORMACIÓN')
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Construir contexto de conocimiento
    const knowledgeContext = knowledgeBase?.length > 0 
      ? knowledgeBase.map(kb => `[${kb.document_type}] ${kb.title}: ${kb.content}`).join('\n\n')
      : '';

    // Personalidades de cliente disponibles
    const personalities = {
      curious: 'Cliente curioso: haces muchas preguntas antes de decidirte, necesitas detalles específicos.',
      skeptical: 'Cliente desconfiado: dudas de todo y pides pruebas o referencias constantemente.',
      hurried: 'Cliente apurado: quieres todo rápido, no toleras rodeos ni explicaciones largas.',
      indecisive: 'Cliente indeciso: necesitas que te convenzan con beneficios claros y comparaciones.',
      annoyed: 'Cliente molesto: comienzas con una queja y necesitas que te tranquilicen primero.',
      interested: 'Cliente interesado: muestras interés genuino pero necesitas información específica.',
      neutral: 'Cliente neutral: mantienes una actitud equilibrada, ni muy positivo ni negativo.'
    };

    const selectedPersonality = personalities[clientPersonality as keyof typeof personalities] || personalities.neutral;

    // Sistema de prompt adaptativo según escenario
    const getScenarioPrompt = (scenario: any) => {
      const basePrompt = `Eres un cliente simulado para entrenar agentes en ${scenario.scenario_type}. 

ESCENARIO: ${scenario.title}
DESCRIPCIÓN: ${scenario.description}
DIFICULTAD: Nivel ${scenario.difficulty_level}/5
PERSONALIDAD: ${selectedPersonality}

${scenario.prompt_instructions ? `INSTRUCCIONES ESPECIALES: ${scenario.prompt_instructions}` : ''}

${knowledgeContext ? `INFORMACIÓN DISPONIBLE:\n${knowledgeContext}` : ''}

REGLAS DE COMPORTAMIENTO:
- Actúa naturalmente según tu personalidad asignada
- Responde en español colombiano auténtico
- Mantén coherencia con tu carácter durante toda la conversación
- Haz preguntas relevantes según tu personalidad
- Muestra emociones apropiadas (curiosidad, escepticismo, prisa, etc.)
- No reveles que eres una IA, mantén el rol de cliente real
${evaluationMode ? '- MODO EVALUACIÓN: Sé más exigente y detallista en tus respuestas' : ''}

Responde como un cliente real colombiano con la personalidad asignada.`;

      return basePrompt;
    };

    const systemPrompt = getScenarioPrompt(scenario);

    // Preparar mensajes para la API
    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-6) // Limitar historial a últimos 6 mensajes para bajar latencia
    ];

    console.log(`Processing enhanced conversation for scenario: ${scenario.title}`);
    console.log(`Client personality: ${clientPersonality}`);
    console.log(`Evaluation mode: ${evaluationMode}`);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: apiMessages,
        temperature: evaluationMode ? 0.3 : 0.6,
        max_tokens: evaluationMode ? 140 : 100,
        presence_penalty: 0.2,
        frequency_penalty: 0.1,
        top_p: 0.85
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenAI API error:', errorText)
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    const aiResponse = data.choices[0]?.message?.content?.trim()

    if (!aiResponse) {
      throw new Error('No response generated')
    }

    console.log('Enhanced AI conversation response generated successfully');

    return new Response(JSON.stringify({
      response: aiResponse,
      personality: clientPersonality,
      scenario_id: scenario.id,
      evaluation_mode: evaluationMode,
      timestamp: new Date().toISOString(),
      usage: {
        prompt_tokens: data.usage?.prompt_tokens,
        completion_tokens: data.usage?.completion_tokens,
        total_tokens: data.usage?.total_tokens
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error in enhanced AI conversation:', error)
    
    // Respuesta de fallback basada en personalidad
    const fallbackResponses = {
      curious: '¿Podrías explicarme más detalles sobre esto? Me gustaría entender mejor.',
      skeptical: 'No estoy muy convencido. ¿Tienes alguna referencia o prueba de esto?',
      hurried: 'Necesito que vayas al grano. ¿Cuál es la propuesta concreta?',
      indecisive: 'No estoy seguro... ¿Podrías compararme las opciones disponibles?',
      annoyed: 'Mira, ya he tenido problemas antes. ¿Cómo me garantizas que esto será diferente?',
      interested: 'Me parece interesante. ¿Puedes darme más información específica?',
      neutral: 'Entiendo. ¿Puedes explicarme más sobre esto?'
    };

    const fallbackResponse = fallbackResponses[req.body?.clientPersonality as keyof typeof fallbackResponses] || fallbackResponses.neutral;

    return new Response(JSON.stringify({
      response: fallbackResponse,
      error: 'Service temporarily unavailable',
      personality: req.body?.clientPersonality || 'neutral'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})