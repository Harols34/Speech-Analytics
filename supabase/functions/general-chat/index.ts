
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import OpenAI from 'https://esm.sh/openai@4.28.0';

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Setting up Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Initializes and returns an OpenAI client with the API key from environment variables
 */
function initializeOpenAI() {
  const openaiKey = Deno.env.get("API_DE_OPENAI") || 
                  Deno.env.get("API de OPENAI") || 
                  Deno.env.get("OPENAI_API_KEY");

  if (!openaiKey) {
    console.error("Missing OpenAI API key. Make sure the API key is set in the Edge Function Secrets.");
    throw new Error("OpenAI API key is not configured. Please check Edge Function secrets.");
  }
  
  return new OpenAI({ apiKey: openaiKey });
}

/**
 * Main handler for the general chat function
 */
async function handleGeneralChat(req) {
  const { query, userId, history } = await req.json();
  
  if (!query) {
    throw new Error("Message is required");
  }
  
  console.log(`Processing general chat query: "${query.substring(0, 50)}..."`);
  
  const openai = initializeOpenAI();
  const callStats = await fetchCallStats();
  
  const systemPrompt = `
Eres un asistente especializado en el análisis de llamadas telefónicas para un servicio de atención al cliente o ventas.

Contexto general:
${callStats}

Tu trabajo es ayudar a entender tendencias, identificar oportunidades de mejora y proporcionar análisis sobre las llamadas.
Responde de manera profesional, objetiva y precisa basándote en los datos disponibles.
Si no tienes información suficiente para responder una pregunta, indícalo claramente y sugiere qué datos serían útiles.
Mantén un tono profesional y orientado a datos en todas tus respuestas.
Ofrece análisis específicos y PERSONALIZADOS basados en los datos disponibles, nunca respuestas genéricas.
Cuando generes hallazgos o retroalimentación, asegúrate que estén directamente relacionados con los datos de las llamadas.

Si te preguntan sobre análisis, hallazgos o tendencias, asegúrate de SIEMPRE:
1. Analizar patrones en los resúmenes de las llamadas disponibles
2. Identificar puntos fuertes y áreas de mejora específicas
3. Sugerir acciones concretas y personalizadas basadas en los datos reales
4. Evitar frases genéricas como "Atención al cliente satisfactoria" a menos que realmente estén respaldadas por los datos

Ejemplos de preguntas que puedes responder:
- "¿Cuántas llamadas tenemos en total?"
- "¿Cuáles son los principales temas tratados en las llamadas?"
- "¿Cuál es el promedio de duración de las llamadas?"
- "¿Qué agentes han atendido más llamadas?"
- "¿Qué productos se mencionan más frecuentemente?"
- "¿Cuáles son los motivos más comunes de las llamadas?"
- "¿Puedes mostrarme un resumen de la llamada más reciente?"
- "¿Cuál es el sentimiento general de las llamadas?"
- "¿Qué oportunidades de mejora has identificado?"
- "¿Cuáles son las quejas más comunes?"
`;
  
  const messages = [
    { role: "system", content: systemPrompt },
    ...(history || []),
    { role: "user", content: query }
  ];
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: messages.map(msg => ({
      role: msg.role === "assistant" || msg.role === "user" ? msg.role : "user",
      content: msg.content
    })),
    temperature: 0.7,
    max_tokens: 1000,
  });
  
  const response = completion.choices[0]?.message?.content || "No pude generar una respuesta.";
  
  return new Response(
    JSON.stringify({ success: true, response }),
    {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    }
  );
}

async function fetchCallStats() {
  try {
    const { count: totalCalls } = await supabase
      .from('calls')
      .select('*', { count: 'exact', head: true });
    
    const { data: recentCalls } = await supabase
      .from('calls')
      .select('id, title, agent_name, duration, date, result, product, summary, reason')
      .order('date', { ascending: false })
      .limit(15);
      
    const { data: agents } = await supabase
      .from('agents')
      .select('name, status')
      .limit(20);
    
    const { data: feedback } = await supabase
      .from('feedback')
      .select('call_id, score, positive, negative, opportunities')
      .limit(15);
      
    let statsText = `Total de llamadas en el sistema: ${totalCalls || 0}\n\n`;
    
    if (recentCalls && recentCalls.length > 0) {
      statsText += "Llamadas recientes con sus detalles:\n";
      recentCalls.forEach(call => {
        statsText += `- Título: ${call.title || 'Sin título'}, Agente: ${call.agent_name || 'No especificado'}, Fecha: ${new Date(call.date).toLocaleDateString()}\n`;
        
        // Add call reason/type if available
        if (call.reason) {
          statsText += `  Motivo/Resultado: ${call.reason}\n`;
        }
        
        // Add call product if available
        if (call.product) {
          statsText += `  Producto: ${call.product}\n`;
        }
        
        // Add call summary if available
        if (call.summary) {
          statsText += `  Resumen: ${call.summary.substring(0, 300)}...\n`;
        }
        
        // Add related feedback if available
        const callFeedback = feedback?.find(f => f.call_id === call.id);
        if (callFeedback) {
          statsText += `  Score: ${callFeedback.score}%\n`;
          
          if (callFeedback.positive && callFeedback.positive.length > 0) {
            statsText += `  Aspectos positivos: ${callFeedback.positive.join(", ")}\n`;
          }
          
          if (callFeedback.opportunities && callFeedback.opportunities.length > 0) {
            statsText += `  Oportunidades de mejora: ${callFeedback.opportunities.join(", ")}\n`;
          }
        }
        
        statsText += "\n";
      });
    }
    
    if (agents && agents.length > 0) {
      statsText += `Total de agentes: ${agents.length}\n`;
      statsText += "Agentes activos:\n";
      agents.filter(a => a.status === 'active').forEach(a => {
        statsText += `- ${a.name}\n`;
      });
    }
    
    return statsText;
  } catch (error) {
    console.error("Error fetching call stats:", error);
    return "Error al obtener estadísticas de llamadas.";
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Method not allowed" 
      }),
      { 
        status: 405,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }
      }
    );
  }

  try {
    return await handleGeneralChat(req);
  } catch (error) {
    console.error("Error processing general chat request:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Unknown error" 
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
