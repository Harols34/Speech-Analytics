
import OpenAI from "https://esm.sh/openai@4.28.0";

/**
 * Analiza el comportamiento del agente en una llamada.
 * Genera análisis personalizados para cada comportamiento configurado.
 */
export async function analyzeBehaviors(call: any, behaviors: any[]) {
  if (!call.transcription) {
    throw new Error("La llamada no tiene transcripción");
  }
  
  console.log(`Starting behavior analysis for ${behaviors.length} behaviors`);
  
  // Parsear transcripción
  let transcriptionText = "";
  try {
    if (typeof call.transcription === 'string') {
      const parsedTranscription = JSON.parse(call.transcription);
      transcriptionText = Array.isArray(parsedTranscription) 
        ? parsedTranscription.map(segment => segment.text || "").join(' ')
        : call.transcription;
    } else if (Array.isArray(call.transcription)) {
      transcriptionText = call.transcription.map(segment => segment.text || "").join(' ');
    } else {
      transcriptionText = typeof call.transcription === 'string' 
        ? call.transcription 
        : "No se pudo procesar la transcripción";
    }
  } catch (e) {
    transcriptionText = typeof call.transcription === 'string' 
      ? call.transcription 
      : "No se pudo procesar la transcripción";
  }
  
  console.log(`Transcription length: ${transcriptionText.length} characters`);
  
  // Incluir el resumen si está disponible para mejorar el análisis contextual
  const contextSummary = call.summary ? `\nResumen de la llamada: ${call.summary}` : "";
  
  // Obtener API key de OpenAI
  const openAIApiKey = Deno.env.get('API_DE_OPENAI') || Deno.env.get('OPENAI_API_KEY');
  
  if (!openAIApiKey) {
    console.error("OpenAI API key not found in environment variables");
    throw new Error("API key de OpenAI no encontrada en las variables de entorno");
  }
  
  // Crear cliente de OpenAI
  const openai = new OpenAI({
    apiKey: openAIApiKey
  });
  
  console.log("OpenAI client initialized successfully");
  
  // Analizar cada comportamiento secuencialmente para evitar rate limits
  const behaviorsAnalysis = [];
  
  for (let i = 0; i < behaviors.length; i++) {
    const behavior = behaviors[i];
    
    try {
      console.log(`Analyzing behavior ${i + 1}/${behaviors.length}: "${behavior.name}"`);
      
      // Adaptar el mensaje del sistema para cada comportamiento
      const systemMessage = `Eres un experto en análisis de calidad de llamadas de servicio al cliente y ventas.

Tu tarea es evaluar si el siguiente comportamiento específico se cumple o no en la transcripción de la llamada:
"${behavior.name}"

Descripción del comportamiento:
${behavior.description || 'No hay descripción adicional'}

Prompt de evaluación:
${behavior.prompt}

INSTRUCCIONES IMPORTANTES:
- Evalúa ÚNICAMENTE este comportamiento específico, no otros aspectos de la llamada
- Analiza DETALLADAMENTE cada parte de la transcripción relacionada con este comportamiento
- Sé OBJETIVO y basa tu evaluación en EVIDENCIA concreta encontrada en la transcripción
- Proporciona COMENTARIOS ESPECÍFICOS Y DETALLADOS que sean ACCIONABLES
- Cita partes exactas de la conversación cuando sea relevante
- Evita comentarios genéricos; cada análisis debe ser 100% personalizado
- Si no hay suficiente información para evaluar este comportamiento, indícalo claramente

Responde ÚNICAMENTE en formato JSON válido:
{
  "evaluation": "cumple" o "no cumple",
  "comments": "Comentarios detallados y específicos sobre este comportamiento basados en evidencia de la transcripción"
}`;

      // Call OpenAI API to analyze the behavior
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: systemMessage
          },
          {
            role: "user",
            content: `Analiza si el comportamiento "${behavior.name}" se cumple en la siguiente transcripción:\n\n${transcriptionText}${contextSummary}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 500
      });

      console.log(`Behavior ${i + 1} analysis completed`);

      // Parse the response
      const content = response.choices[0].message.content;
      let result;
      
      try {
        result = JSON.parse(content || "{}");
      } catch (e) {
        console.error(`Error parsing JSON response for behavior "${behavior.name}":`, e);
        result = { 
          evaluation: "no cumple", 
          comments: `Error al analizar comportamiento: no se pudo procesar la respuesta de la IA` 
        };
      }

      // Validate evaluation
      if (result.evaluation !== "cumple" && result.evaluation !== "no cumple") {
        console.warn(`Invalid evaluation "${result.evaluation}" for behavior "${behavior.name}", defaulting to "no cumple"`);
        result.evaluation = "no cumple";
      }

      // Ensure comments exist
      if (!result.comments || typeof result.comments !== 'string') {
        result.comments = "No se proporcionaron comentarios específicos para este comportamiento";
      }

      const behaviorResult = {
        name: behavior.name,
        evaluation: result.evaluation,
        comments: result.comments
      };

      console.log(`Behavior "${behavior.name}" result: ${result.evaluation}`);
      
      behaviorsAnalysis.push(behaviorResult);
      
      // Add a small delay between requests to avoid rate limits
      if (i < behaviors.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
    } catch (error) {
      console.error(`Error analyzing behavior "${behavior.name}":`, error);
      behaviorsAnalysis.push({
        name: behavior.name,
        evaluation: "no cumple" as const,
        comments: `Error al analizar este comportamiento: ${error.message || "Error desconocido"}`
      });
    }
  }
  
  console.log(`Behavior analysis completed for ${behaviorsAnalysis.length} behaviors`);
  console.log("Results summary:", behaviorsAnalysis.map(b => `${b.name}: ${b.evaluation}`));
  
  return behaviorsAnalysis;
}
