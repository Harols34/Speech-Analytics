
import OpenAI from "https://esm.sh/openai@4.28.0?target=deno";

/**
 * Genera feedback automático para la llamada usando OpenAI
 */
export async function generateFeedback(
  transcription: string,
  summary: string,
  customPrompt?: string,
  selectedBehaviorIds: string[] = []
): Promise<{
  score: number;
  positive: string[];
  negative: string[];
  opportunities: string[];
  sentiment: string;
  entities: string[];
  topics: string[];
  behaviors_analysis: any[];
}> {
  // Validar que la transcripción sea útil para el análisis
  const isValidTranscription = transcription &&
    transcription.length > 50 &&
    !transcription.toLowerCase().includes('no hay transcripción') &&
    !transcription.toLowerCase().includes('transcripción no disponible') &&
    !transcription.toLowerCase().includes('error en la transcripción') &&
    (transcription.includes('Asesor:') || transcription.includes('Cliente:') || transcription.includes('Agent:') || transcription.includes('Customer:') || transcription.split(' ').length > 20);

  if (!isValidTranscription) {
    console.log("Invalid or insufficient transcription for feedback generation");
    return {
      score: 0,
      positive: [],
      negative: ['No hay contenido analizable en la transcripción - información insuficiente'],
      opportunities: ['Verificar calidad del audio y contenido de la llamada'],
      sentiment: 'neutral',
      entities: [],
      topics: [],
      behaviors_analysis: []
    };
  }

  const openAIApiKey = Deno.env.get('OPENAI_API_KEY_SPEECH');
  
  if (!openAIApiKey) {
    console.error("OpenAI API key not found");
    throw new Error("API key de OpenAI no encontrada");
  }

  const openai = new OpenAI({
    apiKey: openAIApiKey
  });

  // Prompt base para análisis de feedback
  const basePrompt = customPrompt || `
  Analiza esta llamada de servicio al cliente y proporciona feedback detallado.
  
  INSTRUCCIONES CRÍTICAS:
  - Analiza ÚNICAMENTE el contenido de la transcripción real proporcionada
  - NO inventes nombres, problemas, soluciones o detalles que no aparezcan en la transcripción
  - Base tu análisis SOLO en lo que realmente se dice en la conversación
  - Si la información es insuficiente, menciona esta limitación en tu análisis
  
  Evalúa:
  - Calidad del servicio al cliente
  - Comunicación efectiva
  - Resolución de problemas
  - Profesionalismo
  - Empatía y cortesía
  `;

  const systemMessage = `${basePrompt}

  Responde en formato JSON con esta estructura exacta:
  {
    "score": número del 0 al 100,
    "positive": ["punto positivo 1", "punto positivo 2"],
    "negative": ["punto negativo 1", "punto negativo 2"],
    "opportunities": ["oportunidad 1", "oportunidad 2"],
    "sentiment": "positive", "negative", o "neutral",
    "entities": ["entidad 1", "entidad 2"],
    "topics": ["tema 1", "tema 2"]
  }`;

  const userMessage = `Analiza esta transcripción REAL (no inventes información adicional):

TRANSCRIPCIÓN:
${transcription}

RESUMEN:
${summary}

Proporciona feedback basado ÚNICAMENTE en la información presente en estos textos.`;

  try {
    console.log('Generating feedback with OpenAI...');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1, // Baja temperatura para mayor precisión
      max_tokens: 1000
    });

    const content = response.choices[0].message.content;
    let result;
    
    try {
      result = JSON.parse(content || "{}");
    } catch (e) {
      console.error("Error parsing feedback JSON:", e);
      result = {
        score: 50,
        positive: ['Transcripción procesada exitosamente'],
        negative: ['Error en el análisis detallado'],
        opportunities: ['Revisar configuración de análisis'],
        sentiment: 'neutral',
        entities: [],
        topics: []
      };
    }

    // Validar y limpiar resultado
    const feedback = {
      score: Math.max(0, Math.min(100, result.score || 0)),
      positive: Array.isArray(result.positive) ? result.positive : [],
      negative: Array.isArray(result.negative) ? result.negative : [],
      opportunities: Array.isArray(result.opportunities) ? result.opportunities : [],
      sentiment: ['positive', 'negative', 'neutral'].includes(result.sentiment) ? result.sentiment : 'neutral',
      entities: Array.isArray(result.entities) ? result.entities : [],
      topics: Array.isArray(result.topics) ? result.topics : [],
      behaviors_analysis: [] // Se agregará por separado
    };

    console.log('Feedback generated successfully:', feedback);
    return feedback;
    
  } catch (error) {
    console.error('Error generating feedback:', error);
    throw new Error(`Error generando feedback: ${error.message}`);
  }
}
