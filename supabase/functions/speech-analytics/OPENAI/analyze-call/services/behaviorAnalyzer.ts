
import OpenAI from "https://esm.sh/openai@4.28.0?target=deno";

/**
 * Analiza el comportamiento del agente en una llamada.
 * Genera análisis personalizados para cada comportamiento configurado.
 */
export async function analyzeBehaviors(call: any, behaviors: any[]) {
  if (!call.transcription) {
    throw new Error("La llamada no tiene transcripción disponible para analizar");
  }
  
  console.log(`Starting behavior analysis for ${behaviors.length} behaviors`);
  
  // Parsear y validar transcripción
  let transcriptionText = "";
  try {
    if (typeof call.transcription === 'string') {
      // Si es string, puede ser JSON o texto plano
      if (call.transcription.trim().startsWith('[') || call.transcription.trim().startsWith('{')) {
        try {
          const parsedTranscription = JSON.parse(call.transcription);
          if (Array.isArray(parsedTranscription)) {
            transcriptionText = parsedTranscription.map(segment => segment.text || segment.content || "").join(' ');
          } else {
            transcriptionText = call.transcription;
          }
        } catch (parseError) {
          console.log("Failed to parse as JSON, using as plain text");
          transcriptionText = call.transcription;
        }
      } else {
        transcriptionText = call.transcription;
      }
    } else if (Array.isArray(call.transcription)) {
      transcriptionText = call.transcription.map(segment => segment.text || segment.content || "").join(' ');
    } else {
      transcriptionText = typeof call.transcription === 'object' 
        ? JSON.stringify(call.transcription) 
        : String(call.transcription);
    }
  } catch (e) {
    console.error("Error processing transcription:", e);
    transcriptionText = typeof call.transcription === 'string' 
      ? call.transcription 
      : String(call.transcription);
  }
  
  // Limpiar y validar transcripción
  transcriptionText = transcriptionText.trim();
  console.log(`Original transcription length: ${call.transcription.toString().length} characters`);
  console.log(`Processed transcription length: ${transcriptionText.length} characters`);
  console.log(`Transcription preview: ${transcriptionText.substring(0, 200)}...`);
  
  // Validar que la transcripción sea útil para el análisis
  const isValidTranscription = transcriptionText &&
    transcriptionText.length > 50 &&
    !transcriptionText.toLowerCase().includes('no hay transcripción') &&
    !transcriptionText.toLowerCase().includes('transcripción no disponible') &&
    !transcriptionText.toLowerCase().includes('error en la transcripción') &&
    !transcriptionText.toLowerCase().includes('aló, aló') && // Validar que no sea solo saludos
    (transcriptionText.includes('Asesor:') || transcriptionText.includes('Cliente:') || transcriptionText.includes('Agent:') || transcriptionText.includes('Customer:') || transcriptionText.split(' ').length > 20);
  
  if (!isValidTranscription) {
    console.log("Invalid or insufficient transcription for analysis");
    throw new Error("La transcripción no contiene suficiente información útil para realizar el análisis de comportamientos. Solo contiene saludos básicos o información insuficiente.");
  }
  
  // Obtener API key de OpenAI
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY_SPEECH');
  
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
      
      // Crear prompt específico para el comportamiento
      const systemMessage = `Eres un experto en análisis de calidad de llamadas de servicio al cliente y ventas.

INSTRUCCIONES CRÍTICAS Y OBLIGATORIAS:
- Analiza ÚNICAMENTE el contenido de la transcripción real proporcionada
- NO inventes, asumas, supongas o crees información que no esté explícitamente en la transcripción
- NO agregues nombres, problemas, soluciones o detalles que no aparezcan en el texto real
- Si la transcripción solo contiene saludos o información insuficiente, responde "no cumple" y explica por qué
- Evalúa SOLO este comportamiento específico: "${behavior.name}"
- Cita EXACTAMENTE las partes de la conversación que uses como evidencia
- Si no hay evidencia suficiente en la transcripción, indica "no cumple"

Descripción del comportamiento: ${behavior.description || 'No hay descripción adicional'}
Criterios de evaluación: ${behavior.prompt}

Responde ÚNICAMENTE en formato JSON válido:
{
  "evaluation": "cumple" o "no cumple",
  "comments": "Comentarios específicos basados ÚNICAMENTE en la transcripción real, citando las partes exactas del texto"
}`;

      const userMessage = `Analiza si el comportamiento "${behavior.name}" se cumple en esta transcripción REAL:

TRANSCRIPCIÓN COMPLETA (NO INVENTES NADA MÁS):
${transcriptionText}

IMPORTANTE: Usa ÚNICAMENTE la información que aparece en esta transcripción. NO inventes nombres, problemas, soluciones o detalles adicionales.`;

      console.log(`Sending request to OpenAI for behavior: ${behavior.name}`);
      console.log(`Transcription being analyzed: ${transcriptionText.substring(0, 300)}...`);

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
            content: userMessage
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.0, // Máxima precisión, sin creatividad
        max_tokens: 300
      });

      console.log(`Behavior ${i + 1} analysis completed`);
      console.log(`OpenAI response: ${response.choices[0].message.content}`);

      // Parse the response
      const content = response.choices[0].message.content;
      let result;
      
      try {
        result = JSON.parse(content || "{}");
      } catch (e) {
        console.error(`Error parsing JSON response for behavior "${behavior.name}":`, e);
        result = { 
          evaluation: "no cumple", 
          comments: `Error: La transcripción no contiene información suficiente para evaluar este comportamiento` 
        };
      }

      // Validate evaluation
      if (result.evaluation !== "cumple" && result.evaluation !== "no cumple") {
        console.warn(`Invalid evaluation "${result.evaluation}" for behavior "${behavior.name}", defaulting to "no cumple"`);
        result.evaluation = "no cumple";
      }

      // Ensure comments exist and are based only on transcription
      if (!result.comments || typeof result.comments !== 'string') {
        result.comments = "No se encontró evidencia suficiente en la transcripción para evaluar este comportamiento";
      }

      const behaviorResult = {
        name: behavior.name,
        evaluation: result.evaluation,
        comments: result.comments
      };

      console.log(`Behavior "${behavior.name}" result: ${result.evaluation}`);
      console.log(`Behavior "${behavior.name}" comments: ${result.comments}`);
      
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
        comments: `Error: La transcripción no contiene información suficiente para analizar este comportamiento: ${error.message || "Error desconocido"}`
      });
    }
  }
  
  console.log(`Behavior analysis completed for ${behaviorsAnalysis.length} behaviors`);
  console.log("Results summary:", behaviorsAnalysis.map(b => `${b.name}: ${b.evaluation}`));
  
  return behaviorsAnalysis;
}
