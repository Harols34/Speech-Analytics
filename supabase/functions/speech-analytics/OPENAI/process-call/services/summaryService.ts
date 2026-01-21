
import OpenAI from "https://esm.sh/openai@4.28.0?target=deno";

/**
 * Genera un resumen de la llamada usando OpenAI
 */
export async function generateSummary(transcription: string, customPrompt?: string): Promise<string> {
  // Validar que la transcripción sea útil para el análisis
  const isValidTranscription = transcription &&
    transcription.length > 50 &&
    !transcription.toLowerCase().includes('no hay transcripción') &&
    !transcription.toLowerCase().includes('transcripción no disponible') &&
    !transcription.toLowerCase().includes('error en la transcripción');

  if (!isValidTranscription) {
    console.log("Invalid or insufficient transcription for summary generation");
    return "No hay contenido suficiente para generar un resumen - transcripción insuficiente o inválida";
  }

  const openAIApiKey = Deno.env.get('OPENAI_API_KEY_SPEECH');
  
  if (!openAIApiKey) {
    console.error("OpenAI API key not found");
    throw new Error("API key de OpenAI no encontrada");
  }

  const openai = new OpenAI({
    apiKey: openAIApiKey
  });

  const basePrompt = customPrompt || `
  Crea un resumen conciso de esta llamada de servicio al cliente.
  
  INSTRUCCIONES CRÍTICAS:
  - Usa ÚNICAMENTE la información que aparece en la transcripción
  - NO inventes nombres, problemas, soluciones o detalles que no estén en el texto
  - Si la información es limitada, menciona esta limitación
  - Mantén el resumen factual y basado en evidencia
  
  Incluye:
  - Tema principal de la llamada (si se puede identificar)
  - Participantes mencionados (solo si aparecen en la transcripción)
  - Acciones tomadas (solo las que se mencionan explícitamente)
  - Resultado (solo si se indica claramente)
  `;

  const systemMessage = `${basePrompt}

  Responde con un resumen en texto plano, sin inventar información adicional.`;

  const userMessage = `Crea un resumen basado ÚNICAMENTE en esta transcripción:

${transcription}

IMPORTANTE: No agregues información que no aparezca explícitamente en la transcripción.`;

  try {
    console.log('Generating summary with OpenAI...');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage }
      ],
      temperature: 0.1, // Baja temperatura para mayor precisión
      max_tokens: 500
    });

    const summary = response.choices[0].message.content?.trim() || "No se pudo generar resumen";
    
    console.log('Summary generated successfully:', summary.substring(0, 100) + '...');
    return summary;
    
  } catch (error) {
    console.error('Error generating summary:', error);
    throw new Error(`Error generando resumen: ${error.message}`);
  }
}

/**
 * Detecta el tema principal de la llamada
 */
export async function detectCallTopic(transcription: string, summary: string): Promise<string> {
  // Validar que tengamos contenido para analizar
  if (!transcription || transcription.length < 50) {
    return 'Contenido insuficiente para determinar el tema';
  }

  const openAIApiKey = Deno.env.get('OPENAI_API_KEY_SPEECH');
  
  if (!openAIApiKey) {
    console.error("OpenAI API key not found");
    return 'Consulta general';
  }

  const openai = new OpenAI({
    apiKey: openAIApiKey
  });

  const systemMessage = `Identifica el tema principal de esta llamada basándote ÚNICAMENTE en el contenido proporcionado.

INSTRUCCIONES:
- Usa solo la información presente en la transcripción y resumen
- NO inventes detalles adicionales
- Responde con una categoría simple y directa

Categorías comunes:
- Consulta general
- Soporte técnico  
- Información de productos
- Reclamos
- Activación de servicios
- Facturación
- Seguimiento
- Otro (especifica brevemente)

Responde solo con el nombre de la categoría.`;

  const userMessage = `Transcripción: ${transcription}

Resumen: ${summary}

¿Cuál es el tema principal de esta llamada?`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage }
      ],
      temperature: 0.0,
      max_tokens: 50
    });

    const topic = response.choices[0].message.content?.trim() || 'Consulta general';
    console.log('Topic detected:', topic);
    return topic;
    
  } catch (error) {
    console.error('Error detecting topic:', error);
    return 'Consulta general';
  }
}
