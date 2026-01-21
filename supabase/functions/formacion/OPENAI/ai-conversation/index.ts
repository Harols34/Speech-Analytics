import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY_FORMACIÓN');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, scenario, userProfile, difficulty, conversationHistory = [], knowledgeBase, max_tokens = 150, temperature = 0.7 } = await req.json();

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Complete prompt for full responses
    const completePrompt = `Eres un cliente colombiano en una llamada de ventas. Responde de forma natural y completa como lo haría un cliente real.

INSTRUCCIONES:
- Responde de manera natural y completa
- Usa lenguaje colombiano auténtico
- Expresar claramente tus pensamientos e inquietudes
- Haz preguntas relevantes cuando sea apropiado
- Muestra personalidad e interés genuino o escepticismo según corresponda

CONTEXTO DEL ESCENARIO: ${scenario || 'Llamada de servicio al cliente'}
PERFIL DEL USUARIO: ${userProfile || 'Cliente general'}
DIFICULTAD: ${difficulty || 'medio'}
BASE DE CONOCIMIENTO: ${knowledgeBase || 'Información general del producto/servicio'}

HISTORIAL DE CONVERSACIÓN:
${conversationHistory.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n')}

MENSAJE ACTUAL: ${message}

Responde como cliente colombiano real con una respuesta completa y natural:`;

    console.log('Processing AI conversation request...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: completePrompt },
          { role: 'user', content: message }
        ],
        temperature: temperature,
        max_tokens: max_tokens,
        presence_penalty: 0.3,
        frequency_penalty: 0.2,
        top_p: 0.95
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content?.trim() || 'Entiendo perfectamente. ¿Puede explicarme más detalles sobre esto?';

    console.log('AI conversation response generated successfully');
    console.log(`Response length: ${aiResponse.length} characters`);

    return new Response(JSON.stringify({ 
      response: aiResponse,
      voice: 'Colombian',
      timestamp: new Date().toISOString(),
      scenario: scenario,
      difficulty: difficulty
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in ai-conversation:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      response: 'Entiendo perfectamente. ¿Puede explicarme más detalles sobre esto?'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});