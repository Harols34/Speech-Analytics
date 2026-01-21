
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('NODE_ENV') === 'production' 
    ? 'https://your-domain.com' 
    : '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CallAnalysisData {
  totalCalls: number;
  callsWithSummary: number;
  averageDuration: number;
  totalDuration: number;
  topicsStats: CallTopicStat[];
  sentimentDistribution: any;
  recentCalls: any[];
  callsByAgent: any[];
  timeDistribution: any[];
  callsData: any[];
  callsByDate: any[];
}

interface CallTopicStat {
  topic: string;
  count: number;
  percentage: number;
  call_ids: string[];
  call_titles?: string[];
}

// Función para convertir UTC a hora de Colombia
function toColombiaTime(utcDate: Date): Date {
  const colombiaOffset = -5; // Colombia es UTC-5
  const utc = utcDate.getTime() + (utcDate.getTimezoneOffset() * 60000);
  return new Date(utc + (colombiaOffset * 3600000));
}

// Función para formatear fecha en zona horaria de Colombia
function formatColombiaDate(dateString: string): string {
  const date = new Date(dateString);
  const colombiaDate = toColombiaTime(date);
  return colombiaDate.toLocaleDateString('es-CO');
}

async function getCallsAnalysis(supabase: any, accountId: string): Promise<CallAnalysisData | null> {
  try {
    console.log('Getting calls analysis for account:', accountId);
    
    if (!accountId || accountId === 'all') {
      console.log('Invalid accountId provided:', accountId);
      return {
        totalCalls: 0,
        callsWithSummary: 0,
        averageDuration: 0,
        totalDuration: 0,
        topicsStats: [],
        sentimentDistribution: {},
        recentCalls: [],
        callsByAgent: [],
        timeDistribution: [],
        callsData: [],
        callsByDate: []
      };
    }
    
    const { data: calls, error } = await supabase
      .from('calls')
      .select(`
        id, title, summary, sentiment, duration, agent_name, date, result, 
        transcription, account_id, call_topic, entities, topics, 
        status_summary, reason, product, content_embedding
      `)
      .eq('account_id', accountId)
      .limit(500);

    if (error) {
      console.error('Error getting calls:', error);
      return null;
    }

    if (!calls || calls.length === 0) {
      console.log('No calls found for account:', accountId);
      return {
        totalCalls: 0,
        callsWithSummary: 0,
        averageDuration: 0,
        totalDuration: 0,
        topicsStats: [],
        sentimentDistribution: {},
        recentCalls: [],
        callsByAgent: [],
        timeDistribution: [],
        callsData: [],
        callsByDate: []
      };
    }

    console.log(`Found ${calls.length} calls for analysis`);

    // Calcular duración total y promedio REAL
    const totalDuration = calls.reduce((sum, call) => sum + (call.duration || 0), 0);
    const averageDuration = calls.length > 0 ? Math.round(totalDuration / calls.length) : 0;

    // Análisis de llamadas por fecha USANDO LA FECHA REAL DE LA LLAMADA CONVERTIDA A COLOMBIA
    const callsByDate = calls.reduce((acc, call) => {
      if (call.date) {
        // Convertir la fecha UTC a hora de Colombia
        const callDate = new Date(call.date);
        const colombiaDate = toColombiaTime(callDate);
        const dateKey = colombiaDate.toLocaleDateString('es-CO');
        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }
        acc[dateKey].push(call);
      }
      return acc;
    }, {} as Record<string, any[]>);

    // Análisis de temas usando datos reales
    const callsWithContent = calls.filter(call => 
      call.summary || call.transcription || call.call_topic || call.topics?.length > 0
    );
    
    const topicAnalysis = callsWithContent.map(call => {
      let detectedTopic = 'Sin categorizar';
      
      if (call.call_topic && call.call_topic.trim() !== '') {
        detectedTopic = call.call_topic.trim();
      } else if (call.topics && Array.isArray(call.topics) && call.topics.length > 0) {
        detectedTopic = call.topics[0];
      } else if (call.summary) {
        const summary = call.summary.toLowerCase();
        
        if (summary.includes('activación') || summary.includes('activar') || summary.includes('alta')) {
          detectedTopic = 'Activación de servicios';
        } else if (summary.includes('factura') || summary.includes('pago') || summary.includes('cobro')) {
          detectedTopic = 'Consultas de facturación';
        } else if (summary.includes('problema') || summary.includes('falla') || summary.includes('soporte')) {
          detectedTopic = 'Soporte técnico';
        } else if (summary.includes('móvil') || summary.includes('celular') || summary.includes('plan móvil')) {
          detectedTopic = 'Servicios móviles';
        } else if (summary.includes('internet') || summary.includes('wifi') || summary.includes('conexión')) {
          detectedTopic = 'Internet y conectividad';
        } else if (summary.includes('reclamo') || summary.includes('queja') || summary.includes('insatisfecho')) {
          detectedTopic = 'Reclamos y quejas';
        } else if (summary.includes('cancelar') || summary.includes('baja') || summary.includes('cancelación')) {
          detectedTopic = 'Cancelaciones';
        } else if (summary.includes('información') || summary.includes('consulta')) {
          detectedTopic = 'Información general';
        } else if (summary.includes('precio') || summary.includes('tarifa') || summary.includes('costo')) {
          detectedTopic = 'Consultas sobre precios';
        } else if (summary.includes('seguimiento') || summary.includes('caso anterior')) {
          detectedTopic = 'Seguimiento de casos';
        } else {
          detectedTopic = 'Consultas generales';
        }
      } else if (call.title) {
        detectedTopic = call.title.length > 40 ? call.title.substring(0, 40) + '...' : call.title;
      }

      return {
        id: call.id,
        title: call.title,
        topic: detectedTopic,
        call: call
      };
    });

    // Agrupar por temas
    const topicGroups = topicAnalysis.reduce((acc, analysis) => {
      if (!acc[analysis.topic]) {
        acc[analysis.topic] = [];
      }
      acc[analysis.topic].push(analysis);
      return acc;
    }, {} as Record<string, any[]>);

    const totalCalls = calls.length;
    const topicsStats = Object.entries(topicGroups).map(([topic, topicCalls]) => ({
      topic,
      count: topicCalls.length,
      percentage: totalCalls > 0 ? Math.round((topicCalls.length / totalCalls) * 100) : 0,
      call_ids: topicCalls.map(analysis => analysis.id),
      call_titles: topicCalls.map(analysis => analysis.title)
    }));

    topicsStats.sort((a, b) => b.count - a.count);

    // Análisis de sentimientos
    const sentiments = calls.filter(call => call.sentiment);
    const sentimentDistribution = sentiments.reduce((acc, call) => {
      const sentiment = call.sentiment || 'neutral';
      acc[sentiment] = (acc[sentiment] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Análisis por agente
    const agentGroups = calls.reduce((acc, call) => {
      const agent = call.agent_name || 'Sin asignar';
      if (!acc[agent]) {
        acc[agent] = {
          name: agent,
          calls: 0,
          totalDuration: 0,
          successfulCalls: 0
        };
      }
      acc[agent].calls += 1;
      acc[agent].totalDuration += call.duration || 0;
      if (call.result === 'success' || call.result === 'venta') {
        acc[agent].successfulCalls += 1;
      }
      return acc;
    }, {} as Record<string, any>);

    const callsByAgent = Object.values(agentGroups).map((agent: any) => ({
      ...agent,
      averageDuration: agent.calls > 0 ? Math.round(agent.totalDuration / agent.calls) : 0,
      successRate: agent.calls > 0 ? Math.round((agent.successfulCalls / agent.calls) * 100) : 0
    })).sort((a: any, b: any) => b.calls - a.calls);

    // Análisis temporal usando hora de Colombia
    const timeGroups = calls.reduce((acc, call) => {
      if (call.date) {
        const callDate = new Date(call.date);
        const colombiaDate = toColombiaTime(callDate);
        const hour = colombiaDate.getHours();
        acc[hour] = (acc[hour] || 0) + 1;
      }
      return acc;
    }, {} as Record<number, number>);

    const timeDistribution = Object.entries(timeGroups).map(([hour, count]) => ({
      hour: parseInt(hour),
      count: count as number
    })).sort((a, b) => a.hour - b.hour);

    // Llamadas recientes
    const recentCalls = calls
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10)
      .map(call => ({
        id: call.id,
        title: call.title,
        agent: call.agent_name,
        date: call.date,
        result: call.result,
        duration: call.duration,
        topic: call.call_topic,
        sentiment: call.sentiment
      }));

    const analysisData: CallAnalysisData = {
      totalCalls: calls.length,
      callsWithSummary: callsWithContent.length,
      averageDuration,
      totalDuration,
      topicsStats,
      sentimentDistribution,
      recentCalls,
      callsByAgent,
      timeDistribution,
      callsData: calls,
      callsByDate: Object.entries(callsByDate).map(([date, dateCalls]) => ({
        date,
        calls: dateCalls,
        count: dateCalls.length
      }))
    };

    console.log('Analysis completed:', {
      totalCalls: analysisData.totalCalls,
      averageDuration: analysisData.averageDuration,
      totalDuration: analysisData.totalDuration,
      topicsCount: analysisData.topicsStats.length,
      agentsCount: analysisData.callsByAgent.length,
      dateGroups: Object.keys(callsByDate).length
    });

    return analysisData;

  } catch (error) {
    console.error('Error in getCallsAnalysis:', error);
    return null;
  }
}

function detectQueryType(query: string): string {
  const lowerQuery = query.toLowerCase();
  
  // Saludos básicos
  if (lowerQuery.match(/^(hola|hi|hello|buenos días|buenas tardes|buenas noches|hey)$/)) {
    return 'greeting';
  }
  
  // Preguntas sobre cantidad de llamadas (respuesta muy simple)
  if (lowerQuery.includes('cuántas llamadas') || lowerQuery.includes('cuantas llamadas') ||
      lowerQuery.includes('total de llamadas') || lowerQuery.includes('número de llamadas') ||
      lowerQuery.match(/cuant[ao]s\s+llamadas/)) {
    return 'simple_call_count';
  }
  
  // Preguntas sobre duración (respuesta simple)
  if ((lowerQuery.includes('duración') || lowerQuery.includes('tiempo')) && 
      !lowerQuery.includes('análisis') && !lowerQuery.includes('comparar') && 
      !lowerQuery.includes('tendencia') && !lowerQuery.includes('insight')) {
    return 'simple_duration';
  }
  
  // Preguntas sobre fechas específicas
  if (lowerQuery.includes('ayer') || lowerQuery.includes('yesterday') || 
      lowerQuery.includes('15/07/2025') || lowerQuery.includes('15-07-2025') ||
      lowerQuery.includes('16/07/2025') || lowerQuery.includes('16-07-2025') ||
      lowerQuery.includes('cargadas ayer') || lowerQuery.includes('subidas ayer') ||
      lowerQuery.includes('del 15') || lowerQuery.includes('del 16') ||
      lowerQuery.includes('día 15') || lowerQuery.includes('día 16')) {
    return 'calls_by_date';
  }
  
  // Búsquedas específicas de títulos
  if (lowerQuery.includes('título') || lowerQuery.includes('titulo') ||
      lowerQuery.includes('marteshoy') || lowerQuery.includes('marteshace') ||
      lowerQuery.includes('nombres específicos') || lowerQuery.includes('que tienen en su titulo') ||
      lowerQuery.includes('miercoles') || lowerQuery.includes('miércoles') ||
      lowerQuery.includes('word') || lowerQuery.includes('palabra')) {
    return 'specific_title_search';
  }
  
  // Análisis profundo (respuestas extensas)
  if (lowerQuery.includes('análisis') || lowerQuery.includes('analisis') ||
      lowerQuery.includes('tendencia') || lowerQuery.includes('comparar') ||
      lowerQuery.includes('insight') || lowerQuery.includes('profundidad') ||
      lowerQuery.includes('aspectos positivos') || lowerQuery.includes('aspectos negativos') ||
      lowerQuery.includes('temas frecuentes') || lowerQuery.includes('patrones') ||
      lowerQuery.includes('qué buscan los clientes') || lowerQuery.includes('solución de los asesores') ||
      lowerQuery.includes('voz del cliente') || lowerQuery.includes('segmento') ||
      lowerQuery.includes('servicio hogar') || lowerQuery.includes('servicio móvil')) {
    return 'deep_analysis';
  }
  
  // Preguntas sobre temas (respuesta media)
  if (lowerQuery.includes('tema') || lowerQuery.includes('tópico') || 
      lowerQuery.includes('frecuente') || lowerQuery.includes('categoría') ||
      lowerQuery.includes('motivo')) {
    return 'topics';
  }
  
  return 'general';
}

async function generateChatResponse(
  query: string, 
  analysisData: CallAnalysisData,
  chatHistory: any[],
  openaiKey: string,
  queryType: string
): Promise<string> {
  try {
    console.log('Generating chat response for query type:', queryType);
    
    // Obtener fecha actual en hora de Colombia
    const now = new Date();
    const colombiaToday = toColombiaTime(now);
    const todayStr = colombiaToday.toLocaleDateString('es-CO');
    
    const yesterday = new Date(colombiaToday);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString('es-CO');
    
    let systemPrompt = '';
    let contextData = '';
    let specificInstructions = '';
    let maxTokens = 150; // Default para respuestas cortas
    
    switch (queryType) {
      case 'greeting':
        systemPrompt = 'Eres un asistente amigable de análisis de llamadas. Responde saludos de forma breve y cordial.';
        contextData = '';
        specificInstructions = 'Responde el saludo de forma breve y cordial. Pregunta en qué puedes ayudar.';
        maxTokens = 50;
        break;
        
      case 'simple_call_count':
        systemPrompt = 'Responde únicamente la cantidad total de llamadas de forma directa y concisa.';
        contextData = `TOTAL DE LLAMADAS: ${analysisData.totalCalls}`;
        specificInstructions = 'Responde ÚNICAMENTE la cantidad total de llamadas de forma muy directa. Ejemplo: "Tengo registradas X llamadas." Nada más.';
        maxTokens = 30;
        break;
        
      case 'simple_duration':
        systemPrompt = 'Responde únicamente sobre duración de forma directa y concisa.';
        contextData = `DURACIÓN PROMEDIO: ${Math.floor(analysisData.averageDuration / 60)} minutos y ${analysisData.averageDuration % 60} segundos
        DURACIÓN TOTAL: ${Math.floor(analysisData.totalDuration / 3600)} horas y ${Math.floor((analysisData.totalDuration % 3600) / 60)} minutos`;
        specificInstructions = 'Responde ÚNICAMENTE la duración solicitada de forma directa. No agregues contexto adicional.';
        maxTokens = 50;
        break;
        
      case 'calls_by_date':
        const callsYesterday = analysisData.callsByDate.find(entry => entry.date === yesterdayStr);
        const callsToday = analysisData.callsByDate.find(entry => entry.date === todayStr);
        
        systemPrompt = `Eres un asistente experto en análisis de datos REALES de llamadas telefónicas.
        FECHA ACTUAL (Colombia): ${todayStr}
        FECHA AYER (Colombia): ${yesterdayStr}`;
        
        contextData = `LLAMADAS POR FECHAS REALES (Hora Colombia):
        - Ayer (${yesterdayStr}): ${callsYesterday ? callsYesterday.count : 0} llamadas
        - Hoy (${todayStr}): ${callsToday ? callsToday.count : 0} llamadas
        
        TODAS LAS FECHAS DISPONIBLES: ${JSON.stringify(analysisData.callsByDate.map(entry => ({
          fecha: entry.date,
          cantidad: entry.count
        })))}`;
        
        specificInstructions = 'Responder sobre las llamadas usando las fechas REALES convertidas a hora de Colombia. Sé específico con las fechas.';
        maxTokens = 200;
        break;
        
      case 'specific_title_search':
        const searchTerms = query.toLowerCase().match(/\b\w+\b/g) || [];
        const relevantCalls = analysisData.callsData.filter(call => {
          const title = call.title?.toLowerCase() || '';
          return searchTerms.some(term => 
            term.length > 3 && (title.includes(term) || title.includes(term.toUpperCase()))
          );
        });
        
        systemPrompt = 'Eres un asistente experto en análisis de llamadas. Presenta los resultados de búsqueda de manera completa y detallada.';
        contextData = `LLAMADAS ENCONTRADAS POR TÍTULO: ${JSON.stringify(relevantCalls.map(call => ({
          id: call.id,
          title: call.title,
          summary: call.summary,
          date: formatColombiaDate(call.date),
          agent: call.agent_name,
          result: call.result,
          transcription: call.transcription ? call.transcription.substring(0, 1000) : null,
          duration: call.duration,
          sentiment: call.sentiment,
          topics: call.topics
        })))}`;
        
        specificInstructions = 'Analiza y presenta TODOS los detalles COMPLETOS de estas llamadas encontradas. NUNCA cortes la respuesta. Incluye título completo, resumen, fecha, agente, resultado y TODOS los detalles relevantes de CADA llamada. Organiza la información de manera clara y completa.';
        maxTokens = 4000;
        break;
        
      case 'deep_analysis':
        systemPrompt = `Eres un asistente experto en análisis profundo de datos REALES de llamadas telefónicas.
        DATOS REALES DISPONIBLES:
        - Total de llamadas: ${analysisData.totalCalls}
        - Duración promedio: ${Math.floor(analysisData.averageDuration / 60)} minutos y ${analysisData.averageDuration % 60} segundos
        - Duración total: ${Math.floor(analysisData.totalDuration / 3600)} horas y ${Math.floor((analysisData.totalDuration % 3600) / 60)} minutos`;
        
        contextData = `ANÁLISIS COMPLETO:
        Total llamadas: ${analysisData.totalCalls}
        Duración promedio: ${Math.floor(analysisData.averageDuration / 60)} min ${analysisData.averageDuration % 60} seg
        Temas principales: ${JSON.stringify(analysisData.topicsStats)}
        Agentes: ${JSON.stringify(analysisData.callsByAgent)}
        Distribución temporal: ${JSON.stringify(analysisData.timeDistribution)}
        Sentimientos: ${JSON.stringify(analysisData.sentimentDistribution)}`;
        
        specificInstructions = 'Proporciona un análisis COMPLETO, DETALLADO y PROFUNDO. Incluye insights, tendencias, patrones, recomendaciones y conclusiones. NUNCA cortes la respuesta.';
        maxTokens = 4000;
        break;
        
      case 'topics':
        systemPrompt = 'Eres un asistente experto en análisis de temas de llamadas.';
        contextData = `TEMAS IDENTIFICADOS: ${JSON.stringify(analysisData.topicsStats)}`;
        specificInstructions = 'Presenta los temas principales con sus porcentajes de manera clara y organizada.';
        maxTokens = 300;
        break;
        
      default:
        systemPrompt = 'Eres un asistente de análisis de llamadas. Responde de forma apropiada según el contexto de la pregunta.';
        contextData = `INFORMACIÓN BÁSICA: 
        Total llamadas: ${analysisData.totalCalls}
        Duración promedio: ${Math.floor(analysisData.averageDuration / 60)} min ${analysisData.averageDuration % 60} seg`;
        specificInstructions = 'Responde de forma apropiada y proporcionada a la pregunta realizada.';
        maxTokens = 200;
    }

    const historyContext = chatHistory.length > 0 
      ? `\n\nCONTEXTO DE CONVERSACIÓN PREVIA:\n${chatHistory.slice(-5).map(msg => `${msg.role}: ${msg.content}`).join('\n')}`
      : '';

    const userPrompt = `${contextData}${historyContext}

PREGUNTA DEL USUARIO: ${query}

INSTRUCCIONES ESPECÍFICAS:
${specificInstructions}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: maxTokens,
        top_p: 0.9
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`Error generating chat response: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('OpenAI response generated successfully');
    return data.choices[0].message.content;

  } catch (error) {
    console.error('Error in generateChatResponse:', error);
    throw error;
  }
}

serve(async (req) => {
  console.log('=== General Chat Function Called ===');
  console.log('Method:', req.method);
  
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request - returning CORS headers');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    console.log('Request body received:', JSON.stringify(requestBody, null, 2));
    
    const { message, accountId, chatHistory = [] } = requestBody;
    
    if (!message) {
      console.error('ERROR: No message provided');
      return new Response(JSON.stringify({ 
        error: 'Message is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!accountId || accountId === 'all') {
      console.error('ERROR: Invalid or missing accountId:', accountId);
      return new Response(JSON.stringify({ 
        error: 'Account ID is required and cannot be "all"'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Processing message:', message);
    console.log('For account:', accountId);
    console.log('Chat history length:', chatHistory.length);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openaiKey = Deno.env.get('OPENAI_API_KEY_SPEECH');

    if (!supabaseUrl || !supabaseKey || !openaiKey) {
      console.error('ERROR: Missing environment variables');
      return new Response(JSON.stringify({ 
        error: 'Missing environment variables' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Getting calls analysis...');
    const analysisData = await getCallsAnalysis(supabase, accountId);
    
    if (!analysisData) {
      console.error('Failed to get calls analysis');
      return new Response(JSON.stringify({ error: 'Failed to analyze calls data' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const queryType = detectQueryType(message);
    console.log('Detected query type:', queryType);

    const response = await generateChatResponse(
      message, 
      analysisData,
      chatHistory,
      openaiKey, 
      queryType
    );

    let metadata: any = {
      query_type: queryType,
      total_calls_analyzed: analysisData.totalCalls,
      calls_with_content: analysisData.callsWithSummary,
      dates_available: analysisData.callsByDate.map(entry => entry.date),
      colombia_time_used: true
    };

    console.log('Response generated successfully');
    
    return new Response(JSON.stringify({ 
      response,
      metadata
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('FATAL ERROR in general-chat function:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Error interno del servidor',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
