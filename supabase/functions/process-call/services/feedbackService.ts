
const openAIKey = Deno.env.get('OPENAI_API_KEY') || Deno.env.get('API_DE_OPENAI');

export async function generateFeedback(transcription: string, summary: string, customPrompt?: string, selectedBehaviorIds?: string[]) {
  if (!openAIKey) {
    console.warn('No OpenAI API key found, skipping feedback generation');
    return {
      score: 0,
      positive: ['Feedback no disponible - API key no configurada'],
      negative: [],
      opportunities: [],
      sentiment: 'neutral',
      entities: [],
      topics: [],
      behaviors_analysis: []
    };
  }

  // Check if transcription indicates no content available
  if (!transcription || transcription.trim() === '' || 
      transcription.includes('No hay transcripción disponible')) {
    console.log('No valid transcription available for feedback generation');
    return {
      score: 0,
      positive: [],
      negative: ['No hay contenido analizable para generar feedback'],
      opportunities: ['Verificar calidad del audio y contenido de la llamada'],
      sentiment: 'neutral',
      entities: [],
      topics: [],
      behaviors_analysis: []
    };
  }

  try {
    console.log('Generating feedback from complete transcription...');
    console.log('Transcription length for analysis:', transcription.length);
    console.log('Summary length for context:', summary.length);

    const defaultPrompt = `Analiza la siguiente llamada comercial y proporciona feedback estructurado:

TRANSCRIPCIÓN COMPLETA: {transcription}

RESUMEN: {summary}

Analiza TODA la transcripción completa para generar un feedback preciso y detallado.

Proporciona tu análisis en el siguiente formato JSON exacto:
{
  "score": [número del 0-100 basado en el desempeño general del asesor],
  "positive": ["punto positivo específico 1", "punto positivo específico 2", "punto positivo específico 3"],
  "negative": ["área de mejora específica 1", "área de mejora específica 2"],
  "opportunities": ["oportunidad de mejora 1", "oportunidad de mejora 2"],
  "sentiment": "positive|negative|neutral",
  "entities": ["entidad1", "entidad2"],
  "topics": ["tema1", "tema2"]
}

IMPORTANTE: Responde ÚNICAMENTE con el objeto JSON válido, sin texto adicional, sin markdown, sin backticks.`;

    const promptToUse = customPrompt || defaultPrompt;
    
    // Replace placeholders in the prompt with actual content
    const finalPrompt = promptToUse
      .replace('{transcription}', transcription)
      .replace('{summary}', summary);

    console.log('Sending feedback request to OpenAI...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Eres un experto en análisis de llamadas comerciales. Analiza TODA la transcripción completa para generar feedback preciso. Responde SOLO con JSON válido, sin formato markdown.'
          },
          {
            role: 'user',
            content: finalPrompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} - ${await response.text()}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content.trim();
    
    console.log('Raw OpenAI response for feedback:', content.substring(0, 200) + '...');
    
    // Clean the response - remove markdown formatting if present
    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    
    // Ensure it starts with { and ends with }
    if (!content.startsWith('{')) {
      const jsonStart = content.indexOf('{');
      if (jsonStart !== -1) {
        content = content.substring(jsonStart);
      }
    }
    
    if (!content.endsWith('}')) {
      const jsonEnd = content.lastIndexOf('}');
      if (jsonEnd !== -1) {
        content = content.substring(0, jsonEnd + 1);
      }
    }
    
    console.log('Cleaned content for parsing:', content.substring(0, 200) + '...');
    
    try {
      const parsedFeedback = JSON.parse(content);
      console.log('Successfully parsed feedback JSON');
      
      // Validate and return structured feedback with proper field names
      const result = {
        score: typeof parsedFeedback.score === 'number' ? parsedFeedback.score : 
               (typeof parsedFeedback.puntuacion_general === 'number' ? parsedFeedback.puntuacion_general : 0),
        positive: Array.isArray(parsedFeedback.positive) ? parsedFeedback.positive : 
                 (Array.isArray(parsedFeedback.aspectos_positivos) ? parsedFeedback.aspectos_positivos : []),
        negative: Array.isArray(parsedFeedback.negative) ? parsedFeedback.negative : [],
        opportunities: Array.isArray(parsedFeedback.opportunities) ? parsedFeedback.opportunities : [],
        sentiment: ['positive', 'negative', 'neutral'].includes(parsedFeedback.sentiment) ? parsedFeedback.sentiment : 'neutral',
        entities: Array.isArray(parsedFeedback.entities) ? parsedFeedback.entities : [],
        topics: Array.isArray(parsedFeedback.topics) ? parsedFeedback.topics : [],
        behaviors_analysis: parsedFeedback.behaviors_analysis || []
      };
      
      console.log('Generated feedback with custom prompt:', !!customPrompt);
      console.log('Feedback score:', result.score);
      
      return result;
      
    } catch (parseError) {
      console.error('Error parsing feedback JSON:', parseError);
      console.error('Content that failed to parse:', content);
      throw new Error('Invalid JSON response from OpenAI');
    }

  } catch (error) {
    console.error('Error generating feedback:', error);
    return {
      score: 0,
      positive: [],
      negative: ['Error al generar feedback: ' + error.message],
      opportunities: ['Revisar configuración de análisis'],
      sentiment: 'neutral',
      entities: [],
      topics: [],
      behaviors_analysis: []
    };
  }
}
