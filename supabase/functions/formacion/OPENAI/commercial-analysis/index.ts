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
    const { conversation, scenario, knowledgeBase, attempt = 1 } = await req.json();

    if (!openAIApiKey) {
      console.error('❌ OpenAI API key not configured');
      return createFallbackResponse();
    }

    if (!conversation || conversation.trim().length < 10) {
      console.warn('⚠️ Conversación muy corta o vacía');
      return createBasicAnalysisResponse();
    }

    console.log(`🔍 Procesando análisis comercial - Intento ${attempt}`);

    const analysisPrompt = createDetailedAnalysisPrompt(conversation, scenario, knowledgeBase);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: `Eres un experto coach comercial con 25 años de experiencia en ventas B2B y desarrollo de equipos comerciales. Tu especialidad es analizar conversaciones de venta y proporcionar feedback preciso, específico y accionable.

REGLAS CRÍTICAS:
- Analiza ÚNICAMENTE lo que ocurrió en la conversación real
- NO uses puntuaciones genéricas o aleatorias
- Cada puntuación debe estar justificada por evidencia específica
- Sé riguroso pero constructivo en tu evaluación
- Proporciona insights que realmente ayuden a mejorar

Responde EXCLUSIVAMENTE con JSON válido, sin comentarios adicionales.`
          },
          { role: 'user', content: analysisPrompt }
        ],
        temperature: 0.1,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API error:', response.status, errorText);
      return createFallbackResponse();
    }

    const data = await response.json();
    let analysisText = data.choices[0].message.content.trim();
    
    // Limpiar y validar JSON
    analysisText = cleanJsonResponse(analysisText);
    
    try {
      const analysis = JSON.parse(analysisText);
      console.log('✅ Análisis comercial completado exitosamente');
      
      return new Response(JSON.stringify({
        success: true,
        analysis: analysis,
        timestamp: new Date().toISOString(),
        attempt: attempt
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
      
    } catch (parseError) {
      console.error('❌ Error parsing JSON:', parseError);
      console.log('Raw response:', analysisText);
      return createFallbackResponse();
    }

  } catch (error) {
    console.error('❌ Error in commercial-analysis:', error);
    return createFallbackResponse();
  }
});

function createDetailedAnalysisPrompt(conversation: string, scenario: any, knowledgeBase: any) {
  return `Analiza esta conversación de venta y proporciona un análisis comercial detallado:

CONVERSACIÓN:
${conversation}

ESCENARIO: ${scenario?.title || 'General'}
CONTEXTO: ${scenario?.description || 'Análisis general'}
BASE DE CONOCIMIENTO: ${knowledgeBase || 'No especificada'}

Proporciona un análisis JSON con esta estructura exacta:
{
  "puntuacion_general": number (0-100),
  "aspectos_positivos": [
    "Aspecto positivo específico observado en la conversación",
    "Otro aspecto bien ejecutado"
  ],
  "areas_mejora": [
    "Área específica que necesita mejora basada en la conversación",
    "Otra oportunidad de mejora identificada"
  ],
  "tecnicas_utilizadas": [
    "Técnica de venta específica identificada en la conversación",
    "Otra técnica observada"
  ],
  "momentos_clave": [
    {
      "momento": "Descripción del momento específico",
      "evaluacion": "Análisis de cómo se manejó",
      "puntuacion": number (0-100)
    }
  ],
  "recomendaciones": [
    "Recomendación específica y accionable",
    "Otra sugerencia concreta para mejorar"
  ],
  "siguiente_paso": "Siguiente acción recomendada basada en el análisis"
}`;
}

function cleanJsonResponse(text: string): string {
  // Remover markdown code blocks
  text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  
  // Remover texto antes y después del JSON
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    text = text.substring(jsonStart, jsonEnd + 1);
  }
  
  return text.trim();
}

function createFallbackResponse() {
  return new Response(JSON.stringify({
    success: false,
    analysis: {
      puntuacion_general: 0,
      aspectos_positivos: [],
      areas_mejora: ["Análisis no disponible temporalmente"],
      tecnicas_utilizadas: ["Conversación básica"],
      momentos_clave: [{
        momento: "Análisis no disponible",
        evaluacion: "Servicio temporalmente no disponible",
        puntuacion: 0
      }],
      recomendaciones: ["Intenta nuevamente más tarde"],
      siguiente_paso: "Reintentar análisis cuando el servicio esté disponible"
    },
    error: "Servicio de análisis temporalmente no disponible"
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200
  });
}

function createBasicAnalysisResponse() {
  return new Response(JSON.stringify({
    success: false,
    analysis: {
      puntuacion_general: 0,
      aspectos_positivos: [],
      areas_mejora: ["Conversación muy breve para análisis completo"],
      tecnicas_utilizadas: ["Comunicación básica"],
      momentos_clave: [{
        momento: "Conversación muy corta",
        evaluacion: "Necesita más contenido para análisis detallado",
        puntuacion: 0
      }],
      recomendaciones: ["Extender la conversación para obtener mejor análisis"],
      siguiente_paso: "Continuar la práctica con conversaciones más largas"
    },
    error: "Conversación muy corta para análisis completo"
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200
  });
}